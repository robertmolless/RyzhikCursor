import { useEffect, useRef } from 'react';
import Phaser from 'phaser';
import { makePhaserConfig } from './config';

export function PhaserGame() {
  const containerRef = useRef<HTMLDivElement>(null);
  const gameRef = useRef<Phaser.Game | null>(null);

  useEffect(() => {
    if (!containerRef.current) return;
    if (gameRef.current) return;
    const config = makePhaserConfig(containerRef.current);
    gameRef.current = new Phaser.Game(config);
    (window as any).__phaserGame = gameRef.current;
    return () => {
      gameRef.current?.destroy(true);
      gameRef.current = null;
      (window as any).__phaserGame = null;
    };
  }, []);

  return (
    <div
      ref={containerRef}
      className="absolute inset-0 w-full h-full"
      aria-label="Game canvas"
    />
  );
}
