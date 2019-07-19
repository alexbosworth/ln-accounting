const asyncAuto = require('async/auto');
const {returnResult} = require('asyncjs-util');

const api = 'https://api.coincap.io/v2/';
const assets = {BTC: 'bitcoin'};
const centsPerDollar = 100;
const decBase = 10;
const fiats = {USD: 'Usd'};
const interval = 'h1';
const {isArray} = Array;
const msPerHour = 1000 * 60 * 60;
const {parse} = Date;
const remoteServiceTimeoutMs = 20 * 1000;
const {round} = Math;

/** Get the number of cents for a big unit token from coincap

  {
    currency: <Currency Type String>
    date: <ISO 8601 Date String>
    fiat: <Fiat Type String>
    request: <Request Function>
  }

  @returns via cbk or Promise
  {
    cents: <Cents Per Token Number>
  }
*/
module.exports = ({currency, date, fiat, request}, cbk) => {
  return new Promise((resolve, reject) => {
    return asyncAuto({
      // Check arguments
      validate: cbk => {
        if (!assets[currency]) {
          return cbk([400, 'UnsupportedCurrencyForCoincapFiatRateLookup']);
        }

        if (!date) {
          return cbk([400, 'ExpectedDateForHistoricCoincapRateLookup']);
        }

        if (!fiats[fiat]) {
          return cbk([400, 'UnsupportedFiatTypeForCoincapFiatRateLookup']);
        }

        if (!request) {
          return cbk([400, 'ExpectedRequestMethodForCoincapFiatRateLookup']);
        }

        return cbk();
      },

      // Get rate
      getRate: ['validate', ({}, cbk) => {
        const start = parse(date) - msPerHour;

        const end = start + msPerHour + msPerHour;

        return request({
          json: true,
          qs: {end, interval, start},
          timeout: remoteServiceTimeoutMs,
          url: `${api}assets/${assets[currency]}/history`,
        },
        (err, r, body) => {
          if (!!err) {
            return cbk([503, 'UnexpectedErrorGettingCoincapRate', {err}]);
          }

          if (!body || !isArray(body.data) || !body.data.length) {
            return cbk([503, 'UnexpectedResponseGettingCoincapRate']);
          }

          const [price] = body.data;

          if (!price.date) {
            return cbk([503, 'ExpectedDateForPriceQuoteInCoincapResponse']);
          }

          const rate = price[`price${fiats[fiat]}`];

          if (!rate) {
            return cbk([503, 'ExpectedFiatPriceInCoincapResponse']);
          }

          const cents = round(parseFloat(rate, decBase) * centsPerDollar);

          return cbk(null, {cents});
        });
      }],
    },
    returnResult({reject, resolve, of: 'getRate'}, cbk));
  });
};
