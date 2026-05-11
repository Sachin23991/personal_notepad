/**
 * NoteFlow — personal dictionary for contenteditable blocks.
 * Browser spellcheck cannot read custom lists; we wrap known words in
 * <span spellcheck="false"> so the engine stops flagging them.
 */
(function (global) {
  'use strict';

  function escapeRe(s) {
    return String(s).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  }

  function ensureList(state) {
    if (!state.data.settings) state.data.settings = {};
    if (!Array.isArray(state.data.settings.customDictionary)) {
      state.data.settings.customDictionary = [];
    }
    return state.data.settings.customDictionary;
  }

  function normalizeWord(w) {
    return String(w || '')
      .trim()
      .replace(/^[^\p{L}\p{N}]+/u, '')
      .replace(/[^\p{L}\p{N}]+$/u, '');
  }

  function processTextNode(textNode, words) {
    const parent = textNode.parentElement;
    if (!parent) return false;
    if (parent.closest('code, pre, .nf-table-wrap')) return false;
    if (parent.closest('[data-dict-wrap="1"]')) return false;

    const text = textNode.textContent;
    const uniq = [
      ...new Set(
        words
          .map((w) => normalizeWord(w))
          .filter((w) => w && w.length >= 2),
      ),
    ].sort((a, b) => b.length - a.length);
    if (!uniq.length) return false;

    const pattern = uniq.map(escapeRe).join('|');
    if (!pattern) return false;

    let re;
    try {
      re = new RegExp('(^|[^\\p{L}\\p{N}])(' + pattern + ')(?=[^\\p{L}\\p{N}]|$)', 'giu');
    } catch {
      re = new RegExp('\\b(' + pattern + ')\\b', 'gi');
    }
    if (!re.test(text)) return false;
    re.lastIndex = 0;

    const frag = document.createDocumentFragment();
    let lastIndex = 0;
    let m;
    while ((m = re.exec(text)) !== null) {
      const idx = m.index;
      const before = text.slice(lastIndex, idx + m[1].length);
      if (before) frag.appendChild(document.createTextNode(before));
      const span = document.createElement('span');
      span.setAttribute('spellcheck', 'false');
      span.setAttribute('data-dict-wrap', '1');
      span.textContent = m[2];
      frag.appendChild(span);
      lastIndex = idx + m[0].length;
    }
    frag.appendChild(document.createTextNode(text.slice(lastIndex)));
    textNode.parentNode.replaceChild(frag, textNode);
    return true;
  }

  function applyToRoot(root, words) {
    if (!root || !words.length) return;
    for (let pass = 0; pass < 25; pass++) {
      const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT, {
        acceptNode(node) {
          if (!node.textContent || !node.textContent.trim()) return NodeFilter.FILTER_REJECT;
          const p = node.parentElement;
          if (!p) return NodeFilter.FILTER_REJECT;
          if (p.closest('code, pre, .nf-table-wrap')) return NodeFilter.FILTER_REJECT;
          return NodeFilter.FILTER_ACCEPT;
        },
      });
      const batch = [];
      while (walker.nextNode()) batch.push(walker.currentNode);
      let hit = false;
      for (const node of batch) {
        if (processTextNode(node, words)) {
          hit = true;
          break;
        }
      }
      if (!hit) break;
    }
  }

  global.NoteFlowDictionary = {
    normalizeWord,
    ensureList,
    addWord(state, raw) {
      const w = normalizeWord(raw);
      if (!w) return false;
      const list = ensureList(state);
      const low = w.toLowerCase();
      if (list.some((x) => String(x).toLowerCase() === low)) return false;
      list.push(w);
      state.save();
      return true;
    },
    removeWord(state, raw) {
      const list = ensureList(state);
      const low = normalizeWord(raw).toLowerCase();
      const next = list.filter((x) => String(x).toLowerCase() !== low);
      if (next.length === list.length) return false;
      state.data.settings.customDictionary = next;
      state.save();
      return true;
    },
    applyToBlockContent(el, state) {
      const words = ensureList(state);
      if (!words.length || !el) return;
      applyToRoot(el, words);
    },
    applyToPageEditor(editorContainer, state) {
      const words = ensureList(state);
      if (!words.length || !editorContainer) return;
      editorContainer.querySelectorAll('.block-content').forEach((el) => {
        if (el.closest('.block[data-type="code"]')) return;
        applyToRoot(el, words);
      });
    },
    getWordAtCaret(sel) {
      if (!sel || !sel.anchorNode) return '';
      let node = sel.anchorNode;
      let offset = sel.anchorOffset;
      if (node.nodeType !== Node.TEXT_NODE) {
        if (node.childNodes.length && offset > 0) {
          node = node.childNodes[offset - 1];
          offset = node.textContent.length;
        }
        if (!node || node.nodeType !== Node.TEXT_NODE) return '';
      }
      const text = node.textContent;
      let start = offset;
      let end = offset;
      while (start > 0 && /[\p{L}\p{N}'-]/u.test(text[start - 1])) start--;
      while (end < text.length && /[\p{L}\p{N}'-]/u.test(text[end])) end++;
      return text.slice(start, end);
    },
  };
})(typeof window !== 'undefined' ? window : globalThis);
