# IMDb Watchlist Checker

Browser extension (Chrome, Edge, Firefox) that adds a green ✓ before each film on an IMDb person page (`/name/nm…`) when that film is on your Watchlist.

## Install (unpacked)

- **Chrome:** `chrome://extensions` → Developer mode → Load unpacked → select this folder.
- **Edge:** `edge://extensions` → Developer mode → Load unpacked → select this folder.
- **Firefox:** `about:debugging#/runtime/this-firefox` → Load Temporary Add-on → select `manifest.json`.
- **Safari:** see [docs/safari.md](docs/safari.md).

Firefox treats host permissions as optional: after installing, grant "Access your data for imdb.com" in the add-on's Permissions tab.

Stay signed in to IMDb. The extension syncs on install, every 6 hours, and from the popup's "Sync now".

## How it works

- The background worker reads your Watchlist pages (`/list/watchlist` → `/user/<id>/watchlist/?page=N`) with your existing IMDb session and caches the title IDs in `storage.local`.
- Visiting a title page records the poster ribbon state, so toggles are picked up without waiting for a sync.
- Person pages ask the worker which listed titles are cached and insert the ✓.

## Permissions and privacy

`storage` and `alarms` for the cache and schedule; `*://*.imdb.com/*` to read your Watchlist and decorate pages. Nothing leaves your browser, there are no other network calls, and the extension never modifies your Watchlist.

## Fragility

This relies on IMDb's page markup and embedded page data, which are not a public API. If IMDb changes them, the popup shows "Last sync failed" (the old cache is kept) or checkmarks stop appearing. Selectors live in `src/config.js`; the Watchlist page parser is `src/lib/parse-watchlist.js`.

## Development

```
npm test
```
