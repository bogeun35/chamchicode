// node spec.js host ver games...  -> own metrics + spectrogram from offline renders of the game's own instruments/events (first 26s)
const fs = require('fs'), path = require('path'); const { open, close } = require('./lib');
const IMG = require('path').join(__dirname, 'out').replace(/\\/g, '/') + '/' + '';
const [HOST, VER, ...GS] = process.argv.slice(2); const LIB = fs.readFileSync(path.join(__dirname, 'page-lib2.js'), 'utf8');
(async () => {
  const S = await open(HOST, VER); const p = S.page; await p.evaluate(LIB); const res = {};
  for (const g of GS) {
    const o = await p.evaluate(async (g, VER) => {
      const SR = __B.SR, OFF = __B.OFF, info = __B.evOf(g), LEN = 26; info.len = LEN; const bs = info.bs;
      const M = (await __B.render({ bgm: 1, cue: 1, ghost: 1, hit: 1 }, true)).x, Bg = (await __B.render({ bgm: 1 }, true)).x, Cu = (await __B.render({ cue: 1 }, true)).x;
      const N = 2048, hop = 160, F = Math.floor(((LEN + OFF) * SR - N) / hop), w = new Float64Array(N); for (let i = 0; i < N; i++) w[i] = .5 - .5 * Math.cos(2 * Math.PI * i / (N - 1));
      const CT = new Float64Array(N / 2), ST = new Float64Array(N / 2); for (let k = 0; k < N / 2; k++) { CT[k] = Math.cos(-2 * Math.PI * k / N); ST[k] = Math.sin(-2 * Math.PI * k / N); }
      function fft(re, im) { const n = re.length; for (let i = 1, j = 0; i < n; i++) { let bit = n >> 1; for (; j & bit; bit >>= 1) j ^= bit; j ^= bit; if (i < j) { let t = re[i]; re[i] = re[j]; re[j] = t; t = im[i]; im[i] = im[j]; im[j] = t; } } for (let len = 2; len <= n; len <<= 1) { const step = n / len; for (let i = 0; i < n; i += len) for (let k = 0; k < len / 2; k++) { const c = CT[k * step], s = ST[k * step], x = i + k, y = x + len / 2, tr = re[y] * c - im[y] * s, ti = re[y] * s + im[y] * c; re[y] = re[x] - tr; im[y] = im[x] - ti; re[x] += tr; im[x] += ti; } } }
      function spec(x) { const out = [], re = new Float64Array(N), im = new Float64Array(N); for (let f = 0; f < F; f++) { const o0 = f * hop; for (let i = 0; i < N; i++) { re[i] = (x[o0 + i] || 0) * w[i]; im[i] = 0; } fft(re, im); const P = new Float32Array(N / 2); for (let k = 0; k < N / 2; k++) P[k] = re[k] * re[k] + im[k] * im[k]; out.push(P); } return out; }
      const fi = t => Math.round(((t + OFF) * SR - N / 2) / hop), bin = SR / N;
      const SM = spec(M), SB = spec(Bg);
      const bands = S => { let l = 0, m = 0, h = 0; const cs = []; for (const P of S) { let a = 0, b = 0, c = 0, num = 0, den = 0; for (let k = 1; k < N / 2; k++) { const fr = k * bin; if (fr < 150) a += P[k]; else if (fr < 2000) b += P[k]; else c += P[k]; num += fr * P[k]; den += P[k]; } l += a; m += b; h += c; if (den > 1e-9) cs.push(num / den); } cs.sort((x, y) => x - y); const T = l + m + h; return { lo: +(l / T * 100).toFixed(1), hi: +(h / T * 100).toFixed(1), centroidHz: Math.round(cs[cs.length >> 1]) }; };
      const flux = S => { const fl = new Float32Array(S.length); for (let f = 1; f < S.length; f++) { let s = 0; for (let k = 1; k < N / 2; k++) { const d = Math.sqrt(S[f][k]) - Math.sqrt(S[f - 1][k]); if (d > 0) s += d; } fl[f] = s; } return fl; };
      const FM = flux(SM), FB = flux(SB), med = a => { const s = a.slice().sort((x, y) => x - y); return s[s.length >> 1]; };
      const mx = (fl, t) => { let m = 0; for (let f = fi(t - .015); f <= fi(t + .015); f++) m = Math.max(m, fl[f] || 0); return m; };
      const grid = fl => { const on = [], off = []; for (let b = 8; b < LEN / bs - 1; b++) { on.push(mx(fl, b * bs)); off.push(mx(fl, (b + .375) * bs)); } return +(10 * Math.log10(med(on) / Math.max(med(off), 1e-9))).toFixed(1); };
      const lo = f => { let s = 0; for (let k = 1; k * bin < 150; k++) s += SB[f] ? SB[f][k] : 0; return s; };
      const loSus = (() => { const on = [], mid = []; for (let b = 8; b < LEN / bs - 1; b++) { let a = 0; for (let f = fi(b * bs); f <= fi(b * bs + .05); f++) a = Math.max(a, lo(f)); let c = 0, n = 0; for (let f = fi((b + .4) * bs); f <= fi((b + .6) * bs); f++) { c += lo(f); n++; } on.push(a); mid.push(c / n); } return +(10 * Math.log10(Math.max(med(mid), 1e-20) / Math.max(med(on), 1e-12))).toFixed(1); })();
      const rms = (x, t0, t1) => { const a = Math.floor((t0 + OFF) * SR), b = Math.floor((t1 + OFF) * SR); let s = 0; for (let i = a; i < b; i++) s += x[i] * x[i]; return 10 * Math.log10(Math.max(s / (b - a), 1e-20)); };
      const cues = {}; for (const e of info.ev) { if (e.bus !== 'cue' || e.cue === 'ghost' || e.t > LEN - .1) continue; (cues[e.cue] || (cues[e.cue] = [])).push(rms(Cu, e.t, e.t + .05) - rms(Bg, e.t, e.t + .05)); }
      const cueS = Object.fromEntries(Object.entries(cues).map(([k, a]) => [k, { n: a.length, min: +Math.min(...a).toFixed(1), med: +med(a).toFixed(1) }]));
      const firstNote = info.notes[0].t, countIn = []; for (let b = 0; b < Math.round(firstNote / bs); b++) countIn.push([b, +rms(M, b * bs, b * bs + .05).toFixed(0), info.ev.filter(e => Math.abs(e.t - b * bs) < .005).map(e => e.f).join('+') || '-']);
      const T1 = 20, Wc = 1600, Hc = 360, cv2 = document.createElement('canvas'); cv2.width = Wc; cv2.height = Hc + 44; const x2 = cv2.getContext('2d'); x2.fillStyle = '#000'; x2.fillRect(0, 0, Wc, Hc + 44); const img = x2.createImageData(Wc, Hc);
      const fLo = Math.log(30), fHi = Math.log(8000); let gmax = 0; for (const P of SM) for (let k = 1; k < N / 2; k++) gmax = Math.max(gmax, P[k]);
      for (let px = 0; px < Wc; px++) { const f = fi(px / Wc * T1); const P = SM[Math.max(0, Math.min(SM.length - 1, f))]; for (let py = 0; py < Hc; py++) { const fr = Math.exp(fHi - (py / Hc) * (fHi - fLo)), k = Math.max(1, Math.round(fr / bin)); const dbv = 10 * Math.log10((P[k] + 1e-20) / gmax), v = Math.max(0, Math.min(1, (dbv + 80) / 80)); const i = (py * Wc + px) * 4; img.data[i] = Math.min(255, v * 3 * 255); img.data[i + 1] = Math.max(0, Math.min(255, (v * 3 - 1) * 255)); img.data[i + 2] = Math.max(0, Math.min(255, (v * 3 - 2) * 255)); img.data[i + 3] = 255; } }
      x2.putImageData(img, 0, 0);
      const yOf = fr => (fHi - Math.log(fr)) / (fHi - fLo) * Hc; x2.fillStyle = '#fff'; x2.font = '13px sans-serif'; for (const fr of [50, 150, 500, 2000, 6000]) { x2.fillRect(0, yOf(fr), 8, 1); x2.fillText(fr + 'Hz', 10, yOf(fr) + 4); }
      for (let b = 0; b * bs < T1; b++) { const x = b * bs / T1 * Wc; x2.fillStyle = b % 4 ? '#777' : '#ddd'; x2.fillRect(x, Hc, 1, b % 4 ? 6 : 12); }
      for (const n of info.notes) if (n.t < T1) { x2.fillStyle = '#ff4040'; x2.fillRect(n.t / T1 * Wc - 1, Hc + 14, 3, 10); }
      for (const e of info.ev) if (e.bus === 'cue' && e.cue !== 'ghost' && e.t < T1) { x2.fillStyle = '#40e0ff'; x2.fillRect(e.t / T1 * Wc - 1, Hc + 26, 3, 8); }
      x2.fillStyle = '#fff'; x2.font = '15px sans-serif'; x2.fillText(g + ' ' + VER + '  0-20s mix  (ticks=beats, red=answer, cyan=cue sound)', 220, Hc + 40);
      return { bs, bandsMix: bands(SM), bandsMusic: bands(SB), gridMixDb: grid(FM), gridMusicDb: grid(FB), loSustainDb: loSus, cues: cueS, countIn, png: cv2.toDataURL('image/png') };
    }, g, VER);
    fs.writeFileSync(`${IMG}v2-final-spec-${g}-${VER}.png`, Buffer.from(o.png.split(',')[1], 'base64')); delete o.png; res[g] = o;
    console.log(VER, g, JSON.stringify(o));
  }
  fs.writeFileSync(path.join(__dirname, `spec-${VER}.json`), JSON.stringify(res, null, 1));
  console.log('errs', S.errs.slice(0, 5)); await close(S);
})().catch(e => { console.error(e); process.exit(1); });
