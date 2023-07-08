const {equal} = require('node:assert').strict;
const test = require('node:test');
const {throws} = require('node:assert').strict;

const formattedNotes = require('./../../harmony/formatted_notes');

const tests = [
  {
    args: {notes: 'notes'},
    description: 'Notes formatted',
    expected: {notes: 'notes'},
  },
  {
    args: {notes: ''},
    description: 'Empty notes formatted',
    expected: {notes: ''},
  },
];

tests.forEach(({args, description, error, expected}) => {
  return test(description, (t, end) => {
    if (!!error) {
      throws(() => formattedNotes(args), new Error(error), 'Got error');
    } else {
      const {notes} = formattedNotes(args);

      equal(notes, expected.notes, 'Got formatted notes');
    }

    return end();
  });
});
