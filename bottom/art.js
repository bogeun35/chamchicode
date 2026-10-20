// 바위 밑바닥 — 그림 (원작 Rock Bottom 픽셀 그림체를 흉내 내 코드로 직접 그림. 원작 스프라이트는 쓰지 않음)
(function (G) {
  'use strict';
  const mk = (w, h) => { const c = document.createElement('canvas'); c.width = w; c.height = h; const x = c.getContext('2d'); x.imageSmoothingEnabled = false; return [c, x]; };
  const px = (x, c, a, b, w = 1, h = 1) => { x.fillStyle = c; x.fillRect(a, b, w, h); };

  // ── 지역 팔레트 (동굴 안 배경색 · 이끼 테두리 · 광석색) ──
  const PAL = [
    { bg0: '#1f3b2c', bg1: '#2f5a3f', sil: '#294d37', edge: '#7fdc5a', edge2: '#3f8a34', rock: '#06090a', ore: ['#ffe27a', '#ffb52e', '#b86a12'], grass: '#8fe36a', flower: '#ff6a6a', vine: '#4f9a3e' },   // 침몰한 숲
    { bg0: '#211a3c', bg1: '#3a2b62', sil: '#33275a', edge: '#b48cff', edge2: '#5b3f9a', rock: '#07060c', ore: ['#9fd8ff', '#3f8fff', '#1f4fb0'], grass: '#c9a2ff', flower: '#7af0ff', vine: '#6a4fb0' },   // 포자빛 동굴
    { bg0: '#2a3a5c', bg1: '#41577e', sil: '#3a4d72', edge: '#b9d4ff', edge2: '#5d77a8', rock: '#07080d', ore: ['#f2f6ff', '#b9c4d6', '#6c7890'], grass: '#cfe3ff', flower: '#ffe27a', vine: '#5d77a8' },   // 폭풍 봉우리
    { bg0: '#2c1a36', bg1: '#4a2c5a', sil: '#40264e', edge: '#ff9fe0', edge2: '#9a4f8a', rock: '#09060b', ore: ['#ffd0f2', '#ff7ad8', '#b0349a'], grass: '#ffb0ea', flower: '#9ff', vine: '#9a4f8a' },   // 크리스탈 동굴
    { bg0: '#3a1410', bg1: '#5e2418', sil: '#4e1e14', edge: '#ff9a4a', edge2: '#a8441e', rock: '#0b0605', ore: ['#ffd27a', '#ff7a2e', '#b03a12'], grass: '#ffb36a', flower: '#ffe27a', vine: '#a8441e' },   // 용암 핵심
    { bg0: '#0f2d3a', bg1: '#1a4b5c', sil: '#163f4e', edge: '#7af2e2', edge2: '#2a8a86', rock: '#04090b', ore: ['#c8fff6', '#49e6d2', '#16867e'], grass: '#7af2c8', flower: '#ff9ac8', vine: '#2a8a86' },   // 희미한 물
    { bg0: '#16102a', bg1: '#271c46', sil: '#20173a', edge: '#b996ff', edge2: '#5a3fa0', rock: '#05040a', ore: ['#ead8ff', '#b07cff', '#5a2fb0'], grass: '#b996ff', flower: '#ff7af0', vine: '#5a3fa0' },   // 공허 동굴
    { bg0: '#0c0f22', bg1: '#1a1f3e', sil: '#141936', edge: '#9af2ff', edge2: '#3f6aa8', rock: '#03040a', ore: ['#ffffff', '#8ff0ff', '#3f8ab0'], grass: '#9af2ff', flower: '#ffe27a', vine: '#3f6aa8' },   // 세상의 핵
  ];
  // 광석 · 주괴 색 (금 코발트 철 크리스탈 용암 바다 공허 우주)
  const ORE_COL = [['#ffe27a', '#ffb52e', '#a8620e'], ['#a6dcff', '#3f8fff', '#1d47a6'], ['#f4f7ff', '#b5c0d2', '#636e86'], ['#ffd6f4', '#ff7ad8', '#a82f92'], ['#ffd27a', '#ff6a2e', '#a8320e'], ['#d0fff8', '#49e6d2', '#14807a'], ['#eedcff', '#b07cff', '#552ca8'], ['#ffffff', '#8ff0ff', '#3a86ac']];
  const ALLOY_COL = { 10: ['#fff6b0', '#f2d64a', '#9a7a14'], 11: ['#dfe8f2', '#93a8bc', '#4a5a6e'], 12: ['#ffffff', '#ffc8f8', '#8a6ad8'] };

  // ── 광석 덩이(바위에 박힌 금빛 알갱이) 4종 — 원작 GoldOre.png 처럼 ──
  const oreCache = {};
  function oreSprite(L, v) {
    const k = L + ':' + v; if (oreCache[k]) return oreCache[k];
    const [c, x] = mk(16, 16), [hi, md, dk] = ORE_COL[L];
    const blobs = [[[3, 3, 4, 3], [9, 2, 4, 4], [4, 9, 5, 4], [10, 9, 3, 3]], [[2, 4, 5, 4], [9, 3, 4, 3], [7, 9, 5, 4]], [[3, 2, 4, 3], [8, 6, 5, 4], [2, 10, 4, 3], [11, 11, 3, 3]], [[5, 3, 3, 3], [2, 8, 4, 4], [9, 9, 4, 4]]][v & 3];
    for (const [a, b, w, h] of blobs) {
      px(x, dk, a, b + 1, w, h); px(x, md, a, b, w, h - 1); px(x, hi, a, b, w - 1, 1); px(x, hi, a, b, 1, h - 2);
      px(x, '#fff', a + 1, b + 1, 1, 1);
    }
    return (oreCache[k] = c);
  }
  // ── 수정 덩어리 (원작 orechunks.png 의 8가지 모양을 흉내) ──
  const chunkCache = {};
  function chunkSprite(L) {
    if (chunkCache[L]) return chunkCache[L];
    const [c, x] = mk(16, 16), [hi, md, dk] = ORE_COL[L];
    x.fillStyle = dk; x.beginPath(); x.moveTo(8, 0); x.lineTo(15, 6); x.lineTo(12, 15); x.lineTo(4, 15); x.lineTo(1, 6); x.closePath(); x.fill();
    x.fillStyle = md; x.beginPath(); x.moveTo(8, 1); x.lineTo(14, 6); x.lineTo(11, 14); x.lineTo(5, 14); x.lineTo(2, 6); x.closePath(); x.fill();
    x.fillStyle = hi; x.beginPath(); x.moveTo(8, 1); x.lineTo(11, 6); x.lineTo(8, 13); x.lineTo(5, 6); x.closePath(); x.fill();
    px(x, '#fff', 6, 4, 2, 2); px(x, '#fff', 9, 3, 1, 1);
    return (chunkCache[L] = c);
  }
  // ── 주괴 · 돌 · 토큰 아이콘 (HUD) ──
  const iconCache = {};
  function barSprite(i) {   // i = 화폐 번호
    if (iconCache['b' + i]) return iconCache['b' + i];
    const [c, x] = mk(16, 16);
    if (i === 1) {   // 돌
      px(x, '#2a2a34', 3, 6, 10, 8); px(x, '#5c5a6c', 3, 5, 9, 8); px(x, '#8e8aa2', 4, 5, 6, 2); px(x, '#6e6a80', 9, 9, 3, 3); px(x, '#3c3a4a', 4, 11, 4, 1);
    } else if (i === 4) {   // 토큰 (보석 동전)
      px(x, '#7a4a0a', 4, 2, 8, 12); px(x, '#7a4a0a', 2, 4, 12, 8); px(x, '#ffc23a', 4, 3, 8, 10); px(x, '#ffc23a', 3, 4, 10, 8); px(x, '#ffe98a', 5, 4, 3, 6); px(x, '#ff8a2a', 9, 9, 3, 2); px(x, '#fff', 5, 4, 1, 2);
    } else {
      const col = i >= 10 ? ALLOY_COL[i] : ORE_COL[[0, -1, 1, 2, -1, 3, 4, 5, 6, 7][i]];
      const [hi, md, dk] = col || ORE_COL[0];
      x.fillStyle = dk; x.beginPath(); x.moveTo(2, 13); x.lineTo(14, 13); x.lineTo(12, 6); x.lineTo(4, 6); x.closePath(); x.fill();
      x.fillStyle = md; x.beginPath(); x.moveTo(3, 12); x.lineTo(13, 12); x.lineTo(11, 7); x.lineTo(5, 7); x.closePath(); x.fill();
      px(x, hi, 5, 7, 6, 1); px(x, hi, 4, 9, 2, 1); px(x, '#fff', 6, 7, 2, 1);
      if (i === 12) { px(x, '#9ff', 7, 9, 2, 2); px(x, '#f9f', 10, 10, 1, 1); }
    }
    return (iconCache['b' + i] = c);
  }
  function oreIcon(L) {   // 인벤토리용 광석 덩이 아이콘
    if (iconCache['o' + L]) return iconCache['o' + L];
    const [c, x] = mk(16, 16), [hi, md, dk] = ORE_COL[L];
    px(x, dk, 3, 5, 10, 9); px(x, md, 3, 4, 9, 9); px(x, md, 5, 3, 6, 1); px(x, hi, 4, 4, 5, 2); px(x, hi, 4, 6, 2, 3); px(x, '#fff', 5, 5, 1, 1); px(x, dk, 9, 10, 3, 2);
    return (iconCache['o' + L] = c);
  }

  // ── 고블린(오크) 광부 — 20×20, 콩눈·작은 얼굴·큰 귀·고글 모자 ──
  const orcCache = {};
  function orc(pose, f) {   // pose: idle | run | jump | exhaust | swim
    const k = pose + f; if (orcCache[k]) return orcCache[k];
    const [c, x] = mk(20, 20);
    const sk = '#86cf5e', skD = '#5e9e3e', ol = '#2b1a12', hat = '#8b5a33', hatD = '#5d3a20', tun = '#7a4e36', tunD = '#55341f', pan = '#3e3a58', gl = '#9fe8ff', glF = '#d6b26c';
    let by = 0, lf = 0, rf = 0;
    if (pose === 'idle') by = f % 2 ? 1 : 0;
    if (pose === 'run') { by = f % 2; lf = [0, -2, 0, 2][f % 4]; rf = -lf; }
    if (pose === 'jump') { lf = -1; rf = 1; }
    if (pose === 'exhaust') {   // 엎드려 자는 모습
      px(x, ol, 2, 14, 16, 5); px(x, tun, 3, 15, 9, 3); px(x, sk, 11, 13, 6, 5); px(x, skD, 11, 17, 6, 1); px(x, hat, 12, 11, 6, 3); px(x, gl, 13, 12, 2, 1); px(x, ol, 14, 15, 2, 1);
      return (orcCache[k] = c);
    }
    // 발
    px(x, ol, 6 + lf, 17, 3, 2); px(x, ol, 11 + rf, 17, 3, 2);
    // 바지 · 몸통
    px(x, ol, 6, 13 + by, 8, 5 - by); px(x, pan, 7, 15 + by, 6, 2 - by);
    px(x, tunD, 6, 11 + by, 8, 4); px(x, tun, 7, 11 + by, 6, 3); px(x, '#c9a46a', 7, 13 + by, 6, 1);
    // 팔
    px(x, sk, 5, 12 + by, 1, 2); px(x, sk, 14, 12 + by, 1, 2);
    // 머리 (작은 얼굴) + 큰 귀
    const hy = 3 + by;
    px(x, ol, 5, hy + 2, 10, 7); px(x, ol, 6, hy + 1, 8, 9);
    px(x, sk, 6, hy + 2, 8, 7); px(x, sk, 7, hy + 1, 6, 9); px(x, skD, 6, hy + 8, 8, 1);
    px(x, ol, 2, hy + 4, 4, 2); px(x, sk, 3, hy + 4, 3, 1); px(x, ol, 1, hy + 3, 2, 1);
    px(x, ol, 14, hy + 4, 4, 2); px(x, sk, 14, hy + 4, 3, 1); px(x, ol, 17, hy + 3, 2, 1);
    // 모자 + 고글
    px(x, hatD, 5, hy, 10, 3); px(x, hat, 6, hy - 1, 8, 3); px(x, hat, 5, hy + 1, 10, 1);
    px(x, glF, 7, hy, 2, 2); px(x, glF, 11, hy, 2, 2); px(x, gl, 7, hy, 1, 1); px(x, gl, 11, hy, 1, 1);
    // 콩눈 · 볼터치
    px(x, ol, 9, hy + 4, 1, 2); px(x, ol, 12, hy + 4, 1, 2);
    px(x, '#ff9aa8', 8, hy + 7, 1, 1); px(x, '#ff9aa8', 13, hy + 7, 1, 1);
    if (pose === 'swim') { px(x, '#bfe9ff', 3, 9, 1, 1); px(x, '#bfe9ff', 2, 6, 1, 1); }
    return (orcCache[k] = c);
  }
  // ── 곡괭이 8등급 (손잡이 + 머리) ──
  const PICK_COL = ['#b58b5a', '#ffd166', '#5aa9ff', '#d7deea', '#ff8fd8', '#ff7a3d', '#49e6d2', '#b07cff'];
  const pickCache = {};
  function pickaxe(t) {
    if (pickCache[t]) return pickCache[t];
    const [c, x] = mk(16, 16), col = PICK_COL[t - 1] || PICK_COL[0];
    for (let i = 0; i < 10; i++) px(x, i % 3 ? '#7a5230' : '#5a3a20', 3 + i * .6 | 0, 14 - i, 2, 1);
    x.fillStyle = '#2b1a12'; x.beginPath(); x.moveTo(1, 5); x.quadraticCurveTo(8, -1, 15, 5); x.lineTo(14, 7); x.quadraticCurveTo(8, 2, 2, 7); x.closePath(); x.fill();
    x.fillStyle = col; x.beginPath(); x.moveTo(2, 5); x.quadraticCurveTo(8, 0, 14, 5); x.lineTo(13.5, 6); x.quadraticCurveTo(8, 2, 2.5, 6); x.closePath(); x.fill();
    px(x, '#fff', 6, 2, 3, 1);
    return (pickCache[t] = c);
  }

  // ── 배경: 원작 패럴랙스처럼 이끼 덩어리 실루엣 + 늘어진 덩굴 ──
  const bgCache = {};
  function background(L, layer) {   // layer 0 = 먼 층, 1 = 가까운 층
    const k = L + ':' + layer; if (bgCache[k]) return bgCache[k];
    const [c, x] = mk(640, 360), P = PAL[L], r = RBNoise.rand(9001 + L * 31 + layer * 7);
    x.fillStyle = layer ? P.sil : P.bg1; x.globalAlpha = layer ? .9 : .55;
    for (let i = 0; i < (layer ? 5 : 7); i++) {
      const cx = r() * 640, cy = r() * 360, rw = 50 + r() * 90, rh = 30 + r() * 60;
      x.beginPath();
      for (let a = 0; a <= 24; a++) { const t = a / 24 * Math.PI * 2, rr = 1 + (r() - .5) * .35; x.lineTo(cx + Math.cos(t) * rw * rr, cy + Math.sin(t) * rh * rr); }
      x.fill();
      for (let d = 0; d < 8; d++) { const dx = cx + (r() - .5) * rw * 1.6; x.fillRect(dx | 0, cy + rh * .4, 2, 20 + r() * 60); }   // 늘어진 덩굴
      for (let d = 0; d < 6; d++) x.fillRect(cx + (r() - .5) * rw * 1.4 | 0, cy - rh * .8 - 2, 3, 3);
    }
    x.globalAlpha = 1;
    return (bgCache[k] = c);
  }

  // ── 기지 시설 그림 (원작 world_hubtest 배치: 토큰 제단 · 제련소 · 상점 · 승강기) ──
  function drawAltar(x, X, Y, t) {   // 바닥 중심 (X,Y)
    px(x, '#3a3f2e', X - 28, Y - 14, 56, 14); px(x, '#56603e', X - 26, Y - 16, 52, 4); px(x, '#6e7a4a', X - 24, Y - 17, 48, 2);
    px(x, '#2d3324', X - 30, Y - 3, 60, 3);
    for (const s of [-1, 1]) { px(x, '#4d5a38', X + s * 22 - 4, Y - 34, 8, 20); px(x, '#6e7a4a', X + s * 22 - 4, Y - 36, 8, 3); px(x, '#ffe7a8', X + s * 22 - 1, Y - 42, 2, 5); px(x, '#ffb03a', X + s * 22 - 1, Y - 44 + Math.sin(t * 9 + s) * 1, 2, 2); }
    for (const dx of [-10, -6, 6, 10]) { px(x, '#efe0b0', X + dx, Y - 22, 2, 5); px(x, '#ffb03a', X + dx, Y - 24 + Math.sin(t * 7 + dx), 2, 2); }
    const g = x.createRadialGradient(X, Y - 28, 2, X, Y - 28, 26); g.addColorStop(0, 'rgba(255,220,120,.55)'); g.addColorStop(1, 'rgba(255,220,120,0)'); x.fillStyle = g; x.fillRect(X - 30, Y - 56, 60, 56);
    x.fillStyle = '#ffd34a'; x.beginPath(); x.moveTo(X, Y - 38 + Math.sin(t * 2) * 2); x.lineTo(X + 5, Y - 30); x.lineTo(X, Y - 22); x.lineTo(X - 5, Y - 30); x.closePath(); x.fill();
    px(x, '#fff8c8', X - 1, Y - 33 + Math.sin(t * 2) * 2, 2, 3);
  }
  function drawSmelter(x, X, Y, t, on) {
    px(x, '#3e4436', X - 34, Y - 52, 68, 52); px(x, '#56604a', X - 32, Y - 50, 64, 48);
    for (let r = 0; r < 6; r++) for (let q = 0; q < 8; q++) px(x, (r + q) % 2 ? '#4a5240' : '#606b52', X - 32 + q * 8 + (r % 2) * 4, Y - 50 + r * 8, 7, 7);
    px(x, '#3e4436', X - 14, Y - 74, 12, 24); px(x, '#56604a', X - 12, Y - 72, 8, 22); px(x, '#3e4436', X + 4, Y - 66, 10, 16);
    x.fillStyle = '#1a120c'; x.beginPath(); x.moveTo(X - 16, Y); x.lineTo(X - 16, Y - 18); x.arc(X, Y - 18, 16, Math.PI, 0); x.lineTo(X + 16, Y); x.closePath(); x.fill();
    const fl = on ? 1 : .35, g = x.createLinearGradient(0, Y - 20, 0, Y); g.addColorStop(0, `rgba(255,120,30,${.2 * fl})`); g.addColorStop(1, `rgba(255,200,60,${.9 * fl})`); x.fillStyle = g; x.fillRect(X - 13, Y - 18, 26, 18);
    for (let i = 0; i < 5; i++) px(x, on ? '#ffd24a' : '#a0602a', X - 10 + i * 5, Y - 6 - Math.abs(Math.sin(t * 8 + i)) * (on ? 6 : 2), 3, 3);
    px(x, '#7a3a1e', X - 18, Y - 2, 36, 2);
  }
  function drawShop(x, X, Y, t) {
    px(x, '#4a2c1a', X - 40, Y - 56, 4, 56); px(x, '#4a2c1a', X + 36, Y - 56, 4, 56);
    for (let i = 0; i < 10; i++) { px(x, i % 2 ? '#f2e2c4' : '#e8873a', X - 44 + i * 9, Y - 66, 9, 12); px(x, i % 2 ? '#d8c4a0' : '#c4682a', X - 44 + i * 9, Y - 54, 9, 3); }
    px(x, '#6a3c22', X - 44, Y - 68, 90, 3);
    px(x, '#7a4a2a', X - 36, Y - 24, 72, 24); px(x, '#9a6034', X - 38, Y - 26, 76, 4); px(x, '#5a3420', X - 34, Y - 12, 68, 2);
    px(x, '#c9a46a', X - 28, Y - 30, 6, 4); px(x, '#8fd3ff', X + 18, Y - 31, 5, 5);
    // 상점 주인 고블린 (카운터 뒤)
    const sy = Y - 38 + Math.round(Math.sin(t * 2.2));
    px(x, '#2b1a12', X - 6, sy, 14, 11); px(x, '#86cf5e', X - 5, sy + 1, 12, 9); px(x, '#2b1a12', X - 10, sy + 3, 4, 2); px(x, '#2b1a12', X + 8, sy + 3, 4, 2);
    px(x, '#2b1a12', X - 2, sy + 4, 1, 2); px(x, '#2b1a12', X + 3, sy + 4, 1, 2); px(x, '#5d3a20', X - 5, sy - 2, 12, 3);
  }
  function drawLift(x, X, Y, t, doorOpen) {   // 원작 승강기: 쇠사슬에 매달린 철창
    for (let cy = Y - 600; cy < Y - 46; cy += 8) { px(x, '#8a8a6a', X - 2, cy, 4, 6); px(x, '#5a5a44', X - 1, cy + 1, 2, 4); }
    px(x, '#5a5a3a', X - 24, Y - 46, 48, 6); px(x, '#8a8a5a', X - 22, Y - 45, 44, 2);
    px(x, '#5a5a3a', X - 24, Y - 4, 48, 4); px(x, '#8a8a5a', X - 22, Y - 4, 44, 1);
    for (let i = 0; i <= 8; i++) { const bx = X - 22 + i * 5.5 | 0; px(x, '#6e6e48', bx, Y - 40, 2, 36); }
    px(x, '#5a5a3a', X - 24, Y - 40, 3, 36); px(x, '#5a5a3a', X + 21, Y - 40, 3, 36);
    if (!doorOpen) for (let i = 0; i < 4; i++) px(x, '#9a9a6a', X - 10 + i * 6, Y - 38, 2, 34);
  }
  function drawLantern(x, X, Y, t) {
    px(x, '#6a5a3a', X - 1, Y - 60, 2, 50);
    const sw = Math.sin(t * 1.3) * 2;
    px(x, '#3a2a1a', X - 4 + sw, Y - 12, 8, 2); px(x, '#ffe28a', X - 3 + sw, Y - 10, 6, 7); px(x, '#3a2a1a', X - 4 + sw, Y - 3, 8, 2);
    const g = x.createRadialGradient(X + sw, Y - 7, 1, X + sw, Y - 7, 34); g.addColorStop(0, 'rgba(255,214,120,.35)'); g.addColorStop(1, 'rgba(255,214,120,0)'); x.fillStyle = g; x.fillRect(X - 36 + sw, Y - 42, 72, 72);
  }
  function drawAnvil(x, X, Y, t) {
    px(x, '#3a3036', X - 16, Y - 8, 32, 8); px(x, '#2a2228', X - 10, Y - 16, 20, 8);
    px(x, '#5a5a66', X - 22, Y - 24, 40, 8); px(x, '#7a7a88', X - 22, Y - 24, 40, 2); px(x, '#5a5a66', X + 18, Y - 22, 8, 4);
    const g = x.createRadialGradient(X, Y - 26, 1, X, Y - 26, 20); g.addColorStop(0, `rgba(255,140,60,${.25 + .15 * Math.sin(t * 3)})`); g.addColorStop(1, 'rgba(255,140,60,0)'); x.fillStyle = g; x.fillRect(X - 22, Y - 46, 44, 40);
  }
  function drawFoundry(x, X, Y, t, on) {
    px(x, '#3a3a44', X - 30, Y - 48, 60, 48); px(x, '#525260', X - 28, Y - 46, 56, 44);
    for (let i = 0; i < 3; i++) { px(x, '#2a2a32', X - 24 + i * 18, Y - 40, 12, 18); px(x, on ? '#ff9a3a' : '#5a3a2a', X - 22 + i * 18, Y - 30, 8, 6); }
    px(x, '#6a6a7a', X - 34, Y - 52, 68, 6); px(x, '#3a3a44', X + 14, Y - 76, 10, 26);
    if (on) for (let i = 0; i < 3; i++) { const p = (t * .6 + i / 3) % 1; x.fillStyle = `rgba(200,200,210,${.4 * (1 - p)})`; x.beginPath(); x.arc(X + 19 + Math.sin(p * 6) * 3, Y - 78 - p * 30, 4 + p * 6, 0, Math.PI * 2); x.fill(); }
  }
  function drawWorkshop(x, X, Y, t) {
    px(x, '#4a3a2a', X - 30, Y - 40, 60, 40); px(x, '#6a5238', X - 28, Y - 38, 56, 36);
    px(x, '#8a6a44', X - 34, Y - 44, 68, 5); px(x, '#3a2a1a', X - 20, Y - 30, 14, 10); px(x, '#9fe8ff', X + 6, Y - 30, 12, 8);
    for (let i = 0; i < 4; i++) px(x, '#c9a46a', X - 24 + i * 14, Y - 14, 6, 3);
  }
  function drawDrone(x, X, Y, t, col) {   // 작은 채굴 드론
    const by = Math.sin(t * 4) * 2;
    px(x, '#2b1a12', X - 7, Y - 5 + by, 14, 9); px(x, col || '#c9d6e6', X - 6, Y - 4 + by, 12, 7); px(x, '#3a4a5a', X - 6, Y + 1 + by, 12, 2);
    px(x, '#9fe8ff', X - 3, Y - 3 + by, 2, 2); px(x, '#9fe8ff', X + 2, Y - 3 + by, 2, 2);
    const s = Math.abs(Math.sin(t * 30)) * 6; px(x, '#dde', X - 3 - s / 2, Y - 8 + by, 6 + s, 1);
  }
  function drawChest(x, X, Y, open) {   // 구조물 속 보물상자 (16×12)
    px(x, '#2b1a12', X - 8, Y - 11, 16, 11); px(x, '#9a5a2a', X - 7, Y - 10, 14, 9); px(x, '#c4823a', X - 7, Y - 10, 14, 3);
    px(x, '#ffd34a', X - 1, Y - 7, 2, 3); px(x, '#5a3218', X - 7, Y - 6, 14, 1);
    if (open) { px(x, '#2b1a12', X - 8, Y - 15, 16, 4); px(x, '#c4823a', X - 7, Y - 14, 14, 2); }
  }
  G.RBArt = { PAL, ORE_COL, oreSprite, chunkSprite, barSprite, oreIcon, orc, pickaxe, background, drawAltar, drawSmelter, drawShop, drawLift, drawLantern, drawAnvil, drawFoundry, drawWorkshop, drawDrone, drawChest, mk };
})(window);
