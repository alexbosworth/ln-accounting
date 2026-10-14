const {deepEqual} = require('node:assert').strict;
const {equal} = require('node:assert').strict;
const {rejects} = require('node:assert').strict;
const test = require('node:test');

const {getProxyTx} = require('./../../esplora');

const address = 'bc1zw508d6qejxtdg4y5r3zarvaryvg6kdaj';
const hash = Buffer.alloc(32).toString('hex');
const id = Buffer.alloc(32, 1).toString('hex');

const confirmed = {
  fee: 1,
  status: {block_hash: hash, block_height: 1, block_time: 1, confirmed: true},
  vout: [{scriptpubkey_address: address}],
};

const makeArgs = overrides => {
  const args = {id, request: ({}, cbk) => cbk(null, null, confirmed)};

  Object.keys(overrides).forEach(k => args[k] = overrides[k]);

  return args;
};

const tests = [
  {
    args: makeArgs({id: undefined}),
    description: 'An id is required',
    error: [400, 'ExpectedPaymentIdToGetProxyTransaction'],
  },
  {
    args: makeArgs({request: undefined}),
    description: 'A request function is required',
    error: [400, 'ExpectedRequestFunctionToGetProxyTransaction'],
  },
  {
    args: makeArgs({request: ({}, cbk) => cbk('err')}),
    description: 'Errors are passed back',
    error: [503, 'UnexpectedErrorGettingEsploraTx', {err: 'err'}],
  },
  {
    args: makeArgs({}),
    description: 'A confirmed mainnet transaction is returned',
    expected: {
      id,
      block_id: hash,
      confirmation_height: 1,
      created_at: '1970-01-01T00:00:01.000Z',
      fee: 1,
      is_confirmed: true,
      output_addresses: [address],
    },
  },
  {
    args: makeArgs({
      network: 'btctestnet',
      request: ({url}, cbk) => {
        equal(url, `https://blockstream.info/testnet/api/tx/${id}`);

        return cbk(null, null, {fee: 1, status: {}, vout: []});
      },
    }),
    description: 'An unconfirmed testnet transaction is returned',
    expected: {
      id,
      block_id: undefined,
      confirmation_height: undefined,
      fee: 1,
      is_confirmed: false,
      output_addresses: [],
    },
  },
];

tests.forEach(({args, description, error, expected}) => {
  return test(description, async () => {
    if (!!error) {
      await rejects(getProxyTx(args), error, 'Got expected error');
    } else {
      const res = await getProxyTx(args);

      // Unconfirmed transactions are stamped with the current date
      if (!expected.created_at) {
        equal(!!Date.parse(res.created_at), true, 'Got a created at date');

        delete res.created_at;
      }

      deepEqual(res, expected, 'Got expected result');
    }

    return;
  });
});
