const { open, close } = require('./lib');
const IMG = require('path').join(__dirname, 'out').replace(/\\/g, '/') + '/' + '';
const raf = p => p.evaluate(() => new Promise(r => requestAnimationFrame(() => requestAnimationFrame(r))));
const [HOST, VER] = process.argv.slice(2);
const plan = [['sushi', "c => c.notes.find(n => n.cue === 'tok' && n.beat > 20)"], ['salute', 'c => c.notes.find(n => n.beat > 30)'], ['puffer', 'c => c.notes[2]'], ['gull', 'c => c.notes.find(n => n.beat > 40)'],
  ['remix', "c => c.notes.find(n => n.zone === 'sushi' && n.beat > 16)"], ['remix', "c => c.notes.find(n => n.zone === 'puffer')"], ['remix', "c => c.notes.find(n => n.zone === 'gull')"]];
(async () => {
  const S = await open(HOST, VER); const p = S.page; let i = 0;
  for (const [g, pick] of plan) {
    for (const o of [-.5, 0]) {
      const info = await p.evaluate((g, pick, o) => {
        rhythm.reset(); rhythm.clock('sim'); rhythm.start(g, { sim: true, force: true });
        const c = rhythm.chart(g), n = eval(pick)(c); if (!n) return null; const tt = n.t + o * c.beatSec;
        rhythm.advance(tt - rhythm.state().songT);
        return { id: n.id, cue: n.cue, zone: n.zone, beat: n.beat, t: +n.t.toFixed(3), songT: rhythm.state().songT };
      }, g, pick, o);
      await raf(p);
      const f = `${IMG}v2-final-${VER}-${g}-${i}-${o === 0 ? 'at' : 'half'}.png`;
      if (info) await p.screenshot({ path: f });
      console.log(f, JSON.stringify(info));
    }
    i++;
  }
  console.log('errs', S.errs); await close(S);
})().catch(e => { console.error(e); process.exit(1); });
