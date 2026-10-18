// 쉘다이버 핵심 규칙 — 원작(Shelldiver, GameMaker YYC) 디컴파일 값 그대로.
// 60 프레임 = 1초 고정 스텝. 모든 타이머는 프레임 단위.
(function () {
  'use strict';
  const SD = window.SD = window.SD || {};

  // ── 해파리 12종 (jellyfishes_info: 가치·판매시간(초), 종별 Create: HP·속도·펄스) ─────────
  //   art = 그림 키, big/small = 늪 큰 개체가 잡히면 같은 id 작은 개체 n마리로 갈라짐
  SD.JELLY = [
    { id: 0, nm: '분홍 해파리', art: 'shallows_pink', value: 10, sell: 6, hp: 6, vel: 2, bf: 3, bt: 120, kb: .3, bub: 38, b: 0 },
    { id: 1, nm: '연두 해파리', art: 'shallows_green', value: 30, sell: 12, hp: 12, vel: 2.5, bf: 3, bt: 120, kb: .3, bub: 38, b: 0 },
    { id: 2, nm: '하늘 해파리', art: 'shallows_yellow', value: 100, sell: 36, hp: 30, vel: 3, bf: 3, bt: 120, kb: .3, bub: 38, b: 0 },
    { id: 3, nm: '빙하 분홍 해파리', art: 'glacial_purple', value: 500, sell: 144, hp: 75, vel: 3, bf: 4, bt: 60, kb: .3, bub: 35, b: 1 },
    { id: 4, nm: '빙하 보라 해파리', art: 'glacial_red', value: 2500, sell: 288, hp: 200, vel: 2.5, bf: 4, bt: 45, kb: .3, bub: 35, b: 1 },
    { id: 5, nm: '빙하 초록 해파리', art: 'glacial_green', value: 12500, sell: 864, hp: 800, vel: 2.5, bf: 4, bt: 30, kb: .3, bub: 39, b: 1 },
    { id: 6, nm: '늪 보라 해파리', art: 'swamp_purple', value: 90000, sell: 3456, hp: 1200, vel: 2, bf: 3, bt: 120, kb: .6, bub: 38, b: 2, split: 2, small: { hp: 750, vel: 2.5, bt: 4, bub: 26 } },
    { id: 7, nm: '늪 하늘 해파리', art: 'swamp_yellow', value: 450000, sell: 9000, hp: 4000, vel: 2, bf: 3, bt: 120, kb: .6, bub: 38, b: 2, split: 3, small: { hp: 1875, vel: 3, bt: 4, bub: 28 } },
    { id: 8, nm: '늪 초록 해파리', art: 'swamp_green', value: 2250000, sell: 40000, hp: 10000, vel: 2, bf: 3, bt: 120, kb: .6, bub: 38, b: 2, split: 4, small: { hp: 7500, vel: 3.5, bt: 4, bub: 29 } },
    { id: 9, nm: '용암 붉은 해파리', art: 'magma_blue', value: 3e7, sell: 150000, hp: 30000, vel: 2, bf: 3, bt: 30, kb: .7, bub: 38, b: 3, touch: 20000, range: 100 },
    { id: 10, nm: '용암 하늘 해파리', art: 'magma_yellow', value: 1.2e8, sell: 400000, hp: 150000, vel: 2, bf: 3, bt: 30, kb: .75, bub: 38, b: 3, touch: 40000, range: 120 },
    { id: 11, nm: '용암 파랑 해파리', art: 'magma_red', value: 1e9, sell: 1400000, hp: 800000, vel: 2, bf: 3, bt: 30, kb: .8, bub: 38, b: 3, touch: 200000, range: 150 },
  ];
  // 희귀도 (jellyfish_type_info): 가치·HP·판매시간·변환시간 배수. 0 일반, 1 은, 2 황금, 3 무지개
  SD.TYPE = [
    { nm: '', v: 1, hp: 1, t: 1, tt: 1, grade: 'normal' },
    { nm: '은빛 ', v: 10, hp: 2, t: 2, tt: 2, grade: 'silver' },
    { nm: '황금 ', v: 25, hp: 3, t: 3, tt: 3, grade: 'gold' },
    { nm: '무지개 ', v: 100, hp: 4, t: 4, tt: 4, grade: 'rainbow' },
  ];
  // ── 자원 블록 (o_*_block_0X Create: HP, 코인 irandom_range) ────────────────────
  SD.BLOCK = {
    scrap_1: { cur: 'scrap', hp: 10, coin: [5, 10], sq: 1 }, scrap_2: { cur: 'scrap', hp: 26, coin: [15, 30], sq: .9 }, scrap_3: { cur: 'scrap', hp: 38, coin: [75, 125], sq: .6 },
    crystal_1: { cur: 'crystal', hp: 100, coin: [20, 30], sq: .9 }, crystal_2: { cur: 'crystal', hp: 250, coin: [40, 60], sq: .75 }, crystal_3: { cur: 'crystal', hp: 400, coin: [200, 300], sq: .5 },
    mush_1: { cur: 'mush', hp: 2800, coin: [40, 60], sq: .9 }, mush_2: { cur: 'mush', hp: 7000, coin: [150, 200], sq: .75 }, mush_3: { cur: 'mush', hp: 11000, coin: [650, 850], sq: .5 },
    obsidian_1: { cur: 'obsidian', hp: 80000, coin: [200, 300], sq: .9 }, obsidian_2: { cur: 'obsidian', hp: 300000, coin: [700, 900], sq: .75 }, obsidian_3: { cur: 'obsidian', hp: 800000, coin: [5000, 7500], sq: .5 },
  };
  // ── 바이옴 4 × 깊이 3 = 12단계 (scr_biomes ___struct___10..70) ─────────────────────
  const L = (room, depth, drain, every, jc, rc, jo, ro, gr) => ({ room, depth, drain, every, ji: 60, jc, ri: 60, rc, jo, ro, gr });
  SD.BIOMES = [
    { key: 'shallows', nm: '얕은 바다', res: 'scrap', levels: [
      L('rm_ocean_shallows_01', 100, 3.5, 60, 12.5, 10, [[0, 1]], [['scrap_1', 1]], 10),
      L('rm_ocean_shallows_02', 200, 7, 60, 15, 15, [[0, 6], [1, 4]], [['scrap_1', 7], ['scrap_2', 3]], 15),
      L('rm_ocean_shallows_03', 300, 18, 60, 20, 20, [[1, 6], [2, 3]], [['scrap_1', 4], ['scrap_2', 3], ['scrap_3', 1]], 20)] },
    { key: 'glacial', nm: '빙하 속 심해', res: 'crystal', levels: [
      L('rm_ocean_glacial_01', 400, 40, 50, 12.5, 10, [[3, 1]], [['crystal_1', 1]], 10),
      L('rm_ocean_glacial_02', 500, 90, 50, 15, 15, [[3, 6], [4, 4]], [['crystal_1', 7], ['crystal_2', 3]], 15),
      L('rm_ocean_glacial_03', 600, 200, 50, 20, 20, [[4, 6], [5, 3]], [['crystal_1', 4], ['crystal_2', 3], ['crystal_3', 1]], 20)] },
    { key: 'swamp', nm: '늪지대 수역', res: 'mush', levels: [
      L('rm_ocean_swamp_01', 700, 200, 40, 14, 20, [[6, 1]], [['mush_1', 1]], 15),
      L('rm_ocean_swamp_02', 800, 450, 40, 17.5, 22.5, [[6, 6], [7, 4]], [['mush_1', 7], ['mush_2', 3]], 20),
      L('rm_ocean_swamp_03', 900, 1500, 40, 20, 25, [[7, 6], [8, 3]], [['mush_1', 4], ['mush_2', 3], ['mush_3', 1]], 25)] },
    { key: 'magma', nm: '용암 심연', res: 'obsidian', levels: [
      L('rm_ocean_magma_01', 1000, 4000, 30, 10, 20, [[9, 1]], [['obsidian_1', 1]], 15),
      L('rm_ocean_magma_02', 1100, 7000, 30, 15, 22.5, [[9, 6], [10, 4]], [['obsidian_1', 7], ['obsidian_2', 3]], 20),
      L('rm_ocean_magma_03', 1200, 25000, 30, 20, 25, [[11, 1]], [['obsidian_1', 4], ['obsidian_2', 3], ['obsidian_3', 1]], 25)] },
  ];
  SD.LEVELS = []; SD.BIOMES.forEach((b, bi) => b.levels.forEach((l, d) => SD.LEVELS.push(Object.assign({ biome: bi, d, bkey: b.key, bnm: b.nm, res: b.res }, l))));
  // 깊이 해금 문턱: 산 스킬 레벨 총합 (o_upgrade_area prestige_xp)
  SD.PRESTIGE_XP = [1, 50, 95, 140, 200, 250, 300, 360, 430, 500, 580, 640];
  SD.CUR = ['shell', 'scrap', 'crystal', 'mush', 'obsidian', 'flask'];
  SD.CUR_NM = { shell: '조개껍데기', scrap: '고철', crystal: '수정', mush: '버섯', obsidian: '흑요석', flask: '생명력 물약' };

  // ── 저장 상태 ─────────────────────────────────────────────────
  const SAVE_KEY = 'shell_save_v2';
  function fresh() {
    return {
      v: 2, coins: { shell: 0, scrap: 0, crystal: 0, mush: 0, obsidian: 0, flask: 0 },
      lv: {}, inv: [], store: [], tin: [], tout: [], sub: [],
      storeCoins: 0, flaskCoins: 0, alchemyShell: 0,
      dSell: 0, dTrans: 0, dAlch: 0, dTransOut: 0, dSubOut: 0,
      oxyPerm: 0, simFrames: 0, prestigeSeen: 0,
      stats: { dives: 0, jelly: 0, scrap: 0, crystal: 0, mush: 0, obsidian: 0, time: 0, drowned: 0 },
      tut: 0, ending: false, hammockSeen: false, playFrames: 0, savedAt: 0,
    };
  }
  SD.fresh = fresh;
  SD.S = fresh();
  SD.load = function () { try { const v = JSON.parse(localStorage.getItem(SAVE_KEY) || 'null'); if (v && v.v === 2) SD.S = Object.assign(fresh(), v); } catch (e) {} SD.recompute(); };
  SD.save = function () { try { SD.S.savedAt = Date.now(); localStorage.setItem(SAVE_KEY, JSON.stringify(SD.S)); } catch (e) {} };
  SD.reset = function () { SD.S = fresh(); SD.recompute(); SD.save(); };

  // ── 스킬 ──────────────────────────────────────────────────────
  const SK = SD.SKILLS = window.SD_SKILLS || [];
  const SKB = SD.SKB = {}; SK.forEach(s => { SKB[s.id] = s; s.max = s.pr.length; });
  SD.lv = id => SD.S.lv[id] || 0;
  SD.totalLevels = () => { let t = 0; for (const k in SD.S.lv) t += SD.S.lv[k]; return t; };
  SD.prestige = () => { let p = 0; const t = SD.totalLevels(); while (p < SD.PRESTIGE_XP.length && t >= SD.PRESTIGE_XP[p]) p++; return p; };
  // is_skill_unlocked: 선행(아무 레벨) 전부 ≥1, 선행(최대 레벨) 전부 최대
  SD.unlocked = s => s.id === 'submarine' || (s.na.every(n => SD.lv(n) > 0) && s.nx.every(n => SD.lv(n) >= (SKB[n] ? SKB[n].max : 1)));
  SD.visible = s => s.id === 'submarine' || s.na.some(n => SD.lv(n) > 0) || s.nx.some(n => SD.lv(n) > 0);
  SD.price = s => s.pr[Math.min(SD.lv(s.id), s.max - 1)];
  SD.canBuy = s => SD.lv(s.id) < s.max && SD.unlocked(s) && SD.wallet(s.cur) >= SD.price(s);
  // 조개 지갑: 은행 금고 스킬이 있으면 상자 속 조개도 바로 쓸 수 있음
  SD.wallet = cur => cur === 'free' ? Infinity : (SD.S.coins[cur] || 0) + (cur === 'shell' && SD.B.global_chest ? SD.S.storeCoins : 0);
  SD.pay = function (cur, n) {
    if (cur === 'free') return;
    const c = SD.S.coins; if (cur === 'shell' && c.shell < n && SD.B.global_chest) { SD.S.storeCoins -= (n - c.shell); c.shell = 0; return; }
    c[cur] -= n;
  };
  SD.buy = function (s) {
    if (!SD.canBuy(s)) return false;
    SD.pay(s.cur, SD.price(s)); SD.S.lv[s.id] = SD.lv(s.id) + 1; SD.recompute(); SD.save(); return true;
  };

  // ── 보너스 계산 (par_player_Step_1: 0으로 리셋 → 기본값 → 산 스킬 action 전부) ──────
  SD.B = {};
  SD.recompute = function () {
    const B = SD.B = {
      all_cap: 4, player_slots: 1, store_slots: 1, trans_slots: 1, sub_slots: 4,
      jellyfish_transmutation_type: 1, bonus_store_extra_sell_amount: 1,
      base_oxygen: 0, base_bubbles: 0, base_plasma: 0,
      friendly_bubble_explosion_range: 0, plasma_explosion_range: 0,
      submarine_recover_amount: 0, submarine_recover_area_range: 0, submarine_recover_all_tanks: 0,
      starfish_number: 0, robot_number: 0, catch_oxygen: 0, jellyfish_oxygen_max_increase: 0, resource_oxygen_max_increase: 0,
      bubble_smite_threshold: 0, multbubble_number: 0, deep_breath: 0, bio: [0, 0, 0, 0],
    };
    const MAP = { total_bonus_player_inventory_slot_number: 'player_slots', total_all_inventory_slot_capacity: 'all_cap', total_bonus_store_inventory_slot_number: 'store_slots', total_bonus_transmutator_inventory_slot_number: 'trans_slots', total_bonus_submarine_inventory_slot_number: 'sub_slots' };
    for (const s of SK) {
      const n = SD.lv(s.id); if (!n || !s.ef) continue;
      if (s.set !== undefined) { B[s.ef] = s.set; continue; }
      if (s.ef === 'submarine_recover') { B.submarine_recover_amount += s.og; B.submarine_recover_area_range += s.b * n; continue; }
      if (s.bio !== undefined) { B.bio[s.bio] += s.b * n; continue; }
      const k = MAP[s.ef] || s.ef.replace(/^total_bonus_/, '');
      B[k] = (B[k] || 0) + (s.b || 0) * n;
    }
    if (B.submarine_recover_all_tanks && !B.submarine_recover_area_range) B.submarine_recover_area_range = 200;
    B.player_slots = Math.round(B.player_slots); B.all_cap = Math.round(B.all_cap);
    B.store_slots = Math.round(B.store_slots); B.trans_slots = Math.round(B.trans_slots); B.sub_slots = Math.round(B.sub_slots);
    for (const inv of ['inv', 'store', 'tin', 'tout', 'sub']) SD.invFit(inv);
    return B;
  };
  SD.b = k => SD.B[k] || 0;

  // ── 인벤토리 (scr_inventory: 같은 id+희귀도끼리 슬롯 용량까지 쌓고 넘치면 빈 슬롯) ────────
  SD.slotsOf = name => ({ inv: SD.B.player_slots, store: SD.B.store_slots, tin: SD.B.trans_slots, tout: SD.B.trans_slots, sub: SD.B.sub_slots }[name]);
  SD.invFit = function (name) {
    const a = SD.S[name] || (SD.S[name] = []); const n = SD.slotsOf(name) || 1;
    while (a.length < n) a.push(null);
    // 슬롯이 줄면(저장 불러오기 등) 뒤쪽 비우기
  };
  SD.invCanAdd = function (name, id, t) {
    const a = SD.S[name], n = SD.slotsOf(name), cap = SD.B.all_cap;
    for (let i = 0; i < n; i++) { const s = a[i]; if (!s || (s.id === id && s.t === t && s.q < cap)) return true; }
    return false;
  };
  // 넣은 수량 반환(넘친 양은 버림)
  SD.invAdd = function (name, id, t, q) {
    const a = SD.S[name], n = SD.slotsOf(name), cap = SD.B.all_cap; let left = q;
    for (let i = 0; i < n && left > 0; i++) { const s = a[i]; if (s && s.id === id && s.t === t && s.q < cap) { const k = Math.min(cap - s.q, left); s.q += k; left -= k; } }
    for (let i = 0; i < n && left > 0; i++) { if (!a[i]) { const k = Math.min(cap, left); a[i] = { id, t, q: k }; left -= k; } }
    return q - left;
  };
  SD.invCount = name => { let c = 0; const a = SD.S[name], n = SD.slotsOf(name); for (let i = 0; i < n; i++) if (a[i]) c += a[i].q; return c; };
  SD.invFull = name => { const a = SD.S[name], n = SD.slotsOf(name); for (let i = 0; i < n; i++) if (!a[i] || a[i].q < SD.B.all_cap) return false; return true; };
  // 첫 번째로 조건 맞는 슬롯에서 1마리 꺼내기
  SD.invTake = function (name, filter) {
    const a = SD.S[name], n = SD.slotsOf(name);
    for (let i = 0; i < n; i++) { const s = a[i]; if (s && s.q > 0 && (!filter || filter(s))) { const r = { id: s.id, t: s.t }; s.q--; if (s.q <= 0) { a.splice(i, 1); a.push(null); } return r; } }
    return null;
  };
  // 한 인벤토리에서 다른 인벤토리로 1마리 (inventory_swap 1회 = 1마리)
  SD.invMove = function (from, to, filter) {
    const a = SD.S[from], n = SD.slotsOf(from);
    for (let i = 0; i < n; i++) { const s = a[i]; if (s && s.q > 0 && (!filter || filter(s)) && SD.invCanAdd(to, s.id, s.t)) { SD.invAdd(to, s.id, s.t, 1); s.q--; if (s.q <= 0) { a.splice(i, 1); a.push(null); } return { id: s.id, t: s.t }; } }
    return null;
  };

  // ── 섬 시설 작업 루프 (o_level_setup_Step_0: 연금술대 → 저장고 → 변환기 → 상점, 같은 step) ──
  const PACE = 0;   // GLOBAL.pace_increment (기본 0)
  SD.events = [];   // 화면 연출용 (판매 +조개 등) — fast 처리 땐 쌓지 않음
  function storeTime(fast) {   // get_store_work_time
    const s = SD.S.store[0]; if (!s || s.q <= 0) return -1;
    let sp = (1 + SD.b('store_sell_speed')) * (1 + PACE / 2); if (fast) sp *= 1 + SD.b('store_expedition_sell_speed_times');
    return Math.ceil(SD.JELLY[s.id].sell * 60 * SD.TYPE[s.t].t / sp);
  }
  let storeTimer = -1, storeExtra = 0, storeCanExtra = true;
  function storeWork(step, fast) {
    if (storeTimer === -1 || SD.S.ending) return;
    SD.S.dSell = Math.min(SD.S.dSell + step, storeTimer);
    if (storeCanExtra && storeExtra > 0) { SD.S.dSell = Math.max(SD.S.dSell, storeTimer - 5); storeCanExtra = false; }
    if (SD.S.dSell >= storeTimer) {
      const s = SD.S.store[0];
      if (Math.random() * 100 <= SD.b('store_transmutate_chance') && transTimer > 0) SD.S.dTrans = Math.max(SD.S.dTrans, transTimer - 1);
      const v = Math.floor(Math.ceil(SD.JELLY[s.id].value * SD.TYPE[s.t].v * (1 + SD.b('jellyfish_value'))) * (1 + PACE));
      SD.S.storeCoins += v;
      if (!fast) SD.events.push({ k: 'sell', v, t: s.t });
      SD.invTake('store');
      storeExtra = Math.max(storeExtra - 1, 0);
      if (Math.random() * 100 <= SD.b('store_extra_sell_chance')) storeExtra = SD.B.bonus_store_extra_sell_amount;
      storeCanExtra = true; SD.S.dSell = 0;
    }
  }
  SD.storeProgress = () => storeTimer > 0 ? SD.S.dSell / storeTimer : 0;
  // 변환기
  const transFilter = s => s.t < SD.B.jellyfish_transmutation_type;
  let transTimer = -1, transSlot = -1, transOutTimer = -1;
  function transTime() {
    if (!SD.lv('jellyfish_transmutator')) return -1;
    transSlot = -1; const a = SD.S.tin, n = SD.B.trans_slots, tt = SD.B.jellyfish_transmutation_type;
    for (let i = 0; i < n; i++) { const s = a[i]; if (s && s.q > 0 && transFilter(s) && SD.invCanAdd('tout', s.id, tt)) { transSlot = i; break; } }
    transOutTimer = -1;
    if (SD.B.transmutator_auto_output && SD.S.tout.some(s => s && s.q > 0 && SD.invCanAdd('store', s.id, s.t))) transOutTimer = Math.ceil(30 / (1 + SD.b('station_output')));
    if (transSlot < 0) { transTimer = -1; return transOutTimer; }
    const s = a[transSlot], sp = (1 + SD.b('transmutate_speed')) * (1 + PACE / 2);
    transTimer = Math.ceil(SD.JELLY[s.id].sell * 60 * (1 + SD.TYPE[tt].tt - SD.TYPE[s.t].tt) / 3000 / sp);
    return transOutTimer > 0 ? Math.min(transOutTimer, transTimer) : transTimer;
  }
  function transWork(step, fast) {
    if (transOutTimer > 0) {
      SD.S.dTransOut = Math.min(SD.S.dTransOut + step, transOutTimer);
      if (SD.S.dTransOut >= transOutTimer) { if (SD.invMove('tout', 'store')) { if (!fast) SD.events.push({ k: 'fly', from: 'trans', to: 'store' }); } SD.S.dTransOut = 0; }
    }
    if (transTimer < 0) return;
    SD.S.dTrans = Math.min(SD.S.dTrans + step, transTimer);
    if (SD.S.dTrans >= transTimer) {
      if (Math.random() * 100 <= SD.b('store_transmutate_sell_chance') && storeTimer > 0) SD.S.dSell = Math.max(SD.S.dSell, storeTimer - 1);
      const s = SD.S.tin[transSlot];
      if (s) { SD.invAdd('tout', s.id, SD.B.jellyfish_transmutation_type, 1); s.q--; if (s.q <= 0) { SD.S.tin.splice(transSlot, 1); SD.S.tin.push(null); } if (!fast) SD.events.push({ k: 'trans' }); }
      SD.S.dTrans = 0;
    }
  }
  SD.transProgress = () => transTimer > 0 ? SD.S.dTrans / transTimer : 0;
  SD.transFilter = transFilter;
  // 잠수함 저장고 자동 출력: 변환기 대상 먼저, 아니면 상점
  let subOutTimer = -1, subTarget = null;
  function subTime() {
    subOutTimer = -1; subTarget = null;
    if (!SD.B.storage_auto_output || !SD.B.submarine_storage) return -1;
    for (const s of SD.S.sub) {
      if (!s || s.q <= 0) continue;
      if (SD.lv('jellyfish_transmutator') && transFilter(s) && SD.invCanAdd('tin', s.id, s.t)) { subTarget = 'tin'; break; }
      if (SD.invCanAdd('store', s.id, s.t)) { subTarget = 'store'; break; }
    }
    if (!subTarget) return -1;
    return (subOutTimer = Math.ceil(30 / (1 + SD.b('station_output'))));
  }
  function subWork(step, fast) {
    if (subOutTimer < 0) return;
    SD.S.dSubOut = Math.min(SD.S.dSubOut + step, subOutTimer);
    if (SD.S.dSubOut >= subOutTimer) {
      const f = subTarget === 'tin' ? s => transFilter(s) && SD.invCanAdd('tin', s.id, s.t) : s => SD.invCanAdd('store', s.id, s.t);
      if (SD.invMove('sub', subTarget, f) && !fast) SD.events.push({ k: 'fly', from: 'sub', to: subTarget === 'tin' ? 'trans' : 'store' });
      SD.S.dSubOut = 0;
    }
  }
  // 연금술대: 조개 1e14 → 물약 1 (3840프레임), 두 배 확률
  SD.FLASK_PRICE = 1e14; SD.FLASK_TIME = 3840;
  let alchTimer = -1;
  function alchTime() {
    if (!SD.B.alchemy_station || SD.S.alchemyShell <= 0) return (alchTimer = -1);
    return (alchTimer = Math.ceil(SD.FLASK_TIME / ((1 + SD.b('alchemy_speed')) * (1 + PACE / 2))));
  }
  function alchWork(step, fast) {
    if (alchTimer < 0) return;
    SD.S.dAlch = Math.min(SD.S.dAlch + step, alchTimer);
    if (SD.S.dAlch >= alchTimer) {
      const n = 1 + (Math.random() * 100 <= SD.b('alchemy_double_chance') ? 1 : 0);
      SD.S.flaskCoins += n; SD.S.alchemyShell = Math.max(0, SD.S.alchemyShell - SD.FLASK_PRICE); SD.S.dAlch = 0;
      if (!fast) SD.events.push({ k: 'flask', n });
    }
  }
  SD.alchProgress = () => alchTimer > 0 ? SD.S.dAlch / alchTimer : 0;
  // 한 프레임: budget = 바다에서 쌓인 프레임. 다음 이벤트까지 큰 걸음으로 몰아서 처리
  SD.islandStep = function () {
    let budget = SD.S.simFrames;
    for (let guard = 0; guard < 100000; guard++) {
      let step = Math.max(1, budget); const fast = step > 1; let any = false;
      for (const t of [alchTime(), subTime(), transTime(), (storeTimer = storeTime(fast))]) if (t > -1) { step = Math.min(t, step); any = true; }
      step = Math.max(step, 1);
      alchWork(step, fast); subWork(step, fast); transWork(step, fast); storeWork(step, fast);
      if (fast) budget -= step;
      if (!any) budget = 0;
      if (budget <= 0) break;
    }
    SD.S.simFrames = 0;
  };

  // 숫자 표기 (abbreviate_number 비슷하게: 만/억/조…)
  const U = ['', '만', '억', '조', '경', '해', '자', '양', '구', '간'];
  SD.fmt = function (n) {
    if (!isFinite(n)) return '∞';
    n = Math.floor(n); if (n < 10000) return String(n);
    let i = 0; while (n >= 10000 && i < U.length - 1) { n /= 10000; i++; }
    return (n >= 100 ? Math.floor(n) : n >= 10 ? Math.floor(n * 10) / 10 : Math.floor(n * 100) / 100) + U[i];
  };
})();
