# Рыжик и Старый Загородный Дом

Атмосферная browser indie cozy life-sim игра про доброго рыжего кота Рыжика, старый загородный дом, летние воспоминания, кассеты, светлячков и людей, которые постепенно возвращают дому жизнь.

## Что уже playable

- Procedural hand-painted 2.5D мир на PixiJS: дом, двор, лес, пруд и закрытая теплица.
- React + TypeScript + Vite shell с glassmorphism UI.
- Zustand game state: время суток, погода, сезоны, квесты, дружба, коллекции, прогресс двора.
- Howler/WebAudio audio director: адаптивные ambient-слои, мурчание, chime/collect SFX.
- Живые NPC со schedule, реакцией на дождь/грозу/ночь и уникальными диалогами.
- Управляемый Рыжик: ходьба, бег, мурчание, сон/потягивание/игра/реакции через state machine.
- Интерактивные предметы, кассеты, записи Нэны, фото, светлячки, квестовые находки.
- Фоторежим: blur, grain, saturation, vignette и cinematic presets.
- Local save adapter, Firebase-ready конфиг, Telegram Mini Apps bridge.
- GitHub Pages workflow.

## Управление

- `WASD` / стрелки: ходить
- `Shift`: бежать
- `E` или `Space`: взаимодействовать
- `P`: мурчать
- `J`: журнал квестов
- `C`: коллекции
- `M`: карта
- `F`: фоторежим
- `R`: сменить погоду для тестирования
- `T`: сменить сезон для тестирования

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

Workflow находится в `.github/workflows/deploy.yml`.

Для Pages build используется:

```bash
GITHUB_PAGES=true npm run build
```

Vite автоматически выставляет `base: /RyzhikCursor/`.

## Firebase / future cloud save

Игра работает офлайн через `localStorage`. Для Firebase добавьте переменные из `.env.example` в `.env` или GitHub Actions secrets:

```bash
VITE_FIREBASE_API_KEY=
VITE_FIREBASE_AUTH_DOMAIN=
VITE_FIREBASE_PROJECT_ID=
VITE_FIREBASE_STORAGE_BUCKET=
VITE_FIREBASE_MESSAGING_SENDER_ID=
VITE_FIREBASE_APP_ID=
```

Cloud-save envelope уже вынесен в `src/lib/storage.ts`, Firebase init — в `src/lib/firebase.ts`.

## Telegram Mini Apps readiness

`src/lib/telegram.ts` изолирует Telegram WebApp API:

- `ready()`
- stable viewport height
- user id
- haptics

Game state уже подходит для будущих daily events, social yards, idle activities и friend visits.

## Архитектура

```text
src/
  components/      React HUD, Pixi host, panels
  content/         World/NPC/quest/object definitions
  engine/          PixiJS gameplay renderer and simulation
  lib/             Audio, Firebase, Telegram, storage adapters
  store/           Zustand game state and quest progression
  styles/          Tailwind v4 + custom indie UI styles
  types/           Shared domain types
```

Цель текущей реализации — полноценный polished vertical slice, который можно расширять контентом, ассетами, катсценами и сетевыми социальными системами без переписывания ядра.
