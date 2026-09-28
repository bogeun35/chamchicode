// 실제 오디오 모드: 허브 → 제스처 후 real 시계로 연습·본게임, 예약 누락(late)·버림(dropped)·큐 로그 대조, 실제 탭 판정
const puppeteer = require(process.env.PUPPETEER_CORE || 'puppeteer-core');
const fs = require('fs');
const HOST = '127.0.0.1';
const sleep = ms => new Promise(r => setTimeout(r, ms));
const OUT = { runs: [], errs: [], steps: [] };
(async () => {
  const browser = await puppeteer.connect({ browserURL: 'http://localhost:9224', defaultViewport: null, protocolTimeout: 900000 });
  const page = await browser.newPage();
  page.on('dialog', d => d.dismiss().catch(() => {}));
  page.on('pageerror', e => OUT.errs.push('pageerror:' + String(e).slice(0, 300)));
  page.on('console', m => { if (m.type() === 'error') OUT.errs.push('console:' + m.text().slice(0, 200)); });
  page.on('response', r => { if (r.status() >= 400) OUT.errs.push('http' + r.status() + ':' + r.url().slice(0, 120)); });
  await page.emulate(puppeteer.KnownDevices['iPhone 13']);
  await page.goto(`http://${HOST}:8766/index.html?t=${Date.now()}`, { waitUntil: 'load' }); await sleep(1500);
  const c = await page.evaluate(async () => { document.querySelector('.landing-card[onclick*="rhythm"]').scrollIntoView({ block: 'center' }); await new Promise(r => setTimeout(r, 400)); const r = document.querySelector('.landing-card[onclick*="rhythm"]').getBoundingClientRect(); return { x: r.x + r.width / 2, y: r.y + r.height / 2 }; });
  OUT.steps.push(['card', c]); await page.touchscreen.tap(c.x, c.y); await sleep(1500); OUT.steps.push(['frames', page.frames().map(f => f.url())]);
  let fr = null; for (let i = 0; i < 60 && !fr; i++) { await sleep(200); fr = page.frames().find(f => /rhythm\.html/.test(f.url())); if (fr && !(await fr.evaluate(() => !!window.rhythm).catch(() => false))) fr = null; }
  await sleep(500);
  const ifr = await page.$('#iframe-rhythm');
  await fr.evaluate(() => { rhythm.reset(); rhythm.clock('real'); });
  const W2P = async (x, y) => { const v = await fr.evaluate(() => rhythm.view()); const b = await ifr.boundingBox(); return { x: b.x + v.OX + x * v.VS, y: b.y + v.OY + y * v.VS }; };
  const tapW = async (x, y) => { const p = await W2P(x, y); await page.touchscreen.tap(p.x, p.y); };
  await tapW(640, 400); await sleep(400);   // 제스처(타이틀 탭)
  OUT.steps.push(['after title', await fr.evaluate(() => ({ scene: rhythm.state().scene, audio: rhythm.state().audio }))]);
  const b = await fr.evaluate(() => ui.btns.map(b => ({ x: b.x, y: b.y, w: b.w, h: b.h, act: b.act.toString() })));
  const later = b.find(x => /goMenu/.test(x.act)); await tapW(later.x + later.w / 2, later.y + later.h / 2); await sleep(400);
  OUT.steps.push(['menu', await fr.evaluate(() => ({ scene: rhythm.state().scene, audio: rhythm.state().audio }))]);
  const measure = async (label, sec, tapTries) => {
    const t0 = Date.now(); const taps = [];
    while (Date.now() - t0 < sec * 1000) {
      if (tapTries && taps.length < tapTries) {
        const st = await fr.evaluate(() => rhythm.state());
        const n = st.next && st.next[0];
        if (n && n.t - st.songT > 0.03 && n.t - st.songT < 0.25) {
          await sleep(Math.max(0, (n.t - st.songT) * 1000 - 25));
          const p = await W2P(640, 400);
          if (n.relT != null) { await page.touchscreen.touchStart(p.x, p.y); await sleep(Math.max(40, (n.relT - n.t) * 1000)); await page.touchscreen.touchEnd(); } else await page.touchscreen.tap(p.x, p.y);
          await sleep(60);
          taps.push(await fr.evaluate(id => { const r = rhythm._run; return r ? r.log.filter(l => l.noteId === id) : null; }, n.id));
          continue;
        }
      }
      await sleep(40);
    }
    const r = await fr.evaluate(() => { const r = rhythm._run, s = rhythm.state(); if (!r) return { scene: s.scene }; const lim = s.songT - .15; const exp = r.ev.filter(e => e.cue && e.t <= lim && e.t >= (r.resumeAt || -99)).length; const got = r.slog.filter(e => e.t <= lim).length; const errs = r.slog.map(e => Math.abs(e.at - e.t) * 1000); return { scene: s.scene, type: r.type, game: r.game, audio: s.audio, songT: s.songT, paused: s.paused, why: s.pauseWhy, late: r.late, dropped: r.dropped || 0, cueExpected: exp, cueScheduled: got, maxSchedErrMs: errs.length ? +Math.max(...errs).toFixed(2) : null, counts: r.counts }; });
    OUT.runs.push({ label, ...r, taps });
    return r;
  };
  // 초밥: UI 로 카드 → 시작(연습, real) → 8초 → 건너뛰기 버튼 → 본게임 real 20초
  const mb = await fr.evaluate(() => ui.btns[0]); await tapW(mb.x + mb.w / 2, mb.y + mb.h / 2); await sleep(400);
  const sb = await fr.evaluate(() => { const b = ui.btns.find(b => /cardGo\('practice'\)/.test(b.act.toString())); return { x: b.x, y: b.y, w: b.w, h: b.h }; }); await tapW(sb.x + sb.w / 2, sb.y + sb.h / 2); await sleep(200);
  await measure('sushi-practice-real', 14, 3);
  const k = await fr.evaluate(() => { const r = document.getElementById('skipBtn').getBoundingClientRect(); return { x: r.x + r.width / 2, y: r.y + r.height / 2 }; }); const fb = await ifr.boundingBox();
  await page.touchscreen.tap(fb.x + k.x, fb.y + k.y); await sleep(200);
  await measure('sushi-play-real', 22, 4);
  for (const id of ['salute', 'puffer', 'gull', 'remix']) {
    await fr.evaluate(id => rhythm.start(id, { sim: false, force: true }), id); await sleep(100);
    await measure(id + '-play-real', 20, 3);
  }
  for (const id of ['puffer']) { await fr.evaluate(id => rhythm.start(id, { sim: false, force: true, practice: true }), id); await sleep(100); await measure(id + '-practice-real', 12, 2); }
  fs.writeFileSync(__dirname + '/real.json', JSON.stringify(OUT, null, 1));
  console.log(JSON.stringify(OUT, null, 0).slice(0, 8000));
  try { await page.close(); } catch (e) {}
  try { const l = await (await fetch('http://localhost:9224/json/list')).json(); for (const t of l) if (t.url && t.url.includes(HOST + ':8766')) await fetch('http://localhost:9224/json/close/' + t.id); } catch (e) {}
  browser.disconnect();
})().catch(e => { console.error('FATAL', e); process.exit(1); });
