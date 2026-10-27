const test = require('node:test');
const assert = require('node:assert');
const { collectRows, markRows } = require('../src/lib/decorate.js');

const cfg = { personRowSelector: 'row', titleLinkSelector: 'link', posterSelector: 'poster' };

function fakeHost() {
  const classes = new Set();
  const children = [];
  return { classes, children, classList: { add: (c) => classes.add(c) }, appendChild: (n) => children.push(n) };
}

function fakeRow(href, { marked = false, poster = true } = {}) {
  const attrs = new Map(marked ? [['data-iwc', '']] : []);
  const link = href && { getAttribute: () => href };
  const posterHost = poster ? fakeHost() : null;
  const rowHost = fakeHost();
  return {
    posterHost,
    rowHost,
    hasAttribute: (name) => attrs.has(name),
    setAttribute: (name, value) => attrs.set(name, value),
    querySelector: (selector) => (selector === 'link' ? link || null : posterHost),
    classList: rowHost.classList,
    appendChild: rowHost.appendChild,
  };
}

function fakeNode(tag) {
  const attrs = {};
  const children = [];
  return { tag, attrs, children, setAttribute: (n, v) => { attrs[n] = v; }, appendChild: (c) => children.push(c) };
}

const fakeDoc = { createElement: (tag) => fakeNode(tag), createElementNS: (_ns, tag) => fakeNode(tag) };
const fakeRoot = (rows) => ({ querySelectorAll: () => rows });

test('collectRows_skipsRowsWithDataIwc', () => {
  const rows = collectRows(fakeRoot([fakeRow('/title/tt1/', { marked: true }), fakeRow('/title/tt2/')]), cfg);
  assert.deepStrictEqual(rows.map((r) => r.id), ['tt2']);
});

test('collectRows_rowWithoutTitleLink_skipped', () => {
  assert.deepStrictEqual(collectRows(fakeRoot([fakeRow(null)]), cfg), []);
});

test('markRows_rowWithPoster_addsRibbonToPoster', () => {
  const row = fakeRow('/title/tt1/?ref_=nm_flmg');
  assert.strictEqual(markRows(collectRows(fakeRoot([row]), cfg), new Set(['tt1']), fakeDoc), 1);
  assert.strictEqual(row.posterHost.children.length, 1);
  assert.strictEqual(row.posterHost.children[0].title, 'On your Watchlist');
  assert.ok(row.posterHost.classes.has('iwc-host'));
  assert.strictEqual(row.rowHost.children.length, 0);
});

test('markRows_watchlisted_ribbonIsSvgWithShapes', () => {
  const row = fakeRow('/title/tt1/');
  markRows(collectRows(fakeRoot([row]), cfg), new Set(['tt1']), fakeDoc);
  const [svg] = row.posterHost.children[0].children;
  assert.strictEqual(svg.tag, 'svg');
  assert.strictEqual(svg.attrs['aria-hidden'], 'true');
  assert.deepStrictEqual(svg.children.map((c) => c.tag), ['polygon', 'path']);
});

test('markRows_rowWithoutPoster_addsRibbonToRow', () => {
  const row = fakeRow('/title/tt1/', { poster: false });
  markRows(collectRows(fakeRoot([row]), cfg), new Set(['tt1']), fakeDoc);
  assert.strictEqual(row.rowHost.children.length, 1);
  assert.ok(row.rowHost.classes.has('iwc-host'));
});

test('markRows_sameTitleInTwoSections_marksEachRowOnce', () => {
  const rows = [fakeRow('/title/tt1/'), fakeRow('/title/tt1/')];
  assert.strictEqual(markRows(collectRows(fakeRoot(rows), cfg), new Set(['tt1']), fakeDoc), 2);
  assert.deepStrictEqual(rows.map((r) => r.posterHost.children.length), [1, 1]);
});

test('markRows_runTwice_noDuplicates', () => {
  const row = fakeRow('/title/tt1/');
  const root = fakeRoot([row]);
  markRows(collectRows(root, cfg), new Set(['tt1']), fakeDoc);
  markRows(collectRows(root, cfg), new Set(['tt1']), fakeDoc);
  assert.strictEqual(row.posterHost.children.length, 1);
});

test('markRows_nonWatchlisted_untouched', () => {
  const row = fakeRow('/title/tt9/');
  assert.strictEqual(markRows(collectRows(fakeRoot([row]), cfg), new Set(['tt1']), fakeDoc), 0);
  assert.strictEqual(row.posterHost.children.length, 0);
});
