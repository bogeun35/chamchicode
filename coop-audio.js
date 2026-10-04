/* Original sound palette for Chamchi Code's cooperative playground. */
(() => {
  'use strict';
  let ctx, master, music, effects, limiter, timer, noise, muted = false, volume = .65;
  let nextBeat = 0, step = 0, running = false;
  const voices = new Set(), MAX_VOICES = 32, bpm = 132, tick = 60 / bpm / 2;
  const hz = midi => 440 * Math.pow(2, (midi - 69) / 12);
  function prune() { for (const v of voices) if (v.end < ctx.currentTime) { v.source.disconnect(); v.gain.disconnect(); voices.delete(v); } }
  function voice(freq, when, duration, gain, type = 'triangle', route = effects, endFreq) {
    if (!ctx || ctx.state !== 'running' || muted) return;
    prune();
    if (voices.size >= MAX_VOICES) return;
    const source = freq ? ctx.createOscillator() : ctx.createBufferSource(), envelope = ctx.createGain();
    if (freq) { source.type = type; source.frequency.setValueAtTime(freq, when); if (endFreq) source.frequency.exponentialRampToValueAtTime(endFreq, when + duration); }
    else source.buffer = noise;
    envelope.gain.setValueAtTime(.0001, when);
    envelope.gain.exponentialRampToValueAtTime(Math.max(.0002, gain), when + .007);
    envelope.gain.exponentialRampToValueAtTime(.0001, when + duration);
    source.connect(envelope); envelope.connect(route);
    const record = { source, gain: envelope, end: when + duration + .02, route };
    voices.add(record);
    source.onended = () => { source.disconnect(); envelope.disconnect(); voices.delete(record); };
    source.start(when); source.stop(record.end);
  }
  function create() {
    const Audio = window.AudioContext || window.webkitAudioContext;
    if (!Audio) return false;
    ctx = new Audio({ latencyHint: 'interactive' });
    master = ctx.createGain(); music = ctx.createGain(); effects = ctx.createGain(); limiter = ctx.createDynamicsCompressor();
    music.gain.value = .24; effects.gain.value = .7; master.gain.value = muted ? 0 : volume;
    limiter.threshold.value = -12; limiter.knee.value = 12; limiter.ratio.value = 8; limiter.attack.value = .003; limiter.release.value = .15;
    music.connect(master); effects.connect(master); master.connect(limiter); limiter.connect(ctx.destination);
    noise = ctx.createBuffer(1, Math.ceil(ctx.sampleRate * .3), ctx.sampleRate);
    const data = noise.getChannelData(0); let seed = 531;
    for (let i = 0; i < data.length; i++) { seed = (seed * 16807) % 2147483647; data[i] = seed / 1073741823.5 - 1; }
    return true;
  }
  function schedule() {
    if (!running || !ctx || ctx.state !== 'running') return;
    if (nextBeat < ctx.currentTime) nextBeat = ctx.currentTime + .025;
    while (nextBeat < ctx.currentTime + .12) {
      const local = step % 16, chord = [48, 53, 55, 48][Math.floor(step / 16) % 4];
      if (local % 4 === 0) voice(hz(chord), nextBeat, tick * 1.8, .23, 'triangle', music);
      const phrase = [12, 16, 19, 16, 14, 16, 19, 24, 19, 16, 14, 12, 16, 19, 16, null];
      if (phrase[local] !== null) voice(hz(chord + phrase[local]), nextBeat, tick * .72, .075, 'square', music);
      if (local % 4 === 0) voice(120, nextBeat, .10, .20, 'sine', music, 42);
      if (local % 4 === 2) voice(0, nextBeat, .045, .035, 'triangle', music);
      step++; nextBeat += tick;
    }
  }
  function stopMusic() {
    running = false; clearInterval(timer); timer = undefined;
    for (const v of [...voices]) if (v.route === music) { try { v.source.stop(); } catch (_) {} v.source.disconnect(); v.gain.disconnect(); voices.delete(v); }
  }
  function play(name) {
    if (!ctx || ctx.state !== 'running' || muted) return;
    const t = ctx.currentTime + .003;
    const note = (m, offset = 0, duration = .12, gain = .16, type = 'triangle') => voice(hz(m), t + offset, duration, gain, type);
    switch (name) {
      case 'jump': voice(hz(60), t, .10, .15, 'triangle', effects, hz(72)); break;
      case 'land': voice(95, t, .055, .12, 'sine', effects, 45); break;
      case 'push': voice(70, t, .07, .065, 'triangle', effects, 52); break;
      case 'key': [72, 76, 79, 84].forEach((m, i) => note(m, i * .055, .18)); break;
      case 'switch': note(67, 0, .075); note(72, .075, .14); break;
      case 'join': note(60); note(67, .10); note(72, .20); break;
      case 'start': [60, 64, 67, 72].forEach((m, i) => note(m, i * .08, .18)); break;
      case 'retry': note(67, 0, .10); note(60, .09, .16); break;
      case 'death': voice(hz(60), t, .28, .17, 'triangle', effects, hz(36)); break;
      case 'clear': [72, 76, 79, 84, 79, 84].forEach((m, i) => note(m, i * .13, .30, .18)); break;
    }
  }
  window.CoopAudio = {
    async unlock() { try { if (!ctx && !create()) return false; if (ctx.state === 'suspended') await ctx.resume(); return ctx.state === 'running'; } catch (_) { return false; } },
    setMuted(value) { muted = !!value; if (master) master.gain.setTargetAtTime(muted ? 0 : volume, ctx.currentTime, .02); },
    setVolume(value) { if (!Number.isFinite(value)) return; volume = Math.max(0, Math.min(1, value)); if (master) master.gain.setTargetAtTime(muted ? 0 : volume, ctx.currentTime, .02); },
    startMusic() { if (!ctx || ctx.state !== 'running' || running || document.hidden) return; running = true; step = 0; nextBeat = ctx.currentTime + .025; schedule(); timer = setInterval(schedule, 25); },
    stopMusic, play,
    getState() { return { unlocked: !!ctx && ctx.state === 'running', muted, volume, musicPlaying: running, voices: voices.size }; }
  };
  document.addEventListener('visibilitychange', () => { if (document.hidden) stopMusic(); });
  window.addEventListener('pagehide', () => { stopMusic(); for (const v of [...voices]) { try { v.source.stop(); } catch (_) {} v.source.disconnect(); v.gain.disconnect(); voices.delete(v); } });
})();
