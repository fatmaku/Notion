// Minimal DOM morphing: patch an element's children to match new HTML while keeping the
// existing nodes (focus, caret, scroll, typed input values, running CSS animations).
// Children are matched by data-key / id where present, otherwise by position and tag.
// Elements with data-keep are never touched after their first render (canvas, signature pad).

const keyOf = (n) => (n.nodeType === 1 ? n.getAttribute('data-key') || n.id || null : null);

export function morph(target, html) {
  const tpl = document.createElement('template');
  tpl.innerHTML = html;
  patchChildren(target, tpl.content);
}

function patchChildren(parent, next) {
  const oldKeyed = new Map();
  for (let c = parent.firstChild; c; c = c.nextSibling) { const k = keyOf(c); if (k) oldKeyed.set(k, c); }
  let cur = parent.firstChild;
  let n = next.firstChild;
  while (n) {
    const nn = n.nextSibling;
    const k = keyOf(n);
    let match = null;
    if (k) {
      match = oldKeyed.get(k) || null;
      if (match && match.nodeName !== n.nodeName) match = null;
    } else if (cur && !keyOf(cur) && cur.nodeType === n.nodeType && cur.nodeName === n.nodeName) {
      match = cur;
    }
    if (match) {
      if (match !== cur) parent.insertBefore(match, cur);
      else cur = cur.nextSibling;
      if (k) oldKeyed.delete(k);
      patchNode(match, n);
    } else {
      parent.insertBefore(n, cur); // moves the new node out of the template fragment
    }
    n = nn;
  }
  // everything left after the cursor is stale
  while (cur) { const x = cur.nextSibling; parent.removeChild(cur); cur = x; }
}

function patchNode(a, b) {
  if (a.nodeType === 3 || a.nodeType === 8) { if (a.nodeValue !== b.nodeValue) a.nodeValue = b.nodeValue; return; }
  if (a.hasAttribute('data-keep')) return;
  // attributes
  for (const { name } of [...a.attributes]) if (!b.hasAttribute(name)) { a.removeAttribute(name); if (name === 'checked') a.checked = false; }
  for (const { name, value } of [...b.attributes]) {
    if (a.getAttribute(name) !== value) {
      a.setAttribute(name, value);
      if (name === 'value' && 'value' in a) a.value = value;
      if (name === 'checked') a.checked = true;
      if (name === 'selected') a.selected = true;
    }
  }
  const tag = a.nodeName;
  if (tag === 'INPUT' || tag === 'SELECT') {
    if (tag === 'SELECT') patchChildren(a, b);
    if ((a.type === 'checkbox' || a.type === 'radio') && a.checked !== b.hasAttribute('checked') && document.activeElement !== a) a.checked = b.hasAttribute('checked');
    return;
  }
  if (tag === 'TEXTAREA') {
    const v = b.textContent;
    if (a.defaultValue !== v) { a.defaultValue = v; if (document.activeElement !== a) a.value = v; }
    return;
  }
  patchChildren(a, b);
}
