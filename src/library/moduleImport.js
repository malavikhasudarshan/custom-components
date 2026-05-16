const path = require('path');

function toBrowserRelativePath(fromFilePath, targetFilePath) {
  let relativePath = path.relative(path.dirname(fromFilePath), targetFilePath).split(path.sep).join('/');

  if (!relativePath.startsWith('../') && !relativePath.startsWith('./')) {
    relativePath = `./${relativePath}`;
  }

  return relativePath;
}

function buildModuleScriptTag(src) {
  return `<script type="module" src="${src}"></script>`;
}

function findModuleScriptInsertOffset(documentText) {
  const headClose = documentText.match(/<\/head\s*>/i);
  if (headClose && typeof headClose.index === 'number') {
    return {
      offset: headClose.index,
      text: `  ${buildModuleScriptTag('__SRC__')}\n`
    };
  }

  return {
    offset: 0,
    text: `${buildModuleScriptTag('__SRC__')}\n`
  };
}

function getMissingModuleScriptInsertion(documentText, fromFilePath, targetFilePath) {
  if (!targetFilePath) return null;

  const src = toBrowserRelativePath(fromFilePath, targetFilePath);
  if (documentText.includes(`src="${src}"`) || documentText.includes(`src='${src}'`)) {
    return null;
  }

  const insertion = findModuleScriptInsertOffset(documentText);
  return {
    offset: insertion.offset,
    text: insertion.text.replace('__SRC__', src),
    src
  };
}

module.exports = {
  toBrowserRelativePath,
  buildModuleScriptTag,
  getMissingModuleScriptInsertion
};
