import { useEffect, useState } from 'react';
import { useGameStore } from '@/store/useGameStore';

export function Dialog() {
  const queue = useGameStore((s) => s.ui.dialogQueue);
  const idx = useGameStore((s) => s.ui.dialogIndex);
  const advance = useGameStore((s) => s.advanceDialog);
  const current = queue[idx];
  const [typed, setTyped] = useState('');

  useEffect(() => {
    if (!current) {
      setTyped('');
      return;
    }
    setTyped('');
    const text = current.text;
    let i = 0;
    const t = window.setInterval(() => {
      i += 1;
      setTyped(text.slice(0, i));
      if (i >= text.length) window.clearInterval(t);
    }, 22);
    return () => window.clearInterval(t);
  }, [current?.text, idx]);

  if (!current) return null;
  const full = typed.length >= current.text.length;

  return (
    <div className="absolute inset-x-0 bottom-16 px-4 z-40 pointer-events-auto animate-fade-up">
      <div className="mx-auto w-[min(720px,94vw)] glass p-4">
        <div className="text-[11px] uppercase tracking-[0.28em] text-ember-300/85">
          {current.speaker}
        </div>
        <div className="mt-1 text-base text-dusk-50 leading-relaxed min-h-[64px]">
          {full ? current.text : typed}
          {!full && <span className="opacity-50 animate-pulse-soft">▍</span>}
        </div>
        <div className="mt-3 flex justify-between items-center">
          <span className="text-[11px] text-dusk-100/55">
            {idx + 1} / {queue.length}
          </span>
          <button
            className="btn-cozy text-xs"
            onClick={() => (full ? advance() : setTyped(current.text))}
          >
            {full ? (idx + 1 < queue.length ? 'Дальше →' : 'Закрыть') : 'Пропустить'}
          </button>
        </div>
      </div>
    </div>
  );
}
