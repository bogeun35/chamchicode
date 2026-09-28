// 최종 검수(모바일허브): 허브 → 쿵짝항구 → 보정 → 5곡 연습·본게임·결과. 실제 터치/마우스 입력, sim 시계
const puppeteer = require(process.env.PUPPETEER_CORE || 'puppeteer-core');
const fs = require('fs');
const IMG = require('path').join(__dirname, 'out').replace(/\\/g, '/') + '/' + '';
const mode = process.argv[2] || 'iphone';
const HOST = { iphone: '127.0.0.1', land: '127.0.0.1', desk: '127.0.0.1' }[mode];
const sleep = ms => new Promise(r => setTimeout(r, ms));
const OUT = { mode, host: HOST, steps: [], sizeIssues: [], scrollIssues: [], taps: {}, results: {}, practice: {}, errs: [] };
const closeMine = async () => { try { const l = await (await fetch('http://localhost:9224/json/list')).json(); for (const t of l) if (t.url && t.url.includes(HOST + ':8766')) await fetch('http://localhost:9224/json/close/' + t.id); } catch (e) {} };
(async () => {
  const browser = await puppeteer.connect({ browserURL: 'http://localhost:9224', defaultViewport: null, protocolTimeout: 900000 });
  const page = await browser.newPage();
  page.on('dialog', d => d.dismiss().catch(() => {}));
  page.on('pageerror', e => OUT.errs.push('pageerror:' + String(e).slice(0, 300)));
  page.on('console', m => { if (m.type() === 'error') OUT.errs.push('console:' + m.text().slice(0, 200)); });
  page.on('response', r => { if (r.status() >= 400) OUT.errs.push('http' + r.status() + ':' + r.url().slice(0, 200)); });
  const touch = mode !== 'desk';
  if (mode === 'iphone') await page.emulate(puppeteer.KnownDevices['iPhone 13']);
  else if (mode === 'land') await page.setViewport({ width: 844, height: 390, deviceScaleFactor: 3, isMobile: true, hasTouch: true, isLandscape: true });
  else await page.setViewport({ width: 1920, height: 1080, deviceScaleFactor: 1 });
  await page.goto(`http://${HOST}:8766/index.html?t=${Date.now()}`, { waitUntil: 'load' });
  await sleep(800);
  const shots = [];
  const shot = async n => { await page.evaluate(() => new Promise(r => requestAnimationFrame(() => requestAnimationFrame(r)))).catch(() => {}); const f = `${IMG}v2-final-${mode}-${n}.png`; await page.screenshot({ path: f }); shots.push(f); return f; };
  const hubScroll = async tag => { const s = await page.evaluate(() => ({ sw: document.documentElement.scrollWidth, cw: document.documentElement.clientWidth, bw: document.body.scrollWidth, sx: scrollX })); if (s.sw > s.cw + 1 || s.bw > s.cw + 1) OUT.scrollIssues.push({ tag, where: 'hub', ...s }); return s; };
  await hubScroll('hub-home'); await shot('00-hub');
  const card = await page.evaluate(() => [...document.querySelectorAll('[onclick*="rhythm"]')].map(e => { const r = e.getBoundingClientRect(); return { cls: e.className, x: r.x, y: r.y, w: r.width, h: r.height, vis: r.width > 0 && r.height > 0 && getComputedStyle(e).visibility !== 'hidden' }; }));
  OUT.steps.push(['hub entries', card]);
  const ih = await page.evaluate(() => innerHeight);
  let c = card.find(x => x.vis && /landing/.test(x.cls)) || card.find(x => x.vis);
  if (c.y + c.h > ih || c.y < 0) {
    await page.evaluate(() => document.querySelector('.landing-card[onclick*="rhythm"]').scrollIntoView({ block: 'center' })); await sleep(400);
    c = await page.evaluate(() => { const r = document.querySelector('.landing-card[onclick*="rhythm"]').getBoundingClientRect(); return { x: r.x, y: r.y, w: r.width, h: r.height }; });
    await hubScroll('hub-home-scrolled'); await shot('00b-hub-card');
  }
  OUT.steps.push(['tap hub card', c]);
  if (touch) await page.touchscreen.tap(c.x + c.w / 2, c.y + c.h / 2); else await page.mouse.click(c.x + c.w / 2, c.y + c.h / 2);
  let fr = null;
  for (let i = 0; i < 60 && !fr; i++) { await sleep(200); fr = page.frames().find(f => /rhythm\.html/.test(f.url())); if (fr) { const ok = await fr.evaluate(() => !!window.rhythm).catch(() => false); if (!ok) fr = null; } }
  if (!fr) throw new Error('rhythm frame not found');
  await sleep(600);
  await hubScroll('hub-rhythm');
  const ifr = await page.$('#iframe-rhythm'); let box = await ifr.boundingBox();
  OUT.steps.push(['iframe box', box, await page.evaluate(() => ({ iw: innerWidth, ih: innerHeight, sy: scrollY }))]);
  await fr.evaluate(() => { rhythm.reset(); rhythm.clock('sim'); });
  await sleep(300);
  const view = () => fr.evaluate(() => rhythm.view());
  const W2P = async (x, y) => { const v = await view(); box = await ifr.boundingBox(); return { x: box.x + v.OX + x * v.VS, y: box.y + v.OY + y * v.VS }; };
  const tapP = async (x, y) => { if (touch) await page.touchscreen.tap(x, y); else await page.mouse.click(x, y); };
  const tapW = async (x, y) => { const p = await W2P(x, y); await tapP(p.x, p.y); await sleep(140); };
  const scene = () => fr.evaluate(() => rhythm.state().scene);
  const btns = () => fr.evaluate(() => ui.btns.map(b => ({ x: b.x, y: b.y, w: b.w, h: b.h, dis: !!b.dis, act: b.act.toString().slice(0, 70) })));
  const checkUI = async tag => {
    const v = await view(); const b = await btns();
    for (const x of b) { const w = x.w * v.VS, h = x.h * v.VS, l = v.OX + x.x * v.VS, t = v.OY + x.y * v.VS; if (w < 40 || h < 40 || l < -1 || t < -1 || l + w > v.CW + 1 || t + h > v.CH + 1) OUT.sizeIssues.push({ tag, act: x.act, w: +w.toFixed(1), h: +h.toFixed(1), l: +l.toFixed(1), t: +t.toFixed(1), CW: v.CW, CH: v.CH }); }
    const d = await fr.evaluate(() => ['pauseBtn', 'skipBtn'].map(id => { const e = document.getElementById(id), r = e.getBoundingClientRect(); return { id, disp: getComputedStyle(e).display, w: r.width, h: r.height, l: r.left, t: r.top, r: r.right, b: r.bottom, iw: innerWidth, ih: innerHeight }; }));
    for (const x of d) if (x.disp !== 'none' && (x.w < 40 || x.h < 40 || x.l < 0 || x.r > x.iw + 1 || x.t < 0 || x.b > x.ih + 1)) OUT.sizeIssues.push({ tag, ...x });
    const s = await fr.evaluate(() => ({ sw: document.documentElement.scrollWidth, cw: document.documentElement.clientWidth, sh: document.documentElement.scrollHeight, ch: document.documentElement.clientHeight }));
    if (s.sw > s.cw + 1) OUT.scrollIssues.push({ tag, where: 'frame', ...s });
    await hubScroll(tag);
    return { v, b, d };
  };
  const findBtn = async re => { const b = await btns(); const i = b.findIndex(x => re.test(x.act) && !x.dis); return i < 0 ? null : b[i]; };
  const tapBtn = async (re, tag) => { const b = await findBtn(re); if (!b) throw new Error('no btn ' + re + ' at ' + tag + ' ' + JSON.stringify(await btns())); await tapW(b.x + b.w / 2, b.y + b.h / 2); };
  OUT.steps.push(['view', await view()]);
  await checkUI('title'); await shot('01-title');
  await tapW(640, 400);
  OUT.steps.push(['after title', await scene()]);
  await sleep(300); await checkUI('calibAsk'); await shot('02-calibAsk');
  await tapBtn(/startCalib/, 'calibAsk');
  OUT.steps.push(['calib', await scene()]);
  const bsC = await fr.evaluate(() => rhythm._run.bs);
  await checkUI('calib');
  for (let b = 4; b <= 11; b++) { await fr.evaluate(t => rhythm.advance(t - rhythm.state().songT), b * bsC); if (b === 6) await shot('03-calib-tap'); const p = await W2P(640, 400); await tapP(p.x, p.y); }
  await fr.evaluate(() => rhythm.advance(1.0));
  const cal = await fr.evaluate(() => ({ res: rhythm._run && rhythm._run.cal.res, taps: rhythm._run && rhythm._run.cal.taps, off: rhythm.offset() }));
  OUT.steps.push(['calib result', cal]);
  await sleep(200); await checkUI('calibResult'); await shot('04-calib-result');
  await tapBtn(/goMenu/, 'calibResult');
  await sleep(300); OUT.steps.push(['menu', await scene()]);
  await checkUI('menu'); await shot('05-menu');
  const games = await fr.evaluate(() => rhythm.games().map(g => g.id));
  const playNotes = async (tag, maxSec, shotAt) => {
    const log = []; const shotDone = {};
    for (let guard = 0; guard < 3000; guard++) {
      const st = await fr.evaluate(() => { const r = rhythm._run; const s = rhythm.state(); if (!r || !(s.scene === 'play' || s.scene === 'practice')) return { scene: s.scene }; const n = r.notes.filter(n => !n.j && n.t > s.songT - .001).sort((a, b) => a.t - b.t)[0]; return { scene: s.scene, type: r.type, songT: s.songT, len: r.len, n: n ? { id: n.id, t: n.t, relT: n.relT, kind: n.kind } : null }; });
      if (st.scene !== tag) return { log, end: st.scene };
      if (st.songT > maxSec) return { log, end: 'cap' };
      if (!st.n) { await fr.evaluate(() => rhythm.advance(.25)); continue; }
      await fr.evaluate(t => rhythm.advance(Math.max(0, t - rhythm.state().songT)), st.n.t);
      const k = log.length; if (shotAt && shotAt.includes(k) && !shotDone[k]) { shotDone[k] = 1; await shot(`${shotAt.name}-${k}`); }
      const p = await W2P(640, 400);
      if (st.n.relT != null) {
        if (touch) await page.touchscreen.touchStart(p.x, p.y); else { await page.mouse.move(p.x, p.y); await page.mouse.down(); }
        await fr.evaluate(t => rhythm.advance(Math.max(0, t - rhythm.state().songT)), st.n.relT);
        if (touch) await page.touchscreen.touchEnd(); else await page.mouse.up();
      } else await tapP(p.x, p.y);
      const j = await fr.evaluate(id => { const r = rhythm._run; return r ? r.log.filter(l => l.noteId === id).map(l => l.judge + ':' + l.err) : ['norun']; }, st.n.id);
      log.push({ id: st.n.id, kind: st.n.kind, hold: st.n.relT != null, j });
      if (!j.length) {
        const d = await fr.evaluate(() => { const s = rhythm.state(); return { paused: s.paused, why: s.pauseWhy, scene: s.scene, songT: s.songT, held: s.held, vis: typeof frameVisible !== 'undefined' ? frameVisible : null, hid: document.hidden }; });
        const hb = await page.evaluate(() => ({ sy: scrollY, sx: scrollX, cur: typeof currentPage !== 'undefined' ? currentPage : null }));
        OUT.steps.push(['noJudge', tag, st.n, d, hb, await ifr.boundingBox()]);
        if (log.slice(-4).every(l => !l.j.length) && log.length >= 4) { await shot(`${tag}-stuck`); return { log, end: 'stuck' }; }
      }
    }
    return { log, end: 'guard' };
  };
  const summarize = log => { const c = {}; for (const l of log) for (const j of l.j) { const k = j.split(':')[0]; c[k] = (c[k] || 0) + 1; } const noJ = log.filter(l => !l.j.length).length; return { notes: log.length, judge: c, noJudge: noJ, maxErr: Math.max(0, ...log.flatMap(l => l.j.map(j => Math.abs(+j.split(':')[1] || 0)))) }; };
  for (let gi = 0; gi < games.length; gi++) {
    const id = games[gi];
    if ((await scene()) !== 'menu') { await fr.evaluate(() => rhythm.skip('menu')); OUT.steps.push(['forced menu before', id]); }
    await sleep(250);
    const mb = (await btns())[gi]; OUT.steps.push(['menu btn', id, mb.dis]);
    if (mb.dis) { OUT.steps.push(['LOCKED', id]); continue; }
    await tapW(mb.x + mb.w / 2, mb.y + mb.h / 2);
    await sleep(350); OUT.steps.push(['card', id, await scene(), await fr.evaluate(() => ui.card)]);
    await checkUI('card-' + id); if (gi === 0 || gi === 4) await shot(`1${gi}-card-${id}`);
    await tapBtn(/cardGo\('practice'\)/, 'card-' + id);
    await sleep(200);
    let sc = await scene(); OUT.steps.push(['after card', id, sc]);
    if (sc === 'practice') {
      await checkUI('practice-' + id);
      const t0 = await fr.evaluate(() => rhythm.state().songT);
      const sa = [1]; sa.name = `2${gi}-practice-${id}`;
      const pr = await playNotes('practice', 400, sa);
      OUT.practice[id] = { ...summarize(pr.log), end: pr.end };
      sc = await scene();
      if (sc === 'practice') {
        OUT.steps.push(['practice did not finish', id]);
        const sb = await fr.evaluate(() => { const r = document.getElementById('skipBtn').getBoundingClientRect(); return { x: r.x + r.width / 2, y: r.y + r.height / 2 }; }); box = await ifr.boundingBox(); await tapP(box.x + sb.x, box.y + sb.y); await sleep(200); sc = await scene();
      }
    }
    if (sc !== 'play') { OUT.steps.push(['NOT PLAY', id, sc]); continue; }
    await checkUI('play-' + id);
    const sa = [3, 12]; sa.name = `3${gi}-play-${id}`;
    const pl = await playNotes('play', 9999, sa);
    await fr.evaluate(() => { const r = rhythm._run; if (r) rhythm.advance(r.len + 2 - rhythm.state().songT); });
    await sleep(300);
    OUT.taps[id] = { ...summarize(pl.log), end: pl.end };
    const res = await fr.evaluate(() => { const r = rhythm.result(); return r && { game: r.game, score: r.score, grade: r.grade, medal: r.medal, stamp: r.stamp, unlocked: r.unlocked, counts: r.counts, late: r.lateSchedules }; });
    OUT.results[id] = { scene: await scene(), ...res };
    await sleep(1400); await checkUI('result-' + id); await shot(`4${gi}-result-${id}`);
    await tapBtn(/goMenu/, 'result-' + id);
    await sleep(300);
  }
  OUT.steps.push(['final scene', await scene()]); await checkUI('menu-end'); await shot('50-menu-end');
  OUT.games = await fr.evaluate(() => rhythm.games().map(g => ({ id: g.id, best: g.best, grade: g.grade, unlocked: g.unlocked, cleared: g.cleared })));
  OUT.shots = shots;
  fs.writeFileSync(__dirname + `/hub-${mode}.json`, JSON.stringify(OUT, null, 1));
  console.log(JSON.stringify({ errs: OUT.errs, sizeIssues: OUT.sizeIssues.slice(0, 30), nSize: OUT.sizeIssues.length, scrollIssues: OUT.scrollIssues, taps: OUT.taps, practice: OUT.practice, results: OUT.results, games: OUT.games }, null, 0));
  try { await page.close(); } catch (e) {}
  await closeMine(); browser.disconnect();
})().catch(async e => { console.error('FATAL', e); fs.writeFileSync(__dirname + `/hub-${mode}-fail.json`, JSON.stringify(OUT, null, 1)); await closeMine(); process.exit(1); });
