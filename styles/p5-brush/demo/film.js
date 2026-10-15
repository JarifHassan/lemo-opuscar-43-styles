// "First Light" — the demo film of the p5.brush Natural Media style (24 s, 96 BPM, 4/4).
// A drop of gold lands on a blank sheet and blooms into the sun; sunrise paints a pencilled valley; a blue bird
// hovers, dives, takes a fish and climbs through the sun, off the painting and into the page's margin.
import {
  brush, PAPER, initBrush, doneSprites, sprite, drawSprite, view, toScreen, set2D, withView, Arrival, clearWhite,
  paperMottle, paperTooth, glowAt, star, softRays, post, write, fillPoly, solid, stroke, dot, blob, ring, place, rng, hash01, fbm2, seeded,
} from './engine.js';
import { LAYERS, R, PAINT, PAGE, SUN, SHORE, bankTop } from './world.js';
import { drawBird, silhouette, highlights } from './bird.js';
import { clamp, lerp, seg, ss, eio, eo, ei, monotone } from '/core/lib.js';

const W = 1920, H = 1080, BEAT = 0.625;
export const DUR = 24;

// ---------------------------------------------------------------- timeline (on the beat grid)
export const T = {
  drop: 1 * BEAT, bloomEnd: 2.4, pencil: [0.9, 3.15], arrive: 5 * BEAT,
  wide: 12 * BEAT, enter: 17 * BEAT, hover: 20 * BEAT, silence: 21 * BEAT, dive: 22 * BEAT, splash: 23 * BEAT, burst: 24 * BEAT,
  pull: 28 * BEAT, title: 32 * BEAT, note: 32 * BEAT + 0.1, sub: 20.4, date: 20.6,
};

// ---------------------------------------------------------------- camera
const KEYS = [[0, 1700, 380, 1.55], [3.1, 1560, 470, 1.22], [5.6, 1380, 660, 1.04], [7.5, 1360, 760, 1.04], [10.6, 1060, 760, 0.95],
  [11.3, 1000, 650, 1.0], [12.0, 1060, 680, 1.2], [12.5, 1150, 690, 1.42], [13.75, 1150, 700, 1.7], [14.375, 1160, 780, 1.78],
  [15.0, 1185, 770, 1.55], [16.0, 1330, 640, 1.25], [17.5, 1440, 560, 1.05], [19.0, 1450, 520, 0.72], [20.2, 1240, 690, 0.585], [24, 1200, 710, 0.55]];
const cx = monotone(KEYS.map(k => [k[0], k[1]])), cy = monotone(KEYS.map(k => [k[0], k[2]])), cz = monotone(KEYS.map(k => [k[0], Math.log(k[3])]));
export function camAt(t) {
  const dt = t - T.splash, hit = dt > 0 && dt < 0.6 ? Math.exp(-7 * dt) : 0;
  const P = ss(seg(t, 2.8, 5.8)) * (1 - ss(seg(t, T.pull, 21.0)));
  return { x: cx(t) + 9 * hit * Math.sin(dt * 80), y: cy(t) + 7 * hit * Math.cos(dt * 95), z: Math.exp(cz(t)) * (1 + 0.07 * hit), P };
}
const light = t => ss(seg(t, 3.4, 6.6)) * (1 - 0.75 * ss(seg(t, 18.0, 21.0)));

// ---------------------------------------------------------------- the bird's flight
const BIRD_DEPTH = 0.66;
const S = [1162, 852];   // where it hits the water
const PATH = [[10.625, 60, 380, 3.0], [11.3, 700, 540, 2.1], [11.9, 1000, 620, 1.7], [12.5, 1150, 660, 1.55], [13.5, 1150, 656, 1.55], [13.75, 1148, 640, 1.55],
  [14.375, S[0] - 30, S[1] - 70, 1.5], [15.0, S[0] + 10, S[1] - 40, 1.45], [15.5, 1300, 690, 1.3], [16.3, 1480, 540, 1.0], [17.2, 1660, 400, 0.7], [17.7, 1760, 330, 0.62],
  [18.6, 1990, 190, 0.6], [19.4, 2300, 40, 0.7], [19.9, 2400, -60, 0.95], [20.5, 2436, -118, 1.12], [24, 2444, -126, 1.12]];
const px = monotone(PATH.map(k => [k[0], k[1]])), py = monotone(PATH.map(k => [k[0], k[2]])), ps = monotone(PATH.map(k => [k[0], k[3]]));
const DIVE_PATH = t => { const u = ei(seg(t, T.dive, T.splash)); return [lerp(1148, S[0] - 30, u), lerp(640, S[1] - 70, u)]; };

function birdAt(t) {
  if (t < T.enter || (t > T.splash && t < T.burst)) return null;
  let x = px(t), y = py(t), s = ps(t), lift = 0, fold = 0, rot = 0;
  if (t >= T.dive && t <= T.splash) [x, y] = DIVE_PATH(t);
  if (t >= T.hover && t < T.dive) { x += 5 * Math.sin(t * 2.3); y += 7 * Math.sin(t * Math.PI * 2 * 1.3); }
  if (t > 20.5) y += 6 * Math.sin((t - 20.5) * 2.2);
  const dt = 0.04, vx = px(t + dt) - px(t - dt), vy = py(t + dt) - py(t - dt);
  rot = clamp(Math.atan2(vy, Math.abs(vx) + 1e-3) * 180 / Math.PI, -38, 32);
  if (t < T.hover) lift = Math.cos(2 * Math.PI * 3.2 * (t - T.enter));
  else if (t < 13.5) { lift = Math.sin(2 * Math.PI * 10 * t); rot = -18; }
  else if (t < T.dive) { lift = lerp(Math.sin(2 * Math.PI * 10 * 13.5), 1, ss(seg(t, 13.5, 13.62))); rot = lerp(-18, -30, seg(t, 13.5, T.dive)); }
  else if (t <= T.splash) { fold = ss(seg(t, T.dive, T.dive + 0.14)); lift = 1; rot = lerp(-30, 72, eo(seg(t, T.dive, T.dive + 0.25))); }
  else if (t < 19.9) { fold = 1 - ss(seg(t, T.burst, T.burst + 0.28)); lift = fold > 0.5 ? 1 : Math.cos(2 * Math.PI * 3.4 * (t - T.burst - 0.28)); if (t < 15.4) rot = lerp(-60, rot, seg(t, T.burst, 15.4)); }
  else { const g = ss(seg(t, 19.9, 20.6)); lift = lerp(Math.cos(2 * Math.PI * 3.4 * (19.9 - T.burst - 0.28)), 0.35 + 0.18 * Math.sin((t - 20) * 2.4), g); rot = lerp(rot, -6, g); }
  // colour lives only inside the painting: crossing its edge, the bird becomes a pencil sketch on the margin
  const inside = Math.min(x - PAINT.x0, PAINT.x1 - x, y - PAINT.y0, PAINT.y1 - y);
  const colour = ss(clamp((inside + 110) / 150));
  return { x, y, s, rot, lift, fold, flip: 1, colour, fish: t >= T.burst, feet: t >= T.hover && t < T.dive, t };
}

// ---------------------------------------------------------------- events for the mixer
export const EV = (() => {
  const ev = [{ t: T.drop, type: 'drop' }, { t: T.drop + 0.05, type: 'bloom', d: 1.8 }, { t: 2.5, type: 'birdsJ' }, { t: T.arrive, type: 'wash', d: 3.6 },
    { t: T.enter, type: 'pass' }, { t: T.hover, type: 'hover', d: T.dive - T.hover }, { t: T.silence, type: 'silence' }, { t: T.dive, type: 'dive' },
    { t: T.splash, type: 'splash' }, { t: T.splash + 0.05, type: 'under', d: T.burst - T.splash }, { t: T.burst, type: 'burst' }, { t: T.burst + 0.1, type: 'drips', d: 1.4 },
    { t: 17.6, type: 'sun' }, { t: T.title, type: 'write', d: 0.8 }, { t: T.sub, type: 'write', d: 0.7 }, { t: T.date, type: 'write', d: 0.7 }];
  for (const [a, d] of [[0.9, 0.7], [1.3, 0.9], [1.7, 1.0], [2.2, 0.9]]) ev.push({ t: a, type: 'pencil', d });
  for (let t = T.enter; t < T.hover - 0.1; t += 1 / 3.2) ev.push({ t: +t.toFixed(3), type: 'flap', v: 0.9, pan: -0.6 + 0.8 * seg(t, T.enter, T.hover) });
  for (let t = T.burst + 0.28; t < 19.9; t += 1 / 3.4) ev.push({ t: +t.toFixed(3), type: 'flap', v: lerp(1, 0.3, seg(t, T.burst, 19.9)), pan: lerp(0, 0.7, seg(t, T.burst, 19.9)) });
  return ev.sort((a, b) => a.t - b.t);
})();

// ---------------------------------------------------------------- state built once
let fray, F, B, TT, tooth, mottle, arrival, SPR = {}, PENCIL = [], SPAT = [], widths = {};

function buildPencil() {
  const out = [];
  for (const L of LAYERS) L.pencil().forEach((pts, i) => {
    if (pts.length < 2) return;
    const d = Math.min(...pts.map(([x, y]) => Math.hypot(x - SUN[0], y - SUN[1])));
    let len = 0; for (let k = 1; k < pts.length; k++) len += Math.hypot(pts[k][0] - pts[k - 1][0], pts[k][1] - pts[k - 1][1]);
    const t0 = T.pencil[0] + (d / 2200) * 1.2, dur = Math.min(1.1, 0.35 + len / 4000);
    out.push({ id: `pc.${L.id}.${i}`, depth: L.depth, pts, t0, dur });
  });
  return out;
}

// ---------------------------------------------------------------- frame
function drawLive(t, cam) {
  clearWhite();
  // pencil underdrawing, on each layer's plane; it stays under the colour like a real study
  for (const p of PENCIL) {
    const prog = ss(seg(t, p.t0, p.t0 + p.dur));
    if (prog <= 0) continue;
    withView(view(cam, p.depth), () => stroke(p.id, 'HB', '#5a5a64', 0.9, p.pts, prog, { curve: 0.4 }));
  }
  const vs = view(cam, 0.04), vb = view(cam, BIRD_DEPTH), vl = view(cam, 0.58);
  // the drop and its bloom: becomes the sun, then hands over to the painted sky
  if (t >= T.drop - 0.12 && t < 3.9) withView(vs, () => {
    const fade = 1 - ss(seg(t, 3.15, 3.85));
    if (t < T.drop) { const u = seg(t, T.drop - 0.12, T.drop); dot('drop', '#e0951e', 230, SUN[0], SUN[1] - 60 * (1 - u), 7 + 3 * u); return; }
    const r = 10 + 150 * eo(seg(t, T.drop, T.bloomEnd));
    fillPoly('bloomO', '#ffb23e', 170 * fade, blob('bloomO', SUN[0], SUN[1], r * 1.08, r * 1.04, 30, 0.07), { bleed: 0.05 });
    fillPoly('bloomI', '#ffd36e', 200 * fade, blob('bloomI', SUN[0], SUN[1], r * 0.86, r * 0.84, 28, 0.06), { bleed: 0.04 });
    for (let i = 0; i < 9; i++) { const a = hash01(i, 2) * 6.28, d = 30 + hash01(i, 3) * 90; dot(`sp${i}`, '#f0a12e', 220 * fade, SUN[0] + Math.cos(a) * (r + d * 0.4), SUN[1] + Math.sin(a) * (r + d * 0.4), 2 + hash01(i, 4) * 4); }
  });
  // water: drifting ripples near the sun's road (boil on twos)
  if (t > 5) withView(vl, () => {
    for (let i = 0; i < 26; i++) {
      const y = SHORE + 20 + hash01(i, 8) * 300, x = SUN[0] - 260 + ((hash01(i, 9) * 520 + t * (10 + 8 * hash01(i, 10))) % 520), len = 24 + hash01(i, 11) * 40;
      stroke(`wr${i}`, '2H', i % 2 ? '#1c457f' : '#c5781f', 0.8, [[x, y], [x + len, y]], 1, { boil: 8, t });
    }
  });
  // splash, rings, the bird under the water, the burst
  const k = t - T.splash;
  if (k >= 0) withView(vl, () => {
    for (let i = 0; i < 5; i++) {
      const u = (k - i * 0.28) / 2.6;
      if (u <= 0 || u >= 1) continue;
      const r = 20 + 300 * Math.sqrt(u);
      stroke(`ring${i}`, i % 2 ? '2H' : 'pen', '#173f78', 0.5 + (1 - u) * 0.9, ring(S[0], S[1] + 6, r, r * 0.17, 44), 1, { curve: 0.25 });
    }
    // ink spatter that stays on the page: the splash is remembered
    SPAT.forEach(([dx, dy, r, c], i) => { if (k > i * 0.004) dot(`spat${i}`, c, 230, S[0] + dx, S[1] + dy, r); });
    if (k < 0.95) {
      for (let i = 0; i < 30; i++) {
        const a = lerp(-162, -18, hash01(i, 21)) * Math.PI / 180, v = 300 + 330 * hash01(i, 22), d = k - 0.02 * hash01(i, 23);
        if (d < 0) continue;
        const x = S[0] + Math.cos(a) * v * d, y = S[1] + Math.sin(a) * v * d + 750 * d * d;
        if (y > S[1] + 8) continue;
        dot(`dr${i}`, i % 3 ? '#8fb8e2' : '#5f93d0', 235, x, y, Math.max(2.5, (14 - 9 * k) * (0.5 + 0.5 * hash01(i, 24))));
      }
      if (k < 0.62) {
        const h = 380 * Math.sin(Math.PI * eo(k / 0.62)) * (1 - 0.3 * k), w = 44 + 60 * k;
        const col = [[S[0] - w, S[1] + 4], [S[0] - w * 0.45, S[1] - h * 0.45], [S[0] - 6, S[1] - h * 0.92], [S[0] + 4, S[1] - h], [S[0] + w * 0.4, S[1] - h * 0.5], [S[0] + w, S[1] + 4]];
        fillPoly('column', '#c2dbf2', 210, col, { bleed: 0.02 });
        fillPoly('columnD', '#7aa6dc', 120, col.map(([x, y]) => [lerp(S[0], x, 0.45), y]).slice(1, 5).concat([[S[0], S[1]]]), { bleed: 0.02 });
      }
      if (k < 0.3) for (let i = 0; i < 8; i++) { const a = lerp(-150, -30, i / 7) * Math.PI / 180; stroke(`spray${i}`, 'spray', '#6f9fd4', 1.2, [[S[0], S[1] - 4], [S[0] + Math.cos(a) * 140 * eo(k / 0.3), S[1] - 4 + Math.sin(a) * 110 * eo(k / 0.3)]]); }
    }
    if (t < T.burst) { const u = seg(t, T.splash, T.burst); fillPoly('under', '#173f7a', 120 * Math.sin(Math.PI * u), blob('under', S[0] + 40 * u, S[1] + 30 + 20 * Math.sin(u * 3), 70, 22, 16, 0.2), { bleed: 0.12 }); }
    const kb = t - T.burst;
    if (kb >= 0 && kb < 0.8) for (let i = 0; i < 12; i++) {
      const a = lerp(-150, -30, hash01(i, 31)) * Math.PI / 180, v = 220 + 220 * hash01(i, 32), x = S[0] + 10 + Math.cos(a) * v * kb, y = S[1] + Math.sin(a) * v * kb + 750 * kb * kb;
      if (y < S[1] + 8) dot(`bd${i}`, '#9cc3e6', 220, x, y, 5 - 4 * kb);
    }
  });
  // the bird: ghosts when fast, flutter blur when hovering, the body always on the beat of its own boil
  const b = birdAt(t);
  if (b) withView(vb, () => {
    const fast = (t < 11.7 && t >= T.enter) || (t >= T.dive && t <= T.splash) || (t >= T.burst && t < 15.4);
    if (fast) for (let g = 3; g >= 1; g--) { const gb = birdAt(t - g * 0.035); if (gb) drawBird({ ...gb, id: `g${g}`, alpha: [0, 0.32, 0.2, 0.12][g] }); }
    if (fast) for (let i = 0; i < 5; i++) { const a = birdAt(t - 0.16), c = birdAt(t - 0.02); if (a && c) stroke(`streak${i}`, 'pastel', '#3a7bd5', 1.2 * b.s, [[a.x - 20 + i * 6, a.y - 20 + i * 9], [c.x - 40 + i * 4, c.y - 16 + i * 8]], 1, { boil: 12, t }); }
    if (t >= T.hover && t < 13.5) for (const ph of [0.017, 0.034]) drawBird({ ...b, lift: Math.sin(2 * Math.PI * 10 * (t + ph)), wingsOnly: true, id: `fl${ph}` });
    drawBird(b);
  });
  // pencil leader from the margin note to the bird
  if (t > T.note + 0.6) withView(view(cam, 1), () => stroke('leader', 'HB', '#4a4a55', 1, [[2284, -128], [2306, -134], [2322, -132]], ss(seg(t, T.note + 0.6, T.note + 1.1))));
  brush.render();
}

function frame(t) {
  const cam = camAt(t), f = F.getContext('2d'), b = B.getContext('2d'), page = view(cam, 1), Lt = light(t);
  // desk and the page
  f.setTransform(1, 0, 0, 1, 0, 0); f.globalCompositeOperation = 'source-over'; f.fillStyle = '#a99677'; f.fillRect(0, 0, W, H);
  set2D(f, page);
  f.shadowColor = 'rgba(40,28,10,0.35)'; f.shadowBlur = 60 * page.z; f.shadowOffsetY = 16 * page.z;
  f.fillStyle = PAPER; f.fillRect(PAGE.x0, PAGE.y0, PAGE.x1 - PAGE.x0, PAGE.y1 - PAGE.y0);
  f.shadowColor = 'transparent'; f.shadowBlur = 0; f.shadowOffsetY = 0;
  f.globalCompositeOperation = 'multiply'; f.drawImage(mottle, PAGE.x0, PAGE.y0, PAGE.x1 - PAGE.x0, PAGE.y1 - PAGE.y0);
  f.globalCompositeOperation = 'source-over'; f.setTransform(1, 0, 0, 1, 0, 0);
  // painted layers, far to near, revealed by the colour arriving from the sun
  if (t > T.arrive - 0.1) {
    arrival.update(t);
    b.setTransform(1, 0, 0, 1, 0, 0); b.globalCompositeOperation = 'source-over'; b.clearRect(0, 0, W, H);
    for (const L of LAYERS) {
      if (L.id === 'reeds') continue;
      drawSprite(b, SPR[L.id], R, view(cam, L.depth));
      if (L.id === 'hills') mist(b, view(cam, 0.3), t);
    }
    b.globalCompositeOperation = 'destination-in'; arrival.drawMask(b, page); drawFray(b, page); b.globalCompositeOperation = 'source-over';
    f.drawImage(B, 0, 0);
    // the wet front: pigment pooling just behind the arriving colour
    if (t < 8) { const tc = TT.getContext('2d'); tc.setTransform(1, 0, 0, 1, 0, 0); tc.globalCompositeOperation = 'copy'; arrival.drawFront(tc, page); tc.globalCompositeOperation = 'source-in'; tc.fillStyle = 'rgb(118,92,118)'; tc.fillRect(0, 0, W, H); f.globalCompositeOperation = 'multiply'; f.globalAlpha = 0.5; f.drawImage(TT, 0, 0); f.globalAlpha = 1; f.globalCompositeOperation = 'source-over'; }
    // sky light: sun bloom and rays (before the bird, so it darkens into a silhouette against the sun)
    const [sx, sy] = toScreen(view(cam, 0.04), SUN[0], SUN[1]), sz = view(cam, 0.04).z;
    f.globalCompositeOperation = 'screen';
    softRays(f, sx, sy, 1700, Lt, t);
    glowAt(f, sx, sy, 520 * sz, '255,205,140', 0.5 * Lt);
    glowAt(f, sx, sy, 240 * sz, '255,248,226', 0.95 * Lt);
    glowAt(f, sx, sy, 110 * sz, '255,255,245', 0.8 * Lt);
    f.globalCompositeOperation = 'source-over';
  }
  // live pigment: reserve paper under the bird, then multiply the brush layer
  const bd = birdAt(t), vb = view(cam, BIRD_DEPTH);
  if (bd && bd.colour > 0.05) {
    set2D(f, vb); f.fillStyle = PAPER; f.globalAlpha = Math.min(1, bd.colour * 1.2);
    for (const poly of silhouette(bd)) { f.beginPath(); poly.forEach(([x, y], i) => i ? f.lineTo(x, y) : f.moveTo(x, y)); f.closePath(); f.fill(); }
    f.globalAlpha = 1; f.setTransform(1, 0, 0, 1, 0, 0);
  }
  drawLive(t, cam);
  f.globalCompositeOperation = 'multiply'; f.drawImage(live, 0, 0); f.globalCompositeOperation = 'source-over';
  // gouache: opaque white foam, crown and spray of the splash, painted over the pigment
  gouache(f, t, cam);
  // foreground reeds, swaying, out of focus
  if (t > T.arrive - 0.1) {
    b.setTransform(1, 0, 0, 1, 0, 0); b.globalCompositeOperation = 'source-over'; b.clearRect(0, 0, W, H);
    drawSprite(b, SPR.reeds, R, view(cam, 1.3), { skew: 0.018 * Math.sin(1.15 * t) + 0.007 * Math.sin(2.7 * t + 1) });
    b.globalCompositeOperation = 'destination-in'; arrival.drawMask(b, page); drawFray(b, page); b.globalCompositeOperation = 'source-over';
    f.drawImage(B, 0, 0);
  }
  // small lights: sparkles on the sun's road, glints in the splash, the bird's gouache highlights, dust in the rays
  f.globalCompositeOperation = 'lighter';
  if (Lt > 0) {
    const vl = view(cam, 0.58);
    for (let i = 0; i < 70; i++) {
      const u = hash01(i, 41), y = SHORE + 10 + Math.pow(hash01(i, 42), 1.3) * 320, half = 40 + (y - SHORE) * 0.75, x = SUN[0] + (u - 0.5) * 2 * half;
      const tw = hash01(i * 31 + Math.floor(t * 12), 43), a = tw > 0.62 ? (tw - 0.62) / 0.38 : 0;
      const [qx, qy] = toScreen(vl, x, y); star(f, qx, qy, (3 + 5 * hash01(i, 44)) * vl.z, a * Lt * 0.9);
    }
    const vs = view(cam, 0.3);
    for (let i = 0; i < 60; i++) {   // dust drifting through the light
      const x = SUN[0] - 900 + ((hash01(i, 51) * 1400 + t * 14 * (0.5 + hash01(i, 52))) % 1400), y = SUN[1] + 60 + hash01(i, 53) * 640 + 12 * Math.sin(t * 0.8 + i);
      const [qx, qy] = toScreen(vs, x, y); glowAt(f, qx, qy, (2 + 3 * hash01(i, 54)) * vs.z * 2, '255,236,190', 0.35 * Lt * (0.5 + 0.5 * Math.sin(t * 2 + i)));
    }
  }
  const k = t - T.splash, vl = view(cam, 0.58);
  if (k >= 0 && k < 1.2) for (let i = 0; i < 14; i++) { const a = lerp(-162, -18, hash01(i, 21)) * Math.PI / 180, v = 300 + 330 * hash01(i, 22), x = S[0] + Math.cos(a) * v * k, y = S[1] + Math.sin(a) * v * k + 750 * k * k; if (y <= S[1] + 8) { const [qx, qy] = toScreen(vl, x - 2, y - 2); star(f, qx, qy, 4 * vl.z, 0.8 * (1 - k)); } }
  if (k >= 0 && k < 0.5) { const [qx, qy] = toScreen(vl, S[0], S[1] - 60 * Math.sin(Math.PI * k / 0.5)); glowAt(f, qx, qy, 90 * vl.z, '235,248,255', 0.55 * (1 - k * 2)); }
  if (bd) { const toScr = (x, y) => toScreen(vb, x, y); toScr.z = vb.z; highlights(f, toScr, bd, bd.colour); }
  f.globalCompositeOperation = 'source-over';
  // handwriting on the page
  f.globalCompositeOperation = 'multiply';
  const ink = '#2a2733';
  write(f, page, 'First Light', 1200, 1500, 150, "'Cormorant Garamond'", ink, ss(seg(t, T.title, T.title + 0.8)), { align: 'center' });
  write(f, page, 'kingfisher · 6:12 a.m.', 2270, -112, 60, "'Caveat'", ink, ss(seg(t, T.note, T.note + 0.7)), { align: 'right' });
  write(f, page, 'the blue bird · a p5.brush study', 1200, 1585, 60, "'Caveat'", '#4a4458', ss(seg(t, T.sub, T.sub + 0.7)), { align: 'center' });
  write(f, page, '14 June · the lake at dawn', -150, -190, 54, "'Caveat'", '#4a4458', ss(seg(t, T.date, T.date + 0.7)));
  f.globalCompositeOperation = 'source-over';
  post(f, W, H, { glow: 0.14 + 0.06 * Lt, warm: 0.1 + 0.05 * Lt });
  // paper tooth over everything on the page
  set2D(f, page); f.globalCompositeOperation = 'multiply'; f.globalAlpha = 0.7;
  f.fillStyle = f.createPattern(tooth, 'repeat'); f.fillRect(PAGE.x0, PAGE.y0, PAGE.x1 - PAGE.x0, PAGE.y1 - PAGE.y0);
  f.globalAlpha = 1; f.globalCompositeOperation = 'source-over'; f.setTransform(1, 0, 0, 1, 0, 0);
  // a pencil resting on the desk, seen only in the pull-back
  if (t > 18) pencilProp(f, page);
}

// White can't be multiplied onto paper: foam and spray are opaque gouache, painted on top of the pigment.
function gouache(f, t, cam) {
  const k = t - T.splash, kb = t - T.burst, v = view(cam, 0.58);
  const paint = (pts, a) => { if (a <= 0.01) return; f.globalAlpha = a; f.beginPath(); pts.forEach(([x, y], i) => i ? f.lineTo(x, y) : f.moveTo(x, y)); f.closePath(); f.fill(); };
  set2D(f, v); f.fillStyle = '#fcf9f1'; f.filter = 'blur(1px)';
  if (k >= 0 && k < 0.9) {
    const fa = 1 - ss(seg(k, 0.25, 0.9));
    paint(blob('foam', S[0], S[1] - 2, 70 + 170 * eo(k / 0.6), 14 + 12 * k, 26, 0.35), 0.95 * fa);
    for (let i = 0; i < 12; i++) {
      const a = lerp(-172, -8, i / 11) * Math.PI / 180, r = 50 + 150 * eo(k / 0.4), hg = 1 + 0.6 * Math.sin(i * 1.7);
      paint(blob(`crown${i}`, S[0] + Math.cos(a) * r, S[1] + Math.sin(a) * r * 0.5 * hg - 10, Math.max(2, 10 - k * 7), Math.max(4, 26 * hg - k * 14), 10, 0.3, a + 1.57), 0.95 * fa);
    }
    for (let i = 1; i < 30; i += 2) {
      const a = lerp(-162, -18, hash01(i, 21)) * Math.PI / 180, vv = 300 + 330 * hash01(i, 22), d = k - 0.02 * hash01(i, 23);
      const x = S[0] + Math.cos(a) * vv * d, y = S[1] + Math.sin(a) * vv * d + 750 * d * d;
      if (d > 0 && y < S[1] + 8) paint(blob(`wd${i}`, x - 2, y - 2, 4, 4, 8, 0.2), 0.9 * fa);
    }
  }
  if (kb >= 0 && kb < 0.7) paint(blob('foamB', S[0] + 10, S[1], 50 + 90 * kb, 10 + 6 * kb, 22, 0.35), 0.9 * (1 - kb / 0.7));
  f.globalAlpha = 1; f.filter = 'none'; f.setTransform(1, 0, 0, 1, 0, 0);
}

// The painting's edge on the page: a ragged border, then round dabs sprayed into the margin (built once, 2 px cells).
function frayMask() {
  const sc = 2, w = Math.ceil((PAGE.x1 - PAGE.x0) / sc), h = Math.ceil((PAGE.y1 - PAGE.y0) / sc);
  const c = document.createElement('canvas'); c.width = w; c.height = h;
  const x = c.getContext('2d'), im = x.createImageData(w, h), d = im.data;
  for (let j = 0; j < h; j++) for (let i = 0; i < w; i++) {
    const px = PAGE.x0 + i * sc, py = PAGE.y0 + j * sc;
    const e = Math.min(px - PAINT.x0, PAINT.x1 - px, py - PAINT.y0, PAINT.y1 - py) + (fbm2(px / 70, py / 70, 71, 3) - 0.5) * 70 + (fbm2(px / 9, py / 9, 72, 2) - 0.5) * 10;
    d[(j * w + i) * 4 + 3] = Math.round(255 * ss(clamp((e + 4) / 16)));
  }
  x.putImageData(im, 0, 0);
  const r = rng('dabs');
  x.fillStyle = '#000';
  for (let k = 0; k < 2600; k++) {   // dabs: denser near the edge, thinning outward
    const side = Math.floor(r() * 4), u = r(), out = Math.pow(r(), 1.8) * 120 - 20;
    const px = side < 2 ? lerp(PAINT.x0 - 60, PAINT.x1 + 60, u) : side === 2 ? PAINT.x0 - out : PAINT.x1 + out;
    const py = side >= 2 ? lerp(PAINT.y0 - 60, PAINT.y1 + 60, u) : side === 0 ? PAINT.y0 - out : PAINT.y1 + out;
    if (fbm2(px / 40, py / 40, 81, 2) < 0.42) continue;
    x.beginPath(); x.ellipse((px - PAGE.x0) / sc, (py - PAGE.y0) / sc, (2 + r() * 7) / sc, (2 + r() * 5) / sc, r() * 3, 0, 7); x.fill();
  }
  return c;
}
function drawFray(ctx, v) { set2D(ctx, v); ctx.drawImage(fray, PAGE.x0, PAGE.y0, PAGE.x1 - PAGE.x0, PAGE.y1 - PAGE.y0); ctx.setTransform(1, 0, 0, 1, 0, 0); }

function mist(ctx, v, t) {
  set2D(ctx, v);
  const g = ctx.createLinearGradient(0, 630, 0, 780);
  g.addColorStop(0, 'rgba(244,239,226,0)'); g.addColorStop(0.62, 'rgba(244,236,222,0.6)'); g.addColorStop(1, 'rgba(244,239,226,0)');
  ctx.fillStyle = g; ctx.fillRect(R.x0, 630, R.x1 - R.x0, 150);
  for (let i = 0; i < 7; i++) {
    const x = R.x0 + ((i * 520 + t * 9) % 3200), y = 700 + 18 * Math.sin(i * 2.3);
    const m = ctx.createRadialGradient(x, y, 0, x, y, 260);
    m.addColorStop(0, 'rgba(248,240,226,0.4)'); m.addColorStop(1, 'rgba(248,240,226,0)');
    ctx.save(); ctx.translate(x, y); ctx.scale(1, 0.18); ctx.translate(-x, -y); ctx.fillStyle = m; ctx.fillRect(x - 260, y - 260, 520, 520); ctx.restore();
  }
  ctx.setTransform(1, 0, 0, 1, 0, 0);
}

function pencilProp(f, v) {
  set2D(f, v);
  f.save(); f.translate(2380, 1660); f.rotate(-0.42);
  f.shadowColor = 'rgba(30,20,8,0.45)'; f.shadowBlur = 26 * v.z; f.shadowOffsetY = 14 * v.z;
  f.fillStyle = '#e8b33a'; f.fillRect(0, -22, 760, 44);
  f.shadowColor = 'transparent';
  f.fillStyle = '#f6cf5c'; f.fillRect(0, -22, 760, 12); f.fillStyle = '#c98f22'; f.fillRect(0, 10, 760, 12);
  f.fillStyle = '#b7b2a6'; f.fillRect(760, -22, 46, 44); f.fillStyle = '#d8746b'; f.fillRect(806, -22, 70, 44);
  f.fillStyle = '#e9d3ac'; f.beginPath(); f.moveTo(0, -22); f.lineTo(-120, 0); f.lineTo(0, 22); f.fill();
  f.fillStyle = '#2b2b30'; f.beginPath(); f.moveTo(-82, -7); f.lineTo(-120, 0); f.lineTo(-82, 7); f.fill();
  f.restore(); f.setTransform(1, 0, 0, 1, 0, 0);
}

// ---------------------------------------------------------------- readcheck: every visible text with its screen box
function texts(t) {
  const out = [], page = view(camAt(t), 1);
  const box = (id, txt, x, y, size, align, t0) => {
    if (t < t0) return;
    const w = widths[id], x0 = align === 'center' ? x - w / 2 : align === 'right' ? x - w : x;
    const [a, b] = toScreen(page, x0, y - size * 0.8), [c, d] = toScreen(page, x0 + w, y + size * 0.25);
    out.push({ id, text: txt, x0: a, y0: b, x1: c, y1: d });
  };
  box('title', 'First Light', 1200, 1500, 150, 'center', T.title);
  box('note', 'kingfisher · 6:12 a.m.', 2270, -112, 60, 'right', T.note);
  box('sub', 'the blue bird · a p5.brush study', 1200, 1585, 60, 'center', T.sub);
  box('date', '14 June · the lake at dawn', -150, -190, 54, 'left', T.date);
  return out;
}

// ---------------------------------------------------------------- page contract
let live;
export async function start(stage) {
  F = document.createElement('canvas'); F.width = W; F.height = H; stage.appendChild(F);
  B = document.createElement('canvas'); B.width = W; B.height = H;
  TT = document.createElement('canvas'); TT.width = W; TT.height = H;
  await Promise.all([document.fonts.load("150px 'Cormorant Garamond'"), document.fonts.load("60px 'Caveat'")]);
  live = initBrush(W, H, 5.4);
  for (const L of LAYERS) SPR[L.id] = sprite(R, L.paint, L.silhouettes(), { blur: L.blur || 0 });
  doneSprites();
  tooth = paperTooth(); mottle = paperMottle(PAGE.x1 - PAGE.x0, PAGE.y1 - PAGE.y0);
  const G = { x0: PAGE.x0, y0: PAGE.y0, cell: 6, nx: Math.ceil((PAGE.x1 - PAGE.x0) / 6), ny: Math.ceil((PAGE.y1 - PAGE.y0) / 6) };
  arrival = new Arrival(G,
    (x, y) => T.arrive + Math.hypot(x - SUN[0], y - SUN[1]) / 600 + (fbm2(x / 110, y / 110, 61) - 0.5) * 0.55 + (fbm2(x / 26, y / 26, 62) - 0.5) * 0.3,
    () => 1);
  fray = frayMask();
  PENCIL = buildPencil();
  const r = rng('spatter');
  SPAT = Array.from({ length: 46 }, () => { const a = r() * 6.28, d = 40 + Math.pow(r(), 0.6) * 200; return [Math.cos(a) * d, Math.sin(a) * d * 0.45 - 30, 1.5 + r() * 4.5, r() < 0.7 ? '#1d5fc4' : '#25b5e0']; });
  const m = F.getContext('2d');
  for (const [id, txt, size, font] of [['title', 'First Light', 150, "'Cormorant Garamond'"], ['note', 'kingfisher · 6:12 a.m.', 60, "'Caveat'"], ['sub', 'the blue bird · a p5.brush study', 60, "'Caveat'"], ['date', '14 June · the lake at dawn', 54, "'Caveat'"]]) { m.font = `${size}px ${font}`; widths[id] = m.measureText(txt).width; }
  window.DUR = DUR; window.EV = EV; window.TEXTS = texts;
  window.render = t => frame(t);
  window.READY = true;
}
