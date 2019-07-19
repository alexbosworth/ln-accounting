const {test} = require('tap');

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
        notes: 'On-chain fee',
        type: 'fee:network',
      }],
    },
  },
];

tests.forEach(({args, description, expected}) => {
  return test(description, ({deepIs, end, equal}) => {
    const {records} = chainFeesAsRecords(args);

    deepIs(records, expected.records, 'Fees formatted as records');

    return end();
  });
});
