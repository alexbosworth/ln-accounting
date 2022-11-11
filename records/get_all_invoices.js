const asyncAuto = require('async/auto');
const asyncUntil = require('async/until');
const {getInvoices} = require('ln-service');
const {returnResult} = require('asyncjs-util');

const limit = 1000;

/** Get all confirmed invoices

  {
    [after]: <Invoices Confirmed After ISO 8601 Date String>
    [before]: <Invoices Confirmed Before ISO 8601 Date String>
    lnd: <Authenticated LND API Object>
  }

  @returns via cbk or Promise
  {
    invoices: [{
      chain_address: <Fallback Chain Address String>
      [confirmed_at]: <Settled at ISO 8601 Date String>
      created_at: <ISO 8601 Date String>
      description: <Description String>
      description_hash: <Description Hash Hex String>
      expires_at: <ISO 8601 Date String>
      id: <Payment Hash String>
      [is_canceled]: <Invoice is Canceled Bool>
      is_confirmed: <Invoice is Confirmed Bool>
      [is_held]: <HTLC is Held Bool>
      is_outgoing: <Invoice is Outgoing Bool>
      is_private: <Invoice is Private Bool>
      received: <Received Tokens Number>
      received_mtokens: <Received Millitokens String>
      request: <Bolt 11 Invoice String>
      routes: [[{
        base_fee_mtokens: <Base Routing Fee In Millitokens Number>
        channel: <Standard Format Channel Id String>
        cltv_delta: <CLTV Blocks Delta Number>
        fee_rate: <Fee Rate In Millitokens Per Million Number>
        public_key: <Public Key Hex String>
      }]]
      secret: <Secret Preimage Hex String>
      tokens: <Tokens Number>
    }]
  }
*/
module.exports = ({after, before, lnd}, cbk) => {
  return new Promise((resolve, reject) => {
    return asyncAuto({
      // Check arguments
      validate: cbk => {
        if (!lnd) {
          return cbk([400, 'ExpectedLndToGetAllInvoices']);
        }

        return cbk();
      },

      // Get all the invoices through iterative paging
      getInvoices: ['validate', ({}, cbk) => {
        const invoices = [];
        let token;

        // Iterate through invoice pages until all invoices are collected
        return asyncUntil(
          cbk => cbk(null, token === false),
          cbk => {
            return getInvoices({
              lnd,
              token,
              limit: !token ? limit : undefined,
            },
            (err, res) => {
              if (!!err) {
                return cbk(err);
              }

              token = res.next || false;

              res.invoices
                .filter(n => !!n.confirmed_at && !!n.is_confirmed)
                .filter(invoice => {
                  if (!!after && invoice.confirmed_at <= after) {
                    return false;
                  }

                  if (!!before && invoice.confirmed_at > before) {
                    return false;
                  }

                  return true;
                })
                .forEach(invoice => invoices.push(invoice));

              return cbk(null, invoices);
            });
          },
          err => {
            if (!!err) {
              return cbk(err);
            }

            return cbk(null, {invoices});
          }
        );
      }],
    },
    returnResult({reject, resolve, of: 'getInvoices'}, cbk));
  });
};
