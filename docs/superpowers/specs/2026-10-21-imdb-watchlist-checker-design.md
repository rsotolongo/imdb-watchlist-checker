# IMDb Watchlist Checker — Design

Date: 2026-10-21

## Goal

On an IMDb person page (`/name/nm…`), show a checkmark next to each filmography title that is on the user's Watchlist. Title pages already show this via the poster ribbon; person pages do not.

Success: opening an actor's page shows at a glance which of their films are on the user's Watchlist.

## Scope and assumptions

- Desktop Chrome, Edge, Firefox. Safari: code kept compatible; packaging documented, not built (requires macOS/Xcode).
- Read-only: the extension never modifies the Watchlist.
- Uses the user's existing logged-in IMDb session. No separate login, API key or credentials handled.
- Runs only on `*.imdb.com`. Data stays in `storage.local`; no analytics.
- Permissions: `storage`, `alarms`, host `*://*.imdb.com/*`.

## Approach

Plain JavaScript WebExtension, Manifest V3, no build step. One manifest declares both `background.service_worker` (Chrome/Edge) and `background.scripts` (Firefox); each browser ignores the key it does not support. Cross-browser API access through `globalThis.browser ?? chrome`.

Rejected: TypeScript + WXT/Vite (pipeline overhead for ~300 lines); userscript (not a real extension, poor Safari story).

## Data source

Option 3 (agreed): scheduled fetch of the Watchlist export from IMDb using session cookies, plus passive updates while browsing.

- **Sync:** on install, every 6 hours via `alarms`, and on demand from the popup. Replaces the cached ID set.
- **Passive:** visiting a title page records ribbon state (add/remove one ID); visiting the Watchlist page may refresh the set.

## Components

- **Background worker** — owns the Watchlist set (`tt…` IDs) and `lastSynced` in `storage.local`. Handles sync, alarms, content-script messages. All writes go through one serialized queue.
- **content-name.js** (person pages) — extracts title IDs from filmography links, asks the worker which are on the Watchlist, inserts a ✓ before each matching row. A `MutationObserver` handles rows loaded later (e.g. "See all").
- **content-title.js** (title pages) — reads ribbon state, reports it to the worker.
- **Popup** — item count, last-synced time, "Sync now", status (OK / signed out / last sync failed).
- **Checkmark** — small ribbon with ✓ over the poster, tooltip "On your Watchlist", adapts to IMDb light/dark themes. Marked with `data-iwc` so it is inserted once per row.

## Error handling

- **Signed out / session expired:** export request redirects to sign-in; old cache kept; popup shows "Sign in to IMDb"; no retry loop.
- **Fetch failed or format changed:** old cache kept; popup shows "Last sync failed" with time. A sync replaces the cache only if the CSV header is present and every parsed row is a valid `tt` ID. Garbled or empty-without-header responses never wipe data. A header with zero rows is a valid empty Watchlist.
- **Races:** passive writes and syncs are serialized, so a sync cannot overwrite a fresher toggle.
- **Duplicate titles** across filmography sections (Actor, Producer, …): each row gets a ✓, once.
- **Fragility:** IMDb markup and the export endpoint are not a public API. Selectors and the export URL live only in `config.js`. Real markup is verified against a live page before selectors are finalized.

## Testing

- `node:test` unit tests for pure modules: export CSV parser, title-ID extractor, sync-merge logic, using fixtures saved from real IMDb pages/exports.
- Manual per-browser checklist: load unpacked, sync, open an actor page, toggle a ribbon, expand "See all".
- Live DOM verification in Chrome via browser tools, with the user logged in (the assistant does not enter credentials).

## File layout

```
imdb-watchlist-checker/
  manifest.json
  src/
    config.js
    background.js
    content-name.js
    content-title.js
    popup.html
    popup.js
    lib/
      parse-export.js
      extract-ids.js
      browser.js
  test/
    *.test.js
    fixtures/
  docs/safari.md      # xcrun safari-web-extension-converter steps
  README.md
```

## Out of scope

Editing the Watchlist from person pages, other IMDb list types, mobile browsers, store publishing, Safari build.

## Open risks

- The Watchlist export URL/format must be confirmed against the live site (list ID discovery, cookie-authenticated fetch from the extension context).
- Person-page filmography markup (and lazy loading) must be confirmed against a live page.
