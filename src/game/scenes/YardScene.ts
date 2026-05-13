import Phaser from 'phaser';
import { useGameStore, getTimeOfDay } from '@/store/useGameStore';
import { NPCS } from '@/data/npcs';
import { QUEST_BY_ID } from '@/data/quests';
import { DIALOGS, GREETINGS } from '@/data/dialogs';
import { Cat } from '../objects/Cat';
import { NPCObject } from '../objects/NPCObject';
import { LightingSystem } from '../systems/LightingSystem';
import { WeatherSystem } from '../systems/WeatherSystem';
import { FireflySystem } from '../systems/FireflySystem';
import { AudioEngine } from '../systems/AudioEngine';
import { GROUND_Y, WORLD_HEIGHT, WORLD_WIDTH } from '../config';

type Interactable = {
  obj: Phaser.GameObjects.Image | Phaser.GameObjects.Container;
  hint: string;
  onUse: () => void;
  pulseGlow?: Phaser.GameObjects.Image;
};

export class YardScene extends Phaser.Scene {
  cat!: Cat;
  npcs: NPCObject[] = [];
  lighting!: LightingSystem;
  weather!: WeatherSystem;
  fireflies!: FireflySystem;
  audio!: AudioEngine;
  interactables: Interactable[] = [];
  private hintLabel!: Phaser.GameObjects.Text;
  private currentHint?: Interactable;
  private leavesTimer = 0;
  private windPhase = 0;
  private trees: { sprite: Phaser.GameObjects.Image; baseAngle: number; speed: number }[] = [];
  private garlands: Phaser.GameObjects.Image[] = [];
  private fireflyCount = 0;
  private cassetteFound = false;
  private pickFound = false;
  private stickersFound = 0;
  private STICKERS_TARGET = 3;
  private FIREFLY_FOLLOW_TARGET = 3;
  private followingFireflies = 0;

  constructor() {
    super('Yard');
  }

  create() {
    this.cameras.main.setBackgroundColor('#0a0c14');
    this.cameras.main.setBounds(0, 0, WORLD_WIDTH, WORLD_HEIGHT);
    this.physics.world.setBounds(0, 0, WORLD_WIDTH, WORLD_HEIGHT);

    this.buildSky();
    this.buildHills();
    this.buildTreesFar();
    this.buildGround();
    this.buildHouse();
    this.buildProps();
    this.buildGarland();
    this.buildShedAndBoxes();
    this.buildBenches();

    // Lighting overlay (rendered on top of world layer, below UI sprites)
    this.lighting = new LightingSystem(this);
    this.weather = new WeatherSystem(this);
    this.fireflies = new FireflySystem(this);

    // Audio
    this.audio = new AudioEngine();
    this.audio.start();

    // Cat (player)
    this.cat = new Cat(this, 1280, GROUND_Y - 4);
    this.cameras.main.startFollow(this.cat.sprite, true, 0.08, 0.08, 0, 80);

    // NPCs (subset spawned in yard)
    const yardNPCs = NPCS.filter((n) =>
      ['lyokha', 'igor', 'nastya', 'liza', 'mage', 'sonya', 'nena', 'kristina', 'danya', 'prokhor'].includes(n.id)
    );
    yardNPCs.forEach((def, idx) => {
      const n = new NPCObject(this, def, idx, def.spawn.x, def.spawn.y);
      this.npcs.push(n);
    });

    // Interactables for quests
    this.spawnQuestObjects();

    // Hint label
    this.hintLabel = this.add
      .text(0, 0, '', {
        fontFamily: 'Quicksand, sans-serif',
        fontSize: '14px',
        color: '#fbf3e4',
        backgroundColor: 'rgba(20,12,8,0.72)',
        padding: { left: 8, right: 8, top: 4, bottom: 4 },
      })
      .setDepth(1100)
      .setScrollFactor(0)
      .setOrigin(0.5, 1)
      .setAlpha(0);

    // Input
    this.input.keyboard?.on('keydown-E', () => this.handleInteract());
    this.input.keyboard?.on('keydown-SPACE', () => this.handleInteract());

    // First entry dialog
    if (!useGameStore.getState().flags.welcomed) {
      useGameStore.getState().enqueueDialog(GREETINGS);
      useGameStore.getState().setFlag('welcomed');
    }

    // React to view changes (pause music when in menu)
    this.events.on(Phaser.Scenes.Events.SHUTDOWN, () => this.audio.stop());

    // Periodic weather changes
    this.time.addEvent({
      delay: 60 * 1000,
      loop: true,
      callback: () => this.rotateWeather(),
    });
  }

  // -----------------------------------------------------------------
  // World construction
  // -----------------------------------------------------------------
  private buildSky() {
    const sky = this.add.image(0, 0, 'sky').setOrigin(0, 0);
    sky.setDisplaySize(WORLD_WIDTH, 720);
    sky.setScrollFactor(0.1);
    sky.setDepth(-100);

    const stars = this.add.image(0, 0, 'stars').setOrigin(0, 0);
    stars.setDisplaySize(WORLD_WIDTH, 720);
    stars.setScrollFactor(0.05);
    stars.setDepth(-95);
    stars.setAlpha(0);
    (this as any).starsImg = stars;
  }

  private buildHills() {
    const hills = this.add.image(0, 500, 'hills').setOrigin(0, 0);
    hills.setDisplaySize(WORLD_WIDTH, 320);
    hills.setScrollFactor(0.25);
    hills.setDepth(-80);
  }

  private buildTreesFar() {
    const trees = this.add.image(0, 480, 'treesFar').setOrigin(0, 0);
    trees.setDisplaySize(WORLD_WIDTH, 360);
    trees.setScrollFactor(0.45);
    trees.setDepth(-70);
  }

  private buildGround() {
    const ground = this.add.image(0, GROUND_Y - 60, 'ground').setOrigin(0, 0);
    ground.setDisplaySize(WORLD_WIDTH, 360);
    ground.setDepth(-50);
  }

  private buildHouse() {
    const house = this.add.image(1200, GROUND_Y - 30, 'house').setOrigin(0.5, 1);
    house.setScale(1.15);
    house.setDepth(GROUND_Y);

    // Place trees around
    [
      { x: 220, key: 'tree1', s: 1.05 },
      { x: 480, key: 'tree3', s: 0.95 },
      { x: 760, key: 'tree2', s: 0.85 },
      { x: 1640, key: 'tree4', s: 0.9 },
      { x: 1920, key: 'tree2', s: 1.1 },
      { x: 2240, key: 'tree3', s: 1.0 },
    ].forEach((t) => {
      const tree = this.add.image(t.x, GROUND_Y, t.key).setOrigin(0.5, 1);
      tree.setScale(t.s);
      tree.setDepth(GROUND_Y - 10);
      this.trees.push({ sprite: tree, baseAngle: 0, speed: 0.4 + Math.random() * 0.6 });
    });

    // Bushes
    [
      { x: 350, key: 'bush1' },
      { x: 580, key: 'bush2' },
      { x: 880, key: 'bush3' },
      { x: 1480, key: 'bush1' },
      { x: 1780, key: 'bush2' },
      { x: 2080, key: 'bush3' },
    ].forEach((b) => {
      const bush = this.add.image(b.x, GROUND_Y + 4, b.key).setOrigin(0.5, 1);
      bush.setDepth(GROUND_Y - 5);
    });
  }

  private buildProps() {
    // Campfire — interactable for warmth
    const fire = this.add.image(620, GROUND_Y + 4, 'campfire').setOrigin(0.5, 1);
    fire.setDepth(GROUND_Y - 1);
    // Fire glow
    const glow = this.add.image(620, GROUND_Y - 30, 'firefly');
    glow.setScale(5).setAlpha(0.55).setTint(0xffaa55).setDepth(GROUND_Y - 2);
    this.tweens.add({
      targets: glow,
      scale: { from: 4.5, to: 5.5 },
      alpha: { from: 0.45, to: 0.7 },
      duration: 800,
      yoyo: true,
      repeat: -1,
      ease: 'Sine.easeInOut',
    });
    // Fire particles
    const fp = this.add.particles(620, GROUND_Y - 24, 'firefly', {
      lifespan: 700,
      speed: { min: 10, max: 40 },
      angle: { min: 260, max: 280 },
      scale: { start: 0.6, end: 0 },
      alpha: { start: 0.9, end: 0 },
      tint: [0xff8030, 0xffd28a, 0xffa84a],
      frequency: 70,
      blendMode: 'ADD',
    });
    fp.setDepth(GROUND_Y - 1);

    // Swing
    const swing = this.add.image(1880, GROUND_Y + 6, 'swing').setOrigin(0.5, 1);
    swing.setDepth(GROUND_Y - 4);
    this.tweens.add({
      targets: swing,
      angle: { from: -3, to: 3 },
      duration: 2200,
      yoyo: true,
      repeat: -1,
      ease: 'Sine.easeInOut',
    });

    // Lanterns
    [
      { x: 400, y: GROUND_Y - 110 },
      { x: 980, y: GROUND_Y - 110 },
      { x: 1520, y: GROUND_Y - 110 },
      { x: 2180, y: GROUND_Y - 110 },
    ].forEach((p) => {
      const l = this.add.image(p.x, p.y, 'lantern').setOrigin(0.5, 1);
      l.setDepth(GROUND_Y - 7);
      // glow
      const g = this.add.image(p.x, p.y - 30, 'firefly').setScale(3).setAlpha(0.35).setTint(0xffd28a).setDepth(GROUND_Y - 6);
      this.tweens.add({
        targets: g,
        alpha: { from: 0.25, to: 0.55 },
        duration: 1400,
        yoyo: true,
        repeat: -1,
        ease: 'Sine.easeInOut',
      });
      (l as any).__glow = g;
    });
  }

  private buildGarland() {
    // String the wire as a thin Graphics line so it reads even in daylight.
    const wire = this.add.graphics();
    wire.lineStyle(2, 0x2c1a12, 0.65);
    wire.setDepth(GROUND_Y - 7);
    const points = [
      { x: 900, y: GROUND_Y - 340 },
      { x: 1280, y: GROUND_Y - 270 },
      { x: 1660, y: GROUND_Y - 340 },
    ];
    wire.beginPath();
    wire.moveTo(points[0].x, points[0].y);
    for (let i = 1; i <= 60; i++) {
      const t = i / 60;
      const segF = Math.min(t * 2, 1.9999);
      const seg = Math.floor(segF);
      const lt = segF - seg;
      const sag = Math.sin(lt * Math.PI) * 22;
      const x = points[seg].x + (points[seg + 1].x - points[seg].x) * lt;
      const y = points[seg].y + (points[seg + 1].y - points[seg].y) * lt + sag;
      wire.lineTo(x, y);
    }
    wire.strokePath();

    for (let i = 0; i < 60; i++) {
      const t = i / 59;
      const segF = Math.min(t * 2, 1.9999);
      const seg = Math.floor(segF);
      const lt = segF - seg;
      const p0 = points[seg];
      const p1 = points[seg + 1];
      const sag = Math.sin(lt * Math.PI) * 18;
      const x = p0.x + (p1.x - p0.x) * lt;
      const y = p0.y + (p1.y - p0.y) * lt + sag;
      const g = this.add.image(x, y, 'garland').setDepth(GROUND_Y - 6).setBlendMode(Phaser.BlendModes.ADD);
      g.setTint([0xffd28a, 0xff9070, 0xffe0a8, 0xa4e0ff, 0xffb060][i % 5]);
      g.setScale(1.6);
      this.tweens.add({
        targets: g,
        alpha: { from: 0.6, to: 1 },
        scale: { from: 1.4, to: 1.9 },
        duration: 800 + Math.random() * 1200,
        yoyo: true,
        repeat: -1,
        ease: 'Sine.easeInOut',
      });
      this.garlands.push(g);
    }
  }

  private buildShedAndBoxes() {
    const shed = this.add.image(2050, GROUND_Y + 4, 'shed').setOrigin(0.5, 1);
    shed.setDepth(GROUND_Y - 3);
    // Boxes near shed (used in old cassette quest)
    [
      { x: 2000, y: GROUND_Y - 4 },
      { x: 2060, y: GROUND_Y - 4 },
      { x: 2120, y: GROUND_Y - 4 },
    ].forEach((p, i) => {
      const b = this.add.image(p.x, p.y, 'box').setOrigin(0.5, 1);
      b.setDepth(GROUND_Y + i);
      const inter: Interactable = {
        obj: b,
        hint: 'Толкнуть коробку (E)',
        onUse: () => this.onPushBox(b),
      };
      (b as any).__inter = inter;
      this.interactables.push(inter);
    });
  }

  private buildBenches() {
    const bench = this.add.image(880, GROUND_Y + 4, 'bench').setOrigin(0.5, 1);
    bench.setDepth(GROUND_Y - 2);
  }

  // -----------------------------------------------------------------
  // Quest objects
  // -----------------------------------------------------------------
  private spawnQuestObjects() {
    // Cassette starts hidden behind boxes near shed (revealed when boxes pushed)
    const cassette = this.add.image(2080, GROUND_Y - 8, 'cassette');
    cassette.setDepth(GROUND_Y - 4);
    cassette.setVisible(false);
    const cInter: Interactable = {
      obj: cassette,
      hint: 'Подобрать кассету (E)',
      onUse: () => this.onPickupCassette(cassette),
    };
    this.interactables.push(cInter);
    (cassette as any).__inter = cInter;
    (this as any).__cassetteObj = cassette;

    // Pick (медиатор) near campfire
    const pick = this.add.image(640, GROUND_Y - 8, 'pick');
    pick.setDepth(GROUND_Y - 1);
    const pInter: Interactable = {
      obj: pick,
      hint: 'Подобрать медиатор (E)',
      onUse: () => this.onPickupPick(pick),
    };
    this.interactables.push(pInter);
    (pick as any).__inter = pInter;

    // Stickers in three spots
    [
      { x: 470, y: GROUND_Y - 6 },
      { x: 1380, y: GROUND_Y - 6 },
      { x: 1740, y: GROUND_Y - 6 },
    ].forEach((p) => {
      const s = this.add.image(p.x, p.y, 'sticker');
      s.setDepth(GROUND_Y - 1);
      const sInter: Interactable = {
        obj: s,
        hint: 'Собрать наклейку (E)',
        onUse: () => this.onPickupSticker(s),
      };
      this.interactables.push(sInter);
      (s as any).__inter = sInter;
      this.tweens.add({
        targets: s,
        y: { from: p.y - 6, to: p.y - 2 },
        duration: 1400,
        yoyo: true,
        repeat: -1,
        ease: 'Sine.easeInOut',
      });
    });

    // Bell at forest edge (left), only appears at night
    const bell = this.add.image(120, GROUND_Y - 8, 'bell');
    bell.setDepth(GROUND_Y - 1);
    bell.setVisible(false);
    (this as any).__bellObj = bell;
    const bInter: Interactable = {
      obj: bell,
      hint: 'Послушать колокольчик (E)',
      onUse: () => this.onListenBell(bell),
    };
    this.interactables.push(bInter);
    (bell as any).__inter = bInter;
  }

  private onPushBox(box: Phaser.GameObjects.Image) {
    const targetX = box.x + (Math.random() > 0.5 ? 30 : -30);
    this.tweens.add({
      targets: box,
      x: targetX,
      duration: 320,
      ease: 'Cubic.easeOut',
    });
    useGameStore.getState().showToast('Коробка сдвинулась…');
    // Reveal cassette after pushing
    const cassette = (this as any).__cassetteObj as Phaser.GameObjects.Image;
    if (cassette && !cassette.visible) {
      const q = useGameStore.getState().getQuestState('oldCassette');
      if (q?.status === 'active' && q.stepIndex >= 0) {
        cassette.setVisible(true);
        this.tweens.add({
          targets: cassette,
          y: { from: cassette.y - 10, to: cassette.y },
          duration: 400,
          ease: 'Bounce.easeOut',
        });
      }
    }
  }

  private onPickupCassette(c: Phaser.GameObjects.Image) {
    c.setVisible(false);
    const store = useGameStore.getState();
    store.showToast('Найдена кассета!');
    if (store.getQuestState('oldCassette')?.status === 'active') {
      store.advanceQuest('oldCassette', 'found');
    }
    store.setFlag('hasCassette');
    this.removeInteractable(c);
  }

  private onPickupPick(p: Phaser.GameObjects.Image) {
    p.setVisible(false);
    const store = useGameStore.getState();
    store.showToast('Подобран медиатор');
    if (store.getQuestState('lostPick')?.status === 'active') {
      store.advanceQuest('lostPick', 'found');
    }
    store.setFlag('hasPick');
    this.removeInteractable(p);
  }

  private onPickupSticker(s: Phaser.GameObjects.Image) {
    s.setVisible(false);
    this.stickersFound += 1;
    const store = useGameStore.getState();
    store.showToast(`Наклейка ${this.stickersFound}/${this.STICKERS_TARGET}`);
    if (
      this.stickersFound >= this.STICKERS_TARGET &&
      store.getQuestState('lostStickers')?.status === 'active'
    ) {
      store.advanceQuest('lostStickers', 'collected');
    }
    this.removeInteractable(s);
  }

  private onListenBell(bell: Phaser.GameObjects.Image) {
    const store = useGameStore.getState();
    this.audio.bell();
    store.enqueueDialog([
      { speaker: '…', text: '*звон, тонкий, как ниточка света*' },
      { speaker: 'Маг', text: 'Ты услышал. Теперь это место знает тебя.' },
    ]);
    if (store.getQuestState('moonBell')?.status === 'active') {
      store.advanceQuest('moonBell', 'heard');
      // Auto-complete after listening
      this.time.delayedCall(800, () => store.completeQuest('moonBell'));
    }
    bell.setVisible(false);
    this.removeInteractable(bell);
  }

  private removeInteractable(obj: Phaser.GameObjects.Image | Phaser.GameObjects.Container) {
    this.interactables = this.interactables.filter((i) => i.obj !== obj);
  }

  // -----------------------------------------------------------------
  // Interaction handling
  // -----------------------------------------------------------------
  private handleInteract() {
    const store = useGameStore.getState();
    if (store.ui.dialogQueue.length > 0) {
      store.advanceDialog();
      return;
    }
    if (!this.currentHint) return;
    // NPC?
    const npcMatch = this.npcs.find((n) => n.sprite === this.currentHint!.obj);
    if (npcMatch) {
      this.talkTo(npcMatch);
      return;
    }
    this.currentHint.onUse();
  }

  private talkTo(npc: NPCObject) {
    const store = useGameStore.getState();
    const def = npc.def;
    npc.faceCat(this.cat.sprite.x);
    const q = def.questId ? store.getQuestState(def.questId) : undefined;
    const status = q?.status ?? 'unknown';

    // Quest hand-in checks
    if (q && q.status === 'active' && def.questId) {
      if (def.questId === 'oldCassette' && store.flags.hasCassette) {
        store.setFlag('hasCassette', false);
        store.completeQuest('oldCassette');
        store.enqueueDialog([
          { speaker: 'Лёха', text: 'Ты её нашёл? Серьёзно?' },
          {
            speaker: 'Лёха',
            text: 'Сейчас… поставлю. Это лучшее, что случалось с этим двором за лето.',
          },
        ]);
        this.audio.playCassette('summer-porch');
        store.setCurrentCassette('summer-porch');
        return;
      }
      if (def.questId === 'lostPick' && store.flags.hasPick) {
        store.setFlag('hasPick', false);
        store.completeQuest('lostPick');
        store.enqueueDialog([
          { speaker: 'Игорь', text: 'О! Котяра, ты гений. Сейчас грянем!' },
        ]);
        this.audio.playCassette('garage-thunder');
        store.setCurrentCassette('garage-thunder');
        return;
      }
      if (def.questId === 'lostStickers' && this.stickersFound >= this.STICKERS_TARGET) {
        this.stickersFound = 0;
        store.completeQuest('lostStickers');
        store.enqueueDialog([
          { speaker: 'Лиза', text: 'Ты ЛУЧШИЙ! Двор будет светиться!' },
        ]);
        return;
      }
      if (def.questId === 'fireflyPhoto' && this.followingFireflies >= this.FIREFLY_FOLLOW_TARGET) {
        // Will be completed when player reaches the pond area — for now,
        // completing on talk after night near the campfire.
        store.completeQuest('fireflyPhoto');
        store.enqueueDialog([
          { speaker: 'Настя', text: 'Стоп… замри. ВОТ. Идеально.' },
        ]);
        return;
      }
    }

    // Quest offer flow
    if (def.questId && status === 'offered') {
      const def2 = QUEST_BY_ID[def.questId];
      store.enqueueDialog([
        { speaker: def.name, text: def2.intro },
        { speaker: def.name, text: 'Поможешь?' },
      ]);
      store.startQuest(def.questId);
      store.addFriendship(def.id, 1);
      return;
    }

    // Default ambient dialog
    const ctx = {
      questStatus: status as any,
      time: getTimeOfDay(store.timeMinutes),
      weather: store.weather,
      friendship: store.friendships[def.id] ?? 0,
    };
    const bank = DIALOGS[def.id];
    const lines = bank ? bank(ctx) : [{ speaker: def.name, text: '…' }];
    store.enqueueDialog(lines);
    store.addFriendship(def.id, 0.2);
  }

  // -----------------------------------------------------------------
  // Update loop
  // -----------------------------------------------------------------
  update(time: number, delta: number) {
    const store = useGameStore.getState();
    if (store.ui.view === 'paused' || store.paused) return;
    if (store.ui.view !== 'playing' && store.ui.view !== 'photo') {
      this.cat.idle();
      return;
    }

    // Tick game time
    store.tick(delta);

    // Update systems
    this.cat.update(delta);
    this.npcs.forEach((n) => n.update(delta));
    this.lighting.update(store.timeMinutes);
    this.weather.update(delta, store.weather);
    this.fireflies.update(delta, store.timeMinutes);

    // Tree wind sway
    this.windPhase += delta / 1000;
    this.trees.forEach((t, i) => {
      t.sprite.angle = Math.sin(this.windPhase * t.speed + i) * 1.2;
    });

    // Stars visibility
    const stars = (this as any).starsImg as Phaser.GameObjects.Image;
    if (stars) {
      const hour = (store.timeMinutes / 60) % 24;
      const nightStrength = hour < 5.5 || hour > 20 ? 1 : Math.max(0, 1 - Math.abs(hour - 0) / 6);
      stars.setAlpha(Phaser.Math.Clamp(nightStrength, 0, 1));
    }

    // Make bell appear at night for the moonBell quest
    const bell = (this as any).__bellObj as Phaser.GameObjects.Image;
    if (bell) {
      const isNight = getTimeOfDay(store.timeMinutes) === 'night';
      const qb = store.getQuestState('moonBell');
      const want = isNight && qb?.status === 'active';
      bell.setVisible(want);
    }

    // Hint scanning
    this.updateHint();

    // Firefly follow count (kept on this scene)
    this.followingFireflies = this.fireflies.followingCount;

    // Quest auto-advances
    this.checkAutoQuests(store);
  }

  private checkAutoQuests(store: ReturnType<typeof useGameStore.getState>) {
    // oldCassette - if near shed
    const q1 = store.getQuestState('oldCassette');
    if (q1?.status === 'active' && q1.stepIndex === 0) {
      if (this.cat.sprite.x > 1900) store.advanceQuest('oldCassette', 'atShed');
    }
    // fireflyPhoto night detection
    const q2 = store.getQuestState('fireflyPhoto');
    if (q2?.status === 'active' && q2.stepIndex === 0) {
      if (getTimeOfDay(store.timeMinutes) === 'night') store.advanceQuest('fireflyPhoto', 'night');
    }
    if (q2?.status === 'active' && q2.stepIndex === 1) {
      if (this.fireflies.followingCount >= this.FIREFLY_FOLLOW_TARGET)
        store.advanceQuest('fireflyPhoto', 'caught');
    }
    // moonBell midnight
    const q3 = store.getQuestState('moonBell');
    if (q3?.status === 'active' && q3.stepIndex === 0) {
      if (getTimeOfDay(store.timeMinutes) === 'night') store.advanceQuest('moonBell', 'midnight');
    }
  }

  private updateHint() {
    const cx = this.cat.sprite.x;
    const cy = this.cat.sprite.y;
    let closest: Interactable | undefined;
    let closestDist = 80 * 80;
    // NPCs
    for (const n of this.npcs) {
      const dx = n.sprite.x - cx;
      const dy = n.sprite.y - cy;
      const d = dx * dx + dy * dy;
      if (d < closestDist) {
        closest = {
          obj: n.sprite as unknown as Phaser.GameObjects.Image,
          hint: `Поговорить с ${n.def.name} (E)`,
          onUse: () => this.talkTo(n),
        };
        closestDist = d;
      }
    }
    // Other interactables
    for (const it of this.interactables) {
      const o = it.obj as any;
      if (!o.visible) continue;
      const dx = o.x - cx;
      const dy = o.y - cy;
      const d = dx * dx + dy * dy;
      if (d < closestDist) {
        closest = it;
        closestDist = d;
      }
    }
    this.currentHint = closest;
    if (closest) {
      this.hintLabel.setText(closest.hint);
      this.hintLabel.setPosition(this.scale.width / 2, this.scale.height - 60);
      this.hintLabel.setAlpha(1);
    } else {
      this.hintLabel.setAlpha(0);
    }
  }

  private rotateWeather() {
    const order: Array<'clear' | 'cloudy' | 'rain' | 'fog' | 'storm'> = [
      'clear',
      'clear',
      'cloudy',
      'rain',
      'fog',
      'clear',
      'storm',
    ];
    const next = order[(Math.random() * order.length) | 0];
    useGameStore.getState().setWeather(next);
  }
}
