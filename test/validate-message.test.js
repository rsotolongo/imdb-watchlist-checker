const test = require('node:test');
const assert = require('node:assert');
const { validateMessage } = require('../src/lib/validate-message.js');

const valid = [
  { type: 'has', ids: ['tt1', 'tt22'] },
  { type: 'set', id: 'tt1', present: true },
  { type: 'sync' },
  { type: 'state' },
];
for (const msg of valid) {
  test(`validateMessage_${msg.type}_valid`, () => assert.strictEqual(validateMessage(msg), true));
}

const invalid = [
  null,
  {},
  { type: 'constructor' },
  { type: '__proto__' },
  { type: 'has', ids: 'tt1' },
  { type: 'has', ids: ['nm1'] },
  { type: 'set', id: 'tt1', present: 'yes' },
  { type: 'set', id: 'x', present: true },
];
for (const msg of invalid) {
  test(`validateMessage_${JSON.stringify(msg)}_rejected`, () => assert.strictEqual(validateMessage(msg), false));
}
