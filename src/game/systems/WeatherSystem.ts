import Phaser from 'phaser';
import { GAME_HEIGHT, GAME_WIDTH } from '../config';
import type { WeatherKind } from '@/types';

export class WeatherSystem {
  scene: Phaser.Scene;
  rain?: Phaser.GameObjects.Particles.ParticleEmitter;
  fogLayers: Phaser.GameObjects.Graphics[] = [];
  lightning?: Phaser.GameObjects.Graphics;
  current: WeatherKind = 'clear';
  fogPhase = 0;

  constructor(scene: Phaser.Scene) {
    this.scene = scene;
    this.setupRain();
    this.setupFog();
    this.lightning = scene.add.graphics();
    this.lightning.setScrollFactor(0);
    this.lightning.setDepth(950);
  }

  private setupRain() {
    this.rain = this.scene.add.particles(0, 0, 'rain', {
      x: { min: 0, max: GAME_WIDTH + 200 },
      y: -20,
      lifespan: 1300,
      speedY: { min: 700, max: 900 },
      speedX: { min: -120, max: -60 },
      scale: { start: 1, end: 0.9 },
      alpha: { start: 0.8, end: 0.3 },
      frequency: 999999, // off
      quantity: 3,
      tint: 0xcfd9ff,
      blendMode: Phaser.BlendModes.ADD,
    });
    this.rain.setScrollFactor(0);
    this.rain.setDepth(940);
  }

  private setupFog() {
    for (let i = 0; i < 3; i++) {
      const g = this.scene.add.graphics();
      g.setScrollFactor(0);
      g.setDepth(920 + i);
      g.setAlpha(0);
      this.fogLayers.push(g);
    }
  }

  flashLightning() {
    if (!this.lightning) return;
    this.lightning.clear();
    this.lightning.fillStyle(0xffffff, 0.85);
    this.lightning.fillRect(0, 0, GAME_WIDTH, GAME_HEIGHT);
    this.scene.tweens.add({
      targets: this.lightning,
      alpha: { from: 1, to: 0 },
      duration: 180,
      onComplete: () => this.lightning?.clear(),
    });
  }

  setWeather(w: WeatherKind) {
    if (this.current === w) return;
    this.current = w;
    if (this.rain) {
      const enabled = w === 'rain' || w === 'storm';
      this.rain.frequency = enabled ? (w === 'storm' ? 20 : 35) : 999999;
      this.rain.quantity = w === 'storm' ? 6 : 3;
    }
  }

  update(deltaMs: number, weather: WeatherKind) {
    this.setWeather(weather);
    // Fog drift
    this.fogPhase += deltaMs / 1000;
    const targetFog = weather === 'fog' ? 1 : 0;
    this.fogLayers.forEach((g, i) => {
      const cur = g.alpha;
      g.setAlpha(cur + (targetFog - cur) * 0.04);
      if (g.alpha > 0.01) {
        g.clear();
        g.fillStyle(0xd9d4c4, 0.18);
        const off = ((this.fogPhase * (10 + i * 6)) % (GAME_WIDTH + 400)) - 200;
        const yBase = 350 + i * 40;
        for (let k = 0; k < 6; k++) {
          const x = ((off + k * 240) % (GAME_WIDTH + 200)) - 100;
          g.fillEllipse(x, yBase + Math.sin(this.fogPhase + k) * 10, 320, 60);
        }
      } else {
        g.clear();
      }
    });
    if (weather === 'storm' && Math.random() < deltaMs / 7000) {
      this.flashLightning();
    }
  }
}
