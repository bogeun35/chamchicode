// ════════════ HUD · 기지 시설 · 패널 · 스킬트리 · 루프 ════════════
'use strict';
// ── HUD (원작 HUD.gd 배치) ──
function icon(img, cls) { const c = document.createElement('canvas'); c.width = 16; c.height = 16; const x = c.getContext('2d'); x.imageSmoothingEnabled = false; x.drawImage(img, 0, 0); if (cls) c.className = cls; return c; }
function hudInv() {
  const box = $('inv'), slots = Math.min(ST.slots(), 20), st = ST.stack(), items = scene === 'mine' && R ? R.inv : S.inv, cells = [];
  for (const L of Object.keys(items)) { let n = items[L]; while (n > 0 && cells.length < slots) { cells.push([+L, Math.min(n, st)]); n -= st; } }
  box.innerHTML = '';
  for (let i = 0; i < slots; i++) { const d = document.createElement('div'); d.className = 'slot'; const c = cells[i]; if (c) { d.appendChild(icon(A.oreIcon(c[0]))); const b = document.createElement('b'); b.textContent = fmt(c[1]); d.appendChild(b); d.title = LAYERS[c[0]].ore; } else d.style.opacity = '.55'; box.appendChild(d); }
}
const RES_ORDER = [1, 0, 2, 3, 5, 6, 7, 8, 9, 10, 11, 12, 4];
function hudRes() { const box = $('res'); box.innerHTML = ''; for (const i of RES_ORDER) { if (!(S.cur[i] > 0)) continue; const r = document.createElement('div'); r.className = 'rrow'; r.title = CUR[i]; r.appendChild(icon(A.barSprite(i))); const s = document.createElement('span'); s.textContent = fmt(S.cur[i]); r.appendChild(s); box.appendChild(r); } }
function hudXp() { const a = xpFor(S.lvl), b = xpFor(S.lvl + 1), mx = S.lvl >= MAX_LEVEL, f = mx ? 1 : clamp((S.xp - a) / (b - a), 0, 1); $('xpI').style.width = (f * 100) + '%'; $('xpbar').classList.toggle('max', mx); $('xpLv').textContent = mx ? 'MAX' : 'Lv ' + S.lvl; }
function hudEnergy() {
  const cur = scene === 'mine' && R ? R.energy : ST.maxEnergy(), mx = scene === 'mine' && R ? R.maxE : ST.maxEnergy(), f = mx ? cur / mx : 0;
  $('eI').style.height = (f * 100) + '%'; $('ebat').className = 'ebat' + (f > .5 ? '' : f > .15 ? ' mid' : ' low'); $('eT').textContent = '⚡ ' + Math.floor(cur) + '/' + mx;
  $('vig').classList.toggle('on', scene === 'mine' && f <= .1 && f > 0);
}
function drawPortrait() { const c = $('portrait'), x = c.getContext('2d'); x.imageSmoothingEnabled = false; x.clearRect(0, 0, 32, 32); x.drawImage(A.orc('idle', 0), 0, 0, 20, 20, -4, -2, 40, 40); }
function setHud() {
  const mine = scene === 'mine';
  $('bReturn').style.display = mine ? '' : 'none'; document.querySelector('.tb[data-k="down"]').style.display = mine && R && R.water != null ? '' : 'none';
  hudInv(); hudRes(); hudXp(); hudEnergy(); renderQuests();
}
function showArea(n, sub) { const el = $('areaname'); el.innerHTML = esc(n) + '<small>' + esc(sub || '') + '</small>'; el.classList.add('on'); clearTimeout(showArea._t); showArea._t = setTimeout(() => el.classList.remove('on'), 2400); }
function chunkPopup(L) {
  const el = $('chunkpop'), req = chunksReq(L), filled = clamp(S.gems[L], 0, req);
  el.innerHTML = `<div>${esc(LAYERS[L].chunk)} 발견! (${filled}/${req})</div><div class="sl"></div>`;
  for (let i = 0; i < req; i++) { const c = icon(A.chunkSprite(L)); c.style.opacity = i < filled ? 1 : .25; el.querySelector('.sl').appendChild(c); }
  el.classList.add('on'); clearTimeout(chunkPopup._t); chunkPopup._t = setTimeout(() => el.classList.remove('on'), 2800);
  if (S.gems[L] >= req && L < 7) setTimeout(() => toast(`⛏️ 상점에서 ${PICK[L + 1].n}을(를) 만들 수 있어요!`, 3200), 2900);
}
function onLevelUp() {   // HUD._on_level_up: 연출 + 토큰 1
  const el = $('lvup'); el.textContent = '레벨 업! ' + S.lvl; el.classList.add('on'); clearTimeout(onLevelUp._t); onLevelUp._t = setTimeout(() => el.classList.remove('on'), 1800);
  S.cur[4] += 1; hudRes(); sfx('level'); questEvent('level_reached');
  const nx = LAYERS.findIndex((L, i) => i > 0 && L.req === S.lvl); if (nx > 0) setTimeout(() => toast(`🔓 레벨 ${S.lvl} — ${LAYERS[nx].n}에 갈 레벨이 됐어요 (${PICK[nx].n} 필요)`, 3600), 1200);
}

// ── 퀘스트 (TutorialManager: 동시에 2개, 완료마다 토큰 1) ──
const TASKS = [
  { id: 'visit_skill_tree', t: '상점 주인과 대화하기', ev: 'shopkeeper', o: 1, req: () => 1 },
  { id: 'purchase_pickaxe', t: '나무 곡괭이 사기', ev: 'wooden_pickaxe_purchased', o: 1.5, req: () => S.fl.talked },
  { id: 'descend_elevator', t: '승강기 타고 내려가기', ev: 'entered_mine', o: 2, req: () => lv('wooden_pickaxe') > 0 },
  { id: 'smelt_ore', t: '광석 제련하기', ev: 'ore_smelted', o: 3, req: () => S.fl.firstReturn },
  { id: 'collect_gold_chunks', t: '금 덩어리 채굴', n: 3, ev: 'gold_chunk_collected', o: 4, req: () => S.fl.entries >= 2, layer: 0 },
  { id: 'collect_cobalt_chunks', t: '코발트 덩어리 채굴', n: 4, ev: 'cobalt_chunk_collected', o: 4.5, req: () => S.quests.done.includes('collect_gold_chunks'), layer: 1 },
  { id: 'reach_level_10', t: '레벨 10 달성', n: 10, ev: 'level_reached', o: 5, req: () => S.fl.entries >= 2, lvl: 1 },
  { id: 'reach_level_20', t: '레벨 20 달성', n: 20, ev: 'level_reached', o: 6, req: () => S.quests.done.includes('reach_level_10'), lvl: 1 }];
const qProg = q => q.lvl ? S.lvl : q.layer != null ? (hasMaxChunks(q.layer) ? q.n : S.gems[q.layer]) : 0;
function activeTasks() { return TASKS.filter(q => !S.quests.done.includes(q.id) && q.req()).sort((a, b) => a.o - b.o).slice(0, 2); }
function questEvent(ev) {
  if (ev === 'shopkeeper') S.fl.talked = 1;
  if (ev === 'entered_mine' && S.fl.entries >= 1) {}
  for (const q of TASKS) {
    if (S.quests.done.includes(q.id) || q.ev !== ev) continue;
    if (q.n) { if (qProg(q) >= q.n && q.req()) completeTask(q); }
    else if (q.req()) completeTask(q);
  }
  for (const q of activeTasks()) if (q.n && qProg(q) >= q.n) completeTask(q);
  renderQuests();
}
function completeTask(q) { if (S.quests.done.includes(q.id)) return; S.quests.done.push(q.id); S.cur[4] += 1; hudRes(); sfx('token'); toast('✔ ' + q.t + ' — 토큰 +1'); save(); }
function renderQuests() {
  const el = $('quests'); if (scene === 'mine' && S.fl.entries <= 1) { el.innerHTML = ''; return; }
  el.innerHTML = activeTasks().map(q => `<div class="q">${esc(q.t)}${q.n ? ` (${Math.min(qProg(q), q.n)}/${q.n})` : ''}</div>`).join('');
}

// ── 제련소 (Smelter.gd: 광석 1 → 주괴 1, 0.375초 × 광석 배율 ÷ 제련 속도, 시간 예산 방식) ──
const smeltCap = () => ST.smeltSlots() * ST.smeltPer();
const sumv = o => Object.values(o).reduce((a, b) => a + b, 0);
const smeltTime = L => .375 * SMELT_MULT[L] / ST.smeltSpeed();
const smeltCurrent = () => { for (let L = 0; L < 8; L++) if (S.smelt.in[L] > 0) return L; return null; };
const smeltBusy = () => smeltCurrent() != null;
function smeltBudget(budget) {
  let rem = budget, tot = sumv(S.smelt.out); const cap = smeltCap();
  for (let L = 0; L < 8; L++) {
    if (rem <= 0) break; const have = S.smelt.in[L] | 0; if (have <= 0) continue;
    const space = cap - tot; if (space <= 0) break;
    const per = Math.max(.0001, smeltTime(L)), aff = Math.floor(rem / per); if (aff <= 0) break;
    const batch = Math.min(aff, have, space); if (batch <= 0) continue;
    S.smelt.in[L] = have - batch; if (S.smelt.in[L] <= 0) delete S.smelt.in[L];
    let bonus = 0; const ch = ST.doubleSmelt(), yb = ST.doubleSmeltYield();
    if (ch > 0) for (let k = 0; k < Math.min(batch, 5000); k++) if (Math.random() < ch) { bonus++; if (yb > 0) { bonus += Math.trunc(yb); if (Math.random() < yb % 1) bonus++; } }
    bonus = Math.min(bonus, Math.max(0, cap - (tot + batch)));
    S.smelt.out[L] = (S.smelt.out[L] | 0) + batch + bonus; tot += batch + bonus; rem -= batch * per;
  }
  return rem;
}
function tickSmelt() {
  const now = Date.now(), el = Math.max(0, (now - (S.smelt.t || now)) / 1000); S.smelt.t = now;
  if (!smeltBusy()) { S.smelt.timer = 0; return; }
  S.smelt.timer += el; const left = smeltBudget(S.smelt.timer), cur = smeltCurrent();
  if (Math.abs(left - S.smelt.timer) < 1e-9) S.smelt.timer = cur == null ? 0 : Math.min(S.smelt.timer, smeltTime(cur)); else S.smelt.timer = Math.max(left, 0);
}
function smeltDeposit() {   // deposit_all_ore: 가방(기지 보관분) + 드론 저장소 → 입력 (총 용량까지)
  let space = smeltCap() - sumv(S.smelt.in), moved = 0;
  for (const src of [S.inv, S.dstore]) for (let L = 0; L < 8 && space > 0; L++) { const n = Math.min(src[L] | 0, space); if (n <= 0) continue; src[L] -= n; if (src[L] <= 0) delete src[L]; S.smelt.in[L] = (S.smelt.in[L] | 0) + n; space -= n; moved += n; }
  if (moved) { sfx('smelt'); toast(`🔥 광석 ${fmt(moved)}개를 넣었어요`); questEvent('ore_smelted'); hudInv(); }
  return moved > 0;
}
function smeltCollect() { const o = S.smelt.out; let n = 0; for (const L in o) { S.cur[BAR_OF_LAYER[L]] += o[L]; n += o[L]; } if (!n) return false; S.smelt.out = {}; sfx('buy'); toast(`주괴 ${fmt(n)}개를 꺼냈어요`); hudRes(); return true; }
function smelterAct() { if (!S.smelt.colFirst) { if (!smeltCollect() && !smeltDeposit()) { sfx('no'); toast(sumv(S.smelt.in) >= smeltCap() ? '제련소가 가득 찼어요' : '넣을 광석이 없어요 — 광산에서 캐 오세요'); } } else { if (!smeltDeposit() && !smeltCollect()) sfx('no'); } S.smelt.colFirst = !S.smelt.colFirst; save(); }

// ── 주조소 (Foundry.gd: 레시피마다 레인 1개, 재료 선불, 자동 리필) ──
const fCost = n => Math.max(1, Math.round(n * ST.foundryCost()));
const fCan = (r, k) => r.ing.every(([c, n]) => S.cur[c] >= fCost(n) * k);
const fMax = r => Math.min(999, ...r.ing.map(([c, n]) => Math.floor(S.cur[c] / fCost(n))));
function fStart(r, k) { if (k <= 0 || !fCan(r, k)) return false; for (const [c, n] of r.ing) S.cur[c] -= fCost(n) * k; const j = S.fnd.jobs[r.id]; if (j) j.rem += k; else S.fnd.jobs[r.id] = { rem: k, timer: 0 }; if (!S.fnd.auto.includes(r.id)) S.fnd.auto.push(r.id); hudRes(); return true; }
let fUiT = 0;
function tickFoundry(dt) {
  const now = Date.now(), el = Math.max(0, (now - (S.fnd.t || now)) / 1000); S.fnd.t = now; if (!Object.keys(S.fnd.jobs).length) return;
  for (const id of Object.keys(S.fnd.jobs)) {
    const j = S.fnd.jobs[id], r = RECIPES.find(x => x.id === id), ct = r.t / ST.foundrySpeed(); j.timer += el;
    let made = 0; while (j.rem > 0 && j.timer >= ct && made < 100000) { j.timer -= ct; j.rem--; S.fnd.out[r.out] = (S.fnd.out[r.out] | 0) + 1; made++; if (j.rem <= 0 && lv('foundry_autocraft') && fCan(r, 1)) { for (const [c, n] of r.ing) S.cur[c] -= fCost(n); j.rem++; } }
    if (j.rem <= 0) delete S.fnd.jobs[id];
  }
  if (panelKind === 'foundry' && (fUiT += dt || 0) > .25) { fUiT = 0; renderFoundry(); }
}

// ── 패널 공통 ──
let panelKind = null, treeOpen = false;
const overlayOn = () => panelKind !== null || treeOpen;
const xBtn = '<button class="btn sm x" onclick="closeAll()">✕</button>';
function openPanel(kind, html) { panelKind = kind; $('panel').innerHTML = html; $('panelOv').classList.add('on'); for (const k in K) K[k] = 0; M.down = 0; }
function closeAll() { if (panelKind === 'results') return; $('panelOv').classList.remove('on'); $('liftOv').classList.remove('on'); $('treeOv').classList.remove('on'); panelKind = null; treeOpen = false; setHud(); save(); }
$('panelOv').addEventListener('pointerdown', e => { if (e.target === $('panelOv') && panelKind !== 'results') closeAll(); });
$('liftOv').addEventListener('pointerdown', e => { if (e.target === $('liftOv')) closeAll(); });
const ci = i => `<img class="ic16" src="${A.barSprite(i).toDataURL()}">`;
const oi = L => `<img class="ic16" src="${A.oreIcon(L).toDataURL()}">`;
const chi = L => `<img class="ic16" src="${A.chunkSprite(L).toDataURL()}">`;

function hubAct(s) {
  sfxUnlock();
  if (s.k === 'smelter') smelterAct();
  else if (s.k === 'shop') { if (!S.fl.talked) { questEvent('shopkeeper'); toast('🧌 상점 주인: "어서 와! 곡괭이부터 하나 장만하라고 — 첫 곡괭이는 공짜야."', 4200); } openTree('main'); }
  else if (s.k === 'altar') openTree('token');
  else if (s.k === 'lift') { if (!lv('wooden_pickaxe')) { sfx('no'); toast('곡괭이가 있어야 내려갈 수 있어요 — 상점에서 나무 곡괭이를 받으세요'); return; } openLift(); }
  else if (s.k === 'foundry') renderFoundry(true);
  else if (s.k === 'anvil') renderAnvil(true);
  else if (s.k === 'workshop') renderWorkshop(true);
  else if (s.k === 'drone') { S.fl.drone = 1; sfx('chunk'); toast('🤖 드론이 다시 함께해요 — 이제 광산에서 광석을 캐 와요', 3600); save(); }
}

// ── 승강기 지역 선택 (LevelSelect: 기지1 · 0~3층 / 기지2 · 4~7층) ──
let liftSel = null;
function openLift() { liftSel = liftSel == null ? { k: 'layer', i: S.lastLayer } : liftSel; panelKind = 'lift'; $('liftOv').classList.add('on'); renderLift(); }
function renderLift() {
  const card = (k, i) => {
    if (k === 'base') { const lock = i === 1 && !base2Unlocked(), here = S.base === i; return `<div class="lcard ${liftSel.k === k && liftSel.i === i ? 'sel' : ''} ${lock ? 'lock' : ''}" data-k="base" data-i="${i}"><div class="sw" style="background:#3a2a1a">🏠</div>${i ? '두 번째 오크 기지' : '오크 기지'}${here ? '<small class="ok">현재 위치</small>' : ''}</div>`; }
    const ok = layerUnlocked(i), P = A.PAL[i];
    return `<div class="lcard ${liftSel.k === k && liftSel.i === i ? 'sel' : ''} ${ok ? '' : 'lock'}" data-k="layer" data-i="${i}"><div class="sw" style="background:linear-gradient(${P.bg1},${P.rock});border-color:${P.edge}"></div>${esc(LAYERS[i].n)}${ok ? '' : '<small>🔒</small>'}</div>`;
  };
  let info = '';
  if (liftSel.k === 'base') {
    const i = liftSel.i, lock = i === 1 && !base2Unlocked();
    info = `<h3>${i ? '두 번째 오크 기지' : '오크 기지'}</h3><p>${i ? '제련소 · 상점 · 토큰 제단 · 리포지 모루 · 주조소 · 드론 작업장' : '제련소 · 상점 · 토큰 제단'}</p>` +
      (lock ? `<p class="no">🔒 크리스탈 곡괭이와 레벨 40이 필요해요 (지금 ${PICK[S.pick - 1].n} · Lv ${S.lvl})</p>` : S.base === i ? '<p class="ok">지금 여기 있어요</p>' : `<button class="btn go" id="lGo">이동</button>`);
  } else {
    const i = liftSel.i, L = LAYERS[i], ok = layerUnlocked(i), req = chunksReq(i);
    const res = [`${ci(1)} 돌`, `${oi(i)} ${esc(L.ore)} <small style="color:var(--dim)">(${L.freq})</small>`].concat(i === 2 ? [`${oi(0)} 금 광석`] : []).concat([`${ci(4)} 토큰`]);
    info = `<h3>${esc(L.n)}</h3><p>깊이 ${L.depth[0]}–${L.depth[1]}m · 블록 체력 ×${L.hp}</p><p>나오는 것: ${res.join(' · ')}</p>` +
      `<p>${chi(i)} ${esc(L.chunk)}: ${S.pick >= i + 2 ? '<span class="ok">곡괭이 제작 완료</span>' : `${Math.min(S.gems[i], req)}/${req}`}</p>` +
      (ok ? `<button class="btn go" id="lGo">⬇ 내려가기</button>` : `<p class="no">🔒 필요: 레벨 ${L.req} (지금 ${S.lvl}) · ${PICK[clamp(i + 1, 1, 8) - 1].n}${i === 4 && !S.fl.base2 ? ' · 두 번째 오크 기지 방문' : ''}</p>`);
  }
  $('lift').innerHTML = `<h2>승강기 ${xBtn}</h2><div class="lgrid">${card('base', 0)}${[0, 1, 2, 3].map(i => card('layer', i)).join('')}${card('base', 1)}${[4, 5, 6, 7].map(i => card('layer', i)).join('')}</div><div class="linfo card">${info}</div>`;
  $('lift').querySelectorAll('.lcard').forEach(c => c.onclick = () => { liftSel = { k: c.dataset.k, i: +c.dataset.i }; sfx('tap'); renderLift(); });
  if ($('lGo')) $('lGo').onclick = () => { const s = liftSel; $('liftOv').classList.remove('on'); panelKind = null; fadeTo(() => { if (s.k === 'base') enterHub(s.i, true); else startRun(s.i); }); };
}
function fadeTo(fn) { const f = $('fade'); f.classList.add('on'); sfx('lift'); setTimeout(() => { fn(); setTimeout(() => f.classList.remove('on'), 60); }, 320); }

// ── 결과 화면 (ResultsScreen) ──
function showResults() {
  if (!R) return;
  const st = R.stats, rows = [];
  for (let L = 0; L < 8; L++) if (R.inv[L] > 0) rows.push(`<div class="rli">${oi(L)} ${esc(LAYERS[L].ore)}<b>${fmt(R.inv[L])}</b></div>`);
  if (R.stoneGot) rows.push(`<div class="rli">${ci(1)} 돌<b>${fmt(R.stoneGot)}</b></div>`);
  if (st.tokens) rows.push(`<div class="rli">${ci(4)} 토큰<b>+${st.tokens}</b></div>`);
  const dmg = [['곡괭이', st.pick], ['번개', st.light], ['폭발', st.boom], ['펄스 웨이브', st.pulse]].filter(d => d[1] > 0);
  openPanel('results', `<h2>${R.endWhy === 'final' ? '🌌 핵의 포털이 안정되었습니다' : R.endWhy === 'energy' ? '⚡ 에너지 고갈' : '⛏ 원정 결과'}</h2>
    <p class="sub">${esc(LAYERS[R.layer].n)} · 캔 블록 ${fmt(st.blocks)}</p><div class="rlist">${rows.join('') || '<div class="rli">얻은 자원이 없어요</div>'}</div>
    ${dmg.length ? `<p class="sub" style="margin-top:10px">입힌 피해</p><div class="rlist">${dmg.map(d => `<div class="rli">${d[0]}<b>${fmt(d[1] * 10)}</b></div>`).join('')}<div class="rli">합계<b>${fmt(dmg.reduce((a, d) => a + d[1], 0) * 10)}</b></div></div>` : ''}
    <div class="row" style="margin-top:12px"><button class="btn go" id="rGo" style="flex:1">계속 (Space)</button></div>`);
  $('rGo').onclick = resultsContinue;
}
function resultsContinue() {
  if (panelKind !== 'results' || !R) return;
  for (const L in R.inv) S.inv[L] = (S.inv[L] | 0) + R.inv[L];
  S.fl.lastLevel = R.layer; if (!S.fl.firstReturn) S.fl.firstReturn = 1;
  panelKind = null; $('panelOv').classList.remove('on');
  fadeTo(() => { enterHub(S.base, true); questEvent('returned'); });
}
$('bReturn').onclick = () => { if (scene === 'mine' && R && !R.ending && confirm('지상으로 귀환할까요?')) endRun('return'); };

// ── 주조소 패널 ──
const fAmt = {};
function renderFoundry(open) {
  const card = r => { const j = S.fnd.jobs[r.id], ct = r.t / ST.foundrySpeed(), a = clamp(fAmt[r.id] || 1, 1, Math.max(1, fMax(r)));
    return `<div class="card"><h3>${ci(r.out)} ${CUR[r.out]} <small style="color:var(--dim);font-weight:normal">보유 ${fmt(S.cur[r.out])} · 보관 ${fmt(S.fnd.out[r.out] | 0)}</small></h3>
      <p>${r.ing.map(([c, n]) => `${ci(c)} <span class="${S.cur[c] >= fCost(n) * a ? 'ok' : 'no'}">${fCost(n) * a} / ${fmt(S.cur[c])}</span>`).join(' &nbsp; ')}</p>
      <div class="prog"><i style="width:${j ? clamp(j.timer / ct, 0, 1) * 100 : 0}%"></i></div><p>${j ? `${(ct - j.timer).toFixed(1)}초 · ×${j.rem}` : '대기 중'} · 1개 ${ct.toFixed(1)}초</p>
      <div class="row" style="margin-top:5px"><button class="btn sm" data-m="${r.id}">−</button><b>${a}</b><button class="btn sm" data-p="${r.id}">+</button><button class="btn sm" data-x="${r.id}">최대</button><button class="btn sm go" data-c="${r.id}" ${fCan(r, a) ? '' : 'disabled'} style="margin-left:auto">제작</button></div></div>`; };
  openPanel('foundry', `<h2>🏭 주조소 ${xBtn}</h2><p class="sub">주괴를 섞어 합금을 만들어요. 재료는 먼저 내고, 레시피마다 한 줄씩 동시에 돌아가요.${lv('foundry_autocraft') ? ' 자동 제작이 켜져 있어요.' : ''}</p>${RECIPES.map(card).join('')}
    <div class="row" style="margin-top:10px"><button class="btn go" id="fCol" style="flex:1">꺼내기</button><button class="btn" id="fRet" ${Object.keys(S.fnd.jobs).length ? '' : 'disabled'}>전부 취소하고 재료 돌려받기</button></div>`);
  const P = $('panel'), rr = id => RECIPES.find(r => r.id === id);
  P.querySelectorAll('[data-m]').forEach(b => b.onclick = () => { fAmt[b.dataset.m] = Math.max(1, (fAmt[b.dataset.m] || 1) - 1); renderFoundry(); });
  P.querySelectorAll('[data-p]').forEach(b => b.onclick = () => { fAmt[b.dataset.p] = (fAmt[b.dataset.p] || 1) + 1; renderFoundry(); });
  P.querySelectorAll('[data-x]').forEach(b => b.onclick = () => { fAmt[b.dataset.x] = Math.max(1, fMax(rr(b.dataset.x))); renderFoundry(); });
  P.querySelectorAll('[data-c]').forEach(b => b.onclick = () => { const r = rr(b.dataset.c); if (fStart(r, clamp(fAmt[r.id] || 1, 1, 999))) { sfx('buy'); save(); } else sfx('no'); renderFoundry(); });
  $('fCol').onclick = () => { let n = 0; for (const k in S.fnd.out) { S.cur[k] += S.fnd.out[k]; n += S.fnd.out[k]; } S.fnd.out = {}; if (n) { sfx('buy'); toast(`합금 ${n}개를 꺼냈어요`); } else sfx('no'); hudRes(); renderFoundry(); save(); };
  $('fRet').onclick = () => { for (const id in S.fnd.jobs) { const r = rr(id); for (const [c, n] of r.ing) S.cur[c] += fCost(n) * S.fnd.jobs[id].rem; } S.fnd.jobs = {}; S.fnd.auto = []; sfx('tap'); hudRes(); renderFoundry(); save(); };
}
// ── 리포지 모루 (ReforgeAnvil: 토큰으로 칸 열기 30/60/90, 다시 굴리기 15+곡괭이등급×5, 15% 전설=최대) ──
function rollStat() { const ids = Object.keys(STAT_POOL), id = ids[Math.floor(Math.random() * ids.length)], [a, b] = STAT_POOL[id]; return { id, v: Math.random() < .15 ? b : randi(a, b - 1) }; }
function renderAnvil() {
  const rf = S.refg, unlock = 30 + rf.slots * 30, reroll = lv('efficient_reforging') ? Math.trunc(epl('efficient_reforging', 25)) : 15 + S.pick * 5;
  const rows = [0, 1, 2].map(i => { const s = rf.stats[i]; if (i >= rf.slots) return `<div class="card lock"><h3>🔒 ${i + 1}번 칸</h3></div>`; const [a, b, n] = STAT_POOL[s.id], r = (s.v - a) / (b - a); return `<div class="card"><h3>${n} <span style="color:${r >= 1 ? '#ffd36b' : r > .66 ? '#9fd0ff' : '#ccc'}">+${s.v}%</span>${r >= 1 ? ' ✨' : ''}</h3><p>범위 ${a}~${b}%</p></div>`; }).join('');
  openPanel('anvil', `<h2>🔨 리포지 모루 ${xBtn}</h2><p class="sub">곡괭이에 추가 능력을 새겨요. 칸을 열고, 토큰으로 모든 칸을 다시 굴릴 수 있어요. 세 칸이 모두 최대값이면 무지갯빛 곡괭이가 돼요.${S.perfect ? ' <b style="color:#ffd36b">✨ 완벽한 리포지 달성</b>' : ''}</p>${rows}
    <div class="row" style="margin-top:10px">${rf.slots < 3 ? `<button class="btn" id="aUn" ${S.cur[4] >= unlock ? '' : 'disabled'}>${ci(4)} ${unlock} 칸 열기</button>` : ''}<button class="btn go" id="aRe" ${rf.slots && S.cur[4] >= reroll ? '' : 'disabled'} style="margin-left:auto">${ci(4)} ${reroll} 다시 굴리기</button></div>`);
  if ($('aUn')) $('aUn').onclick = () => { if (S.cur[4] < unlock) return; S.cur[4] -= unlock; rf.slots++; rf.stats.push(rollStat()); sfx('clang'); hudRes(); renderAnvil(); save(); };
  $('aRe').onclick = () => { if (!rf.slots || S.cur[4] < reroll) return; S.cur[4] -= reroll; rf.stats = rf.stats.slice(0, rf.slots).map(rollStat); sfx('clang'); if (rf.slots === 3 && rf.stats.every(s => s.v >= STAT_POOL[s.id][1])) { S.perfect = 1; toast('✨ 완벽한 리포지!', 3000); } hudRes(); renderAnvil(); save(); };
}
// ── 드론 작업장 ──
function renderWorkshop() {
  const names = { speed: ['속도', '비행 속도'], damage: ['피해', '타격당 피해'], attack_speed: ['공격 속도', '공격 빈도'], battery: ['활동 시간', '가동 시간'], recharge: ['충전 속도', '충전 빠르기'], cargo: ['화물칸', '저장 한도'] };
  const rows = Object.keys(DRONE_UP).map(k => {
    const fam = DRONE_UP[k], tot = fam.reduce((a, f) => a + lv(f[0]), 0), maxT = fam.length * 5, nx = fam.find(f => lv(f[0]) < 5);
    const cost = nx ? nx[2] + nx[3] * lv(nx[0]) : 0, eff = k === 'cargo' ? `최대 ${ST.cargo()}` : `+${Math.round((ST.drone(k) - 1) * 100)}%`;
    return `<div class="card"><h3>${names[k][0]} <small style="color:var(--dim);font-weight:normal">Lv ${tot}/${maxT} · ${eff}</small></h3><div class="row" style="margin-top:4px"><span class="sub" style="margin:0">${names[k][1]}</span>${nx ? `<button class="btn sm go" data-u="${nx[0]}" style="margin-left:auto" ${S.cur[nx[1]] >= cost ? '' : 'disabled'}>${ci(nx[1])} ${cost}</button>` : '<b class="ok" style="margin-left:auto">최대</b>'}</div></div>`;
  }).join('');
  openPanel('workshop', `<h2>🤖 드론 작업장 ${xBtn}</h2><p class="sub">${S.fl.drone ? '광산에서 함께 광석을 캐는 드론을 강화해요.' : '아직 드론이 없어요 — 기지 왼쪽에 멈춰 있는 드론에게 다가가 보세요.'}</p>${rows}`);
  $('panel').querySelectorAll('[data-u]').forEach(b => b.onclick = () => { const id = b.dataset.u, f = Object.values(DRONE_UP).flat().find(x => x[0] === id), c = f[2] + f[3] * lv(id); if (S.cur[f[1]] < c) return; S.cur[f[1]] -= c; S.up[id] = lv(id) + 1; sfx('buy'); hudRes(); renderWorkshop(); save(); });
}
// ── 최종 보스 (FinalBossPortal: 번역기 필요, 일렉트럼·강화강·프리즘 각 500) ──
function bossInteract() {
  if (!lv('universal_translator')) { toast('👾 "ẑ̷͝ʘ̸ ҉ ʞ̶ɹ̷ɐ̸..." — 알아들을 수 없어요 (상점의 만능 번역기가 필요해요)', 3600); return; }
  if (!S.fl.translated) { S.fl.translated = 1; toast('👾 "작은 고블린이여… 일렉트럼, 강화강, 프리즘 주괴를 각각 500개 바쳐라. 그러면 갇힌 드론들을 놓아주마."', 6000); save(); return; }
  let fedAny = 0; for (const c of [10, 11, 12]) { const rem = 500 - S.fed[c], take = Math.min(S.cur[c], rem); if (take > 0) { S.cur[c] -= take; S.fed[c] += take; fedAny = 1; } }
  hudRes(); save();
  if ([10, 11, 12].every(c => S.fed[c] >= 500)) { S.fl.done = 1; R.shake = 10; sfx('chunk'); toast('🌌 보스가 만족했어요! 블랙홀이 닫히고 드론들이 풀려났어요', 5000); save(); setTimeout(() => endRun('final'), 2500); return; }
  if (!fedAny) toast('👾 "주괴가 없구나…"'); else { sfx('smelt'); toast(`👾 먹였어요 — 일렉트럼 ${S.fed[10]}/500 · 강화강 ${S.fed[11]}/500 · 프리즘 ${S.fed[12]}/500`, 3600); }
}

// ════════════ 스킬트리 (SkillTree.gd · SkillTreeNode.gd) ════════════
const ICON = { wooden_pickaxe: '🪓', mining_speed: '⚡', max_energy: '🔋', pickaxe_power: '⛏️', smelting_speed: '🔥', stone_yield: '🪨', critical_strike: '🎯', critical_power: '💢', fortune: '🍀', efficiency: '🌿', multi_strike: '✳️',
  static_charge: '🌩️', static_surge: '🌩️', chain_conductor: '⛓️', voltage_spike: '⚡', tesla_coil: '🌀', explosive_mining: '💣', blast_force: '💥', blast_radius: '⭕', tactical_nuke: '☢️', pulse_wave: '🌊', wave_intensity: '〰️', wave_range: '📏', wave_spread: '📐', wave_duration: '⏱️', evolved_pulse_wave: '🌈',
  bouncing_ball: '🔵', ball_count: '🔵', ball_bounces: '↩️', ball_damage: '💠', bouncing_ball_evolved: '🌈', overclocked: '⏩', overclock_power: '⏫', overclock_duration: '⏱️', overclock_surge: '🌟', deep_pockets: '👝', bigger_bag: '🎒', jetpack: '🚀', endless_jetpack: '♾️',
  structure_spawn: '🏛️', token_bounty: '🪙', treasure_sense: '🔍', prospector_eye: '👁️', prospectors_fortune: '🍀', mother_lode: '💎', lucky_strike: '🎲', double_glint: '✨', double_smelt: '🔁', double_smelt_yield: '🔁', smelter_capacity: '📦', smelter_slots: '🗃️',
  foundry_speed: '🏭', foundry_efficiency: '🏭', foundry_autocraft: '⚙️', efficient_reforging: '🔨', increased_range: '📏', swift_feet: '👟', universal_translator: '📜', magnetic_pull: '🧲', mining_drones: '🤖',
  token_damage: '⛏️', token_mining_speed: '⚡', token_lightning_damage: '🌩️', token_lightning_proc: '🌩️', token_lightning_double: '🌩️', token_explosion_damage: '💥', token_explosion_proc: '💣', token_explosion_size: '⭕', token_pulse_damage: '🌊', token_pulse_proc: '🌊', token_pulse_rear: '↔️', token_ball_damage: '💠', token_ball_proc: '🔵', token_ball_explosion: '💥' };
const fam = id => id.replace(/_\d+$/, '');
const YIELD_LAYER = { gold_yield: 0, cobalt_yield: 1, iron_yield: 2, crystal_yield: 3, molten_yield: 4, sea_yield: 5, void_yield: 6, cosmic_yield: 7 };
const iconOf = id => /^pickaxe_(gold|cobalt|iron|crystal|molten|sea|void)$/.test(id) ? '⛏️' : /_yield/.test(id) && !/stone/.test(id) ? '💰' : ICON[fam(id)] || ICON[id] || ICON[id.replace(/_\d+$/, '').replace(/_\d+$/, '')] || '✦';
const TV = { kind: 'main', x: 0, y: 0, z: 1, sel: null, hov: null, drag: null, moved: 0, pts: new Map(), pinch: 0 };
const tcv = $('tcv'), tctx = tcv.getContext('2d');
const nodesOf = () => TV.kind === 'token' ? TTREE : TREE;
function costOf(n) {
  const L = lv(n.id); if (L >= n.max) return [];
  if (n.pick) { const t = PICK[n.pick - 1]; return [['gem', t.layer, t.cost]]; }
  if (n.chunk) return [['gem', n.chunk[0], n.chunk[1]]];
  if (n.mc) return n.mc.map(([c, b, inc]) => ['cur', c, b + inc * L]);
  return [['cur', n.cur, n.base + n.inc * L]];
}
const canPay = n => { const c = costOf(n); return c.length > 0 && c.every(([k, a, v]) => k === 'gem' ? S.gems[a] >= v : S.cur[a] >= v); };
const prereqMet = n => n.pre.every(p => !NODE[p] || lv(p) >= NODE[p].max);
const layerLocked = n => { const y = YIELD_LAYER[fam(n.id)]; return y != null && !layerUnlocked(y); };
const visible = n => lv(n.id) > 0 || prereqMet(n);
const pickBlock = n => n.pick && S.pick !== n.pick - 1;
function buyNode(n) {
  if (!prereqMet(n) || layerLocked(n) || lv(n.id) >= n.max || !canPay(n) || pickBlock(n)) { sfx('no'); TV.shake = { id: n.id, t: .3 }; return false; }
  for (const [k, a, v] of costOf(n)) { if (k === 'gem') S.gems[a] -= v; else S.cur[a] -= v; }
  S.up[n.id] = lv(n.id) + 1;
  if (n.pick) { S.pick = n.pick; toast(`⛏️ ${PICK[n.pick - 1].n}! — ${LAYERS[n.pick - 1].n}에 레벨 ${LAYERS[n.pick - 1].req}부터 갈 수 있어요`, 3600); }
  if (n.id === 'wooden_pickaxe') questEvent('wooden_pickaxe_purchased');
  TV.pop = { id: n.id, t: .35 }; sfx(lv(n.id) >= n.max ? 'level' : 'buy'); hudRes(); save(); return true;
}
function openTree(kind) {
  TV.kind = kind; TV.sel = null; TV.hov = null; treeOpen = true; $('treeOv').classList.add('on'); $('treeOv').classList.toggle('gold', kind === 'token'); $('tip').classList.remove('on');
  for (const k in K) K[k] = 0; M.down = 0;
  const ns = nodesOf().filter(visible), xs = ns.map(n => n.x), ys = ns.map(n => n.y);
  TV.x = (Math.min(...xs) + Math.max(...xs)) / 2 || 0; TV.y = (Math.min(...ys) + Math.max(...ys)) / 2 || 0;
  TV.z = clamp(Math.min(innerWidth / Math.max(300, Math.max(...xs) - Math.min(...xs) + 220), innerHeight / Math.max(300, Math.max(...ys) - Math.min(...ys) + 260)), .5, 1.6);
  treeResize(); renderTreeTop();
}
function treeResize() { if (!treeOpen) return; tcv.width = innerWidth * DPR; tcv.height = innerHeight * DPR; }
function renderTreeTop() {
  const curs = new Set(); TREE.forEach(n => costOf(n).forEach(([k, a]) => k === 'cur' && curs.add(a)));
  const chips = TV.kind === 'token' ? [4] : [...curs].sort((a, b) => RES_ORDER.indexOf(a) - RES_ORDER.indexOf(b)).filter(i => S.cur[i] > 0 || i <= 1);
  const gems = TV.kind === 'main' ? S.gems.map((g, i) => g > 0 ? `<div class="chip" title="${esc(LAYERS[i].chunk)}">${chi(i)}<b>${g}</b></div>` : '').join('') : '';
  $('ttop').innerHTML = `<span class="ttl">${TV.kind === 'token' ? '🌟 토큰 트리' : '🌳 스킬트리'}</span>` + chips.map(i => `<div class="chip" title="${CUR[i]}">${ci(i)}<b>${fmt(S.cur[i])}</b></div>`).join('') + gems + `<button class="btn sm x" onclick="closeAll()">✕ 닫기</button>`;
}
function drawTree() {
  if (!treeOpen) return;
  const w = innerWidth, h = innerHeight, c = tctx, gold = TV.kind === 'token', now = performance.now() / 1000;
  c.setTransform(DPR, 0, 0, DPR, 0, 0);
  c.fillStyle = gold ? '#120d06' : '#0b0a0c'; c.fillRect(0, 0, w, h);
  for (let k = 0; k < 140; k++) { const sx = ((RBNoise.hash01(k, 1) * 3000 - TV.x * .2) % w + w) % w, sy = ((RBNoise.hash01(k, 2) * 2000 - TV.y * .2) % h + h) % h, tw = .4 + .6 * Math.abs(Math.sin(now * (.5 + RBNoise.hash01(k, 3)) + k)); c.fillStyle = gold ? `rgba(255,210,110,${.35 * tw})` : `rgba(200,190,255,${.25 * tw})`; c.fillRect(sx, sy, 1.5, 1.5); }
  c.setTransform(DPR * TV.z, 0, 0, DPR * TV.z, (w / 2 - TV.x * TV.z) * DPR, (h / 2 - TV.y * TV.z) * DPR);
  const ns = nodesOf(), vis = new Set(ns.filter(visible).map(n => n.id));
  for (const n of ns) if (vis.has(n.id)) for (const p of n.pre) { const q = NODE[p]; if (!q || !vis.has(p)) continue; const on = lv(n.id) > 0; c.strokeStyle = on ? (gold ? '#ffcf4d' : '#c9a46a') : 'rgba(150,130,110,.45)'; c.lineWidth = on ? 3 : 2; c.beginPath(); c.moveTo(q.x, q.y); c.lineTo(n.x, n.y); c.stroke(); }
  c.textAlign = 'center'; c.textBaseline = 'middle';
  for (const n of ns) {
    if (!vis.has(n.id)) continue;
    const L = lv(n.id), max = L >= n.max, lock = layerLocked(n) || pickBlock(n) && !max, aff = !max && !lock && canPay(n), s = 18;
    let ox = 0, sc = 1; if (TV.shake && TV.shake.id === n.id) ox = Math.sin(TV.shake.t * 60) * 3; if (TV.pop && TV.pop.id === n.id) sc = 1 + Math.sin((.35 - TV.pop.t) / .35 * Math.PI) * .25;
    c.save(); c.translate(n.x + ox, n.y); c.scale(sc, sc);
    if (n.pr || n.rb) { c.strokeStyle = `hsl(${now * 120 % 360},90%,65%)`; c.lineWidth = 3; c.strokeRect(-s - 3, -s - 3, s * 2 + 6, s * 2 + 6); }
    c.fillStyle = lock ? '#2a2628' : L ? shade(n.col, -.35) : '#1c1a1e'; c.fillRect(-s, -s, s * 2, s * 2);
    c.lineWidth = n.id === TV.sel || n.id === TV.hov ? 3.5 : 2.5;
    c.strokeStyle = max ? (gold ? '#ffe27a' : '#ffd84a') : aff ? '#6ae46a' : lock ? '#555' : L || prereqMet(n) ? '#e04a4a' : '#555';
    if (gold && !max) c.strokeStyle = aff ? '#ffcf4d' : '#8a6a2a';
    c.strokeRect(-s, -s, s * 2, s * 2);
    c.font = '18px sans-serif'; c.globalAlpha = lock ? .35 : L || aff ? 1 : .65; c.fillText(lock ? '🔒' : iconOf(n.id), 0, -1); c.globalAlpha = 1;
    if (n.max > 1) { c.font = '9px Jua, sans-serif'; c.fillStyle = 'rgba(0,0,0,.75)'; c.fillRect(-12, s - 6, 24, 11); c.fillStyle = max ? '#ffd84a' : '#fff'; c.fillText(`${L}/${n.max}`, 0, s); }
    c.restore();
  }
}
function treeAt(sx, sy) { const wx = (sx - innerWidth / 2) / TV.z + TV.x, wy = (sy - innerHeight / 2) / TV.z + TV.y; return nodesOf().find(n => visible(n) && Math.abs(n.x - wx) < 21 && Math.abs(n.y - wy) < 21) || null; }
function effText(n) {   // 툴팁 효과 (간단): 레벨당 효과
  const e = n.epl; if (!e || n.pick || /jetpack|translator|tactical|tesla|evolved|autocraft|efficient_reforging/.test(n.id)) return '';
  if (/voltage_spike|wave_intensity|blast_force|ball_damage/.test(n.id)) return `레벨당 피해 +${e * 10}`;
  if (/chain_conductor/.test(n.id)) return `레벨당 사슬 +${e}`;
  if (/ball_count|ball_bounces|mother_lode/.test(n.id)) return `레벨당 +${e}`;
  if (/structure_spawn|token_bounty/.test(n.id)) return `레벨당 +${e}`;
  if (/smelter_slots|smelter_capacity|deep_pockets|bigger_bag|blast_radius/.test(n.id)) return '';
  if (/overclock_duration/.test(n.id)) return `레벨당 +${e}초`;
  return `레벨당 +${+(e * 100).toFixed(3)}%`;
}
function showTip(n, sx, sy) {
  const L = lv(n.id), max = L >= n.max, cost = costOf(n), lk = layerLocked(n), pk = pickBlock(n) && !max, tip = $('tip');
  const cs = cost.map(([k, a, v]) => k === 'gem' ? `<span class="${S.gems[a] >= v ? 'ok' : 'no'}">${chi(a)} ${S.gems[a]}/${v}</span>` : `<span class="${S.cur[a] >= v ? 'ok' : 'no'}">${ci(a)} ${fmt(v)}</span>`).join(' + ');
  tip.innerHTML = `<h3>${iconOf(n.id)} ${esc(n.n)}</h3><div class="d">${esc(n.d)}</div>${effText(n) ? `<div class="eff">${effText(n)}</div>` : ''}<div class="l">레벨 ${L} / ${n.max}</div>` +
    (lk ? `<div class="lk">🔒 ${esc(LAYERS[YIELD_LAYER[fam(n.id)]].n)}을(를) 열어야 해요</div>` : '') + (pk ? `<div class="lk">🔒 ${S.pick >= n.pick ? '이미 가지고 있어요' : PICK[n.pick - 2].n + '부터 만들어야 해요'}</div>` : '') +
    (max ? '<div class="c"><span class="ok">최대 레벨</span></div>' : `<div class="c">${cs}<button class="btn sm go" id="tBuy" ${canPay(n) && !lk && !pk ? '' : 'disabled'}>구매</button></div>`);
  tip.classList.add('on');
  const tw = tip.offsetWidth, th = tip.offsetHeight; tip.style.left = clamp(sx + 24, 6, innerWidth - tw - 6) + 'px'; tip.style.top = clamp(sy - th / 2, 50, innerHeight - th - 6) + 'px';
  if ($('tBuy')) $('tBuy').onclick = () => { if (buyNode(n)) { renderTreeTop(); showTip(n, sx, sy); } };
}
tcv.addEventListener('pointerdown', e => { TV.drag = { x: e.clientX, y: e.clientY, tx: TV.x, ty: TV.y }; TV.moved = 0; TV.pts.set(e.pointerId, { x: e.clientX, y: e.clientY }); try { tcv.setPointerCapture(e.pointerId); } catch (x) {} });
tcv.addEventListener('pointermove', e => {
  if (TV.pts.has(e.pointerId)) TV.pts.set(e.pointerId, { x: e.clientX, y: e.clientY });
  if (TV.pts.size === 2) { const [a, b] = [...TV.pts.values()], d = Math.hypot(a.x - b.x, a.y - b.y); if (TV.pinch) TV.z = clamp(TV.z * d / TV.pinch, .3, 2.5); TV.pinch = d; TV.moved = 1; return; }
  if (TV.drag) { const dx = e.clientX - TV.drag.x, dy = e.clientY - TV.drag.y; if (Math.abs(dx) + Math.abs(dy) > 6) TV.moved = 1; if (TV.moved) { TV.x = TV.drag.tx - dx / TV.z; TV.y = TV.drag.ty - dy / TV.z; $('tip').classList.remove('on'); } return; }
  if (e.pointerType === 'mouse') { const n = treeAt(e.clientX, e.clientY); if (n !== TV.hov) { TV.hov = n; if (n) showTip(n, e.clientX, e.clientY); else if (!TV.sel) $('tip').classList.remove('on'); } }
});
tcv.addEventListener('pointerup', e => {
  TV.pts.delete(e.pointerId); TV.pinch = 0;
  if (TV.drag && !TV.moved) { const n = treeAt(e.clientX, e.clientY); if (n) { if (e.pointerType === 'mouse' || TV.sel === n.id) { if (buyNode(n)) renderTreeTop(); } TV.sel = n.id; showTip(n, e.clientX, e.clientY); } else { TV.sel = null; $('tip').classList.remove('on'); } }
  TV.drag = null;
});
tcv.addEventListener('wheel', e => { e.preventDefault(); TV.z = clamp(TV.z * (e.deltaY < 0 ? 1.12 : .89), .3, 2.5); }, { passive: false });
function shade(hex, f) { const n = parseInt((hex || '#888888').slice(1), 16); let r = n >> 16, g = (n >> 8) & 255, b = n & 255; if (f < 0) { r *= 1 + f; g *= 1 + f; b *= 1 + f; } else { r += (255 - r) * f; g += (255 - g) * f; b += (255 - b) * f; } return `rgb(${r | 0},${g | 0},${b | 0})`; }

// ════════════ 루프 ════════════
let last = performance.now(), SPEED = 1, saveT = 0;
function tick(dt) {
  if (TV.shake) { TV.shake.t -= dt; if (TV.shake.t <= 0) TV.shake = null; } if (TV.pop) { TV.pop.t -= dt; if (TV.pop.t <= 0) TV.pop = null; }
  if (overlayOn()) { tickSmelt(); tickFoundry(dt); if (scene === 'mine' && R && R.ending) updateMine(dt); return; }
  if (scene === 'mine' && R) updateMine(dt); else if (scene === 'hub') updateHub(dt);
}
function render() { if (treeOpen) drawTree(); else if (scene === 'mine' && R) drawMine(); else if (HUB) drawHub(); }
function frame(ts) {
  const dt = Math.min(.05, (ts - last) / 1000) * SPEED; last = ts;
  tick(dt); render();
  saveT += dt; if (saveT > 10) { saveT = 0; save(); renderQuests(); }
  requestAnimationFrame(frame);
}
document.addEventListener('visibilitychange', () => { if (document.hidden) save(); else last = performance.now(); });
addEventListener('pagehide', save);

// ════════════ 시작 ════════════
load(); resize(); drawPortrait();
enterHub(S.base === 1 && base2Unlocked() ? 1 : 0, false);
if (!S.fl.talked) setTimeout(() => toast('🧌 오크 기지에 온 걸 환영해! 오른쪽 상점 주인에게 가 보세요 (E)', 4200), 600);
requestAnimationFrame(frame);
// 디버그·테스트 (창이 숨겨져 rAF 가 멈춰도 bottom.step(초) 로 진행)
function stepSim(sec, dt = 1 / 60) { for (let t = 0; t < sec; t += dt) tick(dt); render(); }
window.bottom = { get S() { return S; }, get R() { return R; }, get HUB() { return HUB; }, get scene() { return scene; }, K, M, ST, step: stepSim, startRun, endRun, enterHub, resultsContinue, buyNode, NODE, TREE, layerUnlocked, hasMaxChunks,
  cheat: (i, n) => { S.cur[i] += n; hudRes(); }, gems: (L, n) => { S.gems[L] += n; }, xp: n => addXp(n), setPick: p => { S.pick = p; }, damageBlock: (x, y, a) => damageBlock(x, y, a, 'player'),
  reset: () => { localStorage.removeItem(SAVE_KEY); S = fresh(); enterHub(0, false); }, speed: n => { SPEED = n; }, save, smeltDeposit, smeltCollect, openTree, openLift, tickSmelt };
