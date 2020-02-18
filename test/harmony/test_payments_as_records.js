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
  {
    args: {
      payments: [{
        created_at: date,
        destination: 'destination',
        fee: 1,
        id: 'id',
        request: 'lnbc1pvjluezpp5qqqsyqcyq5rqwzqfqqqsyqcyq5rqwzqfqqqsyqcyq5rqwzqfqypqdpl2pkx2ctnv5sxxmmwwd5kgetjypeh2ursdae8g6twvus8g6rfwvs8qun0dfjkxaq8rkx3yf5tcsyz3d73gafnh3cax9rn449d9p5uxz9ezhhypd0elx87sjle52x86fux2ypatgddc6k63n7erqz25le42c4u4ecky03ylcqca784w',
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
          notes: 'Please consider supporting this project',
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
  {
    args: {
      payments: [{
        created_at: date,
        destination: 'destination',
        fee: 1,
        id: 'id',
        request: 'request',
        secret: 'secret',
        tokens: 2,
      }],
    },
    description: 'Payments as records when the request is weird',
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
  {
    args: {
      payments: [{
        created_at: date,
        destination: 'destination',
        fee: 1,
        id: 'id',
        request: 'request',
        secret: 'secret',
        tokens: 2,
      }],
      public_key: 'destination'
    },
    description: 'Circular payments are represented',
    expected: {
      records: [
        {
          amount: -2,
          category: 'payments',
          created_at: date,
          id: 'id',
          notes: '[To Self] secret',
          to_id: 'destination',
          type: 'spend',
        },
        {
          amount: -1,
          category: 'payments',
          created_at: date,
          id: 'id:fee',
          notes: 'Circular payment routing fee',
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
