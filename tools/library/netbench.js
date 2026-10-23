// 사서의 밤 멀티 부하 계측: 이 탭에서 혼자 방을 만들어 시작한 뒤, 가짜 사서 n명의
// 위치(초당 10번)와 요정(초당 8번)을 실제 Firebase 로 써 넣으면서 프레임 시간을 잰다.
// 사용: 콘솔에서 await libNet.setup(34) → await libNet.measure(3, 8)
// 끝나면 libNet.cleanup() (방 삭제)
window.libNet = {
  async setup(size = 34) {
    try { Sound.setBgmVolume(0); Sound.setSfxVolume(0); } catch (e) {}
    document.querySelector(`#sizeSeg button[data-v="${size}"]`).click();
    document.getElementById('btnCreate').click();
    await new Promise(r => setTimeout(r, 2500));
    document.getElementById('lbStart').click();
    for (let i = 0; i < 100 && !lib.LIB; i++) await new Promise(r => setTimeout(r, 100));
    await new Promise(r => setTimeout(r, 3000));
    // 게임 중반처럼: 모든 책이 바닥 어딘가로 옮겨진 상태
    const N = lib.NET(), up = {};
    lib.LIB.books.forEach((b, i) => { up[b.id] = `f,${(-8 + (i % 40) * .4).toFixed(2)},0.000,${(-3 + Math.floor(i / 40) * .08).toFixed(2)},0`; });
    await N.update('bk', up);
    return { code: N.code, books: lib.LIB.books.length };
  },
  async measure(fakes = 3, seconds = 8) {
    const N = lib.NET(), keys = Array.from({ length: fakes }, (_, i) => 'fake' + i);
    for (const [i, k] of keys.entries()) await N.set('players/' + k, { nick: '봇' + i, col: i + 1, ready: true, at: Date.now() });
    // 봇마다 책 한 권씩 듦
    for (const [i, k] of keys.entries()) await N.set('bk/' + i, 'h,' + k);
    let t = 0;
    const timer = setInterval(() => {
      t += .1;
      keys.forEach((k, i) => N.set('pos/' + k, { x: +(Math.sin(t + i) * 4).toFixed(2), y: 0, z: +(Math.cos(t + i) * 2).toFixed(2), yw: +(t % 6).toFixed(2), h: String(i) }));
    }, 100);
    const fairy = setInterval(() => N.update('fairy', { x: +(Math.sin(t) * 3).toFixed(2), y: 4, z: 0, on: 1 }), 120);
    // 화면이 가려져 rAF 가 안 돌 때도 잴 수 있게: 연이어 도는 메시지 작업이 얼마나 밀리는지(=메인 스레드가 바쁜 시간)
    const ch = new MessageChannel(); let busy = 0, last = performance.now(), run = true, worst = 0, rafN = 0;
    ch.port1.onmessage = () => { const now = performance.now(), d = now - last; last = now; if (d > 2) { busy += d - 1; worst = Math.max(worst, d); } if (run) ch.port2.postMessage(0); };
    ch.port2.postMessage(0);
    const raf = () => { rafN++; if (run) requestAnimationFrame(raf); }; requestAnimationFrame(raf);
    const t0 = performance.now();
    await new Promise(r => setTimeout(r, seconds * 1000));
    run = false; clearInterval(timer); clearInterval(fairy);
    const wall = performance.now() - t0;
    return { busyPct: +(busy / wall * 100).toFixed(1), worstMs: +worst.toFixed(1), rafFps: +(rafN / wall * 1000).toFixed(1) };
  },
  cleanup() { const N = lib.NET(); return N.ref('').remove(); }
};
