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
  assert.equal(result.source.includes('this.attachShadow({ mode: \'open\' })'), true);
  assert.equal(result.schema.attributes.some((attr) => attr.name === 'color'), true);
});

test('toWebComponent creates parseable source for style blocks', () => {
  const slice = {
    htmlFragment: [
      '<style>',
      '.card {',
      '  color: teal;',
      '  font-size: 18px;',
      '  border-radius: 12px;',
      '  background: #f8fffe;',
      '}',
      '</style>',
      '<div class="card">Hello custom component</div>'
    ].join('\n'),
    detectedProps: [
      { name: 'color', type: 'string', defaultValue: 'teal' },
      { name: 'font-size', type: 'string', defaultValue: '18px' },
      { name: 'border-radius', type: 'string', defaultValue: '12px' },
      { name: 'background', type: 'string', defaultValue: '#f8fffe' },
      { name: 'text', type: 'string', defaultValue: 'Hello custom component' }
    ],
    styleBindings: ['color', 'font-size', 'border-radius', 'background'],
    warnings: []
  };

  const result = toWebComponent(slice, { tagName: 'custom-sliced-component' });
  assert.doesNotThrow(() => new Function(result.source));
});
