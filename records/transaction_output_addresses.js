const {componentsOfTransaction} = require('@alexbosworth/blockchain');
const {encodeBase58Address} = require('@alexbosworth/blockchain');
const {encodeBech32Address} = require('@alexbosworth/blockchain');

const networks = require('./conf/networks.json');

const defaultNetwork = 'btc';
const hashIn = (pattern, script) => (script.match(pattern) || [])[1];
const hexAsBuffer = hex => Buffer.from(hex, 'hex');
const p2pkhPattern = /^76a914([0-9a-f]{40})88ac$/i;
const p2shPattern = /^a914([0-9a-f]{40})87$/i;
const p2trPattern = /^5120([0-9a-f]{64})$/i;
const p2wpkhPattern = /^0014([0-9a-f]{40})$/i;
const p2wshPattern = /^0020([0-9a-f]{64})$/i;
const versionTaproot = 1;
const versionWitnessInitial = 0;

/** Addresses of the standard outputs of a raw transaction

  Outputs that do not have a standard address form are omitted

  Supported networks: btc, btcregtest, btcsignet, btctestnet, btctestnet4

  {
    [network]: <Network Name String>
    transaction: <Raw Transaction Hex String>
  }

  @throws
  <Error>

  @returns
  {
    addresses: [<Output Address String>]
  }
*/
module.exports = ({network, transaction}) => {
  if (!transaction) {
    throw new Error('ExpectedRawTransactionToDeriveOutputAddresses');
  }

  const conf = networks[network || defaultNetwork];

  if (!conf) {
    throw new Error('UnsupportedNetworkToDeriveOutputAddresses');
  }

  const {outputs} = componentsOfTransaction({transaction});

  const addresses = outputs.map(({script}) => {
    const p2pkh = hashIn(p2pkhPattern, script);

    if (!!p2pkh) {
      const hash = hexAsBuffer(p2pkh);

      return encodeBase58Address({hash, version: conf.p2pkh}).address;
    }

    const p2sh = hashIn(p2shPattern, script);

    if (!!p2sh) {
      const hash = hexAsBuffer(p2sh);

      return encodeBase58Address({hash, version: conf.p2sh}).address;
    }

    const p2wpkh = hashIn(p2wpkhPattern, script);

    if (!!p2wpkh) {
      return encodeBech32Address({
        prefix: conf.bech32,
        program: hexAsBuffer(p2wpkh),
        version: versionWitnessInitial,
      }).address;
    }

    const p2wsh = hashIn(p2wshPattern, script);

    if (!!p2wsh) {
      return encodeBech32Address({
        prefix: conf.bech32,
        program: hexAsBuffer(p2wsh),
        version: versionWitnessInitial,
      }).address;
    }

    const p2tr = hashIn(p2trPattern, script);

    if (!!p2tr) {
      return encodeBech32Address({
        prefix: conf.bech32,
        program: hexAsBuffer(p2tr),
        version: versionTaproot,
      }).address;
    }

    // Outputs with non-standard scripts have no address
    return;
  });

  return {addresses: addresses.filter(n => !!n)};
};
