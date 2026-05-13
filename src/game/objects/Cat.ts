import Phaser from 'phaser';
import { GROUND_Y, WORLD_WIDTH } from '../config';
import { useGameStore, getTimeOfDay } from '@/store/useGameStore';

type CatState = 'idle' | 'walk' | 'run' | 'sit' | 'sleep' | 'stretch' | 'purr' | 'jump';

export class Cat {
  scene: Phaser.Scene;
  sprite: Phaser.Physics.Arcade.Sprite;
  state: CatState = 'idle';
  private speed = 200;
  private runSpeed = 320;
  private keys: Phaser.Types.Input.Keyboard.CursorKeys;
  private wasd: { W: Phaser.Input.Keyboard.Key; A: Phaser.Input.Keyboard.Key; S: Phaser.Input.Keyboard.Key; D: Phaser.Input.Keyboard.Key; SHIFT: Phaser.Input.Keyboard.Key };
  private aiTimer = 0;
  private autoControl = false;
  private autoTarget = 0;
  private autoUntil = 0;
  private idleTimer = 0;
  private restingSpot?: { x: number; y: number; until: number };
  private particlesPurr?: Phaser.GameObjects.Particles.ParticleEmitter;

  constructor(scene: Phaser.Scene, x: number, y: number) {
    this.scene = scene;
    const s = scene.physics.add.sprite(x, y, 'catSheet', 0);
    s.setOrigin(0.5, 1);
    s.setDepth(GROUND_Y + 5);
    s.setCollideWorldBounds(true);
    s.setSize(40, 28);
    s.setOffset(28, 50);
    s.play('cat-idle');
    this.sprite = s;

    const kb = scene.input.keyboard!;
    this.keys = kb.createCursorKeys();
    this.wasd = {
      W: kb.addKey(Phaser.Input.Keyboard.KeyCodes.W),
      A: kb.addKey(Phaser.Input.Keyboard.KeyCodes.A),
      S: kb.addKey(Phaser.Input.Keyboard.KeyCodes.S),
      D: kb.addKey(Phaser.Input.Keyboard.KeyCodes.D),
      SHIFT: kb.addKey(Phaser.Input.Keyboard.KeyCodes.SHIFT),
    };

    // Purr hearts
    this.particlesPurr = scene.add.particles(0, 0, 'firefly', {
      lifespan: 900,
      speed: { min: 5, max: 20 },
      angle: { min: 250, max: 290 },
      scale: { start: 0.3, end: 0 },
      alpha: { start: 0.7, end: 0 },
      tint: 0xff9aa8,
      frequency: -1,
      blendMode: 'ADD',
    });
    this.particlesPurr.setDepth(GROUND_Y + 6);
  }

  setVelocity(vx: number, vy: number) {
    this.sprite.setVelocity(vx, vy);
  }

  idle() {
    this.setVelocity(0, 0);
    if (this.state !== 'idle') {
      this.sprite.play('cat-idle');
      this.state = 'idle';
    }
  }

  update(delta: number) {
    const store = useGameStore.getState();
    if (store.ui.dialogQueue.length > 0) {
      this.idle();
      return;
    }

    const k = this.keys;
    const w = this.wasd;
    const left = k.left?.isDown || w.A.isDown;
    const right = k.right?.isDown || w.D.isDown;
    const up = k.up?.isDown || w.W.isDown;
    const down = k.down?.isDown || w.S.isDown;
    const run = w.SHIFT.isDown;

    const playerInputting = left || right || up || down;

    if (playerInputting) {
      this.autoControl = false;
      this.idleTimer = 0;
      this.restingSpot = undefined;
      let vx = 0;
      let vy = 0;
      const sp = run ? this.runSpeed : this.speed;
      if (left) vx -= sp;
      if (right) vx += sp;
      if (up) vy -= sp * 0.6;
      if (down) vy += sp * 0.6;
      this.setVelocity(vx, vy);
      this.facingFlip(vx);
      this.setAnim(vx !== 0 || vy !== 0 ? 'cat-walk' : 'cat-idle');
      this.state = vx !== 0 || vy !== 0 ? 'walk' : 'idle';
      // Constrain Y so cat stays around ground area
      this.sprite.y = Phaser.Math.Clamp(this.sprite.y, GROUND_Y - 40, GROUND_Y + 12);
    } else {
      this.idleTimer += delta;
      if (this.idleTimer > 3500) {
        this.autoControl = true;
      }
      if (this.autoControl) {
        this.aiBehavior(delta);
      } else {
        this.idle();
      }
    }

    // Purr particles when sitting/sleeping
    if (this.particlesPurr) {
      const purring = this.state === 'purr' || this.state === 'sleep';
      this.particlesPurr.setPosition(this.sprite.x, this.sprite.y - 40);
      this.particlesPurr.frequency = purring ? 400 : -1;
    }
  }

  private facingFlip(vx: number) {
    if (vx > 0.1) this.sprite.setFlipX(false);
    else if (vx < -0.1) this.sprite.setFlipX(true);
  }

  private setAnim(key: string) {
    const anim = this.sprite.anims.currentAnim?.key;
    if (anim !== key) this.sprite.play(key, true);
  }

  // -------------------- AI --------------------
  private aiBehavior(delta: number) {
    const now = this.scene.time.now;
    const store = useGameStore.getState();
    const hour = (store.timeMinutes / 60) % 24;
    const isNight = hour > 20.5 || hour < 5.5;

    // Resting state
    if (this.restingSpot) {
      if (now > this.restingSpot.until) {
        this.restingSpot = undefined;
        this.aiTimer = 0;
      } else {
        const moveTo = this.restingSpot;
        const dx = moveTo.x - this.sprite.x;
        if (Math.abs(dx) > 6) {
          this.setVelocity(Math.sign(dx) * 80, 0);
          this.facingFlip(dx);
          this.setAnim('cat-walk');
          this.state = 'walk';
        } else {
          this.setVelocity(0, 0);
          // pick rest pose
          if (isNight) {
            this.setAnim('cat-sleep');
            this.state = 'sleep';
          } else {
            this.setAnim('cat-purr');
            this.state = 'purr';
          }
        }
        return;
      }
    }

    this.aiTimer += delta;
    if (this.autoTarget === 0 || now > this.autoUntil) {
      // Choose new behaviour
      const r = Math.random();
      if (r < 0.25) {
        // sit and stretch
        this.setVelocity(0, 0);
        this.setAnim('cat-stretch');
        this.state = 'stretch';
        this.autoUntil = now + 1600;
        this.autoTarget = this.sprite.x;
      } else if (r < 0.55) {
        // walk to a wandered point
        const dest = Phaser.Math.Clamp(
          this.sprite.x + (Math.random() - 0.5) * 600,
          120,
          WORLD_WIDTH - 120
        );
        this.autoTarget = dest;
        this.autoUntil = now + 5000;
      } else if (r < 0.7) {
        // sleep here
        this.restingSpot = { x: this.sprite.x, y: GROUND_Y - 4, until: now + 12000 };
      } else {
        // go to cozy spot (campfire if night, swing otherwise)
        const cozyX = isNight ? 620 : 1880;
        this.restingSpot = { x: cozyX, y: GROUND_Y - 4, until: now + 14000 };
      }
    } else {
      const dx = this.autoTarget - this.sprite.x;
      if (Math.abs(dx) > 8) {
        this.setVelocity(Math.sign(dx) * 90, 0);
        this.facingFlip(dx);
        this.setAnim('cat-walk');
        this.state = 'walk';
      } else {
        this.setVelocity(0, 0);
        this.setAnim('cat-idle');
        this.state = 'idle';
      }
    }
  }
}
