const {test} = require('@alexbosworth/tap');

const method = require('./../../blockstream/get_blockstream_tx');

const makeArgs = overrides => {
  const args = {
    id: Buffer.alloc(32).toString('hex'),
    network: 'btc',
    request: ({}, cbk) => cbk(null, null, {
      fee: 1,
      status: {
        block_hash: Buffer.alloc(32).toString('hex'),
        block_height: 1,
        block_time: 1,
        confirmed: true,
      },
      vout: [{scriptpubkey_address: 'bc1zw508d6qejxtdg4y5r3zarvaryvg6kdaj'}],
    }),
  };

  Object.keys(overrides).forEach(k => args[k] = overrides[k]);

  return args;
};

const tests = [
  {
    args: makeArgs({id: undefined}),
    description: 'An id is required',
    error: [400, 'ExpectedTransactionIdToGetBlockstreamTxFee'],
  },
  {
    args: makeArgs({network: 'network'}),
    description: 'A known network is required',
    error: [400, 'UnsupportedNetworkToGetBlockstreamTxFee'],
  },
  {
    args: makeArgs({request: undefined}),
    description: 'A request method is required',
    error: [400, 'ExpectedRequestFunctionToGetBlockstreamTxFee'],
  },
  {
    args: makeArgs({request: ({}, cbk) => cbk('err')}),
    description: 'Request errors are passed back',
    error: [503, 'UnexpectedErrorGettingBlockstreamTxFee', {err: 'err'}],
  },
  {
    args: makeArgs({request: ({}, cbk) => cbk()}),
    description: 'A response body is expected',
    error: [503, 'ExpectedTxLookupResultForBlockstreamTxFee'],
  },
  {
    args: makeArgs({request: ({}, cbk) => cbk(null, null, {})}),
    description: 'A transaction fee is required',
    error: [503, 'ExpectedTransactionFeeInResultFromBlockstream'],
  },
  {
    args: makeArgs({request: ({}, cbk) => cbk(null, null, {fee: 1})}),
    description: 'Transaction status is required',
    error: [503, 'ExpectedStatusOfBlockstreamTransaction'],
  },
  {
    args: makeArgs({
      request: ({}, cbk) => cbk(null, null, {fee: 1, status: {}}),
    }),
    description: 'A vout array is required',
    error: [503, 'ExpectedOutputsInBlockstreamTransaction'],
  },
  {
    args: makeArgs({
      network: 'btctestnet',
      request: ({}, cbk) => cbk(null, null, {
        fee: 1,
        status: {},
        vout: [{scriptpubkey_address: 'bc1zw508d6qejxtdg4y5r3zarvaryvg6kdaj'}],
      }),
    }),
    description: 'An unconfirmed tx is returned',
    expected: {
      fee: 1,
      output_addresses: ['bc1zw508d6qejxtdg4y5r3zarvaryvg6kdaj'],
    },
  },
  {
    args: makeArgs({}),
    description: 'Blockstream tx info is returned',
    expected: {
      confirmation_height: 1,
      created_at: '1970-01-01T00:00:01.000Z',
      block_id: Buffer.alloc(32).toString('hex'),
      fee: 1,
      output_addresses: ['bc1zw508d6qejxtdg4y5r3zarvaryvg6kdaj']
    },
  },
];

tests.forEach(({args, description, error, expected}) => {
  return test(description, async ({end, rejects, strictSame}) => {
    if (!!error) {
      await rejects(method(args), error, 'Got expected error');
    } else {
      const res = await method(args);

      strictSame(res, expected, 'Got expected result');
    }

    return end();
  });
});
