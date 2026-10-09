'use strict';
const assert=require('node:assert/strict'),C=require('./camera.js');
const viewport={width:1200,height:675},map={width:2440,height:720};
let checks=0;
function visible(camera,players){
 for(const p of players.filter(p=>!p.exit)){
  const a=C.point(camera,p.x-10,p.y-18),b=C.point(camera,p.x+p.w,p.y+p.h);
  assert(a.x>=53.99&&b.x<=1146.01,`horizontal clipping ${JSON.stringify({p,camera,a,b})}`);
  assert(a.y>=67.99&&b.y<=617.01,`vertical clipping ${JSON.stringify({p,camera,a,b})}`);
 }
}
for(let n=2;n<=8;n++){
 const players=Array.from({length:n},(_,i)=>({id:'p'+i,x:65+i*40,y:562,w:32,h:38,exit:false}));
 let camera=C.update(null,players,map,viewport);visible(camera,players);
 for(let frame=0;frame<500;frame++){
  players[n-1].x=Math.min(2300,players[n-1].x+5);
  players[n-1].y=360-38-80*Math.abs(Math.sin(frame/20));
  camera=C.update(camera,players,map,viewport);visible(camera,players);
 }
 for(let i=0;i<n-1;i++){players[i].x=1800;players[i].y=562-i*38;}
 players[n-1].exit=true;camera=C.update(camera,players,map,viewport);visible(camera,players);
 for(let frame=0;frame<240;frame++){camera=C.update(camera,players,map,viewport);visible(camera,players);}
 console.log(`PASS ${n} players: spread, moving lead, stacked group, early exit and zoom recovery`);checks++;
}
assert.deepEqual(C.update(null,[],map),{x:0,y:0,zoom:1});
console.log(`${checks} population camera scenarios passed; every frame keeps active players visible.`);
