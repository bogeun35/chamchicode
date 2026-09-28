// 스페이스 록(원작판) 진행 봇 — 새 세이브부터 원정→워프(충전 누르기)→귀환→상자 열기→탐욕 구매→플링코 처리(기지 시간 포함) 반복, 플레이 시간 기준
// 사용: node progress.js --url http://127.0.0.1:8766/rock-bal-rbase.html --seeds 11,12,13 --minutes 90 --bot near --out a.json [--maxsec 20] [--snap snaps.json]
//  - 구역 번호는 원작판(0부터). '열 번째 구역' = cs 9, '스무 번째 구역' = cs 19. reach[n] = S.maxSector >= n-1 이 된 플레이 시간(분)
//  - 입력은 R.aim/R.cur 직접(1280×720). rock.sim(1/60) 동기 루프. Math.random 시드 고정, 페이지 타이머·rAF 정지.
//  - 판 하나씩 evaluate(프로토콜 타임아웃 회피). 상태는 window.__P.
const puppeteer = require(process.env.PUPPETEER_CORE || 'puppeteer-core');
const fs = require('fs');
const A = {}; for (let i = 2; i < process.argv.length; i += 2) A[process.argv[i].replace(/^--/, '')] = process.argv[i + 1];
const URL0 = A.url;
const SEEDS = (A.seeds || '11,12,13').split(',').map(Number);
const MIN = +(A.minutes || 90), BOT = A.bot || 'near', MAXSEC = +(A.maxsec || 20);
const { SEED_JS, NOTIMER_JS, BRAIN, FASTPLINKO } = require('./brain.js');

const INIT = (seed, MIN, BOT, MAXSEC) => {
  const g = window.rock, S = g.S; window.__reseed(seed);
  document.getElementById('modal').classList.remove('show'); g.setTab('ore');
  const P = window.__P = { seed, MIN, BOT, MAXSEC, clock: { t: 0 }, start: 0, runN: 0, lastMin: -1,
    out: { seed, reach: {}, cred: [], runs: [], buys: [], snaps: {}, rarVisits: [0, 0, 0, 0, 0], artiAt: [] } };
  P.clock.stop = () => P.clock.t >= MIN * 60 || S.maxSector >= MAXSEC - 1;
  P.sample = () => { const m = Math.floor(P.clock.t / 60); while (P.lastMin < m) { P.lastMin++; P.out.cred.push(Math.round(S.totalCred)); }
    for (const k of [5, 10, 15, 20, 25]) if (S.maxSector >= k - 1 && P.out.reach[k] == null) P.out.reach[k] = +(P.clock.t / 60).toFixed(2); };
  P.snap = name => { if (!P.out.snaps[name]) P.out.snaps[name] = { t: +(P.clock.t / 60).toFixed(2), S: JSON.parse(JSON.stringify(S)), start: P.start }; };
  P.buyAll = () => { for (let k = 0; k < 400; k++) { const c = g.TREE.filter(n => g.canBuy(n) && n.id !== 'uP'); if (!c.length) break; c.sort((a, b) => g.nodeCost(a) - g.nodeCost(b)); const n = c[0]; g.buyNode(n.id); P.out.buys.push([+(P.clock.t / 60).toFixed(2), n.id]); if (n.cls === 'CollectorRadius') P.snap('early'); } };
  P.openAll = () => { let k = 0; while (S.keys > 0 && k++ < 200) g.openLoot(); document.getElementById('modal').classList.remove('show'); };
  P.baseTick = sec => { const n = Math.round(sec * 30); for (let i = 0; i < n; i++) { g.plinkoTick(1 / 30); P.clock.t += 1 / 30; if (i % 30 === 0) P.sample(); } };
  P.setStart = s => { const dn = document.getElementById('secDn'), up = document.getElementById('secUp'); g.renderBase(); for (let i = 0; i < 40; i++) dn.click(); for (let i = 0; i < s; i++) up.click(); };
  return true;
};
const ONE = () => {
  const g = window.rock, S = g.S, P = window.__P;
  if (P.clock.stop() || P.runN >= 3000) return true;
  P.setStart(P.start);
  const a0 = Object.keys(S.arti).length;
  const st = window.__runOne(g, { mode: P.BOT, cap: 1e9, clock: P.clock, onStep: R => { if ((R.t * 60 | 0) % 60 === 0) P.sample(); } });
  P.runN++; for (const r of st.rar) P.out.rarVisits[r]++;
  const a1 = Object.keys(S.arti).length; for (let i = a0; i < a1; i++) P.out.artiAt.push(+(P.clock.t / 60).toFixed(2));
  st.at = +(P.clock.t / 60).toFixed(2); st.maxSec = S.maxSector; delete st.rar; P.out.runs.push(st); P.sample();
  if (S.maxSector >= 9) P.snap('mid'); if (S.maxSector >= 17) P.snap('late');
  // 다음 출발 구역: 이번 판 워프 ≥2 → +1, 1 → 그대로, 0 → −1 (0 ~ 최고−1)
  const nx = st.warps >= 2 ? P.start + 1 : st.warps === 1 ? P.start : P.start - 1; P.start = Math.max(0, Math.min(Math.max(0, S.maxSector - 1), nx));
  P.openAll(); P.buyAll();
  if (g.efl('Autonomy')) P.baseTick(5);
  else { let w = 0; while ((g.cargoN() > 0 || g.PL.balls.length) && w < 180) { P.baseTick(1); w++; if (w % 10 === 0) P.buyAll(); } P.baseTick(3); }
  P.openAll(); P.buyAll(); P.sample();
  return P.clock.stop();
};
const FIN = () => {
  const g = window.rock, S = g.S, P = window.__P, out = P.out, clock = P.clock;
  P.snap('end'); delete out.snaps.end.S;
  out.minutes = +(clock.t / 60).toFixed(2); out.maxSector = S.maxSector; out.totalCred = Math.round(S.totalCred);
  out.artiTotal = Object.keys(S.arti).length; out.keysGot = S.keysGot; out.boxes = S.boxes; out.lootCnt = S.lootCnt;
  const sum = k => out.runs.reduce((a, r) => a + (r[k] || 0), 0), n = out.runs.length;
  out.agg = { runs: n, bag: sum('bag'), gen: sum('gen'), col: sum('col'), lost: sum('lost'), auto: sum('auto'), hits: sum('hits'), warps: sum('warps'), kills: sum('kills'),
    crash: out.runs.filter(r => r.end === 'crash').length, boss: out.runs.filter(r => r.end === 'boss').length,
    dropRate: +(sum('col') / Math.max(1, sum('col') + sum('lost'))).toFixed(3), crashPct: +(out.runs.filter(r => r.end === 'crash').length / n * 100).toFixed(1),
    artiPerHour: +(out.artiTotal / (clock.t / 3600)).toFixed(2), killsPerMin: +(sum('kills') / (clock.t / 60)).toFixed(1), expoPct: +(sum('expo') / Math.max(1, sum('t')) * 100).toFixed(2), expTimePct: +(sum('t') / clock.t * 100).toFixed(1) };
  return out;
};

(async () => {
  const browser = await puppeteer.connect({ browserURL: process.env.CDP_URL || 'http://localhost:9224', defaultViewport: null, protocolTimeout: 1800000 });
  const res = [], errs = [];
  for (const seed of SEEDS) {
    const bctx = await browser.createBrowserContext();   /* 시드마다 독립 컨텍스트(새 창): 저장소 분리 + 뒤쪽 탭 우선순위 저하 회피 */
    const page = await bctx.newPage();
    page.on('dialog', d => d.dismiss());
    page.on('pageerror', e => errs.push(seed + ' ' + String(e)));
    try {
      await page.setViewport({ width: 1280, height: 720, deviceScaleFactor: 1 });
      await page.evaluateOnNewDocument(SEED_JS); await page.evaluateOnNewDocument(NOTIMER_JS);
      await page.evaluateOnNewDocument(BRAIN); await page.evaluateOnNewDocument('window.__margin = ' + (+(A.margin || 70)) + ';');
      await page.goto(URL0 + '?fresh=1&t=' + Date.now(), { waitUntil: 'networkidle0' });
      const lv0 = await page.evaluate(() => Object.keys(window.rock.S.lv).length + Object.keys(window.rock.S.arti).length + window.rock.S.cred);
      if (lv0) throw new Error('세이브가 비어 있지 않음 ' + lv0);
      await page.evaluate(FASTPLINKO); await page.evaluate(() => { window.Sound.play = () => false; window.Sound.once = () => false; window.Sound.init = () => false; });   /* 결정성: 효과음이 실제 시간(setTimeout) 따라 Math.random 을 먹던 것 차단 */   // 같은 결과·약 8배 빠른 플링코 (plinko-eq.js 로 비트 동일 확인)
      const t0 = Date.now();
      await page.evaluate(INIT, seed, MIN, BOT, MAXSEC);
      let done = false, k = 0;
      while (!done) { done = await page.evaluate(ONE); if (++k % 25 === 0) console.error('  seed', seed, 'runs', k, await page.evaluate(() => [+(window.__P.clock.t / 60).toFixed(1), window.rock.S.maxSector])); }
      const r = await page.evaluate(FIN); r.realSec = Math.round((Date.now() - t0) / 1000);
      res.push(r);
      console.error('seed', seed, JSON.stringify({ min: r.minutes, maxSec: r.maxSector, reach: r.reach, agg: r.agg, rar: r.rarVisits, arti: r.artiTotal, real: r.realSec }));
    } catch (e) { errs.push(seed + ' FAIL ' + e.message); console.error(e); }
    await page.close(); await bctx.close();
  }
  const out = { url: URL0, bot: BOT, minutes: MIN, seeds: SEEDS, res, errs };
  if (A.out) fs.writeFileSync(A.out, JSON.stringify(out, null, 1));
  if (A.snap && res[0]) fs.writeFileSync(A.snap, JSON.stringify(res[0].snaps, null, 1));
  console.log(JSON.stringify({ errs, summary: res.map(r => ({ seed: r.seed, min: r.minutes, maxSec: r.maxSector, reach: r.reach, agg: r.agg, rar: r.rarVisits, arti: r.artiTotal, real: r.realSec })) }));
  browser.disconnect();
})().catch(e => { console.error(e.message); process.exit(1); });
