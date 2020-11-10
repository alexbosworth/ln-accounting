const asyncAuto = require('async/auto');
const {returnResult} = require('asyncjs-util');

const dateFromEpoch = epoch => new Date(epoch * 1e3).toISOString();
const net = network => network === 'btctestnet' ? 'testnet/' : '';
const {isArray} = Array;
const supportedNetworks = ['btc', 'btctestnet'];
const url = (net, id) => `https://blockstream.info/${net}api/tx/${id}`;

/** Get transaction details from Blockstream

  {
    id: <Transaction Id Hex String>
    [network]: <Network Name String>
    request: <Request Function>
  }

  @returns via cbk or Promise
  {
    [confirmation_height]: <Confirmed In Block At Height Number>
    [created_at]: <Transaction Confirmation Date ISO 8601 Date String>
    [block_id]: <Confirmed In Block With Hash Hex String>
    fee: <Transaction Fee Tokens Number>
    output_addresses: [<Output Address String>]
  }
*/
module.exports = ({id, network, request, vout}, cbk) => {
  return new Promise((resolve, reject) => {
    return asyncAuto({
      // Check argument
      validate: cbk => {
        if (!id) {
          return cbk([400, 'ExpectedTransactionIdToGetBlockstreamTxFee']);
        }

        if (!!network && !supportedNetworks.includes(network)) {
          return cbk([400, 'UnsupportedNetworkToGetBlockstreamTxFee']);
        }

        if (!request) {
          return cbk([400, 'ExpectedRequestFunctionToGetBlockstreamTxFee']);
        }

        return cbk();
      },

      // Get tx details
      getDetails: ['validate', ({}, cbk) => {
        return request({
          json: true,
          url: url(net(network), id),
        },
        (err, r, body) => {
          if (!!err) {
            return cbk([503, 'UnexpectedErrorGettingBlockstreamTxFee', {err}]);
          }

          if (!body) {
            return cbk([503, 'ExpectedTxLookupResultForBlockstreamTxFee']);
          }

          if (body.fee === undefined) {
            return cbk([503, 'ExpectedTransactionFeeInResultFromBlockstream']);
          }

          if (!body.status) {
            return cbk([503, 'ExpectedStatusOfBlockstreamTransaction']);
          }

          if (!isArray(body.vout)) {
            return cbk([503, 'ExpectedOutputsInBlockstreamTransaction']);
          }

          // Exit early when transaction is not confirmed
          if (!body.status.confirmed) {
            return cbk(null, {
              fee: body.fee,
              output_addresses: body.vout.map(n => n.scriptpubkey_address),
            });
          }

          return cbk(null, {
            block_id: body.status.block_hash,
            confirmation_height: body.status.block_height,
            created_at: dateFromEpoch(body.status.block_time),
            fee: body.fee,
            output_addresses: body.vout.map(n => n.scriptpubkey_address),
          });
        });
      }],
    },
    returnResult({reject, resolve, of: 'getDetails'}, cbk));
  });
};
