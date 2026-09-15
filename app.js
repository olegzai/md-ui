(function () {
  'use strict';

  const editor = document.getElementById('editor');
  const previewFrame = document.getElementById('preview');
  const divider = document.getElementById('divider');
  const appMain = document.getElementById('app-main');
  const paneEditor = document.getElementById('pane-editor');
  const versionEl = document.getElementById('version');
  const statWords = document.getElementById('stat-words');

  versionEl.textContent = 'v0.0.1';

  /* ---------- sample markdown ---------- */

  const SAMPLE = [
    '# md-ui — v0.0.1',
    '',
    'Split-screen Markdown editor with live **HTML preview**.',
    '',
    '## Try it out',
    '',
    '- Type on the **left**',
    '- See the **result** on the right',
    '- Drag the divider to resize panes',
    '',
    '### Every keystroke re-renders',
    '',
    '> A quote to prove it works.',
    '',
    'Code: `marked(v0.0.1)`',
    '',
    '```js',
    'function hello(name) {',
    '  return `Hello, ${name}!`;',
    '}',
    '```',
    '',
    '[Open md-ui source](https://github.com/org/md-ui) — [markdown cheatsheet](https://commonmark.org/help/)',
    '',
    '---',
    '',
    '## Table',
    '',
    '| Feature | Status |',
    '| --- | --- |',
    '| Split view | done |',
    '| Live preview | done |',
    '',
    '## Task list',
    '',
    '- [ ] Interactive markdown options (details/summary, buttons)',
    '- [x] v0.0.1 two-pane layout',
  ].join('\n');

  /* ---------- markdown → html ---------- */

  function renderMarkdown(src) {
    if (typeof marked !== 'undefined') {
      marked.setOptions({
        gfm: true,
        breaks: true,
        mangle: false,
        headerIds: false,
      });
      return marked.parse(src);
    }
    return fallbackMarkdown(src);
  }

  /* Minimal offline fallback (used if marked failed to load). */
  function escapeHtml(s) {
    return s
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  }

  function inline(s) {
    return s
      .replace(/`([^`]+)`/g, '<code>$1</code>')
      .replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>')
      .replace(/__([^_]+)__/g, '<strong>$1</strong>')
      .replace(/\*([^*]+)\*/g, '<em>$1</em>')
      .replace(/_([^_]+)_/g, '<em>$1</em>')
      .replace(/\[([^\]]+)\]\((https?:\/\/[^)\s]+)\)/g, '<a href="$2" target="_blank" rel="noopener">$1</a>');
  }

  function fallbackMarkdown(src) {
    const lines = src.split('\n');
    const out = [];
    let inCode = false;
    let inList = false;
    let inQuote = false;

    const closeAll = () => {
      if (inCode) { out.push('</code></pre>'); inCode = false; }
      if (inList) { out.push('</ul>'); inList = false; }
      if (inQuote) { out.push('</blockquote>'); inQuote = false; }
    };

    for (const raw of lines) {
      const line = raw;

      if (line.startsWith('```')) {
        closeAll();
        if (!inCode) { inCode = true; out.push('<pre><code>'); }
        continue;
      }
      if (inCode) { out.push(escapeHtml(line) + '\n'); continue; }

      const heading = line.match(/^(#{1,6})\s+(.*)$/);
      if (heading) {
        closeAll();
        const lvl = heading[1].length;
        out.push(`<h${lvl}>${inline(heading[2])}</h${lvl}>`);
        continue;
      }

      if (/^\s*([-*+])\s+/.test(line)) {
        if (!inList) { out.push('<ul>'); inList = true; }
        out.push('<li>' + inline(line.replace(/^\s*([-*+])\s+/, '')) + '</li>');
        continue;
      }
      if (inList) { out.push('</ul>'); inList = false; }

      if (/^\s*>/.test(line)) {
        if (!inQuote) { out.push('<blockquote>'); inQuote = true; }
        out.push('<p>' + inline(line.replace(/^\s*>\s?/, '')) + '</p>');
        continue;
      }
      if (inQuote) { out.push('</blockquote>'); inQuote = false; }

      if (/^\s*---+\s*$/.test(line)) { closeAll(); out.push('<hr>'); continue; }
      if (!line.trim()) { continue; }

      out.push('<p>' + inline(line) + '</p>');
    }
    closeAll();
    return out.join('\n');
  }

  /* ---------- preview render ---------- */

  const PREVIEW_CSS = [
    'body{font-family:system-ui,-apple-system,"Segoe UI",Roboto,sans-serif;',
    'max-width:900px;margin:0 auto;padding:32px 40px;color:#24292f;line-height:1.65;}',
    'h1,h2,h3,h4,h5,h6{line-height:1.25;margin-top:32px;margin-bottom:12px;}',
    'h1{font-size:2em;border-bottom:1px solid #e1e4e8;padding-bottom:8px;}',
    'h2{font-size:1.5em;border-bottom:1px solid #e1e4e8;padding-bottom:6px;}',
    'a{color:#0969da;text-decoration:none;}a:hover{text-decoration:underline;}',
    'pre{background:#f6f8fa;padding:16px;border-radius:8px;overflow:auto;}',
    'code{font-family:"SF Mono",Consolas,monospace;font-size:0.9em;',
    'background:#f0f1f4;padding:2px 5px;border-radius:4px;}',
    'pre code{background:none;padding:0;}',
    'blockquote{border-left:4px solid #d0d7de;margin:0;padding:0 16px;color:#57606a;}',
    'table{border-collapse:collapse;width:100%;margin:16px 0;}',
    'th,td{border:1px solid #d0d7de;padding:6px 12px;text-align:left;}',
    'th{background:#f6f8fa;}',
    'hr{border:none;border-top:1px solid #d0d7de;margin:24px 0;}',
    'ul,ol{padding-left:24px;}',
    'input[type=checkbox]{margin-right:6px;}',
  ].join('');

  let renderTimer = null;

  function updatePreview() {
    clearTimeout(renderTimer);
    renderTimer = setTimeout(() => {
      const html = renderMarkdown(editor.value);
      previewFrame.srcdoc =
        '<!DOCTYPE html><html><head><meta charset="utf-8"><style>' +
        PREVIEW_CSS +
        '</style></head><body>' +
        html +
        '</body></html>';
    }, 60);
  }

  function updateStats() {
    const text = editor.value.trim();
    const words = text ? text.split(/\s+/).length : 0;
    statWords.textContent = words + ' words';
  }

  editor.addEventListener('input', () => {
    updatePreview();
    updateStats();
  });

  /* ---------- split divider ---------- */

  let dragging = false;

  function onMove(clientX) {
    const rect = appMain.getBoundingClientRect();
    const x = Math.max(100, Math.min(clientX - rect.left, rect.width - 140));
    paneEditor.style.flex = '0 0 ' + x + 'px';
  }

  divider.addEventListener('mousedown', (e) => {
    dragging = true;
    divider.classList.add('active');
    document.body.style.cursor = 'col-resize';
    document.body.style.userSelect = 'none';
    e.preventDefault();
  });

  document.addEventListener('mousemove', (e) => {
    if (dragging) onMove(e.clientX);
  });

  document.addEventListener('mouseup', () => {
    if (!dragging) return;
    dragging = false;
    divider.classList.remove('active');
    document.body.style.cursor = '';
    document.body.style.userSelect = '';
  });

  /* ---------- header actions ---------- */

  const btnRestore = document.getElementById('btn-restore');
  const btnClear = document.getElementById('btn-clear');
  const btnCopy = document.getElementById('btn-copy');

  btnRestore.addEventListener('click', () => {
    editor.value = SAMPLE;
    updatePreview();
    updateStats();
  });

  btnClear.addEventListener('click', () => {
    editor.value = '';
    updatePreview();
    updateStats();
    editor.focus();
  });

  btnCopy.addEventListener('click', async () => {
    const html = renderMarkdown(editor.value);
    try {
      await navigator.clipboard.writeText(html);
      flash('Copied HTML');
    } catch (err) {
      flash('Copy failed');
    }
  });

  function flash(msg) {
    const old = btnCopy.textContent;
    btnCopy.textContent = msg;
    btnCopy.disabled = true;
    setTimeout(() => {
      btnCopy.textContent = old;
      btnCopy.disabled = false;
    }, 1200);
  }

  btnCopy.addEventListener('mouseup', () => btnCopy.blur());

  /* ---------- init ---------- */

  window.addEventListener('resize', () => onMove(paneEditor.getBoundingClientRect().width + appMain.getBoundingClientRect().left));

  editor.value = SAMPLE;
  updatePreview();
  updateStats();
})();