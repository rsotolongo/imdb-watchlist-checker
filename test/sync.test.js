const test = require('node:test');
const assert = require('node:assert');
const { runSync } = require('../src/lib/sync.js');
const { createStore } = require('../src/lib/store.js');
const { watchlistHtml } = require('./helpers/pages.js');

const BASE = 'https://www.imdb.com/user/p.abc/watchlist/';

function memoryStore() {
  const data = {};
  return createStore({
    get: async (keys) => Object.fromEntries(keys.filter((k) => k in data).map((k) => [k, data[k]])),
    set: async (obj) => { Object.assign(data, obj); },
  });
}

const response = (url, body, ok = true) => ({ url, ok, text: async () => body });

function pagedFetch(pages) {
  const calls = [];
  const fn = async (url) => {
    calls.push(url);
    const page = Number(new URL(url).searchParams.get('page') ?? 1);
    const ids = pages[page - 1];
    return response(url.startsWith(BASE) ? url : BASE, watchlistHtml(ids, page < pages.length));
  };
  fn.calls = calls;
  return fn;
}

test('runSync_multiplePages_collectsAllAndReturnsOk', async () => {
  const store = memoryStore();
  const fetchFn = pagedFetch([['tt1', 'tt2'], ['tt3']]);
  assert.strictEqual(await runSync(fetchFn, store, 50), 'ok');
  assert.deepStrictEqual((await store.getState()).ids, ['tt1', 'tt2', 'tt3']);
  assert.deepStrictEqual(fetchFn.calls.slice(1), [`${BASE}?page=2`]);
});

test('runSync_redirectedToSignIn_recordsSignedOutKeepsIds', async () => {
  const store = memoryStore();
  await store.replaceAll(['tt9'], 1);
  const fetchFn = async () => response('https://www.imdb.com/ap/signin?openid=1', '<html>Sign in</html>');
  assert.strictEqual(await runSync(fetchFn, store, 2), 'signed-out');
  const state = await store.getState();
  assert.deepStrictEqual(state.ids, ['tt9']);
  assert.strictEqual(state.lastError, 'signed-out');
});

test('runSync_networkError_recordsFailedKeepsIds', async () => {
  const store = memoryStore();
  await store.replaceAll(['tt9'], 1);
  assert.strictEqual(await runSync(async () => { throw new Error('offline'); }, store, 2), 'failed');
  assert.deepStrictEqual((await store.getState()).ids, ['tt9']);
});

test('runSync_garbledBody_keepsIds', async () => {
  const store = memoryStore();
  await store.replaceAll(['tt9'], 1);
  const fetchFn = async () => response(BASE, '<html>nothing useful</html>');
  assert.strictEqual(await runSync(fetchFn, store, 2), 'failed');
  assert.deepStrictEqual((await store.getState()).ids, ['tt9']);
});

test('runSync_laterPageFails_keepsOldCacheNoPartialReplace', async () => {
  const store = memoryStore();
  await store.replaceAll(['tt9'], 1);
  const fetchFn = async (url) =>
    url.includes('page=2') ? response(url, 'oops', false) : response(BASE, watchlistHtml(['tt1'], true));
  assert.strictEqual(await runSync(fetchFn, store, 2), 'failed');
  assert.deepStrictEqual((await store.getState()).ids, ['tt9']);
});

test('runSync_emptyWatchlist_replacesWithEmpty', async () => {
  const store = memoryStore();
  await store.replaceAll(['tt9'], 1);
  assert.strictEqual(await runSync(pagedFetch([[]]), store, 2), 'ok');
  assert.deepStrictEqual((await store.getState()).ids, []);
});

test('runSync_redirectedToForeignHost_failsKeepsIds', async () => {
  const store = memoryStore();
  await store.replaceAll(['tt9'], 1);
  const fetchFn = async () => response('https://evil.example/watchlist/', watchlistHtml(['tt1'], false));
  assert.strictEqual(await runSync(fetchFn, store, 2), 'failed');
  assert.deepStrictEqual((await store.getState()).ids, ['tt9']);
});

test('runSync_laterPageOnForeignHost_failsKeepsIds', async () => {
  const store = memoryStore();
  await store.replaceAll(['tt9'], 1);
  const fetchFn = async (url) =>
    url.includes('page=2') ? response('http://www.imdb.com/x', watchlistHtml(['tt2'], false)) : response(BASE, watchlistHtml(['tt1'], true));
  assert.strictEqual(await runSync(fetchFn, store, 2), 'failed');
  assert.deepStrictEqual((await store.getState()).ids, ['tt9']);
});
