const test = require('node:test');
const assert = require('node:assert/strict');
const { toWebComponent } = require('../src/transform/toWebComponent');

test('toWebComponent creates class source and schema', () => {
  const slice = {
    htmlFragment: '<div style="color: red">Hello</div>',
    detectedProps: [{ name: 'color', type: 'string', defaultValue: 'red' }],
    styleBindings: ['color'],
    warnings: []
  };

  const result = toWebComponent(slice, { tagName: 'demo-card' });
  assert.equal(result.tagName, 'demo-card');
  assert.equal(result.source.includes('class DemoCard extends HTMLElement'), true);
  assert.equal(result.schema.attributes.some((attr) => attr.name === 'color'), true);
});
