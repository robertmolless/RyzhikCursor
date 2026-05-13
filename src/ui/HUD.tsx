import { useEffect, useState } from 'react';
import { useGameStore, getTimeOfDay } from '@/store/useGameStore';
import { QUEST_BY_ID } from '@/data/quests';
import { CASSETTE_BY_ID } from '@/data/cassettes';

function fmtTime(min: number) {
  const h = Math.floor(min / 60) % 24;
  const m = Math.floor(min) % 60;
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
}

const weatherIcon: Record<string, string> = {
  clear: '☀',
  cloudy: '☁',
  rain: '☂',
  storm: '⚡',
  fog: '☼',
};

const todIcon: Record<string, string> = {
  morning: '🌅',
  day: '☀',
  goldenHour: '🌇',
  dusk: '🌆',
  night: '🌙',
};

export function HUD() {
  const time = useGameStore((s) => s.timeMinutes);
  const days = useGameStore((s) => s.daysPassed);
  const weather = useGameStore((s) => s.weather);
  const scale = useGameStore((s) => s.timeScale);
  const setScale = useGameStore((s) => s.setTimeScale);
  const quests = useGameStore((s) => s.quests);
  const friendships = useGameStore((s) => s.friendships);
  const setView = useGameStore((s) => s.setView);
  const currentCassette = useGameStore((s) => s.currentCassette);
  const tod = getTimeOfDay(time);

  const activeQuests = quests
    .filter((q) => q.status === 'active')
    .map((q) => {
      const def = QUEST_BY_ID[q.id];
      const step =
        q.status === 'active' && def && q.stepIndex < def.steps.length
          ? def.steps[q.stepIndex]
          : null;
      return { id: q.id, title: def?.title ?? q.id, step: step?.text ?? '' };
    });

  return (
    <div className="absolute inset-0 pointer-events-none z-30 text-dusk-100 select-none">
      {/* Top bar */}
      <div className="absolute top-3 left-3 glass-soft px-3 py-2 flex items-center gap-3 pointer-events-auto">
        <span className="text-lg">{todIcon[tod]}</span>
        <span className="font-medium tabular-nums text-sm">{fmtTime(time)}</span>
        <span className="text-[11px] text-dusk-100/60">День {days + 1}</span>
        <span className="text-base">{weatherIcon[weather]}</span>
        <div className="ml-1 flex items-center gap-1">
          <button
            className="btn-ghost px-2 py-0.5 text-xs"
            title="Замедлить время"
            onClick={() => setScale(Math.max(15, scale - 30))}
          >
            «
          </button>
          <span className="text-[10px] text-dusk-100/55">x{Math.round(scale / 60)}</span>
          <button
            className="btn-ghost px-2 py-0.5 text-xs"
            title="Ускорить время"
            onClick={() => setScale(Math.min(360, scale + 30))}
          >
            »
          </button>
        </div>
      </div>

      {/* Quest tracker */}
      <div className="absolute top-3 right-3 w-[300px] glass-soft p-3 pointer-events-auto">
        <div className="text-[10px] uppercase tracking-widest text-ember-300/80 mb-1">
          Журнал
        </div>
        {activeQuests.length === 0 ? (
          <div className="text-xs text-dusk-100/55">
            Иди и просто погуляй — этот двор любит, когда его слушают.
          </div>
        ) : (
          <ul className="space-y-1.5">
            {activeQuests.slice(0, 3).map((q) => (
              <li key={q.id} className="text-xs leading-snug">
                <div className="text-dusk-50 font-medium">{q.title}</div>
                <div className="text-dusk-100/70">→ {q.step}</div>
              </li>
            ))}
          </ul>
        )}
        <div className="mt-2 flex flex-wrap gap-1">
          {Object.entries(friendships)
            .sort((a, b) => b[1] - a[1])
            .slice(0, 4)
            .map(([id, v]) => (
              <span key={id} className="pill">
                {id} ♥ {Math.round(v)}
              </span>
            ))}
        </div>
      </div>

      {/* Cassette indicator */}
      {currentCassette && (
        <div className="absolute top-3 left-1/2 -translate-x-1/2 glass-soft px-3 py-1.5 flex items-center gap-2 pointer-events-auto animate-fade-in">
          <span className="text-ember-300 text-sm animate-pulse-soft">♫</span>
          <span className="text-xs">
            Сейчас играет:{' '}
            <span className="text-dusk-50 font-medium">
              {CASSETTE_BY_ID[currentCassette]?.title ?? currentCassette}
            </span>
          </span>
        </div>
      )}

      {/* Bottom menu buttons */}
      <div className="absolute bottom-3 left-1/2 -translate-x-1/2 flex gap-2 pointer-events-auto">
        <button className="btn-cozy text-xs px-3 py-1.5" onClick={() => setView('journal')}>
          📖 Журнал
        </button>
        <button className="btn-cozy text-xs px-3 py-1.5" onClick={() => setView('cassettes')}>
          🎞 Кассеты
        </button>
        <button className="btn-cozy text-xs px-3 py-1.5" onClick={() => setView('photo')}>
          📷 Фото
        </button>
        <button className="btn-cozy text-xs px-3 py-1.5" onClick={() => setView('paused')}>
          ⏸ Пауза
        </button>
      </div>
    </div>
  );
}
