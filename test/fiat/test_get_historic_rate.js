const {test} = require('@alexbosworth/tap');

const getHistoricRate = require('./../../fiat/get_historic_rate');

const date = new Date().toISOString();

const api = ({}, cbk) => {
  return cbk(null, null, {market_data: {current_price: {usd: 12.34}}});
};

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

const tests = [
  {
    args: makeArgs({currency: undefined}),
    description: 'A currency code is required',
    error: [400, 'ExpectedCurrencyToGetHistoricRate'],
  },
  {
    args: makeArgs({date: undefined}),
    description: 'A date is required',
    error: [400, 'ExpectedDateToGetHistoricRate'],
  },
  {
    args: makeArgs({fiat: undefined}),
    description: 'A fiat type is required to get historic rate',
    error: [400, 'ExpectedFiatToGetHistoricRate'],
  },
  {
    args: makeArgs({rates: undefined}),
    description: 'Past rates are required to get historic rate',
    error: [400, 'ExpectedRatesToGetHistoricRate'],
  },
  {
    args: makeArgs({request: undefined}),
    description: 'A request function is required to get historic rate',
    error: [400, 'ExpectedRequestFunctionToGetHistoricRate'],
  },
  {
    args: makeArgs({provider: 'provider'}),
    description: 'A known rate provider is required to get historic rate',
    error: [400, 'ExpectedKnownRateProviderToGetHistoricRate'],
  },
  {
    args: makeArgs({}),
    description: 'Get historic fiat rates',
    expected: {cents: 1234},
  },
];

tests.forEach(({args, description, error, expected}) => {
  return test(description, async ({end, equal, rejects}) => {
    if (!!error) {
      rejects(getHistoricRate(args), error, 'Gote expected error');
    } else {
      const {cents} = await getHistoricRate(args);

      equal(cents, expected.cents, 'Rate returned');
    }

    return end();
  });
});
