const {test} = require('tap');

const notesForChainTx = require('./../../harmony/notes_for_chain_transaction');

const tests = [
  {
    args: {
      output_addresses: ['a', 'b'],
      transaction: '010000000001010cb9318f1cbe8688e71ca9e61a9b2e361d1fb47adf92ee4152d274f15cca2ebd00000000232200206f569f1dcbb18b78883398b66a52c7c50938119ed4567cc3c2e5bb6d7b36c65000000000016d26000000000000160014362a2872a1c9988ef71c31bb332dfff68d895f0d0347304402207651e5bfabb17ec044f7e3cafc4817df07c3d81a72cdcdc4706f20bf0a1ff01302206b08d9f5ac317279b30b597dd91ddddc07d9f6c82b42a47e4453ff2ae9d6eafa01006a8201208763a914d1a70126ff7a149ca6f9b638db084480440ff8428821000000000000000000000000000000000000000000000000000000000000000000677503fbfa17b175210280a5a994052abe443adb74851387b389386306c690a94ddf3bfd71234cd2a72b68acfbfa1700',
    },
    description: 'Notes for timeout sweep are returned',
    expected: {notes: 'Submarine swap failure, swept out to a b'},
  },
  {
    args: {
      output_addresses: ['a', 'b'],
      transaction: '020000000001010cb9318f1cbe8688e71ca9e61a9b2e361d1fb47adf92ee4152d274f15cca2ebd000000000000000000018826000000000000160014362a2872a1c9988ef71c31bb332dfff68d895f0d0347304402203f4e9e57ac637980d380ecd634db6ff42a7def7086f0e08391c51a595bbd67cb022036010e360ef844381a6d271505d809e4cc9ca783dc6859aeae02f1de04df2c78012000000000000000000000000000000000000000000000000000000000000000006a8201208763a914b8bcb07f6344b42ab04250c86a6e8b75d3fdbbc68821020ffb4c13e0f3547a1c9b98fe8b0430643b6a4c5f49985f3dbe11564898f7040e67750327fc17b1752102e8442ed17709432b996d70838a686cbd990f19c559ea0d04e319d27ceb135b9568acfbfa1700',
    },
    description: 'Notes for successful sweep are returned',
    expected: {notes: 'Submarine swap success, swept out to a b'},
  },
  {
    args: {output_addresses: ['a', 'b']},
    description: 'Notes are returned',
    expected: {notes: 'Outputs to a b'},
  }
];

tests.forEach(({args, description, expected}) => {
  return test(description, ({equals, end}) => {
    const {notes} = notesForChainTx(args);

    equals(notes, expected.notes, 'Notes for chain transaction');

    return end();
  });
});
