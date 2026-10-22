// 로켓 쥐 — 판 안 업그레이드(웨이브 사이 카드). notes/upgrades.md 를 그대로 옮김.
// step(info, p) 는 원작처럼 "매 프레임" 실행되어 final_bonus_* 에 더한다(Begin Step 에서 bonus_* 로 다시 초기화됨).
(function () {
  'use strict';
  const { get_chance, random } = GM;
  const C = () => window.RatsCombat;
  const pct = x => Math.round(x * 100) + '%', pctraw = x => Math.round(x) + '%', int = x => String(Math.round(x)), dec1 = x => (Math.round(x * 10) / 10).toFixed(1);
  const L = [];   // 태그 순서(오브젝트 순서)대로
  function U(obj, d) { L.push(Object.assign({ obj, type: 0, is_rare: false, priority: 0, pool: 100, weight: 1, req: [], cond: [], info: {}, special: () => [], card: 's_upgrade_card_01' }, d)); }
  const card = t => ['s_upgrade_card_01', 's_upgrade_card_02', 's_upgrade_card_02', 's_upgrade_card_03', 's_upgrade_card_03', 's_upgrade_card_04'][t - 1];
  const VII = { type: 1, is_rare: true, pool: 20, weight: 3, card: 's_upgrade_card_rare_leveled' };
  const unlock = (i, who) => { if (i.unlock_character) { window.RatsGame && RatsGame.unlockCharacter(who); i.unlock_character = false; } };
  const once = (i, key, f) => { if (!i[key]) { f(); i[key] = true; } };

  // ---- 1.1 Impact (damage)
  U('o_damage_upgrade_01', { card: card(1), info: { buff_amount: .2 }, step: (i, p) => { p.final_bonus_damage += i.buff_amount; }, special: i => [pct(i.buff_amount)] });
  U('o_damage_upgrade_02', { card: card(2), req: ['o_damage_upgrade_01'], info: { buff_amount: .3 }, step: (i, p) => { p.final_bonus_damage += i.buff_amount; }, special: i => [pct(i.buff_amount), pct(i.buff_amount)] });
  U('o_damage_upgrade_03', { card: card(3), req: ['o_damage_upgrade_02'], info: { buff_amount: .3, knockback_amount: .5 }, step: (i, p) => { p.final_bonus_damage += i.buff_amount; p.final_bonus_knockback += i.knockback_amount; }, special: i => [pct(i.buff_amount), pct(i.knockback_amount)] });
  U('o_damage_upgrade_04', { card: card(4), req: [['o_damage_upgrade_03']], info: { penetration_amount: .8, speed_amount: .4 }, step: (i, p) => { p.final_bonus_projectile_penetration += i.penetration_amount; }, special: i => [pct(i.penetration_amount), pct(i.speed_amount)] });
  U('o_damage_upgrade_05', { card: card(5), pool: 80, req: [['o_damage_upgrade_04']], info: { damage_amount: .2, penetration_amount: .6 }, step: (i, p) => { p.final_bonus_damage += i.damage_amount; p.final_bonus_projectile_penetration += i.penetration_amount; }, special: i => [pct(i.damage_amount), pct(i.penetration_amount)] });
  U('o_damage_upgrade_06', { card: card(6), pool: 60, req: [['o_damage_upgrade_05']], info: { buff_amount: 2, spread_amount: -.3 }, step: (i, p) => { if (p.my_weapon) p.my_weapon.spread_type = 1; p.final_bonus_shot_number += i.buff_amount; p.final_bonus_shot_spread += i.spread_amount; }, special: i => [int(i.buff_amount), pct(i.spread_amount)] });
  U('o_damage_upgrade_07', Object.assign({}, VII, { req: [['o_damage_upgrade_06']], info: { damage_amount: .8, shot_amount: 4, knockback_amount: .5, ammo_amount: .5 }, step: (i, p) => { p.final_bonus_damage += i.damage_amount; p.final_bonus_shot_number += i.shot_amount; p.final_bonus_knockback += i.knockback_amount; p.final_bonus_ammo += i.ammo_amount; }, special: i => [int(i.shot_amount), pct(i.damage_amount), pct(i.knockback_amount), pct(i.ammo_amount)] }));
  // ---- 1.2 Rush (fire rate)
  U('o_fire_rate_upgrade_01', { card: card(1), info: { buff_amount: .2 }, step: (i, p) => { p.final_bonus_fire_rate += i.buff_amount; }, special: i => [pct(i.buff_amount)] });
  U('o_fire_rate_upgrade_02', { card: card(2), req: ['o_fire_rate_upgrade_01'], info: { buff_amount: .4, reload_amount: .45 }, step: (i, p) => { p.final_bonus_reload_time += i.reload_amount; }, special: i => [pct(i.reload_amount)] });
  U('o_fire_rate_upgrade_03', { card: card(3), req: ['o_fire_rate_upgrade_02'], info: { buff_amount: .4, reload_amount: .25 }, step: (i, p) => { p.final_bonus_fire_rate += i.buff_amount; p.final_bonus_reload_time += i.reload_amount; }, special: i => [pct(i.buff_amount), pct(i.reload_amount)] });
  U('o_fire_rate_upgrade_04', { card: card(4), req: ['o_fire_rate_upgrade_03'], info: { buff_amount: .1, reload_amount: .6 }, step: (i, p) => { p.final_bonus_fire_rate += i.buff_amount; p.final_bonus_reload_time += i.reload_amount; }, special: i => [pct(i.buff_amount), pct(i.reload_amount)] });
  U('o_fire_rate_upgrade_05', { card: card(5), pool: 80, req: ['o_fire_rate_upgrade_04'], info: { buff_amount: .3, reload_amount: .5 }, step: (i, p) => { p.final_bonus_fire_rate += i.buff_amount; p.final_bonus_reload_time += i.reload_amount; }, special: i => [pct(i.buff_amount), pct(i.reload_amount)] });
  U('o_fire_rate_upgrade_06', { card: card(6), pool: 60, req: ['o_fire_rate_upgrade_05'], info: { chance_buff: 30, firerate_buff: 2, can_increase_buff: false, increase_buff: false },
    step: (i, p) => { const w = p.my_weapon; if (w && w.state === 'reload') { i.can_increase_buff = true; i.increase_buff = false; } else if (i.can_increase_buff) { if (get_chance(i.chance_buff)) i.increase_buff = true; i.can_increase_buff = false; } if (i.increase_buff) p.final_bonus_fire_rate += i.firerate_buff; },
    special: i => [pctraw(i.chance_buff), pct(i.firerate_buff)] });
  U('o_fire_rate_upgrade_07', Object.assign({}, VII, { req: ['o_fire_rate_upgrade_06'], info: { buff_amount: 3 }, step: (i, p) => { const w = p.my_weapon; if (!w || !w.final_bullet_number) return; const r = w.current_bullet_number / w.final_bullet_number; p.final_bonus_fire_rate += i.buff_amount * (1 - r); }, special: i => [pct(i.buff_amount)] }));
  // ---- 1.3 Critical
  U('o_critical_upgrade_01', { card: card(1), info: { critical_amount: 10 }, step: (i, p) => { p.final_bonus_critical_chance += i.critical_amount; }, special: i => [pctraw(i.critical_amount)] });
  U('o_critical_upgrade_02', { card: card(2), req: ['o_critical_upgrade_01'], info: { critical_amount: 10, fire_rate: .15 }, step: (i, p) => { p.final_bonus_critical_chance += i.critical_amount; p.final_bonus_fire_rate += i.fire_rate; }, special: i => [pctraw(i.critical_amount), pct(i.fire_rate)] });
  U('o_critical_upgrade_03', { card: card(3), req: ['o_critical_upgrade_02'], info: { critical_amount: 15, critical_damage: .15 }, step: (i, p) => { p.final_bonus_critical_chance += i.critical_amount; p.final_bonus_critical_damage += i.critical_damage; }, special: i => [pctraw(i.critical_amount), pct(i.critical_damage)] });
  U('o_critical_upgrade_04', { card: card(4), req: ['o_critical_upgrade_03'], info: { critical_amount: 15, critical_damage: .25 }, step: (i, p) => { p.final_bonus_critical_chance += i.critical_amount; p.final_bonus_critical_damage += i.critical_damage; }, special: i => [pctraw(i.critical_amount), pct(i.critical_damage)] });
  U('o_critical_upgrade_05', { card: card(5), pool: 80, req: [['o_critical_upgrade_04']], info: { has_added_callback: false, extra_shot_number: 0, last_bullet_number: 0, shot_number_buff: 1 },
    step: (i, p) => { once(i, 'has_added_callback', () => p.when_kill.push(a => { if (a.is_critical) i.extra_shot_number += i.shot_number_buff; })); p.final_bonus_shot_number += Math.min(i.extra_shot_number, 20); const cur = p.my_weapon ? p.my_weapon.current_bullet_number : 0; if (cur !== i.last_bullet_number) { i.extra_shot_number = 0; i.last_bullet_number = cur; } },
    special: i => [int(i.shot_number_buff)] });
  U('o_critical_upgrade_06', { card: card(6), pool: 60, priority: 2, req: [['o_critical_upgrade_05']], info: { critical_amount: 20 },
    step: (i, p) => { p.final_bonus_critical_chance += i.critical_amount; if (p.final_bonus_critical_chance > 100) { p.final_bonus_critical_damage += (p.final_bonus_critical_chance - 100) * .01; p.final_bonus_critical_chance = Math.min(p.final_bonus_critical_chance, 100); } },
    special: i => [pctraw(i.critical_amount)] });
  U('o_critical_upgrade_07', Object.assign({}, VII, { req: ['o_critical_upgrade_06'], info: { has_added_callback: false, extra_critical_damage: 0, critical_damage_buff: .6 },
    step: (i, p) => { once(i, 'has_added_callback', () => { p.when_critical.push(a => { if (a.is_critical && a.type === 2) i.extra_critical_damage += i.critical_damage_buff; }); p.when_attack.push(() => { i.extra_critical_damage = 0; }); }); p.final_bonus_critical_damage += i.extra_critical_damage; },
    special: i => [pct(i.critical_damage_buff)] }));
  // ---- 1.4 Ammo
  U('o_ammo_upgrade_01', { card: card(1), info: { buff_amount: .3 }, step: (i, p) => { p.final_bonus_ammo += i.buff_amount; }, special: i => [pct(i.buff_amount)] });
  U('o_ammo_upgrade_02', { card: card(2), req: ['o_ammo_upgrade_01'], info: { buff_amount: .5 }, step: (i, p) => { p.final_bonus_ammo += i.buff_amount; }, special: i => [pct(i.buff_amount)] });
  U('o_ammo_upgrade_03', { card: card(3), req: ['o_ammo_upgrade_02'], info: { ammo_amount: .2, damage_amount: .2, firerate_amount: .2 }, step: (i, p) => { p.final_bonus_ammo += i.ammo_amount; p.final_bonus_damage += i.damage_amount; p.final_bonus_fire_rate += i.firerate_amount; }, special: i => [pct(i.ammo_amount), pct(i.damage_amount), pct(i.firerate_amount)] });
  U('o_ammo_upgrade_04', { card: card(4), req: ['o_ammo_upgrade_03'], info: { buff_amount: 1 }, step: (i, p) => { p.final_bonus_ammo += i.buff_amount; }, special: i => [pct(i.buff_amount)] });
  U('o_ammo_upgrade_05', { card: card(5), pool: 80, req: ['o_ammo_upgrade_04'], info: { buff_amount: 2, ammo_amount: .5 },
    step: (i, p) => { p.final_bonus_ammo += i.ammo_amount; const fb = p.my_weapon ? Math.floor(i.buff_amount * p.my_weapon.final_bullet_number) / 100 : 0; i.final_buff_amount = fb; p.final_bonus_damage += fb; },
    special: i => [pct(i.ammo_amount), pct(i.buff_amount), () => Math.floor(i.buff_amount * ((W().player && W().player.my_weapon) ? W().player.my_weapon.final_bullet_number : 0)) + '%'] });
  U('o_ammo_upgrade_06', { card: card(6), pool: 60, req: ['o_ammo_upgrade_05'], info: { shot_number: 1 }, step: (i, p) => { p.final_bonus_shot_number += i.shot_number; }, special: i => [int(i.shot_number)] });
  U('o_ammo_upgrade_07', Object.assign({}, VII, { req: [['o_ammo_upgrade_06']], info: { unlock_character: true }, step: (i, p) => { unlock(i, 'soldier'); if (p.my_weapon) p.my_weapon.ammo_consumption = 1; }, special: () => ['1'] }));
  // ---- 1.5 Health (life_in_hearts 는 반 칸 단위)
  const healStep = (i, p) => { p.life_in_hearts += i.buff_amount; if (i.do_play_sound) { RatsSound.play('player_heal'); i.do_play_sound = false; } };
  U('o_health_upgrade_01', { card: card(1), info: { do_play_sound: true, buff_amount: 1 }, step: healStep, special: i => [dec1(i.buff_amount / 2)] });
  U('o_health_upgrade_02', { card: card(2), req: ['o_health_upgrade_01'], info: { do_play_sound: true, buff_amount: 2 }, step: healStep, special: i => [dec1(i.buff_amount / 2)] });
  U('o_health_upgrade_03', { card: card(4), req: ['o_health_upgrade_02'], info: { do_play_sound: true, buff_amount: 3 }, step: healStep, special: i => [dec1(i.buff_amount / 2)] });
  U('o_health_upgrade_04', { card: card(6), req: ['o_health_upgrade_03'], info: { buff_amount: .1 }, step: (i, p) => { const v = i.buff_amount * p.life; p.final_bonus_damage += v; p.final_bonus_fire_rate += v; }, special: i => [pct(i.buff_amount), () => pct(i.buff_amount * (W().player ? W().player.life : 0))] });
  U('o_health_upgrade_05', Object.assign({}, VII, { req: ['o_health_upgrade_04'], info: { has_added_callback: false, enemies_killed: 0, enemies_killed_min_start: 200, enemies_killed_min: 200, heal_amount: 1 },
    step: (i, p) => { once(i, 'has_added_callback', () => p.when_kill.push(() => { const P = W().player; if (P.life < P.life_max) i.enemies_killed++; })); if (i.enemies_killed >= i.enemies_killed_min) { if (p.life < p.life_max) p.self_heal(p, i.heal_amount); i.enemies_killed = 0; i.enemies_killed_min += i.enemies_killed_min_start; } },
    special: i => [() => String(i.enemies_killed_min), dec1(i.heal_amount / 2), () => String(i.enemies_killed_min - i.enemies_killed), String(i.enemies_killed_min_start)] }));
  // ---- 1.6 Movement
  U('o_movement_upgrade_01', { card: card(1), info: { buff_amount: .2 }, step: (i, p) => { p.final_bonus_movement_speed += i.buff_amount; }, special: i => [pct(i.buff_amount)] });
  U('o_movement_upgrade_02', { card: card(3), req: ['o_movement_upgrade_01'], info: { speed_amount: .1, dodge_amount: 10 }, step: (i, p) => { p.final_bonus_movement_speed += i.speed_amount; p.final_bonus_dodge_chance += i.dodge_amount; }, special: i => [pct(i.speed_amount), pctraw(i.dodge_amount)] });
  U('o_movement_upgrade_03', { card: card(4), req: ['o_movement_upgrade_02'], info: { speed_amount: .15, dodge_amount: 15 }, step: (i, p) => { p.final_bonus_movement_speed += i.speed_amount; p.final_bonus_dodge_chance += i.dodge_amount; }, special: i => [pct(i.speed_amount), pctraw(i.dodge_amount)] });
  U('o_movement_upgrade_04', { card: card(6), req: ['o_movement_upgrade_03'], info: { buff_amount: 2, knockback_amount: 1 }, step: (i, p) => { p.final_bonus_invulnerable_time += i.buff_amount; p.final_bonus_hit_knockback += i.knockback_amount; }, special: i => [pct(i.buff_amount), pct(i.knockback_amount)] });
  U('o_movement_upgrade_05', Object.assign({}, VII, { req: [['o_movement_upgrade_04']], info: { damage_amount: 2, firerate_amount: 1.5, critical_amount: 100, reload_amount: 1 },
    step: (i, p) => { if (p.invulnerable) { p.final_bonus_damage += i.damage_amount; p.final_bonus_fire_rate += i.firerate_amount; p.final_bonus_critical_chance += i.critical_amount; p.final_bonus_reload_time += i.reload_amount; } },
    special: i => ['+' + Math.round(i.damage_amount * 100) + '%', '+' + Math.round(i.firerate_amount * 100) + '%', '+' + Math.round(i.critical_amount) + '%', '+' + Math.round(i.reload_amount * 100) + '%'] }));
  // ---- 1.7 Poison
  U('o_poison_upgrade_01', { card: card(1), info: { buff_amount: 35 }, step: (i, p) => { p.final_bonus_poison_chance += i.buff_amount; }, special: i => [pctraw(i.buff_amount)] });
  U('o_poison_upgrade_02', { card: card(3), req: ['o_poison_upgrade_01'], info: { chance_amount: 20, damage_amount: .5 }, step: (i, p) => { p.final_bonus_poison_chance += i.chance_amount; p.final_bonus_poison_damage += i.damage_amount; }, special: i => [pctraw(i.chance_amount), pct(i.damage_amount)] });
  U('o_poison_upgrade_03', { card: card(3), req: ['o_poison_upgrade_02'], info: { chance_amount: 25, duration_amount: 1 }, step: (i, p) => { p.final_bonus_poison_chance += i.chance_amount; p.final_bonus_poison_duration += i.duration_amount; }, special: i => [pctraw(i.chance_amount), pct(i.duration_amount)] });
  U('o_poison_upgrade_04', { card: card(4), req: ['o_poison_upgrade_03'], info: { slow_amount: .35 }, step: (i) => { for (const e of C().enemies()) if (e.is_poisoned) e.slow_increase += i.slow_amount; }, special: i => [pct(i.slow_amount)] });
  U('o_poison_upgrade_05', { card: card(5), pool: 80, req: ['o_poison_upgrade_04'], info: { speed_amount: .4 }, step: (i, p) => { p.final_bonus_poison_speed += i.speed_amount; }, special: i => [pct(i.speed_amount)] });
  U('o_poison_upgrade_06', { card: card(6), pool: 60, req: ['o_poison_upgrade_05'], info: { damage_amount: .5, speed_amount: .6 }, step: (i, p) => { p.final_bonus_poison_damage += i.damage_amount; p.final_bonus_poison_speed += i.speed_amount; }, special: i => [pct(i.damage_amount), pct(i.speed_amount)] });
  U('o_poison_upgrade_07', Object.assign({}, VII, { req: ['o_poison_upgrade_06'], info: { unlock_character: true, has_added_callback: false },
    step: (i, p) => { unlock(i, 'doctor'); once(i, 'has_added_callback', () => p.when_kill.push(a => {   // anon@452
      if (!(a.entity.is_poisoned && a.projectile === -4)) return;
      const e = C().create_explosion(W().player, 'poison', 0x2bc557, 0, 0, a.entity.x, a.entity.y);
      e.when_hit = (ex, t) => { C().apply_debuff(t, 0); C().screen_shake(2, .6); t.delay_white = t.timer_white; };
      e.do_apply_poison = false; e.do_apply_curse = false; e.on_hit_effects = false;
      if (W().g.explosion_delay_sound <= 0) { RatsSound.play('explosion'); W().g.explosion_delay_sound = 2; }
    })); } }));
  // ---- 1.8 Curse
  U('o_curse_upgrade_01', { card: card(1), info: { buff_amount: 40 }, step: (i, p) => { p.final_bonus_curse_chance += i.buff_amount; }, special: i => [pctraw(i.buff_amount), () => String(W().g.base_curse_damage)] });
  U('o_curse_upgrade_02', { card: card(3), req: ['o_curse_upgrade_01'], info: { curse_speed: .5 }, step: (i, p) => { p.final_bonus_curse_speed += i.curse_speed; }, special: i => [pct(i.curse_speed)] });
  U('o_curse_upgrade_03', { card: card(3), req: ['o_curse_upgrade_02'], info: { do_spread_curse: false },
    step: (i, p) => { if (p.has_just_been_hit) { if (i.do_spread_curse) { for (const e of C().enemies()) if (GM.point_distance(e.x, e.y, p.x, p.y) <= 128) C().apply_debuff(e, 1); i.do_spread_curse = false; } } else i.do_spread_curse = true; } });
  U('o_curse_upgrade_04', { card: card(4), req: ['o_curse_upgrade_03'], info: { curse_chance: 10, curse_speed: .4 }, step: (i, p) => { p.final_bonus_curse_chance += i.curse_chance; p.final_bonus_curse_speed += i.curse_speed; }, special: i => [pctraw(i.curse_chance), pct(i.curse_speed)] });
  U('o_curse_upgrade_05', { card: card(5), pool: 80, req: ['o_curse_upgrade_04'], info: { extra_damage: .5 }, step: (i) => { for (const e of C().enemies()) if (e.is_cursed) e.damage_increase += i.extra_damage; }, special: i => [pct(i.extra_damage)] });
  U('o_curse_upgrade_06', { card: card(6), pool: 60, req: ['o_curse_upgrade_05'], info: { curse_chance: 10, curse_speed: .6 }, step: (i, p) => { p.final_bonus_curse_chance += i.curse_chance; p.final_bonus_curse_speed += i.curse_speed; }, special: i => [pctraw(i.curse_chance), pct(i.curse_speed)] });
  U('o_curse_upgrade_07', Object.assign({}, VII, { req: ['o_curse_upgrade_06'], info: { unlock_character: true, explosions: [], delay_explosion: 1, has_added_callback: false },
    step: (i, p) => {
      unlock(i, 'doctor');
      once(i, 'has_added_callback', () => p.when_kill.push(a => { if (a.entity.is_cursed && a.projectile && a.projectile !== -4 && a.type !== 1) i.explosions.push([i.delay_explosion, a.entity.x, a.entity.y]); }));   // anon@1317 L64–67
      for (let k = 0; k < i.explosions.length; k++) { const e = i.explosions[k]; if (e[0]-- <= 0) {   // L26 (후위 감소)
        const x = C().create_explosion(W().player, 'curse', 118, W().g.base_curse_damage, 0, e[1], e[2]);
        x.on_hit_effects = false; x.do_apply_poison = false; x.do_apply_curse = false; x.type = 1;
        if (W().g.explosion_delay_sound <= 0) { RatsSound.play('explosion'); W().g.explosion_delay_sound = 2; }
        i.explosions.splice(k, 1); k--; } }
    } }));
  // ---- 1.9 Lightning
  U('o_lightning_upgrade_01', { card: card(1), info: { has_added_callback: false, buff_amount: 40 },
    step: (i, p) => { p.final_bonus_lightning_number += 1; p.final_bonus_lightning_chance += i.buff_amount;
      once(i, 'has_added_callback', () => p.when_hit.push(a => { const pl = W().player; if (a.type === 4 || a.type === 5) return; if (a.type === 6 && !pl.arrows_trigger_lightning) return; if (a.type === 7 && !pl.stars_trigger_lightning) return; if (get_chance(pl.final_bonus_lightning_chance)) for (let n = 0; n < pl.final_bonus_lightning_number; n++) C().create_lightning(pl); })); },
    special: i => [pctraw(i.buff_amount)] });
  U('o_lightning_upgrade_02', { card: card(3), req: ['o_lightning_upgrade_01'], info: { chance_amount: 15, damage_amount: .4 }, step: (i, p) => { p.final_bonus_lightning_chance += i.chance_amount; p.final_bonus_lightning_damage += i.damage_amount; }, special: i => [pctraw(i.chance_amount), pct(i.damage_amount)] });
  U('o_lightning_upgrade_03', { card: card(3), req: ['o_lightning_upgrade_02'], info: { chance_amount: 20, damage_amount: .8 }, step: (i, p) => { p.final_bonus_lightning_chance += i.chance_amount; p.final_bonus_lightning_damage += i.damage_amount; }, special: i => [pctraw(i.chance_amount), pct(i.damage_amount)] });
  U('o_lightning_upgrade_04', { card: card(4), req: ['o_lightning_upgrade_03'], step: (i, p) => { p.lightning_can_critical = true; } });
  U('o_lightning_upgrade_05', { card: card(5), pool: 80, req: ['o_lightning_upgrade_04'], step: (i, p) => { p.lightning_priority = true; } });
  U('o_lightning_upgrade_06', { card: card(6), pool: 60, req: ['o_lightning_upgrade_05'], info: { chance_amount: 10, damage_amount: 1.5 }, step: (i, p) => { p.final_bonus_lightning_chance += i.chance_amount; p.final_bonus_lightning_damage += i.damage_amount; }, special: i => [pctraw(i.chance_amount), pct(i.damage_amount)] });
  U('o_lightning_upgrade_07', Object.assign({}, VII, { weight: 1, req: ['o_lightning_upgrade_06'], info: { unlock_character: true }, step: (i, p) => { unlock(i, 'eletric'); p.lightning_aoe = true; } }));
  // ---- 1.10 Star Ally
  U('o_star_upgrade_01', { card: card(1), info: { stars_to_summon: 0, delay_summon: 0, last_wave: -1, waves_required: 5, current_waves: 5, first_time_spawn: true },
    step: (i, p) => {
      if (i.current_waves >= i.waves_required) { i.stars_to_summon += 1 + p.final_bonus_star_summon * (i.first_time_spawn ? 1 : 0); i.current_waves = 0; i.first_time_spawn = false; }   // L7–12
      if (i.stars_to_summon > 0 && i.delay_summon <= 0) { RatsSound.play('star_summon'); C().create('star', p.x, p.y, p.y - 5, { player: p }); i.stars_to_summon--; i.delay_summon = 8; }   // L15–24
      if (i.delay_summon > 0) i.delay_summon--;
      if (i.last_wave !== -1 && i.last_wave !== W().g.wave_index) i.current_waves++; i.last_wave = W().g.wave_index;   // L29–30
    },
    special: i => [int(i.waves_required), () => String(i.last_wave === -1 ? i.waves_required : i.waves_required - i.current_waves)] });
  U('o_star_upgrade_02', { card: card(2), req: ['o_star_upgrade_01'], info: { buff_amount: .4 }, step: (i, p) => { p.final_bonus_star_damage += i.buff_amount; }, special: i => [pct(i.buff_amount)] });
  U('o_star_upgrade_03', { card: card(3), req: ['o_star_upgrade_02'], info: { buff_amount: .7 }, step: (i, p) => { p.final_bonus_star_fire_rate += i.buff_amount; p.stars_can_critical = true; }, special: i => [pct(i.buff_amount)] });
  U('o_star_upgrade_04', { card: card(4), req: ['o_star_upgrade_03'], info: { buff_amount: 1 }, step: (i, p) => { p.final_bonus_star_damage += i.buff_amount; }, special: i => [pct(i.buff_amount)] });
  U('o_star_upgrade_05', { card: card(5), pool: 80, req: ['o_star_upgrade_04'], step: (i, p) => { p.star_aoe_damage = true; } });
  U('o_star_upgrade_06', { card: card(6), pool: 60, req: ['o_star_upgrade_05'], info: { damage_amount: 1.3, firerate_amount: .8 }, step: (i, p) => { p.final_bonus_star_damage += i.damage_amount; p.final_bonus_star_fire_rate += i.firerate_amount; }, special: i => [pct(i.damage_amount), pct(i.firerate_amount)] });
  U('o_star_upgrade_07', Object.assign({}, VII, { req: ['o_star_upgrade_06'], info: { unlock_character: true, buff_amount: 99.99 }, step: (i, p) => { unlock(i, 'nerd'); p.star_infinite_penetration = true; }, special: i => [pct(i.buff_amount)] }));
  // ---- 1.11 Arrow
  function arrowProc(pl) { const a = C().create_arrow(pl, pl.sub_arrows); if (a && pl.arrow_doubled) C().create_arrow(pl, pl.sub_arrows, -1, a.enemy); }
  U('o_arrow_upgrade_01', { card: card(1), info: { has_added_callback: false, buff_amount: 40 },
    step: (i, p) => { p.final_bonus_arrow_chance += i.buff_amount;
      once(i, 'has_added_callback', () => {
        p.when_attack.push(() => { const pl = W().player; if (get_chance(pl.final_bonus_arrow_chance)) arrowProc(pl); });                        // anon@931
        p.when_star_attack.push(() => { const pl = W().player; if (pl.stars_trigger_arrows && get_chance(pl.final_bonus_arrow_chance)) arrowProc(pl); });   // anon@546
        p.when_kill.push(() => { const pl = W().player; if (pl.death_arrows_number > 0 && get_chance(pl.final_bonus_arrow_chance)) { const a = C().create_arrow(pl, pl.sub_arrows); if (a && pl.death_arrows_number > 1) C().create_arrow(pl, pl.sub_arrows, -1, a.enemy); } });   // anon@1262
      }); },
    special: i => [pctraw(i.buff_amount)] });
  U('o_arrow_upgrade_02', { card: card(3), req: ['o_arrow_upgrade_01'], info: { chance_amount: 15, damage_amount: .3 }, step: (i, p) => { p.final_bonus_arrow_chance += i.chance_amount; p.final_bonus_arrow_damage += i.damage_amount; }, special: i => [pctraw(i.chance_amount), pct(i.damage_amount)] });
  U('o_arrow_upgrade_03', { card: card(3), req: ['o_arrow_upgrade_02'], step: (i, p) => { p.arrow_can_critical = true; } });
  U('o_arrow_upgrade_04', { card: card(4), req: ['o_arrow_upgrade_03'], info: { chance_amount: 15, damage_amount: .7 }, step: (i, p) => { p.final_bonus_arrow_chance += i.chance_amount; p.final_bonus_arrow_damage += i.damage_amount; }, special: i => [pctraw(i.chance_amount), pct(i.damage_amount)] });
  U('o_arrow_upgrade_05', { card: card(5), pool: 80, req: ['o_arrow_upgrade_04'], step: (i, p) => { p.death_arrows_number += 1; } });
  U('o_arrow_upgrade_06', { card: card(6), pool: 60, req: ['o_arrow_upgrade_05'], info: { buff_amount: 2 }, step: (i, p) => { p.sub_arrows = 2; }, special: i => [int(i.buff_amount)] });
  U('o_arrow_upgrade_07', Object.assign({}, VII, { req: ['o_arrow_upgrade_06'], info: { unlock_character: true }, step: (i, p) => { unlock(i, 'robot'); p.arrow_doubled = true; } }));
  // ---- 1.12 단일 희귀
  const RARE = { type: 1, is_rare: true, pool: 2, weight: 3, card: 's_upgrade_card_rare_regular' };
  U('o_money_upgrade_10', Object.assign({}, RARE, { info: { buff_amount: .5 }, step: (i, p) => { p.final_bonus_money += i.buff_amount; }, special: i => [pct(i.buff_amount)] }));
  U('o_penetration_upgrade_10', Object.assign({}, RARE, { info: { buff_amount: 1 }, step: (i, p) => { p.final_bonus_projectile_penetration += i.buff_amount; }, special: i => [pct(i.buff_amount)] }));
  U('o_dodge_upgrade_10', Object.assign({}, RARE, { info: { buff_amount: 25 }, step: (i, p) => { p.final_bonus_dodge_chance += i.buff_amount; }, special: i => [pctraw(i.buff_amount)] }));
  U('o_all_damage_upgrade_10', Object.assign({}, RARE, { info: { buff_amount: 1 }, step: (i, p) => { for (const k of ['damage', 'star_damage', 'poison_damage', 'curse_damage', 'lightning_damage', 'arrow_damage']) p['final_bonus_' + k] += i.buff_amount; }, special: i => [pct(i.buff_amount)] }));
  U('o_heal_upgrade_10', Object.assign({}, RARE, { card: 's_upgrade_card_rare_leveled', pool: 4, priority: 1, info: { do_play_sound: true, has_healed: false, extra_health: 2 },
    cond: [() => { const P = W().player; return P && P.life <= 4 && P.life < P.life_max; }],
    step: (i, p) => { p.life_in_hearts += i.extra_health; if (i.do_play_sound) { if (p.life < p.life_max) RatsSound.play('player_heal'); i.do_play_sound = false; } if (!i.has_healed) { p.self_heal(p, p.life_max); i.has_healed = true; } },
    special: i => [dec1(i.extra_health / 2)] }));
  // ---- 1.13 일시적
  function tempStep(effect) { return (i, p) => { const on = i.waves_remaining > 0 || p.temp_upgrades_last_forever; effect(i, p, on); if (W().g.game_state === 'reward') { if (i.can_update_waves) { i.waves_remaining = Math.max(i.waves_remaining - 1, 0); i.can_update_waves = false; } } else i.can_update_waves = true; }; }
  const TEMP = Object.assign({}, RARE, { pool: 4, priority: 1, cond: [() => W().g.wave_index + 1 <= 30 && W().g.wave_index + 1 >= 5] });
  U('o_temp_damage_upgrade_10', Object.assign({}, TEMP, { info: { waves_remaining: 5, can_update_waves: false, buff_amount: 2.5 }, step: tempStep((i, p, on) => { if (on) p.final_bonus_damage += i.buff_amount; }), special: i => [pct(i.buff_amount), String(i.waves_remaining), () => String(i.waves_remaining)] }));
  U('o_temp_firerate_upgrade_10', Object.assign({}, TEMP, { info: { waves_remaining: 5, can_update_waves: false, buff_amount: 2.5 }, step: tempStep((i, p, on) => { if (on) p.final_bonus_fire_rate += i.buff_amount; }), special: i => [pct(i.buff_amount), String(i.waves_remaining), () => String(i.waves_remaining)] }));
  U('o_temp_ammo_upgrade_10', Object.assign({}, TEMP, { info: { waves_remaining: 5, can_update_waves: false }, step: tempStep((i, p, on) => { p.ignore_ammo_consumption = on; }), special: i => [String(i.waves_remaining), () => String(i.waves_remaining)] }));
  // ---- 1.14 기어 (type 2)
  const GEAR = { type: 2, is_rare: true, rainbow_name: true, weight: 3, pool: 2, card: 's_upgrade_card_rare_weapon' };
  U('o_weapon_upgrade_02', Object.assign({}, GEAR, { info: { buff_amount: 4, has_upgraded: false }, step: (i, p) => { p.has_gear = true; if (!i.has_upgraded) { p.test_gear_achievement = true; if (p.my_weapon) p.my_weapon.bullet_number += i.buff_amount; i.has_upgraded = true; } }, special: i => [int(i.buff_amount)] }));
  U('o_weapon_upgrade_03', Object.assign({}, GEAR, { info: { buff_amount: 2, has_upgraded: false }, step: (i, p) => { p.has_gear = true; if (!i.has_upgraded) { p.test_gear_achievement = true; if (p.my_weapon) p.my_weapon.damage += i.buff_amount; i.has_upgraded = true; } }, special: i => [int(i.buff_amount)] }));
  U('o_weapon_upgrade_04', Object.assign({}, GEAR, { info: { buff_amount: 1, has_upgraded: false }, step: (i, p) => { p.has_gear = true; p.final_bonus_shot_number += i.buff_amount; if (!i.has_upgraded) { p.test_gear_achievement = true; i.has_upgraded = true; } }, special: i => [int(i.buff_amount)] }));
  U('o_weapon_upgrade_05', Object.assign({}, GEAR, { pool: 1, info: { shot_amount: 1, damage_amount: 2, ammo_amount: 4, has_upgraded: false }, step: (i, p) => { p.has_gear = true; p.final_bonus_shot_number += i.shot_amount; if (!i.has_upgraded) { p.test_gear_achievement = true; if (p.my_weapon) { p.my_weapon.damage += i.damage_amount; p.my_weapon.bullet_number += i.ammo_amount; } i.has_upgraded = true; } }, special: i => [int(i.shot_amount), int(i.damage_amount), int(i.ammo_amount)] }));
  // ---- 1.15 조합 (type 3)
  const COMBO = { type: 3, is_rare: true, pool: 40, weight: 3, card: 's_upgrade_card_rare_combined' };
  const combo = (obj, a, b, flag) => U(obj, Object.assign({}, COMBO, { req: [[a, b]], step: (i, p) => { p[flag] = true; } }));
  combo('o_arrow_lightning_upgrade_10', 'o_arrow_upgrade_07', 'o_lightning_upgrade_07', 'arrows_trigger_lightning');
  combo('o_arrow_poison_upgrade_10', 'o_arrow_upgrade_07', 'o_poison_upgrade_07', 'arrows_trigger_poison');
  combo('o_arrow_curse_upgrade_10', 'o_arrow_upgrade_07', 'o_curse_upgrade_07', 'arrows_trigger_curse');
  combo('o_arrow_star_upgrade_10', 'o_arrow_upgrade_07', 'o_star_upgrade_07', 'stars_trigger_arrows');
  combo('o_lightning_poison_upgrade_10', 'o_lightning_upgrade_07', 'o_poison_upgrade_07', 'lightning_trigger_poison');
  combo('o_lightning_curse_upgrade_10', 'o_lightning_upgrade_07', 'o_curse_upgrade_07', 'lightning_trigger_curse');
  combo('o_star_lightning_upgrade_10', 'o_star_upgrade_07', 'o_lightning_upgrade_07', 'stars_trigger_lightning');
  combo('o_star_poison_upgrade_10', 'o_star_upgrade_07', 'o_poison_upgrade_07', 'stars_trigger_poison');
  combo('o_star_curse_upgrade_10', 'o_star_upgrade_07', 'o_curse_upgrade_07', 'stars_trigger_curse');
  U('o_curse_poison_combo_upgrade_10', Object.assign({}, COMBO, { req: [['o_poison_upgrade_07', 'o_curse_upgrade_07']], info: { damage_amount: 1, speed_amount: 1 }, step: (i, p) => { p.final_bonus_debuff_damage += i.damage_amount; p.final_bonus_debuff_speed += i.speed_amount; }, special: i => [pct(i.damage_amount), pct(i.speed_amount)] }));
  U('o_temp_combo_upgrade_10', Object.assign({}, COMBO, { req: [['o_temp_damage_upgrade_10', 'o_temp_firerate_upgrade_10', 'o_temp_ammo_upgrade_10']], step: (i, p) => { p.temp_upgrades_last_forever = true; } }));
  // ---- 1.16 저주받은 (type 4)
  const CURSED = { type: 4, is_rare: true, pool: .75, weight: 5, priority: 2, card: 's_upgrade_card_rare_cursed' };
  U('o_cursed_glass_heart_upgrade_00', Object.assign({}, CURSED, { info: { final_life: 2, damage_multi: 2 }, step: (i, p) => { p.life_in_hearts = i.final_life; p.final_bonus_damage *= i.damage_multi; }, special: i => [dec1(i.final_life / 2), dec1(i.damage_multi)] }));
  U('o_cursed_solid_critical_upgrade_00', Object.assign({}, CURSED, { priority: 3, info: { critical_damage: 3 }, step: (i, p) => { p.final_bonus_critical_damage = i.critical_damage; }, special: i => [pct(i.critical_damage)] }));
  U('o_cursed_speed_transmutation_upgrade_00', Object.assign({}, CURSED, { info: { total_bonus: 0 }, step: (i, p) => { i.total_bonus = p.final_bonus_movement_speed * 100; p.final_bonus_critical_chance += i.total_bonus; p.final_bonus_movement_speed = 0; }, special: i => [pct(i.total_bonus), () => pctraw(Math.max((W().player ? W().player.final_bonus_movement_speed : 0) * 100, i.total_bonus))] }));
  U('o_cursed_silver_bullet_upgrade_00', Object.assign({}, CURSED, { info: { ammo_multiplier: .01, penetration_amount: 98.7654321, damage_amount: 2.5 }, step: (i, p) => { p.final_bonus_ammo = (p.final_bonus_ammo + 1) * i.ammo_multiplier - 1; p.final_bonus_projectile_penetration += i.penetration_amount; p.final_bonus_damage += i.damage_amount; }, special: i => [pct(1 - i.ammo_multiplier), pct(i.penetration_amount), pct(i.damage_amount)] }));
  U('o_cursed_cursed_cannons_upgrade_00', Object.assign({}, CURSED, { info: { reload_multi: 2, shot_number_multi: 3 }, step: (i, p) => { p.final_bonus_reload_time = (p.final_bonus_reload_time + 1) * (1 / i.reload_multi) - 1; const t = (p.final_bonus_shot_number + 1) * i.shot_number_multi - 1; p.final_bonus_shot_number = GM.clamp(t, 0, 50); }, special: i => [dec1(i.reload_multi), dec1(i.shot_number_multi)] }));

  // ---- 롤 카드 (o_roll_upgrade_01): 풀에 안 들어가고 별도
  const ROLL = { obj: 'o_roll_upgrade_01', is_roll: true, type: 0, is_rare: false, priority: 0, pool: 100, weight: 1, req: [], cond: [], info: {}, special: () => [], card: 's_upgrade_card_roll', step: null };

  const W = () => C().W;
  const BY = Object.fromEntries(L.map(u => [u.obj, u]));
  // variable_clone: info 를 새로 만들어 픽마다 상태가 따로 (콜백도 같은 info 를 봄 — upgrades.md §4-2 권고)
  function cloneUpgrade(u) { return Object.assign({}, u, { info: JSON.parse(JSON.stringify(u.info)) }); }

  // ---- 풀·카드 (scr_upgrades) -------------------------------------------------------------------
  const state = { current_all: [], pool: [], options: [], selected: [], rare_n: 0 };
  function reset_upgrades() { state.current_all = L.map(cloneUpgrade); state.pool = []; state.options = []; state.selected = []; state.rare_n = 0; }   // L276–285
  const pickedObj = o => state.selected.some(s => s.obj === o);
  function set_upgrades_pool() {   // L320–432
    const P = W().player; state.pool = [];
    const pcm = P ? P.pool_chance_multiplier : 1, pref = P ? P.card_preference : '', gm = P ? P.gear_pool_chance_multiplier : 0;
    for (const u of state.current_all) {
      const name = nameKey(u), isPref = pref !== '' && name.includes(pref);
      let gearBonus = 0; if (name.includes('o_weapon')) gearBonus += gm;
      let chance = u.pool * (pcm + gearBonus); if (isPref) chance += P.card_preference_extra_pool_chance;
      if (!get_chance(chance)) continue;
      let reqOk = !(u.req.length > 0);
      for (const r of u.req) { if (!Array.isArray(r)) { if (pickedObj(r)) reqOk = true; } else if (r.every(pickedObj)) { reqOk = true; break; } }
      const condOk = u.cond.every(f => f());
      if (reqOk && condOk) state.pool.push(u);
    }
    for (let i = state.pool.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [state.pool[i], state.pool[j]] = [state.pool[j], state.pool[i]]; }   // array_shuffle
  }
  function set_upgrades_options() {   // L437–515
    const P = W().player;
    const total = 4 + (P ? P.final_bonus_upgrade_options : 0), need = total - state.options.length;   // upgrade_options_number = 4 (L280)
    const pref = P ? P.card_preference : '', wm = P ? P.weight_chance_multiplier : 1;
    const wOf = u => { let w = u.weight; if (u.is_rare) w *= wm; if (pref !== '' && nameKey(u).includes(pref)) w += P.card_preference_extra_weight_value; return w; };
    let totalW = state.pool.reduce((s, u) => s + wOf(u), 0); const picked = [];
    for (let n = 0; n < need; n++) {
      let cum = 0; const r = random(totalW);
      for (let i = 0; i < state.pool.length; i++) { const u = state.pool[i], w = wOf(u); cum += w; if (r <= cum) { picked.push(cloneUpgrade(u)); state.pool.splice(i, 1); totalW -= w; break; } }
    }
    for (const u of picked) if (!u.is_rare) state.options.push(u);
    for (const u of picked) if (u.is_rare) state.options.push(u);
  }
  // activate_upgrade(card, player) (L521–606): 카드 효과 붙이기
  function activate_upgrade(u, P) {
    if (u.is_rare) state.rare_n++;
    if (window.RatsGame) RatsGame.collectUpgrade(u.obj);
    state.selected.push(u);
    const keep = P && P.unlimited_gear && u.obj.includes('o_weapon');
    if (!keep) state.current_all = state.current_all.filter(x => x.obj !== u.obj);
    if (u.is_roll) { if (window.RatsGame) RatsGame.rollCards(); return false; }
    if (!u.step) return false;
    P.cards.push({ upgrade: u, id: P.cards.length });
    return true;
  }
  // par_player apply_card_upgrades (anon@13693): 우선순위 0 먼저, 나머지는 한 바퀴씩 미뤄 실행
  function apply_card_upgrades(P) {
    let list = P.cards.map(c => c.upgrade);
    for (const u of list) u._prio = u.priority;
    while (list.length) {
      const later = [];
      for (const u of list) { if (u._prio <= 0) u.step(u.info, P); else { u._prio--; later.push(u); } }
      list = later;
    }
  }
  function nameKey(u) { const m = /^(.*)_(\d+)$/.exec(u.obj); return (m ? m[1] : u.obj) + '_name'; }
  function descKey(u) { return u.obj + '_desc'; }
  function specials(u) { return u.special(u.info).map(v => typeof v === 'function' ? v() : v); }
  function roman(n) { return n > 0 ? ['', 'I', 'II', 'III', 'IV', 'V', 'VI', 'VII', 'VIII', 'IX', 'X'][n] || String(n) : '???'; }
  function level(u) { const m = /_(\d+)$/.exec(u.obj); return m ? parseInt(m[1], 10) : 0; }

  window.RatsUpgrades = { LIST: L, BY, ROLL, state, reset_upgrades, set_upgrades_pool, set_upgrades_options, activate_upgrade, apply_card_upgrades, nameKey, descKey, specials, roman, level, cloneUpgrade };
})();
