const { open, close } = require('./lib');
(async () => {
  const [HOST, VER] = process.argv.slice(2); const S = await open(HOST, VER); const p = S.page;
  const out = await p.evaluate(() => {
    const rng = seed => () => { seed |= 0; seed = seed + 0x6D2B79F5 | 0; let t = Math.imul(seed ^ seed >>> 15, 1 | seed); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; };
    const gauss = rnd => { let u = 0, v = 0; while (u === 0) u = rnd(); while (v === 0) v = rnd(); return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v); };
    const PROF = { perfect: { b: 0, sd: 0, miss: 0 }, novice: { b: .025, sd: .06, miss: .1 }, late: { b: .2, sd: 0, miss: 0 }, none: { b: 0, sd: 0, miss: 1 } };
    const res = {};
    for (const g of ['sushi', 'salute', 'puffer', 'gull']) for (const prof of ['perfect', 'novice', 'late', 'none']) {
      rhythm.reset(); rhythm.clock('sim'); rhythm.start(g, { sim: true, force: true, practice: true });
      const P = PROF[prof], rnd = rng(42), q = new Set(), log = [];
      let lastSi = -1, lastDone = 0, lastLoops = 0, t = 0, skipShown0 = null;
      skipShown0 = rhythm._run && typeof canSkipPractice === 'function' ? canSkipPractice() : null;
      let stT = 0;
      while (t < 400) {
        const r = rhythm._run; if (!r) break; const st = rhythm.state();
        if (st.scene !== 'practice') { log.push({ end: st.scene, at: +st.songT.toFixed(1) }); break; }
        const pr = r.pr;
        if (pr.si !== lastSi) { if (lastSi >= 0) log.push({ stage: lastSi + 1, need: pr.stages[lastSi].need, done: lastDone, loops: lastLoops, sec: +(st.songT - stT).toFixed(1) }); lastSi = pr.si; stT = st.songT; }
        lastDone = pr.done; lastLoops = pr.loops;
        if (pr.finished && !log.some(x => x.fin)) log.push({ fin: true, stage: pr.si + 1, need: pr.stages[pr.si].need, done: lastDone, loops: lastLoops, sec: +(st.songT - stT).toFixed(1) });
        for (const n of r.notes) if (!q.has(n.id)) { q.add(n.id); if (rnd() < P.miss) continue; const pt = n.t + P.b + P.sd * gauss(rnd); rhythm.input('bot', 'down', pt); rhythm.input('bot', 'up', n.kind === 'hold' ? Math.max(pt + .05, n.relT + P.b + P.sd * gauss(rnd)) : pt + .07); }
        rhythm.advance(.05); t += .05;
      }
      res[g + ':' + prof] = { skipBtnAtStart: skipShown0, totalSec: +t.toFixed(1), log };
    }
    return res;
  });
  for (const k in out) console.log(k.padEnd(16), 'skip@0', out[k].skipBtnAtStart, 'total', out[k].totalSec, JSON.stringify(out[k].log));
  console.log('errs', S.errs); await close(S);
})();
