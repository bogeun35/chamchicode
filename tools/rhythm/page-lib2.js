// injected into rhythm page. Works on new build (auChain/playEv(now)/duck) and legacy (before) build.
window.__B = (() => {
  const SR = 32000, OFF = 0.05, NEW = typeof auChain === 'function';
  function fft(re, im) {
    const n = re.length;
    for (let i = 1, j = 0; i < n; i++) { let bit = n >> 1; for (; j & bit; bit >>= 1) j ^= bit; j ^= bit; if (i < j) { [re[i], re[j]] = [re[j], re[i]]; [im[i], im[j]] = [im[j], im[i]]; } }
    for (let len = 2; len <= n; len <<= 1) { const ang = -2 * Math.PI / len, wr = Math.cos(ang), wi = Math.sin(ang);
      for (let i = 0; i < n; i += len) { let cr = 1, ci = 0; for (let k = 0; k < len / 2; k++) { const a = i + k, b = a + len / 2, tr = re[b] * cr - im[b] * ci, ti = re[b] * ci + im[b] * cr; re[b] = re[a] - tr; im[b] = im[a] - ti; re[a] += tr; im[a] += ti; const nr = cr * wr - ci * wi; ci = cr * wi + ci * wr; cr = nr; } } }
  }
  function stft(x, N, hop) {
    const win = new Float64Array(N); for (let i = 0; i < N; i++) win[i] = .5 - .5 * Math.cos(2 * Math.PI * i / (N - 1));
    const frames = Math.floor((x.length - N) / hop) + 1, half = N / 2, out = [], re = new Float64Array(N), im = new Float64Array(N);
    for (let f = 0; f < frames; f++) { const o = f * hop; for (let i = 0; i < N; i++) { re[i] = x[o + i] * win[i]; im[i] = 0; } fft(re, im); const p = new Float32Array(half); for (let k = 0; k < half; k++) p[k] = re[k] * re[k] + im[k] * im[k]; out.push(p); }
    return { frames: out, N, hop, tc: f => (f * hop + N / 2) / SR - OFF };
  }
  let INFO = null;
  function evOf(id) {
    rhythm.reset(); rhythm.clock('sim'); const ok = rhythm.start(id, { sim: true, force: true }); if (ok !== true) throw new Error(ok);
    const r = rhythm._run;
    INFO = { id, r, ev: r.ev.slice(), bs: r.bs, len: r.len, notes: r.notes.map(n => ({ ...n })), cues: r.ev.filter(e => e.bus === 'cue' && e.cue !== 'ghost').map(e => ({ t: e.t, beat: e.beat, cue: e.cue, f: e.f })) };
    return INFO;
  }
  const HITL = { sushi: n => n.big ? ['chuck_big', 'sparkle'] : ['chuck', 'sparkle'], salute: () => ['nep'], puffer: () => ['pp'], gull: () => ['ching_puck', 'sparkle'] };
  const zoneOf = n => INFO.id === 'remix' ? n.zone : INFO.id;
  // sel: { bgm, cue, ghost, hit } audible parts. hits: process perfect-bot player sounds (ducks apply even if muted)
  async function render(sel, hits) {
    const info = INFO, sec = info.len + 1.2, oc = new OfflineAudioContext(1, Math.ceil(SR * (sec + OFF + 1.5)), SR);
    const keys = ['ctx', 'noise', 'ends', 'bgm', 'cue', 'sfx', 'bgmComp', 'hold', 'duck', 'lim', 'master', 'comp', 'offline'], save = {}; keys.forEach(k => save[k] = AU[k]);
    AU.ctx = oc; AU.ends = [];
    const len = Math.floor(SR * 1.5), nb = oc.createBuffer(1, len, SR), d = nb.getChannelData(0); let seed = 12345; for (let i = 0; i < len; i++) { seed = (seed * 1103515245 + 12345) & 0x7fffffff; d[i] = seed / 0x3fffffff - 1; } AU.noise = nb;
    if (NEW) { Object.assign(AU, auChain(oc)); const v = volTargets(); AU.bgm.gain.value = v.bgm; AU.cue.gain.value = v.cue; AU.sfx.gain.value = v.sfx; AU.offline = true; }
    else { const c = oc.createDynamicsCompressor(); c.threshold.value = -10; c.knee.value = 10; c.ratio.value = 4; c.attack.value = .003; c.release.value = .12; const m = oc.createGain(); m.gain.value = .9; c.connect(m); m.connect(oc.destination);
      AU.bgm = oc.createGain(); AU.bgm.gain.value = .6 * .9; AU.cue = oc.createGain(); AU.cue.gain.value = .8 * .9; AU.sfx = oc.createGain(); AU.sfx.gain.value = .8; [AU.bgm, AU.cue, AU.sfx].forEach(g => g.connect(c)); }
    const mute = oc.createGain(); mute.gain.value = 0; mute.connect(oc.destination); const ps = oc.createGain(); const MK = NEW && typeof mixOf === 'function' ? mixOf(info.id) : { bgm: 1, cue: 1, hit: 1 }; ps.gain.value = NEW && typeof PLAYER_K === 'number' ? PLAYER_K * MK.hit : 1; ps.connect(AU.sfx); const pb = oc.createGain(); pb.gain.value = MK.bgm; pb.connect(AU.bgm); const pc = oc.createGain(); pc.gain.value = MK.cue; pc.connect(AU.cue);
    const fr = { real: true, sim: false, t0: OFF, bs: info.bs, dropped: 0, slog: [], game: info.id, barChord: info.r.barChord, horn: null, bus: null };
    const busFor = e => { if (sel.f) return sel.f.includes(e.f) && (!sel.onlyBgm || e.bus !== 'cue') ? { bgm: pb, cue: pc, sfx: AU.sfx } : { bgm: mute, cue: mute, sfx: mute }; const k = e.bus === 'cue' ? (e.cue === 'ghost' ? 'ghost' : 'cue') : 'bgm'; return sel[k] ? { bgm: pb, cue: pc, sfx: AU.sfx } : { bgm: mute, cue: mute, sfx: mute }; };
    const items = info.ev.map(e => ({ t: e.t, e }));
    if (hits) for (const n of info.notes) { items.push({ t: n.t, hit: n, ph: 'press' }); if (n.relT != null) items.push({ t: n.relT, hit: n, ph: 'release' }); }
    items.sort((a, b) => a.t - b.t);
    const oR = Math.random, oT = window.setTimeout; let rs = 777; Math.random = () => { rs = (rs * 16807) % 2147483647; return rs / 2147483647; }; window.setTimeout = () => 0;
    let dropped = 0;
    try {
      for (const it of items) {
        if (it.t > sec) break; const at = it.t + OFF, now = at - .06;
        if (it.e) {
          const e = it.e;
          if (NEW) { fr.bus = busFor(e); playEv(fr, e, at, now); }
          else { if (!e.cue && AU.ends.filter(x => x > now).length >= 48) { dropped++; continue; } const b = busFor(e); try { I[e.f](e.bus === 'cue' ? b.cue : b.bgm, at, e.a); } catch (err) {} }
          continue;
        }
        const n = it.hit, z = zoneOf(n), dest = sel.hit ? ps : mute;
        fr.bus = sel.hit ? { bgm: AU.bgm, cue: AU.cue, sfx: ps } : { bgm: mute, cue: mute, sfx: mute };
        const play = (nm, a) => { if (NEW) playerDuck(at); try { I[nm](dest, at, a || {}); } catch (err) {} };
        if (z === 'puffer') {
          if (NEW) { if (it.ph === 'press') hornStart(fr, n, pufferPitch(fr, n.beat), n.t); else { hornStop(fr, 'ok', n.relT); play('sparkle'); } }
          else if (it.ph === 'press') play('pp', { f: mtof(62) }); else play('sparkle');
          continue;
        }
        if (it.ph !== 'press') continue;
        const ch = z === 'gull' ? gullChord(fr, n.beat) : undefined;
        for (const nm of HITL[z](n)) play(nm, nm === 'ching_puck' ? { ns: ch } : undefined);
      }
    } finally { Math.random = oR; window.setTimeout = oT; }
    const buf = await oc.startRendering();
    keys.forEach(k => AU[k] = save[k]);
    return { x: buf.getChannelData(0).slice(0, Math.ceil(SR * (sec + OFF))), dropped: NEW ? fr.dropped : dropped };
  }
  const rms = (x, a, b) => { a = Math.max(0, Math.floor(a)); b = Math.min(x.length, Math.floor(b)); let s = 0; for (let i = a; i < b; i++) s += x[i] * x[i]; return Math.sqrt(s / Math.max(1, b - a)); };
  const db = v => 20 * Math.log10(Math.max(v, 1e-9));
  function bands(x) { const S = stft(x, 1024, 512), bin = SR / 1024; let lo = 0, mid = 0, hi = 0; for (const p of S.frames) for (let k = 1; k < p.length; k++) { const f = k * bin; if (f < 150) lo += p[k]; else if (f < 2000) mid += p[k]; else hi += p[k]; } const T = lo + mid + hi || 1; return { lo: +(lo / T * 100).toFixed(1), mid: +(mid / T * 100).toFixed(1), hi: +(hi / T * 100).toFixed(1) }; }
  function flux(x) { const N = 1024, hop = 220, S = stft(x, N, hop), F = S.frames.length, all = new Float32Array(F); for (let f = 1; f < F; f++) { const p = S.frames[f], q = S.frames[f - 1]; let a = 0; for (let k = 1; k < p.length; k++) { const dd = Math.sqrt(p[k]) - Math.sqrt(q[k]); if (dd > 0) a += dd; } all[f] = a; } return { all, tc: S.tc, hop, S }; }
  function peaks(o, tc, hopS) { const F = o.length, w = Math.round(.03 / hopS), W = Math.round(.5 / hopS), res = []; let mean = 0; for (let i = 0; i < F; i++) mean += o[i]; mean /= F;
    for (let i = w; i < F - w; i++) { let mx = true; for (let j = i - w; j <= i + w; j++) if (o[j] > o[i]) { mx = false; break; } if (!mx) continue; const seg = Array.from(o.slice(Math.max(0, i - W), Math.min(F, i + W))).sort((a, b) => a - b), med = seg[seg.length >> 1]; if (o[i] > med + .5 * mean && o[i] > .15 * mean) res.push({ t: tc(i), v: o[i] }); }
    return res; }
  function bandDb(S, t0, t1, f0, f1) { const bin = SR / S.N; let e = 0; const a = Math.max(0, Math.floor(((t0 + OFF) * SR - S.N / 2) / S.hop)), b = Math.min(S.frames.length - 1, Math.ceil(((t1 + OFF) * SR - S.N / 2) / S.hop)); for (let f = a; f <= b; f++) { const p = S.frames[f]; for (let k = 1; k < p.length; k++) { const fr = k * bin; if (fr >= f0 && fr < f1) e += p[k]; } } return 10 * Math.log10(e + 1e-12); }
  function spectroPNG(x, sec, bs, title, cuesT, notesT) {
    const Wd = 1500, Hd = 420, S = stft(x, 2048, 441), cv = document.createElement('canvas'); cv.width = Wd; cv.height = Hd + 60; const g = cv.getContext('2d');
    g.fillStyle = '#111'; g.fillRect(0, 0, Wd, Hd + 60);
    const fmin = 40, fmax = 16000, bin = SR / 2048, F = S.frames.length, img = g.createImageData(Wd, Hd);
    let mx = 0; for (const p of S.frames) for (let k = 0; k < p.length; k++) if (p[k] > mx) mx = p[k];
    for (let px = 0; px < Wd; px++) { const t = px / Wd * sec, f = Math.min(F - 1, Math.max(0, Math.round((t + OFF) * SR / 441 - 2048 / 2 / 441))); const p = S.frames[f];
      for (let py = 0; py < Hd; py++) { const fr = fmin * Math.pow(fmax / fmin, 1 - py / Hd), k = Math.round(fr / bin), v = 10 * Math.log10((p[k] + 1e-12) / mx), n = Math.max(0, Math.min(1, (v + 80) / 80));
        const i = (py * Wd + px) * 4; img.data[i] = Math.round(255 * Math.min(1, n * 1.8)); img.data[i + 1] = Math.round(255 * Math.max(0, n * 1.6 - .6)); img.data[i + 2] = Math.round(255 * Math.max(0, .6 - n) * (n > .05 ? 1 : .3) + (n > .9 ? 255 * (n - .9) * 10 : 0)); img.data[i + 3] = 255; } }
    g.putImageData(img, 0, 0); g.font = '12px sans-serif';
    for (const fr of [50, 100, 150, 300, 1000, 2000, 5000, 10000]) { const y = Hd * (1 - Math.log(fr / fmin) / Math.log(fmax / fmin)); g.fillStyle = fr === 150 || fr === 2000 ? '#0ff' : '#888'; g.fillRect(0, y, Wd, fr === 150 || fr === 2000 ? 1 : .5); g.fillText(fr >= 1000 ? fr / 1000 + 'k' : fr, 4, y - 2); }
    g.fillStyle = '#ccc'; for (let b = 0; b * bs < sec; b++) { const X = b * bs / sec * Wd; g.fillStyle = b % 4 === 0 ? '#fff' : '#666'; g.fillRect(X, Hd, 1, b % 4 === 0 ? 14 : 7); if (b % 4 === 0) g.fillText(String(b / 4 + 1), X + 2, Hd + 24); }
    g.fillStyle = '#ff4040'; for (const t of cuesT) if (t < sec) g.fillRect(t / sec * Wd - 1, Hd + 30, 3, 10);
    g.fillStyle = '#40ff40'; for (const t of notesT) if (t < sec) g.fillRect(t / sec * Wd - 1, Hd + 42, 3, 10);
    g.fillStyle = '#fff'; g.font = '14px sans-serif'; g.fillText(title + '   (빨강=큐, 초록=정답, 숫자=마디, 청록선=150Hz/2kHz)', 200, Hd + 58);
    return cv.toDataURL('image/png');
  }
  async function stems() { const info = INFO, names = [...new Set(info.ev.map(e => e.f))], out = {}; const band = x => { const S = stft(x, 1024, 512), bin = SR / 1024; let lo = 0, mid = 0, hi = 0; for (const p of S.frames) for (let k = 1; k < p.length; k++) { const f = k * bin; if (f < 150) lo += p[k]; else if (f < 2000) mid += p[k]; else hi += p[k]; } return [lo, mid, hi]; };
    const tot = band((await render({ bgm: 1, cue: 1, ghost: 1, hit: 1 }, true)).x); out._total = tot.map(v => +v.toExponential(2));
    for (const nm of names) { const b = band((await render({ f: [nm] }, true)).x); out[nm] = b.map((v, i) => +(v / (tot[0] + tot[1] + tot[2]) * 100).toFixed(2)); }
    const b = band((await render({ f: [], hit: 1 }, true)).x); out._hit = b.map(v => +(v / (tot[0] + tot[1] + tot[2]) * 100).toFixed(2)); return out; }
  function tuneEval(st, cands) {
    const info = INFO, bs = info.bs, L = st[0].length, SRr = SR, out = [];
    const win = (x, t) => rms(x, (t + OFF) * SRr, (t + OFF + .05) * SRr), med = a => { const s = a.slice().sort((x, y) => x - y); return s[s.length >> 1]; };
    for (const c of cands) {
      const g = c.g, M = new Float32Array(L), Bg = new Float32Array(L), Cu = new Float32Array(L), Ht = new Float32Array(L);
      for (let i = 0; i < L; i++) { Bg[i] = g[0] * st[0][i] + g[1] * st[1][i]; Cu[i] = g[2] * st[2][i]; Ht[i] = g[4] * st[4][i]; M[i] = Bg[i] + Cu[i] + g[3] * st[3][i] + Ht[i]; }
      const bd = bands(M), cues = {}, hd = [];
      for (const q of info.cues) { if (q.t > info.len) continue; (cues[q.cue] || (cues[q.cue] = [])).push(db(win(Cu, q.t)) - db(win(Bg, q.t))); }
      for (const n of info.notes) hd.push(db(win(Ht, n.t)) - db(win(Bg, n.t)));
      let pk = 0; for (let i = 0; i < L; i++) { const v = Math.abs(M[i]); if (v > pk) pk = v; }
      out.push({ name: c.name, lo: bd.lo, hi: bd.hi, rms: +db(rms(M, 0, L)).toFixed(1), pk: +pk.toFixed(2), hit: [+Math.min(...hd).toFixed(1), +med(hd).toFixed(1)], cue: Object.fromEntries(Object.entries(cues).map(([k, a]) => [k, [+Math.min(...a).toFixed(1), +med(a).toFixed(1)]])) });
    }
    return out;
  }
  const R = {}, PRE = { M: [{ bgm: 1, cue: 1, ghost: 1, hit: 1 }, true], N: [{ bgm: 1, cue: 1, ghost: 1 }, false], Bg: [{ bgm: 1 }, true], Cu: [{ cue: 1 }, true], Ht: [{ hit: 1 }, true] };
  async function pre(k) { R[k] = await render(...PRE[k]); return R[k].dropped; }
  async function all(label) {
    const info = INFO, bs = info.bs, o = { id: info.id, NEW, label };
    for (const k of ['M', 'N', 'Bg', 'Cu', 'Ht']) if (!R[k]) await pre(k);
    o.dropped = R.M.dropped;
    const M = R.M.x, N = R.N.x, Bg = R.Bg.x, Cu = R.Cu.x, Ht = R.Ht.x;
    o.bandsMix = bands(M); o.bandsNoInput = bands(N); o.bandsBgm = bands(Bg);
    const pk = x => { let m = 0, c = 0; for (let i = 0; i < x.length; i++) { const v = Math.abs(x[i]); if (v > m) m = v; if (v >= .999) c++; } return { peak: +m.toFixed(3), clip: c }; };
    o.rmsMix = +db(rms(M, 0, M.length)).toFixed(1); o.clipMix = pk(M); o.clipNoInput = pk(N);
    // beat onsets on full mix (perfect bot)
    const F = flux(M), hopS = F.hop / SR, pks = peaks(F.all, F.tc, hopS), lastBeat = Math.floor((info.len - 4 * bs) / bs);
    let hit = 0; const nb = lastBeat + 1; for (let b = 0; b < nb; b++) if (pks.some(p => Math.abs(p.t - b * bs) <= .02)) hit++;
    const at = t => { let m = 0; for (let i = 0; i < F.all.length; i++) { const tt = F.tc(i); if (tt < t - .02) continue; if (tt > t + .02) break; if (F.all[i] > m) m = F.all[i]; } return m; };
    let s13 = 0, s24 = 0, n13 = 0, n24 = 0; for (let b = 4; b < nb; b++) { const v = at(b * bs); if (b % 2 === 0) { s13 += v; n13++; } else { s24 += v; n24++; } }
    o.quarterHit = +(hit / nb * 100).toFixed(1); o.backbeat = +((s24 / n24) / (s13 / n13)).toFixed(2);
    // cue vs music (first 50ms), per cue type
    const win = (x, t) => rms(x, (t + OFF) * SR, (t + OFF + .05) * SR);
    const by = {}, cw = []; for (const c of info.cues) { if (c.t > info.len) continue; const d = db(win(Cu, c.t)) - db(win(Bg, c.t)); (by[c.cue] || (by[c.cue] = [])).push(d); if (c.cue !== 'count') cw.push([+d.toFixed(1), c.cue, c.beat]); } cw.sort((a, b) => a[0] - b[0]); o.cueWorst = cw.slice(0, 6);
    const med = a => { const s = a.slice().sort((x, y) => x - y); return s[s.length >> 1]; };
    o.cueVsMusic = Object.fromEntries(Object.entries(by).map(([k, a]) => [k, { n: a.length, med: +med(a).toFixed(1), min: +Math.min(...a).toFixed(1) }]));
    const FAKE = new Set(['yawn', 'coo']), CNT = new Set(['count']), allC = [], fakeC = [];
    for (const [k, a] of Object.entries(by)) { if (FAKE.has(k)) fakeC.push(...a); else if (!CNT.has(k)) allC.push(...a); }
    o.cueAll = allC.length ? { n: allC.length, min: +Math.min(...allC).toFixed(1), med: +med(allC).toFixed(1) } : null;
    o.fakeAll = fakeC.length ? { n: fakeC.length, min: +Math.min(...fakeC).toFixed(1), med: +med(fakeC).toFixed(1) } : null;
    const hd = [], hw = []; for (const n of info.notes) { const v = db(win(Ht, n.t)) - db(win(Bg, n.t)); hd.push(v); hw.push([+v.toFixed(1), n.zone || info.id, n.cue, n.beat]); } hw.sort((a, b) => a[0] - b[0]); o.hitWorst = hw.slice(0, 5);
    o.hitVsMusic = { n: hd.length, min: +Math.min(...hd).toFixed(1), med: +med(hd).toFixed(1) };
    // count-in beats 4..7
    const SC = stft(Cu, 1024, 220), SB = stft(Bg, 1024, 220), ci = [];
    for (let b = 4; b < 8; b++) { const t = b * bs; ci.push({ onset: pks.some(p => Math.abs(p.t - t) <= .02), band: +(bandDb(SC, t, t + .05, 1000, 4000) - bandDb(SB, t, t + .05, 1000, 4000)).toFixed(1) }); }
    o.countIn = { onsets: ci.filter(x => x.onset).length, bandMin: Math.min(...ci.map(x => x.band)), bands: ci.map(x => x.band), hasCountCue: info.cues.filter(c => c.cue === 'count' || c.cue === 'knife').length };
    o.png = spectroPNG(M, 30, bs, `${info.id} ${label} 믹스(완벽 봇 입력 포함) 0~30초`, info.cues.map(c => c.t), info.notes.map(n => n.t));
    o.pngZoom = spectroPNG(M.slice(Math.floor((8 * 4 * bs) * SR), Math.floor((8 * 4 * bs + 10) * SR) + Math.floor(OFF * SR)), 10, bs, `${info.id} ${label} 9마디부터 10초 확대`, info.cues.map(c => c.t - 8 * 4 * bs), info.notes.map(n => n.t - 8 * 4 * bs));
    return o;
  }
  return { SR, OFF, NEW, evOf, render, all, stems, tuneEval, pre, R };
})();
'ok';
