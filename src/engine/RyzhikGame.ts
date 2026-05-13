import {
  Application,
  Container,
  Graphics,
  Text,
  type FederatedPointerEvent,
} from 'pixi.js';
import {
  LOCATIONS,
  NPCS,
  WORLD_HEIGHT,
  WORLD_OBJECTS,
  WORLD_WIDTH,
  phaseFromMinute,
} from '../content/world';
import type { AudioDirector } from '../lib/audio';
import { useGameStore } from '../store/gameStore';
import type { CatAction, DayPhase, GameFlags, LocationId, NpcDefinition, Vec2, Weather, WorldObject } from '../types/game';

interface Particle {
  g: Graphics;
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
  maxLife: number;
  kind: 'firefly' | 'leaf' | 'rain' | 'mist' | 'spark';
}

interface NpcActor {
  npc: NpcDefinition;
  node: Container;
  body: Graphics;
  label: Text;
  x: number;
  y: number;
  seed: number;
}

interface ObjectActor {
  object: WorldObject;
  node: Container;
  icon: Graphics;
  label: Text;
}

const groundY = 700;
const interactRadius = 95;

const lerp = (a: number, b: number, t: number) => a + (b - a) * t;
const clamp = (value: number, min: number, max: number) => Math.max(min, Math.min(max, value));

const colorByPhase = (phase: DayPhase) => {
  switch (phase) {
    case 'morning':
      return { tint: 0xffefd2, overlay: 0xffd9a5, alpha: 0.12 };
    case 'day':
      return { tint: 0xffffff, overlay: 0x96d8ff, alpha: 0.06 };
    case 'goldenHour':
      return { tint: 0xffc47a, overlay: 0xff8b50, alpha: 0.2 };
    case 'blueEvening':
      return { tint: 0xb6c7ff, overlay: 0x516199, alpha: 0.22 };
    case 'night':
      return { tint: 0x7f9ce8, overlay: 0x091229, alpha: 0.52 };
  }
};

const locationCenter = (locationId: LocationId) => {
  const location = LOCATIONS.find((entry) => entry.id === locationId) ?? LOCATIONS[0];
  return {
    x: location.bounds.x + location.bounds.width / 2,
    y: groundY - 18,
  };
};

const visibleObject = (object: WorldObject, flags: GameFlags, inventory: string[]) => {
  if (inventory.includes(object.id)) return false;
  if (!object.hiddenUntil) return true;
  return Object.entries(object.hiddenUntil).every(([flag, value]) => flags[flag as keyof GameFlags] === value);
};

export class RyzhikGame {
  private app?: Application;
  private host: HTMLDivElement;
  private audio: AudioDirector;
  private world = new Container();
  private farLayer = new Container();
  private midLayer = new Container();
  private objectLayer = new Container();
  private actorLayer = new Container();
  private particleLayer = new Container();
  private lightLayer = new Container();
  private weatherOverlay = new Graphics();
  private cat = new Container();
  private catBody = new Graphics();
  private catName = new Text({ text: 'Рыжик', style: { fontFamily: 'Inter, sans-serif', fontSize: 15, fill: 0xfff2d8 } });
  private npcs = new Map<string, NpcActor>();
  private objects = new Map<string, ObjectActor>();
  private particles: Particle[] = [];
  private keys = new Set<string>();
  private catPosition: Vec2 = { x: 650, y: groundY - 28 };
  private pointerTarget?: Vec2;
  private cameraX = 0;
  private cameraY = 0;
  private direction = 1;
  private idleTimer = 0;
  private particleTimer = 0;
  private autosaveTimer = 0;
  private cinematicTimer = 0;
  private unsubscribe?: () => void;
  private resizeObserver?: ResizeObserver;

  constructor(host: HTMLDivElement, audio: AudioDirector) {
    this.host = host;
    this.audio = audio;
  }

  async init() {
    this.app = new Application();
    await this.app.init({
      resizeTo: this.host,
      backgroundAlpha: 0,
      antialias: true,
      autoDensity: true,
      resolution: Math.min(window.devicePixelRatio || 1, 2),
    });

    this.host.appendChild(this.app.canvas);
    this.app.stage.eventMode = 'static';
    this.app.stage.hitArea = this.app.screen;
    this.app.stage.on('pointerdown', this.onPointerDown);
    this.app.stage.on('pointermove', this.onPointerMove);
    window.addEventListener('keydown', this.onKeyDown);
    window.addEventListener('keyup', this.onKeyUp);
    this.resizeObserver = new ResizeObserver(() => this.layout());
    this.resizeObserver.observe(this.host);

    this.buildWorld();
    this.buildActors();
    this.app.stage.addChild(this.world, this.weatherOverlay);
    this.world.addChild(this.farLayer, this.midLayer, this.objectLayer, this.actorLayer, this.particleLayer, this.lightLayer);
    this.actorLayer.addChild(this.cat);
    this.cat.addChild(this.catBody, this.catName);
    this.catName.anchor.set(0.5);
    this.catName.y = -80;
    this.drawCat(0);
    this.layout();

    this.unsubscribe = useGameStore.subscribe((state) => {
      const phase = phaseFromMinute(state.dayMinute);
      this.audio.setScene(state.location, phase, state.weather);
      this.updateVisibility();
      this.drawLighting(phase, state.weather);
    });

    const initial = useGameStore.getState();
    this.audio.setScene(initial.location, phaseFromMinute(initial.dayMinute), initial.weather);
    this.drawLighting(phaseFromMinute(initial.dayMinute), initial.weather);
    this.updateVisibility();

    this.app.ticker.add((ticker) => this.update(ticker.deltaMS / 1000));
  }

  destroy() {
    this.unsubscribe?.();
    this.resizeObserver?.disconnect();
    window.removeEventListener('keydown', this.onKeyDown);
    window.removeEventListener('keyup', this.onKeyUp);
    this.app?.stage.off('pointerdown', this.onPointerDown);
    this.app?.stage.off('pointermove', this.onPointerMove);
    this.audio.stop();
    this.app?.destroy(true);
  }

  private layout() {
    if (!this.app) return;
    this.app.stage.hitArea = this.app.screen;
    this.weatherOverlay.clear().rect(0, 0, this.app.screen.width, this.app.screen.height).fill({ color: 0x000000, alpha: 0 });
  }

  private buildWorld() {
    LOCATIONS.forEach((location, index) => {
      const { bounds, palette } = location;
      const sky = new Graphics();
      sky.rect(bounds.x, 0, bounds.width, WORLD_HEIGHT).fill(palette.sky);
      this.farLayer.addChild(sky);

      for (let band = 0; band < 8; band += 1) {
        const mist = new Graphics();
        mist
          .rect(bounds.x, 80 + band * 64, bounds.width, 42)
          .fill({ color: band % 2 ? 0xffffff : palette.accent, alpha: 0.035 + band * 0.004 });
        mist.x = index * 16;
        this.farLayer.addChild(mist);
      }

      this.drawLocationBackdrop(location.id);

      const ground = new Graphics();
      ground
        .roundRect(bounds.x - 20, groundY - 12, bounds.width + 40, 220, 44)
        .fill({ color: palette.ground, alpha: 1 })
        .roundRect(bounds.x - 20, groundY - 24, bounds.width + 40, 42, 24)
        .fill({ color: palette.accent, alpha: 0.22 });
      this.midLayer.addChild(ground);

      for (let i = 0; i < 65; i += 1) {
        const blade = new Graphics();
        const x = bounds.x + 18 + Math.random() * (bounds.width - 36);
        const y = groundY + Math.random() * 70;
        const h = 10 + Math.random() * 34;
        blade.moveTo(x, y).quadraticCurveTo(x + 5, y - h * 0.5, x + Math.sin(i) * 9, y - h).stroke({
          width: 1.5 + Math.random() * 1.5,
          color: index === 4 ? 0x9ce6a3 : 0xbadf86,
          alpha: 0.45,
        });
        this.midLayer.addChild(blade);
      }

      const title = new Text({
        text: location.title,
        style: {
          fontFamily: 'Inter, sans-serif',
          fontSize: 28,
          fontWeight: '700',
          fill: 0xfff1d8,
          dropShadow: { color: 0x1d1320, alpha: 0.7, blur: 6, distance: 2 },
        },
      });
      title.x = bounds.x + 42;
      title.y = 70;
      this.farLayer.addChild(title);
    });

    this.drawWorldProps();
  }

  private drawLocationBackdrop(locationId: LocationId) {
    const location = LOCATIONS.find((entry) => entry.id === locationId);
    if (!location) return;
    const { bounds, palette } = location;

    if (locationId === 'house') {
      const house = new Graphics();
      house
        .roundRect(bounds.x + 155, 225, 780, 440, 30)
        .fill({ color: 0x6d3f35, alpha: 1 })
        .poly([bounds.x + 110, 240, bounds.x + 545, 95, bounds.x + 982, 240])
        .fill({ color: 0x3f2631, alpha: 1 })
        .rect(bounds.x + 245, 372, 130, 170)
        .fill({ color: 0x211825, alpha: 0.9 })
        .rect(bounds.x + 455, 320, 118, 92)
        .fill({ color: 0xffd88b, alpha: 0.85 })
        .rect(bounds.x + 650, 340, 112, 86)
        .fill({ color: 0xf9b66b, alpha: 0.78 })
        .roundRect(bounds.x + 820, 420, 310, 176, 18)
        .fill({ color: 0x59362c, alpha: 0.92 });
      this.midLayer.addChild(house);

      this.drawStringLights(bounds.x + 250, 318, 760, palette.accent);
      this.drawTree(bounds.x + 1120, 600, 1.15, 0x385237);
    }

    if (locationId === 'yard') {
      this.drawTree(bounds.x + 230, 610, 1.35, 0x476735);
      this.drawTree(bounds.x + 980, 625, 1.15, 0x496f45);
      const shed = new Graphics();
      shed
        .roundRect(bounds.x + 470, 410, 300, 220, 18)
        .fill({ color: 0x67443a, alpha: 1 })
        .poly([bounds.x + 438, 420, bounds.x + 620, 310, bounds.x + 805, 420])
        .fill({ color: 0x332532, alpha: 1 });
      this.midLayer.addChild(shed);
      this.drawCampfire(bounds.x + 930, 654);
      this.drawStringLights(bounds.x + 120, 292, 1040, 0xffe3a5);
      this.drawHammock(bounds.x + 170, 570);
    }

    if (locationId === 'forest') {
      for (let i = 0; i < 24; i += 1) {
        this.drawTree(bounds.x + 40 + i * 54 + Math.sin(i) * 28, 610 + Math.cos(i) * 22, 0.85 + (i % 5) * 0.08, 0x254633);
      }
      const well = new Graphics();
      well
        .ellipse(bounds.x + 650, 650, 80, 28)
        .fill({ color: 0x1a221f, alpha: 0.95 })
        .rect(bounds.x + 585, 560, 130, 90)
        .fill({ color: 0x515450, alpha: 0.8 })
        .poly([bounds.x + 560, 560, bounds.x + 650, 470, bounds.x + 740, 560])
        .fill({ color: 0x30243a, alpha: 0.9 });
      this.midLayer.addChild(well);
    }

    if (locationId === 'pond') {
      const pond = new Graphics();
      pond
        .ellipse(bounds.x + 570, 690, 420, 130)
        .fill({ color: 0x163f69, alpha: 0.88 })
        .ellipse(bounds.x + 570, 675, 375, 96)
        .fill({ color: 0x4fb1bd, alpha: 0.46 })
        .roundRect(bounds.x + 170, 595, 520, 34, 12)
        .fill({ color: 0x8d684b, alpha: 1 });
      this.midLayer.addChild(pond);
      for (let i = 0; i < 18; i += 1) {
        const lily = new Graphics();
        lily
          .ellipse(bounds.x + 255 + Math.random() * 650, 640 + Math.random() * 105, 22, 9)
          .fill({ color: 0x98d79b, alpha: 0.8 })
          .circle(bounds.x + 255 + Math.random() * 650, 640 + Math.random() * 105, 5)
          .fill({ color: 0xf8d7ff, alpha: 0.9 });
        this.midLayer.addChild(lily);
      }
    }

    if (locationId === 'greenhouse') {
      const glass = new Graphics();
      glass
        .roundRect(bounds.x + 210, 255, 700, 400, 26)
        .fill({ color: 0x9de6c1, alpha: 0.28 })
        .poly([bounds.x + 180, 260, bounds.x + 560, 95, bounds.x + 940, 260])
        .fill({ color: 0xa9ffe6, alpha: 0.18 })
        .rect(bounds.x + 540, 368, 88, 280)
        .fill({ color: 0x183b34, alpha: 0.78 });
      for (let i = 0; i < 8; i += 1) {
        glass.moveTo(bounds.x + 245 + i * 85, 265).lineTo(bounds.x + 245 + i * 85, 650).stroke({
          width: 2,
          color: 0xd5fff0,
          alpha: 0.38,
        });
      }
      this.midLayer.addChild(glass);
      for (let i = 0; i < 12; i += 1) {
        const plant = new Graphics();
        const x = bounds.x + 265 + i * 48;
        plant
          .moveTo(x, 660)
          .quadraticCurveTo(x + Math.sin(i) * 30, 590, x + Math.cos(i) * 42, 520)
          .stroke({ width: 4, color: 0x88e488, alpha: 0.85 })
          .ellipse(x + Math.cos(i) * 42, 520, 18, 34)
          .fill({ color: i % 2 ? 0xc4ffbf : 0xffc4f1, alpha: 0.76 });
        this.midLayer.addChild(plant);
      }
    }
  }

  private drawWorldProps() {
    const pc = new Graphics();
    pc.roundRect(860, 590, 95, 60, 10).fill({ color: 0x2c2e41, alpha: 1 }).rect(884, 604, 47, 24).fill({
      color: 0x9be4ff,
      alpha: 0.72,
    });
    this.midLayer.addChild(pc);

    const speakers = new Graphics();
    speakers
      .roundRect(1030, 560, 58, 120, 12)
      .fill({ color: 0x17151f, alpha: 1 })
      .circle(1059, 595, 18)
      .fill({ color: 0xffa95d, alpha: 0.8 })
      .circle(1059, 640, 23)
      .fill({ color: 0xffd088, alpha: 0.7 });
    this.midLayer.addChild(speakers);

    const greenhouseDoor = new Graphics();
    greenhouseDoor.roundRect(5588, 375, 96, 280, 24).fill({ color: 0x142c29, alpha: 0.9 });
    this.midLayer.addChild(greenhouseDoor);
  }

  private drawTree(x: number, y: number, scale: number, leafColor: number) {
    const tree = new Graphics();
    tree
      .roundRect(x - 18 * scale, y - 160 * scale, 36 * scale, 170 * scale, 18 * scale)
      .fill({ color: 0x5e3c2f, alpha: 1 });
    for (let i = 0; i < 5; i += 1) {
      tree.circle(x + (i - 2) * 34 * scale, y - 195 * scale + Math.sin(i) * 20 * scale, 76 * scale).fill({
        color: leafColor,
        alpha: 0.86,
      });
    }
    this.midLayer.addChild(tree);
  }

  private drawStringLights(x: number, y: number, width: number, color: number) {
    const lights = new Graphics();
    lights.moveTo(x, y).quadraticCurveTo(x + width / 2, y + 70, x + width, y).stroke({
      width: 3,
      color: 0x3c2731,
      alpha: 0.85,
    });
    for (let i = 0; i <= 13; i += 1) {
      const t = i / 13;
      const lx = x + t * width;
      const ly = y + Math.sin(t * Math.PI) * 54;
      lights.circle(lx, ly, 9).fill({ color, alpha: 0.75 });
      lights.circle(lx, ly, 21).fill({ color, alpha: 0.11 });
    }
    this.lightLayer.addChild(lights);
  }

  private drawCampfire(x: number, y: number) {
    const fire = new Graphics();
    fire
      .ellipse(x, y + 25, 90, 24)
      .fill({ color: 0x1d1620, alpha: 0.45 })
      .circle(x, y, 60)
      .fill({ color: 0xff8a3d, alpha: 0.13 })
      .poly([x - 34, y + 18, x, y - 75, x + 34, y + 18])
      .fill({ color: 0xff9346, alpha: 0.85 })
      .poly([x - 18, y + 10, x + 4, y - 45, x + 25, y + 10])
      .fill({ color: 0xffe6a5, alpha: 0.9 });
    this.lightLayer.addChild(fire);
  }

  private drawHammock(x: number, y: number) {
    const hammock = new Graphics();
    hammock
      .moveTo(x, y)
      .quadraticCurveTo(x + 160, y + 90, x + 320, y)
      .stroke({ width: 9, color: 0xffd9b0, alpha: 0.85 })
      .moveTo(x, y)
      .lineTo(x - 24, y - 120)
      .stroke({ width: 5, color: 0x69412f, alpha: 0.9 })
      .moveTo(x + 320, y)
      .lineTo(x + 354, y - 118)
      .stroke({ width: 5, color: 0x69412f, alpha: 0.9 });
    this.midLayer.addChild(hammock);
  }

  private buildActors() {
    NPCS.forEach((npc, index) => {
      const start = locationCenter(npc.schedule.morning);
      const node = new Container();
      const body = new Graphics();
      const label = new Text({
        text: npc.name,
        style: {
          fontFamily: 'Inter, sans-serif',
          fontSize: 14,
          fontWeight: '700',
          fill: 0xfdf4d1,
          dropShadow: { color: 0x1a1020, alpha: 0.8, blur: 5, distance: 2 },
        },
      });
      label.anchor.set(0.5);
      label.y = -88;
      node.addChild(body, label);
      this.drawNpc(body, index);
      node.x = start.x + (index % 4) * 45 - 80;
      node.y = start.y + Math.floor(index / 4) * 24;
      this.actorLayer.addChild(node);
      this.npcs.set(npc.id, {
        npc,
        node,
        body,
        label,
        x: node.x,
        y: node.y,
        seed: index * 19.7,
      });
    });

    WORLD_OBJECTS.forEach((object) => {
      const node = new Container();
      const icon = new Graphics();
      const label = new Text({
        text: object.title,
        style: { fontFamily: 'Inter, sans-serif', fontSize: 12, fill: 0xfff5dc },
      });
      label.anchor.set(0.5);
      label.y = -34;
      label.visible = false;
      node.addChild(icon, label);
      node.x = object.position.x;
      node.y = object.position.y;
      this.drawObjectIcon(icon, object);
      this.objectLayer.addChild(node);
      this.objects.set(object.id, { object, node, icon, label });
    });
  }

  private drawNpc(target: Graphics, index: number) {
    const colors = [0xf3d6a7, 0x22222b, 0x7aa382, 0xff8fc7, 0x554b80, 0x9e8f6b, 0x4a5360, 0x242231, 0xe54b4b, 0x765141];
    target
      .ellipse(0, -18, 26, 42)
      .fill({ color: colors[index % colors.length], alpha: 0.98 })
      .circle(0, -66, 22)
      .fill({ color: 0xffd3b5, alpha: 1 })
      .roundRect(-20, -92, 40, 20, 10)
      .fill({ color: index === 0 ? 0xf5d37a : index === 3 ? 0xff7fc7 : 0x2a2530, alpha: 1 })
      .ellipse(-8, -69, 3, 4)
      .fill({ color: 0x261820, alpha: 1 })
      .ellipse(9, -69, 3, 4)
      .fill({ color: 0x261820, alpha: 1 });
  }

  private drawObjectIcon(target: Graphics, object: WorldObject) {
    const color = {
      cassette: 0xffbd6a,
      photo: 0xf7f2d5,
      note: 0xf4d8a8,
      toy: 0xff8ac9,
      plant: 0xa7e878,
      tool: 0xb9c1cf,
      memory: 0xbda4ff,
      decor: 0xffde7a,
      quest: 0xff8763,
      fish: 0x82d4ff,
      firefly: 0xeaff8f,
    }[object.kind];

    if (object.kind === 'firefly') {
      target.circle(0, 0, 28).fill({ color, alpha: 0.18 }).circle(0, 0, 9).fill({ color, alpha: 0.9 });
      return;
    }

    target
      .circle(0, 0, 26)
      .fill({ color, alpha: 0.2 })
      .roundRect(-16, -12, 32, 24, 7)
      .fill({ color, alpha: 0.92 })
      .circle(-8, -1, 3)
      .fill({ color: 0x231725, alpha: 0.55 })
      .circle(8, -1, 3)
      .fill({ color: 0x231725, alpha: 0.55 });
  }

  private drawCat(time: number) {
    const state = useGameStore.getState();
    const bob = Math.sin(time * 8) * (state.catAction === 'run' ? 4 : 2);
    const tailWave = Math.sin(time * 5) * 8;
    this.catBody.clear();
    this.catBody
      .ellipse(0, -26 + bob, 44, 27)
      .fill({ color: 0xd86f24, alpha: 1 })
      .ellipse(18, -42 + bob, 28, 24)
      .fill({ color: 0xe57d2a, alpha: 1 })
      .ellipse(24, -38 + bob, 14, 11)
      .fill({ color: 0xffefe0, alpha: 1 })
      .poly([4, -62 + bob, 12, -88 + bob, 23, -61 + bob])
      .fill({ color: 0xd86f24, alpha: 1 })
      .poly([32, -62 + bob, 47, -85 + bob, 47, -55 + bob])
      .fill({ color: 0xd86f24, alpha: 1 })
      .circle(14, -44 + bob, 3.3)
      .fill({ color: 0xffc66e, alpha: 1 })
      .circle(33, -44 + bob, 3.3)
      .fill({ color: 0xffc66e, alpha: 1 })
      .moveTo(-36, -28 + bob)
      .quadraticCurveTo(-78, -58 + bob + tailWave, -58, -92 + bob)
      .stroke({ width: 14, color: 0xd86f24, alpha: 1 })
      .roundRect(-24, -8 + bob, 12, 30, 6)
      .fill({ color: 0xc85f20, alpha: 1 })
      .roundRect(12, -8 - bob * 0.2, 12, 30, 6)
      .fill({ color: 0xc85f20, alpha: 1 });

    if (state.catAction === 'purr' || state.catAction === 'sleep') {
      this.catBody.circle(-4, -82, 6 + Math.sin(time * 4) * 1.5).fill({ color: 0xffe9ae, alpha: 0.25 });
      this.catBody.circle(-24, -97, 4).fill({ color: 0xffe9ae, alpha: 0.18 });
    }
  }

  private update(dt: number) {
    if (!this.app) return;
    const state = useGameStore.getState();
    const phase = phaseFromMinute(state.dayMinute);
    const time = performance.now() / 1000;

    useGameStore.getState().tick(dt * 2.3);
    this.updateCat(dt, time);
    this.updateNpcs(dt, time, phase);
    this.updateObjects(time);
    this.updateCamera(dt);
    this.updateParticles(dt, time, state.weather, phase);
    this.drawCat(time);
    this.drawLighting(phase, state.weather);

    this.autosaveTimer += dt;
    if (this.autosaveTimer > 10) {
      this.autosaveTimer = 0;
      useGameStore.getState().save();
    }
  }

  private updateCat(dt: number, time: number) {
    const state = useGameStore.getState();
    let dx = 0;
    let dy = 0;
    if (this.keys.has('arrowleft') || this.keys.has('a')) dx -= 1;
    if (this.keys.has('arrowright') || this.keys.has('d')) dx += 1;
    if (this.keys.has('arrowup') || this.keys.has('w')) dy -= 1;
    if (this.keys.has('arrowdown') || this.keys.has('s')) dy += 1;

    if (this.pointerTarget && dx === 0 && dy === 0) {
      const tx = this.pointerTarget.x - this.catPosition.x;
      const ty = this.pointerTarget.y - this.catPosition.y;
      const distance = Math.hypot(tx, ty);
      if (distance > 8) {
        dx = tx / distance;
        dy = ty / distance;
      } else {
        this.pointerTarget = undefined;
      }
    }

    const moving = Math.hypot(dx, dy) > 0.1;
    const running = this.keys.has('shift');
    const speed = running ? 360 : 210;
    if (moving) {
      const length = Math.hypot(dx, dy);
      this.catPosition.x += (dx / length) * speed * dt;
      this.catPosition.y += (dy / length) * speed * dt * 0.62;
      this.direction = dx >= 0 ? 1 : -1;
      this.idleTimer = 0;
      useGameStore.getState().setCatState(state.weather === 'rain' ? 'cozy' : 'curious', running ? 'run' : 'walk');
    } else {
      this.idleTimer += dt;
      if (this.idleTimer > 4.5) {
        const cozyActions = state.weather === 'storm' ? ['stormScare'] : ['stretch', 'purr', 'sleep', 'window', 'keyboard'];
        const action = cozyActions[Math.floor((time * 0.37) % cozyActions.length)] as CatAction;
        useGameStore.getState().setCatState(state.weather === 'storm' ? 'scared' : 'cozy', action);
        if (action === 'purr') this.audio.pulsePurr();
        this.idleTimer = -2;
      }
    }

    this.catPosition.x = clamp(this.catPosition.x, 80, WORLD_WIDTH - 120);
    this.catPosition.y = clamp(this.catPosition.y, 520, 760);

    const greenhouse = LOCATIONS.find((location) => location.id === 'greenhouse')!;
    if (!state.flags.greenhouseOpen && this.catPosition.x > greenhouse.bounds.x - 40) {
      this.catPosition.x = greenhouse.bounds.x - 42;
      useGameStore.getState().setLocation('greenhouse');
    }

    const currentLocation = LOCATIONS.find(
      (location) => this.catPosition.x >= location.bounds.x && this.catPosition.x < location.bounds.x + location.bounds.width,
    );
    if (currentLocation && currentLocation.id !== state.location) useGameStore.getState().setLocation(currentLocation.id);

    this.cat.x = this.catPosition.x;
    this.cat.y = this.catPosition.y;
    this.cat.scale.x = this.direction;
    this.catName.scale.x = this.direction;
  }

  private updateNpcs(dt: number, time: number, phase: DayPhase) {
    this.npcs.forEach((actor, id) => {
      const state = useGameStore.getState();
      const scheduledLocation = actor.npc.schedule[phase];
      const destination = locationCenter(scheduledLocation);
      const offset = {
        x: Math.sin(time * 0.15 + actor.seed) * 180 + (actor.seed % 70),
        y: Math.cos(time * 0.2 + actor.seed) * 38,
      };
      actor.x = lerp(actor.x, destination.x + offset.x, dt * 0.1);
      actor.y = lerp(actor.y, destination.y + offset.y, dt * 0.08);
      if (state.weather === 'rain' || state.weather === 'storm') {
        const house = locationCenter('house');
        actor.x = lerp(actor.x, house.x + (actor.seed % 260) - 130, dt * 0.16);
        actor.y = lerp(actor.y, house.y + (actor.seed % 80) - 20, dt * 0.16);
      }
      if (state.flags.finalNightUnlocked && phase === 'night') {
        const yard = locationCenter('yard');
        actor.x = lerp(actor.x, yard.x + (actor.seed % 460) - 230, dt * 0.2);
        actor.y = lerp(actor.y, yard.y + (actor.seed % 80), dt * 0.2);
      }
      actor.node.x = actor.x;
      actor.node.y = actor.y;
      actor.node.scale.x = Math.sin(time + actor.seed) > 0 ? 1 : -1;
      actor.label.scale.x = actor.node.scale.x;
      actor.label.visible = Math.hypot(actor.x - this.catPosition.x, actor.y - this.catPosition.y) < interactRadius;
      if (id === state.focusedNpcId) actor.label.visible = true;
    });
  }

  private updateObjects(time: number) {
    const state = useGameStore.getState();
    this.objects.forEach((actor) => {
      const near = Math.hypot(actor.node.x - this.catPosition.x, actor.node.y - this.catPosition.y) < interactRadius;
      actor.label.visible = near;
      actor.node.y = actor.object.position.y + Math.sin(time * 2.3 + actor.object.position.x) * (actor.object.kind === 'firefly' ? 18 : 3);
      actor.node.alpha = near ? 1 : 0.72;
      actor.node.scale.set(near ? 1.16 : 1);
      if (actor.object.kind === 'firefly' && state.firefliesFollowing > 0) {
        actor.node.alpha = 0.28;
      }
    });
  }

  private updateCamera(dt: number) {
    if (!this.app) return;
    const targetX = clamp(this.catPosition.x - this.app.screen.width * 0.48, 0, WORLD_WIDTH - this.app.screen.width);
    const targetY = clamp(this.catPosition.y - this.app.screen.height * 0.68, 0, WORLD_HEIGHT - this.app.screen.height);
    this.cameraX = lerp(this.cameraX, targetX, dt * 3.4);
    this.cameraY = lerp(this.cameraY, targetY, dt * 2.5);
    this.world.x = -this.cameraX;
    this.world.y = -this.cameraY;
  }

  private updateParticles(dt: number, time: number, weather: Weather, phase: DayPhase) {
    this.particleTimer += dt;
    const spawnRate = weather === 'storm' ? 0.012 : weather === 'rain' ? 0.02 : phase === 'night' ? 0.045 : 0.08;
    while (this.particleTimer > spawnRate) {
      this.particleTimer -= spawnRate;
      if (weather === 'rain' || weather === 'storm') this.spawnParticle('rain');
      else if (weather === 'fog') this.spawnParticle('mist');
      else if (phase === 'night') this.spawnParticle('firefly');
      else if (weather === 'wind') this.spawnParticle('leaf');
      if (useGameStore.getState().flags.finalNightUnlocked && phase === 'night') this.spawnParticle('spark');
    }

    for (let i = this.particles.length - 1; i >= 0; i -= 1) {
      const particle = this.particles[i];
      particle.life -= dt;
      particle.x += particle.vx * dt;
      particle.y += particle.vy * dt;
      particle.g.x = particle.x;
      particle.g.y = particle.y;
      particle.g.alpha = clamp(particle.life / particle.maxLife, 0, 1);
      if (particle.kind === 'firefly' || particle.kind === 'spark') {
        particle.g.scale.set(0.8 + Math.sin(time * 6 + particle.x) * 0.22);
      }
      if (particle.life <= 0 || particle.y > WORLD_HEIGHT + 80) {
        this.particleLayer.removeChild(particle.g);
        particle.g.destroy();
        this.particles.splice(i, 1);
      }
    }
  }

  private spawnParticle(kind: Particle['kind']) {
    if (!this.app || this.particles.length > 420) return;
    const g = new Graphics();
    const worldLeft = this.cameraX - 120;
    const worldRight = this.cameraX + this.app.screen.width + 120;
    const x = worldLeft + Math.random() * (worldRight - worldLeft);
    let y = this.cameraY - 40 + Math.random() * this.app.screen.height;
    let vx = 0;
    let vy = 0;
    let life = 2;

    if (kind === 'rain') {
      y = this.cameraY - 80;
      vx = -120;
      vy = 760 + Math.random() * 220;
      life = 1.15;
      g.moveTo(0, 0).lineTo(-13, 38).stroke({ width: 2, color: 0xb9dcff, alpha: 0.55 });
    } else if (kind === 'mist') {
      vx = 20 + Math.random() * 42;
      vy = -4 + Math.random() * 8;
      life = 5.5;
      g.ellipse(0, 0, 95, 20).fill({ color: 0xd9fff3, alpha: 0.1 });
    } else if (kind === 'leaf') {
      vx = 120 + Math.random() * 80;
      vy = 18 + Math.random() * 35;
      life = 4;
      g.ellipse(0, 0, 7, 3).fill({ color: 0xf1a256, alpha: 0.75 });
    } else if (kind === 'spark') {
      vx = -20 + Math.random() * 40;
      vy = -30 + Math.random() * 16;
      life = 3.2;
      g.circle(0, 0, 5 + Math.random() * 5).fill({ color: 0xfff1a2, alpha: 0.85 }).circle(0, 0, 22).fill({
        color: 0xffd475,
        alpha: 0.12,
      });
    } else {
      vx = -20 + Math.random() * 40;
      vy = -14 + Math.random() * 28;
      life = 4.2;
      g.circle(0, 0, 4).fill({ color: 0xeaff8f, alpha: 0.95 }).circle(0, 0, 18).fill({ color: 0xeaff8f, alpha: 0.16 });
    }

    this.particleLayer.addChild(g);
    this.particles.push({ g, x, y, vx, vy, life, maxLife: life, kind });
  }

  private drawLighting(phase: DayPhase, weather: Weather) {
    if (!this.app) return;
    const light = colorByPhase(phase);
    const weatherAlpha = weather === 'storm' ? 0.22 : weather === 'rain' ? 0.16 : weather === 'fog' ? 0.08 : 0;
    this.weatherOverlay
      .clear()
      .rect(0, 0, this.app.screen.width, this.app.screen.height)
      .fill({ color: light.overlay, alpha: light.alpha + weatherAlpha })
      .circle(this.app.screen.width * 0.72, this.app.screen.height * 0.18, phase === 'night' ? 90 : 150)
      .fill({
        color: phase === 'night' ? 0xe9edff : 0xffd08c,
        alpha: phase === 'night' ? 0.12 : 0.18,
      });

    if (weather === 'storm') {
      this.cinematicTimer += 1;
      if (this.cinematicTimer % 160 < 8) {
        this.weatherOverlay.rect(0, 0, this.app.screen.width, this.app.screen.height).fill({ color: 0xe9f5ff, alpha: 0.2 });
      }
    }
  }

  private updateVisibility() {
    const state = useGameStore.getState();
    this.objects.forEach((actor) => {
      actor.node.visible = visibleObject(actor.object, state.flags, state.inventory);
    });
  }

  private interact() {
    const state = useGameStore.getState();
    const nearbyObject = [...this.objects.values()]
      .filter((actor) => actor.node.visible)
      .sort(
        (a, b) =>
          Math.hypot(a.node.x - this.catPosition.x, a.node.y - this.catPosition.y) -
          Math.hypot(b.node.x - this.catPosition.x, b.node.y - this.catPosition.y),
      )[0];
    if (nearbyObject && Math.hypot(nearbyObject.node.x - this.catPosition.x, nearbyObject.node.y - this.catPosition.y) < interactRadius) {
      if (nearbyObject.object.id === 'firefly-cluster') {
        useGameStore.getState().catchFirefly();
        this.audio.playChime();
        return;
      }
      if (nearbyObject.object.collectable) {
        useGameStore.getState().collectObject(nearbyObject.object.id);
        this.audio.playCollect();
      } else {
        useGameStore.getState().interactWithObject(nearbyObject.object.id);
        this.audio.playChime();
      }
      return;
    }

    const nearbyNpc = [...this.npcs.values()].sort(
      (a, b) =>
        Math.hypot(a.x - this.catPosition.x, a.y - this.catPosition.y) -
        Math.hypot(b.x - this.catPosition.x, b.y - this.catPosition.y),
    )[0];
    if (nearbyNpc && Math.hypot(nearbyNpc.x - this.catPosition.x, nearbyNpc.y - this.catPosition.y) < interactRadius + 10) {
      useGameStore.getState().interactWithNpc(nearbyNpc.npc.id);
      this.audio.playChime();
      return;
    }

    useGameStore.getState().setCatState(state.weather === 'storm' ? 'scared' : 'cozy', 'purr');
    this.audio.pulsePurr();
  }

  private onPointerDown = async (event: FederatedPointerEvent) => {
    await this.audio.start();
    const worldPoint = {
      x: event.global.x + this.cameraX,
      y: event.global.y + this.cameraY,
    };
    const tappedActor = [...this.objects.values(), ...this.npcs.values()].find((actor) => {
      const x = 'object' in actor ? actor.node.x : actor.x;
      const y = 'object' in actor ? actor.node.y : actor.y;
      return Math.hypot(x - worldPoint.x, y - worldPoint.y) < interactRadius;
    });

    if (tappedActor && Math.hypot(worldPoint.x - this.catPosition.x, worldPoint.y - this.catPosition.y) < interactRadius * 1.8) {
      this.interact();
      return;
    }

    this.pointerTarget = {
      x: clamp(worldPoint.x, 60, WORLD_WIDTH - 80),
      y: clamp(worldPoint.y, 520, 760),
    };
  };

  private onPointerMove = () => {
    this.host.style.cursor = 'pointer';
  };

  private onKeyDown = async (event: KeyboardEvent) => {
    const key = event.key.toLowerCase();
    this.keys.add(key);
    if ([' ', 'e'].includes(key)) {
      event.preventDefault();
      await this.audio.start();
      this.interact();
    }
    if (key === 'p') {
      useGameStore.getState().setCatState('cozy', 'purr');
      this.audio.pulsePurr();
    }
    if (key === 'f') useGameStore.getState().togglePhotoMode();
    if (key === 'j') useGameStore.getState().togglePanel('journal');
    if (key === 'm') useGameStore.getState().togglePanel('map');
    if (key === 'c') useGameStore.getState().togglePanel('collection');
    if (key === 'r') useGameStore.getState().cycleWeather();
    if (key === 't') useGameStore.getState().cycleSeason();
  };

  private onKeyUp = (event: KeyboardEvent) => {
    this.keys.delete(event.key.toLowerCase());
  };
}
