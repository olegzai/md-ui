'use strict';

const test = require('node:test');
const assert = require('node:assert');
const md = require('../md-ui.js');

test('API: версия и публичные функции', () => {
  assert.strictEqual(md.VERSION, 'v0.2.0');
  for (const fn of ['parseBlocks', 'parseInline', 'buildPreviewDoc', 'buildBodyHTML', 'renderANSI', 'collectWidgets', 'defaultStates']) {
    assert.strictEqual(typeof md[fn], 'function', fn);
  }
});

test('кнопка с цветом и её label', () => {
  const ast = md.parseBlocks('::: button Запустить green\n');
  const w = ast[0];
  assert.strictEqual(w.type, 'widget');
  assert.strictEqual(w.widget, 'button');
  assert.strictEqual(w.label, 'Запустить');
  assert.strictEqual(w.style, 'green');
});

test('складка собирает тело (регрессия v0.0.2)', () => {
  const ast = md.parseBlocks('::: fold Подробнее\nВнутри **{Кнопка}**.\n:::\n');
  const w = ast[0];
  assert.strictEqual(w.widget, 'fold');
  assert.strictEqual(w.body, 'Внутри **{Кнопка}**.');
});

test('прогресс читает число из заголовка', () => {
  const ast = md.parseBlocks('::: bar 70 big\n');
  assert.strictEqual(ast[0].widget, 'progress');
  assert.strictEqual(ast[0].value, 70);
  assert.strictEqual(ast[0].style, 'big');
});

test('вкладки / выбор / дерево разбивают options по разделителю', () => {
  for (const line of ['::: tabs Игра / Музыка / Книги', '::: select красный / зелёный / синий', '::: tree Игрушки / Гоночки / Машинки']) {
    const w = md.parseBlocks(line + '\n')[0];
    assert.strictEqual(w.labels.length, 3, line);
  }
});

test('русские слова не теги: fallback-кнопка с подписью', () => {
  const w = md.parseBlocks('::: кнопка Запустить\n')[0];
  assert.strictEqual(w.widget, 'button');
  assert.strictEqual(w.label, 'кнопка Запустить');
  assert.strictEqual(w.style, null);
});

test('инлайн-виджет {Запустить} в абзаце', () => {
  const ast = md.parseBlocks('Нажми {Запустить}, чтобы запустить.\n');
  const p = ast[0];
  assert.strictEqual(p.type, 'paragraph');
  const wt = p.inline.find((t) => t.t === 'widget');
  assert.ok(wt);
  assert.strictEqual(wt.widget, 'button');
  assert.strictEqual(wt.label, 'Запустить');
});

test('чеклист - [x] распознаётся как checkbox', () => {
  const ast = md.parseBlocks('- [x] Полить цветы\n- [ ] Сделать уроки\n');
  const list = ast[0];
  assert.strictEqual(list.type, 'list');
  assert.strictEqual(list.items[0].checkbox, true);
  assert.strictEqual(list.items[0].checked, true);
  assert.strictEqual(list.items[1].checked, false);
});

test('HTML содержит виджеты и тело складки', () => {
  const html = md.buildBodyHTML(md.DEMO);
  assert.ok(html.includes('mdui-btn green') && html.includes('Запустить'));
  assert.ok(html.includes('mdui-fold') && html.includes('<details'));
  assert.ok(html.includes('Внутренняя кнопка'));
  assert.ok(html.includes('<input type="checkbox" checked>'));
  assert.ok(html.includes('70%'));
  assert.ok(html.includes('mdui-modal'));
});

test('полный документ из preview содержит стили и скрипт-кладку', () => {
  const doc = md.buildPreviewDoc(md.DEMO);
  assert.ok(doc.startsWith('<!DOCTYPE html>'));
  assert.ok(doc.includes('mdui-btn'));
  assert.ok(doc.includes('postMessage'));
});

test('порядок виджетов: collectWidgets === renderANSI (закрытая складка)', () => {
  const st = { focus: -1 };
  md.refreshSource(md.DEMO, st);
  const res = md.renderANSI(st.ast, st, 80);
  assert.strictEqual(res.widx, st.widgets.length);
  assert.ok(st.widgets.length >= 10, 'демо должно содержать 10+ виджетов');
});

test('порядок виджетов при ОТКРЫТОЙ складке не ломается', () => {
  const st = { focus: -1 };
  md.refreshSource(md.DEMO, st);
  for (const w of st.widgets) {
    if (w.node.widget === 'fold') { w.open = true; break; }
  }
  const res = md.renderANSI(st.ast, st, 80);
  assert.strictEqual(res.widx, st.widgets.length);
  const foldLine = res.lines.find((l) => l.includes('Подробнее'));
  assert.ok(foldLine);
});

test('таблица рендерится с рамкой из box-графики', () => {
  const st = { focus: -1, widgets: [], widx: 0 };
  md.refreshSource('| Урок | Готово |\n| --- | --- |\n| Математика | да |\n', st);
  const res = md.renderANSI(st.ast, st, 60);
  const joined = res.lines.join('\n');
  assert.ok(joined.includes('Математика'));
  assert.ok(joined.includes('\u2502'));
});

test('цитата рекурсивно рендерит markdown внутри', () => {
  const st = { focus: -1, widgets: [], widx: 0 };
  md.refreshSource('> Ты читаешь **цитату**.\n', st);
  const res = md.renderANSI(st.ast, st, 60);
  assert.ok(res.lines.join('\n').includes('цитату'));
});

test('модалка без закрывающего ::: не заглатывает документ', () => {
  const html = md.buildBodyHTML(md.DEMO);
  const start = html.indexOf('mdui-modal-box');
  const end = html.indexOf('</div></div>', start);
  const box = html.slice(start, end);
  assert.ok(!box.includes('Таблица'), 'тело модалки должно быть пустым');
});

test('ASCII-режим не содержит box-графику', () => {
  md.setAscii(true);
  const st = { focus: -1, widgets: [], widx: 0 };
  md.refreshSource('::: bar 50\n', st);
  const res = md.renderANSI(st.ast, st, 40);
  assert.ok(!res.lines.join('\n').includes('\u2593'), 'нет штриховки');
  md.setAscii(false);
});

test('опции tabs через renderANSI не меняют порядок widx', () => {
  const st = { focus: 0, widgets: [], widx: 0 };
  md.refreshSource('::: tabs Игра / Музыка / Книги\n', st);
  const res = md.renderANSI(st.ast, st, 50);
  assert.strictEqual(res.widx, 1);
  assert.ok(res.lines.join('\n').includes('Игра'));
});

test('var: блок состояния не рендерится и не попадает в фокус', () => {
  const st = { focus: -1 };
  md.refreshSource('::: var score 7\n', st);
  assert.strictEqual(st.vars.score, 7);
  assert.strictEqual(md.collectWidgets(st.ast).length, 0);
  const res = md.renderANSI(st.ast, st, 40);
  assert.strictEqual(res.widx, 0);
});

test('{@score} — инлайн-ссылка на переменную', () => {
  const ast = md.parseBlocks('Счёт: {@score} очков\n');
  const ref = ast[0].inline.find((t) => t.t === 'ref');
  assert.ok(ref);
  assert.strictEqual(ref.v, 'score');
});

test('ref и bar@ref резолвятся из переменных в renderANSI', () => {
  const st = { focus: -1 };
  md.refreshSource('::: var score 42\n::: bar @score big\nСчёт: {@score}\n', st);
  const res = md.renderANSI(st.ast, st, 60);
  const joined = res.lines.join('\n');
  assert.ok(joined.includes('42%'));
  assert.ok(!joined.includes('@score'));
});

test('clock рендерит время из live.now', () => {
  const st = { focus: -1, live: { now: new Date(2026, 0, 1, 12, 5, 9).getTime() } };
  md.refreshSource('::: clock\n', st);
  const res = md.renderANSI(st.ast, st, 40);
  assert.ok(res.lines.join('\n').includes('12:05:09'));
});

test('counter показывает значение из vars', () => {
  const st = { focus: -1 };
  md.refreshSource('::: var score 3\n::: counter score\n', st);
  const res = md.renderANSI(st.ast, st, 40);
  assert.ok(res.lines.join('\n').includes('score = 3'));
});

test('buildPreviewDoc отдаёт состояние для живого предпросмотра', () => {
  const doc = md.buildPreviewDoc('::: var score 7\n');
  assert.ok(doc.includes('window.__MDUI'));
  assert.ok(doc.includes('"score":7'));
});

test('frontmatter убирается из парса, номера строк сохраняются', () => {
  const src = '---\ntitle: Тест\nlang: ru\n---\n# Заголовок\n';
  const ast = md.parseBlocks(src);
  assert.strictEqual(ast.length, 1);
  assert.strictEqual(ast[0].type, 'heading');
  assert.strictEqual(ast[0].line, 4);
});

test('parseFrontmatter отдаёт мету и тело', () => {
  const r = md.parseFrontmatter('---\ntitle: Страница\ndescription: оп\n---\nконтент\n');
  assert.strictEqual(r.meta.title, 'Страница');
  assert.strictEqual(r.meta.description, 'оп');
  assert.ok(r.body.includes('контент'));
});

test('section и card собирают тело и рендерятся в HTML', () => {
  const ast = md.parseBlocks('::: section Тема\nТекст тела.\n:::\n');
  assert.strictEqual(ast[0].widget, 'section');
  assert.strictEqual(ast[0].body, 'Текст тела.');
  const html = md.buildBodyHTML('::: card Название\nВнутри.\n:::\n');
  assert.ok(html.includes('mdui-card'));
  assert.ok(html.includes('mdui-card-title'));
  assert.ok(html.includes('Название'));
});

test('grid хранит число колонок и рендерит --cols', () => {
  const w = md.parseBlocks('::: grid 2\n:::\n')[0];
  assert.strictEqual(w.widget, 'grid');
  assert.strictEqual(w.value, 2);
  const html = md.buildBodyHTML('::: grid 2\nОдна.\n\nДве.\n:::\n');
  assert.ok(html.includes('--cols:2'));
});

test('cols делит тело по --- на две части', () => {
  const w = md.parseBlocks('::: cols\nСлева.\n\n---\n\nСправа.\n:::\n')[0];
  assert.strictEqual(w.widget, 'cols');
  assert.ok(w.parts[0].includes('Слева'));
  assert.ok(w.parts[1].includes('Справа'));
});

test('инлайн-картинка ![alt](src)', () => {
  const img = md.parseBlocks('Лого: ![MD](logo.png)\n')[0].inline.find((t) => t.t === 'img');
  assert.ok(img);
  assert.strictEqual(img.alt, 'MD');
  assert.strictEqual(img.src, 'logo.png');
  const html = md.buildBodyHTML('Лого: ![MD](logo.png)\n');
  assert.ok(html.includes('<img'));
  assert.ok(html.includes('logo.png'));
  assert.ok(html.includes('MD'));
});

test('блочная картинка ::: img src alt', () => {
  const html = md.buildBodyHTML('::: img logo.png Логотип\n');
  assert.ok(html.includes('logo.png'));
  assert.ok(html.includes('Логотип'));
  const st = { focus: -1 };
  md.refreshSource('::: img logo.png Логотип\n', st);
  const res = md.renderANSI(st.ast, st, 40);
  assert.ok(res.lines.join('\n').includes('изображение'));
});

test('внешняя ссылка открывается в новом окне, внутренняя — нет', () => {
  const html = md.buildBodyHTML('[Внеш](https://example.com) и [Стр](page.md)\n');
  assert.ok(html.includes('href="https://example.com" target="_blank"'));
  assert.ok(html.includes('<a href="page.md">'));
});

test('тема и css попадают в head документа', () => {
  const ex = md.pageExtras(md.parseBlocks('::: theme light\n'));
  assert.strictEqual(ex.theme, 'light');
  const doc = md.buildPreviewDoc('::: theme light\n\n::: css\nh1{color:red}\n:::\n\n# Заголовок\n');
  assert.ok(doc.includes('--bg:#ffffff'));
  assert.ok(doc.includes('h1{color:red}'));
});

test('include: веб-плейсхолдер и локальное разворачивание с защитой от циклов', () => {
  const html = md.buildBodyHTML('::: include parts/head.md\n');
  assert.ok(html.includes('mdui-include'));
  const fs = require('node:fs');
  const os = require('node:os');
  const path = require('node:path');
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'mdui-include-'));
  try {
    fs.writeFileSync(path.join(dir, 'part.md'), 'Часть. {Кнопка}');
    const out = md.expandIncludes('::: include part.md\n', dir);
    assert.ok(out.includes('Часть.'));
    assert.ok(out.includes('{Кнопка}'));
    fs.writeFileSync(path.join(dir, 'c.md'), '::: include c.md\n');
    const cyc = md.expandIncludes('::: include c.md\n', dir);
    assert.ok(cyc.includes('Циклическое'));
    fs.writeFileSync(path.join(dir, 'missing.md'), '');
    const miss = md.expandIncludes('::: include net.md\n', dir);
    assert.ok(miss.includes('не найден'));
  } finally {
    fs.rmSync(dir, { recursive: true, force: true });
  }
});

test('порядок виджетов не ломается с новыми блоками', () => {
  const st = { focus: -1 };
  md.refreshSource('::: section Тема\n::: button Один green\n:::\n::: grid 2\n::: button Два\n:::\n', st);
  assert.strictEqual(st.widgets.length, 4);
  const res = md.renderANSI(st.ast, st, 60);
  assert.strictEqual(res.widx, st.widgets.length);
});

test('TUI: новые блоки рендерятся без сбоев', () => {
  const st = { focus: -1 };
  md.refreshSource('::: card Карта\n::: button Внутри\n:::\n::: img pic.png Фото\n', st);
  const res = md.renderANSI(st.ast, st, 60);
  const joined = res.lines.join('\n');
  assert.ok(joined.includes('Карта'));
  assert.ok(joined.includes('изображение'));
});

test('theme/css/include не попадают в фокус-цикл виджетов', () => {
  const st = { focus: -1 };
  md.refreshSource('::: var s 1\n::: theme light\n::: css\nx{}\n:::\n::: include a.md\n', st);
  assert.strictEqual(st.widgets.length, 0);
  const res = md.renderANSI(st.ast, st, 40);
  assert.strictEqual(res.widx, 0);
});

test('модалка не заглатывает документ без закрывающего :::', () => {
  const ast = md.parseBlocks('::: modal Точно?\nТекст внутри.\n\nА ещё параграф, и закрытия нет.\n');
  const w = ast.find((b) => b.type === 'widget' && b.widget === 'modal');
  assert.strictEqual(w.body, undefined);
  assert.strictEqual(ast.length, 3);
});