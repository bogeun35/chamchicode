// 스페이스 록(원작판) 봇 공용: 시드 고정 + 타이머 정지 + 봇 두뇌(near/center) + 한 판 집계기
// 원작판 API: R.picks(type ore/key/ammo/arti/hole/ess) · R.cs(0부터) · R.quotaMet · R.boss/bossDown · 워프 = R.hold.key 누르고 있기(충전)
const SEED_JS = `(() => { let s = 1; const f = () => { s |= 0; s = s + 0x6D2B79F5 | 0; let t = Math.imul(s ^ s >>> 15, 1 | s); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; };
  Math.random = f; window.__reseed = n => { s = n * 7919 + 13; }; if (/[?&]fresh=1/.test(location.search)) { try { localStorage.clear(); } catch (e) {} } })();`;
// 측정 결정성: 페이지의 반복 타이머(원정 tick 16ms · 기지 플링코 33ms · 저장 5s · 상단 250ms)와 rAF(그리기의 난수 소비)를 끔 → 시뮬은 rock.sim / plinkoTick 으로만 진행
const NOTIMER_JS = `(() => { window.__realSetInterval = window.setInterval; window.setInterval = () => 0; window.requestAnimationFrame = () => 0; })();`;

const BRAIN = `
window.__cr = g => g.collectR ? g.collectR() : (15 + g.ef('CollectorRadius', 'increaseAmount')) * 16;
window.__brain = function (g, R, mode) {
  const sh = R.ship, v = g.view(), W = v.W, H = v.H, cr = window.__cr(g);
  if (mode === 'center') { R.aim.x = R.cur.x = W / 2; R.aim.y = R.cur.y = H / 2; return; }
  let best = null, bd = 1e9; for (const rk of R.rocks) { const d = Math.hypot(rk.x - sh.x, rk.y - sh.y); if (d < bd) { bd = d; best = rk; } }
  let drop = null, dd = 1e9; for (const d of R.picks) { const q = Math.hypot(d.x - sh.x, d.y - sh.y); if (q > cr * .8 && q < dd) { dd = q; drop = d; } }
  let crate = null, cd = 1e9; for (const c of R.crates) { const q = Math.hypot(c.x - sh.x, c.y - sh.y); if (q < cd) { cd = q; crate = c; } }
  let want, cur = null;
  if (crate && cd < 520 && (!drop || cd < dd * 1.5)) { const ux = sh.x - crate.x, uy = sh.y - crate.y, ul = Math.hypot(ux, uy) || 1; want = { x: crate.x + ux / ul * 120, y: crate.y + uy / ul * 120 }; cur = { x: crate.x, y: crate.y }; R.clickBuf = .3; }
  else if (drop && (!best || dd < bd)) want = { x: drop.x, y: drop.y };
  else if (best) { const ux = sh.x - best.x, uy = sh.y - best.y, ul = Math.hypot(ux, uy) || 1; want = { x: best.x + ux / ul * 160, y: best.y + uy / ul * 160 }; }
  else want = { x: W / 2, y: H / 2 };
  for (const rk of R.rocks) { const ux = want.x - rk.x, uy = want.y - rk.y, d = Math.hypot(ux, uy) || 1; const mg = window.__margin || 70; if (d < rk.r + mg) { want.x += ux / d * (rk.r + mg - d); want.y += uy / d * (rk.r + mg - d); } }
  want.x = Math.max(20, Math.min(W - 20, want.x)); want.y = Math.max(20, Math.min(H - 20, want.y));
  R.aim.x = want.x; R.aim.y = want.y; R.cur.x = cur ? cur.x : want.x; R.cur.y = cur ? cur.y : want.y;
};
// 한 판 진행 + 집계. opt: { mode, cap(초), clock(외부 시계), onStep }
// 떨어진 광석 조각(type ore)만 추적: dead=수집 / 그 외 사라짐=유실(수명 만료·워프 정리·판 종료). 화이트홀은 끌려와 dead 가 되므로 수집. 자동 수집(원작 AutoCollect 등)은 조각이 안 생겨 auto 로 따로.
window.__runOne = function (g, opt) {
  const DT = 1 / 60; g.launch(); clearInterval(g.launch._iv);
  const R0 = g.R, S = g.S;
  const st = { start: R0.cs, hits: 0, warps: 0, gen: 0, col: 0, lost: 0, auto: 0, rar: [R0.rar], t: 0, kills: 0, bag: 0, end: '', artiGain: 0, expo: 0 };
  const artiN = () => Object.keys(S.arti).filter(k => S.arti[k]).length, a0 = artiN();
  const seen = new Set(); let prevHp = R0.hp, ww = 0;
  while (g.R === R0) {
    window.__brain(g, R0, opt.mode);
    // 워프: 할당량 완료 + 보스 없음 → 누르고 있기(충전). near 는 전리품 상자·유물 소행성이 남아 있으면 최대 8초 부수고
    R0.hold.key = false;
    if (R0.quotaMet && !R0.boss && !R0.bossDown && g.hasWarp()) {
      ww += DT;
      const loot = R0.crates.some(c => c.type === 'loot') || R0.rocks.some(r => r.arti);
      if (opt.mode === 'center' || ww > 8 || !loot) R0.hold.key = true;
    } else ww = 0;
    const bag0 = R0.bagN, col0 = st.col, cs0 = R0.cs;
    g.sim(DT); st.t += DT; if (opt.clock) opt.clock.t += DT;
    const alive = g.R === R0;
    if (R0.hp < prevHp) st.hits += prevHp - R0.hp; prevHp = R0.hp;
    { let cl = 1e9; for (const rk of R0.rocks) { const c = Math.hypot(rk.x - R0.ship.x, rk.y - R0.ship.y) - rk.r - 10; if (c < cl) cl = c; } if (cl < 25) st.expo += DT; }
    if (alive && R0.cs !== cs0) { st.warps++; st.rar.push(R0.rar); ww = 0; }
    const cur = new Set(); for (const k of R0.picks) if (k.type === 'ore') cur.add(k);
    const gone = []; for (const d of seen) if (!cur.has(d)) { seen.delete(d); gone.push(d); }
    const nDead = gone.filter(d => d.dead).length, nOther = gone.length - nDead;
    // 데드맨 스위치: collectPick 을 dead 표시 없이 부르고 판이 끝남 → 가방 증가로 판정
    const swept = !alive && nOther > 0 && (R0.bagN - bag0) >= gone.length;
    st.col += nDead + (swept ? nOther : 0); st.lost += swept ? 0 : nOther;
    for (const d of cur) if (!seen.has(d)) { seen.add(d); st.gen++; }
    st.auto += Math.max(0, (R0.bagN - bag0) - (st.col - col0));
    if (opt.onStep) opt.onStep(R0);
    if (alive && (st.t >= opt.cap || (opt.clock && opt.clock.stop && opt.clock.stop()))) { st.cut = 1; g.endRun('측정 종료'); }
    // 원작판 결함 회피: 보스 격파 뒤 정수 조각이 우주선 둘레를 공전(가속 1500·최고속 950 → 반경 약 600px 원궤도)하면 판이 안 끝남 → 격파 8초 뒤 강제 종료(보스 종료로 셈)
    if (g.R === R0 && R0.bossDown) { st.bdT = (st.bdT || 0) + DT; if (st.bdT > 8) { st.essOrbit = 1; g.endRun('측정 종료'); } }
    if (g.R === R0 && st.t > 900) { st.cut = 1; st.long = 1; g.endRun('측정 종료'); }
  }
  for (const d of seen) st.lost++;
  st.kills = R0.killsTotal; st.bag = R0.bagN; st.reached = R0.cs;
  st.end = R0.bossDown ? 'boss' : st.cut ? 'time' : R0.hp <= 0 ? 'crash' : 'fuel';
  st.dropRate = +(st.col / Math.max(1, st.col + st.lost)).toFixed(3);
  st.rate = +(R0.bagN / Math.max(1, R0.bagN + st.lost)).toFixed(3);
  st.artiGain = artiN() - a0; st.expo = +st.expo.toFixed(2);
  document.getElementById('modal').classList.remove('show');
  return st;
};
`;

// 측정 가속: 플링코 핀 충돌 검사를 격자 후보로 좁힌 '같은 결과' 판 (원작판 plinkoTick 973~1013 을 그대로 옮기고 안쪽 PEGS 전수 루프만 교체).
// 후보 = 공 위치 ±24px 칸의 핀(번호순). 한 번 밀릴 때 최대 약 7px 이동 → 번호순 검사에서 걸릴 수 있는 핀은 모두 후보 안. 난수 호출 순서 동일.
// 페이지 로드 뒤 page.evaluate(FASTPLINKO) 로 설치. 전역 함수 plinkoTick 을 바꿔 update() 안(자율성)과 봇의 기지 처리 모두 적용. 검증: plinko-eq.js
const FASTPLINKO = `(() => {
  const CS = 24, grid = new Map(), key = (cx, cy) => cx * 1000 + cy;
  for (const p of PEGS) { const k = key(Math.floor(p.x / CS), Math.floor(p.y / CS)); if (!grid.has(k)) grid.set(k, []); grid.get(k).push(p); }
  const cand = (x, y) => { const out = []; const x0 = Math.floor((x - CS) / CS), x1 = Math.floor((x + CS) / CS), y0 = Math.floor((y - CS) / CS), y1 = Math.floor((y + CS) / CS);
    for (let cx = x0; cx <= x1; cx++) for (let cy = y0; cy <= y1; cy++) { const a = grid.get(key(cx, cy)); if (a) for (const p of a) out.push(p); }
    out.sort((a, b) => a.i - b.i); return out; };
  const fast = function (dt) {
    PL.dropT -= dt;
    if (PL.dropT <= 0 && cargoN() > 0 && PL.balls.length < 500) {
      PL.dropT = plinkoInt();
      for (let k = 0; k < intake(); k++) { const o = takeOre(); if (o < 0) break; dropBall(o); }
    }
    const up = []; for (let i = 0; i < ORES.length; i++) if (oreOwned(i)) up.push(i);
    const kind = PEGS.map(p => pegKind(p.i));
    const steps = Math.min(40, Math.ceil(dt * 240)), h = dt / steps;
    for (let s = 0; s < steps; s++) {
      PL.clock += h;
      for (const b of PL.balls) {
        if (b.done) continue;
        b.age += h; if (b.age > 20) { b.y = ZONE_TOP + 1; }
        b.vy += GRAV * h; b.x += b.vx * h; b.y += b.vy * h;
        for (const p of cand(b.x, b.y)) {
          const rr = (kind[p.i] ? PEG_R * 1.5 : PEG_R) + BALL_R;
          if (Math.abs(b.x - p.x) > rr || Math.abs(b.y - p.y) > rr) continue;
          const dx = b.x - p.x, dy = b.y - p.y, d = Math.hypot(dx, dy); if (d >= rr || d === 0) continue;
          const nx = dx / d, ny = dy / d; b.x = p.x + nx * rr; b.y = p.y + ny * rr;
          const vn = b.vx * nx + b.vy * ny; if (vn < 0) { b.vx -= 1.55 * vn * nx; b.vy -= 1.55 * vn * ny; b.vx += rnd(-6, 6); }
          if ((PL.cd[p.i] ?? -9) + .5 <= PL.clock) {
            PL.cd[p.i] = PL.clock; const rk = pegRank(p.i), kd = kind[p.i];
            if (rk) { const g = ORES[b.o].v * rk; credit(g); if (PL.pops.length < 30) PL.pops.push({ x: p.x, y: p.y - 6, s: '+' + fmt(g), t: 0, c: LRC[Math.min(5, rk)] }); }
            if (kd === 1 && !b.ban && PL.balls.length < 500) PL.balls.push({ x: p.x + rnd(-3, 3), y: p.y - rr, vx: -b.vx, vy: -Math.abs(b.vy) * .5, o: b.o, age: 0 });
            if (kd === 2) { const j = up.indexOf(b.o); if (j >= 0 && j < up.length - 1) b.o = up[j + 1]; }
          }
        }
        if (b.x < BALL_R) { b.x = BALL_R; b.vx = Math.abs(b.vx) * .6; } if (b.x > PB.W - BALL_R) { b.x = PB.W - BALL_R; b.vx = -Math.abs(b.vx) * .6; }
        if (b.y > ZONE_TOP) {
          const zi = clamp(Math.floor(b.x / (PB.W / 13)), 0, 12);
          b.done = 1;
          const v = ORES[b.o].v * S.zm[zi] * (pl('p1') && b.o >= 4 ? 2 : 1);
          credit(v); if (PL.pops.length < 30) PL.pops.push({ x: b.x, y: ZONE_TOP - 8, s: '+' + fmt(v), t: 0, c: ORES[b.o].c });
          if (S.worm[zi] && !b.ban && Math.random() < S.worm[zi]) { dropBall(b.o, pby(116)); PL.balls[PL.balls.length - 1].ban = 1; }
        }
      }
    }
    PL.balls = PL.balls.filter(b => !b.done);
    for (const q of PL.pops) q.t += dt; PL.pops = PL.pops.filter(q => q.t < .9);
  };
  window.__origPlinko = window.plinkoTick; window.plinkoTick = fast; window.rock.plinkoTick = fast; window.__fastPlinko = fast;
  return typeof PEGS + ' ' + PEGS.length;
})()`;

module.exports = { SEED_JS, NOTIMER_JS, BRAIN, FASTPLINKO };
