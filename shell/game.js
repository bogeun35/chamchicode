// 쉘다이버 본체 — 섬(가로 플랫포머) ↔ 바다(방 안 수영) 두 장면, 원작 규칙·배치. 60프레임 고정 스텝.
(function () {
  'use strict';
  const SD = window.SD, A = window.SDArt, ROOMS = window.SD_ROOMS, ISL = window.SD_ISLAND;
  const $ = id => document.getElementById(id);
  const cv = $('cv'), ctx = cv.getContext('2d');
  const rnd = (a, b) => a + Math.random() * (b - a), irnd = (a, b) => Math.floor(rnd(a, b + 1)), chance = p => p >= Math.random() * 100;
  const clamp = (v, a, b) => v < a ? a : v > b ? b : v, lerp = (a, b, t) => a + (b - a) * t;
  const dist = (a, b, c, d) => Math.hypot(c - a, d - b), dirTo = (a, b, c, d) => Math.atan2(d - b, c - a);
  Sound.theme('lounge'); Sound.scene('game');

  // ── 플레이어·도구 기본 수치 (o_turtle_player / par_player / par_tool / 투사체 Create) ──────
  const P = {
    walk: 2, walkAcc: .25, jump: 4, grav: .2, fall: 4, coyote: 12, buffer: 8,   // 섬 (walk_speed 2, yjump −4, ygravity .2, yspeed_max 4)
    swim: 1.5, swimAcc: .08, swimFric: .03,                                    // 바다 (swim_speed 1.5, water_deceleration .03)
    oxyBase: 100, bubTank: 36, plTank: 30, bubClip: 12, plClip: 30,            // base_oxygen / base_bubbles / base_plasma / 탄창
    pickup: 32, invuln: 60,
  };
  SD.P = P;

  // ── 화면 ───────────────────────────────────────────────────
  let DPR = 1, CW = 0, CH = 0, Z = 2, VW = 320, VH = 180;
  function resize() {
    DPR = Math.min(window.devicePixelRatio || 1, 2); CW = Math.max(innerWidth, 1); CH = Math.max(innerHeight, 1);   // 숨긴 창·iframe 은 처음에 0일 수 있음
    cv.width = Math.round(CW * DPR); cv.height = Math.round(CH * DPR);
    Z = CW >= CH ? Math.min(CW / 320, CH / 180) : Math.min(CW / 200, CH / 300);   // 원작 카메라 320×180 (세로 화면은 200폭)
    VW = CW / Z; VH = CH / Z;
  }
  addEventListener('resize', resize); resize();
  const touchDev = matchMedia('(pointer: coarse)').matches;
  if (touchDev) $('touch').classList.add('on');
  function toast(m) { const t = $('toast'); t.textContent = m; t.classList.add('show'); clearTimeout(toast.t); toast.t = setTimeout(() => t.classList.remove('show'), 2200); }

  // ── 입력 ───────────────────────────────────────────────────
  const K = {}, IN = { mx: 0, my: 0, lmb: false, rmb: false, act: false, actHold: false, jump: false, inv: false, tool: 0, stickL: null, stickR: null, aimX: 0, aimY: 0 };
  addEventListener('keydown', e => {
    if (e.repeat) { K[e.code] = true; return; }
    K[e.code] = true;
    if (e.code === 'KeyE' || e.code === 'Enter') IN.act = true;
    if (e.code === 'Space' || e.code === 'KeyW' || e.code === 'ArrowUp') IN.jump = true;
    if (e.code === 'Tab' || e.code === 'KeyI') { e.preventDefault(); IN.inv = true; }
    if (e.code === 'KeyQ') IN.phone = true;
    if (e.code === 'Digit1') IN.tool = 1; if (e.code === 'Digit2') IN.tool = 2;
    if (e.code === 'KeyR') IN.reload = true;
    if (e.code === 'Escape') IN.back = true;
  });
  addEventListener('keyup', e => { K[e.code] = false; });
  cv.addEventListener('contextmenu', e => e.preventDefault());
  cv.addEventListener('pointerdown', e => {
    if (e.pointerType === 'touch') return touchDown(e);
    IN.mx = e.clientX; IN.my = e.clientY; if (e.button === 0) IN.lmb = true; if (e.button === 2) IN.rmb = true; IN.click = { x: e.clientX, y: e.clientY, b: e.button };
  });
  addEventListener('pointermove', e => { if (e.pointerType === 'touch') return touchMove(e); IN.mx = e.clientX; IN.my = e.clientY; });
  addEventListener('pointerup', e => { if (e.pointerType === 'touch') return touchUp(e); if (e.button === 0) IN.lmb = false; if (e.button === 2) IN.rmb = false; });
  cv.addEventListener('wheel', e => { if (skillUI) skillZoom(e.deltaY < 0 ? 1.15 : 1 / 1.15, e.clientX, e.clientY); else IN.tool = IN.curTool === 1 ? 2 : 1; }, { passive: true });
  // 터치: 왼쪽 반 = 이동 스틱, 오른쪽 반 = 조준 스틱(끌면 그 방향으로 발사)
  const touches = {};
  function stickEl(n) { return $(n === 'L' ? 'stickL' : 'stickR'); }
  function touchDown(e) {
    if (skillUI) return skillTouchDown(e);
    if (scene === 'ocean' && O && O.leaveBtn && !modal) { const bb = O.leaveBtn, px = e.clientX * DPR, py = e.clientY * DPR; if (px >= bb[0] && px <= bb[0] + bb[2] && py >= bb[1] && py <= bb[1] + bb[3]) { confirmLeave(); return; } }
    const side = e.clientX < CW / 2 ? 'L' : 'R';
    if (touches[side]) return;
    touches[side] = { id: e.pointerId, x0: e.clientX, y0: e.clientY, x: e.clientX, y: e.clientY };
    const s = stickEl(side); s.style.display = 'block'; s.style.left = (e.clientX - 60) + 'px'; s.style.top = (e.clientY - 60) + 'px'; s.firstChild.style.transform = '';
    syncSticks();
  }
  function touchMove(e) { if (skillUI) return skillTouchMove(e); for (const k in touches) if (touches[k] && touches[k].id === e.pointerId) { touches[k].x = e.clientX; touches[k].y = e.clientY; } syncSticks(); }
  function touchUp(e) { if (skillUI) return skillTouchUp(e); for (const k in touches) if (touches[k] && touches[k].id === e.pointerId) { touches[k] = null; stickEl(k).style.display = 'none'; } syncSticks(); }
  function syncSticks() {
    for (const k of ['L', 'R']) {
      const t = touches[k]; let v = null;
      if (t) { let dx = t.x - t.x0, dy = t.y - t.y0; const d = Math.hypot(dx, dy), m = 50; if (d > m) { dx *= m / d; dy *= m / d; } stickEl(k).firstChild.style.transform = `translate(${dx}px,${dy}px)`; v = { x: dx / m, y: dy / m, mag: Math.min(1, d / m) }; }
      if (k === 'L') IN.stickL = v; else IN.stickR = v;
    }
  }
  const tbHold = (id, on, off) => { const b = $(id); b.addEventListener('pointerdown', e => { e.stopPropagation(); b.classList.add('on'); on(); }); const up = () => { b.classList.remove('on'); off && off(); }; b.addEventListener('pointerup', up); b.addEventListener('pointerleave', up); b.addEventListener('pointercancel', up); };
  tbHold('tbAct', () => { IN.act = true; IN.tActHold = true; }, () => { IN.tActHold = false; });
  tbHold('tbJump', () => { IN.jump = true; IN.tJump = true; }, () => { IN.tJump = false; });
  tbHold('tbTool', () => { IN.tool = IN.curTool === 1 ? 2 : 1; });
  tbHold('tbInv', () => { IN.inv = true; });
  function axis() {
    let x = (K.KeyD || K.ArrowRight ? 1 : 0) - (K.KeyA || K.ArrowLeft ? 1 : 0), y = (K.KeyS || K.ArrowDown ? 1 : 0) - (K.KeyW || K.ArrowUp ? 1 : 0);
    if (IN.stickL && IN.stickL.mag > .2) { x = IN.stickL.x; y = IN.stickL.y; }
    return { x, y };
  }
  const actHeld = () => K.KeyE || K.Enter || IN.tActHold;

  // ── 타일 충돌 ────────────────────────────────────────────────
  let grid = null, gx0 = 0, gy0 = 0;
  function solid(x, y) {
    if (!grid) return false;
    const c = Math.floor((x - gx0) / 16), r = Math.floor((y - gy0) / 16);
    if (r < 0) return false; if (r >= grid.length) return true;
    const row = grid[r]; if (c < 0 || c >= row.length) return scene === 'island' ? false : true;
    return row.charCodeAt(c) === 35;
  }
  function boxHit(x, y, hw, hh) { for (const [px, py] of [[x - hw, y - hh], [x + hw, y - hh], [x - hw, y + hh], [x + hw, y + hh], [x, y + hh], [x, y - hh], [x - hw, y], [x + hw, y]]) if (solid(px, py)) return true; return false; }
  function moveBox(o, hw, hh) {   // 축별 이동 + 막히면 멈춤
    let hitX = false, hitY = false;
    const sx = Math.sign(o.vx); let ax = Math.abs(o.vx);
    while (ax > 0) { const s = Math.min(1, ax); if (boxHit(o.x + sx * s, o.y, hw, hh)) { hitX = true; o.vx = 0; break; } o.x += sx * s; ax -= s; }
    const sy = Math.sign(o.vy); let ay = Math.abs(o.vy);
    while (ay > 0) { const s = Math.min(1, ay); if (boxHit(o.x, o.y + sy * s, hw, hh)) { hitY = true; o.vy = 0; break; } o.y += sy * s; ay -= s; }
    return { hitX, hitY };
  }

  // ── 장면 상태 ────────────────────────────────────────────────
  let scene = 'island', frame = 0, cam = { x: 0, y: 0 }, shake = 0;
  const pl = { x: 2560, y: 390, vx: 0, vy: 0, face: 1, onGround: false, anim: 0, tool: 1, oxy: 0, oxyMax: 0, bub: 0, bubMax: 0, clip: 0, plas: 0, plasMax: 0, pclip: 0, reload: 0, reloadTool: 0, cd: 0, hurt: 0, inv: 0, dead: false, charge: 0 };
  let O = null;       // 바다 상태 (방, 해파리, 블록, 탄 …)
  let fx = [];        // 연출 입자
  let popups = [];    // 떠오르는 숫자
  let flyers = [];    // 시설 사이 날아가는 해파리 연출
  let modal = null, skillUI = null, invOpen = false, fade = 0, fadeTo = null;

  // ── 섬 시설 (rm_main_island 인스턴스 위치·상호작용 범위) ────────────────────────
  const ST = {
    hammock: { x: 2364, y: 409, range: 64, nm: '해먹' },
    alchemy: { x: 2765, y: 401, range: 50, ox: -16, nm: '연금술 작업대' },
    alchChest: { x: 2837, y: 401, range: 48, nm: '연금술 상자' },
    antenna: { x: 2983, y: 401, range: 48, nm: '스킬 트리' },
    sub: { x: 3200, y: 441, range: 96, oy: -24, nm: '잠수함' },
    chest: { x: 3375, y: 401, range: 70, nm: '상점 상자' },
    store: { x: 3480, y: 401, range: 50, ox: -32, nm: '해파리 상점' },
    storage: { x: 3616, y: 400, range: 40, oy: 16, nm: '잠수함 저장고' },
    trans: { x: 3779, y: 401, range: 50, nm: '해파리 변환기' },
  };
  const hold = {};   // 시설별 홀드 타이머 (넣기/꺼내기 가속)
  function holdTick(key, bonus, kind) {   // kind: 'store' (10/(1+b) → −0.3, 최소 max(ceil(3/(1+b)),2)) | 'chest' (8/(1+b) → −0.1, 최소 2(b≥4면 1))
    const h = hold[key] || (hold[key] = { d: 0, t: 0 });
    const tmax = kind === 'chest' ? 8 / (1 + bonus) : 10 / (1 + bonus), tmin = kind === 'chest' ? (bonus >= 4 ? 1 : 2) : Math.max(Math.ceil(3 / (1 + bonus)), 2);
    if (!actHeld()) { h.t = tmax; h.d = 0; return false; }
    h.t = clamp(h.t || tmax, Math.min(tmin, tmax), Math.max(tmax, tmin));
    if (h.d++ >= h.t) { h.d = 0; h.t = Math.max(h.t - (kind === 'chest' ? .1 : .3), tmin); return true; }
    return false;
  }
  const near = st => dist(st.x + (st.ox || 0), st.y + (st.oy || 0), pl.x, pl.y + 8) < st.range;

  // ── 보너스에서 나오는 최종 수치 ───────────────────────────────────────
  const B = () => SD.B;
  function oxyMax() { return Math.floor((P.oxyBase + SD.b('base_oxygen') + SD.S.oxyPerm) * (1 + SD.b('player_oxygen_max'))); }
  function bubTankMax() { return Math.floor((P.bubTank + SD.b('base_bubbles')) * (1 + SD.b('player_bubbles_max'))); }
  function bubClipMax() { return Math.round(P.bubClip + SD.b('bubble_ammo')); }
  function plTankMax() { return Math.floor((P.plTank + SD.b('base_plasma')) * (1 + SD.b('player_plasma_max'))); }
  function plClipMax() { return Math.ceil(P.plClip + SD.b('plasma_ammo')); }
  function pickupR() { return P.pickup * (1 + SD.b('player_pickup_range')); }
  function moveMul() { return 1 + SD.b('player_movement_speed'); }

  // ═══════════════════════ 섬 ═══════════════════════
  function enterIsland(fromOcean) {
    scene = 'island'; O = null; fx = []; popups = [];
    grid = ISL.main; gx0 = ISL.x0; gy0 = ISL.y0;
    if (fromOcean) { pl.x = 3264; pl.y = 400; } else { pl.x = 2560; pl.y = 392; }
    pl.vx = pl.vy = 0; pl.dead = false;
    while (boxHit(pl.x, pl.y, 5, 8)) pl.y -= 1;
    SD.islandStep();
    cam.x = clamp(pl.x - VW / 2, 2175, Math.max(2175, 4080 - VW)); cam.y = Math.min(pl.y - VH * .66, 470 - VH * .5);
    Sound.theme('lounge');
  }
  function islandUpdate() {
    const ax = axis();
    // 걷기·점프 (중력)
    const spd = P.walk * moveMul(), moving = Math.abs(ax.x) > .1;
    pl.vx = moving ? lerp(pl.vx, Math.sign(ax.x) * spd, pl.onGround ? .2 : .2 * .4) : 0;   // 바닥 0.2 / 공중 0.2×air_friction(0.4), 입력 없으면 즉시 0
    if (Math.abs(ax.x) > .1) pl.face = Math.sign(ax.x);
    // 점프: 코요테 12프레임 · 입력 버퍼 8프레임 · 버튼을 떼면 짧게 끊김 (par_player)
    const held = K.Space || K.KeyW || K.ArrowUp || IN.tJump;
    if (IN.jump) pl.buf = P.buffer; else if (pl.buf > 0) pl.buf--;
    pl.coy = pl.onGround ? P.coyote : Math.max(0, (pl.coy || 0) - 1);
    if (pl.buf > 0 && pl.coy > 0) { pl.vy = -P.jump; pl.buf = 0; pl.coy = 0; pl.cut = true; Sound.play('tap', { pitch: .3 }); }
    if (pl.cut && !held && pl.vy < 0) { pl.vy *= .5; pl.cut = false; }
    pl.vy = Math.min(pl.vy + P.grav, P.fall);
    const h = moveBox(pl, 5, 8);
    pl.onGround = (h.hitY && pl.vy >= 0) || boxHit(pl.x, pl.y + 1, 5, 8);
    // 계단처럼 1~2칸 턱은 올라가기
    if (h.hitX && pl.onGround) for (let up = 1; up <= 6; up++) if (!boxHit(pl.x + Math.sign(ax.x) * 1.5, pl.y - up, 5, 8)) { pl.y -= up; pl.x += Math.sign(ax.x) * 1.5; break; }
    pl.x = clamp(pl.x, 2240, 4072);
    pl.anim += Math.abs(pl.vx) * .12;
    // 시설
    SD.islandStep(); drainEvents();
    let sel = null;
    for (const k in ST) { const st = ST[k]; st.sel = near(st) && canUse(k); if (st.sel && !sel) sel = k; }
    stationLogic(sel);
    // 카메라: 원작 camera_offset 2175 ~ 4080 사이
    cam.x = clamp(lerp(cam.x, pl.x - VW / 2 + pl.face * 18, .12), 2175, Math.max(2175, 4080 - VW));
    cam.y = lerp(cam.y, Math.min(pl.y - VH * .66, 470 - VH * .5), .12);
  }
  function canUse(k) {
    const S = SD.S;
    switch (k) {
      case 'hammock': return !!SD.B.hammock_available;
      case 'alchemy': return !!SD.B.alchemy_station;
      case 'alchChest': return !!SD.B.alchemy_station && S.flaskCoins > 0;
      case 'antenna': return true;
      case 'sub': return true;
      case 'chest': return S.storeCoins > 0;
      case 'store': return SD.invCount('inv') > 0;
      case 'storage': return !!SD.B.submarine_storage && SD.invCount('sub') > 0;
      case 'trans': return !!SD.lv('jellyfish_transmutator') && (SD.S.inv.some(s => s && SD.transFilter(s)) || (!SD.B.transmutator_auto_output && SD.invCount('tout') > 0));
    }
    return false;
  }
  function stationLogic(sel) {
    const S = SD.S;
    if (!sel) { if (IN.act && !modal) { /* 아무것도 없음 */ } return; }
    const st = ST[sel];
    switch (sel) {
      case 'antenna': if (IN.act) openSkill(); break;
      case 'sub': if (IN.act) { if (SD.prestige() >= 1) openBiome(); else { toast('잠수함이 잠겨 있어요 — 왼쪽 안테나(스킬 트리)에서 잠수함을 열어요'); Sound.play('error'); } } break;
      case 'hammock': if (IN.act) startEnding(); break;
      case 'store': if (holdTick('store', SD.b('jellyfish_store'))) { const m = SD.invMove('inv', 'store'); if (m) { flyJelly(pl.x, pl.y - 15, st.x - 30, st.y - 30, m); Sound.play('pickup', { pitch: .5 + Math.random() * .3 }); SD.save(); tut(5); } else toast('상점 슬롯이 가득 찼어요'); } break;
      case 'trans':
        if (holdTick('trans', SD.b('jellyfish_store'))) {
          let m = SD.invMove('inv', 'tin', s => SD.transFilter(s));
          if (m) flyJelly(pl.x, pl.y - 15, st.x, st.y - 40, m);
          else if (!SD.B.transmutator_auto_output && (m = SD.invMove('tout', 'inv'))) flyJelly(st.x, st.y - 40, pl.x, pl.y - 15, m);
          if (m) { Sound.play('pickup', { pitch: .7 }); SD.save(); }
        } break;
      case 'storage': if (holdTick('storage', SD.b('jellyfish_store'))) { const m = SD.invMove('sub', 'inv'); if (m) { flyJelly(st.x, st.y - 30, pl.x, pl.y - 15, m); Sound.play('pickup'); SD.save(); } } break;
      case 'chest':
        if (holdTick('chest', SD.b('chest_speed'), 'chest')) {
          const c = S.storeCoins, div = Math.max(30 - Math.ceil(Math.log10(Math.max(c, 1))) - Math.floor(1.5 * SD.b('chest_speed')), 4);
          const amt = Math.min(1 + Math.floor(c / div), c); S.storeCoins -= amt;
          coinFly(st.x, st.y - 14, 'shell', amt, true); shake = Math.max(shake, 1); Sound.play('coin', { pitch: .3 + Math.random() * .4 }); tut(6);
        } break;
      case 'alchemy':
        if (SD.wallet('shell') >= SD.FLASK_PRICE && holdTick('alch', SD.b('jellyfish_store'))) { SD.pay('shell', SD.FLASK_PRICE); S.alchemyShell += SD.FLASK_PRICE; Sound.play('coin'); SD.save(); }
        else if (IN.act && SD.wallet('shell') < SD.FLASK_PRICE) toast('조개껍데기 ' + SD.fmt(SD.FLASK_PRICE) + '개가 필요해요');
        break;
      case 'alchChest':
        if (holdTick('alchc', SD.b('chest_speed'), 'chest')) { const c = S.flaskCoins, amt = 1 + Math.floor(c / Math.max(30 - Math.ceil(Math.log10(Math.max(c, 1))), 1)); S.flaskCoins -= Math.min(amt, c); coinFly(st.x, st.y - 20, 'flask', Math.min(amt, c), true); Sound.play('coin'); } break;
    }
  }
  function drainEvents() {
    for (const e of SD.events.splice(0)) {
      if (e.k === 'sell') { popups.push({ x: ST.store.x - 20, y: ST.store.y - 70, t: 0, txt: '+' + SD.fmt(e.v), c: e.t >= 3 ? 'rain' : e.t === 2 ? '#ffd84a' : '#7dff9e', ic: 'shell' }); Sound.play('coin', { pitch: .8 }); }
      else if (e.k === 'trans') fxBurst(ST.trans.x, ST.trans.y - 30, '#7ad8a8', 10);
      else if (e.k === 'flask') fxBurst(ST.alchemy.x, ST.alchemy.y - 30, '#3ee08a', 10);
    }
  }

  // ═══════════════════════ 바다 ═══════════════════════
  function enterOcean(levelIndex) {
    const lvl = SD.LEVELS[levelIndex], R = ROOMS[lvl.room];
    scene = 'ocean'; fx = []; popups = [];
    grid = R.main; gx0 = 0; gy0 = 0;
    O = {
      li: levelIndex, lvl, R, w: R.w, h: R.h, jellies: [], blocks: [], shots: [], coins: [], friends: [], lasers: [], puffles: [],
      dJ: -1, dR: -1, dF: -1, drainT: 0, drainStart: 60, gainT: 0, t: 0, got: { jelly: 0, scrap: 0, crystal: 0, mush: 0, obsidian: 0 }, gotRes: { scrap: 0, crystal: 0, mush: 0, obsidian: 0 },
      sub: { x: R.sub[0], y: R.sub[1] }, stor: R.stor ? { x: R.stor[0], y: R.stor[1] } : null, recT: 60, recD: 0, ending: false,
    };
    pl.x = O.sub.x + 10; pl.y = O.sub.y + 30; pl.vx = 0; pl.vy = 0; pl.dead = false; pl.hurt = 0; pl.charge = 0;
    pl.oxyMax = oxyMax(); pl.oxy = pl.oxyMax;
    pl.bubMax = bubTankMax(); pl.bub = pl.bubMax; pl.plasMax = plTankMax(); pl.plas = pl.plasMax;
    pl.ts = null; pl.tool = 1; pl.heat = 0; pl.charge = 0;
    while (boxHit(pl.x, pl.y, 6, 6)) pl.y += 2;
    // 친구들
    for (let i = 0; i < SD.b('starfish_number'); i++) O.friends.push(mkFriend('star', i));
    for (let i = 0; i < SD.b('robot_number'); i++) O.friends.push(mkFriend('robot', i));
    // 시작 시 1400프레임 분량 미리 채우기 (simulate_frames 30 × 1400/30)
    for (let i = 0; i < 1400; i++) spawnStep(true);
    for (const e of O.jellies.concat(O.blocks)) { e.start = 1; e.alpha = 1; e.inv = false; }
    SD.S.stats.dives++; SD.save();
    cam.x = clamp(pl.x - VW / 2, Math.min(0, (O.w - VW) / 2), Math.max(0, O.w - VW)); cam.y = clamp(pl.y - VH / 2, Math.min(-40, (O.h - VH) / 2), Math.max(-40, O.h - VH));
    Sound.theme('mystery');
  }
  // 스폰 (o_level_setup_Step_0): 해파리·자원 각각 최대 40, 퍼플 20
  function spawnStep(sim) {
    const L = O.lvl, eas = SD.b('entity_arrival_speed'), k = 1 + eas * 2;
    const resFreq = SD.b('player_' + { scrap: 'scrap', crystal: 'crystal', mush: 'mushroom', obsidian: 'obsidian' }[L.res] + '_frequency');
    const jf = Math.max(SD.b('player_jellyfish_frequency') + (SD.B.bio[L.biome] || 0), 0);
    const tJ = L.ji / ((1 + jf) * k), tR = L.ri / ((1 + resFreq) * k), tF = 60 / (1 + k);
    if (O.dJ < 0) O.dJ = Math.random() * tJ; if (O.dR < 0) O.dR = Math.random() * tR; if (O.dF < 0) O.dF = Math.random() * tF;
    if (O.jellies.length < 40 && ++O.dJ >= tJ) { O.dJ -= tJ; if (chance(L.jc)) spawnJelly(pick(L.jo), areaPos(O.R.jelly)); }
    if (O.blocks.length < 40 && ++O.dR >= tR) { O.dR -= tR; if (chance(L.rc)) spawnBlock(pick(L.ro), areaPos(O.R.res)); }
    if (O.puffles.length < 20 && ++O.dF >= tF) { O.dF -= tF; if (chance(SD.b('friendly_bubble_chance'))) spawnPuffle(areaPos(O.R.jelly)); }
    if (sim) for (const e of O.jellies.concat(O.blocks)) if (!e.start) { e.ds += 1; if (e.ds >= 1400 / (1 + eas)) e.start = 1; }
  }
  function pick(opts) { let t = 0; for (const o of opts) t += o[1]; let r = Math.random() * t; for (const o of opts) { r -= o[1]; if (r <= 0) return o[0]; } return opts[0][0]; }
  function areaPos(areas) {   // get_random_area_position: 영역 하나 고르고 그 안 랜덤
    if (!areas || !areas.length) return [O.w / 2, O.h / 2];
    for (let tries = 0; tries < 20; tries++) { const a = areas[Math.floor(Math.random() * areas.length)], x = a[0] + Math.random() * a[2], y = a[1] + Math.random() * a[3]; if (!boxHit(x, y, 8, 8)) return [x, y]; }
    const a = areas[0]; return [a[0] + a[2] / 2, a[1] + a[3] / 2];
  }
  function spawnJelly(id, pos, opt) {
    const J = SD.JELLY[id]; opt = opt || {};
    let t = 0; if (!opt.small) { if (chance(SD.b('jellyfish_rainbow_chance'))) t = 3; else if (chance(SD.b('jellyfish_golden_chance'))) t = 2; else if (chance(SD.b('jellyfish_silver_chance'))) t = 1; }
    if (opt.t !== undefined) t = opt.t;
    const sm = opt.small ? J.small : null, hpBase = sm ? sm.hp : J.hp;
    const life = hpBase * SD.TYPE[t].hp;
    const e = { kind: 'jelly', id, t, x: pos[0], y: pos[1], life, lifeMax: life, white: 0, vel: 0, velMax: (sm ? sm.vel : J.vel), var: rnd(.909091, 1.1), out: .6,
      bd: (sm ? sm.bt : J.bt) * Math.random(), bt: sm ? sm.bt : J.bt, boost: true, frame: 0, fspd: rnd(.6, 1), dir: Math.PI / 2, vdir: 0, small: !!opt.small, big: !!J.split && !opt.small,
      start: opt.start ? 1 : 0, ds: 0, alpha: opt.start ? 1 : .2, state: 0, hit: 0, hbar: 0, kx: 0, ky: 0, mult: SD.b('jellyfish_multiply_amount'),
      threat: 0, first: true, atk: 0, atkT: 60 * (1 + SD.b('shock_frequency')) * rnd(.909091, 1.1), exp: 0, expOn: 0, sx: opt.vx || 0, sy: opt.vy || 0, firstHit: true };
    O.jellies.push(e); return e;
  }
  function spawnBlock(type, pos) {
    const Bk = SD.BLOCK[type];
    O.blocks.push({ kind: 'block', type, cur: Bk.cur, v: +type.slice(-1), x: pos[0], y: pos[1], life: Bk.hp, lifeMax: Bk.hp, vel: rnd(.15, .2), vc: 0, dir: Math.random() * Math.PI * 2, ang: Math.floor(Math.random() * 8) * 45, av: Math.random() < .5 ? -1 : 1, start: 0, ds: 0, alpha: .2, hit: 0, white: 0, hbar: 0, coin: irnd(Bk.coin[0], Bk.coin[1]) });
  }
  function spawnPuffle(pos) { O.puffles.push({ kind: 'puffle', x: pos[0], y: pos[1], life: 60, lifeMax: 60, vel: .3, wob: Math.random() * 6, start: 0, ds: 0, alpha: .2, pop: -1 }); }
  function mkFriend(type, i) { return { type, x: pl.x, y: pl.y, vx: 0, vy: 0, ox: rnd(-40, 40), oy: rnd(-30, 10), retarget: irnd(60, 320), d: type === 'robot' ? -irnd(0, 90) : irnd(0, 120), shoot: -1, tx: 0, ty: 0, f: 0 }; }

  function oceanUpdate() {
    O.t++; SD.S.simFrames++; SD.S.stats.time++;
    spawnStep(false);
    // ─ 플레이어 수영
    const ax = axis(), mm = moveMul(), max = P.swim * mm;
    if (!pl.dead) {
      // 8방향, 대각선 정규화 없음. 가속 0.04 / 손 떼면 water_deceleration 0.03. 벽에 막히면 0.7배
      const hx = Math.abs(ax.x) > .1 ? Math.sign(ax.x) : 0, hy = Math.abs(ax.y) > .1 ? Math.sign(ax.y) : 0, m = hx || hy;
      const f = m ? .04 : .03;
      pl.vx = lerp(pl.vx, hx * max, f); pl.vy = lerp(pl.vy, hy * max, f);
      if (hx) pl.face = hx; pl.anim += m ? .2 : .06;
      pl.kbx = lerp(pl.kbx || 0, 0, .08); pl.kby = lerp(pl.kby || 0, 0, .08);
      const vx0 = pl.vx, vy0 = pl.vy; pl.vx += pl.kbx; pl.vy += pl.kby;
      const hit = moveBox(pl, 6, 6);
      pl.vx = hit.hitX ? vx0 * .7 : vx0; pl.vy = hit.hitY ? vy0 * .7 : vy0;
      pl.x = clamp(pl.x, 8, O.w - 8); pl.y = clamp(pl.y, 8, O.h - 8);
    }
    // ─ 산소: 레벨별 drain 을 every 프레임마다
    pl.oxyMax = oxyMax();
    const subR = SD.B.submarine_recover_area_range, inBubble = subR > 0 && dist(pl.x, pl.y, O.sub.x - 6, O.sub.y - 24) < subR / 2;
    // 산소 (par_player_Step_0): 시작 60프레임 유예 → ceil(간격×(1+간격저항))마다 양/(1+양저항) 소모, 회복 스킬은 ceil(240/(1+속도))마다 회복
    if (O.drainStart > 0) O.drainStart--;
    else if (!pl.dead && !O.ending && !inBubble && pl.hurt <= 0) {
      const every = Math.ceil(O.lvl.every * (1 + SD.b('player_oxygen_drain_amount_resistance'))), amt = O.lvl.drain / (1 + SD.b('player_oxygen_drain_rate_resistance') + SD.b('deep_breath'));
      const regenT = Math.ceil(240 / (1 + SD.b('player_oxygen_regen_speed')));
      if (SD.b('player_oxygen_regen_amount') > 0) { if (O.gainT >= regenT) { oxyChange(SD.b('player_oxygen_regen_amount')); O.gainT = 0; } else O.gainT++; }
      if (O.drainT >= every) { oxyChange(-amt); O.drainT = 0; } else O.drainT++;
    } else O.drainT = 0;
    if (inBubble && !pl.dead) {
      if (++O.recD >= O.recT) { O.recD = 0; O.recT = Math.max(O.recT / 4, O.recT - 8);
        if (pl.oxy < pl.oxyMax) oxyChange(pl.oxyMax * SD.B.submarine_recover_amount);
        if (SD.B.submarine_recover_all_tanks) { pl.bub = Math.min(pl.bubMax, pl.bub + pl.bubMax * SD.B.submarine_recover_amount); pl.plas = Math.min(pl.plasMax, pl.plas + pl.plasMax * SD.B.submarine_recover_amount); }
        Sound.play('bubble', { pitch: .6 }); }
    } else { O.recT = 60; O.recD = 0; }
    if (pl.hurt > 0) pl.hurt--;
    // ─ 도구
    if (pl.stun > 0) { pl.stun--; pl.vx = pl.vy = 0; O.lasers = []; } else if (!pl.dead) toolUpdate();
    // ─ 개체
    for (const e of O.jellies) jellyUpdate(e);
    for (const b of O.blocks) blockUpdate(b);
    for (const p of O.puffles) puffleUpdate(p);
    for (const s of O.shots) shotUpdate(s);
    for (const f of O.friends) friendUpdate(f);
    for (const c of O.coins) coinUpdate(c);
    O.jellies = O.jellies.filter(e => !e.dead); O.blocks = O.blocks.filter(e => !e.dead); O.puffles = O.puffles.filter(e => !e.dead);
    O.shots = O.shots.filter(s => !s.dead); O.coins = O.coins.filter(c => !c.dead);
    // ─ 잠수함·저장고 상호작용
    const nearSub = dist(pl.x, pl.y, O.sub.x, O.sub.y - 14) < 80;
    O.nearSub = nearSub && !pl.dead && !O.ending;
    if (O.nearSub && IN.act) confirmLeave();
    if (O.nearSub && IN.click && O.leaveBtn && !modal) {   // 화면 아래 돌아가기 버튼
      const b = O.leaveBtn, px = IN.click.x * DPR, py = IN.click.y * DPR;
      if (px >= b[0] && px <= b[0] + b[2] && py >= b[1] && py <= b[1] + b[3]) { IN.lmb = false; confirmLeave(); }
    }
    if (O.nearSub && IN.click && !modal) {   // 잠수함을 직접 눌러도 돌아가기
      const wx = IN.click.x / Z + cam.x, wy = IN.click.y / Z + cam.y;
      if (Math.abs(wx - O.sub.x) < 32 && wy > O.sub.y - 70 && wy < O.sub.y + 24) { IN.lmb = false; confirmLeave(); }
    }
    O.oxyWarn = pl.oxy <= pl.oxyMax * .3;   // oxygen_warn_start 0.3
    const st = O.stor && SD.B.submarine_storage ? O.stor : null;
    O.nearStor = st && !pl.dead && dist(pl.x, pl.y, st.x, st.y + 16) < 40 && SD.invCount('inv') > 0;
    if (O.nearStor && holdTick('ostor', SD.b('jellyfish_store'))) { const m = SD.invMove('inv', 'sub'); if (m) { flyJelly(pl.x, pl.y, st.x, st.y, m); Sound.play('pickup'); } }
    // ─ 카메라
    cam.x = clamp(lerp(cam.x, pl.x - VW / 2, .1), Math.min(0, (O.w - VW) / 2), Math.max(0, O.w - VW));
    cam.y = clamp(lerp(cam.y, pl.y - VH / 2, .1), Math.min(-40, (O.h - VH) / 2), Math.max(-40, O.h - VH));
    if (pl.dead && --pl.deadT <= 0 && !modal) endDive(true);
  }
  function oxyChange(d) {
    if (d < 0 && SD.cheatOxy) return;
    pl.oxy = clamp(pl.oxy + d, 0, pl.oxyMax);
    if (pl.oxy <= 0 && !pl.dead) { pl.dead = true; pl.deadT = 120; Sound.play('lose'); shake = 4; toast('산소가 다 떨어졌어요!'); }
  }

  // 해파리 (par_jellyfish + 바이옴별 Step)
  function jellyUpdate(e) {
    const J = SD.JELLY[e.id], eas = SD.b('entity_arrival_speed');
    if (!e.start) { const T = 1400 / (1 + eas); e.ds++; e.alpha = lerp(.2, 1, Math.pow(e.ds / T, 2) * .9); if (e.ds >= T) { e.start = 1; e.alpha = 1; } }
    else e.out = lerp(e.out, 1, .2);
    if (e.white > 0) e.white--; if (e.hbar > 0) e.hbar--;
    if (e.state === 1) {   // 거품에 갇혀 떠오름 → 플레이어에게
      e.cd++;
      if (e.cd < 60) { e.y -= .2; e.x += .2 * Math.cos(e.cd / 7); }
      else if (e.lost || pl.dead) { e.alpha -= .04; if (e.alpha <= 0) e.dead = true; }
      else {
        if (e.cd < 90) return;
        e.v2 = lerp(e.v2 || 0, 16, (e.v2 || 0) / 16 * .3 + .001);
        const d = dist(e.x, e.y, pl.x, pl.y), a = dirTo(e.x, e.y, pl.x, pl.y);
        e.x += Math.cos(a) * e.v2; e.y += Math.sin(a) * e.v2;
        if (d <= 4 || dist(e.x, e.y, pl.x, pl.y) > d && d < 16 || d < e.v2) { e.dead = true; fxBurst(pl.x, pl.y, '#cfefff', 6); Sound.play('pickup', { pitch: .6 + Math.random() * .3 }); }
      }
      return;
    }
    // 펄스 수영
    const biome = J.b, timer = e.bt * (e.threatT > 0 && (biome === 1) ? 1 / 3 : 1);
    if (e.hit > 0) { e.hit--; e.vel = lerp(e.vel, 0, .08); } else e.vel = lerp(e.vel, 0, .02);
    let target = Math.PI / 2;   // 위 (화면 좌표에선 -y)
    if (biome === 1 || biome === 3) {   // 빙하: 가까이 오면 도망 / 용암: 위협 범위 240
      const d = dist(e.x, e.y, pl.x, pl.y), rin = biome === 1 ? 100 : 240, rout = biome === 1 ? 150 : 240;
      if (e.start) { if (!e.first && d > rout) e.first = true; if (e.first && d <= rin) { e.bd += 20; e.first = false; } if (d <= rin || (e.threatT > 0 && d <= rout)) e.threatT = 60; }
      if (e.threatT > 0) { e.threatT--; if (biome === 1) target = Math.atan2(-(pl.y - e.y), pl.x - e.x) + Math.PI; }
    }
    if (e.bd < timer) { e.bd++; e.boost = true; e.frame = 0; if (biome === 1) e.vdir = 0; }
    else {
      e.frame += e.fspd * .2;
      if (e.frame >= J.bf && e.boost) { e.vel = e.velMax; e.boost = false; }
      if (e.frame >= 6) e.bd = 0;
      if (biome === 1) e.vdir = e.boost ? lerp(e.vdir, .3, .2) : lerp(e.vdir, .02 * (1 - e.vel / e.velMax), .2);
    }
    if (biome === 1) { let dd = target - e.dir; while (dd > Math.PI) dd -= Math.PI * 2; while (dd < -Math.PI) dd += Math.PI * 2; e.dir += dd * e.vdir; } else e.dir = Math.PI / 2;
    const spd = e.vel * (e.start ? 1 : Math.pow(e.ds / 1400, 2) * .9) * e.var * e.out;
    e.x += Math.cos(e.dir) * spd + e.kx; e.y -= Math.sin(e.dir) * spd - e.ky;
    e.kx *= .9; e.ky *= .9;
    if (e.small) { e.x += e.sx; e.y += e.sy; e.sx *= .94; e.sy *= .94; }
    // 위로 나가면 아래에서 다시 (HP 회복, 희귀 해제)
    if (e.y < -20 && !e.small) { e.y = O.h + 14; e.life = e.lifeMax = J.hp; e.t = 0; e.x = areaPos(O.R.jelly)[0]; }
    if (e.small && e.y < -30) e.dead = true;
    // 용암: 충격파 (40% 확률로 개시 → 120프레임 경고 → 폭발)
    if (biome === 3 && e.start) {
      if (e.expOn > 0) { e.expOn--; touchDamage(e, J.range); }
      else if (e.threatT > 0 || e.atk >= e.atkT) {
        if (e.atk < e.atkT) { e.atk++; if (e.atk >= e.atkT && !chance(40)) e.atk = 0; }
        else if (++e.exp >= 120) { e.exp = 0; e.atk = 0; e.expOn = 24; shake = Math.max(shake, 2); Sound.play('boom', { pitch: .4 }); fxRing(e.x, e.y, J.range, '#ff8a8a'); }
      } else e.exp = Math.max(0, e.exp - 2);
    }
  }
  function touchDamage(e, r) {
    if (pl.dead || pl.hurt > 0) return;
    if (dist(e.x, e.y, pl.x, pl.y) < r) {
      const J = SD.JELLY[e.id], dmg = J.touch / (1 + SD.b('damage_resistance'));
      if (dmg > 500) { oxyChange(-dmg); pl.hurt = Math.round(P.invuln * (1 + SD.b('player_invulnerable_time'))); pl.stun = 20; pl.vx = pl.vy = 0; shake = Math.max(shake, 2); popups.push({ x: pl.x, y: pl.y - 16, t: 0, txt: '-' + SD.fmt(dmg), c: '#ff8a8a' }); }
    }
  }
  function damageEntity(e, dmg, crit, kdir, kb) {
    if (e.state || !e.start || e.dead) return;
    e.life -= dmg; e.white = 6; e.hbar = 60; e.hit = 30;
    popups.push({ x: e.x + rnd(-6, 6), y: e.y - 12, t: 0, txt: SD.fmt(Math.max(1, Math.round(dmg))), c: crit ? '#ffd84a' : '#fff9ef', big: crit });
    if (kdir !== undefined && e.kind === 'jelly') { const k = (kb || 1) * (1 - SD.JELLY[e.id].kb); e.kx += Math.cos(kdir) * k; e.ky += Math.sin(kdir) * k; }
    // 사냥꾼의 버블: 남은 HP 비율 이하이면 즉시 포획
    if (e.kind === 'jelly' && e.life > 0 && e.life <= e.lifeMax * SD.b('bubble_execute_threshold')) e.life = 0;
    if (e.life <= 0) { if (e.kind === 'jelly') catchJelly(e); else if (e.kind === 'block') breakBlock(e); else if (e.kind === 'puffle') popPuffle(e); }
  }
  function catchJelly(e) {
    e.state = 1; e.cd = 0; e.life = 0; shake = Math.max(shake, 2);
    const m = e.mult, amt = 1 + Math.floor(m) + (chance((m - Math.floor(m)) * 100) ? 1 : 0);
    const got = pl.dead ? 0 : SD.invAdd('inv', e.id, e.t, amt);
    if (got <= 0) { e.lost = true; toast('가방이 가득 찼어요!'); } else { O.got.jelly += got; SD.S.stats.jelly += got; tut(2); }
    Sound.play(e.t >= 3 ? 'win' : e.t >= 1 ? 'reveal' : 'bubble', { pitch: .5 + Math.random() * .3 });
    if (SD.B.catch_oxygen) oxyChange(SD.B.catch_oxygen);
    if (SD.B.jellyfish_oxygen_max_increase) { SD.S.oxyPerm += SD.B.jellyfish_oxygen_max_increase; }
    // 늪: 큰 개체가 잡히면 작은 개체로 갈라짐
    const J = SD.JELLY[e.id];
    if (e.big) for (let i = 0; i < J.split; i++) { const a = Math.random() * Math.PI * 2, v = rnd(0, 1.6); spawnJelly(e.id, [e.x, e.y], { small: true, t: e.t, start: true, vx: Math.cos(a) * v, vy: Math.sin(a) * v }); }
  }
  function blockUpdate(b) {
    const eas = SD.b('entity_arrival_speed');
    if (!b.start) { const T = 1400 / (1 + eas); b.ds++; b.alpha = lerp(.2, 1, Math.pow(b.ds / T, 2) * .9); if (b.ds >= T) { b.start = 1; b.alpha = 1; } }
    if (b.white > 0) b.white--; if (b.hbar > 0) b.hbar--;
    if (b.hit > 0) { b.hit--; b.vc = lerp(b.vc, b.vel * .3, .2); } else b.vc = lerp(b.vc, b.vel, .02);
    const spd = b.vc * (b.start ? 1 : .5);
    b.x += Math.cos(b.dir) * spd; b.y -= Math.sin(b.dir) * spd; b.ang += spd * b.av * 2;
    if (b.x < -20 || b.x > O.w + 20 || b.y < -20 || b.y > O.h + 20) b.dead = true;
    if ((O.t + (b.x | 0)) % 60 === 0 && boxHit(b.x, b.y, 10, 10) && solid(b.x, b.y)) b.dead = true;
  }
  function breakBlock(b) {
    b.dead = true; shake = Math.max(shake, 3); Sound.play('boom', { pitch: 1 + b.v * .1 });
    if (SD.B.resource_oxygen_max_increase) SD.S.oxyPerm += SD.B.resource_oxygen_max_increase;
    if (chance(SD.b('plasma_explosion_chance'))) explosion(b.x, b.y, (SD.B.plasma_explosion_range || 64), 300 * (1 + SD.b('plasma_explosion_damage')), '#7fe3ff', 'block');
    const bonusK = { scrap: 'player_scrap_amount', crystal: 'player_crystal_amount', mush: 'player_mushroom_amount', obsidian: 'player_obsidian_amount' }[b.cur];
    const a = b.coin * (1 + SD.b(bonusK)); const n = Math.floor(a) + (chance((a % 1) * 100) ? 1 : 0);
    coinFly(b.x, b.y, b.cur, n, false);
    fxBurst(b.x, b.y, { scrap: '#beb6a8', crystal: '#a479ff', mush: '#ffb95f', obsidian: '#ff3444' }[b.cur], 12);
  }
  function puffleUpdate(p) {
    if (!p.start) { p.ds++; p.alpha = lerp(.2, 1, Math.min(1, p.ds / 1400)); if (p.ds >= 1400 / (1 + SD.b('entity_arrival_speed'))) { p.start = 1; p.alpha = 1; } }
    if (p.pop >= 0) { if (--p.pop <= 0) { p.dead = true; explosion(p.x, p.y, SD.B.friendly_bubble_explosion_range || 64, 50 * (1 + SD.b('friendly_bubble_damage')), '#ffc23a', 'jelly'); } return; }
    p.wob += .035; p.y -= p.vel * (p.start ? 1 : .5); p.x += Math.cos(p.wob) * .1;
    if (p.y < -20) { p.y = O.h + 14; p.life = p.lifeMax; p.x = areaPos(O.R.jelly)[0]; }
  }
  function popPuffle(p) { p.pop = 5; Sound.play('bubble', { pitch: 1.2 }); }
  function explosion(x, y, r, dmg, col, what) {   // o_plasma_explosion(자원 블록) / o_bubble_explosion(해파리): 대상당 1회
    fxRing(x, y, r, col); shake = Math.max(shake, 3); Sound.play('boom', { pitch: .8 });
    const list = what === 'block' ? O.blocks : O.jellies;
    for (const e of list.slice()) if (!e.dead && !e.state && e.start && dist(x, y, e.x, e.y) < r / 2 + 8) damageEntity(e, dmg, false, dirTo(x, y, e.x, e.y), 1.5);
  }

  // ── 도구: 1 = 버블 건 (해파리), 2 = 플라즈마 (자원 블록) — par_tool 상태 머신 ─────────────────
  // 산소 비례 보너스: bubble/plasma_damage += oxygen_max × b × 0.01 (par_player_Step_1)
  function bubbleDamage() { return 1 + SD.b('bubble_damage') + oxyMax() * SD.b('player_oxygen_bubble_damage') * .01; }
  function plasmaBonus() { return SD.b('plasma_damage') + oxyMax() * SD.b('player_oxygen_plasma_damage') * .01; }
  function aimDir() {
    if (IN.stickR && IN.stickR.mag > .25) return Math.atan2(IN.stickR.y, IN.stickR.x);
    const wx = IN.mx / Z + cam.x, wy = IN.my / Z + cam.y; return dirTo(pl.x, pl.y - 6, wx, wy);
  }
  // 도구별 상태 (도구를 바꿔도 탄창 유지). ord = base_tool_use_order (문자열 = 사용, 숫자 = 대기 프레임)
  const TOOL = {
    1: { ord: ['use', 8, 'use', 8, 'use'], fire: () => Math.max(Math.ceil(20 / (1 + SD.b('bubble_fire_rate'))), 1), fr: () => SD.b('bubble_fire_rate'), rl: () => SD.b('bubble_reload_speed'), cap: () => bubClipMax(), tank: 'bub' },
    2: { ord: [10, 'use', 10], fire: () => Math.max(Math.ceil(140 / (1 + SD.b('plasma_start_speed'))), 1), fr: () => SD.b('plasma_fire_rate'), rl: () => SD.b('plasma_reload_speed'), cap: () => plClipMax(), tank: 'plas' },
  };
  function newToolState() { return { st: 'idle', df: 0, idx: 0, ud: 0, ammo: -1, dr: 0, extra: 0 }; }
  function toolUpdate() {
    if (!pl.ts) pl.ts = { 1: newToolState(), 2: newToolState() };
    if (IN.tool) { const want = IN.tool; IN.tool = 0; switchTool(want); }
    if (IN.rmb && pl.tool !== 2) switchTool(2);
    if (IN.lmb && !IN.rmb && pl.tool !== 1) switchTool(1);
    IN.curTool = pl.tool;
    const dir = aimDir(); pl.aim = dir; if (Math.abs(Math.cos(dir)) > .2) pl.face = Math.sign(Math.cos(dir));
    const use = (IN.lmb || IN.rmb || (IN.stickR && IN.stickR.mag > .25)) && !pl.dead;
    // 재장전은 선택 안 된 도구도 계속 진행 (mult_reload 기본 true)
    for (const id of [1, 2]) { const t = pl.ts[id]; if (t.ammo === -1) t.ammo = TOOL[id].cap(); if (t.st === 'reload') reloadStep(id, t); }
    const t = pl.ts[pl.tool], T = TOOL[pl.tool], cap = T.cap();
    t.ammo = Math.min(t.ammo, cap);
    pl.clip = pl.ts[1].ammo; pl.pclip = pl.ts[2].ammo;
    O.lasers = [];
    if (t.st !== 'idle') { pl.charge = 0; return; }
    const tank = Math.floor(pl[T.tank]), canReload = t.ammo < cap && tank > 0, hasAmmo = t.ammo > 0;
    if ((IN.reload && canReload) || (t.df >= 10 && t.ammo <= 0 && use && canReload)) { IN.reload = false; t.st = 'reload'; t.dr = 0; t.before = tank + t.ammo; t.spend = Math.min(tank, cap - t.ammo); Sound.play('tick', { pitch: .5 }); return; }
    if (IN.reload) { IN.reload = false; if (!canReload) Sound.play('error'); }
    if (use && !hasAmmo && !canReload && !t.clicked) { t.clicked = true; Sound.play('error'); toast(pl.tool === 1 ? '버블 탱크가 비었어요' : '플라즈마 탱크가 비었어요'); }
    if (!use) t.clicked = false;
    if (pl.tool === 2) return plasmaUpdate(t, T, dir, use, hasAmmo);
    // 버블 건: 쿨다운(20/(1+b)) → 3연발 점사(간격 8/(1+b))
    const full = T.fire();
    if (t.df < full || !hasAmmo) { t.idx = 0; t.ud = 0; }
    else if (!use) { if (t.idx > 0) t.df = 0; t.idx = 0; t.ud = 0; }
    else {
      const e = T.ord[t.idx];
      if (typeof e === 'number') { const timer = Math.max(e / (1 + T.fr()), 1); if (t.ud < timer) t.ud++; else { t.ud = 0; t.idx++; } }
      else { fireBubbleShot(dir); t.ammo--; t.idx++; }
      if (t.idx >= T.ord.length) { t.df = 0; t.idx = 0; t.ud = 0; }
    }
    t.df++;
  }
  function switchTool(want) {
    if (want === pl.tool) return;
    if (want === 2 && !SD.B.is_plasma_tool_available) { if (!pl.plWarn) { pl.plWarn = true; toast('플라즈마 건은 스킬 트리에서 열어요'); } return; }
    pl.tool = want; const t = pl.ts[want]; t.df = 0; t.idx = 0; t.ud = 0; Sound.play('tick');
  }
  // 재장전: delay += 1 + 재장전속도, 120 이 되면 끝. 탄이 한 발씩 차오르고 끝날 때 탱크에서 차감
  function reloadStep(id, t) {
    const T = TOOL[id], cap = T.cap();
    if (pl.dead) return;
    const p = t.dr / 120, target = Math.min(cap, t.before);
    const nv = Math.max(Math.floor(target * p), t.ammo); if (nv > t.ammo && id === pl.tool) Sound.play('tick', { pitch: 1 + p * .5 }); t.ammo = nv;
    if (t.dr < 120) t.dr += 1 + T.rl();
    else { t.st = 'idle'; t.df = 0; t.idx = 0; t.ud = 0; t.dr = 0; t.ammo = target; pl[T.tank] = Math.max(0, pl[T.tank] - t.spend); Sound.play('place'); }
  }
  function fireBubbleShot(dir) {
    const crit = chance(SD.b('bubble_critical_chance')), n = 1 + (chance(SD.b('doppel_bubble_chance')) ? 1 : 0);
    const d2 = dir + rnd(-20, 20) * (1 - .8) * Math.PI / 180;   // tool_precision 0.8 → ±4°
    for (let i = 0; i < n; i++) createBubble(pl.x + Math.cos(d2) * 6, pl.y - 6 + Math.sin(d2) * 6, d2 + (n > 1 ? (i ? .18 : -.18) : 0), 1, crit);
    pl.kbx = Math.cos(dir + Math.PI) * .2; pl.kby = Math.sin(dir + Math.PI) * .2;   // 반동 0.2 (매 프레임 0.08로 줄어듦)
    Sound.play('bubble', { pitch: .9 + Math.random() * .3 });
  }
  // create_bubble: damage = power × (1+bubble_damage) × (crit ? 1+critdmg(기본 1) : 1), vel 4×(1+speed) 매 프레임 2% 감속, 수명 30×(1+lt), 관통 1+b, 벽 통과
  function createBubble(x, y, dir, power, crit, ignore) {
    const sz = .85 + SD.b('bubble_projectile_size');
    const dmg = power * bubbleDamage() * (crit ? 1 + 1 + SD.b('bubble_critical_damage') : 1);
    const b = { type: 'bubble', x, y, dir, vel: 4 * (1 + SD.b('bubble_projectile_speed')), sz, l: 0, scl: power < 1 ? .8 : 1, dmg, crit, life: 30 * (1 + SD.b('bubble_life_time')), pen: 1 + SD.b('bubble_penetration'), hits: new Set(ignore ? [ignore] : []), homing: !!SD.B.homing_bubbles && power >= 1, dh: 10, t: 0, spin: 0, r: 4 };
    O.shots.push(b); return b;
  }
  function shotUpdate(s) {
    s.t++;
    if (s.type === 'bubble') {
      s.l = lerp(s.l, 1, .01 + .3 * s.l);
      s.r = 34 * lerp(.1 * s.sz, .3 * s.sz, s.l) * s.scl;   // s_bubble_big 68px × 0.1→0.3 배 (점점 커짐)
      if (--s.dh <= 0 && s.homing && s.hits.size === 0) {
        const px = s.x + Math.cos(s.dir) * 20 * s.vel, py = s.y + Math.sin(s.dir) * 20 * s.vel; let best = null, bd = 160;
        for (const e of O.jellies) { if (e.state || !e.start) continue; const d = dist(px, py, e.x, e.y); if (d < bd) { bd = d; best = e; if (d < 20) break; } }
        if (best) { let a = dirTo(s.x, s.y, best.x, best.y) - s.dir; while (a > Math.PI) a -= Math.PI * 2; while (a < -Math.PI) a += Math.PI * 2; s.dir += a * .08; }
      }
      for (const e of O.jellies.concat(O.puffles)) {
        if (s.pen <= 0) break;
        if (e.state || !e.start || s.hits.has(e) || e.dead || e.pop >= 0) continue;
        const er = e.kind === 'puffle' ? 9 : (e.big ? 12 : e.small ? 7 : 9);
        if (dist(s.x, s.y, e.x, e.y) < s.r + er) {
          s.hits.add(e);
          let dmg = s.dmg;
          if (e.kind === 'jelly') {
            if (e.life >= e.lifeMax) dmg *= 1 + SD.b('bubble_first_strike');                       // 선제공격
            if (e.life / e.lifeMax < .5 + SD.b('bubble_smite_threshold')) dmg *= 1 + SD.b('bubble_smite');   // 강타 (임계 0.5 + 스킬)
            const ex = SD.b('bubble_execute_threshold'); if (ex > 0 && (e.life - dmg) / e.lifeMax < ex) dmg = e.life;   // 사냥꾼
          }
          damageEntity(e, dmg, s.crit, s.dir, 1.5);
          s.pen -= 1;
          // 다중 버블: 확률 %로 0.5 위력 버블 (2 + 스킬)개
          if (e.kind === 'jelly' && chance(SD.b('chain_bubble_chance'))) { const m = 2 + SD.b('multbubble_number'), off = m > 2 ? Math.PI / 4 : 0; for (let i = 0; i < m; i++) { const a = Math.PI * 2 / m * i + off; createBubble(e.x + Math.cos(a) * 8, e.y + Math.sin(a) * 8, a, .5, chance(SD.b('bubble_critical_chance')), e); } }
        }
      }
      if (s.pen > 0 && s.pen < 1) s.pen = chance(s.pen * 100) ? 1 : 0;
      s.x += Math.cos(s.dir) * s.vel; s.y += Math.sin(s.dir) * s.vel; s.vel = lerp(s.vel, 0, .02); s.spin += s.vel;
      if (s.pen <= 0 || s.life-- <= 0 || s.x < -20 || s.y < -40 || s.x > O.w + 20 || s.y > O.h + 20) { s.dead = true; fxBurst(s.x, s.y, '#fff9ef', 5); }
    } else if (s.type === 'robot' || s.type === 'star') {
      s.x += s.vx; s.y += s.vy; s.vx *= .98; s.vy *= .98;
      if (--s.life <= 0 || solid(s.x, s.y)) { s.dead = true; return; }
      const list = s.type === 'robot' ? O.blocks : O.jellies;
      for (const e of list) if (!e.dead && !e.state && e.start && dist(s.x, s.y, e.x, e.y) < 12) { damageEntity(e, s.dmg, s.crit, Math.atan2(s.vy, s.vx)); s.dead = true; break; }
    }
  }
  // 플라즈마: 140/(1+충전) 프레임 충전 → [10, use, 10] 마다 레이저가 닿은 블록에 1×(1+피해)×(1+더블)×(1+과열) — 쏠 때마다 탄 1
  function plasmaUpdate(t, T, dir, use, hasAmmo) {
    const full = T.fire(), range = 64 * (1 + SD.b('plasma_range'));
    const firing = use && t.df >= full && hasAmmo;
    if (!use || !hasAmmo) { t.df = Math.max(0, Math.floor(t.extra * full / 24)); t.extra = Math.max(t.extra - 1, 0); t.idx = 0; t.ud = 0; }
    else { if (firing) t.extra = 24; if (t.df < full) t.df++; }
    pl.charge = t.df / full;
    pl.heat = firing && SD.b('plasma_overheat_damage') > 0 ? Math.min((pl.heat || 0) + (1 + SD.b('plasma_overheat_speed')) / 180, 1) : lerp(pl.heat || 0, 0, .2);
    if (!firing) { O.laserTarget = null; return; }
    const ox = pl.x + Math.cos(dir) * 8, oy = pl.y - 6 + Math.sin(dir) * 8;
    let best = null, bd = 1e9;
    for (const b of O.blocks) {
      if (b.dead || !b.start) continue;
      const vx = b.x - ox, vy = b.y - oy, along = vx * Math.cos(dir) + vy * Math.sin(dir); if (along < -8 || along > range + 10) continue;
      const perp = Math.abs(-vx * Math.sin(dir) + vy * Math.cos(dir)); if (perp > 12 + b.v * 2) continue;
      if (along < bd) { bd = along; best = b; }
    }
    const len = best ? Math.max(4, bd) : range;
    const lasers = [{ x1: ox, y1: oy, x2: ox + Math.cos(dir) * len, y2: oy + Math.sin(dir) * len, chain: [] }];
    if (SD.B.double_laser) lasers.push({ x1: ox, y1: oy, x2: ox + Math.cos(dir + .06) * len, y2: oy + Math.sin(dir + .06) * len, chain: [] });
    O.lasers = lasers;
    if (best !== O.laserTarget) { O.laserTarget = best; t.idx = 0; t.ud = 0; }
    // 체인 레이저: 맞은 블록에서 가장 가까운 다른 블록으로 차례로 (사거리 이내)
    const chain = [];
    if (best) { let from = best; const used = new Set([best]); for (let i = 0; i < SD.b('plasma_chain_number'); i++) { let nb = null, nd = range; for (const b of O.blocks) { if (used.has(b) || b.dead || !b.start) continue; const d = dist(from.x, from.y, b.x, b.y); if (d < nd) { nd = d; nb = b; } } if (!nb) break; used.add(nb); chain.push(nb); lasers[0].chain.push([from.x, from.y, nb.x, nb.y]); from = nb; } }
    const e = T.ord[t.idx];
    if (typeof e === 'number') { const timer = Math.max(e / (1 + T.fr()), 1); if (t.ud < timer) t.ud++; else { t.ud = 0; t.idx++; } }
    else {
      if (best) {
        const mul = (1 + (SD.B.double_laser ? 1 : 0)) * (1 + SD.b('plasma_overheat_damage') * (pl.heat || 0));
        plasmaHit(best, (1 + plasmaBonus()) * mul);
        chain.forEach((b, k) => plasmaHit(b, (1 + plasmaBonus() + SD.b('plasma_chain_damage') * (SD.B.plasma_chain_further_damage ? k + 1 : 1)) * mul));
        shake = Math.max(shake, .8);
      }
      t.ammo--; t.idx++;
    }
    if (t.idx >= T.ord.length) { t.idx = 0; t.ud = 0; }
    if (t.ammo <= 0) t.df = 0;
  }
  function plasmaHit(b, dmg) {
    damageEntity(b, dmg, false);
    Sound.play('tick', { pitch: 1.4 + Math.random() * .3 });
    // 번개: 확률 %로 lightning_range(90×(1+b)) 안 무작위 블록 1개에 3000×(1+b)
    if (chance(SD.b('plasma_lightning_chance'))) {
      const r = 90 * (1 + SD.b('plasma_lightning_range')), cand = O.blocks.filter(o => o !== b && !o.dead && o.start && dist(b.x, b.y, o.x, o.y) <= r);
      if (cand.length) { const o = cand[Math.floor(Math.random() * cand.length)]; damageEntity(o, 3000 * (1 + SD.b('plasma_lightning_damage')), false); O.lasers.push({ x1: b.x, y1: b.y, x2: o.x, y2: o.y, chain: [] }); shake = Math.max(shake, 4); }
    }
  }
  function friendUpdate(f) {
    f.f += .1;
    if (--f.retarget <= 0) { f.retarget = irnd(60, 320); f.ox = rnd(-40, 40); f.oy = rnd(-30, 10); }
    const gx = pl.x + f.ox, gy = pl.y + f.oy, d = dist(f.x, f.y, gx, gy);
    const v = clamp(d / (f.type === 'robot' ? 4 : 12), 0, f.type === 'robot' ? 16 : 12) * .25;
    if (d > 4) { const a = dirTo(f.x, f.y, gx, gy); f.x += Math.cos(a) * v; f.y += Math.sin(a) * v; }
    const isR = f.type === 'robot', as = 1 + SD.b(isR ? 'robot_fire_rate' : 'starfish_fire_rate'), T = (isR ? 90 : 120) / as;
    if (f.shoot >= 0) { if (++f.shoot >= (isR ? 10 : 30) / as) { f.shoot = -1;
      const crit = chance(SD.b('bubble_critical_chance')), a = dirTo(f.x, f.y, f.tx, f.ty);
      const dmg = isR ? 30000 * (1 + SD.b('robot_damage')) : 200 * (1 + SD.b('starfish_damage'));
      O.shots.push({ type: isR ? 'robot' : 'star', x: f.x, y: f.y, vx: Math.cos(a) * (isR ? 10 : 4), vy: Math.sin(a) * (isR ? 10 : 4), dmg: crit ? dmg * 2 : dmg, crit, life: 120 }); } return; }
    if (pl.dead) return;
    if (++f.d >= T) {
      const list = isR ? O.blocks : O.jellies; let best = null, bd = 200;
      for (const e of list) { if (e.dead || e.state || !e.start) continue; const dd = dist(f.x, f.y, e.x, e.y); if (dd < bd) { bd = dd; best = e; } }
      if (!best) { f.d *= .5; return; }
      f.tx = best.x; f.ty = best.y; f.shoot = 0; f.d = -12 / as;
    }
  }

  // ── 코인(자원·조개) 수집물: 범위 안이면 플레이어에게 날아와 지갑에 ────────────────
  function coinFly(x, y, cur, total, toPlayerNow) {
    if (total <= 0) return;
    const div = total > 5000 ? 6 : total > 2000 ? 5 : total > 500 ? 4 : 3;
    const n = Math.max(1, Math.min(30, Math.round(Math.pow(total, 1 / div)))), each = total / n;
    let acc = 0;
    for (let i = 0; i < n; i++) {
      const v = i === n - 1 ? total - acc : Math.floor(each); acc += v;
      const a = toPlayerNow ? -Math.PI / 2 + rnd(-.6, .6) : Math.random() * Math.PI * 2, sp = toPlayerNow ? rnd(1.5, 3) : rnd(.5, 2.2);
      const c = { cur, v, x, y, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp, t: 0, d: irnd(0, 3) + (toPlayerNow ? 8 : 20), go: toPlayerNow, island: scene === 'island' };
      if (scene === 'island') islandCoins.push(c); else O.coins.push(c);
    }
  }
  const islandCoins = [];
  function coinUpdate(c) {
    c.t++;
    if (!c.go && dist(c.x, c.y, pl.x, pl.y) < pickupR() && c.t > c.d) c.go = true;
    if (c.go && c.t > c.d && !(scene === 'ocean' && pl.dead)) {
      const a = dirTo(c.x, c.y, pl.x, pl.y), sp = Math.min(10, (c.sp = (c.sp || 1) * 1.12));
      c.x += Math.cos(a) * sp; c.y += Math.sin(a) * sp;
      if (dist(c.x, c.y, pl.x, pl.y) < 6) { c.dead = true; gainCoin(c.cur, c.v); }
    } else { c.x += c.vx; c.y += c.vy; c.vx *= .9; c.vy *= .9; if (scene === 'island') c.vy += .15; }
  }
  function gainCoin(cur, v) {
    if (scene === 'ocean' && O && cur !== 'shell' && cur !== 'flask') { O.gotRes[cur] = (O.gotRes[cur] || 0) + v; }
    SD.S.coins[cur] = (SD.S.coins[cur] || 0) + v;
    if (SD.S.stats[cur] !== undefined) SD.S.stats[cur] += v;
    Sound.play('coin', { pitch: .6 + Math.random() * .6 });
  }

  // ── 탐사 종료 ──────────────────────────────────────────────
  function confirmLeave() {
    if (modal) return;
    IN.lmb = IN.rmb = false;
    showModal(`<h2 style="font-size:22px;text-align:center;margin-bottom:6px;text-shadow:0 2px 0 var(--ol)">탐사를 종료하시겠습니까?</h2>
      <p style="text-align:center;color:#fff3df;margin-bottom:12px">잠수함을 타고 섬으로 돌아가요. 잡은 해파리는 그대로 가져가요.</p>
      <div style="display:flex;gap:14px;justify-content:center"><button class="btn ok" id="mYes" style="min-width:96px;font-size:22px">✔</button><button class="btn" id="mNo" style="min-width:96px;font-size:22px;background:#1a2ab8">✖</button></div>`);
    $('mYes').onclick = () => { closeModal(); endDive(false); }; $('mNo').onclick = closeModal;
  }
  function endDive(drowned) {
    if (!O || O.ending) return; O.ending = true;
    const S = SD.S, lost = { jelly: 0 };
    if (drowned) {
      S.stats.drowned++;
      const f = .9 + SD.b('player_jellyfish_kept');   // base_jellyfish_lost 0.9 + 보험(음수)
      if (f > 0) {
        let n = Math.ceil(SD.invCount('inv') * f); lost.jelly = n;
        while (n-- > 0) { const idx = S.inv.map((s, i) => s && s.q > 0 ? i : -1).filter(i => i >= 0); if (!idx.length) break; const i = idx[Math.floor(Math.random() * idx.length)]; S.inv[i].q--; if (S.inv[i].q <= 0) { S.inv.splice(i, 1); S.inv.push(null); } }
        S.stats.jelly = Math.max(0, S.stats.jelly - lost.jelly);
        for (const rk in O.gotRes) { const old = O.gotRes[rk] || 0; if (!old) continue; const nw = Math.ceil(old * (1 - f)); lost[rk] = old - nw; S.coins[rk] = Math.max(0, (S.coins[rk] || 0) - (old - nw)); }
      }
    } else tut(4);
    const res = { drowned, time: O.t, got: O.got, res: O.gotRes, lost, level: O.lvl };
    SD.save();
    fadeTo = () => { enterIsland(true); showResults(res); };
  }
  function showResults(r) {
    const row = (ic, nm, v, l) => `<div style="display:flex;align-items:center;gap:8px;padding:5px 0;border-bottom:2px dashed rgba(46,17,26,.35)"><canvas data-ic="${ic}" width="20" height="20" style="width:22px;height:22px;image-rendering:pixelated"></canvas><span style="flex:1">${nm}</span><b>${SD.fmt(v)}</b>${l ? `<span class="c-red" style="font-size:13px">(−${SD.fmt(l)})</span>` : ''}</div>`;
    const sec = Math.floor(r.time / 60), tm = Math.floor(sec / 60) + ':' + String(sec % 60).padStart(2, '0');
    let h = `<h2 style="font-size:24px;text-align:center;margin-bottom:6px;text-shadow:0 2px 0 var(--ol)">${r.drowned ? '질식했어요…' : '탐사 종료'}</h2>
      <div style="text-align:center;color:var(--dim);margin-bottom:8px">${r.level.bnm} · ${r.level.depth}m</div>`;
    h += row('time', '총 시간', 0).replace('<b>0</b>', `<b>${tm}</b>`);
    h += row('jelly', '수집한 해파리', r.got.jelly, r.lost.jelly);
    for (const k of ['scrap', 'crystal', 'mush', 'obsidian']) if (r.res[k] || r.lost[k]) h += row(k, '수집한 ' + SD.CUR_NM[k], r.res[k] || 0, r.lost[k]);
    h += `<div style="text-align:center;margin-top:12px"><button class="btn ok" id="mOk">계속</button></div>`;
    showModal(h); paintIcons($('modal')); $('mOk').onclick = closeModal;
  }

  // ── 연출 ───────────────────────────────────────────────────
  function fxBurst(x, y, col, n) { for (let i = 0; i < n; i++) { const a = Math.random() * Math.PI * 2, s = rnd(.5, 2.5); fx.push({ x, y, vx: Math.cos(a) * s, vy: Math.sin(a) * s, t: 0, life: irnd(14, 26), col, s: irnd(1, 2) }); } }
  function fxRing(x, y, r, col) { fx.push({ ring: true, x, y, r, t: 0, life: 18, col }); }
  function flyJelly(x1, y1, x2, y2, m) { flyers.push({ x1, y1, x2, y2, t: 0, id: m.id, tt: m.t }); }

  // ═══════════════════════ 그리기 ═══════════════════════
  function W2S(x, y) { return [(x - cam.x) * Z * DPR, (y - cam.y) * Z * DPR]; }
  function spr(img, x, y, ax, ay, flipX, scale, alpha) {   // 월드 좌표 (ax, ay = 기준점 비율)
    const s = (scale || 1);
    const w = img.width * s, h = img.height * s;
    ctx.save(); if (alpha !== undefined) ctx.globalAlpha = alpha;
    ctx.translate(Math.round((x - cam.x) * Z * DPR), Math.round((y - cam.y) * Z * DPR)); ctx.scale(Z * DPR, Z * DPR);
    if (flipX) ctx.scale(-1, 1);
    ctx.drawImage(img, -w * ax, -h * ay, w, h); ctx.restore();
  }
  function rectW(x, y, w, h, col) { ctx.fillStyle = col; ctx.fillRect(Math.round((x - cam.x) * Z * DPR), Math.round((y - cam.y) * Z * DPR), Math.ceil(w * Z * DPR), Math.ceil(h * Z * DPR)); }
  function draw() {
    ctx.imageSmoothingEnabled = false;
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    let sx = 0, sy = 0; if (shake > 0) { sx = rnd(-shake, shake) * .5; sy = rnd(-shake, shake) * .5; shake = Math.max(0, shake - .25); }
    const c0 = cam.x, c1 = cam.y; cam.x += sx; cam.y += sy;
    if (scene === 'island') drawIsland(); else drawOcean();
    cam.x = c0; cam.y = c1;
    drawFx(); drawHud();
    if (fade > 0) { ctx.setTransform(1, 0, 0, 1, 0, 0); ctx.fillStyle = `rgba(46,17,26,${fade})`; ctx.fillRect(0, 0, cv.width, cv.height); }
  }
  // 섬: 노을 하늘 + 모래 띠 원경(패럴랙스) + 타일 지형 + 장식 + 시설
  // 원경 띠: tops = 띠 윗선의 월드 y, par = 패럴랙스(0 고정 ~ 1 월드와 같이), ref = 기준 카메라 y
  function drawBands(cols, tops, par, ref) {
    const k = Z * DPR;
    ctx.fillStyle = cols[0]; ctx.fillRect(0, 0, cv.width, cv.height);
    for (let i = 1; i < cols.length; i++) {
      const band = A.band(cols.join() + i, 440, 160, cols[i], 5 + i * 2, i * 1.7, false), p = par[i];
      const yy = ((tops[i] - cam.y) + (cam.y - ref) * (1 - p)) * k, off = ((-cam.x * p) % 440 + 440) % 440;
      for (let x = -off; x < VW + 440; x += 440) ctx.drawImage(band, Math.round(x * k), Math.round(yy), Math.ceil(440 * k) + 1, Math.ceil(160 * k));
      ctx.fillStyle = cols[i]; ctx.fillRect(0, Math.round(yy + 159 * k), cv.width, cv.height);
    }
  }
  // 타일: 안쪽은 어두운 색, 드러난 테두리에는 원작처럼 둥근 돌(외곽선 포함)을 줄지어 그림. 결과는 방마다 캔버스 하나로 구워 둠
  const tileCache = new Map();
  function bakeTiles(key, rows, pal, mode) {
    let c = tileCache.get(key); if (c) return c;
    const H = rows.length, W = rows[0].length, cv2 = document.createElement('canvas'); cv2.width = W * 16; cv2.height = H * 16;
    const x = cv2.getContext('2d'); x.imageSmoothingEnabled = false;
    const at = (r, c) => r >= 0 && r < H && c >= 0 && c < W && rows[r].charCodeAt(c) === 35;
    const R = (X, Y, w, h, col) => { x.fillStyle = col; x.fillRect(X, Y, w, h); };
    const blob = (cx, cy, rr, col, ol) => { x.fillStyle = ol; x.beginPath(); x.arc(cx, cy, rr + 1, 0, Math.PI * 2); x.fill(); x.fillStyle = col; x.beginPath(); x.arc(cx, cy, rr, 0, Math.PI * 2); x.fill(); x.fillStyle = pal.hi; x.fillRect(Math.round(cx - rr * .4), Math.round(cy - rr * .6), Math.max(1, Math.round(rr * .5)), 1); };
    for (let r = 0; r < H; r++) for (let c = 0; c < W; c++) if (at(r, c)) {
      R(c * 16, r * 16, 16, 16, pal.fill);
      if (((c * 7 + r * 13) % 6) === 0) { R(c * 16 + 5, r * 16 + 6, 3, 3, pal.dot); R(c * 16 + 9, r * 16 + 10, 2, 2, pal.dot); }
    }
    for (let r = 0; r < H; r++) for (let c = 0; c < W; c++) {
      if (!at(r, c)) continue;
      const X = c * 16, Y = r * 16, up = !at(r - 1, c), dn = !at(r + 1, c), lf = !at(r, c - 1), rt = !at(r, c + 1);
      if (mode === 'island') {
        if (up) { R(X, Y, 16, 5, pal.top); R(X, Y + 5, 16, 2, pal.top2); R(X, Y - 1, 16, 1, A.OL); for (let i = 0; i < 16; i += 3) R(X + i, Y - 3 + ((i * 7 + c) % 3), 1, 3, pal.top); }
        if (lf) { R(X, Y, 2, 16, A.OL); } if (rt) { R(X + 14, Y, 2, 16, A.OL); }
        continue;
      }
      const k = (c * 31 + r * 17) % 5;
      if (up) { blob(X + 4, Y + 3, 4 + (k % 2), pal.rock, A.OL); blob(X + 11, Y + 2, 4 + ((k + 1) % 2), pal.rock, A.OL); }
      if (dn) { blob(X + 4, Y + 13, 4, pal.rock, A.OL); blob(X + 12, Y + 14, 3 + (k % 2), pal.rock, A.OL); }
      if (lf) { blob(X + 3, Y + 5, 3 + (k % 2), pal.rock, A.OL); blob(X + 2, Y + 12, 3, pal.rock, A.OL); }
      if (rt) { blob(X + 13, Y + 4, 3, pal.rock, A.OL); blob(X + 14, Y + 11, 3 + (k % 2), pal.rock, A.OL); }
      if (up && pal.moss) for (let i = 0; i < 16; i += 2) R(X + i, Y - 1 - ((i * 5 + c) % 3), 2, 2 + ((i + r) % 2), pal.moss);
    }
    tileCache.set(key, cv2); return cv2;
  }
  function drawBaked(img, x0, y0, alpha) {
    const k = Z * DPR; ctx.save(); if (alpha !== undefined) ctx.globalAlpha = alpha;
    ctx.drawImage(img, Math.round((x0 - cam.x) * k), Math.round((y0 - cam.y) * k), Math.round(img.width * k), Math.round(img.height * k)); ctx.restore();
  }
  function drawIsland() {
    drawBands(A.BG.island, [0, 300, 318, 340, 366], [0, .2, .35, .5, .7], 250);
    // 구름
    const cl = A.cloud(), span = VW + 260; for (let i = 0; i < 4; i++) { const sx = ((i * 170 - cam.x * .15 + frame * .03) % span + span) % span - 130; spr(cl, cam.x + sx, cam.y + 40 + (i % 2) * 22 - (cam.y - 250) * .1, .5, 1, false, 1, .95); }
    // 바다(물) 띠
    const k = Z * DPR, wy = (424 - cam.y) * k;
    ctx.fillStyle = '#3ab0c8'; ctx.fillRect(0, Math.round(wy), cv.width, cv.height); ctx.fillStyle = '#5fd0e0'; ctx.fillRect(0, Math.round(wy), cv.width, Math.ceil(3 * k));
    // 뒤 장식(나무·집)
    for (const d of ISL.deco) if (/^(island_tree|npc_house)/.test(d[0])) drawDeco(d);
    drawBaked(bakeTiles('isl', ISL.main, { fill: '#c9925a', dot: '#a3703f', top: '#6fbf4c', top2: '#45a05a', hi: '#fff', rock: '#c9925a' }, 'island'), ISL.x0, ISL.y0);
    for (const d of ISL.deco) if (!/^(island_tree|npc_house)/.test(d[0])) drawDeco(d);
    // 시설
    const S = SD.S;
    spr(A.hammock(SD.B.hammock_available ? 'ok' : 'broken'), ST.hammock.x, ST.hammock.y + 2, .5, 1);
    spr(A.alchemy(!SD.B.alchemy_station), ST.alchemy.x, ST.alchemy.y + 1, .5, 1);
    spr(A.chest(S.flaskCoins > 0 && ST.alchChest.sel, false), ST.alchChest.x, ST.alchChest.y + 1, .5, 1, false, .8, SD.B.alchemy_station ? 1 : .5);
    spr(A.antenna(frame % 60 < 30 ? 1 : 0), ST.antenna.x, ST.antenna.y + 1, .5, 1);
    spr(A.submarine(), ST.sub.x, ST.sub.y + 6 + Math.sin(frame / 30) * 1.5, .5, 1, false, 1, SD.prestige() >= 1 ? 1 : .55);
    spr(A.chest(ST.chest.sel && actHeld(), !!SD.B.global_chest), ST.chest.x, ST.chest.y + 1, .5, 1);
    spr(A.store(), ST.store.x, ST.store.y + 1, .5, 1);
    spr(A.npc(Math.floor(frame / 20) % 2), ST.store.x - 18, ST.store.y - 14, .5, 1);
    if (SD.B.submarine_storage) spr(A.storage(true), ST.storage.x, 358 + Math.sin(frame / 25) * 2, .5, .5);
    else spr(A.storage(false), ST.storage.x, ST.storage.y + 1, .5, 1);
    spr(A.transmuter(SD.transProgress() > 0, !SD.lv('jellyfish_transmutator')), ST.trans.x, ST.trans.y + 1, .5, 1);
    // 진행 막대 (상점 판매 / 변환 / 연금)
    if (S.store[0]) bar(ST.store.x - 20, ST.store.y - 52, 40, SD.storeProgress(), '#7dff9e');
    if (SD.lv('jellyfish_transmutator') && SD.invCount('tin')) bar(ST.trans.x - 20, ST.trans.y - 48, 40, SD.transProgress(), '#7ad8a8');
    if (S.alchemyShell > 0) bar(ST.alchemy.x - 20, ST.alchemy.y - 48, 40, SD.alchProgress(), '#3ee08a');
    // 상점 상자 잔액
    if (S.storeCoins > 0) labelW(ST.chest.x, ST.chest.y - 30, SD.fmt(S.storeCoins), 'shell');
    if (S.flaskCoins > 0 && SD.B.alchemy_station) labelW(ST.alchChest.x, ST.alchChest.y - 26, SD.fmt(S.flaskCoins), 'flask');
    // 거북이
    const fr = pl.onGround ? (Math.abs(pl.vx) > .2 ? Math.floor(pl.anim) % 4 : 0) : 1;
    spr(A.turtle(fr, false), pl.x, pl.y + 9, .5, 1, pl.face < 0);
    for (const c of islandCoins) spr(A.coin(c.cur), c.x, c.y, .5, .5);
    // 처음 하는 사람 안내: 잠수함을 열기 전엔 안테나, 연 뒤 첫 잠수 전엔 잠수함 위에 화살표
    if (!SD.lv('submarine')) guideArrowIsland(ST.antenna.x, ST.antenna.y - 78);
    else if (!S.stats.dives) guideArrowIsland(ST.sub.x, ST.sub.y - 70);
    // 상호작용 표시
    for (const kk in ST) if (ST[kk].sel) { const st = ST[kk]; prompt(st.x + (st.ox || 0), st.y - 62, kk === 'sub' && SD.prestige() < 1 ? '잠수함 (잠김 — 안테나에서 열기)' : kk === 'sub' ? '잠수하기' : st.nm); break; }
    drawFlyers();
  }
  function drawDeco(d) {
    const [n, x, y, sx] = d;
    let img = null, ax = .5, ay = 1;
    if (n.startsWith('island_tree')) img = A.palm(+n.slice(-1));
    else if (n.startsWith('npc_house')) img = A.house(['blue', 'yellow', 'pink'][(+n.slice(-1) - 1) % 3]);
    else if (n.startsWith('grass')) img = A.sprite('grass' + n, 12, 10, (x2) => { for (let i = 0; i < 5; i++) A.R(x2, 1 + i * 2, 3 + (i % 2) * 2, 1, 7, i % 2 ? '#45c07c' : '#2f9a62'); });
    else if (n.startsWith('flower')) img = A.sprite('flower' + n, 9, 10, (x2) => { A.R(x2, 4, 4, 1, 6, '#2f9a62'); A.E(x2, 4.5, 3, 3, 2.5, ['#ff8ab0', '#ffd36b', '#c79bff', '#ffffff'][(+n.slice(-1)) % 4]); A.R(x2, 4, 2, 1, 1, '#fff36b'); });
    else if (n.startsWith('trash')) img = A.sprite('trash' + n, 18, 9, (x2) => { A.R(x2, 1, 4, 10, 5, '#8a8f80'); A.R(x2, 8, 2, 8, 7, '#6b6560'); A.R(x2, 3, 5, 3, 2, '#c9925a'); });
    else if (n.startsWith('fence')) img = A.sprite('fence' + n, 40, 18, (x2) => { for (let i = 0; i < 5; i++) A.R(x2, 2 + i * 9, 2, 3, 16, '#a3703f'); A.R(x2, 0, 6, 40, 2, '#c9925a'); A.R(x2, 0, 12, 40, 2, '#c9925a'); });
    else if (n.startsWith('rock')) img = A.sprite('rock' + n, 24, 12, (x2) => { A.E(x2, 12, 8, 11, 6, '#7a7f74'); A.E(x2, 10, 6, 6, 3, '#9aa0ab'); });
    else if (n.startsWith('stair') || n.startsWith('platform')) {
      if (n.startsWith('platform')) { const w = 48 * sx; rectW(x, y, w, 5, '#a3703f'); rectW(x, y, w, 2, '#c9925a'); for (let i = 8; i < w; i += 22) rectW(x + i, y + 5, 3, 30, '#7e5a32'); }
      return;
    }
    if (img) spr(img, x, y + 1, ax, ay, sx < 0);
  }
  function bar(x, y, w, p, col) { rectW(x - 1, y - 1, w + 2, 6, A.OL); rectW(x, y, w, 4, '#5f443d'); rectW(x, y, w * clamp(p, 0, 1), 4, col); }
  function labelW(x, y, txt, ic) {
    const [X, Y] = W2S(x, y), k = Z * DPR;
    ctx.font = `${Math.round(8 * k)}px Jua, sans-serif`; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    const w = ctx.measureText(txt).width + 14 * k;
    ctx.fillStyle = A.OL; ctx.fillRect(X - w / 2 - k, Y - 6 * k, w + 2 * k, 12 * k); ctx.fillStyle = '#976152'; ctx.fillRect(X - w / 2, Y - 5 * k, w, 10 * k);
    if (ic) ctx.drawImage(A.coin(ic), X - w / 2 + 2 * k, Y - 5 * k, 10 * k, 10 * k);
    ctx.fillStyle = '#fff9ef'; ctx.fillText(txt, X + 5 * k, Y + .5 * k);
  }
  function prompt(x, y, txt) {
    const [X, Y] = W2S(x, y + Math.sin(frame / 10) * 1.5), k = Z * DPR;
    ctx.font = `${Math.round(7 * k)}px Jua, sans-serif`; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    const key = touchDev ? '상호작용' : 'E', t2 = txt + '  [' + key + ']', w = ctx.measureText(t2).width + 10 * k;
    ctx.fillStyle = A.OL; ctx.fillRect(X - w / 2 - k, Y - 6 * k, w + 2 * k, 12 * k); ctx.fillStyle = '#976152'; ctx.fillRect(X - w / 2, Y - 5 * k, w, 10 * k);
    ctx.fillStyle = '#fff9ef'; ctx.fillText(t2, X, Y + .5 * k);
  }
  // 바다: 바이옴 색 띠 배경 + 중경 타일 + 벽 타일 + 장식 + 개체
  // 바이옴별 벽 색 (원작 s_tileset_main 묶음: 얕은 바다 = 회갈색 돌, 빙하 = 하늘색 얼음, 늪 = 이끼 낀 돌, 용암 = 보라 결정)
  const BIO_PAL = {
    shallows: { fill: '#3d2f2a', dot: '#4f3d35', rock: '#8a7a68', hi: '#c9b8a0', moss: null, mid: '#2a1e1c' },
    glacial: { fill: '#1d4a6e', dot: '#27608a', rock: '#3fc0e8', hi: '#c8f4ff', moss: null, mid: '#14324a' },
    swamp: { fill: '#2f3320', dot: '#3d4229', rock: '#6b6a55', hi: '#a8a68a', moss: '#45c07c', mid: '#1f2414' },
    magma: { fill: '#24123a', dot: '#33204f', rock: '#5a3fa8', hi: '#9a8aff', moss: null, mid: '#160b26' },
  };
  function drawOcean() {
    const b = O.lvl.bkey, k = Z * DPR;
    const H = O.h; drawBands(A.BG[b], [0, H * .08, H * .3, H * .52, H * .74], [0, .25, .4, .55, .7], H / 2 - VH / 2);
    // 빛줄기
    ctx.save(); ctx.globalAlpha = .07; ctx.fillStyle = '#fff9ef';
    for (let i = 0; i < O.lvl.gr; i++) { const x = ((i * 97 + frame * .1) % (O.w + 200)) - 100; const [X] = W2S(x - cam.x * 0, 0); ctx.beginPath(); ctx.moveTo(X, 0); ctx.lineTo(X + 30 * k, 0); ctx.lineTo(X + 140 * k, cv.height); ctx.lineTo(X + 100 * k, cv.height); ctx.fill(); }
    ctx.restore();
    const PAL = BIO_PAL[b];
    if (O.R.midground) drawBaked(bakeTiles(O.lvl.room + 'm', O.R.midground, { fill: PAL.mid, dot: PAL.mid, rock: PAL.mid, hi: PAL.mid, moss: null }), 0, 0, .7);
    for (const d of O.R.deco) drawOceanDeco(d, b);
    drawBaked(bakeTiles(O.lvl.room, O.R.main, PAL), 0, 0);
    // 잠수함 + 회복 거품
    const subR = SD.B.submarine_recover_area_range;
    if (subR > 0) { const [X, Y] = W2S(O.sub.x - 6, O.sub.y - 24); ctx.save(); ctx.globalAlpha = .18; ctx.fillStyle = '#9fe6ff'; ctx.beginPath(); ctx.arc(X, Y, subR / 2 * k, 0, Math.PI * 2); ctx.fill(); ctx.globalAlpha = .5; ctx.strokeStyle = '#fff9ef'; ctx.lineWidth = k; ctx.stroke(); ctx.restore(); }
    spr(A.submarine(), O.sub.x, O.sub.y + 20 + Math.sin(frame / 30) * 1.5, .5, 1);
    if (O.stor && SD.B.submarine_storage) spr(A.storage(true), O.stor.x, O.stor.y + Math.sin(frame / 25) * 2, .5, .5);
    // 블록·해파리·퍼플
    for (const bl of O.blocks) {
      const img = A.block(bl.cur, 0);
      ctx.save(); ctx.globalAlpha = bl.alpha; const [X, Y] = W2S(bl.x, bl.y); ctx.translate(X, Y); ctx.rotate(bl.ang * Math.PI / 180); const sc = (.75 + bl.v * .18) * k; ctx.scale(sc, sc); ctx.drawImage(img, -img.width / 2, -img.height / 2);
      if (bl.white > 0) { ctx.globalCompositeOperation = 'source-atop'; ctx.fillStyle = 'rgba(255,255,255,.8)'; ctx.fillRect(-img.width / 2, -img.height / 2, img.width, img.height); }
      ctx.restore();
      if (bl.hbar > 0 && bl.life > 0) bar(bl.x - 12, bl.y + 14, 24, bl.life / bl.lifeMax, '#ffd36b');
    }
    for (const p of O.puffles) spr(A.puffle(Math.floor(frame / 15) % 2), p.x, p.y, .5, .5, false, p.pop >= 0 ? 1.3 : 1, p.alpha);
    for (const e of O.jellies) drawJelly(e);
    for (const c of O.coins) spr(A.coin(c.cur), c.x, c.y, .5, .5);
    // 친구
    for (const f of O.friends) spr(f.type === 'robot' ? A.robot(Math.floor(f.f) % 2) : A.starfish(0), f.x, f.y + Math.sin(f.f) * 2, .5, .5, f.tx < f.x);
    // 탄
    for (const s of O.shots) {
      if (s.type === 'bubble') spr(A.bubble(Math.round(s.r), s.crit), s.x, s.y, .5, .5);
      else rectW(s.x - 1.5, s.y - 1.5, 3, 3, s.type === 'robot' ? '#7fe3ff' : '#e8b8ff');
    }
    // 플라즈마 레이저
    for (const l of O.lasers) { laserLine(l.x1, l.y1, l.x2, l.y2); for (const c of l.chain) laserLine(c[0], c[1], c[2], c[3], true); }
    if (pl.tool === 2 && pl.charge > 0 && pl.charge < 1) { const [X, Y] = W2S(pl.x, pl.y - 6); ctx.strokeStyle = '#7fe3ff'; ctx.lineWidth = 2 * k; ctx.beginPath(); ctx.arc(X, Y, 14 * k, -Math.PI / 2, -Math.PI / 2 + Math.PI * 2 * pl.charge); ctx.stroke(); }
    // 거북이 (헬멧)
    if (!pl.dead || frame % 8 < 5) {
      const fr = Math.floor(pl.anim) % 4, img = A.turtle(fr, true), flip = pl.face < 0;
      spr(img, pl.x, pl.y, .5, .55, flip, 1, pl.hurt > 0 && frame % 4 < 2 ? .4 : 1);
      spr(A.helmet(), pl.x + (flip ? 1 : -1), pl.y - 1, .5, .55, flip);
      const g = A.gun(pl.tool === 1 ? 'bubble' : 'plasma');
      ctx.save(); const [X, Y] = W2S(pl.x, pl.y + 2); ctx.translate(X, Y); ctx.rotate(pl.aim || 0); if (Math.cos(pl.aim || 0) < 0) ctx.scale(1, -1); ctx.drawImage(g, 4 * k, -4 * k, g.width * k, g.height * k); ctx.restore();
    }
    // 앞 장식(전경)
    if (O.R.main_front) drawBaked(bakeTiles(O.lvl.room + 'f', O.R.main_front, PAL), 0, 0);
    if (O.nearSub) guideArrow(O.sub.x, O.sub.y - 40);
    else if (O.oxyWarn || SD.invFull('inv')) guideArrow(O.sub.x, O.sub.y - 40);
    if (O.nearStor) prompt(O.stor.x, O.stor.y - 18, '저장고에 넣기 (길게)');
    drawFlyers();
  }
  // s_guide_arrow: 아래를 가리키는 흰 화살표가 위아래로 통통 — 화면 밖이면 가장자리에서 그 방향을 가리킴
  function guideArrowIsland(x, y) {
    const k = Z * DPR, [cx] = W2S(pl.x, pl.y); let [X, Y] = W2S(x, y + Math.sin(frame / 8) * 3); const m = 24 * k;
    const off = X < 0 || X > cv.width; let ang = Math.PI / 2;
    if (off) { ang = X > cx ? 0 : Math.PI; X = clamp(X, m, cv.width - m); Y = cv.height * .45; }
    ctx.save(); ctx.translate(X, Y); ctx.rotate(ang - Math.PI / 2); const s = 1.1 * k;
    const pts = [[-3, -8], [3, -8], [3, -1], [7, -1], [0, 7], [-7, -1], [-3, -1]];
    ctx.beginPath(); pts.forEach((p, i) => i ? ctx.lineTo(p[0] * s, p[1] * s) : ctx.moveTo(p[0] * s, p[1] * s)); ctx.closePath();
    ctx.lineWidth = 3 * k; ctx.strokeStyle = A.OL; ctx.stroke(); ctx.fillStyle = '#fff9ef'; ctx.fill(); ctx.restore();
  }
  function guideArrow(x, y) {
    const k = Z * DPR, bob = Math.sin(frame / 8) * 3;
    let [X, Y] = W2S(x, y + bob); const m = 22 * k, top = 70 * k;
    const off = X < 0 || Y < 0 || X > cv.width || Y > cv.height;
    let ang = Math.PI / 2;
    if (off) { const [cx, cy] = W2S(pl.x, pl.y); ang = Math.atan2(Y - cy, X - cx); X = clamp(X, m, cv.width - m); Y = clamp(Y, top, cv.height - m); }
    ctx.save(); ctx.translate(X, Y); ctx.rotate(ang - Math.PI / 2); const s = (off ? .9 : 1.1) * k;
    const pts = [[-3, -8], [3, -8], [3, -1], [7, -1], [0, 7], [-7, -1], [-3, -1]];
    ctx.beginPath(); pts.forEach((p, i) => i ? ctx.lineTo(p[0] * s, p[1] * s) : ctx.moveTo(p[0] * s, p[1] * s)); ctx.closePath();
    ctx.lineWidth = 3 * k; ctx.strokeStyle = A.OL; ctx.stroke(); ctx.fillStyle = O.oxyWarn && frame % 20 < 10 ? '#ff8a8a' : '#fff9ef'; ctx.fill(); ctx.restore();
  }
  function laserLine(x1, y1, x2, y2, thin) {
    const [a, b] = W2S(x1, y1), [c, d] = W2S(x2, y2), k = Z * DPR;
    ctx.strokeStyle = '#2aa7c9'; ctx.lineWidth = (thin ? 3 : 5) * k; ctx.beginPath(); ctx.moveTo(a, b); ctx.lineTo(c, d); ctx.stroke();
    ctx.strokeStyle = '#e6fbff'; ctx.lineWidth = (thin ? 1 : 2) * k; ctx.beginPath(); ctx.moveTo(a, b); ctx.lineTo(c, d); ctx.stroke();
  }
  function drawJelly(e) {
    const J = SD.JELLY[e.id], k = Z * DPR, fr = e.state ? 0 : Math.floor(e.frame) % 4;
    const img = A.jelly(J.art, fr, e.big, SD.TYPE[e.t].grade);
    const sc = e.small ? .7 : 1;
    if (J.b === 3 && e.exp > 0) { const [X, Y] = W2S(e.x, e.y); ctx.save(); ctx.globalAlpha = Math.min(.5, e.exp / 120); ctx.fillStyle = (Math.floor(e.exp / 8) % 2) ? '#ff6b6b' : '#ffd0d0'; ctx.beginPath(); ctx.arc(X, Y, J.range / 2 * k, 0, Math.PI * 2); ctx.fill(); ctx.restore(); }
    if (J.b === 3 && e.expOn > 0) { const [X, Y] = W2S(e.x, e.y); ctx.save(); ctx.globalAlpha = e.expOn / 24 * .7; ctx.fillStyle = '#fff3a0'; ctx.beginPath(); ctx.arc(X, Y, J.range / 2 * k, 0, Math.PI * 2); ctx.fill(); ctx.restore(); }
    spr(img, e.x, e.y, .5, .45, false, sc, e.alpha);
    if (e.white > 0) { ctx.save(); ctx.globalAlpha = .6; spr(A.jelly(J.art, fr, e.big, 'silver'), e.x, e.y, .5, .45, false, sc, .6); ctx.restore(); }
    if (e.state === 1) spr(A.bubble(J.bub / 2 * sc), e.x, e.y, .5, .5, false, 1, e.alpha);
    if (e.hbar > 0 && e.life > 0 && !e.state) bar(e.x - 12, e.y + 16 * sc, 24, e.life / e.lifeMax, '#ff8ab0');
  }
  function drawOceanDeco(d, biome) {
    const [n, x, y, sx] = d; let img;
    if (n.startsWith('kelp')) img = A.kelp(+n.slice(-1) % 4);
    else if (n.startsWith('coral')) img = A.coral(+n.slice(-1) % 4, biome);
    else if (n.startsWith('rock')) img = A.sprite('rock' + n, 24, 12, (x2) => { A.E(x2, 12, 8, 11, 6, '#5a5550'); A.E(x2, 10, 6, 6, 3, '#7a7570'); });
    else img = A.coral(2, biome);
    spr(img, x, y + 2, .5, 1, sx < 0, 1, .9);
  }
  function drawFlyers() {
    for (const f of flyers) { const t = f.t / 26, x = lerp(f.x1, f.x2, t), y = lerp(f.y1, f.y2, t) - Math.sin(t * Math.PI) * 24; spr(A.jelly(SD.JELLY[f.id].art, 0, false, SD.TYPE[f.tt].grade), x, y, .5, .5, false, .55); f.t++; }
    flyers = flyers.filter(f => f.t <= 26);
  }
  function drawFx() {
    const k = Z * DPR;
    for (const p of fx) {
      p.t++;
      if (p.ring) { const [X, Y] = W2S(p.x, p.y); ctx.save(); ctx.globalAlpha = 1 - p.t / p.life; ctx.strokeStyle = p.col; ctx.lineWidth = 3 * k; ctx.beginPath(); ctx.arc(X, Y, p.r / 2 * k * (0.4 + p.t / p.life * .6), 0, Math.PI * 2); ctx.stroke(); ctx.restore(); continue; }
      p.x += p.vx; p.y += p.vy; p.vx *= .92; p.vy *= .92;
      ctx.globalAlpha = 1 - p.t / p.life; rectW(p.x, p.y, p.s, p.s, p.col); ctx.globalAlpha = 1;
    }
    fx = fx.filter(p => p.t < p.life);
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    for (const p of popups) {
      p.t++; const [X, Y] = W2S(p.x, p.y - p.t * .4), a = p.t < 40 ? 1 : 1 - (p.t - 40) / 20;
      ctx.globalAlpha = Math.max(0, a); ctx.font = `${Math.round((p.big ? 10 : 8) * k)}px Jua, sans-serif`;
      ctx.lineWidth = 3 * k; ctx.strokeStyle = A.OL; ctx.strokeText(p.txt, X, Y);
      if (p.c === 'rain') { const g = ctx.createLinearGradient(X - 20 * k, 0, X + 20 * k, 0); ['#ff8a8a', '#ffd36b', '#8aff9e', '#7fd4ff', '#c79bff'].forEach((c, i) => g.addColorStop(i / 4, c)); ctx.fillStyle = g; } else ctx.fillStyle = p.c;
      ctx.fillText(p.txt, X, Y); ctx.globalAlpha = 1;
    }
    popups = popups.filter(p => p.t < 60);
  }

  // ── HUD (원작: 왼쪽 위 거북이 아이콘 + 산소 막대, 도구 원, 오른쪽 위 화폐) ─────────────────────
  function hudPanel(x, y, w, h) { const k = Z * DPR; ctx.fillStyle = A.OL; ctx.fillRect(x - 2 * k, y - 2 * k, w + 4 * k, h + 4 * k); ctx.fillStyle = '#e2c655'; ctx.fillRect(x - k, y - k, w + 2 * k, h + 2 * k); ctx.fillStyle = '#976152'; ctx.fillRect(x, y, w, h); }
  function drawHud() {
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    const k = Math.max(1.5, Math.min(Z, 4)) * DPR, S = SD.S;
    ctx.textBaseline = 'middle';
    // 오른쪽 위: 화폐
    const curs = SD.CUR.filter(c => c === 'shell' || S.coins[c] > 0 || (O && O.gotRes[c]));
    let yy = 8 * k;
    ctx.font = `${Math.round(9 * k)}px Jua, sans-serif`; ctx.textAlign = 'right';
    for (const c of curs) {
      const txt = SD.fmt(c === 'shell' ? S.coins.shell : S.coins[c]), w = ctx.measureText(txt).width + 18 * k, x = cv.width - 8 * k - w;
      hudPanel(x, yy, w, 13 * k); ctx.drawImage(A.coin(c), x + 2 * k, yy + 1.5 * k, 10 * k, 10 * k);
      ctx.fillStyle = '#fff9ef'; ctx.fillText(txt, x + w - 3 * k, yy + 7 * k); yy += 17 * k;
    }
    ctx.textAlign = 'left';
    if (scene === 'ocean' && O) {
      // 왼쪽 위: 산소 막대
      const x = 8 * k, y = 8 * k, w = Math.min(130 * k, cv.width * .45);
      hudPanel(x, y, 16 * k, 16 * k); ctx.drawImage(A.turtle(0, false), x - 2 * k, y - 3 * k, 20 * k, 20 * k);
      hudPanel(x + 20 * k, y + 3 * k, w, 10 * k);
      const p = pl.oxy / Math.max(1, pl.oxyMax);
      ctx.fillStyle = '#5f443d'; ctx.fillRect(x + 20 * k, y + 3 * k, w, 10 * k);
      ctx.fillStyle = p < .25 && frame % 20 < 10 ? '#ff6b6b' : '#45c07c'; ctx.fillRect(x + 20 * k, y + 3 * k, w * p, 10 * k);
      ctx.fillStyle = 'rgba(255,255,255,.35)'; ctx.fillRect(x + 20 * k, y + 3 * k, w * p, 2 * k);
      ctx.font = `${Math.round(8 * k)}px Jua, sans-serif`; ctx.fillStyle = '#fff9ef'; ctx.textAlign = 'center';
      ctx.fillText('O₂ ' + SD.fmt(pl.oxy) + ' / ' + SD.fmt(pl.oxyMax), x + 20 * k + w / 2, y + 8.5 * k); ctx.textAlign = 'left';
      ctx.fillText(O.lvl.bnm + ' ' + O.lvl.depth + 'm', x, y + 26 * k);
      if (O.oxyWarn && !pl.dead) { ctx.font = `${Math.round(10 * k)}px Jua, sans-serif`; ctx.textAlign = 'center'; ctx.lineWidth = 3 * k; ctx.strokeStyle = A.OL; const tx2 = cv.width / 2, ty2 = cv.height * .22; ctx.globalAlpha = frame % 30 < 20 ? 1 : .5; ctx.strokeText('산소 부족! 잠수함으로 돌아가요', tx2, ty2); ctx.fillStyle = '#ff8a8a'; ctx.fillText('산소 부족! 잠수함으로 돌아가요', tx2, ty2); ctx.globalAlpha = 1; ctx.textAlign = 'left'; }
      // 도구 원 2개 (버블 / 플라즈마)
      const tools = [[1, 'bubble', pl.ts ? pl.ts[1].ammo : bubClipMax(), bubClipMax(), Math.floor(pl.bub)], [2, 'plasma', pl.ts ? pl.ts[2].ammo : plClipMax(), plClipMax(), Math.floor(pl.plas)]];
      let tx = 8 * k; const ty = cv.height - (touchDev ? 200 : 40) * DPR;
      for (const [id, nm, c, cm, tank] of tools) {
        if (id === 2 && !SD.B.is_plasma_tool_available) continue;
        const on = pl.tool === id, r = (on ? 15 : 12) * k;
        ctx.fillStyle = A.OL; ctx.beginPath(); ctx.arc(tx + r, ty, r + 2 * k, 0, Math.PI * 2); ctx.fill();
        ctx.fillStyle = on ? '#e2c655' : '#a9943e'; ctx.beginPath(); ctx.arc(tx + r, ty, r + k, 0, Math.PI * 2); ctx.fill();
        ctx.fillStyle = '#976152'; ctx.beginPath(); ctx.arc(tx + r, ty, r, 0, Math.PI * 2); ctx.fill();
        const ts = pl.ts && pl.ts[id]; if (ts && ts.st === 'reload') { ctx.fillStyle = 'rgba(255,255,255,.35)'; ctx.beginPath(); ctx.moveTo(tx + r, ty); ctx.arc(tx + r, ty, r, -Math.PI / 2, -Math.PI / 2 + Math.PI * 2 * Math.min(1, ts.dr / 120)); ctx.fill(); }
        if (id === 2 && pl.charge > 0 && pl.charge < 1) { ctx.strokeStyle = '#7fe3ff'; ctx.lineWidth = 2 * k; ctx.beginPath(); ctx.arc(tx + r, ty, r + 3 * k, -Math.PI / 2, -Math.PI / 2 + Math.PI * 2 * pl.charge); ctx.stroke(); }
        const g = A.gun(nm); ctx.drawImage(g, tx + r - 7 * k, ty - 4 * k, 14 * k, 8 * k);
        ctx.font = `${Math.round(7 * k)}px Jua, sans-serif`; ctx.fillStyle = '#fff9ef'; ctx.textAlign = 'center';
        ctx.fillText(c + '/' + cm, tx + r, ty + r + 7 * k); ctx.fillStyle = '#e6d6b8'; ctx.fillText(SD.fmt(tank), tx + r, ty + r + 15 * k); ctx.textAlign = 'left';
        tx += r * 2 + 10 * k;
      }
    }
    // 잠수함 근처: 화면 아래 가운데 큰 돌아가기 버튼 (원작 s_ui_leave_button 초록 버튼)
    if (scene === 'ocean' && O) {
      O.leaveBtn = null;
      if (O.nearSub && !modal) {
        const txt = '잠수함 타고 돌아가기' + (touchDev ? '' : '  [E]');
        ctx.font = `${Math.round(10 * k)}px Jua, sans-serif`;
        const w = ctx.measureText(txt).width + 30 * k, h = 22 * k, x = cv.width / 2 - w / 2, y = cv.height - h - (touchDev ? 110 : 18) * DPR - Math.abs(Math.sin(frame / 10)) * 3 * k;
        ctx.fillStyle = A.OL; ctx.fillRect(x - 3 * k, y - 3 * k, w + 6 * k, h + 6 * k);
        ctx.fillStyle = '#e2c655'; ctx.fillRect(x - 1.5 * k, y - 1.5 * k, w + 3 * k, h + 3 * k);
        ctx.fillStyle = '#2ec05a'; ctx.fillRect(x, y, w, h); ctx.fillStyle = '#25a04a'; ctx.fillRect(x, y + h - 3 * k, w, 3 * k);
        ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.lineWidth = 3 * k; ctx.strokeStyle = A.OL; ctx.strokeText(txt, cv.width / 2, y + h / 2); ctx.fillStyle = '#fff9ef'; ctx.fillText(txt, cv.width / 2, y + h / 2); ctx.textAlign = 'left';
        O.leaveBtn = [x, y, w, h];
      }
    }
    // 가방 슬롯 (왼쪽 아래 / 바다에선 위)
    drawInvBar(k);
    tutorialHud(k);
  }
  function drawInvBar(k) {
    const S = SD.S, n = SD.B.player_slots, sz = 18 * k, gap = 3 * k;
    const x0 = 8 * k, y0 = scene === 'ocean' ? 44 * k : 8 * k;
    const show = invOpen || scene === 'ocean' || SD.invCount('inv') > 0;
    if (!show) return;
    for (let i = 0; i < n; i++) {
      const x = x0 + i * (sz + gap), y = y0;
      hudPanel(x, y, sz, sz);
      const s = S.inv[i];
      if (s) { const J = SD.JELLY[s.id]; ctx.drawImage(A.jelly(J.art, 0, false, SD.TYPE[s.t].grade), x + 2 * k, y + 1 * k, sz - 4 * k, sz - 3 * k);
        ctx.font = `${Math.round(7 * k)}px Jua, sans-serif`; ctx.textAlign = 'right'; ctx.lineWidth = 2 * k; ctx.strokeStyle = A.OL; ctx.strokeText(s.q, x + sz - k, y + sz - 3 * k); ctx.fillStyle = s.q >= SD.B.all_cap ? '#ffd84a' : '#fff9ef'; ctx.fillText(s.q, x + sz - k, y + sz - 3 * k); ctx.textAlign = 'left'; }
    }
    if (SD.invFull('inv') && SD.invCount('inv') > 0) { ctx.font = `${Math.round(8 * k)}px Jua, sans-serif`; ctx.fillStyle = '#ffd84a'; ctx.fillText('가득 참!', x0 + n * (sz + gap) + 2 * k, y0 + sz / 2); }
  }

  // ── 튜토리얼 (원작 tutorial_task 01~07) ───────────────────────
  const TUT = ['주변을 둘러보세요.', '안테나(스킬 트리)에서 잠수함을 여세요.', '첫 번째 해파리를 잡으세요.', '가방을 열어 보세요. (Tab)', '질식하기 전에 잠수함으로 돌아가세요.', '상점에서 해파리를 판매하세요.', '상자에서 조개껍데기를 꺼내세요.'];
  function tut(i) { if (SD.S.tut <= i) { SD.S.tut = i + 1; SD.save(); Sound.play('correct'); } }
  function tutorialHud(k) {
    let t = SD.S.tut; if (t === 1 && SD.lv('submarine')) t = SD.S.tut = 2;
    if (scene === 'ocean' && t < 2) t = 2;
    if (scene === 'ocean' && t <= 4 && (O && (O.oxyWarn || SD.invCount('inv') > 0))) t = 4;
    if (t >= TUT.length) return;
    if (scene === 'ocean' && O && O.nearSub) return;
    ctx.font = `${Math.round(8 * k)}px Jua, sans-serif`; ctx.textAlign = 'left';
    const txt = '- ' + TUT[t], w = ctx.measureText(txt).width + 10 * k;
    const x = scene === 'ocean' ? cv.width / 2 - w / 2 : 8 * k, y = scene === 'ocean' ? cv.height - 13 * k - (touchDev ? 110 : 18) * DPR : 32 * k;
    ctx.globalAlpha = .9; hudPanel(x, y, w, 13 * k); ctx.globalAlpha = 1; ctx.fillStyle = '#fff9ef'; ctx.fillText(txt, x + 5 * k, y + 7 * k);
  }

  // ═══════════════════════ 스킬 트리 (rm_skill_tree 별 모양, 64px 격자) ═══════════════════════
  const SKP = 64;
  function openSkill() {
    skillUI = { x: 0, y: 0, z: 1, sel: null, drag: null };
    const owned = SD.SKILLS.filter(s => SD.lv(s.id) > 0);
    if (owned.length) { const s = owned[owned.length - 1]; skillUI.x = s.x * SKP; skillUI.y = s.y * SKP; }
    skillUI.z = Math.max(.6, Math.min(1.6, Math.min(CW, CH) / 420));
    $('ovSkill').classList.add('on'); Sound.play('pageflip');
    $('touch').classList.remove('on');
  }
  function closeSkill() { skillUI = null; $('ovSkill').classList.remove('on'); $('skTip').classList.remove('on'); if (touchDev) $('touch').classList.add('on'); Sound.play('pageflip'); }
  function skillZoom(f, cx, cy) { if (!skillUI) return; skillUI.z = clamp(skillUI.z * f, .35, 2.4); }
  function skillScreen(s) { const u = skillUI, k = DPR; return [cv.width / 2 + (s.x * SKP - u.x) * u.z * k, cv.height / 2 + (s.y * SKP - u.y) * u.z * k]; }
  function skillAt(px, py) { let best = null, bd = 24 * skillUI.z * DPR; for (const s of SD.SKILLS) { if (!SD.visible(s) && SD.lv(s.id) === 0) continue; const [X, Y] = skillScreen(s); const d = Math.hypot(px * DPR - X, py * DPR - Y); if (d < bd) { bd = d; best = s; } } return best; }
  const ovS = $('ovSkill');
  let skDown = null;
  ovS.addEventListener('pointerdown', e => { if (e.pointerType === 'touch') return skillTouchDown(e); skDown = { x: e.clientX, y: e.clientY, ux: skillUI.x, uy: skillUI.y, moved: false }; });
  ovS.addEventListener('pointermove', e => { if (e.pointerType === 'touch' || !skDown) return; const dx = e.clientX - skDown.x, dy = e.clientY - skDown.y; if (Math.hypot(dx, dy) > 5) skDown.moved = true; skillUI.x = skDown.ux - dx / skillUI.z; skillUI.y = skDown.uy - dy / skillUI.z; });
  ovS.addEventListener('pointerup', e => { if (e.pointerType === 'touch' || !skDown) return; if (!skDown.moved) skillClick(e.clientX, e.clientY); skDown = null; });
  ovS.addEventListener('wheel', e => { skillZoom(e.deltaY < 0 ? 1.15 : 1 / 1.15); }, { passive: true });
  const skT = {};
  function skillTouchDown(e) { skT[e.pointerId] = { x: e.clientX, y: e.clientY, x0: e.clientX, y0: e.clientY }; skT._u = { x: skillUI.x, y: skillUI.y, z: skillUI.z }; skT._moved = false; }
  function skillTouchMove(e) {
    const t = skT[e.pointerId]; if (!t) return; t.x = e.clientX; t.y = e.clientY;
    const ids = Object.keys(skT).filter(k => !k.startsWith('_'));
    if (ids.length >= 2) { const a = skT[ids[0]], b = skT[ids[1]], d0 = Math.hypot(a.x0 - b.x0, a.y0 - b.y0), d1 = Math.hypot(a.x - b.x, a.y - b.y); skillUI.z = clamp(skT._u.z * d1 / Math.max(1, d0), .35, 2.4); skT._moved = true; }
    else { const dx = t.x - t.x0, dy = t.y - t.y0; if (Math.hypot(dx, dy) > 8) skT._moved = true; skillUI.x = skT._u.x - dx / skillUI.z; skillUI.y = skT._u.y - dy / skillUI.z; }
  }
  function skillTouchUp(e) { const t = skT[e.pointerId]; delete skT[e.pointerId]; if (t && !skT._moved) skillClick(t.x, t.y); }
  function skillClick(px, py) {
    const s = skillAt(px, py);
    if (!s) { skillUI.sel = null; $('skTip').classList.remove('on'); return; }
    if (skillUI.sel === s && SD.canBuy(s)) { buySkill(s); return; }
    skillUI.sel = s; showTip(s); Sound.play('tap');
  }
  function buySkill(s) {
    const before = SD.prestige();
    if (SD.buy(s)) {
      Sound.play(SD.lv(s.id) >= s.max ? 'meld' : 'coin'); fxSkill(s);
      if (s.id === 'submarine') tut(1);
      if (SD.prestige() > before) { toast(SD.prestige() === 1 ? '잠수함을 탈 수 있어요! (잠수함에서 상호작용)' : '새 깊이가 열렸어요! (' + SD.LEVELS[SD.prestige() - 1].bnm + ' ' + SD.LEVELS[SD.prestige() - 1].depth + 'm)'); Sound.play('win'); }
      showTip(s);
    } else { Sound.play('error'); }
  }
  const skFx = [];
  function fxSkill(s) { skFx.push({ s, t: 0 }); }
  const CUR_CLS = { shell: '', scrap: '', crystal: '', mush: '', obsidian: '', flask: '' };
  function fmtDesc(s) {
    // 원작 문구의 [색]…[] 표시를 색으로, {0} 은 레벨당 효과값
    const b = s.b, ef = s.ef || '';
    let v = '';
    if (b !== undefined && b !== null) {
      const pct = /chance|critical_chance|explosion_chance|lightning_chance|extra_sell|transmutate|double_chance/.test(ef);
      const flat = /^base_|slot_number|capacity|ammo|chain_number|number|catch_oxygen|oxygen_max_increase|regen_amount|starfish_number|robot_number|multbubble/.test(ef) && !/player_oxygen_max/.test(ef);
      if (ef === 'submarine_recover') v = (s.og * 100) + '%';
      else if (flat) v = '+' + SD.fmt(b);
      else if (pct) v = SD.fmt(b) + '%';
      else if (ef === 'total_bonus_player_jellyfish_kept') v = Math.round(-b * 100) + '%';
      else if (ef === 'total_bonus_store_expedition_sell_speed_times') v = (1 + b);
      else v = '+' + (b * 100 >= 1000 ? SD.fmt(b * 100) : Math.round(b * 1000) / 10) + '%';
    }
    if (s.set !== undefined && /range/.test(ef)) v = String(s.set);
    let t = s.ds.replace('{0}', v).replace('{1}', ef === 'total_bonus_bubble_smite' ? '25%' : ef.includes('store_extra') ? '1' : '');
    const map = { green: 'c-green', rainbow: 'c-rain', stats_bb: 'c-bb', stats_pl: 'c-pl', stats_ox: 'c-ox', stats_jl: 'c-jl', store: 'c-st', stats_rs: 'c-rs', red: 'c-red', gold: 'c-gold', silver: 'c-silver' };
    t = t.replace(/\[(\w+)\]([^\[]*)\[\]/g, (m, c, x) => `<span class="${map[c] || 'c-green'}">${x}</span>`);
    return t;
  }
  function showTip(s) {
    const tip = $('skTip'), n = SD.lv(s.id), mx = n >= s.max, ok = SD.unlocked(s), can = SD.canBuy(s);
    const nm = s.nm.replace(/\[(\w+)\]([^\[]*)\[\]/g, (m, c, x) => `<span class="${c === 'rainbow' ? 'c-rain' : 'c-green'}">${x}</span>`);
    const pr = mx ? '<span class="c-green">최대!</span>' : s.cur === 'free' ? '<span class="c-green">~~ 무료 ~~</span>' : `<canvas data-ic="${s.cur}" width="10" height="10"></canvas>${SD.fmt(SD.price(s))}`;
    const need = !ok ? `<div class="ds c-red">먼저 연결된 스킬을 ${s.nx.length ? '최대로 ' : ''}올려야 해요</div>` : '';
    tip.innerHTML = `<div class="hd"><span class="nm">${nm}</span><span class="lv">레벨 ${n} / ${s.max}</span></div><div class="ds">${fmtDesc(s)}</div>${need}
      <div class="ft"><span class="pr ${!mx && SD.wallet(s.cur) < SD.price(s) ? 'no' : ''}">${pr}</span>${mx ? '' : `<button class="btn ok" id="skBuy" ${can ? '' : 'disabled'}>업그레이드</button>`}<button class="btn" id="skClose">닫기</button></div>`;
    tip.classList.add('on'); paintIcons(tip);
    const bb = $('skBuy'); if (bb) bb.onclick = () => buySkill(s);
    $('skClose').onclick = closeSkill;
  }
  function paintIcons(root) { root.querySelectorAll('canvas[data-ic]').forEach(c => { const x = c.getContext('2d'); x.imageSmoothingEnabled = false; const ic = c.dataset.ic; const img = ic === 'jelly' ? A.coin('jelly') : ic === 'time' ? A.coin('shell') : A.coin(ic); x.clearRect(0, 0, c.width, c.height); x.drawImage(img, 0, 0, c.width, c.height); }); }
  function drawSkill() {
    const u = skillUI, k = DPR, z = u.z;
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    // 배경: 어두운 남색 + 점 격자 대신 은은한 원
    ctx.fillStyle = '#15202c'; ctx.fillRect(0, 0, cv.width, cv.height);
    ctx.save(); ctx.globalAlpha = .08; ctx.strokeStyle = '#9fe6ff'; ctx.lineWidth = 2 * k;
    for (let r = 1; r < 14; r++) { ctx.beginPath(); ctx.arc(cv.width / 2 - u.x * z * k, cv.height / 2 - u.y * z * k, r * SKP * 1.5 * z * k, 0, Math.PI * 2); ctx.stroke(); }
    ctx.restore();
    // 연결선 (화살표): 선행 → 대상. 아무레벨 = 하늘, 최대레벨 = 금색
    for (const s of SD.SKILLS) {
      if (!SD.visible(s) && SD.lv(s.id) === 0) continue;
      const [X2, Y2] = skillScreen(s);
      for (const [list, col] of [[s.na, '#78c8ff'], [s.nx, '#ffd25a']]) for (const nid of list) {
        const p = SD.SKB[nid]; if (!p) continue; const [X1, Y1] = skillScreen(p);
        const done = list === s.na ? SD.lv(nid) > 0 : SD.lv(nid) >= p.max;
        ctx.strokeStyle = A.OL; ctx.lineWidth = 6 * k * z; ctx.beginPath(); ctx.moveTo(X1, Y1); ctx.lineTo(X2, Y2); ctx.stroke();
        ctx.strokeStyle = done ? col : '#4a5868'; ctx.lineWidth = 3 * k * z; ctx.beginPath(); ctx.moveTo(X1, Y1); ctx.lineTo(X2, Y2); ctx.stroke();
      }
    }
    // 노드
    for (const s of SD.SKILLS) {
      const n = SD.lv(s.id), vis = SD.visible(s) || n > 0; if (!vis) continue;
      const [X, Y] = skillScreen(s); if (X < -60 || Y < -60 || X > cv.width + 60 || Y > cv.height + 60) continue;
      const ok = SD.unlocked(s), can = SD.canBuy(s), mx = n >= s.max, big = /^(submarine|hammock|plasma_tool|cellphone|global_chest|submarine_storage|jellyfish_transmutator|alchemy_station|double_plasma|biovalue_rainbow|biovalue_amount_01)$/.test(s.id) || /_final$/.test(s.id);
      const r = (big ? 19 : 15) * z * k;
      ctx.fillStyle = A.OL; ctx.beginPath(); ctx.arc(X, Y, r + 3 * k * z, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = mx ? '#e2c655' : n > 0 ? '#45c07c' : can ? '#78c8ff' : ok ? '#a9943e' : '#5a6470'; ctx.beginPath(); ctx.arc(X, Y, r + 1.5 * k * z, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = n > 0 ? '#5f443d' : '#2a3440'; ctx.beginPath(); ctx.arc(X, Y, r, 0, Math.PI * 2); ctx.fill();
      const ic = A.skillIcon(s.id, big); const isz = r * 1.5;
      ctx.globalAlpha = ok || n > 0 ? 1 : .45; ctx.drawImage(ic, X - isz / 2, Y - isz / 2, isz, isz); ctx.globalAlpha = 1;
      if (can && frame % 40 < 20) { ctx.strokeStyle = '#fff9ef'; ctx.lineWidth = 2 * k * z; ctx.beginPath(); ctx.arc(X, Y, r + 5 * k * z, 0, Math.PI * 2); ctx.stroke(); }
      if (u.sel === s) { ctx.strokeStyle = '#ffd84a'; ctx.lineWidth = 3 * k * z; ctx.beginPath(); ctx.arc(X, Y, r + 7 * k * z, 0, Math.PI * 2); ctx.stroke(); }
      if (s.max > 1 && (n > 0 || ok)) { ctx.font = `${Math.round(9 * z * k)}px Jua, sans-serif`; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.lineWidth = 3 * k * z; ctx.strokeStyle = A.OL; const t = n + '/' + s.max; ctx.strokeText(t, X, Y + r + 8 * z * k); ctx.fillStyle = mx ? '#ffd84a' : '#fff9ef'; ctx.fillText(t, X, Y + r + 8 * z * k); }
    }
    for (const f of skFx) { f.t++; const [X, Y] = skillScreen(f.s); ctx.save(); ctx.globalAlpha = 1 - f.t / 24; ctx.strokeStyle = '#7dff9e'; ctx.lineWidth = 3 * k; ctx.beginPath(); ctx.arc(X, Y, (18 + f.t * 2) * z * k, 0, Math.PI * 2); ctx.stroke(); ctx.restore(); }
    while (skFx.length && skFx[0].t > 24) skFx.shift();
    // 위: 깊이 해금(프레스티지) 막대 + 화폐
    const p = SD.prestige(), tl = SD.totalLevels(), nxt = SD.PRESTIGE_XP[p];
    const hk = Math.max(1.5, Math.min(Z, 3)) * DPR, w = Math.min(cv.width * .5, 220 * hk), x = cv.width / 2 - w / 2, y = 10 * hk;
    hudPanel(x, y, w, 14 * hk);
    const prev = p > 0 ? SD.PRESTIGE_XP[p - 1] : 0; ctx.fillStyle = '#5f443d'; ctx.fillRect(x, y, w, 14 * hk); ctx.fillStyle = '#c79bff'; ctx.fillRect(x, y, w * (nxt ? clamp((tl - prev) / (nxt - prev), 0, 1) : 1), 14 * hk);
    ctx.font = `${Math.round(9 * hk)}px Jua, sans-serif`; ctx.fillStyle = '#fff9ef'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.fillText(nxt ? `깊이 ${p}/12 — 다음 깊이까지 스킬 레벨 ${tl}/${nxt}` : '모든 깊이 해금!', cv.width / 2, y + 7.5 * hk);
    drawHud.call(null);
    // 닫기 안내
    ctx.font = `${Math.round(8 * hk)}px Jua, sans-serif`; ctx.textAlign = 'left'; ctx.fillStyle = '#e6d6b8';
    ctx.fillText(touchDev ? '끌어서 이동 · 두 손가락 확대 · 두 번 눌러 업그레이드' : '드래그 이동 · 휠 확대 · 두 번 클릭 업그레이드 · Esc 닫기', 56 * DPR, cv.height - 22 * DPR);
  }

  // ── 바이옴(깊이) 선택 ─────────────────────────────────────────
  function openBiome() {
    const p = SD.prestige(); let h = `<h2 style="font-size:22px;text-align:center;margin-bottom:10px;text-shadow:0 2px 0 var(--ol)">지역을 선택하세요.</h2>`;
    SD.BIOMES.forEach((b, bi) => {
      h += `<div style="margin:6px 0 4px;font-size:16px;text-shadow:0 2px 0 var(--ol)">${b.nm}</div><div style="display:flex;gap:6px">`;
      b.levels.forEach((l, d) => {
        const idx = bi * 3 + d, open = idx <= p - 1, reveal = open || idx < 3;
        const jl = l.jo.map(o => SD.JELLY[o[0]]).map(J => `<canvas data-j="${J.art}" width="22" height="26" style="width:18px;height:21px;image-rendering:pixelated"></canvas>`).join('');
        h += `<button class="btn" data-lv="${idx}" ${open ? '' : 'disabled'} style="flex:1;padding:6px 4px;font-size:14px;background:${open ? '#976152' : '#5f443d'}">${reveal ? l.depth + 'm' : '???'}<div style="min-height:22px">${open ? jl : '🔒'}</div></button>`;
      });
      h += '</div>';
    });
    h += `<div style="text-align:center;margin-top:12px"><button class="btn no" id="mNo">취소</button></div>`;
    showModal(h);
    $('modal').querySelectorAll('canvas[data-j]').forEach(c => { const x = c.getContext('2d'); x.imageSmoothingEnabled = false; x.drawImage(A.jelly(c.dataset.j, 0, false), 0, 0, 22, 26); });
    $('modal').querySelectorAll('[data-lv]').forEach(b => b.onclick = () => { closeModal(); Sound.play('whoosh'); fadeTo = () => enterOcean(+b.dataset.lv); });
    $('mNo').onclick = closeModal;
  }
  // ── 엔딩 (해먹) ───────────────────────────────────────────────
  function startEnding() {
    SD.S.ending = true; SD.save(); Sound.play('win');
    showModal(`<h2 style="font-size:24px;text-align:center;margin-bottom:8px;text-shadow:0 2px 0 var(--ol)">충분한 수면을 취하세요.</h2>
      <p style="text-align:center;line-height:1.6;color:#fff3df">해먹을 고치고 드디어 푹 잠들었어요.<br>살짝 멋진 게임 — 끝까지 플레이해 주셔서 고마워요!</p>
      <div style="text-align:center;margin:10px 0;color:var(--dim)">탐사 ${SD.S.stats.dives}회 · 해파리 ${SD.fmt(SD.S.stats.jelly)}마리 · 플레이 ${Math.floor(SD.S.playFrames / 3600)}분</div>
      <div style="text-align:center"><button class="btn ok" id="mOk">계속 놀기</button></div>`);
    $('mOk').onclick = () => { SD.S.ending = false; SD.save(); closeModal(); };
  }
  // ── 가방 보기 (인벤토리 패널) ─────────────────────────────────────
  function openInv() {
    const S = SD.S, slot = (s) => s ? `<div class="pnl" style="width:54px;height:54px;position:relative;display:grid;place-items:center;border-radius:10px"><canvas data-j="${SD.JELLY[s.id].art}" data-g="${SD.TYPE[s.t].grade}" width="22" height="26" style="width:30px;height:36px;image-rendering:pixelated"></canvas><b style="position:absolute;right:4px;bottom:0;text-shadow:0 2px 0 var(--ol)">${s.q}</b></div>` : `<div class="pnl" style="width:54px;height:54px;opacity:.6;border-radius:10px"></div>`;
    const grid = (name, title) => { const n = SD.slotsOf(name); let h = `<div style="margin:8px 0 4px;text-shadow:0 2px 0 var(--ol)">${title} <span style="color:var(--dim);font-size:13px">(${n}칸 × ${SD.B.all_cap})</span></div><div style="display:flex;flex-wrap:wrap;gap:6px">`; for (let i = 0; i < n; i++) h += slot(S[name][i]); return h + '</div>'; };
    let h = `<h2 style="font-size:22px;text-align:center;text-shadow:0 2px 0 var(--ol)">당신의 인벤토리</h2>` + grid('inv', '등딱지 배낭');
    if (SD.B.submarine_storage) h += grid('sub', '잠수함 저장고');
    h += grid('store', '해파리 상점');
    if (SD.lv('jellyfish_transmutator')) h += grid('tin', '변환기 (넣기)') + grid('tout', '변환기 (완성)');
    h += `<div style="margin-top:10px;font-size:13.5px;color:#fff3df;line-height:1.5">${SD.JELLY.filter((J, i) => S.inv.concat(S.store, S.sub, S.tin, S.tout).some(s => s && s.id === i)).map(J => `${J.nm} ${SD.fmt(J.value)}🐚 · ${J.sell}초`).join('<br>')}</div>`;
    h += `<div style="text-align:center;margin-top:10px"><button class="btn" id="mOk">닫기</button></div>`;
    showModal(h); tut(3);
    $('modal').querySelectorAll('canvas[data-j]').forEach(c => { const x = c.getContext('2d'); x.imageSmoothingEnabled = false; x.drawImage(A.jelly(c.dataset.j, 0, false, c.dataset.g), 0, 0, 22, 26); });
    $('mOk').onclick = closeModal;
  }
  function showModal(h) { modal = true; $('modal').innerHTML = h; $('ovModal').classList.add('on'); }
  function closeModal() { modal = null; $('ovModal').classList.remove('on'); }

  // ═══════════════════════ 루프 ═══════════════════════
  let speed = 1, acc = 0, last = performance.now();
  function step() {
    frame++; SD.S.playFrames++;
    if (!isFinite(cam.x) || !isFinite(cam.y)) { cam.x = pl.x - VW / 2; cam.y = pl.y - VH / 2; }
    if (fadeTo) { fade = Math.min(1, fade + .08); if (fade >= 1) { const f = fadeTo; fadeTo = null; f(); } }
    else if (fade > 0) fade = Math.max(0, fade - .06);
    if (IN.back) { IN.back = false; if (skillUI) closeSkill(); else if (modal) closeModal(); }
    if (skillUI) { if (IN.act) closeSkill(); }
    else if (!modal && !fadeTo) {
      if (IN.inv) openInv();
      if (IN.phone && SD.B.cellphone && scene === 'island') openSkill();
      if (scene === 'island') { islandUpdate(); for (const c of islandCoins) coinUpdate(c); for (let i = islandCoins.length - 1; i >= 0; i--) if (islandCoins[i].dead) islandCoins.splice(i, 1); }
      else oceanUpdate();
      if (SD.S.tut === 0 && Math.abs(pl.vx) > .5) tut(0);
    }
    IN.act = IN.jump = IN.inv = IN.phone = false; IN.click = null;
    if (touchDev && frame % 15 === 0) { $('tbJump').style.display = scene === 'island' ? '' : 'none'; const lbl = scene === 'ocean' && O && O.nearSub ? '돌아<br>가기' : '상호<br>작용'; if ($('tbAct').innerHTML !== lbl) $('tbAct').innerHTML = lbl; $('tbAct').style.background = scene === 'ocean' && O && O.nearSub ? 'rgba(46,170,90,.95)' : ''; }
    if (frame % 600 === 0) SD.save();
  }
  function loop(now) {
    acc += Math.min(250, now - last) * speed; last = now;
    let n = 0; while (acc >= 1000 / 60 && n < 64) { step(); acc -= 1000 / 60; n++; }
    if (skillUI) drawSkill(); else draw();
    requestAnimationFrame(loop);
  }

  // ── 시작 ───────────────────────────────────────────────────
  SD.load(); enterIsland(false); cam.x = pl.x - VW / 2; cam.y = pl.y - VH * .66;
  requestAnimationFrame(loop);
  addEventListener('beforeunload', () => SD.save());
  document.addEventListener('visibilitychange', () => { if (document.hidden) SD.save(); });

  // ── 디버그·테스트 훅 ──────────────────────────────────────────
  window.__gameSpeed = { set: n => (speed = clamp(+n || 1, .25, 64)), step: d => (speed = clamp(speed * (d > 0 ? 2 : .5), .25, 64)), get: () => speed };
  window.shelldiver = {
    SD, P, pl, cam, get Z() { return Z; }, get VH() { return VH; }, get O() { return O; }, get scene() { return scene; }, get frame() { return frame; },
    step: (n = 1) => { for (let i = 0; i < n; i++) step(); }, draw,
    dive: i => { closeModal(); enterOcean(i || 0); }, island: () => { closeModal(); enterIsland(true); }, endDive,
    skill: openSkill, closeSkill, biome: openBiome, inv: openInv,
    cheat: (cur, n) => { SD.S.coins[cur || 'shell'] += n || 1e6; SD.save(); },
    buyAll: (id) => { const s = SD.SKB[id]; while (s && SD.lv(id) < s.max) { SD.S.lv[id] = SD.lv(id) + 1; } SD.recompute(); SD.save(); },
    tp: (x, y) => { pl.x = x; pl.y = y; }, input: IN, keys: K,
    reset: () => { SD.reset(); enterIsland(false); },
  };
})();
