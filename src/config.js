const config = {
  syncIntervalMinutes: 360,
  watchlistUrl: 'https://www.imdb.com/list/watchlist',
  personRowSelector: 'li.ipc-metadata-list-summary-item',
  titleLinkSelector: 'a.ipc-metadata-list-summary-item__t[href*="/title/tt"]',
  posterSelector: '.ipc-poster',
  ribbonSelector: '.ipc-poster__watchlist-ribbon.hero-media__watchlist',
  ribbonOnValue: 'true',
};

if (typeof module !== 'undefined') module.exports = config;
else (globalThis.IWC ??= {}).config = config;
