const {deepEqual} = require('node:assert').strict;
const {rejects} = require('node:assert').strict;
const test = require('node:test');

const {idForTransaction} = require('@alexbosworth/blockchain');

const getExternalOutput = require('./../../records/get_external_output');
const {makeBlocksLnd} = require('./../fixtures');
const {makeRawBlock} = require('./../fixtures');
const {makeRawTransaction} = require('./../fixtures');

const bufferAsHex = buffer => buffer.toString('hex');
const height = 995;
const outputs = [{tokens: 6000}, {tokens: 2500}];
const time = 5;

const {transaction} = makeRawTransaction({outputs});
const unknownId = bufferAsHex(Buffer.alloc(32, 1));

const {block} = makeRawBlock({time, transactions: [transaction]});
const {id} = idForTransaction({transaction});

const known = [{id, transaction}];

const makeArgs = overrides => {
  const args = {
    height,
    id,
    lnd: makeBlocksLnd({blocks: {[height]: block}}),
    vout: 1,
  };

  Object.keys(overrides).forEach(k => args[k] = overrides[k]);

  return args;
};

const tests = [
  {
    args: makeArgs({id: undefined}),
    description: 'A transaction id is required',
    error: [400, 'ExpectedTransactionIdToGetExternalOutput'],
  },
  {
    args: makeArgs({known: 'known'}),
    description: 'Known transactions must be an array',
    error: [400, 'ExpectedArrayOfKnownTransactionsToGetOutput'],
  },
  {
    args: makeArgs({lnd: undefined}),
    description: 'LND is required',
    error: [400, 'ExpectedLndToGetExternalOutput'],
  },
  {
    args: makeArgs({vout: undefined}),
    description: 'An output index is required',
    error: [400, 'ExpectedOutputIndexToGetExternalOutput'],
  },
  {
    args: makeArgs({height: undefined}),
    description: 'A height is required to recover an unknown transaction',
    error: [400, 'ExpectedHeightToGetExternalOutput', {id, vout: 1}],
  },
  {
    args: makeArgs({known, height: undefined, lnd: makeBlocksLnd({})}),
    description: 'A known transaction gives the output value directly',
    expected: {tokens: 2500},
  },
  {
    args: makeArgs({}),
    description: 'An output value is recovered from its block',
    expected: {tokens: 2500},
  },
  {
    args: makeArgs({known: [{id: unknownId}]}),
    description: 'A transaction not in the known ones is recovered',
    expected: {tokens: 2500},
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
    args: makeArgs({known, lnd: makeBlocksLnd({}), vout: 5}),
    description: 'An output missing from the transaction is an error',
    error: [503, 'ExpectedOutputInTransaction', {id, vout: 5}],
  },
  {
    args: makeArgs({known: [{id, transaction: '00'}], lnd: makeBlocksLnd({})}),
    description: 'A known transaction that cannot be parsed is an error',
    error: [503, 'FailedToParseExternalTransaction', {
      err: new Error('ExpectedAdditionalTransactionDataToParse'),
    }],
  },
];

tests.forEach(({args, description, error, expected}) => {
  return test(description, async () => {
    if (!!error) {
      await rejects(getExternalOutput(args), error, 'Got expected error');
    } else {
      deepEqual(await getExternalOutput(args), expected, 'Got output value');
    }

    return;
  });
});
