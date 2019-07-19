const {test} = require('tap');

const {chainSendsAsRecords} = require('./../../harmony');

const date = new Date().toISOString();

const tests = [
  {
    args: {
      channel_transaction_ids: ['funding_tx'],
      transactions: [
        {
          created_at: new Date().toISOString(),
          fee: 1,
          id: 'funding_tx',
          is_confirmed: true,
          is_outgoing: true,
          output_addresses: ['out_address'],
          tokens: 2,
        },
        {
          created_at: date,
          fee: 1,
          id: 'id',
          is_confirmed: true,
          is_outgoing: true,
          output_addresses: ['address'],
          tokens: 2,
        },
      ]
    },
    description: 'Chain sends as records',
    expected: {
      records: [{
        amount: -1,
        category: 'chain_sends',
        created_at: date,
        id: 'id',
        notes: 'Outputs to address',
        type: 'transfer:withdraw',
      }],
    },
  },
];

tests.forEach(({args, description, expected}) => {
  return test(description, ({deepIs, end, equal}) => {
    const {records} = chainSendsAsRecords(args);

    deepIs(records, expected.records, 'Fees formatted as records');

    return end();
  });
});
