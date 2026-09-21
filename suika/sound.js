/* sound.js — Suika game sound module. 100% synthesized with the Web Audio API.
 * No audio files, no libraries, no network. Exposes window.Sound (plain script).
 *
 *   Sound.init()              create/resume AudioContext (call on first user gesture); starts BGM if enabled & not muted
 *   Sound.play(name, opt)     fire-and-forget SFX (never throws; silently no-op before init / while suspended / muted)
 *   Sound.bgm(on)             start / stop the looping background track
 *   Sound.setMuted(bool)      / Sound.muted   (persisted in localStorage['suika_mute'] = '1' | '0')
 *   Sound.setVolume(0..1)     / Sound.volume  (persisted in localStorage['suika_vol'], default 0.8)
 *   Sound._render(name, opt)  Promise<{peak, duration, nominal}> rendered with an OfflineAudioContext (testing)
 *   Sound._renderBgm(seconds) Promise<{peak, rms}> offline render of the BGM loop (testing)
 */
(function (global) {
  'use strict';

  var AC  = global.AudioContext || global.webkitAudioContext;
  var OAC = global.OfflineAudioContext || global.webkitOfflineAudioContext;

  var MAX_VOICES = 12;                                   // concurrent SFX voices (per play() call)
  var IMPORTANT  = { melon: 1, melonPop: 1, gameover: 1, relic: 1, curse: 1, rainbow: 1 };

  var ctx = null;          // live AudioContext
  var live = null;         // live graph
  var muted = false;
  var volume = 0.8;
  var activeVoices = 0;
  var bgmWanted = true;

  function clamp(v, a, b) { return v < a ? a : v > b ? b : v; }
  function rnd(a, b) { return a + Math.random() * (b - a); }
  function mtof(m) { return 440 * Math.pow(2, (m - 69) / 12); }
  function num(v, def) { v = +v; return isNaN(v) ? def : v; }

  /* ---------- persistence ---------- */
  try {
    muted = global.localStorage.getItem('suika_mute') === '1';
    var sv = parseFloat(global.localStorage.getItem('suika_vol'));
    if (!isNaN(sv)) volume = clamp(sv, 0, 1);
  } catch (e) {}
  function save(k, v) { try { global.localStorage.setItem(k, v); } catch (e) {} }

  /* ---------- graph ----------
   * SFX bus ─┐
   * BGM bus ─┼─> compressor ─> master ─> destination
   * reverb  ─┤   (reverb / echo are shared send returns fed by SFX voices)
   * echo    ─┘
   */
  function makeNoise(c) {
    var len = Math.floor(c.sampleRate * 1.5), buf = c.createBuffer(1, len, c.sampleRate), d = buf.getChannelData(0);
    for (var i = 0; i < len; i++) d[i] = Math.random() * 2 - 1;
    return buf;
  }
  function makeImpulse(c, secs, curve) {           // small synthesized room
    var len = Math.floor(c.sampleRate * secs), buf = c.createBuffer(2, len, c.sampleRate);
    for (var ch = 0; ch < 2; ch++) {
      var d = buf.getChannelData(ch);
      for (var i = 0; i < len; i++) {
        var t = i / len;
        d[i] = (Math.random() * 2 - 1) * Math.pow(1 - t, curve) * (i < 220 ? i / 220 : 1);
      }
    }
    return buf;
  }
  function buildGraph(c, isLive) {
    var g = { ctx: c, live: !!isLive };
    g.master = c.createGain();
    g.master.gain.value = isLive ? (muted ? 0 : volume) : 1;
    g.comp = c.createDynamicsCompressor();
    g.comp.threshold.value = -12; g.comp.knee.value = 12; g.comp.ratio.value = 4;
    g.comp.attack.value = 0.003; g.comp.release.value = 0.15;
    g.comp.connect(g.master); g.master.connect(c.destination);

    g.sfx = c.createGain(); g.sfx.gain.value = 1;   g.sfx.connect(g.comp);
    g.bgm = c.createGain(); g.bgm.gain.value = 0.1; g.bgm.connect(g.comp);   // ≈ -14 dB under SFX peaks (BGM peak ≈ 0.2 vs merge ≈ 0.5)

    g.verbIn = c.createGain();
    var conv = c.createConvolver(); conv.buffer = makeImpulse(c, 0.6, 2.2);
    var verbOut = c.createGain(); verbOut.gain.value = 0.35;
    g.verbIn.connect(conv); conv.connect(verbOut); verbOut.connect(g.comp);

    g.echoIn = c.createGain();
    var dly = c.createDelay(1); dly.delayTime.value = 0.2;
    var fb = c.createGain(); fb.gain.value = 0.3;
    var lp = c.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = 3200;
    var echoOut = c.createGain(); echoOut.gain.value = 0.5;
    g.echoIn.connect(dly); dly.connect(lp); lp.connect(fb); fb.connect(dly); lp.connect(echoOut); echoOut.connect(g.comp);

    g.noise = makeNoise(c);
    return g;
  }

  /* ---------- voice helpers ---------- */
  function sends(g, node, o) {
    if (o.verb) { var vs = g.ctx.createGain(); vs.gain.value = o.verb; node.connect(vs); vs.connect(g.verbIn); }
    if (o.echo) { var es = g.ctx.createGain(); es.gain.value = o.echo; node.connect(es); es.connect(g.echoIn); }
  }
  // envelope: linear attack a → optional hold → exponential decay d (to -66 dB)
  function envelope(c, gainParam, t, o) {
    var a = o.a == null ? 0.004 : o.a;
    gainParam.setValueAtTime(0, t);
    gainParam.linearRampToValueAtTime(o.vol, t + a);
    var ds = t + a + (o.hold || 0);
    if (o.hold) gainParam.setValueAtTime(o.vol, ds);
    gainParam.exponentialRampToValueAtTime(0.0005, ds + o.d);
    return ds + o.d;
  }
  // oscillator voice: {t, f, f1?, bend?, type?, det?, vol, a?, hold?, d, lp?, q?, verb?, echo?, dest?}
  function osc(g, o) {
    var c = g.ctx, t = o.t, det = o.det || 1;
    var n = c.createOscillator(); n.type = o.type || 'sine';
    n.frequency.setValueAtTime(o.f * det, t);
    if (o.f1) n.frequency.exponentialRampToValueAtTime(o.f1 * det, t + (o.bend || 0.08));
    var env = c.createGain();
    var end = envelope(c, env.gain, t, o);
    n.connect(env);
    var out = env;
    if (o.lp) { var lp = c.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = o.lp; lp.Q.value = o.q || 0.7; env.connect(lp); out = lp; }
    out.connect(o.dest || g.sfx);
    sends(g, out, o);
    n.start(t); n.stop(end + 0.02);
    return { osc: n, env: env, out: out, end: end };
  }
  // filtered noise voice: {t, type?, f, f1?, bend?, q?, vol, a?, hold?, d, verb?, echo?, dest?}
  function noise(g, o) {
    var c = g.ctx, t = o.t;
    var src = c.createBufferSource(); src.buffer = g.noise; src.loop = true;
    var flt = c.createBiquadFilter(); flt.type = o.type || 'bandpass';
    flt.frequency.setValueAtTime(o.f || 1000, t); flt.Q.value = o.q == null ? 1 : o.q;
    if (o.f1) flt.frequency.exponentialRampToValueAtTime(o.f1, t + (o.bend || o.d));
    var env = c.createGain();
    var end = envelope(c, env.gain, t, o);
    src.connect(flt); flt.connect(env); env.connect(o.dest || g.sfx);
    sends(g, env, o);
    src.start(t, Math.random() * 1.2); src.stop(end + 0.02);
    return { src: src, env: env, end: end };
  }
  // music-box / marimba bell: fundamental + one fast-decaying partial
  function bell(g, o) {
    var v = osc(g, { t: o.t, f: o.f, det: o.det, vol: o.vol, d: o.d, a: 0.003, verb: o.verb, echo: o.echo, dest: o.dest });
    osc(g, { t: o.t, f: o.f * (o.partial || 3), det: o.det, vol: o.vol * (o.pgain || 0.25), d: o.d * 0.35, a: 0.002, dest: o.dest });
    return v;
  }
  // amplitude wobble node (tremolo): output gain = base ± depth
  function tremolo(g, t, end, rate, base, depth) {
    var c = g.ctx, tr = c.createGain(); tr.gain.value = base;
    var lfo = c.createOscillator(); lfo.frequency.value = rate;
    var lg = c.createGain(); lg.gain.value = depth;
    lfo.connect(lg); lg.connect(tr.gain); lfo.start(t); lfo.stop(end);
    tr.connect(g.sfx);
    return tr;
  }

  /* ---------- SFX ---------- each: (graph, startTime, opt) → end time (seconds) */
  var SFX = {

    // soft "plip" — rising sine blip; bigger fruit = a little lower
    drop: function (g, t, o) {
      var lv = clamp(num(o.level, 0), 0, 10);
      var f = 1000 * Math.pow(0.5, lv / 10) * rnd(0.97, 1.03);      // 1000 → 500 Hz
      osc(g, { t: t, f: f * 0.6, f1: f, bend: 0.045, vol: 0.32, d: 0.11, verb: 0.08 });
      osc(g, { t: t, f: f * 2.5, vol: 0.05, d: 0.025, a: 0.002 });   // tiny tick
      return t + 0.15;
    },

    // very soft thud — low pitch drop + a puff of low noise
    land: function (g, t, o) {
      var lv = clamp(num(o.level, 0), 0, 10);
      var f = 200 * Math.pow(0.5, lv / 8) * rnd(0.97, 1.03);        // 200 → ~84 Hz
      osc(g, { t: t, f: f * 2.2, f1: f, bend: 0.06, vol: 0.26 + lv * 0.014, d: 0.12 + lv * 0.01, lp: 900 });
      noise(g, { t: t, type: 'lowpass', f: 700, vol: 0.07 + lv * 0.007, d: 0.045 });
      return t + 0.2;
    },

    // THE merge: round "pop-boing". level 1..10 = result fruit (high & tight → low & fat); combo ≥ 2 adds a rising sparkle
    merge: function (g, t, o) {
      var lv = clamp(num(o.level, 1), 1, 10), combo = clamp(num(o.combo, 1), 1, 99);
      var k = (lv - 1) / 9;                                    // 0 (cherry-ish) → 1 (watermelon)
      var det = rnd(0.97, 1.03);                               // ±3 % so repeats never sound identical
      var base = 820 * Math.pow(170 / 820, k);                 // 820 Hz → 170 Hz
      var d = 0.13 + k * 0.08;                                 // decay 0.13 → 0.21 s
      var lp = 3600 - k * 2400;                                // rounder as it gets bigger
      osc(g, { t: t, f: base * 1.7, f1: base, bend: 0.07 + k * 0.03, det: det, type: 'triangle', vol: 0.28, d: d, lp: lp, q: 0.8, verb: 0.05 });
      osc(g, { t: t, f: base * 1.4, f1: base, bend: 0.05, det: det, vol: 0.22, d: d * 0.8 });
      osc(g, { t: t, f: base * 0.65, f1: base * 0.5, bend: 0.08, det: det, vol: 0.04 + k * 0.30, d: d, lp: 900 });   // sub body (fatter with level)
      noise(g, { t: t, type: 'bandpass', f: base * 4, q: 1.2, vol: 0.15 - k * 0.07, d: 0.018 });                       // pop transient
      osc(g, { t: t, f: base * 3, f1: base * 1.5, bend: 0.02, det: det, vol: 0.09, d: 0.02, a: 0.002 });
      var end = t + 0.005 + d;
      if (combo >= 2) {
        var scale = [84, 86, 88, 91, 93, 96, 98, 100, 103, 105];   // C6 pentatonic, rising with combo
        var f = mtof(scale[clamp(combo - 2, 0, scale.length - 1)]);
        var ts = t + 0.02;
        osc(g, { t: ts, f: f, vol: 0.13, d: 0.15, a: 0.003, echo: 0.22, verb: 0.12 });
        osc(g, { t: ts, f: f * 3.01, vol: 0.03, d: 0.05, a: 0.002 });
        osc(g, { t: ts + 0.06, f: f * 1.5, vol: 0.08, d: 0.13, a: 0.003, echo: 0.18 });
        end = Math.max(end, ts + 0.19);
      }
      return end;
    },

    // small burst (fruit removed by explosion / cleanup)
    pop: function (g, t) {
      var det = rnd(0.95, 1.05);
      osc(g, { t: t, f: 1100, f1: 420, bend: 0.05, det: det, vol: 0.22, d: 0.09, lp: 3000 });
      noise(g, { t: t, type: 'bandpass', f: 2200, q: 0.8, vol: 0.18, d: 0.035 });
      return t + 0.13;
    },

    // UI tick
    click: function (g, t) {
      osc(g, { t: t, f: 1900, f1: 1300, bend: 0.012, vol: 0.16, d: 0.035, a: 0.001 });
      noise(g, { t: t, type: 'highpass', f: 3000, vol: 0.06, d: 0.012, a: 0.001 });
      return t + 0.05;
    },

    // gentle two-tone tick for the danger line (called ~every 0.5 s)
    warning: function (g, t) {
      osc(g, { t: t, f: 880, vol: 0.11, d: 0.07, verb: 0.08 });
      osc(g, { t: t + 0.09, f: 660, vol: 0.07, d: 0.06 });
      return t + 0.17;
    },

    // triumphant fanfare (~1.2 s): C5 E5 G5 → C6 held with a soft E6/G6 chord and shimmer
    melon: function (g, t) {
      var seq = [72, 76, 79, 84];
      for (var i = 0; i < 4; i++) {
        var lastN = i === 3;
        bell(g, { t: t + i * 0.09, f: mtof(seq[i]), vol: 0.22, d: lastN ? 1.15 : 0.16, partial: 4, pgain: 0.2, verb: 0.25, echo: lastN ? 0.25 : 0 });
      }
      var tc = t + 0.27;
      osc(g, { t: tc, f: mtof(88), vol: 0.10, d: 1.05, a: 0.02, verb: 0.3 });                       // E6
      osc(g, { t: tc, f: mtof(91), vol: 0.09, d: 1.05, a: 0.02, verb: 0.3 });                       // G6
      osc(g, { t: tc, f: mtof(60), type: 'triangle', vol: 0.15, d: 0.9, a: 0.01, lp: 800 });        // C4 body
      osc(g, { t: t, f: 150, f1: 55, bend: 0.08, vol: 0.26, d: 0.18 });                             // thump
      noise(g, { t: tc, type: 'highpass', f: 6000, vol: 0.045, d: 0.45, a: 0.02, verb: 0.3 });       // shimmer
      return tc + 1.0;
    },

    // big juicy burst when two watermelons vanish
    melonPop: function (g, t) {
      osc(g, { t: t, f: 320, f1: 55, bend: 0.28, vol: 0.5, d: 0.42, a: 0.005, lp: 600 });                   // boom
      noise(g, { t: t, type: 'lowpass', f: 3500, f1: 250, bend: 0.3, q: 0.7, vol: 0.32, d: 0.3 });          // splash
      noise(g, { t: t, type: 'bandpass', f: 1800, q: 0.6, vol: 0.25, d: 0.05 });                             // snap
      for (var i = 0; i < 6; i++) {                                                                          // juice bubbles
        var f = rnd(500, 1500);
        osc(g, { t: t + 0.04 + i * 0.045 + rnd(0, 0.02), f: f * 0.6, f1: f, bend: 0.04, vol: 0.11, d: 0.09, verb: 0.2 });
      }
      return t + 0.6;
    },

    // cheerful "item get" chime (~0.8 s): E5 G5 B5 E6 music-box
    relic: function (g, t) {
      var seq = [76, 79, 83, 88];
      for (var i = 0; i < 4; i++) {
        var lastN = i === 3;
        bell(g, { t: t + i * 0.065, f: mtof(seq[i]), vol: 0.2, d: lastN ? 0.5 : 0.18, partial: 2.4, pgain: 0.3, verb: 0.25, echo: lastN ? 0.3 : 0.08 });
      }
      osc(g, { t: t + 0.195, f: mtof(95), vol: 0.05, d: 0.45, a: 0.01, verb: 0.3 });   // B6 halo
      return t + 0.8;
    },

    // ominous descending sting (~0.7 s): detuned minor-second glide + sub, tremolo, darkened
    curse: function (g, t) {
      var det = rnd(0.98, 1.02), end = t + 0.85;
      var tr = tremolo(g, t, end + 0.05, 9, 0.8, 0.2);
      osc(g, { t: t, f: 330, f1: 95, bend: 0.6, det: det, type: 'triangle', vol: 0.2, d: 0.7, a: 0.03, hold: 0.2, lp: 1400, q: 2, verb: 0.3, dest: tr });
      osc(g, { t: t, f: 350, f1: 101, bend: 0.6, det: det, type: 'triangle', vol: 0.16, d: 0.7, a: 0.03, hold: 0.2, lp: 1400, q: 2, dest: tr });
      osc(g, { t: t, f: 110, f1: 45, bend: 0.55, vol: 0.24, d: 0.6, a: 0.02, hold: 0.2, lp: 400 });
      noise(g, { t: t, type: 'lowpass', f: 600, f1: 120, bend: 0.6, vol: 0.05, d: 0.55, a: 0.05 });
      return end;
    },

    // sad-but-cute descending jingle (~1.5 s): G5 E5 C5 → A4 drooping with vibrato
    gameover: function (g, t) {
      var seq = [[79, 0, 0.22], [76, 0.2, 0.22], [72, 0.4, 0.25], [69, 0.62, 0.8]];
      for (var i = 0; i < seq.length; i++) {
        var n = seq[i], tt = t + n[1], lastN = i === seq.length - 1;
        var v = osc(g, { t: tt, f: mtof(n[0]), f1: lastN ? mtof(n[0]) * 0.93 : 0, bend: 0.85, type: 'triangle', vol: 0.2, d: n[2], a: 0.01, lp: 2200, verb: 0.3, echo: lastN ? 0.15 : 0 });
        osc(g, { t: tt, f: mtof(n[0] - 12), vol: 0.12, d: n[2], a: 0.01, verb: 0.2 });
        if (lastN) {
          var lfo = g.ctx.createOscillator(); lfo.frequency.value = 5.5;
          var lg = g.ctx.createGain(); lg.gain.value = 6;
          lfo.connect(lg); lg.connect(v.osc.frequency); lfo.start(tt + 0.15); lfo.stop(v.end);
        }
      }
      return t + 1.5;
    },

    // rumble for shaking / earthquake (~0.7 s): wobbling low noise + sub, with little rattles
    shake: function (g, t) {
      var end = t + 0.7;
      var tr = tremolo(g, t, end + 0.05, 13, 0.7, 0.3);
      noise(g, { t: t, type: 'lowpass', f: 160, q: 1.5, vol: 0.7, d: 0.26, a: 0.03, hold: 0.33, dest: tr });
      var sub = osc(g, { t: t, f: 48, vol: 0.35, d: 0.24, a: 0.03, hold: 0.33, dest: tr });
      var l2 = g.ctx.createOscillator(); l2.frequency.value = 7;
      var l2g = g.ctx.createGain(); l2g.gain.value = 9;
      l2.connect(l2g); l2g.connect(sub.osc.frequency); l2.start(t); l2.stop(end + 0.05);
      for (var i = 0; i < 7; i++) noise(g, { t: t + 0.03 + i * 0.085 + rnd(0, 0.03), type: 'bandpass', f: rnd(900, 2200), q: 2, vol: 0.05, d: 0.03 });
      return end;
    },

    // sparkly ascending arpeggio: C6 D6 E6 G6 A6 C7 E7 G7 with echo + shimmer
    rainbow: function (g, t) {
      var seq = [84, 86, 88, 91, 93, 96, 100, 103];
      for (var i = 0; i < seq.length; i++) {
        var lastN = i === seq.length - 1;
        bell(g, { t: t + i * 0.05, f: mtof(seq[i]), vol: 0.12 + i * 0.008, d: lastN ? 0.45 : 0.2, partial: 3, pgain: 0.2, verb: 0.25, echo: 0.22 });
      }
      noise(g, { t: t, type: 'highpass', f: 7000, vol: 0.045, d: 0.45, a: 0.05, verb: 0.3 });
      return t + 0.95;
    }
  };

  /* ---------- BGM: 16-bar loop, 112 BPM, C major, 16th-note grid, marimba / music-box + plucky bass + light drums ---------- */
  var BPM = 112, STEPS_PER_BAR = 16, BARS = 16, TOTAL_STEPS = STEPS_PER_BAR * BARS;
  // melody per bar, 8 eighth notes (MIDI, 0 = rest)   chords: C Am F G | C Am F G | C Em F G | Am F G C
  var MEL = [
    [76, 79, 81, 79, 76, 0, 72, 0], [76, 74, 72, 74, 76, 0, 0, 0], [81, 0, 79, 77, 76, 77, 79, 0], [74, 0, 0, 76, 77, 0, 74, 0],
    [76, 79, 81, 79, 76, 0, 72, 0], [76, 74, 72, 74, 76, 0, 79, 0], [81, 0, 84, 0, 81, 79, 77, 79], [81, 0, 79, 0, 0, 0, 74, 0],
    [84, 0, 83, 81, 79, 0, 76, 0], [79, 81, 83, 0, 79, 0, 76, 0], [77, 79, 81, 0, 84, 0, 81, 0], [83, 0, 81, 79, 74, 0, 0, 0],
    [84, 0, 81, 0, 76, 0, 81, 0], [77, 81, 84, 0, 81, 0, 77, 0], [79, 81, 83, 86, 83, 0, 86, 0], [84, 0, 0, 0, 76, 0, 72, 0]
  ];
  var ROOT = [36, 45, 41, 43, 36, 45, 41, 43, 36, 40, 41, 43, 45, 41, 43, 36];   // bass roots (C2 A2 F2 G2 ...)

  function marimba(g, t, f, vol) {
    osc(g, { t: t, f: f, vol: vol, d: 0.28, a: 0.002, dest: g.bgm });
    osc(g, { t: t, f: f * 4, vol: vol * 0.18, d: 0.05, a: 0.001, dest: g.bgm });
    osc(g, { t: t, f: f * 10, vol: vol * 0.05, d: 0.015, a: 0.001, dest: g.bgm });   // mallet click
  }
  function bassNote(g, t, f, vol) { osc(g, { t: t, f: f, type: 'triangle', vol: vol, d: 0.22, a: 0.004, lp: 500, dest: g.bgm }); }
  function kick(g, t, vol)  { osc(g, { t: t, f: 150, f1: 45, bend: 0.05, vol: vol, d: 0.12, a: 0.002, dest: g.bgm }); }
  function hat(g, t, vol)   { noise(g, { t: t, type: 'highpass', f: 7000, vol: vol, d: 0.025, a: 0.001, dest: g.bgm }); }
  function snap(g, t, vol)  { noise(g, { t: t, type: 'bandpass', f: 1600, q: 1, vol: vol, d: 0.06, a: 0.002, dest: g.bgm }); }

  function scheduleStep(g, s, t) {
    var bar = Math.floor(s / STEPS_PER_BAR), st = s % STEPS_PER_BAR, r = ROOT[bar];
    if (st % 2 === 0) { var m = MEL[bar][st / 2]; if (m) marimba(g, t, mtof(m), st % 4 ? 0.42 : 0.55); }
    if (st === 0) bassNote(g, t, mtof(r), 0.6);
    else if (st === 8) bassNote(g, t, mtof(r), 0.5);
    else if (st === 6 || st === 14) bassNote(g, t, mtof(r + 7), 0.38);
    if (st === 0 || st === 8 || (st === 10 && bar % 2 === 1)) kick(g, t, 0.55);
    if (st % 2 === 0) hat(g, t, st % 4 === 0 ? 0.14 : 0.24);
    if (st === 4 || st === 12) snap(g, t, 0.18);
    if (st === 0 && bar % 4 === 0 && MEL[bar][0]) marimba(g, t, mtof(MEL[bar][0] + 12), 0.18);   // high sparkle every 4 bars
  }

  var bgm = { timer: null, step: 0, next: 0, stepDur: 60 / BPM / 4 };
  function bgmTick() {
    if (!live || !ctx || ctx.state !== 'running') return;
    var now = ctx.currentTime;
    var ahead = now + ((global.document && global.document.hidden) ? 1.6 : 0.16);   // longer lookahead while throttled
    if (bgm.next < now - 0.25) {                     // fell behind (tab throttling): skip forward, keep the loop phase
      var miss = Math.ceil((now - bgm.next) / bgm.stepDur);
      bgm.step += miss; bgm.next += miss * bgm.stepDur;
    }
    while (bgm.next < ahead) {
      scheduleStep(live, bgm.step % TOTAL_STEPS, bgm.next);
      bgm.step++; bgm.next += bgm.stepDur;
    }
  }
  function bgmStart() {
    if (!live || bgm.timer) return;
    bgm.step = 0; bgm.next = ctx.currentTime + 0.05;
    bgm.timer = setInterval(bgmTick, 25);
    bgmTick();
  }
  function bgmStop() { if (bgm.timer) { clearInterval(bgm.timer); bgm.timer = null; } }

  /* ---------- public API ---------- */
  var S = {};

  S.init = function () {
    try {
      if (!AC) return false;
      if (!ctx) {
        ctx = new AC();
        live = buildGraph(ctx, true);
        ctx.onstatechange = function () {
          if (ctx.state !== 'running') bgmStop();
          else if (bgmWanted && !muted) bgmStart();
        };
      }
      if (ctx.state === 'suspended' && ctx.resume) {
        var p = ctx.resume();
        if (p && p.then) p.then(function () { if (bgmWanted && !muted) bgmStart(); }, function () {});
      }
      if (ctx.state === 'running' && bgmWanted && !muted) bgmStart();
      return true;
    } catch (e) { return false; }
  };

  S.play = function (name, opt) {
    var fn = SFX[name];
    if (!fn || !live || !ctx || ctx.state !== 'running' || muted) return false;
    if (activeVoices >= MAX_VOICES && !IMPORTANT[name]) return false;
    activeVoices++;
    try {
      var end = fn(live, ctx.currentTime + 0.005, opt || {});
      setTimeout(function () { activeVoices = Math.max(0, activeVoices - 1); }, Math.max(30, (end - ctx.currentTime) * 1000 + 40));
      return true;
    } catch (e) { activeVoices = Math.max(0, activeVoices - 1); return false; }
  };

  S.bgm = function (on) {
    bgmWanted = on !== false;
    if (bgmWanted) { if (live && ctx.state === 'running' && !muted) bgmStart(); }
    else bgmStop();
    return bgmWanted;
  };

  S.setMuted = function (m) {
    muted = !!m; save('suika_mute', muted ? '1' : '0');
    if (live) {
      var p = live.master.gain; p.cancelScheduledValues(ctx.currentTime);
      p.setTargetAtTime(muted ? 0 : volume, ctx.currentTime, 0.02);
    }
    if (muted) bgmStop(); else if (bgmWanted && ctx && ctx.state === 'running') bgmStart();
    return muted;
  };

  S.setVolume = function (v) {
    volume = clamp(num(v, 0.8), 0, 1); save('suika_vol', String(volume));
    if (live && !muted) {
      var p = live.master.gain; p.cancelScheduledValues(ctx.currentTime);
      p.setTargetAtTime(volume, ctx.currentTime, 0.02);
    }
    return volume;
  };

  Object.defineProperty(S, 'muted',  { get: function () { return muted; } });
  Object.defineProperty(S, 'volume', { get: function () { return volume; } });
  Object.defineProperty(S, 'ready',  { get: function () { return !!ctx && ctx.state === 'running'; } });
  Object.defineProperty(S, 'bgmOn',  { get: function () { return !!bgm.timer; } });
  Object.defineProperty(S, 'context', { get: function () { return ctx; } });
  Object.defineProperty(S, 'activeVoices', { get: function () { return activeVoices; } });
  S.names = Object.keys(SFX);
  S.bgmInfo = { bpm: BPM, bars: BARS, key: 'C major', seconds: TOTAL_STEPS * bgm.stepDur };

  /* ---------- offline rendering (tests) ---------- */
  function analyze(buf, t0, thr) {
    var d = buf.getChannelData(0), peak = 0, last = -1, sq = 0;
    for (var i = 0; i < d.length; i++) { var v = Math.abs(d[i]); sq += v * v; if (v > peak) peak = v; if (v > thr) last = i; }
    return { peak: peak, rms: Math.sqrt(sq / d.length), duration: last < 0 ? 0 : Math.max(0, (last - t0 * buf.sampleRate) / buf.sampleRate) };
  }
  S._render = function (name, opt, seconds) {
    if (!OAC) return Promise.reject(new Error('OfflineAudioContext unavailable'));
    var fn = SFX[name];
    if (!fn) return Promise.reject(new Error('unknown sfx: ' + name));
    var sr = 44100, oc = new OAC(1, Math.ceil(sr * (seconds || 3)), sr);
    var g = buildGraph(oc, false), t0 = 0.05;
    var end = fn(g, t0, opt || {});
    return oc.startRendering().then(function (buf) {
      var a = analyze(buf, t0, 0.01);                          // duration = last sample above -40 dBFS
      return { name: name, opt: opt || {}, peak: a.peak, duration: a.duration, nominal: end - t0, silent: a.peak < 0.02, clip: a.peak > 0.95 };
    });
  };
  S._renderBgm = function (seconds) {
    if (!OAC) return Promise.reject(new Error('OfflineAudioContext unavailable'));
    seconds = seconds || 8;
    var sr = 44100, oc = new OAC(1, Math.ceil(sr * seconds), sr);
    var g = buildGraph(oc, false), t = 0.05, s = 0;
    while (t < seconds) { scheduleStep(g, s % TOTAL_STEPS, t); s++; t += bgm.stepDur; }
    return oc.startRendering().then(function (buf) { var a = analyze(buf, 0, 0.01); return { peak: a.peak, rms: a.rms, seconds: seconds }; });
  };

  global.Sound = S;
})(typeof window !== 'undefined' ? window : this);
