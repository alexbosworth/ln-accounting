const {deepEqual} = require('node:assert').strict;
const test = require('node:test');
const {throws} = require('node:assert').strict;

const {forwardsAsRecords} = require('./../../harmony');

const date = new Date().toISOString();

const tests = [
  {
    args: {
      forwards: [{
        created_at: date,
        fee: 1,
        incoming_channel: 'incoming',
        outgoing_channel: 'outgoing',
        tokens: 2,
      }]
    },
    description: 'Forwards as records',
    expected: {
      records: [{
        amount: 1,
        category: 'forwards',
        created_at: date,
        from_id: 'incoming',
        notes: '2',
        to_id: 'outgoing',
        type: 'income',
      }],
    },
  },
  {
    args: {},
    description: 'Array of forwards required',
    error: 'ExpectedArrayOfForwardsToFormatAsAccountingRecords',
  },
];

tests.forEach(({args, description, error, expected}) => {
  return test(description, (t, end) => {
    if (!!error) {
      throws(() => forwardsAsRecords(args), new Error(error), 'Got error');
    } else {
      const {records} = forwardsAsRecords(args);

      deepEqual(records, expected.records, 'Forwards formatted as records');
    }

    return end();
  });
});
