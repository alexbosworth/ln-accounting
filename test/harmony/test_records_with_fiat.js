const {test} = require('tap');

const {recordsWithFiat} = require('./../../harmony');

const date = new Date().toISOString();

const tests = [
  {
    args: {
      currency: 'BTC',
      fiat: [{date, cents: 123456}],
      records: [{
        amount: 1e8,
        category: 'category',
        created_at: date,
        id: 'id',
        type: 'type',
      }],
    },
    description: 'Add fiat values to records',
    expected: {
      records: [{
        amount: 1e8,
        asset: 'BTC',
        category: 'category',
        created_at: date,
        external_id: '',
        fiat_amount: 1234.56,
        from_id: '',
        id: 'id',
        notes: '',
        to_id: '',
        type: 'type',
      }],
    },
  },
];

tests.forEach(({args, description, expected}) => {
  return test(description, ({deepIs, end, equal}) => {
    const {records} = recordsWithFiat(args);

    deepIs(records, expected.records, 'Fiat added to records');

    return end();
  });
});
