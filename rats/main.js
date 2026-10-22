// 로켓 쥐 — 메인 루프·화면 배치. 원작 update_resolution(scr_camera L41–93): 기본 640×360, view_scale = 정수 배율,
// 카메라 = max(640, w/scale) × max(360, h/scale), GUI 는 창 해상도에 ui_scale(=view_scale) 로 그림.
(function () {
  'use strict';
  const { dcos, dsin, lerp, clamp } = GM;
  const C = RatsCombat, W = C.W, G = RatsGame, UI = RatsUI, A = RatsArt;
  const cv = document.getElementById('game'), g = cv.getContext('2d');
  const V = { w: 640, h: 360, scale: 1, camW: 640, camH: 360, dpr: 1 };
  function resize() {
    V.dpr = Math.min(window.devicePixelRatio || 1, 2);
    const w = Math.round(innerWidth * V.dpr), h = Math.round(innerHeight * V.dpr);
    cv.width = w; cv.height = h; cv.style.width = innerWidth + 'px'; cv.style.height = innerHeight + 'px';
    V.w = w; V.h = h;
    V.scale = Math.max(Math.floor(Math.min(w / 640, h / 360)), 1);   // L56–58 은 round — 웹 창에선 넘치지 않게 내림
    V.portrait = h > w; if (V.portrait) V.scale = Math.max(1, Math.floor(w / 360));   // 세로 폰: 원작엔 없는 화면이라 GUI 를 폭 기준으로
    V.camW = Math.max(640, w / V.scale); V.camH = Math.max(360, h / V.scale);                // L62–66
  }
  addEventListener('resize', resize); resize();

  // ---- 장면 ----------------------------------------------------------------------------------
  const SC = { name: 'menu', t: 0, trans: null };
  window.RatsMain = { SC, V, goto, cv };
  function goto(name) {   // room_transition(o_transition_square): 덮었다가 열기 (square_vel 0.028, 사이 10프레임)
    if (SC.trans) return;
    SC.trans = { to: name, progress: 0, dir: 1, hold: 10 }; RatsSound.play('select');
  }
  function stepTransition() {
    const T = SC.trans; if (!T) return;
    if (T.dir === 1) { T.progress += .028 * (1 + .25 * T.progress); if (T.progress >= 1) { T.progress = 1; T.dir = 0; enterScene(T.to); } }
    else if (T.dir === 0) { if (--T.hold <= 0) T.dir = -1; }
    else { T.progress -= .028 * (1 + .25 * (1 - T.progress)); if (T.progress <= 0) SC.trans = null; }
  }
  function enterScene(name) {
    SC.name = name; SC.t = 0;
    if (name === 'lobby') RatsWorld.enterLobby();
    else if (name === 'game') RatsWorld.enterGame();
    else if (name === 'menu') { C.resetWorld(); RatsSound.music(null); }
  }

  // ---- 루프 (60 스텝/초 고정) ------------------------------------------------------------------
  let last = performance.now(), acc = 0;
  window.__gameSpeed = { mult: 1, set(n) { this.mult = n; return n; } };
  function frame(now) {
    const dt = Math.min(.25, (now - last) / 1000); last = now; acc += dt * window.__gameSpeed.mult;
    let n = 0;
    while (acc >= 1 / 60 && n < 8 * window.__gameSpeed.mult) { tick(); acc -= 1 / 60; n++; }
    if (n >= 8 * window.__gameSpeed.mult) acc = 0;
    render();
    requestAnimationFrame(frame);
  }
  function tick() {
    G.readInput(); SC.t++;
    stepTransition();
    if (SC.name === 'menu') { if (G.I.enter && !SC.trans) goto('lobby'); return; }
    RatsWorld.tick();
    G.stepCamera();
  }
  window.RatsTick = tick; window.RatsRender = () => render();
  // 테스트용 손잡이 (허브 콘솔에서 rats.step(초) 등)
  window.rats = { step(sec = 1) { for (let i = 0; i < sec * 60; i++) tick(); render(); }, get W() { return RatsCombat.W; }, get save() { return RatsGame.SAVE; }, goto: n => enterScene(n), mute() { RatsSound.setVolume('sfx', 0); RatsSound.setVolume('bgm', 0); } };

  // ---- 그리기 ---------------------------------------------------------------------------------
  function render() {
    g.setTransform(1, 0, 0, 1, 0, 0); g.imageSmoothingEnabled = false;
    g.fillStyle = '#120c24'; g.fillRect(0, 0, V.w, V.h);
    if (SC.name === 'menu') drawMenu();
    else {
      const cam = G.CAM, k = (V.portrait ? V.w / 420 : Math.min(V.w / 640, V.h / 360)) / cam.size, vw = V.w / k, vh = V.h / k;   // 원작: 카메라 ≥ 640×360 을 창 전체에 늘려 그림(Draw_77)
      const cx = cam.x + cam.xoffset - vw / 2 + (cam.view_shake_x || 0), cy = cam.y + cam.yoffset - vh / 2 + (cam.view_shake_y || 0);   // L47–51
      g.setTransform(k, 0, 0, k, -cx * k, -cy * k);
      RatsWorld.drawWorld(g, { x: cx, y: cy, w: vw, h: vh, k });
      g.setTransform(1, 0, 0, 1, 0, 0);
      RatsWorld.drawGUI(g, V.scale, V.w, V.h, SC.t);
    }
    drawTransition();
  }
  function drawMenu() {
    const u = V.scale, t = SC.t;
    const grd = g.createLinearGradient(0, 0, 0, V.h); grd.addColorStop(0, '#1b1440'); grd.addColorStop(1, '#3a2470'); g.fillStyle = grd; g.fillRect(0, 0, V.w, V.h);
    for (let i = 0; i < 60; i++) { const x = (i * 97.3 % V.w), y = (i * 53.7 % V.h), s = (Math.sin(t / 30 + i) + 1) * .5 * u + .5; g.fillStyle = '#d9ccff'; g.fillRect(x, y, s, s); }
    // 제목(원작 s_game_logo 294×141 자리) — 직접 그린 글자
    const y = V.h / 2 - 50 * u + 5 * u * dcos(performance.now() / 20);
    UI.textOutline(g, V.w / 2, y, '로켓 쥐', 34 * u, '#ffd25c', '#2b1a10');
    UI.textOutline(g, V.w / 2, y + 30 * u, 'ROCKET RATS', 12 * u, '#ffffff', '#2b1a10');
    const F = A.ratFrames('white'), fr = F.move[Math.floor(t / 3) % 12];
    g.save(); g.translate(V.w / 2 - 32 * u * 1.5, V.h / 2 + 10 * u); g.scale(u * 1.5, u * 1.5); g.drawImage(fr, 0, 0); g.restore();
    if (Math.floor(performance.now() / 600) % 3 !== 2) UI.textOutline(g, V.w / 2, V.h - 60 * u, UI.T('press_start').replace("'Enter'", 'Enter / 스페이스'), 10 * u);   // L138–141
    UI.textOutline(g, 5 * u, V.h - 8 * u, '그림·소리는 새로 만든 팬 이식판', 6 * u, '#9a8fc0', '#120c24', 1, 'left');
  }
  function drawTransition() {
    const T = SC.trans; if (!T) return;
    const p = T.progress, s = 16 * V.scale, cols = Math.ceil(V.w / s) + 1, rows = Math.ceil(V.h / s) + 1;
    g.fillStyle = '#000';
    for (let i = 0; i < cols; i++) for (let j = 0; j < rows; j++) { const d = (i / cols + j / rows) / 2, a = clamp(p * 2 - d, 0, 1); if (a > 0) { const q = s * a; g.fillRect(i * s + (s - q) / 2, j * s + (s - q) / 2, q + 1, q + 1); } }
  }
  requestAnimationFrame(frame);
})();
