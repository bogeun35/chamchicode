/* fruit-art.js — chubby pastel fruit characters for the suika game.
 *
 * window.FRUIT_ART[i] = { name, color, draw(ctx, r) }
 *
 * draw(ctx, r): the caller has already translated/rotated/scaled, so the fruit
 * is drawn centred at (0,0) and fills a circle of radius r (leaf / stem / crown
 * may poke up to 0.3r above the top). Every measurement is relative to r.
 * Each draw() keeps save/restore balanced and never touches setTransform.
 *
 * Style: pastel flat fill + a flat near-white band (or offset lighter disc) of
 * the same hue, soft same-hue outline (0.08r, ~22% darker), white shine dots,
 * chunky outlined stems/leaves, and a small gathered face: bean eyes, tiny
 * nose, tiny low mouth, soft blush. No gradients, no shadows.
 */
(function () {
  'use strict';

  var PI = Math.PI, TAU = PI * 2;

  var FACE = '#5A3E33';                // eyes, brows, mouth lines
  var MOUTH_IN = '#B85C6E';            // inside of an open mouth
  var TONGUE = '#FFA8C0';
  var BLUSH = 'rgba(255,130,150,0.4)';
  var LEAF = '#B5EBA8', LEAF_LT = '#D6F5CE', LEAF_DK = '#7CC68A';
  var STEM = '#C9915A', STEM_DK = '#A5703F';
  var CALYX = '#C9D48A', CALYX_LT = '#E0E8B0', CALYX_DK = '#97A55A';

  /* ---------- colour helpers (used once, at load) ---------- */

  function hex2(n) { n = Math.max(0, Math.min(255, Math.round(n))); return (n < 16 ? '0' : '') + n.toString(16); }
  function lighter(hex, t) {
    var c = parseInt(hex.slice(1), 16), R = c >> 16, G = (c >> 8) & 255, B = c & 255;
    return '#' + hex2(R + (255 - R) * t) + hex2(G + (255 - G) * t) + hex2(B + (255 - B) * t);
  }

  /* ---------- drawing helpers ---------- */

  function lw(r, k, min) { return Math.max(min || 1.5, r * k); }

  function circ(ctx, x, y, rad) {
    ctx.beginPath();
    ctx.arc(x, y, rad, 0, TAU);
  }

  function ell(ctx, x, y, rx, ry, rot) {
    ctx.beginPath();
    ctx.ellipse(x, y, rx, ry, rot || 0, 0, TAU);
  }

  function strokeIt(ctx, r, color, k, min) {
    ctx.lineWidth = lw(r, k || 0.08, min || 2);
    ctx.strokeStyle = color;
    ctx.lineJoin = 'round';
    ctx.lineCap = 'round';
    ctx.stroke();
  }

  // slightly squat round body path
  function bodyPath(ctx, r, R, cy) {
    ctx.beginPath();
    ctx.ellipse(0, cy, R, R * 0.96, 0, 0, TAU);
  }

  // flat lighter crescent hugging the inner edge, 8 o'clock → top → 4 o'clock
  function band(ctx, r, R, cy, color) {
    var rb = R - r * 0.11;
    ctx.strokeStyle = color;
    ctx.lineWidth = r * 0.14;
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.ellipse(0, cy, rb, rb * 0.96, 0, PI * 0.83, PI * 2.17);
    ctx.stroke();
  }

  // flat lighter inner disc offset up-left (clipped to the current path)
  function lightDisc(ctx, r, color) {
    ctx.save();
    ctx.clip();
    ctx.fillStyle = color;
    circ(ctx, -r * 0.12, -r * 0.12, r * 0.75);
    ctx.fill();
    ctx.restore();
  }

  function shine(ctx, r, x, y) {
    ctx.fillStyle = 'rgba(255,255,255,0.85)';
    circ(ctx, x, y, r * 0.09); ctx.fill();
    circ(ctx, x + r * 0.13, y + r * 0.11, r * 0.04); ctx.fill();
  }

  function rrect(ctx, x, y, w, h, rad) {
    ctx.beginPath();
    ctx.moveTo(x + rad, y);
    ctx.lineTo(x + w - rad, y);
    ctx.arcTo(x + w, y, x + w, y + rad, rad);
    ctx.lineTo(x + w, y + h - rad);
    ctx.arcTo(x + w, y + h, x + w - rad, y + h, rad);
    ctx.lineTo(x + rad, y + h);
    ctx.arcTo(x, y + h, x, y + h - rad, rad);
    ctx.lineTo(x, y + rad);
    ctx.arcTo(x, y, x + rad, y, rad);
    ctx.closePath();
  }

  // chunky stem: rounded rect standing on (x, y), rotated about that point
  function stem(ctx, r, x, y, rot, w, h) {
    w = w || r * 0.12; h = h || r * 0.22;
    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(rot || 0);
    rrect(ctx, -w / 2, -h, w, h + r * 0.04, w * 0.45);
    ctx.fillStyle = STEM;
    ctx.fill();
    strokeIt(ctx, r, STEM_DK, 0.06, 1.5);
    ctx.restore();
  }

  // fat leaf: ellipse from (x, y) along direction rot, lighter upper half, outlined
  function leaf(ctx, r, x, y, rot, len, wid, fill, light, dark) {
    len = len || r * 0.34; wid = wid || r * 0.18;
    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(rot);
    ell(ctx, len / 2, 0, len / 2, wid / 2);
    ctx.fillStyle = fill || LEAF;
    ctx.fill();
    ctx.save();
    ctx.clip();
    ctx.fillStyle = light || LEAF_LT;
    ctx.fillRect(0, -wid, len, wid / 2);
    ctx.restore();
    ell(ctx, len / 2, 0, len / 2, wid / 2);
    strokeIt(ctx, r, dark || LEAF_DK, 0.07, 1.5);
    ctx.restore();
  }

  // parallel (optionally wavy) lines across the whole body; caller clips/rotates
  function lines(ctx, r, spacing, count, wob) {
    var k, x, w;
    for (k = -count; k <= count; k++) {
      x = k * spacing;
      w = (k & 1) ? -wob : wob;
      ctx.moveTo(x, -1.3 * r);
      if (wob) {
        ctx.quadraticCurveTo(x + w, -0.975 * r, x, -0.65 * r);
        ctx.quadraticCurveTo(x - w, -0.325 * r, x, 0);
        ctx.quadraticCurveTo(x + w, 0.325 * r, x, 0.65 * r);
        ctx.quadraticCurveTo(x - w, 0.975 * r, x, 1.3 * r);
      } else {
        ctx.lineTo(x, 1.3 * r);
      }
    }
  }

  /* ---------- face ----------
   * face(ctx, r, o)
   *  o.eyes   bean | wide | happy | sleepy | scrunch
   *  o.brows  true → angry angled eyebrows
   *  o.nose   colour of the tiny nose dot (omit for none)
   *  o.mouth  smile | o | open | tongue | teeth | grin | omega | three | frown | wavy | tiny
   *  o.blush  true/false
   */
  function openMouth(ctx, r, y0, w, h, inner) {
    ctx.beginPath();
    ctx.ellipse(0, y0, w, h, 0, 0, PI);
    ctx.closePath();
    ctx.fillStyle = MOUTH_IN;
    ctx.fill();
    if (inner && r >= 22) {
      ctx.save();
      ctx.clip();
      if (inner === 'tongue') {
        ctx.fillStyle = TONGUE;
        ell(ctx, 0, y0 + h * 0.72, w * 0.62, h * 0.55);
        ctx.fill();
      } else {
        ctx.fillStyle = '#FFFFFF';
        ctx.fillRect(-w, y0, w * 2, h * 0.42);
      }
      ctx.restore();
    }
    ctx.beginPath();
    ctx.ellipse(0, y0, w, h, 0, 0, PI);
    ctx.closePath();
    ctx.strokeStyle = FACE;
    ctx.lineWidth = lw(r, 0.04);
    ctx.lineJoin = 'round';
    ctx.stroke();
  }

  function face(ctx, r, o) {
    var ex = 0.24 * r, ey = 0.04 * r;
    var erx = lw(r, 0.05, 1.1), ery = lw(r, 0.08, 1.8);   // bean eyes 0.10r x 0.16r
    var ny = 0.16 * r, my = 0.28 * r;
    var lx = -ex, rx = ex;

    if (o.blush) {
      ctx.fillStyle = BLUSH;
      ell(ctx, -0.42 * r, 0.16 * r, 0.06 * r, 0.04 * r); ctx.fill();
      ell(ctx, 0.42 * r, 0.16 * r, 0.06 * r, 0.04 * r); ctx.fill();
    }

    ctx.strokeStyle = FACE;
    ctx.fillStyle = FACE;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';

    switch (o.eyes) {
      case 'wide':
        ell(ctx, lx, ey, erx * 1.15, ery * 1.1); ctx.fill();
        ell(ctx, rx, ey, erx * 1.15, ery * 1.1); ctx.fill();
        break;
      case 'happy':  // ^ ^
        ctx.lineWidth = lw(r, 0.05);
        ctx.beginPath();
        ctx.arc(lx, ey + 0.05 * r, 0.08 * r, PI * 1.15, PI * 1.85);
        ctx.moveTo(rx + 0.08 * r * Math.cos(PI * 1.15), ey + 0.05 * r + 0.08 * r * Math.sin(PI * 1.15));
        ctx.arc(rx, ey + 0.05 * r, 0.08 * r, PI * 1.15, PI * 1.85);
        ctx.stroke();
        break;
      case 'sleepy': // – –
        ctx.lineWidth = lw(r, 0.055);
        ctx.beginPath();
        ctx.moveTo(lx - 0.08 * r, ey);
        ctx.lineTo(lx + 0.08 * r, ey);
        ctx.moveTo(rx - 0.08 * r, ey);
        ctx.lineTo(rx + 0.08 * r, ey);
        ctx.stroke();
        break;
      case 'scrunch': // > <
        ctx.lineWidth = lw(r, 0.05);
        ctx.beginPath();
        ctx.moveTo(lx - 0.06 * r, ey - 0.07 * r);
        ctx.lineTo(lx + 0.05 * r, ey);
        ctx.lineTo(lx - 0.06 * r, ey + 0.07 * r);
        ctx.moveTo(rx + 0.06 * r, ey - 0.07 * r);
        ctx.lineTo(rx - 0.05 * r, ey);
        ctx.lineTo(rx + 0.06 * r, ey + 0.07 * r);
        ctx.stroke();
        break;
      default: // bean eyes
        ell(ctx, lx, ey, erx, ery); ctx.fill();
        ell(ctx, rx, ey, erx, ery); ctx.fill();
    }

    if (o.brows) {
      ctx.lineWidth = lw(r, 0.05);
      ctx.beginPath();
      ctx.moveTo(lx - 0.09 * r, ey - 0.21 * r);
      ctx.lineTo(lx + 0.07 * r, ey - 0.14 * r);
      ctx.moveTo(rx + 0.09 * r, ey - 0.21 * r);
      ctx.lineTo(rx - 0.07 * r, ey - 0.14 * r);
      ctx.stroke();
    }

    if (o.nose) {
      ctx.fillStyle = o.nose;
      circ(ctx, 0, ny, lw(r, 0.025, 1)); ctx.fill();
    }

    ctx.strokeStyle = FACE;
    ctx.fillStyle = FACE;
    ctx.lineWidth = lw(r, 0.04);
    switch (o.mouth) {
      case 'o':
        circ(ctx, 0, my, lw(r, 0.045, 1.5));
        ctx.fillStyle = MOUTH_IN; ctx.fill();
        strokeIt(ctx, r, FACE, 0.035, 1.2);
        break;
      case 'open':
        openMouth(ctx, r, my - 0.03 * r, 0.06 * r, 0.075 * r, null);
        break;
      case 'tongue':
        openMouth(ctx, r, my - 0.05 * r, 0.11 * r, 0.12 * r, 'tongue');
        break;
      case 'teeth':
        openMouth(ctx, r, my - 0.04 * r, 0.09 * r, 0.095 * r, 'teeth');
        break;
      case 'grin':
        openMouth(ctx, r, my - 0.05 * r, 0.13 * r, 0.13 * r, 'tongue');
        break;
      case 'omega':
        ctx.beginPath();
        ctx.moveTo(-0.07 * r, my - 0.03 * r);
        ctx.arc(-0.035 * r, my - 0.03 * r, 0.035 * r, PI, 0, true);
        ctx.arc(0.035 * r, my - 0.03 * r, 0.035 * r, PI, 0, true);
        ctx.stroke();
        break;
      case 'three':
        ctx.beginPath();
        ctx.arc(-0.01 * r, my - 0.035 * r, 0.035 * r, -PI * 0.5, PI * 0.5);
        ctx.arc(-0.01 * r, my + 0.035 * r, 0.035 * r, -PI * 0.5, PI * 0.5);
        ctx.stroke();
        break;
      case 'frown':
        ctx.beginPath();
        ctx.arc(0, my + 0.06 * r, 0.075 * r, PI * 1.18, PI * 1.82);
        ctx.stroke();
        break;
      case 'wavy':
        ctx.beginPath();
        ctx.moveTo(-0.07 * r, my + 0.01 * r);
        ctx.quadraticCurveTo(-0.035 * r, my - 0.06 * r, 0, my);
        ctx.quadraticCurveTo(0.035 * r, my + 0.06 * r, 0.07 * r, my - 0.01 * r);
        ctx.stroke();
        break;
      case 'tiny':
        ctx.beginPath();
        ctx.moveTo(-0.05 * r, my - 0.01 * r);
        ctx.lineTo(0.05 * r, my - 0.01 * r);
        ctx.stroke();
        break;
      default: // small smile
        ctx.beginPath();
        ctx.arc(0, my - 0.06 * r, 0.075 * r, PI * 0.15, PI * 0.85);
        ctx.stroke();
    }
  }

  /* ---------- static tables (fractions of r) ---------- */

  // strawberry seed dashes: [x, y, angle]
  var SEEDS = [
    [-0.62, -0.2, 0.5], [0.62, -0.2, -0.5], [-0.66, 0.4, 0.3], [0.66, 0.4, -0.3],
    [-0.3, 0.76, 0.1], [0.3, 0.76, -0.1]
  ];

  // grape bunch: [x, y, radius]; back ones first, big front grape last
  var GRAPES = [
    [0, -0.62, 0.33],
    [-0.36, -0.52, 0.36], [0.36, -0.52, 0.36],
    [-0.62, 0.0, 0.36], [0.62, 0.0, 0.36],
    [-0.34, 0.55, 0.36], [0.34, 0.55, 0.36],
    [0, 0.04, 0.5]
  ];

  var PEAR_DOTS = [
    [-0.6, -0.45], [0.55, -0.55], [-0.78, 0.15], [0.78, 0.12], [-0.4, 0.78], [0.4, 0.78]
  ];

  // pineapple crown: [angle from straight up, length]
  var CROWN = [
    [-0.9, 0.34], [0.9, 0.34], [-0.55, 0.46], [0.55, 0.46],
    [-0.25, 0.56], [0.25, 0.56], [0, 0.62]
  ];

  /* ---------- pastel palette: body fill, soft outline (~22% darker) ---------- */

  var C = {
    cherry:  { fill: '#FF9AA2', line: '#E07A84' },
    straw:   { fill: '#FFA5AB', line: '#E0838A' },
    grape:   { fill: '#CDB4FF', line: '#A58BE0' },
    dekopon: { fill: '#FFD08A', line: '#E0A85C' },
    persim:  { fill: '#FFB884', line: '#E08F5A' },
    apple:   { fill: '#FF9797', line: '#E07575' },
    pear:    { fill: '#FFF5BC', line: '#E0D08A' },
    peach:   { fill: '#FFD9E2', line: '#E8AABB' },
    pine:    { fill: '#FFE99A', line: '#E0C468' },
    melon:   { fill: '#DDF7BF', line: '#A6D48A' },
    water:   { fill: '#A8ECB4', line: '#6DBF80', stripe: '#74CF8A' }
  };
  (function () {
    var k;
    for (k in C) if (C.hasOwnProperty(k)) C[k].light = lighter(C[k].fill, 0.45);
  })();

  /* ---------- the fruits ---------- */

  var FRUITS = [

    /* 0 체리 — happy */
    {
      name: '체리', color: C.cherry.fill,
      draw: function (ctx, r) {
        bodyPath(ctx, r, r * 0.93, r * 0.05);
        ctx.fillStyle = C.cherry.fill; ctx.fill();
        band(ctx, r, r * 0.93, r * 0.05, C.cherry.light);
        bodyPath(ctx, r, r * 0.93, r * 0.05);
        strokeIt(ctx, r, C.cherry.line);
        shine(ctx, r, -r * 0.42, -r * 0.42);
        stem(ctx, r, r * 0.02, -r * 0.82, 0.3);
        leaf(ctx, r, r * 0.06, -r * 1.02, -0.15);
        face(ctx, r, { eyes: 'bean', nose: C.cherry.line, mouth: 'smile', blush: true });
      }
    },

    /* 1 딸기 — surprised */
    {
      name: '딸기', color: C.straw.fill,
      draw: function (ctx, r) {
        var i, p;
        function path() {
          ctx.beginPath();
          ctx.moveTo(-r * 0.94, -r * 0.08);
          ctx.bezierCurveTo(-r * 0.99, r * 0.5, -r * 0.52, r * 0.95, 0, r * 0.95);
          ctx.bezierCurveTo(r * 0.52, r * 0.95, r * 0.99, r * 0.5, r * 0.94, -r * 0.08);
          ctx.bezierCurveTo(r * 0.9, -r * 0.67, r * 0.46, -r * 0.92, 0, -r * 0.92);
          ctx.bezierCurveTo(-r * 0.46, -r * 0.92, -r * 0.9, -r * 0.67, -r * 0.94, -r * 0.08);
          ctx.closePath();
        }
        path();
        ctx.fillStyle = C.straw.fill; ctx.fill();
        ctx.save();
        ctx.clip();
        band(ctx, r, r * 0.93, r * 0.02, C.straw.light);
        ctx.restore();
        path();
        strokeIt(ctx, r, C.straw.line);
        shine(ctx, r, -r * 0.42, -r * 0.4);

        if (r >= 25) {
          ctx.strokeStyle = 'rgba(255,252,235,0.95)';
          ctx.lineWidth = lw(r, 0.04);
          ctx.lineCap = 'round';
          ctx.beginPath();
          for (i = 0; i < SEEDS.length; i++) {
            p = SEEDS[i];
            ctx.moveTo(p[0] * r - Math.sin(p[2]) * r * 0.04, p[1] * r - Math.cos(p[2]) * r * 0.04);
            ctx.lineTo(p[0] * r + Math.sin(p[2]) * r * 0.04, p[1] * r + Math.cos(p[2]) * r * 0.04);
          }
          ctx.stroke();
        }

        // fat rounded calyx lobes
        leaf(ctx, r, 0, -r * 0.72, PI * 0.97, r * 0.44, r * 0.2);
        leaf(ctx, r, 0, -r * 0.72, PI * 0.03, r * 0.44, r * 0.2);
        leaf(ctx, r, 0, -r * 0.72, PI * 1.22, r * 0.44, r * 0.2);
        leaf(ctx, r, 0, -r * 0.72, PI * 1.78, r * 0.44, r * 0.2);
        leaf(ctx, r, 0, -r * 0.72, PI * 1.5, r * 0.4, r * 0.2);
        stem(ctx, r, 0, -r * 0.98, 0, r * 0.1, r * 0.2);

        face(ctx, r, { eyes: 'wide', nose: C.straw.line, mouth: 'o', blush: true });
      }
    },

    /* 2 포도 — sleepy; bunch of outlined grapes */
    {
      name: '포도', color: C.grape.fill,
      draw: function (ctx, r) {
        var i, g;
        for (i = 0; i < GRAPES.length; i++) {
          g = GRAPES[i];
          circ(ctx, g[0] * r, g[1] * r, g[2] * r);
          ctx.fillStyle = C.grape.fill; ctx.fill();
          strokeIt(ctx, r, C.grape.line, 0.07);
          if (i === 1 || i === 5 || i === 7) {
            ctx.fillStyle = 'rgba(255,255,255,0.85)';
            circ(ctx, (g[0] - g[2] * 0.42) * r, (g[1] - g[2] * 0.42) * r, g[2] * r * 0.18); ctx.fill();
            circ(ctx, (g[0] - g[2] * 0.18) * r, (g[1] - g[2] * 0.2) * r, g[2] * r * 0.08); ctx.fill();
          }
        }
        stem(ctx, r, r * 0.02, -r * 0.86, 0.2);
        leaf(ctx, r, r * 0.08, -r * 1.02, -0.2, r * 0.4, r * 0.2);
        face(ctx, r, { eyes: 'sleepy', nose: C.grape.line, mouth: 'tiny', blush: true });
      }
    },

    /* 3 한라봉 — grumpy; round body with a small cap-like knob */
    {
      name: '한라봉', color: C.dekopon.fill,
      draw: function (ctx, r) {
        var by = r * 0.05, br = r * 0.93, top = by - br * 0.96;
        bodyPath(ctx, r, br, by);
        ctx.fillStyle = C.dekopon.fill; ctx.fill();
        band(ctx, r, br, by, C.dekopon.light);
        bodyPath(ctx, r, br, by);
        strokeIt(ctx, r, C.dekopon.line);
        // knob cap
        ctx.fillStyle = C.dekopon.fill;
        ell(ctx, 0, top, r * 0.14, r * 0.12);
        ctx.fill();
        ctx.beginPath();
        ctx.ellipse(0, top, r * 0.14, r * 0.12, 0, PI, TAU);
        strokeIt(ctx, r, C.dekopon.line);
        shine(ctx, r, -r * 0.42, -r * 0.42);
        leaf(ctx, r, r * 0.04, top - r * 0.08, -0.5);
        face(ctx, r, { eyes: 'bean', brows: true, nose: C.dekopon.line, mouth: 'frown' });
      }
    },

    /* 4 감 — scrunched (> <); flattened, gently squared, flat calyx */
    {
      name: '감', color: C.persim.fill,
      draw: function (ctx, r) {
        var rx = r * 0.99, ry = r * 0.9, cy = r * 0.06, k = 0.72;
        function path() {
          ctx.beginPath();
          ctx.moveTo(-rx, cy);
          ctx.bezierCurveTo(-rx, cy - ry * k, -rx * k, cy - ry, 0, cy - ry);
          ctx.bezierCurveTo(rx * k, cy - ry, rx, cy - ry * k, rx, cy);
          ctx.bezierCurveTo(rx, cy + ry * k, rx * k, cy + ry, 0, cy + ry);
          ctx.bezierCurveTo(-rx * k, cy + ry, -rx, cy + ry * k, -rx, cy);
          ctx.closePath();
        }
        path();
        ctx.fillStyle = C.persim.fill; ctx.fill();
        ctx.save();
        ctx.clip();
        ctx.strokeStyle = C.persim.light;
        ctx.lineWidth = r * 0.14;
        ctx.lineCap = 'round';
        ctx.beginPath();
        ctx.ellipse(0, cy, rx - r * 0.11, ry - r * 0.11, 0, PI * 0.83, PI * 2.17);
        ctx.stroke();
        ctx.restore();
        path();
        strokeIt(ctx, r, C.persim.line);
        shine(ctx, r, -r * 0.42, -r * 0.4);

        // flat 4-lobed calyx, fat and rounded
        var cy0 = -r * 0.78;
        leaf(ctx, r, 0, cy0, PI, r * 0.4, r * 0.16, CALYX, CALYX_LT, CALYX_DK);
        leaf(ctx, r, 0, cy0, 0, r * 0.4, r * 0.16, CALYX, CALYX_LT, CALYX_DK);
        leaf(ctx, r, 0, cy0, PI / 2, r * 0.26, r * 0.16, CALYX, CALYX_LT, CALYX_DK);
        leaf(ctx, r, 0, cy0, -PI / 2, r * 0.16, r * 0.14, CALYX, CALYX_LT, CALYX_DK);
        stem(ctx, r, 0, cy0, 0, r * 0.1, r * 0.14);

        face(ctx, r, { eyes: 'scrunch', nose: C.persim.line, mouth: 'wavy', blush: true });
      }
    },

    /* 5 사과 — happy */
    {
      name: '사과', color: C.apple.fill,
      draw: function (ctx, r) {
        bodyPath(ctx, r, r * 0.94, r * 0.04);
        ctx.fillStyle = C.apple.fill; ctx.fill();
        band(ctx, r, r * 0.94, r * 0.04, C.apple.light);
        bodyPath(ctx, r, r * 0.94, r * 0.04);
        strokeIt(ctx, r, C.apple.line);
        ctx.fillStyle = C.apple.line;
        ell(ctx, 0, -r * 0.87, r * 0.18, r * 0.07); ctx.fill();
        shine(ctx, r, -r * 0.42, -r * 0.42);
        stem(ctx, r, 0, -r * 0.84, 0);
        leaf(ctx, r, r * 0.07, -r * 1.0, -0.45);
        face(ctx, r, { eyes: 'bean', nose: C.apple.line, mouth: 'open', blush: true });
      }
    },

    /* 6 배 — happy (^ ^ with a w mouth); lighter disc offset up-left */
    {
      name: '배', color: C.pear.fill,
      draw: function (ctx, r) {
        var i, p;
        bodyPath(ctx, r, r * 0.94, r * 0.04);
        ctx.fillStyle = C.pear.fill; ctx.fill();
        lightDisc(ctx, r, C.pear.light);
        bodyPath(ctx, r, r * 0.94, r * 0.04);
        strokeIt(ctx, r, C.pear.line);
        ctx.fillStyle = 'rgba(224,208,138,0.5)';
        for (i = 0; i < PEAR_DOTS.length; i++) {
          p = PEAR_DOTS[i];
          circ(ctx, p[0] * r, p[1] * r, lw(r, 0.03, 1)); ctx.fill();
        }
        ctx.fillStyle = C.pear.line;
        ell(ctx, 0, -r * 0.87, r * 0.17, r * 0.07); ctx.fill();
        shine(ctx, r, -r * 0.42, -r * 0.42);
        stem(ctx, r, 0, -r * 0.84, 0.1);
        face(ctx, r, { eyes: 'happy', nose: C.pear.line, mouth: 'omega', blush: true });
      }
    },

    /* 7 복숭아 — happy; lighter disc offset up-left, open mouth with tongue */
    {
      name: '복숭아', color: C.peach.fill,
      draw: function (ctx, r) {
        bodyPath(ctx, r, r * 0.94, r * 0.04);
        ctx.fillStyle = C.peach.fill; ctx.fill();
        lightDisc(ctx, r, C.peach.light);
        bodyPath(ctx, r, r * 0.94, r * 0.04);
        strokeIt(ctx, r, C.peach.line);
        // crease
        ctx.strokeStyle = C.peach.line;
        ctx.lineWidth = lw(r, 0.045);
        ctx.lineCap = 'round';
        ctx.beginPath();
        ctx.moveTo(r * 0.06, -r * 0.84);
        ctx.quadraticCurveTo(r * 0.3, -r * 0.5, r * 0.34, -r * 0.1);
        ctx.stroke();
        ctx.fillStyle = C.peach.line;
        ell(ctx, r * 0.04, -r * 0.87, r * 0.16, r * 0.06); ctx.fill();
        shine(ctx, r, -r * 0.42, -r * 0.42);
        leaf(ctx, r, r * 0.02, -r * 0.9, -0.35, r * 0.38, r * 0.2);
        face(ctx, r, { eyes: 'bean', nose: C.peach.line, mouth: 'tongue', blush: true });
      }
    },

    /* 8 파인애플 — happy (^ ^, small open mouth with teeth); lattice + crown */
    {
      name: '파인애플', color: C.pine.fill,
      draw: function (ctx, r) {
        var i, c;
        bodyPath(ctx, r, r * 0.94, r * 0.05);
        ctx.fillStyle = C.pine.fill; ctx.fill();
        ctx.save();
        ctx.clip();
        ctx.strokeStyle = 'rgba(255,255,255,0.75)';
        ctx.lineWidth = lw(r, 0.035, 1.2);
        ctx.beginPath();
        ctx.save();
        ctx.rotate(0.6);
        lines(ctx, r, r * 0.42, 3, 0);
        ctx.rotate(-1.2);
        lines(ctx, r, r * 0.42, 3, 0);
        ctx.restore();
        ctx.stroke();
        ctx.restore();
        bodyPath(ctx, r, r * 0.94, r * 0.05);
        strokeIt(ctx, r, C.pine.line);

        for (i = 0; i < CROWN.length; i++) {
          c = CROWN[i];
          leaf(ctx, r, Math.sin(c[0]) * r * 0.1, -r * 0.68, -PI / 2 + c[0], c[1] * r, r * 0.14,
            i === CROWN.length - 1 ? LEAF_LT : LEAF, i === CROWN.length - 1 ? '#EAFBE6' : LEAF_LT, LEAF_DK);
        }

        face(ctx, r, { eyes: 'happy', nose: C.pine.line, mouth: 'teeth', blush: true });
      }
    },

    /* 9 멜론 — grumpy; sparse light net + chunky T stem */
    {
      name: '멜론', color: C.melon.fill,
      draw: function (ctx, r) {
        bodyPath(ctx, r, r * 0.94, r * 0.04);
        ctx.fillStyle = C.melon.fill; ctx.fill();
        ctx.save();
        ctx.clip();
        ctx.strokeStyle = 'rgba(255,255,255,0.85)';
        ctx.lineWidth = lw(r, 0.03, 1.2);
        ctx.lineCap = 'round';
        ctx.beginPath();
        ctx.save();
        ctx.rotate(0.5);
        lines(ctx, r, r * 0.46, 3, r * 0.07);
        ctx.rotate(-1.05);
        lines(ctx, r, r * 0.46, 3, r * 0.07);
        ctx.restore();
        ctx.stroke();
        ctx.restore();
        bodyPath(ctx, r, r * 0.94, r * 0.04);
        strokeIt(ctx, r, C.melon.line);

        stem(ctx, r, 0, -r * 0.84, 0, r * 0.12, r * 0.2);
        rrect(ctx, -r * 0.24, -r * 1.12, r * 0.48, r * 0.11, r * 0.05);
        ctx.fillStyle = STEM; ctx.fill();
        strokeIt(ctx, r, STEM_DK, 0.06, 1.5);

        face(ctx, r, { eyes: 'bean', brows: true, nose: C.melon.line, mouth: 'frown' });
      }
    },

    /* 10 수박 — happy, grin with tongue; wavy stripes */
    {
      name: '수박', color: C.water.fill,
      draw: function (ctx, r) {
        var i, xo, w = r * 0.08;
        bodyPath(ctx, r, r * 0.95, r * 0.03);
        ctx.fillStyle = C.water.fill; ctx.fill();
        ctx.save();
        ctx.clip();
        ctx.strokeStyle = C.water.stripe;
        ctx.lineWidth = lw(r, 0.14);
        ctx.lineCap = 'round';
        ctx.beginPath();
        for (i = -2; i <= 2; i++) {
          xo = i * r * 0.32;
          ctx.moveTo(xo * 0.1, -r * 1.05);
          ctx.bezierCurveTo(xo * 1.4 + w, -r * 0.55, xo * 0.6 - w, -r * 0.15, xo + w * 0.5, r * 0.15);
          ctx.bezierCurveTo(xo * 1.3 - w, r * 0.45, xo * 0.6 + w, r * 0.75, xo * 0.1, r * 1.05);
        }
        ctx.stroke();
        ctx.restore();
        bodyPath(ctx, r, r * 0.95, r * 0.03);
        strokeIt(ctx, r, C.water.line);

        stem(ctx, r, r * 0.02, -r * 0.86, 0.25, r * 0.12, r * 0.2);

        face(ctx, r, { eyes: 'bean', nose: C.water.line, mouth: 'grin', blush: true });
      }
    }
  ];

  window.FRUIT_ART = FRUITS;
})();
