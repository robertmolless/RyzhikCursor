import { useEffect, useState } from 'react';
import { useGameStore } from '@/store/useGameStore';

const FILTERS = [
  { id: 'none', name: 'оригинал', css: 'none' },
  { id: 'warm', name: 'тёплый', css: 'saturate(1.15) contrast(1.05) sepia(0.15)' },
  { id: 'noir', name: 'плёнка', css: 'grayscale(0.5) contrast(1.2) brightness(0.95)' },
  { id: 'dream', name: 'сон', css: 'blur(0.4px) brightness(1.08) saturate(1.3)' },
  { id: 'vhs', name: 'VHS', css: 'contrast(1.15) saturate(1.2) hue-rotate(-5deg)' },
];

export function PhotoMode() {
  const view = useGameStore((s) => s.ui.view);
  const setView = useGameStore((s) => s.setView);
  const photosTaken = useGameStore((s) => s.photosTaken);
  const [filter, setFilter] = useState(FILTERS[0]);
  const [vignette, setVignette] = useState(0.4);
  const [flash, setFlash] = useState(false);

  useEffect(() => {
    if (view !== 'photo') return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setView('playing');
      if (e.key === ' ' || e.key.toLowerCase() === 'p') takePhoto();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [view]);

  if (view !== 'photo') return null;

  const takePhoto = () => {
    setFlash(true);
    window.setTimeout(() => setFlash(false), 220);
    useGameStore.setState((s) => ({ photosTaken: s.photosTaken + 1 }));
    useGameStore.getState().showToast('Снимок сохранён в воспоминания');
  };

  return (
    <div className="absolute inset-0 z-40 pointer-events-auto" style={{ filter: filter.css }}>
      {/* Camera HUD overlay (does not capture clicks on the world for clarity) */}
      <div className="absolute inset-6 border-2 border-dusk-100/40 rounded-3xl pointer-events-none" />
      <div className="absolute inset-12 border border-dusk-100/15 rounded-2xl pointer-events-none" />
      {/* Vignette */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          boxShadow: `inset 0 0 ${200 * vignette}px ${100 * vignette}px rgba(0,0,0,${0.4 +
            vignette * 0.4})`,
        }}
      />
      {/* Film grain */}
      <div className="film-grain" />

      {/* Flash */}
      {flash && (
        <div className="absolute inset-0 bg-white animate-fade-in pointer-events-none" />
      )}

      {/* Photo HUD bottom */}
      <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex flex-col items-center gap-2">
        <div className="glass-soft px-3 py-2 flex gap-2 items-center text-xs">
          <span className="text-dusk-100/65">фильтр:</span>
          {FILTERS.map((f) => (
            <button
              key={f.id}
              className={`px-2 py-1 rounded-full ${
                f.id === filter.id ? 'bg-ember-500/40 text-dusk-50' : 'text-dusk-100/70'
              }`}
              onClick={() => setFilter(f)}
            >
              {f.name}
            </button>
          ))}
          <span className="text-dusk-100/65 ml-2">виньетка:</span>
          <input
            type="range"
            min="0"
            max="1"
            step="0.05"
            value={vignette}
            onChange={(e) => setVignette(parseFloat(e.target.value))}
          />
        </div>
        <div className="flex gap-2">
          <button className="btn-cozy" onClick={takePhoto}>
            ◯ снимок
          </button>
          <button className="btn-cozy" onClick={() => setView('playing')}>
            ✕ выйти
          </button>
        </div>
        <div className="text-[11px] text-dusk-100/55">
          📷 сделано снимков: {photosTaken}
        </div>
      </div>
    </div>
  );
}
