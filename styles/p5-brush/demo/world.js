// The painted world of "First Light": six depth layers, each painted once with p5.brush.
// World units: the painting is 2400 × 1350; the page around it adds margins (PAGE).
import { fillPoly, solid, stroke, dot, blob, ring, band, blade, fbm1, rng } from './engine.js';
import { lerp, monotone } from '/core/lib.js';

export const PAINT = { x0: 0, y0: 0, x1: 2400, y1: 1350 };
export const PAGE = { x0: -230, y0: -290, x1: 2630, y1: 1720 };
export const R = { x0: -300, y0: -260, x1: 2700, y1: 1560 };   // sprite region (bleeds past the painting for parallax)
export const SUN = [1720, 330];
export const SHORE = 762;                                         // far shoreline / water line

// ---------- shared shapes
const ridgeKeys = [[-300, 610], [-120, 560], [80, 470], [240, 520], [420, 385], [600, 470], [760, 430], [930, 505], [1110, 410], [1300, 290], [1470, 410], [1620, 470], [1790, 395], [1960, 455], [2120, 350], [2290, 445], [2470, 500], [2700, 455]];
const ridgeBase = monotone(ridgeKeys);
export const ridge = x => ridgeBase(x) + (fbm1(x / 70, 4) - 0.5) * 46 + (fbm1(x / 17, 9) - 0.5) * 12;
export const hill1 = x => 640 + Math.sin(x / 260 + 1.2) * 26 + Math.sin(x / 113) * 10 + (fbm1(x / 90, 21) - 0.5) * 20;
export const hill2 = x => 702 + Math.sin(x / 210 + 3.1) * 18 + (fbm1(x / 70, 31) - 0.5) * 16;
const bankKeys = [[-300, 905], [0, 920], [380, 985], [760, 1060], [1080, 1112], [1380, 1098], [1760, 1020], [2160, 965], [2700, 935]];
const bankBase = monotone(bankKeys);
export const bankTop = x => bankBase(x) + (fbm1(x / 60, 41) - 0.5) * 18;
export const shore = x => SHORE + (fbm1(x / 50, 51) - 0.5) * 8;
const line = (f, x0, x1, step) => { const l = []; for (let x = x0; x <= x1 + 0.1; x += step) l.push([x, f(x)]); return l; };

// pines and round trees along the far shore: [x, base y, height, width, kind]
export const PINES = (() => {
  const r = rng('pines'), out = [];
  let x = -280;
  while (x < 2690) {
    const h = 70 + r() * 120 + (x < 300 || x > 2150 ? 50 : 0), w = h * (0.32 + r() * 0.1);
    out.push([x, shore(x) + 4, h, w, r() < 0.28 ? 'round' : 'pine']);
    x += w * (0.45 + r() * 0.35);
  }
  return out;
})();
function pineShape(x, y, h, w, k) {
  const pts = [[x, y - h]], tiers = 6;
  for (let i = 1; i <= tiers; i++) { const u = i / tiers; pts.push([x + w * 0.5 * u * (1 + 0.15 * Math.sin(i * k)), y - h + h * u * 0.9]); pts.push([x + w * 0.2 * u, y - h + h * u * 0.9 - h * 0.05]); }
  pts.push([x + w * 0.08, y]); pts.push([x - w * 0.08, y]);
  for (let i = tiers; i >= 1; i--) { const u = i / tiers; pts.push([x - w * 0.2 * u, y - h + h * u * 0.9 - h * 0.05]); pts.push([x - w * 0.5 * u * (1 + 0.15 * Math.cos(i * k)), y - h + h * u * 0.9]); }
  return pts;
}
const roundShape = (i, x, y, h, w) => blob(`rt${i}`, x, y - h * 0.45, w * 0.95, h * 0.42, 16, 0.14);

// ---------------------------------------------------------------- layers
export const LAYERS = [];

// 0 · SKY (depth .04)
LAYERS.push({
  id: 'sky', depth: 0.04,
  paint() {
    const bands = [['#2b5aa8', -330], ['#3f70bd', -170], ['#6a92cf', 0], ['#9db4dc', 170], ['#cdbfd3', 330], ['#f0bc9c', 480], ['#f9b979', 620], ['#fbc98a', 720]];
    bands.forEach(([c, y], i) => {
      for (let pass = 0; pass < 2; pass++) fillPoly(`sky${i}.${pass}`, c, 150, band(-300, 2700, x => y - 130 + Math.sin(x / 300 + i + pass) * 22 + pass * 24, x => y + 130 + Math.sin(x / 260 + i * 2) * 22 + pass * 18, 24), { bleed: 0.02, tex: [0.55, 0.2] });
    });
    fillPoly('glowA', '#ffbf72', 110, blob('gA', SUN[0], SUN[1] + 90, 780, 430, 30, 0.06));
    fillPoly('glowB', '#ffcd80', 130, blob('gB', SUN[0], SUN[1] + 30, 440, 310, 28, 0.05));
    fillPoly('glowC', '#ffdc96', 150, blob('gC', SUN[0], SUN[1], 240, 200, 24, 0.05));
    fillPoly('cool', '#24498f', 120, blob('cool', 120, -170, 950, 400, 30, 0.08));
    // clouds: several overlapping lobes; violet bellies, sun-gilded tops, dry-brush streaks underneath
    const clouds = [[430, 150, 1.25], [900, 70, 0.95], [200, 330, 0.85], [1180, 236, 0.8], [2240, 160, 1.05], [2060, 480, 0.7], [720, 430, 0.65], [1560, 110, 0.6]];
    clouds.forEach(([x, y, s], i) => {
      const toSun = Math.sign(SUN[0] - x) || 1;
      for (let k = 0; k < 4; k++) fillPoly(`cb${i}.${k}`, k % 2 ? '#8d7fb8' : '#a291c2', 170, blob(`cb${i}.${k}`, x + (k - 1.5) * 90 * s, y + 10 * s + Math.sin(k * 2) * 6 * s, (140 + k * 20) * s, (30 + (k % 2) * 12) * s, 20, 0.16));
      for (let k = 0; k < 3; k++) fillPoly(`ct${i}.${k}`, k === 1 ? '#ffd29a' : '#f6a77e', 170, blob(`ct${i}.${k}`, x + toSun * (40 + k * 50) * s - 60 * s, y - (18 + k * 3) * s, (130 - k * 20) * s, (13 + k * 2) * s, 16, 0.2));
      for (let k = 0; k < 7; k++) stroke(`cs${i}.${k}`, k % 3 ? 'marker' : 'pastel', k % 2 ? '#f9c79a' : '#7f71ad', 0.9 * s + 0.3, [[x - 280 * s + k * 26 * s, y + 34 * s + k * 5], [x + 250 * s - k * 20 * s, y + 30 * s + k * 5]], 1, { curve: 0.2 });
    });
    // the sun: gold rim, paper-white core (the bloom is light, added per frame)
    fillPoly('sunRim', '#ff9f2e', 230, ring(SUN[0], SUN[1], 98, 98, 48).slice(0, -1), { bleed: 0.015, tex: [0.3, 0.6] });
    fillPoly('sunRim2', '#ffc04d', 200, ring(SUN[0], SUN[1], 86, 86, 48).slice(0, -1), { bleed: 0.01 });
    solid('#fff7dc', 255, ring(SUN[0], SUN[1], 72, 72, 48).slice(0, -1));
  },
  silhouettes: () => [[[R.x0, R.y0], [R.x1, R.y0], [R.x1, R.y1], [R.x0, R.y1]]],
  pencil: () => [ring(SUN[0], SUN[1], 100, 100, 40), [[150, 172], [430, 150], [720, 162]], [[1960, 176], [2240, 150], [2520, 170]], [[960, 244], [1180, 226], [1400, 240]]],
});

// 1 · FAR MOUNTAINS (depth .14)
LAYERS.push({
  id: 'mountains', depth: 0.14,
  paint() {
    const top = line(ridge, R.x0, R.x1, 10), body = top.concat([[R.x1, 980], [R.x0, 980]]);
    fillPoly('mBase', '#7f7fbf', 225, body, { bleed: 0.015, tex: [0.5, 0.3] });
    fillPoly('mBase2', '#6c6aae', 150, top.map(([x, y]) => [x, y + 26]).concat([[R.x1, 760], [R.x0, 760]]), { bleed: 0.02 });
    fillPoly('mLow', '#a8a2d0', 120, band(R.x0, R.x1, () => 620, () => 960, 40), { bleed: 0.04 });
    for (let i = 1; i < ridgeKeys.length - 1; i++) {
      const [px, py] = ridgeKeys[i], prev = ridgeKeys[i - 1], next = ridgeKeys[i + 1];
      if (py > prev[1] || py > next[1]) continue;
      const lit = px < SUN[0] ? next : prev, shade = px < SUN[0] ? prev : next;
      // a face is a strip that follows the ridge down from the peak, thinning toward the valley
      const face = (to, d0, d1, end = 1) => { const topE = [], botE = []; for (let u = 0; u <= end + 1e-6; u += 0.04) { const x = lerp(px, to[0], u), y = ridge(x); topE.push([x, y + 1]); botE.push([x - (to[0] - px) * 0.04, y + lerp(d0, d1, u) * (0.85 + 0.3 * Math.sin(u * 9 + i))]); } return topE.concat(botE.reverse()); };
      fillPoly(`lit${i}`, '#f7a283', 175, face(lit, 120, 18), { bleed: 0.012 });
      fillPoly(`lit2${i}`, '#ffd3a2', 130, face(lit, 45, 6, 0.7), { bleed: 0.008 });
      fillPoly(`sh${i}`, '#4f4d8c', 140, face(shade, 190, 40), { bleed: 0.012 });
      // gullies: falling pencil strokes on the shaded face
      for (let k = 0; k < 6; k++) { const x = lerp(px, shade[0], 0.12 + k * 0.13), y = ridge(x) + 10; stroke(`gl${i}.${k}`, 'cpencil', '#3d3b74', 0.7, [[x, y], [x + (shade[0] - px) * 0.06, y + 60 + k * 10], [x + (shade[0] - px) * 0.04, y + 110 + k * 12]], 1, { curve: 0.6 }); }
    }
    for (const [px, id] of [[1300, 's1'], [420, 's2'], [2120, 's3'], [1110, 's4']]) {
      const py = ridge(px), cap = [[px - 80, py + 58], [px - 46, py + 26], [px - 16, py + 10], [px, py - 3], [px + 22, py + 18], [px + 50, py + 30], [px + 72, py + 46], [px + 40, py + 50], [px + 18, py + 34], [px - 8, py + 52], [px - 34, py + 44]];
      solid('#fbf6ec', 255, cap);
      fillPoly(`snowTint${id}`, '#f9b9a5', 110, cap.slice(0, 6).concat([[px - 10, py + 30]]).map(([x, y]) => [x + (px < SUN[0] ? 6 : -6), y]), { bleed: 0.01 });
      fillPoly(`snowSh${id}`, '#9a9ad0', 120, cap.slice(5).concat([[px + 4, py + 16]]), { bleed: 0.01 });
    }
  },
  silhouettes() { return [line(ridge, R.x0, R.x1, 10).concat([[R.x1, 1000], [R.x0, 1000]])]; },
  pencil() { return [line(ridge, -100, 2500, 30)]; },
});

// 2 · HILLS (depth .26)
LAYERS.push({
  id: 'hills', depth: 0.26,
  paint() {
    fillPoly('h1', '#6b9a96', 205, band(R.x0, R.x1, hill1, () => 900, 20), { bleed: 0.02 });
    fillPoly('h1lit', '#e4c088', 130, band(R.x0, R.x1, hill1, x => hill1(x) + 22, 20), { bleed: 0.015 });
    fillPoly('h2', '#4f8a6c', 210, band(R.x0, R.x1, hill2, () => 900, 20), { bleed: 0.02 });
    fillPoly('h2lit', '#c8cc7a', 130, band(R.x0, R.x1, hill2, x => hill2(x) + 18, 20), { bleed: 0.015 });
    const r = rng('hilltrees');
    for (let i = 0; i < 90; i++) {
      const x = R.x0 + r() * (R.x1 - R.x0), y = hill2(x) + 6;
      fillPoly(`ht${i}`, i % 3 ? '#3f735c' : '#2f604c', 200, blob(`ht${i}`, x, y - 10, 9 + r() * 8, 14 + r() * 10, 12, 0.15), { bleed: 0.02 });
    }
  },
  silhouettes() { return [line(x => Math.min(hill1(x), hill2(x)) - 18, R.x0, R.x1, 20).concat([[R.x1, 1000], [R.x0, 1000]])]; },
  pencil: () => [],
});

// 3 · FOREST on the far shore (depth .4)
LAYERS.push({
  id: 'forest', depth: 0.4,
  paint() {
    fillPoly('fBase', '#2c5637', 225, band(R.x0, R.x1, x => shore(x) - 36, x => shore(x) + 30, 24), { bleed: 0.015 });
    fillPoly('fShoreLit', '#d6b261', 190, band(R.x0, R.x1, x => shore(x) - 6, x => shore(x) + 7, 24), { bleed: 0.01 });
    PINES.forEach(([x, y, h, w, kind], i) => {
      const sunSide = x < SUN[0] ? 1 : -1;
      if (kind === 'round') {
        for (let k = 0; k < 3; k++) fillPoly(`rt${i}.${k}`, ['#3f7535', '#4c823b', '#356a30'][k], 215, blob(`rt${i}.${k}`, x + (k - 1) * w * 0.32, y - h * (0.42 + (k % 2) * 0.12), w * 0.55, h * 0.32, 14, 0.18), { bleed: 0.02 });
        fillPoly(`rtl${i}`, '#bcd56a', 170, blob(`rtl${i}`, x + sunSide * w * 0.32, y - h * 0.62, w * 0.42, h * 0.2, 12, 0.22), { bleed: 0.015 });
        fillPoly(`rts${i}`, '#1d3d26', 150, blob(`rts${i}`, x - sunSide * w * 0.25, y - h * 0.28, w * 0.5, h * 0.22, 12, 0.22), { bleed: 0.015 });
      } else {
        const shape = pineShape(x, y, h, w, i);
        fillPoly(`p${i}`, i % 2 ? '#28533a' : '#224b35', 240, shape, { bleed: 0.01, tex: [0.4, 0.4] });
        fillPoly(`pp${i}`, '#1a3d2a', 140, shape.map(([px, py]) => [lerp(x, px, 0.75), py]).filter(([, py]) => py > y - h * 0.7), { bleed: 0.01 });
        const lit = shape.filter(([px]) => (px - x) * sunSide >= -1).map(([px, py]) => [lerp(x, px, 0.95) + sunSide * 2, py]);
        fillPoly(`pl${i}`, '#b5cc62', 170, lit, { bleed: 0.008 });
        fillPoly(`pl2${i}`, '#f0c66e', 120, lit.filter(([, py]) => py < y - h * 0.45), { bleed: 0.005 });
      }
    });
    for (let i = 0; i < PINES.length; i++) { const [x, y, h, w, k] = PINES[i]; if (k === 'pine') stroke(`trunk${i}`, 'pen', '#1a2620', 0.55, [[x, y + 2], [x, y - h * 0.3]]); }
  },
  silhouettes() {
    const s = [band(R.x0, R.x1, x => shore(x) - 36, x => shore(x) + 36, 24)];
    PINES.forEach(([x, y, h, w, kind], i) => { if (kind === 'round') for (let k = 0; k < 3; k++) s.push(blob(`rt${i}.${k}`, x + (k - 1) * w * 0.32, y - h * (0.42 + (k % 2) * 0.12), w * 0.55, h * 0.32, 14, 0.18)); else s.push(pineShape(x, y, h, w, i)); });
    return s;
  },
  pencil: () => [],
});

// 4 · LAKE (depth .58)
LAYERS.push({
  id: 'lake', depth: 0.58,
  paint() {
    const rows = [['#f4bf92', 760, 832], ['#e2b8b8', 812, 872], ['#a7b8dc', 856, 948], ['#7397d0', 926, 1028], ['#4573bb', 1006, 1140], ['#2a589f', 1110, 1300], ['#1f4a8c', 1240, 1560]];
    rows.forEach(([c, a, b], i) => { for (let p = 0; p < 2; p++) fillPoly(`w${i}.${p}`, c, 165, band(R.x0, R.x1, x => a + Math.sin(x / 140 + i + p) * 4 + p * 10, x => b + Math.sin(x / 120 + i * 2) * 5 + p * 6, 24), { bleed: 0.015, tex: [0.5, 0.15] }); });
    // reflections: soft vertical streaks under the trees, the mountains faintly, then broken by light
    PINES.forEach(([x, y, h, w], i) => {
      if (i % 3 === 1) return;
      for (let k = 0; k < 2; k++) { const ox = (k - 0.5) * w * 0.3, len = h * (0.3 + 0.2 * ((i + k) % 3) / 2); fillPoly(`rf${i}.${k}`, k === 1 ? '#22472f' : '#36633f', 55, [[x + ox - w * 0.12, y + 8], [x + ox + w * 0.12, y + 8], [x + ox + w * 0.04, y + 8 + len], [x + ox - w * 0.04, y + 8 + len]], { bleed: 0.03 }); }
    });
    fillPoly('rmBand', '#8e88c0', 90, band(R.x0, R.x1, x => SHORE + 40, x => SHORE + 40 + (720 - ridge(x)) * 0.32, 20), { bleed: 0.03 });
    // the sun's road on the water
    for (let i = 0; i < 30; i++) {
      const y = SHORE + 6 + i * 12, half = 34 + i * 8.5 + Math.sin(i * 1.7) * 14, c = i % 3 ? '#ffb851' : '#ffd88a';
      fillPoly(`road${i}`, c, 200, [[SUN[0] - half, y], [SUN[0] + half, y - 2], [SUN[0] + half * 0.92, y + 5], [SUN[0] - half * 0.96, y + 6]], { bleed: 0.008 });
    }
    const r = rng('ripples');
    for (let i = 0; i < 260; i++) {
      const y = SHORE + 10 + Math.pow(r(), 1.25) * 560, x = R.x0 + r() * (R.x1 - R.x0), len = 18 + (y - SHORE) * 0.28 * (0.5 + r());
      if (r() < 0.3) solid('#f3ebdc', 150, [[x, y], [x + len, y - 1 + r()], [x + len * 0.9, y + 1.4 + r()], [x + 3, y + 1.8]]);
      else stroke(`rp${i}`, r() < 0.5 ? '2H' : 'cpencil', r() < 0.5 ? '#1c457f' : '#4e78b8', 0.8, [[x, y], [x + len, y + (r() - 0.5) * 2]]);
    }
  },
  silhouettes: () => [[[R.x0, SHORE - 6], [R.x1, SHORE - 6], [R.x1, R.y1], [R.x0, R.y1]]],
  pencil() { return [line(shore, -100, 2500, 80), [[300, 880], [520, 878]], [[1400, 930], [1690, 926]], [[700, 990], [980, 994]]]; },
});

// 5 · MEADOW, the near bank (depth .78)
export const FLOWERS = (() => {
  const r = rng('flowers'), out = [];
  for (let i = 0; i < 340; i++) {
    const x = R.x0 + r() * (R.x1 - R.x0), top = bankTop(x), y = top + 30 + Math.pow(r(), 0.8) * (1520 - top - 30), k = r();
    out.push([x, y, k < 0.3 ? 'poppy' : k < 0.52 ? 'daisy' : k < 0.72 ? 'butter' : 'lupine', 0.8 + (y - top) / 380]);
  }
  return out;
})();
LAYERS.push({
  id: 'meadow', depth: 0.78,
  paint() {
    fillPoly('mud', '#9c7f55', 200, band(R.x0, R.x1, x => bankTop(x) - 4, x => bankTop(x) + 22, 20), { bleed: 0.015 });
    const greens = [['#c4dc6a', 0, 110], ['#9fc955', 50, 240], ['#7bb247', 180, 400], ['#5a983f', 340, 620], ['#3f7a35', 520, 800]];
    greens.forEach(([c, a, b], i) => { for (let p = 0; p < 2; p++) fillPoly(`g${i}.${p}`, c, 170, band(R.x0, R.x1, x => bankTop(x) + 14 + a + p * 30 + Math.sin(x / 170 + i) * 18, x => bankTop(x) + b + 60 + Math.sin(x / 150 + p) * 24, 24), { bleed: 0.02, tex: [0.55, 0.2] }); });
    fillPoly('sunlit1', '#e6ea8c', 150, blob('sl1', 420, 1120, 380, 50, 22, 0.15));
    fillPoly('sunlit2', '#e6ea8c', 140, blob('sl2', 1900, 1080, 420, 46, 22, 0.15));
    fillPoly('shadow1', '#2f5f2c', 120, blob('sd1', 1200, 1460, 1000, 120, 24, 0.1));
    [[640, 1046, 60], [705, 1056, 34], [1560, 1072, 48]].forEach(([x, y, s], i) => {
      const rock = blob(`rock${i}`, x, y, s, s * 0.55, 14, 0.18);
      fillPoly(`rk${i}`, '#7f7890', 235, rock, { bleed: 0.008 });
      fillPoly(`rkl${i}`, '#ebb990', 170, rock.filter(([, py]) => py < y).map(([px, py]) => [px + 6, py + 3]), { bleed: 0.008 });
      fillPoly(`rks${i}`, '#4a4458', 140, rock.filter(([, py]) => py > y - 6), { bleed: 0.008 });
    });
    // grass clumps: tapered blades with a sunlit tip, larger toward the viewer
    const r = rng('grass');
    for (let i = 0; i < 260; i++) {
      const x = R.x0 + r() * (R.x1 - R.x0), t0 = bankTop(x), y = t0 + 20 + Math.pow(r(), 0.7) * (R.y1 - t0 - 20), d = (y - t0) / 500;
      for (let k = 0; k < 4; k++) {
        const b = blade(x + (k - 1.5) * 4 * (1 + d), y, -90 + (k - 1.5) * 14 + (r() - 0.5) * 10, (16 + 40 * d) * (0.7 + r() * 0.6), 3 + 3 * d, (k - 1.5) * 10);
        fillPoly(`cl${i}.${k}`, ['#2d5a26', '#3b7330', '#4f8a36', '#6aa443'][k], 220, b, { bleed: 0.005, tex: [0.2, 0.3] });
      }
    }
    for (let i = 0; i < 1400; i++) {
      const x = R.x0 + r() * (R.x1 - R.x0), t0 = bankTop(x), y = t0 + 8 + Math.pow(r(), 0.75) * (R.y1 - t0 - 8), d = (y - t0) / 600;
      const len = 10 + d * 40 * (0.6 + r()), ang = -90 + (r() - 0.5) * 44;
      const c = ['#24501f', '#356c29', '#4f8a33', '#7fb348', '#cfe07a'][Math.min(4, Math.floor(r() * 5 * (1.1 - d * 0.3)))];
      stroke(`gr${i}`, r() < 0.5 ? 'HB' : r() < 0.5 ? 'cpencil' : '2B', c, 0.9 + d * 1.1, [[x, y], [x + Math.cos(ang * Math.PI / 180) * len, y + Math.sin(ang * Math.PI / 180) * len]], 1);
    }
    FLOWERS.forEach(([x, y, kind, s], i) => {
      if (kind === 'lupine') {
        stroke(`ls${i}`, 'pen', '#3a6429', 0.7, [[x, y], [x + 2, y - 46 * s]]);
        for (let k = 0; k < 7; k++) dot(`lp${i}.${k}`, k % 2 ? '#7d52c0' : '#a983e3', 235, x + 2 + Math.sin(k * 2.1) * 3 * s, y - 16 * s - k * 5.5 * s, (4.6 - k * 0.45) * s);
      } else if (kind === 'poppy') {
        dot(`pp${i}`, '#e23b26', 245, x, y, 6.5 * s); dot(`pp2${i}`, '#ff6a3d', 200, x - 1.5 * s, y - 1.5 * s, 3.2 * s); dot(`ppc${i}`, '#2b1414', 240, x + 0.5, y + 0.8, 1.6 * s);
      } else if (kind === 'daisy') {
        solid('#fdfaf2', 255, ring(x, y, 5.4 * s, 4.2 * s, 12).slice(0, -1)); dot(`dc${i}`, '#f2b818', 245, x, y, 2 * s);
      } else dot(`bt${i}`, '#f7c512', 240, x, y, 3.6 * s);
    });
  },
  silhouettes() { return [line(x => bankTop(x) - 3, R.x0, R.x1, 20).concat([[R.x1, R.y1], [R.x0, R.y1]])]; },
  pencil() { return [line(bankTop, -100, 2500, 60), [[200, 1180], [214, 1150]], [[1960, 1200], [1975, 1166]], [[900, 1300], [918, 1262]]]; },
});

// 6 · FOREGROUND reeds, out of focus (depth 1.3)
export const REEDS = (() => {
  const r = rng('reeds'), out = [];
  for (let i = 0; i < 52; i++) { const left = i < 30, x = left ? -280 + r() * 560 : 2040 + r() * 640; out.push([x, 1580, -90 + (left ? 1 : -1) * (6 + r() * 26), 280 + r() * 360, 18 + r() * 18, (left ? 1 : -1) * (r() * 40 + 10), r() < 0.22]); }
  return out;
})();
LAYERS.push({
  id: 'reeds', depth: 1.3, blur: 7,
  paint() {
    REEDS.forEach(([x, y, a, l, w, bend, cattail], i) => {
      const b = blade(x, y, a, l, w, bend);
      fillPoly(`rd${i}`, i % 2 ? '#2f4a28' : '#253d21', 245, b, { bleed: 0.008 });
      fillPoly(`rdl${i}`, '#e3a646', 150, b.slice(0, 5).map(([px, py]) => [px + 3, py]), { bleed: 0.008 });
      if (cattail) { const tip = b[Math.floor(b.length / 2) - 1]; fillPoly(`ctl${i}`, '#4f3020', 245, blob(`ctl${i}`, tip[0], tip[1] + 34, 10, 38, 14, 0.08)); }
    });
  },
  silhouettes: () => REEDS.map(([x, y, a, l, w, bend]) => blade(x, y, a, l, w, bend)),
  pencil: () => [],
});
