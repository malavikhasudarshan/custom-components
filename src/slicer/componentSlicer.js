function findQuotedValue(text, key) {
  const exact = new RegExp(`${key}\\s*=\\s*["']([^"']+)["']`, 'i').exec(text);
  if (exact) return exact[1];

  const styleObj = new RegExp(`${key.replace('-', '')}\\s*:\\s*["']?([^,"'}]+)`, 'i').exec(text);
  if (styleObj) return styleObj[1].trim();

  const inlineCss = new RegExp(`${key}\\s*:\\s*([^;"']+)`, 'i').exec(text);
  if (inlineCss) return inlineCss[1].trim();

  return undefined;
}

function detectTextContent(htmlFragment) {
  const noTags = htmlFragment.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
  return noTags.length > 0 ? noTags : undefined;
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

  if (classRules) {
    htmlFragment = `<style>\n${classRules}\n</style>\n${htmlFragment}`;
  } else if (classNames.length && styleBlock) {
    warnings.push('Class names found, but no matching CSS rules were extracted from <style> block.');
  }

  const styleBindings = [];
  const detectedProps = [];

  const color = findQuotedValue(htmlFragment, 'color');
  if (color) {
    styleBindings.push('color');
    detectedProps.push({ name: 'color', type: 'string', defaultValue: color });
  }

  const fontSize = findQuotedValue(htmlFragment, 'font-size') || findQuotedValue(htmlFragment, 'fontSize');
  if (fontSize) {
    styleBindings.push('font-size');
    detectedProps.push({ name: 'font-size', type: 'string', defaultValue: fontSize });
  }

  const borderRadius = findQuotedValue(htmlFragment, 'border-radius') || findQuotedValue(htmlFragment, 'borderRadius');
  if (borderRadius) {
    styleBindings.push('border-radius');
    detectedProps.push({ name: 'border-radius', type: 'string', defaultValue: borderRadius });
  }

  const text = detectTextContent(htmlFragment);
  if (text) {
    detectedProps.push({ name: 'text', type: 'string', defaultValue: text });
  }

  return {
    htmlFragment,
    detectedProps,
    styleBindings,
    warnings
  };
}

module.exports = {
  component_slicer
};
