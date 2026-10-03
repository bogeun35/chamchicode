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

// ── 모바일 · 전체화면 공통 (보드게임) ──
// 1) 터치 보정  2) 전체화면 버튼(소리 버튼 옆)  3) 허브 안 폰 화면에서 ☰ 버튼과 상단 바 겹침 회피  4) 게임 중 화면 꺼짐 방지
(function () {
  const d = document, root = d.documentElement;
  const css = d.createElement('style');
  css.textContent = `
html { -webkit-text-size-adjust: 100%; text-size-adjust: 100%; overscroll-behavior-y: contain; }
body { overscroll-behavior-y: contain; -webkit-tap-highlight-color: transparent; }
button, .btn, .chip, .ib, .num, input, select, label, [data-act] { touch-action: manipulation; }
#fsBtn { position: fixed; left: 54px; bottom: 10px; z-index: 80; width: 38px; height: 38px; border-radius: 50%; border: 2px solid rgba(255,255,255,.7); background: rgba(0,0,0,.35); color: #fff; cursor: pointer; backdrop-filter: blur(4px); box-shadow: 0 3px 0 rgba(0,0,0,.3); padding: 8px; line-height: 0; }
#fsBtn svg { width: 100%; height: 100%; display: block; }
#fsBtn[hidden] { display: none; }
html.hub-m #game .top { padding-left: 52px; min-height: 44px; }
@media (max-width: 480px) {
  #game .top { gap: 4px; flex-wrap: nowrap; }
  #game .top > * { flex: none; }
  #game .top .chip, #game .top .pill { font-size: 12px; padding: 5px 9px; white-space: nowrap; }
  #game .top .btn { font-size: 12.5px; padding: 6px 10px; min-height: 34px; }
}
`;
  d.head.appendChild(css);

  // 전체화면 (웹킷 접두 포함). 허브 iframe 은 allow="fullscreen" 이 있어야 쓸 수 있음 → 못 쓰면 버튼 숨김
  const ICON = {
    off: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round"><path d="M4 9V4h5M15 4h5v5M20 15v5h-5M9 20H4v-5"/></svg>',
    on: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round"><path d="M9 4v5H4M20 9h-5V4M15 20v-5h5M4 15h5v5"/></svg>',
  };
  const fsOn = () => !!(d.fullscreenElement || d.webkitFullscreenElement);
  const fsCan = () => !!(d.fullscreenEnabled || d.webkitFullscreenEnabled) && !!(root.requestFullscreen || root.webkitRequestFullscreen);
  let blocked = false, btn = null;
  function sync() {
    const on = fsOn();
    root.classList.toggle('fs', on);
    if (btn) {
      btn.hidden = !(on || (fsCan() && !blocked));
      btn.innerHTML = on ? ICON.on : ICON.off;
      btn.title = on ? '전체화면 끝내기' : '전체화면'; btn.setAttribute('aria-label', btn.title);
    }
    hubCheck();
  }
  function toggle() {
    const fail = () => { if (!fsOn()) { blocked = true; sync(); } };
    try {
      if (fsOn()) { const ex = d.exitFullscreen || d.webkitExitFullscreen; const p = ex && ex.call(d); if (p && p.catch) p.catch(() => {}); }
      else { const rq = root.requestFullscreen || root.webkitRequestFullscreen; if (!rq) return fail(); const p = rq.call(root, { navigationUI: 'hide' }); if (p && p.catch) p.catch(fail); }
    } catch (e) { fail(); }
  }
  // 허브(같은 출처) 안에서 폰 화면이면 허브의 ☰ 버튼이 왼쪽 위에 떠 있음 → 게임 상단 바를 비켜 줌
  function hubCheck() {
    let m = false;
    try {
      if (window.top !== window.self && !fsOn() && window.innerWidth < 700) {   // 넓으면 게임 칸이 가운데라 안 겹침
        const vis = id => { const t = window.parent.document.getElementById(id); return !!t && window.parent.getComputedStyle(t).display !== 'none'; };
        m = vis('mobileToggle') || vis('lnbOpen');   // 폰의 ☰ 또는 데스크톱에서 메뉴를 접었을 때의 ☰
      }
    } catch (e) {}
    root.classList.toggle('hub-m', m);
  }
  // 게임 화면에 있는 동안만 화면 꺼짐 방지 (턴 기다리다 폰이 꺼지지 않게)
  let lock = null, pending = false;
  async function wake() {
    const inGame = !!d.querySelector('#game.screen.active') && d.visibilityState === 'visible';
    if (pending) return;
    try {
      if (inGame && !lock && navigator.wakeLock) { pending = true; lock = await navigator.wakeLock.request('screen'); lock.addEventListener('release', () => { lock = null; }); }
      else if (!inGame && lock) { const l = lock; lock = null; l.release(); }
    } catch (e) { lock = null; }
    pending = false;
  }
  function mount() {
    btn = d.createElement('button'); btn.id = 'fsBtn'; btn.type = 'button';
    btn.addEventListener('click', e => { e.stopPropagation(); toggle(); });
    d.body.appendChild(btn);
    ['fullscreenchange', 'webkitfullscreenchange'].forEach(ev => d.addEventListener(ev, sync));
    d.addEventListener('fullscreenerror', () => { blocked = true; sync(); });
    window.addEventListener('resize', hubCheck);
    try { if (window.top !== window.self) { window.parent.addEventListener('resize', hubCheck); new MutationObserver(hubCheck).observe(window.parent.document.body, { attributes: true, attributeFilter: ['class'] }); } } catch (e) {}
    new MutationObserver(wake).observe(d.body, { subtree: true, attributes: true, attributeFilter: ['class'] });
    d.addEventListener('visibilitychange', wake);
    sync(); wake();
  }
  if (d.readyState === 'loading') d.addEventListener('DOMContentLoaded', mount); else mount();
  window.UX && (UX.fullscreen = { toggle, on: fsOn, can: fsCan });
})();
