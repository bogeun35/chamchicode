// 로켓 쥐 — 게임 본체: 저장, 캐릭터·대기실 업그레이드 데이터, 입력, 웨이브 관리자(o_level_setup), 치즈(par_collectable), 카메라.
// 근거: notes/ui_flow.md §1·§4, notes/meta.md, notes/upgrades.md §2.5. 숫자는 원작 그대로.
(function () {
  'use strict';
  const { dcos, dsin, lerp, clamp, point_direction, point_distance, random, random_range, irandom, get_chance } = GM;
  const C = RatsCombat, W = C.W, S = n => RatsSound.play(n);

  // ---- 캐릭터 (o_rat_*_Create_0; player.md §1.4) ------------------------------------------------
  const CHARS = [
    { key: 'white', obj: 'o_rat_white', name: 'white_name', weapon: 'single', moon: 3946794 },
    { key: 'nerd', obj: 'o_rat_nerd', name: 'nerd_name', weapon: 'triple_op', moon: 4202825 },
    { key: 'soldier', obj: 'o_rat_soldier', name: 'soldier_name', weapon: 'shotgun', moon: 1782563 },
    { key: 'doctor', obj: 'o_rat_doctor', name: 'doctor_name', weapon: 'single_op', moon: 1709069 },
    { key: 'robot', obj: 'o_rat_robot', name: 'robot_name', weapon: 'quad', moon: 4792366 },
    { key: 'eletric', obj: 'o_rat_eletric', name: 'eletric_name', weapon: 'triple', moon: 4011042 },
  ];
  const CHAR = Object.fromEntries(CHARS.map(c => [c.key, c]));

  // ---- 대기실 업그레이드 9종 (scr_global_upgrades; meta.md §1.2) ----------------------------------
  const P5 = [250, 500, 1500, 4000, 7500];
  const MAIN = [
    [ { name: 'main_upgrade_damage', icon: 'gun', max: 5, price: P5, amt: .2, eff: (u, p) => { p.final_bonus_damage += u.amt * u.level; }, vars: u => [Math.round(u.amt * 100) + '%'] },
      { name: 'main_upgrade_critical', icon: 'crit', max: 5, price: P5, amt: .04, eff: (u, p) => { p.final_bonus_critical_chance += u.amt * u.level * 100; p.final_bonus_critical_damage += u.amt * u.level * 2; }, vars: u => [Math.round(u.amt * 100) + '%', Math.round(u.amt * 2 * 100) + '%'] },
      { name: 'main_upgrade_fire_rate', icon: 'boot', max: 5, price: P5, amt: .07, eff: (u, p) => { p.final_bonus_fire_rate += u.amt * u.level; p.final_bonus_reload_time += u.amt * u.level; }, vars: u => [Math.round(u.amt * 100) + '%', Math.round(u.amt * 100) + '%'] } ],
    [ { name: 'main_upgrade_health', icon: 'heart', max: 4, price: [250, 750, 2000, 5000], amt: 1, eff: (u, p) => { p.life_in_hearts += u.amt * u.level; }, vars: u => [(u.amt / 2).toFixed(1)] },
      { name: 'main_upgrade_slow', icon: 'shield', max: 2, price: [1500, 5000], amt: .1, eff: (u) => { W.g.enemy_slow_increase += u.amt * u.level; }, vars: u => [Math.round(u.amt * 100) + '%'] },
      { name: 'main_upgrade_movement', icon: 'feather', max: 3, price: [1500, 2500, 5000], amt: .05, eff: (u, p) => { p.final_bonus_movement_speed += u.amt * u.level * 3; p.final_bonus_dodge_chance += u.amt * u.level * 100; }, vars: u => [Math.round(u.amt * 100 * 3) + '%', Math.round(u.amt * 100) + '%'] } ],
    [ { name: 'main_upgrade_roll_options', icon: 'plus', max: 1, price: [5000], amt: 1, eff: (u, p) => { p.final_bonus_upgrade_options += u.amt * u.level; }, vars: u => [String(u.amt)] },
      { name: 'main_upgrade_roll', icon: 'roll', max: 1, price: [5000], amt: 1, eff: (u, p) => { p.final_bonus_rolls_number += u.amt * u.level; }, vars: u => [String(u.amt)] },
      { name: 'main_upgrade_rare', icon: 'up', max: 1, price: [5000], amt: 1, eff: (u, p) => { p.pool_chance_multiplier += u.amt; }, vars: u => [Math.round(u.amt * 100) + '%'] } ],
  ];
  const MAIN_CATS = ['offense', 'defense', 'utility'];
  const main_upgrade_get_price = (u, lvl) => u.price[Math.min(lvl, u.price.length - 1)];   // GP L113

  // ---- 저장 (struct78; meta.md §4.3) — localStorage 한 키 ----------------------------------------
  const SAVE_KEY = 'rats_save_v1';
  const BASE = () => ({ save_mode: 'main', character_selected: 'white', characters_unlocked: ['white'], characters_to_unlock: [], upgrades_collected: [], characters_skills: {},
    main_upgrades_progress: {}, main_upgrades_selected: { offense: -1, defense: -1, utility: -1 }, has_visited_global_upgrades: false, has_visited_character_cabin: false,
    coins: 0, spent_coins: 0, best_completion_time: -1, best_total_time: -1, best_waves_survived: 0, best_enemies_killed: 0, best_coins_gathered: 0 });
  let SAVE = BASE();
  function load() { try { const s = JSON.parse(localStorage.getItem(SAVE_KEY) || 'null'); if (s) SAVE = Object.assign(BASE(), s); } catch (e) {} for (const row of MAIN) for (const u of row) { const v = SAVE.main_upgrades_progress[u.name]; u.level = Math.min(v || 0, u.max); SAVE.main_upgrades_progress[u.name] = u.level; } }
  function save() { try { localStorage.setItem(SAVE_KEY, JSON.stringify(SAVE)); } catch (e) {} }
  load();

  // ---- 입력 (o_input) -----------------------------------------------------------------------------
  const keys = new Set(), pressed = new Set();
  const I = { left: 0, right: 0, up: 0, down: 0, move_force: 0, interact: false, enter: false, back: false, pause: false, card_left: 0, card_right: 0, card_up: 0, card_down: 0, stats: false, inspect: false, mouse_selecting: false, mx: 0, my: 0, click: false };
  addEventListener('keydown', e => { if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'Space', 'Tab'].includes(e.code)) e.preventDefault(); if (!keys.has(e.code)) pressed.add(e.code); keys.add(e.code); });
  addEventListener('keyup', e => keys.delete(e.code));
  addEventListener('blur', () => keys.clear());
  // 터치·마우스: 화면 아무 곳이나 눌러 끌면 가상 스틱(원작 o_mobile 스틱처럼 거리/반지름 = move_force), 짧게 탭하면 선택
  const TOUCH = { id: null, sx: 0, sy: 0, x: 0, y: 0, t: 0, moved: false, tap: false, tapX: 0, tapY: 0, active: false };
  addEventListener('pointerdown', e => { if (TOUCH.id !== null) return; Object.assign(TOUCH, { id: e.pointerId, sx: e.clientX, sy: e.clientY, x: e.clientX, y: e.clientY, t: performance.now(), moved: false, active: true }); });
  addEventListener('pointermove', e => { if (e.pointerId !== TOUCH.id) return; TOUCH.x = e.clientX; TOUCH.y = e.clientY; if (Math.hypot(TOUCH.x - TOUCH.sx, TOUCH.y - TOUCH.sy) > 10) TOUCH.moved = true; });
  const up = e => { if (e.pointerId !== TOUCH.id) return; if (!TOUCH.moved && performance.now() - TOUCH.t < 350) { TOUCH.tap = true; TOUCH.tapX = e.clientX; TOUCH.tapY = e.clientY; } TOUCH.id = null; TOUCH.active = false; };
  addEventListener('pointerup', up); addEventListener('pointercancel', up);
  function readInput() {
    const k = c => keys.has(c), p = c => pressed.has(c);
    I.left = k('ArrowLeft') || k('KeyA') ? 1 : 0; I.right = k('ArrowRight') || k('KeyD') ? 1 : 0; I.up = k('ArrowUp') || k('KeyW') ? 1 : 0; I.down = k('ArrowDown') || k('KeyS') ? 1 : 0;
    I.move_force = (I.left || I.right || I.up || I.down) ? 1 : 0;                    // 키보드는 1 (player.md §2.3)
    I.stick = null;
    if (TOUCH.active && TOUCH.moved) {   // 스틱: move_force = min(거리/반지름, 1), 방향은 그대로 (o_input_Step_1 L308–323 의 게임패드 방식)
      const dx = TOUCH.x - TOUCH.sx, dy = TOUCH.y - TOUCH.sy, d = Math.hypot(dx, dy), R = 40;
      if (d > 4) { I.stick = { dx, dy, force: Math.min(d / R, 1) }; I.move_force = I.stick.force; I.left = dx < 0 ? 1 : 0; I.right = dx > 0 ? 1 : 0; I.up = dy < 0 ? 1 : 0; I.down = dy > 0 ? 1 : 0; }
    }
    I.click = TOUCH.tap; I.mx = TOUCH.tapX * (window.devicePixelRatio > 1 ? Math.min(window.devicePixelRatio, 2) : 1); I.my = TOUCH.tapY * (window.devicePixelRatio > 1 ? Math.min(window.devicePixelRatio, 2) : 1); TOUCH.tap = false;
    I.card_left = p('ArrowLeft') || p('KeyA') ? 1 : 0; I.card_right = p('ArrowRight') || p('KeyD') ? 1 : 0; I.card_up = p('ArrowUp') || p('KeyW') ? 1 : 0; I.card_down = p('ArrowDown') || p('KeyS') ? 1 : 0;
    I.interact = p('KeyE') || p('Space') || p('Enter'); I.enter = p('Enter') || p('Space') || p('KeyE'); I.enter_held = k('Enter') || k('Space') || k('KeyE');
    I.back = p('Escape') || p('Backspace'); I.pause = p('Escape') || p('KeyP'); I.stats = k('Tab'); I.inspect = p('KeyQ');
    // 터치: 오른쪽 위 구석 탭 = 뒤로/일시정지, 그 밖의 탭 = 선택(보상 카드는 카드 자리로 판정), 제자리 누르고 있기 = Enter 누르고 있기
    if (I.click) {
      const cw = innerWidth, corner = TOUCH.tapX > cw - 70 && TOUCH.tapY < 70;
      if (corner) { I.back = true; I.pause = true; }
      else if (!(W.level && W.g.game_state === 'reward')) { I.enter = true; I.interact = true; }
    }
    if (TOUCH.active && !TOUCH.moved && performance.now() - TOUCH.t > 200) I.enter_held = true;
    if (I.card_left || I.card_right || I.card_up || I.card_down) I.mouse_selecting = false;
    pressed.clear();
  }

  // ---- 웨이브 표 (o_level_setup_Create_0 L715–753; ui_flow.md §4.6) -------------------------------
  // wave_create(coins_needed, timer_between_enemies, health_increase, speed_increase, enemy_options)
  const ST = 'star', MO = 'moon', PL = 'planet';
  const WAVES = [
    [5, 100, 0, 0, [ST]], [7, 80, 0, 0, [ST]], [9, 70, 0, 0, [ST]], [12, 60, 0, 0, [ST]], [14, 55, 0, 0, [ST]],
    [17, 60, 0, .1, [ST, ST, ST, ST, MO]], [20, 55, 0, .1, [ST, ST, ST, ST, MO]], [24, 50, 0, .1, [ST, ST, ST, ST, MO]], [28, 45, 0, .1, [ST, MO]], [33, 40, 0, .1, [ST, MO]],
    [50, 35, 0, .1, [MO]], [60, 32, 0, .15, [MO]], [70, 30, 0, .15, [MO]], [80, 27, 0, .15, [MO]], [100, 24, 0, .15, [MO]],
    [130, 24, .85, .65, [MO, MO, PL]], [150, 23, .85, .65, [MO, MO, PL]], [180, 22, .85, .85, [MO, MO, PL]], [220, 21, .85, .85, [MO, MO, PL]], [250, 16, .85, .9, [MO, MO, PL]],
    [280, 13, 2.5, 1, [MO, MO, ST, PL]], [320, 10, 2.5, 1, [MO, MO, ST, PL]], [400, 7.5, 2.5, 1, [MO, MO, ST, PL]], [550, 5, 2.5, 1, [MO, MO, ST, PL]], [1000, 2.5, 2.5, 1, [MO, MO, ST, PL]],
    [2000, 1.1, 4.5, 2.2, [ST, MO, PL]], [2300, 1.1, 4.5, 2.2, [ST, MO, PL]], [2500, 1.1, 7.25, 2.3, [ST, MO, PL]], [3000, 1.1, 8.5, 2.3, [ST, MO, PL]], [3500, 1.1, 9.25, 2.8, [ST, MO, PL]],
  ];
  function wave_create(list, coins_needed, timer, health_increase, speed_increase, options, max = -1) {   // anon@15004 L683–711, struct186 L688–700
    const w = { coins_needed, coins_taken: 0, timer_between_enemies: timer, delay: timer, enemy_options: options, health_increase, speed_increase, max_amount_of_enemies: max, delay_start: 10, duration: 0,
      minimum_amount_of_enemies: Math.floor(list.length / 5) * 2 };                       // L706–709 (push 전 길이)
    list.push(w); return w;
  }
  function buildWaves() {
    const list = [];
    for (const w of WAVES) wave_create(list, ...w);
    // 무한 웨이브 (L756–774): n = 99 - 30 = 69, t = (i/68)^2.4, wave_create(50, lerp(1,1,t), lerp(10,5000,t), lerp(3,12,t), [별,달,행성], 40), delay_start = 0
    const n = 99 - list.length;
    for (let i = 0; i < n; i++) { const t = Math.pow(i / (n - 1), 2.4); const w = wave_create(list, 50, 1 + (1 - 1) * t, 10 + (5000 - 10) * t, 3 + (12 - 3) * t, [ST, MO, PL], 40); w.delay_start = 0; }
    return list;
  }

  // ---- 치즈 (par_collectable; meta.md §3.3–3.5) ---------------------------------------------------
  const COIN = [{ spr: 's_coin_01', value: 1 }, { spr: 's_coin_02', value: 2 }, { spr: 's_coin_03', value: 3 }];
  function collectables_distribute(amount) { const out = []; for (let i = COIN.length - 1; i >= 0; i--) { const n = Math.floor(amount / COIN[i].value); amount -= n * COIN[i].value; out[i] = { ...COIN[i], amount: n }; } return out; }
  function collectables_create(x, y, w, h, dist, auto) {
    for (const d of dist) for (let k = 0; k < d.amount; k++) {
      const xx = x + random_range(-w / 2, w / 2), yy = y + random_range(-h / 2, h / 2);
      const c = C.create('coin', xx, yy, -yy, { sprite_index: d.spr, value: d.value, auto_collect: !!auto, wave_to_add_to: W.g.wave_index });
      coinAdd(c);
    }
  }
  function coinAdd(c) {   // anon@1395 L64–95: 떨어지는 순간 웨이브 진행에 더함
    const L = W.level; if (!L) return;
    const w = L.waves[L.wave_index]; if (!w) return;
    const taken = w.coins_taken;
    if (c.wave_to_add_to !== -1 && L.wave_index === c.wave_to_add_to) {
      w.coins_taken = Math.min(taken + c.value, w.coins_needed);
      if (w.coins_taken !== taken) { L.wave_progress_number_xscl = 1.2; L.wave_progress_number_yscl = .8333333333; if (w.coins_taken >= w.coins_needed && W.player) { W.player.invulnerable = true; W.player.delay_invulnerable = 30; } }
      L.delay_wave_progress = 6; L.last_wave_progress = L.wave_progress;
    }
    W.g.coins_gathered += c.value;
  }
  C.KINDS.coin = {
    create(c) { Object.assign(c, { shadow_length: 24, state: 'idle', delay_standing: 0, range: 100, lerp_player: 0, delay_start: GM.irandom_range(4, 6), z: 0, imagespeed: random_range(.8, 1),
      vel: random_range(1.4, 2), deacceleration: .06, dir: random(360), zgravity: .08, zspeed: random_range(-1, -1.5), timer_white: 12, delay_white: 12, imagexscale: 1, imageyscale: 1, shadow_alpha: 1 }); c.zjump_speed = c.zspeed * .8; },
    step(c) {
      if (W.g.pause) return;
      c.image_speed = c.imagespeed * W.g.game_speed;
      const P = W.player; if (!P) return;
      const d0 = point_distance(c.x, c.y, P.x, P.y);
      if (c.vel > .01) { c.x += dcos(c.dir) * c.vel; c.y -= dsin(c.dir) * c.vel; c.vel = lerp(c.vel, 0, c.deacceleration); }   // L21–29
      if (c.z < 0 || c.zspeed !== 0) { c.z += c.zspeed; c.zspeed += c.zgravity; if (c.z >= 0) { c.z = 0; c.zspeed = c.zjump_speed; c.zjump_speed *= .4; c.imagexscale = 1.2; c.imageyscale = .9; if (c.zjump_speed >= -.1) c.zjump_speed = 0; } }   // L32–45
      c.imagexscale = lerp(c.imagexscale, 1, .2); c.imageyscale = c.state === 'collect' ? c.imageyscale : lerp(c.imageyscale, 1, .2);
      if (c.delay_white > 0) c.delay_white--;
      const dis = point_distance(c.x, c.y, P.x, P.y); c.depth = -c.y;
      switch (c.state) {
        case 'idle': if (W.g.game_state !== 'lost' && (c.auto_collect || dis < c.range || c.delay_standing++ >= 10)) c.state = 'follow'; break;   // L54–56
        case 'follow': if (c.delay_start-- <= 0) c.state = 'stop'; break;                                                                         // L64–65
        case 'stop': c.deacceleration = .2; c.zgravity = lerp(c.zgravity, 0, .2); c.zspeed = lerp(c.zspeed, 0, .2); if (c.vel <= .1) { c.vel = 0; c.zgravity = 0; c.zspeed = 0; c.state = 'player'; } break;   // L73–83
        case 'player': {   // L95–122
          c.dir = point_direction(c.x, c.y, P.x, P.y);
          const b = GM.bboxOf(P), half = b ? (b.b - b.t) * .5 : 6, lp = c.lerp_player;
          c.lerp_player = lerp(lp, 1, .2 + .3 * lp); c.imagespeed = lerp(c.imagespeed, 0, .3 * lp); c.z = lerp(c.z, -half, .4 * lp); c.vel = lerp(c.vel, 16, .4 * lp); c.shadow_alpha = 1 - lp;
          c.x += dcos(c.dir) * c.vel; c.y -= dsin(c.dir) * c.vel;
          const dis2 = point_distance(c.x, c.y, P.x, P.y);
          if (GM.overlap(c, c.x, c.y, P) || dis2 > d0) { c.state = 'collect'; c.lerp_player = 0; c.imagespeed = 0; c.shadow_alpha = 0; c.vel = 0;
            if (b) { c.x = (b.l + b.r) / 2 + dcos(c.dir) * 2; c.y = (b.t + b.b) / 2 - dsin(c.dir) * 2 - 5; } c.z = 0; }
          break; }
        case 'collect': {   // L131–140
          c.depth = P.depth - 5; c.lerp_player = lerp(c.lerp_player, 1, .2 + .3 * c.lerp_player);
          const target = 1 / 16; c.imageyscale = lerp(c.imageyscale, target, c.lerp_player);
          if (c.imageyscale <= target + 1e-3) { S('coin_collect'); SAVE.coins += c.value; C.destroy(c); }
          break; }
      }
    },
  };

  // ---- 웨이브 관리자 (o_level_setup) -------------------------------------------------------------
  function newLevel() {
    const L = { kind: 'level', waves: buildWaves(), wave_index: 0, wave_number_limit: 30, wave_progress: 0, wave_progress_goal: 0, last_wave_progress: 0, delay_wave_progress: 0,
      lerp_ui: 0, title_lerp: 0, delay_title: 0, title_xscl: 1, title_yscl: 1, title_spring_xscl: 1, title_spring_yscl: 1, title_spring_xscl_spd: 0, title_spring_yscl_spd: 0,
      title_letters_shake: false, title_letters_shake_len: 1, title_letters_shake_len_spd: 0, title_letters_shake_time: 0, title_letters_rainbow: 0, title_delay_white: 0, title_timer_white: 12,
      wave_progress_number_xscl: 1, wave_progress_number_yscl: 1, wave_progress_number_delay_white: 0,
      reward_setup: false, reward_number: 0, is_rolling: false, card_roll_number_available: 0, rolls_in_one_round: 0, cards: [], card_selected: null, card_selected_x: 0, reward_pitch: 0,
      lerp_cards: 0, lerp_end_game: 0, lerp_results: 0, show_end_results: false, delay_show_end_results: 0, delay_show_results: 0, delay_end_results: 0, press_restart_delay: 0,
      final_result_text_index: 'run_lost', final_result_xscl: 1, final_result_yscl: 1, final_result_xscl_spd: 0, final_result_yscl_spd: 0, final_result_len: 0, final_result_time: 0, final_result_rainbow: 0,
      has_completed_main_waves: false, results: [], on_game_start: null, roll_callbacks: [], end_buttons: false, button_sel: 0, desc: { upgrade: null, lerp: 0, xscl: 1, yscl: 1, x: 0, y: 0 }, game_ui_y: 0 };
    return L;
  }
  W.level = null;

  // ---- 카메라 (o_camera_Step_0; ui_flow.md §1.4) -------------------------------------------------
  const CAM = { x: 480, y: 320, size: 1, size_spd: 0, xoffset: 0, yoffset: 0, shake_x: 0, shake_y: 0, state: 1, vel: .14, delay_size: 0 };
  function stepCamera() {
    if (!W.g.pause) {
      for (let i = 0; i < W.shakes.length; i++) { const h = W.shakes[i];
        if (h.dir === -1) { CAM.shake_x += random_range(-h.offset, h.offset); CAM.shake_y += random_range(-h.offset, h.offset); }
        else { const r = random_range(-h.offset, h.offset); CAM.shake_x += r * dcos(h.dir); CAM.shake_y += r * -dsin(h.dir); }
        h.offset *= h.decrease; if (h.offset <= .01) { W.shakes.splice(i, 1); i--; } }
      if (Math.abs(CAM.shake_x) > 1) CAM.shake_x = Math.pow(Math.abs(CAM.shake_x), .3) * Math.sign(CAM.shake_x);   // L37–38
      if (Math.abs(CAM.shake_y) > 1) CAM.shake_y = Math.pow(Math.abs(CAM.shake_y), .3) * Math.sign(CAM.shake_y);
      CAM.shake_x *= .8; CAM.shake_y *= .8;                                                                           // L40–41
    }
    CAM.view_shake_x = CAM.shake_x; CAM.view_shake_y = CAM.shake_y;
    if (!W.g.pause) {
      if (CAM.state === 1) { CAM.size = lerp(CAM.size, 1, .12); CAM.x = lerp(CAM.x, W.g.circle_x, CAM.vel); CAM.y = lerp(CAM.y, W.g.circle_y, CAM.vel); CAM.yoffset = (W.player && !W.g.in_combat) ? -48 : 0; }   // L87–102
      else if (CAM.state === 2 && W.player) { if (CAM.delay_size <= 0) { CAM.size_spd = lerp(CAM.size_spd, (.5 - CAM.size) * .5, .3); CAM.size += CAM.size_spd; } else CAM.delay_size--; CAM.xoffset = 0; CAM.yoffset = 0; CAM.x = lerp(CAM.x, W.player.x, CAM.vel); CAM.y = lerp(CAM.y, W.player.y, CAM.vel); }   // L110–127
    }
    CAM.shake_x = 0; CAM.shake_y = 0;                                                                                  // L134–135
  }

  window.RatsGame = { CHARS, CHAR, MAIN, MAIN_CATS, main_upgrade_get_price, get SAVE() { return SAVE; }, save, load, I, readInput, keys, WAVES, wave_create, newLevel,
    collectables_distribute, collectables_create, CAM, stepCamera,
    unlockCharacter(k) { if (!SAVE.characters_unlocked.includes(k) && !SAVE.characters_to_unlock.includes(k)) { SAVE.characters_to_unlock.push(k); save(); } },
    collectUpgrade(obj) { if (!SAVE.upgrades_collected.includes(obj) && !obj.includes('o_roll_upgrade')) { SAVE.upgrades_collected.push(obj); save(); } },
    rollCards() {   // o_roll_upgrade_01 create (anon@73): rolled_this_level++, roll_callbacks 호출
      const L = W.level; if (!L) return;
      if (W.player) W.player.rolled_this_level += 1; L.rolls_in_one_round++; L.is_rolling = true;
      for (const f of L.roll_callbacks) f();
    },
  };
})();
