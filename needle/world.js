// ════════════ 바늘 찾기 — 창고·소품·기계 모델 (그림은 원작 배치를 보고 새로 그림, 원작 에셋 미사용) ════════════
import * as THREE from 'three';

const cv = (w, h) => { const c = document.createElement('canvas'); c.width = w; c.height = h; return c; };
function R(seed) { let s = seed >>> 0 || 1; return () => { s = (s + 0x6D2B79F5) >>> 0; let t = s; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; }
export const STRAW_COLS = ['#f0d890', '#e8c070', '#d8a850', '#c89040', '#b07a30', '#e0b860', '#f4e0a0', '#a06a28'];

function texOf(c, rep) { const t = new THREE.CanvasTexture(c); t.wrapS = t.wrapT = THREE.RepeatWrapping; if (rep) t.repeat.set(rep, rep); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 4; return t; }

export function strawTexture() {
  const c = cv(512, 512), g = c.getContext('2d'), r = R(7);
  g.fillStyle = '#9a6424'; g.fillRect(0, 0, 512, 512);
  for (let i = 0; i < 3400; i++) {
    const x = r() * 512, y = r() * 512, a = r() * Math.PI, l = 14 + r() * 46;
    g.strokeStyle = STRAW_COLS[(r() * STRAW_COLS.length) | 0]; g.lineWidth = 1.5 + r() * 3; g.globalAlpha = .75 + r() * .25;
    for (const ox of [-512, 0, 512]) for (const oy of [-512, 0, 512]) {
      if (x + ox < -60 || x + ox > 572 || y + oy < -60 || y + oy > 572) continue;
      g.beginPath(); g.moveTo(x + ox, y + oy); g.lineTo(x + ox + Math.cos(a) * l, y + oy + Math.sin(a) * l); g.stroke();
    }
  }
  g.globalAlpha = 1; return texOf(c);
}
function wallTexture() {
  const c = cv(256, 256), g = c.getContext('2d'), r = R(11);
  g.fillStyle = '#6e4a2c'; g.fillRect(0, 0, 256, 256);
  for (let x = 0; x < 256; x += 8) { g.fillStyle = x % 16 ? 'rgba(0,0,0,.22)' : 'rgba(255,220,180,.08)'; g.fillRect(x, 0, 4, 256); }
  for (let i = 0; i < 260; i++) { g.fillStyle = `rgba(${r() < .5 ? '40,20,10' : '150,90,50'},${.05 + r() * .12})`; g.fillRect(r() * 256, r() * 256, 2 + r() * 10, 2 + r() * 30); }
  return texOf(c);
}
function dirtTexture() {
  const c = cv(512, 512), g = c.getContext('2d'), r = R(23);
  g.fillStyle = '#b89870'; g.fillRect(0, 0, 512, 512);
  for (let i = 0; i < 900; i++) { const s = 6 + r() * 40; g.fillStyle = `rgba(${r() < .5 ? '90,64,40' : '220,196,160'},${.04 + r() * .07})`; g.beginPath(); g.arc(r() * 512, r() * 512, s, 0, 7); g.fill(); }
  for (let i = 0; i < 2600; i++) { g.fillStyle = `rgba(${r() < .6 ? '70,50,30' : '235,220,190'},${.25 + r() * .4})`; g.fillRect(r() * 512, r() * 512, 1 + r() * 3, 1 + r() * 3); }
  return texOf(c, 7);
}
export function beltTexture() {
  const c = cv(64, 128), g = c.getContext('2d');
  g.fillStyle = '#2e2a28'; g.fillRect(0, 0, 64, 128);
  for (let y = 0; y < 128; y += 16) { g.fillStyle = '#423c38'; g.fillRect(0, y, 64, 4); g.fillStyle = '#1e1b1a'; g.fillRect(0, y + 4, 64, 2); }
  const t = texOf(c); t.colorSpace = THREE.SRGBColorSpace; return t;
}
export function signTexture(lines, o = {}) {
  const w = o.w || 512, h = o.h || 128, c = cv(w, h), g = c.getContext('2d');
  g.fillStyle = o.bg || '#d8c8a4'; g.fillRect(0, 0, w, h);
  if (o.wood !== false) { const r = R(w + h); for (let i = 0; i < 40; i++) { g.fillStyle = `rgba(80,50,20,${r() * .12})`; g.fillRect(0, r() * h, w, 1 + r() * 4); } }
  if (o.border) { g.strokeStyle = o.border; g.lineWidth = 10; g.strokeRect(5, 5, w - 10, h - 10); }
  g.fillStyle = o.fg || '#2a1a10'; g.textAlign = 'center'; g.textBaseline = 'middle';
  const ls = Array.isArray(lines) ? lines : [lines];
  ls.forEach((l, i) => { g.font = `${o.weight || 'bold'} ${o.size || 72}px ${o.font || 'Georgia, serif'}`; g.fillText(l, w / 2, h / 2 + (i - (ls.length - 1) / 2) * (o.size || 72) * 1.1); });
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 4; return t;
}
export function liveCanvas(w, h) { const c = cv(w, h), t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; return { c, g: c.getContext('2d'), t }; }

const M = (color, o = {}) => new THREE.MeshStandardMaterial({ color, roughness: o.r ?? .8, metalness: o.m ?? 0, ...(o.x || {}) });
const box = (w, h, d, mat) => new THREE.Mesh(new THREE.BoxGeometry(w, h, d), mat);
const cyl = (rt, rb, h, mat, seg = 12) => new THREE.Mesh(new THREE.CylinderGeometry(rt, rb, h, seg), mat);
function at(m, x, y, z, rx = 0, ry = 0, rz = 0) { m.position.set(x, y, z); m.rotation.set(rx, ry, rz); return m; }
function shadowAll(o, cast = true) { o.traverse(c => { if (c.isMesh) { c.castShadow = cast; c.receiveShadow = true; } }); return o; }

export const MAT = {
  wood: M('#6a4a30'), woodDark: M('#4a3220'), woodLight: M('#9a7a54'), metal: M('#9aa2a8', { m: .6, r: .4 }), steel: M('#5a6066', { m: .5, r: .5 }),
  rust: M('#7a4a2a', { m: .3, r: .7 }), black: M('#222', { r: .6 }), orange: M('#f06a1a', { r: .5 }), red: M('#c8281e', { r: .55 }),
  green: M('#3a7a3a', { r: .6 }), cream: M('#e8e0c8'), glassBlue: M('#6ac0e8', { r: .2, m: .1, x: { transparent: true, opacity: .55 } }),
  rubber: M('#2a2624', { r: .9 }), white: M('#f0f0f0', { r: .5 }), yellow: M('#e8c020', { r: .5 }), plastic: M('#d83a2a', { r: .4 }),
};

// ════════════ 창고 (원작 스크린샷 배치: 가운데 더미, 서쪽 벽 SELL HAY 판매대, 북쪽 벽 DISPATCH 문·시계, 더미 뒤 SUPPLY CO.) ════════════
export function buildYard(scene, Y, opt) {
  const g = new THREE.Group(); scene.add(g);
  // 하늘
  const sc = cv(16, 256), sg = sc.getContext('2d'), gr = sg.createLinearGradient(0, 0, 0, 256);
  gr.addColorStop(0, '#2c5a9a'); gr.addColorStop(.45, '#6a9ad0'); gr.addColorStop(.62, '#d8e4ec'); gr.addColorStop(1, '#c8b48a');
  sg.fillStyle = gr; sg.fillRect(0, 0, 16, 256);
  const skyT = new THREE.CanvasTexture(sc); skyT.colorSpace = THREE.SRGBColorSpace;
  scene.add(new THREE.Mesh(new THREE.SphereGeometry(300, 24, 16), new THREE.MeshBasicMaterial({ map: skyT, side: THREE.BackSide, fog: false })));
  // 구름
  const cc = cv(128, 64), cg = cc.getContext('2d'); const rr = R(5);
  for (let i = 0; i < 14; i++) { const x = 20 + rr() * 88, y = 22 + rr() * 22, s = 10 + rr() * 16; const gg = cg.createRadialGradient(x, y, 0, x, y, s); gg.addColorStop(0, 'rgba(255,255,255,.95)'); gg.addColorStop(1, 'rgba(255,255,255,0)'); cg.fillStyle = gg; cg.fillRect(0, 0, 128, 64); }
  const cloudM = new THREE.SpriteMaterial({ map: new THREE.CanvasTexture(cc), fog: false, depthWrite: false });
  for (let i = 0; i < 9; i++) { const s = new THREE.Sprite(cloudM); const a = rr() * 6.28, d = 120 + rr() * 80; s.position.set(Math.cos(a) * d, 70 + rr() * 50, Math.sin(a) * d); s.scale.set(90 + rr() * 60, 40 + rr() * 20, 1); scene.add(s); }
  // 바깥 언덕
  const hills = new THREE.Group(); const hr = R(9);
  for (let i = 0; i < 22; i++) { const a = i / 22 * 6.28 + hr() * .2, d = 70 + hr() * 40, h = 12 + hr() * 26; const m = new THREE.Mesh(new THREE.ConeGeometry(18 + hr() * 20, h, 6), M(hr() < .5 ? '#6a7a4a' : '#8a7a5a', { r: 1 })); m.position.set(Math.cos(a) * d, h / 2 - 2, Math.sin(a) * d); m.rotation.y = hr() * 3; hills.add(m); }
  const field = new THREE.Mesh(new THREE.CircleGeometry(200, 32), M('#9a9a62', { r: 1 })); field.rotation.x = -Math.PI / 2; field.position.y = -0.05; hills.add(field);
  scene.add(hills);
  // 바닥
  const floor = new THREE.Mesh(new THREE.PlaneGeometry(Y * 2, Y * 2), new THREE.MeshStandardMaterial({ map: dirtTexture(), roughness: 1 }));
  floor.rotation.x = -Math.PI / 2; floor.receiveShadow = true; g.add(floor);
  // 벽 (골판 목재 + 기둥 + 아래쪽 콘크리트 띠)
  const wt = wallTexture(), WH = 6.2;
  for (let s = 0; s < 4; s++) {
    const t = wt.clone(); t.needsUpdate = true; t.repeat.set(Y * 2 / 4, 1);
    const wall = new THREE.Mesh(new THREE.PlaneGeometry(Y * 2, WH), new THREE.MeshStandardMaterial({ map: t, roughness: .95, side: THREE.DoubleSide }));
    const a = s * Math.PI / 2; wall.position.set(Math.sin(a) * -Y, WH / 2, Math.cos(a) * -Y); wall.rotation.y = a; wall.receiveShadow = true; g.add(wall);
    const band = new THREE.Mesh(new THREE.PlaneGeometry(Y * 2, 1.1), M('#5a5a60', { r: 1 })); band.position.set(Math.sin(a) * -(Y - .02), .55, Math.cos(a) * -(Y - .02)); band.rotation.y = a; g.add(band);
    for (let i = 0; i <= 9; i++) {
      const u = -Y + i * Y * 2 / 9, p = box(.25, WH + .2, .25, MAT.woodDark), n = Y - .12; // 벽 안쪽으로 0.12m
      p.position.set(Math.cos(a) * u - Math.sin(a) * n, WH / 2, -Math.sin(a) * u - Math.cos(a) * n); g.add(p);
    }
    const cap = box(Y * 2, .2, .4, MAT.woodDark); cap.position.set(Math.sin(a) * -(Y - .1), WH, Math.cos(a) * -(Y - .1)); cap.rotation.y = a; g.add(cap);
  }
  // 지붕 아치 (녹슨 철골만, 하늘이 보임 — 원작처럼)
  for (let i = 0; i < 6; i++) {
    const z = -Y + 3 + i * (Y * 2 - 6) / 5;
    const curve = new THREE.EllipseCurve(0, 0, Y, 4.5, 0, Math.PI, false, 0);
    const pts = curve.getPoints(24).map(p => new THREE.Vector3(p.x, WH + p.y, z));
    const tube = new THREE.Mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts), 40, .12, 6), MAT.rust); g.add(tube);
  }
  // DISPATCH 문 (북쪽 벽) + 시계
  const door = new THREE.Group(); door.position.set(-7, 0, -Y + .05);
  door.add(at(box(3.6, 3.4, .1, M('#3a5a44', { r: .8 })), 0, 1.7, .05));
  for (let i = 0; i < 8; i++) door.add(at(box(3.5, .05, .12, M('#2a4434')), 0, .4 + i * .4, .07));
  const hz = cv(128, 16), hg = hz.getContext('2d'); for (let i = 0; i < 16; i++) { hg.fillStyle = i % 2 ? '#222' : '#e8b818'; hg.beginPath(); hg.moveTo(i * 16, 16); hg.lineTo(i * 16 + 8, 0); hg.lineTo(i * 16 + 16, 0); hg.lineTo(i * 16 + 8, 16); hg.fill(); }
  door.add(at(new THREE.Mesh(new THREE.PlaneGeometry(3.6, .35), new THREE.MeshBasicMaterial({ map: new THREE.CanvasTexture(hz) })), 0, .3, .13));
  door.add(at(new THREE.Mesh(new THREE.PlaneGeometry(1.6, .35), new THREE.MeshBasicMaterial({ map: signTexture('DISPATCH', { w: 256, h: 56, size: 34, bg: '#e8e8e0', fg: '#222', font: 'Arial', wood: false }) })), 0, 3.75, .12));
  const clock = liveCanvas(256, 80); door.add(at(new THREE.Mesh(new THREE.PlaneGeometry(1.5, .46), new THREE.MeshBasicMaterial({ map: clock.t })), 0, 4.4, .12));
  door.add(at(box(1.7, .6, .12, MAT.black), 0, 4.4, .05));
  for (const sx of [-2.1, 2.1]) door.add(at(cyl(.08, .08, 1, MAT.yellow), sx, .5, .4));
  g.add(door);
  // SUPPLY CO. (더미 뒤 북쪽 벽): 간판 + 단말기 + 배달 팔레트
  const sup = new THREE.Group(); sup.position.set(4, 0, -Y + .05);
  sup.add(at(new THREE.Mesh(new THREE.PlaneGeometry(3, .55), new THREE.MeshBasicMaterial({ map: signTexture(['SUPPLY CO.'], { w: 512, h: 96, size: 54, bg: '#f2ece0', fg: '#b02020', border: '#b02020', font: 'Georgia, serif', wood: false }) })), 0, 3.1, .3));
  sup.add(at(box(3.2, .7, .5, M('#8a2a22')), 0, 3.1, .02));
  const kiosk = new THREE.Group(); kiosk.position.set(0, 0, .7);
  kiosk.add(at(box(1.1, 1.2, .6, M('#5a3a26')), 0, .6, 0)); kiosk.add(at(box(1.2, .06, .7, MAT.woodLight), 0, 1.22, 0));
  kiosk.add(at(box(.7, .5, .08, MAT.black), 0, 1.55, -.15, -.25)); const scr = liveCanvas(128, 96); kiosk.add(at(new THREE.Mesh(new THREE.PlaneGeometry(.62, .42), new THREE.MeshBasicMaterial({ map: scr.t })), 0, 1.555, -.105, -.25));
  sup.add(kiosk);
  const pallet = new THREE.Group(); pallet.position.set(2.4, 0, 2.2);
  for (let i = 0; i < 5; i++) pallet.add(at(box(.18, .06, 1.3, MAT.woodLight), -.5 + i * .25, .14, 0));
  for (const z of [-.55, 0, .55]) pallet.add(at(box(1.3, .1, .14, MAT.wood), 0, .05, z));
  sup.add(pallet);
  sup.add(at(new THREE.Mesh(new THREE.PlaneGeometry(1.2, .3), new THREE.MeshBasicMaterial({ map: signTexture('DELIVERIES', { w: 256, h: 64, size: 34, bg: '#f0e6c8', font: 'Arial' }) })), 2.4, 1.6, .1));
  g.add(shadowAll(sup));
  // 판매대 SELL HAY (서쪽 벽) — 원작: 나무 판매대, 금전등록기, 저울+바구니, "$0.0222 PER STRAND" A간판
  const st = new THREE.Group(); st.position.set(-Y + 1.6, 0, 5.5); st.rotation.y = Math.PI / 2; // 앞(+z 로컬)이 동쪽(+x)
  st.add(at(box(4.2, 1.1, 1.0, M('#4a3020')), 0, .55, .2)); st.add(at(box(4.4, .08, 1.15, MAT.woodLight), 0, 1.14, .2));
  st.add(at(box(4.2, 2.6, .12, MAT.woodDark), 0, 1.3, -1.1));
  for (const x of [-2.1, 2.1]) st.add(at(box(.14, 2.9, .14, MAT.woodDark), x, 1.45, .75));
  st.add(at(box(4.6, .08, 2.2, M('#3a3a3a', { m: .4 })), 0, 2.9, -.1, -.12));
  for (let i = 0; i < 3; i++) st.add(at(box(4, .05, .35, MAT.wood), 0, 1.5 + i * .45, -.9));
  for (let i = 0; i < 9; i++) st.add(at(cyl(.07, .07, .16, M(['#3a3a40', '#5a4a3a', '#2a2a2a'][i % 3])), -1.6 + i * .4, 1.62 + (i % 3) * .45, -.88));
  st.add(at(new THREE.Mesh(new THREE.PlaneGeometry(3, .7), new THREE.MeshStandardMaterial({ map: signTexture('SELL HAY', { w: 512, h: 120, size: 84 }) })), 0, 3.35, .78));
  st.add(at(box(3.2, .82, .1, MAT.woodDark), 0, 3.35, .72));
  // 금전등록기
  const reg = liveCanvas(128, 48); const regG = new THREE.Group(); regG.position.set(1.2, 1.18, .25);
  regG.add(at(box(.45, .26, .4, M('#222')), 0, .13, 0)); regG.add(at(box(.4, .14, .06, M('#111')), 0, .34, -.1, -.4));
  regG.add(at(new THREE.Mesh(new THREE.PlaneGeometry(.36, .12), new THREE.MeshBasicMaterial({ map: reg.t })), 0, .345, -.065, -.4)); st.add(regG);
  // 마당 기록판 (YARD RECORDS)
  const rec = liveCanvas(256, 320); st.add(at(new THREE.Mesh(new THREE.PlaneGeometry(.9, 1.12), new THREE.MeshBasicMaterial({ map: rec.t })), -1.4, 2.0, -1.03));
  g.add(shadowAll(st));
  // 저울 + 바구니 (HAY IN 벨트 끝)
  const scale = new THREE.Group(); scale.position.set(-Y + 3.5, 0, 9.0);
  scale.add(at(box(.7, .08, .7, MAT.steel), 0, .04, 0)); scale.add(at(cyl(.05, .05, .9, MAT.metal), 0, .5, 0));
  scale.add(at(box(.75, .05, .75, MAT.metal), 0, .95, 0));
  const basket = new THREE.Mesh(new THREE.CylinderGeometry(.36, .26, .3, 14, 1, true), M('#c8a870', { x: { side: THREE.DoubleSide } })); basket.position.set(0, 1.12, 0); scale.add(basket);
  scale.add(at(cyl(.04, .04, 1.0, MAT.metal), .3, 1.4, -.3)); const dial = new THREE.Mesh(new THREE.CircleGeometry(.2, 20), MAT.white); dial.position.set(.3, 1.95, -.28); scale.add(dial);
  scale.add(at(new THREE.Mesh(new THREE.TorusGeometry(.2, .025, 6, 20), MAT.black), .3, 1.95, -.28));
  g.add(shadowAll(scale));
  // A간판
  const af = new THREE.Group(); af.position.set(-Y + 4.2, 0, 11.6); af.rotation.y = .9;
  const aft = signTexture(['$0.0222', 'PER STRAND'], { w: 256, h: 256, size: 44, bg: '#1a1a1a', fg: '#f4f4f4', font: 'Arial', wood: false });
  for (const s of [1, -1]) { const p = new THREE.Mesh(new THREE.PlaneGeometry(.8, 1.0), new THREE.MeshStandardMaterial({ map: aft })); p.position.set(0, .55, s * .2); p.rotation.set(s * -.2, s > 0 ? 0 : Math.PI, 0); af.add(p); }
  af.add(at(box(.86, .06, .06, MAT.wood), 0, 1.06, 0)); g.add(shadowAll(af));
  // HAY IN 호퍼 간판 (벨트 시작)
  const hi = new THREE.Group(); hi.position.set(-9.6, 0, 11.1);
  hi.add(at(new THREE.Mesh(new THREE.PlaneGeometry(1.3, .5), new THREE.MeshStandardMaterial({ map: signTexture('HAY IN', { w: 256, h: 96, size: 60, font: 'Arial' }), side: THREE.DoubleSide })), 0, 1.5, 0, 0, -.5));
  hi.add(at(box(.08, 1.4, .08, MAT.woodDark), -.5, .7, -.25)); hi.add(at(box(.08, 1.4, .08, MAT.woodDark), .5, .7, .25));
  for (let i = 0; i < 2; i++) hi.add(at(box(.9, .45, .55, M('#a08848')), -1.5, .23 + i * .46, .4));
  g.add(shadowAll(hi));
  return { group: g, clock, screen: scr, register: reg, records: rec, pallet: new THREE.Vector3(4 + 2.4, 0, -Y + .05 + 2.2), kiosk: new THREE.Vector3(4, 0, -Y + .75), basket: new THREE.Vector3(-Y + 3.5, 1.12, 9.0), standBox: { x0: -Y, x1: -Y + 2.4, z0: 3, z1: 8 } };
}

// ════════════ 1인칭 연장 · 소품 모델 ════════════
export function toolModel(kind) {
  const g = new THREE.Group();
  const handle = (len, r = .025) => { const h = cyl(r, r, len, MAT.woodLight, 8); h.position.y = len / 2; return h; };
  if (kind === 'hand') {
    const skin = M('#e0b090'); g.add(at(box(.09, .05, .16, skin), 0, 0, 0)); for (let i = 0; i < 4; i++) g.add(at(box(.018, .02, .07, skin), -.03 + i * .02, .01, -.1));
    g.add(at(box(.025, .025, .06, skin), .055, .01, -.03, 0, .5)); g.add(at(box(.08, .07, .2, M('#4a6a8a')), 0, -.01, .16));
  } else if (kind === 'toy') {
    g.add(handle(.45, .022)); g.children[0].material = MAT.plastic; g.add(at(box(.06, .05, .03, MAT.plastic), 0, .47, 0));
    g.add(at(box(.14, .005, .16, MAT.plastic), 0, -.02, -.04, -.3)); g.add(at(box(.14, .04, .005, MAT.plastic), 0, 0, .04));
  } else if (kind === 'spade') {
    g.add(handle(.95)); g.add(at(box(.14, .04, .04, MAT.woodLight), 0, .95, 0));
    g.add(at(box(.2, .006, .26, MAT.steel), 0, -.06, -.08, -.25)); g.add(at(box(.2, .05, .006, MAT.steel), 0, -.03, .05));
  } else if (kind === 'fork') {
    g.add(handle(1.1)); g.add(at(box(.24, .02, .02, MAT.metal), 0, -.01, 0));
    for (let i = 0; i < 5; i++) g.add(at(cyl(.006, .004, .3, MAT.metal, 5), -.1 + i * .05, -.02, -.15, Math.PI / 2 - .25));
  } else if (kind === 'broom') {
    g.add(handle(1.1)); const b = cyl(.11, .05, .25, M('#c8a050'), 10); b.position.y = -.1; g.add(b);
  } else if (kind === 'detector') {
    const p = cyl(.014, .014, .9, MAT.steel, 6); p.position.y = .45; g.add(p);
    g.add(at(box(.08, .1, .14, MAT.black), 0, .62, .04)); g.add(at(box(.05, .015, .04, M('#2a8a3a', { x: { emissive: '#2a8a3a', emissiveIntensity: .6 } })), 0, .675, .04));
    const coil = new THREE.Mesh(new THREE.TorusGeometry(.12, .015, 6, 20), MAT.black); coil.rotation.x = Math.PI / 2; coil.position.set(0, 0, -.05); g.add(coil);
    g.add(at(new THREE.Mesh(new THREE.CircleGeometry(.11, 16), M('#333')), 0, 0, -.05, -Math.PI / 2));
  } else if (kind === 'vac') {
    g.add(at(cyl(.05, .05, .8, M('#cfcfcf', { m: .4 }), 10), 0, .2, -.1, -.4)); g.add(at(cyl(.12, .12, .35, M('#d8a020')), .12, .45, .25));
    g.add(at(cyl(.07, .04, .12, MAT.black), 0, -.16, -.25, -.4));
  } else if (kind === 'lighter') {
    g.add(at(box(.04, .07, .02, MAT.red), 0, 0, 0));
  }
  g.traverse(c => { if (c.isMesh) c.castShadow = true; });
  return g;
}
export function bucketModel() {
  const g = new THREE.Group();
  const b = new THREE.Mesh(new THREE.CylinderGeometry(.2, .15, .32, 14, 1, true), M('#a0582a', { x: { side: THREE.DoubleSide } })); b.position.y = .16; g.add(b);
  g.add(at(new THREE.Mesh(new THREE.CircleGeometry(.15, 14), M('#7a4020')), 0, .01, 0, -Math.PI / 2));
  for (const y of [.06, .26]) g.add(at(new THREE.Mesh(new THREE.TorusGeometry(y > .1 ? .19 : .16, .008, 4, 18), MAT.steel), 0, y, 0, Math.PI / 2));
  const hd = new THREE.Mesh(new THREE.TorusGeometry(.2, .008, 4, 16, Math.PI), MAT.steel); hd.position.y = .32; g.add(hd);
  const fill = new THREE.Mesh(new THREE.CylinderGeometry(.19, .15, .02, 14), M('#d8b060')); fill.position.y = .02; fill.name = 'fill'; g.add(fill);
  return shadowAll(g);
}
export function barrowModel() {
  const g = new THREE.Group();
  const tray = new THREE.Mesh(new THREE.CylinderGeometry(.5, .32, .35, 4, 1, true), M('#b02a20', { x: { side: THREE.DoubleSide } })); tray.rotation.y = Math.PI / 4; tray.scale.set(1, 1, 1.4); tray.position.y = .55; g.add(tray);
  const w = new THREE.Mesh(new THREE.TorusGeometry(.17, .06, 6, 14), MAT.black); w.rotation.y = Math.PI / 2; w.position.set(0, .2, -.75); g.add(w);
  for (const x of [-.25, .25]) { g.add(at(cyl(.02, .02, 1.5, MAT.steel, 6), x, .45, -.05, Math.PI / 2 - .25)); g.add(at(cyl(.02, .02, .4, MAT.steel, 6), x, .2, .25)); }
  const fill = new THREE.Mesh(new THREE.BoxGeometry(.6, .02, .8), M('#d8b060')); fill.position.y = .42; fill.name = 'fill'; g.add(fill);
  return shadowAll(g);
}
export function needleModel(n) {
  const g = new THREE.Group(), col = M(n.col || '#ddd', { m: .8, r: .25 });
  const body = cyl(.006, .002, .16, col, 6); body.position.y = .08; g.add(body);
  const head = new THREE.Mesh(new THREE.SphereGeometry(n.k === 'push' || n.k === 'hat' ? .018 : .008, 8, 6), n.k === 'push' ? MAT.red : col); head.position.y = .16; g.add(head);
  if (n.k === 'safety') { const lp = new THREE.Mesh(new THREE.TorusGeometry(.02, .004, 4, 10), col); lp.position.y = .01; g.add(lp); }
  if (n.k === 'syringe') { const t = cyl(.016, .016, .07, MAT.glassBlue, 8); t.position.y = .12; g.add(t); }
  return g;
}

// ════════════ 기계 모델 ════════════
export function armModel(type) {
  const s = type === 'arm_long' ? 1.55 : type === 'arm_standard' ? 1.2 : .85;
  const g = new THREE.Group(), base = new THREE.Group(); g.add(base);
  base.add(at(cyl(.36 * s, .42 * s, .18, MAT.black, 16), 0, .09, 0)); base.add(at(new THREE.Mesh(new THREE.TorusGeometry(.33 * s, .03, 6, 20), MAT.orange), 0, .18, 0, Math.PI / 2));
  const yaw = new THREE.Group(); yaw.position.y = .18; g.add(yaw);
  yaw.add(at(cyl(.24 * s, .28 * s, .35 * s, MAT.black, 14), 0, .17 * s, 0));
  const sh = new THREE.Group(); sh.position.y = .42 * s; yaw.add(sh);
  sh.add(at(cyl(.15 * s, .15 * s, .32 * s, MAT.orange, 12), 0, 0, 0, 0, 0, Math.PI / 2));
  const L1 = 1.15 * s, L2 = 1.05 * s;
  const up = box(.16 * s, L1, .16 * s, MAT.orange); up.position.y = L1 / 2; sh.add(up);
  const el = new THREE.Group(); el.position.y = L1; sh.add(el);
  el.add(at(cyl(.12 * s, .12 * s, .26 * s, MAT.black, 12), 0, 0, 0, 0, 0, Math.PI / 2));
  const fo = box(.12 * s, L2, .12 * s, MAT.orange); fo.position.y = L2 / 2; el.add(fo);
  const wr = new THREE.Group(); wr.position.y = L2; el.add(wr);
  wr.add(at(cyl(.08 * s, .08 * s, .12 * s, MAT.black, 10), 0, .04, 0));
  const fA = box(.03 * s, .18 * s, .05 * s, MAT.steel), fB = fA.clone(); fA.position.set(-.06 * s, .16 * s, 0); fB.position.set(.06 * s, .16 * s, 0); wr.add(fA, fB);
  const load = new THREE.Group(); load.position.y = .2 * s; wr.add(load);
  shadowAll(g);
  return { g, yaw, sh, el, wr, fA, fB, load, L1, L2, sy: .18 + .42 * s, s };
}
export function rakeModel() {
  const g = new THREE.Group();
  g.add(at(box(1.0, .3, 1.3, M('#5a5040', { m: .3 })), 0, .15, .1));
  g.add(at(box(.3, .25, .9, MAT.metal), 0, .45, .1));
  const head = new THREE.Group(); head.position.set(0, .3, -.6); g.add(head);
  head.add(at(cyl(.05, .05, .9, MAT.steel, 8), 0, .2, .4, Math.PI / 2));
  head.add(at(box(1.2, .06, .08, MAT.rust), 0, 0, 0));
  for (let i = 0; i < 9; i++) head.add(at(box(.025, .3, .025, MAT.rust), -.55 + i * .1375, -.1, -.02, .3));
  g.add(at(box(.9, .04, .7, MAT.steel), 0, .55, .9, -.35));
  shadowAll(g); return { g, head };
}
export function generatorModel() {
  const g = new THREE.Group();
  g.add(at(box(2.2, .2, 1.4, MAT.black), 0, .1, 0));
  g.add(at(box(1.0, 1.0, 1.0, M('#4a3a30', { m: .4 })), -.35, .7, 0));
  const fire = new THREE.Mesh(new THREE.PlaneGeometry(.5, .35), new THREE.MeshBasicMaterial({ color: '#ff7a20' })); fire.position.set(-.35, .55, .51); fire.name = 'fire'; g.add(fire);
  g.add(at(cyl(.15, .15, 1.4, M('#3a3a3a', { m: .5 }), 10), -.6, 1.6, -.2));
  const wheel = new THREE.Mesh(new THREE.TorusGeometry(.42, .05, 6, 20), M('#5a2a20', { m: .4 })); wheel.position.set(.6, .7, .45); wheel.name = 'wheel'; g.add(wheel);
  for (let i = 0; i < 4; i++) { const sp = box(.8, .04, .04, M('#5a2a20')); sp.rotation.z = i * Math.PI / 4; wheel.add(sp); }
  g.add(at(box(.6, .5, .7, M('#6a6a60', { m: .4 })), .6, .45, -.1));
  // 호퍼 (HAY IN)
  const hop = new THREE.Mesh(new THREE.CylinderGeometry(.55, .3, .45, 4, 1, true), M('#5a4a3a', { x: { side: THREE.DoubleSide } })); hop.rotation.y = Math.PI / 4; hop.position.set(-.35, 1.42, 0); g.add(hop);
  g.add(at(new THREE.Mesh(new THREE.PlaneGeometry(.5, .2), new THREE.MeshBasicMaterial({ map: signTexture('HAY IN', { w: 128, h: 48, size: 30, font: 'Arial', bg: '#222', fg: '#eee', wood: false }) })), -.35, 1.1, .515));
  shadowAll(g); return g;
}
export function poleModel() {
  const g = new THREE.Group(); g.add(at(cyl(.07, .09, 3.4, MAT.woodDark, 8), 0, 1.7, 0));
  g.add(at(box(.6, .06, .06, MAT.woodDark), 0, 3.2, 0)); for (const x of [-.25, .25]) g.add(at(cyl(.03, .03, .08, M('#e8e8e0')), x, 3.27, 0));
  g.add(at(new THREE.Mesh(new THREE.SphereGeometry(.05, 8, 6), M('#ffd060', { x: { emissive: '#ffb030', emissiveIntensity: 1 } })), 0, 3.42, 0));
  shadowAll(g); return g;
}
export function compressorModel() {
  const g = new THREE.Group();
  g.add(at(box(1.9, .2, 1.1, MAT.black), 0, .1, 0));
  for (const x of [-.65, .65]) for (const z of [-.45, .45]) g.add(at(box(.1, 1.9, .1, MAT.steel), x, 1.15, z));
  g.add(at(box(1.4, .12, 1.0, MAT.steel), 0, 2.1, 0));
  g.add(at(box(1.0, .9, .8, MAT.green), 0, .75, 0));
  const ram = box(.7, .5, .6, M('#2a6a2a')); ram.position.set(0, 1.55, 0); ram.name = 'ram'; g.add(ram);
  g.add(at(cyl(.1, .1, .8, M('#4a9a3a'), 10), .4, 2.4, -.3, .3)); g.add(at(box(.4, .3, .1, MAT.yellow), .7, 1.0, .5));
  shadowAll(g); return g;
}
export function wrapperModel() {
  const g = new THREE.Group();
  g.add(at(box(1.8, .2, 1.2, MAT.black), 0, .1, 0));
  const ring = new THREE.Mesh(new THREE.TorusGeometry(.65, .07, 8, 24), MAT.steel); ring.position.y = .85; ring.rotation.y = Math.PI / 2; ring.name = 'ring'; g.add(ring);
  const roll = cyl(.08, .08, .4, MAT.white, 10); roll.position.set(0, .2, 0); roll.name = 'roll'; ring.add(roll); roll.position.set(.65, 0, 0);
  for (const z of [-.55, .55]) g.add(at(box(1.6, .7, .08, M('#3a6a9a')), 0, .55, z));
  shadowAll(g); return g;
}
export function scannerModel() {
  const g = new THREE.Group();
  for (const z of [-.5, .5]) g.add(at(box(.2, 1.4, .15, M('#6a7a8a', { m: .4 })), 0, .7, z));
  g.add(at(box(.5, .25, 1.2, M('#3a4a5a', { m: .4 })), 0, 1.45, 0));
  const lamp = new THREE.Mesh(new THREE.BoxGeometry(.35, .04, .9), new THREE.MeshBasicMaterial({ color: '#40e0ff' })); lamp.position.y = 1.31; lamp.name = 'lamp'; g.add(lamp);
  g.add(at(box(.5, .06, 1.0, M('#2a2e34')), 0, .45, 0));
  const tray = new THREE.Group(); tray.position.set(0, .5, .8); tray.add(at(box(.4, .05, .3, MAT.metal), 0, 0, 0)); g.add(tray);
  shadowAll(g); return g;
}
export function cabinetModel() {
  const g = new THREE.Group(), wd = M('#5a2a1a', { r: .6 });
  g.add(at(box(1.5, .9, .6, wd), 0, .45, 0)); g.add(at(box(1.5, 1.4, .45, wd), 0, 1.6, -.07)); g.add(at(box(1.6, .1, .55, wd), 0, 2.35, -.07));
  for (let r = 0; r < 4; r++) for (let c = 0; c < 6; c++) g.add(at(box(.2, .26, .02, M('#151515')), -.57 + c * .228, 1.08 + r * .32, .16));
  for (let i = 0; i < 3; i++) g.add(at(box(1.4, .02, .02, M('#c8a040', { m: .7 })), 0, .2 + i * .25, .31));
  g.add(at(new THREE.Mesh(new THREE.PlaneGeometry(1.36, 1.3), M('#9ad0e0', { r: .1, x: { transparent: true, opacity: .18 } })), 0, 1.6, .17));
  const slots = new THREE.Group(); slots.position.set(0, 0, .18); g.add(slots);
  const btn = new THREE.Mesh(new THREE.CylinderGeometry(.1, .1, .05, 16), M('#c81818', { x: { emissive: '#600', emissiveIntensity: .5 } })); btn.rotation.x = Math.PI / 2; btn.position.set(0, 2.05, .2); btn.visible = false; btn.name = 'button'; g.add(btn);
  shadowAll(g); return { g, slots, btn };
}
export function splitterModel() {
  const g = new THREE.Group();
  g.add(at(box(.9, .1, 1.3, MAT.steel), 0, .45, 0)); g.add(at(box(.9, .05, 1.3, MAT.rubber), 0, .51, 0));
  for (const z of [-.66, .66]) g.add(at(box(.9, .12, .04, MAT.metal), 0, .56, z));
  g.add(at(box(.1, .4, .1, MAT.black), .1, .75, 0)); const sg = new THREE.Mesh(new THREE.PlaneGeometry(.3, .22), new THREE.MeshBasicMaterial({ map: signTexture('Y', { w: 64, h: 48, size: 40, bg: '#222', fg: '#f0a020', font: 'Arial', wood: false }) })); sg.position.set(.1, 1.0, .06); g.add(sg);
  const flap = box(.5, .12, .03, MAT.orange); flap.position.set(.05, .58, 0); flap.name = 'flap'; g.add(flap);
  for (const x of [-.4, .4]) for (const z of [-.6, .6]) g.add(at(box(.05, .45, .05, MAT.steel), x, .22, z));
  shadowAll(g); return g;
}
// 벨트: a→b (높이 포함). 윗면 높이 = a.y/b.y
export function beltMesh(a, b, beltMat) {
  const g = new THREE.Group(), dx = b.x - a.x, dy = b.y - a.y, dz = b.z - a.z, L = Math.hypot(dx, dz), L3 = Math.hypot(dx, dy, dz);
  const mid = new THREE.Vector3((a.x + b.x) / 2, (a.y + b.y) / 2, (a.z + b.z) / 2);
  const inner = new THREE.Group(); inner.position.copy(mid); inner.rotation.order = 'YXZ'; inner.rotation.y = Math.atan2(dx, dz); inner.rotation.x = -Math.atan2(dy, L); g.add(inner);
  const top = new THREE.Mesh(new THREE.BoxGeometry(.6, .05, L3), beltMat); top.position.y = -.03; inner.add(top);
  top.geometry.attributes.uv.array.forEach((v, i, arr) => { if (i % 2 === 1) arr[i] = v * L3 / .6; }); top.geometry.attributes.uv.needsUpdate = true;
  for (const x of [-.33, .33]) { const r = box(.05, .12, L3, MAT.metal); r.position.set(x, .02, 0); inner.add(r); }
  const fr = box(.56, .1, L3, MAT.steel); fr.position.y = -.1; inner.add(fr);
  const legs = Math.max(2, Math.ceil(L3 / 1.6) + 1);
  const px = L > 0 ? dz / L * .25 : .25, pz = L > 0 ? -dx / L * .25 : 0; // 진행 방향의 옆
  for (let i = 0; i < legs; i++) {
    const t = .04 + .92 * i / (legs - 1), y = a.y + dy * t - .12;
    if (y < .05) continue;
    for (const sd of [1, -1]) { const p = box(.05, y, .05, MAT.steel); p.position.set(a.x + dx * t + px * sd, y / 2, a.z + dz * t + pz * sd); g.add(p); }
  }
  shadowAll(g); g.userData.top = top; return g;
}
// 건초 덩이(여러 가닥) 지오메트리
export function clumpGeometry(seed, count = 16, rad = .16) {
  const r = R(seed), geos = [];
  for (let i = 0; i < count; i++) {
    const gm = new THREE.BoxGeometry(.012, .012, .26 + r() * .16);
    const m = new THREE.Matrix4().makeRotationFromEuler(new THREE.Euler(r() * 3, r() * 3, r() * 3)); m.setPosition((r() - .5) * rad, (r() - .5) * rad * .7, (r() - .5) * rad);
    gm.applyMatrix4(m); geos.push(gm);
  }
  return geos;
}
