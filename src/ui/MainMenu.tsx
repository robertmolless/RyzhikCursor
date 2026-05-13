import { useEffect, useState } from 'react';
import { useGameStore, loadFromStorage, clearStorage } from '@/store/useGameStore';

export function MainMenu() {
  const startNewGame = useGameStore((s) => s.startNewGame);
  const load = useGameStore((s) => s.load);
  const setView = useGameStore((s) => s.setView);
  const [hasSave, setHasSave] = useState(false);

  useEffect(() => {
    setHasSave(!!loadFromStorage());
  }, []);

  return (
    <div className="absolute inset-0 flex items-center justify-center z-50 animate-fade-in">
      {/* Backdrop: soft sunset gradient + grain */}
      <div className="absolute inset-0 bg-gradient-to-b from-dusk-700 via-dusk-600 to-night-700" />
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_70%_30%,rgba(255,180,90,0.35),transparent_55%)]" />
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_30%_70%,rgba(120,80,40,0.5),transparent_60%)]" />
      <div className="film-grain" />
      <div className="absolute inset-0 scanline-vignette" />

      <div className="relative z-10 w-[min(560px,92vw)] glass p-8 text-center animate-fade-up">
        <p className="font-cozy text-sm uppercase tracking-[0.32em] text-ember-300/80">
          atmospheric cozy life-sim
        </p>
        <h1 className="font-title text-5xl sm:text-6xl text-dusk-50 title-glow mt-2">
          Рыжик
        </h1>
        <p className="font-title text-2xl text-dusk-100/85 -mt-1">
          и Старый Загородный Дом
        </p>
        <p className="mt-4 text-sm text-dusk-100/75 leading-relaxed">
          Тёплый летний вечер. Ветер качает гирлянды над верандой.
          Где-то далеко играет гитара, а Рыжик зевает у крыльца.
          Никаких боссов. Никакого фарма. Только дом, в который ты возвращаешься.
        </p>

        <div className="mt-6 flex flex-col gap-3 items-stretch">
          <button
            className="btn-cozy text-base"
            onClick={() => {
              startNewGame();
              setView('playing');
            }}
          >
            ✦ Начать историю
          </button>
          {hasSave && (
            <button
              className="btn-cozy text-base bg-dusk-700/40"
              onClick={() => {
                const data = loadFromStorage();
                if (data) {
                  load(data);
                  setView('playing');
                }
              }}
            >
              ↻ Продолжить
            </button>
          )}
          {hasSave && (
            <button
              className="btn-ghost text-xs"
              onClick={() => {
                clearStorage();
                setHasSave(false);
              }}
            >
              Стереть сохранение
            </button>
          )}
        </div>

        <p className="mt-6 text-[11px] text-dusk-100/55 leading-relaxed">
          Управление: <span className="pill">WASD</span> / <span className="pill">стрелки</span> — движение,{' '}
          <span className="pill">Shift</span> — бег,{' '}
          <span className="pill">E</span> / <span className="pill">пробел</span> — взаимодействие,{' '}
          <span className="pill">J</span> — журнал,{' '}
          <span className="pill">M</span> — кассеты,{' '}
          <span className="pill">P</span> — фотокамера,{' '}
          <span className="pill">Esc</span> — пауза
        </p>
      </div>
    </div>
  );
}
