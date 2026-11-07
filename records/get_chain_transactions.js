const asyncAuto = require('async/auto');
const asyncify = require('async/asyncify');
const asyncMapSeries = require('async/mapSeries');
const {componentsOfTransaction} = require('@alexbosworth/blockchain');
const {getChainTransaction} = require('ln-service');
const {getChainTransactions} = require('ln-service');
const {getClosedChannels} = require('ln-service');
const {getHeight} = require('ln-service');
const {getSweepTransactions} = require('ln-service');
const {idForTransaction} = require('@alexbosworth/blockchain');
const {returnResult} = require('asyncjs-util');

const channelCloseRecord = require('./channel_close_record');
const closedChannelOutputs = require('./closed_channel_outputs');
const getExternalOutput = require('./get_external_output');
const getExternalTransaction = require('./get_external_transaction');

const dateAsMs = date => new Date(date).getTime();
const {isArray} = Array;
const msAsBlocks = ms => Math.ceil(ms / 1000 / 60 / 2.5);
const {now} = Date;
const outpointOf = n => `${n.transaction_id}:${n.transaction_vout}`;
const sumOf = arr => arr.reduce((sum, n) => sum + n, Number());

/** Get chain transactions, including sweep fees

  {
    [after]: <Records Created On or After ISO 8601 Date>
    [before]: <Records Created Before ISO 8601 Date>
    lnd: <Authenticated LND API Object>
    [network]: <Network Name String>
    [transactions]: [<Raw Transaction Hex String>]
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
module.exports = ({after, before, lnd, network, transactions}, cbk) => {
  return new Promise((resolve, reject) => {
    return asyncAuto({
      // Check arguments
      validate: cbk => {
        if (!lnd) {
          return cbk([400, 'ExpectedLndToGetChainTransactions']);
        }

        if (!!transactions && !isArray(transactions)) {
          return cbk([400, 'ExpectedArrayOfRawTransactionsToGetChainTxs']);
        }

        return cbk();
      },

      // Raw transactions supplied by the caller, with their ids
      known: ['validate', asyncify(() => {
        try {
          return (transactions || []).map(transaction => {
            return {transaction, id: idForTransaction({transaction}).id};
          });
        } catch (err) {
          throw [400, 'ExpectedValidRawTransactionsToGetChainTxs', {err}];
        }
      })],

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

      // Outputs of closed channels that have values known from channel data
      closeOutputs: ['getClosed', ({getClosed}, cbk) => {
        const {channels} = getClosed;

        return cbk(null, closedChannelOutputs({channels}).outputs);
      }],

      // Fill in any missing fees for sweep transactions
      getSweepFees: [
        'closeOutputs',
        'getClosed',
        'known',
        'sweepTransactions',
        ({closeOutputs, getClosed, known, sweepTransactions}, cbk) =>
      {
        return asyncMapSeries(sweepTransactions, (tx, cbk) => {
          return asyncMapSeries(tx.spends, (spend, cbk) => {
            // Exit early when tokens are already known
            if (!!spend.tokens) {
              return cbk(null, spend);
            }

            const outpoint = outpointOf(spend);

            const output = closeOutputs.find(n => outpointOf(n) === outpoint);

            // Exit early when the spent output is a known channel output
            if (!!output) {
              return cbk(null, {
                tokens: output.tokens,
                transaction_id: spend.transaction_id,
                transaction_vout: spend.transaction_vout,
              });
            }

            // A spent close output has a known height from its channel
            const channel = getClosed.channels.find(n => {
              return n.close_transaction_id === spend.transaction_id;
            });

            return getExternalOutput({
              known,
              lnd,
              height: !channel ? undefined : channel.close_confirm_height,
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
          (err, spends) => {
            if (!!err) {
              return cbk(err);
            }

            const {outputs} = componentsOfTransaction({
              transaction: tx.transaction,
            });

            const totalOut = sumOf(outputs.map(n => n.tokens));

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

      // Channels that were locally initiated and closed in the date range
      closingChannels: [
        'getClosed',
        'getHeight',
        ({getClosed, getHeight}, cbk) =>
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

        return cbk(null, channels);
      }],

      // Get the closing transactions of the closing channels
      getCloseTxs: [
        'closingChannels',
        'getTx',
        'known',
        ({closingChannels, getTx, known}, cbk) =>
      {
        return asyncMapSeries(closingChannels, (channel, cbk) => {
          const id = channel.close_transaction_id;

          const tx = getTx.transactions.find(n => n.id === id);

          // Exit early when the raw close transaction is in the wallet list
          if (!!tx && !!tx.transaction) {
            return cbk(null, {channel, transaction: tx});
          }

          // The close tx may be in the wallet but outside of the height range
          return getChainTransaction({id, lnd}, (err, res) => {
            // Exit early when the wallet has the raw transaction
            if (!err && !!res.transaction) {
              return cbk(null, {channel, transaction: res});
            }

            // The close transaction is not in the wallet, so recover it
            return getExternalTransaction({
              id,
              known,
              lnd,
              network,
              height: channel.close_confirm_height,
            },
            (err, res) => {
              if (!!err) {
                return cbk(err);
              }

              return cbk(null, {channel, transaction: res});
            });
          });
        },
        cbk);
      }],

      // Calculate closing fees for channels that were locally initiated
      getClosingFees: ['getCloseTxs', asyncify(({getCloseTxs}) => {
        try {
          return getCloseTxs.map(channelCloseRecord);
        } catch (err) {
          throw [503, 'FailedToDeriveChannelCloseRecord', {err}];
        }
      })],

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
          .concat(getClosingFees.map(n => n.record))
          .concat(getSweepFees)
          .concat(normalTx);

        return cbk(null, {transactions});
      }],
    },
    returnResult({reject, resolve, of: 'transactions'}, cbk));
  });
};
