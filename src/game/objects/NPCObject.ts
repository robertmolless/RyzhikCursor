import Phaser from 'phaser';
import type { NPCDef } from '@/types';
import { GROUND_Y, WORLD_WIDTH } from '../config';
import { useGameStore } from '@/store/useGameStore';

export class NPCObject {
  scene: Phaser.Scene;
  def: NPCDef;
  index: number;
  sprite: Phaser.Physics.Arcade.Sprite;
  private wanderTimer = 0;
  private target = 0;
  private dwellUntil = 0;
  private idle = true;
  private nameLabel: Phaser.GameObjects.Text;

  constructor(scene: Phaser.Scene, def: NPCDef, index: number, x: number, y: number) {
    this.scene = scene;
    this.def = def;
    this.index = index;
    const s = scene.physics.add.sprite(x, y, 'npcSheet', `npc${index}_0`);
    s.setOrigin(0.5, 1);
    s.setDepth(GROUND_Y + 2);
    s.setCollideWorldBounds(true);
    s.play(`npc-idle-${index}`);
    this.sprite = s;
    this.target = x;

    this.nameLabel = scene.add
      .text(x, y - 100, def.name, {
        fontFamily: 'Quicksand, sans-serif',
        fontSize: '12px',
        color: '#fbf3e4',
        backgroundColor: 'rgba(20,12,8,0.6)',
        padding: { left: 6, right: 6, top: 2, bottom: 2 },
      })
      .setOrigin(0.5, 1)
      .setDepth(GROUND_Y + 6)
      .setAlpha(0);

    // Mage only at night
    if (def.id === 'mage') {
      s.setAlpha(0);
    }
  }

  faceCat(catX: number) {
    this.sprite.setFlipX(catX < this.sprite.x);
  }

  update(delta: number) {
    const store = useGameStore.getState();
    const hour = (store.timeMinutes / 60) % 24;
    const isNight = hour > 20.5 || hour < 5.5;

    // Mage fade
    if (this.def.id === 'mage') {
      const target = isNight ? 0.95 : 0;
      const cur = this.sprite.alpha;
      this.sprite.setAlpha(cur + (target - cur) * 0.05);
    }

    // Show name label when cat is close
    const yardScene = this.scene as any;
    const cat = yardScene.cat?.sprite;
    if (cat) {
      const d = Math.abs(cat.x - this.sprite.x) + Math.abs(cat.y - this.sprite.y);
      const target = d < 160 ? 1 : 0;
      const cur = this.nameLabel.alpha;
      this.nameLabel.setAlpha(cur + (target - cur) * 0.1);
      this.nameLabel.setPosition(this.sprite.x, this.sprite.y - 100);
    }

    // Wander AI
    this.wanderTimer += delta;
    if (this.scene.time.now < this.dwellUntil) {
      this.sprite.setVelocity(0, 0);
      this.idle = true;
      this.sprite.play(`npc-idle-${this.index}`, true);
      return;
    }
    if (this.wanderTimer > 4000) {
      this.wanderTimer = 0;
      const r = Math.random();
      if (r < 0.55) {
        this.dwellUntil = this.scene.time.now + 1800 + Math.random() * 3500;
      } else {
        this.target = Phaser.Math.Clamp(
          this.def.spawn.x + (Math.random() - 0.5) * 350,
          80,
          WORLD_WIDTH - 80
        );
      }
    }
    const dx = this.target - this.sprite.x;
    if (Math.abs(dx) > 12) {
      this.sprite.setVelocity(Math.sign(dx) * 50, 0);
      this.sprite.setFlipX(dx < 0);
      this.sprite.play(`npc-walk-${this.index}`, true);
      this.idle = false;
    } else {
      this.sprite.setVelocity(0, 0);
      this.sprite.play(`npc-idle-${this.index}`, true);
      this.idle = true;
    }
  }
}
