(function (root) {
  'use strict';

  const VERSION = 'v0.1.0';

const DEMO = [
    '# md-ui — демо',
    '',
    'Панель слева — Markdown, справа — живой предпросмотр. Редактируй реалтайм, исправляй, синхронизация двухсторонняя: клик по предпросмотру ведёт к строке в исходнике.',
    '',
    'Нажми {Запустить}, чтобы запустить. Счёт: {@score} очков.',
    '',
    '## Кнопки',
    '',
    '::: button Запустить green',
    '::: button Стоп red',
    '::: button Пауза big',
    '',
    '## Складка',
    '',
    '::: fold Подробнее',
    'Внутри — **жирный** текст и {Внутренняя кнопка}.',
    ':::',
    '',
    '## Чеклист',
    '',
    '- [x] Полить цветы',
    '- [ ] Сделать уроки',
    '',
    '## Прогресс',
    '',
    '::: bar 70 big',
    '',
    '## Вкладки',
    '',
    '::: tabs Игра / Музыка / Книги',
    '',
    '## Выбор',
    '',
    '::: select красный / зелёный / синий',
    '',
    '## Ввод',
    '',
    '::: input Твоё имя',
    '',
    '## Дерево',
    '',
    '::: tree Игрушки / Гоночки / Машинки',
    '',
    '## Вопрос',
    '',
    '::: modal Точно удалить?',
    '',
    '## Живые данные',
    '',
    '::: var score 7',
    '',
    '::: clock',
    '',
    '::: counter score',
    '',
    '::: bar @score big',
    '',
    '## Таблица',
    '',
    '| Урок | Готово |',
    '| --- | --- |',
    '| Математика | да |',
    '| Биология | нет |',
    '',
    '## Код',
    '',
    '```js',
    'function привет(имя) {',
    '  return `Привет, ${имя}!`;',
    '}',
    '```',
    '',
    '> Ты читаешь цитату. Всё работает.',
    '',
    '---',
    '',
    'Ссылка на проект: [md-ui](https://github.com/olegzai/md-ui)',
  ].join('\n');

  const THEME = {
    bg: '#0f1117', bg2: '#161a23', bg3: '#1d2330', border: '#2a3242',
    text: '#e6e9f0', textDim: '#8b93a7', accent: '#4f8cff', accent2: '#7aa5ff',
    green: '#3fb950', yellow: '#d29922', red: '#f85149', blue: '#58a6ff',
  };

  const C = {
    reset: '\x1b[0m', bold: '\x1b[1m', dim: '\x1b[2m', italic: '\x1b[3m',
    underline: '\x1b[4m', reverse: '\x1b[7m', clear: '\x1b[2J\x1b[H',
  };

  function rgb(hex) {
    const n = parseInt(hex.slice(1), 16);
    return [n >> 16 & 255, n >> 8 & 255, n & 255];
  }
  function fg(hex) { return '\x1b[38;2;' + rgb(hex).join(';') + 'm'; }
  function bg(hex) { return '\x1b[48;2;' + rgb(hex).join(';') + 'm'; }

  const COL = {};
  Object.keys(THEME).forEach(function (k) { COL[k] = fg(THEME[k]); });

  const SYMBOLS = {
    'Боксы': '─│┌┐└┘├┤┬┴┼═║',
    'Галочки': '✓✗✔✘★☆●○◆◇',
    'Стрелки': '←→↑↓↔↕⇐⇒⇑⇓➜',
    'Блоки': '█▓▒░▀▄▌▐▖▗▘▝',
    'Математика': 'π∞≠≈≤≥×÷±∑√∆',
    'Точки': '•·…∙‣◦',
    'Интерфейс': '▸▾◄►▲▼✎⚙✉⌘',
  };

  let asciiMode = false;
  function G() {
    return asciiMode ? {
      fold: '>', foldOpen: 'v', bullet: '-', boxH: '-', boxV: '|',
      boxTL: '+', boxTR: '+', boxBL: '+', boxBR: '+',
      barOn: '#', barOff: '.', sep: '|', sel: '>', point: 'o',
      checkOn: '[x]', checkOff: '[ ]', note: 'i', warn: '!',
    } : {
      fold: '\u25b8', foldOpen: '\u25be', bullet: '\u2022', boxH: '\u2500', boxV: '\u2502',
      boxTL: '\u250c', boxTR: '\u2510', boxBL: '\u2514', boxBR: '\u2518',
      barOn: '\u2593', barOff: '\u2591', sep: '\u2502', sel: '\u25ba', point: '\u25cf',
      checkOn: '[x]', checkOff: '[ ]', note: 'i', warn: '!',
    };
  }

  const TYPE_ALIASES = {
    'button': 'button', 'btn': 'button',
    'fold': 'fold', 'details': 'fold',
    'bar': 'progress', 'progress': 'progress',
    'tabs': 'tabs', 'tab': 'tab',
    'select': 'select',
    'input': 'input',
    'modal': 'modal',
    'tree': 'tree', 'menu': 'tree',
    'note': 'note',
    'warn': 'warn',
    'var': 'var',
    'clock': 'clock',
    'counter': 'counter',
  };

  const STYLE_WORDS = {
    'green': 'green',
    'red': 'red',
    'blue': 'blue',
    'yellow': 'yellow',
    'big': 'big',
    'dim': 'dim',
    'primary': 'primary',
  };

  const STYLE_COLORS = {
    green: THEME.green, red: THEME.red, blue: THEME.blue,
    yellow: THEME.yellow, primary: THEME.accent, big: null, dim: null,
  };

  function escapeHtml(s) {
    return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
  }

  function inlinesToText(tokens) {
    let s = '';
    for (let i = 0; i < tokens.length; i++) s += tokens[i].v;
    return s;
  }

  function parseWidgetText(text) {
    text = text.trim();
    const words = text.split(/\s+/);
    const typeWord = words[0];
    let widget = TYPE_ALIASES[typeWord];
    if (!widget) { widget = 'button'; }
    let rest = TYPE_ALIASES[typeWord] ? words.slice(1).join(' ') : words.join(' ');
    let style = null;
    if (words.length > 1) {
      const tail = words[words.length - 1];
      if (STYLE_WORDS[tail]) {
        style = STYLE_WORDS[tail];
        rest = words.slice(1, words.length - 1).join(' ');
      }
    }
    if (!TYPE_ALIASES[typeWord]) {
      const tail = words[words.length - 1];
      if (STYLE_WORDS[tail]) {
        style = STYLE_WORDS[tail];
        rest = words.slice(0, words.length - 1).join(' ');
      }
    }
    let options = null;
    if (widget === 'tabs' || widget === 'select' || widget === 'tree') {
      options = rest.split(' / ').map(function (s) { return s.trim(); }).filter(Boolean);
      if (!options.length) options = [rest.trim()].filter(Boolean);
    }
    let value = null;
    let name = null;
    if (widget === 'progress') {
      const m = rest.match(/(\d+)/);
      if (m) value = Math.max(0, Math.min(100, +m[1]));
      else if (rest.indexOf('@') === 0) value = rest;
    }
    if (widget === 'var' || widget === 'counter') {
      const m = /^(\S+)(?:\s+([\s\S]*))?$/.exec(rest);
      name = m ? m[1] : (rest || widget);
      if (widget === 'var' && m && m[2] != null) value = m[2].replace(/\s+$/, '');
    }
    if (widget === 'clock' && !rest) rest = '';
    return { widget: widget, labels: options, label: name || rest, style: style, value: value, name: name };
  }

  function makeInlineWidget(text) {
    const w = parseWidgetText(text);
    return { t: 'widget', widget: w.widget, label: w.label, labels: w.labels, style: w.style, value: w.value };
  }

  function parseInline(text) {
    const tokens = [];
    const re = /\*\*([^*]+)\*\*|__([^_]+)__|\*([^*]+)\*|_([^_]+)_|`([^`]+)`|\[([^\]]+)\]\((https?:\/\/[^)\s]+)\)|\{@([^}]+)\}|\{([^}\n]+)\}/g;
    let last = 0;
    let m;
    while ((m = re.exec(text)) !== null) {
      if (m.index > last) tokens.push({ t: 'text', v: text.slice(last, m.index) });
      const b1 = m[1], b2 = m[2], e1 = m[3], e2 = m[4], code = m[5], lk = m[6], href = m[7], ref = m[8], wtext = m[9];
      if (b1 || b2) tokens.push({ t: 'strong', v: b1 || b2 });
      else if (e1 || e2) tokens.push({ t: 'em', v: e1 || e2 });
      else if (code !== undefined) tokens.push({ t: 'code', v: code });
      else if (lk !== undefined) tokens.push({ t: 'link', v: lk, href: href });
      else if (ref !== undefined) tokens.push({ t: 'ref', v: ref });
      else if (wtext !== undefined) tokens.push(makeInlineWidget(wtext));
      last = m.index + m[0].length;
    }
    if (last < text.length) tokens.push({ t: 'text', v: text.slice(last) });
    return tokens;
  }

  function listItem(text) {
    const c = text.match(/^\s*\[([ xX])\]\s+(.*)$/);
    if (c) return { checkbox: true, checked: c[1] !== ' ', inline: parseInline(c[2]) };
    return { checkbox: false, checked: false, inline: parseInline(text) };
  }

  function cellSplit(line) {
    return line.replace(/^\s*\|/, '').replace(/\|\s*$/, '').split('|').map(function (s) { return s.trim(); });
  }

  function tableNode(rows) {
    let headers = null;
    let body = [];
    if (rows.length > 1 && rows[1].every(function (c) { return /^:?-+:?$/.test(c); })) {
      headers = rows[0];
      body = rows.slice(2);
    } else {
      body = rows;
    }
    return {
      type: 'table',
      headers: headers ? headers.map(function (c) { return parseInline(c); }) : null,
      rows: body.map(function (r) { return r.map(function (c) { return parseInline(c); }); }),
    };
  }

  function isBlockStart(line) {
    return /^(#{1,6})\s/.test(line) || /^\s*```/.test(line) || /^\s*>/.test(line) ||
      /^\s*[-*+]\s+/.test(line) || /^\s*\d+\.\s+/.test(line) || /^\s*\|/.test(line) ||
      /^\s*:::/.test(line) || /^\s*---+\s*$/.test(line);
  }

  function assignInlineLines(tokens, lineNo) {
    for (let i = 0; i < tokens.length; i++) {
      if (tokens[i].t === 'widget') tokens[i].line = lineNo;
    }
  }

  function parseBlocks(src) {
    const lines = src.replace(/\r\n/g, '\n').split('\n');
    const out = [];
    let i = 0;
    while (i < lines.length) {
      const line = lines[i];
      if (/^\s*$/.test(line)) { i++; continue; }
      const lineNo = i;

      const h = line.match(/^(#{1,6})\s+(.*)$/);
      if (h) {
        const toks = parseInline(h[2]);
        assignInlineLines(toks, lineNo);
        out.push({ type: 'heading', level: h[1].length, inline: toks, line: lineNo });
        i++; continue;
      }
      if (/^\s*```/.test(line)) {
        const lang = line.replace(/^\s*```/, '').trim();
        const buf = [];
        i++;
        while (i < lines.length && !/^\s*```/.test(lines[i])) { buf.push(lines[i]); i++; }
        i++;
        out.push({ type: 'code', lang: lang, text: buf.join('\n'), line: lineNo });
        continue;
      }
      if (/^\s*>/.test(line)) {
        const buf = [];
        while (i < lines.length && /^\s*>/.test(lines[i])) {
          buf.push(lines[i].replace(/^\s*>\s?/, ''));
          i++;
        }
        out.push({ type: 'quote', content: parseBlocks(buf.join('\n')), line: lineNo });
        continue;
      }
      if (/^\s*\d+\.\s+/.test(line)) {
        const items = [];
        while (i < lines.length && /^\s*\d+\.\s+/.test(lines[i])) {
          const li = listItem(lines[i].replace(/^\s*\d+\.\s+/, ''));
          assignInlineLines(li.inline, lineNo);
          items.push(li);
          i++;
        }
        out.push({ type: 'list', ordered: true, items: items, line: lineNo });
        continue;
      }
      if (/^\s*[-*+]\s+/.test(line)) {
        const items = [];
        while (i < lines.length && /^\s*[-*+]\s+/.test(lines[i])) {
          const li = listItem(lines[i].replace(/^\s*[-*+]\s+/, ''));
          assignInlineLines(li.inline, lineNo);
          items.push(li);
          i++;
        }
        out.push({ type: 'list', ordered: false, items: items, line: lineNo });
        continue;
      }
      if (/^\s*\|/.test(line)) {
        const rows = [];
        while (i < lines.length && /^\s*\|/.test(lines[i])) {
          rows.push(cellSplit(lines[i]));
          i++;
        }
        const t = tableNode(rows);
        t.line = lineNo;
        if (t.headers) t.headers.forEach(function (c) { assignInlineLines(c, lineNo); });
        t.rows.forEach(function (r) { r.forEach(function (c) { assignInlineLines(c, lineNo); }); });
        out.push(t);
        continue;
      }
      if (/^\s*:::/.test(line)) {
        const m = line.match(/^\s*:::\s*(.*)$/);
        const w = parseWidgetText(m ? m[1] : '');
        i++;
        if (w.widget === 'fold') {
          const body = [];
          while (i < lines.length && !/^\s*:::\s*$/.test(lines[i])) {
            body.push(lines[i]);
            i++;
          }
          if (i < lines.length) i++;
          w.body = body.join('\n');
        } else if (w.widget === 'modal') {
          let found = false;
          for (let j = i; j < lines.length; j++) {
            if (/^\s*:::\s*$/.test(lines[j])) { found = true; break; }
          }
          if (found) {
            const body = [];
            while (i < lines.length && !/^\s*:::\s*$/.test(lines[i])) {
              body.push(lines[i]);
              i++;
            }
            if (i < lines.length) i++;
            w.body = body.join('\n');
          }
        }
        out.push({ type: 'widget', widget: w.widget, label: w.label, labels: w.labels, style: w.style, value: w.value, name: w.name, body: w.body, line: lineNo });
        continue;
      }

      const buf = [line];
      i++;
      while (i < lines.length && lines[i].trim() && !isBlockStart(lines[i])) {
        buf.push(lines[i]);
        i++;
      }
      const toks = parseInline(buf.join('\n'));
      assignInlineLines(toks, lineNo);
      out.push({ type: 'paragraph', inline: toks, line: lineNo });
    }
    return out;
  }

  const VIEWER_CSS = [
    'body{font-family:system-ui,-apple-system,"Segoe UI",Roboto,sans-serif;max-width:900px;margin:0 auto;padding:32px 40px;color:' + THEME.text + ';background:' + THEME.bg + ';line-height:1.65;}',
    'h1,h2,h3,h4,h5,h6{line-height:1.25;margin-top:32px;margin-bottom:12px;}',
    'h1{font-size:2em;border-bottom:1px solid ' + THEME.border + ';padding-bottom:8px;}',
    'h2{font-size:1.5em;border-bottom:1px solid ' + THEME.border + ';padding-bottom:6px;}',
    'a{color:' + THEME.accent2 + ';text-decoration:none;}a:hover{text-decoration:underline;}',
    'pre{background:' + THEME.bg3 + ';padding:16px;border-radius:8px;overflow:auto;}',
    'code{font-family:"SF Mono",Consolas,monospace;font-size:0.9em;color:' + THEME.accent2 + ';background:' + THEME.bg3 + ';padding:2px 5px;border-radius:4px;}',
    'pre code{background:none;padding:0;}',
    'blockquote{border-left:4px solid ' + THEME.border + ';margin:0;padding:0 16px;color:' + THEME.textDim + ';}',
    'table{border-collapse:collapse;margin:16px 0;width:100%;}',
    'th,td{border:1px solid ' + THEME.border + ';padding:6px 12px;text-align:left;}',
    'th{background:' + THEME.bg2 + ';color:' + THEME.accent2 + ';}',
    'hr{border:none;border-top:1px solid ' + THEME.border + ';margin:24px 0;}',
    'ul,ol{padding-left:24px;}',
    'input[type=checkbox]{margin-right:6px;transform:scale(1.15);}',
    '.mdui-btn{font-family:inherit;font-size:14px;color:' + THEME.text + ';background:' + THEME.bg3 + ';border:1px solid ' + THEME.border + ';border-radius:8px;padding:6px 16px;margin:2px 4px;cursor:pointer;}',
    '.mdui-btn:hover{border-color:' + THEME.accent + ';}',
    '.mdui-btn.primary{border-color:' + THEME.accent + ';color:' + THEME.accent2 + ';}',
    '.mdui-btn.green{border-color:' + THEME.green + ';color:' + THEME.green + ';}',
    '.mdui-btn.red{border-color:' + THEME.red + ';color:' + THEME.red + ';}',
    '.mdui-btn.blue{border-color:' + THEME.blue + ';color:' + THEME.blue + ';}',
    '.mdui-btn.yellow{border-color:' + THEME.yellow + ';color:' + THEME.yellow + ';}',
    '.mdui-btn.big{font-size:18px;padding:10px 24px;}',
    '.mdui-bar{display:inline-flex;align-items:center;gap:10px;width:80%;}',
    '.mdui-bar .track{flex:1;height:14px;background:' + THEME.bg3 + ';border:1px solid ' + THEME.border + ';border-radius:999px;overflow:hidden;}',
    '.mdui-bar .fill{height:100%;background:' + THEME.accent + ';border-radius:999px;}',
    '.mdui-bar.big{width:100%;}',
    '.mdui-tabs{display:flex;gap:4px;margin:8px 0;flex-wrap:wrap;}',
    '.mdui-tab{font-family:inherit;font-size:13px;color:' + THEME.textDim + ';background:' + THEME.bg2 + ';border:1px solid ' + THEME.border + ';border-radius:999px;padding:4px 14px;cursor:pointer;}',
    '.mdui-tab.active{color:' + THEME.text + ';background:' + THEME.bg3 + ';border-color:' + THEME.accent + ';}',
    'select.mdui-select{font-family:inherit;font-size:14px;color:' + THEME.text + ';background:' + THEME.bg2 + ';border:1px solid ' + THEME.border + ';border-radius:8px;padding:6px 10px;}',
    '.mdui-input{font-family:inherit;font-size:14px;color:' + THEME.text + ';background:' + THEME.bg2 + ';border:1px solid ' + THEME.border + ';border-radius:8px;padding:6px 10px;min-width:220px;}',
    '.mdui-tree{font-family:"SF Mono",Consolas,monospace;font-size:14px;line-height:1.5;margin:8px 0;}',
    '.mdui-tree div{padding-left:8px;}',
    '.mdui-modal{display:none;position:fixed;inset:0;background:rgba(6,8,12,.65);align-items:center;justify-content:center;}',
    '.mdui-modal.show{display:flex;}',
    '.mdui-modal-box{background:' + THEME.bg2 + ';border:1px solid ' + THEME.accent + ';border-radius:12px;padding:20px 24px;min-width:280px;text-align:center;}',
    '.mdui-note,.mdui-warn{border-left:4px solid;border-radius:0 8px 8px 0;padding:10px 16px;margin:12px 0;}',
    '.mdui-note{border-color:' + THEME.accent + ';background:' + THEME.bg2 + ';color:' + THEME.textDim + ';}',
    '.mdui-warn{border-color:' + THEME.red + ';background:' + THEME.bg2 + ';color:' + THEME.red + ';}',
    '.mdui-clock{font-family:"SF Mono",Consolas,monospace;color:' + THEME.accent2 + ';display:inline-block;margin:4px 0;}',
    '.mdui-clock .t{display:inline-block;min-width:9ch;}',
    '.mdui-counter{display:inline-flex;align-items:center;gap:10px;font-family:"SF Mono",Consolas,monospace;font-size:15px;color:' + THEME.accent2 + ';font-weight:700;margin:4px 0;}',
    '.mdui-ctr{min-width:32px;}',
    '.mdui-ref{color:' + THEME.yellow + ';font-weight:700;}',
  ].join('');

  const PREVIEW_JS = [
    'function refresh(){',
    'var n=new Date(),p=function(x){return(x<10?"0":"")+x;},ts=p(n.getHours())+":"+p(n.getMinutes())+":"+p(n.getSeconds());',
    'var cs=document.querySelectorAll(".mdui-clock .t");for(var ci=0;ci<cs.length;ci++)cs[ci].textContent=ts;',
    'var vs=window.__MDUI?window.__MDUI.vars:{};',
    'var rs=document.querySelectorAll(".mdui-ref");for(var ri=0;ri<rs.length;ri++){var k=rs[ri].getAttribute("data-ref");rs[ri].textContent=(k&&vs[k]!=null)?vs[k]:"";}',
    'var bs=document.querySelectorAll(".mdui-bar");for(var bi=0;bi<bs.length;bi++){var dv=bs[bi].getAttribute("data-value");if(dv&&dv[0]==="@"){var vv=+vs[dv.slice(1)]||0;var fl=bs[bi].querySelector(".fill");if(fl)fl.style.width=vv+"%";var sp=bs[bi].querySelector("span");if(sp)sp.textContent=vv+"%";}}',
    '}',
    'document.addEventListener("click",function(e){var t=e.target;',
    'if(t.classList&&t.classList.contains("mdui-ctr")){var v=t.getAttribute("data-var"),d=+t.getAttribute("data-delta")||0;window.__MDUI.vars[v]=(+window.__MDUI.vars[v]||0)+d;refresh();return;}',
    'if(t.classList&&t.classList.contains("mdui-btn")){var o=t.textContent;t.textContent="✓ "+o;setTimeout(function(){t.textContent=o;},800);}if(t.classList&&t.classList.contains("mdui-tab")){var ts=document.querySelectorAll(".mdui-tab");for(var i=0;i<ts.length;i++)ts[i].classList.remove("active");t.classList.add("active");}if(t.classList&&t.classList.contains("mdui-modal-btn")){var id=t.getAttribute("data-target");var mm=document.getElementById(id);if(mm)mm.classList.add("show");return;}if(t.classList&&t.classList.contains("mdui-modal-cls")){var m2=t.closest(".mdui-modal");if(m2)m2.classList.remove("show");return;}if(t.dataset&&t.dataset.srcLine!=null&&parent&&parent.postMessage){parent.postMessage({mduiSourceLine:+t.dataset.srcLine},"*");}});',
    'var mdocs=document.querySelectorAll(".mdui-modal");for(var mi=0;mi<mdocs.length;mi++){mdocs[mi].addEventListener("click",function(ev){if(ev.target===this)this.classList.remove("show");});}',
    'refresh();setInterval(refresh,1000);',
  ].join('');

  let modalCounter = 1;

  function widgetHTML(node) {
    const g = G();
    const style = node.style ? ' ' + node.style : '';
    const lineAttr = typeof node.line === 'number' ? ' data-src-line="' + node.line + '"' : '';
    if (node.widget === 'button') {
      return '<button class="mdui-btn' + style + '"' + lineAttr + '>' + escapeHtml(node.label) + '</button>';
    }
    if (node.widget === 'fold') {
      const body = node.body ? renderHTMLBlocks(parseBlocks(node.body)).inner : '';
      return '<details class="mdui-fold"' + lineAttr + '><summary>' + escapeHtml(node.label) + '</summary>' + body + '</details>';
    }
    if (node.widget === 'progress') {
      const v = node.value || 0;
      const isRef = typeof v === 'string' && v.indexOf('@') === 0;
      const dv = isRef ? ' data-value="' + escapeHtml(v) + '"' : '';
      const width = isRef ? 0 : (v || 0);
      const txt = isRef ? '' : v;
      return '<div class="mdui-bar' + style + '"' + lineAttr + dv + '><div class="track"><div class="fill" style="width:' + width + '%"></div></div><span>' + txt + '%</span></div>';
    }
    if (node.widget === 'tabs') {
      const labels = node.labels || [];
      let h = '<div class="mdui-tabs"' + lineAttr + '>';
      for (let i = 0; i < labels.length; i++) {
        h += '<button class="mdui-tab' + (i === 0 ? ' active' : '') + '">' + escapeHtml(labels[i]) + '</button>';
      }
      return h + '</div>';
    }
    if (node.widget === 'select') {
      const labels = node.labels || [];
      let h = '<select class="mdui-select"' + lineAttr + '>';
      for (let i = 0; i < labels.length; i++) h += '<option' + (i === 0 ? ' selected' : '') + '>' + escapeHtml(labels[i]) + '</option>';
      return h + '</select>';
    }
    if (node.widget === 'input') {
      return '<label class="mdui-inlabel"' + lineAttr + '>' + escapeHtml(node.label) + ': <input class="mdui-input" placeholder="' + escapeHtml(node.label) + '"></label>';
    }
    if (node.widget === 'tree') {
      const labels = node.labels || [];
      let h = '<div class="mdui-tree"' + lineAttr + '>';
      for (let i = 0; i < labels.length; i++) {
        const isLast = i === labels.length - 1;
        const glyph = isLast ? g.boxBL + g.boxH + ' ' : g.fold + ' ';
        h += '<div>' + glyph + escapeHtml(labels[i]) + '</div>';
      }
      return h + '</div>';
    }
    if (node.widget === 'modal') {
      const body = node.body ? renderHTMLBlocks(parseBlocks(node.body)).inner : '';
      const id = 'mdui-modal-' + (modalCounter++);
      return '<button class="mdui-btn' + (node.style ? ' ' + node.style : '') + ' mdui-modal-btn" data-target="' + id + '"' + lineAttr + '>' + escapeHtml(node.label) + '</button>' +
        '<div class="mdui-modal" id="' + id + '"><div class="mdui-modal-box">' + body +
        '<p><button class="mdui-btn mdui-modal-cls"' + lineAttr + '>ОК</button></p></div></div>';
    }
    if (node.widget === 'note') {
      return '<div class="mdui-note"' + lineAttr + '><strong>' + g.note + '</strong> ' + escapeHtml(node.label) + '</div>';
    }
    if (node.widget === 'warn') {
      return '<div class="mdui-warn"' + lineAttr + '><strong>' + g.warn + '</strong> ' + escapeHtml(node.label) + '</div>';
    }
    if (node.widget === 'var') {
      return '';
    }
    if (node.widget === 'clock') {
      const t = node.label ? escapeHtml(node.label) + ': ' : '';
      return '<span class="mdui-clock"' + lineAttr + '>' + t + '<span class="t"></span></span>';
    }
    if (node.widget === 'counter') {
      const name = node.name || node.label || 'count';
      return '<span class="mdui-counter"' + lineAttr + '><button class="mdui-btn mdui-ctr" data-var="' + escapeHtml(name) + '" data-delta="-1">−</button><span class="mdui-ref" data-ref="' + escapeHtml(name) + '"></span><button class="mdui-btn mdui-ctr" data-var="' + escapeHtml(name) + '" data-delta="1">+</button></span>';
    }
    return '<span' + lineAttr + '>' + escapeHtml(node.label) + '</span>';
  }

  function inlineHTML(tokens) {
    let h = '';
    for (let i = 0; i < tokens.length; i++) {
      const t = tokens[i];
      if (t.t === 'text') h += escapeHtml(t.v);
      else if (t.t === 'strong') h += '<strong>' + escapeHtml(t.v) + '</strong>';
      else if (t.t === 'em') h += '<em>' + escapeHtml(t.v) + '</em>';
      else if (t.t === 'code') h += '<code>' + escapeHtml(t.v) + '</code>';
      else if (t.t === 'link') h += '<a href="' + t.href + '" target="_blank" rel="noopener">' + escapeHtml(t.v) + '</a>';
      else if (t.t === 'ref') h += '<span class="mdui-ref" data-ref="' + escapeHtml(t.v) + '"></span>';
      else if (t.t === 'widget') h += widgetHTML(t);
    }
    return h;
  }

  function renderHTMLBlocks(ast) {
    let inner = '';
    for (let i = 0; i < ast.length; i++) {
      const b = ast[i];
      const id = typeof b.line === 'number' ? ' data-src-line="' + b.line + '"' : '';
      if (b.type === 'heading') {
        inner += '<h' + b.level + id + '>' + inlineHTML(b.inline) + '</h' + b.level + '>';
      } else if (b.type === 'paragraph') {
        inner += '<p' + id + '>' + inlineHTML(b.inline) + '</p>';
      } else if (b.type === 'hr') {
        inner += '<hr' + id + '>';
      } else if (b.type === 'code') {
        inner += '<pre' + id + '><code>' + escapeHtml(b.text) + '</code></pre>';
      } else if (b.type === 'quote') {
        inner += '<blockquote' + id + '>' + renderHTMLBlocks(b.content).inner + '</blockquote>';
      } else if (b.type === 'list') {
        const tag = b.ordered ? 'ol' : 'ul';
        let li = '<' + tag + id + '>';
        for (let j = 0; j < b.items.length; j++) {
          const it = b.items[j];
          if (it.checkbox) {
            li += '<li><input type="checkbox"' + (it.checked ? ' checked' : '') + '> ' + inlineHTML(it.inline) + '</li>';
          } else {
            li += '<li>' + inlineHTML(it.inline) + '</li>';
          }
        }
        inner += li + '</' + tag + '>';
      } else if (b.type === 'table') {
        let t = '<table' + id + '>';
        if (b.headers) {
          t += '<thead><tr>';
          for (let j = 0; j < b.headers.length; j++) t += '<th>' + inlineHTML(b.headers[j]) + '</th>';
          t += '</tr></thead>';
        }
        t += '<tbody>';
        for (let r = 0; r < b.rows.length; r++) {
          t += '<tr>';
          for (let j = 0; j < b.rows[r].length; j++) t += '<td>' + inlineHTML(b.rows[r][j]) + '</td>';
          t += '</tr>';
        }
        inner += t + '</tbody></table>';
      } else if (b.type === 'widget') {
        inner += widgetHTML(b);
      }
    }
    return { inner: inner };
  }

  function buildPreviewDoc(src) {
    modalCounter = 1;
    const ast = parseBlocks(src);
    const body = renderHTMLBlocks(ast).inner;
    const vars = collectVars(ast, {});
    return '<!DOCTYPE html><html><head><meta charset="utf-8"><style>' + VIEWER_CSS + '</style></head><body>' +
      body + '<script>window.__MDUI=' + JSON.stringify({ vars: vars }) + ';</script><script>' + PREVIEW_JS + '<\/script></body></html>';
  }

  function buildBodyHTML(src) {
    modalCounter = 1;
    return renderHTMLBlocks(parseBlocks(src)).inner;
  }

  function collectWidgets(ast, acc) {
    acc = acc || [];
    for (let i = 0; i < ast.length; i++) {
      const b = ast[i];
      if (b.type === 'widget') {
        if (b.widget !== 'var') acc.push({ node: b });
        if (b.widget === 'fold' && b.body) {
          collectWidgets(parseBlocks(b.body), acc);
        }
      } else if (b.type === 'list') {
        for (let j = 0; j < b.items.length; j++) {
          const it = b.items[j];
          collectInlineWidgets(it.inline, acc);
          if (it.checkbox) {
            acc.push({ node: { widget: 'checkbox', label: inlinesToText(it.inline), checked: it.checked } });
          }
        }
      } else if (b.type === 'paragraph' || b.type === 'heading') {
        collectInlineWidgets(b.inline, acc);
      } else if (b.type === 'quote') {
        collectWidgets(b.content, acc);
      } else if (b.type === 'table') {
        if (b.headers) b.headers.forEach(function (c) { collectInlineWidgets(c, acc); });
        b.rows.forEach(function (r) { r.forEach(function (c) { collectInlineWidgets(c, acc); }); });
      }
    }
    return acc;
  }

  function collectInlineWidgets(tokens, acc) {
    for (let i = 0; i < tokens.length; i++) {
      if (tokens[i].t === 'widget') acc.push({ node: tokens[i] });
    }
  }

  function collectVars(ast, out) {
    out = out || {};
    for (let i = 0; i < ast.length; i++) {
      const b = ast[i];
      if (b.type === 'widget' && b.widget === 'var') {
        const raw = b.value == null || b.value === '' ? '' : b.value;
        out[b.name] = /^-?\d+(\.\d+)?$/.test(raw) ? +raw : raw;
      } else if (b.type === 'widget' && b.widget === 'fold' && b.body) {
        collectVars(parseBlocks(b.body), out);
      } else if (b.type === 'quote') {
        collectVars(b.content, out);
      }
    }
    return out;
  }

  function varValue(st, ref) {
    const v = st.vars && st.vars[ref] != null ? st.vars[ref] : 0;
    return typeof v === 'number' && !isNaN(v) ? v : 0;
  }

  function defaultStates(widgets) {
    return widgets.map(function (w) {
      return {
        node: w.node,
        open: false, checked: !!w.node.checked, idx: 0, value: '',
        modalOpen: false, treeOpen: false,
      };
    });
  }

  function styleify(t, v) {
    switch (t) {
      case 'strong': return C.bold + v;
      case 'em': return C.italic + v;
      case 'code': return COL.accent2 + bg(THEME.bg3) + ' ' + v + ' ' + C.reset + C.reset;
      case 'link': return COL.accent2 + C.underline + v + C.reset;
      case 'ref': return COL.yellow + C.bold + v + C.reset;
      default: return COL.text + v;
    }
  }

  function segsToString(segs) {
    let s = '';
    for (let i = 0; i < segs.length; i++) {
      const sg = segs[i];
      s += styleify(sg.t, sg.v);
    }
    s += C.reset;
    return s;
  }

  function wrapSegs(segs, w) {
    if (w <= 2) w = 2;
    const out = [];
    let cur = [];
    let curLen = 0;
    for (let i = 0; i < segs.length; i++) {
      const seg = segs[i];
      const words = seg.v.split(' ').filter(function (x) { return x.length > 0; });
      const isLastSeg = i === segs.length - 1;
      for (let j = 0; j < words.length; j++) {
        const isLastWord = isLastSeg && j === words.length - 1;
        const word = words[j] + (isLastWord ? '' : ' ');
        if (curLen + word.length > w && curLen > 0) {
          out.push(segsToString(cur));
          cur = [];
          curLen = 0;
        }
        cur.push({ t: seg.t, v: word });
        curLen += word.length;
      }
    }
    if (cur.length) out.push(segsToString(cur));
    return out;
  }

  function clip(s, w) {
    let out = '';
    let n = 0;
    let i = 0;
    while (i < s.length && n < w) {
      const ch = s[i];
      if (ch === '\x1b') {
        out += ch;
        i++;
        if (s[i] === '[') {
          out += '[';
          i++;
          while (i < s.length && !/[a-zA-Z]/.test(s[i])) { out += s[i]; i++; }
          if (i < s.length) { out += s[i]; i++; }
        }
        continue;
      }
      out += ch;
      n++;
      i++;
    }
    while (n < w) { out += ' '; n++; }
    return out;
  }

  function colorOf(style) {
    const c = STYLE_COLORS[style];
    return c ? fg(c) : COL.accent;
  }

  function visLen(s) {
    return s.replace(/\x1b\[[0-9;]*m/g, '').length;
  }

  function renderANSI(ast, st, width) {
    const g = G();
    const lines = [];
    const blockStarts = [];
    let widx = st.widx || 0;

    function inlineToSegs(tokens) {
      const segs = [];
      for (let i = 0; i < tokens.length; i++) {
        const t = tokens[i];
        if (t.t === 'text') segs.push({ t: 'text', v: t.v });
        else if (t.t === 'strong') segs.push({ t: 'strong', v: t.v });
        else if (t.t === 'em') segs.push({ t: 'em', v: t.v });
        else if (t.t === 'code') segs.push({ t: 'code', v: t.v });
        else if (t.t === 'link') segs.push({ t: 'link', v: t.v });
        else if (t.t === 'ref') segs.push({ t: 'ref', v: String(st.vars && st.vars[t.v] != null ? st.vars[t.v] : t.v) });
        else if (t.t === 'widget') segs.push({ t: 'text', v: inlineWidgetText(t) });
      }
      return segs;
    }

    function inlineWidgetText(node) {
      const focused = st.focus === widx;
      widx++;
      const parts = node.labels && node.labels.length ? node.labels.join(' / ') : (node.label || '');
      if (focused) return C.reverse + '[' + parts + ']' + C.reset;
      return COL.accent2 + '{' + parts + '}' + C.reset;
    }

    for (let bi = 0; bi < ast.length; bi++) {
      const b = ast[bi];
      blockStarts.push({ srcLine: typeof b.line === 'number' ? b.line : -1, idx: lines.length });

      if (b.type === 'heading') {
        const label = '#'.repeat(b.level) + ' ' + segsToString(inlineToSegs(b.inline));
        lines.push(styleify('strong', label));
        continue;
      }
      if (b.type === 'paragraph') {
        const ws = wrapSegs(inlineToSegs(b.inline), width);
        for (let li = 0; li < ws.length; li++) lines.push(ws[li]);
        continue;
      }
      if (b.type === 'hr') {
        lines.push(COL.textDim + g.boxH.repeat(width) + C.reset);
        continue;
      }
      if (b.type === 'code') {
        if (b.lang) lines.push(COL.textDim + '```' + b.lang + C.reset);
        const codeLines = b.text.split('\n');
        for (let ci = 0; ci < codeLines.length; ci++) {
          lines.push(COL.text + bg(THEME.bg3) + codeLines[ci] + COL.reset + C.reset);
        }
        continue;
      }
      if (b.type === 'quote') {
        const sub = renderANSI(b.content, { widgets: st.widgets, focus: st.focus, widx: widx }, Math.max(4, width - 2));
        widx = sub.widx;
        const bodyLines = sub.lines;
        if (!bodyLines.length) bodyLines.push('');
        for (let qi = 0; qi < bodyLines.length; qi++) {
          lines.push(COL.textDim + '│ ' + C.reset + bodyLines[qi]);
        }
        continue;
      }
      if (b.type === 'list') {
        for (let j = 0; j < b.items.length; j++) {
          const it = b.items[j];
          let prefix = it.checkbox ? '' : (b.ordered ? (j + 1) + '. ' : g.bullet + ' ');
          let mark = prefix;
          if (it.checkbox) {
            const state = st.widgets[widx];
            const focused = st.focus === widx;
            widx++;
            const mk = state && state.checked ? g.checkOn : g.checkOff;
            mark = focused ? C.reverse + ' ' + mk.replace(/\[|\]/g, '') + ' ' + C.reset + ' ' : mk + ' ';
            prefix = '';
          }
          collectInlineWidgets(it.inline, []);
          const segs = inlineToSegs(it.inline);
          const ws = wrapSegs(segs, Math.max(4, width - prefix.length - (it.checkbox ? 4 : 0)));
          for (let li = 0; li < ws.length; li++) {
            lines.push(COL.text + prefix + mark + C.reset + ws[li]);
          }
        }
        continue;
      }
      if (b.type === 'table') {
        const colCount = b.headers ? b.headers.length : (b.rows[0] ? b.rows[0].length : 0);
        const widths = new Array(colCount).fill(4);
        const allRows = [];
        if (b.headers) allRows.push(b.headers);
        for (let r = 0; r < b.rows.length; r++) allRows.push(b.rows[r]);
        for (let r = 0; r < allRows.length; r++) {
          for (let c = 0; c < allRows[r].length; c++) {
            const len = inlinesToText(allRows[r][c]).length;
            if (widths[c] < len) widths[c] = len;
          }
        }
        function sepRow() {
          let s = COL.textDim;
          for (let c = 0; c < colCount; c++) s += '+' + g.boxH.repeat(widths[c] + 2);
          return s + '+' + C.reset;
        }
        function fmtRow(cells, isHead) {
          let s = '';
          for (let c = 0; c < colCount; c++) {
            const cell = cells[c] || [{ t: 'text', v: '' }];
            inlineToSegs(cell);
            const txt = inlinesToText(cell);
            const pad = ' '.repeat(Math.max(0, widths[c] - txt.length));
            s += '│ ' + (isHead ? C.bold + COL.accent2 : COL.text) + txt + pad + ' ' + C.reset;
          }
          return s + '│' + C.reset;
        }
        lines.push(sepRow());
        if (b.headers) {
          lines.push(fmtRow(b.headers, true));
          lines.push(sepRow());
        }
        for (let r = 0; r < b.rows.length; r++) lines.push(fmtRow(b.rows[r], false));
        lines.push(sepRow());
        continue;
      }
      if (b.type === 'widget') {
        if (b.widget === 'var') continue;
        const stIdx = widx;
        const state = st.widgets[stIdx];
        const focused = st.focus === stIdx;
        const num = stIdx + 1;
        widx++;
        const label = b.label || '';

        if (b.widget === 'button') {
          const col = colorOf(b.style);
          const prefix = (focused ? C.reverse : COL.textDim) + '[' + num + ']' + C.reset + ' ';
          const body = (focused ? C.reverse : col) + g.sep + ' ' + label + ' ' + C.reset;
          lines.push(prefix + body);
        } else if (b.widget === 'fold') {
          const glyph = state && state.open ? g.foldOpen : g.fold;
          const first = (focused ? C.reverse : COL.accent2) + '[' + num + '] ' + glyph + ' ' + label + C.reset;
          lines.push(first);
          if (b.body) {
            const sub = renderANSI(parseBlocks(b.body), { widgets: st.widgets, focus: st.focus, widx: widx }, Math.max(4, width - 2));
            widx = sub.widx;
            if (state && state.open) {
              for (let si = 0; si < sub.lines.length; si++) lines.push('  ' + sub.lines[si]);
            }
          }
        } else if (b.widget === 'progress') {
          const v = typeof b.value === 'string' ? varValue(st, b.value.slice(1)) : (b.value == null ? 0 : b.value);
          const barW = Math.max(4, width - 8);
          let line = focused ? C.reverse : '';
          const on = Math.round(v / 100 * barW);
          for (let bb = 0; bb < on; bb++) line += COL.green + g.barOn;
          for (let bb = on; bb < barW; bb++) line += COL.textDim + g.barOff;
          lines.push(line + C.reset + COL.text + ' ' + v + '%' + C.reset);
        } else if (b.widget === 'tabs') {
          const labels = b.labels || [];
          let line = focused ? C.reverse : '';
          for (let tj = 0; tj < labels.length; tj++) {
            const active = state && state.idx === tj;
            line += (active ? COL.accent2 + C.bold : COL.textDim);
            line += (active ? '[' + labels[tj] + '] ' : labels[tj] + ' ');
            line += (tj < labels.length - 1 ? COL.textDim + g.sep + ' ' : '');
          }
          lines.push(line + C.reset);
        } else if (b.widget === 'select') {
          const labels = b.labels || [];
          let line = '';
          for (let sj = 0; sj < labels.length; sj++) {
            const on = state && state.idx === sj;
            const mark = on ? (asciiMode ? '(*) ' : g.point + ' ') : (asciiMode ? '( ) ' : '  ');
            line += (focused && on ? C.reverse : '');
            line += (on ? COL.accent2 + C.bold : COL.textDim) + mark + labels[sj] + ' ' + C.reset;
            if (sj < labels.length - 1) line += COL.textDim + g.sep + ' ' + C.reset;
          }
          lines.push(line);
        } else if (b.widget === 'input') {
          const marker = focused ? '▌' : '';
          lines.push(COL.textDim + label + ': ' + C.reset + COL.text + (state ? state.value : '') + marker + C.reset);
        } else if (b.widget === 'tree') {
          const labels = b.labels || [];
          for (let ti = 0; ti < labels.length; ti++) {
            const isLast = ti === labels.length - 1;
            let line = '';
            if (isLast) {
              line += COL.textDim + (asciiMode ? '+' : g.boxBL + g.boxH + ' ') + C.reset;
            } else {
              line += COL.textDim + (asciiMode ? '| ' : '  ') + C.reset;
            }
            line += (isLast && focused ? C.reverse : COL.text) + labels[ti] + C.reset;
            lines.push(line);
          }
        } else if (b.widget === 'modal') {
          lines.push(COL.yellow + '[' + num + '] ' + label + '  (Enter — открыть)' + C.reset);
        } else if (b.widget === 'clock') {
          const nowT = (st.live && st.live.now) || Date.now();
          const d0 = new Date(nowT);
          const pp = function (x) { return (x < 10 ? '0' : '') + x; };
          const tt = pp(d0.getHours()) + ':' + pp(d0.getMinutes()) + ':' + pp(d0.getSeconds());
          const tlabel = label || 'время';
          lines.push((focused ? C.reverse : COL.accent2) + '[' + num + '] ' + tlabel + ': ' + tt + C.reset);
        } else if (b.widget === 'counter') {
          const name = b.name || label || 'count';
          const val = st.vars && st.vars[name] != null ? st.vars[name] : 0;
          const cbody = (focused ? C.reverse : COL.accent2) + '[' + num + '] ' + name + ' = ' + val + C.reset;
          lines.push(cbody + COL.textDim + '  (Enter — +1)' + C.reset);
        } else if (b.widget === 'note') {
          lines.push(COL.textDim + g.note + ' ' + COL.text + label + C.reset);
        } else if (b.widget === 'warn') {
          lines.push(COL.yellow + g.warn + ' ' + label + C.reset);
        } else {
          lines.push(COL.text + label + C.reset);
        }
        continue;
      }
    }
    return { lines: lines, blockStarts: blockStarts, widx: widx };
  }

  function refreshSource(source, st) {
    st.ast = parseBlocks(source);
    st.widgets = defaultStates(collectWidgets(st.ast));
    st.vars = collectVars(st.ast, {});
    return st;
  }

  function openTui(initialSource, filePath) {
    const fs = require('fs');
    const path = require('path');
    const out = process.stdout;

    const ed = { lines: initialSource.replace(/\r\n/g, '\n').split('\n'), row: 0, col: 0, top: 0 };
    const st = {
      widgets: [], focus: -1, mode: 'edit', toast: '', toastUntil: 0,
      edColsPct: 0.42, modalIdx: null, modalChoice: 0, paletteOn: false,
      paletteGroup: 0, paletteIdx: 0, viewMode: 'render', pvTop: 0,
      lastRendered: [], lastRenderedLines: [], widgetCount: 0,
      vars: {}, live: { now: Date.now() },
    };
    let tickTimer = null;
    st.filePath = filePath;
    let sourceText = initialSource;
    refreshSource(sourceText, st);
    st.widgetCount = st.widgets.length;

    let raw = false;
    function enterRaw() {
      if (!process.stdin.isTTY) return;
      try {
        process.stdin.setRawMode(true);
        raw = true;
      } catch (e) { raw = false; }
      process.stdin.resume();
      process.stdin.setEncoding('utf8');
    }
    function exitRaw() {
      if (raw) process.stdin.setRawMode(false);
      process.stdin.pause();
    }
    function quit() {
      if (tickTimer) clearInterval(tickTimer);
      exitRaw();
      process.stdout.write('\x1b[?25h\x1b[0m\n');
      process.exit(0);
    }

    function toast(msg) {
      st.toast = msg;
      st.toastUntil = Date.now() + 2500;
    }
    function cols() { return process.stdout.columns || 80; }
    function rows() { return process.stdout.rows || 24; }
    function padNum(n, w) {
      const s = String(n);
      return ' '.repeat(Math.max(0, w - s.length)) + s;
    }

    function layout() {
      const colN = cols();
      let edW = Math.max(20, Math.min(Math.floor(colN * st.edColsPct), colN - 40));
      if (colN - edW - 1 < 24) edW = colN - 25;
      return { edW: edW, pvW: colN - edW - 1, colN: colN, rowN: rows(), bodyH: rows() - 2 };
    }

    function dirty() {
      sourceText = ed.lines.join('\n');
      refreshSource(sourceText, st);
      st.widgetCount = st.widgets.length;
    }

    function scrollFollow() {
      const bodyH = layout().bodyH;
      let best = 0;
      for (let k = 0; k < st.lastRendered.length; k++) {
        if (st.lastRendered[k].srcLine >= 0 && st.lastRendered[k].srcLine <= ed.row) {
          best = st.lastRendered[k].idx;
        }
      }
      const max = Math.max(0, st.lastRenderedLines.length - bodyH);
      st.pvTop = Math.max(0, Math.min(best, max));
    }

    function render() {
      const lay = layout();
      if (st.viewMode === 'html') {
        st.lastRenderedLines = buildPreviewDoc(ed.lines.join('\n')).split('\n');
        st.lastRendered = [];
      } else {
        const res = renderANSI(st.ast, st, lay.pvW);
        st.lastRenderedLines = res.lines;
        st.lastRendered = res.blockStarts;
        st.widgetCount = res.widx;
      }
      scrollFollow();
    }

    function paint() {
      const lay = layout();
      const g = G();
      const total = ed.lines.length;
      const gutterW = String(total).length;
      if (ed.row < ed.top) ed.top = ed.row;
      if (ed.row >= ed.top + lay.bodyH) ed.top = ed.row - lay.bodyH + 1;

      let buf = C.clear;

      let header = COL.accent2 + ' md-ui ' + VERSION + C.reset + '  ' + COL.textDim + (st.filePath || '') + C.reset;
      buf += header;
      const fileLabel = COL.textDim + (st.viewMode === 'html' ? 'HTML' : 'PREVIEW') + '  Виджетов: ' + st.widgetCount + C.reset;
      buf += ' '.repeat(Math.max(1, lay.colN - visLen(header + fileLabel))) + fileLabel + '\n';

      for (let r = 0; r < lay.bodyH; r++) {
        const absLine = ed.top + r;
        let editorLine;
        if (absLine < total) {
          const text = ed.lines[absLine];
          const isCur = absLine === ed.row;
          const bodyTxt = text.length > lay.edW - gutterW - 2 ? text.slice(0, lay.edW - gutterW - 2) : text;
          editorLine = COL.textDim + padNum(absLine + 1, gutterW) + C.reset + ' ' +
            (isCur ? C.reverse + COL.text + bodyTxt + C.reset : COL.text + bodyTxt + C.reset);
        } else {
          editorLine = COL.textDim + padNum(absLine + 1, gutterW) + C.reset;
        }
        editorLine = clip(editorLine, lay.edW);

        let pvLine = '';
        if (st.viewMode === 'html') {
          const content = st.lastRenderedLines[st.pvTop + r];
          pvLine = content ? clip(COL.textDim + content, lay.pvW) : clip('', lay.pvW);
        } else {
          const rl = st.lastRenderedLines[st.pvTop + r];
          pvLine = rl ? clip(rl, lay.pvW) : clip('', lay.pvW);
        }
        buf += editorLine + COL.textDim + g.boxV + C.reset + pvLine + '\n';
      }

      buf += statusLine(lay.colN) + '\n';
      if (st.modalIdx != null) buf = drawOverlay(lay.colN, lay.rowN);
      if (st.paletteOn) buf = drawPalette(lay.colN, lay.rowN);
      out.write(buf);
    }

    function statusLine(colN) {
      if (Date.now() > st.toastUntil) st.toast = '';
      let left;
      if (st.mode === 'input') left = 'ввод → ?';
      else if (st.modalIdx != null) left = 'Enter — да · Esc — нет';
      else if (st.paletteOn) left = '←/→ символ · ↑/↓ группа · Enter — вставить · Esc — закрыть';
      else if (st.focus >= 0) left = 'виджет #' + (st.focus + 1) + '/' + st.widgets.length;
      else left = 'строка ' + (ed.row + 1) + ' · столбец ' + (ed.col + 1);
      let right = 'Tab фокус · R html · Ctrl+K символы · Ctrl+S save · Ctrl+Q quit';
      if (st.toast) right = st.toast + '   ' + right;
      return clip(COL.textDim + left + C.reset + '   ' + COL.textDim + right + C.reset, colN);
    }

    function frame(y, x, w, h, g) {
      const grid = [];
      for (let r = 0; r < h; r++) grid.push(new Array(w).fill(' '));
      for (let c = 0; c < w; c++) {
        grid[0][c] = g.boxH; grid[h - 1][c] = g.boxH;
      }
      for (let r = 0; r < h; r++) {
        grid[r][0] = g.boxV; grid[r][w - 1] = g.boxV;
      }
      grid[0][0] = g.boxTL; grid[0][w - 1] = g.boxTR;
      grid[h - 1][0] = g.boxBL; grid[h - 1][w - 1] = g.boxBR;
      return grid;
    }

    function drawOverlay(colN, rowN) {
      const g = G();
      const w = Math.min(48, colN - 12);
      const h = 7;
      const x = Math.floor((colN - w) / 2);
      const y = Math.floor((rowN - h) / 2);
      const node = st.widgets[st.modalIdx] ? st.widgets[st.modalIdx].node : null;
      const title = node ? (node.label || 'Вопрос') : 'Вопрос';
      const grid = frame(y, x, w, h, g);
      const put = function (row, col, text) {
        for (let c = 0; c < text.length && col + c < w - 1; c++) grid[row][col + c] = text[c];
      };
      put(0, 1, title);
      const line1 = st.modalChoice === 0 ? '[ Да ]' : '  Да  ';
      const line2 = st.modalChoice === 1 ? '[ Нет ]' : '  Нет  ';
      const midStart = Math.floor((w - (line1.length + line2.length + 3)) / 2);
      put(3, midStart, line1 + '   ' + line2);
      put(5, Math.floor((w - 24) / 2), 'Enter — подтвердить · Esc — закрыть');
      let msg = COL.text + bg(THEME.bg2);
      for (let r = 0; r < rowN; r++) {
        if (r >= y && r < y + h) msg += grid[r - y].join('') + '\n';
        else msg += ' '.repeat(colN) + '\n';
      }
      return C.clear + msg + C.reset;
    }

    function drawPalette(colN, rowN) {
      const g = G();
      const groups = Object.keys(SYMBOLS);
      const gname = groups[st.paletteGroup];
      const chars = SYMBOLS[gname].split('');
      const w = Math.min(60, colN - 12);
      const h = 8;
      const x = Math.floor((colN - w) / 2);
      const y = Math.floor((rowN - h) / 2);
      const grid = frame(y, x, w, h, g);
      const put = function (row, col, text) {
        for (let c = 0; c < text.length && col + c < w - 1; c++) grid[row][col + c] = text[c];
      };
      put(0, 1, 'Символы — ' + gname);
      put(2, 1, chars.join(' '));
      put(4, 1, 'выбор: ' + (chars[st.paletteIdx] || ' '));
      const hint = '← → символ · ↑ ↓ группа · Enter — вставить · Esc — закрыть';
      put(6, 1, hint);
      let msg = COL.text + bg(THEME.bg2);
      for (let r = 0; r < rowN; r++) {
        if (r >= y && r < y + h) msg += grid[r - y].join('') + '\n';
        else msg += ' '.repeat(colN) + '\n';
      }
      return C.clear + msg + C.reset;
    }

    function moveCursorHoriz(d) {
      const line = ed.lines[ed.row] || '';
      ed.col += d;
      if (ed.col < 0) {
        if (ed.row > 0) { ed.row--; ed.col = (ed.lines[ed.row] || '').length; } else ed.col = 0;
      }
      if (ed.col > line.length) {
        if (ed.row < ed.lines.length - 1) { ed.row++; ed.col = 0; } else ed.col = line.length;
      }
    }
    function moveCursorVert(d) {
      const next = ed.row + d;
      if (next < 0 || next >= ed.lines.length) return;
      ed.row = next;
      if (ed.col > (ed.lines[ed.row] || '').length) ed.col = (ed.lines[ed.row] || '').length;
    }
    function insertText(text) {
      const line = ed.lines[ed.row];
      ed.lines[ed.row] = line.slice(0, ed.col) + text + line.slice(ed.col);
      ed.col += text.length;
    }
    function newline() {
      const line = ed.lines[ed.row];
      ed.lines[ed.row] = line.slice(0, ed.col);
      ed.lines.splice(ed.row + 1, 0, line.slice(ed.col));
      ed.row++;
      ed.col = 0;
    }
    function backspace() {
      if (ed.col > 0) {
        const line = ed.lines[ed.row];
        ed.lines[ed.row] = line.slice(0, ed.col - 1) + line.slice(ed.col);
        ed.col--;
      } else if (ed.row > 0) {
        const prev = ed.lines[ed.row - 1];
        const cur = ed.lines[ed.row];
        ed.lines.splice(ed.row, 1);
        ed.row--;
        ed.col = prev.length;
        ed.lines[ed.row] = prev + cur;
      }
    }
    function del() {
      const line = ed.lines[ed.row];
      if (ed.col < line.length) {
        ed.lines[ed.row] = line.slice(0, ed.col) + line.slice(ed.col + 1);
      } else if (ed.row < ed.lines.length - 1) {
        ed.lines[ed.row] = line + ed.lines[ed.row + 1];
        ed.lines.splice(ed.row + 1, 1);
      }
    }
    function save() {
      try {
        const target = st.filePath || path.join(__dirname, 'demo', 'demo.md');
        fs.writeFileSync(target, ed.lines.join('\n') + '\n');
        toast('сохранено → ' + target);
      } catch (e) {
        toast('ошибка сохранения');
      }
    }

    function activateFocused() {
      if (st.focus < 0 || !st.widgets[st.focus]) return;
      const fw = st.widgets[st.focus];
      const node = fw.node;
      if (node.widget === 'button') toast('Нажата кнопка: ' + node.label);
      else if (node.widget === 'fold') fw.open = !fw.open;
      else if (node.widget === 'checkbox') fw.checked = !fw.checked;
      else if (node.widget === 'tabs') fw.idx = (fw.idx + 1) % (node.labels || [1]).length;
      else if (node.widget === 'select') fw.idx = (fw.idx + 1) % (node.labels || [1]).length;
      else if (node.widget === 'input') { st.mode = 'input'; toast('введите значение, Enter — ок, Esc — отмена'); }
      else if (node.widget === 'modal') { st.modalIdx = st.focus; st.modalChoice = 0; }
      else if (node.widget === 'progress') toast('прогресс: ' + (node.value || 0) + '%');
      else if (node.widget === 'tree') toast('дерево: ' + (node.labels || []).join(' / '));
      else if (node.widget === 'clock') toast('текущее время');
      else if (node.widget === 'counter') {
        const name = node.name || node.label || 'count';
        st.vars[name] = varValue(st, name) + 1;
        toast(name + ' = ' + st.vars[name]);
      }
      else if (node.widget === 'note') toast('заметка');
      else if (node.widget === 'warn') toast('важно');
    }

    function stepFocused(d) {
      if (st.focus < 0 || !st.widgets[st.focus]) return;
      const fw = st.widgets[st.focus];
      const node = fw.node;
      if (node.widget === 'tabs' || node.widget === 'select') {
        const n = (node.labels || [1]).length;
        fw.idx = (fw.idx + d + n) % n;
      }
    }

    function handleKey(data) {
      if (st.modalIdx != null) {
        if (data === '\x1b') st.modalIdx = null;
        else if (data === '\r') {
          const wd = st.widgets[st.modalIdx];
          st.modalIdx = null;
          toast(st.modalChoice === 0 ? 'Да ✓ ' + (wd && wd.node ? wd.node.label : '') : 'Отменено');
        } else if (data === '\x1b[C' || data === '\x1b[B') st.modalChoice = 1;
        else if (data === '\x1b[D' || data === '\x1b[A') st.modalChoice = 0;
        paint();
        return;
      }
      if (st.paletteOn) {
        const groups = Object.keys(SYMBOLS);
        const chars = SYMBOLS[groups[st.paletteGroup]];
        if (data === '\x1b') st.paletteOn = false;
        else if (data === '\x1b[C') st.paletteIdx = (st.paletteIdx + 1) % chars.length;
        else if (data === '\x1b[D') st.paletteIdx = (st.paletteIdx - 1 + chars.length) % chars.length;
        else if (data === '\x1b[B') { st.paletteGroup = (st.paletteGroup + 1) % groups.length; st.paletteIdx = 0; }
        else if (data === '\x1b[A') { st.paletteGroup = (st.paletteGroup - 1 + groups.length) % groups.length; st.paletteIdx = 0; }
        else if (data === '\r') {
          insertText(chars[st.paletteIdx]);
          st.paletteOn = false;
          dirty();
          render();
        }
        paint();
        return;
      }
      if (st.mode === 'input') {
        const fw = st.focus >= 0 ? st.widgets[st.focus] : null;
        if (data === '\r' || data === '\x1b') {
          st.mode = 'edit';
          toast('в вводе: ' + (fw ? fw.value : ''));
        } else if (data === '\x7f' || data === '\x08') {
          if (fw) fw.value = fw.value.slice(0, -1);
        } else if (data.length === 1) {
          const code = data.charCodeAt(0);
          if (code >= 32 && code !== 127) {
            if (fw) fw.value += data;
          }
        }
        paint();
        return;
      }

      if (data === '\x03' || data === '\x11') { quit(); return; }
      if (data === '\r') { newline(); dirty(); render(); paint(); return; }
      if (data === '\x7f' || data === '\x08') { backspace(); dirty(); render(); paint(); return; }
      if (data === '\x13') { save(); paint(); return; }
      if (data === '\x0b') { st.paletteOn = true; st.paletteIdx = 0; st.paletteGroup = 0; paint(); return; }
      if (data === '\x1b') {
        if (st.focus >= 0) st.focus = -1;
        paint();
        return;
      }
      if (data === 'r' || data === 'R') {
        st.viewMode = st.viewMode === 'html' ? 'render' : 'html';
        st.pvTop = 0;
        render();
        paint();
        return;
      }
      if (data === '[') {
        st.edColsPct = Math.max(0.2, st.edColsPct - 0.03);
        st.pvTop = 0;
        paint();
        return;
      }
      if (data === ']') {
        st.edColsPct = Math.min(0.85, st.edColsPct + 0.03);
        st.pvTop = 0;
        paint();
        return;
      }

      if (st.focus >= 0) {
        if (data === ' ') { st.mode = 'edit'; activateFocused(); render(); paint(); return; }
        if (data === '\t') {
          st.focus = (st.focus + 1) % (st.widgets.length + 1);
          paint();
          return;
        }
        if (data === '\x1b[Z') {
          st.focus = (st.focus - 1 + st.widgets.length + 1) % (st.widgets.length + 1);
          paint();
          return;
        }
        if (data === '\x1b[C' || data === '\x1b[B') { stepFocused(1); render(); paint(); return; }
        if (data === '\x1b[D' || data === '\x1b[A') { stepFocused(-1); render(); paint(); return; }
        if (/^[1-9]$/.test(data)) {
          st.focus = Math.min(+data - 1, st.widgets.length - 1);
          paint();
          return;
        }
        return;
      }

      if (data === '\t') {
        st.focus = st.widgets.length ? 0 : -1;
        paint();
        return;
      }
      if (data === '\x1b[Z') {
        st.focus = st.widgets.length ? st.widgets.length - 1 : -1;
        paint();
        return;
      }
      if (data === '\x1b[A') { moveCursorVert(-1); render(); paint(); return; }
      if (data === '\x1b[B') { moveCursorVert(1); render(); paint(); return; }
      if (data === '\x1b[C') { moveCursorHoriz(1); render(); paint(); return; }
      if (data === '\x1b[D') { moveCursorHoriz(-1); render(); paint(); return; }
      if (data === '\x1b[H' || data === '\x1b[1~') { ed.col = 0; paint(); return; }
      if (data === '\x1b[F' || data === '\x1b[4~') { ed.col = (ed.lines[ed.row] || '').length; paint(); return; }
      if (data === '\x1b[3~') { del(); dirty(); render(); paint(); return; }
      if (data.length === 1) {
        const code = data.charCodeAt(0);
        if (code >= 32 && code !== 127) {
          insertText(data);
          dirty();
          render();
          paint();
          return;
        }
      }
    }

    process.stdin.on('data', handleKey);
    process.stdout.write('\x1b[?25l');
    enterRaw();
    render();
    paint();
    process.stdout.on('resize', function () { paint(); });
    process.on('SIGINT', quit);
    tickTimer = setInterval(function () {
      st.live.now = Date.now();
      render();
      paint();
    }, 1000);
  }

  function runCli(args) {
    const fs = require('fs');
    const path = require('path');
    let file = null;
    let cmd = null;
    let rest = [];
    for (let i = 0; i < args.length; i++) {
      const a = args[i];
      if (a === '--ascii') asciiMode = true;
      else if (a === '--help' || a === '-h') cmd = 'help';
      else if (a === 'convert') cmd = 'convert';
      else if (a === 'serve') cmd = 'serve';
      else if (a.startsWith('-')) rest.push(a);
      else if (!cmd && file === null) file = a;
      else rest.push(a);
    }
    if (cmd === 'help') return printHelp();
    if (cmd === 'convert') {
      const target = file || path.join(__dirname, 'demo', 'demo.md');
      const src = fs.readFileSync(target, 'utf8');
      if (rest.indexOf('--body') >= 0) process.stdout.write(buildBodyHTML(src) + '\n');
      else process.stdout.write(buildPreviewDoc(src) + '\n');
      return;
    }
    if (cmd === 'serve') {
      const port = +rest[0] || 8080;
      return startServer(port);
    }
    if (cmd === 'tui' || cmd === null) {
      const target = file || path.join(__dirname, 'demo', 'demo.md');
      const src = fs.readFileSync(target, 'utf8');
      if (!process.stdin.isTTY) {
        process.stdout.write('md-ui: интерактивный режим требует TTY.\nПодсказка: node md-ui.js convert <файл>\n');
        return;
      }
      return openTui(src, target);
    }
    printHelp();
  }

  function printHelp() {
    process.stdout.write([
      'md-ui ' + VERSION + ' — markdown с интерактивными виджетами (без зависимостей)',
      '',
      '  node md-ui.js [файл.md]          терминальный редактор (по умолчанию demo/demo.md)',
      '  node md-ui.js convert файл.md    печатает HTML — тот же, что в браузере',
      '  node md-ui.js convert файл.md --body    только содержимое',
      '  node md-ui.js serve [порт]       веб-сервер (по умолчанию 8080, демо: /demo)',
      '  node md-ui.js --ascii            ASCII-режим для простых терминалов',
      '',
      'Виджеты: {Button} · ::: button Запустить green · ::: fold Подробнее',
      '         ::: bar 70 · ::: tabs A / B · ::: select a / b',
      '         ::: input Имя · ::: tree A / B · ::: modal Точно? · - [x]',
      'Live:    ::: var score 0 · ::: counter score · ::: clock',
      '         ::: bar @score (значение из переменной) · {@score} в тексте',
      '',
      'TUI: Tab — фокус виджета · Enter/Space — действие · 1..9 — быстрый переход',
      '     R — предпросмотр ⇄ HTML · Ctrl+K — символы · Ctrl+S — сохранить · Ctrl+Q — выход',
      '',
      'Ссылка: https://github.com/olegzai/md-ui  ·  Лицензия: MIT',
    ].join('\n') + '\n');
  }

  function startServer(port) {
    const http = require('http');
    const fs = require('fs');
    const path = require('path');
    const dir = __dirname;
    const mime = {
      '.html': 'text/html; charset=utf-8',
      '.js': 'text/javascript; charset=utf-8',
      '.md': 'text/markdown; charset=utf-8',
    };
    const server = http.createServer(function (req, res) {
      const url = decodeURIComponent((req.url || '/').split('?')[0]);
      if (url === '/demo') {
        const src = fs.readFileSync(path.join(dir, 'demo', 'demo.md'), 'utf8');
        res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
        res.end(buildPreviewDoc(src));
        return;
      }
      const rel = url === '/' ? 'mdui.html' : url.slice(1);
      if (!rel || rel.indexOf('..') !== -1) { res.writeHead(403); res.end('403'); return; }
      const fp = path.join(dir, rel);
      fs.readFile(fp, function (err, data) {
        if (err) { res.writeHead(404); res.end('404'); return; }
        const ext = path.extname(fp);
        res.writeHead(200, { 'Content-Type': mime[ext] || 'application/octet-stream' });
        res.end(data);
      });
    });
    server.listen(port, function () {
      process.stdout.write('md-ui serve → http://localhost:' + port + '  (демо: /demo)\n');
    });
  }

  function initWebApp() {
    const doc = document;
    const editor = doc.getElementById('mdui-editor');
    const preview = doc.getElementById('mdui-preview');
    const divider = doc.getElementById('mdui-divider');
    const gutter = doc.getElementById('mdui-gutter');
    const stat = doc.getElementById('mdui-stat');
    const btnSample = doc.getElementById('mdui-sample');
    const btnClear = doc.getElementById('mdui-clear');
    const btnCopy = doc.getElementById('mdui-copy');
    const btnSym = doc.getElementById('mdui-sym');
    const btnMode = doc.getElementById('mdui-mode');
    const verEl = doc.getElementById('mdui-version');
    const main = doc.getElementById('mdui-main');
    if (verEl) verEl.textContent = VERSION;

    const styleEl = doc.createElement('style');
    styleEl.textContent = [
      ':root{' + ['--bg:' + THEME.bg, '--bg2:' + THEME.bg2, '--bg3:' + THEME.bg3, '--border:' + THEME.border, '--text:' + THEME.text, '--dim:' + THEME.textDim, '--accent:' + THEME.accent].join(';') + '}',
      '*{box-sizing:border-box}html,body{height:100%;margin:0}',
      'body{display:flex;flex-direction:column;font-family:system-ui,-apple-system,"Segoe UI",Roboto,sans-serif;background:var(--bg);color:var(--text);overflow:hidden}',
      '.mdui-header{flex:0 0 auto;display:flex;align-items:center;justify-content:space-between;gap:14px;padding:10px 16px;background:var(--bg2);border-bottom:1px solid var(--border)}',
      '.mdui-brand{display:flex;align-items:center;gap:10px}',
      '.mdui-title{font-family:"SF Mono",Consolas,monospace;font-weight:700;font-size:18px;color:var(--accent)}',
      '.mdui-title::before{content:"";display:inline-block;width:10px;height:10px;margin-right:8px;background:var(--accent);border-radius:2px}',
      '.mdui-version{font-family:"SF Mono",Consolas,monospace;font-size:12px;color:var(--dim);border:1px solid var(--border);border-radius:999px;padding:2px 8px}',
      '.mdui-actions{display:flex;gap:8px;align-items:center}',
      '.mdui-stat{font-family:"SF Mono",Consolas,monospace;font-size:12px;color:var(--dim)}',
      '.mdui-btn{font-family:inherit;font-size:13px;color:var(--text);background:var(--bg3);border:1px solid var(--border);border-radius:6px;padding:6px 12px;cursor:pointer}',
      '.mdui-btn:hover{border-color:var(--accent)}',
      '.mdui-main{flex:1;display:flex;min-height:0}',
      '.mdui-pane{display:flex;flex-direction:column;min-width:0;min-height:0}',
      '#mdui-editor-pane{flex:0 0 50%}',
      '#mdui-preview-pane{flex:1 1 auto}',
      '.mdui-toolbar{flex:0 0 auto;display:flex;align-items:center;justify-content:space-between;padding:6px 12px;background:var(--bg2);border-bottom:1px solid var(--border)}',
      '.mdui-label{font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:.12em;color:var(--dim)}',
      '.mdui-hint{font-size:12px;color:var(--dim)}',
      '.mdui-code{flex:1;display:flex;min-height:0}',
      '#mdui-gutter{flex:0 0 auto;padding:14px 8px 14px 14px;font-family:"SF Mono",Consolas,monospace;font-size:14px;line-height:1.6;color:var(--dim);text-align:right;overflow:hidden;white-space:pre;border-right:1px solid var(--border);user-select:none}',
      '#mdui-editor{flex:1;resize:none;border:none;outline:none;padding:14px;font-family:"SF Mono",Consolas,monospace;font-size:14px;line-height:1.6;color:var(--text);background:var(--bg);tab-size:2}',
      '#mdui-editor::placeholder{color:#4a5265}',
      '#mdui-preview{flex:1;width:100%;border:none;background:#fff}',
      '#mdui-divider{flex:0 0 6px;cursor:col-resize;background:var(--border);position:relative}',
      '#mdui-divider:hover,#mdui-divider.active{background:var(--accent)}',
      '.mdui-sympanel{display:none;position:fixed;z-index:50;right:14px;top:54px;width:300px;max-height:72vh;overflow:auto;background:var(--bg2);border:1px solid var(--border);border-radius:10px;padding:12px;box-shadow:0 12px 40px rgba(0,0,0,.5)}',
      '.mdui-sympanel.show{display:block}',
      '.mdui-symgroup{font-size:11px;font-weight:700;text-transform:uppercase;color:var(--dim);margin:8px 0 4px}',
      '.mdui-symrow{display:flex;flex-wrap:wrap;gap:4px}',
      '.mdui-sym{font-family:"SF Mono",Consolas,monospace;font-size:16px;background:var(--bg3);border:1px solid var(--border);border-radius:6px;padding:6px 10px;cursor:pointer}',
      '.mdui-sym:hover{border-color:var(--accent)}',
    ].join('');
    doc.head.appendChild(styleEl);

    let viewMode = 'render';
    let drag = false;
    const LINE_H = 22.4;

    function render() {
      const src = editor.value;
      const html = buildPreviewDoc(src);
      preview.setAttribute('srcdoc', viewMode === 'html'
        ? '<pre style="padding:16px;font:12px/1.5 monospace;white-space:pre-wrap;color:' + THEME.text + ';background:' + THEME.bg + '">' + escapeHtml(html) + '</pre>'
        : html);
      updateGutter();
      updateStats();
    }

    function updateGutter() {
      const n = editor.value.split('\n').length;
      let s = '';
      for (let i = 1; i <= n; i++) s += i + '\n';
      gutter.textContent = s;
      gutter.scrollTop = editor.scrollTop;
    }

    function updateStats() {
      const text = editor.value.trim();
      const words = text ? text.split(/\s+/).length : 0;
      const lines = editor.value.split('\n').length;
      if (stat) stat.textContent = lines + ' строк · ' + words + ' слов';
    }

    function cursorLine() {
      const start = editor.selectionStart;
      return editor.value.slice(0, start).split('\n').length - 1;
    }

    function lineOffset(ln) {
      const lines = editor.value.split('\n');
      let off = 0;
      for (let i = 0; i < ln && i < lines.length; i++) off += lines[i].length + 1;
      return off;
    }

    function editorScrollToLine(ln) {
      const lineH = LINE_H;
      const desired = ln * lineH + 7 - editor.clientHeight / 2;
      editor.scrollTop = Math.max(0, desired);
      gutter.scrollTop = editor.scrollTop;
      const estLines = editor.value.split('\n');
      const off = lineOffset(ln);
      editor.setSelectionRange(off, off);
    }

    function followCursor() {
      if (viewMode === 'html') return;
      const win = preview.contentWindow;
      if (!win) return;
      const line = cursorLine();
      const el = win.document.querySelector('[data-src-line="' + line + '"]');
      if (el) {
        const targetY = el.getBoundingClientRect().top + (win.pageYOffset || win.scrollY || 0) - 40;
        const maxY = Math.max(0, win.document.body.scrollHeight - win.innerHeight);
        win.scrollTo(0, Math.max(0, Math.min(targetY, maxY)));
      }
    }

    let renderTimer = null;
    editor.addEventListener('input', function () {
      clearTimeout(renderTimer);
      renderTimer = setTimeout(render, 60);
    });
    editor.addEventListener('scroll', function () {
      gutter.scrollTop = editor.scrollTop;
    });
    editor.addEventListener('keyup', function () { followCursor(); updateStats(); });
    editor.addEventListener('click', function () { followCursor(); });

    window.addEventListener('message', function (ev) {
      const d = ev.data;
      if (d && typeof d.mduiSourceLine === 'number') {
        editor.focus();
        editorScrollToLine(d.mduiSourceLine);
      }
    });

    divider.addEventListener('mousedown', function (e) {
      drag = true;
      divider.classList.add('active');
      document.body.style.cursor = 'col-resize';
      document.body.style.userSelect = 'none';
      e.preventDefault();
    });
    document.addEventListener('mousemove', function (e) {
      if (!drag) return;
      const rect = main.getBoundingClientRect();
      const x = Math.max(120, Math.min(e.clientX - rect.left, rect.width - 160));
      doc.getElementById('mdui-editor-pane').style.flex = '0 0 ' + x + 'px';
    });
    document.addEventListener('mouseup', function () {
      if (!drag) return;
      drag = false;
      divider.classList.remove('active');
      document.body.style.cursor = '';
      document.body.style.userSelect = '';
    });

    btnSample.addEventListener('click', function () {
      editor.value = DEMO;
      render();
    });
    btnClear.addEventListener('click', function () {
      editor.value = '';
      render();
      editor.focus();
    });
    btnCopy.addEventListener('click', function () {
      const html = buildPreviewDoc(editor.value);
      if (navigator.clipboard) {
        navigator.clipboard.writeText(html).then(
          function () { flashBtn(btnCopy, 'Скопировано'); },
          function () { flashBtn(btnCopy, 'Ошибка'); }
        );
      } else {
        flashBtn(btnCopy, 'Ошибка');
      }
    });
    btnMode.addEventListener('click', function () {
      viewMode = viewMode === 'html' ? 'render' : 'html';
      btnMode.textContent = viewMode === 'html' ? 'HTML' : 'Preview';
      render();
    });

    const panel = doc.createElement('div');
    panel.id = 'mdui-sympanel';
    panel.className = 'mdui-sympanel';
    let ph = '';
    Object.keys(SYMBOLS).forEach(function (g) {
      ph += '<div class="mdui-symgroup">' + g + '</div><div class="mdui-symrow">';
      SYMBOLS[g].split('').forEach(function (ch) {
        ph += '<button type="button" class="mdui-sym" data-sym="' + escapeHtml(ch) + '">' + ch + '</button>';
      });
      ph += '</div>';
    });
    panel.innerHTML = ph;
    panel.addEventListener('click', function (e) {
      const t = e.target;
      if (t && t.dataset && t.dataset.sym != null) {
        const ch = t.dataset.sym;
        const start = editor.selectionStart;
        const end = editor.selectionEnd;
        editor.value = editor.value.slice(0, start) + ch + editor.value.slice(end);
        editor.setSelectionRange(start + ch.length, start + ch.length);
        editor.focus();
        render();
        panel.classList.remove('show');
      }
    });
    doc.body.appendChild(panel);
    btnSym.addEventListener('click', function (e) {
      e.stopPropagation();
      const show = !panel.classList.contains('show');
      if (show) {
        const r = btnSym.getBoundingClientRect();
        panel.style.right = '14px';
        panel.style.top = '54px';
      }
      panel.classList.toggle('show');
    });
    doc.addEventListener('click', function (e) {
      if (!e.target.closest('#mdui-sympanel') && !e.target.closest('#mdui-sym')) {
        panel.classList.remove('show');
      }
    });

    function flashBtn(btn, msg) {
      const old = btn.textContent;
      btn.textContent = msg;
      btn.disabled = true;
      setTimeout(function () {
        btn.textContent = old;
        btn.disabled = false;
      }, 1000);
    }

    editor.value = DEMO;
    render();
  }

  const api = {
    VERSION: VERSION,
    THEME: THEME,
    SYMBOLS: SYMBOLS,
    DEMO: DEMO,
    parseBlocks: parseBlocks,
    parseInline: parseInline,
    parseWidgetText: parseWidgetText,
    buildPreviewDoc: buildPreviewDoc,
    buildBodyHTML: buildBodyHTML,
    renderANSI: renderANSI,
    collectWidgets: collectWidgets,
    defaultStates: defaultStates,
    refreshSource: refreshSource,
    openTui: openTui,
    runCli: runCli,
    setAscii: function (v) { asciiMode = v; },
  };

  if (typeof module === 'object' && module.exports) {
    module.exports = api;
  } else if (typeof root !== 'undefined') {
    root.mdUi = api;
  }

  if (typeof document !== 'undefined' && document.getElementById && document.getElementById('mdui-editor')) {
    initWebApp();
  }

  if (typeof process !== 'undefined' && typeof require === 'function' && require.main === module) {
    runCli(process.argv.slice(2));
  }
})(typeof self !== 'undefined' ? self : this);