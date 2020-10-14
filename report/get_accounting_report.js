const asyncAuto = require('async/auto');
const asyncRetry = require('async/retry');
const {getChainTransactions} = require('ln-service');
const {getChannels} = require('ln-service');
const {getClosedChannels} = require('ln-service');
const {getForwards} = require('ln-service');
const {getPayments} = require('ln-service');
const {getPendingChannels} = require('ln-service');
const {getWalletInfo} = require('ln-service');
const {returnResult} = require('asyncjs-util');

const {categories} = require('./../harmony');
const {categorizeRecords} = require('./../harmony');
const {chainFeesAsRecords} = require('./../harmony');
const {chainReceivesAsRecords} = require('./../harmony');
const {chainSendsAsRecords} = require('./../harmony');
const {forwardsAsRecords} = require('./../harmony');
const {getAllInvoices} = require('./../records');
const {getAllPayments} = require('./../records');
const {getFiatValues} = require('./../fiat');
const {harmonize} = require('./../harmony');
const {invoicesAsRecords} = require('./../harmony');
const {paymentsAsRecords} = require('./../harmony');
const {recordsWithFiat} = require('./../harmony');
const {types} = require('./../harmony');

const earlyStartDate = '2017-08-24T08:57:37.000Z';
const interval = retryCount => Math.random() * 5000 * Math.pow(2, retryCount);
const largeLimit = 1e8;
const times = 10;

/** Get an accounting summary of wallet

  Note: Chain fees does not include chain fees paid to close channels

  {
    [after]: <Records Created After ISO 8601 Date>
    [before]: <Records Created Before ISO 8601 Date>
    [category]: <Category Filter String>
    currency: <Base Currency Type String>
    fiat: <Fiat Currency Type String>
    lnd: <LND gRPC Object>
    [rate]: <Exchange Function> ({currency, date, fiat}, cbk) => (err, {cents})
    [rate_provider]: <Fiat Rate Provider String> // coincap || coindesk
    request: <Request Function>
  }

  @returns via cbk or Promise
  {
    [chain_fees]: [{
      [amount]: <Amount Number>
      [asset]: <Asset Type String>
      [created_at]: <ISO 8601 Date String>
      [external_id]: <External Reference Id String>
      [from_id]: <Source Id String>
      [id]: <Record Id String>
      [notes]: <Notes String>
      [to_id]: <Destination Id String>
      [type]: <Record Type String>
    }]
    [chain_fees_csv]: <CSV String>
    [chain_sends]: [{
      [amount]: <Amount Number>
      [asset]: <Asset Type String>
      [created_at]: <ISO 8601 Date String>
      [external_id]: <External Reference Id String>
      [from_id]: <Source Id String>
      [id]: <Record Id String>
      [notes]: <Notes String>
      [to_id]: <Destination Id String>
      [type]: <Record Type String>
    }]
    [chain_sends_csv]: <CSV String>
    [forwards]: [{
      [amount]: <Amount Number>
      [asset]: <Asset Type String>
      [created_at]: <ISO 8601 Date String>
      [external_id]: <External Reference Id String>
      [from_id]: <Source Id String>
      [id]: <Record Id String>
      [notes]: <Notes String>
      [to_id]: <Destination Id String>
      [type]: <Record Type String>
    }]
    [forwards_csv]: <CSV String>
    [invoices]: [{
      [amount]: <Amount Number>
      [asset]: <Asset Type String>
      [created_at]: <ISO 8601 Date String>
      [external_id]: <External Reference Id String>
      [from_id]: <Source Id String>
      [id]: <Record Id String>
      [notes]: <Notes String>
      [to_id]: <Destination Id String>
      [type]: <Record Type String>
    }]
    [invoices_csv]: <CSV String>
    [payments]: [{
      [amount]: <Amount Number>
      [asset]: <Asset Type String>
      [created_at]: <ISO 8601 Date String>
      [external_id]: <External Reference Id String>
      [from_id]: <Source Id String>
      [id]: <Record Id String>
      [notes]: <Notes String>
      [to_id]: <Destination Id String>
      [type]: <Record Type String>
    }]
    [payments_csv]: <CSV String>
  }
*/
module.exports = (args, cbk) => {
  return new Promise((resolve, reject) => {
    return asyncAuto({
      // Check arguments
      validate: cbk => {
        if (!args.currency) {
          return cbk([400, 'ExpectedNativeCurrencyAssetType']);
        }

        if (!args.fiat) {
          return cbk([400, 'ExpectedConversionCurrencyType']);
        }

        if (!args.lnd) {
          return cbk([400, 'ExpectedLndToGetAccountingReport']);
        }

        if (!!args.rate && typeof args.rate !== 'function') {
          return cbk([400, 'ExpectedRateFunctionForAccountingReport']);
        }

        if (!args.request) {
          return cbk([400, 'ExpectedRequestFunctionToGetAccountingReport']);
        }

        return cbk();
      },

      // Get transactions on the blockchain
      getChainTx: ['validate', ({}, cbk) => {
        if (args.category === categories.forwards) {
          return cbk(null, {transactions: []});
        }

        return getChainTransactions({lnd: args.lnd}, cbk);
      }],

      // Get channels
      getChannels: ['validate', ({}, cbk) => {
        if (args.category === categories.forwards) {
          return cbk(null, {channels: []});
        }

        return getChannels({lnd: args.lnd}, cbk);
      }],

      // Get closed channels
      getClosedChans: ['validate', ({}, cbk) => {
        if (args.category === categories.forwards) {
          return cbk(null, {channels: []});
        }

        return getClosedChannels({lnd: args.lnd}, cbk)
      }],

      // Get routing forwards
      getForwards: ['validate', ({}, cbk) => {
        if (!!args.category && args.category !== categories.forwards) {
          return cbk();
        }

        return getForwards({
          after: earlyStartDate,
          before: new Date().toISOString(),
          limit: largeLimit,
          lnd: args.lnd,
        },
        cbk);
      }],

      // Get invoices
      getInvoices: ['validate', ({}, cbk) => {
        if (!!args.category && args.category !== categories.invoices) {
          return cbk();
        }

        // Since there is no way to page by settle date, get all the invoices
        return getAllInvoices({lnd: args.lnd}, cbk);
      }],

      // Get payments
      getPayments: ['validate', ({}, cbk) => {
        if (!!args.category && args.category !== categories.payments) {
          return cbk();
        }

        return getAllPayments({after: args.after, lnd: args.lnd}, cbk);
      }],

      // Get pending channels
      getPending: ['validate', ({}, cbk) => {
        if (args.category === categories.forwards) {
          return cbk(null, {pending_channels: []});
        }

        return asyncRetry({interval, times}, cbk => {
          return getPendingChannels({lnd: args.lnd}, cbk);
        },
        cbk);
      }],

      // Get public key
      getPublicKey: ['validate', ({}, cbk) => {
        return getWalletInfo({lnd: args.lnd}, cbk);
      }],

      // Forward records
      forwards: ['getForwards', ({getForwards}, cbk) => {
        if (!getForwards) {
          return cbk(null, []);
        }

        const {forwards} = getForwards;

        try {
          return cbk(null, forwardsAsRecords({forwards}).records);
        } catch (err) {
          return cbk([503, 'FailedToMapForwardsToAccountingRecords', {err}]);
        }
      }],

      // Invoice records
      invoices: ['getInvoices', ({getInvoices}, cbk) => {
        if (!getInvoices) {
          return cbk(null, []);
        }

        const {invoices} = getInvoices;

        try {
          return cbk(null, invoicesAsRecords({invoices}).records);
        } catch (err) {
          return cbk([503, 'FailedToMapInvoicesToAccountingRecords', {err}]);
        }
      }],

      // Payment records
      payments: [
        'getPayments',
        'getPublicKey',
        ({getPayments, getPublicKey}, cbk) =>
      {
        if (!getPayments) {
          return cbk(null, []);
        }

        const {records} = paymentsAsRecords({
          payments: getPayments.payments,
          public_key: getPublicKey.public_key,
        });

        return cbk(null, records);
      }],

      // Chain fees
      chainFees: ['getChainTx', ({getChainTx}, cbk) => {
        if (!getChainTx) {
          return cbk(null, []);
        }

        const {transactions} = getChainTx;

        return cbk(null, chainFeesAsRecords({transactions}).records);
      }],

      // Channel transaction ids
      channelTxIds: [
        'getChannels',
        'getClosedChans',
        'getPending',
        ({getChannels, getClosedChans, getPending}, cbk) =>
      {
        const channels = []
          .concat(getClosedChans.channels)
          .concat(getPending.pending_channels)
          .concat(getChannels.channels);

        const closeIds = channels.map(n => n.close_transaction_id);
        const transactionIds = channels.map(n => n.transaction_id);

        const ids = [].concat(closeIds).concat(transactionIds).map(n => !!n);

        return cbk(null, ids);
      }],

      // Chain receive records
      chainReceives: [
        'channelTxIds',
        'getChainTx',
        ({channelTxIds, getChainTx}, cbk) =>
      {
        try {
          const {records} = chainReceivesAsRecords({
            channel_transaction_ids: channelTxIds,
            transactions: getChainTx.transactions,
          });

          return cbk(null, records);
        } catch (err) {
          return cbk([503, 'FailedToMapChainReceivesToRecords', {err}]);
        }
      }],

      // Chain send records
      chainSends: [
        'channelTxIds',
        'getChainTx',
        ({channelTxIds, getChainTx}, cbk) =>
      {
        try {
          const {records} = chainSendsAsRecords({
            channel_transaction_ids: channelTxIds,
            transactions: getChainTx.transactions,
          });

          return cbk(null, records);
        } catch (err) {
          return cbk([503, 'FailedToMapChainSendsToRecords', {err}]);
        }
      }],

      // All relevant records
      records: [
        'chainFees',
        'chainReceives',
        'chainSends',
        'forwards',
        'invoices',
        'payments',
        ({
          chainFees,
          chainReceives,
          chainSends,
          forwards,
          invoices,
          payments,
        }, cbk) =>
      {
        const records = []
          .concat(chainFees || [])
          .concat(chainReceives || [])
          .concat(chainSends || [])
          .concat(forwards || [])
          .concat(invoices || [])
          .concat(payments || []);

        const temporalRecords = records.filter(record => {
          if (!!args.after && record.created_at < args.after) {
            return false;
          }

          if (!!args.before && record.created_at > args.before) {
            return false;
          }

          return true;
        });

        return cbk(null, temporalRecords);
      }],

      // Fiat values for records
      getFiatValues: ['records', ({records}, cbk) => {
        return getFiatValues({
          currency: args.currency,
          dates: records.map(n => n.created_at),
          fiat: args.fiat,
          provider: args.rate_provider,
          rate: args.rate,
          request: args.request,
        },
        cbk);
      }],

      // Records with fiat amounts
      recordsWithFiat: [
        'getFiatValues',
        'records',
        ({getFiatValues, records}, cbk) =>
      {
        const {currency} = args;
        const fiat = getFiatValues.rates;

        try {
          return cbk(null, recordsWithFiat({currency, fiat, records}).records);
        } catch (err) {
          return cbk([500, 'FailedToAddHistoricFiatValuesToRecords', {err}]);
        }
      }],

      // Report
      report: ['recordsWithFiat', ({recordsWithFiat}, cbk) => {
        try {
          return cbk(null, categorizeRecords({records: recordsWithFiat}));
        } catch (err) {
          return cbk([500, 'FailedToCategorizeRecords']);
        }
      }],
    },
    returnResult({reject, resolve, of: 'report'}, cbk));
  });
};
