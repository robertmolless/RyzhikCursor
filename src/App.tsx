import { useEffect, useMemo, useRef } from 'react';
import { collectibles, locations, npcs, quests, upgrades } from './game/content';
import { formatGameTime, useGameStore } from './store/gameStore';
import { telegramBridge } from './telegram/telegramBridge';

const phaseLabel = {
  morning: 'утро',
  day: 'день',
  goldenHour: 'золотой закат',
  blueEvening: 'синий вечер',
  night: 'ночь',
};

const weatherLabel = {
  sun: 'солнце',
  rain: 'дождь',
  storm: 'гроза',
  fog: 'туман',
  wind: 'ветер',
  cloudy: 'облачно',
};

const seasonLabel = {
  summer: 'лето',
  autumn: 'осень',
  winter: 'зима',
  spring: 'весна',
};

function App() {
  const gameRef = useRef<HTMLDivElement | null>(null);
  const phaserRef = useRef<import('phaser').Game | null>(null);
  const state = useGameStore();

  useEffect(() => {
    telegramBridge.init();
    if (!gameRef.current || phaserRef.current) return;
    let disposed = false;
    void import('./game/createGame').then(({ createGame }) => {
      if (!gameRef.current || disposed) return;
      phaserRef.current = createGame(gameRef.current);
    });
    return () => {
      disposed = true;
      phaserRef.current?.destroy(true);
      phaserRef.current = null;
    };
  }, []);

  const activeQuest = quests.find((quest) => quest.id === state.activeQuestId) ?? quests[0];
  const activeObjectives = state.questObjectives[state.activeQuestId] ?? [];
  const activeLocation = locations.find((location) => location.id === state.location) ?? locations[0];
  const collectedItems = useMemo(
    () => state.collection.map((id) => collectibles.find((item) => item.id === id)).filter(Boolean),
    [state.collection],
  );

  return (
    <main className={`app-shell ${state.photoMode ? 'photo-mode' : ''}`}>
      <div ref={gameRef} className="game-canvas" />
      <div className="film-grain" />
      <section className="top-hud">
        <div className="brand-card">
          <span className="eyebrow">cozy narrative life-sim</span>
          <h1>Рыжик и Старый Загородный Дом</h1>
          <p>{activeLocation.mood}</p>
        </div>
        <div className="atmosphere-card">
          <span>{formatGameTime(state.minuteOfDay)}</span>
          <strong>{phaseLabel[state.dayPhase]}</strong>
          <small>
            {weatherLabel[state.weather]} · {seasonLabel[state.season]} · день {state.day}
          </small>
        </div>
      </section>

      <section className="side-panel">
        <nav className="tabs" aria-label="Игровые панели">
          {[
            ['journal', 'Журнал'],
            ['map', 'Карта'],
            ['collection', 'Коллекции'],
            ['friends', 'Друзья'],
            ['settings', 'Опции'],
          ].map(([id, label]) => (
            <button key={id} className={state.selectedPanel === id ? 'active' : ''} onClick={() => state.setPanel(id as never)}>
              {label}
            </button>
          ))}
        </nav>
        {state.selectedPanel === 'journal' && (
          <div className="panel-body">
            <span className="eyebrow">активная история</span>
            <h2>{activeQuest.title}</h2>
            <p>{activeQuest.summary}</p>
            <ul className="objectives">
              {activeObjectives.map((objective) => (
                <li key={objective.id} className={objective.done ? 'done' : ''}>
                  {objective.done ? '✓' : '·'} {objective.text}
                </li>
              ))}
            </ul>
            <p className="reward">Награда: {activeQuest.reward}</p>
          </div>
        )}
        {state.selectedPanel === 'map' && (
          <div className="panel-body">
            <span className="eyebrow">живой мир</span>
            <h2>{activeLocation.title}</h2>
            <p>{activeLocation.subtitle}</p>
            <div className="map-grid">
              {locations.map((location) => (
                <article key={location.id} className={location.id === state.location ? 'map-node current' : 'map-node'}>
                  <strong>{location.title}</strong>
                  <small>{location.unlockHint ?? location.mood}</small>
                </article>
              ))}
            </div>
          </div>
        )}
        {state.selectedPanel === 'collection' && (
          <div className="panel-body">
            <span className="eyebrow">кассеты, фото, записки</span>
            <h2>{state.collection.length}/{collectibles.length} найдено</h2>
            <div className="collection-list">
              {collectibles.map((item) => {
                const owned = state.collection.includes(item.id);
                return (
                  <article key={item.id} className={owned ? 'owned' : ''}>
                    <strong>{owned ? item.title : '???'}</strong>
                    <small>{owned ? item.description : `${item.kind} · ${locations.find((loc) => loc.id === item.location)?.title}`}</small>
                  </article>
                );
              })}
            </div>
            {collectedItems.length > 0 && <p className="reward">Последняя находка: {collectedItems[collectedItems.length - 1]?.title}</p>}
          </div>
        )}
        {state.selectedPanel === 'friends' && (
          <div className="panel-body">
            <span className="eyebrow">дружба и расписания</span>
            <h2>Люди, которые ждут Рыжика</h2>
            <div className="friend-list">
              {npcs.map((npc) => (
                <article key={npc.id}>
                  <div>
                    <strong>{npc.name}</strong>
                    <small>{npc.role}</small>
                  </div>
                  <meter min={0} max={10} value={state.friendship[npc.id]} />
                </article>
              ))}
            </div>
          </div>
        )}
        {state.selectedPanel === 'settings' && (
          <div className="panel-body">
            <span className="eyebrow">настройки и future Telegram port</span>
            <h2>Уют без паузы</h2>
            <button onClick={state.togglePhotoMode}>{state.photoMode ? 'Выключить фоторежим' : 'Включить фоторежим'}</button>
            <button onClick={state.toggleMusic}>{state.musicEnabled ? 'Музыка включена' : 'Музыка выключена'}</button>
            <button onClick={state.toggleAmbience}>{state.ambienceEnabled ? 'Амбиент включен' : 'Амбиент выключен'}</button>
            <button onClick={state.sleepUntilMorning}>Спать до утра</button>
            <p>
              Архитектура готова под ежедневные события, social/idling сценарии и сохранения через Supabase для Telegram Mini Apps.
            </p>
          </div>
        )}
      </section>

      <section className="bottom-hud">
        <article>
          <span>Рыжик</span>
          <strong>{catIntentLabel(state.catIntent)}</strong>
        </article>
        <article>
          <span>Уют дома</span>
          <strong>{state.coziness}%</strong>
        </article>
        <article>
          <span>Светлячки</span>
          <strong>{state.fireflies}</strong>
        </article>
        <article>
          <span>Улучшения</span>
          <strong>{state.upgrades.length}/{upgrades.length}</strong>
        </article>
      </section>

      <section className="dialogue-log" aria-live="polite">
        {state.dialogueLog.slice(-4).map((entry, index) => (
          <p key={`${entry.speaker}-${index}`}>
            <strong>{entry.speaker}:</strong> {entry.text}
          </p>
        ))}
      </section>

      <div className="control-help">
        WASD/стрелки — ходить · Shift — бег · E/Space — взаимодействие · P — мурлыкать · F — фоторежим · 1/2/3 — погода
      </div>
    </main>
  );
}

function catIntentLabel(intent: string) {
  const labels: Record<string, string> = {
    wander: 'сам гуляет',
    followWarmth: 'ищет тепло',
    reactToMusic: 'слушает музыку',
    hideFromStorm: 'прячется от грозы',
    nap: 'дремлет',
    play: 'играет с вещами',
    sitWithFriends: 'сидит рядом',
    huntFireflies: 'ловит светлячков',
  };
  return labels[intent] ?? 'исследует';
}

export default App;
