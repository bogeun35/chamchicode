// ROOT(Leder Games) 기본판 규칙 엔진 — 화면과 분리된 순수 로직 (브라우저 · Node 공용)
// 근거: Law of Root(2025-10) 1~9장 · 부록 V, 가을 지도(공식 번호 1~12), 기본 덱 54장, 각 진영판 인쇄 수치
// 상태(S)는 JSON 하나. 행동 = apply(S, 누가, {t:...}) → 새 S.  고를 수 있는 값 = choices(S, 누가, 부분행동)
(function (G) {
'use strict';

// ════════════════════════ 데이터 ════════════════════════
const SUITS = ['fox', 'rabbit', 'mouse'];
const SUIT_KO = { fox: '여우', rabbit: '토끼', mouse: '쥐', bird: '새', any: '아무' };
const FACS = ['cat', 'bird', 'wa', 'vb'];
const NAME = { cat: '고양이 후작', bird: '독수리 왕조', wa: '숲속 동맹', vb: '방랑자' };
// 숲터: 문양, 건물 칸 수, 폐허(마지막 칸을 차지)
const CL = [null,
  { s: 'fox', n: 1 }, { s: 'mouse', n: 2 }, { s: 'rabbit', n: 1 }, { s: 'rabbit', n: 1 },
  { s: 'rabbit', n: 2 }, { s: 'fox', n: 2, r: 1 }, { s: 'mouse', n: 2 }, { s: 'fox', n: 2 },
  { s: 'mouse', n: 2 }, { s: 'rabbit', n: 2, r: 1 }, { s: 'mouse', n: 3, r: 1 }, { s: 'fox', n: 2, r: 1 }];
const PATHS = [[1, 10], [1, 5], [1, 9], [2, 5], [2, 10], [2, 6], [3, 6], [3, 7], [3, 11], [4, 12], [4, 8], [4, 9], [10, 12], [11, 12], [11, 6], [7, 8], [12, 9], [12, 7]];
const RIVER = [[5, 10], [10, 11], [11, 7], [7, 4]];   // 기본판에선 장식 (리버포크 전용)
const FORESTS = [[3, 6, 11], [1, 10, 2, 5], [4, 12, 9], [10, 1, 9, 12], [7, 3, 11, 12], [12, 4, 8, 7], [2, 10, 12, 11, 6]];
const CORNERS = [1, 2, 3, 4], OPP = { 1: 3, 3: 1, 2: 4, 4: 2 };
const ADJ = {}; for (let i = 1; i <= 12; i++) ADJ[i] = [];
PATHS.forEach(([a, b]) => { ADJ[a].push(b); ADJ[b].push(a); });
const adjC = (a, b) => ADJ[a].includes(b);
// 숲 인접: 숲터(경계) · 숲(길 하나를 사이에 둠)
const FADJ = FORESTS.map(() => []);
const edgesOf = f => f.map((v, i) => [v, f[(i + 1) % f.length]].sort((x, y) => x - y).join('-'));
FORESTS.forEach((fa, i) => FORESTS.forEach((fb, j) => { if (i < j && edgesOf(fa).some(e => edgesOf(fb).includes(e))) { FADJ[i].push(j); FADJ[j].push(i); } }));

// 기본 덱 54장
const CARDS = [];
const card = (n, s, k, cost, x, cnt) => { for (let i = 0; i < (cnt || 1); i++) CARDS.push(Object.assign({ id: CARDS.length, n, s, k, cost }, x || {})); };
card('여우 지배', 'fox', 'dom', []); card('토끼 지배', 'rabbit', 'dom', []); card('쥐 지배', 'mouse', 'dom', []); card('새 지배', 'bird', 'dom', []);
card('매복!', 'fox', 'amb', []); card('매복!', 'rabbit', 'amb', []); card('매복!', 'mouse', 'amb', []); card('매복!', 'bird', 'amb', [], null, 2);
card('왕권 주장', 'bird', 'per', ['any', 'any', 'any', 'any'], { e: 'royal', d: '새벽에 이 카드를 버리고, 내가 지배하는 숲터마다 1점' });
card('공병대', 'bird', 'per', ['mouse'], { e: 'sappers', d: '전투에서 방어할 때 이 카드를 버리고 추가 피해 1' }, 2);
card('갑옷 장인', 'bird', 'per', ['fox'], { e: 'armorers', d: '전투에서 이 카드를 버리고, 주사위로 받는 피해를 모두 무시' }, 2);
card('잔혹한 전술', 'bird', 'per', ['fox', 'fox'], { e: 'brutal', d: '공격할 때 추가 피해 1 (대신 방어자 1점)' }, 2);
card('더 좋은 굴 은행', 'rabbit', 'per', ['rabbit', 'rabbit'], { e: 'bbb', d: '새벽 시작에 1장 뽑기 — 그러면 다른 플레이어 하나도 1장' }, 2);
card('지휘 굴', 'rabbit', 'per', ['rabbit', 'rabbit'], { e: 'warren', d: '낮 시작에 전투 한 번' }, 2);
card('구두장이', 'rabbit', 'per', ['rabbit', 'rabbit'], { e: 'cobbler', d: '저녁 시작에 이동 한 번' }, 2);
card('암호 해독가', 'mouse', 'per', ['mouse'], { e: 'code', d: '낮에 한 번, 다른 플레이어 손패 보기' }, 2);
card('정찰대', 'mouse', 'per', ['mouse', 'mouse'], { e: 'scouts', d: '공격할 때 매복 카드에 당하지 않음' }, 2);
card('손 들고 내놔!', 'fox', 'per', ['mouse', 'mouse', 'mouse'], { e: 'stand', d: '새벽에 한 번, 다른 플레이어 카드 1장을 무작위로 가져옴 (그 플레이어 1점)' }, 2);
card('세금 징수원', 'fox', 'per', ['fox', 'rabbit', 'mouse'], { e: 'tax', d: '낮에 한 번, 내 전사 하나를 지도에서 빼고 1장 뽑기' }, 3);
card('여우의 은총', 'fox', 'fav', ['fox', 'fox', 'fox'], { e: 'favor', d: '여우 숲터의 적 기물을 모두 제거' });
card('토끼의 은총', 'rabbit', 'fav', ['rabbit', 'rabbit', 'rabbit'], { e: 'favor', d: '토끼 숲터의 적 기물을 모두 제거' });
card('쥐의 은총', 'mouse', 'fav', ['mouse', 'mouse', 'mouse'], { e: 'favor', d: '쥐 숲터의 적 기물을 모두 제거' });
card('석궁', 'bird', 'item', ['fox'], { it: 'crossbow', vp: 1 }); card('석궁', 'mouse', 'item', ['fox'], { it: 'crossbow', vp: 1 });
card('뿌리차', 'rabbit', 'item', ['mouse'], { it: 'tea', vp: 2 }); card('뿌리차', 'mouse', 'item', ['mouse'], { it: 'tea', vp: 2 }); card('뿌리차', 'fox', 'item', ['mouse'], { it: 'tea', vp: 2 });
card('새의 봇짐', 'bird', 'item', ['mouse'], { it: 'bag', vp: 1 }); card('밀수꾼의 길', 'rabbit', 'item', ['mouse'], { it: 'bag', vp: 1 });
card('자루 속 쥐', 'mouse', 'item', ['mouse'], { it: 'bag', vp: 1 }); card('살짝 쓴 배낭', 'fox', 'item', ['mouse'], { it: 'bag', vp: 1 });
card('숲 달리기 신발', 'bird', 'item', ['rabbit'], { it: 'boot', vp: 1 }); card('친구 방문', 'rabbit', 'item', ['rabbit'], { it: 'boot', vp: 1 });
card('여행 장비', 'mouse', 'item', ['rabbit'], { it: 'boot', vp: 1 }); card('여행 장비', 'fox', 'item', ['rabbit'], { it: 'boot', vp: 1 });
card('빵 바자회', 'rabbit', 'item', ['rabbit', 'rabbit'], { it: 'coins', vp: 3 }); card('투자', 'mouse', 'item', ['rabbit', 'rabbit'], { it: 'coins', vp: 3 });
card('보호비 갈취', 'fox', 'item', ['rabbit', 'rabbit'], { it: 'coins', vp: 3 });
card('무기상', 'bird', 'item', ['fox', 'fox'], { it: 'sword', vp: 2 }); card('검', 'mouse', 'item', ['fox', 'fox'], { it: 'sword', vp: 2 });
card('여우족 강철', 'fox', 'item', ['fox', 'fox'], { it: 'sword', vp: 2 });
card('모루', 'fox', 'item', ['fox'], { it: 'hammer', vp: 2 });

const ITEM_KO = { boot: '장화', sword: '검', crossbow: '석궁', hammer: '망치', torch: '횃불', tea: '차', coins: '동전', bag: '가방' };
const ITEM_IC = { boot: '👢', sword: '🗡️', crossbow: '🏹', hammer: '🔨', torch: '🔥', tea: '🍵', coins: '🪙', bag: '🎒' };
const SUPPLY0 = { boot: 2, bag: 2, crossbow: 1, hammer: 1, sword: 2, tea: 2, coins: 2 };
// 방랑자 퀘스트 15장 (이름 · 필요 아이템은 원작 9종, 문양 배분은 재구성)
const QUESTS = [
  ['모금', 'fox', 'tea', 'coins'], ['심부름', 'fox', 'tea', 'boot'], ['물자 운반', 'fox', 'boot', 'bag'], ['헛간 수리', 'fox', 'torch', 'hammer'], ['연설', 'fox', 'torch', 'tea'],
  ['경비 근무', 'rabbit', 'torch', 'sword'], ['심부름', 'rabbit', 'tea', 'boot'], ['연설', 'rabbit', 'torch', 'tea'], ['곰 쫓기', 'rabbit', 'torch', 'crossbow'], ['도적 퇴치', 'rabbit', 'sword', 'sword'],
  ['도적 퇴치', 'mouse', 'sword', 'sword'], ['경비 근무', 'mouse', 'torch', 'sword'], ['곰 쫓기', 'mouse', 'torch', 'crossbow'], ['호위', 'mouse', 'boot', 'boot'], ['물자 운반', 'mouse', 'boot', 'bag'],
].map(([n, s, a, b], id) => ({ id, n, s, it: [a, b] }));
// 진영판 수치
const CAT = { cost: [0, 1, 2, 3, 3, 4], vp: { saw: [0, 1, 2, 3, 4, 5], shop: [0, 2, 2, 3, 4, 5], rec: [0, 1, 2, 3, 3, 4] }, draw: [1, 1, 1, 2, 2, 3, 3] };
const BLD_KO = { saw: '제재소', shop: '작업장', rec: '모병소', roost: '둥지', base: '기지', ruin: '폐허' };
const BIRD = { vp: [0, 0, 1, 2, 3, 4, 4, 5], draw: [1, 1, 1, 2, 2, 2, 3, 3],
  leaders: { builder: ['rec', 'move'], charis: ['rec', 'bat'], command: ['move', 'bat'], despot: ['move', 'build'] } };
const LEADER_KO = { builder: '건설가', charis: '카리스마', command: '지휘관', despot: '폭군' };
const LEADER_D = { builder: '제작할 때 거래 경멸을 무시 (아이템 점수 그대로)', charis: '징집하면 전사를 2명씩', command: '공격할 때 추가 피해 1', despot: '전투에서 적 건물·토큰을 제거하면 1점 더' };
const COLS = ['rec', 'move', 'bat', 'build'], COL_KO = { rec: '징집', move: '이동', bat: '전투', build: '건설' };
const WA = { cost: [1, 1, 1, 2, 2, 2, 3, 3, 3, 3], vp: [0, 1, 1, 1, 2, 2, 3, 4, 4, 4] };
const VB = { chars: { thief: ['boot', 'torch', 'tea', 'sword'], tinker: ['boot', 'torch', 'bag', 'hammer'], ranger: ['boot', 'torch', 'crossbow', 'sword'] },
  relCost: [1, 2, 3], relVP: [1, 2, 2] };
const CHAR_KO = { thief: '도둑', tinker: '땜장이', ranger: '순찰자' };
const CHAR_D = { thief: '훔치기: 횃불을 소모해 같은 숲터의 플레이어 카드 1장을 무작위로 가져옴',
  tinker: '날품팔이: 횃불을 소모해 버림 더미에서 이 숲터 문양(또는 새) 카드 1장을 가져옴',
  ranger: '은신처: 횃불을 소모해 아이템 3개 수리, 그리고 바로 낮을 끝냄' };

// ════════════════════════ 기본 도우미 ════════════════════════
const clone = o => JSON.parse(JSON.stringify(o));
function rnd(S) { let t = (S.rng = (S.rng + 0x6D2B79F5) >>> 0); t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }
const rint = (S, n) => Math.floor(rnd(S) * n);
function shuf(S, a) { for (let i = a.length - 1; i > 0; i--) { const j = rint(S, i + 1); [a[i], a[j]] = [a[j], a[i]]; } return a; }
class RuleError extends Error {}
const no = m => { throw new RuleError(m); };
const need = (c, m) => { if (!c) no(m); };
const keyOf = (S, f) => S.fac[f];
const facOf = (S, k) => S.pl[k] && S.pl[k].fac;
const cur = S => S.seat[S.turn.p];
const curFac = S => facOf(S, cur(S));
const C = (S, c) => S.map.c[c];
const suitOf = c => CL[c].s;
const present = (S, f) => !!S.fac[f];
const enemies = (S, f) => FACS.filter(g => g !== f && present(S, g) && !inCoal(S, f, g));
function inCoal(S, f, g) { const a = keyOf(S, f), b = keyOf(S, g); if (!a || !b) return false; return S.pl[a].coal === b || S.pl[b].coal === a; }
function log(S, t) { S.log.push(t); if (S.log.length > 80) S.log.splice(0, S.log.length - 80); }

function score(S, f, n, why) {
  const k = keyOf(S, f); if (!k || !n || S.win) return; const p = S.pl[k];
  if (p.dom != null || p.coal) return;   // 지배 카드를 켰거나 연합한 방랑자는 점수 없음
  p.vp = Math.max(0, p.vp + n);
  if (why) log(S, `${NAME[f]} ${n > 0 ? '+' : ''}${n}점 (${why})`);
  const goal = S.goal || 30; if (p.vp >= goal) win(S, [f], `${goal}점 달성`);
}
function win(S, facs, why) {
  if (S.win) return;
  const keys = facs.map(f => keyOf(S, f));
  const vk = keyOf(S, 'vb'); if (vk && S.pl[vk].coal && keys.includes(S.pl[vk].coal) && !keys.includes(vk)) keys.push(vk);
  S.win = { keys, why }; S.q = []; S.prompt = null;
  log(S, `🏆 ${keys.map(k => NAME[facOf(S, k)]).join(' · ')} 승리! (${why})`);
}
// 카드 이동
function draw(S, k, n) {
  const got = [];
  for (let i = 0; i < n; i++) {
    if (!S.deck.length) { if (!S.disc.length) break; S.deck = shuf(S, S.disc); S.disc = []; log(S, '🔄 덱이 떨어져 버림 더미를 섞었어요'); }
    const id = S.deck.pop(); S.pl[k].hand.push(id); got.push(id);
  }
  return got;
}
function discard(S, id) { if (CARDS[id].k === 'dom') S.domAvail.push(id); else S.disc.push(id); }
function takeFromHand(S, k, id) { const h = S.pl[k].hand, i = h.indexOf(id); need(i >= 0, '손패에 없는 카드예요'); h.splice(i, 1); return id; }
const matches = (id, suit) => CARDS[id].s === 'bird' || CARDS[id].s === suit;   // 새는 만능

// ════════════════════════ 지도 판정 ════════════════════════
const bldOf = (Cc, f) => Cc.sl.filter(x => x && x.f === f).length;
const openSlots = Cc => Cc.sl.filter(x => x === null).length;
function keepAt(S) { for (let c = 1; c <= 12; c++) if (C(S, c).keep) return c; return 0; }
const canPlace = (S, f, c) => !(keepAt(S) === c && f !== 'cat');   // 성채 숲터엔 후작만 놓을 수 있음
function vbAt(S) { return S.vb && S.vb.loc && S.vb.loc[0] === 'c' ? +S.vb.loc.slice(1) : 0; }
function power(S, c, f) { if (f === 'vb') return 0; const Cc = C(S, c); return Cc.w[f] + bldOf(Cc, f); }
function ruler(S, c) {
  let best = 0, who = [];
  for (const f of ['cat', 'bird', 'wa']) { if (!present(S, f)) continue; const n = power(S, c, f); if (n > best) { best = n; who = [f]; } else if (n === best && n > 0) who.push(f); }
  if (!best) return null; if (who.length === 1) return who[0];
  return who.includes('bird') ? 'bird' : null;   // 숲의 군주: 동점이면 독수리
}
const rules = (S, f, c) => ruler(S, c) === f;
function hasPieces(S, c, f) {
  if (f === 'vb') return vbAt(S) === c;
  const Cc = C(S, c); if (Cc.w[f] > 0 || bldOf(Cc, f) > 0) return true;
  if (f === 'cat' && (Cc.wood > 0 || Cc.keep)) return true; if (f === 'wa' && Cc.symp) return true; return false;
}
const sympCount = S => { let n = 0; for (let c = 1; c <= 12; c++) if (C(S, c).symp) n++; return n; };
const bldCount = (S, f, t) => { let n = 0; for (let c = 1; c <= 12; c++) n += C(S, c).sl.filter(x => x && x.f === f && (!t || x.t === t)).length; return n; };
const basesOnMap = S => { const out = []; for (let c = 1; c <= 12; c++) if (C(S, c).sl.some(x => x && x.t === 'base')) out.push(c); return out; };

// ════════════════════════ 방랑자 아이템 ════════════════════════
const TRACK = ['tea', 'coins', 'bag'];
function vbItems(S) { return S.vb.it; }
const vbUp = (S, t) => S.vb.it.filter(x => x.t === t && x.up && !x.dmg).length;
const vbTrack = (S, t) => Math.min(3, vbUp(S, t));
const vbSwords = S => S.vb.it.filter(x => x.t === 'sword' && !x.dmg).length;
function vbExhaust(S, t, n) {
  for (let i = 0; i < (n || 1); i++) { const it = S.vb.it.find(x => x.t === t && x.up && !x.dmg); need(it, `쓸 수 있는 ${ITEM_KO[t]}이(가) 없어요`); it.up = 0; }
}
function vbLoad(S) { // 가방 칸 계산: 트랙(차·동전·가방, 종류별 최대 3)에 오른 아이템은 빼고 셈
  let n = 0; const onTrack = { tea: 0, coins: 0, bag: 0 };
  for (const x of S.vb.it) { if (TRACK.includes(x.t) && x.up && !x.dmg && onTrack[x.t] < 3) { onTrack[x.t]++; continue; } n++; }
  return n;
}
const vbLimit = S => 6 + 2 * vbTrack(S, 'bag');
function vbGain(S, t) { S.vb.it.push({ t, up: 1, dmg: 0 }); }
const rel = (S, f) => S.vb ? S.vb.rel[f] : undefined;
const hostile = (S, f) => rel(S, f) === 'h';
const allied = (S, f) => rel(S, f) === 3;

// ════════════════════════ 새 게임 ════════════════════════
// players: [{ key, nick, fac }]  (fac 중복 없음), opts: { seed }
function newGame(players, opts) {
  opts = opts || {};
  const S = { v: 1, rng: (opts.seed >>> 0) || 12345, seat: [], pl: {}, fac: {}, map: { c: [null] }, deck: [], disc: [], domAvail: [],
    goal: opts.goal || 30, supply: clone(SUPPLY0), turn: { p: 0, ph: 'setup', st: 'setup' }, q: [], prompt: null, battle: null, log: [], win: null, setup: null, n: 0 };
  players.forEach(p => { S.pl[p.key] = { nick: p.nick, fac: p.fac, vp: 0, hand: [], dom: null, coal: null, crafted: [], items: [] }; S.fac[p.fac] = p.key; });
  S.seat = shuf(S, players.map(p => p.key));   // 시작 플레이어와 자리 순서는 무작위 (5.1.1)
  for (let c = 1; c <= 12; c++) {
    const sl = Array(CL[c].n).fill(null); if (CL[c].r) sl[sl.length - 1] = { t: 'ruin', it: null };
    S.map.c.push({ sl, w: { cat: 0, bird: 0, wa: 0 }, wood: 0, keep: false, symp: false });
  }
  S.deck = shuf(S, CARDS.map(c => c.id).filter(id => players.length > 2 || CARDS[id].k !== 'dom'));   // 2인이면 지배 카드 제외
  S.seat.forEach(k => draw(S, k, 3));
  if (present(S, 'cat')) S.cat = { wood: 8, wSup: 25, track: { saw: 5, shop: 5, rec: 5 } };
  if (present(S, 'bird')) S.bird = { wSup: 20, roostTrack: 6, leader: null, spent: [], decree: { rec: [], move: [], bat: [], build: [] } };
  if (present(S, 'wa')) S.wa = { wSup: 10, bases: { fox: 1, rabbit: 1, mouse: 1 }, sympTrack: 10, sup: [], off: 0 };
  if (present(S, 'vb')) {
    S.vb = { ch: null, loc: null, it: [], rel: {}, qDeck: shuf(S, QUESTS.map(q => q.id)), q: [], done: [] };
    enemies(S, 'vb').forEach(f => { S.vb.rel[f] = 0; });
    S.vb.q = [S.vb.qDeck.pop(), S.vb.qDeck.pop(), S.vb.qDeck.pop()];
  }
  // 폐허 아이템: 가방·장화·망치·검을 무작위로 하나씩 (방랑자가 없으면 폐허만 둠)
  const ruinItems = shuf(S, ['bag', 'boot', 'hammer', 'sword']);
  let ri = 0; for (let c = 1; c <= 12; c++) { const r = C(S, c).sl.find(x => x && x.t === 'ruin'); if (r) r.it = present(S, 'vb') ? ruinItems[ri++] : null; }
  if (present(S, 'wa')) { const k = keyOf(S, 'wa'); for (let i = 0; i < 3; i++) { const got = drawDeck(S); if (got != null) S.wa.sup.push(got); } }
  S.setup = { order: FACS.filter(f => present(S, f)), i: 0, st: null };
  log(S, `🌲 ROOT 시작 — ${S.seat.map(k => `${S.pl[k].nick}(${NAME[S.pl[k].fac]})`).join(' → ')}`);
  nextSetup(S, true);
  return S;
}
function drawDeck(S) { if (!S.deck.length) { if (!S.disc.length) return null; S.deck = shuf(S, S.disc); S.disc = []; } return S.deck.pop(); }

// 진영 준비 (5.1.7): 후작 → 왕조 → 동맹 → 방랑자 순서, 각자 고를 것만 고름
function nextSetup(S, first) {
  const su = S.setup; if (!first) su.i++;
  while (su.i < su.order.length) {
    const f = su.order[su.i], k = keyOf(S, f);
    if (f === 'cat') { su.st = 'catKeep'; S.prompt = { to: k, kind: 'setup', st: 'catKeep' }; return; }
    if (f === 'bird') {
      const taken = S.cat ? [keepAt(S)] : [];
      const want = taken.length ? OPP[taken[0]] : 0;
      if (want && !taken.includes(want)) { birdCorner(S, want); su.st = 'birdLeader'; S.prompt = { to: k, kind: 'setup', st: 'birdLeader' }; return; }
      su.st = 'birdCorner'; S.prompt = { to: k, kind: 'setup', st: 'birdCorner' }; return;
    }
    if (f === 'wa') { log(S, `🌿 숲속 동맹 준비 — 지지자 ${S.wa.sup.length}장`); su.i++; continue; }
    if (f === 'vb') { su.st = 'vbChar'; S.prompt = { to: k, kind: 'setup', st: 'vbChar' }; return; }
  }
  S.setup = null; S.prompt = null; S.turn = { p: 0 };
  log(S, '🎲 준비 끝! 게임을 시작합니다');
  startTurn(S);
}
function birdCorner(S, c) {
  const Cc = C(S, c); const i = Cc.sl.indexOf(null); Cc.sl[i] = { t: 'roost', f: 'bird' }; S.bird.roostTrack = 6;
  const n = Math.min(6, S.bird.wSup); Cc.w.bird += n; S.bird.wSup -= n;
  log(S, `🦅 독수리 왕조가 ${c}번 모서리에 둥지와 전사 ${n}명`);
}
function setupAct(S, k, a) {
  const su = S.setup; need(su && S.prompt && S.prompt.to === k, '지금은 준비 차례가 아니에요');
  const st = su.st;
  if (st === 'catKeep') {
    need(CORNERS.includes(a.c), '모서리 숲터를 골라 주세요');
    C(S, a.c).keep = true;
    const opp = OPP[a.c];
    for (let c = 1; c <= 12; c++) if (c !== opp) { C(S, c).w.cat++; S.cat.wSup--; }
    log(S, `🐱 고양이 후작 성채: ${a.c}번 (반대편 ${opp}번 빼고 전사 1명씩)`);
    su.st = 'catBld'; su.left = ['saw', 'shop', 'rec']; S.prompt = { to: k, kind: 'setup', st: 'catBld' }; return;
  }
  if (st === 'catBld') {
    need(su.left.includes(a.b), '그 건물은 이미 놓았어요');
    const kc = keepAt(S); need(a.c === kc || adjC(kc, a.c), '성채 숲터나 그 옆에만 놓을 수 있어요');
    const Cc = C(S, a.c), i = Cc.sl.indexOf(null); need(i >= 0, '빈 건물 칸이 없어요');
    Cc.sl[i] = { t: a.b, f: 'cat' }; su.left.splice(su.left.indexOf(a.b), 1);
    log(S, `🐱 시작 ${BLD_KO[a.b]}: ${a.c}번`);
    if (!su.left.length) nextSetup(S); return;
  }
  if (st === 'birdCorner') {
    const taken = S.cat ? [keepAt(S)] : [];
    need(CORNERS.includes(a.c) && !taken.includes(a.c) && openSlots(C(S, a.c)) > 0 && canPlace(S, 'bird', a.c), '다른 진영이 시작하지 않은 모서리를 골라 주세요');
    birdCorner(S, a.c); su.st = 'birdLeader'; S.prompt = { to: k, kind: 'setup', st: 'birdLeader' }; return;
  }
  if (st === 'birdLeader') { need(BIRD.leaders[a.l], '지도자를 골라 주세요'); setLeader(S, a.l); nextSetup(S); return; }
  if (st === 'vbChar') {
    need(VB.chars[a.ch], '캐릭터를 골라 주세요'); S.vb.ch = a.ch; VB.chars[a.ch].forEach(t => vbGain(S, t));
    log(S, `🦝 방랑자: ${CHAR_KO[a.ch]} (${VB.chars[a.ch].map(t => ITEM_KO[t]).join('·')})`);
    su.st = 'vbForest'; S.prompt = { to: k, kind: 'setup', st: 'vbForest' }; return;
  }
  if (st === 'vbForest') { need(a.f >= 0 && a.f < FORESTS.length, '숲을 골라 주세요'); S.vb.loc = 'f' + a.f; log(S, `🦝 방랑자가 숲 ${a.f + 1}에서 출발`); nextSetup(S); return; }
  no('알 수 없는 준비 단계');
}
function setLeader(S, l) {
  const B = S.bird; B.leader = l;
  // 충직한 재상 2장(새 문양, 덱 밖 카드)을 지도자 칸에
  COLS.forEach(col => { B.decree[col] = B.decree[col].filter(x => x !== 'viz'); });
  BIRD.leaders[l].forEach(col => B.decree[col].push('viz'));
  log(S, `🦅 독수리 지도자: ${LEADER_KO[l]} — ${LEADER_D[l]}`);
}

// ════════════════════════ 카드 효과 도우미 ════════════════════════
const crafted = (S, k, e) => !!k && S.pl[k].crafted.some(id => CARDS[id].e === e);
function useCrafted(S, k, e) {   // 버리고 쓰는 지속 효과 (왕권 주장 · 공병대 · 갑옷 장인)
  const p = S.pl[k], i = p.crafted.findIndex(id => CARDS[id].e === e); need(i >= 0, '그 카드가 없어요');
  discard(S, p.crafted.splice(i, 1)[0]);
}
const otherKeys = (S, k) => S.seat.filter(x => x !== k);
const enemyKeys = (S, k) => enemies(S, facOf(S, k)).map(f => keyOf(S, f));
const standTargets = (S, k) => enemyKeys(S, k).filter(x => S.pl[x].hand.length > 0);

// ════════════════════════ 차례 진행 ════════════════════════
const STEPS = {
  cat: ['b_start', 'cat_wood', 'd_start', 'cat_day', 'e_start', 'e_draw', 'e_disc', 'end'],
  bird: ['b_start', 'bird_emerg', 'bird_add', 'bird_roost', 'd_start', 'bird_craft', 'bird_dec', 'e_start', 'bird_score', 'e_draw', 'e_disc', 'end'],
  wa: ['b_start', 'wa_bird', 'd_start', 'wa_day', 'e_start', 'wa_ops', 'e_draw', 'e_disc', 'end'],
  vb: ['b_start', 'vb_refresh', 'vb_slip', 'd_start', 'vb_day', 'e_start', 'vb_rest', 'e_draw', 'e_disc', 'vb_cap', 'end'],
};
const DAY_ST = ['d_start', 'cat_day', 'bird_craft', 'bird_dec', 'wa_day', 'vb_day'];
const EVE_ST = ['e_start', 'wa_ops', 'bird_score', 'vb_rest', 'e_draw', 'e_disc', 'vb_cap', 'end'];
const phaseOf = st => DAY_ST.includes(st) ? 'day' : EVE_ST.includes(st) ? 'eve' : 'bird';
const PH_KO = { bird: '새벽', day: '낮', eve: '저녁' };

function startTurn(S) {
  if (S.win) return;
  const k = cur(S), f = facOf(S, k);
  S.turnNo = (S.turnNo || 0) + 1;
  S.turn = { p: S.turn.p, i: -1, st: null, ph: 'bird', used: {}, craft: { fox: 0, rabbit: 0, mouse: 0 } };
  if (f === 'cat') Object.assign(S.turn, { acts: 3, recUsed: 0, acted: 0, march: 0 });
  if (f === 'wa') Object.assign(S.turn, { spread: 0, ops: 0 });
  if (f === 'vb') Object.assign(S.turn, { aid: {} });
  S.peek = null;
  log(S, `── ${S.pl[k].nick} · ${NAME[f]} 차례 ──`);
  advance(S);
}
function advance(S) {   // 다음 단계로 — 입력이 필요한 단계에서 멈춤
  while (!S.win) {
    const steps = STEPS[curFac(S)];
    S.turn.i++;
    const st = steps[S.turn.i]; S.turn.st = st; S.turn.ph = phaseOf(st);
    if (st === 'end') { S.turn.p = (S.turn.p + 1) % S.seat.length; startTurn(S); return; }
    if (ENTER[st] && ENTER[st](S)) return;
    if (S.prompt) return;
  }
}
function jumpTo(S, st) { const steps = STEPS[curFac(S)]; S.turn.i = steps.indexOf(st) - 1; advance(S); }
function run(S) {   // 쌓인 처리(전투 · 야전 병원 · 분노 …)를 결정이 필요할 때까지 진행
  let guard = 0;
  while (!S.win && !S.prompt && S.q.length && guard++ < 1000) { const t = S.q.shift(); TASK[t.do](S, t); }
}
function domWin(S, k) {
  const p = S.pl[k], f = p.fac; if (p.dom == null || f === 'vb') return false;
  const s = CARDS[p.dom].s;
  if (s === 'bird') { if ((rules(S, f, 1) && rules(S, f, 3)) || (rules(S, f, 2) && rules(S, f, 4))) { win(S, [f], '새 지배: 마주 보는 모서리 두 곳 지배'); return true; } return false; }
  let n = 0; for (let c = 1; c <= 12; c++) if (suitOf(c) === s && rules(S, f, c)) n++;
  if (n >= 3) { win(S, [f], `${SUIT_KO[s]} 지배: ${SUIT_KO[s]} 숲터 ${n}곳 지배`); return true; }
  return false;
}
const hand = (S, k) => S.pl[k].hand;
const ENTER = {
  b_start(S) {
    const k = cur(S); if (domWin(S, k)) return true;
    return crafted(S, k, 'bbb') || crafted(S, k, 'royal') || (crafted(S, k, 'stand') && standTargets(S, k).length > 0);
  },
  cat_wood(S) {
    const saws = sawClearings(S); if (!saws.length) return false;
    if (S.cat.wood >= saws.length) { saws.forEach(c => { C(S, c).wood++; S.cat.wood--; }); log(S, `🪵 제재소마다 나무 1개 (${saws.length}개)`); return false; }
    if (!S.cat.wood) { log(S, '🪵 나무 토큰이 다 떨어졌어요'); return false; }
    S.turn.woodLeft = saws; return true;   // 나무가 모자라면 어느 제재소에 놓을지 고름
  },
  d_start(S) { return crafted(S, cur(S), 'warren') && warTargets(S, curFac(S)).length > 0; },
  cat_day() { return true; },
  e_start(S) { return crafted(S, cur(S), 'cobbler') && anyMove(S, curFac(S)); },
  e_draw(S) {
    const k = cur(S), f = curFac(S); let n = 1;
    if (f === 'cat') n = CAT.draw[bldCount(S, 'cat', 'rec')];
    if (f === 'bird') n = BIRD.draw[bldCount(S, 'bird', 'roost')];
    if (f === 'wa') n = 1 + basesOnMap(S).length;
    if (f === 'vb') n = 1 + vbTrack(S, 'coins');
    const got = draw(S, k, n); log(S, `🃏 ${NAME[f]} ${got.length}장 뽑음`); return false;
  },
  e_disc(S) { return hand(S, cur(S)).length > 5; },
  bird_emerg(S) { const k = cur(S); if (!hand(S, k).length) { draw(S, k, 1); log(S, '🦅 비상 명령: 손패가 없어 1장 뽑음'); } return false; },
  bird_add(S) { return hand(S, cur(S)).length > 0; },
  bird_roost(S) {
    if (bldCount(S, 'bird', 'roost') > 0) return false;
    if (!newRoostTargets(S).length) { log(S, '🦅 새 둥지를 놓을 곳이 없어요'); return false; }
    return true;
  },
  bird_craft() { return true; },
  bird_dec(S) { S.turn.dq = { col: 0, done: [] }; return !decSkip(S); },
  bird_score(S) { const r = bldCount(S, 'bird', 'roost'), n = BIRD.vp[r]; if (n) score(S, 'bird', n, `둥지 ${r}개`); return false; },
  wa_bird() { return true; },
  wa_day() { return true; },
  wa_ops(S) { S.turn.ops = S.wa.off; return S.wa.off > 0; },
  vb_refresh(S) {
    const n = 3 + 2 * vbTrack(S, 'tea'), ex = S.vb.it.filter(x => !x.up);
    if (!ex.length) return false;
    if (ex.length <= n) { ex.forEach(x => { x.up = 1; }); log(S, `🦝 원기 회복: 아이템 ${ex.length}개를 다시 세움`); return false; }
    S.turn.refreshN = n; return true;
  },
  vb_slip() { return true; },
  vb_day() { return true; },
  vb_rest(S) {
    if (vbAt(S)) return false;
    const d = S.vb.it.filter(x => x.dmg); if (d.length) { d.forEach(x => { x.dmg = 0; x.up = 1; }); log(S, `🦝 숲에서 휴식: 손상된 아이템 ${d.length}개 수리`); }
    return false;
  },
  vb_cap(S) { return vbLoad(S) > vbLimit(S); },
};

// ════════════════════════ 전투 ════════════════════════
const maxRoll = (S, f, c, ally) => f === 'vb' ? vbSwords(S) + (ally ? C(S, c).w[ally] : 0) : C(S, c).w[f];
const defenseless = (S, f, c) => f === 'vb' ? vbSwords(S) === 0 : C(S, c).w[f] === 0;
const canAttackIn = (S, a, c) => a === 'vb' ? vbAt(S) === c : C(S, c).w[a] > 0;
const defendersIn = (S, a, c, ally) => enemies(S, a).filter(d => d !== ally && hasPieces(S, c, d));
function battleSpots(S, a, suit) {
  const out = []; for (let c = 1; c <= 12; c++) if ((!suit || suit === 'bird' || suitOf(c) === suit) && canAttackIn(S, a, c) && defendersIn(S, a, c).length) out.push(c); return out;
}
function warTargets(S, a) { return a === 'vb' ? (vbAt(S) && defendersIn(S, 'vb', vbAt(S)).length ? [vbAt(S)] : []) : battleSpots(S, a); }
function startBattle(S, a, d, c, ally) {
  need(canAttackIn(S, a, c), '그 숲터에서는 공격할 수 없어요');
  need(defendersIn(S, a, c, ally).includes(d), '그 상대와는 싸울 수 없어요');
  S.battle = { a, d, c, ally: ally || null, rollA: 0, rollD: 0, extraA: 0, extraD: 0, ignA: 0, ignD: 0, remA: 0, remD: 0, allyLoss: 0, itemLoss: 0, over: 0 };
  log(S, `⚔️ ${NAME[a]}${ally ? ` + ${NAME[ally]}(동맹)` : ''} → ${NAME[d]} · ${c}번 ${SUIT_KO[suitOf(c)]} 숲터`);
  S.q.unshift({ do: 'bAmb' }, { do: 'bRoll' }, { do: 'bFx', side: 'a' }, { do: 'bFx', side: 'd' }, { do: 'bDeal' }, { do: 'bEnd' });
}
const TASK = {};
TASK.advance = S => advance(S);
TASK.jump = (S, t) => jumpTo(S, t.st);
TASK.decNext = S => { if (decSkip(S)) advance(S); };
TASK.opsNext = S => { if (S.turn.ops <= 0) advance(S); };
TASK.bAmb = S => {
  const B = S.battle, ak = keyOf(S, B.a), dk = keyOf(S, B.d);
  if (crafted(S, ak, 'scouts')) return;   // 정찰대: 매복에 당하지 않음
  const opts = S.pl[dk].hand.filter(id => CARDS[id].k === 'amb' && matches(id, suitOf(B.c)));
  if (opts.length) S.prompt = { to: dk, kind: 'amb', opts };
};
function ambushHits(S) { const B = S.battle; S.q.unshift({ do: 'hits', to: B.a, n: 2, by: B.d }, { do: 'bAmbCheck' }); }
TASK.bAmbCheck = S => { const B = S.battle; if (B.a !== 'vb' && C(S, B.c).w[B.a] === 0) { B.over = 1; log(S, '💥 매복에 공격 전사가 모두 쓰러져 전투가 끝났어요'); } };
TASK.bRoll = S => {
  const B = S.battle; if (B.over) return;
  const r1 = rint(S, 4), r2 = rint(S, 4), hi = Math.max(r1, r2), lo = Math.min(r1, r2);
  let a = hi, d = lo; if (B.d === 'wa') { a = lo; d = hi; }   // 게릴라전: 동맹이 방어하면 큰 눈을 가짐
  B.dice = [r1, r2];
  B.rollA = Math.min(a, maxRoll(S, B.a, B.c, B.ally)); B.rollD = Math.min(d, maxRoll(S, B.d, B.c, null));
  if (B.a === 'bird' && S.bird.leader === 'command') B.extraA++;
  if (defenseless(S, B.d, B.c)) { B.extraA++; B.defless = 1; }
  log(S, `🎲 ${r1} · ${r2} → ${NAME[B.a]} ${B.rollA}${B.extraA ? ` (+${B.extraA})` : ''} · ${NAME[B.d]} ${B.rollD}${B.defless ? ' · 무방비' : ''}`);
};
TASK.bFx = (S, t) => {
  const B = S.battle; if (B.over) return;
  const f = t.side === 'a' ? B.a : B.d, k = keyOf(S, f), opts = [];
  if (t.side === 'a' && crafted(S, k, 'brutal')) opts.push('brutal');
  if (t.side === 'd' && crafted(S, k, 'sappers')) opts.push('sappers');
  if (crafted(S, k, 'armorers')) opts.push('armorers');
  if (opts.length) S.prompt = { to: k, kind: 'fx', side: t.side, opts };
};
TASK.bDeal = S => {
  const B = S.battle; if (B.over) return;
  const toD = (B.ignD ? 0 : B.rollA) + B.extraA, toA = (B.ignA ? 0 : B.rollD) + B.extraD;
  S.q.unshift({ do: 'hits', to: B.d, n: toD, by: B.a }, { do: 'hits', to: B.a, n: toA, by: B.d });
};
TASK.bEnd = S => {
  const B = S.battle; if (!B) return;
  if (S.bird && S.bird.leader === 'despot' && ((B.a === 'bird' && B.remA) || (B.d === 'bird' && B.remD))) score(S, 'bird', 1, '폭군');
  if (B.ally && B.allyLoss > B.itemLoss && !hostile(S, B.ally)) { S.vb.rel[B.ally] = 'h'; log(S, `😠 동맹 전사를 더 많이 희생시켜 ${NAME[B.ally]}이(가) 적대로 돌아섰어요`); }
  S.battle = null;
};
// 피해 받기: 전사 먼저, 그다음 건물·토큰(받는 쪽이 고름). 방랑자는 아이템 손상
TASK.hits = (S, t) => {
  const B = S.battle, c = B ? B.c : t.c; let n = t.n; if (n <= 0) return;
  if (t.to === 'vb') return vbTakeHits(S, n, B && B.a === 'vb' && B.ally ? B.ally : null, t.by);
  const w = Math.min(n, C(S, c).w[t.to]);
  if (w) removeWarriors(S, c, t.to, w, t.by);
  n -= w; if (n <= 0) return;
  const list = btList(S, c, t.to); if (!list.length) return;
  if (n >= list.length || new Set(list).size === 1) { list.slice(0, n).forEach(p => removeBT(S, c, t.to, p, t.by)); return; }
  S.prompt = { to: keyOf(S, t.to), kind: 'hits', c, n, opts: list, by: t.by };
};
function btList(S, c, f) {
  const Cc = C(S, c), out = [];
  Cc.sl.forEach(x => { if (x && x.f === f) out.push(x.t); });
  if (f === 'cat') { for (let i = 0; i < Cc.wood; i++) out.push('wood'); if (Cc.keep) out.push('keep'); }
  if (f === 'wa' && Cc.symp) out.push('symp');
  return out;
}
const PIECE_KO = p => p === 'wood' ? '나무' : p === 'keep' ? '성채' : p === 'symp' ? '공감 토큰' : BLD_KO[p];
function vbTakeHits(S, n, ally, byF) {
  const B = S.battle, c = B ? B.c : vbAt(S);
  const und = S.vb.it.map((x, i) => i).filter(i => !S.vb.it[i].dmg), aw = ally ? C(S, c).w[ally] : 0;
  if (!und.length && !aw) { log(S, '🦝 손상될 아이템이 없어 남은 피해를 무시'); return; }
  const kinds = new Set(und.map(i => S.vb.it[i].t + S.vb.it[i].up));
  if (!aw && (n >= und.length || kinds.size === 1)) { vbDamage(S, und.slice(0, n)); return; }
  S.prompt = { to: keyOf(S, 'vb'), kind: 'vbhits', n: Math.min(n, und.length + aw), ally, by: byF };
}
function vbDamage(S, idxs) {
  idxs.forEach(i => { S.vb.it[i].dmg = 1; if (S.battle) S.battle.itemLoss++; });
  if (idxs.length) log(S, `🦝 아이템 손상: ${idxs.map(i => ITEM_KO[S.vb.it[i].t]).join(', ')}`);
}
TASK.vbDmg = (S, t) => {   // 전부 제거 효과에 휘말림: 아이템 3개 손상
  const und = S.vb.it.map((x, i) => i).filter(i => !S.vb.it[i].dmg); if (!und.length) return;
  const kinds = new Set(und.map(i => S.vb.it[i].t + S.vb.it[i].up));
  if (t.n >= und.length || kinds.size === 1) { vbDamage(S, und.slice(0, t.n)); return; }
  S.prompt = { to: keyOf(S, 'vb'), kind: 'vbdmg', n: t.n };
};

// ════════════════════════ 제거 · 끼어드는 효과 ════════════════════════
function removeWarriors(S, c, f, n, byF) {
  const Cc = C(S, c); n = Math.min(n, Cc.w[f]); if (n <= 0) return 0;
  Cc.w[f] -= n; S[f].wSup += n;
  log(S, `☠️ ${NAME[f]} 전사 ${n} 제거 (${c}번)`);
  if (byF === 'vb') vbHarm(S, f, n, 'w');
  if (f === 'cat' && keepAt(S)) S.q.unshift({ do: 'hosp', c, n });
  return n;
}
function removeBT(S, c, f, p, byF) {
  const Cc = C(S, c);
  if (p === 'wood') { need(Cc.wood > 0, '나무가 없어요'); Cc.wood--; S.cat.wood++; }
  else if (p === 'keep') { need(Cc.keep, '성채가 없어요'); Cc.keep = false; }
  else if (p === 'symp') { need(Cc.symp, '공감 토큰이 없어요'); Cc.symp = false; S.wa.sympTrack++; if (byF && byF !== 'wa' && present(S, byF)) S.q.unshift({ do: 'outrage', k: keyOf(S, byF), c }); }
  else {
    const i = Cc.sl.findIndex(x => x && x.f === f && x.t === p); need(i >= 0, '건물이 없어요');
    Cc.sl[i] = null;
    if (f === 'cat') S.cat.track[p]++;
    if (f === 'bird') S.bird.roostTrack++;
    if (f === 'wa') { S.wa.bases[suitOf(c)] = 1; S.q.unshift({ do: 'baseLost', s: suitOf(c) }); }
  }
  log(S, `💥 ${NAME[f]} ${PIECE_KO(p)} 제거 (${c}번)${p === 'keep' ? ' — 야전 병원도 끝' : ''}`);
  if (byF && byF !== f && present(S, byF)) {
    score(S, byF, 1, '적 건물·토큰 제거');
    if (S.battle) { if (byF === S.battle.a) S.battle.remA++; else if (byF === S.battle.d) S.battle.remD++; }
    if (byF === 'vb') vbHarm(S, f, 1, 'bt');
  }
}
// 방랑자가 적 기물을 제거 → 적대 · 악명 (9.2.9.III)
function vbHarm(S, f, n, kind) {
  if (!S.vb || !(f in S.vb.rel)) return;
  const infamyOn = !!S.battle && curFac(S) === 'vb';
  let inf = 0;
  if (!hostile(S, f)) {
    if (kind !== 'w') return;   // 건물·토큰만으로는 적대가 되지 않음
    S.vb.rel[f] = 'h'; log(S, `😠 ${NAME[f]}이(가) 방랑자에게 적대적이 되었어요`);
    if (infamyOn) inf = n - 1;  // 적대를 만든 전사 하나는 빼고
  } else if (infamyOn) inf = n;
  if (inf > 0) score(S, 'vb', inf, '악명');
}
TASK.hosp = (S, t) => {   // 야전 병원: 후작이 맞는 카드를 내면 성채로 복귀
  if (!keepAt(S) || !S.fac.cat) return;
  const k = keyOf(S, 'cat'), opts = S.pl[k].hand.filter(id => matches(id, suitOf(t.c)));
  if (opts.length) S.prompt = { to: k, kind: 'hosp', c: t.c, n: t.n, opts };
};
TASK.outrage = (S, t) => {   // 분노: 공감 숲터를 건드리면 동맹에게 카드
  if (!S.wa || !t.k || facOf(S, t.k) === 'wa') return;
  const opts = S.pl[t.k].hand.filter(id => matches(id, suitOf(t.c)));
  if (!opts.length) {
    S.peek = { by: keyOf(S, 'wa'), of: t.k, cards: S.pl[t.k].hand.slice(), why: '분노' };
    log(S, `😤 분노: ${NAME[facOf(S, t.k)]}에게 ${SUIT_KO[suitOf(t.c)]} 카드가 없어 손패를 보여 주고, 동맹이 덱에서 지지자 1장`);
    const id = drawDeck(S); if (id != null) addSupporter(S, id);
    return;
  }
  S.prompt = { to: t.k, kind: 'outrage', c: t.c, opts };
};
function addSupporter(S, id) {
  if (!basesOnMap(S).length && S.wa.sup.length >= 5) { discard(S, id); log(S, '🌿 지지자 더미가 가득 차서(기지 없음 5장) 카드를 버렸어요'); return false; }
  S.wa.sup.push(id); return true;
}
TASK.baseLost = (S, t) => {
  const W = S.wa, before = W.sup.length;
  W.sup = W.sup.filter(id => { if (matches(id, t.s)) { discard(S, id); return false; } return true; });
  const lose = Math.ceil(W.off / 2); W.off -= lose; W.wSup += lose;
  log(S, `🌿 ${SUIT_KO[t.s]} 기지를 잃어 지지자 ${before - W.sup.length}장 · 장교 ${lose}명을 잃었어요`);
  if (!basesOnMap(S).length && W.sup.length > 5) W.sup.splice(5).forEach(id => discard(S, id));
};
function fullRemoval(S, c, byF) {   // 그 숲터의 적 기물을 모두 제거 (방랑자는 아이템 3개 손상)
  for (const f of enemies(S, byF)) {
    if (f === 'vb') { if (vbAt(S) === c) S.q.unshift({ do: 'vbDmg', n: 3 }); continue; }
    if (C(S, c).w[f]) removeWarriors(S, c, f, C(S, c).w[f], byF);
    btList(S, c, f).forEach(p => removeBT(S, c, f, p, byF));
  }
}

// ════════════════════════ 이동 ════════════════════════
const canMove = (S, f, from, to) => adjC(from, to) && C(S, from).w[f] > 0 && (rules(S, f, from) || rules(S, f, to));
function moveFroms(S, f, suit) {
  const out = []; for (let c = 1; c <= 12; c++) { if (suit && suit !== 'bird' && suitOf(c) !== suit) continue; if (ADJ[c].some(to => canMove(S, f, c, to))) out.push(c); } return out;
}
function anyMove(S, f) { return f === 'vb' ? !!vbAt(S) || true : moveFroms(S, f).length > 0; }
function doMove(S, f, from, to, n) {
  need(canMove(S, f, from, to), '이동할 수 없어요 (출발지나 도착지 중 한 곳을 지배해야 해요)');
  need(n >= 1 && n <= C(S, from).w[f], '전사 수가 맞지 않아요');
  C(S, from).w[f] -= n; C(S, to).w[f] += n;
  log(S, `🚶 ${NAME[f]} 전사 ${n}: ${from}번 → ${to}번`);
  if (f !== 'wa' && S.wa && C(S, to).symp) S.q.unshift({ do: 'outrage', k: keyOf(S, f), c: to });
}

// ════════════════════════ 고양이 후작 ════════════════════════
const range12 = () => [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12];
function sawClearings(S) { const o = []; for (let c = 1; c <= 12; c++) C(S, c).sl.forEach(x => { if (x && x.t === 'saw') o.push(c); }); return o; }
function woodReach(S, c) {   // 지을 숲터와, 지배 숲터로 이어진 숲터들 (나무를 가져올 수 있는 곳)
  if (!rules(S, 'cat', c)) return [];
  const seen = [c], q = [c];
  while (q.length) { const x = q.shift(); for (const y of ADJ[x]) if (!seen.includes(y) && rules(S, 'cat', y)) { seen.push(y); q.push(y); } }
  return seen;
}
const woodIn = (S, cs) => cs.reduce((a, c) => a + C(S, c).wood, 0);
const catBuilt = (S, b) => 6 - S.cat.track[b];
function catCanBuild(S, c, b) {
  if (!S.cat.track[b] || !openSlots(C(S, c)) || !rules(S, 'cat', c)) return false;
  return woodIn(S, woodReach(S, c)) >= CAT.cost[catBuilt(S, b)];
}
function catBuild(S, c, b) {
  need(catCanBuild(S, c, b), '거기엔 지을 수 없어요 (지배 · 빈 칸 · 나무 확인)');
  const built = catBuilt(S, b), cost = CAT.cost[built]; let left = cost;
  for (const x of woodReach(S, c)) { while (left && C(S, x).wood) { C(S, x).wood--; S.cat.wood++; left--; } if (!left) break; }
  const Cc = C(S, c); Cc.sl[Cc.sl.indexOf(null)] = { t: b, f: 'cat' }; S.cat.track[b]--;
  log(S, `🏗️ ${BLD_KO[b]} 건설 (${c}번 · 나무 ${cost})`);
  score(S, 'cat', CAT.vp[b][built], BLD_KO[b]);
}
function catRecruitSpots(S) { const o = []; for (let c = 1; c <= 12; c++) C(S, c).sl.forEach(x => { if (x && x.t === 'rec') o.push(c); }); return o; }
function catAct(S) { need(S.turn.acts > 0, '남은 행동이 없어요'); need(!S.turn.march, '행군을 먼저 마쳐 주세요'); S.turn.acts--; S.turn.acted = 1; }
const myWarriorSpots = (S, f) => f === 'vb' ? [] : range12().filter(c => C(S, c).w[f] > 0);

// ════════════════════════ 독수리 왕조 ════════════════════════
const decSuit = id => id === 'viz' ? 'bird' : CARDS[id].s;
function decSkip(S) {   // 끝난 줄은 건너뛰고, 칙령을 다 수행했으면 true
  const dq = S.turn.dq;
  while (dq.col < 4 && dq.done.length >= S.bird.decree[COLS[dq.col]].length) { dq.col++; dq.done = []; }
  return dq.col >= 4;
}
function decRemaining(S) { const dq = S.turn.dq; if (!dq || dq.col >= 4) return []; return S.bird.decree[COLS[dq.col]].map((id, i) => i).filter(i => !dq.done.includes(i)); }
function decTargets(S, col, suit) {
  const okS = c => suit === 'bird' || suitOf(c) === suit, out = [];
  for (let c = 1; c <= 12; c++) {
    if (!okS(c)) continue; const Cc = C(S, c);
    if (col === 'rec') { if (S.bird.wSup > 0 && Cc.sl.some(x => x && x.t === 'roost')) out.push(c); }
    else if (col === 'move') { if (ADJ[c].some(to => canMove(S, 'bird', c, to))) out.push(c); }
    else if (col === 'bat') { if (canAttackIn(S, 'bird', c) && defendersIn(S, 'bird', c).length) out.push(c); }
    else if (S.bird.roostTrack > 0 && openSlots(Cc) && !Cc.sl.some(x => x && x.t === 'roost') && canPlace(S, 'bird', c) && rules(S, 'bird', c)) out.push(c);
  }
  return out;
}
const decCardOk = (S, i) => { const col = COLS[S.turn.dq.col]; return decTargets(S, col, decSuit(S.bird.decree[col][i])).length > 0; };
function newRoostTargets(S) {
  if (!S.bird.roostTrack) return [];
  const cand = range12().filter(c => openSlots(C(S, c)) && canPlace(S, 'bird', c));
  if (!cand.length) return [];
  const wc = c => { const w = C(S, c).w; return w.cat + w.bird + w.wa; };
  const min = Math.min(...cand.map(wc)); return cand.filter(c => wc(c) === min);
}
function placeRoost(S, c) { const Cc = C(S, c); Cc.sl[Cc.sl.indexOf(null)] = { t: 'roost', f: 'bird' }; S.bird.roostTrack--; }
function turmoil(S) {
  const B = S.bird; let birds = 0;
  COLS.forEach(col => B.decree[col].forEach(id => { if (decSuit(id) === 'bird') birds++; }));
  log(S, `🌪️ 독수리 왕조 혼란! 칙령의 새 카드 ${birds}장 → −${birds}점, 칙령 폐기, 지도자 교체`);
  const p = S.pl[keyOf(S, 'bird')]; if (p.dom == null) p.vp = Math.max(0, p.vp - birds);
  COLS.forEach(col => { B.decree[col].forEach(id => { if (id !== 'viz') discard(S, id); }); B.decree[col] = []; });
  if (B.leader) B.spent.push(B.leader); B.leader = null;
  let up = Object.keys(BIRD.leaders).filter(l => !B.spent.includes(l));
  if (!up.length) { B.spent = []; up = Object.keys(BIRD.leaders); }
  S.prompt = { to: keyOf(S, 'bird'), kind: 'leader', opts: up };
}

// ════════════════════════ 숲속 동맹 ════════════════════════
const supMatch = (S, s) => S.wa.sup.filter(id => matches(id, s));
function spendSup(S, s, n) {   // 같은 문양 먼저, 새는 나중에
  const W = S.wa, pick = [...W.sup.filter(id => CARDS[id].s === s), ...W.sup.filter(id => CARDS[id].s === 'bird')].slice(0, n);
  need(pick.length === n, `${SUIT_KO[s]} 지지자 ${n}장이 필요해요`);
  pick.forEach(id => { W.sup.splice(W.sup.indexOf(id), 1); discard(S, id); });
}
const martial = (S, c) => ['cat', 'bird'].some(f => present(S, f) && C(S, c).w[f] >= 3);   // 계엄령
function revoltSpots(S) {
  return range12().filter(c => {
    const Cc = C(S, c), s = suitOf(c);
    if (!Cc.symp || Cc.sl.some(x => x && x.t === 'base') || !S.wa.bases[s] || supMatch(S, s).length < 2) return false;
    return Cc.sl.some(x => x === null || (x.f && x.f !== 'wa'));   // 적 건물을 치우면 칸이 생기는지
  });
}
function spreadSpots(S) {
  if (!S.wa.sympTrack) return [];
  const n = sympCount(S), first = n === 0;
  return range12().filter(c => {
    const Cc = C(S, c); if (Cc.symp || !canPlace(S, 'wa', c)) return false;
    if (!first && !ADJ[c].some(x => C(S, x).symp)) return false;
    return supMatch(S, suitOf(c)).length >= WA.cost[n] + (martial(S, c) ? 1 : 0);
  });
}
function placeSymp(S, c, why) { const n = sympCount(S); C(S, c).symp = true; S.wa.sympTrack--; score(S, 'wa', WA.vp[n], why || '공감'); }
const trainCards = S => hand(S, keyOf(S, 'wa')).filter(id => basesOnMap(S).some(c => matches(id, suitOf(c))));
function waOp(S) { need(S.turn.ops > 0, '남은 군사 작전이 없어요'); S.turn.ops--; }
TASK.revoltPlace = (S, t) => {
  const c = t.c, Cc = C(S, c), s = suitOf(c), i = Cc.sl.indexOf(null);
  if (i < 0) { log(S, '빈 칸이 없어 기지를 놓지 못했어요'); return; }
  Cc.sl[i] = { t: 'base', f: 'wa' }; S.wa.bases[s] = 0;
  let n = 0; for (let x = 1; x <= 12; x++) if (C(S, x).symp && suitOf(x) === s) n++;
  const put = Math.min(n, S.wa.wSup); Cc.w.wa += put; S.wa.wSup -= put;
  let off = 0; if (S.wa.wSup > 0) { S.wa.wSup--; S.wa.off++; off = 1; }
  log(S, `🌿 ${SUIT_KO[s]} 기지 + 전사 ${put}${off ? ' + 장교 1' : ''}`);
};

// ════════════════════════ 방랑자 ════════════════════════
const hostileIn = (S, c) => FACS.some(f => f !== 'vb' && present(S, f) && hostile(S, f) && C(S, c).w[f] > 0);
function vbMoveDests(S) {
  const loc = S.vb.loc, cand = loc[0] === 'c' ? ADJ[+loc.slice(1)] : FORESTS[+loc.slice(1)], boots = vbUp(S, 'boot');
  return cand.filter(c => boots >= 1 + (hostileIn(S, c) ? 1 : 0));
}
function slipDests(S) {
  const loc = S.vb.loc;
  if (loc[0] === 'c') { const c = +loc.slice(1); return [...ADJ[c].map(x => 'c' + x), ...FORESTS.map((f, i) => f.includes(c) ? 'f' + i : null).filter(Boolean)]; }
  const i = +loc.slice(1); return [...FORESTS[i].map(x => 'c' + x), ...FADJ[i].map(j => 'f' + j)];
}
const alliedHere = (S, c) => S.vb ? Object.keys(S.vb.rel).filter(f => allied(S, f) && C(S, c).w[f] > 0) : [];
const vbUpAny = S => S.vb.it.some(x => x.up && !x.dmg);
function vbRel(S, f) {   // 원조로 관계 개선 (같은 턴에 정해진 횟수만큼)
  const r = S.vb.rel[f];
  if (r === 'h' || r === undefined) return;
  if (r === 3) { score(S, 'vb', 2, `동맹 ${NAME[f]} 원조`); return; }
  S.turn.aid[f] = (S.turn.aid[f] || 0) + 1;
  if (S.turn.aid[f] >= VB.relCost[r]) {
    S.turn.aid[f] = 0; S.vb.rel[f] = r + 1; score(S, 'vb', VB.relVP[r], `${NAME[f]}와 관계 개선`);
    if (r + 1 === 3) log(S, `🤝 ${NAME[f]}와 동맹! 이제 함께 이동하고 싸울 수 있어요`);
  }
}
function questOk(S, q) {
  const Q = QUESTS[q], c = vbAt(S); if (!c || suitOf(c) !== Q.s) return false;
  const req = {}; Q.it.forEach(t => { req[t] = (req[t] || 0) + 1; });
  return Object.keys(req).every(t => vbUp(S, t) >= req[t]);
}
function capCandidates(S) {   // 가방 칸을 차지하는 아이템 (트랙에 오른 차·동전·가방 제외)
  const out = [], onTrack = { tea: 0, coins: 0, bag: 0 };
  S.vb.it.forEach((x, i) => { if (TRACK.includes(x.t) && x.up && !x.dmg && onTrack[x.t] < 3) { onTrack[x.t]++; return; } out.push(i); });
  return out;
}

// ════════════════════════ 제작 ════════════════════════
function craftPieces(S, k) {   // 이번 턴에 남은 제작 조각 (문양별)
  const f = facOf(S, k), out = { fox: 0, rabbit: 0, mouse: 0 };
  if (f === 'vb') return out;
  for (let c = 1; c <= 12; c++) {
    const Cc = C(S, c), s = suitOf(c);
    if (f === 'cat') out[s] += Cc.sl.filter(x => x && x.t === 'shop').length;
    if (f === 'bird') out[s] += Cc.sl.filter(x => x && x.t === 'roost').length;
    if (f === 'wa' && Cc.symp) out[s]++;
  }
  const used = (S.turn && S.turn.craft) || {};
  SUITS.forEach(s => { out[s] = Math.max(0, out[s] - (used[s] || 0)); });
  return out;
}
function canPay(cost, av) {
  const left = Object.assign({}, av); let any = 0;
  for (const s of cost) { if (s === 'any') { any++; continue; } if (!left[s]) return false; left[s]--; }
  return SUITS.reduce((a, s) => a + left[s], 0) >= any;
}
function craftable(S, k, id) {
  const cd = CARDS[id], f = facOf(S, k), p = S.pl[k];
  if (!['per', 'fav', 'item'].includes(cd.k)) return false;
  if (cd.k === 'per' && p.crafted.some(x => CARDS[x].e === cd.e)) return false;   // 같은 지속 효과는 하나만
  if (cd.k === 'item' && !S.supply[cd.it]) return false;                         // 보급처에 아이템이 있어야
  if (f === 'vb') { const c = vbAt(S); if (!c) return false; if (!cd.cost.every(s => s === 'any' || s === suitOf(c))) return false; return vbUp(S, 'hammer') >= cd.cost.length; }
  return canPay(cd.cost, craftPieces(S, k));
}
const craftCards = (S, k) => hand(S, k).filter(id => craftable(S, k, id));
function doCraft(S, k, id) {
  need(craftable(S, k, id), '지금은 그 카드를 만들 수 없어요');
  const cd = CARDS[id], f = facOf(S, k), p = S.pl[k];
  takeFromHand(S, k, id);
  if (f === 'vb') vbExhaust(S, 'hammer', cd.cost.length);
  else {
    const av = craftPieces(S, k), anyN = cd.cost.filter(s => s === 'any').length;
    cd.cost.forEach(s => { if (s !== 'any') { S.turn.craft[s]++; av[s]--; } });
    for (let i = 0; i < anyN; i++) { const s = SUITS.filter(x => av[x] > 0).sort((a, b) => av[b] - av[a])[0]; S.turn.craft[s]++; av[s]--; }
  }
  log(S, `🛠️ ${NAME[f]} 제작: ${cd.n}`);
  if (cd.k === 'per') { p.crafted.push(id); return; }
  if (cd.k === 'fav') { discard(S, id); for (let c = 1; c <= 12; c++) if (suitOf(c) === cd.s) fullRemoval(S, c, f); return; }
  S.supply[cd.it]--; discard(S, id);
  if (f === 'vb') vbGain(S, cd.it); else p.items.push(cd.it);
  score(S, f, f === 'bird' && S.bird.leader !== 'builder' ? 1 : cd.vp, `${ITEM_KO[cd.it]} 제작${f === 'bird' && S.bird.leader !== 'builder' ? ' (거래 경멸: 1점)' : ''}`);
}

// ════════════════════════ 지배 카드 ════════════════════════
const domInHand = (S, k) => hand(S, k).filter(id => CARDS[id].k === 'dom');
function coalPartners(S) {
  const vk = keyOf(S, 'vb'), others = S.seat.filter(k => k !== vk && !S.pl[k].coal && S.pl[k].dom == null);
  if (!others.length) return []; const min = Math.min(...others.map(k => S.pl[k].vp));
  return others.filter(k => S.pl[k].vp === min);
}
function canActivateDom(S, k) {
  const p = S.pl[k]; if (p.dom != null || p.coal || !domInHand(S, k).length) return false;
  if (p.fac === 'vb') return S.seat.length >= 4 && coalPartners(S).length > 0;
  return p.vp >= 10;
}
const domPay = (S, k, domId) => { const s = CARDS[domId].s; return hand(S, k).filter(id => s === 'bird' ? CARDS[id].s === 'bird' : matches(id, s)); };

// ════════════════════════ 고를 수 있는 값 (화면 · 봇 · 검증 공용) ════════════════════════
const sel = (k, opts, lab) => opts && opts.length ? { k, opts, lab } : { none: true, lab };
const multi = (k, opts, min, max, lab) => ({ k, opts, multi: true, min, max, lab });
const ok = () => ({ done: true });
function moveParams(S, f, a, suit) {
  if (a.from == null) return sel('from', moveFroms(S, f, suit), '출발할 숲터');
  if (a.to == null) return sel('to', ADJ[a.from].filter(to => canMove(S, f, a.from, to)), '도착할 숲터');
  if (a.n == null) return { k: 'n', min: 1, max: C(S, a.from).w[f], lab: '움직일 전사 수' };
  return ok();
}
function battleParams(S, k, a, suit) {
  const f = facOf(S, k);
  if (f === 'vb') { const c = vbAt(S); return a.def == null ? sel('def', c ? defendersIn(S, 'vb', c) : [], '공격할 상대') : ok(); }
  if (a.c == null) return sel('c', battleSpots(S, f, suit), '전투할 숲터');
  if (a.def == null) return sel('def', defendersIn(S, f, a.c), '공격할 상대');
  return ok();
}
function promptParams(S, k, a) {
  const P = S.prompt, kind = P.kind === 'setup' ? P.st : P.kind;
  switch (kind) {
    case 'catKeep': return a.c == null ? sel('c', CORNERS, '성채를 놓을 모서리') : ok();
    case 'catBld': { const kc = keepAt(S); if (a.b == null) return sel('b', S.setup.left, '놓을 건물'); return a.c == null ? sel('c', [kc, ...ADJ[kc]].filter(c => openSlots(C(S, c))), '놓을 숲터 (성채나 그 옆)') : ok(); }
    case 'birdCorner': return a.c == null ? sel('c', CORNERS.filter(c => !C(S, c).keep && openSlots(C(S, c)) && canPlace(S, 'bird', c)), '시작 모서리') : ok();
    case 'birdLeader': case 'leader': return a.l == null ? sel('l', P.opts || Object.keys(BIRD.leaders), '지도자') : ok();
    case 'vbChar': return a.ch == null ? sel('ch', Object.keys(VB.chars), '캐릭터') : ok();
    case 'vbForest': return a.f == null ? sel('f', FORESTS.map((x, i) => i), '시작할 숲') : ok();
    case 'amb': case 'foil': case 'hosp':
      return a.card == null ? sel('card', [-1, ...P.opts], P.kind === 'hosp' ? `야전 병원 — 전사 ${P.n}명을 성채로 (카드 1장)` : P.kind === 'amb' ? '매복 카드를 쓸까요?' : '매복을 맞받아칠까요?') : ok();
    case 'outrage': return a.card == null ? sel('card', P.opts, '분노 — 동맹에게 줄 카드') : ok();
    case 'fx': return a.fx == null ? multi('fx', P.opts, 0, P.opts.length, '쓸 전투 효과') : ok();
    case 'hits': return a.idx == null ? multi('idx', P.opts.map((x, i) => i), P.n, P.n, `잃을 건물·토큰 ${P.n}개`) : ok();
    case 'vbhits': {
      const und = S.vb.it.map((x, i) => i).filter(i => !S.vb.it[i].dmg), aw = P.ally ? C(S, S.battle.c).w[P.ally] : 0;
      return a.idx == null ? multi('idx', [...und, ...Array.from({ length: aw }, (x, j) => 'a' + j)], P.n, P.n, `피해 ${P.n} — 손상할 아이템${aw ? ' / 대신 쓰러질 동맹 전사' : ''}`) : ok();
    }
    case 'vbdmg': return a.idx == null ? multi('idx', S.vb.it.map((x, i) => i).filter(i => !S.vb.it[i].dmg), P.n, P.n, `손상할 아이템 ${P.n}개`) : ok();
  }
  return ok();
}
const PARAMS = {
  pass: () => ok(),
  bbb: (S, k, a) => a.to == null ? sel('to', enemyKeys(S, k), '같이 1장씩 뽑을 상대') : ok(),
  royal: () => ok(),
  stand: (S, k, a) => a.to == null ? sel('to', standTargets(S, k), '카드를 빼앗을 상대') : ok(),
  code: (S, k, a) => a.to == null ? sel('to', otherKeys(S, k), '손패를 볼 상대') : ok(),
  tax: (S, k, a) => a.c == null ? sel('c', myWarriorSpots(S, facOf(S, k)), '전사를 뺄 숲터') : ok(),
  craft: (S, k, a) => a.card == null ? sel('card', craftCards(S, k), '제작할 카드') : ok(),
  domAct: (S, k, a) => {
    if (a.card == null) return sel('card', domInHand(S, k), '켤 지배 카드');
    if (facOf(S, k) === 'vb' && a.to == null) return sel('to', coalPartners(S), '연합할 플레이어 (점수가 가장 낮은)');
    return ok();
  },
  domTake: (S, k, a) => {
    if (a.card == null) return sel('card', S.domAvail.filter(id => domPay(S, k, id).length), '가져올 지배 카드');
    if (a.pay == null) return sel('pay', domPay(S, k, a.card), '대신 낼 카드');
    return ok();
  },
  warren: (S, k, a) => battleParams(S, k, a, null),
  cobbler: (S, k, a) => facOf(S, k) === 'vb' ? (a.to == null ? sel('to', (vbAt(S) ? ADJ[vbAt(S)] : FORESTS[+S.vb.loc.slice(1)]).filter(c => !hostileIn(S, c) || vbUp(S, 'boot') > 0), '이동할 숲터') : ok()) : moveParams(S, facOf(S, k), a, null),
  discard: (S, k, a) => { const n = hand(S, k).length - 5; return a.cards == null ? multi('cards', hand(S, k).slice(), n, n, `손패 5장만 남기고 ${n}장 버리기`) : ok(); },
  // ── 고양이 ──
  cat_wood: (S, k, a) => a.c == null ? sel('c', [...new Set(S.turn.woodLeft || [])], '나무를 놓을 제재소 (나무가 모자람)') : ok(),
  cat_battle: (S, k, a) => battleParams(S, k, a, null),
  cat_march: (S, k, a) => moveParams(S, 'cat', a, null),
  cat_move2: (S, k, a) => moveParams(S, 'cat', a, null),
  cat_endmarch: () => ok(),
  cat_recruit: () => ok(),
  cat_build: (S, k, a) => {
    if (a.c == null) return sel('c', range12().filter(c => ['saw', 'shop', 'rec'].some(b => catCanBuild(S, c, b))), '지을 숲터');
    if (a.b == null) return sel('b', ['saw', 'shop', 'rec'].filter(b => catCanBuild(S, a.c, b)), '지을 건물');
    return ok();
  },
  cat_over: (S, k, a) => {
    if (a.c == null) return sel('c', S.cat.wood ? [...new Set(sawClearings(S))].filter(c => hand(S, k).some(id => matches(id, suitOf(c)))) : [], '나무를 놓을 제재소');
    if (a.card == null) return sel('card', hand(S, k).filter(id => matches(id, suitOf(a.c))), '낼 카드 (숲터 문양)');
    return ok();
  },
  cat_bird: (S, k, a) => a.card == null ? sel('card', hand(S, k).filter(id => CARDS[id].s === 'bird'), '낼 새 카드') : ok(),
  // ── 독수리 ──
  decree: (S, k, a) => {
    const h = hand(S, k);
    if (a.c1 == null) return sel('c1', h.slice(), '칙령에 넣을 카드');
    if (a.col1 == null) return sel('col1', COLS, '넣을 줄');
    if (a.c2 === undefined) { const rest = h.filter(id => id !== a.c1 && !(CARDS[a.c1].s === 'bird' && CARDS[id].s === 'bird')); return rest.length ? sel('c2', [-1, ...rest], '한 장 더 넣을까요? (새 카드는 한 장만)') : ok(); }
    if (a.c2 !== -1 && a.col2 == null) return sel('col2', COLS, '넣을 줄');
    return ok();
  },
  newroost: (S, k, a) => a.c == null ? sel('c', newRoostTargets(S), '새 둥지를 놓을 숲터 (전사가 가장 적은 곳)') : ok(),
  bird_do: (S, k, a) => {
    if (a.i == null) return sel('i', decRemaining(S).filter(i => decCardOk(S, i)), '수행할 칙령 카드');
    const col = COLS[S.turn.dq.col], suit = decSuit(S.bird.decree[col][a.i]);
    if (col === 'rec' || col === 'build') return a.c == null ? sel('c', decTargets(S, col, suit), col === 'rec' ? '징집할 둥지' : '둥지를 지을 숲터') : ok();
    if (col === 'move') return moveParams(S, 'bird', a, suit);
    return battleParams(S, k, a, suit);
  },
  turmoil: () => ok(),
  // ── 동맹 ──
  revolt: (S, k, a) => a.c == null ? sel('c', S.turn.spread ? [] : revoltSpots(S), '봉기할 공감 숲터') : ok(),
  spread: (S, k, a) => a.c == null ? sel('c', spreadSpots(S), '공감을 퍼뜨릴 숲터') : ok(),
  mobilize: (S, k, a) => a.card == null ? sel('card', hand(S, k).slice(), '지지자로 보낼 카드') : ok(),
  train: (S, k, a) => a.card == null ? sel('card', S.wa.wSup ? trainCards(S) : [], '훈련에 낼 카드 (기지 숲터 문양)') : ok(),
  wa_move: (S, k, a) => moveParams(S, 'wa', a, null),
  wa_battle: (S, k, a) => battleParams(S, k, a, null),
  wa_recruit: (S, k, a) => a.c == null ? sel('c', S.wa.wSup ? basesOnMap(S) : [], '징집할 기지') : ok(),
  organize: (S, k, a) => a.c == null ? sel('c', S.wa.sympTrack ? range12().filter(c => C(S, c).w.wa > 0 && !C(S, c).symp && canPlace(S, 'wa', c)) : [], '조직할 숲터') : ok(),
  // ── 방랑자 ──
  vbrefresh: (S, k, a) => a.items == null ? multi('items', S.vb.it.map((x, i) => i).filter(i => !S.vb.it[i].up), S.turn.refreshN, S.turn.refreshN, `다시 세울 아이템 ${S.turn.refreshN}개`) : ok(),
  slip: (S, k, a) => a.to == null ? sel('to', slipDests(S), '살금살금 갈 곳 (장화 없이)') : ok(),
  vb_move: (S, k, a) => {
    if (a.to == null) return sel('to', vbMoveDests(S), '이동할 숲터');
    const from = vbAt(S);
    if (a.ally === undefined) { const al = from ? alliedHere(S, from).filter(f => rules(S, f, from) || rules(S, f, a.to)) : []; return al.length ? sel('ally', ['none', ...al], '함께 갈 동맹 전사') : ok(); }
    if (a.ally !== 'none' && a.n == null) return { k: 'n', min: 1, max: C(S, from).w[a.ally], lab: '함께 갈 전사 수' };
    return ok();
  },
  vb_battle: (S, k, a) => {
    const c = vbAt(S);
    if (a.def == null) return sel('def', c && vbUp(S, 'sword') ? defendersIn(S, 'vb', c) : [], '공격할 상대');
    if (a.ally === undefined) { const al = alliedHere(S, c).filter(f => f !== a.def); return al.length ? sel('ally', ['none', ...al], '함께 싸울 동맹') : ok(); }
    return ok();
  },
  explore: () => ok(),
  aid: (S, k, a) => {
    const c = vbAt(S);
    if (a.to == null) return sel('to', c && vbUpAny(S) && hand(S, k).some(id => matches(id, suitOf(c))) ? enemies(S, 'vb').filter(f => hasPieces(S, c, f)) : [], '원조할 진영');
    if (a.card == null) return sel('card', hand(S, k).filter(id => matches(id, suitOf(c))), '건넬 카드 (숲터 문양)');
    if (a.ex == null) return sel('ex', [...new Set(S.vb.it.filter(x => x.up && !x.dmg).map(x => x.t))], '소모할 아이템');
    if (a.take == null) { const its = [...new Set(S.pl[keyOf(S, a.to)].items)]; return its.length ? sel('take', ['none', ...its], '가져올 아이템') : ok(); }
    return ok();
  },
  quest: (S, k, a) => {
    if (a.q == null) return sel('q', S.vb.q.filter(q => questOk(S, q)), '완수할 퀘스트');
    if (a.r == null) return sel('r', ['vp', 'draw'], '보상 (점수 또는 2장)');
    return ok();
  },
  strike: (S, k, a) => {
    const c = vbAt(S);
    if (a.to == null) return sel('to', c && vbUp(S, 'crossbow') ? enemies(S, 'vb').filter(f => hasPieces(S, c, f)) : [], '저격할 진영');
    if (C(S, c).w[a.to] > 0) return ok();
    if (a.p == null) return sel('p', [...new Set(btList(S, c, a.to))], '제거할 건물·토큰');
    return ok();
  },
  repair: (S, k, a) => a.item == null ? sel('item', vbUp(S, 'hammer') ? S.vb.it.map((x, i) => i).filter(i => S.vb.it[i].dmg) : [], '수리할 아이템') : ok(),
  special: (S, k, a) => {
    const c = vbAt(S), ch = S.vb.ch;
    if (!vbUp(S, 'torch')) return { none: true };
    if (ch === 'thief') return a.to == null ? sel('to', c ? enemies(S, 'vb').filter(f => hasPieces(S, c, f) && hand(S, keyOf(S, f)).length) : [], '훔칠 상대') : ok();
    if (ch === 'tinker') return a.card == null ? sel('card', c ? S.disc.filter(id => matches(id, suitOf(c))) : [], '버림 더미에서 가져올 카드') : ok();
    if (ch === 'ranger') return a.items == null ? multi('items', S.vb.it.map((x, i) => i).filter(i => S.vb.it[i].dmg), 0, 3, '수리할 아이템 (최대 3개, 그다음 낮 끝)') : ok();
    return { none: true };
  },
  vbcap: (S, k, a) => { const n = vbLoad(S) - vbLimit(S); return a.items == null ? multi('items', capCandidates(S), n, n, `가방 칸이 넘쳐 버릴 아이템 ${n}개`) : ok(); },
  ans: (S, k, a) => promptParams(S, k, a),
};
const AVAIL = {
  explore: S => { const c = vbAt(S); return !!c && vbUp(S, 'torch') > 0 && C(S, c).sl.some(x => x && x.t === 'ruin'); },
  cat_recruit: S => S.turn.acts > 0 && !S.turn.recUsed && !S.turn.march && catRecruitSpots(S).length > 0 && S.cat.wSup > 0,
  turmoil: S => S.turn.st === 'bird_dec' && decRemaining(S).some(i => !decCardOk(S, i)),
};
function available(S, k, t) {
  if (!actionList(S, k).includes(t)) return false;
  if (AVAIL[t] && !AVAIL[t](S, k)) return false;
  try { return !PARAMS[t](S, k, { t }).none; } catch (e) { return false; }
}

// ════════════════════════ 할 수 있는 행동 목록 ════════════════════════
function actionList(S, k) {
  if (S.win) return [];
  if (S.prompt) return S.prompt.to === k ? ['ans'] : [];
  if (S.setup || k !== cur(S)) return [];
  const st = S.turn.st, f = curFac(S), T = S.turn, L = [];
  const dayExtras = () => {
    if (crafted(S, k, 'code') && !T.used.code) L.push('code');
    if (crafted(S, k, 'tax') && !T.used.tax && f !== 'vb') L.push('tax');
    if (canActivateDom(S, k)) L.push('domAct');
    if (S.domAvail.length) L.push('domTake');
  };
  switch (st) {
    case 'b_start': if (crafted(S, k, 'bbb') && !T.used.bbb) L.push('bbb'); if (crafted(S, k, 'royal')) L.push('royal'); if (crafted(S, k, 'stand') && !T.used.stand) L.push('stand'); L.push('pass'); break;
    case 'cat_wood': L.push('cat_wood'); break;
    case 'd_start': L.push('warren', 'pass'); break;
    case 'e_start': L.push('cobbler', 'pass'); break;
    case 'e_disc': L.push('discard'); break;
    case 'cat_day':
      if (T.march) { L.push('cat_move2', 'cat_endmarch'); break; }
      if (!T.acted) L.push('craft');
      if (T.acts > 0) L.push('cat_battle', 'cat_march', 'cat_recruit', 'cat_build', 'cat_over');
      L.push('cat_bird'); dayExtras(); L.push('pass'); break;
    case 'bird_add': L.push('decree'); break;
    case 'bird_roost': L.push('newroost'); break;
    case 'bird_craft': L.push('craft'); dayExtras(); L.push('pass'); break;
    case 'bird_dec': L.push('bird_do', 'turmoil'); dayExtras(); break;
    case 'wa_bird': if (!T.spread) L.push('revolt'); L.push('spread', 'pass'); break;
    case 'wa_day': L.push('craft', 'mobilize', 'train'); dayExtras(); L.push('pass'); break;
    case 'wa_ops': L.push('wa_move', 'wa_battle', 'wa_recruit', 'organize', 'pass'); break;
    case 'vb_refresh': L.push('vbrefresh'); break;
    case 'vb_slip': L.push('slip', 'pass'); break;
    case 'vb_day': L.push('vb_move', 'vb_battle', 'explore', 'aid', 'quest', 'strike', 'repair', 'craft', 'special'); dayExtras(); L.push('pass'); break;
    case 'vb_cap': L.push('vbcap'); break;
  }
  return L;
}
const ACT_KO = {
  pass: '다음 ▶', bbb: '🏦 굴 은행', royal: '👑 왕권 주장', stand: '🗡️ 손 들고 내놔!', code: '🔍 암호 해독', tax: '💰 세금 징수',
  craft: '🛠️ 제작', domAct: '👑 지배 발동', domTake: '👑 지배 카드 가져오기', warren: '⚔️ 지휘 굴: 전투', cobbler: '👞 구두장이: 이동', discard: '🗑️ 손패 버리기',
  cat_wood: '🪵 나무 놓기', cat_battle: '⚔️ 전투', cat_march: '🚶 행군 (2번 이동)', cat_move2: '🚶 두 번째 이동', cat_endmarch: '✋ 행군 끝', cat_recruit: '🐱 모병', cat_build: '🏗️ 건설', cat_over: '🪵 혹사', cat_bird: '🐦 새 카드 → 행동 +1',
  decree: '📜 칙령에 카드 넣기', newroost: '🪺 새 둥지', bird_do: '📜 칙령 수행', turmoil: '🌪️ 혼란에 빠지기',
  revolt: '🔥 봉기', spread: '💚 공감 확산', mobilize: '📣 지지자 모집', train: '🎖️ 훈련', wa_move: '🚶 이동', wa_battle: '⚔️ 전투', wa_recruit: '🌿 징집', organize: '🌿 조직',
  vbrefresh: '🔄 원기 회복', slip: '🌫️ 살금살금', vb_move: '👢 이동', vb_battle: '⚔️ 전투', explore: '🔥 탐험', aid: '🎁 원조', quest: '📜 퀘스트', strike: '🏹 저격', repair: '🔨 수리', special: '✨ 특수 행동', vbcap: '🎒 아이템 정리', ans: '답하기',
};
function passLabel(S) {
  const st = S.turn.st;
  return { b_start: '새벽 계속 ▶', d_start: '건너뛰기 ▶', e_start: '건너뛰기 ▶', cat_day: '저녁으로 ▶', bird_craft: '칙령 수행 ▶', wa_bird: '낮으로 ▶', wa_day: '저녁으로 ▶', wa_ops: '작전 끝 ▶', vb_slip: '낮으로 ▶', vb_day: '저녁으로 ▶' }[st] || '다음 ▶';
}

// ════════════════════════ 행동 실행 ════════════════════════
const EXEC = {
  pass(S) { advance(S); },
  bbb(S, k, a) { S.turn.used.bbb = 1; draw(S, k, 1); draw(S, a.to, 1); log(S, `🏦 더 좋은 굴 은행: ${S.pl[k].nick}와 ${S.pl[a.to].nick}가 1장씩`); },
  royal(S, k) { const f = facOf(S, k); const n = range12().filter(c => rules(S, f, c)).length; useCrafted(S, k, 'royal'); score(S, f, n, `왕권 주장 (${n}곳 지배)`); },
  stand(S, k, a) { S.turn.used.stand = 1; const h = hand(S, a.to), id = h.splice(rint(S, h.length), 1)[0]; hand(S, k).push(id); log(S, `🗡️ 손 들고 내놔! ${S.pl[a.to].nick}의 카드 1장을 가져옴`); score(S, facOf(S, a.to), 1, '손 들고 내놔!'); },
  code(S, k, a) { S.turn.used.code = 1; S.peek = { by: k, of: a.to, cards: hand(S, a.to).slice() }; log(S, `🔍 암호 해독: ${S.pl[k].nick}가 ${S.pl[a.to].nick}의 손패를 봄`); },
  tax(S, k, a) { S.turn.used.tax = 1; removeWarriors(S, a.c, facOf(S, k), 1, null); draw(S, k, 1); log(S, '💰 세금 징수: 전사 1명을 빼고 1장 뽑음'); },
  craft(S, k, a) { if (facOf(S, k) === 'cat') need(!S.turn.acted, '행동을 시작하면 제작할 수 없어요'); doCraft(S, k, a.card); },
  domAct(S, k, a) {
    need(canActivateDom(S, k), '지배 카드를 켤 수 없어요');
    takeFromHand(S, k, a.card); const p = S.pl[k];
    if (p.fac === 'vb') {
      need(coalPartners(S).includes(a.to), '연합할 수 있는 상대가 아니에요');
      p.dom = a.card; p.coal = a.to; const tf = facOf(S, a.to); if (S.vb.rel[tf] === 'h') S.vb.rel[tf] = 0;
      log(S, `🤝 방랑자가 ${S.pl[a.to].nick}(${NAME[tf]})와 연합! 연합 상대가 이기면 방랑자도 승리`); return;
    }
    p.dom = a.card;
    log(S, `👑 ${NAME[p.fac]} ${CARDS[a.card].n} 발동 — 점수 대신, 새벽 시작에 ${CARDS[a.card].s === 'bird' ? '마주 보는 모서리 두 곳' : `${SUIT_KO[CARDS[a.card].s]} 숲터 3곳`}을 지배하면 승리`);
  },
  domTake(S, k, a) { takeFromHand(S, k, a.pay); discard(S, a.pay); S.domAvail.splice(S.domAvail.indexOf(a.card), 1); hand(S, k).push(a.card); log(S, `👑 ${S.pl[k].nick}가 ${CARDS[a.card].n}을(를) 가져감`); },
  warren(S, k, a) { const f = facOf(S, k); startBattle(S, f, a.def, f === 'vb' ? vbAt(S) : a.c, null); S.q.push({ do: 'advance' }); },
  cobbler(S, k, a) { const f = facOf(S, k); if (f === 'vb') { if (hostileIn(S, a.to)) vbExhaust(S, 'boot'); S.vb.loc = 'c' + a.to; log(S, `👞 구두장이: 방랑자 ${a.to}번으로`); } else doMove(S, f, a.from, a.to, a.n); S.q.push({ do: 'advance' }); },
  discard(S, k, a) { a.cards.forEach(id => { takeFromHand(S, k, id); discard(S, id); }); log(S, `🗑️ 손패 ${a.cards.length}장 버림`); advance(S); },
  // ── 고양이 ──
  cat_wood(S, k, a) { const T = S.turn; C(S, a.c).wood++; S.cat.wood--; T.woodLeft.splice(T.woodLeft.indexOf(a.c), 1); if (!S.cat.wood || !T.woodLeft.length) advance(S); },
  cat_battle(S, k, a) { catAct(S); startBattle(S, 'cat', a.def, a.c, null); },
  cat_march(S, k, a) { catAct(S); doMove(S, 'cat', a.from, a.to, a.n); S.turn.march = 1; },
  cat_move2(S, k, a) { need(S.turn.march, '행군 중이 아니에요'); S.turn.march = 0; doMove(S, 'cat', a.from, a.to, a.n); },
  cat_endmarch(S) { S.turn.march = 0; },
  cat_recruit(S) {
    const spots = catRecruitSpots(S); catAct(S);
    let n = 0; for (const c of spots) { if (!S.cat.wSup) break; C(S, c).w.cat++; S.cat.wSup--; n++; }
    S.turn.recUsed = 1; log(S, `🐱 모병: 모병소마다 전사 (${n}명)`);
  },
  cat_build(S, k, a) { catAct(S); catBuild(S, a.c, a.b); },
  cat_over(S, k, a) { catAct(S); takeFromHand(S, k, a.card); discard(S, a.card); C(S, a.c).wood++; S.cat.wood--; log(S, `🪵 혹사: ${a.c}번 제재소에 나무 1개`); },
  cat_bird(S, k, a) { need(!S.turn.march, '행군을 먼저 마쳐 주세요'); takeFromHand(S, k, a.card); discard(S, a.card); S.turn.acts++; log(S, '🐦 새 카드를 내고 행동 +1'); },
  // ── 독수리 ──
  decree(S, k, a) {
    const adds = [[a.c1, a.col1]]; if (a.c2 != null && a.c2 !== -1) adds.push([a.c2, a.col2]);
    adds.forEach(([id, col]) => { takeFromHand(S, k, id); S.bird.decree[col].push(id); });
    log(S, `📜 칙령 추가: ${adds.map(([id, col]) => `${COL_KO[col]}에 ${SUIT_KO[CARDS[id].s]}`).join(', ')}`);
    advance(S);
  },
  newroost(S, k, a) { placeRoost(S, a.c); const n = Math.min(3, S.bird.wSup); C(S, a.c).w.bird += n; S.bird.wSup -= n; log(S, `🪺 새 둥지: ${a.c}번 + 전사 ${n}`); advance(S); },
  bird_do(S, k, a) {
    const dq = S.turn.dq, col = COLS[dq.col];
    dq.done.push(a.i);
    if (col === 'rec') {
      const want = S.bird.leader === 'charis' ? 2 : 1, n = Math.min(want, S.bird.wSup);
      C(S, a.c).w.bird += n; S.bird.wSup -= n; log(S, `📜 징집: ${a.c}번에 전사 ${n}`);
      if (n < want) { log(S, '전사가 모자라 칙령을 다 지키지 못했어요'); turmoil(S); return; }
    } else if (col === 'move') doMove(S, 'bird', a.from, a.to, a.n);
    else if (col === 'bat') startBattle(S, 'bird', a.def, a.c, null);
    else { placeRoost(S, a.c); log(S, `📜 건설: ${a.c}번에 둥지`); }
    S.q.push({ do: 'decNext' });
  },
  turmoil(S) { turmoil(S); },
  // ── 동맹 ──
  revolt(S, k, a) { const s = suitOf(a.c); spendSup(S, s, 2); log(S, `🔥 봉기! ${a.c}번 ${SUIT_KO[s]} 숲터`); fullRemoval(S, a.c, 'wa'); S.q.push({ do: 'revoltPlace', c: a.c }); },
  spread(S, k, a) { const cost = WA.cost[sympCount(S)] + (martial(S, a.c) ? 1 : 0); spendSup(S, suitOf(a.c), cost); log(S, `💚 공감 확산: ${a.c}번 (지지자 ${cost}장)${martial(S, a.c) ? ' · 계엄령' : ''}`); placeSymp(S, a.c); S.turn.spread = 1; },
  mobilize(S, k, a) { takeFromHand(S, k, a.card); addSupporter(S, a.card); log(S, '📣 지지자 모집: 카드 1장'); },
  train(S, k, a) { takeFromHand(S, k, a.card); discard(S, a.card); S.wa.wSup--; S.wa.off++; log(S, `🎖️ 훈련: 장교 ${S.wa.off}명`); },
  wa_move(S, k, a) { waOp(S); doMove(S, 'wa', a.from, a.to, a.n); S.q.push({ do: 'opsNext' }); },
  wa_battle(S, k, a) { waOp(S); startBattle(S, 'wa', a.def, a.c, null); S.q.push({ do: 'opsNext' }); },
  wa_recruit(S, k, a) { waOp(S); C(S, a.c).w.wa++; S.wa.wSup--; log(S, `🌿 징집: ${a.c}번`); S.q.push({ do: 'opsNext' }); },
  organize(S, k, a) { waOp(S); C(S, a.c).w.wa--; S.wa.wSup++; log(S, `🌿 조직: ${a.c}번 전사가 공감 토큰이 됨`); placeSymp(S, a.c, '조직'); S.q.push({ do: 'opsNext' }); },
  // ── 방랑자 ──
  vbrefresh(S, k, a) { a.items.forEach(i => { S.vb.it[i].up = 1; }); log(S, `🔄 원기 회복: 아이템 ${a.items.length}개`); advance(S); },
  slip(S, k, a) { S.vb.loc = a.to; log(S, `🌫️ 살금살금: ${a.to[0] === 'c' ? a.to.slice(1) + '번 숲터' : '숲 ' + (+a.to.slice(1) + 1)}`); advance(S); },
  vb_move(S, k, a) {
    const from = vbAt(S);
    vbExhaust(S, 'boot', 1 + (hostileIn(S, a.to) ? 1 : 0)); S.vb.loc = 'c' + a.to; log(S, `👢 방랑자 이동: ${a.to}번`);
    if (a.ally && a.ally !== 'none') {
      C(S, from).w[a.ally] -= a.n; C(S, a.to).w[a.ally] += a.n; log(S, `🤝 ${NAME[a.ally]} 전사 ${a.n}명이 함께 이동`);
      if (a.ally !== 'wa' && S.wa && C(S, a.to).symp) S.q.unshift({ do: 'outrage', k: keyOf(S, a.ally), c: a.to });
    }
  },
  vb_battle(S, k, a) { vbExhaust(S, 'sword'); startBattle(S, 'vb', a.def, vbAt(S), a.ally && a.ally !== 'none' ? a.ally : null); },
  explore(S) {
    const c = vbAt(S), Cc = C(S, c), i = Cc.sl.findIndex(x => x && x.t === 'ruin');
    vbExhaust(S, 'torch'); const it = Cc.sl[i].it; Cc.sl[i] = null;
    if (it) { vbGain(S, it); score(S, 'vb', 1, `폐허 탐험 — ${ITEM_KO[it]}`); } else log(S, '🔥 폐허를 탐험했지만 빈손');
  },
  aid(S, k, a) {
    vbExhaust(S, a.ex); takeFromHand(S, k, a.card); hand(S, keyOf(S, a.to)).push(a.card);
    log(S, `🎁 원조: ${NAME[a.to]}에게 카드 1장`);
    if (a.take && a.take !== 'none') { const its = S.pl[keyOf(S, a.to)].items; its.splice(its.indexOf(a.take), 1); vbGain(S, a.take); log(S, `🎁 ${ITEM_KO[a.take]}을(를) 받음`); }
    vbRel(S, a.to);
  },
  quest(S, k, a) {
    const Q = QUESTS[a.q]; Q.it.forEach(t => vbExhaust(S, t));
    S.vb.q.splice(S.vb.q.indexOf(a.q), 1); S.vb.done.push(a.q); log(S, `📜 퀘스트 완수: ${Q.n}`);
    if (a.r === 'vp') score(S, 'vb', S.vb.done.filter(q => QUESTS[q].s === Q.s).length, `${SUIT_KO[Q.s]} 퀘스트`);
    else { draw(S, k, 2); log(S, '🃏 퀘스트 보상: 카드 2장'); }
    if (S.vb.qDeck.length) S.vb.q.push(S.vb.qDeck.pop());
  },
  strike(S, k, a) { const c = vbAt(S); vbExhaust(S, 'crossbow'); if (C(S, c).w[a.to] > 0) removeWarriors(S, c, a.to, 1, 'vb'); else removeBT(S, c, a.to, a.p, 'vb'); },
  repair(S, k, a) { vbExhaust(S, 'hammer'); S.vb.it[a.item].dmg = 0; log(S, `🔨 수리: ${ITEM_KO[S.vb.it[a.item].t]}`); },
  special(S, k, a) {
    const ch = S.vb.ch; vbExhaust(S, 'torch');
    if (ch === 'thief') { const h = hand(S, keyOf(S, a.to)), id = h.splice(rint(S, h.length), 1)[0]; hand(S, k).push(id); log(S, `🦝 훔치기: ${NAME[a.to]}의 카드 1장`); }
    if (ch === 'tinker') { S.disc.splice(S.disc.indexOf(a.card), 1); hand(S, k).push(a.card); log(S, `🦝 날품팔이: 버림 더미에서 ${CARDS[a.card].n}`); }
    if (ch === 'ranger') { a.items.forEach(i => { S.vb.it[i].dmg = 0; }); log(S, `🦝 은신처: ${a.items.length}개 수리하고 낮을 끝냄`); S.q.push({ do: 'jump', st: 'e_start' }); }
  },
  vbcap(S, k, a) { a.items.slice().sort((x, y) => y - x).forEach(i => { log(S, `🎒 가방이 넘쳐 ${ITEM_KO[S.vb.it[i].t]}을(를) 버림`); S.vb.it.splice(i, 1); }); advance(S); },
  ans(S, k, a) { answer(S, k, a); },
};
function answer(S, k, a) {
  const P = S.prompt, kind = P.kind;
  if (kind === 'setup') { setupAct(S, k, a); return; }
  S.prompt = null;
  const B = S.battle;
  switch (kind) {
    case 'amb': {
      if (a.card === -1) return;
      takeFromHand(S, k, a.card); discard(S, a.card); log(S, `🪤 ${NAME[B.d]}의 매복!`);
      const ak = keyOf(S, B.a), foil = S.pl[ak].hand.filter(id => CARDS[id].k === 'amb' && matches(id, suitOf(B.c)));
      if (foil.length) { S.prompt = { to: ak, kind: 'foil', opts: foil }; return; }
      ambushHits(S); return;
    }
    case 'foil':
      if (a.card === -1) { ambushHits(S); return; }
      takeFromHand(S, k, a.card); discard(S, a.card); log(S, `🛡️ ${NAME[B.a]}가 매복을 맞받아쳐 무효로!`); return;
    case 'fx':
      (a.fx || []).forEach(e => {
        if (e === 'brutal') { B.extraA++; log(S, '😈 잔혹한 전술: 추가 피해 1'); score(S, B.d, 1, '잔혹한 전술'); }
        if (e === 'sappers') { useCrafted(S, k, 'sappers'); B.extraD++; log(S, '💣 공병대: 추가 피해 1'); }
        if (e === 'armorers') { useCrafted(S, k, 'armorers'); if (P.side === 'a') B.ignA = 1; else B.ignD = 1; log(S, '🛡️ 갑옷 장인: 주사위 피해를 무시'); }
      }); return;
    case 'hits': a.idx.map(i => P.opts[i]).forEach(p => removeBT(S, P.c, facOf(S, k), p, P.by)); return;
    case 'vbhits': {
      const items = a.idx.filter(x => typeof x === 'number'), allyN = a.idx.length - items.length;
      vbDamage(S, items);
      if (allyN) { removeWarriors(S, S.battle.c, P.ally, allyN, P.by); S.battle.allyLoss += allyN; }
      return;
    }
    case 'vbdmg': vbDamage(S, a.idx); return;
    case 'hosp': {
      if (a.card === -1) return;
      takeFromHand(S, k, a.card); discard(S, a.card);
      const kc = keepAt(S), n = Math.min(P.n, S.cat.wSup); C(S, kc).w.cat += n; S.cat.wSup -= n;
      log(S, `🏥 야전 병원: 전사 ${n}명이 성채(${kc}번)로 돌아옴`); return;
    }
    case 'outrage': takeFromHand(S, k, a.card); addSupporter(S, a.card); log(S, `😤 분노: ${NAME[facOf(S, k)]}가 동맹에게 카드 1장`); return;
    case 'leader': setLeader(S, a.l); S.q.unshift({ do: 'jump', st: 'e_start' }); return;
  }
}

// ════════════════════════ 적용 (검증 → 실행 → 처리 이어 가기) ════════════════════════
function apply(S0, k, a) {
  const S = clone(S0);
  need(!S.win, '게임이 끝났어요');
  need(actionList(S, k).includes(a.t), '지금은 할 수 없는 행동이에요');
  if (AVAIL[a.t]) need(AVAIL[a.t](S, k), '지금은 할 수 없어요');
  const part = { t: a.t };
  for (let g = 0; g < 16; g++) {
    const sp = PARAMS[a.t](S, k, part);
    if (sp.done) break;
    need(!sp.none, `${sp.lab || '선택'}: 고를 수 있는 게 없어요`);
    const v = a[sp.k];
    if (sp.multi) need(Array.isArray(v) && v.length >= sp.min && v.length <= sp.max && v.every(x => sp.opts.includes(x)) && new Set(v).size === v.length, `${sp.lab}: 고른 것이 맞지 않아요`);
    else if (sp.k === 'n') need(Number.isInteger(v) && v >= sp.min && v <= sp.max, `${sp.lab}: 수가 맞지 않아요`);
    else need(sp.opts.includes(v), `${sp.lab}: 고를 수 없는 값이에요`);
    part[sp.k] = v;
  }
  EXEC[a.t](S, k, part);
  run(S);
  S.n++;
  return S;
}
// 지금 누가 무엇을 해야 하는지
function whoActs(S) { if (S.win) return null; if (S.prompt) return S.prompt.to; if (S.setup) return null; return cur(S); }

const API = {
  SUITS, SUIT_KO, FACS, NAME, CL, PATHS, RIVER, FORESTS, FADJ, CORNERS, OPP, ADJ, CARDS, ITEM_KO, ITEM_IC, QUESTS, CAT, BIRD, WA, VB,
  BLD_KO, LEADER_KO, LEADER_D, COLS, COL_KO, CHAR_KO, CHAR_D, ACT_KO, PH_KO, STEPS, PIECE_KO,
  newGame, apply, actionList, available, choices: (S, k, a) => PARAMS[a.t](S, k, a), whoActs, passLabel, RuleError,
  ruler, rules, keepAt, vbAt, openSlots, bldCount, basesOnMap, sympCount, vbUp, vbTrack, vbSwords, vbLoad, vbLimit, hostile, allied, crafted,
  craftPieces, craftable, decRemaining, decSuit, hostileIn, vbMoveDests, questOk, canActivateDom, coalPartners, catBuilt, woodReach, newRoostTargets, phaseOf, matches, btList,
  cur, curFac, keyOf, facOf, suitOf, CARDS_BY: id => CARDS[id],
};
G.RootEngine = API;
if (typeof module !== 'undefined' && module.exports) module.exports = API;
})(typeof window !== 'undefined' ? window : globalThis);
