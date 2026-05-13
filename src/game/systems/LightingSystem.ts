import Phaser from 'phaser';
import { GAME_HEIGHT, GAME_WIDTH } from '../config';

// Time-of-day overlay + warm vignette + god-ray.
// Implemented as full-screen Graphics rectangles tinted to current sky color.
export class LightingSystem {
  scene: Phaser.Scene;
  private overlay: Phaser.GameObjects.Graphics;
  private vignette: Phaser.GameObjects.Graphics;
  private godRay: Phaser.GameObjects.Graphics;

  constructor(scene: Phaser.Scene) {
    this.scene = scene;
    this.overlay = scene.add.graphics();
    this.overlay.setScrollFactor(0);
    this.overlay.setDepth(900);
    this.overlay.setBlendMode(Phaser.BlendModes.MULTIPLY);

    this.vignette = scene.add.graphics();
    this.vignette.setScrollFactor(0);
    this.vignette.setDepth(901);

    this.godRay = scene.add.graphics();
    this.godRay.setScrollFactor(0);
    this.godRay.setDepth(902);

    this.drawVignette();
  }

  private drawVignette() {
    const w = GAME_WIDTH;
    const h = GAME_HEIGHT;
    this.vignette.clear();
    // Faux radial vignette using concentric rings
    for (let i = 0; i < 20; i++) {
      const t = i / 19;
      const alpha = Phaser.Math.Easing.Quadratic.In(t) * 0.55;
      this.vignette.fillStyle(0x000000, alpha * 0.06);
      this.vignette.fillRect(
        (-w * t * 0.4),
        (-h * t * 0.4),
        w * (1 + t * 0.8),
        h * (1 + t * 0.8)
      );
    }
    // hard outer edges
    this.vignette.fillStyle(0x000000, 0.18);
    this.vignette.fillRect(0, 0, w, 60);
    this.vignette.fillRect(0, h - 60, w, 60);
  }

  // Map game minute (0..1440) to a tint and overlay alpha.
  // Returns a smooth gradient through morning -> day -> golden -> dusk -> night.
  private colorForTime(minutes: number): { tint: number; alpha: number; god: number } {
    const h = (minutes / 60) % 24;
    // Define keyframes: hour, tint (rgb), overlay alpha, god ray strength
    const keys: Array<[number, [number, number, number], number, number]> = [
      [0, [12, 18, 40], 0.55, 0],
      [5, [60, 50, 90], 0.5, 0],
      [6, [220, 150, 110], 0.18, 0.3],
      [9, [255, 245, 220], 0.05, 0.6],
      [13, [255, 250, 235], 0.02, 0.5],
      [17, [255, 200, 130], 0.18, 0.9],
      [19, [240, 130, 90], 0.32, 0.7],
      [20, [120, 80, 130], 0.5, 0.2],
      [21.5, [40, 40, 90], 0.55, 0],
      [23.9, [12, 18, 40], 0.55, 0],
    ];
    let a = keys[0];
    let b = keys[keys.length - 1];
    for (let i = 0; i < keys.length - 1; i++) {
      if (h >= keys[i][0] && h <= keys[i + 1][0]) {
        a = keys[i];
        b = keys[i + 1];
        break;
      }
    }
    const t = (h - a[0]) / (b[0] - a[0] || 1);
    const tt = Phaser.Math.Clamp(t, 0, 1);
    const r = a[1][0] + (b[1][0] - a[1][0]) * tt;
    const g = a[1][1] + (b[1][1] - a[1][1]) * tt;
    const bl = a[1][2] + (b[1][2] - a[1][2]) * tt;
    const alpha = a[2] + (b[2] - a[2]) * tt;
    const god = a[3] + (b[3] - a[3]) * tt;
    const tint = ((r | 0) << 16) | ((g | 0) << 8) | (bl | 0);
    return { tint, alpha, god };
  }

  update(timeMinutes: number) {
    const { tint, alpha, god } = this.colorForTime(timeMinutes);
    this.overlay.clear();
    this.overlay.fillStyle(tint, Phaser.Math.Clamp(alpha + 0.25, 0, 0.9));
    this.overlay.fillRect(0, 0, GAME_WIDTH, GAME_HEIGHT);

    // God ray (single soft beam from upper-right)
    this.godRay.clear();
    if (god > 0.02) {
      this.godRay.fillStyle(0xfff0c8, 0.06 * god);
      for (let i = 0; i < 30; i++) {
        const x = GAME_WIDTH - 80 - i * 8;
        const w = 40 + i * 2;
        this.godRay.fillRect(x, 0, w, GAME_HEIGHT);
      }
    }
  }
}
