// 바늘 찾기 2인 협동 테스트: 방장(A) + 손님(B), 실제 Firebase games/nd_코드 (끝나면 방 지움)
const { chromium } = require('C:/Users/user/AppData/Roaming/npm/node_modules/rea-agents/node_modules/playwright-core');
const URL = process.argv[2] || 'http://127.0.0.1:8831/needle.html';
const sleep = ms => new Promise(r => setTimeout(r, ms));
let fails = 0; const ok = (c, m) => { console.log((c ? 'PASS ' : 'FAIL ') + m); if (!c) fails++; };
(async () => {
  const b = await chromium.launch({ executablePath: 'C:/Program Files/Google/Chrome/Application/chrome.exe', headless: true, args: ['--use-angle=d3d11', '--enable-gpu', '--ignore-gpu-blocklist', '--mute-audio'] });
  const mk = async (tag) => { const c = await b.newContext({ viewport: { width: 800, height: 500 } }); const p = await c.newPage(); p.errs = []; p.on('pageerror', e => p.errs.push(tag + ': ' + String(e).slice(0, 300))); p.on('response', r => { if (r.status() >= 400) p.errs.push(tag + ' HTTP ' + r.status() + ' ' + r.url()); }); p.on('console', m => { if (m.type() === 'error' || m.type() === 'warning') p.errs.push(tag + ' console: ' + m.text().slice(0, 200)); }); return p; };
  const A = await mk('A'), B = await mk('B');
  await A.goto(URL + '?mute'); await A.waitForFunction(() => window.needle);
  await A.evaluate(() => { document.getElementById('nkNick').value = '방장'; const N = window.needle; N.startGame(false); N.give(300); });
  await A.evaluate(() => window.needle.hostRoom());
  await A.waitForFunction(() => window.needle.NET.code, null, { timeout: 15000 });
  const code = await A.evaluate(() => window.needle.NET.code); console.log('room', code);
  await B.goto(URL + '?mute&room=' + code); await B.waitForFunction(() => window.needle);
  await B.evaluate(() => { document.getElementById('nkNick').value = '손님'; });
  await B.evaluate(c => window.needle.joinRoom(c), code);
  await B.waitForFunction(() => window.needle.NET.ready, null, { timeout: 20000 });
  await sleep(1500);
  const pa = await A.evaluate(() => window.needle.pileStrands()), pb = await B.evaluate(() => window.needle.pileStrands());
  ok(Math.abs(pa - pb) / pa < .002, `더미 같음 A ${Math.round(pa)} / B ${Math.round(pb)}`);
  ok(await B.evaluate(() => Math.abs(window.needle.S.money - 300) < 1), '손님이 방장 돈을 봄 ($300)');
  ok(await A.evaluate(() => window.needle.AV.size === 1) && await B.evaluate(() => window.needle.AV.size === 1), '서로의 모습이 보임');
  // 손님이 더미를 퍼서 HAY IN 에 던짐
  const dug0 = await A.evaluate(() => window.needle.S.dug);
  const scoop = await B.evaluate(() => { const N = window.needle, P = N.P; N.tp(-4.5, 5.5); const look = (x, y, z) => { const dx = x - P.x, dy = y - (P.y + 1.62), dz = z - P.z; N.look(Math.atan2(-dx, -dz), Math.atan2(dy, Math.hypot(dx, dz))); };
    let x = -4.5, z = 5.5; for (let s = 0; s < 8; s += .05) { const px = -4.5 + (1 + 4.5) * s / 8, pz = 5.5 + (-1.5 - 5.5) * s / 8; if (N.hAt(px, pz) > .5) { x = px; z = pz; break; } }
    N.tp(x - .8, z + 1); look(x, N.hAt(x, z), z); N.stepOnly(1 / 60, 2); const a = N.aim(); N.primary(0, true); return { load: P.load.n, aim: a && a.kind }; });
  ok(scoop.load > 0, `손님 손에 건초 ${scoop.load} (조준 ${scoop.aim})`);
  await sleep(1200);
  ok(await A.evaluate(d0 => window.needle.S.dug > d0, dug0), '방장 쪽 더미도 줄었음 (S.dug 증가)');
  const e0 = await A.evaluate(() => window.needle.S.earned);
  await B.evaluate(() => { const N = window.needle, P = N.P; N.tp(-8.6, 8.8); const tx = -10.2, ty = .75, tz = 10.1; const dx = tx - P.x, dy = ty - (P.y + 1.62), dz = tz - P.z; N.look(Math.atan2(-dx, -dz), Math.atan2(dy, Math.hypot(dx, dz))); N.stepOnly(1 / 60, 2); N.primary(0, true); });
  await sleep(9000);
  ok(await A.evaluate(e0 => window.needle.S.earned > e0, e0), '손님이 던진 건초가 방장 판매대에서 팔림');
  ok(await B.evaluate(() => window.needle.S.earned > 0), '손님 화면에도 번 돈이 반영됨');
  // 손님이 연구 구매
  await B.evaluate(() => window.needle.buy('hand_carry')); await sleep(1500);
  ok(await A.evaluate(() => window.needle.S.tech.hand_carry === 1), '손님 연구 구매 → 방장 상태에 반영');
  // 손님이 벨트 깔기
  await A.evaluate(() => window.needle.buy('belt')); await sleep(1200);
  const nb0 = await A.evaluate(() => window.needle.builds.length);
  await B.evaluate(() => { const N = window.needle; N.startBuild('belt'); const BM = N.BMs; BM.stage = 1; BM.a = { x: -6, y: .5, z: 4 }; BM.p = { x: -6, y: .5, z: 6.5 }; BM.ok = true; BM.cost = 3.75; N.buildClickNow(); });
  await sleep(1500);
  ok(await A.evaluate(n => window.needle.builds.length === n + 1, nb0), '손님이 깐 벨트가 방장 마당에 생김');
  ok(await B.evaluate(() => window.needle.builds.filter(b => !b.fixed).length === 1), '손님 화면에도 벨트가 보임');
  // 방장이 장난감 삽 사고 손님이 주움
  await B.keyboard.press('Escape'); await B.evaluate(() => { const m = document.getElementById('menu'); if (!m.classList.contains('hide')) document.getElementById('menuResume').click(); });
  await A.evaluate(() => window.needle.buy('toy_shovel')); await sleep(1200);
  const got = await B.evaluate(() => { const N = window.needle, P = N.P; const pr = N.props.find(q => q.kind === 'tool' && q.tool === 'toy'); if (!pr) return 'no prop'; N.tp(pr.x, pr.z + 1.3); const dx = pr.x - P.x, dy = pr.y + .1 - (P.y + 1.62), dz = pr.z - P.z; N.look(Math.atan2(-dx, -dz), Math.atan2(dy, Math.hypot(dx, dz))); N.stepOnly(1 / 60, 2); const a = N.aim(); N.interactNow(); return { hot: N.S.hotbar.join(','), aim: a && a.kind }; });
  await sleep(1500);
  ok(got.hot && got.hot.includes('toy'), `손님이 장난감 삽 주움 (${JSON.stringify(got)})`);
  ok(await A.evaluate(() => !window.needle.props.some(q => q.kind === 'tool' && q.tool === 'toy')), '방장 마당 팔레트에서 삽이 사라짐');
  // 손님이 양동이 들고 옮겨 놓기
  await A.evaluate(() => window.needle.buy('bucket')); await sleep(1500);
  const hold = await B.evaluate(() => { const N = window.needle, P = N.P; const pr = N.props.find(q => q.kind === 'bucket'); if (!pr) return 'no bucket'; N.tp(pr.x, pr.z + 1.2); const dx = pr.x - P.x, dy = pr.y + .2 - (P.y + 1.62), dz = pr.z - P.z; N.look(Math.atan2(-dx, -dz), Math.atan2(dy, Math.hypot(dx, dz))); N.stepOnly(1 / 60, 2); N.interactNow(); return { holding: !!P.holding, id: pr.id }; });
  await sleep(1200);
  ok(hold.holding && await A.evaluate(id => { const p = window.needle.props.find(q => q.id === id); return p && !!p.held && !p.g.visible; }, hold.id), '손님이 양동이를 듦 → 방장 화면에서 사라짐');
  await B.evaluate(() => { const N = window.needle; N.tp(-2, 12); N.look(0, -.3); N.stepOnly(1 / 60, 2); N.secondary(0, true); }); await sleep(1500);
  ok(await A.evaluate(id => { const p = window.needle.props.find(q => q.id === id); return p && !p.held && p.g.visible && Math.abs(p.x + 2) < 1.5; }, hold.id), '손님이 내려놓은 자리에 양동이가 보임');
  // 손님 나감 → 삽은 팔레트로 돌아옴
  await B.evaluate(() => window.needle.leaveRoom()); await sleep(2500);
  ok(await A.evaluate(() => Object.keys(window.needle.NET.players).length === 1), '손님 나감 → 방장 명단 1명');
  ok(await A.evaluate(() => window.needle.props.some(q => q.kind === 'tool' && q.tool === 'toy')), '나간 손님의 삽이 팔레트로 돌아옴');
  ok(await A.evaluate(() => window.needle.AV.size === 0), '나간 손님 모습 지워짐');
  await A.evaluate(() => window.needle.leaveRoom()); await sleep(800);
  const left = await A.evaluate(c => firebase.database().ref('games/nd_' + c).once('value').then(s => s.exists()), code);
  ok(!left, '방 닫으면 Firebase 방 지워짐');
  console.log('ALL ERRS', JSON.stringify([...A.errs, ...B.errs]));
  const errs = [...A.errs, ...B.errs].filter(e => !/pointer ?lock|requestPointerLock|WebGL|GPU stall|AudioContext/i.test(e));
  ok(!errs.length, '페이지 오류 없음' + (errs.length ? '\n  ' + errs.slice(0, 8).join('\n  ') : ''));
  console.log(fails ? `${fails}개 실패` : '모두 통과');
  await b.close(); process.exit(fails ? 1 : 0);
})();
