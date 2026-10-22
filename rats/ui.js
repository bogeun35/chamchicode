// 로켓 쥐 — GUI 그리기. 좌표·크기는 원작 o_level_setup_Draw_74/64 등(notes/ui_flow.md §2)을 따른다.
// u = ui_scale(정수). 글꼴은 원작 픽셀 폰트 대신 'Jua'(한글) 를 같은 크기 비율로 씀.
(function () {
  'use strict';
  const { dcos, dsin, lerp } = GM;
  // text_mode_get_color (gml_Script_text_mode_get_color, BGR → RGB 변환)
  const TAG = { red: '#d12831', orange: '#f4680b', yellow: '#ffec00', green: '#1be857', blue: '#465be7', purple: '#5e1c5a', pink: '#f45d92',
    stats: '#9eafff', stats_hp: '#ff4d56', stats_tp: '#4dfff1', stats_dm: '#ffa04d', stats_cc: '#ffe04d', stats_cd: '#f9ff4d', stats_fr: '#b8ff4d',
    stats_rt: '#6fff6a', stats_am: '#4dff87', stats_hl: '#56edff', stats_ms: '#4dbfff', stats_sn: '#ff694d', stats_ss: '#89ffe4', stats_sr: '#658fff',
    stats_pp: '#ff89eb', stats_ps: '#4dbfff', stats_kb: '#f26cff', stats_in: '#ff75d2', stats_dc: '#8f7dff', stats_df: '#8900bf', stats_uo: '#ff4d8d',
    money: '#e9ff00', enemy: '#ff3737', poison: '#57c52b', debuff: '#334af0', curse: '#ab0000', stun: '#6500c6', lightning: '#7df2cf', star: '#f45d92', arrow: '#ffaf23' };
  const FONT = '"Jua", "Apple SD Gothic Neo", "Malgun Gothic", sans-serif';
  const T = k => (window.RATS_LANG && RATS_LANG[k] != null) ? RATS_LANG[k] : k;
  function fmt(s, args) { return String(s).replace(/\{(\d+)\}/g, (m, n) => args && args[n] != null ? args[n] : m); }
  // "[stats_dm]발사체 피해[]" → 조각 [{text, color}] (draw_text_mod)
  function parseRich(str) {
    const out = []; let col = null, i = 0, buf = '';
    while (i < str.length) {
      if (str[i] === '[') { const j = str.indexOf(']', i); if (j > i) { if (buf) out.push({ text: buf, color: col }); buf = ''; const tag = str.slice(i + 1, j); col = tag === '' ? null : (tag === 'rainbow' ? 'rainbow' : (TAG[tag] || null)); i = j + 1; continue; } }
      buf += str[i++];
    }
    if (buf) out.push({ text: buf, color: col });
    return out;
  }
  function setFont(g, px) { g.font = `${Math.round(px)}px ${FONT}`; }
  // 외곽선 글자 (draw_text_outline): 진한 외곽선 + 본문
  function textOutline(g, x, y, str, px, color = '#fff', outline = '#1d1630', alpha = 1, align = 'center', base = 'middle') {
    setFont(g, px); g.textAlign = align; g.textBaseline = base; g.globalAlpha = alpha;
    g.lineJoin = 'round'; g.lineWidth = Math.max(2, px / 5); g.strokeStyle = outline; g.strokeText(str, x, y);
    g.fillStyle = color; g.fillText(str, x, y); g.globalAlpha = 1;
  }
  function richWidth(g, parts, px) { setFont(g, px); return parts.reduce((w, p) => w + g.measureText(p.text).width, 0); }
  function drawRich(g, x, y, str, px, alpha = 1, align = 'left', time = 0) {
    const parts = parseRich(str), w = richWidth(g, parts, px); let cx = align === 'center' ? x - w / 2 : x;
    setFont(g, px); g.textAlign = 'left'; g.textBaseline = 'middle'; g.globalAlpha = alpha; g.lineJoin = 'round'; g.lineWidth = Math.max(2, px / 5);
    for (const p of parts) {
      if (p.color === 'rainbow') { for (let k = 0; k < p.text.length; k++) { const ch = p.text[k]; g.strokeStyle = '#1d1630'; g.strokeText(ch, cx, y); g.fillStyle = `hsl(${(time * 4 + k * 28) % 360},90%,65%)`; g.fillText(ch, cx, y); cx += g.measureText(ch).width; } continue; }
      g.strokeStyle = '#1d1630'; g.strokeText(p.text, cx, y); g.fillStyle = p.color || '#ffffff'; g.fillText(p.text, cx, y); cx += g.measureText(p.text).width;
    }
    g.globalAlpha = 1; return w;
  }
  // 9-slice 비슷한 둥근 상자 (s_upgrade_description_bg 대신 그리기)
  function panel(g, x, y, w, h, alpha = .9) { g.globalAlpha = alpha; g.fillStyle = '#211a35'; g.beginPath(); g.roundRect(x, y, w, h, 6); g.fill(); g.strokeStyle = '#f2e6ff'; g.lineWidth = 2; g.stroke(); g.globalAlpha = 1; }
  function spriteImg(name) { return window.RatsArt && RatsArt.ui ? RatsArt.ui(name) : null; }

  // ---- 웨이브 진행 막대 + 숫자 (Draw_74 L423–615) ----------------------------------------------------
  function drawWaveBar(g, L, u, W, H) {
    const gx = Math.floor((W / 2) / u) * u, gy = Math.floor((H - 32 * u + 32 * u * (1 - L.lerp_ui)) / u) * u;   // L7–14
    const x = gx, y = gy + 3 * u, a = L.lerp_ui;                                                               // L423–426, L421
    const p = Math.round(L.wave_progress * 200) / 200, goal = Math.round(L.wave_progress_goal * 200) / 200;  // L430–431
    g.save(); g.translate(x, y); g.scale(u, u); g.globalAlpha = a;
    rr(g, -100, -6, 200, 13, 5, '#2b2140');                                     // s_wave_progress_bg (200 폭)
    rr(g, -98, -4, 196, 9, 4, '#4a3d63');                                       // s_wave_progress_bk (196 안쪽)
    if (goal > 0) rr(g, -(196 * goal) / 2, -4, 196 * goal, 9, 4, '#ffffff');     // 목표(흰색)
    if (p > 0) rr(g, -(196 * p) / 2, -4, 196 * p, 9, 4, '#eace44');              // 가운데서 양쪽으로 자람
    if (p > .01) { const gr = g.createRadialGradient(0, 0, 0, 0, 0, 18); gr.addColorStop(0, 'rgba(234,206,68,1)'); gr.addColorStop(1, 'rgba(234,206,68,0)'); g.globalCompositeOperation = 'lighter'; g.globalAlpha = (.2 + .15 * p) * a * .6; g.fillStyle = gr; g.fillRect(-18, -18, 36, 36); g.globalCompositeOperation = 'source-over'; }   // L610–615 (s_wave_progress_shine: 가운데가 밝고 가장자리로 사라지는 빛)
    g.globalAlpha = a; g.restore();
    const wv = L.waves[L.wave_index];
    if (wv) {
      g.save(); g.translate(x, y); g.scale(u * L.wave_progress_number_xscl, u * L.wave_progress_number_yscl);
      textOutline(g, 0, 0, `${Math.min(wv.coins_taken, wv.coins_needed)}/${wv.coins_needed}`, 9, L.wave_progress_number_delay_white > 0 ? '#ffffff' : '#fff8d8', '#1d1630', a);
      g.restore();
    }
  }
  function rr(g, x, y, w, h, r, c) { g.fillStyle = c; g.beginPath(); g.roundRect(x, y, Math.max(0, w), h, Math.min(r, w / 2, h / 2)); g.fill(); }

  // ---- "웨이브 01" 제목 (Draw_74 L622–748) -----------------------------------------------------------
  function drawTitle(g, L, u, W, H, t) {
    const y = 24 * u + 4 * u * (1 - L.title_lerp) - 48 * u * Math.max(L.characters_unlocked_lerp || 0, L.lerp_end_game);   // L627
    const n = L.wave_index + 1, lim = L.wave_number_limit;
    const txt = L.wave_index < lim ? `${T('wave')} ${String(n).padStart(2, '0')}` : `${T('wave')} ${String(lim).padStart(2, '0')}+${String(L.wave_index - lim + 1).padStart(2, '0')}`;   // L635–653
    g.save(); g.translate(W / 2, y); g.scale(u * L.title_xscl * L.title_spring_xscl, u * L.title_yscl * L.title_spring_yscl);
    setFont(g, 18); const w = g.measureText(txt).width; let cx = -w / 2;
    for (let i = 0; i < txt.length; i++) {
      const ch = txt[i], cw = g.measureText(ch).width, yy = L.title_letters_shake_len * dcos(L.title_letters_shake_time + 90 * i);   // L675–691
      const hue = ((L.title_letters_shake_time / 8 + 20 * i) % 255) / 255 * 360;
      const out = L.title_letters_rainbow > .01 ? `hsl(${hue},86%,${Math.round(40 * L.title_letters_rainbow)}%)` : '#1d1630';
      textOutline(g, cx + cw / 2, yy, ch, 18, L.title_delay_white > 0 ? '#ffffff' : '#ffffff', out, L.title_lerp, 'center');
      cx += cw - .5;
    }
    g.restore();
  }

  // ---- 어둡게 + 비네트 (L24–38) -------------------------------------------------------------------
  function drawDarken(g, L, W, H) {
    const a = Math.max(.45 * L.lerp_cards, .7 * L.lerp_end_game);
    if (a <= .005) return;
    g.fillStyle = `rgba(22,3,0,${.7 * a})`; g.fillRect(0, 0, W, H);                // #000316 alpha 0.7a
    const grd = g.createRadialGradient(W / 2, H / 2, Math.min(W, H) * .3, W / 2, H / 2, Math.max(W, H) * .7);
    grd.addColorStop(0, 'rgba(0,0,0,0)'); grd.addColorStop(1, `rgba(0,0,0,${a})`); g.fillStyle = grd; g.fillRect(0, 0, W, H);
  }

  // ---- 카드 (Draw_74 L41–416, create_cards anon@9194) ----------------------------------------------
  const CARD = { s_upgrade_card_01: ['#7a4a2e', '#b06a3a'], s_upgrade_card_02: ['#5d6b85', '#8fa0bd'], s_upgrade_card_03: ['#7a6a25', '#c8ae3c'], s_upgrade_card_04: ['#4b2e7a', '#8a5ac8'],
    s_upgrade_card_rare_leveled: ['#c69a10', '#ffe14d'], s_upgrade_card_rare_regular: ['#2d6fd6', '#7ec0ff'], s_upgrade_card_rare_combined: ['#4a4a55', '#c9c9d6'],
    s_upgrade_card_rare_cursed: ['#5a0f1d', '#d8344f'], s_upgrade_card_rare_weapon: ['#1e7a56', '#5be3a8'], s_upgrade_card_roll: ['#2b2b3a', '#ffffff'] };
  function drawCardFace(g, c, t) {   // 80×80 카드 면(원점 가운데). 카드 그림·아이콘은 직접 그린 것
    RatsArt.icon(g, c.upgrade, c.upgrade.icon_xoffset || 0, (c.upgrade.icon_yoffset || 0) + 4);   // 카드 가운데에 아이콘 (Draw_74 L104–190)
    const rom = c.upgrade.is_roll ? '' : RatsUpgrades.roman(RatsUpgrades.level(c.upgrade));
    if (rom && RatsUpgrades.level(c.upgrade) <= 7) textOutline(g, 0, -20, rom, 9, '#fff', '#1d1630');
  }
  function drawCards(g, L, u, W, H, t) {
    const cards = L.cards; if (!cards.length) return;
    const cx = W / 2, cy = 132 * u, sep = -28, surfw = 80, surfh = 80, n = cards.length ? cards[0].hand_length : 0;   // L41–47
    const total = (n * surfw + (n - 1) * sep) * u;                                                                 // L65
    for (const c of cards) {
      let x = cx - total / 2 + surfw * u / 2 + (surfw + sep) * u * c.id, y = cy;                                  // L87–88
      x += dcos(1.2 * c.angle + 90) * 6 * u; y += dsin(c.angle + 90) * -52 * u;                                   // L90–96
      const ang = c.angle / 8 + c.twitch_angle + dcos(c.time) * 2 + (c.angle_offset || 0);                        // L78
      const wob = GM.angular_offset(0, dcos(c.time) * 2 * u, ang); x += wob[0]; y += wob[1];                      // L93–99
      const sx = W / 2 + W * .25 * dcos(c.angle + 90), sy = H + 160 * u;                                           // L84–85
      const k = c.lerp_in, X = lerp(sx, x, k), Y = lerp(sy, y, k) - 5 * u * c.lerp_selected;                      // L101–102, L68
      const scl = lerp(3 * u, u, k);                                                                                // L80–82
      c.screen = { x: X, y: Y, w: surfw * u * .5 * .75, h: surfh * u * .5 * .9 };                                 // L218–230 마우스 판정
      if (c.alpha <= 0) continue;
      g.save(); g.globalAlpha = c.alpha; g.translate(X, Y + 3 * u); g.rotate(-ang * Math.PI / 180); g.scale(scl * c.xscl * c.spring_xscl, scl * c.yscl * c.spring_yscl);
      g.globalAlpha = c.alpha * .45; rr(g, -26 - dcos(c.time), -34, 52, 66, 7, '#000'); g.restore();                // 그림자
      g.save(); g.globalAlpha = c.alpha; g.translate(X, Y); g.rotate(-ang * Math.PI / 180); g.scale(scl * c.xscl * c.spring_xscl, scl * c.yscl * c.spring_yscl);
      if (c.is_selected) { g.strokeStyle = '#ffffff'; g.lineWidth = 2.5; g.beginPath(); g.roundRect(-27, -35, 54, 68, 8); g.stroke(); }
      drawCardFace(g, c, t);
      if (c.delay_white > 0) { g.globalAlpha = c.alpha * (c.delay_white / c.timer_white); rr(g, -26, -34, 52, 66, 7, '#fff'); }
      g.restore();
      if (c.is_selected && c.lerp_in > .9) {   // s_card_ui_selector (위쪽 화살표)
        g.save(); g.translate(X, Y - 46 * u - .5 * dcos(c.time) * u); g.scale(u, u); g.fillStyle = '#fff'; g.beginPath(); g.moveTo(-5, -4); g.lineTo(5, -4); g.lineTo(0, 3); g.closePath(); g.fill(); g.restore();
      }
    }
  }
  // ---- 설명 패널 (Draw_64 L140–316) ---------------------------------------------------------------
  function drawDescription(g, D, u, t) {
    if (!D.upgrade || D.lerp < .01) return;
    const up = D.upgrade, title = `${T(RatsUpgrades.nameKey(up))} ${up.is_roll ? '' : (RatsUpgrades.level(up) > 0 && RatsUpgrades.level(up) <= 7 ? RatsUpgrades.roman(RatsUpgrades.level(up)) : '')}`.trim();
    const desc = fmt(T(RatsUpgrades.descKey(up)), RatsUpgrades.specials(up)).split('\n');
    const px = 9 * u, lh = px + 2 * u;
    const g2 = g; setFont(g2, px);
    const lines = [{ s: `[rainbow]${title}[]`, title: true }].concat(desc.map(s => ({ s })));
    const width = Math.max(...lines.map(l => richWidth(g2, parseRich(l.s), px)));
    const h = lines.length * lh, x = D.x, y = D.y + 6 * u * (1 - D.lerp);
    panel(g2, x - (width + 20 * u) * D.xscl / 2, y - 8 * u, (width + 20 * u) * D.xscl, (h + 16 * u) * D.yscl, .9 * D.lerp);
    lines.forEach((l, i) => drawRich(g2, x, y + i * lh + lh / 2, l.s, px, D.lerp, 'center', t));
  }
  // ---- 결과 화면 (Draw_64 L10–136) ----------------------------------------------------------------
  function drawEndScreen(g, L, u, W, H, t) {
    if (!L.show_end_results && L.lerp_end_game < .01) return;
    const cx = W / 2; let ty = H / 2 - (H / 2 - 64 * u) * L.lerp_results;                                       // L15
    const half = (16 + 8 * (1 - L.lerp_end_game)) * u;
    g.fillStyle = `rgba(0,0,0,${L.lerp_end_game * .6})`; g.fillRect(cx - (W / 2) * L.lerp_end_game, ty - half, W * L.lerp_end_game, half * 2);   // L17–26
    const title = T(L.final_result_text_index);
    g.save(); g.translate(cx, ty); g.scale(u * L.final_result_xscl, u * L.final_result_yscl);
    setFont(g, 26); const w = g.measureText(title).width; let x = -w / 2;
    for (let i = 0; i < title.length; i++) {
      const ch = title[i], cw = g.measureText(ch).width, yy = L.final_result_len * dcos(L.final_result_time + 90 * i);
      const hue = ((L.final_result_time / 8 + 10 * i) % 255) / 255 * 360;
      textOutline(g, x + cw / 2, yy, ch, 26, '#ffffff', L.final_result_rainbow > .01 ? `hsl(${hue},86%,${Math.round(42 * L.final_result_rainbow)}%)` : '#1d1630');
      x += cw - .5;
    }
    g.restore();
    if (!L.show_end_results) return;
    ty += 40 * u;                                                                                                // L79
    L.results.forEach((r, i) => {
      if (r.hidden) return;
      if (i > 0 && !L.results[i - 1].name.includes('time') && false) ty += 0;
      if (!r.name.includes('time') && !L._gapDone) { ty += 16 * u; }
      g.save(); g.translate(cx, ty); g.scale(u * r.xscl, u * r.yscl);
      const col = r.is_record ? '#1be857' : '#ffffff';
      textOutline(g, -120, 0, T(r.name), 11, col, '#1d1630', r.lerp_in, 'left');
      textOutline(g, 120, 0, r.text, 11, col, '#1d1630', r.lerp_in, 'right');
      if (r.is_record && r.lerp_in > .5) textOutline(g, 0, -9, T('new_record'), 7, '#1be857', '#1d1630', r.lerp_in);
      g.restore();
      ty += 16 * u * (1 + (i === 1 ? 1 : 0));                                                                    // L81
    });
    if (L.press_restart_delay <= 0 && Math.floor(Math.abs(L.press_restart_delay) / 30) % 3 <= 1) textOutline(g, cx, L.game_ui_y - 70 * u, T('restart_run'), 10 * u);   // L132–136
  }

  window.RatsUI = { TAG, T, fmt, parseRich, setFont, textOutline, drawRich, richWidth, panel, rr, drawWaveBar, drawTitle, drawDarken, drawCards, drawDescription, drawEndScreen, FONT };
})();
