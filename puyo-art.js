/* ══════════════════════════════════════════════════════════════════════════
   puyo-art.js — 뿌요뿌요 그리기 전담 모듈  (window.PUYO_ART)
   ──────────────────────────────────────────────────────────────────────────
   디자인 원칙
     · 완전 평면 2D — 그라데이션 / 광택 / 그림자(shadowBlur) 일절 안 씀
     · 파스텔 + 콩눈(크고 동그란 눈) + 작은 얼굴 + 통통한 몸
     · 밀집된 점 패턴 없음 (장식은 큼직한 도형만)
     · 색 5종은 명도를 계단식으로 벌려 두고, 머리 장식 모양까지 다르게 해서
       색약이어도 구분됨
   성능 원칙
     · 색 문자열 / Path2D 를 size·모양 조합별로 캐시해서 재사용
     · createRadialGradient · shadowBlur 사용 안 함
     · 뿌요 1개 = save/translate + 칠 몇 번 + restore (보통 8~12 ops)

   외부 인터페이스
     PUYO_ART.colors                              색 정의 (1~5, 9)
     PUYO_ART.drawPuyo(ctx, x, y, size, color, o) 뿌요 1개
     PUYO_ART.drawBoardBg(ctx, w, h, tSec, cols)  보드 배경
     PUYO_ART.drawChainBanner(ctx, w, h, n, tSec, t) 연쇄 배너
     PUYO_ART.util.conn(grid, r, c)               grid → conn 객체 (연결용 도우미)
     PUYO_ART.util.face(a, b)                     좌표 → 표정 번호 0~3 (고정)
   ══════════════════════════════════════════════════════════════════════════ */
(function (G) {
  'use strict';

  var TAU = Math.PI * 2;

  function clamp(v, a, b) { return v < a ? a : (v > b ? b : v); }
  function easeOut(u) { return 1 - (1 - u) * (1 - u); }
  function easeOutBack(u) {
    var c = 1.8, p = u - 1;
    return 1 + (c + 1) * p * p * p + c * p * p;
  }

  /* ───────────── 색 ───────────── */

  function hex2rgb(h) {
    h = h.charAt(0) === '#' ? h.slice(1) : h;
    if (h.length === 3) h = h[0] + h[0] + h[1] + h[1] + h[2] + h[2];
    var n = parseInt(h, 16);
    return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
  }
  function rgb2hex(a) {
    var s = '#', i, v;
    for (i = 0; i < 3; i++) {
      v = Math.round(clamp(a[i], 0, 255)).toString(16);
      s += v.length < 2 ? '0' + v : v;
    }
    return s;
  }
  function mix(a, b, k) {
    var A = hex2rgb(a), B = hex2rgb(b);
    return rgb2hex([A[0] + (B[0] - A[0]) * k, A[1] + (B[1] - A[1]) * k, A[2] + (B[2] - A[2]) * k]);
  }

  /* 명도(상대휘도) 계단:  레몬 .79 > 민트 .63 > 코랄 .45 > 하늘 .36 > 라벤더 .24
     → 흑백으로 떨어뜨려도 5종이 전부 다른 밝기로 보인다.
     방해뿌요는 채도 거의 0 + 네모난 실루엣으로 따로 구분. */
  var BASE = {
    1: { nm: '코랄',   fill: '#FF94A8', line: '#C4485F', tuft: 'drop'  },
    2: { nm: '민트',   fill: '#8FE0B4', line: '#2E8C62', tuft: 'leaf'  },
    3: { nm: '하늘',   fill: '#5FA6EC', line: '#1F5C9C', tuft: 'wave'  },
    4: { nm: '레몬',   fill: '#FFE49A', line: '#C2922A', tuft: 'star'  },
    5: { nm: '라벤더', fill: '#9A72D8', line: '#573191', tuft: 'ear'   },
    9: { nm: '방해',   fill: '#D3D9E4', line: '#7E889B', tuft: null    }
  };

  var PAL = {};
  (function () {
    for (var k in BASE) {
      if (!Object.prototype.hasOwnProperty.call(BASE, k)) continue;
      var b = BASE[k];
      PAL[k] = {
        nm: b.nm,
        fill: b.fill,
        line: b.line,
        tuft: b.tuft,
        tint:  mix(b.fill, '#ffffff', 0.45),  // 볼터치 · 파편
        flash: mix(b.fill, '#ffffff', 0.80),  // 터지기 직전 깜빡
        mid:   mix(b.fill, b.line, 0.52),     // 머리 장식
        ring:  mix(b.fill, '#ffffff', 0.30)   // 터질 때 퍼지는 링
      };
    }
  })();

  var EYE = '#42303C';     // 눈동자 · 입 (순검정 대신 부드러운 먹색)
  var WHITE = '#FFFDF8';
  var NO_CONN = { up: false, down: false, left: false, right: false };

  /* ───────────── Path2D 캐시 ───────────── */

  var HAS_P2D = typeof Path2D === 'function';
  var CACHE = new Map();
  function cached(key, make) {
    var v = CACHE.get(key);
    if (v === undefined) {
      if (CACHE.size > 700) CACHE.clear();   // 폭주 방지
      v = make();
      CACHE.set(key, v);
    }
    return v;
  }
  function newPath() { return HAS_P2D ? new Path2D() : null; }
  var Q = function (size) { return (size * 2) | 0; };   // 캐시 키용 size 양자화

  /* 호(arc)를 독립된 서브패스로 — moveTo 없이 arc 를 이어 쓰면
     앞 서브패스에서 선이 끌려와 눈썹·입에 지저분한 줄이 생긴다 */
  function arcSub(p, cx, cy, r, a0, a1) {
    p.moveTo(cx + Math.cos(a0) * r, cy + Math.sin(a0) * r);
    p.arc(cx, cy, r, a0, a1);
  }

  /* 코너별 반지름을 따로 주는 둥근 사각형 */
  function rrect(p, x0, y0, x1, y1, tl, tr, br, bl) {
    var w = x1 - x0, h = y1 - y0, m = Math.min(w, h) / 2;
    if (w <= 0 || h <= 0) return;
    tl = clamp(tl, 0, m); tr = clamp(tr, 0, m); br = clamp(br, 0, m); bl = clamp(bl, 0, m);
    p.moveTo(x0 + tl, y0);
    p.lineTo(x1 - tr, y0); if (tr > 0) p.arcTo(x1, y0, x1, y0 + tr, tr);
    p.lineTo(x1, y1 - br); if (br > 0) p.arcTo(x1, y1, x1 - br, y1, br);
    p.lineTo(x0 + bl, y1); if (bl > 0) p.arcTo(x0, y1, x0, y1 - bl, bl);
    p.lineTo(x0, y0 + tl); if (tl > 0) p.arcTo(x0, y0, x0 + tl, y0, tl);
    p.closePath();
  }

  /* ───────────── 몸통 ─────────────
     · conn 이 있는 쪽은 변을 칸 경계까지 늘리고, 그 쪽 코너만 반지름을 줄여
       이웃과 정확히 맞물리게 한다 → 사각형을 덧대지 않아도 자연스럽게 이어진다
     · 외곽선은 stroke 가 아니라 "조금 큰 어두운 몸통 → 밝은 몸통" 2겹 칠.
       이어진 변에서는 어두운 쪽을 늘리지 않으므로 이음새에 선이 안 생긴다 */
  function makeBody(size, mask, isG, cx, cy, rx, ry) {
    var up = mask & 1, dn = mask & 2, lf = mask & 4, rt = mask & 8;
    var x0 = cx - rx, x1 = cx + rx, y0 = cy - ry, y1 = cy + ry;
    if (lf) x0 = 0;
    if (rt) x1 = size;
    if (up) y0 = 0;
    if (dn) y1 = size;

    var base = Math.min(rx, ry);
    var cr = base * (isG ? 0.34 : 0.62);   // 자유로운 코너 — 통통하게
    var cj = base * 0.24;                  // 이어진 코너 — 살짝 허리가 들어가 개체 구분
    var lw = Math.max(1.0, size * 0.055);  // 외곽선 두께
    var k = lw * 0.85;

    var f = newPath(), d = newPath();
    if (!f) return null;
    rrect(f, x0, y0, x1, y1,
      (up || lf) ? cj : cr, (up || rt) ? cj : cr,
      (dn || rt) ? cj : cr, (dn || lf) ? cj : cr);
    /* 어두운 겹: 자유 변은 lw 만큼 바깥으로, 이어진 코너는 반지름을 더 줄여
       (= 코너쪽으로 더 차오르게) 해서 허리 부분에도 외곽선이 생기게 함 */
    rrect(d,
      lf ? x0 : x0 - lw, up ? y0 : y0 - lw,
      rt ? x1 : x1 + lw, dn ? y1 : y1 + lw,
      (up || lf) ? cj * 0.32 : cr + k, (up || rt) ? cj * 0.32 : cr + k,
      (dn || rt) ? cj * 0.32 : cr + k, (dn || lf) ? cj * 0.32 : cr + k);
    return { f: f, d: d, lw: lw };
  }

  /* ───────────── 머리 장식 (색별 모양 — 색약 보조) ───────────── */
  function makeTuft(size, kind) {
    var p = newPath(); if (!p) return null;
    var c = size / 2, R = size * 0.465, top = c - R, i, a, r;
    if (kind === 'drop') {                       // 코랄 — 물방울 하나
      p.ellipse(c, top - R * 0.16, R * 0.135, R * 0.34, 0, 0, TAU);
    } else if (kind === 'leaf') {                // 민트 — 새싹 두 잎
      p.ellipse(c - R * 0.30, top - R * 0.14, R * 0.10, R * 0.30, -1.05, 0, TAU);
      p.ellipse(c + R * 0.30, top - R * 0.14, R * 0.10, R * 0.30, 1.05, 0, TAU);
    } else if (kind === 'wave') {                // 하늘 — 물결 두 봉우리
      arcSub(p, c - R * 0.26, top + R * 0.04, R * 0.21, Math.PI, TAU);
      p.closePath();
      arcSub(p, c + R * 0.26, top + R * 0.04, R * 0.21, Math.PI, TAU);
      p.closePath();
    } else if (kind === 'star') {                // 레몬 — 네모별
      var sx = c, sy = top - R * 0.22, ro = R * 0.33, ri = R * 0.12;
      for (i = 0; i < 8; i++) {
        a = -Math.PI / 2 + i * Math.PI / 4;
        r = (i % 2) ? ri : ro;
        if (i === 0) p.moveTo(sx + Math.cos(a) * r, sy + Math.sin(a) * r);
        else p.lineTo(sx + Math.cos(a) * r, sy + Math.sin(a) * r);
      }
      p.closePath();
    } else if (kind === 'ear') {                 // 라벤더 — 토끼귀
      p.ellipse(c - R * 0.22, top - R * 0.24, R * 0.095, R * 0.36, -0.20, 0, TAU);
      p.ellipse(c + R * 0.22, top - R * 0.24, R * 0.095, R * 0.36, 0.20, 0, TAU);
    }
    return p;
  }

  /* ───────────── 얼굴 ─────────────
     faceId  0 평범 / 1 웃음 / 2 놀람 / 3 찡그림 / 4 터질 때(X눈) / 5 방해뿌요
     기본 몸통(중심 size/2, 반지름 R) 기준으로 만들고, 눌림·부풀림일 때만
     호출부에서 scale 변환을 걸어 재사용한다. */
  function makeFace(size, faceId) {
    var c = size / 2;
    var R = size * (faceId === 5 ? 0.445 : 0.465);
    var w = newPath(), dk = newPath(), gl = newPath(), st = newPath();
    if (!dk) return null;
    var ex = R * 0.355, ey = c - R * 0.055;
    var wrx = R * 0.255, wry = R * 0.330;
    var px = 0, py = R * 0.05, pk = 0.60, hasW = true, hasGl = size >= 22;
    var slw = Math.max(1.0, size * 0.052);
    var i, s, bx, by;

    if (faceId === 1) {          // 웃음 — 눈 살짝 감기고 입 활짝
      wry *= 0.92; py = -R * 0.03;
    } else if (faceId === 2) {   // 놀람 — 흰자 크고 눈동자 작게
      wrx *= 1.10; wry *= 1.14; pk = 0.46; py = -R * 0.04;
    } else if (faceId === 3) {   // 찡그림 — 눈동자 안쪽 아래
      px = R * 0.07; py = R * 0.10; wry *= 0.94;
    } else if (faceId === 4) {   // 터짐 — X 눈
      hasW = false; hasGl = false;
    } else if (faceId === 5) {   // 방해뿌요 — 작대기 눈
      hasW = false; hasGl = false;
    }

    if (hasW) {
      w.ellipse(c - ex, ey, wrx, wry, 0, 0, TAU);
      w.ellipse(c + ex, ey, wrx, wry, 0, 0, TAU);
      var pr = wrx * pk;
      for (i = 0; i < 2; i++) {
        s = i ? 1 : -1;
        bx = c + s * ex + (s * -1) * px;   // px>0 이면 안쪽으로
        by = ey + py;
        dk.ellipse(bx, by, pr, pr * 1.06, 0, 0, TAU);
        if (hasGl) gl.ellipse(bx - pr * 0.30, by - pr * 0.38, pr * 0.30, pr * 0.26, 0, 0, TAU);
      }
    }

    if (faceId === 4) {                       // X 눈
      var xr = R * 0.19;
      for (i = 0; i < 2; i++) {
        s = i ? 1 : -1;
        bx = c + s * ex;
        st.moveTo(bx - xr, ey - xr); st.lineTo(bx + xr, ey + xr);
        st.moveTo(bx + xr, ey - xr); st.lineTo(bx - xr, ey + xr);
      }
      dk.ellipse(c, c + R * 0.34, R * 0.13, R * 0.17, 0, 0, TAU);   // 벌린 입
    } else if (faceId === 5) {                // 방해뿌요 — 작대기 눈 + 시무룩
      var bw = R * 0.19, bh = R * 0.050;
      for (i = 0; i < 2; i++) {
        s = i ? 1 : -1;
        bx = c + s * R * 0.33;
        rrect(dk, bx - bw, ey - bh, bx + bw, ey + bh, bh, bh, bh, bh);
      }
      arcSub(st, c, c + R * 0.62, R * 0.26, 1.30 * Math.PI, 1.70 * Math.PI);
    } else if (faceId === 0) {                // 평범 — 작은 미소
      arcSub(st, c, c + R * 0.22, R * 0.21, 0.26 * Math.PI, 0.74 * Math.PI);
    } else if (faceId === 1) {                // 웃음 — 입 활짝 (반원 칠)
      dk.moveTo(c - R * 0.235, c + R * 0.215);
      dk.arc(c, c + R * 0.215, R * 0.235, 0, Math.PI);
      dk.closePath();
    } else if (faceId === 2) {                // 놀람 — 동그란 입 + 올라간 눈썹
      dk.ellipse(c, c + R * 0.36, R * 0.115, R * 0.145, 0, 0, TAU);
      for (i = 0; i < 2; i++) {               // 치켜올라간 눈썹
        s = i ? 1 : -1;
        arcSub(st, c + s * ex, ey - wry * 1.34, R * 0.15, 1.12 * Math.PI, 1.88 * Math.PI);
      }
    } else if (faceId === 3) {                // 찡그림 — 삐딱한 눈썹 + 내려간 입
      for (i = 0; i < 2; i++) {
        s = i ? 1 : -1;
        st.moveTo(c + s * (ex + R * 0.21), ey - wry * 1.52);
        st.lineTo(c + s * (ex - R * 0.19), ey - wry * 1.04);
      }
      st.moveTo(c - R * 0.20, c + R * 0.44);
      st.lineTo(c, c + R * 0.33);
      st.lineTo(c + R * 0.20, c + R * 0.44);
    }

    var bl = null;
    if (faceId === 1 || faceId === 2) {       // 볼터치 (큼직한 타원 2개 — 점 패턴 아님)
      bl = newPath();
      bl.ellipse(c - R * 0.60, c + R * 0.20, R * 0.17, R * 0.115, 0, 0, TAU);
      bl.ellipse(c + R * 0.60, c + R * 0.20, R * 0.17, R * 0.115, 0, 0, TAU);
    }
    return { w: hasW ? w : null, dk: dk, gl: hasGl ? gl : null, st: st, slw: slw, bl: bl };
  }

  function connMask(c) {
    if (!c) return 0;
    return (c.up ? 1 : 0) | (c.down ? 2 : 0) | (c.left ? 4 : 0) | (c.right ? 8 : 0);
  }

  /* ───────────── 터질 때 파편 ───────────── */
  function drawBurst(ctx, size, P, u, baseAlpha) {
    var half = size / 2, i, a, d, pxx, pyy, pr;
    ctx.globalAlpha = baseAlpha * (1 - u) * 0.85;
    ctx.strokeStyle = P.ring;
    ctx.lineWidth = Math.max(1, size * 0.085 * (1 - u));
    ctx.beginPath();
    ctx.arc(half, half, (0.30 + 0.52 * u) * size, 0, TAU);
    ctx.stroke();
    for (i = 0; i < 5; i++) {
      a = -1.25 + i * 1.2566;
      d = (0.26 + 0.52 * u) * size;
      pxx = half + Math.cos(a) * d;
      pyy = half + Math.sin(a) * d;
      pr = size * 0.105 * (1 - u * 0.8);
      ctx.fillStyle = (i % 2) ? P.tint : P.fill;
      ctx.beginPath();
      ctx.arc(pxx, pyy, pr, 0, TAU);
      ctx.fill();
    }
  }

  /* ═══════════════════════ 뿌요 1개 ═══════════════════════ */
  function drawPuyo(ctx, x, y, size, color, o) {
    o = o || {};
    var P = PAL[color];
    if (!P || !(size > 0)) return;

    var isG = (+color === 9);
    var st = o.state || 'normal';
    var t = clamp(typeof o.t === 'number' ? o.t : 0, 0, 1);
    var half = size / 2;
    var R = size * (isG ? 0.445 : 0.465);

    var grow = 1, sq = 1, alpha = 1, bodyCol = P.fill, popU = -1, faceId;
    var normFace = isG ? 5 : ((o.face | 0) & 3);

    if (st === 'pop') {
      if (t < 0.26) {                                  // ① 깜빡
        grow = 1 + t * 0.20;
        if ((Math.floor(t * 24) & 1) === 0) bodyCol = P.flash;
        faceId = normFace;
      } else if (t < 0.58) {                           // ② 부풀어
        grow = 1.05 + 0.36 * easeOut((t - 0.26) / 0.32);
        faceId = 4;
      } else {                                         // ③ 터져 사라짐
        popU = (t - 0.58) / 0.42;
        grow = 1.41 - 1.02 * popU;
        alpha = 1 - popU;
        faceId = 4;
      }
    } else {
      faceId = normFace;
      if (typeof o.squash === 'number' && o.squash > 0) {
        sq = clamp(o.squash, 0.5, 1.5);
      } else if (st === 'land') {
        var u = 1 - t;
        sq = 1 - 0.20 * u * u + 0.05 * Math.sin(Math.PI * clamp((t - 0.55) / 0.45, 0, 1));
      }
    }

    var ry = R * grow * sq;
    var rx = R * grow * (1 + (1 - sq) * 0.60);
    var cy = half + (R - ry);        // 바닥을 고정한 채 눌리고 늘어남
    var plain = (grow === 1 && sq === 1);
    var mask = (isG || st === 'pop') ? 0 : connMask(o.conn);

    var B = plain
      ? cached('B' + Q(size) + '_' + mask + '_' + (isG ? 1 : 0),
          function () { return makeBody(size, mask, isG, half, cy, rx, ry); })
      : makeBody(size, mask, isG, half, cy, rx, ry);
    if (!B) return;

    ctx.save();
    ctx.translate(x, y);

    if (popU >= 0) drawBurst(ctx, size, P, popU, 1);
    ctx.globalAlpha = alpha;

    /* 머리 장식 — 위쪽이 비었을 때만, 작은 미니보드에서는 생략 */
    if (P.tuft && size >= 18 && !(mask & 1) && st !== 'pop') {
      var tp = cached('T' + Q(size) + '_' + P.tuft,
        function () { return makeTuft(size, P.tuft); });
      if (tp) { ctx.fillStyle = P.mid; ctx.fill(tp); }
    }

    ctx.fillStyle = P.line;  ctx.fill(B.d);     // 외곽선 겹
    ctx.fillStyle = bodyCol; ctx.fill(B.f);     // 본체

    /* 얼굴 */
    if (size >= 9 && alpha > 0.12) {
      var F = cached('F' + Q(size) + '_' + faceId,
        function () { return makeFace(size, faceId); });
      if (F) {
        if (!plain) {                            // 눌림/부풀림 → 얼굴도 같이
          ctx.translate(half, cy);
          ctx.scale(rx / R, ry / R);
          ctx.translate(-half, -half);
        }
        if (F.bl) { ctx.fillStyle = P.tint; ctx.fill(F.bl); }
        if (F.w)  { ctx.fillStyle = WHITE;  ctx.fill(F.w); }
        ctx.fillStyle = isG ? P.line : EYE;
        ctx.fill(F.dk);
        if (F.gl) { ctx.fillStyle = WHITE; ctx.fill(F.gl); }
        ctx.strokeStyle = isG ? P.line : EYE;
        ctx.lineWidth = F.slw;
        ctx.lineCap = 'round';
        ctx.lineJoin = 'round';
        ctx.stroke(F.st);
      }
    }
    ctx.restore();
  }

  /* ═══════════════════════ 보드 배경 ═══════════════════════
     어둡고 차분한 바닥 + 큼직하고 아주 옅은 장식 → 파스텔 뿌요가 또렷하게 뜬다 */
  var BG = {
    base:   '#2A2340',
    top:    '#31284B',
    floor:  '#3A2F58',
    grid:   'rgba(255,245,255,0.055)',
    glow:   'rgba(255,240,255,0.045)',
    star:   'rgba(255,248,230,0.065)',
    frame:  '#6E5B9B',
    frame2: '#A98FD6'
  };
  /* 떠다니는 큰 원 — 위치/크기/속도 고정값 (난수 없음 → 깜빡임 없음) */
  var BUB = [
    { x: 0.20, y: 0.15, r: 0.30, s: 0.016 },
    { x: 0.78, y: 0.52, r: 0.22, s: 0.022 },
    { x: 0.46, y: 0.86, r: 0.36, s: 0.011 },
    { x: 0.10, y: 0.70, r: 0.17, s: 0.027 },
    { x: 0.90, y: 0.05, r: 0.14, s: 0.032 }
  ];

  function star4(ctx, cx, cy, ro, ri) {
    var i, a, r;
    ctx.beginPath();
    for (i = 0; i < 8; i++) {
      a = -Math.PI / 2 + i * Math.PI / 4;
      r = (i % 2) ? ri : ro;
      if (i === 0) ctx.moveTo(cx + Math.cos(a) * r, cy + Math.sin(a) * r);
      else ctx.lineTo(cx + Math.cos(a) * r, cy + Math.sin(a) * r);
    }
    ctx.closePath();
    ctx.fill();
  }

  function drawBoardBg(ctx, w, h, tSec, cols) {
    tSec = tSec || 0;
    cols = cols || 6;
    var cs = w / cols;
    var rows = Math.max(1, Math.round(h / cs));
    var i, b, by;

    ctx.save();
    ctx.fillStyle = BG.base;  ctx.fillRect(0, 0, w, h);
    ctx.fillStyle = BG.top;   ctx.fillRect(0, 0, w, Math.round(h * 0.16));
    ctx.fillStyle = BG.floor; ctx.fillRect(0, h - Math.max(3, h * 0.018), w, Math.max(3, h * 0.018));

    /* 큼직하고 옅은 원이 천천히 올라간다 (평면 단색) */
    ctx.fillStyle = BG.glow;
    for (i = 0; i < BUB.length; i++) {
      b = BUB[i];
      by = ((b.y - tSec * b.s) % 1.3 + 1.3) % 1.3;
      ctx.beginPath();
      ctx.arc(b.x * w, (by - 0.15) * h, b.r * w, 0, TAU);
      ctx.fill();
    }
    /* 네모별 2개 — 숨쉬듯 크기만 변함 */
    ctx.fillStyle = BG.star;
    star4(ctx, w * 0.16, h * 0.30, cs * (0.42 + 0.06 * Math.sin(tSec * 1.6)), cs * 0.13);
    star4(ctx, w * 0.84, h * 0.72, cs * (0.34 + 0.06 * Math.sin(tSec * 1.1 + 2)), cs * 0.11);

    /* 격자 — 한 패스로 */
    ctx.strokeStyle = BG.grid;
    ctx.lineWidth = 1;
    ctx.beginPath();
    for (i = 1; i < cols; i++) { ctx.moveTo(Math.round(i * cs) + 0.5, 0); ctx.lineTo(Math.round(i * cs) + 0.5, h); }
    for (i = 1; i < rows; i++) { ctx.moveTo(0, Math.round(i * cs) + 0.5); ctx.lineTo(w, Math.round(i * cs) + 0.5); }
    ctx.stroke();

    /* 테두리 + 모서리 포인트 */
    ctx.strokeStyle = BG.frame;
    ctx.lineWidth = 2;
    ctx.strokeRect(1, 1, w - 2, h - 2);
    ctx.fillStyle = BG.frame2;
    var k = Math.max(5, cs * 0.26);
    ctx.beginPath();
    ctx.moveTo(1, 1); ctx.lineTo(1 + k, 1); ctx.lineTo(1, 1 + k); ctx.closePath();
    ctx.moveTo(w - 1, 1); ctx.lineTo(w - 1 - k, 1); ctx.lineTo(w - 1, 1 + k); ctx.closePath();
    ctx.moveTo(1, h - 1); ctx.lineTo(1 + k, h - 1); ctx.lineTo(1, h - 1 - k); ctx.closePath();
    ctx.moveTo(w - 1, h - 1); ctx.lineTo(w - 1 - k, h - 1); ctx.lineTo(w - 1, h - 1 - k); ctx.closePath();
    ctx.fill();
    ctx.restore();
  }

  /* ═══════════════════════ 연쇄 배너 ═══════════════════════ */
  var TIER = ['#FFE9A3', '#FFE9A3', '#FFE07E', '#FFB8CE', '#FF9FC4', '#9BE3FF', '#C3B0FF', '#FFAEE8'];
  var RAINBOW = ['#FF9FC4', '#FFD37E', '#A8EFA0', '#9BE3FF', '#C3B0FF', '#FFAEE8'];
  var FONT = '"Jua","Gmarket Sans","Malgun Gothic",system-ui,sans-serif';

  function drawChainBanner(ctx, w, h, n, tSec, t) {
    n = Math.max(1, n | 0);
    t = clamp(typeof t === 'number' ? t : 0, 0, 1);
    tSec = tSec || 0;

    var a = 1, sc = 1, dy = 0, u;
    if (t < 0.16) { u = t / 0.16; sc = easeOutBack(u); a = u; }
    else if (t > 0.74) { u = (t - 0.74) / 0.26; a = 1 - u; dy = -h * 0.11 * u; sc = 1 + 0.07 * u; }
    if (a <= 0.01) return;

    var big = n >= 5;
    var col = n >= 8 ? RAINBOW[Math.floor(tSec * 9) % RAINBOW.length]
                     : TIER[Math.min(n, TIER.length - 1)];
    var fs = Math.min(h * 0.26, (w * 0.185 + Math.min(n, 12) * w * 0.017)) * sc;
    var cx = w / 2, cy = h * 0.40 + dy;
    var amp = Math.min(n, 10) * 0.42 * (big ? 1.5 : 1) * (1 - t * 0.35);
    cx += Math.sin(tSec * 31) * amp;
    cy += Math.cos(tSec * 23) * amp * 0.7;

    var txt = n + '연쇄';
    var i, ang, wd, r0, r1, chs, widths, total, px, chY;

    ctx.save();
    ctx.globalAlpha = a;

    /* 5연쇄 이상 — 뒤에서 퍼지는 평면 광선 */
    if (big) {
      r0 = fs * 0.55;
      r1 = fs * (1.45 + 0.14 * Math.sin(tSec * 5.5));
      ctx.globalAlpha = a * 0.18;
      ctx.fillStyle = col;
      ctx.beginPath();
      for (i = 0; i < 14; i++) {
        ang = tSec * 0.55 + i * TAU / 14;
        wd = (TAU / 14) * 0.34;
        ctx.moveTo(cx + Math.cos(ang - wd) * r0, cy + Math.sin(ang - wd) * r0);
        ctx.lineTo(cx + Math.cos(ang) * r1, cy + Math.sin(ang) * r1);
        ctx.lineTo(cx + Math.cos(ang + wd) * r0, cy + Math.sin(ang + wd) * r0);
      }
      ctx.fill();
      ctx.globalAlpha = a;
    }

    /* 리본(알약 모양 받침) */
    ctx.font = '900 ' + fs.toFixed(1) + 'px ' + FONT;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    var tw = ctx.measureText(txt).width;
    var bw = tw * 0.62 + fs * 0.5, bh = fs * 0.92;
    var p = newPath();
    if (p) {
      rrect(p, cx - bw, cy - bh * 0.5, cx + bw, cy + bh * 0.5, bh * 0.5, bh * 0.5, bh * 0.5, bh * 0.5);
      ctx.globalAlpha = a * 0.80;
      ctx.fillStyle = '#3A2C57';
      ctx.fill(p);
      ctx.globalAlpha = a;
      ctx.strokeStyle = col;
      ctx.lineWidth = Math.max(1.5, fs * 0.055);
      ctx.stroke(p);
    }

    /* 글자 — 한 글자씩 살짝 출렁 */
    chs = txt.split('');
    widths = [];
    total = 0;
    for (i = 0; i < chs.length; i++) { widths[i] = ctx.measureText(chs[i]).width; total += widths[i]; }
    px = cx - total / 2;
    ctx.lineJoin = 'round';
    ctx.miterLimit = 2;
    for (i = 0; i < chs.length; i++) {
      chY = cy + Math.sin(tSec * 7.5 + i * 0.9) * fs * (big ? 0.075 : 0.045);
      var X = px + widths[i] / 2;
      ctx.lineWidth = fs * 0.22;
      ctx.strokeStyle = '#43315E';
      ctx.strokeText(chs[i], X, chY);
      ctx.lineWidth = fs * 0.085;
      ctx.strokeStyle = '#FFFFFF';
      ctx.strokeText(chs[i], X, chY);
      ctx.fillStyle = col;
      ctx.fillText(chs[i], X, chY);
      px += widths[i];
    }

    /* 5연쇄 이상 — 꼬리말 + 반짝이는 네모별 */
    if (big) {
      var sub = n >= 9 ? '엄청나!!' : (n >= 7 ? '대연쇄!' : '좋아!');
      var sfs = fs * 0.38;
      ctx.font = '900 ' + sfs.toFixed(1) + 'px ' + FONT;
      var sy = cy + fs * 0.78;
      ctx.lineWidth = sfs * 0.26;
      ctx.strokeStyle = '#43315E';
      ctx.strokeText(sub, cx, sy);
      ctx.fillStyle = '#FFFDF8';
      ctx.fillText(sub, cx, sy);

      ctx.fillStyle = '#FFFDF8';
      for (i = 0; i < 5; i++) {
        ang = i * 1.2566 + tSec * 0.9;
        var rr = fs * (0.95 + 0.12 * Math.sin(tSec * 6 + i));
        ctx.globalAlpha = a * (0.55 + 0.45 * Math.abs(Math.sin(tSec * 4 + i * 1.3)));
        star4(ctx, cx + Math.cos(ang) * rr * 1.5, cy + Math.sin(ang) * rr * 0.85,
          fs * 0.12, fs * 0.042);
      }
    }
    ctx.restore();
  }

  /* ═══════════════════════ 도우미 ═══════════════════════ */
  var util = {
    /* grid[r][c] 기준으로 같은 색이 붙은 방향 (방해뿌요 9는 안 이어짐) */
    conn: function (grid, r, c) {
      var o = { up: false, down: false, left: false, right: false };
      if (!grid || !grid[r]) return o;
      var v = grid[r][c];
      if (!v || +v === 9) return o;
      function g(rr, cc) { return (grid[rr] && grid[rr][cc]) || 0; }
      o.up = g(r - 1, c) === v;
      o.down = g(r + 1, c) === v;
      o.left = g(r, c - 1) === v;
      o.right = g(r, c + 1) === v;
      return o;
    },
    /* 같은 뿌요면 항상 같은 표정이 나오도록 하는 해시 */
    face: function (a, b) {
      var n = ((a | 0) * 73856093) ^ ((b | 0) * 19349663);
      return (n >>> 1) & 3;
    }
  };

  G.PUYO_ART = {
    colors: PAL,
    drawPuyo: drawPuyo,
    drawBoardBg: drawBoardBg,
    drawChainBanner: drawChainBanner,
    util: util,
    /* 테스트·디버그용 */
    _clearCache: function () { CACHE.clear(); }
  };
})(typeof window !== 'undefined' ? window : globalThis);
