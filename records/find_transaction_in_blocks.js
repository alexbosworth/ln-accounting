const asyncAuto = require('async/auto');
const asyncTryEach = require('async/tryEach');
const {returnResult} = require('asyncjs-util');

const getTransactionInBlock = require('./get_transaction_in_block');

const searchOffsets = [0, 1, -1, 2, -2, 3, -3, 4, -4, 5, -5, 6, -6];

/** Find a transaction in the block at a height, or in the blocks around it

  {
    height: <Transaction Confirmed At Height Number>
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
          return cbk([400, 'ExpectedHeightToFindTransactionInBlocks']);
        }

        if (!id) {
          return cbk([400, 'ExpectedTransactionIdToFindTransactionInBlocks']);
        }

        if (!lnd) {
          return cbk([400, 'ExpectedLndToFindTransactionInBlocks']);
        }

        return cbk();
      },

      // Look through the blocks around the height, nearest first
      search: ['validate', ({}, cbk) => {
        // A reorg may have moved the tx out of the block it was recorded in
        const heights = searchOffsets.map(n => height + n).filter(n => n >= 0);

        return asyncTryEach(heights.map(n => cbk => {
          return getTransactionInBlock({id, lnd, height: n}, cbk);
        }),
        (err, res) => {
          if (!!err) {
            return cbk([
              503,
              'FailedToFindTransactionInBlocks',
              {err, height, id},
            ]);
          }

          return cbk(null, res);
        });
      }],
    },
    returnResult({reject, resolve, of: 'search'}, cbk));
  });
};
