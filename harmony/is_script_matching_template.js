const {scriptAsScriptElements} = require('@alexbosworth/blockchain');

const bufferAsHex = buffer => buffer.toString('hex');
const {isBuffer} = Buffer;

/** Determine if a witness script matches a template

  {
    script: <Witness Script Hex String>
    template: [{
      [data]: <Exact Data Push Hex String>
      [op]: <Op Code Number>
      [size]: <Minimum Data Push Byte Length Number>
    }]
  }

  @throws
  <Error>

  @returns
  <Script Matches Template Bool>
*/
module.exports = ({script, template}) => {
  const {elements} = scriptAsScriptElements({script});

  // Exit early when the script cannot be decoded into elements
  if (!elements) {
    return false;
  }

  // Exit early when the script element count does not match the template
  if (elements.length !== template.length) {
    return false;
  }

  const hasUnexpectedElement = elements.some((element, i) => {
    const expected = template[i];

    // An op code should be the expected op code
    if (!isBuffer(element)) {
      return element !== expected.op;
    }

    // When exact data is expected, the data push should be that data
    if (!!expected.data) {
      return bufferAsHex(element) !== expected.data;
    }

    // A data push should be expected and at least the expected length
    return !expected.size || element.length < expected.size;
  });

  // The presence of no unexpected element indicates a template match
  return !hasUnexpectedElement;
};
