// 로켓 쥐 — 효과음·배경음 전부 Web Audio 합성(원작 소리 파일은 쓰지 않음).
// 이름은 원작 사운드 이름(snd_*)을 따른다. 주소에 ?mute 가 있으면 처음부터 무음(테스트용).
(function () {
  'use strict';
  const AC = window.AudioContext || window.webkitAudioContext;
  let ctx = null, master = null, sfxBus = null, bgmBus = null, noiseBuf = null;
  const muted0 = /[?&]mute\b/.test(location.search);
  const vol = { sfx: .7, bgm: .45 };
  try { const v = JSON.parse(localStorage.getItem('rats_vol') || 'null'); if (v) { vol.sfx = +v.sfx; vol.bgm = +v.bgm; } } catch (e) {}
  if (muted0) { vol.sfx = 0; vol.bgm = 0; }
  function init() {
    if (ctx || !AC) return;
    try {
      ctx = new AC(); master = ctx.createGain(); master.gain.value = .9; master.connect(ctx.destination);
      const comp = ctx.createDynamicsCompressor(); comp.threshold.value = -14; comp.ratio.value = 4; comp.connect(master);
      sfxBus = ctx.createGain(); sfxBus.gain.value = vol.sfx; sfxBus.connect(comp);
      bgmBus = ctx.createGain(); bgmBus.gain.value = vol.bgm; bgmBus.connect(comp);
      const len = ctx.sampleRate; noiseBuf = ctx.createBuffer(1, len, ctx.sampleRate); const d = noiseBuf.getChannelData(0);
      for (let i = 0; i < len; i++) d[i] = Math.random() * 2 - 1;
    } catch (e) { ctx = null; }
  }
  ['pointerdown', 'keydown', 'touchstart'].forEach(ev => addEventListener(ev, () => { init(); if (ctx && ctx.state === 'suspended') ctx.resume(); }, { passive: true }));

  // 기본 소리 조각
  function tone(f0, f1, dur, type = 'square', gain = .2, at = 0, bus = sfxBus) {
    const t = ctx.currentTime + at, o = ctx.createOscillator(), g = ctx.createGain();
    o.type = type; o.frequency.setValueAtTime(f0, t); if (f1 !== f0) o.frequency.exponentialRampToValueAtTime(Math.max(20, f1), t + dur);
    g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(gain, t + .005); g.gain.exponentialRampToValueAtTime(.0005, t + dur);
    o.connect(g); g.connect(bus); o.start(t); o.stop(t + dur + .02);
  }
  function noise(dur, freq, gain = .2, at = 0, q = 1, type = 'bandpass', f1) {
    const t = ctx.currentTime + at, s = ctx.createBufferSource(), f = ctx.createBiquadFilter(), g = ctx.createGain();
    s.buffer = noiseBuf; f.type = type; f.frequency.setValueAtTime(freq, t); if (f1) f.frequency.exponentialRampToValueAtTime(f1, t + dur); f.Q.value = q;
    g.gain.setValueAtTime(gain, t); g.gain.exponentialRampToValueAtTime(.0005, t + dur);
    s.connect(f); f.connect(g); g.connect(sfxBus); s.start(t, Math.random() * .5); s.stop(t + dur + .02);
  }
  const r = (a, b) => a + Math.random() * (b - a);
  const SFX = {
    weapon_shoot: () => { tone(r(820, 900), 300, .07, 'square', .07); noise(.05, 2400, .06); },
    weapon_shotgun_shoot: () => { noise(.16, 1200, .2, 0, .7, 'lowpass', 300); tone(220, 90, .12, 'square', .08); },
    enemy_hit: () => { tone(r(380, 440), 200, .06, 'triangle', .1); },
    enemy_critical_hit: () => { tone(r(900, 1000), 500, .08, 'square', .09); tone(1400, 900, .06, 'triangle', .06, .02); },
    enemy_death: () => { noise(.2, 900, .18, 0, .8, 'lowpass', 200); tone(320, 80, .18, 'square', .06); },
    coin_collect: () => { tone(r(1180, 1260), 1700, .07, 'square', .05); },
    coin_tick_up: () => { tone(1500, 1500, .03, 'square', .03); },
    player_hurt: () => { tone(300, 90, .25, 'sawtooth', .14); noise(.15, 600, .12); },
    player_dodge: () => { noise(.12, 3000, .08, 0, 2, 'bandpass', 6000); },
    player_heal: () => { [660, 880, 1100].forEach((f, i) => tone(f, f, .1, 'triangle', .08, i * .06)); },
    player_death: () => { [520, 390, 260, 130].forEach((f, i) => tone(f, f * .8, .18, 'square', .1, i * .13)); },
    lightning_summon: () => { noise(.3, 4000, .2, 0, .5, 'highpass'); tone(1800, 120, .25, 'sawtooth', .07); },
    arrow_shoot: () => { noise(.08, 5000, .07, 0, 3, 'bandpass', 2000); },
    star_attack: () => { tone(r(1500, 1700), 2400, .06, 'sine', .06); },
    star_summon: () => { [990, 1320, 1760].forEach((f, i) => tone(f, f, .12, 'sine', .07, i * .07)); },
    curse_trigger: () => { tone(200, 400, .3, 'sawtooth', .06); },
    explosion: () => { noise(.35, 500, .25, 0, .6, 'lowpass', 80); },
    reloading_tick: () => { tone(1100, 1100, .02, 'square', .025); },
    reload_done: () => { tone(700, 1050, .05, 'square', .05); },
    upgrade_hover: () => { tone(900, 900, .03, 'square', .03); },
    upgrade_choose: () => { [523, 659, 784, 1046].forEach((f, i) => tone(f, f, .09, 'square', .06, i * .05)); },
    upgrade_roll: () => { for (let i = 0; i < 5; i++) tone(500 + i * 120, 500 + i * 120, .04, 'square', .04, i * .03); },
    upgrade_rare_pops: () => { [784, 988, 1175, 1568].forEach((f, i) => tone(f, f, .12, 'triangle', .07, i * .06)); },
    upgrade_normal_pops: () => { tone(600, 900, .06, 'square', .05); },
    wave_clear: () => { [523, 659, 784, 1046, 1318].forEach((f, i) => tone(f, f, .14, 'square', .06, i * .07)); },
    wave_ticking: () => { tone(1000, 1000, .04, 'square', .05); },
    wave_over: () => { tone(880, 440, .3, 'triangle', .08); },
    game_over_title: () => { [392, 330, 262, 196].forEach((f, i) => tone(f, f, .3, 'triangle', .1, i * .22)); },
    win_title: () => { [523, 659, 784, 1046, 784, 1046, 1318].forEach((f, i) => tone(f, f, .16, 'square', .07, i * .1)); },
    click: () => { tone(1200, 800, .03, 'square', .04); },
    select: () => { tone(700, 1000, .05, 'square', .04); },
    pause: () => { tone(600, 300, .1, 'triangle', .06); },
    footsteps: () => { noise(.03, 700, .03, 0, 1.5); },
    buy: () => { [880, 1175].forEach((f, i) => tone(f, f, .07, 'square', .06, i * .06)); },
    hit_ground: () => { noise(.12, 300, .15, 0, .7, 'lowpass'); },
  };
  const last = {};
  function play(name) {
    if (!ctx || vol.sfx <= 0) return; const f = SFX[name]; if (!f) return;
    const now = performance.now(); if (last[name] && now - last[name] < 30) return; last[name] = now;   // 같은 소리 연타 제한
    try { f(); } catch (e) {}
  }

  // 배경음: 짧은 칩튠 루프(대기실 / 전투). 원작 곡과 무관한 자작 멜로디.
  const SONGS = {
    lobby: { bpm: 96, bass: [48, 48, 55, 55, 53, 53, 50, 52], lead: [72, 0, 76, 79, 77, 0, 74, 72, 74, 0, 71, 72, 69, 0, 67, 0] },
    level: { bpm: 132, bass: [45, 45, 52, 45, 48, 48, 50, 52], lead: [69, 72, 76, 72, 74, 77, 76, 72, 71, 74, 79, 74, 76, 72, 69, 0] },
  };
  let song = null, songTimer = 0, step = 0;
  const mtof = m => 440 * Math.pow(2, (m - 69) / 12);
  function music(name) {
    if (song === name) return; song = name; step = 0; clearInterval(songTimer); songTimer = 0;
    if (!name) return; const S = SONGS[name]; if (!S) return;
    const dt = 60 / S.bpm / 2;
    songTimer = setInterval(() => {
      if (!ctx || vol.bgm <= 0 || document.hidden) return;
      const b = S.bass[Math.floor(step / 2) % S.bass.length], l = S.lead[step % S.lead.length];
      if (step % 2 === 0) tone(mtof(b), mtof(b), dt * 1.8, 'triangle', .12, 0, bgmBus);
      if (l) tone(mtof(l), mtof(l), dt * .9, 'square', .035, 0, bgmBus);
      step++;
    }, dt * 1000);
  }
  function setVolume(kind, v) { vol[kind] = v; if (kind === 'sfx' && sfxBus) sfxBus.gain.value = v; if (kind === 'bgm' && bgmBus) bgmBus.gain.value = v; if (!muted0) try { localStorage.setItem('rats_vol', JSON.stringify(vol)); } catch (e) {} }
  window.RatsSound = { init, play, music, setVolume, vol, get muted() { return vol.sfx <= 0 && vol.bgm <= 0; } };
})();
