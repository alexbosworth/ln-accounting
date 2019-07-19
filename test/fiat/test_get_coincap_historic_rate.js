const {test} = require('tap');

const getCoincapHistoricRate = require('./../../fiat/get_coincap_historic_rate');

const date = new Date().toISOString();

const api = ({}, cbk) => cbk(null, null, {data: [{date, priceUsd: 12.3401}]});

const tests = [
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

tests.forEach(({args, description, expected}) => {
  return test(description, async ({end, equal}) => {
    const {cents} = await getCoincapHistoricRate(args);

    equal(cents, expected.cents, 'Cents returned');

    return end();
  });
});
