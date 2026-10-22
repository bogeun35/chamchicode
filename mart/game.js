// ════════════ 마트 대소동 — 멀티 마트 정리 (규칙: Supermarket Chaos 게임 데이터·코드 기준) ════════════
// 매장 배치·칸 정원 = 원작 맵 데이터(꿈 속 편의점 · 슈퍼마켓) · 칸 하나엔 한 상품만, 원작 배치만큼 정원 · 구역이 맞으면 알바비(상품당 1번)
// 상품은 Rapier 물리로 쏟아지고 쌓이고 굴러감
// 가격표: 흰색 = 맞는 구역·개수 부족 / 노랑 = 칸 완성(별 +1) / 빨강 = 틀린 구역 · 별은 ATM 에서 스티커로 · 알바비로 스킬
// 모든 상품이 맞는 구역에 들어가면 출입문으로 가서 퇴근
import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';
const $ = id => document.getElementById(id);
const esc = s => String(s == null ? '' : s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const clamp = (v, a, b) => v < a ? a : v > b ? b : v;
function toast(m, ms) { const t = $('toast'); t.textContent = m; t.classList.add('on'); clearTimeout(toast._t); toast._t = setTimeout(() => t.classList.remove('on'), ms || 2400); }
function notice(m, ms) { const t = $('notice'); t.innerHTML = m; t.classList.add('on'); clearTimeout(notice._t); notice._t = setTimeout(() => t.classList.remove('on'), ms || 3000); }
function reward(m) { const t = $('reward'); t.innerHTML = m; t.classList.remove('on'); void t.offsetWidth; t.classList.add('on'); clearTimeout(reward._t); reward._t = setTimeout(() => t.classList.remove('on'), 900); }
function rng(seed) { let s = seed >>> 0 || 1; const f = () => { s = (s + 0x6D2B79F5) >>> 0; let t = s; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; f.i = (a, b) => a + Math.floor(f() * (b - a + 1)); return f; }
const shuffle = (a, R) => { for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(R() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; };
const won = n => Math.round(n).toLocaleString('ko-KR') + '원';
const PCOL = ['#ff8a5a', '#5ab4ff', '#8ee08a', '#ffd36b', '#d88aff', '#5ae0d0', '#ff7ab8', '#c8c8c8'];

// ════════════ 사운드 (짧은 합성음, 파티 사운드 볼륨 설정을 따름) ════════════
let AC = null;
function sfx(k) {
  const vol = window.Sound ? Sound.sfxVolume : .6; if (!(vol > 0)) return;
  try { AC = AC || new AudioContext(); if (AC.state === 'suspended') AC.resume(); } catch (e) { return; }
  const t = AC.currentTime, tone = (f0, f1, d, type, v, dl = 0) => { const o = AC.createOscillator(), g = AC.createGain(); o.type = type; o.frequency.setValueAtTime(f0, t + dl); o.frequency.exponentialRampToValueAtTime(f1, t + dl + d); g.gain.setValueAtTime(v * vol, t + dl); g.gain.exponentialRampToValueAtTime(.0001, t + dl + d); o.connect(g); g.connect(AC.destination); o.start(t + dl); o.stop(t + dl + d + .02); };
  if (k === 'pick') tone(520, 760, .05, 'triangle', .12);
  else if (k === 'place') tone(340, 240, .07, 'triangle', .15);
  else if (k === 'good') { tone(990, 990, .08, 'sine', .09); tone(1480, 1480, .12, 'sine', .07, .05); }
  else if (k === 'bad') tone(260, 180, .12, 'square', .05);
  else if (k === 'star') [784, 988, 1175, 1568].forEach((f, i) => tone(f, f, .18, 'triangle', .12, i * .07));
  else if (k === 'no') tone(200, 150, .12, 'square', .06);
  else if (k === 'skill') tone(400, 1500, .3, 'sine', .1);
  else if (k === 'throw') tone(700, 260, .18, 'sine', .08);
  else if (k === 'drop') tone(180, 120, .1, 'triangle', .14);
  else if (k === 'kick') { tone(150, 80, .08, 'triangle', .14); tone(420, 300, .05, 'square', .03, .02); }
  else if (k === 'atm') [600, 640, 600, 640].forEach((f, i) => tone(f, f, .07, 'square', .04, i * .12));
  else if (k === 'win') [523, 659, 784, 1047, 1319].forEach((f, i) => tone(f, f, .25, 'triangle', .12, i * .09));
  else if (k === 'fail') tone(300, 90, .45, 'sawtooth', .06);
  else if (k === 'ping') { tone(1200, 1200, .08, 'sine', .1); tone(1600, 1600, .1, 'sine', .08, .08); }
}

// ════════════ 매장 배치 = 원작 맵 데이터 (mart/map_*.js: 선반·칸 위치, 칸 안 상품 자리, 상품 크기) ════════════
// 칸 좌표계: 원점 = 원작 칸 위치, x = 옆, y = 위, z = 선반 앞쪽 (선반 yaw 만큼 회전) · 상품 자리도 이 좌표계로 저장돼 있어 어느 칸에든 옮겨 놓을 수 있음
const MAPS = { konbini: { title: '꿈 속 편의점', file: 'mart/map_konbini.js' }, super: { title: '슈퍼마켓', file: 'mart/map_super.js' } };
function loadMap(key) { return new Promise((ok, no) => { if (window.MART_MAPS && window.MART_MAPS[key]) return ok(window.MART_MAPS[key]); const s = document.createElement('script'); s.src = MAPS[key].file + '?v=2'; s.onload = () => ok(window.MART_MAPS[key]); s.onerror = no; document.head.appendChild(s); }); }
const CEIL = 3.4;
const ATM_DEF = [{ n: '평범한 ATM', c: '#d83a3a', cost: 20, ch: 51 }, { n: '고급 ATM', c: '#3a6ad8', cost: 40, ch: 95 }, { n: '한방 ATM', c: '#2a9a4a', cost: 4, ch: 10 }];   // 원작 ATM 3대의 별 개수·성공 확률
const BRANDCOL = ['#c8401a', '#2a6ad8', '#2a8a4a', '#8a3ab8', '#d82a6a', '#1a4a8a', '#e8902a', '#2aa8a0', '#5a3a1a', '#1a1a1a', '#c82a2a', '#3a7a1a'];
const hashS = s => { let h = 7; for (const c of s) h = (h * 31 + c.charCodeAt(0)) >>> 0; return h; };
const sfw = (sl, lx, ly, lz) => { const c = Math.cos(sl.yaw), s = Math.sin(sl.yaw); return [sl.o[0] + lx * c + lz * s, sl.o[1] + ly, sl.o[2] - lx * s + lz * c]; };
function lbox(sl, x0, y0, z0, x1, y1, z1) { const lo = [1e9, 1e9, 1e9], hi = [-1e9, -1e9, -1e9]; for (const x of [x0, x1]) for (const y of [y0, y1]) for (const z of [z0, z1]) { const p = sfw(sl, x, y, z); for (let i = 0; i < 3; i++) { lo[i] = Math.min(lo[i], p[i]); hi[i] = Math.max(hi[i], p[i]); } } return [lo[0], lo[1], lo[2], hi[0], hi[1], hi[2]]; }
const slotBox = sl => { const g = sl.g; return lbox(sl, -g.hw, g.by, g.z0 - .05, g.hw, g.by + g.h, g.z1 + .035); };
function buildMart(key, seed) {
  const M = window.MART_MAPS[key], R = rng(seed);
  // 원작은 입구가 +z 쪽 → 180° 돌려 입구를 -z(앞)로
  const slots = M.slots.map((s, i) => ({ s: i, sh: s.sh, o: [-s.o[0], s.o[1], -s.o[2]], yaw: M.shelves[s.sh].yaw + Math.PI, g: s.g, sec: M.shelves[s.sh].sec, type: M.shelves[s.sh].type }));
  const secs = {}; for (const k in M.secs) { const [n, col, ic] = M.secs[k]; secs[k] = { k, n, col, ic, st: hashS(k) % 5 }; }
  const prods = M.prods.map((p, i) => {
    const r2 = rng(hashS(p.n) ^ seed), produce = String(p.ic).startsWith('#'), S = secs[p.sec] || { col: '#888888' };
    const pc = new THREE.Color(produce ? p.ic : S.col); if (!produce) { const mode = hashS(p.b || p.n) % 4; if (mode === 0) pc.lerp(new THREE.Color('#ffffff'), .72); else if (mode === 1) pc.lerp(new THREE.Color('#ffffff'), .35); else if (mode === 3) pc.offsetHSL(0, 0, -.12); pc.offsetHSL((r2() - .5) * .04, 0, (r2() - .5) * .06); }
    const v = p.d[0] * p.d[1] * p.d[2], price = Math.round((800 + Math.sqrt(v) * 60000) * (.85 + r2() * .45) / 10) * 10;
    return { i, sec: p.sec, name: p.n, short: p.s, brand: p.b, sh: p.sh, w: Math.max(.012, p.d[0]), h: Math.max(.012, p.d[1]), d: Math.max(.012, p.d[2]), ic: produce ? '' : p.ic, produce, price, pack: '#' + pc.getHexString(), acc: produce ? '#ffffff' : BRANDCOL[hashS(p.b || 'x') % BRANDCOL.length], lay: p.lay, cap: p.lay.length, promo: r2() < .18 ? (r2() < .5 ? '1+1' : '2+1') : '' };
  });
  const items = M.items.map((p, id) => ({ id, p }));
  const boxes = slots.map(slotBox), lo = [1e9, 1e9], hi = [-1e9, -1e9];
  for (const b of boxes) { lo[0] = Math.min(lo[0], b[0]); lo[1] = Math.min(lo[1], b[2]); hi[0] = Math.max(hi[0], b[3]); hi[1] = Math.max(hi[1], b[5]); }
  const store = { X0: lo[0] - 2.4, X1: hi[0] + 2.4, Z0: lo[1] - 4.6, Z1: hi[1] + 2.6 };
  const counter = { x0: store.X1 - 2.2, x1: store.X1 - 1.5, z0: store.Z0 + .9, z1: store.Z0 + 3.4 };   // 편의점 계산대 (문 오른쪽)
  const W = store.X1 - store.X0, bar = { x0: store.X0 + 2.6, x1: -1.5 }, chest = { x: store.X0 + 2.2, z: store.Z0 + 3.0 };
  const atms = ATM_DEF.map((A, i) => Object.assign({}, A, { i, x: store.X0 + .3, z: store.Z0 + 1.2 + i * .95 }));
  return { key, title: M.title, seed, slots, shelves: M.shelves, secs, prods, items, store, zFront: lo[1], counter, bar: W > 9 ? bar : null, chest, checkouts: [], atms, gold: 100, door: { x: 0, z: store.Z0 } };
}
function slotItemPos(sl, P, k) {   // 칸 안 k번째 자리 = 원작 배치 그대로
  const L = P.lay[Math.min(k, P.lay.length - 1)], p = sfw(sl, L[0], L[1], L[2]);
  return { p, q: new THREE.Quaternion(0, Math.sin(sl.yaw / 2), 0, Math.cos(sl.yaw / 2)).multiply(new THREE.Quaternion(L[3], L[4], L[5], L[6])) };
}

// ════════════ 스킬 · 스티커 (원작 수치: 가격·레벨·쿨타임·지속시간, 이름·설명은 새로 씀) ════════════
// 가격 = 기본 + 추가 × 지금 레벨 (천 원 단위) · 액티브는 멀티면 쿨타임 +mp초
const SK = [
  { id: 's1', n: '빠른 걸음', ic: '👟', col: 0, max: 3, bp: 2, pp: 3, need: null, d: l => `걷는 속도 ${(4 + .45 * l).toFixed(2)} m/s` },
  { id: 's2', n: '먼거리 집기', ic: '🦾', col: 1, max: 5, bp: 2, pp: 3, need: null, d: l => `손이 닿는 거리 ${(2.5 + .5 * l).toFixed(1)} m` },
  { id: 's3', n: '넉넉한 품', ic: '🎒', col: 2, max: 10, bp: 2, pp: 2, need: null, d: l => `한 번에 ${5 + l}개까지 들기` },
  { id: 's12', n: '달리기', ic: '🏃', col: 0, max: 1, bp: 20, pp: 0, need: 's1', d: () => 'Shift 를 누르면 달려요' },
  { id: 's10', n: '선반 확인', ic: '🧭', col: 0, max: 5, bp: 3, pp: 5, need: 's1', key: 1, cd: [60, -10, 30], dur: [20, 5], d: () => '들고 있는 상품이 들어갈 가장 가까운 칸을 벽 너머로도 보여 줘요' },
  { id: 's100', n: '선반 확인+', ic: '⚡', col: 0, max: 1, bp: 15, pp: 0, need: 's10', d: () => '선반 확인 중에 같은 상품 칸을 바라보면 저절로 진열해요' },
  { id: 's11', n: '같은 상품 찾기', ic: '🔍', col: 0, max: 5, bp: 3, pp: 5, need: 's1', key: 2, cd: [60, -10, 30], dur: [20, 5], d: () => '바닥에 떨어진 같은 상품을 반짝이게 해요' },
  { id: 's110', n: '같은 상품 찾기+', ic: '🧲', col: 0, max: 1, bp: 15, pp: 0, need: 's11', d: () => '같은 상품 찾기 중에 반짝이는 상품을 바라보면 저절로 집어요' },
  { id: 's21', n: '덩크슛', ic: '🏀', col: 1, max: 5, bp: 5, pp: 5, need: 's2', key: 3, cd: [90, -15, 45], dur: [20, 7], d: () => '던진 상품이 맞는 구역 칸에 닿으면 저절로 진열돼요' },
  { id: 's22', n: '스트레칭', ic: '🤸', col: 1, max: 1, bp: 5, pp: 0, need: 's2', d: () => 'Space 점프 · Ctrl 앉기' },
  { id: 's30', n: '추가 상품 요청', ic: '📦', col: 2, max: 5, bp: 5, pp: 5, need: 's3', key: 4, cd: [100, -15, 50], dur: null, d: () => '손에 든 상품과 같은 상품을 바닥에서 한가득 끌어와요' },
  { id: 's31', n: '투척 강화', ic: '💪', col: 2, max: 5, bp: 2, pp: 3, need: 's3', d: l => `던지는 힘 ${5 + l}` }];
const SKI = {}; SK.forEach(s => { SKI[s.id] = s; });
const STK = [   // 원작 스티커 9종의 효과·수치
  { id: 'k1', n: '노릇 토스트', ic: '🍞', e: 'cd', v: 20, d: '액티브 스킬 쿨타임 20% 감소' },
  { id: 'k2', n: '든든 주먹밥', ic: '🍙', e: 'cd', v: 30, d: '액티브 스킬 쿨타임 30% 감소' },
  { id: 'k3', n: '작은 분수', ic: '⛲', e: 'dur', v: 20, d: '스킬 지속 시간 20% 증가' },
  { id: 'k4', n: '파란 통조림', ic: '🥫', e: 'dur', v: 30, d: '스킬 지속 시간 30% 증가' },
  { id: 'k5', n: '반짝 조개', ic: '🐚', e: 'gold', v: 15, d: '받는 즉시 알바비 15,000원' },
  { id: 'k6', n: '행운 버섯', ic: '🍄', e: 'reset', v: 25, d: '스킬을 쓰면 25% 확률로 쿨타임 즉시 초기화' },
  { id: 'k7', n: '치즈 피자', ic: '🍕', e: 'mul', v: 5, x: 2, d: '알바비를 받을 때 5% 확률로 2배' },
  { id: 'k8', n: '금빛 버섯', ic: '🌟', e: 'gold', v: 10, d: '받는 즉시 알바비 10,000원' },
  { id: 'k9', n: '빨간 반창고', ic: '🩹', e: 'mul', v: 1, x: 10, d: '알바비를 받을 때 1% 확률로 10배' }];

// ════════════ 상태 · 네트워크 (Firebase games/mt_코드, 혼자 하기는 같은 모양의 메모리 저장소) ════════════
let LIB = null, me = null, NET = null;
const IT = {}, SL = {};   // 상품 상태: 없음 = 처음 자리 · 'f,x,y,z,yaw,lie' 바닥 · 'h,플레이어' 손 · 's,칸' 진열 (끝에 ',g' = 알바비 받음)
const ST = { players: {}, m: {}, pos: {}, ping: {}, stat: {} };
const FB_OK = typeof firebase !== 'undefined';
let db = null; if (FB_OK) { firebase.initializeApp({ apiKey: "AIzaSyD8_pSiOVOWmCitHl_nWcgSZobMFI5NgXM", authDomain: "rolling2-17a8f.firebaseapp.com", databaseURL: "https://rolling2-17a8f-default-rtdb.asia-southeast1.firebasedatabase.app", projectId: "rolling2-17a8f", storageBucket: "rolling2-17a8f.firebasestorage.app", messagingSenderId: "936512265515", appId: "1:936512265515:web:c9cb05f341267af81a796e" }); db = firebase.database(); }
const genCode = () => { const c = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; let r = ''; for (let i = 0; i < 6; i++) r += c[Math.floor(Math.random() * c.length)]; return r; };
const keyOf = n => n.replace(/[.#$\[\]\/]/g, '_') + '_' + Math.random().toString(36).slice(2, 6);
// 공통: tx(path, fn) · set · update · onVal(path, cb) · onChild(path, {add,chg,rem})
function localNet() {
  const data = {}, L = [];
  const get = p => p ? p.split('/').reduce((o, k) => o == null ? undefined : o[k], data) : data;
  const put = (p, v) => { const ks = p.split('/'), last = ks.pop(); let o = data; for (const k of ks) o = o[k] = (o[k] && typeof o[k] === 'object') ? o[k] : {}; if (v == null) delete o[last]; else o[last] = v; };
  const emit = p => {
    for (const l of L) {
      if (l.t === 'v') { if (l.p === p || p.startsWith(l.p + '/') || l.p.startsWith(p + '/')) l.cb(get(l.p)); continue; }
      const sync = key => { const nv = get(l.p + '/' + key), had = l.known.has(key); if (nv == null) { if (had) { l.known.delete(key); l.h.rem(key); } } else if (had) l.h.chg(key, nv); else { l.known.add(key); l.h.add(key, nv); } };
      if (p.startsWith(l.p + '/')) sync(p.slice(l.p.length + 1).split('/')[0]);
      else if (l.p === p || l.p.startsWith(p + '/')) { const o = get(l.p) || {}; for (const k of [...l.known]) if (o[k] == null) sync(k); for (const k in o) sync(k); }
    }
  };
  return { solo: true, data,
    tx: (p, fn) => { const cur = get(p), r = fn(cur == null ? null : (typeof cur === 'object' ? JSON.parse(JSON.stringify(cur)) : cur)); if (r === undefined) return Promise.resolve(false); put(p, r); emit(p); return Promise.resolve(true); },
    set: (p, v) => { put(p, v); emit(p); return Promise.resolve(); }, update: (p, o) => { for (const k in o) { put(p + '/' + k, o[k]); emit(p + '/' + k); } return Promise.resolve(); },
    onVal: (p, cb) => { L.push({ t: 'v', p, cb }); cb(get(p)); }, onChild: (p, h) => { const l = { t: 'c', p, h, known: new Set() }; L.push(l); const o = get(p) || {}; for (const k in o) { l.known.add(k); h.add(k, o[k]); } }, offAll() {} };
}
function fbNet(code) {
  const base = 'games/mt_' + code, ref = p => db.ref(base + (p ? '/' + p : '')), subs = [];
  return { code, ref, tx: (p, fn) => ref(p).transaction(cur => { const r = fn(cur); return r === undefined ? undefined : r; }, null, false).then(r => r.committed).catch(() => false),
    set: (p, v) => ref(p).set(v), update: (p, o) => ref(p).update(o),
    on: f => { const h = ref('').on('value', s => f(s.val() || {})); subs.push(['', 'value', h]); }, off: () => { ref('').off('value'); },
    onVal: (p, cb) => { const h = ref(p).on('value', s => cb(s.val())); subs.push([p, 'value', h]); },
    onChild: (p, h) => { const r = ref(p); r.on('child_added', s => h.add(s.key, s.val())); r.on('child_changed', s => h.chg(s.key, s.val())); r.on('child_removed', s => h.rem(s.key)); },
    offAll: () => { for (const [p, e, h] of subs) ref(p).off(e, h); ref('it').off(); ref('sl').off(); } };
}

// ════════════ 첫 화면 · 대기실 ════════════
let mapKey = 'konbini', room = null, code = null, isHost = false, easy = false;
const OPT = { easy: false };
$('easySeg').onclick = e => { const b = e.target.closest('button'); if (!b) return; easy = b.dataset.v === '1'; [...$('easySeg').children].forEach(x => x.classList.toggle('on', x === b)); };
$('nick').value = localStorage.getItem('mt_nick') || '';
$('sizeSeg').onclick = e => { const b = e.target.closest('button'); if (!b) return; mapKey = b.dataset.v; [...$('sizeSeg').children].forEach(x => x.classList.toggle('on', x === b)); };
const getNick = () => { let n = $('nick').value.trim(); if (n.length < 2) n = '알바' + Math.floor(Math.random() * 900 + 100); localStorage.setItem('mt_nick', n); return n; };
$('btnSolo').onclick = () => { const n = getNick(); me = { k: 'me', nick: n, col: PCOL[0] }; NET = localNet(); isHost = true; ST.players = { me: { nick: n, col: 0 } }; startGame({ seed: (Math.random() * 1e9) | 0, map: mapKey, t0: Date.now(), easy, prep: true }); };
$('btnCreate').onclick = async () => {
  if (!db) return toast('온라인 연결이 안 돼요 — 혼자 하기로 해 보세요');
  const n = getNick(); code = genCode(); me = { k: keyOf(n), nick: n }; isHost = true; NET = fbNet(code);
  await NET.ref('').set({ host: me.k, created: Date.now(), expiresAt: Date.now() + 6 * 3600e3, phase: 'lobby', map: mapKey, easy, players: { [me.k]: { nick: n, col: 0, ready: true, at: Date.now() } } });
  enterLobby();
};
$('btnJoin').onclick = async () => {
  if (!db) return toast('온라인 연결이 안 돼요');
  const c = $('joinCode').value.trim().toUpperCase(); if (c.length !== 6) return toast('방 코드 6자리를 넣어 주세요');
  const snap = await db.ref('games/mt_' + c + '/players').once('value'), ps = snap.val(); if (!ps) return toast('그런 방이 없어요');
  const used = Object.values(ps).map(p => p.col); if (Object.keys(ps).length >= 8) return toast('방이 가득 찼어요');
  const n = getNick(); code = c; me = { k: keyOf(n), nick: n }; isHost = false; NET = fbNet(code);
  let col = 0; while (used.includes(col)) col++;
  await NET.ref('players/' + me.k).set({ nick: n, col, ready: false, at: Date.now() });
  enterLobby();
};
const qs = new URLSearchParams(location.search); if (qs.get('room')) $('joinCode').value = qs.get('room');
function enterLobby() {
  $('home').classList.add('hide'); $('lobby').classList.remove('hide'); $('lbCode').textContent = code;
  NET.ref('players/' + me.k).onDisconnect().remove();
  // 대기실에선 방 전체가 아니라 필요한 값만 듣기 (게임 중인 방이면 상품 상태가 커서)
  let lb = { players: null, host: null, phase: null, map: 'konbini', easy: false, seed: 0, t0: 0 }, starting = 0; const want = ['players', 'host', 'phase', 'map', 'easy', 'seed', 't0'];
  const upd = () => { const r = lb; room = r; if (!r.players) { toast('방이 사라졌어요'); setTimeout(() => location.reload(), 1200); return; } if (!r.players[me.k]) { toast('방에서 나왔어요'); setTimeout(() => location.reload(), 1200); return; }
    isHost = r.host === me.k || !r.players[r.host]; if (isHost && r.host !== me.k) NET.set('host', me.k);
    me.col = PCOL[r.players[me.k].col % 8];
    // 방장이 시작하면 'prep' → 방장이 상품을 쏟아 저장한 뒤 'play' → 모두 입장
    const go = prep => { starting = 1; setTimeout(() => { const q = lb; want.forEach(k => NET.ref(k).off()); ST.players = q.players; startGame({ seed: q.seed, map: q.map || 'konbini', t0: q.t0 || Date.now(), easy: !!q.easy, prep }); }, 120); };
    if (r.phase === 'prep' && r.seed && isHost && !LIB && !starting) return go(true);
    if (r.phase === 'play' && r.seed && !LIB && !starting) return go(false);
    if (r.phase === 'prep' && !LIB) { $('lbStart').disabled = true; $('lbSizeTxt').textContent = '(방장이 매장을 준비하는 중…)'; return; }
    if (!LIB) renderLobby(r); };
  const got = new Set();
  want.forEach(k => NET.ref(k).on('value', s => { lb[k] = s.val(); got.add(k); if (got.size === want.length) upd(); }));
}
function renderLobby(r) {
  const ps = Object.entries(r.players).sort((a, b) => a[1].at - b[1].at);
  $('lbPlayers').innerHTML = ps.map(([k, p]) => `<div class="pl ${p.ready ? 'rdy' : ''}"><i style="background:${PCOL[p.col % 8]}"></i>${esc(p.nick)}${k === r.host ? ' 👑' : ''}<small>${p.ready ? '준비 완료' : '대기 중'}</small></div>`).join('');
  [...$('lbSize').children].forEach(b => { b.classList.toggle('on', b.dataset.v === (r.map || 'konbini')); b.disabled = !isHost; });
  $('lbSizeTxt').textContent = isHost ? '(방장이 고를 수 있어요)' : '';
  [...$('lbEasy').children].forEach(b => { b.classList.toggle('on', (b.dataset.v === '1') === !!r.easy); b.disabled = !isHost; });
  const allReady = ps.every(([k, p]) => p.ready || k === r.host);
  $('lbStart').classList.toggle('hide', !isHost); $('lbStart').disabled = !allReady; $('lbReady').classList.toggle('hide', isHost);
  $('lbReady').textContent = r.players[me.k].ready ? '준비 취소' : '준비';
}
$('lbSize').onclick = e => { const b = e.target.closest('button'); if (b && isHost) NET.set('map', b.dataset.v); };
$('lbEasy').onclick = e => { const b = e.target.closest('button'); if (b && isHost) NET.set('easy', b.dataset.v === '1'); };
$('lbReady').onclick = () => NET.set('players/' + me.k + '/ready', !room.players[me.k].ready);
$('lbStart').onclick = () => { if (!isHost) return; NET.update('', { it: null, sl: null, m: null, mv: null, pos: null, ping: null, stat: null, seed: (Math.random() * 1e9) | 0, t0: 0, phase: 'prep' }); };
$('lbLeave').onclick = () => { NET.ref('players/' + me.k).remove().then(() => location.href = location.pathname); };
$('lbCode').onclick = () => { const u = location.origin + location.pathname + '?room=' + code; navigator.clipboard && navigator.clipboard.writeText(u).then(() => toast('초대 링크를 복사했어요')); };

// ════════════ 3D 장면 ════════════
const lockPtr = () => { try { const r = canvas.requestPointerLock(); if (r && r.catch) r.catch(() => {}); } catch (e) {} };
const canvas = $('view'), renderer = new THREE.WebGLRenderer({ canvas, antialias: true });
renderer.setPixelRatio(Math.min(2, devicePixelRatio)); renderer.outputColorSpace = THREE.SRGBColorSpace;
const scene = new THREE.Scene(); scene.background = new THREE.Color('#dfe8ea'); scene.fog = new THREE.Fog('#dfe8ea', 22, 60);
const cam = new THREE.PerspectiveCamera(72, 1, .04, 120); scene.add(cam);
function resize() { renderer.setSize(innerWidth, innerHeight, false); cam.aspect = innerWidth / innerHeight; cam.updateProjectionMatrix(); }
addEventListener('resize', resize); resize();
function tex(w, h, draw) { const c = document.createElement('canvas'); c.width = w; c.height = h; draw(c.getContext('2d'), w, h); const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; return t; }
const solids = [], OCC = [];   // 몸 충돌 상자 · 조준을 가리는 상자 [x0,y0,z0,x1,y1,z1]
const SB = [], SBL = [];       // 정적 상자 (인스턴스 한 덩어리로 그림): 일반 · 발광
const sbox = (x0, y0, z0, x1, y1, z1, c, o = {}) => { const b = [Math.min(x0, x1), Math.min(y0, y1), Math.min(z0, z1), Math.max(x0, x1), Math.max(y0, y1), Math.max(z0, z1)]; (o.light ? SBL : SB).push({ b, c }); if (o.solid) solids.push(b); if (o.occ) OCC.push(b); if (o.solid || o.occ) PHYS.push(b); return b; };
function flushStatic() {
  const g = new THREE.BoxGeometry(1, 1, 1), m4 = new THREE.Matrix4(), col = new THREE.Color();
  for (const [list, mat] of [[SB, new THREE.MeshStandardMaterial({ roughness: .6, metalness: .05 })], [SBL, new THREE.MeshBasicMaterial()]]) {
    if (!list.length) continue; const im = new THREE.InstancedMesh(g, mat, list.length);
    list.forEach(({ b, c }, i) => { m4.makeScale(b[3] - b[0], b[4] - b[1], b[5] - b[2]); m4.setPosition((b[0] + b[3]) / 2, (b[1] + b[4]) / 2, (b[2] + b[5]) / 2); im.setMatrixAt(i, m4); im.setColorAt(i, col.set(c)); });
    im.frustumCulled = false; scene.add(im);
  }
}
const floorTex = tex(512, 512, (x, w, h) => { const r = rng(9); for (let i = 0; i < 4; i++) for (let j = 0; j < 4; j++) { x.fillStyle = `hsl(195,${6 + r() * 4}%,${86 + r() * 5}%)`; x.fillRect(i * 128, j * 128, 128, 128); for (let k = 0; k < 18; k++) { x.fillStyle = `rgba(120,140,150,${.04 + r() * .05})`; x.fillRect(i * 128 + r() * 120, j * 128 + r() * 120, 2 + r() * 10, 1 + r() * 3); } } x.fillStyle = '#9aa8ae'; for (let i = 0; i <= 4; i++) { x.fillRect(i * 128 - 1, 0, 2, h); x.fillRect(0, i * 128 - 1, w, 2); } });
floorTex.wrapS = floorTex.wrapT = THREE.RepeatWrapping; floorTex.anisotropy = 8;
function signTex(title, sub, col, ic) { return tex(512, 128, (x, w, h) => { x.fillStyle = col; x.fillRect(0, 0, w, h); x.fillStyle = 'rgba(255,255,255,.18)'; x.fillRect(0, 0, w, 10); x.fillStyle = '#fff'; x.beginPath(); x.arc(64, 64, 46, 0, 6.29); x.fill(); x.font = '56px "Segoe UI Emoji","Apple Color Emoji","Noto Color Emoji",sans-serif'; x.textAlign = 'center'; x.textBaseline = 'middle'; x.fillText(ic, 64, 68); x.textAlign = 'left'; x.fillStyle = '#fff'; x.font = '58px Jua, sans-serif'; x.fillText(title, 126, sub ? 50 : 66); if (sub) { x.font = '30px Jua, sans-serif'; x.fillStyle = 'rgba(255,255,255,.85)'; x.fillText(sub, 128, 100); } }); }
const TARGETS = { atm: [], door: null };
function buildStore() {
  const S = LIB.store, W = S.X1 - S.X0, D = S.Z1 - S.Z0, cx = (S.X0 + S.X1) / 2, cz = (S.Z0 + S.Z1) / 2;
  floorTex.repeat.set(W / 2.4, D / 2.4);
  const fl = new THREE.Mesh(new THREE.PlaneGeometry(W, D), new THREE.MeshStandardMaterial({ map: floorTex, roughness: .22, metalness: .08 })); fl.rotation.x = -Math.PI / 2; fl.position.set(cx, 0, cz); scene.add(fl);
  ceilTex.repeat.set(W / .6, D / .6);
  const ce = new THREE.Mesh(new THREE.PlaneGeometry(W, D), new THREE.MeshStandardMaterial({ map: ceilTex, roughness: .9 })); ce.rotation.x = Math.PI / 2; ce.position.set(cx, CEIL, cz); scene.add(ce);
  const wall = '#f6f4ee', band = BRAND;
  // 벽 (앞벽은 유리 진열창 — 몸 충돌·조준만 상자로)
  sbox(S.X0 - .3, 0, S.Z1, S.X1 + .3, CEIL, S.Z1 + .3, wall, { solid: 1, occ: 1 }); sbox(S.X0 - .3, 0, S.Z0, S.X0, CEIL, S.Z1, wall, { solid: 1, occ: 1 }); sbox(S.X1, 0, S.Z0, S.X1 + .3, CEIL, S.Z1, wall, { solid: 1, occ: 1 });
  solids.push([S.X0 - .3, 0, S.Z0 - .3, S.X1 + .3, CEIL, S.Z0]); OCC.push([S.X0 - .3, 0, S.Z0 - .3, -1.3, CEIL, S.Z0], [1.3, 0, S.Z0 - .3, S.X1 + .3, CEIL, S.Z0]);
  for (const [a, b, c, d] of [[S.X0, S.Z1 - .02, S.X1, S.Z1], [S.X0, S.Z0, S.X0 + .02, S.Z1], [S.X1 - .02, S.Z0, S.X1, S.Z1]]) { sbox(a, 2.3, b, c, 2.5, d, band); sbox(a, 0, b, c, .12, d, '#4a5458'); }
  for (const [a, b] of [[S.X0 - .3, -1.35], [1.35, S.X1 + .3]]) {   // 진열창: 아래 턱 + 위 간판 띠 + 창살
    sbox(a, 0, S.Z0 - .3, b, .45, S.Z0, '#d8dcdc'); sbox(a, 2.4, S.Z0 - .3, b, CEIL, S.Z0, '#f6f4ee'); sbox(a, 2.3, S.Z0, b, 2.5, S.Z0 + .02, band);
    for (let x = a + .02; x < b; x += 1.45) sbox(x, .45, S.Z0 - .12, x + .06, 2.4, S.Z0 - .04, '#5a6a70');
    const g = new THREE.Mesh(new THREE.PlaneGeometry(b - a, 1.95), new THREE.MeshStandardMaterial({ color: '#cfe8f4', transparent: true, opacity: .18, roughness: .05, metalness: .3 })); g.position.set((a + b) / 2, 1.425, S.Z0 - .08); scene.add(g);
  }
  const out = new THREE.Mesh(new THREE.PlaneGeometry(W + 16, 6), new THREE.MeshBasicMaterial({ map: nightTex(), fog: false })); out.position.set(cx, 2.2, S.Z0 - 3.2); scene.add(out);   // 바깥: 밤거리
  sbox(S.X0 - 8, -.01, S.Z0 - 3.2, S.X1 + 8, 0, S.Z0 - .3, '#3a4044');
  // 천장 LED 판 (빽빽하게 = 밝은 편의점)
  for (let x = S.X0 + 1.2; x < S.X1 - .6; x += 1.8) for (let z = S.Z0 + 1.2; z < S.Z1 - .6; z += 1.8) sbox(x - .28, CEIL - .02, z - .28, x + .28, CEIL, z + .28, '#ffffff', { light: 1 });
  scene.add(new THREE.HemisphereLight('#ffffff', '#b8c0c0', 1.45));
  const d1 = new THREE.DirectionalLight('#fffaf0', .65); d1.position.set(6, 12, 4); scene.add(d1); const d2 = new THREE.DirectionalLight('#eef6ff', .35); d2.position.set(-8, 10, -6); scene.add(d2);
  // 출입문 (유리 자동문) + 발판 + 간판
  const dz = S.Z0; sbox(-1.35, 0, dz - .12, -1.25, 2.4, dz, '#5a6a70'); sbox(1.25, 0, dz - .12, 1.35, 2.4, dz, '#5a6a70'); sbox(-1.35, 2.3, dz - .12, 1.35, 2.4, dz, '#5a6a70'); sbox(-.03, 0, dz - .1, .03, 2.3, dz - .06, '#5a6a70');
  const glass = new THREE.Mesh(new THREE.PlaneGeometry(2.5, 2.3), new THREE.MeshStandardMaterial({ color: '#bfe6ff', transparent: true, opacity: .3, emissive: '#6ab8e8', emissiveIntensity: .15 })); glass.position.set(0, 1.15, dz - .08); scene.add(glass);
  sbox(-1, 0, dz, 1, .012, dz + 1.3, '#3a4a50');
  TARGETS.door = { b: [-1.3, 0, dz - .2, 1.3, 2.4, dz + .4], glass };
  const ds = new THREE.Mesh(new THREE.PlaneGeometry(2.4, .4), new THREE.MeshBasicMaterial({ map: tex(512, 86, (x, w, h) => { x.fillStyle = BRAND; x.fillRect(0, 0, w, h); x.fillStyle = '#fff'; x.font = '54px Jua, sans-serif'; x.textAlign = 'center'; x.textBaseline = 'middle'; x.fillText('참치마트 24 · 출입문', w / 2, h / 2 + 3); }) })); ds.position.set(0, 2.62, dz + .02); scene.add(ds);
  // 계산대 (편의점식: 문 옆, 포스기 · 카드 단말기 · 담배 진열장 · 커피 머신 · 온장고)
  const K = LIB.counter;
  sbox(K.x0, 0, K.z0, K.x1, .95, K.z1, '#ffffff', { solid: 1, occ: 1 }); sbox(K.x0 - .03, .95, K.z0 - .03, K.x1 + .03, 1.0, K.z1 + .03, '#c8b8a0'); sbox(K.x0 - .005, .1, K.z0, K.x0, .85, K.z1, BRAND);
  sbox(K.x0 + .15, 1.0, K.z0 + .9, K.x0 + .45, 1.06, K.z0 + 1.2, '#2a2e30'); sbox(K.x0 + .35, 1.06, K.z0 + .95, K.x0 + .4, 1.4, K.z0 + 1.15, '#2a2e30'); sbox(K.x0 + .3, 1.18, K.z0 + .92, K.x0 + .34, 1.38, K.z0 + 1.18, '#7ae8d0', { light: 1 });
  sbox(K.x0 + .1, 1.0, K.z0 + 1.5, K.x0 + .25, 1.12, K.z0 + 1.62, '#3a4246'); sbox(K.x0 + .1, 1.06, K.z0 + 1.51, K.x0 + .24, 1.1, K.z0 + 1.6, '#9ae0ff', { light: 1 });
  sbox(K.x0 + .05, 1.0, K.z1 - .55, K.x0 + .5, 1.55, K.z1 - .1, '#2a2e30'); sbox(K.x0 + .04, 1.25, K.z1 - .5, K.x0 + .05, 1.42, K.z1 - .15, '#ff8a3a', { light: 1 });   // 커피 머신
  sbox(K.x0 + .08, 1.0, K.z0 + .1, K.x0 + .55, 1.35, K.z0 + .7, '#d8dcdc'); sbox(K.x0 + .07, 1.04, K.z0 + .14, K.x0 + .08, 1.31, K.z0 + .66, '#ffb060', { light: 1 });   // 온장고
  const cig = new THREE.Mesh(new THREE.PlaneGeometry(K.z1 - K.z0 + .4, 1.3), new THREE.MeshBasicMaterial({ map: cigTex() })); cig.position.set(S.X1 - .31, 1.55, (K.z0 + K.z1) / 2); cig.rotation.y = -Math.PI / 2; scene.add(cig);
  sbox(S.X1 - .3, .85, K.z0 - .2, S.X1, 2.25, K.z1 + .2, '#e8e4dc', { solid: 1 });
  for (const C of LIB.checkouts) { sbox(C.x - .35, 0, C.z - 1.1, C.x + .35, .9, C.z + 1.1, '#ffffff', { solid: 1, occ: 1 }); sbox(C.x - .3, .9, C.z - 1.05, C.x + .3, .93, C.z + .5, '#2a2e30'); sbox(C.x - .2, .93, C.z + .6, C.x + .2, 1.25, C.z + .95, '#3a4246'); sbox(C.x + .3, 0, C.z + .7, C.x + .34, 1.9, C.z + .74, '#c8d0d4'); sbox(C.x + .22, 1.9, C.z + .62, C.x + .42, 2.1, C.z + .82, BRAND, { light: 1 }); }
  // 창가 바 테이블 + 의자 (작은 매장)
  if (LIB.bar) { const B = LIB.bar; sbox(B.x0, .98, S.Z0, B.x1, 1.03, S.Z0 + .42, '#c8a878', { solid: 1, occ: 1 }); for (let x = B.x0 + .1; x < B.x1; x += 1.2) sbox(x, 0, S.Z0, x + .05, .98, S.Z0 + .05, '#5a6a70'); const sm = new THREE.MeshStandardMaterial({ color: '#2a2e30' }), sg2 = new THREE.CylinderGeometry(.17, .17, .05, 16), lg = new THREE.CylinderGeometry(.025, .025, .7, 8); for (let x = B.x0 + .45; x < B.x1 - .2; x += .75) { const a = new THREE.Mesh(sg2, new THREE.MeshStandardMaterial({ color: BRAND })); a.position.set(x, .72, S.Z0 + .75); scene.add(a); const l = new THREE.Mesh(lg, sm); l.position.set(x, .35, S.Z0 + .75); scene.add(l); } }
  // 아이스크림 냉동고 (유리 뚜껑)
  if (LIB.chest) { const c = LIB.chest; sbox(c.x - .6, 0, c.z - .4, c.x + .6, .82, c.z + .4, '#ffffff', { solid: 1, occ: 1 }); sbox(c.x - .55, .82, c.z - .35, c.x + .55, .83, c.z + .35, '#bfe0f0', { light: 1 }); const r = rng(5); for (let i = 0; i < 12; i++) sbox(c.x - .5 + (i % 6) * .17, .7, c.z - .28 + Math.floor(i / 6) * .3, c.x - .37 + (i % 6) * .17, .8, c.z - .04 + Math.floor(i / 6) * .3, ['#ff8aa8', '#8ad0ff', '#ffe06a', '#a8f08a', '#ffffff'][Math.floor(r() * 5)]); }
  // ATM 3대 (왼쪽 벽, 빨강 · 파랑 · 초록)
  for (const A of LIB.atms) { const x0 = S.X0, b = sbox(x0, 0, A.z - .36, x0 + .6, 1.6, A.z + .36, '#d8dcdc', { solid: 1 }); sbox(x0, 1.6, A.z - .36, x0 + .6, 1.85, A.z + .36, A.c); sbox(x0 + .6, 1.05, A.z - .25, x0 + .61, 1.42, A.z + .25, '#1a3a4a', { light: 1 }); sbox(x0 + .6, .85, A.z - .2, x0 + .68, .98, A.z + .2, '#4a5458'); TARGETS.atm.push({ b: [x0, 0, A.z - .36, x0 + .75, 1.85, A.z + .36], i: A.i }); void b;
    const lb = new THREE.Mesh(new THREE.PlaneGeometry(.7, .21), new THREE.MeshBasicMaterial({ map: tex(256, 76, (x, w, h) => { x.fillStyle = A.c; x.fillRect(0, 0, w, h); x.fillStyle = '#fff'; x.font = '32px Jua, sans-serif'; x.textAlign = 'center'; x.textBaseline = 'middle'; x.fillText(`${A.n} ★${A.cost}`, w / 2, h / 2 + 2); }) })); lb.position.set(x0 + .605, 1.73, A.z); lb.rotation.y = Math.PI / 2; scene.add(lb); }
  // 뒤쪽 벽: 유리문 음료 냉장고 (안에 음료가 꽉)
  const fz = S.Z1 - .8, drinkGeo = new THREE.CylinderGeometry(.034, .034, .22, 10), dm = []; const R = rng(11);
  for (let x = S.X0 + .1; x + .78 <= S.X1 - .05; x += .8) {
    sbox(x, 0, fz - .16, x + .78, .25, S.Z1, '#3a4448', { solid: 1, occ: 1 }); sbox(x, 0, fz, x + .78, 2.25, S.Z1, '#3a4448', { solid: 1, occ: 1 }); solids.push([x, 0, fz - .16, x + .78, 2.25, fz]); OCC.push([x, .25, fz - .16, x + .78, 2.0, fz - .13]);
    sbox(x + .03, .25, fz - .01, x + .75, 2.0, fz, '#dcecf6', { light: 1 }); sbox(x, 2.0, fz - .16, x + .78, 2.25, fz, '#ffffff', { light: 1 }); sbox(x, .25, fz - .16, x + .03, 2.0, fz, '#3a4448'); sbox(x + .75, .25, fz - .16, x + .78, 2.0, fz, '#3a4448');
    sbox(x + .37, .25, fz - .16, x + .41, 2.0, fz - .13, '#4a5458'); sbox(x + .32, .95, fz - .2, x + .345, 1.45, fz - .16, '#c8d0d4'); sbox(x + .435, .95, fz - .2, x + .46, 1.45, fz - .16, '#c8d0d4');
    const palette = DRINKC[Math.floor(R() * DRINKC.length)];
    for (let r = 0; r < 5; r++) { sbox(x + .03, .27 + r * .34, fz - .14, x + .75, .29 + r * .34, fz, '#e8eef0'); for (let k = 0; k < 8; k++) for (let dd = 0; dd < 2; dd++) dm.push([x + .07 + k * .09, .29 + r * .34, fz - .07 + dd * .065, palette[(k + r) % palette.length]]); }
  }
  const glassF = new THREE.Mesh(new THREE.PlaneGeometry(W - .2, 1.75), new THREE.MeshStandardMaterial({ color: '#d8f0ff', transparent: true, opacity: .16, roughness: .05, metalness: .4 })); glassF.position.set(cx, 1.125, fz - .155); scene.add(glassF);
  const dmi = new THREE.InstancedMesh(drinkGeo, new THREE.MeshStandardMaterial({ roughness: .35 }), dm.length), capi = new THREE.InstancedMesh(new THREE.CylinderGeometry(.016, .02, .05, 8), new THREE.MeshStandardMaterial({ roughness: .5 }), dm.length), col = new THREE.Color();
  dm.forEach(([x, y, z, c], i) => { M4.makeTranslation(x, y + .11, z); dmi.setMatrixAt(i, M4); dmi.setColorAt(i, col.set(c)); M4.makeTranslation(x, y + .245, z); capi.setMatrixAt(i, M4); capi.setColorAt(i, col.set(i % 3 ? '#ffffff' : '#2a2e30')); }); scene.add(dmi, capi);
  const fs = new THREE.Mesh(new THREE.PlaneGeometry(Math.min(6, W - 1), .24), new THREE.MeshBasicMaterial({ map: tex(768, 48, (x, w, h) => { x.fillStyle = '#1e5a8a'; x.fillRect(0, 0, w, h); x.fillStyle = '#fff'; x.font = '34px Jua, sans-serif'; x.textAlign = 'center'; x.textBaseline = 'middle'; x.fillText('❄ 시원한 음료 · 맥주 · 우유 ❄', w / 2, h / 2 + 2); }) })); fs.position.set(cx, 2.12, fz - .03); scene.add(fs);
  // 진열대: 원작 칸마다 선반 판 · 가격표 레일 · 뒤판 · 옆판 · 받침 (칸 좌표계에서 만들어 세계 좌표 상자로)
  const slat = slatTex(), backs = [];
  const near = (a, b) => { const c = Math.cos(a.yaw), s = Math.sin(a.yaw), dx = b.o[0] - a.o[0], dz = b.o[2] - a.o[2]; return [dx * c - dz * s, b.o[1] - a.o[1], dx * s + dz * c]; };   // b 를 a 의 칸 좌표로
  for (const sl of LIB.slots) {
    const g = sl.g, Sx = LIB.secs[sl.sec] || { col: '#888888' }, frozen = /Frozen/.test(sl.type), mates = LIB.shelves[sl.sh].slots.map(j => LIB.slots[j]).filter(o => o !== sl);
    const rel = mates.map(o => [o, near(sl, o)]);
    const below = rel.some(([o, r]) => Math.abs(r[0]) < g.hw && Math.abs(r[2]) < .7 && r[1] < -.05), above = rel.some(([o, r]) => Math.abs(r[0]) < g.hw && Math.abs(r[2]) < .7 && r[1] > .05);
    const left = rel.some(([o, r]) => Math.abs(r[1]) < .05 && Math.abs(r[2]) < .3 && r[0] < -.05 && r[0] > -2.2 * g.hw), right = rel.some(([o, r]) => Math.abs(r[1]) < .05 && Math.abs(r[2]) < .3 && r[0] > .05 && r[0] < 2.2 * g.hw);
    const z0 = g.z0 - .04, z1 = g.z1 + .02, bot = below ? g.by - .03 : 0, top = g.by + g.h + (above ? 0 : .04), L = (x0, y0, zz0, x1, y1, zz1) => lbox(sl, x0, y0, zz0, x1, y1, zz1);
    const add = (b, c, phys = 1) => { SB.push({ b, c }); OCC.push(b); if (phys) PHYS.push(b); };
    add(L(-g.hw, g.by - .025, z0, g.hw, g.by, z1), frozen ? '#e4f2fa' : '#f6f6f4');   // 판
    add(L(-g.hw, g.by - .06, z1, g.hw, g.by, z1 + .016), shade(Sx.col, .3));          // 가격표 레일 (구역 색)
    backs.push([sl, L(-g.hw, bot, z0 - .03, g.hw, top, z0)]);                           // 뒤판
    if (!left) add(L(-g.hw - .03, bot, z0 - .03, -g.hw, top, z1 + .02), '#eef0f0');
    if (!right) add(L(g.hw, bot, z0 - .03, g.hw + .03, top, z1 + .02), '#eef0f0');
    if (!below) { add(L(-g.hw, 0, z0, g.hw, Math.max(.02, g.by - .03), z1), '#4a5054'); add(L(-g.hw, .02, z1, g.hw, Math.min(.12, Math.max(.03, g.by - .04)), z1 + .012), Sx.col, 0); }
    if (!above) add(L(-g.hw - .03, top - .04, z0 - .03, g.hw + .03, top, z1 + .02), '#dfe4e6');
    if (frozen && !above) SBL.push({ b: L(-g.hw + .02, top - .05, z1 - .02, g.hw - .02, top - .04, z1), c: '#bfe8ff' });
    solids.push(L(-g.hw - .03, 0, z0 - .03, g.hw + .03, top, z1 + .02));
  }
  const slatM = new THREE.MeshStandardMaterial({ map: slat, roughness: .6 });
  for (const [sl, b] of backs) { const m = new THREE.Mesh(new THREE.BoxGeometry(b[3] - b[0], b[4] - b[1], b[5] - b[2]), slatM); m.position.set((b[0] + b[3]) / 2, (b[1] + b[4]) / 2, (b[2] + b[5]) / 2); scene.add(m); OCC.push(b); PHYS.push(b); }
  // 구역 간판: 선반마다 위에 (앞쪽을 보게)
  for (const sh of LIB.shelves) {
    const ss = sh.slots.map(j => LIB.slots[j]); if (!ss.length) continue; const sl0 = ss[0];
    let cx = 0, cz = 0, top = 0; for (const s of ss) { cx += s.o[0]; cz += s.o[2]; top = Math.max(top, s.o[1] + s.g.by + s.g.h); } cx /= ss.length; cz /= ss.length;
    const sg = new THREE.Mesh(new THREE.PlaneGeometry(1.3, .32), new THREE.MeshBasicMaterial({ map: SIGN(sh.sec) })), f = [Math.sin(sl0.yaw), Math.cos(sl0.yaw)];
    sg.position.set(cx + f[0] * (sl0.g.z0 + .02), Math.min(CEIL - .4, top + .32), cz + f[1] * (sl0.g.z0 + .02)); sg.rotation.y = sl0.yaw; scene.add(sg);
  }
  // 행사 현수막
  const ban = tex(768, 120, (x, w, h) => { x.fillStyle = '#ffd84a'; x.fillRect(0, 0, w, h); x.fillStyle = '#e8503a'; x.fillRect(0, 0, w, 14); x.fillRect(0, h - 14, w, 14); x.fillStyle = '#c82a1a'; x.font = '64px Jua, sans-serif'; x.textAlign = 'center'; x.textBaseline = 'middle'; x.fillText('1+1 · 2+1 행사 중!', w / 2, h / 2 + 3); });
  for (const xx of [S.X0 + W * .3, S.X0 + W * .7]) for (const ry of [0, Math.PI]) { const m = new THREE.Mesh(new THREE.PlaneGeometry(2, .32), new THREE.MeshBasicMaterial({ map: ban })); m.position.set(xx, 2.75, S.Z0 + 3.4 + (ry ? -.01 : .01)); m.rotation.y = ry; scene.add(m); }
  flushStatic();
}
const BRAND = '#16a394';   // 참치마트 24 대표 색 (청록)
const DRINKC = [['#e8402a', '#ffffff', '#3a8ad8', '#ffd23a'], ['#2a9a4a', '#a8e05a', '#ffffff', '#1a5aa8'], ['#f0a020', '#ff6a3a', '#ffe08a', '#8a3ab8'], ['#d8d8d8', '#a8d8ff', '#3ac8b8', '#ffffff'], ['#5a3a1a', '#c8a03a', '#2a5a2a', '#e8d8b8']];
const ceilTex = tex(256, 256, (x, w, h) => { x.fillStyle = '#f8f8f6'; x.fillRect(0, 0, w, h); const r = rng(3); for (let i = 0; i < 300; i++) { x.fillStyle = `rgba(150,150,150,${.05 + r() * .06})`; x.fillRect(r() * w, r() * h, 2 + r() * 3, 1); } x.fillStyle = '#c8ccce'; x.fillRect(0, 0, w, 4); x.fillRect(0, 0, 4, h); }); ceilTex.wrapS = ceilTex.wrapT = THREE.RepeatWrapping;
function slatTex() { const t = tex(256, 256, (x, w, h) => { x.fillStyle = '#eef0f0'; x.fillRect(0, 0, w, h); for (let y = 0; y < h; y += 32) { x.fillStyle = '#c8ced0'; x.fillRect(0, y + 28, w, 4); x.fillStyle = '#fafafa'; x.fillRect(0, y, w, 3); } }); t.wrapS = t.wrapT = THREE.RepeatWrapping; t.repeat.set(4, 2); return t; }
function nightTex() { return tex(1024, 384, (x, w, h) => { const g = x.createLinearGradient(0, 0, 0, h); g.addColorStop(0, '#0e1430'); g.addColorStop(.6, '#2a2a5a'); g.addColorStop(1, '#4a3a5a'); x.fillStyle = g; x.fillRect(0, 0, w, h); const r = rng(21); for (let bx = 0; bx < w;) { const bw = 60 + r() * 120, bh = 120 + r() * 200; x.fillStyle = `hsl(235,25%,${10 + r() * 8}%)`; x.fillRect(bx, h - 70 - bh, bw, bh); for (let yy = h - 60 - bh; yy < h - 90; yy += 22) for (let xx = bx + 8; xx < bx + bw - 14; xx += 18) if (r() < .45) { x.fillStyle = r() < .7 ? '#ffd88a' : '#9ad0ff'; x.fillRect(xx, yy, 9, 12); } bx += bw + 6; } x.fillStyle = '#26262e'; x.fillRect(0, h - 70, w, 70); x.fillStyle = '#e8e8a0'; for (let k = 0; k < w; k += 90) x.fillRect(k, h - 38, 46, 5); for (const lx of [180, 560, 900]) { x.fillStyle = '#4a4a52'; x.fillRect(lx, h - 250, 6, 180); const lg = x.createRadialGradient(lx + 3, h - 250, 2, lx + 3, h - 250, 70); lg.addColorStop(0, 'rgba(255,230,160,.9)'); lg.addColorStop(1, 'rgba(255,230,160,0)'); x.fillStyle = lg; x.fillRect(lx - 70, h - 320, 146, 140); } }); }
function cigTex() { return tex(512, 256, (x, w, h) => { x.fillStyle = '#3a3430'; x.fillRect(0, 0, w, h); const r = rng(8), cs = ['#ffffff', '#1a3a8a', '#c82a2a', '#e8c84a', '#2a6a3a', '#d8d8d8', '#6a2a8a', '#1a1a1a']; for (let row = 0; row < 7; row++) for (let k = 0; k < 16; k++) { const c = cs[Math.floor(r() * cs.length)]; x.fillStyle = c; x.fillRect(6 + k * 31.5, 8 + row * 35, 26, 28); x.fillStyle = lum(c) > .5 ? cs[1 + Math.floor(r() * 4)] : '#ffffff'; x.fillRect(6 + k * 31.5, 8 + row * 35 + 18, 26, 4); } x.fillStyle = '#ffffff'; for (let row = 0; row < 7; row++) x.fillRect(0, 36 + row * 35, w, 2); }); }
let popT = null; const POP = () => popT || (popT = tex(256, 160, (x, w, h) => { x.fillStyle = '#ffd84a'; x.beginPath(); x.moveTo(20, 0); x.lineTo(w - 20, 0); x.quadraticCurveTo(w, 0, w, 20); x.lineTo(w, h - 20); x.quadraticCurveTo(w, h, w - 20, h); x.lineTo(20, h); x.quadraticCurveTo(0, h, 0, h - 20); x.lineTo(0, 20); x.quadraticCurveTo(0, 0, 20, 0); x.fill(); x.fillStyle = '#c82a1a'; x.font = '78px Jua, sans-serif'; x.textAlign = 'center'; x.textBaseline = 'middle'; x.fillText('1+1', w / 2, 66); x.font = '34px Jua, sans-serif'; x.fillStyle = '#1e2a30'; x.fillText('행사 상품', w / 2, 126); }));
const SIGNS = {}; const SIGN = k => SIGNS[k] || (SIGNS[k] = signTex((LIB.secs[k] || {}).n || k, '', (LIB.secs[k] || {}).col || '#888888', (LIB.secs[k] || {}).ic || '📦'));

// ════════════ 상품 그리기: 모양별 정교한 단위 형상 + 아틀라스(포장 그림) + 인스턴스 uv ════════════
// 모든 상품을 모양 × 아틀라스 장 단위의 InstancedMesh 몇 개로 그림 (원작 4653개도 가볍게)
const ATL = { S: 2048, C: 128 }; ATL.per = (ATL.S / ATL.C) ** 2;
const TAG = { S: 2048, W: 128, H: 40 }; TAG.cols = TAG.S / TAG.W;
const EMOJI = '"Segoe UI Emoji","Apple Color Emoji","Noto Color Emoji",sans-serif';
function uvPatch(mat) {
  mat.onBeforeCompile = sh => { sh.vertexShader = sh.vertexShader.replace('#include <uv_pars_vertex>', '#include <uv_pars_vertex>\nattribute vec4 aUv;').replace('#include <uv_vertex>', '#include <uv_vertex>\n#ifdef USE_MAP\nvMapUv = aUv.xy + uv * aUv.zw;\n#endif'); };
  mat.customProgramCacheKey = () => 'auv'; return mat;
}
// uv 는 칸 안 좌표: v 0.14~1 = 포장 그림 · 아래 띠 = 뚜껑색(CAP) · 브랜드색(ACC) · 은색(MET)
const LAB = [0, 1, .14, 1], MID = [.3, .7, .14, 1], CAP = [.05, .95, .085, .115], ACC = [.05, .95, .047, .07], MET = [.05, .95, .008, .03];
function remap(g, idxs, u0, u1, v0, v1) { const uv = g.attributes.uv; for (const i of idxs) uv.setXY(i, u0 + uv.getX(i) * (u1 - u0), v0 + uv.getY(i) * (v1 - v0)); }
const allV = g => [...Array(g.attributes.position.count).keys()];
function groupVerts(g, gi) { const out = new Set(), idx = g.index, gr = g.groups[gi]; for (let k = gr.start; k < gr.start + gr.count; k++) out.add(idx ? idx.getX(k) : k); return [...out]; }
function unitize(g) { g.computeBoundingBox(); const b = g.boundingBox, s = new THREE.Vector3().subVectors(b.max, b.min), c = new THREE.Vector3().addVectors(b.max, b.min).multiplyScalar(.5); g.translate(-c.x, -c.y, -c.z); g.scale(1 / s.x, 1 / s.y, 1 / s.z); return g; }
const ni = g => (g.index ? g.toNonIndexed() : g);
function boxFaces(g, front, side, top, bottom) { [[4, front], [5, front], [0, side], [1, side], [2, top], [3, bottom]].forEach(([i, r]) => remap(g, groupVerts(g, i), ...r)); return g; }
function rbox(r, front = LAB, top = CAP) { return boxFaces(new RoundedBoxGeometry(1, 1, 1, 3, r), front, MID, top, CAP); }
function cyl(rt, rb, y0, y1, reg, seg = 20, caps = CAP) { const g = new THREE.CylinderGeometry(rt, rb, y1 - y0, seg); remap(g, groupVerts(g, 0), ...reg); remap(g, [...groupVerts(g, 1), ...groupVerts(g, 2)], ...caps); g.rotateY(Math.PI); g.translate(0, (y0 + y1) / 2, 0); return ni(g); }   // 그림 가운데가 +z(앞)
function lathe(pts, reg, seg = 20) { const g = new THREE.LatheGeometry(pts.map(([r, y]) => new THREE.Vector2(r, y)), seg); remap(g, allV(g), ...reg); g.rotateY(Math.PI); return ni(g); }
const merge = parts => mergeGeometries(parts.map(p => { const q = ni(p); for (const k of Object.keys(q.attributes)) if (!['position', 'normal', 'uv'].includes(k)) q.deleteAttribute(k); return q; }));
const GEO = {};
const geoKey = sh => ({ book: 'book', frame: 'book' }[sh] || sh);
function geoOf(sh) {
  const k = geoKey(sh); if (GEO[k]) return [k, GEO[k]];
  let g;
  if (k === 'box') g = rbox(.07);
  else if (k === 'book') g = rbox(.03);
  else if (k === 'tray') {   // 하얀 트레이 + 위에 비닐 랩(그림)
    const base = boxFaces(new THREE.BoxGeometry(1, .55, 1), CAP, CAP, CAP, CAP); base.translate(0, -.225, 0);
    const film = boxFaces(new RoundedBoxGeometry(.94, .5, .94, 2, .12), LAB, LAB, LAB, CAP); film.translate(0, .25, 0);
    g = merge([base, film]);
  }
  else if (k === 'bag') {   // 과자 봉지: 가운데가 볼록, 위아래는 납작하게 눌린 이음매
    g = boxFaces(new THREE.BoxGeometry(1, 1, 1, 6, 14, 2), LAB, MID, CAP, CAP); const p = g.attributes.position;
    for (let i = 0; i < p.count; i++) { const y = p.getY(i) * 2, a = Math.abs(y), puff = 1 - .8 * Math.pow(a, 4); let z = p.getZ(i) * (.25 + .75 * puff); if (a > .88) z *= .25; p.setZ(i, z); p.setX(i, p.getX(i) * (1 - .06 * Math.pow(a, 6))); }
    g.computeVertexNormals();
  }
  else if (k === 'jug') {   // 세제통: 몸통 + 손잡이 + 뚜껑
    const body = rbox(.12); body.scale(1, .86, 1); body.translate(0, -.07, 0);
    const hd = new THREE.TorusGeometry(.17, .06, 8, 12, Math.PI); remap(hd, allV(hd), ...CAP); hd.rotateY(Math.PI / 2); hd.translate(0, .36, -.18);
    g = merge([body, hd, cyl(.16, .16, .36, .5, ACC, 14, ACC).translate(0, 0, .22)]);
  }
  else if (k === 'carton') {   // 우유팩: 몸통 + 박공 지붕 + 작은 마개
    const body = rbox(.03); body.scale(1, .8, 1); body.translate(0, -.1, 0);
    const top = new THREE.CylinderGeometry(.7071, .7071, 1, 3, 1); remap(top, allV(top), ...CAP); top.rotateZ(Math.PI / 2); top.rotateX(-Math.PI / 2); top.scale(1, .17, .8165); top.translate(0, .36, 0);
    g = merge([body, top, cyl(.1, .1, .4, .5, ACC, 12, ACC).translate(.2, -.06, .2)]);
  }
  else if (k === 'bottle') g = merge([cyl(.5, .5, 0, .6, LAB), lathe([[.5, .6], [.46, .66], [.32, .76], [.2, .84], [.18, .88]], CAP), cyl(.18, .18, .86, .9, CAP, 14), cyl(.22, .22, .9, 1, ACC, 16, ACC)]);
  else if (k === 'can') g = merge([lathe([[0, 0], [.42, 0], [.5, .05]], MET), cyl(.5, .5, .05, .92, LAB, 22, MET), lathe([[.5, .92], [.44, .98], [.44, 1], [0, 1]], MET)]);
  else if (k === 'cup') g = merge([cyl(.48, .37, 0, .92, LAB), cyl(.52, .52, .92, 1, MET, 22, MET)]);
  else if (k === 'tub') g = merge([cyl(.47, .41, 0, .84, LAB), cyl(.52, .5, .84, 1, ACC, 22, ACC)]);
  else if (k === 'jar') g = merge([cyl(.47, .48, 0, .78, LAB), lathe([[.47, .78], [.42, .85]], CAP), cyl(.45, .45, .85, 1, ACC, 20, ACC)]);
  else if (k === 'spray') g = merge([cyl(.5, .5, 0, .74, LAB), lathe([[.5, .74], [.44, .82], [.28, .88], [.2, .9]], CAP), cyl(.2, .2, .9, 1, ACC, 14, ACC)]);
  else if (k === 'tube') g = merge([cyl(.34, .34, 0, .14, ACC, 16, ACC), lathe([[.34, .14], [.5, .2], [.5, .82], [.44, .92], [.42, 1]], LAB)]);
  else if (k === 'vase') g = lathe([[0, 0], [.3, 0], [.42, .1], [.5, .35], [.42, .6], [.22, .82], [.18, .9], [.24, 1], [0, 1]], LAB, 24);
  else if (k === 'tri') { g = new THREE.CylinderGeometry(.5, .5, 1, 3, 1, false, Math.PI); remap(g, groupVerts(g, 0), ...CAP); remap(g, [...groupVerts(g, 1), ...groupVerts(g, 2)], ...LAB); g.rotateX(Math.PI / 2); g = ni(g); }
  else if (k === 'ball') { g = new THREE.SphereGeometry(.5, 20, 14); remap(g, allV(g), ...LAB); g = ni(g); }
  else g = rbox(.07);
  return [k, GEO[k] = unitize(ni(g))];
}
function lum(hex) { const c = new THREE.Color(hex); return .3 * c.r + .59 * c.g + .11 * c.b; }
function shade(hex, f) { const c = new THREE.Color(hex); c.offsetHSL(0, 0, f); return '#' + c.getHexString(); }
function wrapText(x, s, w) { const out = []; let cur = ''; for (const ch of s) { if (x.measureText(cur + ch).width > w && cur) { out.push(cur); cur = ch.trim() ? ch : ''; } else cur += ch; } if (cur) out.push(cur); return out; }
function drawCell(x, ox, oy, P) {   // 포장 그림: 구역마다 같은 색 계열·같은 무늬, 브랜드 띠·그림·이름으로 구별
  const C = ATL.C, D = LIB.secs[P.sec] || { st: 0 }; x.save(); x.beginPath(); x.rect(ox, oy, C, C); x.clip();
  const strip = () => { x.fillStyle = shade(P.pack, -.14); x.fillRect(ox, oy + 110, C, 9); x.fillStyle = P.acc; x.fillRect(ox, oy + 118, C, 5); x.fillStyle = '#c8ccd0'; x.fillRect(ox, oy + 123, C, 5); };
  if (P.produce) {
    if (P.sh === 'tray') { x.fillStyle = '#f2f6f2'; x.fillRect(ox, oy, C, C); x.fillStyle = P.pack; x.globalAlpha = .6; x.fillRect(ox + 6, oy + 16, C - 12, 86); x.globalAlpha = 1; x.font = `52px ${EMOJI}`; x.textAlign = 'center'; x.textBaseline = 'middle'; x.fillText('🍌', ox + C / 2, oy + 56); x.fillStyle = '#2a8a4a'; x.fillRect(ox + 24, oy + 88, 80, 18); x.fillStyle = '#fff'; x.font = '14px Jua, sans-serif'; x.fillText('국산 · 신선', ox + C / 2, oy + 98); }
    else { const g = x.createRadialGradient(ox + C * .38, oy + C * .35, 4, ox + C / 2, oy + C / 2, C * .75); g.addColorStop(0, shade(P.pack, .14)); g.addColorStop(1, shade(P.pack, -.12)); x.fillStyle = g; x.fillRect(ox, oy, C, C); const r = rng(P.i * 7 + 3); x.strokeStyle = shade(P.pack, -.06); x.lineWidth = 2; for (let i = 0; i < 6; i++) { x.beginPath(); const yy = oy + 14 + r() * 92; x.moveTo(ox, yy); x.bezierCurveTo(ox + 40, yy + (r() - .5) * 20, ox + 90, yy + (r() - .5) * 20, ox + C, yy); x.stroke(); } x.fillStyle = '#fffaf0'; x.beginPath(); x.ellipse(ox + C / 2, oy + 60, 18, 12, 0, 0, 6.29); x.fill(); x.fillStyle = '#2a8a4a'; x.font = '12px Jua, sans-serif'; x.textAlign = 'center'; x.textBaseline = 'middle'; x.fillText(P.name.slice(0, 2), ox + C / 2, oy + 61); }
    strip(); x.restore(); return;
  }
  x.fillStyle = P.pack; x.fillRect(ox, oy, C, C);
  const g = x.createLinearGradient(ox, oy, ox + C, oy); g.addColorStop(0, 'rgba(0,0,0,.1)'); g.addColorStop(.35, 'rgba(255,255,255,.12)'); g.addColorStop(1, 'rgba(0,0,0,.12)'); x.fillStyle = g; x.fillRect(ox, oy, C, C);
  x.globalAlpha = .22; x.fillStyle = P.acc; x.strokeStyle = P.acc; x.lineWidth = 6;
  switch (D.st % 5) {   // 구역 무늬 (점 무늬는 안 씀)
    case 0: for (let i = 0; i < 3; i++) { x.beginPath(); for (let k = 0; k <= C; k += 8) x.lineTo(ox + k, oy + 40 + i * 24 + Math.sin(k / 14 + i) * 6); x.stroke(); } break;
    case 1: for (let k = -C; k < C; k += 22) { x.beginPath(); x.moveTo(ox + k, oy + C); x.lineTo(ox + k + C, oy); x.stroke(); } break;
    case 2: for (let i = 0; i < 12; i++) { x.beginPath(); x.moveTo(ox + C / 2, oy + 54); x.arc(ox + C / 2, oy + 54, C, i * .5236, i * .5236 + .26); x.fill(); } break;
    case 3: for (let i = 0; i < 4; i++) x.fillRect(ox, oy + 30 + i * 20, C, 7); break;
    case 4: for (let i = 0; i < 4; i++) { x.beginPath(); x.moveTo(ox, oy + 30 + i * 22); x.lineTo(ox + C / 2, oy + 44 + i * 22); x.lineTo(ox + C, oy + 30 + i * 22); x.stroke(); } break;
  }
  x.globalAlpha = 1;
  const dark = lum(P.pack) > .6, ink = dark ? '#1e2a30' : '#ffffff';
  x.fillStyle = P.acc; x.fillRect(ox, oy, C, 21); x.fillStyle = 'rgba(255,255,255,.25)'; x.fillRect(ox, oy, C, 3); x.fillStyle = lum(P.acc) > .6 ? '#1e2a30' : '#fff'; x.font = '14px Jua, sans-serif'; x.textAlign = 'center'; x.textBaseline = 'middle'; x.fillText(P.brand, ox + C / 2, oy + 11);
  x.fillStyle = dark ? 'rgba(255,255,255,.8)' : 'rgba(0,0,0,.2)'; x.beginPath(); x.ellipse(ox + C / 2, oy + 52, 30, 25, 0, 0, 6.29); x.fill();
  x.font = `38px ${EMOJI}`; x.fillText(P.ic, ox + C / 2, oy + 54);
  if (P.promo) { x.save(); x.translate(ox + C - 18, oy + 36); x.rotate(.4); x.fillStyle = '#ffd84a'; x.fillRect(-20, -8, 40, 16); x.fillStyle = '#c82a1a'; x.font = '12px Jua, sans-serif'; x.fillText(P.promo, 0, 1); x.restore(); }
  x.fillStyle = ink; x.font = '15px Jua, sans-serif'; const ls = wrapText(x, P.short, C - 10).slice(0, 2); ls.forEach((l, i) => x.fillText(l, ox + C / 2, oy + (ls.length > 1 ? 86 : 94) + i * 15));
  strip(); x.restore();
}
function drawTag(x, ox, oy, P) { const W = TAG.W, H = TAG.H; x.fillStyle = '#ffffff'; x.fillRect(ox, oy, W, H); x.fillStyle = (LIB.secs[P.sec] || { col: '#888' }).col; x.fillRect(ox, oy, 6, H); x.fillStyle = '#1e2a30'; x.font = '13px Jua, sans-serif'; x.textAlign = 'left'; x.textBaseline = 'middle'; let n = P.name; while (x.measureText(n).width > W - 14 && n.length > 2) n = n.slice(0, -1); x.fillText(n === P.name ? n : n.slice(0, -1) + '…', ox + 10, oy + 12); x.fillStyle = '#c82a1a'; x.font = '19px Jua, sans-serif'; x.textAlign = 'right'; x.fillText(won(P.price), ox + W - 6, oy + 29); if (P.promo) { x.fillStyle = '#ffd84a'; x.fillRect(ox + 6, oy + 20, 40, 18); x.fillStyle = '#c82a1a'; x.font = '15px Jua, sans-serif'; x.textAlign = 'center'; x.fillText(P.promo, ox + 26, oy + 30); } x.strokeStyle = 'rgba(0,0,0,.25)'; x.lineWidth = 2; x.strokeRect(ox + 1, oy + 1, W - 2, H - 2); }
const IM = {};   // 'geo|page' → { mesh, ids[], uv }
const ITEM_MESH = [];   // 상품 id → [meshKey, index]
let TAGM = null, MATS = [];
function buildItems() {
  const pages = Math.ceil(LIB.prods.length / ATL.per);
  for (let p = 0; p < pages; p++) {
    const t = tex(ATL.S, ATL.S, x => { for (let k = 0; k < ATL.per; k++) { const P = LIB.prods[p * ATL.per + k]; if (!P) break; drawCell(x, (k % (ATL.S / ATL.C)) * ATL.C, Math.floor(k / (ATL.S / ATL.C)) * ATL.C, P); } });
    t.anisotropy = 4; MATS.push(uvPatch(new THREE.MeshStandardMaterial({ map: t, roughness: .45, metalness: 0 })));
  }
  const groups = {};
  for (const it of LIB.items) { const P = LIB.prods[it.p], [gk] = geoOf(P.sh), key = gk + '|' + Math.floor(P.i / ATL.per); (groups[key] = groups[key] || []).push(it.id); }
  for (const key in groups) {
    const [gk, pg] = key.split('|'), ids = groups[key], mesh = new THREE.InstancedMesh(GEO[gk], MATS[+pg], ids.length), uv = new Float32Array(ids.length * 4);
    ids.forEach((id, i) => { const P = LIB.prods[LIB.items[id].p], k = P.i % ATL.per, cx = (k % (ATL.S / ATL.C)) * ATL.C, cy = Math.floor(k / (ATL.S / ATL.C)) * ATL.C; uv.set([(cx + 2) / ATL.S, 1 - (cy + ATL.C - 2) / ATL.S, (ATL.C - 4) / ATL.S, (ATL.C - 4) / ATL.S], i * 4); ITEM_MESH[id] = [key, i]; });
    mesh.geometry = mesh.geometry.clone(); mesh.geometry.setAttribute('aUv', new THREE.InstancedBufferAttribute(uv, 4));
    mesh.frustumCulled = false; scene.add(mesh); IM[key] = { mesh, ids, uv };
  }
  // 가격표: 칸마다 판 하나 (인스턴스 uv = 들어 있는 상품의 가격표 그림, 색 = 상태)
  const tt = tex(TAG.S, TAG.S, x => { LIB.prods.forEach((P, k) => drawTag(x, (k % TAG.cols) * TAG.W, Math.floor(k / TAG.cols) * TAG.H, P)); }); tt.anisotropy = 4;
  const tg = new THREE.PlaneGeometry(.18, .056); tg.setAttribute('aUv', new THREE.InstancedBufferAttribute(new Float32Array(LIB.slots.length * 4), 4));
  TAGM = new THREE.InstancedMesh(tg, uvPatch(new THREE.MeshBasicMaterial({ map: tt })), LIB.slots.length); TAGM.frustumCulled = false; scene.add(TAGM);
  for (const sl of LIB.slots) { TAGM.setMatrixAt(sl.s, HIDE); TAGM.setColorAt(sl.s, new THREE.Color(1, 1, 1)); }
  glowItems = new THREE.InstancedMesh(new THREE.BoxGeometry(1, 1, 1), new THREE.MeshBasicMaterial({ color: '#7af0ff', transparent: true, opacity: .35, depthWrite: false, depthTest: false, blending: THREE.AdditiveBlending }), 400); glowItems.count = 0; glowItems.renderOrder = 998; glowItems.frustumCulled = false; scene.add(glowItems);
  glowSlot = new THREE.Mesh(new THREE.BoxGeometry(1, 1, 1), new THREE.MeshBasicMaterial({ color: '#ffd84a', transparent: true, opacity: .3, depthWrite: false, depthTest: false })); glowSlot.renderOrder = 999; glowSlot.visible = false; scene.add(glowSlot);
}
let glowItems = null, glowSlot = null;
const HIDE = new THREE.Matrix4().makeScale(0, 0, 0), M4 = new THREE.Matrix4(), QQ = new THREE.Quaternion(), EE = new THREE.Euler(0, 0, 0, 'YXZ'), V1 = new THREE.Vector3(), V2 = new THREE.Vector3();
const SOLO_MESH = {};   // 'geo|page|용도' → 인스턴스 1개짜리 메시 (손에 든 상품)
function soloMesh(id, use) {
  const [key, i] = ITEM_MESH[id], src = IM[key], k = key + '|' + use;
  let m = SOLO_MESH[k]; if (!m) { const g = src.mesh.geometry.clone(); g.setAttribute('aUv', new THREE.InstancedBufferAttribute(new Float32Array(4), 4)); m = SOLO_MESH[k] = new THREE.InstancedMesh(g, src.mesh.material, 1); m.frustumCulled = false; (use === 'hand' ? cam : scene).add(m); }
  m.geometry.attributes.aUv.array.set(src.uv.subarray(i * 4, i * 4 + 4)); m.geometry.attributes.aUv.needsUpdate = true; m.visible = true; return m;
}

// ── 상태 읽기: 'f,x,y,z,qx,qy,qz,qw' 바닥(물리로 멈춘 자세, 상품 중심) · 'h,플레이어' 손 · 's,칸' 진열 (끝에 ',g' = 알바비 받음) ──
function st0(v) { if (!v) return null; const a = String(v).split(','), g = a[a.length - 1] === 'g' ? 1 : 0; if (a[0] === 'f') return { w: 'f', x: +a[1], y: +a[2], z: +a[3], qx: +a[4], qy: +a[5], qz: +a[6], qw: +a[7], g }; if (a[0] === 'h') return { w: 'h', u: a[1], g }; return { w: 's', s: +a[1], g }; }
function st(id) { return st0(IT[id]) || { w: 'f', x: LIB.store.X0 + 1 + (id % 30) * .15, y: .1, z: LIB.store.Z0 + 3.4 + Math.floor(id / 30) % 5 * .15, qx: 0, qy: 0, qz: 0, qw: 1, g: 0 }; }
const gS = s => s.g ? ',g' : '';
const fStr = (t, q, g) => `f,${t.x.toFixed(3)},${t.y.toFixed(3)},${t.z.toFixed(3)},${q.x.toFixed(4)},${q.y.toFixed(4)},${q.z.toFixed(4)},${q.w.toFixed(4)}` + (g ? ',g' : '');
const slotIds = s => SL[s] ? String(SL[s]).split(',').map(Number) : [];
const prodOf = id => LIB.prods[LIB.items[id].p];
const dirtyP = new Set(); let tagsDirty = true, gridDirty = true, STATUS = null;
function itemMatrix(id) {
  if (ANIM_HIDE.has(id)) return HIDE;
  const P = prodOf(id); V2.set(P.w, P.h, P.d);
  const A = ACT.get(id); if (A) { const t = A.b.translation(), q = A.b.rotation(); V1.set(t.x, t.y, t.z); QQ.set(q.x, q.y, q.z, q.w); return M4.compose(V1, QQ, V2); }
  if (MV[id]) { const a = MV[id].split(',').map(Number); V1.set(a[0], a[1], a[2]); QQ.set(a[3], a[4], a[5], a[6]); return M4.compose(V1, QQ, V2); }
  const s = st(id);
  if (s.w === 'f') { V1.set(s.x, s.y, s.z); QQ.set(s.qx, s.qy, s.qz, s.qw); return M4.compose(V1, QQ, V2); }
  if (s.w === 's') { const sl = LIB.slots[s.s], ids = slotIds(s.s); let k = ids.indexOf(id); if (k < 0) k = ids.length; const r = slotItemPos(sl, P, k); V1.set(r.p[0], r.p[1], r.p[2]); return M4.compose(V1, r.q, V2); }
  if (s.u === me.k) return HIDE;
  const O = OTHERS[s.u]; if (!O || !O.mesh || (O.hand || [])[0] !== id) return HIDE;
  const ry = O.mesh.rotation.y; EE.set(0, ry, 0); QQ.setFromEuler(EE); V1.set(O.mesh.position.x - Math.sin(ry) * .38, O.mesh.position.y + 1.05, O.mesh.position.z - Math.cos(ry) * .38); return M4.compose(V1, QQ, V2);
}
const touched = new Set();
function setItem(id) { const [key, i] = ITEM_MESH[id]; IM[key].mesh.setMatrixAt(i, itemMatrix(id)); touched.add(key); }
function flushItems() {
  if (dirtyP.size) { for (const it of LIB.items) if (dirtyP.has(it.p)) setItem(it.id); dirtyP.clear(); }
  for (const id of HELD_OTHERS) setItem(id);
  for (const id of ACT.keys()) setItem(id);
  for (const id in MV) setItem(+id);
  for (const key of touched) IM[key].mesh.instanceMatrix.needsUpdate = true; touched.clear();
}
let HELD_OTHERS = new Set();
function markItem(id) { dirtyP.add(LIB.items[id].p); gridDirty = true; STATUS = null; }

// ── 진열 판정 (원작): 칸의 상품 구역 = 선반 구역이면 정답 · 정원이 차면 칸 완성 ──
function status() {
  if (STATUS) return STATUS;
  const slot = [], byProd = {}; let correct = 0, full = 0, wrong = 0, shelved = 0;
  for (const sl of LIB.slots) {
    const ids = slotIds(sl.s); if (!ids.length) { slot.push(null); continue; }
    const P = prodOf(ids[0]), ok = P.sec === sl.sec, isFull = ids.length >= P.cap;
    slot.push({ p: P.i, n: ids.length, ok, full: ok && isFull }); shelved += ids.length; (byProd[P.i] = byProd[P.i] || []).push(sl.s);
    if (ok) { correct += ids.length; if (isFull) full++; } else wrong += ids.length;
  }
  return (STATUS = { slot, byProd, correct, full, wrong, shelved, left: LIB.items.length - correct });
}
function flushTags() {
  if (!tagsDirty) return; tagsDirty = false; const S = status(), uv = TAGM.geometry.attributes.aUv, col = new THREE.Color();
  for (const sl of LIB.slots) {
    const q = S.slot[sl.s]; if (!q) { TAGM.setMatrixAt(sl.s, HIDE); continue; }
    const p = sfw(sl, 0, sl.g.by - .03, sl.g.z1 + .04); EE.set(0, sl.yaw, 0); QQ.setFromEuler(EE); V1.set(p[0], p[1], p[2]); V2.set(1, 1, 1); TAGM.setMatrixAt(sl.s, M4.compose(V1, QQ, V2));
    const cx = (q.p % TAG.cols) * TAG.W, cy = Math.floor(q.p / TAG.cols) * TAG.H; uv.setXYZW(sl.s, cx / TAG.S, 1 - (cy + TAG.H) / TAG.S, TAG.W / TAG.S, TAG.H / TAG.S);
    TAGM.setColorAt(sl.s, !q.ok ? col.setRGB(1, .42, .4) : q.full ? col.setRGB(1, .86, .3) : col.setRGB(1, 1, 1));   // 빨강 · 노랑 · 흰색
  }
  TAGM.instanceMatrix.needsUpdate = true; TAGM.instanceColor.needsUpdate = true; uv.needsUpdate = true;
}
// 바닥 상품 격자 (조준용) · 선반 판 위에 떨어진 상품은 그 칸 목록에도
const GRID = new Map(), LOOSE_IN = new Map(); const gk = (x, z) => Math.floor(x) * 4099 + Math.floor(z);
function rebuildGrid() {
  GRID.clear(); LOOSE_IN.clear();
  for (const it of LIB.items) { const s = st(it.id); if (s.w !== 'f' || ACT.has(it.id) || MV[it.id]) continue; const k = gk(s.x, s.z); let a = GRID.get(k); if (!a) GRID.set(k, a = []); a.push(it.id);
    if (s.y > .14) for (const sl of LIB.slots) { const b = SLOTBOX[sl.s]; if (s.x > b[0] && s.x < b[3] && s.y > b[1] - .02 && s.y < b[4] && s.z > b[2] && s.z < b[5]) { let l = LOOSE_IN.get(sl.s); if (!l) LOOSE_IN.set(sl.s, l = []); l.push(it.id); break; } } }
  gridDirty = false;
}
const RM = new THREE.Matrix4();
function itemBox(id) { const s = st(id), P = prodOf(id); RM.makeRotationFromQuaternion(QQ.set(s.qx, s.qy, s.qz, s.qw)); const e = RM.elements, hx = P.w / 2, hy = P.h / 2, hz = P.d / 2; const ex = Math.abs(e[0]) * hx + Math.abs(e[4]) * hy + Math.abs(e[8]) * hz, ey = Math.abs(e[1]) * hx + Math.abs(e[5]) * hy + Math.abs(e[9]) * hz, ez = Math.abs(e[2]) * hx + Math.abs(e[6]) * hy + Math.abs(e[10]) * hz; return [s.x - ex, s.y - ey, s.z - ez, s.x + ex, s.y + ey, s.z + ez]; }

// ════════════ 플레이어 (1인칭) ════════════
const P = { x: 0, y: 0, z: 0, vy: 0, yaw: Math.PI, pitch: 0, ground: true, hand: [], crouch: 0 };
const KEY = {}; let locked = false;
const PW = .28, PHH = 1.7, EYE = 1.62;
const lv = id => (ST.m.lv && ST.m.lv[id]) | 0;
const reach = () => 2.5 + .5 * lv('s2'), capacity = () => 5 + lv('s3'), throwPow = () => 5 + lv('s31');
function collide(x, y, z) { const hh = PHH * (1 - .45 * P.crouch); for (const s of solids) if (x + PW > s[0] && x - PW < s[3] && z + PW > s[2] && z - PW < s[5] && y + hh > s[1] && y < s[4] - .001) return s; return null; }
const STAT = { p: 0, c: 0, t: 0, j: 0, d: 0, u: 0 };
function moveP(dt) {
  const canStretch = lv('s22') > 0;
  P.crouch = clamp(P.crouch + ((canStretch && (KEY.ControlLeft || KEY.ControlRight)) ? 1 : -1) * dt * 8, 0, 1);
  const run = lv('s12') > 0 && (KEY.ShiftLeft || KEY.ShiftRight) && !P.crouch, sp = (4 + .45 * lv('s1') + (run ? 2.6 : 0)) * (1 - .45 * P.crouch) * dt;
  let fx = 0, fz = 0; if (KEY.KeyW) fz -= 1; if (KEY.KeyS) fz += 1; if (KEY.KeyA) fx -= 1; if (KEY.KeyD) fx += 1;
  const l = Math.hypot(fx, fz) || 1; fx /= l; fz /= l;
  const s = Math.sin(P.yaw), c = Math.cos(P.yaw), dx = (fx * c + fz * s) * sp, dz = (-fx * s + fz * c) * sp, ox = P.x, oz = P.z;
  for (const [ax, d] of [['x', dx], ['z', dz]]) { if (!d) continue; const nx = ax === 'x' ? P.x + d : P.x, nz = ax === 'z' ? P.z + d : P.z; if (!collide(nx, P.y, nz)) { P.x = nx; P.z = nz; } }
  STAT.d += Math.hypot(P.x - ox, P.z - oz); kickItems(P.x - ox, P.z - oz, dt);
  if (canStretch && KEY.Space && P.ground) { P.vy = 5; P.ground = false; STAT.j++; }   // 원작: 점프 속도 5, 중력 ×1.2
  P.vy -= 9.81 * 1.2 * dt; const ny = P.y + P.vy * dt, hit = collide(P.x, ny, P.z);
  if (hit) { if (P.vy < 0) { P.y = hit[4]; P.ground = true; } P.vy = 0; } else { P.y = ny; P.ground = false; }
  if (P.y <= 0) { P.y = 0; P.vy = 0; P.ground = true; }
  const S = LIB.store; P.x = clamp(P.x, S.X0 + .35, S.X1 - .35); P.z = clamp(P.z, S.Z0 + .35, S.Z1 - .35);
  camPose(fx || fz);
}
function camPose(walking) { cam.position.set(P.x, P.y + EYE * (1 - .4 * P.crouch) + (P.ground && walking ? Math.sin(performance.now() / 110) * .02 : 0), P.z); cam.rotation.set(P.pitch, P.yaw, 0, 'YXZ'); }
addEventListener('keydown', e => { if (e.target.tagName === 'INPUT') return; KEY[e.code] = 1; if (['Space', 'Tab'].includes(e.code) && LIB) e.preventDefault(); if (!LIB) return; onKey(e); });
addEventListener('keyup', e => { KEY[e.code] = 0; if (e.code === 'KeyQ' && LIB) qUp(); });
canvas.addEventListener('click', () => { if (LIB && !locked && !overlayOpen()) lockPtr(); });
document.addEventListener('pointerlockchange', () => { locked = document.pointerLockElement === canvas; $('escMenu').classList.toggle('hide', locked || !LIB || overlayOpen()); $('hint').classList.toggle('hide', locked); });
// 마우스 감도 (Esc 메뉴에서 조절, 브라우저에 저장) — 기본은 예전보다 느리게
let SENS = 1; try { SENS = clamp(+localStorage.getItem('mt_sens') || .6, .15, 2); } catch (e) { SENS = .6; }
const sensUI = () => { $('sens').value = SENS; $('sensTxt').textContent = SENS.toFixed(2); }; sensUI();
$('sens').oninput = e => { SENS = +e.target.value; sensUI(); try { localStorage.setItem('mt_sens', SENS); } catch (er) {} };
document.addEventListener('mousemove', e => { if (!locked) return; const k = .0022 * SENS; P.yaw -= e.movementX * k; P.pitch = clamp(P.pitch - e.movementY * k, -1.45, 1.45); });
document.addEventListener('mousedown', e => { if (!locked) return; if (e.button === 0) act(false); if (e.button === 1) { e.preventDefault(); ping(); } if (e.button === 2) act(true); });
document.addEventListener('contextmenu', e => { if (LIB) e.preventDefault(); });
document.addEventListener('wheel', e => { if (locked && P.hand.length > 1) { if (e.deltaY > 0) P.hand.push(P.hand.shift()); else P.hand.unshift(P.hand.pop()); sendHand(); } });
$('btnResume').onclick = () => lockPtr();
$('btnQuit').onclick = () => { if (NET && !NET.solo) { dropAll(); NET.ref('players/' + me.k).remove(); NET.ref('pos/' + me.k).remove(); } location.href = location.pathname; };
$('btnUnstick').onclick = () => unstick();
const overlayOpen = () => ['ovMemo', 'ovMap', 'ovSkill'].some(i => !$(i).classList.contains('hide'));

// ════════════ 조준 (직접 만든 광선 판정: 가림막 · 칸 · 바닥 상품 · ATM · 문 · 동료) ════════════
function rayBox(o, d, b) { let t0 = 0, t1 = 1e9; for (let a = 0; a < 3; a++) { const inv = 1 / (d[a] || 1e-9), ta = (b[a] - o[a]) * inv, tb = (b[a + 3] - o[a]) * inv; t0 = Math.max(t0, Math.min(ta, tb)); t1 = Math.min(t1, Math.max(ta, tb)); if (t1 < t0) return -1; } return t0; }
const SLOTBOX = [];
let AIM = null;
function rayPick(far) {
  const o = [cam.position.x, cam.position.y, cam.position.z]; cam.getWorldDirection(V1); const d = [V1.x, V1.y, V1.z];
  let best = { t: far, kind: null };
  const test = (b, h) => { const t = rayBox(o, d, b); if (t >= 0 && t < best.t) best = Object.assign({ t }, h); };
  for (const b of OCC) test(b, { kind: 'occ' });
  for (const sl of LIB.slots) test(SLOTBOX[sl.s], { kind: 'slot', s: sl.s });
  if (gridDirty) rebuildGrid();
  const steps = Math.ceil(far), seen = new Set();
  for (let k = 0; k <= steps; k++) { const px = o[0] + d[0] * k, pz = o[2] + d[2] * k; for (let i = -1; i <= 1; i++) for (let j = -1; j <= 1; j++) { const key = gk(px + i, pz + j); if (seen.has(key)) continue; seen.add(key); const a = GRID.get(key); if (a) for (const id of a) if (!ACT.has(id) && !MV[id]) test(itemBox(id), { kind: 'item', id }); } }
  for (const A of TARGETS.atm) test(A.b, { kind: 'atm', i: A.i });
  test(TARGETS.door.b, { kind: 'door' });
  for (const k in OTHERS) { const m = OTHERS[k].mesh.position; test([m.x - .3, m.y, m.z - .3, m.x + .3, m.y + 1.9, m.z + .3], { kind: 'player', k }); }
  if (best.kind === 'slot' && LOOSE_IN.has(best.s)) { let bt = 1e9, bid = null; for (const id of LOOSE_IN.get(best.s)) { const t = rayBox(o, d, itemBox(id)); if (t >= 0 && t < bt) { bt = t; bid = id; } } if (bid != null && bt < far) best = { t: bt, kind: 'item', id: bid }; }
  best.point = [o[0] + d[0] * best.t, o[1] + d[1] * best.t, o[2] + d[2] * best.t];
  return best;
}
function aimUpdate() {
  const h = rayPick(reach()); AIM = h.kind && h.kind !== 'occ' ? h : null;
  let html = '';
  if (AIM && AIM.kind === 'item') { const Pp = prodOf(AIM.id), D = LIB.secs[Pp.sec]; html = `${esc(Pp.name)} <b style="color:var(--gold)">${won(Pp.price)}</b><small>${OPT.easy ? `${D.ic} ${D.n} 구역 상품 (M 지도에서 위치 확인)` : '어느 구역 상품일까요?'}</small>`; }
  else if (AIM && AIM.kind === 'slot') {
    const sl = LIB.slots[AIM.s], D = LIB.secs[sl.sec], q = status().slot[AIM.s];
    let sub = `${D.ic} ${D.n} 선반 · 빈 칸`;
    if (q) { const Pp = LIB.prods[q.p]; sub = `${esc(Pp.name)} ${q.n}/${Pp.cap} · ${!q.ok ? '<span class="bad">틀린 구역이에요</span>' : q.full ? '<span class="good">완성!</span>' : '<span class="ok">개수가 모자라요</span>'}`; }
    const top = P.hand.length ? prodOf(handPick(AIM.s) ?? P.hand[0]) : null, acc = top && accepts(AIM.s, top.i);
    html = `${D.ic} ${D.n}<small>${sub}${P.hand.length ? (acc ? ' · E/오른쪽 클릭 진열' : ' · <span class="bad">다른 상품이 들어 있어요</span>') : q ? ' · E 로 꺼내기' : ''}</small>`;
  }
  else if (AIM && AIM.kind === 'atm') { const A = LIB.atms[AIM.i]; html = `<span style="color:${A.c}">${A.n}</span> <small>별 ${A.cost}개 넣기 (E) · 성공 ${A.ch}% / 꽝 ${100 - A.ch}% · 가진 별 ★${(ST.m.stars | 0)}</small>`; }
  else if (AIM && AIM.kind === 'door') html = cleared() ? '🚪 출입문 <small><span class="good">E 로 퇴근하기!</span></small>' : `🚪 출입문 <small>아직 퇴근할 수 없어요 — 남은 물건 ${status().left}개</small>`;
  else if (AIM && AIM.kind === 'player') html = `${esc((ST.players[AIM.k] || {}).nick || '')} <small>${P.hand.length ? 'E 로 손에 든 상품 건네기' : '동료 알바생'}</small>`;
  $('aim').innerHTML = html; $('cross').classList.toggle('hot', !!AIM);
  updateGhost();
}
function accepts(s, pi) { const ids = slotIds(s); if (!ids.length) return true; return LIB.items[ids[0]].p === pi && ids.length < LIB.prods[pi].cap; }
function handPick(s) { const ids = slotIds(s); if (!ids.length) return P.hand.length ? P.hand[0] : null; const pi = LIB.items[ids[0]].p; return P.hand.find(id => LIB.items[id].p === pi) ?? null; }   // 칸에 든 상품과 같은 걸 손에서 골라 넣음
const ghost = new THREE.Mesh(new THREE.BoxGeometry(1, 1, 1), new THREE.MeshBasicMaterial({ color: '#6ae46a', transparent: true, opacity: .4, depthWrite: false })); ghost.visible = false; scene.add(ghost);
function updateGhost() {
  if (AIM && AIM.kind === 'slot' && P.hand.length) {
    const id = handPick(AIM.s) ?? P.hand[0], Pp = prodOf(id), ok = accepts(AIM.s, Pp.i), sl = LIB.slots[AIM.s], n = Math.min(slotIds(AIM.s).length, Pp.cap - 1), r = slotItemPos(sl, Pp, n);
    ghost.position.set(r.p[0], r.p[1], r.p[2]); ghost.scale.set(Pp.w, Pp.h, Pp.d); ghost.quaternion.copy(r.q); ghost.material.color.set(ok ? '#6ae46a' : '#e84a3a'); ghost.visible = true;
  } else ghost.visible = false;
}

// ════════════ 집기 · 꺼내기 · 진열 · 던지기 ════════════
const PENDING = new Set();
let actT = 0;
async function act(right) {
  if (!AIM) { if (!right && P.hand.length) throwTop(); return; }
  if (AIM.kind === 'item') { if (!right) return pickItem(AIM.id); return; }
  if (AIM.kind === 'slot') { if (P.hand.length) { const id = handPick(AIM.s); if (id != null && accepts(AIM.s, LIB.items[id].p)) return placeItem(id, AIM.s); if (right) { sfx('no'); return notice('이 칸에는 다른 상품이 들어 있어요'); } } if (!right) return takeFromSlot(AIM.s); return; }
  if (right) return;
  if (AIM.kind === 'atm') return useAtm(AIM.i);
  if (AIM.kind === 'door') return leave();
  if (AIM.kind === 'player') return giveItem(AIM.k);
}
function full() { if (P.hand.length >= capacity()) { sfx('no'); notice(`더 들 수 없어요 (최대 ${capacity()}개) — 진열하거나 Q 로 던지세요`); return true; } return false; }
async function pickItem(id) {
  if (full() || PENDING.has(id)) return; const prev = IT[id] || null, s = st(id); if (s.w !== 'f') return; PENDING.add(id);
  const from = poseOfMatrix(itemMatrix(id).clone());
  const ok = await NET.tx('it/' + id, cur => (cur || null) !== prev ? undefined : 'h,' + me.k + gS(s));
  PENDING.delete(id); if (!ok) { sfx('no'); return false; }
  if (!P.hand.includes(id)) P.hand.unshift(id); flyAnim(id, from, () => handWorld(prodOf(id)), .28); sendHand(); sfx('pick');
  if (PWD) wakeAround(s.x, s.y, s.z, .3, true, true);   // 위에 얹혀 있던 상품은 떨어지고, 아래·옆은 받쳐 줌
  return true;
}
async function takeFromSlot(s) {
  if (full()) return; let taken = null, at = 0;
  const ok = await NET.tx('sl/' + s, cur => { const a = cur ? String(cur).split(',') : []; if (!a.length) { taken = null; return undefined; } taken = +a[a.length - 1]; at = a.length - 1; a.pop(); return a.length ? a.join(',') : null; });
  if (!ok || taken == null) { sfx('no'); return; }
  flyAnim(taken, slotPose(LIB.slots[s], prodOf(taken), at), () => handWorld(prodOf(taken)), .28);
  PENDING.add(taken); await NET.set('it/' + taken, 'h,' + me.k + gS(st(taken))); PENDING.delete(taken);
  if (!P.hand.includes(taken)) P.hand.unshift(taken); sendHand(); sfx('pick');
}
async function placeItem(id, s, quiet, from) {
  const pi = LIB.items[id].p, Pp = LIB.prods[pi], cap = Pp.cap; let n = 0;
  if (PENDING.has(id)) return false;
  const src = from === false ? null : from || (P.hand.includes(id) ? handWorld(Pp) : poseOfMatrix(itemMatrix(id).clone()));
  PENDING.add(id);
  const ok = await NET.tx('sl/' + s, cur => { const a = cur ? String(cur).split(',').map(Number) : []; if (a.includes(id)) return undefined; if (a.length && LIB.items[a[0]].p !== pi) return undefined; if (a.length >= cap) return undefined; a.push(id); n = a.length; return a.join(','); });
  if (!ok) { PENDING.delete(id); if (!quiet) { sfx('no'); notice('이 칸에는 넣을 수 없어요'); } return false; }
  const sv = st(id), sl = LIB.slots[s], right = Pp.sec === sl.sec, done = right && n >= cap;
  P.hand = P.hand.filter(x => x !== id);
  const gold = right && !sv.g ? grantGold(LIB.gold) : null;
  if (src) { const to = slotPose(sl, Pp, n - 1); flyAnim(id, src, to, .24, () => { if (right) { sparkle(to.p, done); if (gold) floatText(to.p, `+${won(gold.amt)}${gold.mul > 1 ? ` ×${gold.mul}` : ''}`, gold.mul > 1 ? '#ffd84a' : '#a6ffa8'); if (done) setTimeout(() => floatText(to.p.clone().setY(to.p.y + .14), '⭐ 칸 완성!', '#ffd84a'), 280); } else floatText(to.p, '틀린 구역!', '#ff8a7a'); }, .6); }
  await NET.set('it/' + id, `s,${s}` + (sv.g || right ? ',g' : '')); PENDING.delete(id); sendHand(); STAT.p++;
  if (right) { STAT.c++; sfx('good'); if (done) { const got = await NET.tx('m/cs/' + s, cur => cur ? undefined : 1); if (got) { await NET.tx('m/stars', v => (v | 0) + 1); NET.tx('m/starAll', v => (v | 0) + 1); sfx('star'); reward('⭐ 칸 완성! 별 +1'); } } }
  else { sfx('bad'); if (!quiet) notice(`🟥 ${LIB.secs[Pp.sec].n} 상품은 여기(${LIB.secs[sl.sec].n})가 아니에요`, 2000); }
  return true;
}
function grantGold(base) {
  let mul = 1; for (const k of STK) if (k.e === 'mul' && stkN(k.id) && Math.random() * 100 < k.v) mul = Math.max(mul, k.x);
  const amt = base * mul; NET.tx('m/gold', v => (v | 0) + amt); if (mul > 1) reward(`💰 +${won(amt)} <small>(${mul}배!)</small>`); return { amt, mul };
}
// ════════════ 손맛: 집기·진열 비행 연출(원작 0.3초) · 반짝임 · +알바비 글자 · 발로 차기 ════════════
const ANIM = [], ANIM_HIDE = new Map(); let animN = 0;   // ANIM_HIDE: 날아가는 중인 상품 → 실제 자리에서는 숨김
const ease = t => 1 - Math.pow(1 - t, 3);
const PZ = () => ({ p: new THREE.Vector3(), q: new THREE.Quaternion(), s: new THREE.Vector3() });
function poseOfMatrix(m) { const r = PZ(); m.decompose(r.p, r.q, r.s); return r; }
function handWorld(Pp) {   // 손에 든 상품이 보이는 자리(카메라 기준)를 세계 좌표로
  const mx = Math.max(Pp.w, Pp.h, Pp.d), sc = (.14 + mx * .4) / mx; cam.updateMatrixWorld();
  EE.set(.15, -.5, 0); QQ.setFromEuler(EE); V1.set(.3, -.27, -.55); V2.set(Pp.w * sc, Pp.h * sc, Pp.d * sc);
  return poseOfMatrix(new THREE.Matrix4().compose(V1, QQ, V2).premultiply(cam.matrixWorld));
}
function slotPose(sl, Pp, k) { const r = slotItemPos(sl, Pp, k); return { p: new THREE.Vector3(r.p[0], r.p[1], r.p[2]), q: r.q, s: new THREE.Vector3(Pp.w, Pp.h, Pp.d) }; }
function flyAnim(id, from, to, dur, onEnd, arc = 1) {   // to = 포즈 또는 (손처럼 움직이는 목표라면) 포즈를 돌려주는 함수
  const m = soloMesh(id, 'a' + (animN++ % 12)); ANIM_HIDE.set(id, (ANIM_HIDE.get(id) || 0) + 1); markItem(id); handDirty = true;
  ANIM.push({ id, m, from, to, t: 0, dur, onEnd, arc });
}
function tickAnims(dt) {
  for (let i = ANIM.length - 1; i >= 0; i--) {
    const A = ANIM[i]; A.t += dt; const k = Math.min(1, A.t / A.dur), e = ease(k), to = typeof A.to === 'function' ? A.to() : A.to;
    V1.lerpVectors(A.from.p, to.p, e); V1.y += Math.sin(k * Math.PI) * .1 * A.arc; QQ.slerpQuaternions(A.from.q, to.q, e); V2.lerpVectors(A.from.s, to.s, e);
    A.m.setMatrixAt(0, M4.compose(V1, QQ, V2)); A.m.instanceMatrix.needsUpdate = true; A.m.visible = true;
    if (k >= 1) { ANIM.splice(i, 1); A.m.visible = false; const n = (ANIM_HIDE.get(A.id) || 1) - 1; if (n > 0) ANIM_HIDE.set(A.id, n); else ANIM_HIDE.delete(A.id); markItem(A.id); handDirty = true; if (A.onEnd) A.onEnd(); }
  }
}
// 반짝임(원작: 맞게 넣으면 상품이 빛남) · 떠오르는 글자
const FX = [];
const starTex = tex(64, 64, x => { const g = x.createRadialGradient(32, 32, 0, 32, 32, 32); g.addColorStop(0, 'rgba(255,255,255,1)'); g.addColorStop(.25, 'rgba(255,244,170,.9)'); g.addColorStop(1, 'rgba(255,220,90,0)'); x.fillStyle = g; x.fillRect(0, 0, 64, 64); x.fillStyle = '#fff'; x.beginPath(); for (let i = 0; i < 8; i++) { const a = i * Math.PI / 4, r = i % 2 ? 5 : 31; x.lineTo(32 + Math.cos(a) * r, 32 + Math.sin(a) * r); } x.fill(); });
function sparkle(p, big) {
  for (let i = 0; i < (big ? 16 : 9); i++) {
    const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: starTex, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, color: big ? '#ffe070' : '#fff8d0' })), a = Math.random() * 6.283;
    s.position.copy(p); s.scale.setScalar((big ? .1 : .065) * (.7 + Math.random() * .6)); s.userData = { v: new THREE.Vector3(Math.cos(a) * .55, .45 + Math.random() * .8, Math.sin(a) * .55).multiplyScalar(big ? 1.5 : 1), life: .55 + Math.random() * .2, g: 2.4 };
    scene.add(s); FX.push(s);
  }
  const ring = new THREE.Mesh(new THREE.RingGeometry(.05, .075, 24), new THREE.MeshBasicMaterial({ color: big ? '#ffd84a' : '#ffffff', transparent: true, depthWrite: false, side: THREE.DoubleSide }));
  ring.position.copy(p); ring.lookAt(cam.position); ring.userData = { v: new THREE.Vector3(), life: .4, grow: big ? 3.4 : 2.4, a: .7 }; scene.add(ring); FX.push(ring);
}
const TXT = {};
function floatText(p, str, col) {
  const key = str + col, t = TXT[key] || (TXT[key] = tex(320, 72, (x, w, h) => { x.font = '44px Jua, sans-serif'; x.textAlign = 'center'; x.textBaseline = 'middle'; x.lineWidth = 8; x.strokeStyle = 'rgba(16,28,34,.9)'; x.strokeText(str, w / 2, h / 2); x.fillStyle = col; x.fillText(str, w / 2, h / 2); }));
  const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: t, transparent: true, depthTest: false })); s.position.copy(p); s.position.y += .1; s.scale.set(.44, .1, 1); s.renderOrder = 997;
  s.userData = { v: new THREE.Vector3(0, .32, 0), life: 1.1, text: 1 }; scene.add(s); FX.push(s);
}
function tickFx(dt) {
  for (let i = FX.length - 1; i >= 0; i--) {
    const s = FX[i], u = s.userData; u.life -= dt; s.position.addScaledVector(u.v, dt); if (u.g) u.v.y -= u.g * dt; if (u.grow) s.scale.multiplyScalar(1 + u.grow * dt);
    s.material.opacity = clamp(u.life / (u.text ? .45 : .3), 0, 1) * (u.a || 1);
    if (u.life <= 0) { scene.remove(s); s.material.dispose(); if (s.geometry && !s.isSprite) s.geometry.dispose(); FX.splice(i, 1); }
  }
}
// 발로 차기: 걸어가다 발에 걸린 바닥 상품을 물리로 굴림 (달리면 더 멀리)
const KICKED = new Map();
function kickItems(dx, dz, dt) {
  if (!PWD || ACT.size > 90 || P.crouch > .5 || !P.ground) return; const d = Math.hypot(dx, dz), sp = d / dt; if (sp < 1.2) return;
  if (gridDirty) rebuildGrid(); const now = performance.now(), ux = dx / d, uz = dz / d; let n = 0;
  for (let i = -1; i <= 1; i++) for (let j = -1; j <= 1; j++) {
    const a = GRID.get(gk(P.x + i, P.z + j)); if (!a) continue;
    for (const id of a) {
      if (n >= 2 || ACT.has(id) || PENDING.has(id) || MV[id] || ANIM_HIDE.has(id) || (KICKED.get(id) || 0) > now) continue;
      const s = st(id); if (s.w !== 'f' || s.y > P.y + .4) continue;
      const Pp = prodOf(id), r = PW + Math.max(Pp.w, Pp.d) * .4, ox = s.x - P.x, oz = s.z - P.z; if (ox * ox + oz * oz > r * r || ox * ux + oz * uz < -.02) continue;
      const f = .5 + Math.random() * .4, A = addBody(id, {});
      A.b.setLinvel({ x: ux * sp * f + ox * 2, y: .5 + Math.random() * .9 + sp * .08, z: uz * sp * f + oz * 2 }, true); A.b.setAngvel({ x: (Math.random() - .5) * 12, y: (Math.random() - .5) * 8, z: (Math.random() - .5) * 12 }, true);
      KICKED.set(id, now + 700); n++;
    }
  }
  if (n) sfx('kick');
}
// ════════════ 물리 (Rapier): 쏟아진 더미 · 던지기 · 떨어뜨리기 · 쌓이고 굴러감 ════════════
// 멈춰 있는 상품은 물리 세계에 넣지 않고, 사건이 난 곳 주변만 잠깐 물리 몸체로 깨워 시뮬레이션 → 다 멈추면 새 자세를 저장
// 멀티: 시뮬레이션한 사람이 움직이는 동안 mv/{id} 로 자세를 흘려 보내고, 멈추면 it/{id} 를 트랜잭션으로 저장
let RAPIER = null, PWD = null; const ACT = new Map(), MV = {}, PHYS = [];
async function initPhysics() {
  const mod = await import('https://cdn.jsdelivr.net/npm/@dimforge/rapier3d-compat@0.12.0/rapier.es.js'); RAPIER = mod.default || mod; await RAPIER.init();
  PWD = new RAPIER.World({ x: 0, y: -9.81, z: 0 }); PWD.timestep = 1 / 60;
  const S = LIB.store;
  PWD.createCollider(RAPIER.ColliderDesc.cuboid((S.X1 - S.X0) / 2 + 3, .5, (S.Z1 - S.Z0) / 2 + 3).setTranslation((S.X0 + S.X1) / 2, -.5, (S.Z0 + S.Z1) / 2).setFriction(.9));
  for (const b of PHYS) PWD.createCollider(RAPIER.ColliderDesc.cuboid(Math.max(.005, (b[3] - b[0]) / 2), Math.max(.005, (b[4] - b[1]) / 2), Math.max(.005, (b[5] - b[2]) / 2)).setTranslation((b[0] + b[3]) / 2, (b[1] + b[4]) / 2, (b[2] + b[5]) / 2).setFriction(.7));
}
const ROUND = ['can', 'bottle', 'cup', 'tub', 'jar', 'spray', 'vase'];
function shapeDesc(P) {
  const k = geoKey(P.sh), mx = Math.max(P.w, P.h, P.d), mn = Math.min(P.w, P.h, P.d);
  let d;
  if (ROUND.includes(k) && Math.abs(P.w - P.d) < .3 * Math.max(P.w, P.d)) d = RAPIER.ColliderDesc.cylinder(P.h / 2, Math.max(P.w, P.d) / 2);
  else if (k === 'ball' && mx / mn < 1.35) d = RAPIER.ColliderDesc.ball((P.w + P.h + P.d) / 6);
  else if (k === 'tri') { const hw = P.w / 2, hh = P.h / 2, hd = P.d / 2; d = RAPIER.ColliderDesc.convexHull(new Float32Array([-hw, -hh, -hd, hw, -hh, -hd, 0, hh, -hd, -hw, -hh, hd, hw, -hh, hd, 0, hh, hd])); }
  if (!d) d = RAPIER.ColliderDesc.cuboid(P.w / 2, P.h / 2, P.d / 2);
  return d.setFriction(.75).setRestitution(.08).setDensity(300);
}
function addBody(id, o = {}) {
  if (ACT.has(id)) return ACT.get(id); const P = prodOf(id), s = o.pose || st(id);
  const d = RAPIER.RigidBodyDesc.dynamic().setTranslation(s.x, s.y, s.z).setRotation({ x: s.qx, y: s.qy, z: s.qz, w: s.qw }).setLinearDamping(.05).setAngularDamping(.3).setCcdEnabled(!!o.ccd);
  if (o.v) d.setLinvel(o.v[0], o.v[1], o.v[2]); if (o.av) d.setAngvel({ x: o.av[0], y: o.av[1], z: o.av[2] });
  const b = PWD.createRigidBody(d); PWD.createCollider(shapeDesc(P), b); if (o.sleep) b.sleep();
  const A = { id, b, start: IT[id] || null, t: 0, g: s.g || 0, quiet: 0, sent: 0, dunk: !!o.dunk };
  ACT.set(id, A); markItem(id); return A;
}
function wakeAround(x, y, z, r, sleep, aboveOnly) {   // 주변의 멈춘 상품을 물리 몸체로 (sleep 이면 부딪힐 때까지 잠든 채, aboveOnly 면 위에 얹힌 것만 깨움)
  if (gridDirty) rebuildGrid(); if (ACT.size > 120) return;
  for (let i = -1; i <= 1; i++) for (let j = -1; j <= 1; j++) { const a = GRID.get(gk(x + i, z + j)); if (!a) continue; for (const id of a) { if (ACT.has(id) || PENDING.has(id) || MV[id]) continue; const s = st(id); if (s.w !== 'f') continue; if (Math.abs(s.x - x) < r && Math.abs(s.z - z) < r && s.y > y - r && s.y < y + 2.5) addBody(id, { sleep: aboveOnly ? s.y <= y + .01 : sleep }); } }
}
let physAcc = 0, mvT = 0, nearT = 0;
function stepPhysics(dt) {
  if (!PWD || !ACT.size) return; physAcc = Math.min(physAcc + dt, .1); let n = 0;
  while (physAcc >= 1 / 60 && n < 4) { PWD.step(); physAcc -= 1 / 60; n++; dunkCheck(); }
  nearT -= dt; if (nearT <= 0) { nearT = .1; for (const A of [...ACT.values()]) if (!A.b.isSleeping()) { const t = A.b.translation(), v = A.b.linvel(); if (Math.hypot(v.x, v.y, v.z) > .6) wakeAround(t.x, t.y, t.z, .4, true); } }
  let oldest = 0, calm = true;
  for (const A of ACT.values()) { A.t += dt; oldest = Math.max(oldest, A.t); const v = A.b.linvel(), w = A.b.angvel(); A.quiet = A.b.isSleeping() || (Math.hypot(v.x, v.y, v.z) < .08 && Math.hypot(w.x, w.y, w.z) < .6) ? A.quiet + dt : 0; if (A.quiet < .4) calm = false;
    const t = A.b.translation(); if (t.y < -2) { A.b.setTranslation({ x: (LIB.store.X0 + LIB.store.X1) / 2, y: 1, z: LIB.store.Z0 + 3.5 }, true); A.b.setLinvel({ x: 0, y: 0, z: 0 }, true); } }
  if (calm || oldest > 6) settleAll();
  mvT -= dt; if (mvT <= 0 && !NET.solo && ACT.size) { mvT = .1; const up = {}; for (const A of ACT.values()) if (!A.b.isSleeping() && A.quiet < .5) { const t = A.b.translation(), q = A.b.rotation(); up[A.id] = `${t.x.toFixed(3)},${t.y.toFixed(3)},${t.z.toFixed(3)},${q.x.toFixed(3)},${q.y.toFixed(3)},${q.z.toFixed(3)},${q.w.toFixed(3)}`; A.sent = 1; } if (Object.keys(up).length) NET.update('mv', up); }
}
function settleAll() {   // 다 멈췄으면 움직인 상품만 새 자세로 저장 (그동안 남이 바꿨으면 저장 안 함)
  const done = [...ACT.values()]; ACT.clear(); const clear = {};
  for (const A of done) {
    const t = A.b.translation(), q = A.b.rotation(), was = st0(A.start); PWD.removeRigidBody(A.b);
    const moved = !was || was.w !== 'f' || Math.hypot(t.x - was.x, t.y - was.y, t.z - was.z) > .008 || Math.abs(q.x * was.qx + q.y * was.qy + q.z * was.qz + q.w * was.qw) < .9995;
    if (A.sent) clear[A.id] = null;
    if (!moved) { markItem(A.id); continue; }
    const v = fStr(t, q, A.g); IT[A.id] = v; markItem(A.id);   // 바로 보이게 (트랜잭션 결과가 오면 다시 맞춰짐)
    NET.tx('it/' + A.id, cur => (cur || null) === (A.start || null) ? v : undefined).then(ok => { if (!ok) markItem(A.id); });
  }
  if (Object.keys(clear).length) NET.update('mv', clear);
}
function dunkCheck() {   // 덩크슛: 던진 상품이 맞는 구역의 받아 줄 칸에 들어가면 바로 진열
  for (const A of ACT.values()) {
    if (!A.dunk) continue; const t = A.b.translation(), P = prodOf(A.id);
    for (const sl of LIB.slots) { const b = SLOTBOX[sl.s]; if (t.x > b[0] && t.x < b[3] && t.y > b[1] && t.y < b[4] && t.z > b[2] && t.z < b[5] && sl.sec === P.sec && accepts(sl.s, P.i)) { const q = A.b.rotation(), from = { p: new THREE.Vector3(t.x, t.y, t.z), q: new THREE.Quaternion(q.x, q.y, q.z, q.w), s: new THREE.Vector3(P.w, P.h, P.d) }; ACT.delete(A.id); PWD.removeRigidBody(A.b); placeItem(A.id, sl.s, true, from).then(ok => { if (ok) reward('🏀 덩크슛!'); else landAt(A.id, t.x, t.y, t.z); }); break; } }
  }
}
function landAt(id, x, y, z) { const s = st(id); addBody(id, { pose: { x, y: y + .05, z, qx: 0, qy: 0, qz: 0, qw: 1, g: s.g } }); }
// 던지기: 손에서 떠난 상품을 물리 몸체로 (던지는 힘 = 원작 투척 강화 수치)
function throwTop() {
  if (!P.hand.length || !PWD) return; const id = P.hand.shift(); sendHand(); STAT.t++; sfx('throw');
  cam.getWorldDirection(V1); const sp = throwPow() * 1.25, o = cam.position.clone().addScaledVector(V1, .4); o.y -= .1;
  const q = new THREE.Quaternion().setFromEuler(new THREE.Euler(0, P.yaw, 0)), r = () => (Math.random() - .5) * 8;
  addBody(id, { pose: { x: o.x, y: o.y, z: o.z, qx: q.x, qy: q.y, qz: q.z, qw: q.w, g: st(id).g }, v: [V1.x * sp, V1.y * sp + 1, V1.z * sp], av: [r(), r(), r()], ccd: true, dunk: SKILL.s21.on > 0 });
}
// Q: 짧게 = 던지기 · 길게 = 발밑에 전부 내려놓기 (물리로 툭툭 떨어짐)
let qT = 0;
function qDown() { qT = performance.now(); setTimeout(() => { if (qT && KEY.KeyQ && performance.now() - qT >= 440) { dropAll(); qT = 0; } }, 460); }
function qUp() { if (qT && performance.now() - qT < 450) throwTop(); qT = 0; }
function dropAll() {
  if (!P.hand.length || !PWD) return; const fx = P.x - Math.sin(P.yaw) * .6, fz = P.z - Math.cos(P.yaw) * .6; let y = P.y + .9;
  for (const id of P.hand) { const Pp = prodOf(id), q = new THREE.Quaternion().setFromEuler(new THREE.Euler(0, P.yaw + (Math.random() - .5), 0)); addBody(id, { pose: { x: fx + (Math.random() - .5) * .2, y, z: fz + (Math.random() - .5) * .2, qx: q.x, qy: q.y, qz: q.z, qw: q.w, g: st(id).g } }); y += Math.max(Pp.h, .05) + .02; }
  P.hand = []; sendHand(); sfx('drop');
}
async function giveItem(k) {
  if (!P.hand.length) return; const O = OTHERS[k]; if (!O) return;
  const id = P.hand[0], s = st(id), ok = await NET.tx('it/' + id, cur => cur === 'h,' + me.k + gS(s) ? 'h,' + k + gS(s) : undefined);
  if (!ok) return; P.hand.shift(); sendHand(); sfx('drop'); toast(`📦 ${(ST.players[k] || {}).nick || ''}님에게 상품을 건넸어요`);
}
function unstick() {   // 손이 닿지 않는 곳(진열대 위 · 매장 밖)의 상품을 입구 앞으로
  const S = LIB.store, up = {}; let n = 0;
  for (const it of LIB.items) { const s = st(it.id); if (s.w !== 'f' || ACT.has(it.id)) continue; const bad = s.y > 1.75 || s.x < S.X0 || s.x > S.X1 || s.z < S.Z0 || s.z > S.Z1; if (!bad) continue; const P2 = prodOf(it.id); up[it.id] = `f,${(-1.5 + (n % 6) * .5).toFixed(2)},${(P2.h / 2 + .01).toFixed(3)},${(S.Z0 + 3.6 + Math.floor(n / 6) * .4).toFixed(2)},0,0,0,1` + gS(s); n++; }
  if (n) NET.update('it', up); toast(n ? `📦 끼인 물건 ${n}개를 입구 앞으로 모았어요` : '끼인 물건이 없어요');
}
// 처음 매장: 상품을 무더기로 떨어뜨려 물리로 쌓이게 (원작처럼 통로 곳곳에 더미) — 방장이 한 번 계산해서 모두에게 저장
async function scatterAll(onProg) {
  const S = LIB.store, R = rng(LIB.seed ^ 0x5bd1), N = LIB.items.length, out = {};
  const zone = [S.X0 + .6, LIB.zFront - .6, S.X1 - .6, S.Z1 - 1.4];
  const blocked = (x, z, m) => solids.some(b => b[4] > .2 && x > b[0] - m && x < b[3] + m && z > b[2] - m && z < b[5] + m);
  const centers = [], nCl = Math.max(8, Math.ceil(N / 42));
  for (let t = 0; centers.length < nCl && t < 40000; t++) { const x = zone[0] + R() * (zone[2] - zone[0]), z = zone[1] + R() * (zone[3] - zone[1]); if (!blocked(x, z, .5) && centers.every(c => Math.hypot(c[0] - x, c[1] - z) > .9)) centers.push([x, z]); }
  const order = shuffle(LIB.items.map(it => it.id), R), per = Math.ceil(N / centers.length), fixed = [], E = new THREE.Euler(), Q = new THREE.Quaternion();
  for (let c = 0; c < centers.length; c++) {
    const ids = order.slice(c * per, (c + 1) * per); if (!ids.length) break; const bodies = [];
    ids.forEach((id, k) => {
      let x, z, tr = 0; do { const a = R() * 6.283, rr = .08 + .5 * Math.sqrt(R()); x = centers[c][0] + Math.cos(a) * rr; z = centers[c][1] + Math.sin(a) * rr; } while (blocked(x, z, .08) && ++tr < 10);
      Q.setFromEuler(E.set(R() * 6.28, R() * 6.28, R() * 6.28));
      const b = PWD.createRigidBody(RAPIER.RigidBodyDesc.dynamic().setTranslation(x, .2 + Math.floor(k / 7) * .2 + R() * .08, z).setRotation({ x: Q.x, y: Q.y, z: Q.z, w: Q.w }).setLinvel(0, -1.5, 0).setAngularDamping(.4));
      PWD.createCollider(shapeDesc(prodOf(id)), b); bodies.push([id, b]);
    });
    for (let s = 0; s < 260; s++) { PWD.step(); if (s > 70 && s % 15 === 0 && bodies.every(([, b]) => { const v = b.linvel(); return b.isSleeping() || Math.hypot(v.x, v.y, v.z) < .03; })) break; }
    for (const [id, b] of bodies) {
      let t = b.translation(); const q = b.rotation();
      if (t.y < -.5 || t.x < S.X0 || t.x > S.X1 || t.z < S.Z0 || t.z > S.Z1) t = { x: centers[c][0], y: prodOf(id).h / 2, z: centers[c][1] };
      out[id] = fStr(t, q, 0); PWD.removeRigidBody(b); fixed.push(PWD.createCollider(shapeDesc(prodOf(id)).setTranslation(t.x, t.y, t.z).setRotation(q)));
    }
    if (c % 2 === 0) { onProg && onProg((c + 1) / centers.length); await new Promise(r => setTimeout(r, 0)); }
  }
  for (const f of fixed) PWD.removeCollider(f, false);
  return out;
}

// ════════════ 스킬 (원작 수치) ════════════
const SKILL = { s10: { on: 0, cdT: 0 }, s11: { on: 0, cdT: 0 }, s21: { on: 0, cdT: 0 }, s30: { on: 0, cdT: 0 } };
const stkN = id => (ST.m.stk && ST.m.stk[id]) | 0;
const stkSum = e => STK.filter(k => k.e === e && stkN(k.id)).reduce((a, k) => a + k.v, 0);
const nPlayers = () => NET && !NET.solo ? Math.max(1, Object.keys(ST.players || {}).length) : 1;
function skCd(id) { const S = SKI[id], l = Math.max(0, lv(id) - 1); return Math.max(3, (S.cd[0] + S.cd[1] * l + (nPlayers() > 1 ? S.cd[2] : 0)) * (1 - Math.min(60, stkSum('cd')) / 100)); }
function skDur(id) { const S = SKI[id], l = Math.max(0, lv(id) - 1); return S.dur ? (S.dur[0] + S.dur[1] * l) * (1 + stkSum('dur') / 100) : 0; }
const PULL = { left: 0, t: 0, prod: -1 };
function useSkill(id) {
  const S = SKI[id], K = SKILL[id]; if (!lv(id)) { sfx('no'); return notice(`${S.ic} ${S.n} 스킬을 아직 배우지 않았어요 — K 로 스킬 창`); }
  if (K.on > 0) { sfx('no'); return notice('이미 사용 중인 스킬이에요'); }
  if (K.cdT > 0) { sfx('no'); return notice('스킬 쿨타임 중이에요'); }
  if ((id === 's10' || id === 's11' || id === 's30') && !P.hand.length) { sfx('no'); return notice('손에 든 상품이 없어요'); }
  if (id === 's30') { const pi = prodOf(P.hand[0]).i, n = LIB.items.filter(it => it.p === pi && st(it.id).w === 'f').length; if (!n) { sfx('no'); return notice('끌어올 같은 상품이 없어요'); } PULL.left = capacity() - P.hand.length; PULL.prod = pi; PULL.t = 0; }
  else K.on = skDur(id);
  K.cdT = skCd(id); STAT.u++; sfx('skill');
  if (stkSum('reset') && Math.random() * 100 < stkSum('reset')) { setTimeout(() => { K.cdT = 0; toast('🍄 스티커 발동! 쿨타임 초기화'); }, (K.on || .5) * 1000); }
}
let autoT = 0;
function tickSkills(dt) {
  for (const id in SKILL) { const K = SKILL[id]; if (K.on > 0) K.on = Math.max(0, K.on - dt); else if (K.cdT > 0) K.cdT = Math.max(0, K.cdT - dt); }
  // 추가 상품 요청: 0.25초마다 하나씩 손으로
  if (PULL.left > 0) { PULL.t -= dt; if (PULL.t <= 0) { PULL.t = .25; const it = LIB.items.find(it => it.p === PULL.prod && st(it.id).w === 'f' && !PENDING.has(it.id)); if (!it || P.hand.length >= capacity()) PULL.left = 0; else { PULL.left--; pickItem(it.id); } } }
  // 선반 확인: 들어갈 가장 가까운 칸 강조 (같은 상품 칸 우선) · 선반 확인+ 는 바라보면 자동 진열
  let tgt = null;
  if (SKILL.s10.on > 0 && P.hand.length) {
    const pi = prodOf(P.hand[0]).i, S = status(), cands = (S.byProd[pi] || []).filter(s => accepts(s, pi) && LIB.slots[s].sec === LIB.prods[pi].sec);
    const pool = cands.length ? cands : LIB.slots.filter(sl => sl.sec === LIB.prods[pi].sec && !S.slot[sl.s]).map(sl => sl.s);
    let bd = 1e9; for (const s of pool) { const b = SLOTBOX[s], d = Math.hypot((b[0] + b[3]) / 2 - P.x, (b[2] + b[5]) / 2 - P.z); if (d < bd) { bd = d; tgt = s; } }
  }
  if (tgt != null) { const b = SLOTBOX[tgt], pulse = 1 + Math.sin(performance.now() / 160) * .04; glowSlot.position.set((b[0] + b[3]) / 2, (b[1] + b[4]) / 2, (b[2] + b[5]) / 2); glowSlot.scale.set((b[3] - b[0]) * pulse, (b[4] - b[1]) * pulse, (b[5] - b[2]) * pulse); glowSlot.visible = true; } else glowSlot.visible = false;
  autoT -= dt;
  if (autoT <= 0 && locked && AIM) {
    if (SKILL.s10.on > 0 && lv('s100') && AIM.kind === 'slot' && P.hand.length && slotIds(AIM.s).length) { const id = handPick(AIM.s); if (id != null && accepts(AIM.s, LIB.items[id].p) && LIB.slots[AIM.s].sec === prodOf(id).sec) { autoT = .2; placeItem(id, AIM.s, true); } }
    if (SKILL.s11.on > 0 && lv('s110') && AIM.kind === 'item' && P.hand.length && prodOf(AIM.id).i === prodOf(P.hand[0]).i && P.hand.length < capacity()) { autoT = .15; pickItem(AIM.id); }
  }
  // 같은 상품 찾기: 바닥의 같은 상품 반짝이기
  let n = 0;
  if (SKILL.s11.on > 0 && P.hand.length) { const pi = prodOf(P.hand[0]).i; for (const it of LIB.items) { if (n >= 400) break; if (it.p !== pi) continue; const s = st(it.id); if (s.w !== 'f' || ACT.has(it.id)) continue; const b = itemBox(it.id); M4.makeScale(b[3] - b[0] + .06, b[4] - b[1] + .06, b[5] - b[2] + .06); M4.setPosition((b[0] + b[3]) / 2, (b[1] + b[4]) / 2, (b[2] + b[5]) / 2); glowItems.setMatrixAt(n++, M4); } }
  glowItems.count = n; if (n) glowItems.instanceMatrix.needsUpdate = true;
}
function openSkills() {
  const gold = ST.m.gold | 0, cols = [0, 1, 2].map(c => SK.filter(s => s.col === c));
  const card = S => { const l = lv(S.id), open = !S.need || lv(S.need) > 0, price = (S.bp + S.pp * l) * 1000, maxed = l >= S.max;
    return `<div class="sk ${l ? 'own' : ''} ${open ? '' : 'lock'}"><div><span class="ic">${S.ic}</span><b>${S.n}</b><span class="tag" style="border-color:${S.key ? '#ffd84a' : '#7ad0c8'};color:${S.key ? '#ffd84a' : '#7ad0c8'}">${S.key ? `액티브 ${S.key}` : '패시브'}</span></div><div>Lv.${l} / ${S.max}${S.d ? ` · ${S.d(l)}` : ''}</div>${S.cd ? `<div>${S.dur ? `지속 ${Math.round(l ? skDur(S.id) : S.dur[0])}초 · ` : '즉시 · '}쿨타임 ${Math.round(l ? skCd(S.id) : S.cd[0])}초</div>` : ''}${open ? (maxed ? '<div style="color:var(--green)">최대 레벨</div>' : `<button class="btn" data-buy="${S.id}" ${gold >= price ? '' : 'disabled'}>${l ? '레벨 업' : '배우기'} ${won(price)}</button>`) : `<div style="color:var(--red)">${SKI[S.need].n} 먼저</div>`}</div>`; };
  const stk = STK.map(k => `<div class="st ${stkN(k.id) ? 'own' : ''}"><span class="e">${stkN(k.id) ? k.ic : '❔'}</span>${stkN(k.id) ? `<b>${k.n}</b>${stkN(k.id) > 1 ? ` ×${stkN(k.id)}` : ''}<br>${k.d}` : '아직 없음'}</div>`).join('');
  $('abox').innerHTML = `<h3>🎓 스킬 <small style="color:var(--dim)">(K 닫기)</small></h3><p style="color:var(--dim);font-size:14px">맞는 구역에 넣을 때마다 알바비 ${won(LIB.gold)} · 가진 알바비 <b style="color:var(--gold)">${won(gold)}</b>${NET.solo ? '' : ' · 알바비와 스킬은 모두가 함께 써요'}</p><div class="tree">${cols.map(c => `<div style="display:flex;flex-direction:column;gap:10px">${c.map(card).join('')}</div>`).join('')}</div><h3 style="margin-top:14px">🏷 스티커 <small style="color:var(--dim)">칸을 완성하면 별 · 입구 옆 ATM 에 별을 넣으면 무작위 스티커 · 가진 별 ★${ST.m.stars | 0}</small></h3><div class="stk">${stk}</div>`;
  $('ovSkill').classList.remove('hide'); document.exitPointerLock();
  $('abox').querySelectorAll('[data-buy]').forEach(b => b.onclick = async () => { const S = SKI[b.dataset.buy], l = lv(S.id), price = (S.bp + S.pp * l) * 1000; if (l >= S.max) return; const ok = await NET.tx('m/gold', v => (v | 0) >= price ? (v | 0) - price : undefined); if (!ok) { sfx('no'); return toast('알바비가 모자라요'); } await NET.tx('m/lv/' + S.id, v => (v | 0) + 1); sfx('skill'); toast(`${S.ic} ${S.n} Lv.${l + 1}!`); setTimeout(openSkills, 120); });
}
// ATM: 별을 넣고 확률 추첨 → 성공하면 아직 없는 스티커 무작위 (다 모으면 알바비 스티커)
let atmBusy = 0;
async function useAtm(i) {
  const A = LIB.atms[i]; if (atmBusy) return notice('사용 중인 ATM이에요');
  const ok = await NET.tx('m/stars', v => (v | 0) >= A.cost ? (v | 0) - A.cost : undefined); if (!ok) { sfx('no'); return notice(`별이 모자라요 (★${A.cost} 필요) — 칸을 완성하면 별을 받아요`); }
  atmBusy = 1; sfx('atm'); notice(`🏧 ${A.n} 작동 중…`, 1200);
  setTimeout(async () => {
    atmBusy = 0;
    if (Math.random() * 100 >= A.ch) { sfx('fail'); return notice('💨 꽝! 스티커를 받지 못했어요', 2400); }
    let pool = STK.filter(k => !stkN(k.id)); if (!pool.length) pool = STK.filter(k => k.e === 'gold');
    const k = pool[Math.floor(Math.random() * pool.length)];
    await NET.tx('m/stk/' + k.id, v => (v | 0) + 1); if (k.e === 'gold') NET.tx('m/gold', v => (v | 0) + k.v * 1000);
    sfx('win'); memo('🏷 스티커 획득!', `<div style="text-align:center;font-size:64px">${k.ic}</div><div style="text-align:center;font-size:22px"><b>${k.n}</b></div><p style="text-align:center">${k.d}</p>`, '좋아요');
  }, 1200);
}

// ════════════ 다른 알바생 (아바타) ════════════
const OTHERS = {};
function avatar(col, name) {
  const g = new THREE.Group(), m = new THREE.MeshStandardMaterial({ color: col, roughness: .7 });
  const leg = new THREE.MeshStandardMaterial({ color: '#2a3a4a' }); for (const s of [-1, 1]) { const l = new THREE.Mesh(new THREE.BoxGeometry(.14, .8, .16), leg); l.position.set(s * .1, .4, 0); g.add(l); }
  const body = new THREE.Mesh(new THREE.BoxGeometry(.46, .62, .26), new THREE.MeshStandardMaterial({ color: '#f4f4f0' })); body.position.y = 1.1; g.add(body);
  const apron = new THREE.Mesh(new THREE.BoxGeometry(.4, .7, .02), m); apron.position.set(0, 1.0, -.14); g.add(apron);
  const head = new THREE.Mesh(new THREE.SphereGeometry(.18, 16, 12), new THREE.MeshStandardMaterial({ color: '#f2d2b0' })); head.position.y = 1.6; g.add(head);
  const eyeM = new THREE.MeshBasicMaterial({ color: '#2a1a10' }); for (const s of [-1, 1]) { const e = new THREE.Mesh(new THREE.SphereGeometry(.022, 8, 6), eyeM); e.position.set(s * .065, 1.62, -.165); g.add(e); }
  const capm = new THREE.Mesh(new THREE.CylinderGeometry(.19, .19, .1, 16), m); capm.position.y = 1.74; g.add(capm); const bill = new THREE.Mesh(new THREE.BoxGeometry(.3, .02, .16), m); bill.position.set(0, 1.7, -.2); g.add(bill);
  const lab = new THREE.Sprite(new THREE.SpriteMaterial({ map: tex(256, 64, (x, w, h) => { x.fillStyle = 'rgba(0,0,0,.55)'; x.fillRect(0, 8, w, 48); x.fillStyle = '#fff'; x.font = '36px Jua, sans-serif'; x.textAlign = 'center'; x.textBaseline = 'middle'; x.fillText(name, w / 2, 33); }), depthTest: false })); lab.scale.set(1, .25, 1); lab.position.y = 2.15; lab.renderOrder = 997; g.add(lab);
  scene.add(g); return g;
}
function syncOthers() {
  const pos = ST.pos || {}, players = ST.players || {}; HELD_OTHERS = new Set();
  for (const k in pos) { if (k === me.k || !players[k]) continue; const p = pos[k], O = OTHERS[k] = OTHERS[k] || { mesh: avatar(PCOL[(players[k].col || 0) % 8], players[k].nick) }; O.tx = p.x; O.ty = p.y; O.tz = p.z; O.tyaw = p.yw; O.hand = p.h ? String(p.h).split(',').map(Number) : []; if (O.hand.length) O.hand.forEach(id => HELD_OTHERS.add(id)); }
  for (const k in OTHERS) if (!pos[k] || !players[k]) { scene.remove(OTHERS[k].mesh); delete OTHERS[k]; }
}
let posT = 0;
function sendPos(dt) { if (NET.solo) return; posT += dt; if (posT < .1) return; posT = 0; if (!isFinite(P.x + P.y + P.z + P.yaw)) return; NET.set('pos/' + me.k, { x: +P.x.toFixed(2), y: +P.y.toFixed(2), z: +P.z.toFixed(2), yw: +P.yaw.toFixed(2), h: P.hand.slice(0, 3).join(',') }); }
function sendHand() { if (!NET.solo) NET.set('pos/' + me.k + '/h', P.hand.slice(0, 3).join(',')); hudHand(); handDirty = true; }
let statT = 0;
function sendStat(dt) { statT += dt; if (statT < 4) return; statT = 0; NET.set('stat/' + me.k, { p: STAT.p, c: STAT.c, t: STAT.t, j: STAT.j, d: Math.round(STAT.d), u: STAT.u }); }

// ════════════ 방 데이터 받기 ════════════
let lastFull = -1;
function onItem(k, v) {
  const id = +k; if (!(id >= 0) || !LIB.items[id]) return;
  const before = IT[id]; if (v == null) delete IT[id]; else IT[id] = v; markItem(id);
  const A = ACT.get(id); if (A && (v || null) !== (A.start || null) && !(v || '').startsWith('f,')) { ACT.delete(id); PWD.removeRigidBody(A.b); }
  const mine = 'h,' + me.k;
  if (v && (v === mine || v === mine + ',g') && !P.hand.includes(id) && !PENDING.has(id)) { P.hand.unshift(id); toast('📦 동료가 상품을 건넸어요'); sfx('pick'); sendHand(); }   // 건네받음
  else if (before && before.startsWith(mine) && !(v || '').startsWith(mine) && P.hand.includes(id) && !PENDING.has(id)) { P.hand = P.hand.filter(x => x !== id); sendHand(); }   // 경합에서 짐
}
function onSlot(k, v) { const s = +k; if (v == null) delete SL[s]; else SL[s] = v; for (const id of slotIds(s)) markItem(id); tagsDirty = true; STATUS = null; }
function onMeta(m) {
  ST.m = m || {}; const S = status();
  if (ST.m.done && !shown.end) { shown.end = 1; setTimeout(showEnd, 600); }
  hudProg(); hudAbil();
}
const shown = {};
function hostChores() {   // 방장: 나간 알바생 손의 상품을 입구 앞 바닥으로
  if (!isHost || NET.solo) return; const up = {}; let n = 0;
  for (const id in IT) { const v = IT[id]; if (v.startsWith('h,')) { const u = v.split(',')[1]; if (!ST.players[u]) { up[id] = `f,${(-1 + (n % 5) * .35).toFixed(2)},${(prodOf(+id).h / 2 + .01).toFixed(3)},${(LIB.store.Z0 + 3.8).toFixed(2)},0,0,0,1` + (v.endsWith(',g') ? ',g' : ''); n++; } } }
  if (n) NET.update('it', up);
}
const cleared = () => status().left === 0;

// ════════════ 협동: 핑 ════════════
const PINGS = {};
function ping() {
  const h = rayPick(40); if (!h.kind) return;
  let txt = '여기!';
  if (h.kind === 'item') txt = `📦 ${prodOf(h.id).short}`; else if (h.kind === 'slot') txt = `${LIB.secs[LIB.slots[h.s].sec].ic} ${LIB.secs[LIB.slots[h.s].sec].n}`; else if (h.kind === 'atm') txt = '🏧 ATM'; else if (h.kind === 'door') txt = '🚪 출입문';
  NET.set('ping/' + me.k, { x: +h.point[0].toFixed(2), y: +h.point[1].toFixed(2), z: +h.point[2].toFixed(2), txt, t: Date.now() }); sfx('ping');
}
function drawPings() {
  const now = Date.now();
  for (const k in PINGS) if (!ST.ping[k] || now - ST.ping[k].t > 7000) { scene.remove(PINGS[k].g); delete PINGS[k]; }
  for (const k in ST.ping) {
    const v = ST.ping[k]; if (!v || now - v.t > 7000) continue;
    let Pg = PINGS[k];
    if (!Pg || Pg.t !== v.t) {
      if (Pg) scene.remove(Pg.g);
      const col = k === me.k ? (me.col || PCOL[0]) : PCOL[((ST.players[k] || {}).col || 0) % 8], nm = k === me.k ? '나' : (ST.players[k] || {}).nick || '';
      const g = new THREE.Group(), lab = new THREE.Sprite(new THREE.SpriteMaterial({ map: tex(512, 96, (x, w) => { x.fillStyle = 'rgba(14,30,36,.88)'; x.fillRect(0, 10, w, 76); x.fillStyle = col; x.fillRect(0, 10, 12, 76); x.fillStyle = '#fff'; x.font = '38px Jua, sans-serif'; x.textBaseline = 'middle'; x.fillText(`${nm}: ${v.txt}`.slice(0, 22), 24, 48); }), depthTest: false }));
      lab.scale.set(1.6, .3, 1); lab.position.y = .55; lab.renderOrder = 999; g.add(lab);
      const ring = new THREE.Mesh(new THREE.RingGeometry(.12, .17, 24), new THREE.MeshBasicMaterial({ color: col, transparent: true, depthTest: false, side: THREE.DoubleSide })); ring.renderOrder = 999; g.add(ring);
      const pin = new THREE.Mesh(new THREE.ConeGeometry(.07, .2, 8), new THREE.MeshBasicMaterial({ color: col, depthTest: false })); pin.rotation.x = Math.PI; pin.position.y = .25; pin.renderOrder = 999; g.add(pin);
      g.position.set(v.x, v.y, v.z); scene.add(g); Pg = PINGS[k] = { g, ring, t: v.t };
      if (k !== me.k) sfx('ping');
    }
    const a = (now - v.t) / 1000; Pg.ring.scale.setScalar(1 + (a * 2 % 1) * 1.5); Pg.ring.material.opacity = 1 - (a * 2 % 1); Pg.ring.lookAt(cam.position); Pg.g.children[2].position.y = .25 + Math.sin(a * 6) * .05;
  }
}

// ════════════ HUD ════════════
function fmtT(ms) { const s = Math.floor(ms / 1000); return `${String(Math.floor(s / 3600)).padStart(2, '0')}:${String(Math.floor(s / 60) % 60).padStart(2, '0')}:${String(s % 60).padStart(2, '0')}`; }
function hudProg() { const S = status(); $('prog').innerHTML = `📦 남은 물건 <b>${S.left}</b> / ${LIB.items.length}${S.wrong ? ` <span style="color:var(--red);font-size:13px">(틀린 구역 ${S.wrong})</span>` : ''}<br>🏷 완성한 칸 <b>${S.full}</b> / ${LIB.slots.length}<br>💰 <b>${won(ST.m.gold | 0)}</b> · ⭐ <b>${ST.m.stars | 0}</b><div class="tm" id="tm"></div>`; }
let handDirty = true;
function hudHand() {
  const cap = capacity();
  if (!P.hand.length) { $('hand').innerHTML = `<h4>손에 든 상품 <b>0 / ${cap}</b></h4><div style="color:var(--dim);font-size:14px;margin-top:3px">상품을 보고 왼쪽 클릭 (E)</div>`; return; }
  const groups = []; for (const id of P.hand) { const pi = LIB.items[id].p, g = groups.find(x => x.pi === pi); if (g) g.n++; else groups.push({ pi, n: 1, top: id === P.hand[0] }); }
  $('hand').innerHTML = `<h4>손에 든 상품 <b>${P.hand.length} / ${cap}</b></h4><div class="hl">` + groups.slice(0, 9).map(g => { const Pp = LIB.prods[g.pi], D = LIB.secs[Pp.sec]; return `<div class="hb ${g.top ? 'top' : ''}"><span class="pk" style="background:${Pp.pack};border-color:${Pp.acc}">${Pp.ic || '🍏'}</span><span class="nm">${esc(Pp.name)} <small>×${g.n} · ${Pp.cap}개짜리 칸</small></span>${OPT.easy ? `<span class="to" style="border-color:${D.col};background:${D.col}55">${D.ic} ${D.n}</span>` : ''}</div>`; }).join('') + `</div><div class="hk">휠/R 바꾸기 · Q 던지기 (길게 = 발밑에 전부) · 진열할 땐 칸에 맞는 상품을 골라 넣어요</div>`;
}
function hudAbil() { $('abil').innerHTML = SK.filter(s => s.key).map(S => { const K = SKILL[S.id], l = lv(S.id); return `<div class="ab ${K.on > 0 ? 'act' : ''} ${l ? '' : 'lock'}"><span class="k">${S.key}</span>${l ? S.ic : '🔒'}<span class="lv">${l ? 'Lv.' + l : ''}</span>${K.on > 0 ? `<div class="cd" style="background:rgba(255,216,74,.25)">${Math.ceil(K.on)}</div>` : K.cdT > 0 ? `<div class="cd">${Math.ceil(K.cdT)}</div>` : ''}</div>`; }).join(''); }
function hudOthers() { if (NET.solo) { $('others').innerHTML = ''; return; } $('others').innerHTML = Object.entries(ST.players).map(([k, p]) => `<div><span style="color:${PCOL[(p.col || 0) % 8]}">●</span> ${esc(p.nick)}${k === me.k ? ' (나)' : ''}</div>`).join(''); }
function onKey(e) {
  if (e.code === 'KeyM') { if ($('ovMap').classList.contains('hide')) openMap(); else closeOv(); }
  if (e.code === 'KeyK') { if ($('ovSkill').classList.contains('hide')) openSkills(); else closeOv(); }
  if (e.code === 'Escape' && overlayOpen()) closeOv();
  if (!locked) return;
  if (e.code === 'KeyE') act(false);
  if (e.code === 'KeyQ' && !e.repeat) qDown();
  if (e.code === 'KeyF') ping();
  if (e.code === 'KeyR' && P.hand.length > 1) { P.hand.push(P.hand.shift()); sendHand(); }
  const n = { Digit1: 's10', Digit2: 's11', Digit3: 's21', Digit4: 's30' }[e.code]; if (n) useSkill(n);
}
function closeOv() { ['ovMemo', 'ovMap', 'ovSkill'].forEach(i => $(i).classList.add('hide')); }
function memo(title, body, btn = '확인', cb) { $('memo').innerHTML = `<h2>${title}</h2><div>${body}</div><div style="text-align:center"><button class="btn go" id="mOk">${btn}</button></div>`; $('ovMemo').classList.remove('hide'); document.exitPointerLock(); $('mOk').onclick = () => { closeOv(); if (cb) cb(); else lockPtr(); }; }
function drawMap(c, W, H) {
  const S = LIB.store, sx = W / (S.X1 - S.X0 + 1), sz = H / (S.Z1 - S.Z0 + 1), s = Math.min(sx, sz), ox = (W - (S.X1 - S.X0) * s) / 2, oz = (H - (S.Z1 - S.Z0) * s) / 2, X = v => ox + (v - S.X0) * s, Z = v => oz + (S.Z1 - v) * s;   // 위 = 매장 안쪽, 아래 = 입구
  c.width = W; c.height = H; const x = c.getContext('2d');
  x.fillStyle = '#e8eef0'; x.fillRect(0, 0, W, H); x.fillStyle = '#fbfcfc'; x.fillRect(X(S.X0), Z(S.Z1), (S.X1 - S.X0) * s, (S.Z1 - S.Z0) * s);
  x.font = `${Math.max(10, Math.round(s * .36))}px Jua, sans-serif`; x.textAlign = 'center'; x.textBaseline = 'middle';
  for (const sl of LIB.slots) { const b = SLOTBOX[sl.s]; x.fillStyle = (LIB.secs[sl.sec] || { col: '#888' }).col; x.fillRect(X(b[0]), Z(b[5]), Math.max(2, (b[3] - b[0]) * s), Math.max(2, (b[5] - b[2]) * s)); }
  const labs = []; for (const sh of LIB.shelves) { const ss = sh.slots.map(j => LIB.slots[j]); if (!ss.length) continue; const cx = ss.reduce((a, q) => a + q.o[0], 0) / ss.length, cz = ss.reduce((a, q) => a + q.o[2], 0) / ss.length, f = [Math.sin(ss[0].yaw), Math.cos(ss[0].yaw)], D = LIB.secs[sh.sec] || { ic: '', n: '' }, lx = cx + f[0] * .7, lz = cz + f[1] * .7; if (labs.some(l => l[0] === sh.sec && Math.hypot(l[1] - lx, l[2] - lz) < 4) || labs.some(l => Math.abs(X(l[1]) - X(lx)) < 60 && Math.abs(Z(l[2]) - Z(lz)) < 14)) continue; labs.push([sh.sec, lx, lz]); x.fillStyle = 'rgba(255,255,255,.85)'; const tw = x.measureText(`${D.ic}${D.n}`).width; x.fillRect(X(lx) - tw / 2 - 3, Z(lz) - 9, tw + 6, 18); x.fillStyle = '#1e2a30'; x.fillText(`${D.ic}${D.n}`, X(lx), Z(lz)); }
  for (const C of LIB.checkouts) { x.fillStyle = '#b8c0c4'; x.fillRect(X(C.x - .35), Z(C.z + 1.1), .7 * s, 2.2 * s); }
  for (const A of LIB.atms) { x.fillStyle = A.c; x.fillRect(X(S.X0), Z(A.z + .36), .6 * s, .72 * s); } const K = LIB.counter; x.fillStyle = '#c8b8a0'; x.fillRect(X(K.x0), Z(K.z1), (K.x1 - K.x0) * s, (K.z1 - K.z0) * s); x.fillStyle = '#5a8ac8'; x.fillRect(X(S.X0), Z(S.Z1), (S.X1 - S.X0) * s, .8 * s); x.fillStyle = '#fff'; x.fillText('❄ 음료 냉장고', X((S.X0 + S.X1) / 2), Z(S.Z1 - .4));
  x.fillStyle = '#e8503a'; x.fillRect(X(-1.3), Z(S.Z0) - 5, 2.6 * s, 6); x.fillText('출입문', X(0), Z(S.Z0 + .8)); x.fillText('계산대', X((K.x0 + K.x1) / 2), Z(K.z1 + .4)); x.fillText('ATM', X(S.X0 + 1.1), Z(LIB.atms[1].z));
  for (const k in OTHERS) { const m = OTHERS[k].mesh.position, nm = (ST.players[k] || {}).nick || ''; x.fillStyle = PCOL[((ST.players[k] || {}).col || 0) % 8]; x.beginPath(); x.arc(X(m.x), Z(m.z), 7, 0, 6.29); x.fill(); x.strokeStyle = '#fff'; x.lineWidth = 2; x.stroke(); x.font = '14px Jua, sans-serif'; x.fillStyle = '#1e2a30'; x.fillText(nm, X(m.x), Z(m.z) - 14); }
  x.fillStyle = '#e8503a'; x.beginPath(); x.arc(X(P.x), Z(P.z), 7, 0, 6.29); x.fill(); x.strokeStyle = '#e8503a'; x.lineWidth = 3; x.beginPath(); x.moveTo(X(P.x), Z(P.z)); x.lineTo(X(P.x - Math.sin(P.yaw) * 1.1), Z(P.z - Math.cos(P.yaw) * 1.1)); x.stroke();
  return c;
}
function mapSide() {   // 전체 보기 옆 칸: 알바생 · 구역별 진열 현황
  const S = status(), per = {}; for (const it of LIB.items) { const k = LIB.prods[it.p].sec; (per[k] = per[k] || { all: 0, ok: 0 }).all++; }
  for (const sl of LIB.slots) { const q = S.slot[sl.s]; if (q && q.ok) per[sl.sec] && (per[sl.sec].ok += q.n); }
  const ppl = Object.entries(ST.players).map(([k, p]) => { const pos = k === me.k ? { h: P.hand.join(',') } : (ST.pos[k] || {}), h = pos.h ? String(pos.h).split(',').filter(Boolean).map(Number) : [], st2 = k === me.k ? STAT : (ST.stat[k] || {}); return `<div><span style="color:${PCOL[(p.col || 0) % 8]}">●</span> <b>${esc(p.nick)}</b>${k === me.k ? ' (나)' : ''} <span style="color:var(--dim)">· 맞게 넣음 ${st2.c | 0} · 손에 ${h.length ? esc(prodOf(h[0]).short) + (h.length > 1 ? ` 외 ${h.length - 1}` : '') : '없음'}</span></div>`; }).join('');
  const secs = Object.entries(per).sort((a, b) => (a[1].ok / a[1].all) - (b[1].ok / b[1].all)).map(([k, v]) => { const D = LIB.secs[k] || { n: k, ic: '', col: '#888' }, f = v.ok / v.all; return `<div style="margin:5px 0"><div style="display:flex;justify-content:space-between"><span>${D.ic} ${D.n}</span><span style="color:${f >= 1 ? 'var(--gold)' : 'var(--dim)'}">${v.ok} / ${v.all}</span></div><div style="height:7px;border-radius:4px;background:#0e1e24;overflow:hidden"><div style="height:100%;width:${Math.round(f * 100)}%;background:${D.col}"></div></div></div>`; }).join('');
  $('mapSide').innerHTML = `<h3 style="color:var(--gold);font-size:15px;margin-bottom:4px">👥 알바생</h3>${ppl}<h3 style="color:var(--gold);font-size:15px;margin:12px 0 4px">🏷 구역별 진열 <small style="color:var(--dim)">(덜 된 구역부터)</small></h3>${secs}<p style="color:var(--dim);margin-top:8px">남은 물건 ${S.left}개 · 완성한 칸 ${S.full}/${LIB.slots.length} · 틀린 구역 ${S.wrong}개</p>`;
}
function openMap() { mapSide(); drawMap($('mapCv'), 820, 560); $('ovMap').classList.remove('hide'); document.exitPointerLock(); }
async function leave() {
  if (!cleared()) { sfx('no'); return notice(`아직 남은 물건이 ${status().left}개 있어요`); }
  await NET.tx('m/done', cur => cur ? undefined : { t: Date.now(), by: me.k });
}
function showEnd() {
  sendStat(99); const ms = ST.m.done.t - ST_T0, np = nPlayers(), per = ms / 1000 / LIB.items.length * np;
  const rank = per < 4 ? '🏆 이달의 사원!' : per < 6 ? '🥇 정규직 합격!' : per < 9 ? '🥈 믿음직한 알바생' : per < 14 ? '🥉 수습 연장' : '📦 창고 정리 담당';
  const best = +(localStorage.getItem('mt_best_' + LIB.key) || 0), nb = !best || ms < best; if (nb) localStorage.setItem('mt_best_' + LIB.key, ms);
  const stt = Object.assign({}, ST.stat, { [me.k]: { p: STAT.p, c: STAT.c, t: STAT.t, j: STAT.j, d: Math.round(STAT.d), u: STAT.u } });
  const rows = Object.entries(ST.players).map(([k, p]) => [p.nick, stt[k] || {}]).sort((a, b) => (b[1].c | 0) - (a[1].c | 0));
  sfx('win');
  memo('🎉 영업 준비 완료!', `엎어졌던 상품 <b>${LIB.items.length}</b>개가 모두 제자리를 찾았어요. 깔끔봇 3000 대신 우리가 해냈습니다!<br>걸린 시간 <b>${fmtT(ms)}</b>${nb ? ' <b style="color:#a82a1e">신기록!</b>' : ` (최고 기록 ${fmtT(best)})`} · 완성한 칸 ${status().full}개<div class="rank">${rank}</div><table><tr><th>알바생</th><th>맞게 넣음</th><th>던짐</th><th>점프</th><th>이동</th><th>스킬</th></tr>${rows.map(([n, s], i) => `<tr><td>${esc(n)}${i === 0 && rows.length > 1 ? ' 🏅' : ''}</td><td>${s.c | 0}</td><td>${s.t | 0}</td><td>${s.j | 0}</td><td>${s.d | 0}m</td><td>${s.u | 0}</td></tr>`).join('')}</table>`, '처음으로', () => { if (!NET.solo) NET.ref('players/' + me.k).remove(); location.href = location.pathname; });
}

// ════════════ 시작 · 루프 ════════════
let ST_T0 = 0;
async function startGame(o) {
  try { await Promise.race([document.fonts.load('20px Jua'), new Promise(r => setTimeout(r, 2500))]); } catch (e) {}
  $('home').classList.add('hide'); $('lobby').classList.add('hide'); $('loading').classList.remove('hide'); const ld = t => { $('ldTxt').textContent = t; };
  ld('원작 매장 배치를 불러오는 중…'); await loadMap(o.map);
  LIB = buildMart(o.map, o.seed); ST_T0 = o.t0; OPT.easy = !!o.easy;
  ld('진열대를 세우는 중…'); await new Promise(r => setTimeout(r, 30));
  for (const sl of LIB.slots) SLOTBOX[sl.s] = slotBox(sl); buildStore(); buildItems();
  ld('물리 엔진을 켜는 중…'); await initPhysics();
  if (o.prep) {   // 방장(혼자 하기 포함): 상품을 쏟아 물리로 쌓고 저장
    const out = await scatterAll(f => ld(`상품을 바닥에 쏟는 중… ${Math.round(f * 100)}%`));
    ld('매장 상태를 저장하는 중…'); const ks = Object.keys(out);
    for (let i = 0; i < ks.length; i += 400) { const part = {}; for (const k of ks.slice(i, i + 400)) part[k] = out[k]; await NET.update('it', part); }
    ST_T0 = Date.now(); if (!NET.solo) await NET.update('', { phase: 'play', t0: ST_T0 });
  }
  $('loading').classList.add('hide'); $('hud').classList.remove('hide');
  P.x = 0; P.z = LIB.store.Z0 + 3.0; P.yaw = Math.PI; camPose(false);
  NET.onChild('it', { add: onItem, chg: onItem, rem: k => onItem(k, null) });
  NET.onChild('sl', { add: onSlot, chg: onSlot, rem: k => onSlot(k, null) });
  NET.onVal('m', onMeta);
  for (const it of LIB.items) setItem(it.id); for (const k in IM) IM[k].mesh.instanceMatrix.needsUpdate = true;
  if (!NET.solo) {
    NET.onChild('mv', { add: (k, v) => { if (!ACT.has(+k)) { MV[k] = v; markItem(+k); } }, chg: (k, v) => { if (!ACT.has(+k)) MV[k] = v; }, rem: k => { delete MV[k]; markItem(+k); } });
    NET.ref('pos/' + me.k).onDisconnect().remove(); NET.ref('players/' + me.k).onDisconnect().remove();
    NET.onVal('players', v => { ST.players = v || {}; if (!ST.players[me.k]) toast('방에서 나왔어요'); isHost = room ? (room.host === me.k || !ST.players[room.host]) : isHost; syncOthers(); hudOthers(); hostChores(); });
    NET.onVal('host', v => { room = Object.assign(room || {}, { host: v }); isHost = v === me.k || !ST.players[v]; if (isHost && v !== me.k) NET.set('host', me.k); });
    NET.onVal('pos', v => { ST.pos = v || {}; syncOthers(); });
    NET.onVal('ping', v => { ST.ping = v || {}; });
    NET.onVal('stat', v => { ST.stat = v || {}; });
    NET.onVal('t0', v => { if (v) ST_T0 = v; });
  }
  hudProg(); hudHand(); hudAbil(); hudOthers();
  memo('📋 오늘의 업무 지시', `<b>${LIB.title}</b> (원작 배치) · 어젯밤 매장 정리 로봇 <b>깔끔봇 3000</b>이 "모든 진열은 일시적일 뿐"이라는 깨달음을 얻더니, 진열대의 상품을 몽땅 바닥에 쏟아 놓고 퇴근해 버렸습니다.<br><br>개점 전까지 바닥의 상품 <b>${LIB.items.length}개</b>를 <b>맞는 구역의 선반</b>에 다시 진열해 주세요. 칸 하나에는 <b>한 가지 상품만</b> 들어가고, 상품마다 칸이 꽉 차는 개수가 있어요.<br><br>가격표 색을 보세요: <b>흰색</b> = 구역은 맞지만 아직 모자람 · <b style="color:#c89a00">노랑</b> = 칸 완성(별 +1) · <b style="color:#c83a2a">빨강</b> = 틀린 구역.<br>맞게 넣을 때마다 알바비 ${won(LIB.gold)}을 줘요. 알바비로 <b>K 스킬</b>을 배우고, 별은 입구 옆 <b>ATM</b>에서 스티커로 바꾸세요.${NET.solo ? '' : '<br><br>동료에게는 <b>F</b> 로 위치를 알리고, 동료를 보고 <b>E</b> 를 누르면 상품을 건넬 수 있어요.'}<br><br>다 끝나면 <b>출입문</b>으로 가서 퇴근!`, '업무 시작!');
}
const clock = new THREE.Clock();
function loop() { requestAnimationFrame(loop); try { frame(Math.min(.05, clock.getDelta())); } catch (e) { if (!loop._err) { loop._err = 1; console.error(e); } } }
function frame(dt) {
  if (LIB) {
    if (locked) moveP(dt); else camPose(false);
    for (const k in OTHERS) { const O = OTHERS[k]; if (O.tx == null) continue; const f = Math.min(1, dt * 10); O.mesh.position.x += (O.tx - O.mesh.position.x) * f; O.mesh.position.y += (O.ty - O.mesh.position.y) * f; O.mesh.position.z += (O.tz - O.mesh.position.z) * f; O.mesh.rotation.y = O.tyaw; }
    tickSkills(dt); stepPhysics(dt); tickAnims(dt); tickFx(dt); flushItems(); flushTags(); handView(); aimUpdate(); drawPings(); sendPos(dt); if (!NET.solo) sendStat(dt);
    const t = performance.now() / 1000;
    if (cleared() && TARGETS.door) TARGETS.door.glass.material.emissiveIntensity = .4 + .35 * Math.sin(t * 4);
    if (cleared() && !shown.clear) { shown.clear = 1; sfx('win'); notice('✨ 모든 상품을 진열했어요! <b>출입문</b>으로 가서 퇴근하세요', 6000); }
    if (STATUS && STATUS.full > lastFull) { if (lastFull >= 0) hudProg(); lastFull = STATUS.full; }
    if (Math.floor(t * 4) !== loop._a) { loop._a = Math.floor(t * 4); hudAbil(); hudProg(); }
    const tm = $('tm'); if (tm) tm.textContent = '⏱ ' + fmtT((ST.m.done ? ST.m.done.t : Date.now()) - ST_T0);
  }
  renderer.render(scene, cam);
}
// 손에 든 맨 위 상품을 화면 오른쪽 아래에
let handMesh = null;
function handView() {
  if (!handDirty) return; handDirty = false;
  for (const k in SOLO_MESH) if (k.endsWith('|hand')) SOLO_MESH[k].visible = false;
  if (!P.hand.length || ANIM_HIDE.has(P.hand[0])) return; const id = P.hand[0], Pp = prodOf(id), m = soloMesh(id, 'hand'), mx = Math.max(Pp.w, Pp.h, Pp.d), sc = (.14 + mx * .4) / mx;
  EE.set(.15, -.5, 0); QQ.setFromEuler(EE); V1.set(.3, -.27, -.55); V2.set(Pp.w * sc, Pp.h * sc, Pp.d * sc); m.setMatrixAt(0, M4.compose(V1, QQ, V2)); m.instanceMatrix.needsUpdate = true; handMesh = m;
}
requestAnimationFrame(loop);
// 테스트용: 순서대로 맞는 칸에 바로 넣기 (손을 거치지 않음)
async function solve(n = 10) {
  let done = 0;
  for (const it of LIB.items) {
    if (done >= n) break; const s = st(it.id); if (s.w === 's' && LIB.slots[s.s].sec === LIB.prods[it.p].sec) continue; if (s.w === 'h') continue;
    const Sx = status(), pi = it.p, own = (Sx.byProd[pi] || []).find(q => accepts(q, pi) && LIB.slots[q].sec === LIB.prods[pi].sec);
    const target = own ?? LIB.slots.find(sl => sl.sec === LIB.prods[pi].sec && !Sx.slot[sl.s] && !slotIds(sl.s).length)?.s; if (target == null) continue;
    if (s.w === 's') { await NET.tx('sl/' + s.s, cur => { const a = cur ? String(cur).split(',').map(Number).filter(x => x !== it.id) : []; return a.length ? a.join(',') : null; }); }
    if (await placeItem(it.id, target, true, false)) done++;
  }
  return done;
}
window.mart = { ACTsize: () => ACT.size, fx: () => ({ anim: ANIM.length, fx: FX.length }), kick: (dx, dz, dt) => kickItems(dx, dz, dt), frame: (dt = .016) => frame(dt), get LIB() { return LIB; }, IT, SL, ST, P, NET: () => NET, status: () => { STATUS = null; return status(); }, pickItem, takeFromSlot, placeItem, throwTop, dropAll, useSkill, useAtm, solve, unstick, act, rayPick, get AIM() { return AIM; }, SKILL, openSkills, leave };
