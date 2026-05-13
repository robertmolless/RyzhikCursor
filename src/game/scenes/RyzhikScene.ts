import Phaser from 'phaser';
import { AudioDirector } from '../../audio/AudioDirector';
import { collectibles, locations, npcs, quests } from '../content';
import type { CatIntent, DayPhase, LocationId, NpcDefinition, NpcId, Season, Vec2, Weather } from '../types';
import { useGameStore } from '../../store/gameStore';
import { telegramBridge } from '../../telegram/telegramBridge';

interface Hotspot {
  id: string;
  label: string;
  location: LocationId;
  x: number;
  y: number;
  radius: number;
  action: () => void;
  require?: () => boolean;
  used?: boolean;
  sprite?: Phaser.GameObjects.GameObject;
}

interface NpcActor {
  definition: NpcDefinition;
  container: Phaser.GameObjects.Container;
  label: Phaser.GameObjects.Text;
  target: Vec2;
  nextDecisionAt: number;
}

interface WeatherParticle {
  line: Phaser.GameObjects.Line;
  speed: number;
}

interface Firefly {
  orb: Phaser.GameObjects.Ellipse;
  home: Vec2;
  phase: number;
  caught: boolean;
}

const worldSize = { width: 3200, height: 2000 };
const locationAnchors: Record<LocationId, Vec2> = {
  oldHouse: { x: 820, y: 930 },
  yard: { x: 1420, y: 1120 },
  forest: { x: 2420, y: 790 },
  pond: { x: 2380, y: 1480 },
  greenhouse: { x: 1860, y: 740 },
  garage: { x: 610, y: 1370 },
  roof: { x: 850, y: 720 },
  attic: { x: 720, y: 780 },
  basement: { x: 880, y: 1110 },
};

const locationZones: Array<{ id: LocationId; x: number; y: number; w: number; h: number }> = [
  { id: 'oldHouse', x: 420, y: 610, w: 760, h: 500 },
  { id: 'yard', x: 1030, y: 810, w: 860, h: 650 },
  { id: 'forest', x: 1940, y: 280, w: 1020, h: 880 },
  { id: 'pond', x: 1950, y: 1210, w: 920, h: 520 },
  { id: 'greenhouse', x: 1620, y: 520, w: 460, h: 360 },
  { id: 'garage', x: 360, y: 1180, w: 480, h: 360 },
  { id: 'roof', x: 620, y: 570, w: 420, h: 160 },
  { id: 'attic', x: 470, y: 700, w: 360, h: 180 },
  { id: 'basement', x: 700, y: 1070, w: 320, h: 170 },
];

const phaseColors: Record<DayPhase, { skyTop: number; skyBottom: number; tint: number; alpha: number }> = {
  morning: { skyTop: 0xffcf9d, skyBottom: 0xbbe7e8, tint: 0xfff2d2, alpha: 0.08 },
  day: { skyTop: 0x87c9f7, skyBottom: 0xdff5d4, tint: 0xffffff, alpha: 0.02 },
  goldenHour: { skyTop: 0xff9b54, skyBottom: 0xffd6a5, tint: 0xff8f4d, alpha: 0.14 },
  blueEvening: { skyTop: 0x42558f, skyBottom: 0xf2a65a, tint: 0x355070, alpha: 0.24 },
  night: { skyTop: 0x10172f, skyBottom: 0x28213f, tint: 0x10182d, alpha: 0.42 },
};

const weatherCycle: Weather[] = ['sun', 'cloudy', 'wind', 'rain', 'fog', 'sun', 'storm', 'sun'];
const seasonCycle: Season[] = ['summer', 'autumn', 'winter', 'spring'];

export class RyzhikScene extends Phaser.Scene {
  private audioDirector = new AudioDirector();
  private cursors?: Phaser.Types.Input.Keyboard.CursorKeys;
  private keyMap?: Record<string, Phaser.Input.Keyboard.Key>;
  private cat!: Phaser.GameObjects.Container;
  private catBody!: Phaser.GameObjects.Ellipse;
  private catTail!: Phaser.GameObjects.Ellipse;
  private catShadow!: Phaser.GameObjects.Ellipse;
  private catName!: Phaser.GameObjects.Text;
  private aiTarget: Vec2 = { x: 1420, y: 1120 };
  private autoPilot = false;
  private lastInputAt = 0;
  private nextCatDecisionAt = 0;
  private hotspots: Hotspot[] = [];
  private npcsActors: NpcActor[] = [];
  private fireflies: Firefly[] = [];
  private rain: WeatherParticle[] = [];
  private clouds: Phaser.GameObjects.Container[] = [];
  private lightGraphics!: Phaser.GameObjects.Graphics;
  private weatherGraphics!: Phaser.GameObjects.Graphics;
  private skyGraphics!: Phaser.GameObjects.Graphics;
  private vignette!: Phaser.GameObjects.Rectangle;
  private timeMinute = 17 * 60;
  private lastClockTick = 0;
  private lastWeatherShift = 0;
  private currentWeatherIndex = 0;
  private currentSeasonIndex = 0;
  private interactLabel!: Phaser.GameObjects.Text;
  private photoOverlay!: Phaser.GameObjects.Rectangle;
  private finaleStarted = false;

  constructor() {
    super('RyzhikScene');
  }

  create() {
    this.cameras.main.setBounds(0, 0, worldSize.width, worldSize.height);
    this.physics.world.setBounds(0, 0, worldSize.width, worldSize.height);
    this.input.setDefaultCursor('url(data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="32" height="32"><text y="22" font-size="22">🐾</text></svg>) 8 8, auto');

    this.createInputs();
    this.createWorld();
    this.createCat();
    this.createNpcs();
    this.createHotspots();
    this.createFireflies();
    this.createWeatherParticles();
    this.createCamera();
    this.createUiAnchors();
    this.updateAtmosphere(true);
    this.audioDirector.update(this.storeAudioInput());
    useGameStore.getState().addDialogue('Рыжик', 'WASD/стрелки — идти, Shift — бежать, E/Space — взаимодействовать, P — мурлыкать, F — фоторежим.');
  }

  update(time: number, delta: number) {
    this.tickClock(time);
    this.handleInput(time, delta);
    this.updateCatAi(time, delta);
    this.updateNpcs(time, delta);
    this.updateFireflies(time);
    this.updateWeather(time, delta);
    this.updateHotspotHint();
    this.depthSort();
    this.updateAtmosphere(false);
    this.updateFinale();
  }

  private createInputs() {
    this.cursors = this.input.keyboard?.createCursorKeys();
    this.keyMap = this.input.keyboard?.addKeys('W,A,S,D,E,SPACE,SHIFT,P,F,J,M,C,ONE,TWO,THREE') as Record<
      string,
      Phaser.Input.Keyboard.Key
    >;

    this.keyMap?.E.on('down', () => this.tryInteract());
    this.keyMap?.SPACE.on('down', () => this.tryInteract());
    this.keyMap?.P.on('down', () => this.purr());
    this.keyMap?.F.on('down', () => {
      useGameStore.getState().togglePhotoMode();
      this.audioDirector.playInteraction('photo');
    });
    this.keyMap?.J.on('down', () => useGameStore.getState().setPanel('journal'));
    this.keyMap?.M.on('down', () => useGameStore.getState().setPanel('map'));
    this.keyMap?.C.on('down', () => useGameStore.getState().setPanel('collection'));
    this.keyMap?.ONE.on('down', () => this.forceWeather('sun'));
    this.keyMap?.TWO.on('down', () => this.forceWeather('rain'));
    this.keyMap?.THREE.on('down', () => this.forceWeather('fog'));
  }

  private createWorld() {
    this.skyGraphics = this.add.graphics().setScrollFactor(0).setDepth(-200);
    this.drawSky();
    this.drawParallaxClouds();
    this.drawGround();
    this.drawForest();
    this.drawPond();
    this.drawHouse();
    this.drawGarageAndShed();
    this.drawYardDetails();
    this.drawGreenhouse();
    this.drawCollectibleMarkers();
    this.weatherGraphics = this.add.graphics().setDepth(5000);
    this.lightGraphics = this.add.graphics().setDepth(4500).setBlendMode(Phaser.BlendModes.ADD);
    this.vignette = this.add.rectangle(0, 0, 10, 10, 0x000000, 0.14).setScrollFactor(0).setDepth(9000);
    this.photoOverlay = this.add.rectangle(0, 0, 10, 10, 0xf8ead5, 0).setScrollFactor(0).setDepth(8900);
  }

  private drawSky() {
    const phase = this.getDayPhase();
    const colors = phaseColors[phase];
    this.skyGraphics.clear();
    this.skyGraphics.fillGradientStyle(colors.skyTop, colors.skyTop, colors.skyBottom, colors.skyBottom, 1);
    this.skyGraphics.fillRect(0, 0, this.scale.width, this.scale.height);
    if (phase === 'night') {
      this.skyGraphics.fillStyle(0xffffff, 0.7);
      for (let i = 0; i < 70; i += 1) {
        const x = (i * 137) % Math.max(1, this.scale.width);
        const y = (i * 61) % Math.max(1, this.scale.height * 0.55);
        this.skyGraphics.fillCircle(x, y, 1 + (i % 3) * 0.4);
      }
    }
  }

  private drawParallaxClouds() {
    for (let i = 0; i < 9; i += 1) {
      const cloud = this.add.container(180 + i * 380, 90 + (i % 3) * 65).setScrollFactor(0.18 + i * 0.015).setDepth(-120);
      for (let j = 0; j < 5; j += 1) {
        const puff = this.add.ellipse(j * 34, Math.sin(j) * 10, 82 - j * 4, 36 + j * 3, 0xffffff, 0.28);
        cloud.add(puff);
      }
      this.tweens.add({
        targets: cloud,
        x: cloud.x + 80,
        duration: 16000 + i * 1800,
        yoyo: true,
        repeat: -1,
        ease: 'Sine.inOut',
      });
      this.clouds.push(cloud);
    }
  }

  private drawGround() {
    const ground = this.add.graphics().setDepth(-60);
    ground.fillGradientStyle(0x88a96b, 0x82a661, 0x52734d, 0x486c44, 1);
    ground.fillRect(0, 0, worldSize.width, worldSize.height);

    this.drawPath(ground, [
      { x: 800, y: 1050 },
      { x: 1160, y: 1160 },
      { x: 1510, y: 1120 },
      { x: 1930, y: 980 },
      { x: 2250, y: 820 },
    ]);
    this.drawPath(ground, [
      { x: 1430, y: 1130 },
      { x: 1680, y: 1340 },
      { x: 2050, y: 1450 },
      { x: 2320, y: 1470 },
    ]);
    this.drawPath(ground, [
      { x: 700, y: 1270 },
      { x: 950, y: 1260 },
      { x: 1240, y: 1180 },
    ]);

    for (let i = 0; i < 780; i += 1) {
      const x = (i * 97) % worldSize.width;
      const y = 450 + ((i * 193) % 1370);
      const autumn = this.getSeason() === 'autumn';
      const color = autumn && i % 5 === 0 ? 0xc77d36 : i % 7 === 0 ? 0xd9ed92 : 0x6a994e;
      const blade = this.add.rectangle(x, y, 2, 10 + (i % 9), color, 0.45).setDepth(y - 4).setRotation((i % 5 - 2) * 0.1);
      this.tweens.add({
        targets: blade,
        rotation: blade.rotation + 0.18,
        duration: 1300 + (i % 11) * 120,
        yoyo: true,
        repeat: -1,
        ease: 'Sine.inOut',
      });
    }
  }

  private drawPath(graphics: Phaser.GameObjects.Graphics, points: Vec2[]) {
    graphics.lineStyle(72, 0xd6b98c, 0.52);
    graphics.beginPath();
    graphics.moveTo(points[0].x, points[0].y);
    points.slice(1).forEach((point) => graphics.lineTo(point.x, point.y));
    graphics.strokePath();
    graphics.lineStyle(46, 0xf0d6a7, 0.48);
    graphics.beginPath();
    graphics.moveTo(points[0].x, points[0].y);
    points.slice(1).forEach((point) => graphics.lineTo(point.x, point.y));
    graphics.strokePath();
  }

  private drawForest() {
    for (let i = 0; i < 95; i += 1) {
      const x = 1850 + ((i * 157) % 1110);
      const y = 230 + ((i * 241) % 890);
      const scale = 0.72 + (i % 9) * 0.07;
      const tree = this.add.container(x, y).setDepth(y);
      const trunk = this.add.rectangle(0, 38 * scale, 18 * scale, 74 * scale, 0x5d4037, 0.95);
      const crownColor = this.treeColor(i);
      const crownBack = this.add.ellipse(-8 * scale, -12 * scale, 92 * scale, 104 * scale, crownColor, 0.72);
      const crownFront = this.add.ellipse(18 * scale, 8 * scale, 82 * scale, 92 * scale, crownColor, 0.82);
      const crownLight = this.add.ellipse(-24 * scale, -30 * scale, 42 * scale, 34 * scale, 0xd9ed92, 0.16);
      tree.add([trunk, crownBack, crownFront, crownLight]);
      this.tweens.add({
        targets: [crownBack, crownFront, crownLight],
        x: `+=${4 + (i % 5)}`,
        duration: 1700 + (i % 7) * 210,
        yoyo: true,
        repeat: -1,
        ease: 'Sine.inOut',
      });
    }

    const well = this.add.container(2140, 930).setDepth(930);
    well.add([
      this.add.ellipse(0, 36, 150, 54, 0x2a3036, 0.48),
      this.add.rectangle(0, 0, 118, 90, 0x6d6875, 0.88),
      this.add.ellipse(0, -45, 126, 54, 0x403d39, 0.9),
      this.add.rectangle(-54, -58, 12, 120, 0x5d4037, 0.9),
      this.add.rectangle(54, -58, 12, 120, 0x5d4037, 0.9),
      this.add.arc(0, -70, 58, 200, 340, false, 0x8d6e63, 0.8),
    ]);
    this.add.text(2070, 1008, 'старый колодец', { fontFamily: 'serif', fontSize: '18px', color: '#efe1c6' }).setDepth(1010);

    const treeHouse = this.add.container(2700, 640).setDepth(640);
    treeHouse.add([
      this.add.rectangle(0, 90, 34, 220, 0x5d4037, 1),
      this.add.ellipse(0, -30, 230, 190, 0x386641, 0.9),
      this.add.rectangle(0, -20, 180, 96, 0x9c6644, 0.95),
      this.add.triangle(0, -94, -110, -26, 110, -26, 0, -118, 0x7f5539, 1),
      this.add.rectangle(-44, -12, 32, 32, 0xffd166, 0.5),
      this.add.rectangle(48, -4, 34, 40, 0x3a2f2a, 0.7),
    ]);
  }

  private treeColor(index: number) {
    const season = this.getSeason();
    if (season === 'autumn') return [0xb5651d, 0xc77d36, 0xe9c46a, 0x7f4f24][index % 4];
    if (season === 'winter') return [0xdde7ee, 0xb7cad5, 0x9fb8c8][index % 3];
    if (season === 'spring') return [0x95d5b2, 0xb7e4c7, 0x74c69d][index % 3];
    return [0x386641, 0x4f772d, 0x588157, 0x6a994e][index % 4];
  }

  private drawPond() {
    const pond = this.add.graphics().setDepth(1340);
    pond.fillStyle(0x2b6f8f, 0.84);
    pond.fillEllipse(2380, 1500, 720, 310);
    pond.fillStyle(0x7bdff2, 0.18);
    for (let i = 0; i < 17; i += 1) {
      pond.fillEllipse(2070 + i * 36, 1450 + Math.sin(i) * 80, 180, 12);
    }
    pond.lineStyle(18, 0xf1c27d, 0.72);
    pond.beginPath();
    pond.moveTo(2050, 1370);
    pond.lineTo(2260, 1450);
    pond.lineTo(2470, 1450);
    pond.strokePath();
    for (let i = 0; i < 15; i += 1) {
      const pad = this.add.ellipse(2130 + (i * 91) % 510, 1425 + (i * 47) % 130, 48, 24, 0x80b918, 0.82).setDepth(1500 + i);
      const flower = this.add.circle(pad.x + 4, pad.y - 4, 5, 0xffc8dd, 0.9).setDepth(pad.depth + 1);
      this.tweens.add({
        targets: [pad, flower],
        y: `+=${6 + (i % 4)}`,
        duration: 1600 + i * 90,
        yoyo: true,
        repeat: -1,
        ease: 'Sine.inOut',
      });
    }
    const boat = this.add.container(2580, 1545).setDepth(1580);
    boat.add([
      this.add.ellipse(0, 0, 180, 42, 0x7f5539, 0.92),
      this.add.rectangle(0, -8, 130, 10, 0x9c6644, 0.9),
      this.add.rectangle(48, -42, 8, 86, 0xf1c27d, 0.8).setRotation(-0.8),
    ]);
  }

  private drawHouse() {
    const house = this.add.container(780, 900).setDepth(960);
    house.add([
      this.add.ellipse(44, 260, 610, 82, 0x1a1414, 0.25),
      this.add.rectangle(0, 48, 520, 310, 0xb08968, 0.97),
      this.add.rectangle(0, -95, 410, 150, 0x9c6644, 0.97),
      this.add.triangle(0, -238, -310, -55, 310, -55, 0, -300, 0x6f1d1b, 1),
      this.add.rectangle(-250, 108, 170, 220, 0x8d6e63, 0.96),
      this.add.rectangle(-250, 12, 160, 30, 0x5d4037, 0.95),
      this.add.rectangle(126, 116, 80, 176, 0x5d4037, 0.96),
      this.add.rectangle(-80, 20, 78, 70, 0xfff3b0, 0.65),
      this.add.rectangle(64, -16, 72, 62, 0xffd166, 0.56),
      this.add.rectangle(-90, -110, 64, 56, 0xfed9b7, 0.45),
      this.add.rectangle(168, -118, 68, 58, 0xffd166, 0.42),
      this.add.rectangle(0, 214, 660, 44, 0x7f5539, 0.96),
    ]);
    for (let i = 0; i < 7; i += 1) {
      house.add(this.add.rectangle(-288 + i * 96, 236, 18, 96, 0x5d4037, 0.94));
    }

    const roofGlow = this.add.ellipse(770, 700, 450, 130, 0xffd166, 0.05).setDepth(820).setBlendMode(Phaser.BlendModes.ADD);
    this.tweens.add({ targets: roofGlow, alpha: 0.16, duration: 2400, yoyo: true, repeat: -1, ease: 'Sine.inOut' });

    const cassetteRoom = this.add.container(1030, 890).setDepth(1000);
    cassetteRoom.add([
      this.add.rectangle(0, 0, 120, 76, 0x312244, 0.84),
      this.add.rectangle(0, -8, 70, 24, 0x1b1b1e, 0.9),
      this.add.circle(-22, -8, 8, 0xf4d35e, 0.65),
      this.add.circle(22, -8, 8, 0xf4d35e, 0.65),
      this.add.rectangle(0, 30, 96, 12, 0xfed9b7, 0.32),
    ]);
  }

  private drawGarageAndShed() {
    const garage = this.add.container(600, 1340).setDepth(1390);
    garage.add([
      this.add.ellipse(12, 150, 420, 70, 0x1a1414, 0.22),
      this.add.rectangle(0, 40, 360, 230, 0x6c584c, 0.98),
      this.add.triangle(0, -115, -210, -60, 210, -60, 0, -150, 0x3a2f2a, 1),
      this.add.rectangle(-54, 70, 190, 150, 0x2f2f36, 0.96),
      this.add.rectangle(112, -4, 78, 72, 0xffd166, 0.38),
      this.add.rectangle(-20, -72, 150, 18, 0xff595e, 0.64),
    ]);
    this.add.text(505, 1236, 'гаражные репетиции', { fontFamily: 'serif', fontSize: '18px', color: '#f7d9c4' }).setDepth(1470);

    const shed = this.add.container(1220, 1420).setDepth(1460);
    shed.add([
      this.add.rectangle(0, 40, 210, 180, 0x7f5539, 0.96),
      this.add.triangle(0, -72, -130, -18, 130, -18, 0, -105, 0x582f0e, 1),
      this.add.rectangle(-38, 66, 64, 116, 0x50352c, 0.95),
      this.add.rectangle(56, 24, 46, 44, 0xffd166, 0.34),
    ]);
    for (let i = 0; i < 8; i += 1) {
      const box = this.add.rectangle(1110 + (i % 4) * 48, 1536 - Math.floor(i / 4) * 44, 44, 38, 0xb08968, 0.9).setDepth(1530 + i);
      box.setStrokeStyle(2, 0x6f4e37, 0.6);
    }
  }

  private drawYardDetails() {
    const fire = this.add.container(1430, 1180).setDepth(1220);
    fire.add([
      this.add.ellipse(0, 40, 190, 58, 0x1a1414, 0.2),
      this.add.ellipse(0, 24, 130, 38, 0x403d39, 0.95),
      this.add.rectangle(-26, 18, 92, 14, 0x7f5539, 0.9).setRotation(0.35),
      this.add.rectangle(24, 16, 92, 14, 0x7f5539, 0.9).setRotation(-0.35),
      this.add.triangle(0, -20, -26, 28, 26, 28, 0, -64, 0xff9f1c, 0.92),
      this.add.triangle(8, -6, -14, 30, 30, 30, 8, -44, 0xffd166, 0.9),
    ]);
    this.tweens.add({ targets: fire.list.slice(-2), scaleY: 1.16, alpha: 0.72, duration: 360, yoyo: true, repeat: -1 });

    const hammock = this.add.container(1640, 1250).setDepth(1280);
    hammock.add([
      this.add.rectangle(-120, -10, 14, 160, 0x5d4037, 0.9).setRotation(-0.12),
      this.add.rectangle(120, -10, 14, 160, 0x5d4037, 0.9).setRotation(0.12),
      this.add.ellipse(0, 48, 220, 58, 0x80ffdb, 0.62),
      this.add.line(0, 0, -116, 48, 116, 48, 0xf7d9c4, 0.9),
    ]);
    this.tweens.add({ targets: hammock, y: hammock.y + 7, duration: 1900, yoyo: true, repeat: -1, ease: 'Sine.inOut' });

    const swing = this.add.container(1320, 930).setDepth(1000);
    swing.add([
      this.add.rectangle(-80, 0, 12, 220, 0x5d4037, 0.92),
      this.add.rectangle(80, 0, 12, 220, 0x5d4037, 0.92),
      this.add.rectangle(0, -108, 190, 14, 0x5d4037, 0.92),
      this.add.line(0, 0, -46, -100, -34, 54, 0xf7d9c4, 0.9),
      this.add.line(0, 0, 46, -100, 34, 54, 0xf7d9c4, 0.9),
      this.add.rectangle(0, 62, 106, 18, 0x9c6644, 0.94),
    ]);

    for (let i = 0; i < 14; i += 1) {
      const lamp = this.add.circle(1070 + i * 65, 790 + Math.sin(i * 0.8) * 30, 10, i % 2 ? 0xffd166 : 0xff8fab, 0.64).setDepth(1280);
      this.tweens.add({ targets: lamp, alpha: 0.95, scale: 1.18, duration: 900 + i * 80, yoyo: true, repeat: -1 });
    }

    const laundry = this.add.graphics().setDepth(1120);
    laundry.lineStyle(3, 0xf7d9c4, 0.7);
    laundry.lineBetween(1040, 1020, 1260, 980);
    ['#f8edeb', '#a8dadc', '#ffd6a5', '#ffafcc'].forEach((color, index) => {
      this.add.rectangle(1070 + index * 48, 1015 - index * 8, 36, 58, Phaser.Display.Color.HexStringToColor(color).color, 0.78).setDepth(1130);
    });
  }

  private drawGreenhouse() {
    const greenhouse = this.add.container(1840, 720).setDepth(820);
    greenhouse.add([
      this.add.ellipse(20, 145, 420, 56, 0x1a1414, 0.18),
      this.add.rectangle(0, 48, 360, 190, 0xbde0fe, 0.22),
      this.add.triangle(0, -120, -198, -30, 198, -30, 0, -160, 0xcaffbf, 0.24),
      this.add.rectangle(0, 48, 14, 190, 0xf8f9fa, 0.54),
      this.add.rectangle(-94, 48, 10, 190, 0xf8f9fa, 0.44),
      this.add.rectangle(94, 48, 10, 190, 0xf8f9fa, 0.44),
      this.add.rectangle(0, 145, 380, 18, 0xf8f9fa, 0.45),
      this.add.rectangle(0, 52, 380, 14, 0xf8f9fa, 0.35),
      this.add.rectangle(0, 76, 86, 130, 0x234f1e, 0.48),
    ]);
    for (let i = 0; i < 16; i += 1) {
      const plant = this.add.ellipse(1710 + (i % 8) * 36, 814 - Math.floor(i / 8) * 42, 22, 58, 0x95d5b2, 0.35).setDepth(810 + i);
      this.tweens.add({ targets: plant, alpha: 0.72, scaleY: 1.12, duration: 1700 + i * 70, yoyo: true, repeat: -1 });
    }
  }

  private drawCollectibleMarkers() {
    const markerStyle = { fontFamily: 'serif', fontSize: '20px', color: '#fff2cc', stroke: '#2d1f1a', strokeThickness: 4 };
    [
      { text: 'кассетник', x: 1008, y: 945 },
      { text: 'старый ПК', x: 616, y: 786 },
      { text: 'генератор', x: 780, y: 1120 },
      { text: 'мостик', x: 2180, y: 1398 },
      { text: 'теплица закрыта', x: 1740, y: 870 },
    ].forEach((marker) => this.add.text(marker.x, marker.y, marker.text, markerStyle).setDepth(marker.y + 40));
  }

  private createCat() {
    this.catShadow = this.add.ellipse(0, 0, 92, 28, 0x000000, 0.22).setDepth(1200);
    this.cat = this.add.container(1380, 1120).setDepth(1250);
    this.catTail = this.add.ellipse(-42, 4, 28, 90, 0xd95d18, 1).setRotation(-0.82);
    this.catBody = this.add.ellipse(0, 0, 92, 54, 0xe76f21, 1);
    const belly = this.add.ellipse(18, 8, 46, 34, 0xffe5c4, 0.92);
    const head = this.add.ellipse(48, -18, 54, 46, 0xe87522, 1);
    const muzzle = this.add.ellipse(58, -10, 28, 20, 0xfff3e0, 0.95);
    const earA = this.add.triangle(32, -42, 18, -28, 34, -66, 48, -30, 0xd95d18, 1);
    const earB = this.add.triangle(62, -42, 48, -30, 66, -66, 78, -28, 0xd95d18, 1);
    const eyeA = this.add.circle(38, -22, 4, 0xffc300, 1);
    const eyeB = this.add.circle(58, -24, 4, 0xffc300, 1);
    const nose = this.add.circle(66, -11, 3, 0x5d1f1b, 1);
    const pawA = this.add.ellipse(-22, 24, 18, 16, 0xffd0a6, 0.95);
    const pawB = this.add.ellipse(22, 25, 18, 16, 0xffd0a6, 0.95);
    const whiskers = this.add.graphics();
    whiskers.lineStyle(1, 0xfff8ef, 0.82);
    whiskers.lineBetween(62, -10, 84, -20);
    whiskers.lineBetween(62, -8, 88, -8);
    whiskers.lineBetween(62, -6, 84, 4);
    this.cat.add([this.catTail, this.catBody, belly, head, muzzle, earA, earB, eyeA, eyeB, nose, pawA, pawB, whiskers]);
    this.catName = this.add.text(this.cat.x - 38, this.cat.y - 98, 'Рыжик', {
      fontFamily: 'Georgia, serif',
      fontSize: '18px',
      color: '#ffe8c2',
      stroke: '#402218',
      strokeThickness: 4,
    });
    this.tweens.add({
      targets: this.catTail,
      rotation: -0.45,
      duration: 920,
      yoyo: true,
      repeat: -1,
      ease: 'Sine.inOut',
    });
  }

  private createNpcs() {
    npcs.forEach((definition, index) => {
      const home = locationAnchors[definition.home];
      const start = { x: home.x + (index % 3) * 70 - 70, y: home.y + Math.floor(index / 3) * 54 - 60 };
      const container = this.add.container(start.x, start.y).setDepth(start.y);
      const shadow = this.add.ellipse(0, 42, 58, 18, 0x000000, 0.18);
      const body = this.add.ellipse(0, 12, 42, 78, definition.color, 0.97);
      const head = this.add.circle(0, -40, 24, 0xf2c9a1, 1);
      const hair = this.add.ellipse(0, -52, 46, 26, definition.accent, 0.92);
      const scarf = this.add.rectangle(0, -4, 50, 10, definition.accent, 0.9);
      container.add([shadow, body, head, hair, scarf]);
      const label = this.add
        .text(start.x - 34, start.y - 104, definition.name, {
          fontFamily: 'Georgia, serif',
          fontSize: '16px',
          color: '#fff3d6',
          stroke: '#2a1f1b',
          strokeThickness: 4,
        })
        .setDepth(start.y + 80);
      this.npcsActors.push({
        definition,
        container,
        label,
        target: { ...start },
        nextDecisionAt: 0,
      });
    });
  }

  private createHotspots() {
    const store = useGameStore.getState();
    this.hotspots = [
      {
        id: 'cassette-shed',
        label: 'Пролезть под коробками и найти старую кассету',
        location: 'garage',
        x: 1180,
        y: 1510,
        radius: 92,
        action: () => {
          store.collect('cassette-veranda-1998');
          store.addUpgrade('porchStage');
          store.addUpgrade('stringLights');
          store.completeQuest('oldCassette');
          this.audioDirector.playInteraction('quest');
        },
      },
      {
        id: 'cassette-rain',
        label: 'Снять кассету "Дождь у окна" с подоконника',
        location: 'oldHouse',
        x: 715,
        y: 894,
        radius: 82,
        require: () => useGameStore.getState().weather === 'rain' || useGameStore.getState().weather === 'storm',
        action: () => {
          store.collect('cassette-rain-window');
          this.audioDirector.playInteraction('collect');
        },
      },
      {
        id: 'photo-pond',
        label: 'Позировать Насте со светлячками у пруда',
        location: 'pond',
        x: 2205,
        y: 1415,
        radius: 120,
        require: () => useGameStore.getState().dayPhase === 'night' && useGameStore.getState().fireflies >= 8,
        action: () => {
          if (useGameStore.getState().spendFireflies(8)) {
            store.collect('photo-firefly-pond');
            store.completeQuest('fireflyPhoto');
            store.addUpgrade('pondLanterns');
            this.flashCamera(0xffffff, 0.45);
            this.audioDirector.playInteraction('photo');
          }
        },
      },
      {
        id: 'storm-generator',
        label: 'Запустить генератор в подвале',
        location: 'basement',
        x: 780,
        y: 1120,
        radius: 96,
        require: () => ['storm', 'rain'].includes(useGameStore.getState().weather),
        action: () => {
          store.collect('nena-note-01');
          store.completeQuest('stormNight');
          store.addUpgrade('greenhousePower');
          this.forceWeather('sun');
          this.audioDirector.playInteraction('quest');
        },
      },
      {
        id: 'roof-night',
        label: 'Подготовить пледы и включить музыку на крыше',
        location: 'roof',
        x: 820,
        y: 690,
        radius: 105,
        require: () => ['goldenHour', 'blueEvening', 'night'].includes(useGameStore.getState().dayPhase),
        action: () => {
          store.completeQuest('roofNight');
          store.addDialogue('Ночь на крыше', 'Все садятся рядом. Метеоры чертят небо, а Рыжик засыпает на самом теплом пледе.');
          this.flashCamera(0xffd166, 0.26);
          this.audioDirector.playInteraction('quest');
        },
      },
      {
        id: 'moon-bell',
        label: 'Идти на тонкий звон в тумане',
        location: 'forest',
        x: 2140,
        y: 930,
        radius: 110,
        require: () => useGameStore.getState().dayPhase === 'night' || useGameStore.getState().weather === 'fog',
        action: () => {
          store.collect('moon-bell');
          store.completeQuest('moonBell');
          this.forceWeather('fog');
          this.audioDirector.playInteraction('quest');
        },
      },
      {
        id: 'greenhouse-door',
        label: 'Открыть теплицу ключом и мурчанием',
        location: 'greenhouse',
        x: 1840,
        y: 790,
        radius: 120,
        require: () =>
          useGameStore.getState().collection.includes('moon-bell') && useGameStore.getState().upgrades.includes('greenhousePower'),
        action: () => {
          store.collect('greenhouse-glowleaf');
          store.completeQuest('greenhouse');
          store.addDialogue('Теплица', 'Стекла вспыхивают мягким зеленым светом. Внутри пахнет землей, летом и старой музыкой.');
          this.flashCamera(0xb7e4c7, 0.34);
          this.audioDirector.playInteraction('quest');
        },
      },
      {
        id: 'stickers',
        label: 'Найти потерянные наклейки Лизы в траве',
        location: 'yard',
        x: 1310,
        y: 930,
        radius: 80,
        action: () => {
          store.collect('liza-stickers');
          store.addFriendship('liza', 1);
          this.audioDirector.playInteraction('collect');
        },
      },
      {
        id: 'toy-mouse',
        label: 'Опрокинуть коробку сокровищ Дани',
        location: 'garage',
        x: 690,
        y: 1445,
        radius: 92,
        action: () => {
          store.collect('danya-toy-mouse');
          store.addUpgrade('catCorner');
          this.audioDirector.playInteraction('collect');
        },
      },
    ];

    this.hotspots.forEach((hotspot) => {
      const ring = this.add.circle(hotspot.x, hotspot.y, hotspot.radius * 0.34, 0xffd166, 0.09).setDepth(hotspot.y + 6);
      ring.setStrokeStyle(2, 0xfff1a8, 0.36);
      this.tweens.add({ targets: ring, scale: 1.18, alpha: 0.2, duration: 1400, yoyo: true, repeat: -1 });
      hotspot.sprite = ring;
    });
  }

  private createFireflies() {
    for (let i = 0; i < 42; i += 1) {
      const pondSide = i % 2 === 0;
      const home = pondSide
        ? { x: 2060 + (i * 73) % 720, y: 1280 + (i * 41) % 330 }
        : { x: 2060 + (i * 91) % 820, y: 540 + (i * 53) % 460 };
      const orb = this.add.ellipse(home.x, home.y, 10, 10, 0xfff3b0, 0.0).setDepth(home.y + 220).setBlendMode(Phaser.BlendModes.ADD);
      this.fireflies.push({ orb, home, phase: i * 0.62, caught: false });
    }
  }

  private createWeatherParticles() {
    for (let i = 0; i < 120; i += 1) {
      const x = (i * 67) % worldSize.width;
      const y = (i * 113) % worldSize.height;
      const line = this.add.line(x, y, 0, 0, -18, 46, 0x9bd2ff, 0).setDepth(7000).setScrollFactor(1);
      this.rain.push({ line, speed: 520 + (i % 8) * 36 });
    }
  }

  private createCamera() {
    this.cameras.main.startFollow(this.cat, true, 0.08, 0.08);
    this.cameras.main.setZoom(1);
    this.scale.on('resize', () => {
      this.cameras.main.setSize(this.scale.width, this.scale.height);
      this.drawSky();
    });
  }

  private createUiAnchors() {
    this.interactLabel = this.add
      .text(0, 0, '', {
        fontFamily: 'Inter, system-ui, sans-serif',
        fontSize: '18px',
        color: '#fff7e6',
        backgroundColor: 'rgba(47, 33, 28, 0.58)',
        padding: { x: 14, y: 10 },
      })
      .setScrollFactor(0)
      .setDepth(9200)
      .setVisible(false);
  }

  private tickClock(time: number) {
    if (time - this.lastClockTick < 900) return;
    this.lastClockTick = time;
    this.timeMinute = (this.timeMinute + 4) % 1440;
    if (time - this.lastWeatherShift > 46000) {
      this.lastWeatherShift = time;
      this.currentWeatherIndex = (this.currentWeatherIndex + 1) % weatherCycle.length;
      if (this.currentWeatherIndex === 0) {
        this.currentSeasonIndex = (this.currentSeasonIndex + 1) % seasonCycle.length;
      }
      const weather = weatherCycle[this.currentWeatherIndex];
      useGameStore.getState().addDialogue('Погода', this.weatherLine(weather));
    }
    const phase = this.getDayPhase();
    useGameStore
      .getState()
      .setAtmosphere(this.timeMinute, phase, weatherCycle[this.currentWeatherIndex], seasonCycle[this.currentSeasonIndex]);
    this.audioDirector.update(this.storeAudioInput());
  }

  private handleInput(time: number, delta: number) {
    if (!this.cursors || !this.keyMap) return;
    const left = this.cursors.left.isDown || this.keyMap.A.isDown;
    const right = this.cursors.right.isDown || this.keyMap.D.isDown;
    const up = this.cursors.up.isDown || this.keyMap.W.isDown;
    const down = this.cursors.down.isDown || this.keyMap.S.isDown;
    const moving = left || right || up || down;
    const speed = this.keyMap.SHIFT.isDown ? 315 : 205;

    if (moving) {
      const vector = new Phaser.Math.Vector2((right ? 1 : 0) - (left ? 1 : 0), (down ? 1 : 0) - (up ? 1 : 0));
      vector.normalize().scale(speed * (delta / 1000));
      this.moveCat(vector.x, vector.y);
      this.lastInputAt = time;
      this.autoPilot = false;
      this.animateCat(true, vector.x);
    } else {
      this.animateCat(false, 0);
      if (time - this.lastInputAt > 9000) {
        this.autoPilot = true;
      }
    }
  }

  private updateCatAi(time: number, delta: number) {
    if (!this.autoPilot) return;
    const state = useGameStore.getState();
    if (time > this.nextCatDecisionAt) {
      const intent = this.pickCatIntent(state.weather, state.dayPhase);
      state.setCatIntent(intent);
      this.aiTarget = this.pickCatTarget(intent);
      this.nextCatDecisionAt = time + Phaser.Math.Between(5200, 9800);
      state.addDialogue('Рыжик', this.intentLine(intent));
    }

    const vector = new Phaser.Math.Vector2(this.aiTarget.x - this.cat.x, this.aiTarget.y - this.cat.y);
    if (vector.length() > 18) {
      vector.normalize().scale(130 * (delta / 1000));
      this.moveCat(vector.x, vector.y);
      this.animateCat(true, vector.x);
    } else {
      this.animateCat(false, 0);
    }
  }

  private moveCat(dx: number, dy: number) {
    this.cat.x = Phaser.Math.Clamp(this.cat.x + dx, 120, worldSize.width - 120);
    this.cat.y = Phaser.Math.Clamp(this.cat.y + dy, 420, worldSize.height - 120);
    this.catShadow.setPosition(this.cat.x, this.cat.y + 35);
    this.catName.setPosition(this.cat.x - 38, this.cat.y - 98);
    const location = this.resolveLocation(this.cat.x, this.cat.y);
    if (location !== useGameStore.getState().location) {
      useGameStore.getState().setLocation(location);
      const definition = locations.find((item) => item.id === location);
      if (definition) {
        useGameStore.getState().addDialogue(definition.title, definition.mood);
      }
    }
  }

  private animateCat(moving: boolean, dx: number) {
    if (moving && Math.abs(dx) > 0.02) {
      this.cat.setScale(dx < 0 ? -1 : 1, 1);
      this.catName.setScale(1, 1);
    }
    this.catBody.scaleY = moving ? 0.96 + Math.sin(this.time.now * 0.016) * 0.04 : 1;
    this.catTail.rotation += moving ? Math.sin(this.time.now * 0.014) * 0.012 : 0;
  }

  private updateNpcs(time: number, delta: number) {
    const phase = useGameStore.getState().dayPhase;
    this.npcsActors.forEach((actor, index) => {
      if (time > actor.nextDecisionAt) {
        const scheduled = actor.definition.schedule[phase] ?? actor.definition.home;
        const anchor = locationAnchors[scheduled];
        actor.target = {
          x: anchor.x + ((index * 71 + Phaser.Math.Between(-50, 50)) % 170) - 85,
          y: anchor.y + ((index * 43 + Phaser.Math.Between(-40, 60)) % 150) - 75,
        };
        actor.nextDecisionAt = time + Phaser.Math.Between(6200, 14000);
      }
      const vector = new Phaser.Math.Vector2(actor.target.x - actor.container.x, actor.target.y - actor.container.y);
      if (vector.length() > 14) {
        vector.normalize().scale(72 * (delta / 1000));
        actor.container.x += vector.x;
        actor.container.y += vector.y;
      }
      actor.container.setDepth(actor.container.y);
      actor.label.setPosition(actor.container.x - 34, actor.container.y - 104).setDepth(actor.container.y + 80);
    });
  }

  private updateFireflies(time: number) {
    const state = useGameStore.getState();
    const visible = state.dayPhase === 'night' || state.dayPhase === 'blueEvening' || state.weather === 'fog';
    this.fireflies.forEach((firefly, index) => {
      if (firefly.caught) return;
      const pulse = 0.38 + Math.sin(time * 0.004 + firefly.phase) * 0.26;
      firefly.orb.setAlpha(visible ? pulse : 0);
      firefly.orb.x = firefly.home.x + Math.sin(time * 0.0008 + firefly.phase) * (35 + (index % 5) * 8);
      firefly.orb.y = firefly.home.y + Math.cos(time * 0.0011 + firefly.phase) * (26 + (index % 7) * 6);
      const distance = Phaser.Math.Distance.Between(this.cat.x, this.cat.y, firefly.orb.x, firefly.orb.y);
      if (visible && distance < 46 && (this.keyMap?.E.isDown || this.keyMap?.SPACE.isDown)) {
        firefly.caught = true;
        firefly.orb.setVisible(false);
        state.addFirefly(1);
        state.setCatIntent('huntFireflies');
        telegramBridge.haptic('light');
        this.audioDirector.playInteraction('collect');
      }
    });
  }

  private updateWeather(time: number, delta: number) {
    const weather = useGameStore.getState().weather;
    const raining = weather === 'rain' || weather === 'storm';
    this.rain.forEach((particle, index) => {
      particle.line.setAlpha(raining ? (weather === 'storm' ? 0.62 : 0.42) : 0);
      if (raining) {
        particle.line.x -= 150 * (delta / 1000);
        particle.line.y += particle.speed * (delta / 1000);
        if (particle.line.y > worldSize.height + 120) {
          particle.line.y = -40 - (index % 8) * 25;
          particle.line.x = this.cameras.main.scrollX + ((index * 83) % Math.max(1, this.scale.width + 400));
        }
      }
    });

    this.weatherGraphics.clear();
    if (weather === 'fog') {
      this.weatherGraphics.fillStyle(0xdde7f0, 0.08);
      for (let i = 0; i < 12; i += 1) {
        this.weatherGraphics.fillEllipse(
          ((time * 0.018 + i * 360) % (worldSize.width + 600)) - 300,
          580 + (i % 5) * 170,
          560,
          96,
        );
      }
    }
    if (weather === 'storm' && Math.floor(time / 900) % 9 === 0) {
      this.flashCamera(0xbde0fe, 0.18);
      useGameStore.getState().setCatIntent('hideFromStorm');
    }
  }

  private updateHotspotHint() {
    const nearest = this.nearestHotspot();
    if (!nearest) {
      useGameStore.getState().setInteractionHint(null);
      this.interactLabel.setVisible(false);
      return;
    }
    const text = `E / Space — ${nearest.label}`;
    useGameStore.getState().setInteractionHint(text);
    this.interactLabel.setText(text).setPosition(this.scale.width / 2 - this.interactLabel.width / 2, this.scale.height - 118).setVisible(true);
  }

  private tryInteract() {
    this.audioDirector.start();
    const npc = this.nearestNpc();
    if (npc) {
      this.talkToNpc(npc);
      return;
    }
    const hotspot = this.nearestHotspot();
    if (hotspot) {
      hotspot.action();
      hotspot.used = true;
      hotspot.sprite?.destroy();
      telegramBridge.haptic('medium');
    }
  }

  private nearestHotspot() {
    const state = useGameStore.getState();
    return this.hotspots.find((hotspot) => {
      if (hotspot.used) return false;
      if (hotspot.require && !hotspot.require()) return false;
      const distance = Phaser.Math.Distance.Between(this.cat.x, this.cat.y, hotspot.x, hotspot.y);
      return distance < hotspot.radius;
    });
  }

  private nearestNpc() {
    return this.npcsActors.find((actor) => Phaser.Math.Distance.Between(this.cat.x, this.cat.y, actor.container.x, actor.container.y) < 92);
  }

  private talkToNpc(actor: NpcActor) {
    const store = useGameStore.getState();
    const weather = store.weather;
    const phase = store.dayPhase;
    const quest = quests.find((item) => item.id === actor.definition.quest);
    const friendship = store.friendship[actor.definition.id];
    const lineBank =
      quest && store.activeQuestId === quest.id && !store.completedQuestIds.includes(quest.id)
        ? actor.definition.lines.quest
        : friendship > 5
          ? actor.definition.lines.friend
          : actor.definition.lines[weather] ?? actor.definition.lines[phase];
    const line = lineBank[Math.floor(Math.random() * lineBank.length)];
    store.addDialogue(actor.definition.name, line);
    store.addFriendship(actor.definition.id, 1);
    if (quest && store.activeQuestId !== quest.id && !store.completedQuestIds.includes(quest.id)) {
      store.startQuest(quest.id);
    }
    this.audioDirector.playInteraction('purr');
  }

  private purr() {
    this.audioDirector.start();
    useGameStore.getState().setCatIntent('sitWithFriends');
    useGameStore.getState().addDialogue('Рыжик', 'Муррр. Вокруг становится спокойнее, а ближайшие люди улыбаются.');
    this.npcsActors.forEach((actor) => {
      if (Phaser.Math.Distance.Between(this.cat.x, this.cat.y, actor.container.x, actor.container.y) < 160) {
        useGameStore.getState().addFriendship(actor.definition.id, 1);
      }
    });
    this.audioDirector.playInteraction('purr');
    this.flashCamera(0xffd6a5, 0.12);
  }

  private depthSort() {
    this.cat.setDepth(this.cat.y + 40);
    this.catShadow.setDepth(this.cat.y + 20);
    this.catName.setDepth(this.cat.y + 90);
  }

  private updateAtmosphere(force: boolean) {
    const phase = this.getDayPhase();
    const weather = weatherCycle[this.currentWeatherIndex];
    const season = this.getSeason();
    if (force || Math.floor(this.timeMinute / 20) !== Math.floor((this.timeMinute - 4) / 20)) {
      this.drawSky();
    }

    const colors = phaseColors[phase];
    this.lightGraphics.clear();
    this.lightGraphics.fillStyle(0xffd166, phase === 'night' ? 0.16 : 0.08);
    this.lightGraphics.fillCircle(1430, 1180, 210);
    this.lightGraphics.fillStyle(0xfff1a8, ['goldenHour', 'blueEvening', 'night'].includes(phase) ? 0.22 : 0.05);
    for (let i = 0; i < 14; i += 1) {
      this.lightGraphics.fillCircle(1070 + i * 65, 790 + Math.sin(i * 0.8) * 30, 58);
    }
    if (season === 'winter') {
      this.lightGraphics.fillStyle(0xcfe8ff, 0.04);
      this.lightGraphics.fillRect(0, 0, worldSize.width, worldSize.height);
    }
    if (weather === 'storm' || weather === 'rain') {
      this.lightGraphics.fillStyle(0x9bd2ff, 0.06);
      this.lightGraphics.fillCircle(780, 890, 330);
    }
    if (useGameStore.getState().collection.includes('greenhouse-glowleaf')) {
      this.lightGraphics.fillStyle(0x95d5b2, 0.26);
      this.lightGraphics.fillCircle(1840, 760, 300);
    }
    this.vignette
      .setPosition(this.scale.width / 2, this.scale.height / 2)
      .setSize(this.scale.width, this.scale.height)
      .setFillStyle(colors.tint, colors.alpha + (weather === 'fog' ? 0.08 : 0));
    this.photoOverlay
      .setPosition(this.scale.width / 2, this.scale.height / 2)
      .setSize(this.scale.width, this.scale.height)
      .setFillStyle(0xf8ead5, useGameStore.getState().photoMode ? 0.12 : 0);
  }

  private updateFinale() {
    const store = useGameStore.getState();
    if (!store.isFinaleReady || this.finaleStarted) return;
    this.finaleStarted = true;
    this.forceWeather('sun');
    this.timeMinute = 21 * 60;
    store.addDialogue('Ночь Светлячков', 'Весь двор светится. Все собираются рядом, музыка звучит с веранды, и Рыжик засыпает так спокойно, будто лето никогда не закончится.');
    this.fireflies.forEach((firefly) => {
      firefly.caught = false;
      firefly.orb.setVisible(true);
      firefly.home = {
        x: 980 + Math.random() * 940,
        y: 760 + Math.random() * 660,
      };
    });
    this.cameras.main.flash(1800, 255, 214, 165);
    this.cameras.main.zoomTo(1.08, 3500, 'Sine.easeInOut', true);
    this.audioDirector.playInteraction('quest');
  }

  private forceWeather(weather: Weather) {
    const index = weatherCycle.indexOf(weather);
    this.currentWeatherIndex = index >= 0 ? index : 0;
    useGameStore
      .getState()
      .setAtmosphere(this.timeMinute, this.getDayPhase(), weatherCycle[this.currentWeatherIndex], seasonCycle[this.currentSeasonIndex]);
    this.audioDirector.update(this.storeAudioInput());
  }

  private flashCamera(color: number, alpha: number) {
    const rgb = Phaser.Display.Color.IntegerToRGB(color);
    this.cameras.main.flash(420, rgb.r, rgb.g, rgb.b, false, (_camera: Phaser.Cameras.Scene2D.Camera, progress: number) => {
      this.photoOverlay.setAlpha((1 - progress) * alpha);
    });
  }

  private pickCatIntent(weather: Weather, phase: DayPhase): CatIntent {
    if (weather === 'storm') return 'hideFromStorm';
    if (phase === 'night') return Math.random() > 0.5 ? 'followWarmth' : 'nap';
    if (weather === 'rain') return 'reactToMusic';
    if (phase === 'blueEvening') return 'sitWithFriends';
    return ['wander', 'play', 'reactToMusic'][Phaser.Math.Between(0, 2)] as CatIntent;
  }

  private pickCatTarget(intent: CatIntent): Vec2 {
    const map: Record<CatIntent, Vec2[]> = {
      wander: [locationAnchors.yard, locationAnchors.pond, locationAnchors.forest],
      followWarmth: [locationAnchors.oldHouse, { x: 1430, y: 1180 }],
      reactToMusic: [locationAnchors.garage, { x: 1030, y: 890 }, locationAnchors.oldHouse],
      hideFromStorm: [locationAnchors.basement, locationAnchors.oldHouse],
      nap: [{ x: 1640, y: 1250 }, { x: 880, y: 900 }, { x: 1220, y: 1420 }],
      play: [{ x: 690, y: 1445 }, { x: 1180, y: 1510 }, locationAnchors.yard],
      sitWithFriends: [{ x: 1430, y: 1180 }, locationAnchors.roof],
      huntFireflies: [locationAnchors.pond, locationAnchors.forest],
    };
    const options = map[intent];
    return options[Phaser.Math.Between(0, options.length - 1)];
  }

  private intentLine(intent: CatIntent) {
    const lines: Record<CatIntent, string> = {
      wander: 'Рыжик сам идет проверять, всё ли на месте во дворе.',
      followWarmth: 'Рыжик ищет самое теплое место у лампы или костра.',
      reactToMusic: 'Рыжик слышит музыку и важно направляется к колонкам.',
      hideFromStorm: 'Рыжик прижимает уши и выбирает безопасный угол.',
      nap: 'Рыжик решил, что любое место можно сделать кроватью.',
      play: 'Рыжик нашел коробки. Коробки обречены.',
      sitWithFriends: 'Рыжик садится рядом с людьми, будто всегда так и было.',
      huntFireflies: 'Рыжик следит за светлячками круглыми янтарными глазами.',
    };
    return lines[intent];
  }

  private weatherLine(weather: Weather) {
    const lines: Record<Weather, string> = {
      sun: 'Солнце возвращается и сушит крыльцо.',
      rain: 'Начинается дождь. Дом звучит мягче.',
      storm: 'Над лесом собирается гроза. В окнах вспыхивает свет.',
      fog: 'Туман стелется по тропинкам и прячет старый колодец.',
      wind: 'Ветер шевелит бельевые веревки и траву.',
      cloudy: 'Облака закрывают солнце, делая цвета пленочными.',
    };
    return lines[weather];
  }

  private resolveLocation(x: number, y: number): LocationId {
    const zone = locationZones.find((item) => x >= item.x && x <= item.x + item.w && y >= item.y && y <= item.y + item.h);
    return zone?.id ?? 'yard';
  }

  private getDayPhase(): DayPhase {
    if (this.timeMinute < 420) return 'night';
    if (this.timeMinute < 720) return 'morning';
    if (this.timeMinute < 1020) return 'day';
    if (this.timeMinute < 1170) return 'goldenHour';
    if (this.timeMinute < 1290) return 'blueEvening';
    return 'night';
  }

  private getSeason() {
    return seasonCycle[this.currentSeasonIndex];
  }

  private storeAudioInput() {
    const state = useGameStore.getState();
    return {
      dayPhase: state.dayPhase,
      weather: state.weather,
      location: state.location,
      musicEnabled: state.musicEnabled,
      ambienceEnabled: state.ambienceEnabled,
    };
  }
}
