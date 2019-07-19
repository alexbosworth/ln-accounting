const {test} = require('tap');

const getCoindeskHistoricRate = require('./../../fiat/get_coindesk_historic_rate');

const api = ({qs}, cbk) => {
  const bpi = {};

  bpi[qs.start] = 12.34;

  return cbk(null, null, {bpi});
};

const tests = [
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

tests.forEach(({args, description, expected}) => {
  return test(description, async ({end, equal}) => {
    const {cents} = await getCoindeskHistoricRate(args);

    equal(cents, expected.cents, 'Cents returned');

    return end();
  });
});
