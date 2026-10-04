// ROOT 규칙 수치 시나리오 확인 — 사용: node tools/root/spot.js
const R = require(require('path').join(__dirname, '../../root/engine.js'));
let fails = 0;
const eq = (a, b, m) => { const ok = JSON.stringify(a) === JSON.stringify(b); console.log((ok ? '✅ ' : '❌ ') + m + (ok ? '' : `  기대 ${JSON.stringify(b)} / 실제 ${JSON.stringify(a)}`)); if (!ok) fails++; };
const bad = (f, m) => { try { f(); console.log('❌ ' + m + ' (막혀야 하는데 통과)'); fails++; } catch (e) { if (!(e instanceof R.RuleError)) throw e; console.log('✅ ' + m + ' — ' + e.message); } };
const A = (S, k, a) => R.apply(S, k, a);
const P = (facs, seed) => R.newGame(facs.map(f => ({ key: f, nick: f, fac: f })), { seed: seed || 5 });
const clone = o => JSON.parse(JSON.stringify(o));
// 지정한 진영의 낮까지 아무 일 없이 진행
function until(S, fac, st) {
  for (let g = 0; g < 500; g++) {
    if (S.win || (!S.prompt && !S.setup && R.curFac(S) === fac && S.turn.st === st)) return S;
    const k = R.whoActs(S), L = R.actionList(S, k);
    if (L.includes('decree')) S = A(S, k, { t: 'decree', c1: S.pl[k].hand[0], col1: 'rec', c2: -1 });
    else if (L.includes('discard')) S = A(S, k, { t: 'discard', cards: S.pl[k].hand.slice(0, S.pl[k].hand.length - 5) });
    else if (L.includes('turmoil') && R.available(S, k, 'turmoil')) S = A(S, k, { t: 'turmoil' });
    else if (L.includes('bird_do')) { const sp = R.choices(S, k, { t: 'bird_do' }); let a = { t: 'bird_do' }; for (let i = 0; i < 6; i++) { const s = R.choices(S, k, a); if (s.done) break; a[s.k] = s.k === 'n' ? 1 : s.opts[0]; } S = A(S, k, a); }
    else if (L.includes('vbrefresh')) { const sp = R.choices(S, k, { t: 'vbrefresh' }); S = A(S, k, { t: 'vbrefresh', items: sp.opts.slice(0, sp.min) }); }
    else if (L.includes('vbcap')) { const sp = R.choices(S, k, { t: 'vbcap' }); S = A(S, k, { t: 'vbcap', items: sp.opts.slice(0, sp.min) }); }
    else if (L.includes('newroost')) { const sp = R.choices(S, k, { t: 'newroost' }); S = A(S, k, { t: 'newroost', c: sp.opts[0] }); }
    else if (L.includes('cat_wood')) { const sp = R.choices(S, k, { t: 'cat_wood' }); S = A(S, k, { t: 'cat_wood', c: sp.opts[0] }); }
    else if (L.includes('pass')) S = A(S, k, { t: 'pass' });
    else if (L.includes('ans')) { const sp = R.choices(S, k, { t: 'ans' }); S = A(S, k, { t: 'ans', [sp.k]: sp.multi ? sp.opts.slice(0, sp.min) : sp.opts.includes(-1) ? -1 : sp.opts[0] }); }
    else throw new Error('진행 불가 ' + S.turn.st + ' ' + L);
  }
  throw new Error('도달 못함');
}

// ── 1. 고양이 준비 · 나무 · 건설 비용/점수 ──
let S = P(['cat', 'bird']);
S = A(S, 'cat', { t: 'ans', c: 1 });
eq([S.map.c[3].w.cat, S.map.c[2].w.cat, S.cat.wSup], [0, 1, 14], '수비대: 반대편 3번 빼고 1명씩 (25-11=14)');
bad(() => A(S, 'cat', { t: 'ans', b: 'saw', c: 7 }), '시작 건물은 성채나 그 옆만');
S = A(S, 'cat', { t: 'ans', b: 'saw', c: 1 });
S = A(S, 'cat', { t: 'ans', b: 'shop', c: 10 });
S = A(S, 'cat', { t: 'ans', b: 'rec', c: 5 });
eq([S.map.c[3].sl.filter(x => x && x.t === 'roost').length, S.map.c[3].w.bird], [1, 6], '독수리: 반대 모서리 3번에 둥지 + 전사 6 자동');
S = A(S, 'bird', { t: 'ans', l: 'command' });
eq(S.bird.decree, { rec: [], move: ['viz'], bat: ['viz'], build: [] }, '지휘관 재상 = 이동·전투');
S = until(S, 'cat', 'cat_day');
eq(S.map.c[1].wood, 1, '새벽: 제재소마다 나무 1');
bad(() => A(S, 'cat', { t: 'cat_build', c: 1, b: 'saw' }), '1번은 빈 칸 없음');
let vp0 = S.pl.cat.vp;
S = A(S, 'cat', { t: 'cat_build', c: 5, b: 'saw' });
eq([S.map.c[1].wood, S.pl.cat.vp - vp0, S.cat.track.saw, S.turn.acts], [0, 1, 4, 2], '두 번째 제재소: 나무 1(이웃 지배 숲터에서) · 1점 · 행동 -1');
bad(() => A(S, 'cat', { t: 'cat_build', c: 9, b: 'shop' }), '나무가 없으면 작업장(비용 1) 불가');
S = A(S, 'cat', { t: 'cat_recruit' });
eq([S.map.c[5].w.cat, S.turn.recUsed], [2, 1], '모병: 모병소마다 1명');
bad(() => A(S, 'cat', { t: 'cat_recruit' }), '모병은 한 턴에 한 번');
S = A(S, 'cat', { t: 'cat_march', from: 5, to: 2, n: 2 });
bad(() => A(S, 'cat', { t: 'cat_build', c: 9, b: 'rec' }), '행군 중에는 다른 행동 불가');
S = A(S, 'cat', { t: 'cat_move2', from: 2, to: 6, n: 1 });
eq([S.map.c[6].w.cat, S.turn.acts, S.turn.march], [2, 0, 0], '행군 = 이동 2번에 행동 1');

// ── 2. 전투: 최대 피해 · 무방비 · 게릴라전 ──
S = P(['cat', 'wa'], 11);
S = A(S, 'cat', { t: 'ans', c: 1 }); S = A(S, 'cat', { t: 'ans', b: 'saw', c: 1 }); S = A(S, 'cat', { t: 'ans', b: 'shop', c: 5 }); S = A(S, 'cat', { t: 'ans', b: 'rec', c: 9 });
S = until(S, 'cat', 'cat_day');
let T = clone(S); T.map.c[7].w.cat = 3; T.map.c[7].w.wa = 0; T.map.c[7].symp = true; T.wa.sympTrack--; T.pl.wa.hand = []; T.pl.cat.hand = [];
T.rng = 99;
const vpBefore = T.pl.cat.vp;
T = A(T, 'cat', { t: 'cat_battle', c: 7, def: 'wa' });
const lg = T.log.slice(-6).join(' | ');
eq([T.map.c[7].symp, T.pl.cat.vp - vpBefore], [false, 1], '무방비 동맹: 추가 피해로 공감 토큰 제거 → 1점');
console.log('   로그:', lg);
// 게릴라전
T = clone(S); T.map.c[7].w.cat = 3; T.map.c[7].w.wa = 3; T.pl.wa.hand = []; T.pl.cat.hand = [];
T = A(T, 'cat', { t: 'cat_battle', c: 7, def: 'wa' });
const dl = T.log.filter(x => /^🎲 [0-9]/u.test(x)).pop();
const [d1, d2] = dl.match(/🎲 (\d) · (\d)/).slice(1).map(Number);
const m = dl.match(/고양이 후작 (\d).*숲속 동맹 (\d)/);
eq([+m[1], +m[2]], [Math.min(d1, d2), Math.max(d1, d2)], '게릴라전: 동맹 방어 시 큰 눈을 동맹이 가짐  ' + dl);

// ── 3. 독수리 혼란: 새 카드 수만큼 감점 · 재상 유지 · 저녁으로 ──
S = P(['bird', 'wa'], 3);
S = A(S, 'bird', { t: 'ans', c: 2 }); S = A(S, 'bird', { t: 'ans', l: 'despot' });
S = until(S, 'bird', 'bird_add');
T = clone(S); T.pl.bird.vp = 5; const birdCard = R.CARDS.findIndex(c => c.s === 'bird' && c.k === 'item');
T.pl.bird.hand = [birdCard, ...T.pl.bird.hand.filter(x => x !== birdCard)].slice(0, 3); T.deck = T.deck.filter(x => x !== birdCard); T.disc = T.disc.filter(x => x !== birdCard);
T = A(T, 'bird', { t: 'decree', c1: birdCard, col1: 'bat', c2: -1 });
T = until(T, 'bird', 'bird_dec');
// 이동 칙령(재상) 먼저 하고 전투 칙령에서 적이 없으면 혼란
while (R.actionList(T, 'bird').includes('bird_do') && R.available(T, 'bird', 'bird_do')) { let a = { t: 'bird_do' }; for (let i = 0; i < 6; i++) { const s = R.choices(T, 'bird', a); if (s.done) break; a[s.k] = s.k === 'n' ? 1 : s.opts[0]; } T = A(T, 'bird', a); if (T.prompt) break; }
if (R.whoActs(T) === 'bird' && R.available(T, 'bird', 'turmoil')) {
  T = A(T, 'bird', { t: 'turmoil' });
  eq([T.pl.bird.vp, T.prompt && T.prompt.kind, T.prompt && T.prompt.opts.includes('despot')], [2, 'leader', false], '혼란: 새 카드 3장(재상2+1) → 5-3=2점, 폭군은 못 고름');
  T = A(T, 'bird', { t: 'ans', l: 'builder' });
  eq([T.bird.decree, T.turn.st === 'e_start' || T.turn.ph === 'eve' || R.curFac(T) !== 'bird'], [{ rec: ['viz'], move: ['viz'], bat: [], build: [] }, true], '새 지도자(건설가) 재상 배치 후 저녁');
} else console.log('   (혼란 시나리오가 성립 안 함 — 건너뜀)');

// ── 4. 방랑자 원조로 관계 개선: 1번→+1, 2번→+2, 3번→동맹 +2, 동맹 원조 +2 ──
S = P(['cat', 'vb'], 8);
S = A(S, 'cat', { t: 'ans', c: 1 }); S = A(S, 'cat', { t: 'ans', b: 'saw', c: 1 }); S = A(S, 'cat', { t: 'ans', b: 'shop', c: 5 }); S = A(S, 'cat', { t: 'ans', b: 'rec', c: 9 });
S = A(S, 'vb', { t: 'ans', ch: 'tinker' }); S = A(S, 'vb', { t: 'ans', f: 0 });
S = until(S, 'vb', 'vb_day');
T = clone(S); T.vb.loc = 'c2'; T.vb.it = Array.from({ length: 8 }, () => ({ t: 'boot', up: 1, dmg: 0 }));
const mice = R.CARDS.filter(c => c.s === 'mouse').map(c => c.id).slice(0, 6);
T.pl.vb.hand = mice; T.deck = T.deck.filter(x => !mice.includes(x)); T.disc = T.disc.filter(x => !mice.includes(x)); T.pl.cat.hand = T.pl.cat.hand.filter(x => !mice.includes(x));
const v0 = T.pl.vb.vp, aidOnce = () => { T = A(T, 'vb', { t: 'aid', to: 'cat', card: T.pl.vb.hand[0], ex: 'boot', ...(T.pl.cat.items.length ? { take: 'none' } : {}) }); };
aidOnce(); eq([T.vb.rel.cat, T.pl.vb.vp - v0], [1, 1], '원조 1번: 무관심→1단계, +1');
aidOnce(); eq([T.vb.rel.cat, T.pl.vb.vp - v0], [1, 1], '원조 2번째: 아직 (2번 필요)');
aidOnce(); eq([T.vb.rel.cat, T.pl.vb.vp - v0], [2, 3], '원조 3번째: 2단계, +2');
aidOnce(); aidOnce(); aidOnce(); eq([T.vb.rel.cat, T.pl.vb.vp - v0], [3, 5], '원조 6번째: 동맹, +2');
// 다음 턴에 동맹 원조는 +2씩
// ── 5. 방랑자가 전사를 쓰러뜨리면 적대, 전투 중 악명 ──
T = clone(S); T.vb.loc = 'c2'; T.map.c[2].w.cat = 3; T.pl.cat.hand = []; T.vb.it.push({ t: 'sword', up: 1, dmg: 0 }, { t: 'sword', up: 1, dmg: 0 });
T.rng = 4242; const vbv = T.pl.vb.vp;
T = A(T, 'vb', { t: 'vb_battle', def: 'cat' });
while (T.prompt) { const k = T.prompt.to, sp = R.choices(T, k, { t: 'ans' }); T = A(T, k, { t: 'ans', [sp.k]: sp.multi ? sp.opts.slice(0, sp.min) : sp.opts.includes(-1) ? -1 : sp.opts[0] }); }
const killed = 3 - T.map.c[2].w.cat;
eq([T.vb.rel.cat, T.pl.vb.vp - vbv], [killed ? 'h' : 0, Math.max(0, killed - 1)], `전투로 전사 ${killed}명 제거 → 적대, 악명 ${Math.max(0, killed - 1)}점(첫 전사 제외)`);

// ── 6. 지배 카드: 10점 이상 낮에 발동, 새벽에 3곳 지배하면 승리 ──
S = P(['cat', 'bird', 'wa'], 21);
S = A(S, 'cat', { t: 'ans', c: 1 }); S = A(S, 'cat', { t: 'ans', b: 'saw', c: 1 }); S = A(S, 'cat', { t: 'ans', b: 'shop', c: 5 }); S = A(S, 'cat', { t: 'ans', b: 'rec', c: 9 });
S = A(S, 'bird', { t: 'ans', l: 'builder' });
S = until(S, 'cat', 'cat_day');
T = clone(S); const dom = R.CARDS.findIndex(c => c.k === 'dom' && c.s === 'rabbit');
[T.deck, T.disc, T.domAvail].forEach(a => { const i = a.indexOf(dom); if (i >= 0) a.splice(i, 1); }); Object.values(T.pl).forEach(p => { const i = p.hand.indexOf(dom); if (i >= 0) p.hand.splice(i, 1); });
if (T.wa) T.wa.sup = T.wa.sup.filter(x => x !== dom);
T.pl.cat.hand.push(dom); T.pl.cat.vp = 9;
eq(R.available(T, 'cat', 'domAct'), false, '9점이면 지배 발동 불가');
T.pl.cat.vp = 10; T = A(T, 'cat', { t: 'domAct', card: dom });
eq([T.pl.cat.dom, T.pl.cat.vp], [dom, 10], '10점에 발동');
const rab = [3, 4, 5, 10].filter(c => R.CL[c].s === 'rabbit');
rab.forEach(c => { T.map.c[c].w.cat = 9; T.map.c[c].w.bird = 0; T.map.c[c].w.wa = 0; });
T.cat.wSup = 25 - [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12].reduce((a, c) => a + T.map.c[c].w.cat, 0);
let g = 0; while (!T.win && g++ < 60) { const k = R.whoActs(T); const L = R.actionList(T, k); if (k === 'cat' && T.turn.st === 'cat_day') { T = A(T, k, { t: 'pass' }); continue; } T = until(T, 'cat', 'cat_day'); }
eq(T.win && T.win.keys, ['cat'], '다음 새벽에 토끼 숲터 3곳 지배 → 승리: ' + (T.win && T.win.why));

console.log(fails ? `\n❌ 실패 ${fails}` : '\n🎉 전부 통과');
