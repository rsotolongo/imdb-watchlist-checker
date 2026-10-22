function titleIdFromHref(href) {
  const match = /\/title\/(tt\d+)(?:[/?#]|$)/.exec(href ?? '');
  return match ? match[1] : null;
}

if (typeof module !== 'undefined') module.exports = { titleIdFromHref };
else (globalThis.IWC ??= {}).titleIdFromHref = titleIdFromHref;
