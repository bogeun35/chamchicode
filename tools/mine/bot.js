// 킵 온 마이닝 성장 곡선 계측 봇 — mine.html 콘솔에 붙여넣고 await mineBot(80)
// 화면 연출 없이 mine.simSession() 으로 한 판씩 돌리고, 판 사이에 탈렌트·곡괭이·광산·스킬트리를 산다.
async function mineBot(maxSessions, opt) {
  opt = opt || {};
  const m = window.mine, S = m.resetSave();
  S.tut.crafting = true; S.firstPlay = false; S.stats.miningSessions = 1;
  const log = []; let clock = 0;
  const firsts = {};
  const spend = () => {
    let changed = true, guard = 0;
    while (changed && guard++ < 2000) {
      changed = false;
      if (m.revealTal()) changed = true;
      if (S.choosing) { m.chooseTalent(S.choosing[0]); changed = true; }
      for (let i = 1; i < 13; i++) if (!S.crafted[i] && m.craftNow(i)) changed = true;
      const best = S.crafted.lastIndexOf(true); if (best !== S.equipped) m.equip(best);
      if (m.mineUnlock()) changed = true;
      const cand = m.NODES.filter(n => m.revealed(n.f) && (S.buy[n.f] || 0) < n.max && S.bars[n.cur] >= m.treePrice(n));
      if (cand.length) {
        cand.sort((a, b) => (b.key.endsWith('Spawn') - a.key.endsWith('Spawn')) || m.treePrice(a) / (S.bars[a.cur] + 1) - m.treePrice(b) / (S.bars[b.cur] + 1));
        m.buy(cand[0].f); changed = true;
      }
      if (S.mine.unlocked) { if (S.mine.timePrice < S.bars[0] * .1 && m.mineUp('time')) changed = true; if (S.mine.matPrice < S.bars[0] * .1 && m.mineUp('bars')) changed = true; }
    }
  };
  for (let k = 1; k <= maxSessions; k++) {
    const r = m.simSession(opt);
    clock += r.secs + (opt.overhead == null ? 12 : opt.overhead);   // 물결·시작 문구·정산·전환·메뉴 시간
    spend();
    for (const f of ['spawnCopper', 'spawnIron', 'cobaltSpawn', 'uraniumSpawn', 'ismiumSpawn', 'iridiumSpawn', 'painiteSpawn', 'finalUpgrade']) if (S.buy[f] && !firsts[f]) firsts[f] = { session: k, min: +(clock / 60).toFixed(1) };
    log.push({ k, min: +(clock / 60).toFixed(1), lv: S.lv, buys: S.totalBuys, pick: S.equipped, cards: 20 - S.cardsLeft, rocks: S.T.totalRocksToSpawn, secs: S.T.mineSessionTime, ore: r.ore.map(v => Math.round(v)), art: S.artifactsFound });
    if (S.buy.finalUpgrade) break;
    if (k % 5 === 0) await new Promise(res => setTimeout(res, 0));
  }
  return { firsts, last: log[log.length - 1], log };
}
