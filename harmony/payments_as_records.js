const {parsePaymentRequest} = require('ln-service');

const {categories} = require('./harmony');
const {types} = require('./harmony');

/** Payment as harmony records

  {
    payments: [{
      created_at: <Payment at ISO 860 Date String>
      destination: <Destination Public Key Hex String>
      fee: <Routing Fee Tokens Number>
      id: <Payment Hash Hex String>
      [request]: <BOLT 11 Payment Request String>
      secret: <Payment Preimage Hex String>
      tokens: <Paid Tokens Number>
    }]
  }

  @throws <Error>

  @returns
  {
    records: [{
      amount: <Tokens Number>
      category: <Category String>
      created_at: <Record Created At ISO 8601 Date String>
      id: <Payment Hash Hex String>
      notes: <Payment Notes String>
      [to_id]: <Paid to Destination String>
      type: <Record Type String>
    }]
  }
*/
module.exports = ({payments}) => {
  // Only look at payments where funds were sent
  const payRecords = payments.map(payment => {
    const {request} = payment;

    let parsed;

    try {
      parsed = !request ? null : parsePaymentRequest({request});
    } catch (err) {
      // Ignore payment requests that cannot be parsed
      parsed = null;
    }

    return {
      amount: -payment.tokens,
      category: categories.payments,
      created_at: payment.created_at,
      id: payment.id,
      notes: !parsed ? payment.secret : parsed.description,
      to_id: payment.destination,
      type: types.spend,
    };
  });

  const feeRecords = payments
    .filter(({fee}) => !!fee)
    .map(payment => ({
      amount: -payment.fee,
      category: categories.payments,
      created_at: payment.created_at,
      id: `${payment.id}:fee`,
      notes: `Routing fee`,
      type: types.network_fee,
    }));

  const records = [].concat(payRecords).concat(feeRecords);

  return {records};
};
