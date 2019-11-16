const {categories} = require('./harmony');
const {types} = require('./harmony');

/** Chain sends as records

  {
    channel_transaction_ids: [<Channel Chain Transaction Id Hex String>]
    transactions: [{
      created_at: <Chain Transaction Created At ISO 8601 Date String>
      fee: <Chain Transaction Fee Tokens Number>
      id: <Chain Transaction Id Hex String>
      is_confirmed: <Chain Transaction is Confirmed Bool>
      is_outgoing: <Chain Transaction is Outgoing Bool>
      output_addresses: [<Output Address String>]
      tokens: <Chain Transaction Tokens Number>
    }]
  }

  @throws
  <Error>

  @returns
  {
    channel_transaction_ids: [<Channel Transaction Id Hex String>]
  }
*/
module.exports = args => {
  const records = args.transactions
    .filter(tx => !!tx.is_confirmed && !!tx.tokens && !!tx.is_outgoing)
    .filter(({id}) => !args.channel_transaction_ids.find(n => n === id))
    .map(tx => ({
      amount: -(tx.tokens - tx.fee),
      category: categories.chain_sends,
      created_at: tx.created_at,
      id: tx.id,
      notes: `Outputs to ${tx.output_addresses.join(' ')}`,
      type: types.withdraw,
    }));

  return {records};
};
