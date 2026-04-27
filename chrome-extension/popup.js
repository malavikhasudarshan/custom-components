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

function getInputs() {
  return {
    tagName: document.getElementById('tagName').value.trim() || 'demo-card',
    htmlSlice: document.getElementById('htmlSlice').value.trim(),
    color: document.getElementById('color').value.trim(),
    fontSize: document.getElementById('fontSize').value.trim(),
    borderRadius: document.getElementById('borderRadius').value.trim(),
    text: document.getElementById('text').value.trim()
  };
}

function renderSnippet(tagName, attrs) {
  const attrString = Object.entries(attrs)
    .filter(([, value]) => value)
    .map(([key, value]) => `${key}="${value}"`)
    .join(' ');
  return `<${toKebabCase(tagName)}${attrString ? ` ${attrString}` : ''}></${toKebabCase(tagName)}>`;
}

function applyVariant(html, attrs) {
  let out = html;

  if (attrs.color) {
    if (/color\s*:[^;"']+/i.test(out)) {
      out = out.replace(/(color\s*:\s*)([^;"']+)/i, `$1${attrs.color}`);
    } else if (/style\s*=\s*["'][^"']*["']/i.test(out)) {
      out = out.replace(/style\s*=\s*["']([^"']*)["']/i, (m, style) => `style="${style}; color: ${attrs.color}"`);
    }
  }

  if (attrs.fontSize) {
    if (/font-size\s*:[^;"']+/i.test(out)) {
      out = out.replace(/(font-size\s*:\s*)([^;"']+)/i, `$1${attrs.fontSize}`);
    } else if (/style\s*=\s*["'][^"']*["']/i.test(out)) {
      out = out.replace(/style\s*=\s*["']([^"']*)["']/i, (m, style) => `style="${style}; font-size: ${attrs.fontSize}"`);
    }
  }

  if (attrs.borderRadius) {
    if (/border-radius\s*:[^;"']+/i.test(out)) {
      out = out.replace(/(border-radius\s*:\s*)([^;"']+)/i, `$1${attrs.borderRadius}`);
    } else if (/style\s*=\s*["'][^"']*["']/i.test(out)) {
      out = out.replace(/style\s*=\s*["']([^"']*)["']/i, (m, style) => `style="${style}; border-radius: ${attrs.borderRadius}"`);
    }
  }

  if (attrs.text) {
    out = out.replace(/>([^<]*)</, `>${attrs.text}<`);
  }

  return out;
}

function generateWebComponentSource(tagNameInput, htmlSlice, defaults) {
  const tagName = toKebabCase(tagNameInput || 'demo-card');
  const className = toClassName(tagName);
  const escapedTemplate = htmlSlice.replace(/`/g, '\\`');

  return `class ${className} extends HTMLElement {
  static get observedAttributes() {
    return ['color', 'font-size', 'border-radius', 'text'];
  }

  connectedCallback() {
    this.render();
  }

  attributeChangedCallback() {
    this.render();
  }

  render() {
    let html = \`${escapedTemplate}\`;
    const color = this.getAttribute('color') ?? '${defaults.color}';
    const fontSize = this.getAttribute('font-size') ?? '${defaults.fontSize}';
    const borderRadius = this.getAttribute('border-radius') ?? '${defaults.borderRadius}';
    const text = this.getAttribute('text') ?? '${defaults.text}';

    if (color) {
      if (/color\\s*:[^;"']+/i.test(html)) html = html.replace(/(color\\s*:\\s*)([^;"']+)/i, '$1' + color);
      else if (/style\\s*=\\s*["'][^"']*["']/i.test(html)) html = html.replace(/style\\s*=\\s*["']([^"']*)["']/i, (_, s) => 'style="' + s + '; color: ' + color + '"');
    }

    if (fontSize) {
      if (/font-size\\s*:[^;"']+/i.test(html)) html = html.replace(/(font-size\\s*:\\s*)([^;"']+)/i, '$1' + fontSize);
      else if (/style\\s*=\\s*["'][^"']*["']/i.test(html)) html = html.replace(/style\\s*=\\s*["']([^"']*)["']/i, (_, s) => 'style="' + s + '; font-size: ' + fontSize + '"');
    }

    if (borderRadius) {
      if (/border-radius\\s*:[^;"']+/i.test(html)) html = html.replace(/(border-radius\\s*:\\s*)([^;"']+)/i, '$1' + borderRadius);
      else if (/style\\s*=\\s*["'][^"']*["']/i.test(html)) html = html.replace(/style\\s*=\\s*["']([^"']*)["']/i, (_, s) => 'style="' + s + '; border-radius: ' + borderRadius + '"');
    }

    if (text) html = html.replace(/>([^<]*)</, '>' + text + '<');

    this.innerHTML = html;
  }
}

if (!customElements.get('${tagName}')) {
  customElements.define('${tagName}', ${className});
}
`;
}

function setStatus(message) {
  document.getElementById('status').textContent = message;
}

function preview() {
  const { htmlSlice, color, fontSize, borderRadius, text } = getInputs();
  if (!htmlSlice) {
    setStatus('Paste an HTML/CSS slice first.');
    return;
  }

  const output = applyVariant(htmlSlice, { color, fontSize, borderRadius, text });
  document.getElementById('preview').innerHTML = output;
  setStatus('Preview updated.');
}

function addVariantCard() {
  const { color, fontSize, borderRadius, text } = getInputs();
  const attrs = { color, 'font-size': fontSize, 'border-radius': borderRadius, text };
  const card = document.createElement('div');
  card.className = 'variant-card';
  card.draggable = true;
  card.textContent = Object.entries(attrs).filter(([, value]) => value).map(([k, v]) => `${k}: ${v}`).join(', ') || 'default variant';
  card.dataset.attrs = JSON.stringify(attrs);
  card.addEventListener('dragstart', (event) => {
    event.dataTransfer.setData('application/json', card.dataset.attrs || '{}');
  });
  document.getElementById('variants').appendChild(card);
  setStatus('Variant card created. Drag it to the drop zone.');
}

function downloadJS() {
  const { tagName, htmlSlice, color, fontSize, borderRadius, text } = getInputs();
  if (!htmlSlice) {
    setStatus('Paste an HTML/CSS slice first.');
    return;
  }

  const source = generateWebComponentSource(tagName, htmlSlice, { color, fontSize, borderRadius, text });
  const blob = new Blob([source], { type: 'text/javascript' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `${toKebabCase(tagName)}.component.js`;
  a.click();
  URL.revokeObjectURL(url);
  setStatus('Component source downloaded.');
}

async function copyJS() {
  const { tagName, htmlSlice, color, fontSize, borderRadius, text } = getInputs();
  if (!htmlSlice) {
    setStatus('Paste an HTML/CSS slice first.');
    return;
  }

  const source = generateWebComponentSource(tagName, htmlSlice, { color, fontSize, borderRadius, text });
  await navigator.clipboard.writeText(source);
  setStatus('Component source copied to clipboard.');
}

const dropZone = document.getElementById('dropZone');
const snippet = document.getElementById('snippet');

dropZone.addEventListener('dragover', (event) => {
  event.preventDefault();
});

dropZone.addEventListener('drop', (event) => {
  event.preventDefault();
  const raw = event.dataTransfer.getData('application/json') || '{}';
  const attrs = JSON.parse(raw);
  const tagName = getInputs().tagName;
  snippet.textContent = renderSnippet(tagName, attrs);
  setStatus('Drop successful. Snippet generated below.');
});

document.getElementById('previewBtn').addEventListener('click', preview);
document.getElementById('makeVariantBtn').addEventListener('click', addVariantCard);
document.getElementById('downloadBtn').addEventListener('click', downloadJS);
document.getElementById('copyBtn').addEventListener('click', () => {
  copyJS().catch(() => setStatus('Clipboard copy failed.'));
});
