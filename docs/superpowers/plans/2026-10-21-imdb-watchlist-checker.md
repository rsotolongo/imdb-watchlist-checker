# IMDb Watchlist Checker Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** A Manifest V3 browser extension that shows a ✓ next to every filmography title on IMDb person pages when that title is on the user's Watchlist.

**Architecture:** A background worker owns the Watchlist ID set in `storage.local`, fed by a scheduled export fetch plus passive updates from title pages. Content scripts on person pages query the worker and decorate rows. Logic lives in small classic-script modules in `src/lib/` that export via `module.exports` for `node:test` and via `globalThis.IWC` in the browser (no bundler, no ES modules).

**Tech Stack:** Plain JavaScript, WebExtension MV3, `node:test`, Node 20+.

**Spec:** `docs/superpowers/specs/2026-10-21-imdb-watchlist-checker-design.md`

## Global Constraints

- Browsers: Chrome, Edge, Firefox (desktop). Safari: code stays compatible; only `docs/safari.md` is written.
- Manifest V3; one manifest with both `background.service_worker` and `background.scripts`.
- Permissions exactly: `storage`, `alarms`, host `*://*.imdb.com/*`.
- Read-only: never modify the Watchlist. No analytics; network calls only to imdb.com.
- No build step. Cross-browser API via `globalThis.browser ?? chrome`.
- Sync: on install, every 6 hours (`alarms`), on demand from popup.
- A sync replaces the cache only if the CSV header is present and every parsed row is a valid `tt\d+` ID; a header with zero rows is a valid empty Watchlist.
- All storage writes go through one serialized queue.
- Selectors and the export URL live only in `src/config.js`.
- Checkmark: small green ✓ before the title, tooltip "On your Watchlist", marked `data-iwc`, inserted once per row, light/dark safe.
- The assistant never enters IMDb credentials; live checks use the user's logged-in browser.
- The directory is not a git repo. Skip commit steps unless the user runs `git init`; if so, commit after each task.

## Review Focus

- Title ID appearing twice on one person page (Actor + Producer sections): each row gets one ✓, none doubled → Task 6.
- Rows added after load ("See all", infinite load) and re-scans of already-marked rows: no duplicate ✓ → Task 6.
- Sync response is an HTML sign-in page or empty body: old cache survives → Task 2 and Task 5.
- Sync racing a ribbon toggle: the toggle is not lost → Task 4.
- Links with query strings, trailing paths, other locales (`/title/tt123/?ref_=nm_flmg`, `/de/title/tt123/`): ID still extracted; non-title links ignored → Task 3.

---

### Task 1: Scaffold, manifest, test runner

**Files:**
- Create: `manifest.json`, `package.json`, `src/config.js`, `src/lib/browser.js`, `test/smoke.test.js`

**Interfaces:**
- Produces: `IWC.config` (object, see below), `IWC.api` (the `browser ?? chrome` namespace). Every `src/lib/*.js` and `src/config.js` ends with the footer `if (typeof module !== 'undefined') module.exports = X; else (globalThis.IWC ??= {}).name = X;`.

- [ ] **Step 1: Write failing test** `test/smoke.test.js`: `require('../src/config.js')` returns an object with `syncIntervalMinutes === 360`, and `manifest.json` parses with `permissions` deep-equal `['storage','alarms']` and `host_permissions` deep-equal `['*://*.imdb.com/*']`.
- [ ] **Step 2: Run** `node --test test/` → FAIL (files missing).
- [ ] **Step 3: Create files.** `package.json`: `{"private":true,"scripts":{"test":"node --test test/"}}`. `manifest.json`: MV3, `background` with both `service_worker: "src/background.js"` and `scripts: ["src/config.js","src/lib/browser.js","src/lib/parse-export.js","src/lib/store.js","src/lib/sync.js","src/background.js"]`, `browser_specific_settings.gecko.id` set, `action.default_popup: "src/popup.html"`, content scripts: `/name/*` → `src/config.js, src/lib/browser.js, src/lib/extract-ids.js, src/content-name.js` (+ `src/content.css`); `/title/*` → `src/config.js, src/lib/browser.js, src/lib/extract-ids.js, src/content-title.js`; both `run_at: document_idle`, matches `*://*.imdb.com/name/*` and `*://*.imdb.com/title/*`. `config.js` exports `{ syncIntervalMinutes: 360, exportUrl: null, personRowSelector: null, titleLinkSelector: 'a[href*="/title/tt"]', ribbonSelector: null, ribbonOnValue: null }` (nulls are filled in Tasks 5–7). `browser.js` exports `globalThis.browser ?? globalThis.chrome`.
- [ ] **Step 4: Run** `npm test` → PASS.

### Task 2: Export parser

**Files:**
- Create: `src/lib/parse-export.js`, `test/parse-export.test.js`, `test/fixtures/export-sample.csv`, `test/fixtures/signin.html`

**Interfaces:**
- Produces: `parseExport(text: string): { ok: boolean, ids: string[] }`. `ok` is false unless the first line has a `Const` column header; `ids` are the `Const` column values, deduped. `ok` is false if any row's `Const` is not `/^tt\d+$/`.

- [ ] **Step 1: Tests** (names): `parseExport_validExport_returnsIds` (fixture with header `Position,Const,Created,...` and 3 rows incl. a quoted title containing a comma), `parseExport_headerOnly_okWithEmptyIds`, `parseExport_signInHtml_notOk`, `parseExport_emptyString_notOk`, `parseExport_badConstValue_notOk`, `parseExport_duplicateRows_dedupes`.
- [ ] **Step 2: Run** → FAIL.
- [ ] **Step 3: Implement** with a small RFC-4180 line/field splitter (quotes, embedded commas, CRLF, BOM).
- [ ] **Step 4: Run** → PASS.

### Task 3: Title-ID extraction

**Files:**
- Create: `src/lib/extract-ids.js`, `test/extract-ids.test.js`

**Interfaces:**
- Produces: `titleIdFromHref(href: string): string | null`.

- [ ] **Step 1: Tests** via `[Theory]`-style table loop: `/title/tt1234567/` → `tt1234567`; `https://www.imdb.com/title/tt1234567/?ref_=nm_flmg_t_1` → same; `/de/title/tt1234567/characters/nm0000354` → `tt1234567`; `/name/nm0000354/` → null; `/title/tt/` → null; `''` → null.
- [ ] **Step 2: Run** → FAIL. **Step 3: Implement** with regex `/\/title\/(tt\d+)(?:[/?#]|$)/`. **Step 4: Run** → PASS.

### Task 4: Watchlist store with serialized writes

**Files:**
- Create: `src/lib/store.js`, `test/store.test.js`

**Interfaces:**
- Produces: `createStore(storageArea: { get(keys): Promise<object>, set(obj): Promise<void> }): { getState(): Promise<{ids: string[], lastSynced: number|null, lastError: string|null}>, replaceAll(ids: string[], now: number): Promise<void>, setOne(id: string, present: boolean): Promise<void>, recordError(code: 'signed-out'|'failed', now: number): Promise<void>, has(ids: string[]): Promise<string[]> }`. Storage keys: `ids`, `lastSynced`, `lastError`. Every mutator is chained on one internal promise queue.

- [ ] **Step 1: Tests** with an in-memory fake storage: `replaceAll_setsIdsAndClearsError`; `setOne_addAndRemove`; `has_returnsOnlyKnownIds`; `recordError_keepsExistingIds`; `concurrentSetOneAndReplaceAll_appliedInCallOrder` (call `replaceAll([a])` then `setOne(b,true)` without awaiting; final ids = `[a,b]`).
- [ ] **Step 2: Run** → FAIL. **Step 3: Implement.** **Step 4: Run** → PASS.

### Task 5: Background worker — sync, alarms, messages

**Files:**
- Create: `src/background.js`
- Modify: `src/config.js` (set `exportUrl`)
- Test: `test/sync.test.js` (for the extracted pure function)

**Interfaces:**
- Consumes: `parseExport`, `createStore`, `IWC.api`, `IWC.config`.
- Produces: `runSync(fetchFn: typeof fetch, store, now: number): Promise<'ok'|'signed-out'|'failed'>` (in `src/lib/sync.js`, added to the manifest background scripts list; `background.js` wires it). Message protocol (`api.runtime.onMessage`): `{type:'has', ids}` → `string[]`; `{type:'set', id, present}` → `true`; `{type:'sync'}` → status string; `{type:'state'}` → `getState()` result.

- [ ] **Step 1: Discover the export (open risk 1).** With the user logged in at imdb.com (Chrome browser tools; do not enter credentials), find the Watchlist's `ls…` list ID and the CSV export URL; confirm a credentialed `fetch(url, {credentials:'include'})` from an imdb.com page returns the CSV and that a logged-out request redirects to a sign-in URL. Save one sanitized sample to `test/fixtures/export-sample.csv` and record the URL pattern (with how the list ID is discovered at runtime) in `config.js`.
- [ ] **Step 2: Tests** with a fake `fetchFn`: `runSync_validCsv_replacesAndReturnsOk`; `runSync_redirectedToSignIn_recordsSignedOutKeepsIds` (response `redirected` with a sign-in URL or `parseExport` not ok on HTML); `runSync_networkError_recordsFailedKeepsIds`; `runSync_garbledBody_keepsIds`.
- [ ] **Step 3: Run** → FAIL. **Step 4: Implement** `runSync`, then `background.js`: `importScripts` for the lib files when `typeof importScripts === 'function'`; on `runtime.onInstalled` run sync and `alarms.create('iwc-sync',{periodInMinutes: config.syncIntervalMinutes})`; on alarm run sync; register the message handlers (return `true` for async).
- [ ] **Step 5: Run** `npm test` → PASS. Load unpacked in Chrome, open the service worker console, confirm `{type:'state'}` shows the real item count.

### Task 6: Person-page content script

**Files:**
- Create: `src/content-name.js`, `src/content.css`, `test/decorate.test.js`
- Create: `src/lib/decorate.js` (`collectRows`, `markRows`; add it to the `/name/*` content script list in `manifest.json`)
- Modify: `src/config.js` (`personRowSelector`)

**Interfaces:**
- Consumes: `titleIdFromHref`, message `{type:'has', ids}`.
- Produces: `collectRows(root: ParentNode, cfg): Array<{el: Element, id: string}>` — rows matching `personRowSelector` that contain a title link and lack `[data-iwc]` ; `markRows(rows, watchIds: Set<string>): number` adds `<span class="iwc-check" title="On your Watchlist">✓</span>` before the title link and sets `data-iwc` on the row, returns the count added. Test with a small fake DOM (`linkedom` as the only devDependency) or hand-rolled stubs.

- [ ] **Step 1: Inspect live markup (open risk 2).** On `https://www.imdb.com/name/nm0000354/` read the DOM with the browser tools; choose `personRowSelector` for one filmography row, check that "See all"/lazy loading inserts new rows into the same container; save a trimmed HTML fixture to `test/fixtures/person.html`.
- [ ] **Step 2: Tests:** `markRows_watchlistedRow_addsOneCheck`; `markRows_sameTitleInTwoSections_marksEachRowOnce`; `markRows_runTwice_noDuplicates`; `markRows_nonWatchlisted_untouched`; `collectRows_skipsRowsWithDataIwc`.
- [ ] **Step 3: Run** → FAIL. **Step 4: Implement** the two functions and `content-name.js`: on load and on `MutationObserver` batches (debounced ~200 ms) run collect → `has` → mark. `content.css`: green via `color: #2e7d32` in light and `#66bb6a` under `@media (prefers-color-scheme: dark)`, `margin-right: .4em`, inline.
- [ ] **Step 5: Run** `npm test` → PASS. Reload the extension, open the actor page, verify ✓ appears on watchlisted titles and after clicking "See all".

### Task 7: Title-page reporter and popup

**Files:**
- Create: `src/content-title.js`, `src/popup.html`, `src/popup.js`
- Modify: `src/config.js` (`ribbonSelector`)

**Interfaces:**
- Consumes: message `{type:'set'}`, `{type:'sync'}`, `{type:'state'}`.

- [ ] **Step 1: Inspect live markup** on `https://www.imdb.com/title/tt32642706/`; set `ribbonSelector` and decide how "on watchlist" is distinguished (checkmark vs plus, e.g. `aria-label` or class); record it in a comment-free config key `ribbonOnValue`.
- [ ] **Step 2: Implement `content-title.js`:** derive the ID from `location.pathname` via `titleIdFromHref`, send `set` with the initial ribbon state, and observe the ribbon for toggles (MutationObserver on attributes) to send `set` again.
- [ ] **Step 3: Implement popup:** shows item count, "Last synced <local time>", status line ("Sign in to IMDb" for `signed-out`, "Last sync failed <time>" for `failed`), and a "Sync now" button that sends `sync` then refreshes.
- [ ] **Step 4: Verify manually:** toggle the ribbon on a title page, reopen the popup (count changes by one), then check that the actor page reflects it after reload.

### Task 8: Docs and cross-browser check

**Files:**
- Create: `README.md`, `docs/safari.md`, `docs/manual-test-checklist.md`

- [ ] **Step 1: README:** purpose, load-unpacked steps for Chrome/Edge (`chrome://extensions`, `edge://extensions`) and Firefox (`about:debugging` → Load Temporary Add-on), permissions rationale, privacy note, known fragility (IMDb markup/export).
- [ ] **Step 2: `docs/safari.md`:** `xcrun safari-web-extension-converter <path>` steps, enabling unsigned extensions, developer-account note, "background.scripts vs service_worker" caveat.
- [ ] **Step 3: Checklist** from the spec's manual list (load, sync, actor page, ribbon toggle, "See all", signed-out state), then run it in Chrome, Edge and Firefox and record pass/fail per browser at the bottom of the file.
- [ ] **Step 4: Run** `npm test` → all PASS; report any browser step that could not be verified.
