// WASD 웹판 그림 — 원작 그림체(굵은 갈색 외곽선 · 동글동글 치비 · 밝은 파스텔)를 흉내 내 캔버스로 직접 그림
// 좌표: 월드 1유닛 = s 픽셀, y 는 화면 아래가 +. 각 함수는 (ctx, x, y, s, ...) 로 (x,y) 를 중심에 그림
(function () {
  const TAU = Math.PI * 2;
  const OUT = '#5a3416';                       // 원작 외곽선 색(진한 갈색)
  function ell(c, x, y, rx, ry, fill, stroke, lw) { c.beginPath(); c.ellipse(x, y, Math.abs(rx), Math.abs(ry), 0, 0, TAU); if (fill) { c.fillStyle = fill; c.fill(); } if (stroke) { c.strokeStyle = stroke; c.lineWidth = lw; c.stroke(); } }
  function rr(c, x, y, w, h, r) { c.beginPath(); c.moveTo(x + r, y); c.arcTo(x + w, y, x + w, y + h, r); c.arcTo(x + w, y + h, x, y + h, r); c.arcTo(x, y + h, x, y, r); c.arcTo(x, y, x + w, y, r); c.closePath(); }
  function hex(h, k) { // 밝기 조절
    const n = parseInt(h.slice(1), 16); let r = n >> 16, g = (n >> 8) & 255, b = n & 255;
    if (k > 0) { r += (255 - r) * k; g += (255 - g) * k; b += (255 - b) * k; } else { r *= 1 + k; g *= 1 + k; b *= 1 + k; }
    return '#' + [r, g, b].map(v => Math.max(0, Math.min(255, Math.round(v))).toString(16).padStart(2, '0')).join('');
  }
  function mix(a, b, t) { const A = parseInt(a.slice(1), 16), B = parseInt(b.slice(1), 16); const f = s => Math.round(((A >> s) & 255) * (1 - t) + ((B >> s) & 255) * t); return '#' + [16, 8, 0].map(s => f(s).toString(16).padStart(2, '0')).join(''); }

  // ── 주인공: 빨간 망토 두른 다람쥐 (원작 Tori) ── dir: 'front'|'up'|'left'|'right', ph: 걷기 위상(0..1), moving
  function tori(c, x, y, s, dir, ph, moving) {
    c.save(); c.translate(x, y); c.scale(s / 100, s / 100);
    const flip = dir === 'right'; if (flip) c.scale(-1, 1);
    const side = dir === 'left' || dir === 'right', back = dir === 'up';
    const bob = moving ? Math.abs(Math.sin(ph * TAU)) * -5 : Math.sin(ph * TAU) * 1.5;
    const step = moving ? Math.sin(ph * TAU) : 0;
    const lw = 5.5, O = OUT, F = '#f4a743', FD = '#d98222', CR = '#fff1d8';
    c.lineJoin = 'round'; c.lineCap = 'round';
    // 그림자
    ell(c, 0, 66, 34, 9, 'rgba(0,0,0,.22)');
    c.translate(0, bob);
    // 꼬리 (풍성한 물결 꼬리)
    const tx = side ? 30 : 34, tw = Math.sin(ph * TAU * 2) * (moving ? 4 : 2);
    c.save(); c.translate(back ? 0 : tx, back ? 10 : 18);
    c.beginPath(); c.moveTo(-6, 34); c.bezierCurveTo(30 + tw, 30, 40 + tw, -6, 22 + tw, -30); c.bezierCurveTo(10, -44, -10, -36, -4, -22); c.bezierCurveTo(10, -18, 14, 4, -8, 22); c.closePath();
    c.fillStyle = F; c.fill(); c.strokeStyle = O; c.lineWidth = lw; c.stroke();
    c.beginPath(); c.moveTo(4, 18); c.bezierCurveTo(20 + tw, 10, 24 + tw, -10, 14 + tw, -24); c.strokeStyle = FD; c.lineWidth = 4; c.stroke();
    c.restore();
    // 다리
    const leg = (lx, off) => { rr(c, lx - 8, 40 + off, 16, 20 - off, 7); c.fillStyle = F; c.fill(); c.strokeStyle = O; c.lineWidth = lw; c.stroke(); };
    if (side) { leg(-10, step * 4); leg(8, -step * 4); } else { leg(-14, step * 3); leg(14, -step * 3); }
    // 망토 (뒤)
    c.beginPath();
    if (back) { c.moveTo(-26, 8); c.quadraticCurveTo(0, 2, 26, 8); c.lineTo(32, 52); c.quadraticCurveTo(0, 60, -32, 52); c.closePath(); }
    else if (side) { c.moveTo(4, 6); c.quadraticCurveTo(30, 18, 34 + step * 3, 48); c.lineTo(14, 50); c.closePath(); }
    else { c.moveTo(-22, 8); c.lineTo(-30, 44 + step * 2); c.lineTo(-16, 40); c.closePath(); c.moveTo(22, 8); c.lineTo(30, 44 - step * 2); c.lineTo(16, 40); c.closePath(); }
    c.fillStyle = '#e0392b'; c.fill(); c.strokeStyle = O; c.lineWidth = lw; c.stroke();
    // 몸
    ell(c, 0, 28, side ? 22 : 25, 22, F, O, lw);
    if (!back) ell(c, side ? -6 : 0, 31, side ? 12 : 15, 15, CR);
    // 팔
    const arm = (ax, sw) => { c.beginPath(); c.moveTo(ax, 16); c.quadraticCurveTo(ax + sw * 8, 30, ax + sw * 4, 38); c.strokeStyle = O; c.lineWidth = 13; c.stroke(); c.strokeStyle = F; c.lineWidth = 7; c.stroke(); };
    if (side) arm(-6, -1 - step * .8); else { arm(-22, -1 + step * .3); arm(22, 1 + step * .3); }
    // 스카프 매듭
    if (!back) { c.beginPath(); c.moveTo(-16, 8); c.quadraticCurveTo(0, 16, 16, 8); c.lineTo(10, 14); c.lineTo(4, 22); c.lineTo(-2, 14); c.closePath(); c.fillStyle = '#e0392b'; c.fill(); c.strokeStyle = O; c.lineWidth = 4; c.stroke(); }
    // 머리
    const hx = side ? -4 : 0, hy = -22;
    const ear = (ex, ang) => { c.save(); c.translate(ex, hy - 30); c.rotate(ang); c.beginPath(); c.moveTo(-12, 10); c.quadraticCurveTo(-10, -20, 2, -18); c.quadraticCurveTo(14, -10, 12, 12); c.closePath(); c.fillStyle = F; c.fill(); c.strokeStyle = O; c.lineWidth = lw; c.stroke(); c.beginPath(); c.moveTo(-5, 6); c.quadraticCurveTo(-4, -10, 2, -10); c.quadraticCurveTo(7, -4, 6, 8); c.fillStyle = '#f7c9a0'; c.fill(); c.restore(); };
    if (side) ear(hx + 8, .25); else { ear(hx - 26, -.35); ear(hx + 26, .35); }
    ell(c, hx, hy, side ? 38 : 42, 34, F, O, lw);
    // 머리 줄무늬
    c.strokeStyle = '#b8611a'; c.lineWidth = 5;
    for (const k of side ? [-6, 6] : [-10, 0, 10]) { c.beginPath(); c.moveTo(hx + k, hy - 32); c.lineTo(hx + k * 1.15, hy - 18); c.stroke(); }
    if (!back) {
      // 볼·입가 크림색
      c.beginPath(); c.ellipse(hx + (side ? -10 : 0), hy + 14, side ? 22 : 30, 16, 0, 0, TAU); c.fillStyle = CR; c.fill();
      // 눈 (살짝 째려보는 콩눈)
      const eye = ex => { c.save(); c.translate(ex, hy + 2); ell(c, 0, 0, 6.5, 8, '#2a1a10'); ell(c, -2, -3, 2.2, 2.6, '#fff'); c.beginPath(); c.moveTo(-9, -12); c.lineTo(8, -7); c.strokeStyle = O; c.lineWidth = 4; c.stroke(); c.restore(); };
      if (side) eye(hx - 20); else { eye(hx - 15); c.save(); c.scale(-1, 1); eye(-(hx + 15)); c.restore(); }
      ell(c, hx + (side ? -32 : 0), hy + 10, 4, 3, '#3a2214');
      c.beginPath(); c.moveTo(hx + (side ? -30 : -4), hy + 16); c.quadraticCurveTo(hx + (side ? -28 : 0), hy + 19, hx + (side ? -24 : 4), hy + 16); c.strokeStyle = O; c.lineWidth = 3; c.stroke();
      ell(c, hx + (side ? -6 : -26), hy + 12, 6, 4, 'rgba(255,120,110,.45)'); if (!side) ell(c, hx + 26, hy + 12, 6, 4, 'rgba(255,120,110,.45)');
    }
    c.restore();
  }

  // ── 적: 프로펠러 모자 흰 고양이 (원작 Nyang) — 오른쪽을 보려면 flip
  function nyang(c, x, y, s, t, flip) {
    c.save(); c.translate(x, y + Math.sin(t * 6) * s * .05); c.scale(s / 100, s / 100); if (flip) c.scale(-1, 1);
    const O = '#6a5a5a', lw = 5; c.lineJoin = 'round'; c.lineCap = 'round';
    ell(c, 0, 78, 30, 8, 'rgba(0,0,0,.18)');
    // 꼬리
    c.beginPath(); c.moveTo(18, 40); c.bezierCurveTo(48, 50, 50, 20, 36 + Math.sin(t * 5) * 6, 6); c.strokeStyle = O; c.lineWidth = 15; c.stroke(); c.strokeStyle = '#fff'; c.lineWidth = 8; c.stroke();
    // 몸 (떠 있는 물방울 모양)
    c.beginPath(); c.moveTo(-30, 10); c.bezierCurveTo(-40, 50, -20, 66, 0, 66); c.bezierCurveTo(22, 66, 36, 50, 28, 10); c.closePath(); c.fillStyle = '#fff'; c.fill(); c.strokeStyle = O; c.lineWidth = lw; c.stroke();
    ell(c, -2, 40, 15, 16, '#ffc6d0');
    // 앞발
    ell(c, -22, 30, 8, 7, '#fff', O, 4); ell(c, 16, 32, 8, 7, '#fff', O, 4);
    // 머리
    c.beginPath(); c.moveTo(-40, -6); c.lineTo(-34, -46); c.lineTo(-16, -30); c.quadraticCurveTo(0, -34, 16, -30); c.lineTo(32, -46); c.lineTo(38, -6); c.quadraticCurveTo(40, 22, 0, 22); c.quadraticCurveTo(-42, 22, -40, -6); c.closePath();
    c.fillStyle = '#fff'; c.fill(); c.strokeStyle = O; c.lineWidth = lw; c.stroke();
    c.beginPath(); c.moveTo(-31, -38); c.lineTo(-22, -30); c.lineTo(-30, -26); c.closePath(); c.moveTo(29, -38); c.lineTo(20, -30); c.lineTo(28, -26); c.closePath(); c.fillStyle = '#ffc6d0'; c.fill();
    // 눈 >.< 와 입
    c.strokeStyle = '#3a2a2a'; c.lineWidth = 4.5;
    c.beginPath(); c.moveTo(-24, -10); c.lineTo(-14, -4); c.lineTo(-24, 2); c.moveTo(20, -10); c.lineTo(10, -4); c.lineTo(20, 2); c.stroke();
    c.beginPath(); c.moveTo(-6, 6); c.quadraticCurveTo(-2, 10, 0, 6); c.quadraticCurveTo(2, 10, 6, 6); c.lineWidth = 3; c.stroke();
    c.lineWidth = 2; c.beginPath(); for (const k of [-1, 1]) { c.moveTo(k * 30, 2); c.lineTo(k * 50, -2); c.moveTo(k * 30, 7); c.lineTo(k * 50, 9); } c.stroke();
    // 프로펠러 모자
    ell(c, 0, -38, 16, 9, '#f2b33a', O, 4); c.fillStyle = '#e86a3a'; c.fillRect(-3, -54, 6, 12);
    const a = t * 30, bw = Math.abs(Math.cos(a)) * 34 + 6;
    c.save(); c.translate(0, -56); ell(c, 0, 0, bw, 5, 'rgba(150,170,190,.85)', O, 3); ell(c, 0, 0, 5, 4, '#f2b33a', O, 2); c.restore();
    c.restore();
  }

  // ── 적: 초록 회오리 바람 (원작 Kamehameha = screwwind) — 기본은 왼쪽으로 날아감
  function wind(c, x, y, s, t, flip) {
    c.save(); c.translate(x, y); c.scale(s / 100, s / 100); if (flip) c.scale(-1, 1);
    const g = c.createLinearGradient(-60, 0, 110, 0); g.addColorStop(0, 'rgba(150,255,220,.95)'); g.addColorStop(.55, 'rgba(90,230,180,.55)'); g.addColorStop(1, 'rgba(90,230,180,0)');
    c.beginPath(); c.moveTo(-40, -36); c.bezierCurveTo(30, -50, 80, -20, 120, -6 + Math.sin(t * 9) * 4); c.bezierCurveTo(80, 10, 30, 44, -40, 36); c.closePath(); c.fillStyle = g; c.fill();
    ell(c, -30, 0, 40, 38, 'rgba(170,255,225,.9)');
    c.save(); c.translate(-30, 0); c.rotate(-t * 8);
    for (let i = 0; i < 3; i++) { c.rotate(TAU / 3); c.beginPath(); c.arc(0, 0, 26 - i * 3, 0, 2.2); c.strokeStyle = i ? 'rgba(60,200,160,.8)' : 'rgba(255,255,255,.95)'; c.lineWidth = 6; c.stroke(); }
    ell(c, 0, 0, 9, 9, '#fff'); c.restore();
    c.beginPath(); c.moveTo(-10, -48); c.bezierCurveTo(40, -66, 90, -30, 104, -36); c.moveTo(-6, 46); c.bezierCurveTo(40, 60, 80, 30, 96, 36);
    c.strokeStyle = 'rgba(230,255,248,.85)'; c.lineWidth = 6; c.stroke();
    c.restore();
  }

  // ── 하늘색 전기 구슬 (원작 EnergyBall)
  function ball(c, x, y, s, t) {
    c.save(); c.translate(x, y); const r = s * .5;
    const g = c.createRadialGradient(0, 0, r * .1, 0, 0, r * 1.25); g.addColorStop(0, '#ffffff'); g.addColorStop(.45, '#9ffcff'); g.addColorStop(.8, 'rgba(60,220,255,.75)'); g.addColorStop(1, 'rgba(60,200,255,0)');
    c.fillStyle = g; c.beginPath(); c.arc(0, 0, r * 1.25, 0, TAU); c.fill();
    c.beginPath(); c.arc(0, 0, r * .86, 0, TAU); c.strokeStyle = 'rgba(120,150,255,.9)'; c.lineWidth = Math.max(1, s * .05); c.stroke();
    c.strokeStyle = '#effffe'; c.lineWidth = Math.max(1, s * .04); c.lineJoin = 'round';
    const k = Math.floor(t * 12);
    for (let i = 0; i < 5; i++) {
      const a0 = (i / 5) * TAU + k * .7 + i; c.beginPath();
      let px = Math.cos(a0) * r * .8, py = Math.sin(a0) * r * .8; c.moveTo(px, py);
      for (let j = 1; j < 4; j++) { const a = a0 + j * .28, rad = r * (.8 + ((k * 7 + i * 3 + j) % 3) * .09); c.lineTo(Math.cos(a) * rad, Math.sin(a) * rad); }
      c.stroke();
    }
    c.restore();
  }

  // ── 코인: 다람쥐 얼굴이 새겨진 금화
  function coin(c, x, y, s, t) {
    c.save(); c.translate(x, y + Math.sin(t * 3) * s * .05); const r = s * .5, sq = .82 + .18 * Math.abs(Math.cos(t * 1.6));
    c.scale(sq, 1);
    ell(c, 0, 0, r, r, '#c96a10'); ell(c, 0, -r * .04, r * .92, r * .92, '#f8b21c'); ell(c, 0, 0, r * .74, r * .74, '#f08f12');
    c.beginPath(); c.moveTo(-r * .55, -r * .55); c.lineTo(-r * .2, -r * .7); c.lineTo(r * .5, r * .2); c.lineTo(r * .3, r * .6); c.closePath(); c.fillStyle = 'rgba(255,240,150,.35)'; c.fill();
    // 다람쥐 얼굴
    c.fillStyle = '#fff07a'; c.strokeStyle = '#b5560c'; c.lineWidth = r * .07;
    c.beginPath(); c.arc(-r * .3, -r * .32, r * .17, 0, TAU); c.arc(r * .3, -r * .32, r * .17, 0, TAU); c.fill(); c.stroke();
    ell(c, 0, r * .05, r * .44, r * .34, '#fff07a', '#b5560c', r * .07);
    ell(c, -r * .15, 0, r * .045, r * .06, '#b5560c'); ell(c, r * .15, 0, r * .045, r * .06, '#b5560c');
    c.beginPath(); c.moveTo(-r * .1, -r * .22); c.lineTo(-r * .1, -r * .12); c.moveTo(0, -r * .25); c.lineTo(0, -r * .14); c.moveTo(r * .1, -r * .22); c.lineTo(r * .1, -r * .12); c.stroke();
    c.restore();
  }

  // ── 죽을 때 회색 연기 펑 (원작 Die 0.667초)
  function poof(c, x, y, s, k) {
    c.save(); c.translate(x, y); const a = 1 - Math.max(0, k - .6) / .4;
    c.globalAlpha = Math.max(0, a);
    for (let i = 0; i < 6; i++) { const ang = i / 6 * TAU + .4, d = s * (.15 + k * .45), r = s * (.32 - k * .12); ell(c, Math.cos(ang) * d, Math.sin(ang) * d * .8, r, r * .9, '#dcdcd6', '#9a9a92', Math.max(1, s * .04)); }
    ell(c, 0, 0, s * (.38 - k * .1), s * (.33 - k * .1), '#eeeeea');
    c.restore();
  }

  // ── 키캡 (HUD · 안내판) W 노랑 · A 분홍 · S 하늘 · D 연두 (원작 키 아이콘 색)
  const KEYCOL = { W: '#ffd76a', A: '#ff8a9a', S: '#7fe0ea', D: '#c4ea8e' };
  function keycap(c, x, y, s, k) {
    c.save(); c.translate(x, y);
    rr(c, -s * .5, -s * .5, s, s, s * .2); c.fillStyle = hex(KEYCOL[k] || '#ddd', -.35); c.fill();
    rr(c, -s * .5, -s * .56, s, s * .92, s * .2); c.fillStyle = KEYCOL[k] || '#ddd'; c.fill(); c.strokeStyle = OUT; c.lineWidth = Math.max(1.5, s * .07); c.stroke();
    c.fillStyle = OUT; c.font = `bold ${s * .62}px Jua, sans-serif`; c.textAlign = 'center'; c.textBaseline = 'middle'; c.fillText(k, 0, -s * .08);
    c.restore();
  }
  function arrow(c, x, y, s, back) { // 원작 '돌아가기' 화살표
    c.save(); c.translate(x, y); if (back) c.scale(-1, 1);
    c.beginPath(); c.moveTo(-s * .5, 0); c.lineTo(-s * .1, -s * .34); c.lineTo(-s * .1, -s * .14); c.quadraticCurveTo(s * .4, -s * .2, s * .5, s * .2); c.quadraticCurveTo(s * .3, s * .02, -s * .1, s * .12); c.lineTo(-s * .1, s * .32); c.closePath();
    c.fillStyle = '#fff1dc'; c.fill(); c.strokeStyle = '#f0a020'; c.lineWidth = s * .08; c.stroke(); c.restore();
  }
  function storm(c, x, y, s) { // 모래폭풍 경고 표지
    c.save(); c.translate(x, y);
    c.beginPath(); c.moveTo(0, -s * .5); c.lineTo(s * .52, s * .42); c.lineTo(-s * .52, s * .42); c.closePath(); c.fillStyle = '#f4b23a'; c.fill(); c.strokeStyle = '#a0461a'; c.lineWidth = s * .08; c.lineJoin = 'round'; c.stroke();
    c.strokeStyle = '#8a3a12'; c.lineWidth = s * .06; c.lineCap = 'round';
    for (let i = 0; i < 3; i++) { c.beginPath(); c.moveTo(-s * .22, -s * .02 + i * s * .13); c.quadraticCurveTo(s * .05, -s * .1 + i * s * .13, s * .22 - i * s * .04, -s * .0 + i * s * .13); c.stroke(); }
    c.restore();
  }

  // ════════ 배경 소품 (원작 타일맵 deco_* 의 스프라이트 이름별) ════════
  // (x,y)=스프라이트 상자 왼쪽 위(px), w,h=상자 크기(px), info={c,lo,hi}=원작 스프라이트 평균색
  function seed(n) { let h = 2166136261; for (let i = 0; i < n.length; i++) h = Math.imul(h ^ n.charCodeAt(i), 16777619); return h >>> 0; }
  function rnd(st) { st.v = (Math.imul(st.v ^ (st.v >>> 15), 2246822507) + 0x9e3779b9) >>> 0; return st.v / 4294967296; }
  function tree(c, cx, by, w, h, col, dark, kind) {
    const O = hex(dark, -.45);
    rr(c, cx - w * .07, by - h * .32, w * .14, h * .32, w * .04); c.fillStyle = '#7a4a24'; c.fill(); c.strokeStyle = O; c.lineWidth = Math.max(1, w * .03); c.stroke();
    if (kind === 'pine') {
      for (let i = 0; i < 3; i++) { const yy = by - h * (.25 + i * .22), ww = w * (.5 - i * .12); c.beginPath(); c.moveTo(cx - ww, yy); c.lineTo(cx, yy - h * .36); c.lineTo(cx + ww, yy); c.closePath(); c.fillStyle = i % 2 ? hex(col, .1) : col; c.fill(); c.strokeStyle = O; c.stroke(); }
    } else if (kind === 'dry') {
      c.strokeStyle = '#5a4428'; c.lineWidth = Math.max(1.5, w * .06); c.lineCap = 'round';
      c.beginPath(); c.moveTo(cx, by - h * .3); c.lineTo(cx, by - h * .8); c.moveTo(cx, by - h * .55); c.lineTo(cx - w * .3, by - h * .8); c.moveTo(cx, by - h * .62); c.lineTo(cx + w * .28, by - h * .9); c.stroke();
    } else if (kind === 'palm') {
      c.strokeStyle = '#9a6a2a'; c.lineWidth = Math.max(2, w * .09); c.beginPath(); c.moveTo(cx, by); c.quadraticCurveTo(cx + w * .15, by - h * .5, cx + w * .05, by - h * .82); c.stroke();
      for (let i = 0; i < 6; i++) { const a = -Math.PI / 2 + (i - 2.5) * .55; c.beginPath(); c.moveTo(cx + w * .05, by - h * .82); c.quadraticCurveTo(cx + w * .05 + Math.cos(a) * w * .35, by - h * .82 + Math.sin(a) * h * .25 - h * .08, cx + w * .05 + Math.cos(a) * w * .5, by - h * .82 + Math.sin(a) * h * .2 + h * .1); c.strokeStyle = i % 2 ? '#3f8a2a' : '#5aa83a'; c.lineWidth = Math.max(2, w * .1); c.stroke(); }
    } else {
      const blobs = [[0, -.62, .42], [-.24, -.48, .3], [.25, -.5, .3], [0, -.85, .3]];
      for (const [dx, dy, r] of blobs) ell(c, cx + dx * w, by + dy * h, r * w, r * h * .75, col, O, Math.max(1, w * .03));
      ell(c, cx - w * .1, by - h * .72, w * .14, h * .08, hex(col, .25));
    }
  }
  function rock(c, cx, by, w, h, col) {
    c.beginPath(); c.moveTo(cx - w * .48, by); c.lineTo(cx - w * .36, by - h * .62); c.lineTo(cx - w * .05, by - h * .95); c.lineTo(cx + w * .3, by - h * .7); c.lineTo(cx + w * .48, by); c.closePath();
    c.fillStyle = col; c.fill(); c.strokeStyle = hex(col, -.5); c.lineWidth = Math.max(1, w * .04); c.stroke();
    c.beginPath(); c.moveTo(cx - w * .05, by - h * .95); c.lineTo(cx + w * .02, by - h * .3); c.lineTo(cx + w * .48, by); c.lineTo(cx + w * .3, by - h * .7); c.closePath(); c.fillStyle = hex(col, -.18); c.fill();
  }
  function patch(c, x, y, w, h, col, st) { // 밝은 풀밭 얼룩 (brightgrass)
    c.beginPath();
    const n = 9; for (let i = 0; i <= n; i++) { const a = i / n * TAU, rx = w * (.32 + rnd(st) * .18), ry = h * (.3 + rnd(st) * .2); const px = x + w / 2 + Math.cos(a) * rx, py = y + h / 2 + Math.sin(a) * ry; i ? c.lineTo(px, py) : c.moveTo(px, py); }
    c.closePath(); c.fillStyle = col; c.globalAlpha *= .9; c.fill(); c.globalAlpha /= .9;
  }
  function deco(c, name, x, y, w, h, info, flip) {
    const n = name.toLowerCase(), cx = x + w / 2, by = y + h, col = info.c, st = { v: seed(name + (x | 0) + ',' + (y | 0)) };
    c.save(); if (flip) { c.translate(cx * 2, 0); c.scale(-1, 1); }
    c.lineJoin = 'round'; c.lineCap = 'round';
    const shadow = (k = .3) => ell(c, cx, by - h * .04, w * .42, h * .1, `rgba(0,0,0,${k})`);
    if (n.startsWith('forest')) { // 숲 가장자리 나무 덤불 벽
      const base = Math.max(6, Math.min(w, h) * .14), cnt = Math.min(60, Math.ceil(w * h / (base * base * 2.4)));
      for (let i = 0; i < cnt; i++) { const px = x + base + rnd(st) * (w - base * 2), py = y + base + rnd(st) * (h - base * 2), r = base * (.75 + rnd(st) * .6); ell(c, px, py + r * .35, r, r * .45, 'rgba(0,0,0,.18)'); ell(c, px, py, r, r * .85, i % 3 ? info.lo : col, hex(info.lo, -.5), Math.max(1, r * .08)); ell(c, px - r * .3, py - r * .35, r * .35, r * .22, hex(col, .18)); }
    }
    else if (n.includes('pasture_tree') || n === 'tree') { shadow(); tree(c, cx, by, w, h, col, info.lo, n.endsWith('3') ? 'pine' : 'round'); }
    else if (n.startsWith('drytree')) { shadow(.2); tree(c, cx, by, w, h, col, info.lo, 'dry'); }
    else if (n.startsWith('oasistree') || n.includes('palm')) { shadow(.2); tree(c, cx, by, w, h, col, info.lo, 'palm'); }
    else if (n.startsWith('rock') || n.startsWith('stone') || n.startsWith('sandstone') || n.startsWith('hill')) {
      if (n.startsWith('hill')) { c.beginPath(); c.moveTo(x, by); c.quadraticCurveTo(x + w * .35, y, x + w * .6, y + h * .35); c.quadraticCurveTo(x + w * .85, y + h * .2, x + w, by); c.closePath(); c.fillStyle = hex(col, .1); c.fill(); c.beginPath(); c.moveTo(x + w * .35, y + h * .25); c.quadraticCurveTo(x + w * .5, by, x + w * .2, by); c.strokeStyle = hex(col, -.15); c.lineWidth = Math.max(1, w * .03); c.stroke(); }
      else { shadow(.25); rock(c, cx, by, w * .95, h * .95, col); }
    }
    else if (n.startsWith('brightgrass')) patch(c, x, y, w, h, col, st);
    else if (n.startsWith('grass') || n.startsWith('driedgrass') || n.startsWith('bush') || n.startsWith('flower') || n.startsWith('mushroom') || n.startsWith('kindling')) {
      if (n.startsWith('bush')) { ell(c, cx - w * .2, by - h * .45, w * .3, h * .42, col, info.lo, 1); ell(c, cx + w * .18, by - h * .4, w * .3, h * .38, col, info.lo, 1); }
      else if (n.startsWith('flower')) { for (let i = 0; i < 3; i++) { const px = x + w * (.2 + i * .3), py = y + h * (.3 + (i % 2) * .3); ell(c, px, py, w * .12, w * .12, i % 2 ? '#ffd2e0' : '#fff6b0', info.lo, 1); } }
      else if (n.startsWith('mushroom')) { rr(c, cx - w * .1, by - h * .5, w * .2, h * .5, 2); c.fillStyle = '#f3e6c8'; c.fill(); ell(c, cx, by - h * .55, w * .45, h * .3, col, hex(col, -.5), 1); }
      else { c.strokeStyle = col; c.lineWidth = Math.max(1.2, w * .1); for (let i = 0; i < 5; i++) { const px = x + w * (.15 + i * .17); c.beginPath(); c.moveTo(px, by); c.lineTo(px + (i - 2) * w * .06, y + h * (.1 + (i % 2) * .25)); c.stroke(); } }
    }
    else if (n.startsWith('pond') || n === 'oasis') {
      const ox = n === 'oasis' ? w * .1 : 0;
      ell(c, cx - ox, by - h * .42, w * .44, h * .38, '#f0d090'); ell(c, cx - ox, by - h * .42, w * .38, h * .3, '#55b8c8'); ell(c, cx - ox - w * .1, by - h * .5, w * .12, h * .05, 'rgba(255,255,255,.5)');
      if (n === 'oasis') { tree(c, x + w * .85, by - h * .2, w * .22, h * .7, '#5aa83a', '#3a6a20', 'palm'); tree(c, x + w * .12, by - h * .55, w * .18, h * .5, '#5aa83a', '#3a6a20', 'palm'); }
    }
    else if (n === 'log' || n === 'stump') { rr(c, x + w * .05, by - h * .55, w * .9, h * .45, h * .2); c.fillStyle = '#8a5a30'; c.fill(); c.strokeStyle = '#4a2a12'; c.lineWidth = Math.max(1, h * .06); c.stroke(); ell(c, x + w * .88, by - h * .33, h * .16, h * .2, '#d8a868', '#4a2a12', 1); }
    else if (n === 'tent') { c.beginPath(); c.moveTo(x + w * .05, by); c.lineTo(cx, y + h * .05); c.lineTo(x + w * .95, by); c.closePath(); c.fillStyle = col; c.fill(); c.strokeStyle = hex(col, -.5); c.lineWidth = Math.max(1, w * .03); c.stroke(); c.beginPath(); c.moveTo(cx, y + h * .3); c.lineTo(cx - w * .12, by); c.lineTo(cx + w * .12, by); c.closePath(); c.fillStyle = '#3a2a1a'; c.fill(); }
    else if (n.startsWith('signpost')) { c.fillStyle = '#7a5a30'; c.fillRect(cx - w * .05, y + h * .2, w * .1, h * .8); rr(c, x + w * .1, y + h * .1, w * .8, h * .3, 2); c.fill(); c.strokeStyle = '#3a2410'; c.lineWidth = 1; c.stroke(); }
    else if (n === 'boat' || n === 'oakbarrel' || n === 'wheel' || n === 'carriage' || n === 'glassbottle') {
      if (n === 'boat') { c.beginPath(); c.moveTo(x, y + h * .45); c.quadraticCurveTo(cx, by + h * .1, x + w, y + h * .45); c.closePath(); c.fillStyle = '#8a5a2a'; c.fill(); c.strokeStyle = '#3a2410'; c.lineWidth = Math.max(1, w * .03); c.stroke(); ell(c, cx, by - h * .1, w * .5, h * .12, 'rgba(140,220,230,.5)'); }
      else if (n === 'oakbarrel') { ell(c, cx, by - h * .45, w * .42, h * .38, '#9a6a3a', '#3a2410', 1.5); c.strokeStyle = '#4a4a4a'; c.lineWidth = Math.max(1, w * .03); c.beginPath(); c.moveTo(cx - w * .25, by - h * .78); c.lineTo(cx - w * .25, by - h * .12); c.moveTo(cx + w * .25, by - h * .78); c.lineTo(cx + w * .25, by - h * .12); c.stroke(); }
      else if (n === 'wheel') { ell(c, cx, by - h * .5, w * .4, h * .45, null, '#5a4428', Math.max(2, w * .06)); c.beginPath(); for (let i = 0; i < 4; i++) { const a = i * Math.PI / 4; c.moveTo(cx + Math.cos(a) * w * .4, by - h * .5 + Math.sin(a) * h * .45); c.lineTo(cx - Math.cos(a) * w * .4, by - h * .5 - Math.sin(a) * h * .45); } c.stroke(); }
      else if (n === 'carriage') { rr(c, x + w * .08, y + h * .2, w * .84, h * .5, 4); c.fillStyle = '#9a6a3a'; c.fill(); c.strokeStyle = '#3a2410'; c.lineWidth = 1.5; c.stroke(); c.beginPath(); c.moveTo(x + w * .1, y + h * .25); c.quadraticCurveTo(cx, y - h * .1, x + w * .9, y + h * .25); c.fillStyle = '#f0e0c0'; c.fill(); c.stroke(); ell(c, x + w * .28, by - h * .15, w * .12, w * .12, '#5a4428'); ell(c, x + w * .72, by - h * .15, w * .12, w * .12, '#5a4428'); }
      else { rr(c, cx - w * .25, y + h * .2, w * .5, h * .7, 3); c.fillStyle = 'rgba(90,190,200,.75)'; c.fill(); }
    }
    else if (n.startsWith('island')) { ell(c, cx, by - h * .35, w * .48, h * .3, '#f2dea0', '#c8a860', 1.5); ell(c, cx, by - h * .42, w * .3, h * .18, '#6ab04a'); rock(c, cx - w * .1, by - h * .45, w * .2, h * .35, '#7a8a8a'); }
    else if (n === 'shark') { c.beginPath(); c.moveTo(x + w * .2, by - h * .2); c.lineTo(x + w * .55, y + h * .1); c.quadraticCurveTo(x + w * .65, by - h * .5, x + w * .8, by - h * .2); c.closePath(); c.fillStyle = '#4a7aa8'; c.fill(); c.strokeStyle = '#1e3a5a'; c.lineWidth = 1.5; c.stroke(); ell(c, cx, by - h * .18, w * .45, h * .1, 'rgba(255,255,255,.55)'); }
    else if (n.startsWith('octopus')) { for (let i = 0; i < 2; i++) { c.beginPath(); const px = x + w * (.3 + i * .4); c.moveTo(px, by); c.bezierCurveTo(px - w * .3, by - h * .4, px + w * .3, y + h * .4, px - w * .05, y + h * .05); c.strokeStyle = '#a06a6a'; c.lineWidth = Math.max(3, w * .16); c.stroke(); } ell(c, cx, by - h * .05, w * .45, h * .08, 'rgba(255,255,255,.5)'); }
    else if (n === 'groupfish') { for (let i = 0; i < 9; i++) { const px = x + rnd(st) * w, py = y + rnd(st) * h; c.beginPath(); c.moveTo(px, py); c.lineTo(px + w * .08, py - h * .04); c.lineTo(px + w * .08, py + h * .04); c.closePath(); c.fillStyle = '#2a7a98'; c.fill(); } }
    else if (n === 'catstatue' || n === 'mine' || n === 'watertank' || n === 'weathercock') {
      if (n === 'catstatue') { rock(c, cx, by, w * .9, h * .9, '#6a8a8a'); ell(c, cx, by - h * .6, w * .22, h * .2, '#9ab0a8', '#3a4a4a', 1.5); c.beginPath(); c.moveTo(cx - w * .18, by - h * .72); c.lineTo(cx - w * .14, by - h * .9); c.lineTo(cx - w * .04, by - h * .78); c.moveTo(cx + w * .18, by - h * .72); c.lineTo(cx + w * .14, by - h * .9); c.lineTo(cx + w * .04, by - h * .78); c.fillStyle = '#9ab0a8'; c.fill(); ell(c, cx + w * .25, by - h * .35, w * .12, h * .12, 'rgba(120,220,240,.7)'); }
      else if (n === 'mine') { rock(c, cx, by, w * .9, h * .85, '#8a6a42'); rr(c, cx - w * .14, by - h * .45, w * .28, h * .4, 4); c.fillStyle = '#2a1a0c'; c.fill(); c.strokeStyle = '#6a4424'; c.lineWidth = 2; c.stroke(); }
      else { c.strokeStyle = '#6a4a28'; c.lineWidth = Math.max(1.5, w * .04); c.beginPath(); c.moveTo(cx - w * .3, by); c.lineTo(cx - w * .08, y + h * .3); c.moveTo(cx + w * .3, by); c.lineTo(cx + w * .08, y + h * .3); for (let i = 1; i < 4; i++) { const yy = by - (by - y - h * .3) * i / 4; c.moveTo(cx - w * .3 + w * .22 * i / 4, yy); c.lineTo(cx + w * .3 - w * .22 * i / 4, yy); } c.stroke(); if (n === 'watertank') { rr(c, cx - w * .28, y + h * .08, w * .56, h * .26, 4); c.fillStyle = '#8a6a42'; c.fill(); } else { ell(c, cx, y + h * .22, w * .26, h * .12, null, '#6a4a28', 2); } }
    }
    else if (n.startsWith('bone')) { c.strokeStyle = '#efe2c0'; c.lineWidth = Math.max(2, h * .15); c.beginPath(); c.moveTo(x + w * .15, by - h * .4); c.lineTo(x + w * .85, by - h * .55); c.stroke(); ell(c, x + w * .15, by - h * .4, h * .14, h * .14, '#efe2c0'); ell(c, x + w * .85, by - h * .55, h * .14, h * .14, '#efe2c0'); }
    else if (n.startsWith('cactus')) { c.strokeStyle = hex(col, -.35); c.lineWidth = Math.max(3, w * .26); c.beginPath(); c.moveTo(cx, by); c.lineTo(cx, y + h * .1); c.moveTo(cx, by - h * .45); c.lineTo(cx - w * .3, by - h * .5); c.lineTo(cx - w * .3, y + h * .3); c.stroke(); c.strokeStyle = '#7ab04a'; c.lineWidth = Math.max(2, w * .18); c.stroke(); }
    else if (n.startsWith('ground_')) { ell(c, cx, by - h * .5, w * .45, h * .4, hex(col, -.05)); }
    else { // 작은 1칸 타일 소품 (ground elements, 자산 …) — 평균색 무늬 칸
      if (info.cov > .7) { c.fillStyle = col; c.fillRect(x, y, w, h); c.fillStyle = hex(col, -.12); c.fillRect(x, y + h * .5, w, h * .5); c.strokeStyle = hex(col, -.35); c.lineWidth = 1; c.strokeRect(x + .5, y + .5, w - 1, h - 1); }
      else { ell(c, cx, by - h * .45, w * .32 * Math.sqrt(info.cov + .2), h * .28 * Math.sqrt(info.cov + .2), col, hex(col, -.4), 1); }
    }
    c.restore();
  }
  // 빛 (원작 ForestLight 빛줄기 · OceanLight/DesertLight 은은한 빛)
  function light(c, kind, w, h, t) {
    if (kind.startsWith('light_source')) {
      for (let i = 0; i < 6; i++) {
        const x0 = -w * .5 + w * (i / 6 + .05), ww = w * (.04 + (i % 3) * .025), a = .1 + .06 * Math.sin(t * .7 + i);
        const g = c.createLinearGradient(0, -h / 2, 0, h / 2); g.addColorStop(0, `rgba(255,255,240,${a})`); g.addColorStop(1, 'rgba(255,255,240,0)');
        c.beginPath(); c.moveTo(x0, -h / 2); c.lineTo(x0 + ww, -h / 2); c.lineTo(x0 + ww + w * .3, h / 2); c.lineTo(x0 + w * .3, h / 2); c.closePath(); c.fillStyle = g; c.fill();
      }
    } else {
      const g = c.createRadialGradient(0, 0, 0, 0, 0, Math.max(w, h) / 2); g.addColorStop(0, 'rgba(255,255,235,.35)'); g.addColorStop(1, 'rgba(255,255,235,0)');
      c.fillStyle = g; c.fillRect(-w / 2, -h / 2, w, h);
    }
  }
  window.WArt = { tori, nyang, wind, ball, coin, poof, keycap, arrow, storm, deco, light, hex, mix, rr, ell, KEYCOL };
})();
