const MAX_PAGES = 100;

const _deps = typeof module !== 'undefined'
  ? { config: require('../config.js'), parseWatchlistPage: require('./parse-watchlist.js').parseWatchlistPage }
  : { config: globalThis.IWC.config, parseWatchlistPage: globalThis.IWC.parseWatchlistPage };

const assertImdbUrl = (url) => {
  const { protocol, hostname } = new URL(url);
  if (protocol !== 'https:' || hostname !== 'www.imdb.com') throw new Error('unexpected origin');
};

const isSignInUrl = (url) => /\/(ap\/signin|registration\/signin|signin)/i.test(url);

async function runSync(fetchFn, store, now) {
  const { config, parseWatchlistPage } = _deps;
  try {
    const first = await fetchFn(config.watchlistUrl, { credentials: 'include' });
    if (isSignInUrl(first.url)) {
      await store.recordError('signed-out', now);
      return 'signed-out';
    }
    assertImdbUrl(first.url);
    const base = first.url.split('?')[0];
    const ids = [];
    let page = parseWatchlistPage(first.ok ? await first.text() : '');
    for (let n = 2; ; n++) {
      if (!page.ok) throw new Error('unparseable watchlist page');
      ids.push(...page.ids);
      if (!page.hasNext || n > MAX_PAGES) break;
      const next = await fetchFn(`${base}?page=${n}`, { credentials: 'include' });
      assertImdbUrl(next.url);
      page = parseWatchlistPage(next.ok ? await next.text() : '');
    }
    await store.replaceAll(ids, now);
    return 'ok';
  } catch (error) {
    console.error('Watchlist sync failed', error);
    await store.recordError('failed', now);
    return 'failed';
  }
}

if (typeof module !== 'undefined') module.exports = { runSync };
else (globalThis.IWC ??= {}).runSync = runSync;
