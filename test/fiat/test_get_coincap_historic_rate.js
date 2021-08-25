const {test} = require('@alexbosworth/tap');

const getCoincapHistoricRate = require('./../../fiat/get_coincap_historic_rate');

const date = new Date().toISOString();

const api = ({}, cbk) => cbk(null, null, {data: [{date, priceUsd: 12.3401}]});

const tests = [
  {
    args: {},
    description: 'A currency code is required',
    error: [400, 'UnsupportedCurrencyForCoincapFiatRateLookup'],
  },
  {
    args: {currency: 'BTC'},
    description: 'A date is required',
    error: [400, 'ExpectedDateForHistoricCoincapRateLookup'],
  },
  {
    args: {date, currency: 'BTC'},
    description: 'A fiat code is required',
    error: [400, 'UnsupportedFiatTypeForCoincapFiatRateLookup'],
  },
  {
    args: {date, currency: 'BTC', fiat: 'USD'},
    description: 'A request function is required',
    error: [400, 'ExpectedRequestMethodForCoincapFiatRateLookup'],
  },
  {
    args: {date, currency: 'BTC', fiat: 'USD', request: ({}, cbk) => cbk('e')},
    description: 'A request error is returned',
    error: [503, 'UnexpectedErrorGettingCoincapRate', {err: 'e'}],
  },
  {
    args: {date, currency: 'BTC', fiat: 'USD', request: ({}, cbk) => cbk()},
    description: 'A body is expected',
    error: [503, 'UnexpectedResponseGettingCoincapRate'],
  },
  {
    args: {
      date,
      currency: 'BTC',
      fiat: 'USD',
      request: ({}, cbk) => cbk(null, null, {data: [{}]}),
    },
    description: 'Price details are expected',
    error: [503, 'ExpectedDateForPriceQuoteInCoincapResponse'],
  },
  {
    args: {
      date,
      currency: 'BTC',
      fiat: 'USD',
      request: ({}, cbk) => cbk(null, null, {data: [{date}]}),
    },
    description: 'Fiat price is expected in response',
    error: [503, 'ExpectedFiatPriceInCoincapResponse'],
  },
  {
    args: {
      date,
      currency: 'BTC',
      fiat: 'USD',
      request: ({}, cbk) => api({}, cbk),
    },
    description: 'Get coincap historic rate',
    expected: {cents: 1234},
  },
];

tests.forEach(({args, description, error, expected}) => {
  return test(description, async ({end, equal, rejects}) => {
    if (!!error) {
      rejects(getCoincapHistoricRate(args), error, 'Got expected error');
    } else {
      const {cents} = await getCoincapHistoricRate(args);

      equal(cents, expected.cents, 'Cents returned');
    }

    return end();
  });
});
