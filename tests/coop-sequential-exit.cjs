'use strict';
const test=require('node:test'),assert=require('node:assert/strict');
const E=require('../coop-engine.js');
for(let count=2;count<=8;count++)test(count+' players enter separately and stay cleared',()=>{
 const s=E.create(Array.from({length:count},(_,i)=>'p'+i),0);s.keyTaken=true;s.gateOpen=true;
 for(let i=0;i<count;i++){
  const p=s.players[i];p.x=s.map.exit.x-p.w-1;p.y=600-p.h;p.vx=0;p.vy=0;
  E.step(s,{[p.id]:{right:true}},1/60);assert.equal(p.exit,true);
  const saved={x:p.x,y:p.y};
  for(let f=0;f<12;f++)E.step(s,{[p.id]:{left:true,jump:true}},1/60);
  assert.equal(p.exit,true);assert.equal(p.x,saved.x);assert.equal(p.y,saved.y);
  assert.equal(s.status,i===count-1?'clear':'play');
 }
});
test('Locked door does not clear a player',()=>{
 const s=E.create(['a','b'],0),p=s.players[0];p.x=s.map.exit.x;p.y=600-p.h;
 E.step(s,{},1/60);assert.equal(p.exit,false);assert.equal(s.status,'play');
});
