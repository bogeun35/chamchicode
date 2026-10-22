// 로켓 쥐 — 전투: 월드/인스턴스 틀, 무기·탄·피해·디버프·폭발·번개·화살·별 아군.
// 원작(GameMaker YYC) 코드를 옮긴 것. 주석의 "파일 // Lnn" 은 원작 GML 줄 번호
// (game-re-tools/rocketrats/notes/*.md 에 근거 정리). 숫자를 지어내지 않는다.
(function () {
  'use strict';
  const { dcos, dsin, lerp, clamp, sign, point_direction, point_distance, angle_difference, lerp_dir, angular_offset,
    random, random_range, irandom, irandom_range, choose, get_chance, overlap, advanceImage, image_number } = GM;
  const S = n => window.RatsSound && RatsSound.play(n);

  // ---- 월드 ----------------------------------------------------------------------------------
  const W = {
    inst: [], nextId: 1, frame: 0, player: null,
    g: {}, vfx: [], texts: [], shakes: [],
  };
  function resetWorld() {
    W.inst = []; W.nextId = 1; W.frame = 0; W.player = null; W.vfx = []; W.texts = []; W.shakes = [];
    W.g = {
      pause: false, game_speed: 1, game_state: 'start', wave_index: 0, in_combat: false,
      circle_x: 0, circle_y: 0, circle_range: 0, circle_range_goal: 110,
      aberration: 0, base_curse_damage: 999,                         // scr_debuffs // L82
      hurt_delay_sound: 0, curse_delay_sound: 0, lightning_delay_sound: 0, explosion_delay_sound: 0, arrow_delay_sound: 0,
      room_width: 960, room_height: 640, enemy_slow_increase: 0,
    };
  }
  resetWorld();
  function create(kind, x, y, depth, props) {
    const i = Object.assign({ id: W.nextId++, kind, x, y, depth: depth || 0, xstart: x, ystart: y, sprite_index: null, image_index: 0, image_speed: 1,
      image_angle: 0, image_xscale: 1, image_yscale: 1, image_alpha: 1, alive: true }, props || {});
    W.inst.push(i);
    const K = KINDS[kind]; if (K && K.create) K.create(i);
    return i;
  }
  function destroy(i) { if (!i.alive) return; i.alive = false; const K = KINDS[i.kind]; if (K && K.destroy) K.destroy(i); }
  const KINDS = {};
  function all(pred) { return W.inst.filter(i => i.alive && pred(i)); }
  function count(kind) { let n = 0; for (const i of W.inst) if (i.alive && i.kind === kind) n++; return n; }
  const enemies = () => W.inst.filter(i => i.alive && i.type === 1);
  function stepWorld() {
    W.frame++;
    const list = W.inst.slice();
    for (const i of list) if (i.alive) { const K = KINDS[i.kind]; if (K && K.beginStep) K.beginStep(i); }
    for (const i of list) if (i.alive) { const K = KINDS[i.kind]; if (K && K.step) K.step(i); }
    for (const i of list) if (i.alive) { const K = KINDS[i.kind]; if (K && K.endStep) K.endStep(i); }
    for (const i of W.inst) if (i.alive && !W.g.pause && i.sprite_index) advanceImage(i);
    W.inst = W.inst.filter(i => i.alive);
    stepVfx();
  }

  // ---- 화면 흔들림 (scr_camera screen_shake L163–169, o_camera_Step_0 L2–41) ----------------------
  function screen_shake(offset, decrease, dir = -1) { W.shakes.push({ offset, decrease, dir }); }
  // ---- 장식 효과: 스프라이트 vfx 와 피해 숫자 ------------------------------------------------------
  function vfx(sprite, x, y, depth, props) { const v = Object.assign({ sprite_index: sprite, x, y, depth, image_index: 0, image_speed: 1, image_angle: 0, image_xscale: 1, image_yscale: 1, image_alpha: 1 }, props || {}); W.vfx.push(v); return v; }
  function stepVfx() {
    if (W.g.pause) return;
    for (const v of W.vfx) { advanceImage(v); if (v._animEnd) v.done = true; if (v.vel) { v.x += dcos(v.dir) * v.vel; v.y -= dsin(v.dir) * v.vel; v.vel *= .9; } }
    W.vfx = W.vfx.filter(v => !v.done);
    for (const t of W.texts) { t.age++; t.x += dcos(t.dir) * t.vel; t.y -= dsin(t.dir) * t.vel; t.vel = lerp(t.vel, 0, .12); if (t.age > t.life) t.done = true; t.scale = lerp(t.scale, 1, .2); }
    W.texts = W.texts.filter(t => !t.done);
  }
  // create_text_vfx (scr_damage, 장식): 최대 30개(L158), 같은 적의 직전 숫자에 합침(L113–125)
  function create_text_vfx(ent, value, side, color, isCrit, last) {
    if (last && !last.done && last.age < 16) { last.value += value; last.scale = 1.4 + .8 * isCrit; last.age = 0; return last; }
    if (W.texts.length > 29) return null;
    const t = { x: (ent.bbl + ent.bbr) / 2 || ent.x, y: ent.y - 20, value, color, crit: isCrit, scale: 1.4 + .8 * isCrit, age: 0, life: 40,
      dir: 90 + random_range(0, 80) * -side, vel: random_range(0, 3.5) + .5 * isCrit };   // L143–144
    W.texts.push(t); return t;
  }

  // ---- 판정 도우미 ------------------------------------------------------------------------------
  function bboxCenter(i) { const b = GM.bboxOf(i); return b ? [(b.l + b.r) / 2, (b.t + b.b) / 2] : [i.x, i.y]; }
  // 엔티티(x, y+z) 와 탄 마스크 겹침 (par_projectile_Step_0 // L60: place_meeting(x, y + z, _id))
  const touches = (ent, shot) => overlap(ent, ent.x, ent.y + (ent.z || 0), shot);

  // ---- damage_info / damage_entity (scr_damage) -------------------------------------------------
  const damage_info = (type, projectile, entity, damage, is_critical) => ({ type, projectile, entity, damage, is_critical });
  function damage_entity(attacker, target, damage, knockback, dir, isCrit = false, doPoison = true, doCurse = true) {
    if (!target || !target.alive) return;
    let dodgeBonus = 0;                                                        // L31
    if (damage > 0) {                                                          // L33
      if (target.type === 1) {                                                 // L35 적
        target.life -= damage; target.life = Math.max(target.life, 0);         // L37–38
        if (doPoison && get_chance(attacker.final_bonus_poison_chance || 0)) apply_debuff(target, 0);   // L40–43
        if (doCurse && get_chance(attacker.final_bonus_curse_chance || 0)) apply_debuff(target, 1);     // L46–49
      } else if (attacker) {                                                   // L54 플레이어가 맞음
        if (attacker.is_cursed) dodgeBonus += target.final_bonus_curse_dodge_chance || 0;    // L56
        if (attacker.is_poisoned) dodgeBonus += target.final_bonus_poison_dodge_chance || 0; // L57
      }
      const kb = knockback * (1 - (target.knockback_resistance || 0));         // L61
      target.knockvelh += kb * dcos(dir); target.knockvelv += kb * -dsin(dir); // L62–63
      if (target.type !== 1) target.final_bonus_dodge_chance += dodgeBonus;    // L65
      target.when_hurt(target, damage, isCrit);                                // L67
      if (target.type !== 1) target.final_bonus_dodge_chance -= dodgeBonus;    // L69
      damage_vfx(target);                                                      // L71
    }
  }
  function damage_vfx(t) { const [cx, cy] = bboxCenter(t); vfx('s_hit_vfx_0' + (1 + irandom(3)), cx, cy, t.depth - 5, { image_angle: random(360) }); }
  function runCallbacks(list, info) { for (const f of list || []) f(info); }

  // ---- 디버프: 독(0)·저주(1)·기절(2) (scr_debuffs) -----------------------------------------------
  const DEBUFFS = [
    { // POISON ___struct___31
      create(e) { e.lerp_poison = 0; e.is_poisoned = false; e.poison_progress = 0; e.poison_color = 0x2bc557; e.base_poison_duration = 60; e.base_poison_damage_per_frame = 3; e.delay_damage_per_frame = 20; },   // L18–26
      apply(e) { e.is_poisoned = true; e.poison_progress = 1; },               // L31–32 (갱신, 중첩 없음)
      step(e) {
        const P = W.player;
        if (!e.is_poisoned) { e.lerp_poison = lerp(e.lerp_poison, 0, .3); return; }                 // L37, L71
        e.lerp_poison = lerp(e.lerp_poison, 1, .2 + .3 * e.lerp_poison);                             // L39
        const total = e.base_poison_duration * (1 + P.final_bonus_poison_duration);                 // L42
        if (e.poison_progress > 0) e.poison_progress -= 1 / total;                                    // L43
        const tick = Math.floor(e.delay_damage_per_frame / (1 + P.final_bonus_poison_speed));        // L46
        if (tick !== 0 && Math.floor(e.poison_progress * total) % tick === 0) {                      // L47
          const dmg = e.base_poison_damage_per_frame * (1 + P.final_bonus_poison_damage + P.final_bonus_all_damage) * (1 + e.damage_increase);   // L49
          e.life -= dmg; e.life = Math.max(e.life, 0);                                                // L51–52
          if (e.life <= 0) e.invulnerable = true;                                                      // L53
          const info = damage_info(0, -4, e, dmg, false);                                             // L60
          if (e.life <= 0) runCallbacks(P.when_kill, info);                                           // L62
          const t = create_text_vfx(e, dmg, sign((e.knockvelh || 0) + choose(-1, 1) * .001), '#d12831', false, null);   // L64 (0x3128d1 BGR)
          if (t) t.vel *= .5;                                                                          // L65
        }
        if (e.poison_progress <= 0) e.is_poisoned = false;                                            // L69
      },
    },
    { // CURSE ___struct___32
      create(e) { e.lerp_curse = 0; e.is_cursed = false; e.curse_progress = 0; e.curse_color = 118; e.base_curse_duration = 180; e.base_curse_damage = W.g.base_curse_damage; },   // L88–95
      apply(e) {
        if (e.is_cursed) return;                                               // L100
        e.is_cursed = true; e.curse_progress = 1;                              // L102–103
        const s = W.player.curse_stun_on_apply;                                // L105
        if (s > 0) { apply_debuff(e, 2); e.base_stun_duration = s; }           // L106–109
      },
      step(e) {
        const P = W.player;
        if (!e.is_cursed) { e.lerp_curse = lerp(e.lerp_curse, 0, .3); return; }                       // L116, L153
        e.lerp_curse = lerp(e.lerp_curse, 1, .2 + .3 * e.lerp_curse);                                  // L118
        if (e.curse_progress > 0) e.curse_progress -= (1 / e.base_curse_duration) * (1 + P.final_bonus_curse_speed);   // L121
        if (e.curse_progress > 0) return;                                                              // L124
        if (W.g.curse_delay_sound <= 0) { S('curse_trigger'); W.g.curse_delay_sound = 2; }             // L127–132
        const dmg = e.base_curse_damage * (1 + P.final_bonus_curse_damage + P.final_bonus_all_damage) * (1 + e.damage_increase);   // L135
        damage_entity(P, e, dmg, 0, 0, false, false, false);                                          // L136
        const info = damage_info(0, -4, e, dmg, false);                                               // L143
        if (e.life <= 0) runCallbacks(P.when_kill, info);                                             // L145
        vfx('s_bite_vfx', e.x, GM.bboxOf(e) ? GM.bboxOf(e).t - 4 : e.y - 20, e.depth - 5);            // L147–148
        e.is_cursed = false;                                                                           // L150
      },
    },
    { // STUN ___struct___33
      create(e) { e.lerp_stun = 0; e.is_stunned = false; e.stun_progress = 0; e.stun_color = 0xc60065; e.base_stun_duration = 1000; },   // L169–175
      apply(e) { if (!e.is_stunned) { e.is_stunned = true; e.stun_progress = 1; } },                    // L180–183
      step(e) {
        if (!e.is_stunned) { e.lerp_stun = lerp(e.lerp_stun, 0, .3); return; }                          // L189, L199
        e.lerp_stun = lerp(e.lerp_stun, 1, .2 + .3 * e.lerp_stun);                                      // L191
        if (e.stun_progress > 0) e.stun_progress -= 1 / e.base_stun_duration;                           // L194
        if (e.stun_progress <= 0) e.is_stunned = false;                                                  // L197
      },
    },
  ];
  function apply_debuff(target, index) { if (target && target.alive) DEBUFFS[index].apply(target); }

  // ---- 무기 (par_weapon + o_weapon_*) -----------------------------------------------------------
  // 무기 표: weapons_damage.md §1a. fire_rate/reload 는 스텝, damage 는 탄 1발.
  const WEAPON_DEF = {
    single:    { sprite: 's_weapon_single_shooter',   damage: 5,  knockback: 1,   projectile: 's_regular_projectile', speed: 10, fire_rate: 40, bullets: 8,  reload: 90,  spread: 18, spread_type: 0, shots: [1],   order: [[1, 'single']] },
    bigger:    { sprite: 's_weapon_bigger_shooter',   damage: 10, knockback: 1,   projectile: 's_big_projectile',     speed: 10, fire_rate: 30, bullets: 8,  reload: 90,  spread: 18, spread_type: 0, shots: [1],   order: [[1, 'bigger']] },
    shotgun:   { sprite: 's_weapon_shotgun_shooter',  damage: 4,  knockback: 1,   projectile: 's_regular_projectile', speed: 12, fire_rate: 32, bullets: 15, reload: 90,  spread: 9,  spread_type: 2, shots: [2, 4], order: [[1, 'shotgun']] },
    dual:      { sprite: 's_weapon_dual_shooter',     damage: 4,  knockback: 1,   projectile: 's_regular_projectile', speed: 10, fire_rate: 60, bullets: 12, reload: 90,  spread: 18, spread_type: 0, shots: [2],   order: [[1, 'dual0'], [1, 'dual1']] },
    dual_op:   { sprite: 's_weapon_op_dual_shooter',  damage: 4,  knockback: 1,   projectile: 's_regular_projectile', speed: 10, fire_rate: 60, bullets: 12, reload: 90,  spread: 18, spread_type: 0, shots: [4],   order: [[1, 'dualop0'], [1, 'dualop1']] },
    quad:      { sprite: 's_weapon_quad_shooter',     damage: 6,  knockback: 1,   projectile: 's_regular_projectile', speed: 10, fire_rate: 70, bullets: 24, reload: 120, spread: 18, spread_type: 0, shots: [4],   order: [[.5, 'quad0'], [1, 'quad1']] },
    triple:    { sprite: 's_weapon_triple_shooter',   damage: 2,  knockback: .5,  projectile: 's_regular_projectile', speed: 10, fire_rate: 60, bullets: 18, reload: 60,  spread: 18, spread_type: 0, shots: [3],   order: [[.8, 'triple0'], [1, 'triple1']] },
    triple_op: { sprite: 's_weapon_triangle_shooter', damage: 6,  knockback: 1,   projectile: 's_regular_projectile', speed: 10, fire_rate: 50, bullets: 30, reload: 60,  spread: 18, spread_type: 0, shots: [3],   order: [[1, 'tripleop']], auto_aim: false },
    single_op: { sprite: 's_weapon_op_single_shooter',damage: 3,  knockback: 1,   projectile: 's_regular_projectile', speed: 10, fire_rate: 20, bullets: 8,  reload: 40,  spread: 18, spread_type: 0, shots: [2],   order: [[1, 'singleop0'], [1, 'singleop1']] },
  };
  // 무기별 하위 공격 (weapons_damage.md §1c). this = 무기 인스턴스 w
  const SUB = {
    single(w, x, y, d) { S('weapon_shoot'); create_attack(w, x, y, d); attack_vfx(w, x, y, d); },
    bigger(w, x, y, d) { S('weapon_shoot'); attack_vfx(w, x, y, d); create_attack(w, x, y, d); },
    shotgun(w, x, y, d) { S('weapon_shotgun_shoot'); const saved = w.attack_number; w.attack_number += irandom_range(w.shots_number[0], w.shots_number[1]) - 1; attack_vfx(w, x, y, d); create_attack(w, x, y, d); w.attack_number = saved; },
    dual0(w, x, y, d) { attack_vfx(w, x, y, d); S('weapon_shoot'); const o = angular_offset(0, -4, d); create_attack(w, x + o[0], y + o[1], d); },
    dual1(w, x, y, d) { const o = angular_offset(0, 4, d); create_attack(w, x + o[0], y + o[1], d); },
    dualop0(w, x, y, d) { const o = angular_offset(0, -4, d); create_attack(w, x + o[0], y + o[1], d); create_attack(w, x - o[0], y - o[1], d); attack_vfx(w, x, y, d); },
    dualop1(w, x, y, d) { d += 180; const bx = x + dcos(d) * 2 * w.attack_len, by = y - dsin(d) * 2 * w.attack_len; attack_vfx(w, bx, by, d); const o = angular_offset(0, -4, d); create_attack(w, bx + o[0], by + o[1], d); create_attack(w, bx - o[0], by - o[1], d); S('weapon_shoot'); },
    quad0(w, x, y, d) { const o = angular_offset(0, -3, d); create_attack(w, x + o[0], y + o[1], d); create_attack(w, x - o[0], y - o[1], d); S('weapon_shoot'); attack_vfx(w, x, y, d); },
    quad1(w, x, y, d) { const b = angular_offset(-3, 0, d); x += b[0]; y += b[1]; attack_vfx(w, x, y, d); const o = angular_offset(0, -10, d); create_attack(w, x + o[0], y + o[1], d); create_attack(w, x - o[0], y - o[1], d); S('weapon_shoot'); },
    triple0(w, x, y, d) { const o = angular_offset(0, -5, d); S('weapon_shoot'); create_attack(w, x + o[0], y + o[1], d); create_attack(w, x - o[0], y - o[1], d); attack_vfx(w, x, y, d); },
    triple1(w, x, y, d) { S('weapon_shoot'); const o = angular_offset(4, 0, d); create_attack(w, x + o[0], y + o[1], d); attack_vfx(w, x + o[0], y + o[1], d); },
    tripleop(w, x, y, d) { const cx = x - dcos(d) * w.attack_len, cy = y + dsin(d) * w.attack_len; S('weapon_shoot'); let acc = 0; for (const st of [0, 140, 90]) { acc += st; const dd = d + acc, bx = cx + dcos(dd) * w.attack_len, by = cy - dsin(dd) * w.attack_len; attack_vfx(w, bx, by, dd); create_attack(w, bx, by, dd); } },
    singleop0(w, x, y, d) { attack_vfx(w, x, y, d); create_attack(w, x, y, d); },
    singleop1(w, x, y, d) { d += 180; const bx = x + dcos(d) * 2 * w.attack_len, by = y - dsin(d) * 2 * w.attack_len; create_attack(w, bx, by, d); attack_vfx(w, bx, by, d); S('weapon_shoot'); },
  };
  function attack_vfx(w, x, y, d) { vfx('s_gun_shot_vfx_01', x, y, w.depth - 1, { image_angle: d }); }
  KINDS.weapon = {
    create(w) {
      const D = WEAPON_DEF[w.wkind];
      Object.assign(w, { sprite_index: D.sprite, damage: D.damage, knockback: D.knockback, projectile: D.projectile, projectile_speed: D.speed,
        fire_rate: D.fire_rate, bullet_number: D.bullets, reload_time: D.reload, range: 200, spread_amount: D.spread, spread_type: D.spread_type,
        attack_number: 1, shots_number: D.shots, ammo_consumption: 0, auto_aim: D.auto_aim !== false, attack_len: 14, xoffset: 2, yoffset: -3,
        attack_order: D.order.map(([p, a]) => ({ fire_rate_progress: p, attack: a })),
        final_bullet_number: 0, current_bullet_number: 9999, step: true, just_created: true, state: 'idle', dir: 0, delay_fire_rate: 0,
        attack_index: 0, delay_reload_time: 0, reload_progress: 0, rotating_speed: 0, offset_angle: 0, twitch_angle: 0, twitch_angle_spd: 0,
        imagexscale: 1, imageyscale: 1, final_fire_rate: D.fire_rate, final_reload_time: D.reload, shots_at_once: 0 });
    },
    beginStep(w) {   // par_weapon_Step_1
      if (W.g.pause) return;
      w.just_created = false;                                                   // L4
      const P = w.player;
      w.final_fire_rate = Math.max(w.fire_rate / (1 + P.final_bonus_fire_rate), 1);          // L7
      w.final_reload_time = Math.round(Math.max(w.reload_time / (1 + P.final_bonus_reload_time), 1));   // L8–9
      const nb = Math.max(Math.round(w.bullet_number * (1 + P.final_bonus_ammo)), 1);          // L11
      if (nb !== w.final_bullet_number) { const diff = nb - w.final_bullet_number; w.final_bullet_number = nb; if (diff > 0) w.current_bullet_number += diff; if (w.current_bullet_number > nb) w.current_bullet_number = nb; }   // L12–18
    },
    step(w) {   // par_weapon_Step_0 (+ o_weapon_triple_op_shooter_Step_0)
      if (W.g.pause || w.just_created) return;
      const P = w.player, gs = W.g.game_speed;
      if (w.wkind === 'triple_op' && w.state === 'idle') { w.rotating_speed = lerp(w.rotating_speed, 1 + P.final_bonus_fire_rate, .2); w.dir += w.rotating_speed; if (w.dir >= 360) w.dir %= 360; }
      if (w.step) { w.current_bullet_number = w.final_bullet_number; w.step = false; }          // L26–30
      const side = P.sidex;
      w.x = P.x + (P.weapon_xoffset + w.xoffset) * side;                                         // L13
      w.y = P.y + P.weapon_yoffset + w.yoffset;                                                  // L14
      w.depth = P.depth - 5;
      w.imagexscale = lerp(w.imagexscale, 1, .2); w.imageyscale = lerp(w.imageyscale, 1, .2);
      w.offset_angle = lerp(w.offset_angle, 0, .06);
      w.twitch_angle_spd = lerp(w.twitch_angle_spd, -w.twitch_angle * .5, .15); w.twitch_angle += w.twitch_angle_spd;
      if (w.state === 'idle') idle(w, P, side, gs); else reload(w, gs);
    },
  };
  function idle(w, P, side, gs) {
    const noAmmo = !(w.current_bullet_number > 0);                                               // L52
    const oocReload = W.g.game_state !== 'combat' && w.current_bullet_number < w.final_bullet_number;   // L53
    let rest = true, canShoot = !w.auto_aim;                                                     // L55–57
    const rng = w.range * (1 + P.final_bonus_shot_range);                                        // L59
    const E = enemies();
    if (E.length && W.g.game_state === 'combat') {                                               // L62
      let target = null, best = 200000, priNp = P.prioritize_non_poisoned_enemies, priCu = P.prioritize_cursed_enemies, anyNp = false, anyCu = false;
      for (const e of E) if (!e.invulnerable && e.life > 0) { e.my_dis = point_distance(e.x, e.y, P.x, P.y); if (e.my_dis <= rng) { canShoot = true; if (!e.is_poisoned) anyNp = true; if (e.is_cursed) anyCu = true; } }   // L76–85
      if (!anyNp) priNp = false; if (!anyCu) priCu = false;                                      // L90–91
      for (const e of E) if (!e.invulnerable && e.life > 0 && e.my_dis < best) if ((!priCu && !priNp) || (priCu && e.is_cursed) || (priNp && !e.is_poisoned)) { target = e; best = e.my_dis; }   // L93–102
      if (target || !w.auto_aim) {                                                               // L109
        if (canShoot && w.current_bullet_number > 0) {                                           // L111
          rest = false;
          let aim;
          if (w.auto_aim) {
            const b = GM.bboxOf(target), tx = (b ? (b.l + b.r) / 2 : target.x) + (target.velh || 0), ty = (b ? (b.t + b.b) / 2 : target.y) + (target.velv || 0);   // L118–119
            aim = point_direction(w.x, w.y, tx, ty);                                                // L121
            const turn = Math.abs(angle_difference(w.dir, aim)) * .2 * (1 / 180) + .1;               // L123
            w.dir = lerp_dir(w.dir, aim, turn * gs);                                                // L125
            if (w.dir >= 360) w.dir %= 360; else if (w.dir < 0) w.dir += Math.ceil(Math.abs(w.dir) / 360) * 360;
          } else aim = w.dir;                                                                       // L129
          const progress = w.delay_fire_rate / w.final_fire_rate, n = w.attack_order.length;       // L131–132
          let attacked = false; w.shots_at_once = 0;
          while (w.attack_index < n) {                                                              // L138
            const a = w.attack_order[w.attack_index];
            if (progress < a.fire_rate_progress) break;                                              // L141
            const mx = w.x + dcos(aim) * w.attack_len, my = w.y - dsin(aim) * w.attack_len;          // L143–144
            attacked = true;
            screen_shake(1, .6); w.offset_angle += 60; w.imagexscale = .7; w.imageyscale = 1.4;      // L148 attack_effect
            SUB[a.attack](w, mx, my, aim);                                                           // L150
            w.attack_index++;
          }
          if (attacked && !P.ignore_ammo_consumption && w.ammo_consumption === 1) w.current_bullet_number -= 1;   // L164
          if (w.attack_index >= n && progress >= 1) { w.delay_fire_rate = 0; w.attack_index = 0; }  // L166–169
        }
      }
    }
    if (canShoot || noAmmo || oocReload) w.delay_fire_rate += w.delay_fire_rate < w.final_fire_rate ? 1 : 0;   // L176
    if (rest) w.dir = lerp_dir(w.dir, 90 + 90 * -side, .1);                                       // L178
    if ((noAmmo && w.delay_fire_rate >= w.final_fire_rate / 2) || oocReload) {                     // L181
      if (W.g.game_state !== 'end') { w.state = 'reload'; w.twitch_angle += 20; w.delay_reload_time = Math.floor(w.final_reload_time * (w.current_bullet_number / w.final_bullet_number)); }   // L183–188
    }
  }
  function reload(w, gs) {
    if (W.frame % 6 === 0) S('reloading_tick');                                                    // L198 (재장전 루프 소리)
    w.dir = lerp_dir(w.dir, 270, .2 * gs); if (w.dir >= 360) w.dir %= 360; else if (w.dir < 0) w.dir += 360;   // L200–202
    w.reload_progress = w.delay_reload_time / w.final_reload_time;                                 // L204
    if (w.delay_reload_time < w.final_reload_time) w.delay_reload_time += 1;                       // L206
    else { w.state = 'idle'; w.delay_reload_time = 0; w.delay_fire_rate = 0; w.attack_index = 0; S('reload_done'); }   // L209–214
    w.current_bullet_number = Math.floor(w.reload_progress * w.final_bullet_number);              // L217
  }
  // create_attack (anon@2699@par_weapon_Create_0)
  function create_attack(w, x, y, dir) {
    const P = w.player;
    runCallbacks(P.when_attack, { weapon: w, player: P });                                        // L143–150
    const spread = w.spread_amount * (1 + P.final_bonus_shot_spread);                             // L154
    let num = Math.floor(w.attack_number + P.final_bonus_shot_number);                            // L156
    if (w.ammo_consumption === 0 && !P.ignore_ammo_consumption) num = Math.min(num, w.current_bullet_number);   // L157
    for (let i = 0; i < num; i++) {
      let px = x, py = y, d = dir;
      const st = P.spread_type_override ?? w.spread_type;
      if (st === 0) { const total = spread * (num - 1), stepw = total / Math.max(num - 1, 1), off = -total / 2 + stepw * i; px = x + dcos(d - 90) * off; py = y - dsin(d - 90) * off; }   // L165–172
      else if (st === 1) { const total = spread * (num - 1), stepw = total / Math.max(num - 1, 1); d = dir - total / 2 + stepw * i; }   // L176–181
      else { const total = spread * (1 + (num - 1) * .65), c = choose(-1, 1); d = dir + random_range(0, total) * c; }   // L184–188
      create_projectile(P, w.projectile, w.damage, w.knockback, px, py, d, w.projectile_speed, 0, 180);   // L192
      if (w.ammo_consumption === 0 && !P.ignore_ammo_consumption) w.current_bullet_number -= 1;   // L193
      w.shots_at_once++;
    }
  }

  // ---- 탄 (par_projectile, create_projectile) ---------------------------------------------------
  function create_projectile(creator, sprite, damage, knockback, x, y, dir, vel, deacc, life, crit = 0) {
    const p = create('projectile', x, y, -y, { creator, sprite_index: sprite, image_angle: dir, damage, knockback, vel, deacceleration: deacc, life_time: life, critical_chance: crit, dir, knockback_dir: dir });
    return p;
  }
  KINDS.projectile = {
    create(p) {   // par_projectile_Create_0 기본값 (create_projectile 이 덮어씀)
      Object.assign(p, { type: 2, penetration: 1, deal_damage: true, do_apply_poison: true, do_apply_curse: true, can_critical: true, critical_damage_multiplier: 0,
        on_hit_effects: true, set_stats: true, bonus_penetration: 0, bonus_damage: 0, bonus_projectile_speed: 0, bonus_knockback: 0, bonus_critical_chance: 0,
        bonus_critical_damage: 0, ignore_collision: false, z: 0, destroy: false, damaged_entities: [], base_x: p.x, base_y: p.y, lerp_out: 0, can_draw: true });
      if (p.deacceleration === undefined) p.deacceleration = .12;
    },
    step(p) {   // par_projectile_Step_0
      if (W.g.pause) { p.image_speed = 0; return; }
      p.image_speed = W.g.game_speed;
      if (p.destroy && p.can_draw) p.can_draw = false;                                             // L10
      const C = p.creator;
      if (p.set_stats) {                                                                           // L12 calculate_final_stats (anon@918)
        p.damage_start = p.damage;
        if (p.type !== 7) p.penetration += C.final_bonus_projectile_penetration + p.bonus_penetration;   // L63
        p.damage *= 1 + C.final_bonus_damage + C.final_bonus_all_damage + p.bonus_damage;            // L64
        p.critical_chance += C.final_bonus_critical_chance + p.bonus_critical_chance;                // L65
        p.vel *= 1 + C.final_bonus_projectile_speed + p.bonus_projectile_speed;                      // L66
        p.critical_damage_multiplier += C.final_bonus_critical_damage + p.bonus_critical_damage;     // L68
        p.knockback *= 1 + C.final_bonus_knockback + p.bonus_knockback;                              // L70
        p.set_stats = false;
      }
      if (p.on_step) p.on_step(p);
      const canHit = !p.destroy && p.penetration > 0 && p.life_time > 0;                           // L26
      if (canHit) for (const e of W.inst) {                                                        // L43
        if (!e.alive || e.invulnerable || e.type !== 1 || e.state === 'dead') continue;           // L47
        if (p.damaged_entities.includes(e) || !touches(e, p)) continue;                           // L49–60
        const crit = get_chance(p.critical_chance) * (p.can_critical ? 1 : 0);                    // L62
        const dmg = p.damage * (1 + p.critical_damage_multiplier * crit) * (1 + e.damage_increase); // L63
        if (p.deal_damage) damage_entity(C, e, dmg, p.knockback, p.knockback_dir, !!crit, p.do_apply_poison, p.do_apply_curse);   // L65
        p.damaged_entities.push(e);                                                                // L67
        p.penetration -= e.projectile_life_damage;                                                 // L68
        if (p.when_hit) p.when_hit(p, e);                                                          // L70
        const info = damage_info(p.type, p, e, dmg, !!crit);                                       // L73
        if (p.on_hit_effects) runCallbacks(C.when_hit, info);                                      // L75
        if (e.life <= 0) runCallbacks(C.when_kill, info);                                          // L76
        if (crit) runCallbacks(C.when_critical, info);                                             // L77
        break;                                                                                     // L79
      }
      const b = GM.bboxOf(p);
      let out = b && (b.l > W.g.room_width || b.r < 0 || b.t > W.g.room_height || b.b < 0);       // L88
      if (!p.destroy) {
        const dx = p.vel * dcos(p.dir), dy = -p.vel * dsin(p.dir);                                 // L91–92
        if (!p.ignore_collision && collidesWorld(p, p.x, p.y)) out = true;                         // L94
        else { p.x += dx; p.y += dy; }
        p.base_x += dx; p.base_y += dy;                                                            // L101–102
        p.vel = lerp(p.vel, 0, p.deacceleration);                                                  // L104
        p.knockback_dir = p.dir;
      }
      if (p.position_end_step) p.position_end_step(p);                                             // L108
      p.depth = -W.g.room_height - p.y / W.g.room_height; p.image_angle = p.dir;                   // L112–113
      if (p.destroy) { const old = p.lerp_out; p.lerp_out = lerp(p.lerp_out, 1.1, .19); if (old >= 1) { destroy(p); return; } }   // L116–122
      const hitWall = out && !p.ignore_collision;                                                  // L126
      if (p.penetration > 0 && p.penetration < 1) p.penetration = get_chance(p.penetration * 100) ? 1 : 0;   // L127
      if (!p.destroy) {
        const lifeBefore = p.life_time; p.life_time--;
        if (p.penetration > 0 && lifeBefore > 0 && !hitWall) return;                               // L129
        p.destroy = true; if (p.when_destroied) p.when_destroied(p);                               // L140–141
        const o = angular_offset(p.light_xoffset || 0, p.light_yoffset || 0, p.image_angle);       // L123–130 death vfx
        vfx('s_projectile_explosion', p.x + o[0], p.y + o[1], p.depth, { image_angle: random(360), image_speed: random_range(.7, 1) });
      }
    },
  };
  // 벽(global.all_collisions): 경기장엔 없음. 대기실 정거장 충돌은 lobby 쪽에서 채움
  let collidesWorld = () => false;
  function setWorldCollision(fn) { collidesWorld = fn; }

  // ---- 폭발 (par_explosion, create_explosion, create_explosion_sprite) -------------------------
  // 반지름: scr_explosions L2–16 (독 48, 저주 48, 번개 40, 큰 번개 80, 별 24, 큰 별 50)
  const EXPLOSION_R = { poison: 48, curse: 48, lightning: 40, big_lightning: 80, star: 24, star_big: 50 };
  // 런타임 생성 스프라이트: 15프레임, 프레임 k 의 구멍 반지름 비율(create_explosion_sprite L285 반복 결과)
  const HOLE = [0, .275, .4472, .5666, .6546, .7222, .7758, .8191, .8548, .8847, .9099, .9315, .9501, .9662, .9803];
  function create_explosion(creator, kind, color, damage, knockback, x, y, crit = 0) {
    const r = EXPLOSION_R[kind];
    return create('explosion', x, y, -y, { creator, exKind: kind, radius: r, color, damage, knockback, critical_chance: crit, light_color: color, light_alpha: .3 });
  }
  KINDS.explosion = {
    create(e) { Object.assign(e, { type: 3, can_critical: true, critical_damage_multiplier: 0, on_hit_effects: true, do_apply_poison: true, do_apply_curse: true, destroy: false, lerp_out: 0, damaged_entities: [], frame: 0 }); },
    step(e) {   // par_explosion_Step_0
      if (W.g.pause) return;
      e.frame += W.g.game_speed * 1.8 * (30 / 60);   // L7: image_speed×1.8. 런타임 생성 스프라이트 속도 = CSprite 생성자(exe 0x14037c120) +0xc4 = 30.0f, +0xc8 = 0(초당 프레임)
      const C = e.creator, kb = e.knockback * C.final_bonus_knockback;                             // L32 (원작대로 1+ 없음)
      if (!e.destroy) for (const t of W.inst) {
        if (!t.alive || t.invulnerable || t.type !== 1 || t.state === 'dead' || e.damaged_entities.includes(t)) continue;
        if (!circleHits(e, t)) continue;                                                           // L52
        const crit = get_chance(e.critical_chance) * (e.can_critical ? 1 : 0);                     // L54
        const dmg = e.damage * (1 + C.final_bonus_critical_damage * crit) * (1 + t.damage_increase);   // L55
        damage_entity(C, t, dmg, kb, point_direction(t.x, t.y, e.x, e.y), !!crit, e.do_apply_poison, e.do_apply_curse);   // L57
        e.damaged_entities.push(t);
        if (e.when_hit) e.when_hit(e, t);                                                          // L61
        const info = damage_info(e.type, e, t, dmg, !!crit);
        if (e.on_hit_effects) runCallbacks(C.when_hit, info);                                      // L66
        if (t.life <= 0) runCallbacks(C.when_kill, info);                                          // L67
        if (crit) runCallbacks(C.when_critical, info);                                             // L68
      }
      if (e.destroy) { e.lerp_out = lerp(e.lerp_out, 1.1, .19); if (e.lerp_out >= 1) { destroy(e); return; } }   // L84–88
      const n = HOLE.length, fade = n - 6;                                                         // L92
      e.image_alpha = e.frame >= fade ? 1 - (e.frame - fade) / (n - fade) : 1;                     // L93–95
      if (!e.destroy && e.frame >= n - 1) e.destroy = true;                                        // L98–106
    },
  };
  function circleHits(e, t) {   // 원판/고리 프레임과 적 마스크(x, y+z) 겹침
    const b = GM.bboxOf(t, t.x, t.y + (t.z || 0)); if (!b) return false;
    const k = Math.min(HOLE.length - 1, Math.floor(e.frame)), R = e.radius, hole = HOLE[k] * R;
    const nx = clamp(e.x, b.l, b.r), ny = clamp(e.y, b.t, b.b);
    if (Math.hypot(nx - e.x, ny - e.y) > R) return false;
    const fx = Math.max(Math.abs(b.l - e.x), Math.abs(b.r - e.x)), fy = Math.max(Math.abs(b.t - e.y), Math.abs(b.b - e.y));
    return Math.hypot(fx, fy) >= hole;   // 사각형이 구멍 안에 완전히 들어가면 안 맞음
  }

  // ---- 번개 (create_lightning, o_lightning) -----------------------------------------------------
  function create_lightning(C) {
    if (count('lightning') > 40) return;                                                           // L228
    let target = null;
    if (!C.lightning_priority) {                                                                   // L234
      const list = enemies().filter(e => e.state !== 'dead' && e.can_trigger_lightning);
      if (list.length) target = list[irandom(list.length - 1)];                                     // L238
    } else { let best = -1; for (const e of enemies()) { const d = point_distance(e.x, e.y, C.x, C.y); if (e.state !== 'dead' && e.can_trigger_lightning && (best === -1 || best > d)) { target = e; best = d; } } }   // L242–253
    if (!target) return;
    create('lightning', target.x, target.y, target.depth + 5, { creator: C, enemy: target,
      can_critical: C.lightning_can_critical, damage: 3 * (1 + C.final_bonus_lightning_damage + C.final_bonus_summon_damage + C.final_bonus_all_damage),   // L262–263
      critical_chance: C.final_bonus_critical_chance, critical_damage: C.final_bonus_critical_damage, knockback: 2 });   // L264–266
    target.can_trigger_lightning = false;                                                          // L268
  }
  KINDS.lightning = {
    create(l) { Object.assign(l, { type: 4, lightning_aoe: W.player.lightning_aoe, delay_start: 1, has_damaged: false, on_hit_effects: true, destroy: false, lerp_out: 0, sprite_index: 's_lightning_vfx', imagexscale: choose(-1, 1) }); },
    step(l) {   // o_lightning_Step_0
      if (W.g.pause) { l.image_speed = 0; return; }
      l.image_speed = W.g.game_speed;
      if (l.delay_start-- > 0) { l.image_speed = 0; return; }                                       // L9–12
      const C = l.creator, kb = l.knockback * (1 + C.final_bonus_knockback);                       // L38
      const crit = get_chance(l.critical_chance) * (l.can_critical ? 1 : 0);                       // L40
      if (l.enemy && l.enemy.alive) { l.enemy.can_trigger_lightning = false; l.x = l.enemy.x; l.y = l.enemy.y; }   // L43–48
      if (!l.has_damaged && l.image_index >= 1) {                                                  // L51
        if (W.g.lightning_delay_sound <= 0) { S('lightning_summon'); W.g.lightning_delay_sound = 1; }   // L53–60
        if ((l.enemy && l.enemy.alive) || l.lightning_aoe) {
          if (!l.lightning_aoe) {
            const e = l.enemy;
            if (!e.invulnerable && e.state !== 'dead') {
              const dmg = l.damage * (1 + C.final_bonus_critical_damage * crit);                   // L71
              damage_entity(C, e, dmg, kb, random(360), !!crit, C.lightning_trigger_poison, C.lightning_trigger_curse);   // L73
              const info = damage_info(4, l, e, dmg, !!crit);
              if (l.on_hit_effects) runCallbacks(C.when_hit, info); if (e.life <= 0) runCallbacks(C.when_kill, info); if (crit) runCallbacks(C.when_critical, info);   // L78–80
            }
          } else {
            const ex = create_explosion(C, C.big_lightning_range ? 'big_lightning' : 'lightning', 13628029, l.damage, kb, l.x, l.y, crit * 100);   // L86–89
            ex.type = 5; ex.light_alpha = .25; ex.do_apply_poison = C.lightning_trigger_poison; ex.do_apply_curse = C.lightning_trigger_curse;   // L90–93
            if (W.g.explosion_delay_sound <= 0) { S('explosion'); W.g.explosion_delay_sound = 2; }
          }
          if (W.player.lightning_trigger_lightning && get_chance(W.player.final_bonus_lightning_chance)) create_lightning(W.player);   // L105–110
        }
        l.has_damaged = true;                                                                      // L114
        if (l.enemy && l.enemy.alive) l.enemy.can_trigger_lightning = true; l.enemy = null;        // L115–116
      }
      if (l.destroy) { l.lerp_out = lerp(l.lerp_out, 1.1, .19); if (l.lerp_out >= 1) { destroy(l); return; } }
      if (l.image_index >= image_number('s_lightning_vfx') - 1) { l.image_speed = 0; l.destroy = true; }   // L137–142
    },
  };

  // ---- 화살 (create_arrow, par_arrow) -----------------------------------------------------------
  function create_arrow(C, sub = 0, dir = -1, exclude = null) {
    if (count('arrow') > 99) return null;                                                          // L277
    const cx = C.x, cy = C.y; let target = null;
    if (dir === -1) {
      const list = enemies().filter(e => e !== exclude);
      if (list.length) target = list[irandom(list.length - 1)];                                     // L298
      dir = target ? point_direction(cx, cy, target.x, target.y - 5) : random(360);                 // L300–301
    }
    const a = create('arrow', cx, cy, C.depth - 5, { creator: C, sprite_index: sub > 0 ? 's_arrow_projectile_big' : 's_arrow_projectile', sub_arrows: sub,
      can_critical: C.arrow_can_critical, vel: 12, damage: 4 * (1 + C.final_bonus_damage + C.final_bonus_arrow_damage + C.final_bonus_summon_damage + C.final_bonus_all_damage),   // L310–311
      critical_chance: C.final_bonus_critical_chance, critical_damage: C.final_bonus_critical_damage, knockback: .5, enemy: target, dir, image_angle: dir, knockback_dir: dir });   // L312–320
    a.penetration += C.final_bonus_projectile_penetration;                                         // L316
    return a;
  }
  KINDS.arrow = {
    create(a) { Object.assign(a, { type: 6, penetration: 1, deacceleration: .005, do_play_sound: true, on_hit_effects: true, set_stats: true, ignore_collision: false, destroy: false, damaged_entities: [], lerp_out: 0, image_speed: 0 }); },
    step(a) {   // par_arrow_Step_0
      if (W.g.pause) return;
      const C = a.creator;
      if (a.set_stats) { a.penetration += C.final_bonus_arrow_penetration; a.vel *= 1 + C.final_bonus_projectile_speed; a.knockback *= 1 + C.final_bonus_knockback; a.set_stats = false; }   // L29–33
      if (a.do_play_sound) { if (W.g.arrow_delay_sound <= 0) { S('arrow_shoot'); W.g.arrow_delay_sound = 2; } a.do_play_sound = false; }   // L19–31
      let any = false;
      if (!a.destroy && a.penetration > 0) for (const e of W.inst) {                               // L39–62
        if (!e.alive || e.invulnerable || e.type !== 1 || e.state === 'dead' || a.damaged_entities.includes(e) || !touches(e, a)) continue;
        const crit = get_chance(a.critical_chance) * (a.can_critical ? 1 : 0);                     // L77
        const dmg = a.damage * (1 + a.critical_damage * crit) * (1 + e.damage_increase);           // L78
        damage_entity(C, e, dmg, a.knockback, a.knockback_dir, !!crit, C.arrows_trigger_poison, C.arrows_trigger_curse);   // L80
        a.damaged_entities.push(e); a.penetration -= e.projectile_life_damage; any = true;         // L82–84
        const info = damage_info(6, a, e, dmg, !!crit);
        if (a.on_hit_effects) runCallbacks(C.when_hit, info); if (e.life <= 0) runCallbacks(C.when_kill, info); if (crit) runCallbacks(C.when_critical, info);
      }
      if (any && a.sub_arrows > 0) {                                                               // L98
        let ang = a.dir + 180 - 180 / a.sub_arrows;                                                // L100
        for (let i = 0; i < a.sub_arrows; i++) {
          const na = create_arrow(W.player, 0, ang, null);                                         // L103–105
          if (na) { const n = a.damaged_entities.length; if (n > 0) na.damaged_entities.push(a.damaged_entities[n - 1]); na.x = a.x; na.y = a.y; }   // L106–112
          ang += 180 / (a.sub_arrows - 1);                                                         // L115
        }
      }
      const b = GM.bboxOf(a); let out = b && (b.l > W.g.room_width || b.r < 0 || b.t > W.g.room_height || b.b < 0);   // L121
      if (!a.destroy) {
        const hs = a.vel * dcos(a.dir), vs = a.vel * -dsin(a.dir);
        if (!a.ignore_collision && collidesWorld(a, a.x, a.y)) out = true; else { a.x += hs; a.y += vs; }
        a.vel = lerp(a.vel, 0, a.deacceleration); a.knockback_dir = a.dir;                         // L134–135
      }
      a.depth = -W.g.room_height - a.y / W.g.room_height; a.image_angle = a.dir;
      if (a.destroy) { a.lerp_out = lerp(a.lerp_out, 1.1, .19); if (a.lerp_out >= 1) { destroy(a); return; } }
      const wall = out && !a.ignore_collision;
      if (a.penetration > 0 && a.penetration < 1) a.penetration = get_chance(a.penetration * 100) ? 1 : 0;   // L154
      if (!a.destroy && (a.penetration <= 0 || wall)) { a.destroy = true; vfx('s_projectile_explosion', a.x, a.y, a.depth, { image_angle: random(360), image_speed: random_range(.7, 1) }); }   // L156, L185–187
    },
  };

  // ---- 별 아군 (par_star) -----------------------------------------------------------------------
  KINDS.star = {
    create(s) {   // par_star_Create_0
      const P = s.player;
      Object.assign(s, { sprite_index: 's_star_ally', instant_position: true, index: P.stars_n, spawn_effect: true, damage: 4, knockback: 1, imagexscale: 1.4, imageyscale: 1.4,
        timer_white: 12, delay_white: 24, dir: 0, dir_offset: 0, offset_base: 30, offset_angle: 0, projectile_speed: 8, attack_number: 1, has_attacked: false, delay_fire_rate: 0, final_fire_rate: 0 });
      P.stars_n++; P.stars.push(s);                                                                // L6–8
    },
    step(s) {   // par_star_Step_0
      if (W.g.pause) return;
      const P = s.player, n = P.stars_n;
      s.dir_offset = lerp(s.dir_offset, (360 / n) * s.index, Math.max(.2, s.instant_position ? 1 : 0));   // L6
      s.dir = (P.star_time / (1 + n * .1) + s.dir_offset) % 360;                                   // L7
      s.delay_fire_rate = P.star_delay_fire_rate; s.final_fire_rate = P.star_final_fire_rate / n * (s.index + 1);   // L9–10
      const r = s.offset_base - s.offset_angle;
      const tx = P.x + dcos(s.dir) * r + 10 * P.sidex, ty = P.y + (-dsin(s.dir) * r) * .5 - 7;    // L13–14
      s.instant_position = false; s.offset_angle = lerp(s.offset_angle, 0, .2); s.offset_base = lerp(s.offset_base, 32, .2);   // L16–19
      s.depth = -ty - 2; s.x = tx; s.y = ty;
      if (s.delay_white > 0) s.delay_white--;
      s.imagexscale = lerp(s.imagexscale, 1, .2); s.imageyscale = lerp(s.imageyscale, 1, .2);
      if (W.g.game_state !== 'combat') return;                                                     // L48
      if (s.delay_fire_rate / s.final_fire_rate >= 1 && !s.has_attacked) {                         // L50–51
        S('star_attack'); s.has_attacked = true;
        runCallbacks(P.when_star_attack, { player: P });                                           // L67–69
        screen_shake(1, .6); s.offset_angle += 5; s.imagexscale = .7; s.imageyscale = 1.4; s.delay_white = s.timer_white;   // attack_effect
        star_attack(s, s.x, s.y, s.dir);                                                           // L73
      }
    },
  };
  function star_attack(s, ax, ay, d) {   // anon@1580@par_star_Create_0
    const P = s.player;
    vfx('s_gun_shot_impact', ax, ay, s.depth - 1);
    const spread = 20 * (1 + P.final_bonus_shot_spread), shots = Math.floor(s.attack_number + P.final_bonus_star_shot);   // L87–89
    for (let i = 0; i < shots; i++) {
      const total = spread * (shots - 1), st = total / Math.max(shots - 1, 1), off = -total / 2 + st * i;
      const px = ax + dcos(d - 90) * off, py = ay - dsin(d - 90) * off;                            // L99–100
      const p = create_projectile(P, 's_star_projectile', s.damage, s.knockback, px, py, d, s.projectile_speed * (1 + P.final_bonus_star_speed), 0, 180);   // L102
      p.penetration += P.final_bonus_projectile_penetration;                                       // L103
      if (P.star_infinite_penetration) p.penetration = 10000;                                      // L104
      p.type = 7; p.light_alpha = .5;
      p.bonus_damage = P.final_bonus_star_damage + P.final_bonus_all_damage + P.final_bonus_damage;   // L108 (원작대로 두 번 더해짐)
      p.can_critical = P.stars_can_critical; p.star_explode_damage = P.star_explode_damage; p.time = 0;
      p.do_apply_poison = P.stars_trigger_poison; p.do_apply_curse = P.stars_trigger_curse;        // L113–114
      if (P.star_wave_shot) p.position_end_step = q => { const o = angular_offset(0, dcos(q.time - 90) * 32, q.dir); q.x = q.base_x + o[0]; q.y = q.base_y + o[1]; q.time += 10; };   // L116–124
      if (P.star_aoe_damage) { p.deal_damage = false; p.on_hit_effects = false; p.when_hit = q => { const e = create_explosion(q.creator, 'star', 0xf4e2ff, q.damage, q.knockback, q.x, q.y, q.critical_chance); e.type = 7; e.on_hit_effects = true; e.do_apply_poison = q.do_apply_poison; e.do_apply_curse = q.do_apply_curse; if (W.g.explosion_delay_sound <= 0) { S('explosion'); W.g.explosion_delay_sound = 2; } }; }   // L128–145
      if (P.star_explode_damage > 0) { p.life_time = 16; p.on_hit_effects = false; p.when_destroied = q => { const e = create_explosion(q.creator, 'star_big', 0xf4e2ff, q.damage_start, q.knockback, q.x, q.y, q.critical_chance); e.type = 7; e.on_hit_effects = true; e.damage = q.damage_start * (1 + q.creator.final_bonus_star_damage + q.creator.final_bonus_all_damage + q.star_explode_damage); e.do_apply_poison = q.do_apply_poison; e.do_apply_curse = q.do_apply_curse; if (W.g.explosion_delay_sound <= 0) { S('explosion'); W.g.explosion_delay_sound = 2; } }; }   // L150–168
    }
  }

  window.RatsCombat = { W, KINDS, resetWorld, create, destroy, all, count, enemies, stepWorld, screen_shake, vfx, create_text_vfx,
    damage_info, damage_entity, runCallbacks, DEBUFFS, apply_debuff, WEAPON_DEF, create_projectile, create_explosion, create_lightning,
    create_arrow, setWorldCollision, bboxCenter, touches, EXPLOSION_R, HOLE };
})();
