if (typeof importScripts === 'function') {
  importScripts('config.js', 'lib/browser.js', 'lib/parse-watchlist.js', 'lib/store.js', 'lib/sync.js');
}

(() => {
  const { api, config, createStore, runSync } = globalThis.IWC;
  const store = createStore(api.storage.local);
  const SYNC_ALARM = 'iwc-sync';

  const AUTO_RETRY_MS = 5 * 60 * 1000;
  let inFlight = null;
  let lastAutoAttempt = 0;

  const sync = () => (inFlight ??= runSync(fetch.bind(globalThis), store, Date.now())
    .finally(() => { inFlight = null; }));

  // A fresh profile is usually not signed in to IMDb at install time, so retry until one sync succeeds.
  async function ensureSynced() {
    const { lastSynced } = await store.getState();
    if (lastSynced !== null || Date.now() - lastAutoAttempt < AUTO_RETRY_MS) return;
    lastAutoAttempt = Date.now();
    await sync();
  }

  api.runtime.onInstalled.addListener(() => {
    api.alarms.create(SYNC_ALARM, { periodInMinutes: config.syncIntervalMinutes });
    lastAutoAttempt = Date.now();
    sync();
  });

  api.runtime.onStartup.addListener(sync);

  api.alarms.onAlarm.addListener((alarm) => {
    if (alarm.name === SYNC_ALARM) sync();
  });

  const handlers = {
    has: async (msg) => { await ensureSynced(); return store.has(msg.ids); },
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
