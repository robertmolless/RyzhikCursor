import { useEffect, useRef } from 'react';
import { RyzhikGame } from '../engine/RyzhikGame';
import type { AudioDirector } from '../lib/audio';

interface GameCanvasProps {
  audio: AudioDirector;
}

export const GameCanvas = ({ audio }: GameCanvasProps) => {
  const hostRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!hostRef.current) return undefined;
    const engine = new RyzhikGame(hostRef.current, audio);
    void engine.init();
    return () => engine.destroy();
  }, [audio]);

  return <div ref={hostRef} className="absolute inset-0 overflow-hidden" aria-label="Игровой мир Рыжика" />;
};
