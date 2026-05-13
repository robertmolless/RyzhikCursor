// Procedural art utilities. All textures used in the game are drawn at
// runtime into HTMLCanvasElements which are then uploaded to Phaser as
// textures. This keeps the build tiny and lets us animate / vary art.

export type Rgb = [number, number, number];

export function hexToRgb(hex: number): Rgb {
  return [(hex >> 16) & 255, (hex >> 8) & 255, hex & 255];
}

export function rgba(r: number, g: number, b: number, a: number) {
  return `rgba(${r | 0},${g | 0},${b | 0},${a})`;
}

export function hexA(hex: number, a: number) {
  const [r, g, b] = hexToRgb(hex);
  return rgba(r, g, b, a);
}

export function shade(hex: number, amt: number): number {
  const [r, g, b] = hexToRgb(hex);
  const nr = Math.max(0, Math.min(255, r + amt));
  const ng = Math.max(0, Math.min(255, g + amt));
  const nb = Math.max(0, Math.min(255, b + amt));
  return (nr << 16) | (ng << 8) | nb;
}

export function newCanvas(w: number, h: number): HTMLCanvasElement {
  const c = document.createElement('canvas');
  c.width = w;
  c.height = h;
  return c;
}

export function softBlob(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  rx: number,
  ry: number,
  fill: string,
  alpha = 1
) {
  ctx.save();
  ctx.globalAlpha = alpha;
  const g = ctx.createRadialGradient(x, y, 0, x, y, Math.max(rx, ry));
  g.addColorStop(0, fill);
  g.addColorStop(1, fill.replace(/,[^,]+\)$/, ',0)'));
  ctx.fillStyle = g;
  ctx.beginPath();
  ctx.ellipse(x, y, rx, ry, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
}

// Deterministic pseudo-random for repeatable art.
export function mulberry32(seed: number) {
  let a = seed >>> 0;
  return function () {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function lerp(a: number, b: number, t: number) {
  return a + (b - a) * t;
}

export function clamp(x: number, a: number, b: number) {
  return Math.max(a, Math.min(b, x));
}
