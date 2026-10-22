/* timber/art.js — 팀버 러시 그림(자체 제작). 원작 실루엣만 참고, 원작 스프라이트는 쓰지 않음.
 * 스타일: 동양식 귀여움(흰자 없는 콩눈·작은 얼굴·볼터치) · 파스텔 · 평면 2D(그라데이션 없음) · 같은 계열 굵은 외곽선 + 평면 밝은 띠 */
'use strict';
const ART = (() => {
  // ---------- 색 ----------
  const memo = new Map();
  function hex2rgb(h) { h = h.replace('#', ''); if (h.length === 3) h = h.split('').map(c => c + c).join(''); const n = parseInt(h, 16); return [n >> 16 & 255, n >> 8 & 255, n & 255]; }
  function rgb2hsl([r, g, b]) { r /= 255; g /= 255; b /= 255; const mx = Math.max(r, g, b), mn = Math.min(r, g, b); let h = 0, s = 0; const l = (mx + mn) / 2; if (mx !== mn) { const d = mx - mn; s = l > .5 ? d / (2 - mx - mn) : d / (mx + mn); h = mx === r ? (g - b) / d + (g < b ? 6 : 0) : mx === g ? (b - r) / d + 2 : (r - g) / d + 4; h /= 6; } return [h, s, l]; }
  function hsl2hex(h, s, l) { const f = n => { const k = (n + h * 12) % 12, a = s * Math.min(l, 1 - l); const c = l - a * Math.max(-1, Math.min(k - 3, 9 - k, 1)); return Math.round(c * 255).toString(16).padStart(2, '0'); }; return '#' + f(0) + f(8) + f(4); }
  function dk(hex, k = .55) { const key = 'd' + hex + k; if (memo.has(key)) return memo.get(key); const [h, s, l] = rgb2hsl(hex2rgb(hex)); const v = hsl2hex(h, Math.min(1, s * 1.05 + .06), l * k); memo.set(key, v); return v; }
  function lt(hex, k = .45) { const key = 'l' + hex + k; if (memo.has(key)) return memo.get(key); const [h, s, l] = rgb2hsl(hex2rgb(hex)); const v = hsl2hex(h, s, l + (1 - l) * k); memo.set(key, v); return v; }
  function rgba(hex, a) { const [r, g, b] = hex2rgb(hex); return `rgba(${r},${g},${b},${a})`; }

  // ---------- 도형 ----------
  function P(s) {
    if (typeof s === 'string') return new Path2D(s);
    const p = new Path2D();
    if (s[0] === 'c') p.arc(s[1], s[2], s[3], 0, Math.PI * 2);
    else if (s[0] === 'e') p.ellipse(s[1], s[2], s[3], s[4], s[5] || 0, 0, Math.PI * 2);
    else if (s[0] === 'r') p.roundRect(s[1], s[2], s[3], s[4], s[5] || 0);
    return p;
  }
  // part = { s: 도형, f: 채움, o: 외곽선색(false=없음), sep: 자기 외곽선, ow: 외곽선 배율, band: [밝은 띠 도형], bc, lines: [svg], lc, lw, a: 투명도 }
  function paint(g, parts, OW) {
    const B = parts.filter(Boolean).map(pt => Object.assign({}, pt, { path: P(pt.s) }));
    g.lineJoin = 'round'; g.lineCap = 'round';
    for (const pt of B) if (!pt.sep && pt.o !== false) { g.lineWidth = OW * 2 * (pt.ow || 1); g.strokeStyle = pt.o || dk(pt.f); g.stroke(pt.path); }
    for (const pt of B) {
      if (pt.sep && pt.o !== false) { g.lineWidth = OW * 1.6 * (pt.ow || 1); g.strokeStyle = pt.o || dk(pt.f); g.stroke(pt.path); }
      g.globalAlpha = pt.a == null ? 1 : pt.a; g.fillStyle = pt.f; g.fill(pt.path); g.globalAlpha = 1;
      if (pt.band) { g.save(); g.clip(pt.path); g.fillStyle = pt.bc || lt(pt.f); for (const b of pt.band) g.fill(P(b)); g.restore(); }
      if (pt.lines) { g.strokeStyle = pt.lc || dk(pt.f, .62); g.lineWidth = pt.lw || OW * .75; for (const l of pt.lines) g.stroke(P(l)); }
      if (pt.spark) { g.fillStyle = '#ffffff'; g.globalAlpha = .9; g.fill(P(pt.spark)); g.globalAlpha = 1; }
    }
  }
  // 오프스크린 캐시
  const cache = new Map();
  const quant = v => Math.max(.2, Math.round(v * 16) / 16);
  function build(key, box, pad, scale, fn) {
    const ck = key + '@' + scale; let c = cache.get(ck); if (c) return c;
    const cv = document.createElement('canvas'); cv.width = Math.max(1, Math.ceil((box[0] + pad * 2) * scale)); cv.height = Math.max(1, Math.ceil((box[1] + pad * 2) * scale));
    const g = cv.getContext('2d'); g.scale(scale, scale); g.translate(pad, pad); fn(g);
    c = { cv, pad, scale }; cache.set(ck, c); if (cache.size > 500) cache.delete(cache.keys().next().value); return c;
  }
  function blit(g, c) { g.drawImage(c.cv, -c.pad, -c.pad, c.cv.width / c.scale, c.cv.height / c.scale); }
  function star4(x, y, r) { return `M${x} ${y - r} Q${x + r * .18} ${y - r * .18} ${x + r} ${y} Q${x + r * .18} ${y + r * .18} ${x} ${y + r} Q${x - r * .18} ${y + r * .18} ${x - r} ${y} Q${x - r * .18} ${y - r * .18} ${x} ${y - r}Z`; }
  function star5(x, y, r, ri = .45) { let s = ''; for (let i = 0; i < 10; i++) { const a = -Math.PI / 2 + i * Math.PI / 5, rr = i % 2 ? r * ri : r; s += (i ? 'L' : 'M') + (x + Math.cos(a) * rr).toFixed(2) + ' ' + (y + Math.sin(a) * rr).toFixed(2); } return s + 'Z'; }

  // ---------- 캐릭터 (설계 상자 100×124, 발끝 (50,122)) ----------
  const SKIN = '#ffe1c9';
  const HEAD = c => ({ s: ['c', 50, 42, 27], f: c.skin, band: ['M25 42 C25 27 35 17 48 15 C40 22 34 31 33 43 Z'] });
  const base = (c, wide) => [
    { s: ['e', 29, 84, 7.5, 11.5], f: c.armC },
    { s: ['r', 37, 100, 11, 20, 5], f: c.pants }, { s: ['r', 52, 100, 11, 20, 5], f: c.pants },
    { s: ['e', 42, 119.5, 8.5, 4.6], f: c.boot }, { s: ['e', 58, 119.5, 8.5, 4.6], f: c.boot },
    { s: wide ? ['r', 23, 60, 54, 48, 18] : ['r', 28, 62, 44, 45, 16], f: c.shirt, band: [wide ? ['r', 28, 64, 9, 38, 4] : ['r', 32, 66, 7, 34, 4]] },
  ];
  const BEARD_S = 'M24 46 C24 65 34 75 50 75 C66 75 76 65 76 46 C70 56 62 59 50 59 C38 59 30 56 24 46 Z';
  const BEARD_L = 'M22 44 C20 72 30 98 50 100 C70 98 80 72 78 44 C70 56 62 59 50 59 C38 59 30 56 22 44 Z';
  const CHAR = {
    Lumberjack: { shirt: '#ff9d92', pants: '#93b4f5', boot: '#c99266', skin: SKIN, eye: 47, mouth: 54, mouthC: '#6b3f22',
      parts: c => [...base(c), { s: ['r', 37, 76, 26, 31, 7], f: '#93b4f5', sep: true, ow: .7, lines: ['M42 78 L38 64', 'M58 78 L62 64'] }, HEAD(c),
        { s: BEARD_S, f: '#c99266', sep: true, ow: .8 },
        { s: 'M23 37 C23 20 35 11 50 11 C65 11 77 20 77 37 Z', f: '#ffd36b', sep: true, band: ['M31 32 C32 22 39 16 47 15 L44 32 Z'] },
        { s: ['r', 17, 33, 66, 8, 4], f: '#ffd36b', sep: true, ow: .8 }] },
    Dwarf: { shirt: '#f6c993', pants: '#93b4f5', boot: '#b98a64', skin: SKIN, eye: 46, mouth: 54, mouthC: '#7a4320',
      parts: c => [...base(c), { s: ['r', 37, 78, 26, 29, 7], f: '#93b4f5', sep: true, ow: .7 }, HEAD(c),
        { s: BEARD_L, f: '#e3a36a', sep: true, ow: .8, band: ['M30 62 C32 80 38 92 46 96 C40 86 36 74 36 62 Z'] },
        { s: 'M24 30 L9 23 L12 38 Z', f: '#8fd3a8', sep: true },
        { s: 'M23 38 C23 20 35 12 50 12 C65 12 77 20 77 38 C68 33 60 31 50 31 C40 31 32 33 23 38 Z', f: '#8fd3a8', sep: true, band: ['M30 30 C32 22 39 17 46 16 L44 30 Z'] }] },
    Elf: { shirt: '#a7e2b6', pants: '#e9d6ab', boot: '#c99266', skin: '#ffe8d4', eye: 46, mouth: 54,
      parts: c => [{ s: 'M21 46 C19 22 32 11 50 11 C68 11 81 22 79 46 L80 72 C72 68 70 62 70 52 L30 52 C30 62 28 68 20 72 Z', f: '#ffe39a' }, ...base(c),
        { s: ['r', 28, 86, 44, 7, 3], f: '#d1a274', sep: true, ow: .7 },
        { s: 'M28 45 L8 31 L25 55 Z', f: c.skin }, { s: 'M72 45 L93 31 L76 55 Z', f: c.skin }, HEAD(c),
        { s: 'M24 41 C26 20 38 13 52 13 C66 13 77 22 77 39 C69 31 62 29 56 31 C50 35 40 35 24 41 Z', f: '#ffe39a', sep: true, band: ['M32 32 C34 22 41 17 48 16 L44 30 Z'] }] },
    Ent: { shirt: '#dcae84', pants: '#cfa078', boot: '#b88a62', skin: '#e6bb8f', eye: 46, mouth: 54, eyeC: '#5a3824', handC: '#e6bb8f',
      parts: c => [...base(c), { s: ['r', 28, 62, 44, 45, 16], f: c.shirt, o: false, lines: ['M40 70 C38 82 42 94 40 104', 'M60 68 C62 80 58 92 61 104'] }, HEAD(c),
        { s: ['c', 30, 24, 13], f: '#a3e39a', sep: true }, { s: ['c', 70, 24, 13], f: '#a3e39a', sep: true }, { s: ['c', 50, 15, 15], f: '#a3e39a', sep: true, band: ['M38 12 C40 5 46 2 52 2 C46 6 42 10 41 16 Z'] },
        { s: 'M60 7 C64 0 70 0 72 4 C68 4 65 6 63 10 Z', f: '#ffc0d0', sep: true, ow: .7 }] },
    Gnome: { shirt: '#c0b0ea', pants: '#a3b6e0', boot: '#b98a64', skin: SKIN, eye: 47, mouth: 55, glasses: true, mouthC: '#8a7060',
      parts: c => [...base(c), HEAD(c),
        { s: BEARD_L, f: '#f7f3ea', sep: true, ow: .8, o: '#b8ad9c' },
        { s: 'M22 38 C22 18 36 9 52 9 C68 9 78 19 78 38 Z', f: '#a8d4bc', sep: true, band: ['M30 32 C31 20 38 14 46 13 L43 32 Z'] }, { s: ['r', 18, 34, 64, 7, 3.5], f: '#a8d4bc', sep: true, ow: .8 }] },
    Goblin: { shirt: '#dcb08a', pants: '#bba8ea', boot: '#b98a64', skin: '#bde59a', armC: '#bde59a', eye: 45, mouth: 53,
      parts: c => [...base(c), { s: 'M33 40 L1 22 L23 57 Z', f: c.skin }, { s: 'M67 40 L99 22 L77 57 Z', f: c.skin }, HEAD(c),
        { s: 'M40 18 C44 10 52 10 56 16 C50 15 46 16 40 18 Z', f: '#8fc070', sep: true, ow: .6 }] },
    Ork: { shirt: '#d4a77f', pants: '#b7a99a', boot: '#a8806a', skin: '#a6d69a', armC: '#a6d69a', eye: 46, mouth: 54, tusk: true, wide: true,
      parts: c => [...base(c, true), { s: 'M28 66 L68 98', f: '#000', o: false, lines: ['M30 66 L70 100'], lc: '#a5785a', lw: 4.5 }, HEAD(c),
        { s: ['c', 50, 13, 9], f: '#7c7090', sep: true }, { s: ['r', 44, 19, 12, 5, 2], f: '#ffb3a8', sep: true, ow: .7 }] },
    Golem: { shirt: '#c6ccdc', pants: '#b6bccd', boot: '#a7adbf', skin: '#c6ccdc', armC: '#c6ccdc', handC: '#c6ccdc', eye: 41, mouth: 51, eyeC: '#5fe8ff', blush: false, glow: true, mouthC: '#7d8496',
      parts: c => [{ s: ['e', 25, 84, 10, 14], f: c.armC }, { s: ['r', 34, 100, 14, 20, 6], f: c.pants }, { s: ['r', 52, 100, 14, 20, 6], f: c.pants },
        { s: ['r', 21, 58, 58, 50, 15], f: c.shirt, band: [['r', 26, 62, 9, 40, 4]], lines: ['M40 70 L46 80 L42 90', 'M62 66 L58 76'] },
        { s: ['r', 23, 16, 54, 48, 17], f: c.skin, band: [['r', 28, 21, 8, 36, 4]], lines: ['M64 22 L60 30'] },
        { s: 'M27 26 C33 15 50 12 64 17 C57 24 44 27 27 26 Z', f: '#ade0a0', sep: true }, { s: 'M66 60 C72 56 78 58 79 64 C74 63 70 63 66 60 Z', f: '#ade0a0', sep: true }] },
    Robot: { shirt: '#bdc6da', pants: '#a3aec6', boot: '#8f9ab3', skin: '#cfd6e6', armC: '#b5bfd5', handC: '#cfd6e6', eye: 41, mouth: 48, eyeC: '#7ff2ff', blush: false, glow: true, visor: true, mouthC: '#7ff2ff',
      parts: c => [{ s: 'M50 17 L50 5', f: '#000', o: false, lines: ['M50 17 L50 5'], lc: '#7d879f', lw: 3 }, { s: ['c', 50, 5, 5], f: '#ffd36b', sep: true, ow: .7 },
        { s: ['e', 29, 84, 7, 11], f: c.armC }, { s: ['r', 38, 100, 10, 20, 4], f: c.pants }, { s: ['r', 52, 100, 10, 20, 4], f: c.pants },
        { s: ['e', 43, 119.5, 8, 4.4], f: c.boot }, { s: ['e', 57, 119.5, 8, 4.4], f: c.boot },
        { s: ['r', 28, 62, 44, 45, 11], f: c.shirt, band: [['r', 32, 66, 7, 34, 3]] }, { s: ['r', 40, 72, 20, 15, 5], f: '#55638a', sep: true, ow: .7 }, { s: ['c', 50, 79.5, 4], f: '#7ff2ff', o: false },
        { s: ['r', 21, 16, 58, 48, 13], f: c.skin, band: [['r', 26, 21, 8, 36, 4]] }, { s: ['r', 27, 27, 46, 27, 11], f: '#55638a', sep: true, ow: .7 }] },
  };
  for (const c of Object.values(CHAR)) { if (!c.armC) c.armC = c.shirt; if (!c.handC) c.handC = c.skin; }

  function drawFace(g, C, expr) {
    const ex = 52, ey = C.eye, d = C.eyeD || 6.6, col = C.eyeC || '#4a2e22';
    g.lineCap = 'round'; g.lineJoin = 'round';
    if (C.glow) { g.fillStyle = rgba(col, .28); for (const s of [-1, 1]) { g.beginPath(); g.ellipse(ex + s * d, ey, 5.2, 6.2, 0, 0, Math.PI * 2); g.fill(); } }
    g.fillStyle = col; g.strokeStyle = col; g.lineWidth = 1.9;
    if (expr === 'blink') { for (const s of [-1, 1]) { g.beginPath(); g.moveTo(ex + s * d - 2.6, ey + .6); g.quadraticCurveTo(ex + s * d, ey + 2, ex + s * d + 2.6, ey + .6); g.stroke(); } }
    else if (expr === 'squint') { g.beginPath(); g.moveTo(ex - d - 2.4, ey - 2.6); g.lineTo(ex - d + 1.8, ey); g.lineTo(ex - d - 2.4, ey + 2.6); g.moveTo(ex + d + 2.4, ey - 2.6); g.lineTo(ex + d - 1.8, ey); g.lineTo(ex + d + 2.4, ey + 2.6); g.stroke(); }
    else { const big = expr === 'wow'; for (const s of [-1, 1]) { g.beginPath(); g.ellipse(ex + s * d, ey, big ? 2.9 : 2.3, big ? 4.4 : 3.5, 0, 0, Math.PI * 2); g.fill(); } }
    if (C.blush !== false) { g.fillStyle = 'rgba(255,145,160,.5)'; for (const s of [-1, 1]) { g.beginPath(); g.ellipse(ex + s * (d + 5.6), ey + 6, 3.8, 2.2, 0, 0, Math.PI * 2); g.fill(); } }
    if (C.glasses) { g.strokeStyle = '#7d6a5c'; g.lineWidth = 1.4; for (const s of [-1, 1]) { g.beginPath(); g.arc(ex + s * d, ey, 5.4, 0, Math.PI * 2); g.stroke(); } g.beginPath(); g.moveTo(ex - d + 5.4, ey - 1); g.lineTo(ex + d - 5.4, ey - 1); g.stroke(); }
    const mc = C.mouthC || '#7a4a36', my = C.mouth; g.strokeStyle = mc; g.fillStyle = mc; g.lineWidth = 1.6;
    if (expr === 'wow') { g.beginPath(); g.ellipse(ex, my + .6, 1.8, 2.3, 0, 0, Math.PI * 2); g.stroke(); }
    else if (expr === 'squint') { g.beginPath(); g.ellipse(ex, my + .4, 2.2, 1.6, 0, 0, Math.PI * 2); g.fill(); }
    else { g.beginPath(); g.moveTo(ex - 2.4, my); g.quadraticCurveTo(ex, my + 2.4, ex + 2.4, my); g.stroke(); }
    if (C.tusk) { g.fillStyle = '#fffaf0'; g.strokeStyle = '#c9bfa8'; g.lineWidth = .9; for (const s of [-1, 1]) { g.beginPath(); g.moveTo(ex + s * 3.6 - 1.4, my + .6); g.lineTo(ex + s * 3.9, my - 3.4); g.lineTo(ex + s * 3.6 + 1.4, my + .6); g.closePath(); g.fill(); g.stroke(); } }
  }
  const OWC = 3.1;
  function charSprite(key, u) { const C = CHAR[key] || CHAR.Lumberjack; return build('ch:' + key, [100, 124], 12, quant(u), g => paint(g, C.parts(C), OWC)); }

  // ---------- 도끼 (설계 상자 64×112, 손잡이 끝 (32,108) = 쥐는 점 기준) ----------
  const H = (c, extra) => [{ s: ['r', 28, 16, 8, 94, 4], f: c, band: [['r', 29.5, 18, 2.2, 88, 1]] }].concat(extra || []);
  const AXE = {
    CrudeAxe: { tier: 0, parts: () => H('#d6a575', [{ s: 'M28 22 L21 24 L21 35 L28 37 Z', f: '#c9d0dc', sep: true }, { s: 'M36 18 C53 16 61 27 61 45 C53 41 44 41 36 43 Z', f: '#c9d0dc', sep: true, band: ['M40 21 C50 21 56 27 58 35 L42 31 Z'] }]) },
    IronboundAxe: { tier: 1, parts: () => H('#b8876a', [{ s: ['r', 25.5, 62, 13, 6, 2.5], f: '#a3acc2', sep: true, ow: .7 }, { s: ['r', 25.5, 84, 13, 6, 2.5], f: '#a3acc2', sep: true, ow: .7 },
      { s: 'M28 18 L17 22 L17 37 L28 41 Z', f: '#a3acc2', sep: true }, { s: 'M36 14 C57 12 65 27 64 49 C55 43 44 43 36 45 Z', f: '#e1e6f0', sep: true, band: ['M40 18 C52 18 59 26 61 37 L42 33 Z'] }]) },
    SpikedWarAxe: { tier: 2, parts: () => H('#9b7766', [{ s: 'M30 18 L32 1 L34 18 Z', f: '#a3aabb', sep: true }, { s: 'M28 15 C12 15 4 29 6 47 C14 41 20 41 28 43 Z', f: '#d4dae6', sep: true },
      { s: 'M36 13 C59 11 67 29 65 53 C55 45 44 45 36 47 Z', f: '#d4dae6', sep: true, band: ['M40 17 C53 17 60 26 62 38 L42 34 Z'] }, { s: 'M64 27 L73 25 L65 35 Z', f: '#a3aabb', sep: true, ow: .7 }, { s: 'M7 29 L-2 27 L6 37 Z', f: '#a3aabb', sep: true, ow: .7 }],
      ).map((p, i) => i === 0 ? Object.assign(p, { lines: ['M28 70 L36 64', 'M28 80 L36 74', 'M28 90 L36 84'] }) : p) },
    MidasAxe: { tier: 3, aura: 'gold', parts: () => H('#d09a64', [{ s: ['r', 25, 14, 14, 8, 3], f: '#ffd86e', sep: true, ow: .7 }, { s: ['r', 25, 101, 14, 8, 3], f: '#ffd86e', sep: true, ow: .7 },
      { s: 'M28 18 C18 18 13 26 14 36 C20 33 24 33 28 34 Z', f: '#ffd86e', sep: true }, { s: 'M36 12 C61 8 67 31 63 55 C53 47 44 47 36 49 Z', f: '#ffd86e', sep: true, band: ['M40 16 C53 15 60 25 62 38 L42 33 Z'], lines: ['M45 26 C53 24 57 32 52 38'], lc: '#d19b2e', spark: star4(56, 22, 3.4) },
      { s: ['c', 36, 31, 5], f: '#ffa8b8', sep: true, ow: .7 }]) },
    FrostbiteAxe: { tier: 4, aura: 'frost', parts: () => H('#a9c9ec', [{ s: 'M28 16 L17 22 L21 35 L28 33 Z', f: '#c9f2ff', sep: true },
      { s: 'M36 12 L57 7 L67 26 L63 53 L51 47 L36 49 Z', f: '#c9f2ff', sep: true, band: ['M38 15 L55 10 L50 28 L38 30 Z'], lines: ['M57 7 L50 28 L63 53', 'M50 28 L36 31'], lc: '#7cc4e0' },
      { s: 'M43 48 L46 60 L49 48 Z', f: '#c9f2ff', sep: true, ow: .7 }, { s: 'M53 49 L55 56 L57 50 Z', f: '#c9f2ff', sep: true, ow: .7 }]) },
    ArcaneCresentAxe: { tier: 5, aura: 'arcane', parts: () => H('#9a8ac8', [{ s: 'M33 7 C66 6 75 45 50 67 C59 45 53 23 33 22 Z', f: '#d3adff', sep: true, band: ['M37 10 C52 11 62 20 66 32 C58 22 48 17 37 17 Z'], lines: ['M56 26 l4 4', 'M60 38 l-3 5', 'M57 50 l3 3'], lc: '#ff9de8', lw: 2.4 },
      { s: ['c', 32, 14, 6], f: '#8ff0ff', sep: true, ow: .7, spark: star4(30, 12, 1.8) }, { s: ['c', 32, 108, 6.5], f: '#8ff0ff', sep: true, ow: .7 }]) },
    MagmaBladeAxe: { tier: 6, aura: 'magma', parts: () => H('#7d6d6d', [{ s: ['r', 26, 66, 12, 26, 4], f: '#ffad7a', sep: true, ow: .7 }, { s: 'M28 16 L13 20 L19 37 L28 35 Z', f: '#8a7b7b', sep: true },
      { s: 'M36 10 C61 6 69 31 65 57 C54 49 44 49 36 51 Z', f: '#8a7b7b', sep: true, lines: ['M42 18 L50 28 L46 36 L56 45', 'M53 15 L59 24', 'M18 24 L23 30'], lc: '#ffb27a', lw: 3.2 }]) },
    ChainsawAxe: { tier: 7, aura: 'saw', parts: () => [{ s: ['r', 31, 2, 17, 52, 8.5], f: '#e8ecf4', band: [['r', 33, 6, 4, 44, 2]], lines: ['M34 8 L31 11 L34 14 L31 17 L34 20 L31 23 L34 26 L31 29 L34 32 L31 35 L34 38 L31 41 L34 44 L31 47'], lc: '#8b95ab', lw: 1.6 },
      { s: ['r', 15, 42, 34, 32, 10], f: '#ffd36b', band: [['r', 19, 46, 7, 22, 3]], lines: ['M24 58 L40 58', 'M24 64 L40 64'] }, { s: ['r', 27, 72, 10, 38, 5], f: '#ff9f9f', band: [['r', 28.5, 75, 2.2, 30, 1]] },
      { s: 'M15 50 C6 50 5 64 15 64', f: 'transparent', o: false, lines: ['M15 50 C6 50 5 64 15 64'], lc: '#c9962e', lw: 3 }] },
    CelestialAxe: { tier: 8, aura: 'star', parts: () => H('#eef0ff', [{ s: ['r', 25, 60, 14, 6, 2.5], f: '#ffe08a', sep: true, ow: .7 }, { s: ['r', 25, 82, 14, 6, 2.5], f: '#ffe08a', sep: true, ow: .7 }, { s: 'M28 13 L32 -8 L36 13 Z', f: '#fbf9ff', sep: true, o: '#a9b3dd' },
      { s: 'M28 15 C14 17 8 31 10 47 C16 41 22 41 28 43 Z', f: '#fbf9ff', sep: true, o: '#a9b3dd' },
      { s: 'M36 10 C65 6 73 33 67 61 C57 51 46 51 36 53 Z', f: '#fbf9ff', sep: true, o: '#a9b3dd', lines: ['M40 14 C56 12 64 22 66 34'], lc: '#e8c45e', lw: 2.4 },
      { s: star5(46, 31, 9), f: '#a6dcff', sep: true, ow: .7, spark: star4(44, 28, 2) }], ).map((p, i) => i === 0 ? Object.assign(p, { o: '#a9b3dd' }) : p) },
  };
  const OWA = 2.6;
  function axeSprite(key, u) { const A = AXE[key] || AXE.CrudeAxe; return build('ax:' + key, [64, 112], 16, quant(u), g => { if (A.tier >= 5) { g.fillStyle = rgba(A.tier === 8 ? '#fff3b0' : A.tier === 6 ? '#ff9a6a' : '#e0b8ff', .22); g.beginPath(); g.arc(46, 30, 34, 0, Math.PI * 2); g.fill(); } paint(g, A.parts(), OWA); }); }
  const AXE_TIER = k => (AXE[k] || AXE.CrudeAxe).tier;
  const TIER_COLOR = ['#c9d0dc', '#c9d0dc', '#9ee6a8', '#ffd86e', '#a6e6ff', '#d3adff', '#ffad7a', '#ffd36b', '#fff6c8'];

  // 캐릭터 + 앞팔 + 도끼를 한 번에. (x,y)=발 화면좌표, ppu=월드1칸 픽셀, o: { h:키(월드), expr, armAng, axeAng, axe, alpha, squash, tilt }
  const AXE_IN_CHAR = (1.25 / 112) / (1.9 / 124); // 도끼 설계단위 → 캐릭터 설계단위 (도끼 1.25칸, 캐릭터 1.9칸 기준)
  function character(g, key, x, y, ppu, face, o = {}) {
    const C = CHAR[key] || CHAR.Lumberjack, hh = o.h || 1.9, u = ppu * hh / 124;
    const spr = charSprite(key, u);
    g.save(); g.globalAlpha = o.alpha == null ? 1 : o.alpha; g.translate(x, y);
    const sq = o.squash || 0; g.scale(face * u * (1 + sq), u * (1 - sq)); if (o.tilt) g.rotate(o.tilt * face); g.translate(-50, -122);
    blit(g, spr); drawFace(g, C, o.expr || 'idle');
    let head = null;
    if (o.axe) {
      const sh = [61, 78], aa = o.armAng == null ? 2.3 : o.armAng, L = 14; const hx = sh[0] + Math.sin(aa) * L, hy = sh[1] - Math.cos(aa) * L;
      g.lineCap = 'round'; g.strokeStyle = dk(C.armC); g.lineWidth = 11 + OWC * 2; g.beginPath(); g.moveTo(sh[0], sh[1]); g.lineTo(hx, hy); g.stroke();
      g.strokeStyle = C.armC; g.lineWidth = 11; g.stroke();
      const asp = axeSprite(o.axe, u * AXE_IN_CHAR);
      g.save(); g.translate(hx, hy); g.rotate(o.axeAng == null ? -.35 : o.axeAng); g.scale(AXE_IN_CHAR, AXE_IN_CHAR); g.translate(-32, -100); blit(g, asp);
      const m = g.getTransform(); const hp = new DOMPoint(48, 28).matrixTransform(m); head = { x: hp.x, y: hp.y }; g.restore();
      g.fillStyle = dk(C.handC); g.beginPath(); g.arc(hx, hy, 6.8 + OWC, 0, Math.PI * 2); g.fill(); g.fillStyle = C.handC; g.beginPath(); g.arc(hx, hy, 6.8, 0, Math.PI * 2); g.fill();
    }
    g.restore(); return head;
  }
  // 상점·획득 화면용 미리보기
  function preview(g, key, w, hgt, opt = {}) {
    g.clearRect(0, 0, w, hgt);
    if (AXE[key]) { const s = Math.min(w / 80, hgt / 128); const asp = axeSprite(key, s); g.save(); g.translate(w / 2, hgt / 2); g.rotate(opt.rot == null ? .5 : opt.rot); g.scale(s, s); g.translate(-38, -56); blit(g, asp); g.restore(); }
    else { const ppu = hgt * .78 / 1.9; character(g, key, w / 2, hgt * .92, ppu, 1, { h: 1.9, expr: opt.expr || 'idle', axe: opt.axe || null, armAng: 2.4, axeAng: -.35 }); }
  }

  // ---------- 나무 (월드 단위, 원점 = 나무 x) ----------
  const TREE = {
    Forest: { bark: '#d8a679', crown: '#96d78c', crownB: '#b6e8a6', kind: 'round' },
    Swamp: { bark: '#c3ac8f', crown: '#b0d39d', crownB: '#c6e2b6', kind: 'willow', moss: '#9cc58f' },
    Cemetery: { bark: '#b9add0', crown: '#c9b8e8', kind: 'bare', leaf: '#d9c6f2' },
    WildFire: { bark: '#a08a85', crown: '#8a7470', kind: 'burnt', crack: '#ffb27a' },
  };
  const TB = { x0: -5, x1: 5, y0: -5, y1: 9.5 }; // 캐시 범위
  function treeSprite(level, ppu) {
    const T = TREE[level] || TREE.Forest;
    return build('tree:' + level, [TB.x1 - TB.x0, TB.y1 - TB.y0], .5, quant(ppu), g => {
      g.translate(-TB.x0, TB.y1); g.scale(1, -1); // 월드 좌표(위가 +)
      const OW = .075; const parts = [];
      // 줄기 + 뿌리
      const trunk = 'M-1.8 -4.45 C-1.35 -4.25 -1.15 -4.05 -1.12 -3.6 C-1.05 -2 -1.02 1 -0.95 3.4 L1.35 3.4 C1.38 1 1.38 -2 1.45 -3.6 C1.48 -4.05 1.7 -4.25 2.15 -4.45 C1.6 -4.38 1.25 -4.3 0.95 -4.42 C0.6 -4.55 0.35 -4.32 0.1 -4.38 C-0.25 -4.48 -0.45 -4.3 -0.8 -4.4 C-1.15 -4.5 -1.45 -4.42 -1.8 -4.45 Z';
      const grooves = ['M0.65 -3.4 C0.75 -2.2 0.55 -1.2 0.7 0.4', 'M-0.25 0.9 C-0.35 1.8 -0.2 2.6 -0.3 3.3', 'M0.95 -0.6 C1.05 0.6 0.9 1.6 1.0 2.6', 'M-0.6 -3.2 C-0.5 -2.6 -0.62 -2.1 -0.55 -1.7'];
      if (T.kind === 'round' || T.kind === 'willow') {
        g.translate(0, -1.3);
        const R = T.kind === 'round' ? [[0, 5.4, 2.7], [-2.25, 4.4, 1.8], [2.45, 4.5, 1.9], [-1.25, 3.55, 1.6], [1.35, 3.5, 1.7], [-3.3, 5.7, 1.5], [3.4, 5.9, 1.5], [-1.5, 6.7, 1.9], [1.7, 6.9, 1.9], [0, 7.9, 2.0], [-3.1, 7.2, 1.3], [3.2, 7.4, 1.3]]
          : [[0, 5.6, 2.6], [-2.3, 4.8, 1.9], [2.5, 4.9, 1.9], [-1.4, 6.8, 1.9], [1.6, 7.0, 1.9], [0, 8.0, 1.9], [-3.4, 6.1, 1.4], [3.5, 6.3, 1.4]];
        parts.push({ s: 'M-0.6 3 C-1.4 3.6 -2.1 4.2 -2.6 5 L-2.1 5.3 C-1.6 4.6 -1 4.1 -0.3 3.7 Z M0.9 3 C1.7 3.5 2.4 4.1 2.8 4.9 L2.3 5.2 C1.9 4.5 1.4 4.1 0.6 3.7 Z', f: T.bark });
        g.save(); g.translate(0, 1.3); paint(g, [{ s: trunk, f: T.bark, band: ['M-0.9 -4 C-0.88 -2 -0.86 1 -0.8 3.4 L-0.48 3.4 C-0.52 1 -0.56 -2 -0.6 -4 Z'], lines: grooves }], OW); g.restore();
        if (0) parts.push({ s: trunk, f: T.bark, band: ['M-0.9 -4 C-0.88 -2 -0.86 1 -0.8 3.4 L-0.48 3.4 C-0.52 1 -0.56 -2 -0.6 -4 Z'], lines: grooves });
        for (const [cx, cy, r] of R) parts.push({ s: ['c', cx, cy, r], f: T.crown });
        g.save(); paint(g, parts, OW); g.restore();
        // 잎 덩어리 밝은 띠 + 덩어리 경계
        g.save(); const crownPath = new Path2D(); for (const [cx, cy, r] of R) crownPath.arc(cx, cy, r, 0, Math.PI * 2), crownPath.moveTo(cx + r, cy); g.clip(crownPath);
        g.fillStyle = T.crownB; for (const [cx, cy, r] of R) if (cy > 4.2) { g.beginPath(); g.arc(cx - r * .18, cy + r * .2, r * .72, Math.PI * .55, Math.PI * 1.05); g.arc(cx - r * .05, cy + r * .05, r * .82, Math.PI * 1.02, Math.PI * .52, true); g.fill(); }
        g.fillStyle = dk(T.crown, .86); for (const [cx, cy, r] of R) if (cy < 6.2) { g.beginPath(); g.arc(cx, cy, r, Math.PI * 1.08, Math.PI * 1.92); g.arc(cx, cy + r * .24, r * .97, Math.PI * 1.9, Math.PI * 1.1, true); g.fill(); }
        g.strokeStyle = dk(T.crown, .7); g.lineWidth = .05; g.lineCap = 'round'; for (const [cx, cy, r] of R) if (r > 1.6) { g.beginPath(); g.arc(cx, cy, r * .78, -Math.PI * .85, -Math.PI * .35); g.stroke(); }
        g.restore();
        if (T.kind === 'willow') { // 늘어진 이끼
          g.lineCap = 'round'; const strands = [[-3.2, 4.6, 2.2], [-2.4, 3.4, 1.8], [-1.6, 2.6, 1.3], [1.9, 2.8, 1.5], [2.8, 3.5, 2.0], [3.6, 4.8, 2.3], [-3.9, 5.2, 1.6], [0.2, 3.0, 0.8]];
          for (const [sx0, sy0, len] of strands) { const p = new Path2D(`M${sx0} ${sy0} C${sx0 + .15} ${sy0 - len * .4} ${sx0 - .15} ${sy0 - len * .7} ${sx0 + .05} ${sy0 - len}`); g.strokeStyle = dk(T.moss); g.lineWidth = .3; g.stroke(p); g.strokeStyle = T.moss; g.lineWidth = .16; g.stroke(p); }
        } else { // 작은 꽃
          for (const [fx, fy] of [[-2.4, 5.6], [1.2, 7.4], [2.9, 4.6], [-0.6, 4.4]]) { g.fillStyle = '#ffd0dc'; for (let i = 0; i < 5; i++) { const a = i * Math.PI * 2 / 5; g.beginPath(); g.arc(fx + Math.cos(a) * .13, fy + Math.sin(a) * .13, .1, 0, Math.PI * 2); g.fill(); } g.fillStyle = '#ffe39a'; g.beginPath(); g.arc(fx, fy, .07, 0, Math.PI * 2); g.fill(); }
        }
      } else { // 앙상한 나무(묘지) · 탄 나무(산불)
        g.translate(0, -1.0);
        const br = [['M-0.4 3 C-1.2 4 -2.4 4.4 -3.6 5.6', .42], ['M0.8 3 C1.6 4 2.8 4.2 3.8 5.4', .42], ['M0.1 3.2 C0 4.6 -0.4 5.8 -0.2 7.6', .4], ['M-2.2 4.5 C-2.6 5.4 -2.4 6.2 -3 7', .22], ['M2.4 4.4 C2.9 5.2 2.7 6.1 3.3 6.9', .22], ['M-0.25 5.6 C0.6 6.2 1.2 6.6 1.6 7.6', .2], ['M-3 5.2 C-3.8 5.1 -4.3 5.6 -4.6 6.1', .16], ['M3.2 5 C4 4.9 4.4 5.3 4.7 5.9', .16]];
        g.lineCap = 'round'; g.lineJoin = 'round';
        for (const [d, w] of br) { const p = new Path2D(d); g.strokeStyle = dk(T.bark); g.lineWidth = w + OW * 2; g.stroke(p); }
        g.save(); g.translate(0, 1.0); paint(g, [{ s: trunk.replace(/3\.4/g, '2.3'), f: T.bark, band: ['M-0.9 -4 C-0.88 -2 -0.86 1 -0.8 2.3 L-0.48 2.3 C-0.52 1 -0.56 -2 -0.6 -4 Z'], lines: grooves }], OW); g.restore();
        for (const [d, w] of br) { const p = new Path2D(d); g.strokeStyle = T.bark; g.lineWidth = w; g.stroke(p); }
        if (T.kind === 'bare') { for (const [lx, ly, r] of [[-3.5, 5.7, .5], [3.7, 5.5, .5], [-0.2, 7.6, .6], [-3, 7, .4], [3.3, 6.9, .42], [1.6, 7.6, .4]]) paint(g, [{ s: ['c', lx, ly, r], f: T.leaf, sep: true }], OW); }
        else { g.strokeStyle = T.crack; g.lineWidth = .09; for (const d of ['M0.2 -3.6 L0.45 -2.6 L0.1 -1.8 L0.5 -0.8', 'M-0.5 0.4 L-0.25 1.2 L-0.55 2', 'M1.0 -2.2 L0.85 -1.4']) g.stroke(new Path2D(d)); }
      }
    });
  }
  function treeFlash(level, ppu) { const base = treeSprite(level, ppu); return build('treeW:' + level, [TB.x1 - TB.x0, TB.y1 - TB.y0], .5, base.scale, g => { g.translate(-.5, -.5); g.scale(1 / base.scale, 1 / base.scale); g.drawImage(base.cv, 0, 0); g.globalCompositeOperation = 'source-atop'; g.fillStyle = '#fff'; g.fillRect(0, 0, base.cv.width, base.cv.height); }); }
  // 나무 그리기: x0=화면 나무 x, groundY=화면 y(월드 0 기준 변환 함수 사용)
  function tree(g, level, ppu, wx, sxF, syF, st) {
    const spr = treeSprite(level, ppu); const ox = sxF(wx), oy = syF(0);
    g.save(); const sh = st.shake > 0 ? Math.sin(st.shake * 70) * .06 * ppu : 0; const squash = st.shake > 0 ? Math.min(1, st.shake / .15) * .025 : 0;
    g.translate(ox + sh, syF(-4.45)); g.scale(1 + squash, 1 - squash * .4); g.translate(-(ox), -syF(-4.45));
    g.translate(ox, oy); g.scale(ppu, ppu); g.translate(TB.x0, -TB.y1); blit(g, spr);
    if (st.flash > 0) { g.globalAlpha = Math.min(.55, st.flash * 4); blit(g, treeFlash(level, ppu)); g.globalAlpha = 1; }
    g.restore();
    // 얼굴 (작게)
    const fx = sxF(wx + .18) + sh, fy = syF(-0.9), s = ppu / 70; g.save(); g.translate(fx, fy); g.scale(s, s);
    const col = level === 'WildFire' ? '#3d2420' : '#4a2e22'; g.fillStyle = col; g.strokeStyle = col; g.lineCap = 'round'; g.lineJoin = 'round'; g.lineWidth = 4.2;
    const e = st.expr;
    if (e === 'squint') { g.beginPath(); g.moveTo(-36, -8); g.lineTo(-25, 0); g.lineTo(-36, 8); g.moveTo(36, -8); g.lineTo(25, 0); g.lineTo(36, 8); g.stroke(); }
    else if (e === 'blink' || e === 'sleepy') { for (const sgn of [-1, 1]) { g.beginPath(); g.moveTo(sgn * 31 - 7, 1); g.quadraticCurveTo(sgn * 31, 5, sgn * 31 + 7, 1); g.stroke(); } }
    else { const big = e === 'wow'; for (const sgn of [-1, 1]) { g.beginPath(); g.ellipse(sgn * 31, 0, big ? 7.5 : 6, big ? 11 : 9, 0, 0, Math.PI * 2); g.fill(); } }
    g.fillStyle = level === 'Cemetery' ? 'rgba(220,170,230,.55)' : 'rgba(255,140,150,.5)'; for (const sgn of [-1, 1]) { g.beginPath(); g.ellipse(sgn * 52, 15, 10, 6, 0, 0, Math.PI * 2); g.fill(); }
    g.fillStyle = col; g.lineWidth = 3.6;
    if (e === 'wow') { g.beginPath(); g.ellipse(0, 22, 5, 6.5, 0, 0, Math.PI * 2); g.stroke(); }
    else if (e === 'squint') { g.beginPath(); g.ellipse(0, 21, 6, 4.5, 0, 0, Math.PI * 2); g.fill(); }
    else { g.beginPath(); g.moveTo(-7, 18); g.quadraticCurveTo(0, 25, 7, 18); g.stroke(); }
    g.restore();
  }
  // 산불 나무 가지 끝 불꽃 (매 프레임)
  function treeFlames(g, level, wx, sxF, syF, ppu, t) {
    if (level !== 'WildFire') return;
    for (const [x, y, s] of [[-3.6, 5.6, 1], [3.8, 5.4, 1], [-0.2, 7.6, 1.1], [-3, 7, .7], [3.3, 6.9, .7], [1.6, 7.6, .7], [-4.6, 6.1, .6], [4.7, 5.9, .6]]) {
      const k = (1 + Math.sin(t * 9 + x * 3) * .12) * s * ppu * .32; const px = sxF(wx + x), py = syF(y - 1.0);
      g.fillStyle = '#ff9f6b'; g.beginPath(); g.moveTo(px, py - k * 1.6); g.quadraticCurveTo(px + k * .9, py - k * .2, px, py + k * .3); g.quadraticCurveTo(px - k * .9, py - k * .2, px, py - k * 1.6); g.fill();
      g.fillStyle = '#ffe08a'; const k2 = k * .55; g.beginPath(); g.moveTo(px, py - k2 * 1.4); g.quadraticCurveTo(px + k2 * .8, py, px, py + k2 * .3); g.quadraticCurveTo(px - k2 * .8, py, px, py - k2 * 1.4); g.fill();
    }
  }

  // ---------- 배경 (화면 크기로 캐시) ----------
  const BG = {
    Forest: { sky: '#2c5752', sky2: '#336660', far: '#386d62', mid: '#2e5c50', near: '#294f45', ground: '#47683d', grass: '#6c9a58', moon: '#f6e8b6' },
    Swamp: { sky: '#294641', sky2: '#30534c', far: '#335a50', mid: '#2a4a43', near: '#24403a', ground: '#3d5a40', grass: '#5e8456', moon: '#e9f1c9', water: '#4c7a70' },
    Cemetery: { sky: '#2a2b4b', sky2: '#313358', far: '#363961', mid: '#2f3156', near: '#292b4c', ground: '#3a3c60', grass: '#565a82', moon: '#f2edff' },
    WildFire: { sky: '#47292a', sky2: '#5a3430', far: '#5e3a33', mid: '#4a2c29', near: '#3d2423', ground: '#4b3430', grass: '#6e4a3e', moon: '#ffd6a0' },
  };
  let bgCache = null;
  function background(g, level, cw, ch, sxF, syF, ppu) {
    const key = level + cw + 'x' + ch + ':' + ppu.toFixed(2);
    if (!bgCache || bgCache.key !== key) {
      const cv = document.createElement('canvas'); cv.width = cw; cv.height = ch; const b = cv.getContext('2d'); const C = BG[level] || BG.Forest;
      const horizon = syF(-4.4);
      b.fillStyle = C.sky; b.fillRect(0, 0, cw, ch); b.fillStyle = C.sky2; b.fillRect(0, horizon - ppu * 3.2, cw, ppu * 3.2);
      // 달/해
      const mx = cw * .8, my = Math.max(ppu * 1.4, syF(3.6)); b.fillStyle = rgba(C.moon, .12); b.beginPath(); b.arc(mx, my, ppu * 1.25, 0, Math.PI * 2); b.fill(); b.fillStyle = C.moon; b.beginPath(); b.arc(mx, my, ppu * .78, 0, Math.PI * 2); b.fill();
      if (level === 'Cemetery') { b.fillStyle = C.sky; b.beginPath(); b.arc(mx + ppu * .32, my - ppu * .18, ppu * .66, 0, Math.PI * 2); b.fill(); b.fillStyle = '#d8d2f5'; for (const [x, y, r] of [[.12, .12, .1], [.3, .25, .07], [.55, .1, .09], [.68, .3, .06], [.92, .22, .08], [.42, .4, .05]]) b.fill(P(star4(cw * x, ch * y * .6, ppu * r * 1.4))); }
      // 구름(평면)
      if (level !== 'Cemetery') { b.fillStyle = rgba('#ffffff', level === 'WildFire' ? .06 : .08); for (const [x, y, s] of [[.12, .18, 1.1], [.42, .1, .8], [.62, .24, 1.3], [.95, .12, .7]]) { const px = cw * x, py = Math.max(ppu, syF(4.4)) * (y / .18) * .6; b.beginPath(); b.ellipse(px, py, ppu * 1.2 * s, ppu * .38 * s, 0, 0, Math.PI * 2); b.ellipse(px + ppu * .6 * s, py - ppu * .2 * s, ppu * .7 * s, ppu * .36 * s, 0, 0, Math.PI * 2); b.fill(); } }
      // 먼 산
      b.fillStyle = C.far; b.beginPath(); b.moveTo(0, horizon); for (let i = 0; i <= 12; i++) { const x = cw * i / 12, y = horizon - ppu * (2.4 + Math.sin(i * 1.7) * .7 + (i % 3) * .25); b.quadraticCurveTo(x - cw / 24, y - ppu * .4, x, y); } b.lineTo(cw, horizon); b.closePath(); b.fill();
      // 먼 나무 줄
      const treeRow = (col, n, hgt, yoff, seed) => { b.fillStyle = col; for (let i = 0; i < n; i++) { const x = cw * (i + ((i * seed) % 7) / 14) / n, h = ppu * hgt * (.75 + ((i * 7 + seed) % 5) * .1), y = horizon + ppu * yoff;
        if (level === 'Forest') { b.beginPath(); b.moveTo(x, y - h); b.lineTo(x - h * .32, y - h * .45); b.lineTo(x - h * .2, y - h * .45); b.lineTo(x - h * .4, y); b.lineTo(x + h * .4, y); b.lineTo(x + h * .2, y - h * .45); b.lineTo(x + h * .32, y - h * .45); b.closePath(); b.fill(); }
        else if (level === 'Swamp') { b.fillRect(x - h * .04, y - h * .7, h * .08, h * .7); b.beginPath(); b.ellipse(x, y - h * .78, h * .36, h * .24, 0, 0, Math.PI * 2); b.fill(); for (let k = -2; k <= 2; k++) b.fillRect(x + k * h * .12 - h * .02, y - h * .78, h * .04, h * (.35 + (k & 1) * .15)); }
        else if (level === 'Cemetery') { b.beginPath(); b.roundRect(x - h * .14, y - h * .36, h * .28, h * .36, [h * .14, h * .14, 0, 0]); b.fill(); if (i % 3 === 0) { b.fillRect(x - h * .03, y - h * .62, h * .06, h * .3); b.fillRect(x - h * .12, y - h * .54, h * .24, h * .05); } }
        else { b.fillRect(x - h * .05, y - h, h * .1, h); b.fillRect(x - h * .25, y - h * .7, h * .22, h * .05); b.fillRect(x + h * .03, y - h * .55, h * .2, h * .05); } } };
      treeRow(C.mid, 16, 2.2, 0, 3); treeRow(C.near, 10, 1.5, .05, 5);
      if (level === 'Cemetery') { b.strokeStyle = C.near; b.lineWidth = Math.max(1, ppu * .04); for (let x = 0; x < cw; x += ppu * .32) { b.beginPath(); b.moveTo(x, horizon); b.lineTo(x, horizon - ppu * .6); b.stroke(); } b.fillStyle = C.near; b.fillRect(0, horizon - ppu * .55, cw, ppu * .05); }
      // 땅
      b.fillStyle = C.ground; b.fillRect(0, horizon, cw, ch - horizon); b.fillStyle = C.grass; b.fillRect(0, horizon, cw, ppu * .16);
      b.fillStyle = C.grass; for (let x = ppu * .3; x < cw; x += ppu * (.7 + ((x * 13) % 5) * .1)) { const y = horizon + ppu * .14; b.beginPath(); b.moveTo(x - ppu * .08, y); b.lineTo(x, y - ppu * .2); b.lineTo(x + ppu * .03, y); b.lineTo(x + ppu * .1, y - ppu * .14); b.lineTo(x + ppu * .16, y); b.closePath(); b.fill(); }
      if (level === 'Swamp') { b.fillStyle = C.water; for (const [x, w] of [[.15, 1.6], [.78, 2.2], [.46, 1.1]]) { b.beginPath(); b.ellipse(cw * x, horizon + ppu * .45, ppu * w, ppu * .16, 0, 0, Math.PI * 2); b.fill(); } b.strokeStyle = rgba('#ffffff', .18); b.lineWidth = Math.max(1, ppu * .03); for (const x of [.13, .8, .47]) { b.beginPath(); b.moveTo(cw * x - ppu * .3, horizon + ppu * .42); b.lineTo(cw * x + ppu * .2, horizon + ppu * .42); b.stroke(); } }
      if (level === 'Forest') { for (const [x, c] of [[.07, '#ffd0dc'], [.31, '#fff1a8'], [.66, '#ffd0dc'], [.9, '#d8ccff']]) { const px = cw * x, py = horizon + ppu * .5; b.fillStyle = c; for (let i = 0; i < 5; i++) { const a = i * Math.PI * 2 / 5; b.beginPath(); b.arc(px + Math.cos(a) * ppu * .07, py + Math.sin(a) * ppu * .07, ppu * .055, 0, Math.PI * 2); b.fill(); } } }
      bgCache = { key, cv };
    }
    g.drawImage(bgCache.cv, 0, 0);
  }
  // 떠다니는 장식(잎·반딧불·도깨비불·불씨)
  const amb = []; let ambT = performance.now();
  function ambient(g, level, cw, ch, ppu) {
    const now = performance.now(), dt = Math.min(.05, (now - ambT) / 1000); ambT = now;
    const want = level === 'WildFire' ? 26 : 14;
    while (amb.length < want) amb.push({ x: Math.random() * cw, y: Math.random() * ch, vx: 0, vy: 0, t: Math.random() * 10, r: Math.random() });
    for (const a of amb) {
      a.t += dt;
      if (level === 'Forest') { a.vy = ppu * .45; a.vx = Math.sin(a.t * 1.3 + a.r * 6) * ppu * .5; }
      else if (level === 'WildFire') { a.vy = -ppu * (.6 + a.r * .6); a.vx = Math.sin(a.t * 2 + a.r * 6) * ppu * .3; }
      else { a.vy = Math.sin(a.t * .8 + a.r * 4) * ppu * .15; a.vx = Math.cos(a.t * .6 + a.r * 5) * ppu * .18; }
      a.x += a.vx * dt; a.y += a.vy * dt;
      if (a.y > ch + 20) { a.y = -20; a.x = Math.random() * cw; } if (a.y < -20) { a.y = ch + 20; a.x = Math.random() * cw; } if (a.x < -20) a.x = cw + 20; if (a.x > cw + 20) a.x = -20;
      const s = ppu * (.08 + a.r * .06);
      if (level === 'Forest') { g.save(); g.translate(a.x, a.y); g.rotate(Math.sin(a.t * 2 + a.r * 9) * .9); g.fillStyle = a.r > .5 ? '#bdebb0' : '#ffd0dc'; g.beginPath(); g.ellipse(0, 0, s * 1.3, s * .6, 0, 0, Math.PI * 2); g.fill(); g.restore(); }
      else if (level === 'WildFire') { g.fillStyle = a.r > .5 ? '#ffb27a' : '#ffe08a'; g.globalAlpha = .55 + .45 * Math.sin(a.t * 6 + a.r * 7); g.fill(P(star4(a.x, a.y, s * .9))); g.globalAlpha = 1; }
      else { g.globalAlpha = .35 + .35 * Math.sin(a.t * 3 + a.r * 8); g.fillStyle = level === 'Cemetery' ? '#cdb8ff' : '#e6ff9a'; g.beginPath(); g.arc(a.x, a.y, s * .9, 0, Math.PI * 2); g.fill(); g.globalAlpha = 1; }
    }
  }

  // ---------- 통나무·코인·상자·드론 ----------
  const LOGC = { normal_log: '#d39d6c', lightning_log: '#a6dcff', magma_log: '#ffb08a', golden_log: '#ffe08a', arcane_log: '#d6b6ff', crystal_log: '#c4f3ff', magnet_log: '#cdd5e4' };
  const LEVEL_LOG = { Swamp: '#a9b28c', Cemetery: '#b2a5c2', WildFire: '#958581' };
  function logSprite(id, level, ppu) {
    return build('log:' + id + (id === 'normal_log' ? level : ''), [1, .6], .2, quant(ppu), g => {
      g.translate(.5, .3); const OW = .045;
      if (id.endsWith('_potion')) {
        const c = id === 'damage_potion' ? '#ffa3ad' : id === 'crit_chance_potion' ? '#ffd08f' : '#ffaee3';
        paint(g, [{ s: ['r', -.08, -.28, .16, .14, .04], f: '#e8d2b5', sep: true }, { s: 'M-.07 -.18 L-.07 -.08 C-.22 -.03 -.24 .2 -.12 .25 L.12 .25 C.24 .2 .22 -.03 .07 -.08 L.07 -.18 Z', f: '#eef6ff', o: '#9fb0c8' },
          { s: 'M-.17 .05 C-.16 .17 -.1 .24 0 .24 C.1 .24 .16 .17 .17 .05 C.08 .09 -.08 .01 -.17 .05 Z', f: c, o: false, band: ['M-.15 .06 L-.08 .06 L-.08 .2 L-.13 .2 Z'] }], OW);
        g.fillStyle = '#fff'; g.globalAlpha = .9; g.fill(P(star4(.06, -.02, .04))); g.globalAlpha = 1; return;
      }
      const c = id === 'normal_log' ? (LEVEL_LOG[level] || LOGC.normal_log) : (LOGC[id] || LOGC.normal_log);
      const cap = id === 'normal_log' ? '#f4d6aa' : lt(c, .55);
      paint(g, [{ s: ['r', -.44, -.19, .82, .38, .17], f: c, band: [['r', -.38, -.15, .7, .07, .03]], lines: ['M-.22 .06 L.04 .06', 'M-.1 -.03 L.16 -.03'] }, { s: ['e', .36, 0, .1, .18], f: cap, sep: true, lines: ['M.36 -.07 A.05 .08 0 1 1 .359 -.07'] }], OW);
      if (id === 'lightning_log') { g.fillStyle = '#ffffff'; g.fill(P('M-.12 -.15 L.02 -.02 L-.05 -.01 L.06 .15 L-.09 .02 L-.02 .01 Z')); }
      if (id === 'magma_log') { g.strokeStyle = '#ff7d52'; g.lineWidth = .035; g.lineCap = 'round'; g.stroke(P('M-.3 -.08 L-.18 .02 L-.22 .1 M.0 -.12 L.08 -.02 L.02 .08')); }
      if (id === 'golden_log') { g.fillStyle = '#fff'; g.fill(P(star4(-.12, -.02, .09))); g.fill(P(star4(.12, .06, .05))); }
      if (id === 'arcane_log') { g.strokeStyle = '#a77cff'; g.lineWidth = .03; g.stroke(P('M-.2 .0 A.08 .08 0 1 1 -.2 .001 M.02 -.08 L.1 .08 M.1 -.08 L.02 .08')); }
      if (id === 'crystal_log') { g.strokeStyle = '#7fc8e6'; g.lineWidth = .025; g.stroke(P('M-.3 -.16 L-.16 .16 M-.08 -.16 L.06 .16 M.14 -.16 L.2 .0')); }
      if (id === 'magnet_log') { paint(g, [{ s: 'M-.2 -.1 C-.2 .14 .1 .14 .1 -.1 L.02 -.1 C.02 .06 -.12 .06 -.12 -.1 Z', f: '#ff9f9f', sep: true, ow: .7 }, { s: ['r', -.2, -.13, .08, .06, .01], f: '#e9eef6', o: false }, { s: ['r', .02, -.13, .08, .06, .01], f: '#e9eef6', o: false }], OW); }
    });
  }
  const LOG_GLOW = { lightning_log: '#a6dcff', magma_log: '#ffb08a', golden_log: '#ffe08a', arcane_log: '#d6b6ff', crystal_log: '#c4f3ff', magnet_log: '#ffb3b3', damage_potion: '#ffa3ad', crit_chance_potion: '#ffd08f', crit_damage_potion: '#ffaee3' };
  function log(g, it, level, ppu, sxF, syF, t) {
    const id = it.cfg ? it.cfg.id : 'normal_log'; const px = sxF(it.x), py = syF(it.y);
    g.save(); g.globalAlpha = it.alpha; g.translate(px, py);
    if (it.special) { const gl = LOG_GLOW[id] || '#fff'; const k = 1 + Math.sin(t * 6 + it.x * 3) * .12; g.fillStyle = rgba(gl, .22); g.beginPath(); g.arc(0, 0, .48 * ppu * k * it.scale, 0, Math.PI * 2); g.fill(); g.fillStyle = rgba(gl, .18); g.beginPath(); g.arc(0, 0, .32 * ppu * k * it.scale, 0, Math.PI * 2); g.fill(); }
    g.rotate(-it.rot * Math.PI / 180); const s = ppu * it.scale; g.scale(s, s); blit(g, logSprite(id, level, ppu * it.scale)); g.restore();
  }
  function coinSprite(tier, ppu) {
    return build('coin:' + tier, [.5, .5], .1, quant(ppu), g => { g.translate(.25, .25); const OW = .04;
      if (tier === 0) paint(g, [{ s: ['c', 0, 0, .21], f: '#ffd86e', band: ['M-.17 -.06 A.18 .18 0 0 1 .02 -.19 L.02 -.13 A.12 .12 0 0 0 -.11 -.04 Z'], lines: ['M0 0 m-.12 0 a.12 .12 0 1 0 .24 0 a.12 .12 0 1 0 -.24 0'], spark: star4(-.08, -.09, .05) }], OW);
      else { const c = tier === 1 ? '#ffa3b6' : '#aef2ff'; paint(g, [{ s: 'M0 -.24 L.2 -.07 L0 .24 L-.2 -.07 Z', f: c, band: ['M0 -.24 L-.2 -.07 L-.08 -.07 Z'], lines: ['M-.2 -.07 L.2 -.07', 'M-.08 -.07 L0 .24 L.08 -.07'], spark: star4(-.06, -.12, .04) }], OW); } });
  }
  function coin(g, it, ppu, sxF, syF) { const px = sxF(it.x), py = syF(it.y); g.save(); g.translate(px, py); g.rotate(-it.rot * Math.PI / 180); const s = ppu * it.scale; g.scale(s, s); blit(g, coinSprite(it.tier || 0, ppu * it.scale)); g.restore(); }
  function chestSprite(ppu) {
    return build('chest', [.8, .7], .1, quant(ppu), g => { g.translate(.4, .35); const OW = .04;
      paint(g, [{ s: ['r', -.36, -.06, .72, .36, .06], f: '#dcaa7c', band: [['r', -.32, -.03, .12, .3, .03]] }, { s: 'M-.36 -.04 L-.36 -.14 C-.36 -.32 .36 -.32 .36 -.14 L.36 -.04 Z', f: '#e8b98a', sep: true },
        { s: ['r', -.36, -.07, .72, .07, .02], f: '#ffd86e', sep: true, ow: .7 }, { s: ['r', -.07, -.1, .14, .16, .04], f: '#ffd86e', sep: true, ow: .7 }, { s: ['r', -.26, -.3, .07, .6, .02], f: '#ffd86e', o: false, a: .9 }, { s: ['r', .19, -.3, .07, .6, .02], f: '#ffd86e', o: false, a: .9 }], OW);
      g.fillStyle = '#fff'; g.fill(P(star4(.22, -.2, .05))); });
  }
  function chest(g, it, ppu, sxF, syF, t) { const px = sxF(it.x), py = syF(it.y); g.save(); g.translate(px, py); g.fillStyle = rgba('#ffe08a', .2 + .08 * Math.sin(t * 5)); g.beginPath(); g.arc(0, 0, .55 * ppu * it.scale, 0, Math.PI * 2); g.fill(); g.rotate(-it.rot * Math.PI / 180); const s = ppu * it.scale; g.scale(s, s); blit(g, chestSprite(ppu * it.scale)); g.restore(); }
  function drone(g, d, ppu, sxF, syF, t) {
    const px = sxF(d.x), py = syF(d.y) - ppu * .05; g.save(); g.translate(px, py); g.scale(ppu, ppu); const OW = .035;
    g.strokeStyle = '#8a95ac'; g.lineWidth = .03; for (const s of [-1, 1]) { g.save(); g.translate(s * .36, .12); g.rotate(t * 14 * s); g.beginPath(); for (let i = 0; i < 3; i++) { const a = i * Math.PI * 2 / 3; g.moveTo(0, 0); g.lineTo(Math.cos(a) * .12, Math.sin(a) * .12); } g.stroke(); g.restore(); }
    paint(g, [{ s: ['e', 0, .05, .46, .14], f: '#aab4c8' }, { s: ['e', 0, -.04, .42, .17], f: '#e3e8f2', band: [['e', -.12, -.1, .2, .05]] }, { s: ['r', -.12, -.24, .24, .08, .04], f: '#ffd36b', sep: true, ow: .7 }], OW);
    g.fillStyle = '#4a5878'; for (const s of [-1, 1]) { g.beginPath(); g.ellipse(d.dir * .14 + s * .07, -.04, .025, .04, 0, 0, Math.PI * 2); g.fill(); }
    g.fillStyle = 'rgba(255,145,160,.5)'; for (const s of [-1, 1]) { g.beginPath(); g.ellipse(d.dir * .14 + s * .14, .0, .035, .02, 0, 0, Math.PI * 2); g.fill(); }
    g.restore();
  }
  function crate(g, c, ppu, sxF, syF) {
    const px = sxF(c.x), py = syF(c.y); g.save(); g.translate(px, py); g.scale(ppu, ppu); const OW = .035;
    g.strokeStyle = '#9aa3b8'; g.lineWidth = .025; g.beginPath(); g.moveTo(-.55, -.95); g.lineTo(-.2, -.25); g.moveTo(.55, -.95); g.lineTo(.2, -.25); g.moveTo(0, -1.2); g.lineTo(0, -.25); g.stroke();
    paint(g, [{ s: 'M-.62 -.92 C-.6 -1.5 .6 -1.5 .62 -.92 C.42 -1 .2 -.9 0 -.98 C-.2 -.9 -.42 -1 -.62 -.92 Z', f: '#ffc2d4', lines: ['M-.22 -1.36 C-.24 -1.15 -.22 -1.0 -.2 -.92', 'M.22 -1.36 C.24 -1.15 .22 -1.0 .2 -.92'] },
      { s: ['r', -.3, -.3, .6, .56, .08], f: '#dcaa7c', band: [['r', -.26, -.26, .1, .48, .03]], lines: ['M-.3 -.02 L.3 -.02'] }], OW);
    g.restore();
  }
  function platform(g, p, ppu, sxF, syF) {
    const px = sxF(p[0]), py = syF(p[1]); g.save(); g.translate(px, py); g.scale(ppu, ppu);
    paint(g, [{ s: 'M-.55 .12 L-.4 .55 L-.3 .55 L-.4 .12 Z', f: '#b98a62' }, { s: 'M.55 .12 L.4 .55 L.3 .55 L.4 .12 Z', f: '#b98a62' }, { s: ['r', -.9, -.03, 1.8, .2, .08], f: '#dcaa7c', band: [['r', -.86, -.01, 1.72, .05, .02]], lines: ['M-.3 .07 L-.3 .14', 'M.35 .03 L.35 .12'] }], .04);
    g.restore();
  }

  // ---------- 효과 ----------
  const AURA = { gold: ['#ffe08a', '#fff6c8'], frost: ['#c9f2ff', '#ffffff'], arcane: ['#e3c4ff', '#ff9de8'], magma: ['#ffb27a', '#ffe08a'], saw: ['#e8ecf4', '#ffd36b'], star: ['#fff6c8', '#a6dcff'] };
  function auraKind(axeKey) { const A = AXE[axeKey]; return A && A.aura; }
  function drawFx(g, f, ppu, sxF, syF) {
    const k = f.t / f.life;
    if (f.k === 'chip') { g.save(); g.translate(sxF(f.x), syF(f.y)); g.rotate(f.rot + f.t * f.spin); g.globalAlpha = 1 - Math.max(0, k - .6) / .4; const s = ppu * f.r; g.fillStyle = dk(f.c, .62); g.fillRect(-s * .6 - 1.5, -s * .3 - 1.5, s * 1.2 + 3, s * .6 + 3); g.fillStyle = f.c; g.fillRect(-s * .6, -s * .3, s * 1.2, s * .6); g.restore(); g.globalAlpha = 1; }
    else if (f.k === 'spark') { g.globalAlpha = 1 - k; g.fillStyle = f.c; g.fill(P(star4(sxF(f.x), syF(f.y), ppu * f.r * (1 - k * .4)))); g.globalAlpha = 1; }
    else if (f.k === 'aura') { g.globalAlpha = (1 - k) * .9; g.fillStyle = f.c; if (f.shape === 'flake') { g.save(); g.translate(sxF(f.x), syF(f.y)); g.rotate(f.t * 2); g.strokeStyle = f.c; g.lineWidth = Math.max(1, ppu * .02); g.beginPath(); for (let i = 0; i < 3; i++) { const a = i * Math.PI / 3; g.moveTo(Math.cos(a) * ppu * .08, Math.sin(a) * ppu * .08); g.lineTo(-Math.cos(a) * ppu * .08, -Math.sin(a) * ppu * .08); } g.stroke(); g.restore(); } else g.fill(P(star4(sxF(f.x), syF(f.y), ppu * f.r * (1 - k * .5)))); g.globalAlpha = 1; }
    else if (f.k === 'burst') { g.globalAlpha = 1 - k; g.strokeStyle = f.c; g.lineWidth = ppu * .08 * (1 - k); g.beginPath(); g.arc(sxF(f.x), syF(f.y), ppu * (.3 + f.R * k), 0, Math.PI * 2); g.stroke(); g.globalAlpha = 1; }
    else if (f.k === 'bolt') { g.globalAlpha = 1 - k; g.lineCap = 'round'; g.lineJoin = 'round'; g.strokeStyle = 'rgba(166,220,255,.55)'; g.lineWidth = f.w * 3 * ppu; g.beginPath(); f.pts.forEach((p, i) => i ? g.lineTo(sxF(p[0]), syF(p[1])) : g.moveTo(sxF(p[0]), syF(p[1]))); g.stroke(); g.strokeStyle = '#ffffff'; g.lineWidth = f.w * ppu; g.stroke(); g.globalAlpha = 1; }
    else if (f.k === 'ring') { g.globalAlpha = 1 - k; g.strokeStyle = '#a6dcff'; g.lineWidth = .06 * ppu; g.beginPath(); g.arc(sxF(f.x), syF(f.y), (.1 + .6 * k) * ppu, 0, Math.PI * 2); g.stroke(); g.globalAlpha = 1; }
    else if (f.k === 'ember') { g.globalAlpha = 1 - k; g.fillStyle = k < .3 ? '#ffe08a' : '#ffa36b'; g.fill(P(star4(sxF(f.x), syF(f.y), f.r * ppu * 1.3))); g.globalAlpha = 1; }
  }
  // 화면용 큰 숫자 팝업
  function popupText(g, p, ppu, sxF, syF) {
    const k = p.t / p.life, pop = p.t < .12 ? .6 + p.t / .12 * .55 : 1.15 - Math.min(.15, (p.t - .12) * 1.2);
    const a = 1 - Math.max(0, (k - .55) / .45); g.globalAlpha = a; const size = Math.round(ppu * .3 * p.scale * pop);
    g.font = `900 ${size}px 'Noto Sans KR', Jua, 'Segoe UI Emoji', 'Apple Color Emoji', 'Noto Color Emoji', sans-serif`; g.textAlign = 'center'; g.textBaseline = 'middle'; g.lineJoin = 'round';
    g.lineWidth = Math.max(3, size * .22); g.strokeStyle = p.outline || 'rgba(40,24,18,.85)'; g.strokeText(p.text, sxF(p.x), syF(p.y)); g.fillStyle = p.color; g.fillText(p.text, sxF(p.x), syF(p.y)); g.globalAlpha = 1;
  }
  return { character, preview, tree, treeFlames, background, ambient, log, coin, chest, drone, crate, platform, drawFx, popupText, auraKind, AURA, AXE_TIER, TIER_COLOR, CHAR, AXE, lt, dk, rgba, star4 };
})();
