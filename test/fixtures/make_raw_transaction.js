const {p2wpkhOutputScript} = require('@alexbosworth/blockchain');
const {transactionFromComponents} = require('@alexbosworth/blockchain');

const bufferAsHex = buffer => buffer.toString('hex');
const hashByteLength = 20;
const idByteLength = 32;
const locktime = 0;
const sequence = 0xffffffff;
const version = 2;
const vout = 0;

/** Make a raw transaction, paying to a P2WPKH script when none is given

  {
    [inputs]: [{
      id: <Spending Transaction Id Hex String>
      vout: <Spending Transaction Output Index Number>
    }]
    outputs: [{
      [script]: <Output Script Hex String>
      tokens: <Output Tokens Number>
    }]
  }

  @returns
  {
    transaction: <Raw Transaction Hex String>
  }
*/
module.exports = ({inputs, outputs}) => {
  const hash = Buffer.alloc(hashByteLength);
  const id = bufferAsHex(Buffer.alloc(idByteLength));

  const script = bufferAsHex(p2wpkhOutputScript({hash}).script);
  const spends = inputs || [{id, vout}];

  return transactionFromComponents({
    locktime,
    version,
    inputs: spends.map(input => ({
      sequence,
      id: input.id,
      script: String(),
      vout: input.vout,
    })),
    outputs: outputs.map(output => ({
      script: output.script || script,
      tokens: output.tokens,
    })),
  });
};
