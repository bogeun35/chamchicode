'use strict';
const assert=require('node:assert/strict');
const E=require('./engine.js');
const stage=require('./stage1-1.js');
const fs=require('node:fs'),vm=require('node:vm');
let checks=0;const test=(name,fn)=>{fn();checks++;console.log(`PASS ${name}`);};
const tick=(s,inputs={},frames=1)=>{for(let i=0;i<frames;i++)E.step(s,inputs,1/60);};
function walk(s,id,target,jumpAt=[]){
 let next=0,frames=0;
 while(s.players.find(p=>p.id===id).x<target-2&&s.status==='play'&&frames++<1800){
  const p=s.players.find(p=>p.id===id),jump=next<jumpAt.length&&p.grounded&&p.x>=jumpAt[next];
  if(jump)next++;
  tick(s,{[id]:{right:true,jump}});
 }
 assert.equal(s.status,'play',`walking ${id} to ${target}: ${JSON.stringify(s.failure)}`);
 assert(frames<1800,`walk stuck ${id}: ${JSON.stringify(s.players)}`);
 tick(s,{},2);
}
function completeTwoPlayer({lateLiftRecovery=false}={}){
 const s=E.create(['a','b']);tick(s,{},2);
 walk(s,'b',1170,[350,750]);
 walk(s,'a',1090,[350,750]);
 // a jumps onto b, then walks to the leading edge of the stack.
 tick(s,{a:{right:true,jump:true}},20);
 tick(s,{},30);
 assert.equal(s.players.find(p=>p.id==='a').supportId,'b');
 walk(s,'a',1194);
 tick(s,{a:{right:true,jump:true}},55);
 assert.equal(s.players.find(p=>p.id==='a').supportId,'button-bank');
 walk(s,'a',1510);
 assert.equal(s.map.devices.find(d=>d.id==='gap-bridge').active,true);
 walk(s,'b',1460);
 assert.equal(s.map.devices.find(d=>d.id==='gap-bridge').active,true);
 walk(s,'a',1860);
 assert.equal(s.map.devices.find(d=>d.id==='gap-bridge').active,false);
 walk(s,'b',1820);
 tick(s,{},230);
 assert.equal(s.map.devices.find(d=>d.id==='team-lift').y,360);assert(s.keyTaken);
 if(lateLiftRecovery){
  // All progress above came from input. a exits while b deliberately leaves
  // the lift to the lower bank, then b boards again without a's help.
  tick(s,{a:{right:true},b:{left:true}},55);
  tick(s,{a:{right:true}},100);
  assert(s.players.find(p=>p.id==='a').exit);
  tick(s,{},220);
  assert.equal(s.map.devices.find(d=>d.id==='team-lift').y,600);
  walk(s,'b',1860);
  tick(s,{},230);
  assert.equal(s.map.devices.find(d=>d.id==='team-lift').requiredPlayers,1);
  assert.equal(s.map.devices.find(d=>d.id==='team-lift').y,360);
  tick(s,{b:{right:true}},140);
  return s;
 }
 let jumped=false;
 for(let frame=0;frame<300&&s.status==='play';frame++){
  const a=s.players.find(p=>p.id==='a'),b=s.players.find(p=>p.id==='b');
  const jump=!jumped&&b.x>=1875&&b.grounded;if(jump)jumped=true;
  tick(s,{a:{right:a.x<2266},b:{right:b.x<2234,jump}});
 }
 return s;
}
test('map is variable width with explicit reconstruction evidence',()=>{
 const m=stage.createStage(2);assert(m.width>1200);assert.equal(m.reconstruction.geometry,'reconstruction_pending');
 for(const n of [2,4,8]){const x=stage.createStage(n);assert.equal(x.devices.find(d=>d.kind==='lift').requiredPlayers,n);assert.equal(x.spawns.length,n);}
 assert.match(stage.createStage(8).reconstruction.populationScaling,/unverified/);
});
test('standing teammate blocks carrier jump, upper player may jump',()=>{
 const s=E.create(['a','b']);s.players[0].x=100;s.players[0].y=562;s.players[1].x=100;s.players[1].y=524;tick(s,{},2);
 const baseY=s.players[0].y;tick(s,{a:{jump:true}});assert.equal(s.players[0].y,baseY);assert(s.players[0].grounded);
 tick(s,{b:{jump:true}});assert(s.players[1].vy<0);
});
test('fall failure remains visible until explicit recreation',()=>{
 const s=E.create(['a','b']);s.players[0].x=420;s.players[0].y=780;tick(s);assert.equal(s.status,'dead');
 const snapshot=JSON.stringify(s);tick(s,{},100);assert.equal(JSON.stringify(s),snapshot);assert.equal(s.deaths,1);
});
test('exit refuses entry before shared key collection',()=>{
 const s=E.create(['a','b']);s.players[0].x=2220;s.players[0].y=322;tick(s);
 assert.equal(s.players[0].exit,false);assert.equal(s.status,'play');
});
for(const count of [2,4,8])test(`${count} players enter a narrow exit sequentially and stay entered`,()=>{
 const s=E.create(Array.from({length:count},(_,i)=>`p${i}`));s.keyTaken=true;
 // This focused fixture bypasses the route only to isolate exit admission.
 s.players.forEach((p,i)=>{p.x=2050+i*35;p.y=322;});
 for(let i=count-1;i>=0;i--){
  const p=s.players[i];p.x=2220;p.y=322;tick(s,{},1);assert(s.players[i].exit);
  if(i>0)assert.equal(s.status,'play');
 }
 assert.equal(s.status,'clear');const before=JSON.stringify(s);tick(s,{},2);assert.equal(JSON.stringify(s),before);
});
test('CommonJS and browser globals load independently without audio',()=>{
 const context=vm.createContext({window:{}});for(const file of ['devices.js','stage1-1.js','hazard-geometry.js','engine.js'])vm.runInContext(fs.readFileSync(require('node:path').join(__dirname,file),'utf8'),context);
 assert(context.window.ParkDevices);assert(context.window.ParkStageOne);assert(context.window.ParkRebuild.create(['a','b']));
});
test('two players complete observed route using input frames only',()=>{
 const s=completeTwoPlayer();assert.equal(s.status,'clear');assert(s.keyTaken);assert(s.players.every(p=>p.exit));
});
test('late teammate reboards lift after first exit and clears using input only',()=>{
 const s=completeTwoPlayer({lateLiftRecovery:true});assert.equal(s.status,'clear');assert(s.players.every(p=>p.exit));
});
for(let count=2;count<=8;count++)test(`${count} initial lift quota tracks only permanent exits`,()=>{
 const s=E.create(Array.from({length:count},(_,i)=>`p${i}`));tick(s,{},2);
 assert.equal(s.map.devices.find(d=>d.id==='team-lift').requiredPlayers,count);
 // Focused quota fixture, not a complete input route.
 for(let exited=1;exited<count;exited++){
  s.players[exited-1].exit=true;tick(s,{},1);
  assert.equal(s.map.devices.find(d=>d.id==='team-lift').requiredPlayers,count-exited);
 }
 assert.equal(s.status,'play');
});
console.log(`${checks} rebuild engine checks passed.`);
