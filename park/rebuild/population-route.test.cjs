'use strict';
// Full-route audit. The only simulation mutations are create(ids) and step().
// No player coordinates, map geometry, key state, or exit state are assigned.
const assert=require('node:assert/strict');
const E=require('./engine.js');

function runPopulation(count){
 const ids=Array.from({length:count},(_,i)=>`p${i+1}`),s=E.create(ids);
 let frames=0,phase='spawn';const milestones=[];
 const player=id=>s.players.find(p=>p.id===id);
 function tick(inputs={},n=1){for(let i=0;i<n;i++){E.step(s,inputs,1/60);frames++;if(s.status==='dead')throw Error(`death during ${phase}: ${JSON.stringify(s.failure)}`);}}
 function mark(name){phase=name;milestones.push({phase:name,frame:frames});}
 function walkRight(id,target,jumpPoints=[]){
  const pending=jumpPoints.filter(x=>x>player(id).x);let index=0;
  for(let i=0;i<1800;i++){
   const p=player(id);if(p.x>=target-2){tick({},2);return;}
   const jump=index<pending.length&&p.grounded&&p.x>=pending[index];if(jump)index++;
   tick({[id]:{right:true,jump}});
  }
  throw Error(`walk blocked: ${id} target ${target}`);
 }
 function stackOn(id,targetX,supportId){
  walkRight(id,targetX-34,[1460]);
  // Hold jump once; release after the first frame. Horizontal motion waits
  // naturally at the stack's side until the jumper has enough headroom.
  tick({[id]:{jump:true,right:true}});
  for(let i=0;i<120;i++){
   const p=player(id);tick({[id]:{right:p.x<targetX-1}});
   if(i>10&&player(id).grounded&&player(id).supportId===supportId)return;
  }
  throw Error(`stack failed: ${id} onto ${supportId}`);
 }
 try{
  tick({},2);
  const base=ids.at(-1),scout=ids.at(-2);
  mark('scout-over-large-gap');
  walkRight(base,1170,[350,750]);walkRight(scout,1090,[350,750]);
  tick({[scout]:{right:true,jump:true}},20);tick({},30);
  assert.equal(player(scout).supportId,base,'scout must stand on teammate');
  walkRight(scout,1194);tick({[scout]:{right:true,jump:true}},55);
  assert.equal(player(scout).supportId,'button-bank');walkRight(scout,1510);
  assert(s.map.devices.find(d=>d.id==='gap-bridge').active);
  mark('bridge-held-and-lift-boarding');
  const queue=[base,...ids.filter(id=>id!==base&&id!==scout).reverse(),scout];
  // A small party uses the central column underneath the key. Larger parties
  // board right-to-left so later arrivals do not have to cross a tall stack.
  const columns=count<=3?[1840]:[1880,1840,1800],topIds=[null,null,null];
  for(let i=0;i<queue.length;i++){
   const id=queue[i],column=Math.floor(i/3),row=i%3,targetX=columns[column];
   if(id===scout){
    assert(s.players.filter(p=>p.id!==scout).every(p=>p.x>=1800),'holder leaves only after all teammates crossed');
   }else{
    assert(s.map.devices.find(d=>d.id==='gap-bridge').active,'scout must hold bridge during every crossing');
   }
   if(row===0)walkRight(id,targetX,[350,750,1460]);
   else{
    walkRight(id,targetX-34,[350,750,1460]);
    stackOn(id,targetX,topIds[column]);
   }
   topIds[column]=id;
  }
  mark('all-player-lift');
  let reached=false;
  for(let i=0;i<400;i++){
   tick();const lift=s.map.devices.find(d=>d.id==='team-lift');
   if(lift.occupancy===count&&lift.y===lift.toY){reached=true;break;}
  }
  assert(reached,'all players must ride lift to its upper stop');assert(s.keyTaken,'route must collect key');
  mark('exit-every-player');
  for(let i=0;i<1200&&s.status==='play';i++){
   const inputs={};
   for(const p of s.players)if(!p.exit){
    // As the lift descends after the first rider leaves, the remaining base
    // riders jump to the ledge once upper teammates have stepped off them.
    inputs[p.id]={right:true,jump:p.grounded&&p.x>=1870&&p.x<1920&&(i%2===0)};
   }
   tick(inputs);
  }
  assert.equal(s.status,'clear');assert(s.players.every(p=>p.exit));
  return {count,result:'PASS',frames,seconds:+(frames/60).toFixed(2),milestones};
 }catch(error){
  return {count,result:'FAIL',phase,frames,error:error.message,milestones,status:s.status,keyTaken:s.keyTaken,
   lift:s.map.devices.find(d=>d.id==='team-lift'),players:s.players.map(p=>({id:p.id,x:+p.x.toFixed(2),y:+p.y.toFixed(2),grounded:p.grounded,supportId:p.supportId,exit:p.exit}))};
 }
}
if(require.main===module){
 const results=Array.from({length:7},(_,i)=>runPopulation(i+2));
 for(const result of results)console.log(JSON.stringify(result));
 const passed=results.filter(r=>r.result==='PASS').length;
 console.log(`${passed}/7 populations completed using only input frames from create(ids).`);
 if(passed!==results.length)process.exitCode=1;
}
module.exports={runPopulation};
