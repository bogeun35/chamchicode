// ════════════ 바위 밑바닥 — Rock Bottom(Steam, Godot 4.6 + C#) 원작 코드 그대로 ════════════
// 근거: game-re-tools/rockbottom/spec/*.md (Player.gd · WorldGenerator.gd · PlayerUpgrades.gd · TerrainManager IL · 씬 파일)
'use strict';
const $ = id => document.getElementById(id);
const D = window.RB_DATA, A = window.RBArt;
const clamp = (v, a, b) => v < a ? a : v > b ? b : v;
const lerp = (a, b, t) => a + (b - a) * t;
const rnd = (a, b) => a + Math.random() * (b - a);
const randi = (a, b) => a + Math.floor(Math.random() * (b - a + 1));
const TS = 16;
const fmt = n => { n = Math.floor(n); const a = Math.abs(n); if (a >= 1e9) return (n / 1e9).toFixed(2) + 'b'; if (a >= 1e6) return (n / 1e6).toFixed(2) + 'm'; if (a >= 1e5) return (n / 1e3).toFixed(2) + 'k'; return n.toLocaleString(); };   // HUD.format_number
const esc = s => String(s == null ? '' : s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
function toast(m, ms) { const t = $('toast'); t.textContent = m; t.classList.add('show'); clearTimeout(toast._t); toast._t = setTimeout(() => t.classList.remove('show'), ms || 2400); }

// ── 화폐 13종 (스킬트리 currency_type 순서) ──
const I = D.items;
const CUR = ['금 주괴', '돌', '코발트 주괴', '철 주괴', '토큰', '크리스탈 주괴', '용암 주괴', '바다 주괴', '공허 주괴', '우주 주괴', '일렉트럼 주괴', '강화강 주괴', '프리즘 주괴'];
const BAR_OF_LAYER = [0, 2, 3, 5, 6, 7, 8, 9];
const ORE_KEY = ['GOLD', 'COBALT', 'IRON', 'CRYSTAL', 'MOLTEN', 'SEA', 'VOID', 'COSMIC'];
// ── 지역 8곳 (SceneTransition: 요구 레벨 · 체력 배율, Elevator.LEVEL_DEPTHS) ──
const LAYERS = [0, 1, 2, 3, 4, 5, 6, 7].map(i => ({
  n: D.levels['LEVEL_' + i + '_NAME'], req: [1, 10, 20, 30, 40, 50, 60, 70][i], hp: [1, 4, 10, 16, 28, 45, 60, 150][i],
  depth: [[100, 600], [600, 1300], [1300, 1900], [1900, 2500], [2500, 3100], [3100, 3700], [3700, 4300], [4300, 5000]][i],
  ore: I['ITEM_' + ORE_KEY[i] + '_ORE'], chunk: I['ITEM_CHUNK_' + ORE_KEY[i]], freq: ['낮음', '보통', '높음', '매우 높음', '극한', '거대', '광기', '궁극'][i] }));
// ── 곡괭이 8등급 (PlayerUpgrades.PICKAXE_TIERS) ──
const PICK = [['WOODEN', 1, 1, 0, -1], ['GOLD', 1.15, 1.2, 3, 0], ['COBALT', 1.3, 1.4, 4, 1], ['IRON', 1.45, 1.6, 4, 2], ['CRYSTAL', 1.6, 1.8, 4, 3], ['MOLTEN', 1.75, 2.0, 5, 4], ['ABYSSAL', 1.9, 2.2, 5, 5], ['VOID', 2.05, 2.4, 5, 6]]
  .map(([k, sp, dm, cost, layer]) => ({ n: I['ITEM_PICKAXE_' + k], sp, dm, cost, layer }));
const LEVEL_XP = { 2: 50, 3: 100, 4: 170, 5: 260, 6: 380, 7: 540, 8: 750, 9: 1020, 10: 1500, 11: 2125, 12: 2906, 13: 3844, 14: 4938, 15: 6188, 16: 7594, 17: 9156, 18: 10875, 19: 12750, 20: 14781,
  21: 16531, 22: 18531, 23: 20781, 24: 23281, 25: 26156, 26: 29406, 27: 33031, 28: 37031, 29: 41406, 30: 46156, 31: 49000, 32: 55250, 33: 62125, 34: 69625, 35: 77750, 36: 86500, 37: 95875, 38: 104625, 39: 112125, 40: 119625,
  41: 140625, 42: 165125, 43: 191375, 44: 221125, 45: 254375, 46: 291125, 47: 333125, 48: 380375, 49: 432875, 50: 494125, 51: 564125, 52: 642875, 53: 730375, 54: 826625, 55: 940375, 56: 1062875, 57: 1202875, 58: 1360375, 59: 1535375, 60: 1736625,
  61: 1964125, 62: 2209125, 63: 2489125, 64: 2786625, 65: 3119125, 66: 3486625, 67: 3889125, 68: 4326625, 69: 4816625, 70: 5376625 };
const MAX_LEVEL = 70;
const SMELT_MULT = [1, 2.5, 25, 50, 100, 250, 500, 1000];   // Smelter.SMELT_TIME_MULTIPLIERS (기본 0.375초)
const RECIPES = [   // Foundry.RECIPES
  { id: 'electrum', out: 10, ing: [[0, 8], [2, 8], [3, 8]], t: 2.0 },
  { id: 'tempered_steel', out: 11, ing: [[5, 8], [6, 8], [7, 8]], t: 2.5 },
  { id: 'prismatic', out: 12, ing: [[9, 12], [8, 12], [11, 2]], t: 12.0 }];
const STAT_POOL = { mining_damage_bonus: [5, 25, '채광 피해'], mining_speed_bonus: [5, 25, '채광 속도'], crit_chance: [1, 10, '치명타 확률'], ore_yield_bonus: [5, 20, '광석 획득량'], energy_efficiency: [5, 20, '에너지 효율'],
  lightning_proc_chance: [5, 15, '번개 발동'], explosive_proc_chance: [5, 15, '폭발 발동'], pulse_wave_proc_chance: [5, 15, '펄스 웨이브 발동'], bouncing_ball_proc_chance: [5, 15, '튕기는 공 발동'] };   // ReforgeAnvil.STAT_POOL
// 드론 작업장 (DroneWorkshop.CATEGORIES · upgrades.json): [id, 화폐, base, inc, epl]
const DRONE_UP = {
  speed: [['drone_speed', 6, 25, 15, .1], ['drone_speed_2', 7, 40, 25, .15], ['drone_speed_3', 8, 60, 40, .2]],
  damage: [['drone_damage', 6, 25, 15, .2], ['drone_damage_2', 7, 40, 25, .3], ['drone_damage_3', 8, 60, 40, .5]],
  attack_speed: [['drone_attack_speed', 6, 25, 15, .1], ['drone_attack_speed_2', 7, 40, 25, .15], ['drone_attack_speed_3', 8, 60, 40, .2]],
  battery: [['drone_battery', 6, 25, 15, .15], ['drone_battery_2', 7, 40, 25, .2], ['drone_battery_3', 8, 60, 40, .3]],
  recharge: [['drone_recharge', 6, 25, 15, .15], ['drone_recharge_2', 7, 40, 25, .2], ['drone_recharge_3', 8, 60, 40, .25]],
  cargo: [['drone_cargo', 6, 50, 75, 0]] };

// ── 스킬트리 데이터 ──
const TREE = D.tree, TTREE = D.token, NODE = {};
for (const n of TREE.concat(TTREE)) NODE[n.id] = n;

// ════════════ 저장 ════════════
const SAVE_KEY = 'bottom_save_v2';
const fresh = () => ({ v: 2, cur: Array(13).fill(0), up: {}, gems: [0, 0, 0, 0, 0, 0, 0, 0], pick: 1, xp: 0, lvl: 1, inv: {},
  smelt: { in: {}, out: {}, t: Date.now(), timer: 0 }, fnd: { jobs: {}, out: {}, auto: [], t: Date.now() }, mast: { lv: 0, xp: 0 },
  refg: { slots: 0, stats: [] }, perfect: 0, quests: { done: [], prog: {} }, fl: { talked: 0, base2: 0, drone: 0, done: 0, runs: 0, entries: 0, firstReturn: 0, translated: 0, lastLevel: -1, seen: [0] },
  fed: { 10: 0, 11: 0, 12: 0 }, dstore: {}, base: 0, lastLayer: 0, savedAt: Date.now() });
let S = fresh();
function load() {
  try {
    const v = JSON.parse(localStorage.getItem(SAVE_KEY) || 'null');
    if (v && typeof v === 'object') { S = Object.assign(fresh(), v); S.fl = Object.assign(fresh().fl, v.fl || {}); S.smelt = Object.assign(fresh().smelt, v.smelt || {}); S.fnd = Object.assign(fresh().fnd, v.fnd || {}); return; }
    const o = JSON.parse(localStorage.getItem('bottom_save_v1') || 'null');   // 예전 판 진행도 옮기기
    if (o && typeof o === 'object') {
      if (Array.isArray(o.cur)) o.cur.forEach((x, i) => { if (i < 13) S.cur[i] = x | 0; });
      Object.assign(S.up, o.up || {}); if (Array.isArray(o.gems)) S.gems = o.gems.slice(0, 8).map(x => x | 0);
      S.pick = o.pick || 1; S.xp = o.xp || 0; S.lvl = o.lvl || 1;
      for (const k in (o.bag || {})) S.inv[k] = (S.inv[k] | 0) + (o.bag[k] | 0);
      for (const k in (o.smelt || {})) S.smelt.in[k] = (S.smelt.in[k] | 0) + (o.smelt[k] | 0);
      if (o.mastery && o.mastery.mining_speed) S.mast = { lv: o.mastery.mining_speed.lv | 0, xp: o.mastery.mining_speed.xp || 0 };
      S.fl.talked = 1; S.fl.entries = 2; S.fl.firstReturn = 1; S.quests.done = ['visit_skill_tree', 'purchase_pickaxe', 'descend_elevator', 'smelt_ore'];
    }
  } catch (e) { S = fresh(); }
}
function save() { try { S.savedAt = Date.now(); localStorage.setItem(SAVE_KEY, JSON.stringify(S)); } catch (e) {} }

// ════════════ 능력치 (PlayerUpgrades.gd 공식 그대로) ════════════
const lv = id => S.up[id] | 0;
const epl = (id, fb) => NODE[id] ? NODE[id].epl : fb;
const sumL = list => { let s = 0; for (const [id, fb] of list) s += lv(id) * epl(id, fb); return s; };
const sumLi = list => { let s = 0; for (const [id, fb] of list) s += lv(id) * Math.trunc(epl(id, fb)); return s; };
const pickStats = () => PICK[clamp(S.pick, 1, 8) - 1];
const refg = id => { let t = 0; for (const s of S.refg.stats) if (s.id === id) t += s.v; return t; };
const refMul = id => 1 + refg(id) / 100;
const mastMul = () => 1 + S.mast.lv * .01;   // 토큰 숙련: 활성 스탯(채광 속도)만 블록마다 저절로 자람
const tokProc = id => 1 + .1 * lv(id), tokDmg = id => 1 + .2 * lv(id);
let OC = 0;   // 오버클럭 남은 시간
const ST = {
  speed() {
    let m = 1 + sumL([['mining_speed', .05], ['mining_speed_2', .05], ['mining_speed_3', .075], ['mining_speed_4', .1], ['mining_speed_5', .15], ['mining_speed_6', .15], ['mining_speed_7', .175], ['mining_speed_8', .2], ['mining_speed_9', .25], ['mining_speed_10', .3]]);
    m *= pickStats().sp * refMul('mining_speed_bonus') * mastMul();
    if (OC > 0) m *= 1 + ST.ocEff();
    return m * (1 + .05 * lv('token_mining_speed') + .1 * lv('token_mining_speed_2'));
  },
  maxEnergy() { return Math.trunc(120 * (1 + sumL([['max_energy', .15], ['max_energy_2', .25], ['max_energy_3', .75], ['max_energy_4', 1.25], ['max_energy_5', 1.5], ['max_energy_6', 2], ['max_energy_7', 2.5], ['max_energy_8', 3]]))); },
  damage() {
    let m = 1 + sumL([['pickaxe_power', .2], ['pickaxe_power_2', .4], ['pickaxe_power_3', .6], ['pickaxe_power_4', .8], ['pickaxe_power_5', .5], ['pickaxe_power_6', .6], ['pickaxe_power_7', .7], ['pickaxe_power_8', .8]]);
    m *= pickStats().dm * refMul('mining_damage_bonus') * (1 + .1 * lv('token_damage') + .2 * lv('token_damage_2'));
    return Math.max(1, m);
  },
  smeltSpeed() { return 1 + sumL([['smelting_speed', .5], ['smelting_speed_2', 5], ['smelting_speed_3', 25], ['smelting_speed_4', 80], ['smelting_speed_5', 500], ['smelting_speed_6', 2500], ['smelting_speed_7', 1250], ['smelting_speed_8', 8000], ['smelting_speed_9', 3000], ['smelting_speed_10', 4000], ['smelting_speed_11', 5000], ['smelting_speed_12', 7500]]); },
  surge() { return OC > 0 ? 1 + sumL([['overclock_surge', .25], ['overclock_surge_2', .5]]) : 1; },
  oreYield(L) {
    const k = ['gold', 'cobalt', 'iron', 'crystal', 'molten', 'sea', 'void', 'cosmic'][L], big = L <= 2 ? [.2, .5, 1.25, 2, 6] : [.2, .5, 1.25];
    return (1 + sumL(big.map((fb, i) => [k + '_yield' + (i ? '_' + (i + 1) : ''), fb]))) * ST.surge();
  },
  stoneYield() { const fb = [.2, .3, .4, .5, .6, .7, 2.5, 3, 4, 5, 6, 7.5, 9, 11]; return (1 + sumL(fb.map((f, i) => ['stone_yield' + (i ? '_' + (i + 1) : ''), f]))) * ST.surge(); },
  lightChance() { return (sumL([['static_charge', .005], ['static_charge_2', .002], ['static_charge_3', .002], ['static_charge_4', .005], ['static_charge_5', .005], ['static_charge_6', .0075], ['static_charge_7', .01], ['static_charge_8', .0125], ['static_charge_9', .015], ['static_charge_10', .025]])
    + sumL(Array.from({ length: 10 }, (_, i) => ['static_surge' + (i ? '_' + (i + 1) : ''), .005]))) * tokProc('token_lightning_proc') * refMul('lightning_proc_chance'); },
  lightChains() { return 10 + sumLi([['chain_conductor', 1], ['chain_conductor_2', 1], ['chain_conductor_3', 2], ['chain_conductor_4', 2], ['chain_conductor_5', 2], ['chain_conductor_6', 4], ['chain_conductor_7', 3], ['chain_conductor_8', 4], ['chain_conductor_9', 5], ['chain_conductor_10', 6]]) + lv('tesla_coil') * 10; },
  lightDamage() { const b = 5 + sumLi([['voltage_spike', 3], ['voltage_spike_2', 4], ['voltage_spike_3', 5], ['voltage_spike_4', 7], ['voltage_spike_5', 8], ['voltage_spike_6', 9], ['voltage_spike_7', 10], ['voltage_spike_8', 12], ['voltage_spike_9', 13], ['voltage_spike_10', 14], ['tesla_coil', 140]]); return Math.trunc(b * tokDmg('token_lightning_damage')); },
  lightDouble() { return .5 * lv('token_lightning_double'); },
  laserChance() { return sumL([['pulse_wave', .0005], ['pulse_wave_2', .0005], ['pulse_wave_3', .0005], ['pulse_wave_4', .00025], ['pulse_wave_5', .000375], ['pulse_wave_6', .0005], ['pulse_wave_7', .000625], ['pulse_wave_8', .00075], ['pulse_wave_9', .001], ['pulse_wave_10', .00125]]) * tokProc('token_pulse_proc') * refMul('pulse_wave_proc_chance'); },
  laserDamage() { const d = 20 + sumLi([['wave_intensity', 7], ['wave_intensity_2', 22], ['wave_intensity_3', 110], ['wave_intensity_4', 55], ['wave_intensity_5', 75], ['wave_intensity_6', 100], ['wave_intensity_7', 137], ['wave_intensity_8', 187], ['wave_intensity_9', 250], ['wave_intensity_10', 375]]); return Math.trunc(d * tokDmg('token_pulse_damage')); },
  laserRange() { return 1 + sumL([['wave_range', .1], ['wave_range_2', .25], ['wave_range_3', .125], ['wave_range_4', .15], ['wave_range_5', .2], ['wave_range_6', .25], ['wave_range_7', .3], ['wave_range_8', .375], ['wave_range_9', .5], ['wave_range_10', .75]]); },
  laserWidth() { return 1 + sumL([['wave_spread', .25], ['wave_spread_2', .5], ['wave_spread_3', .25], ['wave_spread_4', .3], ['wave_spread_5', .375], ['wave_spread_6', .5], ['wave_spread_7', .625], ['wave_spread_8', .75], ['wave_spread_9', 1], ['wave_spread_10', 1.5]]); },
  laserRear() { return .5 * lv('token_pulse_rear'); },
  boomChance() { return sumL([['explosive_mining', .002], ['explosive_mining_2', .002], ['explosive_mining_3', .002], ['explosive_mining_4', .002], ['explosive_mining_5', .002], ['explosive_mining_6', .0005], ['explosive_mining_7', .00075], ['explosive_mining_8', .001], ['explosive_mining_9', .00125], ['explosive_mining_10', .00175]]) * tokProc('token_explosion_proc') * refMul('explosive_proc_chance'); },
  boomDamage() { const b = 48 + sumLi([['blast_force', 8], ['blast_force_2', 10], ['blast_force_3', 12], ['blast_force_4', 14], ['blast_force_5', 20], ['blast_force_6', 10], ['blast_force_7', 12], ['blast_force_8', 17], ['blast_force_9', 25], ['blast_force_10', 37]]); return Math.trunc(b * tokDmg('token_explosion_damage')); },
  boomSize() { let s = 3; if (lv('tactical_nuke')) s = 15; else for (let i = 10; i >= 1; i--) { const id = 'blast_radius' + (i > 1 ? '_' + i : ''); if (lv(id)) { s = Math.trunc(epl(id, 3 + 2 * i)); break; } } return s + 3 * lv('token_explosion_size'); },
  ballChance() { return sumL([['bouncing_ball', .01], ['bouncing_ball_2', .015], ['bouncing_ball_3', .02]]) * tokProc('token_ball_proc') * refMul('bouncing_ball_proc_chance'); },
  ballCount() { return 1 + lv('ball_count') + lv('ball_count_2') + lv('ball_count_3'); },
  ballBounces() { return 2 + lv('ball_bounces') + lv('ball_bounces_2') * Math.trunc(epl('ball_bounces_2', 1)) + lv('ball_bounces_3') * Math.trunc(epl('ball_bounces_3', 1)); },
  ballDamage() { return Math.trunc((30 + sumLi([['ball_damage', 7], ['ball_damage_2', 16], ['ball_damage_3', 30], ['bouncing_ball_evolved', 150]])) * tokDmg('token_ball_damage')); },
  critChance() { return Math.min(1, sumL([['critical_strike', .02], ['critical_strike_2', .04], ['critical_strike_3', .06], ['critical_strike_4', .08], ['critical_strike_5', .12]]) + refg('crit_chance') / 100); },
  critMult() { return 2 + sumL([['critical_power', .25], ['critical_power_2', .5], ['critical_power_3', .75], ['critical_power_4', 1], ['critical_power_5', 1.5]]); },
  multi() { return sumL([['multi_strike', .05], ['multi_strike_2', .1], ['multi_strike_3', .15], ['multi_strike_4', .2], ['multi_strike_5', .3]]); },
  doubleDrop() { return sumL([['fortune', .03], ['fortune_2', .06], ['fortune_3', .1], ['fortune_4', .15], ['fortune_5', .25]]); },
  efficiency() { return Math.min(1, sumL([['efficiency', .05], ['efficiency_2', .1], ['efficiency_3', .15], ['efficiency_4', .2], ['efficiency_5', .3]]) + refg('energy_efficiency') / 100); },
  ocChance() { return sumL([['overclocked', .002], ['overclocked_2', .003], ['overclocked_3', .004], ['overclocked_4', .005]]); },
  ocEff() { return .75 + sumL([['overclock_power', .15], ['overclock_power_2', .2], ['overclock_power_3', .25]]); },
  ocDur() { return 3 + sumL([['overclock_duration', .5], ['overclock_duration_2', .75], ['overclock_duration_3', 1]]); },
  range() { return 80 * (1 + (lv('increased_range') ? .25 : 0) + (lv('increased_range_2') ? .5 : 0)); },
  moveMult() { return 1 + lv('swift_feet') * epl('swift_feet', .15); },
  pickup() { return sumL([['magnetic_pull', 0], ['magnetic_pull_2', 0], ['magnetic_pull_3', 0], ['magnetic_pull_4', 0]]); },
  stoneOreChance() { return .00667 + sumL([['prospector_eye', .003], ['prospector_eye_2', .005]]); },
  stoneOreAmount() { return 1 + lv('mother_lode'); },
  stoneJackpot() { return lv('lucky_strike') * epl('lucky_strike', .12); },
  stoneTokenChance() { return .001 + sumL([['treasure_sense', .001], ['treasure_sense_2', .002]]); },
  stoneTokenDouble() { return lv('double_glint') * epl('double_glint', .2); },
  stoneOreToken() { return lv('prospectors_fortune') * epl('prospectors_fortune', .15); },
  stack() { return lv('deep_pockets_5') ? 5000 : lv('deep_pockets_4') ? 3000 : lv('deep_pockets_3') ? 1000 : lv('deep_pockets_2') ? 500 : lv('deep_pockets_1') ? 200 : 99; },
  slots() { return lv('bigger_bag_4') ? 20 : lv('bigger_bag_3') ? 16 : lv('bigger_bag_2') ? 8 : lv('bigger_bag_1') ? 4 : 2; },
  tokenBounty() { return lv('token_bounty') * Math.trunc(epl('token_bounty', 1)) + lv('token_bounty_2') * Math.trunc(epl('token_bounty_2', 2)) + lv('token_bounty_3') * Math.trunc(epl('token_bounty_3', 3)); },
  smeltSlots() { return lv('smelter_slots_2') ? Math.trunc(epl('smelter_slots_2', 16)) : lv('smelter_slots_1') ? Math.trunc(epl('smelter_slots_1', 12)) : 8; },
  smeltPer() { for (let i = 5; i >= 1; i--) if (lv('smelter_capacity_' + i)) return Math.trunc(epl('smelter_capacity_' + i, [0, 200, 500, 1000, 2500, 5000][i])); return 99; },
  doubleSmelt() { return lv('double_smelt') * epl('double_smelt', .05); }, doubleSmeltYield() { return lv('double_smelt_yield') * epl('double_smelt_yield', .2); },
  foundrySpeed() { return 1 + sumL([['foundry_speed', .25], ['foundry_speed_2', .5], ['foundry_speed_3', .75], ['foundry_speed_4', 1], ['foundry_speed_5', 8]]); },
  foundryCost() { return Math.max(.5, 1 - lv('foundry_efficiency') * epl('foundry_efficiency', .05)); },
  jetpack() { return lv('jetpack') > 0; }, freeJet() { return lv('endless_jetpack') > 0; },
  drone(k) { return 1 + DRONE_UP[k].reduce((s, [id, , , , e]) => s + lv(id) * e, 0); },
  cargo() { return [99, 250, 500, 1000, 2000, 3000][lv('drone_cargo')] || 99; },
};
// 레벨 · XP (get_xp_for_level: 10레벨까지 ×1.3, 그 뒤엔 +450)
function xpFor(L) { if (L <= 1) return 0; const b = LEVEL_XP[L]; if (b == null) return 1e15; if (L <= 10) return Math.round(b * 1.3); return b + Math.round(LEVEL_XP[10] * .3); }
function addXp(n) {
  if (S.lvl >= MAX_LEVEL) return; S.xp += n; let up = 0;
  while (S.lvl < MAX_LEVEL && S.xp >= xpFor(S.lvl + 1)) { S.lvl++; up++; }
  if (up) onLevelUp();
  hudXp();
}
function addMasteryXp(n) { if (S.mast.lv >= 99) return; S.mast.xp += n; let need = Math.round(10 * Math.pow(1.082, S.mast.lv)); while (S.mast.xp >= need && S.mast.lv < 99) { S.mast.xp -= need; S.mast.lv++; need = Math.round(10 * Math.pow(1.082, S.mast.lv)); } }
const chunksReq = L => L <= 0 ? 3 : L <= 3 ? 4 : 5;
const hasMaxChunks = L => S.gems[L] >= chunksReq(L) || S.pick >= L + 2 || (L === 7 && lv('universal_translator') > 0);
function layerUnlocked(L) { return L <= 0 || (S.lvl >= LAYERS[L].req && S.pick >= L + 1 && (L !== 4 || S.fl.base2)); }
const base2Unlocked = () => S.pick >= 5 && S.lvl >= 40;

// ════════════ 소리 (짧은 합성음 — 파티 사운드 볼륨을 따름) ════════════
let AC = null; const sfxLast = {};
function sfx(kind, opt = {}) {
  const vol = window.Sound ? Sound.sfxVolume : .7; if (!(vol > 0)) return;
  const now = performance.now(); if (now - (sfxLast[kind] || -1e9) < (opt.gap || 40)) return; sfxLast[kind] = now;
  try { AC = AC || new (window.AudioContext || window.webkitAudioContext)(); if (AC.state === 'suspended') AC.resume(); } catch (e) { return; }
  const t = AC.currentTime, g = AC.createGain(); g.gain.value = opt.v || 1; g.connect(AC.destination);
  const tone = (f0, f1, dur, type, v, dl = 0) => { const o = AC.createOscillator(); o.type = type || 'triangle'; o.frequency.setValueAtTime(f0, t + dl); if (f1) o.frequency.exponentialRampToValueAtTime(f1, t + dl + dur); const gg = AC.createGain(); gg.gain.setValueAtTime(v * vol, t + dl); gg.gain.exponentialRampToValueAtTime(.0001, t + dl + dur); o.connect(gg); gg.connect(g); o.start(t + dl); o.stop(t + dl + dur + .02); };
  const noise = (dur, f, v, dl = 0) => { const n = AC.sampleRate * dur | 0, b = AC.createBuffer(1, n, AC.sampleRate), d = b.getChannelData(0); for (let i = 0; i < n; i++) d[i] = (Math.random() * 2 - 1) * (1 - i / n); const s = AC.createBufferSource(); s.buffer = b; const fl = AC.createBiquadFilter(); fl.type = 'bandpass'; fl.frequency.value = f; const gg = AC.createGain(); gg.gain.value = v * vol; s.connect(fl); fl.connect(gg); gg.connect(g); s.start(t + dl); };
  const p = opt.pitch || 1;
  switch (kind) {
    case 'hit': noise(.07, 1100 * p, .55); tone(240 * p, 130 * p, .06, 'square', .05); break;   // Player.mine_block: 같은 블록을 칠수록 피치 +0.1
    case 'break': noise(.15, 650 * p, .7); tone(150 * p, 70, .12, 'triangle', .14); break;
    case 'crit': tone(1200, 1900, .1, 'square', .07); noise(.05, 3200, .3); break;
    case 'pick': tone(900 * p, 1350 * p, .07, 'triangle', .06); break;
    case 'zap': noise(.18, 4200, .35); tone(1600, 500, .16, 'sawtooth', .05); break;
    case 'boom': noise(.45, 170, .9); tone(90, 40, .35, 'sine', .3); break;
    case 'charge': tone(200, 900, .6, 'sine', .07); break;
    case 'wave': tone(300, 900, .3, 'sine', .12); break;
    case 'ball': tone(700 * p, 900 * p, .05, 'square', .04); break;
    case 'token': tone(1320 * p, 1320 * p, .06, 'square', .05); tone(1760 * p, 1760 * p, .08, 'square', .05, .06); break;
    case 'level': [523, 659, 784, 1047].forEach((f, i) => tone(f, f, .18, 'triangle', .14, i * .09)); break;
    case 'chunk': [784, 988, 1175, 1568].forEach((f, i) => tone(f, f, .2, 'triangle', .14, i * .07)); break;
    case 'jump': tone(380, 620, .1, 'sine', .07); break;
    case 'dash': noise(.12, 2200, .3); break;
    case 'jet': noise(.1, 500, .12); break;
    case 'buy': tone(660, 990, .12, 'triangle', .14); break;
    case 'tap': tone(880, 880, .05, 'triangle', .08); break;
    case 'no': tone(200, 150, .12, 'square', .07); break;
    case 'smelt': noise(.2, 400, .3); tone(500, 300, .15, 'triangle', .08); break;
    case 'lift': noise(.4, 300, .3); tone(110, 90, .4, 'sawtooth', .04); break;
    case 'clang': tone(1400, 1200, .2, 'square', .06); noise(.08, 3000, .3); break;
    case 'splash': noise(.3, 900, .4); break;
    case 'rumble': noise(1.2, 90, .6); break;
    case 'oc': tone(300, 1200, .25, 'sawtooth', .06); break;
  }
}
function sfxUnlock() { try { AC = AC || new (window.AudioContext || window.webkitAudioContext)(); if (AC.state === 'suspended') AC.resume(); } catch (e) {} }

// ════════════ 캔버스 · 입력 ════════════
const cv = $('cv'), ctx = cv.getContext('2d');
let VW = 0, VH = 0, DPR = 1, Z = 1.5, ZOOM = 1.5, camX = 0, camY = 0, shakeT = 0, shakeA = 0;
function resize() { DPR = Math.min(2, window.devicePixelRatio || 1); VW = innerWidth; VH = innerHeight; cv.width = Math.round(VW * DPR); cv.height = Math.round(VH * DPR); setZ(); if (typeof treeResize === 'function') treeResize(); }
// 원작: 화면 1280×720 기준 카메라 줌 1.5 (DynamicCamera: 휠로 1.0~2.5) → 월드 가로 853px ≈ 53칸
function setZ() { Z = Math.sqrt(VW * VH / (1280 * 720)) * ZOOM; }
addEventListener('resize', resize);
const isTouch = matchMedia('(pointer: coarse)').matches || 'ontouchstart' in window;
if (isTouch) document.body.classList.add('tch');
const K = { left: 0, right: 0, jump: 0, down: 0, dash: 0, act: 0, jumpHit: 0, dashHit: 0, actHit: 0, jumpUp: 0 };
const KEYMAP = { ArrowLeft: 'left', KeyA: 'left', ArrowRight: 'right', KeyD: 'right', ArrowUp: 'jump', KeyW: 'jump', Space: 'jump', ArrowDown: 'down', KeyS: 'down', ShiftLeft: 'dash', ShiftRight: 'dash', KeyE: 'act', Enter: 'act' };
const M = { x: 0, y: 0, down: 0, has: 0, id: null };
function keyDown(k) { if (!K[k]) { if (k === 'jump') K.jumpHit = 1; if (k === 'dash') K.dashHit = 1; if (k === 'act') K.actHit = 1; } K[k] = 1; }
function keyUp(k) { if (k === 'jump' && K.jump) K.jumpUp = 1; K[k] = 0; }
addEventListener('keydown', e => {
  if (e.target && /INPUT|TEXTAREA/.test(e.target.tagName)) return;
  if (e.code === 'Escape') { closeAll(); return; }
  if (overlayOn()) { if ((e.code === 'Space' || e.code === 'Enter') && panelKind === 'results') { e.preventDefault(); resultsContinue(); } return; }
  const k = KEYMAP[e.code]; if (!k) return; e.preventDefault(); keyDown(k);
});
addEventListener('keyup', e => { const k = KEYMAP[e.code]; if (k) keyUp(k); });
addEventListener('blur', () => { for (const k in K) K[k] = 0; M.down = 0; });
cv.addEventListener('pointerdown', e => { if (overlayOn()) return; sfxUnlock(); M.x = e.clientX; M.y = e.clientY; M.has = 1; if (e.button === 0 || e.pointerType !== 'mouse') { M.down = 1; M.id = e.pointerId; } try { cv.setPointerCapture(e.pointerId); } catch (x) {} });
cv.addEventListener('pointermove', e => { if (e.pointerType === 'mouse' || e.pointerId === M.id) { M.x = e.clientX; M.y = e.clientY; M.has = 1; } });
const pUp = e => { if (e.pointerId === M.id || e.pointerType === 'mouse') { M.down = 0; M.id = null; } };
cv.addEventListener('pointerup', pUp); cv.addEventListener('pointercancel', pUp);
cv.addEventListener('wheel', e => { e.preventDefault(); if (scene !== 'mine') return; ZOOM = clamp(ZOOM + (e.deltaY < 0 ? .15 : -.15), 1, 2.5); setZ(); }, { passive: false });
document.querySelectorAll('.tb').forEach(b => {
  const k = b.dataset.k;
  const on = e => { e.preventDefault(); sfxUnlock(); keyDown(k); b.classList.add('on'); };
  const off = e => { e.preventDefault(); keyUp(k); b.classList.remove('on'); };
  b.addEventListener('pointerdown', on); b.addEventListener('pointerup', off); b.addEventListener('pointercancel', off); b.addEventListener('pointerleave', off);
});
const toWorld = (sx, sy) => [(sx - VW / 2) / Z + camX, (sy - VH / 2) / Z + camY];

// ════════════ 플레이어 물리 (Player._physics_process — 씬 값 move 150 · jump -152, 중력 980) ════════════
const PH = { MOVE: 150, JUMP: -152, G: 980, COYOTE: .12, BUF: .1, CUT: .25, MINHOLD: .07, HOLDMAX: .18, HOLDG: .45, FALLG: 1.05, MAXFALL: 1200, APEXV: 35, APEXG: .55,
  DASH: 320, DASHT: .14, DASHCD: 3, DASHMOM: .32, DASHLAND: .42, DAMPEN: .08, PEND: .5, JET: 400, JETMAX: -350, JETX: 1.4, JETG: .4, JETE: 3,
  WG: .25, SWIM: 248.4, DIVE: 223.6, WMAXF: 150, WX: .869, WDRAG: .93 };
function newBody(x, y) { return { x, y, vx: 0, vy: 0, face: 1, ground: 0, coyote: 0, buf: 0, jumping: 0, minHold: 0, hold: 0, dash: 0, dashCd: 0, dashDir: 1, momT: 0, momV: 0, pend: 0, pendT: 0, damp: 0, jet: 0, dbl: 0, ag: 1, wet: 0, anim: 0, after: [] }; }
// 몸: CapsuleShape2D r5 h10 @ (0,4) → x −5…+5, y −1…+9
const BX0 = -4.99, BX1 = 4.99, BY0 = -.99, BY1 = 8.99;
function hits(P, x, y, solid) {   // 원(중심 y+4, 반지름 5)을 8점으로: 모서리에 걸치면 미끄러져 떨어짐
  return solid(x, y + BY1) || solid(x, y + BY0) || solid(x + BX0, y + 4) || solid(x + BX1, y + 4) || solid(x - 3.5, y + 7.5) || solid(x + 3.5, y + 7.5) || solid(x - 3.5, y + .5) || solid(x + 3.5, y + .5);
}
function moveAxis(P, dx, dy, solid) {
  const n = Math.max(1, Math.ceil(Math.max(Math.abs(dx), Math.abs(dy)) / 4)), sx = dx / n, sy = dy / n; let hit = 0;
  for (let k = 0; k < n; k++) {
    if (hits(P, P.x + sx, P.y + sy, solid)) {
      const st = .25, ux = Math.sign(sx) * st, uy = Math.sign(sy) * st;
      for (let j = 0; j < 20 && !hits(P, P.x + ux, P.y + uy, solid); j++) { P.x += ux; P.y += uy; }
      hit = 1; break;
    }
    P.x += sx; P.y += sy;
  }
  return hit;
}
function physics(P, dt, inp, solid, opt) {   // inp = 입력 허용, opt: { jetOK, water(y) }
  const wasGround = P.ground;
  // 대시 타이머 (_update_dash_timers)
  P.dashCd = Math.max(0, P.dashCd - dt);
  P.momT = Math.max(0, P.momT - dt); if (P.momT <= 0 && !P.pend) P.momV = 0;
  if (P.pend) { if (P.ground) P.pendT = 0; else { P.pendT -= dt; if (P.pendT <= 0) { P.pend = 0; P.momV = 0; P.momT = 0; } } }
  if (P.damp > 0) { if (P.ground) { P.damp -= dt; if (P.damp <= 0) { P.vx *= 0; P.momV = P.vx; P.momT = 0; } } else P.damp = 0; }
  if (P.dash > 0) { P.dash -= dt; P.afterT = (P.afterT || 0) - dt; if (P.afterT <= 0) { P.afterT = .045; P.after.push({ x: P.x, y: P.y, f: P.face, t: .22 }); } if (P.dash <= 0) { P.momT = PH.DASHMOM; P.momV = P.vx; if (!P.ground) { P.pend = 1; P.pendT = PH.PEND; } } }
  const wet = opt.water ? opt.water(P) : 0; if (wet && !P.wet) { P.jet = 0; sfx('splash'); } P.wet = wet;
  // 중력
  if (!P.ground && !(P.dash > 0)) {
    let m = 1;
    if (wet) m = PH.WG; else if (P.jet) m = PH.JETG;
    else if (P.jumping && P.vy < 0 && P.minHold > 0) { m = PH.HOLDG; P.minHold = Math.max(0, P.minHold - dt); }
    else if (P.jumping && P.vy < 0 && K.jump && P.hold < PH.HOLDMAX) { m = PH.HOLDG; P.hold += dt; }
    else if (P.vy > 0) m = PH.FALLG; else if (Math.abs(P.vy) < PH.APEXV) m = PH.APEXG;
    m *= P.ag;
    P.vy += PH.G * m * dt;
  }
  if (wet) { P.vy = clamp(P.vy, -PH.SWIM, K.down ? PH.DIVE : PH.WMAXF); P.vy *= PH.WDRAG; } else if (P.vy > PH.MAXFALL) P.vy = PH.MAXFALL;
  let jumpedNow = 0;
  if (inp) {
    P.coyote = P.ground ? PH.COYOTE : P.coyote - dt;
    P.buf = K.jumpHit ? PH.BUF : P.buf - dt;
    if (K.dashHit && !(P.dash > 0) && P.dashCd <= 0 && !wet) {   // _try_start_dash: 에너지 안 씀, 쿨 3초
      const d = (K.right ? 1 : 0) - (K.left ? 1 : 0); P.dashDir = d || P.face; P.dash = PH.DASHT; P.dashCd = PH.DASHCD; P.momT = PH.DASHMOM; P.momV = P.dashDir * PH.DASH;
      P.pend = P.ground ? 0 : 1; P.pendT = P.pend ? PH.PEND : 0; P.vx = P.momV; P.vy = 0; P.jet = 0; P.face = P.dashDir; P.afterT = 0; sfx('dash');
    }
    if (P.buf > 0 && (P.ground || P.coyote > 0)) { P.vy = PH.JUMP; P.buf = 0; P.coyote = 0; P.jumping = 1; P.minHold = PH.MINHOLD; P.hold = 0; P.damp = 0; jumpedNow = 1; sfx('jump'); }
    if (P.jumping && !P.jet && !wet && P.minHold <= 0 && !K.jump && P.vy < 0) { P.vy *= PH.CUT; P.jumping = 0; }
    if (wet && !P.ground) { const up = K.jump, dn = K.down; if (up && !dn) P.vy = moveToward(P.vy, -PH.SWIM, PH.SWIM * 4 * dt); else if (dn) P.vy = moveToward(P.vy, PH.DIVE, PH.DIVE * 4 * dt); }
    // 제트팩: 공중에서 한 번 점화, 누르는 동안 에너지 3/초
    if (opt.jetOK && opt.jetOK() && !wet && !P.ground && K.jumpHit && !jumpedNow && !P.dbl) { P.dbl = 1; P.vy = PH.JETMAX; P.jet = 1; sfx('jet'); }
    if (P.jet && K.jump && opt.jetOK && opt.jetOK()) { P.vy = moveToward(P.vy, PH.JETMAX, PH.JET * 3 * dt); if (opt.jetDrain) opt.jetDrain(PH.JETE * dt); if (Math.random() < .6 && opt.fx) opt.fx(P.x - P.face * 5, P.y + 7); }
    else if (P.jet && !K.jump) P.jet = 0;
    if (P.jet && opt.jetOK && !opt.jetOK()) P.jet = 0;
    if (P.ground && !jumpedNow) { P.jumping = 0; P.minHold = 0; P.hold = 0; P.dbl = 0; P.jet = 0; }
    const dir = (K.right ? 1 : 0) - (K.left ? 1 : 0);
    if (P.dash > 0) { P.vx = P.dashDir * PH.DASH; P.vy = 0; }
    else if (dir) {
      let sp = PH.MOVE * (opt.moveMult || 1); if (wet) sp *= PH.WX; else if (P.jet) sp *= PH.JETX;
      const want = dir * sp;
      if (P.momT > 0 && Math.sign(P.vx) === dir && Math.abs(P.vx) > Math.abs(want)) P.vx = moveToward(P.vx, want, PH.MOVE * dt * .6); else P.vx = want;
      P.face = dir;
    } else { let fr = PH.MOVE; if (P.momT > 0 && Math.abs(P.vx) > PH.MOVE) fr = PH.MOVE * dt * .75; P.vx = moveToward(P.vx, 0, fr); }
  } else { P.dash = 0; P.vx = moveToward(P.vx, 0, PH.MOVE); }
  K.jumpHit = 0; K.dashHit = 0;
  const hx = moveAxis(P, P.vx * dt, 0, solid); if (hx) P.vx = 0;
  const hy = moveAxis(P, 0, P.vy * dt, solid); if (hy) { if (P.vy > 0) P.ground = 1; P.vy = 0; }
  P.ground = (P.vy >= 0 && hits(P, P.x, P.y + .5, solid)) ? 1 : 0;
  if (!wasGround && P.ground) {   // 대시 착지 관성
    if (P.pend && Math.abs(P.momV) > PH.MOVE) { P.vx = P.momV; P.momT = PH.DASHLAND; P.damp = PH.DAMPEN; P.pend = 0; P.pendT = 0; }
    else if (P.momT > 0 && Math.abs(P.vx) > PH.MOVE) { P.momT = Math.max(P.momT, PH.DASHLAND); P.momV = P.vx; }
    P.land = .12;
  }
  for (const a of P.after) a.t -= dt; P.after = P.after.filter(a => a.t > 0);
  P.anim += dt; if (P.land > 0) P.land -= dt;
}
const moveToward = (v, to, d) => v < to ? Math.min(to, v + d) : Math.max(to, v - d);

// ════════════ 원정 (광산) ════════════
let scene = 'hub', R = null;
const W_ = RBWorld.W, H_ = RBWorld.H, OXW = RBWorld.OX;
const tid = (x, y) => y * W_ + x + OXW;
function tileAt(x, y) { if (x < -256 || x >= 256) return 99; if (y < 0) return 0; if (y >= H_) return 99; return R.w.T[tid(x, y)]; }
const mineSolid = (px, py) => tileAt(Math.floor(px / TS), Math.floor(py / TS)) !== 0;
function startRun(layer) {
  closeAll();
  const seed = (Math.random() * 100000) | 0, t0 = performance.now();
  const w = RBWorld.generate(layer, seed, { gems: S.gems[layer], required: chunksReq(layer), lvl: S.lvl });
  const water = RBWorld.LAYER_GEN[layer].water ? -10 * TS : null;
  R = { layer, w, t: 0, energy: ST.maxEnergy(), maxE: ST.maxEnergy(), inv: {}, P: newBody(0, -200), cd: 0, swing: 0, pitch: 1, pitchT: 0, lastCell: null, target: null,
    coins: [], drops: [], fx: [], nums: [], arcs: [], waves: [], balls: [], booms: [], cracks: new Map(), flash: new Map(), oxy: 20, water, bubbles: [], fields: [], vents: [], rain: 0,
    lift: { x: 0, y: -150 + (water ? -220 : 0), ty: -16 + (water ? -220 : 0), open: 0, phase: 'down', t: 0 }, ending: 0, bottomHits: 0, chunkCache: new Map(), dirty: new Set(), shake: 0, tremor: 0, drone: null,
    stats: { pick: 0, light: 0, boom: 0, pulse: 0, tokens: 0, blocks: 0 }, gotTok: 0, seed, genMs: performance.now() - t0, laserOn: 0, giantDone: 0 };
  R.P.x = 0; R.P.y = R.lift.y + 10;
  if (layer === 5) placeBubbles(); if (layer === 4) placeVents(); if (layer === 2) { R.rain = 1; R.fieldT = 0; initialFields(); }
  if (layer >= 5 || layer === 7) R.tremor = (layer === 7 ? rnd(16, 32) : lerp(150, 95, clamp((layer - 5) / 2, 0, 1)) * rnd(.75, 1.25)) * rnd(.4, .9);
  if (S.fl.drone) R.drone = newDrone(R.P.x + 15, R.P.y - 10);
  OC = 0; scene = 'mine'; ZOOM = 1.5; setZ(); camX = R.P.x; camY = R.P.y - 32;
  S.lastLayer = layer; S.fl.runs++; S.fl.entries++; if (!S.fl.seen.includes(layer)) S.fl.seen.push(layer);
  questEvent('entered_mine'); save(); setHud();
  showArea(LAYERS[layer].n, `깊이 ${LAYERS[layer].depth[0]}–${LAYERS[layer].depth[1]}m`);
  sfx('lift');
}
function endRun(why) {
  if (!R || R.ending) return; R.ending = 1; R.endWhy = why;
  if (why === 'energy') { R.P.vx = 0; sfx('no'); }
  setTimeout(() => showResults(), why === 'energy' || why === 'bottom' ? 1500 : 300);
}

// ── 광석 줍기 (Player.get_inventory_space · add_item) ──
function invSpace(inv, L) {
  const st = ST.stack(), slots = ST.slots(); let other = 0;
  for (const k in inv) if (+k !== +L && inv[k] > 0) other += Math.ceil(inv[k] / st);
  const mine = slots - other; if (mine <= 0) return 0;
  return Math.max(0, mine * st - (inv[L] | 0));
}
function giveOre(L, n, x, y) {   // CoinPickupFX: 동전이 튀어나와 플레이어에게 빨려 들어가며 지급, 넘치면 바닥에 떨어짐
  const sp = invSpace(R.inv, L), k = Math.min(n, sp);
  if (k > 0) { R.inv[L] = (R.inv[L] | 0) + k; hudInv(); if (L === 0) questEvent('gold_collected'); }
  coinBurst(x, y, 'o' + L, Math.min(16, n));
  if (k < n) { dropItem(R.P.x + rnd(-10, 10), R.P.y - 6, { kind: 'ore', L, n: n - k }); invFull(); }
}
function giveStone(n, x, y) { S.cur[1] += n; R.stoneGot = (R.stoneGot || 0) + n; coinBurst(x, y, 's', Math.min(4, n)); hudRes(); }
function coinBurst(x, y, ic, n) { for (let i = 0; i < n; i++) { const a = rnd(0, Math.PI * 2), s = rnd(40, 110); R.coins.push({ x, y, vx: Math.cos(a) * s, vy: Math.sin(a) * s - 60, ic, t: 0, d: rnd(.15, .35) }); } if (R.coins.length > 300) R.coins.splice(0, R.coins.length - 300); }
// 바닥 아이템 (DroppedItem: 토큰 · 덩어리 · 넘친 광석)
function dropItem(x, y, o) { const it = Object.assign({ x, y, vx: rnd(-100, 100), vy: rnd(-250, -150), t: 0, settle: 0, settled: 0, desp: 0, mag: 0, pop: 0, rej: 0, bcd: 0 }, o); R.drops.push(it); return it; }
function orbitToken(n, ang) { R.drops.push({ kind: 'token', n, orbit: 1, ang, t: 0, dur: 1, x: R.P.x, y: R.P.y, mag: 0 }); }
function addTokens(n) { S.cur[4] += n; R && (R.stats.tokens += n); hudRes(); }
function collectChunk(L) {   // PlayerUpgrades.collect_chunk: 이미 다 모았으면 토큰
  if (hasMaxChunks(L)) { addTokens(1); sfx('token'); return; }
  S.gems[L]++; questEvent(L === 0 ? 'gold_chunk_collected' : L === 1 ? 'cobalt_chunk_collected' : 'chunk', 1); chunkPopup(L); sfx('chunk'); save();
}
function invFull() { const el = $('inv'); el.querySelectorAll('.slot').forEach(s => { s.classList.remove('full'); void s.offsetWidth; s.classList.add('full'); }); if (!R.fullT || R.t - R.fullT > 5) { R.fullT = R.t; toast('가방이 가득 찼어요'); } }

// ── 블록 피해 (WorldGenerator._damage_csharp_block) ──
const BASE_HP = { 1: 3, 3: 2, 5: 3, 6: 3, 8: 4 };
function maxHp(t) { return (BASE_HP[t] || 1) * LAYERS[R.layer].hp; }
function markDirty(x, y) { for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) R.dirty.add(((x + dx) >> 5) + ',' + ((y + dy) >> 5)); }
function damageBlock(x, y, amt, src) {   // src: 'player' | 'multi' | 'light' | 'boom' | 'laser' | 'ball' | 'drone' ; 반환 = 부서졌나
  const t = tileAt(x, y); if (!t || t === 99 || t === 10) return false;
  const i = tid(x, y), w = R.w;
  if (t === 9) return damageBrick(x, y, amt, src);
  if (t === 8 && src === 'drone') return false;
  let hp;
  if (t === 8) { w.HITS[i]++; hp = 20 - w.HITS[i]; w.HP[i] = hp; if (w.HITS[i] % 4 === 0) { R.shake = Math.max(R.shake, 5 + w.HITS[i] / 20 * 25 > 8 ? 3 : 2); sfx('chunk', { gap: 200 }); } }
  else { if (!w.HP[i]) w.HP[i] = maxHp(t); w.HP[i] -= amt; hp = w.HP[i]; }
  if (src === 'player') R.stats.pick += Math.round(amt); else if (src === 'light') R.stats.light += Math.round(amt); else if (src === 'boom') R.stats.boom += Math.round(amt); else if (src === 'laser' || src === 'ball') R.stats.pulse += Math.round(amt);
  if (src !== 'drone') addNum(x, y, t === 8 ? 1 : amt, src);
  if (src === 'player') R.flash.set(i, .12);
  R.cracks.set(i, { x, y, f: t === 8 ? hp / 20 : hp / maxHp(t) });
  if (src === 'player') procs(x, y, true);
  if (hp > 0) return false;
  breakBlock(x, y, t, src); return true;
}
function damageBrick(x, y, amt, src) {   // TreasureChest.damage_block: 벽돌 체력 15 고정, 드롭 없음
  const i = tid(x, y), w = R.w; if (!w.HP[i]) w.HP[i] = 15; w.HP[i] -= amt; addNum(x, y, amt, src);
  R.cracks.set(i, { x, y, f: w.HP[i] / 15 }); if (src === 'player') R.flash.set(i, .12);
  if (w.HP[i] > 0) return false;
  w.T[i] = 0; w.HP[i] = 0; w.SI[i] = -1; R.cracks.delete(i); markDirty(x, y); burst(x * TS + 8, y * TS + 8, '#8a7a6a', 4); sfx('break', { pitch: rnd(.9, 1.1) }); return true;
}
function breakBlock(x, y, t, src) {
  const i = tid(x, y), w = R.w, L = R.layer, cx = x * TS + 8, cy = y * TS + 8, ore = w.OR[i];
  w.T[i] = 0; w.HP[i] = 0; w.OR[i] = 0; R.cracks.delete(i); markDirty(x, y); R.stats.blocks++;
  addXp((BASE_HP[t] || 1) * LAYERS[L].hp); addMasteryXp(1);
  let drop = ore ? (ore === 2 ? 0 : L) : -1;   // -1 = 돌
  let total = randi(1, 2);
  if (drop >= 0) total = Math.ceil(Math.ceil(total * ST.oreYield(drop)) * refMul('ore_yield_bonus'));
  else total = Math.ceil(total * ST.stoneYield() * Math.max(1, LAYERS[L].hp));
  if (Math.random() < ST.doubleDrop()) total *= 2;
  burst(cx, cy, ore ? A.ORE_COL[drop][1] : A.PAL[L].edge2, 4);
  if (src === 'drone') { droneTake(drop, total); }
  else if (t === 8) {   // 수정 덩어리: 덩어리 1 + 광석 15~20 × 수율
    R.drops.push({ kind: 'chunk', L, orbit: 1, ang: rnd(0, 6.28), t: 0, dur: 2, x: cx, y: cy, mag: 0 }); w.chunks = w.chunks.filter(([a, b]) => a !== x || b !== y);
    const n = Math.ceil(randi(15, 20) * ST.oreYield(L) * refMul('ore_yield_bonus'));
    for (let k = 0; k < n; k++) setTimeout(() => R && giveOre(L, 1, cx, cy), k * (n <= 25 ? 20 : 500 / n));
    R.shake = Math.max(R.shake, 6); sfx('chunk');
  } else if (drop >= 0) giveOre(drop, total, cx, cy); else giveStone(total, cx, cy);
  if (src !== 'drone' && (src === 'player' || src === 'light' || src === 'boom' || src === 'laser')) R.shake = Math.max(R.shake, 1.2);
  if (src !== 'drone' && Math.hypot(cx - R.P.x, cy - R.P.y) < 250) sfx('break', { pitch: drop >= 0 ? rnd(1.1, 1.3) : rnd(.9, 1.1) });
  if ((src === 'player' || src === 'drone') && drop < 0) stoneRareFind(cx, cy);
  if (src === 'player') procs(x, y, false);   // 부순 타격: 펄스 웨이브·폭발을 한 번 더 굴림 (원작 그대로)
  if (R.layer === 4) checkVents();
}
function stoneRareFind(x, y) {   // _try_stone_rare_find
  if (Math.random() < ST.stoneOreChance()) { let a = ST.stoneOreAmount(); if (Math.random() < ST.stoneJackpot()) a *= 2; dropItem(x, y, { kind: 'ore', L: R.layer, n: a }); if (Math.random() < ST.stoneOreToken()) dropItem(x, y, { kind: 'token', n: 1 }); }
  if (Math.random() < ST.stoneTokenChance()) dropItem(x, y, { kind: 'token', n: Math.random() < ST.stoneTokenDouble() ? 2 : 1 });
}
function addNum(x, y, amt, src) { R.nums.push({ x: x * TS + 8 + rnd(-3, 3), y: y * TS + 2, v: src === 'player' || src === 'multi' ? Math.round(amt * 10) : Math.round(amt * 10), src, t: 0 }); if (R.nums.length > 24) R.nums.shift(); }
function burst(x, y, c, n) { for (let k = 0; k < n; k++) { const a = rnd(0, 6.28), s = rnd(40, 80); R.fx.push({ x, y, vx: Math.cos(a) * s, vy: Math.sin(a) * s - 30, c, t: 0, life: .4 }); } if (R.fx.length > 300) R.fx.splice(0, R.fx.length - 300); }

// ── 곡괭이 (Player.handle_mining · mine_block) ──
function aimVec() {
  const P = R.P; let ax, ay;
  if (M.has) { const [wx, wy] = toWorld(M.x, M.y); ax = wx - P.x; ay = wy - P.y; } else { ax = P.face; ay = 0; }
  if (ax * ax + ay * ay < .0001) { ax = P.face; ay = 0; }
  const d = Math.hypot(ax, ay); return [ax / d, ay / d];
}
function rayTile() {   // 레이는 항상 최대 사거리 길이, 첫 고체 칸
  const P = R.P, [dx, dy] = aimVec(), rng = ST.range();
  for (let s = 0; s <= rng; s += 2) { const x = Math.floor((P.x + dx * s) / TS), y = Math.floor((P.y + dy * s) / TS), t = tileAt(x, y); if (t && t !== 99) return t === 10 ? null : [x, y]; }
  return null;
}
function mineTick(dt) {
  const P = R.P; R.cd -= dt;
  R.target = rayTile();
  if (!M.down || R.ending || P.exhaust) return;
  const [ax, ay] = aimVec(); if (Math.abs(ax) > Math.abs(ay) * Math.tan(8 * Math.PI / 180)) P.face = ax < 0 ? -1 : 1;
  if (R.cd > 0) return;
  R.cd = .4 / ST.speed();
  if (R.energy <= 0) return;
  R.swing = .5 / (2 * ST.speed()); R.swingT = R.swing;
  const tg = R.target; if (!tg) return;
  const key = tg[0] + ',' + tg[1]; if (key !== R.lastCell) { R.pitch = 1; R.lastCell = key; }
  let dmg = ST.damage(), crit = false;
  if (Math.random() < ST.critChance()) { crit = true; dmg *= ST.critMult(); }
  const isOre = R.w.OR[tid(tg[0], tg[1])] > 0;
  const broke = damageBlock(tg[0], tg[1], dmg, 'player');
  if (crit) { sfx('crit'); R.nums[R.nums.length - 1] && (R.nums[R.nums.length - 1].crit = 1); }
  if (Math.random() < ST.multi()) { const adj = Math.max(1, ST.damage() * .5); for (const [ox, oy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) damageBlock(tg[0] + ox, tg[1] + oy, adj, 'multi'); }
  let use = !(Math.random() < ST.efficiency());
  if (Math.random() < ST.ocChance() && !(OC > 0)) { OC = ST.ocDur(); sfx('oc'); toast('⚡ 오버클럭!'); }
  if (use) drainEnergy(1);
  sfx('hit', { pitch: R.pitch + (isOre ? .2 : 0) + (crit ? .5 : 0) + rnd(-.1, .1) });
  R.pitch += .1; R.pitchT = 1; if (broke) R.pitch = 1;
  P.squash = .16; questEvent('block_mined');
}
function drainEnergy(n) { if (!R || R.energy <= 0) return; R.energy = Math.max(0, R.energy - n); if (R.energy < .001) R.energy = 0; if (R.energy <= 0) { R.P.exhaust = 1; endRun('energy'); } }

// ── 발동 (try_proc_*) ──
function procs(x, y, first) {
  if (first && Math.random() < ST.lightChance()) { lightning(x, y); if (Math.random() < ST.lightDouble()) lightning(x, y); }
  if (!R.laserOn && Math.random() < ST.laserChance()) pulseWave();
  if (Math.random() < ST.boomChance()) explosive(x, y);
  if (first && Math.random() < ST.ballChance()) balls();
}
function adjBlock(cx, cy, visited, dir) {   // get_adjacent_block: 1~4칸 고리에서 고체 후보, 진행 방향 쪽 선호
  for (let d = 1; d <= 4; d++) {
    const c = [];
    for (let dy = -d; dy <= d; dy++) for (let dx = -d; dx <= d; dx++) { if (Math.max(Math.abs(dx), Math.abs(dy)) !== d) continue; const x = cx + dx, y = cy + dy, t = tileAt(x, y); if (t && t !== 99 && t !== 10 && !visited.has(x + ',' + y)) c.push([x, y, dx, dy]); }
    if (!c.length) continue;
    if (dir) { const fw = c.filter(([, , dx, dy]) => (dx * dir[0] + dy * dir[1]) / Math.hypot(dx, dy) >= -.3); if (fw.length) return fw[Math.floor(Math.random() * fw.length)]; c.sort((a, b) => (b[2] * dir[0] + b[3] * dir[1]) / Math.hypot(b[2], b[3]) - (a[2] * dir[0] + a[3] * dir[1]) / Math.hypot(a[2], a[3])); return c[0]; }
    return c[Math.floor(Math.random() * c.length)];
  }
  return null;
}
function lightning(x, y) {   // 연쇄 번개: 때린 블록은 빼고 사슬을 따라 피해
  const n = ST.lightChains(), dmg = ST.lightDamage(), vis = new Set([x + ',' + y]), path = [[x, y]];
  let cx = x, cy = y, dir = null;
  for (let k = 0; k < n; k++) { const nx = adjBlock(cx, cy, vis, dir); if (!nx) break; vis.add(nx[0] + ',' + nx[1]); path.push([nx[0], nx[1]]); dir = [nx[0] - cx, nx[1] - cy]; const l = Math.hypot(...dir); dir = [dir[0] / l, dir[1] / l]; cx = nx[0]; cy = nx[1]; }
  if (path.length < 2) return;
  const dur = clamp(path.length * .025, .08, .7);
  R.arcs.push({ path, t: 0, dur, done: 1, dmg, evo: lv('tesla_coil') > 0 }); sfx('zap');
}
function explosive(x, y) {   // 0.6초 충전 → 0.7초 뒤 원 안(가운데 제외)에 피해
  const size = ST.boomSize(), r = size / 2, sc = Math.ceil(r), tg = [];
  for (let dy = -sc; dy <= sc; dy++) for (let dx = -sc; dx <= sc; dx++) { if (!dx && !dy) continue; if (Math.hypot(dx, dy) > r) continue; const t = tileAt(x + dx, y + dy); if (t && t !== 99 && t !== 10) tg.push([x + dx, y + dy]); }
  R.booms.push({ x, y, size, tg, t: 0, dmg: ST.boomDamage() }); sfx('charge');
}
function pulseWave() {   // 펄스 웨이브: 350px/s 로 퍼지는 부채꼴, 한 칸 1회
  const [dx, dy] = aimVec(), a = Math.atan2(dy, dx), mk = (ang) => ({ ox: R.P.x, oy: R.P.y, a: ang, r: 0, max: 120 * ST.laserRange(), half: (10 * ST.laserWidth()) * Math.PI / 360, dmg: ST.laserDamage() * (lv('evolved_pulse_wave') ? 2 : 1), hit: new Set(), rb: lv('evolved_pulse_wave') > 0 });
  R.waves.push(mk(a)); if (Math.random() < ST.laserRear()) R.waves.push(mk(a + Math.PI)); R.laserOn = 1; sfx('wave');
}
function balls() {   // 튕기는 공: 520px/s, 튕길 때마다 ×1.07, 6초
  const n = Math.max(1, ST.ballCount()), [dx, dy] = aimVec(), a0 = Math.atan2(dy, dx);
  for (let i = 0; i < n; i++) { if (R.balls.length >= 48) break; const a = a0 + (n > 1 ? lerp(-55, 55, i / (n - 1)) * Math.PI / 180 : 0) + rnd(-.18, .18); R.balls.push({ x: R.P.x, y: R.P.y, vx: Math.cos(a) * 520, vy: Math.sin(a) * 520, b: ST.ballBounces(), dmg: Math.max(1, ST.ballDamage()), life: 6, tr: [] }); }
}

// ── 지역별 환경: 공기방울(희미한 물) · 황 분출구(용암 핵심) · 반중력장(정전기 봉우리) ──
function placeBubbles() {
  const w = R.w; let k = 0;
  for (let tr = 0; tr < 6000 && k < 140; tr++) { const x = randi(-240, 240), y = randi(20, 990); let ok = 1; for (let dy = -2; dy <= 2 && ok; dy++) for (let dx = -2; dx <= 2; dx++) if (tileAt(x + dx, y + dy)) { ok = 0; break; } if (!ok || R.bubbles.some(b => Math.abs(b.x - x * TS) < 160 && Math.abs(b.y - y * TS) < 160)) continue; R.bubbles.push({ x: x * TS + 8, y: y * TS + 8, r: 32 }); k++; }
}
function placeVents() {   // SulfurVents: 30개, 2칸 폭 바닥 위
  for (let tr = 0; tr < 4000 && R.vents.length < 30; tr++) {
    const tx = randi(-245, 245), ty = randi(24, 995);
    if (tileAt(tx, ty) || tileAt(tx + 1, ty) || tileAt(tx, ty - 1) || tileAt(tx + 1, ty - 1) || !tileAt(tx, ty + 1) || !tileAt(tx + 1, ty + 1)) continue;
    if (R.vents.some(v => Math.abs(v.tx - tx) < 14 && Math.abs(v.ty - ty) < 14)) continue;
    R.vents.push({ tx, ty, fx: (tx + 1) * TS, fy: (ty + 1) * TS, broken: 0, ballEnd: 0 });
  }
}
function checkVents() { for (const v of R.vents) if (!v.broken && (!tileAt(v.tx, v.ty + 1) || !tileAt(v.tx + 1, v.ty + 1))) { v.broken = 1; v.ballEnd = R.t + rnd(10, 15); } }
function initialFields() { for (const [ox, oy] of [[-400, -200], [300, -150], [-200, 100], [500, 50], [-100, -300], [400, -250]]) R.fields.push({ x: R.P.x + ox + rnd(-50, 50), y: R.P.y + oy + rnd(-50, 50), r: rnd(60, 120), g: rnd(-.4, -.2) }); }

// ── 채굴 드론 (MiningDrone 자율 모드: 탐색 → 날아가기 → 광석 캐기, 배터리 8초 · 충전 4초) ──
function newDrone(x, y) { return { x, y, vx: 0, vy: 0, st: 'start', t: 1 + Math.random(), act: 8 * ST.drone('battery'), tgt: null, list: [], mt: 0, dir: [1, 0] }; }
function droneTake(L, n) { if (L < 0) { S.cur[1] += n; hudRes(); return; } const sp = droneSpace(L), k = Math.min(n, sp); if (k > 0) S.dstore[L] = (S.dstore[L] | 0) + k; }
function droneSpace(L) { const cap = ST.cargo(), sc = Math.ceil(cap / 2); let used = 0, tot = 0; for (const k in S.dstore) { used += Math.ceil(S.dstore[k] / sc); tot += S.dstore[k]; } const mine = S.dstore[L] | 0, free = Math.max(2 - used, 0), head = (Math.ceil(mine / sc) + free) * sc - mine; return clamp(Math.min(head, cap - tot), 0, cap); }
function updateDrone(d, dt) {
  const fly = 120 * ST.drone('speed'), appr = 37.5 * ST.drone('speed'), expl = 90 * ST.drone('speed');
  const scan = () => { const tx = Math.floor(d.x / TS), ty = Math.floor(d.y / TS), out = []; for (let y = ty - 30; y <= ty + 30; y++) for (let x = tx - 40; x <= tx + 40; x++) { if (x < -256 || x >= 256 || y < 0 || y >= H_) continue; if (R.w.OR[tid(x, y)]) out.push([x, y, (x - tx) ** 2 + (y - ty) ** 2]); } out.sort((a, b) => a[2] - b[2]); d.list = out; };
  const pick = () => { while (d.list.length) { const c = d.list.shift(); if (R.w.OR[tid(c[0], c[1])]) { d.tgt = c; return true; } } d.tgt = null; return false; };
  const expDir = () => { const a = rnd(0, 6.28); const v = [Math.cos(a), Math.sin(a) * .5 + .5], l = Math.hypot(...v); d.dir = [v[0] / l, v[1] / l]; };
  if (d.st !== 'start' && d.st !== 'charge' && d.st === 'mine') { d.act -= dt; if (d.act <= 0) { d.st = 'charge'; d.t = 4 / ST.drone('recharge'); d.vx = d.vy = 0; } }
  const steer = (tx, ty, sp, k) => { const dx = tx - d.x, dy = ty - d.y, l = Math.hypot(dx, dy) || 1; d.vx = lerp(d.vx, dx / l * sp, Math.min(1, dt * k)); d.vy = lerp(d.vy, dy / l * sp, Math.min(1, dt * k)); return l; };
  switch (d.st) {
    case 'start': d.t -= dt; if (d.t <= 0) { d.act = 8 * ST.drone('battery'); d.st = 'scan'; d.t = .4; } break;
    case 'scan': d.vx = lerp(d.vx, 0, dt * 6); d.vy = lerp(d.vy, 0, dt * 6); d.t -= dt; if (d.t <= 0) { scan(); if (pick()) d.st = 'fly'; else { d.st = 'explore'; d.t = 3; expDir(); } } break;
    case 'fly': { if (!d.tgt && !pick()) { d.st = 'reloc'; d.t = 1.5; expDir(); break; } const l = Math.hypot(d.tgt[0] * TS + 8 - d.x, d.tgt[1] * TS + 8 - d.y); if (l < 10) { d.st = 'mine'; d.mt = 0; break; } steer(d.tgt[0] * TS + 8, d.tgt[1] * TS + 8, l > 40 ? fly : appr, 4); break; }
    case 'mine': d.vx = lerp(d.vx, 0, dt * 8); d.vy = lerp(d.vy, 0, dt * 8); d.mt -= dt; if (d.mt > 0) break; d.mt = .2 / ST.drone('attack_speed');
      if (!d.tgt || !R.w.OR[tid(d.tgt[0], d.tgt[1])]) { d.st = pick() ? 'fly' : 'reloc'; d.t = 1.5; break; }
      if (damageBlock(d.tgt[0], d.tgt[1], Math.max(1, 5 * ST.drone('damage')), 'drone')) { d.st = pick() ? 'fly' : 'reloc'; d.t = 1.5; if (d.st === 'reloc') expDir(); }
      break;
    case 'reloc': steer(d.x + d.dir[0] * 100, d.y + d.dir[1] * 100, fly, 4); d.t -= dt; if (d.t <= 0) { d.st = 'scan'; d.t = .4; } break;
    case 'explore': steer(d.x + d.dir[0] * 100, d.y + d.dir[1] * 100, expl, 2); d.t -= dt; if (d.t <= 0) { d.st = 'scan'; d.t = .4; } break;
    case 'charge': { const dx = R.P.x - 26, dy = R.P.y - 34; if (Math.hypot(dx - d.x, dy - d.y) > 6) steer(dx, dy, fly * .55, 2.5); else { d.vx = lerp(d.vx, 0, dt * 4); d.vy = lerp(d.vy, 0, dt * 4); } d.t -= dt; if (d.t <= 0) { d.act = 8 * ST.drone('battery'); d.st = 'scan'; d.t = .4; } break; }
  }
  d.x += d.vx * dt; d.y += d.vy * dt;
}

// ════════════ 원정 업데이트 ════════════
function updateMine(dt) {
  const P = R.P; R.t += dt;
  if (OC > 0) OC -= dt;
  tickSmelt(); tickFoundry(dt);
  // 승강기 하강 (Elevator.start_descent → arrive)
  const L = R.lift;
  if (L.phase === 'down') { L.y += 100 * dt; P.x = L.x; P.y = L.y + 10; P.vx = P.vy = 0; if (L.y >= L.ty) { L.y = L.ty; L.phase = 'open'; L.t = .4; R.shake = 3; sfx('clang'); } }
  else if (L.phase === 'open') { L.open = Math.min(1, L.open + dt / .4); P.x = L.x; P.y = L.y + 10; if (L.open >= 1) L.phase = 'idle'; }
  const inLift = L.phase !== 'idle';
  // 반중력장
  P.ag = 1; for (const f of R.fields) if (Math.hypot(P.x - f.x, P.y - f.y) < f.r) P.ag = f.g;
  if (!inLift) physics(P, dt, !R.ending && !P.exhaust, mineSolid, { moveMult: ST.moveMult(), jetOK: () => ST.jetpack() && (ST.freeJet() || R.energy > 0), jetDrain: n => { if (!ST.freeJet()) drainEnergy(n); }, fx: (x, y) => R.fx.push({ x, y, vx: rnd(-20, 20), vy: 80, c: '#ffb35e', t: 0, life: .3 }), water: R.water != null ? (b => b.y > R.water) : null });
  // 맵 경계 · 바닥 (WorldGenerator._process)
  const lim = 255 * TS; if (P.x < -lim) { P.x = -lim; P.vx = 0; } if (P.x > lim) { P.x = lim; P.vx = 0; }
  if (R.layer !== 7) {
    if (Math.floor(P.y / TS) >= 1024 - 20 && !R.ending) { R.bottomHits++; if (R.bottomHits >= 2) { P.exhaust = 1; endRun('bottom'); } else { P.x = randi(-100, 100) * TS; P.y = -32; P.vx = P.vy = 0; toast('바닥에 닿아 지표로 돌아왔어요 — 한 번 더 닿으면 원정이 끝나요', 3200); } }
    if (P.y > (1024 - 10) * TS) { P.y = (1024 - 10) * TS; P.vy = 0; }
  }
  // 산소 (희미한 물): 20 → 초당 0.5 감소, 0이면 최대 에너지 5%/초
  if (R.water != null) {
    if (P.wet) { const inB = R.bubbles.some(b => Math.hypot(P.x - b.x, P.y + 4 - b.y) < b.r); if (inB) R.oxy = Math.min(20, R.oxy + 10 * dt); else { R.oxy = Math.max(0, R.oxy - .5 * dt); if (R.oxy <= 0) drainEnergy(R.maxE * .05 * dt); } } else R.oxy = 20;
  }
  // 황 연기 10/초
  if (R.vents.length && !P.exhaust) { for (const v of R.vents) { let inS = 0; if (!v.broken) inS = Math.abs(P.x - v.fx) <= 14 && P.y <= v.fy && P.y >= v.fy - 160; else if (R.t < v.ballEnd) inS = Math.hypot(P.x - v.fx, P.y - (v.fy - 16)) <= 26; if (inS) { drainEnergy(10 * dt); break; } } }
  // 반중력장 생성 (StormRain)
  if (R.rain) { R.fieldT += dt; if (R.fieldT >= 5) { R.fieldT = 0; R.fields = R.fields.filter(f => Math.hypot(f.x - P.x, f.y - P.y) < 800); if (R.fields.length < 6) { const d = rnd(300, 600), a = rnd(0, 6.28), x = P.x + Math.cos(a) * d, y = P.y + Math.sin(a) * d; if (!mineSolid(x, y)) R.fields.push({ x, y, r: rnd(60, 120), g: rnd(-.4, -.2) }); } } }
  // 땅 울림 (5층부터)
  if (R.tremor > 0) { R.tremor -= dt; if (R.tremor <= 0) { const t = R.layer === 7 ? 1 : clamp((R.layer - 5) / 2, 0, 1); R.quake = { t: 0, d: R.layer === 7 ? rnd(2, 3.2) : lerp(1, 1.8, t) * rnd(.85, 1.15), a: R.layer === 7 ? rnd(7, 10) : lerp(3.5, 5.5, t) }; sfx('rumble'); R.tremor = R.layer === 7 ? rnd(16, 32) : lerp(150, 95, t) * rnd(.75, 1.25); } }
  if (R.quake) { R.quake.t += dt; const q = R.quake, k = q.t / q.d; R.shake = Math.max(R.shake, q.a * Math.min(k / .15, 1) * (1 - smooth(.45, 1, k))); if (k >= 1) R.quake = null; }
  if (!inLift) mineTick(dt);
  if (R.swing > 0) R.swing -= dt;
  if (R.pitchT > 0) { R.pitchT -= dt; if (R.pitchT <= 0) R.pitch = 1; }
  // 상호작용 (승강기 = 원정 끝, 상자 열기, 보스 먹이기)
  R.near = null;
  if (!inLift && Math.abs(P.x - L.x) < 22 && Math.abs(P.y - (L.y + 10)) < 30) R.near = { k: 'lift' };
  for (const s of R.w.structs) if (!s.open && Math.hypot(P.x - (s.cx * TS + 8), P.y - (s.cy * TS + 8)) < 24) R.near = { k: 'chest', s };
  if (R.w.boss && !S.fl.done && Math.hypot(P.x - R.w.boss.x * TS, P.y - R.w.boss.y * TS) < 90) R.near = { k: 'boss' };
  if (K.actHit && R.near && !R.ending) { if (R.near.k === 'lift') endRun('lift'); else if (R.near.k === 'chest') openChest(R.near.s); else if (R.near.k === 'boss') bossInteract(); }
  K.actHit = 0;
  // 효과들
  for (const a of R.arcs) { a.t += dt; const n = a.path.length - 1, reach = Math.min(n, Math.floor(a.t / a.dur * n)); while (a.done <= reach) { const [x, y] = a.path[a.done]; damageBlock(x, y, a.dmg, 'light'); R.shake = Math.max(R.shake, clamp(.15 + a.done * .03, .15, 1)); a.done++; } }
  R.arcs = R.arcs.filter(a => a.t < a.dur + .4);
  for (const b of R.booms) { b.t += dt; if (b.t >= .7 && !b.fired) { b.fired = 1; sfx('boom'); R.shake = Math.max(R.shake, 3 + (b.size / 2) * 1.5); burst(b.x * TS + 8, b.y * TS + 8, '#ffb35e', 18); for (const [x, y] of b.tg) damageBlock(x, y, b.dmg, 'boom'); } }
  R.booms = R.booms.filter(b => b.t < 1.1);
  for (const w of R.waves) { w.r += 350 * Math.min(dt, 1 / 60); const r0 = Math.max(0, w.r - 17.5), r1 = w.r + 16; for (let rr = r0; rr <= r1; rr += 8) { const st = 8 / Math.max(rr, 8); for (let a = -w.half; a <= w.half; a += st) { const x = Math.floor((w.ox + Math.cos(w.a + a) * rr) / TS), y = Math.floor((w.oy + Math.sin(w.a + a) * rr) / TS), k = x + ',' + y; if (w.hit.has(k)) continue; const t = tileAt(x, y); if (t && t !== 99 && t !== 10) { w.hit.add(k); damageBlock(x, y, w.dmg, 'laser'); } } } }
  R.waves = R.waves.filter(w => w.r < w.max); if (!R.waves.length) R.laserOn = 0;
  for (const b of R.balls) {
    b.life -= dt; const steps = clamp(Math.ceil(Math.hypot(b.vx, b.vy) * dt / 8), 3, 24);
    for (let s = 0; s < steps && b.b >= 0; s++) {
      const nx = b.x + b.vx * dt / steps, ny = b.y + b.vy * dt / steps, tx = Math.floor(nx / TS), ty = Math.floor(ny / TS), t = tileAt(tx, ty);
      if (t) { const ox = Math.floor(b.x / TS), oy = Math.floor(b.y / TS); if (ox !== tx) b.vx = -b.vx; if (oy !== ty) b.vy = -b.vy; if (ox === tx && oy === ty) { b.vx = -b.vx; b.vy = -b.vy; } b.vx *= 1.07; b.vy *= 1.07; if (t !== 99 && t !== 10) damageBlock(tx, ty, b.dmg, 'ball'); b.b--; sfx('ball', { pitch: rnd(.9, 1.2), gap: 30 });
        if (b.b < 0 && lv('token_ball_explosion')) for (let dy = -2; dy <= 2; dy++) for (let dx = -2; dx <= 2; dx++) if (Math.hypot(dx, dy) <= 2.5) damageBlock(tx + dx, ty + dy, b.dmg, 'ball'); }
      else { b.x = nx; b.y = ny; }
    }
    b.tr.push([b.x, b.y]); if (b.tr.length > 6) b.tr.shift();
  }
  R.balls = R.balls.filter(b => b.b >= 0 && b.life > 0);
  // 동전 연출 (CoinPickupFX: 튀어나온 뒤 플레이어로 빨려 들어감)
  for (const c of R.coins) { c.t += dt; if (c.t < c.d) { c.x += c.vx * dt; c.y += c.vy * dt; c.vy += 300 * dt; } else { const dx = P.x - c.x, dy = P.y - c.y, d = Math.hypot(dx, dy) || 1, sp = 260 + (c.t - c.d) * 900; c.x += dx / d * Math.min(d, sp * dt); c.y += dy / d * Math.min(d, sp * dt); if (d < 6) { c.done = 1; sfx('pick', { pitch: c.ic === 's' ? rnd(.95, 1.3) : rnd(1.35, 1.75), gap: 45 }); } } }
  R.coins = R.coins.filter(c => !c.done && c.t < 1.5);
  updateDrops(dt);
  for (const f of R.fx) { f.t += dt; f.x += f.vx * dt; f.y += f.vy * dt; f.vy += 300 * dt; } R.fx = R.fx.filter(f => f.t < f.life);
  for (const n of R.nums) n.t += dt; R.nums = R.nums.filter(n => n.t < .7);
  for (const [k, v] of R.flash) { if (v - dt <= 0) R.flash.delete(k); else R.flash.set(k, v - dt); }
  if (R.drone) updateDrone(R.drone, dt);
  if (P.squash > 0) P.squash -= dt;
  R.shake = Math.max(0, R.shake - dt * 12);
  const ty = P.y - 32; camX = lerp(camX, P.x, Math.min(1, dt * 12)); camY = lerp(camY, ty, Math.min(1, dt * 12));
  hudEnergy();
}
const smooth = (a, b, x) => { const t = clamp((x - a) / (b - a), 0, 1); return t * t * (3 - 2 * t); };
function updateDrops(dt) {   // DroppedItem: 정착 1.2초 → 10초 뒤 사라짐, 반경 150 안이면 끌려옴, 토큰·덩어리는 궤도 후 수집
  const P = R.P, mag = 150 + ST.pickup();
  for (const it of R.drops) {
    it.t += dt;
    if (it.orbit) {
      it.ang += (it.kind === 'chunk' ? 4 : 5) * dt; const rr = it.kind === 'chunk' ? 45 : 35;
      it.x = lerp(it.x, P.x + Math.cos(it.ang) * rr, Math.min(1, 10 * dt)); it.y = lerp(it.y, P.y + Math.sin(it.ang) * rr, Math.min(1, 10 * dt));
      if (it.t >= it.dur) { it.orbit = 0; if (it.kind === 'chunk' && hasMaxChunks(it.L)) { it.kind = 'token'; it.n = 1; it.orbit = 1; it.t = 0; it.dur = 2; burst(it.x, it.y, '#ffd34a', 10); } else it.mag = 1; }
      continue;
    }
    if (!it.mag) {
      if (!it.settled) { it.vy += 980 * dt; it.vx *= .99; const ox = it.x, oy = it.y; it.x += it.vx * dt; if (mineSolid(it.x, it.y + 5)) { it.x = ox; it.vx *= -.3; } it.y += it.vy * dt; if (mineSolid(it.x, it.y + 5)) { it.y = oy; it.vy = 0; it.vx *= .8; } if (Math.hypot(it.vx, it.vy) < 8) { it.settle += dt; if (it.settle >= 1.2) it.settled = 1; } else it.settle = 0; }
      else { it.desp += dt; if (it.desp >= 10) { it.gone = 1; continue; } if (Math.hypot(it.x - P.x, it.y - P.y) < mag + 100) { it.settled = 0; it.desp = 0; } }
      if (it.bcd > 0) it.bcd -= dt;
      if (it.t < .2) continue;
      const d = Math.hypot(it.x - P.x, it.y - P.y);
      if (it.rej && d < mag) { if (invSpace(R.inv, it.L) > 0) it.rej = 0; else continue; }
      if (d < mag && it.bcd <= 0 && !it.rej) { it.mag = 1; it.pop = .09; const l = d || 1; it.pd = [(it.x - P.x) / l, (it.y - P.y) / l]; }
      continue;
    }
    if (it.pop > 0) { it.pop -= dt; it.x += it.pd[0] * 180 * dt; it.y += it.pd[1] * 180 * dt; continue; }
    const dx = P.x - it.x, dy = P.y - it.y, d = Math.hypot(dx, dy) || 1, sp = 300 * (1 + (1 - clamp(d / mag, 0, 1)) * 3);
    it.x += dx / d * sp * dt; it.y += dy / d * sp * dt;
    if (d < 40 * .4 + 6) collectDrop(it);
  }
  R.drops = R.drops.filter(i => !i.gone);
}
function collectDrop(it) {
  if (it.kind === 'token') { addTokens(it.n); sfx('token', { pitch: 1 + (R.tokPitch = ((R.tokPitch || 0) + .05) % .6) }); it.gone = 1; return; }
  if (it.kind === 'chunk') { collectChunk(it.L); it.gone = 1; return; }
  const sp = invSpace(R.inv, it.L);
  if (sp <= 0) { const P = R.P, d = Math.hypot(it.x - P.x, it.y - P.y) || 1; it.mag = 0; it.vx = (it.x - P.x) / d * 150; it.vy = (it.y - P.y) / d * 150; it.rej = 1; it.bcd = .5; it.settled = 0; invFull(); return; }
  const k = Math.min(sp, it.n); R.inv[it.L] = (R.inv[it.L] | 0) + k; it.n -= k; hudInv(); sfx('pick', { pitch: rnd(1.1, 1.3) }); if (it.n <= 0) it.gone = 1;
}
function openChest(s) {   // TreasureChest.open_chest: 토큰 2~4 + 현상금, 구조물 통째로 사라짐
  s.open = 1; const total = randi(2, 4) + ST.tokenBounty(), cnt = Math.min(total, 10), per = Math.floor(total / cnt), rem = total % cnt;
  for (let i = 0; i < cnt; i++) orbitToken(per + (i < rem ? 1 : 0), Math.PI * 2 / cnt * i);
  const w = R.w; for (let r = 0; r < 9; r++) for (let c = 0; c < 9; c++) { const x = s.x - 1 + c, y = s.y - 2 + r; if (x < -256 || x >= 256 || y < 0 || y >= H_) continue; const i = tid(x, y); if (w.T[i] === 9) { w.T[i] = 0; w.SI[i] = -1; w.HP[i] = 0; R.cracks.delete(i); burst(x * TS + 8, y * TS + 8, '#8a7a6a', 2); } }
  markDirty(s.x + 3, s.y + 2); markDirty(s.x + 3, s.y + 6); markDirty(s.x, s.y + 2); markDirty(s.x + 6, s.y + 2); markDirty(s.x, s.y + 6); markDirty(s.x + 6, s.y + 6);
  sfx('chunk'); questEvent('chest');
}
