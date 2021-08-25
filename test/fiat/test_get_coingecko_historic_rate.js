const {test} = require('@alexbosworth/tap');

const method = require('./../../fiat/get_coingecko_historic_rate');

const api = ({qs}, cbk) => {
  return cbk(null, null, {market_data: {current_price: {usd: 12.34}}});
};

const tests = [
  {
    args: {},
    description: 'A currency is required',
    error: [400, 'UnsupportedCurrencyForCoingeckoFiatRateLookup'],
  },
  {
    args: {currency: 'BTC'},
    description: 'A date is required',
    error: [400, 'ExpectedDateForCoingeckoRateLookup'],
  },
  {
    args: {currency: 'BTC', date: new Date().toISOString()},
    description: 'A currency type is required',
    error: [400, 'UnsupportedFiatTypeForCoingeckoFiatRateLookup'],
  },
  {
    args: {currency: 'BTC', date: new Date().toISOString(), fiat: 'USD'},
    description: 'A request method is required',
    error: [400, 'ExpectedRequestMethodForCoingeckoFiatRateLookup'],
  },
  {
    args: {
      date: new Date().toISOString(),
      currency: 'BTC',
      fiat: 'USD',
      request: ({}, cbk) => cbk('err'),
    },
    description: 'Errors returned from request',
    error: [503, 'UnexpectedErrGettingCoingeckoPastRate', {err: 'err'}],
  },
  {
    args: {
      date: new Date().toISOString(),
      currency: 'BTC',
      fiat: 'USD',
      request: ({}, cbk) => cbk(),
    },
    description: 'A body is expected in response',
    error: [503, 'UnexpectedResponseInCoingeckoPastRateResponse'],
  },
  {
    args: {
      date: new Date().toISOString(),
      currency: 'BTC',
      fiat: 'USD',
      request: ({}, cbk) => cbk(null, null, {
        market_data: {current_price: {}},
      }),
    },
    description: 'A price is expected in response',
    error: [503, 'ExpectedCoingeckoCurrentPriceForFiat'],
  },
  {
    args: {
      date: new Date().toISOString(),
      currency: 'BTC',
      fiat: 'USD',
      request: ({qs}, cbk) => api({qs}, cbk),
    },
    description: 'Get coindesk historic rate',
    expected: {cents: 1234},
  },
];

tests.forEach(({args, description, error, expected}) => {
  return test(description, async ({end, rejects, strictSame}) => {
    if (!!error) {
      await rejects(method(args), error, 'Got expected error');
    } else {
      const res = await method(args);

      strictSame(res, expected, 'Got expected return value');
    }

    return end();
  });
});
