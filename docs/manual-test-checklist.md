# Manual test checklist

Run in each browser while signed in to IMDb. Record pass/fail below.

1. Load unpacked; open the popup. After a few seconds, count > 0 and a last-synced time appear.
2. Open https://www.imdb.com/name/nm0000354/ → ✓ appears before titles on your Watchlist (hover: "On your Watchlist").
3. Click "See all" → newly shown rows get ✓ too; no row shows two.
4. Open a title page, toggle the poster ribbon → popup count changes by one.
5. Sign out of IMDb, press "Sync now" → popup shows "Sign in to IMDb" and the count is unchanged.

## Results

| Browser | Result |
|---|---|
| Chrome | Not run (extension not loaded by the assistant). Logic verified live by injecting the real modules into the actor page: 13 ✓ on 63 rows, idempotent. |
| Edge | Not run |
| Firefox | Not run |
