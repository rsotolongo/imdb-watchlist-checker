const test = require('node:test');
const assert = require('node:assert');
const { parseWatchlistPage } = require('../src/lib/parse-watchlist.js');
const { watchlistHtml } = require('./helpers/pages.js');

test('parseWatchlistPage_validPage_returnsIdsAndHasNext', () => {
  assert.deepStrictEqual(parseWatchlistPage(watchlistHtml(['tt1', 'tt22'], true)), { ok: true, ids: ['tt1', 'tt22'], hasNext: true });
});

test('parseWatchlistPage_emptyList_okWithNoIds', () => {
  assert.deepStrictEqual(parseWatchlistPage(watchlistHtml([], false)), { ok: true, ids: [], hasNext: false });
});

test('parseWatchlistPage_signInHtml_notOk', () => {
  assert.strictEqual(parseWatchlistPage('<html><body>Sign in</body></html>').ok, false);
});

test('parseWatchlistPage_emptyString_notOk', () => {
  assert.strictEqual(parseWatchlistPage('').ok, false);
});

test('parseWatchlistPage_nonTitleId_notOk', () => {
  assert.strictEqual(parseWatchlistPage(watchlistHtml(['nm0000354'], false)).ok, false);
});

test('parseWatchlistPage_malformedJson_notOk', () => {
  assert.strictEqual(parseWatchlistPage('<script id="__NEXT_DATA__" type="application/json">{oops</script>').ok, false);
});
