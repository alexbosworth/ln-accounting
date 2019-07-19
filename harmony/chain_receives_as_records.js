const {categories} = require('./harmony');
const {types} = require('./harmony');

const {isArray} = Array;

/** Chain receives as records

  {
    channel_transaction_ids: [<Transaction Id Hex String>]
    transactions: [{
      created_at: <Transaction Created At ISO 8601 Date String>
      id: <Transaction Id Hex String>
      is_confirmed: <Transaction Is Confirmed Bool>
      is_outgoing: <Transaction Is Outgoing Bool>
      output_addresses: [<Output Address String>]
      tokens: <Transaction Tokens Number>
    }]
  }

  @throws
  <Error>

  @returns
  {
    records: [{
      amount: <Tokens Amount Number>
      category: <Record Category String>
      created_at: Record Created At ISO 8601 Date String>
      id: <Record Id Hex String>
      notes: <Record Notes String>
      type: <Record Type String>
    }]
  }
*/
module.exports = args => {
  if (!args) {
    throw new Error('ExpectedArgumentsToMapReceiveRecords');
  }

  if (!isArray(args.channel_transaction_ids)) {
    throw new Error('ExpectedChannelTransactionIdsArrayToMapReceiveRecords');
  }

  if (!isArray(args.transactions)) {
    throw new Error('ExpectedTransactionsArrayToMapToReceiveRecords');
  }

  const records = args.transactions
    .filter(tx => !!tx.is_confirmed && !!tx.tokens && !tx.is_outgoing)
    .filter(({id}) => !args.channel_transaction_ids.find(n => n === id))
    .map(tx => ({
      amount: tx.tokens,
      category: categories.chain_receives,
      created_at: tx.created_at,
      id: tx.id,
      notes: `Outputs to ${tx.output_addresses.join(' ')}`,
      type: types.deposit,
    }));

  return {records};
};