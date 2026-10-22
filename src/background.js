if (typeof importScripts === 'function') {
  importScripts('config.js', 'lib/browser.js', 'lib/parse-watchlist.js', 'lib/store.js', 'lib/sync.js');
}

(() => {
  const { api, config, createStore, runSync } = globalThis.IWC;
  const store = createStore(api.storage.local);
  const SYNC_ALARM = 'iwc-sync';

  const sync = () => runSync(fetch.bind(globalThis), store, Date.now());

  api.runtime.onInstalled.addListener(() => {
    api.alarms.create(SYNC_ALARM, { periodInMinutes: config.syncIntervalMinutes });
    sync();
  });

  api.alarms.onAlarm.addListener((alarm) => {
    if (alarm.name === SYNC_ALARM) sync();
  });

  const handlers = {
    has: (msg) => store.has(msg.ids),
    set: async (msg) => { await store.setOne(msg.id, msg.present); return true; },
    sync,
    state: () => store.getState(),
  };

  api.runtime.onMessage.addListener((msg, _sender, sendResponse) => {
    const handler = handlers[msg?.type];
    if (!handler) return false;
    Promise.resolve(handler(msg)).then(sendResponse);
    return true;
  });
})();
