const {deepEqual} = require('node:assert').strict;
const {rejects} = require('node:assert').strict;
const test = require('node:test');

const {idForTransaction} = require('@alexbosworth/blockchain');

const getTxInBlock = require('./../../records/get_transaction_in_block');
const {makeBlocksLnd} = require('./../fixtures');
const {makeRawBlock} = require('./../fixtures');
const {makeRawTransaction} = require('./../fixtures');

const height = 995;
const outputs = [{tokens: 6000}, {tokens: 2500}];
const time = 5;

const {transaction} = makeRawTransaction({outputs});

const {block} = makeRawBlock({time, transactions: [transaction]});
const empty = makeRawBlock({time, transactions: []}).block;
const {id} = idForTransaction({transaction});

const makeArgs = overrides => {
  const args = {height, id, lnd: makeBlocksLnd({blocks: {[height]: block}})};

  Object.keys(overrides).forEach(k => args[k] = overrides[k]);

  return args;
};

const tests = [
  {
    args: makeArgs({height: undefined}),
    description: 'A height is required',
    error: [400, 'ExpectedHeightToGetTransactionInBlock'],
  },
  {
    args: makeArgs({id: undefined}),
    description: 'A transaction id is required',
    error: [400, 'ExpectedTransactionIdToGetTransactionInBlock'],
  },
  {
    args: makeArgs({lnd: undefined}),
    description: 'LND is required',
    error: [400, 'ExpectedLndToGetTransactionInBlock'],
  },
  {
    args: makeArgs({lnd: makeBlocksLnd({})}),
    description: 'A block that cannot be fetched is an error',
    error: [404, 'BlockNotFound'],
  },
  {
    args: makeArgs({lnd: makeBlocksLnd({blocks: {[height]: '00'}})}),
    description: 'A malformed block is an error',
    error: [503, 'FailedToQueryBlockForTransaction', {
      err: new Error('ExpectedBlockHeaderAndTransactionsToQueryTransactions'),
    }],
  },
  {
    args: makeArgs({lnd: makeBlocksLnd({blocks: {[height]: empty}})}),
    description: 'A transaction absent from the block is not found',
    error: [404, 'TransactionNotFoundInBlock', {height, id}],
  },
  {
    args: makeArgs({}),
    description: 'A transaction is returned from its block',
    expected: {block, height, transaction},
  },
];

tests.forEach(({args, description, error, expected}) => {
  return test(description, async () => {
    if (!!error) {
      await rejects(getTxInBlock(args), error, 'Got expected error');
    } else {
      deepEqual(await getTxInBlock(args), expected, 'Got result');
    }

    return;
  });
});
