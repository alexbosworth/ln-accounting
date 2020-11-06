const asyncAuto = require('async/auto');
const asyncMapSeries = require('async/mapSeries');
const asyncRetry = require('async/retry');
const {getChainTransactions} = require('ln-service');
const {getSweepTransactions} = require('ln-service');
const {returnResult} = require('asyncjs-util');

const {getBlockstreamVout} = require('./../blockstream');

const interval = retryCount => 100 * Math.pow(2, retryCount);
const {isArray} = Array;
const sumOf = arr => arr.reduce((sum, n) => sum + n, Number());
const times = 10;

/** Get chain transactions, including sweep fees

  {
    [after]: <Records Created After ISO 8601 Date>
    [before]: <Records Created Before ISO 8601 Date>
    lnd: <Authenticated LND Object>
    [network]: <Network Name String>
    request: <Request Function>
  }

  @returns via cbk or Promise
  {
    transactions: [{
      [block_id]: <Block Hash String>
      [confirmation_count]: <Confirmation Count Number>
      [confirmation_height]: <Confirmation Block Height Number>
      created_at: <Created ISO 8601 Date String>
      [description]: <Transaction Label String>
      [fee]: <Fees Paid Tokens Number>
      id: <Transaction Id String>
      is_confirmed: <Is Confirmed Bool>
      is_outgoing: <Transaction Outbound Bool>
      output_addresses: [<Address String>]
      tokens: <Tokens Including Fee Number>
      [transaction]: <Raw Transaction Hex String>
    }]
  }
*/
module.exports = ({after, before, lnd, network, request}, cbk) => {
  return new Promise((resolve, reject) => {
    return asyncAuto({
      // Check arguments
      validate: cbk => {
        if (!lnd) {
          return cbk([400, 'ExpectedLndToGetChainTransactions']);
        }

        if (!request) {
          return cbk([400, 'ExpectedRequestFunctionToGetChainTransactions']);
        }

        return cbk();
      },

      // Get the sweep transactions
      getSweeps: ['validate', ({}, cbk) => getSweepTransactions({lnd}, cbk)],

      // Get the regular set of chain transactions
      getTx: ['validate', ({}, cbk) => getChainTransactions({lnd}, cbk)],

      // Time-relevant sweep transactions
      sweepTransactions: ['getSweeps', ({getSweeps}, cbk) => {
        const transactions = getSweeps.transactions.filter(tx => {
          if (!!before && tx.created_at >= before) {
            return false;
          }

          if (!!after && tx.created_at < after) {
            return false;
          }

          return true;
        });

        return cbk(null, transactions);
      }],

      // Fill in any missing fees for sweep transactions
      getSweepFees: ['sweepTransactions', ({sweepTransactions}, cbk) => {
        return asyncMapSeries(sweepTransactions, (tx, cbk) => {
          return asyncMapSeries(tx.spends, (spend, cbk) => {
            // Exit early when tokens are already known
            if (!!spend.tokens) {
              return cbk(null, spend);
            }

            return asyncRetry({interval, times}, cbk => {
              return getBlockstreamVout({
                network,
                request,
                id: spend.transaction_id,
                vout: spend.transaction_vout,
              },
              (err, res) => {
                if (!!err) {
                  return cbk(err);
                }

                return cbk(null, {
                  tokens: res.tokens,
                  transaction_id: spend.transaction_id,
                  transaction_vout: spend.transaction_vout,
                });
              });
            },
            cbk);
          },
          (err, spends) => {
            if (!!err) {
              return cbk(err);
            }

            return cbk(null, {
              spends,
              block_id: tx.block_id,
              confirmation_count: tx.confirmation_count,
              confirmation_height: tx.confirmation_height,
              created_at: tx.created_at,
              fee: tx.fee || (sumOf(spends.map(n => n.tokens)) - tx.tokens),
              id: tx.id,
              is_confirmed: tx.is_confirmed,
              is_outgoing: true,
              output_addresses: tx.output_addresses,
              tokens: tx.tokens,
              transaction: tx.transaction,
            });
          });
        },
        cbk);
      }],

      // Consolidate transactions, including missing fees
      transactions: ['getSweepFees', 'getTx', ({getSweepFees, getTx}, cbk) => {
        const sweeps = getSweepFees.map(({id}) => id);

        const normalTx = getTx.transactions.filter(({id}) => {
          return !sweeps.includes(id);
        });

        const transactions = [].concat(getSweepFees).concat(normalTx);

        return cbk(null, {transactions});
      }],
    },
    returnResult({reject, resolve, of: 'transactions'}, cbk));
  });
};
