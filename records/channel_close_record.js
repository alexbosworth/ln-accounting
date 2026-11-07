const {componentsOfTransaction} = require('@alexbosworth/blockchain');

const sumOf = arr => arr.reduce((sum, n) => sum + n, Number());

/** Channel close fee record derived from the raw closing transaction

  {
    channel: {
      capacity: <Channel Capacity Tokens Number>
    }
    transaction: {
      [block_id]: <Block Id Hex String>
      [confirmation_count]: <Confirmation Count Number>
      [confirmation_height]: <Confirmation Height Number>
      created_at: <Created At ISO 8601 Date String>
      [description]: <Transaction Label String>
      id: <Transaction Id Hex String>
      is_confirmed: <Is Confirmed Bool>
      output_addresses: [<Output Address String>]
      transaction: <Raw Transaction Hex String>
    }
  }

  @throws
  <Error>

  @returns
  {
    record: {
      [block_id]: <Block Id Hex String>
      [confirmation_count]: <Confirmation Count Number>
      [confirmation_height]: <Confirmation Height Number>
      created_at: <Created At ISO 8601 Date String>
      description: <Record Description String>
      fee: <Close Fee Tokens Number>
      id: <Transaction Id Hex String>
      is_confirmed: <Is Confirmed Bool>
      is_outgoing: <Is Outgoing Bool>
      output_addresses: [<Output Address String>]
      tokens: <Close Fee Tokens Number>
      transaction: <Raw Transaction Hex String>
    }
  }
*/
module.exports = ({channel, transaction}) => {
  if (!channel || channel.capacity === undefined) {
    throw new Error('ExpectedChannelCapacityToDeriveChannelCloseRecord');
  }

  if (!transaction || !transaction.transaction) {
    throw new Error('ExpectedRawClosingTransactionToDeriveCloseRecord');
  }

  const tx = transaction;

  const {outputs} = componentsOfTransaction({transaction: tx.transaction});

  // The closing transaction spends the funding output of the channel
  const fee = channel.capacity - sumOf(outputs.map(n => n.tokens));

  const label = !tx.description ? '' : `: ${tx.description}`;

  return {
    record: {
      fee,
      block_id: tx.block_id,
      confirmation_count: tx.confirmation_count,
      confirmation_height: tx.confirmation_height,
      created_at: tx.created_at,
      description: `Channel close${label}`,
      id: tx.id,
      is_confirmed: tx.is_confirmed,
      is_outgoing: true,
      output_addresses: tx.output_addresses,
      tokens: fee,
      transaction: tx.transaction,
    },
  };
};
