const {test} = require('tap');

const {chainReceivesAsRecords} = require('./../../harmony');

const date = new Date().toISOString();

const tests = [
  {
    args: {
      channel_transaction_ids: ['funding_tx'],
      transactions: [
        {
          created_at: new Date().toISOString(),
          id: 'funding_tx',
          is_confirmed: true,
          is_outgoing: true,
          output_addresses: ['out_address'],
          tokens: 1,
        },
        {
          created_at: date,
          id: 'id',
          is_confirmed: true,
          is_outgoing: false,
          output_addresses: ['address'],
          tokens: 1,
        },
      ]
    },
    description: 'Chain receives as records',
    expected: {
      records: [{
        amount: 1,
        category: 'chain_receives',
        created_at: date,
        id: 'id',
        notes: 'Outputs to address',
        type: 'transfer:deposit',
      }],
    },
  },
];

tests.forEach(({args, description, expected}) => {
  return test(description, ({deepIs, end, equal}) => {
    const {records} = chainReceivesAsRecords(args);

    deepIs(records, expected.records, 'Fees formatted as records');

    return end();
  });
});
