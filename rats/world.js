// 로켓 쥐 — 장면: 대기실(rm_lobby_space)·경기장(rm_game_space). 웨이브 상태 머신은 o_level_setup_Step_0
// (notes/ui_flow.md §4.5, upgrades.md §2.5) 그대로. 그리기 순서는 원작 depth(큰 값 먼저).
(function () {
  'use strict';
  const { dcos, dsin, lerp, clamp, point_distance, random, random_range, irandom, choose, get_chance } = GM;
  const C = RatsCombat, W = C.W, G = RatsGame, UI = RatsUI, A = RatsArt, U = RatsUpgrades, S = n => RatsSound.play(n);
  const R = { scene: null, props: [], L: null };

  // ---- 대기실 ---------------------------------------------------------------------------------
  // rooms.json rm_lobby_space: station(512,352) rocket(516,296) upgrades_area(389,338) character_cabin(626,402), 화분들
  const LOBBY_PROPS = [['rocket', 516, 296], ['upgrades_area', 389, 338], ['cabin', 626, 402],
    ['plant_01', 663, 336], ['plant_02', 588, 333], ['plant_02', 447, 426], ['plant_02', 468, 326], ['plant_03', 495, 318], ['plant_03', 524, 429], ['plant_03', 636, 333],
    ['plant_02', 588, 413], ['plant_01', 604, 301], ['plant_01', 411, 375], ['plant_02', 332, 365], ['plant_03', 396, 413], ['plant_03', 417, 422]];
  const PROP_ORIGIN = { rocket: [37, 131], upgrades_area: [67, 43], cabin: [53, 113], plant_01: [7, 10], plant_02: [5, 12], plant_03: [8, 11] };
  // 상호작용 (par_interactable): 기본 반지름 24, 로켓 48 (-8,-8), 컴퓨터 48
  const INTER = [{ id: 'rocket', x: 516, y: 296, range: 48, ox: -8, oy: -8 }, { id: 'computer', x: 389, y: 338, range: 48, ox: 0, oy: 0 }, { id: 'cabin', x: 626, y: 402, range: 24, ox: 0, oy: 0 }];
  function enterLobby() {
    C.resetWorld(); R.scene = 'lobby';
    Object.assign(W.g, { game_state: 'start', in_combat: false, in_lobby: true, room_width: 1024, room_height: 704, circle_x: 512, circle_y: 352, circle_range: 0 });   // o_lobby_setup_Create_0 L4–15
    G.CAM.x = 512; G.CAM.y = 352; G.CAM.size = 1; G.CAM.state = 1;
    RatsActors.spawnPlayer(512, 352, false);
    W.player.state = 'idle';
    C.setWorldCollision((inst, x, y) => lobbyBlocked(x, y)); RatsActors.setWorldBlocked(lobbyBlocked);
    R.L = null; R.ui = null; R.lerp_ui = 0; RatsSound.music('lobby');
    // 새로 해금된 캐릭터(characters_to_unlock) → 해금 목록으로 옮기고 알림 (o_control 해금 팝업 대신 간단한 알림)
    R.unlocked = []; const S0 = G.SAVE;
    for (const k of S0.characters_to_unlock) if (!S0.characters_unlocked.includes(k)) { S0.characters_unlocked.push(k); R.unlocked.push(k); }
    S0.characters_to_unlock = []; if (R.unlocked.length) { G.save(); R.unlock_t = 0; }
    for (const it of INTER) it.lerp = 0;
  }
  // 정거장 걷는 영역 = 타원 반지름 186×81 (s_station_collision 372×162, 원점 186,81) + 소품 충돌
  function lobbyBlocked(x, y) {
    const dx = (x - 512) / 182, dy = (y - 352) / 77;
    if (dx * dx + dy * dy > 1) return true;
    if (Math.abs(x - 516) < 22 && y > 286 && y < 300) return true;                // 로켓 발판
    if (x > 389 - 45 && x < 389 + 55 && y > 338 - 24 && y < 338 + 26) return true; // 컴퓨터 책상 (s_upgrades_area_collision 22..122 × 19..69)
    if (Math.abs(x - 626) < 40 && y > 380 && y < 404) return true;                // 오두막
    return false;
  }
  function lobbyTick() {
    const P = W.player, I = G.I;
    if (R.ui) { RatsLobbyUI.step(R.ui, I); if (R.ui.closed) R.ui = null; }
    for (const it of INTER) {
      it.sel = !R.ui && !RatsMain.SC.trans && P && point_distance(it.x + it.ox, it.y + it.oy, P.x, P.y) <= it.range;   // par_interactable_Step_0 L17–20
      it.lerp = it.sel ? lerp(it.lerp, 1, .1 + .2 * it.lerp) : lerp(it.lerp, 0, .3);
      if (it.sel && I.interact) {
        if (it.id === 'rocket') RatsMain.goto('game');
        else if (it.id === 'computer') R.ui = RatsLobbyUI.openComputer();
        else if (it.id === 'cabin') R.ui = RatsLobbyUI.openCabin();
        I.interact = false;
      }
    }
    if (!R.ui && I.pause) RatsMain.goto('menu');
    W.g.pause = !!R.ui;
    if (!R.ui) C.stepWorld();
  }

  // ---- 경기장 (o_level_setup) ------------------------------------------------------------------
  function enterGame() {
    C.resetWorld(); R.scene = 'game';
    const L = R.L = W.level = G.newLevel();
    Object.assign(W.g, { game_state: 'start', in_combat: true, in_lobby: false, room_width: 960, room_height: 640, circle_x: 480, circle_y: 320, circle_range: 0, circle_range_goal: 110,   // Create L37–51
      completion_time: 0, total_time: 0, waves_survived: 0, enemies_killed: 0, coins_gathered: 0 });
    L.circle_range_spd = 0; L.circle_offset = 0;
    G.CAM.x = 480; G.CAM.y = 320; G.CAM.size = 1; G.CAM.state = 1;
    C.setWorldCollision(() => false); RatsActors.setWorldBlocked(() => false);
    U.reset_upgrades();
    RatsActors.spawnPlayer(480, 320, true);                                             // Create L121–134: entrance, z = -room_height
    RatsSound.music('level');
    L.last_time = performance.now();
  }
  function setState(L, s) { W.g.game_state = s; }
  function levelTick() {
    const L = R.L, P = W.player, I = G.I;
    // 원 반지름 스프링 (Step_0 L118–121) + 원 둘레 흔들림
    W.g.time = (W.g.time || 0) + 10 * W.g.game_speed;
    L.circle_offset = dcos(W.g.time / 10);
    L.circle_range_spd = lerp(L.circle_range_spd, (W.g.circle_range_goal - W.g.circle_range) * .4, .16); W.g.circle_range += L.circle_range_spd;
    const wi = Math.max(L.wave_index, 0), wv = L.waves[wi];                              // o_level_setup_Step_1 L83–89
    W.g.enemy_health_increase = wv ? wv.health_increase : 0; W.g.enemy_speed_increase = wv ? wv.speed_increase : 0;
    W.g.enemy_slow_increase = 0;
    W.g.wave_index = L.wave_index;
    if (L.on_game_start) { const f = L.on_game_start; L.on_game_start = null; f(); W.g.wave_index = L.wave_index; }   // Step_0 L107–111 (재능 시작 업그레이드)
    const st = W.g.game_state, now = performance.now();
    if (!['won', 'lost', 'start'].includes(st) && !W.g.pause) { const d = now - L.last_time; if (!L.has_completed_main_waves) W.g.completion_time += d; W.g.total_time += d; }   // L2–11
    L.last_time = now;
    // 사운드 지연 카운터 (o_control_Step_1)
    for (const k of ['hurt_delay_sound', 'curse_delay_sound', 'lightning_delay_sound', 'explosion_delay_sound', 'arrow_delay_sound']) if (W.g[k] > 0) W.g[k]--;
    W.g.aberration = lerp(W.g.aberration, 0, .08); if (W.g.aberration <= .01) W.g.aberration = 0;
    // 제목·숫자 스프링 (L22–23, L727–748)
    L.wave_progress_number_xscl = lerp(L.wave_progress_number_xscl, 1, .2); L.wave_progress_number_yscl = lerp(L.wave_progress_number_yscl, 1, .2);
    if (L.wave_progress_number_delay_white > 0) L.wave_progress_number_delay_white--;
    if (st !== 'start') { if (L.delay_title < 20) L.delay_title++; else L.title_lerp = lerp(L.title_lerp, 1, .1 + .2 * L.title_lerp); }   // L719–724
    L.title_spring_xscl_spd = lerp(L.title_spring_xscl_spd, (1 - L.title_spring_xscl) * .5, .2); L.title_spring_xscl += L.title_spring_xscl_spd;
    L.title_spring_yscl_spd = lerp(L.title_spring_yscl_spd, (1 - L.title_spring_yscl) * .5, .2); L.title_spring_yscl += L.title_spring_yscl_spd;
    L.title_xscl = lerp(L.title_xscl, 1, .2); L.title_yscl = lerp(L.title_yscl, 1, .2);
    if (L.title_letters_shake) { L.title_letters_shake_len_spd = lerp(L.title_letters_shake_len_spd, -L.title_letters_shake_len * .3, .12); L.title_letters_shake_len += L.title_letters_shake_len_spd; if (Math.abs(L.title_letters_shake_len) < .05) L.title_letters_shake = false; }
    else { L.title_letters_shake_len = lerp(L.title_letters_shake_len, 1, .2); L.title_letters_rainbow = lerp(L.title_letters_rainbow, 1, .3); }
    L.title_letters_shake_time += 4;
    if (L.title_delay_white > 0) L.title_delay_white--;
    L.lerp_ui = P && P.state !== 'entrance' ? lerp(L.lerp_ui, 1, .1) : L.lerp_ui;
    const lc = L.lerp_cards; L.lerp_cards = st === 'reward' ? lerp(lc, 1, .1 + .2 * lc) : lerp(lc, 0, .1 + .2 * (1 - lc));   // Draw_74 L24–25
    if (I.pause && !['won', 'lost'].includes(st)) W.g.pause = !W.g.pause;
    if (W.g.pause) { RatsPause.step(I); return; }

    switch (st) {
      case 'start': {   // L565–578
        L.wave_progress = 0;
        const ready = P && P.state !== 'entrance' && W.g.in_combat;
        if (ready && L.lerp_ui > .1) { if (L.reward_number <= 0 && U.state.options.length === 0) setState(L, 'combat'); else { setState(L, 'reward'); L.reward_setup = true; L.reward_pitch = 0; } }
        break; }
      case 'combat': combatStep(L); break;
      case 'reward': rewardStep(L, I); break;
      case 'combat setup': {   // L998–1029
        L.wave_progress = lerp(L.wave_progress, 0, .01 + .5 * (1 - L.wave_progress));
        if (L.wave_progress <= 1e-5) {
          L.wave_index += 1; W.g.wave_index = L.wave_index; setState(L, 'combat');
          if (!L.has_completed_main_waves) { L.title_spring_xscl = 1.4; L.title_spring_yscl = .7; L.title_letters_shake = true; L.title_letters_shake_len = 4; } else L.title_spring_xscl = 1.2;
          L.wave_progress_number_xscl = 1.2; L.wave_progress_number_yscl = 1.2; L.wave_progress = 0;
        }
        break; }
      case 'lost': case 'won': endStep(L, I); break;
    }
    if (W.g.game_state !== 'reward') L.desc.upgrade = null;
    C.stepWorld();
    stepCards(L, I);
  }
  function combatStep(L) {   // L589–715
    const w = L.waves[L.wave_index]; if (!w) return;
    w.coins_taken = clamp(w.coins_taken, 0, w.coins_needed);
    L.wave_progress_goal = w.coins_taken / w.coins_needed;
    if (L.delay_wave_progress-- <= 0) { const t = L.wave_progress_goal - L.last_wave_progress <= 0 ? 0 : (L.wave_progress - L.last_wave_progress) / (L.wave_progress_goal - L.last_wave_progress); L.wave_progress = lerp(L.wave_progress, L.wave_progress_goal, .1 + .3 * t); }
    w.duration += 1 / 60;                                                                 // L626
    if (w.coins_needed - w.coins_taken > 0) {                                             // L629–653 적 생성 (enemies_waves.md §2.5)
      if (w.delay_start-- <= 0) {                                                         // L631 (이전 값 비교)
        const n = C.count('enemy');
        if (n <= w.minimum_amount_of_enemies) w.delay = Math.min(w.delay, 2);             // L634
        if (w.delay <= 1) {                                                               // L637
          if (n < 200 && (w.max_amount_of_enemies === -1 || n < w.max_amount_of_enemies)) {   // L638
            while (w.delay > 0) {                                                         // L640
              w.delay -= Math.min(w.timer_between_enemies, 1);                            // L642
              const kind = w.enemy_options[irandom(w.enemy_options.length - 1)];          // L644
              const pos = RatsActors.enemy_position_to_spawn(kind);                       // L645
              if (pos === -1) break;                                                      // L646
              RatsActors.spawnEnemy(kind, pos[0], pos[1]);                                // L648
              if (w.timer_between_enemies >= 1) break;                                    // L650
            }
            w.delay += Math.max(w.timer_between_enemies, 1);                              // L653
          }
        } else w.delay--;                                                                 // L637
      }
    }
    if (w.coins_taken >= w.coins_needed) {                                                // L657–715 웨이브 끝
      L.wave_progress = L.last_wave_progress = L.wave_progress_goal = 1; L.delay_wave_progress = 0;
      L.wave_progress_number_delay_white = 24; L.wave_progress_number_xscl = 2.75; L.wave_progress_number_yscl = 1.15;
      S('wave_clear');
      RatsActors.clear_enemies();
      W.g.waves_survived += 1; G.SAVE.best_waves_survived = Math.max(G.SAVE.best_waves_survived, W.g.waves_survived);
      if (L.wave_index + 1 >= L.wave_number_limit) L.has_completed_main_waves = true;       // L714: 30웨이브 완주 표시(계속 무한 모드)
      if (L.wave_index >= L.waves.length - 1) { setState(L, 'won'); end_run(L, 'won'); }   // L685–705: 99웨이브 뒤 승리
      else { setState(L, 'reward'); L.reward_pitch = 0; L.reward_setup = true; L.reward_number = 1; L.is_rolling = false; G.save();   // L748–754
        L.card_roll_number_available = W.player.final_bonus_rolls_number; if (window.RatsTalents) RatsTalents.onWaveEnd(L); }
    }
  }
  // ---- 보상 카드 (L806–988, create_cards anon@9194) ------------------------------------------------
  function rewardStep(L, I) {
    for (const c of W.inst) if (c.alive && c.kind === 'coin' && c.state === 'idle') c.state = 'follow';   // L803
    if (L.reward_setup && L.wave_index < L.wave_number_limit) {
      if (L.reward_number > 0) { U.set_upgrades_pool(); U.state.options = []; U.set_upgrades_options(); }
      if (L.card_roll_number_available > 0 && (U.state.pool.length > 0 || U.state.options.length > 0)) { U.state.options.push(U.ROLL); L.card_roll_number_available--; }
      create_cards(L); L.reward_setup = false;
    }
    const live = L.cards.filter(c => c.available);
    const noOptions = U.state.options.length <= 0;
    if (live.length) {
      if (I.card_left) L.card_selected_x = Math.max(0, L.card_selected_x - 1);
      if (I.card_right) L.card_selected_x = Math.min(live.length - 1, L.card_selected_x + 1);
      if (I.card_left || I.card_right) S('upgrade_hover');
      live.forEach((c, i) => { c.is_selected = c.lerp_in > .8 && i === L.card_selected_x; });
      if (I.click) { const hit = live.find(c => c.screen && Math.abs(I.mx - c.screen.x) < c.screen.w && Math.abs(I.my - c.screen.y) < c.screen.h); if (hit) { L.card_selected_x = live.indexOf(hit); live.forEach(c => c.is_selected = c === hit); confirmCard(L, hit); return; } }
    }
    const sel = live.find(c => c.is_selected);
    L.desc.upgrade = sel ? sel.upgrade : null;
    if (sel && sel.screen) { L.desc.x = sel.screen.x; L.desc.y = 132 * RatsMain.V.scale + 72 * RatsMain.V.scale; }   // L410–416
    if ((I.enter && sel) || (noOptions && L.cards.length === 0)) confirmCard(L, sel);
  }
  function confirmCard(L, c) {   // L861–988
    const noOptions = U.state.options.length <= 0;
    L.is_rolling = false;
    if (c) S(c.upgrade.is_roll ? 'upgrade_roll' : 'upgrade_choose');
    if (noOptions || (c && !c.upgrade.is_roll && --L.reward_number <= 0)) { setState(L, 'combat setup'); L.wave_progress_goal = 0; }   // wave_goto_next
    else { setState(L, 'reward'); L.reward_pitch = c && !c.upgrade.is_roll ? L.reward_pitch + .03 : 0; L.reward_setup = true; if (c && !c.upgrade.is_roll) L.card_roll_number_available = W.player.final_bonus_rolls_number; }
    let k = 0; for (const o of L.cards) if (o !== c) { o.state = 'out'; o.delay_out = 4 + 4 * k++; o.available = false; }   // L897–919
    if (c) {
      const res = U.activate_upgrade(c.upgrade, W.player);
      c.available = false;
      if (res) { c.state = 'to player'; screen_shake_pop(c); }
      else c.state = 'out';
      U.state.options = [];                                                              // clear_upgrade_options L984
    }
  }
  function screen_shake_pop(c) { c.spring_xscl = 1.2; c.spring_yscl = 1.2; C.screen_shake(6, .8); W.g.aberration += 6; c.twitch_angle += 30; }   // L956–962
  function create_cards(L) {
    const opts = U.state.options, n = opts.length, spread = Math.min(45 + 5 * n, 70);   // L420–425
    L.cards = L.cards.filter(c => c.state === 'to player');
    let delay = 8;
    opts.forEach((u, i) => {
      const t = (i - (n - 1) / 2) / Math.max((n - 1) / 2, 1);                             // L437–439
      L.cards.push({ upgrade: u, time: 40 * i, delay_in: delay, id: i, hand_length: n, angle: -t * spread, lerp_in: 0, lerp_selected: 0, is_selected: false, available: true, state: 'in',
        xscl: 1, yscl: 1, spring_xscl: 1, spring_yscl: 1, spring_xscl_spd: 0, spring_yscl_spd: 0, twitch_angle: 0, twitch_angle_spd: 0, alpha: 1, delay_white: 0, timer_white: 12, delay_out: 0 });
      delay += 5 + 3 * (u.is_rare ? 1 : 0);                                               // L446, L469
      S(u.is_rare ? 'upgrade_rare_pops' : 'upgrade_normal_pops');
    });
    L.card_selected_x = 0;
  }
  function stepCards(L) {
    for (const c of L.cards) {
      c.time += W.g.game_speed;
      if (c.state === 'in') { if (c.delay_in > 0) c.delay_in--; else c.lerp_in = lerp(c.lerp_in, 1, .12 + .2 * c.lerp_in); }
      else if (c.state === 'out') { if (c.delay_out > 0) c.delay_out--; else { c.lerp_in = lerp(c.lerp_in, 0, .2); c.alpha = c.lerp_in; } }
      else if (c.state === 'to player') { c.alpha = lerp(c.alpha, 0, .12); c.lerp_in = lerp(c.lerp_in, 1, .2); }
      const sel = c.is_selected; c.lerp_selected = sel ? lerp(c.lerp_selected, 1, .1 + .2 * c.lerp_selected) : lerp(c.lerp_selected, 0, .15);
      c.spring_xscl_spd = lerp(c.spring_xscl_spd, (1 - c.spring_xscl) * .5, .2); c.spring_xscl += c.spring_xscl_spd;
      c.spring_yscl_spd = lerp(c.spring_yscl_spd, (1 - c.spring_yscl) * .5, .2); c.spring_yscl += c.spring_yscl_spd;
      c.twitch_angle_spd = lerp(c.twitch_angle_spd, -c.twitch_angle * .5, .15); c.twitch_angle += c.twitch_angle_spd;
      if (c.delay_white > 0) c.delay_white--;
    }
    L.cards = L.cards.filter(c => c.alpha > .02 || c.state === 'in');
    const D = L.desc;
    if (D.upgrade !== D._last) { D._last = D.upgrade; if (D.upgrade) { D.xscl = 1.2; D.yscl = .9; } }
    D.lerp = D.upgrade ? lerp(D.lerp, 1, .1 + .3 * (1 - D.lerp)) : lerp(D.lerp, 0, .1 + .2 * D.lerp);
    D.xscl = lerp(D.xscl, 1, .2); D.yscl = lerp(D.yscl, 1, .2);
  }
  // ---- 끝 (end_run anon@11364, Step_0 L317–541) ------------------------------------------------
  function end_run(L, how) {
    if (how === 'lost') { L.final_result_text_index = 'run_lost'; L.final_result_xscl = 1.8; L.final_result_yscl = .7; L.delay_show_end_results = 60; }
    else { L.final_result_text_index = 'run_won'; L.final_result_xscl = 1.4; L.final_result_yscl = .7; L.delay_show_end_results = 90; }
    L.press_restart_delay = 60;
    const S2 = G.SAVE, t2txt = ms => { const s = Math.floor(ms / 1000); return `${String(Math.floor(s / 60)).padStart(2, '0')}:${String(s % 60).padStart(2, '0')}.${String(Math.floor(ms % 1000 / 10)).padStart(2, '0')}`; };
    const rows = [['completion_time', W.g.completion_time, 'best_completion_time', -1, t2txt], ['total_time', W.g.total_time, 'best_total_time', -1, t2txt],
      ['waves_survived', W.g.waves_survived, 'best_waves_survived', 1, String], ['enemies_killed', W.g.enemies_killed, 'best_enemies_killed', 1, v => v.toLocaleString()], ['coins_gathered', W.g.coins_gathered, 'best_coins_gathered', 1, v => v.toLocaleString()]];
    L.results = rows.map(([name, v, best, cmp, f]) => {
      const b = S2[best]; const rec = cmp < 0 ? (v > 0 && (b < 0 || v < b)) : v > b;
      if (rec) S2[best] = v;
      return { name, text: f(v), is_record: rec, lerp_in: 0, xscl: 1, yscl: 1, hidden: name === 'completion_time' && !L.has_completed_main_waves, shown: false };
    });
    G.save();
  }
  function endStep(L, I) {
    if (W.g.game_state === 'won') { L.final_result_len = lerp(L.final_result_len, 2, .2); L.final_result_time += 4; L.final_result_rainbow = lerp(L.final_result_rainbow, 1, .1); }
    L.final_result_xscl_spd = lerp(L.final_result_xscl_spd, (1 - L.final_result_xscl) * .6, .16); L.final_result_xscl += L.final_result_xscl_spd;
    L.final_result_yscl_spd = lerp(L.final_result_yscl_spd, (1 - L.final_result_yscl) * .6, .16); L.final_result_yscl += L.final_result_yscl_spd;
    L.lerp_end_game = lerp(L.lerp_end_game, 1, .08);
    if (L.delay_show_end_results-- <= 0 && !L.show_end_results) { L.show_end_results = true; S(W.g.game_state === 'won' ? 'win_title' : 'game_over_title'); }
    if (!L.show_end_results) return;
    L.lerp_results = lerp(L.lerp_results, 1, .1 + .2 * L.lerp_results); L.delay_show_results++;   // L417–418
    let t = 20, all = true;
    for (const r of L.results) { if (r.hidden) continue; if (L.delay_show_results >= t + 60 && !r.shown) { r.shown = true; r.lerp_in = 1; r.xscl = 1.2; r.yscl = .7; S(r.is_record ? 'upgrade_rare_pops' : 'coin_tick_up'); if (r.is_record) { r.xscl = r.yscl = 1.4; C.screen_shake(6, .8); } } if (!r.shown) all = false; t += 6 * (1 + 2 * (r.is_record ? 1 : 0)); r.xscl = lerp(r.xscl, 1, .2); r.yscl = lerp(r.yscl, 1, .2); }
    if (all) { L.press_restart_delay--; if (L.press_restart_delay <= 0) { if (I.card_up || I.card_left) L.button_sel = 0; if (I.card_down || I.card_right) L.button_sel = 1; if (I.enter) RatsMain.goto(L.button_sel === 0 ? 'game' : 'lobby'); } }
  }

  function tick() {
    if (R.scene === 'lobby') lobbyTick();
    else if (R.scene === 'game') levelTick();
  }

  // ---- 그리기 ---------------------------------------------------------------------------------
  function drawWorld(g, cam) {
    if (R.scene === 'lobby') drawLobbyFloor(g, cam); else drawArenaFloor(g, cam);
    RatsActors.drawEntities(g, cam, R.scene === 'lobby' ? lobbyProps() : []);
  }
  function lobbyProps() {
    return LOBBY_PROPS.map(([n, x, y]) => ({ draw: g => { const s = A.prop(n), o = PROP_ORIGIN[n]; g.drawImage(s, Math.round(x - o[0]), Math.round(y - o[1]));
      const it = INTER.find(q => q.x === x && q.y === y); if (it && it.lerp > .02) { g.globalAlpha = it.lerp; outline(g, s, Math.round(x - o[0]), Math.round(y - o[1])); g.globalAlpha = 1; } }, depth: -y }));
  }
  const outlineCache = new Map();
  function outline(g, s, x, y) {   // 선택 테두리 (par_interactable_Draw_0 셰이더 대신 흰 테두리 미리 굽기)
    let o = outlineCache.get(s);
    if (!o) { o = A.bake(s.width + 2, s.height + 2, q => { q.drawImage(s, 1, 1); }, { outlineColor: '#ffffff' }); outlineCache.set(s, o); }
    g.drawImage(o, x - 1, y - 1); g.drawImage(s, x, y);
  }
  function tile(g, img, cam, alpha = 1) { const p = g.createPattern(img, 'repeat'); g.globalAlpha = alpha; g.fillStyle = p; g.fillRect(Math.floor(cam.x / 64) * 64 - 64, Math.floor(cam.y / 64) * 64 - 64, cam.w + 192, cam.h + 192); g.globalAlpha = 1; }
  function drawLobbyFloor(g, cam) {   // o_lobby_setup_Draw_0: s_lobby_background 타일 0.8 + 그늘
    tile(g, A.prop('lobby_tile'), cam, .8);
    g.drawImage(A.prop('station'), 512 - 187, 352 - 214);
  }
  function drawArenaFloor(g, cam) {   // o_level_setup_Draw_0 L1–104: 달 표면(방 전체) → 우주 덮개에서 원(circle_range+offset) 오려냄, 둘레 고리
    const P = W.player, kind = P ? P.ckey : 'white';
    tile(g, A.prop('space_tile'), cam);
    const r = Math.max(0, W.g.circle_range + (R.L ? R.L.circle_offset : 0)), cx = W.g.circle_x, cy = W.g.circle_y;
    const ring = r + 3;                                                                  // circle_outside_size 3 (Create L556)
    const col = RatsActors.bgr(G.CHAR[kind].moon);
    g.fillStyle = col; g.beginPath(); g.arc(cx, cy, ring, 0, Math.PI * 2); g.fill();
    g.save(); g.beginPath(); g.arc(cx, cy, r, 0, Math.PI * 2); g.clip();
    const pat = g.createPattern(A.moonTile(kind), 'repeat'); g.fillStyle = pat; g.fillRect(cx - r - 64, cy - r - 64, r * 2 + 128, r * 2 + 128);
    g.restore();
  }
  function drawGUI(g, u, Wd, Ht, t) {
    if (R.scene === 'lobby') {
      RatsLobbyUI.drawHUD(g, u, Wd, Ht, t, INTER, R.ui); if (R.ui) RatsLobbyUI.draw(g, R.ui, u, Wd, Ht, t);
      if (R.unlocked && R.unlocked.length && (R.unlock_t = (R.unlock_t || 0) + 1) < 360) {   // 해금 알림 (o_control_Draw_64: 위에서 내려옴)
        const k = Math.min(1, R.unlock_t / 30), y = 32 * u - 96 * u * (1 - k);
        R.unlocked.forEach((c, i) => UI.textOutline(g, Wd / 2, y + i * 22 * u, '🎉 ' + UI.T(G.CHAR[c].name) + ' 해금! (오두막에서 고르기)', 12 * u, '#ffd25c', '#1d1630'));
      }
      return;
    }
    const L = R.L; if (!L) return;
    L.game_ui_y = Math.floor((Ht - 32 * u + 32 * u * (1 - L.lerp_ui)) / u) * u;
    RatsActors.drawPlayerHUD(g, u, Wd, Ht, t, L);
    UI.drawDarken(g, L, Wd, Ht);
    UI.drawTitle(g, L, u, Wd, Ht, t);
    UI.drawWaveBar(g, L, u, Wd, Ht);
    UI.drawCards(g, L, u, Wd, Ht, t);
    UI.drawDescription(g, L.desc, u, t);
    UI.drawEndScreen(g, L, u, Wd, Ht, t);
    if (L.show_end_results && L.press_restart_delay <= 0) {
      ['retry_button', 'lobby_button'].forEach((k, i) => UI.textOutline(g, Wd / 2, Ht / 2 + 36 * u + i * 20 * u + 60 * u, (L.button_sel === i ? '▶ ' : '') + UI.T(k), 11 * u, L.button_sel === i ? '#ffffff' : '#aaaaaa'));
    }
    if (W.g.pause) RatsPause.draw(g, u, Wd, Ht);
  }

  window.RatsWorld = { enterLobby, enterGame, tick, drawWorld, drawGUI, R, end_run: how => R.L && (W.g.game_state = how, end_run(R.L, how)) };
})();
