// Procedural Ryzhik sprite atlas.
// We draw a small set of cat poses by hand into canvas tiles and pack them
// into one texture; Phaser sprite frames are defined by integer slots.

import { hexA, mulberry32, newCanvas } from './paint';

export const CAT_FRAME_W = 96;
export const CAT_FRAME_H = 80;

export const CAT_FRAMES = {
  idle1: 0,
  idle2: 1,
  walk1: 2,
  walk2: 3,
  walk3: 4,
  walk4: 5,
  sleep: 6,
  sit: 7,
  stretch: 8,
  purr1: 9,
  purr2: 10,
  jump: 11,
} as const;

const COLS = 12;
const ROWS = 1;

const GINGER = '#e89a4d';
const GINGER_DARK = '#b6601f';
const GINGER_LIGHT = '#fbd1a0';
const WHITE = '#fbf3e4';
const PINK = '#f0a3a8';
const EYE = '#f9c64a';
const PUPIL = '#1a1a14';
const SHADOW = 'rgba(0,0,0,0.35)';

function drawShadow(ctx: CanvasRenderingContext2D, cx: number, cy: number, rx = 22, ry = 5) {
  ctx.save();
  ctx.fillStyle = SHADOW;
  ctx.beginPath();
  ctx.ellipse(cx, cy, rx, ry, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
}

function drawCatBody(
  ctx: CanvasRenderingContext2D,
  cx: number,
  cy: number,
  opts: {
    legBob?: number; // walking bob
    sleeping?: boolean;
    sitting?: boolean;
    stretch?: boolean;
    eyeOpen?: number; // 0..1
    tail?: number; // tail offset in degrees
    jump?: number; // y offset
  } = {}
) {
  const {
    legBob = 0,
    sleeping = false,
    sitting = false,
    stretch = false,
    eyeOpen = 1,
    tail = 0,
    jump = 0,
  } = opts;

  ctx.save();
  ctx.translate(cx, cy - jump);

  // Shadow
  drawShadow(ctx, 0, 28 + (sleeping ? 4 : 0), sleeping ? 30 : 22, 4);

  // Tail
  ctx.save();
  ctx.translate(-22, sitting ? 2 : 6);
  ctx.rotate((tail * Math.PI) / 180);
  ctx.fillStyle = GINGER;
  ctx.strokeStyle = GINGER_DARK;
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  ctx.moveTo(0, 0);
  ctx.quadraticCurveTo(-14, -10, -22, -22);
  ctx.quadraticCurveTo(-26, -28, -22, -32);
  ctx.quadraticCurveTo(-14, -22, 0, -2);
  ctx.closePath();
  ctx.fill();
  // tail tip
  ctx.fillStyle = WHITE;
  ctx.beginPath();
  ctx.ellipse(-23, -28, 3.5, 4, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();

  // Body
  ctx.fillStyle = GINGER;
  if (sleeping) {
    // curled up
    ctx.beginPath();
    ctx.ellipse(0, 18, 28, 14, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = GINGER_LIGHT;
    ctx.beginPath();
    ctx.ellipse(0, 18, 26, 11, 0, 0, Math.PI * 2);
    ctx.globalAlpha = 0.55;
    ctx.fill();
    ctx.globalAlpha = 1;
  } else if (sitting) {
    ctx.beginPath();
    ctx.ellipse(0, 12, 18, 18, 0, 0, Math.PI * 2);
    ctx.fill();
  } else if (stretch) {
    ctx.beginPath();
    ctx.ellipse(0, 14, 28, 11, 0, 0, Math.PI * 2);
    ctx.fill();
  } else {
    ctx.beginPath();
    ctx.ellipse(0, 12, 22, 13, 0, 0, Math.PI * 2);
    ctx.fill();
  }

  // Belly
  ctx.fillStyle = WHITE;
  ctx.beginPath();
  ctx.ellipse(0, 18, sitting ? 12 : 16, sitting ? 14 : 8, 0, 0, Math.PI * 2);
  ctx.fill();

  // Legs
  if (!sleeping && !sitting) {
    ctx.fillStyle = GINGER_DARK;
    const lb = Math.sin(legBob * Math.PI * 2) * 2;
    const lb2 = Math.sin(legBob * Math.PI * 2 + Math.PI) * 2;
    // back legs
    ctx.fillRect(-14, 22 + lb, 5, 8 - lb);
    ctx.fillRect(8, 22 + lb2, 5, 8 - lb2);
    // front legs
    ctx.fillRect(-6, 22 + lb2, 5, 8 - lb2);
    ctx.fillRect(0, 22 + lb, 5, 8 - lb);
    // paws (white socks)
    ctx.fillStyle = WHITE;
    ctx.fillRect(-14, 28 + lb, 5, 2);
    ctx.fillRect(8, 28 + lb2, 5, 2);
    ctx.fillRect(-6, 28 + lb2, 5, 2);
    ctx.fillRect(0, 28 + lb, 5, 2);
  } else if (sitting) {
    ctx.fillStyle = WHITE;
    ctx.fillRect(-7, 24, 6, 4);
    ctx.fillRect(3, 24, 6, 4);
  }

  // Head
  if (!sleeping) {
    ctx.fillStyle = GINGER;
    ctx.beginPath();
    ctx.ellipse(14, sitting ? -2 : 4, 14, 12, 0, 0, Math.PI * 2);
    ctx.fill();
    // face white patch
    ctx.fillStyle = WHITE;
    ctx.beginPath();
    ctx.ellipse(17, sitting ? 1 : 7, 9, 7, 0, 0, Math.PI * 2);
    ctx.fill();
    // ears
    ctx.fillStyle = GINGER_DARK;
    ctx.beginPath();
    ctx.moveTo(5, -6 + (sitting ? -6 : 0));
    ctx.lineTo(10, -12 + (sitting ? -6 : 0));
    ctx.lineTo(13, -3 + (sitting ? -6 : 0));
    ctx.closePath();
    ctx.fill();
    ctx.beginPath();
    ctx.moveTo(20, -6 + (sitting ? -6 : 0));
    ctx.lineTo(24, -12 + (sitting ? -6 : 0));
    ctx.lineTo(22, -3 + (sitting ? -6 : 0));
    ctx.closePath();
    ctx.fill();
    ctx.fillStyle = PINK;
    ctx.beginPath();
    ctx.moveTo(8, -5 + (sitting ? -6 : 0));
    ctx.lineTo(10, -9 + (sitting ? -6 : 0));
    ctx.lineTo(12, -4 + (sitting ? -6 : 0));
    ctx.closePath();
    ctx.fill();
    // Eyes
    const eyeY = (sitting ? -1 : 5);
    if (eyeOpen > 0.2) {
      ctx.fillStyle = EYE;
      ctx.beginPath();
      ctx.ellipse(12, eyeY, 2, 2 * eyeOpen, 0, 0, Math.PI * 2);
      ctx.ellipse(20, eyeY, 2, 2 * eyeOpen, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = PUPIL;
      ctx.beginPath();
      ctx.ellipse(12, eyeY, 0.9, 1.6 * eyeOpen, 0, 0, Math.PI * 2);
      ctx.ellipse(20, eyeY, 0.9, 1.6 * eyeOpen, 0, 0, Math.PI * 2);
      ctx.fill();
    } else {
      ctx.strokeStyle = PUPIL;
      ctx.lineWidth = 1.2;
      ctx.beginPath();
      ctx.moveTo(10, eyeY);
      ctx.quadraticCurveTo(12, eyeY + 1.5, 14, eyeY);
      ctx.moveTo(18, eyeY);
      ctx.quadraticCurveTo(20, eyeY + 1.5, 22, eyeY);
      ctx.stroke();
    }
    // Nose & mouth
    ctx.fillStyle = PINK;
    ctx.beginPath();
    ctx.moveTo(16, 8 + (sitting ? -6 : 0));
    ctx.lineTo(18, 8 + (sitting ? -6 : 0));
    ctx.lineTo(17, 10 + (sitting ? -6 : 0));
    ctx.closePath();
    ctx.fill();
    ctx.strokeStyle = PUPIL;
    ctx.lineWidth = 0.8;
    ctx.beginPath();
    ctx.moveTo(17, 10 + (sitting ? -6 : 0));
    ctx.lineTo(17, 11.5 + (sitting ? -6 : 0));
    ctx.moveTo(17, 11.5 + (sitting ? -6 : 0));
    ctx.quadraticCurveTo(15, 13 + (sitting ? -6 : 0), 13, 12 + (sitting ? -6 : 0));
    ctx.moveTo(17, 11.5 + (sitting ? -6 : 0));
    ctx.quadraticCurveTo(19, 13 + (sitting ? -6 : 0), 21, 12 + (sitting ? -6 : 0));
    ctx.stroke();
    // Whiskers
    ctx.strokeStyle = 'rgba(255,255,255,0.7)';
    ctx.lineWidth = 0.6;
    for (let i = -1; i <= 1; i++) {
      ctx.beginPath();
      ctx.moveTo(12, 10 + i * 2 + (sitting ? -6 : 0));
      ctx.lineTo(5, 10 + i * 3 + (sitting ? -6 : 0));
      ctx.moveTo(22, 10 + i * 2 + (sitting ? -6 : 0));
      ctx.lineTo(29, 10 + i * 3 + (sitting ? -6 : 0));
      ctx.stroke();
    }
  } else {
    // sleeping head
    ctx.fillStyle = GINGER;
    ctx.beginPath();
    ctx.ellipse(16, 18, 11, 8, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = PUPIL;
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(11, 17);
    ctx.quadraticCurveTo(13, 18.5, 15, 17);
    ctx.moveTo(17, 17);
    ctx.quadraticCurveTo(19, 18.5, 21, 17);
    ctx.stroke();
    // Z
    ctx.fillStyle = hexA(0xfbf3e4, 0.6);
    ctx.font = 'bold 10px Quicksand';
    ctx.fillText('z', 22, 8);
    ctx.font = 'bold 7px Quicksand';
    ctx.fillText('z', 28, 4);
  }

  ctx.restore();
}

export function makeCatAtlas(): HTMLCanvasElement {
  const W = CAT_FRAME_W * COLS;
  const H = CAT_FRAME_H * ROWS;
  const c = newCanvas(W, H);
  const ctx = c.getContext('2d')!;
  ctx.imageSmoothingEnabled = true;

  const rnd = mulberry32(1337);
  void rnd;

  const cx = CAT_FRAME_W / 2;
  const cy = CAT_FRAME_H / 2 + 8;

  const drawAt = (frame: number, fn: () => void) => {
    ctx.save();
    ctx.translate(frame * CAT_FRAME_W, 0);
    fn();
    ctx.restore();
  };

  drawAt(CAT_FRAMES.idle1, () =>
    drawCatBody(ctx, cx, cy, { tail: 4, eyeOpen: 1 })
  );
  drawAt(CAT_FRAMES.idle2, () =>
    drawCatBody(ctx, cx, cy, { tail: -4, eyeOpen: 0.85 })
  );
  drawAt(CAT_FRAMES.walk1, () =>
    drawCatBody(ctx, cx, cy, { legBob: 0, tail: 8 })
  );
  drawAt(CAT_FRAMES.walk2, () =>
    drawCatBody(ctx, cx, cy, { legBob: 0.25, tail: 12 })
  );
  drawAt(CAT_FRAMES.walk3, () =>
    drawCatBody(ctx, cx, cy, { legBob: 0.5, tail: 8 })
  );
  drawAt(CAT_FRAMES.walk4, () =>
    drawCatBody(ctx, cx, cy, { legBob: 0.75, tail: 4 })
  );
  drawAt(CAT_FRAMES.sleep, () =>
    drawCatBody(ctx, cx, cy, { sleeping: true, eyeOpen: 0, tail: -30 })
  );
  drawAt(CAT_FRAMES.sit, () =>
    drawCatBody(ctx, cx, cy, { sitting: true, eyeOpen: 1, tail: -4 })
  );
  drawAt(CAT_FRAMES.stretch, () =>
    drawCatBody(ctx, cx, cy, { stretch: true, eyeOpen: 0.5, tail: -20 })
  );
  drawAt(CAT_FRAMES.purr1, () =>
    drawCatBody(ctx, cx, cy, { sitting: true, eyeOpen: 0.2, tail: 0 })
  );
  drawAt(CAT_FRAMES.purr2, () =>
    drawCatBody(ctx, cx, cy, { sitting: true, eyeOpen: 0.15, tail: 6 })
  );
  drawAt(CAT_FRAMES.jump, () =>
    drawCatBody(ctx, cx, cy, { jump: 14, eyeOpen: 1, tail: -10 })
  );

  return c;
}
