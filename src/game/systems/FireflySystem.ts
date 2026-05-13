import Phaser from 'phaser';
import { GROUND_Y, WORLD_WIDTH } from '../config';

interface Firefly {
  sprite: Phaser.GameObjects.Image;
  baseY: number;
  phase: number;
  freq: number;
  speed: number;
  vx: number;
  vy: number;
  state: 'free' | 'following' | 'atPond';
  followOffset: number;
}

// Manages a cloud of fireflies that appear at night, with a sub-system that
// lets the cat lure them into following.
export class FireflySystem {
  scene: Phaser.Scene;
  flies: Firefly[] = [];
  followingCount = 0;
  visible = false;

  constructor(scene: Phaser.Scene) {
    this.scene = scene;
    for (let i = 0; i < 40; i++) {
      const x = Math.random() * WORLD_WIDTH;
      const baseY = GROUND_Y - 100 - Math.random() * 200;
      const s = scene.add.image(x, baseY, 'firefly').setBlendMode(Phaser.BlendModes.ADD);
      s.setScale(0.6 + Math.random() * 0.5);
      s.setAlpha(0);
      s.setDepth(GROUND_Y + 7);
      this.flies.push({
        sprite: s,
        baseY,
        phase: Math.random() * Math.PI * 2,
        freq: 0.5 + Math.random() * 1.2,
        speed: 0.15 + Math.random() * 0.25,
        vx: 0,
        vy: 0,
        state: 'free',
        followOffset: i * 12,
      });
    }
  }

  update(deltaMs: number, timeMinutes: number) {
    const hour = (timeMinutes / 60) % 24;
    const night = hour > 19.5 || hour < 5.5;
    const desired = night ? 1 : 0;
    const dt = deltaMs / 1000;

    const cat = (this.scene as any).cat?.sprite as Phaser.Physics.Arcade.Sprite | undefined;

    this.followingCount = 0;
    this.flies.forEach((f, i) => {
      // Alpha fade
      const targetA = desired * (0.4 + Math.sin(f.phase + f.freq * this.scene.time.now / 600) * 0.4);
      const cur = f.sprite.alpha;
      f.sprite.setAlpha(cur + (Math.max(0, targetA) - cur) * 0.05);

      // Free behaviour: drift
      if (f.state === 'free') {
        f.phase += dt * f.freq;
        f.sprite.x += Math.cos(f.phase) * 30 * dt;
        f.sprite.y = f.baseY + Math.sin(f.phase * 1.3) * 20;
        // If cat is near at night, become a follower
        if (night && cat) {
          const dx = cat.x - f.sprite.x;
          const dy = cat.y - 30 - f.sprite.y;
          const d = dx * dx + dy * dy;
          if (d < 120 * 120) {
            f.state = 'following';
          }
        }
      } else if (f.state === 'following' && cat && night) {
        this.followingCount++;
        const targetX = cat.x - 30 + Math.sin(this.scene.time.now / 400 + i) * 18;
        const targetY = cat.y - 80 + Math.cos(this.scene.time.now / 500 + i) * 12;
        f.sprite.x += (targetX - f.sprite.x) * 0.06;
        f.sprite.y += (targetY - f.sprite.y) * 0.06;
        if (f.sprite.x < 240) {
          f.state = 'atPond';
        }
      } else if (f.state === 'atPond') {
        // Stays near pond region
        f.sprite.y += Math.sin(this.scene.time.now / 600 + i) * 0.4;
      }

      // If day arrives, reset
      if (!night && f.state !== 'free') {
        f.state = 'free';
      }
    });
  }
}
