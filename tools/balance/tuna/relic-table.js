const f = process.argv[2]; const r = require(require('path').resolve(f));
const unl = m => { const x = r.milestones.find(x => x.what === '어장 해금 → ' + m); return x ? x.min : null; };
const byT = [[], [], []]; for (const id in r.firstR) byT[r.firstR[id].t].push(r.firstR[id].min);
const need = [6, 7, 7], out = [];
for (let t = 0; t < 3; t++) { const a = byT[t].sort((x, y) => x - y); out.push({ tier: t, n: a.length + '/' + need[t], first: a[0] ?? '-', all: a.length === need[t] ? a[a.length - 1] : '-', times: a.join(',') }); }
const src = {}; for (const x of r.relicLog) { const k = x.src + (x.neu ? '(새)' : ''); src[k] = (src[k] || 0) + 1; }
console.log(f, 'clear', r.cleared ? r.playMin : 'X(' + r.playMin + ')', 'map2', unl(2), 'map4', unl(4), 'map5', unl(5), 'errs', r.errs.length);
for (const o of out) console.log(' ', JSON.stringify(o));
console.log('  src', JSON.stringify(src));
const at = m => { const x = r.rlog.filter(z => z.min <= m).pop(); return x ? x.rgold : '-'; }; console.log('  rgold 10/20/30/45/60', [10, 20, 30, 45, 60].map(at).join(' / '));
