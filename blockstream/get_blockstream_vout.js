const asyncAuto = require('async/auto');
const {returnResult} = require('asyncjs-util');

const net = network => network === 'btctestnet' ? 'testnet/' : '';
const {isArray} = Array;
const supportedNetworks = ['btc', 'btctestnet'];
const url = (net, id) => `https://blockstream.info/${net}api/tx/${id}`;

/** Get tx vout details from Blockstream

  {
    id: <Transaction Id Hex String>
    [network]: <Network Name String>
    request: <Request Function>
    vout: <Transaction Output Index Number>
  }

  @returns via cbk or Promise
  {
    tokens: <Transaction Output Tokens Number>
  }
*/
module.exports = ({id, network, request, vout}, cbk) => {
  return new Promise((resolve, reject) => {
    return asyncAuto({
      // Check argument
      validate: cbk => {
        if (!id) {
          return cbk([400, 'ExpectedTransactionIdToGetBlockstreamVout']);
        }

        if (!!network && !supportedNetworks.includes(network)) {
          return cbk([400, 'UnsupportedNetworkToGetBlockstreamVout']);
        }

        if (!request) {
          return cbk([400, 'ExpectedRequestFunctionToGetBlockstreamVout']);
        }

        if (vout === undefined) {
          return cbk([400, 'ExpectedTransactionOutputIndexToGetVoutDetails']);
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
            return cbk([503, 'UnexpectedErrorGettingBlockstreamTx', {err}]);
          }

          if (!body) {
            return cbk([503, 'ExpectedTxLookupResultForBlockstreamTx']);
          }

console.log("BODY", body)

          if (!isArray(body.vout)) {
            return cbk([503, 'ExpectedOutputsArrayForBlockstreamTx']);
          }

          if (!body.vout[vout]) {
            return cbk([503, 'ExpectedOutputInBlockstreamTxDetails']);
          }

          if (!body.vout[vout].value) {
            return cbk([503, 'ExpectedOutputValueInBlockstreamTxDetails']);
          }

          return cbk(null, {tokens: body.vout[vout].value});
        });
      }],
    },
    returnResult({reject, resolve, of: 'getDetails'}, cbk));
  });
};
