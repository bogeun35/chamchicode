// 쉘다이버 동기 봇 — 콘솔에서 shellBot(n) : n번 탐사(바다→섬 판매→스킬 구매)를 프레임 단위로 즉시 돌려 진행 기록을 반환
// 사용: 페이지에서 Sound 끄고 → const r = shellBot(30); console.table(r)
window.shellBot = function (dives, opt) {
  opt = opt || {};
  const g = window.shelldiver, SD = g.SD, S = SD.S, IN = g.input, K = g.keys, log = [];
  const near = (a, b) => Math.hypot(a.x - b.x, a.y - b.y);
  function aimAt(x, y) { IN.mx = (x - g.cam.x) * g.Z; IN.my = (y - g.cam.y) * g.Z; }
  function moveTo(x, y, stop) {
    const dx = x - g.pl.x, dy = y - g.pl.y, d = Math.hypot(dx, dy);
    K.KeyD = dx > stop; K.KeyA = dx < -stop; K.KeyS = dy > stop; K.KeyW = dy < -stop;
    return d;
  }
  function clearKeys() { for (const k of ['KeyA', 'KeyD', 'KeyW', 'KeyS', 'KeyE']) K[k] = false; IN.lmb = IN.rmb = false; }
  function buyGreedy() {
    let bought = 0;
    for (let guard = 0; guard < 500; guard++) {
      const c = SD.SKILLS.filter(s => SD.canBuy(s)).sort((a, b) => SD.price(a) / (SD.wallet(a.cur) || 1) - SD.price(b) / (SD.wallet(b.cur) || 1));
      if (!c.length) break; SD.buy(c[0]); bought++;
    }
    return bought;
  }
  function islandPhase() {
    clearKeys(); g.island();
    // 상점에 넣기
    g.tp(3440, 392); K.KeyE = true; for (let i = 0; i < 3000 && SD.invCount('inv') > 0; i++) g.step(1); K.KeyE = false;
    // 상점 판매 기다리기 (최대 3분)
    for (let i = 0; i < 60 * 180 && S.store[0]; i++) g.step(1);
    // 상자 꺼내기
    g.tp(3375, 392); K.KeyE = true; for (let i = 0; i < 6000 && S.storeCoins > 0; i++) g.step(1); K.KeyE = false; g.step(90);
    return buyGreedy();
  }
  function oceanPhase(level) {
    g.dive(level); const O = g.O; let frames = 0;
    while (!O.ending && frames < 60 * 600) {
      const pl = g.pl;
      if (pl.dead) { g.step(1); frames++; continue; }
      const toSub = Math.hypot(O.sub.x - pl.x, O.sub.y - pl.y);
      const need = toSub / 1.2 / 60 * (O.lvl.drain / O.lvl.every * 60) * 1.4 + O.lvl.drain * 2;
      const full = SD.invFull('inv');
      if (pl.oxy < need || full || frames > 60 * 400) {
        IN.lmb = IN.rmb = false;
        if (moveTo(O.sub.x, O.sub.y - 14, 3) < 60) { clearKeys(); g.endDive(false); break; }
        g.step(1); frames++; continue;
      }
      // 해파리 우선, 없으면 블록(플라즈마)
      let t = null, td = 1e9; for (const e of O.jellies) { if (e.state || !e.start) continue; const d = near(e, pl); if (d < td) { td = d; t = e; } }
      let b = null, bd = 1e9; if (SD.B.is_plasma_tool_available) for (const e of O.blocks) { if (e.dead || !e.start) continue; const d = near(e, pl); if (d < bd) { bd = d; b = e; } }
      if (t && (td < bd * 1.5 || !b)) { moveTo(t.x - 30, t.y + 20, 6); aimAt(t.x, t.y); IN.lmb = td < 90; IN.rmb = false; }
      else if (b) { moveTo(b.x - 30, b.y, 6); aimAt(b.x, b.y); IN.rmb = bd < 70; IN.lmb = false; }
      else { moveTo(O.sub.x, O.sub.y + 40, 6); IN.lmb = IN.rmb = false; }
      g.step(1); frames++;
    }
    clearKeys(); g.step(200);   // 결과 → 섬 전환
    return frames;
  }
  const fail = {};   // 깊이별 연속 실패 수 → 실패하면 한 단계 얕은 곳에서 키우기
  for (let d = 0; d < dives; d++) {
    let lvl = Math.max(0, Math.min(SD.prestige(), 12) - 1);
    while (lvl > 0 && (fail[lvl] || 0) > 0 && (d % 6) !== 0) lvl--;
    const before = { jelly: S.stats.jelly, dr: S.stats.drowned };
    const f = oceanPhase(lvl);
    document.querySelectorAll('#mOk').forEach(b => b.click());
    const dr = S.stats.drowned;
    const bought = islandPhase();
    const got = S.stats.jelly - before.jelly;
    if (got <= 0 || S.stats.drowned > (before.dr || dr)) fail[lvl] = (fail[lvl] || 0) + 1; else fail[lvl] = 0;
    log.push({ dive: d + 1, lvl, sec: Math.round(f / 60), jelly: S.stats.jelly - before.jelly, shell: Math.floor(S.coins.shell), scrap: S.coins.scrap, crystal: S.coins.crystal, mush: S.coins.mush, obs: S.coins.obsidian, levels: SD.totalLevels(), prestige: SD.prestige(), bought, drowned: S.stats.drowned, play: Math.round(S.playFrames / 60) });
  }
  return log;
};
