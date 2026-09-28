// 초반 곡선 비교 — node early.js <label> <bot chase|center> ; env TUNA_URL, TUNA_PRE, TUNA_MAXV(기본 30)
// 항해마다: 첫 포획까지 걸린 초, 포획 수, 골드, 레벨, 화면 물고기 평균, 최대 콤보, 크리 수, 떠 있는 텍스트 최대
const puppeteer = require(process.env.PUPPETEER_CORE || 'puppeteer-core');
const OUTDIR = process.env.OUT_DIR || require('path').join(__dirname, 'out'); require('fs').mkdirSync(OUTDIR, { recursive: true });
const src = require('fs').readFileSync(require('path').join(__dirname, 'progress.js'), 'utf8');
const shopFn = eval('(' + src.split('const shopFn = ')[1].split('\n};\n')[0] + '\n})');
const label = process.argv[2] || 'early', bot = process.argv[3] || 'chase', URL = process.env.TUNA_URL, pre = process.env.TUNA_PRE || '', MAXV = +(process.env.TUNA_MAXV || 30);
const voyage = (bot) => {
  const T = window.tuna, S = T.S; const g0 = S.gold, c0 = Object.values(S.counts).reduce((a, b) => a + b, 0);
  const r = T.startVoyage(); if (r === false || !T.V) return { error: 'no voyage' };
  const V = T.V, LW = V.net.x * 2, LH = V.net.y * 2; let t = 0, steps = 0, first = null, fishSum = 0, maxCombo = 0, maxTexts = 0, crits = 0, lastN = c0;
  while (T.V && !T.V.ended && steps < 4000) {
    const v = T.V, dt = 0.05;
    if (bot === 'center') { v.net.x = LW / 2; v.net.y = LH / 2; }
    else if (bot === 'cluster') { const R = T.netR(); let best = null, bn = 0; for (const c of v.fish) { if (c.x < 0 || c.x > LW) continue; let n = 0; for (const f of v.fish) if (Math.hypot(f.x - c.x, f.y - c.y) < R * .9) n += 1 + f.f.i; if (n > bn) { bn = n; best = c; } }
      if (best) { const dx = best.x - v.net.x, dy = best.y - v.net.y, d = Math.hypot(dx, dy) || 1, mv = Math.min(d, 1200 * dt); v.net.x += dx / d * mv; v.net.y += dy / d * mv; } v.net.y = Math.max(90, v.net.y); }
    else { let best = null, bd = 1e9; for (const f of v.fish) { if (f.x < 0 || f.x > LW) continue; const d = Math.hypot(f.x - v.net.x, f.y - v.net.y) / Math.max(1, f.f.i + 1); if (d < bd) { bd = d; best = f; } }
      if (best) { const dx = best.x - v.net.x, dy = best.y - v.net.y, d = Math.hypot(dx, dy) || 1, mv = Math.min(d, 700 * dt); v.net.x += dx / d * mv; v.net.y += dy / d * mv; } v.net.y = Math.max(90, v.net.y); }
    T.sim(dt); t += dt; steps++; if (!T.V) break;
    fishSum += T.V.fish.length; if (T.V.combo > maxCombo) maxCombo = T.V.combo; if (T.V.texts.length > maxTexts) maxTexts = T.V.texts.length;
    crits += T.V.texts.filter(x => x.t === 0 && /CRIT/.test(x.s || '')).length;
    const n = Object.values(S.counts).reduce((a, b) => a + b, 0); if (first == null && n > c0) first = +t.toFixed(1); lastN = n;
  }
  try { document.getElementById('modal').classList.remove('show'); } catch (e) {}
  return { t: +t.toFixed(1), first, caught: lastN - c0, gold: Math.round(S.gold - g0), lv: S.lv, fishAvg: Math.round(fishSum / Math.max(1, steps)), maxCombo: maxCombo || 0, crits, maxTexts };
};
(async () => {
  const b = await puppeteer.connect({ browserURL: process.env.CDP_URL || 'http://localhost:9224', defaultViewport: null, protocolTimeout: 1800000 });
  const p = await b.newPage(); p.on('dialog', d => d.dismiss()); const errs = []; p.on('pageerror', e => errs.push(String(e).slice(0, 200)));
  await p.setViewport({ width: 1280, height: 720 });
  await p.goto(URL + '?t=' + Date.now(), { waitUntil: 'networkidle0' });
  await p.evaluate(() => { try { localStorage.clear(); } catch (e) {} });
  await p.goto(URL + '?t=' + Date.now(), { waitUntil: 'networkidle0' });
  if (pre) await p.evaluate(s => new Function(s)(), pre);
  const rows = []; let playT = 0;
  for (let i = 1; i <= MAXV; i++) { const v = await p.evaluate(voyage, bot); if (v.error) { rows.push(v); break; } const sh = await p.evaluate(shopFn); playT += v.t + (sh.bought.length ? 5 : 2); rows.push({ i, min: +(playT / 60).toFixed(1), ...v, bought: sh.bought.length }); }
  console.log(`[${label}/${bot}] errs=${errs.length}`);
  console.log('항해 분   첫포획s 포획 골드      Lv 화면물고기 최대콤보 크리 텍스트');
  for (const r of rows) console.log([r.i, r.min, r.first ?? '-', r.caught, r.gold, r.lv, r.fishAvg, r.maxCombo, r.crits, r.maxTexts].map((x, k) => String(x).padEnd([5, 5, 7, 5, 10, 3, 9, 8, 5, 5][k])).join(''));
  require('fs').writeFileSync(require('path').join(OUTDIR, 'early-') + label + '-' + bot + '.json', JSON.stringify(rows));
  await p.close(); b.disconnect();
})().catch(e => { console.error(e.message); process.exit(1); });
