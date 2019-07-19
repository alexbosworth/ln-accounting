const {test} = require('tap');

const {paymentsAsRecords} = require('./../../harmony');

const date = new Date().toISOString();

const tests = [
  {
    args: {
      payments: [{
        created_at: date,
        destination: 'destination',
        fee: 1,
        id: 'id',
        secret: 'secret',
        tokens: 2,
      }],
    },
    description: 'Payments as records',
    expected: {
      records: [
        {
          amount: -2,
          category: 'payments',
          created_at: date,
          id: 'id',
          notes: 'secret',
          to_id: 'destination',
          type: 'spend',
        },
        {
          amount: -1,
          category: 'payments',
          created_at: date,
          id: 'id:fee',
          notes: 'Routing fee',
          type: 'fee:network',
        },
      ],
    },
  },
];

tests.forEach(({args, description, expected}) => {
  return test(description, ({deepIs, end, equal}) => {
    const {records} = paymentsAsRecords(args);

    deepIs(records, expected.records, 'Forwards formatted as records');

    return end();
  });
});
