const vscode = require('vscode');
const { component_slicer } = require('./slicer/componentSlicer');
const { toWebComponent } = require('./transform/toWebComponent');
const { openVariantStudio } = require('./webview/variantStudio');
const { saveLibraryItem, listLibraryItems } = require('./library/store');

const state = {
  lastSlice: null,
  lastTemplate: null,
  lastEditorUri: null,
  lastSelectionEnd: null,
  async insertVariantSnippet(vscode, attrs) {
    const tagName = this.lastTemplate ? this.lastTemplate.tagName : 'custom-sliced-component';
    const attrString = Object.entries(attrs || {})
      .filter(([, value]) => value)
      .map(([key, value]) => `${key}="${value}"`)
      .join(' ');

    const snippet = `<${tagName}${attrString ? ` ${attrString}` : ''}></${tagName}>`;
    const targetUri = this.lastEditorUri;
    const targetPosition = this.lastSelectionEnd;

    if (targetUri && targetPosition) {
      const edit = new vscode.WorkspaceEdit();
      edit.insert(targetUri, targetPosition, snippet);
      await vscode.workspace.applyEdit(edit);
      return true;
    }

    const editor = vscode.window.activeTextEditor;
    if (!editor) {
      return false;
    }

    await editor.edit((editBuilder) => {
      editBuilder.insert(editor.selection.active, snippet);
    });

    return true;
  }
};

function getWorkspacePath() {
  const workspaceFolder = vscode.workspace.workspaceFolders && vscode.workspace.workspaceFolders[0];
  return workspaceFolder ? workspaceFolder.uri.fsPath : null;
}

async function sliceSelectionCommand() {
  const editor = vscode.window.activeTextEditor;
  if (!editor) {
    vscode.window.showWarningMessage('Open a file and select a component first.');
    return;
  }

  const selection = editor.selection;
  const begin_ln = selection.start.line + 1;
  const end_ln = selection.end.line + 1;
  if (begin_ln === end_ln && selection.isEmpty) {
    vscode.window.showWarningMessage('Select a range that wraps your component.');
    return;
  }

  const source = editor.document.getText();
  const slice = component_slicer(source, begin_ln, end_ln);
  const tag = await vscode.window.showInputBox({
    prompt: 'Tag name for generated web component (kebab-case).',
    value: 'custom-sliced-component'
  });

  if (!tag) return;

  const template = toWebComponent(slice, { tagName: tag });
  state.lastSlice = slice;
  state.lastTemplate = template;
  state.lastEditorUri = editor.document.uri;
  state.lastSelectionEnd = editor.selection.end;

  vscode.window.showInformationMessage(
    `Slice extracted (${slice.warnings.length} warning(s)). Open Variant Studio to compare variants.`
  );
}

async function openVariantStudioCommand(context) {
  openVariantStudio(vscode, context, state);
}

async function saveToLibraryCommand() {
  const workspacePath = getWorkspacePath();
  if (!workspacePath) {
    vscode.window.showErrorMessage('Open a workspace folder before saving.');
    return;
  }

  if (!state.lastTemplate) {
    vscode.window.showWarningMessage('No generated component available. Run Slice Selection first.');
    return;
  }

  const itemName = await vscode.window.showInputBox({
    prompt: 'Name for this reusable component',
    value: state.lastTemplate.tagName
  });
  if (!itemName) return;

  const metadata = saveLibraryItem(workspacePath, itemName, state.lastTemplate);
  vscode.window.showInformationMessage(`Saved ${metadata.name} to component library.`);
}

async function quickInsertCommand() {
  const workspacePath = getWorkspacePath();
  const editor = vscode.window.activeTextEditor;

  if (!workspacePath || !editor) {
    vscode.window.showWarningMessage('Open a workspace and an editor to insert a saved component.');
    return;
  }

  const items = listLibraryItems(workspacePath);
  if (!items.length) {
    vscode.window.showWarningMessage('No saved components found in library.');
    return;
  }

  const picked = await vscode.window.showQuickPick(
    items.map((item) => ({
      label: item.name,
      description: item.tagName,
      item
    })),
    { placeHolder: 'Select a component to insert' }
  );

  if (!picked) return;

  await editor.edit((editBuilder) => {
    editBuilder.insert(editor.selection.active, `<${picked.item.tagName}></${picked.item.tagName}>`);
  });
}

function activate(context) {
  context.subscriptions.push(
    vscode.commands.registerCommand('customComponents.sliceSelection', sliceSelectionCommand),
    vscode.commands.registerCommand('customComponents.openVariantStudio', () => openVariantStudioCommand(context)),
    vscode.commands.registerCommand('customComponents.saveToLibrary', saveToLibraryCommand),
    vscode.commands.registerCommand('customComponents.quickInsert', quickInsertCommand)
  );
}

function deactivate() {}

module.exports = {
  activate,
  deactivate
};
