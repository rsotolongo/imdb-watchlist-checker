function watchlistHtml(ids, hasNextPage) {
  const data = {
    props: { pageProps: { mainColumnData: { predefinedList: { titleListItemSearch: {
      total: ids.length,
      edges: ids.map((id) => ({ listItem: { id } })),
      pageInfo: { hasNextPage },
    } } } } },
  };
  return `<html><body><script id="__NEXT_DATA__" type="application/json">${JSON.stringify(data)}</script></body></html>`;
}

module.exports = { watchlistHtml };
