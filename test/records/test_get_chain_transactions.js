const {deepEqual} = require('node:assert').strict;
const {equal} = require('node:assert').strict;
const {rejects} = require('node:assert').strict;
const test = require('node:test');

const {encodeBech32Address} = require('@alexbosworth/blockchain');
const {idForBlock} = require('@alexbosworth/blockchain');
const {idForTransaction} = require('@alexbosworth/blockchain');
const lnService = require('ln-service');

// Route LND calls through swappable stubs before loading the module under test
const stubs = {};

[
  'getBlock',
  'getBlockHeader',
  'getChainTransaction',
  'getChainTransactions',
  'getClosedChannels',
  'getHeight',
  'getSweepTransactions',
]
.forEach(method => lnService[method] = (...args) => stubs[method](...args));

const {getChainTransactions} = require('./../../records');
const {makeRawBlock} = require('./../fixtures');

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

// Channel close known to the wallet with a label
const localCloseTx = chainTx({
  created_at: minutesAgo(5),
  description: 'description',
  id: id(2),
  transaction: rawTx({inputs: [{id: id(1), vout: 0}], outputs: [9000]}),
});

// Channel close known to the wallet without a label
const unlabeledCloseTx = chainTx({
  created_at: minutesAgo(5),
  id: id(3),
  transaction: rawTx({inputs: [{id: id(98), vout: 0}], outputs: [9000]}),
});

// Channel close that is only known to the wallet by id lookup
const walletCloseTx = chainTx({
  created_at: minutesAgo(5),
  description: 'wallet',
  id: id(12),
  transaction: rawTx({inputs: [{id: id(96), vout: 0}], outputs: [9500]}),
});

const normalTx = chainTx({
  created_at: minutesAgo(5),
  id: id(5),
  transaction: rawTx({inputs: [{id: id(97), vout: 0}], outputs: [1000]}),
});

// Channel close that is only present in its block
const blockCloseTx = rawTx({
  inputs: [{id: id(95), vout: 0}],
  outputs: [6000, 2500],
});

const blockCloseTxId = idForTransaction({transaction: blockCloseTx}).id;
const {block, header} = makeRawBlock({time: 5, transactions: [blockCloseTx]});

// The address of the fixed output script used by the raw tx fixture
const fixtureAddress = encodeBech32Address({
  prefix: 'bc',
  program: Buffer.alloc(20, 0x33),
  version: 0,
}).address;

// Wallet transactions available by id lookup
const walletTxs = {
  [id(12)]: walletCloseTx,
  // A wallet transaction without a raw transaction cannot be used
  [id(13)]: {id: id(13)},
};

const sweepTx = args => ({
  block_id: blockId,
  confirmation_count: 1,
  confirmation_height: 995,
  created_at: args.created_at,
  fee: args.fee,
  id: args.id,
  is_confirmed: true,
  output_addresses: [],
  spends: args.spends || [
    {tokens: 5000, transaction_id: args.id, transaction_vout: 0},
    {transaction_id: args.id, transaction_vout: 1},
  ],
  transaction: rawTx({
    inputs: [{id: args.id, vout: 0}],
    outputs: args.outputs || [7000],
  }),
});

const closedChannel = overrides => Object.assign({
  capacity: 10000,
  close_confirm_height: 995,
  close_payments: [],
  close_transaction_id: id(2),
  is_partner_initiated: false,
}, overrides);

const getBlock = ({height}, cbk) => {
  // Only the block at the expected height is available
  if (height !== 995) {
    return cbk([404, 'BlockNotFound']);
  }

  return cbk(null, {block});
};

const defaultStubs = () => ({
  getBlock: ({}, cbk) => cbk([501, 'GetBlockMethodNotSupported']),
  getBlockHeader: ({}, cbk) => cbk([501, 'GetBlockHeaderMethodNotSupported']),
  getChainTransaction: ({}, cbk) => cbk([501, 'MethodNotSupported']),
  getChainTransactions: ({}, cbk) => cbk(null, {transactions: [normalTx]}),
  getClosedChannels: ({}, cbk) => cbk(null, {channels: []}),
  getHeight: ({}, cbk) => cbk(null, {current_block_height: 1000}),
  getSweepTransactions: ({}, cbk) => cbk(null, {transactions: []}),
});

const tests = [
  {
    args: {},
    description: 'LND is required',
    error: [400, 'ExpectedLndToGetChainTransactions'],
  },
  {
    args: {lnd: {}, transactions: 'transactions'},
    description: 'Raw transactions must be an array',
    error: [400, 'ExpectedArrayOfRawTransactionsToGetChainTxs'],
  },
  {
    args: {lnd: {}, transactions: ['00']},
    description: 'Raw transactions must be parseable',
    error: [400, 'ExpectedValidRawTransactionsToGetChainTxs', {
      err: new Error('ExpectedAdditionalTransactionDataToParse'),
    }],
  },
  {
    args: {lnd: {}},
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
      after: minutesAgo(24.9),
      before: minutesAgo(1),
      lnd: {},
      network: 'btc',
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
          confirmation_count: 1,
          confirmation_height: 995,
          created_at: unlabeledCloseTx.created_at,
          description: 'Channel close',
          fee: 1000,
          id: id(3),
          is_confirmed: true,
          is_outgoing: true,
          output_addresses: [],
          tokens: 1000,
          transaction: unlabeledCloseTx.transaction,
        },
        {
          block_id: blockId,
          confirmation_count: 1,
          confirmation_height: 995,
          created_at: walletCloseTx.created_at,
          description: 'Channel close: wallet',
          fee: 500,
          id: id(12),
          is_confirmed: true,
          is_outgoing: true,
          output_addresses: [],
          tokens: 500,
          transaction: walletCloseTx.transaction,
        },
        {
          block_id: idForBlock({block}).id,
          confirmation_count: undefined,
          confirmation_height: 995,
          created_at: '1970-01-01T00:00:05.000Z',
          description: 'Channel close',
          fee: 1500,
          id: blockCloseTxId,
          is_confirmed: true,
          is_outgoing: true,
          output_addresses: [fixtureAddress, fixtureAddress],
          tokens: 1500,
          transaction: blockCloseTx,
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
            {tokens: 330, transaction_id: id(7), transaction_vout: 2},
            {tokens: 1000, transaction_id: id(15), transaction_vout: 0},
          ],
          tokens: 50,
          transaction: sweepTx({id: id(7), outputs: [1200]}).transaction,
        },
        {
          block_id: blockId,
          confirmation_count: 1,
          confirmation_height: 995,
          created_at: sweepDate,
          description: 'Sweep',
          fee: 100,
          id: id(16),
          is_confirmed: true,
          is_outgoing: true,
          output_addresses: [],
          spends: [
            {
              tokens: 2500,
              transaction_id: blockCloseTxId,
              transaction_vout: 1,
            },
          ],
          tokens: 100,
          transaction: sweepTx({id: id(16), outputs: [2400]}).transaction,
        },
        fundingTx,
        normalTx,
      ],
    },
    stubs: {
      getBlock,
      getChainTransactions: (args, cbk) => {
        equal(args.after, 990, 'Chain transactions are fetched after height');

        return cbk(null, {
          transactions: [fundingTx, localCloseTx, unlabeledCloseTx, normalTx],
        });
      },
      getChainTransaction: ({id}, cbk) => {
        // Exit early when the transaction is not known to the wallet
        if (!walletTxs[id]) {
          return cbk([503, 'UnexpectedGetChainTransactionError']);
        }

        return cbk(null, walletTxs[id]);
      },
      getClosedChannels: ({}, cbk) => cbk(null, {
        channels: [
          // Close tx known to the wallet with a label
          closedChannel({}),
          // Close tx known to the wallet, no label, no confirm height
          closedChannel({
            close_confirm_height: undefined,
            close_transaction_id: id(3),
          }),
          // Close tx outside the height range but known to the wallet
          closedChannel({close_transaction_id: id(12)}),
          // Close tx not known to the wallet, recovered from its block
          closedChannel({close_transaction_id: blockCloseTxId}),
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
          // Peer-initiated close with a swept balance output
          closedChannel({
            close_balance_tokens: 3000,
            close_balance_vout: 1,
            close_transaction_id: id(6),
            is_partner_initiated: true,
          }),
          // Peer-initiated close with a swept anchor and HTLC output
          closedChannel({
            anchor_tokens: 330,
            anchor_vout: 2,
            close_payments: [
              {tokens: 1000, transaction_id: id(15), transaction_vout: 0},
            ],
            close_transaction_id: id(7),
            is_partner_initiated: true,
          }),
        ],
      }),
      getSweepTransactions: ({}, cbk) => cbk(null, {
        transactions: [
          // Sweep spending the balance output of a closed channel
          sweepTx({created_at: sweepDate, id: id(6)}),
          // Sweep spending the anchor and an HTLC output of a closed channel
          sweepTx({
            created_at: sweepDate,
            fee: 50,
            id: id(7),
            outputs: [1200],
            spends: [
              {transaction_id: id(7), transaction_vout: 2},
              {transaction_id: id(15), transaction_vout: 0},
            ],
          }),
          // Sweep spending an output of the block-only close
          sweepTx({
            created_at: sweepDate,
            id: id(16),
            outputs: [2400],
            spends: [{transaction_id: blockCloseTxId, transaction_vout: 1}],
          }),
          // Sweeps before the after date are ignored
          sweepTx({created_at: minutesAgo(60), id: id(10)}),
          // Sweeps after the before date are ignored
          sweepTx({created_at: new Date().toISOString(), id: id(11)}),
        ],
      }),
    },
  },
  {
    args: {lnd: {}, transactions: [blockCloseTx]},
    description: 'Supplied raw transactions are used when blocks are missing',
    expected: {
      transactions: [
        {
          block_id: idForBlock({block}).id,
          confirmation_count: undefined,
          confirmation_height: 995,
          created_at: '1970-01-01T00:00:05.000Z',
          description: 'Channel close',
          fee: 1500,
          id: blockCloseTxId,
          is_confirmed: true,
          is_outgoing: true,
          output_addresses: [fixtureAddress, fixtureAddress],
          tokens: 1500,
          transaction: blockCloseTx,
        },
        {
          block_id: blockId,
          confirmation_count: 1,
          confirmation_height: 995,
          created_at: sweepDate,
          description: 'Sweep',
          fee: 100,
          id: id(16),
          is_confirmed: true,
          is_outgoing: true,
          output_addresses: [],
          spends: [
            {
              tokens: 2500,
              transaction_id: blockCloseTxId,
              transaction_vout: 1,
            },
          ],
          tokens: 100,
          transaction: sweepTx({id: id(16), outputs: [2400]}).transaction,
        },
        normalTx,
      ],
    },
    stubs: {
      getBlock: ({}, cbk) => cbk([404, 'BlockNotFound']),
      getBlockHeader: ({height}, cbk) => {
        equal(height, 995, 'Header is fetched at the close confirm height');

        return cbk(null, {header});
      },
      getClosedChannels: ({}, cbk) => cbk(null, {
        channels: [closedChannel({close_transaction_id: blockCloseTxId})],
      }),
      getSweepTransactions: ({}, cbk) => cbk(null, {
        transactions: [
          sweepTx({
            created_at: sweepDate,
            id: id(16),
            outputs: [2400],
            spends: [{transaction_id: blockCloseTxId, transaction_vout: 1}],
          }),
        ],
      }),
    },
  },
  {
    args: {lnd: {}},
    description: 'A close transaction that cannot be parsed is an error',
    error: [503, 'FailedToDeriveChannelCloseRecord', {
      err: new Error('ExpectedAdditionalTransactionDataToParse'),
    }],
    stubs: {
      getChainTransactions: ({}, cbk) => cbk(null, {
        transactions: [
          chainTx({created_at: sweepDate, id: id(2), transaction: '00'}),
        ],
      }),
      getClosedChannels: ({}, cbk) => cbk(null, {
        channels: [closedChannel({})],
      }),
    },
  },
  {
    args: {lnd: {}},
    description: 'A close transaction without a height cannot be recovered',
    error: [400, 'ExpectedHeightToGetExternalTransaction', {id: id(4)}],
    stubs: {
      getClosedChannels: ({}, cbk) => cbk(null, {
        channels: [closedChannel({
          close_confirm_height: undefined,
          close_transaction_id: id(4),
        })],
      }),
    },
  },
  {
    args: {lnd: {}},
    description: 'A listed transaction without raw data is looked up by id',
    expected: {
      transactions: [{
        block_id: blockId,
        confirmation_count: 1,
        confirmation_height: 995,
        created_at: walletCloseTx.created_at,
        description: 'Channel close: wallet',
        fee: 500,
        id: id(12),
        is_confirmed: true,
        is_outgoing: true,
        output_addresses: [],
        tokens: 500,
        transaction: walletCloseTx.transaction,
      }],
    },
    stubs: {
      getChainTransaction: ({}, cbk) => cbk(null, walletTxs[id(12)]),
      getChainTransactions: ({}, cbk) => cbk(null, {
        transactions: [chainTx({created_at: sweepDate, id: id(12)})],
      }),
      getClosedChannels: ({}, cbk) => cbk(null, {
        channels: [closedChannel({close_transaction_id: id(12)})],
      }),
    },
  },
  {
    args: {lnd: {}},
    description: 'A wallet transaction without raw data is recovered instead',
    error: [
      503,
      'FailedToFindTransactionInBlocks',
      {err: [501, 'GetBlockMethodNotSupported'], height: 995, id: id(13)},
    ],
    stubs: {
      getChainTransaction: ({}, cbk) => cbk(null, walletTxs[id(13)]),
      getClosedChannels: ({}, cbk) => cbk(null, {
        channels: [closedChannel({close_transaction_id: id(13)})],
      }),
    },
  },
  {
    args: {lnd: {}},
    description: 'A sweep input without a known height cannot be recovered',
    error: [400, 'ExpectedHeightToGetExternalOutput', {id: id(6), vout: 1}],
    stubs: {
      getSweepTransactions: ({}, cbk) => cbk(null, {
        transactions: [sweepTx({created_at: sweepDate, id: id(6)})],
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
      deepEqual(await getChainTransactions(args), expected, 'Got result');
    }

    return;
  });
});
