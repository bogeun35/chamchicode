/* Source-derived CheckPointComponent; read-only static analysis, no native execution.
   Creator 0x1817ed930 -> ParseParameter 0x1817eda50 -> InitCollision 0x1817edba0.
   RectFP fields are Height,Width,X,Y (metadata offsets minus 16).
   .cctor 0x1817edf72..0x1817edfab: raws 0x400000,0x200000,-0x100000,-0x400000
   => height 64,width 32,x -16,y -64. Layer 10 at 0x1817edc69, trigger=true
   at 0x1817edc4a. OnCollided 0x1817edccf accepts other layer 1 only;
   m_IsChecked must be zero (0x1817edcd5); SeId 24 at 0x1817edcf2.
   Parse writes actor position into GLOBAL CheckPointInfo.Position (0x1817edadd),
   clears its respawn list and unpacks up to 9 vector pairs starting slot 0
   (0x1817edb42..0x1817edb55). UnpackVector2ArrayParam 0x181786800 reads only
   t=1, advances by 2, and STOPS at the first (0,0) pair (0x1817868e6..8f2).
   Thus authored positions exist before activation; contact does not capture players.
   Contact saves StageComponent.m_PlayTime raw (0x1817edd3f/43), sets global
   IsActive (0x1817edd47) and local m_IsChecked (0x1817edd4e), immediately.
   CheckPointInfo also contains GameOverCount; CountGameOver 0x18170ddc8 increments
   it, but OnCollided does not change it. resetCheckPointInfo 0x18184e700 clears
   GameOverCount, IsActive and the list; stale Position/PlayTime are gated by IsActive.
   ActorFactoryComponent.createPlayerSub 0x1816a3b7f gates respawn on IsActive:
   index in list -> authored x,y + QFP.Minus_1 (0x1816a3c3a..c75);
   otherwise -> checkpoint x, checkpoint y - stackIndex*QFP._48 + QFP.Minus_1
   (0x1816a3c80..cc7). Restores PlayTime (0x1816a3cf1), and scroll x =
   max(0,checkpoint.x-QFP._180) (0x1816a3d1c..d2a).
   65536 = FP 16.16 format. 9 is Parse's literal; 48,-1,180 are named QFP
   statics +0x1b8,+0x240,+0x200 consumed at the addresses above.
   Multiple CheckPoints share one global list overwritten at creation; shipped
   stages have one. Multiple-device creation ordering is deliberately refused. */
(function(root,factory){const api=factory();if(typeof module==='object'&&module.exports)module.exports=api;root.SourceCheckpointDevices=api;})(typeof globalThis!=='undefined'?globalThis:this,function(){
'use strict';
const FP_ONE=65536,MAX_POSITIONS=9,PLAYER_LAYER=1,CHECKPOINT_LAYER=10,SE_ID=24;
const RECT=Object.freeze({x:-16,y:-64,w:32,h:64});
const clone=x=>JSON.parse(JSON.stringify(x));
const allowed=(v,c)=>!v||v<0&&c<=-v||v>0&&v<10&&c>=v||v>=10&&c>=Math.trunc(v/10)&&c<=v%10;
function raw(value,label){
 if(!Number.isFinite(value)||!Number.isSafeInteger(value*FP_ONE))throw Error('CheckPoint unresolved float-to-FP conversion: '+label);
 return value*FP_ONE;
}
function compile(actors,count,options={}){
 const checkpoints=[];
 actors.forEach((actor,i)=>{
  const a=actor.properties||actor;
  if(a.typeName!=='CheckPoint'||!allowed(a.playerCount,count))return;
  const p=actor.position||{x:actor.x??actor.posX,y:actor.y??actor.posY};
  const data=actor.datas||actor.parameters||[];
  const n=j=>data[j]&&data[j].t===1?data[j].f:0;
  const positions=[];
  for(let j=0;j<MAX_POSITIONS;j++){
   const xRaw=raw(n(j*2),'datas['+j*2+']'),yRaw=raw(n(j*2+1),'datas['+(j*2+1)+']');
   if(xRaw===0&&yRaw===0)break;
   positions.push({xRaw,yRaw});
  }
  checkpoints.push({id:actor.id||'source:a'+i,name:a.name||'',type:'CheckPoint',
   x:raw(p.x,'position.x')/FP_ONE,y:raw(p.y,'position.y')/FP_ONE,checked:false,positions});
 });
 if(checkpoints.length>1)throw Error('CheckPoint unresolved multiple-device global creation order');
 const c=checkpoints[0];
 const checkpointInfo={isActive:false,gameOverCount:0,playTimeRaw:0,
  position:c?{xRaw:c.x*FP_ONE,yRaw:c.y*FP_ONE}:null,respawnPositions:c?clone(c.positions):[]};
 if(options.checkpointInfo){
  if(!c)throw Error('CheckPoint restore requires a CheckPoint in this stage');
  const saved=options.checkpointInfo;
  if(!Number.isSafeInteger(saved.playTimeRaw)||!Number.isInteger(saved.gameOverCount)||saved.gameOverCount<0||
    typeof saved.isActive!=='boolean'||JSON.stringify(saved.position)!==JSON.stringify(checkpointInfo.position)||
    JSON.stringify(saved.respawnPositions)!==JSON.stringify(checkpointInfo.respawnPositions))
   throw Error('CheckPoint restore does not match compiled stage');
  Object.assign(checkpointInfo,clone(saved));
 }
 return {schemaVersion:1,count,checkpoints,checkpointInfo,completePhysicsFidelity:false};
}
const create=clone;
const solids=()=>[];
const beforeStep=()=>({events:[],solids:[]});
function contact(state,checkpointId,otherLayer,playTimeRaw){
 const c=state.checkpoints.find(x=>x.id===checkpointId);
 if(!c||c.checked||otherLayer!==PLAYER_LAYER)return false;
 if(!Number.isSafeInteger(playTimeRaw)||playTimeRaw<0)throw Error('CheckPoint activation requires exact StageComponent playTimeRaw');
 state.checkpointInfo.playTimeRaw=playTimeRaw;state.checkpointInfo.isActive=true;c.checked=true;
 return true;
}
function afterStep(state,ctx={}){
 const sounds=[],activations=[];
 // A provided contacts array is authoritative, including an empty one. It lets
 // the host use native collision dispatch ordering and exact layer filtering.
 const contacts=ctx.contacts===undefined?state.checkpoints.flatMap(c=>(ctx.players||[]).filter(p=>!p.dead&&!p.exit&&
  p.x<c.x+RECT.x+RECT.w&&p.x+p.w>c.x+RECT.x&&p.y<c.y+RECT.y+RECT.h&&p.y+p.h>c.y+RECT.y)
  .map(p=>({checkpointId:c.id,otherLayer:PLAYER_LAYER,playerId:p.id}))):ctx.contacts;
 for(const hit of contacts)if(contact(state,hit.checkpointId,hit.otherLayer,ctx.playTimeRaw)){
  sounds.push({checkpointId:hit.checkpointId,seId:SE_ID});
  activations.push({checkpointId:hit.checkpointId,checkpointInfo:clone(state.checkpointInfo)});
 }
 return {events:[],solids:[],sounds,activations};
}
function respawn(state,actorIndex,stackIndex=0){
 const info=state.checkpointInfo;if(!info.isActive)return null;
 if(!Number.isInteger(actorIndex)||!Number.isInteger(stackIndex)||stackIndex<0)throw Error('CheckPoint respawn requires native actorIndex and stackIndex');
 const p=actorIndex>=0&&actorIndex<info.respawnPositions.length?info.respawnPositions[actorIndex]:
  {xRaw:info.position.xRaw,yRaw:info.position.yRaw-stackIndex*48*FP_ONE};
 return {actorPosition:{x:p.xRaw/FP_ONE,y:p.yRaw/FP_ONE-1},
  playTimeRaw:info.playTimeRaw,scrollX:Math.max(0,info.position.xRaw/FP_ONE-180)};
}
function displays(state){return state.checkpoints.map(c=>({id:c.id,type:c.type,x:c.x,y:c.y,checked:c.checked,
 collision:{x:c.x+RECT.x,y:c.y+RECT.y,w:RECT.w,h:RECT.h,layer:CHECKPOINT_LAYER,trigger:true}}));}
const integration=Object.freeze({
 tick:'Call afterStep in the collision phase with exact StageComponent playTimeRaw. contacts [{checkpointId,otherLayer,playerId}] is authoritative; without it, players must be live world-space collision rectangles.',
 persistence:'Keep checkpointInfo outside the recreated round, include it in host snapshots, pass compile options.checkpointInfo on retry. Recreated local checked starts false as native component zero initialization does. Clear saved info on a new stage or full reset.',
 restart:'When status becomes dead, snapshot checkpointInfo before recreating all stage actors. If active, use respawn(state,nativeActorIndex,nativeStackIndex) for each player; restore playTimeRaw and scrollX. Returned actorPosition is a native anchor, requiring the runtime player-box conversion, not a top-left box. Reset velocities/other devices through ordinary round creation. Do not restore player current positions, keys or other device state.',
 ordering:'Process checkpoint collision before publishing death/restart; maintain stable native player indices across retries. This module is deliberately not registered in source-stage-runtime.js.',
 limitations:'Fallback player AABB dispatch is a port adapter; exact native contact ordering and edge semantics require the host contacts path. No original view animation/assets or full stage behavior verified.'});
return {compile,create,solids,beforeStep,afterStep,displays,supportedTypes:['CheckPoint'],contact,respawn,integration,
 nativeConstants:Object.freeze({fpOne:FP_ONE,maxPositions:MAX_POSITIONS,rect:RECT,playerLayer:PLAYER_LAYER,checkpointLayer:CHECKPOINT_LAYER,seId:SE_ID}),completePhysicsFidelity:false};
});
