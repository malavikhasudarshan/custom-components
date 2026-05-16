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
  const placeholders = {};
  let placeholderIndex = 0;

  Object.entries(attributeDefaults).forEach(([key, value]) => {
    if (!value) return;
    const escaped = String(value).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const placeholder = `__CC_ATTR_${placeholderIndex}__`;
    placeholderIndex += 1;
    placeholders[key] = placeholder;
    template = template.replace(new RegExp(escaped, 'g'), placeholder);
  });

  return { template, placeholders };
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
  const { template: renderableTemplate, placeholders } = makeRenderableTemplate(
    sliceResult.htmlFragment,
    attributeDefaults
  );

  const source = `class ${className} extends HTMLElement {
  static get observedAttributes() {
    return ${JSON.stringify(observedAttributes)};
  }

  connectedCallback() {
    if (!this.shadowRoot) {
      this.attachShadow({ mode: 'open' });
    }
    this.render();
  }

  attributeChangedCallback() {
    this.render();
  }

  render() {
    let html = ${JSON.stringify(renderableTemplate)};
    const defaults = ${JSON.stringify(attributeDefaults)};
    const placeholders = ${JSON.stringify(placeholders)};

    for (const [name, placeholder] of Object.entries(placeholders)) {
      html = html.split(placeholder).join(this.getAttribute(name) ?? defaults[name] ?? '');
    }

    this.shadowRoot.innerHTML = html;
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
