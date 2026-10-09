'use strict';
// Read-only adversarial replay: all participants start at the real spawns.
// Deaths recreate the map through its public create API. No coordinates are assigned.
const fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto');
const E=require('./engine.js');
const MAX_FRAMES=3000,SEEDS=8,lateOnly=process.argv.includes('--late-only');
const prior=lateOnly?JSON.parse(fs.readFileSync(path.join(__dirname,'stress-population.report.json'),'utf8')):null;
const results=prior?.results||[],findings=prior?.findings||[],lateResults=[];
let totalFrames=prior?.totalFrames||0;
const intersect=(a,b)=>({x:Math.min(a.x+a.w,b.x+b.w)-Math.max(a.x,b.x),y:Math.min(a.y+a.h,b.y+b.h)-Math.max(a.y,b.y)});
function verify(s){
 for(const p of s.players){
  for(const field of ['x','y','vx','vy','w','h'])if(!Number.isFinite(p[field]))return {kind:'non-finite',id:p.id,field};
  if(p.x<-.01||p.x+p.w>s.map.width+.01)return {kind:'horizontal-bounds',id:p.id};
  if(p.exit)continue;
  for(const wall of E.solids(s)){const depth=intersect(p,wall);if(depth.x>.1&&depth.y>.1)return {kind:'terrain-penetration',id:p.id,wall:wall.id,depth};}
 }
 const active=s.players.filter(p=>!p.exit);
 for(let i=0;i<active.length;i++)for(let j=i+1;j<active.length;j++){const depth=intersect(active[i],active[j]);if(depth.x>.1&&depth.y>.1)return {kind:'body-penetration',ids:[active[i].id,active[j].id],depth};}
 for(const d of s.map.devices)for(const field of ['x','y','w','h'])if(!Number.isFinite(d[field]))return {kind:'non-finite-device',id:d.id,field};
 return null;
}
if(!lateOnly)for(let count=2;count<=8;count++)for(let trial=0;trial<SEEDS;trial++){
 const ids=Array.from({length:count},(_,i)=>`p${i}`),initialSeed=(count*7919+trial*1000003)>>>0;let seed=initialSeed,s=E.create(ids),controls={},deaths=0,restarts=0,maxX=0,maxLiftOccupancy=0,bridgeFrames=0,clearCount=0,lastRestartFrame=0;
 const random=()=>{seed=(Math.imul(seed,1664525)+1013904223)>>>0;return seed/4294967296;};
 const recent=[];let failure=null;
 for(let frame=0;frame<MAX_FRAMES;frame++){
  if(s.status!=='play'){if(s.status==='dead')deaths++;else clearCount++;s=E.create(ids);controls={};restarts++;lastRestartFrame=frame;}
  if(frame%12===0){
   controls=Object.fromEntries(s.players.map(p=>{const r=random();return[p.id,{left:r<.13,right:r>=.13&&r<.85,jump:random()<.35}]}));
  }
  if(trial%3===1){
   // Route-aware jumping lets stress reach stairs and the bridge instead of only the first gap.
   controls=Object.fromEntries(s.players.map((p,i)=>{const r=random(),nearGap=(p.x>=335&&p.x<445)||(p.x>=738&&p.x<905)||(p.x>=1155&&p.x<1430);
    const blocked=s.players.some(q=>q!==p&&!q.exit&&q.x>=p.x&&q.x-p.x<45&&Math.abs(q.y-p.y)<25);
    return[p.id,{left:r<.02,right:r>=.02&&r<.94,jump:p.grounded&&(nearGap||blocked||r>.96)}];}));
  }
  if(trial%3===2&&frame%180<75){
   // A changing designated jumper mixes carrying, blocked jumps and opposite movement.
   const jumper=Math.floor(frame/180)%count;
   controls=Object.fromEntries(s.players.map((p,i)=>[p.id,{right:true,left:false,jump:i===jumper&&p.grounded&&frame%18===0}]));
  }
  const before=JSON.parse(JSON.stringify(s));E.step(s,controls,trial===7?1/30:1/60);totalFrames++;
  recent.push({frame,inputs:JSON.parse(JSON.stringify(controls))});if(recent.length>60)recent.shift();
  maxX=Math.max(maxX,...s.players.map(p=>p.x));maxLiftOccupancy=Math.max(maxLiftOccupancy,s.map.devices.find(d=>d.kind==='lift').occupancy||0);if(s.map.devices.find(d=>d.kind==='bridge').active)bridgeFrames++;
  failure=verify(s);
  if(failure){findings.push({count,trial,initialSeed,frame,lastRestartFrame,dt:trial===7?1/30:1/60,...failure,before,after:s,recentInputs:recent});break;}
 }
 results.push({count,trial,initialSeed,deaths,restarts,maxX:Math.round(maxX),maxLiftOccupancy,bridgeFrames,clearCount,pass:!failure});
}
// Reach the late area with the real population route, then branch from that exact
// input-produced snapshot. Copying a snapshot never edits player coordinates.
const {runPopulation}=require('./population-route.test.cjs');
for(const count of [2,4,8]){
 let checkpoint=null,prefixFrames=0;const originalStep=E.step;
 E.step=(s,inputs,dt)=>{originalStep(s,inputs,dt);prefixFrames++;totalFrames++;
  const bad=verify(s);if(bad){findings.push({kind:'prefix-'+bad.kind,count,frame:prefixFrames,...bad,after:JSON.parse(JSON.stringify(s))});throw Error('stress prefix invariant');}
  const lift=s.map.devices.find(d=>d.id==='team-lift');
  if(lift.occupancy===count&&lift.y<490){checkpoint=JSON.parse(JSON.stringify(s));throw Error('STRESS_CHECKPOINT_REACHED');}
 };
 try{runPopulation(count);}finally{E.step=originalStep;}
 if(!checkpoint){lateResults.push({count,pass:false,reason:'input route did not reach checkpoint',prefixFrames});continue;}
 for(let trial=0;trial<3;trial++){
  const s=JSON.parse(JSON.stringify(checkpoint));let seed=(count*1237+trial*1031)>>>0,controls={},failure=null,frame=0;
  const random=()=>{seed=(Math.imul(seed,1664525)+1013904223)>>>0;return seed/4294967296;};
  for(;frame<600&&s.status==='play'&&totalFrames<200000;frame++){
   if(frame%6===0)controls=Object.fromEntries(s.players.map(p=>{const r=random();return[p.id,{left:r<.25,right:r>=.25&&r<.85,jump:random()<.35}]}));
   const before=JSON.parse(JSON.stringify(s));E.step(s,controls);totalFrames++;failure=verify(s);
   if(failure){findings.push({count,trial,phase:'late-lift',frame,...failure,before,after:JSON.parse(JSON.stringify(s)),inputs:controls});break;}
  }
  lateResults.push({count,trial,prefixFrames,frames:frame,status:s.status,pass:!failure,maxLiftOccupancy:count,checkpointLiftY:checkpoint.map.devices.find(d=>d.id==='team-lift').y});
 }
}
const report={engineHash:crypto.createHash('sha256').update(fs.readFileSync(path.join(__dirname,'engine.js'))).digest('hex'),totalFrames,populations:[2,3,4,5,6,7,8],seedsPerPopulation:SEEDS,maxFramesPerCase:MAX_FRAMES,audio:'none',stateInjection:false,findings,results,lateResults,
 limit:'This is bounded input stress, not a claim of complete route coverage, source physics calibration or subjective fun.'};
fs.writeFileSync(path.join(__dirname,'stress-population.report.json'),JSON.stringify(report,null,2)+'\n');
console.log(JSON.stringify({totalFrames,cases:results.length,findings:findings.map(({count,trial,frame,kind,id,ids,wall,depth})=>({count,trial,frame,kind,id,ids,wall,depth})),maxX:Math.max(...results.map(r=>r.maxX)),earlyMaxLiftOccupancy:Math.max(...results.map(r=>r.maxLiftOccupancy)),lateResults},null,2));
if(findings.length||lateResults.some(r=>!r.pass))process.exitCode=1;
