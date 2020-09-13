const {test} = require('tap');

const getHistoricRate = require('./../../fiat/get_historic_rate');

const date = new Date().toISOString();

const api = ({}, cbk) => cbk(null, null, {data: [{date, priceUsd: 12.3401}]});

const tests = [
  {
    args: {},
    description: 'A currency code is required',
    error: [400, 'ExpectedCurrencyToGetHistoricRate'],
  },
  {
    args: {currency: 'BTC'},
    description: 'A date is required',
    error: [400, 'ExpectedDateToGetHistoricRate'],
  },
  {
    args: {date, currency: 'BTC'},
    description: 'A fiat type is required to get historic rate',
    error: [400, 'ExpectedFiatToGetHistoricRate'],
  },
  {
    args: {date, currency: 'BTC', fiat: 'USD'},
    description: 'A request function is required to get historic rate',
    error: [400, 'ExpectedRequestFunctionToGetHistoricRate'],
  },
  {
    args: {
      date,
      currency: 'BTC',
      fiat: 'USD',
      provider: 'provider',
      request: () => {},
    },
    description: 'A request function is required to get historic rate',
    error: [400, 'ExpectedKnownRateProviderToGetHistoricRate'],
  },
  {
    args: {
      date,
      currency: 'BTC',
      fiat: 'USD',
      request: ({qs}, cbk) => api({qs}, cbk),
    },
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
