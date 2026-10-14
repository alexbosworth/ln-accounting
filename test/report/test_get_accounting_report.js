const {deepEqual} = require('node:assert').strict;
const {equal} = require('node:assert').strict;
const {rejects} = require('node:assert').strict;
const test = require('node:test');

const harmony = require('./../../harmony');
const lnService = require('ln-service');
const records = require('./../../records');

// Route dependencies through swappable stubs before loading the module
const stubs = {};

const stub = (mod, methods) => methods.forEach(method => {
  const real = mod[method];

  mod[method] = (...args) => (stubs[method] || real)(...args);
});

stub(lnService, [
  'getChannels',
  'getClosedChannels',
  'getForwards',
  'getIdentity',
  'getPendingChannels',
]);

stub(records, ['getAllInvoices', 'getAllPayments', 'getChainTransactions']);

stub(harmony, [
  'categorizeRecords',
  'chainFeesAsRecords',
  'chainReceivesAsRecords',
  'chainSendsAsRecords',
  'forwardsAsRecords',
  'invoicesAsRecords',
  'paymentsAsRecords',
  'recordsWithFiat',
]);

const {getAccountingReport} = require('./../../report');

const after = '2024-01-01T00:00:00.000Z';
const before = '2024-12-31T00:00:00.000Z';
const date = '2024-06-01T00:00:00.000Z';
const earlierDate = '2024-05-01T00:00:00.000Z';
const earlyDate = '2023-06-01T00:00:00.000Z';
const lateDate = '2025-06-01T00:00:00.000Z';
const publicKey = Buffer.alloc(33, 2).toString('hex');

const forward = created_at => ({
  created_at,
  fee: 1,
  incoming_channel: '1x1x1',
  outgoing_channel: '2x2x2',
  tokens: 100,
});

const invoice = (created_at, id) => ({
  id,
  confirmed_at: created_at,
  created_at,
  description: 'invoice',
  is_confirmed: true,
  payments: [],
  received: 10,
});

const payment = (created_at, id) => ({
  created_at,
  id,
  destination: publicKey,
  fee: 1,
  secret: 'secret',
  tokens: 20,
});

const chainTx = ({created_at, id, is_outgoing}) => ({
  created_at,
  id,
  is_outgoing,
  fee: !!is_outgoing ? 2 : undefined,
  is_confirmed: true,
  output_addresses: ['address'],
  tokens: 30,
});

const defaultStubs = () => ({
  getChannels: ({}, cbk) => cbk(null, {channels: []}),
  getClosedChannels: ({}, cbk) => cbk(null, {channels: []}),
  getForwards: (args, cbk) => cbk(null, {
    forwards: [forward(earlyDate), forward(date), forward(lateDate)],
  }),
  getIdentity: ({}, cbk) => cbk(null, {public_key: publicKey}),
  getPendingChannels: ({}, cbk) => cbk(null, {pending_channels: []}),
  getAllInvoices: ({}, cbk) => cbk(null, {invoices: [invoice(date, 'inv')]}),
  getAllPayments: ({}, cbk) => cbk(null, {payments: [payment(date, 'pay')]}),
  getChainTransactions: ({}, cbk) => cbk(null, {
    transactions: [
      chainTx({created_at: date, id: 'receive', is_outgoing: false}),
      chainTx({created_at: date, id: 'send', is_outgoing: true}),
    ],
  }),
});

// Summarize a report as the record ids in each category
const summarize = report => {
  const summary = {};

  Object.keys(report).filter(n => !n.endsWith('_csv')).forEach(category => {
    equal(typeof report[`${category}_csv`], 'string', `${category} has csv`);

    summary[category] = report[category].map(n => n.id || n.created_at);
  });

  return summary;
};

const emptySummary = {
  chain_fees: [],
  chain_receives: [],
  chain_sends: [],
  forwards: [],
  invoices: [],
  payments: [],
};

const makeArgs = overrides => {
  const args = {
    after,
    before,
    currency: 'BTC',
    lnd: {},
    request: ({}, cbk) => cbk('UnexpectedRequest'),
  };

  Object.keys(overrides).forEach(k => args[k] = overrides[k]);

  return args;
};

const thrower = () => { throw new Error('err'); };
const unexpected = name => () => { throw new Error(`Unexpected${name}`); };

const tests = [
  {
    args: makeArgs({currency: undefined}),
    description: 'A currency is required',
    error: [400, 'ExpectedNativeCurrencyAssetType'],
  },
  {
    args: makeArgs({lnd: undefined}),
    description: 'LND is required',
    error: [400, 'ExpectedLndToGetAccountingReport'],
  },
  {
    args: makeArgs({rate: 'rate'}),
    description: 'A rate must be a function',
    error: [400, 'ExpectedRateFunctionForAccountingReport'],
  },
  {
    args: makeArgs({request: undefined}),
    description: 'A request function is required',
    error: [400, 'ExpectedRequestFunctionToGetAccountingReport'],
  },
  {
    args: makeArgs({}),
    description: 'A full report is generated within the date range',
    expected: {
      chain_fees: ['b:fee', 'send:fee'],
      chain_receives: ['receive'],
      chain_sends: ['send'],
      forwards: [date],
      invoices: ['inv'],
      payments: ['pay', 'pay:fee'],
    },
    stubs: {
      getChannels: ({}, cbk) => cbk(null, {channels: [{transaction_id: 'a'}]}),
      getClosedChannels: ({}, cbk) => cbk(null, {
        channels: [{close_transaction_id: 'b', transaction_id: 'c'}],
      }),
      getPendingChannels: ({}, cbk) => cbk(null, {
        pending_channels: [{transaction_id: 'd'}],
      }),
      getAllInvoices: (args, cbk) => {
        deepEqual(args, {after, before, lnd: {}}, 'Invoices date range');

        return cbk(null, {invoices: [invoice(date, 'inv')]});
      },
      getAllPayments: (args, cbk) => {
        deepEqual(args, {after, lnd: {}}, 'Payments after date');

        return cbk(null, {payments: [payment(date, 'pay')]});
      },
      getChainTransactions: (args, cbk) => {
        equal(args.after, after, 'Chain transactions after date');
        equal(args.before, before, 'Chain transactions before date');

        // Channel funding and closing transactions are not receives or sends
        return cbk(null, {
          transactions: [
            chainTx({created_at: date, id: 'a', is_outgoing: false}),
            chainTx({created_at: earlierDate, id: 'b', is_outgoing: true}),
            chainTx({created_at: date, id: 'receive', is_outgoing: false}),
            chainTx({created_at: date, id: 'send', is_outgoing: true}),
          ],
        });
      },
    },
  },
  {
    args: makeArgs({after: undefined, before: undefined}),
    description: 'A report is generated without a date range',
    expected: {
      chain_fees: ['send:fee'],
      chain_receives: ['receive'],
      chain_sends: ['send'],
      forwards: [earlyDate, date, lateDate],
      invoices: ['inv'],
      payments: ['pay', 'pay:fee'],
    },
  },
  {
    args: makeArgs({category: 'forwards'}),
    description: 'A forwards report skips other lookups',
    expected: Object.assign({}, emptySummary, {forwards: [date]}),
    stubs: {
      getAllInvoices: unexpected('InvoicesLookup'),
      getAllPayments: unexpected('PaymentsLookup'),
      getChainTransactions: unexpected('ChainLookup'),
      getChannels: unexpected('ChannelsLookup'),
      getClosedChannels: unexpected('ClosedLookup'),
      getPendingChannels: unexpected('PendingLookup'),
    },
  },
  {
    args: makeArgs({category: 'invoices'}),
    description: 'An invoices report skips forwards and payments',
    expected: Object.assign({}, emptySummary, {
      chain_fees: ['send:fee'],
      chain_receives: ['receive'],
      chain_sends: ['send'],
      invoices: ['inv'],
    }),
    stubs: {
      getAllPayments: unexpected('PaymentsLookup'),
      getForwards: unexpected('ForwardsLookup'),
    },
  },
  {
    args: makeArgs({category: 'payments'}),
    description: 'A payments report skips forwards and invoices',
    expected: Object.assign({}, emptySummary, {
      chain_fees: ['send:fee'],
      chain_receives: ['receive'],
      chain_sends: ['send'],
      payments: ['pay', 'pay:fee'],
    }),
    stubs: {
      getAllInvoices: unexpected('InvoicesLookup'),
      getForwards: unexpected('ForwardsLookup'),
    },
  },
  {
    args: makeArgs({}),
    description: 'Missing records from mappers are treated as empty',
    expected: emptySummary,
    stubs: {
      chainFeesAsRecords: () => ({}),
      chainReceivesAsRecords: () => ({}),
      chainSendsAsRecords: () => ({}),
      forwardsAsRecords: () => ({}),
      invoicesAsRecords: () => ({}),
      paymentsAsRecords: () => ({}),
    },
  },
  {
    args: makeArgs({}),
    description: 'Failing to get chain transactions is reported',
    error: [503, 'FailedToMapChainReceivesToRecords'],
    stubs: {getChainTransactions: ({}, cbk) => cbk()},
  },
  {
    args: makeArgs({}),
    description: 'Failing to map forwards is reported',
    error: [503, 'FailedToMapForwardsToAccountingRecords'],
    stubs: {forwardsAsRecords: thrower},
  },
  {
    args: makeArgs({}),
    description: 'Failing to map invoices is reported',
    error: [503, 'FailedToMapInvoicesToAccountingRecords'],
    stubs: {invoicesAsRecords: thrower},
  },
  {
    args: makeArgs({}),
    description: 'Failing to map chain sends is reported',
    error: [503, 'FailedToMapChainSendsToRecords'],
    stubs: {chainSendsAsRecords: thrower},
  },
  {
    args: makeArgs({}),
    description: 'Failing to add fiat values is reported',
    error: [500, 'FailedToAddHistoricFiatValuesToRecords'],
    stubs: {recordsWithFiat: thrower},
  },
  {
    args: makeArgs({}),
    description: 'Failing to categorize records is reported',
    error: [500, 'FailedToCategorizeRecords'],
    stubs: {categorizeRecords: thrower},
  },
];

tests.forEach(({args, description, error, expected}, i) => {
  return test(description, async () => {
    Object.keys(stubs).forEach(k => delete stubs[k]);

    Object.assign(stubs, defaultStubs(), tests[i].stubs || {});

    if (!!error) {
      // Error details vary, so match on the status code and message only
      await rejects(getAccountingReport(args), err => {
        deepEqual(err.slice(0, 2), error, 'Got expected error');

        return true;
      });
    } else {
      const report = await getAccountingReport(args);

      deepEqual(summarize(report), expected, 'Got expected report');
    }

    return;
  });
});

test('Fiat values are added to records', async () => {
  Object.keys(stubs).forEach(k => delete stubs[k]);

  Object.assign(stubs, defaultStubs());

  const report = await getAccountingReport(makeArgs({
    category: 'forwards',
    fiat: 'USD',
    rate: ({currency, date, fiat}, cbk) => {
      equal(currency, 'BTC', 'Rate currency is passed');
      equal(fiat, 'USD', 'Rate fiat is passed');

      return cbk(null, {cents: 1e8 * 100});
    },
  }));

  const [record] = report.forwards;

  equal(record.fiat_amount, 1, 'Fiat value is added to record');

  return;
});

test('Getting pending channels is retried', async ({mock}) => {
  // Eliminate the random retry delay
  mock.method(Math, 'random', () => 0);

  Object.keys(stubs).forEach(k => delete stubs[k]);

  let attempts = 0;

  Object.assign(stubs, defaultStubs(), {
    getPendingChannels: ({}, cbk) => {
      attempts++;

      return attempts === 1 ? cbk('err') : cbk(null, {pending_channels: []});
    },
  });

  await getAccountingReport(makeArgs({}));

  equal(attempts, 2, 'Pending channels lookup was retried');

  return;
});
