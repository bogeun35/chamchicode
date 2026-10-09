// Derived from static native branches; no original executable is loaded.
(function () {
function actorPopulationAllowed(value, count) {
  if (value === 0) return true;
  if (value < 0) return count <= -value;
  if (value < 10) return count >= value;
  return count >= Math.trunc(value / 10) && count <= value % 10;
}
function sortVariants(list) {
  return [...list].sort((a, b) => Number(b.isOnlineOnly) - Number(a.isOnlineOnly) || b.needPlayerCount - a.needPlayerCount);
}
function selectVariant(list, count, online = false) {
  let fallback;
  for (const param of sortVariants(list)) {
    if (!param.isOnlineOnly && param.needPlayerCount === 0) { fallback = param; continue; }
    if (param.isOnlineOnly && !online) continue;
    if (param.needPlayerCount > 0 && count < param.needPlayerCount) continue;
    return param;
  }
  return fallback;
}
function actorsForCount(param, count) {
  return param.actorCreateParamList.filter(a => actorPopulationAllowed(a.playerCount, count));
}
const populationRules = { actorPopulationAllowed, sortVariants, selectVariant, actorsForCount };
if (typeof module !== 'undefined' && module.exports) module.exports = populationRules;
if (typeof globalThis !== 'undefined') globalThis.SourcePopulationRules = populationRules;
if (typeof require !== 'undefined' && typeof module !== 'undefined' && require.main === module) {
  const assert = require('node:assert/strict');
  const fs = require('node:fs');
  const path = require('node:path');
  for (let n = 2; n <= 8; n++) {
    assert.equal(actorPopulationAllowed(0, n), true);
    assert.equal(actorPopulationAllowed(4, n), n >= 4);
    assert.equal(actorPopulationAllowed(-4, n), n <= 4);
    assert.equal(actorPopulationAllowed(35, n), n >= 3 && n <= 5);
  }
  const all = JSON.parse(fs.readFileSync(path.join(__dirname, 'installed-stage-decoded.local.json'), 'utf8'));
  const world = all.stages.filter(s => /^st_w_\d\d_\d\d$/.test(s.stageId)).sort((a,b)=>a.stageId.localeCompare(b.stageId));
  assert.equal(world.length, 60);
  const stages = world.map(s => ({
    stageId: s.stageId,
    variants: s.json.stageInitParamList.map(p=>({createIndex:p.createIndex,isOnlineOnly:p.isOnlineOnly,needPlayerCount:p.needPlayerCount,sourceActorCount:p.actorCreateParamList.length})),
    populations: Array.from({length:7}, (_,i)=>i+2).map(n=>{
      const p=selectVariant(s.json.stageInitParamList,n);
      assert.ok(p, `${s.stageId} ${n}: missing offline variant`);
      const actors=actorsForCount(p,n), types={};
      for(const a of actors) types[a.typeName]=(types[a.typeName]||0)+1;
      return {count:n,selectedCreateIndex:p.createIndex,selectedNeedPlayerCount:p.needPlayerCount,actorCount:actors.length,initialActorCount:actors.filter(a=>a.createThreshold<=0).length,typeCounts:types};
    })
  }));
  const report = {
    readOnlyStatic:true,nativeCodeExecuted:false,
    evidence:{
      actorPopulation:'PhotonQuantumCode.dll ActorFactoryComponent.Update 0x1816a30ee–0x1816a3147: +0x1c is playerCount; count from Frame.GetPlayerIndexCount.',
      actorThreshold:'ActorFactoryComponent.Update 0x1816a30e4: signed FP threshold comparison, stop processing when current threshold < next actor createThreshold. QStageFileConverter.sortActorCreateParamList sorts ascending createThreshold.',
      variantSort:'Assembly-CSharp.dll <>c.<CheckAndOrganizeFile>b__1_0 0x1805d6a4e–0x1805d6a7e: online-only first, then descending needPlayerCount. createIndex is not used for runtime selection.',
      variantSelection:'PhotonQuantumCode.dll GameComponent.selectStageInitParam 0x18184e0dc–0x18184e161: remember ordinary needPlayerCount=0 fallback; first eligible non-default variant wins; online-only variants skipped offline; needPlayerCount>0 requires count>=needPlayerCount.'
    },
    rules:{actorPlayerCount:{zero:'all',positiveUnder10:'count >= value',negative:'count <= abs(value)',positiveAtLeast10:'floor(value/10) <= count <= value%10'},variant:'online-only descending, needPlayerCount descending; first eligible; ordinary zero fallback'},
    worldStages:60,populationSelections:420,offlineSelectionsValid:420,
    worldCreateThresholds:[...new Set(world.flatMap(s=>s.json.stageInitParamList.flatMap(p=>p.actorCreateParamList.map(a=>a.createThreshold))))],
    caution:'This verifies static selection and source actors only. It does not verify web gameplay, native physics fidelity, or 8-person online play.',
    stages
  };
  fs.writeFileSync(path.join(__dirname,'population-selection-report.json'),JSON.stringify(report,null,2));
  console.log(JSON.stringify({worldStages:60,selections:420,allHaveVariant:true,actorPopulationRulesVerified:true,worldCreateThresholds:report.worldCreateThresholds}));
}
})();
