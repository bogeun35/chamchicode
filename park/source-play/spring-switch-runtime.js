(function(root){
'use strict';
// Static first-stage relay reconstruction. Native code is never loaded.
// Input actors may be raw actorCreateParamList or imported source-world actors.
// Contact generation and source-to-web velocity conversion belong to the caller.
// LandmineSwitch belongs here even though its own component is elsewhere: it
// shares its entity with a SwitchComponent, which is what carries the contact
// (LandmineSwitchComponent.GetSwitch 0x18186fba0 reads it through m_EntityRef,
// and the Idle branch 0x18187054b tests that component's m_Flags bit2). Neither
// LandmineSwitchComponent.ParseParameter 0x18186fde0 nor the observer's writes
// m_Direction, so the zero default applies and the box is the plain
// COLLISION_RECT. It has no target, no repeat and no timer of its own; the
// landmine module reads the contact and decides everything else.
const TYPES=new Set(['JumpStand','JumpStandMediator','Switch','DelaySwitch','LandmineSwitch','DeadSwitch']);
const WINDUP=Math.trunc(0.2*65536)/65536;
const RECOVERY=Math.trunc((1/12)*65536)/65536;
const number=(a,i)=>a.datas[i]?.t===1?a.datas[i].f:0;
const string=(a,i)=>a.datas[i]?.t===2?(a.datas[i].s||''):'';
const nativeInteger=n=>Math.floor(n);
// SwitchComponent sensor rectangles, one per direction.
//
// SwitchComponent.GetCollisionByDirection 0x1817145a0 receives the direction in
// r8b and dispatches with `sub r8d,1; je 0x1817146cf` (1), `sub r8d,1; je
// 0x1817146a6` (2), `cmp r8d,1; je 0x181714677` (3); anything else falls through
// to the default path at 0x1817145fe. Each branch reads two 16-byte halves of one
// RectFP out of the class statics at [typeInfo+0xb8]:
//   dir 0 -> +0x20 / +0x30   dir 1 -> +0x40 / +0x50
//   dir 2 -> +0x60 / +0x70   dir 3 -> +0x80 / +0x90
// and the default path additionally tests `byte [param+6] & 1` at 0x181714616
// (that bit is SwitchComponent.ForTopView 0x181714560) and then uses
// +0xa0 / +0xb0 at 0x181714648 instead.
//
// RectFP member order is Height, Width, X, Y (value-type offsets 0/8/16/24,
// i.e. boxed metadata offsets 16/24/32/40 minus 16), so the first half is
// (Height, Width) and the second is (X, Y). That order is the one cross-checked
// in blink-device-report.json against PlayerComponent..cctor 0x1816cba29
// (COLLISION_W=32 / H=46 / X=-16 / Y=-47), and the box is actorPos + (X,Y) with
// size (Width, Height) exactly as actor-runtime.js already does for Player.
//
// SwitchComponent..cctor 0x181715330 writes the table. Q16.16 literals, decoded:
//   +0x20 = 0x90000 (9)              +0x28 = 0x120000 (18)
//   +0x30 = 0xfffffffffff70000 (-9)  +0x38 = 0xfffffffffff70000 (-9)
//     (stores 0x181715455/0x18171544d loaded at 0x181715468 -> 0x1817154dd,
//      0x18171546c/0x181715474 loaded at 0x181715483 -> 0x1817154f5)
//   +0x40 = 9                        +0x48 = 18
//   +0x50 = -9                       +0x58 = 0x20000 (2)
//     (0x18171548f/0x181715487 -> 0x181715533, 0x1817154a6/0x1817154ae -> 0x181715543)
//   +0x60 = 18                       +0x68 = 9
//   +0x70 = -9                       +0x78 = 0xfffffffffff90000 (-7)
//     (0x1817154c5/0x1817154b6 -> 0x181715559, 0x1817154cd/0x1817154d5 -> 0x181715561)
//   +0x80 = 18                       +0x88 = 9
//   +0x90 = 0                        +0x98 = -7
//     (0x1817154ed/0x1817154e1 -> 0x181715577, 0x181715504/0x18171550c -> 0x181715582)
//   +0xa0 = 0xe0000 (14)             +0xa8 = 18
//   +0xb0 = -9                       +0xb8 = 0xfffffffffff20000 (-14)
//     (0x181715523/0x18171551b -> 0x18171559b, 0x18171552b/0x181715537 -> 0x1817155a2)
//
// The static field names in quantum-field-offsets.json confirm the mapping
// independently (SwitchComponent statics, offsets equal the ones above):
//   RESOURCE_PATH 0x00, JUMP_VELO 0x08, ACTOR_DRAW_OFFSET_Y 0x18,
//   COLLISION_RECT 0x20, COLLISION_RECT_DOWN 0x40, COLLISION_RECT_LEFT 0x60,
//   COLLISION_RECT_RIGHT 0x80, COLLISION_RECT_TOPVIEW 0xa0.
// So direction 0 is UP (the plain COLLISION_RECT), 1 is DOWN, 2 is LEFT and
// 3 is RIGHT; the same file gives RectFP as Height 16 / Width 24 / X 32 / Y 40.
// See switch-direction-report.json for the shipped-data cross-check.
const SWITCH_RECTS=Object.freeze({
 0:Object.freeze({x:-9,y:-9,w:18,h:9}),
 1:Object.freeze({x:-9,y:2,w:18,h:9}),
 2:Object.freeze({x:-9,y:-7,w:9,h:18}),
 3:Object.freeze({x:0,y:-7,w:9,h:18})
});
// Only reachable while ForTopView (m_Flags bit0) is set, which both Creators do
// from the stage, not from the actor: NormalSwitchComponent.Creator 0x1818886d5
// `test byte ptr [stage+4],0x40` -> bts bit0 at 0x1818886e0, and
// DelaySwitchComponent.Creator 0x181818f3c the same. That stage bit is
// StageComponent.IsTopViewSort 0x1816a9590, and NOTHING in this build was found
// to set it (SetTopViewSort 0x181709c10 has no call site, and no inlined writer
// of bit6 of dword[stage+4] exists). So it is decoded and recorded but not
// applied; see switch-direction-report.json unresolved.forTopView before
// connecting any top-view stage.
const SWITCH_RECT_FOR_TOPVIEW=Object.freeze({x:-9,y:-14,w:18,h:14});
// ParseParameter stores the direction as a byte (0x181888b89 `mov byte [r15],r12b`
// for Switch slot5, 0x1818193b0 for DelaySwitch slot2) and InitCollision reads it
// unsigned (0x1817147e9 `movzx edi, byte ptr [rbx]`), so reproduce the byte cast.
function switchDirection(value){const i=nativeInteger(value);return ((i%256)+256)%256;}
// Every byte outside 1..3 takes the default (direction 0) path at 0x1817145fe.
function switchRect(direction){return SWITCH_RECTS[direction]||SWITCH_RECTS[0];}
function normalize(a,index){
 if(a.properties)return {id:a.id,sourceIndex:a.sourceIndex,...a.properties,posX:a.position.x,posY:a.position.y,datas:a.parameters};
 return {id:a.id||'source:a'+index,sourceIndex:index,...a};
}
function populationAllowed(v,n){return v===0||v<0&&n<=-v||v>0&&v<10&&n>=v||v>=10&&n>=Math.trunc(v/10)&&n<=v%10;}
// QPlayerCountParam (0x18096f720): 7 int64 LE, each char (code - 0x21) & 0xff.
function countTable(a,i){const s=string(a,i);if(!s)return new Array(7).fill(0);if(s.length!==56)throw new Error('Undecoded population table length at '+a.id+':'+i);
 const b=[...s].map(c=>(c.codePointAt(0)-0x21)&0xff),out=[];for(let e=0;e<7;e++){let v=0n;for(let k=7;k>=0;k--)v=(v<<8n)|BigInt(b[e*8+k]);if(v>=1n<<63n)v-=1n<<64n;out.push(Number(v));}return out;}
// The pair search DeadSwitch.ParseParameter uses: count-2 downward to the first
// index where either table is nonzero (0x181817e6a / 0x181817f56 / 0x181818045).
function pairLookup(a,i,j,count){const A=countTable(a,i),B=countTable(a,j);for(let k=count-2;k>=0;k--)if(A[k]!==0||B[k]!==0)return [A[k],B[k]];return [0,0];}
function zeroOffsets(a,x,y){
 // Exact first-stage encoded tables are 56 exclamation marks. Other grammar
 // remains undecoded; refusing it avoids fabricating population placement.
 for(const i of [x,y])if(string(a,i)!=='!'.repeat(56))throw new Error('Undecoded population offset table at '+a.id+':'+i);
}
function create(actors,count){
 if(!Number.isInteger(count)||count<2||count>8)throw new Error('Player count must be 2 through 8');
 const selected=actors.map(normalize).filter(a=>populationAllowed(a.playerCount||0,count));
 const relays=selected.filter(a=>TYPES.has(a.typeName)).map(a=>{
  const d=i=>number(a,i),s=i=>string(a,i);
  const r={id:a.id,name:a.name||'',type:a.typeName,sourceIndex:a.sourceIndex,x:a.posX,y:a.posY};
  if(a.typeName==='JumpStand'){
   // JumpStandComponent.ParseParameter 0x181868400: slot4 switch type byte,
   // slot5 delay, slot6 appear and slot7 disappear seconds (each kept only when
   // > 0); InitPost 0x181868920: a switch type other than 0 starts visible unless
   // it is type 1. The switch timer runs on FP raws like the native.
   const raw=i=>Math.trunc(Math.fround(Math.fround(d(i))*65536)),switchType=((raw(4)>>>0)>>>16)&0xff;
   if(switchType>3)throw new Error('JumpStand switch type outside 0..3');
   Object.assign(r,{velocity:{x:d(0),y:d(1)},affectAll:(nativeInteger(d(2))>>>0)>0,parent:s(3),keepVelocityX:nativeInteger(d(8))!==0,phase:0,timer:0,
    switchType,count:0,delayRaw:Math.max(0,raw(5)),appearRaw:Math.max(0,raw(6)),disappearRaw:Math.max(0,raw(7)),switchTimerRaw:0,visible:switchType!==1});
  }else if(a.typeName==='Switch'){
   zeroOffsets(a,6,7);
   const direction=switchDirection(d(5));
   Object.assign(r,{direction,rect:switchRect(direction),target:s(0),subtarget:s(3),repeat:(nativeInteger(d(1))>>>0)>0,switchId:nativeInteger(d(2)),timerAddSeconds:d(4),pressed:false,latched:false});
  }else if(a.typeName==='LandmineSwitch'){
   Object.assign(r,{direction:0,rect:switchRect(0),target:'',subtarget:'',repeat:false,
    switchId:0,timerAddSeconds:0,pressed:false,latched:false});
  }else if(a.typeName==='DeadSwitch'){
   // DeadSwitchComponent.ParseParameter 0x181817b60: slot0 the switch direction
   // byte, slots 1/2 a position offset pair, slots 4/5 and 6/7 the two
   // movement vectors event 61 would use (OnRecvEvent 0x181818500), slot10 != 0
   // sets bit1: kill every player instead of the one pressing it.
   const [ox,oy]=pairLookup(a,1,2,count),[ax,ay]=pairLookup(a,4,5,count),[bx,by]=pairLookup(a,6,7,count);
   if([ax,ay,bx,by].some(v=>Math.abs(v)>=4))throw new Error('DeadSwitch movement (event 61 velocity) is not ported: '+a.id);
   const direction=switchDirection(d(0));
   Object.assign(r,{x:a.posX+ox/65536,y:a.posY+oy/65536,direction,rect:switchRect(direction),target:'',subtarget:'',repeat:true,switchId:0,timerAddSeconds:0,
    killAll:nativeInteger(d(10))!==0,pressed:false,latched:false});
  }else if(a.typeName==='DelaySwitch'){
   zeroOffsets(a,3,4);
   const direction=switchDirection(d(2));
   Object.assign(r,{direction,rect:switchRect(direction),target:s(1),subtarget:'',repeat:false,switchId:0,timerAddSeconds:0,delay:d(0)+d(5)*(count-2),remaining:0,pressed:false,latched:false,forceOff:false});
  }
  return r;
 });
 const named=new Set(selected.filter(r=>r.name).map(r=>r.name));
 for(const r of relays)if(r.parent&&!named.has(r.parent)||r.target&&!named.has(r.target))throw new Error('Missing source relay target '+(r.parent||r.target));
 return {count,sourceActorCount:selected.length,relays};
}
/** step(state, dt, facts) mutates the private relay state and returns events.
 * facts.switchContacts: [{relayId, actorId, layer, attributeFlags}]. These are
 * collisions with the directional switch trigger, not rectangle overlaps.
 * A normal switch accepts attributeFlags bit1 and layers 1,2,3,8:
 * SwitchComponent.OnCollided 0x181714f80 skips the filter only for m_Type 1
 * (`cmp byte [this+4],1; je 0x181715048`) and otherwise requires
 * `test byte [collision+3],2` (0x18171502a) plus `layer-1 <= 2 || layer == 8`
 * (0x181715034..0x181715042). The `attributeFlags` key keeps its old name but the
 * field is Collision.m_PushBackTarget (raw +3, boxed 19), written by
 * Collision.initialize 0x181690b08 from each component's CreateCollision
 * argument; `layer` is Collision.m_Layer (raw +1, boxed 17). Player: argument 3
 * at 0x1816bdf4b and `mov byte [rax+1],1` at 0x1816bdf87 -> 3 / layer 1.
 * PushBox: argument 3 at 0x1816db625 and `mov word [rax],0x202` at 0x1816db651
 * -> 3 / layer 2. Both therefore press a switch; the switch's own sensor is
 * layer 5 (0x18171486e) and is never a presser.
 * facts.springContacts: [{relayId, actorId, layer, upContactCount, velocityX}].
 * Supply the spring's UP-face contacts (normal 0,-1), including collision IDs
 * only once. The contacted collision must itself have no UP-face contacts.
 * This deliberately preserves the native top-contact exclusion for stacks.
 * facts.externalEvents: [{targetId, senderType, senderName, on}] is optional.
 * Output impulses carry original source velocity, not web units; apply them
 * using the native Jump event semantics recovered by the integration caller.
 */
function step(state,dt,facts={}){
 if(!Number.isFinite(dt)||dt<0)throw new Error('Finite nonnegative simulation dt required');
 const events=[],impulses=[];
 const byId=new Map(state.relays.map(r=>[r.id,r]));
 const deliver=(r,on,sender)=>{
  events.push({targetId:r.id,senderId:sender.id,on,eventType:on?61:60});
  if(r.type==='JumpStandMediator'&&on){
   for(const spring of state.relays.filter(x=>x.type==='JumpStand'))deliver(spring,true,r);
  }else if(r.type==='JumpStand'&&on&&sender.type==='JumpStandMediator'&&sender.name===r.parent&&r.visible&&r.phase===0)r.phase=1;
  else if(r.type==='JumpStand'&&sender.type!=='JumpStandMediator')jumpStandSignal(r,on?61:60);
 };
 // NormalSwitchComponent.ParseParameter 0x181888a15 reads datas[4] and stores
 // its raw FP value at component+0x20 (m_TimerAddSecond, il2cpp 48) without a
 // sar, and SwitchComponent.NotifyTarget 0x181714e02 loads that field right
 // after GetEventParam and hands it to Frame.NotifyEvent. The payload has to
 // travel with the event: a timer that receives event 61 with payload 0 reads
 // it as 'stop' (OnRecvEvent 0x18172e35e), which froze st_w_05_02's DeadTimer
 // on the first switch instead of extending it.
 const notify=(r,on)=>{for(const name of [r.target,r.subtarget])if(name){const targets=state.relays.filter(x=>x.name===name);if(!targets.length)events.push({targetName:name,senderId:r.id,on,eventType:on?61:60,event:on?61:60,timerAddSecond:r.timerAddSeconds||0});for(const t of targets)deliver(t,on,r);}};
 for(const e of facts.externalEvents||[]){const t=byId.get(e.targetId);if(!t)throw new Error('Unknown relay '+e.targetId);deliver(t,e.on,{id:e.senderId,type:e.senderType,name:e.senderName});}
 // Delay countdown precedes the common switch update in the native handler.
 for(const r of state.relays.filter(x=>x.type==='Switch'||x.type==='DelaySwitch')){
  if(r.type==='DelaySwitch'&&r.remaining>0){r.remaining-=dt;if(r.remaining<=0){r.remaining=0;notify(r,true);r.forceOff=true;}}
  const contact=(facts.switchContacts||[]).some(c=>c.relayId===r.id&&(c.attributeFlags&2)!==0&&[1,2,3,8].includes(c.layer));
  if(contact&&!r.latched){r.latched=true;r.pressed=true;if(r.type==='DelaySwitch')r.remaining=r.delay;else notify(r,true);}
  if(!contact&&r.pressed&&(r.type!=='Switch'||r.repeat)){r.pressed=false;if(r.type==='Switch')notify(r,false);}
  if(r.repeat)r.latched=false;
  if(r.forceOff){r.latched=false;r.forceOff=false;}
 }
 // DeadSwitch: SwitchComponent.OnUpdate turns it on when pressed and off when
 // released; onChangeSwitchState 0x181818b90 acts on the rising edge only -
 // event 26 to the last actor that collided with it, or (bit1) event 19 to
 // every Player with a screen flash.
 for(const r of state.relays.filter(x=>x.type==='DeadSwitch')){
  const on=(facts.switchContacts||[]).filter(c=>c.relayId===r.id&&(c.attributeFlags&2)!==0&&[1,2,3,8].includes(c.layer));
  if(on.length&&!r.pressed){r.pressed=true;events.push(r.killAll?{eventType:19,broadcastActorType:27,senderId:r.id,deadSwitch:true,flash:true}:{eventType:26,targetId:on[on.length-1].actorId,senderId:r.id,deadSwitch:true});}
  else if(!on.length&&r.pressed)r.pressed=false;
 }
 // Native updatePhase does one state transition per update, with no dt carry.
 for(const r of state.relays.filter(x=>x.type==='JumpStand')){
  let fire=false;
  if(!r.parent)fire=r.visible;
  else if(r.phase===1){r.phase=2;r.timer=WINDUP;}
  else if(r.phase===2){r.timer-=dt;if(r.timer<=0){fire=true;r.phase=3;r.timer=RECOVERY;}}
  else if(r.phase===3){r.timer-=dt;if(r.timer<=0)r.phase=0;}
  if(fire)for(const c of facts.springContacts||[]){
   if(c.relayId!==r.id||c.upContactCount>0)continue;
   if(!Number.isInteger(c.upContactCount)||c.upContactCount<0)throw new Error('Verified contacted-collision UP count required');
   impulses.push({relayId:r.id,actorId:c.actorId,eventType:36,velocity:{x:r.keepVelocityX?c.velocityX:(!r.affectAll&&c.layer===1?0:r.velocity.x),y:r.velocity.y},keepVelocityX:r.keepVelocityX});
  }
 }
 // JumpStandComponent.switchProc 0x1818691a0, after the phase update: type 1
 // appears while signalled and disappears a delay after release (not during a
 // jump), type 2 the mirror, type 3 blinks by its appear/disappear seconds.
 const dtRaw=Math.trunc(dt*65536);
 for(const r of state.relays.filter(x=>x.type==='JumpStand'&&x.switchType)){
  if(r.switchType===1){if(r.count>0){r.switchTimerRaw=r.delayRaw;if(!r.visible)r.visible=true;}
   else if(r.visible){r.switchTimerRaw-=dtRaw;if(r.switchTimerRaw<=0&&r.phase===0)r.visible=false;}}
  else if(r.switchType===2){if(r.count>0){r.switchTimerRaw=r.delayRaw;if(r.visible&&r.phase===0)r.visible=false;}
   else if(!r.visible){r.switchTimerRaw-=dtRaw;if(r.switchTimerRaw<=0)r.visible=true;}}
  else{r.switchTimerRaw-=dtRaw;if(r.switchTimerRaw<=0){if(!r.visible){r.visible=true;r.switchTimerRaw=r.appearRaw;}else if(r.phase===0){r.visible=false;r.switchTimerRaw=r.disappearRaw;}}}
 }
 return {events,impulses};
}
// JumpStandComponent.OnRecvEvent 0x181869620: 61 from anything but its parent
// JumpStandMediator (checkParentMediator 0x181869740 returns -1) counts up,
// 60 counts down (not below 0).
function jumpStandSignal(r,type){if(type===61){r.count=(r.count+1)<<24>>24;return true;}if(type===60){if(r.count>0)r.count--;return true;}return false;}
const api={create,step,jumpStandSignal,WINDUP,RECOVERY,SWITCH_RECTS,SWITCH_RECT_FOR_TOPVIEW,switchRect,switchDirection};
if(typeof module!=='undefined'&&module.exports)module.exports=api;
root.SourceSpringSwitch=api;
})(typeof globalThis!=='undefined'?globalThis:this);
