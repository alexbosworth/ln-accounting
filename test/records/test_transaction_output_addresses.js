const {deepEqual} = require('node:assert').strict;
const test = require('node:test');
const {throws} = require('node:assert').strict;

const {decodeBase58Address} = require('@alexbosworth/blockchain');
const {decodeBech32Address} = require('@alexbosworth/blockchain');
const {encodeBase58Address} = require('@alexbosworth/blockchain');
const {encodeBech32Address} = require('@alexbosworth/blockchain');
const {outputScriptForAddress} = require('@alexbosworth/blockchain');

const addresses = require('./../../records/transaction_output_addresses');
const {makeRawTransaction} = require('./../fixtures');

const network = 'btc';
const opReturnScript = '6a04' + '00'.repeat(4);
const tokens = 1;

const script = address => outputScriptForAddress({address, network}).script;

const rawTx = scripts => {
  const outputs = scripts.map(n => ({tokens, script: n}));

  return makeRawTransaction({outputs}).transaction;
};

// Known mainnet addresses: P2PKH, P2SH, P2WPKH, P2WSH, P2TR
const mainnet = [
  '1A1zP1eP5QGefi2DMPTfTL5SLmv7DivfNa',
  '3J98t1WpEZ73CNmQviecrnyiWrnqRhWNLy',
  'bc1qw508d6qejxtdg4y5r3zarvary0c5xw7kv8f3t4',
  'bc1qrp33g0q5c5txsp9arysrx4k6zdkfs4nce4xj0gdcccefvpysxf3qccfmv3',
  'bc1p0xlxvlhemja6c4dqv22uapctqupfhlxm9h8z3k2e72q4k9hcz7vqzk5jj0',
];

const scripts = mainnet.map(script);

// The same scripts encode as testnet addresses with testnet prefixes
const testnet = [
  encodeBase58Address({
    hash: decodeBase58Address({address: mainnet[0]}).hash,
    version: 111,
  }).address,
  encodeBase58Address({
    hash: decodeBase58Address({address: mainnet[1]}).hash,
    version: 196,
  }).address,
  encodeBech32Address({
    prefix: 'tb',
    program: decodeBech32Address({address: mainnet[2]}).program,
    version: 0,
  }).address,
  encodeBech32Address({
    prefix: 'tb',
    program: decodeBech32Address({address: mainnet[3]}).program,
    version: 0,
  }).address,
  encodeBech32Address({
    prefix: 'tb',
    program: decodeBech32Address({address: mainnet[4]}).program,
    version: 1,
  }).address,
];

const tests = [
  {
    args: {},
    description: 'A raw transaction is required',
    error: 'ExpectedRawTransactionToDeriveOutputAddresses',
  },
  {
    args: {network: 'unknown', transaction: rawTx([])},
    description: 'A known network is required',
    error: 'UnsupportedNetworkToDeriveOutputAddresses',
  },
  {
    args: {transaction: rawTx([].concat(scripts).concat([opReturnScript]))},
    description: 'Standard output addresses are derived for the default net',
    expected: {addresses: mainnet},
  },
  {
    args: {network: 'btctestnet', transaction: rawTx(scripts)},
    description: 'Standard output addresses are derived for a test network',
    expected: {addresses: testnet},
  },
];

tests.forEach(({args, description, error, expected}) => {
  return test(description, (t, end) => {
    if (!!error) {
      throws(() => addresses(args), new Error(error), 'Got error');
    } else {
      deepEqual(addresses(args), expected, 'Got expected addresses');
    }

    return end();
  });
});
