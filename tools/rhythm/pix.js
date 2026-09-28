// note-specific pixel timeline: render(s) with note vs with the note pushed 1000 beats away. Works on both versions (no hooks).
const fs = require('fs'); const { open, close } = require('./lib');
const [HOST, VER] = process.argv.slice(2);
(async () => {
  const S = await open(HOST, VER); const p = S.page; const out = {};
  for (const g of ['sushi', 'salute', 'puffer', 'gull']) {
    out[g] = await p.evaluate((g) => {
      rhythm.reset(); rhythm.clock('sim'); rhythm.start(g, { sim: true, force: true });
      const c = rhythm.chart(g), bs = c.beatSec;
      rhythm.advance(2 * bs);
      const Wd = cv.width, Hd = cv.height;
      const grab = () => X.getImageData(0, 0, Wd, Hd).data;
      const taps = run.notes.filter(n => n.kind !== 'hold' || true).filter(n => n.t > 12 * bs && n.t < c.lengthSec - 4 * bs);
      const pick = [taps[2], taps[Math.floor(taps.length / 3)], taps[Math.floor(taps.length / 2)], taps[Math.floor(taps.length * .75)]].filter(Boolean);
      const F = ['t', 'beat', 'cueBeat', 'relT', 'relBeat'];
      const res = [];
      for (const n of pick) {
        const shift = on => { for (const f of F) if (typeof n[f] === 'number') n[f] += on ? 1000 * (f.includes('eat') ? 1 : bs) : -1000 * (f.includes('eat') ? 1 : bs); if (n.win) { n.win = n.win.map(x => x + (on ? 1000 * bs : -1000 * bs)); } };
        const t = n.t, dt = 1 / 120, prof = []; let prevWith = null, prevMask = null;
        for (let s = t - 2.6 * bs; s <= t + .06; s += dt) {
          simT = s; render(); const A = grab().slice();
          shift(true); simT = s; render(); const B = grab(); shift(false);
          const mask = new Uint8Array(Wd * Hd); let area = 0;
          for (let i = 0, k = 0; i < A.length; i += 4, k++) { if (Math.abs(A[i] - B[i]) + Math.abs(A[i + 1] - B[i + 1]) + Math.abs(A[i + 2] - B[i + 2]) > 30) { mask[k] = 1; area++; } }
          let chg = 0;
          if (prevWith) for (let i = 0, k = 0; i < A.length; i += 4, k++) { if ((mask[k] || prevMask[k]) && Math.abs(A[i] - prevWith[i]) + Math.abs(A[i + 1] - prevWith[i + 1]) + Math.abs(A[i + 2] - prevWith[i + 2]) > 30) chg++; }
          prof.push([+(((s - t) / bs)).toFixed(3), area, chg]); prevWith = A; prevMask = mask;
        }
        res.push({ id: n.id, cue: n.cue, kind: n.kind, cueGap: +(n.beat - n.cueBeat).toFixed(3), prof });
      }
      return { bs, res };
    }, g);
    const o = out[g];
    for (const r of o.res) {
      const P = r.prof, first = P.find(x => x[1] > 50);
      const pre = P.filter(x => x[0] <= 0.021);
      // biggest single-frame change at or before t (+20ms)
      const top = pre.slice(1).sort((a, b) => b[2] - a[2]).slice(0, 3).map(x => `${x[0]}b:${x[2]}px`);
      const nearT = P.filter(x => Math.abs(x[0] * o.bs) <= .012).map(x => x[2]);
      const moving = P.filter(x => x[0] > -0.9 && x[0] < -0.1 && x[2] > 30).length, win = P.filter(x => x[0] > -0.9 && x[0] < -0.1).length;
      console.log(VER, g, 'id', r.id, r.cue, 'cueGap', r.cueGap, 'firstAppear', first ? first[0] + 'b' : 'none', 'top changes', top.join(' '), 'change at t(±12ms)', Math.max(...nearT), 'frames moving in last beat', moving + '/' + win, 'area@t', (P.find(x => x[0] >= 0) || [])[1]);
    }
  }
  fs.writeFileSync(__dirname + '/pix-' + VER + '.json', JSON.stringify(out));
  console.log('errs', S.errs.slice(0, 5)); await close(S);
})().catch(e => { console.error(e); process.exit(1); });
