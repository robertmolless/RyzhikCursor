import { useEffect, useMemo } from 'react';
import { GameCanvas } from './components/GameCanvas';
import { Hud } from './components/Hud';
import { AudioDirector } from './lib/audio';
import { createFirebaseServices, firebaseIsConfigured } from './lib/firebase';
import { createTelegramBridge } from './lib/telegram';
import { useGameStore } from './store/gameStore';

export const App = () => {
  const audio = useMemo(() => new AudioDirector(), []);
  const muted = useGameStore((state) => state.muted);

  useEffect(() => {
    const store = useGameStore.getState();
    store.hydrate();
    createTelegramBridge().ready();
    if (firebaseIsConfigured()) createFirebaseServices();
  }, []);

  useEffect(() => {
    audio.setMuted(muted);
  }, [audio, muted]);

  return (
    <main className="relative h-dvh w-screen overflow-hidden bg-[#16111e] text-amber-50">
      <div className="absolute inset-0 atmospheric-page-bg" />
      <GameCanvas audio={audio} />
      <Hud />
    </main>
  );
};
