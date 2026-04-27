const fs = require('fs');
const path = require('path');

function ensureWorkspaceFolders(rootPath) {
  const baseDir = path.join(rootPath, '.custom-components');
  const libraryDir = path.join(baseDir, 'library');
  const generatedDir = path.join(baseDir, 'generated');

  fs.mkdirSync(libraryDir, { recursive: true });
  fs.mkdirSync(generatedDir, { recursive: true });

  return { baseDir, libraryDir, generatedDir };
}

function saveLibraryItem(rootPath, itemName, template) {
  const { libraryDir, generatedDir } = ensureWorkspaceFolders(rootPath);
  const now = new Date().toISOString();
  const baseId = itemName.toLowerCase().replace(/[^a-z0-9-]+/g, '-').replace(/^-+|-+$/g, '');
  const id = `${baseId || 'component'}-${Date.now()}`;

  const generatedPath = path.join(generatedDir, `${id}.component.js`);
  const metadataPath = path.join(libraryDir, `${id}.component.json`);

  fs.writeFileSync(generatedPath, template.source, 'utf8');

  const metadata = {
    id,
    name: itemName,
    createdAt: now,
    schema: template.schema,
    tagName: template.tagName,
    generatedPath
  };

  fs.writeFileSync(metadataPath, JSON.stringify(metadata, null, 2), 'utf8');
  return metadata;
}

function listLibraryItems(rootPath) {
  const { libraryDir } = ensureWorkspaceFolders(rootPath);
  const files = fs.readdirSync(libraryDir).filter((file) => file.endsWith('.component.json'));
  return files.map((file) => {
    const fullPath = path.join(libraryDir, file);
    return JSON.parse(fs.readFileSync(fullPath, 'utf8'));
  });
}

module.exports = {
  ensureWorkspaceFolders,
  saveLibraryItem,
  listLibraryItems
};
