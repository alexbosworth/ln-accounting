const asyncAuto = require('async/auto');
const asyncRetry = require('async/retry');
const {returnResult} = require('asyncjs-util');

const getCoincapHistoricRate = require('./get_coincap_historic_rate');
const getCoindeskHistoricRate = require('./get_coindesk_historic_rate');

const defaultRateProvider = 'coindesk';
const interval = retryCount => Math.random() * 5000 * Math.pow(2, retryCount);
const times = 10;

/** Get historic rate

  Sources available: coincap (default), coindesk.

  {
    currency: <Currency Type String>
    date: <ISO 8601 Date String>
    fiat: <Fiat Type String>
    [provider]: <Historic Rate Source Type String>
    request: <Request Function>
  }

  @returns via cbk or Promise
  {
    cents: <Cents Per Token Number>
  }
*/
module.exports = ({currency, date, fiat, provider, request}, cbk) => {
  return new Promise((resolve, reject) => {
    return asyncAuto({
      // Check arguments
      validate: cbk => {
        if (!currency) {
          return cbk([400, 'ExpectedCurrencyToGetHistoricRate']);
        }

        if (!date) {
          return cbk([400, 'ExpectedDateToGetHistoricRate']);
        }

        if (!fiat) {
          return cbk([400, 'ExpectedFiatToGetHistoricRate']);
        }

        if (!request) {
          return cbk([400, 'ExpectedRequestFunctionToGetHistoricRate']);
        }

        return cbk();
      },

      // Get rate
      getRate: ['validate', ({}, cbk) => {
        const providers = {
          coincap: getCoincapHistoricRate,
          coindesk: getCoindeskHistoricRate,
        };

        const source = providers[provider || defaultRateProvider];

        if (!source) {
          return cbk([400, 'ExpectedKnownRateProviderToGetHistoricRate']);
        }

        return asyncRetry({interval, times}, cbk => {
          return source({currency, date, fiat, request}, cbk);
        },
        cbk);
      }],
    },
    returnResult({reject, resolve, of: 'getRate'}, cbk));
  });
};
