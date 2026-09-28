// 어종별 포획률 측정 — node species.js <label> <mode normal|hard> [voyages=10] [mapIdx]
// 어종 21종 전부 해금한 세이브로 추적 봇이 N 항해. 어종별 (등장 수, 포획 수, 포획률, 평균 관측속도) 를 낸다.
const puppeteer = require(process.env.PUPPETEER_CORE || 'puppeteer-core');
const OUTDIR = process.env.OUT_DIR || require('path').join(__dirname, 'out'); require('fs').mkdirSync(OUTDIR, { recursive: true });
const fs = require('fs');
const label = process.argv[2] || 'run', mode = process.argv[3] || 'normal', N = +(process.argv[4] || 10), MAP = process.argv[5] != null ? +process.argv[5] : null;
const URL = process.env.TUNA_URL || 'http://localhost:8766/tuna.html';
const OUT = require('path').join(OUTDIR, 'species-') + label + '.json';

const setup = (mode, mapIdx) => {
  const T = window.tuna; if (T.enterGame) T.enterGame(mode);
  const S = T.S;
  // 전 어종 + 전 어장 해금: 트리의 fish/map 노드를 직접 소유 처리 → 더미 항해 1회로 E 갱신(endVoyage 가 refreshEff 호출)
  for (const n of T.TREE) if (n.ef === 'fish' || n.ef === 'map') S.tree[n.id] = 1;
  S.lv = 60; S.gold = 0;   // 낚시력은 레벨 보정(1.02^lv) 만 받게. 기본강화 없음 → 순수 어종 난이도 비교
  T.startVoyage(); T.endVoyage(); try { document.getElementById('modal').classList.remove('show'); } catch (e) {}
  if (mapIdx != null) S.map = mapIdx;
  return { map: S.map, mapName: T.MAPS[S.map] && T.MAPS[S.map].name, fishN: T.FISH.length, netR: T.netR(), power: T.power(), mode: (T.getMode && T.getMode()) || 'n/a' };
};
const voyage = () => {
  const T = window.tuna, S = T.S; const c0 = Object.assign({}, S.counts);
  T.startVoyage(); const V = T.V; const LW = V.net.x * 2, LH = V.net.y * 2;
  const seen = new WeakSet(); const spawned = {}, speeds = {}, leftAlive = {};
  const note = () => { for (const f of V.fish) { if (seen.has(f)) continue; seen.add(f); const id = f.f.id; spawned[id] = (spawned[id] || 0) + 1; (speeds[id] = speeds[id] || []).push(Math.abs(f.vx || 0)); } };
  note(); let prev = new Set(V.fish), steps = 0, t = 0;
  while (T.V && !T.V.ended && steps < 4000) {
    const dt = 0.05, v = T.V; let best = null, bd = 1e9;
    for (const f of v.fish) { if (f.x < 0 || f.x > LW) continue; const d = Math.hypot(f.x - v.net.x, f.y - v.net.y) / Math.max(1, f.f.i + 1) * (f.boss ? .3 : 1); if (d < bd) { bd = d; best = f; } }
    if (best) { const dx = best.x - v.net.x, dy = best.y - v.net.y, d = Math.hypot(dx, dy) || 1, mv = Math.min(d, 700 * dt); v.net.x += dx / d * mv; v.net.y += dy / d * mv; } v.net.y = Math.max(100, v.net.y);
    T.sim(dt); t += dt; steps++; if (!T.V) break;
    const cur = new Set(T.V.fish); for (const f of prev) if (!cur.has(f) && f.hp > 0) leftAlive[f.f.id] = (leftAlive[f.f.id] || 0) + 1; prev = cur; note();
  }
  try { document.getElementById('modal').classList.remove('show'); } catch (e) {}
  const caught = {}; for (const k in S.counts) { const d = (S.counts[k] || 0) - (c0[k] || 0); if (d) caught[k] = d; }
  const gold = S.gold; S.gold = 0;   // 골드는 항해별로 읽고 비움(누적 방지)
  return { t: +t.toFixed(1), spawned, caught, leftAlive, speeds, gold: Math.round(gold) };
};

(async () => {
  const browser = await puppeteer.connect({ browserURL: process.env.CDP_URL || 'http://localhost:9224', defaultViewport: null, protocolTimeout: 1800000 });
  const page = await browser.newPage(); page.on('dialog', d => d.dismiss());
  const errs = []; page.on('pageerror', e => errs.push(String(e).slice(0, 300)));
  await page.setViewport({ width: 1280, height: 720 });
  await page.goto(URL + '?t=' + Date.now(), { waitUntil: 'networkidle0' });
  await page.evaluate(() => { try { localStorage.clear(); } catch (e) {} });
  await page.goto(URL + '?t=' + Date.now(), { waitUntil: 'networkidle0' });
  await page.evaluate(() => new Promise(r => setTimeout(r, 400)));
  const info = await page.evaluate(setup, mode, MAP);
  const agg = { spawned: {}, caught: {}, leftAlive: {}, speeds: {} }; let gold = 0, time = 0;
  for (let i = 0; i < N; i++) {
    const v = await page.evaluate(voyage); gold += v.gold; time += v.t;
    for (const k in v.spawned) agg.spawned[k] = (agg.spawned[k] || 0) + v.spawned[k];
    for (const k in v.caught) agg.caught[k] = (agg.caught[k] || 0) + v.caught[k];
    for (const k in v.leftAlive) agg.leftAlive[k] = (agg.leftAlive[k] || 0) + v.leftAlive[k];
    for (const k in v.speeds) (agg.speeds[k] = agg.speeds[k] || []).push(...v.speeds[k]);
  }
  const FISH = await page.evaluate(() => tuna.FISH.map(f => ({ id: f.id, name: f.name, i: f.i, spd: f.spd, beh: f.beh, mv: f.mv, gold: f.gold, hp: f.hp })));
  const rows = FISH.map(f => { const sp = agg.spawned[f.id] || 0, ca = agg.caught[f.id] || 0, sv = agg.speeds[f.id] || []; return { id: f.id, name: f.name, tier: f.i, beh: f.beh, mv: f.mv, spd: f.spd, spawned: sp, caught: ca, rate: sp ? +(ca / sp).toFixed(2) : null, left: agg.leftAlive[f.id] || 0, vxAvg: sv.length ? Math.round(sv.reduce((a, b) => a + b, 0) / sv.length) : null, gold: f.gold, hp: Math.round(f.hp) }; });
  const res = { label, mode, N, info, time: +time.toFixed(1), goldPerVoy: Math.round(gold / N), rows, errs };
  fs.writeFileSync(OUT, JSON.stringify(res, null, 1));
  const pad = (s, n) => String(s ?? '-').padEnd(n);
  console.log(`[${label}] mode=${info.mode} map=${info.mapName}(${info.map}) netR=${info.netR.toFixed(1)} power=${info.power.toFixed(1)} 항해 ${N}회 · 골드/항해 ${res.goldPerVoy} · 오류 ${errs.length}`);
  console.log(pad('어종', 14) + pad('t', 3) + pad('mv', 8) + pad('spd', 5) + pad('vx', 5) + pad('등장', 5) + pad('포획', 5) + pad('이탈', 5) + '포획률');
  for (const r of rows) console.log(pad(r.name, 14) + pad(r.tier, 3) + pad(r.mv, 8) + pad(r.spd, 5) + pad(r.vxAvg, 5) + pad(r.spawned, 5) + pad(r.caught, 5) + pad(r.left, 5) + (r.rate == null ? '-' : Math.round(r.rate * 100) + '%'));
  if (errs.length) console.log('오류: ' + errs[0]);
  await page.close(); browser.disconnect();
})().catch(e => { console.error(e.stack || e.message); process.exit(1); });
