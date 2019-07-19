const {test} = require('tap');

const {forwardsAsRecords} = require('./../../harmony');

const date = new Date().toISOString();

const tests = [
  {
    args: {
      forwards: [{
        created_at: date,
        fee: 1,
        incoming_channel: 'incoming',
        outgoing_channel: 'outgoing',
        tokens: 2,
      }]
    },
    description: 'Forwards as records',
    expected: {
      records: [{
        amount: 1,
        category: 'forwards',
        created_at: date,
        from_id: 'incoming',
        notes: '2',
        to_id: 'outgoing',
        type: 'income',
      }],
    },
  },
];

tests.forEach(({args, description, expected}) => {
  return test(description, ({deepIs, end, equal}) => {
    const {records} = forwardsAsRecords(args);

    deepIs(records, expected.records, 'Forwards formatted as records');

    return end();
  });
});
