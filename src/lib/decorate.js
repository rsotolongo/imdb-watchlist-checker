const _titleIdFromHref = typeof module !== 'undefined'
  ? require('./extract-ids.js').titleIdFromHref
  : globalThis.IWC.titleIdFromHref;

const SVG_NS = 'http://www.w3.org/2000/svg';

const RIBBON_SVG = ['svg', { width: '18', height: '26', viewBox: '0 0 18 26', 'aria-hidden': 'true' }, [
  ['polygon', { points: '0 0 18 0 18 24 9 19 0 24', fill: '#f5c518' }],
  ['path', { d: 'M4.5 8.5 8 12 13.5 5.5', fill: 'none', stroke: '#000', 'stroke-width': '2' }],
]];

function svgNode(doc, [tag, attrs, children = []]) {
  const node = doc.createElementNS(SVG_NS, tag);
  for (const [name, value] of Object.entries(attrs)) node.setAttribute(name, value);
  for (const child of children) node.appendChild(svgNode(doc, child));
  return node;
}

function collectRows(root, cfg) {
  const entries = [];
  for (const el of root.querySelectorAll(cfg.personRowSelector)) {
    if (el.hasAttribute('data-iwc')) continue;
    const link = el.querySelector(cfg.titleLinkSelector);
    const id = link && _titleIdFromHref(link.getAttribute('href'));
    if (id) entries.push({ el, id, host: el.querySelector(cfg.posterSelector) ?? el });
  }
  return entries;
}

function markRows(entries, watchIds, doc) {
  let added = 0;
  for (const { el, id, host } of entries) {
    el.setAttribute('data-iwc', '');
    if (!watchIds.has(id)) continue;
    const mark = doc.createElement('span');
    mark.className = 'iwc-check';
    mark.title = 'On your Watchlist';
    mark.appendChild(svgNode(doc, RIBBON_SVG));
    host.classList.add('iwc-host');
    host.appendChild(mark);
    added++;
  }
  return added;
}

if (typeof module !== 'undefined') module.exports = { collectRows, markRows };
else Object.assign((globalThis.IWC ??= {}), { collectRows, markRows });
