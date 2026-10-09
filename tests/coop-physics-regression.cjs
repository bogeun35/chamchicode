'use strict';
const assert=require('node:assert/strict');
const E=require('../coop-engine.js');
const tick=(s,input={},frames=1,dt=1/60)=>{for(let i=0;i<frames;i++)E.step(s,input,dt);};
const solidClear=(s,label)=>{
 const fixed=s.map.platforms.concat(s.gateOpen||!s.map.gate?[]:[s.map.gate]);
 for(const c of s.map.crates){
  assert(c.x>=0&&c.x+c.w<=E.W,`${label}: crate bounds`);
  for(const wall of fixed)assert(!E.overlap(c,wall),`${label}: crate penetrated wall`);
 }
 for(let i=0;i<s.map.crates.length;i++)for(let j=i+1;j<s.map.crates.length;j++)assert(!E.overlap(s.map.crates[i],s.map.crates[j]),`${label}: crates overlap`);
 if(s.status==='play')for(const p of s.players)for(const wall of fixed)assert(!E.overlap(p,wall),`${label}: player penetrated terrain`);
};

// Actual stage 11, no position/state injection: previously the boxes overlapped on frame 148.
for(const dt of [1/60,1/30]){
 const s=E.create(['a','b'],10);
 // Keep the second player behind the crate tester; teammates now correctly block movement.
 s.players[1].x=20;
 for(let frame=0;frame<500;frame++){tick(s,{a:{right:true}},1,dt);solidClear(s,`cargo ${dt} frame ${frame}`);}
 assert.equal(s.map.crates[0].x+s.map.crates[0].w,s.map.crates[1].x);
 assert.equal(s.map.crates[1].x,720,'a blocked push must not teleport the second box');
 assert.equal(s.status,'play');
 tick(s,{a:{left:true}},30,dt);
 assert(s.players[0].x<s.map.crates[0].x-32,'player can move away from blocked cargo');
 // Retry creates fresh map objects, even after a deliberately bad delivery.
 const fresh=E.create(['a','b'],10);
 assert.deepEqual(fresh.map.crates.map(c=>c.x),[350,720]);
}

// Actual stage 17: push into its closed gate until blocked; no wall crossing or spontaneous unlock.
{
 const s=E.create(['a','b'],16);
 s.players[1].x=20;
 for(let frame=0;frame<600;frame++){tick(s,{a:{right:true}});solidClear(s,`gate push ${frame}`);}
 assert.equal(s.gateOpen,false,'upper teammate station cannot be replaced by a floor box');
 assert(s.map.crates[0].x+s.map.crates[0].w<=s.map.gate.x);
}

// A held jump produces exactly one jump and settles; release/repress jumps again.
{
 const s=E.create(['a','b'],0);tick(s,{},30);let min=562;
 for(let i=0;i<100;i++){tick(s,{a:{jump:true}});min=Math.min(min,s.players[0].y);}
 assert.equal(s.players[0].y,562);assert(min<490&&min>460);
 tick(s,{},2);tick(s,{a:{jump:true}});assert(s.players[0].y<562);
}

// Type-contract unit fixtures, explicitly separate from input-only campaign routes.
for(const accept of ['player','crate']){
 const s=E.create(['a','b'],0);
 s.map.switches=[{x:500,y:592,w:30,h:8,accept}];
 s.map.crates=[{x:500,y:550,w:50,h:50}];
 tick(s,{},30);
 assert.equal(s.switchActive[0],accept==='crate');
}

// Adversarial input fuzz across every population and map; no player coordinates are assigned.
let checkedFrames=0;
for(let trial=0;trial<8;trial++)for(let count=2;count<=8;count++)for(let level=0;level<E.LEVEL_COUNT;level++){
 const s=E.create(Array.from({length:count},(_,i)=>String(i)),level);
 let seed=(count*7919+level*104729+trial*1000003)>>>0,controls={};
 const random=()=>{seed=(Math.imul(seed,1664525)+1013904223)>>>0;return seed/4294967296;};
 for(let frame=0;frame<1200&&s.status==='play';frame++){
  if(frame%12===0)controls=Object.fromEntries(s.players.map(p=>{const x=random();return [p.id,{left:x<.2,right:x>=.2&&x<.85,jump:random()<.4}]}));
  tick(s,controls);solidClear(s,`seed ${trial}: ${count} players stage ${level+1} frame ${frame}`);checkedFrames++;
 }
}
console.log(`PASS cargo mutual collision at 30/60 Hz, closed-gate collision, retry reset, jump edge, switch types, ${checkedFrames} adversarial input frames across 20 maps x 7 populations x 8 seeds (1120 cases). No audio used.`);
