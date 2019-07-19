const {categories} = require('./harmony');
const {types} = require('./harmony');

/** Chain transactions as harmony records

  {
    transactions: [{
      created_at: <Transaction Created At ISO 8601 Date String>
      fee: <Fee Tokens Number>
      id: <Transaction Id Hex String>
      is_outgoing: <Transaction is Outgoing Bool>
    }]
  }

  @throws
  <Error>

  @returns
  {
    records: [{
      amount: <Amount Tokens Number>
      category: <Record Category String<>
      created_at: <Record Created At ISO 8601 Date String>
      id: <Record Id String>
      notes: <Notes String>
      type: <Type String>
    }]
  }
*/
module.exports = ({transactions}) => {
  const records = transactions
    .filter(tx => !!tx.fee && !!tx.is_outgoing)
    .map(tx => ({
      amount: -tx.fee,
      category: categories.chain_fees,
      created_at: tx.created_at,
      id: `${tx.id}:fee`,
      notes: 'On-chain fee',
      type: types.network_fee,
    }));

  return {records};
};
