const puppeteer = require(process.env.PUPPETEER_CORE || 'puppeteer-core');
const fs = require('fs');
const CUR = './rhythm.html', BEF = process.env.RH_BEFORE || './rhythm.html.before-감개편'   // 비교용 이전 판 파일 경로(RH_BEFORE 로 지정);
async function open(host, ver = 'cur', opts = {}) {
  const browser = await puppeteer.connect({ browserURL: 'http://localhost:9224', defaultViewport: null, protocolTimeout: 900000 });
  const page = await browser.newPage(); const errs = [];
  page.on('dialog', d => d.dismiss().catch(() => {}));
  page.on('pageerror', e => errs.push(String(e)));
  page.on('console', m => { if (m.type() === 'error') errs.push('console:' + m.text().slice(0, 200)); });
  if (opts.device) await page.emulate(puppeteer.KnownDevices[opts.device]);
  else await page.setViewport({ width: opts.w || 1280, height: opts.h || 720, deviceScaleFactor: 1 });
  if (ver === 'before') { const body = fs.readFileSync(BEF); await page.setRequestInterception(true); page.on('request', rq => { if (rq.url().includes('/rhythm.html')) rq.respond({ status: 200, contentType: 'text/html; charset=utf-8', body }); else rq.continue(); }); }
  await page.goto(`http://${host}:8766/rhythm.html?t=${Date.now()}`, { waitUntil: 'load' });
  await new Promise(r => setTimeout(r, 500));
  await page.evaluate(() => { rhythm.reset(); rhythm.clock('sim'); });
  return { browser, page, errs, host };
}
async function close(S) {
  try { await S.page.close(); } catch (e) {}
  try { const l = await (await fetch('http://localhost:9224/json/list')).json(); for (const t of l) if (t.url && t.url.includes(S.host + ':8766')) await fetch('http://localhost:9224/json/close/' + t.id); } catch (e) {}
  try { S.browser.disconnect(); } catch (e) {}
}
module.exports = { open, close, CUR, BEF };
