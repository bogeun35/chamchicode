/* party-sound.js — 참스코드 파티게임 공통 사운드. 100% Web Audio 합성(파일 없음). window.Sound
 *
 *   Sound.init()                 첫 사용자 제스처에서 자동 호출 (직접 호출해도 됨)
 *   Sound.play(name, opt)        효과음 (초기화 전/음소거면 조용히 무시)
 *   Sound.theme(name)            BGM 곡 선택: 'mystery' | 'sneaky' | 'spy' | 'playful' | 'lounge'
 *   Sound.scene(screenId)        'home' 이면 BGM 정지, 그 외(lobby/game/end)면 재생
 *   Sound.setBgmVolume(0..1) / setSfxVolume(0..1)   저장: localStorage party_bgmvol / party_sfxvol (0 = 끔). 🔊 버튼 → 슬라이더 패널
 *   Sound.log(text)              게임 로그 첫 글자(이모지)로 효과음 — 같은 문장은 한 번만
 *   Sound.diff(key, n, up, down) 값이 늘면 up, 줄면 down 재생 (첫 호출은 기준만 잡음)
 *   Sound.once(key, name)        같은 key 로는 한 번만
 *   Sound.countdown(left)        남은 초 ≤10 이면 매초 tick, 0 이면 timeup
 */
(function (global) {
  'use strict';
  var AC = global.AudioContext || global.webkitAudioContext;
  var OAC = global.OfflineAudioContext || global.webkitOfflineAudioContext;
  var ctx = null, live = null, activeVoices = 0, MAX_VOICES = 14;
  var bgmVol = 0.6, sfxVol = 0.8;                       // 0..1, 0 = 끔
  var IMPORTANT = { win: 1, lose: 1, turn: 1, reveal: 1, boom: 1, deal: 1 };
  var themeName = 'playful', sceneOn = false;

  try { var b = parseFloat(global.localStorage.getItem('party_bgmvol')), f = parseFloat(global.localStorage.getItem('party_sfxvol')); if (!isNaN(b)) bgmVol = clamp(b, 0, 1); if (!isNaN(f)) sfxVol = clamp(f, 0, 1); } catch (e) {}
  function save() { try { global.localStorage.setItem('party_bgmvol', String(bgmVol)); global.localStorage.setItem('party_sfxvol', String(sfxVol)); } catch (e) {} }
  function mode() { return bgmVol > 0 && sfxVol > 0 ? 'all' : sfxVol > 0 ? 'sfx' : bgmVol > 0 ? 'bgm' : 'off'; }
  function clamp(v, a, b) { return v < a ? a : v > b ? b : v; }
  function rnd(a, b) { return a + Math.random() * (b - a); }
  function mtof(m) { return 440 * Math.pow(2, (m - 69) / 12); }

  /* ---------- graph: sfx/bgm → compressor → master ---------- */
  function makeNoise(c) { var len = Math.floor(c.sampleRate * 1.5), buf = c.createBuffer(1, len, c.sampleRate), d = buf.getChannelData(0); for (var i = 0; i < len; i++) d[i] = Math.random() * 2 - 1; return buf; }
  function makeImpulse(c, secs, curve) {
    var len = Math.floor(c.sampleRate * secs), buf = c.createBuffer(2, len, c.sampleRate);
    for (var ch = 0; ch < 2; ch++) { var d = buf.getChannelData(ch); for (var i = 0; i < len; i++) { var t = i / len; d[i] = (Math.random() * 2 - 1) * Math.pow(1 - t, curve) * (i < 220 ? i / 220 : 1); } }
    return buf;
  }
  function buildGraph(c, isLive) {
    var g = { ctx: c };
    g.master = c.createGain(); g.master.gain.value = 0.85;
    g.comp = c.createDynamicsCompressor(); g.comp.threshold.value = -12; g.comp.knee.value = 12; g.comp.ratio.value = 4; g.comp.attack.value = 0.003; g.comp.release.value = 0.15;
    g.comp.connect(g.master); g.master.connect(c.destination);
    g.sfx = c.createGain(); g.sfx.gain.value = isLive ? sfxVol : 1; g.sfx.connect(g.comp);
    g.bgm = c.createGain(); g.bgm.gain.value = isLive ? 0.18 * bgmVol : 0.11; g.bgm.connect(g.comp);   // 기본 0.6 → 0.108 (효과음보다 ≈ -14 dB)
    g.verbIn = c.createGain(); var conv = c.createConvolver(); conv.buffer = makeImpulse(c, 0.7, 2.2); var vo = c.createGain(); vo.gain.value = 0.35; g.verbIn.connect(conv); conv.connect(vo); vo.connect(g.comp);
    g.echoIn = c.createGain(); var dly = c.createDelay(1); dly.delayTime.value = 0.22; var fb = c.createGain(); fb.gain.value = 0.3; var lp = c.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = 3200; var eo = c.createGain(); eo.gain.value = 0.5;
    g.echoIn.connect(dly); dly.connect(lp); lp.connect(fb); fb.connect(dly); lp.connect(eo); eo.connect(g.comp);
    g.noise = makeNoise(c);
    return g;
  }

  /* ---------- voices ---------- */
  function sends(g, node, o) {
    if (o.verb) { var vs = g.ctx.createGain(); vs.gain.value = o.verb; node.connect(vs); vs.connect(g.verbIn); }
    if (o.echo) { var es = g.ctx.createGain(); es.gain.value = o.echo; node.connect(es); es.connect(g.echoIn); }
  }
  function envelope(c, p, t, o) {
    var a = o.a == null ? 0.004 : o.a;
    p.setValueAtTime(0, t); p.linearRampToValueAtTime(o.vol, t + a);
    var ds = t + a + (o.hold || 0); if (o.hold) p.setValueAtTime(o.vol, ds);
    p.exponentialRampToValueAtTime(0.0005, ds + o.d); return ds + o.d;
  }
  // {t, f, f1?, bend?, type?, det?, vol, a?, hold?, d, lp?, q?, verb?, echo?, dest?}
  function osc(g, o) {
    var c = g.ctx, t = o.t, det = o.det || 1, n = c.createOscillator(); n.type = o.type || 'sine';
    n.frequency.setValueAtTime(o.f * det, t); if (o.f1) n.frequency.exponentialRampToValueAtTime(o.f1 * det, t + (o.bend || 0.08));
    var env = c.createGain(), end = envelope(c, env.gain, t, o); n.connect(env); var out = env;
    if (o.lp) { var lp = c.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = o.lp; lp.Q.value = o.q || 0.7; env.connect(lp); out = lp; }
    out.connect(o.dest || g.sfx); sends(g, out, o); n.start(t); n.stop(end + 0.02);
    return { osc: n, env: env, out: out, end: end };
  }
  // {t, type?, f, f1?, bend?, q?, vol, a?, hold?, d, verb?, echo?, dest?}
  function noise(g, o) {
    var c = g.ctx, t = o.t, src = c.createBufferSource(); src.buffer = g.noise; src.loop = true;
    var flt = c.createBiquadFilter(); flt.type = o.type || 'bandpass'; flt.frequency.setValueAtTime(o.f || 1000, t); flt.Q.value = o.q == null ? 1 : o.q;
    if (o.f1) flt.frequency.exponentialRampToValueAtTime(o.f1, t + (o.bend || o.d));
    var env = c.createGain(), end = envelope(c, env.gain, t, o);
    src.connect(flt); flt.connect(env); env.connect(o.dest || g.sfx); sends(g, env, o);
    src.start(t, Math.random() * 1.2); src.stop(end + 0.02); return { src: src, env: env, end: end };
  }
  function bell(g, o) {
    var v = osc(g, { t: o.t, f: o.f, det: o.det, vol: o.vol, d: o.d, a: 0.003, verb: o.verb, echo: o.echo, dest: o.dest });
    osc(g, { t: o.t, f: o.f * (o.partial || 3), det: o.det, vol: o.vol * (o.pgain || 0.25), d: o.d * 0.35, a: 0.002, dest: o.dest });
    return v;
  }
  function tremolo(g, t, end, rate, base, depth, dest) {
    var c = g.ctx, tr = c.createGain(); tr.gain.value = base; var lfo = c.createOscillator(); lfo.frequency.value = rate; var lg = c.createGain(); lg.gain.value = depth;
    lfo.connect(lg); lg.connect(tr.gain); lfo.start(t); lfo.stop(end); tr.connect(dest || g.sfx); return tr;
  }

  /* ---------- SFX ---------- (graph, t, opt) → end */
  var SFX = {
    // 버튼
    click: function (g, t) { osc(g, { t: t, f: 1900, f1: 1300, bend: 0.012, vol: 0.14, d: 0.035, a: 0.001 }); noise(g, { t: t, type: 'highpass', f: 3000, vol: 0.05, d: 0.012, a: 0.001 }); return t + 0.05; },
    // 가벼운 선택
    tap: function (g, t) { osc(g, { t: t, f: 1200 * rnd(0.97, 1.03), f1: 900, bend: 0.03, vol: 0.12, d: 0.05, a: 0.001 }); return t + 0.07; },
    // 타일 들기: 짧은 슉
    pickup: function (g, t) { noise(g, { t: t, type: 'bandpass', f: 900, f1: 2600, bend: 0.06, q: 1.2, vol: 0.28, d: 0.07, a: 0.004 }); osc(g, { t: t, f: 600, f1: 1100, bend: 0.06, vol: 0.12, d: 0.06, a: 0.002 }); return t + 0.1; },
    // 타일 내려놓기: 나무 딱
    place: function (g, t) {
      var det = rnd(0.95, 1.05);
      osc(g, { t: t, f: 1700, f1: 700, bend: 0.02, det: det, vol: 0.2, d: 0.05, a: 0.001, lp: 4000 });
      osc(g, { t: t, f: 320, f1: 180, bend: 0.03, det: det, type: 'triangle', vol: 0.22, d: 0.08, a: 0.001, lp: 900 });
      noise(g, { t: t, type: 'bandpass', f: 2600, q: 1.4, vol: 0.12, d: 0.02, a: 0.001 }); return t + 0.12;
    },
    // 카드 뒤집기: 종이 스윽 + 탁
    flip: function (g, t) {
      noise(g, { t: t, type: 'bandpass', f: 1400, f1: 4200, bend: 0.09, q: 0.8, vol: 0.13, d: 0.1, a: 0.01 });
      noise(g, { t: t + 0.1, type: 'bandpass', f: 2200, q: 1.5, vol: 0.12, d: 0.025, a: 0.001 });
      osc(g, { t: t + 0.1, f: 900, f1: 500, bend: 0.02, vol: 0.08, d: 0.04, a: 0.001 }); return t + 0.16;
    },
    // 카드/타일 나눠주기: 뒤집기 여러 번 + 마무리 종
    deal: function (g, t) {
      for (var i = 0; i < 5; i++) { var tt = t + i * 0.09; noise(g, { t: tt, type: 'bandpass', f: 1600 * rnd(0.9, 1.1), f1: 4000, bend: 0.06, q: 0.9, vol: 0.11, d: 0.06, a: 0.005 }); noise(g, { t: tt + 0.06, type: 'bandpass', f: 2400, q: 1.5, vol: 0.09, d: 0.02, a: 0.001 }); }
      var seq = [76, 79, 84]; for (var j = 0; j < 3; j++) bell(g, { t: t + 0.5 + j * 0.07, f: mtof(seq[j]), vol: 0.14, d: j === 2 ? 0.5 : 0.15, partial: 3, pgain: 0.2, verb: 0.25 });
      return t + 1.1;
    },
    // 더미에서 뽑기: 슬라이드 + 딱
    draw: function (g, t) { noise(g, { t: t, type: 'bandpass', f: 800, f1: 2000, bend: 0.12, q: 1, vol: 0.12, d: 0.12, a: 0.01 }); osc(g, { t: t + 0.13, f: 1500, f1: 800, bend: 0.02, vol: 0.14, d: 0.04, a: 0.001 }); osc(g, { t: t + 0.13, f: 260, type: 'triangle', vol: 0.12, d: 0.06, a: 0.001, lp: 800 }); return t + 0.22; },
    // 정답 딩동 (두 음 상행)
    correct: function (g, t) { bell(g, { t: t, f: mtof(84), vol: 0.2, d: 0.18, partial: 3, pgain: 0.2, verb: 0.2 }); bell(g, { t: t + 0.11, f: mtof(91), vol: 0.22, d: 0.5, partial: 3, pgain: 0.2, verb: 0.3, echo: 0.15 }); return t + 0.65; },
    // 오답 땡 (낮은 버즈 두 번)
    wrong: function (g, t) { osc(g, { t: t, f: 220, f1: 190, bend: 0.12, type: 'sawtooth', vol: 0.16, d: 0.14, a: 0.005, lp: 1200, q: 1.5 }); osc(g, { t: t + 0.16, f: 200, f1: 165, bend: 0.14, type: 'sawtooth', vol: 0.16, d: 0.2, a: 0.005, lp: 1000, q: 1.5 }); osc(g, { t: t, f: 110, vol: 0.12, d: 0.3, a: 0.005 }); return t + 0.4; },
    // "안 돼요" 짧은 두 번 삑
    error: function (g, t) { osc(g, { t: t, f: 330, type: 'square', vol: 0.12, d: 0.06, a: 0.002, lp: 1500 }); osc(g, { t: t + 0.09, f: 280, type: 'square', vol: 0.12, d: 0.09, a: 0.002, lp: 1500 }); return t + 0.2; },
    // 중립: 심심한 블룹
    neutral: function (g, t) { osc(g, { t: t, f: 520, f1: 380, bend: 0.12, type: 'triangle', vol: 0.16, d: 0.18, a: 0.005, lp: 1600 }); return t + 0.22; },
    // 도장 쾅 (투표)
    vote: function (g, t) { osc(g, { t: t, f: 260, f1: 70, bend: 0.06, vol: 0.34, d: 0.16, a: 0.002 }); noise(g, { t: t, type: 'lowpass', f: 1200, vol: 0.16, d: 0.05, a: 0.001 }); noise(g, { t: t, type: 'bandpass', f: 3200, q: 1, vol: 0.08, d: 0.015, a: 0.001 }); return t + 0.2; },
    // 시계 똑딱 (남은 10초)
    tick: function (g, t) { osc(g, { t: t, f: 2400, f1: 1600, bend: 0.01, vol: 0.13, d: 0.03, a: 0.001 }); osc(g, { t: t, f: 700, vol: 0.06, d: 0.04, a: 0.001, lp: 1500 }); return t + 0.06; },
    // 시간 종료 부저
    timeup: function (g, t) { osc(g, { t: t, f: 440, type: 'square', vol: 0.09, d: 0.3, a: 0.005, hold: 0.25, lp: 2000 }); osc(g, { t: t, f: 443, type: 'square', vol: 0.06, d: 0.3, a: 0.005, hold: 0.25, lp: 2000 }); return t + 0.6; },
    // 내 차례! (세 음 상행 + 반짝)
    turn: function (g, t) { var seq = [79, 84, 88]; for (var i = 0; i < 3; i++) bell(g, { t: t + i * 0.09, f: mtof(seq[i]), vol: 0.2, d: i === 2 ? 0.55 : 0.16, partial: 3, pgain: 0.2, verb: 0.25, echo: i === 2 ? 0.2 : 0 }); noise(g, { t: t + 0.18, type: 'highpass', f: 7000, vol: 0.03, d: 0.3, a: 0.02, verb: 0.3 }); return t + 0.8; },
    // 단계 전환 (부드러운 화음)
    phase: function (g, t) { osc(g, { t: t, f: mtof(72), vol: 0.12, d: 0.5, a: 0.02, verb: 0.3 }); osc(g, { t: t + 0.02, f: mtof(76), vol: 0.1, d: 0.5, a: 0.02, verb: 0.3 }); osc(g, { t: t + 0.04, f: mtof(79), vol: 0.1, d: 0.6, a: 0.02, verb: 0.3 }); return t + 0.7; },
    // 경고 (10초 남음)
    warn: function (g, t) { osc(g, { t: t, f: 880, vol: 0.14, d: 0.09, verb: 0.08 }); osc(g, { t: t + 0.12, f: 880, vol: 0.14, d: 0.09 }); osc(g, { t: t + 0.24, f: 660, vol: 0.12, d: 0.2 }); return t + 0.5; },
    // 입장 (뽁 + 상행)
    join: function (g, t) { osc(g, { t: t, f: 500, f1: 900, bend: 0.06, vol: 0.18, d: 0.09 }); bell(g, { t: t + 0.08, f: mtof(84), vol: 0.14, d: 0.3, partial: 3, pgain: 0.2, verb: 0.2 }); return t + 0.45; },
    // 퇴장 (하행)
    leave: function (g, t) { osc(g, { t: t, f: 700, f1: 380, bend: 0.14, vol: 0.14, d: 0.18, lp: 2500 }); return t + 0.25; },
    // 게임 시작: 드럼 + 팡파르 짧게
    start: function (g, t) {
      for (var i = 0; i < 6; i++) { osc(g, { t: t + i * 0.06, f: 180, f1: 60, bend: 0.04, vol: 0.2, d: 0.08, a: 0.002 }); noise(g, { t: t + i * 0.06, type: 'lowpass', f: 900, vol: 0.06, d: 0.03 }); }
      var seq = [72, 76, 79, 84]; for (var j = 0; j < 4; j++) bell(g, { t: t + 0.4 + j * 0.08, f: mtof(seq[j]), vol: 0.2, d: j === 3 ? 0.7 : 0.15, partial: 4, pgain: 0.2, verb: 0.25, echo: j === 3 ? 0.2 : 0 });
      return t + 1.3;
    },
    // 승리 팡파르
    win: function (g, t) {
      var seq = [72, 76, 79, 84]; for (var i = 0; i < 4; i++) { var L = i === 3; bell(g, { t: t + i * 0.09, f: mtof(seq[i]), vol: 0.22, d: L ? 1.15 : 0.16, partial: 4, pgain: 0.2, verb: 0.25, echo: L ? 0.25 : 0 }); }
      var tc = t + 0.27; osc(g, { t: tc, f: mtof(88), vol: 0.1, d: 1.05, a: 0.02, verb: 0.3 }); osc(g, { t: tc, f: mtof(91), vol: 0.09, d: 1.05, a: 0.02, verb: 0.3 }); osc(g, { t: tc, f: mtof(60), type: 'triangle', vol: 0.15, d: 0.9, a: 0.01, lp: 800 });
      osc(g, { t: t, f: 150, f1: 55, bend: 0.08, vol: 0.26, d: 0.18 }); noise(g, { t: tc, type: 'highpass', f: 6000, vol: 0.045, d: 0.45, a: 0.02, verb: 0.3 }); return tc + 1.0;
    },
    // 패배 (귀엽게 축 처지는)
    lose: function (g, t) {
      var seq = [[79, 0, 0.22], [76, 0.2, 0.22], [72, 0.4, 0.25], [69, 0.62, 0.8]];
      for (var i = 0; i < seq.length; i++) { var n = seq[i], tt = t + n[1], L = i === 3; var v = osc(g, { t: tt, f: mtof(n[0]), f1: L ? mtof(n[0]) * 0.93 : 0, bend: 0.85, type: 'triangle', vol: 0.2, d: n[2], a: 0.01, lp: 2200, verb: 0.3, echo: L ? 0.15 : 0 }); osc(g, { t: tt, f: mtof(n[0] - 12), vol: 0.12, d: n[2], a: 0.01, verb: 0.2 });
        if (L) { var lfo = g.ctx.createOscillator(); lfo.frequency.value = 5.5; var lg = g.ctx.createGain(); lg.gain.value = 6; lfo.connect(lg); lg.connect(v.osc.frequency); lfo.start(tt + 0.15); lfo.stop(v.end); } }
      return t + 1.5;
    },
    // 드럼롤 → 짠! (결과 공개)
    reveal: function (g, t) {
      for (var i = 0; i < 14; i++) { var tt = t + i * 0.05; noise(g, { t: tt, type: 'bandpass', f: 1800, q: 0.8, vol: 0.07 + i * 0.006, d: 0.03, a: 0.001 }); osc(g, { t: tt, f: 200, f1: 120, bend: 0.03, vol: 0.09 + i * 0.006, d: 0.04, a: 0.001 }); }
      var th = t + 0.75; osc(g, { t: th, f: 220, f1: 60, bend: 0.08, vol: 0.32, d: 0.3 }); noise(g, { t: th, type: 'lowpass', f: 2500, f1: 300, bend: 0.25, vol: 0.2, d: 0.25 });
      bell(g, { t: th, f: mtof(84), vol: 0.16, d: 0.6, partial: 3, pgain: 0.2, verb: 0.3 }); return th + 0.6;
    },
    // 폭발 (암살자)
    boom: function (g, t) { osc(g, { t: t, f: 300, f1: 40, bend: 0.32, vol: 0.5, d: 0.55, a: 0.005, lp: 700 }); noise(g, { t: t, type: 'lowpass', f: 4000, f1: 150, bend: 0.5, q: 0.7, vol: 0.35, d: 0.5 }); noise(g, { t: t, type: 'bandpass', f: 2500, q: 0.6, vol: 0.25, d: 0.05 }); return t + 0.8; },
    // 등록 성공 (반짝 상행 아르페지오)
    meld: function (g, t) { var seq = [76, 79, 83, 88]; for (var i = 0; i < 4; i++) bell(g, { t: t + i * 0.06, f: mtof(seq[i]), vol: 0.17, d: i === 3 ? 0.5 : 0.16, partial: 2.4, pgain: 0.3, verb: 0.25, echo: i === 3 ? 0.25 : 0.06 }); return t + 0.75; },
    // 책장 넘기기
    pageflip: function (g, t) { noise(g, { t: t, type: 'bandpass', f: 900, f1: 3800, bend: 0.13, q: 0.7, vol: 0.26, d: 0.15, a: 0.02 }); noise(g, { t: t + 0.15, type: 'bandpass', f: 2600, q: 1.2, vol: 0.08, d: 0.03, a: 0.001 }); return t + 0.22; },
    // 😂 (통통 튀는 카주)
    laugh: function (g, t) { var seq = [72, 79, 76, 84]; for (var i = 0; i < 4; i++) osc(g, { t: t + i * 0.08, f: mtof(seq[i]), f1: mtof(seq[i]) * 1.06, bend: 0.06, type: 'sawtooth', vol: 0.09, d: 0.09, a: 0.004, lp: 2200, q: 2 }); return t + 0.45; },
    // 연필 (획 시작)
    pencil: function (g, t) { noise(g, { t: t, type: 'bandpass', f: 3000 * rnd(0.9, 1.1), q: 0.8, vol: 0.05, d: 0.05, a: 0.005 }); return t + 0.06; },
    // 슉 (되돌리기/지우기)
    whoosh: function (g, t) { noise(g, { t: t, type: 'bandpass', f: 600, f1: 3000, bend: 0.15, q: 0.9, vol: 0.34, d: 0.18, a: 0.01 }); return t + 0.22; },
    // 제출 (상행 슉 + 띵)
    submit: function (g, t) { osc(g, { t: t, f: 500, f1: 1300, bend: 0.12, vol: 0.12, d: 0.14, a: 0.005 }); bell(g, { t: t + 0.12, f: mtof(88), vol: 0.14, d: 0.35, partial: 3, pgain: 0.2, verb: 0.25 }); return t + 0.5; },
    // 카드 확인 (살짝 뒤집는 소리)
    peek: function (g, t) { noise(g, { t: t, type: 'bandpass', f: 1200, f1: 3000, bend: 0.07, q: 0.9, vol: 0.09, d: 0.08, a: 0.008 }); return t + 0.1; }
  };

  /* ---------- BGM ---------- 8마디 루프, 마디 16스텝. mel: 마디당 8분음표 8개 (MIDI, 0=쉼) */
  function marimba(g, t, f, v) { osc(g, { t: t, f: f, vol: v, d: 0.28, a: 0.002, dest: g.bgm }); osc(g, { t: t, f: f * 4, vol: v * 0.18, d: 0.05, a: 0.001, dest: g.bgm }); osc(g, { t: t, f: f * 10, vol: v * 0.05, d: 0.015, a: 0.001, dest: g.bgm }); }
  function musicbox(g, t, f, v) { osc(g, { t: t, f: f, vol: v, d: 0.7, a: 0.002, dest: g.bgm, verb: 0.35 }); osc(g, { t: t, f: f * 4, vol: v * 0.22, d: 0.12, a: 0.001, dest: g.bgm }); osc(g, { t: t, f: f * 6.3, vol: v * 0.06, d: 0.04, a: 0.001, dest: g.bgm }); }
  function vibes(g, t, f, v) { var end = t + 0.5; var tr = tremolo(g, t, end + 0.05, 5.5, 0.75, 0.25, g.bgm); osc(g, { t: t, f: f, vol: v, d: 0.45, a: 0.003, dest: tr }); osc(g, { t: t, f: f * 4, vol: v * 0.12, d: 0.06, a: 0.001, dest: g.bgm }); }
  function synth(g, t, f, v) { osc(g, { t: t, f: f, type: 'square', vol: v * 0.45, d: 0.16, a: 0.003, lp: 1800, q: 1.2, dest: g.bgm }); osc(g, { t: t, f: f * 0.5, type: 'triangle', vol: v * 0.3, d: 0.16, a: 0.003, dest: g.bgm }); }
  function epiano(g, t, f, v) { osc(g, { t: t, f: f, vol: v, d: 0.6, a: 0.003, dest: g.bgm, lp: 2600 }); osc(g, { t: t, f: f * 2, vol: v * 0.3, d: 0.25, a: 0.002, dest: g.bgm }); osc(g, { t: t, f: f * 7, vol: v * 0.05, d: 0.03, a: 0.001, dest: g.bgm }); }
  var INST = { marimba: marimba, musicbox: musicbox, vibes: vibes, synth: synth, epiano: epiano };
  function bassNote(g, t, f, v, d) { osc(g, { t: t, f: f, type: 'triangle', vol: v, d: d || 0.22, a: 0.004, lp: 500, dest: g.bgm }); }
  function subBass(g, t, f, v, d) { osc(g, { t: t, f: f, type: 'sawtooth', vol: v * 0.5, d: d || 0.16, a: 0.003, lp: 420, q: 1.5, dest: g.bgm }); osc(g, { t: t, f: f, vol: v * 0.6, d: d || 0.16, a: 0.003, dest: g.bgm }); }
  function pad(g, t, notes, v, dur) { for (var i = 0; i < notes.length; i++) osc(g, { t: t, f: mtof(notes[i]), type: 'triangle', vol: v, d: 0.6, a: 0.12, hold: dur, lp: 900, dest: g.bgm }); }
  function chordHit(g, t, notes, v) { for (var i = 0; i < notes.length; i++) epiano(g, t, mtof(notes[i]), v); }
  function kick(g, t, v) { osc(g, { t: t, f: 150, f1: 45, bend: 0.05, vol: v, d: 0.12, a: 0.002, dest: g.bgm }); }
  function hat(g, t, v) { noise(g, { t: t, type: 'highpass', f: 7000, vol: v, d: 0.025, a: 0.001, dest: g.bgm }); }
  function brush(g, t, v) { noise(g, { t: t, type: 'highpass', f: 5000, vol: v, d: 0.07, a: 0.01, dest: g.bgm }); }
  function snap(g, t, v) { noise(g, { t: t, type: 'bandpass', f: 1600, q: 1, vol: v, d: 0.06, a: 0.002, dest: g.bgm }); }
  function rim(g, t, v) { noise(g, { t: t, type: 'bandpass', f: 2600, q: 3, vol: v, d: 0.03, a: 0.001, dest: g.bgm }); osc(g, { t: t, f: 900, vol: v * 0.5, d: 0.02, a: 0.001, dest: g.bgm }); }
  function shaker(g, t, v) { noise(g, { t: t, type: 'highpass', f: 6000, vol: v, d: 0.04, a: 0.008, dest: g.bgm }); }

  var THEMES = {
    // 다빈치: A단조 오르골 미스터리
    mystery: { bpm: 92, swing: 0, inst: 'musicbox', melVol: 0.5, bass: 'sparse', drums: 'soft', padOn: true,
      roots: [45, 41, 36, 40, 45, 41, 38, 40],
      chords: [[57, 60, 64], [53, 57, 60], [60, 64, 67], [52, 56, 59], [57, 60, 64], [53, 57, 60], [50, 53, 57], [52, 56, 59]],
      mel: [[69, 0, 72, 0, 76, 0, 72, 0], [77, 0, 76, 0, 72, 0, 69, 0], [72, 0, 76, 0, 79, 0, 76, 0], [80, 0, 71, 0, 0, 0, 76, 0],
            [81, 0, 79, 0, 77, 0, 76, 0], [77, 0, 74, 0, 72, 0, 69, 0], [74, 0, 77, 0, 81, 0, 77, 0], [80, 0, 0, 0, 76, 0, 0, 0]] },
    // 라이어: D단조 스윙 재즈 탐정
    sneaky: { bpm: 116, swing: 0.6, inst: 'vibes', melVol: 0.42, bass: 'walk', drums: 'brush', padOn: false,
      roots: [38, 38, 43, 45, 38, 46, 43, 45],
      walk: [[38, 41, 45, 41], [38, 45, 48, 49], [43, 46, 50, 46], [45, 49, 52, 55], [38, 41, 45, 41], [46, 50, 53, 50], [43, 46, 50, 47], [45, 49, 52, 53]],
      mel: [[74, 0, 77, 0, 74, 0, 0, 0], [74, 0, 77, 81, 0, 79, 77, 0], [79, 0, 82, 0, 79, 0, 0, 0], [76, 0, 73, 0, 0, 0, 76, 0],
            [74, 0, 77, 0, 74, 0, 0, 81], [82, 0, 81, 0, 77, 0, 74, 0], [79, 0, 82, 0, 84, 0, 82, 0], [81, 0, 79, 0, 76, 0, 73, 0]] },
    // 코드네임: E단조 스파이 신스
    spy: { bpm: 122, swing: 0, inst: 'synth', melVol: 0.5, bass: 'drive', drums: 'drive', padOn: false,
      roots: [40, 40, 36, 38, 40, 40, 36, 35],
      mel: [[76, 0, 79, 0, 81, 0, 79, 0], [76, 0, 0, 0, 74, 76, 0, 0], [84, 0, 83, 0, 79, 0, 76, 0], [78, 0, 81, 0, 78, 0, 74, 0],
            [76, 0, 79, 0, 81, 0, 83, 0], [86, 0, 83, 0, 81, 0, 79, 0], [84, 0, 0, 0, 83, 0, 79, 0], [75, 0, 78, 0, 83, 0, 0, 0]] },
    // 그림 전화기: C장조 통통 마림바
    playful: { bpm: 126, swing: 0, inst: 'marimba', melVol: 0.5, bass: 'bounce', drums: 'pop', padOn: false,
      roots: [36, 43, 45, 41, 36, 43, 41, 43],
      mel: [[72, 74, 76, 0, 79, 0, 76, 0], [74, 0, 79, 0, 74, 0, 71, 0], [76, 0, 79, 81, 0, 79, 76, 0], [77, 0, 81, 0, 77, 0, 74, 0],
            [72, 74, 76, 0, 79, 0, 84, 0], [83, 0, 79, 0, 74, 0, 79, 0], [81, 0, 79, 0, 77, 0, 76, 0], [74, 0, 76, 0, 72, 0, 0, 0]] },
    // 루미큐브: F장조 보사노바 라운지
    lounge: { bpm: 100, swing: 0, inst: 'epiano', melVol: 0.42, bass: 'bossa', drums: 'bossa', padOn: false,
      roots: [41, 43, 36, 41, 46, 45, 43, 36],
      chords: [[57, 60, 64], [58, 62, 65], [60, 64, 70], [57, 60, 64], [57, 62, 65], [55, 60, 64], [58, 62, 65], [60, 64, 70]],
      mel: [[69, 0, 72, 0, 76, 0, 0, 0], [74, 0, 0, 72, 0, 70, 0, 0], [76, 0, 0, 74, 0, 72, 0, 0], [69, 0, 0, 0, 0, 0, 72, 74],
            [77, 0, 0, 74, 0, 0, 72, 0], [76, 0, 0, 72, 0, 0, 69, 0], [70, 0, 72, 0, 74, 0, 77, 0], [76, 0, 0, 0, 0, 0, 0, 0]] }
  };
  var STEPS = 16, BARS = 8, TOTAL = STEPS * BARS;

  function scheduleStep(g, th, s, t, stepDur) {
    var bar = Math.floor(s / STEPS), st = s % STEPS, r = th.roots[bar], inst = INST[th.inst];
    var beat = stepDur * 4, barDur = stepDur * 16;
    if (st % 2 === 0) {
      var m = th.mel[bar][st / 2];
      var tt = (st % 4 === 2) ? t + th.swing * stepDur : t;                        // 스윙: 뒷 8분음표 지연
      if (m) inst(g, tt, mtof(m), st % 4 ? th.melVol * 0.8 : th.melVol);
    }
    if (th.padOn && st === 0) pad(g, t, th.chords[bar], 0.16, barDur - 0.3);
    // 베이스
    if (th.bass === 'sparse') { if (st === 0) bassNote(g, t, mtof(r), 0.55, 0.5); else if (st === 8) bassNote(g, t, mtof(r + 7), 0.35, 0.35); }
    else if (th.bass === 'walk') { if (st % 4 === 0) bassNote(g, t, mtof(th.walk[bar][st / 4]), 0.5, 0.3); }
    else if (th.bass === 'drive') { if (st % 2 === 0) subBass(g, t, mtof(r + (st % 4 ? 12 : 0)), st % 4 ? 0.32 : 0.5, 0.14); }
    else if (th.bass === 'bounce') { if (st === 0 || st === 8) bassNote(g, t, mtof(r), 0.6); else if (st === 4 || st === 12) bassNote(g, t, mtof(r + 7), 0.42); else if (st === 6 || st === 14) bassNote(g, t, mtof(r + 12), 0.28); }
    else if (th.bass === 'bossa') { if (st === 0 || st === 8) bassNote(g, t, mtof(r), 0.58, 0.32); else if (st === 6 || st === 14) bassNote(g, t, mtof(r + 7), 0.4, 0.22); if (st === 0 || st === 6 || st === 12) chordHit(g, t, th.chords[bar], 0.2); }
    // 드럼
    if (th.drums === 'soft') { if (st === 0) kick(g, t, 0.35); if (st % 4 === 2) hat(g, t, 0.08); }
    else if (th.drums === 'brush') { if (st % 2 === 0) brush(g, (st % 4 === 2) ? t + th.swing * stepDur : t, st % 4 ? 0.1 : 0.06); if (st === 4 || st === 12) rim(g, t, 0.14); if (st === 0) kick(g, t, 0.28); }
    else if (th.drums === 'drive') { if (st === 0 || st === 8 || st === 10) kick(g, t, 0.55); if (st === 4 || st === 12) snap(g, t, 0.22); if (st % 2 === 0) hat(g, t, st % 4 === 0 ? 0.12 : 0.22); }
    else if (th.drums === 'pop') { if (st === 0 || st === 8 || (st === 10 && bar % 2)) kick(g, t, 0.55); if (st === 4 || st === 12) snap(g, t, 0.2); if (st % 2 === 0) hat(g, t, st % 4 === 0 ? 0.14 : 0.24); }
    else if (th.drums === 'bossa') { if (st === 0 || st === 6 || st === 12) rim(g, t, 0.12); if (st === 0 || st === 8) kick(g, t, 0.3); if (st % 2 === 0) shaker(g, t, st % 4 ? 0.09 : 0.05); }
    void beat;
  }

  var bgm = { timer: null, step: 0, next: 0, stepDur: 0.125 };
  function bgmTick() {
    if (!live || !ctx || ctx.state !== 'running') return;
    var th = THEMES[themeName] || THEMES.playful, now = ctx.currentTime, ahead = now + 0.18;
    if (bgm.next < now - 0.25) { var miss = Math.ceil((now - bgm.next) / bgm.stepDur); bgm.step += miss; bgm.next += miss * bgm.stepDur; }
    while (bgm.next < ahead) { scheduleStep(live, th, bgm.step % TOTAL, bgm.next, bgm.stepDur); bgm.step++; bgm.next += bgm.stepDur; }
  }
  function bgmWanted() { return sceneOn && bgmVol > 0 && frameVisible && !(global.document && global.document.hidden); }
  var frameVisible = true;   // iframe 으로 들어간 경우 숨겨지면 false (IntersectionObserver)
  function bgmStart() {
    if (!live || bgm.timer || !ctx || ctx.state !== 'running') return;
    var th = THEMES[themeName] || THEMES.playful; bgm.stepDur = 60 / th.bpm / 4;
    bgm.step = 0; bgm.next = ctx.currentTime + 0.05; bgm.timer = setInterval(bgmTick, 30); bgmTick();
  }
  function bgmStop() { if (bgm.timer) { clearInterval(bgm.timer); bgm.timer = null; } }
  function bgmSync() { if (bgmWanted()) bgmStart(); else bgmStop(); }

  /* ---------- API ---------- */
  var S = {};
  S.init = function () {
    try {
      if (!AC) return false;
      if (!ctx) { ctx = new AC(); live = buildGraph(ctx, true); ctx.onstatechange = bgmSync; }
      if (ctx.state === 'suspended' && ctx.resume) { var p = ctx.resume(); if (p && p.then) p.then(bgmSync, function () {}); }
      bgmSync(); return true;
    } catch (e) { return false; }
  };
  S.play = function (name, opt) {
    var fn = SFX[name];
    if (!fn || !live || !ctx || ctx.state !== 'running' || sfxVol <= 0) return false;
    if (activeVoices >= MAX_VOICES && !IMPORTANT[name]) return false;
    activeVoices++;
    try { var end = fn(live, ctx.currentTime + 0.005, opt || {}); setTimeout(function () { activeVoices = Math.max(0, activeVoices - 1); }, Math.max(30, (end - ctx.currentTime) * 1000 + 40)); return true; }
    catch (e) { activeVoices = Math.max(0, activeVoices - 1); return false; }
  };
  S.theme = function (n) { if (THEMES[n]) { if (n !== themeName) { themeName = n; bgmStop(); bgmSync(); } } return themeName; };
  S.scene = function (id) { var on = id !== 'home'; if (on !== sceneOn) { sceneOn = on; bgmSync(); } };
  function ramp(param, v) { if (!live) return; param.cancelScheduledValues(ctx.currentTime); param.setTargetAtTime(v, ctx.currentTime, 0.03); }
  S.setBgmVolume = function (v) { bgmVol = clamp(+v || 0, 0, 1); save(); ramp(live && live.bgm.gain, 0.18 * bgmVol); bgmSync(); updateBtn(); return bgmVol; };
  S.setSfxVolume = function (v) { sfxVol = clamp(+v || 0, 0, 1); save(); ramp(live && live.sfx.gain, sfxVol); updateBtn(); return sfxVol; };
  S.setMode = function (m) {   // 호환용: 'all' | 'sfx' | 'off'
    if (m === 'off') { S.setBgmVolume(0); S.setSfxVolume(0); }
    else if (m === 'sfx') { S.setBgmVolume(0); if (sfxVol <= 0) S.setSfxVolume(0.8); }
    else if (m === 'all') { if (bgmVol <= 0) S.setBgmVolume(0.6); if (sfxVol <= 0) S.setSfxVolume(0.8); }
    return mode();
  };
  // 상태 변화 헬퍼
  var lastLog = null, seen = {}, diffs = {}, cdLast = null;
  var LOGMAP = { '🎯': 'correct', '❌': 'wrong', '💡': 'phase', '✅': 'correct', '😐': 'neutral', '💥': 'wrong', '☠': 'boom', '⏱': 'phase', '🟢': 'meld', '🎴': 'draw', '⏭': 'tap', '⏰': 'warn' };
  S.log = function (text) {
    if (!text || text === lastLog) return; var first = lastLog; lastLog = text;
    if (first === null) return;                                   // 입장 직후 첫 로그는 재생 안 함
    var k = Array.from(text)[0]; var n = LOGMAP[k] || LOGMAP[k && k.charAt(0)]; if (n) S.play(n);
  };
  S.once = function (key, name) { if (seen[key]) return false; seen[key] = 1; return S.play(name); };
  S.diff = function (key, n, up, down) { var prev = diffs[key]; diffs[key] = n; if (prev == null) return; if (n > prev && up) S.play(up); else if (n < prev && down) S.play(down); };
  S.countdown = function (left) { if (left === cdLast) return; cdLast = left; if (left > 0 && left <= 10) S.play('tick'); else if (left === 0) S.play('timeup'); };
  S.resetState = function () { lastLog = null; seen = {}; diffs = {}; cdLast = null; };
  Object.defineProperty(S, 'mode', { get: mode });
  Object.defineProperty(S, 'bgmVolume', { get: function () { return bgmVol; } });
  Object.defineProperty(S, 'sfxVolume', { get: function () { return sfxVol; } });
  Object.defineProperty(S, 'ready', { get: function () { return !!ctx && ctx.state === 'running'; } });
  Object.defineProperty(S, 'bgmOn', { get: function () { return !!bgm.timer; } });
  S.names = Object.keys(SFX); S.themes = Object.keys(THEMES);

  /* ---------- 자동: 첫 제스처에 init, 버튼 클릭음, 소리 버튼 ---------- */
  function autoClick(e) {
    var el = e.target && e.target.closest ? e.target : null; if (!el) return;
    if (el.closest('#sndBtn, #sndPanel')) return;
    if (el.closest('.btn:not(:disabled)')) S.play('click');
    else if (el.closest('.chip, .num:not(.off), .wbtn:not(:disabled), .sw, .sz, .slot')) S.play('tap');
  }
  function unlock() { S.init(); }
  var btn = null, panel = null;
  function updateBtn() {
    if (!btn) return; var m = mode();
    btn.textContent = m === 'off' ? '🔇' : m === 'all' ? '🔊' : '🔈';
    btn.title = '소리 조절 (음악 ' + Math.round(bgmVol * 100) + '% · 효과음 ' + Math.round(sfxVol * 100) + '%)';
    if (panel) { panel.bgm.value = Math.round(bgmVol * 100); panel.sfx.value = Math.round(sfxVol * 100); panel.bgmV.textContent = bgmVol > 0 ? Math.round(bgmVol * 100) + '%' : '끔'; panel.sfxV.textContent = sfxVol > 0 ? Math.round(sfxVol * 100) + '%' : '끔'; }
  }
  function slider(d, icon, label, id) {
    var row = d.createElement('label'); row.style.cssText = 'display:flex;align-items:center;gap:8px;font-size:15px;margin:8px 0;cursor:pointer';
    row.innerHTML = '<span style="width:64px;white-space:nowrap">' + icon + ' ' + label + '</span><input type="range" id="' + id + '" min="0" max="100" step="5" style="flex:1;accent-color:#ff7b5e;height:22px;cursor:pointer"><span style="width:38px;text-align:right;font-size:13px;color:#8a5a2a"></span>';
    return row;
  }
  function mountBtn() {
    var d = global.document; if (btn || !d) return;
    btn = d.createElement('button'); btn.id = 'sndBtn'; btn.type = 'button';
    btn.style.cssText = 'position:fixed;left:10px;bottom:10px;z-index:80;width:38px;height:38px;border-radius:50%;border:2px solid rgba(255,255,255,.7);background:rgba(0,0,0,.35);color:#fff;font-size:17px;cursor:pointer;backdrop-filter:blur(4px);box-shadow:0 3px 0 rgba(0,0,0,.3);padding:0;line-height:1';
    var pn = d.createElement('div'); pn.id = 'sndPanel';
    pn.style.cssText = 'position:fixed;left:10px;bottom:56px;z-index:81;display:none;width:min(260px,calc(100vw - 20px));background:#fff3d6;color:#2a2118;border:3px solid #fff;border-radius:16px;padding:12px 14px;box-shadow:0 6px 0 #5c3a1a,0 12px 24px rgba(0,0,0,.3);font-family:inherit;user-select:none';
    pn.innerHTML = '<div style="font-size:14px;color:#8a5a2a;margin-bottom:2px">🔊 소리 조절 <span style="float:right;font-size:12px;opacity:.7">0 = 끔</span></div>';
    var r1 = slider(d, '🎵', '음악', 'sndBgm'), r2 = slider(d, '🔔', '효과음', 'sndSfx'); pn.appendChild(r1); pn.appendChild(r2);
    panel = { el: pn, bgm: r1.querySelector('input'), sfx: r2.querySelector('input'), bgmV: r1.querySelector('span:last-child'), sfxV: r2.querySelector('span:last-child') };
    panel.bgm.addEventListener('input', function () { S.init(); S.setBgmVolume(panel.bgm.value / 100); });
    panel.sfx.addEventListener('input', function () { S.init(); S.setSfxVolume(panel.sfx.value / 100); });
    panel.sfx.addEventListener('change', function () { S.play('correct'); });   // 미리듣기
    btn.onclick = function () { S.init(); var open = pn.style.display === 'none'; pn.style.display = open ? '' : 'none'; if (open) updateBtn(); };
    d.addEventListener('pointerdown', function (e) { if (pn.style.display !== 'none' && !pn.contains(e.target) && e.target !== btn) pn.style.display = 'none'; }, true);
    d.body.appendChild(btn); d.body.appendChild(pn); updateBtn();
    // iframe 안에서 숨겨지면(허브가 다른 페이지로 전환) BGM 정지
    try { if (global.IntersectionObserver && global.top !== global.self) new IntersectionObserver(function (es) { frameVisible = es.some(function (x) { return x.isIntersecting; }); bgmSync(); }).observe(d.body); } catch (e) {}
    global.addEventListener('pagehide', bgmStop);
  }
  if (global.document) {
    ['pointerdown', 'touchend', 'keydown', 'click'].forEach(function (ev) { global.document.addEventListener(ev, unlock, { capture: true, passive: true }); });
    global.document.addEventListener('pointerdown', autoClick, true);
    global.document.addEventListener('visibilitychange', bgmSync);
    if (global.document.readyState === 'loading') global.document.addEventListener('DOMContentLoaded', mountBtn); else mountBtn();
  }

  /* ---------- 오프라인 렌더 (테스트) ---------- */
  function analyze(buf, t0, thr) { var d = buf.getChannelData(0), peak = 0, last = -1, sq = 0; for (var i = 0; i < d.length; i++) { var v = Math.abs(d[i]); sq += v * v; if (v > peak) peak = v; if (v > thr) last = i; } return { peak: peak, rms: Math.sqrt(sq / d.length), duration: last < 0 ? 0 : Math.max(0, (last - t0 * buf.sampleRate) / buf.sampleRate) }; }
  S._render = function (name, opt, seconds) {
    if (!OAC) return Promise.reject(new Error('no OfflineAudioContext')); var fn = SFX[name]; if (!fn) return Promise.reject(new Error('unknown sfx ' + name));
    var sr = 44100, oc = new OAC(1, Math.ceil(sr * (seconds || 3)), sr), g = buildGraph(oc, false), t0 = 0.05, end = fn(g, t0, opt || {});
    return oc.startRendering().then(function (buf) { var a = analyze(buf, t0, 0.01); return { name: name, peak: +a.peak.toFixed(3), duration: +a.duration.toFixed(2), nominal: +(end - t0).toFixed(2), silent: a.peak < 0.02, clip: a.peak > 0.95 }; });
  };
  S._renderBgm = function (theme, seconds) {
    if (!OAC) return Promise.reject(new Error('no OfflineAudioContext')); var th = THEMES[theme]; if (!th) return Promise.reject(new Error('unknown theme ' + theme));
    seconds = seconds || 8; var sr = 44100, oc = new OAC(1, Math.ceil(sr * seconds), sr), g = buildGraph(oc, false), sd = 60 / th.bpm / 4, t = 0.05, s = 0;
    while (t < seconds) { scheduleStep(g, th, s % TOTAL, t, sd); s++; t += sd; }
    return oc.startRendering().then(function (buf) { var a = analyze(buf, 0, 0.01); return { theme: theme, peak: +a.peak.toFixed(3), rms: +a.rms.toFixed(4), seconds: seconds, loopSec: +(TOTAL * sd).toFixed(1) }; });
  };

  global.Sound = S;
})(typeof window !== 'undefined' ? window : this);
