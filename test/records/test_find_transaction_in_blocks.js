const {deepEqual} = require('node:assert').strict;
const {rejects} = require('node:assert').strict;
const test = require('node:test');

const {idForTransaction} = require('@alexbosworth/blockchain');

const findInBlocks = require('./../../records/find_transaction_in_blocks');
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
    error: [400, 'ExpectedHeightToFindTransactionInBlocks'],
  },
  {
    args: makeArgs({id: undefined}),
    description: 'A transaction id is required',
    error: [400, 'ExpectedTransactionIdToFindTransactionInBlocks'],
  },
  {
    args: makeArgs({lnd: undefined}),
    description: 'LND is required',
    error: [400, 'ExpectedLndToFindTransactionInBlocks'],
  },
  {
    args: makeArgs({}),
    description: 'A transaction is found in the block at its height',
    expected: {block, height, transaction},
  },
  {
    args: makeArgs({
      lnd: makeBlocksLnd({
        blocks: {993: empty, 994: empty, 995: empty, 996: empty, 997: block},
      }),
    }),
    description: 'A transaction moved by a reorg is found in a later block',
    expected: {block, transaction, height: 997},
  },
  {
    args: makeArgs({
      lnd: makeBlocksLnd({
        blocks: {993: block, 994: empty, 995: empty, 996: empty, 997: empty},
      }),
    }),
    description: 'A transaction moved by a reorg is found in an earlier block',
    expected: {block, transaction, height: 993},
  },
  {
    args: makeArgs({
      lnd: makeBlocksLnd({blocks: {994: block, 995: empty, 996: block}}),
    }),
    description: 'Nearer blocks are searched before farther ones',
    expected: {block, transaction, height: 996},
  },
  {
    args: makeArgs({lnd: makeBlocksLnd({blocks: {995: empty, 998: block}})}),
    description: 'Blocks that are not available are skipped',
    expected: {block, transaction, height: 998},
  },
  {
    args: makeArgs({
      height: 2,
      lnd: makeBlocksLnd({blocks: {0: empty, 1: empty, 2: empty}}),
    }),
    description: 'A transaction absent from all searched blocks is an error',
    error: [
      503,
      'FailedToFindTransactionInBlocks',
      {id, err: [404, 'BlockNotFound'], height: 2},
    ],
  },
];

tests.forEach(({args, description, error, expected}) => {
  return test(description, async () => {
    if (!!error) {
      await rejects(findInBlocks(args), error, 'Got expected error');
    } else {
      deepEqual(await findInBlocks(args), expected, 'Got expected result');
    }

    return;
  });
});
