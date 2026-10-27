# Privacy Policy

**IMDb Watchlist Checker** — last updated 2026-10-23

## Summary

The extension does not collect, transmit, sell or share any personal data. Everything it handles stays in your browser.

## What the extension accesses

- **Your IMDb Watchlist.** With your existing signed-in IMDb session, the extension reads your Watchlist pages on `www.imdb.com` to get the IDs of the titles on it (for example `tt1234567`).
- **IMDb pages you visit.** On person pages (`/name/…`) it reads the film links so it can mark the ones on your Watchlist. On title pages (`/title/…`) it reads whether the poster shows the Watchlist ribbon, so changes you make are picked up without waiting for the next sync.

## What the extension stores

The set of Watchlist title IDs and the time and status of the last sync are saved in the browser's local extension storage (`storage.local`) on your device. Nothing else is stored.

## What leaves your browser

Nothing. The only network requests the extension makes are to `https://www.imdb.com`, to read your Watchlist, using your own session. It has no servers, analytics, advertising or tracking, and it does not use remote code.

The extension never modifies your Watchlist and never reads or stores your IMDb credentials.

## Your control

Removing the extension deletes its stored data. You can also clear it from your browser's extension settings.

## Changes and contact

Changes to this policy are published in this file with a new date. Questions: open an issue at <https://github.com/rsotolongo/imdb-watchlist-checker/issues>.
