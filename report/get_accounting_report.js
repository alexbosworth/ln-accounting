const asyncAuto = require('async/auto');
const {getChainTransactions} = require('ln-service');
const {getChannels} = require('ln-service');
const {getClosedChannels} = require('ln-service');
const {getForwards} = require('ln-service');
const {getPayments} = require('ln-service');
const {getPendingChannels} = require('ln-service');
const request = require('request');
const {returnResult} = require('asyncjs-util');

const {categories} = require('./../harmony');
const {categorizeRecords} = require('./../harmony');
const {chainFeesAsRecords} = require('./../harmony');
const {chainReceivesAsRecords} = require('./../harmony');
const {chainSendsAsRecords} = require('./../harmony');
const {forwardsAsRecords} = require('./../harmony');
const getAllInvoices = require('./get_all_invoices');
const {getFiatValues} = require('./../fiat');
const {harmonize} = require('./../harmony');
const {invoicesAsRecords} = require('./../harmony');
const {paymentsAsRecords} = require('./../harmony');
const {recordsWithFiat} = require('./../harmony');
const {types} = require('./../harmony');

const earlyStartDate = '2017-08-24T08:57:37.000Z';
const largeLimit = 1e8;

/** Get an accounting summary of wallet

  Note: Chain fees does not include chain fees paid to close channels

  {
    [category]: <Category Filter String>
    currency: <Base Currency Type String>
    fiat: <Fiat Currency Type String>
    lnd: <LND gRPC Object>
    [rate]: <Exchange Function> ({currency, date, fiat}, cbk) => (err, {cents})
    [rate_provider]: <Fiat Rate Provider String> // coincap || coindesk
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

        return cbk();
      },

      // Get transactions on the blockchain
      getChainTx: ['validate', ({}, cbk) => {
        return getChainTransactions({lnd: args.lnd}, cbk);
      }],

      // Get channels
      getChannels: ['validate', ({}, cbk) => {
        return getChannels({lnd: args.lnd}, cbk);
      }],

      // Get closed channels
      getClosedChans: ['validate', ({}, cbk) => {
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

        return getAllInvoices({lnd: args.lnd}, cbk);
      }],

      // Get payments
      getPayments: ['validate', ({}, cbk) => {
        if (!!args.category && args.category !== categories.payments) {
          return cbk();
        }

        return getPayments({lnd: args.lnd}, cbk);
      }],

      // Get pending channels
      getPending: ['validate', ({}, cbk) => {
        return getPendingChannels({lnd: args.lnd}, cbk);
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
      payments: ['getPayments', ({getPayments}, cbk) => {
        if (!getPayments) {
          return cbk(null, []);
        }

        const {payments} = getPayments;

        return cbk(null, paymentsAsRecords({payments}).records);
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

        return cbk(null, records);
      }],

      // Fiat values for records
      getFiatValues: ['records', ({records}, cbk) => {
        return getFiatValues({
          request,
          currency: args.currency,
          dates: records.map(n => n.created_at),
          fiat: args.fiat,
          provider: args.rate_provider,
          rate: args.rate,
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