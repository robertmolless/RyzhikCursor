import { useEffect, useRef } from 'react';
import { PhaserGame } from './game/PhaserGame';
import { MainMenu } from './ui/MainMenu';
import { HUD } from './ui/HUD';
import { Dialog } from './ui/Dialog';
import { Toast } from './ui/Toast';
import { JournalPanel } from './ui/JournalPanel';
import { CassettesPanel } from './ui/CassettesPanel';
import { PausePanel } from './ui/PausePanel';
import { PhotoMode } from './ui/PhotoMode';
import { FinaleOverlay } from './ui/FinaleOverlay';
import { useGameStore, getTimeOfDay } from './store/useGameStore';

// Expose for debugging / e2e tests (no-op in release).
if (typeof window !== 'undefined') {
  (window as any).useGameStore = useGameStore;
}

export default function App() {
  const view = useGameStore((s) => s.ui.view);
  const setView = useGameStore((s) => s.setView);
  const save = useGameStore((s) => s.save);
  const lastSaveRef = useRef<number>(Date.now());

  // Global hotkeys
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement | null;
      if (target && (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA')) return;
      const s = useGameStore.getState();
      if (e.key === 'Escape') {
        if (s.ui.view === 'playing') setView('paused');
        else if (s.ui.view === 'paused') setView('playing');
        else if (s.ui.view === 'journal' || s.ui.view === 'cassettes' || s.ui.view === 'photo')
          setView('playing');
      }
      if (s.ui.view !== 'playing' && s.ui.view !== 'paused') return;
      if (e.key.toLowerCase() === 'j') setView('journal');
      if (e.key.toLowerCase() === 'm') setView('cassettes');
      if (e.key.toLowerCase() === 'p') setView('photo');
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [setView]);

  // Autosave every 30s while playing.
  useEffect(() => {
    const id = window.setInterval(() => {
      const s = useGameStore.getState();
      if (s.ui.view === 'playing' && Date.now() - lastSaveRef.current > 30000) {
        save();
        lastSaveRef.current = Date.now();
      }
    }, 3000);
    return () => window.clearInterval(id);
  }, [save]);

  // Telegram WebApp init (no-op outside Telegram)
  useEffect(() => {
    const tg = (window as any).Telegram?.WebApp;
    if (!tg) return;
    try {
      tg.ready();
      tg.expand?.();
      tg.MainButton?.hide?.();
    } catch {
      /* ignore */
    }
  }, []);

  // Sync audio engine to weather/time/cassette
  useEffect(() => {
    let unsub: (() => void) | undefined;
    const id = window.setInterval(() => {
      const scene = (window as any).__phaserGame?.scene?.getScene?.('Yard') as any;
      const eng = scene?.audio;
      if (!eng) return;
      const s = useGameStore.getState();
      const isNight = getTimeOfDay(s.timeMinutes) === 'night';
      eng.setNightAmount?.(isNight ? 1 : 0);
      eng.setRainAmount?.(s.weather === 'rain' ? 0.8 : s.weather === 'storm' ? 1.2 : 0);
      if (s.currentCassette) eng.playCassette?.(s.currentCassette);
    }, 600);
    return () => {
      window.clearInterval(id);
      unsub?.();
    };
  }, []);

  return (
    <div className="relative w-screen h-screen overflow-hidden bg-night-900 select-none">
      <PhaserGame />
      <div className="absolute inset-0 pointer-events-none">
        {/* Subtle global film grain on top of everything */}
        <div className="film-grain opacity-60" />
      </div>

      {view !== 'menu' && view !== 'photo' && <HUD />}
      <Dialog />
      <Toast />
      <JournalPanel />
      <CassettesPanel />
      <PausePanel />
      <PhotoMode />
      <FinaleOverlay />
      {view === 'menu' && <MainMenu />}
    </div>
  );
}
