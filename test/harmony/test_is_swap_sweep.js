const {deepEqual} = require('node:assert').strict;
const test = require('node:test');

const {scriptElementsAsScript} = require('@alexbosworth/blockchain');
const {transactionFromComponents} = require('@alexbosworth/blockchain');

const isSwapSweep = require('./../../harmony/is_swap_sweep');

const hash = Buffer.alloc(20);
const height = Buffer.alloc(3, 1);
const id = '00'.repeat(32);
const key = Buffer.alloc(33, 2);
const preimage = '00'.repeat(32);
const publicKey = '02'.repeat(33);
const signature = '01'.repeat(71);
const size = Buffer.from([32]);

const makeScript = elements => scriptElementsAsScript({elements}).script;

// OP_SIZE 32 OP_EQUAL OP_IF OP_HASH160 <hash> OP_EQUALVERIFY <key> OP_ELSE
// OP_DROP <height> OP_CHECKLOCKTIMEVERIFY OP_DROP <key> OP_ENDIF OP_CHECKSIG
const v1Script = makeScript([
  130, size, 135, 99, 169, hash, 136, key, 103, 117, height, 177, 117, key,
  104, 172,
]);

// <key> OP_CHECKSIG OP_NOTIF OP_DUP OP_HASH160 <hash> OP_EQUALVERIFY
// OP_CHECKSIGVERIFY <height> OP_CHECKLOCKTIMEVERIFY OP_ELSE OP_SIZE 32
// OP_EQUALVERIFY OP_HASH160 <hash> OP_EQUALVERIFY OP_1
// OP_CHECKSEQUENCEVERIFY OP_ENDIF
const v2Script = makeScript([
  key, 172, 100, 118, 169, hash, 136, 173, height, 177, 103, 130, size, 136,
  169, hash, 136, 81, 178, 104,
]);

const makeArgs = overrides => {
  const witnesses = overrides.witnesses || [[signature, preimage, v1Script]];

  return transactionFromComponents({
    inputs: witnesses.map(witness => ({
      id,
      witness,
      script: String(),
      sequence: 0,
      vout: 0,
    })),
    locktime: 0,
    outputs: [{script: v1Script, tokens: 1}],
    version: 2,
  });
};

const makeExpected = overrides => {
  return {is_success_sweep: false, is_timeout_sweep: false, ...overrides};
};

const tests = [
  {
    args: makeArgs({}),
    description: 'A v1 swap script preimage spend is a success sweep',
    expected: makeExpected({is_success_sweep: true}),
  },
  {
    args: makeArgs({witnesses: [[signature, String(), v1Script]]}),
    description: 'A v1 swap script spend with no preimage is a timeout sweep',
    expected: makeExpected({is_timeout_sweep: true}),
  },
  {
    args: makeArgs({witnesses: [[preimage, signature, v2Script]]}),
    description: 'A v2 swap script preimage spend is a success sweep',
    expected: makeExpected({is_success_sweep: true}),
  },
  {
    args: makeArgs({witnesses: [[signature, publicKey, v2Script]]}),
    description: 'A v2 swap script public key spend is a timeout sweep',
    expected: makeExpected({is_timeout_sweep: true}),
  },
  {
    args: makeArgs({
      witnesses: [
        [signature, preimage, v1Script],
        [signature, preimage, v1Script],
      ],
    }),
    description: 'A transaction with multiple inputs is not a sweep',
    expected: {},
  },
  {
    args: makeArgs({witnesses: [[]]}),
    description: 'A transaction with no witness is not a sweep',
    expected: {},
  },
  {
    args: makeArgs({witnesses: [[preimage, v1Script]]}),
    description: 'A spend with a short witness stack is not a sweep',
    expected: {},
  },
  {
    args: makeArgs({witnesses: [[signature, preimage, publicKey]]}),
    description: 'A spend of a script that is not a swap script is no sweep',
    expected: {},
  },
];

tests.forEach(({args, description, expected}) => {
  return test(description, (t, end) => {
    deepEqual(isSwapSweep(args), expected, 'Got expected sweep details');

    return end();
  });
});
