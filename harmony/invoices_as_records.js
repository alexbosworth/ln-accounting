const {categories} = require('./harmony');
const {types} = require('./harmony');

const {isArray} = Array;

/** Invoices as accounting records

  {
    invoices: [{
      confirmed_at: <Invoice Confirmed at ISO 8601 Date String>
      created_at: <Invoice Created at ISO 8601 Date String>
      description: <Invoice Description String>
      id: <Invoice Payment Hash Hex String>
      is_confirmed: <Invoice is Confirmed Settled Bool>
      received: <Tokens Received Count Number>
    }]
  }

  @throws
  <Error>

  @returns
  {
    records: [{
      amount: <Amount of Tokens Received Number>
      category: <Record Category String>
      created_at: <Funds Received at ISO 8601 Date String>
      id: <Payment Preimage Hash Hex String>
      notes: <Record Description String>
      type: <Record Type String>
    }]
  }
*/
module.exports = ({invoices}) => {
  if (!isArray(invoices)) {
    throw new Error('ExpectedArrayOfInvoicesToMapToAccountingRecords');
  }

  // Only consider invoices where funds were received
  const records = invoices
    .filter(n => !!n.confirmed_at && !!n.is_confirmed && !!n.received)
    .map(invoice => ({
      amount: invoice.received,
      category: categories.invoices,
      created_at: invoice.confirmed_at,
      id: invoice.id,
      notes: `Invoice: ${invoice.description.replace(/,/gim, ' ')}`,
      type: types.income,
    }));

  return {records};
};
