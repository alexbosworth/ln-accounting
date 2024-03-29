const {deepEqual} = require('node:assert').strict;
const {rejects} = require('node:assert').strict;
const test = require('node:test');

const {getAllInvoices} = require('./../../records');

const tests = [
  {
    args: {},
    description: 'LND is required',
    error: [400, 'ExpectedLndToGetAllInvoices'],
  },
  {
    args: {lnd: {default: {listInvoices: ({}, cbk) => cbk('err')}}},
    description: 'Errors from LND are passed back',
    error: [503, 'UnexpectedGetInvoicesError', {err: 'err'}],
  },
  {
    args: {
      lnd: {
        default: {
          listInvoices: (args, cbk) => {
            if (!!args.index_offset) {
              return cbk(null, {
                first_index_offset: '1',
                invoices: [],
                last_index_offset: '1',
              });
            }

            return cbk(null, {
              first_index_offset: '2',
              invoices: [{
                add_index: '0',
                amt_paid_msat: '1000',
                amt_paid_sat: '1',
                cltv_expiry: 1,
                creation_date: 1,
                description_hash: Buffer.alloc(32),
                expiry: 1,
                features: {},
                htlcs: [],
                memo: '',
                payment_addr: Buffer.alloc(32),
                payment_request: 'request',
                private: false,
                r_hash: Buffer.alloc(32),
                r_preimage: Buffer.alloc(32),
                settle_date: 1,
                settled: true,
                state: 'SETTLED',
                value: '1',
                value_msat: '1000',
              }],
              last_index_offset: '5',
            });
          },
        },
      },
    },
    description: 'Invoices are returned',
    expected: {
      invoices: [{
        chain_address: undefined,
        cltv_delta: 1,
        confirmed_at: '1970-01-01T00:00:01.000Z',
        confirmed_index: undefined,
        created_at: '1970-01-01T00:00:01.000Z',
        description: '',
        description_hash: '0000000000000000000000000000000000000000000000000000000000000000',
        expires_at: '1970-01-01T00:00:02.000Z',
        features: [],
        id: '0000000000000000000000000000000000000000000000000000000000000000',
        index: 0,
        is_canceled: undefined,
        is_confirmed: true,
        is_held: undefined,
        is_private: false,
        is_push: undefined,
        mtokens: '1000',
        payment: undefined,
        payments: [],
        received: 1,
        received_mtokens: '1000',
        request: 'request',
        secret: '0000000000000000000000000000000000000000000000000000000000000000',
        tokens: 1,
      }],
    },
  },
];

tests.forEach(({args, description, error, expected}) => {
  return test(description, async () => {
    if (!!error) {
      await rejects(getAllInvoices(args), error, 'Got expected error');
    } else {
      const {invoices} = await getAllInvoices(args);

      deepEqual(invoices, expected.invoices, 'Got expected result');
    }

    return;
  });
});
