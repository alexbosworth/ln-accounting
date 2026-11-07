const asyncAuto = require('async/auto');
const asyncify = require('async/asyncify');
const asyncTryEach = require('async/tryEach');
const {getBlockHeader} = require('ln-service');
const {idForBlock} = require('@alexbosworth/blockchain');
const {returnResult} = require('asyncjs-util');

const findTransactionInBlocks = require('./find_transaction_in_blocks');
const outputAddresses = require('./transaction_output_addresses');

const dateFromEpoch = epoch => new Date(epoch * 1e3).toISOString();
const headerHexLength = 160;
const headerTimeOffset = 68;
const hexAsBuffer = hex => Buffer.from(hex, 'hex');
const {isArray} = Array;

/** Get details of a transaction that is not known to the wallet

  {
    height: <Transaction Confirmed At Height Number>
    id: <Transaction Id Hex String>
    [known]: [{
      id: <Transaction Id Hex String>
      transaction: <Raw Transaction Hex String>
    }]
    lnd: <Authenticated LND API Object>
    [network]: <Network Name String>
  }

  @returns via cbk or Promise
  {
    block_id: <Block Id Hex String>
    confirmation_height: <Transaction Confirmed At Height Number>
    created_at: <Transaction Created At ISO 8601 Date String>
    id: <Transaction Id Hex String>
    is_confirmed: <Transaction Confirmed Bool>
    output_addresses: [<Transaction Output Address String>]
    transaction: <Raw Transaction Hex String>
  }
*/
module.exports = ({height, id, known, lnd, network}, cbk) => {
  return new Promise((resolve, reject) => {
    return asyncAuto({
      // Check arguments
      validate: cbk => {
        if (height === undefined) {
          return cbk([400, 'ExpectedHeightToGetExternalTransaction', {id}]);
        }

        if (!id) {
          return cbk([400, 'ExpectedTransactionIdToGetExternalTransaction']);
        }

        if (!!known && !isArray(known)) {
          return cbk([400, 'ExpectedArrayOfKnownTransactionsToGetExternalTx']);
        }

        if (!lnd) {
          return cbk([400, 'ExpectedLndToGetExternalTransaction']);
        }

        return cbk();
      },

      // The raw transaction when it is already known
      provided: ['validate', ({}, cbk) => {
        return cbk(null, (known || []).find(n => n.id === id));
      }],

      // Find the transaction in its block, or get the header when it is known
      find: ['provided', ({provided}, cbk) => {
        const search = cbk => findTransactionInBlocks({height, id, lnd}, cbk);

        // A known raw transaction is a fallback for when the search fails
        const fallback = cbk => getBlockHeader({height, lnd}, cbk);

        return asyncTryEach([search].concat(!provided ? [] : [fallback]), cbk);
      }],

      // The block header, the block height and the raw transaction
      found: ['find', 'provided', ({find, provided}, cbk) => {
        // Exit early when the transaction was found in a block
        if (!!find.transaction) {
          return cbk(null, {
            header: find.block.substring(Number(), headerHexLength),
            height: find.height,
            transaction: find.transaction,
          });
        }

        // The known raw transaction is trusted to be in the recorded block
        return cbk(null, {
          height,
          header: find.header,
          transaction: provided.transaction,
        });
      }],

      // Derive the output addresses of the transaction
      getAddresses: ['found', asyncify(({found}) => {
        try {
          return outputAddresses({network, transaction: found.transaction});
        } catch (err) {
          throw [503, 'FailedToDeriveExternalTransactionAddresses', {err}];
        }
      })],

      // Transaction details
      transaction: ['found', 'getAddresses', ({found, getAddresses}, cbk) => {
        const time = hexAsBuffer(found.header).readUInt32LE(headerTimeOffset);

        return cbk(null, {
          id,
          block_id: idForBlock({block: found.header}).id,
          confirmation_height: found.height,
          created_at: dateFromEpoch(time),
          is_confirmed: true,
          output_addresses: getAddresses.addresses,
          transaction: found.transaction,
        });
      }],
    },
    returnResult({reject, resolve, of: 'transaction'}, cbk));
  });
};
