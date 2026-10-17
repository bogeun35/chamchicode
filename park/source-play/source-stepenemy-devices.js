/* StepEnemy (actor 33), 2-1 / 7-1, reconstructed from the saved Ghidra project
 * ('StepEnemyComponent$$'); no game executed. Component offsets =
 * quantum-field-offsets.json - 0x10 (m_IsDisableAttack +0, m_Dir +0x10).
 *  .cctor 0x18170f4e0: SPEED 1.0 (per update; OnUpdate2 adds Velo without dt),
 *   COLLISION_RECT (H,W,X,Y) = (26,48,-24,-27).
 *  Creator 0x18170e9a0 / ParseParameter 0x18170eb10: slot0 (raw >> 16) >= 1 ->
 *   m_Dir.x = -1, else +1. InitCollision 0x18170eb80: pushBack 3 (map and
 *   actors), layer 8. InitPost: actor flag 0x200, animation 2.
 *  OnUpdate 0x18170ed10: invisible (actor flag 8) -> Velo.y 0; on the ground
 *   (checkFall 0x18170ee40: collider 0 contacted on face 1) with Velo.y >= 0:
 *   Velo = (Dir.x * SPEED, 0); |Velo.x| > 3 raw -> Dir.x = sign(Velo.x) (and the
 *   sprite); Velo.y += Frame.GetGravity.
 *  OnContacted 0x18170f0c0: map (type 0) with |normal.x| >= 4 -> Dir = -Dir;
 *   actor (type 1): normal.y < 0 (the other above) -> event 36 to it (jump
 *   request, +0x48 = -334234 = -5.1 px per update), else a layer-1 actor gets
 *   event 43; then |normal.x| > 3 and checkCollision 0x18170f350 (not: same
 *   direction with the other at least as fast) -> Dir = -Dir.
 */
(function(root,factory){const api=factory();if(typeof module==='object'&&module.exports)module.exports=api;root.SourceStepEnemyDevices=api;})(typeof globalThis!=='undefined'?globalThis:this,function(){
'use strict';
const F=65536,SPEED=F,RECT={heightRaw:26*F,widthRaw:48*F,xRaw:-24*F,yRaw:-27*F},STOMP_JUMP=-334234;
const clone=v=>JSON.parse(JSON.stringify(v));
const allowed=(v,c)=>!v||v<0&&c<=-v||v>0&&v<10&&c>=v||v>=10&&c>=Math.trunc(v/10)&&c<=v%10;
const fp=v=>Math.trunc(Math.fround(Math.fround(v)*F));
const mul=(a,b)=>Number(BigInt.asIntN(64,BigInt(a)*BigInt(b))>>16n);
function compile(actors,count){
 if(!Number.isInteger(count)||count<2||count>8)throw Error('StepEnemy count 2..8 required');
 const enemies=[];
 actors.forEach((raw,i)=>{const a=raw.properties||raw;if(a.typeName!=='StepEnemy'||!allowed(a.playerCount,count))return;
  if((raw.createThreshold??a.createThreshold??0)!==0)throw Error('StepEnemy delayed creation ordering unresolved');
  const d=(a.datas||[])[0],s0=d&&d.t===1?fp(d.f):0;
  enemies.push({id:raw.id||'source:a'+i,name:a.name||'',type:'StepEnemy',xRaw:fp(a.posX??raw.x),yRaw:fp(a.posY??raw.y),dirXRaw:(s0>>16)>=1?-F:F,dirYRaw:0,
   veloRaw:{xRaw:0,yRaw:0},grounded:false,flipLeft:false,animation:2,gone:false});
 });
 return {schemaVersion:1,count,enemies,completePhysicsFidelity:false};
}
const create=clone;
function update(e,{gravityRaw,invisible=false}){
 if(e.gone)return;
 if(invisible)e.veloRaw.yRaw=0;
 if(e.grounded&&e.veloRaw.yRaw>=0){e.veloRaw={xRaw:mul(e.dirXRaw,SPEED),yRaw:0};}
 if(Math.abs(e.veloRaw.xRaw)>3){e.dirXRaw=e.veloRaw.xRaw<0?-F:F;e.flipLeft=e.dirXRaw<0;}
 e.veloRaw.yRaw+=gravityRaw;
}
const flip=e=>{e.dirXRaw=-e.dirXRaw;e.dirYRaw=-e.dirYRaw;e.flipLeft=e.dirXRaw<0;};
// normalRaw: the contact normal handed to the enemy (towards the other body).
function contactMap(e,normalRaw){if(Math.abs(normalRaw.xRaw)>=4)flip(e);}
// other: {layer, veloXRaw}. Returns the event sent to the other actor or null.
function contactActor(e,normalRaw,other){
 let event=null;
 if(normalRaw.yRaw<0)event={eventType:36,jumpRaw:{xRaw:0,yRaw:STOMP_JUMP}};
 else if(other.layer===1)event={eventType:43};
 if(Math.abs(normalRaw.xRaw)>3){const u=other.veloXRaw,l=e.veloRaw.xRaw;
  const same=(BigInt.asIntN(64,BigInt(u)*BigInt(l))&~0xffffn)>0n,keep=same&&Math.abs(l)-Math.abs(u)<1;if(!keep)flip(e);}
 return event;
}
function rect(e){return {x:(e.xRaw+RECT.xRaw)/F,y:(e.yRaw+RECT.yRaw)/F,w:RECT.widthRaw/F,h:RECT.heightRaw/F};}
function displays(state){return state.enemies.filter(e=>!e.gone).map(e=>({id:e.id,...rect(e),left:e.flipLeft}));}
return {compile,create,update,contactMap,contactActor,rect,displays,supportedTypes:['StepEnemy'],nativeConstants:{SPEED,RECT,STOMP_JUMP},completePhysicsFidelity:false};
});
