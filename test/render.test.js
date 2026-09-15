'use strict';

const test = require('node:test');
const assert = require('node:assert');
const md = require('../md-ui.js');

test('API: версия и публичные функции', () => {
  assert.strictEqual(md.VERSION, 'v0.0.2');
  for (const fn of ['parseBlocks', 'parseInline', 'buildPreviewDoc', 'buildBodyHTML', 'renderANSI', 'collectWidgets', 'defaultStates']) {
    assert.strictEqual(typeof md[fn], 'function', fn);
  }
});

test('кнопка с цветом и её label', () => {
  const ast = md.parseBlocks('::: кнопка Запустить зелёная\n');
  const w = ast[0];
  assert.strictEqual(w.type, 'widget');
  assert.strictEqual(w.widget, 'button');
  assert.strictEqual(w.label, 'Запустить');
  assert.strictEqual(w.style, 'green');
});

test('складка собирает тело (регрессия v0.0.2)', () => {
  const ast = md.parseBlocks('::: показать Подробнее\nВнутри **{Кнопка}**.\n:::\n');
  const w = ast[0];
  assert.strictEqual(w.widget, 'fold');
  assert.strictEqual(w.body, 'Внутри **{Кнопка}**.');
});

test('прогресс читает число из заголовка', () => {
  const ast = md.parseBlocks('::: бар 70 большая\n');
  assert.strictEqual(ast[0].widget, 'progress');
  assert.strictEqual(ast[0].value, 70);
  assert.strictEqual(ast[0].style, 'big');
});

test('вкладки / выбор / дерево разбивают options по разделителю', () => {
  for (const line of ['::: вкладки Игра / Музыка / Книги', '::: выбор красный / зелёный / синий', '::: дерево Игрушки / Гоночки / Машинки']) {
    const w = md.parseBlocks(line + '\n')[0];
    assert.strictEqual(w.labels.length, 3, line);
  }
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
  md.refreshSource('::: бар 50\n', st);
  const res = md.renderANSI(st.ast, st, 40);
  assert.ok(!res.lines.join('\n').includes('\u2593'), 'нет штриховки');
  md.setAscii(false);
});

test('опции tabs через renderANSI не меняют порядок widx', () => {
  const st = { focus: 0, widgets: [], widx: 0 };
  md.refreshSource('::: вкладки Игра / Музыка / Книги\n', st);
  const res = md.renderANSI(st.ast, st, 50);
  assert.strictEqual(res.widx, 1);
  assert.ok(res.lines.join('\n').includes('Игра'));
});