import { useEffect, useState } from 'react';
import { useGameStore } from '@/store/useGameStore';

export function Toast() {
  const toast = useGameStore((s) => s.ui.toast);
  const until = useGameStore((s) => s.ui.toastUntil);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (!toast) {
      setVisible(false);
      return;
    }
    setVisible(true);
    const ms = Math.max(800, until - Date.now());
    const t = window.setTimeout(() => setVisible(false), ms);
    return () => window.clearTimeout(t);
  }, [toast, until]);

  if (!toast) return null;
  return (
    <div
      className={`absolute bottom-24 left-1/2 -translate-x-1/2 z-40 transition-all duration-300 ${
        visible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-2 pointer-events-none'
      }`}
    >
      <div className="glass px-4 py-2 text-sm text-dusk-50 shadow-lg">{toast}</div>
    </div>
  );
}
