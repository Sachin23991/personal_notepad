/**
 * NoteFlow — Word / Notepad–style tools: find & replace, status bar, page undo/redo,
 * editor typography chrome, plain-text export.
 */
(function (global) {
  'use strict';

  function escapeRe(s) {
    return String(s).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  }

  function replaceInHtml(html, find, replace, caseSensitive) {
    if (!find) return html;
    const div = document.createElement('div');
    div.innerHTML = html || '';
    const walker = document.createTreeWalker(div, NodeFilter.SHOW_TEXT, null);
    const nodes = [];
    while (walker.nextNode()) nodes.push(walker.currentNode);
    const flags = caseSensitive ? 'g' : 'gi';
    const re = new RegExp(escapeRe(find), flags);
    for (const node of nodes) {
      node.textContent = node.textContent.replace(re, replace);
    }
    return div.innerHTML;
  }

  const NoteFlowEnhancements = {
    state: null,
    editor: null,
    app: null,

    init(ctx) {
      this.state = ctx.state;
      this.editor = ctx.editor;
      this.app = ctx.app;
      if (!this.state.data.historyStacks) this.state.data.historyStacks = {};
      if (!this.state.data.settings.editor) {
        this.state.data.settings.editor = { fontScale: 100, lineHeight: 'normal', monoPage: false };
      }
      this.initFindReplace();
      this.initStatusBar();
      this.bindShortcuts();
      this.applyEditorChrome();
      this.bindSettingsEditor();
    },

    pageId() {
      return this.state.activePage?.id || '';
    },

    getStack() {
      const id = this.pageId();
      if (!id) return null;
      if (!this.state.data.historyStacks[id]) {
        this.state.data.historyStacks[id] = { undo: [], redo: [], max: 40 };
      }
      return this.state.data.historyStacks[id];
    },

    capturePage() {
      const p = this.state.activePage;
      if (!p) return null;
      return JSON.stringify({
        title: p.title,
        blocks: JSON.parse(JSON.stringify(p.blocks)),
      });
    },

    applySnapshot(json) {
      const o = JSON.parse(json);
      const p = this.state.activePage;
      if (!p) return;
      p.title = o.title;
      p.blocks = o.blocks;
      p.lastModified = Date.now();
      this.state.save();
      this.app.renderPage();
    },

    pushBeforeChange() {
      const snap = this.capturePage();
      if (!snap) return;
      const st = this.getStack();
      if (!st) return;
      st.undo.push(snap);
      if (st.undo.length > st.max) st.undo.shift();
      st.redo.length = 0;
      this.state.save();
    },

    undoPage() {
      const st = this.getStack();
      if (!st || st.undo.length === 0) {
        this.app.showToast('Nothing to undo');
        return;
      }
      st.redo.push(this.capturePage());
      const prev = st.undo.pop();
      this.applySnapshot(prev);
      this.app.showToast('Page undo');
    },

    redoPage() {
      const st = this.getStack();
      if (!st || st.redo.length === 0) {
        this.app.showToast('Nothing to redo');
        return;
      }
      st.undo.push(this.capturePage());
      const next = st.redo.pop();
      this.applySnapshot(next);
      this.app.showToast('Page redo');
    },

    openFindReplace() {
      document.getElementById('findreplace-modal')?.classList.remove('hidden');
      setTimeout(() => document.getElementById('fr-find')?.focus(), 50);
    },

    runFindReplace() {
      const find = document.getElementById('fr-find')?.value ?? '';
      const rep = document.getElementById('fr-replace')?.value ?? '';
      const caseEl = document.getElementById('fr-case');
      const caseSensitive = !!(caseEl && caseEl.checked);
      if (!find) {
        this.app.showToast('Enter text to find');
        return;
      }
      const page = this.state.activePage;
      if (!page) return;
      const richTypes = new Set(['text', 'h1', 'h2', 'h3', 'bullet', 'numbered', 'todo', 'quote', 'callout']);
      const countHits = () => {
        let n = 0;
        for (const b of page.blocks) {
          if (richTypes.has(b.type)) {
            const before = b.content || '';
            const after = replaceInHtml(before, find, rep, caseSensitive);
            if (after !== before) {
              n += (before.match(new RegExp(escapeRe(find), caseSensitive ? 'g' : 'gi')) || []).length;
            }
          } else if (b.type === 'code') {
            const before = b.content || '';
            const flags = caseSensitive ? 'g' : 'gi';
            const re = new RegExp(escapeRe(find), flags);
            const after = before.replace(re, rep);
            if (after !== before) n += (before.match(re) || []).length;
          } else if (b.type === 'table' && b.properties?.data) {
            const data = b.properties.data;
            for (let r = 0; r < data.length; r++) {
              for (let c = 0; c < data[r].length; c++) {
                const cell = data[r][c] || '';
                const flags = caseSensitive ? 'g' : 'gi';
                const re = new RegExp(escapeRe(find), flags);
                const next = cell.replace(re, rep);
                if (next !== cell) n += (cell.match(re) || []).length;
              }
            }
          }
        }
        return n;
      };
      const hits = countHits();
      if (!hits) {
        this.app.showToast('No matches in this page');
        return;
      }
      this.pushBeforeChange();
      for (const b of page.blocks) {
        if (richTypes.has(b.type)) {
          const before = b.content || '';
          const after = replaceInHtml(before, find, rep, caseSensitive);
          if (after !== before) b.content = after;
        } else if (b.type === 'code') {
          const before = b.content || '';
          const flags = caseSensitive ? 'g' : 'gi';
          const re = new RegExp(escapeRe(find), flags);
          b.content = before.replace(re, rep);
        } else if (b.type === 'table' && b.properties?.data) {
          const data = b.properties.data;
          for (let r = 0; r < data.length; r++) {
            for (let c = 0; c < data[r].length; c++) {
              const cell = data[r][c] || '';
              const flags = caseSensitive ? 'g' : 'gi';
              const re = new RegExp(escapeRe(find), flags);
              data[r][c] = cell.replace(re, rep);
            }
          }
        }
      }
      page.lastModified = Date.now();
      this.state.save();
      this.editor.renderPage();
      this.app.showToast(`Replaced ${hits} occurrence(s)`);
    },

    exportPagePlainText() {
      const page = this.state.activePage;
      if (!page) return;
      const lines = [];
      lines.push(page.title || 'Untitled');
      lines.push('');
      for (const b of page.blocks) {
        const tmp = document.createElement('div');
        tmp.innerHTML = b.content || '';
        const text = b.type === 'code' ? b.content || '' : tmp.innerText || '';
        if (b.type === 'h1') lines.push('# ' + text);
        else if (b.type === 'h2') lines.push('## ' + text);
        else if (b.type === 'h3') lines.push('### ' + text);
        else if (b.type === 'bullet') lines.push('- ' + text);
        else if (b.type === 'numbered') lines.push('1. ' + text);
        else if (b.type === 'todo') lines.push((b.properties?.checked ? '[x] ' : '[ ] ') + text);
        else if (b.type === 'quote') lines.push('> ' + text);
        else if (b.type === 'divider') lines.push('---');
        else if (b.type === 'code') lines.push('```\n' + text + '\n```');
        else if (b.type === 'table' && b.properties?.data) {
          for (const row of b.properties.data) lines.push(row.join('\t'));
        } else lines.push(text);
        lines.push('');
      }
      const blob = new Blob([lines.join('\n').trim()], { type: 'text/plain;charset=utf-8' });
      const a = document.createElement('a');
      a.href = URL.createObjectURL(blob);
      a.download = (page.title || 'noteflow-page').replace(/[^\w\-]+/g, '-') + '.txt';
      a.click();
      URL.revokeObjectURL(a.href);
      this.app.showToast('Plain text exported');
    },

    refreshStatusBar() {
      const el = document.getElementById('status-bar');
      if (!el) return;
      const page = this.state.activePage;
      if (!page) {
        el.textContent = '';
        return;
      }
      const blocks = page.blocks.length;
      let chars = 0;
      let words = 0;
      const tmp = document.createElement('div');
      for (const b of page.blocks) {
        if (b.type === 'code') {
          const t = b.content || '';
          chars += t.length;
          words += t.trim() ? t.trim().split(/\s+/).length : 0;
        } else if (b.type === 'table' && b.properties?.data) {
          for (const row of b.properties.data) {
            for (const cell of row) {
              tmp.innerHTML = cell || '';
              const tx = tmp.innerText || '';
              chars += tx.length;
              words += tx.trim() ? tx.trim().split(/\s+/).length : 0;
            }
          }
        } else {
          tmp.innerHTML = b.content || '';
          const tx = tmp.innerText || '';
          chars += tx.length;
          words += tx.trim() ? tx.trim().split(/\s+/).length : 0;
        }
      }
      const title = page.title || 'Untitled';
      chars += title.length;
      words += title.trim() ? title.trim().split(/\s+/).length : 0;

      let selW = 0;
      let selC = 0;
      const sel = global.getSelection();
      if (sel && !sel.isCollapsed) {
        const t = sel.toString();
        selC = t.length;
        selW = t.trim() ? t.trim().split(/\s+/).length : 0;
      }

      let blockIdx = '';
      const ae = document.activeElement;
      const blk = ae && ae.closest ? ae.closest('.block') : null;
      if (blk) {
        const id = blk.dataset.id;
        const i = page.blocks.findIndex((x) => x.id === id);
        if (i >= 0) blockIdx = ' · Block ' + (i + 1) + '/' + blocks;
      }

      el.textContent =
        `${blocks} blocks · ${words} words · ${chars} chars` +
        (selW ? ` · Selection ${selW} w / ${selC} ch` : '') +
        blockIdx;
    },

    initStatusBar() {
      this.refreshStatusBar();
      document.addEventListener('selectionchange', () => this.refreshStatusBar());
      document.getElementById('main-content')?.addEventListener('scroll', () => this.refreshStatusBar(), { passive: true });
    },

    initFindReplace() {
      document.getElementById('fr-close')?.addEventListener('click', () => {
        document.getElementById('findreplace-modal')?.classList.add('hidden');
      });
      document.getElementById('fr-replace-one')?.addEventListener('click', () => this.runFindReplace());
      document.getElementById('fr-find')?.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') {
          e.preventDefault();
          this.runFindReplace();
        }
      });
    },

    bindShortcuts() {
      global.addEventListener('keydown', (e) => {
        if (!(e.ctrlKey || e.metaKey)) return;
        if (e.altKey && e.key.toLowerCase() === 'z' && !e.shiftKey) {
          e.preventDefault();
          this.undoPage();
        }
        if (e.altKey && (e.key.toLowerCase() === 'y' || (e.shiftKey && e.key.toLowerCase() === 'z'))) {
          e.preventDefault();
          this.redoPage();
        }
        if (e.shiftKey && e.key.toLowerCase() === 'f') {
          const t = e.target;
          if (t && (t.closest('#findreplace-modal') || t.tagName === 'INPUT' || t.tagName === 'TEXTAREA')) return;
          e.preventDefault();
          this.openFindReplace();
        }
      });
    },

    applyEditorChrome() {
      const ed = this.state.data.settings.editor || {};
      const scale = (ed.fontScale || 100) / 100;
      const lh =
        ed.lineHeight === 'compact' ? 1.45 : ed.lineHeight === 'relaxed' ? 1.85 : 1.65;
      const mono = ed.monoPage === true;
      const root = document.documentElement;
      root.style.setProperty('--nf-editor-scale', String(scale));
      root.style.setProperty('--nf-editor-lh', String(lh));
      document.body.classList.toggle('nf-mono-page', mono);
    },

    bindSettingsEditor() {
      const scaleEl = document.getElementById('setting-editor-scale');
      const lhEl = document.getElementById('setting-editor-lh');
      const monoEl = document.getElementById('setting-editor-mono');
      const ed = this.state.data.settings.editor;
      if (scaleEl) {
        scaleEl.value = String(ed.fontScale || 100);
        scaleEl.addEventListener('change', () => {
          ed.fontScale = parseInt(scaleEl.value, 10) || 100;
          this.state.save();
          this.applyEditorChrome();
        });
      }
      if (lhEl) {
        lhEl.value = ed.lineHeight || 'normal';
        lhEl.addEventListener('change', () => {
          ed.lineHeight = lhEl.value;
          this.state.save();
          this.applyEditorChrome();
        });
      }
      if (monoEl) {
        monoEl.checked = ed.monoPage === true;
        monoEl.addEventListener('change', () => {
          ed.monoPage = monoEl.checked;
          this.state.save();
          this.applyEditorChrome();
        });
      }
    },
  };

  global.NoteFlowEnhancements = NoteFlowEnhancements;
})(typeof window !== 'undefined' ? window : globalThis);
