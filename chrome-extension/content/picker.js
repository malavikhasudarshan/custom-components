/**
 * Element picker: hover to highlight, click to capture, Esc to cancel.
 * Sends CAPTURE_DONE to background with serialized HTML.
 */
(function () {
  const VISUAL_PROPS = [
    'display',
    'position',
    'top',
    'right',
    'bottom',
    'left',
    'z-index',
    'box-sizing',
    'width',
    'height',
    'max-width',
    'max-height',
    'min-width',
    'min-height',
    'margin',
    'margin-top',
    'margin-right',
    'margin-bottom',
    'margin-left',
    'padding',
    'padding-top',
    'padding-right',
    'padding-bottom',
    'padding-left',
    'flex',
    'flex-direction',
    'flex-wrap',
    'flex-grow',
    'flex-shrink',
    'flex-basis',
    'justify-content',
    'align-items',
    'align-content',
    'align-self',
    'gap',
    'row-gap',
    'column-gap',
    'color',
    'background',
    'background-color',
    'background-image',
    'background-size',
    'background-position',
    'background-repeat',
    'font-family',
    'font-size',
    'font-weight',
    'font-style',
    'line-height',
    'letter-spacing',
    'text-align',
    'text-decoration',
    'text-transform',
    'white-space',
    'vertical-align',
    'border',
    'border-top',
    'border-right',
    'border-bottom',
    'border-left',
    'border-width',
    'border-style',
    'border-color',
    'border-radius',
    'box-shadow',
    'opacity',
    'visibility',
    'overflow',
    'overflow-x',
    'overflow-y',
    'object-fit',
    'cursor',
    'list-style',
    'list-style-type',
    'text-indent',
    'word-break',
    'pointer-events',
    'transform',
    'transition'
  ];

  let running = false;
  let activePickOptions = null;
  let overlay = null;
  let labelEl = null;
  let highlightEl = null;
  let lastTarget = null;

  function createUi() {
    overlay = document.createElement('div');
    overlay.id = 'cc-picker-overlay';
    overlay.setAttribute('data-cc-picker', 'true');
    Object.assign(overlay.style, {
      position: 'fixed',
      inset: '0',
      zIndex: '2147483646',
      cursor: 'crosshair',
      background: 'rgba(15, 23, 42, 0.04)',
      pointerEvents: 'none'
    });

    highlightEl = document.createElement('div');
    Object.assign(highlightEl.style, {
      position: 'fixed',
      zIndex: '2147483647',
      pointerEvents: 'none',
      boxSizing: 'border-box',
      border: '2px solid #4f46e5',
      borderRadius: '4px',
      boxShadow: '0 0 0 2px rgba(255,255,255,0.9)',
      display: 'none',
      transition: 'top 0.05s, left 0.05s, width 0.05s, height 0.05s'
    });

    labelEl = document.createElement('div');
    Object.assign(labelEl.style, {
      position: 'fixed',
      zIndex: '2147483647',
      pointerEvents: 'none',
      maxWidth: 'min(480px, 90vw)',
      padding: '6px 10px',
      font: '12px/1.4 system-ui, sans-serif',
      color: '#fff',
      background: 'rgba(15, 23, 42, 0.92)',
      borderRadius: '6px',
      display: 'none',
      boxShadow: '0 4px 12px rgba(0,0,0,0.25)'
    });

    document.documentElement.appendChild(overlay);
    document.documentElement.appendChild(highlightEl);
    document.documentElement.appendChild(labelEl);
  }

  function isOurUi(node) {
    return (
      node &&
      (node.id === 'cc-picker-overlay' ||
        node === highlightEl ||
        node === labelEl ||
        (node.closest && node.closest('[data-cc-picker="true"]')))
    );
  }

  function pickTargetFromPoint(x, y) {
    let el = document.elementFromPoint(x, y);
    while (el && (isOurUi(el) || el === document.documentElement || el === document.body)) {
      el = el.parentElement;
    }
    return el;
  }

  function updateHighlight(el, clientX, clientY) {
    if (!el || !el.getBoundingClientRect) {
      highlightEl.style.display = 'none';
      labelEl.style.display = 'none';
      return;
    }
    const r = el.getBoundingClientRect();
    highlightEl.style.display = 'block';
    highlightEl.style.top = `${r.top}px`;
    highlightEl.style.left = `${r.left}px`;
    highlightEl.style.width = `${r.width}px`;
    highlightEl.style.height = `${r.height}px`;

    const tag = el.tagName.toLowerCase();
    const id = el.id ? `#${el.id}` : '';
    const cls = el.className && typeof el.className === 'string' ? `.${el.className.trim().split(/\s+/).slice(0, 3).join('.')}` : '';
    labelEl.textContent = `${tag}${id}${cls}`.slice(0, 120);
    labelEl.style.display = 'block';
    const lw = 280;
    let lx = clientX + 12;
    let ly = clientY + 12;
    if (lx + lw > window.innerWidth - 8) lx = clientX - lw - 12;
    if (ly > window.innerHeight - 40) ly = clientY - 36;
    labelEl.style.left = `${Math.max(8, lx)}px`;
    labelEl.style.top = `${Math.max(8, ly)}px`;
  }

  function applyComputedStylesFromOrig(orig, copy) {
    if (orig.nodeType !== Node.ELEMENT_NODE || copy.nodeType !== Node.ELEMENT_NODE) return;
    const cs = window.getComputedStyle(orig);
    const parts = [];
    for (const prop of VISUAL_PROPS) {
      let v;
      try {
        v = cs.getPropertyValue(prop);
      } catch {
        v = '';
      }
      if (!v || v === 'none' || v === 'normal' || v === 'auto' || v === '0px' || v === 'rgba(0, 0, 0, 0)') continue;
      parts.push(`${prop}: ${v}`);
    }
    const existing = copy.getAttribute('style') || '';
    const merged = [existing.trim(), parts.join('; ')].filter(Boolean).join('; ');
    if (merged) copy.setAttribute('style', merged);
  }

  function deepCloneWithStyles(node, includePortableCss) {
    if (node.nodeType === Node.TEXT_NODE || node.nodeType === Node.COMMENT_NODE) {
      return node.cloneNode(true);
    }
    if (node.nodeType !== Node.ELEMENT_NODE) {
      return node.cloneNode(true);
    }
    const copy = node.cloneNode(false);
    if (includePortableCss) {
      applyComputedStylesFromOrig(node, copy);
    }
    for (const child of node.childNodes) {
      copy.appendChild(deepCloneWithStyles(child, includePortableCss));
    }
    return copy;
  }

  function serializeElement(el, includePortableCss) {
    if (!includePortableCss) {
      return el.outerHTML;
    }
    const wrap = document.createElement('div');
    wrap.appendChild(deepCloneWithStyles(el, true));
    return wrap.innerHTML;
  }

  function teardown() {
    document.documentElement.style.cursor = '';
    window.removeEventListener('mousemove', onMove, true);
    window.removeEventListener('pointerdown', onPointerDown, true);
    window.removeEventListener('click', onClick, true);
    window.removeEventListener('keydown', onKey, true);
    overlay?.remove();
    highlightEl?.remove();
    labelEl?.remove();
    overlay = null;
    highlightEl = null;
    labelEl = null;
    lastTarget = null;
    activePickOptions = null;
    running = false;
  }

  function onMove(e) {
    const t = pickTargetFromPoint(e.clientX, e.clientY);
    lastTarget = t;
    updateHighlight(t, e.clientX, e.clientY);
  }

  function onPointerDown(e) {
    if (!running) return;
    e.preventDefault();
    e.stopPropagation();
  }

  function onClick(e) {
    e.preventDefault();
    e.stopPropagation();
    const t = lastTarget || pickTargetFromPoint(e.clientX, e.clientY);
    if (!t || isOurUi(t)) {
      return;
    }
    const includePortableCss = !!activePickOptions?.includePortableCss;
    const html = serializeElement(t, includePortableCss);
    teardown();
    chrome.runtime.sendMessage({ type: 'CAPTURE_DONE', html });
  }

  function onKey(e) {
    if (e.key === 'Escape') {
      e.preventDefault();
      teardown();
    }
  }

  function startPick(options) {
    if (running) return;
    running = true;
    activePickOptions = options || {};
    document.documentElement.style.cursor = 'crosshair';
    createUi();
    window.addEventListener('mousemove', onMove, true);
    window.addEventListener('pointerdown', onPointerDown, true);
    window.addEventListener('click', onClick, true);
    window.addEventListener('keydown', onKey, true);
  }

  chrome.runtime.onMessage.addListener((msg, _sender, sendResponse) => {
    if (msg?.type === 'START_PICK') {
      if (running) {
        sendResponse?.({ ok: false, reason: 'already-running' });
        return;
      }
      startPick(msg.options || {});
      sendResponse?.({ ok: true });
    }
    return false;
  });
})();
