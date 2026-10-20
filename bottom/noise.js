// 바위 밑바닥 — Godot FastNoiseLite 와 같은 꼴의 노이즈 (Perlin · OpenSimplex2 · Cellular, FBM · Ridged 프랙탈)
// 원작 지형(C# TerrainManager)은 FastNoiseLite 를 그대로 쓴다. 값의 범위·문턱값이 같아야 동굴 비율이 같아지므로
// FNL 의 크기 보정(Perlin ×1.4248, 옥타브마다 seed+1, 진폭 합으로 나누기)을 똑같이 따른다.
(function (G) {
  'use strict';
  const PX = 501125321, PY = 1136930381;
  function hash(seed, xp, yp) { let h = (seed ^ xp ^ yp) | 0; h = Math.imul(h, 0x27d4eb2d); return h; }
  // FNL Gradients2D 처럼 128 방향 (단위 벡터에 가깝게)
  const GX = new Float32Array(128), GY = new Float32Array(128);
  for (let i = 0; i < 128; i++) { const a = (i + .5) / 128 * Math.PI * 2; GX[i] = Math.cos(a); GY[i] = Math.sin(a); }
  function gradDot(seed, xp, yp, xd, yd) { let h = hash(seed, xp, yp); h ^= h >> 15; h &= 127 << 1; h >>= 1; return xd * GX[h] + yd * GY[h]; }
  const quintic = t => t * t * t * (t * (t * 6 - 15) + 10);
  const lerp = (a, b, t) => a + t * (b - a);
  function perlin(seed, x, y) {
    let x0 = Math.floor(x), y0 = Math.floor(y);
    const xd0 = x - x0, yd0 = y - y0, xd1 = xd0 - 1, yd1 = yd0 - 1, xs = quintic(xd0), ys = quintic(yd0);
    x0 = Math.imul(x0, PX); y0 = Math.imul(y0, PY); const x1 = (x0 + PX) | 0, y1 = (y0 + PY) | 0;
    const xf0 = lerp(gradDot(seed, x0, y0, xd0, yd0), gradDot(seed, x1, y0, xd1, yd0), xs);
    const xf1 = lerp(gradDot(seed, x0, y1, xd0, yd1), gradDot(seed, x1, y1, xd1, yd1), xs);
    return lerp(xf0, xf1, ys) * 1.4247691104677813;
  }
  // OpenSimplex2 (2D, FNL 의 기울인 격자 방식과 같은 꼴, 결과 ±1 근처)
  const SQ3 = 1.7320508075688772, G2 = (3 - SQ3) / 6, F2 = 0.5 * (SQ3 - 1);
  function simplex(seed, x, y) {
    const s = (x + y) * F2; x += s; y += s;
    let i = Math.floor(x), j = Math.floor(y); const xi = x - i, yi = y - j;
    const t = (xi + yi) * G2, x0 = xi - t, y0 = yi - t;
    i = Math.imul(i, PX); j = Math.imul(j, PY);
    let n = 0;
    let a = 0.5 - x0 * x0 - y0 * y0; if (a > 0) n += a * a * a * a * gradDot(seed, i, j, x0, y0);
    const c = 2 * (1 - 2 * G2) * (1 / G2 - 2) * t + (-2 * (1 - 2 * G2) * (1 - 2 * G2) + a);
    if (c > 0) { const x2 = x0 + (2 * G2 - 1), y2 = y0 + (2 * G2 - 1); n += c * c * c * c * gradDot(seed, (i + PX) | 0, (j + PY) | 0, x2, y2); }
    if (y0 > x0) { const x1 = x0 + G2, y1 = y0 + (G2 - 1), b = 0.5 - x1 * x1 - y1 * y1; if (b > 0) n += b * b * b * b * gradDot(seed, i, (j + PY) | 0, x1, y1); }
    else { const x1 = x0 + (G2 - 1), y1 = y0 + G2, b = 0.5 - x1 * x1 - y1 * y1; if (b > 0) n += b * b * b * b * gradDot(seed, (i + PX) | 0, j, x1, y1); }
    return n * 99.83685446303647;
  }
  // Cellular (유클리드, jitter 1): ret 1 = Distance(F1-1), 2 = Distance2(F2-1)
  function cellular(seed, x, y, ret) {
    const xr = Math.round(x), yr = Math.round(y); let d0 = 1e9, d1 = 1e9;
    for (let xi = xr - 1; xi <= xr + 1; xi++) for (let yi = yr - 1; yi <= yr + 1; yi++) {
      const h = hash(seed, Math.imul(xi, PX), Math.imul(yi, PY));
      const jx = ((h & 0xffff) / 65535 - .5) * 0.86, jy = (((h >>> 16) & 0xffff) / 65535 - .5) * 0.86;   // FNL: jitter × 0.43701595 × 2
      const vx = xi - x + jx, vy = yi - y + jy, d = vx * vx + vy * vy;
      if (d < d0) { d1 = d0; d0 = d; } else if (d < d1) d1 = d;
    }
    d0 = Math.sqrt(d0); d1 = Math.sqrt(d1);
    return (ret === 2 ? d1 : d0) - 1;
  }
  // make({type:'perlin'|'simplex'|'cellular', seed, freq, fractal:'none'|'fbm'|'ridged', oct, lac, gain, ret})
  function make(o) {
    const type = o.type || 'perlin', seed0 = o.seed | 0, f = o.freq == null ? 0.01 : o.freq, fr = o.fractal || 'none', oct = o.oct || 3, lac = o.lac || 2, gain = o.gain == null ? .5 : o.gain, ret = o.ret || 1;
    const one = type === 'perlin' ? perlin : type === 'simplex' ? simplex : (s, x, y) => cellular(s, x, y, ret);
    let amp = gain, ampF = 1; for (let i = 1; i < oct; i++) { ampF += amp; amp *= gain; } const bound = 1 / ampF;
    const get = (x, y) => {
      x *= f; y *= f;
      if (fr === 'none') return one(seed0, x, y);
      let sum = 0, a = bound, s = seed0;
      for (let i = 0; i < oct; i++) {
        const n = one(s++, x, y);
        sum += (fr === 'ridged' ? (Math.abs(n) * -2 + 1) : n) * a;
        x *= lac; y *= lac; a *= gain;
      }
      return sum;
    };
    return { get, get1: x => get(x, 0) };
  }
  // System.Random 대신 쓰는 시드 난수 (Next(a,b) · NextDouble)
  function rand(seed) {
    let s = (seed >>> 0) || 1;
    const f = () => { s = (s + 0x6D2B79F5) >>> 0; let t = s; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
    f.next = (a, b) => a + Math.floor(f() * (b - a));
    return f;
  }
  // C# Hash(x, y) 장식용 결정적 해시 (0..1)
  function hash01(x, y) { let h = Math.imul((x * 1000) | 0, 374761393) ^ Math.imul((y * 1000) | 0, 668265263); h = Math.imul(h ^ (h >>> 13), 1274126177); return ((h ^ (h >>> 16)) >>> 0) / 4294967296; }
  G.RBNoise = { make, rand, hash01 };
})(typeof window !== 'undefined' ? window : globalThis);
