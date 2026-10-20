// ════════════ 그리기: 광산 · 기지 (원작 화면: 바위는 검게, 파낸 동굴 안은 지역 색, 경계에 밝은 이끼선) ════════════
'use strict';
const H01 = RBNoise.hash01;
// ── 지형 청크 (32×32칸 = 512px 캔버스, 바뀐 칸만 다시 그림) ──
function chunkCanvas(cx, cy) {
  const key = cx + ',' + cy; let c = R.chunkCache.get(key);
  if (!c || R.dirty.has(key)) { if (!c) { c = A.mk(512, 512)[0]; R.chunkCache.set(key, c); } drawChunk(c, cx, cy); R.dirty.delete(key); }
  return c;
}
function drawChunk(c, cx, cy) {
  const x = c.getContext('2d'), P = A.PAL[R.layer], cfg = RBWorld.LAYER_GEN[R.layer];
  x.clearRect(0, 0, 512, 512);
  const px = (col, a, b, w, h) => { x.fillStyle = col; x.fillRect(a, b, w, h); };
  for (let ty = 0; ty < 32; ty++) for (let tx = 0; tx < 32; tx++) {
    const wx = cx * 32 + tx, wy = cy * 32 + ty, t = tileAt(wx, wy); if (!t || t === 99) continue;
    const X = tx * 16, Y = ty * 16, up = !tileAt(wx, wy - 1), dn = !tileAt(wx, wy + 1), lf = !tileAt(wx - 1, wy), rt = !tileAt(wx + 1, wy), h = H01(wx, wy);
    if (t === 1 || t === 8) {
      px(P.rock, X, Y, 16, 16);
      if (up || dn || lf || rt) { for (let k = 0; k < 6; k++) { const hh = H01(wx * 7 + k, wy * 3 - k); px('rgba(255,255,255,.035)', X + (hh * 14 | 0), Y + (H01(wx + k, wy * 5) * 14 | 0), 2, 2); } }
      if (up) { px(P.edge2, X, Y, 16, 3); px(P.edge, X, Y, 16, 1); for (let k = 0; k < 16; k += 2) if (H01(wx * 16 + k, wy) < .5) px(P.edge, X + k, Y - 1, 1, 1); }
      if (dn) { px(P.edge2, X, Y + 13, 16, 3); px(P.edge, X, Y + 15, 16, 1); }
      if (lf) { px(P.edge2, X, Y, 3, 16); px(P.edge, X, Y, 1, 16); }
      if (rt) { px(P.edge2, X + 13, Y, 3, 16); px(P.edge, X + 15, Y, 1, 16); }
      if (up && h < cfg.grass) { for (let k = 0; k < 4; k++) { const gx = X + 2 + (H01(wx + k * 3, wy * 2) * 12 | 0), gh = 2 + (H01(wx * 3, wy + k) * 4 | 0); px(P.grass, gx, Y - gh, 1, gh); } if (H01(wx, wy * 9) < cfg.flower * 3) { px(P.flower, X + 7, Y - 5, 2, 2); px(P.vine, X + 8, Y - 3, 1, 3); } }
      if (dn && h < cfg.hang) { const len = (cfg.hangH[0] + (H01(wx * 5, wy) * (cfg.hangH[1] - cfg.hangH[0]) | 0)) * 8; for (let k = 0; k < len && Y + 16 + k < 512; k++) if (!tileAt(wx, wy + 1 + (k >> 4))) px(P.vine, X + 6 + (Math.sin(k * .3) * 1.5 | 0), Y + 16 + k, 2, 1); else break; }
      const o = R.w.OR[tid(wx, wy)]; if (o) x.drawImage(A.oreSprite(o === 2 ? 0 : R.layer, (h * 4) | 0), X, Y);
      if (t === 8) x.drawImage(A.chunkSprite(R.layer), X, Y);
    } else if (t === 3) {   // 구름
      px('#b9c5de', X, Y, 16, 16); if (h < .3) px('#c9d4ea', X + (h * 30 | 0) % 10, Y + 5, 7, 5);
      if (up) { px('#eef4ff', X, Y, 16, 3); for (let k = 0; k < 16; k += 4) if (H01(wx * 4 + k, wy) < .5) px('#eef4ff', X + k, Y - 1, 3, 1); }
      if (dn) px('#8e9aba', X, Y + 13, 16, 3); if (lf) px('#d8e2f4', X, Y, 2, 16); if (rt) px('#9ca8c6', X + 14, Y, 2, 16);
    } else if (t === 5) {   // 버섯 갓
      px('#b04a8a', X, Y, 16, 16); px('#e070b0', X, Y, 16, 12); if (up) px('#ff9ad0', X, Y, 16, 3); if (h < .35) { px('#fff0f8', X + 4, Y + 4, 3, 3); } if (h > .7) px('#fff0f8', X + 10, Y + 7, 2, 2);
    } else if (t === 6) {   // 버섯 줄기
      px('#cdbf9a', X, Y, 16, 16); px('#e8dcc0', X + 3, Y, 10, 16); px('#b0a27e', X + 2, Y, 1, 16);
    } else if (t === 9) {   // 구조물 벽돌
      px('#3a322c', X, Y, 16, 16); const off = (wy & 1) * 4; px('#6a5e52', X, Y, 16, 7); px('#6a5e52', X, Y + 8, 16, 7); px('#3a322c', X + off + 6, Y, 1, 7); px('#3a322c', X + ((off + 10) % 16), Y + 8, 1, 7); px('#8a7c6c', X, Y, 16, 1); px('#8a7c6c', X, Y + 8, 16, 1);
      if (up) { px(P.edge2, X, Y, 16, 2); px(P.edge, X, Y, 16, 1); }
    } else if (t === 10) {   // 최종층 기반암
      px('#140f1e', X, Y, 16, 16); px('#241a34', X + (h * 8 | 0), Y + 3, 8, 3); px('#241a34', X + 2, Y + 10, 6, 3); if (up) px('#6a4aa8', X, Y, 16, 2);
    }
  }
}
// ── 금 간 자국 (WorldGenerator._update_csharp_break_visual 5단계) ──
function drawCrack(x, X, Y, f, s) {
  const st = f > .8 ? -1 : f > .6 ? 0 : f > .4 ? 1 : f > .2 ? 2 : f > 0 ? 3 : 4; if (st < 0) return;
  x.fillStyle = 'rgba(0,0,0,.55)'; x.strokeStyle = 'rgba(255,255,255,.55)'; x.lineWidth = Math.max(1, s * .9);
  const lines = [[[8, 8, 3, 2], [8, 8, 13, 5]], [[8, 8, 2, 12], [8, 8, 14, 13]], [[3, 2, 1, 7], [13, 5, 15, 2], [2, 12, 6, 15]], [[14, 13, 10, 15], [8, 8, 8, 1]], [[1, 7, 5, 9], [8, 1, 12, 3], [10, 15, 15, 9]]];
  x.beginPath(); for (let k = 0; k <= st; k++) for (const [a, b, c, d] of lines[k]) { x.moveTo(X + a * s, Y + b * s); x.lineTo(X + c * s, Y + d * s); } x.strokeStyle = 'rgba(10,6,4,.85)'; x.stroke();
}
// ── 광산 그리기 ──
function drawMine() {
  const x = ctx, P = A.PAL[R.layer];
  x.setTransform(DPR, 0, 0, DPR, 0, 0); x.imageSmoothingEnabled = false;
  const sx = R.shake ? rnd(-R.shake, R.shake) : 0, sy = R.shake ? rnd(-R.shake, R.shake) : 0, cxw = camX + sx / Z, cyw = camY + sy / Z;
  // 배경: 지역색 + 깊이에 따라 어두워짐 + 패럴랙스 실루엣 두 겹
  const depth = clamp(R.P.y / TS / 1024, 0, 1), g = x.createLinearGradient(0, 0, 0, VH); g.addColorStop(0, P.bg1); g.addColorStop(1, P.bg0); x.fillStyle = g; x.fillRect(0, 0, VW, VH);
  for (let k = 0; k < 2; k++) { const img = A.background(R.layer, k), s = Z * (k ? 1.6 : 1.2), pw = 640 * s, ph = 360 * s, par = k ? .35 : .15; let ox = (-(cxw * par * Z) % pw + pw) % pw - pw, oy = (-(cyw * par * Z) % ph + ph) % ph - ph; for (let a = ox; a < VW; a += pw) for (let b = oy; b < VH; b += ph) x.drawImage(img, a, b, pw, ph); }
  x.fillStyle = `rgba(0,0,0,${depth * .35})`; x.fillRect(0, 0, VW, VH);
  // 월드 변환
  const toS = (wx, wy) => [(wx - cxw) * Z + VW / 2, (wy - cyw) * Z + VH / 2];
  x.save(); x.translate(VW / 2, VH / 2); x.scale(Z, Z); x.translate(-cxw, -cyw);
  const vx0 = cxw - VW / 2 / Z, vy0 = cyw - VH / 2 / Z, vx1 = cxw + VW / 2 / Z, vy1 = cyw + VH / 2 / Z;
  // 반중력장 · 공기방울 (지형 뒤)
  for (const f of R.fields) { const pu = .5 + .5 * Math.sin(R.t * 1.5 + f.x); x.fillStyle = `rgba(150,190,255,${.08 + .05 * pu})`; x.beginPath(); x.arc(f.x, f.y, f.r, 0, 6.28); x.fill(); x.strokeStyle = `rgba(190,220,255,${.35 + .2 * pu})`; x.lineWidth = 1.2; for (let r = 1; r <= 3; r++) { x.beginPath(); x.arc(f.x, f.y, f.r * (r / 3) * (.9 + .1 * pu), 0, 6.28); x.stroke(); } }
  for (const b of R.bubbles) { if (b.x < vx0 - 40 || b.x > vx1 + 40 || b.y < vy0 - 40 || b.y > vy1 + 40) continue; x.fillStyle = 'rgba(200,255,250,.18)'; x.beginPath(); x.arc(b.x, b.y, b.r + Math.sin(R.t * 2 + b.x) * 2, 0, 6.28); x.fill(); x.strokeStyle = 'rgba(220,255,255,.6)'; x.lineWidth = 1.5; x.stroke(); x.fillStyle = 'rgba(255,255,255,.7)'; x.fillRect(b.x - 10, b.y - 14, 5, 3); }
  // 지형
  const c0 = Math.floor(vx0 / 512) - 0, c1 = Math.floor(vx1 / 512), r0 = Math.floor(vy0 / 512), r1 = Math.floor(vy1 / 512);
  for (let cy = r0; cy <= r1; cy++) for (let cx = c0; cx <= c1; cx++) { if (cx < -8 || cx > 7 || cy < 0 || cy > 31) continue; x.drawImage(chunkCanvas(cx, cy), cx * 512, cy * 512); }
  if (R.chunkCache.size > 60) for (const k of R.chunkCache.keys()) { const [a, b] = k.split(',').map(Number); if (a < c0 - 2 || a > c1 + 2 || b < r0 - 2 || b > r1 + 2) R.chunkCache.delete(k); }
  // 수정 덩어리 빛 · 구조물 등불·상자
  for (const [cx, cy] of R.w.chunks) { const X = cx * TS + 8, Y = cy * TS + 8; if (X < vx0 - 60 || X > vx1 + 60 || Y < vy0 - 60 || Y > vy1 + 60) continue; const gl = x.createRadialGradient(X, Y, 2, X, Y, 26 + Math.sin(R.t * 3) * 4), oc = A.ORE_COL[R.layer][1]; gl.addColorStop(0, oc + 'aa'); gl.addColorStop(1, oc + '00'); x.fillStyle = gl; x.fillRect(X - 32, Y - 32, 64, 64); const hits = R.w.HITS[tid(cx, cy)]; if (hits) { x.strokeStyle = `rgba(255,255,255,${.3 + hits / 25})`; x.lineWidth = 1; for (let k = 0; k < Math.min(4, hits / 4 + 1); k++) { const a = R.t * 2 + k * 1.57; x.beginPath(); x.moveTo(X, Y); x.lineTo(X + Math.cos(a) * (10 + hits), Y + Math.sin(a) * (10 + hits)); x.stroke(); } } }
  for (const s of R.w.structs) { const X = s.cx * TS + 8, Y = s.cy * TS + 16; if (X < vx0 - 80 || X > vx1 + 80 || Y < vy0 - 80 || Y > vy1 + 80 || s.open) continue; const ly = Y - 32; x.fillStyle = '#6a5a3a'; x.fillRect(X - .5, ly - 14, 1, 14); const gl = x.createRadialGradient(X, ly, 1, X, ly + 10, 34); gl.addColorStop(0, 'rgba(255,200,110,.5)'); gl.addColorStop(1, 'rgba(255,200,110,0)'); x.fillStyle = gl; x.fillRect(X - 36, ly - 26, 72, 72); x.fillStyle = '#ffe28a'; x.fillRect(X - 2, ly, 4, 5); A.drawChest(x, X, Y, 0); }
  // 황 분출구
  for (const v of R.vents) { if (v.fx < vx0 - 40 || v.fx > vx1 + 40 || v.fy < vy0 - 200 || v.fy > vy1 + 40) continue; if (!v.broken) { x.fillStyle = '#5a4a2a'; x.fillRect(v.fx - 8, v.fy - 5, 16, 5); x.fillStyle = '#c8b040'; x.fillRect(v.fx - 4, v.fy - 7, 8, 3); for (let k = 0; k < 10; k++) { const p = ((R.t * .5 + k / 10) % 1), yy = v.fy - p * 160; x.fillStyle = `rgba(200,210,90,${.35 * (1 - p)})`; x.beginPath(); x.arc(v.fx + Math.sin(p * 9 + k) * 6, yy, 5 + p * 9, 0, 6.28); x.fill(); } } else if (R.t < v.ballEnd) { x.fillStyle = 'rgba(190,200,80,.3)'; x.beginPath(); x.arc(v.fx, v.fy - 16, 26 + Math.sin(R.t * 3) * 2, 0, 6.28); x.fill(); } }
  // 최종 보스 포털
  if (R.w.boss) drawBoss(x);
  // 승강기
  A.drawLift(x, R.lift.x, R.lift.y + 20, R.t, R.lift.open >= 1);
  // 금 간 자국 · 흰 번쩍임 · 조준 칸
  for (const [i, c] of R.cracks) { const X = c.x * TS, Y = c.y * TS; if (X < vx0 - 16 || X > vx1 || Y < vy0 - 16 || Y > vy1) continue; if (!tileAt(c.x, c.y)) { R.cracks.delete(i); continue; } drawCrack(x, X, Y, c.f, 1); }
  for (const [i, v] of R.flash) { const xx = (i % W_) - OXW, yy = Math.floor(i / W_); x.fillStyle = `rgba(255,255,255,${v / .12 * .55})`; x.fillRect(xx * TS, yy * TS, 16, 16); }
  if (R.target && !R.ending) { const [tx, ty] = R.target; x.strokeStyle = 'rgba(255,255,255,.85)'; x.lineWidth = 1; x.strokeRect(tx * TS + .5, ty * TS + .5, 15, 15); }
  // 바닥 아이템 · 동전
  for (const it of R.drops) { const img = it.kind === 'token' ? A.barSprite(4) : it.kind === 'chunk' ? A.chunkSprite(it.L) : A.oreIcon(it.L), bl = it.settled && it.desp > 7 ? .3 + .7 * Math.abs(Math.sin(it.desp * (8 + (it.desp - 7) * 4))) : 1; x.globalAlpha = bl; if (it.kind !== 'ore') { const gl = x.createRadialGradient(it.x, it.y, 1, it.x, it.y, 12); gl.addColorStop(0, 'rgba(255,220,120,.5)'); gl.addColorStop(1, 'rgba(255,220,120,0)'); x.fillStyle = gl; x.fillRect(it.x - 12, it.y - 12, 24, 24); } x.drawImage(img, it.x - 6, it.y - 6, 12, 12); x.globalAlpha = 1; }
  for (const c of R.coins) { const img = c.ic === 's' ? A.barSprite(1) : A.oreIcon(+c.ic.slice(1)); x.drawImage(img, c.x - 4, c.y - 4, 8, 8); }
  // 드론
  if (R.drone) { const d = R.drone; A.drawDrone(x, d.x, d.y, R.t); if (d.st !== 'start') { const f = d.st === 'charge' ? 1 - d.t / (4 / ST.drone('recharge')) : d.act / (8 * ST.drone('battery')); x.fillStyle = '#222'; x.fillRect(d.x - 7, d.y - 14, 14, 2); x.fillStyle = d.st === 'charge' ? '#73ccff' : `hsl(${f * 120},80%,60%)`; x.fillRect(d.x - 7, d.y - 14, 14 * clamp(f, 0, 1), 2); } }
  // 플레이어
  drawPlayer(x, R.P, R.swing > 0 ? 1 - R.swing / R.swingT : -1, true);
  // 번개 · 펄스 · 공 · 폭발 충전
  for (const a of R.arcs) { const n = a.path.length - 1, reach = Math.min(n, a.t / a.dur * n), al = a.t > a.dur ? 1 - (a.t - a.dur) / .4 : 1; x.strokeStyle = a.evo ? `rgba(255,140,255,${al})` : `rgba(150,220,255,${al})`; x.lineWidth = 2; x.beginPath(); for (let k = 0; k <= reach; k++) { const [px, py] = a.path[k]; const jx = k ? rnd(-3, 3) : 0, jy = k ? rnd(-3, 3) : 0; k ? x.lineTo(px * TS + 8 + jx, py * TS + 8 + jy) : x.moveTo(px * TS + 8, py * TS + 8); } x.stroke(); x.strokeStyle = `rgba(255,255,255,${al})`; x.lineWidth = .8; x.stroke(); }
  for (const w of R.waves) { x.strokeStyle = w.rb ? `hsla(${R.t * 400 % 360},90%,70%,.85)` : 'rgba(255,230,120,.85)'; x.lineWidth = 6; x.beginPath(); x.arc(w.ox, w.oy, w.r, w.a - w.half, w.a + w.half); x.stroke(); x.strokeStyle = 'rgba(255,255,255,.7)'; x.lineWidth = 2; x.stroke(); }
  for (const b of R.balls) { x.fillStyle = 'rgba(120,200,255,.35)'; for (const [tx, ty] of b.tr) x.fillRect(tx - 1.5, ty - 1.5, 3, 3); x.fillStyle = lv('bouncing_ball_evolved') ? '#ff9af0' : '#8fd8ff'; x.beginPath(); x.arc(b.x, b.y, 3, 0, 6.28); x.fill(); x.fillStyle = '#fff'; x.fillRect(b.x - 1, b.y - 2, 1, 1); }
  for (const b of R.booms) { const X = b.x * TS + 8, Y = b.y * TS + 8; if (!b.fired) { const p = Math.min(1, b.t / .6); x.strokeStyle = `rgba(255,170,60,${.4 + .5 * p})`; x.lineWidth = 2; x.beginPath(); x.arc(X, Y, (1 - p) * b.size * 8 + 4, 0, 6.28); x.stroke(); } else { const p = (b.t - .7) / .4; x.fillStyle = `rgba(255,200,90,${.6 * (1 - p)})`; x.beginPath(); x.arc(X, Y, b.size * 8 * (.6 + p * .5), 0, 6.28); x.fill(); } }
  for (const f of R.fx) { x.globalAlpha = 1 - f.t / f.life; x.fillStyle = f.c; x.fillRect(f.x - 1, f.y - 1, 2, 2); } x.globalAlpha = 1;
  // 물 (희미한 물: 수면 아래 전체)
  if (R.water != null && vy1 > R.water) { const top = Math.max(R.water, vy0); x.fillStyle = 'rgba(40,160,180,.22)'; x.fillRect(vx0, top, vx1 - vx0, vy1 - top); if (R.water > vy0) { x.fillStyle = 'rgba(180,255,250,.6)'; for (let k = Math.floor(vx0 / 8) * 8; k < vx1; k += 8) x.fillRect(k, R.water + Math.sin(k * .1 + R.t * 3) * 1.5, 6, 1); } }
  // 피해 숫자 (×10 표시)
  x.textAlign = 'center'; x.textBaseline = 'middle';
  for (const n of R.nums) { const a = 1 - n.t / .7; x.globalAlpha = a; x.font = `${n.crit ? 9 : 7}px Jua, sans-serif`; x.lineWidth = 2; x.strokeStyle = '#000'; const col = n.crit ? '#ffd64c' : n.src === 'light' ? '#8ccfff' : n.src === 'boom' ? '#ff9a40' : n.src === 'laser' || n.src === 'ball' ? '#ffe666' : '#fff'; const yy = n.y - n.t * 22; x.strokeText(n.v, n.x, yy); x.fillStyle = col; x.fillText(n.v, n.x, yy); } x.globalAlpha = 1;
  // 산소 막대 · E 표시
  const p = R.P; if (R.water != null && (p.wet || R.oxy < 20)) { const f = R.oxy / 20; x.fillStyle = '#103038'; x.fillRect(p.x - 12, p.y - 34, 24, 4); x.fillStyle = f < .25 ? '#ff6a5a' : '#7ae6ff'; x.fillRect(p.x - 12, p.y - 34, 24 * f, 4); }
  if (R.near && !R.ending) drawE(x, p.x, p.y - 28);
  x.restore();
  // 화면 어둠 (등불 하나 든 느낌) · 오버클럭 · 비
  const vg = x.createRadialGradient(VW / 2, VH / 2, Math.min(VW, VH) * .3, VW / 2, VH / 2, Math.max(VW, VH) * .75); vg.addColorStop(0, 'rgba(0,0,0,0)'); vg.addColorStop(1, 'rgba(0,0,0,.55)'); x.fillStyle = vg; x.fillRect(0, 0, VW, VH);
  if (R.rain) { x.strokeStyle = 'rgba(170,200,255,.25)'; x.lineWidth = 1; x.beginPath(); for (let k = 0; k < 90; k++) { const rx = (H01(k, 3) * VW + R.t * 120) % VW, ry = (H01(k, 7) * VH + R.t * 700) % VH; x.moveTo(rx, ry); x.lineTo(rx - 3, ry + 12); } x.stroke(); }
  if (OC > 0) { x.strokeStyle = `rgba(90,180,255,${.25 + .15 * Math.sin(R.t * 12)})`; x.lineWidth = 6; x.strokeRect(3, 3, VW - 6, VH - 6); }
  if (R.water != null && R.P.wet && R.oxy / 20 < .25) { const dg = (.25 - R.oxy / 20) / .25; const v2 = x.createRadialGradient(VW / 2, VH / 2, Math.min(VW, VH) * .25, VW / 2, VH / 2, Math.max(VW, VH) * .7); v2.addColorStop(0, 'rgba(0,0,40,0)'); v2.addColorStop(1, `rgba(0,10,60,${.7 * dg})`); x.fillStyle = v2; x.fillRect(0, 0, VW, VH); }
  void toS;
}
function drawE(x, X, Y) { x.fillStyle = 'rgba(20,16,12,.9)'; x.fillRect(X - 6, Y - 6, 12, 12); x.strokeStyle = '#c9a46a'; x.lineWidth = 1; x.strokeRect(X - 5.5, Y - 5.5, 11, 11); x.fillStyle = '#fff'; x.font = '9px Jua, sans-serif'; x.textAlign = 'center'; x.textBaseline = 'middle'; x.fillText(isTouch ? 'E' : 'E', X, Y + .5); }
// ── 플레이어 (20×20 고블린 + 손에 든 곡괭이: swing 0.5초 동안 0 → 90° → 0) ──
function drawPlayer(x, P, sw, mine) {
  for (const a of P.after) { x.globalAlpha = a.t / .22 * .45; x.save(); x.translate(a.x - 1, a.y); x.scale(a.f, 1); x.drawImage(A.orc('run', 1), -10, -10); x.restore(); } x.globalAlpha = 1;
  const pose = P.exhaust ? 'exhaust' : P.wet ? 'swim' : !P.ground ? 'jump' : Math.abs(P.vx) > 10 ? 'run' : 'idle';
  const f = Math.floor(P.anim * 8) % 4;
  x.save(); x.translate(P.x - 1, P.y);
  const sq = P.squash > 0 ? Math.sin(P.squash / .16 * Math.PI) * .05 : 0, ld = P.land > 0 ? P.land / .12 * .08 : 0;
  x.scale(P.face * (1 + sq + ld), 1 - sq - ld);
  if (OC > 0 && mine) { x.shadowColor = '#5ab4ff'; x.shadowBlur = 6; }
  x.drawImage(A.orc(pose, f), -10, -10); x.shadowBlur = 0;
  if (!P.exhaust && (mine || true)) {   // HandPivot / Pickaxe (7,5) offset (6,-6)
    const prog = sw >= 0 ? (sw < .5 ? sw * 2 : (1 - sw) * 2) : 0, rot = prog * Math.PI / 2;
    x.translate(7 - 3, 5); x.rotate(rot - .2); x.drawImage(A.pickaxe(mine ? S.pick : S.pick), -4, -14, 14, 14);
  }
  x.restore();
}
function drawBoss(x) {   // 최종층 바닥의 블랙홀 포털 + 보스 (먹이: 일렉트럼·강화강·프리즘 각 500)
  const bx = R.w.boss.x * TS + 8, by = R.w.boss.y * TS, t = R.t;
  for (let k = 5; k >= 1; k--) { x.fillStyle = `rgba(${80 + k * 20},${40 + k * 10},${160 + k * 15},${.08 * k})`; x.beginPath(); x.arc(bx, by - 40, 30 + k * 12 + Math.sin(t * 2 + k) * 3, 0, 6.28); x.fill(); }
  x.fillStyle = '#05020a'; x.beginPath(); x.arc(bx, by - 40, 26, 0, 6.28); x.fill();
  x.strokeStyle = `rgba(255,200,120,${.6 + .3 * Math.sin(t * 3)})`; x.lineWidth = 2; x.beginPath(); x.arc(bx, by - 40, 28, 0, 6.28); x.stroke();
  if (!S.fl.done) { x.fillStyle = '#3a2a5a'; x.fillRect(bx - 18, by - 22, 36, 22); x.fillStyle = '#ffd36b'; x.fillRect(bx - 10, by - 16, 4, 4); x.fillRect(bx + 6, by - 16, 4, 4); const open = R.near && R.near.k === 'boss' && S.fl.translated ? 6 : 1; x.fillStyle = '#1a0a1a'; x.fillRect(bx - 8, by - 8, 16, open); }
}
// ── 기지 (원작 world_hubtest 배치) ──
const HUBS = [
  { x0: 40, x1: 1120, spawn: 431, lift: 1045, st: [{ k: 'altar', x: 126, n: '토큰 제단' }, { k: 'smelter', x: 337, n: '제련소' }, { k: 'shop', x: 598, n: '상점' }, { k: 'lift', x: 1045, n: '승강기' }], lanterns: [198, 684] },
  { x0: -560, x1: 920, spawn: 102, lift: -32, st: [{ k: 'workshop', x: -480, n: '드론 작업장' }, { k: 'drone', x: -388, n: '드론' }, { k: 'shop', x: -246, n: '상점' }, { k: 'lift', x: -32, n: '승강기' }, { k: 'foundry', x: 230, n: '주조소' }, { k: 'smelter', x: 395, n: '제련소' }, { k: 'anvil', x: 615, n: '리포지 모루' }, { k: 'altar', x: 840, n: '토큰 제단' }], lanterns: [-300, 100, 500, 760] }];
let HUB = null;
function enterHub(base, fromMine) {
  S.base = base; HUB = { def: HUBS[base], P: newBody(HUBS[base].spawn, -9), t: 0, near: null, ui: 0 }; if (fromMine) { HUB.P.x = HUBS[base].lift; HUB.arrive = .8; }
  R = null; scene = 'hub'; ZOOM = 1.5; setZ(); camX = HUB.P.x; camY = HUB.P.y - 32;
  if (base === 1 && !S.fl.base2) { S.fl.base2 = 1; toast('🏚 두 번째 오크 기지에 왔어요 — 리포지 모루 · 주조소 · 드론 작업장이 있어요', 3600); }
  save(); setHud();
}
const hubSolid = (px, py) => py >= 0 || px < HUB.def.x0 || px > HUB.def.x1;
function updateHub(dt) {
  const H = HUB, P = H.P; H.t += dt; tickSmelt(); tickFoundry(dt);
  if (H.arrive > 0) { H.arrive -= dt; } else physics(P, dt, true, hubSolid, { moveMult: 1 });
  if (P.y > 500) { P.x = H.def.spawn; P.y = -9; P.vx = P.vy = 0; }
  H.near = null; let best = 44;
  for (const s of H.def.st) { const d = Math.abs(P.x - s.x); if (d < best) { best = d; H.near = s; } }
  if (H.near && H.near.k === 'drone' && S.fl.drone) H.near = null;
  if (K.actHit && H.near) hubAct(H.near); K.actHit = 0;
  if (M.down && M.has && !overlayOn()) { const [wx] = toWorld(M.x, M.y); const s = H.def.st.find(s => Math.abs(s.x - wx) < 34); if (s && Math.abs(P.x - s.x) < 60) { M.down = 0; hubAct(s); } }
  camX = lerp(camX, clamp(P.x, H.def.x0 + VW / 2 / Z - 40, H.def.x1 - VW / 2 / Z + 40), Math.min(1, dt * 10)); camY = lerp(camY, -70, Math.min(1, dt * 10));
  if (H.def.x1 - H.def.x0 < VW / Z) camX = (H.def.x0 + H.def.x1) / 2;
}
function drawHub() {
  const x = ctx, H = HUB, t = H.t; x.setTransform(DPR, 0, 0, DPR, 0, 0); x.imageSmoothingEnabled = false;
  const g = x.createLinearGradient(0, 0, 0, VH); g.addColorStop(0, '#0e0c0a'); g.addColorStop(.6, '#1a1612'); g.addColorStop(1, '#0a0806'); x.fillStyle = g; x.fillRect(0, 0, VW, VH);
  x.save(); x.translate(VW / 2, VH / 2); x.scale(Z, Z); x.translate(-camX, -camY);
  const d = H.def, wall = H.def.x1 - H.def.x0;
  // 동굴 벽 · 천장 (울퉁불퉁한 바위) + 나무 기둥 · 들보
  x.fillStyle = '#1e1a16'; x.fillRect(d.x0 - 400, -400, wall + 800, 400);
  x.fillStyle = '#2a241e'; x.beginPath(); x.moveTo(d.x0 - 400, -140); for (let k = d.x0 - 400; k <= d.x1 + 400; k += 32) x.lineTo(k, -150 - (H01(k, 1) * 30) - (k < d.x0 || k > d.x1 ? 80 : 0)); x.lineTo(d.x1 + 400, -400); x.lineTo(d.x0 - 400, -400); x.closePath(); x.fill();
  x.fillStyle = '#100d0b'; x.beginPath(); x.moveTo(d.x0 - 400, -400); for (let k = d.x0 - 400; k <= d.x1 + 400; k += 24) x.lineTo(k, -170 - H01(k, 2) * 40); x.lineTo(d.x1 + 400, -400); x.closePath(); x.fill();
  for (let k = d.x0 + 60; k < d.x1; k += 170) { x.fillStyle = '#3e2818'; x.fillRect(k, -150, 8, 150); x.fillStyle = '#5a3a22'; x.fillRect(k + 1, -150, 2, 150); }
  x.fillStyle = '#3e2818'; x.fillRect(d.x0 - 20, -152, wall + 40, 6); x.fillStyle = '#5a3a22'; x.fillRect(d.x0 - 20, -152, wall + 40, 1);
  for (const lx of d.lanterns) A.drawLantern(x, lx, -96, t);
  // 바닥 (돌길)
  const fg = x.createLinearGradient(0, 0, 0, 120); fg.addColorStop(0, '#2a251f'); fg.addColorStop(1, '#070605'); x.fillStyle = fg; x.fillRect(d.x0 - 400, 0, wall + 800, 400); for (let k = d.x0 - 400; k < d.x1 + 400; k += 12) { x.fillStyle = H01(k, 5) < .5 ? '#4a443a' : '#3e382f'; x.fillRect(k, 0, 11, 4); } x.fillStyle = '#5a5246'; x.fillRect(d.x0 - 400, 0, wall + 800, 1);
  x.fillStyle = '#0c0a08'; x.fillRect(d.x0 - 400, -400, 400, 800); x.fillRect(d.x1, -400, 400, 800);
  // 시설
  for (const s of d.st) {
    if (s.k === 'altar') A.drawAltar(x, s.x, 0, t);
    else if (s.k === 'smelter') { A.drawSmelter(x, s.x, 0, t, smeltBusy()); drawSmelterUI(x, s.x, H.near === s); }
    else if (s.k === 'shop') A.drawShop(x, s.x, 0, t);
    else if (s.k === 'lift') A.drawLift(x, s.x, 0, t, true);
    else if (s.k === 'anvil') A.drawAnvil(x, s.x, 0, t);
    else if (s.k === 'foundry') A.drawFoundry(x, s.x, 0, t, Object.keys(S.fnd.jobs).length > 0);
    else if (s.k === 'workshop') A.drawWorkshop(x, s.x, 0, t);
    else if (s.k === 'drone' && !S.fl.drone) { A.drawDrone(x, s.x, -14, t, '#8a96a6'); }
    if (H.near === s && s.k !== 'smelter') { x.fillStyle = '#fff'; x.font = '8px Jua, sans-serif'; x.textAlign = 'center'; x.fillText(s.n, s.x, -84); }
  }
  if (S.fl.drone) A.drawDrone(x, H.P.x - 40 + Math.sin(t * 1.3) * 10, H.P.y - 26 + Math.sin(t * 2) * 3, t);
  drawPlayer(x, H.P, -1, false);
  if (H.near) drawE(x, H.P.x, H.P.y - 28);
  x.restore();
  const vg = x.createRadialGradient(VW / 2, VH / 2, Math.min(VW, VH) * .35, VW / 2, VH / 2, Math.max(VW, VH) * .75); vg.addColorStop(0, 'rgba(0,0,0,0)'); vg.addColorStop(1, 'rgba(0,0,0,.6)'); x.fillStyle = vg; x.fillRect(0, 0, VW, VH);
}
// 제련소 근접 UI: 왼쪽 입력 격자 · 오른쪽 출력 격자 (4행 × 칸수/4 열, 칸 20) + 가운데 원형 진행바
function drawSmelterUI(x, X, on) {
  const H = HUB, now = H.t, dt = Math.min(.1, now - (H.uiT || now)); H.uiT = now; H.ui = clamp(H.ui + (on ? dt / .25 : -dt / .2), 0, 1); if (H.ui <= 0) return;
  const e = H.ui, sc = on ? 1 + 2.70158 * Math.pow(e - 1, 3) + 1.70158 * Math.pow(e - 1, 2) : e, cols = Math.max(2, Math.ceil(ST.smeltSlots() / 4)), per = ST.smeltPer(), Y = -80;
  x.save(); x.translate(X, Y); x.scale(sc, sc);
  const grid = (items, gx) => { const cells = []; for (const L of Object.keys(items)) { let n = items[L]; while (n > 0 && cells.length < cols * 4) { cells.push([+L, Math.min(n, per)]); n -= per; } }
    for (let r = 0; r < 4; r++) for (let c = 0; c < cols; c++) { const k = r * cols + c, cx = gx + c * 22, cy = r * 22 - 40; x.fillStyle = 'rgba(10,8,6,.8)'; x.fillRect(cx, cy, 20, 20); x.strokeStyle = '#8a6a44'; x.lineWidth = 1; x.strokeRect(cx + .5, cy + .5, 19, 19); const it = cells[k]; if (it) { x.drawImage(gx < 0 ? A.oreIcon(it[0]) : A.barSprite(BAR_OF_LAYER[it[0]]), cx + 2, cy + 2, 16, 16); if (it[1] > 1) { x.font = '7px Jua, sans-serif'; x.textAlign = 'right'; x.fillStyle = '#fff'; x.strokeStyle = '#000'; x.lineWidth = 2; x.strokeText(fmt(it[1]), cx + 19, cy + 18); x.fillText(fmt(it[1]), cx + 19, cy + 18); } } } };
  grid(S.smelt.in, -42 - cols * 22); grid(S.smelt.out, 42);
  const cur = smeltCurrent(), prog = cur == null ? 0 : clamp(S.smelt.timer / smeltTime(cur), 0, 1);
  const cy0 = -62; x.fillStyle = '#0b0a09'; x.beginPath(); x.arc(0, cy0, 24, 0, 6.28); x.fill(); x.strokeStyle = '#3a2c18'; x.lineWidth = 6; x.beginPath(); x.arc(0, cy0, 21, 0, 6.28); x.stroke();
  x.strokeStyle = '#f2b852'; x.beginPath(); x.arc(0, cy0, 21, -Math.PI / 2, -Math.PI / 2 + prog * 6.28); x.stroke();
  if (cur != null) x.drawImage(A.oreIcon(cur), -8, cy0 - 8, 16, 16); else { x.fillStyle = '#ff9a3a'; x.font = '12px sans-serif'; x.textAlign = 'center'; x.textBaseline = 'middle'; x.fillText('🔥', 0, cy0); }
  x.restore();
}
