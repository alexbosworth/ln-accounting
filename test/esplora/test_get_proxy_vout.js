const {deepEqual} = require('node:assert').strict;
const {equal} = require('node:assert').strict;
const {rejects} = require('node:assert').strict;
const test = require('node:test');

const {getProxyVout} = require('./../../esplora');

const id = Buffer.alloc(32, 1).toString('hex');

const makeArgs = overrides => {
  const args = {
    id,
    request: ({}, cbk) => cbk(null, null, {vout: [{value: 1}]}),
    vout: 0,
  };

  Object.keys(overrides).forEach(k => args[k] = overrides[k]);

  return args;
};

const tests = [
  {
    args: makeArgs({id: undefined}),
    description: 'An id is required',
    error: [400, 'ExpectedPaymentIdToGetProxyVout'],
  },
  {
    args: makeArgs({request: undefined}),
    description: 'A request function is required',
    error: [400, 'ExpectedRequestFunctionToGetProxyVout'],
  },
  {
    args: makeArgs({vout: undefined}),
    description: 'A vout is required',
    error: [400, 'ExpectedTransactionOutputIndexToGetProxyVout'],
  },
  {
    args: makeArgs({}),
    description: 'A mainnet vout is returned',
    expected: {tokens: 1},
  },
  {
    args: makeArgs({
      network: 'btctestnet',
      request: ({url}, cbk) => {
        equal(url, `https://blockstream.info/testnet/api/tx/${id}`);

        return cbk(null, null, {vout: [{value: 2}]});
      },
    }),
    description: 'A testnet vout is returned',
    expected: {tokens: 2},
  },
];

tests.forEach(({args, description, error, expected}) => {
  return test(description, async () => {
    if (!!error) {
      await rejects(getProxyVout(args), error, 'Got expected error');
    } else {
      deepEqual(await getProxyVout(args), expected, 'Got expected result');
    }

    return;
  });
});
