const {deepEqual} = require('node:assert').strict;
const {rejects} = require('node:assert').strict;
const test = require('node:test');

const {encodeBech32Address} = require('@alexbosworth/blockchain');
const {idForBlock} = require('@alexbosworth/blockchain');
const {idForTransaction} = require('@alexbosworth/blockchain');
const {p2wpkhOutputScript} = require('@alexbosworth/blockchain');

const getExternalTx = require('./../../records/get_external_transaction');
const {makeBlocksLnd} = require('./../fixtures');
const {makeRawBlock} = require('./../fixtures');
const {makeRawTransaction} = require('./../fixtures');

const bufferAsHex = buffer => buffer.toString('hex');
const height = 995;
const program = Buffer.alloc(20, 0x33);
const time = 5;

const {address} = encodeBech32Address({program, prefix: 'bc', version: 0});
const script = bufferAsHex(p2wpkhOutputScript({hash: program}).script);
const unknownId = bufferAsHex(Buffer.alloc(32, 1));

const {transaction} = makeRawTransaction({
  outputs: [{script, tokens: 6000}, {script, tokens: 2500}],
});

const {block, header} = makeRawBlock({time, transactions: [transaction]});
const {id} = idForTransaction({transaction});

const known = [{id, transaction}];

const details = {
  id,
  transaction,
  block_id: idForBlock({block}).id,
  confirmation_height: height,
  created_at: '1970-01-01T00:00:05.000Z',
  is_confirmed: true,
  output_addresses: [address, address],
};

const makeArgs = overrides => {
  const args = {height, id, lnd: makeBlocksLnd({blocks: {[height]: block}})};

  Object.keys(overrides).forEach(k => args[k] = overrides[k]);

  return args;
};

const tests = [
  {
    args: makeArgs({height: undefined}),
    description: 'A height is required to recover a transaction',
    error: [400, 'ExpectedHeightToGetExternalTransaction', {id}],
  },
  {
    args: makeArgs({id: undefined}),
    description: 'A transaction id is required',
    error: [400, 'ExpectedTransactionIdToGetExternalTransaction'],
  },
  {
    args: makeArgs({known: 'known'}),
    description: 'Known transactions must be an array',
    error: [400, 'ExpectedArrayOfKnownTransactionsToGetExternalTx'],
  },
  {
    args: makeArgs({lnd: undefined}),
    description: 'LND is required',
    error: [400, 'ExpectedLndToGetExternalTransaction'],
  },
  {
    args: makeArgs({}),
    description: 'A transaction is recovered from its block',
    expected: details,
  },
  {
    args: makeArgs({known: [{id: unknownId}]}),
    description: 'A transaction not in the known ones is recovered',
    expected: details,
  },
  {
    args: makeArgs({lnd: makeBlocksLnd({})}),
    description: 'Errors recovering the transaction are passed back',
    error: [
      503,
      'FailedToFindTransactionInBlocks',
      {height, id, err: [404, 'BlockNotFound']},
    ],
  },
  {
    args: makeArgs({known}),
    description: 'A known transaction is still looked for in its block',
    expected: details,
  },
  {
    args: makeArgs({known, lnd: makeBlocksLnd({headers: {[height]: header}})}),
    description: 'A known transaction is used when its block is not found',
    expected: details,
  },
  {
    args: makeArgs({known, lnd: makeBlocksLnd({})}),
    description: 'A known transaction still needs its block header',
    error: [404, 'BlockForHeaderNotFound'],
  },
  {
    args: makeArgs({
      known: [{id, transaction: '00'}],
      lnd: makeBlocksLnd({headers: {[height]: header}}),
    }),
    description: 'A known transaction that cannot be parsed is an error',
    error: [503, 'FailedToDeriveExternalTransactionAddresses', {
      err: new Error('ExpectedAdditionalTransactionDataToParse'),
    }],
  },
];

tests.forEach(({args, description, error, expected}) => {
  return test(description, async () => {
    if (!!error) {
      await rejects(getExternalTx(args), error, 'Got expected error');
    } else {
      deepEqual(await getExternalTx(args), expected, 'Got transaction');
    }

    return;
  });
});
