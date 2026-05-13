// Procedural NPC sprite atlas — one row per NPC, columns are anim frames.

import type { NPCDef } from '@/types';
import { newCanvas } from './paint';

export const NPC_FRAME_W = 64;
export const NPC_FRAME_H = 96;
export const NPC_FRAMES_PER_ROW = 4; // idle1, idle2, walk1, walk2

function toCss(c: number) {
  return `#${c.toString(16).padStart(6, '0')}`;
}

function drawHair(
  ctx: CanvasRenderingContext2D,
  style: NPCDef['hair'],
  color: string,
  cx: number,
  topY: number
) {
  ctx.fillStyle = color;
  switch (style) {
    case 'short': {
      ctx.beginPath();
      ctx.moveTo(cx - 11, topY + 8);
      ctx.quadraticCurveTo(cx, topY - 7, cx + 11, topY + 8);
      ctx.lineTo(cx + 11, topY + 12);
      ctx.lineTo(cx - 11, topY + 12);
      ctx.closePath();
      ctx.fill();
      break;
    }
    case 'medium': {
      ctx.beginPath();
      ctx.moveTo(cx - 13, topY + 18);
      ctx.quadraticCurveTo(cx - 14, topY - 6, cx, topY - 8);
      ctx.quadraticCurveTo(cx + 14, topY - 6, cx + 13, topY + 18);
      ctx.quadraticCurveTo(cx, topY + 12, cx - 13, topY + 18);
      ctx.closePath();
      ctx.fill();
      break;
    }
    case 'long': {
      ctx.beginPath();
      ctx.moveTo(cx - 13, topY + 30);
      ctx.quadraticCurveTo(cx - 16, topY - 8, cx, topY - 9);
      ctx.quadraticCurveTo(cx + 16, topY - 8, cx + 13, topY + 30);
      ctx.quadraticCurveTo(cx, topY + 20, cx - 13, topY + 30);
      ctx.closePath();
      ctx.fill();
      break;
    }
    case 'mohawk': {
      ctx.beginPath();
      ctx.moveTo(cx - 4, topY + 4);
      ctx.quadraticCurveTo(cx, topY - 14, cx + 4, topY + 4);
      ctx.closePath();
      ctx.fill();
      ctx.fillRect(cx - 9, topY + 4, 18, 5);
      break;
    }
    case 'wavy': {
      ctx.beginPath();
      ctx.moveTo(cx - 13, topY + 14);
      ctx.quadraticCurveTo(cx - 17, topY - 8, cx, topY - 8);
      ctx.quadraticCurveTo(cx + 17, topY - 8, cx + 13, topY + 14);
      ctx.quadraticCurveTo(cx + 8, topY + 22, cx - 8, topY + 22);
      ctx.closePath();
      ctx.fill();
      break;
    }
  }
}

function drawOutfit(
  ctx: CanvasRenderingContext2D,
  outfit: NPCDef['outfit'],
  body: string,
  accent: string,
  cx: number,
  shoulderY: number,
  legBob: number
) {
  ctx.fillStyle = body;
  // torso
  ctx.beginPath();
  ctx.moveTo(cx - 11, shoulderY);
  ctx.lineTo(cx + 11, shoulderY);
  ctx.lineTo(cx + 13, shoulderY + 26);
  ctx.lineTo(cx - 13, shoulderY + 26);
  ctx.closePath();
  ctx.fill();
  // arms
  ctx.fillRect(cx - 15, shoulderY + 2, 4, 22);
  ctx.fillRect(cx + 11, shoulderY + 2, 4, 22);

  // outfit details
  if (outfit === 'hoodie') {
    ctx.fillStyle = accent;
    ctx.fillRect(cx - 1, shoulderY, 2, 18);
    // hood
    ctx.fillStyle = body;
    ctx.beginPath();
    ctx.ellipse(cx, shoulderY + 1, 13, 6, 0, 0, Math.PI * 2);
    ctx.fill();
  } else if (outfit === 'jacket') {
    ctx.fillStyle = accent;
    ctx.fillRect(cx - 3, shoulderY + 4, 6, 20);
    ctx.fillRect(cx - 11, shoulderY, 4, 2);
    ctx.fillRect(cx + 7, shoulderY, 4, 2);
  } else if (outfit === 'sweater') {
    ctx.fillStyle = accent;
    for (let i = 0; i < 4; i++) {
      ctx.fillRect(cx - 12, shoulderY + 4 + i * 6, 24, 1);
    }
  } else if (outfit === 'tee') {
    ctx.fillStyle = accent;
    ctx.beginPath();
    ctx.ellipse(cx, shoulderY + 12, 3, 3, 0, 0, Math.PI * 2);
    ctx.fill();
  } else if (outfit === 'cloak') {
    ctx.fillStyle = body;
    ctx.beginPath();
    ctx.moveTo(cx - 18, shoulderY);
    ctx.lineTo(cx + 18, shoulderY);
    ctx.lineTo(cx + 22, shoulderY + 36);
    ctx.lineTo(cx - 22, shoulderY + 36);
    ctx.closePath();
    ctx.fill();
    ctx.fillStyle = accent;
    ctx.fillRect(cx - 2, shoulderY + 6, 4, 4); // brooch
  }

  // legs (with walk bob)
  ctx.fillStyle = '#2c2018';
  const lb = Math.sin(legBob * Math.PI * 2) * 2;
  const lb2 = -lb;
  ctx.fillRect(cx - 9, shoulderY + 26 + lb, 7, 16 - lb);
  ctx.fillRect(cx + 2, shoulderY + 26 + lb2, 7, 16 - lb2);
  // shoes
  ctx.fillStyle = '#1a120e';
  ctx.fillRect(cx - 10, shoulderY + 42 + lb, 8, 3);
  ctx.fillRect(cx + 2, shoulderY + 42 + lb2, 8, 3);
}

function drawFace(ctx: CanvasRenderingContext2D, cx: number, cy: number, accent: string) {
  // shadow
  ctx.fillStyle = 'rgba(0,0,0,0.25)';
  ctx.beginPath();
  ctx.ellipse(cx, cy + 36, 14, 3, 0, 0, Math.PI * 2);
  ctx.fill();
  // head
  ctx.fillStyle = '#f1d1a8';
  ctx.beginPath();
  ctx.ellipse(cx, cy, 11, 13, 0, 0, Math.PI * 2);
  ctx.fill();
  // neck
  ctx.fillStyle = '#dbb78d';
  ctx.fillRect(cx - 4, cy + 11, 8, 5);
  // eyes
  ctx.fillStyle = accent;
  ctx.beginPath();
  ctx.arc(cx - 3.5, cy + 1, 1.2, 0, Math.PI * 2);
  ctx.arc(cx + 3.5, cy + 1, 1.2, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = '#1a120e';
  ctx.beginPath();
  ctx.arc(cx - 3.5, cy + 1, 0.6, 0, Math.PI * 2);
  ctx.arc(cx + 3.5, cy + 1, 0.6, 0, Math.PI * 2);
  ctx.fill();
  // mouth
  ctx.strokeStyle = '#7a4a30';
  ctx.lineWidth = 0.8;
  ctx.beginPath();
  ctx.moveTo(cx - 1.5, cy + 6);
  ctx.quadraticCurveTo(cx, cy + 7.2, cx + 1.5, cy + 6);
  ctx.stroke();
  // cheeks
  ctx.fillStyle = 'rgba(220,120,90,0.35)';
  ctx.beginPath();
  ctx.ellipse(cx - 5, cy + 4, 2, 1.2, 0, 0, Math.PI * 2);
  ctx.ellipse(cx + 5, cy + 4, 2, 1.2, 0, 0, Math.PI * 2);
  ctx.fill();
}

export function drawNPC(
  ctx: CanvasRenderingContext2D,
  npc: NPCDef,
  frame: number
) {
  const cx = NPC_FRAME_W / 2;
  const headY = 28;
  const shoulderY = headY + 16;
  const hairColor = toCss(npc.color.hair);
  const outfitColor = toCss(npc.color.outfit);
  const accent = toCss(npc.color.accent);

  // breathing offset
  const breath = frame < 2 ? Math.sin(frame * Math.PI) * 0.6 : 0;
  const legBob = frame >= 2 ? (frame - 2) * 0.5 : 0;

  ctx.save();
  ctx.translate(0, breath);
  drawOutfit(ctx, npc.outfit, outfitColor, accent, cx, shoulderY, legBob);
  drawFace(ctx, cx, headY, accent);
  drawHair(ctx, npc.hair, hairColor, cx, headY - 11);
  ctx.restore();
}

export function makeNPCAtlas(npcs: NPCDef[]): HTMLCanvasElement {
  const W = NPC_FRAME_W * NPC_FRAMES_PER_ROW;
  const H = NPC_FRAME_H * npcs.length;
  const c = newCanvas(W, H);
  const ctx = c.getContext('2d')!;
  npcs.forEach((npc, row) => {
    for (let f = 0; f < NPC_FRAMES_PER_ROW; f++) {
      ctx.save();
      ctx.translate(f * NPC_FRAME_W, row * NPC_FRAME_H);
      drawNPC(ctx, npc, f);
      ctx.restore();
    }
  });
  return c;
}
