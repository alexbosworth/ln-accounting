const {componentsOfTransaction} = require('@alexbosworth/blockchain');

const isScriptMatchingTemplate = require('./is_script_matching_template');
const swapScripts = require('./swap_scripts');

const byteLength = hex => hex.length / 2;
const minWitnessStackLength = 3;
const preimageByteLength = 32;
const publicKeyByteLength = 33;
const sweepInputLength = 1;

/** Determine if a transaction is a submarine swap HTLC sweep

  {
    transaction: <Raw Transaction Hex String>
  }

  @throws
  <Error>

  @returns
  {
    [is_success_sweep]: <Transaction is HTLC Success Sweep Bool>
    [is_timeout_sweep]: <Transaction is HTLC Timeout Sweep Bool>
  }
*/
module.exports = ({transaction}) => {
  const {inputs} = componentsOfTransaction({transaction});

  // Exit early when the number of inputs is not the expected number
  if (inputs.length !== sweepInputLength) {
    return {};
  }

  const [input] = inputs;

  // An input without a witness has an empty witness stack
  const witness = input.witness || [];

  const [script] = witness.slice().reverse();

  // Exit early when there is no witness script
  if (!script) {
    return {};
  }

  // Exit early when the number of witness stack elements is not expected
  if (witness.length < minWitnessStackLength) {
    return {};
  }

  // Byte lengths of the first two witness stack elements
  const [firstLength, secondLength] = witness.map(byteLength);

  // A v1 sweep has a signature and then the unlock element
  if (isScriptMatchingTemplate({script, template: swapScripts.v1})) {
    return {
      is_success_sweep: secondLength === preimageByteLength,
      is_timeout_sweep: secondLength !== preimageByteLength,
    };
  }

  // A v2 sweep starts with the preimage or has a public key before the script
  if (isScriptMatchingTemplate({script, template: swapScripts.v2})) {
    return {
      is_success_sweep: firstLength === preimageByteLength,
      is_timeout_sweep: secondLength === publicKeyByteLength,
    };
  }

  return {};
};
