// 참스코드 파티게임 공통 UX 헬퍼 — 각 게임 페이지에서 <script src="party-ux.js"> 로 로드
(function () {
  const ADJ = ['졸린', '용감한', '수줍은', '배고픈', '반짝이는', '느긋한', '재빠른', '엉뚱한', '행복한', '시크한'];
  const NOUN = ['고양이', '판다', '펭귄', '여우', '햄스터', '문어', '코알라', '너구리', '오리', '호랑이'];
  let ac = null;

  function beep(freq = 880, ms = 120, vol = .25) {
    try {
      ac = ac || new (window.AudioContext || window.webkitAudioContext)();
      if (ac.state === 'suspended') ac.resume();
      const o = ac.createOscillator(), g = ac.createGain();
      o.type = 'sine'; o.frequency.value = freq; g.gain.value = vol;
      o.connect(g); g.connect(ac.destination);
      const t = ac.currentTime; g.gain.setValueAtTime(vol, t); g.gain.exponentialRampToValueAtTime(0.001, t + ms / 1000);
      o.start(t); o.stop(t + ms / 1000);
    } catch (e) {}
  }
  const UX = {
    // 닉네임 입력 편의: 자동 포커스, Enter = 코드가 있으면 참가 / 없으면 만들기, 비우면 자동 닉
    nick(inputId, joinId, createBtnId, joinBtnId) {
      const inp = document.getElementById(inputId), join = document.getElementById(joinId);
      if (!inp) return;
      if (!inp.value) setTimeout(() => inp.focus(), 100);
      const go = () => { const has = join && join.value.trim().length === 6; document.getElementById(has ? joinBtnId : createBtnId).click(); };
      inp.addEventListener('keydown', e => { if (e.key === 'Enter') go(); });
      if (join) join.addEventListener('keydown', e => { if (e.key === 'Enter') document.getElementById(joinBtnId).click(); });
    },
    randomNick() { return ADJ[Math.floor(Math.random() * ADJ.length)] + NOUN[Math.floor(Math.random() * NOUN.length)]; },
    // 링크 공유: 폰이면 공유 시트, 아니면 복사
    async share(url, title, onDone) {
      try {
        if (navigator.share && /Android|iPhone|iPad/i.test(navigator.userAgent)) { await navigator.share({ title, text: title + ' — 함께 해요!', url }); onDone && onDone('공유했어요'); return; }
      } catch (e) { if (e && e.name === 'AbortError') return; }
      try { await navigator.clipboard.writeText(url); onDone && onDone('링크를 복사했어요'); } catch (e) { prompt('복사해 주세요', url); }
    },
    beep,
    vibrate(p) { try { if (navigator.vibrate) navigator.vibrate(p || [60, 40, 60]); } catch (e) {} },
    // 내 차례 / 새 단계 알림 (진동 + 띵)
    notify(kind) {
      const S = window.Sound;
      if (kind === 'turn') UX.vibrate([70, 50, 90]); else if (kind === 'phase') UX.vibrate([50]); else if (kind === 'warn') UX.vibrate([120]);
      if (S && S.ready) { S.play({ turn: 'turn', phase: 'phase', warn: 'warn', good: 'win', bad: 'lose' }[kind] || 'phase'); return; }
      if (kind === 'turn') { beep(880, 120); setTimeout(() => beep(1320, 160), 130); }
      else if (kind === 'phase') beep(660, 150);
      else if (kind === 'warn') beep(440, 200, .2);
      else if (kind === 'good') { beep(1046, 100); setTimeout(() => beep(1568, 200), 110); }
      else if (kind === 'bad') beep(300, 250, .2);
    },
    // 마지막 방 기억 → 새로고침/재접속 시 "이어하기"
    remember(gameKey, code, nick) { try { localStorage.setItem('last_' + gameKey, JSON.stringify({ code, nick, t: Date.now() })); } catch (e) {} },
    forget(gameKey) { try { localStorage.removeItem('last_' + gameKey); } catch (e) {} },
    last(gameKey) { try { const v = JSON.parse(localStorage.getItem('last_' + gameKey) || 'null'); return v && Date.now() - v.t < 3 * 3600e3 ? v : null; } catch (e) { return null; } },
    // 홈에 "이어하기" 카드 만들기 (checkFn: code → Promise<bool 존재>)
    async resumeCard(gameKey, containerId, checkFn, onResume) {
      const v = UX.last(gameKey); if (!v) return;
      let ok = false; try { ok = await checkFn(v.code); } catch (e) {}
      if (!ok) { UX.forget(gameKey); return; }
      const c = document.getElementById(containerId); if (!c) return;
      const card = document.createElement('div');
      card.className = 'card'; card.style.borderColor = '#ffd36b';
      card.innerHTML = `<h3>🔁 이어하기</h3><div style="font-size:15px;margin-bottom:8px">방 <b style="font-family:monospace;letter-spacing:.15em">${v.code}</b> · ${v.nick}</div><button class="btn green wide" id="btnResume">이어서 하기</button>`;
      c.prepend(card);
      document.getElementById('btnResume').onclick = () => onResume(v);
    },
    // 입장 링크(?room=)로 들어온 경우 참가 카드를 위로 + 강조
    emphasizeJoin(joinCardSelector, homeId) {
      const p = new URLSearchParams(location.search); if (!p.get('room')) return;
      const home = document.getElementById(homeId), card = typeof joinCardSelector === 'string' ? document.querySelector(joinCardSelector) : joinCardSelector; if (!home || !card) return;
      home.insertBefore(card, home.querySelector('.card'));
      card.style.borderColor = '#ffd36b'; card.style.boxShadow = '0 0 0 4px rgba(255,211,107,.45), 0 6px 0 #5c3a1a';
      const h = card.querySelector('h3'); if (h) h.textContent = '🎉 초대받은 방에 참가하기';
    },
    // 누르고 있는 동안만 보이기 (비밀 카드)
    holdToPeek(el, veilEl) {
      if (!el || !veilEl) return;
      let t = null;
      const showV = () => { if (window.Sound) Sound.play('peek'); veilEl.style.display = 'none'; clearTimeout(t); t = setTimeout(() => veilEl.style.display = '', 6000); };
      const hideV = () => { veilEl.style.display = ''; clearTimeout(t); };
      el.addEventListener('pointerdown', e => { e.preventDefault(); showV(); });
      el.addEventListener('pointerup', () => setTimeout(hideV, 150));
      el.addEventListener('pointerleave', hideV);
      el.addEventListener('pointercancel', hideV);
    },
  };
  window.UX = UX;
})();
