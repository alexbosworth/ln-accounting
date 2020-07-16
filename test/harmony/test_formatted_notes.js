const {test} = require('@alexbosworth/tap');

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
  return test(description, ({end, equal, throws}) => {
    if (!!error) {
      throws(() => formattedNotes(args), new Error(error), 'Got error');
    } else {
      const {notes} = formattedNotes(args);

      equal(notes, expected.notes, 'Got formatted notes');
    }

    return end();
  });
});
