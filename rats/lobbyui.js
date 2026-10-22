// 로켓 쥐 — 대기실 화면: 컴퓨터(o_upgrades_area, 영구 업그레이드 3×3) / 오두막(o_character_cabin, 캐릭터·재능) / 일시정지.
// 근거: notes/meta.md §2 (컴퓨터), notes/characters.md §3 (오두막), notes/ui_flow.md §6.3 (일시정지).
(function () {
  'use strict';
  const { lerp, clamp, dcos } = GM;
  const G = RatsGame, UI = RatsUI, A = RatsArt, S = n => RatsSound.play(n);
  const T = UI.T;

  // ---- 컴퓨터 -------------------------------------------------------------------------------
  function openComputer() {   // open_ui (UA@1410)
    G.SAVE.has_visited_global_upgrades = true; G.save(); S('select');
    const ui = { kind: 'computer', lerp: 0, closing: false, sx: 0, sy: 0, cards: [] };
    G.MAIN.forEach((row, i) => row.forEach((u, j) => ui.cards.push({ u, i, j, delay_upgrading: 0, lerp_upgrade: 0, buy_lock: true, equip_lock: true, unequip_lock: true,
      spring: 1, white: 0, lerp_equipped: 0, time: 0 })));
    for (let i = 0; i < 3; i++) { const s = G.SAVE.main_upgrades_selected[G.MAIN_CATS[i]]; if (s >= 0) { ui.sx = s; ui.sy = i; break; } }   // UAC L169–172
    return ui;
  }
  function equip(ui, c) { G.SAVE.main_upgrades_selected[G.MAIN_CATS[c.i]] = c.j; const P = RatsCombat.W.player; if (P) P.main_upgrades[c.i] = c.u; c.white = 12; c.spring = 1.4; S('select'); G.save(); }   // UA@6319
  function unequip(ui, c) { G.SAVE.main_upgrades_selected[G.MAIN_CATS[c.i]] = -1; const P = RatsCombat.W.player; if (P) P.main_upgrades[c.i] = null; c.spring = 1.2; S('click'); G.save(); }   // UA@5917
  function buy(ui, c) {   // upgrade_card (UA@5025)
    const price = G.main_upgrade_get_price(c.u, c.u.level);
    S('buy'); c.unequip_lock = true; c.spring = 1.4; c.white = 24; c.lerp_upgrade = 0; c.buy_lock = true;
    RatsCombat.screen_shake(6, .8); RatsCombat.W.g.aberration += 4;
    G.SAVE.coins -= price; G.SAVE.spent_coins += price; G.SAVE.main_upgrades_progress[c.u.name] = (G.SAVE.main_upgrades_progress[c.u.name] || 0) + 1; c.u.level += 1; G.save();
    equip(ui, c);
  }
  function stepComputer(ui, I) {
    ui.lerp = ui.closing ? lerp(ui.lerp, 0, .1 + .2 * (1 - ui.lerp)) : lerp(ui.lerp, 1, .1 + .15 * ui.lerp);
    if (ui.closing) { if (ui.lerp < .01) ui.closed = true; return; }
    if (I.back || I.interact && !I.enter_held && false) { ui.closing = true; S('click'); return; }
    if (I.back) { ui.closing = true; return; }
    const dx = I.card_right - I.card_left, dy = I.card_down - I.card_up;                     // UAS L168–172
    if (dx || dy) { ui.sx = clamp(ui.sx + dx, 0, G.MAIN[clamp(ui.sy + dy, 0, 2)].length - 1); ui.sy = clamp(ui.sy + dy, 0, 2); S('upgrade_hover'); }
    const cur = ui.cards.find(c => c.i === ui.sy && c.j === ui.sx);
    const HOLD = 8, enter = I.enter_held, released = ui._held && !enter;                     // L194–202
    for (const c of ui.cards) {
      c.u.level = G.SAVE.main_upgrades_progress[c.u.name] || 0;
      const price = G.main_upgrade_get_price(c.u, c.u.level);
      c.can_buy = price <= G.SAVE.coins && c.u.level < c.u.max && !c.buy_lock;               // L90–91
      c.is_equipped = G.SAVE.main_upgrades_selected[G.MAIN_CATS[c.i]] === c.j;
      c.lerp_equipped = c.is_equipped ? lerp(c.lerp_equipped, 1, .1 + .15 * c.lerp_equipped) : lerp(c.lerp_equipped, 0, .1 + .2 * c.lerp_equipped);
      if (c !== cur || !c.is_upgrading) c.lerp_upgrade = lerp(c.lerp_upgrade, 0, .1 + .2 * (1 - c.lerp_upgrade));
      c.is_upgrading = false; c.spring = lerp(c.spring, 1, .2); if (c.white > 0) c.white--; c.time += 8 + 8 * c.lerp_upgrade;
    }
    if (cur) {
      if (released && cur.u.level > 0 && (cur.delay_upgrading < HOLD || !cur.can_buy)) { if (!cur.is_equipped) { if (!cur.equip_lock) equip(ui, cur); } else if (!cur.unequip_lock) unequip(ui, cur); }   // L207–213
      if (released || !enter) { cur.buy_lock = false; cur.equip_lock = false; cur.unequip_lock = false; }   // L216–220
      if (cur.can_buy && enter) { if (cur.delay_upgrading++ >= HOLD) { if (cur.lerp_upgrade >= .99) buy(ui, cur); cur.is_upgrading = true; cur.lerp_upgrade = lerp(cur.lerp_upgrade, 1, .2 - .15 * cur.lerp_upgrade); if (RatsCombat.W.frame % 5 === 0) S('coin_tick_up'); } }   // L224–231
      else { if (!enter) cur.buy_lock = false; cur.delay_upgrading = 0; }
    }
    ui._held = enter;
  }
  function drawComputer(g, ui, s, Wd, Ht, t) {   // UAD (meta.md §2.5)
    if (ui.lerp <= .01) return; const a = ui.lerp; s = Math.min(s, Wd / 650, Ht / 370);   // 좁은 화면에선 패널이 넘치지 않게 축소
    const Wp = 640 * s, Hp = 360 * s, X0 = (Wd - Wp) / 2, Y0 = (Ht - Hp) / 2 + 40 * s * (1 - a);
    g.fillStyle = `rgba(0,0,0,${.3 * a})`; g.fillRect(0, 0, Wd, Ht);
    g.globalAlpha = a;
    // s_computer_bg 대신: 초록 화면 모니터 틀
    UI.rr(g, X0 + 8 * s, Y0 + 8 * s, Wp - 16 * s, Hp - 16 * s, 18 * s, '#a7b8c9'); UI.rr(g, X0 + 20 * s, Y0 + 20 * s, Wp - 40 * s, Hp - 40 * s, 10 * s, '#0f5a35');
    g.fillStyle = 'rgba(255,255,255,.04)'; for (let y = Y0 + 20 * s; y < Y0 + Hp - 20 * s; y += 3 * s) g.fillRect(X0 + 20 * s, y, Wp - 40 * s, s);
    const gridW = 260 * s, gridH = 300 * s, GX = X0 + 24 * s, GY = Y0 + (Hp - gridH) / 2 - 10 * s, gapX = -12 * s, gapY = 20 * s;   // L33–45
    for (let i = 0; i < 3; i++) {
      const row = G.MAIN[i], n = row.length, rowW = 80 * s * n + gapX * (n - 1), allH = 80 * s * 3 + gapY * 3, rx = (gridW - rowW) / 2, ry = (gridH - allH) / 2;
      const TX = GX + rx + rowW + 12 * s, TY = GY + ry + gapY - 6 * s + (gapY + 80 * s) * i;   // L68–71
      UI.textOutline(g, TX + 40 * s, TY, T('main_upgrades_' + G.MAIN_CATS[i]), 12 * s, '#9cf2bd', '#062b18', a, 'left');
      g.fillStyle = '#9cf2bd'; g.fillRect(TX - rowW, TY + 8 * s, rowW + 32 * s, 2 * s);
      for (let j = 0; j < n; j++) {
        const c = ui.cards.find(q => q.i === i && q.j === j), u = c.u;
        const cx = GX + rx + gapX * j + 80 * (j + .5) * s, cy = GY + ry + gapY * (i + 1) + 80 * (i + .5) * s - 8 * s;   // L118–119
        const sel = ui.sx === j && ui.sy === i;
        g.save(); g.translate(cx, cy); g.scale(s * c.spring, s * (2 - c.spring)); g.globalAlpha = a * (u.level <= 0 ? .8 : 1);
        g.drawImage(A.cardSprite(u.level <= 0 ? 's_upgrade_card_02' : u.level >= u.max ? 's_upgrade_card_rare_leveled' : 's_upgrade_card_03'), -40, -40);
        const ic = A.bake(32, 32, q => A.SYM[u.icon](q)); g.drawImage(ic, -16, -14);
        if (u.level > 0) UI.textOutline(g, 0, -20, U_roman(u.level), 9, '#fff', '#1d1630', a);
        if (c.lerp_upgrade > .01) { g.globalAlpha = a * .8; g.fillStyle = '#ffd25c'; g.fillRect(-22, 26, 44 * c.lerp_upgrade, 4); }
        if (c.white > 0) { g.globalAlpha = a * c.white / 24; UI.rr(g, -24, -33, 48, 66, 6, '#fff'); }
        if (c.lerp_equipped > .02) { g.globalAlpha = a * c.lerp_equipped; g.strokeStyle = '#5be36a'; g.lineWidth = 2; g.beginPath(); g.roundRect(-26, -35, 52, 70, 8); g.stroke(); }
        if (sel) { g.globalAlpha = a; g.strokeStyle = '#ffffff'; g.lineWidth = 2; g.beginPath(); g.roundRect(-28 - dcos(t * 8) , -37, 56 + 2 * dcos(t * 8), 74, 9); g.stroke(); }
        g.restore(); g.globalAlpha = a;
        const price = G.main_upgrade_get_price(u, u.level), max = u.level >= u.max;   // L293–316
        UI.textOutline(g, cx, cy + 80 * s * .5 - 2 * s, max ? T('main_upgrades_max') : '🧀' + price, 8 * s, max ? '#7b7b7b' : price <= G.SAVE.coins ? '#0ca22c' : '#8d071c', '#ffffff', a);
      }
    }
    // 설명 (선택 카드)
    const c = ui.cards.find(q => q.i === ui.sy && q.j === ui.sx);
    if (c) {
      const u = c.u, lines = [`Lvl ${u.level}/${u.max}`].concat(UI.fmt(T(u.name), u.vars(u)).split('\n'));
      const x = X0 + 330 * s, y = Y0 + 70 * s;
      UI.panel(g, x - 6 * s, y - 14 * s, 290 * s, (lines.length * 14 + 14) * s, .9 * a);
      lines.forEach((l, k) => UI.drawRich(g, x, y + k * 14 * s, l, 9 * s, a, 'left', t));
    }
    UI.textOutline(g, X0 + Wp - 20 * s, Y0 + Hp - 8 * s - 8 * s, T('hold_warn') + ' (Enter 길게) · Esc 닫기', 8 * s, '#c8ffd9', '#062b18', a, 'right');   // L517–522
    UI.textOutline(g, X0 + 40 * s, Y0 + 34 * s, '🧀 ' + G.SAVE.coins, 11 * s, '#ffe14d', '#062b18', a, 'left');
    g.globalAlpha = 1;
  }
  const U_roman = n => RatsUpgrades.roman(n);

  // ---- 오두막 (캐릭터 선택 + 재능) ----------------------------------------------------------------
  function openCabin() { G.SAVE.has_visited_character_cabin = true; G.save(); S('select'); const ci = G.CHARS.findIndex(c => c.key === G.SAVE.character_selected); return { kind: 'cabin', lerp: 0, closing: false, ci: Math.max(0, ci), mode: 'chars', tsel: 0 }; }
  function stepCabin(ui, I) {
    ui.lerp = ui.closing ? lerp(ui.lerp, 0, .1 + .2 * (1 - ui.lerp)) : lerp(ui.lerp, 1, .1 + .15 * ui.lerp);
    if (ui.closing) { if (ui.lerp < .01) ui.closed = true; return; }
    if (window.RatsTalents && ui.mode === 'tree') { RatsTalents.stepTree(ui, I); return; }
    if (I.back) { ui.closing = true; S('click'); return; }
    if (I.card_left) { ui.ci = (ui.ci + G.CHARS.length - 1) % G.CHARS.length; S('upgrade_hover'); }
    if (I.card_right) { ui.ci = (ui.ci + 1) % G.CHARS.length; S('upgrade_hover'); }
    const ch = G.CHARS[ui.ci], unlocked = G.SAVE.characters_unlocked.includes(ch.key);
    if (I.enter && unlocked) {
      if (G.SAVE.character_selected !== ch.key) { G.SAVE.character_selected = ch.key; G.save(); S('upgrade_choose'); RatsWorld.enterLobby(); RatsWorld.R.ui = openCabin(); RatsWorld.R.ui.lerp = 1; }
      else if (window.RatsTalents) { ui.mode = 'tree'; ui.tsel = 0; S('select'); }
    }
  }
  function drawCabin(g, ui, s, Wd, Ht, t) {
    if (ui.lerp <= .01) return; const a = ui.lerp; s = Math.min(s, Wd / 650, Ht / 370);
    const Wp = 640 * s, Hp = 360 * s, X0 = (Wd - Wp) / 2, Y0 = (Ht - Hp) / 2 + 40 * s * (1 - a);
    g.fillStyle = `rgba(0,0,0,${.35 * a})`; g.fillRect(0, 0, Wd, Ht); g.globalAlpha = a;
    UI.rr(g, X0 + 8 * s, Y0 + 8 * s, Wp - 16 * s, Hp - 16 * s, 18 * s, '#f2b13a'); UI.rr(g, X0 + 18 * s, Y0 + 18 * s, Wp - 36 * s, Hp - 36 * s, 12 * s, '#2a1f45');
    if (ui.mode === 'tree' && window.RatsTalents) { RatsTalents.drawTree(g, ui, s, X0, Y0, Wp, Hp, a, t); g.globalAlpha = 1; return; }
    const n = G.CHARS.length;
    G.CHARS.forEach((ch, i) => {
      const x = X0 + Wp / 2 + (i - (n - 1) / 2) * 92 * s, y = Y0 + 120 * s, sel = i === ui.ci, un = G.SAVE.characters_unlocked.includes(ch.key);
      UI.rr(g, x - 38 * s, y - 40 * s, 76 * s, 80 * s, 10 * s, sel ? '#4a3d7a' : '#352a5c');
      if (G.SAVE.character_selected === ch.key) { g.strokeStyle = '#ffd25c'; g.lineWidth = 2 * s; g.beginPath(); g.roundRect(x - 38 * s, y - 40 * s, 76 * s, 80 * s, 10 * s); g.stroke(); }
      const F = A.ratFrames(ch.key), fr = F.idle[Math.floor(t / 6) % 13];
      g.save(); g.translate(x, y + 18 * s); g.scale(s * (sel ? 1.15 : 1), s * (sel ? 1.15 : 1)); g.globalAlpha = a * (un ? 1 : .25); g.drawImage(fr, -28, -45); g.restore(); g.globalAlpha = a;
      if (!un) UI.textOutline(g, x, y - 6 * s, '?', 22 * s, '#ffffff');
      UI.textOutline(g, x, y + 30 * s, un ? T(ch.name) : '???', 9 * s, sel ? '#ffffff' : '#bbb0dd');
      if (sel) { g.fillStyle = '#fff'; g.beginPath(); g.moveTo(x - 5 * s, y - 50 * s); g.lineTo(x + 5 * s, y - 50 * s); g.lineTo(x, y - 44 * s); g.fill(); }
    });
    const ch = G.CHARS[ui.ci], un = G.SAVE.characters_unlocked.includes(ch.key);
    const info = un ? (G.SAVE.character_selected === ch.key ? '재능 트리 보기 · Enter' : '이 쥐로 바꾸기 · Enter') : UI.fmt(T(ch.key + '_unlock'), []);
    info.split('\n').forEach((l, k) => UI.drawRich(g, X0 + Wp / 2, Y0 + 210 * s + k * 14 * s, l, 10 * s, a, 'center', t));
    UI.textOutline(g, X0 + Wp / 2, Y0 + Hp - 36 * s, '← → 고르기 · Esc 닫기', 8 * s, '#bbb0dd', '#1d1630', a);
    UI.textOutline(g, X0 + 40 * s, Y0 + 34 * s, '🧀 ' + G.SAVE.coins, 11 * s, '#ffe14d', '#1d1630', a, 'left');
    g.globalAlpha = 1;
  }

  // ---- 대기실 HUD: 상호작용 안내 + 치즈 --------------------------------------------------------------
  function drawHUD(g, u, Wd, Ht, t, inter, ui) {
    const P = RatsCombat.W.player; if (P) RatsActors.drawPlayerHUD(g, u, Wd, Ht, t, null);
    if (ui) return;
    const it = inter.find(q => q.sel); if (!it) return;
    const label = { rocket: '로켓 타고 출발', computer: '영구 업그레이드', cabin: '캐릭터 · 재능' }[it.id];
    UI.textOutline(g, Wd / 2, Ht - 46 * u, `[E / Space] ${label}`, 10 * u, '#ffffff', '#1d1630', it.lerp);
  }
  function step(ui, I) { if (ui.kind === 'computer') stepComputer(ui, I); else stepCabin(ui, I); }
  function draw(g, ui, s, Wd, Ht, t) { if (ui.kind === 'computer') drawComputer(g, ui, s, Wd, Ht, t); else drawCabin(g, ui, s, Wd, Ht, t); }
  window.RatsLobbyUI = { openComputer, openCabin, step, draw, drawHUD };

  // ---- 일시정지 (o_pause, ui_flow.md §6.3) ----------------------------------------------------------
  const P = { sel: 0 };
  function pauseItems() { return ['resume_button', 'restart_button', 'lobby_button']; }
  window.RatsPause = {
    step(I) {
      const items = pauseItems();
      if (I.card_up) P.sel = (P.sel + items.length - 1) % items.length; if (I.card_down) P.sel = (P.sel + 1) % items.length;
      if (I.back && !I.pause) RatsCombat.W.g.pause = false;
      if (I.enter) { const k = items[P.sel]; RatsCombat.W.g.pause = false; if (k === 'restart_button') RatsMain.goto('game'); else if (k === 'lobby_button') RatsMain.goto('lobby'); P.sel = 0; }
    },
    draw(g, u, Wd, Ht) {
      g.fillStyle = 'rgba(10,6,24,.6)'; g.fillRect(0, 0, Wd, Ht);
      pauseItems().forEach((k, i) => UI.textOutline(g, Wd / 2, Ht / 2 - 20 * u + i * 20 * u, (P.sel === i ? '▶ ' : '') + T(k), 12 * u, P.sel === i ? '#ffffff' : '#aaaaaa', '#000000'));   // o_button 색 #FFFFFF / #AAAAAA
    },
  };
})();
