// WASD 멀티 지연 계측 — 참가자 탭 콘솔에서 wasdNet.measure(12) (방장 탭은 wasd.G.god = true 로 안 죽게)
// srv  = 키를 누른 뒤 방장 상태(G.st)에 그 방향이 들어오기까지 (ms)
// disp = 키를 누른 뒤 내 화면의 다람쥐 방향이 바뀌기까지 (ms)
// jump = 화면 한 프레임(16ms) 이동량 — 보통 0.064칸, 0.2칸 넘으면 '순간이동', 이동 중 0 이면 '멈칫'
window.wasdNet = (function () {
  const F = { W: 1, A: 2, S: 4, D: 8 }, sleep = ms => new Promise(r => setTimeout(r, ms));
  const dirOf = (k, op) => wasd.keyToDir(F[k], op);
  const stat = a => { const v = a.filter(x => x != null).sort((x, y) => x - y); if (!v.length) return null; return { n: v.length, min: Math.round(v[0]), med: Math.round(v[v.length >> 1]), p90: Math.round(v[Math.floor(v.length * .9)]), max: Math.round(v[v.length - 1]) }; };
  async function measure(n = 12, gap = 700) {
    const G = wasd.G, keys = 'WASD'.split('').filter(k => G.myKeys & F[k]);
    if (keys.length < 2) return '키가 2개 이상이어야 방향 바뀜을 잴 수 있어요';
    const res = [], ivals = [], moves = []; let lastRecv = G.recv, px = G.disp.x, py = G.disp.y;
    const iv = setInterval(() => { if (G.recv !== lastRecv) { ivals.push(G.recv - lastRecv); lastRecv = G.recv; } }, 2);
    const corrs = [];
    const rv = setInterval(() => { wasd.render(); moves.push(Math.hypot(G.disp.x - px, G.disp.y - py)); px = G.disp.x; py = G.disp.y; if (G.corr) corrs.push(Math.hypot(G.corr.x, G.corr.y)); }, 16);
    for (let i = 0; i < n; i++) {
      const k = keys[i % keys.length], want = dirOf(k, G.st.op), t0 = performance.now();
      wasd.press(k);
      let tSrv = null, tDisp = null;
      while (performance.now() - t0 < gap) {
        await sleep(2);
        if (tSrv == null && G.st.dx === want[0] && G.st.dy === want[1]) tSrv = performance.now() - t0;
        const v = wasd.viewDir ? wasd.viewDir() : [G.st.dx, G.st.dy];
        if (tDisp == null && v[0] === want[0] && v[1] === want[1]) tDisp = performance.now() - t0;
      }
      res.push({ k, srv: tSrv, disp: tDisp });
    }
    clearInterval(iv); clearInterval(rv);
    const mv = moves.slice(2);
    return { srv: stat(res.map(r => r.srv)), disp: stat(res.map(r => r.disp)), stateGap: stat(ivals), ping: Math.round(G.ping || 0),
      rtt: Math.round(G.rtt || 0), maxCorr: corrs.length ? +Math.max(...corrs).toFixed(2) : null, jumps: mv.filter(x => x > .2).length, stalls: mv.filter(x => x < .005).length, frames: mv.length, maxJump: +Math.max(...mv).toFixed(2) };
  }
  return { measure };
})();
