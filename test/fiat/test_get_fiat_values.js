const {test} = require('@alexbosworth/tap');

const {getFiatValues} = require('./../../fiat/');

const date = new Date().toISOString();

const tests = [
  {
    args: {},
    description: 'Currency code is required',
    error: [400, 'ExpectedCurrencyToGetFiatValues'],
  },
  {
    args: {currency: 'BTC'},
    description: 'Dates are required',
    error: [400, 'ExpectedDatesToGetFiatValues'],
  },
  {
    args: {currency: 'BTC', dates: [date]},
    description: 'Fiat type is required',
    error: [400, 'ExpectedFiatTypeToGetFiatValues'],
  },
  {
    args: {currency: 'BTC', dates: [date], fiat: 'USD'},
    description: 'Rate method or request function is required',
    error: [400, 'ExpectedRateMethodOrRequestMethodToGetFiat'],
  },
  {
    args: {
      currency: 'BTC',
      dates: [date],
      fiat: 'USD',
      rate: ({}, cbk) => cbk('err'),
    },
    description: 'Rate method errors are passed back',
    error: 'err',
  },
  {
    args: {
      currency: 'BTC',
      dates: [date],
      fiat: 'USD',
      rate: ({}, cbk) => cbk(null, {cents: 123456}),
    },
    description: 'Get historic fiat rates',
    expected: {rates: [{date, cents: 123456}]},
  },
  {
    args: {
      currency: 'BTC',
      dates: [date, date],
      fiat: 'USD',
      rate: ({}, cbk) => cbk(null, {cents: 123456}),
    },
    description: 'Get historic fiat rates when the rate is already got',
    expected: {rates: [{date, cents: 123456}, {date, cents: 123456}]},
  },
];

tests.forEach(({args, description, error, expected}) => {
  return test(description, async ({deepIs, end, equal, rejects}) => {
    if (!!error) {
      rejects(getFiatValues(args), error, 'Got expected error');
    } else {
      const {rates} = await getFiatValues(args);

      deepIs(rates, expected.rates, 'Rates returned');
    }

    return end();
  });
});
