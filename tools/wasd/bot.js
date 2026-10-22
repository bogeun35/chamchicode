// WASD 시험 봇 — wasd.html 콘솔에 붙여 넣고 wasdBot.run(시작스테이지, 난이도, {enemies:false})
// 다람쥐는 1틱에 1/15 유닛 → 4틱(4/15 유닛) 격자에서 BFS 하면 꺾는 자리가 정확히 맞는다
window.wasdBot = (function () {
  const U = 4 / 15;
  function bfs(si, sx, sy, goal, lim) {
    const W = wasd, P = W.prep(si), key = (i, j) => i + ',' + j;
    const i0 = Math.round(sx / U), j0 = Math.round(sy / U), prev = new Map([[key(i0, j0), null]]), q = [[i0, j0]];
    const minI = Math.floor(P.x0 / U), maxI = Math.ceil(P.x1 / U), minJ = Math.floor(P.y0 / U), maxJ = Math.ceil(P.y1 / U);
    for (let h = 0; h < q.length && h < (lim || 400000); h++) {
      const [i, j] = q[h];
      if (goal(i * U, j * U) && h) { const path = []; let k = key(i, j); while (k) { path.push(k.split(',').map(Number)); k = prev.get(k); } return path.reverse(); }
      for (const [di, dj] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
        const ni = i + di, nj = j + dj, k = key(ni, nj); if (prev.has(k) || ni < minI || ni > maxI || nj < minJ || nj > maxJ) continue;
        if (W.wallAt(ni * U, nj * U, si)) { prev.set(k, undefined); continue; }
        prev.set(k, key(i, j)); q.push([ni, nj]);
      }
    }
    return null;
  }
  function drive(path) { // 경로 → 누름 + 틱 진행
    const W = wasd; let n = 0;
    for (let p = 1; p < path.length;) {
      const di = path[p][0] - path[p - 1][0], dj = path[p][1] - path[p - 1][1]; let len = 0;
      while (p < path.length && path[p][0] - path[p - 1][0] === di && path[p][1] - path[p - 1][1] === dj) { len++; p++; }
      const k = di > 0 ? 'D' : di < 0 ? 'A' : dj > 0 ? 'W' : 'S', inv = { W: 'S', S: 'W', A: 'D', D: 'A' };
      W.press(W.G.st.op ? inv[k] : k);   // 모래폭풍 안에서는 반대 키
      for (let k = 0; k < len * 4; k++) { W.tick(1); n++; if (!W.G.st.a) return { died: true, n }; }
    }
    return { n };
  }
  function clearStage(noEnemies) {
    const W = wasd, st = W.G.st, si = st.s, S = W.D.stages[si];
    if (noEnemies && W.G.E) { W.G.E.ents.length = 0; W.G.E.mills.length = 0; }
    const log = [];
    let left = S.coins.map((c, i) => i);
    while (left.length) {
      const path = bfs(si, st.x, st.y, (x, y) => left.some(i => (x - S.coins[i][0]) ** 2 + (y - S.coins[i][1]) ** 2 < .55));
      if (!path) return { ok: false, why: 'coin path', log };
      const r = drive(path); log.push(['coin', path.length, r]);
      if (r.died) return { ok: false, why: 'died', log };
      left = left.filter(i => !(st.cm & (1 << i)));
    }
    const path = bfs(si, st.x, st.y, (x, y) => W.finishAt(x, y, si));
    if (!path) return { ok: false, why: 'finish path', log };
    const r = drive(path); log.push(['finish', path.length, r]);
    return { ok: W.G.st.s !== si || !!W.G.st.end, log };
  }
  return {
    bfs, clearStage,
    run(stage = 1, diff = 1, opt = {}) {
      wasd.solo(stage, diff); const out = [];
      for (let s = stage; s <= wasd.D.stages.length; s++) {
        const r = clearStage(opt.enemies === false); out.push({ stage: s, ok: r.ok, why: r.why, deaths: wasd.G.st.d, T: wasd.G.st.T });
        if (!r.ok || wasd.G.st.end) break;
      }
      return { out, end: wasd.G.st.end };
    },
  };
})();
