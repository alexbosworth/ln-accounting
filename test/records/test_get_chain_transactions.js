const {deepEqual} = require('node:assert').strict;
const {equal} = require('node:assert').strict;
const {rejects} = require('node:assert').strict;
const test = require('node:test');

const lnService = require('ln-service');

// Route LND calls through swappable stubs before loading the module under test
const stubs = {};

[
  'getChainTransactions',
  'getClosedChannels',
  'getHeight',
  'getSweepTransactions',
]
.forEach(method => lnService[method] = (...args) => stubs[method](...args));

const {getChainTransactions} = require('./../../records');

const blockId = Buffer.alloc(32, 9).toString('hex');
const id = n => Buffer.alloc(32, n).toString('hex');
const minutesAgo = n => new Date(Date.now() - n * 60 * 1000).toISOString();

// Encode a minimal raw transaction with given inputs and output values
const rawTx = ({inputs, outputs}) => {
  const value = tokens => {
    const buf = Buffer.alloc(8);

    buf.writeBigUInt64LE(BigInt(tokens));

    return buf.toString('hex');
  };

  const vout = n => {
    const buf = Buffer.alloc(4);

    buf.writeUInt32LE(n);

    return buf.toString('hex');
  };

  const script = '160014' + '33'.repeat(20);
  const txId = n => Buffer.from(n, 'hex').reverse().toString('hex');

  return [
    '02000000',
    inputs.length.toString(16).padStart(2, '0'),
    ...inputs.map(n => txId(n.id) + vout(n.vout) + '00' + 'ffffffff'),
    outputs.length.toString(16).padStart(2, '0'),
    ...outputs.map(n => value(n) + script),
    '00000000',
  ].join('');
};

const chainTx = ({created_at, description, id, transaction}) => ({
  created_at,
  description,
  id,
  transaction,
  block_id: blockId,
  confirmation_count: 1,
  confirmation_height: 995,
  fee: undefined,
  is_confirmed: true,
  is_outgoing: false,
  output_addresses: [],
  tokens: 1,
});

const sweepDate = minutesAgo(10);

const fundingTx = chainTx({
  created_at: minutesAgo(30),
  id: id(1),
  transaction: rawTx({inputs: [{id: id(99), vout: 0}], outputs: [10000]}),
});

// Channel close spending a locally known output
const localCloseTx = chainTx({
  created_at: minutesAgo(5),
  description: 'description',
  id: id(2),
  transaction: rawTx({inputs: [{id: id(1), vout: 0}], outputs: [9000]}),
});

// Channel close spending an output that is not known locally
const foreignCloseTx = chainTx({
  created_at: minutesAgo(5),
  id: id(3),
  transaction: rawTx({inputs: [{id: id(98), vout: 0}], outputs: [9000]}),
});

const normalTx = chainTx({
  created_at: minutesAgo(5),
  id: id(5),
  transaction: rawTx({inputs: [{id: id(97), vout: 0}], outputs: [1000]}),
});

const sweepTx = ({created_at, fee, id}) => ({
  created_at,
  fee,
  id,
  block_id: blockId,
  confirmation_count: 1,
  confirmation_height: 995,
  is_confirmed: true,
  output_addresses: [],
  spends: [
    {tokens: 5000, transaction_id: id, transaction_vout: 0},
    {transaction_id: id, transaction_vout: 1},
  ],
  transaction: rawTx({inputs: [{id, vout: 0}], outputs: [7000]}),
});

const closedChannel = overrides => Object.assign({
  close_confirm_height: 995,
  close_transaction_id: id(2),
  is_partner_initiated: false,
}, overrides);

// Esplora API responses keyed by transaction id
const esplora = {
  [id(3)]: {
    fee: 300,
    status: {
      block_hash: blockId,
      block_height: 995,
      block_time: 1,
      confirmed: true,
    },
    vout: [{scriptpubkey_address: 'address3'}],
  },
  [id(4)]: {
    fee: 400,
    status: {
      block_hash: blockId,
      block_height: 996,
      block_time: 2,
      confirmed: true,
    },
    vout: [{scriptpubkey_address: 'address4'}],
  },
  [id(6)]: {vout: [{value: 5000}, {value: 3000}]},
  [id(7)]: {vout: [{value: 5000}, {value: 3000}]},
};

const request = ({url}, cbk) => cbk(null, null, esplora[url.split('/').pop()]);

const defaultStubs = () => ({
  getChainTransactions: ({}, cbk) => cbk(null, {transactions: [normalTx]}),
  getClosedChannels: ({}, cbk) => cbk(null, {channels: []}),
  getHeight: ({}, cbk) => cbk(null, {current_block_height: 1000}),
  getSweepTransactions: ({}, cbk) => cbk(null, {transactions: []}),
});

const tests = [
  {
    args: {request},
    description: 'LND is required',
    error: [400, 'ExpectedLndToGetChainTransactions'],
  },
  {
    args: {lnd: {}},
    description: 'A request function is required',
    error: [400, 'ExpectedRequestFunctionToGetChainTransactions'],
  },
  {
    args: {request, lnd: {}},
    description: 'Regular chain transactions are returned',
    expected: {transactions: [normalTx]},
    stubs: {
      getChainTransactions: (args, cbk) => {
        equal(args.after, undefined, 'No after height without after date');

        return cbk(null, {transactions: [normalTx]});
      },
    },
  },
  {
    args: {
      request,
      after: minutesAgo(24.9),
      before: minutesAgo(1),
      lnd: {},
      network: 'btctestnet',
    },
    description: 'Closing fees and sweep fees are calculated',
    expected: {
      transactions: [
        {
          block_id: blockId,
          confirmation_count: 1,
          confirmation_height: 995,
          created_at: localCloseTx.created_at,
          description: 'Channel close: description',
          fee: 1000,
          id: id(2),
          is_confirmed: true,
          is_outgoing: true,
          output_addresses: [],
          tokens: 1000,
          transaction: localCloseTx.transaction,
        },
        {
          block_id: blockId,
          confirmation_height: 995,
          created_at: '1970-01-01T00:00:01.000Z',
          description: 'Channel close',
          fee: 300,
          id: id(3),
          is_confirmed: true,
          is_outgoing: true,
          output_addresses: ['address3'],
          tokens: 300,
        },
        {
          block_id: blockId,
          confirmation_height: 996,
          created_at: '1970-01-01T00:00:02.000Z',
          description: 'Channel close',
          fee: 400,
          id: id(4),
          is_confirmed: true,
          is_outgoing: true,
          output_addresses: ['address4'],
          tokens: 400,
        },
        {
          block_id: blockId,
          confirmation_count: 1,
          confirmation_height: 995,
          created_at: sweepDate,
          description: 'Sweep',
          fee: 1000,
          id: id(6),
          is_confirmed: true,
          is_outgoing: true,
          output_addresses: [],
          spends: [
            {tokens: 5000, transaction_id: id(6), transaction_vout: 0},
            {tokens: 3000, transaction_id: id(6), transaction_vout: 1},
          ],
          tokens: 1000,
          transaction: sweepTx({id: id(6)}).transaction,
        },
        {
          block_id: blockId,
          confirmation_count: 1,
          confirmation_height: 995,
          created_at: sweepDate,
          description: 'Sweep',
          fee: 50,
          id: id(7),
          is_confirmed: true,
          is_outgoing: true,
          output_addresses: [],
          spends: [
            {tokens: 5000, transaction_id: id(7), transaction_vout: 0},
            {tokens: 3000, transaction_id: id(7), transaction_vout: 1},
          ],
          tokens: 50,
          transaction: sweepTx({id: id(7)}).transaction,
        },
        fundingTx,
        normalTx,
      ],
    },
    stubs: {
      getChainTransactions: (args, cbk) => {
        equal(args.after, 990, 'Chain transactions are fetched after height');

        return cbk(null, {
          transactions: [fundingTx, localCloseTx, foreignCloseTx, normalTx],
        });
      },
      getClosedChannels: ({}, cbk) => cbk(null, {
        channels: [
          // Close tx known locally with local inputs
          closedChannel({}),
          // Close tx known locally but with inputs that are not local
          closedChannel({close_transaction_id: id(3)}),
          // Close tx not known locally, without a confirmation height
          closedChannel({
            close_confirm_height: undefined,
            close_transaction_id: id(4),
          }),
          // Channel closed before the after date is ignored
          closedChannel({
            close_confirm_height: 900,
            close_transaction_id: id(8),
          }),
          // Remotely initiated closes are ignored
          closedChannel({
            close_transaction_id: id(8),
            is_partner_initiated: true,
          }),
          // Channels without a close transaction are ignored
          closedChannel({close_transaction_id: undefined}),
        ],
      }),
      getSweepTransactions: ({}, cbk) => cbk(null, {
        transactions: [
          sweepTx({created_at: sweepDate, id: id(6)}),
          sweepTx({created_at: sweepDate, fee: 50, id: id(7)}),
          // Sweeps before the after date are ignored
          sweepTx({created_at: minutesAgo(60), id: id(10)}),
          // Sweeps after the before date are ignored
          sweepTx({created_at: new Date().toISOString(), id: id(11)}),
        ],
      }),
    },
  },
  {
    args: {request: ({}, cbk) => cbk('err'), lnd: {}},
    description: 'Errors looking up sweep spend values are passed back',
    error: [503, 'UnexpectedErrorGettingExploraTx', {err: 'err'}],
    stubs: {
      getSweepTransactions: ({}, cbk) => cbk(null, {
        transactions: [sweepTx({created_at: sweepDate, id: id(6)})],
      }),
    },
  },
  {
    args: {request: ({}, cbk) => cbk('err'), lnd: {}},
    description: 'Errors looking up close transactions are passed back',
    error: [503, 'UnexpectedErrorGettingEsploraTx', {err: 'err'}],
    stubs: {
      getClosedChannels: ({}, cbk) => cbk(null, {
        channels: [closedChannel({close_transaction_id: id(4)})],
      }),
    },
  },
];

tests.forEach(({args, description, error, expected}, i) => {
  return test(description, async () => {
    Object.assign(stubs, defaultStubs(), tests[i].stubs || {});

    if (!!error) {
      await rejects(getChainTransactions(args), error, 'Got expected error');
    } else {
      const res = await getChainTransactions(args);

      deepEqual(res, expected, 'Got expected result');
    }

    return;
  });
});
