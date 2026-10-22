// ════════════ 사서의 밤 — 멀티 비전 도서관 정리 (규칙: Librarian: Tidy Up the Arcane Library! 안내문 기준) ════════════
// 책을 카테고리 책장에 꽂는다 · 같은 제목은 한 단에, 권 번호 순서대로 왼쪽→오른쪽 · 맞으면 노란 빛, 책장은 맞지만 순서·단이 틀리면 희미한 붉은 빛
// 완성한 줄 수로 능력 포인트 · 열쇠로 보물상자 열기(능력 해금·물약) · 책 20권 남으면 회수석 · 달리기/높이뛰기 허가 · 학장 평가
import * as THREE from 'three';
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
function sfx(k) {
  const vol = window.Sound ? Sound.sfxVolume : .6; if (!(vol > 0)) return;
  try { AC = AC || new AudioContext(); if (AC.state === 'suspended') AC.resume(); } catch (e) { return; }
  const t = AC.currentTime, tone = (f0, f1, d, type, v, dl = 0) => { const o = AC.createOscillator(), g = AC.createGain(); o.type = type; o.frequency.setValueAtTime(f0, t + dl); o.frequency.exponentialRampToValueAtTime(f1, t + dl + d); g.gain.setValueAtTime(v * vol, t + dl); g.gain.exponentialRampToValueAtTime(.0001, t + dl + d); o.connect(g); g.connect(AC.destination); o.start(t + dl); o.stop(t + dl + d + .02); };
  if (k === 'pick') tone(500, 700, .06, 'triangle', .12);
  else if (k === 'place') tone(300, 220, .08, 'triangle', .16);
  else if (k === 'good') { tone(880, 880, .12, 'sine', .1); tone(1320, 1320, .16, 'sine', .08, .07); }
  else if (k === 'row') [660, 880, 1100, 1320].forEach((f, i) => tone(f, f, .2, 'triangle', .12, i * .08));
  else if (k === 'no') tone(200, 150, .12, 'square', .06);
  else if (k === 'magic') tone(400, 1600, .35, 'sine', .1);
  else if (k === 'drop') tone(180, 120, .1, 'triangle', .14);
  else if (k === 'chest') [523, 659, 784, 1047, 1319].forEach((f, i) => tone(f, f, .25, 'triangle', .12, i * .09));
}

// ════════════ 도서관 배치 (방 크기별 책장 수, 같은 시드면 모든 사람이 같은 도서관) ════════════
// 장정 색 [천/가죽, 글자색]: 옥스블러드 · 남색 · 숲녹색 · 갈색 · 흑단 · 버건디 · 청록 · 황토 · 회청 · 자두 · 올리브 · 크림
const BINDING = [['#6e1f1f', '#e8c46a'], ['#1f2c4e', '#e8c46a'], ['#24452e', '#e8c46a'], ['#5a3a22', '#f0d080'], ['#1e1a18', '#d8b45a'], ['#5a1a2e', '#f0d080'], ['#1e4a4e', '#e8c46a'], ['#9a6a2a', '#2a1a0c'], ['#3e4a5a', '#e8d8a0'], ['#4a2440', '#e8c46a'], ['#4e4e22', '#f0d080'], ['#d8c8a0', '#5a2a1a'], ['#7a2a1a', '#f0d890'], ['#2a3a2a', '#d8c070'], ['#2a5a8a', '#f0d890'], ['#6a5a8a', '#f0e0a0']];
const BOOK = { w: .11, h: .30, d: .21 }, CASE = { w: 2.0, h: 2.45, d: .42, rows: 5, slots: 14, rowH: .44, row0: .18 };
const SLOT_W = 1.82 / CASE.slots, GAL_Y = 3.2;
// 책장 자리: [x, y(바닥), z, 바라보는 방향 +1/-1(z축)] — 1층 북쪽 벽 4 · 남쪽 벽 4 · 2층 북쪽 4 · 남쪽 4
const CASE_SPOTS = [[-5, 0, -6.75, 1], [-1.6, 0, -6.75, 1], [1.8, 0, -6.75, 1], [5.2, 0, -6.75, 1], [-5, 0, 6.75, -1], [-1.6, 0, 6.75, -1], [1.8, 0, 6.75, -1], [5.2, 0, 6.75, -1],
  [-5, GAL_Y, -6.75, 1], [-1.6, GAL_Y, -6.75, 1], [1.8, GAL_Y, -6.75, 1], [5.2, GAL_Y, -6.75, 1], [-5, GAL_Y, 6.75, -1], [-1.6, GAL_Y, 6.75, -1], [1.8, GAL_Y, 6.75, -1], [5.2, GAL_Y, 6.75, -1]];
function buildLibrary(size, seed) {
  const R = rng(seed), cats = DATA.map((c, i) => i); for (let i = cats.length - 1; i > 0; i--) { const j = Math.floor(R() * (i + 1)); [cats[i], cats[j]] = [cats[j], cats[i]]; }
  const use = cats.slice(0, size), cases = [], books = [], titles = [];
  use.forEach((ci, k) => {
    const [x, y, z, f] = CASE_SPOTS[k], lab = (y > 0 ? '2' : '1') + 'ABCDEFGH'[k % 8];
    cases.push({ i: k, cat: ci, x, y, z, f, lab, name: DATA[ci].n, col: BINDING[ci % BINDING.length][0], gold: BINDING[ci % BINDING.length][1] });
    const nT = size <= 4 ? 6 : size <= 8 ? 6 : 5;   // 카테고리마다 제목 수 (책장 한 칸에 넉넉히)
    const pick = DATA[ci].t.slice(); for (let i = pick.length - 1; i > 0; i--) { const j = Math.floor(R() * (i + 1)); [pick[i], pick[j]] = [pick[j], pick[i]]; }
    for (const name of pick.slice(0, nT)) {
      const r = R(), vols = r < .3 ? 1 : r < .6 ? 2 : r < .85 ? 3 : 4, ti = titles.length, bc = BINDING[Math.floor(R() * BINDING.length)];
      titles.push({ i: ti, name, cat: ci, caseI: k, vols, col: new THREE.Color(bc[0]), gold: bc[1], h: .25 + R() * .09, d: .17 + R() * .06, w: .07 + R() * .05, style: Math.floor(R() * 3) });
      for (let v = 1; v <= vols; v++) books.push({ id: books.length, t: ti, v });
    }
  });
  // 처음 놓인 자리: 바닥 더미(1층 가운데·통로·계단·2층 회랑) + 탁자 위 — 요정이 흩뜨려 놓은 모습
  const piles = [], free = [];
  const spots = [[-3, 0, 0], [0, 0, -2], [3, 0, 1.5], [-6, 0, 2.5], [6, 0, -2.5], [0, 0, 3.5], [-2, 0, -4], [2.5, 0, 4.5], [-7, 0, -1], [7, 0, 2], [-4, .82, -1.2], [4, .82, 1.2], [0, .82, 0]];
  if (size > 8) spots.push([-4, GAL_Y, -5.6], [0, GAL_Y, -5.7], [4, GAL_Y, -5.6], [-4, GAL_Y, 5.6], [0, GAL_Y, 5.7], [4, GAL_Y, 5.6], [-8.85, 1.8, -1.0], [8.85, 1.0, 1.0]);
  else spots.push([-8.85, .6, 1.8], [8.85, .6, -1.8]);
  const order = books.map(b => b.id); for (let i = order.length - 1; i > 0; i--) { const j = Math.floor(R() * (i + 1)); [order[i], order[j]] = [order[j], order[i]]; }
  let k = 0;
  for (const id of order) {   // 더미마다 몇 무더기로 나눠 쌓음
    const si = k % spots.length, s = spots[si], sub = Math.floor(k / spots.length) % 3, key = si + '_' + sub; k++;
    const tw = titles[books[id].t].w, h = piles[key] = piles[key] || 0; piles[key] += tw; const ox = s[0] + [0, .45, -.4][sub] + (R() - .5) * .1, oz = s[2] + [0, .3, .35][sub] + (R() - .5) * .1;
    free.push([ox, s[1] + h, oz, R() * Math.PI * 2]);
    books[id].start = free[free.length - 1];
  }
  // 열쇠 4개 · 보물상자 4개 (원작: 노란 다이아·초록 클로버·빨간 팔각·파란 별)
  const KEYS = [{ n: '황금 다이아몬드 열쇠', ic: '🔶', c: '#ffd34a' }, { n: '에메랄드 클로버 열쇠', ic: '🍀', c: '#4ad46a' }, { n: '진홍색 팔각 열쇠', ic: '🛑', c: '#e84a3a' }, { n: '푸른 별 열쇠', ic: '⭐', c: '#4a8aff' }];
  const keySpots = size > 8 ? [[-9.2, GAL_Y + .1, -6.2], [9.2, GAL_Y + .1, 6.2], [0, .82, 0.5], [-8.5, 0, 6]] : [[-9.2, 0, -6.2], [9.2, 0, 6.2], [0, .82, .5], [-8.5, 0, 6]];
  const chestSpots = [[-9.3, 0, 0], [9.3, 0, 0], [-3.5, 0, 6.2], [3.5, 0, -6.2]];
  const rewards = ['autoshelve', 'gather', 'potion3', 'glow'];
  const keys = KEYS.map((k, i) => Object.assign({ i, pos: keySpots[i] }, k)), chests = KEYS.map((k, i) => ({ i, pos: chestSpots[i], key: i, reward: rewards[i], c: k.c, ic: k.ic }));
  return { cases, books, titles, keys, chests, size, seed };
}

// ════════════ 상태 · 네트워크 (Firebase games/lb_코드, 혼자 하기는 같은 모양의 메모리 저장소) ════════════
let LIB = null, me = null, NET = null;
const ST = { bk: {}, slot: {}, keys: {}, chests: {}, lv: {}, spent: 0, stone: 0, done: null, players: {}, pos: {}, t0: 0, permits: {}, potion: 0 };
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
let size = 8, room = null, code = null, isHost = false;
$('nick').value = localStorage.getItem('lb_nick') || '';
$('sizeSeg').onclick = e => { const b = e.target.closest('button'); if (!b) return; size = +b.dataset.v; [...$('sizeSeg').children].forEach(x => x.classList.toggle('on', x === b)); };
const getNick = () => { let n = $('nick').value.trim(); if (n.length < 2) n = '사서' + Math.floor(Math.random() * 900 + 100); localStorage.setItem('lb_nick', n); return n; };
$('btnSolo').onclick = () => { const n = getNick(); me = { k: 'me', nick: n, col: PCOL[0] }; NET = localNet(); isHost = true; startGame({ seed: (Math.random() * 1e9) | 0, size, t0: Date.now() }); };
$('btnCreate').onclick = async () => {
  if (!db) return toast('온라인 연결이 안 돼요 — 혼자 하기로 해 보세요');
  const n = getNick(); code = genCode(); me = { k: keyOf(n), nick: n }; isHost = true; NET = fbNet(code);
  await NET.ref('').set({ host: me.k, created: Date.now(), expiresAt: Date.now() + 6 * 3600e3, phase: 'lobby', size, players: { [me.k]: { nick: n, col: 0, ready: true, at: Date.now() } } });
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
    if (r.phase === 'play' && !LIB) { NET.off(); startGame({ seed: r.seed, size: r.size, t0: r.t0 }); return; }
    if (!LIB) renderLobby(r); else onRoom(r); });
}
function renderLobby(r) {
  const ps = Object.entries(r.players).sort((a, b) => a[1].at - b[1].at);
  $('lbPlayers').innerHTML = ps.map(([k, p]) => `<div class="pl ${p.ready ? 'rdy' : ''}"><i style="background:${PCOL[p.col % 8]}"></i>${esc(p.nick)}${k === r.host ? ' 👑' : ''}<small>${p.ready ? '준비 완료' : '대기 중'}</small></div>`).join('');
  [...$('lbSize').children].forEach(b => { b.classList.toggle('on', +b.dataset.v === r.size); b.disabled = !isHost; });
  $('lbSizeTxt').textContent = isHost ? '(방장이 고를 수 있어요)' : '';
  const allReady = ps.every(([k, p]) => p.ready || k === r.host);
  $('lbStart').classList.toggle('hide', !isHost); $('lbStart').disabled = !allReady; $('lbReady').classList.toggle('hide', isHost);
  $('lbReady').textContent = r.players[me.k].ready ? '준비 취소' : '준비';
}
$('lbSize').onclick = e => { const b = e.target.closest('button'); if (b && isHost) NET.set('size', +b.dataset.v); };
$('lbReady').onclick = () => NET.set('players/' + me.k + '/ready', !room.players[me.k].ready);
$('lbStart').onclick = () => { if (!isHost) return; NET.update('', { phase: 'play', seed: (Math.random() * 1e9) | 0, t0: Date.now(), bk: null, slot: null, keys: null, chests: null, lv: null, spent: 0, stone: 0, done: null, permits: null, pos: null }); };
$('lbLeave').onclick = () => { NET.ref('players/' + me.k).remove().then(() => location.href = location.pathname); };
$('lbCode').onclick = () => { const u = location.origin + location.pathname + '?room=' + code; navigator.clipboard && navigator.clipboard.writeText(u).then(() => toast('초대 링크를 복사했어요')); };

// ════════════ 3D 장면 ════════════
const canvas = $('view'), renderer = new THREE.WebGLRenderer({ canvas, antialias: true });
renderer.setPixelRatio(Math.min(2, devicePixelRatio)); renderer.outputColorSpace = THREE.SRGBColorSpace; renderer.shadowMap.enabled = false;
const scene = new THREE.Scene(); scene.background = new THREE.Color('#120c08'); scene.fog = new THREE.Fog('#120c08', 14, 34);
const cam = new THREE.PerspectiveCamera(70, 1, .05, 80); scene.add(cam);
function resize() { renderer.setSize(innerWidth, innerHeight, false); cam.aspect = innerWidth / innerHeight; cam.updateProjectionMatrix(); }
addEventListener('resize', resize); resize();
const solids = [];   // 충돌 상자 [x0,y0,z0,x1,y1,z1]
const box = (x0, y0, z0, x1, y1, z1, mat, solid = true) => { const g = new THREE.BoxGeometry(x1 - x0, y1 - y0, z1 - z0), m = new THREE.Mesh(g, mat); m.position.set((x0 + x1) / 2, (y0 + y1) / 2, (z0 + z1) / 2); scene.add(m); if (solid) solids.push([x0, y0, z0, x1, y1, z1]); return m; };
function tex(w, h, draw) { const c = document.createElement('canvas'); c.width = w; c.height = h; draw(c.getContext('2d'), w, h); const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; return t; }
const woodTex = tex(512, 512, (x, w, h) => { const r = rng(5); x.fillStyle = '#5e3c20'; x.fillRect(0, 0, w, h);
  for (let y = 0; y < h; y++) { const v = Math.sin(y * .09 + Math.sin(y * .013) * 4) * .5 + .5; x.fillStyle = `rgba(${40 + v * 30},${20 + v * 14},6,${.18 + v * .2})`; x.fillRect(0, y, w, 1); }
  for (let i = 0; i < 260; i++) { x.fillStyle = `rgba(20,10,4,${.08 + r() * .14})`; x.fillRect(r() * w, r() * h, 30 + r() * 140, 1); }
  for (let i = 0; i < 6; i++) { const kx = r() * w, ky = r() * h; for (let k = 6; k > 0; k--) { x.strokeStyle = `rgba(30,14,4,${.12})`; x.beginPath(); x.ellipse(kx, ky, k * 5, k * 1.6, 0, 0, 6.29); x.stroke(); } } });
const floorTex = tex(512, 512, (x, w, h) => { const r = rng(9); for (let row = 0; row < 8; row++) { let cx = -r() * 200; while (cx < w) { const len = 140 + r() * 160, l = 20 + r() * 9; x.fillStyle = `hsl(26,38%,${l}%)`; x.fillRect(cx, row * 64, len - 2, 62); for (let g = 0; g < 14; g++) { x.fillStyle = `rgba(20,10,4,${.1 + r() * .12})`; x.fillRect(cx + r() * len, row * 64 + 4 + r() * 54, 20 + r() * 80, 1); } cx += len; } x.fillStyle = 'rgba(0,0,0,.45)'; x.fillRect(0, row * 64 + 62, w, 2); } }); floorTex.wrapS = floorTex.wrapT = THREE.RepeatWrapping; floorTex.repeat.set(8, 6);
const stoneTex = tex(256, 256, (x, w, h) => { x.fillStyle = '#4a4440'; x.fillRect(0, 0, w, h); for (let r = 0; r < 8; r++) for (let c = 0; c < 4; c++) { x.fillStyle = `hsl(25,8%,${24 + Math.random() * 8}%)`; x.fillRect(c * 64 + (r % 2) * 32 + 1, r * 32 + 1, 62, 30); } }); stoneTex.wrapS = stoneTex.wrapT = THREE.RepeatWrapping; stoneTex.repeat.set(6, 2);
const M = { wood: new THREE.MeshStandardMaterial({ map: woodTex, roughness: .8 }), dark: new THREE.MeshStandardMaterial({ color: '#3a2412', roughness: .9 }), floor: new THREE.MeshStandardMaterial({ map: floorTex, roughness: .85 }), stone: new THREE.MeshStandardMaterial({ map: stoneTex, roughness: .95 }), rug: new THREE.MeshStandardMaterial({ color: '#6a1e22', roughness: 1 }), gold: new THREE.MeshStandardMaterial({ color: '#c89a3a', metalness: .6, roughness: .4 }), back: new THREE.MeshStandardMaterial({ color: '#1e120a', roughness: 1 }) };
function buildRoom() {
  // 바닥 · 벽 · 천장 (20 × 14 m, 2층 회랑)
  box(-10.5, -.2, -7.5, 10.5, 0, 7.5, M.floor);
  const fl = scene.children[scene.children.length - 1]; void fl;
  box(-3, .001, -2.4, 3, .01, 2.4, M.rug, false);
  box(-10.5, 0, -7.6, 10.5, 8, -7.1, M.stone); box(-10.5, 0, 7.1, 10.5, 8, 7.6, M.stone); box(-10.6, 0, -7.5, -10.1, 8, 7.5, M.stone); box(10.1, 0, -7.5, 10.6, 8, 7.5, M.stone);
  box(-10.5, 8, -7.5, 10.5, 8.3, 7.5, M.dark, false);
  // 2층 회랑 (북·남) + 난간 (계단 자리는 비움)
  box(-10.1, GAL_Y - .2, -7.1, 10.1, GAL_Y, -4.5, M.wood); box(-10.1, GAL_Y - .2, 4.5, 10.1, GAL_Y, 7.1, M.wood);
  box(-7.7, GAL_Y, -4.6, 10.1, GAL_Y + 1, -4.45, M.dark); box(-10.1, GAL_Y, 4.45, 7.7, GAL_Y + 1, 4.6, M.dark);
  for (const x of [-6.9, -3.3, .1, 3.5, 6.9]) { box(x - .08, 0, -4.58, x + .08, GAL_Y - .2, -4.42, M.dark); box(x - .08, 0, 4.42, x + .08, GAL_Y - .2, 4.58, M.dark); }
  // 계단: 서쪽 → 북쪽 회랑, 동쪽 → 남쪽 회랑 (16단, 단 높이 0.2)
  for (let i = 0; i < 16; i++) { const y = (i + 1) * .2, z0 = 3.0 - i * .47; box(-9.9, 0, z0 - .47, -7.8, y, z0, M.wood); box(7.8, 0, -z0, 9.9, y, -z0 + .47, M.wood); }
  // 탁자 3개 (가운데)
  for (const [x, z] of [[-4, -1.2], [4, 1.2], [0, 0]]) { box(x - .9, .74, z - .5, x + .9, .82, z + .5, M.wood); for (const [a, b] of [[-.8, -.4], [.8, -.4], [-.8, .4], [.8, .4]]) box(x + a - .05, 0, z + b - .05, x + a + .05, .74, z + b + .05, M.dark, false); solids.push([x - .9, 0, z - .5, x + .9, .74, z + .5]); }
  // 조명: 따뜻한 반구광 + 샹들리에 점광원 + 떠다니는 촛불
  scene.add(new THREE.HemisphereLight('#ffe6c0', '#3a2414', .9));
  const d = new THREE.DirectionalLight('#ffd8a0', .5); d.position.set(3, 10, 4); scene.add(d);
  for (const [x, y, z] of [[-5, 6, 0], [5, 6, 0], [0, 6.5, 0], [0, 5.6, -5.8], [0, 5.6, 5.8]]) { const p = new THREE.PointLight('#ffb860', 14, 16, 1.6); p.position.set(x, y, z); scene.add(p); const b = new THREE.Mesh(new THREE.SphereGeometry(.18, 12, 8), new THREE.MeshBasicMaterial({ color: '#ffe0a0' })); b.position.copy(p.position); scene.add(b); }
  const cg = new THREE.CylinderGeometry(.03, .03, .16, 6), cm = new THREE.MeshBasicMaterial({ color: '#fff4d8' }), fm = new THREE.MeshBasicMaterial({ color: '#ffb84a' });
  CANDLES.length = 0; const R = rng(77);
  for (let i = 0; i < 40; i++) { const g = new THREE.Group(), c = new THREE.Mesh(cg, cm), f = new THREE.Mesh(new THREE.SphereGeometry(.025, 6, 4), fm); f.position.y = .1; g.add(c, f); g.position.set((R() - .5) * 18, 4.4 + R() * 3, (R() - .5) * 8); g.userData.p = R() * 6; scene.add(g); CANDLES.push(g); }
}
const CANDLES = [];
// 책장 · 라벨 · 지도판
const CASES = [];
function label(text, sub, col, ic, gold) { return tex(512, 160, (x, w, h) => { x.fillStyle = '#2a1a0c'; x.fillRect(0, 0, w, h); x.strokeStyle = '#c89a3a'; x.lineWidth = 8; x.strokeRect(6, 6, w - 12, h - 12); x.fillStyle = col; x.fillRect(16, 16, 128, h - 32); emblem(x, ic, 80, 80, 40, gold); x.textAlign = 'left'; x.textBaseline = 'middle'; x.fillStyle = '#f6e6c0'; x.font = '62px Jua, sans-serif'; x.fillText(text, 164, 54); x.font = '44px Jua, sans-serif'; x.fillStyle = '#ffe2a0'; x.fillText(sub, 164, 114); }); }
function buildCases() {
  for (const c of LIB.cases) {
    const g = new THREE.Group(); g.position.set(c.x, c.y, c.z); if (c.f < 0) g.rotation.y = Math.PI; scene.add(g);
    const add = (w, h, d, x, y, z, m = M.wood) => { const s = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), m); s.position.set(x, y, z); g.add(s); return s; };
    add(CASE.w, CASE.h, .04, 0, CASE.h / 2, -CASE.d / 2 + .02, M.back); add(.08, CASE.h, CASE.d, -CASE.w / 2 + .04, CASE.h / 2, 0); add(.08, CASE.h, CASE.d, CASE.w / 2 - .04, CASE.h / 2, 0); const trim = new THREE.MeshStandardMaterial({ color: c.col, roughness: .6 }); add(.1, CASE.h, .03, -CASE.w / 2 + .04, CASE.h / 2, CASE.d / 2 + .005, trim); add(.1, CASE.h, .03, CASE.w / 2 - .04, CASE.h / 2, CASE.d / 2 + .005, trim); add(CASE.w, .1, CASE.d + .04, 0, CASE.h + .05, 0);
    for (let r = 0; r <= CASE.rows; r++) add(CASE.w - .1, .04, CASE.d, 0, CASE.row0 + r * CASE.rowH - .02, 0);
    const pl = new THREE.Mesh(new THREE.PlaneGeometry(1.1, .34), new THREE.MeshBasicMaterial({ map: label(c.lab, c.name, c.col, c.cat, c.gold) })); pl.scale.setScalar(1.25); pl.position.set(0, CASE.h + .36, CASE.d / 2 - .05); g.add(pl);
    const hl = new THREE.Mesh(new THREE.BoxGeometry(CASE.w + .12, CASE.h + .12, CASE.d + .12), new THREE.MeshBasicMaterial({ color: '#ffd36b', transparent: true, opacity: .0, depthWrite: false })); hl.position.y = CASE.h / 2; g.add(hl);
    // 단마다 보이지 않는 앞면 판 (조준 판정용)
    const rows = []; for (let r = 0; r < CASE.rows; r++) { const p = new THREE.Mesh(new THREE.PlaneGeometry(1.82, CASE.rowH - .04), new THREE.MeshBasicMaterial({ visible: false })); p.position.set(0, CASE.row0 + r * CASE.rowH + (CASE.rowH - .04) / 2, CASE.d / 2 - .02); p.userData = { kind: 'row', c: c.i, r }; g.add(p); rows.push(p); }
    const half = c.f > 0 ? [c.x - CASE.w / 2, c.y, c.z - CASE.d / 2, c.x + CASE.w / 2, c.y + CASE.h, c.z + CASE.d / 2] : [c.x - CASE.w / 2, c.y, c.z - CASE.d / 2, c.x + CASE.w / 2, c.y + CASE.h, c.z + CASE.d / 2];
    solids.push(half); CASES.push({ c, g, rows, hl });
  }
  // 계단 옆 지도판 (원작: 계단 양쪽 지도)
  for (const [x, z, ry] of [[-7.3, 3.4, Math.PI / 2], [7.3, -3.4, -Math.PI / 2]]) { const m = new THREE.Mesh(new THREE.PlaneGeometry(1.6, 1.1), new THREE.MeshBasicMaterial({ map: new THREE.CanvasTexture(drawMap(document.createElement('canvas'), 480, 330)) })); m.position.set(x, 1.5, z); m.rotation.y = ry; m.userData = { kind: 'map' }; scene.add(m); PICKABLE.push(m); box(x - .1, 0, z - .1, x + .1, .95, z + .1, M.dark); }
}
const PICKABLE = [];
// ── 책: 한 권마다 메시, 표지·책등 그림은 아틀라스 텍스처에 (제목 · 권 번호 · 카테고리 그림) ──
const BOOKS3D = []; let glowMesh = null;
const ATL = { S: 2048, cw: 160, ch: 176, sp: 48 }; ATL.cols = Math.floor(ATL.S / ATL.cw); ATL.rows = Math.floor(ATL.S / ATL.ch); ATL.per = ATL.cols * ATL.rows - 1;
function shadeC(hex, f) { const c = new THREE.Color(hex); c.offsetHSL(0, 0, f); return '#' + c.getHexString(); }
const SERIF = '"Nanum Myeongjo", "Batang", serif';
function emblem(x, k, cx, cy, r, col) {   // 카테고리 금박 문양 16종
  x.save(); x.translate(cx, cy); x.strokeStyle = col; x.fillStyle = col; x.lineWidth = Math.max(1.2, r * .12); x.lineCap = 'round'; x.lineJoin = 'round';
  const P = (pts, fill) => { x.beginPath(); pts.forEach(([a, b], i) => i ? x.lineTo(a * r, b * r) : x.moveTo(a * r, b * r)); x.closePath(); fill ? x.fill() : x.stroke(); };
  const C = (rr, fill, ox = 0, oy = 0) => { x.beginPath(); x.arc(ox * r, oy * r, rr * r, 0, 6.29); fill ? x.fill() : x.stroke(); };
  switch (k % 16) {
    case 0: P([[0, -1], [.7, -.2], [.4, .9], [-.4, .9], [-.7, -.2]]); C(.25, 1, 0, .1); break;                       // 비늘 방패 (마물)
    case 1: { for (let i = 0; i < 5; i++) { const a = -Math.PI / 2 + i * 2.513, b = a + 1.257; x.lineTo(Math.cos(a) * r, Math.sin(a) * r); x.lineTo(Math.cos(b) * r * .42, Math.sin(b) * r * .42); } x.closePath(); x.fill(); break; }   // 별 (점성)
    case 2: C(.8); P([[-.55, -.55], [.55, .55]]); P([[.55, -.55], [-.55, .55]]); break;                              // 봉인 (저주)
    case 3: x.beginPath(); x.moveTo(-.2 * r, .8 * r); x.lineTo(-.2 * r, -.8 * r); x.lineTo(.5 * r, -.5 * r); x.stroke(); C(.28, 1, -.45, .8); break;   // 음표 (음악)
    case 4: x.beginPath(); x.arc(0, 0, .85 * r, .6, 5.7); x.stroke(); C(.3, 1, .3, 0); break;                          // 달 (변신)
    case 5: C(.35, 0, 0, -.45); P([[0, -.1], [0, .9]]); P([[0, .55], [.3, .55]]); P([[0, .8], [.25, .8]]); break;  // 열쇠 (마도구)
    case 6: x.beginPath(); for (let t = 0; t < 12; t += .2) { const rr = t / 12 * .9 * r; x.lineTo(Math.cos(t) * rr, Math.sin(t) * rr); } x.stroke(); break;   // 소용돌이 (환영)
    case 7: C(.85); P([[0, -.85], [.74, .43], [-.74, .43]]); break;                                                    // 소환진
    case 8: P([[-.25, -.85], [.25, -.85], [.25, -.25], [.85, -.25], [.85, .25], [.25, .25], [.25, .85], [-.25, .85], [-.25, .25], [-.85, .25], [-.85, -.25], [-.25, -.25]], 1); break;   // 십자 (치유)
    case 9: x.beginPath(); x.moveTo(0, -.95 * r); x.quadraticCurveTo(.8 * r, 0, .3 * r, .9 * r); x.quadraticCurveTo(0, .4 * r, -.3 * r, .9 * r); x.quadraticCurveTo(-.8 * r, 0, 0, -.95 * r); x.fill(); break;   // 불꽃 (원소)
    case 10: P([[-.35, -.9], [.35, -.9], [.2, -.3], [.75, .85], [-.75, .85], [-.2, -.3]]); break;                      // 플라스크 (연금)
    case 11: P([[-.9, .7], [.6, -.8]]); P([[.3, -.3], [.9, .1], [.6, .5], [.1, -.05]]); break;                         // 빗자루
    case 12: x.beginPath(); x.arc(0, .1 * r, .75 * r, 0, Math.PI); x.closePath(); x.stroke(); P([[-.3, -.2], [-.2, -.8]]); P([[.2, -.2], [.3, -.8]]); break;   // 그릇 (요리)
    case 13: for (let i = 0; i < 6; i++) { x.save(); x.rotate(i * 1.047); x.beginPath(); x.ellipse(0, -.5 * r, .2 * r, .42 * r, 0, 0, 6.29); x.stroke(); x.restore(); } C(.18, 1); break;   // 꽃 (정원)
    case 14: x.strokeRect(-.6 * r, -.85 * r, 1.2 * r, 1.7 * r); P([[-.35, -.45], [.35, -.45]]); P([[-.35, -.1], [.35, -.1]]); P([[-.35, .25], [.2, .25]]); break;   // 두루마리 (역사)
    case 15: C(.85); P([[0, -.85], [0, .85]]); P([[-.85, 0], [.85, 0]]); P([[0, -.55], [.25, 0], [0, .55], [-.25, 0]], 1); break;   // 나침반 (모험)
  }
  x.restore();
}
function cloth(x, ox, oy, w, h, col, seed) {   // 천·가죽 질감: 바탕 + 잔무늬 + 모서리 닳음
  x.fillStyle = col; x.fillRect(ox, oy, w, h); const r = rng(seed);
  for (let i = 0; i < w * h / 7; i++) { x.fillStyle = r() < .5 ? 'rgba(255,255,255,.05)' : 'rgba(0,0,0,.07)'; x.fillRect(ox + r() * w, oy + r() * h, 1 + r() * 1.5, 1); }
  const g = x.createLinearGradient(ox, oy, ox, oy + h); g.addColorStop(0, 'rgba(0,0,0,.25)'); g.addColorStop(.06, 'rgba(0,0,0,0)'); g.addColorStop(.94, 'rgba(0,0,0,0)'); g.addColorStop(1, 'rgba(0,0,0,.3)'); x.fillStyle = g; x.fillRect(ox, oy, w, h);
}
function drawCell(x, ox, oy, b) {
  const T = LIB.titles[b.t], col = '#' + T.col.getHexString(), gold = T.gold, W = ATL.sp, H = ATL.ch, ci = DATA.indexOf(DATA[T.cat]);
  // 책등: 천 질감 + 볼록한 띠(가름끈 자리) + 금박 문양 · 세로 제목 · 권 번호
  cloth(x, ox, oy, W, H, col, b.t * 7 + 1);
  const sg = x.createLinearGradient(ox, 0, ox + W, 0); sg.addColorStop(0, 'rgba(0,0,0,.35)'); sg.addColorStop(.25, 'rgba(255,255,255,.08)'); sg.addColorStop(.6, 'rgba(255,255,255,.02)'); sg.addColorStop(1, 'rgba(0,0,0,.4)'); x.fillStyle = sg; x.fillRect(ox, oy, W, H);
  const bands = T.style === 0 ? [18, 40, H - 44, H - 20] : T.style === 1 ? [12, H - 14] : [22, 30, H - 34, H - 26];
  for (const yy of bands) { x.fillStyle = 'rgba(0,0,0,.35)'; x.fillRect(ox, oy + yy + 2, W, 2); x.fillStyle = gold; x.globalAlpha = .9; x.fillRect(ox + 3, oy + yy, W - 6, 1.5); x.globalAlpha = 1; }
  emblem(x, ci, ox + W / 2, oy + 29, 8, gold);
  x.textAlign = 'center'; x.textBaseline = 'middle'; x.fillStyle = gold; x.font = `bold 12px ${SERIF}`;
  const chars = [...T.name.replace(/\s+/g, '').replace(/[:!?,.·…]/g, '')], n = Math.min(chars.length, 8);
  for (let i = 0; i < n; i++) x.fillText(i === 7 && chars.length > 8 ? '⋮' : chars[i], ox + W / 2, oy + 54 + i * 12.5);
  x.font = `bold 16px ${SERIF}`; x.fillText(['Ⅰ', 'Ⅱ', 'Ⅲ', 'Ⅳ', 'Ⅴ'][b.v - 1] || b.v, ox + W / 2, oy + H - 32);
  // 표지: 천 질감 + 이중 테두리(금박·민압) + 가운데 문양 + 제목 + 권
  const cx = ox + W, CW = ATL.cw - W;
  cloth(x, cx, oy, CW, H, col, b.t * 13 + 5); x.fillStyle = 'rgba(0,0,0,.25)'; x.fillRect(cx, oy, 7, H);
  x.strokeStyle = gold; x.lineWidth = 1.5; x.strokeRect(cx + 12, oy + 8, CW - 20, H - 16); x.strokeStyle = 'rgba(0,0,0,.35)'; x.lineWidth = 1; x.strokeRect(cx + 16, oy + 12, CW - 28, H - 24);
  for (const [a, c] of [[cx + 12, oy + 8], [cx + CW - 8, oy + 8], [cx + 12, oy + H - 8], [cx + CW - 8, oy + H - 8]]) { x.fillStyle = gold; x.beginPath(); x.arc(a, c, 2.5, 0, 6.29); x.fill(); }
  emblem(x, ci, cx + CW / 2 + 2, oy + 44, 16, gold);
  x.fillStyle = gold; x.font = `bold 13px ${SERIF}`; wrap(x, T.name, CW - 34).slice(0, 4).forEach((l, i) => x.fillText(l, cx + CW / 2 + 2, oy + 82 + i * 16));
  x.font = `12px ${SERIF}`; x.fillText(`제 ${b.v} 권`, cx + CW / 2 + 2, oy + H - 24);
}
function wrap(x, s, w) { const out = []; let cur = ''; for (const ch of s) { if (x.measureText(cur + ch).width > w && cur) { out.push(cur); cur = ch.trim() ? ch : ''; } else cur += ch; } if (cur) out.push(cur); return out; }
function buildBooks() {
  const pages = Math.ceil(LIB.books.length / ATL.per), mats = [];
  for (let p = 0; p < pages; p++) {
    const t = tex(ATL.S, ATL.S, (x) => {
      const pc = ATL.per, pcx = (pc % ATL.cols) * ATL.cw, pcy = Math.floor(pc / ATL.cols) * ATL.ch;   // 마지막 칸 = 책 단면(종이)
      x.fillStyle = '#efe2c2'; x.fillRect(pcx, pcy, ATL.cw, ATL.ch); x.fillStyle = '#cdbb94'; for (let i = 0; i < ATL.ch; i += 4) x.fillRect(pcx, pcy + i, ATL.cw, 1);
      for (let k = 0; k < ATL.per; k++) { const b = LIB.books[p * ATL.per + k]; if (!b) break; drawCell(x, (k % ATL.cols) * ATL.cw, Math.floor(k / ATL.cols) * ATL.ch, b); }
    });
    t.anisotropy = 4; mats.push(new THREE.MeshStandardMaterial({ map: t, roughness: .75 }));
  }
  const rect = (cx, cy, w, h) => [cx / ATL.S, (cx + w) / ATL.S, 1 - (cy + h) / ATL.S, 1 - cy / ATL.S];
  const pc = ATL.per, paper = rect((pc % ATL.cols) * ATL.cw, Math.floor(pc / ATL.cols) * ATL.ch, ATL.cw, ATL.ch);
  for (const b of LIB.books) {
    const p = Math.floor(b.id / ATL.per), k = b.id % ATL.per, ox = (k % ATL.cols) * ATL.cw, oy = Math.floor(k / ATL.cols) * ATL.ch;
    const spine = rect(ox, oy, ATL.sp, ATL.ch), cover = rect(ox + ATL.sp, oy, ATL.cw - ATL.sp, ATL.ch);
    const T = LIB.titles[b.t], g = new THREE.BoxGeometry(T.w, T.h, T.d), uv = g.attributes.uv;
    const faces = [cover, cover, paper, paper, spine, paper];   // +x -x +y -y +z(책등) -z
    for (let f = 0; f < 6; f++) { const [u0, u1, v0, v1] = faces[f]; for (let i = 0; i < 4; i++) { const j = f * 4 + i, u = uv.getX(j), v = uv.getY(j); uv.setXY(j, u0 + u * (u1 - u0), v0 + v * (v1 - v0)); } }
    uv.needsUpdate = true;
    const m = new THREE.Mesh(g, mats[p]); m.userData = { kind: 'bookm', id: b.id }; scene.add(m); BOOKS3D.push(m);
  }
  glowMesh = new THREE.InstancedMesh(new THREE.BoxGeometry(1, 1, 1), new THREE.MeshBasicMaterial({ transparent: true, opacity: .32, depthWrite: false, blending: THREE.AdditiveBlending }), LIB.books.length);
  for (const b of LIB.books) glowMesh.setColorAt(b.id, new THREE.Color(0, 0, 0));
  scene.add(glowMesh);
}
function slotPos(c, r, s, bh = BOOK.h) { const C = LIB.cases[c], lx = -.91 + (s + .5) * SLOT_W, ly = CASE.row0 + r * CASE.rowH + bh / 2 + .005, lz = .02; const dx = C.f > 0 ? lx : -lx, dz = C.f > 0 ? lz : -lz; return [C.x + dx, C.y + ly, C.z + dz, C.f > 0 ? 0 : Math.PI]; }
function bookState(id) { const v = ST.bk[id]; if (!v) return { w: 'f', p: LIB.books[id].start }; const a = v.split(','); if (a[0] === 'f') return { w: 'f', p: a.slice(1).map(Number) }; if (a[0] === 'h') return { w: 'h', u: a[1] }; return { w: 's', c: +a[1], r: +a[2], s: +a[3] }; }
let booksDirty = true;
const HIDE = new THREE.Matrix4().makeScale(0, 0, 0), GLOWM = new THREE.Matrix4(), GLOWS = new THREE.Matrix4();
function updateBooks() {
  if (!BOOKS3D.length) return;
  const status = rowStatus();
  for (const b of LIB.books) {
    const m = BOOKS3D[b.id], st = bookState(b.id), T = LIB.titles[b.t]; let glow = null;
    if (st.w === 'h' && st.u === me.k) {   // 1인칭: 오른쪽 아래에 손에 든 책을 눕혀 쌓아 보여 줌 (맨 위 = 지금 꽂을 책)
      if (m.parent !== cam) cam.add(m);
      const i = P.hand.indexOf(b.id), n = Math.min(P.hand.length, 10); m.visible = i >= 0 && i < 10;
      let yy = 0; for (let j = n - 1; j > i; j--) yy += LIB.titles[LIB.books[P.hand[j]].t].w; m.position.set(.3 - (i === 0 ? .03 : 0), -.4 + yy + T.w / 2, -.62); m.rotation.set(.35, -.5, Math.PI / 2);
      glowMesh.setMatrixAt(b.id, HIDE); continue;
    }
    if (m.parent !== scene) scene.add(m);
    m.visible = true;
    if (st.w === 'f') { const [x, y, z, yaw] = st.p; m.position.set(x, y + T.w / 2, z); m.rotation.set(0, yaw, Math.PI / 2); }
    else if (st.w === 's') { const [x, y, z, ry] = slotPos(st.c, st.r, st.s, T.h); m.position.set(x, y, z - (T.d - .21) / 2 * (LIB.cases[st.c].f > 0 ? 1 : -1)); m.rotation.set(0, ry, 0); const q = status.book[b.id]; glow = q === 2 ? [.55, .42, .12] : q === 1 ? [.5, .05, .03] : null; }
    else { const O = OTHERS[st.u]; if (O && O.mesh) { const i = (O.hand || []).indexOf(b.id), ry = O.mesh.rotation.y; m.position.set(O.mesh.position.x + Math.sin(ry) * .35, O.mesh.position.y + 1.0 + i * BOOK.w * .95, O.mesh.position.z + Math.cos(ry) * .35); m.rotation.set(0, ry, Math.PI / 2); } else m.visible = false; }
    if (glowFx.series != null && b.t === glowFx.series && st.w === 'f') glow = [.2, .7, 1];
    m.updateMatrix(); m.updateMatrixWorld();
    if (glow && m.visible) { GLOWM.copy(m.matrixWorld).multiply(GLOWS.makeScale(T.w + .025, T.h + .025, T.d + .025)); glowMesh.setMatrixAt(b.id, GLOWM); glowMesh.setColorAt(b.id, new THREE.Color(...glow)); } else glowMesh.setMatrixAt(b.id, HIDE);
  }
  glowMesh.instanceMatrix.needsUpdate = true; if (glowMesh.instanceColor) glowMesh.instanceColor.needsUpdate = true; glowMesh.computeBoundingSphere();
  booksDirty = false;
}
// ── 정답 판정 (원작 안내문): 올바른 책장 + 같은 제목은 한 단에만 + 권 번호 순서대로 왼쪽→오른쪽 ──
let STATUS = null;
function rowStatus() {
  if (STATUS) return STATUS;
  const book = {}, rows = {}, byTitle = {};
  for (const b of LIB.books) { const st = bookState(b.id); if (st.w !== 's') continue; const key = st.c + '_' + st.r; (rows[key] = rows[key] || []).push({ id: b.id, s: st.s }); (byTitle[b.t] = byTitle[b.t] || []).push({ id: b.id, c: st.c, r: st.r, s: st.s, v: b.v }); }
  for (const t in byTitle) {
    const T = LIB.titles[t], list = byTitle[t], rowsUsed = new Set(list.map(x => x.c + '_' + x.r));
    for (const x of list) {
      if (x.c !== T.caseI) { book[x.id] = 0; continue; }
      const same = list.filter(y => y.c === x.c && y.r === x.r);
      const ordered = same.every(y => (y.v < x.v) === (y.s < x.s) || y.id === x.id);
      book[x.id] = rowsUsed.size === 1 && ordered ? 2 : 1;
    }
  }
  // 줄 완성: 그 단의 책이 모두 정답(노란 빛)이고, 그 단에 있는 제목은 모든 권이 다 들어와 있어야
  let done = 0; const doneRows = new Set();
  for (const key in rows) { const list = rows[key]; if (!list.length) continue; const ok = list.every(x => book[x.id] === 2) && [...new Set(list.map(x => LIB.books[x.id].t))].every(t => list.filter(x => LIB.books[x.id].t === +t).length === LIB.titles[t].vols); if (ok) { done++; doneRows.add(key); } }
  const shelved = Object.keys(book).length, good = Object.values(book).filter(v => v === 2).length;
  return (STATUS = { book, done, doneRows, shelved, good });
}

// ════════════ 플레이어 (1인칭) ════════════
const P = { x: 0, y: 0, z: 2, vy: 0, yaw: Math.PI, pitch: 0, ground: true, hand: [], jumpHold: 0 };
const KEY = {}; let locked = false;
const PW = .28, PHH = 1.7, EYE = 1.6;
function collide(x, y, z) { for (const s of solids) if (x + PW > s[0] && x - PW < s[3] && z + PW > s[2] && z - PW < s[5] && y + PHH > s[1] && y < s[4] - .001) return s; return null; }
function moveP(dt) {
  const run = KEY.ShiftLeft || KEY.ShiftRight, sp = (run ? 7.5 : 4.5) * dt;
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
  P.vy -= 18 * dt; let ny = P.y + P.vy * dt; const hit = collide(P.x, ny, P.z);
  if (hit) { if (P.vy < 0) { P.y = hit[4]; P.ground = true; } else P.y = hit[1] - PHH - .001; P.vy = 0; } else { P.y = ny; P.ground = false; if (!collide(P.x, P.y - .05, P.z) && P.y <= 0) { P.y = 0; P.vy = 0; P.ground = true; } }
  if (P.y < 0) { P.y = 0; P.vy = 0; P.ground = true; }
  P.x = clamp(P.x, -9.8, 9.8); P.z = clamp(P.z, -6.8, 6.8);
  cam.position.set(P.x, P.y + EYE + (P.ground && (fx || fz) ? Math.sin(performance.now() / 120) * .025 : 0), P.z); cam.rotation.set(P.pitch, P.yaw, 0, 'YXZ');
}
addEventListener('keydown', e => { if (e.target.tagName === 'INPUT') return; KEY[e.code] = 1; if (!LIB) return; onKey(e); });
addEventListener('keyup', e => { KEY[e.code] = 0; if (e.code === 'KeyQ' && LIB) dropUp(); });
canvas.addEventListener('click', () => { if (LIB && !locked && !overlayOpen()) canvas.requestPointerLock(); });
document.addEventListener('pointerlockchange', () => { locked = document.pointerLockElement === canvas; $('escMenu').classList.toggle('hide', locked || !LIB || overlayOpen()); $('hint').classList.toggle('hide', locked); });
document.addEventListener('mousemove', e => { if (!locked) return; P.yaw -= e.movementX * .0022; P.pitch = clamp(P.pitch - e.movementY * .0022, -1.45, 1.45); });
document.addEventListener('mousedown', e => { if (!locked) return; if (e.button === 0) act(); if (e.button === 2) drop(false); });
document.addEventListener('wheel', e => { if (locked && P.hand.length > 1) { if (e.deltaY > 0) P.hand.push(P.hand.shift()); else P.hand.unshift(P.hand.pop()); sendHand(); hudHand(); } });
$('btnResume').onclick = () => canvas.requestPointerLock();
$('btnQuit').onclick = () => { if (NET && !NET.solo) { returnHand(); NET.ref('players/' + me.k).remove(); } location.href = location.pathname; };
const overlayOpen = () => !$('ovLetter').classList.contains('hide') || !$('ovMap').classList.contains('hide') || !$('ovAbil').classList.contains('hide');

// ════════════ 조준 · 집기 · 꽂기 · 내려놓기 ════════════
const ray = new THREE.Raycaster(); ray.far = 3.2;
let AIM = null;
function aimUpdate() {
  ray.setFromCamera({ x: 0, y: 0 }, cam); AIM = null;
  const targets = [...BOOKS3D.filter(m => m.parent === scene), ...CASES.flatMap(c => c.rows), ...PICKABLE, ...KEYMESH, ...CHESTMESH, STONE.mesh].filter(o => o && o.visible);
  const hit = ray.intersectObjects(targets, false)[0];
  if (hit) {
    if (hit.object.userData.kind === 'bookm') { const id = hit.object.userData.id, st = bookState(id); if (st.w !== 'h') AIM = { kind: 'book', id, st }; }
    else if (hit.object.userData.kind === 'row') { const C = LIB.cases[hit.object.userData.c], lp = hit.object.worldToLocal(hit.point.clone()); const s = clamp(Math.floor((lp.x + .91) / SLOT_W), 0, CASE.slots - 1); AIM = { kind: 'slot', c: C.i, r: hit.object.userData.r, s, point: hit.point };
      const occ = ST.slot[C.i + '_' + AIM.r + '_' + s]; if (occ != null) AIM = { kind: 'book', id: +occ, st: bookState(+occ) }; }
    else AIM = hit.object.userData;
  }
  // 조준 표시
  let html = '';
  if (AIM && AIM.kind === 'book') { const b = LIB.books[AIM.id], T = LIB.titles[b.t], q = AIM.st.w === 's' ? rowStatus().book[AIM.id] : null; html = `${esc(T.name)} <b>${b.v}권</b> / ${T.vols}권<small>${DATA[T.cat].ic} ${esc(DATA[T.cat].n)} → ${LIB.cases[T.caseI].lab} 책장${q === 2 ? ' · <span class="good">제자리!</span>' : q === 1 ? ' · <span class="bad">책장은 맞지만 순서·단이 달라요</span>' : q === 0 ? ' · <span class="bad">책장이 틀렸어요</span>' : ''}</small>`; }
  else if (AIM && AIM.kind === 'slot') { const C = LIB.cases[AIM.c]; html = `${C.lab} : ${esc(C.name)} <small>${AIM.r + 1}단 ${AIM.s + 1}번째 칸${P.hand.length ? ' · E 로 꽂기' : ''}</small>`; }
  else if (AIM && AIM.kind === 'map') html = '도서관 지도 <small>E 로 크게 보기</small>';
  else if (AIM && AIM.kind === 'key') html = `${LIB.keys[AIM.i].ic} ${LIB.keys[AIM.i].n} <small>E 로 줍기</small>`;
  else if (AIM && AIM.kind === 'chest') html = `${LIB.chests[AIM.i].ic} 보물상자 <small>${ST.chests[AIM.i] ? '열린 상자' : '맞는 열쇠가 있으면 E 로 열기'}</small>`;
  else if (AIM && AIM.kind === 'stone') html = '🔮 회수의 돌 <small>E — 아직 꽂지 않은 책을 모두 이곳으로 불러와요</small>';
  $('aim').innerHTML = html; $('cross').classList.toggle('hot', !!AIM);
  updateGhost();
}
// 꽂을 자리 미리보기: 초록 = 놓을 수 있음, 빨강 = 막힘
const ghost = new THREE.Mesh(new THREE.BoxGeometry(BOOK.w, BOOK.h, BOOK.d), new THREE.MeshBasicMaterial({ color: '#6ae46a', transparent: true, opacity: .45, depthWrite: false })); ghost.visible = false; scene.add(ghost);
function updateGhost() {
  if (AIM && AIM.kind === 'slot' && P.hand.length) { const [x, y, z, ry] = slotPos(AIM.c, AIM.r, AIM.s); ghost.position.set(x, y, z); ghost.rotation.set(0, ry, 0); ghost.visible = true; ghost.material.color.set(ST.slot[AIM.c + '_' + AIM.r + '_' + AIM.s] != null ? '#e84a3a' : '#6ae46a'); }
  else ghost.visible = false;
}
const capacity = () => 5 + (ST.potion || 0);
async function act() {
  if (!AIM) return;
  if (AIM.kind === 'book') return pickBook(AIM.id);
  if (AIM.kind === 'slot') { if (!P.hand.length) return; if (ABIL.autoshelve.on > 0) return autoShelve(AIM.c); return placeBook(P.hand[0], AIM.c, AIM.r, AIM.s); }
  if (AIM.kind === 'map') return openMap();
  if (AIM.kind === 'key') return takeKey(AIM.i);
  if (AIM.kind === 'chest') return openChest(AIM.i);
  if (AIM.kind === 'stone') return useStone();
}
async function pickBook(id) {
  if (P.hand.length >= capacity()) { sfx('no'); return notice(`더 들 수 없어요 (최대 ${capacity()}권) — Q 로 내려놓거나 꽂으세요`); }
  const prev = ST.bk[id] || null, st = bookState(id);
  const ok = await NET.tx('bk/' + id, cur => { const c = cur || null; if (c && c.startsWith('h,')) return undefined; if (c !== prev) return undefined; return 'h,' + me.k; });
  if (!ok) { sfx('no'); return; }
  if (st.w === 's') NET.set(`slot/${st.c}_${st.r}_${st.s}`, null);
  P.hand.unshift(id); sendHand(); sfx('pick'); hudHand();
}
async function placeBook(id, c, r, s) {
  const k = `${c}_${r}_${s}`;
  const ok = await NET.tx('slot/' + k, cur => cur == null ? id : undefined);
  if (!ok) { sfx('no'); return notice('그 자리는 막혀 있어요'); }
  P.hand = P.hand.filter(x => x !== id); await NET.set('bk/' + id, `s,${c},${r},${s}`); sendHand(); hudHand(); sfx('place');
  setTimeout(() => { const q = rowStatus().book[id]; if (q === 2) sfx('good'); }, 120);
}
async function autoShelve(c) {   // 자동 책꽂기: 조준한 책장이 맞는 책장이면 알맞은 단·칸을 골라 바로 꽂음
  const id = P.hand.find(x => LIB.titles[LIB.books[x].t].caseI === c); if (id == null) { sfx('no'); return notice('손에 이 책장에 맞는 책이 없어 자동 꽂기에 실패했어요'); }
  const b = LIB.books[id], T = LIB.titles[b.t];
  // 같은 제목이 이미 꽂힌 단이 있으면 그 단, 아니면 연속 빈칸이 권수만큼 있는 단
  let row = null; for (const x of LIB.books) { if (x.t !== b.t || x.id === id) continue; const st = bookState(x.id); if (st.w === 's' && st.c === c) { row = st.r; break; } }
  const free = r => [...Array(CASE.slots).keys()].filter(s => ST.slot[`${c}_${r}_${s}`] == null);
  if (row == null) for (let r = 0; r < CASE.rows && row == null; r++) { const f = free(r); for (let s = 0; s + T.vols <= CASE.slots; s++) if ([...Array(T.vols).keys()].every(k => f.includes(s + k))) { row = r; break; } }
  if (row == null) { sfx('no'); return notice('대상 위치가 막혀 있어 자동 꽂기에 실패했어요'); }
  // 그 단에서 권 번호 순서를 지키는 빈칸 고르기
  const placed = LIB.books.filter(x => x.t === b.t && x.id !== id).map(x => ({ v: x.v, st: bookState(x.id) })).filter(x => x.st.w === 's' && x.st.c === c && x.st.r === row);
  const lo = Math.max(-1, ...placed.filter(x => x.v < b.v).map(x => x.st.s)), hi = Math.min(CASE.slots, ...placed.filter(x => x.v > b.v).map(x => x.st.s));
  let s = free(row).find(s => s > lo && s < hi); if (s == null) { sfx('no'); return notice('순서에 맞는 빈칸이 없어요'); }
  sfx('magic'); return placeBook(id, c, row, s);
}
let dropT = 0;
function drop(all) {
  if (!P.hand.length) return;
  const ids = all ? P.hand.slice() : [P.hand[0]], fx = P.x - Math.sin(P.yaw) * .7, fz = P.z - Math.cos(P.yaw) * .7, up = {}, base = baseY(fx, fz, P.y + .4), under = floorBooks(fx, fz);
  ids.forEach((id, i) => { up[id] = `f,${(fx + (all ? 0 : (Math.random() - .5) * .2)).toFixed(2)},${(base + (under + i) * BOOK.w).toFixed(3)},${(fz).toFixed(2)},${(all ? P.yaw : Math.random() * 6.28).toFixed(2)}`; });
  P.hand = P.hand.filter(x => !ids.includes(x)); NET.update('bk', up); sendHand(); hudHand(); sfx('drop');
}
function baseY(x, z, below) { let y = 0; for (const s of solids) if (x > s[0] && x < s[3] && z > s[2] && z < s[5] && s[4] <= below && s[4] > y) y = s[4]; return y; }
function floorBooks(x, z) { let n = 0; for (const b of LIB.books) { const st = bookState(b.id); if (st.w === 'f' && Math.abs(st.p[0] - x) < .12 && Math.abs(st.p[2] - z) < .12) n++; } return n; }
function dropUp() { if (dropT && performance.now() - dropT < 450) drop(false); dropT = 0; }
function returnHand() { if (P.hand.length) drop(true); }

// ════════════ 마법 (주요 마법 레벨 = 완성한 줄 2개마다 포인트 1, 상자에서 해금) ════════════
const ABIL = {
  guide: { n: '책장 가이드', ic: '🧭', k: 1, d: '손에 든 맨 위 책에 맞는 책장을 강조해 올바른 위치로 안내해요. 지속 시간 동안 유지돼요.', cd: l => 20 - 2 * l, act: l => 8 + 2 * l, base: 1, on: 0, cdT: 0 },
  sort: { n: '정렬', ic: '🔢', k: 2, d: '손에 든 책을 제목·권 번호 순서대로 자동 정렬해요. 발동 즉시 재사용 대기에 들어가요.', cd: l => 10 - l, base: 1, on: 0, cdT: 0 },
  glow: { n: '빛나는 시리즈', ic: '✨', k: 3, d: '손에 든 맨 위 책과 같은 시리즈의 책을 빛나게 해요. 책더미 속에서도 쉽게 찾을 수 있어요.', cd: l => 25 - 2 * l, act: l => 10 + 2 * l, base: 0, on: 0, cdT: 0 },
  gather: { n: '불러모으기', ic: '🌀', k: 4, d: '손에 든 맨 위 책과 같은 시리즈의 책이 손안으로 모여들어요.', cd: l => 30 - 3 * l, grab: l => 2 + l, base: 0, on: 0, cdT: 0 },
  autoshelve: { n: '자동 책꽂기', ic: '🪄', k: 5, d: '손에 든 책을 조준한 책장에 즉시 꽂아요. 그 책장에 맞는 책만, 알맞은 단과 칸을 골라 꽂아요. 활성화된 동안 계속 쓸 수 있어요.', cd: l => 40 - 4 * l, act: l => 6 + 2 * l, base: 0, on: 0, cdT: 0 } };
const glowFx = { series: null };
const abLv = k => ST.lv[k] | 0, abOpen = k => ABIL[k].base || LIB.chests.some(c => c.reward === k && ST.chests[c.i]);
const points = () => Math.floor(rowStatus().done / 2) - (ST.spent | 0);
function useAbility(k) {
  const A = ABIL[k]; if (!abOpen(k)) { sfx('no'); return notice('이 능력은 잠겨 있어요 — 상자를 열어 그 힘을 해방하세요'); }
  if (A.cdT > 0) { sfx('no'); return; }
  const l = abLv(k);
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
function tickAbil(dt) {
  for (const k in ABIL) { const A = ABIL[k]; if (A.on > 0) { A.on -= dt; if (A.on <= 0) { A.on = 0; if (k === 'glow') { glowFx.series = null; booksDirty = true; } } } if (A.cdT > 0) A.cdT = Math.max(0, A.cdT - dt); }
  const tgt = ABIL.guide.on > 0 && P.hand.length ? LIB.titles[LIB.books[P.hand[0]].t].caseI : -1;
  for (const C of CASES) C.hl.material.opacity = C.c.i === tgt ? .18 + .1 * Math.sin(performance.now() / 150) : 0;
}
function openAbil() {
  const pts = points(), left = 2 - rowStatus().done % 2;
  $('abox').innerHTML = `<h3 style="margin-bottom:6px">📖 능력 목록 <small style="color:var(--dim)">(K 닫기)</small></h3><p style="color:var(--dim);font-size:14px">완성한 책장 줄 2개마다 포인트 1 · 남은 포인트 <b style="color:var(--gold)">${pts}</b> · 레벨 업까지 ${left}줄 남음${NET.solo ? '' : ' · 포인트와 레벨은 모든 사서가 함께 써요'}</p>` +
    Object.entries(ABIL).map(([k, A]) => { const l = abLv(k), open = abOpen(k); return `<div class="arow"><div class="ic">${open ? A.ic : '🔒'}</div><div class="tx"><b>${A.k}. ${A.n}</b> Lv.${l + 1}<br>${A.d}<br>재사용 대기 ${A.cd(l)}초${A.act ? ` · 지속 ${A.act(l)}초` : ''}${A.grab ? ` · 한 번에 ${A.grab(l)}권` : ''}${l < 4 ? ` → <span style="color:var(--gold)">${A.cd(l + 1)}초${A.act ? ` · ${A.act(l + 1)}초` : ''}${A.grab ? ` · ${A.grab(l + 1)}권` : ''}</span>` : ''}${open ? '' : '<br><span style="color:var(--red)">상자를 열어야 해금돼요</span>'}</div>${open && l < 4 ? `<button class="btn" data-up="${k}" ${pts > 0 ? '' : 'disabled'}>레벨 업</button>` : ''}</div>`; }).join('');
  $('ovAbil').classList.remove('hide'); document.exitPointerLock();
  $('abox').querySelectorAll('[data-up]').forEach(b => b.onclick = async () => { const k = b.dataset.up; const ok = await NET.tx('spent', cur => (cur | 0) < Math.floor(rowStatus().done / 2) ? (cur | 0) + 1 : undefined); if (ok) { await NET.tx('lv/' + k, cur => (cur | 0) + 1); sfx('magic'); setTimeout(openAbil, 150); } });
}

// ════════════ 열쇠 · 보물상자 · 회수의 돌 ════════════
const KEYMESH = [], CHESTMESH = [], STONE = { mesh: null };
function buildProps() {
  for (const k of LIB.keys) { const g = new THREE.Mesh(new THREE.TorusGeometry(.07, .022, 8, 16), new THREE.MeshStandardMaterial({ color: k.c, emissive: k.c, emissiveIntensity: .6 })); g.position.set(k.pos[0], k.pos[1] + .12, k.pos[2]); g.userData = { kind: 'key', i: k.i }; scene.add(g); KEYMESH.push(g); }
  for (const c of LIB.chests) { const g = new THREE.Mesh(new THREE.BoxGeometry(.7, .45, .45), new THREE.MeshStandardMaterial({ color: '#7a4a1e', roughness: .7 })); g.position.set(c.pos[0], .23, c.pos[2]); g.userData = { kind: 'chest', i: c.i }; scene.add(g); const t = new THREE.Mesh(new THREE.BoxGeometry(.18, .14, .02), new THREE.MeshBasicMaterial({ color: c.c })); t.position.set(0, .05, c.pos[2] > 0 || c.pos[0] > 0 ? .23 : .23); g.add(t); CHESTMESH.push(g); solids.push([c.pos[0] - .35, 0, c.pos[2] - .23, c.pos[0] + .35, .45, c.pos[2] + .23]); }
  STONE.mesh = new THREE.Mesh(new THREE.OctahedronGeometry(.18), new THREE.MeshStandardMaterial({ color: '#8a6aff', emissive: '#6a4aff', emissiveIntensity: .8 })); STONE.mesh.position.set(0, 1.05, 0); STONE.mesh.userData = { kind: 'stone' }; STONE.mesh.visible = false; scene.add(STONE.mesh);
}
async function takeKey(i) { const ok = await NET.tx('keys/' + i, cur => cur ? undefined : me.k); if (ok) { sfx('pick'); toast(`${LIB.keys[i].ic} ${LIB.keys[i].n}를 주웠어요 — 같은 표식의 상자를 찾아보세요`, 3200); } }
async function openChest(i) {
  if (ST.chests[i]) return; const c = LIB.chests[i];
  if (ST.keys[c.key] !== me.k) { sfx('no'); return notice('필요한 열쇠를 아직 얻지 않았어요'); }
  const ok = await NET.tx('chests/' + i, cur => cur ? undefined : me.k); if (!ok) return;
  NET.set('keys/' + c.key, 'used'); sfx('chest');
  if (c.reward === 'potion3') { await NET.tx('potion', cur => (cur | 0) + 3); toast('🧪 소지 한도 +3 물약! 모든 사서가 책을 더 들 수 있어요', 3600); }
  else toast(`🔓 ${ABIL[c.reward].ic} ${ABIL[c.reward].n} 능력이 해금됐어요! (${ABIL[c.reward].k}번 키)`, 3600);
  setTimeout(() => toast('믿어라! 상자 안에 함정은 설치하지 않았다!'), 3800);
}
function useStone() {   // 회수의 돌: 남은 책이 20권 이하일 때, 바닥의 책을 전부 가운데 탁자 옆으로
  if (!stoneReady()) return notice('책이 20권 남으면 회수의 돌을 쓸 수 있어요');
  const up = {}; let k = 0; for (const b of LIB.books) { const st = bookState(b.id); if (st.w !== 'f') continue; up[b.id] = `f,${(1.4 + (k % 4) * .25).toFixed(2)},${(Math.floor(k / 4) * BOOK.w).toFixed(3)},${(1.2 + (k % 2) * .3).toFixed(2)},0`; k++; }
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
  scene.add(g); return g;
}
function syncOthers(pos, players) {
  for (const k in pos) { if (k === me.k || !players[k]) continue; const p = pos[k], O = OTHERS[k] = OTHERS[k] || { mesh: avatar(PCOL[(players[k].col || 0) % 8], players[k].nick) }; O.tx = p.x; O.ty = p.y; O.tz = p.z; O.tyaw = p.yw; O.hand = (p.h ? String(p.h).split(',').map(Number) : []); }
  for (const k in OTHERS) if (!pos[k] || !players[k]) { scene.remove(OTHERS[k].mesh); delete OTHERS[k]; }
}
let posT = 0;
function sendPos(dt) { if (NET.solo) return; posT += dt; if (posT < .1) return; posT = 0; NET.set('pos/' + me.k, { x: +P.x.toFixed(2), y: +P.y.toFixed(2), z: +P.z.toFixed(2), yw: +P.yaw.toFixed(2), h: P.hand.join(',') }); }
function sendHand() { if (!NET.solo) NET.set('pos/' + me.k + '/h', P.hand.join(',')); booksDirty = true; STATUS = null; }

// ════════════ 방 데이터 받기 ════════════
let lastRows = 0;
function onRoom(r) {
  if (!LIB) return;
  ST.bk = r.bk || {}; ST.slot = r.slot || {}; ST.keys = r.keys || {}; ST.chests = r.chests || {}; ST.lv = r.lv || {}; ST.spent = r.spent || 0; ST.potion = r.potion || 0; ST.stone = r.stone || 0; ST.players = r.players || ST.players; ST.done = r.done || null; ST.permits = r.permits || {};
  STATUS = null; booksDirty = true;
  // 남이 내 손의 책을 가져갔으면(동시 집기 경합) 손에서 뺌
  P.hand = P.hand.filter(id => (ST.bk[id] || '') === 'h,' + me.k);
  if (!NET.solo) syncOthers(r.pos || {}, r.players || {});
  for (const k of KEYMESH) k.visible = !ST.keys[k.userData.i];
  CHESTMESH.forEach((c, i) => { c.scale.y = ST.chests[i] ? .55 : 1; });
  STONE.mesh.visible = stoneReady();
  const S = rowStatus();
  if (S.done > lastRows) { sfx('row'); notice(`✨ 책장 한 줄 완성! (${S.done}줄)${S.done % 2 === 0 ? ' — 포인트 +1, K 로 능력 레벨 업' : ''}`); }
  lastRows = S.done;
  // 허가 통지 (원작: 달리기·높이뛰기 허가 편지)
  if (isHost && S.done >= 3 && !ST.permits.run) NET.set('permits/run', 1);
  if (isHost && S.done >= 8 && !ST.permits.jump && LIB.size > 4) NET.set('permits/jump', 1);
  if (ST.permits.run && !shown.run) { shown.run = 1; letter('급히 전합니다,', '학장님의 승인에 따라 이제 도서관 안에서 <b>달리기</b>가 허용됩니다. 책장 사이를 빠르게 이동하세요.<br><br><b>왼쪽 Shift</b> 를 누르면 달릴 수 있습니다.'); }
  if (ST.permits.jump && !shown.jump) { shown.jump = 1; letter('급히 전합니다,', '학장님의 승인에 따라 이제 도서관 안에서 <b>높이뛰기</b>가 허용됩니다. 곧바로 2층까지 뛰어오를 수 있습니다.<br><br><b>스페이스 바</b>를 길게 누를수록 더 높이 뜁니다.'); }
  // 손에 든 사서가 나가 버린 책은 방장이 가운데 바닥으로 돌려놓음
  if (isHost && !NET.solo) { const up = {}; let n = 0; for (const id in ST.bk) { const v = ST.bk[id]; if (v.startsWith('h,') && !(r.players || {})[v.slice(2)]) up[id] = `f,${(-1 + (n % 5) * .3).toFixed(2)},${(Math.floor(n / 5) * BOOK.w).toFixed(3)},-.8,0`, n++; } if (n) NET.update('bk', up); }
  // 다 정리했으면 끝
  if (!ST.done && S.good === LIB.books.length) NET.tx('done', cur => cur ? undefined : { t: Date.now(), by: me.k });
  if (ST.done && !shown.end) { shown.end = 1; setTimeout(showEnd, 900); }
  hudProg(); hudHand(); hudAbil();
}
const shown = {};

// ════════════ HUD ════════════
function fmtT(ms) { const s = Math.floor(ms / 1000); return `${String(Math.floor(s / 3600)).padStart(2, '0')}:${String(Math.floor(s / 60) % 60).padStart(2, '0')}:${String(s % 60).padStart(2, '0')}`; }
function hudProg() { const S = rowStatus(); $('prog').innerHTML = `📚 정리한 책장 줄 <b>${S.done}</b><br>📖 제자리 책 <b>${S.good}</b> / ${LIB.books.length} <span style="color:var(--dim);font-size:13px">(꽂은 책 ${S.shelved})</span><div class="tm" id="tm"></div>`; }
function hudHand() {
  const cap = capacity();
  if (!P.hand.length) { $('hand').innerHTML = `<h4>손에 든 책 <b>0 / ${cap}</b></h4><div class="top" style="color:var(--dim);font-size:14px">책을 조준하고 E (왼쪽 클릭)</div>`; return; }
  $('hand').innerHTML = `<h4>손에 든 책 <b>${P.hand.length} / ${cap}</b></h4><div class="hl">` + P.hand.map((id, i) => {
    const b = LIB.books[id], T = LIB.titles[b.t], C = LIB.cases[T.caseI], cat = DATA[T.cat];
    return `<div class="hb ${i ? '' : 'top'}"><span class="bk" style="background:#${T.col.getHexString()};border-color:${T.gold}">${b.v}</span><span class="nm">${esc(T.name)} <small>${b.v}/${T.vols}권</small></span><span class="to" style="border-color:${C.col};background:${C.col}55">${cat.ic} ${C.lab}</span></div>`;
  }).join('') + `</div><div class="hk">맨 위 책부터 꽂아요 · 휠/R 순서 바꾸기 · Q 내려놓기</div>`;
}
function hudAbil() { $('abil').innerHTML = Object.entries(ABIL).map(([k, A]) => { const open = abOpen(k); return `<div class="ab ${A.on > 0 ? 'act' : ''} ${open ? '' : 'lock'}"><span class="k">${A.k}</span>${open ? A.ic : '🔒'}<span class="lv">Lv.${abLv(k) + 1}</span>${A.cdT > 0 ? `<div class="cd">${Math.ceil(A.cdT)}</div>` : ''}</div>`; }).join(''); }
function hudOthers() { if (NET.solo) { $('others').innerHTML = ''; return; } $('others').innerHTML = Object.entries(ST.players).map(([k, p]) => `<div><span style="color:${PCOL[(p.col || 0) % 8]}">●</span> ${esc(p.nick)}${k === me.k ? ' (나)' : ''}</div>`).join(''); }
function onKey(e) {
  if (e.code === 'Tab') { e.preventDefault(); hudHand(); }
  if (e.code === 'KeyM') { if ($('ovMap').classList.contains('hide')) openMap(); else closeOv(); }
  if (e.code === 'KeyK') { if ($('ovAbil').classList.contains('hide')) openAbil(); else closeOv(); }
  if (e.code === 'Escape' && overlayOpen()) closeOv();
  if (!locked) return;
  if (e.code === 'KeyE') act();
  if (e.code === 'KeyQ' && !e.repeat) { dropT = performance.now(); setTimeout(() => { if (dropT && KEY.KeyQ && performance.now() - dropT >= 440) { drop(true); dropT = 0; } }, 460); }
  if (e.code === 'KeyR' && P.hand.length > 1) { P.hand.push(P.hand.shift()); sendHand(); hudHand(); }
  const n = { Digit1: 'guide', Digit2: 'sort', Digit3: 'glow', Digit4: 'gather', Digit5: 'autoshelve' }[e.code]; if (n) useAbility(n);
}
addEventListener('keyup', e => { if (e.code === 'Tab' && LIB) hudHand(); });
function closeOv() { ['ovLetter', 'ovMap', 'ovAbil'].forEach(i => $(i).classList.add('hide')); }
function letter(title, body, btn = '확인') { $('letter').innerHTML = `<h2>${title}</h2><div>${body}</div><div class="sign">학장 멀린 올림</div><div style="text-align:center"><button class="btn" id="lOk">${btn}</button></div>`; $('ovLetter').classList.remove('hide'); document.exitPointerLock(); $('lOk').onclick = () => { closeOv(); canvas.requestPointerLock(); }; }
// ── 지도 (원작: 계단 양쪽 지도에서 카테고리 책장 위치 확인) ──
function drawMap(c, W, H) {
  c.width = W; c.height = H; const x = c.getContext('2d'), sx = W / 21, sz = H / 15, X = v => (v + 10.5) * sx, Z = v => (v + 7.5) * sz;
  x.fillStyle = '#2a1e10'; x.fillRect(0, 0, W, H); x.fillStyle = '#3e2c16'; x.fillRect(X(-10), Z(-7), 20 * sx, 14 * sz);
  x.fillStyle = 'rgba(160,120,60,.25)'; x.fillRect(X(-10), Z(-7), 20 * sx, 2.5 * sz); x.fillRect(X(-10), Z(4.5), 20 * sx, 2.5 * sz);
  x.fillStyle = '#6a4a26'; x.fillRect(X(-9.9), Z(-4.5), 2.1 * sx, 7.5 * sz); x.fillRect(X(7.8), Z(-3), 2.1 * sx, 7.5 * sz);
  x.font = `${Math.round(sz * .55)}px Jua, sans-serif`; x.textAlign = 'center'; x.textBaseline = 'middle';
  if (!LIB) return c;
  for (const C of LIB.cases) { const up = C.y > 0, zz = C.z + (C.f > 0 ? (up ? 1.4 : .9) : (up ? -1.4 : -.9)); x.fillStyle = C.col; x.globalAlpha = up ? .65 : 1; x.fillRect(X(C.x - 1), Z(C.z - .25), 2 * sx, .5 * sz); x.globalAlpha = 1; x.fillStyle = '#f6e6c0'; x.fillText(`${DATA[C.cat].ic} ${C.lab} ${C.name}`, X(C.x), Z(zz)); }
  x.fillStyle = '#c8b490'; x.fillText('계단', X(-8.85), Z(-.7)); x.fillText('계단', X(8.85), Z(.7));
  if (P) { x.fillStyle = '#fff'; x.beginPath(); x.arc(X(P.x), Z(P.z), 6, 0, 6.28); x.fill(); x.strokeStyle = '#fff'; x.lineWidth = 2; x.beginPath(); x.moveTo(X(P.x), Z(P.z)); x.lineTo(X(P.x - Math.sin(P.yaw) * .9), Z(P.z - Math.cos(P.yaw) * .9)); x.stroke(); }
  return c;
}
function openMap() { drawMap($('mapCv'), 760, 520); $('ovMap').classList.remove('hide'); document.exitPointerLock(); }
// ── 학장 평가 (원작 결과 등급: 엄청난 승자 · 아주 좋은 사람 · 흥미로운 사람 · 졸린 사람 · 완전 엉망진창 · 해고!) ──
function showEnd() {
  const ms = ST.done.t - ST_T0, per = ms / 1000 / LIB.books.length * Math.max(1, Object.keys(ST.players).length || 1);
  const rank = per < 9 ? '엄청난 승자!' : per < 13 ? '아주 좋은 사람!' : per < 18 ? '흥미로운 사람!' : per < 26 ? '졸린 사람!' : per < 40 ? '완전 엉망진창!' : '해고!';
  const best = +(localStorage.getItem('lb_best_' + LIB.size) || 0), nb = !best || ms < best; if (nb) localStorage.setItem('lb_best_' + LIB.size, ms);
  letter('사서에게,', `들어 보십시오. 요정이 어지럽힌 우리 도서관이 다시 반짝입니다. 책 <b>${LIB.books.length}</b>권이 모두 제자리를 찾았지요.<br><br>클리어 시간 <b>${fmtT(ms)}</b>${nb ? ' <b style="color:#8a2a1a">신기록!</b>' : ` (최고 기록 ${fmtT(best)})`}<br>정리한 책장 줄 ${rowStatus().done}줄${NET.solo ? '' : ` · 함께한 사서 ${Object.keys(ST.players).length}명`}<div class="rank">당신은 ${rank}</div>`, '처음으로');
  $('lOk').onclick = () => { if (!NET.solo) NET.ref('players/' + me.k).remove(); location.href = location.pathname; };
}

// ════════════ 시작 · 루프 ════════════
let ST_T0 = 0;
async function startGame(o) {
  try { await Promise.race([document.fonts.load('bold 13px "Nanum Myeongjo"'), new Promise(r => setTimeout(r, 2500))]); } catch (e) {}
  LIB = buildLibrary(o.size, o.seed); ST_T0 = o.t0;
  $('home').classList.add('hide'); $('lobby').classList.add('hide'); $('hud').classList.remove('hide');
  buildRoom(); buildCases(); buildBooks(); buildProps();
  P.x = 0; P.z = 3; P.yaw = 0;
  if (!NET.solo) { NET.ref('pos/' + me.k).onDisconnect().remove(); NET.ref('players/' + me.k).onDisconnect().remove(); NET.on(r => { if (!r.players || !r.players[me.k]) { toast('방에서 나왔어요'); return; } isHost = r.host === me.k || !r.players[r.host]; if (isHost && r.host !== me.k) NET.set('host', me.k); onRoom(r); hudOthers(); }); }
  else NET.on(onRoom);
  hudProg(); hudHand(); hudAbil(); hudOthers();
  letter('사서에게,', '잘 들으십시오. 우리 장엄한 도서관에서 아주 엉망진창인 사태가 벌어졌습니다. 그 장난꾸러기 요정이 책을 몽땅 흩어 놓았지요!<br><br>책마다 <b>카테고리에 맞는 책장</b>에 꽂으세요. 칸은 자유롭게 골라도 되지만, <b>같은 제목은 한 단에, 권 번호 순서대로 왼쪽에서 오른쪽으로</b> 꽂아야 합니다. 올바르게 꽂으면 노랗게 빛나고, 책장은 맞지만 순서나 단이 틀리면 희미하게 붉게 빛납니다.<br><br>책장 위치는 계단 옆 지도(M)에서 확인하세요. 정리가 끝날 때까지는 도서관을 나갈 수 없습니다.', '정리 시작!');
}
const clock = new THREE.Clock();
function loop() {
  const dt = Math.min(.05, clock.getDelta());
  if (LIB) {
    if (locked) moveP(dt); else cam.rotation.set(P.pitch, P.yaw, 0, 'YXZ'), cam.position.set(P.x, P.y + EYE, P.z);
    tickAbil(dt);
    for (const k in OTHERS) { const O = OTHERS[k]; if (O.tx == null) continue; O.mesh.position.x += (O.tx - O.mesh.position.x) * Math.min(1, dt * 10); O.mesh.position.y += (O.ty - O.mesh.position.y) * Math.min(1, dt * 10); O.mesh.position.z += (O.tz - O.mesh.position.z) * Math.min(1, dt * 10); O.mesh.rotation.y = O.tyaw; booksDirty = true; }
    if (booksDirty) updateBooks();
    aimUpdate(); sendPos(dt);
    const t = performance.now() / 1000; for (const c of CANDLES) c.position.y += Math.sin(t * .8 + c.userData.p) * .002;
    for (const k of KEYMESH) k.rotation.y = t * 2;
    if (STONE.mesh.visible) STONE.mesh.rotation.y = t;
    const tm = $('tm'); if (tm) tm.textContent = '⏱ ' + fmtT((ST.done ? ST.done.t : Date.now()) - ST_T0);
    if (Math.floor(t * 4) !== loop._a) { loop._a = Math.floor(t * 4); hudAbil(); }
  }
  renderer.render(scene, cam);
  requestAnimationFrame(loop);
}
requestAnimationFrame(loop);
window.lib = { get LIB() { return LIB; }, get ST() { return ST; }, P, rowStatus: () => { STATUS = null; return rowStatus(); }, NET: () => NET, pickBook, placeBook, drop, useAbility, act };
