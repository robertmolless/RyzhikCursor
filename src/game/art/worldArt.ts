// Procedural world art: sky gradient, distant hills, mid foliage, house,
// trees, props, ground. Each function returns an HTMLCanvasElement that
// PreloadScene uploads into Phaser as a texture.

import { hexA, mulberry32, newCanvas } from './paint';

export function makeSkyTexture(w = 2048, h = 720): HTMLCanvasElement {
  const c = newCanvas(w, h);
  const ctx = c.getContext('2d')!;
  // Plain neutral sky; the actual color comes from a tint applied at runtime
  // based on time of day. We give it gentle bands for variety.
  const g = ctx.createLinearGradient(0, 0, 0, h);
  g.addColorStop(0, '#e9c08e');
  g.addColorStop(0.45, '#f7d9a8');
  g.addColorStop(1, '#fff1d4');
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, w, h);
  // Faint horizontal cloud bands
  ctx.globalAlpha = 0.18;
  for (let i = 0; i < 6; i++) {
    ctx.fillStyle = '#ffffff';
    const y = h * (0.2 + i * 0.07);
    ctx.beginPath();
    ctx.ellipse(w / 2 + i * 80, y, w * 0.7, 14 + i * 2, 0, 0, Math.PI * 2);
    ctx.fill();
  }
  return c;
}

export function makeStarsTexture(w = 2048, h = 720): HTMLCanvasElement {
  const c = newCanvas(w, h);
  const ctx = c.getContext('2d')!;
  ctx.fillStyle = 'rgba(0,0,0,0)';
  ctx.fillRect(0, 0, w, h);
  const rnd = mulberry32(42);
  for (let i = 0; i < 400; i++) {
    const x = rnd() * w;
    const y = rnd() * h * 0.7;
    const r = rnd() * 1.1 + 0.3;
    const a = 0.4 + rnd() * 0.6;
    ctx.fillStyle = `rgba(255,255,240,${a})`;
    ctx.beginPath();
    ctx.arc(x, y, r, 0, Math.PI * 2);
    ctx.fill();
    if (rnd() > 0.985) {
      ctx.fillStyle = `rgba(255,255,255,${a * 0.5})`;
      ctx.beginPath();
      ctx.arc(x, y, r * 2.5, 0, Math.PI * 2);
      ctx.fill();
    }
  }
  // Moon
  const mx = w * 0.78;
  const my = h * 0.22;
  const mg = ctx.createRadialGradient(mx, my, 0, mx, my, 90);
  mg.addColorStop(0, 'rgba(255,250,220,1)');
  mg.addColorStop(0.4, 'rgba(255,240,200,0.4)');
  mg.addColorStop(1, 'rgba(255,240,200,0)');
  ctx.fillStyle = mg;
  ctx.beginPath();
  ctx.arc(mx, my, 90, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = 'rgba(255,250,230,1)';
  ctx.beginPath();
  ctx.arc(mx, my, 28, 0, Math.PI * 2);
  ctx.fill();
  return c;
}

export function makeHillsFar(w = 2400, h = 320): HTMLCanvasElement {
  const c = newCanvas(w, h);
  const ctx = c.getContext('2d')!;
  const rnd = mulberry32(11);
  // distant hills
  for (let layer = 0; layer < 3; layer++) {
    const colors = ['#6f7e8a', '#5b6f7a', '#4a5d68'];
    ctx.fillStyle = hexA(parseInt(colors[layer].slice(1), 16), 0.7 + layer * 0.1);
    ctx.beginPath();
    const baseY = h - 60 - layer * 30;
    ctx.moveTo(0, h);
    ctx.lineTo(0, baseY);
    let x = 0;
    while (x < w) {
      const peak = 40 + rnd() * 60 - layer * 10;
      const span = 120 + rnd() * 160;
      ctx.quadraticCurveTo(x + span / 2, baseY - peak, x + span, baseY + (rnd() - 0.5) * 30);
      x += span;
    }
    ctx.lineTo(w, h);
    ctx.closePath();
    ctx.fill();
  }
  return c;
}

export function makeTreesFar(w = 2400, h = 360): HTMLCanvasElement {
  const c = newCanvas(w, h);
  const ctx = c.getContext('2d')!;
  const rnd = mulberry32(7);
  // soft tree silhouettes
  for (let i = 0; i < 80; i++) {
    const x = rnd() * w;
    const baseY = h - 20;
    const treeH = 80 + rnd() * 110;
    const treeW = 30 + rnd() * 30;
    const shade = 60 + Math.floor(rnd() * 30);
    ctx.fillStyle = `rgba(${shade},${shade + 25},${shade},0.75)`;
    ctx.beginPath();
    ctx.ellipse(x, baseY - treeH * 0.45, treeW * 0.7, treeH * 0.55, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = `rgba(40,30,20,0.6)`;
    ctx.fillRect(x - 2, baseY - treeH * 0.1, 4, treeH * 0.15);
  }
  return c;
}

export function makeGroundTexture(w = 2400, h = 360): HTMLCanvasElement {
  const c = newCanvas(w, h);
  const ctx = c.getContext('2d')!;
  // soft green-brown ground with darker patches
  const g = ctx.createLinearGradient(0, 0, 0, h);
  g.addColorStop(0, '#5a7c46');
  g.addColorStop(0.4, '#4a6c3b');
  g.addColorStop(1, '#33502b');
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, w, h);
  const rnd = mulberry32(33);
  // dirt path winding
  ctx.fillStyle = 'rgba(120,90,60,0.5)';
  for (let i = 0; i < 200; i++) {
    const x = (i / 200) * w + Math.sin(i / 8) * 20;
    const y = 110 + Math.sin(i / 5) * 20 + Math.cos(i / 3) * 10;
    ctx.beginPath();
    ctx.ellipse(x, y, 26 + rnd() * 10, 8 + rnd() * 3, 0, 0, Math.PI * 2);
    ctx.fill();
  }
  // grass tufts
  for (let i = 0; i < 800; i++) {
    const x = rnd() * w;
    const y = rnd() * h;
    const lh = 4 + rnd() * 6;
    ctx.fillStyle = `rgba(${100 + rnd() * 60 | 0},${160 + rnd() * 40 | 0},${80 + rnd() * 40 | 0},0.6)`;
    ctx.fillRect(x, y, 1, lh);
  }
  // dark vignette to the bottom
  const v = ctx.createLinearGradient(0, 0, 0, h);
  v.addColorStop(0, 'rgba(0,0,0,0)');
  v.addColorStop(1, 'rgba(0,0,0,0.35)');
  ctx.fillStyle = v;
  ctx.fillRect(0, 0, w, h);
  return c;
}

export function makeHouseTexture(w = 720, h = 520): HTMLCanvasElement {
  const c = newCanvas(w, h);
  const ctx = c.getContext('2d')!;
  // shadow under house
  ctx.fillStyle = 'rgba(0,0,0,0.35)';
  ctx.beginPath();
  ctx.ellipse(w / 2, h - 6, w * 0.45, 16, 0, 0, Math.PI * 2);
  ctx.fill();

  // body
  const bodyG = ctx.createLinearGradient(0, 100, 0, h - 20);
  bodyG.addColorStop(0, '#a87856');
  bodyG.addColorStop(1, '#6f4a30');
  ctx.fillStyle = bodyG;
  ctx.fillRect(60, 180, w - 120, h - 200);
  // wood planks
  ctx.strokeStyle = 'rgba(40,25,15,0.35)';
  ctx.lineWidth = 1;
  for (let y = 200; y < h - 20; y += 18) {
    ctx.beginPath();
    ctx.moveTo(60, y);
    ctx.lineTo(w - 60, y);
    ctx.stroke();
  }
  // roof
  ctx.fillStyle = '#3a2018';
  ctx.beginPath();
  ctx.moveTo(40, 200);
  ctx.lineTo(w / 2, 60);
  ctx.lineTo(w - 40, 200);
  ctx.closePath();
  ctx.fill();
  // roof shadow
  ctx.fillStyle = 'rgba(0,0,0,0.25)';
  ctx.beginPath();
  ctx.moveTo(40, 200);
  ctx.lineTo(w - 40, 200);
  ctx.lineTo(w - 60, 220);
  ctx.lineTo(60, 220);
  ctx.closePath();
  ctx.fill();
  // chimney
  ctx.fillStyle = '#6b3a25';
  ctx.fillRect(w - 200, 90, 36, 80);
  ctx.fillStyle = '#3a2018';
  ctx.fillRect(w - 204, 86, 44, 8);
  // window 1
  drawWindow(ctx, 130, 250, 110, 110);
  // window 2
  drawWindow(ctx, w - 240, 250, 110, 110);
  // door
  ctx.fillStyle = '#3a2316';
  ctx.fillRect(w / 2 - 50, h - 200, 100, 180);
  ctx.fillStyle = '#2a1810';
  ctx.fillRect(w / 2 - 50, h - 200, 100, 6);
  ctx.fillStyle = '#ffd28a';
  ctx.beginPath();
  ctx.arc(w / 2 + 30, h - 110, 3.5, 0, Math.PI * 2);
  ctx.fill();
  // porch
  ctx.fillStyle = '#7a5638';
  ctx.fillRect(w / 2 - 130, h - 30, 260, 16);
  ctx.fillStyle = 'rgba(0,0,0,0.25)';
  ctx.fillRect(w / 2 - 130, h - 14, 260, 4);
  // porch roof
  ctx.fillStyle = '#2c1a12';
  ctx.beginPath();
  ctx.moveTo(w / 2 - 150, h - 200);
  ctx.lineTo(w / 2, h - 250);
  ctx.lineTo(w / 2 + 150, h - 200);
  ctx.lineTo(w / 2 + 130, h - 200);
  ctx.lineTo(w / 2, h - 232);
  ctx.lineTo(w / 2 - 130, h - 200);
  ctx.closePath();
  ctx.fill();
  // wooden pillars
  ctx.fillStyle = '#5a3b25';
  ctx.fillRect(w / 2 - 130, h - 200, 8, 170);
  ctx.fillRect(w / 2 + 122, h - 200, 8, 170);

  return c;
}

function drawWindow(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number
) {
  ctx.fillStyle = '#241510';
  ctx.fillRect(x - 4, y - 4, w + 8, h + 8);
  ctx.fillStyle = '#f4d28a';
  ctx.fillRect(x, y, w, h);
  // soft inside glow
  const g = ctx.createRadialGradient(x + w / 2, y + h / 2, 0, x + w / 2, y + h / 2, w);
  g.addColorStop(0, 'rgba(255,210,140,0.9)');
  g.addColorStop(1, 'rgba(255,210,140,0)');
  ctx.fillStyle = g;
  ctx.fillRect(x, y, w, h);
  // frame cross
  ctx.fillStyle = '#3a2018';
  ctx.fillRect(x + w / 2 - 2, y, 4, h);
  ctx.fillRect(x, y + h / 2 - 2, w, 4);
  // curtain
  ctx.fillStyle = 'rgba(245,180,120,0.6)';
  ctx.beginPath();
  ctx.moveTo(x, y);
  ctx.lineTo(x + 20, y);
  ctx.quadraticCurveTo(x + 5, y + h / 2, x + 20, y + h);
  ctx.lineTo(x, y + h);
  ctx.closePath();
  ctx.fill();
}

export function makeTreeTexture(seed = 1): HTMLCanvasElement {
  const w = 260;
  const h = 360;
  const c = newCanvas(w, h);
  const ctx = c.getContext('2d')!;
  const rnd = mulberry32(seed);
  // shadow
  ctx.fillStyle = 'rgba(0,0,0,0.3)';
  ctx.beginPath();
  ctx.ellipse(w / 2, h - 6, 60, 10, 0, 0, Math.PI * 2);
  ctx.fill();
  // trunk
  ctx.fillStyle = '#3a2615';
  ctx.beginPath();
  ctx.moveTo(w / 2 - 14, h - 20);
  ctx.quadraticCurveTo(w / 2 - 10, h * 0.5, w / 2 - 8, h * 0.3);
  ctx.lineTo(w / 2 + 8, h * 0.3);
  ctx.quadraticCurveTo(w / 2 + 10, h * 0.5, w / 2 + 14, h - 20);
  ctx.closePath();
  ctx.fill();
  ctx.strokeStyle = 'rgba(20,12,5,0.5)';
  ctx.lineWidth = 1;
  for (let i = 0; i < 5; i++) {
    ctx.beginPath();
    ctx.moveTo(w / 2 - 10 + rnd() * 20, h * 0.4 + rnd() * (h * 0.5));
    ctx.lineTo(w / 2 - 8 + rnd() * 16, h * 0.5 + rnd() * (h * 0.4));
    ctx.stroke();
  }
  // foliage clusters
  const clusters = 14;
  for (let i = 0; i < clusters; i++) {
    const angle = rnd() * Math.PI * 2;
    const r = 60 + rnd() * 40;
    const cx = w / 2 + Math.cos(angle) * r * 0.7;
    const cy = h * 0.32 + Math.sin(angle) * r * 0.5 - 30;
    const sz = 40 + rnd() * 30;
    const shade = 90 + Math.floor(rnd() * 50);
    ctx.fillStyle = `rgba(${shade - 30},${shade + 40},${shade - 20},0.9)`;
    ctx.beginPath();
    ctx.ellipse(cx, cy, sz, sz * 0.8, 0, 0, Math.PI * 2);
    ctx.fill();
  }
  // top highlight
  ctx.fillStyle = 'rgba(220,255,180,0.25)';
  ctx.beginPath();
  ctx.ellipse(w / 2 - 10, h * 0.2, 50, 30, 0, 0, Math.PI * 2);
  ctx.fill();
  return c;
}

export function makeBushTexture(seed = 1): HTMLCanvasElement {
  const w = 160;
  const h = 90;
  const c = newCanvas(w, h);
  const ctx = c.getContext('2d')!;
  const rnd = mulberry32(seed);
  ctx.fillStyle = 'rgba(0,0,0,0.25)';
  ctx.beginPath();
  ctx.ellipse(w / 2, h - 6, 50, 6, 0, 0, Math.PI * 2);
  ctx.fill();
  for (let i = 0; i < 8; i++) {
    const cx = w / 2 + (rnd() - 0.5) * 80;
    const cy = h - 20 - rnd() * 30;
    const sz = 20 + rnd() * 20;
    const shade = 80 + Math.floor(rnd() * 50);
    ctx.fillStyle = `rgba(${shade - 30},${shade + 40},${shade - 20},0.9)`;
    ctx.beginPath();
    ctx.ellipse(cx, cy, sz, sz * 0.8, 0, 0, Math.PI * 2);
    ctx.fill();
  }
  // flowers
  for (let i = 0; i < 3; i++) {
    const x = rnd() * w;
    const y = h - 20 - rnd() * 30;
    ctx.fillStyle = ['#ffb0c4', '#fff2a0', '#c4a3ff'][i % 3];
    ctx.beginPath();
    ctx.arc(x, y, 2, 0, Math.PI * 2);
    ctx.fill();
  }
  return c;
}

export function makeShedTexture(): HTMLCanvasElement {
  const w = 220;
  const h = 220;
  const c = newCanvas(w, h);
  const ctx = c.getContext('2d')!;
  ctx.fillStyle = 'rgba(0,0,0,0.3)';
  ctx.beginPath();
  ctx.ellipse(w / 2, h - 6, 90, 8, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = '#7a5028';
  ctx.fillRect(20, 70, w - 40, h - 80);
  // roof
  ctx.fillStyle = '#2a1810';
  ctx.beginPath();
  ctx.moveTo(10, 80);
  ctx.lineTo(w / 2, 30);
  ctx.lineTo(w - 10, 80);
  ctx.closePath();
  ctx.fill();
  // door
  ctx.fillStyle = '#3a2316';
  ctx.fillRect(w / 2 - 28, 110, 56, h - 120);
  ctx.fillStyle = '#1a100a';
  ctx.fillRect(w / 2 - 28, 110, 56, 4);
  ctx.fillStyle = '#ffd28a';
  ctx.beginPath();
  ctx.arc(w / 2 + 16, 170, 2.5, 0, Math.PI * 2);
  ctx.fill();
  // planks
  ctx.strokeStyle = 'rgba(30,18,10,0.5)';
  for (let x = 30; x < w - 30; x += 20) {
    ctx.beginPath();
    ctx.moveTo(x, 80);
    ctx.lineTo(x, h - 10);
    ctx.stroke();
  }
  return c;
}

export function makeCampfireTexture(): HTMLCanvasElement {
  const w = 100;
  const h = 80;
  const c = newCanvas(w, h);
  const ctx = c.getContext('2d')!;
  // stones
  ctx.fillStyle = 'rgba(0,0,0,0.3)';
  ctx.beginPath();
  ctx.ellipse(w / 2, h - 8, 36, 6, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = '#6a6a6a';
  for (let i = 0; i < 6; i++) {
    const a = (i / 6) * Math.PI * 2;
    ctx.beginPath();
    ctx.arc(w / 2 + Math.cos(a) * 24, h - 18 + Math.sin(a) * 8, 7, 0, Math.PI * 2);
    ctx.fill();
  }
  // logs
  ctx.fillStyle = '#3a2316';
  ctx.fillRect(w / 2 - 18, h - 26, 36, 6);
  ctx.fillRect(w / 2 - 14, h - 32, 28, 4);
  return c;
}

export function makeBenchTexture(): HTMLCanvasElement {
  const w = 140;
  const h = 60;
  const c = newCanvas(w, h);
  const ctx = c.getContext('2d')!;
  ctx.fillStyle = 'rgba(0,0,0,0.3)';
  ctx.beginPath();
  ctx.ellipse(w / 2, h - 4, 60, 4, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = '#7a4f30';
  ctx.fillRect(10, 22, w - 20, 8);
  ctx.fillRect(15, 30, 4, 22);
  ctx.fillRect(w - 19, 30, 4, 22);
  ctx.strokeStyle = 'rgba(0,0,0,0.4)';
  ctx.beginPath();
  ctx.moveTo(10, 30);
  ctx.lineTo(w - 10, 30);
  ctx.stroke();
  return c;
}

export function makeSwingTexture(): HTMLCanvasElement {
  const w = 160;
  const h = 180;
  const c = newCanvas(w, h);
  const ctx = c.getContext('2d')!;
  ctx.strokeStyle = '#3a2316';
  ctx.lineWidth = 4;
  ctx.beginPath();
  ctx.moveTo(20, 10);
  ctx.lineTo(w - 20, 10);
  ctx.stroke();
  ctx.strokeStyle = '#a87a52';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(50, 10);
  ctx.lineTo(45, h - 50);
  ctx.moveTo(w - 50, 10);
  ctx.lineTo(w - 45, h - 50);
  ctx.stroke();
  ctx.fillStyle = '#7a4f30';
  ctx.fillRect(30, h - 60, w - 60, 8);
  return c;
}

export function makeLanternTexture(): HTMLCanvasElement {
  const w = 36;
  const h = 60;
  const c = newCanvas(w, h);
  const ctx = c.getContext('2d')!;
  ctx.fillStyle = '#3a2316';
  ctx.fillRect(w / 2 - 1, 0, 2, 12);
  ctx.fillStyle = '#2a1810';
  ctx.fillRect(w / 2 - 8, 12, 16, 6);
  const g = ctx.createRadialGradient(w / 2, 28, 2, w / 2, 28, 18);
  g.addColorStop(0, 'rgba(255,220,150,1)');
  g.addColorStop(1, 'rgba(255,180,80,0)');
  ctx.fillStyle = g;
  ctx.beginPath();
  ctx.arc(w / 2, 28, 18, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = '#3a2316';
  ctx.fillRect(w / 2 - 8, 38, 16, 4);
  return c;
}

export function makeCassetteTexture(): HTMLCanvasElement {
  const w = 30;
  const h = 22;
  const c = newCanvas(w, h);
  const ctx = c.getContext('2d')!;
  ctx.fillStyle = '#1a1a14';
  ctx.fillRect(0, 0, w, h);
  ctx.fillStyle = '#d9a06d';
  ctx.fillRect(3, 3, w - 6, 6);
  ctx.fillStyle = '#fff';
  ctx.beginPath();
  ctx.arc(9, 14, 3, 0, Math.PI * 2);
  ctx.arc(21, 14, 3, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = '#1a1a14';
  ctx.beginPath();
  ctx.arc(9, 14, 1, 0, Math.PI * 2);
  ctx.arc(21, 14, 1, 0, Math.PI * 2);
  ctx.fill();
  return c;
}

export function makeFireflyTexture(): HTMLCanvasElement {
  const w = 24;
  const h = 24;
  const c = newCanvas(w, h);
  const ctx = c.getContext('2d')!;
  const g = ctx.createRadialGradient(w / 2, h / 2, 0, w / 2, h / 2, w / 2);
  g.addColorStop(0, 'rgba(255,255,180,1)');
  g.addColorStop(0.3, 'rgba(255,230,120,0.8)');
  g.addColorStop(1, 'rgba(255,200,80,0)');
  ctx.fillStyle = g;
  ctx.beginPath();
  ctx.arc(w / 2, h / 2, w / 2, 0, Math.PI * 2);
  ctx.fill();
  return c;
}

export function makeRainTexture(): HTMLCanvasElement {
  const w = 8;
  const h = 16;
  const c = newCanvas(w, h);
  const ctx = c.getContext('2d')!;
  ctx.strokeStyle = 'rgba(200,220,255,0.75)';
  ctx.lineWidth = 1.4;
  ctx.beginPath();
  ctx.moveTo(w / 2, 0);
  ctx.lineTo(w / 2 - 2, h);
  ctx.stroke();
  return c;
}

export function makeLeafTexture(seed = 1): HTMLCanvasElement {
  const w = 14;
  const h = 10;
  const c = newCanvas(w, h);
  const ctx = c.getContext('2d')!;
  const rnd = mulberry32(seed);
  const palette = ['#a8d57a', '#7ab95a', '#e0c060', '#c4823a'];
  ctx.fillStyle = palette[(rnd() * palette.length) | 0];
  ctx.beginPath();
  ctx.ellipse(w / 2, h / 2, w / 2, h / 2, 0.5, 0, Math.PI * 2);
  ctx.fill();
  return c;
}

export function makeGarlandLight(): HTMLCanvasElement {
  const w = 12;
  const h = 12;
  const c = newCanvas(w, h);
  const ctx = c.getContext('2d')!;
  const g = ctx.createRadialGradient(w / 2, h / 2, 0, w / 2, h / 2, w / 2);
  g.addColorStop(0, 'rgba(255,220,150,1)');
  g.addColorStop(1, 'rgba(255,180,100,0)');
  ctx.fillStyle = g;
  ctx.beginPath();
  ctx.arc(w / 2, h / 2, w / 2, 0, Math.PI * 2);
  ctx.fill();
  return c;
}

export function makeStickerTexture(): HTMLCanvasElement {
  const w = 22;
  const h = 22;
  const c = newCanvas(w, h);
  const ctx = c.getContext('2d')!;
  ctx.fillStyle = '#ffb0c4';
  ctx.beginPath();
  ctx.arc(w / 2, h / 2, 9, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = '#fff';
  ctx.font = 'bold 10px Quicksand';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText('★', w / 2, h / 2 + 1);
  return c;
}

export function makePickTexture(): HTMLCanvasElement {
  const w = 16;
  const h = 18;
  const c = newCanvas(w, h);
  const ctx = c.getContext('2d')!;
  ctx.fillStyle = '#c94a3a';
  ctx.beginPath();
  ctx.moveTo(w / 2, 1);
  ctx.lineTo(w - 1, h - 6);
  ctx.lineTo(w / 2, h - 1);
  ctx.lineTo(1, h - 6);
  ctx.closePath();
  ctx.fill();
  return c;
}

export function makeBellTexture(): HTMLCanvasElement {
  const w = 22;
  const h = 24;
  const c = newCanvas(w, h);
  const ctx = c.getContext('2d')!;
  ctx.fillStyle = '#d6c280';
  ctx.beginPath();
  ctx.moveTo(w / 2 - 8, h - 4);
  ctx.lineTo(w / 2 - 6, 8);
  ctx.quadraticCurveTo(w / 2, 0, w / 2 + 6, 8);
  ctx.lineTo(w / 2 + 8, h - 4);
  ctx.closePath();
  ctx.fill();
  ctx.fillStyle = '#7a6630';
  ctx.fillRect(w / 2 - 1, 0, 2, 4);
  ctx.beginPath();
  ctx.arc(w / 2, h - 2, 2, 0, Math.PI * 2);
  ctx.fill();
  return c;
}

export function makeBoxTexture(): HTMLCanvasElement {
  const w = 60;
  const h = 50;
  const c = newCanvas(w, h);
  const ctx = c.getContext('2d')!;
  ctx.fillStyle = 'rgba(0,0,0,0.3)';
  ctx.beginPath();
  ctx.ellipse(w / 2, h - 4, 28, 4, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = '#a87a52';
  ctx.fillRect(6, 10, w - 12, h - 14);
  ctx.fillStyle = '#7a5028';
  ctx.fillRect(6, 10, w - 12, 6);
  ctx.strokeStyle = 'rgba(40,20,10,0.6)';
  ctx.beginPath();
  ctx.moveTo(w / 2, 10);
  ctx.lineTo(w / 2, h - 4);
  ctx.stroke();
  return c;
}
