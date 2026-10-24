// 바늘 찾기 초반 봇: 맨손으로 더미 가장자리에서 집어 HAY IN 벨트까지 걸어가 던지기를 반복.
// node needle-bot.cjs <policy none|carry|smart> [url]
const { chromium } = require('C:/Users/user/AppData/Roaming/npm/node_modules/rea-agents/node_modules/playwright-core');
const policy = process.argv[2] || 'none', URL = process.argv[3] || 'http://127.0.0.1:8831/needle.html';
(async () => {
  const b = await chromium.launch({ executablePath: 'C:/Program Files/Google/Chrome/Application/chrome.exe', headless: true, args: ['--use-angle=d3d11', '--enable-gpu', '--ignore-gpu-blocklist', '--mute-audio'] });
  const p = await b.newPage({ viewport: { width: 320, height: 200 } });
  const errs = []; p.on('pageerror', e => errs.push(String(e).slice(0, 300)));
  await p.goto(URL + '?mute&t=' + Date.now());
  await p.evaluate(() => { try { localStorage.clear(); } catch (e) {} });
  await p.goto(URL + '?mute&t=' + Date.now());
  await p.waitForFunction(() => window.needle, null, { timeout: 60000 });
  const res = await p.evaluate(async (policy) => {
    const N = window.needle, S = N.S, P = N.P, dt = 1 / 30;
    N.startGame(false);
    const look = (x, y, z) => { const dx = x - P.x, dy = y - (P.y + 1.62), dz = z - P.z; N.look(Math.atan2(-dx, -dz), Math.atan2(dy, Math.hypot(dx, dz))); };
    let simT = 0; const run = s => { const n = Math.max(1, Math.round(s / dt)); N.step(dt, n); simT += n * dt; };
    const walk = (x, z, speed = 4.2) => { const d = Math.hypot(x - P.x, z - P.z); N.tp(x, z); run(d / speed); };
    // 벨트 위 조준점: 시작에서 0.8m
    const A = { x: -9.5, y: .55, z: 10.3 }, Bp = { x: -14.08, y: 1.3, z: 9.0 }, L = Math.hypot(Bp.x - A.x, Bp.z - A.z);
    const bt = { x: A.x + (Bp.x - A.x) * .8 / L, y: A.y + (Bp.y - A.y) * .8 / L + .1, z: A.z + (Bp.z - A.z) * .8 / L };
    // 더미 쪽: 벨트 조준점에서 더미 중심 방향으로 걸어가며 더미 높이 .6m 이상인 첫 지점
    const PC = { x: 1, z: -1.5 }; const ux = PC.x - bt.x, uz = PC.z - bt.z, ul = Math.hypot(ux, uz);
    let pileT = null; for (let s = 0; s < ul; s += .05) { const x = bt.x + ux / ul * s, z = bt.z + uz / ul * s; if (N.hAt(x, z) > .6) { pileT = { x, z, s }; break; } }
    const throwSpot = { x: bt.x + ux / ul * 1.9, z: bt.z + uz / ul * 1.9 };
    const grabSpot = () => { // 더미가 깎이면 조금씩 안으로
      for (let s = 0; s < ul; s += .05) { const x = bt.x + ux / ul * s, z = bt.z + uz / ul * s; if (N.hAt(x, z) > .5) return { px: bt.x + ux / ul * (s - 1.4), pz: bt.z + uz / ul * (s - 1.4), x, z, y: N.hAt(x, z) }; } };
    const log = []; let trips = 0, misses = 0; const mark = {};
    const buyCheap = () => {
      if (policy === 'none') return;
      const ids = policy === 'carry' ? ['hand_carry'] : ['hand_carry', 'toy_shovel', 'toy_shovel_size', 'spade'];
      for (;;) { let best = null; for (const id of ids) { const t = window.needle && null; }
        let bought = false; for (const id of ids) { if (N.buy(id)) { log.push(`${trips}회 ${simT.toFixed(0)}s ${id} 구매 ($${S.money.toFixed(2)} 남음)`); bought = true; if (id === 'toy_shovel' || id === 'spade') { // 배달 팔레트까지 다녀오기(왕복 시간만 계산)
              const pal = { x: 6.4, z: -15.6 }; const back = { x: P.x, z: P.z }; walk(pal.x, pal.z); const pr = N.props.find(q => q.kind === 'tool'); if (pr) { N.tp(pr.x + .8, pr.z); look(pr.x, .3, pr.z); N.step(dt, 1); N.interact(); } walk(back.x, back.z); } break; } }
        if (!bought) break; }
    };
    for (let i = 0; i < 400 && simT < 1800; i++) {
      const g = grabSpot(); walk(g.px, g.pz); look(g.x, g.y - .05, g.z); N.step(dt, 1); simT += dt;
      // 연장 칸: 가장 좋은 것
      const pref = ['spade', 'toy', 'hand']; for (const t of pref) { const k = S.hotbar.indexOf(t); if (k >= 0) { S.slot = k; break; } }
      let guard = 0; const cap0 = P.load.n; N.primary(dt, true); N.step(dt, 1); simT += dt;
      // 한 번 더 집기(연장 용량 다 찰 때까지 클릭 반복)
      while (guard++ < 20) { const before = P.load.n; run(.25); N.primary(dt, true); if (P.load.n === before) break; }
      const got = P.load.n; if (!got) { log.push('못 집음'); break; }
      walk(throwSpot.x, throwSpot.z); look(bt.x, bt.y, bt.z); N.step(dt, 1); simT += dt;
      const aim = N.aim(); const sold0 = S.sold; N.primary(dt, true); N.step(dt, 1); simT += dt; trips++;
      if (!aim || aim.kind !== 'build') misses++;
      if (!mark.earn1 && S.earned >= 1) mark.earn1 = { trips, t: simT };
      if (!mark.buyTool && S.missions.buy_tool) mark.buyTool = { trips, t: simT };
      if (!mark.earn10 && S.earned >= 10) mark.earn10 = { trips, t: simT };
      if (trips === 1) mark.firstGot = got;
      buyCheap();
      if (policy === 'none' && S.money >= 1 && !mark.cash1) { run(6); mark.cash1 = { trips, t: simT, money: S.money }; if (N.buy('toy_shovel')) { mark.buyTool = { trips, t: simT }; } }
      if (mark.earn10) break;
      if (policy === 'none' && mark.buyTool) break;
    }
    run(6);
    return { trips, misses, simT: Math.round(simT), money: S.money, earned: S.earned, sold: S.sold, tech: S.tech, missions: Object.keys(S.missions), mark, log: log.slice(0, 40) };
  }, policy);
  console.log(JSON.stringify(res, null, 1)); if (errs.length) console.log('ERRS', errs);
  await b.close();
})();
