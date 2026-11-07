const asyncAuto = require('async/auto');
const asyncify = require('async/asyncify');
const {getBlock} = require('ln-service');
const {queryTransactions} = require('@alexbosworth/blockchain');
const {returnResult} = require('asyncjs-util');

/** Get a transaction from the block at a height

  {
    height: <Block Height Number>
    id: <Transaction Id Hex String>
    lnd: <Authenticated LND API Object>
  }

  @returns via cbk or Promise
  {
    block: <Raw Block Hex String>
    height: <Block Height Number>
    transaction: <Raw Transaction Hex String>
  }
*/
module.exports = ({height, id, lnd}, cbk) => {
  return new Promise((resolve, reject) => {
    return asyncAuto({
      // Check arguments
      validate: cbk => {
        if (height === undefined) {
          return cbk([400, 'ExpectedHeightToGetTransactionInBlock']);
        }

        if (!id) {
          return cbk([400, 'ExpectedTransactionIdToGetTransactionInBlock']);
        }

        if (!lnd) {
          return cbk([400, 'ExpectedLndToGetTransactionInBlock']);
        }

        return cbk();
      },

      // Get the block at the height
      getBlock: ['validate', ({}, cbk) => getBlock({height, lnd}, cbk)],

      // Query the block for the transaction
      query: ['getBlock', asyncify(({getBlock}) => {
        try {
          return queryTransactions({block: getBlock.block, ids: [id]});
        } catch (err) {
          throw [503, 'FailedToQueryBlockForTransaction', {err}];
        }
      })],

      // The transaction in the block
      transaction: ['getBlock', 'query', ({getBlock, query}, cbk) => {
        const [found] = query.transactions;

        if (!found) {
          return cbk([404, 'TransactionNotFoundInBlock', {height, id}]);
        }

        return cbk(null, {
          height,
          block: getBlock.block,
          transaction: found.transaction,
        });
      }],
    },
    returnResult({reject, resolve, of: 'transaction'}, cbk));
  });
};
