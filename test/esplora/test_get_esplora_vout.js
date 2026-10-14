const {deepEqual} = require('node:assert').strict;
const {rejects} = require('node:assert').strict;
const test = require('node:test');

const method = require('./../../esplora/get_esplora_vout');

const makeArgs = overrides => {
  const args = {
    api: 'https://blockstream.info/api/',
    id: Buffer.alloc(32).toString('hex'),
    request: ({}, cbk) => cbk(null, null, {vout: [{value: 1}]}),
    vout: 0,
  };

  Object.keys(overrides).forEach(k => args[k] = overrides[k]);

  return args;
};

const tests = [
  {
    args: makeArgs({api: undefined}),
    description: 'An api is required',
    error: [400, 'ExpectedApiPathToGetEsploraVout'],
  },
  {
    args: makeArgs({id: undefined}),
    description: 'An id is required',
    error: [400, 'ExpectedTransactionIdToGetEsploraVout'],
  },
  {
    args: makeArgs({request: undefined}),
    description: 'A request method is required',
    error: [400, 'ExpectedRequestFunctionToGetEsploraVout'],
  },
  {
    args: makeArgs({vout: undefined}),
    description: 'A vout is required',
    error: [400, 'ExpectedTransactionOutputIndexToGetEsploraVout'],
  },
  {
    args: makeArgs({request: ({}, cbk) => cbk('err')}),
    description: 'Request errors are passed back',
    error: [503, 'UnexpectedErrorGettingExploraTx', {err: 'err'}],
  },
  {
    args: makeArgs({request: ({}, cbk) => cbk()}),
    description: 'A response body is expected',
    error: [503, 'ExpectedTxLookupResultForEsploraTx'],
  },
  {
    args: makeArgs({request: ({}, cbk) => cbk(null, null, {})}),
    description: 'Outputs are expected',
    error: [503, 'ExpectedOutputsArrayForExploraTx'],
  },
  {
    args: makeArgs({request: ({}, cbk) => cbk(null, null, {vout: []})}),
    description: 'The referenced output is expected',
    error: [503, 'ExpectedOutputInEsploraTxDetails'],
  },
  {
    args: makeArgs({request: ({}, cbk) => cbk(null, null, {vout: [{}]})}),
    description: 'An output value is expected',
    error: [503, 'ExpectedOutputValueInEsploraTxDetails'],
  },
  {
    args: makeArgs({}),
    description: 'Output value is returned',
    expected: {tokens: 1},
  },
];

tests.forEach(({args, description, error, expected}) => {
  return test(description, async () => {
    if (!!error) {
      await rejects(method(args), error, 'Got expected error');
    } else {
      deepEqual(await method(args), expected, 'Got expected result');
    }

    return;
  });
});
