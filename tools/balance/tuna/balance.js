// 참치 타이쿤 밸런스 측정기 — node balance.js <label> [preSnippet]
// 뷰포트 4종 × 봇 3종(중앙 고정 / 좌측 가장자리 고정 / 추적) 으로 항해 1회(게임시간 기준)씩 돌려 포획·골드·스폰 분포·속도 분포를 잰다.
const puppeteer = require(process.env.PUPPETEER_CORE || 'puppeteer-core');
const OUTDIR = process.env.OUT_DIR || require('path').join(__dirname, 'out'); require('fs').mkdirSync(OUTDIR, { recursive: true });
const fs = require('fs');
const label = process.argv[2] || 'run', pre = process.argv[3] || '';
const URL = process.env.TUNA_URL || 'http://localhost:8766/tuna.html';
const VIEWPORTS = [[1280, 720], [1920, 1080], [2560, 1440], [390, 844]];
const BOTS = ['center', 'edge', 'chase'];
const OUT = require('path').join(OUTDIR, 'balance-') + label + '.json';

const inPage = (bot, preSnippet) => {
  // 페이지 안에서 실행. 새 항해를 시작해 끝날 때까지 0.05초 스텝으로 시뮬.
  const T = window.tuna; if (!T) return { error: 'no tuna api' };
  try { if (preSnippet) new Function(preSnippet)(); else if (T.enterGame) T.enterGame('normal'); } catch (e) { return { error: 'pre: ' + e.message } }
  // 저장 오염 방지: 시뮬용 상태를 복제해 쓰지 않고, 시작 골드만 기록해 차분으로 본다
  const S = T.S; const gold0 = S.gold, dia0 = S.dia, xp0 = S.xp, lv0 = S.lv;
  T.startVoyage();
  const V = T.V; if (!V) return { error: 'voyage not started' };
  // 월드 크기: 그물 초기 위치가 월드 중앙(W/2,H/2) 이므로 2배가 논리 월드 크기 (1.0 은 캔버스 px, 2.0 은 1280×720 논리)
  const cv = document.getElementById('cv');
  const LW = V.net.x * 2, LH = V.net.y * 2;
  const seen = new WeakSet(); const spawnX = [], spawnY = [], speeds = {}, tiers = {};
  const noteNew = () => { for (const f of V.fish) { if (seen.has(f)) continue; seen.add(f); spawnX.push(f.x / LW); spawnY.push(f.y / LH); const id = f.f.id; (speeds[id] = speeds[id] || []).push(Math.abs(f.vx || 0)); tiers[id] = f.f.i; } };
  noteNew();
  const R = T.netR();
  let t = 0, steps = 0, escaped = 0; const netSpd = 700; // 추적 봇 그물 속도(픽셀/초) — 숙련자 손 속도 가정
  const snapshotIds = () => new Set(V.fish);
  let prev = snapshotIds();
  const startCounts = Object.assign({}, S.counts);
  while (T.V && !T.V.ended && steps < 4000) {
    const dt = 0.05;
    if (bot === 'center') { V.net.x = LW / 2; V.net.y = LH / 2; }
    else if (bot === 'edge') { V.net.x = Math.min(R * 0.9, LW * 0.08) + 20; V.net.y = LH / 2; }
    else if (bot === 'chase') {
      let best = null, bd = 1e9; for (const f of V.fish) { if (f.x < 0 || f.x > LW) continue; const d = Math.hypot(f.x - V.net.x, f.y - V.net.y) / Math.max(1, (f.f.i + 1)); if (d < bd) { bd = d; best = f; } }
      if (best) { const dx = best.x - V.net.x, dy = best.y - V.net.y, d = Math.hypot(dx, dy) || 1, mv = Math.min(d, netSpd * dt); V.net.x += dx / d * mv; V.net.y += dy / d * mv; }
      V.net.y = Math.max(90, V.net.y);
    }
    T.sim(dt); t += dt; steps++;
    if (!T.V) break;
    // 이탈 수 추정: 이전 스텝에 있었는데 사라졌고 hp>0 이던 것 (catchFish 는 hp<=0 로 제거)
    const cur = new Set(T.V.fish); for (const f of prev) if (!cur.has(f) && f.hp > 0) escaped++; prev = cur;
    noteNew();
  }
  const caughtBy = {}; for (const k in S.counts) { const d = (S.counts[k] || 0) - (startCounts[k] || 0); if (d) caughtBy[k] = d; }
  // 모달 닫기(다음 측정을 위해)
  try { document.getElementById('modal').classList.remove('show'); } catch (e) {}
  const q = arr => { const a = arr.slice().sort((x, y) => x - y); const at = p => a[Math.min(a.length - 1, Math.floor(p * a.length))]; return { n: a.length, p10: at(.1), p50: at(.5), p90: at(.9) } };
  const edge10 = spawnX.filter(x => x < .1 || x > .9).length / Math.max(1, spawnX.length), mid60 = spawnX.filter(x => x > .2 && x < .8).length / Math.max(1, spawnX.length);
  const spdSummary = {}; for (const id in speeds) { const a = speeds[id]; spdSummary[id] = { tier: tiers[id], n: a.length, avg: +(a.reduce((p, c) => p + c, 0) / a.length).toFixed(0), min: +Math.min(...a).toFixed(0), max: +Math.max(...a).toFixed(0) } }
  return { bot, world: { LW, LH, netR: +R.toFixed(1), netFrac: +(Math.PI * R * R / (LW * LH)).toFixed(4), cvW: cv.clientWidth, cvH: cv.clientHeight }, time: +t.toFixed(1), steps, gold: Math.round(S.gold - gold0), dia: S.dia - dia0, xp: Math.round(S.xp - xp0), lvUp: S.lv - lv0, caught: Object.values(caughtBy).reduce((a, b) => a + b, 0), caughtBy, escaped, spawn: { n: spawnX.length, edge10: +edge10.toFixed(2), mid60: +mid60.toFixed(2), x: q(spawnX), y: q(spawnY) }, speeds: spdSummary, mode: (S.mode || (T.MODE && T.MODE.cur) || 'n/a') };
};

(async () => {
  const browser = await puppeteer.connect({ browserURL: process.env.CDP_URL || 'http://localhost:9224', defaultViewport: null, protocolTimeout: 1800000 });
  const results = [];
  const REPS = +(process.env.REPS || 1);   // 반복 횟수: 항해 1회는 15초라 편차가 크다. 판정용은 REPS=8 이상
  const VPS = process.env.VPS ? process.env.VPS.split(',').map(s => s.split('x').map(Number)) : VIEWPORTS;
  for (const [w, h] of VPS) {
    for (const bot of BOTS) {
      const reps = [];
      for (let k = 0; k < REPS; k++) {
        const page = await browser.newPage();
        page.on('dialog', d => d.dismiss());
        const errs = []; page.on('pageerror', e => errs.push(String(e).slice(0, 200)));
        await page.setViewport({ width: w, height: h });
        await page.goto(URL + '?t=' + Date.now(), { waitUntil: 'networkidle0' });
        // 저장 격리: 매 측정마다 새 세이브 (기존 세이브 건드리지 않게 localStorage 를 비우고 새로고침)
        await page.evaluate(() => { try { localStorage.clear(); } catch (e) {} });
        await page.goto(URL + '?t=' + Date.now(), { waitUntil: 'networkidle0' });
        await page.evaluate(() => new Promise(r => setTimeout(r, 400)));
        const r = await page.evaluate(inPage, bot, pre); r.errs = errs;
        reps.push(r);
        await page.close();
      }
      // 평균/합산
      const ok = reps.filter(r => !r.error);
      if (!ok.length) { results.push({ viewport: w + 'x' + h, bot, error: reps[0].error, errs: reps[0].errs }); continue; }
      const mean = k => +(ok.reduce((a, r) => a + (r[k] || 0), 0) / ok.length).toFixed(1);
      const allX = ok.flatMap(r => r.spawnXRaw || []);
      const agg = { viewport: w + 'x' + h, bot, reps: ok.length, world: ok[0].world, time: mean('time'), gold: mean('gold'), dia: mean('dia'), caught: mean('caught'), escaped: mean('escaped'), mode: ok[0].mode,
        spawn: { n: ok.reduce((a, r) => a + r.spawn.n, 0), edge10: +(ok.reduce((a, r) => a + r.spawn.edge10 * r.spawn.n, 0) / ok.reduce((a, r) => a + r.spawn.n, 0)).toFixed(2), mid60: +(ok.reduce((a, r) => a + r.spawn.mid60 * r.spawn.n, 0) / ok.reduce((a, r) => a + r.spawn.n, 0)).toFixed(2) },
        speeds: ok[0].speeds, errs: ok.flatMap(r => r.errs) };
      results.push(agg);
    }
  }
  browser.disconnect();
  fs.writeFileSync(OUT, JSON.stringify(results, null, 1));
  // 요약표
  const pad = (s, n) => String(s).padEnd(n);
  console.log(pad('viewport', 10) + pad('bot', 7) + pad('netFrac', 8) + pad('fishN', 6) + pad('caught', 7) + pad('esc', 5) + pad('gold', 7) + pad('edge10', 7) + pad('mid60', 6) + 'errs');
  for (const r of results) console.log(pad(r.viewport, 10) + pad(r.bot, 7) + pad(r.world ? r.world.netFrac : '-', 8) + pad(r.spawn ? r.spawn.n : '-', 6) + pad(r.caught ?? '-', 7) + pad(r.escaped ?? '-', 5) + pad(r.gold ?? '-', 7) + pad(r.spawn ? r.spawn.edge10 : '-', 7) + pad(r.spawn ? r.spawn.mid60 : '-', 6) + (r.errs.length ? r.errs[0] : (r.error || '')));
  const sp = results.find(r => r.speeds && Object.keys(r.speeds).length)?.speeds || {};
  console.log('\n어종별 관측 속도(|vx|, 1280x720 center 기준):');
  for (const id of Object.keys(sp).sort((a, b) => sp[a].tier - sp[b].tier)) console.log(pad(id, 12) + pad('t' + sp[id].tier, 4) + pad('avg ' + sp[id].avg, 9) + 'min ' + sp[id].min + ' max ' + sp[id].max);
  console.log('\nsaved: ' + OUT);
})().catch(e => { console.error(e.stack || e.message); process.exit(1); });
