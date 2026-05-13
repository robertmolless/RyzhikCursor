# Рыжик и Старый Загородный Дом

Атмосферная browser indie/cozy narrative life-sim игра про рыжего кота Рыжика, старый загородный дом, друзей, кассеты, светлячков и лето, которое не заканчивается.

## Что уже реализовано

- React + TypeScript + Vite приложение.
- Phaser-сцена с процедурной 2.5D hand-painted картой: дом, двор, гараж, сарай, лес, пруд, крыша, подвал и теплица.
- Рыжик с управлением, бегом, мурчанием, idle AI и реакциями на музыку, грозу, светлячков и теплые места.
- Живые NPC с расписаниями, диалогами, дружбой и квестовыми репликами.
- Квесты: «Старая кассета», «Фото со светлячками», «Гроза», «Ночь на крыше», «Колокольчик луны», «Теплица».
- Полный цикл времени суток, сезоны, погода, дождь, гроза, туман, ветер, динамический свет и светлячки.
- Коллекции кассет, фотографий, записок, растений, игрушек и скрытых предметов.
- UI в стиле modern cozy indie: журнал, карта, коллекции, дружба, настройки, фоторежим.
- Howler.js аудио-директор с процедурными музыкальными и ambient слоями.
- Zustand save-state в localStorage.
- Supabase-ready persistence слой и Telegram Mini Apps bridge.
- GitHub Pages workflow.

## Управление

- `WASD` или стрелки — ходить.
- `Shift` — бежать.
- `E` / `Space` — взаимодействовать с NPC, предметами и квестовыми точками.
- `P` — мурлыкать и повышать дружбу рядом с NPC.
- `F` — фоторежим.
- `J`, `M`, `C` — журнал, карта, коллекции.
- `1`, `2`, `3` — быстро сменить погоду для тестирования: солнце, дождь, туман.

## Запуск локально

```bash
npm ci
npm run dev
```

Production build:

```bash
npm run build
npm run preview
```

## GitHub Pages

В репозитории есть workflow `.github/workflows/deploy.yml`. Для Pages:

1. В настройках репозитория включите GitHub Pages source: **GitHub Actions**.
2. Push в `main` запустит сборку `GITHUB_PAGES=true npm run build`.
3. Vite использует base `/RyzhikCursor/` для текущего имени репозитория.

Если репозиторий будет переименован, обновите `base` в `vite.config.ts`.

## Supabase и будущий Telegram Mini Apps port

Игра работает без backend. Для cloud save/social функций задайте:

```bash
VITE_SUPABASE_URL=
VITE_SUPABASE_ANON_KEY=
```

Подготовленные точки расширения:

- `src/services/supabaseClient.ts` — сохранения и будущие social/yard visits.
- `src/telegram/telegramBridge.ts` — Telegram WebApp init, player id, haptics.
- Zustand store уже содержит daily-friendly прогрессию, коллекции, дружбу, idle-поведение и состояние мира.

## Архитектура

```text
src/
  App.tsx                    React UI/HUD
  game/
    content.ts               NPC, квесты, локации, коллекции, улучшения
    createGame.ts            Phaser bootstrap
    scenes/RyzhikScene.ts    gameplay, world, AI, weather, quests
    types.ts                 общие типы
  store/gameStore.ts         Zustand save/progression
  audio/AudioDirector.ts     Howler procedural music/ambience
  services/supabaseClient.ts Supabase adapter
  telegram/telegramBridge.ts Telegram Mini Apps bridge
```
