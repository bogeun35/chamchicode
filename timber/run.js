/* timber/run.js — 런 시뮬레이션·그리기·레벨업 카드 (GameManager/LogSpawner/CollectibleActor/PlayerChop/TreeHealth/LumberjackActor/TestStats_Dev/UpgradeGenerator/LogEffects 이식) */
'use strict';
const cv = document.getElementById('cv'), cx = cv.getContext('2d');
const W = { halfW: 8.89, s: 60, cw: 0, ch: 0, cx: 0, cy: 0 };
const LOG_GROUND = -4.5, SHADOW_Y = -4.75, PLAYER_Y = -4, TREE_X = 0.21, TREE_MIN = -1.6, TREE_MAX = 2.0, TREE_HALF = 1.43;
const LJ_POS = [[-1.85, -0.9], [2.3, -0.9], [-1.85, 1.6], [2.3, 1.6]], LJ_HIT = [[-0.71, -1.54], [1.09, -1.49], [-0.71, 0.96], [1.09, 1.01]], LJ_GHOST = [-0.5, 0.5, -0.5, 0.5];
const PLATFORMS = [[-2, -2], [2.3, -2], [-2, 0.5], [2.3, 0.5]];
const LOGS = D.logs, LOGW = D.logWeights;
const SPEC_UNLOCK = { Lightning: T.LightningUnl, Magma: T.MagmaUnl, Golden: T.GoldenUnl, Arcane: T.ArcaneUnl, Magnet: T.MagnetUnl, Freeze: T.CrystalUnl, Damage: T.DamagePotUnl, CritChance: T.CCPotUnl, CritDamage: T.CDPotUnl };
const SPEC_CHANCE = { Lightning: T.LightningChance, Magma: T.MagmaChance, Golden: T.GoldenChance, Arcane: T.ArcaneChance, Magnet: T.MagnetChance, Freeze: T.CrystalChance, Damage: T.DamagePotChance, CritChance: T.CCPotChance, CritDamage: T.CDPotChance };
const SPEC_ACH = { Lightning: A.LightningLogs, Magma: A.MagmaLogs, Golden: A.GoldenLogs, Arcane: A.ArcaneLogs, Freeze: A.FreezeLogs };
const LOG_COLOR = { normal_log: '#a9743f', lightning_log: '#7fd0ff', magma_log: '#ff7a3d', golden_log: '#ffd84a', arcane_log: '#c58cff', crystal_log: '#9ef2ff', magnet_log: '#9aa3b5', damage_potion: '#ff6b7a', crit_chance_potion: '#ffb347', crit_damage_potion: '#ff4fa3' };
const PRIORITY = [T.Damage, T.AttackSpeed, T.CritDamage, T.Luck, T.CritChance], DISALLOW_STACK = new Set([T.AttackSpeed, T.LjSpeed]);
const CARD_WEIGHTS = D.cardWeights, RAR_W = D.rarityWeights, LUCK_POW = D.luckPower;
const MAG = { log: { minScale: .4, scaleSpeed: 2, accel: 1, maxMult: 4, kick: 20 }, coin: { minScale: .25, scaleSpeed: 4, accel: 8, maxMult: 3, kick: 1 }, chest: { minScale: .25, scaleSpeed: 4, accel: 8, maxMult: 3, kick: 1 } };
const G = { state: 'menu', before: 'menu', mute: false };
let R = null;
const keys = {}; const SFX = n => { if (!G.mute && window.Sound) try { Sound.play(n); } catch (e) {} };
let shake = 0;

// ---------- 화면 ----------
function resize() { W.cw = cv.width = innerWidth * devicePixelRatio; W.ch = cv.height = innerHeight * devicePixelRatio; W.s = W.ch / 10; W.halfW = (W.cw / W.ch) * 5; W.cx = W.cw / 2; W.cy = W.ch / 2; }
addEventListener('resize', resize); resize();
const sx = x => W.cx + x * W.s, sy = y => W.cy - y * W.s;
function wallInner() { return W.halfW + 1; }

// ---------- 런 시작 ----------
function startRun() {
  stats.clear('run'); stats.clear('buff'); stats.finale = false; stats.mark();
  R = { now: 0, unow: 0, time: Math.max(0, stats.get(T.TimeExtension)), freeze: 0, freezeOn: false, finaleUsed: false, finale: false, lvl: 1, xp: 0, runLogs: 0, runCoins: 0, elapsed: 0,
    p: { x: -1.25, face: 1, dashing: false, dashT: 0, nextDash: 0, swing: 0, anim: 0 }, nextChop: 0, items: [], drones: [], crates: [], pendingCrates: 0, nextChest: 0,
    ljs: [0, 1, 2, 3].map(() => ({ next: 0.5, down: 0 })), buffs: {}, cd: {}, ready: {}, dmg: { n: 0, c: 0, l: 0, m: 0 }, ljDmg: [0, 0, 0, 0],
    pendingLv: 0, lastLvT: 0, firstLv: true, pendingForced: null, banishes: Math.max(0, Math.floor(stats.get(T.BanishCount))), banished: new Set(), rerolls: Math.max(0, Math.round(stats.get(T.LevelUpReroll))), paidRerolls: 0, cards: null,
    popups: [], fx: [], magmas: [], timers: [], tree: { hp: 10, max: 10, shake: 0 }, specialCount: 0, ljCount: 0, effectDepth: 0 };
  for (const [id, st] of D.logCooldowns) R.cd[id] = Math.max(0, stats.get(st));
  R.specialCount = [T.LightningUnl, T.MagmaUnl, T.GoldenUnl, T.ArcaneUnl, T.MagnetUnl, T.CrystalUnl].filter(t => stats.unlocked(t)).length;
  R.ljCount = Math.min(4, Math.max(0, Math.round(stats.get(T.LjAmount))));
  shake = 0; G.state = 'play'; UI.onRunStart();
}
function computeDur() { return Math.max(0, stats.get(T.TimeExtension)); }

// ---------- 업데이트 ----------
function update(dt) {
  const ud = dt; if (G.state !== 'play') return;
  R.unow += ud; R.elapsed += ud;
  if (R.freeze > 0) { R.freeze = Math.max(0, R.freeze - ud); if (R.freezeOn && R.freeze <= 0) R.freezeOn = false; }
  else { R.time = Math.max(0, R.time - dt); if (R.time <= 0 && !tryFinale()) { endRun(true); return; } }
  R.now += dt;
  updatePlayer(dt); tryChop(); updateLumberjacks(); updateDrones(dt); updateItems(dt); updateMagmas(dt); updateBuffs(dt);
  for (let i = R.timers.length - 1; i >= 0; i--) if (R.now >= R.timers[i].at) { const t = R.timers.splice(i, 1)[0]; t.fn(); }
  for (let i = R.popups.length - 1; i >= 0; i--) { const p = R.popups[i]; p.t += dt; p.y += dt * 1.1; if (p.t > p.life) R.popups.splice(i, 1); }
  for (let i = R.fx.length - 1; i >= 0; i--) { const f = R.fx[i]; f.t += dt; if (f.vx != null) { f.vy -= (f.g || 0) * dt; f.x += f.vx * dt; f.y += f.vy * dt; } if (f.t > f.life) R.fx.splice(i, 1); }
  if (R.tree.shake > 0) R.tree.shake -= dt; if (shake > 0) shake -= dt;
  if (R.pendingLv > 0 && R.unow - R.lastLvT >= 0.5) {
    const count = Math.max(1, Math.round(stats.get(T.LevelUpChoices))), forced = R.pendingForced, stacks = Math.max(1, R.pendingLv); R.pendingLv = 0; R.pendingForced = null;
    if (S.set.auto) autoSelect(count, forced, stacks); else openCards(count, forced, 'level', stacks);
  }
}
function tryFinale() { if (R.finaleUsed || !stats.has(PFX.DeathlessHarvest)) return false; R.finaleUsed = true; R.freeze = 0; R.freezeOn = false; R.finale = true; stats.finale = true; stats.mark(); R.time = 10; popup(0, 3, '불멸의 수확!', '#ffd36b', 2.2); return true; }
function freezeTimer(d) { if (R.finale) return; R.freeze = Math.max(R.freeze, d); R.freezeOn = R.freeze > 0; }

// ---------- 플레이어 ----------
function updatePlayer(dt) {
  const p = R.p; const ms = stats.get(T.MoveSpeed); let mx = (keys.right ? 1 : 0) - (keys.left ? 1 : 0);
  const dashUnl = stats.unlocked(T.DashUnl), dashCd = Math.max(0, stats.get(T.DashCooldown));
  if (dashUnl && keys.dash && !p.dashing && R.now >= p.nextDash) { p.dashing = true; p.dashT = 0.15; SFX('whoosh'); }
  if (p.dashing) { p.x += p.face * 20 * (ms / 6) * dt; p.dashT -= dt; if (p.dashT <= 0) { p.dashing = false; p.nextDash = R.now + dashCd; } R.fx.push({ k: 'ghost', x: p.x, y: PLAYER_Y, face: p.face, t: 0, life: .2 }); }
  else { p.x += mx * ms * dt; if (mx > 0.01) p.face = 1; else if (mx < -0.01) p.face = -1; }
  const lim = wallInner() - 0.5; p.x = Math.max(-lim, Math.min(lim, p.x)); p.anim += Math.abs(mx) * dt * 10; if (p.swing > 0) p.swing -= dt;
}
function inAttackRange(ad) { const x = R.p.x; const d = x < TREE_MIN ? TREE_MIN - x : x > TREE_MAX ? x - TREE_MAX : 0; return d <= ad; }
function chopPoint(ad) { const mid = (TREE_MIN + TREE_MAX) / 2, x = R.p.x; let sg = Math.sign(mid - x); if (sg === 0) sg = 1; return [Math.max(TREE_MIN, Math.min(TREE_MAX, x + sg * ad)), PLAYER_Y]; }
function perUnit(base) {
  const lv = Math.max(1, R.lvl); let v = base * Math.max(0, 1 + stats.get(T.DmgPerLevel) * (lv - 1));
  v *= Math.max(0, 1 + stats.get(T.DmgPerDrone) * R.drones.length); v *= Math.max(0, 1 + stats.get(T.DmgPerSpecial) * R.specialCount);
  return nn(v * Math.max(0, 1 + stats.get(T.DmgPerLj) * R.ljCount));
}
function tryChop() {
  const as = Math.max(0.01, stats.get(T.AttackSpeed)), cd = 1.0 / as, ad = stats.get(T.AttackDistance);
  if (R.now < R.nextChop || !inAttackRange(ad)) return;
  R.nextChop = R.now + cd; const p = R.p; p.face = TREE_X < p.x ? -1 : 1; p.swing = Math.min(0.25, cd * 0.6);
  let dmg = perUnit(stats.get(T.Damage)); const vr = rnd(0.8, 1.2); dmg *= vr;
  const cc = stats.get(T.CritChance), cdm = stats.get(T.CritDamage); const crit = cc > 0 && Math.random() < cc; const final = nn(crit ? dmg * cdm : dmg);
  const pt = chopPoint(ad);
  treeDamage(final, pt, crit, false, vr); R.dmg[crit ? 'c' : 'n'] += final;
  if (stats.has(PFX.PlayerEcho)) { treeDamage(final, [pt[0] + 0.3, pt[1] + 0.2], crit, false, vr); R.dmg[crit ? 'c' : 'n'] += final; }
  R.tree.shake = 0.15; if (S.set.shake) shake = 0.08; SFX('tap');
}

// ---------- 나무 (TreeHealth) ----------
function treeDamage(d, pt, crit, handled, vr = 1) {
  d = nn(d); if (d <= 0) return; const t = R.tree;
  const r = Ach.round(d); Ach.add(A.TotalDamage, r); Ach.highest(A.HighestSingleDamage, r); if (crit) { Ach.add(A.TotalCrits, 1); Ach.add(A.TotalCritDamage, r); }
  t.hp -= d; if (!handled) popup(pt[0], pt[1], fmt(d), crit ? '#ff8c00' : '#fff', Math.min(2, Math.max(.8, vr)) + (crit ? .5 : 0));
  if (t.hp <= 0) { emitLogs(pt, d); t.hp = t.max; }
}
function emitLogs(pt, dealt) {
  const ratio = nn(dealt / R.tree.max);
  if (ratio > 10) { const vm = ratio / 10; for (let i = 0; i < 10; i++) emitLog(pt, null, vm); }
  else { const n = Math.max(1, Math.floor(ratio)); for (let i = 0; i < n; i++) emitLog(pt, null, 1); if (ratio - Math.floor(ratio) > 0 && Math.random() < ratio - Math.floor(ratio)) emitLog(pt, null, 1); }
  tryCoins(pt); tryChest(pt);
}

// ---------- 통나무 생성 (LogSpawner) ----------
function logCount() { let n = 0; for (const it of R.items) if (it.kind === 'log') n++; return n; }
function isUnlocked(cfg) { if (!cfg.effect) return true; const u = SPEC_UNLOCK[cfg.effect.kind]; return u == null ? true : stats.unlocked(u); }
function weightBonus(cfg, w) { if (!cfg.effect) return w; const c = SPEC_CHANCE[cfg.effect.kind]; return Math.max(0, w + (c == null ? 0 : stats.get(c))); }
function cdOk(id) { if (!id) return true; const c = R.cd[id]; if (!c || c <= 0) return true; return R.now >= (R.ready[id] || 0); }
function cdUse(id) { if (!id) return; const c = R.cd[id]; if (!c || c <= 0) return; if (R.now < (R.ready[id] || 0)) return; R.ready[id] = R.now + c; }
function resolveLog() {
  const list = []; let total = 0;
  for (const [key, w0] of LOGW) { const cfg = LOGS[key]; if (!cfg) continue; if (!cdOk(cfg.cd) || !isUnlocked(cfg)) continue; const w = nn(weightBonus(cfg, Math.max(0, w0))); if (w <= 0) continue; list.push([cfg, w]); total += w; }
  let pick = null; if (total > 0) { const r = Math.random() * total; let acc = 0; for (const [c, w] of list) { acc += w; if (r <= acc) { pick = c; break; } } }
  if (!pick) pick = LOGS.NormalLog; cdUse(pick.cd); return pick;
}
function emitLog(pt, forced, vm) {
  const cfg = forced || resolveLog(); const full = logCount() >= 1000;
  if (shouldAutoCollect() || full) { awardLog(cfg, pt, true, vm, null); return; }
  const it = newItem('log', pt); it.cfg = cfg; it.vm = nn(vm); it.grav = cfg.grav; it.bounce = cfg.bounce; it.special = !!cfg.effect;
  const ang = rnd(45, 135) * Math.PI / 180, sp = rnd(6, 13); it.vx = Math.cos(ang) * sp; it.vy = Math.sin(ang) * sp;
  const av = rnd(60, 180); it.angv = Math.random() < .5 ? -av : av; it.rot = rnd(-20, 20);
}
function newItem(kind, pt) {
  const it = { kind, x: pt[0], y: pt[1], vx: 0, vy: 0, rot: 0, angv: 0, scale: 1, alpha: 1, grav: 1, bounce: .1, bounces: 0, sim: true, grace: 1.0, target: null, attached: false, magSpeed: 20, life: 0, fadeT: 0, special: false, value: 1, cfg: null, vm: 1, lastTarget: null };
  R.items.push(it); return it;
}
function shouldAutoCollect() { const c = Math.min(1, nn(stats.get(T.AutoCollectChance))); return c > 0 && Math.random() < c; }
function launchItem(it, minS, maxS, minA, maxA, rv) { const ang = rnd(45, 135) * Math.PI / 180, sp = rnd(minS, maxS); it.vx = Math.cos(ang) * sp; it.vy = Math.sin(ang) * sp; const av = rnd(minA, maxA); it.angv = Math.random() < .5 ? -av : av; it.rot = rnd(-rv, rv); }
function tryCoins(pt) {
  const ch = stats.get(T.CoinSpawnChance); if (ch <= 0 || Math.random() > ch) return;
  const amt = stats.get(T.CoinAmount); let n = Math.floor(amt); if (Math.random() < amt - n) n++; for (let i = 0; i < Math.max(0, n); i++) emitCoin(pt);
}
function rollCoin() {
  let w = 100, rb = 0, dm = 0; if (stats.unlocked(T.RubyUnl)) rb = Math.max(0, stats.get(T.RubyChance)); if (stats.unlocked(T.DiamondUnl)) dm = Math.max(0, stats.get(T.DiamondChance));
  const tot = w + rb + dm; if (tot <= 0) return { v: 1, tier: 0 }; const r = Math.random() * tot; if (r < rb) return { v: 5, tier: 1 }; if (r < rb + dm) return { v: 25, tier: 2 }; return { v: 1, tier: 0 };
}
function emitCoin(pt) {
  let coins = 0; for (const it of R.items) if (it.kind === 'coin') coins++;
  if (coins >= 500) { awardCoin(rollCoin().v, pt, null); return; }
  const it = newItem('coin', pt); const c = rollCoin(); it.value = c.v; it.tier = c.tier; launchItem(it, 6, 13, 30, 90, 15);
}
function tryChest(pt) {
  if (R.now < R.nextChest) return; const rate = Math.min(1, nn(stats.get(T.ChestRate))); if (rate <= 0 || Math.random() > rate) return;
  const it = newItem('chest', pt); launchItem(it, 6, 13, 30, 90, 15); R.nextChest = R.now + 3;
}
function awardCoin(base, pt, src) { addCoins(probMul(base, stats.get(T.GoldMult)), pt, src); }
function awardLog(cfg, pt, auto, vm, src) {
  const lvm = stats.get(T.LogValueMult), base = cfg ? cfg.value : 1; let n = probMul(base, lvm * Math.max(0, vm));
  if (auto && stats.unlocked(T.AutoCollectDouble)) n = nn(n * 2);
  if (cfg && cfg.effect) { Ach.add(A.TotalSpecialLogs, 1); const a = SPEC_ACH[cfg.effect.kind]; if (a != null) Ach.add(a, 1); }
  addXP(base * vm); addLogs(n, pt, src); convertLogsToCoins(n, pt, src);
  if (!cfg || !cfg.effect) return;
  const echo = R.effectDepth === 0 && stats.has(PFX.ElementalEcho) && (cfg.effect.kind === 'Magma' || cfg.effect.kind === 'Lightning') && Math.random() < .25;
  R.effectDepth++; try { applyEffect(cfg.effect, pt); if (echo) applyEffect(cfg.effect, pt); } finally { R.effectDepth--; }
}
function convertLogsToCoins(n, pt, src) { if (n <= 0) return; const c = Math.min(1, nn(stats.get(T.LogToCoin))); if (c > 0 && Math.random() < c) addCoins(n, pt, src); }
function addXP(amount) {
  if (!(amount > 0) || Number.isNaN(amount)) return; R.xp = nn(R.xp + nn(amount * stats.get(T.ExpMult)));
  let n = 0, need = xpNeed(R.lvl); while (R.xp >= need && need > 0 && Number.isFinite(need)) { R.xp -= need; R.lvl++; n++; need = xpNeed(R.lvl); }
  if (n > 0) { for (let i = 0; i < n; i++) onLevelUp(); Ach.add(A.TotalLevels, n); Ach.highest(A.HighestLevel, R.lvl); SFX('correct'); }
}
function xpNeed(lv) { return Math.max(1, 5 * Math.pow(2, Math.max(1, lv) - 1)); }
function onLevelUp() { R.pendingLv++; R.lastLvT = R.unow; if (R.firstLv) { R.pendingForced = guaranteedRarity(); R.firstLv = false; } }
function guaranteedRarity() { const v = stats.get(T.GuaranteedFirstRarity); return v >= 2.9 ? 4 : v >= 1.9 ? 3 : v >= 0.9 ? 2 : null; }
function addCoins(amount, pt, src) {
  if (!(amount > 0) || Number.isNaN(amount)) return; let n = nn(amount);
  if (Math.random() < Math.min(1, nn(stats.get(T.DoubleCoinChance)))) n = nn(n * 2); if (R.finale) n = nn(n * 3); if (stats.has(PFX.DoubleIncome)) n = nn(n * 2);
  S.coins = nn(S.coins + n); R.runCoins = nn(R.runCoins + n); Ach.add(A.TotalCoins, n); Cur.changed(); popup(pt[0], pt[1] + .3, '+' + fmt(n) + ' 🪙', '#ffd84a', .9, true); SFX('coin');
}
function addLogs(amount, pt, src) {
  if (!(amount > 0) || Number.isNaN(amount)) return; let n = nn(amount);
  if (Math.random() < Math.min(1, nn(stats.get(T.DoubleLogChance)))) n = nn(amount * 2); if (R.finale) n = nn(n * 3); if (stats.has(PFX.DoubleIncome)) n = nn(n * 2);
  S.logs = nn(S.logs + n); R.runLogs = nn(R.runLogs + n); Ach.add(A.TotalLogs, n); Cur.changed(); popup(pt[0], pt[1] + .3, '+' + fmt(n) + ' 🪵', '#e6c89c', .9, true); SFX('pickup');
}

// ---------- 수집물 물리·자석 (CollectibleActor) ----------
function collectors() { const c = [{ x: R.p.x, y: PLAYER_Y, mask: 7, ref: R.p }]; const dm = 1 | (stats.unlocked(T.DroneCollectChests) ? 4 : 0) | (stats.unlocked(T.DroneCollectSpecial) ? 2 : 0); for (const d of R.drones) c.push({ x: d.x, y: d.y, mask: dm, ref: d }); return c; }
function itemMask(it) { return it.kind === 'chest' ? 4 : it.special ? 2 : 1; }
function updateItems(dt) {
  const col = collectors(); const rad = Math.min(12, Math.max(stats.get(T.MagnetRadius), 0.2)); const r2 = rad * rad; const inner = wallInner(); const L = -inner + .15, Rt = inner - .15;
  for (let i = R.items.length - 1; i >= 0; i--) {
    const it = R.items[i];
    // 물리
    if (it.sim) {
      it.vy += -9.81 * it.grav * dt; it.x += it.vx * dt; it.y += it.vy * dt; const ground = it.y <= LOG_GROUND;
      if (ground) { it.y = LOG_GROUND; if (it.vy < 0) { it.vy = -it.vy * Math.min(1, Math.max(0, it.bounce)); it.bounces++; } it.vx = moveTo(it.vx, 0, 10.4 * dt);
        if (it.bounces >= 1 && it.vx * it.vx + it.vy * it.vy <= .5625 && Math.abs(it.angv) <= 360) { it.sim = false; it.vx = it.vy = it.angv = 0; } }
      if (it.sim) { if (it.x <= L) { it.x = L; it.vx = Math.abs(it.vx) * .6; } else if (it.x >= Rt) { it.x = Rt; it.vx = -Math.abs(it.vx) * .6; }
        if (Math.abs(it.angv) > 1e-6) { it.rot += it.angv * dt; if (ground) it.angv = moveTo(it.angv, 0, 360 * dt); } }
    }
    // 소멸 (통나무만)
    if (it.kind === 'log') { it.life += dt; if (it.life >= 10) { R.items.splice(i, 1); continue; } if (it.life >= 5) { it.fadeT += dt; if (it.fadeT >= 1) { it.fadeT = 0; it.alpha = Math.max(0, it.alpha * .8); } } }
    if (it.grace > 0) { it.grace = Math.max(0, it.grace - dt); if (it.grace > 0) continue; it.target = null; }
    // 자석 대상
    if (!it.target) { const m = itemMask(it); for (const c of col) { if (!(c.mask & m)) continue; const dx = c.x - it.x, dy = c.y - it.y; if (dx * dx + dy * dy <= r2) { it.target = c.ref; break; } } }
    if (!it.target) continue;
    const tx = it.target.x, ty = it.target === R.p ? PLAYER_Y : it.target.y; const tune = MAG[it.kind];
    if (it.magSpeed <= 0) it.magSpeed = 20;
    const dx = tx - it.x, dy = ty - it.y, dist = Math.hypot(dx, dy), step = it.magSpeed * dt;
    if (dist <= step) { it.x = tx; it.y = ty; } else { it.x += dx / dist * step; it.y += dy / dist * step; }
    it.magSpeed = moveTo(it.magSpeed, 20 * Math.max(1, tune.maxMult), tune.accel * dt);
    if (it.attached) it.rot = moveTo(it.rot, 0, 360 * dt);
    it.scale = moveTo(it.scale, Math.min(1, tune.minScale), Math.max(0, tune.scaleSpeed) * dt);
    const ddx = tx - it.x, ddy = ty - it.y; if (ddx * ddx + ddy * ddy <= .04) { R.items.splice(i, 1); collectItem(it); }
  }
}
function moveTo(a, b, d) { return Math.abs(b - a) <= d ? b : a + Math.sign(b - a) * d; }
function collectItem(it) {
  const pt = [it.x, it.y];
  if (it.kind === 'log') awardLog(it.cfg, pt, false, it.vm, it.target);
  else if (it.kind === 'coin') awardCoin(Math.max(1, it.value), pt, it.target);
  else { Ach.add(A.TotalChests, 1); SFX('reveal'); onChestCollected(); if (stats.has(PFX.Treasurebound)) R.timers.push({ at: R.now, fn: () => chestBurst(pt) }); }
}
function forceMagnet(it, target) { it.grace = 0; it.target = target; it.attached = true; it.sim = false; it.vx = it.vy = it.angv = 0; it.magSpeed = 20; }
function collectAll() {
  const sp = stats.unlocked(T.MagnetCollectSpecial), ch = stats.unlocked(T.MagnetCollectChest);
  for (const it of R.items) { if (it.kind === 'chest' && !ch) continue; if (it.special && !sp) continue; forceMagnet(it, R.p); }
}
function chestBurst(pt) {
  let rem = 3; const el = []; for (const [key] of LOGW) { const c = LOGS[key]; if (c && c.effect && c.effect.kind !== 'Freeze' && isUnlocked(c) && !el.includes(c)) el.push(c); }
  if (!el.length) return; const step = () => { if (rem <= 0 || G.state === 'end' || G.state === 'menu') return; if (G.state === 'play') { emitLog(pt, el[Math.floor(Math.random() * el.length)], 1); rem--; } R.timers.push({ at: R.now + 0.016, fn: step }); }; step();
}

// ---------- 특수 통나무 효과 ----------
function treePointBelow(pt) { for (let i = 0; i < 5; i++) { const x = rnd(TREE_X - TREE_HALF, TREE_X + TREE_HALF), y = rnd(-3, 0); return [x, y]; } return pt; }
function expectedCrit() { let cc = stats.get(T.CritChance); if (stats.has(PFX.OverflowCrit)) cc = Math.min(1, nn(cc)); const cd = stats.get(T.CritDamage); return 1 + cc * (cd - 1); }
function applyBuff(type, value, dur, mt) {
  dur = Math.max(0, dur); if (dur <= 0 || !ST[type]) return; const b = R.buffs[type];
  if (!b || !b.mod) { const mod = Stats.mod(type, 0, value, mt); stats.push('buff', mod); R.buffs[type] = { mod, rem: dur, total: dur }; } else { b.rem = dur; b.total = dur; }
  UI.onBuffs();
}
function updateBuffs(dt) { let ch = false; for (const [t, b] of Object.entries(R.buffs)) { b.rem -= dt; if (b.rem <= 0) { stats.remove('buff', b.mod); delete R.buffs[t]; ch = true; } } if (ch) UI.onBuffs(); }
function clearBuffs() { for (const b of Object.values(R.buffs)) stats.remove('buff', b.mod); R.buffs = {}; UI.onBuffs(); }
function applyEffect(e, pt) {
  const k = e.kind;
  if (k === 'Lightning') {
    let d = perUnit(stats.get(T.Damage)); let lm = stats.get(T.LightningDmgMult); if (lm < 1) lm = 1; d *= Math.max(0, e.damageMultiplier) * lm; const dmg = nn(d * expectedCrit());
    const p = treePointBelow(pt); treeDamage(dmg, p, true, true); R.tree.shake = .3; if (S.set.shake) shake = .2;
    Ach.add(A.TotalLightningDamage, Ach.round(dmg)); R.dmg.l += dmg;
    R.fx.push({ k: 'bolt', pts: boltPts([rnd(-8, 8), 6], p, 5, .5), t: 0, life: .5, w: .2, color: '#9ccfff' }); R.fx.push({ k: 'ring', x: p[0], y: p[1], t: 0, life: .5 });
    popup(p[0], p[1], fmt(dmg), '#8fa3ff', 1.5); SFX('boom');
    chainZap(p);
  } else if (k === 'Magma') {
    let base = perUnit(stats.raw(T.Damage)); let mm = stats.get(T.MagmaDmgMult); if (mm < 1) mm = 1; const tick = nn(base * Math.max(0, e.damageMultiplier) * mm * expectedCrit());
    R.magmas.push({ elapsed: 0, next: 0, dur: Math.max(0, stats.get(T.MagmaDuration)), tick, pt: [pt[0], pt[1]] }); SFX('boom');
  } else if (k === 'Golden') {
    const gm = stats.get(T.GoldMult); let n = Math.floor(nn(e.baseCoins * Math.max(0, gm))); if (Math.random() < e.baseCoins * Math.max(0, gm) - n) n++;
    applyBuff(T.GoldMult, e.coinMultiplier, Math.max(0, stats.get(T.GoldenDuration)), MUL); addCoins(n, pt, null); SFX('meld');
  } else if (k === 'Arcane') {
    addXP(e.baseXp * Math.max(0, stats.get(T.ExpMult))); applyBuff(T.ExpMult, e.xpMultiplier, Math.max(0, stats.get(T.ArcaneDuration)), MUL); SFX('meld');
  } else if (k === 'Freeze') { freezeTimer(Math.max(0, stats.get(T.CrystalDuration))); SFX('phase'); popup(pt[0], pt[1] + .5, '시간 정지!', '#9ef2ff', 1.4); }
  else if (k === 'Magnet') { collectAll(); SFX('whoosh'); }
  else if (k === 'Damage') applyBuff(T.Damage, e.multiplier, Math.max(0, stats.get(T.DamagePotDur)), MUL);
  else if (k === 'CritChance') applyBuff(T.CritChance, e.multiplier, Math.max(0, stats.get(T.CCPotDur)), MUL);
  else if (k === 'CritDamage') applyBuff(T.CritDamage, e.multiplier, Math.max(0, stats.get(T.CDPotDur)), MUL);
}
function boltPts(a, b, iter, jitter) { let pts = [a, b]; for (let i = 0; i < iter; i++) { const n = [pts[0]]; for (let j = 0; j < pts.length - 1; j++) { const p = pts[j], q = pts[j + 1]; const mx = (p[0] + q[0]) / 2 + rnd(-jitter, jitter), my = (p[1] + q[1]) / 2 + rnd(-jitter, jitter); n.push([mx, my], q); } pts = n; jitter *= .5; } return pts; }
function chainZap(start) {
  if (!stats.unlocked(T.ChainUnl)) return; const logs = R.items.filter(it => it.kind === 'log'); if (!logs.length) return;
  const hops = Math.max(0, Math.round(stats.get(T.ChainCount))); const targets = []; let origin = start, last = null;
  for (let i = 0; i < hops; i++) {
    let best = null, bd = Infinity; for (let s = 0; s < Math.min(20, logs.length); s++) { const l = logs[Math.floor(Math.random() * logs.length)]; if (!l || l === last) continue; const d2 = (l.x - origin[0]) ** 2 + (l.y - origin[1]) ** 2; if (d2 >= 1 && d2 <= 16 && d2 < bd) { bd = d2; best = l; } }
    if (!best) { bd = Infinity; for (const l of logs) { if (l === last) continue; const d2 = (l.x - origin[0]) ** 2 + (l.y - origin[1]) ** 2; if (d2 >= 1 && d2 < bd) { bd = d2; best = l; } } }
    if (!best) break; targets.push(best); logs.splice(logs.indexOf(best), 1); origin = [best.x, best.y]; last = best;
  }
  let cur = start; targets.forEach((l, i) => R.timers.push({ at: R.now + i * 0.1, fn: () => { if (!R.items.includes(l)) return; const to = [l.x, l.y]; R.fx.push({ k: 'bolt', pts: boltPts(cur, to, 2, .3), t: 0, life: .5, w: .05, color: '#9ccfff' }); l.vm *= stats.get(T.ChainValueMult); R.items.splice(R.items.indexOf(l), 1); l.target = R.p; collectItem(l); cur = to; R.fx.push({ k: 'ring', x: to[0], y: to[1], t: 0, life: .5 }); } }));
}
function updateMagmas(dt) {
  for (let i = R.magmas.length - 1; i >= 0; i--) {
    const m = R.magmas[i];
    while (m.elapsed < m.dur && m.next <= 0) {
      const p = [rnd(TREE_X - TREE_HALF, TREE_X + TREE_HALF), rnd(-3, 3)]; const d = nn(m.tick * stats.runDmgMult); treeDamage(d, p, false, true); Ach.add(A.TotalMagmaDamage, Ach.round(d)); R.dmg.m += d;
      magmaParticles(p, 1); popup(p[0], p[1], fmt(d), '#ff5a3d', 1.25); m.elapsed += .5; m.next = .5; m.pt = p;
    }
    m.next -= dt;
    if (m.elapsed >= m.dur && m.next <= 0) {
      if (stats.unlocked(T.DetonationUnl)) { const d = nn(m.tick * Math.max(0, stats.get(T.DetonationMult)) * stats.runDmgMult); treeDamage(d, m.pt, false, true); Ach.add(A.TotalMagmaDamage, Ach.round(d)); R.dmg.m += d; popup(m.pt[0], m.pt[1], fmt(d), '#ff5a3d', 1.5); magmaParticles(m.pt, 2.2); SFX('boom'); }
      R.magmas.splice(i, 1);
    }
  }
}
function magmaParticles(p, sc) { for (let i = 0; i < 12; i++) { const a = rnd(0, Math.PI * 2), sp = rnd(1.5, 3) * sc; R.fx.push({ k: 'ember', x: p[0], y: p[1], vx: Math.cos(a) * sp, vy: Math.sin(a) * sp, g: 3, r: rnd(.12, .22) * sc, t: 0, life: 1 }); } }

// ---------- 나무꾼 ----------
function updateLumberjacks() {
  for (let i = 0; i < R.ljCount; i++) {
    const lj = R.ljs[i]; if (lj.down > 0) lj.down -= 0; if (R.now < lj.next) continue;
    const psd = perUnit(stats.get(T.Damage)); const as = Crew.combat(i, T.AttackSpeed, psd), dmg = Crew.combat(i, T.Damage, psd), cc = Crew.combat(i, T.CritChance, psd), cd = Crew.combat(i, T.CritDamage, psd);
    const sv = rnd(.8, 1.2), dv = rnd(.8, 1.2); const d = dmg * dv; const crit = cc > 0 && Math.random() < cc; const final = nn(crit ? d * cd : d);
    const hit = LJ_HIT[i]; crewHit(i, final, hit, crit, dv); if (Crew.hasGear(i) && stats.has(PFX.GhostCrew)) crewHit(i, final, [hit[0] + LJ_GHOST[i], hit[1] + .2], crit, dv);
    SFX('tap'); const aps = Math.max(.01, as * sv); lj.downUntil = R.now + Math.min(.2, Math.max(.05, 1 / aps * .3)); lj.next = R.now + 1 / aps;
  }
}
function crewHit(i, d, pt, crit, vr) { treeDamage(d, pt, crit, false, vr); Ach.add(A.TotalLjDamage, Ach.round(d)); R.ljDmg[i] = nn(R.ljDmg[i] + d); R.tree.shake = Math.max(R.tree.shake, .1); }

// ---------- 드론 ----------
function updateDrones(dt) {
  const want = Math.floor(stats.get(T.DroneAmount)); if (want > R.drones.length + R.pendingCrates) { const n = want - (R.drones.length + R.pendingCrates); for (let i = 0; i < n; i++) { R.crates.push({ x: rnd(-5, 5), y: 5 + 8, sp: stats.get(T.DroneCrateSpeed) }); R.pendingCrates++; } }
  for (let i = R.crates.length - 1; i >= 0; i--) { const c = R.crates[i]; c.y -= c.sp * dt; if (c.y <= -4.9) { R.crates.splice(i, 1); R.pendingCrates = Math.max(0, R.pendingCrates - 1); R.drones.push({ x: c.x, y: -4.9, dir: 1, t: 0 }); Ach.add(A.TotalDrones, 1); SFX('place'); } }
  const sp = stats.get(T.DroneSpeed); for (const d of R.drones) { d.t += dt; d.x += d.dir * sp * dt; if (d.x < -9) { d.x = -9; d.dir = 1; } else if (d.x > 9) { d.x = 9; d.dir = -1; } }
}
function toggleNearestDrone() { if (!stats.unlocked(T.DroneDirUnl)) return; let best = null, bd = 2.25; for (const d of R.drones) { const d2 = (d.x - R.p.x) ** 2 + (d.y - PLAYER_Y) ** 2; if (d2 <= bd) { bd = d2; best = d; } } if (best) best.dir *= -1; }
function clickWorld(wx, wy) { if (!R || G.state !== 'play' || !stats.unlocked(T.DroneDirUnl)) return; for (const d of R.drones) if (Math.hypot(d.x - wx, d.y - wy) < .7) { d.dir *= -1; return; } }

// ---------- 팝업 ----------
function popup(x, y, text, color, scale = 1, small = false) { if (R.popups.length >= 60) R.popups.shift(); R.popups.push({ x: x + rnd(-.2, .2), y, text, color, scale, t: 0, life: small ? .8 : 1 }); }

// ---------- 런 종료 ----------
function endRun(showUI) {
  if (!R) return; G.state = 'end'; const run = R;
  Ach.add(A.TotalRuns, 1); Ach.add(A.TotalTimeInRuns, Math.round(run.elapsed * 1000));
  Ach.highest(A.HighestCritChance, Ach.round(stats.get(T.CritChance) * 1000)); Ach.highest(A.HighestAttackSpeed, Ach.round(stats.get(T.AttackSpeed) * 1000)); Ach.highest(A.HighestLuck, Ach.round(stats.get(T.Luck) * 1000));
  Ach.highest(A.HighestMagnetRadius, Ach.round(stats.get(T.MagnetRadius) * 100)); Ach.highest(A.HighestLogs, run.runLogs);
  for (const [key, st] of [['Swamp', A.SwampUnlocked], ['Cemetery', A.CemeteryUnlocked], ['WildFire', A.WildFireUnlocked]]) if (Ach.get(st, 1) <= 0 && Ach.meets(LEVELS[key].req, 1)) Ach.set(st, 1);
  R.finale = false; stats.finale = false; clearBuffs(); stats.clear('run'); R.cards = null; S.runs++; save();
  if (showUI) UI.showEnd(run); else UI.showMenu();
}

// ---------- 레벨업 카드 (UpgradeGenerator / TestStats_Dev) ----------
function hasStat(t) { return stats.get(t) > 0.5; }
function rarityOf(def, luck) {
  const list = def.rar.filter(r => r[1] !== 0 || r[2] !== 0); if (!list.length) return null; const ws = [];
  for (const r of list) { const w = Math.max(0, RAR_W[r[0]] || 0); if (w > 0) ws.push([r[0], nn(w * Math.pow(1 + Math.max(0, luck), r[0] * Math.max(0, LUCK_POW)))]); }
  const tot = ws.reduce((n, w) => n + w[1], 0); if (tot <= 0) return list[Math.floor(Math.random() * list.length)][0];
  const x = Math.random() * tot; let acc = 0; for (const w of ws) { acc += w[1]; if (x <= acc) return w[0]; } return ws[ws.length - 1][0];
}
function rangeVal(def, r) { const q = def.rar.find(x => x[0] === r); return q ? rnd(Math.min(q[1], q[2]), Math.max(q[1], q[2])) : 1; }
function eligibleDefs(forced, allowed) {
  return CARD_WEIGHTS.filter(([t, w]) => { const d = ST[t]; return d && nn(w) > 0 && (!allowed || allowed(t)) && (d.req === 0 || hasStat(d.req)) && (forced == null ? d.rar.some(r => r[1] !== 0 || r[2] !== 0) : d.rar.some(r => r[0] === forced && (r[1] !== 0 || r[2] !== 0))); });
}
function genUpgrade(luck, forced, stacks, allowed) {
  const el = eligibleDefs(forced, allowed); const tot = el.reduce((n, e) => n + nn(e[1]), 0); if (!el.length || tot <= 0) return null;
  let t = el[el.length - 1][0]; { const x = Math.random() * tot; let acc = 0; for (const e of el) { acc += nn(e[1]); if (x <= acc && nn(e[1]) > 0) { t = e[0]; break; } } }
  const def = ST[t]; const n = Math.max(1, stacks); let add = 0, mul = 1, maxR = 0, f = forced;
  for (let i = 0; i < n; i++) { const r = f != null ? f : rarityOf(def, luck); if (r == null) return null; if (r > maxR) maxR = r; const v = rangeVal(def, r); if (def.mod === MUL) mul *= v; else add += v; f = null; }
  let val = def.mod === MUL ? mul : add; const myth = maxR === 4 && stats.has(PFX.MythicalCards) && Math.random() < .2; let str = stats.has(PFX.StrongerCards) ? 2 : 1; if (myth) str *= 1.5;
  val = fin(def.mod === MUL ? 1 + (val - 1) * str : val * str); return Stats.mod(t, maxR, val, def.mod, myth);
}
function belowCap(t) { return CAPS[t] == null || !atCap(t, stats.get(t)); }
function limitToCap(m) {
  if (!m || CAPS[m.type] == null) return m; const cur = stats.get(m.type); if (atCap(m.type, cur)) return null; if (m.mt !== MUL || m.value <= 1 || cur <= 0) return m;
  const lim = Math.min(m.value, CAPS[m.type] / cur); if (approx(lim, m.value)) return m; return Stats.mod(m.type, m.rarity, lim, m.mt, m.myth);
}
function genUnique(luck, existing, forced, stacks) {
  const ex = new Set(R.banished); for (const m of existing) if (m) ex.add(m.type);
  return limitToCap(genUpgrade(luck, forced, stacks, t => !ex.has(t) && belowCap(t) && (stacks <= 1 || !DISALLOW_STACK.has(t))));
}
function genMods(count, forced, stacks) {
  const luck = stats.get(T.Luck); const mods = []; for (let i = 0; i < count; i++) { const m = genUnique(luck, mods, forced, stacks); if (!m) break; mods.push(m); }
  if (forced != null && forced > 0 && !mods.some(m => m && m.rarity >= forced)) { const m = genUnique(luck, mods, forced, stacks); if (m && mods.length) mods[0] = m; } return mods;
}
function choiceCount(c) { return Math.max(1, Math.max(1, c) - (stats.has(PFX.StrongerCards) ? 1 : 0)); }
function openCards(count, forced, source, stacks) {
  if (R.cards) return; count = choiceCount(count); const mods = genMods(count, forced, stacks); if (!mods.length) return;
  R.cards = { mods, forced, source, stacks, count }; G.state = 'cards'; SFX('whoosh'); UI.showCards();
}
function closeCards() { if (!R.cards) return; const src = R.cards.source; R.cards = null; if (src === 'level') { R.pendingLv = 0; R.pendingForced = null; } G.state = 'play'; UI.hideCards(); }
function selectCard(i) { const c = R.cards; if (!c || i < 0 || i >= c.mods.length || !c.mods[i]) return; stats.add('run', c.mods[i]); SFX('submit'); closeCards(); }
function canBanish(i) { const c = R.cards; if (!c || R.banishes <= 0 || !c.mods[i]) return false; const ex = new Set(R.banished); for (const m of c.mods) if (m) ex.add(m.type); return eligibleDefs(c.forced, t => !ex.has(t) && belowCap(t) && (c.stacks <= 1 || !DISALLOW_STACK.has(t))).length > 0; }
function banishCard(i) { const c = R.cards; if (!canBanish(i)) return; const m = genUnique(stats.get(T.Luck), c.mods, c.forced, c.stacks); if (!m) return; R.banished.add(c.mods[i].type); R.banishes--; c.mods[i] = m; SFX('leave'); UI.showCards(); }
function rerollCost() { return Math.ceil(10 * Math.pow(2, Math.max(0, R.paidRerolls))); }
function reroll() { const c = R.cards; if (!c) return; if (R.rerolls > 0) R.rerolls--; else { if (!Cur.spendCoins(rerollCost())) { SFX('error'); return; } R.paidRerolls++; } c.mods = genMods(c.mods.length, c.forced, c.stacks); if (!c.mods.length) { closeCards(); return; } SFX('whoosh'); UI.showCards(); }
function autoSelect(count, forced, stacks) {
  count = choiceCount(count); const mods = genMods(count, forced, stacks); let idx = -1; for (const p of PRIORITY) { idx = mods.findIndex(m => m && m.type === p); if (idx >= 0) break; } if (idx < 0) idx = mods.findIndex(m => m); if (idx < 0) return;
  stats.add('run', mods[idx]); popup(R.p.x, PLAYER_Y + .75, modText(mods[idx].type, mods[idx].value, mods[idx].mt), '#7fe8ff', 2);
}
function onChestCollected() { const n = Math.max(1, Math.round(stats.get(T.ChestChoices))); if (S.set.auto) autoSelect(n, null, 1); else openCards(n, null, 'chest', 1); }

// ---------- 그리기 ----------
const LEVEL_BG = { Forest: ['#7dada5', '#e4dca5', '#365b40', '#83a66a'], Swamp: ['#688f85', '#bac79a', '#354f43', '#77966b'], Cemetery: ['#656d91', '#b3aac4', '#343b52', '#737e91'], WildFire: ['#b56854', '#efbe86', '#654332', '#b17b4a'] };
function draw() {
  const ctx = cx; ctx.setTransform(1, 0, 0, 1, 0, 0); ctx.clearRect(0, 0, W.cw, W.ch);
  const bg = LEVEL_BG[S.level] || LEVEL_BG.Forest; const g = ctx.createLinearGradient(0, 0, 0, W.ch); g.addColorStop(0, bg[0]); g.addColorStop(1, bg[1]); ctx.fillStyle = g; ctx.fillRect(0, 0, W.cw, W.ch);
  if (shake > 0 && S.set.shake) ctx.translate(rnd(-1, 1) * W.s * .05, rnd(-1, 1) * W.s * .05);
  drawBackdrop(ctx, bg);
  // 바닥
  ctx.fillStyle = bg[2]; ctx.fillRect(0, sy(-4.4), W.cw, W.ch); ctx.fillStyle = bg[3]; ctx.fillRect(0, sy(-4.4), W.cw, W.s * .18);
  drawTree(ctx);
  for (let i = 0; i < 4; i++) if (i < (R ? R.ljCount : 0)) drawPlatform(ctx, PLATFORMS[i]);
  if (!R) return;
  // 그림자
  for (const it of R.items) { const h = Math.max(0, it.y - SHADOW_Y), t = Math.min(1, h / 5), k = 1 - .4 * t; ctx.fillStyle = 'rgba(0,0,0,.18)'; ctx.beginPath(); ctx.ellipse(sx(it.x), sy(SHADOW_Y), .35 * k * W.s * it.scale, .1 * k * W.s * it.scale, 0, 0, Math.PI * 2); ctx.fill(); }
  for (let i = 0; i < R.ljCount; i++) drawLumberjack(ctx, i);
  for (const c of R.crates) drawCrate(ctx, c);
  for (const d of R.drones) drawDrone(ctx, d);
  for (const f of R.fx) if (f.k === 'ghost') drawPlayer(ctx, f.x, f.y, f.face, 1 - f.t / f.life, true);
  drawPlayer(ctx, R.p.x, PLAYER_Y, R.p.face, 1, false);
  for (const it of R.items) { if (it.kind === 'log') drawLog(ctx, it); else if (it.kind === 'coin') drawCoin(ctx, it); else drawChest(ctx, it); }
  // 공격 마커
  { const ad = stats.get(T.AttackDistance); const mid = (TREE_MIN + TREE_MAX) / 2; let sg = Math.sign(mid - R.p.x); if (sg === 0) sg = 1; const mx = R.p.x + sg * ad; ctx.fillStyle = inAttackRange(ad) ? 'rgba(255,230,120,.9)' : 'rgba(255,255,255,.6)'; ctx.beginPath(); ctx.moveTo(sx(mx), sy(-4.55)); ctx.lineTo(sx(mx) - .12 * W.s, sy(-4.85)); ctx.lineTo(sx(mx) + .12 * W.s, sy(-4.85)); ctx.fill(); }
  for (const f of R.fx) drawFx(ctx, f);
  for (const p of R.popups) { const a = 1 - Math.max(0, (p.t - p.life * .5) / (p.life * .5)); ctx.globalAlpha = a; ctx.font = `${Math.round(W.s * .28 * p.scale)}px Jua, sans-serif`; ctx.textAlign = 'center'; ctx.lineWidth = 4; ctx.strokeStyle = 'rgba(0,0,0,.55)'; ctx.strokeText(p.text, sx(p.x), sy(p.y)); ctx.fillStyle = p.color; ctx.fillText(p.text, sx(p.x), sy(p.y)); ctx.globalAlpha = 1; }
  if (R.freezeOn) { ctx.fillStyle = 'rgba(160,230,255,.12)'; ctx.fillRect(0, 0, W.cw, W.ch); }
  if (R.finale) { ctx.fillStyle = 'rgba(255,200,80,.08)'; ctx.fillRect(0, 0, W.cw, W.ch); }
}
function drawBackdrop(ctx, bg) {
  // Layered scenery is visual only; no run state or random-number consumption.
  ctx.save();
  const horizon = sy(-4.4);
  ctx.fillStyle = '#fff0bf'; ctx.globalAlpha = .65;
  ctx.beginPath(); ctx.arc(W.cw * .78, W.ch * .22, W.s * .7, 0, Math.PI * 2); ctx.fill();
  for (let layer = 0; layer < 3; layer++) {
    ctx.fillStyle = bg[2]; ctx.globalAlpha = .08 + layer * .07;
    ctx.beginPath(); ctx.moveTo(0, horizon);
    for (let i = 0; i <= 24; i++) {
      const x = W.cw * i / 24;
      const y = horizon - W.s * (1.7 + (2 - layer) * .65 + Math.sin(i * .62 + layer * 2) * .55);
      ctx.lineTo(x, y);
    }
    ctx.lineTo(W.cw, W.ch); ctx.lineTo(0, W.ch); ctx.closePath(); ctx.fill();
  }
  ctx.globalAlpha = .23; ctx.fillStyle = bg[2];
  for (let i = 0; i < 19; i++) {
    const x = W.cw * i / 18, h = W.s * (1.1 + (i * 7 % 11) * .14);
    ctx.fillRect(x - W.s * .035, horizon - h, W.s * .07, h);
    for (let tier = 0; tier < 3; tier++) {
      const y = horizon - h + tier * h * .21, half = h * (.19 + tier * .065);
      ctx.beginPath(); ctx.moveTo(x, y - h * .35); ctx.lineTo(x - half, y + h * .2); ctx.lineTo(x + half, y + h * .2); ctx.closePath(); ctx.fill();
    }
  }
  ctx.restore();
  ctx.fillStyle = 'rgba(255,255,255,.35)'; for (let i = 0; i < 5; i++) { const x = ((i * 3.7 + 1) % 18) - 9, y = 3.2 + (i % 3) * .6; const px = sx(x), py = sy(y); ctx.beginPath(); ctx.ellipse(px, py, .9 * W.s, .35 * W.s, 0, 0, Math.PI * 2); ctx.ellipse(px + .5 * W.s, py - .15 * W.s, .6 * W.s, .3 * W.s, 0, 0, Math.PI * 2); ctx.fill(); }
  ctx.fillStyle = bg[3]; ctx.globalAlpha = .45; for (let i = -12; i <= 12; i += 2) { const px = sx(i + .5), h = (1.2 + ((i * 7) % 5) * .3) * W.s; ctx.beginPath(); ctx.moveTo(px - .9 * W.s, sy(-4.4)); ctx.lineTo(px, sy(-4.4) - h); ctx.lineTo(px + .9 * W.s, sy(-4.4)); ctx.fill(); } ctx.globalAlpha = 1;
}
function rr(ctx, x, y, w, h, r) { ctx.beginPath(); ctx.roundRect(x, y, w, h, r); }
function drawTree(ctx) {
  const sh = R && R.tree.shake > 0 ? Math.sin(R.tree.shake * 60) * .08 : 0; const x = TREE_X + sh;
  ctx.fillStyle = '#8a5a34'; rr(ctx, sx(x - 1.0), sy(5.5), 2.0 * W.s, 10.7 * W.s, .3 * W.s); ctx.fill();
  ctx.fillStyle = '#6f4527'; for (let i = 0; i < 6; i++) { rr(ctx, sx(x - .7 + (i % 2) * .5), sy(4 - i * 1.6), .35 * W.s, 1.0 * W.s, .15 * W.s); ctx.fill(); }
  ctx.fillStyle = '#5a9e45'; const cy0 = 4.6; for (const [dx, dy, r] of [[0, 0, 2.6], [-1.9, -.9, 1.7], [1.9, -.8, 1.8], [-1, 1.2, 1.5], [1, 1.3, 1.5]]) { ctx.beginPath(); ctx.arc(sx(x + dx), sy(cy0 + dy), r * W.s, 0, Math.PI * 2); ctx.fill(); }
  ctx.fillStyle = '#79c45f'; for (const [dx, dy, r] of [[-.6, .4, 1.4], [1.1, .2, 1.1]]) { ctx.beginPath(); ctx.arc(sx(x + dx), sy(cy0 + dy), r * W.s, 0, Math.PI * 2); ctx.fill(); }
  // 얼굴 (콩눈)
  const hurt = R && R.tree.shake > 0; ctx.fillStyle = '#2b1a0e'; const ey = -0.6;
  if (hurt) { ctx.lineWidth = .08 * W.s; ctx.strokeStyle = '#2b1a0e'; for (const ex of [-.35, .35]) { ctx.beginPath(); ctx.moveTo(sx(x + ex - .12), sy(ey + .1)); ctx.lineTo(sx(x + ex + .12), sy(ey - .1)); ctx.moveTo(sx(x + ex - .12), sy(ey - .1)); ctx.lineTo(sx(x + ex + .12), sy(ey + .1)); ctx.stroke(); } }
  else for (const ex of [-.35, .35]) { ctx.beginPath(); ctx.ellipse(sx(x + ex), sy(ey), .09 * W.s, .14 * W.s, 0, 0, Math.PI * 2); ctx.fill(); }
  ctx.strokeStyle = '#2b1a0e'; ctx.lineWidth = .06 * W.s; ctx.beginPath(); ctx.arc(sx(x), sy(ey - .35), .18 * W.s, hurt ? Math.PI * 1.15 : .15 * Math.PI, hurt ? Math.PI * 1.85 : .85 * Math.PI); ctx.stroke();
  ctx.fillStyle = 'rgba(255,150,150,.5)'; for (const ex of [-.7, .7]) { ctx.beginPath(); ctx.ellipse(sx(x + ex), sy(ey - .2), .15 * W.s, .09 * W.s, 0, 0, Math.PI * 2); ctx.fill(); }
}
function drawPlatform(ctx, p) { ctx.fillStyle = '#9b6b3f'; rr(ctx, sx(p[0] - .8), sy(p[1] + .15), 1.6 * W.s, .3 * W.s, .1 * W.s); ctx.fill(); ctx.fillStyle = '#c08d5a'; rr(ctx, sx(p[0] - .8), sy(p[1] + .15), 1.6 * W.s, .1 * W.s, .05 * W.s); ctx.fill(); }
const CHAR_ART = { Lumberjack: { body: '#e0533f', skin: '#ffd9b3', hat: '#8b4a2b', beard: '#6d3f21' }, Goblin: { body: '#6fbf4a', skin: '#8fd66a', ears: true }, Ork: { body: '#3f7a3a', skin: '#6aa65c', tusk: true, big: true }, Dwarf: { body: '#7a5a3a', skin: '#ffd9b3', beard: '#c9742b', helmet: '#9aa3b5' }, Robot: { body: '#9aa3b5', skin: '#c9d2e0', robot: true }, Elf: { body: '#5fb48a', skin: '#ffe6cf', ears: true, hair: '#f2d16b' }, Ent: { body: '#5a3b22', skin: '#8a5a34', leaf: true }, Gnome: { body: '#4a6fd9', skin: '#ffd9b3', hat: '#e03f3f', beard: '#eee', cone: true }, Golem: { body: '#6e7681', skin: '#8f98a3', rock: true, big: true } };
function drawChar(ctx, key, x, y, s, face, alpha, down) {
  const c = CHAR_ART[key] || CHAR_ART.Lumberjack; ctx.save(); ctx.globalAlpha = alpha; ctx.translate(x, y); ctx.scale(face * s, s);
  const bw = c.big ? .62 : .52, bh = c.big ? .72 : .6; // 몸(단위)
  ctx.fillStyle = c.body; rr(ctx, -bw / 2 * W.s, -(.05) * W.s, bw * W.s, bh * W.s, .16 * W.s); ctx.fill();
  ctx.fillStyle = c.skin; ctx.beginPath(); ctx.arc(0, -.35 * W.s, .36 * W.s, 0, Math.PI * 2); ctx.fill();
  if (c.ears) { ctx.beginPath(); ctx.moveTo(-.3 * W.s, -.4 * W.s); ctx.lineTo(-.55 * W.s, -.55 * W.s); ctx.lineTo(-.28 * W.s, -.25 * W.s); ctx.fill(); }
  if (c.hair) { ctx.fillStyle = c.hair; ctx.beginPath(); ctx.arc(0, -.5 * W.s, .3 * W.s, Math.PI, Math.PI * 2); ctx.fill(); }
  if (c.hat) { ctx.fillStyle = c.hat; if (c.cone) { ctx.beginPath(); ctx.moveTo(-.34 * W.s, -.55 * W.s); ctx.lineTo(0, -1.15 * W.s); ctx.lineTo(.34 * W.s, -.55 * W.s); ctx.fill(); } else { rr(ctx, -.4 * W.s, -.75 * W.s, .8 * W.s, .22 * W.s, .06 * W.s); ctx.fill(); rr(ctx, -.28 * W.s, -.95 * W.s, .56 * W.s, .3 * W.s, .08 * W.s); ctx.fill(); } }
  if (c.helmet) { ctx.fillStyle = c.helmet; ctx.beginPath(); ctx.arc(0, -.5 * W.s, .36 * W.s, Math.PI, Math.PI * 2); ctx.fill(); }
  if (c.leaf) { ctx.fillStyle = '#79c45f'; ctx.beginPath(); ctx.ellipse(.15 * W.s, -.75 * W.s, .2 * W.s, .1 * W.s, -.6, 0, Math.PI * 2); ctx.fill(); }
  if (c.beard) { ctx.fillStyle = c.beard; ctx.beginPath(); ctx.ellipse(0, -.12 * W.s, .3 * W.s, .2 * W.s, 0, 0, Math.PI); ctx.fill(); }
  ctx.fillStyle = c.robot ? '#2fd0ff' : '#2b1a0e';
  if (c.robot) { rr(ctx, -.25 * W.s, -.45 * W.s, .5 * W.s, .15 * W.s, .05 * W.s); ctx.fill(); }
  else for (const ex of [-.13, .13]) { ctx.beginPath(); ctx.ellipse(ex * W.s, -.38 * W.s, .05 * W.s, .09 * W.s, 0, 0, Math.PI * 2); ctx.fill(); }
  if (c.tusk) { ctx.fillStyle = '#fff'; for (const ex of [-.12, .12]) { ctx.beginPath(); ctx.moveTo(ex * W.s, -.22 * W.s); ctx.lineTo((ex - .04) * W.s, -.1 * W.s); ctx.lineTo((ex + .04) * W.s, -.1 * W.s); ctx.fill(); } }
  ctx.fillStyle = 'rgba(255,120,120,.45)'; for (const ex of [-.25, .25]) { ctx.beginPath(); ctx.ellipse(ex * W.s, -.28 * W.s, .08 * W.s, .05 * W.s, 0, 0, Math.PI * 2); ctx.fill(); }
  ctx.restore();
}
const AXE_ART = { CrudeAxe: ['#8a5a34', '#9aa3b5'], IronboundAxe: ['#6f4527', '#c9d2e0'], SpikedWarAxe: ['#3a2a1a', '#7b1f2a'], MidasAxe: ['#b8860b', '#ffd84a'], FrostbiteAxe: ['#4a6fa5', '#bff0ff'], ArcaneCresentAxe: ['#4a2a6e', '#c58cff'], MagmaBladeAxe: ['#3a1a0a', '#ff7a3d'], ChainsawAxe: ['#333', '#ffd23f'], CelestialAxe: ['#6b7fd6', '#ffffff'] };
function drawAxe(ctx, key, x, y, s, ang, alpha = 1) {
  const a = AXE_ART[key] || AXE_ART.CrudeAxe; ctx.save(); ctx.globalAlpha = alpha; ctx.translate(x, y); ctx.rotate(ang); ctx.scale(s, s);
  ctx.strokeStyle = a[0]; ctx.lineWidth = .09 * W.s; ctx.lineCap = 'round'; ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(0, -.8 * W.s); ctx.stroke();
  ctx.fillStyle = a[1]; if (key === 'ChainsawAxe') { rr(ctx, -.05 * W.s, -1.0 * W.s, .5 * W.s, .3 * W.s, .1 * W.s); ctx.fill(); } else { ctx.beginPath(); ctx.moveTo(0, -.95 * W.s); ctx.quadraticCurveTo(.5 * W.s, -1.0 * W.s, .45 * W.s, -.55 * W.s); ctx.quadraticCurveTo(.2 * W.s, -.6 * W.s, 0, -.5 * W.s); ctx.fill(); }
  if (key === 'CelestialAxe') { ctx.shadowColor = '#9ccfff'; ctx.shadowBlur = 12; ctx.fill(); }
  ctx.restore();
}
function drawPlayer(ctx, x, y, face, alpha, ghost) {
  const px = sx(x), py = sy(y); const bob = R && !ghost ? Math.sin(R.p.anim) * .04 : 0; const s = 1.15;
  if (!ghost) { ctx.fillStyle = 'rgba(0,0,0,.18)'; ctx.beginPath(); ctx.ellipse(px, sy(-4.72), .5 * W.s, .12 * W.s, 0, 0, Math.PI * 2); ctx.fill(); }
  const swing = R && R.p.swing > 0 ? 1 : 0; const ang = face * (swing ? .9 : -.9);
  drawAxe(ctx, S.axe, px + face * .45 * W.s, py + (.05 - bob) * W.s, s * .9, ang, ghost ? alpha * .6 : 1);
  drawChar(ctx, S.char, px, py - bob * W.s, s, face, alpha, swing);
}
function drawLumberjack(ctx, i) {
  const g = Crew.gear(i); const p = LJ_POS[i]; const face = i % 2 === 0 ? 1 : -1; const lj = R.ljs[i]; const down = R.now < (lj.downUntil || 0);
  const px = sx(p[0]), py = sy(p[1]);
  if (stats.has(PFX.GhostCrew) && Crew.hasGear(i)) { drawAxe(ctx, (g.a || AXES.CrudeAxe).key, px + LJ_GHOST[i] * W.s + face * .4 * W.s, py, .8, face * (down ? .9 : -.9), .5); drawChar(ctx, (g.c || CHARS.Lumberjack).key, px + LJ_GHOST[i] * W.s, py, 1, face, .5, down); }
  drawAxe(ctx, (g.a || AXES.CrudeAxe).key, px + face * .4 * W.s, py, .8, face * (down ? .9 : -.9)); drawChar(ctx, (g.c || CHARS.Lumberjack).key, px, py, 1, face, 1, down);
}
function drawLog(ctx, it) {
  const px = sx(it.x), py = sy(it.y); ctx.save(); ctx.translate(px, py); ctx.rotate(-it.rot * Math.PI / 180); ctx.scale(it.scale, it.scale); ctx.globalAlpha = it.alpha;
  const id = it.cfg ? it.cfg.id : 'normal_log'; const col = LOG_COLOR[id] || LOG_COLOR.normal_log;
  if (id.endsWith('_potion')) { ctx.fillStyle = col; rr(ctx, -.18 * W.s, -.2 * W.s, .36 * W.s, .5 * W.s, .12 * W.s); ctx.fill(); ctx.fillStyle = '#eee'; rr(ctx, -.08 * W.s, -.32 * W.s, .16 * W.s, .14 * W.s, .03 * W.s); ctx.fill(); ctx.fillStyle = 'rgba(255,255,255,.5)'; ctx.beginPath(); ctx.arc(-.06 * W.s, 0, .05 * W.s, 0, Math.PI * 2); ctx.fill(); ctx.restore(); return; }
  if (it.special) { ctx.shadowColor = col; ctx.shadowBlur = 10; }
  ctx.fillStyle = col; rr(ctx, -.45 * W.s, -.2 * W.s, .9 * W.s, .4 * W.s, .14 * W.s); ctx.fill(); ctx.shadowBlur = 0;
  ctx.fillStyle = it.special ? 'rgba(255,255,255,.55)' : '#e2b98b'; ctx.beginPath(); ctx.ellipse(.36 * W.s, 0, .09 * W.s, .17 * W.s, 0, 0, Math.PI * 2); ctx.fill();
  ctx.strokeStyle = 'rgba(0,0,0,.25)'; ctx.lineWidth = .03 * W.s; ctx.beginPath(); ctx.arc(.36 * W.s, 0, .06 * W.s, 0, Math.PI * 2); ctx.stroke();
  if (id === 'magnet_log') { ctx.fillStyle = '#e04040'; rr(ctx, -.2 * W.s, -.12 * W.s, .12 * W.s, .24 * W.s, .03 * W.s); ctx.fill(); ctx.fillStyle = '#4060e0'; rr(ctx, .0 * W.s, -.12 * W.s, .12 * W.s, .24 * W.s, .03 * W.s); ctx.fill(); }
  if (id === 'lightning_log') { ctx.fillStyle = '#fff'; ctx.beginPath(); ctx.moveTo(-.1 * W.s, -.16 * W.s); ctx.lineTo(.02 * W.s, -.02 * W.s); ctx.lineTo(-.06 * W.s, -.02 * W.s); ctx.lineTo(.06 * W.s, .16 * W.s); ctx.lineTo(-.04 * W.s, .03 * W.s); ctx.lineTo(.04 * W.s, .03 * W.s); ctx.fill(); }
  ctx.restore();
}
function drawCoin(ctx, it) {
  const px = sx(it.x), py = sy(it.y); ctx.save(); ctx.translate(px, py); ctx.rotate(-it.rot * Math.PI / 180); ctx.scale(it.scale, it.scale);
  if (it.tier === 0) { ctx.fillStyle = '#e0a21c'; ctx.beginPath(); ctx.arc(0, 0, .22 * W.s, 0, Math.PI * 2); ctx.fill(); ctx.fillStyle = '#ffd84a'; ctx.beginPath(); ctx.arc(0, 0, .16 * W.s, 0, Math.PI * 2); ctx.fill(); }
  else { ctx.fillStyle = it.tier === 1 ? '#ff4d6a' : '#8ff2ff'; ctx.beginPath(); ctx.moveTo(0, -.26 * W.s); ctx.lineTo(.24 * W.s, -.05 * W.s); ctx.lineTo(0, .26 * W.s); ctx.lineTo(-.24 * W.s, -.05 * W.s); ctx.fill(); ctx.fillStyle = 'rgba(255,255,255,.6)'; ctx.beginPath(); ctx.moveTo(-.1 * W.s, -.12 * W.s); ctx.lineTo(.02 * W.s, -.18 * W.s); ctx.lineTo(-.04 * W.s, -.04 * W.s); ctx.fill(); }
  ctx.restore();
}
function drawChest(ctx, it) { const px = sx(it.x), py = sy(it.y); ctx.save(); ctx.translate(px, py); ctx.rotate(-it.rot * Math.PI / 180); ctx.scale(it.scale, it.scale); ctx.fillStyle = '#8a5a34'; rr(ctx, -.35 * W.s, -.25 * W.s, .7 * W.s, .5 * W.s, .08 * W.s); ctx.fill(); ctx.fillStyle = '#b07a4a'; rr(ctx, -.35 * W.s, -.25 * W.s, .7 * W.s, .18 * W.s, .08 * W.s); ctx.fill(); ctx.fillStyle = '#ffd84a'; rr(ctx, -.08 * W.s, -.1 * W.s, .16 * W.s, .16 * W.s, .03 * W.s); ctx.fill(); ctx.restore(); }
function drawCrate(ctx, c) { const px = sx(c.x), py = sy(c.y); ctx.fillStyle = 'rgba(255,255,255,.7)'; ctx.beginPath(); ctx.arc(px, py - .9 * W.s, .6 * W.s, Math.PI, Math.PI * 2); ctx.fill(); ctx.strokeStyle = '#888'; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(px - .55 * W.s, py - .9 * W.s); ctx.lineTo(px - .25 * W.s, py - .25 * W.s); ctx.moveTo(px + .55 * W.s, py - .9 * W.s); ctx.lineTo(px + .25 * W.s, py - .25 * W.s); ctx.stroke(); ctx.fillStyle = '#b07a4a'; rr(ctx, px - .3 * W.s, py - .3 * W.s, .6 * W.s, .6 * W.s, .08 * W.s); ctx.fill(); }
function drawDrone(ctx, d) { const px = sx(d.x), py = sy(d.y); ctx.fillStyle = '#6e7681'; ctx.beginPath(); ctx.ellipse(px, py, .5 * W.s, .22 * W.s, 0, 0, Math.PI * 2); ctx.fill(); ctx.fillStyle = '#9aa3b5'; ctx.beginPath(); ctx.ellipse(px, py - .08 * W.s, .42 * W.s, .16 * W.s, 0, 0, Math.PI * 2); ctx.fill(); ctx.fillStyle = '#2fd0ff'; for (const ex of [-.12, .12]) { ctx.beginPath(); ctx.ellipse(px + (ex + d.dir * .1) * W.s, py - .1 * W.s, .04 * W.s, .06 * W.s, 0, 0, Math.PI * 2); ctx.fill(); } }
function drawFx(ctx, f) {
  if (f.k === 'bolt') { const a = 1 - f.t / f.life; ctx.globalAlpha = a; ctx.strokeStyle = 'rgba(120,180,255,.5)'; ctx.lineWidth = f.w * 2.5 * W.s; ctx.beginPath(); f.pts.forEach((p, i) => i ? ctx.lineTo(sx(p[0]), sy(p[1])) : ctx.moveTo(sx(p[0]), sy(p[1]))); ctx.stroke(); ctx.strokeStyle = '#fff'; ctx.lineWidth = f.w * W.s; ctx.stroke(); ctx.globalAlpha = 1; }
  else if (f.k === 'ring') { const t = f.t / f.life; ctx.globalAlpha = 1 - t; ctx.strokeStyle = '#9ccfff'; ctx.lineWidth = .05 * W.s; ctx.beginPath(); ctx.arc(sx(f.x), sy(f.y), (.1 + .5 * t) * W.s, 0, Math.PI * 2); ctx.stroke(); ctx.globalAlpha = 1; }
  else if (f.k === 'ember') { ctx.globalAlpha = 1 - f.t / f.life; ctx.fillStyle = f.t < .3 ? '#ffd23f' : '#ff6a2a'; ctx.beginPath(); ctx.arc(sx(f.x), sy(f.y), f.r * W.s, 0, Math.PI * 2); ctx.fill(); ctx.globalAlpha = 1; }
}

// ---------- 루프·입력 ----------
let last = performance.now();
function frame(now) { let dt = (now - last) / 1000; last = now; if (dt > .05) dt = .05; try { update(dt); } catch (e) { console.error(e); } draw(); UI.tick(); requestAnimationFrame(frame); }
requestAnimationFrame(frame);
// 숨겨진 창에서 테스트용: 고정 간격 진행
window.timber = { get S() { return S; }, get R() { return R; }, stats, step(sec, h = 1 / 60) { for (let t = 0; t < sec; t += h) update(h); draw(); }, startRun, endRun, Tree, Shop, Crew, AxeUp, Prestige, Ach, T, A, save, cheat(logs, coins) { S.logs += logs || 0; S.coins += coins || 0; save(); Cur.changed(); }, selectCard, reroll, banishCard, G, keys };
addEventListener('keydown', e => {
  if (e.repeat) return; const k = e.code;
  if (k === 'ArrowLeft' || k === 'KeyA') keys.left = true; if (k === 'ArrowRight' || k === 'KeyD') keys.right = true; if (k === 'ShiftLeft' || k === 'ShiftRight' || k === 'Space') keys.dash = true;
  if (k === 'KeyE' && R && G.state === 'play') toggleNearestDrone();
  if (k === 'Escape') UI.onEscape();
  if (G.state === 'cards' && k.startsWith('Digit')) selectCard(+k[5] - 1);
  if (k === 'KeyR' && G.state === 'cards') reroll();
});
addEventListener('keyup', e => { const k = e.code; if (k === 'ArrowLeft' || k === 'KeyA') keys.left = false; if (k === 'ArrowRight' || k === 'KeyD') keys.right = false; if (k === 'ShiftLeft' || k === 'ShiftRight' || k === 'Space') keys.dash = false; });
cv.addEventListener('pointerdown', e => { const wx = (e.clientX * devicePixelRatio - W.cx) / W.s, wy = (W.cy - e.clientY * devicePixelRatio) / W.s; clickWorld(wx, wy); });
