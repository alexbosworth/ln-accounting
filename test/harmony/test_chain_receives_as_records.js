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
  {
    args: null,
    description: 'Arguments expected',
    error: 'ExpectedArgumentsToMapReceiveRecords',
  },
  {
    args: {},
    description: 'Channel transaction ids array expected',
    error: 'ExpectedChannelTransactionIdsArrayToMapReceiveRecords',
  },
  {
    args: {channel_transaction_ids: []},
    description: 'Transaction info array expected',
    error: 'ExpectedTransactionsArrayToMapToReceiveRecords',
  },
];

tests.forEach(({args, description, error, expected}) => {
  return test(description, ({deepIs, end, equal, throws}) => {
    if (!!error) {
      throws(() => chainReceivesAsRecords(args), new Error(error), 'Got err');
    } else {
      const {records} = chainReceivesAsRecords(args);

      deepIs(records, expected.records, 'Fees formatted as records');
    }

    return end();
  });
});
