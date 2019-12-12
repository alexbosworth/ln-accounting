const {isSweep} = require('goldengate');

/** Derive notes from a chain transaction

  {
    output_addresses: [<Output Address String>]
    [transaction]: <Raw Transaction Hex String>
  }

  @returns
  {
    notes: <Harmony Record Notes String>
  }
*/
module.exports = args => {
  const addresses = args.output_addresses.join(' ');
  const {transaction} = args;

  const sweep = !args.transaction ? {} : isSweep({transaction});

  if (!!sweep.is_success_sweep) {
    return {notes: `Submarine swap success, swept out to ${addresses}`};
  }

  if (!!sweep.is_timeout_sweep) {
    return {notes: `Submarine swap failure, swept out to ${addresses}`};
  }

  return {notes: `Outputs to ${addresses}`};
};
