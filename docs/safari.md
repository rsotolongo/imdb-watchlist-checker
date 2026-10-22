# Safari

Safari extensions are packaged through Xcode, which needs macOS. The source here is already Safari-compatible (Manifest V3, `browser ?? chrome`).

1. On a Mac with Xcode: `xcrun safari-web-extension-converter /path/to/imdb-watchlist-checker`
2. Build and run the generated app, then enable the extension in Safari → Settings → Extensions.
3. For unsigned builds, enable Safari → Develop → Allow Unsigned Extensions (resets on Safari restart). Distribution needs an Apple Developer account.
4. Caveat: the manifest lists both `background.service_worker` and `background.scripts`; if the converter warns about one, remove the key Safari does not use.
