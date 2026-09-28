// 쿵짝항구 성능 측정: 곡별 실제 재생 12초 동안 프레임 간격·긴 작업(50ms+)·그리기 시간·소리 예약 누락·메모리
// CPU 1배(데스크톱) / 4배 느리게(중저가 폰 근사) × 1280x720 / 아이폰13 세로
const puppeteer = require(process.env.PUPPETEER_CORE || 'puppeteer-core');
const { KnownDevices } = puppeteer;
const URL = 'http://127.0.0.1:8766/' + (process.env.RFILE || 'rhythm.html');
const SECS = 12;
(async () => {
  const browser = await puppeteer.connect({ browserURL: 'http://localhost:9224', defaultViewport: null, protocolTimeout: 600000 });
  const rows = [];
  for (const dev of ['d1280', 'i13']) for (const cpu of [1, 4]) {
    const page = await browser.newPage(); page.on('dialog', d => d.dismiss());
    const errs = []; page.on('pageerror', e => errs.push(e.message.slice(0, 120)));
    if (dev === 'i13') await page.emulate(KnownDevices['iPhone 13']); else await page.setViewport({ width: 1280, height: 720 });
    const cdp = await page.createCDPSession();
    await cdp.send('Emulation.setFocusEmulationEnabled', { enabled: true });   // 백그라운드 탭 rAF 억제 방지
    await page.goto(URL + '?v=' + Date.now(), { waitUntil: 'load' }); await new Promise(r => setTimeout(r, 500));
    await cdp.send('Emulation.setCPUThrottlingRate', { rate: cpu });
    // 제스처(클릭) → 오디오 켜짐
    await page.mouse.click(200, 200); await new Promise(r => setTimeout(r, 300));
    const games = await page.evaluate(() => rhythm.games().map(g => g.id || g));
    for (const id of games) {
      const r = await page.evaluate(async (id, secs) => {
        try { rhythm.reset && rhythm.reset(); } catch (e) {}
        rhythm.clock && rhythm.clock('real');
        rhythm.start(id, { force: true });
        const d = []; let last = performance.now(), long = 0, longMax = 0;
        const po = new PerformanceObserver(l => { for (const e of l.getEntries()) { long++; longMax = Math.max(longMax, e.duration); } });
        try { po.observe({ entryTypes: ['longtask'] }); } catch (e) {}
        await new Promise(res => { const t0 = performance.now(); (function f() { const n = performance.now(); d.push(n - last); last = n; if (n - t0 < secs * 1000) requestAnimationFrame(f); else res(); })(); });
        po.disconnect();
        d.shift(); d.sort((a, b) => a - b);
        const q = p => +d[Math.min(d.length - 1, Math.floor(p * d.length))].toFixed(1);
        const sl = rhythm.schedLog ? rhythm.schedLog() : null;
        const late = sl ? (sl.lateSchedules ?? sl.late ?? (Array.isArray(sl) ? sl.filter(x => x.late).length : null)) : null;
        const mem = performance.memory ? Math.round(performance.memory.usedJSHeapSize / 1048576) : null;
        const st = rhythm.state ? rhythm.state() : {};
        try { rhythm.reset && rhythm.reset(); } catch (e) {}
        return { frames: d.length, fps: +(d.length / secs).toFixed(0), p50: q(.5), p95: q(.95), p99: q(.99), max: q(1), over33: d.filter(x => x > 33.4).length, long, longMax: Math.round(longMax), late, memMB: mem, audio: st.audio || st.ctxState || null };
      }, id, SECS);
      rows.push({ dev, cpu, id, ...r, errs: errs.length });
    }
    await page.close();
  }
  browser.disconnect();
  const pad = (s, n) => String(s ?? '-').padEnd(n);
  console.log(pad('dev', 6) + pad('cpu', 4) + pad('game', 8) + pad('fps', 5) + pad('p50', 6) + pad('p95', 6) + pad('p99', 6) + pad('max', 7) + pad('>33ms', 6) + pad('long', 5) + pad('longMax', 8) + pad('late', 5) + pad('memMB', 6) + 'errs');
  for (const r of rows) console.log(pad(r.dev, 6) + pad(r.cpu + 'x', 4) + pad(r.id, 8) + pad(r.fps, 5) + pad(r.p50, 6) + pad(r.p95, 6) + pad(r.p99, 6) + pad(r.max, 7) + pad(r.over33, 6) + pad(r.long, 5) + pad(r.longMax, 8) + pad(r.late, 5) + pad(r.memMB, 6) + r.errs);
})().catch(e => { console.error(e.stack || e.message); process.exit(1); });
