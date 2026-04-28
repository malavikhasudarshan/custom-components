const fs = require('fs');
const path = require('path');

function getWebviewHtml(extensionUri, webview) {
  const htmlPath = path.join(extensionUri.fsPath, 'webview', 'index.html');
  let html = fs.readFileSync(htmlPath, 'utf8');
  
  // Replace relative paths with webview URIs (not needed for inline HTML, but kept for future use)
  return html;
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

  if (attrs['font-size']) {
    if (/font-size\s*:[^;"']+/i.test(out)) {
      out = out.replace(/(font-size\s*:\s*)([^;"']+)/i, `$1${attrs['font-size']}`);
    } else if (/style\s*=\s*["'][^"']*["']/i.test(out)) {
      out = out.replace(/style\s*=\s*["']([^"']*)["']/i, (m, style) => `style="${style}; font-size: ${attrs['font-size']}"`);
    }
  }

  if (attrs['border-radius']) {
    if (/border-radius\s*:[^;"']+/i.test(out)) {
      out = out.replace(/(border-radius\s*:\s*)([^;"']+)/i, `$1${attrs['border-radius']}`);
    } else if (/style\s*=\s*["'][^"']*["']/i.test(out)) {
      out = out.replace(/style\s*=\s*["']([^"']*)["']/i, (m, style) => `style="${style}; border-radius: ${attrs['border-radius']}"`);
    }
  }

  if (attrs.text) {
    out = out.replace(/>([^<]*)</, `>${attrs.text}<`);
  }

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

    if (message.type === 'preview' && state.lastSlice) {
      const attrs = message.payload || {};
      const rendered = applyVariant(state.lastSlice.htmlFragment, attrs);
      panel.webview.postMessage({ type: 'previewResult', payload: { html: rendered } });
    }

    if (message.type === 'insertSnippet') {
      const inserted = await state.insertVariantSnippet(vscode, message.payload || {});
      if (!inserted) {
        vscode.window.showWarningMessage('Run Slice Selection first, then open Variant Studio again.');
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
