// 로켓 쥐 — 플레이어(par_player)·적(par_enemy + 치즈 3종)·엔티티 그리기·플레이어 HUD.
// 근거: notes/player.md, notes/enemies_waves.md, notes/weapons_damage.md §3. 숫자는 원작 그대로.
(function () {
  'use strict';
  const { dcos, dsin, lerp, clamp, sign, point_direction, point_distance, random, random_range, irandom, irandom_range, choose, get_chance, image_number } = GM;
  const C = RatsCombat, W = C.W, G = RatsGame, A = RatsArt, U = RatsUpgrades, UI = RatsUI, S = n => RatsSound.play(n);
  const bgr = n => '#' + [n & 255, (n >> 8) & 255, (n >> 16) & 255].map(v => v.toString(16).padStart(2, '0')).join('');

  // ---- par_entity 공통 -------------------------------------------------------------------------
  function entityDefaults(e) {   // par_entity_Create_0 (player.md §1.1)
    Object.assign(e, { state: '', z: 0, zgravity: .08, zspeed: 0, zjump_speed: 0, zjump_speed_loss: .4, invulnerable: false, acceleration: .2, velh: 0, velv: 0,
      knockback_resistance: 0, knockvelh: 0, knockvelv: 0, true_knockvelh: 0, true_knockvelv: 0, delay_white: 0, timer_white: 12, white_speed: 1,
      springxscale: 1, springyscale: 1, springxscale_spd: 0, springyscale_spd: 0, sidex: 1, sidey: 0, last_number_vfx: null, projectile_life_damage: 1,
      imagexscale: 1, imageyscale: 1, damage_increase: 0 });
  }
  function regular_squish(e, x, y) { e.imagexscale = x * sign(e.imagexscale || 1); e.imageyscale = y; }
  function knock_move(e, h, v, push, trueKb) {   // anon@1380@par_entity_Create_0
    if (!trueKb) { if (e.type === 1) moveWithCollisionOwn(e, h, v); else move_within_circle(e, h, v); }
    else { e.x += h; e.y += v; }
  }
  function entityStep(e) {   // par_entity_Step_0
    const gs = W.g.game_speed;
    if (!(e.z >= 0 && e.zspeed === 0)) {                                                   // L13–28
      e.z += e.zspeed; e.zspeed += e.zgravity;
      if (e.z >= 0) { e.z = 0; if (e.zjump_speed >= -.1) e.zspeed = 0; else { e.zspeed = e.zjump_speed; e.zjump_speed *= e.zjump_speed_loss; } e.springxscale = 1.2; e.springyscale = .8; }
    }
    const canKnock = e.type === 1 || e.state === 'hurt';                                   // L33
    if (canKnock && (e.knockvelh || e.knockvelv || e.true_knockvelh || e.true_knockvelv)) {
      knock_move(e, e.knockvelh * gs, e.knockvelv * gs, .01, false);                       // L36
      knock_move(e, e.true_knockvelh * gs, e.true_knockvelv * gs, .01, true);              // L37
      if (Math.abs(e.knockvelh) + Math.abs(e.knockvelv) - .1 <= 1e-5) { e.knockvelh = 0; e.knockvelv = 0; }
      if (Math.abs(e.true_knockvelh) + Math.abs(e.true_knockvelv) - .1 <= 1e-5) { e.true_knockvelh = 0; e.true_knockvelv = 0; }
      e.knockvelh = lerp(e.knockvelh, 0, .08 * gs); e.knockvelv = lerp(e.knockvelv, 0, .08 * gs);
      e.true_knockvelh = lerp(e.true_knockvelh, 0, .06 * gs); e.true_knockvelv = lerp(e.true_knockvelv, 0, .06 * gs);
    } else { e.knockvelh = 0; e.knockvelv = 0; }                                           // L59–60
    e.invulnerable = false;                                                                // L64
    if (e.type === 1) { if (e.life <= 0 && e.state !== 'dead') { e.state = 'dead'; e.when_die(e); } }
    else if (e.hearts.length && e.hearts[0].health_amount <= 0 && e.state !== 'dead') { e.state = 'dead'; e.when_die(e); }   // L76–79
    e.imagexscale = lerp(e.imagexscale, sign(e.imagexscale || 1), .2 * gs); e.imageyscale = lerp(e.imageyscale, 1, .2 * gs);
    e.springxscale_spd = lerp(e.springxscale_spd, (1 - e.springxscale) * .5, .15 * gs); e.springxscale += e.springxscale_spd;
    e.springyscale_spd = lerp(e.springyscale_spd, (1 - e.springyscale) * .5, .15 * gs); e.springyscale += e.springyscale_spd;
    if (e.delay_white > 0) e.delay_white -= e.white_speed;
  }
  // move_with_collision(h, v, [own object]) — 적은 같은 종류끼리만 막힘 (weapons_damage.md §4a–b)
  function blockedOwn(e, x, y) { for (const o of W.inst) if (o !== e && o.alive && o.type === 1 && o.etype === e.etype && GM.overlap(e, x, y, o)) return true; return false; }
  function stepMoveOwn(e, h, v) {
    if (!blockedOwn(e, e.x + h, e.y + v)) { e.x += h; e.y += v; return false; }
    if (Math.abs(h) > 1 || Math.abs(v) > 1) {
      const steps = Math.ceil(Math.max(Math.abs(h), Math.abs(v)));
      for (let i = steps - 1; i >= 0; i--) { const sx = i === 0 ? GM.frac(h) : sign(h), sy = i === 0 ? GM.frac(v) : sign(v); if (blockedOwn(e, e.x + sx, e.y + sy)) return true; e.x += sx; e.y += sy; }
    }
    return false;
  }
  function moveWithCollisionOwn(e, h, v) {
    const stuck = blockedOwn(e, e.x, e.y);
    if (h !== 0) { if (stuck) e.x += h; else stepMoveOwn(e, h, 0); }
    if (v !== 0) { if (stuck) e.y += v; else stepMoveOwn(e, 0, v); }
  }
  // 플레이어: 경기장 원 안에 가두기 (move_within_circle L5–33) / 대기실: 벽 충돌
  function move_within_circle(e, h, v) {
    lobbyMove(e, h, v);
    const R = W.g.circle_range, d = point_distance(W.g.circle_x, W.g.circle_y, e.x, e.y), a = point_direction(W.g.circle_x, W.g.circle_y, e.x, e.y);
    const cx = Math.abs(dcos(a)), cy = Math.abs(-dsin(a));
    if (d * cx > R * cx) e.x = W.g.circle_x + dcos(a) * R;
    if (d * cy > R * cy) e.y = W.g.circle_y - dsin(a) * R;
  }
  let worldBlocked = () => false;
  function lobbyMove(e, h, v) {   // move_with_collision(h, v, global.all_collisions)
    if (h !== 0) { if (!worldBlocked(e.x + h, e.y)) e.x += h; else { const s = sign(h); for (let i = 0; i < Math.ceil(Math.abs(h)); i++) { if (worldBlocked(e.x + s, e.y)) break; e.x += s; } } }
    if (v !== 0) { if (!worldBlocked(e.x, e.y + v)) e.y += v; else { const s = sign(v); for (let i = 0; i < Math.ceil(Math.abs(v)); i++) { if (worldBlocked(e.x, e.y + s)) break; e.y += s; } } }
  }

  // ---- 플레이어 ------------------------------------------------------------------------------
  const ALL_BONUSES = ['bonus_damage', 'bonus_fire_rate', 'bonus_ammo', 'bonus_reload_time', 'bonus_critical_chance', 'bonus_critical_damage', 'bonus_movement_speed', 'bonus_dodge_chance',
    'bonus_shot_number', 'bonus_shot_spread', 'bonus_shot_range', 'bonus_all_damage', 'bonus_debuff_damage', 'bonus_summon_damage', 'bonus_lightning_number', 'bonus_lightning_chance',
    'bonus_lightning_damage', 'bonus_star_damage', 'bonus_star_fire_rate', 'bonus_star_speed', 'bonus_star_shot', 'bonus_star_summon', 'bonus_arrow_chance', 'bonus_arrow_damage',
    'bonus_arrow_penetration', 'bonus_poison_chance', 'bonus_poison_damage', 'bonus_poison_speed', 'bonus_poison_duration', 'bonus_poison_dodge_chance', 'bonus_curse_chance',
    'bonus_curse_damage', 'bonus_curse_speed', 'bonus_curse_dodge_chance', 'bonus_debuff_speed', 'bonus_projectile_penetration', 'bonus_projectile_speed', 'bonus_knockback',
    'bonus_hit_knockback', 'bonus_invulnerable_time', 'bonus_heal', 'bonus_money', 'bonus_upgrade_options', 'bonus_rolls_number', 'enemy_health_increase', 'enemy_speed_increase'];   // PC L192
  function spawnPlayer(x, y, inCombat) {
    const ck = G.SAVE.character_selected || 'white', ch = G.CHAR[ck] || G.CHAR.white;
    const p = C.create('player', x, y, -y, { ckey: ck, sprite_index: 's_rat_white_idle', mask_index: 's_rat_white_idle' });
    W.player = p;
    if (inCombat) { p.state = 'entrance'; p.z = -W.g.room_height; p.my_weapon = C.create('weapon', x, y, p.depth - 50, { wkind: ch.weapon, player: p }); }   // PC L453, anon@7708
    return p;
  }
  C.KINDS.player = {
    create(p) {
      entityDefaults(p);
      for (const b of ALL_BONUSES) p[b] = 0;
      p.bonus_critical_damage = 1; p.bonus_critical_chance = 10;                            // o_rat_*_Create_0 L32–33
      Object.assign(p, { type: 0, state: 'idle', life_in_hearts: 6, timer_entrance: 20, delay_entrance: 20, delay_lerp_ui: 40, step_start: true, sprite: 'idle', vel: 1.8, acceleration: .2,   // PC L14–179
        delay_step: 0, delay_step_sound: 0, time_step: 10, time_step_sound: 40, delay_invulnerable: 0, timer_invulnerable: 60, final_timer_invulnerable: 60,
        has_gear: false, test_gear_achievement: true, unlimited_gear: false, gear_pool_chance_multiplier: 0, temp_upgrades_last_forever: false,
        arrows_trigger_lightning: false, arrows_trigger_poison: false, arrows_trigger_curse: false, lightning_trigger_poison: false, lightning_trigger_curse: false,
        stars_trigger_poison: false, stars_trigger_curse: false, stars_trigger_lightning: false, stars_trigger_arrows: false, star_wave_shot: false, star_explode_damage: 0,
        card_preference: '', card_preference_extra_pool_chance: 15, card_preference_extra_weight_value: 1, weight_chance_multiplier: 1, pool_chance_multiplier: 1,
        ignore_ammo_consumption: false, metal_heart: false, lightning_priority: false, lightning_can_critical: false, lightning_aoe: false, lightning_trigger_lightning: false,
        prioritize_cursed_enemies: false, prioritize_non_poisoned_enemies: false, curse_stun_on_apply: 0, stars_can_critical: false, arrow_can_critical: false, arrow_doubled: false,
        sub_arrows: 0, stars: [], stars_n: 0, star_time: 0, star_delay_fire_rate: 0, star_fire_rate: 120, star_final_fire_rate: 120, star_infinite_penetration: false, star_aoe_damage: false,
        death_arrows_number: 0, big_lightning_range: false, has_just_been_hit: false, rolled_this_level: 0, rare_cards_n: 0, gear_cards_n: 0,
        when_kill: [], when_hit: [], when_critical: [], when_attack: [], when_star_attack: [], hearts: [], heal_points: 0, cards: [], skills: [], my_weapon: null,
        weapon_xoffset: -2, weapon_yoffset: -21, anim_t: 0, coins_shown: G.SAVE.coins, coin_pop: 0 });
      p.life_in_hearts_start = p.life_in_hearts; p.life = p.life_in_hearts; p.life_max = p.life;   // PC L428–430
      p.main_upgrades = G.MAIN_CATS.map((c, i) => { const s = G.SAVE.main_upgrades_selected[c]; return s >= 0 ? G.MAIN[i][s] : null; });   // PC L727–736
      if (window.RatsTalents) RatsTalents.equipAll(p);                                       // PC L741–769
      p.self_heal = (q, amount) => { q.heal_points += amount * (1 + q.final_bonus_heal); C.screen_shake(4, .4); S('player_heal'); };   // anon@15555
      p.when_hurt = playerHurt; p.when_die = playerDie;
      for (const b of ALL_BONUSES) p['final_' + b] = p[b];
    },
    beginStep(p) {   // par_player_Step_1 (player.md §2.1)
      if (W.g.pause) return;
      p.card_preference = '';
      Object.assign(p, { unlimited_gear: false, gear_pool_chance_multiplier: 0, temp_upgrades_last_forever: false, death_arrows_number: 0, star_wave_shot: false, star_explode_damage: 0,
        pool_chance_multiplier: 1, weight_chance_multiplier: 1, curse_stun_on_apply: 0, big_lightning_range: false, prioritize_cursed_enemies: false, prioritize_non_poisoned_enemies: false,
        metal_heart: false, life_in_hearts: p.life_in_hearts_start, arrows_trigger_lightning: false, arrows_trigger_poison: false, arrows_trigger_curse: false, stars_trigger_arrows: false });   // L18–45
      for (const c of p.cards) if (c.upgrade.begin_step) c.upgrade.begin_step(c.upgrade.info, p);                      // L48–56
      for (const b of ALL_BONUSES) p['final_' + b] = p[b];                                                            // L58–63
      for (const u of p.main_upgrades) if (u) { u.level = G.SAVE.main_upgrades_progress[u.name] || 0; u.eff(u, p); } // L67–77
      for (const s of p.skills) s.step(s, p);                                                                         // L83–87
      p.rare_cards_n = p.cards.filter(c => c.upgrade.is_rare).length; p.gear_cards_n = p.cards.filter(c => c.upgrade.type === 2).length;   // L92–105
      U.apply_card_upgrades(p);                                                                                       // L108
      for (const c of p.cards) { c.time = (c.time || 0) + W.g.game_speed; }
      p.final_bonus_poison_damage += p.final_bonus_debuff_damage; p.final_bonus_curse_damage += p.final_bonus_debuff_damage;   // L156–159
      p.final_bonus_poison_speed += p.final_bonus_debuff_speed; p.final_bonus_curse_speed += p.final_bonus_debuff_speed;
      if (p.state !== 'dead') p.star_time += 2;                                                                       // L195
      p.star_final_fire_rate = p.star_fire_rate / (1 + p.final_bonus_star_fire_rate);                                 // L197
      if (p.star_delay_fire_rate >= p.star_final_fire_rate) resetStars(p); else p.star_delay_fire_rate++;             // L198–199
      if (W.g.game_state !== 'combat') resetStars(p);                                                                 // L201
      p.has_just_been_hit = false;                                                                                    // L215
    },
    step(p) {   // par_player_Step_0
      if (W.g.pause) return;
      heartsBookkeeping(p);                                                                                           // L11–108
      entityStep(p);                                                                                                  // L113
      p.final_timer_invulnerable = p.timer_invulnerable * (1 + p.final_bonus_invulnerable_time);                      // L435
      if (p.delay_invulnerable > 0) { p.invulnerable = true; if (p.delay_white <= 0) p.delay_white = p.timer_white; p.delay_invulnerable--; if (p.delay_invulnerable <= 0) p.delay_white = 0; }   // L437–446
      const I = G.I, scene = RatsWorld.R.scene;
      const canMove = (W.g.in_lobby || W.g.circle_range > 0) && !W.g.pause && !RatsMain.SC.trans && !['entrance', 'hurt', 'dead'].includes(p.state)
        && !(W.g.game_state === 'reward' && false) && !(W.level && W.level.show_end_results);   // L466 (키보드는 보상 화면에서도 걸을 수 있음)
      const dir = I.stick ? point_direction(0, 0, I.stick.dx, I.stick.dy) : point_direction(0, 0, I.right - I.left, I.down - I.up);   // o_input_Step_1 L169 (스틱은 L308–323)
      const isMoving = (I.up || I.down || I.left || I.right) && canMove ? 1 : 0;                                      // L469
      const speed = p.vel * I.move_force * (1 + p.final_bonus_movement_speed);                                        // L471
      p.velh = lerp(p.velh, dcos(dir) * speed, p.acceleration) * isMoving;                                            // L475
      p.velv = lerp(p.velv, -dsin(dir) * speed, p.acceleration) * isMoving;                                           // L476
      if (canMove) { if (W.g.in_combat) move_within_circle(p, p.velh, p.velv); else if (W.g.in_lobby) lobbyMove(p, p.velh, p.velv); }   // L478–486
      if (!isMoving) { p.delay_step = 0; p.delay_step_sound = 0; }                                                    // L489–517 발자국
      else {
        if (p.delay_step++ >= p.time_step / (speed + 1)) { C.vfx('s_smoke', p.x - p.velh * 2 + random_range(-4, 4), p.y - p.velv * 2 + random_range(-4, 4), p.depth + 5, { image_index: 2, image_speed: random_range(.8, 1) }); p.delay_step = 0; }
        if (p.delay_step_sound++ >= p.time_step_sound / (speed + 1)) { S('footsteps'); p.delay_step_sound = 0; }
      }
      switch (p.state) {   // L524–650
        case 'entrance':
          if (p.delay_entrance > 0) { p.z = -W.g.room_height * .6; p.zspeed = 16; p.zgravity = .2; if (!RatsMain.SC.trans) p.delay_entrance--; }   // L530–535
          else {
            p.zgravity += .02; p.white_speed = 0; p.delay_white = p.timer_white;                                    // L539–542
            const t = Math.max(Math.abs(p.zspeed / 8), 1);
            p.imagexscale = lerp(p.imagexscale, sign(p.imagexscale || 1) * .05, .2 + .1 * t); p.imageyscale = lerp(p.imageyscale, 2, .01 + .2 * t);   // L545–546
            if (p.z >= 0) { C.screen_shake(8, .8); G.CAM.size *= .85; regular_squish(p, 1.4, .7); p.white_speed = 1; S('hit_ground'); p.sprite = 'idle'; p.state = 'idle'; p.delay_entrance = p.timer_entrance; p.delay_white = 0; }   // L552–569
          }
          break;
        case 'idle': {
          const end = (p.sprite !== 'idle' && p.sprite !== 'blink') || p.anim >= framesOf(p, p.sprite) - 1;
          if (end) { p.sprite = choose('idle', 'idle', 'blink'); p.anim = 0; }                                       // L583–588
          if (isMoving) p.state = 'move'; break; }
        case 'move':
          if (p.sprite !== 'move_in' && p.sprite !== 'move') { p.sprite = 'move_in'; p.anim = 0; }
          else if (p.sprite === 'move_in' && p.anim >= framesOf(p, 'move_in') - 1) { p.sprite = 'move'; p.anim = 0; }
          if (!isMoving) p.state = 'idle';
          if (p.velh !== 0) p.sidex = sign(p.velh); if (p.velv !== 0) p.sidey = sign(sign(p.velv) + 1);             // L617–618
          break;
        case 'hurt':
          if (p.sprite !== 'hurt') { p.sprite = 'hurt'; p.anim = 0; } else if (p.anim >= framesOf(p, 'hurt') - 1) p.state = 'idle';   // L627–632
          break;
        case 'dead':
          if (p.sprite !== 'dead') { p.sprite = 'dead'; p.anim = 0; } else if (p.anim >= framesOf(p, 'dead') - 1) { p.anim = framesOf(p, 'dead') - 1; p.animStop = true; }   // L640–649
          break;
      }
      if (!p.animStop) p.anim = (p.anim || 0) + ratFps(p, p.sprite) / 60 * W.g.game_speed;
      if (p.anim >= framesOf(p, p.sprite) && p.sprite !== 'dead') p.anim -= framesOf(p, p.sprite);
      p.step_start = false;
    },
    endStep(p) { p.depth = -p.y; },   // par_entity_Step_2 L9
  };
  const RAT_FPS = { idle: 10, blink: 10, move_in: 20, move: 33, hurt: 14, dead: 14 };   // _sprites.json (eletric idle/blink 14, nerd hurt/dead 20)
  function ratFps(p, s) { if (p.ckey === 'eletric' && (s === 'idle' || s === 'blink')) return 14; if (p.ckey === 'nerd' && (s === 'hurt' || s === 'dead')) return 20; return RAT_FPS[s] || 10; }
  function framesOf(p, s) { return { idle: 13, blink: 13, move_in: 1, move: 12, hurt: 8, dead: 10 }[s] || 1; }
  function resetStars(p) { p.star_delay_fire_rate = 0; for (const s of p.stars) s.has_attacked = false; }   // anon@5002
  // 하트 정리 (PS0 L11–108)
  function heartsBookkeeping(p) {
    const cap = 2; let rem = p.life_in_hearts, n = p.hearts.length, last = -1;
    for (let i = 0; i < n; i++) { const h = p.hearts[i]; last = i; rem -= h.health_amount_max; if (rem < 0) { h.health_amount_max += rem; if (h.health_amount_max <= 0) { p.hearts.splice(i, 1); i--; n--; } } }
    let totalHeal = rem + p.heal_points;
    if (rem > 0 && n > 0) { const h = p.hearts[last]; if (h && h.health_amount_max < cap) { const add = Math.min(cap - h.health_amount_max, rem); h.health_amount_max += add; rem -= add; } }
    p.heal_points = 0;
    while (rem > 0) { const amt = Math.min(rem, cap); p.hearts.splice(last + 1, 0, { type: 0, health_amount: 0, health_amount_max: amt, xscl: p.step_start ? 1 : 1.6, yscl: p.step_start ? 1 : 1.6, delay_red: 0, delay_white: p.step_start ? 0 : 24, timer_white: 12, angle: 0, angle_spd: 0 }); n++; rem -= amt; last++; }
    if (totalHeal > 0) for (let i = 0; i < n; i++) { const h = p.hearts[i]; const add = Math.min(totalHeal, h.health_amount_max - h.health_amount); if (add > 0) { h.health_amount += add; h.xscl = 1.6; h.yscl = 1.6; h.delay_white = h.timer_white * 2; totalHeal -= add; } if (totalHeal <= 0) break; }
    p.life = 0; p.life_max = 0;
    for (let i = n - 1; i >= 0; i--) { const h = p.hearts[i]; h.health_amount = clamp(h.health_amount, 0, h.health_amount_max); p.life += h.health_amount; p.life_max += h.health_amount_max; }
    for (const h of p.hearts) { h.xscl = lerp(h.xscl, 1, .2); h.yscl = lerp(h.yscl, 1, .2); h.angle_spd = lerp(h.angle_spd, -h.angle * .5, .2); h.angle += h.angle_spd; if (h.delay_white > 0) h.delay_white--; if (h.delay_red > 0) h.delay_red--; }
  }
  function playerHurt(p, dmg) {   // anon@15795 (player.md §4.3)
    W.g.has_been_hit = true; p.has_just_been_hit = true;
    const dodged = get_chance(p.final_bonus_dodge_chance);                                                  // L788
    regular_squish(p, 1.4, .7); p.invulnerable = true; p.delay_invulnerable = p.final_timer_invulnerable;   // L790–793
    C.screen_shake(4, .8); S(dodged ? 'player_dodge' : 'player_hurt');                                      // L795–798
    if (!dodged) {
      p.state = 'hurt'; W.g.aberration += 4;
      for (let i = p.hearts.length - 1; i >= 0; i--) { const h = p.hearts[i]; if (h.health_amount <= 0) continue; const d = Math.min(h.health_amount, dmg); dmg -= d; h.health_amount -= d; h.delay_red = h.timer_white; h.xscl = 1.4; h.yscl = .7; h.angle = 20; if (dmg <= 0) break; }   // L809–824
    } else {
      const t = C.create_text_vfx(p, 0, choose(-1, 1), '#ffffff', false, null); if (t) t.label = UI.T('dodge') + '!';   // L830
    }
    for (const e of C.enemies()) if (point_distance(e.x, e.y, p.x, p.y) <= 100) { const a = point_direction(e.x, e.y, p.x, p.y) + 180, kb = 6 * (1 + p.final_bonus_hit_knockback); e.knockvelh += dcos(a) * kb; e.knockvelv += -dsin(a) * kb; }   // L837–849
  }
  function playerDie(p) {   // anon@17587 (player.md §4.7)
    S('wave_over'); S('player_death'); C.screen_shake(12, .9); G.CAM.size *= .75;
    RatsWorld.end_run('lost'); clear_enemies();
    if (p.my_weapon) p.my_weapon.state = '';
  }

  // ---- 적 (par_enemy + o_*_cheese) -----------------------------------------------------------
  const ETYPE = {   // *_cheese_Create_0 (enemies_waves.md §1.1)
    star: { life: 10, vel: .5, touch: 1, money: 1, kr: .3, zgrav: .08 * 1.2, move: 's_star_cheese_move', hurt: 's_star_cheese_hurt', hurtFps: 14, shadow: 30 },
    moon: { life: 20, vel: .4, touch: 1, money: 2, kr: .5, zgrav: .08, move: 's_moon_cheese_move', hurt: 's_moon_cheese_hurt', hurtFps: 20, shadow: 30 },
    planet: { life: 30, vel: .3, touch: 1, money: 3, kr: .8, zgrav: .08, move: 's_planet_cheese_move', hurt: 's_planet_cheese_hurt', hurtFps: 14, shadow: 36 },
  };
  function spawnEnemy(kind, x, y) { return C.create('enemy', x, y, -y, { etype: kind }); }
  function enemy_position_to_spawn(kind) {   // anon@14023 L644–677
    const ang = random(360); choose(-1, 1);
    const r = W.g.circle_range + 60;                                                       // enemy_extra_range_spawn = 60 (L640, L659)
    const px = W.g.circle_x + dcos(ang) * r, py = W.g.circle_y - dsin(ang) * r;
    const probe = { mask_index: ETYPE[kind].move, sprite_index: ETYPE[kind].move, x: px, y: py, image_angle: 0 };
    for (const o of W.inst) if (o.alive && o.type === 1 && o.etype === kind && GM.overlap(probe, px, py, o)) return -1;   // L665
    return [px, py];
  }
  C.KINDS.enemy = {
    create(e) {
      const T = ETYPE[e.etype]; entityDefaults(e);
      Object.assign(e, { life: T.life, vel: T.vel, touch_damage: T.touch, money_drop: T.money, knockback_resistance: T.kr, zgravity: T.zgrav, sprite_index: T.move, mask_index: T.move, shadow_length: T.shadow });
      e.type = 1; e.state = ''; e.can_trigger_lightning = true; e.vel_start = e.vel; e.vel = 0; e.life_start = e.life_max = e.life;   // par_enemy_Create_0 L4–16
      Object.assign(e, { health_increase: 0, speed_increase: 0, slow_increase: 0, damage_increase: 0, auto_collect: false, image_alpha: 0, delay_death: 0, clear_effect_on_death: false, shadow_alpha: 0 });
      for (const d of C.DEBUFFS) d.create(e);                                              // L35–38
      e.dir_start = point_direction(e.x, e.y, W.g.circle_x, W.g.circle_y) + random_range(-40, 40);   // L44–45
      e.dir = e.dir_start; e.delay_start = 0; e.timer_start = 8; e.invulnerable = true; e.delay_switch_dir = -1; e.time_angle = irandom(360);   // L47–55
      e.when_hurt = enemyHurt; e.when_die = enemyDie; e.vel_max = e.vel_start;
    },
    beginStep(e) {   // par_enemy_Step_1
      if (W.g.pause) return;
      for (const d of C.DEBUFFS) d.step(e);
      e.damage_increase = 0;                                                               // L17
    },
    step(e) {   // o_*_cheese_Step_0 → par_enemy_Step_0 → par_entity_Step_0
      if (W.g.pause) return;
      const T = ETYPE[e.etype], P = W.player;
      entityStep(e);
      const lifeNew = e.life_start * (1 + e.health_increase + (W.g.enemy_health_increase || 0));   // L12
      if (lifeNew !== e.life_max) { e.life_max = lifeNew; e.life = e.life_max; }
      e.vel_max = e.vel_start * Math.max(1 + e.speed_increase + (W.g.enemy_speed_increase || 0), .15);   // L19
      e.vel_max *= 1 - Math.min(.85, e.slow_increase + W.g.enemy_slow_increase);                // L20
      e.health_increase = 0; e.speed_increase = 0; e.slow_increase = 0;                        // L22–24
      e.life = clamp(e.life, 0, e.life_max);
      if (e.state !== 'dead' && P && P.alive && !P.invulnerable && P.state !== 'entrance' && GM.overlap(e, e.x, e.y, P)) damage_entityPlayer(e, P);   // L50–53
      switch (e.state) {
        case '': e.state = 'move'; e.invulnerable = true; break;                           // L63–64
        case 'move':
          e.sprite_index = T.move;
          if (e.delay_start > e.timer_start) {                                             // L74
            e.invulnerable = false;
            if (e.delay_switch_dir === -1) e.delay_switch_dir = irandom_range(12, 24);     // L85
            if (e.delay_switch_dir-- <= 0 && P) { e.dir = point_direction(e.x, e.y, P.x, P.y); if (get_chance(80)) e.dir += random_range(-40, 40); else e.dir += choose(-1, 1) * 60; e.delay_switch_dir = -1; }   // L86–95
          } else { const a = e.delay_start++ / e.timer_start; e.image_alpha = a; e.shadow_alpha = a; e.vel = e.vel_max * a; e.invulnerable = false; }   // L76–80
          e.vel = lerp(e.vel, e.vel_max, e.acceleration);                                  // L99
          e.velh = lerp(e.velh, dcos(e.dir) * e.vel, e.acceleration); e.velv = lerp(e.velv, -dsin(e.dir) * e.vel, e.acceleration);   // L100–101
          moveWithCollisionOwn(e, e.velh, e.velv);                                          // L103
          { const s = sign(dcos(e.dir)); if (s !== 0) e.sidex = s; }
          // 통통 뛰기·흔들기 (*_cheese_Step_0 L13–28)
          { const s1 = Math.max(e.vel / e.vel_start, 1), s2 = Math.pow(1 / s1, .5); if (e.z >= 0) e.zspeed = -1 * s2; e.time_angle += s2 * 7.5; e.image_angle = dcos(e.time_angle) * 12.5; }
          break;
        case 'hurt':
          e.invulnerable = false;
          if (e.sprite_index === T.hurt) { if (e.image_index >= image_number(T.hurt) - 1) { e.image_index = image_number(T.hurt) - 1; if (!e.is_stunned) e.state = 'move'; } }   // L116–125
          else { e.sprite_index = T.hurt; e.image_index = 0; }
          break;
        case 'dead':   // L134–168
          e.invulnerable = true; e.sprite_index = T.hurt; e.image_index = 0;
          if (e.delay_death <= 0) {
            if (e.image_alpha > .6) C.vfx('s_regular_explosion', e.x, e.y, e.depth - 5, { image_speed: random_range(.6, 1) });
            if (W.g.game_state !== 'lost') {
              const m = e.money_drop * (1 + (P ? P.final_bonus_money : 0)), n = Math.floor(m) + (get_chance((m - Math.floor(m)) * 100) ? 1 : 0);   // L159–160
              G.collectables_create(e.x, e.y, 5, 2, G.collectables_distribute(n), e.auto_collect);   // L161–163
            }
            C.destroy(e);
          } else e.delay_death -= W.g.game_speed;
          break;
      }
    },
    endStep(e) { if (e.velh !== 0) e.sidex = sign(e.velh); e.depth = -e.y; },
  };
  function damage_entityPlayer(e, P) { C.damage_entity(e, P, e.touch_damage, 2, point_direction(e.x, e.y, P.x, P.y)); }
  function enemyHurt(e, dmg, crit) {   // anon@945@par_enemy_Create_0
    e.invulnerable = true; if (e.state !== 'dead') e.state = 'hurt';
    const shown = Math.floor(dmg * 10) * .1;
    e.last_number_vfx = C.create_text_vfx(e, shown, sign(e.knockvelh + choose(-1, 1) * .001), crit ? '#ffec00' : '#ffffff', crit, e.last_number_vfx);   // L69–73 (crit 0xECFF)
    regular_squish(e, 1.4, .7); e.delay_white = e.timer_white * 1.5;                       // L77–79
    C.screen_shake(2 + 2 * (crit ? 1 : 0), .6); if (crit) W.g.aberration += 2;              // L81–82
    if (W.g.hurt_delay_sound <= 0) { S(crit ? 'enemy_critical_hit' : 'enemy_hit'); W.g.hurt_delay_sound = 4; }   // L84–101
  }
  function enemyDie(e) {   // anon@2421
    S('enemy_death');
    if (W.g.game_state === 'combat') { W.g.enemies_killed = (W.g.enemies_killed || 0) + 1; }
    C.vfx('s_enemy_death_explosion', e.x, e.y, e.depth - 4, { image_speed: 1 });
  }
  function clear_enemies() {   // anon@6197 L263–277
    const list = C.enemies(), n = list.length;
    list.forEach((e, i) => { e.state = 'dead'; e.clear_effect_on_death = true; e.delay_death = (i / Math.max(n - 1, 1)) * 4; e.auto_collect = true; });
  }

  // ---- 그리기 ---------------------------------------------------------------------------------
  function drawShadow(g, x, y, len, a) { if (a <= 0) return; g.globalAlpha = .28 * a; g.fillStyle = '#0d0820'; g.beginPath(); g.ellipse(x, y, len / 2, Math.max(2, len / 8), 0, 0, Math.PI * 2); g.fill(); g.globalAlpha = 1; }
  function whiteOf(img) { if (!img._white) { img._white = A.bake(img.width, img.height, q => { q.drawImage(img, 0, 0); q.globalCompositeOperation = 'source-in'; q.fillStyle = '#fff'; q.fillRect(0, 0, img.width, img.height); }, { outline: false, cut: 1 }); } return img._white; }
  function drawSpriteAt(g, img, ox, oy, x, y, sx, sy, ang, alpha, white) {
    g.save(); g.translate(Math.round(x), Math.round(y)); if (ang) g.rotate(-ang * Math.PI / 180); g.scale(sx, sy); g.globalAlpha = alpha;
    g.drawImage(img, -ox, -oy); if (white > 0) { g.globalAlpha = alpha * Math.min(1, white); g.drawImage(whiteOf(img), -ox, -oy); }
    g.restore();
  }
  function drawEntities(g, cam, extra) {
    const list = W.inst.filter(i => i.alive).map(i => ({ i, depth: i.depth })).concat(extra.map(o => ({ o, depth: o.depth })));
    for (const c of W.inst) if (c.alive && (c.kind === 'player' || c.kind === 'enemy' || c.kind === 'coin')) drawShadow(g, c.x + (c.kind === 'player' ? 5 * c.sidex : 0), c.y, c.kind === 'player' ? 22 : (c.shadow_length || 16) * .5, c.kind === 'enemy' ? c.shadow_alpha : c.kind === 'coin' ? c.shadow_alpha : 1);
    list.sort((a, b) => b.depth - a.depth);
    for (const it of list) { if (it.o) { it.o.draw(g); continue; } drawInst(g, it.i); }
    for (const v of W.vfx) drawVfx(g, v);
    for (const t of W.texts) drawText(g, t);
  }
  function drawInst(g, e) {
    switch (e.kind) {
      case 'player': {
        if (e.state === 'entrance' && e.delay_entrance > 0) return;
        const F = A.ratFrames(e.ckey), arr = F[e.sprite] || F.idle, fr = arr[Math.min(arr.length - 1, Math.floor(e.anim || 0))];
        const flick = e.delay_invulnerable > 0 && Math.floor(W.frame / 4) % 2 === 0;
        drawSpriteAt(g, fr, 28, 45, e.x, e.y + e.z, e.imagexscale * e.springxscale * e.sidex, e.imageyscale * e.springyscale, 0, flick ? .55 : 1, e.delay_white > 0 ? e.delay_white / e.timer_white : 0);
        if (e.state === 'entrance') drawSpriteAt(g, A.sprite('helmet'), 15, 14, e.x + 2 * e.sidex, e.y + e.z - 22, e.imagexscale, e.imageyscale, 0, 1, 0);
        break; }
      case 'weapon': {
        const P = e.player; if (!P || P.state === 'dead' || P.state === 'entrance') return;
        const s = A.weaponSprite(weaponArt(e.wkind)), sp = GM.spr(e.sprite_index) || [17, 8, 5, 4];
        const flip = (e.dir > 90 && e.dir < 270) ? -1 : 1, ang = e.dir + e.offset_angle * flip + e.twitch_angle;
        drawSpriteAt(g, s, sp[2], sp[3], e.x, e.y + P.z, e.imagexscale, e.imageyscale * flip, ang, 1, 0);
        if (e.state === 'reload') { const w = 10; g.fillStyle = '#2b2140'; g.fillRect(Math.round(P.x - w / 2), Math.round(P.y + P.z - 38), w, 3); g.fillStyle = '#ffd25c'; g.fillRect(Math.round(P.x - w / 2), Math.round(P.y + P.z - 38), Math.round(w * e.reload_progress), 3); }
        break; }
      case 'enemy': {
        const F = A.enemyFrames(e.etype), sp = GM.spr(e.sprite_index), hurt = e.sprite_index.endsWith('hurt');
        const img = hurt ? F.hurt[Math.min(3, Math.floor(e.image_index))] : F.move[0];
        drawSpriteAt(g, img, sp[2], sp[3], e.x, e.y + e.z, e.imagexscale * e.springxscale * (e.sidex || 1), e.imageyscale * e.springyscale, e.image_angle, e.image_alpha, e.delay_white > 0 ? e.delay_white / e.timer_white : 0);
        const tint = e.is_stunned ? '#6500c6' : e.is_poisoned && e.is_cursed ? '#11a6b4' : e.is_poisoned ? '#57c52b' : e.is_cursed ? '#ab0000' : null;   // par_enemy_Step_1 L11–15
        if (tint) { g.save(); g.globalAlpha = .35 * e.image_alpha; g.globalCompositeOperation = 'source-atop'; g.restore(); drawDebuffIcons(g, e); }
        if (e.life < e.life_max && e.state !== 'dead') { const w = 16, x = Math.round(e.x - w / 2), y = Math.round(e.y + e.z - (sp[3] - (sp[5] || 0)) - 4); g.fillStyle = '#2b2140'; g.fillRect(x - 1, y - 1, w + 2, 4); g.fillStyle = '#ff4d56'; g.fillRect(x, y, Math.round(w * e.life / e.life_max), 2); }
        break; }
      case 'projectile': case 'arrow': {
        if (e.can_draw === false) return; const sp = GM.spr(e.sprite_index); if (!sp) return;
        const name = e.sprite_index.replace(/^s_/, ''), img = A.sprite(name);
        drawSpriteAt(g, img, sp[2], sp[3], e.x, e.y, 1, 1, e.image_angle, e.destroy ? 1 - e.lerp_out : 1, 0); break; }
      case 'coin': {
        const name = e.sprite_index.replace(/^s_/, ''), img = A.sprite(name);
        drawSpriteAt(g, img, 8, 10, e.x, e.y + e.z, e.imagexscale, e.imageyscale, 0, 1, e.delay_white > 0 ? .6 * e.delay_white / e.timer_white : 0); break; }
      case 'star':
        drawSpriteAt(g, A.sprite('star_ally'), 10, 9, e.x, e.y, e.imagexscale, e.imageyscale, 0, 1, e.delay_white > 0 ? e.delay_white / e.timer_white : 0); break;
      case 'explosion': drawExplosion(g, e); break;
      case 'lightning': drawLightning(g, e); break;
    }
  }
  function weaponArt(k) { return { single: 'single', bigger: 'bigger', shotgun: 'shotgun', dual: 'dual', dual_op: 'op_dual', quad: 'quad', triple: 'triple', triple_op: 'triangle', single_op: 'op_single' }[k] || 'single'; }
  function drawDebuffIcons(g, e) {
    const icons = []; if (e.is_poisoned) icons.push('poison_debuff'); if (e.is_cursed) icons.push('curse_debuff'); if (e.is_stunned) icons.push('stun_debuff');
    icons.forEach((n, i) => g.drawImage(A.sprite(n), Math.round(e.x - icons.length * 7 + i * 14), Math.round(e.y + e.z - 30)));
  }
  function drawExplosion(g, e) {   // 원판 → 고리 (create_explosion_sprite)
    const k = Math.min(C.HOLE.length - 1, Math.floor(e.frame)), r = e.radius, hole = C.HOLE[k] * r;
    g.save(); g.globalAlpha = e.image_alpha * (e.destroy ? 1 - e.lerp_out : 1); g.fillStyle = typeof e.color === 'number' ? bgr(e.color) : '#ffffff';
    g.beginPath(); g.arc(e.x, e.y, r, 0, Math.PI * 2); if (hole > 0) g.arc(e.x, e.y, hole, 0, Math.PI * 2, true); g.fill('evenodd'); g.restore();
  }
  function drawLightning(g, e) {   // s_lightning_vfx 55×256 원점(27,256), 15프레임 — 직접 그린 번개
    const n = 15, f = e.image_index / n, a = e.destroy ? 1 - e.lerp_out : 1;
    if (f > .85) return;
    g.save(); g.globalAlpha = a * (1 - f); g.strokeStyle = '#7df2cf'; g.lineWidth = 3; g.lineJoin = 'round';
    let x = e.x, y = e.y - 200; g.beginPath(); g.moveTo(x, y);
    const seed = e.id * 7; for (let i = 1; i <= 8; i++) { x = e.x + Math.sin(seed + i * 2.3) * 8 * (1 - i / 8); y = e.y - 200 + i * 25; g.lineTo(x, y); }
    g.stroke(); g.strokeStyle = '#ffffff'; g.lineWidth = 1; g.stroke();
    g.fillStyle = '#ffffff'; g.beginPath(); g.ellipse(e.x, e.y, 10 * (1 - f), 4 * (1 - f), 0, 0, Math.PI * 2); g.fill();
    g.restore();
  }
  function drawVfx(g, v) {   // 장식 효과: 원작 vfx 스프라이트 이름별로 직접 그림 (진행도 = image_index / 프레임수)
    const sp = GM.spr(v.sprite_index), n = sp ? sp[8] : 6, f = v.image_index / n;
    g.save(); g.translate(Math.round(v.x), Math.round(v.y)); g.rotate(-(v.image_angle || 0) * Math.PI / 180);
    const nm = v.sprite_index;
    if (nm.startsWith('s_hit_vfx')) { g.globalAlpha = 1 - f; g.fillStyle = '#fff'; for (let i = 0; i < 4; i++) { g.rotate(Math.PI / 2); g.fillRect(4 + f * 6, -1, 5 * (1 - f), 2); } }
    else if (nm === 's_gun_shot_vfx_01') { g.globalAlpha = 1 - f; g.fillStyle = '#fff3a8'; g.beginPath(); g.ellipse(6, 0, 7 * (1 - f), 4 * (1 - f), 0, 0, Math.PI * 2); g.fill(); }
    else if (nm === 's_gun_shot_impact') { g.globalAlpha = 1 - f; g.fillStyle = '#ffffff'; g.beginPath(); g.arc(0, 0, 4 * (1 - f) + 1, 0, Math.PI * 2); g.fill(); }
    else if (nm === 's_projectile_explosion') { g.globalAlpha = 1 - f; g.strokeStyle = '#ffe36b'; g.lineWidth = 2; g.beginPath(); g.arc(0, 0, 2 + f * 7, 0, Math.PI * 2); g.stroke(); }
    else if (nm === 's_regular_explosion' || nm === 's_enemy_death_explosion') { g.globalAlpha = 1 - f; g.fillStyle = f < .3 ? '#ffffff' : '#ffd25c'; for (let i = 0; i < 6; i++) { const a = i * Math.PI / 3 + v.x; g.beginPath(); g.arc(Math.cos(a) * f * 12, Math.sin(a) * f * 12 - 6, 4 * (1 - f) + 1, 0, Math.PI * 2); g.fill(); } }
    else if (nm === 's_smoke') { g.globalAlpha = .6 * (1 - f); g.fillStyle = '#e8e2f4'; g.beginPath(); g.arc(0, -f * 3, 2 + 2 * (1 - f), 0, Math.PI * 2); g.fill(); }
    else if (nm === 's_bite_vfx') { g.globalAlpha = 1 - f; g.fillStyle = '#ffffff'; const o = 6 * (1 - Math.min(1, f * 2)); for (let i = -1; i <= 1; i++) { g.beginPath(); g.moveTo(i * 4 - 2, -o - 4); g.lineTo(i * 4 + 2, -o - 4); g.lineTo(i * 4, -o); g.fill(); g.beginPath(); g.moveTo(i * 4 - 2, o + 4); g.lineTo(i * 4 + 2, o + 4); g.lineTo(i * 4, o); g.fill(); } }
    g.restore();
  }
  function drawText(g, t) {
    const a = t.age > t.life - 10 ? (t.life - t.age) / 10 : 1;
    g.save(); g.translate(Math.round(t.x), Math.round(t.y)); g.scale(t.scale * .5, t.scale * .5);
    const s = t.label || (Math.round(t.value * 10) / 10).toString();
    UI.textOutline(g, 0, 0, s, 12, t.color, '#1d1630', a); g.restore();
  }

  // ---- 플레이어 HUD (par_player_Draw_74; ui_flow.md §2.6) ---------------------------------------
  function drawPlayerHUD(g, u, Wd, Ht, t, L) {
    const P = W.player; if (!P) return; const a = L ? L.lerp_ui : 1, gy = L ? L.game_ui_y : Ht - 20 * u, gx = Math.floor(Wd / 2 / u) * u;
    const hy = gy - 13 * u;                                                                 // L7–8
    const hw = 26 * u, gap = 2 * u, pad = 10 * u, n = P.hearts.length, total = hw * n + gap * (n - 1) + pad, x0 = gx - total / 2;   // L24–29
    g.globalAlpha = a;
    if (n) { g.fillStyle = 'rgba(29,22,48,.85)'; g.beginPath(); g.roundRect(x0, hy - 8 * u, total, 16 * u, 6 * u); g.fill(); }   // s_health_bg
    P.hearts.forEach((h, i) => {
      const x = x0 + pad / 2 + hw / 2 + (hw + gap) * i, w = dcos(t / 4 + 40 * i), y = hy + (-2 - w) * u * .5;
      g.save(); g.translate(x, y); g.rotate(-h.angle * Math.PI / 180); g.scale(u * h.xscl, u * h.yscl);
      g.drawImage(A.sprite('heart_bg'), -13, -11);
      const frac = h.health_amount / 2;
      if (frac > 0) g.drawImage(A.sprite(frac >= 1 ? (P.metal_heart ? 'heart_metal' : 'heart_full') : 'heart_half'), -13, -11);
      if (h.delay_white > 0) { g.globalAlpha = a * Math.min(1, h.delay_white / h.timer_white); g.drawImage(whiteOf(A.sprite('heart_bg')), -13, -11); }
      if (h.delay_red > 0) { g.globalAlpha = a * Math.min(1, h.delay_red / h.timer_white) * .6; g.fillStyle = '#d12831'; g.fillRect(-12, -10, 24, 20); }
      g.restore(); g.globalAlpha = a;
    });
    // 치즈 수 (collectables 목록; L106–178)
    P.coins_shown = lerp(P.coins_shown, G.SAVE.coins, .25);
    const cy = gy + 2 * u + 16 * u * (W.g.in_combat ? 1 : 0) - (W.g.in_combat ? 0 : 0);
    if (!W.g.in_combat || true) {
      const cx2 = 14 * u, cy2 = W.g.in_combat ? 14 * u : 14 * u;
      g.save(); g.translate(cx2, cy2); g.scale(u, u); g.drawImage(A.sprite('coin_ui'), -8, -9); g.restore();
      UI.textOutline(g, cx2 + 10 * u, cy2, String(Math.round(P.coins_shown)), 10 * u, '#fff8d8', '#1d1630', a, 'left');
    }
    // 탄약 (L186–276): 오른쪽 아래, 열은 왼쪽으로 행은 위로
    const w = P.my_weapon;
    if (w && w.final_bullet_number) {
      const shown = Math.min(w.final_bullet_number, 60), perCol = Math.min(shown, 20), cols = Math.ceil(shown / perCol), aw = 18, ah = 13, ex = 2, ey = 2;
      const gridW = aw * cols + ex * (cols - 1), gridH = ah * perCol + ey * (perCol - 1);
      const ax = Wd - 12 * u + 64 * u * (1 - a), ay = gy + 8 * u - gridH * u;                // L208–209
      const bulletScale = Math.min(1, (Ht * .55) / (gridH * u));
      for (let i = 0; i < shown; i++) {
        const col = Math.floor(i / perCol), row = i % perCol, full = i < w.current_bullet_number;
        const bx = ax + u * (-(aw + ex) * col - aw / 2), by = ay + u * (-(ah + ey) * row * bulletScale - ah / 2 + gridH) * 1;
        if (by < 30 * u) continue;
        g.save(); g.translate(bx, by); g.scale(u, u); g.drawImage(A.sprite(full ? 'bullet_ui' : 'bullet_ui_empty'), -9, -6); g.restore();
      }
      const txt = `${String(Math.max(0, w.current_bullet_number)).padStart(2, '0')}/${String(w.final_bullet_number).padStart(2, '0')}`;
      UI.textOutline(g, ax - gridW * u / 2 + u, Math.max(40 * u, ay - 8 * u), txt, 9 * u, w.state === 'reload' ? '#ffd25c' : '#ffffff', '#1d1630', a);   // L215–231
    }
    g.globalAlpha = 1;
  }

  window.RatsActors = { spawnPlayer, spawnEnemy, enemy_position_to_spawn, clear_enemies, drawEntities, drawPlayerHUD, bgr, ETYPE, setWorldBlocked: f => { worldBlocked = f; }, move_within_circle };
})();
