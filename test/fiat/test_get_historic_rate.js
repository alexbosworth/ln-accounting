const {test} = require('tap');

const getHistoricRate = require('./../../fiat/get_historic_rate');

const date = new Date().toISOString();

const api = ({qs}, cbk) => {
  const bpi = {};

  bpi[qs.start] = 12.34;

  return cbk(null, null, {bpi});
};

const tests = [
  {
    args: {
      currency: 'BTC',
      date: date,
      fiat: 'USD',
      request: ({qs}, cbk) => api({qs}, cbk),
    },
    description: 'Get historic fiat rates',
    expected: {cents: 1234},
  },
];

tests.forEach(({args, description, expected}) => {
  return test(description, async ({end, equal}) => {
    const {cents} = await getHistoricRate(args);

    equal(cents, expected.cents, 'Rate returned');

    return end();
  });
});
