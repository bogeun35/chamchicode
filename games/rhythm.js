(() => {
  'use strict';
  const $ = (id) => document.getElementById(id);
  const stage = $('stage'), notesLayer = $('notes'), overlay = $('overlay');
  const keys = ['d', 'f', 'j', 'k'];
  const laneEls = [...document.querySelectorAll('.lane')];
  const tapPads = [...document.querySelectorAll('.tap-pad')];
  const pressTimers = [];
  const travel = 1550;
  const tracks = {
    starlight: {
      id: 'starlight', title: 'Starlight Circuit', bpm: 120, key: 69, bars: 28, duration: 56,
      sections: [
        { name: 'INTRO', bars: 2, root: 0, density: .55, patterns: [[[0,0],[4,2]], [[0,1],[6,3]], [[0,0],[4,2],[7,3]], [[0,1],[4,3]]] },
        { name: 'VERSE', bars: 6, root: 5, density: 1, patterns: [[[0,0],[2,2],[4,1],[6,3]], [[0,1],[4,3],[6,2]], [[0,2],[2,0],[4,3],[6,1]], [[0,3],[3,1],[4,0],[6,2]]] },
        { name: 'LIFT', bars: 4, root: 7, density: 1.2, patterns: [[[0,0],[2,1],[4,2],[6,3]], [[0,1],[2,2],[4,3],[6,0]], [[0,3],[2,2],[4,1],[6,0]], [[0,0],[2,2],[3,3],[4,1],[6,3]]] },
        { name: 'NEON DROP', bars: 12, root: 3, density: 1.35, patterns: [[[0,0],[2,2],[3,3],[4,1],[6,3]], [[0,1],[2,3],[4,0],[5,2],[6,1]], [[0,2],[2,0],[4,3],[6,1],[7,2]], [[0,3],[1,1],[2,2],[4,0],[6,2]]] },
        { name: 'OUTRO', bars: 4, root: 0, density: .7, patterns: [[[0,0],[4,2]], [[0,1],[6,3]], [[0,2],[4,0]], [[0,3]]] },
      ],
    },
    afterglow: {
      id: 'afterglow', title: 'Afterglow Rush', bpm: 150, key: 74, bars: 20, duration: 32,
      sections: [
        { name: 'NIGHT DRIVE', bars: 2, root: 0, density: .8, patterns: [[[0,0],[3,2],[4,1],[7,3]], [[0,1],[2,3],[4,0],[6,2]]] },
        { name: 'CHASE', bars: 6, root: 3, density: 1.15, patterns: [[[0,0],[2,1],[4,2],[6,3]], [[0,3],[1,1],[4,0],[6,2]], [[0,2],[2,0],[3,3],[6,1]], [[0,1],[2,3],[4,0],[5,2],[6,1]]] },
        { name: 'REDLINE', bars: 4, root: 7, density: 1.35, patterns: [[[0,0],[1,2],[3,3],[4,1],[6,2]], [[0,3],[2,1],[4,0],[5,2],[7,1]], [[0,2],[2,3],[3,1],[4,0],[6,2]], [[0,1],[2,0],[4,3],[6,2],[7,1]]] },
        { name: 'AFTERGLOW', bars: 6, root: 5, density: 1.45, patterns: [[[0,0],[2,2],[3,3],[4,1],[6,3]], [[0,1],[2,3],[4,0],[5,2],[6,1]], [[0,2],[1,0],[3,1],[4,3],[6,2],[7,0]], [[0,3],[2,1],[4,2],[5,0],[6,3]]] },
        { name: 'COOLDOWN', bars: 2, root: 0, density: .7, patterns: [[[0,0],[4,2],[6,3]], [[0,1],[4,3]]] },
      ],
    },
  };
  const state = { playing: false, paused: false, pauseAt: 0, track: tracks.starlight, chart: [], score: 0, combo: 0, maxCombo: 0,
    perfect: 0, great: 0, good: 0, miss: 0, startAt: 0, raf: 0, audio: null,
    musicTimer: 0, nextMusicStep: 0, countTimer: 0, judgeTimer: 0, sectionIndex: -1 };
  let best = readBest(state.track);
  let bestGrade = readBestGrade(state.track);

  function readBest(track) {
    try { return Number(localStorage.getItem(`neon-pulse-best-${track.id}`) || 0); }
    catch { return 0; }
  }
  function readBestGrade(track) {
    try { return localStorage.getItem(`neon-pulse-best-grade-${track.id}`) || '—'; }
    catch { return '—'; }
  }
  function updateTrackDisplay() {
    const track = state.track;
    $('best-score').textContent = String(best).padStart(6, '0');
    bestGrade = readBestGrade(track);
    $('best-grade').textContent = bestGrade;
    $('track-time').textContent = `00:00 / 00:${String(track.duration).padStart(2, '0')}`;
    $('track-title').textContent = track.title.toUpperCase();
    $('track-bpm').textContent = `${track.bpm} BPM`;
    $('section-name').textContent = 'SELECT A TRACK';
    document.querySelectorAll('.song-option').forEach(button => {
      const selected = button.dataset.song === track.id;
      button.classList.toggle('selected', selected);
      button.setAttribute('aria-pressed', String(selected));
    });
  }
  function makeChart(track) {
    const events = [];
    const beatMs = 60000 / track.bpm;
    let bar = 0;
    track.sections.forEach(section => {
      section.start = bar * 4 * beatMs;
      section.end = (bar + section.bars) * 4 * beatMs;
      for (let localBar = 0; localBar < section.bars; localBar++) {
        const pattern = section.patterns[localBar % section.patterns.length];
        pattern.forEach(([eighth, lane]) => events.push({
          t: (bar + localBar) * 4 * beatMs + eighth * beatMs / 2 + travel,
          lane, hit: false, missed: false, el: null,
        }));
      }
      bar += section.bars;
    });
    return events.sort((a, b) => a.t - b.t);
  }
  function initAudio() {
    try {
      if (!state.audio) state.audio = new (window.AudioContext || window.webkitAudioContext)();
      if (state.audio.state === 'suspended') state.audio.resume();
    } catch { state.audio = null; }
  }
  function tone(freq, length = .07, wave = 'sine', volume = .045) {
    if (!state.audio) return;
    const ctx = state.audio, osc = ctx.createOscillator(), gain = ctx.createGain();
    osc.type = wave; osc.frequency.value = freq; gain.gain.setValueAtTime(volume, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(.001, ctx.currentTime + length);
    osc.connect(gain); gain.connect(ctx.destination); osc.start(); osc.stop(ctx.currentTime + length);
  }
  function musicTone(freq, at, length, wave, volume) {
    const ctx = state.audio, osc = ctx.createOscillator(), gain = ctx.createGain();
    osc.type = wave; osc.frequency.setValueAtTime(freq, at);
    gain.gain.setValueAtTime(volume, at); gain.gain.exponentialRampToValueAtTime(.001, at + length);
    osc.connect(gain); gain.connect(ctx.destination); osc.start(at); osc.stop(at + length);
  }
  function musicNoise(at, volume = .018, length = .055) {
    const ctx = state.audio, buffer = ctx.createBuffer(1, Math.ceil(ctx.sampleRate * length), ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < data.length; i++) data[i] = Math.random() * 2 - 1;
    const source = ctx.createBufferSource(), gain = ctx.createGain();
    source.buffer = buffer; gain.gain.setValueAtTime(volume, at); gain.gain.exponentialRampToValueAtTime(.001, at + length);
    source.connect(gain); gain.connect(ctx.destination); source.start(at);
  }
  function sectionAt(songMs) {
    return state.track.sections.findIndex(section => songMs >= section.start && songMs < section.end);
  }
  function scheduleMusic() {
    if (!state.playing || state.paused || !state.audio) return;
    const track = state.track, beatMs = 60000 / track.bpm, stepMs = beatMs / 2;
    const now = performance.now(), songElapsed = now - state.startAt - travel;
    while (state.nextMusicStep * stepMs <= songElapsed + 120 && state.nextMusicStep < track.bars * 8) {
      const step = state.nextMusicStep++, beatNo = Math.floor(step / 2), half = step % 2;
      const sectionIndex = sectionAt(step * stepMs);
      if (sectionIndex < 0 || songElapsed - step * stepMs > 100) continue;
      const section = track.sections[sectionIndex];
      const at = state.audio.currentTime + Math.max(0, (state.startAt + travel + step * stepMs - now) / 1000);
      if (!half) {
        if (beatNo % 4 === 0 || beatNo % 4 === 2) {
          musicTone(110, at, .2, 'sine', .10 + section.density * .018);
          musicTone(55, at, .16, 'sine', .07);
        } else musicNoise(at, .025 + section.density * .005);
        // A track-specific pentatonic hook moves to the section's chord root.
        const hook = track.id === 'starlight' ? [0, 7, 10, 7, 3, 7, 12, 10] : [0, 3, 7, 10, 7, 3, 12, 10];
        const semitone = hook[beatNo % hook.length] + section.root;
        musicTone(440 * Math.pow(2, (track.key - 69 + semitone) / 12), at, .18, 'triangle', .018 + section.density * .003);
      }
      musicNoise(at, half ? .007 : .01, .04);
    }
  }
  function reset() {
    cancelAnimationFrame(state.raf);
    clearInterval(state.musicTimer); clearInterval(state.countTimer); clearTimeout(state.judgeTimer);
    state.nextMusicStep = 0; state.sectionIndex = -1; state.paused = false;
    state.score = state.combo = state.maxCombo = state.perfect = state.great = state.good = state.miss = 0;
    state.chart = makeChart(state.track);
    notesLayer.replaceChildren(); $('score').textContent = '000000'; $('combo').textContent = '0';
    $('accuracy').textContent = '100.0%'; $('rank').textContent = '—';
    $('track-time').textContent = `00:00 / 00:${String(state.track.duration).padStart(2, '0')}`;
    $('judgement').className = 'judgement'; $('judgement').textContent = '';
    updateTrackDisplay();
  }
  function start() {
    if (state.playing) return;
    reset(); initAudio(); state.playing = true; state.startAt = performance.now() + 2600;
    $('pause-button').hidden = true;
    state.musicTimer = setInterval(scheduleMusic, 25);
    document.querySelectorAll('.song-option').forEach(button => { button.disabled = true; });
    overlay.classList.add('hidden'); stage.dataset.state = 'playing';
    let count = 3; $('countdown').textContent = count;
    state.countTimer = setInterval(() => {
      count--;
      if (count > 0) { $('countdown').textContent = count; tone(550, .06, 'sine', .025); }
      else { clearInterval(state.countTimer); $('countdown').textContent = 'GO!'; tone(880, .14, 'triangle', .05); setTimeout(() => $('countdown').textContent = '', 350); }
    }, 700);
    state.raf = requestAnimationFrame(frame);
  }
  function frame(now) {
    if (!state.playing || state.paused) return;
    if (now < state.startAt) { state.raf = requestAnimationFrame(frame); return; }
    $('pause-button').hidden = false;
    const elapsed = now - state.startAt, songElapsed = elapsed - travel;
    const seconds = Math.min(state.track.duration, Math.max(0, Math.floor(songElapsed / 1000)));
    $('track-time').textContent = `00:${String(seconds).padStart(2, '0')} / 00:${String(state.track.duration).padStart(2, '0')}`;
    const nextSection = sectionAt(songElapsed);
    if (nextSection !== state.sectionIndex && nextSection >= 0) {
      state.sectionIndex = nextSection;
      $('section-name').textContent = state.track.sections[nextSection].name;
      stage.dataset.section = state.track.sections[nextSection].name.toLowerCase().replaceAll(' ', '-');
    }
    const targetY = stage.clientHeight - 75;
    for (const note of state.chart) {
      if (note.hit || note.missed) continue;
      const appearAt = note.t - travel;
      if (!note.el && elapsed >= appearAt) {
        note.el = document.createElement('div'); note.el.className = `note l${note.lane}`;
        note.el.style.left = `${(note.lane + .5) * 25}%`; notesLayer.append(note.el);
      }
      if (note.el) {
        const progress = (elapsed - appearAt) / travel;
        note.el.style.top = `${progress * targetY - 8}px`;
      }
      if (elapsed > note.t + 160) markMiss(note);
    }
    if (elapsed >= Math.max(state.chart[state.chart.length - 1].t + 170, state.track.duration * 1000 + travel + 100)) { finish(); return; }
    state.raf = requestAnimationFrame(frame);
  }
  function displayJudge(label, kind) {
    const el = $('judgement');
    el.textContent = label; el.className = `judgement show ${kind}`;
    clearTimeout(state.judgeTimer);
    state.judgeTimer = setTimeout(() => { el.classList.remove('show'); }, kind === 'empty' ? 280 : 430);
  }
  function markMiss(note) {
    if (note.hit || note.missed) return;
    note.missed = true; if (note.el) note.el.remove();
    state.combo = 0; state.miss++; displayJudge('MISS', 'miss'); renderStats();
    tone(180, .12, 'triangle', .02);
  }
  function renderStats() {
    $('score').textContent = String(state.score).padStart(6, '0');
    $('combo').textContent = String(state.combo);
    const total = state.perfect + state.great + state.good + state.miss;
    const weighted = state.perfect + state.great * .8 + state.good * .5;
    const accuracy = total ? weighted / total * 100 : 100;
    $('accuracy').textContent = `${accuracy.toFixed(1)}%`;
    $('rank').textContent = grade(accuracy, state.miss);
  }
  function grade(accuracy, misses) {
    if (accuracy >= 98 && misses === 0) return 'S';
    if (accuracy >= 93) return 'A';
    if (accuracy >= 82) return 'B';
    if (accuracy >= 68) return 'C';
    return 'D';
  }
  function press(lane) {
    if (!state.playing || state.paused || performance.now() < state.startAt) return;
    laneEls[lane].classList.add('active');
    if (tapPads[lane]) tapPads[lane].classList.add('active');
    clearTimeout(pressTimers[lane]);
    pressTimers[lane] = setTimeout(() => {
      laneEls[lane].classList.remove('active');
      if (tapPads[lane]) tapPads[lane].classList.remove('active');
    }, 105);
    const elapsed = performance.now() - state.startAt;
    let closest = null, closestDelta = Infinity;
    for (const note of state.chart) {
      if (note.lane !== lane || note.hit || note.missed) continue;
      const delta = Math.abs(note.t - elapsed);
      if (delta <= 160 && delta < closestDelta) { closest = note; closestDelta = delta; }
    }
    if (!closest) { displayJudge('—', 'empty'); return; }
    closest.hit = true; if (closest.el) closest.el.remove();
    const kind = closestDelta <= 45 ? 'perfect' : closestDelta <= 100 ? 'great' : 'good';
    const base = kind === 'perfect' ? 1000 : kind === 'great' ? 700 : 400;
    state[kind]++; state.combo++; state.maxCombo = Math.max(state.maxCombo, state.combo);
    state.score += base + Math.min(state.combo * 5, 500);
    displayJudge(kind.toUpperCase(), kind); renderStats();
    tone(kind === 'perfect' ? 740 : kind === 'great' ? 580 : 420, .06, 'sine', .025);
  }
  function finish() {
    state.playing = false; stage.dataset.state = 'finished';
    clearInterval(state.musicTimer);
    $('pause-button').hidden = true;
    const total = state.perfect + state.great + state.good + state.miss;
    const weighted = state.perfect + state.great * .8 + state.good * .5;
    const accuracy = total ? weighted / total * 100 : 100;
    const finalGrade = grade(accuracy, state.miss);
    const previousBest = best, previousGrade = readBestGrade(state.track);
    const gradeValue = { D: 1, C: 2, B: 3, A: 4, S: 5 };
    const scoreRecord = state.score > previousBest;
    const gradeRecord = gradeValue[finalGrade] > (gradeValue[previousGrade] || 0);
    best = Math.max(previousBest, state.score);
    bestGrade = gradeRecord ? finalGrade : previousGrade;
    try {
      localStorage.setItem(`neon-pulse-best-${state.track.id}`, String(best));
      localStorage.setItem(`neon-pulse-best-grade-${state.track.id}`, bestGrade);
    } catch { /* Keep the session playable if storage is unavailable. */ }
    $('best-score').textContent = String(best).padStart(6, '0');
    $('best-grade').textContent = bestGrade;
    const recordLine = scoreRecord && gradeRecord ? '점수·등급 신기록!' : scoreRecord ? '최고 점수 갱신!' : gradeRecord ? '최고 등급 갱신!' : best > state.score ? `최고 점수까지 ${Math.max(0, best - state.score).toLocaleString()}점!` : '개인 기록 유지!';
    $('overlay-kicker').textContent = `${state.track.title.toUpperCase()} · 결과`;
    $('overlay-title').textContent = `${finalGrade} RANK`;
    $('overlay-copy').innerHTML = `점수 ${state.score.toLocaleString()} · 정확도 ${accuracy.toFixed(1)}%<br>콤보 ${state.maxCombo} · P ${state.perfect} / G ${state.great} / GD ${state.good} / M ${state.miss}<br><b style="color:${scoreRecord || gradeRecord ? 'var(--green)' : 'var(--cyan)'}">${recordLine}</b>`;
    $('start-button').innerHTML = '다시 치기 <span>↻</span>';
    document.querySelectorAll('.song-option').forEach(button => { button.disabled = false; });
    overlay.classList.remove('hidden');
  }
  function updateBestScore() { $('best-score').textContent = String(best).padStart(6, '0'); }
  function pauseGame() {
    if (!state.playing || state.paused || performance.now() < state.startAt) return;
    state.paused = true; state.pauseAt = performance.now();
    cancelAnimationFrame(state.raf); clearInterval(state.musicTimer);
    if (state.audio) state.audio.suspend();
    stage.dataset.state = 'paused';
    $('overlay-kicker').textContent = '일시정지';
    $('overlay-title').textContent = '잠깐 쉬어가요';
    $('overlay-copy').textContent = '멈춘 지점부터 계속해요.';
    $('start-button').innerHTML = '계속하기 <span>→</span>';
    overlay.classList.remove('hidden');
  }
  async function resumeGame() {
    if (!state.playing || !state.paused) return;
    const now = performance.now();
    state.startAt += now - state.pauseAt;
    state.paused = false;
    if (state.audio && state.audio.state === 'suspended') await state.audio.resume();
    stage.dataset.state = 'playing'; overlay.classList.add('hidden');
    state.musicTimer = setInterval(scheduleMusic, 25);
    state.raf = requestAnimationFrame(frame);
  }
  document.querySelectorAll('.song-option').forEach(button => button.addEventListener('click', () => {
    if (state.playing) return;
    state.track = tracks[button.dataset.song]; best = readBest(state.track); bestGrade = readBestGrade(state.track); updateTrackDisplay();
  }));
  document.addEventListener('keydown', event => {
    const key = event.key.toLowerCase(), lane = keys.indexOf(key);
    if (lane >= 0 && !event.repeat) { event.preventDefault(); press(lane); }
    if ((key === ' ' || key === 'escape') && state.playing && !event.repeat) {
      event.preventDefault(); if (state.paused) resumeGame(); else pauseGame();
    } else if ((key === ' ' || key === 'enter') && !state.playing && !overlay.classList.contains('hidden')) {
      event.preventDefault(); start();
    }
  });
  document.addEventListener('keyup', event => {
    const lane = keys.indexOf(event.key.toLowerCase()); if (lane >= 0) laneEls[lane].classList.remove('active');
  });
  tapPads.forEach((pad, index) => {
    pad.addEventListener('pointerdown', event => { event.preventDefault(); press(index); });
    pad.addEventListener('contextmenu', event => event.preventDefault());
  });
  $('pause-button').addEventListener('click', pauseGame);
  $('start-button').addEventListener('click', () => state.paused ? resumeGame() : start());
  window.addEventListener('blur', pauseGame);
  updateTrackDisplay(); reset();
})();
