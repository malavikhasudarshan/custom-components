const test = require('node:test');
const assert = require('node:assert/strict');
const { component_slicer } = require('../src/slicer/componentSlicer');

test('component_slicer extracts selected fragment and style props', () => {
  const source = [
    'export function Card(){',
    '  return (',
    '    <div style={{ color: "red", fontSize: "14px", borderRadius: "8px" }}>Hello</div>',
    '  );',
    '}'
  ].join('\n');

  const result = component_slicer(source, 3, 3);
  assert.equal(result.htmlFragment.includes('<div'), true);
  assert.equal(result.detectedProps.some((p) => p.name === 'color'), true);
  assert.equal(result.detectedProps.some((p) => p.name === 'font-size'), true);
  assert.equal(result.detectedProps.some((p) => p.name === 'border-radius'), true);
});

test('component_slicer includes matching css rules from style block', () => {
  const source = [
    '<style>',
    '.card { color: purple; border-radius: 12px; }',
    '.other { color: gray; }',
    '</style>',
    '<div class="card">Hello</div>'
  ].join('\n');

  const result = component_slicer(source, 5, 5);
  assert.equal(result.htmlFragment.includes('<style>'), true);
  assert.equal(result.htmlFragment.includes('.card { color: purple; border-radius: 12px; }'), true);
  assert.equal(result.htmlFragment.includes('.other { color: gray; }'), false);
});

test('component_slicer warns on invalid ranges', () => {
  const result = component_slicer('<div>Test</div>', 3, 1);
  assert.equal(result.warnings.length > 0, true);
});

test('component_slicer extracts all CSS properties from class rules', () => {
  const source = [
    '<style>',
    '.card { background-color: #3b82f6; color: white; padding: 20px; border-radius: 12px; font-size: 16px; }',
    '</style>',
    '<div class="card">Hello</div>'
  ].join('\n');

  const result = component_slicer(source, 4, 4);
  console.log('Detected props:', JSON.stringify(result.detectedProps, null, 2));
  assert.equal(result.detectedProps.length > 0, true);
  assert.equal(result.detectedProps.some((p) => p.name === 'background-color'), true);
  assert.equal(result.detectedProps.some((p) => p.name === 'color'), true);
  assert.equal(result.detectedProps.some((p) => p.name === 'padding'), true);
});
