// 스페이스 록(원작판) 해상도 동일성 봇 — 같은 빌드·같은 시드로 해상도별 near 한 판(60초) 파괴 수·광석 가치(크레딧 환산)
// 사용: node res.js --url http://127.0.0.1:8766/rock-bal-rbase.html --vp d1280,d2560,m390 --runs 3 --dur 60 --out r.json
//  - 입력은 실제 캔버스에 PointerEvent(toGame/toWorld·터치 오프셋 70 CSS px 그대로). HUD 에 가린 대상은 안 고름. 포인터 아래가 캔버스가 아니면 입력 막힘으로 셈.
//  - m390 = puppeteer KnownDevices['iPhone 13'] (390×844 세로 → 720×1280 월드)
const puppeteer = require(process.env.PUPPETEER_CORE || 'puppeteer-core');
const { KnownDevices } = puppeteer;
const fs = require('fs');
const { SEED_JS, NOTIMER_JS } = require('./brain.js');
const A = {}; for (let i = 2; i < process.argv.length; i += 2) A[process.argv[i].replace(/^--/, '')] = process.argv[i + 1];
const URL0 = A.url, MODES = (A.mode || 'near').split(','), RUNS = +(A.runs || 3), DUR = +(A.dur || 60);
const VPS = { d1280: { width: 1280, height: 720 }, d1920: { width: 1920, height: 1080 }, d2560: { width: 2560, height: 1440 }, m390: { dev: 'iPhone 13' }, m844: { dev: 'iPhone 13 landscape' } };
const VPL = (A.vp || 'd1280,d2560,m390').split(',');
// 벤치 빌드: 초반 몇 판 수준(연료 25 · 피해 4 · 포 2문 · 방어막 2 · 철광석) — 원작판 트리 id 동일
const BUILD = { u1: 3, u2: 5, u6: 1, u5: 2, u7: 1, u10: 2, u11: 1, u12: 1, u3: 1, u17: 1, u59: 1, u14: 1 };

async function measure(page, mode, seed, dur) {
  return page.evaluate((mode, seed, dur, BUILD) => {
    const g = window.rock, cvEl = document.getElementById('cv');
    document.getElementById('modal').classList.remove('show');
    const S = g.S, c = JSON.parse(JSON.stringify(window.__S0)); for (const k of Object.keys(S)) if (!(k in c)) delete S[k]; Object.assign(S, c);
    S.lv = Object.assign({}, BUILD); g.recompute(); g.renderBase();
    window.__reseed(seed);
    g.launch(); clearInterval(g.launch._iv);
    const view = () => { const v = g.view(); return { W: v.W, H: v.H, CW: v.CW, CH: v.CH, VS: v.VS, OX: v.OX, OY: v.OY }; };
    const touch = matchMedia('(pointer: coarse)').matches || navigator.maxTouchPoints > 0;
    const hudSel = ['.ehud .fuel', '.ehud .quota', '.ehud .ecur', '#ammoBox > *', '#btnWarp.show', '#btnAbort'];
    const hudRects = () => hudSel.flatMap(s => [...document.querySelectorAll(s)]).map(e => e.getBoundingClientRect()).filter(r => r.width > 0 && r.height > 0);
    const inR = (x, y, r) => x >= r.left && x <= r.right && y >= r.top && y <= r.bottom;
    let v = view(); const R0 = g.R;
    const lift = touch ? 70 / v.VS : 0;
    let P = { x: v.W / 2, y: v.H * .6 + lift };
    let steps = 0, blocked = 0; const dt = 1 / 60;
    const cr = () => g.collectR ? g.collectR() : (15 + g.ef('CollectorRadius', 'increaseAmount')) * 16;
    const send = type => {
      const cx = Math.max(0, Math.min(v.CW - 1, v.OX + P.x * v.VS)), cy = Math.max(0, Math.min(v.CH - 1, v.OY + P.y * v.VS));
      const el = document.elementFromPoint(cx, cy); if (el !== cvEl) { blocked++; return; }
      cvEl.dispatchEvent(new PointerEvent(type, { clientX: cx, clientY: cy, pointerType: touch ? 'touch' : 'mouse', bubbles: true, isPrimary: true, pointerId: 1 }));
    };
    send('pointermove');
    while (g.R === R0 && R0.t < dur) {
      v = view(); const R = g.R, sh = R.ship, hr = hudRects();
      const vis = o => { const cx = v.OX + o.x * v.VS, cy = v.OY + o.y * v.VS; if (o.x < 0 || o.y < 0 || o.x > v.W || o.y > v.H) return false; return !hr.some(r => inR(cx, cy, r)); };
      let want;
      if (mode === 'center') want = { x: v.W / 2, y: v.H / 2 };
      else {
        let best = null, bd = 1e9;
        for (const rk of R.rocks) { const d = Math.hypot(rk.x - sh.x, rk.y - sh.y); if (d < bd && vis(rk)) { bd = d; best = rk; } }
        let drop = null, dd = 1e9; const c = cr();
        for (const d of R.picks) { const q = Math.hypot(d.x - sh.x, d.y - sh.y); if (q > c * .8 && q < dd && vis(d)) { dd = q; drop = d; } }
        if (drop && (!best || dd < bd)) want = { x: drop.x, y: drop.y };
        else if (best) { const ux = sh.x - best.x, uy = sh.y - best.y, ul = Math.hypot(ux, uy) || 1; want = { x: best.x + ux / ul * 160, y: best.y + uy / ul * 160 }; }
        else want = { x: v.W / 2, y: v.H / 2 };
        for (const rk of R.rocks) { const ux = want.x - rk.x, uy = want.y - rk.y, d = Math.hypot(ux, uy) || 1; if (d < rk.r + 70) { want.x += ux / d * (rk.r + 70 - d); want.y += uy / d * (rk.r + 70 - d); } }
        want.x = Math.max(20, Math.min(v.W - 20, want.x)); want.y = Math.max(20, Math.min(v.H - 20, want.y));
      }
      const tgt = { x: want.x, y: want.y + lift };
      const mx = tgt.x - P.x, my = tgt.y - P.y, ml = Math.hypot(mx, my), mv = Math.min(ml, 700 * dt);
      if (ml > .5) { P.x += mx / ml * mv; P.y += my / ml * mv; send('pointermove'); }
      g.sim(dt); steps++;
    }
    const R = R0; let val = 0; for (const k in R.bag) val += R.bag[k] * g.ORES[k].v;
    const end = g.R === R0 ? 'time' : (R.hp <= 0 ? 'crash' : 'fuel');
    if (g.R === R0) g.endRun('측정 종료');
    document.getElementById('modal').classList.remove('show');
    return { kills: R.killsTotal, ore: R.bagN, val, t: +R.t.toFixed(1), end, blockedPct: +(blocked / Math.max(1, steps) * 100).toFixed(1), W: v.W, H: v.H, VS: +v.VS.toFixed(3) };
  }, mode, seed, dur, BUILD);
}

(async () => {
  const browser = await puppeteer.connect({ browserURL: process.env.CDP_URL || 'http://localhost:9224', defaultViewport: null, protocolTimeout: 900000 });
  const all = {}, errs = [];
  for (const vp of VPL) {
    const page = await browser.newPage();
    page.on('dialog', d => d.dismiss());
    page.on('pageerror', e => errs.push(vp + ' ' + String(e)));
    try {
      const c = VPS[vp];
      if (c.dev) await page.emulate(KnownDevices[c.dev]); else await page.setViewport({ width: c.width, height: c.height, deviceScaleFactor: 1 });
      await page.evaluateOnNewDocument(SEED_JS); await page.evaluateOnNewDocument(NOTIMER_JS);
      await page.goto(URL0 + '?fresh=1&t=' + Date.now(), { waitUntil: 'networkidle0' });
      await page.evaluate(() => { window.__S0 = JSON.parse(JSON.stringify(window.rock.S)); });
      const res = {};
      for (const mode of MODES) {
        const rs = []; for (let s = 1; s <= RUNS; s++) rs.push(await measure(page, mode, s, DUR));
        const avg = k => +(rs.reduce((a, b) => a + b[k], 0) / rs.length).toFixed(1);
        res[mode] = { kills: avg('kills'), ore: avg('ore'), val: avg('val'), t: avg('t'), blockedPct: avg('blockedPct'), ends: rs.map(r => r.end).join('/'), world: rs[0].W + 'x' + rs[0].H, VS: rs[0].VS, runs: rs };
      }
      all[vp] = res;
      console.error(vp, JSON.stringify(Object.fromEntries(Object.entries(res).map(([k, v]) => [k, [v.kills, v.ore, v.val, v.ends, v.world]]))));
    } catch (e) { errs.push(vp + ' FAIL ' + e.message); }
    await page.close();
  }
  const out = { url: URL0, build: BUILD, dur: DUR, runs: RUNS, results: all, errs };
  if (A.out) fs.writeFileSync(A.out, JSON.stringify(out, null, 1));
  console.log(JSON.stringify({ errs, res: Object.fromEntries(Object.entries(all).map(([vp, r]) => [vp, Object.fromEntries(Object.entries(r).map(([m, v]) => [m, { kills: v.kills, ore: v.ore, val: v.val, ends: v.ends, world: v.world }]))])) }));
  browser.disconnect();
})().catch(e => { console.error(e.message); process.exit(1); });
