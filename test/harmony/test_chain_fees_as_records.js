const {deepEqual} = require('node:assert').strict;
const test = require('node:test');

const {chainFeesAsRecords} = require('./../../harmony');

const date = new Date().toISOString();

const tests = [
  {
    args: {
      transactions: [{
        created_at: date,
        fee: 1,
        id: 'id',
        is_outgoing: true,
      }]
    },
    description: 'Chain fees as records',
    expected: {
      records: [{
        amount: -1,
        category: 'chain_fees',
        created_at: date,
        id: 'id:fee',
        notes: '[Chain Fee]',
        type: 'fee:network',
      }],
    },
  },
];

tests.forEach(({args, description, expected}) => {
  return test(description, (t, end) => {
    const {records} = chainFeesAsRecords(args);

    deepEqual(records, expected.records, 'Fees formatted as records');

    return end();
  });
});
