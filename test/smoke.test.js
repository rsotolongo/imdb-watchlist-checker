const test = require('node:test');
const assert = require('node:assert');
const fs = require('node:fs');
const path = require('node:path');

test('config_loaded_hasSixHourSyncInterval', () => {
  const config = require('../src/config.js');
  assert.strictEqual(config.syncIntervalMinutes, 360);
});

test('manifest_permissions_areMinimal', () => {
  const manifest = JSON.parse(fs.readFileSync(path.join(__dirname, '../manifest.json'), 'utf8'));
  assert.deepStrictEqual(manifest.permissions, ['storage', 'alarms']);
  assert.deepStrictEqual(manifest.host_permissions, ['https://www.imdb.com/*']);
});
