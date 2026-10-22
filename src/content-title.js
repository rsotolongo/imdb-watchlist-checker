(() => {
  const { api, config, titleIdFromHref } = globalThis.IWC;
  const id = titleIdFromHref(location.pathname);
  if (!id) return;

  let last = null;
  const report = (ribbon) => {
    if (ribbon.classList.contains('ipc-watchlist-ribbon--loading')) return;
    const present = ribbon.getAttribute('aria-pressed') === config.ribbonOnValue;
    if (present === last) return;
    last = present;
    api.runtime.sendMessage({ type: 'set', id, present });
  };

  const attach = () => {
    const ribbon = document.querySelector(config.ribbonSelector);
    if (!ribbon) return false;
    new MutationObserver(() => report(ribbon)).observe(ribbon, {
      attributes: true,
      attributeFilter: ['aria-pressed', 'class'],
    });
    report(ribbon);
    return true;
  };

  if (!attach()) {
    const waiter = new MutationObserver(() => { if (attach()) waiter.disconnect(); });
    waiter.observe(document.body, { childList: true, subtree: true });
  }
})();
