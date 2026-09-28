// 사람 흉내 봇 3종 x 5곡 x 시드 10 + 꼼수 봇 (검수자 자체 구현)
const fs = require('fs');
const { open, close } = require('./lib');
const G = ['sushi', 'salute', 'puffer', 'gull', 'remix'];
(async () => {
  const [HOST, VER] = process.argv.slice(2); const S = await open(HOST, VER); const p = S.page;
  await p.evaluate(() => {
    window.__rng = seed => () => { seed |= 0; seed = seed + 0x6D2B79F5 | 0; let t = Math.imul(seed ^ seed >>> 15, 1 | seed); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; };
    window.__gauss = rnd => { let u = 0, v = 0; while (u === 0) u = rnd(); while (v === 0) v = rnd(); return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v); };
    window.__play = (g, plan) => {
      rhythm.reset(); rhythm.clock('sim'); const ok = rhythm.start(g, { sim: true, force: true }); if (ok !== true) return { err: ok };
      const c = rhythm.chart(g); const ev = plan(c);
      ev.sort((a, b) => a.at - b.at);
      for (const e of ev) if (e.at > 0) rhythm.input('bot', e.ph, e.at);
      rhythm.advance(c.lengthSec + 1.5);
      let st = rhythm.state(); let guard = 0; while (st.scene !== 'result' && guard++ < 20) { rhythm.advance(1); st = rhythm.state(); }
      const r = rhythm.result(); return { score: r.score, grade: r.grade, counts: r.counts, stray: r.stray, scene: st.scene };
    };
    const PROF = { novice: { b: .025, sd: .060, miss: .10, stray: 3 }, normal: { b: .015, sd: .040, miss: .05, stray: 1 }, skilled: { b: .005, sd: .022, miss: .01, stray: 0 } };
    window.__human = (g, prof, seed) => __play(g, c => {
      const P = PROF[prof], rnd = __rng(seed * 7919 + g.length * 131), ev = [];
      for (const n of c.notes) {
        if (rnd() < P.miss) continue;
        const pt = n.t + P.b + P.sd * __gauss(rnd); ev.push({ at: pt, ph: 'down' });
        if (n.kind === 'hold') { const rt = Math.max(pt + .05, n.relT + P.b + P.sd * __gauss(rnd)); ev.push({ at: rt, ph: 'up' }); }
        else ev.push({ at: pt + .07, ph: 'up' });
      }
      // 헛누름: 첫 음~끝 음 사이, 모든 음·속임수 창·길게 누름 구간에서 떨어진 곳
      const t0 = c.notes[0].t, t1 = c.notes[c.notes.length - 1].t; let k = 0, guard = 0;
      while (k < P.stray && guard++ < 5000) {
        const x = t0 + rnd() * (t1 - t0);
        if (c.notes.some(n => Math.abs(n.t - x) < .25 || (n.kind === 'hold' && x > n.t - .25 && x < n.relT + .25))) continue;
        if (c.fakeList.some(f => x > f.win[0] - .05 && x < f.win[1] + .05)) continue;
        ev.push({ at: x, ph: 'down' }, { at: x + .07, ph: 'up' }); k++;
      }
      return ev;
    });
    window.__perfect = g => __play(g, c => { const ev = []; for (const n of c.notes) { ev.push({ at: n.t, ph: 'down' }); ev.push({ at: n.kind === 'hold' ? n.relT : n.t + .07, ph: 'up' }); } return ev; });
    window.__none = g => __play(g, c => []);
    window.__mash = (g, rate, seed) => __play(g, c => { const rnd = __rng(seed), ev = []; let t = .2; while (t < c.lengthSec) { t += -Math.log(1 - rnd()) / rate; ev.push({ at: t, ph: 'down' }, { at: t + .06, ph: 'up' }); } return ev; });
    window.__grid = (g, step, phase, hold) => __play(g, c => { const ev = []; for (let b = phase; b * c.beatSec < c.lengthSec; b += step) { const t = b * c.beatSec; ev.push({ at: t, ph: 'down' }, { at: t + (hold ? step * c.beatSec * .9 : .06), ph: 'up' }); } return ev; });
  });
  const res = { human: {}, cheat: {} };
  for (const prof of ['novice', 'normal', 'skilled']) for (const g of G) {
    const a = await p.evaluate((g, prof) => { const o = []; for (let s = 1; s <= 10; s++) o.push(__human(g, prof, s)); return o; }, g, prof);
    res.human[prof + ':' + g] = a;
    const sc = a.map(x => x.score), m = sc.reduce((x, y) => x + y, 0) / sc.length;
    console.log(`${(prof + ':' + g).padEnd(16)} mean ${m.toFixed(1).padStart(5)} min ${String(Math.min(...sc)).padStart(3)} max ${String(Math.max(...sc)).padStart(3)} 60+ ${sc.filter(x => x >= 60).length}/10 80+ ${sc.filter(x => x >= 80).length}/10 [${sc.join(',')}]`);
  }
  for (const g of G) {
    const c = await p.evaluate((g) => ({ perfect: __perfect(g).score, none: __none(g).score,
      mash2: Math.max(...[1, 2, 3].map(s => __mash(g, 2, s).score)), mash4: Math.max(...[1, 2, 3].map(s => __mash(g, 4, s).score)), mash8: Math.max(...[1, 2, 3].map(s => __mash(g, 8, s).score)),
      q: __grid(g, 1, 0), e8: __grid(g, .5, 0), q_off: __grid(g, 1, .5), s16: __grid(g, .25, 0), qHold: __grid(g, 1, 0, true) }), g);
    for (const k of ['q', 'e8', 'q_off', 's16', 'qHold']) c[k] = c[k].score;
    res.cheat[g] = c; console.log('cheat', g.padEnd(7), JSON.stringify(c));
  }
  fs.writeFileSync(__dirname + '/bots-' + VER + '.json', JSON.stringify(res, null, 1));
  console.log('errs', S.errs); await close(S);
})().catch(e => { console.error(e); process.exit(1); });
