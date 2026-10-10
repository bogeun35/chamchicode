/* Source-derived PP2 devices. Geometry, trigger protocol and thresholds are
 * decoded facts; browser contact ordering remains an explicit approximation. */
(function(root,factory){const api=factory();if(typeof module==='object'&&module.exports)module.exports=api;root.SourceDevicesRuntime=api;})(typeof globalThis!=='undefined'?globalThis:this,function(){
'use strict';
const overlap=(a,b)=>a.x<b.x+b.w&&a.x+a.w>b.x&&a.y<b.y+b.h&&a.y+a.h>b.y;
const clone=o=>JSON.parse(JSON.stringify(o));
const directions=[[0,-1],[0,1],[-1,0],[1,0]];
// ThornComponent..cctor 0x181722670: two native collision rectangles/direction.
const thornRects=[[[ -4,-18,8,8],[-12,-8,24,6]],[[-4,10,8,8],[-12,2,24,6]],[[-18,-4,8,8],[-8,-12,6,24]],[[10,-4,8,8],[2,-12,6,24]]];
const supportedTypes=['Thorn','CollisionSwitch','PushBox'];
function compile(actors,count){
 if(!Number.isInteger(count)||count<2||count>8)throw Error('Device player count must be 2..8');
 const devices=[],warnings=[];
 for(const [i,a] of actors.entries()){
  const props=a.properties||a,type=props.typeName;if(!supportedTypes.includes(type))continue;
  const d=a.datas||a.parameters||[],n=k=>d[k]?.t===1?d[k].f:0,s=k=>d[k]?.t===2?d[k].s||'':'';
  const pos=a.position||{x:a.x??a.posX,y:a.y??a.posY};
  const base={id:a.id||'device:'+i,name:props.name||'',type,x:pos.x,y:pos.y};
  if(type==='Thorn'){
   const direction=n(0)>=0&&n(0)<=3?Math.floor(n(0)):0;
   devices.push({...base,direction,moveDirection:n(8)?n(9):direction,speed:Math.abs(n(1)),waitTime:Math.abs(n(2)),waitElapsed:0,phase:'idle',active:true,alpha:1,distance:0,beltSpeed:Math.abs(n(7)),beltStart:{x:n(3),y:n(4)},beltEnd:{x:n(5),y:n(6)}});
   if(n(3)||n(4)||n(5)||n(6))warnings.push(base.id+': belt movement not implemented');
  }else if(type==='CollisionSwitch'){
   devices.push({...base,w:n(0),h:n(1),targets:[s(2),s(3)].filter(Boolean),delay:n(4),repeat:!!n(8),notifyValue:n(9),groundedOnly:!!n(10),phase:0,timer:0});
   if(n(7))warnings.push(base.id+': extra offset parameter not implemented');
  }else{
   // ParseParameter 0x1816db310 type29 custom width/height, ceil % + offset.
   const w=n(1),h=n(2);if(w<=0||h<=0)throw Error('Unsupported PushBox dimensions');
   const percent=n(0)?Math.abs(Math.floor(n(0))):100,offset=n(3)?Math.floor(n(3)):0;
   devices.push({...base,x:pos.x-w/2,y:pos.y-h,w,h,percent,offset,requiredPushers:Math.ceil(count*percent/100)+offset,vx:0,vy:0,pushCount:0,grounded:false});
  }
 }
 return {schemaVersion:1,count,devices,warnings,completePhysicsFidelity:false};
}
function create(compiled){return clone(compiled);}
function solids(state){return state.devices.filter(d=>d.type==='PushBox');}
function hazards(state){return state.devices.filter(d=>d.type==='Thorn'&&d.active&&d.phase!=='fade').flatMap(d=>thornRects[d.direction].map(([x,y,w,h],i)=>({id:d.id+':'+i,deviceId:d.id,x:d.x+x,y:d.y+y,w,h})));}
function signal(state,event){
 if(event.event!==61)return false;let changed=false;
 for(const d of state.devices)if(d.name===event.target&&d.type==='Thorn'&&d.phase==='idle'&&d.speed>=4/65536){d.phase='move';changed=true;}
 return changed;
}
function moveBox(b,dx,dy,obstacles){
 let x=b.x+dx;
 for(const o of obstacles)if(b.y<o.y+o.h&&b.y+b.h>o.y){if(dx>0&&b.x+b.w<=o.x+.001)x=Math.min(x,o.x-b.w);if(dx<0&&b.x>=o.x+o.w-.001)x=Math.max(x,o.x+o.w);}
 b.x=x;let y=b.y+dy;b.grounded=false;
 for(const o of obstacles)if(b.x<o.x+o.w&&b.x+b.w>o.x){if(dy>=0&&b.y+b.h<=o.y+.001&&y+b.h>=o.y){y=Math.min(y,o.y-b.h);b.vy=0;b.grounded=true;}if(dy<0&&b.y>=o.y+o.h-.001&&y<o.y+o.h){y=Math.max(y,o.y+o.h);b.vy=0;}}
 b.y=y;
}
function pushers(b,players,inputs,dir){
 // Contact chains allow people behind one another to contribute, as native
 // getPushCount recursively walks actor contacts. Exact native ordering pending.
 const found=new Set();let frontier=[b];
 while(frontier.length){const next=[];for(const o of frontier)for(const p of players){if(found.has(p.id))continue;
   const input=inputs[p.id]||{};const edge=dir>0?Math.abs(p.x+p.w-o.x):Math.abs(p.x-o.x-o.w);
   if(edge<=1.1&&p.y<o.y+o.h&&p.y+p.h>o.y&&(dir>0?input.right&&!input.left:input.left&&!input.right)){found.add(p.id);next.push(p);}
  }frontier=next;
 }return found;
}
function beforeStep(state,{players=[],inputs={},platforms=[],dt=1/60,nativeTickRate=60,gravity=42598/65536,width=4096}={}){
 if(!Number.isFinite(dt)||dt<0)throw Error('Invalid device delta');
 const alive=players.filter(p=>!p.exit&&!p.dead),scale=dt*nativeTickRate;
 const boxes=solids(state);
 for(const b of boxes){
  const right=pushers(b,alive,inputs,1),left=pushers(b,alive,inputs,-1);
  b.pushCount=Math.max(right.size,left.size);const dir=right.size>=b.requiredPushers&&right.size>left.size?1:left.size>=b.requiredPushers&&left.size>right.size?-1:0;
  const old={x:b.x,y:b.y};b.vx=dir;b.vy+=gravity*scale;
  const driving=dir>0?right:dir<0?left:new Set();
  const obstacles=[...platforms,...boxes.filter(x=>x!==b),...alive.filter(p=>!driving.has(p.id)&&p.supportId!==b.id)];
  moveBox(b,dir*scale,b.vy*scale,obstacles);b.x=Math.max(0,Math.min(width-b.w,b.x));
  // Carry established riders; player solver resolves their own collisions.
  for(const p of alive)if(p.supportId===b.id){p.x+=b.x-old.x;p.y+=b.y-old.y;}
 }
 return {solids:boxes};
}
function afterStep(state,{players=[],platforms=[],dt=1/60,nativeTickRate=60,width=4096,height=2048}={}){
 if(!Number.isFinite(dt)||dt<0)throw Error('Invalid device delta');
 const alive=players.filter(p=>!p.exit&&!p.dead),events=[],dead=new Set(),scale=dt*nativeTickRate,boxes=solids(state);
 for(const d of state.devices.filter(d=>d.type==='CollisionSwitch')){
  const contact=alive.some(p=>overlap(p,d)&&(!d.groundedOnly||p.grounded));
  if(d.phase===0&&contact)d.phase=1;
  else if(d.phase===1){d.phase=2;d.timer=d.delay;}
  else if(d.phase===2){d.timer-=dt;if(d.timer<=0){for(const target of d.targets){const e={event:61,target,value:d.notifyValue,source:d.id};events.push(e);signal(state,e);}d.phase=d.repeat?3:4;}}
  else if(d.phase===3&&!contact)d.phase=0;
 }
 for(const d of state.devices.filter(d=>d.type==='Thorn'&&d.active)){
  if(d.phase==='fade'){d.alpha=Math.max(0,d.alpha-4*dt);if(d.alpha===0)d.active=false;continue;}
  if(d.phase==='idle'&&d.waitTime>0){d.waitElapsed+=dt;if(d.waitElapsed>=d.waitTime&&d.speed>=4/65536)d.phase='move';}
  const before={x:d.x,y:d.y};
  if(d.phase==='move'){
   const direction=directions[d.moveDirection]||directions[d.direction];d.x+=direction[0]*d.speed*scale;d.y+=direction[1]*d.speed*scale;d.distance+=d.speed*scale;
  }
  let hitFraction=1,hit=false;
  const dx=d.x-before.x,dy=d.y-before.y;
  if(d.phase==='move')for(const [ox,oy,w,h] of thornRects[d.direction]){
   const old={x:before.x+ox,y:before.y+oy,w,h};
   const swept={x:Math.min(before.x,d.x)+ox,y:Math.min(before.y,d.y)+oy,w:w+Math.abs(dx),h:h+Math.abs(dy)};
   for(const b of [...platforms,...boxes])if(overlap(swept,b)){
    let f=0;if(!overlap(old,b)){if(dx>0)f=(b.x-old.x-w)/dx;else if(dx<0)f=(b.x+b.w-old.x)/dx;else if(dy>0)f=(b.y-old.y-h)/dy;else if(dy<0)f=(b.y+b.h-old.y)/dy;}
    hitFraction=Math.min(hitFraction,Math.max(0,f));hit=true;
   }
  }
  d.x=before.x+dx*hitFraction;d.y=before.y+dy*hitFraction;
  for(const [ox,oy,w,h] of thornRects[d.direction]){
   const r={x:Math.min(before.x,d.x)+ox,y:Math.min(before.y,d.y)+oy,w:w+Math.abs(d.x-before.x),h:h+Math.abs(d.y-before.y)};
   for(const p of alive)if(overlap(r,p))dead.add(p.id);
  }
  if(hit){d.phase='fade';d.alpha=1;}
  if(d.x< -200||d.x>width+200||d.y< -200||d.y>height+200){d.phase='fade';d.alpha=1;}
 }
 return {events,deadPlayerIds:[...dead]};
}
function step(state,options){beforeStep(state,options);return afterStep(state,options);}
return {compile,create,solids,hazards,signal,beforeStep,afterStep,step,supportedTypes,thornRects,completePhysicsFidelity:false};
});
