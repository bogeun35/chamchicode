// ════════════ 마트 대소동 — 멀티 마트 정리 (규칙: Supermarket Chaos 게임 데이터·코드 기준) ════════════
// 선반 = 구역 하나 + 칸 9개(3단 × 3칸) · 칸 하나엔 한 상품만, 상품 크기만큼 정원 · 구역이 맞으면 알바비(상품당 1번)
// 가격표: 흰색 = 맞는 구역·개수 부족 / 노랑 = 칸 완성(별 +1) / 빨강 = 틀린 구역 · 별은 ATM 에서 스티커로 · 알바비로 스킬
// 모든 상품이 맞는 구역에 들어가면 출입문으로 가서 퇴근
import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
const $ = id => document.getElementById(id);
const esc = s => String(s == null ? '' : s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const clamp = (v, a, b) => v < a ? a : v > b ? b : v;
function toast(m, ms) { const t = $('toast'); t.textContent = m; t.classList.add('on'); clearTimeout(toast._t); toast._t = setTimeout(() => t.classList.remove('on'), ms || 2400); }
function notice(m, ms) { const t = $('notice'); t.innerHTML = m; t.classList.add('on'); clearTimeout(notice._t); notice._t = setTimeout(() => t.classList.remove('on'), ms || 3000); }
function reward(m) { const t = $('reward'); t.innerHTML = m; t.classList.remove('on'); void t.offsetWidth; t.classList.add('on'); clearTimeout(reward._t); reward._t = setTimeout(() => t.classList.remove('on'), 900); }
function rng(seed) { let s = seed >>> 0 || 1; const f = () => { s = (s + 0x6D2B79F5) >>> 0; let t = s; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; f.i = (a, b) => a + Math.floor(f() * (b - a + 1)); return f; }
const shuffle = (a, R) => { for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(R() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; };
const won = n => Math.round(n).toLocaleString('ko-KR') + '원';
const DATA = window.MART_DATA, ORDER = window.MART_ORDER, SECI = {}; DATA.forEach((s, i) => { SECI[s.k] = i; });
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
  else if (k === 'atm') [600, 640, 600, 640].forEach((f, i) => tone(f, f, .07, 'square', .04, i * .12));
  else if (k === 'win') [523, 659, 784, 1047, 1319].forEach((f, i) => tone(f, f, .25, 'triangle', .12, i * .09));
  else if (k === 'fail') tone(300, 90, .45, 'sawtooth', .06);
  else if (k === 'ping') { tone(1200, 1200, .08, 'sine', .1); tone(1600, 1600, .1, 'sine', .08, .08); }
}

// ════════════ 매장 배치 (같은 시드면 모든 사람이 같은 마트·같은 상품 더미) ════════════
// 곤돌라(양면 진열대) 한 면 = 원작의 선반 하나: 폭 2m, 3단 × 3칸 = 9칸 (편의점 높이 1.4m)
const SLOT = { w: .62, h: .34, d: .4 }, TIER = [.16, .56, .96], COLX = [-.66, 0, .66], FACE_W = 2.0, UNIT_D = .9, AISLE = 2.1, PITCH = UNIT_D + AISLE, CROSS = 2.6, GON_H = 1.42, CEIL = 3.2;
// 크기: 면 수 → 줄 수 R · 줄마다 곤돌라 K · 가로 통로 위치 gap · 구역마다 면 수
const SIZES = { 8: { R: 2, K: 2, gap: 0, secs: [2, 2, 2, 2] }, 16: { R: 2, K: 4, gap: 2, secs: Array(8).fill(2) }, 32: { R: 4, K: 4, gap: 2, secs: Array(16).fill(2) }, 56: { R: 4, K: 7, gap: 4, secs: Array(16).fill(3).concat(Array(4).fill(2)) } };
// 칸 정원: 상품 크기로 가로·앞뒤·쌓기 개수 (앞뒤·쌓기는 3줄까지, 2~12개)
function layOf(w, h, d) { const e = 1e-6, nx = Math.max(1, Math.floor((SLOT.w + .02) / (w + .02) + e)), ny = Math.min(3, Math.max(1, Math.floor(SLOT.h / (h + .01) + e))), nz = Math.min(3, Math.max(1, Math.floor(SLOT.d / (d + .02) + e))); return { nx, ny, nz, cap: clamp(nx * ny * nz, 2, 12) }; }
const ATM_DEF = [{ n: '평범한 ATM', c: '#d83a3a', cost: 20, ch: 51 }, { n: '고급 ATM', c: '#3a6ad8', cost: 40, ch: 95 }, { n: '한방 ATM', c: '#2a9a4a', cost: 4, ch: 10 }];   // 원작 ATM 3대의 별 개수·성공 확률
function buildMart(size, seed) {
  const R = rng(seed), cfg = SIZES[size] || SIZES[16], Lx = cfg.K * FACE_W + (cfg.gap ? CROSS : 0);
  const units = [];
  for (let r = 0; r < cfg.R; r++) { const z = (r - (cfg.R - 1) / 2) * PITCH; for (let j = 0; j < cfg.K; j++) units.push({ r, j, x: -Lx / 2 + j * FACE_W + FACE_W / 2 + (cfg.gap && j >= cfg.gap ? CROSS : 0), z }); }
  // 통로마다: 앞줄의 뒷면 → 뒷줄의 앞면 순서로 면을 늘어놓고, 구역을 차례로 붙임 (같은 구역은 한 통로에 나란히)
  const faces = [];
  for (let a = 0; a <= cfg.R; a++) {
    for (const u of units.filter(u => u.r === a - 1).sort((p, q) => p.x - q.x)) faces.push({ x: u.x, z: u.z + UNIT_D / 2, f: 1, a });
    for (const u of units.filter(u => u.r === a).sort((p, q) => p.x - q.x)) faces.push({ x: u.x, z: u.z - UNIT_D / 2, f: -1, a });
  }
  const secKeys = shuffle(ORDER.slice(0, cfg.secs.length), R), secs = [];
  let fi = 0; secKeys.forEach((k, n) => { const ci = SECI[k], fs = []; for (let m = 0; m < cfg.secs[n]; m++) { faces[fi].sec = ci; faces[fi].i = fi; fs.push(fi); fi++; } secs.push({ ci, faces: fs, aisle: faces[fs[0]].a + 1 }); });
  const slots = []; faces.forEach((F, i) => { for (let t = 0; t < 3; t++) for (let c = 0; c < 3; c++) slots.push({ s: slots.length, face: i, t, c, sec: F.sec }); });
  // 상품: 구역 칸 수만큼 서로 다른 상품 (브랜드 × 상품 틀), 상품마다 칸 하나를 꼭 채우는 개수
  const prods = [];
  for (const S of secs) {
    const D = DATA[S.ci], n = S.faces.length * 9;
    let picks;
    if (D.produce) picks = shuffle(D.t.map((t, ti) => ({ ti, bi: -1 })), R).slice(0, n);
    else { const all = []; D.b.forEach((b, bi) => D.t.forEach((t, ti) => all.push({ ti, bi }))); picks = shuffle(all, R).slice(0, n); }
    for (const { ti, bi } of picks) {
      const t = D.t[ti], br = bi >= 0 ? D.b[bi] : null, L = layOf(t[2], t[3], t[4]);
      const pc = new THREE.Color(D.produce ? t[5] : D.pal[(bi + ti) % D.pal.length]); if (!D.produce) pc.offsetHSL((R() - .5) * .03, 0, (R() - .5) * .06);
      prods.push({ i: prods.length, sec: S.ci, name: br ? `${br[0]} ${t[0]}` : t[0], short: t[0], brand: br ? br[0] : '', sh: t[1], w: t[2], h: t[3], d: t[4], ic: D.produce ? '' : t[5], price: Math.round(t[6] * (.88 + R() * .3) / 10) * 10, pack: '#' + pc.getHexString(), acc: br ? br[1] : '#ffffff', lay: L, cap: L.cap, promo: R() < .2 ? (R() < .5 ? '1+1' : '2+1') : '' });
    }
  }
  const items = []; for (const P of prods) for (let k = 0; k < P.cap; k++) items.push({ id: items.length, p: P.i });
  // 매장 크기 · 앞쪽 계산대 구역 · 뒤쪽 냉장고
  const zF = -(cfg.R - 1) / 2 * PITCH - UNIT_D / 2, zB = (cfg.R - 1) / 2 * PITCH + UNIT_D / 2;
  const store = { X0: -Lx / 2 - 2.4, X1: Lx / 2 + 2.4, Z0: zF - AISLE - 4.4, Z1: zB + AISLE + 1.0 };
  const counter = { x0: store.X1 - 2.2, x1: store.X1 - 1.5, z0: store.Z0 + .9, z1: store.Z0 + 3.4 };   // 편의점 계산대 (문 오른쪽)
  const checkouts = []; if (size >= 32) for (let k = 0; k < 2; k++) checkouts.push({ x: -3 - k * 2.6, z: store.Z0 + 2.2 });
  const bar = size <= 16 ? { x0: -1.35 - Math.min(4, Lx / 2 + .6), x1: -1.5 } : null, chest = size <= 16 ? { x: store.X0 + 2.0, z: store.Z0 + 3.0 } : { x: 2.6, z: store.Z0 + 2.4 };
  const atms = ATM_DEF.map((A, i) => Object.assign({}, A, { i, x: store.X0 + .3, z: store.Z0 + 1.2 + i * .95, cost: Math.max(1, Math.round(A.cost * clamp(slots.length / 300, .2, 1))) }));
  // 바닥 더미: 통로 곳곳에 무더기로 쏟아진 모습 (쌓임 높이 격자)
  const block = units.map(u => [u.x - FACE_W / 2 - .6, u.z - UNIT_D / 2, u.x + FACE_W / 2 + .6, u.z + UNIT_D / 2]);
  const inBlock = (x, z, m) => block.some(b => x > b[0] - m && x < b[2] + m && z > b[1] - m && z < b[3] + m);
  const zone = [store.X0 + .6, zF - AISLE + .2, store.X1 - .6, store.Z1 - 1.2];
  const centers = [], nCl = Math.max(6, Math.ceil(items.length / 38));
  for (let k = 0, tries = 0; k < nCl && tries < 5000; tries++) { const x = zone[0] + R() * (zone[2] - zone[0]), z = zone[1] + R() * (zone[3] - zone[1]); if (inBlock(x, z, .55)) continue; centers.push([x, z]); k++; }
  const H = new Map(), cell = .1, key = (a, b) => a * 100003 + b;
  const order = shuffle(items.map(it => it.id), R);
  order.forEach((id, n) => {
    const P = prods[items[id].p], lie = P.h > 1.8 * Math.max(P.w, P.d) && R() < .55, hx = (lie ? Math.max(P.h, P.d) : Math.max(P.w, P.d)) / 2 * .85, hg = lie ? P.w : P.h;
    let best = null;
    for (let tr = 0; tr < 10; tr++) {
      const c = centers[(n + tr * 7) % centers.length], a = R() * 6.283, rr = .15 + .95 * Math.sqrt(R()), x = c[0] + Math.cos(a) * rr, z = c[1] + Math.sin(a) * rr;
      if (inBlock(x, z, .12) || x < store.X0 + .3 || x > store.X1 - .3 || z < zone[1] - .3 || z > store.Z1 - 1.1) continue;
      let y = 0; for (let i = Math.floor((x - hx) / cell); i <= Math.floor((x + hx) / cell); i++) for (let j = Math.floor((z - hx) / cell); j <= Math.floor((z + hx) / cell); j++) y = Math.max(y, H.get(key(i, j)) || 0);
      if (y > .85) continue; best = [x, y, z]; break;
    }
    if (!best) { const c = centers[n % centers.length]; best = [c[0], 0, c[1]]; }
    const [x, y, z] = best; for (let i = Math.floor((x - hx) / cell); i <= Math.floor((x + hx) / cell); i++) for (let j = Math.floor((z - hx) / cell); j <= Math.floor((z + hx) / cell); j++) H.set(key(i, j), y + hg * .92);
    items[id].start = [+x.toFixed(3), +y.toFixed(3), +z.toFixed(3), +(R() * 6.283).toFixed(2), lie ? 1 : 0];
  });
  const gold = Math.max(100, Math.round(100 * clamp(2400 / items.length, 1, 4) / 10) * 10);   // 원작: 맞게 넣으면 $0.1 (작은 마트는 스킬을 살 수 있게 올려 줌)
  return { size, seed, cfg, Lx, units, faces, secs, slots, prods, items, store, checkouts, counter, bar, chest, atms, gold, door: { x: 0, z: store.Z0 } };
}
// 면 좌표 → 세계 좌표 (면 앞쪽 = 통로 = 지역 +z)
const fw = (F, lx, ly, lz) => [F.x + F.f * lx, ly, F.z + F.f * lz];
function slotItemPos(sl, P, k) {   // 칸 안 k번째 자리: 앞줄 왼쪽부터 → 뒷줄 → 위층
  const L = P.lay, ix = k % L.nx, iz = Math.floor(k / L.nx) % L.nz, iy = Math.floor(k / (L.nx * L.nz)), px = Math.min(SLOT.w / L.nx, P.w + .035);
  return fw(LIB.faces[sl.face], COLX[sl.c] + (ix - (L.nx - 1) / 2) * px, TIER[sl.t] + iy * (P.h + .006) + P.h / 2, -.03 - P.d / 2 - iz * (P.d + .02));
}
function slotBox(sl) { const F = LIB.faces[sl.face], a = fw(F, COLX[sl.c] - .32, TIER[sl.t], -.43), b = fw(F, COLX[sl.c] + .32, TIER[sl.t] + .36, .02); return [Math.min(a[0], b[0]), a[1], Math.min(a[2], b[2]), Math.max(a[0], b[0]), b[1], Math.max(a[2], b[2])]; }

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
let size = 16, room = null, code = null, isHost = false, easy = false;
const OPT = { easy: false };
$('easySeg').onclick = e => { const b = e.target.closest('button'); if (!b) return; easy = b.dataset.v === '1'; [...$('easySeg').children].forEach(x => x.classList.toggle('on', x === b)); };
$('nick').value = localStorage.getItem('mt_nick') || '';
$('sizeSeg').onclick = e => { const b = e.target.closest('button'); if (!b) return; size = +b.dataset.v; [...$('sizeSeg').children].forEach(x => x.classList.toggle('on', x === b)); };
const getNick = () => { let n = $('nick').value.trim(); if (n.length < 2) n = '알바' + Math.floor(Math.random() * 900 + 100); localStorage.setItem('mt_nick', n); return n; };
$('btnSolo').onclick = () => { const n = getNick(); me = { k: 'me', nick: n, col: PCOL[0] }; NET = localNet(); isHost = true; ST.players = { me: { nick: n, col: 0 } }; startGame({ seed: (Math.random() * 1e9) | 0, size, t0: Date.now(), easy }); };
$('btnCreate').onclick = async () => {
  if (!db) return toast('온라인 연결이 안 돼요 — 혼자 하기로 해 보세요');
  const n = getNick(); code = genCode(); me = { k: keyOf(n), nick: n }; isHost = true; NET = fbNet(code);
  await NET.ref('').set({ host: me.k, created: Date.now(), expiresAt: Date.now() + 6 * 3600e3, phase: 'lobby', size, easy, players: { [me.k]: { nick: n, col: 0, ready: true, at: Date.now() } } });
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
  let lb = { players: null, host: null, phase: null, size: 16, easy: false, seed: 0, t0: 0 }, starting = 0; const want = ['players', 'host', 'phase', 'size', 'easy', 'seed', 't0'];
  const upd = () => { const r = lb; room = r; if (!r.players) { toast('방이 사라졌어요'); setTimeout(() => location.reload(), 1200); return; } if (!r.players[me.k]) { toast('방에서 나왔어요'); setTimeout(() => location.reload(), 1200); return; }
    isHost = r.host === me.k || !r.players[r.host]; if (isHost && r.host !== me.k) NET.set('host', me.k);
    me.col = PCOL[r.players[me.k].col % 8];
    if (r.phase === 'play' && r.seed && !LIB && !starting) { starting = 1; setTimeout(() => { const q = lb; want.forEach(k => NET.ref(k).off()); ST.players = q.players; startGame({ seed: q.seed, size: q.size, t0: q.t0 || Date.now(), easy: !!q.easy }); }, 120); return; }
    if (!LIB) renderLobby(r); };
  const got = new Set();
  want.forEach(k => NET.ref(k).on('value', s => { lb[k] = s.val(); got.add(k); if (got.size === want.length) upd(); }));
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
$('lbStart').onclick = () => { if (!isHost) return; NET.update('', { it: null, sl: null, m: null, pos: null, ping: null, stat: null, seed: (Math.random() * 1e9) | 0, t0: Date.now(), phase: 'play' }); };
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
const sbox = (x0, y0, z0, x1, y1, z1, c, o = {}) => { const b = [Math.min(x0, x1), Math.min(y0, y1), Math.min(z0, z1), Math.max(x0, x1), Math.max(y0, y1), Math.max(z0, z1)]; (o.light ? SBL : SB).push({ b, c }); if (o.solid) solids.push(b); if (o.occ) OCC.push(b); return b; };
const fbox = (F, x0, y0, z0, x1, y1, z1, c, o) => { const a = fw(F, x0, y0, z0), b = fw(F, x1, y1, z1); return sbox(a[0], a[1], a[2], b[0], b[1], b[2], c, o); };
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
  const S = LIB.store, W = S.X1 - S.X0, D = S.Z1 - S.Z0, HF = FACE_W / 2, cx = (S.X0 + S.X1) / 2, cz = (S.Z0 + S.Z1) / 2;
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
  // 곤돌라 (양면 진열대, 편의점 높이라 너머가 보임)
  const slat = slatTex(), slatM = new THREE.MeshStandardMaterial({ map: slat, roughness: .6 });
  for (const u of LIB.units) {
    const x0 = u.x - HF, x1 = u.x + HF, z0 = u.z - UNIT_D / 2, z1 = u.z + UNIT_D / 2;
    sbox(x0, 0, z0, x1, .12, z1, '#4a5054', { occ: 1 });
    const bp = new THREE.Mesh(new THREE.BoxGeometry(FACE_W, GON_H - .18, .05), slatM); bp.position.set(u.x, .12 + (GON_H - .18) / 2, u.z); scene.add(bp); OCC.push([x0, .12, u.z - .025, x1, GON_H - .06, u.z + .025]);
    sbox(x0 - .04, 0, z0, x0, GON_H, z1, '#f4f6f6', { occ: 1 }); sbox(x1, 0, z0, x1 + .04, GON_H, z1, '#f4f6f6', { occ: 1 }); sbox(x0 - .04, GON_H - .05, z0, x1 + .04, GON_H, z1, '#e4e8ea', { occ: 1 });
    solids.push([x0 - .04, 0, z0, x1 + .04, GON_H, z1]);
    // 끝 매대: 행사 상품 쌓아 둔 작은 진열대 + "행사" 카드
    for (const sx of [-1, 1]) { const ex = sx < 0 ? x0 - .04 : x1 + .04, e0 = Math.min(ex, ex + sx * .5), e1 = Math.max(ex, ex + sx * .5); sbox(e0, 0, z0 + .05, e1, .55, z1 - .05, '#ffffff', { solid: 1, occ: 1 }); sbox(e0, .48, z0 + .05, e1, .55, z1 - .05, BRAND);
      const Pp = LIB.prods[(u.r * 7 + u.j * 3 + (sx > 0 ? 1 : 0)) % LIB.prods.length]; for (let i = 0; i < 6; i++) sbox(e0 + .04 + (i % 2) * .22, .55 + Math.floor(i / 2) * .16, z0 + .12 + (i % 3) * .24, e0 + .24 + (i % 2) * .22, .69 + Math.floor(i / 2) * .16, z0 + .32 + (i % 3) * .24, i % 2 ? Pp.pack : Pp.acc);
      const pop = new THREE.Mesh(new THREE.PlaneGeometry(.42, .26), new THREE.MeshBasicMaterial({ map: POP(), side: THREE.DoubleSide })); pop.position.set(sx < 0 ? e0 + .02 : e1 - .02, 1.25, u.z); pop.rotation.y = Math.PI / 2; scene.add(pop); sbox(sx < 0 ? e0 + .015 : e1 - .025, .55, u.z - .005, sx < 0 ? e0 + .025 : e1 - .015, 1.12, u.z + .005, '#8a9aa0'); }
  }
  for (const F of LIB.faces) {
    const Dd = DATA[F.sec];
    fbox(F, -HF, .02, 0, HF, .12, .012, Dd.col);   // 아래 띠 = 구역 색
    for (let t = 0; t < 3; t++) { fbox(F, -HF, TIER[t] - .03, -.43, HF, TIER[t], 0, '#f8f8f8', { occ: 1 }); fbox(F, -HF, TIER[t] - .065, 0, HF, TIER[t], .014, shade(Dd.col, .32), { occ: 1 }); for (const dx of [-.33, .33]) fbox(F, dx - .005, TIER[t], -.42, dx + .005, TIER[t] + .06, 0, '#c4ccd0'); }
    for (const px of [-.55, .55]) fbox(F, px - .015, GON_H, -.3, px + .015, GON_H + .1, -.27, '#8a9aa0');
    const sg = new THREE.Mesh(new THREE.PlaneGeometry(1.3, .32), new THREE.MeshBasicMaterial({ map: SIGN(F.sec) })); const p = fw(F, 0, GON_H + .26, -.26); sg.position.set(p[0], p[1], p[2]); sg.rotation.y = F.f > 0 ? 0 : Math.PI; scene.add(sg);
  }
  // 통로 표지판 (천장에 매달림): 번호 + 그 통로의 구역
  const cfg = LIB.cfg;
  for (let a = 0; a <= cfg.R; a++) {
    const names = [...new Set(LIB.faces.filter(F => F.a === a).map(F => DATA[F.sec].n))], z = -(cfg.R - 1) / 2 * PITCH + (a - .5) * PITCH;
    const t = tex(512, 160, (x, w, h) => { x.fillStyle = '#1e5a62'; x.fillRect(0, 0, w, h); x.fillStyle = '#ffd84a'; x.fillRect(0, 0, 112, h); x.fillStyle = '#1e3a3e'; x.font = '78px Jua, sans-serif'; x.textAlign = 'center'; x.textBaseline = 'middle'; x.fillText(a + 1, 56, 84); x.textAlign = 'left'; x.fillStyle = '#fff'; x.font = '34px Jua, sans-serif'; const line = names.join(' · '); x.fillText(line.length > 18 ? line.slice(0, 17) + '…' : line, 128, 56); x.font = '24px Jua, sans-serif'; x.fillStyle = 'rgba(255,255,255,.75)'; x.fillText(`${a + 1}번 통로`, 128, 112); });
    const xs = cfg.gap ? [-(LIB.Lx / 2) / 2 - CROSS / 4, (LIB.Lx / 2) / 2 + CROSS / 4] : [0];
    for (const xx of xs) for (const ry of [0, Math.PI]) { const m = new THREE.Mesh(new THREE.PlaneGeometry(1.6, .5), new THREE.MeshBasicMaterial({ map: t })); m.position.set(xx, 2.62, z + (ry ? -.01 : .01)); m.rotation.y = ry; scene.add(m); }
    for (const xx of xs) sbox(xx - .01, 2.87, z - .01, xx + .01, CEIL, z + .01, '#8a9aa0');
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
const SIGNS = {}; const SIGN = ci => SIGNS[ci] || (SIGNS[ci] = signTex(DATA[ci].n, '', DATA[ci].col, DATA[ci].ic));

// ════════════ 상품 그리기: 모양별 단위 형상 + 아틀라스(포장 그림) + 인스턴스 uv ════════════
// 모든 상품을 모양 × 아틀라스 장 단위의 InstancedMesh 몇 개로 그림 (원작급 4500개도 가볍게)
const ATL = { S: 2048, C: 128 }; ATL.per = (ATL.S / ATL.C) ** 2;
const TAG = { S: 2048, W: 128, H: 40 }; TAG.cols = TAG.S / TAG.W;
const EMOJI = '"Segoe UI Emoji","Apple Color Emoji","Noto Color Emoji",sans-serif';
function uvPatch(mat) {
  mat.onBeforeCompile = sh => { sh.vertexShader = sh.vertexShader.replace('#include <uv_pars_vertex>', '#include <uv_pars_vertex>\nattribute vec4 aUv;').replace('#include <uv_vertex>', '#include <uv_vertex>\n#ifdef USE_MAP\nvMapUv = aUv.xy + uv * aUv.zw;\n#endif'); };
  mat.customProgramCacheKey = () => 'auv'; return mat;
}
// 단위 형상: 가운데 원점, 1×1×1 · uv 는 칸 안 좌표 (v 0.14~1 = 포장 그림, v 0~0.12 = 뚜껑·옆 단색)
function remap(g, idxs, u0, u1, v0, v1) { const uv = g.attributes.uv; for (const i of idxs) uv.setXY(i, u0 + uv.getX(i) * (u1 - u0), v0 + uv.getY(i) * (v1 - v0)); }
const LAB = [0, 1, .14, 1], CAPR = [.05, .95, .01, .11];
function groupVerts(g, gi) { const out = new Set(), idx = g.index, gr = g.groups[gi]; for (let k = gr.start; k < gr.start + gr.count; k++) out.add(idx ? idx.getX(k) : k); return [...out]; }
function unitize(g) { g.computeBoundingBox(); const b = g.boundingBox, s = new THREE.Vector3().subVectors(b.max, b.min), c = new THREE.Vector3().addVectors(b.max, b.min).multiplyScalar(.5); g.translate(-c.x, -c.y, -c.z); g.scale(1 / s.x, 1 / s.y, 1 / s.z); g.computeVertexNormals(); return g; }
function boxGeo(topLabel) { const g = new THREE.BoxGeometry(1, 1, 1); const f = i => [i * 4, i * 4 + 1, i * 4 + 2, i * 4 + 3]; remap(g, [...f(4), ...f(5)], ...LAB); remap(g, [...f(0), ...f(1)], .3, .7, .14, 1); if (topLabel) { remap(g, f(2), ...LAB); remap(g, f(3), ...CAPR); } else remap(g, [...f(2), ...f(3)], ...CAPR); return g; }
function cylGeo(rt, rb, seg) { const g = new THREE.CylinderGeometry(rt, rb, 1, seg); remap(g, groupVerts(g, 0), ...LAB); remap(g, [...groupVerts(g, 1), ...groupVerts(g, 2)], ...CAPR); return g; }
const GEO = {};
function geoOf(sh) {
  const k = { bag: 'box', book: 'box', jug: 'box' }[sh] || sh; if (GEO[k]) return [k, GEO[k]];
  let g;
  if (k === 'box') g = boxGeo(false);
  else if (k === 'tray') g = boxGeo(true);
  else if (k === 'carton') { const body = boxGeo(false).toNonIndexed(); body.scale(1, .82, 1); body.translate(0, -.09, 0); const top = new THREE.CylinderGeometry(.7071, .7071, 1, 3, 1); top.rotateZ(Math.PI / 2); top.rotateX(-Math.PI / 2); top.scale(1, .17, .8165); top.translate(0, .38, 0); const tg = top.toNonIndexed(); remap(tg, [...Array(tg.attributes.position.count).keys()], ...CAPR); g = mergeGeometries([body, tg]); }
  else if (k === 'bottle') { const body = cylGeo(.5, .5, 18).toNonIndexed(); body.scale(1, .6, 1); body.translate(0, .3, 0); const pts = [[.5, .6], [.44, .68], [.24, .8], [.19, .86], [.19, .9], [.22, .9], [.22, 1], [0, 1]].map(([r, y]) => new THREE.Vector2(r, y)); const nk = new THREE.LatheGeometry(pts, 18).toNonIndexed(); remap(nk, [...Array(nk.attributes.position.count).keys()], ...CAPR); g = mergeGeometries([body, nk]); }
  else if (k === 'can') g = cylGeo(.5, .5, 18);
  else if (k === 'jar') { const a = cylGeo(.47, .5, 18).toNonIndexed(); a.scale(1, .8, 1); a.translate(0, -.1, 0); const b = new THREE.CylinderGeometry(.5, .5, .2, 18).toNonIndexed(); remap(b, [...Array(b.attributes.position.count).keys()], ...CAPR); b.translate(0, .4, 0); g = mergeGeometries([a, b]); }
  else if (k === 'cup') g = cylGeo(.5, .38, 18);
  else if (k === 'tub') g = cylGeo(.5, .45, 18);
  else if (k === 'tri') { g = new THREE.CylinderGeometry(.5, .5, 1, 3, 1, false, Math.PI); remap(g, groupVerts(g, 0), ...CAPR); remap(g, [...groupVerts(g, 1), ...groupVerts(g, 2)], 0, 1, .14, 1); g.rotateX(Math.PI / 2); }
  else if (k === 'ball') { g = new THREE.SphereGeometry(.5, 16, 12); remap(g, [...Array(g.attributes.position.count).keys()], ...LAB); }
  return [k, GEO[k] = unitize(g)];
}
function lum(hex) { const c = new THREE.Color(hex); return .3 * c.r + .59 * c.g + .11 * c.b; }
function shade(hex, f) { const c = new THREE.Color(hex); c.offsetHSL(0, 0, f); return '#' + c.getHexString(); }
function wrapText(x, s, w) { const out = []; let cur = ''; for (const ch of s) { if (x.measureText(cur + ch).width > w && cur) { out.push(cur); cur = ch.trim() ? ch : ''; } else cur += ch; } if (cur) out.push(cur); return out; }
const TRAY_IC = [['포도', '🍇'], ['딸기', '🍓'], ['토마토', '🍅'], ['바나나', '🍌']];
function drawCell(x, ox, oy, P) {   // 포장 그림: 구역마다 같은 색 계열·같은 무늬, 브랜드 띠·그림·이름으로 구별
  const C = ATL.C, D = DATA[P.sec]; x.save(); x.beginPath(); x.rect(ox, oy, C, C); x.clip();
  if (D.produce) {
    if (P.sh === 'tray') { x.fillStyle = '#eef6f2'; x.fillRect(ox, oy, C, C); x.fillStyle = P.pack; x.globalAlpha = .55; x.fillRect(ox + 6, oy + 20, C - 12, 82); x.globalAlpha = 1; x.font = `52px ${EMOJI}`; x.textAlign = 'center'; x.textBaseline = 'middle'; x.fillText((TRAY_IC.find(([k]) => P.name.includes(k)) || [0, '🍒'])[1], ox + C / 2, oy + 58); x.fillStyle = '#2a8a4a'; x.fillRect(ox + 24, oy + 90, 80, 18); x.fillStyle = '#fff'; x.font = '14px Jua, sans-serif'; x.fillText('국산 · 신선', ox + C / 2, oy + 100); }
    else { const g = x.createRadialGradient(ox + C * .38, oy + C * .35, 4, ox + C / 2, oy + C / 2, C * .75); g.addColorStop(0, shade(P.pack, .14)); g.addColorStop(1, shade(P.pack, -.12)); x.fillStyle = g; x.fillRect(ox, oy, C, C); const r = rng(P.i * 7 + 3); x.strokeStyle = shade(P.pack, -.06); x.lineWidth = 2; for (let i = 0; i < 6; i++) { x.beginPath(); const yy = oy + 14 + r() * 96; x.moveTo(ox, yy); x.bezierCurveTo(ox + 40, yy + (r() - .5) * 20, ox + 90, yy + (r() - .5) * 20, ox + C, yy); x.stroke(); } x.fillStyle = '#fffaf0'; x.beginPath(); x.ellipse(ox + C / 2, oy + 62, 18, 12, 0, 0, 6.29); x.fill(); x.fillStyle = '#2a8a4a'; x.font = '12px Jua, sans-serif'; x.textAlign = 'center'; x.textBaseline = 'middle'; x.fillText(P.name.slice(0, 2), ox + C / 2, oy + 63); }
    x.fillStyle = shade(P.pack, -.08); x.fillRect(ox, oy + 113, C, 15); x.restore(); return;
  }
  x.fillStyle = P.pack; x.fillRect(ox, oy, C, C);
  const g = x.createLinearGradient(ox, oy, ox + C, oy); g.addColorStop(0, 'rgba(0,0,0,.08)'); g.addColorStop(.35, 'rgba(255,255,255,.1)'); g.addColorStop(1, 'rgba(0,0,0,.1)'); x.fillStyle = g; x.fillRect(ox, oy, C, C);
  x.globalAlpha = .22; x.fillStyle = P.acc; x.strokeStyle = P.acc; x.lineWidth = 6;
  switch (D.st % 5) {   // 구역 무늬 (점 무늬는 안 씀)
    case 0: for (let i = 0; i < 3; i++) { x.beginPath(); for (let k = 0; k <= C; k += 8) x.lineTo(ox + k, oy + 40 + i * 26 + Math.sin(k / 14 + i) * 6); x.stroke(); } break;
    case 1: for (let k = -C; k < C; k += 22) { x.beginPath(); x.moveTo(ox + k, oy + C); x.lineTo(ox + k + C, oy); x.stroke(); } break;
    case 2: for (let i = 0; i < 12; i++) { x.beginPath(); x.moveTo(ox + C / 2, oy + 56); x.arc(ox + C / 2, oy + 56, C, i * .5236, i * .5236 + .26); x.fill(); } break;
    case 3: for (let i = 0; i < 4; i++) x.fillRect(ox, oy + 30 + i * 22, C, 8); break;
    case 4: for (let i = 0; i < 4; i++) { x.beginPath(); x.moveTo(ox, oy + 30 + i * 24); x.lineTo(ox + C / 2, oy + 44 + i * 24); x.lineTo(ox + C, oy + 30 + i * 24); x.stroke(); } break;
  }
  x.globalAlpha = 1;
  const dark = lum(P.pack) > .6, ink = dark ? '#1e2a30' : '#ffffff';
  x.fillStyle = P.acc; x.fillRect(ox, oy, C, 22); x.fillStyle = lum(P.acc) > .6 ? '#1e2a30' : '#fff'; x.font = '14px Jua, sans-serif'; x.textAlign = 'center'; x.textBaseline = 'middle'; x.fillText(P.brand, ox + C / 2, oy + 12);
  x.fillStyle = dark ? 'rgba(255,255,255,.75)' : 'rgba(0,0,0,.18)'; x.beginPath(); x.arc(ox + C / 2, oy + 54, 26, 0, 6.29); x.fill();
  x.font = `38px ${EMOJI}`; x.fillText(P.ic, ox + C / 2, oy + 56);
  x.fillStyle = ink; x.font = '15px Jua, sans-serif'; const ls = wrapText(x, P.short, C - 10).slice(0, 2); ls.forEach((l, i) => x.fillText(l, ox + C / 2, oy + (ls.length > 1 ? 88 : 96) + i * 16));
  x.fillStyle = shade(P.pack, -.12); x.fillRect(ox, oy + 113, C, 15); x.fillStyle = P.acc; x.fillRect(ox, oy + 113, C, 3);
  x.restore();
}
function drawTag(x, ox, oy, P) { const W = TAG.W, H = TAG.H; x.fillStyle = '#ffffff'; x.fillRect(ox, oy, W, H); x.fillStyle = DATA[P.sec].col; x.fillRect(ox, oy, 6, H); x.fillStyle = '#1e2a30'; x.font = '13px Jua, sans-serif'; x.textAlign = 'left'; x.textBaseline = 'middle'; let n = P.name; while (x.measureText(n).width > W - 14 && n.length > 2) n = n.slice(0, -1); x.fillText(n === P.name ? n : n.slice(0, -1) + '…', ox + 10, oy + 12); x.fillStyle = '#c82a1a'; x.font = '19px Jua, sans-serif'; x.textAlign = 'right'; x.fillText(won(P.price), ox + W - 6, oy + 29); if (P.promo) { x.fillStyle = '#ffd84a'; x.fillRect(ox + 6, oy + 20, 40, 18); x.fillStyle = '#c82a1a'; x.font = '15px Jua, sans-serif'; x.textAlign = 'center'; x.fillText(P.promo, ox + 26, oy + 30); } x.strokeStyle = 'rgba(0,0,0,.25)'; x.lineWidth = 2; x.strokeRect(ox + 1, oy + 1, W - 2, H - 2); }
const IM = {};   // 'geo|page' → { mesh, ids[], uv }
const ITEM_MESH = [];   // 상품 id → [meshKey, index]
let TAGM = null, MATS = [];
function buildItems() {
  const pages = Math.ceil(LIB.prods.length / ATL.per);
  for (let p = 0; p < pages; p++) {
    const t = tex(ATL.S, ATL.S, x => { for (let k = 0; k < ATL.per; k++) { const P = LIB.prods[p * ATL.per + k]; if (!P) break; drawCell(x, (k % (ATL.S / ATL.C)) * ATL.C, Math.floor(k / (ATL.S / ATL.C)) * ATL.C, P); } });
    t.anisotropy = 4; t.generateMipmaps = true; MATS.push(uvPatch(new THREE.MeshStandardMaterial({ map: t, roughness: .5, metalness: 0 })));
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
  const tg = new THREE.PlaneGeometry(.2, .0625); tg.setAttribute('aUv', new THREE.InstancedBufferAttribute(new Float32Array(LIB.slots.length * 4), 4));
  TAGM = new THREE.InstancedMesh(tg, uvPatch(new THREE.MeshBasicMaterial({ map: tt })), LIB.slots.length); TAGM.frustumCulled = false; scene.add(TAGM);
  for (const sl of LIB.slots) { TAGM.setMatrixAt(sl.s, HIDE); TAGM.setColorAt(sl.s, new THREE.Color(1, 1, 1)); }
  // 손에 든 상품 (카메라에 붙은 작은 인스턴스) · 날아가는 상품
  glowItems = new THREE.InstancedMesh(new THREE.BoxGeometry(1, 1, 1), new THREE.MeshBasicMaterial({ color: '#7af0ff', transparent: true, opacity: .35, depthWrite: false, depthTest: false, blending: THREE.AdditiveBlending }), 400); glowItems.count = 0; glowItems.renderOrder = 998; glowItems.frustumCulled = false; scene.add(glowItems);
  glowSlot = new THREE.Mesh(new THREE.BoxGeometry(1, 1, 1), new THREE.MeshBasicMaterial({ color: '#ffd84a', transparent: true, opacity: .3, depthWrite: false, depthTest: false })); glowSlot.renderOrder = 999; glowSlot.visible = false; scene.add(glowSlot);
}
let glowItems = null, glowSlot = null;
const HIDE = new THREE.Matrix4().makeScale(0, 0, 0), M4 = new THREE.Matrix4(), QQ = new THREE.Quaternion(), EE = new THREE.Euler(0, 0, 0, 'YXZ'), V1 = new THREE.Vector3(), V2 = new THREE.Vector3();
const SOLO_MESH = {};   // 'geo|page|용도' → 인스턴스 1개짜리 메시 (손 · 날아가는 상품)
function soloMesh(id, use) {
  const [key, i] = ITEM_MESH[id], src = IM[key], k = key + '|' + use;
  let m = SOLO_MESH[k]; if (!m) { const g = src.mesh.geometry.clone(); g.setAttribute('aUv', new THREE.InstancedBufferAttribute(new Float32Array(4), 4)); m = SOLO_MESH[k] = new THREE.InstancedMesh(g, src.mesh.material, 1); m.frustumCulled = false; (use === 'hand' ? cam : scene).add(m); }
  m.geometry.attributes.aUv.array.set(src.uv.subarray(i * 4, i * 4 + 4)); m.geometry.attributes.aUv.needsUpdate = true; m.visible = true; return m;
}

// ── 상태 읽기 ──
function st(id) { const v = IT[id]; if (!v) { const s = LIB.items[id].start; return { w: 'f', x: s[0], y: s[1], z: s[2], yaw: s[3], lie: s[4], g: 0 }; } const a = v.split(','), g = a[a.length - 1] === 'g' ? 1 : 0; if (a[0] === 'f') return { w: 'f', x: +a[1], y: +a[2], z: +a[3], yaw: +a[4], lie: +a[5], g }; if (a[0] === 'h') return { w: 'h', u: a[1], g }; return { w: 's', s: +a[1], g }; }
const gS = s => s.g ? ',g' : '';
const slotIds = s => SL[s] ? String(SL[s]).split(',').map(Number) : [];
const prodOf = id => LIB.prods[LIB.items[id].p];
const dirtyP = new Set(); let tagsDirty = true, gridDirty = true, STATUS = null;
function itemMatrix(id) {
  const s = st(id), P = prodOf(id);
  if (s.w === 'f') { EE.set(0, s.yaw, s.lie ? Math.PI / 2 : 0); QQ.setFromEuler(EE); V1.set(s.x, s.y + (s.lie ? P.w / 2 : P.h / 2), s.z); V2.set(P.w, P.h, P.d); return M4.compose(V1, QQ, V2); }
  if (s.w === 's') { const sl = LIB.slots[s.s], ids = slotIds(s.s); let k = ids.indexOf(id); if (k < 0) k = ids.length; if (k >= P.cap) k = P.cap - 1; const p = slotItemPos(sl, P, k); EE.set(0, LIB.faces[sl.face].f > 0 ? 0 : Math.PI, 0); QQ.setFromEuler(EE); V1.set(p[0], p[1], p[2]); V2.set(P.w, P.h, P.d); return M4.compose(V1, QQ, V2); }
  if (s.u === me.k || FLY.has(id)) return HIDE;
  const O = OTHERS[s.u]; if (!O || !O.mesh || (O.hand || [])[0] !== id) return HIDE;
  const ry = O.mesh.rotation.y; EE.set(0, ry, 0); QQ.setFromEuler(EE); V1.set(O.mesh.position.x - Math.sin(ry) * .38, O.mesh.position.y + 1.05, O.mesh.position.z - Math.cos(ry) * .38); V2.set(P.w, P.h, P.d); return M4.compose(V1, QQ, V2);
}
const touched = new Set();
function setItem(id) { const [key, i] = ITEM_MESH[id]; IM[key].mesh.setMatrixAt(i, itemMatrix(id)); touched.add(key); }
function flushItems() {
  if (dirtyP.size) { for (const it of LIB.items) if (dirtyP.has(it.p)) setItem(it.id); dirtyP.clear(); }
  for (const id of HELD_OTHERS) setItem(id);
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
    const F = LIB.faces[sl.face], p = fw(F, COLX[sl.c], TIER[sl.t] - .032, .02); EE.set(0, F.f > 0 ? 0 : Math.PI, 0); QQ.setFromEuler(EE); V1.set(p[0], p[1], p[2]); V2.set(1, 1, 1); TAGM.setMatrixAt(sl.s, M4.compose(V1, QQ, V2));
    const cx = (q.p % TAG.cols) * TAG.W, cy = Math.floor(q.p / TAG.cols) * TAG.H; uv.setXYZW(sl.s, cx / TAG.S, 1 - (cy + TAG.H) / TAG.S, TAG.W / TAG.S, TAG.H / TAG.S);
    TAGM.setColorAt(sl.s, !q.ok ? col.setRGB(1, .42, .4) : q.full ? col.setRGB(1, .86, .3) : col.setRGB(1, 1, 1));   // 빨강 · 노랑 · 흰색
  }
  TAGM.instanceMatrix.needsUpdate = true; TAGM.instanceColor.needsUpdate = true; uv.needsUpdate = true;
}
// 바닥 상품 격자 (조준용)
const GRID = new Map(); const gk = (x, z) => Math.floor(x) * 4099 + Math.floor(z);
function rebuildGrid() { GRID.clear(); for (const it of LIB.items) { const s = st(it.id); if (s.w !== 'f') continue; const k = gk(s.x, s.z); let a = GRID.get(k); if (!a) GRID.set(k, a = []); a.push(it.id); } gridDirty = false; }
function itemBox(id) { const s = st(id), P = prodOf(id); if (s.lie) { const r = Math.max(P.h, P.d) / 2; return [s.x - r, s.y, s.z - r, s.x + r, s.y + P.w, s.z + r]; } const r = Math.max(P.w, P.d) / 2; return [s.x - r, s.y, s.z - r, s.x + r, s.y + P.h, s.z + r]; }

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
  STAT.d += Math.hypot(P.x - ox, P.z - oz);
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
document.addEventListener('mousemove', e => { if (!locked) return; P.yaw -= e.movementX * .0022; P.pitch = clamp(P.pitch - e.movementY * .0022, -1.45, 1.45); });
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
  for (let k = 0; k <= steps; k++) { const px = o[0] + d[0] * k, pz = o[2] + d[2] * k; for (let i = -1; i <= 1; i++) for (let j = -1; j <= 1; j++) { const key = gk(px + i, pz + j); if (seen.has(key)) continue; seen.add(key); const a = GRID.get(key); if (a) for (const id of a) if (!FLY.has(id)) test(itemBox(id), { kind: 'item', id }); } }
  for (const A of TARGETS.atm) test(A.b, { kind: 'atm', i: A.i });
  test(TARGETS.door.b, { kind: 'door' });
  for (const k in OTHERS) { const m = OTHERS[k].mesh.position; test([m.x - .3, m.y, m.z - .3, m.x + .3, m.y + 1.9, m.z + .3], { kind: 'player', k }); }
  best.point = [o[0] + d[0] * best.t, o[1] + d[1] * best.t, o[2] + d[2] * best.t];
  return best;
}
function aimUpdate() {
  const h = rayPick(reach()); AIM = h.kind && h.kind !== 'occ' ? h : null;
  let html = '';
  if (AIM && AIM.kind === 'item') { const Pp = prodOf(AIM.id), D = DATA[Pp.sec]; html = `${esc(Pp.name)} <b style="color:var(--gold)">${won(Pp.price)}</b><small>${OPT.easy ? `${D.ic} ${D.n} · ${secAisles(Pp.sec)}번 통로` : '어느 구역 상품일까요?'}</small>`; }
  else if (AIM && AIM.kind === 'slot') {
    const sl = LIB.slots[AIM.s], D = DATA[sl.sec], q = status().slot[AIM.s];
    let sub = `${D.ic} ${D.n} 선반 · ${sl.t + 1}단 ${sl.c + 1}번 칸`;
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
const secAisles = ci => [...new Set(LIB.faces.filter(F => F.sec === ci).map(F => F.a + 1))].join('·');
function accepts(s, pi) { const ids = slotIds(s); if (!ids.length) return true; return LIB.items[ids[0]].p === pi && ids.length < LIB.prods[pi].cap; }
function handPick(s) { const ids = slotIds(s); if (!ids.length) return P.hand.length ? P.hand[0] : null; const pi = LIB.items[ids[0]].p; return P.hand.find(id => LIB.items[id].p === pi) ?? null; }   // 칸에 든 상품과 같은 걸 손에서 골라 넣음
const ghost = new THREE.Mesh(new THREE.BoxGeometry(1, 1, 1), new THREE.MeshBasicMaterial({ color: '#6ae46a', transparent: true, opacity: .4, depthWrite: false })); ghost.visible = false; scene.add(ghost);
function updateGhost() {
  if (AIM && AIM.kind === 'slot' && P.hand.length) {
    const id = handPick(AIM.s) ?? P.hand[0], Pp = prodOf(id), ok = accepts(AIM.s, Pp.i), sl = LIB.slots[AIM.s], n = Math.min(slotIds(AIM.s).length, Pp.cap - 1), p = slotItemPos(sl, Pp, n);
    ghost.position.set(p[0], p[1], p[2]); ghost.scale.set(Pp.w, Pp.h, Pp.d); ghost.rotation.set(0, 0, 0); ghost.material.color.set(ok ? '#6ae46a' : '#e84a3a'); ghost.visible = true;
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
  const ok = await NET.tx('it/' + id, cur => (cur || null) !== prev ? undefined : 'h,' + me.k + gS(s));
  PENDING.delete(id); if (!ok) { sfx('no'); return false; }
  if (!P.hand.includes(id)) P.hand.unshift(id); sendHand(); sfx('pick'); return true;
}
async function takeFromSlot(s) {
  if (full()) return; let taken = null;
  const ok = await NET.tx('sl/' + s, cur => { const a = cur ? String(cur).split(',') : []; if (!a.length) { taken = null; return undefined; } taken = +a[a.length - 1]; a.pop(); return a.length ? a.join(',') : null; });
  if (!ok || taken == null) { sfx('no'); return; }
  PENDING.add(taken); await NET.set('it/' + taken, 'h,' + me.k + gS(st(taken))); PENDING.delete(taken);
  if (!P.hand.includes(taken)) P.hand.unshift(taken); sendHand(); sfx('pick');
}
async function placeItem(id, s, quiet) {
  const pi = LIB.items[id].p, cap = LIB.prods[pi].cap; let n = 0;
  if (PENDING.has(id)) return false; PENDING.add(id);
  const ok = await NET.tx('sl/' + s, cur => { const a = cur ? String(cur).split(',').map(Number) : []; if (a.includes(id)) return undefined; if (a.length && LIB.items[a[0]].p !== pi) return undefined; if (a.length >= cap) return undefined; a.push(id); n = a.length; return a.join(','); });
  if (!ok) { PENDING.delete(id); if (!quiet) { sfx('no'); notice('이 칸에는 넣을 수 없어요'); } return false; }
  const sv = st(id), right = LIB.prods[pi].sec === LIB.slots[s].sec;
  P.hand = P.hand.filter(x => x !== id); FLY.delete(id);
  await NET.set('it/' + id, `s,${s}` + (sv.g || right ? ',g' : '')); PENDING.delete(id); sendHand(); STAT.p++;
  if (right) { STAT.c++; sfx('good'); if (!sv.g) grantGold(LIB.gold); if (n >= cap) { const got = await NET.tx('m/cs/' + s, cur => cur ? undefined : 1); if (got) { await NET.tx('m/stars', v => (v | 0) + 1); NET.tx('m/starAll', v => (v | 0) + 1); sfx('star'); reward('⭐ 칸 완성! 별 +1'); } } }
  else { sfx('bad'); if (!quiet) notice(`🟥 ${DATA[LIB.prods[pi].sec].n} 상품은 여기(${DATA[LIB.slots[s].sec].n})가 아니에요`, 2000); }
  return true;
}
function grantGold(base) {
  let mul = 1; for (const k of STK) if (k.e === 'mul' && stkN(k.id) && Math.random() * 100 < k.v) mul = Math.max(mul, k.x);
  const amt = base * mul; NET.tx('m/gold', v => (v | 0) + amt); reward(mul > 1 ? `💰 +${won(amt)} <small>(${mul}배!)</small>` : `+${won(amt)}`);
}
// 던지기: 포물선으로 날아가 바닥·선반 위에 떨어짐 · 덩크슛 중이면 맞는 칸에 닿을 때 바로 진열
const FLY = new Map();
function throwTop() {
  if (!P.hand.length) return; const id = P.hand.shift(); sendHand(); STAT.t++; sfx('throw');
  cam.getWorldDirection(V1); const sp = throwPow() * 1.25, o = [cam.position.x + V1.x * .35, cam.position.y - .12 + V1.y * .35, cam.position.z + V1.z * .35];
  let v = [V1.x * sp, V1.y * sp + 1.2, V1.z * sp], p = o.slice(), path = [p.slice()], res = null; const Pp = prodOf(id), dunk = SKILL.s21.on > 0;
  for (let k = 0; k < 600 && !res; k++) {
    const dt = 1 / 120, np = [p[0] + v[0] * dt, p[1] + v[1] * dt, p[2] + v[2] * dt]; v[1] -= 9.81 * dt;
    if (dunk) for (const sl of LIB.slots) { const b = SLOTBOX[sl.s]; if (np[0] > b[0] && np[0] < b[3] && np[1] > b[1] && np[1] < b[4] && np[2] > b[2] && np[2] < b[5] && sl.sec === Pp.sec && accepts(sl.s, Pp.i)) { res = { slot: sl.s }; break; } }
    if (res) break;
    let hit = null; for (const b of solids.concat(SLOTBOX)) if (np[0] > b[0] && np[0] < b[3] && np[1] > b[1] && np[1] < b[4] && np[2] > b[2] && np[2] < b[5]) { hit = b; break; }
    if (hit) { if (p[1] >= hit[4] - .02) res = { land: [np[0], hit[4], np[2]] }; else res = { fall: [p[0] - v[0] * .02, p[2] - v[2] * .02] }; break; }
    if (np[1] <= 0) { res = { land: [np[0], 0, np[2]] }; break; }
    p = np; if (k % 3 === 0) path.push(p.slice());
  }
  if (!res) res = { fall: [p[0], p[2]] };
  if (res.fall) { const S = LIB.store; res.land = [clamp(res.fall[0], S.X0 + .3, S.X1 - .3), 0, clamp(res.fall[1], S.Z0 + .3, S.Z1 - .3)]; res.land[1] = baseY(res.land[0], res.land[2], p[1]); }
  if (res.land) { const [x, y, z] = res.land, top = pileTop(x, z, y); res.land = [x, top, z]; path.push([x, top + Pp.h / 2, z]); }
  FLY.set(id, { path, t: 0, res, m: null }); markItem(id);
}
function baseY(x, z, below) { let y = 0; for (const s of solids) if (x > s[0] && x < s[3] && z > s[2] && z < s[5] && s[4] <= below + .05 && s[4] > y) y = s[4]; return y; }
function pileTop(x, z, base) { let y = base; for (const it of LIB.items) { const s = st(it.id); if (s.w !== 'f' || FLY.has(it.id)) continue; if (Math.abs(s.x - x) < .14 && Math.abs(s.z - z) < .14) { const P2 = prodOf(it.id), top = s.y + (s.lie ? P2.w : P2.h); if (top > y && top < base + 1.2) y = top; } } return y; }
function updateFly(dt) {
  for (const [id, F] of FLY) {
    F.t += dt * 60; const i = Math.min(F.path.length - 1, Math.floor(F.t)), q = F.path[i], Pp = prodOf(id);
    if (!F.m) F.m = soloMesh(id, 'fly' + (id % 3));
    EE.set(F.t * .2, F.t * .15, 0); QQ.setFromEuler(EE); V1.set(q[0], q[1], q[2]); V2.set(Pp.w, Pp.h, Pp.d); F.m.setMatrixAt(0, M4.compose(V1, QQ, V2)); F.m.instanceMatrix.needsUpdate = true;
    if (i >= F.path.length - 1) {
      F.m.visible = false; FLY.delete(id);
      if (F.res.slot != null) placeItem(id, F.res.slot, true).then(ok => { if (!ok) landAt(id, q[0], 0, q[2]); else reward('🏀 덩크슛!'); });
      else landAt(id, F.res.land[0], F.res.land[1], F.res.land[2]);
    }
  }
}
function landAt(id, x, y, z) { const s = st(id); NET.set('it/' + id, `f,${x.toFixed(2)},${y.toFixed(3)},${z.toFixed(2)},${(Math.random() * 6.28).toFixed(2)},0` + gS(s)); sfx('drop'); markItem(id); }
// Q: 짧게 = 던지기 · 길게 = 발밑에 전부 내려놓기
let qT = 0;
function qDown() { qT = performance.now(); setTimeout(() => { if (qT && KEY.KeyQ && performance.now() - qT >= 440) { dropAll(); qT = 0; } }, 460); }
function qUp() { if (qT && performance.now() - qT < 450) throwTop(); qT = 0; }
function dropAll() {
  if (!P.hand.length) return; const fx = P.x - Math.sin(P.yaw) * .6, fz = P.z - Math.cos(P.yaw) * .6, up = {}; let y = pileTop(fx, fz, baseY(fx, fz, P.y + .4));
  for (const id of P.hand) { const Pp = prodOf(id); up[id] = `f,${(fx + (Math.random() - .5) * .16).toFixed(2)},${y.toFixed(3)},${(fz + (Math.random() - .5) * .16).toFixed(2)},${P.yaw.toFixed(2)},0` + gS(st(id)); y += Pp.h; }
  P.hand = []; NET.update('it', up); sendHand(); sfx('drop');
}
async function giveItem(k) {
  if (!P.hand.length) return; const O = OTHERS[k]; if (!O) return;
  const id = P.hand[0], s = st(id), ok = await NET.tx('it/' + id, cur => cur === 'h,' + me.k + gS(s) ? 'h,' + k + gS(s) : undefined);
  if (!ok) return; P.hand.shift(); sendHand(); sfx('drop'); toast(`📦 ${(ST.players[k] || {}).nick || ''}님에게 상품을 건넸어요`);
}
function unstick() {   // 손이 닿지 않는 곳(곤돌라 위 · 진열대 속 · 매장 밖)의 상품을 입구 앞으로
  const S = LIB.store, up = {}; let n = 0;
  for (const it of LIB.items) { const s = st(it.id); if (s.w !== 'f') continue; const bad = s.y > 1.5 || s.x < S.X0 || s.x > S.X1 || s.z < S.Z0 || s.z > S.Z1 || solids.some(b => s.x > b[0] && s.x < b[3] && s.z > b[2] && s.z < b[5] && s.y < b[4] - .05 && s.y >= b[1]); if (!bad) continue; up[it.id] = `f,${(-1.5 + (n % 6) * .5).toFixed(2)},0,${(S.Z0 + 4.2 + Math.floor(n / 6) * .4).toFixed(2)},0,0` + gS(s); n++; }
  if (n) NET.update('it', up); toast(n ? `📦 끼인 물건 ${n}개를 입구 앞으로 모았어요` : '끼인 물건이 없어요');
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
  if (SKILL.s11.on > 0 && P.hand.length) { const pi = prodOf(P.hand[0]).i; for (const it of LIB.items) { if (n >= 400) break; if (it.p !== pi) continue; const s = st(it.id); if (s.w !== 'f' || FLY.has(it.id)) continue; const b = itemBox(it.id); M4.makeScale(b[3] - b[0] + .06, b[4] - b[1] + .06, b[5] - b[2] + .06); M4.setPosition((b[0] + b[3]) / 2, (b[1] + b[4]) / 2, (b[2] + b[5]) / 2); glowItems.setMatrixAt(n++, M4); } }
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
  for (const id in IT) { const v = IT[id]; if (v.startsWith('h,')) { const u = v.split(',')[1]; if (!ST.players[u]) { up[id] = `f,${(-1 + (n % 5) * .35).toFixed(2)},0,${(LIB.store.Z0 + 4.6).toFixed(2)},0,0` + (v.endsWith(',g') ? ',g' : ''); n++; } } }
  if (n) NET.update('it', up);
}
const cleared = () => status().left === 0;

// ════════════ 협동: 핑 ════════════
const PINGS = {};
function ping() {
  const h = rayPick(40); if (!h.kind) return;
  let txt = '여기!';
  if (h.kind === 'item') txt = `📦 ${prodOf(h.id).short}`; else if (h.kind === 'slot') txt = `${DATA[LIB.slots[h.s].sec].ic} ${DATA[LIB.slots[h.s].sec].n}`; else if (h.kind === 'atm') txt = '🏧 ATM'; else if (h.kind === 'door') txt = '🚪 출입문';
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
  $('hand').innerHTML = `<h4>손에 든 상품 <b>${P.hand.length} / ${cap}</b></h4><div class="hl">` + groups.slice(0, 9).map(g => { const Pp = LIB.prods[g.pi], D = DATA[Pp.sec]; return `<div class="hb ${g.top ? 'top' : ''}"><span class="pk" style="background:${Pp.pack};border-color:${Pp.acc}">${Pp.ic || '🍏'}</span><span class="nm">${esc(Pp.name)} <small>×${g.n} · ${Pp.cap}개짜리 칸</small></span>${OPT.easy ? `<span class="to" style="border-color:${D.col};background:${D.col}55">${D.ic} ${D.n} ${secAisles(Pp.sec)}통로</span>` : ''}</div>`; }).join('') + `</div><div class="hk">휠/R 바꾸기 · Q 던지기 (길게 = 발밑에 전부) · 진열할 땐 칸에 맞는 상품을 골라 넣어요</div>`;
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
  x.font = `${Math.round(s * .42)}px Jua, sans-serif`; x.textAlign = 'center'; x.textBaseline = 'middle';
  for (const F of LIB.faces) { const D = DATA[F.sec]; x.fillStyle = D.col; const z0 = F.f > 0 ? F.z - .5 : F.z, z1 = F.f > 0 ? F.z : F.z + .5; x.fillRect(X(F.x - 1.33), Z(z1), 2.66 * s, (z1 - z0) * s - 1); }
  for (const Sx of LIB.secs) { const fs = Sx.faces.map(i => LIB.faces[i]), cx = fs.reduce((a, F) => a + F.x, 0) / fs.length, F0 = fs[0], cz = F0.z + F0.f * .62; x.fillStyle = '#1e2a30'; x.fillText(`${DATA[Sx.ci].ic} ${DATA[Sx.ci].n}`, X(cx), Z(cz)); }
  x.fillStyle = '#5a6a70'; for (let a = 0; a <= LIB.cfg.R; a++) { const z = -(LIB.cfg.R - 1) / 2 * PITCH + (a - .5) * PITCH; x.fillText(`${a + 1}통로`, X(S.X0 + 1.2), Z(z)); }
  for (const C of LIB.checkouts) { x.fillStyle = '#b8c0c4'; x.fillRect(X(C.x - .35), Z(C.z + 1.1), .7 * s, 2.2 * s); }
  for (const A of LIB.atms) { x.fillStyle = A.c; x.fillRect(X(S.X0), Z(A.z + .36), .6 * s, .72 * s); } const K = LIB.counter; x.fillStyle = '#c8b8a0'; x.fillRect(X(K.x0), Z(K.z1), (K.x1 - K.x0) * s, (K.z1 - K.z0) * s); x.fillStyle = '#5a8ac8'; x.fillRect(X(S.X0), Z(S.Z1), (S.X1 - S.X0) * s, .8 * s); x.fillStyle = '#fff'; x.fillText('❄ 음료 냉장고', X((S.X0 + S.X1) / 2), Z(S.Z1 - .4));
  x.fillStyle = '#e8503a'; x.fillRect(X(-1.3), Z(S.Z0) - 5, 2.6 * s, 6); x.fillText('출입문', X(0), Z(S.Z0 + .8)); x.fillText('계산대', X((K.x0 + K.x1) / 2), Z(K.z1 + .4)); x.fillText('ATM', X(S.X0 + 1.1), Z(LIB.atms[1].z));
  for (const k in OTHERS) { const m = OTHERS[k].mesh.position; x.fillStyle = PCOL[((ST.players[k] || {}).col || 0) % 8]; x.beginPath(); x.arc(X(m.x), Z(m.z), 5, 0, 6.29); x.fill(); }
  x.fillStyle = '#e8503a'; x.beginPath(); x.arc(X(P.x), Z(P.z), 7, 0, 6.29); x.fill(); x.strokeStyle = '#e8503a'; x.lineWidth = 3; x.beginPath(); x.moveTo(X(P.x), Z(P.z)); x.lineTo(X(P.x - Math.sin(P.yaw) * 1.1), Z(P.z - Math.cos(P.yaw) * 1.1)); x.stroke();
  return c;
}
function openMap() { drawMap($('mapCv'), 820, 560); $('ovMap').classList.remove('hide'); document.exitPointerLock(); }
async function leave() {
  if (!cleared()) { sfx('no'); return notice(`아직 남은 물건이 ${status().left}개 있어요`); }
  await NET.tx('m/done', cur => cur ? undefined : { t: Date.now(), by: me.k });
}
function showEnd() {
  sendStat(99); const ms = ST.m.done.t - ST_T0, np = nPlayers(), per = ms / 1000 / LIB.items.length * np;
  const rank = per < 4 ? '🏆 이달의 사원!' : per < 6 ? '🥇 정규직 합격!' : per < 9 ? '🥈 믿음직한 알바생' : per < 14 ? '🥉 수습 연장' : '📦 창고 정리 담당';
  const best = +(localStorage.getItem('mt_best_' + LIB.size) || 0), nb = !best || ms < best; if (nb) localStorage.setItem('mt_best_' + LIB.size, ms);
  const stt = Object.assign({}, ST.stat, { [me.k]: { p: STAT.p, c: STAT.c, t: STAT.t, j: STAT.j, d: Math.round(STAT.d), u: STAT.u } });
  const rows = Object.entries(ST.players).map(([k, p]) => [p.nick, stt[k] || {}]).sort((a, b) => (b[1].c | 0) - (a[1].c | 0));
  sfx('win');
  memo('🎉 영업 준비 완료!', `엎어졌던 상품 <b>${LIB.items.length}</b>개가 모두 제자리를 찾았어요. 깔끔봇 3000 대신 우리가 해냈습니다!<br>걸린 시간 <b>${fmtT(ms)}</b>${nb ? ' <b style="color:#a82a1e">신기록!</b>' : ` (최고 기록 ${fmtT(best)})`} · 완성한 칸 ${status().full}개<div class="rank">${rank}</div><table><tr><th>알바생</th><th>맞게 넣음</th><th>던짐</th><th>점프</th><th>이동</th><th>스킬</th></tr>${rows.map(([n, s], i) => `<tr><td>${esc(n)}${i === 0 && rows.length > 1 ? ' 🏅' : ''}</td><td>${s.c | 0}</td><td>${s.t | 0}</td><td>${s.j | 0}</td><td>${s.d | 0}m</td><td>${s.u | 0}</td></tr>`).join('')}</table>`, '처음으로', () => { if (!NET.solo) NET.ref('players/' + me.k).remove(); location.href = location.pathname; });
}

// ════════════ 시작 · 루프 ════════════
let ST_T0 = 0;
async function startGame(o) {
  try { await Promise.race([document.fonts.load('20px Jua'), new Promise(r => setTimeout(r, 2500))]); } catch (e) {}
  LIB = buildMart(o.size, o.seed); ST_T0 = o.t0; OPT.easy = !!o.easy;
  $('home').classList.add('hide'); $('lobby').classList.add('hide'); $('hud').classList.remove('hide');
  buildStore(); for (const sl of LIB.slots) SLOTBOX[sl.s] = slotBox(sl); buildItems();
  for (const it of LIB.items) setItem(it.id); for (const k in IM) IM[k].mesh.instanceMatrix.needsUpdate = true;
  P.x = 0; P.z = LIB.store.Z0 + 3.4; P.yaw = Math.PI; camPose(false);
  NET.onChild('it', { add: onItem, chg: onItem, rem: k => onItem(k, null) });
  NET.onChild('sl', { add: onSlot, chg: onSlot, rem: k => onSlot(k, null) });
  NET.onVal('m', onMeta);
  if (!NET.solo) {
    NET.ref('pos/' + me.k).onDisconnect().remove(); NET.ref('players/' + me.k).onDisconnect().remove();
    NET.onVal('players', v => { ST.players = v || {}; if (!ST.players[me.k]) toast('방에서 나왔어요'); isHost = room ? (room.host === me.k || !ST.players[room.host]) : isHost; syncOthers(); hudOthers(); hostChores(); });
    NET.onVal('host', v => { room = Object.assign(room || {}, { host: v }); isHost = v === me.k || !ST.players[v]; if (isHost && v !== me.k) NET.set('host', me.k); });
    NET.onVal('pos', v => { ST.pos = v || {}; syncOthers(); });
    NET.onVal('ping', v => { ST.ping = v || {}; });
    NET.onVal('stat', v => { ST.stat = v || {}; });
  }
  hudProg(); hudHand(); hudAbil(); hudOthers();
  memo('📋 오늘의 업무 지시', `어젯밤 매장 정리 로봇 <b>깔끔봇 3000</b>이 "모든 진열은 일시적일 뿐"이라는 깨달음을 얻더니, 진열대의 상품을 몽땅 바닥에 쏟아 놓고 퇴근해 버렸습니다.<br><br>개점 전까지 바닥의 상품 <b>${LIB.items.length}개</b>를 <b>맞는 구역의 선반</b>에 다시 진열해 주세요. 칸 하나에는 <b>한 가지 상품만</b> 들어가고, 상품마다 칸이 꽉 차는 개수가 있어요.<br><br>가격표 색을 보세요: <b>흰색</b> = 구역은 맞지만 아직 모자람 · <b style="color:#c89a00">노랑</b> = 칸 완성(별 +1) · <b style="color:#c83a2a">빨강</b> = 틀린 구역.<br>맞게 넣을 때마다 알바비 ${won(LIB.gold)}을 줘요. 알바비로 <b>K 스킬</b>을 배우고, 별은 입구 옆 <b>ATM</b>에서 스티커로 바꾸세요.${NET.solo ? '' : '<br><br>동료에게는 <b>F</b> 로 위치를 알리고, 동료를 보고 <b>E</b> 를 누르면 상품을 건넬 수 있어요.'}<br><br>다 끝나면 <b>출입문</b>으로 가서 퇴근!`, '업무 시작!');
}
const clock = new THREE.Clock();
function loop() { requestAnimationFrame(loop); try { frame(Math.min(.05, clock.getDelta())); } catch (e) { if (!loop._err) { loop._err = 1; console.error(e); } } }
function frame(dt) {
  if (LIB) {
    if (locked) moveP(dt); else camPose(false);
    for (const k in OTHERS) { const O = OTHERS[k]; if (O.tx == null) continue; const f = Math.min(1, dt * 10); O.mesh.position.x += (O.tx - O.mesh.position.x) * f; O.mesh.position.y += (O.ty - O.mesh.position.y) * f; O.mesh.position.z += (O.tz - O.mesh.position.z) * f; O.mesh.rotation.y = O.tyaw; }
    tickSkills(dt); updateFly(dt); flushItems(); flushTags(); handView(); aimUpdate(); drawPings(); sendPos(dt); if (!NET.solo) sendStat(dt);
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
  if (!P.hand.length) return; const id = P.hand[0], Pp = prodOf(id), m = soloMesh(id, 'hand'), mx = Math.max(Pp.w, Pp.h, Pp.d), sc = (.14 + mx * .4) / mx;
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
    if (await placeItem(it.id, target, true)) done++;
  }
  return done;
}
window.mart = { frame: (dt = .016) => frame(dt), get LIB() { return LIB; }, IT, SL, ST, P, NET: () => NET, status: () => { STATUS = null; return status(); }, pickItem, takeFromSlot, placeItem, throwTop, dropAll, useSkill, useAtm, solve, unstick, act, rayPick, get AIM() { return AIM; }, SKILL, openSkills, leave };
