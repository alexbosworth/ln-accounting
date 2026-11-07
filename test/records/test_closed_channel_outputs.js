const {deepEqual} = require('node:assert').strict;
const test = require('node:test');

const closedChannelOutputs = require('./../../records/closed_channel_outputs');

const tests = [
  {
    args: {
      channels: [
        {
          anchor_tokens: 330,
          anchor_vout: 2,
          close_balance_tokens: 3000,
          close_balance_vout: 1,
          close_payments: [
            {tokens: 1000, transaction_id: 'htlc', transaction_vout: 0},
          ],
          close_transaction_id: 'close',
        },
        // Channels without a close transaction are ignored
        {close_payments: [], close_transaction_id: undefined},
        // Unresolved anchor and balance outputs have no known value
        {close_payments: [], close_transaction_id: 'other'},
      ],
    },
    description: 'Closed channel outputs are derived from channel data',
    expected: {
      outputs: [
        {tokens: 330, transaction_id: 'close', transaction_vout: 2},
        {tokens: 3000, transaction_id: 'close', transaction_vout: 1},
        {tokens: 1000, transaction_id: 'htlc', transaction_vout: 0},
      ],
    },
  },
  {
    args: {channels: []},
    description: 'No closed channels means no known outputs',
    expected: {outputs: []},
  },
];

tests.forEach(({args, description, expected}) => {
  return test(description, (t, end) => {
    deepEqual(closedChannelOutputs(args), expected, 'Got expected outputs');

    return end();
  });
});
