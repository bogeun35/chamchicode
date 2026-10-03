// 참스코드 보드게임 공용 대기실 — 자리 · 준비 · 팀 나누기 · 리더(팀장) 정하기 · 채팅
// 사용: const LB = Lobby.mount({ el, ref, me, host, teams, leader, min, max, ... }); 방 스냅샷마다 LB.render(room)
//   teams : [{ id, name, icon, color }] | null        — 팀 게임이면 팀 열로, 아니면 자리 격자로
//   leader: { field, name, icon, perTeam, required, selfPick } | null — 팀장/원정대장 같은 '리더' 표시
//   seatTool: false 면 '자리 섞기' 숨김 (시작할 때 순서를 어차피 섞는 게임)
// 흐름: 대기실(준비·옵션 확인) → 시작 → 게임 중 '⏸ 메뉴'(LB.menu)에서 방장이 대기실로 → 끝나면 다시/대기실로(LB.toLobby)
(function () {
  const AV = ['🐱', '🐶', '🦊', '🐼', '🐸', '🐧', '🦁', '🐙', '🐨', '🐯', '🐰', '🐻'];
  const avatarOf = k => AV[[...k].reduce((a, c) => a + c.charCodeAt(0), 0) % AV.length];
  const esc = s => String(s == null ? '' : s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const shuffle = a => { for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; };
  const josa = (w, a, b) => { const c = String(w).charCodeAt(String(w).length - 1); const has = c >= 0xAC00 && c <= 0xD7A3 ? (c - 0xAC00) % 28 !== 0 : false; return w + (has ? a : b); };
  const QUICK = ['👋 안녕하세요!', 'ㅋㅋㅋㅋ', '준비됐어요!', '빨리 시작해요~', '잠깐만요!', '팀 바꿀게요'];

  const css = document.createElement('style');
  css.textContent = `
.lb-h { display: flex; align-items: center; gap: 6px; }
/* 게임에 .btn.light 가 없을 때만 쓰이는 기본 모양 (:where 로 우선순위를 낮춰 게임 자체 색이 있으면 그걸 따름) */
:where(.lb-card, .lb-sheet) .btn:where(.light) { background: #fff; color: #8a5a2a; box-shadow: 0 4px 0 #b8834a; }
:where(.lb-card, .lb-sheet) .btn:where(.light):active { box-shadow: 0 1px 0 #b8834a; }
.lb-h .lb-cnt { margin-left: auto; font-size: 12px; opacity: .75; }
.lb-teams { display: grid; grid-template-columns: repeat(var(--lb-cols, 2), minmax(0, 1fr)); gap: 8px; }
.lb-team { border-radius: 14px; padding: 7px; border: 3px solid var(--lb-c); background: #fff; background: color-mix(in srgb, var(--lb-c) 9%, #fff); min-width: 0; }
.lb-team h4 { display: flex; align-items: center; gap: 4px; font-size: 14px; color: var(--lb-c); margin: 0 0 6px 2px; }
.lb-team h4 small { margin-left: auto; font-size: 11.5px; color: #8a5a2a; font-weight: normal; }
.lb-team h4 small.warn { color: #c0392b; }
.lb-list { display: flex; flex-direction: column; gap: 6px; }
.lb-grid { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 7px; }
.lb-seat { position: relative; display: flex; align-items: center; gap: 6px; min-height: 48px; padding: 6px 8px; border-radius: 12px; background: #fff; border: 2px solid #efdfbf; cursor: pointer; color: #2a2118; min-width: 0; transition: transform .08s; }
.lb-seat:active { transform: scale(.97); }
.lb-seat.me { border-color: #ffc93d; box-shadow: 0 0 0 3px rgba(255,201,61,.35); }
.lb-seat.lead { background: #fff8dc; }
.lb-seat.empty { border-style: dashed; background: rgba(255,255,255,.45); color: #b39a72; justify-content: center; font-size: 13px; cursor: default; }
.lb-seat.empty.join { cursor: pointer; color: #8a5a2a; }
.lb-av { flex: none; width: 32px; height: 32px; border-radius: 50%; display: grid; place-items: center; font-size: 18px; background: #ffe6bf; position: relative; }
.lb-av .lb-crown { position: absolute; top: -11px; left: 50%; transform: translateX(-50%); font-size: 14px; filter: drop-shadow(0 1px 0 #fff); }
.lb-nm { flex: 1; min-width: 0; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; font-size: 15px; line-height: 1.15; }
.lb-nm small { display: block; font-size: 11px; color: #a08055; overflow: hidden; text-overflow: ellipsis; }
.lb-ok { position: absolute; right: -5px; bottom: -4px; width: 17px; height: 17px; border-radius: 50%; background: #5cb85c; color: #fff; font-size: 11px; line-height: 17px; text-align: center; box-shadow: 0 0 0 2px #fff; }
.lb-nm small.wait { color: #b8a58a; }
.lb-nm small.rdy { color: #3a8f3a; }
.lb-seat.leadslot { border-style: dashed; border-color: #e0b84a; background: #fffbea; color: #a07a20; font-size: 12.5px; justify-content: center; gap: 4px; min-height: 40px; }
.lb-tools, .lb-mine { display: flex; gap: 6px; flex-wrap: wrap; margin-top: 10px; }
.lb-tools:empty, .lb-mine:empty { display: none; }
.lb-tools .btn, .lb-mine .btn { flex: 1 1 auto; font-size: 14px; padding: 9px 10px; min-height: 42px; }
.lb-mine .btn.lb-ready { flex: 2 1 100%; font-size: 17px; min-height: 50px; }
.lb-tip { font-size: 12.5px; color: #8a5a2a; text-align: center; margin-top: 8px; line-height: 1.45; }
.lb-chat { height: 128px; overflow-y: auto; display: flex; flex-direction: column; gap: 4px; padding: 6px 8px; border-radius: 12px; background: #fff; border: 2px solid #efdfbf; overscroll-behavior: contain; }
.lb-msg { font-size: 13.5px; color: #3a2e22; line-height: 1.35; word-break: break-all; }
.lb-msg b { color: #8a5a2a; margin-right: 4px; }
.lb-msg.sys { color: #a08a6a; font-size: 12px; text-align: center; }
.lb-msg.mine b { color: #2b6f9e; }
.lb-quick { display: flex; gap: 5px; overflow-x: auto; padding: 7px 0 2px; scrollbar-width: none; }
.lb-quick::-webkit-scrollbar { display: none; }
.lb-quick button { flex: none; border: 2px solid #efdfbf; background: #fff; border-radius: 999px; padding: 6px 11px; font: inherit; font-size: 13px; color: #6a4a2a; cursor: pointer; min-height: 36px; }
.lb-say { display: flex; gap: 6px; margin-top: 6px; }
.lb-say .input { flex: 1; min-width: 0; padding: 10px 12px; font-size: 16px; }
.lb-say .btn { flex: none; padding: 9px 14px; font-size: 15px; }
.lb-start { margin-top: 4px; }
.lb-why { text-align: center; font-size: 13.5px; margin: 8px 0 2px; opacity: .95; }
.lb-sheet { position: fixed; inset: 0; z-index: 90; background: rgba(0,0,0,.45); display: flex; align-items: flex-end; justify-content: center; }
.lb-sheet[hidden] { display: none; }
.lb-sheet-in { width: 100%; max-width: 460px; background: #fff3d6; color: #2a2118; border-radius: 22px 22px 0 0; padding: 16px 14px calc(14px + env(safe-area-inset-bottom)); box-shadow: 0 -6px 24px rgba(0,0,0,.3); animation: lbUp .18s ease-out; }
@keyframes lbUp { from { transform: translateY(40%); opacity: .5; } to { transform: none; opacity: 1; } }
.lb-sheet-t { display: flex; align-items: center; gap: 8px; font-size: 18px; margin-bottom: 12px; }
.lb-sheet-b { display: flex; flex-direction: column; gap: 8px; }
.lb-sheet-b .btn { width: 100%; font-size: 16px; min-height: 48px; }
`;
  document.head.appendChild(css);

  function mount(o) {
    const st = { room: null, chatRef: null, chatCb: null, path: '', lastCount: -1, chatSeen: 0 };
    const leader = o.leader || null, teams = o.teams || null;
    const L = leader ? leader.field : null;
    o.el.innerHTML = `
      <div class="card lb-card"><h3 class="lb-h">🪑 ${teams ? '팀 나누기' : '자리'} <span class="lb-cnt"></span></h3>
        <div class="lb-seats"></div><div class="lb-tools"></div><div class="lb-mine"></div><div class="lb-tip"></div></div>
      <div class="card lb-chatcard"><h3 class="lb-h">💬 대기실 채팅</h3><div class="lb-chat"></div>
        <div class="lb-quick">${QUICK.map(t => `<button type="button">${t}</button>`).join('')}</div>
        <form class="lb-say"><input class="input lb-in" maxlength="60" placeholder="한마디 남기기" enterkeyhint="send"><button class="btn blue" type="submit">보내기</button></form></div>
      <div class="lb-start"><button class="btn green wide lb-go" id="btnStart" disabled>게임 시작</button><div class="lb-why"></div></div>`;
    const sheet = document.createElement('div'); sheet.className = 'lb-sheet'; sheet.hidden = true;
    sheet.innerHTML = '<div class="lb-sheet-in"><div class="lb-sheet-t"></div><div class="lb-sheet-b"></div><button class="btn ghost wide lb-x" style="margin-top:8px;background:#e9dcc0;color:#6a4a2a;box-shadow:none">닫기</button></div>';
    document.body.appendChild(sheet);
    sheet.addEventListener('click', e => { if (e.target === sheet || e.target.closest('.lb-x')) sheet.hidden = true; });
    const q = s => o.el.querySelector(s);
    const toast = m => (o.toast || window.toast || alert)(m);
    const ref = () => o.ref();
    const me = () => o.me(), isHost = () => o.host();
    const sfx = n => { try { window.Sound && Sound.play(n); } catch (e) {} };

    // ── 데이터 도우미 ──
    function list() {
      const ps = Object.entries((st.room && st.room.players) || {}).map(([k, p]) => Object.assign({ k }, p));
      return ps.sort((a, b) => ((a.seat == null ? 1e15 : a.seat) - (b.seat == null ? 1e15 : b.seat)) || ((a.joinedAt || 0) - (b.joinedAt || 0)));
    }
    const teamOf = t => list().filter(p => p.team === t);
    const isLead = p => !!(L && p[L]);
    function reason() {
      if (!st.room) return '잠시만요';
      const ps = list(), n = ps.length;
      if (n < o.min) return `${o.min}명 이상 모여야 해요 (지금 ${n}명)`;
      if (o.max && n > o.max) return `최대 ${o.max}명까지예요`;
      if (teams) for (const t of teams) {
        const c = teamOf(t.id).length;
        if (c < (o.teamMin || 1)) return `${t.icon} ${t.name}에 ${o.teamMin || 1}명 이상 필요해요`;
      }
      if (leader && leader.required) {
        if (leader.perTeam && teams) { for (const t of teams) { const c = teamOf(t.id).filter(isLead).length; if (c !== 1) return `${t.icon} ${t.name}의 ${josa(leader.name, '을', '를')} 정해 주세요`; } }
        else if (ps.filter(isLead).length !== 1) return `${josa(leader.name, '을', '를')} 정해 주세요`;
      }
      const extra = o.check && o.check(ps, st.room); if (extra) return extra;
      const wait = ps.filter(p => p.k !== st.room.host && !p.ready);
      if (wait.length) return `준비를 기다리는 중 — ${wait.map(p => p.nick).slice(0, 3).join(', ')}${wait.length > 3 ? ` 외 ${wait.length - 3}명` : ''}`;
      return null;
    }

    // ── 그리기 ──
    function seatHtml(p) {
      const host = p.k === st.room.host, mine = p.k === me();
      const role = [isLead(p) ? `${leader.icon} ${leader.name}` : '', host ? '⭐ 방장' : ''].filter(Boolean).join(' · ');
      const sub = role ? `<small>${role}</small>` : host ? '' : p.ready ? '<small class="rdy">준비 완료</small>' : '<small class="wait">준비 전</small>';
      return `<div class="lb-seat ${mine ? 'me' : ''} ${p.ready ? 'ready' : ''} ${host ? 'hostseat' : ''} ${isLead(p) ? 'lead' : ''}" data-k="${esc(p.k)}">
        <span class="lb-av">${avatarOf(p.k)}${isLead(p) ? `<span class="lb-crown">${leader.icon}</span>` : ''}${p.ready && !host ? '<span class="lb-ok">✓</span>' : ''}</span>
        <span class="lb-nm">${esc(p.nick)}${mine ? ' <span style="opacity:.5;font-size:12px">(나)</span>' : ''}${sub}</span></div>`;
    }
    function render(room) {
      st.room = room;
      if (!room || !room.players || !room.players[me()]) { o.onKicked && o.onKicked(); return; }
      subscribeChat();
      const ps = list(), n = ps.length, myP = room.players[me()];
      q('.lb-cnt').textContent = `${n}${o.max ? ' / ' + o.max : ''}명`;
      if (teams) {
        const cap = Math.max(2, Math.ceil((o.max || 12) / teams.length));
        q('.lb-seats').innerHTML = `<div class="lb-teams" style="--lb-cols:${teams.length}">${teams.map(t => {
          const tp = teamOf(t.id).sort((a, b) => isLead(b) - isLead(a));
          const leadOk = !leader || !leader.perTeam || tp.some(isLead);
          const empties = Math.min(cap - tp.length, myP.team === t.id ? 0 : 1);
          const slot = leadOk ? '' : `<div class="lb-seat leadslot" data-lead="${t.id}">${leader.icon} ${josa(leader.name, '이', '가')} 없어요${myP.team === t.id ? ' — 할래요?' : ''}</div>`;
          return `<div class="lb-team" style="--lb-c:${t.color}"><h4>${t.icon} ${esc(t.name)} <small>${tp.length}명</small></h4>
            <div class="lb-list">${slot}${tp.map(seatHtml).join('')}${empties > 0 ? `<div class="lb-seat empty join" data-team="${t.id}">＋ 이 팀으로</div>` : ''}</div></div>`;
        }).join('')}</div>`;
      } else {
        const slots = Math.min(o.max || n, Math.max(o.min, n + 1));
        q('.lb-seats').innerHTML = `<div class="lb-grid">${ps.map(seatHtml).join('')}${Array.from({ length: Math.max(0, slots - n) }, () => '<div class="lb-seat empty">빈 자리</div>').join('')}</div>`;
      }
      q('.lb-seats').querySelectorAll('.lb-seat[data-k]').forEach(el => el.onclick = () => openSheet(el.dataset.k));
      q('.lb-seats').querySelectorAll('.lb-seat.join').forEach(el => el.onclick = () => moveTeam(me(), el.dataset.team));
      q('.lb-seats').querySelectorAll('.lb-seat.leadslot').forEach(el => el.onclick = () => {
        const mp = st.room.players[me()];
        if (mp && mp.team === el.dataset.lead && (leader.selfPick || isHost())) return myAct('lead');
        toast(isHost() ? `그 팀 사람 자리를 눌러 ${josa(leader.name, '을', '를')} 맡기세요` : `${josa(leader.name, '은', '는')} 그 팀 사람이 자원하거나 방장이 정해요`);
      });
      // 방장 도구
      const tools = [];
      if (isHost()) {
        if (teams) tools.push(['shuffle', '🔀 팀 섞기'], ['balance', '⚖️ 인원 맞추기']);
        else if (o.seatTool !== false) tools.push(['seats', '🪑 자리 섞기']);
        if (leader) tools.push(['randlead', `🎲 ${leader.name} 랜덤`]);
      }
      q('.lb-tools').innerHTML = tools.map(([a, t]) => `<button class="btn light" data-a="${a}">${t}</button>`).join('');
      q('.lb-tools').querySelectorAll('[data-a]').forEach(b => b.onclick = () => hostTool(b.dataset.a));
      // 내 버튼
      const mine = [];
      if (!isHost()) mine.push(`<button class="btn ${myP.ready ? 'light' : 'green'} lb-ready" data-m="ready">${myP.ready ? '✋ 준비 취소' : '✅ 준비 완료'}</button>`);
      if (teams) { const nx = teams[(teams.findIndex(t => t.id === myP.team) + 1) % teams.length]; mine.push(`<button class="btn light" data-m="team">↔ ${nx.icon} ${esc(josa(nx.name, '으로', '로'))}</button>`); }
      if (leader && leader.selfPick) mine.push(`<button class="btn light" data-m="lead">${leader.icon} ${leader.name} ${isLead(myP) ? '내려놓기' : '할래요'}</button>`);
      q('.lb-mine').innerHTML = mine.join('');
      q('.lb-mine').querySelectorAll('[data-m]').forEach(b => b.onclick = () => myAct(b.dataset.m));
      q('.lb-tip').textContent = o.tip ? o.tip(isHost()) : isHost() ? '자리를 누르면 팀 옮기기 · 맡기기 · 방장 넘기기 · 내보내기' : '내 자리를 누르면 할 수 있는 것들이 나와요';
      // 시작
      const why = reason(), go = q('.lb-go');
      go.style.display = isHost() ? '' : 'none'; go.disabled = !!why;
      go.textContent = o.startLabel || '게임 시작';
      const ready = ps.filter(p => p.k !== room.host && p.ready).length, others = n - 1;
      q('.lb-why').textContent = isHost() ? (why || '모두 준비됐어요! 시작을 누르세요 🎉') : (why && !/준비를 기다리는/.test(why) ? why : `방장이 시작하면 바로 넘어가요 · 준비 ${ready}/${others}`);
      if (st.lastCount >= 0 && n !== st.lastCount) sfx(n > st.lastCount ? 'join' : 'leave');
      st.lastCount = n;
      if (!sheet.hidden && sheet.dataset.k && !room.players[sheet.dataset.k]) sheet.hidden = true;
    }

    // ── 자리 메뉴 (아래에서 올라오는 시트) ──
    function openSheet(k) {
      const p = st.room.players[k]; if (!p) return;
      const mine = k === me(), host = isHost(), acts = [];
      if (!mine && !host) { toast(`${p.nick} 님 자리예요`); return; }
      if (teams) teams.filter(t => t.id !== p.team).forEach(t => acts.push([`team:${t.id}`, `↔ ${t.icon} ${josa(t.name, '으로', '로')} 옮기기`, 'light']));
      if (leader && (host || (mine && leader.selfPick))) acts.push(['lead', p[L] ? `${leader.icon} ${leader.name} 해제` : `${leader.icon} ${leader.name} 맡기기`, 'light']);
      if (mine && !host) acts.push(['ready', p.ready ? '✋ 준비 취소' : '✅ 준비 완료', p.ready ? 'light' : 'green']);
      if (host && !mine) { acts.push(['host', '⭐ 방장 넘기기', 'light']); acts.push(['kick', '🚪 내보내기', '']); }
      if (!acts.length) return;
      sheet.dataset.k = k;
      sheet.querySelector('.lb-sheet-t').innerHTML = `<span class="lb-av">${avatarOf(k)}</span>${esc(p.nick)}${mine ? ' (나)' : ''}`;
      sheet.querySelector('.lb-sheet-b').innerHTML = acts.map(([a, t, c]) => `<button class="btn ${c}" data-s="${a}">${t}</button>`).join('');
      sheet.querySelectorAll('[data-s]').forEach(b => b.onclick = () => { sheet.hidden = true; sheetAct(k, b.dataset.s); });
      sheet.hidden = false;
    }
    function sheetAct(k, a) {
      const p = st.room.players[k]; if (!p) return;
      if (a.startsWith('team:')) return moveTeam(k, a.slice(5));
      if (a === 'lead') return setLead(k, !p[L]);
      if (a === 'ready') return ref().child(`players/${k}/ready`).set(!p.ready);
      if (a === 'host') { if (confirm(`${p.nick} 님에게 방장을 넘길까요?`)) { ref().update({ host: k, [`players/${k}/ready`]: false }); say(`⭐ ${p.nick} 님이 새 방장이에요`, true); } return; }
      if (a === 'kick') { if (confirm(`${p.nick} 님을 내보낼까요?`)) { ref().child(`players/${k}`).remove(); say(`🚪 ${p.nick} 님을 내보냈어요`, true); } }
    }
    function moveTeam(k, t) {
      const p = st.room.players[k]; if (!p || p.team === t) return;
      const up = { [`players/${k}/team`]: t }; if (L) up[`players/${k}/${L}`] = false;
      ref().update(up); sfx('flip');
    }
    function setLead(k, on) {
      const p = st.room.players[k]; if (!p || !L) return;
      const up = {};
      for (const [kk, pp] of Object.entries(st.room.players)) if (!leader.perTeam || pp.team === p.team) up[`players/${kk}/${L}`] = on ? kk === k : (kk === k ? false : !!pp[L]);
      ref().update(up); sfx('place');
    }
    function myAct(m) {
      const myP = st.room.players[me()]; if (!myP) return;
      if (m === 'ready') { ref().child(`players/${me()}/ready`).set(!myP.ready); sfx(myP.ready ? 'tap' : 'correct'); return; }
      if (m === 'team') { const nx = teams[(teams.findIndex(t => t.id === myP.team) + 1) % teams.length]; return moveTeam(me(), nx.id); }
      if (m === 'lead') {
        if (myP[L]) return setLead(me(), false);
        const holder = list().find(p => isLead(p) && (!leader.perTeam || p.team === myP.team));
        if (holder && !isHost()) return toast(`이미 ${holder.nick} 님이 ${josa(leader.name, '이에요', '예요')} — 방장에게 바꿔 달라고 해 보세요`);
        setLead(me(), true); say(`${leader.icon} ${myP.nick} 님이 ${josa(leader.name, '을', '를')} 맡았어요`, true);
      }
    }
    function hostTool(a) {
      const ps = list(), up = {};
      if (a === 'balance') {   // 지금 팀은 최대한 유지하면서 인원만 고르게
        const by = {}; teams.forEach(t => by[t.id] = teamOf(t.id).map(p => p.k));
        const goal = Math.ceil(ps.length / teams.length);
        for (const t of teams) while (by[t.id].length > goal) { const k = by[t.id].pop(); const tgt = teams.map(x => x.id).sort((x, y) => by[x].length - by[y].length)[0]; by[tgt].push(k); if (L) up[`players/${k}/${L}`] = false; }
        teams.forEach(t => by[t.id].forEach(k => { up[`players/${k}/team`] = t.id; }));
        ref().update(up); toast('인원을 맞췄어요'); sfx('deal'); return;
      }
      if (a === 'shuffle') {
        const order = shuffle(ps.map(p => p.k));
        order.forEach((k, i) => { up[`players/${k}/team`] = teams[i % teams.length].id; if (L) up[`players/${k}/${L}`] = false; });
        if (leader && leader.perTeam) teams.forEach(t => { const ks = order.filter((k, i) => teams[i % teams.length].id === t.id); if (ks.length) up[`players/${ks[Math.floor(Math.random() * ks.length)]}/${L}`] = true; });
        ref().update(up); toast(leader && leader.perTeam ? `팀과 ${josa(leader.name, '을', '를')} 섞었어요` : '팀을 섞었어요'); sfx('deal'); return;
      }
      if (a === 'seats') { shuffle(ps.map(p => p.k)).forEach((k, i) => up[`players/${k}/seat`] = i); ref().update(up); toast('자리를 섞었어요'); sfx('deal'); return; }
      if (a === 'randlead') {
        const groups = leader.perTeam && teams ? teams.map(t => teamOf(t.id)) : [ps];
        groups.forEach(g => { if (!g.length) return; const pick = g[Math.floor(Math.random() * g.length)].k; g.forEach(p => up[`players/${p.k}/${L}`] = p.k === pick); });
        ref().update(up); toast(`${josa(leader.name, '을', '를')} 랜덤으로 정했어요`); sfx('deal');
      }
    }
    q('.lb-go').onclick = () => { const why = reason(); if (why) return toast(why); o.onStart && o.onStart(); };

    // ── 채팅 ──
    function subscribeChat() {
      const path = ref().toString();
      if (path === st.path) return;
      stopChat(); st.path = path;
      st.chatRef = ref().child('chat').limitToLast(30);
      st.chatCb = st.chatRef.on('value', s => {
        const v = s.val() || {}; const box = q('.lb-chat');
        const msgs = Object.values(v).sort((a, b) => a.at - b.at);
        const atBottom = box.scrollHeight - box.scrollTop - box.clientHeight < 30;
        box.innerHTML = msgs.length ? msgs.map(m => m.sys ? `<div class="lb-msg sys">${esc(m.t)}</div>` : `<div class="lb-msg ${m.k === me() ? 'mine' : ''}"><b>${avatarOf(m.k)} ${esc(m.n)}</b>${esc(m.t)}</div>`).join('') : '<div class="lb-msg sys">아직 조용해요 — 먼저 인사해 볼까요?</div>';
        const last = msgs[msgs.length - 1];
        if (atBottom || (last && last.k === me())) box.scrollTop = box.scrollHeight;
        if (last && last.k !== me() && !last.sys && st.chatSeen && last.at > st.chatSeen) sfx('tick');
        st.chatSeen = last ? last.at : Date.now();
      });
    }
    function stopChat() { if (st.chatRef && st.chatCb) st.chatRef.off('value', st.chatCb); st.chatRef = st.chatCb = null; st.path = ''; st.chatSeen = 0; }
    function say(t, sys) {
      t = String(t || '').trim().slice(0, 60); if (!t || (!st.room && !sys)) return;
      const p = st.room && st.room.players && st.room.players[me()];
      ref().child('chat').push(sys ? { sys: 1, t, at: Date.now() } : { k: me(), n: p ? p.nick : '?', t, at: Date.now() });
    }
    q('.lb-say').onsubmit = e => { e.preventDefault(); const i = q('.lb-in'); say(i.value); i.value = ''; };
    q('.lb-quick').querySelectorAll('button').forEach(b => b.onclick = () => say(b.textContent));

    // 판만 끝내고 방·사람은 그대로 대기실로 (준비는 다시)
    function toLobby() {
      if (!isHost()) return toast('방장만 대기실로 돌릴 수 있어요');
      return ref().child('players').once('value').then(sn => {
        const up = { status: 'lobby', game: null };
        Object.keys(sn.val() || {}).forEach(k => { up[`players/${k}/ready`] = false; });
        return ref().update(up);
      }).then(() => say('🪑 방장이 게임을 끝내고 대기실로 돌아왔어요', true));
    }
    // 게임 중 ⏸ 메뉴: 방장은 '대기실로', 모두 '방 나가기'
    function menu(opt = {}) {
      const host = isHost(), acts = [];
      if (host) acts.push(['lobby', '🪑 게임 그만하고 대기실로', 'green']);
      (opt.extra || []).forEach(x => acts.push(x));
      acts.push(['leave', host ? '🚪 방 나가기 (방이 사라져요)' : '🚪 방 나가기', '']);
      sheet.dataset.k = '';
      sheet.querySelector('.lb-sheet-t').innerHTML = `⏸ 메뉴${host ? '' : '<small style="font-size:12.5px;color:#8a5a2a;margin-left:auto">게임 중단은 방장이 해요</small>'}`;
      sheet.querySelector('.lb-sheet-b').innerHTML = acts.map(([a, t, c]) => `<button class="btn ${c}" data-s="${a}">${t}</button>`).join('');
      sheet.querySelectorAll('[data-s]').forEach(b => b.onclick = () => {
        sheet.hidden = true; const a = b.dataset.s;
        if (a === 'lobby') { if (confirm('지금 판을 그만두고 모두 대기실로 갈까요?')) toLobby(); }
        else if (a === 'leave') opt.onLeave && opt.onLeave();
        else { const x = (opt.extra || []).find(e => e[0] === a); x && x[3] && x[3](); }
      });
      sheet.hidden = false;
    }
    return { render, reason, toLobby, menu, stop: () => { stopChat(); sheet.hidden = true; st.lastCount = -1; st.room = null; }, say, list, setRoom: r => { st.room = r; } };
  }
  window.Lobby = { mount, avatarOf };
})();
