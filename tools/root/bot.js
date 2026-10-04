// ROOT 엔진 무작위 봇 시험: 규칙 위반 예외 · 기물/카드 보존 · 게임 종료 확인 — 사용: node tools/root/bot.js [판수] [최대수]
const R = require(require('path').join(__dirname, '../../root/engine.js'));
const args = process.argv.slice(2);
const GAMES = +(args[0] || 200), MAXSTEP = +(args[1] || 6000);
let seed = 1;
const rnd = () => { seed = (seed * 1103515245 + 12345) & 0x7fffffff; return seed / 0x7fffffff; };
const pick = a => a[Math.floor(rnd() * a.length)];

function buildAction(S, k, t) {
  const a = { t };
  for (let g = 0; g < 16; g++) {
    const sp = R.choices(S, k, a);
    if (sp.done) return a;
    if (sp.none) return null;
    if (sp.multi) {
      const n = sp.min + Math.floor(rnd() * (sp.max - sp.min + 1));
      const pool = sp.opts.slice(), out = [];
      while (out.length < n && pool.length) out.push(pool.splice(Math.floor(rnd() * pool.length), 1)[0]);
      a[sp.k] = out;
    } else if (sp.k === 'n') a[sp.k] = sp.min + Math.floor(rnd() * (sp.max - sp.min + 1));
    else {
      let o = sp.opts;
      // 거절(-1)·'none'은 가끔만 고름
      const real = o.filter(x => x !== -1 && x !== 'none');
      a[sp.k] = real.length && rnd() < 0.85 ? pick(real) : pick(o);
    }
  }
  return a;
}

function check(S, tag) {
  const err = m => { throw new Error(`[${tag}] 보존 위반: ${m}`); };
  const M = S.map.c;
  const sum = f => { let n = 0; for (let c = 1; c <= 12; c++) n += M[c].w[f]; return n; };
  const blds = (f, t) => { let n = 0; for (let c = 1; c <= 12; c++) n += M[c].sl.filter(x => x && x.f === f && (!t || x.t === t)).length; return n; };
  if (S.cat) {
    if (sum('cat') + S.cat.wSup !== 25) err('고양이 전사 ' + (sum('cat') + S.cat.wSup));
    let wood = 0; for (let c = 1; c <= 12; c++) wood += M[c].wood; if (wood + S.cat.wood !== 8) err('나무');
    if (!S.setup) for (const b of ['saw', 'shop', 'rec']) if (blds('cat', b) + S.cat.track[b] !== 6) err('고양이 건물 ' + b);
    let keeps = 0; for (let c = 1; c <= 12; c++) if (M[c].keep) keeps++; if (keeps > 1) err('성채');
  }
  if (S.bird) {
    if (sum('bird') + S.bird.wSup !== 20) err('독수리 전사');
    if (!S.setup && blds('bird', 'roost') + S.bird.roostTrack !== 7) err('둥지 ' + blds('bird', 'roost') + '+' + S.bird.roostTrack);
  }
  if (S.wa) {
    if (sum('wa') + S.wa.wSup + S.wa.off !== 10) err('동맹 전사');
    let sy = 0; for (let c = 1; c <= 12; c++) if (M[c].symp) sy++; if (sy + S.wa.sympTrack !== 10) err('공감');
    const onMap = blds('wa', 'base'), off = Object.values(S.wa.bases).reduce((a, b) => a + b, 0);
    if (onMap + off !== 3) err('기지');
  }
  for (let c = 1; c <= 12; c++) { const Cc = M[c]; for (const f of ['cat', 'bird', 'wa']) if (Cc.w[f] < 0) err('음수 전사'); if (Cc.wood < 0) err('음수 나무'); }
  // 카드 보존
  let n = S.deck.length + S.disc.length + S.domAvail.length;
  for (const k of S.seat) { const p = S.pl[k]; n += p.hand.length + p.crafted.length + (p.dom != null ? 1 : 0); }
  if (S.bird) for (const col of R.COLS) n += S.bird.decree[col].filter(x => x !== 'viz').length;
  if (S.wa) n += S.wa.sup.length;
  const want = S.seat.length > 2 ? 54 : 50;
  if (n !== want) err(`카드 ${n}/${want}`);
  const all = []; S.seat.forEach(k => all.push(...S.pl[k].hand, ...S.pl[k].crafted)); all.push(...S.deck, ...S.disc, ...S.domAvail);
  if (new Set(all).size !== all.length) err('카드 중복');
  // 아이템
  let items = 0; for (const k in S.supply) { if (S.supply[k] < 0) err('보급처 음수'); }
  if (S.vb) { if (S.vb.it.some(x => !x || !x.t)) err('방랑자 아이템'); }
}

const FSETS = [['cat', 'bird'], ['cat', 'wa'], ['cat', 'vb'], ['bird', 'wa'], ['bird', 'vb'], ['wa', 'vb'],
  ['cat', 'bird', 'wa'], ['cat', 'bird', 'vb'], ['cat', 'wa', 'vb'], ['bird', 'wa', 'vb'], ['cat', 'bird', 'wa', 'vb']];
const stats = { games: 0, wins: {}, why: {}, ruleErr: 0, ruleMsgs: {}, crashes: 0, timeouts: 0, turns: [], acts: {}, prompts: {} };
for (let gi = 0; gi < GAMES; gi++) {
  seed = 1000 + gi * 7919;
  const facs = FSETS[gi % FSETS.length];
  const players = facs.map((f, i) => ({ key: 'p' + i, nick: 'P' + i, fac: f }));
  let S = R.newGame(players, { seed: 777 + gi });
  let step = 0;
  try {
    while (!S.win && step < MAXSTEP) {
      step++;
      const k = R.whoActs(S);
      if (!k) throw new Error('아무도 행동하지 않음 ' + JSON.stringify(S.turn) + ' setup=' + JSON.stringify(S.setup));
      let L = R.actionList(S, k).filter(t => R.available(S, k, t));
      if (!L.length) throw new Error('할 수 있는 행동 없음 st=' + S.turn.st + ' list=' + R.actionList(S, k) + ' prompt=' + JSON.stringify(S.prompt));
      if (S.prompt) stats.prompts[S.prompt.kind === 'setup' ? S.prompt.st : S.prompt.kind] = (stats.prompts[S.prompt.kind === 'setup' ? S.prompt.st : S.prompt.kind] || 0) + 1;
      const nonPass = L.filter(t => t !== 'pass' && t !== 'cat_endmarch' && t !== 'turmoil');
      let done = false;
      for (let tries = 0; tries < 12 && !done; tries++) {
        const t = nonPass.length && rnd() < 0.8 ? pick(nonPass) : pick(L);
        const a = buildAction(S, k, t);
        if (!a) continue;
        try { S = R.apply(S, k, a); done = true; stats.acts[t] = (stats.acts[t] || 0) + 1; }
        catch (e) { if (e instanceof R.RuleError) { stats.ruleErr++; const m = t + ': ' + e.message; stats.ruleMsgs[m] = (stats.ruleMsgs[m] || 0) + 1; } else throw e; }
      }
      if (!done) { // 끝까지 안 되면 pass/turmoil 강제
        const t = L.includes('pass') ? 'pass' : L.includes('turmoil') ? 'turmoil' : L.includes('cat_endmarch') ? 'cat_endmarch' : null;
        if (!t) throw new Error('막힘 st=' + S.turn.st + ' L=' + L + ' prompt=' + JSON.stringify(S.prompt));
        S = R.apply(S, k, { t });
      }
      check(S, `g${gi} step${step}`);
    }
  } catch (e) {
    stats.crashes++;
    if (stats.crashes <= 5) { console.log(`\n💥 게임 ${gi} (${facs}) step ${step}:`, e.stack.split('\n').slice(0, 6).join('\n')); console.log('최근 로그:', S.log.slice(-8).join(' | ')); }
    continue;
  }
  stats.games++;
  if (!S.win) stats.timeouts++;
  else { const w = S.win.keys.map(k => S.pl[k].fac).join('+'); stats.wins[w] = (stats.wins[w] || 0) + 1; const why = S.win.why.replace(/\d+/g, '#'); stats.why[why] = (stats.why[why] || 0) + 1; }
  stats.turns.push(S.turnNo);
}
console.log('\n완료', stats.games, '/', GAMES, '충돌', stats.crashes, '시간초과', stats.timeouts, '규칙오류', stats.ruleErr);
console.log('승리', stats.wins); console.log('사유', stats.why);
console.log('평균 턴', (stats.turns.reduce((a, b) => a + b, 0) / Math.max(1, stats.turns.length)).toFixed(1));
console.log('규칙오류 메시지', Object.entries(stats.ruleMsgs).sort((a, b) => b[1] - a[1]).slice(0, 15));
console.log('행동', stats.acts);
console.log('프롬프트', stats.prompts);
