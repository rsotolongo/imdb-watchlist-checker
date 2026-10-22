#!/usr/bin/env bash
# Builds store packages into dist/. manifest.json carries keys for every browser so the repo
# loads unpacked anywhere; each package drops the keys its store rejects or warns about.
set -euo pipefail
cd "$(dirname "$0")/.."

rm -rf dist
build() {
  local target=$1 filter=$2
  mkdir -p "dist/$target"
  cp -r src icons "dist/$target/"
  jq "$filter" manifest.json > "dist/$target/manifest.json"
  (cd "dist/$target" && zip -qr "../$target.zip" .)
}

build chrome 'del(.background.scripts, .browser_specific_settings)'
build firefox 'del(.background.service_worker)'
echo "Built dist/chrome.zip (Chrome, Edge) and dist/firefox.zip"
