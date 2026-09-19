const {evaluateFormula} = require('@alexbosworth/formulas');

const {isArray} = Array;
const {keys} = Object;
const {round} = Math;

/** Parse a described amount into tokens

  {
    amount: <Amount String>
    [variables]: {
      <Name String>: <Amount Number>
    }
  }

  @throws
  <Error>

  @returns
  {
    tokens: <Tokens Number>
  }
*/
module.exports = ({amount, variables}) => {
  if (isArray(amount)) {
    throw new Error('CannotParseMultipleAmounts');
  }

  const constants = {};

  keys(variables || {}).forEach(key => {
    constants[key.toLowerCase()] = variables[key];

    return;
  });

  constants.btc = 1e8;
  constants.m = 1e6;
  constants.mm = 1e6;
  constants.k = 1e3;

  const {result} = evaluateFormula({constants, formula: amount});

  return {tokens: round(result)};
};
