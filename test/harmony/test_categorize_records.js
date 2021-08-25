const {test} = require('@alexbosworth/tap');

const {categorizeRecords} = require('./../../harmony');

const tests = [
  {
    args: {
      records: [
        {
          amount: 1,
          asset: 'BTC',
          category: 'payments',
          created_at: '2019-07-19T03:31:39.916Z',
          external_id: 'external_id',
          from_id: 'from_id',
          id: 'id',
          notes: 'notes',
          to_id: 'to_id',
          type: 'spend',
        },
        {
          amount: 1,
          asset: 'BTC',
          category: 'payments',
          created_at: '2019-07-20T03:31:39.916Z',
          external_id: 'external_id',
          from_id: 'from_id',
          id: 'id',
          notes: 'notes',
          to_id: 'to_id',
          type: 'spend',
        },
      ],
    },
    description: 'Categorize records',
    expected: {
      payments: [
        {
          amount: 1,
          asset: 'BTC',
          category: 'payments',
          created_at: '2019-07-19T03:31:39.916Z',
          external_id: 'external_id',
          from_id: 'from_id',
          id: 'id',
          notes: 'notes',
          to_id: 'to_id',
          type: 'spend',
        },
        {
          amount: 1,
          asset: 'BTC',
          category: 'payments',
          created_at: '2019-07-20T03:31:39.916Z',
          external_id: 'external_id',
          from_id: 'from_id',
          id: 'id',
          notes: 'notes',
          to_id: 'to_id',
          type: 'spend',
        },
      ],
      payments_csv: [
        '"Amount","Asset","Date & Time","Fiat Amount","From ID","Network ID","Notes","To ID","Transaction ID","Type"',
        '1,"BTC","2019-07-19T03:31:39.916Z",,"from_id","external_id","notes","to_id","id","spend"',
        '1,"BTC","2019-07-20T03:31:39.916Z",,"from_id","external_id","notes","to_id","id","spend"',
      ].join('\n'),
    },
  },  {
    args: {
      records: [
        {
          amount: 1,
          asset: 'BTC',
          category: 'payments',
          created_at: '2019-07-21T03:31:39.916Z',
          external_id: 'external_id',
          from_id: 'from_id',
          id: 'id',
          notes: 'notes',
          to_id: 'to_id',
          type: 'spend',
        },
        {
          amount: 1,
          asset: 'BTC',
          category: 'payments',
          created_at: '2019-07-20T03:31:39.916Z',
          external_id: 'external_id',
          from_id: 'from_id',
          id: 'id',
          notes: 'notes',
          to_id: 'to_id',
          type: 'spend',
        },
      ],
    },
    description: 'Categorize records out of order',
    expected: {
      payments: [
        {
          amount: 1,
          asset: 'BTC',
          category: 'payments',
          created_at: '2019-07-20T03:31:39.916Z',
          external_id: 'external_id',
          from_id: 'from_id',
          id: 'id',
          notes: 'notes',
          to_id: 'to_id',
          type: 'spend',
        },
        {
          amount: 1,
          asset: 'BTC',
          category: 'payments',
          created_at: '2019-07-21T03:31:39.916Z',
          external_id: 'external_id',
          from_id: 'from_id',
          id: 'id',
          notes: 'notes',
          to_id: 'to_id',
          type: 'spend',
        },
      ],
      payments_csv: [
        '"Amount","Asset","Date & Time","Fiat Amount","From ID","Network ID","Notes","To ID","Transaction ID","Type"',
        '1,"BTC","2019-07-20T03:31:39.916Z",,"from_id","external_id","notes","to_id","id","spend"',
        '1,"BTC","2019-07-21T03:31:39.916Z",,"from_id","external_id","notes","to_id","id","spend"',
      ].join('\n'),
    },
  },
  {
    args: {},
    description: 'Records are required',
    error: 'ExpectedRecordsArrayToCategorize',
  },
];

tests.forEach(({args, description, error, expected}) => {
  return test(description, async ({end, equal, strictSame, throws}) => {
    if (!!error) {
      throws(() => categorizeRecords(args), new Error(error), 'Got error');
    } else {
      const categorized = await categorizeRecords(args);

      strictSame(categorized.payments, expected.payments, 'Categorized records');
      equal(categorized.payments_csv, expected.payments_csv, 'Categorize csv');
    }

    return end();
  });
});
