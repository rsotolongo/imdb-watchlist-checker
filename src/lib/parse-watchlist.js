function parseWatchlistPage(html) {
  const failed = { ok: false, ids: [], hasNext: false };
  const match = /<script id="__NEXT_DATA__"[^>]*>(.*?)<\/script>/s.exec(String(html ?? ''));
  if (!match) return failed;
  let search;
  try {
    search = JSON.parse(match[1]).props.pageProps.mainColumnData.predefinedList.titleListItemSearch;
  } catch {
    return failed;
  }
  if (!Array.isArray(search?.edges)) return failed;
  const ids = search.edges.map((edge) => edge?.listItem?.id);
  if (!ids.every((id) => /^tt\d+$/.test(id ?? ''))) return failed;
  return { ok: true, ids, hasNext: search.pageInfo?.hasNextPage === true };
}

if (typeof module !== 'undefined') module.exports = { parseWatchlistPage };
else (globalThis.IWC ??= {}).parseWatchlistPage = parseWatchlistPage;
