/**
 * NoteFlow — code detection, language guess, and optional Prettier format (CDN).
 */
(function (global) {
  'use strict';

  const LANGS = [
    'javascript',
    'typescript',
    'python',
    'html',
    'css',
    'json',
    'bash',
    'sql',
    'rust',
    'go',
    'java',
    'cpp',
    'markdown',
    'yaml',
  ];

  function scoreLang(code, lang) {
    const c = code;
    let s = 0;
    if (lang === 'python') {
      if (/^\s*(def |class |import |from \w+ import|print\(|if __name__)/m.test(c)) s += 4;
      if (/:\s*$/m.test(c) && /def /.test(c)) s += 2;
    }
    if (lang === 'javascript' || lang === 'typescript') {
      if (/\b(const|let|var|function|=>|async |await |require\(|module\.exports)\b/.test(c)) s += 3;
      if (/{\s*[\s\S]*}/.test(c) && /;/.test(c)) s += 1;
    }
    if (lang === 'typescript') {
      if (/:\s*(string|number|boolean|void|unknown|any)\b/.test(c) || /\binterface \w+/.test(c)) s += 4;
    }
    if (lang === 'html') {
      if (/<[a-z][\s\S]*>/i.test(c) && /<\/[a-z]+>/i.test(c)) s += 5;
    }
    if (lang === 'css') {
      if (/{\s*[^}]+:\s*[^};]+;/.test(c) || /@(media|import|keyframes)/.test(c)) s += 4;
    }
    if (lang === 'json') {
      try {
        JSON.parse(c);
        s += 6;
      } catch {
        if (/^\s*[\[{]/.test(c)) s += 1;
      }
    }
    if (lang === 'rust') {
      if (/\b(fn |impl |let mut |println!|use std::)/.test(c)) s += 5;
    }
    if (lang === 'go') {
      if (/\bpackage |func |fmt\.Print|import \(/.test(c)) s += 5;
    }
    if (lang === 'java') {
      if (/\b(public class|import java\.|System\.out\.println)/.test(c)) s += 4;
    }
    if (lang === 'cpp') {
      if (/#include\s*</.test(c) || /\bstd::|int main\s*\(/.test(c)) s += 4;
    }
    if (lang === 'bash') {
      if (/^#!\/bin\/(ba)?sh/m.test(c) || /\b(echo |export |if \[|fi\n)/m.test(c)) s += 4;
    }
    if (lang === 'sql') {
      if (/\b(SELECT|INSERT|UPDATE|DELETE|FROM|WHERE)\b/i.test(c)) s += 4;
    }
    if (lang === 'yaml') {
      if (/^\s*[\w-]+:\s*$/m.test(c) || /^\s*-\s+\w/m.test(c)) s += 2;
    }
    if (lang === 'markdown') {
      if (/^#{1,6}\s/m.test(c) || /\*\*[^*]+\*\*/.test(c)) s += 2;
    }
    return s;
  }

  function guessLanguage(code) {
    let best = 'javascript';
    let bestScore = 0;
    for (const lang of LANGS) {
      const sc = scoreLang(code, lang);
      if (sc > bestScore) {
        bestScore = sc;
        best = lang;
      }
    }
    if (bestScore < 2 && /\n/.test(code) && (code.includes('{') || code.includes('}'))) return 'javascript';
    return best;
  }

  function looksLikeCode(text) {
    if (!text || text.length < 12) return false;
    const lines = text.split('\n').length;
    const codeSignals =
      /[;{}]|=>|\bfunction\b|\bdef\b|\bclass\b|\bimport\b|\bpublic static\b|#include|SELECT |<!DOCTYPE|<div|{\s*"/i.test(text);
    return lines >= 2 && codeSignals;
  }

  let prettierCache = null;

  async function loadPrettier() {
    if (prettierCache) return prettierCache;
    try {
      const prettier = await import('https://esm.sh/prettier@3.4.2/standalone.mjs');
      const estree = await import('https://esm.sh/prettier@3.4.2/plugins/estree');
      const babel = await import('https://esm.sh/prettier@3.4.2/plugins/babel');
      const typescript = await import('https://esm.sh/prettier@3.4.2/plugins/typescript');
      const postcss = await import('https://esm.sh/prettier@3.4.2/plugins/postcss');
      const html = await import('https://esm.sh/prettier@3.4.2/plugins/html');
      const markdown = await import('https://esm.sh/prettier@3.4.2/plugins/markdown');
      const yaml = await import('https://esm.sh/prettier@3.4.2/plugins/yaml');
      const d = (m) => (m && m.default) || m;
      const P = d(prettier);
      const fmt = P.format || prettier.format;
      prettierCache = {
        format: fmt,
        plugins: {
          javascript: [d(estree), d(babel)],
          typescript: [d(estree), d(typescript)],
          json: [d(estree), d(babel)],
          css: [d(postcss)],
          html: [d(html)],
          markdown: [d(markdown)],
          yaml: [d(yaml)],
        },
      };
    } catch (e) {
      console.warn('Prettier load failed', e);
      prettierCache = { format: null, plugins: {} };
    }
    return prettierCache;
  }

  function basicFormat(code) {
    const lines = code.replace(/\r\n/g, '\n').split('\n');
    let depth = 0;
    const out = [];
    for (let line of lines) {
      const t = line.trim();
      if (/^[}\])]/.test(t)) depth = Math.max(0, depth - 1);
      out.push('  '.repeat(depth) + t);
      if (/[{[(]\s*$/.test(t)) depth++;
    }
    return out.join('\n');
  }

  async function formatCode(code, lang) {
    const trimmed = code.replace(/\r\n/g, '\n');
    const p = await loadPrettier();
    if (!p.format) return basicFormat(trimmed);

    let parser = 'babel';
    let plugins = p.plugins.javascript || [];
    if (lang === 'typescript') {
      parser = 'typescript';
      plugins = p.plugins.typescript || plugins;
    } else if (lang === 'json') {
      parser = 'json';
      plugins = p.plugins.json || plugins;
    } else if (lang === 'css') {
      parser = 'css';
      plugins = p.plugins.css || [];
    } else if (lang === 'html') {
      parser = 'html';
      plugins = p.plugins.html || [];
    } else if (lang === 'markdown') {
      parser = 'markdown';
      plugins = p.plugins.markdown || [];
    } else if (lang === 'yaml') {
      parser = 'yaml';
      plugins = p.plugins.yaml || [];
    } else if (lang === 'python' || lang === 'rust' || lang === 'go' || lang === 'java' || lang === 'cpp' || lang === 'bash' || lang === 'sql') {
      return basicFormat(trimmed);
    }

    try {
      return await p.format(trimmed, {
        parser,
        plugins,
        printWidth: 88,
        tabWidth: 2,
        semi: true,
        singleQuote: true,
      });
    } catch (e) {
      console.warn('Prettier format failed', e);
      return basicFormat(trimmed);
    }
  }

  global.NoteFlowCodeTools = {
    LANGS,
    guessLanguage,
    looksLikeCode,
    formatCode,
  };
})(typeof window !== 'undefined' ? window : globalThis);
