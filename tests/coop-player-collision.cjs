'use strict';
const test=require('node:test'),assert=require('node:assert/strict'),E=require('../coop-engine.js');
function scene(count){const s=E.create(Array.from({length:count},(_,i)=>'p'+i),0);s.map={platforms:[{x:0,y:600,w:1200,h:75}],switches:[],crates:[],hazards:[],key:{x:1150,y:20,w:20,h:20},exit:{x:1160,y:500,w:32,h:100}};s.players.forEach((p,i)=>{p.x=80+i*60;p.y=600-p.h;p.vy=0;});return s;}
function step(s,inputs,frames){for(let i=0;i<frames;i++)E.step(s,inputs,1/60);}
for(let count=2;count<=8;count++)test(count+' players block horizontal movement without overlap',()=>{
 const s=scene(count);step(s,{p0:{right:true}},90);
 assert.equal(s.players[0].x+s.players[0].w,s.players[1].x);
 for(let f=0;f<120;f++){
  E.step(s,Object.fromEntries(s.players.map((p,i)=>[p.id,i%2?{left:true}:{right:true}])),1/60);
  for(let i=0;i<count;i++)for(let j=i+1;j<count;j++)assert.equal(E.overlap(s.players[i],s.players[j]),false);
 }
});
test('A player lands on a teammate head',()=>{
 const s=scene(2),[a,b]=s.players;a.x=b.x;a.y=b.y-a.h-20;step(s,{},30);
 assert.equal(a.y+a.h,b.y);assert.equal(a.ground,true);assert.equal(E.overlap(a,b),false);
});
test('A jump stops at a teammate underside',()=>{
 const s=scene(2),[a,b]=s.players;a.x=b.x;a.y=562;b.y=a.y-b.h;b.ground=false;
 step(s,{},1);E.step(s,{p0:{jump:true}},1/60);
 assert.equal(a.y,562);assert.equal(a.vy,0);assert.equal(E.overlap(a,b),false);
});
test('Entered teammate no longer blocks the doorway',()=>{
 const s=scene(2),[a,b]=s.players;b.x=200;b.exit=true;step(s,{p0:{right:true}},50);assert(a.x>200+b.w);
});
