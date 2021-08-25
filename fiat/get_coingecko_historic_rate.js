const asyncAuto = require('async/auto');
const {returnResult} = require('asyncjs-util');

const asCoingeckoDate = yyyymmdd => yyyymmdd.split('-').reverse().join('-');
const centsPerDollar = 100;
const dateComponents = date => date.substring(0, 'yyyy-mm-dd'.length);
const remoteServiceTimeoutMs = 30 * 1000;
const url = 'https://api.coingecko.com/api/v3/coins/bitcoin/history';

/** Get the number of cents for a big unit token from coingecko

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
          return cbk([400, 'UnsupportedCurrencyForCoingeckoFiatRateLookup']);
        }

        if (!date) {
          return cbk([400, 'ExpectedDateForCoingeckoRateLookup']);
        }

        if (fiat !== 'USD') {
          return cbk([400, 'UnsupportedFiatTypeForCoingeckoFiatRateLookup']);
        }

        if (!request) {
          return cbk([400, 'ExpectedRequestMethodForCoingeckoFiatRateLookup']);
        }

        return cbk();
      },

      // Get rate
      getRate: ['validate', ({}, cbk) => {
        return request({
          url,
          json: true,
          qs: {
            date: asCoingeckoDate(dateComponents(date)),
            localization: false,
          },
          timeout: remoteServiceTimeoutMs,
        },
        (err, r, body) => {
          if (!!err) {
            return cbk([503, 'UnexpectedErrGettingCoingeckoPastRate', {err}]);
          }

          if (!body || !body.market_data || !body.market_data.current_price) {
            return cbk([503, 'UnexpectedResponseInCoingeckoPastRateResponse']);
          }

          if (!body.market_data.current_price.usd) {
            return cbk([503, 'ExpectedCoingeckoCurrentPriceForFiat']);
          }

          const cents = body.market_data.current_price.usd * centsPerDollar;

          return cbk(null, {cents});
        });
      }],
    },
    returnResult({reject, resolve, of: 'getRate'}, cbk));
  });
};
