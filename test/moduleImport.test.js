const test = require('node:test');
const assert = require('node:assert/strict');
const path = require('path');
const {
  getMissingModuleScriptInsertion,
  toBrowserRelativePath
} = require('../src/library/moduleImport');

test('toBrowserRelativePath creates browser-friendly paths', () => {
  const from = path.join('/workspace', 'source-slice.html');
  const target = path.join('/workspace', '.custom-components', 'generated', 'demo-card.component.js');

  assert.equal(
    toBrowserRelativePath(from, target),
    './.custom-components/generated/demo-card.component.js'
  );
});

test('getMissingModuleScriptInsertion inserts before closing head', () => {
  const html = ['<!doctype html>', '<html>', '<head>', '  <title>Demo</title>', '</head>', '<body></body>', '</html>'].join('\n');
  const from = path.join('/workspace', 'source-slice.html');
  const target = path.join('/workspace', '.custom-components', 'generated', 'demo-card.component.js');

  const insertion = getMissingModuleScriptInsertion(html, from, target);

  assert.equal(insertion.offset, html.indexOf('</head>'));
  assert.equal(
    insertion.text,
    '  <script type="module" src="./.custom-components/generated/demo-card.component.js"></script>\n'
  );
});

test('getMissingModuleScriptInsertion skips existing import', () => {
  const html =
    '<script type="module" src="./.custom-components/generated/demo-card.component.js"></script>\n<body></body>';
  const from = path.join('/workspace', 'source-slice.html');
  const target = path.join('/workspace', '.custom-components', 'generated', 'demo-card.component.js');

  assert.equal(getMissingModuleScriptInsertion(html, from, target), null);
});
