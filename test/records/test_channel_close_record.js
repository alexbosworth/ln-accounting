const {deepEqual} = require('node:assert').strict;
const test = require('node:test');
const {throws} = require('node:assert').strict;

const channelCloseRecord = require('./../../records/channel_close_record');
const {makeRawTransaction} = require('./../fixtures');

const outputs = [{tokens: 6000}, {tokens: 2500}];

const {transaction} = makeRawTransaction({outputs});

const closeTx = ({description}) => ({
  description,
  transaction,
  block_id: 'block_id',
  confirmation_count: 1,
  confirmation_height: 995,
  created_at: 'created_at',
  id: 'id',
  is_confirmed: true,
  output_addresses: ['address'],
});

const record = ({description}) => ({
  description,
  transaction,
  block_id: 'block_id',
  confirmation_count: 1,
  confirmation_height: 995,
  created_at: 'created_at',
  fee: 1500,
  id: 'id',
  is_confirmed: true,
  is_outgoing: true,
  output_addresses: ['address'],
  tokens: 1500,
});

const tests = [
  {
    args: {transaction: closeTx({})},
    description: 'A channel capacity is required',
    error: 'ExpectedChannelCapacityToDeriveChannelCloseRecord',
  },
  {
    args: {channel: {capacity: 10000}, transaction: {}},
    description: 'A raw closing transaction is required',
    error: 'ExpectedRawClosingTransactionToDeriveCloseRecord',
  },
  {
    args: {channel: {capacity: 10000}, transaction: closeTx({})},
    description: 'A close record is derived from the raw transaction',
    expected: {record: record({description: 'Channel close'})},
  },
  {
    args: {
      channel: {capacity: 10000},
      transaction: closeTx({description: 'label'}),
    },
    description: 'A close record includes the transaction label',
    expected: {record: record({description: 'Channel close: label'})},
  },
];

tests.forEach(({args, description, error, expected}) => {
  return test(description, (t, end) => {
    if (!!error) {
      throws(() => channelCloseRecord(args), new Error(error), 'Got error');
    } else {
      deepEqual(channelCloseRecord(args), expected, 'Got expected record');
    }

    return end();
  });
});
