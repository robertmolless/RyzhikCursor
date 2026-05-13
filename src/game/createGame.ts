import Phaser from 'phaser';
import { RyzhikScene } from './scenes/RyzhikScene';

export const createGame = (parent: HTMLDivElement) =>
  new Phaser.Game({
    type: Phaser.AUTO,
    parent,
    backgroundColor: '#201922',
    scale: {
      mode: Phaser.Scale.RESIZE,
      autoCenter: Phaser.Scale.CENTER_BOTH,
      width: window.innerWidth,
      height: window.innerHeight,
    },
    render: {
      antialias: true,
      pixelArt: false,
      roundPixels: false,
      powerPreference: 'high-performance',
    },
    physics: {
      default: 'arcade',
      arcade: {
        debug: false,
        gravity: { x: 0, y: 0 },
      },
    },
    scene: [RyzhikScene],
  });
