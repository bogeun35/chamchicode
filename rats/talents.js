// 로켓 쥐 — 캐릭터 재능 트리(오두막에서 치즈로 사서 장착). notes/characters.md §2–3 그대로.
// 노드: [이름, 부모, 가격 idx, x_rel, y_rel, 아이콘, create(e), step(e,p), special(e)]  가격표 costs = [250,350,800,2000,3500,7500]
(function () {
  'use strict';
  const { get_chance, irandom } = GM;
  const C = RatsCombat, W = C.W, G = RatsGame, U = RatsUpgrades, UI = RatsUI, A = RatsArt, S = n => RatsSound.play(n);
  const COSTS = [250, 350, 800, 2000, 3500, 7500];
  const pct = x => Math.round(x * 100) + '%', pr = x => Math.round(x) + '%', int = x => String(Math.round(x));
  const L = () => W.level;
  const inCombat = () => !!W.g.in_combat;
  // 시작 업그레이드(…_tup_01 루트): 경기장 첫 프레임에 o_level_setup.on_game_start 에 걸어 둠 (anon@1272 등)
  function arm(e, fn) { if (RatsWorld.R.scene !== 'game') { e.on_game_start = true; return; } if (e.on_game_start && L()) { L().on_game_start = fn; e.on_game_start = false; } }
  const pull = obj => () => { const lv = L(); lv.wave_index--; const st = U.state, i = st.current_all.findIndex(u => u.obj === obj); if (i >= 0) { st.options.push(st.current_all[i]); st.current_all.splice(i, 1); } };   // upgrade_pull
  const rootNode = (pref, obj) => ({ create: e => { e.on_game_start = true; }, step: (e, p) => { arm(e, pull(obj)); p.card_preference = pref; } });
  const perWave = (stat, amtKey) => (e, p) => { if (inCombat()) p[stat] += Math.floor(Math.max(W.g.wave_index + 1, 0) / e.waves_number) * e[amtKey]; };
  // 3명 처치 → 가까운 적 2마리 즉사 (anon@30207 / 32813 / 35452)
  function killCallback(e, blend) {
    return a => {
      if (a.type === -1) return;
      e.current_enemy_number++; if (e.current_enemy_number < e.enemy_number) return;
      // 원작 버그 수정: 원작은 정렬 없이 넣어 가장 가까운 한 마리가 여러 칸을 차지했음 → 서로 다른 가장 가까운 N마리
      const P = W.player, list = C.enemies().filter(en => en.state !== 'dead' && en.life > 0 && !en.invulnerable)
        .map(en => [GM.point_distance(en.x, en.y, P.x, P.y), en]).sort((a, b) => a[0] - b[0]).slice(0, e.enemies_to_kill);
      for (const [, en] of list) { en.state = 'dead'; const dmg = en.life; en.when_die(en); const info = C.damage_info(-1, -4, en, dmg, false); C.runCallbacks(W.player.when_kill, info); }
      e.current_enemy_number = 0;
    };
  }
  const T = {
    white: [
      ['white_tup_01', null, 0, 0, 0, 'roll', e => { e.roll_number = 1; }, (e, p) => { p.final_bonus_rolls_number += e.roll_number; }, e => [int(e.roll_number)]],
      ['white_tup_02', 'white_tup_01', 1, 0, 56, 'plus', e => { e.on_game_start = true; }, (e, p) => arm(e, () => { const lv = L(); lv.wave_index--; lv.reward_number++; lv.card_roll_number_available = W.player.final_bonus_rolls_number; })],
      ['white_tup_03', 'white_tup_02', 2, 0, 112, 'gun', e => { e.damage_amount = .5; }, (e, p) => { p.final_bonus_damage += e.damage_amount; }, e => [pct(e.damage_amount)]],
      ['white_tup_03_01_01', 'white_tup_03', 3, -98, 168, 'roll', e => { e.extra_roll_chance = 20; e.has_added_callback = false; }, (e) => { if (!e.has_added_callback && L()) { L().roll_callbacks.push(() => { if (get_chance(e.extra_roll_chance)) L().card_roll_number_available++; }); e.has_added_callback = true; } }, e => [pr(e.extra_roll_chance)]],
      ['white_tup_03_02_01', 'white_tup_03', 3, 0, 168, 'cheese', e => { e.buff_amount = .5; }, (e, p) => { p.final_bonus_money += e.buff_amount; }, e => [pct(e.buff_amount)]],
      ['white_tup_03_03_01', 'white_tup_03', 3, 98, 168, 'plus', e => { e.can_trigger = false; e.has_triggered = false; e.waves = [9, 19, 30]; }, extraRewardStep, e => [e.waves.join(', ')]],
      ['white_tup_03_01_02', 'white_tup_03_01_01', 4, -98, 224, 'gun', e => { e.per_roll_buff = .02; }, (e, p) => { p.final_bonus_damage += e.per_roll_buff * p.rolled_this_level; p.final_bonus_reload_time += e.per_roll_buff * p.rolled_this_level; }, e => [pct(e.per_roll_buff)]],
      ['white_tup_03_02_02', 'white_tup_03_02_01', 4, 0, 224, 'plus', e => { e.buff_amount = 1; }, (e, p) => { p.final_bonus_upgrade_options += e.buff_amount; p.final_bonus_rolls_number += e.buff_amount; }, e => [int(e.buff_amount)]],
      ['white_tup_03_03_02', 'white_tup_03_03_01', 4, 98, 224, 'plus', e => { e.can_trigger = false; e.has_triggered = false; e.waves = [5, 15, 25]; }, extraRewardStep, e => [e.waves.join(', ')]],
      ['white_tup_03_01_02_01_01', 'white_tup_03_01_02', 5, -130.67, 280, 'roll', e => { e.roll_buff = 4; e.wave_duration_buff = 4; }, (e, p) => { if (inCombat() && W.g.wave_index + 1 <= e.wave_duration_buff) p.final_bonus_rolls_number += e.roll_buff; }, e => [int(e.roll_buff), int(e.wave_duration_buff)]],   // 원작 버그 수정: 원작은 3 으로 비교(anon@7108) → 설명대로 4
      ['white_tup_03_01_02_02_01', 'white_tup_03_01_02', 5, -65.33, 280, 'roll', e => { e.roll_buff = 6; e.wave_duration_buff = 6; e.total_waves = -1; }, (e, p) => { if (L()) { if (e.total_waves === -1) e.total_waves = L().wave_number_limit; if (W.g.wave_index >= e.total_waves - e.wave_duration_buff) p.final_bonus_rolls_number += e.roll_buff; } }, e => [int(e.roll_buff), int(e.wave_duration_buff)]],
      ['white_tup_03_02_03', 'white_tup_03_02_02', 5, 0, 280, 'up', e => { e.wave_number = 3; e.buff_amount = .25; e.can_add_buff = false; e.buffs = ['final_bonus_damage', 'final_bonus_fire_rate', 'final_bonus_reload_time', 'final_bonus_ammo', 'final_bonus_critical_damage']; e.state = [0, 0, 0, 0, 0]; },
        (e, p) => { e.buffs.forEach((b, i) => { p[b] += e.state[i] * e.buff_amount; }); if (inCombat() && W.g.game_state === 'reward' && W.g.wave_index !== -1) { if ((W.g.wave_index + 1) % e.wave_number === 0) { if (e.can_add_buff) { e.state[irandom(4)]++; S('upgrade_rare_pops'); C.screen_shake(4, .9); p.delay_white = 24; e.can_add_buff = false; } } else e.can_add_buff = true; } }, e => [int(e.wave_number), pct(e.buff_amount)]],
      ['white_tup_03_03_02_01_01', 'white_tup_03_03_02', 5, 65.33, 280, 'star', e => { e.extra = 1; }, (e, p) => { p.weight_chance_multiplier += e.extra; p.pool_chance_multiplier += e.extra; }, e => [pr(e.extra)]],
      ['white_tup_03_03_02_02_01', 'white_tup_03_03_02', 5, 130.67, 280, 'crit', e => { e.buff_amount = .5; }, (e, p) => { p.final_bonus_critical_damage += e.buff_amount * p.rare_cards_n; }, e => [pct(e.buff_amount)]],
    ],
    nerd: [
      ['nerd_tup_01', null, 0, 0, 0, 'star', rootNode('o_star', 'o_star_upgrade_01').create, rootNode('o_star', 'o_star_upgrade_01').step],
      ['nerd_tup_02', 'nerd_tup_01', 1, 0, 56, 'star', e => { e.damage_amount = .3; }, (e, p) => { p.final_bonus_star_damage += e.damage_amount; }, e => [pct(e.damage_amount)]],
      ['nerd_tup_02_01_01', 'nerd_tup_02', 2, -56, 112, 'crit', e => { e.critical_amount = 15; }, (e, p) => { p.final_bonus_critical_chance += e.critical_amount; }, e => [pr(e.critical_amount)]],
      ['nerd_tup_02_02_01', 'nerd_tup_02', 2, 56, 112, 'star', e => { e.damage_amount = .3; e.firerate_amount = .3; }, (e, p) => { p.final_bonus_star_damage += e.damage_amount; p.final_bonus_star_fire_rate += e.firerate_amount; }, e => [pct(e.damage_amount), pct(e.firerate_amount)]],
      ['nerd_tup_02_01_02', 'nerd_tup_02_01_01', 3, -56, 168, 'crit', e => { e.cc = 5; e.cd = .5; }, (e, p) => { p.final_bonus_critical_chance += e.cc; p.final_bonus_critical_damage += e.cd; }, e => [pr(e.cc), pct(e.cd)]],
      ['nerd_tup_02_02_02', 'nerd_tup_02_02_01', 3, 56, 168, 'star', e => { e.slow_amount = .5; }, (e, p) => { p.final_bonus_star_speed += -e.slow_amount; }, e => [pct(e.slow_amount)]],
      ['nerd_tup_02_01_02_01_01', 'nerd_tup_02_01_02', 4, -100.8, 224, 'boot', e => { e.speed_amount = 1; }, (e, p) => { p.final_bonus_star_fire_rate += e.speed_amount; }, e => [pct(e.speed_amount)]],
      ['nerd_tup_02_01_02_02_01', 'nerd_tup_02_01_02', 5, -33.6, 224, 'star', e => { e.bonus_shot = 1; }, (e, p) => { p.final_bonus_star_shot += e.bonus_shot; }, e => [int(e.bonus_shot)]],
      ['nerd_tup_02_02_02_01_01', 'nerd_tup_02_02_02', 5, 33.6, 224, 'star', e => {}, (e, p) => { p.star_wave_shot = true; }],
      ['nerd_tup_02_02_02_02_01', 'nerd_tup_02_02_02', 4, 100.8, 224, 'star', e => { e.damage_amount = .5; }, (e, p) => { p.final_bonus_star_damage += e.damage_amount; }, e => [pct(e.damage_amount)]],
      ['nerd_tup_02_01_02_01_02', 'nerd_tup_02_01_02_01_01', 5, -56, 280, 'star', e => { e.bonus_summon = 2; }, (e, p) => { p.final_bonus_star_summon += e.bonus_summon; }, e => [int(e.bonus_summon)]],
      ['nerd_tup_02_02_02_02_02', 'nerd_tup_02_02_02_02_01', 5, 56, 280, 'star', e => { e.explosion_amount = 2; }, (e, p) => { p.star_explode_damage = e.explosion_amount; }, e => [pct(e.explosion_amount)]],
    ],
    soldier: [
      ['soldier_tup_01', null, 0, 0, 0, 'bullet', rootNode('o_ammo', 'o_ammo_upgrade_01').create, rootNode('o_ammo', 'o_ammo_upgrade_01').step],
      ['soldier_tup_02', 'soldier_tup_01', 1, 0, 56, 'bullet', e => { e.ammo_amount = .4; e.waves_number = 3; }, perWave('final_bonus_ammo', 'ammo_amount'), e => [pct(e.ammo_amount), int(e.waves_number)]],
      ['soldier_tup_02_01_01', 'soldier_tup_02', 2, -70, 112, 'bullet', e => { e.shot = 1; e.ammo = .3; }, (e, p) => { p.final_bonus_ammo += e.ammo; p.final_bonus_shot_number += e.shot; }, e => [int(e.shot), pct(e.ammo)]],
      ['soldier_tup_02_02_01', 'soldier_tup_02', 2, 0, 112, 'boot', e => { e.fr = .6; e.ammo = .6; }, (e, p) => { p.final_bonus_ammo += e.ammo; p.final_bonus_fire_rate += e.fr; }, e => [pct(e.fr), pct(e.ammo)]],
      ['soldier_tup_02_03_01', 'soldier_tup_02', 2, 70, 112, 'gun', e => { e.dmg = .3; e.ammo = .3; }, (e, p) => { p.final_bonus_ammo += e.ammo; p.final_bonus_damage += e.dmg; }, e => [pct(e.dmg), pct(e.ammo)]],
      ['soldier_tup_02_01_02', 'soldier_tup_02_01_01', 3, -70, 168, 'bullet', e => { e.buff = .5; }, (e, p) => { p.final_bonus_ammo += e.buff; }, e => [pct(e.buff)]],
      ['soldier_tup_02_02_02', 'soldier_tup_02_02_01', 3, 0, 168, 'boot', e => { e.buff = .7; }, (e, p) => { p.final_bonus_reload_time += e.buff; }, e => [pct(e.buff)]],
      ['soldier_tup_02_03_02', 'soldier_tup_02_03_01', 3, 70, 168, 'pierce', e => { e.buff = 1.5; }, (e, p) => { p.final_bonus_projectile_penetration += e.buff; }, e => [pct(e.buff)]],
      ['soldier_tup_02_01_03', 'soldier_tup_02_01_02', 4, -70, 224, 'bullet', e => { e.need = 10; e.buff = 1; }, (e, p) => { if (inCombat() && p.my_weapon) p.final_bonus_shot_number += e.buff * Math.floor(Math.max(p.my_weapon.final_bullet_number, 0) / e.need); }, e => [int(e.need), int(e.buff)]],
      ['soldier_tup_02_02_03', 'soldier_tup_02_02_02', 4, 0, 224, 'boot', e => { e.need = 10; e.buff = .8; }, (e, p) => { if (inCombat() && p.my_weapon) p.final_bonus_fire_rate += e.buff * Math.floor(Math.max(p.my_weapon.final_bullet_number, 0) / e.need); }, e => [int(e.need), pct(e.buff)]],
      ['soldier_tup_02_03_03', 'soldier_tup_02_03_02', 4, 70, 224, 'crit', e => { e.need = 10; e.buff = .05; }, (e, p) => { if (inCombat() && p.my_weapon) p.final_bonus_critical_chance += e.buff * Math.floor(Math.max(p.my_weapon.final_bullet_number, 0) / e.need) * 100; }, e => [int(e.need), pct(e.buff)]],
      ['soldier_tup_02_01_04', 'soldier_tup_02_01_03', 5, -70, 280, 'teeth', e => { Object.assign(e, { shot_buff: 3, ammo_buff: 1, enemy_number: 3, enemies_to_kill: 2, current_enemy_number: 0, has_added_callback: false }); }, (e, p) => { if (!e.has_added_callback) { p.when_kill.push(killCallback(e, true)); e.has_added_callback = true; } p.final_bonus_shot_number += e.shot_buff; p.final_bonus_ammo += e.ammo_buff; }, e => [int(e.shot_buff), pct(e.ammo_buff), int(e.enemy_number), int(e.enemies_to_kill)]],
      ['soldier_tup_02_02_04', 'soldier_tup_02_02_03', 5, 0, 280, 'teeth', e => { Object.assign(e, { fr: .5, rl: .4, enemy_number: 3, enemies_to_kill: 2, current_enemy_number: 0, has_added_callback: false }); }, (e, p) => { if (!e.has_added_callback) { p.when_kill.push(killCallback(e)); e.has_added_callback = true; } if (inCombat()) { p.final_bonus_fire_rate += e.fr; p.final_bonus_reload_time += e.rl; } }, e => [pct(e.fr), pct(e.rl), int(e.enemy_number), int(e.enemies_to_kill)]],
      ['soldier_tup_02_03_04', 'soldier_tup_02_03_03', 5, 70, 280, 'teeth', e => { Object.assign(e, { bullet_buff: 1.5, rl: 1.5, enemy_number: 3, enemies_to_kill: 2, current_enemy_number: 0, has_added_callback: false }); }, (e, p) => { if (!e.has_added_callback) { p.when_kill.push(killCallback(e)); e.has_added_callback = true; } if (inCombat() && p.my_weapon) { p.final_bonus_damage += (e.bullet_buff * p.my_weapon.final_bullet_number) / 100; p.final_bonus_reload_time += e.rl; } }, e => [pct(e.bullet_buff), pct(e.rl), int(e.enemy_number), int(e.enemies_to_kill)]],
    ],
    doctor: [
      ['doctor_tup_01_01', null, 0, -56, 0, 'bubble', rootNode('o_poison', 'o_poison_upgrade_01').create, rootNode('o_poison', 'o_poison_upgrade_01').step],
      ['doctor_tup_02_01', null, 0, 56, 0, 'teeth', rootNode('o_curse', 'o_curse_upgrade_01').create, rootNode('o_curse', 'o_curse_upgrade_01').step],
      ['doctor_tup_01_02', 'doctor_tup_01_01', 1, -56, 56, 'bubble', e => { e.dmg = .5; e.spd = .5; }, (e, p) => { p.final_bonus_poison_damage += e.dmg; p.final_bonus_poison_speed += e.spd; }, e => [pct(e.dmg), pct(e.spd)]],
      ['doctor_tup_02_02', 'doctor_tup_02_01', 1, 56, 56, 'feather', e => { e.dodge = 30; }, (e, p) => { p.final_bonus_curse_dodge_chance += e.dodge; }, e => [pr(e.dodge)]],
      ['doctor_tup_01_03', 'doctor_tup_01_02', 2, -56, 112, 'bubble', e => { e.ch = 20; e.fr = .4; }, (e, p) => { p.final_bonus_poison_chance += e.ch; p.final_bonus_fire_rate += e.fr; }, e => [pr(e.ch), pct(e.fr)]],
      ['doctor_tup_02_03', 'doctor_tup_02_02', 2, 56, 112, 'teeth', e => { e.ch = 20; e.fr = .4; }, (e, p) => { p.final_bonus_curse_chance += e.ch; p.final_bonus_fire_rate += e.fr; }, e => [pr(e.ch), pct(e.fr)]],
      ['doctor_tup_01_03_01_01', 'doctor_tup_01_03', 3, -100.8, 168, 'bubble', e => { e.speed_amount = .5; e.waves_number = 5; }, perWave('final_bonus_poison_speed', 'speed_amount'), e => [pct(e.speed_amount), int(e.waves_number)]],
      ['doctor_tup_01_03_02_01', 'doctor_tup_01_03', 3, -33.6, 168, 'bubble', e => { e.damage_amount = .5; e.waves_number = 5; }, perWave('final_bonus_poison_damage', 'damage_amount'), e => [pct(e.damage_amount), int(e.waves_number)]],
      ['doctor_tup_02_03_01_01', 'doctor_tup_02_03', 3, 33.6, 168, 'teeth', e => { e.speed_amount = .4; e.waves_number = 5; }, perWave('final_bonus_curse_speed', 'speed_amount'), e => [pct(e.speed_amount), int(e.waves_number)]],
      ['doctor_tup_02_03_02_01', 'doctor_tup_02_03', 3, 100.8, 168, 'teeth', e => { e.damage_amount = .5; e.waves_number = 5; }, (e) => { if (inCombat()) { const v = Math.floor(Math.max(W.g.wave_index + 1, 0) / e.waves_number) * e.damage_amount; for (const en of C.enemies()) if (en.is_cursed) en.damage_increase += v; } }, e => [pct(e.damage_amount), int(e.waves_number)]],
      ['doctor_tup_01_03_01_02', 'doctor_tup_01_03_01_01', 4, -100.8, 224, 'bubble', e => { e.th = .25; }, (e, p) => { for (const en of C.enemies()) if (!en.invulnerable && en.state !== 'dead' && en.is_poisoned && en.life / en.life_max <= e.th) { const dmg = en.life; en.life = 0; en.invulnerable = true; C.runCallbacks(p.when_kill, C.damage_info(0, -4, en, dmg, false)); } }, e => [pct(e.th)]],
      ['doctor_tup_01_03_02_02', 'doctor_tup_01_03_02_01', 4, -33.6, 224, 'bubble', e => { e.slow_amount = .4; }, (e) => { for (const en of C.enemies()) if (en.is_poisoned) en.slow_increase += e.slow_amount; }, e => [pct(e.slow_amount)]],   // 원작 버그 수정: 원작은 speed_increase 에 더해 오히려 빨라졌음 → 설명대로 느리게(slow_increase, 독 IV 와 같은 방식)
      ['doctor_tup_02_03_01_02', 'doctor_tup_02_03_01_01', 4, 33.6, 224, 'teeth', e => { e.spd = .25; }, (e, p) => { p.final_bonus_curse_speed += e.spd; }, e => [pct(e.spd)]],
      ['doctor_tup_02_03_02_02', 'doctor_tup_02_03_02_01', 4, 100.8, 224, 'teeth', e => { e.spread_chance = 50; e.has_added_callback = false; }, (e, p) => { if (!e.has_added_callback) { p.when_kill.push(a => { if (a.entity.is_cursed && a.projectile && a.projectile !== -4 && get_chance(e.spread_chance)) { const cand = C.enemies().filter(en => !en.is_cursed && en.life > 0); if (cand.length) C.apply_debuff(cand[GM.irandom(cand.length - 1)], 1); } }); e.has_added_callback = true; } }, e => [pr(e.spread_chance)]],   // 원작 버그 수정: 원작은 목록 첫 적 → 설명대로 무작위
      ['doctor_tup_01_03_01_03', 'doctor_tup_01_03_01_02', 5, -100.8, 280, 'bubble', e => { e.duration_buff = 77.77; }, (e, p) => { p.final_bonus_poison_duration += e.duration_buff; }, e => [pct(e.duration_buff)]],
      ['doctor_tup_01_03_02_03', 'doctor_tup_01_03_02_02', 5, -33.6, 280, 'feather', e => { e.dodge = 25; }, (e, p) => { p.prioritize_non_poisoned_enemies = true; p.final_bonus_poison_dodge_chance += e.dodge; }, e => [pr(e.dodge)]],
      ['doctor_tup_02_03_01_03', 'doctor_tup_02_03_01_02', 5, 33.6, 280, 'teeth', e => { e.stun_duration = 48; }, (e, p) => { p.curse_stun_on_apply = e.stun_duration; }, e => [(e.stun_duration / 60).toFixed(1)]],
      ['doctor_tup_02_03_02_03', 'doctor_tup_02_03_02_02', 5, 100.8, 280, 'crit', e => {}, (e, p) => { p.prioritize_cursed_enemies = true; }],
    ],
    robot: [
      ['robot_tup_01', null, 0, 0, 0, 'arrow', rootNode('o_arrow', 'o_arrow_upgrade_01').create, rootNode('o_arrow', 'o_arrow_upgrade_01').step],
      ['robot_tup_02', 'robot_tup_01', 1, 0, 56, 'arrow', e => { e.dmg = 1; }, (e, p) => { p.death_arrows_number += 1; p.final_bonus_arrow_damage += e.dmg; }, e => [pct(e.dmg)]],
      ['robot_tup_03', 'robot_tup_02', 2, 0, 112, 'crit', e => { e.cc = 25; }, (e, p) => { p.final_bonus_critical_chance += e.cc; }, e => [pr(e.cc)]],
      ['robot_tup_03_01_01', 'robot_tup_03', 3, -70, 168, 'crit', e => { e.cd = 1; }, (e, p) => { p.final_bonus_critical_damage += e.cd; }, e => [pct(e.cd)]],
      ['robot_tup_03_02_01', 'robot_tup_03', 3, 0, 168, 'heart', e => { e.hp = 2; }, (e, p) => { p.life_in_hearts += e.hp; }, e => [(e.hp / 2).toFixed(1)]],
      ['robot_tup_03_03_01', 'robot_tup_03', 3, 70, 168, 'arrow', e => { e.dmg = .5; }, (e, p) => { p.final_bonus_arrow_damage += e.dmg; }, e => [pct(e.dmg)]],
      ['robot_tup_03_01_02', 'robot_tup_03_01_01', 4, -70, 224, 'gun', e => { e.kb = 1; }, (e, p) => { p.final_bonus_knockback += e.kb; }, e => [pct(e.kb)]],
      ['robot_tup_03_02_02', 'robot_tup_03_02_01', 4, 0, 224, 'heart', e => { e.hp = 4; }, (e, p) => { p.life_in_hearts += e.hp; }, e => [(e.hp / 2).toFixed(1)]],
      ['robot_tup_03_03_02', 'robot_tup_03_03_01', 4, 70, 224, 'arrow', e => { e.pen = 5; }, (e, p) => { p.final_bonus_arrow_penetration += e.pen; }, e => [pct(e.pen)]],
      ['robot_tup_03_01_03', 'robot_tup_03_01_02', 5, -70, 280, 'gear', e => { e.can_give = true; e.wave = 20; }, (e, p) => { p.unlimited_gear = true; p.gear_pool_chance_multiplier = 8; if (inCombat() && e.can_give && W.g.wave_index + 1 === e.wave && W.g.game_state === 'reward' && L()) { L().reward_number += p.gear_cards_n; e.can_give = false; } }, e => [int(e.wave)]],
      ['robot_tup_03_02_03', 'robot_tup_03_02_02', 5, 0, 280, 'shield', e => { e.dmg = .6; e.pen = .6; }, (e, p) => { p.metal_heart = true; const n = Math.floor(p.life_max); p.final_bonus_damage += e.dmg * n; p.final_bonus_projectile_penetration += e.pen * n; }, e => [pct(e.dmg)]],
      ['robot_tup_03_03_03', 'robot_tup_03_03_02', 5, 70, 280, 'clock', e => { Object.assign(e, { need: 180, cur: 0, fr: 1.5, ad: 1.5, dp: 0 }); }, (e, p) => { if (p.velh === 0 && p.velv === 0) { if (e.cur >= e.need) { p.final_bonus_fire_rate += e.fr; p.final_bonus_arrow_damage += e.ad; if (e.dp-- <= 0) { C.vfx('s_smoke', p.x, p.y - 4, p.depth + 5); e.dp = 12; } } else e.cur++; } else { e.cur = 0; e.dp = 0; } }, e => [int(e.need / 60), pct(e.fr), pct(e.ad)]],
    ],
    eletric: [
      ['eletric_tup_01', null, 0, 0, 0, 'bolt', rootNode('o_lightning', 'o_lightning_upgrade_01').create, rootNode('o_lightning', 'o_lightning_upgrade_01').step],
      ['eletric_tup_02', 'eletric_tup_01', 1, 0, 56, 'bolt', e => { e.buff = 15; }, (e, p) => { p.final_bonus_lightning_chance += e.buff; }, e => [pr(e.buff)]],
      ['eletric_tup_02_01_01', 'eletric_tup_02', 5, -37.33, 112, 'bolt', e => { Object.assign(e, { has_added_callback: false, req: 20, cur: 0, inc: .01, dmg: 0 }); }, (e, p) => { if (!e.has_added_callback) { p.when_hit.push(() => { e.cur++; }); e.has_added_callback = true; } while (e.cur >= e.req) { e.dmg += e.inc; e.cur -= e.req; } p.final_bonus_lightning_damage += e.dmg; }, e => [int(e.req), pct(e.inc)]],
      ['eletric_tup_02_02_01', 'eletric_tup_02', 2, 37.33, 112, 'bolt', e => { e.dmg = 1; }, (e, p) => { p.final_bonus_lightning_damage += e.dmg; }, e => [pct(e.dmg)]],
      ['eletric_tup_02_02_01_01_01', 'eletric_tup_02_02_01', 4, -37.33, 168, 'bolt', e => { e.range = 1; }, (e, p) => { p.big_lightning_range = true; }, e => [pct(e.range)]],
      ['eletric_tup_02_02_01_02_01', 'eletric_tup_02_02_01', 3, 37.33, 168, 'boot', e => { e.fr = .5; }, (e, p) => { p.final_bonus_fire_rate += e.fr; }, e => [pct(e.fr)]],
      ['eletric_tup_02_02_01_02_01_01_01', 'eletric_tup_02_02_01_02_01', 4, -37.33, 224, 'bolt', e => { e.stun = 48; e.has_added_callback = false; }, (e, p) => { if (!e.has_added_callback) { p.when_hit.push(a => { if (a.type === 4 || a.type === 5) { C.apply_debuff(a.entity, 2); a.entity.base_stun_duration = e.stun; } }); e.has_added_callback = true; } }, e => [(e.stun / 60).toFixed(1)]],
      ['eletric_tup_02_02_01_02_01_02_01', 'eletric_tup_02_02_01_02_01', 4, 37.33, 224, 'bolt', e => { e.dmg = .5; e.fr = .5; }, (e, p) => { p.final_bonus_lightning_damage += e.dmg; p.final_bonus_fire_rate += e.fr; }, e => [pct(e.dmg), pct(e.fr)]],
      ['eletric_tup_02_02_01_02_01_02_02', 'eletric_tup_02_02_01_02_01_02_01', 4, 0, 280, 'bolt', e => { e.amount = 1; e.waves_number = 8; }, perWave('final_bonus_lightning_number', 'amount'), e => [int(e.amount), int(e.waves_number)]],
    ],
  };
  function extraRewardStep(e) {   // anon@3558 / anon@5857
    if (!inCombat()) { e.can_trigger = false; e.has_triggered = false; return; }
    const found = e.waves.includes(W.g.wave_index + 1);
    if (found && W.g.game_state === 'reward') e.can_trigger = true; else { e.can_trigger = false; e.has_triggered = false; }
    if (e.can_trigger && !e.has_triggered && L()) { L().reward_number++; e.has_triggered = true; }
  }
  // 노드 객체로 변환 + 배치(행·열) 계산
  const TREES = {};
  for (const [ck, rows] of Object.entries(T)) {
    TREES[ck] = rows.map(([name, parent, pi, x, y, icon, create, step, special]) => ({ name, parent, price: COSTS[pi], x, y, depthy: Math.round(y / 56), icon, create: create || (() => {}), step: step || (() => {}), special: special || (() => []) }));
    const t = TREES[ck];
    for (const n of t) { n.children = t.filter(c => c.parent === n.name); n.par = t.find(c => c.name === n.parent) || null; }
  }
  const save = ck => { const s = G.SAVE.characters_skills; s[ck] = s[ck] || {}; return s[ck]; };
  const st = (ck, n) => { const s = save(ck); s[n.name] = s[n.name] || { is_bought: false, is_equipped: false }; return s[n.name]; };
  // character_equip_skill: 효과 구조체를 새로 만들어 create 1회, 매 프레임 step
  function equipAll(p) { p.skills = []; for (const n of TREES[p.ckey] || []) if (st(p.ckey, n).is_equipped) { const e = { name: n.name, node: n }; n.create(e); e.step = (q, pl) => n.step(q, pl); p.skills.push(e); } }
  function isUnlocked(ck, n) { return !n.par || st(ck, n.par).is_bought; }
  // 장착 규칙: 고른 노드 + 조상만 장착, 나머지 해제 (cabin equip_skill / equip_skill_line)
  function equipPath(ck, n) { for (const m of TREES[ck]) st(ck, m).is_equipped = false; let q = n; while (q) { st(ck, q).is_equipped = true; q = q.par; } }
  function unequipSub(ck, n) { st(ck, n).is_equipped = false; for (const c of n.children) unequipSub(ck, c); }
  function refreshPlayer() { const P = W.player; if (P) equipAll(P); G.save(); }

  // ---- 오두막 재능 화면 ------------------------------------------------------------------------
  function stepTree(ui, I) {
    const ck = G.SAVE.character_selected, t = TREES[ck];
    if (I.back) { ui.mode = 'chars'; S('click'); return; }
    let cur = t[ui.tsel] || t[0];
    const pick = (dx, dy) => { const rowY = cur.depthy + dy; let cand = t.filter(n => n.depthy === rowY); if (!cand.length) return; if (dy === 0) { cand = cand.filter(n => Math.sign(n.x - cur.x) === dx); if (!cand.length) return; } cand.sort((a, b) => Math.abs(a.x - cur.x) - Math.abs(b.x - cur.x)); ui.tsel = t.indexOf(cand[0]); S('upgrade_hover'); };
    if (I.card_left) pick(-1, 0); if (I.card_right) pick(1, 0); if (I.card_up) pick(0, -1); if (I.card_down) pick(0, 1);
    cur = t[ui.tsel];
    const s = st(ck, cur), held = I.enter_held, released = ui._held && !held;
    const canBuy = !s.is_bought && !ui.buy_lock && isUnlocked(ck, cur) && cur.price <= G.SAVE.coins;   // Step_0 L430–438
    if (released && s.is_bought && !ui.equip_lock && (ui.delay_buy || 0) < 8) { if (s.is_equipped) unequipSub(ck, cur); else equipPath(ck, cur); refreshPlayer(); S('select'); }   // L442–449
    if (released || !held) { ui.buy_lock = false; ui.equip_lock = false; }
    if (canBuy && held) { if ((ui.delay_buy = (ui.delay_buy || 0) + 1) - 1 >= 8) { ui.lerp_buy = GM.lerp(ui.lerp_buy || 0, 1, .2 - .15 * (ui.lerp_buy || 0)); if (ui.lerp_buy >= .99) {   // buy_skill (anon@3806)
      G.SAVE.coins -= cur.price; G.SAVE.spent_coins += cur.price; s.is_bought = true; equipPath(ck, cur); refreshPlayer(); S('buy'); C.screen_shake(6, .8); ui.buy_lock = true; ui.equip_lock = true; ui.lerp_buy = 0; ui.delay_buy = 0; } } }
    else { ui.delay_buy = 0; ui.lerp_buy = GM.lerp(ui.lerp_buy || 0, 0, .3); }
    ui._held = held;
  }
  function drawTree(g, ui, s, X0, Y0, Wp, Hp, a, t) {
    const ck = G.SAVE.character_selected, tr = TREES[ck], ox = X0 + 200 * s, oy = Y0 + 44 * s, ts = .84;   // 6줄 × 56 이 패널에 들어가도록 축소
    UI.textOutline(g, ox, Y0 + 26 * s, UI.T(G.CHAR[ck].name), 12 * s, '#ffd25c', '#1d1630', a);
    for (const n of tr) if (n.par) { g.strokeStyle = st(ck, n).is_equipped ? '#ffd25c' : '#5a4a8a'; g.lineWidth = 2 * s; g.beginPath(); g.moveTo(ox + n.par.x * ts * s, oy + (n.par.y * ts + 20) * s); g.lineTo(ox + n.x * ts * s, oy + (n.y * ts + 20) * s); g.stroke(); }
    tr.forEach((n, i) => {
      const x = ox + n.x * ts * s, y = oy + (n.y * ts + 20) * s, sv = st(ck, n), un = isUnlocked(ck, n), sel = i === ui.tsel;
      UI.rr(g, x - 20 * s, y - 20 * s, 40 * s, 40 * s, 8 * s, sv.is_equipped ? '#c88a1c' : sv.is_bought ? '#6b5a9a' : un ? '#3b2f66' : '#241c40');
      g.save(); g.translate(x, y); g.scale(s, s); g.globalAlpha = a * (un || sv.is_bought ? 1 : .35); g.drawImage(A.iconSprite('talent_' + n.icon), -16, -16); g.restore(); g.globalAlpha = a;
      if (sel) { g.strokeStyle = '#ffffff'; g.lineWidth = 2 * s; g.beginPath(); g.roundRect(x - 23 * s, y - 23 * s, 46 * s, 46 * s, 10 * s); g.stroke(); if (ui.lerp_buy > .01) { g.fillStyle = '#ffd25c'; g.fillRect(x - 18 * s, y + 16 * s, 36 * s * ui.lerp_buy, 3 * s); } }
    });
    const n = tr[ui.tsel] || tr[0], sv = st(ck, n);
    const lines = UI.fmt(UI.T(n.name), (() => { const e = {}; n.create(e); return n.special(e); })()).split('\n');
    const px = X0 + 380 * s, py = Y0 + 70 * s;
    UI.panel(g, px - 8 * s, py - 14 * s, 240 * s, (lines.length * 14 + 40) * s, .9 * a);
    lines.forEach((l, k) => UI.drawRich(g, px, py + k * 14 * s, l.replace(/^- /, ''), 9 * s, a, 'left', t));
    const status = sv.is_equipped ? '장착 중 · Enter 로 해제' : sv.is_bought ? '보유 · Enter 로 장착' : !isUnlocked(ck, n) ? '윗칸을 먼저 사세요' : `🧀 ${n.price} · Enter 길게 눌러 사기`;
    UI.textOutline(g, px, py + (lines.length * 14 + 8) * s, status, 9 * s, sv.is_equipped ? '#ffd25c' : '#ffffff', '#1d1630', a, 'left');
    UI.textOutline(g, X0 + Wp / 2, Y0 + Hp - 16 * s, '방향키 이동 · Esc 뒤로 · 한 줄(뿌리→고른 칸)만 장착됩니다', 8 * s, '#bbb0dd', '#1d1630', a);
  }

  window.RatsTalents = { TREES, equipAll, stepTree, drawTree, onWaveEnd() {} };
})();
