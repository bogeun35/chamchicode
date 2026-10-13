/* Source-derived MoveWall + SpeedSwitch. Static analysis only; no game execution.
 * Creator mapping: ordinal 23 -> 0x181885800; 96 -> 0x1817089b0.
 * MoveWall fields, boxed offsets minus 16: state +0, pushBackCount +1,
 * height +0x10, moveWidth +0x18, timer +0x20, triggerWidth +0x28,
 * offsetPos +0x30, RectFP +0x40 (Height,Width,X,Y).
 * .cctor 0x1818861d0, independently decoded by resolve-string-literals:
 * move/trigger defaults 50 @0x1818862bf/2d5; width 18 @0x1818862eb;
 * height 260 @0x181886301; idle/wait/return-start 1.5 seconds
 * @0x181886317/32d/359; move 2 pixels/TICK @0x181886343;
 * return 1.5 pixels/TICK @0x18188636f. No dt scaling of movement.
 * ParseParameter 0x1818859c0 slots 0/1/2 -> move/trigger/height;
 * abs(raw)>=4 overrides defaults @0x181885a97/aaf/ac7.
 * Rect: h=height-2,w=18-2,x=-w/2,y=-1-h @0x181885adc..b54.
 * InitCollision: solid layer4, push-target2, collision flag bit4
 * @0x181885bf3..c24; sensor extends horizontally by abs(triggerWidth),
 * shifting x by min(triggerWidth,0) @0x181885c28..cb1.
 * OnUpdate 0x181885cd0 accumulates FP DeltaTime only while timer<100
 * @0x181885d40. States 0 idle,1 wait,2 outward,3 return. Outward
 * moves by signed 2 until STRICTLY beyond moveWidth @0x181885ec4;
 * return waits1.5 then moves toward zero, clamping on crossing @e1c..e31.
 * It sets actor.Pos = actor.InitPos + offset @0x181885fa5..fd2:
 * actor raw +0x80 is InitPos, NOT current position (metadata confirmed).
 * Failed IsEnableMoveContactActor restores old offset @0x181885f7e.
 * Successful motion calls MoveContactActor face2/3 @0x181886018/06e,
 * recursive=true, ignore target velocity=true @0x18169dce6/0x181885fec.
 * Preflight recursively rejects a contacted actor blocked on map
 * @0x1816a1991..1a08; it does not emit Dead. No speculative crush kill.
 * OnPushedBack stores resolvedPos-InitPos and sets count1 only if zero
 * @0x1818860e2..10f; next update increments1->2 and skips movement,
 * following update clears2->0 and resumes @0x181885d6f..e53.
 * Trigger layer1 only, state<=1 and timer>=1.5 -> state2,timer0
 * @0x18188615f..1b2. Trigger contacts do NOT reset a young timer.
 *
 * SpeedSwitch Parse 0x181708cc0: slot0 raw speed scale @0x181708dfe,
 * slot1 integer !=0 -> all players @0x181708e05, slot2 direction byte
 * @0x181708e23, repeat bit7 @0x181708e30. Slots3/4 population tables:
 * 0x18096f720 decodes 7 signed little endian FP raws; paired search
 * downward from count-2 stops when EITHER coordinate is nonzero
 * @0x181708f04..f18 (different from separate per-axis fallback).
 * Shares a SwitchComponent; Creator calls InitCollision @0x181708ca7.
 * Rect table is SwitchComponent..cctor 0x181715330, already recovered
 * in spring-switch-runtime.js; no new collision dimensions invented.
 * OnUpdate checks PRIOR contact bit2 and last collision layer1 then emits
 * event57 payload+0x50=speed scale @0x181709133..1bd; all-player mode
 * targets actor type27, otherwise contacting entity. Every held tick emits,
 * before common Switch.OnUpdate clears contact @0x1817091ec.
 * OnCollided/OnRecvEvent delegate to common Switch @0x1817092cc/394.
 * Common filter push-target bit1, layers1/2/3/8 @0x18171502a..042;
 * stores LAST accepted collision @0x18171505e. Reset47 clears contact
 * and sets flag5 @0x1817152f7..313; flag5 becomes6 for one update,
 * suppressing collisions during both updates @0x181714a37..51.
 * Player default event57 handler clamps raw to [0x1999,0x30000]
 * @0x1816c6858..878 then InitWalkSpeed 0x1816bec10 sets walk and ice
 * max from stage walk-speed and ice multiplier. Jump/gravity unchanged.
 * InitWalkSpeed: scale*Stage.m_BaseScale (+0x10), sar16 @0x1816bec85/91;
 * multiply QPlayerDefine.SPEED_X=QFP._3 (raw196608), sar16
 * @0x1816becb4/b9; store walk @0x1816becbd; multiply Stage.m_IceSpeedUp
 * (+0x50), sar16/store ice max @0x1816becc4/c9/cd. SPEED_X is copied
 * from QFP+0x128 @0x18177e300/307, NOT QFP+8 (earlier report corrected).
 *
 * This is a facts-driven native device core, not an invented AABB solver.
 * compile refuses MoveWall unless nativeContactFacts:true explicitly opts
 * into the contract documented in integration. Functions never enter state;
 * JSON snapshots contain only integer raws and ordinary values.
 */
(function(root,factory){const api=factory();if(typeof module==='object'&&module.exports)module.exports=api;root.SourceMoveWallDevices=api;})(typeof globalThis!=='undefined'?globalThis:this,function(){
'use strict';
const FP=65536,EPSILON=4; // FP16.16; abs tolerance 0x181885a97.
const C=Object.freeze({moveDefaultRaw:3276800,triggerDefaultRaw:3276800,widthRaw:1179648,
 heightDefaultRaw:17039360,waitRaw:98304,idleRaw:98304,returnStartRaw:98304,
 moveSpeedRaw:131072,returnSpeedRaw:98304,timerCapRaw:6553600,
 speedMinRaw:6553,speedMaxRaw:196608,playerSpeedXRaw:196608}); // Addresses in header.
const clone=v=>JSON.parse(JSON.stringify(v));
const allowed=(v,c)=>!v||v<0&&c<=-v||v>0&&v<10&&c>=v||v>=10&&c>=Math.trunc(v/10)&&c<=v%10;
function raw(v,label){if(!Number.isFinite(v))throw Error('Invalid FP '+label);const r=Math.trunc(v*FP);if(!Number.isSafeInteger(r))throw Error('Unsafe FP '+label);return r;}
function table(slot){
 if(!slot||slot.t!==2||typeof slot.s!=='string')throw Error('SpeedSwitch population table missing');
 let s=slot.s;if(s.length===58&&s[0]==='"'&&s[57]==='"')s=s.slice(1,-1);
 if(s.length!==56)throw Error('SpeedSwitch population table must contain 56 units');
 const a=[];for(let i=0;i<7;i++){let n=0n;for(let b=7;b>=0;b--)n=(n<<8n)|BigInt((s.charCodeAt(i*8+b)-33)&255);n=BigInt.asIntN(64,n);const v=Number(n);if(!Number.isSafeInteger(v))throw Error('Unsafe population FP');a.push(v);}return a;
}
function pairedOffset(xs,ys,count){for(let i=count-2;i>=0;i--)if(xs[i]||ys[i])return {xRaw:xs[i],yRaw:ys[i]};return {xRaw:0,yRaw:0};}
// Switch .cctor 0x18171544d..582: (x,y,w,h) by direction.
const RECTS=[{x:-9,y:-9,w:18,h:9},{x:-9,y:2,w:18,h:9},{x:-9,y:-7,w:9,h:18},{x:0,y:-7,w:9,h:18}];
function compile(actors,count,options={}){
 if(!Number.isInteger(count)||count<2||count>8)throw Error('Player count must be 2 through 8');
 if(options.topView===true)throw Error('MoveWall/SpeedSwitch top-view collision integration is unverified');
 const walls=[],switches=[];
 actors.forEach((a,i)=>{
  const p=a.properties||a,type=p.typeName;if(!['MoveWall','SpeedSwitch'].includes(type)||!allowed(p.playerCount,count))return;
  const pos=a.position||{x:a.x??a.posX,y:a.y??a.posY},d=a.datas||a.parameters||[],n=j=>d[j]?.t===1?d[j].f:0;
  const base={id:a.id||'source:a'+i,name:p.name||'',type,xRaw:raw(pos.x,'x'),yRaw:raw(pos.y,'y')};
  if(type==='MoveWall'){
   if(options.nativeContactFacts!==true)throw Error('MoveWall requires verified native recursive contact adapter (nativeContactFacts:true); current stage runtime has no adapter');
   const parameter=(j,fallback)=>{const r=raw(n(j),'MoveWall slot '+j);return Math.abs(r)>=EPSILON?r:fallback;};
   const moveWidthRaw=parameter(0,C.moveDefaultRaw),triggerWidthRaw=parameter(1,C.triggerDefaultRaw),heightRaw=parameter(2,C.heightDefaultRaw);
   const hRaw=heightRaw-2*FP,wRaw=C.widthRaw-2*FP;
   if(hRaw<=0)throw Error('MoveWall nonpositive collision height is unverified');
   walls.push({...base,moveWidthRaw,triggerWidthRaw,heightRaw,rect:{xRaw:-wRaw/2,yRaw:-FP-hRaw,wRaw,hRaw},
    state:0,timerRaw:0,offsetXRaw:0,offsetYRaw:0,pushBackCount:0,blocked:false});
  }else{
   const offset=pairedOffset(table(d[3]),table(d[4]),count),direction=Math.floor(n(2))&255;
   switches.push({...base,xRaw:base.xRaw+offset.xRaw,yRaw:base.yRaw+offset.yRaw,direction,
    speedScaleRaw:raw(n(0),'speed'),allPlayers:Math.floor(n(1))!==0,
    flags:128,contact:null,pressed:false,rect:clone(RECTS[direction]||RECTS[0])});
  }
 });
 return {schemaVersion:1,count,walls,switches,nativeContactFacts:options.nativeContactFacts===true,completePhysicsFidelity:false};
}
// Pure event57 receiver. The runtime supplies native stage factors in current
// speed state; existing derived speeds are replaced, never compounded.
function applyPlayerSpeedEvent(current,event){
 if((event.eventType??event.event)!==57)throw Error('Player speed receiver requires event 57');
 for(const [name,value] of Object.entries({speedScaleRaw:event.speedScaleRaw,stageBaseScaleRaw:current.stageBaseScaleRaw,iceSpeedUpRaw:current.iceSpeedUpRaw}))
  if(!Number.isSafeInteger(value))throw Error('Player speed receiver requires safe integer '+name);
 // Native imul64 wraps before arithmetic sar16; BigInt avoids JS rounding.
 const multiply=(a,b)=>{const r=Number(BigInt.asIntN(64,BigInt(a)*BigInt(b))>>16n);
  if(!Number.isSafeInteger(r))throw Error('Unsafe player speed result');return r;};
 const speedScaleRaw=Math.max(C.speedMinRaw,Math.min(C.speedMaxRaw,event.speedScaleRaw));
 const walkSpeedRaw=multiply(multiply(speedScaleRaw,current.stageBaseScaleRaw),C.playerSpeedXRaw);
 const walkSpeedMaxOnIceRaw=multiply(walkSpeedRaw,current.iceSpeedUpRaw);
 return {...current,speedScaleRaw,walkSpeedRaw,walkSpeedMaxOnIceRaw};
}
const create=clone;
function wallRect(w,sensor=false){const r=w.rect;return {id:w.id,type:'MoveWall',x:(w.xRaw+w.offsetXRaw+r.xRaw+(sensor?Math.min(w.triggerWidthRaw,0):0))/FP,
 y:(w.yRaw+w.offsetYRaw+r.yRaw)/FP,w:(r.wRaw+(sensor?Math.abs(w.triggerWidthRaw):0))/FP,h:r.hRaw/FP,layer:sensor?0:4};}
const solids=s=>s.walls.map(w=>wallRect(w));
function signal(s,e){let found=false;for(const sw of s.switches){if(!(e.broadcast===true||e.broadcastActorType===96||e.targetId===sw.id||(e.targetName??e.target)===sw.name))continue;
 if((e.eventType??e.event)===47){if(sw.flags&4){sw.flags=(sw.flags|32)&~4;sw.contact=null;}found=true;}}return found;}
function beforeStep(s,ctx={}){
 const dt=ctx.dt??1/60;if(!Number.isFinite(dt)||dt<0)throw Error('Invalid device delta');
 // Fail before mutating: native preflight and contact movement are a shared
 // collision-system responsibility. No guessed teleport or crush substitute.
 if(s.walls.length&&(typeof ctx.isEnableMoveContactActor!=='function'||typeof ctx.moveContactActor!=='function'))throw Error('MoveWall native contact adapter callbacks are required');
 for(const e of ctx.events||[])signal(s,e);
 const events=[],motions=[];const dtRaw=raw(dt,'dt');
 for(const w of s.walls){
  if(w.timerRaw<C.timerCapRaw)w.timerRaw+=dtRaw;
  w.blocked=false;
  if(w.pushBackCount===1){w.pushBackCount=2;continue;}if(w.pushBackCount>1)w.pushBackCount=0;
  const oldX=w.offsetXRaw,oldY=w.offsetYRaw;let next=oldX,step=0;
  if(w.state===1&&w.timerRaw>=C.waitRaw){w.state=2;w.timerRaw=0;}
  else if(w.state===2){step=Math.sign(w.moveWidthRaw)*C.moveSpeedRaw;next+=step;if(Math.abs(next)>Math.abs(w.moveWidthRaw)){w.state=3;w.timerRaw=0;}}
  else if(w.state===3&&w.timerRaw>=C.returnStartRaw){step=-Math.sign(w.moveWidthRaw)*C.returnSpeedRaw;next+=step;
   // 0x181885e1c..e27: imul64, test product,-0x10000; jg keeps
   // returning. Preserve the native mask as well as its signed overflow.
   const product=BigInt.asIntN(64,BigInt(next)*BigInt(w.moveWidthRaw));
   if((product&-65536n)<=0n){next=0;w.state=1;w.timerRaw=0;}}
  const delta={xRaw:next-oldX,yRaw:0};
  // Native calls preflight even for zero delta; it returns false below epsilon.
  const enabled=ctx.isEnableMoveContactActor({wallId:w.id,delta,face:0,collisionIndex:0});
  if(typeof enabled!=='boolean')throw Error('MoveWall preflight must return boolean');
  if(!enabled){w.blocked=Math.abs(delta.xRaw)>=EPSILON;continue;}
  w.offsetXRaw=next;
  const motion={wallId:w.id,delta,face:step>0?3:2,position:{xRaw:w.xRaw+next,yRaw:w.yRaw+oldY},
   options:{isEnableSyncCollisionPos:true,isEnableIgnoreTargetVelo:true,isEnableRecursive:true,isEnableAttached:false,recursiveFaceIsMov:false,calcScreenEnd:false,collisionIndex:0,targetCollisionLayerMask:0}};
  ctx.moveContactActor(motion);motions.push(motion);
 }
 for(const sw of s.switches){
  if((sw.flags&4)&&sw.contact?.layer===1){const e={senderId:sw.id,eventType:57,speedScaleRaw:sw.speedScaleRaw,speedScale:sw.speedScaleRaw/FP};
   if(sw.allPlayers)e.broadcastActorType=27;else e.targetId=sw.contact.actorId;events.push(e);}
  // Switch.OnUpdate: previous reset flag5 becomes6, clear6 otherwise;
  // repeated contact is consumed, not latched forever.
  const hadReset=!!(sw.flags&32);sw.flags&=~(32|64);if(hadReset)sw.flags|=64;
  sw.pressed=!!(sw.flags&4);sw.flags&=~4;sw.contact=null;
 }
 return {events,motions,solids:solids(s),deadPlayerIds:[]};
}
function afterStep(s,ctx={}){
 for(const e of ctx.events||[])signal(s,e);
 for(const c of ctx.wallContacts||[]){const w=s.walls.find(w=>w.id===c.wallId);if(w&&c.layer===1&&w.state<=1&&w.timerRaw>=C.idleRaw){w.state=2;w.timerRaw=0;}}
 for(const c of ctx.wallPushBacks||[]){const w=s.walls.find(w=>w.id===c.wallId);if(!w)continue;
  if(!Number.isSafeInteger(c.positionXRaw)||!Number.isSafeInteger(c.positionYRaw))throw Error('MoveWall pushed-back position must be FP raws');
  w.offsetXRaw=c.positionXRaw-w.xRaw;w.offsetYRaw=c.positionYRaw-w.yRaw;if(w.pushBackCount===0)w.pushBackCount=1;}
 for(const c of ctx.switchContacts||[]){const sw=s.switches.find(sw=>sw.id===(c.switchId??c.relayId));if(!sw||!(c.attributeFlags&2)||![1,2,3,8].includes(c.layer)||sw.flags&96)continue;
  if(c.layer===1&&typeof c.actorId!=='string')throw Error('SpeedSwitch contacting player id missing');
  sw.flags|=4;sw.contact={actorId:c.actorId??null,layer:c.layer};}
 return {events:[],solids:solids(s),deadPlayerIds:[]};
}
function displays(s){return {walls:s.walls.map(w=>({...wallRect(w),state:w.state,timerRaw:w.timerRaw,blocked:w.blocked,trigger:wallRect(w,true)})),
 switches:s.switches.map(sw=>({id:sw.id,name:sw.name,type:sw.type,x:sw.xRaw/FP,y:sw.yRaw/FP,direction:sw.direction,rect:clone(sw.rect),pressed:sw.pressed,speedScale:sw.speedScaleRaw/FP,allPlayers:sw.allPlayers}))};}
return {compile,create,solids,beforeStep,afterStep,displays,signal,table,pairedOffset,applyPlayerSpeedEvent,supportedTypes:['MoveWall','SpeedSwitch'],nativeConstants:C,
 integration:{compile:'MoveWall requires options.nativeContactFacts:true. Until the native recursive adapter is available, compile throws rather than claiming st_w_12_04 runs.',
 contacts:'afterStep consumes wallContacts [{wallId,layer}], wallPushBacks [{wallId,positionXRaw,positionYRaw}], switchContacts [{switchId or relayId,actorId,layer,attributeFlags}]. These must be original collision facts, including native contact order; not arbitrary overlaps.',
 motion:'beforeStep needs ctx.isEnableMoveContactActor(request) -> boolean and ctx.moveContactActor(request). Preflight must be pure; move applies contact-chain displacement after wall target is committed. All coordinates and deltas are FP raws. Neither callback is serialized.',
 speed:'Call applyPlayerSpeedEvent(current, event57) with current.stageBaseScaleRaw (Stage raw+0x10) and current.iceSpeedUpRaw (Stage raw+0x50). It returns a new state with walkSpeedRaw and walkSpeedMaxOnIceRaw, preserving other fields. Route outgoing event57 to entity or actor type27. Player default handler clamps scale to raw6553..196608 then recalculates walk and ice max (InitWalkSpeed); do not multiply existing speed or change jump. No speed reset is sent on release.',
 order:'Update reads previous collision phase contacts; afterStep records the current collision phase. Common switch state is consumed after speed notification.'},completePhysicsFidelity:false};
});
