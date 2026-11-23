const {equal} = require('node:assert').strict;
const test = require('node:test');

const {scriptElementsAsScript} = require('@alexbosworth/blockchain');

const isMatching = require('./../../harmony/is_script_matching_template');

const data = Buffer.alloc(2);
const exact = Buffer.from([32]);
const opDup = 118;
const opEqual = 135;

const makeArgs = overrides => {
  const elements = overrides.elements || [opDup, data, exact];

  return {
    script: overrides.script || scriptElementsAsScript({elements}).script,
    template: overrides.template || [{op: opDup}, {size: 2}, {data: '20'}],
  };
};

const tests = [
  {
    args: makeArgs({}),
    description: 'A script matching a template is matching',
    expected: true,
  },
  {
    args: makeArgs({elements: [opDup, Buffer.alloc(3), exact]}),
    description: 'A data push can be longer than the minimum size',
    expected: true,
  },
  {
    args: makeArgs({script: '4c'}),
    description: 'A script that cannot be decoded is not matching',
    expected: false,
  },
  {
    args: makeArgs({elements: [opDup, data]}),
    description: 'A script with a different element count is not matching',
    expected: false,
  },
  {
    args: makeArgs({elements: [opEqual, data, exact]}),
    description: 'A script with a different op code is not matching',
    expected: false,
  },
  {
    args: makeArgs({elements: [opDup, opDup, exact]}),
    description: 'An op code in place of a data push is not matching',
    expected: false,
  },
  {
    args: makeArgs({elements: [data, data, exact]}),
    description: 'A data push in place of an op code is not matching',
    expected: false,
  },
  {
    args: makeArgs({elements: [opDup, Buffer.alloc(1), exact]}),
    description: 'A data push under the minimum size is not matching',
    expected: false,
  },
  {
    args: makeArgs({elements: [opDup, data, Buffer.from([33])]}),
    description: 'A data push of different exact data is not matching',
    expected: false,
  },
];

tests.forEach(({args, description, expected}) => {
  return test(description, (t, end) => {
    equal(isMatching(args), expected, 'Got expected template match');

    return end();
  });
});
