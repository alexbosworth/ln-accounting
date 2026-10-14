const {deepEqual} = require('node:assert').strict;
const {equal} = require('node:assert').strict;
const {ok} = require('node:assert').strict;
const test = require('node:test');

const asyncRetry = require('async/retry');
const {closeChannel} = require('ln-service');
const {createChainAddress} = require('ln-service');
const {createInvoice} = require('ln-service');
const {getChainTransactions} = require('ln-service');
const {getClosedChannels} = require('ln-service');
const {pay} = require('ln-service');
const {sendToChainAddress} = require('ln-service');
const {spawnLightningCluster} = require('ln-docker-daemons');

const {getAccountingReport} = require('./../../');

const capacity = 1e6;
const centsPerBtc = 50000 * 100;
const interval = 100;
const invoiceTokens = 1000;
const sendTokens = 50000;
const size = 3;
const times = 2000;

// Fixed historic rate so the report does not reach out to rate providers
const rate = ({currency, fiat}, cbk) => {
  equal(currency, 'BTC', 'Rate is requested for the native currency');
  equal(fiat, 'USD', 'Rate is requested for the fiat currency');

  return cbk(null, {cents: centsPerBtc});
};

// Everything needed is local, so external lookups indicate a problem
const request = ({url}, cbk) => cbk([500, 'UnexpectedExternalRequest', {url}]);

const ids = records => records.map(n => n.id);

// Alice -> Bob -> Carol: Alice pays Carol through Bob, sends coins on-chain
// to Bob, then cooperatively closes her channel with Bob.
test('Get accounting report', {timeout: 30 * 60 * 1000}, async () => {
  const {channels, kill, nodes} = await spawnLightningCluster({
    capacity,
    size,
  });

  const [alice, bob, carol] = nodes;
  const [aliceChannel] = channels;

  try {
    // Carol requests a payment that will be routed through Bob
    const invoice = await createInvoice({
      description: 'invoice',
      lnd: carol.lnd,
      tokens: invoiceTokens,
    });

    // Wait for Alice to learn a route to Carol, then pay
    const paid = await asyncRetry({interval, times}, async () => {
      await alice.generate({});

      return await pay({lnd: alice.lnd, request: invoice.request});
    });

    // Alice sends coins to Bob on-chain
    const {address} = await createChainAddress({lnd: bob.lnd});

    const sent = await sendToChainAddress({
      address,
      lnd: alice.lnd,
      tokens: sendTokens,
    });

    // Alice cooperatively closes her channel with Bob
    const closing = await closeChannel({id: aliceChannel.id, lnd: alice.lnd});

    // Wait for the send and the close to confirm
    await asyncRetry({interval, times}, async () => {
      await alice.generate({});

      const {transactions} = await getChainTransactions({lnd: alice.lnd});

      const send = transactions.find(n => n.id === sent.id);

      if (!send || !send.is_confirmed) {
        throw new Error('ExpectedConfirmedChainSend');
      }

      const closed = await getClosedChannels({lnd: alice.lnd});

      const close = closed.channels.find(n => {
        return n.close_transaction_id === closing.transaction_id;
      });

      if (!close || !close.close_confirm_height) {
        throw new Error('ExpectedConfirmedChannelClose');
      }

      return;
    });

    // Alice's full report
    const aliceReport = await getAccountingReport({
      rate,
      request,
      currency: 'BTC',
      fiat: 'USD',
      lnd: alice.lnd,
    });

    // Alice paid Carol and paid Bob a routing fee
    const [payment] = aliceReport.payments.filter(n => n.id === paid.id);
    const [fee] = aliceReport.payments.filter(n => n.id === `${paid.id}:fee`);

    equal(payment.amount, -invoiceTokens, 'Payment amount is recorded');
    equal(payment.type, 'spend', 'Payment is a spend');
    equal(payment.to_id, carol.id, 'Payment destination is recorded');
    equal(fee.amount, -paid.fee, 'Routing fee is recorded');
    equal(fee.type, 'fee:network', 'Routing fee is a network fee');

    // Fiat amounts are calculated from the historic rate
    equal(payment.fiat_amount, -0.5, 'Fiat amount uses historic rate');

    // Only the send to Bob is a chain send: the channel funding and channel
    // close transactions are not treated as chain sends
    deepEqual(ids(aliceReport.chain_sends), [sent.id], 'Only send to Bob');
    equal(aliceReport.chain_sends[0].amount, -sendTokens, 'Send amount');

    // The channel transactions are not treated as chain receives either
    const receives = ids(aliceReport.chain_receives);

    ok(!receives.includes(aliceChannel.transaction_id), 'Funding not receive');
    ok(!receives.includes(closing.transaction_id), 'Close not a receive');

    // Chain fees are paid for the funding, the send, and the close
    const chainFees = ids(aliceReport.chain_fees);

    ok(chainFees.includes(`${aliceChannel.transaction_id}:fee`), 'Open fee');
    ok(chainFees.includes(`${sent.id}:fee`), 'Send fee');
    ok(chainFees.includes(`${closing.transaction_id}:fee`), 'Close fee');

    aliceReport.chain_fees.forEach(record => {
      ok(record.amount < 0, 'Chain fees are paid');
      equal(record.type, 'fee:network', 'Chain fees are network fees');
    });

    deepEqual(aliceReport.forwards, [], 'Alice routed no payments');
    deepEqual(aliceReport.invoices, [], 'Alice received no payments');

    ['chain_fees', 'chain_receives', 'chain_sends', 'payments'].forEach(n => {
      ok(aliceReport[`${n}_csv`].includes(aliceReport[n][0].id), `${n} csv`);
    });

    // Bob earned a routing fee forwarding Alice's payment to Carol
    const bobReport = await getAccountingReport({
      request,
      category: 'forwards',
      currency: 'BTC',
      lnd: bob.lnd,
    });

    equal(bobReport.forwards.length, 1, 'Bob forwarded a payment');

    const [forward] = bobReport.forwards;

    equal(forward.amount, paid.fee, 'Bob earned the routing fee');
    equal(forward.notes, String(invoiceTokens), 'Forwarded amount in notes');
    equal(forward.type, 'income', 'Forwarding fees are income');
    deepEqual(bobReport.payments, [], 'Forwards report has no payments');

    // Carol received Alice's payment
    const carolReport = await getAccountingReport({
      request,
      category: 'invoices',
      currency: 'BTC',
      lnd: carol.lnd,
    });

    deepEqual(ids(carolReport.invoices), [invoice.id], 'Carol was paid');

    const [received] = carolReport.invoices;

    equal(received.amount, invoiceTokens, 'Invoice amount is recorded');
    equal(received.notes, 'invoice', 'Invoice description is recorded');
    equal(received.type, 'income', 'Received payments are income');
  } finally {
    await kill({});
  }

  return;
});
