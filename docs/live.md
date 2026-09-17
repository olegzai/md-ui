---
title: Живые данные
---
::: nav
::: include _parts/nav.md
:::

# Живые данные

::: var score 7

Очки: {@score}

::: counter score

::: clock

::: bar @score big

::: note
Любой счётчик мгновенно обновляет `{@score}` и полосу — и в вебе, и в терминале.
:::

## Данные из файла

`::: source` подключает JSON, `::: data` рисует таблицу, `::: chart` — диаграмму:

::: source cities _data/cities.json

::: data cities

::: chart cities

## Периодическое обновление

Блок `::: every 3s` перечитывает источники каждые 3 секунды (в браузере):

::: every 3s
::: clock
:::

[К виджетам](widgets.md)
