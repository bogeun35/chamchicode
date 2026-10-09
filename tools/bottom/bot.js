// 바위 밑바닥 밸런스 봇 — bottom.html 에 주입해서 처음부터 자동으로 플레이하며 성장 속도를 잰다.
//   await (await fetch('tools/bottom/bot.js?'+Date.now())).text().then(eval)
//   const log = await botPlay({ minutes: 120 })   // 게임 속 시간(분) 기준
// 이동은 추상화: 빈 칸은 걷기(220px/s), 바위는 실제 swing() 으로 깨서(치명·발동·에너지 소모·드롭 전부 원작 로직) 길을 만든다.
// 위로 올라가는 제약(점프 높이)은 무시하므로 실제보다 약간 낙관적인 값이다.
(function () {
  const B = window.bottom, TS = 16;
  function heapPush(h, item) { h.push(item); let i = h.length - 1; while (i > 0) { const p = (i - 1) >> 1; if (h[p][0] <= h[i][0]) break; [h[p], h[i]] = [h[i], h[p]]; i = p; } }
  function heapPop(h) { const top = h[0], last = h.pop(); if (h.length) { h[0] = last; let i = 0; for (;;) { const l = 2 * i + 1, r = l + 1; let m = i; if (l < h.length && h[l][0] < h[m][0]) m = l; if (r < h.length && h[r][0] < h[m][0]) m = r; if (m === i) break; [h[m], h[i]] = [h[i], h[m]]; i = m; } } return top; }
  function hitsFor(R, t) { if (t === 4 || t === 5) return 20; const hp = [0, 3, 5, 5, 4, 4, 4, 0][t] * B.LAYERS[R.layer].hp; return Math.ceil(hp / B.ST.damage()); }
  function plan(R, needChunks) {   // 다익스트라: 비용 = 휘두르기 수 (빈 칸 0.02)
    const W = R.w.W, H = R.w.H, T = R.w.T, sx = Math.floor(R.x / TS), sy = Math.floor((R.y - 4) / TS), RAD = 70;
    const dist = new Float64Array(W * H).fill(Infinity), prev = new Int32Array(W * H).fill(-1), h = [];
    const s0 = sy * W + sx; dist[s0] = 0; heapPush(h, [0, s0]);
    let best = null, bestScore = Infinity;
    const val = t => t === 2 || t === 3 ? 1 : t === 4 ? (needChunks ? 40 : 3) : t === 5 ? 60 : t === 6 ? 6 : 0;
    while (h.length) {
      const [d, i] = heapPop(h); if (d > dist[i]) continue;
      const x = i % W, y = (i / W) | 0, t = T[i];
      if (val(t) > 0 && i !== s0) { const sc = (d + 1) / val(t); if (sc < bestScore) { bestScore = sc; best = i; } }
      if (val(t) > 0 && i !== s0) continue;   // 광석·덩어리 너머로는 안 넓힘 (캐고 나서 다시 계획)
      for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
        const nx = x + dx, ny = y + dy; if (nx < 1 || ny < 0 || nx >= W - 1 || ny >= H - 2 || Math.abs(nx - sx) > RAD || Math.abs(ny - sy) > RAD) continue;
        const j = ny * W + nx, tt = T[j]; if (tt === 7) continue;
        const c = tt === 0 ? .02 : hitsFor(R, tt) + (val(tt) ? 0 : .3);
        if (d + c < dist[j]) { dist[j] = d + c; prev[j] = i; heapPush(h, [d + c, j]); }
      }
    }
    if (best == null) return null;
    const path = []; for (let i = best; i !== -1 && i !== s0; i = prev[i]) path.push(i);
    return path.reverse();
  }
  function nodeCostValue(n) { return B.costOf(n).reduce((a, [k, c, v]) => a + (k === 'gem' ? 0 : v / Math.max(1, B.S.cur[c])), 0); }
  function shop(log, simT) {
    let bought = 0;
    for (let guard = 0; guard < 400; guard++) {
      const cands = B.TREE.concat(B.TTREE || []).filter(n => (B.S.up[n.id] | 0) < n.max && B.prereqMet(n) && B.canBuy(n));
      if (!cands.length) break;
      cands.sort((a, b) => (b.pick ? 1 : 0) - (a.pick ? 1 : 0) || nodeCostValue(a) - nodeCostValue(b));
      const n = cands[0]; if (!B.buyNode(n)) break; bought++;
      if (n.pick) log.push(`${(simT / 60).toFixed(1)}분: ⛏️ ${n.n} (레벨 ${B.S.lvl})`);
    }
    return bought;
  }
  // 숨긴 탭에선 타이머가 느려지므로 동기로 돈다. 이어 돌리려면 reset:false (게임 속 시간·기록은 window.__bot 에 남음)
  window.botPlay = function ({ minutes = 60, reset = true, maxRuns = 400, verbose = false } = {}) {
    if (reset || !window.__bot) { B.reset(); window.__bot = { simT: 0, runs: 0, lastLayer: -1, log: [], rows: [] }; }
    const st = window.__bot, log = st.log, rows = st.rows; let simT = st.simT, runs = 0, lastLayer = st.lastLayer;
    while (simT < minutes * 60 && runs < maxRuns) {
      // 가장 깊이 열린 지역으로
      let L = 0; for (let i = 7; i >= 0; i--) if (B.layerUnlocked(i)) { L = i; break; }
      if (L !== lastLayer) { log.push(`${(simT / 60).toFixed(1)}분: 🔓 ${B.LAYERS[L].n} 시작 (레벨 ${B.S.lvl})`); lastLayer = L; }
      B.startRun(L); const R = B.R; let swings = 0, walk = 0; R.ending = 0;
      const need = !B.hasMaxChunks(L);
      for (let step = 0; step < 4000 && R.energy >= 2; step++) {
        const path = plan(R, need && !B.hasMaxChunks(L)); if (!path || !path.length) break;
        for (const i of path) {
          const x = i % R.w.W, y = (i / R.w.W) | 0;
          let g = 0; while (R.w.T[i] !== 0 && R.energy >= 2 && g++ < 400) { B.swing(x, y); swings++; }
          if (R.w.T[i] !== 0) break;
          walk += Math.hypot(x * TS + 8 - R.x, y * TS + 12 - R.y); R.x = x * TS + 8; R.y = y * TS + 15;
        }
      }
      const runT = swings * 0.4 / B.ST.speed() + walk / 220 + 12;   // 휘두르기 + 걷기 + 기지 왕복
      simT += runT; runs++;
      R.ending = 1; B.depositOres(); B.toHub();
      // 원정 동안 제련소가 돈 시간
      B.S.smeltT = Date.now() - runT * 1000; B.tickSmelt();
      const got = shop(log, simT);
      rows.push({ min: +(simT / 60).toFixed(1), run: runs, L, lvl: B.S.lvl, pick: B.S.pick, E: B.ST.maxEnergy(), dmg: +B.ST.damage().toFixed(2), spd: +B.ST.speed().toFixed(2), gold: B.S.cur[0], stone: B.S.cur[1], tok: B.S.cur[4], gems: B.S.gems.slice(0, 3).join('/'), bought: got, smelt: Object.values(B.S.smelt).reduce((a, b) => a + b, 0) });
      if (verbose) console.log(rows[rows.length - 1]);
    }
    st.simT = simT; st.runs += runs; st.lastLayer = lastLayer;
    return { log, rows, runs: st.runs, minutes: +(simT / 60).toFixed(1) };
  };
})();
