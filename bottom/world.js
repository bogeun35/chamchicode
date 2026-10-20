// 바위 밑바닥 — 광산 지형 생성 (원작 C# TerrainManager.GenerateTerrain 그대로: 512×1024칸)
// 근거: game-re-tools/rockbottom/spec/world.md (tm_gen.txt · tm_all.txt IL), 레이어 값 = InitializeLayerConfigs
// 타일: 0 빈칸 · 1 돌 · 3 구름(폭풍 봉우리) · 5 버섯 갓 · 6 버섯 줄기 · 8 수정 덩어리 · 9 구조물 벽돌 · 10 기반암(최종층 바닥)
// 광석: OR[i] = 1 그 지역 광석, 2 금(폭풍 봉우리의 두 번째 광석)
(function (G) {
  'use strict';
  const N = G.RBNoise;
  const W = 512, H = 1024, OX = 256;                 // 월드 x -256..255 → 배열 x+256 (원작 MapLeft/Right)
  const TW = 768, TOX = 384;                          // C# 배열 폭 768 (WorldOffsetX 384) — 섬·구조물 좌표 계산용
  const D = (o) => Object.assign({ freq: .04, thr: .55, sb: 5, sa: 8, gen: 0, sec: 0, lcS: .015, lcV: .08, lcT: .42, lcP: .03, wrF: .03, wrT: .45, wrW: 12, wrD: .003,
    mush: 0, mushW: [8, 30], mushSW: [2, 4], mushSH: [6, 15], stN: [120, 160], stDist: 20, stDepth: 40, stMargin: 60, grass: .4, flower: .08, hang: .15, hangH: [1, 12], deco2: .08, water: 0 }, o);
  const LAYER_GEN = [
    D({ freq: .04, thr: .55, sb: 5, sa: 8, grass: .4, flower: .08, hang: .15, hangH: [2, 10] }),                                                   // 0 Sunken Canopy
    D({ freq: .05, thr: .5, sb: 10, sa: 12, mush: 80, grass: 0, flower: 0, hang: 0, deco2: 0 }),                                                  // 1 Spore-Light Caverns
    D({ freq: .04, thr: .5, sb: 50, sa: 10, gen: 1, sec: .25, grass: .35, flower: .05, hang: 0, stN: [30, 50], stDist: 80, stMargin: 50, stDepth: 100 }),   // 2 Storm Peaks
    D({ freq: .04, thr: .5, sb: 5, sa: 4, gen: 2, lcS: .006, lcV: .035, lcT: .58, lcP: .015, grass: .18, flower: 0, hang: 0, deco2: 0, stN: [80, 120], stDist: 60, stMargin: 40, stDepth: 50 }),   // 3 Crystal
    D({ freq: .04, thr: .5, sb: 5, sa: 4, gen: 2, lcS: .006, lcV: .035, lcT: .58, lcP: .015, grass: 0, flower: 0, hang: 0, deco2: 0, molten: 1, stN: [80, 120], stDist: 60, stMargin: 40, stDepth: 50 }),   // 4 Molten Core
    D({ freq: .04, thr: .5, sb: 5, sa: 4, gen: 4, wrF: .025, wrT: .62, wrW: 10, wrD: .004, water: 1, grass: .95, flower: 0, hang: 0, deco2: 0, stN: [80, 120], stDist: 60, stMargin: 40, stDepth: 50 }),   // 5 Wispy Waters
    D({ freq: .032, thr: .54, sb: 5, sa: 4, gen: 2, lcS: .01, lcV: .052, lcT: .45, lcP: .014, grass: .22, flower: 0, hang: 0, deco2: 0, stN: [55, 85], stDist: 80, stMargin: 40, stDepth: 70 }),   // 6 Void
    D({ freq: .026, thr: .46, sb: 5, sa: 4, gen: 2, lcS: .008, lcV: .042, lcT: .35, lcP: .008, grass: 0, flower: 0, hang: 0, deco2: 0, boss: 1, stN: [35, 60], stDist: 110, stMargin: 40, stDepth: 90 }),   // 7 Core of the World
  ];
  // 구조물(structure_1.tscn) 벽돌 모양: x -1..7, y -2..6 / 상자 = (3, 4)
  const STRUCT = ['..#####..', '.#######.', '#########', '###...###', '##.....##', '##.....##', '##.....##', '#########', '#########'];

  function generate(layer, seed, ctx) {
    const L = LAYER_GEN[layer], T = new Uint8Array(W * H), OR = new Uint8Array(W * H), SI = new Int16Array(W * H).fill(-1);
    const id = (x, y) => y * W + x + OX, inMap = (x, y) => x >= -256 && x < 256 && y >= 0 && y < H;
    const cave = N.make({ type: 'perlin', seed, freq: L.freq, fractal: 'fbm', oct: 4 });
    const surfN = N.make({ type: 'perlin', seed, freq: .02, fractal: 'fbm', oct: 6 });
    const surf = new Float32Array(W); for (let x = -256; x < 256; x++) surf[x + OX] = L.sb + surfN.get1(x) * L.sa;
    const surfAt = x => x >= -256 && x < 256 ? surf[x + OX] : L.sb + surfN.get1(x) * L.sa;
    const set = (x, y, t) => { if (inMap(x, y)) T[id(x, y)] = t; };
    const get = (x, y) => inMap(x, y) ? T[id(x, y)] : 0;

    if (L.gen === 1) genIslands(); else if (L.gen === 2) genLowCeiling(); else if (L.gen === 4) genWarped(); else genStandard();
    if (L.mush) genMushrooms();
    genOres();
    let chunks = genGems();
    const structs = genStructures();
    chunks = chunks.filter(([x, y]) => T[id(x, y)] === 8);
    let boss = null; if (L.boss) boss = genBossArena();
    return { W, H, OX, T, OR, SI, surf, structs, chunks, boss, layer, seed, cfg: L, HP: new Float32Array(W * H), HITS: new Uint8Array(W * H) };

    // GenType 0 — CalculateIsSolid: 지표 아래이고 (cave+1)/2 ≤ 문턱이면 돌
    function genStandard() {
      for (let y = 0; y < H; y++) for (let x = -256; x < 256; x++) {
        if (y < surfAt(x)) continue;
        if ((cave.get(x, y) + 1) / 2 > L.thr) continue;
        T[id(x, y)] = 1;
      }
    }
    // GenType 1 — 떠 있는 섬 + 구름(타입 3) + 섬 다리
    function genIslands() {
      const rng = N.rand(seed), cloud = N.make({ type: 'simplex', seed: seed + 2000, freq: .025, fractal: 'fbm', oct: 3 }), warp = N.make({ type: 'simplex', seed: seed + 1000, freq: .08 });
      for (let x = -256; x < 256; x++) for (let y = 0; y < H; y++) {
        const d = 1 - y / 1024; if (d <= .3) break;
        const n = cloud.get(x, y) + cloud.get(2 * x, 2 * y) * .3;
        if (n > .45 - d * .15) T[id(x, y)] = 3;
      }
      for (let k = 0; k < 1200; k++) {
        const cx = rng.next(50, TW - 50) - TOX, cy = rng.next(50, H - 50), parts = rng.next(3, 7);
        for (let p = 0; p < parts; p++) {
          const w = rng.next(4, 11), h = rng.next(10, 26), ox = rng.next(-6, 7), oy = rng.next(-8, 9), a = (rng() - .5) * Math.PI / 6, c = Math.cos(a), s = Math.sin(a);
          const px = cx + ox, py = cy + oy, R = Math.ceil(Math.hypot(w, h) / 2) + 4;
          for (let dy = -R; dy <= R; dy++) for (let dx = -R; dx <= R; dx++) {
            const x = px + dx, y = py + dy; if (!inMap(x, y)) continue;
            const along = dx * c + dy * s, perp = -dx * s + dy * c, wx = warp.get((x + TOX) * .5, y * .5) * 3, wy = warp.get((x + TOX) * .5 + 100, y * .5) * 3;
            if (Math.abs(along) <= w / 2 + wx && Math.abs(perp) <= h / 2 + wy) T[id(x, y)] = 1;
          }
        }
      }
      const br = N.make({ type: 'simplex', seed: seed + 3000, freq: .1 });
      for (let x = -255; x < 255; x++) for (let y = 1; y < H - 1; y++) {
        const i = id(x, y); if (T[i]) continue;
        if ((T[i - 1] === 1 || T[i + 1] === 1 || T[i - W] === 1 || T[i + W] === 1) && br.get(x, y) > .6) T[i] = 1;
      }
    }
    // GenType 2 — 낮은 천장 지층 (+ 용암 핵심의 터널 깎기)
    function genLowCeiling() {
      const strata = N.make({ type: 'simplex', seed, freq: L.lcS, fractal: 'fbm', oct: 4 }), vert = N.make({ type: 'simplex', seed: seed + 500, freq: L.lcV, fractal: 'fbm', oct: 3 });
      const detail = N.make({ type: 'simplex', seed: seed + 1500, freq: .03, fractal: 'fbm', oct: 2 }), pillar = N.make({ type: 'cellular', seed: seed + 2500, freq: .06 });
      const Tt = L.lcT;
      for (let y = 0; y < H; y++) for (let x = -256; x < 256; x++) {
        if (y < surfAt(x)) continue;
        const v = vert.get(x * .5, y), n = ((strata.get(x, y * 1.8) * .7 + v * .3) + 1) / 2;
        let solid;
        if (n > Tt) solid = false; else if (n > Tt * .85) solid = !((detail.get(x, y * 2) + 1) / 2 > .82); else solid = true;
        if (!solid && n > Tt + .1 && (pillar.get(x, y) + 1) / 2 < L.lcP * 3) solid = true;
        if (solid) T[id(x, y)] = 1;
      }
      if (L.molten) {
        const n0 = N.make({ type: 'simplex', seed: seed + 9301, freq: .026, fractal: 'fbm', oct: 3 }), n1 = N.make({ type: 'simplex', seed: seed + 9302, freq: .01, fractal: 'fbm', oct: 2 }), n2 = N.make({ type: 'simplex', seed: seed + 9303, freq: .06, fractal: 'fbm', oct: 2 });
        for (let y = 1; y < H - 1; y++) for (let x = -255; x < 255; x++) {
          const i = id(x, y); if (!T[i] || T[i] === 3) continue;
          const depth = y - surfAt(x); if (depth < 8) continue;
          const wx = n1.get(x, y) * 26, wy = n1.get(x + 250, y - 170) * 18, width = .022 + ((n2.get(x, y) + 1) * .5) * .018;
          const a = Math.abs(n0.get(x + wx, (y + wy) * .68)), b = Math.abs(n0.get((x + wx) * .72 + 420, (y + wy) - 260));
          if (a < width || (depth > 24 && b < width * .85)) T[i] = 0;
        }
      }
    }
    // GenType 4 — 왜곡 능선 (희미한 물)
    function genWarped() {
      const ridge = N.make({ type: 'simplex', seed, freq: L.wrF, fractal: 'ridged', oct: 4 }), warp = N.make({ type: 'simplex', seed: seed + 300, freq: L.wrF * .8, fractal: 'fbm', oct: 3 });
      const blend = N.make({ type: 'perlin', seed: seed + 900, freq: .008, fractal: 'fbm', oct: 2 }), cell = N.make({ type: 'cellular', seed: seed + 1800, freq: L.wrF * 1.5, ret: 2 });
      const open = N.make({ type: 'simplex', seed: seed + 4200, freq: .005, fractal: 'fbm', oct: 3, gain: .4 });
      for (let y = 0; y < H; y++) for (let x = -256; x < 256; x++) {
        if (y < surfAt(x)) continue;
        const wx = x + warp.get(x, y) * L.wrW, wy = y + warp.get(y, x) * L.wrW;
        const r = (ridge.get(wx, wy) + 1) / 2, b = (blend.get(x, y) + 1) / 2;
        const v = b > .6 ? r + ((cell.get(wx, wy) + 1) / 2 - r) * ((b - .6) / .4) : r;
        const depth = y - surfAt(x);
        let thr = L.wrT * (1 - Math.min(.4, Math.max(0, depth * L.wrD)));
        const o = (open.get(x, y * .6) + 1) / 2, dd = Math.min(1, Math.max(0, depth * .006));
        if (o > .62 && dd > .3) thr *= 1 - ((o - .62) / .38 * dd) * .7;
        if (v < thr) T[id(x, y)] = 1;
      }
    }
    // 버섯 플랫폼 (포자빛 동굴, 80개): 갓 = 5, 줄기 = 6
    function genMushrooms() {
      const rng = N.rand(seed + 5000); let ok = 0;
      for (let tr = 0; tr < L.mush * 80 && ok < L.mush; tr++) {
        const r = Math.floor(rng.next(L.mushW[0], L.mushW[1] + 1) / 2), sh = rng.next(L.mushSH[0], L.mushSH[1] + 1), ang = Math.PI + (rng() - .5) * Math.PI / 2;
        const m = r + sh + 10, cx = rng.next(m + 15, TW - m - 15) - TOX, cy = rng.next(m + 50, H - m - 50), sw = Math.floor(rng.next(L.mushSW[0], L.mushSW[1] + 1) / 2);
        const c = Math.cos(ang), s = Math.sin(ang), B = r + sh + 2;
        let capN = 0, capE = 0, stN = 0, stS = 0;
        for (let dy = -B; dy <= B; dy++) for (let dx = -B; dx <= B; dx++) {
          const u = dx * c + dy * s, v = -dx * s + dy * c, t = get(cx + dx, cy + dy);
          if (v >= -.71 && Math.hypot(u, v) <= r + .71) { capN++; if (!t) capE++; }
          if (v >= -(sh + 2) && v < -(sh - 3) && Math.abs(u) <= sw + 1.5) { stN++; if (t === 1) stS++; }
        }
        if (!capN || capE / capN < .7 || !stN || stS / stN < .6) continue;
        for (let dy = -B; dy <= B; dy++) for (let dx = -B; dx <= B; dx++) {
          const u = dx * c + dy * s, v = -dx * s + dy * c, x = cx + dx, y = cy + dy; if (!inMap(x, y)) continue;
          if (v >= -.71 && Math.hypot(u, v) <= r + .71) T[id(x, y)] = 5;
          else if (v >= -(sh + .71) && v < .71 && Math.abs(u) <= sw + .71) T[id(x, y)] = 6;
        }
        ok++;
      }
    }
    // GenerateOreClusters: 같은 동굴 노이즈를 2배로 → 0.35 넘는 돌이 광석 (문턱은 상수, 지역 OreThreshold 미사용)
    function genOres() {
      const rng = N.rand(seed + 500);
      for (let y = 0; y < H; y++) { if (y < L.sb + 5) continue; for (let x = -256; x < 256; x++) {
        const i = id(x, y); if (T[i] !== 1) continue;
        if (cave.get(x * 2, y * 2 + 1000) > .35) OR[i] = L.sec > 0 && rng() < L.sec ? 2 : 1;
      } }
    }
    // GenerateGemBlocks: 지역 레벨 구간 진행도 t 에 따라 개수 ×(1+2t²), 중앙으로 몰림, 부족분 보장
    function genGems() {
      const owned = ctx.gems | 0, required = ctx.required | 0, lvl = ctx.lvl || 1;
      const lo = layer * 10 + 1, hi = layer === 0 ? 5 : (layer + 1) * 10, t = Math.min(1, Math.max(0, (lvl - lo) / (hi - lo)));
      let mult = 1 + 2 * t * t; if (layer === 0) mult = Math.max(mult, 1.5);
      const rng = N.rand(seed + layer * 1000), deficit = Math.max(0, required - owned);
      const count = Math.max(Math.ceil(rng.next(4, 7) * mult), deficit), out = [];
      const bias = t > .05 || layer === 0, maxDist = t >= .8 ? 100 : t >= .5 ? 200 : 384;
      const free = (x, y) => { const tt = get(x, y); if ((tt !== 1 && tt !== 4) || OR[id(x, y)]) return false; for (const [a, b] of out) if (Math.abs(a - x) < 25 && Math.abs(b - y) < 25) return false; return true; };
      for (let k = 0; k < count; k++) {
        let pos = null;
        for (let tr = 0; tr < 20000 && !pos; tr++) {
          const x = rng.next(20, TW - 20) - TOX, y = rng.next(20, H - 20);
          if (!inMap(x, y) || !free(x, y)) continue;
          if (bias) { const ax = Math.abs(x); if (ax > maxDist) continue; const w = .1 + (1 - ax / maxDist) ** 2 * 10; if (rng() * 10.1 > w) continue; }
          pos = [x, y];
        }
        if (!pos) {   // 대체: 모든 후보를 가운데 가중치로 추첨
          let tot = 0; const cand = [];
          for (let y = 20; y < H - 20; y += 2) for (let x = -256; x < 256; x += 2) if (free(x, y)) { const w = .1 + (1 - Math.abs(x) / 384) * 5; tot += w; cand.push([x, y, tot]); }
          if (!cand.length) break; const r = rng() * tot; pos = cand.find(c => c[2] >= r) || cand[cand.length - 1];
        }
        T[id(pos[0], pos[1])] = 8; OR[id(pos[0], pos[1])] = 0; out.push([pos[0], pos[1]]);
      }
      return out;
    }
    // GenerateStructurePositions + ClearTerrainForStructure: 벽돌 상자 구조물
    function genStructures() {
      const rng = N.rand(seed + 5000), target = rng.next(L.stN[0], L.stN[1] + 1), pos = [];
      for (let tr = 0; tr < 1000 && pos.length < target; tr++) {
        const x = rng.next(L.stMargin, TW - L.stMargin) - TOX, y = rng.next(L.stDepth, H - 100);
        if (pos.some(p => Math.hypot(p.x - x, p.y - y) < L.stDist)) continue;
        if (!get(x, y)) continue;
        let s = 0; for (let dy = -2; dy <= 2; dy++) for (let dx = -2; dx <= 2; dx++) if (get(x + dx, y + dy)) s++;
        if (s < 15) continue;
        pos.push({ x, y });
      }
      const out = [];
      pos.forEach((p, k) => {
        for (let r = 0; r < 9; r++) { const row = STRUCT[r], a = row.indexOf('#'), b = row.lastIndexOf('#'); for (let c = a; c <= b; c++) { const x = p.x - 1 + c, y = p.y - 2 + r; if (!inMap(x, y)) continue; const i = id(x, y); T[i] = row[c] === '#' ? 9 : 0; OR[i] = 0; SI[i] = row[c] === '#' ? k : -1; } }
        out.push({ x: p.x, y: p.y, cx: p.x + 3, cy: p.y + 4, open: 0 });
      });
      return out;
    }
    // 최종층: 아레나 비우기 (seed 77077) + 기반암 y 1004..1023
    function genBossArena() {
      const n = N.make({ type: 'perlin', seed: 77077, freq: .16, fractal: 'fbm', oct: 3 }), ax = 0, ay = 990;
      for (let dy = -23; dy <= 23; dy++) for (let dx = -33; dx <= 33; dx++) {
        const x = ax + dx, y = ay + dy; if (y >= 1004 || !inMap(x, y)) continue;
        const ov = Math.sqrt((dx / 28) ** 2 + (dy / 18) ** 2), edge = 1 + n.get(x, y) * .18;
        if (ov <= edge) { const i = id(x, y); T[i] = 0; OR[i] = 0; SI[i] = -1; }
      }
      for (let y = 1004; y < H; y++) for (let x = -256; x < 256; x++) { const i = id(x, y); T[i] = 10; OR[i] = 0; SI[i] = -1; }
      return { x: 0, y: 999 };
    }
  }
  G.RBWorld = { generate, LAYER_GEN, STRUCT, W, H, OX };
})(typeof window !== 'undefined' ? window : globalThis);
