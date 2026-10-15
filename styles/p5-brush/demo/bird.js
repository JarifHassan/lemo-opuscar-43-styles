// The blue bird: a kingfisher-like rig drawn with p5.brush, local units ≈ world px at scale 1, facing right.
// Pose b = { x, y, s, rot, lift (-1…1 wing up/down), fold (0 spread … 1 folded), flip (1 | -1),
//            colour (0…1 pigment; 0 = pencil only), fish (bool), t (for boil), alpha (ghosts) }
import { brush, fillPoly, solid, stroke, dot, blob, ring, place } from './engine.js';
import { lerp } from '/core/lib.js';

const BODY = [[-58, -6], [-36, -22], [-8, -30], [22, -31], [44, -36], [60, -38], [76, -30], [84, -16], [80, -2], [66, 10], [40, 22], [8, 26], [-24, 20], [-50, 8]];
const BACK = [[-52, -10], [-26, -23], [8, -29], [36, -33], [50, -36], [44, -28], [12, -23], [-20, -17]];
const BREAST = [[-6, 10], [24, 4], [52, 2], [72, 4], [66, 10], [40, 22], [8, 26], [-24, 20], [-30, 14]];
const BELLY = [[-10, 16], [20, 12], [44, 14], [30, 21], [4, 24], [-18, 20]];
const TAIL = [[-52, -8], [-96, -18], [-102, -6], [-98, 6], [-52, 6]];
const HEAD = [62, -22, 25, 23];
const BEAK_U = [[84, -26], [136, -15], [84, -12]];
const BEAK_L = [[84, -12], [132, -13], [84, -4]];
const CHEEK = [[62, -18], [80, -16], [84, -8], [70, -6], [58, -10]];
const NECK = [[50, -14], [58, -12], [58, -2], [48, -4]];
const THROAT = [[74, -4], [86, -6], [84, 2], [72, 4]];
const SHOULDER = [8, -24];
const WING = [[0, 0], [8, -30], [6, -62], [-4, -100], [-18, -118], [-34, -124], [-50, -118], [-62, -104], [-66, -80], [-60, -55], [-50, -30], [-38, -6], [-20, 2]];
const COVERTS = [[0, 0], [8, -30], [6, -62], [-20, -72], [-44, -60], [-50, -32], [-38, -6], [-20, 2]];
const TIPS = [[-4, -100], [-18, -118], [-34, -124], [-50, -118], [-62, -104], [-66, -80]];

function wingX(pts, b, back = 0) {
  const sy = lerp(b.lift, 0.3, b.fold), rot = -92 * b.fold, sc = lerp(1, 0.66, b.fold);
  const local = place(pts.map(([x, y]) => [x, y * sy]), SHOULDER[0] - back * 6, SHOULDER[1] - back * 4, sc, rot);
  return local;
}
const L = (b, pts) => place(pts.map(([x, y]) => [x * b.flip, y]), b.x, b.y, b.s, b.rot);

// Polygons that must reserve paper (so the bird reads as an opaque body over busy paint)
export function silhouette(b) {
  return [L(b, BODY), L(b, TAIL), L(b, ring(HEAD[0], HEAD[1], HEAD[2], HEAD[3], 18).slice(0, -1)), L(b, BEAK_U.concat(BEAK_L.slice(1))), L(b, wingX(WING, b)), L(b, wingX(WING, b, 1))];
}

export function drawBird(b) {
  const o = { boil: 12, t: b.t }, k = b.colour * (b.alpha ?? 1), A = a => a * k, id = b.id || 'bird';
  if (b.wingsOnly) {   // extra wing passes for a flutter blur
    fillPoly(`${id}fw`, '#123f8a', A(150), L(b, wingX(WING, b, 1)), { bleed: 0.03, ...o });
    fillPoly(`${id}nw`, '#1f56b0', A(160), L(b, wingX(WING, b)), { bleed: 0.03, ...o });
    return;
  }
  if (k > 0.02) {
    // far wing (behind the body)
    fillPoly(`${id}fw`, '#123f8a', A(230), L(b, wingX(WING, b, 1)), { bleed: 0.02, ...o });
    fillPoly(`${id}tail`, '#174fa8', A(240), L(b, TAIL), { bleed: 0.02, ...o });
    fillPoly(`${id}tailT`, '#2fb4dc', A(180), L(b, TAIL.slice(0, 3).concat([[-56, -2]])), { bleed: 0.01, ...o });
    fillPoly(`${id}body`, '#1d5fc4', A(245), L(b, BODY), { bleed: 0.02, ...o });
    fillPoly(`${id}back`, '#25b5e0', A(235), L(b, BACK), { bleed: 0.01, ...o });
    fillPoly(`${id}breast`, '#ea7a2c', A(245), L(b, BREAST), { bleed: 0.015, ...o });
    fillPoly(`${id}belly`, '#f6a95a', A(200), L(b, BELLY), { bleed: 0.01, ...o });
    fillPoly(`${id}head`, '#1550b0', A(245), L(b, ring(HEAD[0], HEAD[1], HEAD[2], HEAD[3], 18).slice(0, -1)), { bleed: 0.015, ...o });
    for (let i = 0; i < 9; i++) { const [sx, sy] = L(b, [[50 + (i % 3) * 8 + (i > 5 ? 6 : 0), -38 + Math.floor(i / 3) * 6]])[0]; dot(`${id}sp${i}`, '#5ad6f2', A(230), sx, sy, 1.8 * b.s, o); }
    fillPoly(`${id}cheek`, '#e8742a', A(245), L(b, CHEEK), { bleed: 0.008, ...o });
    if (k > 0.5) { solid('#fbf6ea', 255 * Math.min(1, (k - 0.5) * 2), L(b, NECK)); solid('#fbf6ea', 255 * Math.min(1, (k - 0.5) * 2), L(b, THROAT)); }
    fillPoly(`${id}beakU`, '#16161c', A(250), L(b, BEAK_U), { bleed: 0.004, ...o });
    fillPoly(`${id}beakL`, '#b9452a', A(230), L(b, BEAK_L), { bleed: 0.004, ...o });
    // near wing: coverts, spotted, then the dark primaries with bright edges
    fillPoly(`${id}nw`, '#10336e', A(245), L(b, wingX(WING, b)), { bleed: 0.015, ...o });
    fillPoly(`${id}cov`, '#2a6fd0', A(240), L(b, wingX(COVERTS, b)), { bleed: 0.012, ...o });
    for (let i = 0; i < 8; i++) { const [sx, sy] = L(b, wingX([[-6 - (i % 4) * 10, -20 - Math.floor(i / 4) * 22 - (i % 4) * 4]], b))[0]; dot(`${id}ws${i}`, '#5ad0f0', A(220), sx, sy, 2.4 * b.s, o); }
    if (b.fish) {
      const tip = [134, -12], f = place([[-4, 0], [10, -7], [30, -6], [42, -1], [52, -8], [54, 4], [44, 3], [30, 8], [10, 7]], tip[0] - 22, tip[1] + 2, 1, 20 + 8 * Math.sin(b.t * 18));
      fillPoly(`${id}fish`, '#8ea6ba', A(235), L(b, f), { bleed: 0.008, ...o });
      fillPoly(`${id}fishB`, '#45607a', A(200), L(b, f.slice(0, 5)), { bleed: 0.008, ...o });
    }
    if (b.feet) for (const fx of [14, 26]) stroke(`${id}ft${fx}`, 'pen', '#d14a2c', 1.1 * b.s, L(b, [[fx, 22], [fx - 2, 34]]), 1, o);
  }
  // ink: the eye, then a boiling fineliner contour; kept even when the colour is gone (pencil-only bird)
  const ink = b.colour > 0.3 ? '#0b1f45' : '#34343e', inkName = b.colour > 0.3 ? 'pen' : '2B', w = (b.colour > 0.3 ? 0.9 : 1.7) * Math.max(0.6, b.s), al = b.alpha ?? 1;
  if (al < 0.6) return;
  const [ex, ey] = L(b, [[70, -26]])[0];
  dot(`${id}eye`, '#0a0a0f', 250, ex, ey, 4.2 * b.s, o);
  stroke(`${id}oBelly`, inkName, ink, w, L(b, [[-50, 8], [-24, 20], [8, 26], [40, 22], [66, 10], [80, -2]]), 1, { curve: 0.5, ...o });
  stroke(`${id}oBack`, inkName, ink, w, L(b, [[-58, -6], [-36, -22], [-8, -30], [22, -31], [44, -36], [60, -44], [76, -40], [86, -26]]), 1, { curve: 0.5, ...o });
  stroke(`${id}oBeak`, inkName, ink, w * 0.8, L(b, [[84, -26], [136, -15], [84, -6]]), 1, { curve: 0.1, ...o });
  stroke(`${id}oTail`, inkName, ink, w * 0.8, L(b, [[-52, -8], [-96, -18], [-102, -6], [-98, 6], [-52, 6]]), 1, { curve: 0.3, ...o });
  stroke(`${id}oWing`, inkName, ink, w, L(b, wingX(WING.slice(0, 8), b)), 1, { curve: 0.4, ...o });
  for (let i = 0; i < TIPS.length; i++) { const base = wingX([[lerp(4, -46, i / 5), lerp(-60, -40, i / 5)]], b)[0], tip = wingX([TIPS[i]], b)[0]; stroke(`${id}fe${i}`, inkName, ink, w * 0.6, L(b, [base, tip]), 1, o); }
}

// Gouache highlights, added as light: eye catchlight, wet sheen on the back and the beak
export function highlights(ctx, toScr, b, a = 1) {
  if (b.colour < 0.3 || a <= 0) return;
  const pts = L(b, [[71.5, -27.5], [20, -28], [104, -21]]).map(([x, y]) => toScr(x, y));
  const r = Math.max(1, b.s * toScr.z);
  ctx.fillStyle = `rgba(255,255,255,${0.95 * a})`; ctx.beginPath(); ctx.arc(pts[0][0], pts[0][1], 1.6 * r, 0, 7); ctx.fill();
  const g = ctx.createRadialGradient(pts[1][0], pts[1][1], 0, pts[1][0], pts[1][1], 26 * r);
  g.addColorStop(0, `rgba(190,240,255,${0.35 * a})`); g.addColorStop(1, 'rgba(190,240,255,0)');
  ctx.fillStyle = g; ctx.fillRect(pts[1][0] - 30 * r, pts[1][1] - 30 * r, 60 * r, 60 * r);
  ctx.strokeStyle = `rgba(255,255,255,${0.5 * a})`; ctx.lineWidth = 1.2 * r; ctx.beginPath(); ctx.moveTo(pts[2][0] - 14 * r, pts[2][1] - 1 * r); ctx.lineTo(pts[2][0] + 10 * r, pts[2][1] + 2 * r); ctx.stroke();
}
