function toKebabCase(value) {
  return value
    .replace(/([a-z0-9])([A-Z])/g, '$1-$2')
    .replace(/[^a-zA-Z0-9-]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .toLowerCase();
}

function toClassName(tagName) {
  return tagName
    .split('-')
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join('');
}

function makeRenderableTemplate(htmlFragment, attributeDefaults) {
  let template = htmlFragment;

  Object.entries(attributeDefaults).forEach(([key, value]) => {
    const escaped = String(value).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    template = template.replace(new RegExp(escaped, 'g'), `\${this.getAttribute('${key}') ?? '${value}'}`);
  });

  return template;
}

function toWebComponent(sliceResult, options = {}) {
  const tagName = toKebabCase(options.tagName || 'custom-sliced-component');
  const className = toClassName(tagName);

  const attributeDefaults = {};
  const schemaAttributes = [];
  for (const prop of sliceResult.detectedProps || []) {
    if (!prop.name || attributeDefaults[prop.name] !== undefined) continue;
    const defaultValue = prop.defaultValue || '';
    attributeDefaults[prop.name] = defaultValue;
    schemaAttributes.push({ name: prop.name, type: prop.type || 'string', defaultValue });
  }

  ['color', 'font-size', 'border-radius', 'text'].forEach((requiredAttr) => {
    if (attributeDefaults[requiredAttr] === undefined) {
      attributeDefaults[requiredAttr] = '';
      schemaAttributes.push({ name: requiredAttr, type: 'string', defaultValue: '' });
    }
  });

  const observedAttributes = Object.keys(attributeDefaults);
  const renderableTemplate = makeRenderableTemplate(sliceResult.htmlFragment, attributeDefaults);

  const source = `class ${className} extends HTMLElement {
  static get observedAttributes() {
    return ${JSON.stringify(observedAttributes)};
  }

  connectedCallback() {
    this.render();
  }

  attributeChangedCallback() {
    this.render();
  }

  render() {
    this.innerHTML = \`${renderableTemplate}\`;
  }
}

if (!customElements.get('${tagName}')) {
  customElements.define('${tagName}', ${className});
}
`;

  return {
    tagName,
    className,
    source,
    schema: { attributes: schemaAttributes }
  };
}

module.exports = {
  toWebComponent
};
