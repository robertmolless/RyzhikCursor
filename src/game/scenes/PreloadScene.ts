import Phaser from 'phaser';
import {
  CAT_FRAME_H,
  CAT_FRAME_W,
  CAT_FRAMES,
  makeCatAtlas,
} from '../art/catSprites';
import { NPCS } from '@/data/npcs';
import {
  makeNPCAtlas,
  NPC_FRAME_H,
  NPC_FRAME_W,
  NPC_FRAMES_PER_ROW,
} from '../art/npcSprites';
import {
  makeBellTexture,
  makeBenchTexture,
  makeBoxTexture,
  makeBushTexture,
  makeCampfireTexture,
  makeCassetteTexture,
  makeFireflyTexture,
  makeGarlandLight,
  makeGroundTexture,
  makeHillsFar,
  makeHouseTexture,
  makeLanternTexture,
  makeLeafTexture,
  makePickTexture,
  makeRainTexture,
  makeShedTexture,
  makeSkyTexture,
  makeStarsTexture,
  makeStickerTexture,
  makeSwingTexture,
  makeTreeTexture,
  makeTreesFar,
} from '../art/worldArt';

export class PreloadScene extends Phaser.Scene {
  constructor() {
    super('Preload');
  }

  preload() {
    const tex = this.textures;

    const add = (key: string, canvas: HTMLCanvasElement) => {
      if (tex.exists(key)) tex.remove(key);
      tex.addCanvas(key, canvas);
    };

    // World textures
    add('sky', makeSkyTexture(2400, 720));
    add('stars', makeStarsTexture(2400, 720));
    add('hills', makeHillsFar(2400, 320));
    add('treesFar', makeTreesFar(2400, 360));
    add('ground', makeGroundTexture(2560, 360));
    add('house', makeHouseTexture(720, 520));
    add('tree1', makeTreeTexture(1));
    add('tree2', makeTreeTexture(2));
    add('tree3', makeTreeTexture(3));
    add('tree4', makeTreeTexture(4));
    add('bush1', makeBushTexture(11));
    add('bush2', makeBushTexture(12));
    add('bush3', makeBushTexture(13));
    add('shed', makeShedTexture());
    add('campfire', makeCampfireTexture());
    add('bench', makeBenchTexture());
    add('swing', makeSwingTexture());
    add('lantern', makeLanternTexture());
    add('cassette', makeCassetteTexture());
    add('firefly', makeFireflyTexture());
    add('rain', makeRainTexture());
    add('leaf1', makeLeafTexture(101));
    add('leaf2', makeLeafTexture(102));
    add('leaf3', makeLeafTexture(103));
    add('garland', makeGarlandLight());
    add('sticker', makeStickerTexture());
    add('pick', makePickTexture());
    add('bell', makeBellTexture());
    add('box', makeBoxTexture());

    // Cat atlas (sliced by frame)
    const catCanvas = makeCatAtlas();
    add('catSheet', catCanvas);
    const totalCatFrames = Object.keys(CAT_FRAMES).length;
    const ph = tex.get('catSheet');
    for (let i = 0; i < totalCatFrames; i++) {
      ph.add(i, 0, i * CAT_FRAME_W, 0, CAT_FRAME_W, CAT_FRAME_H);
    }

    // NPC atlas: rows = npc index, cols = frame
    const npcCanvas = makeNPCAtlas(NPCS);
    add('npcSheet', npcCanvas);
    const npcTex = tex.get('npcSheet');
    NPCS.forEach((_, row) => {
      for (let f = 0; f < NPC_FRAMES_PER_ROW; f++) {
        const frameId = `npc${row}_${f}`;
        npcTex.add(
          frameId,
          0,
          f * NPC_FRAME_W,
          row * NPC_FRAME_H,
          NPC_FRAME_W,
          NPC_FRAME_H
        );
      }
    });
  }

  create() {
    this.createAnims();
    this.scene.start('Yard');
  }

  private createAnims() {
    const a = this.anims;
    const safe = (key: string, frames: number[], frameRate: number, repeat = -1) => {
      if (a.exists(key)) return;
      a.create({
        key,
        frames: frames.map((f) => ({ key: 'catSheet', frame: f })),
        frameRate,
        repeat,
      });
    };
    safe('cat-idle', [CAT_FRAMES.idle1, CAT_FRAMES.idle2], 1.6);
    safe(
      'cat-walk',
      [CAT_FRAMES.walk1, CAT_FRAMES.walk2, CAT_FRAMES.walk3, CAT_FRAMES.walk4],
      9
    );
    safe('cat-sleep', [CAT_FRAMES.sleep], 1, 0);
    safe('cat-sit', [CAT_FRAMES.sit], 1, 0);
    safe('cat-stretch', [CAT_FRAMES.stretch], 1, 0);
    safe('cat-purr', [CAT_FRAMES.purr1, CAT_FRAMES.purr2], 3);
    safe('cat-jump', [CAT_FRAMES.jump], 1, 0);

    NPCS.forEach((_, row) => {
      const idleKey = `npc-idle-${row}`;
      const walkKey = `npc-walk-${row}`;
      if (!a.exists(idleKey)) {
        a.create({
          key: idleKey,
          frames: [
            { key: 'npcSheet', frame: `npc${row}_0` },
            { key: 'npcSheet', frame: `npc${row}_1` },
          ],
          frameRate: 1.4,
          repeat: -1,
        });
      }
      if (!a.exists(walkKey)) {
        a.create({
          key: walkKey,
          frames: [
            { key: 'npcSheet', frame: `npc${row}_2` },
            { key: 'npcSheet', frame: `npc${row}_3` },
          ],
          frameRate: 6,
          repeat: -1,
        });
      }
    });
  }
}
