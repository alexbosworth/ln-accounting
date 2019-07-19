const asyncAuto = require('async/auto');
const asyncMapSeries = require('async/mapSeries');
const {returnResult} = require('asyncjs-util');

const getHistoricRate = require('./get_historic_rate');

const dateFormat = 'yyyy-mm-ddThh';
const {isArray} = Array;

/** Get fiat values

  {
    currency: <Currency String>
    dates: [<ISO 8601 Date String>]
    fiat: <Fiat Currency Type String>
    [provider]: <Rate Provider String>
    [rate]: <Rate Function>
    [request]: <Request Function>
  }

  @returns via cbk or Promise
  {
    rates: [{
      cents: <Rate in Cents Number>
      date: <Rate ISO 8601 Date String>
    }]
  }
*/
module.exports = ({currency, dates, fiat, provider, rate, request}, cbk) => {
  return new Promise((resolve, reject) => {
    return asyncAuto({
      // Check arguments
      validate: cbk => {
        if (!currency) {
          return cbk([400, 'ExpectedCurrencyToGetFiatValues']);
        }

        if (!isArray(dates)) {
          return cbk([400, 'ExpectedDatesToGetFiatValues']);
        }

        if (!fiat) {
          return cbk([400, 'ExpectedFiatTypeToGetFiatValues']);
        }

        if (!rate && !request) {
          return cbk([400, 'ExpectedRateMethodOrRequestMethodToGetFiat']);
        }

        return cbk();
      },

      // Get rates
      getRates: ['validate', ({}, cbk) => {
        const rates = {};

        return asyncMapSeries(dates, (date, cbk) => {
          const roughDate = date.substring(0, dateFormat.length);

          // Exit early when the fiat value has already been found
          if (!!rates[roughDate]) {
            return cbk(null, {date, cents: rates[roughDate]});
          }

          return (rate || getHistoricRate)({
            currency,
            date,
            fiat,
            provider,
            request,
          },
          (err, rate) => {
            if (!!err) {
              return cbk(err);
            }

            rates[roughDate] = rate.cents;

            return cbk(null, {date, cents: rate.cents});
          });
        },
        (err, rates) => {
          if (!!err) {
            return cbk(err);
          }

          return cbk(null, {rates});
        });
      }],
    },
    returnResult({reject, resolve, of: 'getRates'}, cbk));
  });
};
