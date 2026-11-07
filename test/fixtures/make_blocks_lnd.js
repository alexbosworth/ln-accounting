const blockNotFound = '-5: Block not found';
const hexAsBuffer = hex => Buffer.from(hex, 'hex');
const idByteLength = 32;

/** Make an LND that serves raw blocks and raw block headers by height

  {
    [blocks]: {
      <Block Height Number>: <Raw Block Hex String>
    }
    [headers]: {
      <Block Height Number>: <Raw Block Header Hex String>
    }
  }

  @returns
  <Authenticated LND API Object>
*/
module.exports = ({blocks, headers}) => ({
  blocks: {
    getBlock: (req, cbk) => {
      const block = (blocks || {})[req.block_hash.readUInt32BE()];

      if (!block) {
        return cbk({details: blockNotFound});
      }

      return cbk(null, {raw_block: hexAsBuffer(block)});
    },
    getBlockHash: (req, cbk) => {
      const id = Buffer.alloc(idByteLength);

      // The id of a block holds its height, so blocks are found by height
      id.writeUInt32BE(req.block_height);

      return cbk(null, {block_hash: id});
    },
    getBlockHeader: (req, cbk) => {
      const header = (headers || {})[req.block_hash.readUInt32BE()];

      if (!header) {
        return cbk({details: blockNotFound});
      }

      return cbk(null, {raw_block_header: hexAsBuffer(header)});
    },
  },
});
