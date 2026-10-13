/* Static reconstruction of DamageRect and LinePathLift parameter parsing.
 * Native rail motion and DamageRect event dispatch; collision graph operations
 * are explicit host calls. No game ran. External-start fake rails are refused.
 *
 * Loader: convertActorCreateParam 0x180554274 copies tag; 0x18055427c
 * loads authored f as float32; 0x180554281 calls convertFP 0x180554310;
 * 0x180554291 stores the returned qword at entry+0x18.
 * convertFP 0x180554369 formats that float with null format and culture;
 * 0x180554373 calls FP.FromString_UNSAFE 0x18163fcb0. Its Double.Parse
 * call 0x18163fd41 is followed by cvtsd2ss 0x18163fd46 and the tail call
 * to FromFloat_UNSAFE 0x18163fd51. mulss 0x18163fc6d multiplies by
 * 65536.0f (0x182e87660), cvttss2si 0x18163fc7e truncates toward zero.
 * Stage float32 string round trip is an Established fact in AGENTS.md;
 * stageFpRaw reproduces the returned Single multiply and signed truncate.
 *
 * Creator table: DamageRect ordinal 9, site 0x181775d9a;
 * LinePathLift ordinal 103, site 0x181776446 (resolved delegates JSON).
 * DamageRect ParseParameter 0x18180df1a / 0x18180df40 reads width/height;
 * negative width shifts create X at 0x18180df69 and becomes positive.
 * RectFP order is Height, Width, X, Y. Stores 0x18180dfa3/0x18180dfa8
 * give (height, abs(width), 0, -height).
 *
 * LinePathLift ParseParameter 0x1818785b0:
 * [4] speed raw 0x1818786f6; [5] mode sar 0x181878746;
 * [6] external start sar 0x181878777; [7] ride percent sar 0x1818787ca;
 * [8] line flag sar 0x1818787a4; [9] width growth sar 0x1818786d1;
 * [30] base width sar 0x1818786a2; [31] speed growth raw 0x181878722.
 * count = GetPlayerIndexCount, 0x1818787e7. Speed defaults to raw 65536
 * if abs(base)<4, else max(0,base+(count-2)*growth), 0x181878992..9b4.
 * Width defaults to 118 if <1 (0x181878841), then adds (count-2)*[9]
 * at 0x181878a75. Height 18, offsetY -9: 0x181878a55/0x181878a63.
 * OffsetX = -floor(baseWidth/2)-floor(widthGrowth/2), stores 0x181878ac4.
 * Mode 0..5: remainder by 3 (0x181878800..815), inertia = mode<3.
 * Mode 6: remainder 2, waitInEndPoint 1, inertia 1 (0x181878825..82c).
 * Mode>6: native retains authored mode (0x181878830).
 * Ride requirement: default 1 if [7]<=0 (0x181878a0c), otherwise
 * ceil(count*trunc(percent*65536/100)/65536), 0x181878a13..a4e;
 * storage truncates to a byte at 0x181878a4e.
 * Paths: UnpackVector2ArrayParam 0x181786800 invoked with start/max 10/10
 * at 0x1818788a5..8cb; reads pairs, stops at first (0,0), 0x1817868e6..8f2.
 * Initialize allocates 10 path and 2 fake entries, 0x181878471/0x181878523.
 * cctor 0x18187a460: SIGN_OFFSET_Y raw -7208960 (-110);
 * GUIDE_LINE_WIDTH '0.075' raw 4915 (literal 0x1831c3b78).
 */
(function(root,factory){const api=factory();if(typeof module==='object'&&module.exports)module.exports=api;root.SourceLinepathDevices=api;})(typeof globalThis!=='undefined'?globalThis:this,function(){
'use strict';
const FP_ONE=65536;
// Camera.Initialize 0x1817df592/5bc: signed reciprocal of chipSize.
// 03-02 asset chipSize=48 => +/-1365. FP sqrt 0x181640cf1..d29.
// Sparse int32 values read from resources.assets FPSqrt, byte11384408+index*4;
// LoadLookupTables 0x18165af8a..b074 loads FPSqrt into the sqrt static at +0.
const SQRT_TABLE={0:0,16848:2126641,17769:2183994,21893:2424223,22097:2435491,
 25162:2598918,25587:2620774,27764:2729989,29340:2806403,36846:3144960,
 37359:3166778,39980:3275981,42690:3385190,45488:3494366,46921:3548980,
 50151:3669102,57571:3931170,57749:3937243,62136:4084055,62469:4094984};
const mulRaw=(a,b)=>Number((BigInt(a)*BigInt(b))>>16n);
function nativeSqrtRaw(q){
 if(!Number.isSafeInteger(q)||q<0)throw Error('Invalid native sqrt input');
 const bits=q===0?0:BigInt(q).toString(2).length;
 const shift=q>FP_ONE?Math.floor((bits-1)/2)*2-14:0;
 const index=Number(BigInt(q)>>BigInt(shift)),entry=SQRT_TABLE[index];
 if(entry===undefined)throw Error('Unverified FPSqrt table index '+index);
 return Number((BigInt(entry)<<BigInt(shift>>1))>>6n);
}
function segmentLengthRaw(from,to,chipSize){
 const scale=Math.trunc(FP_ONE/chipSize);
 const x=mulRaw(to.xRaw-from.xRaw,scale),y=mulRaw(to.yRaw-from.yRaw,-scale);
 return nativeSqrtRaw(mulRaw(x,x)+mulRaw(y,y));
}
const supportedTypes=['DamageRect','LinePathLift'];
// The safe-number restriction is a JS representation guard, not a game constant.
function fpFromFloatRaw(value){
 if(!Number.isFinite(value))throw Error('Non-finite FP input');
 const raw=Math.trunc(Math.fround(Math.fround(value)*FP_ONE));
 if(!Number.isSafeInteger(raw))throw Error('FP raw exceeds exact JavaScript integer range');
 return raw===0?0:raw;
}
function stageFpRaw(value){
 // Established loader fact: shortest float32 string round trips to the same
 // Single before FromFloat_UNSAFE 0x18163fc40. No FP representability refusal.
 return fpFromFloatRaw(value);
}
const slotRaw=(a,i)=>a.datas?.[i]?.t===1?stageFpRaw(a.datas[i].f):0;
// sar 16 is signed floor, including -0.2 -> -1, not truncation to zero.
const slotInt=(a,i)=>Math.floor(slotRaw(a,i)/FP_ONE);
function decodeDamageRect(a){
 let xRaw=stageFpRaw(a.posX),yRaw=stageFpRaw(a.posY),widthRaw=slotRaw(a,0),heightRaw=slotRaw(a,1);
 if(widthRaw<0){xRaw+=widthRaw;widthRaw=-widthRaw;}
 return {type:'DamageRect',name:a.name||'',xRaw,yRaw,
  rectRaw:{height:heightRaw,width:widthRaw,x:0,y:-heightRaw}};
}
function decodeLinePathLift(a,count){
 if(!Number.isInteger(count)||count<2||count>8)throw Error('Expected player count 2..8');
 let width=slotInt(a,30);if(width<1)width=118;
 const growth=(count-2)*slotInt(a,9),base=slotRaw(a,4),speedGrowth=slotRaw(a,31);
 const mode=slotInt(a,5),modeRemainder=mode>=0&&mode<=5?mode%3:mode===6?2:mode;
 const inertia=mode>=0&&mode<=5?mode<3:mode===6;
 const percent=slotInt(a,7),percentRaw=Math.trunc(percent*FP_ONE/100);
 const moveContactCount=(percent<=0?1:Math.ceil(percentRaw*count/FP_ONE))&255;
 const paths=[];
 for(let i=10;i<30;i+=2){const x=slotRaw(a,i),y=slotRaw(a,i+1);if(x===0&&y===0)break;paths.push({xRaw:x,yRaw:y});}
 const externalStart=slotInt(a,6)>0;
 return {type:'LinePathLift',name:a.name||'',xRaw:stageFpRaw(a.posX),yRaw:stageFpRaw(a.posY),
  speedRaw:Math.abs(base)<4?FP_ONE:Math.max(0,base+(count-2)*speedGrowth),
  baseSpeedRaw:base,speedGrowthRaw:speedGrowth,paths,
  mode,absLoop:modeRemainder===2?1:0,loop:modeRemainder>0,isInertia:inertia?1:0,
  waitInEndPoint:mode===6?1:0,externalStart,enableLine:slotInt(a,8)===1?1:0,
  moveContactCount,needRideCount:externalStart?0:moveContactCount,
  disabled:paths.length===0,targetPathIndex:0,returnDirection:0,timerRaw:0,
  rectRaw:{height:18*FP_ONE,width:(width+growth)*FP_ONE,
   x:(-Math.trunc(width/2)-Math.trunc(growth/2))*FP_ONE,y:-9*FP_ONE}};
}
const allowed=(v,c)=>!v||v<0&&c<=-v||v>0&&v<10&&c>=v||v>=10&&c>=Math.trunc(v/10)&&c<=v%10;
function compile(actors,count,options){
 if(!Number.isInteger(count)||count<2||count>8)throw Error('Expected player count 2..8');
 // 48 is the shipped task stages' mapInitParam.chipSize, not a native fallback.
 const chipSize=options?.chipSize??48,devices=[];
 if(!Number.isInteger(chipSize)||chipSize<=0)throw Error('Invalid authored chipSize');
 for(const [i,raw] of actors.entries()){
  const props=raw.properties||raw;
  if(!supportedTypes.includes(props.typeName)||!allowed(props.playerCount,count))continue;
  const pos=raw.position||{};
  const a={...props,datas:raw.datas||raw.parameters||props.datas,
   posX:pos.x??raw.posX??raw.x,posY:pos.y??raw.posY??raw.y};
  const d=a.typeName==='DamageRect'?decodeDamageRect(a):decodeLinePathLift(a,count);
  d.id=raw.id||'source:a'+i;
  if(d.type==='DamageRect'){d.collisionInactive=true;d.collisionType=6;}
  else{
   // OnRecvEvent 0x181879a85 chooses normalized fake paths when no riders.
   // That separate mode remains refused rather than guessed.
   if(d.externalStart)throw Error('Unverified LinePathLift external-start fake path normalization 0x181879c10');
   if(d.mode!==0)throw Error('Unverified LinePathLift loop mode '+d.mode);
   d.lengthsRaw=d.paths.map((p,j)=>segmentLengthRaw(j?d.paths[j-1]:{xRaw:0,yRaw:0},p,chipSize));
   if(d.lengthsRaw.some(n=>n<=0))throw Error('Unverified LinePathLift zero length segment');
   d.offsetRaw={xRaw:0,yRaw:0};d.moving=false;d.finished=false;d.collisionType=13;
  }
  devices.push(d);
 }
 return {schemaVersion:1,count,devices,completePhysicsFidelity:false};
}
const create=compiled=>JSON.parse(JSON.stringify(compiled));
function solids(state){return state.devices.filter(d=>d.type==='LinePathLift').map(d=>({
 id:d.id,type:d.type,x:(d.xRaw+d.offsetRaw.xRaw+d.rectRaw.x)/FP_ONE,
 y:(d.yRaw+d.offsetRaw.yRaw+d.rectRaw.y)/FP_ONE,w:d.rectRaw.width/FP_ONE,
 h:d.rectRaw.height/FP_ONE,collisionType:13}));}
function hostCall(ctx,name,...args){
 if(typeof ctx[name]!=='function')throw Error('Linepath runtime requires ctx.'+name);
 return ctx[name](...args);
}
// OnUpdate 0x181878d8e: startup and first moving tick are separate branches.
// liftUpdate 0x1818791ac/22c/273: raw distance, truncated division and sar16.
// End 0x1818792f7..39e discards overshoot, reverses index and stops mode0.
function advanceLift(d,dtRaw,rideCount,canMove){
 if(d.disabled||d.finished)return null;
 if(!d.moving){
  if(d.needRideCount>0){d.needRideCount=Math.max(0,d.moveContactCount-rideCount);if(!d.needRideCount)d.moving=true;}
  return null;
 }
 if(!canMove)return null;
 d.timerRaw+=mulRaw(dtRaw,d.speedRaw);
 const index=d.targetPathIndex,length=d.lengthsRaw[index];
 const ratio=Number((BigInt(d.timerRaw)<<16n)/BigInt(length));
 const t=Math.max(0,Math.min(FP_ONE,ratio));
 const from=index?d.paths[index-1]:{xRaw:0,yRaw:0},to=d.paths[index];
 const next={xRaw:from.xRaw+mulRaw(to.xRaw-from.xRaw,t),yRaw:from.yRaw+mulRaw(to.yRaw-from.yRaw,t)};
 const deltaYRaw=next.yRaw-d.offsetRaw.yRaw;
 d.offsetRaw=next;
 if(ratio>=FP_ONE){
  d.timerRaw=0;d.targetPathIndex++;
  if(d.targetPathIndex===d.paths.length){d.returnDirection=1;d.targetPathIndex=d.paths.length-1;d.moving=false;d.finished=true;}
 }
 return Math.abs(deltaYRaw)>=4?{deviceId:d.id,xRaw:0,yRaw:deltaYRaw}:null;
}
// DamageRect OnUpdate 0x18180e208/242/291/2e1. bit0 means INACTIVE:
// SetCollisionActive 0x1816a014d clears it on true, 0x1816a015f sets on false.
function updateDamageActivation(d,{actorPaused=false,pushBackTargetCollided}){
 if(actorPaused||!d.collisionInactive)return false;
 if(typeof pushBackTargetCollided!=='boolean')throw Error('DamageRect requires verified push-back target collision');
 if(pushBackTargetCollided)return false;
 d.collisionInactive=false;return true;
}
// First pass sends once per type1 collider, then deduplicates reverse-player
// contacts against first-pass entities only: 0x18180e61e..676 / e952..eae3.
function damageContactEvents(d,ownContacts,reversePlayers){
 const events=[],seen=new Set();
 for(const c of ownContacts){if(c.collisionType!==1)continue;
  events.push({targetId:c.entityId,eventType:43,senderId:d.id});seen.add(c.entityId);
 }
 for(const p of reversePlayers){
  if(p.flags&0x200||seen.has(p.entityId)||!p.contactsDamageRect)continue;
  events.push({targetId:p.entityId,eventType:43,senderId:d.id});
 }
 return events;
}
// Player.OnRecvEvent 0x1816c14a2..16e1, IsImmortal 0x1816bcd20.
// force is event+0x6c==1. IsInvincible's true branch goes to DEATH at16a0.
// Shared HP survival is the boolean result of DealDamage 0x1816c15be.
function playerEvent43Outcome(player,{force=false,sharedHitPointActive=false,dealDamageSurvived=false}={}){
 if(player.life<=0)return 'ignored';
 if(!force&&(player.immortal||player.flags&0x100))return 'ignored';
 if(force&&player.invincibleTimerRaw>0)return 'dead';
 if(sharedHitPointActive&&dealDamageSurvived)return 'shared-damage';
 return 'dead';
}
function beforeStep(state,ctx={}){
 const dt=ctx.dt??1/60;
 if(!Number.isFinite(dt)||dt<0)throw Error('Invalid device delta');
 const dtRaw=Math.trunc(dt*FP_ONE),events=[],carryCalls=[],activatedIds=[];
 for(const d of state.devices){
  if(d.type==='DamageRect'){
   const paused=ctx.isActorPaused?ctx.isActorPaused(d.id):false;
   if(!paused&&d.collisionInactive){
    const collided=hostCall(ctx,'isCollidedByPushBackTarget',d.id,3);
    if(updateDamageActivation(d,{pushBackTargetCollided:collided})){
     activatedIds.push(d.id);hostCall(ctx,'setCollisionActive',d.id,true);
    }
   }
   events.push(...damageContactEvents(d,hostCall(ctx,'damageRectOwnContacts',d.id),hostCall(ctx,'damageRectReversePlayers',d.id)));
  }else if(!d.disabled&&!d.finished){
   const riders=hostCall(ctx,'getRideCount',d.id,1,6);
   // 0x18187914a..15d: negative segment Y substitutes (0,-65536),
   // static vector 0x182e88680; otherwise use the full segment vector.
   const j=d.targetPathIndex,from=j?d.paths[j-1]:{xRaw:0,yRaw:0},to=d.paths[j];
   const vector=to.yRaw<from.yRaw?{xRaw:0,yRaw:-FP_ONE}:{xRaw:to.xRaw-from.xRaw,yRaw:to.yRaw-from.yRaw};
   const canMove=d.moving?hostCall(ctx,'isEnableMoveContactActor',d.id,vector):false;
   const carry=advanceLift(d,dtRaw,riders,canMove);
   if(carry){carryCalls.push(carry);hostCall(ctx,'moveLinePathLiftContactActors',d.id,{xRaw:0,yRaw:carry.yRaw});}
  }
 }
 return {events,solids:solids(state),carryCalls,activatedIds};
}
const afterStep=()=>({events:[],deadPlayerIds:[]});
const displays=state=>({devices:state.devices.map(d=>({...d,x:(d.xRaw+(d.offsetRaw?.xRaw||0))/FP_ONE,y:(d.yRaw+(d.offsetRaw?.yRaw||0))/FP_ONE}))});
return {compile,create,solids,beforeStep,afterStep,displays,supportedTypes,
 fpFromFloatRaw,stageFpRaw,decodeDamageRect,decodeLinePathLift,nativeSqrtRaw,segmentLengthRaw,
 advanceLift,updateDamageActivation,damageContactEvents,playerEvent43Outcome,completePhysicsFidelity:false};
});
