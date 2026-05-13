import { Suspense, lazy, useEffect, useMemo } from 'react';
import { Hud } from './components/Hud';
import { AudioDirector } from './lib/audio';
import { createTelegramBridge } from './lib/telegram';
import { useGameStore } from './store/gameStore';

const GameCanvas = lazy(() => import('./components/GameCanvas').then((module) => ({ default: module.GameCanvas })));

const firebaseConfigured = () =>
  [
    'VITE_FIREBASE_API_KEY',
    'VITE_FIREBASE_AUTH_DOMAIN',
    'VITE_FIREBASE_PROJECT_ID',
    'VITE_FIREBASE_APP_ID',
  ].every((key) => Boolean(import.meta.env[key]));

export const App = () => {
  const audio = useMemo(() => new AudioDirector(), []);
  const muted = useGameStore((state) => state.muted);

  useEffect(() => {
    const store = useGameStore.getState();
    store.hydrate();
    createTelegramBridge().ready();
    if (firebaseConfigured()) {
      void import('./lib/firebase').then(({ createFirebaseServices }) => createFirebaseServices());
    }
  }, []);

  useEffect(() => {
    audio.setMuted(muted);
  }, [audio, muted]);

  return (
    <main className="relative h-dvh w-screen overflow-hidden bg-[#16111e] text-amber-50">
      <div className="absolute inset-0 atmospheric-page-bg" />
      <Suspense fallback={<div className="absolute inset-0 grid place-items-center text-amber-100">Дом просыпается...</div>}>
        <GameCanvas audio={audio} />
      </Suspense>
      <Hud />
    </main>
  );
};
