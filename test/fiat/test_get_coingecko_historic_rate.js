const {deepEqual} = require('node:assert').strict;
const {fail} = require('node:assert').strict;
const {rejects} = require('node:assert').strict;
const test = require('node:test');

const method = require('./../../fiat/get_coingecko_historic_rate');

const makeArgs = overrides => {
  const args = {
    date: new Date().toISOString(),
    currency: 'BTC',
    fiat: 'USD',
    rates: {},
    request: ({qs}, cbk) => api({qs}, cbk),
  };

  Object.keys(overrides).forEach(k => args[k] = overrides[k]);

  return args;
};

const api = ({qs}, cbk) => {
  return cbk(null, null, {market_data: {current_price: {usd: 12.34}}});
};

const tests = [
  {
    args: makeArgs({currency: undefined}),
    description: 'A currency is required',
    error: [400, 'UnsupportedCurrencyForCoingeckoFiatRateLookup'],
  },
  {
    args: makeArgs({currency: 'ETH'}),
    description: 'Only BTC is supported as a currency',
    error: [400, 'UnsupportedCurrencyForCoingeckoFiatRateLookup'],
  },
  {
    args: makeArgs({date: undefined}),
    description: 'A date is required',
    error: [400, 'ExpectedDateForCoingeckoRateLookup'],
  },
  {
    args: makeArgs({fiat: undefined}),
    description: 'A fiat type is required',
    error: [400, 'UnsupportedFiatTypeForCoingeckoFiatRateLookup'],
  },
  {
    args: makeArgs({fiat: 'EUR'}),
    description: 'Only USD is supported as a fiat type',
    error: [400, 'UnsupportedFiatTypeForCoingeckoFiatRateLookup'],
  },
  {
    args: makeArgs({rates: undefined}),
    description: 'A rates object is required',
    error: [400, 'ExpectedKnownRatesForCoingeckoFiatRateLookup'],
  },
  {
    args: makeArgs({request: undefined}),
    description: 'A request method is required',
    error: [400, 'ExpectedRequestMethodForCoingeckoFiatRateLookup'],
  },
  {
    args: makeArgs({request: ({}, cbk) => cbk('err')}),
    description: 'Errors returned from request',
    error: [503, 'UnexpectedErrGettingCoingeckoPastRate', {err: 'err'}],
  },
  {
    args: makeArgs({request: ({}, cbk) => cbk()}),
    description: 'A body is expected in response',
    error: [503, 'UnexpectedResponseInCoingeckoPastRateResponse'],
  },
  {
    args: makeArgs({request: ({}, cbk) => cbk(null, null, {})}),
    description: 'Market data is expected in response',
    error: [503, 'UnexpectedResponseInCoingeckoPastRateResponse'],
  },
  {
    args: makeArgs({request: ({}, cbk) => cbk(null, null, {market_data: {}})}),
    description: 'A current price is expected in market data',
    error: [503, 'UnexpectedResponseInCoingeckoPastRateResponse'],
  },
  {
    args: makeArgs({
      request: ({}, cbk) => cbk(null, null, {
        market_data: {current_price: {}},
      }),
    }),
    description: 'A price is expected in response',
    error: [503, 'ExpectedCoingeckoCurrentPriceForFiat'],
  },
  {
    args: makeArgs({}),
    description: 'Get coingecko historic rate',
    expected: {cents: 1234},
  },
  {
    args: makeArgs({
      date: '2020-01-02T03:04:05.000Z',
      rates: {'2020-01-02T12:00:00.000Z': 5678},
      request: ({}, cbk) => fail('Expected cached rate to be used'),
    }),
    description: 'A known rate for the same day is used instead of a request',
    expected: {cents: 5678},
  },
  {
    args: makeArgs({
      date: '2020-01-02T03:04:05.000Z',
      rates: {'2020-01-01T03:04:05.000Z': 5678},
    }),
    description: 'A known rate for a different day is not used',
    expected: {cents: 1234},
  },
  {
    args: makeArgs({
      date: '2020-01-02T03:04:05.000Z',
      rates: {'2020-01-02T03:04:05.000Z': 0},
    }),
    description: 'A falsy known rate falls back to a request',
    expected: {cents: 1234},
  },
  {
    args: makeArgs({
      date: '2020-01-02T03:04:05.000Z',
      request: (args, cbk) => {
        deepEqual(args, {
          json: true,
          qs: {date: '02-01-2020', localization: false},
          timeout: 30000,
          url: 'https://api.coingecko.com/api/v3/coins/bitcoin/history',
        });

        return api(args, cbk);
      },
    }),
    description: 'Request is made with the expected arguments',
    expected: {cents: 1234},
  },
];

tests.forEach(({args, description, error, expected}) => {
  return test(description, async () => {
    if (!!error) {
      await rejects(method(args), error, 'Got expected error');
    } else {
      const res = await method(args);

      deepEqual(res, expected, 'Got expected return value');
    }

    return;
  });
});
