const {deepEqual} = require('node:assert').strict;
const test = require('node:test');
const {throws} = require('node:assert').strict;

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
  {
    args: {
      currency: 'BTC',
      fiat: [{date, cents: 123456}],
      records: [{
        category: 'category',
        created_at: date,
        type: 'type',
      }],
    },
    description: 'Add fiat values to records',
    expected: {
      records: [{
        amount: 0,
        asset: 'BTC',
        category: 'category',
        created_at: date,
        external_id: '',
        fiat_amount: 0,
        from_id: '',
        id: '',
        notes: '',
        to_id: '',
        type: 'type',
      }],
    },
  },
  {
    args: {
      currency: 'BTC',
      fiat: [],
      records: [{
        category: 'category',
        created_at: date,
        type: 'type',
      }],
    },
    description: 'No fiat is known',
    expected: {
      records: [{
        amount: 0,
        asset: 'BTC',
        category: 'category',
        created_at: date,
        external_id: '',
        fiat_amount: undefined,
        from_id: '',
        id: '',
        notes: '',
        to_id: '',
        type: 'type',
      }],
    },
  },
  {
    args: {},
    description: 'Records are required',
    error: 'ExpectedArrayOfRecordsToMapToFiatRecords',
  },
];

tests.forEach(({args, description, error, expected}) => {
  return test(description, (t, end) => {
    if (!!error) {
      throws(() => recordsWithFiat(args), new Error(error), 'Got error');
    } else {
      const {records} = recordsWithFiat(args);

      deepEqual(records, expected.records, 'Fiat added to records');
    }

    return end();
  });
});
