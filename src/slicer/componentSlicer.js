function toKebabCase(name) {
  return name.replace(/([a-z0-9])([A-Z])/g, '$1-$2').toLowerCase();
}

function splitTopLevel(text, separator) {
  const parts = [];
  let current = '';
  let depth = 0;
  let quote = '';

  for (let index = 0; index < text.length; index += 1) {
    const char = text[index];

    if (quote) {
      current += char;
      if (char === quote && text[index - 1] !== '\\') {
        quote = '';
      }
      continue;
    }

    if (char === '"' || char === "'") {
      quote = char;
      current += char;
      continue;
    }

    if (char === '(' || char === '[' || char === '{') {
      depth += 1;
      current += char;
      continue;
    }

    if (char === ')' || char === ']' || char === '}') {
      depth = Math.max(0, depth - 1);
      current += char;
      continue;
    }

    if (char === separator && depth === 0) {
      if (current.trim()) parts.push(current.trim());
      current = '';
      continue;
    }

    current += char;
  }

  if (current.trim()) parts.push(current.trim());
  return parts;
}

function parseInlineStyleObject(content) {
  const props = [];
  const entries = splitTopLevel(content, ',');

  entries.forEach((entry) => {
    const colonIndex = entry.indexOf(':');
    if (colonIndex === -1) return;

    const rawName = entry.slice(0, colonIndex).trim();
    const rawValue = entry.slice(colonIndex + 1).trim();
    if (!rawName || !rawValue) return;

    const name = toKebabCase(rawName);
    const value = rawValue.replace(/^['"]/, '').replace(/['"]$/, '').trim();
    if (name && value) {
      props.push({ name, value });
    }
  });

  return props;
}

function parseCssDeclarations(cssText) {
  const props = [];
  const declarationRegex = /([a-zA-Z-]+)\s*:\s*([^;{}]+)/g;
  let match;

  while ((match = declarationRegex.exec(cssText)) !== null) {
    const name = toKebabCase(match[1].trim());
    const value = match[2].trim().replace(/^["']/, '').replace(/["']$/, '').trim();
    if (name && value) {
      props.push({ name, value });
    }
  }

  return props;
}

function findAllQuotedValues(text) {
  const props = [];
  const seenNames = new Set();

  const inlineStyleRegex = /\bstyle\s*=\s*\{\{([\s\S]*?)\}\}/g;
  let inlineMatch;
  while ((inlineMatch = inlineStyleRegex.exec(text)) !== null) {
    parseInlineStyleObject(inlineMatch[1]).forEach((prop) => {
      if (!seenNames.has(prop.name)) {
        seenNames.add(prop.name);
        props.push(prop);
      }
    });
  }

  parseCssDeclarations(text).forEach((prop) => {
    if (!seenNames.has(prop.name)) {
      seenNames.add(prop.name);
      props.push(prop);
    }
  });

  return props;
}

function detectTextContent(htmlFragment) {
  // Remove style blocks first
  let cleaned = htmlFragment.replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '');
  // Remove all HTML tags
  cleaned = cleaned.replace(/<[^>]+>/g, ' ');
  // Clean up whitespace
  cleaned = cleaned.replace(/\s+/g, ' ').trim();
  return cleaned.length > 0 ? cleaned : undefined;
}

function extractReferencedClasses(htmlFragment) {
  const classes = new Set();
  const classRegex = /class(?:Name)?\s*=\s*["']([^"']+)["']/gi;
  let match;
  while ((match = classRegex.exec(htmlFragment)) !== null) {
    match[1]
      .split(/\s+/)
      .map((name) => name.trim())
      .filter(Boolean)
      .forEach((name) => classes.add(name));
  }
  return [...classes];
}

function extractStyleBlock(source) {
  const m = source.match(/<style[^>]*>([\s\S]*?)<\/style>/i);
  return m ? m[1] : '';
}

function extractRulesForClasses(cssText, classNames) {
  if (!cssText || !classNames.length) return '';

  const rules = [];
  classNames.forEach((className) => {
    const escaped = className.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const ruleRegex = new RegExp(`\\.${escaped}\\s*\\{[^}]*\\}`, 'gi');
    const matches = cssText.match(ruleRegex) || [];
    matches.forEach((rule) => rules.push(rule));
  });

  return [...new Set(rules)].join('\n');
}

function component_slicer(source, begin_ln, end_ln) {
  const lines = source.split(/\r?\n/);

  if (begin_ln < 1 || end_ln > lines.length || begin_ln > end_ln) {
    return {
      htmlFragment: '',
      detectedProps: [],
      styleBindings: [],
      warnings: ['Invalid line range supplied to component_slicer.']
    };
  }

  const selectedLines = lines.slice(begin_ln - 1, end_ln);
  let htmlFragment = selectedLines.join('\n').trim();
  const warnings = [];

  if (!htmlFragment.startsWith('<')) {
    warnings.push('Selected range does not begin with JSX/HTML opening tag.');
  }

  if (/\{[^}]*=>[^}]*\}/.test(htmlFragment) || /\{\s*[^}]+\([^)]*\)\s*\}/.test(htmlFragment)) {
    warnings.push('Dynamic expressions were detected and may not be fully preserved.');
  }

  const classNames = extractReferencedClasses(htmlFragment);
  const styleBlock = extractStyleBlock(source);
  const classRules = extractRulesForClasses(styleBlock, classNames);
  const htmlWithoutStyleBlocks = htmlFragment.replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '');

  if (classRules) {
    htmlFragment = `<style>\n${classRules}\n</style>\n${htmlFragment}`;
  } else if (classNames.length && styleBlock) {
    warnings.push('Class names found, but no matching CSS rules were extracted from <style> block.');
  }

  // Extract all style properties from the component
  const detectedProps = [];
  const styleBindings = [];
  const seenProps = new Set();

  // Extract from class-based CSS rules
  const classRuleProps = findAllQuotedValues(classRules || '');
  classRuleProps.forEach(prop => {
    if (!seenProps.has(prop.name)) {
      seenProps.add(prop.name);
      detectedProps.push({ name: prop.name, type: 'string', defaultValue: prop.value });
      styleBindings.push(prop.name);
    }
  });

  // Extract from inline styles
  const inlineStyleProps = findAllQuotedValues(htmlWithoutStyleBlocks);
  inlineStyleProps.forEach(prop => {
    if (!seenProps.has(prop.name)) {
      seenProps.add(prop.name);
      detectedProps.push({ name: prop.name, type: 'string', defaultValue: prop.value });
      styleBindings.push(prop.name);
    }
  });

  // Also detect text content as an editable prop
  const text = detectTextContent(htmlFragment);
  if (text && !seenProps.has('text')) {
    detectedProps.push({ name: 'text', type: 'string', defaultValue: text });
  }

  return {
    htmlFragment,
    detectedProps,
    styleBindings,
    warnings
  };
}

/**
 * Slice a full HTML / JSX document (or large pasted fragment) without an editor line range.
 * Used for drag-and-drop and paste flows for heavy components (e.g. site navigation).
 */
function slice_entire_source(source) {
  if (!source || !String(source).trim()) {
    return {
      htmlFragment: '',
      detectedProps: [],
      styleBindings: [],
      warnings: ['Empty input; nothing to slice.']
    };
  }
  const lines = source.split(/\r?\n/);
  return component_slicer(source, 1, lines.length);
}

module.exports = {
  component_slicer,
  slice_entire_source
};
