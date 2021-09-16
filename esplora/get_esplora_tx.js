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
    [confirmation_height]: <Confirmed In Block At Height Number>
    [created_at]: <Transaction Confirmation Date ISO 8601 Date String>
    [block_id]: <Confirmed In Block With Hash Hex String>
    fee: <Transaction Fee Tokens Number>
    output_addresses: [<Output Address String>]
  }
*/
module.exports = ({api, id, request}, cbk) => {
  return new Promise((resolve, reject) => {
    return asyncAuto({
      // Check argument
      validate: cbk => {
        if (!api) {
          return cbk([400, 'ExpectedBaseEsploraApiToGetEsploraTx']);
        }

        if (!id) {
          return cbk([400, 'ExpectedTransactionIdToGetEsploraTx']);
        }

        if (!request) {
          return cbk([400, 'ExpectedRequestFunctionToGetEsploraTx']);
        }

        return cbk();
      },

      // Get tx details
      getDetails: ['validate', ({}, cbk) => {
        return request({json: true, url: url(api, id)}, (err, r, body) => {
          if (!!err) {
            return cbk([503, 'UnexpectedErrorGettingEsploraTx', {err}]);
          }

          if (!body) {
            return cbk([503, 'ExpectedTxLookupResultForEsploraTx']);
          }

          if (body.fee === undefined) {
            return cbk([503, 'ExpectedTransactionFeeInResultFromEsplora']);
          }

          if (!body.status) {
            return cbk([503, 'ExpectedStatusOfEsploraTransaction']);
          }

          if (!isArray(body.vout)) {
            return cbk([503, 'ExpectedOutputsInEsploraTransaction']);
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
