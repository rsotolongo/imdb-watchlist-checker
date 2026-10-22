#!/usr/bin/env bash
# Microsoft Edge Add-ons API v1.1: upload a draft package, then submit it for certification.
# Usage: publish-edge.sh <package.zip> <certification notes>
# Env: EDGE_PRODUCT_ID, EDGE_CLIENT_ID, EDGE_API_KEY
set -euo pipefail

package=$1
notes=$2
base="https://api.addons.microsoftedge.microsoft.com/v1/products/$EDGE_PRODUCT_ID/submissions"
auth=(-H "Authorization: ApiKey $EDGE_API_KEY" -H "X-ClientID: $EDGE_CLIENT_ID")

operation_id() {
  grep -i '^location:' | tail -1 | awk '{print $2}' | tr -d '\r'
}

wait_for() {
  local url=$1 status body
  for _ in $(seq 1 60); do
    body=$(curl -sS --fail-with-body "${auth[@]}" "$url")
    status=$(jq -r .status <<<"$body")
    case $status in
      Succeeded) return 0 ;;
      InProgress) sleep 10 ;;
      *) echo "::error::Edge operation $status: $body"; return 1 ;;
    esac
  done
  echo "::error::Timed out waiting for $url"
  return 1
}

echo "Uploading $package"
upload_op=$(curl -sS --fail-with-body -D - -o /dev/null "${auth[@]}" \
  -H "Content-Type: application/zip" --data-binary "@$package" \
  "$base/draft/package" | operation_id)
wait_for "$base/draft/package/operations/$upload_op"

echo "Submitting for certification"
publish_op=$(curl -sS --fail-with-body -D - -o /dev/null "${auth[@]}" \
  -H "Content-Type: application/json" -d "$(jq -n --arg notes "$notes" '{notes: $notes}')" \
  "$base" | operation_id)
wait_for "$base/operations/$publish_op"
