# Publishing

`.github/workflows/release.yml` runs on every `v*` tag: tests → `npm run lint` (packages `dist/chrome.zip` for Chrome and Edge, `dist/firefox.zip` for Firefox, and lints the Firefox build) → GitHub Release → one job per store. A store job runs only once its repository variable is set, so stores can be enabled one at a time.

| Store | Gate variable | Secrets |
|---|---|---|
| Chrome Web Store | `CHROME_EXTENSION_ID` | `CHROME_CLIENT_ID`, `CHROME_CLIENT_SECRET`, `CHROME_REFRESH_TOKEN` |
| Microsoft Edge Add-ons | `EDGE_PRODUCT_ID` | `EDGE_CLIENT_ID`, `EDGE_API_KEY` |
| Firefox Add-ons (AMO) | `AMO_PUBLISH` = `true` | `AMO_JWT_ISSUER`, `AMO_JWT_SECRET` |

Set them in GitHub → repo **Settings → Secrets and variables → Actions** (the *Variables* tab for the gate, *Secrets* tab for the rest).

The release steps themselves are in the [README](../README.md#merging-and-releasing). Each store still reviews the submission; the jobs finish when it is *submitted*, not when it is live.

## Packaging

`manifest.json` carries keys for every browser so the repo loads unpacked anywhere. `scripts/package.sh` (`npm run package`) writes a per-store manifest: the Chrome/Edge build drops `background.scripts` and `browser_specific_settings`, the Firefox build drops `background.service_worker`.

## Before the first automated release

All three stores need the first version uploaded **by hand**, because the listing (description, screenshots, privacy answers) can't be created through the API, and the IDs below only exist after that. Build the packages locally with `npm run package`.

Icons are in `icons/` (16/48/128 px). The store listings also ask for the 128 px icon and screenshots (1280×800 or 640×400).

## Chrome Web Store

1. Register at the [Chrome Web Store Developer Dashboard](https://chrome.google.com/webstore/devconsole) (one-time US$5 fee, 2-step verification required).
2. **New item** → upload `dist/chrome.zip` → fill in Store listing, Privacy (single purpose, justify `storage`, `alarms`, host permission; declare no data collection) → Submit for review.
3. Copy the item ID (32 lowercase letters in the item URL) → variable `CHROME_EXTENSION_ID`.
4. API credentials, in [Google Cloud Console](https://console.cloud.google.com/):
   1. Create a project, enable **Chrome Web Store API**.
   2. **OAuth consent screen**: External, add your Google account as a test user. Then **Publish app** to "In production" — refresh tokens for apps left in "Testing" expire after 7 days.
   3. **Credentials → Create OAuth client ID → Desktop app** → `CHROME_CLIENT_ID`, `CHROME_CLIENT_SECRET`.
5. Refresh token: run locally and follow the prompts, signed in as the account that owns the item:
   ```
   npx chrome-webstore-upload-keys
   ```
   → `CHROME_REFRESH_TOKEN`.

## Microsoft Edge Add-ons

1. Register at [Microsoft Partner Center](https://partner.microsoft.com/dashboard/microsoftedge/overview) (free).
2. **Create new extension** → upload `dist/chrome.zip` → fill in Availability, Properties, Store listings → Publish.
3. Copy the **Product ID** (Extension overview page) → variable `EDGE_PRODUCT_ID`.
4. Partner Center → Microsoft Edge → **Publish API** → **Create API credentials** → `EDGE_CLIENT_ID`, `EDGE_API_KEY`. The API key expires (72 days at the time of writing); Partner Center emails before it does — regenerate and update the secret.

Edge uses the same package as Chrome.

## Firefox Add-ons (AMO)

1. Sign in at [addons.mozilla.org Developer Hub](https://addons.mozilla.org/developers/) (free, Mozilla account).
2. **Submit a New Add-on** → *On this site* → upload `dist/firefox.zip` → describe it, choose a licence, answer the data-collection prompt (already declared as `none` in the manifest).
3. The add-on ID is `imdb-watchlist-checker@rsotolongo` (`browser_specific_settings.gecko.id`). It becomes permanent once AMO has seen it; never change it after the first upload.
4. **Tools → Manage API Keys** → generate credentials → *JWT issuer* → `AMO_JWT_ISSUER`, *JWT secret* → `AMO_JWT_SECRET`.
5. Set variable `AMO_PUBLISH` = `true`.

AMO may take a while to review a listed submission; `web-ext sign` exits once the upload is accepted for review. Run `npm run lint` before tagging to catch anything AMO's validator would flag; CI fails on any warning.
