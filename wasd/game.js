// WASD 웹판 — 다람쥐 한 마리를 1~4명이 키를 나눠 조종 (원작 규칙: game-re-tools/wasd/spec/rules.md)
// 멀티: Firebase games/wd_코드 — 방장이 60틱 시뮬레이션(원작 Fusion 호스트 권한), 나머지는 '누름'만 보냄
(function () {
  const D = window.WASD_DATA, A = window.WArt;
  const $ = id => document.getElementById(id);
  const esc = s => String(s == null ? '' : s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const clamp = (v, a, b) => v < a ? a : v > b ? b : v;
  const DT = 1 / 60, SPEED = D.tori.speed, RESPAWN = D.die.len + D.die.wait;
  const KF = { W: 1, A: 2, S: 4, D: 8 }, KORDER = ['W', 'A', 'S', 'D'];
  const keysOf = m => KORDER.filter(k => m & KF[k]);
  const DIFF = ['쉬움', '보통', '어려움'];
  const PCOL = ['#ff8a5a', '#5ab4ff', '#8ee08a', '#ffd36b'];
  const NSTAGE = D.stages.length;
  const THEME = n => n <= 3 ? 'forest' : n <= 6 ? 'ocean' : 'desert';
  const THICON = { forest: '🌲', ocean: '🌊', desert: '🏜' };
  function toast(m, ms) { const t = $('toast'); t.textContent = m; t.classList.add('on'); clearTimeout(toast._t); toast._t = setTimeout(() => t.classList.remove('on'), ms || 2400); }
  function notice(m, ms) { const t = $('notice'); t.innerHTML = m; t.classList.add('on'); clearTimeout(notice._t); notice._t = setTimeout(() => t.classList.remove('on'), ms || 2600); }
  const fmt = s => { s = Math.max(0, s); const h = Math.floor(s / 3600), m = Math.floor(s % 3600 / 60), x = Math.floor(s % 60); return [h, m, x].map(v => String(v).padStart(2, '0')).join(':'); };

  // ════════ 소리 (wasd/music.js — 원작 곡·효과음을 분석해 새로 합성) ════════
  // 원작 SoundManager.PlayGameSceneBGM: 1·3 초원1, 2 초원2, 4·6 해변1, 5 해변2, 7 사막1, 8 사막2 · 메뉴는 Main
  const SONG_OF = n => n === 2 ? 'grass2' : n <= 3 ? 'grass1' : n === 5 ? 'beach2' : n <= 6 ? 'beach1' : n === 7 ? 'desert1' : 'desert2';
  const sfx = k => window.Music && Music.sfx(k);
  const bgm = id => window.Music && (id ? Music.play(id) : Music.stop());
  bgm('main');
  document.addEventListener('click', e => { if (e.target.closest('.btn, .seg button, .stg, .touch button[data-k="menu"]')) sfx('click'); }, true);

  // ════════ 스테이지 준비: 원작 타일맵을 충돌 셀 · 그리기 목록으로 ════════
  const SPR = D.spr;
  const cdist = (a, b) => { const A1 = parseInt(a.slice(1), 16), B1 = parseInt(b.slice(1), 16); return Math.abs((A1 >> 16) - (B1 >> 16)) + Math.abs(((A1 >> 8) & 255) - ((B1 >> 8) & 255)) + Math.abs((A1 & 255) - (B1 & 255)); };
  const CK = (i, j) => (i + 30000) * 65536 + (j + 30000);
  const CH = 12, CPX = 44;                                // 그림 조각: 12유닛 × 44px
  const prepCache = {};
  function prep(si) {
    if (prepCache[si]) return prepCache[si];
    const S = D.stages[si], P = { S, n: S.n, theme: THEME(S.n), borders: [], finish: [], items: [], buckets: new Map(), x0: 1e9, y0: 1e9, x1: -1e9, y1: -1e9 };
    const most = m => { const c = {}; for (const t of m.t) c[t[2]] = (c[t[2]] || 0) + 1; let b = 0, bk = null; for (const k in c) if (c[k] > b) { b = c[k]; bk = k; } return bk == null ? null : m.sp[bk]; };
    const bgm = S.maps.find(m => m.k === 'background'), gm = S.maps.find(m => m.k === 'ground');
    P.bg = bgm ? SPR[most(bgm)].c : '#8bc656';
    P.road = gm ? SPR[most(gm)].c : '#c69c6d';
    P.edge = A.hex(P.bg, .2); P.edgeLine = A.hex(P.road, -.35);
    for (const m of S.maps) {
      const [sx, sy, tx, ty] = m.M, rec = { sx, sy, tx, ty, set: new Set() };
      if (m.k === 'background') continue;
      for (const t of m.t) {
        const x0 = sx * t[0] + tx, y0 = sy * t[1] + ty;
        if (x0 < P.x0) P.x0 = x0; if (y0 < P.y0) P.y0 = y0; if (x0 + sx > P.x1) P.x1 = x0 + sx; if (y0 + sy > P.y1) P.y1 = y0 + sy;
      }
      if (m.L === 9 && m.col) { for (const t of m.t) rec.set.add(CK(t[0], t[1])); P.borders.push(rec); }
      if (m.L === 11 && m.col) { for (const t of m.t) rec.set.add(CK(t[0], t[1])); P.finish.push(rec); P.finishCells = (P.finishCells || []).concat(m.t.map(t => [sx * t[0] + tx, sy * t[1] + ty, sx, sy])); continue; }
      // 그리기 항목 (월드 상자 + 층)
      const kind = m.k === 'ground' ? 'ground' : m.L === 9 ? 'border' : /^Start/.test(m.k) ? 'start' : 'deco';
      const layer = kind === 'ground' ? 1 : kind === 'border' ? 2 : kind === 'start' ? 3 : 4 + (m.o || 0) * .01;
      for (const t of m.t) {
        const nm = m.sp[t[2]], sp = SPR[nm]; if (!sp) continue;
        let it;
        if (kind === 'deco') {
          const w = sp.w * Math.abs(sx), h = sp.h * Math.abs(sy), cx = sx * (t[0] + m.an[0]) + tx, cy = sy * (t[1] + m.an[1]) + ty;
          it = { L: layer, kind, nm, sp, x: cx - sp.pv[0] * w, y: cy - sp.pv[1] * h, w, h, fx: t[3] };
        } else {
          const col = kind === 'ground' ? (cdist(sp.c, P.road) > 90 ? sp.c : P.road) : null;
          it = { L: layer, kind, nm, sp, x: sx * t[0] + tx, y: sy * t[1] + ty, w: sx, h: sy, col, ci: t[0] + t[1] };
        }
        P.items.push(it);
      }
    }
    // 벽 칸 중 길과 맞닿은 변 (그 변에만 가장자리 선)
    const gmap = S.maps.find(m => m.k === 'ground'), inSet = (maps, x, y) => maps.some(m => m.set.has(CK(Math.floor((x - m.tx) / m.sx), Math.floor((y - m.ty) / m.sy))));
    const gset = gmap ? [{ sx: gmap.M[0], sy: gmap.M[1], tx: gmap.M[2], ty: gmap.M[3], set: new Set(gmap.t.map(t => CK(t[0], t[1]))) }] : [];
    for (const it of P.items) if (it.kind === 'border') {
      const e = .05, cx = it.x + it.w / 2, cy = it.y + it.h / 2, road = (x, y) => inSet(gset, x, y) && !inSet(P.borders, x, y);
      it.sides = (road(cx, it.y + it.h + e) ? 1 : 0) | (road(it.x + it.w + e, cy) ? 2 : 0) | (road(cx, it.y - e) ? 4 : 0) | (road(it.x - e, cy) ? 8 : 0);
    }
    for (const g of S.guide) { const sp = SPR[g.s]; if (sp) P.items.push({ L: 9, kind: 'guide', nm: g.s, sp, x: g.x - g.w * sp.pv[0], y: g.y - g.h * sp.pv[1], w: g.w, h: g.h, fx: g.fx }); }
    P.items.forEach((it, i) => it.i = i);
    P.items.sort((a, b) => a.L - b.L || a.i - b.i);
    P.x0 -= 14; P.y0 -= 14; P.x1 += 14; P.y1 += 14;
    for (const it of P.items) {
      const ci0 = Math.floor(it.x / CH), ci1 = Math.floor((it.x + it.w) / CH), cj0 = Math.floor(it.y / CH), cj1 = Math.floor((it.y + it.h) / CH);
      for (let ci = ci0; ci <= ci1; ci++) for (let cj = cj0; cj <= cj1; cj++) { const k = ci + ',' + cj; let b = P.buckets.get(k); if (!b) P.buckets.set(k, b = []); b.push(it); }
    }
    P.chunks = new Map();
    return prepCache[si] = P;
  }
  function cellsHit(maps, x0, y0, x1, y1, circ) {
    for (const m of maps) {
      const i0 = Math.floor((x0 - m.tx) / m.sx), i1 = Math.floor((x1 - m.tx) / m.sx), j0 = Math.floor((y0 - m.ty) / m.sy), j1 = Math.floor((y1 - m.ty) / m.sy);
      for (let i = i0; i <= i1; i++) for (let j = j0; j <= j1; j++) {
        if (!m.set.has(CK(i, j))) continue;
        const cx0 = m.sx * i + m.tx, cy0 = m.sy * j + m.ty, cx1 = cx0 + m.sx, cy1 = cy0 + m.sy;
        if (circ) { const qx = clamp(circ[0], cx0, cx1), qy = clamp(circ[1], cy0, cy1); if ((qx - circ[0]) ** 2 + (qy - circ[1]) ** 2 < circ[2] * circ[2]) return true; }
        else if (x1 > cx0 && x0 < cx1 && y1 > cy0 && y0 < cy1) return true;
      }
    }
    return false;
  }

  // ════════ 다람쥐 충돌 모양 (원작 Head 원 · Body 상자) ════════
  const HD = D.tori.head, BD = D.tori.body;
  function toriShapes(x, y) { return { c: [x + HD.x, y + HD.y, HD.r], b: [x + BD.x - BD.w / 2, y + BD.y - BD.h / 2, x + BD.x + BD.w / 2, y + BD.y + BD.h / 2] }; }
  const boxCircle = (b, cx, cy, r) => { const qx = clamp(cx, b[0], b[2]), qy = clamp(cy, b[1], b[3]); return (qx - cx) ** 2 + (qy - cy) ** 2 < r * r; };
  const segDist2 = (px, py, ax, ay, bx, by) => { const vx = bx - ax, vy = by - ay, L = vx * vx + vy * vy; const t = L ? clamp(((px - ax) * vx + (py - ay) * vy) / L, 0, 1) : 0; return (px - ax - vx * t) ** 2 + (py - ay - vy * t) ** 2; };
  function hitCol(T, col, ox, oy) { // col: {t, x,y(오프셋), r | w,h,d}
    const cx = ox + col.x, cy = oy + col.y;
    if (col.t === 'cir') return (T.c[0] - cx) ** 2 + (T.c[1] - cy) ** 2 < (T.c[2] + col.r) ** 2 || boxCircle(T.b, cx, cy, col.r);
    if (col.t === 'box') { const b = [cx - col.w / 2, cy - col.h / 2, cx + col.w / 2, cy + col.h / 2]; return boxCircle(b, T.c[0], T.c[1], T.c[2]) || (T.b[2] > b[0] && T.b[0] < b[2] && T.b[3] > b[1] && T.b[1] < b[3]); }
    // 캡슐: d 0 = 세로, 1 = 가로
    const vert = col.d === 0, r = (vert ? col.w : col.h) / 2, half = Math.max(0, (vert ? col.h : col.w) / 2 - r);
    const ax = vert ? cx : cx - half, ay = vert ? cy - half : cy, bx = vert ? cx : cx + half, by = vert ? cy + half : cy;
    if (segDist2(T.c[0], T.c[1], ax, ay, bx, by) < (r + T.c[2]) ** 2) return true;
    for (let k = 0; k <= 6; k++) { const px = ax + (bx - ax) * k / 6, py = ay + (by - ay) * k / 6; if (boxCircle(T.b, px, py, r)) return true; }
    return false;
  }

  // ════════ 적 시뮬레이션 (MoveEnemy · Windmill — 틱 단위, 방장·참가자 똑같이 돌림) ════════
  function makeEnemies(si, diff) {
    const S = D.stages[si], E = { ents: [], mills: [], tick: 0 };
    for (const e of S.ents) {
      if (!e.act[diff]) continue;
      const p0 = e.path.length ? e.path[0] : [e.x, e.y];
      const fx = e.path.length > 1 ? (e.path[1][0] - e.path[0][0]) > 0 : !!(e.look && e.look.fx);  // 원작 SetSpriteDirection 은 Spawned 때 한 번
      E.ents.push({ e, x: p0[0], y: p0[1], ti: e.path.length > 1 ? 1 : 0, spd: e.spd[diff], fx, parts: e.parts.filter(p => p.act[diff]) });
    }
    for (const m of S.mills) {
      if (!m.act[diff] || !m.bact[diff]) continue;
      const loc = []; if (m.center) loc.push([0, 0]);
      for (const [dx, dy] of [[0, 1], [1, 0], [0, -1], [-1, 0]]) for (let i = 0; i < Math.min(6, m.n); i++) loc.push([dx * (i + 1) * m.sp, dy * (i + 1) * m.sp]);
      E.mills.push({ m, loc, spd: m.spd[diff], ang: 0 });
    }
    return E;
  }
  function stepEnemies(E, T) {
    for (const o of E.ents) {
      const P = o.e.path; if (P.length <= 1) continue;
      const tg = P[o.ti], dx = tg[0] - o.x, dy = tg[1] - o.y, d = Math.hypot(dx, dy), st = o.spd * DT;
      if (d <= st || d === 0) { o.x = tg[0]; o.y = tg[1]; } else { o.x += dx / d * st; o.y += dy / d * st; }
      if ((tg[0] - o.x) ** 2 + (tg[1] - o.y) ** 2 < .01) o.ti = o.ti < P.length - 1 ? o.ti + 1 : 0;
    }
    for (const w of E.mills) w.ang = (T * DT) * w.spd * (w.m.cw ? -1 : 1) * Math.PI / 180;
    E.tick++;
  }
  function millBalls(w) { const c = Math.cos(w.ang), s = Math.sin(w.ang); return w.loc.map(([lx, ly]) => [w.m.x + lx * c - ly * s, w.m.y + lx * s + ly * c]); }
  function enemyHit(E, T) {
    for (const o of E.ents) {
      for (const c of o.e.cols) if (hitCol(T, c, o.x, o.y)) return true;
      for (const p of o.parts) for (const c of p.cols) if (hitCol(T, c, o.x + p.x, o.y + p.y)) return true;
    }
    for (const w of E.mills) { const c = Math.cos(w.ang), s = Math.sin(w.ang), bo = w.m.bo; for (const [bx, by] of millBalls(w)) if (hitCol(T, { t: 'cir', x: bo[0] * c - bo[1] * s, y: bo[0] * s + bo[1] * c, r: w.m.r }, bx, by)) return true; }
    return false;
  }

  // ════════ 게임 상태 ════════
  // G.st: 방장이 진행하고 참가자에게 그대로 보내는 공유 상태
  let G = null;
  function newState(run) {
    return { T: 0, s: run.stage - 1, s0: 0, x: 0, y: 0, dx: 0, dy: 0, a: 1, dt: 0, en: 1, op: 0, cm: 0, d: 0, sd: 0, pt: 0, ps: 0, fin: 0, end: null, ev: 0, go: 0 };
  }
  // 원작 SpawnedPlayers.TryAssignedKeyToAllClient
  function assignKeys(ids) {
    const order = [1, 2, 4, 8].map(v => [v, Math.random()]).sort((a, b) => a[1] - b[1]).map(v => v[0]);
    const out = {}; let k = 0; const n = ids.length;
    if (n === 1) out[ids[0]] = 15;
    else if (n === 2) for (const id of ids) { out[id] = order[k++] | order[k++]; }
    else if (n === 3) { const r = Math.floor(Math.random() * n); ids.forEach((id, i) => { let m = order[k++]; if (i === r) m |= order[k++]; out[id] = m; }); }
    else ids.forEach(id => out[id] = order[k++]);
    return out;
  }
  function keyToDir(f, op) {
    if (!op) return f === 1 ? [0, 1] : f === 2 ? [-1, 0] : f === 4 ? [0, -1] : f === 8 ? [1, 0] : null;
    return f === 1 ? [0, -1] : f === 2 ? [1, 0] : f === 4 ? [0, 1] : f === 8 ? [-1, 0] : null;
  }

  // 방장 틱 — 원작 Tori.FixedUpdateNetwork → 물리 트리거 → GameScene 이벤트 순
  function hostTick() {
    const st = G.st; if (!st.go || st.end) return;
    st.T++; st.pt += DT;
    // 입력: 자리 순서대로, 아직 안 쓴 누름 중 첫 유효한 것 하나 (ReadLatestValidInput)
    let dir = null;
    for (const id of G.order) {
      const inp = G.inputs[id]; if (!inp || inp.id === G.used[id]) continue;
      G.used[id] = inp.id;
      if (G.keys[id] & inp.f) { dir = keyToDir(inp.f, st.op); break; }
    }
    if (st.en && dir) { st.dx = dir[0]; st.dy = dir[1]; }
    if (st.a && st.en && (st.dx || st.dy)) { st.x += st.dx * SPEED * DT; st.y += st.dy * SPEED * DT; }
    syncEnemies(st.T);
    const P = prep(st.s);
    if (st.a) {
      const T = toriShapes(st.x, st.y);
      // 반전 구역 (Swamp, 레이어 12)
      let inSw = false; for (const w of P.S.swamps) if (T.b[2] > w.x && T.b[0] < w.x + w.w && T.b[3] > w.y && T.b[1] < w.y + w.h || boxCircle([w.x, w.y, w.x + w.w, w.y + w.h], T.c[0], T.c[1], T.c[2])) inSw = true;
      st.op = inSw ? 1 : 0;
      // 벽(9) · 적(8)
      const hb = cellsHit(P.borders, T.c[0] - T.c[2], T.c[1] - T.c[2], T.c[0] + T.c[2], T.c[1] + T.c[2], T.c) || cellsHit(P.borders, T.b[0], T.b[1], T.b[2], T.b[3]);
      if (hb || enemyHit(G.E, T)) { st.a = 0; st.en = 0; st.dx = st.dy = 0; st.dt = 0; st.ev++; G.fx.push({ t: 'die', x: st.x, y: st.y }); return; }
      // 코인(10)
      P.S.coins.forEach((c, i) => { if (!(st.cm & (1 << i)) && ((T.c[0] - c[0]) ** 2 + (T.c[1] - c[1]) ** 2 < (T.c[2] + D.coin.r) ** 2 || boxCircle(T.b, c[0], c[1], D.coin.r))) st.cm |= 1 << i; });
      // 결승(11) — 들어가는 순간, 코인을 다 모았을 때만
      const inF = cellsHit(P.finish, T.c[0] - T.c[2], T.c[1] - T.c[2], T.c[0] + T.c[2], T.c[1] + T.c[2], T.c) || cellsHit(P.finish, T.b[0], T.b[1], T.b[2], T.b[3]);
      if (inF && !st.fin) { const all = (1 << P.S.coins.length) - 1; if ((st.cm & all) === all) { nextStage(); return; } }
      st.fin = inF ? 1 : 0;
    } else {
      st.dt += DT;
      if (st.dt >= RESPAWN) { st.a = 1; st.en = 1; st.x = 0; st.y = 0; st.dx = st.dy = 0; st.op = 0; st.fin = 0; st.d++; st.sd++; st.cm = 0; }
    }
  }
  function nextStage() {
    const st = G.st, n = st.s + 1, clearT = Math.max(0, st.pt - st.ps), deaths = st.sd;
    saveRecord(n, clearT, deaths);
    G.cleared.push({ n, t: clearT, d: deaths });
    if (st.s + 1 >= NSTAGE) { st.end = { lt: clearT, ld: deaths, tt: st.pt, td: st.d, n }; st.en = 0; st.ev++; pushState(true); showEnd(); return; }
    st.s++; st.s0 = st.T; st.sd = 0; st.cm = 0; st.x = 0; st.y = 0; st.dx = st.dy = 0; st.op = 0; st.fin = 0; st.ps = st.pt; st.en = 1; st.ev++;
    G.E = makeEnemies(st.s, G.run.diff); G.E.tick = st.T; G.E.si = st.s; G.E.s0 = st.s0;
    G.lastClear = { n, t: clearT, d: deaths };
    onStageChange(true);
    pushState(true);
  }
  // 적 시뮬레이션을 틱 T 까지 맞추기 (참가자는 방장 틱을 따라감)
  function syncEnemies(T) {
    const st = G.st;
    if (!G.E || G.E.si !== st.s || G.E.s0 !== st.s0 || G.E.tick > T + 2) { G.E = makeEnemies(st.s, G.run.diff); G.E.si = st.s; G.E.s0 = st.s0; G.E.tick = st.s0; }
    let n = 0; while (G.E.tick < T && n++ < 6000) stepEnemies(G.E, G.E.tick + 1);
  }

  // ════════ 기록 (원작 스팀 리더보드 대신 이 브라우저) ════════
  const REC_KEY = 'wasd_rec_v1';
  function loadRec() { try { return JSON.parse(localStorage.getItem(REC_KEY)) || {}; } catch (e) { return {}; } }
  function recKey(diff, solo) { return (solo ? 's' : 'm') + diff; }
  function saveRecord(n, t, d) {
    if (!G || !G.me) return;
    const R = loadRec(), k = recKey(G.run.diff, G.order.length < 2), r = R[k] = R[k] || {}, o = r[n] = r[n] || {};
    o.t = o.t == null ? t : Math.min(o.t, t); o.d = o.d == null ? d : Math.min(o.d, d);
    if (G.order.length >= 2 && d <= 5) o.gold = 1;                 // 원작 ClearStage_N_Gold 업적 조건
    try { localStorage.setItem(REC_KEY, JSON.stringify(R)); } catch (e) {}
  }
  // 원작 IsStageUnlocked: 1인이거나 쉬움이면 전부, 아니면 (최고 클리어 + 1)까지
  function unlockedMax(diff, solo) {
    if (solo || diff === 0) return NSTAGE;
    const r = loadRec()[recKey(diff, false)] || {}; let mx = 0; for (const k in r) mx = Math.max(mx, +k);
    return Math.min(NSTAGE, mx + 1);
  }

  // ════════ 네트워크 ════════
  const FB_OK = typeof firebase !== 'undefined';
  let db = null; if (FB_OK) { try { firebase.initializeApp({ apiKey: "AIzaSyD8_pSiOVOWmCitHl_nWcgSZobMFI5NgXM", authDomain: "rolling2-17a8f.firebaseapp.com", databaseURL: "https://rolling2-17a8f-default-rtdb.asia-southeast1.firebasedatabase.app", projectId: "rolling2-17a8f", storageBucket: "rolling2-17a8f.firebasestorage.app", messagingSenderId: "936512265515", appId: "1:936512265515:web:c9cb05f341267af81a796e" }); db = firebase.database(); } catch (e) { db = null; } }
  let srvOff = 0; if (db) db.ref('.info/serverTimeOffset').on('value', s => srvOff = s.val() || 0);
  const genCode = () => { const c = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; let r = ''; for (let i = 0; i < 6; i++) r += c[Math.floor(Math.random() * c.length)]; return r; };
  const keyOf = n => n.replace(/[.#$\[\]\/]/g, '_') + '_' + Math.random().toString(36).slice(2, 6);
  let me = null, code = null, isHost = false, room = null, roomRef = null, roomCb = null;
  const R = p => db.ref('games/wd_' + code + (p ? '/' + p : ''));

  $('nick').value = localStorage.getItem('wasd_nick') || localStorage.getItem('lb_nick') || '';
  const getNick = () => { let n = $('nick').value.trim(); if (n.length < 2) n = '다람쥐' + Math.floor(Math.random() * 900 + 100); localStorage.setItem('wasd_nick', n); return n; };
  const qs = new URLSearchParams(location.search); if (qs.get('room')) $('joinCode').value = qs.get('room').toUpperCase();

  $('btnSolo').onclick = () => { me = { k: 'me', nick: getNick() }; isHost = true; code = null; room = null; soloLobby(); };
  $('btnCreate').onclick = async () => {
    if (!db) return toast('온라인 연결이 안 돼요 — 혼자 하기로 해 보세요');
    const n = getNick(); code = genCode(); me = { k: keyOf(n), nick: n }; isHost = true;
    await R().set({ host: me.k, created: Date.now(), expiresAt: Date.now() + 6 * 3600e3, phase: 'lobby', diff: 1, stage: 1, players: { [me.k]: { nick: n, col: 0, ready: true, at: Date.now() } } });
    enterRoom();
  };
  $('btnJoin').onclick = async () => {
    if (!db) return toast('온라인 연결이 안 돼요');
    const c = $('joinCode').value.trim().toUpperCase(); if (c.length !== 6) return toast('방 코드 6자리를 넣어 주세요');
    const snap = await db.ref('games/wd_' + c).once('value'), r = snap.val(); if (!r || !r.players) return toast('그런 방이 없어요');
    if (Object.keys(r.players).length >= 4) return toast('방이 가득 찼어요 (최대 4명)');
    if (r.phase === 'play') return toast('이미 게임 중이에요 — 끝나면 들어와 주세요');
    const used = Object.values(r.players).map(p => p.col); let col = 0; while (used.includes(col)) col++;
    const n = getNick(); code = c; me = { k: keyOf(n), nick: n }; isHost = false;
    await R('players/' + me.k).set({ nick: n, col, ready: false, at: Date.now() });
    enterRoom();
  };
  function enterRoom() {
    $('home').classList.add('hide'); $('lobby').classList.remove('hide'); $('lbCode').textContent = code;
    history.replaceState(null, '', location.pathname + '?room=' + code);
    R('players/' + me.k).onDisconnect().remove();
    roomRef = R(); roomCb = roomRef.on('value', s => onRoom(s.val()));
    bgm('main');
  }
  function onRoom(r) {
    room = r;
    if (!r || !r.players) { toast('방이 사라졌어요'); return backHome(); }
    if (!r.players[me.k]) { toast('방에서 나왔어요'); return backHome(); }
    const wasHost = isHost; isHost = r.host === me.k || !r.players[r.host];
    if (isHost && r.host !== me.k) R('host').set(me.k);
    if (isHost && !wasHost && G) toast('방장이 나가서 내가 방장이 됐어요');
    if (isHost) R('unl').set([0, 1, 2].map(d => unlockedMax(d, false)));
    if (r.phase === 'play' && r.run && (!G || G.run.id !== r.run.id)) { startGame(r.run); return; }
    if (G && r.phase === 'play' && r.run && G.run.id === r.run.id) { gameRoom(r); return; }
    if (G && r.phase !== 'play') { endGameToLobby(r.endMsg); }
    renderLobby(r);
  }
  function backHome() {
    if (roomRef) { roomRef.off('value', roomCb); roomRef = null; }
    stopGame(); room = null; code = null;
    history.replaceState(null, '', location.pathname);
    $('lobby').classList.add('hide'); $('ovEnd').classList.add('hide'); $('ovMenu').classList.add('hide'); $('home').classList.remove('hide');
    bgm('main');
  }

  // ════════ 대기실 ════════
  let soloOpt = { diff: 1, stage: 1 };
  function soloLobby() {
    $('home').classList.add('hide'); $('lobby').classList.remove('hide'); $('lbCode').textContent = '혼자';
    renderLobby({ host: 'me', diff: soloOpt.diff, stage: soloOpt.stage, players: { me: { nick: me.nick, col: 0, ready: true, at: 0 } }, solo: true });
  }
  function renderLobby(r) {
    const solo = !!r.solo, ps = Object.entries(r.players).sort((a, b) => a[1].at - b[1].at), n = ps.length;
    let h = ps.map(([k, p]) => `<div class="pl ${p.ready || k === r.host ? 'rdy' : ''} ${k === me.k ? 'me' : ''}"><i style="background:${PCOL[p.col % 4]}"></i>${esc(p.nick)}${k === r.host ? ' 👑' : ''}<small>${k === r.host ? '방장' : p.ready ? '준비 완료' : '대기 중'}</small></div>`).join('');
    if (!solo) for (let i = n; i < 4; i++) h += `<div class="pl empty">빈 자리</div>`;
    $('lbPlayers').innerHTML = h;
    const diff = r.diff | 0, stage = r.stage | 0 || 1;
    const unl = solo ? NSTAGE : n < 2 ? NSTAGE : ((r.unl || [8, 1, 1])[diff] || 1);
    [...$('lbDiff').children].forEach(b => { b.classList.toggle('on', +b.dataset.v === diff); b.disabled = !isHost; });
    $('lbOptTxt').textContent = isHost ? '' : '(방장이 골라요)';
    const rec = loadRec()[recKey(diff, solo || n < 2)] || {};
    let sh = '';
    for (let i = 1; i <= NSTAGE; i++) {
      const lock = i > unl, o = rec[i];
      sh += `<button class="stg ${i === stage ? 'on' : ''} ${lock ? 'lock' : ''}" data-v="${i}" ${lock || !isHost ? 'disabled' : ''}><span class="th">${THICON[THEME(i)]}</span><b>${lock ? '🔒' : i}</b><small>${o ? `${fmt(o.t).replace(/^00:/, '')} · 💀${o.d}${o.gold ? ' 🥇' : ''}` : lock ? '잠김' : '기록 없음'}</small></button>`;
    }
    $('lbStages').innerHTML = sh;
    $('lbUnlock').innerHTML = (solo || n < 2 ? '혼자 하면 다람쥐의 W·A·S·D 를 모두 내가 맡아요. 모든 스테이지가 열려 있어요.' : diff === 0 ? '쉬움은 모든 스테이지가 열려 있어요.' : '보통·어려움은 방장이 깬 스테이지 다음까지 열려요. (2~4명 기록)')
      + `<br>키 나눔: 2명 → 2개씩 · 3명 → 한 명만 2개 · 4명 → 1개씩 (시작할 때 무작위)`;
    const allReady = ps.every(([k, p]) => p.ready || k === r.host);
    $('lbStart').classList.toggle('hide', !isHost); $('lbStart').disabled = !allReady || stage > unl;
    $('lbReady').classList.toggle('hide', isHost || solo);
    $('lbReady').textContent = r.players[me.k] && r.players[me.k].ready ? '준비 취소' : '준비';
  }
  $('lbDiff').onclick = e => { const b = e.target.closest('button'); if (!b || !isHost) return; const v = +b.dataset.v; if (!code) { soloOpt.diff = v; soloLobby(); } else R().update({ diff: v, stage: 1 }); };
  $('lbStages').onclick = e => { const b = e.target.closest('button'); if (!b || b.disabled || !isHost) return; const v = +b.dataset.v; if (!code) { soloOpt.stage = v; soloLobby(); } else R('stage').set(v); };
  $('lbReady').onclick = () => { if (code && room) R('players/' + me.k + '/ready').set(!room.players[me.k].ready); };
  // 나가기 — 마지막 한 명이면 방째로 지움
  const leaveRoom = () => (room && room.players && Object.keys(room.players).length <= 1 ? R() : R('players/' + me.k)).remove().then(backHome);
  $('lbLeave').onclick = () => { if (!code) return backHome(); leaveRoom(); };
  $('lbCode').onclick = () => { if (!code) return; const u = location.origin + location.pathname + '?room=' + code; navigator.clipboard && navigator.clipboard.writeText(u).then(() => toast('초대 링크를 복사했어요')); };
  $('lbStart').onclick = () => {
    if (!isHost) return;
    if (!code) return startGame({ id: 'solo' + Date.now(), keys: { me: 15 }, order: ['me'], stage: soloOpt.stage, diff: soloOpt.diff, nicks: { me: me.nick }, cols: { me: 0 } });
    const ps = Object.entries(room.players).sort((a, b) => a[1].at - b[1].at), ids = ps.map(p => p[0]);
    const run = { id: genCode() + Date.now(), keys: assignKeys(ids), order: ids, stage: room.stage || 1, diff: room.diff | 0, nicks: Object.fromEntries(ps.map(([k, p]) => [k, p.nick])), cols: Object.fromEntries(ps.map(([k, p]) => [k, p.col])) };
    R().update({ phase: 'play', run, st: null, in: null, loaded: null, endMsg: null });
  };

  // ════════ 게임 시작 · 진행 ════════
  function startGame(run) {
    stopGame();
    G = { run, me, keys: run.keys, order: run.order, myKeys: run.keys[me.k] || 0, st: newState(run), inputs: {}, used: {}, pressId: 0, fx: [], cleared: [], disp: { x: 0, y: 0 }, cam: { x: 0, y: 0 }, recv: performance.now(), anim: { ph: 0, dir: 'front', dieT: -1, dieX: 0, dieY: 0 }, lastEv: -1, solo: !code, started: performance.now() };
    G.E = null; syncEnemies(0);
    $('lobby').classList.add('hide'); $('home').classList.add('hide'); $('ovEnd').classList.add('hide'); $('hud').classList.remove('hide');
    buildHudUsers(); buildTouch(); onStageChange(false);
    bgm(SONG_OF(G.st.s + 1));
    if (G.solo) { G.st.go = 1; prepShow(null); sfx('move'); notice(`스테이지 ${G.st.s + 1}<small>내 키: W A S D 전부</small>`); }
    else {
      R('loaded/' + me.k).set(run.id);
      R('in/' + me.k).onDisconnect().remove();
      prepShow(`접속 기다리는 중…`);
      if (isHost) {
        R('st').set(packState());
        G.loadTimer = setTimeout(() => { if (G && !G.st.go) { R().update({ phase: 'lobby', endMsg: '접속하지 못한 사람이 있어 대기실로 돌아왔어요' }); } }, 30000);
        R('in').on('value', s => { const v = s.val() || {}; if (G) for (const k in v) G.inputs[k] = v[k]; });
      } else {
        R('st').on('value', s => onState(s.val()));
      }
    }
  }
  function prepShow(txt) { if (!txt) return $('prep').classList.add('hide'); $('prep').classList.remove('hide'); $('prepTxt').textContent = txt; }
  function gameRoom(r) {
    if (!G) return;
    const loaded = r.loaded || {}, n = G.order.length, ok = G.order.filter(k => loaded[k] === G.run.id).length;
    if (!G.st.go) { $('prepBig').textContent = `${ok} / ${n}`; prepShow('모두 들어오면 시작해요'); }
    // 누군가 나가면 원작처럼 게임 종료
    const gone = G.order.filter(k => !r.players[k]);
    if (gone.length && isHost && !G.st.end) { R().update({ phase: 'lobby', endMsg: `${G.run.nicks[gone[0]]} 님이 나가서 게임이 끝났어요` }); return; }
    if (isHost && !G.st.go && ok >= n) { clearTimeout(G.loadTimer); G.st.go = 1; pushState(true); prepShow(null); sfx('move'); notice(`스테이지 ${G.st.s + 1}<small>${myKeyLine()}</small>`); }
  }
  function myKeyLine() { return G.myKeys ? '내 키: ' + keysOf(G.myKeys).join(' ') : '내 키 없음 (구경)'; }
  function packState() { const s = G.st, r3 = v => Math.round(v * 1000) / 1000; return { T: s.T, s: s.s, s0: s.s0, x: r3(s.x), y: r3(s.y), dx: s.dx, dy: s.dy, a: s.a, dt: r3(s.dt), en: s.en, op: s.op, cm: s.cm, d: s.d, sd: s.sd, pt: r3(s.pt), ps: r3(s.ps), end: s.end, ev: s.ev, go: s.go, w: Date.now() + srvOff, lc: G.lastClear || null }; }
  let lastPush = 0;
  function pushState(force) { if (G.solo || !isHost) return; const now = performance.now(); if (!force && now - lastPush < 66) return; lastPush = now; R('st').set(packState()); }
  function onState(v) {
    if (!G || !v) return;
    const prevS = G.st.s, prevA = G.st.a, prevCm = G.st.cm, prevEnd = G.st.end;
    Object.assign(G.st, v); G.recv = performance.now(); G.ping = Math.max(0, Date.now() + srvOff - v.w);
    if (v.go && !$('prep').classList.contains('hide')) { prepShow(null); sfx('move'); notice(`스테이지 ${G.st.s + 1}<small>${myKeyLine()}</small>`); }
    if (v.s !== prevS) { G.lastClear = v.lc; if (v.lc) G.cleared.push(v.lc); if (v.lc) saveRecord(v.lc.n, v.lc.t, v.lc.d); onStageChange(true); }
    if (prevA && !v.a) G.fx.push({ t: 'die', x: v.x, y: v.y });
    if (v.end && !prevEnd) { if (v.end.n) saveRecord(v.end.n, v.end.lt, v.end.ld); showEnd(); }
    if (v.cm !== prevCm && v.cm) {}
  }
  function onStageChange(sound) {
    const st = G.st; G.disp.x = st.x; G.disp.y = st.y; G.cam.x = st.x; G.cam.y = st.y;
    if (sound) {
      sfx('move');
      const lc = G.lastClear;
      notice(`스테이지 ${st.s + 1}<small>${lc ? `${lc.n} 클리어 ${fmt(lc.t)} · 💀${lc.d}${lc.d <= 5 && G.order.length >= 2 ? ' 🥇' : ''}` : ''}</small>`, 3000);
      bgm(SONG_OF(st.s + 1));
    }
  }
  function stopGame() {
    if (!G) return;
    clearTimeout(G.loadTimer);
    if (code && db) { R('st').off(); R('in').off(); }
    G = null; $('hud').classList.add('hide'); $('touch').classList.add('hide'); $('prep').classList.add('hide'); $('ovMenu').classList.add('hide');
  }
  function endGameToLobby(msg) { stopGame(); $('ovEnd').classList.add('hide'); if (msg) toast(msg, 3500); $('lobby').classList.remove('hide'); bgm('main'); }

  // ════════ 입력 ════════
  const KEYMAP = { KeyW: 'W', KeyA: 'A', KeyS: 'S', KeyD: 'D', ArrowUp: 'W', ArrowLeft: 'A', ArrowDown: 'S', ArrowRight: 'D' };
  function press(k) {
    if (!G || !G.st.go || G.st.end || !$('ovMenu').classList.contains('hide')) return;
    const f = KF[k]; G.pressId++;
    flashKey(k);
    const inp = { f, id: G.pressId };
    if (G.solo || isHost) G.inputs[me.k] = inp; else R('in/' + me.k).set(inp);
  }
  addEventListener('keydown', e => {
    if (e.target && e.target.tagName === 'INPUT') return;
    if (e.code === 'Escape') { if (G) toggleMenu(); return; }
    const k = KEYMAP[e.code]; if (!k || !G) return;
    e.preventDefault(); if (e.repeat) return; press(k);
  });
  function buildTouch() {
    const t = $('touch'), coarse = matchMedia('(pointer: coarse)').matches;
    if (!coarse || !G.myKeys) { t.classList.add('hide'); return; }
    t.innerHTML = keysOf(G.myKeys).map(k => `<button data-k="${k}" style="background:${A.KEYCOL[k]}">${k}</button>`).join('') + `<button data-k="menu" style="background:#fff;width:56px;font-size:24px">⏸</button>`;
    t.classList.remove('hide');
    t.onpointerdown = e => { const b = e.target.closest('button'); if (!b) return; e.preventDefault(); if (b.dataset.k === 'menu') toggleMenu(); else press(b.dataset.k); };
  }
  function toggleMenu() {
    const m = $('ovMenu'), open = m.classList.contains('hide');
    if (G && G.st.end) return;
    m.classList.toggle('hide', !open);
    $('menuTip').textContent = G.solo ? '혼자 할 때는 멈춰 있어요.' : '다른 사람의 게임은 계속 진행돼요. 한 명이라도 나가면 모두 대기실로 돌아가요.';
    $('mLobby').classList.toggle('hide', !(isHost || G.solo));
  }
  $('mResume').onclick = () => $('ovMenu').classList.add('hide');
  $('mLobby').onclick = () => { $('ovMenu').classList.add('hide'); if (!code) { stopGame(); soloLobby(); } else if (isHost) R().update({ phase: 'lobby', endMsg: '방장이 대기실로 돌아왔어요' }); };
  $('mQuit').onclick = () => { $('ovMenu').classList.add('hide'); if (!code) { stopGame(); backHome(); } else leaveRoom(); };

  // ════════ 엔딩 (원작 UI_Ending: 마지막 스테이지 시간·죽음 + 전체 시간·죽음) ════════
  function showEnd() {
    const e = G.st.end; if (!e) return;
    bgm(null); sfx('clear');          // 원작: StopAllBGM → Clear
    const golds = G.cleared.filter(c => c.d <= 5).length;
    $('endBoard').innerHTML = `<div class="stamp">CLEAR</div><h2>🎉 모두 클리어!</h2>
      <p class="tip">${DIFF[G.run.diff]} · ${G.order.length}명 · 스테이지 ${G.run.stage} → ${NSTAGE}</p>
      <div class="grid"><div><small>마지막 스테이지 시간</small><b>${fmt(e.lt)}</b></div><div><small>마지막 스테이지 죽음</small><b>💀 ${e.ld}</b></div>
      <div><small>전체 시간</small><b>${fmt(e.tt)}</b></div><div><small>전체 죽음</small><b>💀 ${e.td}</b></div></div>
      <p class="tip">${G.cleared.map(c => `${c.n}: ${fmt(c.t).replace(/^00:/, '')} 💀${c.d}${c.d <= 5 && G.order.length >= 2 ? '🥇' : ''}`).join(' · ')}${golds && G.order.length >= 2 ? `<br>🥇 죽음 5번 이하로 깬 스테이지 ${golds}개` : ''}</p>
      <div class="row" style="justify-content:center;margin-top:12px"><button class="btn go" id="eLobby">${G.solo || isHost ? '대기실로' : '방장을 기다려요'}</button><button class="btn" id="eQuit">나가기</button></div>`;
    $('ovEnd').classList.remove('hide');
    $('eLobby').disabled = !(G.solo || isHost);
    $('eLobby').onclick = () => { if (!code) { stopGame(); $('ovEnd').classList.add('hide'); soloLobby(); } else R().update({ phase: 'lobby', endMsg: null }); };
    $('eQuit').onclick = () => { $('ovEnd').classList.add('hide'); if (!code) { stopGame(); backHome(); } else leaveRoom(); };
  }

  // ════════ HUD ════════
  function buildHudUsers() {
    if (G.solo) { $('hUsers').innerHTML = ''; }
    else $('hUsers').innerHTML = G.order.map(k => `<div class="user ${k === me.k ? 'me' : ''}" data-k="${k}"><span class="keys">${keysOf(G.keys[k] || 0).map(x => `<span class="kc" data-key="${x}" style="background:${A.KEYCOL[x]}">${x}</span>`).join('')}</span>${esc(G.run.nicks[k] || '?')}</div>`).join('');
    $('myKeys').innerHTML = G.myKeys ? `내 키 <span class="keys">${keysOf(G.myKeys).map(x => `<span class="kc" data-key="${x}" style="background:${A.KEYCOL[x]}">${x}</span>`).join('')}</span> · Esc 메뉴` : '';
    const c = $('hCoinIc').getContext('2d'); c.clearRect(0, 0, 68, 68); A.coin(c, 34, 34, 60, 0);
  }
  function flashKey(k) { document.querySelectorAll(`.kc[data-key="${k}"]`).forEach(el => { if (!el.closest('.user.me') && !el.closest('#myKeys')) return; el.style.transform = 'translateY(2px) scale(.92)'; setTimeout(() => el.style.transform = '', 120); }); }
  let hudT = 0;
  function updHud() {
    const st = G.st, S = D.stages[st.s], all = S.coins.length;
    let got = 0; for (let i = 0; i < all; i++) if (st.cm & (1 << i)) got++;
    $('hTime').textContent = fmt(st.pt); $('hSTime').textContent = '(' + fmt(st.pt - st.ps) + ')';
    $('hDeath').textContent = st.d; $('hSDeath').textContent = '(' + st.sd + ')';
    $('hCoin').textContent = `${got} / ${all}`;
    $('hStage').textContent = `스테이지 ${st.s + 1} / ${NSTAGE} · ${DIFF[G.run.diff]}${st.op ? ' · 🌪 모래폭풍 — 키가 거꾸로!' : ''}`;
    $('hPing').textContent = G.solo ? '' : isHost ? '방장' : `${Math.round(G.ping || 0)} ms`;
  }

  // ════════ 그리기 ════════
  const cv = $('view'), ctx = cv.getContext('2d');
  let W = 0, H = 0, DPR = 1;
  function resize() { DPR = Math.min(2, devicePixelRatio || 1); W = innerWidth; H = innerHeight; cv.width = W * DPR; cv.height = H * DPR; }
  addEventListener('resize', resize); resize();
  function seedRand(n) { let s = n >>> 0 || 1; return () => { s = (s + 0x6D2B79F5) >>> 0; let t = s; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; }
  function chunk(P, ci, cj) {
    const key = ci + ',' + cj; let c = P.chunks.get(key); if (c) return c;
    c = document.createElement('canvas'); c.width = c.height = CH * CPX; const g = c.getContext('2d');
    const X0 = ci * CH, YT = (cj + 1) * CH, px = x => (x - X0) * CPX, py = y => (YT - y) * CPX;
    // 바탕 (원작 background 타일색) + 잔무늬
    g.fillStyle = P.bg; g.fillRect(0, 0, c.width, c.height);
    const rnd = seedRand(ci * 7919 + cj * 104729 + P.n);
    for (let i = 0; i < 70; i++) { const x = rnd() * c.width, y = rnd() * c.height; g.fillStyle = rnd() < .5 ? A.hex(P.bg, .1) : A.hex(P.bg, -.08); if (P.theme === 'ocean') { g.fillRect(x, y, 10, 2); } else { g.beginPath(); g.arc(x, y, 1.5 + rnd() * 2, 0, 6.28); g.fill(); } }
    const items = P.buckets.get(key) || [];
    for (const it of items) {
      const x = px(it.x), y = py(it.y + it.h), w = it.w * CPX, h = it.h * CPX;
      if (it.kind === 'ground') {
        g.fillStyle = it.col; g.fillRect(x - .5, y - .5, w + 1, h + 1);
        const r2 = seedRand(Math.floor(it.x * 13 + 7) * 31 + Math.floor(it.y * 17 + 3));
        if (r2() < .35) { g.fillStyle = A.hex(it.col, -.12); g.beginPath(); g.ellipse(x + r2() * w, y + r2() * h, 2 + r2() * 3, 1.5 + r2() * 2, 0, 0, 6.28); g.fill(); }
      } else if (it.kind === 'border') {
        g.fillStyle = P.edge; g.fillRect(x - .5, y - .5, w + 1, h + 1);
      } else if (it.kind === 'start') {
        g.fillStyle = (it.ci & 1) ? A.hex(P.edge, .25) : A.hex(P.road, -.05); g.fillRect(x, y, w, h);
      } else if (it.kind === 'deco') {
        A.deco(g, it.nm, x, y, w, h, it.sp, it.fx);
      } else if (it.kind === 'guide') drawGuide(g, it, x, y, w, h);
    }
    // 길 가장자리 선 (벽 칸이 길과 맞닿는 변)
    g.strokeStyle = P.edgeLine; g.lineWidth = 3; g.lineCap = 'round'; g.globalAlpha = .45; g.beginPath();
    for (const it of items) if (it.kind === 'border' && it.sides) {
      const x = px(it.x), y = py(it.y + it.h), w = it.w * CPX, h = it.h * CPX;
      if (it.sides & 1) { g.moveTo(x, y); g.lineTo(x + w, y); } if (it.sides & 2) { g.moveTo(x + w, y); g.lineTo(x + w, y + h); }
      if (it.sides & 4) { g.moveTo(x, y + h); g.lineTo(x + w, y + h); } if (it.sides & 8) { g.moveTo(x, y); g.lineTo(x, y + h); }
    }
    g.stroke(); g.globalAlpha = 1;
    P.chunks.set(key, c); return c;
  }
  function drawGuide(g, it, x, y, w, h) { // 원작 안내판 스프라이트를 같은 자리에 비슷한 그림으로
    const n = it.nm, cx = x + w / 2, cy = y + h / 2, s = Math.min(w, h);
    if (n === 'Coin') A.coin(g, cx, cy, s * .9, 0);
    else if (n.startsWith('walk_')) A.tori(g, cx, cy + s * .05, s * .3, n.includes('right') ? 'right' : 'left', 0, false);
    else if (n.startsWith('Atlas_08')) A.arrow(g, cx, cy, s * 1.2, false);
    else if (n === 'StormIcon') A.storm(g, cx, cy, s * .9);
    else if (n.startsWith('IMG_')) A.keycap(g, cx, cy, s * .8, n.slice(4));
  }
  function frame(now) {
    requestAnimationFrame(frame);
    if (!G) { drawHome(now); return; }
    const dtR = Math.min(.1, (now - (frame.last || now)) / 1000); frame.last = now;
    // 진행: 방장/혼자는 simPump(Worker 타이머)가 틱을 돌림, 참가자는 받은 틱을 따라 적만 돌림
    if (!(G.solo || isHost) && G.st.go && !G.st.end) {
      const age = (now - G.recv) / 1000; syncEnemies(G.st.T + Math.min(.3, age) * 60);
    }
    render(dtR, now / 1000);
    if ((hudT += dtR) > .2) { hudT = 0; updHud(); }
  }
  function render(dtR, t) {
    const st = G.st, P = prep(st.s);
    // 다람쥐 표시 위치 (참가자는 받은 위치에서 진행 방향으로 짧게 예측)
    let tx = st.x, ty = st.y;
    if (!(G.solo || isHost) && st.a && st.en) { const age = Math.min(.25, (performance.now() - G.recv) / 1000); tx += st.dx * SPEED * age; ty += st.dy * SPEED * age; }
    if (Math.hypot(tx - G.disp.x, ty - G.disp.y) > 2.5 || G.solo || isHost) { G.disp.x = tx; G.disp.y = ty; }
    else { const k = 1 - Math.exp(-dtR * 18); G.disp.x += (tx - G.disp.x) * k; G.disp.y += (ty - G.disp.y) * k; }
    // 카메라: Cinemachine 감쇠 1초 (99% 도달)
    const kc = 1 - Math.exp(-4.6 * dtR); G.cam.x += (G.disp.x - G.cam.x) * kc; G.cam.y += (G.disp.y - G.cam.y) * kc;
    const PPU = Math.min(H / 18, W / 16) * (G.zoom || 1);  // 원작 직교 크기 9 (세로 화면은 가로 16유닛 보장 · zoom 은 시험용)
    ctx.setTransform(DPR, 0, 0, DPR, 0, 0);
    ctx.fillStyle = P.bg; ctx.fillRect(0, 0, W, H);
    const wx0 = G.cam.x - W / 2 / PPU, wx1 = G.cam.x + W / 2 / PPU, wy0 = G.cam.y - H / 2 / PPU, wy1 = G.cam.y + H / 2 / PPU;
    const sx = x => (x - G.cam.x) * PPU + W / 2, sy = y => (G.cam.y - y) * PPU + H / 2;
    ctx.imageSmoothingEnabled = true;
    for (let ci = Math.floor(wx0 / CH); ci <= Math.floor(wx1 / CH); ci++) for (let cj = Math.floor(wy0 / CH); cj <= Math.floor(wy1 / CH); cj++) {
      if (ci * CH > P.x1 || (ci + 1) * CH < P.x0 || cj * CH > P.y1 || (cj + 1) * CH < P.y0) continue;
      ctx.drawImage(chunk(P, ci, cj), Math.floor(sx(ci * CH)), Math.floor(sy((cj + 1) * CH)), Math.ceil(CH * PPU) + 1, Math.ceil(CH * PPU) + 1);
    }
    const S = P.S, all = (1 << S.coins.length) - 1;
    // 도착 칸: 코인을 다 모으면 반짝
    if ((st.cm & all) === all && P.finishCells) { ctx.fillStyle = `rgba(255,236,120,${.25 + .2 * Math.sin(t * 6)})`; for (const [x, y, w, h] of P.finishCells) ctx.fillRect(sx(x), sy(y + h), w * PPU + 1, h * PPU + 1); }
    // 코인
    S.coins.forEach((c, i) => { if (!(st.cm & (1 << i))) A.coin(ctx, sx(c[0]), sy(c[1]), PPU * 1.0, t + i); });
    // 적
    if (G.E) {
      for (const o of G.E.ents) {
        const L = o.e.look, x = sx(o.x), y = sy(o.y);
        if (o.e.k === 'nyang') A.nyang(ctx, x, y, PPU, t + o.x, o.fx);
        else if (o.e.k === 'kame') { const c = o.e.cols[0] || { x: 0, y: 0 }; A.wind(ctx, x + c.x * PPU, y - c.y * PPU, PPU * .95, t, o.fx); }
        else if (o.e.k === 'ball') A.ball(ctx, x, y, PPU * 1.3, t + o.x);
        for (const p of o.parts) A.ball(ctx, sx(o.x + p.x), sy(o.y + p.y), PPU * 1.3, t + p.x);
      }
      for (const w of G.E.mills) for (const [bx, by] of millBalls(w)) A.ball(ctx, sx(bx), sy(by), PPU * 1.3, t + bx * .3);
    }
    // 다람쥐
    const an = G.anim;
    if (st.dx > 0) an.dir = 'right'; else if (st.dx < 0) an.dir = 'left'; else if (st.dy > 0) an.dir = 'up'; else if (st.dy < 0) an.dir = 'front';
    const moving = st.a && st.en && (st.dx || st.dy);
    if (!st.dx && !st.dy) an.dir = an.dir === 'up' ? 'up' : an.dir;
    an.ph = (an.ph + dtR / (moving ? .667 : 1.4)) % 1;
    if (st.a) A.tori(ctx, sx(G.disp.x), sy(G.disp.y - .1), PPU * 1.02, (st.dx || st.dy) ? an.dir : 'front', an.ph, moving);
    // 죽음 연기
    for (const f of G.fx) if (f.t === 'die' && f.k == null) { f.k = 0; sfx('die'); }
    G.fx = G.fx.filter(f => { f.k += dtR / D.die.len; if (f.k >= 1) return false; A.poof(ctx, sx(f.x - .1), sy(f.y), PPU * 1.66, f.k); return true; });
    // 코인 효과음 (모은 수가 늘면)
    const got = st.cm; if (G.lastCm != null && got > G.lastCm && (got & ~G.lastCm)) sfx('coin'); G.lastCm = got;
    // 빛 (원작 ForestLight · OceanLight · DesertLight)
    ctx.save(); ctx.globalCompositeOperation = 'screen';
    for (const L of S.lights) { if (st.op && L.s === 'desert_light') continue; ctx.save(); ctx.translate(sx(L.x), sy(L.y)); ctx.rotate(-L.rot); ctx.globalAlpha = Math.min(1, L.a); A.light(ctx, L.s, L.w * PPU, L.h * PPU, t); ctx.restore(); }
    ctx.restore();
    // 모래폭풍 (원작 카메라 자식 Swamp: 갈색 α 0.78)
    if (st.op) {
      ctx.fillStyle = 'rgba(118,68,32,.78)'; ctx.fillRect(0, 0, W, H);
      ctx.strokeStyle = 'rgba(240,200,140,.35)'; ctx.lineWidth = 2;
      for (let i = 0; i < 60; i++) { const yy = ((i * 97.3) % H), xx = ((i * 211.7 + t * 900 * (1 + i % 3 * .4)) % (W + 200)) - 100; ctx.beginPath(); ctx.moveTo(xx, yy); ctx.lineTo(xx + 80 + i % 5 * 20, yy + 6); ctx.stroke(); }
    }
  }
  // 첫 화면 그림
  function drawHome(now) {
    const c = $('homeArt'); if (!c || $('home').classList.contains('hide')) return;
    const g = c.getContext('2d'), t = now / 1000; g.clearRect(0, 0, c.width, c.height);
    g.fillStyle = '#8bc656'; A.rr(g, 0, 20, 560, 128, 20); g.fill(); g.fillStyle = '#c69c6d'; g.fillRect(0, 70, 560, 46); g.fillStyle = '#a7d77a'; g.fillRect(0, 64, 560, 6); g.fillRect(0, 116, 560, 6);
    const x = ((t * 120) % 760) - 100;
    A.coin(g, (x + 220) % 760 - 100 > x ? 400 : 400, 92, 34, t);
    A.nyang(g, 500, 60, 44, t, false);
    A.tori(g, x, 92, 52, 'right', (t / .667) % 1, true);
    ['W', 'A', 'S', 'D'].forEach((k, i) => A.keycap(g, 36 + i * 44, 40, 34, k));
  }
  requestAnimationFrame(frame);
  // 방장 시뮬레이션 시계 — 화면(rAF)과 떼어 Worker 타이머로: 방장 탭이 뒤로 가도 모두의 게임이 멈추지 않게
  function simPump() {
    if (!G || G.manual || !(G.solo || isHost)) { if (G) G.lastPump = performance.now(); return; }
    const now = performance.now(), dt = Math.min(2, (now - (G.lastPump || now)) / 1000); G.lastPump = now;
    if (G.solo && !$('ovMenu').classList.contains('hide')) return;
    G.acc = (G.acc || 0) + dt; let n = 0; while (G.acc >= DT && n++ < 240) { G.acc -= DT; hostTick(); } if (n >= 240) G.acc = 0;
    pushState(false);
  }
  try { const w = new Worker(URL.createObjectURL(new Blob(['setInterval(function(){postMessage(0)},15)'], { type: 'text/javascript' }))); w.onmessage = simPump; window.__wasdTicker = w; } catch (e) { setInterval(simPump, 15); }
  setInterval(() => { if (G && (!G.lastPump || performance.now() - G.lastPump > 500)) simPump(); }, 250);   // Worker 가 막힌 환경 대비

  // ════════ 시험용 훅 (창이 숨어 rAF 가 멈춰도 돌릴 수 있게) ════════
  window.WASD_VER = 3;
  window.wasd = {
    get G() { return G; }, D, prep, keyToDir, assignKeys,
    solo(stage = 1, diff = 1) { me = { k: 'me', nick: 'test' }; isHost = true; code = null; soloOpt = { stage, diff }; startGame({ id: 'solo' + Date.now(), keys: { me: 15 }, order: ['me'], stage, diff, nicks: { me: 'test' }, cols: { me: 0 } }); G.manual = true; return G.st; },
    step(sec = 1) { const n = Math.round(sec / DT); for (let i = 0; i < n; i++) hostTick(); render(DT, performance.now() / 1000); updHud(); return this.state(); },
    tick(n = 1) { for (let i = 0; i < n; i++) hostTick(); },
    press, auto(on) { G.manual = !on; },
    state() { const s = G.st; return { stage: s.s + 1, x: +s.x.toFixed(2), y: +s.y.toFixed(2), alive: s.a, coins: s.cm, deaths: s.d, sdeaths: s.sd, op: s.op, end: s.end, T: s.T }; },
    tp(x, y) { G.st.x = x; G.st.y = y; }, coinsAll() { G.st.cm = (1 << D.stages[G.st.s].coins.length) - 1; },
    render() { render(DT, performance.now() / 1000); },
    // 벽(border)에 닿는 자리인지 — 봇 길찾기용
    wallAt(x, y, si) { const P = prep(si == null ? G.st.s : si), T = toriShapes(x, y); return cellsHit(P.borders, T.c[0] - T.c[2], T.c[1] - T.c[2], T.c[0] + T.c[2], T.c[1] + T.c[2], T.c) || cellsHit(P.borders, T.b[0], T.b[1], T.b[2], T.b[3]); },
    finishAt(x, y, si) { const P = prep(si == null ? G.st.s : si), T = toriShapes(x, y); return cellsHit(P.finish, T.b[0], T.b[1], T.b[2], T.b[3]) || cellsHit(P.finish, T.c[0] - T.c[2], T.c[1] - T.c[2], T.c[0] + T.c[2], T.c[1] + T.c[2], T.c); },
    enemyAt(x, y) { return enemyHit(G.E, toriShapes(x, y)); },
  };
})();
