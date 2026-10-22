// 로켓 쥐 — 그림은 전부 직접 그린 것(원작 이미지는 쓰지 않음).
// 원작처럼 320×180 픽셀아트로 보이게: 작은 오프스크린 캔버스에 벡터로 그린 뒤 알파를 0/255로 자르고
// 1px 진한 외곽선을 둘러 '픽셀 스프라이트'로 굽는다. 크기·원점은 원작 스프라이트(_sprites.json)와 같게 맞춘다.
(function () {
  'use strict';
  const OUT = '#231c35';
  const mk = (w, h) => { const c = document.createElement('canvas'); c.width = w; c.height = h; return c; };

  // 벡터 그림 → 픽셀 스프라이트 (알파 이진화 + 외곽선). opts.outline=false 면 외곽선 없음.
  function bake(w, h, draw, opts = {}) {
    const c = mk(w, h), g = c.getContext('2d');
    draw(g);
    const img = g.getImageData(0, 0, w, h), d = img.data;
    for (let i = 3; i < d.length; i += 4) d[i] = d[i] >= (opts.cut ?? 110) ? 255 : 0;
    if (opts.outline !== false) {
      const solid = new Uint8Array(w * h);
      for (let i = 0; i < w * h; i++) solid[i] = d[i * 4 + 3] ? 1 : 0;
      const oc = hex(opts.outlineColor || OUT);
      for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
        const i = y * w + x; if (solid[i]) continue;
        if ((x > 0 && solid[i - 1]) || (x < w - 1 && solid[i + 1]) || (y > 0 && solid[i - w]) || (y < h - 1 && solid[i + w])) {
          d[i * 4] = oc[0]; d[i * 4 + 1] = oc[1]; d[i * 4 + 2] = oc[2]; d[i * 4 + 3] = 255;
        }
      }
    }
    g.putImageData(img, 0, 0);
    return c;
  }
  function hex(s) { const n = parseInt(s.slice(1), 16); return [n >> 16 & 255, n >> 8 & 255, n & 255]; }
  function ell(g, x, y, rx, ry, fill, rot = 0) { g.beginPath(); g.ellipse(x, y, Math.max(.1, rx), Math.max(.1, ry), rot, 0, Math.PI * 2); g.fillStyle = fill; g.fill(); }
  function rect(g, x, y, w, h, fill) { g.fillStyle = fill; g.fillRect(x, y, w, h); }
  function rrect(g, x, y, w, h, r, fill) { g.beginPath(); g.roundRect(x, y, w, h, r); g.fillStyle = fill; g.fill(); }
  function line(g, pts, w, col) { g.beginPath(); g.moveTo(pts[0][0], pts[0][1]); for (let i = 1; i < pts.length; i++) g.lineTo(pts[i][0], pts[i][1]); g.lineWidth = w; g.strokeStyle = col; g.lineCap = 'round'; g.lineJoin = 'round'; g.stroke(); }
  function poly(g, pts, fill) { g.beginPath(); g.moveTo(pts[0][0], pts[0][1]); for (let i = 1; i < pts.length; i++) g.lineTo(pts[i][0], pts[i][1]); g.closePath(); g.fillStyle = fill; g.fill(); }
  function starPts(cx, cy, r1, r2, n = 5, rot = -Math.PI / 2) { const p = []; for (let i = 0; i < n * 2; i++) { const r = i % 2 ? r2 : r1, a = rot + i * Math.PI / n; p.push([cx + Math.cos(a) * r, cy + Math.sin(a) * r]); } return p; }

  // ---- 쥐 6종 ---------------------------------------------------------------------------------
  // 원작 프레임 64×64, 원점 (28,45) = 발 아래 가운데. 오른쪽을 본다(왼쪽은 좌우 반전해서 찍음).
  const RATS = {
    white:   { fur: '#e9d2b0', belly: '#f6e8d2', ear: '#f5a3b8', cloth: '#f08a3a', cloth2: '#c96424', tail: '#f08aa6' },
    nerd:    { fur: '#5d6170', belly: '#7a7f90', ear: '#f5a3b8', cloth: '#f4f2ee', cloth2: '#d7d3cc', tail: '#f08aa6', glasses: true, cross: '#e8545a' },
    soldier: { fur: '#f3f1ed', belly: '#ffffff', ear: '#f5a3b8', cloth: '#5f8a48', cloth2: '#46693a', tail: '#f08aa6', cap: '#5f8a48' },
    doctor:  { fur: '#50525d', belly: '#686b78', ear: '#f5a3b8', cloth: '#3e4049', cloth2: '#2e3037', tail: '#f08aa6', beak: '#3a3c45', lens: '#74e86a' },
    robot:   { fur: '#8ea4c0', belly: '#b3c4da', ear: '#6f86a6', cloth: '#6f86a6', cloth2: '#56698a', tail: '#56698a', metal: true, lens: '#a8e1ff' },
    eletric: { fur: '#86e3cb', belly: '#b8f2e2', ear: '#f5a3b8', cloth: '#3fb595', cloth2: '#2f8f76', tail: '#5fd1b2', helmet: '#8e96a6' },
  };
  // pose: {bob, legA, legB, tailUp, blink, squash, hurt}
  function drawRat(g, P, pose) {
    const b = pose.bob || 0, sq = pose.squash || 0;
    g.save(); g.translate(0, b);
    // 꼬리
    const tu = pose.tailUp || 0;
    line(g, [[16, 38], [10, 36 - tu * .3], [6, 30 - tu], [8, 25 - tu]], 2.2, P.tail);
    // 뒷다리·앞다리 (몸 뒤쪽 먼저)
    const la = pose.legA || 0, lb = pose.legB || 0;
    ell(g, 20 + la, 45 - b, 3.2, 2.4, P.fur); ell(g, 41 + lb, 45 - b, 3, 2.3, P.fur);
    // 몸통
    ell(g, 29, 37, 15 + sq, 9 - sq * .5, P.fur);
    ell(g, 31, 41, 11, 4.5, P.belly);
    // 옷(앞쪽 몸통을 감싸는 띠)
    g.save(); g.beginPath(); g.ellipse(29, 37, 15 + sq, 9 - sq * .5, 0, 0, Math.PI * 2); g.clip();
    ell(g, 44, 37, 13, 13, P.cloth);                      // 앞쪽을 감싸는 조끼(곡선 경계)
    ell(g, 46, 41, 9, 6, P.cloth2);
    if (P.cross) { rect(g, 36, 34, 4.5, 1.6, P.cross); rect(g, 37.4, 32.6, 1.6, 4.4, P.cross); }
    if (P.metal) { ell(g, 22, 34, 1, 1, '#d9e4f2'); ell(g, 27, 39, 1, 1, '#d9e4f2'); rect(g, 15, 36, 18, 1.2, '#7b91b0'); }
    g.restore();
    // 앞다리(몸 앞)
    ell(g, 24 - la, 46 - b, 3.2, 2.4, P.fur); ell(g, 37 - lb, 46 - b, 3, 2.3, P.fur);
    // 등가방(로켓 팩)
    rrect(g, 20, 24, 12, 9, 2, '#3c4a72'); rect(g, 22, 26, 8, 2, '#56689a'); rect(g, 19, 31, 3, 4, '#2c3656');
    // 머리
    ell(g, 45, 32, 9, 8.2, P.fur);
    if (!P.metal) { g.save(); g.beginPath(); g.ellipse(45, 32, 9, 8.2, 0, 0, Math.PI * 2); g.clip(); rrect(g, 34, 35, 8, 9, 3, P.cloth); g.restore(); }   // 목도리·깃
    poly(g, [[49, 27], [58, 33], [57, 36], [48, 38]], P.fur);
    ell(g, 46, 36, 6, 3, P.belly);
    ell(g, 58, 34.5, 1.8, 1.6, '#f07fa0');           // 코
    // 귀
    ell(g, 41, 24, 5.8, 6, P.fur); ell(g, 41, 24.5, 3.4, 3.8, P.ear);
    if (P.helmet) { rrect(g, 37, 21, 15, 12, 2, P.helmet); rect(g, 39, 23, 11, 3, '#b8c0ce'); rect(g, 44, 18, 2, 4, '#6e7686'); }
    if (P.cap) { poly(g, [[37, 25], [51, 23], [54, 26], [37, 28]], P.cap); ell(g, 44, 23.5, 7, 3.6, P.cap); rect(g, 41, 22, 2, 1.4, '#86ad6a'); }
    // 눈 (콩눈)
    if (P.beak) {
      poly(g, [[46, 29], [60, 35], [58, 38], [46, 37]], P.beak);
      ell(g, 47, 31.5, 3.6, 3.6, '#2b2d34'); ell(g, 47, 31.5, 2.2, 2.2, P.lens);
    } else if (P.glasses) {
      ell(g, 47.5, 31, 4.6, 4.6, '#cfdaea'); ell(g, 47.5, 31, 3.2, 3.2, '#3a3d4a');
      if (!pose.blink) ell(g, 48, 31, 1.3, 1.6, '#f4f6fa');
    } else if (P.metal) {
      ell(g, 48, 31, 2.6, 2.6, '#33405c'); ell(g, 48, 31, 1.6, 1.6, P.lens);
    } else if (pose.blink) {
      rect(g, 46, 31, 4, 1.2, OUT);
    } else {
      ell(g, 48, 31, 1.5, 2.1, OUT); ell(g, 48.4, 30.2, .5, .6, '#ffffff');
    }
    if (!P.beak && !P.metal) ell(g, 51, 35.5, 1.8, 1, '#f7a8b8');   // 볼터치
    if (pose.hurt) { g.globalCompositeOperation = 'source-atop'; g.fillStyle = 'rgba(255,255,255,.75)'; g.fillRect(0, 0, 64, 64); }
    g.restore();
  }
  // 원작 프레임 수에 맞춰 굽는다: idle 13, move 12, hurt 8, dead 10, blink 13
  const ratCache = {};
  function ratFrames(kind) {
    if (ratCache[kind]) return ratCache[kind];
    const P = RATS[kind] || RATS.white, F = {};
    const B = pose => bake(64, 64, g => drawRat(g, P, pose));
    F.idle = Array.from({ length: 13 }, (_, i) => B({ bob: Math.round(Math.sin(i / 13 * Math.PI * 2) * .8), tailUp: Math.sin(i / 13 * Math.PI * 2) * 1.5 }));
    F.blink = Array.from({ length: 13 }, (_, i) => B({ bob: Math.round(Math.sin(i / 13 * Math.PI * 2) * .8), blink: i >= 5 && i <= 7 }));
    F.move = Array.from({ length: 12 }, (_, i) => { const a = i / 12 * Math.PI * 2; return B({ bob: Math.round(-Math.abs(Math.sin(a)) * 2), legA: Math.sin(a) * 3, legB: -Math.sin(a) * 3, tailUp: 3 + Math.cos(a) * 2, squash: Math.cos(a * 2) * .8 }); });
    F.hurt = Array.from({ length: 8 }, (_, i) => B({ hurt: i < 4, squash: i < 4 ? 2 : 0, tailUp: 5 }));
    F.dead = Array.from({ length: 10 }, (_, i) => bake(64, 64, g => { g.translate(32, 40); g.rotate(Math.min(1, i / 5) * Math.PI); g.translate(-32, -40 + Math.min(1, i / 5) * 6); drawRat(g, P, { blink: true }); }));
    F.portrait = bake(50, 37, g => { g.translate(-22, -12); g.scale(1, 1); drawRat(g, P, {}); });
    return (ratCache[kind] = F);
  }

  // ---- 적: 치즈 별·달·행성 ---------------------------------------------------------------------
  const CHEESE = { top: '#ffd25c', mid: '#f7b733', hole: '#d9902a', edge: '#e49a2a' };
  function face(g, x, y, s, closed) {
    if (closed) { rect(g, x - 3.2 * s, y, 2 * s, .9 * s, OUT); rect(g, x + 1.4 * s, y, 2 * s, .9 * s, OUT); }
    else { ell(g, x - 2.4 * s, y, .9 * s, 1.3 * s, OUT); ell(g, x + 2.4 * s, y, .9 * s, 1.3 * s, OUT); }
    line(g, [[x - 1 * s, y + 2 * s], [x, y + 2.8 * s], [x + 1 * s, y + 2 * s]], .9 * s, OUT);
    ell(g, x - 4.3 * s, y + 1.6 * s, 1.3 * s, .8 * s, '#ff9fae'); ell(g, x + 4.3 * s, y + 1.6 * s, 1.3 * s, .8 * s, '#ff9fae');
  }
  function drawStar(g, hurt, k) {   // 48×48, 원점 (24,39)
    const s = 1 + (hurt ? Math.sin(k * Math.PI) * .12 : 0);
    g.save(); g.translate(24, 26); g.scale(s, 1 / s); g.translate(-24, -26);
    poly(g, starPts(24, 27, 16, 8.5, 5, -Math.PI / 2), CHEESE.mid);
    poly(g, starPts(24, 25.5, 14, 7.2, 5, -Math.PI / 2), CHEESE.top);
    ell(g, 15, 24, 2, 1.6, CHEESE.hole); ell(g, 31, 31, 1.7, 1.4, CHEESE.hole);
    face(g, 24, 26, 1, hurt);
    g.restore();
  }
  function drawMoon(g, hurt, k) {   // 48×48, 원점 (24,39)
    const s = 1 + (hurt ? Math.sin(k * Math.PI) * .12 : 0);
    g.save(); g.translate(24, 26); g.scale(s, 1 / s); g.translate(-24, -26);
    g.beginPath(); g.arc(23, 25, 15, 0, Math.PI * 2); g.arc(31, 18, 11, 0, Math.PI * 2, true); g.fillStyle = CHEESE.mid; g.fill('evenodd');
    g.save(); g.beginPath(); g.arc(23, 25, 15, 0, Math.PI * 2); g.arc(31, 18, 11, 0, Math.PI * 2, true); g.clip('evenodd');
    ell(g, 22, 23, 14, 13, CHEESE.top); ell(g, 14, 30, 2.2, 1.8, CHEESE.hole); ell(g, 25, 35, 1.6, 1.3, CHEESE.hole);
    g.restore();
    face(g, 18, 26, .95, hurt);
    g.restore();
  }
  function drawPlanet(g, hurt, k) { // 64×64, 원점 (31,48)
    const s = 1 + (hurt ? Math.sin(k * Math.PI) * .1 : 0);
    g.save(); g.translate(31, 32); g.scale(s, 1 / s); g.translate(-31, -32);
    line(g, [[7, 35], [31, 26], [56, 30]], 0.1, 'transparent');
    g.save(); g.beginPath(); g.rect(0, 0, 64, 32); g.clip(); ring(g); g.restore();
    ell(g, 31, 32, 15, 15, '#efe3c6'); ell(g, 30, 30, 13.5, 13.5, '#fbf3df');
    ell(g, 23, 25, 3, 2.4, '#9cc8bf'); ell(g, 38, 37, 3.6, 2.6, '#9cc8bf'); ell(g, 36, 22, 2, 1.6, '#9cc8bf');
    face(g, 30, 31, 1, hurt);
    g.save(); g.beginPath(); g.rect(0, 32, 64, 32); g.clip(); ring(g); g.restore();
    g.restore();
    function ring(g) { g.beginPath(); g.ellipse(31, 33, 27, 7, -.18, 0, Math.PI * 2); g.ellipse(31, 33, 22, 4.4, -.18, 0, Math.PI * 2, true); g.fillStyle = '#f2b45a'; g.fill('evenodd'); }
  }
  const enemyCache = {};
  function enemyFrames(kind) {
    if (enemyCache[kind]) return enemyCache[kind];
    const [w, h, fn] = kind === 'planet' ? [64, 64, drawPlanet] : kind === 'moon' ? [48, 48, drawMoon] : [48, 48, drawStar];
    const F = { move: [bake(w, h, g => fn(g, false, 0))], hurt: Array.from({ length: 4 }, (_, i) => bake(w, h, g => { fn(g, true, i / 3); g.globalCompositeOperation = 'source-atop'; g.fillStyle = i < 2 ? 'rgba(255,255,255,.8)' : 'rgba(255,255,255,0)'; g.fillRect(0, 0, w, h); })) };
    return (enemyCache[kind] = F);
  }

  // ---- 무기·탄 ---------------------------------------------------------------------------------
  // 무기 스프라이트는 원작 크기/원점: single 17×8 (5,4), dual 17×12 (5,6), triple 20×16 (5,8), quad 18×20 (5,10),
  // shotgun 22×11 (5,6), bigger 21×12 (5,6), op_single 24×8 (12,4), op_dual 22×12 (11,6), triangle 23×22 (11,11)
  const GUN = { body: '#6d7f9e', dark: '#47546e', hi: '#9fb1cc' };
  function barrel(g, x, y, len, th) { rrect(g, x, y - th / 2, len, th, 1, GUN.body); rect(g, x + 1, y - th / 2, len - 2, 1, GUN.hi); rect(g, x + len - 2, y - th / 2, 2, th, GUN.dark); }
  const WEAPONS = {
    single: [17, 8, g => { barrel(g, 3, 4, 13, 4); rrect(g, 1, 2, 6, 5, 1, GUN.dark); }],
    dual: [17, 12, g => { barrel(g, 3, 3.5, 13, 3.5); barrel(g, 3, 8.5, 13, 3.5); rrect(g, 1, 2, 6, 8, 1, GUN.dark); }],
    triple: [20, 16, g => { barrel(g, 3, 3.5, 15, 3.4); barrel(g, 3, 8, 16, 3.4); barrel(g, 3, 12.5, 15, 3.4); rrect(g, 1, 2, 6, 12, 1, GUN.dark); }],
    quad: [18, 20, g => { for (let i = 0; i < 4; i++) barrel(g, 3, 3.5 + i * 4.3, 14, 3.2); rrect(g, 1, 2, 6, 16, 1, GUN.dark); }],
    shotgun: [22, 11, g => { barrel(g, 3, 4, 18, 4.5); rect(g, 15, 2, 6, 7, GUN.body); rrect(g, 1, 3, 7, 6, 1, GUN.dark); }],
    bigger: [21, 12, g => { barrel(g, 3, 6, 17, 7); rrect(g, 1, 3, 7, 7, 1, GUN.dark); }],
    op_single: [24, 8, g => { barrel(g, 1, 4, 22, 4); rect(g, 10, 2, 4, 4, GUN.dark); }],
    op_dual: [22, 12, g => { barrel(g, 1, 3.5, 20, 3.5); barrel(g, 1, 8.5, 20, 3.5); rect(g, 9, 2, 4, 8, GUN.dark); }],
    triangle: [23, 22, g => { for (let i = 0; i < 3; i++) { g.save(); g.translate(11.5, 11); g.rotate(i * Math.PI * 2 / 3); barrel(g, 0, 0, 10, 3.6); g.restore(); } ell(g, 11.5, 11, 3.6, 3.6, GUN.dark); }],
  };
  const weaponCache = {};
  function weaponSprite(kind) { if (!weaponCache[kind]) { const [w, h, fn] = WEAPONS[kind] || WEAPONS.single; weaponCache[kind] = bake(w, h, fn); } return weaponCache[kind]; }

  const spriteCache = {};
  function sprite(name) {
    if (spriteCache[name]) return spriteCache[name];
    const S = {
      // 탄: regular 18×13 (0,6), small 11×9 (0,4), big 20×16 (0,8) — 앞(오른쪽)이 둥근 노란 탄
      regular_projectile: () => bake(18, 13, g => { ell(g, 10, 6.5, 7, 5, '#ffe36b'); ell(g, 11, 5.5, 4.5, 2.6, '#fff8cf'); }),
      small_projectile: () => bake(11, 9, g => { ell(g, 6, 4.5, 4.4, 3.2, '#ffe36b'); ell(g, 6.6, 3.8, 2.6, 1.5, '#fff8cf'); }),
      big_projectile: () => bake(20, 16, g => { ell(g, 11, 8, 8, 6.2, '#ffd447'); ell(g, 12, 6.6, 5, 3.2, '#fff6c4'); }),
      star_projectile: () => bake(14, 15, g => { poly(g, starPts(7, 7.6, 6.6, 3.2), '#ff8fc0'); poly(g, starPts(7, 7.2, 4.4, 2.1), '#ffd3e6'); }),
      arrow_projectile: () => bake(14, 10, g => { rect(g, 1, 4, 9, 2, '#e8545a'); poly(g, [[9, 1.5], [14, 5], [9, 8.5]], '#ff7070'); rect(g, 0, 2.5, 3, 5, '#ffb0b0'); }),
      arrow_projectile_big: () => bake(19, 14, g => { rect(g, 1, 5.5, 12, 3, '#e8545a'); poly(g, [[12, 1.5], [19, 7], [12, 12.5]], '#ff7070'); rect(g, 0, 3.5, 4, 7, '#ffb0b0'); }),
      bomb_projectile: () => bake(14, 16, g => { ell(g, 7, 10, 5.6, 5.6, '#4a4f63'); rect(g, 6, 2, 2, 4, '#c9a46a'); ell(g, 5.2, 8.4, 1.6, 1.4, '#7c839b'); }),
      star_ally: () => bake(20, 19, g => { poly(g, starPts(10, 10, 9, 4.4), '#ffffff'); poly(g, starPts(10, 10, 6.4, 3.1), '#ffc2dc'); ell(g, 8, 9.4, .8, 1, OUT); ell(g, 12, 9.4, .8, 1, OUT); }),
      coin_01: () => bake(16, 16, g => cheeseBit(g, 1)), coin_02: () => bake(16, 16, g => cheeseBit(g, 2)),
      coin_03: () => bake(16, 16, g => cheeseBit(g, 3)), coin_04: () => bake(16, 16, g => cheeseBit(g, 4)),
      coin_ui: () => bake(16, 16, g => cheeseBit(g, 2)),
      heart_full: () => bake(26, 22, g => heart(g, '#ff4d6d', 1)), heart_half: () => bake(26, 22, g => heart(g, '#ff4d6d', .5)),
      heart_bg: () => bake(26, 22, g => heart(g, '#5a4a6e', 1)),
      heart_temp: () => bake(26, 22, g => heart(g, '#6ec8ff', 1)), heart_metal: () => bake(26, 22, g => heart(g, '#a9b6c8', 1)),
      bullet_ui: () => bake(18, 13, g => { rrect(g, 3, 4, 10, 5, 2, '#ffd25c'); rect(g, 3, 4, 3, 5, '#d98c2a'); ell(g, 13, 6.5, 2.5, 2.5, '#ffe9a0'); }),
      bullet_ui_empty: () => bake(18, 13, g => { rrect(g, 3, 4, 10, 5, 2, '#4b4363'); ell(g, 13, 6.5, 2.5, 2.5, '#4b4363'); }),
      poison_debuff: () => bake(14, 14, g => { ell(g, 7, 8, 4, 4.4, '#7be35f'); poly(g, [[4, 6], [7, 1], [10, 6]], '#7be35f'); ell(g, 6, 8, 1.2, 1.2, '#c8ffb0'); }),
      curse_debuff: () => bake(14, 14, g => { line(g, [[7, 7], [10, 7], [10, 10], [4, 10], [4, 4], [12, 4]], 1.8, '#a066ff'); }),
      stun_debuff: () => bake(14, 14, g => { poly(g, starPts(4, 6, 3, 1.4), '#ffe36b'); poly(g, starPts(10, 9, 3, 1.4), '#ffe36b'); }),
      helmet: () => bake(31, 29, g => { ell(g, 15.5, 14.5, 13.5, 12.5, 'rgba(200,235,255,0.55)'); ell(g, 10, 9, 3.5, 2.5, '#ffffff'); }, { cut: 60 }),
    };
    const f = S[name]; spriteCache[name] = f ? f() : bake(8, 8, g => rect(g, 0, 0, 8, 8, '#ff00ff'));
    return spriteCache[name];
  }
  function cheeseBit(g, n) {   // 치즈 조각(코인) 4종: 1 작은 삼각, 2 큰 삼각, 3 덩어리, 4 금빛 덩어리
    const col = n === 4 ? ['#ffe680', '#ffbf2e'] : ['#ffd25c', '#f2a62c'];
    if (n <= 2) { const s = n === 1 ? .8 : 1; poly(g, [[8 - 6 * s, 12], [8 + 6 * s, 12], [8 + 3 * s, 12 - 8 * s]], col[1]); poly(g, [[8 - 6 * s, 11], [8 + 6 * s, 11], [8 + 3 * s, 11 - 7 * s]], col[0]); ell(g, 8, 9.5, 1.2 * s, 1 * s, '#e0912a'); }
    else { rrect(g, 3, 6, 10, 7, 2, col[1]); rrect(g, 3, 5, 10, 6, 2, col[0]); ell(g, 6, 8, 1.3, 1.1, '#e0912a'); ell(g, 10.5, 9.5, 1, .9, '#e0912a'); }
  }
  function heart(g, col, frac) {
    g.save(); g.beginPath(); g.rect(0, 0, 26 * frac, 22); g.clip();
    g.beginPath(); g.moveTo(13, 19); g.bezierCurveTo(2, 12, 3, 3, 9, 3.5); g.bezierCurveTo(11.5, 3.7, 13, 6, 13, 6); g.bezierCurveTo(13, 6, 14.5, 3.7, 17, 3.5); g.bezierCurveTo(23, 3, 24, 12, 13, 19); g.fillStyle = col; g.fill();
    ell(g, 8.5, 7.5, 2, 1.4, 'rgba(255,255,255,.7)');
    g.restore();
  }

  // ---- 바닥(달 표면) 타일 64×64 — 원작처럼 색만 캐릭터별로 바뀜 ----------------------------------
  const MOON = { white: ['#b9c9d6', '#a5b6c5'], nerd: ['#c4bfd9', '#afa9c8'], soldier: ['#bccdb4', '#a7baa0'], doctor: ['#c9c0cf', '#b2a8ba'], robot: ['#b4c3dc', '#9fb0cc'], eletric: ['#b4dbd2', '#9cc8bd'], gold: ['#e6d29a', '#d4bd7e'] };
  const moonCache = {};
  function moonTile(kind) {
    if (moonCache[kind]) return moonCache[kind];
    const [a, b] = MOON[kind] || MOON.white, c = mk(64, 64), g = c.getContext('2d');
    rect(g, 0, 0, 64, 64, a);
    const crater = (x, y, r) => { ell(g, x, y, r, r * .75, b); ell(g, x + r * .15, y + r * .12, r * .7, r * .5, a); };
    crater(14, 16, 7); crater(46, 40, 9); crater(48, 10, 4); crater(18, 50, 5);
    moonCache[kind] = c; return c;
  }

  // ---- 카드 면 (원작 카드 스프라이트 80×80 원점 40,40 — 크기만 맞추고 그림은 직접) ------------------------
  const CARDCOL = {
    s_upgrade_card_01: ['#8a5634', '#c07a45', '#e9b47c'], s_upgrade_card_02: ['#5b6a84', '#8ea0bd', '#cad6ea'],
    s_upgrade_card_03: ['#8a7428', '#cfb340', '#f6e38a'], s_upgrade_card_04: ['#4e3080', '#8b5bd0', '#c9a6ff'],
    s_upgrade_card_rare_leveled: ['#b88a0c', '#ffd23f', '#fff1a6'], s_upgrade_card_rare_regular: ['#2463c8', '#5fa7ff', '#bfe0ff'],
    s_upgrade_card_rare_combined: ['#4a4a56', '#a9a9b8', '#ececf5'], s_upgrade_card_rare_cursed: ['#5e0d1c', '#c82a46', '#ff98aa'],
    s_upgrade_card_rare_weapon: ['#1b7553', '#45d197', '#b4f7d8'], s_upgrade_card_roll: ['#2a2a3a', '#4a4a64', '#ffffff'],
  };
  const cardCache = {};
  function cardSprite(name) {
    if (cardCache[name]) return cardCache[name];
    const [d, m, l] = CARDCOL[name] || CARDCOL.s_upgrade_card_01;
    return (cardCache[name] = bake(80, 80, g => {
      rrect(g, 16, 7, 48, 66, 7, d); rrect(g, 18, 9, 44, 62, 6, m); rrect(g, 21, 12, 38, 56, 5, l);
      rrect(g, 21, 12, 38, 14, 5, 'rgba(255,255,255,.35)');
      if (name.includes('rare')) { poly(g, starPts(22, 13, 4, 1.8), '#ffffff'); poly(g, starPts(58, 67, 4, 1.8), '#ffffff'); }
      if (name.includes('cursed')) { for (let i = 0; i < 3; i++) poly(g, [[22 + i * 14, 70], [26 + i * 14, 64], [30 + i * 14, 70]], d); }
    }));
  }
  // ---- 업그레이드 아이콘 (원작 아이콘 뜻을 따라 직접 그림, 32×32 원점 가운데) -------------------------------
  const SYM = {
    gun(g) { rrect(g, 8, 12, 15, 8, 2, '#5e6f8c'); rect(g, 9, 13, 13, 2, '#93a6c4'); rrect(g, 21, 10, 5, 12, 1, '#3c4a62'); rect(g, 10, 19, 4, 5, '#3c4a62'); },
    bullet(g) { rrect(g, 9, 13, 11, 8, 2, '#f2b443'); rect(g, 9, 13, 4, 8, '#c27f22'); ell(g, 21, 17, 4, 4, '#ffe08a'); },
    crit(g) { ell(g, 16, 16, 9, 9, '#ffe04d'); ell(g, 16, 16, 6, 6, '#fff7c2'); poly(g, [[16, 6], [18, 14], [26, 16], [18, 18], [16, 26], [14, 18], [6, 16], [14, 14]], '#ff8a3a'); },
    heart(g) { g.save(); g.translate(3, 5); heart(g, '#ff4d6d', 1); g.restore(); },
    boot(g) { rrect(g, 10, 9, 8, 12, 2, '#8b5a3c'); rrect(g, 10, 18, 14, 6, 2, '#6d432b'); poly(g, [[18, 10], [27, 6], [24, 12], [28, 13], [19, 16]], '#ffffff'); },
    bubble(g) { ell(g, 13, 18, 6, 6, '#57c52b'); ell(g, 21, 11, 4, 4, '#57c52b'); ell(g, 22, 21, 3, 3, '#57c52b'); ell(g, 11, 16, 2, 1.5, '#c8ffb0'); },
    teeth(g) { rrect(g, 7, 10, 18, 12, 5, '#5a1020'); for (let i = 0; i < 4; i++) { poly(g, [[9 + i * 4, 11], [13 + i * 4, 11], [11 + i * 4, 16]], '#ffffff'); poly(g, [[9 + i * 4, 21], [13 + i * 4, 21], [11 + i * 4, 17]], '#ffffff'); } },
    bolt(g) { poly(g, [[18, 4], [9, 18], [15, 18], [12, 28], [23, 13], [17, 13], [21, 4]], '#7df2cf'); },
    star(g) { poly(g, starPts(16, 17, 11, 5), '#f45d92'); poly(g, starPts(16, 16.5, 7, 3.2), '#ffd0e2'); },
    arrow(g) { line(g, [[7, 25], [23, 9]], 2.6, '#a8692f'); poly(g, [[25, 5], [26, 13], [18, 7]], '#c6d4e6'); poly(g, [[6, 21], [11, 26], [5, 27]], '#ff6b6b'); },
    clock(g) { ell(g, 22, 22, 7, 7, '#ffffff'); ell(g, 22, 22, 5.5, 5.5, '#f0a63a'); line(g, [[22, 22], [22, 18]], 1.4, '#3a2a1a'); line(g, [[22, 22], [25, 22]], 1.4, '#3a2a1a'); },
    gear(g) { for (let i = 0; i < 8; i++) { g.save(); g.translate(16, 16); g.rotate(i * Math.PI / 4); rect(g, -2.5, -12, 5, 6, '#e09a3c'); g.restore(); } ell(g, 16, 16, 8.5, 8.5, '#e09a3c'); ell(g, 16, 16, 4, 4, '#3a2a1a'); },
    feather(g) { g.save(); g.translate(16, 16); g.rotate(-.7); ell(g, 0, 0, 4.5, 12, '#eef6ff'); line(g, [[0, -10], [0, 13]], 1.2, '#9fb3cc'); g.restore(); },
    cheese(g) { poly(g, [[6, 23], [26, 23], [24, 9]], '#f2a62c'); poly(g, [[6, 21], [26, 21], [24, 8]], '#ffd25c'); ell(g, 18, 17, 2, 1.6, '#e0912a'); ell(g, 12, 19, 1.4, 1.2, '#e0912a'); },
    pierce(g) { rrect(g, 6, 13, 12, 7, 2, '#f2b443'); line(g, [[18, 16.5], [27, 16.5]], 2, '#ffffff'); rect(g, 20, 8, 3, 17, '#c48c55'); },
    up(g) { for (let i = 0; i < 3; i++) { poly(g, [[7 + i * 7, 14], [11 + i * 7, 8], [15 + i * 7, 14]], '#ffffff'); rect(g, 10 + i * 7, 13, 2, 12, '#ffffff'); } },
    roll(g) { g.beginPath(); g.arc(16, 16, 9, .4, Math.PI * 1.7); g.lineWidth = 3.5; g.strokeStyle = '#ffffff'; g.stroke(); poly(g, [[22, 6], [27, 13], [19, 13]], '#ffffff'); },
    glassheart(g) { g.save(); g.translate(3, 5); heart(g, '#ff8fb0', 1); g.restore(); line(g, [[12, 9], [16, 15], [13, 20]], 1.2, '#ffffff'); },
    shield(g) { poly(g, [[16, 5], [26, 9], [24, 21], [16, 27], [8, 21], [6, 9]], '#9fb1cc'); poly(g, [[16, 8], [23, 11], [21, 20], [16, 24]], '#d5e0ef'); },
    cannon(g) { rrect(g, 6, 11, 16, 10, 3, '#c82a46'); rrect(g, 20, 9, 6, 14, 2, '#7a1428'); ell(g, 11, 23, 3.5, 3.5, '#3a2a1a'); },
    silver(g) { rrect(g, 7, 13, 14, 7, 2, '#dfe6f0'); ell(g, 22, 16.5, 4, 3.5, '#ffffff'); line(g, [[4, 10], [28, 24]], 1, '#9fb3cc'); },
    plus(g) { rect(g, 21, 3, 4, 10, '#5be36a'); rect(g, 18, 6, 10, 4, '#5be36a'); },
    tierup(g) { poly(g, [[19, 9], [23, 3], [27, 9]], '#ffffff'); rect(g, 22, 8, 2, 5, '#ffffff'); },
  };
  // 오브젝트 이름 → 아이콘 구성(원작 아이콘 스프라이트 이름에서 뜻을 가져옴)
  function iconParts(obj) {
    if (obj.startsWith('talent_')) return [obj.slice(7)];
    const m = (re, a) => re.test(obj) ? a : null;
    return m(/^o_damage_upgrade_0[1-5]/, ['gun', 'tierup']) || m(/^o_damage_upgrade_0[67]/, ['gun', 'plus']) || m(/fire_rate_upgrade/, ['gun', 'boot']) ||
      m(/critical_upgrade_0[1-5]/, ['crit']) || m(/critical_upgrade/, ['crit', 'plus']) || m(/^o_ammo_upgrade/, ['bullet', 'plus']) || m(/health_upgrade/, ['heart', 'plus']) ||
      m(/movement_upgrade/, ['boot']) || m(/^o_poison_upgrade/, ['bubble']) || m(/^o_curse_upgrade/, ['teeth']) || m(/^o_lightning_upgrade/, ['bolt']) ||
      m(/^o_star_upgrade/, ['star']) || m(/^o_arrow_upgrade/, ['arrow']) || m(/money/, ['cheese', 'plus']) || m(/penetration/, ['pierce']) || m(/dodge/, ['feather']) ||
      m(/all_damage/, ['up']) || m(/heal_upgrade/, ['heart', 'feather']) || m(/temp_damage/, ['gun', 'clock']) || m(/temp_firerate/, ['boot', 'clock']) || m(/temp_ammo/, ['bullet', 'clock']) ||
      m(/temp_combo/, ['gun', 'bullet', 'clock']) || m(/weapon_upgrade/, ['gear']) || m(/arrow_lightning/, ['arrow', 'bolt']) || m(/arrow_poison/, ['arrow', 'bubble']) ||
      m(/arrow_curse/, ['arrow', 'teeth']) || m(/arrow_star/, ['arrow', 'star']) || m(/lightning_poison/, ['bolt', 'bubble']) || m(/lightning_curse/, ['bolt', 'teeth']) ||
      m(/star_lightning/, ['star', 'bolt']) || m(/star_poison/, ['star', 'bubble']) || m(/star_curse/, ['star', 'teeth']) || m(/curse_poison/, ['teeth', 'bubble']) ||
      m(/glass_heart/, ['glassheart']) || m(/solid_critical/, ['shield']) || m(/speed_transmutation/, ['feather', 'feather']) || m(/silver_bullet/, ['silver']) ||
      m(/cursed_cannons/, ['cannon']) || m(/roll_upgrade/, ['roll']) || ['star'];
  }
  const iconCache = {};
  function iconSprite(obj) {
    if (iconCache[obj]) return iconCache[obj];
    const parts = iconParts(obj);
    return (iconCache[obj] = bake(32, 32, g => {
      if (parts.length >= 2 && !['plus', 'tierup', 'clock', 'boot'].includes(parts[1])) {   // 조합: 두 그림을 겹쳐 작게
        g.save(); g.translate(-3, -3); g.scale(.82, .82); SYM[parts[0]](g); g.restore();
        g.save(); g.translate(9, 9); g.scale(.72, .72); SYM[parts[1]](g); g.restore();
        if (parts[2]) SYM[parts[2]](g);
      } else for (const p of parts) SYM[p](g);
    }));
  }
  // 카드 하나(카드면 + 아이콘)를 그린다 — ui.js 가 부름. (x,y) 는 카드 가운데, 이미 u 배율 변환 안
  function icon(g, up, x, y) {
    g.imageSmoothingEnabled = false;
    g.drawImage(cardSprite(up.card), -40, -40);
    g.drawImage(iconSprite(up.obj), -16 + x, -16 + y);
  }

  // ---- 대기실 소품 (원작 크기·원점: station 374×311 (187,214), rocket 74×131 (37,131), cabin 104×119 (53,113),
  //      upgrades_area 123×82 (67,43), plant 13~15px). 그림은 직접 — 귀여운 평면 스타일
  const propCache = {};
  function prop(name) {
    if (propCache[name]) return propCache[name];
    const P = {
      station: () => bake(374, 311, g => {
        // 뒤쪽 동글 나무들(정거장 섬 뒤 배경)
        for (const [x, y, r, c] of [[60, 120, 34, '#3b2f6b'], [110, 92, 40, '#45367a'], [170, 80, 44, '#3b2f6b'], [235, 88, 42, '#45367a'], [300, 104, 38, '#3b2f6b'], [330, 130, 30, '#45367a']]) { rect(g, x - 4, y, 8, 70, '#2b2150'); ell(g, x, y, r, r * .9, c); ell(g, x - r * .3, y - r * .3, r * .35, r * .3, '#5a4a94'); }
        // 섬 옆면(흙) + 윗면(풀) — 걷는 타원은 원점(187,214) 기준 반지름 186×81
        ell(g, 187, 236, 184, 80, '#7a5236'); ell(g, 187, 230, 185, 80, '#9a6a44');
        ell(g, 187, 214, 186, 81, '#7fd8c0'); ell(g, 187, 210, 178, 74, '#9be6cf');
        for (const [x, y, rx, ry] of [[95, 200, 46, 18], [290, 232, 50, 20], [190, 250, 30, 10]]) { ell(g, x, y, rx, ry, '#ffd25c'); ell(g, x + rx * .3, y - 2, rx * .18, ry * .3, '#e8a83a'); }   // 치즈 무늬
      }, { cut: 100 }),
      rocket: () => bake(74, 131, g => {
        rect(g, 58, 20, 3, 111, '#b8a27a'); rect(g, 68, 20, 3, 111, '#b8a27a'); for (let y = 26; y < 128; y += 12) rect(g, 58, y, 13, 2, '#b8a27a');   // 발사대
        poly(g, [[10, 128], [18, 96], [22, 128]], '#ff8a5c'); poly(g, [[52, 128], [46, 96], [42, 128]], '#ff8a5c');                                       // 날개
        rrect(g, 14, 40, 36, 86, 14, '#f4ecdf'); rect(g, 14, 96, 36, 6, '#e3d6c2');
        poly(g, [[14, 52], [32, 6], [50, 52]], '#ffd25c'); ell(g, 26, 34, 3, 2.4, '#e8a83a'); ell(g, 38, 44, 2.4, 2, '#e8a83a');                          // 치즈 코
        ell(g, 32, 70, 10, 10, '#6b7fa8'); ell(g, 32, 70, 7.5, 7.5, '#bfe4ff'); ell(g, 29, 67, 2.5, 2, '#ffffff');                                         // 창
        rrect(g, 22, 122, 20, 8, 3, '#8e8ea0');
      }),
      cabin: () => bake(104, 119, g => {
        ell(g, 53, 112, 46, 7, 'rgba(0,0,0,.25)');
        poly(g, [[8, 110], [96, 110], [96, 64], [8, 44]], '#f2b13a'); poly(g, [[8, 44], [96, 64], [96, 70], [8, 50]], '#ffd25c');                           // 치즈 쐐기 집
        ell(g, 30, 80, 6, 5, '#d68f28'); ell(g, 76, 96, 5, 4, '#d68f28'); ell(g, 66, 76, 3, 2.5, '#d68f28');
        rrect(g, 44, 82, 18, 28, 8, '#8a5634'); ell(g, 57, 97, 1.6, 1.6, '#ffd25c');                                                                      // 문
        rrect(g, 70, 78, 14, 12, 3, '#bfe4ff'); rect(g, 76, 78, 2, 12, '#8a5634');                                                                        // 창
        rect(g, 22, 8, 2.5, 40, '#8a6a4a'); poly(g, [[24, 9], [44, 13], [24, 21]], '#ffffff'); ell(g, 31, 14, 2.5, 2.5, '#f5a3b8');                        // 깃발(쥐 귀)
      }),
      upgrades_area: () => bake(123, 82, g => {
        ell(g, 67, 74, 52, 6, 'rgba(0,0,0,.25)');
        rrect(g, 22, 40, 96, 30, 4, '#5a6a8a'); rect(g, 22, 40, 96, 5, '#7c8fb3'); rect(g, 28, 68, 6, 10, '#3c4a62'); rect(g, 106, 68, 6, 10, '#3c4a62');      // 책상
        rrect(g, 34, 12, 34, 28, 4, '#d9dde6'); rect(g, 38, 16, 26, 18, '#3fae6a'); rect(g, 40, 18, 10, 2, '#9cf2bd'); rect(g, 40, 22, 16, 2, '#9cf2bd');    // 화면 1
        rrect(g, 72, 18, 30, 24, 4, '#d9dde6'); rect(g, 76, 22, 22, 14, '#3fae6a'); rect(g, 78, 25, 12, 2, '#9cf2bd');                                       // 화면 2
        rrect(g, 44, 44, 40, 8, 2, '#c9cfdb');                                                                                                             // 키보드
      }),
      plant_01: () => bake(15, 14, g => { line(g, [[7, 13], [7, 6]], 1.6, '#4caf6a'); ell(g, 4, 6, 3.5, 2.2, '#6fd18c', -.4); ell(g, 10, 5, 3.5, 2.2, '#6fd18c', .4); }),
      plant_02: () => bake(13, 12, g => { line(g, [[6, 11], [6, 5]], 1.4, '#4caf6a'); ell(g, 6, 4, 3, 3, '#ff9fb8'); ell(g, 6, 4, 1.2, 1.2, '#ffe36b'); }),
      plant_03: () => bake(13, 12, g => { for (const dx of [-3, 0, 3]) line(g, [[6.5, 11], [6.5 + dx, 4]], 1.4, '#6fd18c'); }),
      lobby_tile: () => { const c = mk(64, 64), g = c.getContext('2d'); rect(g, 0, 0, 64, 64, '#1f2a6b'); rect(g, 0, 0, 32, 32, '#23307a'); rect(g, 32, 32, 32, 32, '#23307a'); for (const [x, y] of [[10, 12], [44, 20], [24, 46], [54, 54]]) rect(g, x, y, 1, 1, '#9fb4ff'); return c; },
      space_tile: () => { const c = mk(64, 64), g = c.getContext('2d'); rect(g, 0, 0, 64, 64, '#22163f'); rect(g, 0, 0, 32, 32, '#26194a'); rect(g, 32, 32, 32, 32, '#26194a'); for (const [x, y] of [[8, 40], [50, 10], [30, 22]]) rect(g, x, y, 1, 1, '#c9b8ff'); return c; },
    };
    const f = P[name]; propCache[name] = f ? f() : null; return propCache[name];
  }

  window.RatsArt = { bake, ratFrames, enemyFrames, weaponSprite, sprite, moonTile, RATS, OUT, cardSprite, iconSprite, icon, SYM, prop };
})();
