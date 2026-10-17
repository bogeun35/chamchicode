/* PlayerMagnetComponent (actor ordinal 72), reconstructed from the saved Ghidra
 * project (tools/ghidra/decompile.sh 'PlayerMagnetComponent$$'); no game executed.
 * Supersedes the partial source-magnet-devices.js, whose refusal named exactly
 * the pieces read here: candidate ordering, event 16 acceptance and the
 * caught-relative physics.
 *
 * Statics (.cctor 0x1816d2be0): +8 18.5 / +0x10 -17.5 magnet offset from the
 * owner; rect (H,W,X,Y) at +0x38 = (80,110,20,-44) built from +0x18..+0x30;
 * +0x68 .03 / +0x78 .08 approach rates, +0x70 1 / +0x80 2 snap thresholds,
 * +0x88 = 18.5 + 8.25 = 26.75 hold distance, +0x90 0, +0x98 32 catch reset,
 * +0xa0 40 cone limit (degrees).
 *
 * Frame order (ActorUpdater.InvokeUpdate 0x18177a1a0 + per-type wrapper
 * 0x1806ee2a0): each entity runs OnUpdate1, its component OnUpdate, then
 * ActorComponent.OnUpdate2 (pos += velo) before the next entity; types run in
 * registration order and Player (116th) is before PlayerMagnet (171st). So a
 * target the magnet moves has already integrated this frame, and its own
 * caught OnUpdate_Default zeroes its velocity next frame: one displacement per
 * frame, never two.
 *  - OnUpdate 0x1816d0480 -> update 0x1816d05c0 (guarded by flag 0x10 so a
 *    chained call cannot run it twice): isInputOn 0x1816d0770 (input 9 HELD,
 *    PlayerComponent.IsEnableInput), then captureProc 0x1816d0940.
 *  - captureProc: candidates = what the magnet's collision (layer 14) collided
 *    with in the last collision phase, filtered in OnCollided 0x1816d27a0 to
 *    actors with IsEnableCatch (actor flag 0x10000: Player Initialize, ColorBox,
 *    PushBox) whose direction from the OWNER satisfies |n.y| < Sin(40deg).
 *    No target + input: captureTarget 0x1816d1e00 sorts by squared distance to
 *    the owner (<>c__DisplayClass70_0.<captureTarget>b__0 0x1816d3240) and
 *    sends event 16 (param+0x79 = 1) to each until one returns > 0.
 *    Target + input + still a candidate: suckTarget 0x1816d13e0. Otherwise
 *    releaseTarget 0x1816d12e0 (event 16 with 0x79 = 0). A caught Player's own
 *    magnet is then updated in the same call (chain).
 *  - suckTarget: dest = getTargetDestPos 0x1816d1ac0 (owner Pos.y; Pos.x +
 *    26.75 - rect.x facing right, - 26.75 - rect.x - rect.w facing left);
 *    per axis err = dest - (target.pos + ownerVelo); beyond the threshold the
 *    step is sign * max(threshold, |err| * rate) and the frame is not a snap,
 *    within it the step is err; then + ownerVelo. Flag bit0 (caught) doubles
 *    both rates and is set once a frame snaps on both axes; checkCatch
 *    0x1816d2450 clears it when the target strays more than 32 from dest.
 *    A side / up contact zeroes that axis. target.pos += step.
 *  - Player event 16 (OnRecvEvent_Default 0x1816c6600): refused only when
 *    already caught twice and asked to catch; else SetCatched 0x1816bcdf0
 *    (first catch 0x800, second 4|8; release clears all) and velo = 0. A
 *    caught player's OnUpdate_Default returns after zeroing its velocity.
 *  - OnPost 0x1816d20f0: syncPlayerPos 0x1816d0120 (magnet = owner Pos +
 *    (18.5 * facing, -17.5); collision rect flipped with the owner), checkCatch.
 */
(function(root,factory){const c=typeof module==='object'&&module.exports;const api=factory(c?require('./source-distanceconstraint-math.js'):root.SourceDistanceConstraintMath,c?require('./source-updownlift-math.js'):root.SourceUpDownLiftMath);if(c)module.exports=api;root.SourcePlayerMagnetDevices=api;})(typeof globalThis!=='undefined'?globalThis:this,function(DMath,SinMath){
'use strict';
const F=65536;
const C=Object.freeze({offsetXRaw:1212416,offsetYRaw:-1146880,rect:{heightRaw:80*F,widthRaw:110*F,xRaw:20*F,yRaw:-44*F},
 rateXRaw:1966,rateYRaw:5242,snapXRaw:F,snapYRaw:2*F,holdXRaw:1753088,holdYRaw:0,catchResetRaw:32*F,limitDegRaw:40*F});
const allowed=(v,c)=>!v||v<0&&c<=-v||v>0&&v<10&&c>=v||v>=10&&c>=Math.trunc(v/10)&&c<=v%10;
const stageFp=v=>Math.trunc(Math.fround(Math.fround(v)*F));
const mul=(a,b)=>Number(BigInt.asIntN(64,BigInt(a)*BigInt(b))>>16n);
const absR=v=>v<0?-v:v,signR=v=>v<0?-F:F;
// OnCollided: Sin(limit * 0x477 >> 16) through the native Sin 0x1816465d0.
function coneLimitRaw(){if(!SinMath)throw Error('PlayerMagnet needs the native Sin table (source-updownlift-math.js)');return SinMath.sinRaw(mul(C.limitDegRaw,0x477));}
function compile(actors,count){
 if(!Number.isInteger(count)||count<2||count>8)throw Error('PlayerMagnet count 2..8 required');
 const magnets=[];
 actors.forEach((raw,i)=>{const a=raw.properties||raw;if(a.typeName!=='PlayerMagnet'||!allowed(a.playerCount,count))return;
  if((raw.createThreshold??a.createThreshold??0)!==0)throw Error('PlayerMagnet delayed creation ordering unresolved');
  const d=(a.datas||[])[0];const owner=d&&d.t===1?stageFp(d.f)>>16:0; // ParseParameter 0x1816cfe14..26: sar 16
  if(owner>=count)return; // absent player: Creator returns (0x1816cfea5)
  magnets.push({id:raw.id||'source:a'+i,name:a.name||'',ownerIndex:owner,targetId:null,caught:false,input:false,
   updated:false,magnetXRaw:null,magnetYRaw:null,candidates:[]});});
 return {schemaVersion:1,count,magnets,completePhysicsFidelity:false};
}
const create=x=>JSON.parse(JSON.stringify(x));
// getTargetDestPos: owner anchor + hold distance, target rect aware.
function destOf(owner,target){
 const y=owner.yRaw+C.holdYRaw;
 const x=owner.facingLeft?owner.xRaw-C.holdXRaw-target.rect.xRaw-target.rect.widthRaw:owner.xRaw+C.holdXRaw-target.rect.xRaw;
 return {xRaw:x,yRaw:y};
}
// suckTarget's per-axis approach step (FP raws). Returns {dxRaw,dyRaw,snap}.
function approach(m,owner,target){
 let rx=C.rateXRaw,ry=C.rateYRaw;if(m.caught){rx=rx*2;ry=ry*2;}
 const dest=destOf(owner,target);let snap=true;
 let ex=dest.xRaw-(target.xRaw+owner.vxRaw),dx;
 if(absR(ex)>C.snapXRaw){snap=false;dx=mul(Math.max(C.snapXRaw,mul(absR(ex),rx)),signR(ex));}else dx=ex;
 dx+=owner.vxRaw;
 let ey=dest.yRaw-(target.yRaw+owner.vyRaw),dy;
 if(absR(ey)>C.snapYRaw){snap=false;dy=mul(Math.max(C.snapYRaw,mul(absR(ey),ry)),signR(ey));}else dy=ey;
 dy+=owner.vyRaw;
 return {dxRaw:dx,dyRaw:dy,snap};
}
// syncPlayerPos: magnet position and its (flipped) collision rect.
function magnetPos(owner){return {xRaw:owner.xRaw+(owner.facingLeft?-C.offsetXRaw:C.offsetXRaw),yRaw:owner.yRaw+C.offsetYRaw};}
function tractorRect(m,facingLeft){
 const r=C.rect,x=facingLeft?-(r.widthRaw+r.xRaw):r.xRaw;
 return {x:(m.magnetXRaw+x)/F,y:(m.magnetYRaw+r.yRaw)/F,w:r.widthRaw/F,h:r.heightRaw/F};
}
// OnCollided filter: catchable and inside the +-40 degree cone from the owner.
function inCone(owner,other){
 const dx=other.xRaw-owner.xRaw,dy=other.yRaw-owner.yRaw;
 const n=(dx===0&&dy===0)?{xRaw:0,yRaw:0}:DMath.normalizeRaw({xRaw:dx,yRaw:dy});
 return absR(n.yRaw)<coneLimitRaw();
}
/* One frame. world:
 *  actors(): [{id,index|null,isPlayer,catchable,xRaw,yRaw,rect,facingLeft,vxRaw,vyRaw,
 *            canInput,inputHeld,exited}]  (Pos is the anchor; rect is H/W/X/Y raws)
 *  catchEvent(id, catching) -> int (event 16 result, > 0 accepted)
 *  contacted(id, face) -> bool   face 'left'|'right'|'up', map or actor
 *  moveTarget(id, dxRaw, dyRaw)  (position add; the host keeps collisions sane)
 */
function update(state,world){
 const actors=world.actors(),byId=new Map(actors.map(a=>[a.id,a]));
 const owners=new Map(actors.filter(a=>a.isPlayer).map(a=>[a.index,a]));
 for(const m of state.magnets)m.updated=false;
 const magnetOfPlayer=new Map(state.magnets.map(m=>[owners.get(m.ownerIndex)&&owners.get(m.ownerIndex).id,m]));
 function runMagnet(m){
  if(m.updated)return;m.updated=true; // flag 0x10
  const owner=owners.get(m.ownerIndex);if(!owner)return;
  m.input=!!(owner.canInput&&owner.inputHeld&&!owner.exited);
  let target=m.targetId?byId.get(m.targetId):null;if(target&&target.exited)target=null;
  if(!target){
   if(m.targetId)m.targetId=null;
   if(m.input&&m.candidates.length){
    const cand=m.candidates.map(id=>byId.get(id)).filter(Boolean);
    const d2=a=>{const dx=a.xRaw-owner.xRaw,dy=a.yRaw-owner.yRaw;return mul(dy,dy)+mul(dx,dx);};
    cand.sort((a,b)=>d2(a)-d2(b)); // List.Sort with the distance comparison; ties keep list order
    for(const c of cand){if(world.catchEvent(c.id,true)>0){m.targetId=c.id;target=c;break;}}
   }
  }else if(m.input&&m.candidates.includes(target.id)){
   const step=approach(m,owner,target);
   if(!m.caught)m.caught=step.snap;
   let dx=step.dxRaw,dy=step.dyRaw;
   if(world.contacted(target.id,dx>0?'right':'left'))dx=0;
   if(dy<0&&world.contacted(target.id,'up'))dy=0;
   world.moveTarget(target.id,dx,dy);
   target.xRaw+=dx;target.yRaw+=dy;
  }else{
   world.catchEvent(target.id,false);m.targetId=null;m.caught=false;target=null;
  }
  // a caught player's own magnet runs now (chained update)
  if(target&&target.isPlayer){const tm=magnetOfPlayer.get(target.id);if(tm&&tm!==m)runMagnet(tm);}
 }
 for(const m of state.magnets)runMagnet(m);
}
// Collision phase: the tractor rect (last OnPost position) against actors.
function collide(state,world){
 const actors=world.actors(),owners=new Map(actors.filter(a=>a.isPlayer).map(a=>[a.index,a]));
 for(const m of state.magnets){m.candidates=[];const owner=owners.get(m.ownerIndex);
  if(!owner||m.magnetXRaw===null||owner.exited)continue;
  const r=tractorRect(m,owner.facingLeft);
  for(const a of actors){if(a===owner||!a.catchable||a.exited)continue;
   const b={x:(a.xRaw+a.rect.xRaw)/F,y:(a.yRaw+a.rect.yRaw)/F,w:a.rect.widthRaw/F,h:a.rect.heightRaw/F};
   if(r.x<b.x+b.w&&r.x+r.w>b.x&&r.y<b.y+b.h&&r.y+r.h>b.y&&inCone(owner,a))m.candidates.push(a.id);}
 }
}
// OnPost: syncPlayerPos, then checkCatch.
function post(state,world){
 const actors=world.actors(),byId=new Map(actors.map(a=>[a.id,a])),owners=new Map(actors.filter(a=>a.isPlayer).map(a=>[a.index,a]));
 for(const m of state.magnets){const owner=owners.get(m.ownerIndex);if(!owner)continue;
  const p=magnetPos(owner);m.magnetXRaw=p.xRaw;m.magnetYRaw=p.yRaw;m.facingLeft=!!owner.facingLeft;
  const t=m.targetId&&byId.get(m.targetId);
  if(m.caught&&t){const d=destOf(owner,t),dx=d.xRaw-t.xRaw,dy=d.yRaw-t.yRaw;
   const dist=DMath.sqrtRaw(mul(dy,dy)+mul(dx,dx)); // FP sqrt 0x181640c40
   if(dist>C.catchResetRaw)m.caught=false;}
 }
}
function displays(state){return state.magnets.map(m=>({id:m.id,ownerIndex:m.ownerIndex,targetId:m.targetId,input:m.input,caught:m.caught,
 xRaw:m.magnetXRaw,yRaw:m.magnetYRaw,facingLeft:!!m.facingLeft,rect:m.magnetXRaw===null?null:tractorRect(m,!!m.facingLeft)}));}
return {compile,create,update,collide,post,displays,destOf,approach,inCone,coneLimitRaw,magnetPos,tractorRect,
 supportedTypes:['PlayerMagnet'],nativeConstants:C,completePhysicsFidelity:false,
 integration:{order:'update() after the players updated (Player type runs before PlayerMagnet), collide() in the collision phase, post() in OnPost.',
  players:'Caught players (SetCatched) skip their own movement: velocity 0, no gravity, no walking; they can still hold their magnet.'}};
});
