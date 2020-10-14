const asyncAuto = require('async/auto');
const asyncUntil = require('async/until');
const {getPayments} = require('ln-service');
const {returnResult} = require('asyncjs-util');

const paymentsPagingLimit = 100;

/** Get all payments, with a date range restriction

  {
    after: <Payment Made On or After ISO 8601 Date String>
    lnd: <Authenticated LND API Object>
  }

  @returns via cbk or Promise
  {
    payments: [{
      attempts: [{
        [failure]: {
          code: <Error Type Code Number>
          [details]: {
            [channel]: <Standard Format Channel Id String>
            [height]: <Error Associated Block Height Number>
            [index]: <Failed Hop Index Number>
            [mtokens]: <Error Millitokens String>
            [policy]: {
              base_fee_mtokens: <Base Fee Millitokens String>
              cltv_delta: <Locktime Delta Number>
              fee_rate: <Fees Charged in Millitokens Per Million Number>
              [is_disabled]: <Channel is Disabled Bool>
              max_htlc_mtokens: <Maximum HLTC Millitokens Value String>
              min_htlc_mtokens: <Minimum HTLC Millitokens Value String>
              updated_at: <Updated At ISO 8601 Date String>
            }
            [timeout_height]: <Error CLTV Timeout Height Number>
            [update]: {
              chain: <Chain Id Hex String>
              channel_flags: <Channel Flags Number>
              extra_opaque_data: <Extra Opaque Data Hex String>
              message_flags: <Message Flags Number>
              signature: <Channel Update Signature Hex String>
            }
          }
          message: <Error Message String>
        }
        [index]: <Payment Add Index Number>
        is_confirmed: <Payment Attempt Succeeded Bool>
        is_failed: <Payment Attempt Failed Bool>
        is_pending: <Payment Attempt is Waiting For Resolution Bool>
        route: {
          fee: <Route Fee Tokens Number>
          fee_mtokens: <Route Fee Millitokens String>
          hops: [{
            channel: <Standard Format Channel Id String>
            channel_capacity: <Channel Capacity Tokens Number>
            fee: <Fee Number>
            fee_mtokens: <Fee Millitokens String>
            forward: <Forward Tokens Number>
            forward_mtokens: <Forward Millitokens String>
            [public_key]: <Forward Edge Public Key Hex String>
            [timeout]: <Timeout Block Height Number>
          }]
          mtokens: <Total Fee-Inclusive Millitokens String>
          [payment]: <Payment Identifier Hex String>
          timeout: <Timeout Block Height Number>
          tokens: <Total Fee-Inclusive Tokens Number>
          [total_mtokens]: <Total Millitokens String>
        }
      }]
      created_at: <Payment at ISO-8601 Date String>
      destination: <Destination Node Public Key Hex String>
      fee: <Paid Routing Fee Rounded Down Tokens Number>
      fee_mtokens: <Paid Routing Fee in Millitokens String>
      hops: [<First Route Hop Public Key Hex String>]
      id: <Payment Preimage Hash String>
      [index]: <Payment Add Index Number>
      is_confirmed: <Payment is Confirmed Bool>
      is_outgoing: <Transaction Is Outgoing Bool>
      mtokens: <Millitokens Sent to Destination String>
      [request]: <BOLT 11 Payment Request String>
      safe_fee: <Payment Forwarding Fee Rounded Up Tokens Number>
      safe_tokens: <Payment Tokens Rounded Up Number>
      secret: <Payment Preimage Hex String>
      tokens: <Rounded Down Tokens Sent to Destination Number>
    }]
  }
*/
module.exports = ({after, lnd}, cbk) => {
  return new Promise((resolve, reject) => {
    return asyncAuto({
      // Check arguments
      validate: cbk => {
        if (!lnd) {
          return cbk([400, 'ExpectedLndToGetAllPayments']);
        }

        return cbk();
      },

      // Iterate through payments pages
      getPayments: ['validate', ({}, cbk) => {
        let token;
        const payments = [];

        return asyncUntil(
          cbk => cbk(null, token === false),
          cbk => {
            const limit = !token ? paymentsPagingLimit : undefined;

            return getPayments({limit, lnd, token}, (err, res) => {
              if (!!err) {
                return cbk(err);
              }

              token = res.next || false;

              const withinDateRange = res.payments.filter(payment => {
                // When there is an after constraint, reject payments before
                if (!!after && payment.created_at < after) {
                  return false;
                }

                return true;
              });

              // Stop paging when there are older payments present in results
              if (withinDateRange.length !== res.payments.length) {
                token = false;
              }

              // Push payments within the date range into the found records
              withinDateRange
                .filter(n => n.is_confirmed)
                .forEach(n => payments.push(n));

              return cbk();
            });
          },
          err => cbk(err, payments)
        )
      }],

      // Final set of payments
      payments: ['getPayments', ({getPayments}, cbk) => {
        return cbk(null, {payments: getPayments});
      }],
    },
    returnResult({reject, resolve, of: 'payments'}, cbk));
  });
};
