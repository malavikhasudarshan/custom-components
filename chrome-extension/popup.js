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

function normalizeInputForPreview(html) {
  let out = html;
  out = out.replace(/className=/g, 'class=');
  out = out.replace(/<>/g, '').replace(/<\/>/g, '');
  out = out.replace(/style=\{\{([\s\S]*?)\}\}/g, (_, styleObj) => {
    const normalized = styleObj
      .replace(/\n/g, ' ')
      .split(',')
      .map((part) => part.trim())
      .filter(Boolean)
      .map((part) => {
        const m = part.match(/^([a-zA-Z-]+)\s*:\s*(.+)$/);
        if (!m) return '';
        const key = m[1].replace(/([a-z])([A-Z])/g, '$1-$2').toLowerCase();
        const rawValue = m[2].trim().replace(/^['"]|['"]$/g, '');
        return `${key}: ${rawValue}`;
      })
      .filter(Boolean)
      .join('; ');
    return `style="${normalized}"`;
  });
  return out;
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
    .map(([key, value]) => `${key}="${String(value).replace(/"/g, '&quot;')}"`)
    .join(' ');
  const tag = toKebabCase(tagName);
  return `<${tag}${attrString ? ` ${attrString}` : ''}></${tag}>`;
}

function applyVariant(html, attrs) {
  let out = html;

  if (attrs.color) {
    if (/color\s*:[^;"']+/i.test(out)) {
      out = out.replace(/(color\s*:\s*)([^;"']+)/i, `$1${attrs.color}`);
    } else if (/style\s*=\s*["'][^"']*["']/i.test(out)) {
      out = out.replace(/style\s*=\s*["']([^"']*)["']/i, (m, style) => `style="${style}; color: ${attrs.color}"`);
    } else {
      out = out.replace(/<([a-zA-Z][^\s/>]*)/i, `<$1 style="color: ${attrs.color};"`);
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
    setStatus('Add an HTML slice first (pick on a page or paste).');
    return;
  }

  const normalized = normalizeInputForPreview(htmlSlice);
  const output = applyVariant(normalized, { color, fontSize, borderRadius, text });
  const previewFrame = document.getElementById('previewFrame');
  const previewDoc = `<!doctype html><html><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head><body style="margin:0">${output}</body></html>`;
  previewFrame.srcdoc = previewDoc;
  setStatus('Preview updated.');
}

function addVariantCard() {
  const { color, fontSize, borderRadius, text } = getInputs();
  const attrs = { color, 'font-size': fontSize, 'border-radius': borderRadius, text };
  const card = document.createElement('div');
  card.className = 'variant-card';
  card.draggable = true;
  card.textContent =
    Object.entries(attrs)
      .filter(([, value]) => value)
      .map(([k, v]) => `${k}: ${v}`)
      .join(', ') || 'default variant';
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
    setStatus('Add an HTML slice first.');
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
    setStatus('Add an HTML slice first.');
    return;
  }

  const source = generateWebComponentSource(tagName, htmlSlice, { color, fontSize, borderRadius, text });
  await navigator.clipboard.writeText(source);
  setStatus('Component source copied to clipboard.');
}

async function persistHtmlSlice() {
  const v = document.getElementById('htmlSlice').value;
  await chrome.storage.local.set({ lastCaptureHtml: v });
}

async function loadFromStorage() {
  const data = await chrome.storage.local.get(['lastCaptureHtml', 'lastCaptureUrl', 'lastCaptureAt', 'includePortableCss']);
  if (typeof data.includePortableCss === 'boolean') {
    document.getElementById('portableCss').checked = data.includePortableCss;
  }
  if (data.lastCaptureHtml) {
    document.getElementById('htmlSlice').value = data.lastCaptureHtml;
    const when = data.lastCaptureAt ? new Date(data.lastCaptureAt).toLocaleString() : '';
    setStatus(when ? `Loaded last capture (${when}).` : 'Loaded last capture.');
  }
}

async function pickOnActiveTab() {
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  if (!tab?.id) {
    setStatus('No active tab.');
    return;
  }
  const url = tab.url || '';
  if (url.startsWith('chrome://') || url.startsWith('chrome-extension://') || url.startsWith('edge://')) {
    setStatus('Open a normal http(s) page, then try again.');
    return;
  }

  const includePortableCss = document.getElementById('portableCss').checked;
  await chrome.storage.local.set({ includePortableCss });

  try {
    await chrome.tabs.sendMessage(tab.id, {
      type: 'START_PICK',
      options: { includePortableCss }
    });
    setStatus('Picker active on the tab — hover, click to capture, Esc cancels.');
  } catch {
    setStatus(
      'Could not reach the page script. Reload the tab after installing the extension, then try again.'
    );
  }
}

async function copyHtml() {
  const { htmlSlice } = getInputs();
  if (!htmlSlice) {
    setStatus('Nothing to copy.');
    return;
  }
  await navigator.clipboard.writeText(htmlSlice);
  setStatus('HTML copied to clipboard.');
}

async function copyForCursor() {
  const { htmlSlice } = getInputs();
  if (!htmlSlice) {
    setStatus('Nothing to copy.');
    return;
  }
  const block = [
    '<!-- Paste into Custom Components → Variant Studio "Import heavy components",',
    '     or save as .html and drop onto the import zone. -->',
    '',
    htmlSlice.trim(),
    ''
  ].join('\n');
  await navigator.clipboard.writeText(block);
  setStatus('HTML + instructions copied for VS Code / Cursor.');
}

function downloadHtml() {
  const { htmlSlice, tagName } = getInputs();
  if (!htmlSlice) {
    setStatus('Nothing to download.');
    return;
  }
  const blob = new Blob([`<!doctype html><meta charset="utf-8"><title>${toKebabCase(tagName)}-slice</title>\n${htmlSlice}\n`], {
    type: 'text/html'
  });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `${toKebabCase(tagName)}-slice.html`;
  a.click();
  URL.revokeObjectURL(url);
  setStatus('HTML slice downloaded.');
}

const dropZone = document.getElementById('dropZone');
const snippet = document.getElementById('snippet');

dropZone.addEventListener('dragover', (event) => {
  event.preventDefault();
});

dropZone.addEventListener('drop', (event) => {
  event.preventDefault();
  const raw = event.dataTransfer.getData('application/json') || '{}';
  let attrs = {};
  try {
    attrs = JSON.parse(raw);
  } catch {
    attrs = {};
  }
  const tagName = getInputs().tagName;
  snippet.textContent = renderSnippet(tagName, attrs);
  setStatus('Drop successful. Snippet generated below.');
});

document.getElementById('previewBtn').addEventListener('click', preview);
document.getElementById('makeVariantBtn').addEventListener('click', addVariantCard);
document.getElementById('downloadBtn').addEventListener('click', downloadJS);
document.getElementById('copyBtn').addEventListener('click', () => {
  copyJS().catch(() => setStatus('Clipboard copy failed — check extension permissions.'));
});
document.getElementById('pickBtn').addEventListener('click', () => {
  pickOnActiveTab().catch(() => setStatus('Pick failed.'));
});
document.getElementById('copyHtmlBtn').addEventListener('click', () => {
  copyHtml().catch(() => setStatus('Clipboard copy failed.'));
});
document.getElementById('copyForCursorBtn').addEventListener('click', () => {
  copyForCursor().catch(() => setStatus('Clipboard copy failed.'));
});
document.getElementById('downloadHtmlBtn').addEventListener('click', downloadHtml);

document.getElementById('portableCss').addEventListener('change', async (e) => {
  await chrome.storage.local.set({ includePortableCss: e.target.checked });
});

document.getElementById('htmlSlice').addEventListener('blur', () => {
  persistHtmlSlice().catch(() => {});
});

chrome.storage.onChanged.addListener((changes, area) => {
  if (area !== 'local' || !changes.lastCaptureHtml) return;
  const next = changes.lastCaptureHtml.newValue;
  if (typeof next === 'string') {
    document.getElementById('htmlSlice').value = next;
    setStatus('New capture received from the page.');
  }
});

loadFromStorage().catch(() => setStatus('Could not read saved capture.'));
