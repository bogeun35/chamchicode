// 킵 온 마이닝 — 원작 그림체(굵은 검정 외곽선 + 면 나눈 만화풍 바위/광석, 남색 UI)를 캔버스로 흉내 낸 그림들.
// 원작 이미지는 쓰지 않음. 모든 그림은 미리 오프스크린 캔버스에 구워 두고 drawImage 로 찍는다.
(function () {
  'use strict';
  const OUT = '#14121c';
  // 광석 색 (원작 바·광석 스프라이트 색): 금·구리·철·코발트·우라늄·이스미움·이리듐·페이나이트
  const ORE = [
    { hi: '#ffe45a', mid: '#f7b51c', lo: '#d9821a', dk: '#a85a10' },
    { hi: '#e98a4c', mid: '#c25a2c', lo: '#963e1e', dk: '#6e2a14' },
    { hi: '#eef1f4', mid: '#b8bec6', lo: '#858c96', dk: '#5d636c' },
    { hi: '#b9cfe2', mid: '#6e8fb0', lo: '#4a6688', dk: '#304866' },
    { hi: '#8df07a', mid: '#3cc43a', lo: '#23902a', dk: '#16661d' },
    { hi: '#7cc4ff', mid: '#2a7ef0', lo: '#1a56c4', dk: '#103a8c' },
    { hi: '#ff8cb0', mid: '#e83a6c', lo: '#b8204e', dk: '#821434' },
    { hi: '#ff7a6a', mid: '#e3221c', lo: '#ad1414', dk: '#760c0c' },
  ];
  const ROCK = { hi: '#a7a3ad', mid: '#77737f', lo: '#57535f', dk: '#3c3944' };

  function mk(w, h) { const c = document.createElement('canvas'); c.width = Math.ceil(w); c.height = Math.ceil(h); return c; }
  function rng(seed) { let s = seed >>> 0 || 1; return () => { s ^= s << 13; s >>>= 0; s ^= s >> 17; s ^= s << 5; s >>>= 0; return s / 4294967296; }; }
  function path(g, pts) { g.beginPath(); g.moveTo(pts[0][0], pts[0][1]); for (let i = 1; i < pts.length; i++) g.lineTo(pts[i][0], pts[i][1]); g.closePath(); }
  function poly(g, pts, fill, lw, stroke) { path(g, pts); if (fill) { g.fillStyle = fill; g.fill(); } if (lw) { g.lineWidth = lw; g.strokeStyle = stroke || OUT; g.lineJoin = 'round'; g.stroke(); } }
  function lerp(a, b, t) { return [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t]; }

  // 면이 나뉜 바위 덩어리. cx,cy 중심, rx,ry 반경. 위쪽 면이 밝고 아래가 어둡다.
  function boulder(g, cx, cy, rx, ry, pal, seed, lw) {
    const r = rng(seed), n = 8 + Math.floor(r() * 3), pts = [];
    for (let i = 0; i < n; i++) {
      const a = -Math.PI / 2 + i / n * Math.PI * 2 + (r() - .5) * .35, k = .84 + r() * .2;
      pts.push([cx + Math.cos(a) * rx * k, cy + Math.sin(a) * ry * k * (Math.sin(a) > 0 ? .92 : 1.05)]);
    }
    poly(g, pts, pal.lo);
    // 윗면(밝은 면): 위쪽 점들 + 가운데 능선
    const ridge = [cx + (r() - .5) * rx * .3, cy - ry * (.05 + r() * .15)];
    const top = pts.filter(p => p[1] < cy + ry * .05);
    if (top.length >= 2) {
      top.sort((a, b) => Math.atan2(a[1] - cy, a[0] - cx) - Math.atan2(b[1] - cy, b[0] - cx));
      poly(g, [...top, ridge], pal.mid);
      // 하이라이트 조각
      const i0 = Math.floor(top.length / 2) - 1;
      if (top[i0] && top[i0 + 1]) poly(g, [top[i0], top[i0 + 1], lerp(top[i0 + 1], ridge, .55), lerp(top[i0], ridge, .45)], pal.hi);
    }
    // 아래 그늘 조각
    const bot = pts.filter(p => p[1] > cy + ry * .25);
    if (bot.length >= 2) { bot.sort((a, b) => a[0] - b[0]); poly(g, [bot[0], ...bot, [cx + rx * .2, cy + ry * .45]], pal.dk); }
    // 면 경계선
    g.lineWidth = lw * .45; g.strokeStyle = OUT; g.lineCap = 'round';
    for (const p of top) { if (r() < .55) { g.beginPath(); g.moveTo(p[0], p[1]); g.lineTo(ridge[0], ridge[1]); g.stroke(); } }
    g.beginPath(); g.moveTo(pts[Math.floor(n * .3)][0], pts[Math.floor(n * .3)][1]); g.lineTo(ridge[0], ridge[1]); g.lineTo(pts[Math.floor(n * .75)][0], pts[Math.floor(n * .75)][1]); g.stroke();
    poly(g, pts, null, lw);
    return pts;
  }
  // 반짝이는 광석 조각(작은 결정)
  function crystal(g, x, y, s, pal, rot, lw) {
    g.save(); g.translate(x, y); g.rotate(rot);
    const p = [[0, -s], [s * .62, -s * .25], [s * .45, s * .7], [-s * .4, s * .75], [-s * .65, -s * .15]];
    poly(g, p, pal.mid);
    poly(g, [p[0], p[1], [s * .05, s * .05], p[4]], pal.hi);
    poly(g, [[s * .05, s * .05], p[2], p[3]], pal.lo);
    poly(g, p, null, lw);
    g.restore();
  }
  function shadow(g, cx, cy, rx, ry, a) { g.save(); g.fillStyle = `rgba(20,30,10,${a || .28})`; g.beginPath(); g.ellipse(cx, cy, rx, ry, 0, 0, Math.PI * 2); g.fill(); g.restore(); }

  // ── 바위 스프라이트 (128×110 캔버스, 중심 64,58) ──
  const RW = 128, RH = 112;
  function rockSprite(kind, ore, variant) {
    // kind: 'normal' | 'chunk' | 'full' ; broken 은 쪼개진 버전
    const c = mk(RW, RH), g = c.getContext('2d'), seed = 1000 + variant * 77 + (ore + 1) * 13;
    shadow(g, 64, 92, 46, 12);
    const pal = kind === 'full' ? ORE[ore] : ROCK;
    boulder(g, 64, 58, 50, 40, pal, seed, 6);
    if (kind === 'chunk') {
      const r = rng(seed + 5), op = ORE[ore];
      const spots = [[40, 48], [78, 40], [62, 70], [88, 66], [46, 74]];
      for (let i = 0; i < 4; i++) { const s = spots[(i + variant) % spots.length]; crystal(g, s[0] + (r() - .5) * 6, s[1] + (r() - .5) * 6, 9 + r() * 4, op, r() * 6, 3.4); }
    }
    return c;
  }
  function brokenSprite(kind, ore, variant) {
    const c = mk(RW, RH), g = c.getContext('2d'), seed = 3000 + variant * 31 + (ore + 1) * 17;
    shadow(g, 64, 94, 50, 12);
    const pal = kind === 'full' ? ORE[ore] : ROCK;
    boulder(g, 44, 66, 30, 25, pal, seed, 5.5);
    boulder(g, 84, 62, 28, 24, pal, seed + 9, 5.5);
    boulder(g, 64, 82, 22, 15, pal, seed + 19, 5);
    boulder(g, 30, 86, 12, 9, pal, seed + 29, 4);
    if (kind === 'chunk') { const op = ORE[ore]; crystal(g, 50, 60, 9, op, .4, 3.2); crystal(g, 86, 56, 8, op, 1.4, 3.2); }
    return c;
  }
  function chestSprite(golden, open) {
    const c = mk(RW, RH), g = c.getContext('2d');
    shadow(g, 64, 96, 46, 11);
    const wood = golden ? ['#ffe17a', '#f2b322', '#c4800f'] : ['#c98a4b', '#9b6230', '#6e4220'];
    const band = golden ? '#fff6c4' : '#8b95a3';
    // 몸통
    poly(g, [[22, 54], [106, 54], [102, 94], [26, 94]], wood[1], 5);
    poly(g, [[22, 54], [106, 54], [104, 62], [24, 62]], wood[0]);
    if (!open) {
      poly(g, [[20, 54], [108, 54], [100, 26], [28, 26]], wood[0], 5);
      poly(g, [[28, 26], [100, 26], [104, 40], [24, 40]], wood[1]);
      poly(g, [[20, 54], [108, 54], [100, 26], [28, 26]], null, 5);
    } else {
      poly(g, [[24, 52], [104, 52], [96, 34], [32, 34]], '#2a1c10', 4);
      poly(g, [[30, 34], [98, 34], [104, 8], [24, 8]], wood[0], 5);
      for (let i = 0; i < 6; i++) crystal(g, 40 + i * 10, 46 - (i % 2) * 4, 7, ORE[i % 3 === 0 ? 0 : i % 8], i, 2.5);
    }
    for (const x of [34, 94]) poly(g, [[x - 5, open ? 54 : 26], [x + 5, open ? 54 : 26], [x + 5, 94], [x - 5, 94]], band, 3);
    poly(g, [[58, 52], [70, 52], [70, 68], [58, 68]], golden ? '#ff9f1a' : '#d9c35a', 3.5);
    return c;
  }

  // ── 광석 아이콘(날아가는 팝업·HUD) / 바 아이콘 ──
  function oreIcon(ore, size) {
    const S = size || 64, c = mk(S, S), g = c.getContext('2d'), k = S / 64;
    g.scale(k, k);
    const pal = ORE[ore];
    crystal(g, 24, 36, 15, pal, -.3, 3.6); crystal(g, 42, 30, 13, pal, .5, 3.4); crystal(g, 36, 46, 10, pal, 1.2, 3.2);
    return c;
  }
  function barIcon(ore, size) {
    const S = size || 64, c = mk(S, S), g = c.getContext('2d'), k = S / 64; g.scale(k, k);
    const p = ORE[ore];
    const top = [[12, 30], [40, 18], [56, 26], [28, 38]], front = [[12, 30], [28, 38], [28, 50], [10, 42]], side = [[28, 38], [56, 26], [54, 38], [28, 50]];
    poly(g, side, p.lo); poly(g, front, p.mid); poly(g, top, p.hi);
    poly(g, [[18, 30], [38, 21], [44, 24], [24, 33]], 'rgba(255,255,255,.55)');
    poly(g, [[12, 30], [40, 18], [56, 26], [54, 38], [28, 50], [10, 42]], null, 3.4);
    g.lineWidth = 2; g.strokeStyle = OUT; g.beginPath(); g.moveTo(12, 30); g.lineTo(28, 38); g.lineTo(56, 26); g.moveTo(28, 38); g.lineTo(28, 50); g.stroke();
    return c;
  }

  // ── 잔디 타일 (원작 FullGrass: 초록 윗면 + 흙 옆면) ──
  function tileSprite(w, h, depth) {
    const c = mk(w + 8, h + depth + 8), g = c.getContext('2d'), cx = (w + 8) / 2, cy = h / 2 + 4;
    const T = [[cx, cy - h / 2], [cx + w / 2, cy], [cx, cy + h / 2], [cx - w / 2, cy]];
    poly(g, [T[3], T[2], [T[2][0], T[2][1] + depth], [T[3][0], T[3][1] + depth]], '#a5622a');
    poly(g, [T[2], T[1], [T[1][0], T[1][1] + depth], [T[2][0], T[2][1] + depth]], '#7f4620');
    poly(g, T, '#5cb82a');
    // 잎 무늬
    const r = rng(7);
    g.fillStyle = '#74cf3a';
    for (let i = 0; i < 9; i++) {
      const u = r() * .8 + .1, v = r() * .8 + .1, x = cx + (u - v) * w / 2, y = cy - h / 2 + (u + v) * h / 2;
      g.beginPath(); g.moveTo(x - 6, y + 2); g.lineTo(x - 2, y - 4); g.lineTo(x, y + 1); g.lineTo(x + 3, y - 5); g.lineTo(x + 6, y + 2); g.closePath(); g.fill();
    }
    g.fillStyle = '#479a1e';
    for (let i = 0; i < 5; i++) { const u = r() * .8 + .1, v = r() * .8 + .1, x = cx + (u - v) * w / 2, y = cy - h / 2 + (u + v) * h / 2; g.beginPath(); g.ellipse(x, y, 5, 2.4, 0, 0, Math.PI * 2); g.fill(); }
    // 잔디 끝단 톱니
    g.fillStyle = '#5cb82a';
    for (let i = 0; i < 6; i++) { const t = (i + .5) / 6, x = T[3][0] + (T[2][0] - T[3][0]) * t, y = T[3][1] + (T[2][1] - T[3][1]) * t; g.beginPath(); g.moveTo(x - 6, y - 1); g.lineTo(x, y + 6); g.lineTo(x + 6, y - 1); g.fill(); }
    for (let i = 0; i < 6; i++) { const t = (i + .5) / 6, x = T[2][0] + (T[1][0] - T[2][0]) * t, y = T[2][1] + (T[1][1] - T[2][1]) * t; g.beginPath(); g.moveTo(x - 6, y - 1); g.lineTo(x, y + 6); g.lineTo(x + 6, y - 1); g.fill(); }
    g.lineWidth = 2.5; g.strokeStyle = 'rgba(30,60,10,.55)';
    path(g, T); g.stroke();
    return { c, ox: cx, oy: cy };
  }

  // ── 곡괭이 14종 (원작 순서: 미스터 러스티 … 다이아몬드) ──
  const PICK = [
    { head: ['#c9c4bb', '#8f8a82', '#5f5b55'], shaft: '#8a5a2c', grip: '#d8d0c0' },   // 1 미스터 러스티
    { head: ['#ffe45a', '#f2b11c', '#c27d10'], shaft: '#7a4a22', grip: '#e0d6c4' },   // 2 서 골디
    { head: ['#ffe45a', '#f2b11c', '#c27d10'], shaft: '#c0282c', grip: '#ffd94a' },   // 3 로얄-픽
    { head: ['#d58a52', '#a65a2a', '#743a18'], shaft: '#6a4222', grip: '#c8c0b0' },   // 4 올드 리라이어블
    { head: ['#ffe45a', '#f2b11c', '#c27d10'], shaft: '#9aa2ac', grip: '#ffd94a' },   // 5 오풀랙스
    { head: ['#b9cfe2', '#6e8fb0', '#4a6688'], shaft: '#e0a92a', grip: '#3a4a5c' },   // 6 스톤스플리터
    { head: ['#fff07a', '#f5c21c', '#c48a10'], shaft: '#9aa2ac', grip: '#c0282c' },   // 7 대거-픽
    { head: ['#8df07a', '#3cc43a', '#23902a'], shaft: '#2a5a8c', grip: '#3cc43a' },   // 8 우라늄 열풍
    { head: ['#7cc4ff', '#2a7ef0', '#1a56c4'], shaft: '#3cc43a', grip: '#ffd94a' },   // 9 포지본
    { head: ['#ff8cb0', '#e83a6c', '#b8204e'], shaft: '#c0282c', grip: '#ffd94a' },   // 10 크림슨 소버린
    { head: ['#8df07a', '#2fb84a', '#1a8a34'], shaft: '#2a6ab0', grip: '#8df07a' },   // 11 젬커터
    { head: ['#ff6a6a', '#e3221c', '#ad1414'], shaft: '#ffd94a', grip: '#c0282c' },   // 12 왕의 동료
    { head: ['#ff7a5a', '#e0301c', '#a31a10'], shaft: '#9aa2ac', grip: '#e0301c' },   // 13 더 크러셔
    { head: ['#e8ffff', '#7ff0ff', '#2ab8e0'], shaft: '#6a4222', grip: '#d8d0c0' },   // 14 다이아몬드
  ];
  function pickSprite(i, hammer) {
    const S = 96, c = mk(S, S), g = c.getContext('2d'), p = PICK[i] || PICK[0];
    g.translate(48, 50); g.rotate(-.12);
    // 자루
    poly(g, [[-5, -30], [5, -30], [6, 40], [-6, 40]], p.shaft, 4.5);
    poly(g, [[-6, 22], [6, 22], [7, 40], [-7, 40]], p.grip, 3.5);
    if (hammer) {
      poly(g, [[-30, -44], [30, -44], [30, -18], [-30, -18]], '#8f8a82', 5);
      poly(g, [[-30, -44], [30, -44], [30, -36], [-30, -36]], '#c9c4bb');
      poly(g, [[-30, -44], [30, -44], [30, -18], [-30, -18]], null, 5);
      poly(g, [[-8, -46], [8, -46], [8, -16], [-8, -16]], '#e0a92a', 4);
      return c;
    }
    // 머리(초승달 곡괭이 날)
    const H = [[-44, -6], [-30, -30], [0, -40], [30, -30], [44, -6], [26, -22], [0, -28], [-26, -22]];
    poly(g, H, p.head[1]);
    poly(g, [[-30, -30], [0, -40], [30, -30], [0, -33]], p.head[0]);
    poly(g, [[26, -22], [44, -6], [30, -30]], p.head[2]);
    poly(g, [[-26, -22], [-44, -6], [-30, -30]], p.head[2]);
    poly(g, H, null, 4.5);
    poly(g, [[-8, -40], [8, -40], [9, -22], [-9, -22]], p.grip, 4);
    if (i === 6 || i === 12) { for (const x of [-18, 0, 18]) poly(g, [[x - 5, -36], [x, -50], [x + 5, -36]], p.head[1], 3); }
    return c;
  }

  // ── 아이콘 모음 (UI 용, 64×64) ──
  function icon(draw, size) { const S = size || 64, c = mk(S, S), g = c.getContext('2d'); g.scale(S / 64, S / 64); draw(g); return c; }
  function bolt(g, col, x, y, k) {
    k = k || 1; g.save(); g.translate(x, y); g.scale(k, k);
    poly(g, [[6, -26], [-12, 4], [0, 4], [-6, 26], [14, -6], [2, -6], [10, -26]], col, 3.6); g.restore();
  }
  function txt(g, s, x, y, size, fill) {
    g.font = `${size}px Jua, 'Malgun Gothic', sans-serif`; g.textAlign = 'center'; g.textBaseline = 'middle';
    g.lineWidth = Math.max(3, size / 5); g.strokeStyle = OUT; g.lineJoin = 'round'; g.strokeText(s, x, y); g.fillStyle = fill || '#fff'; g.fillText(s, x, y);
  }
  const ICONS = {
    rock: () => icon(g => boulder(g, 32, 34, 24, 19, ROCK, 11, 3.5)),
    rockPlus: () => icon(g => { boulder(g, 30, 36, 22, 17, ROCK, 11, 3.5); txt(g, '+', 48, 16, 30, '#7dff6a'); }),
    oreRock: o => icon(g => boulder(g, 32, 34, 24, 19, ORE[o], 21 + o, 3.5)),
    oreChunk: o => icon(g => { boulder(g, 32, 36, 24, 18, ROCK, 31, 3.5); crystal(g, 24, 30, 8, ORE[o], .3, 2.6); crystal(g, 40, 36, 7, ORE[o], 1.3, 2.6); }),
    oreSpawn: o => icon(g => { boulder(g, 30, 36, 22, 18, ORE[o], 41 + o, 3.5); txt(g, '!', 50, 16, 30, '#fff27a'); }),
    bar: o => barIcon(o, 64),
    ore: o => oreIcon(o, 64),
    xp: () => icon(g => { g.beginPath(); g.arc(32, 32, 22, 0, Math.PI * 2); g.fillStyle = '#8a4ae0'; g.fill(); g.lineWidth = 4; g.strokeStyle = OUT; g.stroke(); txt(g, 'XP', 32, 34, 22, '#fff'); }),
    talent: () => icon(g => { poly(g, [[32, 6], [39, 23], [58, 24], [43, 36], [48, 55], [32, 44], [16, 55], [21, 36], [6, 24], [25, 23]], '#c47aff', 3.6); }),
    boltS: () => icon(g => bolt(g, '#5ad2ff', 32, 32, 1.05)),
    boltPH: () => icon(g => { g.drawImage(pickSprite(0), 4, 10, 44, 44); bolt(g, '#ff5a5a', 42, 26, .7); }),
    bolt2: () => icon(g => { bolt(g, '#5ad2ff', 24, 32, .8); bolt(g, '#5ad2ff', 42, 30, .8); }),
    boltTime: () => icon(g => { hourglass(g, 22, 34, .7); bolt(g, '#5ad2ff', 42, 30, .75); }),
    boltRock: () => icon(g => { boulder(g, 24, 40, 16, 13, ROCK, 5, 3); bolt(g, '#5ad2ff', 42, 28, .75); }),
    boltBoom: () => icon(g => { boom(g, 24, 36, .7); bolt(g, '#5ad2ff', 44, 28, .7); }),
    spark: () => icon(g => { g.strokeStyle = '#7fe8ff'; g.lineWidth = 5; for (let i = 0; i < 5; i++) { g.save(); g.translate(32, 32); g.rotate(i * 1.25); g.beginPath(); g.moveTo(4, 0); g.lineTo(12, 5); g.lineTo(18, -3); g.lineTo(26, 3); g.stroke(); g.restore(); } }),
    boltDmg: () => icon(g => { bolt(g, '#5ad2ff', 26, 32, .95); txt(g, '+', 48, 16, 28, '#ff6a6a'); }),
    boltSize: () => icon(g => { bolt(g, '#5ad2ff', 30, 34, 1.15); txt(g, '↑', 50, 14, 24, '#7dff6a'); }),
    dyn: () => icon(g => dynamite(g, 32, 34, 1)),
    dynBoom: () => icon(g => { boom(g, 26, 36, .7); boom(g, 44, 26, .5); }),
    dynRock: () => icon(g => { boulder(g, 24, 40, 16, 13, ROCK, 5, 3); dynamite(g, 44, 28, .6); }),
    dynTime: () => icon(g => { hourglass(g, 22, 34, .7); dynamite(g, 44, 30, .6); }),
    dynBolt: () => icon(g => { dynamite(g, 22, 34, .65); bolt(g, '#5ad2ff', 44, 30, .7); }),
    dynDmg: () => icon(g => { dynamite(g, 28, 34, .9); txt(g, '+', 50, 16, 28, '#ff6a6a'); }),
    dynSize: () => icon(g => { boom(g, 30, 34, 1); txt(g, '↑', 52, 14, 24, '#7dff6a'); }),
    plasma: () => icon(g => orb(g, 32, 32, 20)),
    plasmaTime: () => icon(g => { orb(g, 26, 34, 15); hourglass(g, 46, 24, .55); }),
    plasmaSize: () => icon(g => { orb(g, 30, 34, 20); txt(g, '↑', 52, 14, 24, '#7dff6a'); }),
    plasmaDmg: () => icon(g => { orb(g, 28, 34, 18); txt(g, '+', 50, 16, 28, '#ff6a6a'); }),
    plasmaBoom: () => icon(g => { orb(g, 24, 38, 14); boom(g, 42, 26, .55); }),
    plasmaSmall: () => icon(g => { orb(g, 24, 36, 16); orb(g, 46, 24, 9); }),
    plasmaPick: () => icon(g => { orb(g, 24, 38, 14); g.drawImage(pickSprite(0), 28, 4, 34, 34); }),
    mats: () => icon(g => { boulder(g, 26, 40, 18, 14, ROCK, 9, 3); crystal(g, 44, 24, 9, ORE[0], .3, 2.6); crystal(g, 50, 36, 7, ORE[0], 1, 2.4); }),
    worth: () => icon(g => { g.drawImage(barIcon(0, 52), 2, 18); g.drawImage(barIcon(0, 52), 12, 6); }),
    pickUp: () => icon(g => { g.drawImage(pickSprite(0), 0, 4, 54, 54); txt(g, '↑', 50, 14, 26, '#7dff6a'); }),
    area: () => icon(g => { g.beginPath(); g.arc(32, 32, 22, 0, Math.PI * 2); g.lineWidth = 8; g.strokeStyle = OUT; g.stroke(); g.lineWidth = 4; g.strokeStyle = '#fff'; g.stroke(); txt(g, '+', 32, 34, 24, '#7dff6a'); }),
    circleShot: () => icon(g => { g.lineWidth = 4; g.strokeStyle = '#fff'; g.beginPath(); g.arc(24, 38, 13, 0, Math.PI * 2); g.stroke(); g.beginPath(); g.arc(46, 22, 9, 0, Math.PI * 2); g.stroke(); txt(g, '→', 40, 44, 18, '#ffe45a'); }),
    inOut: () => icon(g => { g.lineWidth = 4; g.strokeStyle = '#fff'; g.beginPath(); g.arc(32, 32, 24, 0, Math.PI * 2); g.stroke(); g.setLineDash([4, 4]); g.beginPath(); g.arc(32, 32, 14, 0, Math.PI * 2); g.stroke(); g.setLineDash([]); }),
    rockEvery: () => icon(g => { boulder(g, 22, 40, 14, 11, ROCK, 3, 3); boulder(g, 42, 26, 14, 11, ROCK, 4, 3); txt(g, '→', 33, 44, 16, '#ffe45a'); }),
    rockTime: () => icon(g => { boulder(g, 24, 40, 17, 13, ROCK, 6, 3); hourglass(g, 46, 24, .55); }),
    rockChance: () => icon(g => { boulder(g, 26, 38, 18, 14, ROCK, 7, 3); txt(g, '%', 48, 18, 24, '#7dff6a'); }),
    randomRock: () => icon(g => { boulder(g, 24, 42, 16, 12, ROCK, 8, 3); g.drawImage(pickSprite(0), 24, 2, 38, 38); txt(g, '?', 14, 14, 20, '#ffe45a'); }),
    autoPick: () => icon(g => { g.drawImage(pickSprite(0), 4, 6, 50, 50); hourglass(g, 50, 46, .45); }),
    time: () => icon(g => hourglass(g, 32, 32, 1)),
    sec: () => icon(g => { hourglass(g, 24, 34, .75); txt(g, '+1', 46, 22, 20, '#7dff6a'); }),
    rockSec: () => icon(g => { boulder(g, 24, 40, 16, 12, ROCK, 2, 3); txt(g, '+1', 44, 20, 20, '#7dff6a'); }),
    x2: () => icon(g => { g.beginPath(); g.arc(32, 32, 24, 0, Math.PI * 2); g.fillStyle = '#ffb81c'; g.fill(); g.lineWidth = 4; g.strokeStyle = OUT; g.stroke(); txt(g, 'x2', 32, 34, 24, '#fff'); }),
    pick2x: () => icon(g => { g.drawImage(pickSprite(0), 0, 8, 52, 52); txt(g, 'x2', 46, 16, 20, '#ffe45a'); }),
    insta: () => icon(g => { g.drawImage(pickSprite(0), 2, 8, 52, 52); bolt(g, '#ffe45a', 46, 22, .6); }),
    trouble: () => icon(g => { bolt(g, '#5ad2ff', 18, 30, .6); dynamite(g, 34, 34, .5); orb(g, 50, 30, 9); txt(g, 'x2', 34, 54, 16, '#ffe45a'); }),
    trigger: () => icon(g => { bolt(g, '#5ad2ff', 18, 30, .6); dynamite(g, 34, 34, .5); orb(g, 50, 30, 9); txt(g, '%', 34, 54, 18, '#7dff6a'); }),
    allRocks: () => icon(g => { for (let i = 0; i < 4; i++) crystal(g, 16 + i * 11, 34 + (i % 2) * 8, 9, ORE[i * 2], i, 2.6); txt(g, '+', 52, 14, 22, '#7dff6a'); }),
    craft2: () => icon(g => { g.drawImage(oreIcon(0, 34), 0, 22); g.drawImage(oreIcon(0, 34), 10, 30); txt(g, '→', 36, 40, 16, '#fff'); g.drawImage(barIcon(0, 30), 34, 22); }),
    bigRock: () => icon(g => { boulder(g, 32, 36, 28, 22, ROCK, 99, 3.6); crystal(g, 30, 30, 8, { hi: '#e8ffff', mid: '#7ff0ff', lo: '#2ab8e0' }, .3, 2.5); }),
    lock: () => icon(g => { g.lineWidth = 7; g.strokeStyle = OUT; g.beginPath(); g.arc(32, 26, 11, Math.PI, 0); g.stroke(); g.lineWidth = 4; g.strokeStyle = '#9aa2ac'; g.stroke(); poly(g, [[16, 26], [48, 26], [48, 52], [16, 52]], '#9aa2ac', 4); g.fillStyle = OUT; g.beginPath(); g.arc(32, 37, 4, 0, Math.PI * 2); g.fill(); }),
  };
  function hourglass(g, x, y, k) {
    g.save(); g.translate(x, y); g.scale(k, k);
    poly(g, [[-16, -24], [16, -24], [16, -18], [-16, -18]], '#b07a3c', 3);
    poly(g, [[-16, 24], [16, 24], [16, 18], [-16, 18]], '#b07a3c', 3);
    poly(g, [[-12, -18], [12, -18], [3, 0], [12, 18], [-12, 18], [-3, 0]], '#d8f2ff', 3);
    poly(g, [[-8, 16], [8, 16], [0, 4]], '#ffcf4a'); poly(g, [[-7, -14], [7, -14], [0, -4]], '#ffcf4a');
    g.restore();
  }
  function dynamite(g, x, y, k) {
    g.save(); g.translate(x, y); g.scale(k, k); g.rotate(-.45);
    poly(g, [[-9, -20], [9, -20], [9, 22], [-9, 22]], '#d8262a', 4);
    poly(g, [[-9, -20], [9, -20], [9, -14], [-9, -14]], '#f2f2f2', 2.5);
    g.lineWidth = 3; g.strokeStyle = '#3a2a1a'; g.beginPath(); g.moveTo(0, -20); g.quadraticCurveTo(8, -30, 2, -34); g.stroke();
    g.fillStyle = '#ffd94a'; g.beginPath(); g.arc(2, -35, 4, 0, Math.PI * 2); g.fill();
    g.restore();
  }
  function boom(g, x, y, k) {
    g.save(); g.translate(x, y); g.scale(k, k);
    const p = []; for (let i = 0; i < 16; i++) { const a = i / 16 * Math.PI * 2, r = i % 2 ? 14 : 26; p.push([Math.cos(a) * r, Math.sin(a) * r]); }
    poly(g, p, '#ff8a1c', 3.5); const q = p.map(v => [v[0] * .55, v[1] * .55]); poly(g, q, '#ffe45a'); g.restore();
  }
  function orb(g, x, y, r) {
    const gr = g.createRadialGradient(x - r * .3, y - r * .3, 1, x, y, r);
    gr.addColorStop(0, '#ffd6ff'); gr.addColorStop(.45, '#c45cff'); gr.addColorStop(1, '#5a18b0');
    g.beginPath(); g.arc(x, y, r, 0, Math.PI * 2); g.fillStyle = gr; g.fill(); g.lineWidth = 3.5; g.strokeStyle = OUT; g.stroke();
  }

  // ── 특성 카드 그림 (20장) ──
  function potion(g, x, y, col, k) {
    g.save(); g.translate(x, y); g.scale(k || 1, k || 1);
    g.beginPath(); g.arc(0, 8, 18, 0, Math.PI * 2); g.fillStyle = col; g.fill(); g.lineWidth = 4; g.strokeStyle = OUT; g.stroke();
    poly(g, [[-7, -20], [7, -20], [7, -8], [-7, -8]], '#e8f4ff', 3.5); poly(g, [[-8, -26], [8, -26], [8, -19], [-8, -19]], '#c47a3a', 3.5);
    g.fillStyle = 'rgba(255,255,255,.6)'; g.beginPath(); g.arc(-7, 2, 4, 0, Math.PI * 2); g.fill(); g.restore();
  }
  const TALENT_ART = [
    null,
    g => potion(g, 32, 34, '#ff9f1a'),                                                                    // 1 포션 드링커
    g => { potion(g, 18, 36, '#3cc43a', .62); potion(g, 32, 28, '#c45cff', .62); potion(g, 46, 36, '#e3221c', .62); }, // 2 폭음자
    g => g.drawImage(chestSprite(false, false), 0, 6, 64, 56),                                           // 3 보물상자
    g => g.drawImage(chestSprite(true, false), 0, 6, 64, 56),                                            // 4 황금 상자
    g => { mineHouse(g, 32, 34, .62); },                                                                  // 5 숙련된 광부들
    g => { poly(g, [[28, 22], [36, 22], [36, 56], [28, 56]], '#9b6230', 3.5); poly(g, [[8, 10], [54, 14], [52, 32], [10, 28]], '#c98a4b', 4); }, // 6 표지판
    g => { anvil(g, 32, 38, .7); },                                                                       // 7 대장장이
    g => { poly(g, [[8, 20], [36, 8], [56, 30], [28, 54]], '#5ab0ff', 4); txt(g, '%', 34, 32, 26, '#fff'); }, // 8 스팀 세일
    g => { g.lineWidth = 5; g.strokeStyle = OUT; g.beginPath(); g.arc(32, 32, 24, 0, Math.PI * 2); g.stroke(); g.lineWidth = 3; g.strokeStyle = '#fff'; g.stroke(); txt(g, '↔', 32, 34, 28, '#ffe45a'); }, // 9 확장 폭발
    g => g.drawImage(pickSprite(0, true), 0, 2, 62, 62),                                                // 10 망치
    g => { hand(g, 32, 34, '#ffd23c'); },                                                                 // 11 마이더스
    g => { bolt(g, '#ffe45a', 22, 32, .8); bolt(g, '#5ad2ff', 42, 32, .8); },                             // 12 제우스
    g => { g.lineWidth = 4; g.strokeStyle = '#fff'; g.strokeRect(8, 8, 22, 22); g.beginPath(); g.arc(44, 20, 11, 0, Math.PI * 2); g.stroke(); const h = []; for (let i = 0; i < 6; i++) h.push([22 + Math.cos(i / 6 * Math.PI * 2) * 12, 46 + Math.sin(i / 6 * Math.PI * 2) * 12]); path(g, h); g.stroke(); }, // 13 형태 변환
    g => { poly(g, [[6, 12], [58, 8], [56, 54], [8, 56]], '#e8d29a', 3.5); txt(g, 'X', 34, 32, 30, '#e3221c'); }, // 14 X 표시
    g => { g.beginPath(); g.arc(32, 32, 22, 0, Math.PI * 2); g.fillStyle = '#e8d29a'; g.fill(); g.lineWidth = 4; g.strokeStyle = OUT; g.stroke(); poly(g, [[32, 12], [38, 32], [32, 52], [26, 32]], '#e3221c', 2.5); }, // 15 탐험가
    g => { g.save(); g.translate(32, 32); g.rotate(.7); poly(g, [[-5, -26], [5, -26], [5, 8], [-5, 8]], '#9b6230', 3.5); poly(g, [[-10, 8], [10, 8], [8, 26], [-8, 26]], '#e8d29a', 3.5); g.restore(); }, // 16 고고학자
    g => { poly(g, [[18, 8], [46, 8], [48, 56], [16, 56]], '#3cc43a', 4); bolt(g, '#ffe45a', 32, 32, .7); }, // 17 에너지 드링커
    g => { flower(g, 22, 30, 0, 1); flower(g, 42, 40, 1, 1); },                                         // 18 봄 시즌
    g => { campfire(g, 32, 44, .7); g.drawImage(flameSprite(0), 18, 2, 28, 36); },                         // 19 캠퍼
    g => { const h = []; for (let i = 0; i < 6; i++) h.push([32 + Math.cos(i / 6 * Math.PI * 2 + .5) * 26, 32 + Math.sin(i / 6 * Math.PI * 2 + .5) * 26]); poly(g, h, '#e3221c', 4); txt(g, '100', 32, 34, 18, '#fff'); }, // 20 D100
  ];
  function hand(g, x, y, col) {
    g.save(); g.translate(x, y);
    poly(g, [[-8, 26], [-14, 0], [-14, -12], [-8, -12], [-6, -2], [-4, -26], [2, -26], [3, -6], [5, -24], [11, -24], [11, -4], [14, -18], [19, -16], [17, 12], [10, 26]], col, 3.8);
    g.restore();
  }
  function anvil(g, x, y, k) {
    g.save(); g.translate(x, y); g.scale(k, k);
    poly(g, [[-36, -18], [30, -18], [44, -26], [44, -12], [20, -2], [14, 10], [24, 24], [-24, 24], [-14, 10], [-20, -2], [-36, -8]], '#6a6e78', 4.5);
    poly(g, [[-36, -18], [30, -18], [44, -26], [36, -18], [-30, -14]], '#a2a6b0');
    g.restore();
  }
  function mineHouse(g, x, y, k) {
    g.save(); g.translate(x, y); g.scale(k, k);
    boulder(g, 0, 0, 46, 38, ROCK, 55, 5);
    poly(g, [[-18, 30], [-18, -4], [0, -16], [18, -4], [18, 30]], '#2a1c10', 4);
    poly(g, [[-22, -4], [0, -20], [22, -4], [18, 0], [0, -12], [-18, 0]], '#9b6230', 3.5);
    poly(g, [[-20, -2], [-14, -2], [-14, 30], [-20, 30]], '#9b6230', 3); poly(g, [[14, -2], [20, -2], [20, 30], [14, 30]], '#9b6230', 3);
    g.restore();
  }
  function flower(g, x, y, kind, k) {
    g.save(); g.translate(x, y); g.scale(k, k);
    const col = ['#ffffff', '#ff7a6a', '#ffe45a', '#c47aff'][kind % 4];
    for (let i = 0; i < 5; i++) { const a = i / 5 * Math.PI * 2; g.beginPath(); g.ellipse(Math.cos(a) * 8, Math.sin(a) * 8, 7, 5, a, 0, Math.PI * 2); g.fillStyle = col; g.fill(); g.lineWidth = 2.5; g.strokeStyle = OUT; g.stroke(); }
    g.beginPath(); g.arc(0, 0, 5, 0, Math.PI * 2); g.fillStyle = '#ffb81c'; g.fill(); g.lineWidth = 2.5; g.stroke();
    g.restore();
  }
  function campfire(g, x, y, k) {
    g.save(); g.translate(x, y); g.scale(k, k);
    for (const [a, c] of [[-.4, '#7a4520'], [.4, '#9b6230'], [0, '#6a3a18']]) { g.save(); g.rotate(a); poly(g, [[-30, 10], [30, 10], [30, 22], [-30, 22]], c, 3.5); g.restore(); }
    for (let i = 0; i < 7; i++) { const a = i / 7 * Math.PI * 2; boulder(g, Math.cos(a) * 34, 18 + Math.sin(a) * 10, 9, 7, ROCK, 70 + i, 2.6); }
    g.restore();
  }
  function flameSprite(f) {   // 모닥불 불꽃 4프레임
    const c = mk(64, 80), g = c.getContext('2d');
    const w = [1, .9, 1.08, .95][f], h = [1, 1.12, .92, 1.05][f];
    g.translate(32, 70); g.scale(w, h);
    poly(g, [[-20, 0], [-22, -24], [-8, -40], [-4, -58], [8, -42], [18, -50], [22, -20], [20, 0]], '#ff6a1c', 3.5);
    poly(g, [[-11, 0], [-12, -18], [-2, -30], [6, -24], [12, -32], [12, -10], [10, 0]], '#ffd94a');
    return c;
  }

  // ── 유물 14종 (원작 순서) ──
  const ARTI_ART = [
    g => { g.save(); g.translate(32, 32); g.rotate(-.5); poly(g, [[-6, 22], [6, 22], [10, 4], [8, -14], [0, -28], [-4, -12], [-8, 6]], '#efe6d2', 4); poly(g, [[-7, 22], [7, 22], [8, 14], [-8, 14]], '#9b6230', 3); g.restore(); }, // 황소 뿔
    g => { poly(g, [[14, 14], [50, 10], [54, 50], [10, 54]], '#c45a1c', 4.5); for (let i = 0; i < 3; i++) for (let j = 0; j < 3; j++) poly(g, [[18 + i * 11, 18 + j * 11], [26 + i * 11, 18 + j * 11], [26 + i * 11, 26 + j * 11], [18 + i * 11, 26 + j * 11]], '#ffb81c', 2); }, // 고대 장치
    g => { g.save(); g.translate(32, 32); g.rotate(-.7); poly(g, [[-5, -18], [5, -18], [5, 18], [-5, 18]], '#efe6d2', 3.5); for (const s of [-1, 1]) { g.beginPath(); g.arc(-7, s * 20, 7, 0, Math.PI * 2); g.arc(7, s * 20, 7, 0, Math.PI * 2); g.fillStyle = '#efe6d2'; g.fill(); g.lineWidth = 3.5; g.strokeStyle = OUT; g.stroke(); } g.restore(); }, // 화석 뼈
    g => { boulder(g, 32, 34, 24, 20, { hi: '#ffb06a', mid: '#e8661c', lo: '#b8400e', dk: '#802a08' }, 66, 4); for (const [x, y] of [[24, 28], [38, 24], [34, 42]]) { g.fillStyle = '#e3221c'; g.beginPath(); g.arc(x, y, 4, 0, Math.PI * 2); g.fill(); } }, // 운석 광석
    g => { poly(g, [[12, 14], [50, 10], [54, 50], [14, 54]], '#9b6230', 4.5); poly(g, [[18, 16], [48, 14], [50, 46], [20, 48]], '#c98a4b'); poly(g, [[28, 10], [36, 10], [36, 30], [32, 26], [28, 30]], '#ffd94a', 3); }, // 마법서
    g => { g.beginPath(); g.ellipse(32, 38, 20, 18, 0, 0, Math.PI * 2); g.fillStyle = '#f2862a'; g.fill(); g.lineWidth = 4; g.strokeStyle = OUT; g.stroke(); poly(g, [[22, 18], [42, 18], [38, 24], [26, 24]], '#f2862a', 3.5); poly(g, [[22, 24], [42, 24], [42, 28], [22, 28]], '#2a5aa8', 3); }, // 금 주머니
    g => { g.beginPath(); g.arc(32, 34, 18, 0, Math.PI * 2); g.lineWidth = 12; g.strokeStyle = OUT; g.stroke(); g.lineWidth = 7; g.strokeStyle = '#f7b51c'; g.stroke(); }, // 금 반지
    g => { g.beginPath(); g.arc(32, 38, 16, 0, Math.PI * 2); g.lineWidth = 11; g.strokeStyle = OUT; g.stroke(); g.lineWidth = 6; g.strokeStyle = '#f7b51c'; g.stroke(); crystal(g, 32, 18, 10, { hi: '#e4b0ff', mid: '#a84ae0', lo: '#6a20a0' }, 0, 3); }, // 왕의 반지
    g => { const h = []; for (let i = 0; i < 6; i++) h.push([32 + Math.cos(i / 6 * Math.PI * 2) * 24, 32 + Math.sin(i / 6 * Math.PI * 2) * 24]); poly(g, h, '#efe6d2', 4); for (const [x, y] of [[24, 26], [40, 38], [32, 32]]) { g.fillStyle = OUT; g.beginPath(); g.arc(x, y, 3.5, 0, Math.PI * 2); g.fill(); } }, // 고대 주사위
    g => { poly(g, [[8, 44], [54, 18], [56, 48], [10, 54]], '#ffd23c', 4); for (const [x, y, r] of [[22, 44, 4], [40, 36, 5], [48, 44, 3]]) { g.beginPath(); g.arc(x, y, r, 0, Math.PI * 2); g.fillStyle = '#d99a10'; g.fill(); } }, // 성스러운 치즈
    g => { g.save(); g.translate(32, 32); for (let i = -1; i <= 1; i++) { g.save(); g.rotate(i * .35); poly(g, [[-5, 24], [5, 24], [3, -6], [0, -26], [-3, -6]], '#efe6d2', 3.5); g.restore(); } g.restore(); }, // 늑대 발톱
    g => { g.save(); g.translate(32, 32); g.rotate(.6); poly(g, [[-4, -26], [4, -26], [4, 28], [-4, 28]], '#9b6230', 3.5); poly(g, [[4, -24], [24, -30], [26, -6], [4, -10]], '#9aa2ac', 4); g.restore(); }, // 전사의 도끼
    g => { boulder(g, 32, 34, 22, 24, { hi: '#fff0a0', mid: '#e8c64a', lo: '#b8962a', dk: '#80661a' }, 88, 4); poly(g, [[32, 20], [38, 34], [32, 48], [26, 34]], '#2a8a4a', 2.5); }, // 룬스톤
    g => { g.beginPath(); g.arc(32, 28, 20, 0, Math.PI * 2); g.fillStyle = '#efe6d2'; g.fill(); g.lineWidth = 4; g.strokeStyle = OUT; g.stroke(); poly(g, [[20, 40], [44, 40], [42, 54], [22, 54]], '#efe6d2', 4); for (const x of [24, 40]) { g.fillStyle = OUT; g.beginPath(); g.arc(x, 30, 5, 0, Math.PI * 2); g.fill(); } }, // 전사의 해골
  ];

  // 큰 바위 (엔딩) 3단계
  function bigRockSprite(stage) {
    const c = mk(520, 460), g = c.getContext('2d');
    shadow(g, 260, 400, 220, 40);
    if (stage === 0) { boulder(g, 260, 230, 220, 190, ROCK, 501, 12); }
    else {
      boulder(g, 180, 250, 130, 150, ROCK, 511, 11); boulder(g, 340, 220, 130, 150, ROCK, 521, 11);
      if (stage === 2) { boulder(g, 260, 340, 110, 60, ROCK, 531, 10); }
    }
    const dia = { hi: '#e8ffff', mid: '#7ff0ff', lo: '#2ab8e0' };
    for (const [x, y] of [[220, 200], [300, 260], [250, 300]]) crystal(g, x, y, 22, dia, x * .01, 6);
    return c;
  }

  // 메뉴 장면 (원작 Grass_mine / GrassBlocksAndTheAnvil): 잔디 블록 위에 광산·모루
  function platform(g, cx, cy, n, tw) {
    const t = tileSprite(tw, tw * .515, tw * .16), hw = tw / 2, hh = tw * .515 / 2;
    const cells = []; for (let i = 0; i < n; i++) for (let j = 0; j < n; j++) cells.push([i, j]);
    cells.sort((a, b) => (a[0] + a[1]) - (b[0] + b[1]));
    for (const [i, j] of cells) { const x = cx + (i - j) * hw, y = cy + (i + j - (n - 1)) * hh; g.drawImage(t.c, x - t.ox, y - t.oy); }
  }
  function mineScene() {
    const c = mk(520, 400), g = c.getContext('2d');
    platform(g, 260, 270, 3, 150);
    g.save(); g.translate(260, 200); g.scale(2.4, 2.4); mineHouse(g, 0, 0, 1); g.restore();
    return c;
  }
  function anvilScene() {
    const c = mk(520, 300), g = c.getContext('2d');
    platform(g, 260, 190, 3, 150);
    g.save(); g.translate(260, 150); anvil(g, 0, 0, 2.2); g.restore();
    return c;
  }

  window.KomArt = {
    mineScene, anvilScene, platform,
    ORE, ROCK, OUT, rockSprite, brokenSprite, chestSprite, oreIcon, barIcon, tileSprite, pickSprite, ICONS, TALENT_ART, ARTI_ART,
    icon, flower, campfire, flameSprite, dynamite, boom, orb, bolt, hourglass, bigRockSprite, crystal, boulder, mineHouse, anvil, txt, poly, mk,
  };
})();
