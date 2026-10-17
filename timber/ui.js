/* timber/ui.js — 메뉴(시작·스킬 트리·상점/크루·업적·환생·설정), HUD, 카드, 런 결과 */
'use strict';
const $ = s => document.querySelector(s), $$ = s => [...document.querySelectorAll(s)];
const ICON = { 1: '🧲', 2: '🤖', 3: '🏎️', 4: '💰', 5: '🪵', 6: '🪓', 7: '🎯', 8: '💥', 9: '⚡', 10: '📏', 11: '👟', 13: '🍀', 14: '📦', 15: '👷', 16: '⏩', 17: '💪', 18: '🪙', 19: '🪙', 20: '📘', 21: '⏱️', 22: '🌩️', 23: '🌋', 24: '✨', 25: '🔮', 26: '🧲', 27: '❄️', 28: '🌩️', 29: '🌋', 30: '✨', 31: '🔮', 32: '🧲', 33: '❄️', 34: '🌩️', 35: '🌋', 36: '🌋', 37: '✨', 38: '🔮', 39: '❄️', 40: '🧲', 41: '🧲', 42: '🔄', 43: '🃏', 44: '📦', 45: '🎯', 46: '💥', 47: '🌟', 48: '💨', 49: '💨', 50: '🪵', 51: '📈', 52: '🤖', 53: '🔥', 54: '👷', 55: '🙌', 56: '🙌', 57: '🤖', 58: '🤖', 59: '🧪', 60: '🧪', 61: '🧪', 62: '🧪', 63: '🧪', 64: '🧪', 65: '🧪', 66: '🧪', 67: '🧪', 68: '🪙', 69: '🪙', 70: '💎', 71: '💎', 72: '💎', 73: '💎', 77: '🌩️', 78: '🌩️', 79: '🌩️', 80: '🌋', 81: '🌋', 82: '🤖', 83: '🪂', 84: '🌩️', 85: '🌋', 86: '✨', 87: '🔮', 88: '🧲', 89: '❄️', 90: '🧪', 91: '🧪', 92: '🧪', 93: '👷', 94: '👷', 95: '👷', 96: '👷', 97: '🙏', 98: '🚫' };
const NODE_ICON = n => n.stat != null ? (ICON[n.stat] || '⭐') : (n.id === 'unlockLumberjacks' ? '👷' : n.id === 'unlockPotions' ? '🧪' : '🔓');
const SUMMARY = [[T.Damage, '피해'], [T.AttackSpeed, '공격 속도'], [T.CritChance, '치명타 확률'], [T.CritDamage, '치명타 피해'], [T.TimeExtension, '런 시간(초)'], [T.MagnetRadius, '자석 반경'], [T.MoveSpeed, '이동 속도'], [T.Luck, '행운'], [T.LjAmount, '나무꾼'], [T.DroneAmount, '드론']];
const HOWTO = [['🪓', '나무 옆에 서면 자동으로 도끼질! ←→ 로 움직여 떨어진 통나무를 주워요.'], ['⏱️', '런은 시간제. 레벨이 오르면 카드 3장 중 하나를 골라 이번 런만 강해져요.'], ['🌳', '모은 통나무로 스킬 트리를, 코인으로 도끼·캐릭터를 사면 영구히 강해져요.'], ['👷', '나무꾼을 고용하면 같이 베고, 크루에게 도끼를 쥐여주면 플레이어도 보너스를 받아요.'], ['🙏', '트리 끝의 공물을 바치면 환생: 전부 초기화하는 대신 특별한 힘을 골라요.']];
const UI = {
  tab: 'play', treeSel: null, shopSlot: -1, shopItem: null, axeDlg: null, toastT: null,
  init() {
    if ('ontouchstart' in window) document.body.classList.add('tch');
    $$('#tabs button').forEach(b => b.onclick = () => UI.setTab(b.dataset.t));
    $('#btnPlay').onclick = () => UI.play(); $('#btnHow').onclick = () => $('#howto').classList.add('on'); $('#howClose').onclick = () => $('#howto').classList.remove('on');
    $('#btnPause').onclick = () => UI.onEscape(); $('#pResume').onclick = () => UI.resume(); $('#pQuit').onclick = () => { $('#pause').classList.remove('on'); endRun(false); }; $('#pSet').onclick = () => { $('#pause').classList.remove('on'); UI.showMenu(); UI.setTab('set'); G.state = 'pause'; UI.pausedRun = true; };
    $('#eMenu').onclick = () => { $('#endrun').classList.remove('on'); UI.showMenu(); }; $('#eAgain').onclick = () => { $('#endrun').classList.remove('on'); UI.play(); }; $('#eTree').onclick = () => { $('#endrun').classList.remove('on'); UI.showMenu(); UI.setTab('tree'); };
    $('#cReroll').onclick = () => reroll();
    $('#setAuto').onchange = e => { S.set.auto = e.target.checked; save(); }; $('#setShake').onchange = e => { S.set.shake = e.target.checked; save(); };
    $('#setMute').onchange = e => { G.mute = e.target.checked; try { localStorage.setItem('timber_mute', G.mute ? '1' : '0'); } catch (x) {} if (window.Sound) { Sound.setSfxVolume(G.mute ? 0 : .8); Sound.setBgmVolume(G.mute ? 0 : .6); } };
    $('#setReset').onclick = () => { if (confirm('모든 진행도를 초기화할까요? (설정만 남아요)')) { Meta.resetProgressKeepSettings(); UI.toast('초기화했어요'); UI.refresh(); } };
    $('#setBack').onclick = () => { if (UI.pausedRun) { UI.pausedRun = false; $('#menu').classList.remove('on'); $('#hud').classList.add('on'); G.state = 'play'; } else UI.setTab('play'); };
    $('#preConfirm').onclick = () => UI.confirmPrestige(); $('#preCancel').onclick = () => { Prestige.draft = null; UI.renderPrestige(); };
    $('#endClose').onclick = () => $('#ending').classList.remove('on');
    for (const [k, b] of [['left', '#tLeft'], ['right', '#tRight'], ['dash', '#tDash']]) { const el = $(b); const on = e => { e.preventDefault(); keys[k] = true; el.classList.add('on'); }, off = e => { e.preventDefault(); keys[k] = false; el.classList.remove('on'); }; el.addEventListener('pointerdown', on); el.addEventListener('pointerup', off); el.addEventListener('pointercancel', off); el.addEventListener('pointerleave', off); }
    $('#tInt').addEventListener('pointerdown', e => { e.preventDefault(); toggleNearestDrone(); });
    try { G.mute = localStorage.getItem('timber_mute') === '1' || location.search.includes('mute'); } catch (e) {} if (G.mute && window.Sound) { Sound.setSfxVolume(0); Sound.setBgmVolume(0); }
    Cur.onChanged = () => UI.curDirty = true; Tree.onChanged = () => { UI.treeDirty = true; UI.refreshSummary(); }; Shop.onChanged = Crew.onChanged = AxeUp.onChanged = () => UI.renderShop(); Meta.onReload = () => UI.refresh(); Tree.onFinish = () => UI.showEnding();
    Ach.onChanged = () => { UI.achDirty = true; };
    UI.initTree(); UI.showMenu(); UI.refresh();
  },
  toast(t) { const el = $('#toast'); el.textContent = t; el.classList.add('show'); clearTimeout(UI.toastT); UI.toastT = setTimeout(() => el.classList.remove('show'), 1800); },
  // ---- 화면 전환
  showMenu() { G.state = 'menu'; if (R) { R.items.length = 0; R.fx.length = 0; R.popups.length = 0; R.magmas.length = 0; R.timers.length = 0; } $('#menu').classList.add('on'); $('#hud').classList.remove('on'); $('#cards').classList.remove('on'); UI.setTab(UI.tab === 'set' ? 'play' : UI.tab); UI.refresh(); if (window.Sound) try { Sound.scene('home'); } catch (e) {} },
  play() { $('#menu').classList.remove('on'); $('#hud').classList.add('on'); startRun(); if (window.Sound && !G.mute) try { Sound.scene('game'); } catch (e) {} if (!S.tut) { S.tut = true; save(); UI.toast('←→ 로 움직여 나무 옆에 서면 자동으로 도끼질!'); } },
  onRunStart() { UI.onBuffs(); $('#finale').classList.remove('on'); },
  onEscape() {
    if (G.state === 'play') { G.state = 'pause'; $('#pause').classList.add('on'); }
    else if (G.state === 'pause' && $('#pause').classList.contains('on')) UI.resume();
    else if (G.state === 'menu') { if ($('#howto').classList.contains('on')) $('#howto').classList.remove('on'); else if (UI.axeDlg) UI.closeAxeDlg(); }
  },
  resume() { $('#pause').classList.remove('on'); if (UI.pausedRun) { UI.pausedRun = false; $('#menu').classList.remove('on'); $('#hud').classList.add('on'); } G.state = 'play'; },
  setTab(t) { UI.tab = t; $$('#tabs button').forEach(b => b.classList.toggle('on', b.dataset.t === t)); $$('.tab').forEach(el => el.classList.toggle('on', el.id === 'tab-' + t)); if (t === 'tree') { UI.treeDirty = true; UI.sizeTree(); } if (t === 'shop') UI.renderShop(); if (t === 'ach') UI.renderAch(); if (t === 'pre') UI.renderPrestige(); if (t === 'set') UI.renderSettings(); },
  refresh() { UI.refreshCur(); UI.refreshSummary(); UI.renderLevels(); UI.treeDirty = true; if (UI.tab === 'shop') UI.renderShop(); if (UI.tab === 'pre') UI.renderPrestige(); if (UI.tab === 'ach') UI.renderAch(); if (UI.tab === 'set') UI.renderSettings(); },
  refreshCur() { $('#mLogs').textContent = fmt(S.logs); $('#mCoins').textContent = fmt(S.coins); UI.curDirty = false; },
  refreshSummary() {
    $('#summary').innerHTML = SUMMARY.map(([t, n]) => `<div><span>${ICON[t] || ''} ${n}</span><b>${t === T.CritChance ? pct(stats.get(t)) : fmtNum2(stats.get(t))}</b></div>`).join('');
    $('#preInfo').textContent = S.pre.count > 0 ? `환생 ${S.pre.count}회 · 프레스티지 효과 ${S.pre.sel.length}개` : '';
    $('#btnPre').style.display = Prestige.can() ? '' : 'none';
  },
  renderLevels() {
    $('#levels').innerHTML = D.levels.map(l => { const ok = Shop.levelUnlocked(l); const sel = S.level === l.key; const req = l.req[0]; return `<button class="lvcard ${sel ? 'sel' : ''} ${ok ? '' : 'lock'}" data-k="${l.key}"><div class="lvname">${{ Forest: '🌲', Swamp: '🐸', Cemetery: '🪦', WildFire: '🔥' }[l.key]} ${l.name}</div><div class="lvdesc">${l.desc}</div>${l.stats.map(e => `<div class="lvstat">⏱️ 런 시간 +${e[1]}초</div>`).join('')}${ok ? '' : `<div class="lvreq">🔒 ${req[2]} ${fmt(Ach.get(req[0], 1))} / ${fmt(req[1])}</div>`}</button>`; }).join('');
    $$('#levels .lvcard').forEach(b => b.onclick = () => { const l = LEVELS[b.dataset.k]; if (!Shop.levelUnlocked(l)) { UI.toast('아직 잠겨 있어요'); return; } Shop.setLevel(l.key); UI.renderLevels(); UI.refreshSummary(); });
  },
  // ---- HUD
  tick() {
    if (UI.curDirty) UI.refreshCur();
    if (UI.achDirty && UI.tab === 'ach' && G.state === 'menu') { UI.achDirty = false; UI.renderAch(); }
    if (G.state === 'menu' && UI.tab === 'tree' && UI.treeDirty) UI.drawTree();
    if (!R || !$('#hud').classList.contains('on')) return;
    const t = Math.max(0, Math.ceil(R.time)); $('#timer').textContent = `${Math.floor(t / 60)}:${String(t % 60).padStart(2, '0')}`; $('#timer').classList.toggle('frz', R.freezeOn); $('#timer').classList.toggle('fin', R.finale);
    $('#hLv').textContent = R.lvl; const need = xpNeed(R.lvl); $('#xpFill').style.width = Math.min(100, R.xp / need * 100) + '%'; $('#xpTxt').textContent = `${fmt(R.xp)} / ${fmt(need)}`;
    $('#hLogs').textContent = fmt(S.logs); $('#hCoins').textContent = fmt(S.coins); $('#hRun').textContent = `이번 런 🪵 ${fmt(R.runLogs)} · 🪙 ${fmt(R.runCoins)}`;
    const dash = stats.unlocked(T.DashUnl); $('#dash').style.display = dash ? '' : 'none'; if (dash) { const cd = Math.max(.0001, stats.get(T.DashCooldown)); const rem = Math.max(0, R.p.nextDash - R.now); $('#dashFill').style.height = (Math.min(1, 1 - rem / cd) * 100) + '%'; }
    $('#finale').classList.toggle('on', R.finale);
    for (const [t2, b] of Object.entries(R.buffs)) { const el = $('#buffs [data-t="' + t2 + '"] i'); if (el) el.style.width = Math.max(0, b.rem / Math.max(.0001, b.total) * 100) + '%'; }
  },
  onBuffs() { if (!R) return; $('#buffs').innerHTML = Object.entries(R.buffs).map(([t, b]) => `<div class="buff" data-t="${t}"><span>${ICON[t] || '✨'}</span><em>${ST[t].type} ×${fmtNum2(b.mod.value)}</em><i></i></div>`).join(''); },
  // ---- 카드
  showCards() {
    const c = R.cards; $('#cards').classList.add('on'); $('#cTitle').textContent = c.source === 'chest' ? '📦 상자 보상' : `레벨 ${R.lvl}!`; $('#cStack').textContent = c.stacks > 1 ? `${c.stacks} 레벨 합산` : '';
    $('#cList').innerHTML = c.mods.map((m, i) => { if (!m) return ''; const d = ST[m.type]; const col = RARITY_COLOR[m.rarity]; return `<div class="card ${m.myth ? 'myth' : ''}" style="--rc:${col}" data-i="${i}"><div class="crar" style="color:${col}">${m.myth ? '신화 ' : ''}${RARITY_NAME[m.rarity]}</div><div class="cico">${ICON[m.type] || '⭐'}</div><div class="cname">${d.name}</div><div class="cval">${modText(m.type, m.value, m.mt).replace(d.name, '').trim()}</div><div class="ctype">${d.type}</div><div class="cdesc">${d.desc}</div><div class="cnow">${statValText(m.type, stats.get(m.type))} → ${statValText(m.type, stats.preview(m))}</div>${canBanish(i) ? `<button class="cban" data-i="${i}">🚫 추방</button>` : ''}</div>`; }).join('');
    $$('#cList .card').forEach(el => el.onclick = e => { if (e.target.classList.contains('cban')) { banishCard(+e.target.dataset.i); return; } selectCard(+el.dataset.i); });
    $('#cBan').textContent = `남은 추방: ${R.banishes}`; $('#cReroll').innerHTML = R.rerolls > 0 ? `🔄 리롤 (무료 ${R.rerolls})` : `🔄 리롤 🪙 ${fmt(rerollCost())}`; $('#cReroll').classList.toggle('no', R.rerolls <= 0 && S.coins < rerollCost());
  },
  hideCards() { $('#cards').classList.remove('on'); },
  // ---- 런 결과
  showEnd(run) {
    $('#hud').classList.remove('on'); $('#endrun').classList.add('on');
    const tot = run.dmg.n + run.dmg.c + run.dmg.l + run.dmg.m + run.ljDmg.reduce((a, b) => a + b, 0);
    $('#eBody').innerHTML = `<div class="erow big"><span>🪵 모은 통나무</span><b>${fmt(run.runLogs)}</b></div><div class="erow big"><span>🪙 모은 코인</span><b>${fmt(run.runCoins)}</b></div><div class="erow"><span>📘 도달 레벨</span><b>${run.lvl}</b></div>
      <div class="erow"><span>🪓 일반 피해</span><b>${fmt(run.dmg.n)}</b></div><div class="erow"><span>💥 치명타 피해</span><b>${fmt(run.dmg.c)}</b></div><div class="erow"><span>🌩️ 번개 피해</span><b>${fmt(run.dmg.l)}</b></div><div class="erow"><span>🌋 마그마 피해</span><b>${fmt(run.dmg.m)}</b></div>
      ${run.ljDmg.slice(0, run.ljCount).map((d, i) => `<div class="erow"><span>👷 나무꾼 ${i + 1}</span><b>${fmt(d)}</b></div>`).join('')}<div class="erow"><span>합계 피해</span><b>${fmt(tot)}</b></div>
      <div class="erow"><span>최고 기록 🪵</span><b>${fmt(Ach.get(A.HighestLogs, 1))}</b></div>`;
    if (window.Sound && !G.mute) try { Sound.play('win'); } catch (e) {}
  },
  showEnding() { $('#ending').classList.add('on'); },
  // ---- 스킬 트리
  initTree() {
    const c = $('#treecv'); UI.tv = { x: 0, y: 175, z: .55, drag: null, moved: 0 }; const tc = c.getContext('2d'); UI.tc = tc;
    const toWorld = (px, py) => { const r = c.getBoundingClientRect(); const v = UI.tv; return [(px - r.left - r.width / 2) / v.z + v.x, -(py - r.top - r.height / 2) / v.z + v.y]; };
    const ptrs = new Map();
    c.addEventListener('pointerdown', e => { c.setPointerCapture(e.pointerId); ptrs.set(e.pointerId, [e.clientX, e.clientY]); UI.tv.drag = [e.clientX, e.clientY]; UI.tv.moved = 0; });
    c.addEventListener('pointermove', e => { if (!ptrs.has(e.pointerId)) return; const v = UI.tv; if (ptrs.size === 2) { const [a, b] = [...ptrs.values()]; const d0 = Math.hypot(a[0] - b[0], a[1] - b[1]); ptrs.set(e.pointerId, [e.clientX, e.clientY]); const [a2, b2] = [...ptrs.values()]; const d1 = Math.hypot(a2[0] - b2[0], a2[1] - b2[1]); if (d0 > 0) v.z = Math.max(.3, Math.min(1.5, v.z * d1 / d0)); UI.treeDirty = true; v.moved = 9; return; } if (!v.drag) return; const dx = e.clientX - v.drag[0], dy = e.clientY - v.drag[1]; v.x -= dx / v.z; v.y += dy / v.z; v.drag = [e.clientX, e.clientY]; v.moved += Math.abs(dx) + Math.abs(dy); UI.treeDirty = true; });
    const up = e => { ptrs.delete(e.pointerId); const v = UI.tv; if (v.drag && v.moved < 6) { const [wx, wy] = toWorld(e.clientX, e.clientY); UI.treeClick(wx, wy); } v.drag = null; };
    c.addEventListener('pointerup', up); c.addEventListener('pointercancel', up);
    c.addEventListener('wheel', e => { e.preventDefault(); const v = UI.tv; const [wx, wy] = toWorld(e.clientX, e.clientY); const z = Math.max(.3, Math.min(1.5, v.z * (e.deltaY < 0 ? 1.1 : .9))); v.x = wx - (wx - v.x) * v.z / z; v.y = wy - (wy - v.y) * v.z / z; v.z = z; UI.treeDirty = true; }, { passive: false });
    $('#ttBuy').onclick = () => UI.buyNode(false); $('#ttMax').onclick = () => UI.buyNode(true); $('#ttClose').onclick = () => { UI.treeSel = null; UI.renderTip(); UI.treeDirty = true; };
    $('#treeHome').onclick = () => { UI.tv.x = 0; UI.tv.y = 175; UI.tv.z = .55; UI.treeDirty = true; };
    addEventListener('resize', () => { UI.sizeTree(); UI.treeDirty = true; });
  },
  sizeTree() { const c = $('#treecv'); const r = c.parentElement.getBoundingClientRect(); c.width = Math.max(1, r.width * devicePixelRatio); c.height = Math.max(1, r.height * devicePixelRatio); c.style.width = r.width + 'px'; c.style.height = r.height + 'px'; },
  nodeAt(wx, wy) { let best = null; for (const n of NODES) { if (!Tree.visible(n)) continue; if (Math.hypot(n.pos[0] - wx, n.pos[1] - wy) <= 52) best = n; } return best; },
  treeClick(wx, wy) { const n = UI.nodeAt(wx, wy); UI.treeSel = n; UI.renderTip(); UI.treeDirty = true; if (n && window.Sound && !G.mute) try { Sound.play('click'); } catch (e) {} },
  drawTree() {
    UI.treeDirty = false; const c = $('#treecv'); if (!c.width) UI.sizeTree(); const ctx = UI.tc; const v = UI.tv; const dpr = devicePixelRatio; ctx.setTransform(1, 0, 0, 1, 0, 0); ctx.clearRect(0, 0, c.width, c.height);
    const px = x => c.width / 2 + (x - v.x) * v.z * dpr, py = y => c.height / 2 - (y - v.y) * v.z * dpr; const z = v.z * dpr;
    // 연결선
    ctx.lineWidth = 8 * z; for (const n of NODES) { if (!Tree.visible(n)) continue; for (const p of n.pre) { const q = NODE[p]; if (!q || Tree.lv(p) <= 0) continue; ctx.strokeStyle = Tree.canAffordNext(n) ? '#d2a811' : '#a33a2e'; ctx.beginPath(); ctx.moveTo(px(q.pos[0]), py(q.pos[1])); ctx.lineTo(px(n.pos[0]), py(n.pos[1])); ctx.stroke(); } }
    for (const n of NODES) {
      if (!Tree.visible(n)) continue; const st = Tree.state(n); const x = px(n.pos[0]), y = py(n.pos[1]), r = 46 * z; const maxed = st.lv >= st.max; const sel = UI.treeSel === n;
      ctx.fillStyle = maxed ? '#ffd36b' : st.reqOk ? '#fff7e6' : '#8d8699'; ctx.strokeStyle = sel ? '#7fd8ff' : maxed ? '#d2a811' : !st.reqOk ? '#5a5566' : Tree.canAffordNext(n) ? '#fff' : '#e05a4a'; ctx.lineWidth = (sel ? 7 : 5) * z;
      ctx.beginPath(); ctx.arc(x, y, r, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
      ctx.font = `${Math.round(44 * z)}px sans-serif`; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillStyle = '#000'; ctx.fillText(st.reqOk ? NODE_ICON(n) : '🔒', x, y - 4 * z);
      ctx.font = `${Math.round(22 * z)}px Jua, sans-serif`; ctx.fillStyle = maxed ? '#5a3d00' : '#2a2238'; ctx.fillText(maxed ? 'MAX' : `${st.lv}/${st.max}`, x, y + r * .72);
      if (z > .45) { ctx.font = `${Math.round(20 * z)}px Jua, sans-serif`; ctx.fillStyle = '#f5ecff'; ctx.lineWidth = 4 * z; ctx.strokeStyle = 'rgba(0,0,0,.6)'; const nm = UI.nodeName(n); ctx.strokeText(nm, x, y + r + 20 * z); ctx.fillText(nm, x, y + r + 20 * z); }
    }
    $('#treeCur').textContent = `🪵 ${fmt(S.logs)}`;
  },
  nodeName(n) { return n.stat != null ? ST[n.stat].name : (n.reqTitle || n.id); },
  renderTip() {
    const n = UI.treeSel; const el = $('#treetip'); if (!n) { el.classList.remove('on'); return; } el.classList.add('on'); const st = Tree.state(n); const q = Tree.quote(n, false); const qm = Tree.quote(n, true); const prev = st.lv < st.max ? st.lv + 1 : st.lv;
    $('#ttName').textContent = UI.nodeName(n); $('#ttIcon').textContent = st.reqOk ? NODE_ICON(n) : '🔒';
    $('#ttDesc').textContent = n.stat != null ? ST[n.stat].desc : (n.req.length ? '조건을 채우면 열리는 관문이에요.' : '');
    $('#ttLv').textContent = `레벨 ${st.lv}/${st.max}`; $('#ttStats').innerHTML = Tree.statsText(n, prev);
    $('#ttReq').innerHTML = n.req.length ? n.req.map(r => `<div class="req ${Ach.get(r[0], n.scope) >= r[1] ? 'ok' : ''}">${r[2]}: ${fmt(Ach.get(r[0], n.scope))} / ${fmt(r[1])}${n.scope === 1 ? ' (이번 환생)' : ''}</div>`).join('') : '';
    const maxed = st.lv >= st.max; $('#ttCost').textContent = maxed ? '최대치' : (q.cost > 0 ? `🪵 ${fmt(q.cost)}` : '무료');
    $('#ttBuy').style.display = maxed ? 'none' : ''; $('#ttMax').style.display = maxed || n.max <= 1 ? 'none' : ''; $('#ttMax').textContent = `최대 구매 (${qm.count}개 🪵 ${fmt(qm.cost)})`;
    $('#ttBuy').disabled = !st.reqOk || q.count === 0; $('#ttMax').disabled = !st.reqOk || qm.count === 0;
  },
  buyNode(max) { const n = UI.treeSel; if (!n) return; const err = Tree.buy(n, max); if (err) { UI.toast(err); if (window.Sound && !G.mute) try { Sound.play('error'); } catch (e) {} } else { if (window.Sound && !G.mute) try { Sound.play('submit'); } catch (e) {} UI.refreshCur(); UI.renderTip(); UI.treeDirty = true; } },
  // ---- 상점 / 크루
  slotName(i) { return i === -1 ? '플레이어' : `나무꾼 ${i + 1}`; },
  slotGear(i) { return i === -1 ? { c: CHARS[S.char], a: AXES[S.axe] } : Crew.gear(i); },
  renderShop() {
    const cnt = Crew.count(); if (UI.shopSlot >= cnt) UI.shopSlot = -1;
    $('#slots').innerHTML = [-1, 0, 1, 2, 3].map(i => { const lock = i >= 0 && i >= cnt; const g = UI.slotGear(i); return `<button class="slot ${UI.shopSlot === i ? 'on' : ''} ${lock ? 'lock' : ''}" data-i="${i}"><div class="sname">${i === -1 ? '👤' : '👷'} ${UI.slotName(i)}</div>${lock ? '<div class="sgear">🔒 스킬 트리에서 고용</div>' : `<div class="sgear">${g.c ? g.c.name : '-'}<br>${g.a ? g.a.name : '-'}</div>`}</button>`; }).join('');
    $$('#slots .slot').forEach(b => b.onclick = () => { if (b.classList.contains('lock')) { UI.toast('스킬 트리에서 "추가 인력"을 사면 열려요'); return; } UI.shopSlot = +b.dataset.i; UI.renderShop(); });
    const list = (items, host) => { $(host).innerHTML = items.map(it => { const own = Shop.owned(it); const g = UI.slotGear(UI.shopSlot); const eq = (Shop.isAxe(it) ? g.a : g.c) === it; const ok = Shop.meetsReq(it); return `<button class="item ${UI.shopItem === it ? 'on' : ''} ${own ? 'own' : ''} ${ok ? '' : 'lock'}" data-k="${it.key}"><div class="ipic"><canvas width="72" height="72" data-pic="${it.key}"></canvas></div><div class="iname">${it.name}</div><div class="imeta">${eq ? '<b>장착 중</b>' : own ? '보유' : ok ? `🪙 ${fmt(it.cost)}` : '🔒'}</div></button>`; }).join(''); };
    const byCost = arr => arr.slice().sort((x, y) => x.cost - y.cost); list(byCost(D.axes), '#axeList'); list(byCost(D.chars), '#charList');
    $$('#tab-shop .item').forEach(b => b.onclick = () => { UI.shopItem = AXES[b.dataset.k] || CHARS[b.dataset.k]; UI.renderShop(); });
    $$('#tab-shop canvas[data-pic]').forEach(c => UI.drawPic(c, c.dataset.pic));
    UI.renderInfo();
  },
  drawPic(c, key) { const ctx = c.getContext('2d'); ctx.clearRect(0, 0, c.width, c.height); const save = W.s; W.s = 40; if (AXES[key]) drawAxe(ctx, key, 26, 60, 1.1, .6); else drawChar(ctx, key, 36, 44, 1.1, 1, 1, false); W.s = save; },
  itemStatsHtml(it, slot) {
    const isAxe = Shop.isAxe(it); const g = UI.slotGear(slot); const cur = isAxe ? g.a : g.c; const types = new Set(); (isAxe ? Equip.axeEntries(it) : Equip.charEntries(it)).forEach(e => types.add(e[0]));
    return [...types].map(t => { const base = ST[t] ? ST[t].base : 0; const nv = (isAxe ? Equip.axeStat(it, t, base) : Equip.charStat(it, t, base)) - base; const cv2 = cur ? (isAxe ? Equip.axeStat(cur, t, base) : Equip.charStat(cur, t, base)) - base : 0; const txt = v => ST[t] && ST[t].disp === 0 ? pct(v) : fmtNum2(v); const up = nv > cv2; return `<div class="istat"><span>${ICON[t] || ''} ${ST[t] ? ST[t].type : t}</span><b class="${cur === it ? '' : up ? 'up' : nv < cv2 ? 'down' : ''}">${cur && cur !== it ? txt(cv2) + ' → ' : ''}${txt(nv)}</b></div>`; }).join('');
  },
  renderInfo() {
    const it = UI.shopItem; const el = $('#info'); if (!it) { el.innerHTML = '<div class="dim">도끼나 캐릭터를 골라보세요</div>'; return; }
    const own = Shop.owned(it), ok = Shop.meetsReq(it), isAxe = Shop.isAxe(it); const g = UI.slotGear(UI.shopSlot); const eq = (isAxe ? g.a : g.c) === it;
    el.innerHTML = `<div class="iname2">${it.name}</div><div class="islot">${UI.slotName(UI.shopSlot)}에게</div>${UI.itemStatsHtml(it, UI.shopSlot)}
      ${it.req.map(r => `<div class="req ${Ach.get(r[0], 1) >= r[1] ? 'ok' : ''}">${r[2]}: ${fmt(Ach.get(r[0], 1))} / ${fmt(r[1])}</div>`).join('')}
      <div class="ibtns">${own ? `<button id="iEquip" ${eq ? 'disabled' : ''}>${eq ? '장착 중' : '장착'}</button>${isAxe ? `<button id="iUp">🔧 강화 (${AxeUp.st(it).pts}/${AxeUp.maxPts(it)})</button>` : ''}` : `<button id="iBuy" ${ok && S.coins >= it.cost ? '' : 'disabled'}>구매 🪙 ${fmt(it.cost)}</button>`}</div>`;
    const b = $('#iBuy'); if (b) b.onclick = () => { if (Shop.buy(it, false)) { UI.toast(`${it.name} 구매!`); Crew.equipTo(UI.shopSlot, it); UI.renderShop(); UI.refreshCur(); } else UI.toast('조건이 안 맞거나 코인이 부족해요'); };
    const e2 = $('#iEquip'); if (e2) e2.onclick = () => { Crew.equipTo(UI.shopSlot, it); UI.renderShop(); UI.refreshSummary(); };
    const u = $('#iUp'); if (u) u.onclick = () => UI.openAxeDlg(it);
  },
  openAxeDlg(axe) { UI.axeDlg = axe; $('#axedlg').classList.add('on'); UI.renderAxeDlg(); },
  closeAxeDlg() { UI.axeDlg = null; $('#axedlg').classList.remove('on'); },
  renderAxeDlg() {
    const axe = UI.axeDlg; if (!axe) return; const st = AxeUp.st(axe); const q = AxeUp.quote(axe, false), qm = AxeUp.quote(axe, true); const max = AxeUp.maxPts(axe);
    $('#adName').textContent = `🔧 ${axe.name} 강화`; $('#adPts').textContent = `강화 포인트 ${st.pts}/${max} · 미배정 ${AxeUp.unspent(axe)}`;
    $('#adBuy').textContent = st.pts >= max ? '포인트 최대' : `포인트 구매 🪙 ${fmt(q.cost)}`; $('#adBuy').disabled = st.pts >= max || q.count === 0; $('#adMax').textContent = `최대 구매 (${qm.count}개 🪙 ${fmt(qm.cost)})`; $('#adMax').disabled = qm.count === 0; $('#adMax').style.display = st.pts >= max ? 'none' : '';
    $('#adRows').innerHTML = axe.per.map(p => { const t = p[0]; const n = st.alloc[t] || 0; const mx = AxeUp.maxFor(axe, t); const v = p[2] === MUL ? Math.pow(p[1], n) : p[1] * n; const txt = x => ST[t] && ST[t].disp === 0 ? pct(x) : fmtNum2(x); return `<div class="adrow"><span>${ICON[t] || ''} ${ST[t] ? ST[t].type : t}</span><em>${p[2] === MUL ? '×' + fmtNum2(p[1]) : '+' + txt(p[1])}/pt → ${p[2] === MUL ? '×' + fmtNum2(v) : '+' + txt(v)}</em><button data-t="${t}" data-d="-1" ${n <= 0 ? 'disabled' : ''}>−</button><b>${n}/${mx}</b><button data-t="${t}" data-d="1" ${n >= mx || AxeUp.unspent(axe) <= 0 ? 'disabled' : ''}>+</button></div>`; }).join('');
    $$('#adRows button').forEach(b => b.onclick = () => { AxeUp.setAlloc(axe, +b.dataset.t, (st.alloc[+b.dataset.t] || 0) + +b.dataset.d); UI.renderAxeDlg(); UI.refreshSummary(); });
    $('#adBuy').onclick = () => { if (AxeUp.buy(axe, false)) { UI.renderAxeDlg(); UI.refreshCur(); } }; $('#adMax').onclick = () => { if (AxeUp.buy(axe, true)) { UI.renderAxeDlg(); UI.refreshCur(); } }; $('#adClose').onclick = () => { UI.closeAxeDlg(); UI.renderShop(); UI.refreshSummary(); };
  },
  // ---- 업적
  renderAch() {
    $('#achList').innerHTML = D.ach.map(a => { const v = Ach.get(a.stat, 0); const done = v >= a.target; const div = a.div || 1; const show = x => a.disp === 0 ? pct(x / div) : fmt(x / div); return `<div class="ach ${done ? 'done' : ''}"><div class="aname">${done ? '🏆' : '⬜'} ${a.name}</div><div class="adesc">${a.desc}</div><div class="abar"><i style="width:${Math.min(100, v / a.target * 100)}%"></i><span>${show(Math.min(v, a.target))} / ${show(a.target)}</span></div></div>`; }).join('');
  },
  // ---- 환생
  renderPrestige() {
    const el = $('#preBody'); const can = Prestige.can();
    const cur = S.pre.sel.length ? `<div class="presub">현재 효과: ${S.pre.sel.map(id => PREBY[id] ? PREBY[id].name : id).join(', ')}</div>` : '';
    if (!can) { el.innerHTML = `<div class="prehead">✨ 환생 ${S.pre.count}회 · 누적 포인트 ${S.pre.pts}</div>${cur}<div class="dim">스킬 트리 끝의 <b>신들에게 바치는 공물</b>(🪵 ${fmt(1e15)})을 사면 환생할 수 있어요.<br>환생하면 업적과 설정만 남기고 전부 초기화되고, 포인트 ${Prestige.POINTS}개로 특별한 힘을 골라요.</div>`; $('#preBtns').style.display = 'none'; return; }
    if (!Prestige.draft) Prestige.begin(); const d = Prestige.draft;
    el.innerHTML = `<div class="prehead">✨ 환생 ${S.pre.count}회 → ${S.pre.count + 1}회 · 쓸 수 있는 포인트 <b>${Prestige.remaining()}</b> / ${d.budget}</div><div class="dim">이전에 고른 것도 바꿀 수 있어요. 확정하면 통나무·코인·스킬 트리·장비가 모두 초기화돼요.</div>
      <div class="prelist">${PRE.map(p => { const on = d.sel.has(p.id); const ok = Prestige.canSelect(p); return `<button class="pre ${on ? 'on' : ''} ${ok ? '' : 'no'}" data-id="${p.id}"><div class="pname">${on ? '✅' : '⬜'} ${p.name} <em>${p.cost}pt</em></div><div class="pdesc">${p.desc}</div></button>`; }).join('')}</div>`;
    $$('#preBody .pre').forEach(b => b.onclick = () => { Prestige.toggle(PREBY[b.dataset.id]); UI.renderPrestige(); }); $('#preBtns').style.display = '';
  },
  confirmPrestige() { if (!Prestige.draft) return; if (!confirm(`환생할까요? 고른 효과 ${Prestige.draft.sel.size}개가 적용되고 진행도가 초기화돼요.`)) return; if (Prestige.confirm()) { UI.toast('환생! 새로운 시작이에요'); if (window.Sound && !G.mute) try { Sound.play('win'); } catch (e) {} UI.refresh(); UI.setTab('tree'); } },
  // ---- 설정
  renderSettings() { $('#setAuto').checked = !!S.set.auto; $('#setShake').checked = !!S.set.shake; $('#setMute').checked = !!G.mute; $('#setBack').textContent = UI.pausedRun ? '게임으로 돌아가기' : '돌아가기'; },
};
$('#howList').innerHTML = HOWTO.map(([i, t]) => `<div class="hrow"><span>${i}</span><p>${t}</p></div>`).join('');
UI.init();
