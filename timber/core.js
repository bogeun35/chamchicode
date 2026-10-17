/* timber/core.js — 팀버 러시 이식: 데이터·스탯 엔진·메타 시스템·저장
 * 원작(Timber Rush, Unity) 코드 구조를 그대로 따름. 근거: game-re-tools/timberrush/spec.md */
'use strict';
const D = window.TR_DATA;
const ST = D.stats;
// StatType (원작 enum 순서)
const T = { None: 0, MagnetRadius: 1, DroneAmount: 2, DroneSpeed: 3, GoldMult: 4, LogValueMult: 5, Damage: 6, CritChance: 7, CritDamage: 8, AttackSpeed: 9, AttackDistance: 10, MoveSpeed: 11, ExtraJump: 12, Luck: 13, ChestRate: 14, LjAmount: 15, LjSpeed: 16, LjDamage: 17, CoinAmount: 18, CoinSpawnChance: 19, ExpMult: 20, TimeExtension: 21,
  LightningUnl: 22, MagmaUnl: 23, GoldenUnl: 24, ArcaneUnl: 25, MagnetUnl: 26, CrystalUnl: 27, LightningChance: 28, MagmaChance: 29, GoldenChance: 30, ArcaneChance: 31, MagnetChance: 32, CrystalChance: 33, LightningDmgMult: 34, MagmaDmgMult: 35, MagmaDuration: 36, GoldenDuration: 37, ArcaneDuration: 38, CrystalDuration: 39, MagnetCollectChest: 40, MagnetCollectSpecial: 41,
  LevelUpReroll: 42, LevelUpChoices: 43, ChestChoices: 44, LjCritChance: 45, LjCritDamage: 46, GuaranteedFirstRarity: 47, DashUnl: 48, DashCooldown: 49, DoubleLogChance: 50, DmgPerLevel: 51, DmgPerDrone: 52, DmgPerSpecial: 53, DmgPerLj: 54, AutoCollectChance: 55, AutoCollectDouble: 56, DroneCollectChests: 57, DroneCollectSpecial: 58,
  DamagePotDur: 59, CCPotDur: 60, CDPotDur: 61, DamagePotUnl: 62, DamagePotChance: 63, CCPotUnl: 64, CCPotChance: 65, CDPotUnl: 66, CDPotChance: 67, DoubleCoinChance: 68, LogToCoin: 69, RubyUnl: 70, RubyChance: 71, DiamondUnl: 72, DiamondChance: 73, SpecialLogsUnl: 74, PotionsUnl: 75, LumberjacksUnl: 76,
  ChainUnl: 77, ChainCount: 78, ChainValueMult: 79, DetonationUnl: 80, DetonationMult: 81, DroneDirUnl: 82, DroneCrateSpeed: 83, LightningCd: 84, MagmaCd: 85, GoldenCd: 86, ArcaneCd: 87, MagnetCd: 88, CrystalCd: 89, DamagePotCd: 90, CCPotCd: 91, CDPotCd: 92, LjPlayerDmgPct: 93, LjPlayerCCPct: 94, LjPlayerCDPct: 95, LjPlayerASPct: 96, FinishGame: 97, BanishCount: 98 };
// PrestigeEffect 플래그
const PFX = { DoubleAxeStats: 1, StrongerCards: 2, HeavyAxes: 4, DoubleIncome: 8, MythicalCards: 16, PlayerEcho: 32, OverflowCrit: 64, ElementalEcho: 128, GhostCrew: 256, Treasurebound: 512, DeathlessHarvest: 1024, TripleChar: 2048 };
// AchievementStatType
const A = { TotalLogs: 0, TotalCoins: 1, TotalDamage: 2, TotalRuns: 3, TotalSpecialLogs: 4, TotalChests: 5, TotalLevels: 6, TotalDrones: 7, HighestSingleDamage: 8, HighestLogs: 9, TotalCrits: 10, TotalCritDamage: 11, LightningLogs: 12, MagmaLogs: 13, GoldenLogs: 14, ArcaneLogs: 15, FreezeLogs: 16, TotalLogsSpent: 17, TotalCoinsSpent: 18, TotalTimeInRuns: 19, HighestLevel: 20, TotalLightningDamage: 21, TotalMagmaDamage: 22, HighestMagnetRadius: 23, HighestCritChance: 24, HighestAttackSpeed: 25, TotalLjDamage: 26, TotalPurchases: 27, HighestLuck: 28, HighestLjAmount: 29, Completionist: 30, CelestialAxe: 31, SwampUnlocked: 32, CemeteryUnlocked: 33, WildFireUnlocked: 34 };
const RARITY_NAME = ['일반', '고급', '희귀', '에픽', '전설'];
const RARITY_COLOR = ['#ffffff', '#4ccc66', '#4d80e6', '#b34de6', '#ff9933'];
const ADD = 0, MUL = 1;
const CAPS = { 1: 12, 11: 30, 3: 30 }; // GameplayStatCaps
const HARD_DEFAULT = { 2: 2, 15: 4 };    // 드론·나무꾼은 씬 상한(크레이트 수는 원작 제한 없음, 나무꾼 액터 4개)

// ---------- 숫자 ----------
function fin(v) { return Number.isNaN(v) ? 0 : v === Infinity ? Number.MAX_VALUE : v === -Infinity ? -Number.MAX_VALUE : v; }
function nn(v) { return Math.max(0, fin(v)); }
function approx(a, b) { return Math.abs(a - b) <= Math.max(1.12e-44, 1e-6 * Math.max(Math.abs(a), Math.abs(b))); }
function rnd(a, b) { return a + Math.random() * (b - a); }
function fmt(v, roundUnder1000 = true) {
  if (Number.isNaN(v)) return '0'; if (v === Infinity) return 'INF';
  if (v > -1000 && v < 1000) return roundUnder1000 ? String(Math.round(v)) : v.toFixed(2);
  let g = Math.floor(Math.log10(Math.abs(v)) / 3); if (g < 0) g = 0;
  const n = v / Math.pow(1000, g); const s = g <= 0 ? '' : ['', 'k', 'm', 'b', 't', 'q'][g] || ('e' + g * 3);
  return (Math.abs(n) >= 100 ? n.toFixed(0) : Math.abs(n) >= 10 ? n.toFixed(1) : n.toFixed(2)) + s;
}
function fmtD(v) { return v.toFixed(2); }
function pct(v) { const s = (v * 100).toFixed(2).replace(/\.?0+$/, ''); return s + '%'; }
function fmtNum2(v) { return (+v.toFixed(2)).toString(); }
// 확률 반올림 (ApplyMultiplier)
function probMul(base, mult) {
  if (base <= 0) return 0; const n = nn(base) * nn(mult); if (n >= Number.MAX_VALUE) return Number.MAX_VALUE;
  let f = Math.floor(n); if (Math.random() < n - f) f += 1; return f < 0 ? 0 : f;
}
// 카드·툴팁용 값 표기 (TestStats_Dev.BuildModifierText)
function modText(type, value, mt) {
  const name = ST[type].name; const sg = value >= 0 ? '+' : '';
  if (type === T.CritChance || type === T.CritDamage) return `${name} ${sg}${fmtNum2(value * 100)}%`;
  if (mt === MUL) { const n = (value - 1) * 100; return `${name} ${n >= 0 ? '+' : ''}${fmtNum2(n)}%`; }
  return `${name} ${sg}${fmtNum2(value)}`;
}
function statValText(type, v) {
  const d = ST[type]; if (!d) return fmtNum2(v);
  return d.disp === 0 ? pct(v) : fmtNum2(v);
}

// ---------- 저장 ----------
const SAVE_KEY = 'timber_save_v1';
function fresh() {
  return { v: 1, logs: 0, coins: 0, tree: {}, ownAxes: ['CrudeAxe'], ownChars: ['Lumberjack'], axe: 'CrudeAxe', char: 'Lumberjack', level: 'Forest', axeUp: {}, crew: [null, null, null, null],
    pre: { count: 0, pts: 0, sel: [] }, achG: {}, achP: {}, toasts: [], set: { auto: false, shake: true, nums: true }, runs: 0, finished: false, tut: false, savedAt: 0 };
}
let S = fresh();
function load() { try { const v = JSON.parse(localStorage.getItem(SAVE_KEY) || 'null'); if (v && typeof v === 'object') S = Object.assign(fresh(), v); } catch (e) { S = fresh(); } S.set = Object.assign(fresh().set, S.set || {}); if (!Array.isArray(S.crew) || S.crew.length < 4) S.crew = [null, null, null, null]; }
function save() { try { S.savedAt = Date.now(); localStorage.setItem(SAVE_KEY, JSON.stringify(S)); } catch (e) {} }

// ---------- 업적 ----------
const Ach = {
  get(stat, scope = 0) { return (scope === 1 ? S.achP : S.achG)[stat] || 0; },
  set(stat, v) { S.achG[stat] = nn(v); S.achP[stat] = nn(v); Ach.changed(stat); },
  add(stat, d) { if (!(d > 0)) return; S.achG[stat] = nn((S.achG[stat] || 0) + d); S.achP[stat] = nn((S.achP[stat] || 0) + d); Ach.changed(stat); },
  highest(stat, c) { let ch = false; if (c > (S.achG[stat] || 0)) { S.achG[stat] = c; ch = true; } if (c > (S.achP[stat] || 0)) { S.achP[stat] = c; ch = true; } if (ch) Ach.changed(stat); },
  meets(reqs, scope = 0) { return (reqs || []).every(q => Ach.get(q[0], scope) >= q[1]); },
  changed(stat) { Ach.onChanged && Ach.onChanged(stat); },
  round(v) { return Math.max(0, Math.round(fin(v))); },
};

// ---------- 스탯 엔진 (Stats.cs) ----------
class Stats {
  constructor() { this.b = { perm: [], prestige: [], equip: [], crew: [], tree: [], run: [], buff: [] }; this.cache = new Map(); this.dirty = true; this.pfx = 0; this.finale = false; }
  static mod(type, rarity, value, mt, myth = false) { return { type, rarity, value: fin(value), mt, myth }; }
  has(f) { return (this.pfx & f) === f; }
  get runDmgMult() { return this.finale ? 3 : 1; }
  mark() { this.dirty = true; }
  add(bk, m) {
    if (!m || m.type == null || !ST[m.type]) return; const list = this.b[bk];
    const ex = list.find(x => x.type === m.type && x.rarity === m.rarity && x.myth === m.myth && x.mt === m.mt);
    if (!ex) list.push(m); else if (m.mt === ADD) ex.value = fin(ex.value + m.value); else ex.value = fin(ex.value + ex.value * (m.value - 1));
    this.mark();
  }
  push(bk, m) { this.b[bk].push(m); this.mark(); } // 병합 없이 (버프)
  remove(bk, m) { const i = this.b[bk].indexOf(m); if (i >= 0) { this.b[bk].splice(i, 1); this.mark(); } }
  clear(bk) { this.b[bk].length = 0; this.mark(); }
  setPrestige(mods, fx) { this.pfx = fx; this.b.prestige = mods.slice(); this.mark(); }
  agg(type, list, acc) { for (const m of list) if (m.type === type) { if (m.mt === ADD) acc.a = fin(acc.a + m.value); else acc.m = fin(acc.m * m.value); } }
  get(type) { if (this.dirty) { this.cache.clear(); this.dirty = false; } if (this.cache.has(type)) return this.cache.get(type); const v = this.compute(type); this.cache.set(type, v); return v; }
  raw(type) { return this.compute(type, { derived: false }); }
  unlocked(type) { return this.get(type) > 0.5; }
  compute(type, o = {}) {
    const derived = o.derived !== false; const def = ST[type];
    let base = type === T.BanishCount ? 0 : 1; if (def) base = def.base;
    const acc = { a: 0, m: 1 };
    this.agg(type, this.b.perm, acc); this.agg(type, this.b.prestige, acc); this.agg(type, this.b.equip, acc); this.agg(type, this.b.crew, acc);
    const t = { a: 0, m: 1 }; this.agg(type, this.b.tree, t);
    if (o.treeChanges) for (const c of o.treeChanges) if (c[0] === type) { if (c[2] === ADD) t.a += c[1]; else t.m += c[1] - 1; }
    acc.a += t.a; acc.m *= t.m;
    this.agg(type, this.b.run, acc); this.agg(type, this.b.buff, acc);
    if (o.preview) { if (o.preview.mt === MUL) acc.m *= o.preview.value; else acc.a += o.preview.value; }
    if (o.changes) for (const c of o.changes) if (c[0] === type) { if (c[2] === MUL) acc.m *= c[1]; else acc.a += c[1]; }
    let v = (base + acc.a) * acc.m;
    if (derived && type === T.Damage) v *= this.runDmgMult;
    if (derived && type === T.CritDamage && this.has(PFX.OverflowCrit)) v = this.overflowCrit(v, this.compute(T.CritChance, { derived: false, changes: o.changes, treeChanges: o.treeChanges }));
    v = fin(v); return CAPS[type] != null ? Math.min(v, CAPS[type]) : v;
  }
  overflowCrit(cd, cc) { return nn(cd * (this.has(PFX.OverflowCrit) ? Math.max(1, cc) : 1)); }
  preview(m) { return this.compute(m.type, { preview: m }); }
  previewTree(type, changes) { return this.compute(type, { treeChanges: changes }); }
}
const stats = new Stats();
function atCap(type, v) { return CAPS[type] != null && (v >= CAPS[type] || approx(v, CAPS[type])); }

// ---------- 장비 (EquipmentStatResolver) ----------
const AXES = Object.fromEntries(D.axes.map(a => [a.key, a])); const CHARS = Object.fromEntries(D.chars.map(c => [c.key, c])); const LEVELS = Object.fromEntries(D.levels.map(l => [l.key, l]));
const Equip = {
  scaleChar(e) { if (!stats.has(PFX.TripleChar)) return e; return [e[0], fin(e[2] === MUL ? 1 + (e[1] - 1) * 3 : e[1] * 3), e[2]]; },
  charEntries(c) { return c ? c.stats.map(Equip.scaleChar) : []; },
  charStat(c, type, base) { let a = 0, m = 1; for (const e of Equip.charEntries(c)) if (e[0] === type) { if (e[2] === MUL) m *= e[1]; else a += e[1]; } return fin((base + a) * m); },
  axeUpEntries(axe) {
    const st = S.axeUp[axe.key]; if (!st) return []; const out = []; const seen = new Set();
    for (const p of axe.per) { const n = st.alloc[p[0]] || 0; if (p[0] && !seen.has(p[0]) && n > 0) { out.push([p[0], p[2] === MUL ? Math.pow(p[1], n) : p[1] * n, p[2]]); seen.add(p[0]); } }
    return out;
  },
  axeContrib(axe, type, withUp = true) {
    let a = 0, m = 1, has = type === T.Damage || type === T.CritChance || type === T.CritDamage;
    const acc = list => { for (const e of list) if (e[0] === type) { has = true; if (e[2] === MUL) m *= e[1]; else a += e[1]; } };
    acc(axe.stats); if (withUp) acc(Equip.axeUpEntries(axe));
    if (has && type !== T.AttackSpeed && stats.has(PFX.DoubleAxeStats)) a = fin((ST[type] ? ST[type].base : 0) + 2 * a);
    if (stats.has(PFX.HeavyAxes)) { if (type === T.Damage) m *= 4; if (type === T.AttackSpeed) m *= 0.5; }
    return { a, m };
  },
  axeStat(axe, type, base, withUp = true) { if (!axe) return base; const c = Equip.axeContrib(axe, type, withUp); return fin((base + c.a) * c.m); },
  axeEntries(axe) {
    if (!axe) return []; const types = new Set([T.Damage, T.CritChance, T.CritDamage, T.AttackSpeed]); axe.stats.forEach(e => types.add(e[0])); Equip.axeUpEntries(axe).forEach(e => types.add(e[0]));
    const out = []; for (const t of types) { const c = Equip.axeContrib(axe, t, true); if (c.a !== 0) out.push([t, c.a, ADD]); if (c.m !== 1) out.push([t, c.m, MUL]); } return out;
  },
  apply() {
    stats.clear('equip');
    const put = list => { for (const e of list) if (ST[e[0]]) stats.add('equip', Stats.mod(e[0], 0, e[1], e[2])); };
    put(Equip.charEntries(CHARS[S.char])); put(Equip.axeEntries(AXES[S.axe])); put((LEVELS[S.level] || LEVELS.Forest).stats);
  },
};

// ---------- 도끼 강화 (AxeUpgradeManager) ----------
const AxeUp = {
  st(axe) { let s = S.axeUp[axe.key]; if (!s) s = S.axeUp[axe.key] = { pts: 0, alloc: {} }; AxeUp.sanitize(axe, s); return s; },
  maxFor(axe, type) { return axe.per.filter(p => p[0] === type).reduce((n, p) => n + Math.max(0, p[3]), 0); },
  maxPts(axe) { return axe.per.reduce((n, p) => n + Math.max(0, p[3]), 0); },
  allocTotal(s) { return Object.values(s.alloc).reduce((n, v) => n + Math.max(0, v), 0); },
  sanitize(axe, s) {
    s.pts = Math.min(Math.max(0, s.pts), AxeUp.maxPts(axe));
    for (const k of Object.keys(s.alloc)) { const v = Math.min(Math.max(0, s.alloc[k]), AxeUp.maxFor(axe, +k)); if (v <= 0) delete s.alloc[k]; else s.alloc[k] = v; }
    let over = AxeUp.allocTotal(s) - s.pts;
    if (over > 0) for (const [k, v] of Object.entries(s.alloc).sort((x, y) => y[1] - x[1])) { if (over <= 0) break; const d = Math.min(v, over); s.alloc[k] = v - d; if (s.alloc[k] <= 0) delete s.alloc[k]; over -= d; }
  },
  unspent(axe) { const s = AxeUp.st(axe); return Math.max(0, s.pts - AxeUp.allocTotal(s)); },
  quote(axe, buyMax) { const rem = Math.max(0, AxeUp.maxPts(axe) - AxeUp.st(axe).pts); return quotePoints(axe.ptCost, rem, S.coins, buyMax); },
  buy(axe, buyMax) { const q = AxeUp.quote(axe, buyMax); if (q.count <= 0 || !Cur.spendCoins(q.cost)) return false; AxeUp.st(axe).pts += q.count; AxeUp.changed(); return true; },
  setAlloc(axe, type, n) {
    const s = AxeUp.st(axe); n = Math.min(Math.max(0, n), AxeUp.maxFor(axe, type)); const cur = s.alloc[type] || 0; if (n === cur) return true;
    const others = AxeUp.allocTotal(s) - cur; if (n > s.pts - others) return false; if (n <= 0) delete s.alloc[type]; else s.alloc[type] = n; AxeUp.changed(); return true;
  },
  changed() { save(); Equip.apply(); Crew.rebuild(); AxeUp.onChanged && AxeUp.onChanged(); },
};
function quotePoints(unit, remaining, balance, buyMax) {
  remaining = Math.max(0, remaining); if (!remaining || !Number.isFinite(unit)) return { count: 0, cost: 0 };
  unit = Math.max(0, unit); balance = nn(balance); const want = buyMax ? remaining : 1;
  let n = unit === 0 ? want : Math.min(want, Math.floor(balance / unit)); let cost = unit * n;
  if (n > 0 && cost > balance) { n--; cost = unit * n; } return { count: n, cost: n > 0 ? cost : unit };
}

// ---------- 재화 (LevelAndCurrencyManager) ----------
const Cur = {
  spendCoins(a) { if (!Number.isFinite(a)) return false; if (a <= 0) return true; if (S.coins < a) return false; S.coins -= a; Ach.add(A.TotalCoinsSpent, a); Cur.changed(); return true; },
  spendLogs(a) { if (!Number.isFinite(a)) return false; if (a <= 0) return true; if (S.logs < a) return false; S.logs -= a; Ach.add(A.TotalLogsSpent, a); Cur.changed(); return true; },
  changed() { Cur.onChanged && Cur.onChanged(); },
};

// ---------- 구매·장착 (PurchaseManager / EquipmentManager) ----------
const Shop = {
  owned(item) { return item.ptCost != null ? S.ownAxes.includes(item.key) : S.ownChars.includes(item.key); },
  isAxe(item) { return item.ptCost != null; },
  meetsReq(item) { return Ach.meets(item.req, 1); },
  buy(item, autoEquip = true) {
    if (Shop.owned(item)) return true; if (!Shop.meetsReq(item) || S.coins < Math.max(0, item.cost)) return false;
    Cur.spendCoins(item.cost); (Shop.isAxe(item) ? S.ownAxes : S.ownChars).push(item.key); Ach.add(A.TotalPurchases, 1);
    if (item.key === 'CelestialAxe') Ach.set(A.CelestialAxe, 1);
    if (autoEquip) Shop.equip(item); else save(); return true;
  },
  equip(item) {
    if (!Shop.owned(item) && !Shop.buy(item, false)) return false;
    if (Shop.isAxe(item)) S.axe = item.key; else S.char = item.key; save(); Equip.apply(); Shop.onChanged && Shop.onChanged(); return true;
  },
  setLevel(key) { S.level = key; save(); Equip.apply(); },
  levelUnlocked(l) { return Ach.meets(l.req, 1); },
};

// ---------- 크루 (LumberjackManager + CrewGlobalStatsManager + LumberjackManagerUI 규칙) ----------
const Crew = {
  count() { return Math.max(0, Math.round(stats.get(T.LjAmount))); },
  // i번 나무꾼의 (캐릭터, 도끼) — 저장된 것 없으면 활성 슬롯은 기본 장비
  gear(i) { const s = S.crew[i]; if (s && (s.c || s.a)) return { c: CHARS[s.c] || null, a: AXES[s.a] || null }; if (i < Crew.count()) return { c: CHARS.Lumberjack, a: AXES.CrudeAxe }; return { c: null, a: null }; },
  hasGear(i) { const g = Crew.gear(i); return !!(g.c || g.a); },
  set(i, c, a) { S.crew[i] = { c: c ? c.key : '', a: a ? a.key : '' }; save(); Crew.rebuild(); Crew.onChanged && Crew.onChanged(); },
  // 기본 장비가 아닌 것은 한 명만 착용: 다른 슬롯에서 해제
  equipTo(slot, item) { // slot -1 = 플레이어
    const isAxe = Shop.isAxe(item); const def = isAxe ? AXES.CrudeAxe : CHARS.Lumberjack;
    if (item !== def) {
      if (slot !== -1 && (isAxe ? S.axe : S.char) === item.key) { if (isAxe) S.axe = def.key; else S.char = def.key; }
      for (let i = 0; i < 4; i++) if (i !== slot) { const g = Crew.gear(i); if ((isAxe ? g.a : g.c) === item) Crew.set(i, isAxe ? g.c : def, isAxe ? def : g.a); }
    }
    if (slot === -1) return Shop.equip(item);
    const g = Crew.gear(slot); Crew.set(slot, isAxe ? (g.c || CHARS.Lumberjack) : item, isAxe ? item : (g.a || AXES.CrudeAxe)); Equip.apply(); Shop.onChanged && Shop.onChanged(); return true;
  },
  rebuild() {
    stats.clear('crew'); const W = new Set(D.crew.white), F = new Set(D.crew.full), coef = Math.max(0, D.crew.coef);
    const put = e => { if (!W.has(e[0]) || !ST[e[0]]) return; const full = F.has(e[0]); const k = full ? 1 : coef; if (k <= 0 && !full) return; let v; if (e[2] === MUL) { v = full ? e[1] : 1 + (e[1] - 1) * k; if (approx(v, 1)) return; } else { v = full ? e[1] : e[1] * k; if (approx(v, 0)) return; } stats.add('crew', Stats.mod(e[0], 0, v, e[2])); };
    for (let i = 0; i < 4; i++) { if (!Crew.hasGear(i)) continue; const g = Crew.gear(i); Equip.charEntries(g.c).forEach(put); Equip.axeEntries(g.a).forEach(put); }
  },
  // 나무꾼 전투 스탯 (LumberjackActor.GetCombatStat)
  equipStat(i, type, fallback) { const g = Crew.gear(i); let base = ST[type] ? ST[type].base : fallback; base = Equip.charStat(g.c, type, base); return Equip.axeStat(g.a, type, base); },
  combat(i, type, playerScaledDamage) {
    const eq = Crew.equipStat(i, type, type === T.CritChance ? 0 : 1);
    switch (type) {
      case T.Damage: { const p = Math.max(0, stats.get(T.LjPlayerDmgPct)); return nn(eq * Math.max(0, stats.get(T.LjDamage)) * stats.runDmgMult + (p > 0 ? playerScaledDamage * p : 0)); }
      case T.AttackSpeed: { const p = Math.max(0, stats.get(T.LjPlayerASPct)); return Math.max(0.01, eq * Math.max(0.01, stats.get(T.LjSpeed)) + (p > 0 ? stats.get(T.AttackSpeed) * p : 0)); }
      case T.CritChance: { const p = Math.max(0, stats.get(T.LjPlayerCCPct)); return Math.max(0, eq + Math.max(0, stats.get(T.LjCritChance)) + (p > 0 ? stats.get(T.CritChance) * p : 0)); }
      case T.CritDamage: { const p = Math.max(0, stats.get(T.LjPlayerCDPct)); const v = Math.max(1, eq) + Math.max(1, stats.get(T.LjCritDamage)) - 1 + (p > 0 ? stats.raw(T.CritDamage) * p : 0); return stats.overflowCrit(v, Crew.combat(i, T.CritChance, playerScaledDamage)); }
      default: return eq;
    }
  },
};

// ---------- 스킬 트리 (SkillTreeManager) ----------
const NODES = D.nodes; const NODE = Object.fromEntries(NODES.map(n => [n.id, n]));
const Tree = {
  lv(id) { return S.tree[id] || 0; },
  levelData(n, lv) { if (!n.lv.length) return { ch: [], cost: 0 }; return n.lv[Math.min(Math.max(lv - 1, 0), n.lv.length - 1)]; },
  visible(n) { return !n.pre.length || n.pre.some(p => Tree.lv(p) > 0); },
  reqOk(n) { return !n.req.length || Ach.meets(n.req, n.scope); },
  quote(n, buyMax) {
    const cur = Tree.lv(n.id); const rem = Math.max(0, Math.max(1, n.max) - cur); const want = buyMax ? rem : Math.min(1, rem); let total = 0; const bal = nn(S.logs);
    for (let i = 0; i < want; i++) { const c = Tree.levelData(n, cur + i + 1).cost; const nt = total + c; if (!Number.isFinite(c) || nt > bal) return { count: i, cost: i > 0 ? total : c }; total = nt; }
    return { count: want, cost: total };
  },
  canAffordNext(n) { const cur = Tree.lv(n.id); if (cur >= Math.max(1, n.max)) return true; return S.logs >= Tree.levelData(n, cur + 1).cost; },
  state(n) { const lv = Tree.lv(n.id), max = Math.max(1, n.max), vis = Tree.visible(n); return { lv, max, vis, unlocked: vis && lv < max, reqOk: Tree.reqOk(n) }; },
  buy(n, buyMax = false) {
    const lv = Tree.lv(n.id); if (lv >= Math.max(1, n.max)) return '이미 최대입니다.'; if (!n.pre.length ? false : !n.pre.some(p => Tree.lv(p) > 0)) return '선행 노드가 필요합니다.';
    if (!Tree.reqOk(n)) return '잠겨 있습니다.'; const q = Tree.quote(n, buyMax); if (q.count === 0) return '통나무가 부족합니다.';
    if (q.cost > 0 && !Cur.spendLogs(q.cost)) return '통나무가 부족합니다.';
    S.tree[n.id] = lv + q.count; save(); Tree.apply();
    if (n.lv.some(l => l.ch.some(c => c[0] === T.FinishGame)) && stats.unlocked(T.FinishGame)) { S.finished = true; save(); Tree.onFinish && Tree.onFinish(); }
    if (n.lv.some(l => l.ch.some(c => c[0] === T.LjAmount))) Ach.highest(A.HighestLjAmount, Math.max(0, Math.round(stats.get(T.LjAmount))));
    if (Ach.get(A.Completionist, 1) <= 0 && NODES.every(x => Tree.lv(x.id) >= Math.max(1, x.max))) Ach.set(A.Completionist, 1);
    Tree.onChanged && Tree.onChanged(); return '';
  },
  // 레벨 데이터 선형 합산 → 가산 1개 + 승산(1+합) 1개
  totals(extra) {
    const acc = {}; const addLv = l => { for (const c of l.ch) { const a = acc[c[0]] || (acc[c[0]] = { a: 0, m: 0 }); if (c[2] === ADD) a.a += c[1]; else a.m += c[1] - 1; } };
    for (const [id, lv] of Object.entries(S.tree)) { const n = NODE[id]; if (!n || lv <= 0) continue; for (let j = 1; j <= lv; j++) addLv(Tree.levelData(n, j)); }
    if (extra) extra.forEach(addLv); return acc;
  },
  apply() {
    stats.clear('tree');
    for (const [type, v] of Object.entries(Tree.totals())) { if (!ST[type]) continue; if (Math.abs(v.a) > 1.4e-45) stats.add('tree', Stats.mod(+type, 0, v.a, ADD)); if (Math.abs(v.m) > 1.4e-45) stats.add('tree', Stats.mod(+type, 0, 1 + v.m, MUL)); }
    Crew.rebuild();
  },
  // 툴팁 기여도 (SkillTooltip.FormatContribution)
  contribText(n, c) {
    const d = n.stat != null ? ST[n.stat] : null;
    if (n.dmod === ADD) { let v = Math.round(c.a * 10) / 10; if (n.incBase && d) v += d.base; return approx(v, Math.round(v)) ? String(Math.round(v)) : v.toFixed(1); }
    let p = ((1 + c.a) * (1 + c.m) - 1) * 100; if (n.incBase && d) p += d.base * 100; return fmtNum2(p) + '%';
  },
  statsText(n, previewLv) {
    if (!n.show || n.stat == null) return ''; const st = Tree.state(n); const d = ST[n.stat];
    if (n.stat === T.CrystalDuration || n.stat === T.GoldenDuration || n.stat === T.ArcaneDuration) {
      let s = `${d.type}: <b class="cur">${fmtNum2(stats.get(n.stat))}</b>`;
      if (st.lv < st.max) { const ch = []; for (let i = st.lv; i < previewLv; i++) ch.push(...Tree.levelData(n, i + 1).ch); s += ` → <b class="nxt">${fmtNum2(stats.previewTree(n.stat, ch))}</b>`; } return s;
    }
    const types = new Set(); n.lv.forEach(l => l.ch.forEach(c => types.add(c[0]))); if (!types.size) return '';
    const cur = Tree.totals(); const nxtLv = []; for (let j = st.lv; j < previewLv; j++) nxtLv.push(Tree.levelData(n, j + 1)); const nxt = Tree.totals(nxtLv);
    const ld = st.lv < st.max ? Tree.levelData(n, previewLv) : Tree.levelData(n, st.lv);
    const out = [];
    for (const t of types) { const c1 = cur[t] || { a: 0, m: 0 }, c2 = nxt[t] || { a: 0, m: 0 };
      const t4 = (st.lv >= st.max && ld.nxt) ? ld.nxt : (ld.cur ? ld.cur : Tree.contribText(n, c1));
      let s = `${d.type}: <b class="cur">${t4}</b>`; if (st.lv < st.max) s += ` → <b class="nxt">${ld.nxt ? ld.nxt : Tree.contribText(n, c2)}</b>`; out.push(s); }
    return out.join('<br>');
  },
};

// ---------- 환생 (PrestigeManager) ----------
const PRE = D.prestige; const PREBY = Object.fromEntries(PRE.map(p => [p.id, p]));
const Prestige = {
  POINTS: 9,
  can() { return Tree.lv('logOffering') > 0; },
  apply() {
    const mods = []; let fx = 0; const seen = new Set();
    for (const id of S.pre.sel) { const p = PREBY[id]; if (!p || seen.has(id)) continue; seen.add(id); fx |= p.fx; for (const m of p.mods) if (ST[m[0]]) mods.push(Stats.mod(m[0], 0, m[1], m[2])); }
    stats.setPrestige(mods, fx); Equip.apply(); Crew.rebuild();
  },
  draft: null,
  begin() { Prestige.draft = { sel: new Set(S.pre.sel.filter(id => PREBY[id])), budget: S.pre.pts + Prestige.POINTS }; },
  cost() { let c = 0; for (const id of Prestige.draft.sel) c += PREBY[id].cost; return c; },
  remaining() { return Prestige.draft.budget - Prestige.cost(); },
  canSelect(p) { return Prestige.draft.sel.has(p.id) || p.cost <= Prestige.remaining(); },
  toggle(p) { const d = Prestige.draft; if (d.sel.has(p.id)) d.sel.delete(p.id); else if (Prestige.canSelect(p)) d.sel.add(p.id); },
  confirm() {
    if (!Prestige.draft || !Prestige.can() || Prestige.remaining() < 0) return false;
    const keep = { set: S.set, achG: S.achG, toasts: S.toasts, runs: S.runs, tut: S.tut };
    const pre = { count: S.pre.count + 1, pts: Prestige.draft.budget, sel: [...Prestige.draft.sel].sort() };
    S = Object.assign(fresh(), keep, { pre, achP: {} }); save(); Prestige.draft = null; Meta.reloadAll(); return true;
  },
};

// ---------- 전체 적용 ----------
const Meta = {
  reloadAll() { Prestige.apply(); Equip.apply(); Tree.apply(); Crew.rebuild(); Meta.onReload && Meta.onReload(); },
  resetProgressKeepSettings() { const keep = { set: S.set }; S = Object.assign(fresh(), keep); save(); Meta.reloadAll(); },
};
load(); Meta.reloadAll();
