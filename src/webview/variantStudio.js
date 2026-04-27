const fs = require('fs');
const path = require('path');

function getWebviewHtml(extensionUri) {
  const htmlPath = path.join(extensionUri.fsPath, 'webview', 'index.html');
  return fs.readFileSync(htmlPath, 'utf8');
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
      const editor = vscode.window.activeTextEditor;
      if (!editor) {
        vscode.window.showWarningMessage('Open an editor before inserting snippets.');
        return;
      }

      const tagName = state.lastTemplate ? state.lastTemplate.tagName : 'custom-sliced-component';
      const attrs = message.payload || {};
      const attrString = Object.entries(attrs)
        .filter(([, value]) => value)
        .map(([key, value]) => `${key}="${value}"`)
        .join(' ');

      const snippet = `<${tagName}${attrString ? ` ${attrString}` : ''}></${tagName}>`;
      await editor.edit((editBuilder) => {
        editBuilder.insert(editor.selection.active, snippet);
      });

      vscode.window.showInformationMessage('Variant snippet inserted at cursor.');
    }
  });

  return panel;
}

module.exports = {
  openVariantStudio
};
