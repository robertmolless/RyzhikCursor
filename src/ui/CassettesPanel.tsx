import { useGameStore } from '@/store/useGameStore';
import { CASSETTES, CASSETTE_BY_ID } from '@/data/cassettes';

export function CassettesPanel() {
  const view = useGameStore((s) => s.ui.view);
  const setView = useGameStore((s) => s.setView);
  const owned = useGameStore((s) => s.cassettes);
  const current = useGameStore((s) => s.currentCassette);
  const setCurrent = useGameStore((s) => s.setCurrentCassette);
  if (view !== 'cassettes') return null;

  return (
    <div className="absolute inset-0 z-40 flex items-center justify-center animate-fade-in pointer-events-auto">
      <div className="absolute inset-0 bg-black/55" onClick={() => setView('playing')} />
      <div className="relative glass w-[min(720px,94vw)] max-h-[86vh] p-6 overflow-hidden">
        <div className="flex items-center justify-between">
          <h2 className="font-title text-3xl text-dusk-50 title-glow">Коллекция кассет</h2>
          <button className="btn-ghost text-sm" onClick={() => setView('playing')}>
            закрыть ✕
          </button>
        </div>
        <p className="text-xs text-dusk-100/60 mt-1">
          {owned.length} из {CASSETTES.length} плёнок. Каждая хранит воспоминание.
        </p>

        <ul className="mt-5 grid sm:grid-cols-2 gap-3 max-h-[64vh] overflow-y-auto scroll-soft pr-2">
          {CASSETTES.map((c) => {
            const have = owned.includes(c.id);
            const playing = current === c.id;
            return (
              <li
                key={c.id}
                className={`glass-soft p-3 ${have ? '' : 'opacity-55 grayscale'}`}
              >
                <div className="flex items-center justify-between">
                  <div>
                    <div className="font-semibold text-dusk-50">
                      {have ? c.title : '???'}
                    </div>
                    <div className="text-[11px] text-dusk-100/60">
                      {have ? c.author : '...'}{' '}
                      <span className="ml-1 text-ember-300/80">[{c.mood}]</span>
                    </div>
                  </div>
                  {have && (
                    <button
                      className="btn-cozy text-xs px-2.5 py-1"
                      onClick={() =>
                        setCurrent(playing ? null : c.id) /* AudioEngine reacts elsewhere */
                      }
                    >
                      {playing ? '■ стоп' : '▶ играть'}
                    </button>
                  )}
                </div>
                <p className="text-[12px] text-dusk-100/70 mt-2 italic leading-relaxed">
                  {have ? c.memory : c.unlockHint}
                </p>
              </li>
            );
          })}
        </ul>
      </div>
    </div>
  );
}
