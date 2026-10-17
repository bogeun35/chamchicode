/* Static recovery, GameAssembly.dll base 0x180000000; no native execution.
 * Dossun.ParseParameter 0x18181ccc0: slots 1 accel, 2 wait, 3 return,
 * slot 4 integer flag. Initialize 0x18181cc70/90/a9: QFP[140]/[f0]/[120]
 * = 5/1/2.5 (quantum-field-offsets.json).
 * updatePhase 0x18181d3c0: phases 0..4; accel is PER UPDATE, return is
 * PER UPDATE, only waiting subtracts Frame.DeltaTime (0x18181d4b3).
 * Native rectangles are four FP fields, not assumed screen AABBs:
 * .cctor 0x18181d9c8..da45: [170,458,-229,-182], [194,442,-221,-194].
 * Gun.ParseParameter 0x1818932f0: actor index slot 0, speed slot 1;
 * Initialize 0x1818932e0 defaults QFP[150] = 6.
 * Gun.OnUpdate 0x181893630/63a/67e: inactive bit 3, outstanding bullet,
 * press input 9. createBullet 0x181893962 spawns actor type 162.
 * Bullet.OnCollided 0x181892b25..bc0: actor 27, different player index,
 * then PlayerBlockComponent.Creator 0x181891200; implemented in companion.
 * Actor.Initialize 0x18169ccfa rdata0x182e87af0 scale raws (65536,65536).
 * BaseScale is StageComponent+0x10 (0x18169cd02), supplied by the host.
 * Round2: collision byte+4 is m_Index (NOT collision type); byte+1 is layer.
 * See report correction history. Shared native movement remains a runtime hook.
 */
(function(root,factory){const api=factory(typeof module==='object'&&module.exports?require('./source-playerblock-devices.js'):root.SourcePlayerBlockDevices);if(typeof module==='object'&&module.exports)module.exports=api;root.SourceDossunDevices=api;})(typeof globalThis!=='undefined'?globalThis:this,function(blocks){
'use strict';
const FP=65536; // Quantum FP 16.16, FP.FromFloat_UNSAFE 0x18163fc40.
const supportedTypes=['Dossun','PlayerBlockGun'];
const allowed=(v,c)=>!v||v<0&&c<=-v||v>0&&v<10&&c>=v||v>=10&&c>=Math.trunc(v/10)&&c<=v%10; // ActorFactory.Update 0x1816a2fe9.
function decodeActor(raw){
 const a=raw.properties||raw,d=raw.datas||raw.parameters||[],p=raw.position||{x:raw.x??raw.posX,y:raw.y??raw.posY};
 const n=i=>d[i]&&d[i].t===1?d[i].f:0;
 const common={type:a.typeName,name:a.name||'',x:p.x,y:p.y};
 if(a.typeName==='Dossun')return {...common,accelRaw:fp(n(1)||5),waitRaw:fp(n(2)||1),returnRaw:fp(n(3)||2.5),retriggerOnReturn:Math.floor(fp(n(4))/FP)!==0};
 if(a.typeName==='PlayerBlockGun')return {...common,actorIndex:Math.floor(fp(n(0))/FP),bulletSpeedRaw:fp(n(1)||6)};
 return null;
}
function compile(actors,count,options){
 if(!blocks)throw Error('PlayerBlock module dependency missing');
 if(options&&options.actorScaleRaw!==undefined&&(!Number.isSafeInteger(options.actorScaleRaw)||options.actorScaleRaw<=0))throw Error('Invalid actorScaleRaw');
 const devices=[];
 actors.forEach((raw,i)=>{if(!allowed((raw.properties||raw).playerCount,count))return;const d=decodeActor(raw);if(!d)return;
  devices.push({...d,id:raw.id||'source:a'+i,xRaw:fp(d.x),yRaw:fp(d.y),initialYRaw:fp(d.y),vxRaw:0,vyRaw:0,
   scaleXRaw:FP,scaleYRaw:FP,actorScaleRaw:options&&options.actorScaleRaw!==undefined?options.actorScaleRaw:null,phase:0,face:0,timerRaw:0,sensorRectRaw:null,bulletId:null,equipped:false,inactive:false});
 });
 return {schemaVersion:2,count,devices,bullets:[],nextBulletId:0,playerBlocks:blocks.compile([],count),previousInput9:{},completePhysicsFidelity:false};
}
// Established loader chain 0x180554310 -> FP.FromString_UNSAFE -> float32.
function fp(v){if(!Number.isFinite(v))throw Error('Invalid authored FP value');return Math.trunc(Math.fround(Math.fround(v)*FP));}
const create=c=>JSON.parse(JSON.stringify(c));
const rect=(height,width,x,y)=>({height:height*FP,width:width*FP,x:x*FP,y:y*FP});
const DOSSUN_RECT=rect(170,458,-229,-182),THORN_RECT=rect(194,442,-221,-194); // cctor 0x18181d9c8..da45.
const BULLET_RECT=rect(10,10,-5,-5); // 0x181892d98..dd1.
function solids(state){
 const out=blocks.solids(state.playerBlocks);
 for(const d of state.devices.filter(d=>d.type==='Dossun')){
  if(d.actorScaleRaw===null)throw Error('Dossun requires resolved StageComponent actorScaleRaw (Actor.Initialize 0x18169cd02)');
  for(const [collisionIndex,collisionKind,r] of [[0,3,DOSSUN_RECT],[1,0,THORN_RECT],[2,1,d.sensorRectRaw]])if(r)out.push({id:d.id+':'+collisionIndex,actorId:d.id,actorType:157,collisionIndex,layer:collisionIndex===2?14:8,collisionKind,...blocks.rectAt(d,r),fpRaw:true});
 }
 for(const b of state.bullets)if(!b.disappearing)out.push({id:b.id,actorId:b.id,actorType:162,layer:7,collisionKind:1,...blocks.rectAt(b),fpRaw:true});
 return out;
}
// createSensor 0x18181d225 out argument's Y, clamp >=0 (254..27b),
// H=(1 / effective scaleY)*moveY +8 (2f4..316), Y=0 (2b8).
function sensorFromMove(moveYRaw,effectiveScaleYRaw){
 if(!Number.isSafeInteger(moveYRaw)||!Number.isSafeInteger(effectiveScaleYRaw)||effectiveScaleYRaw===0)throw Error('Dossun sensor requires native Map.Move FP output and nonzero effective scaleY');
 return {...DOSSUN_RECT,height:blocks.mul(blocks.div(FP,effectiveScaleYRaw),Math.max(0,moveYRaw))+8*FP,y:0};
}
function prepareSensor(d,mapMove){
 if(d.actorScaleRaw===null)throw Error('Dossun requires resolved StageComponent actorScaleRaw (Actor.Initialize 0x18169cd02)');
 if(typeof mapMove!=='function')throw Error('Dossun requires ctx.mapMoveDossunSensor(request): {moveYRaw}');
 const response=mapMove({actor:JSON.parse(JSON.stringify(d)),rectRaw:{...DOSSUN_RECT},collisionKind:1,collisionFlagsClear:64,dxRaw:0,dyRaw:10000*FP}); // 0x18181d16e/182.
 d.sensorRectRaw=sensorFromMove(response.moveYRaw,blocks.mul(d.scaleYRaw,d.actorScaleRaw));return d.sensorRectRaw;
}
function collideDossun(d,c){
 const events=[];
 if(c.collisionIndex===1&&c.otherLayer===1)events.push({targetId:c.otherId,senderId:d.id,eventType:19}); // 0x18181d6bf..703; keep immortal handling in recipient.
 if(c.collisionIndex===2&&[27,163].includes(c.otherActorType)&&(d.phase===0||d.phase===4&&d.retriggerOnReturn)){
  if(!d.sensorRectRaw)throw Error('Dossun sensor not prepared');
  if(blocks.div(d.yRaw-d.initialYRaw,d.sensorRectRaw.height)<=FP/2)d.phase=1; // 0x18181d658..6a3.
 }
 return {events};
}
function contactDossun(d,c){
 if(d.phase!==1)return {events:[],sounds:[]};
 const events=c.otherId!=null&&c.contactYRaw>0&&c.otherLayer===1?[{targetId:c.otherId,senderId:d.id,eventType:19}]:[]; // +8, 0x18181d7e0..846.
 d.phase=2;return {events,sounds:[{actorId:d.id,seId:6}],cameraShakeRaw:fp(0.2)}; // QFP[68], 0x18181d8b7.
}
function inputEdges(state,players,ctx){
 const pressed={};for(const p of players){const on=!!(ctx.input9||{})[p.id];pressed[p.id]=ctx.pressed9?!!ctx.pressed9[p.id]:on&&!state.previousInput9[p.id];state.previousInput9[p.id]=on;}return pressed;
}
function spawnBullet(state,g,p){
 for(const k of ['xRaw','yRaw','scaleXRaw','scaleYRaw','actorScaleRaw'])if(!Number.isSafeInteger(p[k]))throw Error('Gun requires resolved player FP field '+k);
 const sx=blocks.mul(p.scaleXRaw,p.actorScaleRaw),sy=blocks.mul(p.scaleYRaw,p.actorScaleRaw),sign=p.flipH?-1:1;
 const b={id:'blockbullet:'+state.nextBulletId++,type:'PlayerBlockGunBullet',actorType:162,gunId:g.id,playerIndex:p.playerIndex,colorIndex:p.colorIndex,
  xRaw:p.xRaw+sign*blocks.mul(sx,10*FP),yRaw:p.yRaw+(p.flipV?-1:1)*blocks.mul(sy,-7*FP), // QFP[170]=10/[158]=7, 0x1818940e5/105.
  vxRaw:sign*blocks.mul(sx,g.bulletSpeedRaw),vyRaw:0,scaleXRaw:p.scaleXRaw,scaleYRaw:p.scaleYRaw,actorScaleRaw:p.actorScaleRaw,
  rectRaw:{...BULLET_RECT},disappearing:false,timerRaw:0};state.bullets.push(b);g.bulletId=b.id;return b;
}
function requestDisappear(b){if(b.disappearing)return false;b.disappearing=true;b.vxRaw=0;b.vyRaw=0;b.timerRaw=FP/2;return true;} // 0x181892c47..c8c/QFP[90].
function collideBullet(state,b,c,players){
 if(!requestDisappear(b))return {events:[]};
 const p=players.find(p=>p.id===c.otherId);
 if(c.otherActorType!==27||!p||p.playerIndex===b.playerIndex)return {events:[]};
 const made=blocks.attach(state.playerBlocks,p);return {events:made?[made.event]:[],sounds:[{actorId:b.id,seId:9}]};
}
function exitBullet(state,b){state.bullets=state.bullets.filter(q=>q.id!==b.id);const g=state.devices.find(g=>g.id===b.gunId);if(g)g.bulletId=null;} // OnExit 0x181892977.
function beforeStep(state,ctx={}){
 const dt=ctx.dt===undefined?1/60:ctx.dt;if(!Number.isFinite(dt)||dt<0)throw Error('Invalid device delta');
 const players=ctx.players||[],pressed9=inputEdges(state,players,ctx),events=[],sounds=[],equipment=[];
 for(const d of state.devices){
  if(d.type==='Dossun'){
   if(ctx.stageActorScaleRaw!==undefined){if(!Number.isSafeInteger(ctx.stageActorScaleRaw)||ctx.stageActorScaleRaw<=0)throw Error('Invalid stageActorScaleRaw');d.actorScaleRaw=ctx.stageActorScaleRaw;}
   if(!d.sensorRectRaw)prepareSensor(d,ctx.mapMoveDossunSensor);updatePhase(d,d,Math.trunc(dt*FP));
  }
  else{
   const p=players.find(p=>p.actorIndex===d.actorIndex);if(!p)continue;
   if(!d.equipped){equipment.push({playerId:p.id,gunId:d.id,holdGun:true});d.equipped=true;}
   d.xRaw=p.xRaw+(p.flipH?-1:1)*blocks.mul(blocks.mul(p.scaleXRaw,p.actorScaleRaw),21*FP);
   d.yRaw=p.yRaw+(p.flipV?-1:1)*blocks.mul(blocks.mul(p.scaleYRaw,p.actorScaleRaw),-10*FP); // 0x18189407f/0c5.
   if(!d.inactive&&!d.bulletId&&pressed9[p.id]){spawnBullet(state,d,p);sounds.push({actorId:d.id,seId:20});}
  }
 }
 const blockResult=blocks.beforeStep(state.playerBlocks,{...ctx,dt,players,pressed9});events.push(...blockResult.events);sounds.push(...blockResult.sounds);
 for(const b of [...state.bullets]){
  if(b.disappearing){b.timerRaw-=Math.trunc(dt*FP);if(b.timerRaw<=0)exitBullet(state,b);}
  else {
   if(!ctx.cameraAreaRaw)throw Error('Flying bullet requires ctx.cameraAreaRaw from native camera stage area');
   const r=ctx.cameraAreaRaw;if(!Number.isSafeInteger(r.x)||!Number.isSafeInteger(r.width))throw Error('Invalid cameraAreaRaw');
   if(b.xRaw<r.x-10*FP||b.xRaw>=r.x+r.width+10*FP)exitBullet(state,b);
  } // 0x181892884..8d9; horizontal only.
 }
 return {events,sounds,equipment,solids:solids(state)};
}
// Runtime calls this between Update and OnPost, in native actor order. Hook
// owns ActorComponent movement and ordered map/actor contact discovery (brief17).
// No dt scaling or AABB contact substitutes are inferred in this module.
function moveActors(state,moveDeviceActor){
 const actors=[...state.devices.filter(d=>d.type==='Dossun'),...state.bullets,...state.playerBlocks.blocks.filter(b=>b.phase<2)];
 if(actors.length&&typeof moveDeviceActor!=='function')throw Error('Requires runtime moveDeviceActor(actor, collisionDescriptors)');
 for(const a of actors)moveDeviceActor(a,solids(state).filter(s=>(s.actorId||s.id)===a.id));
}
function afterStep(state,ctx={}){
 const events=[],sounds=[],shakes=[],players=ctx.players||[];
 for(const c of ctx.contacts||[]){
  const d=state.devices.find(d=>d.id===c.actorId&&d.type==='Dossun'),b=state.bullets.find(b=>b.id===c.actorId);
  const result=d?(c.callback==='OnContacted'?contactDossun(d,c):collideDossun(d,c)):b?(c.callback==='OnContacted'?(requestDisappear(b),{events:[]}):collideBullet(state,b,c,players)):null;
  if(result){events.push(...result.events);sounds.push(...result.sounds||[]);if(result.cameraShakeRaw!==undefined)shakes.push(result.cameraShakeRaw);}
 }
 const post=blocks.afterStep(state.playerBlocks,ctx);return {events,sounds,shakes,actorPushes:post.actorPushes,playerPositions:post.playerPositions,solids:solids(state)};
}
function displays(state){return [...state.devices.map(d=>({...d,x:d.xRaw/FP,y:d.yRaw/FP})),...state.bullets.map(b=>({...b,box:blocks.rectAt(b)})),...blocks.displays(state.playerBlocks)];}
// Exact component-only phase update; caller supplies native actor FP fields.
// It deliberately does not implement ActorComponent movement or collisions.
function updatePhase(d,actor,dtRaw){
 switch(d.phase){
  case 1:actor.vyRaw+=d.accelRaw;break; // 0x18181d535
  case 2:actor.vxRaw=0;actor.vyRaw=0;d.timerRaw=d.waitRaw;d.phase=3;d.face=1;break; // 0x18181d502..517
  case 3:d.timerRaw-=dtRaw;if(d.timerRaw<=0){d.phase=4;d.face=0;}break; // 0x18181d490..4e8
  case 4:actor.yRaw=Math.max(actor.initialYRaw,actor.yRaw-d.returnRaw);if(actor.yRaw===actor.initialYRaw)d.phase=0;break; // 0x18181d451..484
 }
}
return {compile,create,solids,beforeStep,afterStep,displays,supportedTypes,decodeActor,updatePhase,fp,sensorFromMove,prepareSensor,collideDossun,contactDossun,spawnBullet,collideBullet,requestDisappear,exitBullet,moveActors,
 nativeConstants:{collisionRectFields:[170,458,-229,-182],thornCollisionRectFields:[194,442,-221,-194]},
 integration:{status:'component_hooks_ready_unregistered',input:'ctx.players resolved FP snapshots; input9 held map or pressed9 native edge map; apply equipment output via Equip/SetHoldGun.',dependency:'Load source-playerblock-devices.js first. Apply targeted events65/66 with native Player.OnRecvEvent behavior.',collision:'Update -> moveActors(state, runtime moveDeviceActor) -> afterStep ordered contacts -> playerPositions. mapMoveDossunSensor returns Map.Move output Y; contacts use native collisionIndex and otherLayer. cameraAreaRaw required for camera exit.'},completePhysicsFidelity:false};
});

