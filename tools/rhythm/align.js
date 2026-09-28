// 정렬 실측: 정답 음마다 링 반지름이 과녁 반지름에 닿는 시각 - 정답 시각, 따라해 막대가 점 가운데를 지나는 시각 - 정답 시각
const fs = require('fs');
const { open, close } = require('./lib');
const G = (process.argv[2] || 'sushi,salute,puffer,gull,remix').split(',');
(async () => {
  const S = await open(process.argv[3] || '127.0.0.1', 'cur');
  const all = {};
  for (const g of G) {
    const res = await S.page.evaluate((g) => {
      rhythm.reset(); rhythm.clock('sim'); rhythm.start(g, { sim: true, force: true });
      const c = rhythm.chart(g), out = [], miss = [];
      // 완벽 입력 예약(속임수는 누르지 않음)
      for (const n of c.notes) { rhythm.input('bot', 'down', n.t); if (n.kind === 'hold') rhythm.input('bot', 'up', n.relT); else rhythm.input('bot', 'up', n.t + .06); }
      const ev = [];
      for (const n of c.notes) { ev.push({ n, t: n.t, ph: 'press' }); if (n.kind === 'hold') ev.push({ n, t: n.relT, ph: 'release' }); }
      ev.sort((a, b) => a.t - b.t);
      let cur = rhythm.state().songT;
      const W = rhythm.view();
      for (const e of ev) {
        const t0 = e.t - .06; if (t0 > cur) { rhythm.advance(t0 - cur); cur = rhythm.state().songT; }
        const kind = e.ph === 'release' ? 'release' : 'ring';
        let cross = null, first = null, atT = null, samples = [], ph = null, phCross = null, pts = [];
        for (let ms = -60; ms <= 25; ms++) {
          const s = e.t + ms / 1000, V = rhythm.visual(s) || [];
          const v = V.find(q => q.kind === kind && q.id === e.n.id);
          if (v) { if (first == null) first = v; if (ms <= -1) pts.push([s, v.rr - v.R]); if (cross == null && v.rr <= v.R * 1.0005) cross = ms; if (ms === 0) atT = v; }
          if (g === 'salute' || (g === 'remix' && e.n.zone === 'salute')) { const p = V.find(q => q.kind === 'playhead' && q.resp); if (p && e.n.cell != null) { const dot = p.x0 + (e.n.cell + .5) * p.cw; if (phCross == null && p.x >= dot - 1e-6) phCross = ms; } }
        }
        // 링 선형 외삽: rr-R = a*(s)+b → 0 인 s
        let ext = null; if (pts.length >= 2) { const [s1, d1] = pts[0], [s2, d2] = pts[pts.length - 1]; const a = (d2 - d1) / (s2 - s1); if (a < 0) ext = ((s1 - d1 / a) - e.t) * 1000; }
        // 속도 일정: 세 점 기울기 비교
        let lin = null; if (pts.length >= 3) { const m = Math.floor(pts.length / 2); const a1 = (pts[m][1] - pts[0][1]) / (pts[m][0] - pts[0][0]), a2 = (pts[pts.length - 1][1] - pts[m][1]) / (pts[pts.length - 1][0] - pts[m][0]); lin = +(Math.abs(a1 - a2) / Math.abs(a1) * 100).toFixed(3); }
        if (!atT) { miss.push({ id: e.n.id, ph: e.ph, cue: e.n.cue, zone: e.n.zone, t: +e.t.toFixed(3) }); continue; }
        const onScreen = atT.x >= 0 && atT.x <= 1280 && atT.y >= 0 && atT.y <= 720;
        out.push({ id: e.n.id, ph: e.ph, cue: e.n.cue, zone: e.n.zone || null, t: +e.t.toFixed(4), cross, ext: ext == null ? null : +ext.toFixed(2), lin, show: atT.show, flash: atT.flash, x: +atT.x.toFixed(1), y: +atT.y.toFixed(1), R: atT.R, leadBeats: +((atT.t - atT.cT) / c.beatSec).toFixed(3), cueGapBeats: +(e.n.beat - e.n.cueBeat).toFixed(3), onScreen, phCross });
      }
      return { out, miss, beatSec: c.beatSec, view: W, orient: W.orientation };
    }, g);
    all[g] = res;
    const d = res.out.map(o => o.ext).filter(x => x != null), cr = res.out.map(o => o.cross).filter(x => x != null);
    const mean = a => a.reduce((x, y) => x + y, 0) / a.length;
    const ph = res.out.map(o => o.phCross).filter(x => x != null);
    console.log(g, 'targets', res.out.length, 'noRing', res.miss.length, 'ext mean', mean(d).toFixed(2), 'max|', Math.max(...d.map(Math.abs)).toFixed(2), 'cross(1ms) mean', mean(cr).toFixed(2), 'max|', Math.max(...cr.map(Math.abs)), 'hidden@t', res.out.filter(o => !o.show).length, 'offscreen', res.out.filter(o => !o.onScreen).length, 'nonlin%max', Math.max(...res.out.map(o => o.lin || 0)),
      'lead', JSON.stringify([...new Set(res.out.map(o => o.cue + ':' + o.ph + ':' + o.leadBeats))]), ph.length ? 'playhead mean ' + mean(ph).toFixed(2) + ' max| ' + Math.max(...ph.map(Math.abs)) + ' n=' + ph.length : '');
    if (res.miss.length) console.log('  NO RING:', JSON.stringify(res.miss.slice(0, 20)));
  }
  fs.writeFileSync(__dirname + '/align-cur.json', JSON.stringify(all, null, 1));
  console.log('errs', S.errs);
  await close(S);
})().catch(e => { console.error(e); process.exit(1); });
