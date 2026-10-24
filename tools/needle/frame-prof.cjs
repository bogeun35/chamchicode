// 바늘 찾기 프레임 비용 측정: 파는 중(더미 계속 변함) 프레임을 CPU 프로파일 → 함수별 self time, 프레임당 JS 시간
// node needle-prof.cjs [label] [url]
const { chromium } = require('C:/Users/user/AppData/Roaming/npm/node_modules/rea-agents/node_modules/playwright-core');
const label = process.argv[2] || 'x', URL = process.argv[3] || 'http://127.0.0.1:8831/needle.html';
(async () => {
  const b = await chromium.launch({ executablePath: 'C:/Program Files/Google/Chrome/Application/chrome.exe', headless: true, args: process.env.GPU ? ['--use-angle=d3d11', '--enable-gpu', '--ignore-gpu-blocklist', '--mute-audio'] : ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--mute-audio'] });
  const p = await b.newPage({ viewport: { width: 1280, height: 720 } });
  const errs = []; p.on('pageerror', e => errs.push(String(e).slice(0, 300)));
  await p.goto(URL + '?mute&t=' + Date.now()); await p.evaluate(() => { try { localStorage.clear(); } catch (e) {} });
  await p.goto(URL + '?mute&t=' + Date.now()); await p.waitForFunction(() => window.needle, null, { timeout: 60000 });
  await p.evaluate(() => { const N = window.needle; N.startGame(false); N.tp(-4, 6); N.look(2.4, -.5); N.step(1 / 60, 30); });
  const cdp = await p.context().newCDPSession(p);
  await cdp.send('Profiler.enable'); await cdp.send('Profiler.setSamplingInterval', { interval: 200 });
  const scen = async (name, fn) => {
    await cdp.send('Profiler.start');
    const r = await p.evaluate(fn);
    const { profile } = await cdp.send('Profiler.stop');
    const self = new Map(), byId = new Map(profile.nodes.map(n => [n.id, n]));
    const dts = profile.timeDeltas; const cnt = new Map(); profile.samples.forEach((id, i) => cnt.set(id, (cnt.get(id) || 0) + (dts[i] || 0)));
    for (const [id, us] of cnt) { const n = byId.get(id), cf = n.callFrame; const k = `${cf.functionName || '(anon)'} ${cf.url.split('/').pop().split('?')[0]}:${cf.lineNumber + 1}`; self.set(k, (self.get(k) || 0) + us); }
    const tot = [...self.values()].reduce((a, c) => a + c, 0);
    console.log(`\n== ${label} / ${name}: 프레임당 JS ${r.msPerFrame.toFixed(2)}ms (step ${r.stepMs.toFixed(2)} · render ${r.renderMs.toFixed(2)}) dirty평균 ${r.dirty}`);
    for (const [k, us] of [...self].sort((a, b) => b[1] - a[1]).slice(0, 14)) console.log(`${(us / 1000).toFixed(0).padStart(6)}ms ${(us / tot * 100).toFixed(1).padStart(5)}%  ${k}`);
  };
  // 1) 가만히 서 있기
  await scen('idle', () => { const N = window.needle; let st = 0, rn = 0; for (let i = 0; i < 120; i++) { const a = performance.now(); N.stepOnly(1 / 60); const b = performance.now(); N.render(true); st += b - a; rn += performance.now() - b; } return { msPerFrame: (st + rn) / 120, stepMs: st / 120, renderMs: rn / 120, dirty: 0 }; });
  // 2) 쇠스랑으로 계속 파서 바닥에 던지기 (10프레임마다 80가닥)
  await scen('digging', () => { const N = window.needle; let st = 0, rn = 0, dsum = 0; let s = 7; const r = () => (s = (s * 16807) % 2147483647) / 2147483647;
    for (let i = 0; i < 240; i++) { if (i % 10 === 0) { const a = r() * 6.28, d = 3 + r() * 5; const x = 1 + Math.cos(a) * d, z = -1.5 + Math.sin(a) * d; const g = N.scoopPile(x, z, 80, .38); if (g.n) N.mkItem('hay', g.n, x + 1, 2, z, 1, 1, 0); }
      const a = performance.now(); N.stepOnly(1 / 60); const b = performance.now(); N.render(true); st += b - a; rn += performance.now() - b; dsum += N.dirtyCount(); }
    return { msPerFrame: (st + rn) / 240, stepMs: st / 240, renderMs: rn / 240, dirty: Math.round(dsum / 240) }; });
  // 3) 바닥에 덩이 500개
  await scen('items500', () => { const N = window.needle; for (let i = 0; i < 500; i++) N.mkItem('hay', 30, -10 + (i % 25) * .5, .5, 8 + Math.floor(i / 25) * .4, 0, 0, 0); N.stepOnly(1 / 60, 90); let st = 0, rn = 0; for (let i = 0; i < 120; i++) { const a = performance.now(); N.stepOnly(1 / 60); const b = performance.now(); N.render(true); st += b - a; rn += performance.now() - b; } return { msPerFrame: (st + rn) / 120, stepMs: st / 120, renderMs: rn / 120, dirty: 0 }; });
  if (errs.length) console.log('ERRS', errs);
  await b.close();
})();
