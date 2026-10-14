const {deepEqual} = require('node:assert').strict;
const {rejects} = require('node:assert').strict;
const test = require('node:test');

const method = require('./../../esplora/get_esplora_tx');

const address = 'bc1zw508d6qejxtdg4y5r3zarvaryvg6kdaj';
const hash = Buffer.alloc(32).toString('hex');

const makeArgs = overrides => {
  const args = {
    api: 'https://blockstream.info/api/',
    id: Buffer.alloc(32).toString('hex'),
    request: ({}, cbk) => cbk(null, null, {
      fee: 1,
      status: {
        block_hash: hash,
        block_height: 1,
        block_time: 1,
        confirmed: true,
      },
      vout: [{scriptpubkey_address: address}],
    }),
  };

  Object.keys(overrides).forEach(k => args[k] = overrides[k]);

  return args;
};

const tests = [
  {
    args: makeArgs({api: undefined}),
    description: 'An api is required',
    error: [400, 'ExpectedBaseEsploraApiToGetEsploraTx'],
  },
  {
    args: makeArgs({id: undefined}),
    description: 'An id is required',
    error: [400, 'ExpectedTransactionIdToGetEsploraTx'],
  },
  {
    args: makeArgs({request: undefined}),
    description: 'A request method is required',
    error: [400, 'ExpectedRequestFunctionToGetEsploraTx'],
  },
  {
    args: makeArgs({request: ({}, cbk) => cbk('err')}),
    description: 'Request errors are passed back',
    error: [503, 'UnexpectedErrorGettingEsploraTx', {err: 'err'}],
  },
  {
    args: makeArgs({request: ({}, cbk) => cbk()}),
    description: 'A response body is expected',
    error: [503, 'ExpectedTxLookupResultForEsploraTx'],
  },
  {
    args: makeArgs({request: ({}, cbk) => cbk(null, null, {})}),
    description: 'A transaction fee is required',
    error: [503, 'ExpectedTransactionFeeInResultFromEsplora'],
  },
  {
    args: makeArgs({request: ({}, cbk) => cbk(null, null, {fee: 1})}),
    description: 'Transaction status is required',
    error: [503, 'ExpectedStatusOfEsploraTransaction'],
  },
  {
    args: makeArgs({
      request: ({}, cbk) => cbk(null, null, {fee: 1, status: {}}),
    }),
    description: 'A vout array is required',
    error: [503, 'ExpectedOutputsInEsploraTransaction'],
  },
  {
    args: makeArgs({
      request: ({}, cbk) => cbk(null, null, {
        fee: 1,
        status: {},
        vout: [{scriptpubkey_address: address}],
      }),
    }),
    description: 'An unconfirmed tx is returned',
    expected: {fee: 1, output_addresses: [address]},
  },
  {
    args: makeArgs({}),
    description: 'Esplora tx info is returned',
    expected: {
      block_id: hash,
      confirmation_height: 1,
      created_at: '1970-01-01T00:00:01.000Z',
      fee: 1,
      output_addresses: [address],
    },
  },
];

tests.forEach(({args, description, error, expected}) => {
  return test(description, async () => {
    if (!!error) {
      await rejects(method(args), error, 'Got expected error');
    } else {
      const res = await method(args);

      deepEqual(res, expected, 'Got expected result');
    }

    return;
  });
});
