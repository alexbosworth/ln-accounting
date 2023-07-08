const test = require('node:test');
const {throws} = require('node:assert').strict;

const {harmonize} = require('./../../harmony');

const tests = [
  {
    args: {},
    description: 'Records are required',
    error: 'ExpectedRecordsToConvertToHarmonyFormat',
  },
];

tests.forEach(({args, description, error}) => {
  return test(description, (t, end) => {
    if (!!error) {
      throws(() => harmonize(args), new Error(error), 'Got error');
    } else {
      harmonize(args);
    }

    return end();
  });
});
