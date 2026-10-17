/* PlayerBlockComponent static recovery; no native execution.
 * Creator 0x181891282 creates actor163, not a component on the player entity.
 * Initialize 0x181891524 rejects player state3. 0x18189152e..592 copies
 * collision rect H,W,X,Y, sets W=H and X=-H/2 (QFP[118]=2).
 * 0x1818915e0 collision bytes 2,2; bit7. 0x18189161f..63e stores a
 * separate probe rect H+2,Y-1; cctor 0x181892025 margin QFP[f0]=1.
 * 0x1818916c7 copies position; scale/sorting/flip copied at 68e..6af.
 * 0x1818916cd..6f1 event65 flags +74=1,+78=1,+79=1: hide/pause player,
 * request key return, player flag10 (Player.OnRecvEvent 0x1816c12e8..1399).
 * updatePhase 0x18189187f checks input9 EDGE, not a time limit. event66
 * returns position/velocity (0x1818918fd..929), hides block, waits QFP[50]
 * raw6553 (0.1), then destruction bit13 (0x1818919e9). Collision stays
 * active during that delay: there is no SetCollisionActive call here.
 * OnPost 0x181891b49 forces attached player position to block position.
 * OnCollided 0x181891bbb layer1: compare floor(center*10), then push
 * other actor by min(abs(edge penetration),1) separately in X and Y.
 * eyeProc 0x181891a51..aa6: held input6 ->255, else input7 ->1 or0.
 * All runtime actor coordinates and rectangles below are FP raws; supplying
 * real player geometry and native actor movement is required, never guessed.
 */
(function(root,factory){const api=factory();if(typeof module==='object'&&module.exports)module.exports=api;root.SourcePlayerBlockDevices=api;})(typeof globalThis!=='undefined'?globalThis:this,function(){
'use strict';
const FP=65536,RELEASE_RAW=6553;
const clone=x=>JSON.parse(JSON.stringify(x));
function raw(n,label){if(!Number.isSafeInteger(n))throw Error('PlayerBlock requires FP raw '+label);return n;}
const mul=(a,b)=>Number((BigInt(a)*BigInt(b))>>16n);
const div=(a,b)=>{if(!b)throw Error('FP division by zero');return Number((BigInt(a)<<16n)/BigInt(b));};
function compile(actors,count){
 if(actors.some(a=>(a.properties||a).typeName==='PlayerBlock'))throw Error('PlayerBlock is dynamic: use attach with resolved player collision geometry');
 return {schemaVersion:1,count,blocks:[],nextId:0,completePhysicsFidelity:false};
}
const create=clone;
function attach(state,p){
 if(p.playerState===3)return null; // Initialize 0x181891524.
 if(typeof p.id!=='string'||!Number.isInteger(p.playerState)||!Number.isInteger(p.playerIndex)||!Number.isInteger(p.colorIndex)||!Number.isInteger(p.sortingOrder))throw Error('PlayerBlock requires resolved player identity/state/sorting metadata');
 const r=p.rectRaw;if(!r)throw Error('PlayerBlock requires resolved player rectRaw H,W,X,Y');
 for(const k of ['height','width','x','y'])raw(r[k],'rect.'+k);
 for(const k of ['xRaw','yRaw','scaleXRaw','scaleYRaw','vxRaw','vyRaw','actorScaleRaw'])raw(p[k],k);
 const rectRaw={height:r.height,width:r.height,x:-div(r.height,2*FP),y:r.y};
 const b={id:'playerblock:'+state.nextId++,type:'PlayerBlock',actorType:163,playerId:p.id,playerIndex:p.playerIndex,colorIndex:p.colorIndex,
  xRaw:p.xRaw,yRaw:p.yRaw,vxRaw:0,vyRaw:0,scaleXRaw:p.scaleXRaw,scaleYRaw:p.scaleYRaw,actorScaleRaw:p.actorScaleRaw,
  sortingOrder:p.sortingOrder,flipH:!!p.flipH,rectRaw,probeRectRaw:{...rectRaw,height:r.height+2*FP,y:r.y-FP},
  phase:0,timerRaw:0,visible:true,eyeDirection:0};
 state.blocks.push(b);return {block:b,event:{targetId:p.id,senderId:b.id,eventType:65,pause:true,visible:false,nativeFlag24:true,returnKey:true,playerBlock:true}};
}
function rectAt(a,r=a.rectRaw){
 const sx=mul(a.scaleXRaw,a.actorScaleRaw),sy=mul(a.scaleYRaw,a.actorScaleRaw);
 const x=a.xRaw+mul(r.x,sx),y=a.yRaw+mul(r.y,sy),w=mul(r.width,sx),h=mul(r.height,sy);
 return {x:Math.min(x,x+w),y:Math.min(y,y+h),width:Math.abs(w),height:Math.abs(h)};
}
function solids(state){return state.blocks.filter(b=>b.phase<2).map(b=>({id:b.id,actorId:b.id,type:b.type,actorType:163,attribute:2,layer:2,collisionKind:3,collisionFlags:128,...rectAt(b),fpRaw:true}));}
function collisionPush(blockRect,otherRect,category){
 if(category!==1)return {xRaw:0,yRaw:0};
 const center=(r,k,size)=>Math.floor((r[k]+Math.floor(r[size]/2))*10/FP);
 const axis=(k,size)=>{
  const c=center(blockRect,k,size),o=center(otherRect,k,size);
  if(o===c)return 0;
  const penetration=o>c?blockRect[k]+blockRect[size]-otherRect[k]:otherRect[k]+otherRect[size]-blockRect[k];
  return (o>c?1:-1)*Math.min(Math.abs(penetration),FP);
 };
 return {xRaw:axis('x','width'),yRaw:axis('y','height')};
}
function beforeStep(state,{dt=1/60,players=[],pressed9={},heldInputs={}}={}){
 if(!Number.isFinite(dt)||dt<0)throw Error('Invalid device delta');
 const events=[],sounds=[];
 for(const b of state.blocks){
  if(b.phase===0){
   const p=players.find(p=>p.id===b.playerId);if(!p)continue;
   const held=heldInputs[p.id]||[];b.eyeDirection=held.includes(6)?255:held.includes(7)?1:0;
   if(pressed9[p.id]){
    events.push({targetId:b.playerId,senderId:b.id,eventType:66,xRaw:b.xRaw,yRaw:b.yRaw,vxRaw:b.vxRaw,vyRaw:b.vyRaw,pause:false,restorePosition:true,playerBlock:false});
    sounds.push({actorId:b.id,seId:8});b.playerId=null;b.visible=false;b.timerRaw=RELEASE_RAW;b.phase=1;
   }
  }else if(b.phase===1){b.timerRaw-=Math.trunc(dt*FP);if(b.timerRaw<=0)b.phase=2;}
 }
 return {events,sounds,solids:solids(state)};
}
function afterStep(state,{contacts=[]}={}){
 const actorPushes=[];
 for(const c of contacts){const b=state.blocks.find(b=>b.id===c.actorId&&b.phase<2);if(b&&c.otherRectRaw)actorPushes.push({actorId:c.otherId,...collisionPush(rectAt(b),c.otherRectRaw,c.otherLayer)});}
 return {events:[],actorPushes,playerPositions:state.blocks.filter(b=>b.playerId).map(b=>({playerId:b.playerId,xRaw:b.xRaw,yRaw:b.yRaw})),solids:solids(state)};
}
function displays(state){return state.blocks.filter(b=>b.phase<2).map(b=>({...b,box:rectAt(b)}));}
return {compile,create,attach,solids,beforeStep,afterStep,displays,collisionPush,rectAt,mul,div,supportedTypes:[],nativeConstants:{releaseRaw:RELEASE_RAW,marginRaw:FP},completePhysicsFidelity:false};
});
