const formattedNotes = require('./formatted_notes');

const centsPerDollar = 100;
const {isArray} = Array;
const tokPerBigTok = 1e8;

/** Records with fiat values

  {
    currency: <Fiat Currency String>
    fiat: [{
      cents: <Price of Big Tokens in Cents Number>
      date: <Price Quote for ISO 8601 Date String>
    }]
    records: [{
      amount: <Amount Tokens Number>
      category: <Record Category Type String>
      created_at: <Record Created At ISO 8601 Date String>
      [external_id]: <Record External Id String>
      [from_id]: <From Id String>
      id: <Record Id String>
      [notes]: <Record Notes String>
      [to_id]: <To Id String>
      type: <Record Type String>
    }]
  }

  @throws
  <Error>

  @returns
  {
    records: [{
      amount: <Amount Tokens Number>
      asset: <Asset Type String>
      category: <Record Category Type String>
      created_at: <Record Created At ISO 8601 Date String>
      [external_id]: <Record External Id String>
      fiat_amount: <Fiat Amount Number>
      [from_id]: <From Id String>
      id: <Record Id String>
      [notes]: <Record Notes String>
      [to_id]: <To Id String>
      type: <Record Type String>
    }]
  }
*/
module.exports = ({currency, fiat, records}) => {
  if (!isArray(records)) {
    throw new Error('ExpectedArrayOfRecordsToMapToFiatRecords');
  }

  const recordsWithFiat = records.map(record => {
    const amount = record.amount || 0;
    const {cents} = fiat.find(n => n.date === record.created_at);

    return {
      amount,
      asset: currency,
      category: record.category,
      created_at: record.created_at,
      external_id: record.external_id || '',
      fiat_amount: amount * cents / tokPerBigTok / centsPerDollar,
      from_id: record.from_id || '',
      id: record.id || '',
      notes: formattedNotes({notes: record.notes}).notes,
      to_id: record.to_id || '',
      type: record.type,
    };
  });

  return {records: recordsWithFiat};
};
