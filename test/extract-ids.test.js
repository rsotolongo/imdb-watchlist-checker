const test = require('node:test');
const assert = require('node:assert');
const { titleIdFromHref } = require('../src/lib/extract-ids.js');

const cases = [
  ['/title/tt1234567/', 'tt1234567'],
  ['https://www.imdb.com/title/tt1234567/?ref_=nm_flmg_t_1', 'tt1234567'],
  ['/de/title/tt1234567/characters/nm0000354', 'tt1234567'],
  ['/title/tt1234567', 'tt1234567'],
  ['/name/nm0000354/', null],
  ['/title/tt/', null],
  ['', null],
];

for (const [href, expected] of cases) {
  test(`titleIdFromHref_${JSON.stringify(href)}_returns_${expected}`, () => {
    assert.strictEqual(titleIdFromHref(href), expected);
  });
}
