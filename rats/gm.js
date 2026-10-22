// 로켓 쥐 — GameMaker 런타임 흉내(원작 YYC 코드를 옮기기 위한 최소한의 바탕).
// 각도는 도(degree), y 는 아래가 +, 방향 90 = 위. 스텝은 60/초 고정(원작 GEN8 FPS 60).
(function () {
  'use strict';
  const D2R = Math.PI / 180;
  const dcos = a => Math.cos(a * D2R), dsin = a => Math.sin(a * D2R);
  const lerp = (a, b, t) => a + (b - a) * t;
  const clamp = (v, lo, hi) => v < lo ? lo : v > hi ? hi : v;
  const sign = v => v > 0 ? 1 : v < 0 ? -1 : 0;
  const frac = v => v - Math.trunc(v);
  // GameMaker point_direction: 0..360, 위가 90
  function point_direction(x1, y1, x2, y2) {
    const dx = x2 - x1, dy = y2 - y1;
    if (dx === 0) return dy > 0 ? 270 : dy < 0 ? 90 : 0;
    let a = Math.atan2(-dy, dx) / D2R; if (a < 0) a += 360; return a;
  }
  const point_distance = (x1, y1, x2, y2) => Math.hypot(x2 - x1, y2 - y1);
  const lengthdir_x = (l, d) => l * dcos(d), lengthdir_y = (l, d) => -l * dsin(d);
  function angle_difference(a, b) { return ((((a - b) % 360) + 540) % 360) - 180; }
  // 원작 scr lerp_dir (L74–76): d = (b-a) mod 360; diff = (2d mod 360) - d; return a + diff*amt
  function lerp_dir(a, b, amt) { const d = (b - a) % 360; const diff = (2 * d) % 360 - d; return a + diff * amt; }
  // 원작 angular_offset (L96–97)
  function angular_offset(a, b, ang) { return [a * dcos(ang) + b * dcos(ang - 90), b * dcos(ang) + a * dcos(ang + 90)]; }

  // 난수: GameMaker 와 같은 함수 이름. (원작 RNG 흐름은 재현 불가 → Math.random)
  const random = n => Math.random() * n;
  const random_range = (a, b) => { if (a > b) [a, b] = [b, a]; return a + Math.random() * (b - a); };
  const irandom = n => Math.floor(Math.random() * (Math.floor(n) + 1));
  const irandom_range = (a, b) => { a = Math.floor(a); b = Math.floor(b); if (a > b) [a, b] = [b, a]; return a + Math.floor(Math.random() * (b - a + 1)); };
  const choose = (...a) => a[Math.floor(Math.random() * a.length)];
  const get_chance = c => c >= random(100);   // 원작 get_chance L46–47 (퍼센트)

  // ---- 스프라이트 치수·충돌 사각형 --------------------------------------------------------------
  const SPR = window.RATS_SPR || {};
  function spr(name) { return SPR[name] || null; }
  // 인스턴스 충돌 사각형(회전 없는 경우): GameMaker bbox = 원점 기준 bbox_left..bbox_right(포함) → [l, t, r, b) 로
  function bboxOf(inst, x = inst.x, y = inst.y) {
    const s = SPR[inst.mask_index || inst.sprite_index]; if (!s) return null;
    const sx = inst.image_xscale ?? 1, sy = inst.image_yscale ?? 1;
    let l = (s[4] - s[2]) * sx, r = (s[6] + 1 - s[2]) * sx, t = (s[5] - s[3]) * sy, b = (s[7] + 1 - s[3]) * sy;
    if (l > r) [l, r] = [r, l]; if (t > b) [t, b] = [b, t];
    const ang = inst.image_angle || 0;
    if (!ang) return { l: x + l, t: y + t, r: x + r, b: y + b, poly: null };
    // 회전된 사각형: 꼭짓점 4개 (GameMaker 는 마스크도 image_angle 로 돌림)
    const c = dcos(ang), sn = dsin(ang), pts = [[l, t], [r, t], [r, b], [l, b]].map(([px, py]) => [x + px * c + py * sn, y - px * sn + py * c]);
    const xs = pts.map(p => p[0]), ys = pts.map(p => p[1]);
    return { l: Math.min(...xs), t: Math.min(...ys), r: Math.max(...xs), b: Math.max(...ys), poly: pts };
  }
  function polyOf(bb) { return bb.poly || [[bb.l, bb.t], [bb.r, bb.t], [bb.r, bb.b], [bb.l, bb.b]]; }
  function sat(a, b) {   // 볼록 사각형 두 개 겹침
    for (const P of [a, b]) for (let i = 0; i < 4; i++) {
      const [x1, y1] = P[i], [x2, y2] = P[(i + 1) % 4], nx = y2 - y1, ny = x1 - x2;
      let amin = Infinity, amax = -Infinity, bmin = Infinity, bmax = -Infinity;
      for (const [px, py] of a) { const d = px * nx + py * ny; if (d < amin) amin = d; if (d > amax) amax = d; }
      for (const [px, py] of b) { const d = px * nx + py * ny; if (d < bmin) bmin = d; if (d > bmax) bmax = d; }
      if (amax <= bmin || bmax <= amin) return false;
    }
    return true;
  }
  function overlap(a, ax, ay, b) {   // a 를 (ax,ay) 에 놓았을 때 b 와 겹치나
    const A = bboxOf(a, ax, ay), B = bboxOf(b); if (!A || !B) return false;
    if (A.r <= B.l || B.r <= A.l || A.b <= B.t || B.b <= A.t) return false;
    if (!A.poly && !B.poly) return true;
    return sat(polyOf(A), polyOf(B));
  }
  // 프레임 진행(원작 스프라이트 속도 + playbackType). 0 = 초당 프레임, 1 = 게임 프레임당
  function advanceImage(inst) {
    const s = SPR[inst.sprite_index]; if (!s) return;
    const n = s[8] || 1, per = s[10] === 1 ? s[9] : s[9] / 60;
    inst.image_index += per * (inst.image_speed ?? 1);
    inst._animEnd = false;
    if (inst.image_index >= n) { inst.image_index -= n * Math.floor(inst.image_index / n); inst._animEnd = true; }
    else if (inst.image_index < 0) { inst.image_index += n; inst._animEnd = true; }
  }
  const image_number = name => (SPR[name] ? SPR[name][8] : 1);

  window.GM = { dcos, dsin, lerp, clamp, sign, frac, point_direction, point_distance, lengthdir_x, lengthdir_y, angle_difference, lerp_dir, angular_offset,
    random, random_range, irandom, irandom_range, choose, get_chance, spr, bboxOf, overlap, advanceImage, image_number, D2R };
})();
