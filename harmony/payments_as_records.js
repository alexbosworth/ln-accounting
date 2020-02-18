const {parsePaymentRequest} = require('ln-service');

const {categories} = require('./harmony');
const {types} = require('./harmony');

/** Payment as Harmony records

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
    public_key: <Node Public Key Hex String>
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
module.exports = args => {
  // Only look at payments where funds were sent
  const payRecords = args.payments.map(payment => {
    const isToSelf = payment.destination === args.public_key;
    const {request} = payment;

    let parsed;

    try {
      parsed = !request ? null : parsePaymentRequest({request});
    } catch (err) {
      // Ignore payment requests that cannot be parsed
      parsed = null;
    }

    const notes = !!parsed ? parsed.description : payment.secret;
    const selfTag = !!isToSelf ? '[To Self]' : String();

    return {
      amount: -payment.tokens,
      category: categories.payments,
      created_at: payment.created_at,
      id: payment.id,
      notes: `${selfTag} ${notes}`.trim(),
      to_id: payment.destination,
      type: types.spend,
    };
  });

  const feeRecords = args.payments
    .filter(({fee}) => !!fee)
    .map(payment => {
      const isToSelf = payment.destination === args.public_key;

      return {
        amount: -payment.fee,
        category: categories.payments,
        created_at: payment.created_at,
        id: `${payment.id}:fee`,
        notes: !!isToSelf ? 'Circular payment routing fee' : 'Routing fee',
        type: types.network_fee,
      };
    });

  const records = [].concat(payRecords).concat(feeRecords);

  return {records};
};
