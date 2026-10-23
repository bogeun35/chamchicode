// ════════════ 사서의 밤 — 멀티 비전 도서관 정리 (원작 Librarian: Tidy Up the Arcane Library! 의 구조·규칙을 따름) ════════════
// 책장 칸 하나 = 제목 하나, 칸 폭 = 그 제목의 권수 · 권 번호 순서대로 왼쪽→오른쪽 · 맞으면 노란 빛, 책장은 맞지만 칸·순서가 틀리면 희미한 붉은 빛
// 2층 회랑 홀(1층 1A~1Q · 2층 2A~2Q) · 한 번에 10권 · 완성한 칸 2개마다 능력 포인트 · 열쇠로 상자 열기(보조 마법) · 회수의 돌 · 높이뛰기 허가 · 학장 평가
import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
const $ = id => document.getElementById(id);
const esc = s => String(s == null ? '' : s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const clamp = (v, a, b) => v < a ? a : v > b ? b : v;
function toast(m, ms) { const t = $('toast'); t.textContent = m; t.classList.add('on'); clearTimeout(toast._t); toast._t = setTimeout(() => t.classList.remove('on'), ms || 2400); }
function notice(m, ms) { const t = $('notice'); t.innerHTML = m; t.classList.add('on'); clearTimeout(notice._t); notice._t = setTimeout(() => t.classList.remove('on'), ms || 3000); }
function rng(seed) { let s = seed >>> 0 || 1; const f = () => { s = (s + 0x6D2B79F5) >>> 0; let t = s; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; f.i = (a, b) => a + Math.floor(f() * (b - a + 1)); return f; }
const DATA = window.LIB_DATA;
const PCOL = ['#ff8a5a', '#5ab4ff', '#8ee08a', '#ffd36b', '#d88aff', '#5ae0d0', '#ff7ab8', '#c8c8c8'];

// ════════════ 사운드 (짧은 합성음, 파티 사운드 볼륨 설정을 따름) ════════════
let AC = null;
function sfx(k, n = 0) {
  const vol = window.Sound ? Sound.sfxVolume : .6; if (!(vol > 0)) return;
  try { AC = AC || new AudioContext(); if (AC.state === 'suspended') AC.resume(); } catch (e) { return; }
  const t = AC.currentTime, tone = (f0, f1, d, type, v, dl = 0) => { const o = AC.createOscillator(), g = AC.createGain(); o.type = type; o.frequency.setValueAtTime(f0, t + dl); o.frequency.exponentialRampToValueAtTime(f1, t + dl + d); g.gain.setValueAtTime(v * vol, t + dl); g.gain.exponentialRampToValueAtTime(.0001, t + dl + d); o.connect(g); g.connect(AC.destination); o.start(t + dl); o.stop(t + dl + d + .02); };
  if (k === 'pick') tone(500, 700, .06, 'triangle', .12);
  else if (k === 'place') tone(300, 220, .08, 'triangle', .16);
  else if (k === 'good') { const m = Math.pow(2, Math.min(n, 12) / 12); tone(880 * m, 880 * m, .12, 'sine', .1); tone(1320 * m, 1320 * m, .16, 'sine', .08, .07); }
  else if (k === 'cat') [523, 659, 784, 1047, 784, 1047, 1319, 1568].forEach((f, i) => tone(f, f, .3, 'triangle', .11, i * .1));
  else if (k === 'row') [660, 880, 1100, 1320].forEach((f, i) => tone(f, f, .2, 'triangle', .12, i * .08));
  else if (k === 'no') tone(200, 150, .12, 'square', .06);
  else if (k === 'magic') tone(400, 1600, .35, 'sine', .1);
  else if (k === 'drop') tone(180, 120, .1, 'triangle', .14);
  else if (k === 'chest') [523, 659, 784, 1047, 1319].forEach((f, i) => tone(f, f, .25, 'triangle', .12, i * .09));
  else if (k === 'giggle') [1600, 2000, 1700, 2200, 1800].forEach((f, i) => tone(f, f * 1.1, .07, 'sine', .07, i * .06));
  else if (k === 'ping') { tone(1200, 1200, .08, 'sine', .1); tone(1600, 1600, .1, 'sine', .08, .08); }
}

// ════════════ 도서관 설계 (방 21 × 15 m · 2층 회랑 · 서쪽 겹계단) ════════════
const GAL_Y = 3.7;                                                               // 2층 바닥 높이
const CASE = { w: 2.1, d: .44, post: .06, colW: .96, rowH: .46, base: .12, levels: 6 };
const TABLES = [[-2.6, -1.4], [2.4, 1.4], [5.6, -1.2]];                          // 탁자 (가로 1.8 · 세로 1.0 · 높이 .82)
const STAIR = { n: 18, d: 8 / 18 };                                              // 계단 18단 (단 깊이 .444)
// 책장 자리: 층마다 북쪽 벽 6 · 남쪽 벽 6 (A·B 번갈아) · 동쪽 끝벽 5 (M~Q) — 원작 지도 배치
function caseSpots() {
  const out = [];
  for (const [fl, y] of [[1, 0], [2, GAL_Y]]) {
    const L = 'ABCDEFGHIJKLMNOPQ'; let k = 0;
    for (const x of [-4.6, -2.2, .2, 2.6, 5.0, 7.4]) { out.push({ fl, x, y, z: -7.1 + CASE.d / 2, ry: 0, lab: fl + L[k++] }); out.push({ fl, x, y, z: 7.1 - CASE.d / 2, ry: Math.PI, lab: fl + L[k++] }); }
    for (const z of [-4.4, -2.2, 0, 2.2, 4.4]) out.push({ fl, x: 10.1 - CASE.d / 2, y, z, ry: -Math.PI / 2, lab: fl + L[k++] });
  }
  return out;
}
const SPOTS = caseSpots();
// 책장 안쪽 좌표 → 세계 좌표
function toWorld(C, lx, ly, lz) { const c = Math.cos(C.ry), s = Math.sin(C.ry); return [C.x + lx * c + lz * s, C.y + ly, C.z - lx * s + lz * c]; }
function caseBox(C, h) { const hw = CASE.w / 2, hd = CASE.d / 2, side = Math.abs(Math.sin(C.ry)) > .5; return side ? [C.x - hd, C.y, C.z - hw, C.x + hd, C.y + h, C.z + hw] : [C.x - hw, C.y, C.z - hd, C.x + hw, C.y + h, C.z + hd]; }
const caseH = C => CASE.base + C.levels * CASE.rowH + .12;

// 권수 분포 (원작: 제목 400개 · 책 3,072권 → 평균 7.7권, 최대 10권)
const VOL_CUM = [.03, .06, .10, .15, .22, .31, .42, .56, .72, 1];
const LEATHER = ['#6e1f1f', '#1f2c4e', '#24452e', '#5a3a22', '#1e1a18', '#5a1a2e', '#1f4a4a', '#7a5a1e', '#3a4a5a', '#4a2a5a', '#4a4a1e', '#8a2a1a', '#2a2a3a', '#d8cbb0', '#9a3a2a', '#2e5a3a', '#3a2a1a', '#6a5a8a', '#b8a070', '#1a3a5a'];
const ACCENT = ['#e8c46a', '#e8c46a', '#d8d8d8', '#e0a070', '#f4ead0'];
const SIZES = { 4: '작은 서고', 8: '중간 서고', 16: '대도서관', 34: '원작 크기' };
function buildLibrary(size, seed) {
  const R = rng(seed), nCat = size === 34 ? 34 : size;
  let cats; if (nCat === 34) cats = DATA.map((c, i) => i); else { cats = DATA.map((c, i) => i); for (let i = cats.length - 1; i > 0; i--) { const j = Math.floor(R() * (i + 1)); [cats[i], cats[j]] = [cats[j], cats[i]]; } cats = cats.slice(0, nCat); }
  const cases = [], titles = [], books = [];
  cats.forEach((ci, k) => {
    const sp = SPOTS[k], C = Object.assign({ i: k, cat: ci, name: DATA[ci].n, comps: [], levels: CASE.levels }, sp);
    // 제목마다 장정 · 크기 · 권수
    const my = DATA[ci].t.map(name => {
      const r = R(), vols = VOL_CUM.findIndex(c => r < c) + 1, ti = titles.length;
      const T = { i: ti, name, cat: ci, caseI: k, vols, col: LEATHER[Math.floor(R() * LEATHER.length)], col2: LEATHER[Math.floor(R() * LEATHER.length)], acc: ACCENT[Math.floor(R() * ACCENT.length)], style: Math.floor(R() * 6), w: .055 + R() * .03, h: .28 + R() * .12, d: .2 + R() * .08 };
      titles.push(T); for (let v = 1; v <= vols; v++) books.push({ id: books.length, t: ti, v }); return T;
    });
    // 칸 나누기: 단(층) × 2열, 제목마다 권수만큼의 폭을 가진 칸 하나 (큰 것부터 먼저 채움)
    const shelves = []; for (let lv = 0; lv < 7; lv++) for (let col = 0; col < 2; col++) shelves.push({ col, lv, used: 0 });
    const order = my.slice().sort((a, b) => b.vols * b.w - a.vols * a.w);
    for (const T of order) {
      const w = T.vols * T.w + .016, sh = shelves.find(s => s.lv < 7 && s.used + w + (s.used ? .02 : 0) <= CASE.colW);
      const x0 = sh.used + (sh.used ? .02 : 0); sh.used = x0 + w;
      C.comps.push({ k: C.comps.length, col: sh.col, lv: sh.lv, x0, w, size: T.vols, sw: w / T.vols });
    }
    C.levels = Math.max(CASE.levels, 1 + Math.max(...C.comps.map(c => c.lv)));
    // 칸 순서 섞기 (같은 단 안에서 칸 위치는 그대로, 어느 제목 자리인지 티 나지 않게)
    cases.push(C);
  });
  // 처음 놓인 자리: 홀 바닥 · 탁자 위 · (원작 크기) 2층 회랑에 흩어진 책더미
  const obs = cases.map(C => caseBox(C, 4)).concat([[-9.9, 0, -4.6, -6.0, 9, 4.6]]);
  for (let i = -1; i <= 1; i++) for (const z of [-4.4, 4.4]) obs.push([-5.9 + (i + 1) * 4.5 - .3, 0, z - .3, -5.9 + (i + 1) * 4.5 + .3, 9, z + .3]);
  const inObs = (x, y, z) => obs.some(o => y >= o[1] - .01 && y < o[4] && x > o[0] - .35 && x < o[3] + .35 && z > o[2] - .35 && z < o[5] + .35);
  const onTable = (x, z) => TABLES.some(([tx, tz]) => Math.abs(x - tx) < .8 && Math.abs(z - tz) < .42);
  const region = () => {
    if (size === 34 && R() < .3) { const r = R(); if (r < .42) return [-9.6 + R() * 17, GAL_Y, -6.5 + R() * 1.8]; if (r < .84) return [-9.6 + R() * 17, GAL_Y, 4.7 + R() * 1.8]; return [7.9 + R() * 1.5, GAL_Y, -4.2 + R() * 8.4]; }
    return [-9.6 + R() * 18.9, 0, -6.5 + R() * 13];
  };
  const ids = books.map(b => b.id); for (let i = ids.length - 1; i > 0; i--) { const j = Math.floor(R() * (i + 1)); [ids[i], ids[j]] = [ids[j], ids[i]]; }
  let p = 0;
  while (p < ids.length) {
    let c = null; for (let tries = 0; tries < 40 && !c; tries++) { const q = region(); if (!inObs(q[0], q[1], q[2])) c = q; } if (!c) c = [0, 0, 0];
    const tab = c[1] === 0 && onTable(c[0], c[2]), base = c[1] + (tab ? .82 : 0), n = tab ? 3 + Math.floor(R() * 6) : 1 + Math.floor(R() * 5), yaw0 = R() * 6.28; let h = 0;
    for (let j = 0; j < n && p < ids.length; j++) { const b = books[ids[p++]], T = titles[b.t], lone = j && R() < .35, tl = (R() - .5) * (j ? .18 : .06); b.start = lone ? [c[0] + (R() - .5) * .9, base + T.w * .02, c[2] + (R() - .5) * .9, R() * 6.28, tl] : [c[0] + (R() - .5) * .22, base + h, c[2] + (R() - .5) * .22, yaw0 + (R() - .5) * 1.6, tl]; if (!lone) h += T.w; }
  }
  // 열쇠 4개 · 보물상자 4개 (원작: 노란 다이아·초록 클로버·빨간 팔각·파란 별) → 상자에서 보조 마법
  const KEYS = [{ n: '황금 다이아몬드 열쇠', ic: '🔶', c: '#ffd34a' }, { n: '에메랄드 클로버 열쇠', ic: '🍀', c: '#4ad46a' }, { n: '진홍색 팔각 열쇠', ic: '🛑', c: '#e84a3a' }, { n: '푸른 별 열쇠', ic: '⭐', c: '#4a8aff' }];
  const keySpots = [[TABLES[0][0], .82, TABLES[0][1]], [-9.0, 0, 6.2], [8.8, GAL_Y, -5.6], [-3.0, GAL_Y, 6.0]];
  const chestSpots = [[-6.6, 0, -6.4], [-6.6, 0, 6.4], [-9.2, GAL_Y, -6.2], [9.0, GAL_Y, 5.9]];
  const rewards = ['bag', 'swift', 'reach', 'sense'];
  const keys = KEYS.map((k, i) => Object.assign({ i, pos: keySpots[i] }, k)), chests = KEYS.map((k, i) => ({ i, pos: chestSpots[i], key: i, reward: rewards[i], c: k.c, ic: k.ic }));
  return { cases, books, titles, keys, chests, size, seed };
}

// ════════════ 상태 · 네트워크 (Firebase games/lb_코드, 혼자 하기는 같은 모양의 메모리 저장소) ════════════
let LIB = null, me = null, NET = null;
const ST = { bk: {}, slot: {}, keys: {}, chests: {}, lv: {}, spent: 0, stone: 0, done: null, players: {}, pos: {}, t0: 0, permits: {} };
const FB_OK = typeof firebase !== 'undefined';
let db = null; if (FB_OK) { firebase.initializeApp({ apiKey: "AIzaSyD8_pSiOVOWmCitHl_nWcgSZobMFI5NgXM", authDomain: "rolling2-17a8f.firebaseapp.com", databaseURL: "https://rolling2-17a8f-default-rtdb.asia-southeast1.firebasedatabase.app", projectId: "rolling2-17a8f", storageBucket: "rolling2-17a8f.firebasestorage.app", messagingSenderId: "936512265515", appId: "1:936512265515:web:c9cb05f341267af81a796e" }); db = firebase.database(); }
const genCode = () => { const c = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; let r = ''; for (let i = 0; i < 6; i++) r += c[Math.floor(Math.random() * c.length)]; return r; };
const keyOf = n => n.replace(/[.#$\[\]\/]/g, '_') + '_' + Math.random().toString(36).slice(2, 6);
// 공통 인터페이스: tx(path, fn) 트랜잭션, set(path, v), update(path, obj), on(cb)
function localNet() {
  const data = {}; let cb = null;
  const get = p => p.split('/').reduce((o, k) => o && o[k], data);
  const put = (p, v) => { const ks = p.split('/'), last = ks.pop(); let o = data; for (const k of ks) o = o[k] = o[k] || {}; if (v == null) delete o[last]; else o[last] = v; };
  return { solo: true, tx: (p, fn) => { const r = fn(get(p) == null ? null : JSON.parse(JSON.stringify(get(p)))); if (r === undefined) return Promise.resolve(false); put(p, r); cb && cb(data); return Promise.resolve(true); },
    set: (p, v) => { put(p, v); cb && cb(data); return Promise.resolve(); }, update: (p, o) => { for (const k in o) put(p + '/' + k, o[k]); cb && cb(data); return Promise.resolve(); }, on: f => { cb = f; f(data); }, off() {}, data };
}
function fbNet(code) {
  const base = 'games/lb_' + code, ref = p => db.ref(base + (p ? '/' + p : ''));
  let h = null;
  return { code, ref, tx: (p, fn) => ref(p).transaction(cur => { const r = fn(cur); return r === undefined ? undefined : r; }).then(r => r.committed),
    set: (p, v) => ref(p).set(v), update: (p, o) => ref(p).update(o), on: f => { h = ref('').on('value', s => f(s.val() || {})); }, off: () => ref('').off('value', h) };
}

// ════════════ 첫 화면 · 대기실 ════════════
let size = 8, room = null, code = null, isHost = false, easy = false;
const OPT = { easy: false };
$('easySeg').onclick = e => { const b = e.target.closest('button'); if (!b) return; easy = b.dataset.v === '1'; [...$('easySeg').children].forEach(x => x.classList.toggle('on', x === b)); };
$('nick').value = localStorage.getItem('lb_nick') || '';
$('sizeSeg').onclick = e => { const b = e.target.closest('button'); if (!b) return; size = +b.dataset.v; [...$('sizeSeg').children].forEach(x => x.classList.toggle('on', x === b)); };
const getNick = () => { let n = $('nick').value.trim(); if (n.length < 2) n = '사서' + Math.floor(Math.random() * 900 + 100); localStorage.setItem('lb_nick', n); return n; };
$('btnSolo').onclick = () => { const n = getNick(); me = { k: 'me', nick: n, col: PCOL[0] }; NET = localNet(); isHost = true; startGame({ seed: (Math.random() * 1e9) | 0, size, t0: Date.now(), easy }); };
$('btnCreate').onclick = async () => {
  if (!db) return toast('온라인 연결이 안 돼요 — 혼자 하기로 해 보세요');
  const n = getNick(); code = genCode(); me = { k: keyOf(n), nick: n }; isHost = true; NET = fbNet(code);
  await NET.ref('').set({ host: me.k, created: Date.now(), expiresAt: Date.now() + 6 * 3600e3, phase: 'lobby', size, easy, players: { [me.k]: { nick: n, col: 0, ready: true, at: Date.now() } } });
  enterLobby();
};
$('btnJoin').onclick = async () => {
  if (!db) return toast('온라인 연결이 안 돼요');
  const c = $('joinCode').value.trim().toUpperCase(); if (c.length !== 6) return toast('방 코드 6자리를 넣어 주세요');
  const snap = await db.ref('games/lb_' + c).once('value'), r = snap.val(); if (!r || !r.players) return toast('그런 방이 없어요');
  const used = Object.values(r.players).map(p => p.col); if (Object.keys(r.players).length >= 8) return toast('방이 가득 찼어요');
  const n = getNick(); code = c; me = { k: keyOf(n), nick: n }; isHost = false; NET = fbNet(code);
  let col = 0; while (used.includes(col)) col++;
  await NET.ref('players/' + me.k).set({ nick: n, col, ready: false, at: Date.now() });
  enterLobby();
};
const qs = new URLSearchParams(location.search); if (qs.get('room')) $('joinCode').value = qs.get('room');
function enterLobby() {
  $('home').classList.add('hide'); $('lobby').classList.remove('hide'); $('lbCode').textContent = code;
  NET.ref('players/' + me.k).onDisconnect().remove();
  NET.on(r => { room = r; if (!r.players) { toast('방이 사라졌어요'); setTimeout(() => location.reload(), 1200); return; } if (!r.players[me.k]) { toast('방에서 나왔어요'); setTimeout(() => location.reload(), 1200); return; }
    isHost = r.host === me.k || !r.players[r.host]; if (isHost && r.host !== me.k) NET.set('host', me.k);
    me.col = PCOL[r.players[me.k].col % 8];
    if (r.phase === 'play' && !LIB) { NET.off(); startGame({ seed: r.seed, size: r.size, t0: r.t0, easy: !!r.easy }); return; }
    if (!LIB) renderLobby(r); else onRoom(r); });
}
function renderLobby(r) {
  const ps = Object.entries(r.players).sort((a, b) => a[1].at - b[1].at);
  $('lbPlayers').innerHTML = ps.map(([k, p]) => `<div class="pl ${p.ready ? 'rdy' : ''}"><i style="background:${PCOL[p.col % 8]}"></i>${esc(p.nick)}${k === r.host ? ' 👑' : ''}<small>${p.ready ? '준비 완료' : '대기 중'}</small></div>`).join('');
  [...$('lbSize').children].forEach(b => { b.classList.toggle('on', +b.dataset.v === r.size); b.disabled = !isHost; });
  $('lbSizeTxt').textContent = isHost ? '(방장이 고를 수 있어요)' : '';
  [...$('lbEasy').children].forEach(b => { b.classList.toggle('on', (b.dataset.v === '1') === !!r.easy); b.disabled = !isHost; });
  const allReady = ps.every(([k, p]) => p.ready || k === r.host);
  $('lbStart').classList.toggle('hide', !isHost); $('lbStart').disabled = !allReady; $('lbReady').classList.toggle('hide', isHost);
  $('lbReady').textContent = r.players[me.k].ready ? '준비 취소' : '준비';
}
$('lbSize').onclick = e => { const b = e.target.closest('button'); if (b && isHost) NET.set('size', +b.dataset.v); };
$('lbEasy').onclick = e => { const b = e.target.closest('button'); if (b && isHost) NET.set('easy', b.dataset.v === '1'); };
$('lbReady').onclick = () => NET.set('players/' + me.k + '/ready', !room.players[me.k].ready);
$('lbStart').onclick = () => { if (!isHost) return; NET.update('', { phase: 'play', seed: (Math.random() * 1e9) | 0, t0: Date.now(), bk: null, slot: null, keys: null, chests: null, lv: null, spent: 0, stone: 0, done: null, permits: null, pos: null, fairy: null, ping: null, stat: null, fbonus: 0 }); };
$('lbLeave').onclick = () => { NET.ref('players/' + me.k).remove().then(() => location.href = location.pathname); };
$('lbCode').onclick = () => { const u = location.origin + location.pathname + '?room=' + code; navigator.clipboard && navigator.clipboard.writeText(u).then(() => toast('초대 링크를 복사했어요')); };

// ════════════ 3D 장면 ════════════
const canvas = $('view'), renderer = new THREE.WebGLRenderer({ canvas, antialias: true });
renderer.setPixelRatio(Math.min(1.5, devicePixelRatio)); renderer.outputColorSpace = THREE.SRGBColorSpace; renderer.shadowMap.enabled = false;
renderer.toneMapping = THREE.ACESFilmicToneMapping; renderer.toneMappingExposure = 1.05;
const scene = new THREE.Scene(); scene.background = new THREE.Color('#0e0a12'); scene.fog = new THREE.Fog('#140c08', 22, 46);
const cam = new THREE.PerspectiveCamera(70, 1, .05, 90); scene.add(cam);
function resize() { renderer.setSize(innerWidth, innerHeight, false); cam.aspect = innerWidth / innerHeight; cam.updateProjectionMatrix(); }
addEventListener('resize', resize); resize();
const solids = [];   // 충돌 상자 [x0,y0,z0,x1,y1,z1]
function tex(w, h, draw) { const c = document.createElement('canvas'); c.width = w; c.height = h; draw(c.getContext('2d'), w, h); const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; return t; }
// ── 정적 기하 묶음: 재질별로 모아 한 덩어리로 합침 (그리기 호출 수를 줄임) ──
const BATCH = new Map();
const _m4 = new THREE.Matrix4(), _q = new THREE.Quaternion(), _e = new THREE.Euler(), _v = new THREE.Vector3(), _s = new THREE.Vector3();
function addGeo(mat, geo, x, y, z, ry = 0, rx = 0, rz = 0) { _m4.compose(_v.set(x, y, z), _q.setFromEuler(_e.set(rx, ry, rz)), _s.set(1, 1, 1)); geo.applyMatrix4(_m4); if (geo.index) geo = geo.toNonIndexed(); for (const k of Object.keys(geo.attributes)) if (!['position', 'normal', 'uv'].includes(k)) geo.deleteAttribute(k); (BATCH.get(mat) || BATCH.set(mat, []).get(mat)).push(geo); }
function bx(mat, x0, y0, z0, x1, y1, z1, solid = true) { addGeo(mat, new THREE.BoxGeometry(x1 - x0, y1 - y0, z1 - z0), (x0 + x1) / 2, (y0 + y1) / 2, (z0 + z1) / 2); if (solid) solids.push([x0, y0, z0, x1, y1, z1]); }
function flushBatch() { for (const [mat, geos] of BATCH) { const m = new THREE.Mesh(mergeGeometries(geos), mat); m.matrixAutoUpdate = false; scene.add(m); } BATCH.clear(); }
// ── 재질 · 질감 ──
const woodTex = tex(512, 512, (x, w, h) => { const r = rng(5); x.fillStyle = '#6a3c1c'; x.fillRect(0, 0, w, h);
  for (let y = 0; y < h; y++) { const v = Math.sin(y * .09 + Math.sin(y * .013) * 4) * .5 + .5; x.fillStyle = `rgba(${60 + v * 40},${24 + v * 16},8,${.2 + v * .2})`; x.fillRect(0, y, w, 1); }
  for (let i = 0; i < 260; i++) { x.fillStyle = `rgba(30,12,4,${.08 + r() * .14})`; x.fillRect(r() * w, r() * h, 30 + r() * 140, 1); } });
woodTex.wrapS = woodTex.wrapT = THREE.RepeatWrapping;
const floorTex = tex(512, 512, (x, w, h) => { const r = rng(9); for (let row = 0; row < 8; row++) { let cx = -r() * 200; while (cx < w) { const len = 140 + r() * 160, l = 22 + r() * 9; x.fillStyle = `hsl(24,42%,${l}%)`; x.fillRect(cx, row * 64, len - 2, 62); for (let g = 0; g < 14; g++) { x.fillStyle = `rgba(20,10,4,${.1 + r() * .12})`; x.fillRect(cx + r() * len, row * 64 + 4 + r() * 54, 20 + r() * 80, 1); } cx += len; } x.fillStyle = 'rgba(0,0,0,.45)'; x.fillRect(0, row * 64 + 62, w, 2); } }); floorTex.wrapS = floorTex.wrapT = THREE.RepeatWrapping; floorTex.repeat.set(8, 6);
const fabricTex = tex(256, 256, (x, w, h) => { const r = rng(3); x.fillStyle = '#2c4a2e'; x.fillRect(0, 0, w, h); for (let i = 0; i < 4000; i++) { x.fillStyle = r() < .5 ? 'rgba(255,255,255,.035)' : 'rgba(0,0,0,.08)'; x.fillRect(r() * w, r() * h, 2, 1); } x.strokeStyle = 'rgba(200,170,90,.12)'; x.lineWidth = 2; for (let i = 0; i < 4; i++) { x.beginPath(); x.arc(64 + (i % 2) * 128, 64 + Math.floor(i / 2) * 128, 34, 0, 6.29); x.stroke(); } }); fabricTex.wrapS = fabricTex.wrapT = THREE.RepeatWrapping; fabricTex.repeat.set(10, 4);
const starTex = tex(512, 512, (x, w, h) => { const r = rng(11); x.fillStyle = '#16244e'; x.fillRect(0, 0, w, h); x.fillStyle = '#e8c46a'; for (let i = 0; i < 70; i++) { const cx = r() * w, cy = r() * h, s = 3 + r() * 4; x.beginPath(); for (let k = 0; k < 10; k++) { const a = k * Math.PI / 5 - Math.PI / 2, rr = k % 2 ? s * .42 : s; x.lineTo(cx + Math.cos(a) * rr, cy + Math.sin(a) * rr); } x.fill(); } }); starTex.wrapS = starTex.wrapT = THREE.RepeatWrapping; starTex.repeat.set(6, 3);
const glassTex = tex(256, 256, (x, w, h) => { x.fillStyle = '#9ab8d8'; x.fillRect(0, 0, w, h); const g = x.createRadialGradient(128, 200, 10, 128, 160, 200); g.addColorStop(0, 'rgba(255,255,255,.7)'); g.addColorStop(1, 'rgba(60,90,140,.2)'); x.fillStyle = g; x.fillRect(0, 0, w, h); x.strokeStyle = '#2a2a3a'; x.lineWidth = 6; for (let i = 1; i < 4; i++) { x.beginPath(); x.moveTo(i * 64, 0); x.lineTo(i * 64, h); x.stroke(); } for (let i = 1; i < 6; i++) { x.beginPath(); x.moveTo(0, i * 46); x.lineTo(w, i * 46); x.stroke(); } x.beginPath(); x.arc(128, 120, 50, 0, 6.29); x.stroke(); });
const M = {
  wood: new THREE.MeshStandardMaterial({ map: woodTex, roughness: .55, metalness: .05 }), dark: new THREE.MeshStandardMaterial({ color: '#3a1e0e', roughness: .7 }),
  floor: new THREE.MeshStandardMaterial({ map: floorTex, roughness: .6 }), wall: new THREE.MeshStandardMaterial({ map: fabricTex, roughness: .95 }),
  gold: new THREE.MeshStandardMaterial({ color: '#c89a3a', metalness: .7, roughness: .35 }), back: new THREE.MeshStandardMaterial({ color: '#24120a', roughness: .9 }),
  stars: new THREE.MeshStandardMaterial({ map: starTex, roughness: .8, side: THREE.BackSide, emissive: '#0a1030', emissiveIntensity: .6 }), coffer: new THREE.MeshStandardMaterial({ color: '#4a2412', roughness: .7 }),
  glass: new THREE.MeshBasicMaterial({ map: glassTex }), rug: new THREE.MeshStandardMaterial({ color: '#6a1e22', roughness: 1 }), flame: new THREE.MeshBasicMaterial({ color: '#ffd890' }), candle: new THREE.MeshStandardMaterial({ color: '#f4ead2', roughness: .6 })
};
function buildRoom() {
  // 바닥 · 벽(아래 나무 판벽 + 위 초록 천) · 2층 회랑 (북·남·동) · 서쪽 겹계단
  bx(M.floor, -10.6, -.2, -7.6, 10.6, 0, 7.6);
  bx(M.rug, -5.6, .001, -1.0, 7.4, .012, 1.0, false);
  for (const [x0, z0, x1, z1] of [[-10.6, -7.6, 10.6, -7.1], [-10.6, 7.1, 10.6, 7.6], [-10.6, -7.6, -10.1, 7.6], [10.1, -7.6, 10.6, 7.6]]) { bx(M.wall, x0, 0, z0, x1, 8.6, z1); }
  for (const [x0, z0, x1, z1] of [[-10.1, -7.12, 10.1, -7.0], [-10.1, 7.0, 10.1, 7.12], [-10.12, -7.1, -10.0, 7.1], [10.0, -7.1, 10.12, 7.1]]) { bx(M.wood, x0, 0, z0, x1, 1.0, z1, false); bx(M.wood, x0, GAL_Y, z0, x1, GAL_Y + .9, z1, false); }
  // 회랑 바닥 · 앞면 띠 · 금 몰딩
  const galleries = [[-10.1, -7.1, 10.1, -4.4], [-10.1, 4.4, 10.1, 7.1], [7.6, -4.4, 10.1, 4.4]];
  for (const [x0, z0, x1, z1] of galleries) bx(M.wood, x0, GAL_Y - .25, z0, x1, GAL_Y, z1);
  bx(M.dark, -8.1, GAL_Y - .55, -4.48, 7.6, GAL_Y - .25, -4.36, false); bx(M.dark, -6.1, GAL_Y - .55, 4.36, 7.6, GAL_Y - .25, 4.48, false); bx(M.dark, 7.52, GAL_Y - .55, -4.4, 7.64, GAL_Y - .25, 4.4, false);
  bx(M.gold, -8.1, GAL_Y - .3, -4.5, 7.6, GAL_Y - .26, -4.34, false); bx(M.gold, -6.1, GAL_Y - .3, 4.34, 7.6, GAL_Y - .26, 4.5, false); bx(M.gold, 7.5, GAL_Y - .3, -4.4, 7.66, GAL_Y - .26, 4.4, false);
  // 난간 (계단이 닿는 곳은 비움)
  const rail = (x0, z0, x1, z1) => { bx(M.wood, x0, GAL_Y + .95, z0, x1, GAL_Y + 1.05, z1); solids.push([x0, GAL_Y, z0, x1, GAL_Y + 1.05, z1]); const L = Math.hypot(x1 - x0, z1 - z0), n = Math.floor(L / .28); for (let i = 0; i <= n; i++) { const t = i / n, x = x0 + (x1 - x0) * t, z = z0 + (z1 - z0) * t; addGeo(M.wood, new THREE.CylinderGeometry(.035, .045, .95, 8), x, GAL_Y + .475, z); } };
  rail(-8.1, -4.47, 7.6, -4.39); rail(-6.1, 4.39, 7.6, 4.47); rail(7.56, -4.4, 7.64, 4.4); rail(-10.1, 4.39, -7.9, 4.47);
  // 회랑을 받치는 기둥 (주두 금장)
  for (const x of [-5.9, -1.4, 3.1, 7.6]) for (const z of [-4.42, 4.42]) { addGeo(M.wood, new THREE.CylinderGeometry(.16, .2, GAL_Y - .25, 16), x, (GAL_Y - .25) / 2, z); addGeo(M.gold, new THREE.CylinderGeometry(.24, .16, .18, 16), x, GAL_Y - .34, z); solids.push([x - .2, 0, z - .2, x + .2, GAL_Y - .25, z + .2]); }
  for (const z of [-2.2, 0, 2.2]) { addGeo(M.wood, new THREE.CylinderGeometry(.16, .2, GAL_Y - .25, 16), 7.6, (GAL_Y - .25) / 2, z); addGeo(M.gold, new THREE.CylinderGeometry(.24, .16, .18, 16), 7.6, GAL_Y - .34, z); solids.push([7.4, 0, z - .2, 7.8, GAL_Y - .25, z + .2]); }
  // 2층 기둥 (천장까지)
  for (const x of [-5.9, -1.4, 3.1, 7.6]) for (const z of [-4.42, 4.42]) { addGeo(M.wood, new THREE.CylinderGeometry(.13, .15, 7.6 - GAL_Y - 1.05, 12), x, GAL_Y + 1.05 + (7.6 - GAL_Y - 1.05) / 2, z); }
  // 겹계단: 서쪽 벽 쪽은 남→북으로 올라 북쪽 회랑, 안쪽은 북→남으로 올라 남쪽 회랑
  const rise = GAL_Y / STAIR.n;
  for (let i = 0; i < STAIR.n; i++) { const y = (i + 1) * rise, za = 3.6 - (i + 1) * STAIR.d, zb = -3.6 + i * STAIR.d; bx(M.wood, -9.9, 0, za, -8.1, y, za + STAIR.d); bx(M.wood, -7.9, 0, zb, -6.1, y, zb + STAIR.d); bx(M.gold, -9.9, y - .02, za + STAIR.d - .04, -8.1, y + .005, za + STAIR.d, false); bx(M.gold, -7.9, y - .02, zb, -6.1, y + .005, zb + .04, false); }
  bx(M.dark, -8.1, 0, -4.4, -7.9, GAL_Y + 1.0, 4.4);                                   // 두 계단 사이 칸막이벽
  for (let i = 0; i <= STAIR.n; i++) { const z = -3.6 + i * STAIR.d, y = Math.min(GAL_Y, i * rise); addGeo(M.wood, new THREE.CylinderGeometry(.03, .04, .95, 8), -6.12, y + .475, z); }
  { const g = new THREE.BoxGeometry(.08, .08, Math.hypot(8, GAL_Y)); addGeo(M.wood, g, -6.12, GAL_Y / 2 + .95, .4, 0, Math.atan2(GAL_Y, 8)); for (let i = 0; i < STAIR.n; i++) { const z = -3.6 + (i + .5) * STAIR.d; solids.push([-6.18, 0, z - STAIR.d / 2, -6.06, (i + 1) * rise + 1.0, z + STAIR.d / 2]); } }
  // 천장: 아트리움 위 별 그린 원통 궁륭 + 금빛 갈비 · 회랑 위 평천장
  const vault = new THREE.Mesh(new THREE.CylinderGeometry(4.45, 4.45, 20.2, 40, 1, true, 0, Math.PI), M.stars); vault.rotation.z = Math.PI / 2; vault.position.set(0, 7.6, 0); scene.add(vault);
  for (const x of [-9.9, -6.5, -3.1, .3, 3.7, 7.1, 9.9]) { const rib = new THREE.Mesh(new THREE.TorusGeometry(4.43, .09, 8, 40, Math.PI), M.gold); rib.position.set(x, 7.6, 0); rib.rotation.y = Math.PI / 2; scene.add(rib); }
  bx(M.coffer, -10.1, 7.6, -7.1, 10.1, 7.8, -4.4, false); bx(M.coffer, -10.1, 7.6, 4.4, 10.1, 7.8, 7.1, false);
  bx(M.gold, -10.1, 7.5, -4.5, 10.1, 7.6, -4.35, false); bx(M.gold, -10.1, 7.5, 4.35, 10.1, 7.6, 4.5, false);
  // 궁륭 양 끝 반원 창 (스테인드글라스)
  for (const [x, ry] of [[-10.05, Math.PI / 2], [10.05, -Math.PI / 2]]) { const g = new THREE.Mesh(new THREE.CircleGeometry(4.4, 40, 0, Math.PI), M.glass); g.position.set(x, 7.6, 0); g.rotation.y = ry; scene.add(g); }
  { const w = new THREE.Mesh(new THREE.PlaneGeometry(2.6, 4.2), M.glass); w.position.set(-10.08, 5.3, 0); w.rotation.y = Math.PI / 2; scene.add(w); }
  // 탁자 · 지구본 · 천구의
  for (const [x, z] of TABLES) { bx(M.wood, x - .9, .74, z - .5, x + .9, .82, z + .5, false); for (const [a, b] of [[-.8, -.4], [.8, -.4], [-.8, .4], [.8, .4]]) bx(M.dark, x + a - .05, 0, z + b - .05, x + a + .05, .74, z + b + .05, false); solids.push([x - .9, 0, z - .5, x + .9, .82, z + .5]); }
  { const gl = new THREE.Mesh(new THREE.SphereGeometry(.42, 24, 16), new THREE.MeshStandardMaterial({ color: '#c8a868', roughness: .6 })); gl.position.set(-.4, 1.3, 2.6); scene.add(gl); addGeo(M.gold, new THREE.TorusGeometry(.5, .025, 8, 32), -.4, 1.3, 2.6, 0, 0, .4); addGeo(M.dark, new THREE.CylinderGeometry(.05, .3, .85, 12), -.4, .43, 2.6); solids.push([-.75, 0, 2.25, -.05, 1.6, 2.95]); }
  { const g = new THREE.Group(); for (let i = 0; i < 3; i++) { const t = new THREE.Mesh(new THREE.TorusGeometry(1.1 - i * .15, .03, 8, 48), M.gold); t.rotation.set(i * .9, i * .6, 0); g.add(t); } const orb = new THREE.Mesh(new THREE.SphereGeometry(.35, 20, 14), new THREE.MeshStandardMaterial({ color: '#2a3aa8', emissive: '#2a3aff', emissiveIntensity: .8, metalness: .3, roughness: .2 })); g.add(orb); g.position.set(1, 6.6, 0); scene.add(g); ARMILLA.g = g; }
  // 조명: 따뜻한 반구광 + 샹들리에 3개 + 회랑 등
  scene.add(new THREE.HemisphereLight('#ffe2b8', '#3a2010', 1.0));
  const d = new THREE.DirectionalLight('#ffd8a0', .35); d.position.set(3, 10, 4); scene.add(d);
  for (const x of [-4.2, 1.0, 6.2]) {
    const p = new THREE.PointLight('#ffb860', 26, 18, 1.5); p.position.set(x, 5.2, 0); scene.add(p);
    addGeo(M.gold, new THREE.TorusGeometry(.7, .04, 8, 32), x, 5.3, 0, 0, Math.PI / 2); addGeo(M.gold, new THREE.TorusGeometry(.45, .03, 8, 32), x, 5.6, 0, 0, Math.PI / 2); addGeo(M.gold, new THREE.CylinderGeometry(.015, .015, 2.6, 6), x, 7.0, 0);
    for (let k = 0; k < 10; k++) { const a = k / 10 * 6.28, r = k % 2 ? .45 : .7, y = k % 2 ? 5.68 : 5.38; addGeo(M.flame, new THREE.SphereGeometry(.05, 8, 6), x + Math.cos(a) * r, y + .12, Math.sin(a) * r); addGeo(M.candle, new THREE.CylinderGeometry(.025, .025, .12, 6), x + Math.cos(a) * r, y, Math.sin(a) * r); }
  }
  for (const [x, y, z] of [[-1, 2.6, -5.8], [-1, 2.6, 5.8], [-2, GAL_Y + 2.6, -5.8], [-2, GAL_Y + 2.6, 5.8]]) { const p = new THREE.PointLight('#ffb070', 9, 13, 1.5); p.position.set(x, y, z); scene.add(p); }
  // 지도판 (계단 앞 1층 · 2층 회랑 끝)
  const mt = n => { const c = document.createElement('canvas'); drawMap(c, 720, 480, n); const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; return t; };
  for (const [x, y, z, ry, fl] of [[-5.55, 1.45, -1.9, Math.PI / 2, 1], [-5.55, 1.45, 1.9, Math.PI / 2, 2], [-9.0, GAL_Y + 1.6, -7.04, 0, 2], [-9.0, GAL_Y + 1.6, 7.04, Math.PI, 1]]) {
    const m = new THREE.Mesh(new THREE.PlaneGeometry(1.5, 1.0), new THREE.MeshBasicMaterial({ map: mt(fl) })); m.position.set(x, y, z); m.rotation.y = ry; m.userData = { kind: 'map', fl }; scene.add(m); PICKABLE.push(m);
    const f = new THREE.Mesh(new THREE.BoxGeometry(1.66, 1.16, .05), M.gold); f.position.copy(m.position); f.rotation.y = ry; f.translateZ(-.03); scene.add(f);
    if (y < 2) { addGeo(M.dark, new THREE.BoxGeometry(.08, .95, .08), x, .47, z - .5); addGeo(M.dark, new THREE.BoxGeometry(.08, .95, .08), x, .47, z + .5); solids.push([x - .1, 0, z - .6, x + .1, 2, z + .6]); }
  }
  flushBatch();
}
const ARMILLA = { g: null };
// ── 책장: 기둥 · 단 · 칸막이 · 간판 (원작: 단마다 권수에 맞는 칸) ──
const CASES = [], PICKABLE = [];
function label(text, sub, col, ic) { return tex(512, 140, (x, w, h) => { const g = x.createLinearGradient(0, 0, 0, h); g.addColorStop(0, '#d8b060'); g.addColorStop(.5, '#a07830'); g.addColorStop(1, '#7a5420'); x.fillStyle = g; x.fillRect(0, 0, w, h); x.fillStyle = '#2a1608'; x.fillRect(8, 8, w - 16, h - 16); x.strokeStyle = '#e8c46a'; x.lineWidth = 3; x.strokeRect(16, 16, w - 32, h - 32); emblem(x, ic, 74, 70, 34, '#e8c46a'); x.textAlign = 'left'; x.textBaseline = 'middle'; x.fillStyle = '#f6e6c0'; x.font = `bold 54px ${SERIF}`; x.fillText(text, 128, 48); x.font = `bold 40px ${SERIF}`; x.fillStyle = '#ffe2a0'; x.fillText(sub, 128, 100); }); }
function buildCases() {
  for (const C of LIB.cases) {
    const H = caseH(C), hw = CASE.w / 2, hd = CASE.d / 2, P = (mat, lx0, ly0, lz0, lx1, ly1, lz1) => { const [x, y, z] = toWorld(C, (lx0 + lx1) / 2, (ly0 + ly1) / 2, (lz0 + lz1) / 2); addGeo(mat, new THREE.BoxGeometry(lx1 - lx0, ly1 - ly0, lz1 - lz0), x, y, z, C.ry); };
    P(M.back, -hw, 0, -hd, hw, H, -hd + .03);                                                                           // 뒤판
    for (const px of [-hw, -CASE.post / 2, hw - CASE.post]) P(M.wood, px, 0, -hd, px + CASE.post, H, hd);               // 기둥 3개
    P(M.wood, -hw - .06, H - .02, -hd - .02, hw + .06, H + .14, hd + .06); P(M.gold, -hw - .06, H + .14, hd + .02, hw + .06, H + .17, hd + .06);   // 머리 장식
    P(M.wood, -hw - .03, 0, -hd, hw + .03, CASE.base - .02, hd + .03);                                                  // 받침
    for (let lv = 0; lv <= C.levels; lv++) { const y = CASE.base + lv * CASE.rowH; P(M.wood, -hw, y - .025, -hd, hw, y, hd); }   // 단 판
    // 칸막이 · 남는 자리 막음판
    for (const col of [0, 1]) for (let lv = 0; lv < C.levels; lv++) {
      const x0 = col ? CASE.post / 2 : -hw + CASE.post, y0 = CASE.base + lv * CASE.rowH, comps = C.comps.filter(c => c.col === col && c.lv === lv);
      let end = 0; for (const c of comps) { if (c.x0 > .001) P(M.dark, x0 + c.x0 - .02, y0, -hd, x0 + c.x0, y0 + CASE.rowH - .03, hd - .01); end = Math.max(end, c.x0 + c.w); }
      if (end < CASE.colW - .01) { P(M.dark, x0 + end, y0, -hd, x0 + end + .02, y0 + CASE.rowH - .03, hd - .01); P(M.wood, x0 + end + .02, y0, hd - .05, x0 + CASE.colW, y0 + CASE.rowH - .03, hd - .02); }
    }
    solids.push(caseBox(C, H + .17));
    const g = new THREE.Group(); g.position.set(C.x, C.y, C.z); g.rotation.y = C.ry; scene.add(g);
    const pl = new THREE.Mesh(new THREE.PlaneGeometry(.92, .25), new THREE.MeshBasicMaterial({ map: label(C.lab, C.name, null, DATA[C.cat].em) })); pl.position.set(0, H + .3, hd - .02); g.add(pl);
    const hl = new THREE.Mesh(new THREE.BoxGeometry(CASE.w + .12, H + .12, CASE.d + .12), new THREE.MeshBasicMaterial({ color: '#ffd36b', transparent: true, opacity: 0, depthWrite: false })); hl.position.y = H / 2; g.add(hl);
    // 단마다 보이지 않는 앞면 판 (조준 판정용)
    const shelves = []; for (const col of [0, 1]) for (let lv = 0; lv < C.levels; lv++) { const p = new THREE.Mesh(new THREE.PlaneGeometry(CASE.colW, CASE.rowH - .04), new THREE.MeshBasicMaterial({ visible: false })); p.position.set((col ? CASE.post / 2 : -hw + CASE.post) + CASE.colW / 2, CASE.base + lv * CASE.rowH + (CASE.rowH - .04) / 2, hd - .02); p.userData = { kind: 'shelf', c: C.i, col, lv }; g.add(p); shelves.push(p); }
    CASES.push({ c: C, g, shelves, hl, H });
  }
  flushBatch();
}
// 칸 k 의 s 번째 자리 → 책 가운데 좌표 + 회전
function slotPos(c, k, s, T) { const C = LIB.cases[c], cp = C.comps[k], x0 = cp.col ? CASE.post / 2 : -CASE.w / 2 + CASE.post, lx = x0 + cp.x0 + .008 + (s + .5) * (cp.w - .016) / cp.size, ly = CASE.base + cp.lv * CASE.rowH + T.h / 2 + .002, lz = CASE.d / 2 - T.d / 2 - .015; const [x, y, z] = toWorld(C, lx, ly, lz); return [x, y, z, C.ry]; }
function bookState(id) { const v = ST.bk[id]; if (!v) return { w: 'f', p: LIB.books[id].start }; const a = v.split(','); if (a[0] === 'f') return { w: 'f', p: a.slice(1).map(Number) }; if (a[0] === 'h') return { w: 'h', u: a[1] }; return { w: 's', c: +a[1], k: +a[2], s: +a[3] }; }

// ════════════ 책 그림 (제목마다 다른 장정 · 책등에 분야 · 세로 제목 · 권 번호) ════════════
const ATL = { S: 4096, cw: 128, ch: 192, sp: 44, cols: 32, dig: { x: 0, y: 3840, w: 44, h: 52 } };
const SERIF = '"Nanum Myeongjo", "Batang", serif';
function emblem(x, k, cx, cy, r, col) {   // 분야 금박 문양 16종
  x.save(); x.translate(cx, cy); x.strokeStyle = col; x.fillStyle = col; x.lineWidth = Math.max(1.2, r * .12); x.lineCap = 'round'; x.lineJoin = 'round';
  const P = (pts, fill) => { x.beginPath(); pts.forEach(([a, b], i) => i ? x.lineTo(a * r, b * r) : x.moveTo(a * r, b * r)); x.closePath(); fill ? x.fill() : x.stroke(); };
  const C = (rr, fill, ox = 0, oy = 0) => { x.beginPath(); x.arc(ox * r, oy * r, rr * r, 0, 6.29); fill ? x.fill() : x.stroke(); };
  switch (k % 16) {
    case 0: P([[0, -1], [.7, -.2], [.4, .9], [-.4, .9], [-.7, -.2]]); C(.25, 1, 0, .1); break;
    case 1: { x.beginPath(); for (let i = 0; i < 5; i++) { const a = -Math.PI / 2 + i * 2.513, b = a + 1.257; x.lineTo(Math.cos(a) * r, Math.sin(a) * r); x.lineTo(Math.cos(b) * r * .42, Math.sin(b) * r * .42); } x.closePath(); x.fill(); break; }
    case 2: C(.8); P([[-.55, -.55], [.55, .55]]); P([[.55, -.55], [-.55, .55]]); break;
    case 3: x.beginPath(); x.moveTo(-.2 * r, .8 * r); x.lineTo(-.2 * r, -.8 * r); x.lineTo(.5 * r, -.5 * r); x.stroke(); C(.28, 1, -.45, .8); break;
    case 4: C(.55, 0, 0, -.2); P([[-.3, .35], [-.2, .9], [.2, .9], [.3, .35]]); C(.12, 1, -.22, -.25); C(.12, 1, .22, -.25); break;
    case 5: C(.35, 0, 0, -.45); P([[0, -.1], [0, .9]]); P([[0, .55], [.3, .55]]); P([[0, .8], [.25, .8]]); break;
    case 6: x.beginPath(); for (let t = 0; t < 12; t += .2) { const rr = t / 12 * .9 * r; x.lineTo(Math.cos(t) * rr, Math.sin(t) * rr); } x.stroke(); break;
    case 7: C(.85); P([[0, -.85], [.74, .43], [-.74, .43]]); break;
    case 8: P([[-.25, -.85], [.25, -.85], [.25, -.25], [.85, -.25], [.85, .25], [.25, .25], [.25, .85], [-.25, .85], [-.25, .25], [-.85, .25], [-.85, -.25], [-.25, -.25]], 1); break;
    case 9: x.beginPath(); x.moveTo(0, -.95 * r); x.quadraticCurveTo(.8 * r, 0, .3 * r, .9 * r); x.quadraticCurveTo(0, .4 * r, -.3 * r, .9 * r); x.quadraticCurveTo(-.8 * r, 0, 0, -.95 * r); x.fill(); break;
    case 10: P([[-.35, -.9], [.35, -.9], [.2, -.3], [.75, .85], [-.75, .85], [-.2, -.3]]); break;
    case 11: P([[0, -.9], [.75, -.55], [.65, .35], [0, .9], [-.65, .35], [-.75, -.55]]); break;
    case 12: C(.5, 0, 0, .1); P([[-.4, -.35], [-.15, -.85], [.15, -.85], [.4, -.35]]); break;
    case 13: x.beginPath(); x.arc(0, 0, .85 * r, .6, 5.7); x.stroke(); C(.3, 1, .3, 0); break;
    case 14: for (let i = 0; i < 6; i++) { x.save(); x.rotate(i * 1.047); x.beginPath(); x.ellipse(0, -.5 * r, .2 * r, .42 * r, 0, 0, 6.29); x.stroke(); x.restore(); } C(.18, 1); break;
    case 15: C(.85); P([[0, -.85], [0, .85]]); P([[-.85, 0], [.85, 0]]); P([[0, -.55], [.25, 0], [0, .55], [-.25, 0]], 1); break;
  }
  x.restore();
}
function cloth(x, ox, oy, w, h, col, seed) {   // 천·가죽 질감: 바탕 + 잔무늬 + 위아래 그늘
  x.fillStyle = col; x.fillRect(ox, oy, w, h); const r = rng(seed);
  for (let i = 0; i < w * h / 18; i++) { x.fillStyle = r() < .5 ? 'rgba(255,255,255,.05)' : 'rgba(0,0,0,.08)'; x.fillRect(ox + r() * w, oy + r() * h, 1 + r() * 1.5, 1); }
  const g = x.createLinearGradient(ox, oy, ox, oy + h); g.addColorStop(0, 'rgba(0,0,0,.28)'); g.addColorStop(.06, 'rgba(0,0,0,0)'); g.addColorStop(.94, 'rgba(0,0,0,0)'); g.addColorStop(1, 'rgba(0,0,0,.32)'); x.fillStyle = g; x.fillRect(ox, oy, w, h);
}
function wrap(x, s, w) { const out = []; let cur = ''; for (const ch of s) { if (x.measureText(cur + ch).width > w && cur) { out.push(cur); cur = ch.trim() ? ch : ''; } else cur += ch; } if (cur) out.push(cur); return out; }
function drawTitle(x, ox, oy, T) {
  const W = ATL.sp, H = ATL.ch, cat = DATA[T.cat], acc = T.acc, light = /^#[d-f]/i.test(T.col), ink = light ? '#3a2412' : acc;
  // 책등
  cloth(x, ox, oy, W, H, T.col, T.i * 7 + 1);
  const sg = x.createLinearGradient(ox, 0, ox + W, 0); sg.addColorStop(0, 'rgba(0,0,0,.4)'); sg.addColorStop(.3, 'rgba(255,255,255,.1)'); sg.addColorStop(.65, 'rgba(255,255,255,.02)'); sg.addColorStop(1, 'rgba(0,0,0,.45)'); x.fillStyle = sg; x.fillRect(ox, oy, W, H);
  if (T.style === 0) for (const yy of [16, 40, H - 52, H - 40]) { x.fillStyle = 'rgba(0,0,0,.35)'; x.fillRect(ox, oy + yy + 2, W, 3); x.fillStyle = ink; x.fillRect(ox + 2, oy + yy, W - 4, 2); }
  else if (T.style === 1) { x.fillStyle = T.col2; x.fillRect(ox, oy, W, 30); x.fillRect(ox, oy + H - 40, W, 40); x.fillStyle = ink; x.fillRect(ox, oy + 30, W, 2); x.fillRect(ox, oy + H - 42, W, 2); }
  else if (T.style === 2) { x.strokeStyle = ink; x.lineWidth = 1.5; x.strokeRect(ox + 5, oy + 26, W - 10, H - 74); }
  else if (T.style === 3) { x.fillStyle = 'rgba(255,255,255,.06)'; for (let i = -H; i < H; i += 10) { x.beginPath(); x.moveTo(ox, oy + i); x.lineTo(ox + W, oy + i + W); x.lineTo(ox + W, oy + i + W + 4); x.lineTo(ox, oy + i + 4); x.fill(); } x.fillStyle = ink; x.fillRect(ox + 3, oy + 22, W - 6, 1.5); x.fillRect(ox + 3, oy + H - 44, W - 6, 1.5); }
  else if (T.style === 4) { x.fillStyle = ink; for (const yy of [12, H - 46]) for (let i = 0; i < 3; i++) { x.beginPath(); x.moveTo(ox + 9 + i * 13, oy + yy); x.lineTo(ox + 13 + i * 13, oy + yy + 5); x.lineTo(ox + 9 + i * 13, oy + yy + 10); x.lineTo(ox + 5 + i * 13, oy + yy + 5); x.fill(); } }
  else { x.fillStyle = ink; x.fillRect(ox, oy + 6, W, 7); x.fillRect(ox, oy + H - 48, W, 3); }
  // 분야 이름 (원작처럼 책등 위쪽)
  x.textAlign = 'center'; x.textBaseline = 'middle'; x.fillStyle = ink; x.font = `bold 8px ${SERIF}`;
  const cn = [...cat.n.replace(/\s+/g, '')].slice(0, 5); cn.forEach((ch, i) => x.fillText(ch, ox + W / 2, oy + (T.style === 1 ? 35 : 30) + i * 8.5 - (cn.length > 3 ? 4 : 0)));
  // 세로 제목 (부제 앞까지)
  const main = [...T.name.split(':')[0].replace(/\s+/g, '').replace(/[!?,.·…'"]/g, '')], n = main.length, fs = n <= 7 ? 13 : n <= 9 ? 11.5 : 10, step = fs + 1, top = oy + 80, room = H - 80 - 52, cnt = Math.min(n, Math.floor(room / step));
  x.font = `bold ${fs}px ${SERIF}`; for (let i = 0; i < cnt; i++) x.fillText(i === cnt - 1 && n > cnt ? '⋯' : main[i], ox + W / 2, top + i * step + (room - cnt * step) / 2);
  x.fillStyle = 'rgba(0,0,0,.28)'; x.fillRect(ox + 4, oy + H - 34, W - 8, 30);                  // 권 번호 자리
  // 표지
  const cx = ox + W, CW = ATL.cw - W;
  cloth(x, cx, oy, CW, H, T.col, T.i * 13 + 5); x.fillStyle = 'rgba(0,0,0,.28)'; x.fillRect(cx, oy, 6, H);
  if (T.style === 1) { x.fillStyle = T.col2; x.fillRect(cx, oy, CW, 34); x.fillRect(cx, oy + H - 30, CW, 30); }
  x.strokeStyle = ink; x.lineWidth = 1.5; x.strokeRect(cx + 9, oy + 7, CW - 15, H - 14); if (T.style % 2 === 0) { x.lineWidth = .8; x.strokeRect(cx + 13, oy + 11, CW - 23, H - 22); }
  for (const [a, c] of [[cx + 9, oy + 7], [cx + CW - 6, oy + 7], [cx + 9, oy + H - 7], [cx + CW - 6, oy + H - 7]]) { x.fillStyle = ink; x.beginPath(); x.arc(a, c, 2.5, 0, 6.29); x.fill(); }
  x.fillStyle = ink; x.font = `bold 12px ${SERIF}`; const lines = wrap(x, T.name, CW - 22).slice(0, 4); lines.forEach((l, i) => x.fillText(l, cx + CW / 2 + 2, oy + 34 + i * 14));
  emblem(x, cat.em, cx + CW / 2 + 2, oy + 112, 15, ink); x.beginPath(); x.arc(cx + CW / 2 + 2, oy + 112, 22, 0, 6.29); x.strokeStyle = ink; x.lineWidth = 1; x.stroke();
  x.font = `bold 9px ${SERIF}`; x.fillText(cat.n, cx + CW / 2 + 2, oy + H - 22);
}
function buildAtlas() {
  return tex(ATL.S, ATL.S, x => {
    for (const T of LIB.titles) drawTitle(x, (T.i % ATL.cols) * ATL.cw, Math.floor(T.i / ATL.cols) * ATL.ch, T);
    const D = ATL.dig; x.textAlign = 'center'; x.textBaseline = 'middle'; x.font = `bold 24px ${SERIF}`;
    for (let v = 1; v <= 10; v++) { x.fillStyle = '#f0d488'; x.fillText(String(v), D.x + (v - 1) * D.w + D.w / 2, D.y + D.h / 2 + 2); }
  });
}
// ── 책 3천 권을 한 번에 그리는 인스턴스 메시: 상자 면마다 종이·표지·책등, 권 번호는 셰이더로 덧그림 ──
let BOOKS = null, glowMesh = null;
function bookGeometry() {
  const g = new THREE.BoxGeometry(1, 1, 1), face = new Float32Array(24);
  [1, 3, 0, 0, 2, 0].forEach((f, i) => face.fill(f, i * 4, i * 4 + 4));   // +x 앞표지 · -x 뒤표지(좌우 뒤집음) · ±y 종이 · +z 책등 · -z 종이
  g.setAttribute('aFace', new THREE.BufferAttribute(face, 1)); return g;
}
function buildBooks() {
  const atlas = buildAtlas(); atlas.anisotropy = 8; atlas.generateMipmaps = true;
  const mat = new THREE.MeshStandardMaterial({ map: atlas, roughness: .72 }), D = ATL.dig;
  mat.onBeforeCompile = sh => {
    sh.uniforms.uCell = { value: new THREE.Vector2(ATL.cw / ATL.S, ATL.ch / ATL.S) }; sh.uniforms.uSp = { value: ATL.sp / ATL.cw };
    sh.uniforms.uDigO = { value: new THREE.Vector2(D.x / ATL.S, 1 - (D.y + D.h) / ATL.S) }; sh.uniforms.uDigS = { value: new THREE.Vector2(D.w / ATL.S, D.h / ATL.S) };
    sh.vertexShader = sh.vertexShader.replace('#include <common>', '#include <common>\nattribute vec2 aCell; attribute float aVol; attribute float aFace;\nvarying vec2 vLoc; varying float vFace; varying float vVol; varying vec2 vCellO;')
      .replace('#include <uv_vertex>', '#include <uv_vertex>\nvLoc = uv; vFace = aFace; vVol = aVol; vCellO = aCell;');
    sh.fragmentShader = sh.fragmentShader.replace('#include <common>', '#include <common>\nuniform vec2 uCell; uniform float uSp; uniform vec2 uDigO; uniform vec2 uDigS;\nvarying vec2 vLoc; varying float vFace; varying float vVol; varying vec2 vCellO;')
      .replace('#include <map_fragment>', `
        vec4 tc;
        if (vFace < .5) { float ln = abs(fract(vLoc.x * 70.) - .5) * 2.; tc = vec4(mix(vec3(.84, .78, .65), vec3(.70, .62, .48), smoothstep(.6, 1., ln) * .45), 1.); }
        else if (vFace > 1.5 && vFace < 2.5) {
          tc = texture2D(map, vCellO + vec2(vLoc.x * uSp, vLoc.y) * uCell);
          if (vLoc.y < .17 && vLoc.y > .02) { vec2 du = uDigO + vec2((vVol - 1.) * uDigS.x, 0.) + vec2(vLoc.x, (vLoc.y - .02) / .15) * uDigS; vec4 d = texture2D(map, du); tc.rgb = mix(tc.rgb, d.rgb, d.a); }
        } else { float u = vFace > 2.5 ? 1. - vLoc.x : vLoc.x; tc = texture2D(map, vCellO + vec2(uSp + u * (1. - uSp), vLoc.y) * uCell); }
        diffuseColor *= tc;`);
  };
  const n = LIB.books.length, geo = bookGeometry(), cell = new Float32Array(n * 2), vol = new Float32Array(n);
  for (const b of LIB.books) { const T = LIB.titles[b.t]; cell[b.id * 2] = (T.i % ATL.cols) * ATL.cw / ATL.S; cell[b.id * 2 + 1] = 1 - (Math.floor(T.i / ATL.cols) * ATL.ch + ATL.ch) / ATL.S; vol[b.id] = b.v; }
  geo.setAttribute('aCell', new THREE.InstancedBufferAttribute(cell, 2)); geo.setAttribute('aVol', new THREE.InstancedBufferAttribute(vol, 1));
  BOOKS = new THREE.InstancedMesh(geo, mat, n); BOOKS.instanceMatrix.setUsage(THREE.DynamicDrawUsage); BOOKS.frustumCulled = false; BOOKS.userData = { kind: 'books' }; scene.add(BOOKS);
  glowMesh = new THREE.InstancedMesh(new THREE.BoxGeometry(1, 1, 1), new THREE.MeshBasicMaterial({ transparent: true, opacity: .3, depthWrite: false, blending: THREE.AdditiveBlending }), n);
  glowMesh.frustumCulled = false; for (const b of LIB.books) { glowMesh.setColorAt(b.id, new THREE.Color(0, 0, 0)); glowMesh.setMatrixAt(b.id, HIDE); } scene.add(glowMesh);
  // 조준한 책 테두리 (원작: 흰 외곽선)
  OUTLINE = new THREE.LineSegments(new THREE.EdgesGeometry(new THREE.BoxGeometry(1, 1, 1)), new THREE.LineBasicMaterial({ color: '#ffffff', transparent: true, opacity: .95, depthTest: false })); OUTLINE.renderOrder = 998; OUTLINE.matrixAutoUpdate = false; OUTLINE.visible = false; scene.add(OUTLINE);
}
let OUTLINE = null, booksDirty = true;
const HIDE = new THREE.Matrix4().makeScale(0, 0, 0), BM = new THREE.Matrix4(), GM = new THREE.Matrix4();
function bookMatrix(out, T, x, y, z, rx, ry, rz, grow = 0) { return out.compose(_v.set(x, y, z), _q.setFromEuler(_e.set(rx, ry, rz, 'YXZ')), _s.set(T.w + grow, T.h + grow, T.d + grow)); }
function updateBooks() {
  if (!BOOKS) return;
  const status = rowStatus(), now = performance.now(); let sliding = false;
  for (const b of LIB.books) {
    const st = bookState(b.id), T = LIB.titles[b.t]; let glow = null, M4 = null;
    if (st.w === 'h' && st.u === me.k) { BOOKS.setMatrixAt(b.id, HIDE); glowMesh.setMatrixAt(b.id, HIDE); continue; }   // 내 손의 책은 updateHeld 에서
    if (st.w === 'f') { const [x, y, z, yaw, tl = 0] = st.p; M4 = bookMatrix(BM, T, x, y + T.w / 2, z, tl, yaw, Math.PI / 2); }
    else if (st.w === 's') {
      const [x, y, z, ry] = slotPos(st.c, st.k, st.s, T), key = st.c + '_' + st.k + '_' + st.s, q = status.book[b.id];
      if (FX.ready && FX.slot[b.id] !== key) FX.slide[b.id] = now;
      const e = FX.slide[b.id] ? clamp((now - FX.slide[b.id]) / 220, 0, 1) : 1; if (e >= 1) delete FX.slide[b.id]; else sliding = true;
      const out = (1 - e) * (1 - e) * .3; M4 = bookMatrix(BM, T, x + Math.sin(ry) * out, y + (1 - e) * .03, z + Math.cos(ry) * out, 0, ry, (1 - e) * .12);
      if (FX.ready && q === 2 && FX.q[b.id] !== 2) burst(x + Math.sin(ry) * .12, y + T.h / 2, z + Math.cos(ry) * .12, 12, GOLD, .9);
      FX.slot[b.id] = key; FX.q[b.id] = q;
      glow = q === 2 ? [.36, .27, .05] : q === 1 ? [.42, .03, .02] : null;
    } else { const O = OTHERS[st.u]; if (O && O.mesh) { const i = (O.hand || []).indexOf(b.id), ry = O.mesh.rotation.y; M4 = bookMatrix(BM, T, O.mesh.position.x + Math.sin(ry) * .35, O.mesh.position.y + 1.0 + i * .075, O.mesh.position.z + Math.cos(ry) * .35, 0, ry, Math.PI / 2); } }
    if (st.w !== 's') { delete FX.slot[b.id]; delete FX.q[b.id]; }
    if (glowFx.series != null && b.t === glowFx.series && st.w === 'f') glow = [.2, .7, 1];
    BOOKS.setMatrixAt(b.id, M4 || HIDE);
    if (glow && M4) { const p = new THREE.Vector3(), q = new THREE.Quaternion(); M4.decompose(p, q, _s); GM.compose(p, q, _s.set(T.w + .025, T.h + .025, T.d + .025)); glowMesh.setMatrixAt(b.id, GM); glowMesh.setColorAt(b.id, _col.setRGB(...glow)); } else glowMesh.setMatrixAt(b.id, HIDE);
  }
  BOOKS.instanceMatrix.needsUpdate = true; BOOKS.computeBoundingSphere(); glowMesh.instanceMatrix.needsUpdate = true; if (glowMesh.instanceColor) glowMesh.instanceColor.needsUpdate = true;
  booksDirty = sliding; FX.ready = true;
}
const _col = new THREE.Color();
// 1인칭: 손에 든 책을 화면 오른쪽에 눕혀 쌓음 (책등이 나를 봄, 맨 위 = 지금 꽂을 책)
const HM = new THREE.Matrix4();
function updateHeld() {
  if (!BOOKS) return; cam.updateMatrixWorld();
  let yy = -.44; const n = Math.min(P.hand.length, 10);
  for (let i = n - 1; i >= 0; i--) {
    const id = P.hand[i], T = LIB.titles[LIB.books[id].t];
    HM.compose(_v.set(.56 - (i === 0 ? .03 : 0), yy + T.w / 2, -.92), _q.setFromEuler(_e.set(.25, -.42, Math.PI / 2, 'YXZ')), _s.set(T.w, T.h, T.d)); yy += T.w;
    BOOKS.setMatrixAt(id, BM.multiplyMatrices(cam.matrixWorld, HM));
  }
  for (let i = 10; i < P.hand.length; i++) BOOKS.setMatrixAt(P.hand[i], HIDE);
  if (n) BOOKS.instanceMatrix.needsUpdate = true;
}

// ════════════ 정답 판정 (원작 안내문): 올바른 책장 + 권수에 맞는 칸 + 한 칸엔 한 제목 + 권 번호 순서대로 ════════════
let STATUS = null;
function rowStatus() {
  if (STATUS) return STATUS;
  const book = {}, comps = {}, titleComps = {};
  for (const b of LIB.books) { const st = bookState(b.id); if (st.w !== 's') continue; const key = st.c + '_' + st.k; (comps[key] = comps[key] || []).push({ id: b.id, s: st.s, b }); (titleComps[b.t] = titleComps[b.t] || new Set()).add(key); }
  const doneComps = new Set();
  for (const key in comps) {
    const [c, k] = key.split('_').map(Number), C = LIB.cases[c], cp = C.comps[k], list = comps[key], ts = new Set(list.map(x => x.b.t));
    for (const x of list) { const T = LIB.titles[x.b.t]; if (C.cat !== T.cat) { book[x.id] = 0; continue; } book[x.id] = cp.size === T.vols && ts.size === 1 && x.s === x.b.v - 1 && titleComps[x.b.t].size === 1 ? 2 : 1; }
    if (list.length === cp.size && list.every(x => book[x.id] === 2)) doneComps.add(key);
  }
  const shelved = Object.keys(book).length, good = Object.values(book).filter(v => v === 2).length;
  const cat = {}; for (const b of LIB.books) { const ci = LIB.titles[b.t].cat, o = cat[ci] = cat[ci] || { n: 0, g: 0 }; o.n++; if (book[b.id] === 2) o.g++; }
  const catDone = new Set(Object.keys(cat).filter(ci => cat[ci].g === cat[ci].n).map(Number));
  return (STATUS = { book, done: doneComps.size, doneRows: doneComps, shelved, good, cat, catDone });
}

// ════════════ 플레이어 (1인칭) ════════════
const P = { x: -4.5, y: 0, z: 0, vy: 0, yaw: -Math.PI / 2, pitch: 0, ground: true, hand: [], jumpHold: 0 };
const KEY = {}; let locked = false;
const PW = .28, PHH = 1.7, EYE = 1.6;
function collide(x, y, z) { for (const s of solids) if (x + PW > s[0] && x - PW < s[3] && z + PW > s[2] && z - PW < s[5] && y + PHH > s[1] && y < s[4] - .001) return s; return null; }
function moveP(dt) {
  const run = KEY.ShiftLeft || KEY.ShiftRight, sp = (run ? 7.5 : 4.5) * (minor('swift') ? 1.2 : 1) * (COMBO.boost > 0 ? 1.25 : 1) * dt;
  let fx = 0, fz = 0; if (KEY.KeyW) fz -= 1; if (KEY.KeyS) fz += 1; if (KEY.KeyA) fx -= 1; if (KEY.KeyD) fx += 1;
  const l = Math.hypot(fx, fz) || 1; fx /= l; fz /= l;
  const s = Math.sin(P.yaw), c = Math.cos(P.yaw), dx = (fx * c + fz * s) * sp, dz = (-fx * s + fz * c) * sp;
  for (const [ax, d] of [['x', dx], ['z', dz]]) {
    if (!d) continue; const nx = ax === 'x' ? P.x + d : P.x, nz = ax === 'z' ? P.z + d : P.z, hit = collide(nx, P.y, nz);
    if (!hit) { P.x = nx; P.z = nz; continue; }
    if (P.ground && hit[4] - P.y <= .36 && !collide(nx, hit[4] + .001, nz)) { P.x = nx; P.z = nz; P.y = hit[4]; }   // 계단 오르기
  }
  // 높이뛰기 (허가 후, 오래 누를수록 높이)
  if (ST.permits.jump && KEY.Space && P.ground) P.jumpHold = Math.min(.5, P.jumpHold + dt);
  if (ST.permits.jump && !KEY.Space && P.jumpHold > 0 && P.ground) { P.vy = 4.5 + P.jumpHold * 9; P.ground = false; P.jumpHold = 0; }
  P.vy -= 18 * dt; const ny = P.y + P.vy * dt, hit = collide(P.x, ny, P.z);
  if (hit) { if (P.vy < 0) { P.y = hit[4]; P.ground = true; } else P.y = hit[1] - PHH - .001; P.vy = 0; } else { P.y = ny; P.ground = false; }
  if (P.y < 0) { P.y = 0; P.vy = 0; P.ground = true; }
  P.x = clamp(P.x, -9.8, 9.8); P.z = clamp(P.z, -6.8, 6.8);
  cam.position.set(P.x, P.y + EYE + (P.ground && (fx || fz) ? Math.sin(performance.now() / 120) * .025 : 0), P.z); cam.rotation.set(P.pitch, P.yaw, 0, 'YXZ');
}
addEventListener('keydown', e => { if (e.target.tagName === 'INPUT') return; KEY[e.code] = 1; if (!LIB) return; onKey(e); });
addEventListener('keyup', e => { KEY[e.code] = 0; if (e.code === 'KeyQ' && LIB) dropUp(); });
canvas.addEventListener('click', () => { if (LIB && !locked && !overlayOpen()) canvas.requestPointerLock(); });
document.addEventListener('pointerlockchange', () => { locked = document.pointerLockElement === canvas; $('escMenu').classList.toggle('hide', locked || !LIB || overlayOpen()); $('hint').classList.toggle('hide', locked); });
document.addEventListener('mousemove', e => { if (!locked) return; P.yaw -= e.movementX * .0022; P.pitch = clamp(P.pitch - e.movementY * .0022, -1.45, 1.45); });
document.addEventListener('mousedown', e => { if (!locked) return; if (e.button === 0) act(); if (e.button === 1) { e.preventDefault(); ping(); } if (e.button === 2) drop(false); });
document.addEventListener('wheel', e => { if (locked && P.hand.length > 1) { if (e.deltaY > 0) P.hand.push(P.hand.shift()); else P.hand.unshift(P.hand.pop()); sendHand(); hudHand(); } });
$('btnResume').onclick = () => canvas.requestPointerLock();
$('btnQuit').onclick = () => { if (NET && !NET.solo) { returnHand(); NET.ref('players/' + me.k).remove(); } location.href = location.pathname; };
const overlayOpen = () => !$('ovLetter').classList.contains('hide') || !$('ovMap').classList.contains('hide') || !$('ovAbil').classList.contains('hide');

// ════════════ 조준 · 집기 · 꽂기 · 내려놓기 ════════════
const ray = new THREE.Raycaster();
const reach = () => minor('reach') ? 4.6 : 3.2;
let AIM = null;
function shelfHit(hit) {   // 단 앞면 판의 맞은 점 → 칸 · 자리
  const u = hit.object.userData, C = LIB.cases[u.c], lp = hit.object.parent.worldToLocal(hit.point.clone()), x0 = u.col ? CASE.post / 2 : -CASE.w / 2 + CASE.post, lx = lp.x - x0;
  const cp = C.comps.find(c => c.col === u.col && c.lv === u.lv && lx >= c.x0 - .01 && lx <= c.x0 + c.w + .01); if (!cp) return { kind: 'filler', c: C.i };
  const s = clamp(Math.floor((lx - cp.x0 - .008) / ((cp.w - .016) / cp.size)), 0, cp.size - 1), occ = ST.slot[`${C.i}_${cp.k}_${s}`];
  if (occ != null) return { kind: 'book', id: +occ, st: bookState(+occ) };
  return { kind: 'slot', c: C.i, k: cp.k, s };
}
function aimUpdate() {
  ray.setFromCamera({ x: 0, y: 0 }, cam); ray.far = reach(); AIM = null;
  const targets = [BOOKS, ...CASES.flatMap(c => c.shelves), ...PICKABLE, ...KEYMESH, ...CHESTMESH, STONE.mesh, FAIRY.on ? FAIRY.hit : null, ...Object.values(OTHERS).map(o => o.hit)].filter(o => o && o.visible !== false);
  const hits = ray.intersectObjects(targets, false);
  for (const h of hits) {
    const u = h.object.userData;
    if (u.kind === 'books') { const id = h.instanceId, st = bookState(id); if (st.w === 'h') continue; AIM = { kind: 'book', id, st }; break; }
    if (u.kind === 'shelf') { AIM = shelfHit(h); break; }
    AIM = u; break;
  }
  // 조준 표시 (원작: 화면 아래 가운데 — 제목 · 권, "E 행동")
  let html = '', sub = '';
  if (AIM && AIM.kind === 'book') {
    const b = LIB.books[AIM.id], T = LIB.titles[b.t], q = AIM.st.w === 's' ? rowStatus().book[AIM.id] : null, C = LIB.cases[T.caseI];
    html = `${esc(T.name)}<br><span class="vol">${b.v}권</span>`;
    if (OPT.easy || minor('sense')) sub = `${DATA[T.cat].ic} ${esc(DATA[T.cat].n)} → ${C.lab} 책장 · ${T.vols}권짜리 칸`;
    if (q === 2) sub = '<span class="good">제자리!</span>'; else if (q === 1) sub = '<span class="bad">책장은 맞지만 칸이나 순서가 달라요</span>'; else if (q === 0) sub = '<span class="bad">이 책장이 아니에요</span>';
  }
  else if (AIM && AIM.kind === 'slot') { const C = LIB.cases[AIM.c], cp = C.comps[AIM.k], used = Object.keys(ST.slot).filter(k => k.startsWith(`${C.i}_${cp.k}_`)).length; html = `${C.lab} : ${esc(C.name)}<br><span class="vol">${cp.size}권 칸 · ${AIM.s + 1}번째 자리</span>`; sub = used ? `${used}/${cp.size} 채워짐` : '빈 칸'; }
  else if (AIM && AIM.kind === 'filler') { const C = LIB.cases[AIM.c]; html = `${C.lab} : ${esc(C.name)}`; sub = '막힌 자리예요'; }
  else if (AIM && AIM.kind === 'map') html = `도서관 지도 (${AIM.fl}층)`;
  else if (AIM && AIM.kind === 'key') html = `${LIB.keys[AIM.i].ic} ${LIB.keys[AIM.i].n}`;
  else if (AIM && AIM.kind === 'chest') { html = `${LIB.chests[AIM.i].ic} 보물상자`; sub = ST.chests[AIM.i] ? '열린 상자' : '맞는 열쇠가 있으면 열 수 있어요'; }
  else if (AIM && AIM.kind === 'fairy') html = '🧚 장난꾸러기 요정!';
  else if (AIM && AIM.kind === 'player') { html = esc((ST.players[AIM.k] || {}).nick || ''); sub = P.hand.length ? '맨 위 책 건네기' : '사서'; }
  else if (AIM && AIM.kind === 'stone') { html = '🔮 회수의 돌'; sub = '아직 꽂지 않은 책을 모두 이곳으로 불러와요'; }
  const can = AIM && AIM.kind !== 'filler' && !(AIM.kind === 'slot' && !P.hand.length);
  $('aim').innerHTML = html ? `${can ? '<div class="press"><kbd>E</kbd> 행동</div>' : ''}<div class="t">${html}</div>${sub ? `<small>${sub}</small>` : ''}` : '';
  $('cross').classList.toggle('hot', !!AIM);
  // 외곽선
  if (AIM && AIM.kind === 'book' && OUTLINE) { BOOKS.getMatrixAt(AIM.id, OUTLINE.matrix); const p = new THREE.Vector3(), q = new THREE.Quaternion(); OUTLINE.matrix.decompose(p, q, _s); _s.multiplyScalar(1.04); OUTLINE.matrix.compose(p, q, _s); OUTLINE.matrixWorldNeedsUpdate = true; OUTLINE.visible = true; } else if (OUTLINE) OUTLINE.visible = false;
  updateGhost();
}
// 꽂을 자리 미리보기: 초록 = 놓을 수 있음, 빨강 = 막힘 (손의 맨 위 책 모양)
const ghost = new THREE.Mesh(new THREE.BoxGeometry(1, 1, 1), new THREE.MeshBasicMaterial({ color: '#6ae46a', transparent: true, opacity: .45, depthWrite: false })); ghost.visible = false; scene.add(ghost);
function updateGhost() {
  if (AIM && AIM.kind === 'slot' && P.hand.length) { const T = LIB.titles[LIB.books[P.hand[0]].t], [x, y, z, ry] = slotPos(AIM.c, AIM.k, AIM.s, T); ghost.position.set(x, y, z); ghost.rotation.set(0, ry, 0); ghost.scale.set(T.w, T.h, T.d); ghost.visible = true; ghost.material.color.set('#6ae46a'); }
  else ghost.visible = false;
}
const capacity = () => 10 + (minor('bag') ? 5 : 0);
async function act() {
  if (!AIM) return;
  if (AIM.kind === 'book') return pickBook(AIM.id);
  if (AIM.kind === 'slot') { if (!P.hand.length) return; if (ABIL.autoshelve.on > 0) return autoShelve(AIM.c); return placeBook(P.hand[0], AIM.c, AIM.k, AIM.s); }
  if (AIM.kind === 'map') return openMap();
  if (AIM.kind === 'key') return takeKey(AIM.i);
  if (AIM.kind === 'chest') return openChest(AIM.i);
  if (AIM.kind === 'stone') return useStone();
  if (AIM.kind === 'fairy') return catchFairy();
  if (AIM.kind === 'player') return giveBook(AIM.k);
}
const PENDING = new Set();
async function pickBook(id) {
  if (P.hand.length >= capacity()) { sfx('no'); return notice(`더 들 수 없어요 (최대 ${capacity()}권) — Q 로 내려놓거나 꽂으세요`); }
  const prev = ST.bk[id] || null, st = bookState(id); PENDING.add(id);
  const ok = await NET.tx('bk/' + id, cur => { const c = cur || null; if (c && c.startsWith('h,')) return undefined; if (c !== prev) return undefined; return 'h,' + me.k; });
  PENDING.delete(id); if (!ok) { sfx('no'); return; }
  if (st.w === 's') NET.set(`slot/${st.c}_${st.k}_${st.s}`, null);
  if (!P.hand.includes(id)) P.hand.unshift(id); sendHand(); sfx('pick'); hudHand();
}
async function placeBook(id, c, k, s) {
  const key = `${c}_${k}_${s}`;
  const ok = await NET.tx('slot/' + key, cur => cur == null ? id : undefined);
  if (!ok) { sfx('no'); return notice('그 자리는 막혀 있어요'); }
  P.hand = P.hand.filter(x => x !== id); await NET.set('bk/' + id, `s,${c},${k},${s}`); sendHand(); hudHand(); sfx('place'); NET.tx(`stat/${me.k}/p`, v => (v | 0) + 1);
  setTimeout(() => { STATUS = null; comboHit(rowStatus().book[id] === 2); }, 120);
}
// 자동 책꽂기: 조준한 책장이 맞는 책장이면 권수에 맞는 칸(같은 제목이 이미 있는 칸 우선)을 골라 제 번호 자리에 꽂음
async function autoShelve(c) {
  const C = LIB.cases[c], id = P.hand.find(x => LIB.titles[LIB.books[x].t].cat === C.cat); if (id == null) { sfx('no'); return notice('손에 이 책장에 맞는 책이 없어 자동 꽂기에 실패했어요'); }
  const b = LIB.books[id], T = LIB.titles[b.t], inComp = k => Object.entries(ST.slot).filter(([key]) => key.startsWith(`${c}_${k}_`)).map(([, v]) => LIB.books[+v]);
  const fits = C.comps.filter(cp => cp.size === T.vols), mine = fits.find(cp => { const l = inComp(cp.k); return l.length && l.every(x => x.t === b.t); }), empty = fits.find(cp => !inComp(cp.k).length), cp = mine || empty;
  if (!cp || ST.slot[`${c}_${cp.k}_${b.v - 1}`] != null) { sfx('no'); return notice('대상 위치가 막혀 있거나 이미 다른 책장에 있어 자동 꽂기에 실패했어요'); }
  sfx('magic'); return placeBook(id, c, cp.k, b.v - 1);
}
let dropT = 0;
function drop(all) {
  if (!P.hand.length) return;
  const ids = all ? P.hand.slice() : [P.hand[0]], fx = P.x - Math.sin(P.yaw) * .7, fz = P.z - Math.cos(P.yaw) * .7, up = {}, base = baseY(fx, fz, P.y + .4);
  let h = floorStack(fx, fz, base);
  ids.forEach(id => { const T = LIB.titles[LIB.books[id].t]; up[id] = `f,${(fx + (all ? 0 : (Math.random() - .5) * .2)).toFixed(2)},${(base + h).toFixed(3)},${(fz).toFixed(2)},${(all ? P.yaw : Math.random() * 6.28).toFixed(2)}`; h += T.w; });
  P.hand = P.hand.filter(x => !ids.includes(x)); NET.update('bk', up); sendHand(); hudHand(); sfx('drop');
}
function baseY(x, z, below) { let y = 0; for (const s of solids) if (x > s[0] && x < s[3] && z > s[2] && z < s[5] && s[4] <= below && s[4] > y) y = s[4]; return y; }
function floorStack(x, z, base) { let h = 0; for (const b of LIB.books) { const st = bookState(b.id); if (st.w === 'f' && Math.abs(st.p[0] - x) < .15 && Math.abs(st.p[2] - z) < .15 && Math.abs(st.p[1] - base) < 1.2) h = Math.max(h, st.p[1] - base + LIB.titles[b.t].w); } return h; }
function dropUp() { if (dropT && performance.now() - dropT < 450) drop(false); dropT = 0; }
function returnHand() { if (P.hand.length) drop(true); }

// ════════════ 마법 (원작: 주요 마법 5 · 보조 마법 4 — 완성한 칸 2개마다 포인트 1) ════════════
const ICON = {
  sort: '<path d="M4 6h9M4 10h7M4 14h5M4 18h3"/><path d="M18 4v16M15 7l3-3 3 3M15 17l3 3 3-3"/>',
  guide: '<path d="M9 18h6M10 21h4M12 3a6 6 0 0 0-4 10.5c.8.8 1 1.5 1 2.5h6c0-1 .2-1.7 1-2.5A6 6 0 0 0 12 3z"/><path d="M12 7v3"/><path d="M3 9l2 .5M21 9l-2 .5M5 3l1.5 1.5M19 3l-1.5 1.5"/>',
  glow: '<path d="M2 12s4-6 10-6 10 6 10 6-4 6-10 6S2 12 2 12z"/><circle cx="12" cy="12" r="3.2" fill="currentColor"/><path d="M12 1.5v2.5M4.5 3.5l1.8 1.8M19.5 3.5l-1.8 1.8M12 20v2.5M4.5 20.5l1.8-1.8M19.5 20.5l-1.8-1.8"/>',
  gather: '<rect x="3" y="7" width="4" height="13"/><rect x="8" y="10" width="4" height="10"/><path d="M14 20h7V11h-7z"/><path d="M15 6c2-2.5 5-2.5 6.5 0M21.5 6l-.5-2.5M21.5 6l-2.5-.3"/>',
  autoshelve: '<path d="M3 19c3-7 9-11 16-12"/><path d="M11 15l7-3.5 3 4-7 3.5z"/><path d="M3 21h18"/>',
  bag: '<path d="M5 8h14l-1.2 12H6.2z"/><path d="M9 8V6a3 3 0 0 1 6 0v2"/>', swift: '<path d="M7 3v10l-2.5 5h14l2-3-6.5-2.5V3z"/><path d="M1 8h4M1 12h3"/>',
  reach: '<path d="M8 12V5a1.5 1.5 0 0 1 3 0v6M11 11V4a1.5 1.5 0 0 1 3 0v7M14 11V6a1.5 1.5 0 0 1 3 0v8a7 7 0 0 1-7 7h-.5a6 6 0 0 1-5-2.7L3 14.5a1.5 1.5 0 0 1 2.5-1.6L8 15"/>', sense: '<circle cx="10" cy="10" r="6"/><path d="M14.5 14.5l6 6"/>',
  run: '<circle cx="15" cy="4" r="2"/><path d="M9 21l3-6 3 2v5M5 12l3-4h5l3 4 3 1"/>', jump: '<path d="M12 3v13M7 8l5-5 5 5M5 21h14"/>'
};
const svg = (k, s = 30) => `<svg viewBox="0 0 24 24" width="${s}" height="${s}" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round">${ICON[k]}</svg>`;
const ABIL = {
  sort: { n: '정렬', k: 1, d: '손에 든 책을 제목·권 번호 순서대로 자동 정렬해요. 이 능력은 발동 즉시 재사용 대기에 들어가요.', cd: l => 10 - l, on: 0, cdT: 0 },
  guide: { n: '책장 가이드', k: 2, d: '손에 든 맨 위 책에 맞는 책장과 알맞은 칸을 강조해 올바른 위치로 안내해요. 지속 시간 동안 효과가 유지돼요.', cd: l => 30 - 3 * l, act: l => 8 + 2 * l, on: 0, cdT: 0 },
  glow: { n: '통찰', k: 3, d: '손에 든 맨 위 책을 기준으로 같은 제목의 책들을 빛나게 해요. 빛나는 책은 책더미 속에서도 쉽게 찾을 수 있어요. 마법이 켜져 있는 동안 여러 번 쓸 수 있어요.', cd: l => 60 - 5 * l, act: l => 7 + 3 * l, on: 0, cdT: 0 },
  gather: { n: '불러모으기', k: 4, d: '손에 든 맨 위 책을 기준으로 같은 제목의 책이 손안으로 모여들어요. 이 능력은 발동 즉시 재사용 대기에 들어가요.', cd: l => 40 - 4 * l, grab: l => 2 + l, on: 0, cdT: 0 },
  autoshelve: { n: '자동 책꽂기', k: 5, d: '손에 든 책을 즉시 책장에 꽂는 마법이에요. 조준점으로 가리키는 책장에만 효과가 있고, 그 책장에 맞는 책만 알맞은 칸과 자리를 골라 꽂아요. 켜져 있는 동안 계속 쓸 수 있어요.', cd: l => 60 - 6 * l, act: l => 6 + 2 * l, on: 0, cdT: 0 } };
const MINOR = { bag: { n: '큰 책가방', d: '모든 사서가 책을 5권 더 들 수 있어요 (10 → 15권).' }, swift: { n: '가벼운 발걸음', d: '모든 사서의 이동 속도가 20% 빨라져요.' }, reach: { n: '긴 팔', d: '더 멀리 있는 책과 책장에 손이 닿아요 (3.2m → 4.6m).' }, sense: { n: '책 냄새', d: '책을 조준하면 어느 책장의 몇 권짜리 칸으로 가야 하는지 보여요.' } };
const minor = k => LIB && LIB.chests.some(c => c.reward === k && ST.chests[c.i]);
const glowFx = { series: null };
const abLv = k => ST.lv[k] | 0;
const earned = () => Math.floor(rowStatus().done / 2) + (ST.fbonus | 0) + rowStatus().catDone.size;
const points = () => earned() - (ST.spent | 0);
function useAbility(k) {
  const A = ABIL[k], l = abLv(k);
  if (k === 'glow' && A.on > 0) { if (!P.hand.length) return; glowFx.series = LIB.books[P.hand[0]].t; booksDirty = true; sfx('magic'); return; }   // 켜져 있는 동안 다시 쓰기
  if (A.cdT > 0) { sfx('no'); return; }
  if (k === 'guide') { if (!P.hand.length) return notice('손에 책이 없어요'); A.on = A.act(l); }
  if (k === 'sort') { if (P.hand.length < 2) return; P.hand.sort((a, b) => LIB.books[a].t - LIB.books[b].t || LIB.books[a].v - LIB.books[b].v); sendHand(); hudHand(); }
  if (k === 'glow') { if (!P.hand.length) return notice('손에 책이 없어요'); A.on = A.act(l); glowFx.series = LIB.books[P.hand[0]].t; booksDirty = true; }
  if (k === 'gather') {
    if (!P.hand.length) return notice('손에 책이 없어요');
    const t = LIB.books[P.hand[0]].t, want = LIB.books.filter(b => b.t === t && !P.hand.includes(b.id) && bookState(b.id).w === 'f').slice(0, Math.min(A.grab(l), capacity() - P.hand.length));
    if (!want.length) return notice('불러올 책이 없어요');
    want.forEach(b => pickBook(b.id));
  }
  if (k === 'autoshelve') A.on = A.act(l);
  A.cdT = A.cd(l); sfx('magic'); hudAbil();
}
// 가이드: 책장 상자 강조 + 알맞은 칸 위에 빛 막대
const GUIDE = [];
function tickAbil(dt) {
  for (const k in ABIL) { const A = ABIL[k]; if (A.on > 0) { A.on -= dt; if (A.on <= 0) { A.on = 0; if (k === 'glow') { glowFx.series = null; booksDirty = true; } } } if (A.cdT > 0) A.cdT = Math.max(0, A.cdT - dt); }
  const top = ABIL.guide.on > 0 && P.hand.length ? LIB.books[P.hand[0]] : null, T = top && LIB.titles[top.t], now = performance.now();
  for (const C of CASES) { const fl = FX.flash[C.c.i], fa = fl ? Math.max(0, 1 - (now - fl) / 1400) : 0; if (fl && fa <= 0 && now > fl) delete FX.flash[C.c.i]; C.hl.material.opacity = Math.max(T && C.c.cat === T.cat ? .14 + .08 * Math.sin(now / 150) : 0, now < fl ? .3 : fa * .3); }
  let gi = 0;
  if (T) { const C = LIB.cases[T.caseI]; for (const cp of C.comps) { if (cp.size !== T.vols) continue; const inside = Object.entries(ST.slot).filter(([key]) => key.startsWith(`${C.i}_${cp.k}_`)).map(([, v]) => LIB.books[+v]); if (inside.some(x => x.t !== T.i)) continue;
    let g = GUIDE[gi]; if (!g) { g = GUIDE[gi] = new THREE.Mesh(new THREE.BoxGeometry(1, 1, 1), new THREE.MeshBasicMaterial({ color: '#ffe08a', transparent: true, opacity: .35, depthWrite: false, blending: THREE.AdditiveBlending })); scene.add(g); }
    const x0 = cp.col ? CASE.post / 2 : -CASE.w / 2 + CASE.post, [x, y, z] = toWorld(C, x0 + cp.x0 + cp.w / 2, CASE.base + cp.lv * CASE.rowH + CASE.rowH / 2, CASE.d / 2 - .1); g.position.set(x, y, z); g.rotation.set(0, C.ry, 0); g.scale.set(cp.w, CASE.rowH - .06, .2); g.material.opacity = .25 + .12 * Math.sin(now / 160); g.visible = true; gi++; } }
  for (; gi < GUIDE.length; gi++) GUIDE[gi].visible = false;
  if (COMBO.boost > 0) COMBO.boost = Math.max(0, COMBO.boost - dt);
}
// 능력 목록: 펼친 책 (왼쪽 = 주요 마법 5 · 보조 마법 4, 오른쪽 = 고른 마법 설명 · 레벨 업)
let abSel = 'glow';
function openAbil() {
  const pts = points(), left = 2 - rowStatus().done % 2, A = ABIL[abSel], MI = MINOR[abSel], l = A ? abLv(abSel) : 0, max = l >= 4;
  const major = Object.entries(ABIL).map(([k, B]) => `<div class="mg ${k === abSel ? 'sel' : ''}" data-k="${k}">${svg(k, 34)}<span>${abLv(k) >= 4 ? 'Max' : 'Lv.' + (abLv(k) + 1)}</span></div>`).join('');
  const minors = Object.entries(MINOR).map(([k]) => `<div class="mg mn ${minor(k) ? '' : 'lock'} ${k === abSel ? 'sel' : ''}" data-k="${k}">${minor(k) ? svg(k, 26) : '<b>🔒</b>'}</div>`).join('');
  let right = '';
  if (A) right = `<div class="big">${svg(abSel, 92)}</div><h3>❖ ${A.n} ❖</h3><div class="lvl">Lv.${l + 1}${max ? ' (Max)' : ''}</div><p>${A.d}</p><ul><li>재사용 대기(초): ${A.cd(l)}${max ? '' : ` → <b>${A.cd(l + 1)}</b>`}</li>${A.act ? `<li>지속 시간(초): ${A.act(l)}${max ? '' : ` → <b>${A.act(l + 1)}</b>`}</li>` : ''}${A.grab ? `<li>한 번에 모으는 책: ${A.grab(l)}${max ? '' : ` → <b>${A.grab(l + 1)}</b>`}</li>` : ''}</ul>${max ? '' : `<button class="btn" id="abUp" ${pts > 0 ? '' : 'disabled'}>레벨 업 (포인트 1)</button>`}`;
  else right = `<div class="big">${minor(abSel) ? svg(abSel, 92) : '<b style="font-size:70px">🔒</b>'}</div><h3>❖ ${MI.n} ❖</h3><div class="lvl">${minor(abSel) ? '해금됨' : '잠김 — 보물상자를 열면 해금'}</div><p>${MI.d}</p>`;
  $('abox').innerHTML = `<div class="page l"><div class="ribbon">${svg('glow', 40)}</div><h2>❦ 능력 ❦</h2><div class="sub">레벨 업!</div><div class="sub2">마법 레벨을 올려 더 효율적으로 정리하세요</div>
    <h4>✷ 주요 마법 <span class="pt">↑ +${pts} 포인트</span></h4><div class="mgs">${major}</div><div class="hint2">칸 ${left}개 더 완성하면 포인트 +1${NET.solo ? '' : ' · 포인트와 레벨은 모든 사서가 함께 써요'}</div>
    <h4>✷ 보조 마법</h4><div class="mgs">${minors}</div></div><div class="page r">${right}</div><div class="back"><kbd>K</kbd> 닫기</div>`;
  $('ovAbil').classList.remove('hide'); document.exitPointerLock();
  $('abox').querySelectorAll('.mg').forEach(b => b.onclick = () => { abSel = b.dataset.k; openAbil(); });
  const up = $('abUp'); if (up) up.onclick = async () => { const ok = await NET.tx('spent', cur => (cur | 0) < earned() ? (cur | 0) + 1 : undefined); if (ok) { await NET.tx('lv/' + abSel, cur => Math.min(4, (cur | 0) + 1)); sfx('magic'); setTimeout(openAbil, 150); } };
}

// ════════════ 열쇠 · 보물상자 · 회수의 돌 ════════════
const KEYMESH = [], CHESTMESH = [], STONE = { mesh: null };
function buildProps() {
  for (const k of LIB.keys) { const g = new THREE.Mesh(new THREE.TorusGeometry(.07, .022, 8, 16), new THREE.MeshStandardMaterial({ color: k.c, emissive: k.c, emissiveIntensity: .6 })); g.position.set(k.pos[0], k.pos[1] + .12, k.pos[2]); g.userData = { kind: 'key', i: k.i }; scene.add(g); KEYMESH.push(g); }
  for (const c of LIB.chests) { const [x, y, z] = c.pos, g = new THREE.Mesh(new THREE.BoxGeometry(.7, .45, .45), new THREE.MeshStandardMaterial({ map: woodTex, color: '#a07040', roughness: .6 })); g.position.set(x, y + .23, z); g.userData = { kind: 'chest', i: c.i }; scene.add(g);
    for (const yy of [-.15, .15]) { const band = new THREE.Mesh(new THREE.BoxGeometry(.72, .04, .47), M.gold); band.position.y = yy; g.add(band); }
    const t = new THREE.Mesh(new THREE.BoxGeometry(.16, .14, .02), new THREE.MeshBasicMaterial({ color: c.c })); t.position.set(0, .05, .235); g.add(t); CHESTMESH.push(g); solids.push([x - .35, y, z - .23, x + .35, y + .45, z + .23]); }
  STONE.mesh = new THREE.Mesh(new THREE.OctahedronGeometry(.18), new THREE.MeshStandardMaterial({ color: '#8a6aff', emissive: '#6a4aff', emissiveIntensity: .8 })); STONE.mesh.position.set(TABLES[1][0], 1.05, TABLES[1][1]); STONE.mesh.userData = { kind: 'stone' }; STONE.mesh.visible = false; scene.add(STONE.mesh);
}
async function takeKey(i) { const ok = await NET.tx('keys/' + i, cur => cur ? undefined : me.k); if (ok) { sfx('pick'); toast(`${LIB.keys[i].ic} ${LIB.keys[i].n}를 주웠어요 — 같은 표식의 상자를 찾아보세요`, 3200); } }
async function openChest(i) {
  if (ST.chests[i]) return; const c = LIB.chests[i];
  if (ST.keys[c.key] !== me.k) { sfx('no'); return notice('필요한 열쇠를 아직 얻지 않았어요'); }
  const ok = await NET.tx('chests/' + i, cur => cur ? undefined : me.k); if (!ok) return;
  NET.set('keys/' + c.key, 'used'); sfx('chest');
  toast(`🔓 보조 마법 「${MINOR[c.reward].n}」 해금! ${MINOR[c.reward].d}`, 4200);
  setTimeout(() => toast('믿어라! 상자 안에 함정은 설치하지 않았다!'), 4400);
}
function useStone() {   // 회수의 돌: 남은 책이 20권 이하일 때, 아직 꽂지 않은 책을 전부 탁자 옆으로
  if (!stoneReady()) return notice('책이 20권 남으면 회수의 돌을 쓸 수 있어요');
  const up = {}; let k = 0; const [tx, tz] = TABLES[1]; for (const b of LIB.books) { const st = bookState(b.id); if (st.w !== 'f') continue; up[b.id] = `f,${(tx - .6 + (k % 4) * .4).toFixed(2)},${(.82 + Math.floor(k / 4) * .07).toFixed(3)},${tz.toFixed(2)},0`; k++; }
  NET.update('bk', up); NET.tx('stone', cur => (cur | 0) + 1); sfx('magic'); toast(`🔮 책 ${k}권을 불러왔어요`);
}
const stoneReady = () => LIB.books.length - rowStatus().good <= 20;

// ════════════ 다른 사서 (아바타) ════════════
const OTHERS = {};
function avatar(col, name) {
  const g = new THREE.Group(), m = new THREE.MeshStandardMaterial({ color: col, roughness: .8 });
  const body = new THREE.Mesh(new THREE.CylinderGeometry(.22, .32, 1.2, 12), m); body.position.y = .6; g.add(body);
  const head = new THREE.Mesh(new THREE.SphereGeometry(.2, 16, 12), new THREE.MeshStandardMaterial({ color: '#f2d2b0' })); head.position.y = 1.42; g.add(head);
  const eyeM = new THREE.MeshBasicMaterial({ color: '#2a1a10' }); for (const s of [-1, 1]) { const e = new THREE.Mesh(new THREE.SphereGeometry(.025, 8, 6), eyeM); e.position.set(s * .07, 1.44, .18); g.add(e); }
  const hat = new THREE.Mesh(new THREE.ConeGeometry(.24, .5, 12), m); hat.position.y = 1.78; g.add(hat);
  const lab = new THREE.Sprite(new THREE.SpriteMaterial({ map: tex(256, 64, (x, w, h) => { x.fillStyle = 'rgba(0,0,0,.55)'; x.fillRect(0, 8, w, 48); x.fillStyle = '#fff'; x.font = '36px Jua, sans-serif'; x.textAlign = 'center'; x.textBaseline = 'middle'; x.fillText(name, w / 2, 33); }), depthTest: false })); lab.scale.set(1, .25, 1); lab.position.y = 2.25; g.add(lab);
  const hit = new THREE.Mesh(new THREE.BoxGeometry(.6, 2, .6), new THREE.MeshBasicMaterial({ visible: false })); hit.position.y = 1; g.add(hit); g.userData.hit = hit;
  scene.add(g); return g;
}
function syncOthers(pos, players) {
  for (const k in pos) { if (k === me.k || !players[k]) continue; const p = pos[k], O = OTHERS[k] = OTHERS[k] || { mesh: avatar(PCOL[(players[k].col || 0) % 8], players[k].nick) }; if (!O.hit) { O.hit = O.mesh.userData.hit; O.hit.userData = { kind: 'player', k }; } O.tx = p.x; O.ty = p.y; O.tz = p.z; O.tyaw = p.yw; O.hand = (p.h ? String(p.h).split(',').map(Number) : []); }
  for (const k in OTHERS) if (!pos[k] || !players[k]) { scene.remove(OTHERS[k].mesh); delete OTHERS[k]; }
}
let posT = 0;
function sendPos(dt) { if (NET.solo) return; posT += dt; if (posT < .1) return; posT = 0; NET.set('pos/' + me.k, { x: +P.x.toFixed(2), y: +P.y.toFixed(2), z: +P.z.toFixed(2), yw: +P.yaw.toFixed(2), h: P.hand.join(',') }); }
function sendHand() { if (!NET.solo) NET.set('pos/' + me.k + '/h', P.hand.join(',')); booksDirty = true; STATUS = null; }

// ════════════ 방 상태 반영 ════════════
let lastRows = 0;
function onRoom(r) {
  if (!LIB) return;
  ST.bk = r.bk || {}; ST.slot = r.slot || {}; ST.keys = r.keys || {}; ST.chests = r.chests || {}; ST.lv = r.lv || {}; ST.spent = r.spent || 0; ST.stone = r.stone || 0; ST.players = r.players || ST.players; ST.done = r.done || null; ST.permits = r.permits || {};
  STATUS = null; booksDirty = true;
  // 남이 내 손의 책을 가져갔으면(동시 집기 경합) 손에서 뺌
  P.hand = P.hand.filter(id => (ST.bk[id] || '') === 'h,' + me.k);
  for (const id in ST.bk) if (ST.bk[id] === 'h,' + me.k && !P.hand.includes(+id) && !PENDING.has(+id)) { P.hand.unshift(+id); toast('📖 동료가 책을 건넸어요'); sfx('pick'); }   // 건네받은 책
  ST.fbonus = r.fbonus || 0; ST.stat = r.stat || {}; ST.ping = r.ping || {};
  if (!isHost && r.fairy) { FAIRY.net = r.fairy; } if (isHost && r.fairy && !r.fairy.on && FAIRY.on && r.fairy.by) { FAIRY.on = 0; FAIRY.next = 70 + Math.random() * 50; } if (r.fairy && r.fairy.on && !FAIRY.seenOn) { FAIRY.seenOn = 1; notice('🧚 요정이 나타났어요! 책을 흩뜨리기 전에 잡으세요 (조준하고 E)', 4000); sfx('giggle'); } if (r.fairy && !r.fairy.on) { if (FAIRY.seenOn && r.fairy.by) toast(`🧚 ${r.fairy.by === me.k ? '내가' : ((ST.players[r.fairy.by] || {}).nick || '누군가') + '님이'} 요정을 잡았어요! 능력 포인트 +1`, 3200); FAIRY.seenOn = 0; }
  if (!NET.solo) syncOthers(r.pos || {}, r.players || {});
  for (const k of KEYMESH) k.visible = !ST.keys[k.userData.i];
  CHESTMESH.forEach((c, i) => { c.scale.y = ST.chests[i] ? .55 : 1; });
  STONE.mesh.visible = stoneReady();
  const S = rowStatus(); celebrate(S);
  if (S.done > lastRows) { sfx('row'); notice(`✨ 책장 칸 하나 완성! (${S.done}/${LIB.titles.length})${S.done % 2 === 0 ? ' — 포인트 +1, K 로 능력 레벨 업' : ''}`); }
  lastRows = S.done;
  // 허가 통지 (원작: 비상 상황 시 도서관 내 높이뛰기 허가 통지)
  if (isHost && S.done >= 6 && !ST.permits.jump) NET.set('permits/jump', 1);
  if (ST.permits.jump && !shown.jump) { shown.jump = 1; letter('비상 상황 시 도서관 내 높이뛰기 허가 통지', '학장님의 승인에 따라 이제 도서관 안에서 <b>높이뛰기</b>가 허용됩니다. 곧바로 2층까지 뛰어오를 수 있습니다.<br><br><b>스페이스 바</b>를 길게 누를수록 더 높이 뜁니다.'); }
  // 손에 든 사서가 나가 버린 책은 방장이 가운데 바닥으로 돌려놓음
  if (isHost && !NET.solo) { const up = {}; let n = 0; for (const id in ST.bk) { const v = ST.bk[id]; if (v.startsWith('h,') && !(r.players || {})[v.slice(2)]) up[id] = `f,${(-1 + (n % 5) * .3).toFixed(2)},${(Math.floor(n / 5) * .07).toFixed(3)},-.8,0`, n++; } if (n) NET.update('bk', up); }
  // 다 정리했으면 끝
  if (!ST.done && S.good === LIB.books.length) NET.tx('done', cur => cur ? undefined : { t: Date.now(), by: me.k });
  if (ST.done && !shown.end) { shown.end = 1; setTimeout(showEnd, 900); }
  hudProg(); hudHand(); hudAbil();
}
const shown = {};

// ════════════ 요정의 방해 (방장이 움직이고 모두에게 동기화) ════════════
// 1분쯤 뒤부터 70~120초마다 나타나 책장 3곳에서 장난(책 뽑아 던지기 · 책 두 권 자리 바꾸기). 조준하고 E 로 잡으면 팀 능력 포인트 +1
const FAIRY = { on: 0, next: 60, x: 0, y: 3, z: 0, tx: 0, ty: 3, tz: 0, ph: 'fly', t: 0, left: 0, mesh: null, hit: null, net: null, seenOn: 0, sendT: 0 };
function buildFairy() {
  const g = new THREE.Group(), glow = new THREE.Sprite(new THREE.SpriteMaterial({ map: tex(64, 64, (x) => { const r = x.createRadialGradient(32, 32, 2, 32, 32, 30); r.addColorStop(0, 'rgba(255,240,255,1)'); r.addColorStop(.3, 'rgba(255,150,230,.8)'); r.addColorStop(1, 'rgba(255,120,220,0)'); x.fillStyle = r; x.fillRect(0, 0, 64, 64); }), blending: THREE.AdditiveBlending, depthWrite: false }));
  glow.scale.set(.6, .6, .6); g.add(glow);
  const body = new THREE.Mesh(new THREE.SphereGeometry(.07, 12, 10), new THREE.MeshBasicMaterial({ color: '#fff0fb' })); g.add(body);
  const wm = new THREE.MeshBasicMaterial({ color: '#c8f0ff', transparent: true, opacity: .7, side: THREE.DoubleSide, depthWrite: false });
  for (const sgn of [-1, 1]) { const w = new THREE.Mesh(new THREE.PlaneGeometry(.18, .12), wm); w.position.set(sgn * .1, .03, 0); w.userData.s = sgn; g.add(w); }
  const hit = new THREE.Mesh(new THREE.SphereGeometry(.35, 8, 6), new THREE.MeshBasicMaterial({ visible: false })); hit.userData = { kind: 'fairy' }; g.add(hit);
  g.visible = false; scene.add(g); FAIRY.mesh = g; FAIRY.hit = hit;
}
function fairyTarget() {   // 꽂힌 책이 있는 책장 쪽으로 (없으면 아무 책장)
  const busy = LIB.cases.filter(C => Object.keys(ST.slot).some(k => k.startsWith(C.i + '_'))), C = (busy.length ? busy : LIB.cases)[Math.floor(Math.random() * (busy.length || LIB.cases.length))];
  const [x, , z] = toWorld(C, (Math.random() - .5) * 1.4, 0, 1.0);
  FAIRY.target = C.i; FAIRY.tx = x; FAIRY.ty = C.y + 1.3 + Math.random() * .8; FAIRY.tz = z; FAIRY.ph = 'fly';
}
function spawnFairy() { FAIRY.on = 1; FAIRY.left = 3; const s = [[1, 6.5, 0], [-6, 5.5, -3], [6, 5.5, 3]][Math.floor(Math.random() * 3)]; FAIRY.x = s[0]; FAIRY.y = s[1]; FAIRY.z = s[2]; fairyTarget(); NET.set('fairy', { on: 1, x: FAIRY.x, y: FAIRY.y, z: FAIRY.z }); }
function mischief() {   // 책장 한 곳에서 장난: 반은 책을 뽑아 바닥에, 반은 두 권 자리 바꾸기
  const C = LIB.cases[FAIRY.target], mine = Object.entries(ST.slot).filter(([k]) => k.startsWith(C.i + '_'));
  if (!mine.length) return;
  const up = {}, slotUp = {};
  if (Math.random() < .5 || mine.length < 2) {
    const n = Math.min(mine.length, 1 + Math.floor(Math.random() * 3));
    for (let i = 0; i < n; i++) { const [k, id] = mine.splice(Math.floor(Math.random() * mine.length), 1)[0]; slotUp[k] = null; const [x, , z] = toWorld(C, (Math.random() - .5) * 1.6, 0, 1 + Math.random() * .8); up[id] = `f,${x.toFixed(2)},${(C.y + i * .08).toFixed(3)},${z.toFixed(2)},${(Math.random() * 6.28).toFixed(2)}`; }
    notice(`🧚 요정이 ${C.lab} 책장에서 책을 뽑아 던졌어요!`);
  } else {
    const [k1, a] = mine[Math.floor(Math.random() * mine.length)], comp = k1.split('_')[1], same = mine.filter(([k]) => k.split('_')[1] === comp && k !== k1), pick = same.length ? same : mine.filter(([k]) => k !== k1);
    const [k2, b] = pick[Math.floor(Math.random() * pick.length)];
    slotUp[k1] = b; slotUp[k2] = a; const p1 = k1.split('_'), p2 = k2.split('_'); up[a] = `s,${p2[0]},${p2[1]},${p2[2]}`; up[b] = `s,${p1[0]},${p1[1]},${p1[2]}`;
    notice(`🧚 요정이 ${C.lab} 책장의 책 순서를 뒤섞었어요!`);
  }
  NET.update('slot', slotUp); NET.update('bk', up); sfx('giggle');
}
function updateFairy(dt) {
  if (!FAIRY.mesh) buildFairy();
  const t = performance.now() / 1000;
  if (isHost) {
    if (!FAIRY.on) { if (!ST.done) { FAIRY.next -= dt; if (FAIRY.next <= 0) { spawnFairy(); } } }
    else {
      if (ST.fairyCaught) { FAIRY.on = 0; ST.fairyCaught = 0; }
      const dx = FAIRY.tx - FAIRY.x, dy = FAIRY.ty - FAIRY.y, dz = FAIRY.tz - FAIRY.z, d = Math.hypot(dx, dy, dz);
      if (FAIRY.ph === 'fly') { const sp = 4 * dt; if (d < sp) { FAIRY.ph = 'mess'; FAIRY.t = 2.6; } else { FAIRY.x += dx / d * sp; FAIRY.y += dy / d * sp; FAIRY.z += dz / d * sp; } }
      else if (FAIRY.ph === 'mess') { FAIRY.t -= dt; FAIRY.x += Math.sin(t * 6) * .01; if (FAIRY.t <= 0) { mischief(); FAIRY.left--; if (FAIRY.left <= 0) { FAIRY.ph = 'leave'; FAIRY.tx = 1; FAIRY.ty = 7.6; FAIRY.tz = 0; } else fairyTarget(); } }
      else if (FAIRY.ph === 'leave') { const sp = 4 * dt; FAIRY.x += dx / (d || 1) * sp; FAIRY.y += dy / (d || 1) * sp; FAIRY.z += dz / (d || 1) * sp; if (d < .3) { FAIRY.on = 0; FAIRY.next = 70 + Math.random() * 50; NET.set('fairy', { on: 0 }); } }
      FAIRY.sendT -= dt; if (FAIRY.on && FAIRY.sendT <= 0 && !NET.solo) { FAIRY.sendT = .12; NET.update('fairy', { x: +FAIRY.x.toFixed(2), y: +FAIRY.y.toFixed(2), z: +FAIRY.z.toFixed(2) }); }
    }
  } else if (FAIRY.net) { const f = FAIRY.net; FAIRY.on = f.on; if (f.on) { FAIRY.x += (f.x - FAIRY.x) * Math.min(1, dt * 8); FAIRY.y += (f.y - FAIRY.y) * Math.min(1, dt * 8); FAIRY.z += (f.z - FAIRY.z) * Math.min(1, dt * 8); } }
  const m = FAIRY.mesh; m.visible = !!FAIRY.on;
  if (m.visible) { m.position.set(FAIRY.x, FAIRY.y + Math.sin(t * 3) * .08, FAIRY.z); for (const w of m.children) if (w.userData.s) w.rotation.y = w.userData.s * Math.sin(t * 30) * .8; m.children[0].scale.setScalar(.5 + Math.sin(t * 8) * .08); }
}
async function catchFairy() {
  const ok = await NET.tx('fairy', cur => cur && cur.on ? { on: 0, by: me.k, t: Date.now() } : undefined);
  if (!ok) return;
  ST.fairyCaught = 1; FAIRY.on = 0; FAIRY.next = 70 + Math.random() * 50; sfx('chest');
  NET.tx('fbonus', v => (v | 0) + 1); NET.tx(`stat/${me.k}/f`, v => (v | 0) + 1);
  for (const k in ABIL) ABIL[k].cdT = 0;
  if (NET.solo) toast('🧚 요정을 잡았어요! 능력 포인트 +1 · 마법 재사용 대기 초기화', 3200);
}
// ════════════ 협동 도구: 핑(F/휠 클릭) · 책 건네기(동료 조준 + E) ════════════
const PINGS = {};
function ping() {
  ray.setFromCamera({ x: 0, y: 0 }, cam); ray.far = 30;
  const hits = ray.intersectObjects(scene.children, true).filter(h => h.object.visible !== false && h.object.type !== 'Sprite' && h.object.type !== 'LineSegments' && !(h.object.material && h.object.material.visible === false) && h.object !== ghost && h.object !== glowMesh && !(h.object === BOOKS && bookState(h.instanceId).w === 'h'));
  const h = hits[0]; if (!h) return;
  let txt = '여기!'; const u = h.object.userData;
  if (u.kind === 'books') { const b = LIB.books[h.instanceId], T = LIB.titles[b.t]; txt = `📖 ${T.name} ${b.v}권`; }
  else if (u.kind === 'key') txt = '🗝 열쇠!'; else if (u.kind === 'chest') txt = '🧰 상자'; else if (u.kind === 'fairy') txt = '🧚 요정!';
  else { const C = LIB.cases.find(C => { const b = caseBox(C, caseH(C) + .5); return h.point.x > b[0] - .1 && h.point.x < b[3] + .1 && h.point.z > b[2] - .1 && h.point.z < b[5] + .1 && h.point.y > b[1] - .1 && h.point.y < b[4]; }); if (C) txt = `📚 ${C.lab} ${C.name}`; }
  const v = { x: +h.point.x.toFixed(2), y: +h.point.y.toFixed(2), z: +h.point.z.toFixed(2), txt, t: Date.now() };
  NET.set('ping/' + me.k, v); sfx('ping');
}
function drawPings() {
  const now = Date.now();
  for (const k in ST.ping) {
    const v = ST.ping[k]; if (!v || now - v.t > 7000) { if (PINGS[k]) { scene.remove(PINGS[k].g); delete PINGS[k]; } continue; }
    let Pg = PINGS[k];
    if (!Pg || Pg.t !== v.t) {
      if (Pg) scene.remove(Pg.g);
      const col = k === me.k ? (me.col || PCOL[0]) : PCOL[((ST.players[k] || {}).col || 0) % 8], nm = k === me.k ? '나' : (ST.players[k] || {}).nick || '';
      const g = new THREE.Group(), lab = new THREE.Sprite(new THREE.SpriteMaterial({ map: tex(512, 96, (x, w, h) => { x.fillStyle = 'rgba(20,12,6,.85)'; x.fillRect(0, 10, w, 76); x.fillStyle = col; x.fillRect(0, 10, 12, 76); x.fillStyle = '#fff'; x.font = '38px Jua, sans-serif'; x.textBaseline = 'middle'; x.fillText(`${nm}: ${v.txt}`.slice(0, 22), 24, 48); }), depthTest: false }));
      lab.scale.set(1.6, .3, 1); lab.position.y = .55; lab.renderOrder = 999; g.add(lab);
      const ring = new THREE.Mesh(new THREE.RingGeometry(.12, .17, 24), new THREE.MeshBasicMaterial({ color: col, transparent: true, depthTest: false, side: THREE.DoubleSide })); ring.renderOrder = 999; g.add(ring);
      const pin = new THREE.Mesh(new THREE.ConeGeometry(.07, .2, 8), new THREE.MeshBasicMaterial({ color: col, depthTest: false })); pin.rotation.x = Math.PI; pin.position.y = .25; pin.renderOrder = 999; g.add(pin);
      g.position.set(v.x, v.y, v.z); scene.add(g); Pg = PINGS[k] = { g, ring, t: v.t };
      if (k !== me.k) sfx('ping');
    }
    const a = (now - v.t) / 1000; Pg.ring.scale.setScalar(1 + (a * 2 % 1) * 1.5); Pg.ring.material.opacity = 1 - (a * 2 % 1); Pg.ring.lookAt(cam.position); Pg.g.children[2].position.y = .25 + Math.sin(a * 6) * .05;
  }
}
async function giveBook(k) {
  if (!P.hand.length) return; const O = OTHERS[k]; if (!O) return;
  if ((O.hand || []).length >= capacity()) { sfx('no'); return notice('동료의 손이 가득 찼어요'); }
  const id = P.hand[0], ok = await NET.tx('bk/' + id, cur => cur === 'h,' + me.k ? 'h,' + k : undefined);
  if (!ok) return; P.hand.shift(); sendHand(); hudHand(); sfx('drop'); toast(`📖 ${(ST.players[k] || {}).nick || ''}님에게 책을 건넸어요`);
}
function statTable() {
  if (NET.solo) return ''; const st = ST.stat || {};
  const rows = Object.entries(ST.players).map(([k, p]) => [p.nick, (st[k] || {}).p | 0, (st[k] || {}).f | 0]).sort((a, b) => b[1] - a[1]);
  const mvp = rows[0] ? rows[0][0] : '';
  return `<table style="width:100%;margin-top:8px;font-size:15px;border-collapse:collapse"><tr style="border-bottom:1px solid #a07a44"><th style="text-align:left">사서</th><th>꽂은 책</th><th>잡은 요정</th></tr>${rows.map(r => `<tr><td>${esc(r[0])}${r[0] === mvp ? ' 🏅' : ''}</td><td style="text-align:center">${r[1]}</td><td style="text-align:center">${r[2]}</td></tr>`).join('')}</table>`;
}

// ════════════ 손맛: 꽂히는 연출 · 금빛 불꽃 · 연속 정리 · 분야 완성 ════════════
const GOLD = new THREE.Color('#ffcf5a');
const FX = { ready: false, slot: {}, q: {}, slide: {}, flash: {}, rows: null, cats: null };
const SPARK = { pts: null, list: [], N: 900 };
function buildSparks() {
  const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.BufferAttribute(new Float32Array(SPARK.N * 3), 3)); g.setAttribute('color', new THREE.BufferAttribute(new Float32Array(SPARK.N * 3), 3));
  SPARK.pts = new THREE.Points(g, new THREE.PointsMaterial({ size: .06, map: tex(32, 32, (x, w) => { const gr = x.createRadialGradient(16, 16, 0, 16, 16, 16); gr.addColorStop(0, '#fff'); gr.addColorStop(.35, 'rgba(255,255,255,.7)'); gr.addColorStop(1, 'rgba(255,255,255,0)'); x.fillStyle = gr; x.fillRect(0, 0, w, w); }), vertexColors: true, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending }));
  SPARK.pts.frustumCulled = false; g.setDrawRange(0, 0); scene.add(SPARK.pts);
}
function burst(x, y, z, n, col, spd = 1) {
  for (let i = 0; i < n && SPARK.list.length < SPARK.N; i++) { const a = Math.random() * Math.PI * 2, u = Math.random() * 2 - 1, r = Math.sqrt(1 - u * u), s = (.5 + Math.random()) * spd; SPARK.list.push({ x, y, z, vx: Math.cos(a) * r * s, vy: Math.abs(u) * s + .5, vz: Math.sin(a) * r * s, t: 0, life: .55 + Math.random() * .5, c: col }); }
}
function tickSparks(dt) {
  const L = SPARK.list; if (!SPARK.pts) return; const pos = SPARK.pts.geometry.attributes.position, col = SPARK.pts.geometry.attributes.color; let n = 0;
  for (let i = L.length - 1; i >= 0; i--) { const p = L[i]; p.t += dt; if (p.t >= p.life) { L.splice(i, 1); continue; } p.vy -= 2.4 * dt; const d = 1 - 1.8 * dt; p.vx *= d; p.vz *= d; p.x += p.vx * dt; p.y += p.vy * dt; p.z += p.vz * dt; }
  for (const p of L) { const f = 1 - p.t / p.life; pos.setXYZ(n, p.x, p.y, p.z); col.setXYZ(n, p.c.r * f, p.c.g * f, p.c.b * f); n++; }
  SPARK.pts.geometry.setDrawRange(0, n); pos.needsUpdate = true; col.needsUpdate = true;
}
// 연속 정리: 10초 안에 정답으로 연달아 꽂으면 콤보, 5콤보마다 '신바람'(6초 동안 이동 속도 +25%)
const COMBO = { n: 0, t: 0, boost: 0 };
function comboHit(ok) {
  const now = performance.now();
  if (!ok) { if (COMBO.n >= 3) notice('콤보가 끊겼어요'); COMBO.n = 0; hudCombo(); return; }
  COMBO.n = now - COMBO.t < 10000 ? COMBO.n + 1 : 1; COMBO.t = now; sfx('good', COMBO.n - 1);
  if (COMBO.n % 5 === 0) { COMBO.boost = 6; sfx('magic'); burst(P.x, P.y + 1.2, P.z, 30, new THREE.Color('#7ad8ff'), 1.4); }
  hudCombo(true);
}
function hudCombo(pop) {
  const el = $('combo'); if (!el) return; const live = COMBO.n >= 2 && performance.now() - COMBO.t < 10000;
  el.classList.toggle('on', live || COMBO.boost > 0);
  el.innerHTML = (live ? `🔥 <b>${COMBO.n}</b> 연속${COMBO.n >= 5 ? '!' : ''}<i style="width:${100 - (performance.now() - COMBO.t) / 100}%"></i>` : '') + (COMBO.boost > 0 ? `<small>💨 신바람 ${Math.ceil(COMBO.boost)}초</small>` : '');
  if (pop) { el.classList.remove('pop'); void el.offsetWidth; el.classList.add('pop'); }
}
function compBooks(key) { const [c, k] = key.split('_').map(Number); return LIB.books.filter(b => { const st = bookState(b.id); return st.w === 's' && st.c === c && st.k === k; }); }
function celebrate(S) {   // 새로 완성된 칸 · 분야를 찾아 불꽃과 책장 번쩍임
  if (!FX.rows) { FX.rows = new Set(S.doneRows); FX.cats = new Set(S.catDone); return; }
  for (const key of S.doneRows) if (!FX.rows.has(key)) {
    for (const b of compBooks(key)) { const st = bookState(b.id), T = LIB.titles[b.t], [x, y, z, ry] = slotPos(st.c, st.k, st.s, T); burst(x + Math.sin(ry) * .1, y + T.h / 2, z + Math.cos(ry) * .1, 6, GOLD, 1.3); }
    FX.flash[key.split('_')[0]] = performance.now();
  }
  for (const ci of S.catDone) if (!FX.cats.has(ci)) {
    const d = DATA[ci]; sfx('cat'); toast(`${d.ic} ${d.n} 분야 완성! 팀 능력 포인트 +1`, 3600);
    for (const C of CASES) if (C.c.cat === ci) { FX.flash[C.c.i] = performance.now() + 900; for (let k = 0; k < 4; k++) { const [x, y, z] = toWorld(C.c, (Math.random() - .5) * 1.6, 2.5, .3); burst(x, y, z, 25, new THREE.Color(PCOL[ci % 8]), 1.8); } }
  }
  FX.rows = new Set(S.doneRows); FX.cats = new Set(S.catDone);
}
// 목표 시간: 원작 결과 등급(책 1권당 걸린 초 × 인원)을 거꾸로 풀어 다음 등급까지 남은 시간
const RANKS = [[9, '엄청난 승자'], [13, '아주 좋은 사람'], [18, '흥미로운 사람'], [26, '졸린 사람'], [40, '완전 엉망진창']];
function hudGoal() {
  const el = $('goal'); if (!el || !LIB) return; if (ST.done) { el.innerHTML = ''; return; }
  const S = rowStatus(), np = Math.max(1, Object.keys(ST.players).length || 1), el_s = (Date.now() - ST_T0) / 1000, perSec = s => s / LIB.books.length * np;
  const next = RANKS.find(([p]) => perSec(el_s) < p), left = next ? next[0] * LIB.books.length / np - el_s : 0;
  const proj = S.good >= 8 ? el_s * LIB.books.length / S.good : 0, pr = proj ? (RANKS.find(([p]) => perSec(proj) < p) || [0, '해고'])[1] : '';
  el.innerHTML = `⏱ ${fmtT(el_s * 1000)} · ` + (next ? `<b>${next[1]}</b>까지 <b class="${left < 120 ? 'hurry' : ''}">${fmtT(left * 1000)}</b>` : '이제 목표는 완주!') + (pr ? ` · 이 속도면 <b>${pr}</b>` : '');
}

// ════════════ HUD (원작 배치: 왼쪽 위 진행 · 손에 든 책 목록 / 왼쪽 아래 마법 / 오른쪽 아래 책 수 / 가운데 아래 조준) ════════════
function fmtT(ms) { const s = Math.max(0, Math.floor(ms / 1000)); return `${String(Math.floor(s / 3600)).padStart(2, '0')}:${String(Math.floor(s / 60) % 60).padStart(2, '0')}:${String(s % 60).padStart(2, '0')}`; }
function hudProg() {
  const S = rowStatus(), left = 2 - S.done % 2;
  $('prog').innerHTML = `<div class="lv">🪶 레벨 업까지 <b>${left}</b>칸</div><div class="cnt"><i class="ic-rows"></i><span><b>${S.done}</b> / ${LIB.titles.length}</span></div><div class="cnt"><i class="ic-book"></i><span><b>${S.good}</b> / ${LIB.books.length}</span></div><div class="goal" id="goal"></div><div class="held" id="held"></div>`;
  hudGoal(); hudHeld();
}
function hudHeld() {
  const el = $('held'); if (!el) return;
  el.innerHTML = P.hand.map((id, i) => { const b = LIB.books[id], T = LIB.titles[b.t], C = LIB.cases[T.caseI]; return `<div class="${i ? '' : 'top'}">▸ ${esc(T.name)} ${b.v}권${OPT.easy || minor('sense') ? ` <small>→ ${C.lab}</small>` : ''}</div>`; }).join('');
}
function hudHand() { const cap = capacity(); $('hand').innerHTML = `<div class="stack"><i></i><i></i><i></i><i></i><i></i></div><div class="n">${P.hand.length} / ${cap}</div>`; hudHeld(); }
function hudAbil() {
  const perm = (ST.permits.jump ? `<div class="ab sm"><span class="ic">${svg('jump', 24)}</span><span class="k">Space</span></div>` : '') + `<div class="ab sm"><span class="ic">${svg('run', 24)}</span><span class="k">Shift</span></div>`;
  $('abil').innerHTML = `<div class="perm">${perm}</div><div class="maj">` + Object.entries(ABIL).map(([k, A]) => `<div class="ab ${A.on > 0 ? 'act' : ''}"><span class="ic">${svg(k, 32)}</span>${A.cdT > 0 ? `<div class="cd">${Math.ceil(A.cdT)}</div>` : ''}<span class="k">${A.k}</span></div>`).join('') + '</div>';
}
function hudOthers() { if (NET.solo) { $('others').innerHTML = ''; return; } $('others').innerHTML = Object.entries(ST.players).map(([k, p]) => `<div><span style="color:${PCOL[(p.col || 0) % 8]}">●</span> ${esc(p.nick)}${k === me.k ? ' (나)' : ''}</div>`).join(''); }
function onKey(e) {
  if (e.code === 'KeyM') { if ($('ovMap').classList.contains('hide')) openMap(); else closeOv(); }
  if (e.code === 'KeyK') { if ($('ovAbil').classList.contains('hide')) openAbil(); else closeOv(); }
  if (e.code === 'Escape' && overlayOpen()) closeOv();
  if (!locked) return;
  if (e.code === 'KeyE') act();
  if (e.code === 'KeyQ' && !e.repeat) { dropT = performance.now(); setTimeout(() => { if (dropT && KEY.KeyQ && performance.now() - dropT >= 440) { drop(true); dropT = 0; } }, 460); }
  if (e.code === 'KeyF') ping();
  if (e.code === 'KeyR' && P.hand.length > 1) { P.hand.push(P.hand.shift()); sendHand(); hudHand(); }
  const n = { Digit1: 'sort', Digit2: 'guide', Digit3: 'glow', Digit4: 'gather', Digit5: 'autoshelve' }[e.code]; if (n) useAbility(n);
}
function closeOv() { ['ovLetter', 'ovMap', 'ovAbil'].forEach(i => $(i).classList.add('hide')); }
const CREST = '<svg viewBox="0 0 60 70" width="60" height="70"><path d="M5 5h50v30c0 18-12 28-25 32C17 63 5 53 5 35z" fill="#5a4aa0" stroke="#c8a050" stroke-width="3"/><path d="M14 40l16-6 16 6v12l-16-6-16 6z" fill="#8a2a1a" stroke="#e8c46a" stroke-width="1.5"/><circle cx="30" cy="20" r="6" fill="none" stroke="#e8c46a" stroke-width="2"/><path d="M30 8v24M18 20h24" stroke="#e8c46a" stroke-width="1.5"/></svg>';
function letter(title, body, btn = '확인') { $('letter').innerHTML = `<div class="crest">${CREST}</div><h2>${title}</h2><div>${body}</div><div class="sign">학장 멀린 올림<br><small>셀레스홀 마법 대학</small></div><div style="text-align:center"><button class="btn" id="lOk">${btn}</button></div>`; $('ovLetter').classList.remove('hide'); document.exitPointerLock(); $('lOk').onclick = () => { closeOv(); canvas.requestPointerLock(); }; }
// ── 지도 (원작: 계단 양쪽 지도 — 층별 평면도 + 책장 번호와 분야 범례) ──
function drawMap(c, W, H, fl) {
  c.width = W; c.height = H; const x = c.getContext('2d');
  const g = x.createRadialGradient(W / 2, H / 2, 40, W / 2, H / 2, W * .7); g.addColorStop(0, '#f0d8a0'); g.addColorStop(1, '#b8904c'); x.fillStyle = g; x.fillRect(0, 0, W, H);
  x.strokeStyle = '#4a2a10'; x.lineWidth = 4; x.strokeRect(10, 10, W - 20, H - 20); x.lineWidth = 1.5; x.strokeRect(18, 18, W - 36, H - 36);
  x.fillStyle = '#3a2008'; x.textAlign = 'center'; x.textBaseline = 'middle'; x.font = `bold ${Math.round(H * .065)}px ${SERIF}`; x.fillText(fl === 1 ? '1층' : '2층', W / 2, H * .1);
  const ox = W * .12, oy = H * .19, sx = W * .76 / 21, sz = H * .44 / 15, X = v => ox + (v + 10.5) * sx, Z = v => oy + (v + 7.5) * sz;
  x.fillStyle = 'rgba(255,248,230,.75)'; x.strokeStyle = '#4a2a10'; x.lineWidth = 2;
  if (fl === 1) { x.fillRect(X(-10.1), Z(-7.1), 20.2 * sx, 14.2 * sz); x.strokeRect(X(-10.1), Z(-7.1), 20.2 * sx, 14.2 * sz); }
  else { x.beginPath(); x.rect(X(-10.1), Z(-7.1), 20.2 * sx, 2.7 * sz); x.rect(X(-10.1), Z(4.4), 20.2 * sx, 2.7 * sz); x.rect(X(7.6), Z(-4.4), 2.5 * sx, 8.8 * sz); x.fill(); x.stroke(); }
  x.strokeStyle = '#6a4a20'; x.lineWidth = 1; for (let i = 0; i <= STAIR.n; i += 2) { const z = -4.4 + i * STAIR.d; x.beginPath(); x.moveTo(X(-9.9), Z(z)); x.lineTo(X(-6.1), Z(z)); x.stroke(); }
  x.font = `bold ${Math.round(sz * .55)}px ${SERIF}`; x.fillStyle = '#4a2a10'; x.fillText('계단', X(-8), Z(0));
  const legend = [];
  if (LIB) for (const C of LIB.cases) { if (C.fl !== fl) continue; const b = caseBox(C, 1); x.fillStyle = '#e8902a'; x.fillRect(X(b[0]), Z(b[2]), (b[3] - b[0]) * sx, (b[5] - b[2]) * sz); x.strokeStyle = '#4a2a10'; x.strokeRect(X(b[0]), Z(b[2]), (b[3] - b[0]) * sx, (b[5] - b[2]) * sz);
    const [lx, , lz] = toWorld(C, 0, 0, 1.1); x.fillStyle = '#3a2008'; x.font = `bold ${Math.round(sz * .6)}px ${SERIF}`; x.fillText(C.lab, X(lx), Z(lz)); legend.push(`${C.lab} : ${C.name}`); }
  if (P && P.y < GAL_Y - 1 === (fl === 1)) { x.fillStyle = '#c82a1a'; x.beginPath(); x.arc(X(P.x), Z(P.z), 6, 0, 6.29); x.fill(); x.strokeStyle = '#c82a1a'; x.lineWidth = 2; x.beginPath(); x.moveTo(X(P.x), Z(P.z)); x.lineTo(X(P.x - Math.sin(P.yaw) * .9), Z(P.z - Math.cos(P.yaw) * .9)); x.stroke(); }
  // 범례
  x.fillStyle = 'rgba(40,22,8,.88)'; x.fillRect(W * .1, H * .68, W * .8, H * .27); x.fillStyle = '#f0dcae'; x.font = `bold ${Math.round(H * .034)}px ${SERIF}`; x.textAlign = 'left';
  legend.forEach((t, i) => x.fillText(t, W * .13 + Math.floor(i / 6) * W * .26, H * .72 + (i % 6) * H * .039));
  if (!legend.length) { x.textAlign = 'center'; x.fillText('이 층에는 쓰는 책장이 없어요', W / 2, H * .8); }
  return c;
}
function openMap() {
  const S = rowStatus(), cats = [...new Set(LIB.cases.map(c => c.cat))];
  drawMap($('mapCv1'), 720, 480, 1); drawMap($('mapCv2'), 720, 480, 2);
  $('mapCats').innerHTML = cats.map(ci => { const o = S.cat[ci] || { n: 1, g: 0 }, d = DATA[ci], ok = o.g === o.n, C = LIB.cases.find(c => c.cat === ci); return `<div class="cc ${ok ? 'ok' : ''}" title="${d.n} ${o.g}/${o.n}"><span>${d.ic}</span><em>${C.lab}</em><i><u style="width:${o.g / o.n * 100}%"></u></i><small>${ok ? '✔' : o.n - o.g}</small></div>`; }).join('');
  $('ovMap').classList.remove('hide'); document.exitPointerLock();
}
// ── 학장 평가 (원작 결과 등급: 엄청난 승자 · 아주 좋은 사람 · 흥미로운 사람 · 졸린 사람 · 완전 엉망진창 · 해고!) ──
function showEnd() {
  const ms = ST.done.t - ST_T0, per = ms / 1000 / LIB.books.length * Math.max(1, Object.keys(ST.players).length || 1);
  const rank = per < 9 ? '엄청난 승자!' : per < 13 ? '아주 좋은 사람!' : per < 18 ? '흥미로운 사람!' : per < 26 ? '졸린 사람!' : per < 40 ? '완전 엉망진창!' : '해고!';
  const best = +(localStorage.getItem('lb_best_' + LIB.size) || 0), nb = !best || ms < best; if (nb) localStorage.setItem('lb_best_' + LIB.size, ms);
  letter('사서에게,', `들어 보십시오. 요정이 어지럽힌 우리 도서관이 다시 반짝입니다. 책 <b>${LIB.books.length}</b>권이 모두 제자리를 찾았지요.<br><br>클리어 시간 <b>${fmtT(ms)}</b>${nb ? ' <b style="color:#8a2a1a">신기록!</b>' : ` (최고 기록 ${fmtT(best)})`}<br>정리한 책장 칸 ${rowStatus().done}개${NET.solo ? '' : ` · 함께한 사서 ${Object.keys(ST.players).length}명`}<div class="rank">당신은 ${rank}</div>${statTable()}`, '처음으로');
  $('lOk').onclick = () => { if (!NET.solo) NET.ref('players/' + me.k).remove(); location.href = location.pathname; };
}

// ════════════ 시작 · 루프 ════════════
let ST_T0 = 0;
async function startGame(o) {
  try { await Promise.race([document.fonts.load('bold 13px "Nanum Myeongjo"'), new Promise(r => setTimeout(r, 2500))]); } catch (e) {}
  LIB = buildLibrary(o.size, o.seed); ST_T0 = o.t0; OPT.easy = !!o.easy; FAIRY.next = 55 + Math.random() * 20;
  $('home').classList.add('hide'); $('lobby').classList.add('hide'); $('hud').classList.remove('hide');
  buildRoom(); buildCases(); buildBooks(); buildProps(); buildSparks();
  P.x = -4.5; P.z = 0; P.yaw = -Math.PI / 2;
  if (!NET.solo) { NET.ref('pos/' + me.k).onDisconnect().remove(); NET.ref('players/' + me.k).onDisconnect().remove(); NET.on(r => { if (!r.players || !r.players[me.k]) { toast('방에서 나왔어요'); return; } isHost = r.host === me.k || !r.players[r.host]; if (isHost && r.host !== me.k) NET.set('host', me.k); onRoom(r); hudOthers(); }); }
  else NET.on(onRoom);
  hudProg(); hudHand(); hudAbil(); hudOthers();
  letter('사서에게,', `잘 들으십시오. 아주 중요한 이야기입니다. 그 고약한 요정이 저지른 짓은 <b>대참사</b>입니다. 아름다운 우리 도서관이 전에 없던 난장판이 되어 버렸어요.<br><br>그러니 사서인 당신에게 결정을 내립니다. 책이 한 권도 빠짐없이 제자리로 돌아갈 때까지 이 도서관 문은 열리지 않습니다. 봉인입니다!<br><br>책마다 <b>분야에 맞는 책장</b>으로 가져가세요. 책장의 칸은 폭이 저마다 다릅니다 — <b>그 제목의 권수에 꼭 맞는 칸</b>을 골라 <b>1권부터 순서대로 왼쪽에서 오른쪽으로</b> 꽂으세요. 올바르면 노랗게, 책장은 맞지만 칸이나 순서가 틀리면 희미하게 붉게 빛납니다.<br><br>책장 위치는 계단 앞 지도(M)에서 확인하세요. ${OPT.easy ? '책을 조준하면 갈 책장과 칸이 보입니다.' : '책등 위쪽에 분야 이름이 적혀 있습니다.'} 한 번에 <b>10권</b>까지 들 수 있습니다.<br><br>완벽하게, 100% 끝내면 보상이 있습니다. 피자입니다. 인생 최고의 피자! 자, 일하러 가세요.`, '정리 시작!');
}
const clock = new THREE.Clock();
function loop() {
  const dt = Math.min(.05, clock.getDelta());
  if (LIB) {
    if (locked) moveP(dt); else cam.rotation.set(P.pitch, P.yaw, 0, 'YXZ'), cam.position.set(P.x, P.y + EYE, P.z);
    tickAbil(dt);
    for (const k in OTHERS) { const O = OTHERS[k]; if (O.tx == null) continue; O.mesh.position.x += (O.tx - O.mesh.position.x) * Math.min(1, dt * 10); O.mesh.position.y += (O.ty - O.mesh.position.y) * Math.min(1, dt * 10); O.mesh.position.z += (O.tz - O.mesh.position.z) * Math.min(1, dt * 10); O.mesh.rotation.y = O.tyaw; if ((O.hand || []).length) booksDirty = true; }
    if (booksDirty) updateBooks();
    updateHeld();
    updateFairy(dt); drawPings(); tickSparks(dt);
    aimUpdate(); sendPos(dt);
    const t = performance.now() / 1000;
    for (const k of KEYMESH) k.rotation.y = t * 2;
    if (STONE.mesh.visible) STONE.mesh.rotation.y = t;
    if (ARMILLA.g) { ARMILLA.g.children.forEach((c, i) => { if (i < 3) c.rotation.y += dt * (.2 + i * .1); }); }
    if (Math.floor(t * 4) !== loop._a) { loop._a = Math.floor(t * 4); hudAbil(); hudGoal(); }
    if (COMBO.n >= 2 || COMBO.boost > 0) hudCombo();
  }
  renderer.render(scene, cam);
  requestAnimationFrame(loop);
}
requestAnimationFrame(loop);
window.lib = { FAIRY, spawnFairy: () => { FAIRY.next = 0; }, ping, giveBook, catchFairy, OPT, get LIB() { return LIB; }, get ST() { return ST; }, P, rowStatus: () => { STATUS = null; return rowStatus(); }, NET: () => NET, pickBook, placeBook, drop, useAbility, act, COMBO, FX, burst, autoShelve, get AIM() { return AIM; }, renderer };
