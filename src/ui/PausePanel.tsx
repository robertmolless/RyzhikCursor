import { useGameStore } from '@/store/useGameStore';

export function PausePanel() {
  const view = useGameStore((s) => s.ui.view);
  const setView = useGameStore((s) => s.setView);
  const save = useGameStore((s) => s.save);
  const showToast = useGameStore((s) => s.showToast);
  if (view !== 'paused') return null;
  return (
    <div className="absolute inset-0 z-50 flex items-center justify-center animate-fade-in pointer-events-auto">
      <div className="absolute inset-0 bg-black/65 backdrop-blur-sm" />
      <div className="relative glass p-6 w-[min(420px,92vw)] text-center">
        <h2 className="font-title text-3xl text-dusk-50 title-glow">Пауза</h2>
        <p className="text-xs text-dusk-100/65 mt-1">Лето подождёт.</p>
        <div className="mt-5 flex flex-col gap-2">
          <button className="btn-cozy" onClick={() => setView('playing')}>
            ▶ Продолжить
          </button>
          <button
            className="btn-cozy"
            onClick={() => {
              save();
              showToast('Сохранено');
            }}
          >
            ⌂ Сохранить
          </button>
          <button className="btn-cozy" onClick={() => setView('journal')}>
            📖 Журнал
          </button>
          <button className="btn-cozy" onClick={() => setView('cassettes')}>
            🎞 Кассеты
          </button>
          <button
            className="btn-ghost text-xs"
            onClick={() => {
              save();
              setView('menu');
            }}
          >
            ← В главное меню
          </button>
        </div>
      </div>
    </div>
  );
}
