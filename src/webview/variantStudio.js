const fs = require('fs');
const path = require('path');
const { slice_entire_source } = require('../slicer/componentSlicer');
const { toWebComponent } = require('../transform/toWebComponent');

const MAX_IMPORT_CHARS = 1_500_000;

function getWebviewHtml(extensionUri, webview) {
  const htmlPath = path.join(extensionUri.fsPath, 'webview', 'index.html');
  let html = fs.readFileSync(htmlPath, 'utf8');
  
  // Replace relative paths with webview URIs (not needed for inline HTML, but kept for future use)
  return html;
}

function applyVariant(html, attrs) {
  let out = html;

  // Handle text replacement ONLY in the main content, not in <style> blocks
  if (attrs.text) {
    // Remove style blocks temporarily to protect them
    const styleBlocks = [];
    out = out.replace(/<style[^>]*>[\s\S]*?<\/style>/gi, (match) => {
      styleBlocks.push(match);
      return `__STYLE_PLACEHOLDER_${styleBlocks.length - 1}__`;
    });
    
    // Replace text in the HTML (first text node only)
    out = out.replace(/>([^<]+)</, `>${attrs.text}<`);
    
    // Restore style blocks
    styleBlocks.forEach((block, idx) => {
      out = out.replace(`__STYLE_PLACEHOLDER_${idx}__`, block);
    });
  }

  // Handle all CSS properties dynamically (but skip text)
  Object.entries(attrs).forEach(([propName, propValue]) => {
    if (!propValue || propName === 'text') return;

    // Try to replace existing CSS property in style blocks
    const cssRuleRegex = new RegExp(`(${propName}\\s*:\\s*)([^;]+)`, 'gi');
    if (cssRuleRegex.test(out)) {
      out = out.replace(cssRuleRegex, `$1${propValue}`);
    } else {
      // Try to update inline styles
      const inlineStyleRegex = /style\s*=\s*["']([^"']*)["']/i;
      if (inlineStyleRegex.test(out)) {
        out = out.replace(inlineStyleRegex, (m, style) => {
          if (new RegExp(`${propName}\\s*:`).test(style)) {
            return m.replace(new RegExp(`${propName}\\s*:\\s*[^;]+`), `${propName}: ${propValue}`);
          } else {
            return `style="${style}; ${propName}: ${propValue}"`;
          }
        });
      }
    }
  });

  return out;
}

function openVariantStudio(vscode, context, state) {
  const panel = vscode.window.createWebviewPanel(
    'customComponentsVariantStudio',
    'Custom Components Variant Studio',
    vscode.ViewColumn.Beside,
    { enableScripts: true }
  );

  // Set HTML content from file
  panel.webview.html = getWebviewHtml(context.extensionUri, panel.webview);

  panel.webview.onDidReceiveMessage(async (message) => {
    if (message.type === 'ready') {
      panel.webview.postMessage({
        type: 'state',
        payload: state.lastTemplate || null
      });
    }

    if (message.type === 'importHtml') {
      const raw = message.payload && message.payload.html;
      if (typeof raw !== 'string') {
        panel.webview.postMessage({
          type: 'importResult',
          payload: { ok: false, error: 'Expected HTML string in payload.' }
        });
        return;
      }
      if (raw.length > MAX_IMPORT_CHARS) {
        panel.webview.postMessage({
          type: 'importResult',
          payload: {
            ok: false,
            error: `HTML is too large (${raw.length} chars). Max supported is ${MAX_IMPORT_CHARS}.`
          }
        });
        return;
      }

      const slice = slice_entire_source(raw);
      if (!slice.htmlFragment.trim()) {
        panel.webview.postMessage({
          type: 'importResult',
          payload: { ok: false, error: slice.warnings[0] || 'Could not extract a component from that HTML.' }
        });
        return;
      }

      const tagInput =
        (message.payload && message.payload.tagName) ||
        (await vscode.window.showInputBox({
          prompt: 'Tag name for generated web component (kebab-case).',
          value: 'custom-sliced-component'
        }));

      if (!tagInput) {
        panel.webview.postMessage({
          type: 'importResult',
          payload: { ok: false, error: 'Import cancelled (no tag name).' }
        });
        return;
      }

      const template = toWebComponent(slice, { tagName: tagInput });
      state.lastSlice = slice;
      state.lastTemplate = template;

      panel.webview.postMessage({
        type: 'importResult',
        payload: { ok: true, warnings: slice.warnings, warningCount: slice.warnings.length }
      });
      panel.webview.postMessage({
        type: 'state',
        payload: state.lastTemplate
      });
      return;
    }

    if (message.type === 'preview' && state.lastSlice) {
      const attrs = message.payload || {};
      const rendered = applyVariant(state.lastSlice.htmlFragment, attrs);
      panel.webview.postMessage({ type: 'previewResult', payload: { html: rendered } });
    }

    if (message.type === 'insertSnippet') {
      const inserted = await state.insertVariantSnippet(vscode, message.payload || {});
      if (!inserted) {
        vscode.window.showWarningMessage('Slice or import a component first, then open Variant Studio again.');
        return;
      }

      vscode.window.showInformationMessage('Variant snippet inserted at cursor.');
    }
  });

  return panel;
}

module.exports = {
  openVariantStudio
};
