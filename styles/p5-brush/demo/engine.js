// p5.brush Natural Media — engine.
// Built on the STANDALONE build of p5.brush (no p5.js), driven as a pure function of t.
//
// The page is physical: pigment MULTIPLIES onto paper, light ADDS on top.
//   1. Depth layers are painted once with p5.brush into "paper × pigment" sprites, cut out by a silhouette
//      so nearer layers hide farther ones (sprite()).
//   2. Every frame composites the sprites through a 2.5D camera with parallax (view()), reveals them through
//      a colour-arrival field with a wet front (Arrival), multiplies the live brush layer (bird, splash,
//      pencil) on top, then adds light and a post pass (glow, grade, vignette, paper tooth).
// Every brush mark is drawn under a seed derived from its id, so any frame renders alone, in any order.
import * as brush from '/node_modules/p5.brush/dist/brush.esm.js';
import { clamp, lerp, ss, mulberry } from '/core/lib.js';

export { brush };
export const PAPER = '#f4efe2';

// ---------------------------------------------------------------- deterministic helpers
export function seedOf(id, step = 0) {
  let h = 2166136261 ^ Math.imul(step + 1, 0x9e3779b1);
  for (let i = 0; i < id.length; i++) h = Math.imul(h ^ id.charCodeAt(i), 16777619);
  return h >>> 0;
}
export const rng = id => mulberry(seedOf(id));
// value noise in 1D/2D, and fractal sums of it (deterministic, no state)
const hh = (i, j = 0, s = 0) => { let n = Math.imul(i, 374761393) + Math.imul(j, 668265263) + Math.imul(s, 2246822519); n = Math.imul(n ^ (n >>> 13), 1274126177); return ((n ^ (n >>> 16)) >>> 0) / 4294967296; };
export function noise2(x, y, s = 0) {
  const i = Math.floor(x), j = Math.floor(y), fx = x - i, fy = y - j, u = fx * fx * (3 - 2 * fx), v = fy * fy * (3 - 2 * fy);
  return lerp(lerp(hh(i, j, s), hh(i + 1, j, s), u), lerp(hh(i, j + 1, s), hh(i + 1, j + 1, s), u), v);
}
export const fbm2 = (x, y, s = 0, o = 4) => { let a = 0.5, f = 1, sum = 0, n = 0; for (let k = 0; k < o; k++) { sum += a * noise2(x * f, y * f, s + k * 17); n += a; a *= 0.5; f *= 2.03; } return sum / n; };
export const fbm1 = (x, s = 0, o = 4) => fbm2(x, 0.5, s, o);
export const hash01 = (i, s = 0) => hh(i | 0, 7, s);

// ---------------------------------------------------------------- the brush (live layer)
let live, gl, LW = 1920, LH = 1080;
export function initBrush(W, H, scale) {
  LW = W; LH = H;
  const hold = document.createElement('div');
  hold.style.cssText = 'position:absolute;left:-99999px;top:0;';
  document.body.appendChild(hold);
  live = brush.createCanvas(W, H, { parent: hold, pixelDensity: 1 });
  gl = live.getContext('webgl2');
  brush.scaleBrushes(scale);
  brush.angleMode(brush.DEGREES);
  return live;
}
// Clear a brush target to white paper (pigment is multiplied later, so white = untouched).
export function clearWhite() { brush.clear('#ffffff'); }

// Draw `fn` with the brush RNG seeded from `id`. `boil` = re-seed steps per second (12 = on twos).
export function seeded(id, fn, { boil = 0, t = 0 } = {}) {
  const s = seedOf(id, boil ? Math.floor(t * boil + 1e-6) + 1 : 0);
  brush.seed(s); brush.noiseSeed(s);
  return fn();
}

// ---------------------------------------------------------------- geometry
export function partial(pts, p) {
  p = clamp(p);
  if (p >= 1) return pts;
  if (p <= 0 || pts.length < 2) return [];
  const L = [0];
  for (let i = 1; i < pts.length; i++) L.push(L[i - 1] + Math.hypot(pts[i][0] - pts[i - 1][0], pts[i][1] - pts[i - 1][1]));
  const target = L[L.length - 1] * p, out = [pts[0]];
  for (let i = 1; i < pts.length; i++) {
    if (L[i] <= target) { out.push(pts[i]); continue; }
    const u = (target - L[i - 1]) / (L[i] - L[i - 1] || 1);
    out.push([lerp(pts[i - 1][0], pts[i][0], u), lerp(pts[i - 1][1], pts[i][1], u)]);
    break;
  }
  return out;
}
export function blob(id, cx, cy, rx, ry, n = 18, jit = 0.1, rot = 0) {
  const r = rng(id), pts = [], c = Math.cos(rot), s = Math.sin(rot);
  for (let i = 0; i < n; i++) {
    const a = (Math.PI * 2 * i) / n, k = 1 + (r() - 0.5) * 2 * jit, x = Math.cos(a) * rx * k, y = Math.sin(a) * ry * k;
    pts.push([cx + x * c - y * s, cy + x * s + y * c]);
  }
  return pts;
}
export function ring(cx, cy, rx, ry = rx, n = 48, a0 = -90) {
  const pts = [];
  for (let i = 0; i <= n; i++) { const a = (a0 + (360 * i) / n) * Math.PI / 180; pts.push([cx + Math.cos(a) * rx, cy + Math.sin(a) * ry]); }
  return pts;
}
export function place(pts, x, y, sx = 1, rot = 0, sy = sx) {
  const c = Math.cos(rot * Math.PI / 180), s = Math.sin(rot * Math.PI / 180);
  return pts.map(([px, py]) => { px *= sx; py *= sy; return [x + px * c - py * s, y + px * s + py * c]; });
}
// A wavy band between two edge functions, sampled every `step` px from x0 to x1.
export function band(x0, x1, top, bot, step = 40) {
  const a = [], b = [];
  for (let x = x0; x <= x1 + 0.1; x += step) { a.push([x, top(x)]); b.push([x, bot(x)]); }
  return a.concat(b.reverse());
}
// Tapered blade/feather: from base (x,y) along angle (deg) with length and base width, bending by `bend`.
export function blade(x, y, ang, len, w, bend = 0, n = 7) {
  const L = [], R = [];
  for (let i = 0; i <= n; i++) {
    const u = i / n, a = (ang + bend * u * u) * Math.PI / 180, ww = w * (1 - u) * (1 - u * 0.15);
    const px = x + Math.cos((ang + bend * u * u * 0.5) * Math.PI / 180) * len * u, py = y + Math.sin((ang + bend * u * u * 0.5) * Math.PI / 180) * len * u;
    const nx = -Math.sin(a), ny = Math.cos(a);
    L.push([px + nx * ww / 2, py + ny * ww / 2]); R.push([px - nx * ww / 2, py - ny * ww / 2]);
  }
  return L.concat(R.reverse());
}

// ---------------------------------------------------------------- brush shortcuts (world coords)
export function fillPoly(id, color, alpha, pts, { bleed = 0.04, tex = [0.45, 0.25], boil = 0, t = 0 } = {}) {
  if (alpha <= 0.5 || pts.length < 3) return;
  seeded(id, () => {
    brush.noStroke(); brush.noHatch();
    brush.fill(color, alpha); brush.fillBleed(bleed); brush.fillTexture(tex[0], tex[1]);
    brush.polygon(pts);
  }, { boil, t });
}
export function solid(color, alpha, pts) {   // opaque gouache: reserves (paper white), snow, highlights on pigment
  if (pts.length < 3) return;
  brush.seed(seedOf('solid', pts.length)); brush.noiseSeed(1);
  brush.noStroke(); brush.noHatch(); brush.noFill();
  brush.wash(color, alpha); brush.polygon(pts); brush.noWash();
}
export function stroke(id, name, color, weight, pts, p = 1, { curve = 0.5, boil = 0, t = 0 } = {}) {
  const q = partial(pts, p);
  if (q.length < 2) return;
  seeded(id, () => {
    brush.noFill(); brush.noHatch();
    brush.set(name, color, weight);
    if (q.length === 2) brush.line(q[0][0], q[0][1], q[1][0], q[1][1]);
    else brush.spline(q, curve);
  }, { boil, t });
}
export function dot(id, color, alpha, x, y, r, { bleed = 0.02, boil = 0, t = 0 } = {}) {
  seeded(id, () => { brush.noStroke(); brush.noHatch(); brush.fill(color, alpha); brush.fillBleed(bleed); brush.circle(x, y, r); }, { boil, t });
}

// ---------------------------------------------------------------- camera with parallax
// The camera looks at world point c with zoom z (screen px per world px). A layer of depth d (0 = infinitely
// far, 1 = the page plane, >1 = in front of it) sees the camera move by m = lerp(1, d, P): with parallax P = 0
// everything lies flat on the page; with P = 1 far layers move less and near layers more.
export const C0 = [1200, 700], Z0 = 0.9;
export function view(cam, d, W = LW, H = LH) {
  const m = lerp(1, d, cam.P);
  const cx = C0[0] + (cam.x - C0[0]) * m, cy = C0[1] + (cam.y - C0[1]) * m;
  const z = Z0 * Math.pow(cam.z / Z0, m);
  return { cx, cy, z, W, H };
}
export const toScreen = (v, x, y) => [(x - v.cx) * v.z + v.W / 2, (y - v.cy) * v.z + v.H / 2];
export const set2D = (ctx, v) => ctx.setTransform(v.z, 0, 0, v.z, v.W / 2 - v.cx * v.z, v.H / 2 - v.cy * v.z);
// brush transform for the live layer (WebGL origin is the canvas centre)
export function withView(v, fn) { brush.push(); brush.scale(v.z); brush.translate(-v.cx, -v.cy); fn(); brush.pop(); }

// ---------------------------------------------------------------- sprites: layers painted once
// Region R (world) shared by every layer sprite; paint(fn) draws in world coordinates.
// All sprites are painted on ONE shared WebGL canvas (p5.brush keeps GPU resources per context), then copied out.
// Call doneSprites() afterwards to hand the brush back to the live canvas.
let spriteGL = null;
export function doneSprites() { brush.load(live); if (spriteGL) { spriteGL.width = spriteGL.height = 1; spriteGL = null; } }
export function sprite(R, paint, silhouettes, { blur = 0, feather = 0 } = {}) {
  const w = R.x1 - R.x0, h = R.y1 - R.y0;
  if (!spriteGL) { spriteGL = document.createElement('canvas'); spriteGL.width = w; spriteGL.height = h; }
  const sc = spriteGL;
  brush.load(sc);
  clearWhite();
  brush.push(); brush.translate(-w / 2 - R.x0, -h / 2 - R.y0);
  paint();
  brush.pop(); brush.render();
  const out = document.createElement('canvas'); out.width = w; out.height = h;
  const o = out.getContext('2d');
  o.fillStyle = PAPER; o.fillRect(0, 0, w, h);
  o.globalCompositeOperation = 'multiply'; o.drawImage(sc, 0, 0);
  // silhouette mask, feathered so the watercolour bleed survives the cut
  const m = document.createElement('canvas'); m.width = w; m.height = h;
  const mc = m.getContext('2d');
  mc.translate(-R.x0, -R.y0); mc.fillStyle = '#000'; mc.strokeStyle = '#000'; mc.lineWidth = feather * 2; mc.lineJoin = 'round';
  for (const poly of silhouettes) { mc.beginPath(); poly.forEach(([x, y], i) => i ? mc.lineTo(x, y) : mc.moveTo(x, y)); mc.closePath(); mc.fill(); if (feather) mc.stroke(); }
  o.globalCompositeOperation = 'destination-in';
  o.filter = `blur(${Math.max(0.8, feather / 3)}px)`;
  o.drawImage(m, 0, 0);
  o.filter = 'none'; o.globalCompositeOperation = 'source-over';
  if (!blur) return out;
  const b = document.createElement('canvas'); b.width = w; b.height = h;
  const bc = b.getContext('2d'); bc.filter = `blur(${blur}px)`; bc.drawImage(out, 0, 0);
  return b;
}
export function drawSprite(ctx, img, R, v, { skew = 0, pivotY = R.y1 } = {}) {
  set2D(ctx, v);
  if (skew) ctx.transform(1, 0, skew, 1, -skew * pivotY, 0);
  ctx.drawImage(img, R.x0, R.y0);
  ctx.setTransform(1, 0, 0, 1, 0, 0);
}

// ---------------------------------------------------------------- colour arrival (wet front)
// A field of arrival times over a grid on the page: colour reaches cell (i,j) at A[i,j].
// mask(t) gives the reveal alpha × the page-edge fray; front(t) gives the darker wet band just behind the front.
export class Arrival {
  constructor(G, timeAt, fray) {
    this.G = G;
    this.A = new Float32Array(G.nx * G.ny); this.F = new Float32Array(G.nx * G.ny);
    for (let j = 0; j < G.ny; j++) for (let i = 0; i < G.nx; i++) {
      const x = G.x0 + (i + 0.5) * G.cell, y = G.y0 + (j + 0.5) * G.cell;
      this.A[j * G.nx + i] = timeAt(x, y); this.F[j * G.nx + i] = fray(x, y);
    }
    this.cv = document.createElement('canvas'); this.cv.width = G.nx; this.cv.height = G.ny;
    this.ctx = this.cv.getContext('2d'); this.img = this.ctx.createImageData(G.nx, G.ny);
    this.fv = document.createElement('canvas'); this.fv.width = G.nx; this.fv.height = G.ny;
    this.fctx = this.fv.getContext('2d'); this.fimg = this.fctx.createImageData(G.nx, G.ny);
  }
  update(t, soft = 0.16, band = 0.32) {
    const { A, F } = this, d = this.img.data, e = this.fimg.data;
    for (let k = 0; k < A.length; k++) {
      const u = (t - A[k]) / soft, a = u <= 0 ? 0 : u >= 1 ? 1 : u * u * (3 - 2 * u);
      d[k * 4] = d[k * 4 + 1] = d[k * 4 + 2] = 0; d[k * 4 + 3] = Math.round(255 * a * F[k]);
      const w = (t - A[k]) / band, f = w <= 0 || w >= 1 ? 0 : Math.sin(Math.PI * w) * (1 - w);
      e[k * 4] = e[k * 4 + 1] = e[k * 4 + 2] = 0; e[k * 4 + 3] = Math.round(255 * f * F[k]);
    }
    this.ctx.putImageData(this.img, 0, 0); this.fctx.putImageData(this.fimg, 0, 0);
  }
  drawMask(ctx, v) { const G = this.G; set2D(ctx, v); ctx.imageSmoothingEnabled = true; ctx.drawImage(this.cv, G.x0, G.y0, G.nx * G.cell, G.ny * G.cell); ctx.setTransform(1, 0, 0, 1, 0, 0); }
  drawFront(ctx, v) { const G = this.G; set2D(ctx, v); ctx.drawImage(this.fv, G.x0, G.y0, G.nx * G.cell, G.ny * G.cell); ctx.setTransform(1, 0, 0, 1, 0, 0); }
}

// ---------------------------------------------------------------- paper
// Mottled cotton paper for the page (low-res, smooth) and a fine tooth tile (multiplied over everything).
export function paperMottle(w, h, scale = 6) {
  const c = document.createElement('canvas'); c.width = Math.ceil(w / scale); c.height = Math.ceil(h / scale);
  const x = c.getContext('2d'), im = x.createImageData(c.width, c.height), d = im.data;
  for (let j = 0; j < c.height; j++) for (let i = 0; i < c.width; i++) {
    const n = fbm2(i / 38, j / 38, 3, 4) * 0.7 + fbm2(i / 9, j / 9, 9, 2) * 0.3, v = 0.955 + (n - 0.5) * 0.09, k = (j * c.width + i) * 4;
    d[k] = 255 * v; d[k + 1] = 255 * (v - 0.004); d[k + 2] = 255 * (v - 0.012); d[k + 3] = 255;
  }
  x.putImageData(im, 0, 0);
  return c;
}
export function paperTooth(size = 512) {
  const c = document.createElement('canvas'); c.width = c.height = size;
  const x = c.getContext('2d'), im = x.createImageData(size, size), d = im.data, r = rng('tooth');
  for (let j = 0; j < size; j++) for (let i = 0; i < size; i++) {
    // tileable: wrap the noise lattice
    const n = noise2((i / size) * 64 % 64, (j / size) * 64 % 64, 11) * 0.55 + r() * 0.45, v = 0.93 + n * 0.07, k = (j * size + i) * 4;
    d[k] = d[k + 1] = d[k + 2] = 255 * v; d[k + 3] = 255;
  }
  x.putImageData(im, 0, 0);
  // fibres
  x.globalAlpha = 0.18; x.strokeStyle = '#c9bfa8'; x.lineWidth = 0.8;
  for (let i = 0; i < 260; i++) { const a = r() * 6.28, l = 6 + r() * 26, px = r() * size, py = r() * size; x.beginPath(); x.moveTo(px, py); x.quadraticCurveTo(px + Math.cos(a + 0.6) * l * 0.5, py + Math.sin(a + 0.6) * l * 0.5, px + Math.cos(a) * l, py + Math.sin(a) * l); x.stroke(); }
  return c;
}

// ---------------------------------------------------------------- light (additive)
export function glowAt(ctx, x, y, r, rgb, a) {
  if (a <= 0.003) return;
  const g = ctx.createRadialGradient(x, y, 0, x, y, r);
  g.addColorStop(0, `rgba(${rgb},${a})`); g.addColorStop(0.35, `rgba(${rgb},${a * 0.45})`); g.addColorStop(1, `rgba(${rgb},0)`);
  ctx.fillStyle = g; ctx.fillRect(x - r, y - r, 2 * r, 2 * r);
}
export function star(ctx, x, y, r, a, rgb = '255,248,225') {
  if (a <= 0.01) return;
  glowAt(ctx, x, y, r * 2.2, rgb, a * 0.55);
  ctx.strokeStyle = `rgba(${rgb},${a})`; ctx.lineWidth = Math.max(0.8, r * 0.18);
  ctx.beginPath(); ctx.moveTo(x - r * 1.6, y); ctx.lineTo(x + r * 1.6, y); ctx.moveTo(x, y - r); ctx.lineTo(x, y + r); ctx.stroke();
}
// God rays: soft wedges fanned from a source, slowly turning. Drawn at quarter resolution and blurred,
// so the wedges read as light in haze, not as cut paper. Composite with 'screen'.
let rayC;
export function softRays(ctx, x, y, len, a, t, n = 11) {
  if (a <= 0.003) return;
  const W = ctx.canvas.width, H = ctx.canvas.height;
  if (!rayC) { rayC = document.createElement('canvas'); rayC.width = W / 4; rayC.height = H / 4; }
  const r = rayC.getContext('2d');
  r.setTransform(1, 0, 0, 1, 0, 0); r.clearRect(0, 0, W / 4, H / 4);
  r.setTransform(0.25, 0, 0, 0.25, 0, 0);
  rays(r, x, y, len, a, t, n);
  r.setTransform(1, 0, 0, 1, 0, 0);
  ctx.save(); ctx.filter = 'blur(10px)'; ctx.drawImage(rayC, 0, 0, W, H); ctx.restore();
}
export function rays(ctx, x, y, len, a, t, n = 11) {
  if (a <= 0.003) return;
  for (let i = 0; i < n; i++) {
    const ang = (i / n) * Math.PI * 2 + t * 0.035 + Math.sin(i * 7.3) * 0.2, wdt = 0.05 + 0.05 * hash01(i, 3);
    const k = a * (0.45 + 0.55 * hash01(i, 5)) * (0.75 + 0.25 * Math.sin(t * 0.9 + i));
    const g = ctx.createRadialGradient(x, y, 0, x, y, len);
    g.addColorStop(0, `rgba(255,226,160,${0.34 * k})`); g.addColorStop(0.5, `rgba(255,214,150,${0.12 * k})`); g.addColorStop(1, 'rgba(255,210,150,0)');
    ctx.fillStyle = g; ctx.beginPath(); ctx.moveTo(x, y);
    ctx.arc(x, y, len, ang - wdt, ang + wdt); ctx.closePath(); ctx.fill();
  }
}

// ---------------------------------------------------------------- post
let glowC, gradeC;
export function post(ctx, W, H, { glow = 0.14, warm = 0.12, vignette = 0.32, contrast = 1.14, saturate = 1.2 } = {}) {
  if (!glowC) { glowC = document.createElement('canvas'); glowC.width = W / 4; glowC.height = H / 4; gradeC = document.createElement('canvas'); gradeC.width = W; gradeC.height = H; }
  // contrast and saturation first: paper stays near-white, pigment deepens
  const gc = gradeC.getContext('2d');
  gc.globalCompositeOperation = 'copy'; gc.filter = `contrast(${contrast}) saturate(${saturate})`; gc.drawImage(ctx.canvas, 0, 0); gc.filter = 'none';
  ctx.save(); ctx.globalCompositeOperation = 'copy'; ctx.drawImage(gradeC, 0, 0); ctx.restore();
  const g = glowC.getContext('2d');
  g.globalCompositeOperation = 'copy'; g.filter = 'blur(6px) brightness(1.1)'; g.drawImage(ctx.canvas, 0, 0, W / 4, H / 4); g.filter = 'none';
  ctx.save();
  ctx.globalCompositeOperation = 'screen'; ctx.globalAlpha = glow; ctx.drawImage(glowC, 0, 0, W, H);
  ctx.globalAlpha = 1;
  // grade: warm light from the upper right, cool shade lower left
  ctx.globalCompositeOperation = 'soft-light';
  const lg = ctx.createLinearGradient(W, 0, 0, H);
  lg.addColorStop(0, `rgba(255,190,120,${warm * 2})`); lg.addColorStop(0.55, 'rgba(128,128,128,0)'); lg.addColorStop(1, `rgba(70,90,160,${warm * 1.6})`);
  ctx.fillStyle = lg; ctx.fillRect(0, 0, W, H);
  // vignette
  ctx.globalCompositeOperation = 'multiply';
  const vg = ctx.createRadialGradient(W / 2, H / 2, H * 0.35, W / 2, H / 2, H * 1.05);
  vg.addColorStop(0, 'rgba(255,255,255,1)'); vg.addColorStop(1, `rgba(${Math.round(255 * (1 - vignette))},${Math.round(250 * (1 - vignette))},${Math.round(240 * (1 - vignette))},1)`);
  ctx.fillStyle = vg; ctx.fillRect(0, 0, W, H);
  ctx.restore();
}

// ---------------------------------------------------------------- handwriting
// Text written on left to right (clip grows), in page coordinates through a view.
export function write(ctx, v, txt, x, y, size, font, color, p, { align = 'left', alpha = 1 } = {}) {
  if (p <= 0) return null;
  set2D(ctx, v);
  ctx.font = `${size}px ${font}`; ctx.textBaseline = 'alphabetic';
  const w = ctx.measureText(txt).width, x0 = align === 'center' ? x - w / 2 : align === 'right' ? x - w : x;
  ctx.save(); ctx.beginPath(); ctx.rect(x0 - size, y - size * 1.4, (w + size) * clamp(p) + size * 0.2, size * 2.2); ctx.clip();
  ctx.globalAlpha = alpha; ctx.fillStyle = color; ctx.fillText(txt, x0, y);
  ctx.restore(); ctx.setTransform(1, 0, 0, 1, 0, 0);
  return { x0, y0: y - size * 0.95, x1: x0 + w, y1: y + size * 0.3 };
}
