import { useGameStore } from '@/store/useGameStore';
import { QUESTS, QUEST_BY_ID } from '@/data/quests';
import { NPC_BY_ID } from '@/data/npcs';

export function JournalPanel() {
  const view = useGameStore((s) => s.ui.view);
  const setView = useGameStore((s) => s.setView);
  const quests = useGameStore((s) => s.quests);
  const friendships = useGameStore((s) => s.friendships);
  if (view !== 'journal') return null;

  return (
    <div className="absolute inset-0 z-40 flex items-center justify-center animate-fade-in pointer-events-auto">
      <div className="absolute inset-0 bg-black/55" onClick={() => setView('playing')} />
      <div className="relative glass w-[min(880px,94vw)] max-h-[88vh] p-6 overflow-hidden">
        <div className="flex items-center justify-between">
          <h2 className="font-title text-3xl text-dusk-50 title-glow">Журнал</h2>
          <button className="btn-ghost text-sm" onClick={() => setView('playing')}>
            закрыть ✕
          </button>
        </div>
        <p className="text-xs text-dusk-100/60 mt-1">
          Записи Рыжика о людях, событиях и местах этого лета.
        </p>

        <div className="mt-5 grid md:grid-cols-2 gap-5 max-h-[68vh] overflow-y-auto scroll-soft pr-2">
          {/* Quests */}
          <div>
            <h3 className="font-title text-xl text-ember-300 mb-2">Квесты</h3>
            <ul className="space-y-3">
              {QUESTS.map((q) => {
                const st = quests.find((s) => s.id === q.id);
                const status = st?.status ?? 'locked';
                const stepIndex = st?.status === 'active' ? st.stepIndex : 0;
                return (
                  <li
                    key={q.id}
                    className={`glass-soft p-3 ${
                      status === 'completed' ? 'opacity-70' : ''
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <div className="font-semibold text-dusk-50">{q.title}</div>
                      <span className="pill text-[10px]">
                        {status === 'completed'
                          ? '✓ выполнен'
                          : status === 'active'
                          ? 'активен'
                          : status === 'offered'
                          ? 'предложен'
                          : 'недоступен'}
                      </span>
                    </div>
                    <div className="text-[12px] text-dusk-100/70 mt-1">
                      от {NPC_BY_ID[q.npcId]?.name ?? q.npcId}
                    </div>
                    {status !== 'completed' && (
                      <ol className="mt-2 space-y-0.5 text-xs">
                        {q.steps.map((s, i) => (
                          <li
                            key={s.id}
                            className={`${
                              i < stepIndex
                                ? 'text-moss-400 line-through'
                                : i === stepIndex
                                ? 'text-dusk-50'
                                : 'text-dusk-100/45'
                            }`}
                          >
                            • {s.text}
                          </li>
                        ))}
                      </ol>
                    )}
                    {status === 'active' && (
                      <div className="text-[11px] text-dusk-100/55 mt-1">
                        {q.steps[stepIndex]?.hint}
                      </div>
                    )}
                  </li>
                );
              })}
            </ul>
          </div>

          {/* Friends */}
          <div>
            <h3 className="font-title text-xl text-ember-300 mb-2">Соседи</h3>
            <ul className="space-y-2">
              {Object.values(NPC_BY_ID).map((n) => {
                const lvl = Math.round(friendships[n.id] ?? 0);
                return (
                  <li key={n.id} className="glass-soft p-3">
                    <div className="flex items-center justify-between">
                      <div className="font-semibold text-dusk-50">{n.name}</div>
                      <span className="pill">
                        ♥ {lvl}
                      </span>
                    </div>
                    <div className="text-[12px] text-dusk-100/65 mt-0.5">
                      {n.description}
                    </div>
                    <div className="text-[11px] text-dusk-100/45 mt-1">
                      {n.scheduleHint}
                    </div>
                  </li>
                );
              })}
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}
