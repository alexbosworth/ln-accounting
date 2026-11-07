/** Outputs of closed channels that have values known from channel data

  {
    channels: [{
      [anchor_tokens]: <Anchor Output Value Tokens Number>
      [anchor_vout]: <Anchor Output Index Number>
      [close_balance_tokens]: <Channel Balance Output Value Tokens Number>
      [close_balance_vout]: <Channel Balance Close Tx Output Index Number>
      close_payments: [{
        tokens: <Associated Tokens Number>
        transaction_id: <Transaction Id Hex String>
        transaction_vout: <Transaction Output Index Number>
      }]
      [close_transaction_id]: <Closing Transaction Id Hex String>
    }]
  }

  @returns
  {
    outputs: [{
      tokens: <Output Value Tokens Number>
      transaction_id: <Transaction Id Hex String>
      transaction_vout: <Transaction Output Index Number>
    }]
  }
*/
module.exports = ({channels}) => {
  const outputs = [];

  channels.filter(n => !!n.close_transaction_id).forEach(channel => {
    const id = channel.close_transaction_id;

    // The anchor output value is known when the anchor output was resolved
    if (!!channel.anchor_tokens) {
      outputs.push({
        tokens: channel.anchor_tokens,
        transaction_id: id,
        transaction_vout: channel.anchor_vout,
      });
    }

    // The balance output value is known when the balance output was swept
    if (!!channel.close_balance_tokens) {
      outputs.push({
        tokens: channel.close_balance_tokens,
        transaction_id: id,
        transaction_vout: channel.close_balance_vout,
      });
    }

    // HTLC outputs have their values and outpoints in the close payments
    channel.close_payments.forEach(payment => {
      outputs.push({
        tokens: payment.tokens,
        transaction_id: payment.transaction_id,
        transaction_vout: payment.transaction_vout,
      });
    });

    return;
  });

  return {outputs};
};
