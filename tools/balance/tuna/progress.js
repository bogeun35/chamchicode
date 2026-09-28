// 참치 타이쿤 전체 진행 시뮬 — node progress.js <label> [bot=chase|center] [preSnippet] [maxVoyages]
// 항해(봇 조작) → 항구에서 구매(트리·기본강화·스킬·숙련·선장·어장) → 항해 … 를 클리어(리바이어던 포획)까지 반복.
// 게임 시간 = 항해 시간 합 + 항구 체류(구매 있으면 5초, 없으면 2초) 로 환산해 "실제 플레이 몇 분" 을 추정한다.
const puppeteer = require(process.env.PUPPETEER_CORE || 'puppeteer-core');
const OUTDIR = process.env.OUT_DIR || require('path').join(__dirname, 'out'); require('fs').mkdirSync(OUTDIR, { recursive: true });
const fs = require('fs');
// PowerShell 은 빈 문자열 인자를 버리므로 pre/최대항해는 환경변수로 받는다: TUNA_PRE, TUNA_MAXV
const label = process.argv[2] || 'run', bot = process.argv[3] || 'chase', pre = process.env.TUNA_PRE || '', MAXV = +(process.env.TUNA_MAXV || 4000);
const URL = process.env.TUNA_URL || 'http://localhost:8766/tuna.html';
const OUT = require('path').join(OUTDIR, 'progress-') + label + '.json';

// ── 페이지 안: 항해 1회 ──
const voyageFn = (bot) => {
  const T = window.tuna, S = T.S; const g0 = S.gold, d0 = S.dia, c0 = Object.assign({}, S.counts);
  T.startVoyage(); const V = T.V; if (!V) return { error: 'no voyage' };
  const LW = V.net.x * 2, LH = V.net.y * 2;   // 그물 초기 위치 = 월드 중앙 → 논리 월드 크기
  let t = 0, steps = 0; const netSpd = 700;
  while (T.V && !T.V.ended && steps < 4000) {
    const dt = 0.05, v = T.V;
    if (bot === 'center') { v.net.x = LW / 2; v.net.y = LH / 2; }
    else { let best = null, bd = 1e9; for (const f of v.fish) { if (f.x < 0 || f.x > LW) continue; const d = Math.hypot(f.x - v.net.x, f.y - v.net.y) / Math.max(1, f.f.i + 1) * (f.boss ? .3 : 1); if (d < bd) { bd = d; best = f; } }
      if (best) { const dx = best.x - v.net.x, dy = best.y - v.net.y, d = Math.hypot(dx, dy) || 1, mv = Math.min(d, netSpd * dt); v.net.x += dx / d * mv; v.net.y += dy / d * mv; } v.net.y = Math.max(90, v.net.y); }
    T.sim(dt); t += dt; steps++;
  }
  try { document.getElementById('modal').classList.remove('show'); } catch (e) {}
  const caught = {}; for (const k in S.counts) { const d = (S.counts[k] || 0) - (c0[k] || 0); if (d) caught[k] = d; }
  return { t: +t.toFixed(1), gold: S.gold - g0, dia: S.dia - d0, caught, ending: !!S.ending, lv: S.lv, LW, LH };
};

// ── 페이지 안: 항구에서 구매 (탐욕) ──
const shopFn = () => {
  const T = window.tuna, S = T.S; const bought = []; let spent = 0;
  const own = id => !!S.tree[id];
  // 트리 노드 가치 가중치 (해금 > 배율 > 나머지)
  const Wt = { map: 50, fish: 40, pw: 35, cap: 20, gold: 30, gflat: 18, xp: 10, xflat: 6, spawn: 16, fps: 22, school: 14, respawn: 12, net: 14, netall: 20, power: 16, pflat: 18, time: 26, chest: 10, bottle: 8, disc: 12, dia: 8, crit: 12, frost: 10, bh: 10, bait: 10, frostC: 4, frostT: 3, frostR: 3, bhC: 4, bhT: 3, bhR: 3, baitC: 4, baitN: 4, nspd: 6, fv: 3, cds: 5, dbl: 5 };
  const baseCost = k => Math.round((k === 'power' ? 30 : 60) * Math.pow(k === 'power' ? 1.22 : 1.35, S.base[k]));
  const pupLv = (id, i) => S.pups[id + i] || 0;
  const powerIds = ['lightning', 'bomb', 'jet', 'enet'];
  const pwUnlocked = id => T.TREE.some(n => n.ef === 'pw' && n.tg === id && own(n.id));
  const pupCost = (id, i, k) => { const pi = powerIds.indexOf(id), lv = pupLv(id, i); return { gold: Math.round(120 * Math.pow(2.6, lv + i * .6) * Math.pow(2.2, pi) * (k.max === 1 ? 6 : 1)), dia: Math.round((3 + 5 * lv + 4 * i) * (k.max === 1 ? 4 : 1)) }; };
  const POWERS = T.POWERS || (typeof window.eval === 'function' ? window.eval('typeof POWERS !== "undefined" ? POWERS : null') : null);
  T.CAPTAINS = T.CAPTAINS || window.eval('typeof CAPTAINS !== "undefined" ? CAPTAINS : null');
  let guard = 0;
  while (guard++ < 400) {
    let did = false;
    // 1) 트리: 살 수 있는 노드 중 가중치/비용 최고 (비용은 골드의 100% 까지 허용)
    const cands = T.TREE.filter(n => T.canBuyNode(n)).map(n => ({ n, c: T.nodeCost(n), w: (Wt[n.ef] || 2) * (n.key ? 1.5 : 1) }));
    cands.sort((a, b) => (b.w / Math.max(1, b.c)) - (a.w / Math.max(1, a.c)));
    // 해금(map/fish/pw) 은 비싸도 최우선
    const key = cands.filter(x => ['map', 'fish', 'pw'].includes(x.n.ef)).sort((a, b) => a.c - b.c)[0];
    const pickN = key || cands[0];
    if (pickN) { const before = S.gold; T.buyNode(pickN.n.id); if (S.gold < before) { spent += before - S.gold; bought.push(pickN.n.ef + ':' + (pickN.n.name || pickN.n.id)); did = true; } }
    // 2) 기본 강화: 비용이 보유 골드의 15% 이하면
    for (const k of ['power', 'net']) { const c = baseCost(k); if ((k !== 'net' || S.base.net < 30) && c <= S.gold * .15) { S.gold -= c; S.base[k]++; spent += c; bought.push('base:' + k); did = true; } }
    // 3) 능력 스킬 (POWERS 가 노출돼 있을 때만)
    if (POWERS) for (const id of powerIds) { if (!pwUnlocked(id) || !POWERS[id]) continue; POWERS[id].sk.forEach((k, i) => { const open = k.need == null || pupLv(id, k.need) >= (k.nl || 1); if (!open || pupLv(id, i) >= k.max) return; const c = pupCost(id, i, k); if (c.gold <= S.gold * .2 && c.dia <= S.dia) { S.gold -= c.gold; S.dia -= c.dia; S.pups[id + i] = pupLv(id, i) + 1; spent += c.gold; bought.push('pup:' + id + i); did = true; } }); }
    // 4) 숙련: 많이 잡는 어종부터, 비용이 골드의 10% 이하
    const byCount = T.FISH.slice().sort((a, b) => (S.counts[b.id] || 0) - (S.counts[a.id] || 0));
    for (const f of byCount.slice(0, 6)) { const lv = S.mastery[f.id] || 0; if (lv >= 10 || S.lv < 1 + f.i * 3) continue; const c = { gold: Math.round(f.gold * 40 * Math.pow(2.2, lv)), dia: 2 + 3 * lv + f.i }; if (c.gold <= S.gold * .1 && c.dia <= S.dia) { S.gold -= c.gold; S.dia -= c.dia; S.mastery[f.id] = lv + 1; spent += c.gold; bought.push('mastery:' + f.id); did = true; } }
    if (!did) break;
  }
  // 5) 선장: 해금된 것 중 골드/스폰 효과 큰 것
  if (T.CAPTAINS) { const caps = T.CAPTAINS.filter(c => c.id === 'chamchi' || S.captains[c.id] || T.TREE.some(n => n.ef === 'cap' && n.tg === c.id && own(n.id))); const score = c => (c.eff.gold || 0) * 3 + (c.eff.spawn || 0) * 2 + (c.eff.power || 0) * 2 + (c.eff.xp || 0) + (c.eff.net || 0) * 2 + (c.eff.time || 0) * .3; caps.sort((a, b) => score(b) - score(a)); if (caps[0] && S.captain !== caps[0].id) { S.captain = caps[0].id; S.captains[caps[0].id] = 1; bought.push('captain:' + caps[0].id); } }
  // 6) 어장: 해금된 것 중 가장 높은 인덱스
  let top = 0; T.TREE.forEach(n => { if (n.ef === 'map' && own(n.id)) top = Math.max(top, n.tg); }); if (S.map !== top) { S.map = top; bought.push('map->' + T.MAPS[top].name); }
  return { bought, spent, gold: S.gold, dia: S.dia, lv: S.lv, treeN: Object.keys(S.tree).length, map: S.map, captain: S.captain, fishN: T.TREE.filter(n => n.ef === 'fish' && own(n.id)).length + 4, powers: powerIds.filter(pwUnlocked) };
};

(async () => {
  const browser = await puppeteer.connect({ browserURL: process.env.CDP_URL || 'http://localhost:9224', defaultViewport: null, protocolTimeout: 1800000 });
  const page = await browser.newPage();
  page.on('dialog', d => d.dismiss());
  const errs = []; page.on('pageerror', e => errs.push(String(e).slice(0, 300)));
  await page.setViewport({ width: 1280, height: 720 });
  await page.goto(URL + '?t=' + Date.now(), { waitUntil: 'networkidle0' });
  await page.evaluate(() => { try { localStorage.clear(); } catch (e) {} });
  await page.goto(URL + '?t=' + Date.now(), { waitUntil: 'networkidle0' });
  await page.evaluate(() => new Promise(r => setTimeout(r, 400)));
  if (pre) await page.evaluate(p => new Function(p)(), pre); else await page.evaluate(() => { if (window.tuna && tuna.enterGame) tuna.enterGame('normal'); });
  const t0 = Date.now();
  let gameT = 0, playT = 0, voy = 0; const milestones = [], curve = []; let seen = { map: 0, fishN: 4, powers: 0, lv: 1 }; let ended = false, lastShop = null;
  while (voy < MAXV && !ended) {
    const v = await page.evaluate(voyageFn, bot); if (v.error) { console.error(v.error); break; }
    voy++; gameT += v.t; ended = v.ending;
    const shop = await page.evaluate(shopFn); lastShop = shop;
    playT += v.t + (shop.bought.length ? 5 : 2);
    if (shop.map > seen.map) { milestones.push({ voy, min: +(playT / 60).toFixed(1), what: '어장 해금 → ' + shop.map }); seen.map = shop.map; }
    if (shop.fishN > seen.fishN) { milestones.push({ voy, min: +(playT / 60).toFixed(1), what: '어종 ' + shop.fishN + '종' }); seen.fishN = shop.fishN; }
    if (shop.powers.length > seen.powers) { milestones.push({ voy, min: +(playT / 60).toFixed(1), what: '능력 ' + shop.powers.join(',') }); seen.powers = shop.powers.length; }
    if (shop.lv >= seen.lv + 10) { milestones.push({ voy, min: +(playT / 60).toFixed(1), what: 'Lv ' + shop.lv }); seen.lv = shop.lv; }
    if (voy % 10 === 1 || ended) curve.push({ voy, min: +(playT / 60).toFixed(1), goldPerVoy: Math.round(v.gold), goldHeld: Math.round(shop.gold), lv: shop.lv, treeN: shop.treeN, caught: Object.values(v.caught).reduce((a, b) => a + b, 0), voyT: v.t });
    if (ended) milestones.push({ voy, min: +(playT / 60).toFixed(1), what: '🏆 클리어 (리바이어던 포획)' });
    if (voy % 25 === 0) console.log(`  …${voy}항해 ${(playT / 60).toFixed(1)}분 Lv${shop.lv} map${shop.map} 어종${shop.fishN} 골드/항해 ${Math.round(v.gold)}`);
    if (Date.now() - t0 > 40 * 60 * 1000) { milestones.push({ voy, min: +(playT / 60).toFixed(1), what: '⏱ 실측 20분 초과로 중단' }); break; }
  }
  const res = { label, bot, voyages: voy, gameMin: +(gameT / 60).toFixed(1), playMin: +(playT / 60).toFixed(1), cleared: ended, milestones, curve, last: lastShop, errs, realSec: Math.round((Date.now() - t0) / 1000) };
  fs.writeFileSync(OUT, JSON.stringify(res, null, 1));
  console.log(`[${label}/${bot}] 항해 ${voy}회 · 항해시간 ${res.gameMin}분 · 항구 포함 ${res.playMin}분 · 클리어 ${ended ? 'O' : 'X'} · 실측 ${res.realSec}s · 오류 ${errs.length}`);
  for (const m of milestones) console.log(`  ${String(m.min).padStart(6)}분  항해${String(m.voy).padStart(4)}  ${m.what}`);
  console.log('  곡선(10항해마다): ' + curve.map(c => `${c.min}m:${c.goldPerVoy}g/L${c.lv}`).join(' → '));
  if (errs.length) console.log('  오류: ' + errs[0]);
  await page.close(); browser.disconnect();
})().catch(e => { console.error(e.stack || e.message); process.exit(1); });
