const {test} = require('tap');

const {invoicesAsRecords} = require('./../../harmony');

const date = new Date().toISOString();

const tests = [
  {
    args: {
      invoices: [{
        confirmed_at: date,
        created_at: date,
        description: 'description',
        id: 'id',
        is_confirmed: true,
        received: 1,
      }],
    },
    description: 'Invoices as records',
    expected: {
      records: [{
        amount: 1,
        category: 'invoices',
        created_at: date,
        id: 'id',
        notes: 'Invoice: description',
        type: 'income',
      }],
    },
  },
  {
    args: {},
    description: 'Expects array of invoices',
    error: 'ExpectedArrayOfInvoicesToMapToAccountingRecords',
  }
];

tests.forEach(({args, description, error, expected}) => {
  return test(description, ({deepIs, end, throws}) => {
    if (!!error) {
      throws(() => invoicesAsRecords(args), new Error(error), 'Got error');
    } else {
      const {records} = invoicesAsRecords(args);

      deepIs(records, expected.records, 'Forwards formatted as records');
    }

    return end();
  });
});
