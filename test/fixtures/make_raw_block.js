const {numberAsCompactInt} = require('@alexbosworth/blockchain');

const bufferAsHex = buffer => buffer.toString('hex');
const encodeCount = number => numberAsCompactInt({number}).encoded;
const headerByteLength = 80;
const hexAsBuffer = hex => Buffer.from(hex, 'hex');
const timeOffset = 68;

/** Make a raw block of transactions

  {
    time: <Block Time Epoch Seconds Number>
    transactions: [<Raw Transaction Hex String>]
  }

  @returns
  {
    block: <Raw Block Hex String>
    header: <Raw Block Header Hex String>
  }
*/
module.exports = ({time, transactions}) => {
  const header = Buffer.alloc(headerByteLength);

  header.writeUInt32LE(time, timeOffset);

  const elements = [header, encodeCount(transactions.length)];

  const block = Buffer.concat(elements.concat(transactions.map(hexAsBuffer)));

  return {block: bufferAsHex(block), header: bufferAsHex(header)};
};
