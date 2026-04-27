const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const os = require('os');
const path = require('path');
const { saveLibraryItem, listLibraryItems } = require('../src/library/store');

test('saveLibraryItem writes metadata and generated source', () => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'cc-lib-'));
  const template = {
    tagName: 'demo-card',
    source: 'class DemoCard extends HTMLElement {}',
    schema: { attributes: [{ name: 'color', type: 'string', defaultValue: 'blue' }] }
  };

  const saved = saveLibraryItem(root, 'Demo Card', template);
  const list = listLibraryItems(root);

  assert.equal(saved.name, 'Demo Card');
  assert.equal(list.length, 1);
  assert.equal(list[0].tagName, 'demo-card');
});
