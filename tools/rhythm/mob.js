// mobile (iPhone 13) correct-time frames + puffer fish radius continuity
const { open, close } = require('./lib');
const IMG = require('path').join(__dirname, 'out').replace(/\\/g, '/') + '/' + '';
const raf = p => p.evaluate(() => new Promise(r => requestAnimationFrame(() => requestAnimationFrame(r))));
(async () => {
  const S = await open('127.0.0.1', 'cur', { device: 'iPhone 13' }); const p = S.page;
  for (const [g, pick] of [['sushi', "c => c.notes.find(n => n.beat > 20)"], ['gull', "c => c.notes.find(n => n.beat > 40)"]]) {
    const info = await p.evaluate((g, pick) => { rhythm.reset(); rhythm.clock('sim'); rhythm.start(g, { sim: true, force: true }); const c = rhythm.chart(g), n = eval(pick)(c); rhythm.advance(n.t - .12 - rhythm.state().songT); const v0 = (rhythm.visual() || []).filter(v => v.id === n.id); rhythm.advance(.12); const v = (rhythm.visual() || []).filter(v => v.id === n.id); return { view: rhythm.view(), id: n.id, v0, v }; }, g, pick);
    await raf(p); const f = `${IMG}v2-final-mobile-${g}-at.png`; await p.screenshot({ path: f }); console.log(f, JSON.stringify(info));
  }
  const puf = await p.evaluate(() => {
    rhythm.reset(); rhythm.clock('sim'); rhythm.start('puffer', { sim: true, force: true }); const c = rhythm.chart('puffer');
    for (const n of c.notes) { rhythm.input('bot', 'down', n.t); rhythm.input('bot', 'up', n.relT); }
    const out = []; let prev = null, maxJump = 0, where = null;
    const end = c.notes[c.notes.length - 1].relT + 1; let s = rhythm.state().songT;
    while (s < end) { rhythm.advance(1 / 60); s = rhythm.state().songT; const f = (rhythm.visual() || []).find(v => v.kind === 'fish'); if (f && prev != null) { const d = Math.abs(f.R - prev); if (d > maxJump) { maxJump = d; where = { t: +s.toFixed(3), from: +prev.toFixed(1), to: +f.R.toFixed(1), st: f.st }; } } prev = f ? f.R : null; }
    return { maxJump: +maxJump.toFixed(1), where };
  });
  console.log('puffer fish radius max 1-frame jump (60fps, perfect play):', JSON.stringify(puf));
  console.log('errs', S.errs); await close(S);
})().catch(e => { console.error(e); process.exit(1); });
