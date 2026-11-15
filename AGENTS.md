# AGENTS.md — IMDb Watchlist Checker

Manifest V3 browser extension (Chrome, Edge, Firefox; Safari-compatible, not built). Adds a yellow bookmark ribbon with a ✓ to films on IMDb person pages (`/name/nm…`) that are on the user's Watchlist. Plain JavaScript, **no build step, no runtime or dev dependencies**. Keep it that way.

## Commands
```bash
npm test             # node --test (Node 22+; CI uses 22)
npm run package      # dist/chrome.zip (Chrome + Edge), dist/firefox.zip; unpacked copies in dist/chrome/ and dist/firefox/
npm run lint         # package, then web-ext lint on dist/firefox with --warnings-as-errors
```
Done means `npm test` and `npm run lint` both pass. Load `dist/chrome/` (not the repo root) as the unpacked extension when testing Chrome/Edge; Firefox: `dist/firefox/manifest.json` via `about:debugging`.

## Architecture
- `src/background.js` — owns the cache. Single-flight `sync`, alarm every 6 h (`config.syncIntervalMinutes`), sync on install/startup, and `ensureSynced` (retries at most every 5 min while no sync has ever succeeded). Message handlers `has | set | sync | state`.
- `src/lib/sync.js` — `runSync(fetchFn, store, now)`: fetches `config.watchlistUrl`, follows the redirect to `/user/<id>/watchlist/`, pages with `?page=N`. Returns `'ok' | 'signed-out' | 'failed'`; on failure the old cache is kept.
- `src/lib/parse-watchlist.js` — reads `__NEXT_DATA__` JSON; rejects the whole page if any ID is not `tt\d+`.
- `src/lib/store.js` — `storage.local` wrapper. **Every write goes through one serialized queue** so a sync cannot overwrite a fresher toggle.
- `src/lib/validate-message.js` — allowlist of message types and payload shapes. The background also checks `sender.id === runtime.id`.
- `src/content-name.js` + `src/lib/decorate.js` — person pages: collect rows, ask `has`, insert the ribbon. `MutationObserver` handles rows added later ("See all").
- `src/content-title.js` — title pages: report the poster ribbon state via `set`.
- `src/config.js` — **all IMDb selectors, URLs and constants live here only.**
- `src/popup.*` — count, last-synced time, status (`signed-out` → "Sign in to IMDb", `failed` → "Last sync failed"), "Sync now".

## Conventions
- **Dual-load modules.** Files under `src/` run as plain scripts in the browser and as CommonJS in tests. End each with `if (typeof module !== 'undefined') module.exports = …; else (globalThis.IWC ??= {}).x = …;` and read dependencies the same way. No ES modules, no bundler.
- **Script load order is declared in three places and must agree:** `manifest.json` `background.scripts` and `content_scripts[].js`, plus the `importScripts(...)` list in `src/background.js` (Chrome/Edge service worker). Adding a `src/lib/*.js` file means updating the relevant ones, plus `popup.html` if the popup needs it.
- **`manifest.json` carries keys for every browser** (`background.service_worker` *and* `background.scripts`, `browser_specific_settings`). `scripts/package.sh` strips the keys each store build must not have. Never "fix" the lint warning about `service_worker` in the repo manifest; lint runs on the Firefox build.
- **Dependency injection for I/O:** pass `fetchFn`, storage areas and `document` in; tests use hand-written fakes (no mocking library).
- **DOM:** never `innerHTML` (the AMO linter flags it and CI fails on any warning). Build SVG with `createElementNS`. Idempotency via `data-iwc` on rows; styles in `src/content.css` (`.iwc-host`, `.iwc-check`).
- **Messages:** a new message type needs an entry in `validators` (validate-message.js), a handler in `background.js`, and tests.
- Style: 2 spaces, single quotes, semicolons, `const`, arrow functions, `??`/`?.`. Comments only for a non-obvious why.
- **Tests** (`test/*.test.js`, `node:test` + `node:assert`): names are `unit_scenario_expected` (underscores allowed here; the C#/.NET rules in other projects don't apply). Use table-driven loops for repeated cases. Page fixtures come from `test/helpers/pages.js`. One behavior per test. `test/smoke.test.js` pins the exact `permissions` and `host_permissions`.

## Privacy and permissions (hard constraints)
- Permissions are exactly `storage`, `alarms`, host `https://www.imdb.com/*` (also the content-script `matches`). Do not widen them. Any change must update together: `manifest.json`, `test/smoke.test.js`, `README.md`, `PRIVACY.md`, and the store permission justifications in `docs/publishing.md`.
- The only network requests are to `https://www.imdb.com`, with the user's own session. No third-party hosts, analytics, remote code, `eval`, or credential handling. The extension never modifies the Watchlist.
- Firefox treats host permissions as optional; sync fails until the user grants "Access your data for www.imdb.com".

## Fragility
IMDb markup and `__NEXT_DATA__` are not a public API. Fix breakage in `config.js` / `parse-watchlist.js` first. Verify against a real page, not guesses. A page with zero rows and a valid structure is a legitimately empty Watchlist. Garbled or unparseable pages must never wipe the cache.

## Release and publishing
- Releases are tag-driven (`.github/workflows/release.yml`, tags `v*`): tests → tag must equal `manifest.json` version → `npm run lint` → GitHub Release → Chrome Web Store, Edge Add-ons, AMO jobs. Each store job is gated by a repo variable (`CHROME_EXTENSION_ID`, `EDGE_PRODUCT_ID`, `AMO_PUBLISH`). Setup is in `docs/publishing.md`.
- **Every release needs a new `manifest.json` version**; stores reject a version they have already seen.
- Firefox add-on ID is `imdb-watchlist-checker@rsotolongo`. Permanent; never change it.
- Chrome and Edge share `dist/chrome.zip`; Firefox uses `dist/firefox.zip`.
- Secrets live only in GitHub Actions. Never print or commit credentials.
- **Never create or push `v*` tags**: a tag triggers publication to three public stores.

## Source control
- Work on the current branch; don't create branches or commit unless asked; ask at the end whether to commit, push, or open a PR.
- Commits are authored by the repo owner (`rsotolongo`). **No `Co-Authored-By` trailers or other attribution lines.**
- `main` is protected: others need a PR with 1 approval and resolved threads; the owner may push directly. Force pushes and deletions are blocked. Never force-push.
- Secret scanning with push protection is on; never commit tokens or keys.

## Repo layout notes
- Generated or ignored: `dist/`, `node_modules/`, `.remember/`, `docs/superpowers/` (local planning notes, may be stale: its spec still mentions a CSV export and `*.imdb.com`).
- Docs: `README.md` (users), `PRIVACY.md` (public policy, linked from store listings), `docs/publishing.md`, `docs/manual-test-checklist.md` (browsers not yet fully run), `docs/safari.md`.
- The ribbon is yellow (`#f5c518`) with a black ✓.
