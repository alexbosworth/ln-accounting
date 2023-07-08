const {equal} = require('node:assert').strict;
const {rejects} = require('node:assert').strict;
const test = require('node:test');

const method = require('./../../fiat/get_coindesk_historic_rate');

const api = ({qs}, cbk) => {
  const bpi = {};

  bpi[qs.start] = 12.34;

  return cbk(null, null, {bpi});
};

const tests = [
  {
    args: {},
    description: 'A currency is required',
    error: [400, 'UnsupportedCurrencyForCoindeskFiatRateLookup'],
  },
  {
    args: {currency: 'BTC'},
    description: 'A date is required',
    error: [400, 'ExpectedDateForCoindeskRateLookup'],
  },
  {
    args: {currency: 'BTC', date: new Date().toISOString()},
    description: 'A currency type is required',
    error: [400, 'UnsupportedFiatTypeForCoindeskFiatRateLookup'],
  },
  {
    args: {currency: 'BTC', date: new Date().toISOString(), fiat: 'USD'},
    description: 'A request method is required',
    error: [400, 'ExpectedRequestMethodForCoindeskFiatRateLookup'],
  },
  {
    args: {
      date: new Date().toISOString(),
      currency: 'BTC',
      fiat: 'USD',
      request: ({}, cbk) => cbk('err'),
    },
    description: 'Errors returned from coindesk request',
    error: [503, 'UnexpectedErrorGettingHistoricRate', {err: 'err'}],
  },
  {
    args: {
      date: new Date().toISOString(),
      currency: 'BTC',
      fiat: 'USD',
      request: ({}, cbk) => cbk(),
    },
    description: 'A body is expected in coindesk response',
    error: [503, 'UnexpectedResponseInHistoricRateResponse'],
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
  return test(description, async () => {
    if (!!error) {
      await rejects(method(args), error, 'Got expected error');
    } else {
      const {cents} = await method(args);

      equal(cents, expected.cents, 'Cents returned');
    }

    return;
  });
});
