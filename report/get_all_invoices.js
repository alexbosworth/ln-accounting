const asyncUntil = require('async/until');
const {getInvoices} = require('ln-service');

/** Get all invoices

  {
    lnd: <Authenticated LND gRPC API Object>
  }

  @returns via cbk
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
module.exports = ({lnd}, cbk) => {
  if (!lnd) {
    return cbk([400, 'ExpectedLndToGetAllInvoices']);
  }

  const invoices = [];
  let next;

  // Iterate through invoice pages until all invoices are collected
  return asyncUntil(
    cbk => cbk(null, next === false),
    cbk => {
      return getInvoices({lnd, token: next}, (err, res) => {
        if (!!err) {
          return cbk(err);
        }

        next = res.next || false;

        res.invoices.forEach(invoice => invoices.push(invoice));

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
};
