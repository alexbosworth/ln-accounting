const asyncAuto = require('async/auto');
const asyncMapSeries = require('async/mapSeries');
const asyncRetry = require('async/retry');
const {getChainTransactions} = require('ln-service');
const {getClosedChannels} = require('ln-service');
const {getHeight} = require('ln-service');
const {getSweepTransactions} = require('ln-service');
const {returnResult} = require('asyncjs-util');
const {Transaction} = require('bitcoinjs-lib');

const {getProxyTx} = require('./../esplora');
const {getProxyVout} = require('./../esplora');

const dateAsMs = date => new Date(date).getTime();
const {fromHex} = Transaction;
const interval = 200;
const {isArray} = Array;
const msAsBlocks = ms => Math.ceil(ms / 1000 / 60 / 2.5);
const {now} = Date;
const sumOf = arr => arr.reduce((sum, n) => sum + n, Number());
const times = 15;

/** Get chain transactions, including sweep fees

  {
    [after]: <Records Created After ISO 8601 Date>
    [before]: <Records Created Before ISO 8601 Date>
    lnd: <Authenticated LND API Object>
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

      // Get the closed channels
      getClosed: ['validate', ({}, cbk) => getClosedChannels({lnd}, cbk)],

      // Get the chain height
      getHeight: ['validate', ({}, cbk) => getHeight({lnd}, cbk)],

      // Get the sweep transactions
      getSweeps: ['validate', ({}, cbk) => getSweepTransactions({lnd}, cbk)],

      // Get the regular set of chain transactions
      getTx: ['getHeight', ({getHeight}, cbk) => {
        // Exit early when there is no after constraint
        if (!after) {
          return getChainTransactions({lnd}, cbk);
        }

        const height = getHeight.current_block_height;

        return getChainTransactions({
          lnd,
          after: height - msAsBlocks(now() - dateAsMs(after)),
        },
        cbk);
      }],

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
              return getProxyVout({
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

            const {outs} = fromHex(tx.transaction);

            const totalOut = outs.reduce((sum, n) => sum + n.value, Number());

            return cbk(null, {
              spends,
              block_id: tx.block_id,
              confirmation_count: tx.confirmation_count,
              confirmation_height: tx.confirmation_height,
              created_at: tx.created_at,
              description: 'Sweep',
              fee: tx.fee || (sumOf(spends.map(n => n.tokens)) - totalOut),
              id: tx.id,
              is_confirmed: tx.is_confirmed,
              is_outgoing: true,
              output_addresses: tx.output_addresses,
              tokens: tx.fee || (sumOf(spends.map(n => n.tokens)) - totalOut),
              transaction: tx.transaction,
            });
          });
        },
        cbk);
      }],

      // Calculate closing fees for channels that were locally initiated
      getClosingFees: [
        'getClosed',
        'getHeight',
        'getTx',
        ({getClosed, getHeight, getTx}, cbk) =>
      {
        const height = getHeight.current_block_height;

        const channels = getClosed.channels
          .filter(n => !!n.close_transaction_id)
          .filter(n => n.is_partner_initiated === false)
          .filter(channel => {
            // Exit early when not checking channel close height vs after
            if (!after || !channel.close_confirm_height) {
              return true;
            }

            const afterHeight = height - msAsBlocks(now() - dateAsMs(after));

            // Do not consider channels that closed before the after constraint
            return channel.close_confirm_height > afterHeight;
          });

        return asyncMapSeries(channels, (channel, cbk) => {
          const tx = getTx.transactions.find(tx => {
            return tx.id === channel.close_transaction_id;
          });

          const hasMissingLocalData = (() => {
            if (!tx) {
              return true;
            }

            const inputs = fromHex(tx.transaction).ins;

            // Confirm that the inputs to the tx are local
            return !!inputs.find(({hash, index}) => {
              const id = hash.slice().reverse().toString('hex');

              return !getTx.transactions.find(n => n.id === id);
            });
          })();

          // Exit early when the close transaction is missing
          if (hasMissingLocalData) {
            return asyncRetry({interval, times}, cbk => {
              return getProxyTx({
                network,
                request,
                id: channel.close_transaction_id,
              },
              (err, res) => {
                if (!!err) {
                  return cbk(err);
                }

                return cbk(null, {
                  block_id: res.block_id,
                  confirmation_height: res.confirmation_height,
                  created_at: res.created_at,
                  description: 'Channel close',
                  fee: res.fee,
                  id: res.id,
                  is_confirmed: res.is_confirmed,
                  is_outgoing: true,
                  output_addresses: res.output_addresses,
                  tokens: res.fee,
                });
              });
            },
            cbk);
          }

          const inputs = fromHex(tx.transaction).ins.map(({hash, index}) => {
            const id = hash.slice().reverse().toString('hex');

            const matching = getTx.transactions.find(n => n.id === id);

            return {
              tokens: fromHex(matching.transaction).outs[index].value,
              transaction_id: id,
              transaction_vout: index,
            };
          });

          const inputsValue = sumOf(inputs.map(n => n.tokens));
          const outputsValue = fromHex(tx.transaction).outs.map(n => n.value);

          return cbk(null, {
            block_id: tx.block_id,
            confirmation_count: tx.confirmation_count,
            confirmation_height: tx.confirmation_height,
            created_at: tx.created_at,
            description: `Channel close: ${tx.description}`,
            fee: inputsValue - sumOf(outputsValue),
            id: tx.id,
            is_confirmed: tx.is_confirmed,
            is_outgoing: true,
            output_addresses: tx.output_addresses,
            tokens: inputsValue - sumOf(outputsValue),
            transaction: tx.transaction,
          });
        },
        cbk);
      }],

      // Consolidate transactions, including missing fees
      transactions: [
        'getClosed',
        'getClosingFees',
        'getSweepFees',
        'getTx',
        ({getClosed, getClosingFees, getSweepFees, getTx}, cbk) =>
      {
        const closeIds = getClosed.channels.map(n => n.close_transaction_id);
        const sweeps = getSweepFees.map(({id}) => id);

        const normalTx = getTx.transactions.filter(({id}) => {
          return !closeIds.includes(id) && !sweeps.includes(id);
        });

        const transactions = []
          .concat(getClosingFees)
          .concat(getSweepFees)
          .concat(normalTx);

        return cbk(null, {transactions});
      }],
    },
    returnResult({reject, resolve, of: 'transactions'}, cbk));
  });
};
