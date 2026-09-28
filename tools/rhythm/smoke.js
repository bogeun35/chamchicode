// 팀장 배포 전 스모크: 사본(rhythm-deploy-snap.html) — 게임별 완벽/+60ms/무입력 봇, 페이지 오류, 아이폰13 로드·메뉴 스크린샷
const puppeteer = require(process.env.PUPPETEER_CORE || 'puppeteer-core');
const { KnownDevices } = puppeteer;
const FILE = process.env.RFILE || 'rhythm.html';
const URL = 'http://127.0.0.1:8766/' + FILE;
const SHOT = require('path').join(__dirname, 'out').replace(/\\/g, '/') + '/' + 'lead-';
(async () => {
  const browser = await puppeteer.connect({ browserURL: 'http://localhost:9224', defaultViewport: null, protocolTimeout: 900000 });
  const page = await browser.newPage(); page.on('dialog', d => d.dismiss());
  const errs = []; page.on('pageerror', e => errs.push('pageerror: ' + e.message)); page.on('console', m => { if (m.type() === 'error' && !/favicon/.test(m.text())) errs.push('console: ' + m.text().slice(0, 150)); });
  await page.setViewport({ width: 1280, height: 720 });
  await page.goto(URL + '?v=' + Date.now(), { waitUntil: 'load' }); await new Promise(r => setTimeout(r, 600));
  await page.screenshot({ path: SHOT + 'snap-d1280-menu.png' });
  const r = await page.evaluate(() => {
    const out = { api: Object.keys(window.rhythm || {}) };
    const ids = (rhythm.games ? rhythm.games() : []).map(g => g.id || g);
    out.games = ids;
    const play = (id, fn) => { try { rhythm.reset && rhythm.reset(); rhythm.start(id, { sim: true, force: true }); const c = rhythm.chart(id); fn(c); rhythm.advance(c.lengthSec + 2); const x = rhythm.result(); return { score: x.score, grade: x.grade, n: c.notes.length }; } catch (e) { return { err: e.message }; } };
    const taps = (c, dt) => c.notes.forEach(n => { rhythm.input('bot', 'down', n.t + dt); if (n.kind !== 'tap' && n.relT != null) rhythm.input('bot', 'up', n.relT + dt); });
    out.res = {};
    for (const id of ids) out.res[id] = { perfect: play(id, c => taps(c, 0)), late60: play(id, c => taps(c, .06)), idle: play(id, () => {}) };
    return out;
  });
  await page.close();
  // 아이폰13 세로: 로드·메뉴
  const p2 = await browser.newPage(); p2.on('dialog', d => d.dismiss()); const errs2 = []; p2.on('pageerror', e => errs2.push(e.message));
  await p2.emulate(KnownDevices['iPhone 13']); await p2.goto(URL + '?v=' + Date.now(), { waitUntil: 'load' }); await new Promise(r => setTimeout(r, 800));
  await p2.screenshot({ path: SHOT + 'snap-i13-menu.png' });
  const sw = await p2.evaluate(() => ({ sw: document.documentElement.scrollWidth, vw: innerWidth }));
  await p2.close(); browser.disconnect();
  console.log(JSON.stringify({ file: FILE, errs, errsPhone: errs2, phoneScroll: sw, ...r }, null, 1));
})().catch(e => { console.error(e.stack || e.message); process.exit(1); });
