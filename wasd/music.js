// WASD 웹판 음악·효과음 — 전부 Web Audio 합성 (원작 파일 없음)
// 원작 곡을 분석한 템포·조성·리듬 꼴·음색만 따르고 멜로디는 새로 지음 (분석: game-re-tools/wasd/snd_analyze*.py, spec/sound.md)
//   Music.play('grass1'|'grass2'|'beach1'|'beach2'|'desert1'|'desert2'|'main') · Music.stop() · Music.sfx('coin'|'die'|'move'|'clear'|'click')
//   볼륨은 party-sound.js 의 🔊 패널(Sound.bgmVolume · Sound.sfxVolume)을 따름
(function () {
  let C = null, master, bgmBus, sfxBus, noiseBuf;
  function ctx() {
    if (C) { if (C.state === 'suspended') C.resume().catch(() => {}); return C; }
    try { C = new (window.AudioContext || window.webkitAudioContext)(); } catch (e) { return null; }
    const comp = C.createDynamicsCompressor(); comp.threshold.value = -14; comp.ratio.value = 3.5; comp.attack.value = .004; comp.release.value = .2;
    master = C.createGain(); master.gain.value = .9; comp.connect(master); master.connect(C.destination);
    bgmBus = C.createGain(); bgmBus.gain.value = 0; bgmBus.connect(comp);
    sfxBus = C.createGain(); sfxBus.gain.value = .8; sfxBus.connect(comp);
    const n = C.sampleRate * 2; noiseBuf = C.createBuffer(1, n, C.sampleRate); const d = noiseBuf.getChannelData(0); for (let i = 0; i < n; i++) d[i] = Math.random() * 2 - 1;
    return C;
  }
  const vol = () => ({ bgm: window.Sound ? Sound.bgmVolume : .6, sfx: window.Sound ? Sound.sfxVolume : .8 });
  const mtof = m => 440 * Math.pow(2, (m - 69) / 12);
  function env(g, t, a, peak, dec, sus = .0001) { g.gain.setValueAtTime(.0001, t); g.gain.linearRampToValueAtTime(peak, t + a); g.gain.exponentialRampToValueAtTime(Math.max(.0001, sus), t + a + dec); }
  function osc(type, f, t, end, dest, detune = 0) { const o = C.createOscillator(); o.type = type; o.frequency.setValueAtTime(f, t); o.detune.value = detune; o.connect(dest); o.start(t); o.stop(end); return o; }
  function noise(t, end, dest) { const s = C.createBufferSource(); s.buffer = noiseBuf; s.loop = true; s.loopStart = Math.random(); s.connect(dest); s.start(t, Math.random() * 1.5); s.stop(end); return s; }
  function filt(type, f, q, dest) { const b = C.createBiquadFilter(); b.type = type; b.frequency.value = f; b.Q.value = q; b.connect(dest); return b; }
  function pan(p, dest) { if (!C.createStereoPanner) return dest; const s = C.createStereoPanner(); s.pan.value = p; s.connect(dest); return s; }

  // ════════ 악기 (원작 곡 음색 분석: 짧게 튕기는 말렛·현, 스틸드럼, 아라비아풍 현, 통통 튀는 베이스) ════════
  const INST = {
    marimba(t, m, d, v, out) { const f = mtof(m), g = C.createGain(); g.connect(out); env(g, t, .004, .5 * v, .38); osc('sine', f, t, t + .5, g); const g2 = C.createGain(); g2.connect(out); env(g2, t, .002, .12 * v, .06); osc('sine', f * 3.99, t, t + .1, g2); },
    bell(t, m, d, v, out) { const f = mtof(m), g = C.createGain(); g.connect(out); env(g, t, .002, .22 * v, .7); osc('sine', f, t, t + .8, g); const g2 = C.createGain(); g2.connect(out); env(g2, t, .002, .08 * v, .25); osc('sine', f * 2.76, t, t + .3, g2); },
    uke(t, m, d, v, out) { const f = mtof(m), lp = filt('lowpass', 2600, .7, out), g = C.createGain(); g.connect(lp); env(g, t, .003, .26 * v, .32); osc('triangle', f, t, t + .4, g, -4); osc('sawtooth', f, t, t + .4, g, 5).connect(g); const gn = C.createGain(); gn.connect(filt('bandpass', f * 4, 2, out)); env(gn, t, .001, .12 * v, .02); noise(t, t + .03, gn); },
    pizz(t, m, d, v, out) { const f = mtof(m), lp = filt('lowpass', 1800, 1, out), g = C.createGain(); g.connect(lp); env(g, t, .004, .3 * v, .2); osc('sawtooth', f, t, t + .3, g); lp.frequency.setValueAtTime(3200, t); lp.frequency.exponentialRampToValueAtTime(600, t + .2); },
    steel(t, m, d, v, out) { const f = mtof(m), g = C.createGain(); g.connect(out); env(g, t, .004, .32 * v, .55); const o = osc('sine', f * 1.02, t, t + .7, g); o.frequency.exponentialRampToValueAtTime(f, t + .03); const g2 = C.createGain(); g2.connect(out); env(g2, t, .003, .16 * v, .3); osc('sine', f * 2, t, t + .4, g2); const g3 = C.createGain(); g3.connect(out); env(g3, t, .002, .07 * v, .15); osc('sine', f * 3.03, t, t + .2, g3); },
    flute(t, m, d, v, out) { const f = mtof(m), g = C.createGain(); g.connect(out); g.gain.setValueAtTime(.0001, t); g.gain.linearRampToValueAtTime(.2 * v, t + .04); g.gain.setValueAtTime(.2 * v, t + Math.max(.05, d - .06)); g.gain.exponentialRampToValueAtTime(.0001, t + d + .08); const o = osc('sine', f, t, t + d + .1, g); const o2 = osc('triangle', f * 2, t, t + d + .1, g); o2.disconnect(); const g2 = C.createGain(); g2.gain.value = .15; o2.connect(g2); g2.connect(g); const lfo = C.createOscillator(), lg = C.createGain(); lfo.frequency.value = 5.2; lg.gain.value = f * .006; lfo.connect(lg); lg.connect(o.frequency); lfo.start(t + .12); lfo.stop(t + d + .1); },
    oud(t, m, d, v, out) { const f = mtof(m), bp = filt('bandpass', f * 2.2, 1.4, out), g = C.createGain(); g.connect(bp); env(g, t, .003, .5 * v, .42); const o = osc('sawtooth', f * .985, t, t + .5, g); o.frequency.exponentialRampToValueAtTime(f, t + .025); osc('square', f, t, t + .5, g, 7); },
    qanun(t, m, d, v, out) { const f = mtof(m), hp = filt('highpass', 500, .7, out), g = C.createGain(); g.connect(hp); env(g, t, .002, .2 * v, .5); osc('sawtooth', f, t, t + .6, g, -6); osc('sawtooth', f, t, t + .6, g, 6); },
    pad(t, m, d, v, out) { const f = mtof(m), lp = filt('lowpass', 900, .5, out), g = C.createGain(); g.connect(lp); g.gain.setValueAtTime(.0001, t); g.gain.linearRampToValueAtTime(.075 * v, t + .25); g.gain.setValueAtTime(.075 * v, t + d - .1); g.gain.linearRampToValueAtTime(.0001, t + d + .2); osc('sawtooth', f, t, t + d + .25, g, -8); osc('sawtooth', f, t, t + d + .25, g, 8); },
    bass(t, m, d, v, out) { const f = mtof(m), lp = filt('lowpass', 700, 2, out), g = C.createGain(); g.connect(lp); env(g, t, .005, .55 * v, Math.min(.35, d + .05)); osc('triangle', f, t, t + .45, g); const g2 = C.createGain(); g2.connect(lp); env(g2, t, .004, .12 * v, .12); osc('square', f, t, t + .2, g2); lp.frequency.setValueAtTime(1400, t); lp.frequency.exponentialRampToValueAtTime(500, t + .15); },
  };
  const DRUM = {
    kick(t, v, out) { const g = C.createGain(); g.connect(out); env(g, t, .002, .9 * v, .26); const o = osc('sine', 150, t, t + .3, g); o.frequency.exponentialRampToValueAtTime(45, t + .2); },
    snare(t, v, out) { const g = C.createGain(); g.connect(filt('bandpass', 2200, .8, out)); env(g, t, .001, .5 * v, .14); noise(t, t + .2, g); const g2 = C.createGain(); g2.connect(out); env(g2, t, .001, .25 * v, .07); const o = osc('triangle', 210, t, t + .1, g2); o.frequency.exponentialRampToValueAtTime(150, t + .07); },
    clap(t, v, out) { const bp = filt('bandpass', 1500, 1.2, out); for (let i = 0; i < 3; i++) { const g = C.createGain(); g.connect(bp); env(g, t + i * .011, .001, .4 * v, i === 2 ? .12 : .01); noise(t + i * .011, t + .2, g); } },
    hat(t, v, out) { const g = C.createGain(); g.connect(filt('highpass', 7500, .7, out)); env(g, t, .001, .22 * v, .035); noise(t, t + .06, g); },
    ohat(t, v, out) { const g = C.createGain(); g.connect(filt('highpass', 7000, .7, out)); env(g, t, .001, .18 * v, .2); noise(t, t + .25, g); },
    shaker(t, v, out) { const g = C.createGain(); g.connect(filt('bandpass', 6500, 1.5, out)); g.gain.setValueAtTime(.0001, t); g.gain.linearRampToValueAtTime(.16 * v, t + .02); g.gain.exponentialRampToValueAtTime(.0001, t + .07); noise(t, t + .09, g); },
    conga(t, v, out) { const g = C.createGain(); g.connect(out); env(g, t, .002, .5 * v, .16); const o = osc('sine', 260, t, t + .2, g); o.frequency.exponentialRampToValueAtTime(200, t + .05); },
    congaLo(t, v, out) { const g = C.createGain(); g.connect(out); env(g, t, .002, .5 * v, .2); const o = osc('sine', 190, t, t + .25, g); o.frequency.exponentialRampToValueAtTime(150, t + .05); },
    doum(t, v, out) { const g = C.createGain(); g.connect(out); env(g, t, .002, .8 * v, .3); const o = osc('sine', 110, t, t + .35, g); o.frequency.exponentialRampToValueAtTime(70, t + .25); },
    tek(t, v, out) { const g = C.createGain(); g.connect(filt('bandpass', 3200, 2, out)); env(g, t, .001, .5 * v, .045); noise(t, t + .07, g); const g2 = C.createGain(); g2.connect(out); env(g2, t, .001, .2 * v, .04); osc('sine', 520, t, t + .06, g2); },
    tamb(t, v, out) { const g = C.createGain(); g.connect(filt('highpass', 6000, 1, out)); env(g, t, .001, .2 * v, .12); noise(t, t + .15, g); const g2 = C.createGain(); g2.connect(out); env(g2, t, .001, .03 * v, .1); osc('square', 7200, t, t + .12, g2); },
  };

  // ════════ 곡 (원작 분석값: 템포 · 조성 · 마디 화음 흐름 · 16스텝 리듬 꼴) ════════
  // 화음 = [근음(조 기준 반음), 'M'|'m'] · 스텝 문자열 16칸: X 강 · x 약 · . 쉼
  const MAJ = [0, 2, 4, 5, 7, 9, 11], MIN = [0, 2, 3, 5, 7, 8, 10];
  const SONGS = {
    // 초원 1 (원작 143 BPM · C장조 · 8분 하이햇 · 마림바 같은 말렛)
    grass1: { bpm: 143, root: 60, scale: MAJ, lead: 'marimba', counter: 'bell', comp: 'uke', bassPat: 'R...R.F.R...R.O.', compPat: '..X...X...X...X.',
      A: [[0, 'M'], [4, 'm'], [5, 'M'], [7, 'M'], [0, 'M'], [9, 'm'], [5, 'M'], [7, 'M']], B: [[9, 'm'], [5, 'M'], [0, 'M'], [7, 'M'], [2, 'm'], [5, 'M'], [7, 'M'], [7, 'M']],
      drums: { kick: 'X.......X.......', clap: '....X.......X...', hat: 'x.X.x.X.x.X.x.X.', shaker: '' }, swing: 0, seed: 'g1' },
    // 초원 2 (143 BPM · C#단조 ↔ E장조 · 엇박 킥)
    grass2: { bpm: 143, root: 61, scale: MIN, lead: 'pizz', counter: 'marimba', comp: 'uke', bassPat: 'R.R...F.R...R.O.', compPat: 'X...X.X.X...X...',
      A: [[0, 'm'], [0, 'm'], [3, 'M'], [3, 'M'], [0, 'm'], [8, 'M'], [3, 'M'], [10, 'M']], B: [[8, 'M'], [3, 'M'], [10, 'M'], [0, 'm'], [5, 'm'], [8, 'M'], [10, 'M'], [10, 'M']],
      drums: { kick: 'X.X...x.....X...', snare: '....X.......X...', hat: 'X...X.x.X...X.x.', shaker: 'x.x.x.x.x.x.x.x.' }, swing: .08, seed: 'g2' },
    // 해변 1 (119 BPM · F#장조 · C#→F# 반복 · 스틸드럼 · 라틴풍 바쁜 킥)
    beach1: { bpm: 119, root: 66, scale: MAJ, lead: 'steel', counter: 'marimba', comp: 'uke', bassPat: 'R..R..F.R..R..O.', compPat: '..x.X.x...x.X.x.',
      A: [[7, 'M'], [0, 'M'], [7, 'M'], [0, 'M'], [7, 'M'], [0, 'M'], [2, 'm'], [7, 'M']], B: [[5, 'M'], [0, 'M'], [2, 'm'], [7, 'M'], [5, 'M'], [0, 'M'], [7, 'M'], [7, 'M']],
      drums: { kick: 'X..xX...X..xX...', snare: '....X.......X..x', hat: '', shaker: 'xxXxxxXxxxXxxxXx', conga: '..x...x...x.x...', congaLo: 'X.....X.X.......' }, swing: .1, seed: 'b1' },
    // 해변 2 (127 BPM · D#m ↔ C#m 흔들기 · 3-3-2 킥 · 플루트)
    beach2: { bpm: 127, root: 61, scale: MAJ, lead: 'flute', counter: 'steel', comp: 'marimba', bassPat: 'R..R..F.R...R...', compPat: 'X..X..X.X.X.X...',
      A: [[2, 'm'], [0, 'm'], [2, 'm'], [0, 'm'], [2, 'm'], [0, 'm'], [7, 'M'], [5, 'M']], B: [[7, 'M'], [5, 'M'], [0, 'm'], [9, 'm'], [7, 'M'], [0, 'M'], [7, 'M'], [7, 'M']],
      drums: { kick: 'X..X..X.....X...', snare: '....X.......X...', hat: 'x.x.x.x.x.x.x.x.', conga: '...x..x...x...x.', shaker: '' }, swing: .06, seed: 'b2' },
    // 사막 1 (124 BPM · D# 화성장음계(♭6) · 우드 · 다르부카 둠-텍)
    desert1: { bpm: 124, root: 63, scale: [0, 2, 4, 5, 7, 8, 11], lead: 'oud', counter: 'qanun', comp: 'pad', bassPat: 'R..RR.F.R.R.R..O', compPat: 'X...............',
      A: [[7, 'm'], [10, 'M'], [10, 'M'], [7, 'm'], [5, 'm'], [0, 'M'], [0, 'M'], [5, 'm']], B: [[10, 'M'], [0, 'M'], [10, 'M'], [0, 'M'], [5, 'm'], [0, 'M'], [8, 'M'], [0, 'M']],
      drums: { doum: 'X..x..X.X.......', tek: '..X.X..XX.X.X.xX', tamb: 'x.x.x.x.x.x.x.x.', hat: '' }, swing: .05, seed: 'd1' },
    // 사막 2 (125 BPM · C 프리지안 도미넌트(하지즈) · 네 박 킥 · 카눈 아르페지오)
    desert2: { bpm: 125, root: 60, scale: [0, 1, 4, 5, 7, 8, 10], lead: 'qanun', counter: 'oud', comp: 'pad', bassPat: 'R...R...R...R.F.', compPat: 'X...............',
      A: [[0, 'M'], [0, 'M'], [0, 'M'], [1, 'M'], [0, 'M'], [5, 'm'], [1, 'M'], [0, 'M']], B: [[5, 'm'], [4, 'M'], [5, 'm'], [0, 'M'], [8, 'M'], [1, 'M'], [0, 'M'], [0, 'M']],
      drums: { kick: 'X...X...X...X...', tek: '..x...x...x...xX', tamb: 'x.x.x.x.x.x.x.x.', doum: '' }, swing: 0, seed: 'd2' },
    // 메인 메뉴 (130 BPM · B단조 + ♭II(C) · 네 박 · 마림바+벨)
    main: { bpm: 130, root: 59, scale: MIN, lead: 'marimba', counter: 'bell', comp: 'pad', bassPat: 'R...R...R...R...', compPat: 'X...............',
      A: [[0, 'm'], [1, 'M'], [7, 'm'], [0, 'm'], [0, 'm'], [1, 'M'], [7, 'm'], [0, 'm']], B: [[8, 'M'], [1, 'M'], [3, 'M'], [0, 'm'], [3, 'M'], [1, 'M'], [7, 'm'], [8, 'M']],
      drums: { kick: 'X...X...X...X...', clap: '....X.......X...', hat: '..x...x...x...x.' }, swing: 0, seed: 'mn' },
  };

  // ════════ 작곡: 씨앗으로 정해지는 동기(모티프) → A A′ B A 32마디 ════════
  function rng(s) { let h = 1779033703 ^ s.length; for (let i = 0; i < s.length; i++) h = Math.imul(h ^ s.charCodeAt(i), 3432918353), h = h << 13 | h >>> 19; return () => { h = Math.imul(h ^ h >>> 16, 2246822507); h = Math.imul(h ^ h >>> 13, 3266489909); return ((h ^= h >>> 16) >>> 0) / 4294967296; }; }
  const RHY = ['X.x.X...X.x.X.x.', 'X...X.x.X...x.x.', 'X.xxX...X.x.x...', 'X..xX.x.X..xX...', 'X.x.x.X.X...X...', 'x.X.X.x.X.x...X.', 'X...x.x.X.xxX...'];
  function chordTones(S, ch) { const r = S.root + ch[0]; return [r, r + (ch[1] === 'm' ? 3 : 4), r + 7]; }
  function scaleNotes(S) { const out = []; for (let o = -2; o <= 3; o++) for (const iv of S.scale) out.push(S.root + o * 12 + iv); return out; }
  function nearest(list, x) { let b = list[0]; for (const n of list) if (Math.abs(n - x) < Math.abs(b - x)) b = n; return b; }
  function compose(S) {
    const R = rng(S.seed), sc = scaleNotes(S), lo = S.root + 2, hi = S.root + 21;
    const motif = (bars, dens) => { const ms = []; for (let b = 0; b < bars; b++) { let r = RHY[Math.floor(R() * RHY.length)]; if (dens < 0) r = r.replace(/x/g, '.'); ms.push(r); } return ms; };
    const mA = motif(2, 0), mB = motif(2, R() < .5 ? -1 : 0);
    // 윤곽(음계 걸음) — 동기마다 한 번 정하고 화음에 맞춰 다시 씀
    const contour = n => { const c = []; for (let i = 0; i < n; i++) c.push(R() < .3 ? 0 : (R() < .5 ? 1 : -1) * (R() < .7 ? 1 : 2)); return c; };
    const cA = contour(16), cB = contour(16);
    const bar = (rhy, cont, ch, prev, cadence) => {
      const notes = [], tones = chordTones(S, ch); let p = prev, ci = 0;
      const hits = [...rhy].map((c, i) => c !== '.' ? i : -1).filter(i => i >= 0);
      hits.forEach((st, k) => {
        if (k === 0 || st % 4 === 0) { const cand = []; for (let o = -1; o <= 2; o++) for (const t of tones) cand.push(t + o * 12); p = nearest(cand.filter(n => n >= lo && n <= hi), p + (cont[ci % cont.length] || 0) * 2); }
        else { const idx = sc.indexOf(nearest(sc, p)); p = sc[Math.max(0, Math.min(sc.length - 1, idx + cont[ci % cont.length]))]; if (p < lo) p += 12; if (p > hi) p -= 12; }
        ci++;
        const nx = hits[k + 1] == null ? 16 : hits[k + 1];
        notes.push({ st, m: p, len: nx - st, v: rhy[st] === 'X' ? 1 : .7 });
      });
      if (cadence) { const t = nearest([tones[0], tones[0] + 12, tones[1], tones[1] + 12].filter(n => n >= lo && n <= hi), p); notes.length = Math.min(notes.length, 2); notes.push({ st: 8, m: t, len: 8, v: 1 }); }
      return { notes, last: p };
    };
    const sections = [['A', mA, cA, false], ['A2', mA, cA, true], ['B', mB, cB, false], ['A', mA, cA, true]];
    const ev = []; let barNo = 0, prev = S.root + 9;
    for (const [nm, mot, cont, endT] of sections) {
      const prog = nm === 'B' ? S.B : S.A;
      for (let b = 0; b < 8; b++, barNo++) {
        const ch = prog[b], base = barNo * 16;
        const cad = b === 3 || (b === 7 && endT), cadEnd = b === 7 && endT;
        const rhy = mot[b % 2], r = bar(rhy, cont.slice((b % 2) * 8), cadEnd ? [0, S.scale === MIN || S.scale[2] === 3 ? 'm' : 'M'] : ch, prev, cad); prev = r.last;
        for (const n of r.notes) ev.push({ s: base + n.st, k: 'lead', m: n.m, d: n.len, v: n.v });
        // 대선율: B 와 마지막 A 에서 박마다 화음 아르페지오
        if (nm === 'B' || (nm === 'A' && barNo >= 24)) chordTones(S, ch).concat([chordTones(S, ch)[0] + 12]).forEach((m, i) => ev.push({ s: base + 2 + i * 4, k: 'counter', m: m + 12, d: 2, v: .45 }));
        // 반주
        const tones = chordTones(S, ch);
        [...S.compPat].forEach((c, i) => { if (c !== '.') ev.push({ s: base + i, k: 'comp', ms: tones.map(t => t - (S.comp === 'pad' ? 12 : 0)), d: S.comp === 'pad' ? 16 : 2, v: c === 'X' ? .8 : .55 }); });
        // 깔린 화음 (원작 곡들은 지속음이 늘 깔려 있음)
        if (S.comp !== 'pad') ev.push({ s: base, k: 'pad', ms: tones.map(t => t - 12), d: 16, v: .55 });
        // 베이스
        [...S.bassPat].forEach((c, i) => { if (c === '.') return; const r0 = S.root - 24 + ch[0] + (ch[0] > 6 ? -12 : 0); const m = c === 'R' ? r0 : c === 'F' ? r0 + 7 : c === 'O' ? r0 + 12 : r0 + (ch[1] === 'm' ? 3 : 4); let nx = i + 1; while (nx < 16 && S.bassPat[nx] === '.') nx++; ev.push({ s: base + i, k: 'bass', m, d: nx - i, v: .9 }); });
        // 북 (첫 마디·B 첫 마디는 살짝 비움 · 구간 끝 마디에 짧은 필)
        for (const [dk, pat] of Object.entries(S.drums)) if (pat) [...pat].forEach((c, i) => { if (c === '.') return; if (b === 7 && i >= 12 && dk !== 'hat') return; ev.push({ s: base + i, k: 'drum', dk, v: c === 'X' ? 1 : .6 }); });
        if (b === 7) { const fd = S.drums.tek != null ? 'tek' : S.drums.snare != null ? 'snare' : 'clap'; [12, 13, 14, 15].forEach((i, j) => ev.push({ s: base + i, k: 'drum', dk: fd, v: .5 + j * .15 })); }
      }
    }
    ev.sort((a, b) => a.s - b.s);
    return { ev, steps: barNo * 16 };
  }
  const SCORE = {};

  // ════════ 연주 (미리 내다보고 예약) ════════
  let cur = null, timer = null, visible = true;
  function schedule() {
    if (!cur || !C) return;
    const v = vol(), want = cur && v.bgm > 0 && visible && !document.hidden;
    bgmBus.gain.setTargetAtTime(want ? .55 * v.bgm : 0, C.currentTime, .08);
    sfxBus.gain.setTargetAtTime(v.sfx, C.currentTime, .02);
    if (!want) { cur.t0 = null; return; }
    const S = cur.S, sd = 60 / S.bpm / 4, sc = cur.sc;
    if (cur.t0 == null) { cur.t0 = C.currentTime + .08 - cur.pos * sd; }
    const until = C.currentTime + .25;
    for (;;) {
      const e = sc.ev[cur.i]; if (!e) { cur.i = 0; cur.loop++; cur.t0 += sc.steps * sd; continue; }
      const sw = (e.s % 2) ? S.swing * sd : 0, t = cur.t0 + e.s * sd + sw; if (t > until) break;
      cur.pos = e.s; cur.i++;
      if (t < C.currentTime - .05) continue;
      if (e.k === 'drum') DRUM[e.dk] && DRUM[e.dk](t, e.v * .7, cur.dbus);
      else if (e.k === 'comp') { e.ms.forEach((m, j) => INST[S.comp](t + j * (S.comp === 'uke' ? .012 : 0), m, e.d * sd, e.v * .55, cur.cbus)); }
      else if (e.k === 'pad') e.ms.forEach(m => INST.pad(t, m, e.d * sd, e.v, cur.cbus));
      else if (e.k === 'lead') INST[S.lead](t, e.m, e.d * sd, e.v * 1.15, cur.lbus);
      else if (e.k === 'counter') INST[S.counter](t, e.m, e.d * sd, e.v, cur.kbus);
      else if (e.k === 'bass') INST.bass(t, e.m, e.d * sd, e.v, cur.bbus);
    }
  }
  function play(id) {
    if (cur && cur.id === id) return;
    stop();
    if (!ctx()) return;
    const S = SONGS[id]; if (!S) return;
    const sc = SCORE[id] = SCORE[id] || compose(S);
    const g = C.createGain(); g.gain.value = 1; g.connect(bgmBus);
    // 원작처럼 스테레오로 넓게: 주선율 약간 왼쪽, 대선율 오른쪽
    const dg = C.createGain(); dg.gain.value = .55; dg.connect(g);
    cur = { id, S, sc, i: 0, pos: 0, loop: 0, t0: null, out: g, lbus: pan(-.15, g), kbus: pan(.35, g), cbus: pan(.2, g), bbus: g, dbus: dg };
    schedule(); timer = setInterval(schedule, 60);
  }
  function stop() {
    clearInterval(timer); timer = null;
    if (cur && C) { const g = cur.out; g.gain.setTargetAtTime(0, C.currentTime, .05); setTimeout(() => { try { g.disconnect(); } catch (e) {} }, 400); }
    cur = null;
  }

  // ════════ 효과음 (원작 효과음의 길이·음높이 흐름·음량 곡선을 따라 합성) ════════
  function sfx(k, offline) {
    if (!offline && !ctx()) return; const v = vol(); if (!(v.sfx > 0)) return;
    if (!offline) sfxBus.gain.setValueAtTime(v.sfx, C.currentTime);
    const t = C.currentTime + .005, o = sfxBus;
    if (k === 'coin') {            // GetCoin 1.08초: 높은 종소리 + 초당 4.5번 출렁이는 휘파람
      [[2637, .3, .28], [3951, .16, .2], [5274, .08, .12]].forEach(([f, a, d]) => { const g = C.createGain(); g.connect(o); env(g, t, .002, a, d); osc('sine', f, t, t + d + .05, g); });
      const g = C.createGain(); g.connect(o); g.gain.setValueAtTime(.0001, t); g.gain.linearRampToValueAtTime(.22, t + .05); g.gain.setValueAtTime(.2, t + .3); g.gain.exponentialRampToValueAtTime(.0001, t + 1.0);
      const w = osc('sine', 1500, t, t + 1.05, g), lfo = C.createOscillator(), lg = C.createGain(); lfo.frequency.value = 4.5; lg.gain.value = 420; lfo.connect(lg); lg.connect(w.frequency); lfo.start(t); lfo.stop(t + 1.05);
    } else if (k === 'die') {      // CharacterDie 0.34초: 넓은 대역 '퍽' — 잡음이 빠르게 어두워짐
      const bp = filt('lowpass', 6000, .7, o), g = C.createGain(); g.connect(bp); g.gain.setValueAtTime(.0001, t); g.gain.linearRampToValueAtTime(1.1, t + .004); g.gain.exponentialRampToValueAtTime(.25, t + .12); g.gain.exponentialRampToValueAtTime(.0001, t + .34); noise(t, t + .36, g); bp.frequency.setValueAtTime(8000, t); bp.frequency.exponentialRampToValueAtTime(900, t + .32);
      const g2 = C.createGain(); g2.connect(o); env(g2, t, .002, .4, .12); const s = osc('sine', 420, t, t + .16, g2); s.frequency.exponentialRampToValueAtTime(140, t + .12);
    } else if (k === 'move') {     // StageMove 1.38초: 부풀었다 가라앉는 바람 + 반짝임
      const bp = filt('bandpass', 1200, 1.2, o), g = C.createGain(); g.connect(bp); g.gain.setValueAtTime(.0001, t); g.gain.linearRampToValueAtTime(.55, t + .5); g.gain.exponentialRampToValueAtTime(.0001, t + 1.35);
      noise(t, t + 1.4, g); bp.frequency.setValueAtTime(900, t); bp.frequency.exponentialRampToValueAtTime(7000, t + .55); bp.frequency.exponentialRampToValueAtTime(2500, t + 1.3);
      for (let i = 0; i < 9; i++) { const tt = t + .1 + i * .11, gg = C.createGain(); gg.connect(o); env(gg, tt, .002, .07, .35); osc('sine', 3000 + (i * 1373 % 5000), tt, tt + .4, gg); }
    } else if (k === 'clear') {    // Clear 3.43초: 화음 연타 팡파레 → 마지막 긴 화음 (A장조)
      const brass = (tt, ms, d, a) => ms.forEach(m => { const f = mtof(m), lp = filt('lowpass', 2400, 1, o), g = C.createGain(); g.connect(lp); g.gain.setValueAtTime(.0001, tt); g.gain.linearRampToValueAtTime(a, tt + .02); g.gain.setValueAtTime(a * .8, tt + d * .6); g.gain.exponentialRampToValueAtTime(.0001, tt + d); osc('sawtooth', f, tt, tt + d + .05, g, -5); osc('square', f, tt, tt + d + .05, g, 6); lp.frequency.setValueAtTime(3500, tt); lp.frequency.exponentialRampToValueAtTime(1500, tt + d); });
      const st = .147, A = [57, 61, 64, 69], D = [57, 62, 66, 69], E = [56, 59, 64, 71];
      [A, A, A, D, D, E].forEach((c, i) => brass(t + i * st, c.map(m => m + (i > 2 ? 0 : 0)), .13, .05));
      [[6, E], [7, E], [8, A.map(m => m + 2)], [10, E.map(m => m + 1)]].forEach(([i, c]) => brass(t + i * st, c, .16, .055));
      brass(t + 12 * st, [57, 64, 69, 73, 76], .5, .05); brass(t + 14.6 * st, [57, 61, 64, 69, 73, 81], 1.3, .06);
      for (let i = 0; i < 6; i++) { const tt = t + 14.6 * st + i * .05, gg = C.createGain(); gg.connect(o); env(gg, tt, .002, .05, .5); osc('sine', mtof(81 + [0, 4, 7, 12, 16, 19][i]), tt, tt + .6, gg); }
    } else if (k === 'click') {    // ButtonClick 0.17초: 부드러운 '뽁뽁'
      [0, .09].forEach((dl, i) => { const g = C.createGain(); g.connect(o); env(g, t + dl, .003, .35 - i * .1, .05); const s = osc('sine', 700 - i * 80, t + dl, t + dl + .08, g); s.frequency.exponentialRampToValueAtTime(320, t + dl + .05); });
    }
  }
  // 허브 iframe 에서 가려지면 멈춤
  try { if (window.IntersectionObserver && window.top !== window.self) new IntersectionObserver(es => { visible = es.some(x => x.isIntersecting); schedule(); }).observe(document.documentElement); } catch (e) {}
  document.addEventListener('visibilitychange', schedule);
  ['pointerdown', 'keydown', 'touchend'].forEach(ev => document.addEventListener(ev, () => { if (C && C.state === 'suspended') C.resume(); else if (!C && cur === null && pending) { const p = pending; pending = null; play(p); } }, { capture: true, passive: true }));
  let pending = null;
  // 시험용: 곡을 OfflineAudioContext 로 secs 초 렌더링 → AudioBuffer (같은 악기·악보 코드 사용)
  async function renderOffline(id, secs = 12, sr = 44100) {
    const save = { C, master, bgmBus, sfxBus, noiseBuf };
    const O = new OfflineAudioContext(2, Math.ceil(sr * secs), sr); C = O;
    const comp = C.createDynamicsCompressor(); comp.threshold.value = -14; comp.ratio.value = 3.5; comp.attack.value = .004; comp.release.value = .2;
    master = C.createGain(); master.gain.value = .9; comp.connect(master); master.connect(C.destination);
    bgmBus = C.createGain(); bgmBus.gain.value = .55; bgmBus.connect(comp); sfxBus = C.createGain(); sfxBus.gain.value = .8; sfxBus.connect(comp);
    const n = sr * 2; noiseBuf = C.createBuffer(1, n, sr); const d = noiseBuf.getChannelData(0); for (let i = 0; i < n; i++) d[i] = Math.random() * 2 - 1;
    try {
      if (SONGS[id]) {
        const S = SONGS[id], sc = SCORE[id] = SCORE[id] || compose(S), sd = 60 / S.bpm / 4, g = C.createGain(); g.connect(bgmBus);
        const dg = C.createGain(); dg.gain.value = .55; dg.connect(g); const b = { lbus: pan(-.15, g), kbus: pan(.35, g), cbus: pan(.2, g), bbus: g, dbus: dg };
        for (let loop = 0; loop * sc.steps * sd < secs; loop++) for (const e of sc.ev) {
          const t = .05 + (loop * sc.steps + e.s) * sd + ((e.s % 2) ? S.swing * sd : 0); if (t > secs) break;
          if (e.k === 'drum') DRUM[e.dk](t, e.v * .7, b.dbus); else if (e.k === 'comp') e.ms.forEach((m, j) => INST[S.comp](t + j * (S.comp === 'uke' ? .012 : 0), m, e.d * sd, e.v * .55, b.cbus));
          else if (e.k === 'pad') e.ms.forEach(m => INST.pad(t, m, e.d * sd, e.v, b.cbus));
          else if (e.k === 'lead') INST[S.lead](t, e.m, e.d * sd, e.v * 1.15, b.lbus); else if (e.k === 'counter') INST[S.counter](t, e.m, e.d * sd, e.v, b.kbus); else if (e.k === 'bass') INST.bass(t, e.m, e.d * sd, e.v, b.bbus);
        }
      } else sfxOffline(id);
    } catch (e) { C = save.C; master = save.master; bgmBus = save.bgmBus; sfxBus = save.sfxBus; noiseBuf = save.noiseBuf; throw e; }
    const p = O.startRendering(); C = save.C; master = save.master; bgmBus = save.bgmBus; sfxBus = save.sfxBus; noiseBuf = save.noiseBuf;
    return p;
  }
  function sfxOffline(k) { const old = window.Sound; try { window.Sound = { sfxVolume: .8, bgmVolume: .6 }; sfx(k, true); } finally { window.Sound = old; } }
  window.Music = {
    renderOffline,
    play(id) { if (!C) { pending = id; try { ctx(); } catch (e) {} } if (C) { pending = null; play(id); } },
    stop() { pending = null; stop(); }, sfx, get current() { return cur && cur.id; }, SONGS, compose, get ctx() { return C; },
  };
})();
