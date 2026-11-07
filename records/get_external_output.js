const asyncAuto = require('async/auto');
const asyncify = require('async/asyncify');
const {componentsOfTransaction} = require('@alexbosworth/blockchain');
const {returnResult} = require('asyncjs-util');

const findTransactionInBlocks = require('./find_transaction_in_blocks');

const {isArray} = Array;

/** Get the value of a transaction output that is not known to the wallet

  {
    [height]: <Transaction Confirmed At Height Number>
    id: <Transaction Id Hex String>
    [known]: [{
      id: <Transaction Id Hex String>
      transaction: <Raw Transaction Hex String>
    }]
    lnd: <Authenticated LND API Object>
    vout: <Transaction Output Index Number>
  }

  @returns via cbk or Promise
  {
    tokens: <Transaction Output Tokens Number>
  }
*/
module.exports = ({height, id, known, lnd, vout}, cbk) => {
  return new Promise((resolve, reject) => {
    return asyncAuto({
      // Check arguments
      validate: cbk => {
        if (!id) {
          return cbk([400, 'ExpectedTransactionIdToGetExternalOutput']);
        }

        if (!!known && !isArray(known)) {
          return cbk([400, 'ExpectedArrayOfKnownTransactionsToGetOutput']);
        }

        if (!lnd) {
          return cbk([400, 'ExpectedLndToGetExternalOutput']);
        }

        if (vout === undefined) {
          return cbk([400, 'ExpectedOutputIndexToGetExternalOutput']);
        }

        return cbk();
      },

      // Get the raw transaction, from the known ones or from its block
      getTransaction: ['validate', ({}, cbk) => {
        const provided = (known || []).find(n => n.id === id);

        // Exit early when the raw transaction is known
        if (!!provided) {
          return cbk(null, {transaction: provided.transaction});
        }

        if (height === undefined) {
          return cbk([400, 'ExpectedHeightToGetExternalOutput', {id, vout}]);
        }

        return findTransactionInBlocks({height, id, lnd}, cbk);
      }],

      // Parse the transaction
      parse: ['getTransaction', asyncify(({getTransaction}) => {
        const {transaction} = getTransaction;

        try {
          return componentsOfTransaction({transaction});
        } catch (err) {
          throw [503, 'FailedToParseExternalTransaction', {err}];
        }
      })],

      // Output value
      output: ['parse', ({parse}, cbk) => {
        const output = parse.outputs[vout];

        if (!output) {
          return cbk([503, 'ExpectedOutputInTransaction', {id, vout}]);
        }

        return cbk(null, {tokens: output.tokens});
      }],
    },
    returnResult({reject, resolve, of: 'output'}, cbk));
  });
};
