const asyncAuto = require('async/auto');
const {returnResult} = require('asyncjs-util');

const api = 'https://api.coindesk.com/v1/';
const centsPerDollar = 100;
const closePath = 'bpi/historical/close.json';
const dayFormat = 'yyyy-mm-dd';
const decBase = 10;
const msPerDay = 1000 * 60 * 60 * 24;
const {parse} = Date;
const remoteServiceTimeoutMs = 30 * 1000;

/** Get the number of cents for a big unit token from coindesk

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
        if (currency !== 'BTC') {
          return cbk([400, 'UnsupportedCurrencyForCoindeskFiatRateLookup']);
        }

        if (!date) {
          return cbk([400, 'ExpectedDateForCoindeskRateLookup']);
        }

        if (fiat !== 'USD') {
          return cbk([400, 'UnsupportedFiatTypeForCoindeskFiatRateLookup']);
        }

        if (!request) {
          return cbk([400, 'ExpectedRequestMethodForCoindeskFiatRateLookup']);
        }

        return cbk();
      },

      // Get rate
      getRate: ['validate', ({}, cbk) => {
        const roughDate = date.substring(0, dayFormat.length);
        const start = new Date(parse(date) - msPerDay).toISOString();

        const startDay = start.substring(0, dayFormat.length);

        return request({
          json: true,
          qs: {end: roughDate, start: startDay},
          timeout: remoteServiceTimeoutMs,
          url: `${api}${closePath}`,
        },
        (err, r, body) => {
          if (!!err) {
            return cbk([503, 'UnexpectedErrorGettingHistoricRate', {err}]);
          }

          if (!body || !body.bpi || !body.bpi[startDay]) {
            return cbk([503, 'UnexpectedResponseInHistoricRateResponse']);
          }

          const cents = body.bpi[startDay] * centsPerDollar;

          return cbk(null, {cents});
        });
      }],
    },
    returnResult({reject, resolve, of: 'getRate'}, cbk));
  });
};
