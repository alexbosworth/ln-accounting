const asyncAuto = require('async/auto');
const {returnResult} = require('asyncjs-util');

const getEsploraTx = require('./get_esplora_tx');

const apiBlockstreamBtc = 'https://blockstream.info/api/';
const apiBlockstreamBtcTestnet = 'https://blockstream.info/testnet/api/';
const apiMempoolSpaceBtc = 'https://mempool.space/api/';
const btcTestnet = 'btctestnet';
const random = arr => arr[Math.floor(Math.random() * arr.length)];

/** Get a transaction as a proxy for a local transaction

  {
    id: <Transaction Id Hex String>
    [network]: <Network Name String>
    request: <Request Function>
  }

  @returns via cbk or Promise
  {
    [block_id]: <Block Hash Hex String>
    [confirmation_height]: <Transaction Confirmed At Height Number>
    created_at: <Transaction Created At ISO 8601 Date String>>
    fee: <Transaction Fee Tokens Number>
    id: <Transaction Id Hex String>
    is_confirmed: <Transaction Confirmed Bool>
    output_addresses: [<Transaction Output Address String>]
  }
*/
module.exports = ({id, network, request}, cbk) => {
  return new Promise((resolve, reject) => {
    return asyncAuto({
      // Check arguments
      validate: cbk => {
        if (!id) {
          return cbk([400, 'ExpectedPaymentIdToGetProxyTransaction']);
        }

        if (!request) {
          return cbk([400, 'ExpectedRequestFunctionToGetProxyTransaction']);
        }

        return cbk();
      },

      // Determine the API to use
      api: ['validate', ({}, cbk) => {
        if (network === btcTestnet) {
          return cbk(null, apiBlockstreamBtcTestnet);
        }

        return cbk(null, random([apiBlockstreamBtc, apiMempoolSpaceBtc]));
      }],

      // Get transaction
      getTx: ['api', ({api}, cbk) => getEsploraTx({api, id, request}, cbk)],

      // Transaction details
      tx: ['getTx', ({api, getTx}, cbk) => {
        return cbk(null, {
          id,
          block_id: getTx.block_id,
          confirmation_height: getTx.confirmation_height,
          created_at: getTx.created_at || new Date().toISOString(),
          fee: getTx.fee,
          is_confirmed: !!getTx.block_id,
          output_addresses: getTx.output_addresses,
        });
      }],
    },
    returnResult({reject, resolve, of: 'tx'}, cbk));
  });
};
