const {test} = require('tap');

const {getFiatValues} = require('./../../fiat/');

const date = new Date().toISOString();

const tests = [
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
];

tests.forEach(({args, description, expected}) => {
  return test(description, async ({deepIs, end, equal}) => {
    const {rates} = await getFiatValues(args);

    deepIs(rates, expected.rates, 'Rates returned');

    return end();
  });
});
