const {test} = require('@alexbosworth/tap');

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
