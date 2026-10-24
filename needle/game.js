// ════════════ 바늘 찾기 — Find The Needle 재현 (원작: FindTheNeedleDev, Steam) ════════════
// 창고 안 600만 가닥 건초 더미에서 바늘을 찾는 1인칭 자동화 게임.
// 맨손으로 한 움큼씩 → 삽·쇠스랑·양동이 → 벨트·발전기·로봇 팔·압축기·스캐너.
// 원작 확인값: 가닥당 $0.0222 · 더미 약 600만 가닥 · 양동이 600 · 마당 덩이 상한 600 · 연구 트리 카드 이름·가격(data.js 참고)
import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import * as D from './data.js?v=3';
import * as W from './world.js?v=2';

const $ = id => document.getElementById(id);
const clamp = (v, a, b) => v < a ? a : v > b ? b : v;
const lerp = (a, b, t) => a + (b - a) * t;
const Q = new URLSearchParams(location.search);
const MOBILE = Q.has('mobile') || matchMedia('(pointer: coarse)').matches;
const esc = s => String(s == null ? '' : s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
if (Q.has('mute') && window.Sound) { Sound.setBgmVolume(0); Sound.setSfxVolume(0); }
function money(n) { if (n >= 1e6) return '$' + (n / 1e6).toFixed(2) + 'M'; if (n >= 1000) return '$' + Math.round(n).toLocaleString('en-US'); return '$' + n.toFixed(2); }
function priceTag(n) { if (n >= 1000) return '$' + (n >= 1e4 ? Math.round(n / 1000) : (n / 1000).toFixed(1).replace(/\.0$/, '')) + 'k'; return '$' + n.toFixed(2); }
const fmtN = n => Math.round(n).toLocaleString('ko-KR');
function toast(m, ms) { const t = $('toast'); t.innerHTML = m; t.classList.add('on'); clearTimeout(toast._t); toast._t = setTimeout(() => t.classList.remove('on'), ms || 2600); }

// ════════════ 사운드 (합성음, 파티 사운드 볼륨 따름) ════════════
let AC = null, noiseBuf = null;
function ac() { try { AC = AC || new AudioContext(); if (AC.state === 'suspended') AC.resume(); } catch (e) { return null; } if (!noiseBuf) { noiseBuf = AC.createBuffer(1, AC.sampleRate * .5, AC.sampleRate); const d = noiseBuf.getChannelData(0); for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1; } return AC; }
function sfx(k, v = 1) {
  const vol = (window.Sound ? Sound.sfxVolume : .6) * v; if (!(vol > 0)) return; if (!ac()) return;
  const t = AC.currentTime;
  const tone = (f0, f1, d, type, gv, dl = 0) => { const o = AC.createOscillator(), g = AC.createGain(); o.type = type; o.frequency.setValueAtTime(f0, t + dl); o.frequency.exponentialRampToValueAtTime(f1, t + dl + d); g.gain.setValueAtTime(gv * vol, t + dl); g.gain.exponentialRampToValueAtTime(.0001, t + dl + d); o.connect(g).connect(AC.destination); o.start(t + dl); o.stop(t + dl + d + .02); };
  const noise = (d, f, q, gv, type = 'bandpass', dl = 0) => { const s = AC.createBufferSource(), fl = AC.createBiquadFilter(), g = AC.createGain(); s.buffer = noiseBuf; fl.type = type; fl.frequency.value = f; fl.Q.value = q; g.gain.setValueAtTime(gv * vol, t + dl); g.gain.exponentialRampToValueAtTime(.0001, t + dl + d); s.connect(fl).connect(g).connect(AC.destination); s.start(t + dl, Math.random() * .3); s.stop(t + dl + d + .02); };
  if (k === 'scoop') noise(.14, 1800, .8, .35);
  else if (k === 'dump') noise(.22, 900, .7, .3);
  else if (k === 'swish') noise(.18, 2600, 1.4, .18);
  else if (k === 'sell') { tone(1320, 1320, .09, 'triangle', .14); tone(1760, 1760, .16, 'triangle', .12, .08); }
  else if (k === 'beep') tone(1900, 1900, .045, 'sine', .14);
  else if (k === 'buy') { tone(660, 660, .07, 'square', .06); tone(880, 880, .07, 'square', .06, .07); tone(1320, 1320, .12, 'square', .06, .14); }
  else if (k === 'place') { tone(160, 70, .12, 'sine', .35); noise(.08, 500, 1, .2); }
  else if (k === 'pick') tone(700, 1100, .07, 'sine', .15);
  else if (k === 'deny') tone(220, 160, .14, 'square', .07);
  else if (k === 'needle') { [1047, 1319, 1568, 2093].forEach((f, i) => tone(f, f, .25, 'sine', .12, i * .09)); }
  else if (k === 'vac') noise(.12, 500, .5, .12, 'lowpass');
  else if (k === 'press') { tone(90, 60, .25, 'sawtooth', .12); noise(.2, 300, .8, .15); }
  else if (k === 'scan') tone(2400, 1200, .12, 'sine', .07);
}

// ════════════ 렌더러 · 씬 ════════════
const canvas = $('view');
const renderer = new THREE.WebGLRenderer({ canvas, antialias: !MOBILE, powerPreference: 'high-performance' });
renderer.setPixelRatio(Math.min(devicePixelRatio || 1, MOBILE ? 1.25 : 1.75));
renderer.shadowMap.enabled = !MOBILE; renderer.shadowMap.type = THREE.PCFSoftShadowMap;
renderer.outputColorSpace = THREE.SRGBColorSpace; renderer.toneMapping = THREE.ACESFilmicToneMapping; renderer.toneMappingExposure = 1.05;
const scene = new THREE.Scene(); scene.fog = new THREE.Fog('#c8c0a8', 60, 260);
const camera = new THREE.PerspectiveCamera(72, 1, .05, 600); camera.rotation.order = 'YXZ'; scene.add(camera);
scene.add(new THREE.HemisphereLight('#d8e8ff', '#7a5a38', 1.0));
const sun = new THREE.DirectionalLight('#fff0d8', 2.2); sun.position.set(-14, 26, 10); scene.add(sun); scene.add(sun.target);
if (!MOBILE) { sun.castShadow = true; sun.shadow.mapSize.set(2048, 2048); const sc = sun.shadow.camera; sc.left = sc.bottom = -22; sc.right = sc.top = 22; sc.near = 1; sc.far = 70; sun.shadow.bias = -.0006; sun.shadow.normalBias = .03; }
function resize() { const w = Math.max(1, innerWidth), h = Math.max(1, innerHeight); renderer.setSize(w, h, false); camera.aspect = w / h; camera.fov = w < h ? 86 : 72; camera.updateProjectionMatrix(); }
addEventListener('resize', resize); resize();

const Y = 18; // 마당 반폭(벽)
const yard = W.buildYard(scene, Y);
const beltTex = W.beltTexture(); const beltMat = new THREE.MeshStandardMaterial({ map: beltTex, roughness: .9 });
const ghostOK = new THREE.MeshBasicMaterial({ color: '#50e070', transparent: true, opacity: .45, depthWrite: false });
const ghostBad = new THREE.MeshBasicMaterial({ color: '#f05040', transparent: true, opacity: .45, depthWrite: false });

// ════════════ 상태 ════════════
const S = {
  money: 0, earned: 0, sold: 0, dug: 0, play: 0, bestSale: 0,
  tech: {}, hotbar: ['hand', 'detector'], slot: 0, missions: {}, cabinet: [], pileNo: 1, detSecs: 0, intro: false,
};
const lvl = id => S.tech[id] != null ? S.tech[id] : (D.TECH_BY[id] && D.TECH_BY[id].own ? 1 : 0);
const has = id => lvl(id) > 0;
const price = () => D.STRAND_PRICE * (1 + .1 * lvl('hay_price')) * (1 + .05 * S.cabinet.length);
const beltSpeed = () => 1.15 * (1 + .15 * lvl('belt_speed'));
const reachOf = () => 2.6 + .4 * lvl('grab_reach');
function toolStat(k) {
  const sb = 1 + .06 * lvl('strong_back'), sw = 1 + .12 * lvl('easy_swing');
  if (k === 'hand') return { cap: D.TECH_BY.hand_carry.eff(lvl('hand_carry')), cd: .2, r: .12 };
  if (k === 'toy') return { cap: Math.round((15 + 5 * lvl('toy_shovel_size')) * sb), cd: .38 / sw, r: .18 };
  if (k === 'spade') return { cap: Math.round((30 + 8 * lvl('shovel_size')) * sb), cd: .5 / sw, r: .26 };
  if (k === 'fork') return { cap: Math.round((80 + 25 * lvl('fork_size')) * sb), cd: .62 / sw, r: .38 };
  return null;
}
const TOOLS = { hand: { ko: '손', icon: '✋' }, detector: { ko: '금속 탐지기', icon: '📡' }, toy: { ko: '장난감 삽', icon: '🥄' }, spade: { ko: '삽', icon: '♠️' }, fork: { ko: '쇠스랑', icon: '🔱' }, broom: { ko: '빗자루', icon: '🧹' }, vac: { ko: '마당 청소기', icon: '🌀' } };
const contCap = k => k === 'bucket' ? D.BUCKET_BASE + 300 * lvl('bucket_size') : 2500 + 1000 * lvl('barrow_size');

// ════════════ 건초 더미 (높이장) ════════════
const N = 113, C = .25, X0 = -14, Z0 = -14, PCX = 1, PCZ = -1.5, PR = 8.6, PH = 7.0, MAXD = .3;
const H = new Float32Array(N * N);
let K = 1; // 칸 하나·높이 1m 당 가닥 수
function hAt(x, z) {
  const fx = (x - X0) / C, fz = (z - Z0) / C; if (fx < 0 || fz < 0 || fx >= N - 1 || fz >= N - 1) return 0;
  const i = fx | 0, j = fz | 0, u = fx - i, v = fz - j, k = j * N + i;
  return (H[k] * (1 - u) + H[k + 1] * u) * (1 - v) + (H[k + N] * (1 - u) + H[k + N + 1] * u) * v;
}
let pileSum = 0; const sumH = () => { let s = 0; for (let k = 0; k < H.length; k++) s += H[k]; return s; };
const pileStrands = () => pileSum * K;
function genPile(seed) {
  let s = seed * 9301 + 49297; const r = () => (s = (s * 9301 + 49297) % 233280) / 233280;
  const bumps = Array.from({ length: 7 }, () => [r() * 6.28, .5 + r() * 2, r() * .5]);
  for (let j = 0; j < N; j++) for (let i = 0; i < N; i++) {
    const x = X0 + i * C - PCX, z = Z0 + j * C - PCZ, d = Math.hypot(x, z), a = Math.atan2(z, x);
    let rr = PR; for (const [ph, f, amp] of bumps) rr += Math.sin(a * f + ph) * amp * .3;
    H[j * N + i] = d < rr ? PH * Math.min(1.35, 1 + .12 * (seed - 1)) * Math.pow(1 - (d / rr) ** 2, .85) : 0;
  }
  for (let it = 0; it < 400; it++) { let moved = 0; for (let k = 0; k < H.length; k++) moved += relaxCell(k); if (moved < 1e-3) break; }
  pileSum = sumH(); K = D.PILE_STRANDS * (1 + .5 * (seed - 1)) / pileSum; // 다음 더미는 더 크다 (추정)
}
const dirty = new Set(); let meshDirty = new Set();
function relaxCell(k) {
  const i = k % N, j = (k / N) | 0; let moved = 0;
  for (const nb of [i > 0 ? k - 1 : -1, i < N - 1 ? k + 1 : -1, j > 0 ? k - N : -1, j < N - 1 ? k + N : -1]) {
    if (nb < 0) continue; const d = H[k] - H[nb] - MAXD;
    if (d > 1e-4) { const m = d * .25; H[k] -= m; H[nb] += m; moved += m; dirty.add(nb); meshDirty.add(nb); meshDirty.add(k); }
  }
  if (moved) dirty.add(k);
  return moved;
}
function relaxStep(budget) {
  if (!dirty.size) return; const list = [...dirty]; dirty.clear(); let n = 0;
  for (const k of list) { if (n++ > budget) { dirty.add(k); continue; } relaxCell(k); }
}
function cellsNear(x, z, r) {
  const out = [], i0 = Math.max(0, Math.floor((x - r - X0) / C)), i1 = Math.min(N - 1, Math.ceil((x + r - X0) / C)), j0 = Math.max(0, Math.floor((z - r - Z0) / C)), j1 = Math.min(N - 1, Math.ceil((z + r - Z0) / C));
  for (let j = j0; j <= j1; j++) for (let i = i0; i <= i1; i++) { const d = Math.hypot(X0 + i * C - x, Z0 + j * C - z); if (d <= r) out.push([j * N + i, d]); }
  if (!out.length) { const i = clamp(Math.round((x - X0) / C), 0, N - 1), j = clamp(Math.round((z - Z0) / C), 0, N - 1); out.push([j * N + i, 0]); }
  return out;
}
// 더미에서 n가닥 떠내기 → { n, nd }
function scoopPile(x, z, want, rad) {
  const cs = cellsNear(x, z, Math.max(rad, .13)); let wsum = 0;
  for (const c of cs) { c[2] = (1 - c[1] / (rad + .14)) * H[c[0]]; wsum += c[2]; }
  if (wsum <= 1e-6) return { n: 0, nd: [] };
  const avail = cs.reduce((a, c) => a + H[c[0]], 0) * K;
  const take = Math.floor(Math.min(want, avail * .9)); if (take < 1) return { n: 0, nd: [] };
  const dh = take / K;
  for (const c of cs) { const k = c[0], rm = Math.min(H[k], dh * c[2] / wsum); H[k] -= rm; dirty.add(k); meshDirty.add(k); fuzzShuffle.add(k); }
  pileSum -= dh; S.dug += take;
  const nd = [];
  for (const nd0 of needles) if (nd0.st === 'pile' && Math.hypot(nd0.x - x, nd0.z - z) <= rad + .2 && nd0.y >= hAt(nd0.x, nd0.z) - .06) { nd0.st = 'load'; nd.push(nd0.id); }
  return { n: take, nd };
}
function addPile(x, z, n, nd) {
  const cs = cellsNear(x, z, .3); let ws = 0; for (const c of cs) { c[2] = 1 - c[1] / .45; ws += c[2]; }
  const dh = n / K; for (const c of cs) { H[c[0]] += dh * c[2] / ws; dirty.add(c[0]); meshDirty.add(c[0]); fuzzShuffle.add(c[0]); }
  pileSum += dh;
  for (const id of nd || []) { const q = needles[id]; q.st = 'pile'; q.x = x + (Math.random() - .5) * .2; q.z = z + (Math.random() - .5) * .2; q.y = Math.max(0, hAt(q.x, q.z) - .08); }
}

// 더미 메쉬
const strawTex = W.strawTexture(); strawTex.repeat.set(28 / 1.7, 28 / 1.7);
const pileGeo = new THREE.PlaneGeometry(28, 28, N - 1, N - 1); pileGeo.rotateX(-Math.PI / 2); pileGeo.translate(X0 + 14, 0, Z0 + 14);
const pileMesh = new THREE.Mesh(pileGeo, new THREE.MeshStandardMaterial({ map: strawTex, roughness: 1, color: '#e8d0a0' }));
pileMesh.receiveShadow = true; pileMesh.castShadow = !MOBILE; scene.add(pileMesh);
function updatePileMesh(full) {
  const pos = pileGeo.attributes.position.array;
  if (full) { for (let k = 0; k < H.length; k++) pos[k * 3 + 1] = H[k] > .006 ? H[k] : -.08; }
  else for (const k of meshDirty) pos[k * 3 + 1] = H[k] > .006 ? H[k] : -.08;
  pileGeo.attributes.position.needsUpdate = true; pileGeo.computeVertexNormals(); pileGeo.computeBoundingSphere();
}
// 표면 가닥 (원작처럼 한 가닥 한 가닥 보이게)
const NF = MOBILE ? 14000 : 42000;
const fuzzGeo = new THREE.BoxGeometry(.014, .014, .34);
const fuzz = new THREE.InstancedMesh(fuzzGeo, new THREE.MeshStandardMaterial({ roughness: .9 }), NF); fuzz.receiveShadow = !MOBILE;
const FX = new Float32Array(NF), FZ = new Float32Array(NF), FA = new Float32Array(NF), FT = new Float32Array(NF), FL = new Float32Array(NF), FK = new Int32Array(NF);
const cellFuzz = new Map();
const _m = new THREE.Matrix4(), _q = new THREE.Quaternion(), _e = new THREE.Euler(), _v = new THREE.Vector3(), _s = new THREE.Vector3(), _c = new THREE.Color();
{
  let s = 77; const r = () => (s = (s * 16807) % 2147483647) / 2147483647;
  for (let n = 0; n < NF; n++) {
    const a = r() * 6.283, d = Math.sqrt(r()) * (PR + 2.5); FX[n] = PCX + Math.cos(a) * d; FZ[n] = PCZ + Math.sin(a) * d; FA[n] = r() * 6.283; FT[n] = (r() - .5) * .9; FL[n] = .7 + r() * .7;
    const k = clamp(Math.round((FZ[n] - Z0) / C), 0, N - 1) * N + clamp(Math.round((FX[n] - X0) / C), 0, N - 1); FK[n] = k;
    if (!cellFuzz.has(k)) cellFuzz.set(k, []); cellFuzz.get(k).push(n);
    fuzz.setColorAt(n, _c.set(W.STRAW_COLS[(r() * W.STRAW_COLS.length) | 0]));
  }
}
scene.add(fuzz);
const fuzzShuffle = new Set();
function setFuzz(n) {
  const h = hAt(FX[n], FZ[n]);
  if (h < .025) { _m.makeScale(0, 0, 0); fuzz.setMatrixAt(n, _m); return; }
  _e.set(FT[n], FA[n], 0); _q.setFromEuler(_e); _v.set(FX[n], h + .01, FZ[n]); _s.set(1, 1, FL[n]); _m.compose(_v, _q, _s); fuzz.setMatrixAt(n, _m);
}
function updateFuzz(full) {
  if (full) { for (let n = 0; n < NF; n++) setFuzz(n); }
  else for (const k of meshDirty) { const l = cellFuzz.get(k); if (l) for (const n of l) { if (fuzzShuffle.has(k)) { FA[n] = Math.random() * 6.283; FT[n] = (Math.random() - .5) * .9; } setFuzz(n); } }
  fuzzShuffle.clear(); fuzz.instanceMatrix.needsUpdate = true;
}

// ════════════ 바늘 ════════════
const needles = [];
const needleMeshes = [];
function genNeedles(seed) {
  let s = seed * 7919 + 13; const r = () => (s = (s * 16807) % 2147483647) / 2147483647;
  needles.length = 0; needles.push(...D.NEEDLES.map((n, id) => {
    let x, z, h; do { const a = r() * 6.283, d = Math.sqrt(r()) * PR * .92; x = PCX + Math.cos(a) * d; z = PCZ + Math.sin(a) * d; h = hAt(x, z); } while (h < .6);
    return { id, k: n.k, st: 'pile', x, y: .1 + r() * (h - .3), z };
  }));
}
const glintTex = (() => { const c = document.createElement('canvas'); c.width = c.height = 64; const g = c.getContext('2d'); const gr = g.createRadialGradient(32, 32, 0, 32, 32, 30); gr.addColorStop(0, 'rgba(255,255,255,1)'); gr.addColorStop(.2, 'rgba(255,250,200,.8)'); gr.addColorStop(1, 'rgba(255,240,180,0)'); g.fillStyle = gr; g.fillRect(0, 0, 64, 64); g.fillStyle = '#fff'; g.fillRect(30, 2, 4, 60); g.fillRect(2, 30, 60, 4); return new THREE.CanvasTexture(c); })();
function buildNeedleMeshes() {
  for (const m of needleMeshes) scene.remove(m);
  needleMeshes.length = 0;
  for (const q of needles) { const g = W.needleModel(D.NEEDLES[q.id]); const gl = new THREE.Sprite(new THREE.SpriteMaterial({ map: glintTex, depthWrite: false, transparent: true })); gl.scale.set(.35, .35, 1); gl.position.y = .1; g.add(gl); g.add(hitBox(.3, .3, .3, .08)); g.userData.glint = gl; g.userData.ref = { kind: 'needle', q }; g.visible = false; scene.add(g); needleMeshes[q.id] = g; }
}

// ════════════ 건초 덩이 (바닥·벨트·공중) ════════════
const items = [];
const CAPI = 760;
const stickGeo = new THREE.BoxGeometry(.012, .012, .32);
const clumpGeo = (() => { const gs = W.clumpGeometry(3, 18, .2); gs.forEach((g, i) => { const c = new THREE.Color(W.STRAW_COLS[i % W.STRAW_COLS.length]); const n = g.attributes.position.count, arr = new Float32Array(n * 3); for (let j = 0; j < n; j++) { arr[j * 3] = c.r; arr[j * 3 + 1] = c.g; arr[j * 3 + 2] = c.b; } g.setAttribute('color', new THREE.BufferAttribute(arr, 3)); }); return mergeGeometries(gs); })();
const IM = {
  stick: new THREE.InstancedMesh(stickGeo, new THREE.MeshStandardMaterial({ color: '#e0b860', roughness: .9 }), CAPI),
  clump: new THREE.InstancedMesh(clumpGeo, new THREE.MeshStandardMaterial({ vertexColors: true, roughness: .9 }), CAPI),
  bale: new THREE.InstancedMesh(new THREE.BoxGeometry(.55, .36, .4), new THREE.MeshStandardMaterial({ map: W.strawTexture(), roughness: 1, color: '#f0d8a0' }), CAPI),
  wbale: new THREE.InstancedMesh(new THREE.CylinderGeometry(.24, .24, .52, 14), new THREE.MeshStandardMaterial({ color: '#f4f4f0', roughness: .35 }), CAPI),
};
for (const k in IM) { IM[k].count = 0; IM[k].castShadow = !MOBILE; IM[k].frustumCulled = false; scene.add(IM[k]); }
IM.wbale.geometry.rotateZ(Math.PI / 2);
function mkItem(kind, n, x, y, z, vx = 0, vy = 0, vz = 0, nd = []) {
  const it = { kind, n, nd: nd || [], x, y, z, vx, vy, vz, st: 'air', belt: null, s: 0, ry: Math.random() * 6.28, rx: Math.random() * 6.28, age: 0, py: y };
  if (items.length >= D.BELT_CAP) { // 원작 belt_cap=600: 넘치면 가장 오래 바닥에 있던 덩이부터 사라짐 (prop decay)
    let oi = -1, oa = -1; for (let i = 0; i < items.length; i++) if (items[i].st === 'ground' && items[i].age > oa) { oa = items[i].age; oi = i; }
    if (oi >= 0) { const o = items[oi]; for (const id of o.nd) dropNeedle(id, o.x, o.y, o.z); items.splice(oi, 1); }
  }
  items.push(it); return it;
}
function removeItem(it) { const i = items.indexOf(it); if (i >= 0) items.splice(i, 1); if (it.belt) { const j = it.belt.items.indexOf(it); if (j >= 0) it.belt.items.splice(j, 1); it.belt = null; } }
function dropNeedle(id, x, y, z) { const q = needles[id]; q.st = 'prop'; q.x = x + (Math.random() - .5) * .3; q.z = z + (Math.random() - .5) * .3; q.y = Math.max(y, hAt(q.x, q.z)); }
function renderItems() {
  const cnt = { stick: 0, clump: 0, bale: 0, wbale: 0 };
  for (const it of items) {
    const key = it.kind === 'hay' ? (it.n <= 2 ? 'stick' : 'clump') : it.kind; const m = IM[key]; if (cnt[key] >= CAPI) continue;
    const sc = key === 'clump' ? clamp(Math.cbrt(it.n / 40), .3, 1.7) : 1;
    _e.set(key === 'stick' ? 0 : it.rx * .3, it.ry, 0); _q.setFromEuler(_e); _v.set(it.x, it.y + (key === 'clump' ? .08 * sc : key === 'bale' ? .18 : key === 'wbale' ? .24 : .01), it.z); _s.set(sc, sc, sc);
    _m.compose(_v, _q, _s); m.setMatrixAt(cnt[key]++, _m);
  }
  for (const k in IM) { IM[k].count = cnt[k]; IM[k].instanceMatrix.needsUpdate = true; }
}
// 튀는 건초 부스러기 (손맛)
const PART = 260, partM = new THREE.InstancedMesh(stickGeo, new THREE.MeshStandardMaterial({ color: '#e8c070' }), PART); partM.frustumCulled = false; partM.count = 0; scene.add(partM);
const parts = [];
function burst(x, y, z, n, up = 2) { for (let i = 0; i < n && parts.length < PART; i++) parts.push({ x, y, z, vx: (Math.random() - .5) * 2, vy: Math.random() * up + .5, vz: (Math.random() - .5) * 2, a: Math.random() * 6, b: Math.random() * 6, t: .6 + Math.random() * .5 }); }
function stepParts(dt) {
  for (let i = parts.length - 1; i >= 0; i--) { const p = parts[i]; p.t -= dt; p.vy -= 9.8 * dt; p.x += p.vx * dt; p.y += p.vy * dt; p.z += p.vz * dt; p.a += dt * 6; if (p.t <= 0 || p.y < 0) parts.splice(i, 1); }
  for (let i = 0; i < parts.length; i++) { const p = parts[i]; _e.set(p.a, p.b, 0); _q.setFromEuler(_e); _v.set(p.x, p.y, p.z); _s.set(1, 1, 1); _m.compose(_v, _q, _s); partM.setMatrixAt(i, _m); }
  partM.count = parts.length; partM.instanceMatrix.needsUpdate = true;
}

// ════════════ 건물 (벨트·기계) ════════════
const builds = []; let buildSeq = 1;
const machRoot = new THREE.Group(); scene.add(machRoot);
const BH = .5; // 벨트 윗면 높이
function beltLen(b) { return Math.hypot(b.b.x - b.a.x, b.b.y - b.a.y, b.b.z - b.a.z); }
function beltPos(b, s, out) { const t = clamp(s / b.len, 0, 1); out.x = b.a.x + (b.b.x - b.a.x) * t; out.y = b.a.y + (b.b.y - b.a.y) * t; out.z = b.a.z + (b.b.z - b.a.z) * t; return out; }
function beltProject(b, x, z) { // → { s, d(가로 거리) } (수평 기준)
  const dx = b.b.x - b.a.x, dz = b.b.z - b.a.z, L2 = dx * dx + dz * dz || 1, t = clamp(((x - b.a.x) * dx + (z - b.a.z) * dz) / L2, 0, 1);
  const px = b.a.x + dx * t, pz = b.a.z + dz * t; return { t, s: t * b.len, d: Math.hypot(x - px, z - pz) };
}
function addBelt(a, b, fixed, sell) {
  const bl = { id: buildSeq++, type: 'belt', a: { ...a }, b: { ...b }, items: [], fixed: !!fixed, sell: !!sell, next: null };
  bl.len = beltLen(bl); bl.g = W.beltMesh(bl.a, bl.b, beltMat); bl.g.userData.ref = { kind: 'build', b: bl }; machRoot.add(bl.g); bl.g.updateMatrixWorld(true);
  builds.push(bl); return bl;
}
const MODEL = { splitter: W.splitterModel, generator: W.generatorModel, pole: W.poleModel, rake: () => W.rakeModel(), compressor: W.compressorModel, wrapper: W.wrapperModel, scanner: W.scannerModel, cabinet: () => W.cabinetModel(), arm_small: () => W.armModel('arm_small'), arm_standard: () => W.armModel('arm_standard'), arm_long: () => W.armModel('arm_long') };
const INNER_ROT = { compressor: Math.PI / 2, wrapper: 0, scanner: Math.PI / 2, generator: 0 };
function makeModel(type) {
  const r = MODEL[type](), g = new THREE.Group(), obj = r.isObject3D ? r : r.g;
  if (INNER_ROT[type]) obj.rotation.y = INNER_ROT[type];
  if (type === 'splitter') obj.scale.x = 1.5;
  g.add(obj); return { g, r };
}
// 로컬 → 월드 (rot: 로컬 +z 가 월드 (sin rot, cos rot))
function L2W(m, lx, lz, y = 0) { const c = Math.cos(m.rot), s = Math.sin(m.rot); return { x: m.x + lx * c + lz * s, y, z: m.z - lx * s + lz * c }; }
function portsOf(m) {
  switch (m.type) {
    case 'splitter': return { in: [L2W(m, 0, -.75, BH)], out: [L2W(m, -.42, .75, BH), L2W(m, .42, .75, BH)] };
    case 'compressor': return { in: [L2W(m, 0, -1.1, BH)], out: [L2W(m, 0, 1.15, BH)] };
    case 'wrapper': return { in: [L2W(m, 0, -1.05, BH)], out: [L2W(m, 0, 1.1, BH)] };
    case 'scanner': return { in: [L2W(m, 0, -.75, BH)], out: [L2W(m, 0, .8, BH)] };
    case 'generator': return { in: [L2W(m, 0, -1.05, BH), L2W(m, -.35, 0, 1.6)], out: [] };
    default: return { in: [], out: [] };
  }
}
function addMachine(type, x, z, rot) {
  const def = D.BUILD[type], { g, r } = makeModel(type);
  const m = { id: buildSeq++, type, x, z, rot, g, r, def, buf: 0, nd: [], q: [], t: 0, pf: 0, fuel: 0, alt: 0, phase: -1 };
  g.position.set(x, 0, z); g.rotation.y = rot; g.userData.ref = { kind: 'build', b: m }; machRoot.add(g); g.updateMatrixWorld(true);
  if (type.startsWith('arm')) { m.arm = r; m.grab = null; m.drop = null; m.tip = new THREE.Vector3(x, 1.5, z); m.carry = null; m.pose = { a: new THREE.Vector3(), b: new THREE.Vector3() }; }
  if (type === 'cabinet') { m.cab = r; }
  builds.push(m); return m;
}
function removeBuild(b) {
  const i = builds.indexOf(b); if (i < 0 || b.fixed) return;
  builds.splice(i, 1); machRoot.remove(b.g);
  if (b.type === 'belt') { for (const it of [...b.items]) { it.belt = null; it.st = 'air'; it.vy = 1; } b.items.length = 0; }
  else { const nd = [...(b.nd || [])]; if (b.carry) nd.push(...b.carry.nd); for (const qi of b.q || []) nd.push(...qi.nd); for (const id of nd) dropNeedle(id, b.x, 0, b.z); if (b.buf > 0 && b.type !== 'generator') mkItem('hay', Math.round(b.buf), b.x, 1, b.z, 0, 1, 0); }
  relink();
}
const machines = () => builds.filter(b => b.type !== 'belt');
const belts = () => builds.filter(b => b.type === 'belt');
function relink() {
  const bs = belts(), ms = machines(), joinOK = has('joiner');
  for (const b of bs) {
    b.next = null; if (b.sell) { b.next = { t: 'sell' }; continue; }
    const E = b.b;
    for (const m of ms) { const p = portsOf(m); for (const P of p.in) if (Math.hypot(P.x - E.x, P.z - E.z) < .7 && Math.abs(P.y - E.y) < 1.4) { b.next = { t: 'mach', m }; break; } if (b.next) break; }
    if (b.next) continue;
    let best = null, bd = .62;
    for (const o of bs) { if (o === b) continue; const d = Math.hypot(o.a.x - E.x, o.a.z - E.z); if (d < bd && Math.abs(o.a.y - E.y) < .7) { bd = d; best = { t: 'belt', b: o, s: 0 }; } }
    if (!best && joinOK) for (const o of bs) { if (o === b) continue; const pr = beltProject(o, E.x, E.z); if (pr.d < .45 && pr.s > .25 && pr.s < o.len - .1) { best = { t: 'belt', b: o, s: pr.s }; break; } }
    b.next = best;
  }
  rebuildWires();
}
const GAP = .3;
function beltHasRoom(b, s) { for (const it of b.items) if (Math.abs(it.s - s) < GAP) return false; return true; }
function beltInsert(b, it, s) {
  if (it.kind === 'hay') for (const o of b.items) if (o.kind === 'hay' && Math.abs(o.s - s) < GAP && o.n + it.n <= 160) { o.n += it.n; o.nd.push(...it.nd); it.belt = null; removeItem(it); return; } // 벨트 위에서 겹치면 한 덩이로
  it.st = 'belt'; it.belt = b; it.s = s; let i = 0; while (i < b.items.length && b.items[i].s < s) i++; b.items.splice(i, 0, it); }
function emitAt(P, dirRot, kind, n, nd) { // 기계 출구 → 벨트 시작이 있으면 올림, 없으면 바닥에 떨어짐
  for (const b of belts()) if (Math.hypot(b.a.x - P.x, b.a.z - P.z) < .7) { if (!beltHasRoom(b, 0)) return false; const it = mkItem(kind, n, P.x, P.y, P.z, 0, 0, 0, nd); beltInsert(b, it, 0); return true; }
  mkItem(kind, n, P.x, P.y + .1, P.z, Math.sin(dirRot) * 1.2, .5, Math.cos(dirRot) * 1.2, nd); return true;
}

// ════════════ 판매 ════════════
let saleAcc = 0, saleT = 0, lastSale = 0;
function sell(it) {
  let v = it.n * price();
  if (it.kind === 'bale') v *= 1.3 + .08 * lvl('bale_quality');
  if (it.kind === 'wbale') v *= (1.3 + .08 * lvl('bale_quality')) * (1.25 + .08 * lvl('foil_quality'));
  S.money += v; S.earned += v; S.sold += it.n; saleAcc += v; saleT = .5;
  if (it.nd.length) { for (const id of it.nd) { const q = needles[id]; const p = randomPilePoint(); q.st = 'pile'; q.x = p.x; q.z = p.z; q.y = Math.max(.1, hAt(p.x, p.z) * Math.random()); } toast('📦 판매대 저울에 바늘이 섞여 있었다… 직원이 더미에 도로 던져 넣었다'); }
  mission('first_strand');
}
function randomPilePoint() { for (let t = 0; t < 200; t++) { const a = Math.random() * 6.28, d = Math.sqrt(Math.random()) * PR; const x = PCX + Math.cos(a) * d, z = PCZ + Math.sin(a) * d; if (hAt(x, z) > .4) return { x, z }; } return { x: PCX, z: PCZ }; }

// ════════════ 들 수 있는 소품 (연장·양동이·손수레) ════════════
const hitMat = new THREE.MeshBasicMaterial({ visible: false });
function hitBox(w, h, d, y) { const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), hitMat); m.position.y = y; return m; }
const props = []; // { kind:'tool'|'bucket'|'barrow', tool, x,y,z, ry, n, nd, g }
function addProp(p) {
  p.g = p.kind === 'tool' ? W.toolModel(p.tool) : p.kind === 'bucket' ? W.bucketModel() : W.barrowModel();
  if (p.kind === 'tool') { p.g.rotation.z = Math.PI / 2; p.g.position.x = .45; const w = new THREE.Group(); w.add(p.g); w.add(hitBox(1.1, .3, .35, .1)); p.g = w; }
  p.g.userData.ref = { kind: 'prop', p }; p.n = p.n || 0; p.nd = p.nd || []; p.ry = p.ry || 0; scene.add(p.g); props.push(p); placeProp(p); return p;
}
function placeProp(p) { p.g.position.set(p.x, p.y + (p.kind === 'tool' ? .05 : 0), p.z); p.g.rotation.y = p.ry; p.g.updateMatrixWorld(true); updateFill(p); }
function updateFill(p) { const f = p.g.getObjectByName('fill'); if (!f) return; const r = clamp(p.n / contCap(p.kind), 0, 1); f.visible = r > 0; if (p.kind === 'bucket') { f.position.y = .02 + r * .28; f.scale.setScalar(.8 + r * .25); } else { f.position.y = .4 + r * .3; } }
function removeProp(p) { const i = props.indexOf(p); if (i >= 0) props.splice(i, 1); scene.remove(p.g); }
function deliver(kind, tool) { const P = yard.pallet, k = props.filter(p => Math.hypot(p.x - P.x, p.z - P.z) < 2.5).length; addProp({ kind, tool, x: P.x - 1.4 + (k % 4) * .9, y: k < 4 ? .2 : 0, z: P.z + (k < 4 ? -.1 : 1.1), ry: Math.PI / 2 }); }

// ════════════ 플레이어 ════════════
const P = { x: -8, y: 0, z: 13.5, vy: 0, yaw: -.6, pitch: -.12, ground: true, stam: 1, holding: null, needle: null, load: { n: 0, nd: [] }, vac: { n: 0, nd: [] }, cd: 0, swing: 0, bob: 0 };
const EYE = 1.62;
const keys = new Set(); let mouseL = false, mouseR = false;
const touchMove = { x: 0, y: 0 }; let touchUse = false, touchAlt = false, touchJump = false;
function solids() { // 원형 충돌체
  const out = [{ x: yard.basket.x, z: yard.basket.z, r: .45 }, { x: -Y + 4.2, z: 11.6, r: .4 }, { x: yard.kiosk.x, z: yard.kiosk.z, r: .7 }];
  for (const m of builds) if (m.type !== 'belt' && m.def.r) out.push({ x: m.x, z: m.z, r: m.def.r * .9 });
  return out;
}
let solidCache = null, solidAge = 0;
function collide(x, z, rad) {
  x = clamp(x, -Y + rad + .15, Y - rad - .15); z = clamp(z, -Y + rad + .15, Y - rad - .15);
  const sb = yard.standBox; if (x < sb.x1 + rad && z > sb.z0 - rad && z < sb.z1 + rad) { const dx = sb.x1 + rad - x, dz0 = z - (sb.z0 - rad), dz1 = sb.z1 + rad - z; const m = Math.min(dx, dz0, dz1); if (m === dx) x = sb.x1 + rad; else if (m === dz0) z = sb.z0 - rad; else z = sb.z1 + rad; }
  if (!solidCache || solidAge <= 0) { solidCache = solids(); solidAge = .5; }
  for (const s of solidCache) { const dx = x - s.x, dz = z - s.z, d = Math.hypot(dx, dz), m = s.r + rad; if (d < m && d > 1e-4) { x = s.x + dx / d * m; z = s.z + dz / d * m; } }
  return [x, z];
}
function groundAt(x, z) { return Math.max(0, hAt(x, z) - .1); }

// ════════════ 1인칭 연장 ════════════
const view = new THREE.Group(); camera.add(view);
const viewModels = {};
for (const k of ['hand', 'toy', 'spade', 'fork', 'broom', 'detector', 'vac']) { const m = W.toolModel(k); m.visible = false; view.add(m); viewModels[k] = m; }
const viewBucket = W.bucketModel(), viewBarrow = W.barrowModel(); viewBucket.visible = viewBarrow.visible = false; view.add(viewBucket, viewBarrow);
const viewNeedle = new THREE.Group(); view.add(viewNeedle);
const loadMesh = new THREE.Mesh(clumpGeo, new THREE.MeshStandardMaterial({ vertexColors: true, roughness: .9 })); loadMesh.visible = false; view.add(loadMesh);
const loadStick = new THREE.Mesh(stickGeo, new THREE.MeshStandardMaterial({ color: '#e8c070' })); loadStick.visible = false; view.add(loadStick);
view.traverse(o => { if (o.isMesh) { o.castShadow = false; o.renderOrder = 10; } });
const POSE = { hand: [.28, -.3, -.5, .2, 0, 0], toy: [.3, -.36, -.55, .9, .2, .1], spade: [.32, -.62, -.62, .95, .15, .1], fork: [.32, -.66, -.62, .95, .15, .1], broom: [.3, -.8, -.5, .7, .2, .1], detector: [.3, -.62, -.55, .7, .1, 0], vac: [.25, -.4, -.5, .1, 0, 0] };
function curTool() { return S.hotbar[S.slot] || 'hand'; }
function updateView(dt, moving) {
  const t = P.holding ? null : curTool();
  for (const k in viewModels) viewModels[k].visible = k === t;
  viewBucket.visible = !!P.holding && P.holding.kind === 'bucket'; viewBarrow.visible = !!P.holding && P.holding.kind === 'barrow';
  P.bob += dt * (moving ? 9 : 0); const by = Math.sin(P.bob) * .012 * (moving ? 1 : 0), bx = Math.cos(P.bob * .5) * .01 * (moving ? 1 : 0);
  P.swing = Math.max(0, P.swing - dt * 4);
  const sw = Math.sin(P.swing * Math.PI) * .7;
  if (t) { const p = POSE[t], m = viewModels[t]; m.position.set(p[0] + bx, p[1] + by - sw * .1, p[2] - sw * .15); m.rotation.set(-p[3] + sw, p[4], p[5]); }
  if (viewBucket.visible) { viewBucket.position.set(.24 + bx, -.56 + by, -.78); viewBucket.scale.setScalar(.85); viewBucket.rotation.set(pouring ? -1.1 : -.1, 0, 0); updateFillMesh(viewBucket, P.holding); }
  if (viewBarrow.visible) { viewBarrow.position.set(0, -1.05 + by, -1.0); viewBarrow.rotation.set(pouring ? -.6 : .15, Math.PI, 0); updateFillMesh(viewBarrow, P.holding); }
  // 연장에 실린 건초
  const L = P.load.n; loadMesh.visible = false; loadStick.visible = false;
  if (L > 0 && t && toolStat(t)) {
    const m = viewModels[t], tip = t === 'hand' ? [0, .03, -.08] : t === 'toy' ? [0, .02, -.04] : t === 'spade' ? [0, -.02, -.08] : [0, -.02, -.16];
    _v.set(...tip); m.localToWorld(_v); view.worldToLocal(_v);
    if (L <= 2) { loadStick.visible = true; loadStick.position.copy(_v); loadStick.rotation.set(0, .8, 0); }
    else { loadMesh.visible = true; loadMesh.position.copy(_v); loadMesh.scale.setScalar(clamp(Math.cbrt(L / 40), .25, 1.4) * (t === 'toy' ? .6 : 1)); }
  }
  viewNeedle.visible = P.needle != null;
}
function updateFillMesh(model, p) { const f = model.getObjectByName('fill'); if (!f) return; const r = clamp(p.n / contCap(p.kind), 0, 1); f.visible = r > 0; if (p.kind === 'bucket') { f.position.y = .02 + r * .28; f.scale.setScalar(.8 + r * .25); } else f.position.y = .4 + r * .3; }
function setViewNeedle() { viewNeedle.clear(); if (P.needle != null) { const m = W.needleModel(D.NEEDLES[P.needle]); m.position.set(-.25, -.25, -.45); m.rotation.set(.3, 0, .9); m.scale.setScalar(1.6); viewNeedle.add(m); } }

// ════════════ 조준 ════════════
const ray = new THREE.Raycaster(); const _o = new THREE.Vector3(), _d = new THREE.Vector3();
let aimHit = null;
function doAim() {
  camera.getWorldPosition(_o); camera.getWorldDirection(_d);
  let best = { kind: 'none', t: 40, p: _o.clone().addScaledVector(_d, 40) };
  if (_d.y < -1e-3) { const t = -_o.y / _d.y; if (t < best.t) best = { kind: 'floor', t, p: _o.clone().addScaledVector(_d, t) }; }
  // 더미: 레이 마칭
  for (let t = .2, prev = 0; t < Math.min(best.t, 30); t += .06) {
    const x = _o.x + _d.x * t, y = _o.y + _d.y * t, z = _o.z + _d.z * t, h = hAt(x, z);
    if (h > .03 && y <= h) { let a = prev, b = t; for (let i = 0; i < 6; i++) { const m = (a + b) / 2; const yy = _o.y + _d.y * m; if (yy <= hAt(_o.x + _d.x * m, _o.z + _d.z * m)) b = m; else a = m; } best = { kind: 'pile', t: b, p: _o.clone().addScaledVector(_d, b) }; break; }
    prev = t;
  }
  ray.set(_o, _d); ray.far = best.t; ray.camera = camera;
  const objs = [machRoot, ...props.map(p => p.g), ...needleMeshes.filter(m => m.visible), yard.group];
  const hits = ray.intersectObjects(objs, true);
  for (const h of hits) {
    let o = h.object, ref = null; while (o && !ref) { ref = o.userData.ref; o = o.parent; }
    if (h.object.isSprite) continue;
    if (ref) { best = { kind: ref.kind, ref, t: h.distance, p: h.point.clone() }; break; }
    if (h.distance < best.t) { best = { kind: 'world', t: h.distance, p: h.point.clone(), obj: h.object }; break; }
  }
  // 바닥 덩이
  for (const it of items) { if (it.st !== 'ground') continue; const dx = it.x - _o.x, dy = it.y + .08 - _o.y, dz = it.z - _o.z, tt = dx * _d.x + dy * _d.y + dz * _d.z; if (tt < 0 || tt > best.t + .3) continue; const r = it.n <= 2 ? .14 : .22 * clamp(Math.cbrt(it.n / 40), .5, 1.7); const ex = dx - _d.x * tt, ey = dy - _d.y * tt, ez = dz - _d.z * tt; if (ex * ex + ey * ey + ez * ez < r * r) best = { kind: 'item', it, t: tt, p: new THREE.Vector3(it.x, it.y, it.z) }; }
  // 키오스크 · 판매대
  if (best.p.distanceTo(new THREE.Vector3(yard.kiosk.x, 1.2, yard.kiosk.z)) < 1 && best.t < 4) best.kind = 'kiosk';
  aimHit = best; return best;
}
const isHay = a => a && (a.kind === 'pile' || a.kind === 'item');

// ════════════ 동작 ════════════
let pouring = false, pourAcc = 0, vacAcc = 0, detBeep = 0, detSig = 0;
function throwLoad(n, nd, target) {
  if (n <= 0) return;
  camera.getWorldPosition(_o); camera.getWorldDirection(_d);
  const right = new THREE.Vector3().crossVectors(_d, camera.up).normalize();
  const st = _o.clone().addScaledVector(_d, .55).addScaledVector(right, .18); st.y -= .25;
  let tg = target ? target.clone() : _o.clone().addScaledVector(_d, 2.2);
  const dist = st.distanceTo(tg), T = clamp(dist / 6, .16, .45);
  const v = tg.sub(st).divideScalar(T); v.y += .5 * 9.8 * T;
  mkItem('hay', n, st.x, st.y, st.z, v.x, v.y, v.z, nd);
}
function aimTarget(maxD) {
  const a = aimHit;
  if (a && a.t <= maxD + .6) { // 조준한 곳이 그릇·벨트·호퍼면 가운데로 (손맛: 겨눈 데 정확히 들어가게)
    if (a.kind === 'prop' && a.ref.p.kind !== 'tool') { const c = a.ref.p; return new THREE.Vector3(c.x, c.y + (c.kind === 'bucket' ? .45 : .85), c.z); }
    if (a.kind === 'build') { const b = a.ref.b; if (b.type === 'belt') { const pr = beltProject(b, a.p.x, a.p.z), q = beltPos(b, clamp(pr.s, .1, b.len - .1), {}); return new THREE.Vector3(q.x, q.y + .03, q.z); } if (b.type === 'generator') { const hp = L2W(b, -.35, 0, 1.75); return new THREE.Vector3(hp.x, hp.y, hp.z); } }
    return a.p.clone();
  } camera.getWorldPosition(_o); camera.getWorldDirection(_d); const p = _o.clone().addScaledVector(_d, maxD); p.y = Math.max(p.y, groundAt(p.x, p.z)); return p; }
function primary(dt, pressed) {
  if (BM) return;
  const a = aimHit, reach = reachOf();
  if (P.holding) { if (pressed || mouseLheld()) pourContainer(dt); return; }
  const t = curTool(), st = toolStat(t);
  if (st) {
    if (!pressed || P.cd > 0) return;
    if (P.load.n < st.cap && isHay(a) && a.t <= reach) {
      let got;
      if (a.kind === 'item') { const it = a.it, take = Math.min(it.n, st.cap - P.load.n); got = { n: take, nd: take >= it.n ? it.nd : [] }; it.n -= take; if (it.n <= 0) removeItem(it); }
      else got = scoopPile(a.p.x, a.p.z, st.cap - P.load.n, st.r);
      if (got.n > 0) { P.load.n += got.n; P.load.nd.push(...got.nd); P.cd = st.cd; P.swing = 1; sfx('scoop', t === 'hand' ? .5 : 1); burst(a.p.x, a.p.y, a.p.z, Math.min(12, 2 + got.n / 6), 1.6); if (got.nd.length) { toast('✨ 뭔가 반짝이는 게 딸려 왔다! 바닥에 쏟아 보자'); sfx('needle'); } }
      return;
    }
    if (P.load.n > 0) { throwLoad(P.load.n, P.load.nd, aimTarget(reach)); P.load = { n: 0, nd: [] }; P.cd = st.cd * .7; P.swing = 1; sfx('dump'); }
    return;
  }
  if (t === 'broom' && pressed && P.cd <= 0) { sweep(); P.cd = .45; P.swing = 1; sfx('swish'); }
  if (t === 'vac') vacuum(dt);
}
function mouseLheld() { return mouseL || touchUse; }
function secondary(dt, pressed) {
  if (BM) return;
  const t = curTool();
  if (P.holding) { if (pressed) putDown(); return; }
  if (toolStat(t) && pressed && P.load.n > 0) { throwLoad(P.load.n, P.load.nd, aimTarget(reachOf())); P.load = { n: 0, nd: [] }; P.swing = 1; sfx('dump'); }
  if (t === 'vac' && P.vac.n > 0) { vacAcc += dt * 90; const n = Math.min(P.vac.n, Math.floor(vacAcc)); if (n > 0) { vacAcc -= n; P.vac.n -= n; const nd = P.vac.n <= 0 ? P.vac.nd : []; if (P.vac.n <= 0) P.vac.nd = []; throwLoad(n, nd, aimTarget(3.5)); } }
}
function pourContainer(dt) {
  const c = P.holding; if (c.n <= 0) return;
  pouring = true;
  if (c.kind === 'barrow' && has('dump_hatch')) { throwLoad(c.n, c.nd, aimTarget(2.2)); c.n = 0; c.nd = []; sfx('dump'); return; }
  const rate = c.kind === 'bucket' ? 60 * (1 + .6 * lvl('smooth_pour')) : 120; pourAcc += dt * rate;
  if (pourAcc < rate * .08 && pourAcc < c.n) return; // 0.08초마다 한 줌씩
  const n = Math.min(c.n, Math.floor(pourAcc)); if (n <= 0) return; pourAcc -= n; c.n -= n;
  const nd = c.n <= 0 ? c.nd : []; if (c.n <= 0) c.nd = [];
  throwLoad(n, nd, aimTarget(2.2).add(new THREE.Vector3((Math.random() - .5) * .15, 0, (Math.random() - .5) * .15)));
  if (Math.random() < dt * 8) sfx('dump', .4);
}
function sweep() {
  camera.getWorldDirection(_d); const fx = _d.x, fz = _d.z, fl = Math.hypot(fx, fz) || 1, rng = 1.7 + .5 * lvl('broom_bristles');
  let n = 0;
  for (const it of items) { if (it.st !== 'ground') continue; const dx = it.x - P.x, dz = it.z - P.z, d = Math.hypot(dx, dz); if (d > rng || d < .2) continue; if ((dx * fx + dz * fz) / (d * fl) < .45) continue; it.st = 'air'; it.vx = fx / fl * 2.6; it.vz = fz / fl * 2.6; it.vy = 1.6; n++; }
  for (const q of needles) if (q.st === 'prop') { const dx = q.x - P.x, dz = q.z - P.z, d = Math.hypot(dx, dz); if (d < rng && d > .2 && (dx * fx + dz * fz) / (d * fl) > .45) { q.x += fx / fl * .8; q.z += fz / fl * .8; } }
  if (n) burst(P.x + fx / fl * 1.2, .2, P.z + fz / fl * 1.2, 6, 1);
}
function vacuum(dt) {
  const a = aimHit, cap = 1500; if (P.vac.n >= cap || !a || a.t > 3.6) return;
  vacAcc += dt * 45; const want = Math.min(cap - P.vac.n, Math.floor(vacAcc)); if (want <= 0) return; vacAcc -= want;
  let got = { n: 0, nd: [] };
  if (a.kind === 'item') { const it = a.it, take = Math.min(it.n, want); got = { n: take, nd: take >= it.n ? it.nd : [] }; it.n -= take; if (it.n <= 0) removeItem(it); }
  else if (a.kind === 'pile') got = scoopPile(a.p.x, a.p.z, want, .3);
  if (got.n) { P.vac.n += got.n; P.vac.nd.push(...got.nd); if (Math.random() < dt * 6) sfx('vac'); burst(a.p.x, a.p.y, a.p.z, 1, .5); }
  for (const q of needles) if (q.st === 'prop' && a.p.distanceTo(new THREE.Vector3(q.x, q.y, q.z)) < .5) { q.st = 'load'; P.vac.nd.push(q.id); }
}
function putDown() {
  const c = P.holding; if (!c) return;
  camera.getWorldDirection(_d); const fl = Math.hypot(_d.x, _d.z) || 1;
  const x = P.x + _d.x / fl * 1.0, z = P.z + _d.z / fl * 1.0; const [cx, cz] = collide(x, z, .3);
  c.x = cx; c.z = cz; c.y = groundAt(cx, cz); c.ry = P.yaw; c.g.visible = true; placeProp(c); P.holding = null; sfx('place', .4);
}
function interact() {
  if (BM) return;
  const a = aimHit; const near = a && a.t < reachOf() + .8;
  if (P.holding && !(near && a.kind === 'build' && a.ref.b.type === 'generator')) { putDown(); return; }
  if (!near) return;
  if (a.kind === 'prop') {
    const p = a.ref.p;
    if (p.kind === 'tool') { if (!S.hotbar.includes(p.tool)) S.hotbar.push(p.tool); S.slot = S.hotbar.indexOf(p.tool); removeProp(p); sfx('pick'); toast(`${TOOLS[p.tool].icon} ${TOOLS[p.tool].ko} 획득 — 숫자키 ${S.slot + 1}`); mission('pickup_tool'); renderHotbar(); }
    else { P.holding = p; p.g.visible = false; sfx('pick'); }
    return;
  }
  if (a.kind === 'needle') { const q = a.ref.q; if (P.needle != null) { const o = needles[P.needle]; o.st = 'prop'; o.x = q.x; o.y = q.y; o.z = q.z + .1; } q.st = 'held'; P.needle = q.id; setViewNeedle(); sfx('needle'); toast(`🪡 <b>${D.NEEDLES[q.id].ko}</b> (${D.NEEDLES[q.id].en}) 를 찾았다! 진열장에 넣자`, 4000); mission('needle'); return; }
  if (a.kind === 'kiosk') { openResearch(); return; }
  if (a.kind === 'build') {
    const b = a.ref.b;
    if (b.type === 'cabinet') { openCabinet(b); return; }
    if (b.type === 'generator') { toast(`⚡ 발전기 연료 ${fmtN(b.fuel)} / ${fmtN(genFuelCap())} 가닥 · ${b.running ? '가동 중' : '꺼짐'} — 호퍼(HAY IN)에 건초를 넣자`); return; }
    if (b.type === 'scanner' || b.type === 'compressor' || b.type === 'wrapper' || b.type.startsWith('arm')) { toast(`${b.def.icon} ${b.def.ko}: ${b.powered ? `전기 ${Math.round(b.pf * 100)}%` : '⚠ 전기 없음 — 발전기·전봇대 근처에 두자'}`); return; }
  }
}
function dropTool() {
  const t = curTool(); if (t === 'hand' || t === 'detector' || P.holding) return;
  if (P.load.n) { throwLoad(P.load.n, P.load.nd, aimTarget(1.5)); P.load = { n: 0, nd: [] }; }
  camera.getWorldDirection(_d); const fl = Math.hypot(_d.x, _d.z) || 1; const x = P.x + _d.x / fl, z = P.z + _d.z / fl;
  addProp({ kind: 'tool', tool: t, x, y: groundAt(x, z), z, ry: P.yaw }); S.hotbar.splice(S.slot, 1); S.slot = 0; renderHotbar();
}
function selectSlot(i) { if (i < 0 || i >= S.hotbar.length || P.holding) return; if (P.load.n && toolStat(curTool())) { throwLoad(P.load.n, P.load.nd, aimTarget(1.2)); P.load = { n: 0, nd: [] }; } S.slot = i; renderHotbar(); }

// ════════════ 금속 탐지기 ════════════
function detector(dt) {
  if (curTool() !== 'detector' || P.holding) { detSig = 0; $('det').classList.add('hide'); return; }
  S.detSecs += dt; if (S.detSecs > 5) mission('detector');
  const range = 2.2 + .5 * lvl('detector_range');
  camera.getWorldDirection(_d); const fl = Math.hypot(_d.x, _d.z) || 1;
  let cp = aimHit && aimHit.t < 3.2 ? aimHit.p.clone() : new THREE.Vector3(P.x + _d.x / fl * 1.6, 0, P.z + _d.z / fl * 1.6);
  if (!(aimHit && aimHit.t < 3.2)) cp.y = hAt(cp.x, cp.z);
  let best = 1e9;
  for (const q of needles) {
    let qx, qy, qz;
    if (q.st === 'pile' || q.st === 'prop') { qx = q.x; qy = q.y; qz = q.z; }
    else continue;
    const d = Math.hypot(qx - cp.x, (qy - cp.y) * .8, qz - cp.z); if (d < best) best = d;
  }
  for (const it of items) if (it.nd.length) { const d = Math.hypot(it.x - cp.x, it.y - cp.y, it.z - cp.z); if (d < best) best = d; }
  detSig = clamp(1 - best / range, 0, 1);
  const el = $('det'); el.classList.remove('hide'); el.querySelector('i').style.height = (detSig * 100).toFixed(0) + '%'; el.classList.toggle('hot', detSig > .75);
  detBeep -= dt; if (detSig > 0 && detBeep <= 0) { sfx('beep', .5 + detSig * .6); detBeep = lerp(1.1, .06, detSig); }
}

// ════════════ 공중 덩이 물리 ════════════
function stepItems(dt) {
  const bs = belts(), gens = builds.filter(b => b.type === 'generator');
  for (let i = items.length - 1; i >= 0; i--) {
    const it = items[i]; it.age += dt;
    if (it.st !== 'air') continue;
    it.py = it.y; it.vy -= 9.8 * dt; it.x += it.vx * dt; it.y += it.vy * dt; it.z += it.vz * dt; it.ry += dt * 3;
    if (Math.abs(it.x) > Y - .2) { it.x = Math.sign(it.x) * (Y - .2); it.vx *= -.3; }
    if (Math.abs(it.z) > Y - .2) { it.z = Math.sign(it.z) * (Y - .2); it.vz *= -.3; }
    let done = false;
    // 양동이·손수레
    for (const c of props) { if (c.kind === 'tool' || c === P.holding) continue; const rim = c.y + (c.kind === 'bucket' ? .32 : .7), rr = c.kind === 'bucket' ? .3 : .6; if (it.py >= rim && it.y <= rim && Math.hypot(it.x - c.x, it.z - c.z) < rr && it.kind === 'hay') { const room = contCap(c.kind) - c.n; if (room > 0) { const tk = Math.min(room, it.n); c.n += tk; it.n -= tk; if (it.n <= 0) { c.nd.push(...it.nd); items.splice(i, 1); done = true; } updateFill(c); } break; } }
    if (done) continue;
    // 판매대 바구니
    const bk = yard.basket; if (it.py >= bk.y && it.y <= bk.y + .05 && Math.hypot(it.x - bk.x, it.z - bk.z) < .4) { sell(it); items.splice(i, 1); continue; }
    // 발전기 호퍼
    for (const g of gens) { const hp = L2W(g, -.35, 0, 1.6); if (it.py >= hp.y && it.y <= hp.y && Math.hypot(it.x - hp.x, it.z - hp.z) < .5) { if (machAccept(g, it)) { items.splice(i, 1); done = true; } break; } }
    if (done) continue;
    // 벨트
    for (const b of bs) { const pr = beltProject(b, it.x, it.z); if (pr.d > .33 || pr.t <= 0 && pr.d > .3 || pr.t >= 1) continue; const ty = b.a.y + (b.b.y - b.a.y) * pr.t; if (it.py >= ty - .05 && it.y <= ty + .02) { beltInsert(b, it, pr.s); it.y = ty; done = true; break; } }
    if (done) continue;
    // 더미 위에 떨어지면 더미와 합쳐짐
    const h = hAt(it.x, it.z);
    if (h > .06 && it.y <= h && it.kind === 'hay') { addPile(it.x, it.z, it.n, it.nd); items.splice(i, 1); continue; }
    const gy = Math.max(0, h);
    if (it.y <= gy) {
      it.y = gy; it.vx = it.vy = it.vz = 0; it.st = 'ground'; it.age = 0;
      if (it.nd.length) { for (const id of it.nd) dropNeedle(id, it.x, gy, it.z); it.nd = []; }
      // 가까운 바닥 덩이와 합치기 (덩이 수 줄이기)
      if (it.kind === 'hay') for (const o of items) if (o !== it && o.st === 'ground' && o.kind === 'hay' && Math.hypot(o.x - it.x, o.z - it.z) < .18 + .05 * Math.cbrt(o.n)) { o.n += it.n; items.splice(i, 1); break; }
    }
  }
}
// ════════════ 벨트 ════════════
function stepBelts(dt) {
  const v = beltSpeed() * dt;
  beltTex.offset.y -= beltSpeed() * dt / .6 * .5;
  for (const b of builds) {
    if (b.type !== 'belt') continue; const its = b.items;
    for (let k = its.length - 1; k >= 0; k--) {
      const it = its[k]; const lim = k === its.length - 1 ? Infinity : its[k + 1].s - GAP;
      let ns = Math.min(it.s + v, lim); if (ns < it.s) ns = it.s;
      if (ns >= b.len) {
        const nx = b.next;
        if (!nx) { its.splice(k, 1); it.belt = null; it.st = 'air'; const dl = b.len || 1; it.vx = (b.b.x - b.a.x) / dl * beltSpeed(); it.vz = (b.b.z - b.a.z) / dl * beltSpeed(); it.vy = .3; continue; }
        if (nx.t === 'sell') { its.splice(k, 1); it.belt = null; sell(it); removeItem(it); continue; }
        if (nx.t === 'belt' && beltHasRoom(nx.b, nx.s)) { its.splice(k, 1); beltInsert(nx.b, it, nx.s); continue; }
        if (nx.t === 'mach' && machAccept(nx.m, it)) { its.splice(k, 1); it.belt = null; removeItem(it); continue; }
        ns = b.len;
      }
      it.s = ns; beltPos(b, it.s, it); it.y += 0; it.st = 'belt';
    }
  }
}
// ════════════ 기계 ════════════
const genFuelCap = () => 300 * (1 + .5 * lvl('firebox'));
const genOut = () => 4 + 2 * lvl('generator_output');
function machAccept(m, it) {
  switch (m.type) {
    case 'generator': if (it.kind === 'hay' || it.kind === 'bale') { if (m.fuel >= genFuelCap()) return false; m.fuel += it.n; const ash = L2W(m, .9, .9, .1); for (const id of it.nd) dropNeedle(id, ash.x, .1, ash.z); if (it.nd.length) toast('🔥 발전기 재받이에 타다 남은 바늘이 떨어졌다!'); return true; } return false;
    case 'splitter': {
      if (m.q.length) return false; m.q.push({ kind: it.kind, n: it.n, nd: it.nd }); return true;
    }
    case 'compressor': if (it.kind !== 'hay' || m.buf >= compBatch() * 1.4) return false; m.buf += it.n; m.nd.push(...it.nd); return true;
    case 'wrapper': if (it.kind !== 'bale' || m.q.length) return false; m.q.push({ kind: 'bale', n: it.n, nd: it.nd, t: 0 }); return true;
    case 'scanner': if (m.q.length >= 2) return false; m.q.push({ kind: it.kind, n: it.n, nd: it.nd, t: 0 }); return true;
  }
  return false;
}
const compBatch = () => 200 + 60 * lvl('compressor_batch');
function stepMachines(dt) {
  for (const m of builds) {
    if (m.type === 'belt') continue;
    const pf = m.def.power ? (m.powered ? m.pf : 0) : 1;
    switch (m.type) {
      case 'splitter': if (m.q.length) { const o = m.q[0], ports = portsOf(m).out; for (let k = 0; k < 2; k++) { const pi = (m.alt + k) % 2; if (emitAt(ports[pi], m.rot, o.kind, o.n, o.nd)) { m.q.shift(); m.alt = (pi + 1) % 2; break; } } } { const flap = m.g.getObjectByName('flap'); if (flap) flap.rotation.y = lerp(flap.rotation.y, m.alt ? .5 : -.5, dt * 8); } break;
      case 'compressor': {
        if (m.out) { if (emitAt(portsOf(m).out[0], m.rot, 'bale', m.out.n, m.out.nd)) m.out = null; }
        else if (m.buf >= compBatch() && pf > 0) { m.t += dt * pf * (1 + .15 * lvl('compressor_speed')); if (m.t >= 3.5) { m.t = 0; m.buf -= compBatch(); m.out = { n: compBatch(), nd: m.nd }; m.nd = []; sfx('press', .5); } }
        const ram = m.g.getObjectByName('ram'); if (ram) ram.position.y = 1.55 - Math.sin(clamp(m.t / 3.5, 0, 1) * Math.PI) * .5;
        break;
      }
      case 'wrapper': {
        const o = m.q[0]; const ring = m.g.getObjectByName('ring');
        if (o) { if (o.t >= 3) { if (emitAt(portsOf(m).out[0], m.rot, 'wbale', o.n, o.nd)) m.q.shift(); } else if (pf > 0) { o.t += dt * pf * (1 + .15 * lvl('wrapper_speed')); if (ring) ring.rotation.x += dt * 8 * pf; } }
        break;
      }
      case 'scanner': {
        const o = m.q[0]; const lamp = m.g.getObjectByName('lamp');
        if (lamp) lamp.material.color.set(pf > 0 ? (o && o.t < 1 ? (Math.sin(performance.now() / 60) > 0 ? '#80ffff' : '#20a0c0') : '#40e0ff') : '#333');
        if (o) {
          const need = pf > 0 ? 1.0 / (1 + .2 * lvl('scan_speed')) : 0;
          if (pf > 0) o.t += dt * pf; else o.t = need;
          if (o.t >= need) {
            if (pf > 0 && o.nd.length) { const tp = L2W(m, .55, 0, .55); for (const id of o.nd) { const q = needles[id]; q.st = 'prop'; q.x = tp.x + (Math.random() - .5) * .2; q.y = .55; q.z = tp.z + (Math.random() - .5) * .2; } toast(`🔍 스캐너가 바늘을 찾았다! — ${o.nd.map(id => D.NEEDLES[id].ko).join(', ')} (스캐너 옆 쟁반)`, 5000); sfx('needle'); o.nd = []; }
            if (emitAt(portsOf(m).out[0], m.rot, o.kind, o.n, o.nd)) { m.q.shift(); if (pf > 0) sfx('scan', .3); }
          }
        }
        break;
      }
      case 'generator': {
        m.running = m.fuel > 0 && m.demand > 0;
        if (m.running) { m.fuel = Math.max(0, m.fuel - dt * m.demand * .7 / (1 + .1 * lvl('firebox'))); mission('electric'); }
        const f = m.g.getObjectByName('fire'); if (f) { f.visible = m.fuel > 0; f.material.color.setHSL(.07, 1, .45 + Math.random() * .15); }
        const w = m.g.getObjectByName('wheel'); if (w && m.running) w.rotation.z += dt * 6;
        break;
      }
      case 'rake': stepRake(m, dt); break;
      default: if (m.arm) stepArm(m, dt, pf);
    }
  }
}
function stepRake(m, dt) {
  const spd = 1 + .15 * lvl('rake_speed'); m.t += dt * spd; const cyc = 2.4;
  const ph = (m.t % cyc) / cyc; m.r.head.position.z = -.6 - Math.sin(ph * Math.PI) * .7;
  if (m.t >= cyc) { m.t -= cyc; const f = L2W(m, 0, -1.3); const got = scoopPile(f.x, f.z, 22 * (1 + .3 * lvl('rake_bite')), .55); if (got.n) { const o = L2W(m, 0, 1.15, .75); mkItem('hay', got.n, o.x, o.y, o.z, Math.sin(m.rot) * .6, 0, Math.cos(m.rot) * .6, got.nd); burst(f.x, hAt(f.x, f.z), f.z, 4, 1); } }
}
// 로봇 팔: 더미에서 집어서 반경 안의 벨트·발전기·양동이에 놓음
function armTargets(m) {
  const R = m.def.reach; let drop = null, dd = 1e9;
  for (const b of belts()) { if (b.sell && false) continue; const pr = beltProject(b, m.x, m.z); if (pr.d > R - .2) continue; let s = pr.s; if (pr.d < .55) { s = clamp(s + .8, 0, b.len); } const p = beltPos(b, s, {}); const d = Math.hypot(p.x - m.x, p.z - m.z); if (d < .5 || d > R) continue; if (d < dd) { dd = d; drop = { t: 'belt', b, s, p: new THREE.Vector3(p.x, p.y + .25, p.z) }; } }
  for (const g of builds) if (g.type === 'generator') { const hp = L2W(g, -.35, 0, 1.6); const d = Math.hypot(hp.x - m.x, hp.z - m.z); if (d < R && d < dd) { dd = d; drop = { t: 'gen', g, p: new THREE.Vector3(hp.x, 1.9, hp.z) }; } }
  for (const c of props) if (c.kind !== 'tool' && c !== P.holding) { const d = Math.hypot(c.x - m.x, c.z - m.z); if (d < R && d > .4 && d < dd) { dd = d; drop = { t: 'cont', c, p: new THREE.Vector3(c.x, c.y + .8, c.z) }; } }
  return drop;
}
function armGrabPoint(m) {
  const R = m.def.reach, a = m.arm, maxY = a.sy + (a.L1 + a.L2) * .92;
  let best = null, bh = .12;
  for (let k = 0; k < 24; k++) { const ang = k / 24 * 6.283 + m.id; for (const rr of [R * .45, R * .7, R * .92]) { const x = m.x + Math.sin(ang) * rr, z = m.z + Math.cos(ang) * rr, h = hAt(x, z); const reachY = a.sy + Math.sqrt(Math.max(0, ((a.L1 + a.L2) * .95) ** 2 - rr * rr)); if (h > bh && h < Math.min(maxY, reachY)) { bh = h; best = new THREE.Vector3(x, h, z); } } }
  return best;
}
function armIK(m, T) {
  const a = m.arm, dx = T.x - m.x, dz = T.z - m.z, rot = Math.atan2(dx, dz) - m.rot;
  a.yaw.rotation.y = rot; const d = Math.hypot(dx, dz), y = T.y - a.sy; const L1 = a.L1, L2 = a.L2;
  const r = clamp(Math.hypot(d, y), .2, L1 + L2 - .01), el = Math.atan2(y, d);
  const b = Math.acos(clamp((L1 * L1 + r * r - L2 * L2) / (2 * L1 * r), -1, 1)), e = Math.PI - Math.acos(clamp((L1 * L1 + L2 * L2 - r * r) / (2 * L1 * L2), -1, 1));
  const phi = Math.PI / 2 - (el + b); a.sh.rotation.x = phi; a.el.rotation.x = e; a.wr.rotation.x = Math.PI - (phi + e);
}
function stepArm(m, dt, pf) {
  const def = m.def, spd = (1 + .12 * lvl('arm_speed')) * pf; const a = m.arm;
  if (m.phase < 0) { // 일감 찾기
    m.wait = (m.wait || 0) - dt; if (m.wait > 0 || pf <= 0) { armIK(m, m.tip); return; }
    m.drop = armTargets(m); m.grab = m.drop ? armGrabPoint(m) : null;
    if (!m.drop || !m.grab) { m.wait = 1; armIK(m, m.tip); return; }
    m.phase = 0; m.t = 0; m.pose.a.copy(m.tip); m.pose.b.copy(m.grab).add(new THREE.Vector3(0, .15, 0));
  }
  const durs = [.32, .1, .4, .1, .08].map(x => x * def.cyc);
  m.t += dt * spd; const k = clamp(m.t / durs[m.phase], 0, 1), e = k * k * (3 - 2 * k);
  if (m.phase === 0 || m.phase === 2) { m.tip.lerpVectors(m.pose.a, m.pose.b, e); if (m.phase === 2) m.tip.y += Math.sin(k * Math.PI) * .6; }
  armIK(m, m.tip);
  a.fA.position.x = -(m.phase === 1 || m.phase === 2 ? .035 : .07) * a.s; a.fB.position.x = -a.fA.position.x;
  if (k >= 1) {
    if (m.phase === 1) { const got = scoopPile(m.grab.x, m.grab.z, Math.round(def.pay * (1 + .2 * lvl('arm_payload'))), .3); m.carry = got.n ? got : null; if (got.n) { burst(m.grab.x, m.grab.y, m.grab.z, 4, 1); const lm = new THREE.Mesh(clumpGeo, loadMesh.material); lm.scale.setScalar(clamp(Math.cbrt(got.n / 40), .4, 1.3) * a.s); a.load.add(lm); } m.pose.a.copy(m.tip); m.drop = armTargets(m) || m.drop; m.pose.b.copy(m.drop.p); }
    if (m.phase === 3) { a.load.clear(); if (m.carry) { const dp = m.drop; if (dp.t === 'belt' && builds.includes(dp.b)) { const it = mkItem('hay', m.carry.n, dp.p.x, dp.p.y, dp.p.z, 0, -.5, 0, m.carry.nd); } else mkItem('hay', m.carry.n, dp.p.x, dp.p.y - .1, dp.p.z, 0, -.5, 0, m.carry.nd); } m.carry = null; }
    m.phase++; m.t = 0;
    if (m.phase === 2 && !m.carry) { m.phase = -1; m.wait = .3; }
    if (m.phase > 4) { m.phase = -1; }
  }
}
// ════════════ 전력망 ════════════
const wireMat = new THREE.LineBasicMaterial({ color: '#1a1a1a' }); let wireLines = null;
const poleSpan = () => 8 + 2 * lvl('pole_span'), poleDrop = () => 3 + lvl('pole_drop');
function powerTick() {
  const nodes = builds.filter(b => b.type === 'generator' || b.type === 'pole');
  const comp = new Map(); let cid = 0;
  for (const n of nodes) { if (comp.has(n)) continue; const st = [n]; comp.set(n, cid); while (st.length) { const c = st.pop(); for (const o of nodes) if (!comp.has(o) && Math.hypot(o.x - c.x, o.z - c.z) <= poleSpan()) { comp.set(o, cid); st.push(o); } } cid++; }
  const sup = new Array(cid).fill(0), dem = new Array(cid).fill(0);
  for (const n of nodes) if (n.type === 'generator' && n.fuel > 0) sup[comp.get(n)] += genOut();
  const users = builds.filter(b => b.type !== 'belt' && b.def.power);
  for (const u of users) { u.net = -1; for (const n of nodes) if (Math.hypot(n.x - u.x, n.z - u.z) <= (n.type === 'generator' ? 3.5 : poleDrop())) { u.net = comp.get(n); break; } if (u.net >= 0) dem[u.net] += u.def.power; }
  for (const u of users) { u.powered = u.net >= 0 && sup[u.net] > 0; u.pf = u.powered ? Math.min(1, sup[u.net] / Math.max(1, dem[u.net])) : 0; }
  for (const n of nodes) if (n.type === 'generator') { const c = comp.get(n); const gens = nodes.filter(o => o.type === 'generator' && comp.get(o) === c && o.fuel > 0).length || 1; n.demand = Math.min(dem[c], sup[c]) / gens; }
}
function rebuildWires() {
  if (wireLines) { scene.remove(wireLines); wireLines.geometry.dispose(); }
  const nodes = builds.filter(b => b.type === 'generator' || b.type === 'pole'), pts = [];
  const top = n => new THREE.Vector3(n.x, n.type === 'pole' ? 3.25 : 2.2, n.z);
  const sag = (a, b) => { for (let i = 0; i < 8; i++) { const t0 = i / 8, t1 = (i + 1) / 8; for (const t of [t0, t1]) { const p = a.clone().lerp(b, t); p.y -= Math.sin(t * Math.PI) * .35; pts.push(p); } } };
  for (let i = 0; i < nodes.length; i++) for (let j = i + 1; j < nodes.length; j++) if (Math.hypot(nodes[i].x - nodes[j].x, nodes[i].z - nodes[j].z) <= poleSpan()) sag(top(nodes[i]), top(nodes[j]));
  for (const u of builds) if (u.type !== 'belt' && u.def.power) for (const n of nodes) if (Math.hypot(n.x - u.x, n.z - u.z) <= (n.type === 'generator' ? 3.5 : poleDrop())) { sag(top(n), new THREE.Vector3(u.x, 1.0, u.z)); break; }
  if (!pts.length) { wireLines = null; return; }
  wireLines = new THREE.LineSegments(new THREE.BufferGeometry().setFromPoints(pts), wireMat); scene.add(wireLines);
}

// ════════════ 건설 모드 ════════════
let BM = null; // { type, rot, stage, a, ghost, ok, why, p }
const ghostRoot = new THREE.Group(); scene.add(ghostRoot);
const buildCost = (type, len) => (type === 'belt' ? D.BUILD.belt.cost * Math.max(1, len) : D.BUILD[type].cost) * (1 - .1 * lvl('waste_less'));
function startBuild(type) {
  closeOverlays(); BM = { type, rot: P.yaw + Math.PI, stage: 0, a: null, snap: true, dis: type === 'dismantle' };
  $('buildbar').classList.remove('hide'); $('buildname').textContent = type === 'dismantle' ? '🔨 철거 — 건물을 보고 설치(왼쪽 클릭)' : `${D.BUILD[type].icon} ${D.BUILD[type].ko}`;
  ghostRoot.clear(); if (type !== 'belt' && type !== 'dismantle') { const { g } = makeModel(type); g.traverse(o => { if (o.isMesh) o.material = ghostOK; }); ghostRoot.add(g); BM.ghost = g; }
  updateHints();
}
function endBuild() { BM = null; ghostRoot.clear(); $('buildbar').classList.add('hide'); updateHints(); }
function snapP(p, fine) { if (!BM.snap || fine) return p; return { x: Math.round(p.x * 2) / 2, z: Math.round(p.z * 2) / 2 }; }
function snapToPorts(p, which) { // which: 'start' → 기계 출구·벨트 끝, 'end' → 기계 입구·벨트 시작
  let best = null, bd = .7;
  for (const b of belts()) { const q = which === 'start' ? b.b : b.a; const d = Math.hypot(q.x - p.x, q.z - p.z); if (d < bd && !(which === 'end' && b.fixed && false)) { bd = d; best = { x: q.x, z: q.z, y: q.y }; } }
  for (const m of machines()) { const pr = portsOf(m); for (const q of which === 'start' ? pr.out : pr.in) { if (q.y > 1) continue; const d = Math.hypot(q.x - p.x, q.z - p.z); if (d < bd) { bd = d; best = { x: q.x, z: q.z, y: BH }; } } }
  return best;
}
function buildUpdate() {
  if (!BM) return;
  const reach = 9 + 2 * lvl('build_reach');
  camera.getWorldPosition(_o); camera.getWorldDirection(_d);
  if (BM.dis) { const a = aimHit; BM.target = a && a.kind === 'build' && !a.ref.b.fixed && a.t < reach ? a.ref.b : null; $('buildinfo').textContent = BM.target ? `${BM.target.type === 'belt' ? '벨트' : BM.target.def.ko} 철거 (전액 환불)` : '철거할 건물을 조준'; return; }
  let p = null; if (_d.y < -.01) { const t = -_o.y / _d.y; if (t < reach + 4) p = { x: _o.x + _d.x * t, z: _o.z + _d.z * t }; }
  if (!p) { BM.ok = false; ghostRoot.visible = false; $('buildinfo').textContent = '바닥을 조준'; return; }
  ghostRoot.visible = true; p = snapP(p);
  let why = '';
  const dist = Math.hypot(p.x - P.x, p.z - P.z); if (dist > reach) why = '너무 멀다';
  if (BM.type === 'belt') {
    const sp = snapToPorts(p, BM.stage === 0 ? 'start' : 'end'); let A, B;
    if (BM.stage === 0) { A = sp ? { x: sp.x, y: sp.y || BH, z: sp.z } : { x: p.x, y: BH, z: p.z }; B = { x: A.x + Math.sin(BM.rot) * 1.5, y: BH, z: A.z + Math.cos(BM.rot) * 1.5 }; }
    else {
      A = BM.a; let bx = p.x, bz = p.z;
      if (sp) { bx = sp.x; bz = sp.z; } else if (BM.snap) { let ang = Math.atan2(bx - A.x, bz - A.z); ang = Math.round(ang / (Math.PI / 12)) * (Math.PI / 12); const l = Math.min(14, Math.hypot(bx - A.x, bz - A.z)); bx = A.x + Math.sin(ang) * l; bz = A.z + Math.cos(ang) * l; }
      const l = Math.hypot(bx - A.x, bz - A.z); if (l > 14) { bx = A.x + (bx - A.x) / l * 14; bz = A.z + (bz - A.z) / l * 14; }
      B = { x: bx, y: sp && sp.y ? sp.y : BH, z: bz };
      if (Math.hypot(B.x - A.x, B.z - A.z) < .5) why = why || '너무 짧다';
    }
    for (let t = 0; t <= 1; t += .1) { const x = lerp(A.x, B.x, t), z = lerp(A.z, B.z, t); if (hAt(x, z) > .25 && BM.stage === 1) why = why || '더미 위에는 못 깐다'; if (inStand(x, z, .3)) why = why || '판매대와 겹친다'; }
    const len = BM.stage ? Math.hypot(B.x - A.x, B.y - A.y, B.z - A.z) : 0, cost = buildCost('belt', len);
    if (BM.stage && S.money < cost) why = why || '돈이 부족하다';
    BM.p = BM.stage ? B : A; BM.ok = !why; BM.cost = cost;
    ghostRoot.clear(); const gm = W.beltMesh(A, B, beltMat); gm.traverse(o => { if (o.isMesh) o.material = why ? ghostBad : ghostOK; }); ghostRoot.add(gm);
    $('buildinfo').textContent = why || (BM.stage ? `길이 ${len.toFixed(1)}m · ${money(cost)} — 클릭해 깔기 (오른쪽 클릭: 그만)` : '시작점을 클릭 (기계 출구·벨트 끝에 붙음)');
    return;
  }
  const def = D.BUILD[BM.type];
  if (hAt(p.x, p.z) > .2) why = why || '더미 위에는 못 짓는다';
  if (inStand(p.x, p.z, def.r)) why = why || '판매대와 겹친다';
  for (const m of machines()) if (Math.hypot(m.x - p.x, m.z - p.z) < (m.def.r || .3) + (def.r || .3) - .05) why = why || '다른 기계와 겹친다';
  if (def.max && machines().filter(m => m.type === BM.type).length >= def.max) why = why || '하나만 둘 수 있다';
  const cost = buildCost(BM.type); if (S.money < cost) why = why || '돈이 부족하다';
  BM.p = p; BM.ok = !why; BM.cost = cost;
  BM.ghost.position.set(p.x, 0, p.z); BM.ghost.rotation.y = BM.rot; BM.ghost.traverse(o => { if (o.isMesh) o.material = why ? ghostBad : ghostOK; });
  let extra = '';
  if (def.reach) extra = ` · 반경 ${def.reach}m`;
  if (def.power) { const tmp = { x: p.x, z: p.z }; const ok = builds.some(n => (n.type === 'generator' || n.type === 'pole') && Math.hypot(n.x - tmp.x, n.z - tmp.z) <= (n.type === 'generator' ? 3.5 : poleDrop())); extra += ok ? ' · ⚡ 전기 닿음' : ' · ⚠ 전기 안 닿음'; }
  $('buildinfo').textContent = why || `${money(cost)}${extra} — 클릭해 설치 · R 회전`;
  drawReach(def.reach ? p : null, def.reach);
}
let reachRing = null;
function drawReach(p, r) { if (reachRing) { ghostRoot.remove(reachRing); reachRing = null; } if (!p) return; reachRing = new THREE.Mesh(new THREE.RingGeometry(r - .05, r, 48), new THREE.MeshBasicMaterial({ color: '#e080f0', transparent: true, opacity: .7, side: THREE.DoubleSide, depthWrite: false })); reachRing.rotation.x = -Math.PI / 2; reachRing.position.set(p.x, .03, p.z); ghostRoot.add(reachRing); }
function inStand(x, z, r) { const sb = yard.standBox; return x < sb.x1 + r && z > sb.z0 - r && z < sb.z1 + r || Math.hypot(x - yard.basket.x, z - yard.basket.z) < .5 + r || Math.hypot(x - yard.kiosk.x, z - yard.kiosk.z) < .8 + r; }
function buildClick() {
  if (!BM) return;
  if (BM.dis) { if (BM.target) { const b = BM.target, refund = b.type === 'belt' ? buildCost('belt', b.len) : buildCost(b.type); S.money += refund; removeBuild(b); sfx('place', .6); toast(`🔨 철거 · ${money(refund)} 환불`); } return; }
  if (!BM.ok) { sfx('deny'); return; }
  if (BM.type === 'belt') {
    if (BM.stage === 0) { BM.a = { ...BM.p }; BM.stage = 1; sfx('pick'); return; }
    S.money -= BM.cost; const bl = addBelt(BM.a, BM.p); BM.a = { ...bl.b }; relink(); sfx('place'); mission('belt'); return;
  }
  S.money -= BM.cost; const m = addMachine(BM.type, BM.p.x, BM.p.z, BM.rot); relink(); powerTick(); sfx('place'); solidCache = null;
  if (BM.type.startsWith('arm')) mission('arm');
  if (D.BUILD[BM.type].max) endBuild();
}
function buildCancel() { if (!BM) return; if (BM.type === 'belt' && BM.stage === 1) { BM.stage = 0; BM.a = null; return; } endBuild(); }

// ════════════ 연구 (YARD RESEARCH) ════════════
function techMax(t) { return t.cost.length; }
function techCost(t) { const l = lvl(t.id); return l < t.cost.length ? t.cost[l] : null; }
function reqOK(t) { const parents = t.up ? [t.up] : (t.req || []); return parents.every(id => has(id)); }
function buy(id) {
  const t = D.TECH_BY[id]; const c = techCost(t); if (c == null || !reqOK(t)) return false;
  if (S.money < c) { sfx('deny'); return false; }
  S.money -= c; S.tech[id] = lvl(id) + 1; sfx('buy');
  if (id === 'hand_carry') mission('carry');
  if (t.tool) { if (t.tool === 'bucket') deliver('bucket'); else if (t.tool === 'barrow') deliver('barrow'); else deliver('tool', t.tool); toast(`📦 ${t.ko} — SUPPLY CO. 배달 팔레트에 도착!`, 3500); mission('buy_tool'); if (t.tool === 'bucket') mission('bucket'); }
  else if (t.build) toast(`🛠 ${t.ko} — B 키(건설)로 설치할 수 있다`, 3500);
  if (id === 'joiner' || id === 'pole_span' || id === 'pole_drop') relink();
  save(); return true;
}
let rsSel = null, rsZoom = MOBILE ? .78 : 1;
function openResearch() { closeOverlays(); $('research').classList.remove('hide'); unlockPointer(); renderResearch(); }
function renderResearch() {
  const box = $('rsCanvas'), q = ($('rsSearch').value || '').trim().toLowerCase();
  const CW = 236, CARD = 84, GAPY = 10, X0r = 20;
  const pos = {}; let y = 30; const bands = [];
  const kids = id => D.TECH.filter(t => t.up === id);
  let html = '', lines = '';
  const maxCol = Math.max(...D.TECH.filter(t => t.col != null).map(t => t.col)) + 1;
  for (let c = 0; c <= maxCol; c++) html += `<div class="rs-colh" style="left:${X0r + c * CW}px">${c === 0 ? '시작' : c + '단계'}</div>`;
  for (const cat of D.CATS) {
    const cards = D.TECH.filter(t => t.cat === cat.k && t.col != null); if (!cards.length) continue;
    const colY = {}; const top = y;
    const place = (c, h) => { const yy = colY[c] == null ? top : colY[c]; colY[c] = yy + h + GAPY; return yy; };
    for (const t of cards) { const yy = place(t.col, CARD); pos[t.id] = { x: X0r + t.col * CW, y: yy, w: CW - 26, h: CARD }; const ks = kids(t.id); if (ks.length) { const bh = 24 + ks.length * 24; const by = place(t.col + 1, bh); pos['box_' + t.id] = { x: X0r + (t.col + 1) * CW, y: by, w: CW - 26, h: bh }; ks.forEach((k, i) => pos[k.id] = { x: X0r + (t.col + 1) * CW, y: by + 24 + i * 24, w: CW - 26, h: 24, row: true }); } }
    const bottom = Math.max(...Object.values(colY)); bands.push({ cat, y0: top - 8, y1: bottom }); y = bottom + 26;
  }
  const W_ = X0r + (maxCol + 1) * CW + 40, H_ = y + 20;
  for (const b of bands) html += `<div class="rs-band" style="top:${b.y0}px;height:${b.y1 - b.y0}px;--c:${b.cat.col}"></div>`;
  for (const k in pos) if (k.startsWith('box_')) { const p = pos[k], par = D.TECH_BY[k.slice(4)], cat = D.CATS.find(c => c.k === par.cat); html += `<div class="rs-box" style="left:${p.x}px;top:${p.y}px;width:${p.w}px;height:${p.h}px;--c:${cat.col}"><em>${esc(par.ko)} 업그레이드</em></div>`; }
  const st = t => { const l = lvl(t.id), mx = techMax(t), c = techCost(t), r = reqOK(t); return { l, mx, c, r, done: l >= mx, ready: r && c != null && S.money >= c }; };
  for (const t of D.TECH) {
    const p = pos[t.id]; if (!p) continue; const s = st(t), cat = D.CATS.find(c => c.k === t.cat);
    const match = !q || (t.ko + t.en).toLowerCase().includes(q);
    const pr = (t.up ? [t.up] : t.req || []); for (const pid of pr) { const pp = t.up ? pos['box_' + t.up] && pos[t.up] : pos[pid]; if (!pp) continue; const a = pos[pid], bx = t.up ? pos['box_' + t.up] : p; if (t.up && t !== kids(t.up)[0]) continue; const x1 = a.x + a.w, y1 = a.y + a.h / 2, x2 = bx.x, y2 = bx.y + (t.up ? 12 : bx.h / 2), mx = x1 + 12; lines += `<path d="M${x1} ${y1} H${mx} V${y2} H${x2}" stroke="${has(pid) ? cat.col : '#3a3a34'}" stroke-width="2" fill="none" opacity="${has(pid) ? .9 : .6}"/>`; }
    const cls = s.done ? 'own' : !s.r ? 'lock' : s.ready ? 'ready' : 'poor';
    const pt = s.done ? (s.mx > 1 ? 'MAX' : 'OWNED') : !s.r ? 'LOCKED' : priceTag(s.c);
    if (p.row) html += `<div class="rs-row ${cls}${rsSel === t.id ? ' sel' : ''}${match ? '' : ' dim'}" data-id="${t.id}" style="left:${p.x}px;top:${p.y}px;width:${p.w}px"><span>${esc(t.ko)}</span><b>${pt}</b><small>${s.l}/${s.mx}</small></div>`;
    else html += `<div class="rs-card ${cls}${rsSel === t.id ? ' sel' : ''}${match ? '' : ' dim'}" data-id="${t.id}" style="left:${p.x}px;top:${p.y}px;width:${p.w}px;height:${p.h}px;--c:${cat.col}"><div class="ic">${t.icon || '•'}</div><div class="tx"><em>${cat.ko} · ${cat.en}</em><strong>${esc(t.ko)}</strong><small>${esc(t.en)}</small></div><div class="ft"><b>${s.done ? 'DONE' : pt}</b>${s.mx > 1 ? `<span>${s.l}/${s.mx}</span>` : s.done ? '<span>OWNED</span>' : ''}</div></div>`;
  }
  box.style.width = W_ + 'px'; box.style.height = H_ + 'px'; box.style.transform = `scale(${rsZoom})`; box.style.transformOrigin = '0 0';
  $('rsSize').style.width = W_ * rsZoom + 'px'; $('rsSize').style.height = H_ * rsZoom + 'px';
  box.innerHTML = `<svg width="${W_}" height="${H_}" class="rs-svg">${lines}</svg>` + html;
  // 왼쪽 분류
  $('rsCats').innerHTML = D.CATS.map(c => { const ts = D.TECH.filter(t => t.cat === c.k); const bought = ts.reduce((a, t) => a + Math.min(lvl(t.id), techMax(t)) - (t.own ? 1 : 0), 0), total = ts.reduce((a, t) => a + techMax(t) - (t.own ? 1 : 0), 0), ready = ts.filter(t => st(t).ready).length; const b = bands.find(b => b.cat === c); return `<div class="rs-cat" data-y="${b ? b.y0 : 0}" style="--c:${c.col}"><b>${c.ko}</b> <em>${c.en}</em><small>${bought}/${total} 구매${ready ? ` · <i>${ready} 가능</i>` : ''}</small></div>`; }).join('');
  const allB = D.TECH.reduce((a, t) => a + Math.min(lvl(t.id), techMax(t)) - (t.own ? 1 : 0), 0), allT = D.TECH.reduce((a, t) => a + techMax(t) - (t.own ? 1 : 0), 0);
  $('rsFoot').textContent = `${allB} / ${allT} 단계 구매 — ${MOBILE ? '카드 탭: 선택 · 구매 버튼' : '클릭: 선택 · 더블클릭: 구매 · 드래그: 이동 · 휠: 확대'}`;
  $('rsMoney').textContent = money(S.money);
  renderRsDetail();
}
function renderRsDetail() {
  const el = $('rsDetail'); if (!rsSel) { el.innerHTML = '<span class="dimtxt">카드를 고르면 설명이 나온다</span>'; return; }
  const t = D.TECH_BY[rsSel], l = lvl(t.id), c = techCost(t), r = reqOK(t), cat = D.CATS.find(x => x.k === t.cat);
  const srcTxt = { orig: '원작 화면에서 이름·가격 확인', name: '원작 이름 확인 · 가격은 추정', guess: '추정' }[t.src] || '';
  const reqs = (t.up ? [t.up] : t.req || []).map(id => D.TECH_BY[id].ko).join(', ');
  el.innerHTML = `<div class="rd-t"><b style="color:${cat.col}">${cat.ko}</b> ${esc(t.ko)} <small>${esc(t.en)}</small></div><div class="rd-d">${esc(t.d || '')}${reqs ? ` <span class="dimtxt">· 선행: ${esc(reqs)}</span>` : ''}</div><div class="rd-s">${l}/${techMax(t)} · <span class="dimtxt">${srcTxt}</span></div>` +
    (c == null ? '<button class="btn" disabled>완료</button>' : `<button class="btn go" id="rsBuy" ${r && S.money >= c ? '' : 'disabled'}>${r ? '구매 ' + priceTag(c) : '잠김'}</button>`);
  const b = $('rsBuy'); if (b) b.onclick = () => { if (buy(rsSel)) renderResearch(); };
}

// ════════════ 바늘 진열장 ════════════
let cabOpen = null;
function openCabinet(b) {
  if (P.needle != null) { const id = P.needle; needles[id].st = 'cabinet'; S.cabinet.push(id); P.needle = null; setViewNeedle(); sfx('needle'); toast(`🗄 ${D.NEEDLES[id].ko} 진열! (${S.cabinet.length}/${needles.length}) · 건초 값 +5%`, 3500); mission('cabinet'); if (S.cabinet.length >= needles.length) mission('all'); updateCabinetModel(); save(); }
  closeOverlays(); cabOpen = b; unlockPointer(); $('cabinet').classList.remove('hide'); renderCabinet();
}
function renderCabinet() {
  const done = S.cabinet.length >= needles.length;
  $('cabGrid').innerHTML = D.NEEDLES.map((n, i) => { const have = S.cabinet.includes(i); return `<div class="cab-slot ${have ? 'have' : ''}"><div class="cab-pin" style="--c:${n.col}">${have ? '' : '?'}</div><div class="cab-tag"><b>${have ? n.en : '???'}</b><small>RESEARCH ${n.tier} · ${n.odds}</small>${have ? `<i>${n.ko}</i>` : ''}</div></div>`; }).join('') + Array.from({ length: 12 }, () => '<div class="cab-slot empty"><div class="cab-pin">—</div><div class="cab-tag"><small>다음 더미</small></div></div>').join('');
  $('cabInfo').innerHTML = done ? '🔴 모든 바늘을 찾았다. 빨간 단추를 누르면…' : `찾은 바늘 ${S.cabinet.length} / ${needles.length} — 바늘을 들고 진열장을 보고 E`;
  $('cabBtn').classList.toggle('hide', !done);
}
function updateCabinetModel() {
  for (const m of builds) if (m.type === 'cabinet') { m.cab.slots.clear(); S.cabinet.forEach(id => { const nm = W.needleModel(D.NEEDLES[id]); const c = id % 6, r = Math.floor(id / 6); nm.position.set(-.57 + c * .228, 1.0 + (3 - r) * .32, 0); nm.scale.setScalar(1.2); m.cab.slots.add(nm); }); m.cab.btn.visible = S.cabinet.length >= needles.length; }
}
function finishPile() {
  closeOverlays();
  $('ending').classList.remove('hide'); unlockPointer();
  $('endStats').innerHTML = `플레이 ${Math.floor(S.play / 3600)}시간 ${Math.floor(S.play / 60) % 60}분 · 파낸 건초 ${fmtN(S.dug)} 가닥 · 번 돈 ${money(S.earned)}`;
}
function nextPile() {
  S.pileNo++; for (const it of [...items]) removeItem(it);
  genPile(S.pileNo); genNeedles(S.pileNo); S.cabinet = []; buildNeedleMeshes(); updatePileMesh(true); updateFuzz(true); updateCabinetModel();
  $('ending').classList.add('hide'); toast(`🚚 DISPATCH 문이 열리고 새 더미(${S.pileNo}번째)가 쏟아졌다. 바늘 12개가 또 숨어 있다`, 5000); save();
}

// ════════════ 미션 ════════════
function mission(id) { if (S.missions[id]) return; S.missions[id] = 1; const m = D.MISSIONS.find(x => x.id === id); if (m) { toast(`✔ ${m.t}`, 2400); renderMission(); } }
function renderMission() {
  const cur = D.MISSIONS.find(m => !S.missions[m.id]);
  $('mission').innerHTML = cur ? `<h5>할 일 ${D.MISSIONS.indexOf(cur) + 1}/${D.MISSIONS.length}</h5><div class="mt">${esc(cur.t)}</div><div class="mh">${esc(cur.hint)}</div>` : '<h5>할 일</h5><div class="mt">더미를 다 찾아냈다?</div>';
}

// ════════════ HUD ════════════
function renderHotbar() {
  $('hotbar').innerHTML = S.hotbar.map((t, i) => `<div class="hs ${i === S.slot && !P.holding ? 'on' : ''}" data-i="${i}"><span class="k">${i + 1}</span>${TOOLS[t].icon}<small>${TOOLS[t].ko}</small></div>`).join('');
}
function updateHints() {
  if (MOBILE) return;
  $('hints').textContent = BM ? '왼쪽 클릭: 설치 · 오른쪽 클릭/Esc: 취소 · R: 회전 · F: 격자 끄기/켜기 · 휠클릭: 같은 건물 고르기'
    : '왼쪽: 퍼기/쏟기 · 오른쪽: 쏟기 · E: 줍기/열기 · Q: 바늘 버리기 · G: 연장 내려놓기 · B: 건설 · X: 철거 · Tab: 연구 · Esc: 메뉴';
}
const labels = []; // 화면에 떠 있는 글자
function floatText(txt, pos, cls) { const el = document.createElement('div'); el.className = 'ft ' + (cls || ''); el.innerHTML = txt; $('hud').appendChild(el); labels.push({ el, pos: pos.clone(), t: 1.4 }); }
function stepLabels(dt) {
  for (let i = labels.length - 1; i >= 0; i--) { const l = labels[i]; l.t -= dt; l.pos.y += dt * .5; if (l.t <= 0) { l.el.remove(); labels.splice(i, 1); continue; } _v.copy(l.pos).project(camera); if (_v.z > 1) { l.el.style.display = 'none'; continue; } l.el.style.display = ''; l.el.style.left = ((_v.x + 1) / 2 * innerWidth) + 'px'; l.el.style.top = ((1 - _v.y) / 2 * innerHeight) + 'px'; l.el.style.opacity = Math.min(1, l.t * 2); }
  // 양동이 수량 표시 (원작 "485 / 600")
  const cl = $('contLabels'); let html = '';
  for (const c of props) { if (c.kind === 'tool') continue; const d = Math.hypot(c.x - P.x, c.z - P.z); if (d > 5) continue; _v.set(c.x, c.y + (c.kind === 'bucket' ? .55 : 1.05), c.z).project(camera); if (_v.z > 1) continue; html += `<div class="cl" style="left:${(_v.x + 1) / 2 * innerWidth}px;top:${(1 - _v.y) / 2 * innerHeight}px">${c.n >= contCap(c.kind) ? 'FULL' : `${fmtN(c.n)} / ${fmtN(contCap(c.kind))}`}</div>`; }
  cl.innerHTML = html;
}
let hudT = 0;
function updateHUD(dt) {
  hudT -= dt; if (hudT > 0) return; hudT = .1;
  document.body.classList.toggle('ovl', anyOverlay()); document.body.classList.toggle('bm', !!BM);
  if (MOBILE) { $('tUse').textContent = BM ? '설치' : '사용'; $('tAlt').textContent = BM ? (BM.type === 'belt' && BM.stage ? '그만' : '취소') : '쏟기'; }
  $('money').textContent = money(S.money);
  $('pileLeft').textContent = `더미 ${fmtN(pileStrands())} 가닥`;
  $('needleCnt').textContent = `🪡 ${S.cabinet.length} / ${needles.length}` + (P.needle != null ? ' · 손에 1개' : '');
  const a = aimHit, t = curTool(), st = toolStat(t); let aim = '', sub = '';
  if (BM) { $('aim').innerHTML = ''; }
  else {
    if (a && a.t < reachOf() + .8) {
      if (a.kind === 'prop') { const p = a.ref.p; aim = p.kind === 'tool' ? `E 줍기 — ${TOOLS[p.tool].ko}` : `E 들기 — ${p.kind === 'bucket' ? '양동이' : '손수레'} (${fmtN(p.n)}/${fmtN(contCap(p.kind))})`; }
      else if (a.kind === 'needle') aim = `<span class="good">E 줍기 — 바늘!</span>`;
      else if (a.kind === 'kiosk') aim = 'E 열기 — SUPPLY CO. 연구';
      else if (a.kind === 'build') { const b = a.ref.b; aim = b.type === 'belt' ? (b.sell ? 'HAY IN — 여기에 건초를 쏟으면 팔린다' : '벨트') : b.type === 'cabinet' ? 'E 열기 — 바늘 진열장' : `${b.def.ko}${b.def.power ? (b.powered ? ' · ⚡' : ' · ⚠ 전기 없음') : ''}${b.type === 'generator' ? ` · 연료 ${fmtN(b.fuel)}` : ''}${b.type === 'compressor' ? ` · ${fmtN(b.buf)}/${compBatch()}` : ''}`; }
      else if (isHay(a) && st && P.load.n < st.cap) aim = t === 'hand' ? '클릭 — 집기' : '클릭 — 퍼기';
    }
    if (P.holding) sub = `${P.holding.kind === 'bucket' ? '양동이' : '손수레'} ${fmtN(P.holding.n)}/${fmtN(contCap(P.holding.kind))} — 왼쪽: 붓기 · E/오른쪽: 내려놓기`;
    else if (st && P.load.n) sub = `${fmtN(P.load.n)} / ${fmtN(st.cap)}`;
    else if (t === 'vac') sub = `탱크 ${fmtN(P.vac.n)} / 1,500`;
    $('aim').innerHTML = (aim ? `<div>${aim}</div>` : '') + (sub ? `<small>${sub}</small>` : '');
  }
  $('cross').classList.toggle('hot', !!aim);
  $('stam').style.width = (P.stam * 100) + '%'; $('stamBox').classList.toggle('hide', P.stam >= .999);
  const ui = $('hotbar').querySelector('.on'); if (P.holding && ui) renderHotbar();
}

// ════════════ 표지판 캔버스 (시계·금전등록기·기록판·단말기) ════════════
let signT = 0;
function updateSigns(dt) {
  signT -= dt; if (signT > 0) return; signT = .5;
  const ck = yard.clock, s = Math.floor(S.play); ck.g.fillStyle = '#100'; ck.g.fillRect(0, 0, 256, 80); ck.g.fillStyle = '#ff3a2a'; ck.g.font = 'bold 56px monospace'; ck.g.textAlign = 'center'; ck.g.textBaseline = 'middle';
  ck.g.fillText(`${String(Math.floor(s / 3600)).padStart(2, '0')}:${String(Math.floor(s / 60) % 60).padStart(2, '0')}:${String(s % 60).padStart(2, '0')}`, 128, 42); ck.t.needsUpdate = true;
  const rg = yard.register; rg.g.fillStyle = '#031'; rg.g.fillRect(0, 0, 128, 48); rg.g.fillStyle = '#5f6'; rg.g.font = 'bold 30px monospace'; rg.g.textAlign = 'center'; rg.g.textBaseline = 'middle'; rg.g.fillText(money(lastSale), 64, 26); rg.t.needsUpdate = true;
  const rc = yard.records, g = rc.g; g.fillStyle = '#1e2a22'; g.fillRect(0, 0, 256, 320); g.strokeStyle = '#8a6a40'; g.lineWidth = 10; g.strokeRect(5, 5, 246, 310);
  g.fillStyle = '#e8e4d0'; g.font = 'bold 26px Arial'; g.textAlign = 'center'; g.fillText('YARD RECORDS', 128, 44); g.font = '20px Arial'; g.textAlign = 'left';
  [['파낸 건초', fmtN(S.dug)], ['판 가닥', fmtN(S.sold)], ['번 돈', money(S.earned)], ['최고 판매', money(S.bestSale)], ['바늘', `${S.cabinet.length}/${needles.length}`], ['건물', builds.filter(b => !b.fixed).length]].forEach(([k, v], i) => { g.fillStyle = '#b8b4a0'; g.fillText(k, 24, 96 + i * 36); g.fillStyle = '#fff'; g.textAlign = 'right'; g.fillText(String(v), 232, 96 + i * 36); g.textAlign = 'left'; });
  rc.t.needsUpdate = true;
  const sc = yard.screen; sc.g.fillStyle = '#0a1a10'; sc.g.fillRect(0, 0, 128, 96); sc.g.fillStyle = '#7f7'; sc.g.font = 'bold 15px monospace'; sc.g.fillText('YARD', 8, 22); sc.g.fillText('RESEARCH', 8, 40); sc.g.fillStyle = '#ff7'; sc.g.fillText(money(S.money), 8, 66); sc.g.fillStyle = '#7f7'; sc.g.fillText('[E] OPEN', 8, 86); sc.t.needsUpdate = true;
}

// ════════════ 바늘 표시 · 노출 ════════════
let ndT = 0;
function stepNeedles(dt) {
  ndT -= dt;
  if (ndT <= 0) { ndT = .4; for (const q of needles) if (q.st === 'pile') { const h = hAt(q.x, q.z); if (q.y > h - .005) { q.st = 'prop'; q.y = Math.max(0, h); } } }
  const tt = performance.now() / 1000;
  for (const q of needles) { const m = needleMeshes[q.id]; if (!m) continue; m.visible = q.st === 'prop'; if (m.visible) { m.position.set(q.x, q.y + .02, q.z); m.rotation.set(Math.PI / 2, 0, q.id); m.updateMatrixWorld(true); const gl = m.userData.glint; gl.material.opacity = .45 + Math.sin(tt * 4 + q.id) * .4; gl.scale.setScalar(.3 + Math.sin(tt * 3 + q.id) * .08); } }
}

// ════════════ 저장 ════════════
const SAVE_KEY = 'needle_save_v1';
function b64(u8) { let s = ''; for (let i = 0; i < u8.length; i += 8192) s += String.fromCharCode.apply(null, u8.subarray(i, i + 8192)); return btoa(s); }
function unb64(s) { const b = atob(s), u = new Uint8Array(b.length); for (let i = 0; i < b.length; i++) u[i] = b.charCodeAt(i); return u; }
let resetting = false;
function save() {
  if (resetting) return;
  try {
    const h16 = new Uint16Array(H.length); for (let k = 0; k < H.length; k++) h16[k] = Math.round(clamp(H[k], 0, 65) * 1000);
    const data = {
      v: 1, S, K, P: { x: P.x, y: P.y, z: P.z, yaw: P.yaw, pitch: P.pitch, load: P.load, vac: P.vac, needle: P.needle, holding: P.holding ? props.indexOf(P.holding) : -1 },
      H: b64(new Uint8Array(h16.buffer)), needles: needles.map(q => ({ st: q.st === 'load' ? 'pile' : q.st, x: +q.x.toFixed(3), y: +q.y.toFixed(3), z: +q.z.toFixed(3) })),
      props: props.map(p => ({ kind: p.kind, tool: p.tool, x: +p.x.toFixed(2), y: +p.y.toFixed(2), z: +p.z.toFixed(2), ry: p.ry, n: p.n, nd: p.nd })),
      builds: builds.filter(b => !b.fixed).map(b => b.type === 'belt' ? { type: 'belt', a: b.a, b: b.b } : { type: b.type, x: b.x, z: b.z, rot: b.rot, fuel: b.fuel, buf: b.buf }),
      items: items.filter(i => i.st === 'ground').slice(0, 300).map(i => ({ k: i.kind, n: i.n, x: +i.x.toFixed(2), y: +i.y.toFixed(2), z: +i.z.toFixed(2) })),
    };
    // 벨트 위·공중에 있던 바늘은 더미로
    localStorage.setItem(SAVE_KEY, JSON.stringify(data));
  } catch (e) { }
}
function load() {
  let d = null; try { d = JSON.parse(localStorage.getItem(SAVE_KEY) || 'null'); } catch (e) { }
  if (!d || d.v !== 1) return false;
  try {
    Object.assign(S, d.S); K = d.K;
    if (S.missions.earn1 || lvl('hand_carry')) S.missions.carry = 1; // '한 움큼' 할 일은 나중에 추가됨 — 이미 지난 세이브는 건너뜀
    const u = unb64(d.H), h16 = new Uint16Array(u.buffer, 0, H.length); for (let k = 0; k < H.length; k++) H[k] = h16[k] / 1000; pileSum = sumH();
    genNeedles(S.pileNo); d.needles.forEach((q, i) => { if (needles[i]) Object.assign(needles[i], q); });
    for (const q of needles) if (q.st === 'held') q.st = 'prop';
    for (const p of d.props) addProp(p);
    for (const b of d.builds) { if (b.type === 'belt') addBelt(b.a, b.b); else { const m = addMachine(b.type, b.x, b.z, b.rot); m.fuel = b.fuel || 0; m.buf = b.buf || 0; } }
    for (const i of d.items || []) { const it = mkItem(i.k, i.n, i.x, i.y, i.z); it.st = 'ground'; }
    Object.assign(P, { x: d.P.x, y: d.P.y, z: d.P.z, yaw: d.P.yaw, pitch: d.P.pitch, load: d.P.load || { n: 0, nd: [] }, vac: d.P.vac || { n: 0, nd: [] } });
    for (const id of [...P.load.nd, ...P.vac.nd]) if (needles[id]) needles[id].st = 'load';
    if (d.P.needle != null && needles[d.P.needle]) { P.needle = d.P.needle; needles[P.needle].st = 'held'; }
    if (d.P.holding >= 0 && props[d.P.holding]) { P.holding = props[d.P.holding]; P.holding.g.visible = false; }
    return true;
  } catch (e) { console.warn('세이브 읽기 실패', e); return false; }
}
function resetSave() { resetting = true; try { localStorage.removeItem(SAVE_KEY); } catch (e) { } location.reload(); }

// ════════════ 입력 ════════════
let locked = false;
function lockPointer() { if (MOBILE || anyOverlay()) return; try { const pr = canvas.requestPointerLock(); if (pr && pr.catch) pr.catch(() => { }); } catch (e) { } }
function unlockPointer() { if (document.pointerLockElement) document.exitPointerLock(); }
document.addEventListener('pointerlockchange', () => { locked = document.pointerLockElement === canvas; $('clickToPlay').classList.toggle('hide', locked || MOBILE || anyOverlay() || !started); });
const OVERLAYS = ['research', 'catalog', 'cabinet', 'menu', 'ending'];
const anyOverlay = () => OVERLAYS.some(id => !$(id).classList.contains('hide')) || !started;
function closeOverlays() { for (const id of OVERLAYS) $(id).classList.add('hide'); cabOpen = null; }
let sens = +(localStorage.getItem('needle_sens') || 1);
canvas.addEventListener('mousedown', e => {
  if (MOBILE) return; if (!locked) { lockPointer(); return; }
  if (e.button === 0) { mouseL = true; if (BM) buildClick(); else primary(0, true); }
  if (e.button === 2) { mouseR = true; if (BM) buildCancel(); else secondary(0, true); }
  if (e.button === 1) { e.preventDefault(); const a = aimHit; if (a && a.kind === 'build' && !a.ref.b.fixed) { const t = a.ref.b.type; if (t === 'belt' ? has('belt') : D.TECH.some(x => x.build && x.build.includes(t) && has(x.id)) || t === 'cabinet') startBuild(t); } }
});
addEventListener('mouseup', e => { if (e.button === 0) { mouseL = false; pouring = false; } if (e.button === 2) mouseR = false; });
addEventListener('contextmenu', e => e.preventDefault());
addEventListener('mousemove', e => { if (!locked) return; P.yaw -= e.movementX * .0022 * sens; P.pitch = clamp(P.pitch - e.movementY * .0022 * sens, -1.5, 1.5); });
addEventListener('wheel', e => { if (!started) return; if (!$('research').classList.contains('hide')) { if (!e.target.closest('#rsScroll')) return; e.preventDefault(); rsZoom = clamp(rsZoom * (e.deltaY > 0 ? .9 : 1.1), .45, 1.6); renderResearch(); return; } if (anyOverlay() || BM) return; if (S.hotbar.length) selectSlot((S.slot + (e.deltaY > 0 ? 1 : -1) + S.hotbar.length) % S.hotbar.length); }, { passive: false });
let xHold = 0;
addEventListener('keydown', e => {
  if (e.target.tagName === 'INPUT') { if (e.code === 'Escape') e.target.blur(); return; }
  const k = e.code; if (k === 'Tab') e.preventDefault();
  if (!started) return;
  if (k === 'Escape') { if (BM) { endBuild(); return; } if (anyOverlay() && $('menu').classList.contains('hide')) { closeOverlays(); lockPointer(); return; } if (!$('menu').classList.contains('hide')) { closeOverlays(); lockPointer(); return; } openMenu(); return; }
  if (k === 'Tab' || k === 'KeyT') { if (!$('research').classList.contains('hide')) { closeOverlays(); lockPointer(); } else openResearch(); return; }
  if (k === 'KeyB') { if (!$('catalog').classList.contains('hide')) { closeOverlays(); lockPointer(); } else openCatalog(); return; }
  if (anyOverlay()) return;
  keys.add(k);
  if (k.startsWith('Digit')) { const n = +k.slice(5); if (n >= 1) selectSlot(n - 1); }
  if (k === 'KeyE') interact();
  if (k === 'KeyG') dropTool();
  if (k === 'KeyQ') { if (P.needle != null) { const q = needles[P.needle]; camera.getWorldDirection(_d); q.st = 'prop'; q.x = P.x + _d.x; q.z = P.z + _d.z; q.y = groundAt(q.x, q.z); P.needle = null; setViewNeedle(); } }
  if (k === 'KeyR' && BM) BM.rot += (e.shiftKey ? -1 : 1) * Math.PI / 4;
  if (k === 'KeyF' && BM) { BM.snap = !BM.snap; toast(BM.snap ? '격자 맞춤 켬' : '격자 맞춤 끔 (No Snap)', 1200); }
  if (k === 'KeyX' && !BM) startBuild('dismantle');
});
addEventListener('keyup', e => keys.delete(e.code));
addEventListener('blur', () => { keys.clear(); mouseL = mouseR = false; });
$('hotbar').addEventListener('pointerdown', e => { const s = e.target.closest('.hs'); if (s) { e.stopPropagation(); selectSlot(+s.dataset.i); } });

// 모바일: 왼쪽 조이스틱 · 오른쪽 드래그 시점 · 버튼
const touches = new Map();
function onTouchStart(e) {
  if (!MOBILE || e.pointerType === 'mouse' && !Q.has('mobile')) return;
  if (e.target !== canvas && e.target.id !== 'touchLayer') return;
  const left = e.clientX < innerWidth * .45 && e.clientY > innerHeight * .35;
  touches.set(e.pointerId, { kind: left ? 'move' : 'look', x0: e.clientX, y0: e.clientY, x: e.clientX, y: e.clientY });
  if (left) { const j = $('joy'); j.style.left = e.clientX + 'px'; j.style.top = e.clientY + 'px'; j.classList.remove('hide'); }
}
function onTouchMove(e) {
  const t = touches.get(e.pointerId); if (!t) return;
  if (t.kind === 'look') { P.yaw -= (e.clientX - t.x) * .0055 * sens; P.pitch = clamp(P.pitch - (e.clientY - t.y) * .0055 * sens, -1.5, 1.5); }
  t.x = e.clientX; t.y = e.clientY;
  if (t.kind === 'move') { const dx = t.x - t.x0, dy = t.y - t.y0, l = Math.hypot(dx, dy), m = 55; touchMove.x = clamp(dx / m, -1, 1); touchMove.y = clamp(dy / m, -1, 1); $('joyKnob').style.transform = `translate(${clamp(dx, -m, m)}px,${clamp(dy, -m, m)}px)`; }
}
function onTouchEnd(e) { const t = touches.get(e.pointerId); if (!t) return; touches.delete(e.pointerId); if (t.kind === 'move') { touchMove.x = touchMove.y = 0; $('joy').classList.add('hide'); $('joyKnob').style.transform = ''; } }
$('touchLayer').addEventListener('pointerdown', onTouchStart); canvas.addEventListener('pointerdown', onTouchStart);
addEventListener('pointermove', onTouchMove); addEventListener('pointerup', onTouchEnd); addEventListener('pointercancel', onTouchEnd);
function tbtn(id, down, up) { const b = $(id); b.addEventListener('pointerdown', e => { e.preventDefault(); e.stopPropagation(); ac(); down(); b.classList.add('on'); }); const u = e => { b.classList.remove('on'); if (up) up(); }; b.addEventListener('pointerup', u); b.addEventListener('pointercancel', u); b.addEventListener('pointerleave', u); }
tbtn('tUse', () => { touchUse = true; if (BM) buildClick(); else primary(0, true); }, () => { touchUse = false; pouring = false; });
tbtn('tAlt', () => { touchAlt = true; if (BM) buildCancel(); else secondary(0, true); }, () => { touchAlt = false; });
tbtn('tE', () => interact()); tbtn('tJump', () => { touchJump = true; }, () => { touchJump = false; });
tbtn('tRes', () => openResearch()); tbtn('tBuild', () => openCatalog()); tbtn('tMenu', () => openMenu());
tbtn('tRot', () => { if (BM) BM.rot += Math.PI / 4; }); tbtn('tDrop', () => { if (P.needle != null) { const q = needles[P.needle]; q.st = 'prop'; q.x = P.x; q.z = P.z + .5; q.y = groundAt(q.x, q.z); P.needle = null; setViewNeedle(); } else dropTool(); });

// ════════════ 오버레이 (건설 목록 · 메뉴) ════════════
function openCatalog() {
  closeOverlays(); if (BM) endBuild(); unlockPointer(); $('catalog').classList.remove('hide');
  const avail = ['cabinet']; for (const t of D.TECH) if (t.build && has(t.id)) avail.push(...t.build);
  const all = Object.keys(D.BUILD);
  $('catGrid').innerHTML = all.map(k => { const d = D.BUILD[k], ok = avail.includes(k); const tech = D.TECH.find(t => t.build && t.build.includes(k)); return `<button class="cat-b ${ok ? '' : 'lock'}" data-k="${k}" ${ok ? '' : 'disabled'}><span class="ic">${d.icon}</span><b>${d.ko}</b><small>${ok ? (d.perM ? money(buildCost(k, 1)) + '/m' : money(buildCost(k))) : '🔒 ' + (tech ? tech.ko : '')}</small><em>${d.d}</em></button>`; }).join('') + `<button class="cat-b" data-k="dismantle"><span class="ic">🔨</span><b>철거</b><small>전액 환불</small><em>건물을 보고 클릭 (X 키)</em></button>`;
}
$('catGrid').addEventListener('click', e => { const b = e.target.closest('.cat-b'); if (!b || b.disabled) return; startBuild(b.dataset.k); lockPointer(); });
function openMenu() { closeOverlays(); if (BM) endBuild(); unlockPointer(); $('menu').classList.remove('hide'); $('sens').value = sens; }
$('sens').addEventListener('input', e => { sens = +e.target.value; try { localStorage.setItem('needle_sens', sens); } catch (er) { } });
$('menuResume').onclick = () => { closeOverlays(); lockPointer(); };
$('menuReset').onclick = () => { if (confirm('처음부터 다시 할까? 저장이 지워진다.')) resetSave(); };
$('menuSound').onclick = () => { if (window.Sound) { const off = Sound.sfxVolume > 0; Sound.setSfxVolume(off ? 0 : .8); Sound.setBgmVolume(0); $('menuSound').textContent = off ? '🔇 소리 켜기' : '🔊 소리 끄기'; } };
for (const id of ['rsClose', 'catClose', 'cabClose']) $(id).onclick = () => { closeOverlays(); lockPointer(); };
$('cabBtn').onclick = () => finishPile();
$('endNext').onclick = () => { nextPile(); lockPointer(); };
$('rsSearch').addEventListener('input', () => renderResearch());
$('rsCanvas').addEventListener('click', e => { const c = e.target.closest('[data-id]'); if (!c) return; rsSel = c.dataset.id; renderResearch(); });
$('rsCanvas').addEventListener('dblclick', e => { const c = e.target.closest('[data-id]'); if (!c) return; rsSel = c.dataset.id; buy(rsSel); renderResearch(); });
$('rsCats').addEventListener('click', e => { const c = e.target.closest('.rs-cat'); if (c) $('rsScroll').scrollTo({ top: +c.dataset.y * rsZoom - 10, behavior: 'smooth' }); });
$('rsZoomIn').onclick = () => { rsZoom = clamp(rsZoom * 1.15, .45, 1.6); renderResearch(); }; $('rsZoomOut').onclick = () => { rsZoom = clamp(rsZoom / 1.15, .45, 1.6); renderResearch(); };
{ // 연구 화면 드래그 이동 (PC)
  const sc = $('rsScroll'); let dr = null;
  sc.addEventListener('mousedown', e => { dr = { x: e.clientX, y: e.clientY, l: sc.scrollLeft, t: sc.scrollTop, moved: false }; });
  addEventListener('mousemove', e => { if (!dr) return; const dx = e.clientX - dr.x, dy = e.clientY - dr.y; if (Math.abs(dx) + Math.abs(dy) > 4) dr.moved = true; sc.scrollLeft = dr.l - dx; sc.scrollTop = dr.t - dy; });
  addEventListener('mouseup', () => { dr = null; });
}

// ════════════ 시작 화면 ════════════
let started = false;
function startGame(fresh) {
  ac(); if (fresh) { resetting = true; try { localStorage.removeItem(SAVE_KEY); } catch (e) { } location.hash = 'new'; location.reload(); return; }
  started = true; $('title').classList.add('hide'); $('hud').classList.remove('hide'); if (MOBILE) { $('touch').classList.remove('hide'); $('touchLayer').classList.remove('hide'); }
  lockPointer(); if (!S.intro) { S.intro = true; toast('📜 "바늘을 찾아라." — 그게 유일한 지시다', 4500); }
}
$('btnPlay').onclick = () => startGame(false);
$('btnNew').onclick = () => { if (!hadSave || confirm('저장을 지우고 처음부터?')) startGame(true); };
$('clickToPlay').addEventListener('click', () => lockPointer());

// ════════════ 초기화 ════════════
addBelt({ x: -9.5, y: .55, z: 10.3 }, { x: -Y + 3.92, y: 1.3, z: 9.0 }, true, true); // HAY IN 벨트 (원작: 판매대 저울로 올라가는 경사 벨트)
const hadSave = load();
if (!hadSave) { genPile(1); genNeedles(1); }
buildNeedleMeshes(); updatePileMesh(true); updateFuzz(true); relink(); powerTick(); updateCabinetModel(); setViewNeedle();
renderHotbar(); renderMission(); updateHints();
$('btnPlay').textContent = hadSave ? '이어하기' : '시작'; $('btnNew').classList.toggle('hide', !hadSave);
if (location.hash === '#new') { history.replaceState(null, '', location.pathname + location.search); startGame(false); }
if (MOBILE) document.body.classList.add('mobile');

// ════════════ 메인 루프 ════════════
let last = performance.now(), saveT = 30, powT = 0;
function step(dt) {
  S.play += dt; P.cd = Math.max(0, P.cd - dt); solidAge -= dt;
  // 이동
  let fx = 0, fz = 0;
  if (!anyOverlay()) {
    if (keys.has('KeyW')) fz -= 1; if (keys.has('KeyS')) fz += 1; if (keys.has('KeyA')) fx -= 1; if (keys.has('KeyD')) fx += 1;
    fx += touchMove.x; fz += touchMove.y;
  }
  const fl = Math.hypot(fx, fz); if (fl > 1) { fx /= fl; fz /= fl; }
  const sprint = keys.has('ShiftLeft') && P.stam > .05 && fl > .1;
  let spd = 4.2 * (1 + .08 * lvl('work_boots')) * (sprint ? 1.6 : 1);
  if (P.holding) spd *= (P.holding.kind === 'barrow' ? .72 : .88) * (1 + .1 * lvl('strong_back'));
  P.stam = clamp(P.stam + (sprint ? -dt * .22 : dt * .18 * (1 + .4 * lvl('second_wind'))), 0, 1);
  const cy = Math.cos(P.yaw), sy = Math.sin(P.yaw);
  let nx = P.x + (fx * cy + fz * sy) * spd * dt, nz = P.z + (-fx * sy + fz * cy) * spd * dt;
  const g0 = groundAt(nx, nz); if (g0 - P.y > .55) { nx = P.x; nz = P.z; }
  [P.x, P.z] = collide(nx, nz, .32);
  const gy = groundAt(P.x, P.z);
  if ((keys.has('Space') || touchJump) && P.ground) { P.vy = 5.2 * (1 + .2 * lvl('jump_height')); P.ground = false; }
  P.vy -= 15 * dt; P.y += P.vy * dt;
  if (P.y <= gy) { P.y = P.ground ? lerp(P.y, gy, Math.min(1, dt * 18)) : gy; if (P.y < gy) P.y = gy; P.vy = 0; P.ground = true; } else if (P.y - gy > .05) P.ground = false;
  camera.position.set(P.x, P.y + EYE, P.z); camera.rotation.set(P.pitch, P.yaw, 0);
  doAim();
  if (!anyOverlay()) {
    if (mouseL || touchUse) primary(dt, false); else pouring = false;
    if (mouseR || touchAlt) secondary(dt, false);
  }
  detector(dt);
  relaxStep(MOBILE ? 2500 : 5000);
  stepItems(dt); stepBelts(dt); stepMachines(dt); stepParts(dt); stepNeedles(dt);
  powT -= dt; if (powT <= 0) { powT = .5; powerTick(); }
  if (meshDirty.size) { updatePileMesh(false); updateFuzz(false); meshDirty = new Set(); }
  if (saleT > 0) { saleT -= dt; if (saleT <= 0 && saleAcc > 0) { lastSale = saleAcc; if (saleAcc > S.bestSale) S.bestSale = saleAcc; floatText('+' + money(saleAcc), new THREE.Vector3(yard.basket.x, 2.2, yard.basket.z), 'cash'); sfx('sell'); saleAcc = 0; } }
  if (S.earned >= 1) mission('earn1'); if (S.earned >= 10) mission('earn10');
  buildUpdate(); updateView(dt, fl > .1 && P.ground); stepLabels(dt); updateHUD(dt); updateSigns(dt); renderItems();
  saveT -= dt; if (saveT <= 0) { saveT = 30; save(); }
}
function frame(now) {
  requestAnimationFrame(frame);
  const dt = Math.min(.05, (now - last) / 1000); last = now;
  if (innerWidth < 2 || innerHeight < 2) return; // 숨은 iframe (폭 0)
  if (renderer.domElement.width < 2) resize();
  if (started) step(dt); else { camera.position.set(-6 + Math.sin(now / 9000) * 2, 3.5, 13); camera.lookAt(PCX, 3, PCZ); }
  renderer.render(scene, camera);
}
requestAnimationFrame(frame);
addEventListener('beforeunload', save);
document.addEventListener('visibilitychange', () => { if (document.hidden) save(); });

// 테스트용
window.needle = {
  S, P, items, builds, needles, props, H, hAt, scoopPile, addPile, buy, mkItem, beltInsert, deliver, openResearch, openCatalog, mission, save, load, startBuild, buildClick, addBelt, addMachine, relink, powerTick, sell,
  step(dt = 1 / 60, n = 1) { for (let i = 0; i < n; i++) step(dt); renderer.render(scene, camera); },
  tp(x, z, yaw) { P.x = x; P.z = z; P.y = groundAt(x, z); if (yaw != null) P.yaw = yaw; },
  look(yaw, pitch) { P.yaw = yaw; P.pitch = pitch; },
  hold(l, r) { mouseL = !!l; mouseR = !!r; if (!l) pouring = false; },
  give(n) { S.money += n; }, wipe() { resetting = true; try { localStorage.removeItem(SAVE_KEY); } catch (e) { } }, pileStrands, primary, secondary, interact, aim: () => aimHit, get BM() { return BM; }, get started() { return started; }, startGame,
};
