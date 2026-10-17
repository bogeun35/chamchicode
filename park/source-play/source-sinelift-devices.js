/* LiftComponent (stage type "Lift"), reconstructed from the saved Ghidra project
 * (tools/ghidra/decompile.sh 'LiftComponent$$'); no game executed.
 * Initialize 0x1818758f0: speed (+0x28) = 1.0.
 * ParseParameter 0x181875900: amplitude X = slot0 (+ PlayerActorCount * slot2
 *   when |slot2| >= 4), Y = slot1 (+ count * slot3 when |slot3| >= 4); slot4
 *   speed when |slot4| >= 4; slot5 > 0 flag 8 (|sin|, one way); slot6 > 0
 *   flag 0x20 (waits for event 61), otherwise flag 0x10 (running); slot7 != 0
 *   flag 2 (carry on the lower face too); slot8 != 0 flag 1 (collision bit 0x400).
 * .cctor 0x181876400: interval 5.0 (+8), rect (H,W,X,Y) = (18,118,-59,-9).
 * InitCollision 0x181875c20: layer 13 (0xd), flags |4, |0x200 with flag 2.
 * OnUpdate 0x181875d50: a blocked update (flag 4) restores the previous
 *   timer and waits out a push limit (half - 2t, wrapped) on accumulated dt
 *   (only while running); then flag 4 clears and prev = timer; running adds
 *   dt * speed; an external-start lift stops (timer, prev 0, flag 0x10 off)
 *   once the timer reaches half the interval (|sin|) or the interval; the
 *   timer wraps once past the interval; offset = amplitude * Sin(2 pi t / I)
 *   (|.| with flag 8). IsEnableMoveContactActor is asked with that OFFSET as
 *   the direction; refused -> flag 4, else MoveLift.
 * MoveLift 0x181876190: Pos = InitPos + offset; a vertical step of 4 raws or
 *   more carries the upper-face contacts (and the lower face with flag 2).
 *   Horizontal steps reach riders through the collision scene's inertia.
 * OnRecvEvent 0x181876310: event 61 starts an external-start lift.
 */
(function(root,factory){const c=typeof module==='object'&&module.exports;const api=factory(c?require('./source-updownlift-math.js'):root.SourceUpDownLiftMath);if(c)module.exports=api;root.SourceSineLiftDevices=api;})(typeof globalThis!=='undefined'?globalThis:this,function(SinMath){
'use strict';
const F=65536,INTERVAL=5*F,PI=205887,RECT={heightRaw:18*F,widthRaw:118*F,xRaw:-59*F,yRaw:-9*F};
const allowed=(v,c)=>!v||v<0&&c<=-v||v>0&&v<10&&c>=v||v>=10&&c>=Math.trunc(v/10)&&c<=v%10;
const stageFp=v=>Math.trunc(Math.fround(Math.fround(v)*F));
const mul=(a,b)=>Number(BigInt.asIntN(64,BigInt(a)*BigInt(b))>>16n);
// (I * 0x10000 + rounding) >> 17 in the native: I / 2 rounded toward zero
const HALF=Math.trunc(INTERVAL/2);
function slot(a,i){const d=(a.datas||[])[i];return d&&d.t===1?stageFp(d.f):0;}
function compile(actors,count){
 if(!Number.isInteger(count)||count<2||count>8)throw Error('Lift count 2..8 required');
 const lifts=[];
 actors.forEach((raw,i)=>{const a=raw.properties||raw;if(a.typeName!=='Lift'||!allowed(a.playerCount,count))return;
  if((raw.createThreshold??a.createThreshold??0)!==0)throw Error('Lift delayed creation ordering unresolved');
  let ax=slot(a,0),ay=slot(a,1);const px=slot(a,2),py=slot(a,3),sp=slot(a,4);
  if(Math.abs(px)>=4)ax+=count*px;if(Math.abs(py)>=4)ay+=count*py;
  let flags=0;const int=i=>slot(a,i)>>16;
  if(int(5)>0)flags|=8;if(int(6)>0)flags|=0x20;if(!(flags&0x20))flags|=0x10;if(int(7)!==0)flags|=2;if(int(8)!==0)flags|=1;
  lifts.push({id:raw.id||'source:a'+i,name:a.name||'',type:'Lift',initXRaw:stageFp(a.posX??raw.x),initYRaw:stageFp(a.posY??raw.y),
   ampXRaw:ax,ampYRaw:ay,speedRaw:Math.abs(sp)>=4?sp:F,flags,timerRaw:0,prevTimerRaw:0,pushLimitRaw:0,accumRaw:0,offsetXRaw:0,offsetYRaw:0});});
 return {schemaVersion:1,count,lifts,completePhysicsFidelity:false};
}
const create=x=>JSON.parse(JSON.stringify(x));
function offsetFor(l){
 const ratio=Number((BigInt(l.timerRaw)<<16n)/BigInt(INTERVAL)),twice=Number((BigInt(ratio)<<17n)>>16n);
 let s=SinMath.sinRaw(mul(twice,PI));if(l.flags&8)s=Math.abs(s);
 return {xRaw:mul(l.ampXRaw,s),yRaw:mul(l.ampYRaw,s)};
}
/* One OnUpdate. host: {dtRaw, isEnableMoveContactActor(lift, directionRaw) -> bool,
 * moveContactActor(lift, {xRaw:0,yRaw:dy}, face)}. Returns the vertical carry calls made. */
function update(l,host){
 const dt=host.dtRaw??1092;
 let cleared=true;
 if(l.flags&4){
  l.timerRaw=l.prevTimerRaw;
  if(Math.abs(l.pushLimitRaw)<4){const base=l.timerRaw<=HALF?0:HALF;let lim=(l.timerRaw-base)*-2+HALF;if(lim<0)lim=INTERVAL+lim+HALF;l.pushLimitRaw=lim;}
  if(l.flags&0x10)l.accumRaw+=dt;
  if(l.pushLimitRaw<=l.accumRaw)l.timerRaw+=l.pushLimitRaw;else cleared=false;
 }
 if(cleared){l.pushLimitRaw=0;l.accumRaw=0;}
 l.flags&=~4;l.prevTimerRaw=l.timerRaw;
 if(l.flags&0x10){
  l.timerRaw+=mul(dt,l.speedRaw);
  if(l.flags&0x20){const limit=(l.flags&8)?HALF:INTERVAL;if(limit<=l.timerRaw){l.flags&=~0x10;l.prevTimerRaw=0;l.timerRaw=0;}}
 }
 if(INTERVAL<l.timerRaw)l.timerRaw-=INTERVAL;
 const off=offsetFor(l);
 if(!host.isEnableMoveContactActor(l,off)){l.flags|=4;return [];}
 const dy=off.yRaw-l.offsetYRaw;l.offsetXRaw=off.xRaw;l.offsetYRaw=off.yRaw;const calls=[];
 if(Math.abs(dy)>=4){calls.push(host.moveContactActor(l,{xRaw:0,yRaw:dy},0));if(l.flags&2)calls.push(host.moveContactActor(l,{xRaw:0,yRaw:dy},1));}
 return calls;
}
function receiveEvent(l,eventType){if(eventType===61&&(l.flags&0x20)){l.flags|=0x10;return true;}return false;}
function solids(state){return state.lifts.map(l=>({id:l.id,type:'Lift',x:(l.initXRaw+l.offsetXRaw+RECT.xRaw)/F,y:(l.initYRaw+l.offsetYRaw+RECT.yRaw)/F,w:RECT.widthRaw/F,h:RECT.heightRaw/F}));}
return {compile,create,update,receiveEvent,solids,offsetFor,supportedTypes:['Lift'],nativeConstants:{intervalRaw:INTERVAL,rect:RECT},completePhysicsFidelity:false};
});
