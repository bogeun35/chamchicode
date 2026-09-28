// 스페이스 록(원작판) 긴장감 지표 — 같은 세이브 상태(진행 봇 스냅샷)에서 center(가만히) / near(적극) 한 판의 '떨어진 조각' 수집률
// 사용: node tension.js --url http://127.0.0.1:8766/rock-bal-rbase.html --snaps snaps-base-11.json --states early,mid --seeds 12 --cap 120 --out b.json
//  - 스냅샷의 S 전체를 복원(세이브 형식 그대로) → 출발 구역 = 스냅샷 당시 출발 구역. 시드 1001~1012.
const puppeteer = require(process.env.PUPPETEER_CORE || 'puppeteer-core');
const fs = require('fs');
const { SEED_JS, NOTIMER_JS, BRAIN } = require('./brain.js');
const A = {}; for (let i = 2; i < process.argv.length; i += 2) A[process.argv[i].replace(/^--/, '')] = process.argv[i + 1];
const URL0 = A.url, SN = JSON.parse(fs.readFileSync(A.snaps, 'utf8'));
const STATES = (A.states || 'early').split(','), NS = +(A.seeds || 12), CAP = +(A.cap || 120), MODES = (A.mode || 'center,near').split(',');
(async () => {
  const browser = await puppeteer.connect({ browserURL: process.env.CDP_URL || 'http://localhost:9224', defaultViewport: null, protocolTimeout: 1800000 });
  const page = await browser.newPage(); page.on('dialog', d => d.dismiss());
  const errs = []; page.on('pageerror', e => errs.push(String(e)));
  await page.setViewport({ width: 1280, height: 720, deviceScaleFactor: 1 });
  await page.evaluateOnNewDocument(SEED_JS); await page.evaluateOnNewDocument(NOTIMER_JS); await page.evaluateOnNewDocument(BRAIN); await page.evaluateOnNewDocument('window.__margin = ' + (+(A.margin || 70)) + ';');
  await page.goto(URL0 + '?fresh=1&t=' + Date.now(), { waitUntil: 'networkidle0' });
  await page.evaluate(() => { window.Sound.play = () => false; window.Sound.once = () => false; window.Sound.init = () => false; });   /* 결정성: 효과음 난수 차단 */
  const out = { url: URL0, cap: CAP, seeds: NS, res: {} };
  for (const stn of STATES) {
    const sn = SN[stn]; if (!sn || !sn.S) { errs.push('no snap ' + stn); continue; }
    for (const mode of MODES) {
      const rs = await page.evaluate((sn, mode, NS, CAP) => {
        const g = window.rock, rs = [];
        for (let seed = 1; seed <= NS; seed++) {
          const S = g.S, c = JSON.parse(JSON.stringify(sn.S)); for (const k of Object.keys(S)) if (!(k in c)) delete S[k]; Object.assign(S, c); S.cargo = {}; g.recompute(); g.renderBase();
          const dn = document.getElementById('secDn'), up = document.getElementById('secUp'); for (let i = 0; i < 40; i++) dn.click(); for (let i = 0; i < sn.start; i++) up.click();
          window.__reseed(1000 + seed);
          const st = window.__runOne(g, { mode, cap: CAP });
          rs.push({ seed, dropRate: st.dropRate, rate: st.rate, gen: st.gen, col: st.col, lost: st.lost, auto: st.auto, bag: st.bag, hits: st.hits, end: st.end, kills: st.kills, warps: st.warps, t: +st.t.toFixed(1), start: st.start, reached: st.reached });
        }
        return rs;
      }, sn, mode, NS, CAP);
      const avg = k => +(rs.reduce((a, b) => a + b[k], 0) / rs.length).toFixed(3);
      const sum = k => rs.reduce((a, b) => a + b[k], 0);
      const agg = { dropRate: +(sum('col') / Math.max(1, sum('col') + sum('lost'))).toFixed(3), dropRateAvg: avg('dropRate'), gen: avg('gen'), col: avg('col'), lost: avg('lost'), auto: avg('auto'), bag: avg('bag'), hits: avg('hits'), kills: avg('kills'), warps: avg('warps'), t: avg('t'),
        crashPct: +(rs.filter(r => r.end === 'crash').length / rs.length * 100).toFixed(1), ends: rs.map(r => r.end[0]).join(''), start: sn.start };
      out.res[stn + '_' + mode] = { agg, rs };
      console.error(stn, mode, JSON.stringify(agg));
    }
  }
  out.errs = errs;
  await page.close(); browser.disconnect();
  if (A.out) fs.writeFileSync(A.out, JSON.stringify(out, null, 1));
  console.log(JSON.stringify({ errs, agg: Object.fromEntries(Object.entries(out.res).map(([k, v]) => [k, v.agg])) }));
})().catch(e => { console.error(e.message); process.exit(1); });
