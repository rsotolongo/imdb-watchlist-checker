const test = require('node:test');
const assert = require('node:assert');
const { createStore } = require('../src/lib/store.js');

function fakeStorage() {
  const data = {};
  return {
    async get(keys) {
      await new Promise((r) => setTimeout(r, Math.random() * 5));
      return Object.fromEntries(keys.filter((k) => k in data).map((k) => [k, data[k]]));
    },
    async set(obj) {
      await new Promise((r) => setTimeout(r, Math.random() * 5));
      Object.assign(data, obj);
    },
  };
}

test('replaceAll_setsIdsAndClearsError', async () => {
  const store = createStore(fakeStorage());
  await store.recordError('failed', 1);
  await store.replaceAll(['tt1', 'tt2'], 100);
  assert.deepStrictEqual(await store.getState(), { ids: ['tt1', 'tt2'], lastSynced: 100, lastError: null });
});

test('setOne_addAndRemove', async () => {
  const store = createStore(fakeStorage());
  await store.setOne('tt1', true);
  await store.setOne('tt1', true);
  await store.setOne('tt2', true);
  await store.setOne('tt1', false);
  assert.deepStrictEqual((await store.getState()).ids, ['tt2']);
});

test('has_returnsOnlyKnownIds', async () => {
  const store = createStore(fakeStorage());
  await store.replaceAll(['tt1', 'tt3'], 1);
  assert.deepStrictEqual(await store.has(['tt1', 'tt2', 'tt3']), ['tt1', 'tt3']);
});

test('recordError_keepsExistingIds', async () => {
  const store = createStore(fakeStorage());
  await store.replaceAll(['tt1'], 1);
  await store.recordError('signed-out', 2);
  const state = await store.getState();
  assert.deepStrictEqual(state.ids, ['tt1']);
  assert.strictEqual(state.lastError, 'signed-out');
});

test('concurrentSetOneAndReplaceAll_appliedInCallOrder', async () => {
  const store = createStore(fakeStorage());
  const a = store.replaceAll(['tt1'], 1);
  const b = store.setOne('tt2', true);
  await Promise.all([a, b]);
  assert.deepStrictEqual((await store.getState()).ids, ['tt1', 'tt2']);
});
