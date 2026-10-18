// 쉘다이버 그림 — 원작 색·크기를 참고해 직접 그린 픽셀 그림 (원작 스프라이트는 쓰지 않음)
// 작은 캔버스에 1px 단위로 그리고 진한 외곽선을 자동으로 두른 뒤, 화면에는 계단 그대로 확대해 그린다.
(function () {
  'use strict';
  const OL = '#2e111a';                       // 원작 외곽선 색
  const cache = new Map();
  function mk(w, h) { const c = document.createElement('canvas'); c.width = w; c.height = h; const x = c.getContext('2d'); x.imageSmoothingEnabled = false; return [c, x]; }
  function R(x, X, Y, w, h, col) { x.fillStyle = col; x.fillRect(Math.round(X), Math.round(Y), Math.round(w), Math.round(h)); }
  function E(x, cx, cy, rx, ry, col) {   // 픽셀 타원 채우기
    x.fillStyle = col;
    for (let yy = Math.floor(cy - ry); yy <= Math.ceil(cy + ry); yy++) {
      const dy = (yy + .5 - cy) / ry; if (Math.abs(dy) > 1) continue;
      const hw = rx * Math.sqrt(1 - dy * dy);
      const a = Math.round(cx - hw), b = Math.round(cx + hw);
      if (b > a) x.fillRect(a, yy, b - a, 1);
    }
  }
  function poly(x, pts, col) { x.fillStyle = col; x.beginPath(); x.moveTo(pts[0][0], pts[0][1]); for (let i = 1; i < pts.length; i++) x.lineTo(pts[i][0], pts[i][1]); x.closePath(); x.fill(); }
  function hard(c) {   // 안티앨리어싱 제거: 알파 반올림
    const x = c.getContext('2d'), d = x.getImageData(0, 0, c.width, c.height), p = d.data;
    for (let i = 3; i < p.length; i += 4) p[i] = p[i] > 110 ? 255 : 0;
    x.putImageData(d, 0, 0); return c;
  }
  function outline(src, col) {   // 1px 외곽선(상하좌우)
    hard(src);
    const w = src.width + 2, h = src.height + 2, [c, x] = mk(w, h);
    const sd = src.getContext('2d').getImageData(0, 0, src.width, src.height).data;
    const od = x.createImageData(w, h), o = od.data;
    const r = parseInt(col.slice(1, 3), 16), g = parseInt(col.slice(3, 5), 16), b = parseInt(col.slice(5, 7), 16);
    const A = (X, Y) => X >= 0 && Y >= 0 && X < src.width && Y < src.height && sd[(Y * src.width + X) * 4 + 3] > 0;
    for (let Y = 0; Y < h; Y++) for (let X = 0; X < w; X++) {
      const sx = X - 1, sy = Y - 1;
      if (A(sx, sy)) continue;
      if (A(sx - 1, sy) || A(sx + 1, sy) || A(sx, sy - 1) || A(sx, sy + 1)) { const i = (Y * w + X) * 4; o[i] = r; o[i + 1] = g; o[i + 2] = b; o[i + 3] = 255; }
    }
    x.putImageData(od, 0, 0); x.drawImage(src, 1, 1); return c;
  }
  function sprite(key, w, h, fn, ol) {
    let c = cache.get(key); if (c) return c;
    const [cv, x] = mk(w, h); fn(x, w, h); c = ol === false ? hard(cv) : outline(cv, ol || OL);
    cache.set(key, c); return c;
  }
  function flip(c) { const k = c; let f = flip.m.get(k); if (f) return f; const [cv, x] = mk(c.width, c.height); x.translate(c.width, 0); x.scale(-1, 1); x.drawImage(c, 0, 0); flip.m.set(k, cv); return cv; }
  flip.m = new WeakMap();

  // ── 거북이 (섬: 걷기 / 바다: 헬멧 쓰고 수영) ───────────────────────
  const T = { g: '#32c576', g2: '#2eab66', dk: '#337053', sh: '#6e9c3a', sh2: '#4f7a2a', be: '#a2c4ef', be2: '#6ea0db', fin: '#18c2d3', sc: '#e16e5b', hel: '#caf082' };
  function turtleBody(x, ox, oy, f, swim) {
    // 등딱지(뒤)
    E(x, ox + 6, oy + 13, 6, 7, T.sh2); E(x, ox + 6, oy + 12, 5, 6, T.sh);
    R(x, ox + 4, oy + 9, 2, 2, T.sh2); R(x, ox + 7, oy + 13, 2, 2, T.sh2);
    // 몸
    E(x, ox + 11, oy + 14, 5, 6, T.g); E(x, ox + 12, oy + 15, 3.5, 4.5, T.be); R(x, ox + 10, oy + 14, 4, 1, T.be2); R(x, ox + 10, oy + 17, 4, 1, T.be2);
    // 머리
    E(x, ox + 13, oy + 6, 6, 5, T.g); R(x, ox + 8, oy + 8, 11, 2, T.g2);
    // 눈(콩눈) + 입
    R(x, ox + 14, oy + 4, 2, 2, '#fff9ef'); R(x, ox + 15, oy + 5, 1, 1, OL); R(x, ox + 17, oy + 4, 2, 2, '#fff9ef'); R(x, ox + 18, oy + 5, 1, 1, OL);
    R(x, ox + 15, oy + 8, 3, 1, T.dk);
    // 팔·다리
    const s = swim ? 0 : f;
    if (swim) {
      const k = [0, 1, 2, 1][f % 4];
      R(x, ox + 2 - k, oy + 19, 5, 2, T.fin); R(x, ox + 3 - k, oy + 21, 4, 1, T.fin);
      R(x, ox + 15, oy + 15 + (k ? 1 : 0), 3, 2, T.g);
    } else {
      const k = [0, 1, 0, -1][s % 4];
      R(x, ox + 8 + k, oy + 19, 3, 3, T.g2); R(x, ox + 13 - k, oy + 19, 3, 3, T.g2);
      R(x, ox + 15, oy + 13, 2, 3, T.g);
    }
  }
  function turtle(frame, swim) {
    return sprite('turtle' + (swim ? 'S' : 'L') + frame, 24, 24, x => {
      if (swim) { R(x, 4, 12, 5, 2, T.sc); R(x, 2, 13, 3, 2, T.sc); }   // 목도리
      turtleBody(x, 1, 1, frame, swim);
    });
  }
  function helmet() {   // 헬멧 유리 (외곽선 없이 위에 겹침)
    return sprite('helmet', 26, 26, x => {
      x.strokeStyle = T.hel; x.lineWidth = 1;
      for (let a = 0; a < 360; a += 2) { const r = a * Math.PI / 180; R(x, 13 + Math.cos(r) * 11.5, 11 + Math.sin(r) * 10.5, 1, 1, T.hel); }
      R(x, 17, 3, 3, 3, '#fff9ef'); R(x, 20, 6, 1, 1, '#fff9ef');
    }, false);
  }

  // ── 해파리 (바이옴·종류별 색) ─────────────────────────────────
  const JC = {   // 몸 / 밝은면 / 어두운면 / 무늬
    shallows_green: ['#ccd683', '#edf6b2', '#95ac86', '#6c875e'], shallows_pink: ['#cc85f3', '#eac2ff', '#bd4ead', '#993ca8'], shallows_yellow: ['#85d3f3', '#c2ecff', '#8092d4', '#5077a8'],
    glacial_green: ['#88da80', '#d9f2d7', '#3aa562', '#79c497'], glacial_purple: ['#da84b0', '#f2d8e5', '#a53f43', '#c47d7e'], glacial_red: ['#7169ef', '#cbbcfe', '#51379a', '#7e44b2'],
    swamp_green: ['#a8f376', '#e4ffd3', '#43bd4f', '#73d47b'], swamp_purple: ['#8651d4', '#9aa5ff', '#342789', '#6334ff'], swamp_yellow: ['#a2d7f3', '#e1f5ff', '#6573bd', '#99a3d4'],
    magma_blue: ['#fe5381', '#fd96b2', '#c74c29', '#e27151'], magma_red: ['#4455ff', '#838dff', '#6526bf', '#8244e1'], magma_yellow: ['#83d2e4', '#bde7f0', '#496db6', '#7995ce'],
  };
  const TINT = { silver: '#dfe6f0', gold: '#ffd84a', rainbow: null, emerald: '#3ee08a' };
  function jelly(kind, frame, big, grade) {
    const pal = JC[kind] || JC.shallows_green, sc = big ? 1.35 : 1, magma = kind.startsWith('magma');
    const W = Math.ceil(20 * sc) + 2, H = Math.ceil(26 * sc) + 2;
    return sprite('j' + kind + frame + (big ? 'B' : '') + (grade || ''), W, H, x => {
      let [b, l, d, m] = pal;
      if (grade && grade !== 'normal') { const t = TINT[grade]; if (t) { b = t; l = '#ffffff'; d = grade === 'gold' ? '#d08a1e' : grade === 'emerald' ? '#1c8f55' : '#9aa6b8'; m = d; } }
      const cx = W / 2, top = 2, bob = [0, 1, 1, 0][frame % 4];
      // 머리
      E(x, cx, top + 8 * sc + bob, 9 * sc, 8 * sc, b);
      R(x, cx - 9 * sc + 1, top + 11 * sc + bob, 18 * sc - 2, 2 * sc, d);
      E(x, cx - 3 * sc, top + 4 * sc + bob, 3 * sc, 2 * sc, l);
      if (magma) {   // 뿔
        poly(x, [[cx - 7 * sc, top + 3 * sc + bob], [cx - 9 * sc, top - 1 + bob], [cx - 4 * sc, top + 1 * sc + bob]], d);
        poly(x, [[cx + 7 * sc, top + 3 * sc + bob], [cx + 9 * sc, top - 1 + bob], [cx + 4 * sc, top + 1 * sc + bob]], d);
      }
      if (kind.startsWith('swamp') && big) { E(x, cx + 5 * sc, top + 6 * sc + bob, 2 * sc, 2 * sc, m); E(x, cx - 6 * sc, top + 9 * sc + bob, 1.5 * sc, 1.5 * sc, m); }
      // 얼굴 (콩눈)
      R(x, cx - 4 * sc, top + 8 * sc + bob, 2, 2, OL); R(x, cx + 2 * sc, top + 8 * sc + bob, 2, 2, OL);
      R(x, cx - 1, top + 11 * sc + bob, 2, 1, OL);
      // 촉수
      const n = 3, sway = [0, 1, 0, -1][frame % 4];
      for (let i = 0; i < n; i++) {
        const tx = cx + (i - 1) * 5 * sc;
        for (let k = 0; k < 9 * sc; k++) { const off = Math.round(Math.sin((k + frame * 2 + i * 3) * .6) * 1.2) + (k > 5 * sc ? sway : 0); R(x, tx - 1 + off, top + 15 * sc + k, 2, 1, k % 3 === 2 ? m : b); }
      }
      if (grade === 'rainbow') {
        const cols = ['#ff6b6b', '#ffb84a', '#fff36b', '#6bff8f', '#6bd5ff', '#b06bff'];
        x.globalCompositeOperation = 'source-atop';
        for (let i = 0; i < H; i += 3) R(x, 0, i, W, 3, cols[(i / 3) % cols.length]);
        x.globalAlpha = .55; x.globalCompositeOperation = 'source-atop'; E(x, cx - 3 * sc, top + 4 * sc + bob, 3 * sc, 2 * sc, '#ffffff'); x.globalAlpha = 1;
        x.globalCompositeOperation = 'source-over';
        R(x, cx - 4 * sc, top + 8 * sc + bob, 2, 2, OL); R(x, cx + 2 * sc, top + 8 * sc + bob, 2, 2, OL);
      }
    });
  }

  // ── 잠수함 ───────────────────────────────────────────────
  function submarine() {
    return sprite('sub', 50, 46, x => {
      // 꼬리 지느러미
      poly(x, [[4, 14], [14, 22], [4, 30]], '#26afdf'); poly(x, [[0, 18], [12, 22], [2, 26]], '#289fbe');
      // 몸통
      E(x, 27, 24, 17, 14, '#26afdf'); E(x, 25, 20, 13, 9, '#40ceff');
      // 앞 해치(나무)
      E(x, 40, 24, 6, 11, '#b7ad9b'); R(x, 39, 13, 2, 22, '#7e6f5a'); R(x, 35, 23, 10, 2, '#7e6f5a');
      // 창문
      E(x, 25, 24, 5, 5, '#7e6f5a'); E(x, 25, 24, 3.5, 3.5, '#a3622a'); R(x, 24, 23, 2, 2, '#e16e5b');
      // 잠망경
      R(x, 25, 3, 4, 9, '#b7ad9b'); R(x, 25, 3, 8, 3, '#b7ad9b'); R(x, 31, 2, 3, 2, '#40ceff');
      // 받침
      R(x, 12, 37, 30, 5, '#3232ac'); R(x, 14, 41, 26, 2, '#22227a'); R(x, 23, 34, 8, 9, '#487a96');
    });
  }
  // ── 자원 블록 ──────────────────────────────────────────────
  function block(type, v) {
    return sprite('blk' + type + v, 30, 30, x => {
      if (type === 'scrap') {
        R(x, 4, 12, 18, 12, '#487a96'); R(x, 4, 12, 18, 3, '#beb6a8'); R(x, 6, 16, 6, 6, '#355b70');
        E(x, 21, 21, 6, 6, '#3e4444'); E(x, 21, 21, 3, 3, '#dad3c7'); for (let a = 0; a < 8; a++) R(x, 21 + Math.cos(a * .785) * 6.5 - 1, 21 + Math.sin(a * .785) * 6.5 - 1, 2, 2, '#3e4444');
        R(x, 10 + v, 4, 3, 10, '#beb6a8'); R(x, 8 + v, 3, 7, 3, '#dad3c7');
      } else if (type === 'crystal') {
        const cube = (X, Y, s, a, b, c) => { poly(x, [[X, Y + s * .3], [X + s / 2, Y], [X + s, Y + s * .3], [X + s / 2, Y + s * .6]], a); poly(x, [[X, Y + s * .3], [X + s / 2, Y + s * .6], [X + s / 2, Y + s], [X, Y + s * .75]], b); poly(x, [[X + s / 2, Y + s * .6], [X + s, Y + s * .3], [X + s, Y + s * .75], [X + s / 2, Y + s]], c); };
        cube(13, 9, 14, '#ffb9da', '#c9428a', '#b21081'); cube(2, 12, 14, '#a479ff', '#524cee', '#29305a'); cube(8, 1, 12, '#a479ff', '#524cee', '#3b3f8a');
      } else if (type === 'mush') {
        R(x, 13, 14, 4, 13, '#f6e3a0'); E(x, 15, 12, 10, 6, '#ffb95f'); E(x, 12, 10, 3, 2, '#fffffd'); E(x, 19, 13, 2, 1.5, '#fffffd');
        R(x, 5, 20, 3, 8, '#f6e3a0'); E(x, 6.5, 19, 5, 3.5, '#4eabff'); R(x, 22, 21, 3, 7, '#f6e3a0'); E(x, 23.5, 20, 5, 3.5, '#4d91cf');
        R(x, 2, 27, 26, 2, '#3d2423');
      } else {   // obsidian
        poly(x, [[4, 28], [9, 6], [14, 28]], '#bd0029'); poly(x, [[9, 6], [11, 28], [14, 28]], '#ff3444');
        poly(x, [[12, 28], [20, 2], [26, 28]], '#9c0f4e'); poly(x, [[20, 2], [22, 28], [26, 28]], '#ff6f7a');
        poly(x, [[1, 28], [3, 16], [8, 28]], '#a10046'); poly(x, [[22, 28], [27, 14], [29, 28]], '#bd0029');
      }
    });
  }
  // ── 화폐 아이콘 (9px) ───────────────────────────────────────
  function coin(type) {
    return sprite('coin' + type, 10, 10, x => {
      if (type === 'shell') { poly(x, [[1, 8], [5, 1], [9, 8]], '#5fe0ef'); R(x, 2, 8, 7, 1, '#2aa7c9'); R(x, 4, 3, 1, 5, '#2aa7c9'); R(x, 6, 3, 1, 5, '#2aa7c9'); }
      else if (type === 'scrap') { E(x, 5, 5, 4, 4, '#4a74d6'); E(x, 5, 5, 1.5, 1.5, '#1b2a55'); for (let a = 0; a < 8; a++) R(x, 5 + Math.cos(a * .785) * 4.3 - .5, 5 + Math.sin(a * .785) * 4.3 - .5, 1, 1, '#4a74d6'); }
      else if (type === 'crystal') { poly(x, [[1, 3], [5, 1], [9, 3], [5, 5]], '#a479ff'); poly(x, [[1, 3], [5, 5], [5, 9], [1, 7]], '#524cee'); poly(x, [[5, 5], [9, 3], [9, 7], [5, 9]], '#29305a'); }
      else if (type === 'mush') { E(x, 5, 4, 4, 3, '#ffb95f'); R(x, 4, 5, 2, 4, '#f6e3a0'); R(x, 3, 3, 1, 1, '#fffffd'); }
      else if (type === 'obsidian') { poly(x, [[2, 9], [5, 1], [8, 9]], '#ff3444'); poly(x, [[5, 1], [6, 9], [8, 9]], '#ff6f7a'); }
      else if (type === 'flask') { R(x, 4, 1, 2, 3, '#dfe6f0'); poly(x, [[3, 4], [7, 4], [9, 9], [1, 9]], '#dfe6f0'); poly(x, [[2, 6], [8, 6], [9, 9], [1, 9]], '#3ee08a'); }
      else if (type === 'jelly') { E(x, 5, 4, 4, 3, '#cc85f3'); R(x, 2, 6, 1, 3, '#cc85f3'); R(x, 5, 6, 1, 3, '#cc85f3'); R(x, 8, 6, 1, 3, '#cc85f3'); }
      else E(x, 5, 5, 4, 4, '#fff');
    });
  }
  // ── 섬 시설 ──────────────────────────────────────────────
  function store() {
    return sprite('store', 70, 46, x => {
      E(x, 56, 34, 13, 13, '#4f9a3a'); E(x, 56, 31, 11, 11, '#6fbf4c'); for (let i = 0; i < 4; i++) R(x, 47 + i * 5, 24, 1, 20, '#4f9a3a');
      R(x, 4, 22, 46, 20, '#3a8fb8'); R(x, 4, 22, 46, 3, '#57b0d8'); R(x, 2, 40, 52, 4, '#2c6f95');
      for (let i = 0; i < 6; i++) R(x, 6 + i * 7, 16, 7, 6, i % 2 ? '#fdf2f7' : '#e86fb0'); R(x, 6, 21, 42, 1, '#b84f87');
      R(x, 8, 2, 38, 13, '#57b0d8'); R(x, 9, 3, 36, 11, '#3a8fb8');
      // SHOP 글자 (작은 픽셀)
      const L = { S: [7, 4, 7, 1, 7], H: [5, 5, 7, 5, 5], O: [7, 5, 5, 5, 7], P: [7, 5, 7, 4, 4] };
      'SHOP'.split('').forEach((ch, i) => L[ch].forEach((bits, r) => { for (let c = 0; c < 3; c++) if (bits & (4 >> c)) R(x, 14 + i * 7 + c * 2, 5 + r * 2 - 1, 2, 2, '#e6faff'); }));
      R(x, 10, 28, 34, 3, '#2c6f95'); R(x, 12, 31, 3, 9, '#2c6f95'); R(x, 39, 31, 3, 9, '#2c6f95');
    });
  }
  function chest(open, safe) {
    return sprite('chest' + (open ? 'O' : 'C') + (safe ? 'S' : ''), 36, 22, x => {
      if (safe) { R(x, 6, 2, 24, 18, '#7a7f8a'); R(x, 8, 4, 20, 14, '#9aa0ab'); E(x, 18, 11, 4, 4, '#4b4f57'); R(x, 17, 10, 2, 2, '#ffd84a'); return; }
      R(x, 6, 10, 24, 10, '#dfe6f0'); R(x, 6, 10, 24, 2, '#ffffff'); R(x, 8, 13, 20, 5, '#1f4f8a'); R(x, 10, 14, 6, 3, '#3b7fd0');
      if (open) { R(x, 9, 2, 18, 8, '#9aa0ab'); R(x, 11, 3, 14, 6, '#6e7a86'); } else { R(x, 6, 6, 24, 5, '#9aa0ab'); }
      E(x, 4, 17, 4, 4, '#7c8de8'); E(x, 4, 17, 2, 2, '#c2ccff'); E(x, 32, 17, 4, 4, '#7c8de8'); E(x, 32, 17, 2, 2, '#c2ccff');
      if (open) { E(x, 14, 9, 3, 2, '#5fe0ef'); E(x, 20, 8, 3, 2, '#ffb9da'); E(x, 24, 10, 2, 2, '#5fe0ef'); }
    });
  }
  function transmuter(on, broken) {
    return sprite('trans' + (on ? 1 : 0) + (broken ? 'B' : ''), 80, 44, x => {
      R(x, 2, 30, 76, 12, '#4e5b52'); R(x, 4, 32, 72, 4, '#d8dcc0'); R(x, 2, 40, 76, 2, '#2f3a35');
      R(x, 6, 18, 10, 14, '#3e4a6e'); R(x, 7, 21, 2, 6, '#1a2240'); R(x, 60, 20, 16, 12, '#2a73b8'); R(x, 62, 16, 8, 6, '#2a73b8'); E(x, 66, 15, 4, 3, '#7fe3ff');
      R(x, 18, 22, 10, 10, '#2a73b8'); E(x, 23, 21, 4, 3, '#7fe3ff');
      E(x, 42, 16, 14, 14, broken ? '#4c5552' : on ? '#7ad8a8' : '#5a6b62'); E(x, 37, 9, 3, 3, '#ffffff'); R(x, 32, 28, 22, 4, '#8a8f80');
      R(x, 54, 12, 8, 3, '#7a7f8a'); R(x, 60, 12, 3, 10, '#7a7f8a');
      if (broken) { R(x, 30, 10, 2, 8, '#2e111a'); R(x, 46, 18, 6, 2, '#2e111a'); }
    });
  }
  function alchemy(broken) {
    return sprite('alch' + (broken ? 'B' : ''), 74, 42, x => {
      R(x, 4, 34, 66, 7, '#4b4747'); R(x, 6, 30, 62, 5, '#6b6560');
      E(x, 40, 18, 15, 15, broken ? '#6a5a4a' : '#8a7356'); R(x, 25, 18, 30, 14, broken ? '#6a5a4a' : '#8a7356'); E(x, 40, 12, 10, 7, '#a08766');
      R(x, 36, 8, 8, 20, '#5b4c3c'); poly(x, [[37, 14], [43, 14], [45, 26], [35, 26]], '#efe9df'); poly(x, [[36, 21], [44, 21], [45, 26], [35, 26]], broken ? '#555' : '#3ee08a');
      R(x, 8, 6, 3, 26, '#8a7356'); R(x, 8, 6, 16, 3, '#8a7356'); R(x, 56, 16, 14, 4, '#8a7356'); E(x, 68, 18, 3, 3, '#6b6560');
      E(x, 12, 33, 3, 2, '#7c8de8'); E(x, 62, 33, 3, 2, '#7c8de8');
    });
  }
  function storage(fixed) {
    return sprite('stor' + (fixed ? 1 : 0), 30, 14, x => {
      R(x, 6, 6, 18, 8, fixed ? '#2a9ad8' : '#5a6b72'); R(x, 6, 6, 18, 2, fixed ? '#5fc6f3' : '#7a8a92'); E(x, 15, 10, 2.5, 2, '#1a2240');
      R(x, 14, 2, 2, 4, '#b7ad9b'); R(x, 2, 1, 26, 2, fixed ? '#d8dcc0' : '#7a7f74');
    });
  }
  function hammock(state) {
    return sprite('ham' + state, 62, 30, x => {
      R(x, 1, 2, 3, 26, '#7e6f5a'); R(x, 58, 2, 3, 26, '#7e6f5a');
      if (state === 'broken') { poly(x, [[4, 6], [16, 20], [12, 22], [4, 9]], '#2b4fa8'); poly(x, [[58, 6], [46, 20], [50, 22], [58, 9]], '#2b4fa8'); return; }
      for (let i = 0; i <= 54; i++) { const t = i / 54, y = 6 + Math.sin(t * Math.PI) * 14; R(x, 4 + i, y, 1, 4, i % 6 < 3 ? '#2b4fa8' : '#3d66c8'); }
    });
  }
  function antenna(f) {
    return sprite('ant' + (f || 0), 72, 48, x => {
      R(x, 2, 34, 68, 13, '#2a5f8a'); R(x, 2, 34, 68, 3, '#3d7fb0');
      poly(x, [[18, 36], [36, 2], [54, 36]], '#8fd0f0'); poly(x, [[36, 2], [42, 36], [54, 36]], '#5ea8d8'); for (let i = 0; i < 4; i++) R(x, 24 + i * 7, 14 + i * 5, 10 - i, 2, '#5ea8d8');
      R(x, 6, 16, 12, 12, '#2a5f8a'); R(x, 8, 18, 8, 7, '#ffe36b'); R(x, 54, 18, 12, 12, '#2a5f8a'); R(x, 56, 20, 8, 7, '#ffe36b');
      R(x, 28, 30, 16, 10, '#2a5f8a'); R(x, 30, 32, 12, 6, '#ffe36b'); R(x, 35, 33, 2, 4, '#2a5f8a'); R(x, 34, 33, 4, 1, '#2a5f8a');
      if (f) R(x, 35, 0, 2, 2, '#ff6b8a');
    });
  }
  function house(col) {
    const C = { blue: ['#3a7fd0', '#2a5fa8'], yellow: ['#c9a83a', '#9a7f22'], pink: ['#c46fb8', '#94518a'] }[col] || ['#3a7fd0', '#2a5fa8'];
    return sprite('house' + col, 40, 34, x => {
      R(x, 6, 16, 28, 18, '#4d6fa0'); R(x, 8, 18, 24, 16, '#5c80b4'); R(x, 22, 22, 7, 12, '#3a2a40'); E(x, 25.5, 22, 3.5, 3, '#3a2a40');
      E(x, 12, 24, 3, 3, '#2e3a5a'); E(x, 12, 24, 1.5, 1.5, '#8ab0e0');
      E(x, 20, 14, 19, 11, C[0]); R(x, 1, 14, 38, 6, C[0]); for (let i = 0; i < 5; i++) R(x, 4 + i * 7, 6 + (i % 2), 2, 12, C[1]);
    });
  }
  function palm(v) {
    return sprite('palm' + v, 40, 58, x => {
      for (let i = 0; i < 40; i++) R(x, 18 + Math.sin(i / 9 + v) * 3, 18 + i, 5, 1, i % 6 < 3 ? '#4a8fb0' : '#6ab0cf');
      const leaf = (a, l) => { for (let i = 0; i < l; i++) { const t = i / l; R(x, 20 + Math.cos(a) * i, 17 + Math.sin(a) * i + t * t * 7, 3, 2, i % 5 === 4 ? '#2f9a62' : '#45c07c'); } };
      leaf(-2.6, 18); leaf(-.5, 18); leaf(-1.6, 12); leaf(-3.1, 15); leaf(0, 15); E(x, 21, 18, 4, 3, '#2f9a62');
    });
  }
  function npc(f) {
    return sprite('npc' + f, 22, 20, x => {
      E(x, 11, 14, 8, 5, '#2aa58a'); E(x, 11, 9, 6, 6, '#3fc8a6'); E(x, 11, 5, 6, 3, '#4a6fd8');
      R(x, 8, 8, 2, 2, OL); R(x, 13, 8, 2, 2, OL); R(x, 3 - f, 16, 4, 2, '#3fc8a6'); R(x, 15 + f, 16, 4, 2, '#3fc8a6');
    });
  }
  // ── 무기·탄 ──────────────────────────────────────────────
  function bubble(r, crit) {
    const s = Math.max(6, Math.round(r * 2) + 2), key = 'bub' + s + (crit ? 'c' : '');
    return sprite(key, s, s, x => {
      const c = s / 2;
      for (let a = 0; a < 360; a += 3) { const q = a * Math.PI / 180; R(x, c + Math.cos(q) * (c - 1) - .5, c + Math.sin(q) * (c - 1) - .5, 1, 1, crit ? '#ffd84a' : '#fff9ef'); }
      E(x, c + c * .35, c - c * .4, Math.max(1, c * .22), Math.max(1, c * .22), '#ffffff'); R(x, c - c * .55, c + c * .45, Math.max(1, c * .12), Math.max(1, c * .12), '#ffffff');
    }, false);
  }
  function gun(type) {
    return sprite('gun' + type, 14, 8, x => {
      if (type === 'bubble') { R(x, 2, 2, 9, 4, '#5fd0f0'); R(x, 10, 3, 3, 2, '#2a9ad8'); R(x, 3, 5, 3, 3, '#2a9ad8'); R(x, 4, 1, 3, 1, '#ff6b8a'); }
      else { R(x, 1, 2, 10, 3, '#4a5a8a'); R(x, 9, 1, 4, 5, '#2e3a5a'); R(x, 3, 5, 3, 3, '#4a5a8a'); R(x, 11, 3, 2, 1, '#7fe3ff'); }
    });
  }
  function starfish(f) {
    return sprite('star' + f, 18, 18, x => {
      const pts = []; for (let i = 0; i < 10; i++) { const a = -Math.PI / 2 + i * Math.PI / 5 + f * .05, r = i % 2 ? 3.5 : 8; pts.push([9 + Math.cos(a) * r, 9 + Math.sin(a) * r]); }
      poly(x, pts, '#c47ae8'); R(x, 7, 8, 1, 2, OL); R(x, 10, 8, 1, 2, OL); E(x, 9, 6, 2, 1, '#e8b8ff');
    });
  }
  function robot(f) {
    return sprite('robo' + f, 16, 16, x => {
      E(x, 8, 9, 6, 5, '#2a73b8'); E(x, 9, 7, 4, 3, '#5fb0f0'); R(x, 9, 6, 2, 2, OL); R(x, 1, 8 + f, 3, 2, '#7fe3ff'); R(x, 13, 7, 2, 4, '#1a4a7a'); R(x, 7, 1, 2, 3, '#1a4a7a');
    });
  }
  function puffle(f) {
    return sprite('puff' + f, 20, 20, x => {
      E(x, 10, 10, 7 + (f % 2 ? .5 : 0), 7, '#ffc23a'); for (let a = 0; a < 10; a++) { const q = a * .628; R(x, 10 + Math.cos(q) * 8 - .5, 10 + Math.sin(q) * 8 - .5, 1, 2, '#e0901a'); }
      R(x, 7, 8, 2, 2, OL); R(x, 12, 8, 2, 2, OL); R(x, 9, 12, 3, 1, '#e0901a'); E(x, 7, 6, 2, 1, '#fff3a0');
    });
  }
  // ── 바다 장식 ───────────────────────────────────────────────
  function coral(v, biome) {
    const P = { shallows: ['#ff8a6b', '#ffb98f', '#d35a4a'], glacial: ['#9fe6ff', '#e0fbff', '#5fb0d8'], swamp: ['#5fcf6a', '#a8f376', '#2f8a3a'], magma: ['#5a6fe8', '#8a9bff', '#3a3fa8'] }[biome] || ['#ff8a6b', '#ffb98f', '#d35a4a'];
    return sprite('coral' + biome + v, 26, 30, x => {
      const br = (X, Y, a, l, w) => { for (let i = 0; i < l; i++) R(x, X + Math.sin(a) * i, Y - Math.cos(a) * i, w, 1, i % 4 === 3 ? P[2] : P[0]); return [X + Math.sin(a) * l, Y - Math.cos(a) * l]; };
      const s = v * 1.7;
      const [ax, ay] = br(12, 29, -.15 + s * .1, 14, 3); br(ax, ay, -.7, 9, 2); br(ax, ay, .5, 10, 2); br(12, 22, .8, 9, 2);
      E(x, ax, ay, 2, 2, P[1]);
    });
  }
  function kelp(v) {
    return sprite('kelp' + v, 12, 40, x => { for (let i = 0; i < 38; i++) { const o = Math.sin(i / 5 + v) * 2.5; R(x, 5 + o, 39 - i, 2, 1, '#3aa562'); if (i % 7 === 3) R(x, 7 + o, 39 - i, 3, 2, '#5fcf6a'); } });
  }

  // ── 배경 띠 (원작처럼 색 띠 + 물결 윗선) ─────────────────────────
  const BG = {
    island: ['#e4d85f', '#ffd563', '#ffd563', '#e1a05b', '#bd7751'],
    shallows: ['#bd7751', '#ae8d42', '#826030', '#582c2c', '#301218'],
    glacial: ['#bd7751', '#e8f5a3', '#d1d764', '#9e935e', '#695531'],
    swamp: ['#4ca475', '#3c7b37', '#425331', '#2d2d15', '#1d1d0d'],
    magma: ['#426eae', '#303f82', '#2c265e', '#0e1334', '#090b22'],
  };
  function band(key, w, h, col, amp, seed, deco) {   // 너비 w 반복 가능한 띠 하나
    return sprite('band' + key, w, h, x => {
      for (let X = 0; X < w; X++) {
        const t = X / w * Math.PI * 2;
        const y = Math.round(amp * (1 + Math.sin(t * 3 + seed) * .5 + Math.sin(t * 7 + seed * 2) * .3 + Math.sin(t * 13 + seed) * .2));
        R(x, X, y, 1, h - y, col);
        if (deco && X % 23 === (seed * 5 | 0) % 23) R(x, X, y - 3, 1, 3, col);
      }
    }, false);
  }
  function cloud() {
    return sprite('cloud', 120, 50, x => {
      [[20, 34, 16, 12], [40, 26, 18, 16], [62, 20, 20, 18], [84, 28, 18, 14], [100, 36, 14, 10], [60, 38, 50, 12]].forEach(([a, b, c, d]) => E(x, a, b, c, d, '#fcffdd'));
      [[42, 20, 8, 6], [66, 14, 9, 6]].forEach(([a, b, c, d]) => E(x, a, b, c, d, '#ffffff'));
    }, false);
  }

  // ── 스킬 아이콘 (원작처럼 종류별 그림 + 오른쪽 아래 단계 표시) ──────────────────
  function skillKind(id) {
    const K = [
      [/^(oxygen|deep_breath|jellyfish_oxygen|resource_oxygen)/, 'o2'], [/^(bubble|chain_bubble|homing)/, 'bubble'], [/^(plasma|double_plasma|mult_reload)/, 'plasma'],
      [/^(jellyfish_value|biovalue)/, 'jval'], [/^biodiversity_(\w+)/, 'bio'], [/^(store|agile|expedition)/, 'store'], [/^(chest_speed|global_chest)/, 'chest'],
      [/^(player_slot|slot_capacity|player_slots)/, 'pack'], [/^pickup/, 'magnet'], [/^movement/, 'feet'], [/^(scrap)/, 'scrap'], [/^(crystal)/, 'crystal'],
      [/^(mushroom)/, 'mush'], [/^(obsidian)/, 'obsidian'], [/^friendly/, 'puffle'], [/^starfish/, 'star'], [/^robot/, 'robot'],
      [/^(transmutator|jellyfish_transmutator|faster_output)/, 'trans'], [/^(storage|submarine_storage)/, 'storage'], [/^(alchemy|flask)/, 'flask'],
      [/^submarine/, 'sub'], [/^cellphone/, 'phone'], [/^hammock/, 'hammock'], [/^shock/, 'shock'], [/^entity/, 'wave'], [/^jellyfish_insurance/, 'shield'],
    ];
    for (const [re, k] of K) if (re.test(id)) return k;
    return 'bubble';
  }
  const BIOC = { shallows: '#ff9fc7', glacial: '#9fe6ff', swamp: '#a8f376', magma: '#ff6b6b' };
  function skillIcon(id, special) {
    const kind = skillKind(id), tier = /_(\d+)$/.exec(id), t = tier ? +tier[1] : 0, rare = /rare|_10$|final|ultra/.test(id) || special;
    return sprite('sk_' + id, 20, 20, x => {
      const c = 10;
      switch (kind) {
        case 'o2': E(x, c, c, 7, 7, '#2f9a62'); E(x, c, c, 5.5, 5.5, '#45c07c'); R(x, 6, 8, 3, 4, '#e8fff0'); R(x, 7, 9, 1, 2, '#2f9a62'); R(x, 10, 10, 3, 1, '#e8fff0'); R(x, 12, 9, 1, 2, '#e8fff0'); R(x, 10, 11, 1, 1, '#e8fff0'); R(x, 10, 12, 3, 1, '#e8fff0'); break;
        case 'bubble': E(x, c, c, 7, 7, '#ffd9b8'); E(x, c, c, 5.5, 5.5, '#ffe9d6'); E(x, 13, 7, 2, 2, '#ffffff'); R(x, 6, 13, 2, 2, '#ffffff');
          if (/damage|smite|execute|first/.test(id)) R(x, 8, 9, 4, 2, '#ff6b8a'); if (/tank|capacity/.test(id)) R(x, 9, 6, 2, 8, '#5fa0ff'); if (/reload|firerate/.test(id)) poly(x, [[8, 6], [13, 10], [8, 14]], '#5fa0ff'); if (/crit/.test(id)) R(x, 9, 7, 2, 6, '#ffd84a'); break;
        case 'plasma': poly(x, [[11, 2], [5, 11], [9, 11], [7, 18], [15, 8], [11, 8], [13, 2]], '#7fe3ff'); poly(x, [[11, 3], [7, 10], [10, 10]], '#e6fbff'); break;
        case 'jval': E(x, 9, 8, 6, 5, '#cc85f3'); for (let i = 0; i < 3; i++) R(x, 5 + i * 4, 12, 2, 5, '#cc85f3'); E(x, 15, 14, 4, 4, '#ffd84a'); R(x, 14, 12, 2, 4, '#c08a1a'); break;
        case 'bio': { const b = /biodiversity_(\w+)/.exec(id); const col = BIOC[b ? b[1] : 'shallows'] || '#cc85f3'; E(x, 10, 8, 7, 6, col); for (let i = 0; i < 3; i++) R(x, 5 + i * 4, 13, 2, 5, col); R(x, 7, 7, 2, 2, OL); R(x, 11, 7, 2, 2, OL); break; }
        case 'store': R(x, 3, 8, 14, 9, '#3a8fb8'); for (let i = 0; i < 4; i++) R(x, 3 + i * 4, 4, 4, 4, i % 2 ? '#fdf2f7' : '#e86fb0'); R(x, 8, 11, 4, 6, '#2c6f95'); break;
        case 'chest': R(x, 3, 8, 14, 9, '#dfe6f0'); R(x, 3, 5, 14, 4, '#9aa0ab'); R(x, 5, 11, 10, 3, '#1f4f8a'); if (/global/.test(id)) { R(x, 3, 5, 14, 12, '#7a7f8a'); E(x, 10, 11, 3, 3, '#4b4f57'); } break;
        case 'pack': E(x, 10, 11, 7, 7, '#6e9c3a'); E(x, 10, 10, 5, 5, '#8fbf4c'); R(x, 7, 8, 2, 2, '#4f7a2a'); R(x, 11, 12, 2, 2, '#4f7a2a'); R(x, 5, 3, 10, 3, '#a3622a'); break;
        case 'magnet': R(x, 4, 4, 4, 10, '#e84a5a'); R(x, 12, 4, 4, 10, '#e84a5a'); R(x, 4, 12, 12, 4, '#e84a5a'); R(x, 4, 3, 4, 3, '#dfe6f0'); R(x, 12, 3, 4, 3, '#dfe6f0'); break;
        case 'feet': E(x, 7, 12, 3, 5, '#45c07c'); E(x, 13, 9, 3, 5, '#45c07c'); R(x, 5, 6, 2, 2, '#45c07c'); R(x, 11, 3, 2, 2, '#45c07c'); break;
        case 'scrap': case 'crystal': case 'mush': case 'obsidian': {
          const s = coin(kind); x.drawImage(s, 2, 2, s.width * 1.5, s.height * 1.5);
          if (/final/.test(id)) { E(x, 15, 5, 3, 3, '#ffd84a'); } if (/increase/.test(id)) R(x, 13, 13, 5, 2, '#45c07c'); break; }
        case 'puffle': { const s = puffle(0); x.drawImage(s, 0, 0, 20, 20); break; }
        case 'star': { const s = starfish(0); x.drawImage(s, 0, 0, 20, 20); break; }
        case 'robot': { const s = robot(0); x.drawImage(s, 1, 1, 18, 18); break; }
        case 'trans': E(x, 10, 9, 7, 7, '#7ad8a8'); E(x, 7, 6, 2, 2, '#ffffff'); R(x, 3, 15, 14, 3, '#4e5b52'); if (/golden/.test(id)) E(x, 10, 9, 3, 3, '#ffd84a'); if (/emerald/.test(id)) E(x, 10, 9, 3, 3, '#3ee08a'); break;
        case 'storage': { const s = storage(true); x.drawImage(s, -2, 3, 24, 11); break; }
        case 'flask': { const s = coin('flask'); x.drawImage(s, 1, 1, 18, 18); break; }
        case 'sub': { const s = submarine(); x.drawImage(s, 0, 1, 20, 18); break; }
        case 'phone': R(x, 6, 2, 9, 16, '#2e3a5a'); R(x, 7, 4, 7, 10, '#7fe3ff'); R(x, 9, 15, 3, 1, '#7fe3ff'); break;
        case 'hammock': for (let i = 0; i <= 16; i++) { const y = 6 + Math.sin(i / 16 * Math.PI) * 7; R(x, 2 + i, y, 1, 3, '#3d66c8'); } R(x, 1, 3, 2, 14, '#7e6f5a'); R(x, 17, 3, 2, 14, '#7e6f5a'); break;
        case 'shock': poly(x, [[11, 2], [5, 11], [9, 11], [7, 18], [15, 8], [11, 8], [13, 2]], '#ff6b6b'); break;
        case 'wave': for (let i = 0; i < 3; i++) for (let k = 0; k < 16; k++) R(x, 2 + k, 5 + i * 5 + Math.round(Math.sin(k / 2.5) * 1.5), 1, 2, '#5fd0f0'); break;
        case 'shield': poly(x, [[10, 2], [17, 5], [15, 14], [10, 18], [5, 14], [3, 5]], '#5a8fd8'); E(x, 10, 9, 3, 3, '#cc85f3'); break;
      }
      // 단계 표시: 원작의 초록 + 표시처럼 오른쪽 아래 점
      const pips = t >= 10 ? 0 : Math.min(t, 5);
      for (let i = 0; i < pips; i++) R(x, 17 - i * 3, 17, 2, 2, '#45e070');
      if (rare) { R(x, 16, 1, 3, 1, '#ffd84a'); R(x, 17, 0, 1, 3, '#ffd84a'); }
    });
  }

  window.SDArt = { skillIcon, skillKind, sprite, flip, outline, turtle, helmet, jelly, submarine, block, coin, store, chest, transmuter, alchemy, storage, hammock, antenna, house, palm, npc, bubble, gun, starfish, robot, puffle, coral, kelp, band, cloud, BG, JC, OL, mk, R, E, poly };
})();
