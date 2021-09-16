const asyncAuto = require('async/auto');
const {returnResult} = require('asyncjs-util');

const dateFromEpoch = epoch => new Date(epoch * 1e3).toISOString();
const {isArray} = Array;
const url = (api, id) => `${api}tx/${id}`;

/** Get transaction details from Esplora-compatible API

  {
    api: <Esplora API Base String>
    id: <Transaction Id Hex String>
    request: <Request Function>
  }

  @returns via cbk or Promise
  {
    tokens: <Transaction Output Tokens Number>
  }
*/
module.exports = ({api, id, request, vout}, cbk) => {
  return new Promise((resolve, reject) => {
    return asyncAuto({
      // Check argument
      validate: cbk => {
        if (!api) {
          return cbk([400, 'ExpectedApiPathToGetEsploraVout']);
        }

        if (!id) {
          return cbk([400, 'ExpectedTransactionIdToGetEsploraVout']);
        }

        if (!request) {
          return cbk([400, 'ExpectedRequestFunctionToGetEsploraVout']);
        }

        if (vout === undefined) {
          return cbk([400, 'ExpectedTransactionOutputIndexToGetEsploraVout']);
        }

        return cbk();
      },

      // Get tx details
      getDetails: ['validate', ({}, cbk) => {
        return request({json: true, url: url(api, id)}, (err, r, body) => {
          if (!!err) {
            return cbk([503, 'UnexpectedErrorGettingExploraTx', {err}]);
          }

          if (!body) {
            return cbk([503, 'ExpectedTxLookupResultForEsploraTx']);
          }

          if (!isArray(body.vout)) {
            return cbk([503, 'ExpectedOutputsArrayForExploraTx']);
          }

          if (!body.vout[vout]) {
            return cbk([503, 'ExpectedOutputInEsploraTxDetails']);
          }

          if (!body.vout[vout].value) {
            return cbk([503, 'ExpectedOutputValueInEsploraTxDetails']);
          }

          return cbk(null, {tokens: body.vout[vout].value});
        });
      }],
    },
    returnResult({reject, resolve, of: 'getDetails'}, cbk));
  });
};
