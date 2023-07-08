const {deepEqual} = require('node:assert').strict;
const {rejects} = require('node:assert').strict;
const test = require('node:test');

const {getAllPayments} = require('./../../records');

const tests = [
  {
    args: {},
    description: 'LND is required',
    error: [400, 'ExpectedLndToGetAllPayments'],
  },
  {
    args: {lnd: {default: {listPayments: ({}, cbk) => cbk('err')}}},
    description: 'Errors from LND are passed back',
    error: [503, 'UnexpectedGetPaymentsError', {err: 'err'}],
  },
  {
    args: {
      lnd: {
        default: {
          listPayments: (args, cbk) => {
            if (!!args.index_offset) {
              return cbk(null, {
                first_index_offset: '1',
                payments: [],
                last_index_offset: '1',
              });
            }

            return cbk(null, {
              first_index_offset: '2',
              payments: [{
                creation_date: '1',
                creation_time_ns: '0',
                failure_reason: 'FAILURE_REASON_TIMEOUT',
                fee_msat: '1000',
                fee_sat: '1',
                htlcs: [{
                  attempt_time_ns: '1000000',
                  failure: {
                    channel_update: {
                      base_fee: '1000',
                      chain_hash: Buffer.alloc(32),
                      chan_id: '1',
                      channel_flags: 1,
                      extra_opaque_data: Buffer.alloc(1),
                      fee_rate: 1,
                      htlc_maximum_msat: '1000',
                      htlc_minimum_msat: '1000',
                      message_flags: 1,
                      signature: Buffer.alloc(71),
                      time_lock_delta: 1,
                      timestamp: 1,
                    },
                    code: 'UNREADABLE_FAILURE',
                    failure_source_index1: 1,
                    height: 1,
                    htlc_msat: '1000',
                  },
                  resolve_time_ns: '1000000',
                  route: {
                    hops: [
                      {
                        amt_to_forward_msat: '1000',
                        chan_id: '1',
                        chan_capacity: 1,
                        expiry: 1,
                        fee_msat: '1000',
                        mpp_record: {
                          payment_addr: Buffer.alloc(32),
                          total_amt_msat: '1000',
                        },
                        pub_key: Buffer.alloc(33).toString('hex'),
                        tlv_payload: true,
                      },
                      {
                        amt_to_forward_msat: '1000',
                        chan_id: '1',
                        chan_capacity: 1,
                        expiry: 1,
                        fee_msat: '1000',
                        mpp_record: {
                          payment_addr: Buffer.alloc(32),
                          total_amt_msat: '1000',
                        },
                        pub_key: Buffer.alloc(33).toString('hex'),
                        tlv_payload: true,
                      },
                    ],
                    total_amt: '1',
                    total_amt_msat: '1000',
                    total_fees: '1',
                    total_fees_msat: '1000',
                    total_time_lock: 1,
                  },
                  status: 'FAILED',
                }],
                path: [Buffer.alloc(33).toString('hex'), Buffer.alloc(33).toString('hex')],
                payment_hash: Buffer.alloc(32).toString('hex'),
                payment_index: '1',
                payment_preimage: Buffer.alloc(32, 1).toString('hex'),
                payment_request: 'lntb1500n1pdn4czkpp5ugdqer05qrrxuchrzkcue94th9w2xzasp9qm7d0yxcgp4uh4kn4qdpa2fjkzep6yprkcmmzv9kzqsmj09c8gmmrw4e8yetwvdujq5n9va6kcct5d9hkucqzysdlghdpua7uvjjkcfj49psxtlqzkp5pdncffdfk2cp3mp76thrl29qhqgzufm503pjj96586n5w6edgw3n66j4rxxs707y4zdjuhyt6qqe5weu4',
                status: 'SUCCEEDED',
                value: '1',
                value_msat: '1000',
                value_sat: '1',
              }],
              last_index_offset: '5',
            });
          },
        },
      },
    },
    description: 'Payments are returned',
    expected: {
      payments: [{
        attempts: [{
          confirmed_at: undefined,
          created_at: '1970-01-01T00:00:00.001Z',
          failed_at: '1970-01-01T00:00:00.001Z',
          is_confirmed: false,
          is_failed: true,
          is_pending: false,
          route: {
            fee: 1,
            fee_mtokens: '1000',
            hops: [
              {
                channel: '0x0x1',
                channel_capacity: 1,
                fee: 1,
                fee_mtokens: '1000',
                forward: 1,
                forward_mtokens: '1000',
                public_key: Buffer.alloc(33).toString('hex'),
                timeout: 1,
              },
              {
                channel: '0x0x1',
                channel_capacity: 1,
                fee: 1,
                fee_mtokens: '1000',
                forward: 1,
                forward_mtokens: '1000',
                public_key: Buffer.alloc(33).toString('hex'),
                timeout: 1,
              },
            ],
            mtokens: '1000',
            payment: Buffer.alloc(32).toString('hex'),
            timeout: 1,
            tokens: 1,
            total_mtokens: '1000',
          },
        }],
        confirmed_at: undefined,
        created_at: '1970-01-01T00:00:01.000Z',
        destination: Buffer.alloc(33).toString('hex'),
        fee: 1,
        fee_mtokens: '1000',
        hops: [Buffer.alloc(33).toString('hex')],
        id: Buffer.alloc(32).toString('hex'),
        index: 1,
        is_confirmed: true,
        is_outgoing: true,
        mtokens: '1000',
        request: 'lntb1500n1pdn4czkpp5ugdqer05qrrxuchrzkcue94th9w2xzasp9qm7d0yxcgp4uh4kn4qdpa2fjkzep6yprkcmmzv9kzqsmj09c8gmmrw4e8yetwvdujq5n9va6kcct5d9hkucqzysdlghdpua7uvjjkcfj49psxtlqzkp5pdncffdfk2cp3mp76thrl29qhqgzufm503pjj96586n5w6edgw3n66j4rxxs707y4zdjuhyt6qqe5weu4',
        safe_fee: 1,
        safe_tokens: 1,
        secret: Buffer.alloc(32, 1).toString('hex'),
        tokens: 1,
      }],
    },
  },
  {
    args: {
      after: new Date().toISOString(),
      lnd: {
        default: {
          listPayments: (args, cbk) => {
            if (!!args.index_offset) {
              return cbk(null, {
                first_index_offset: '1',
                payments: [],
                last_index_offset: '1',
              });
            }

            return cbk(null, {
              first_index_offset: '2',
              payments: [{
                creation_date: '1',
                creation_time_ns: '0',
                failure_reason: 'FAILURE_REASON_TIMEOUT',
                fee_msat: '1000',
                fee_sat: '1',
                htlcs: [{
                  attempt_time_ns: '1000000',
                  failure: {
                    channel_update: {
                      base_fee: '1000',
                      chain_hash: Buffer.alloc(32),
                      chan_id: '1',
                      channel_flags: 1,
                      extra_opaque_data: Buffer.alloc(1),
                      fee_rate: 1,
                      htlc_maximum_msat: '1000',
                      htlc_minimum_msat: '1000',
                      message_flags: 1,
                      signature: Buffer.alloc(71),
                      time_lock_delta: 1,
                      timestamp: 1,
                    },
                    code: 'UNREADABLE_FAILURE',
                    failure_source_index1: 1,
                    height: 1,
                    htlc_msat: '1000',
                  },
                  resolve_time_ns: '1000000',
                  route: {
                    hops: [{
                      amt_to_forward_msat: '1000',
                      chan_id: '1',
                      chan_capacity: 1,
                      expiry: 1,
                      fee_msat: '1000',
                      mpp_record: {
                        payment_addr: Buffer.alloc(32),
                        total_amt_msat: '1000',
                      },
                      pub_key: Buffer.alloc(33).toString('hex'),
                      tlv_payload: true,
                    }],
                    total_amt: '1',
                    total_amt_msat: '1000',
                    total_fees: '1',
                    total_fees_msat: '1000',
                    total_time_lock: 1,
                  },
                  status: 'FAILED',
                }],
                path: [Buffer.alloc(33).toString('hex'), Buffer.alloc(33).toString('hex')],
                payment_hash: Buffer.alloc(32).toString('hex'),
                payment_index: '1',
                payment_preimage: Buffer.alloc(32).toString('hex'),
                payment_request: 'lntb1500n1pdn4czkpp5ugdqer05qrrxuchrzkcue94th9w2xzasp9qm7d0yxcgp4uh4kn4qdpa2fjkzep6yprkcmmzv9kzqsmj09c8gmmrw4e8yetwvdujq5n9va6kcct5d9hkucqzysdlghdpua7uvjjkcfj49psxtlqzkp5pdncffdfk2cp3mp76thrl29qhqgzufm503pjj96586n5w6edgw3n66j4rxxs707y4zdjuhyt6qqe5weu4',
                status: 'FAILED',
                value: '1',
                value_msat: '1000',
                value_sat: '1',
              }],
              last_index_offset: '5',
            });
          },
        },
      },
    },
    description: 'Payments are returned with after condition',
    expected: {payments: []},
  },
];

tests.forEach(({args, description, error, expected}) => {
  return test(description, async () => {
    if (!!error) {
      await rejects(getAllPayments(args), error, 'Got expected error');
    } else {
      const {payments} = await getAllPayments(args);

      deepEqual(payments, expected.payments, 'Got expected result');
    }

    return;
  });
});
