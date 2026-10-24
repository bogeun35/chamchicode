// 바늘 찾기 중반 봇: 손 작업 + 연구 우선순위 구매 + 더미→HAY IN 벨트 깔기, 전기($90) 살 때까지
// node needle-bot2.cjs [url]
const { chromium } = require('C:/Users/user/AppData/Roaming/npm/node_modules/rea-agents/node_modules/playwright-core');
const URL = process.argv[2] || 'http://127.0.0.1:8831/needle.html';
(async () => {
  const b = await chromium.launch({ executablePath: 'C:/Program Files/Google/Chrome/Application/chrome.exe', headless: true, args: ['--use-angle=d3d11', '--enable-gpu', '--ignore-gpu-blocklist', '--mute-audio'] });
  const p = await b.newPage({ viewport: { width: 320, height: 200 } });
  const errs = []; p.on('pageerror', e => errs.push(String(e).slice(0, 300)));
  await p.goto(URL + '?mute&t=' + Date.now()); await p.evaluate(() => { try { localStorage.clear(); } catch (e) {} });
  await p.goto(URL + '?mute&t=' + Date.now()); await p.waitForFunction(() => window.needle, null, { timeout: 60000 });
  await p.evaluate((BF0) => {
    const N = window.needle, S = N.S, P = N.P, dt = 1 / 30;
    N.startGame(false);
    const look = (x, y, z) => { const dx = x - P.x, dy = y - (P.y + 1.62), dz = z - P.z; N.look(Math.atan2(-dx, -dz), Math.atan2(dy, Math.hypot(dx, dz))); };
    let simT = 0; const run = s => { const n = Math.max(1, Math.round(s / dt)); N.step(dt, n); simT += n * dt; };
    const walk = (x, z, speed = 4.2) => { const d = Math.hypot(x - P.x, z - P.z); N.tp(x, z); run(d / speed); };
    const HA = { x: -9.5, y: .55, z: 10.3 }, HB = { x: -14.08, y: 1.3, z: 9.0 }, HL = Math.hypot(HB.x - HA.x, HB.z - HA.z);
    const bt0 = { x: HA.x + (HB.x - HA.x) * .8 / HL, y: HA.y + (HB.y - HA.y) * .8 / HL + .1, z: HA.z + (HB.z - HA.z) * .8 / HL };
    const PC = { x: 1, z: -1.5 }; const ux0 = PC.x - HA.x, uz0 = PC.z - HA.z, ul = Math.hypot(ux0, uz0), ux = ux0 / ul, uz = uz0 / ul;
    const edgeS = th => { for (let s = 0; s < ul; s += .05) if (N.hAt(HA.x + ux * s, HA.z + uz * s) > th) return s; return ul; };
    let beltHead = null; // 내 벨트의 시작점(더미 쪽) s
    const marks = {}, log = []; let trips = 0;
    const mark = (k, extra) => { if (!marks[k]) { marks[k] = { t: Math.round(simT), trips, ...(extra || {}) }; } };
    const fetchTool = () => { const pal = { x: 6.4, z: -15.6 }, back = { x: P.x, z: P.z }; walk(pal.x, pal.z); for (const pr of N.props.filter(q => q.kind === 'tool')) { N.tp(pr.x + .8, pr.z); look(pr.x, .3, pr.z); N.step(dt, 1); N.interact(); } walk(back.x, back.z); };
    const layBelt = () => { // 더미 가장자리(높이<.25)에서 HAY IN 시작까지, 또는 기존 머리까지
      const s1 = Math.max(.6, edgeS(.2) - .4), to = beltHead == null ? 0 : beltHead; if (s1 - to < .6) return false;
      const len = s1 - to, cost = 1.5 * Math.max(1, len); if (S.money < cost) return false;
      S.money -= cost; N.addBelt({ x: HA.x + ux * s1, y: .5, z: HA.z + uz * s1 }, { x: HA.x + ux * to, y: beltHead == null ? .55 : .5, z: HA.z + uz * to }); N.relink(); N.mission('belt');
      beltHead = s1; log.push(`${Math.round(simT)}s 벨트 ${len.toFixed(1)}m ($${cost.toFixed(2)})`); return true; };
    const BF = BF0; const ORDER = ['hand_carry', 'toy_shovel', 'toy_shovel_size', 'belt', 'spade', 'hay_price', 'shovel_size', 'easy_swing', 'pitchfork', 'fork_size', 'electricity'];
    const shop = () => { for (let g = 0; g < 20; g++) { let did = false;
      for (const id of ORDER) { if (id === 'electricity' && S.money < 90) continue; if (BF && id !== 'belt' && !S.tech.belt && S.tech.toy_shovel) continue;
        if (id === 'belt' && !S.tech.belt) { if (S.money >= 3 + 1.5 * (edgeS(.2) - .4)) { N.buy('belt'); layBelt(); mark('belt'); did = true; break; } continue; }
        const lv = S.tech[id] || 0; if (N.buy(id)) { log.push(`${Math.round(simT)}s ${id}${lv ? ' ' + (lv + 1) : ''}`); if (['toy_shovel', 'spade', 'pitchfork'].includes(id)) { fetchTool(); mark(id); } if (id === 'electricity') mark('electricity'); did = true; break; } }
      if (!did) break; } if (S.tech.belt && beltHead != null && edgeS(.5) - beltHead > 2.2) layBelt(); };
    const rateAt = {}; let lastE = 0, lastT = 0;
    window.__chunk = (lim) => { const w0 = performance.now(); while (simT < lim && !marks.electricity) {
      // 서 있을 곳: 벨트 있으면 벨트 머리 옆, 없으면 더미 가장자리 → HAY IN 왕복
      const sG = edgeS(.5); const gx = HA.x + ux * sG, gz = HA.z + uz * sG;
      for (const t of ['fork', 'spade', 'toy', 'hand']) { const k = S.hotbar.indexOf(t); if (k >= 0) { S.slot = k; break; } }
      if (beltHead != null) { const sp = Math.max(beltHead + .3, sG - 1.6); N.tp(HA.x + ux * sp + uz * .9, HA.z + uz * sp - ux * .9); }
      else walk(HA.x + ux * (sG - 1.4), HA.z + uz * (sG - 1.4));
      look(gx, N.hAt(gx, gz) - .05, gz); N.step(dt, 1); simT += dt;
      N.primary(dt, true); run(.45); // 한 번 뜨면 용량만큼 참(다시 누르면 던져 버림)
      if (!P.load.n) { log.push('못 집음'); break; }
      if (beltHead != null) { const bx = HA.x + ux * (beltHead - .5), bz = HA.z + uz * (beltHead - .5); look(bx, .55, bz); }
      else { walk(HA.x + ux * 1.9, HA.z + uz * 1.9); look(bt0.x, bt0.y, bt0.z); }
      N.step(dt, 1); simT += dt; N.primary(dt, true); run(.3); trips++;
      if (P.load.n) { log.push(`${Math.round(simT)}s 못 던짐 aim=${N.aim() && N.aim().kind}`); P.load = { n: 0, nd: [] }; }
      shop();
      if (simT - lastT >= 120) { rateAt[Math.round(simT / 60) + '분'] = +((S.earned - lastE) / ((simT - lastT) / 60)).toFixed(2); lastE = S.earned; lastT = simT; }
      if (S.earned >= 25) mark('earn25'); if (S.earned >= 60) mark('earn60');
    }
    return { wall: Math.round((performance.now() - w0) / 1000), simT: Math.round(simT), trips, earned: +S.earned.toFixed(2), money: +S.money.toFixed(2), sold: S.sold, tech: S.tech, marks, rateAt, log: log.slice(0, 80) }; };
  }, !!process.env.BF);
  let res; for (let lim = +(process.env.STEP || 60); lim <= 1800; lim += +(process.env.STEP || 60)) { res = await p.evaluate(l => window.__chunk(l), lim); console.log(`[${res.simT}s wall ${res.wall}s] earned $${res.earned} money $${res.money} tech ${JSON.stringify(res.tech)} trips ${res.trips} sold ${res.sold} | ${res.log.slice(-4).join(' / ')}`); if (res.marks.electricity) break; }
  console.log('FINAL ' + JSON.stringify(res)); if (errs.length) console.log('ERRS', errs);
  await b.close();
})();
