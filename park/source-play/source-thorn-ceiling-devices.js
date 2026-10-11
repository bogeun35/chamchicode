/* Native-derived PP2 ThornCeiling and DummyRect.
 *
 * Every constant and branch below is quoted from the shipped binaries
 * (GameAssembly.dll, imageBase 0x180000000). Quantum component offsets in the
 * comments are the il2cpp field offsets; the raw struct offset the native code
 * uses is that value minus the 16 byte box header, exactly as the sibling
 * modules already document.
 *
 * ThornCeilingComponent fields (il2cpp / struct):
 *   m_CeilingWidth 16/+0   m_FinalSafeZoneCount 17/+1  m_FinalSafeZoneTrapRate 18/+2
 *   m_FirstSafeZoneCount 19/+3  m_FirstSafeZoneTrapRate 20/+4  m_HitPoint 21/+5
 *   m_HitPointMax 22/+6    m_MaxDistanceFromPrevSafeZone 23/+7  m_Phase 24/+8
 *   m_SafeZoneTrapMaxCount 25/+9  m_CreatedThornListPtr 28/+0xc
 *   m_IgnoreTablePtr 32/+0x10  m_LottelyTablePtr 36/+0x14
 *   m_PrevSafeZoneTablePtr 40/+0x18  m_SafeZoneTrapTablePtr 44/+0x1c
 *   m_EntityRef 48/+0x20   m_AvoidTime 56/+0x28  m_FinalSafeZoneTrapWaitTime 64/+0x30
 *   m_FirstSafeZoneTrapWaitTime 72/+0x38  m_PreTimer 80/+0x40  m_Scale 88/+0x48
 *   m_SeTimer 96/+0x50     m_ThornSpeed 104/+0x58  m_ThornWaitTime 112/+0x60
 *   m_Timer 120/+0x68      m_Pos 128/+0x70         m_TargetName 144/+0x80
 *
 * DummyRect has NO runtime behaviour at all - see DUMMY_RECT_EVIDENCE below.
 */
(function(root,factory){const api=factory();if(typeof module==='object'&&module.exports)module.exports=api;root.SourceThornCeilingDevices=api;})(typeof globalThis!=='undefined'?globalThis:this,function(){
'use strict';

// ---------------------------------------------------------------- fixed point
const F=65536;
// Arithmetic right shift by 16 == floor division by 65536 for signed values.
const shr16=v=>Math.floor(v/F);
const fpMul=(a,b)=>shr16(a*b);
// `sar rax,0x3f ; lea/xor` sign-folding sequences are plain absolute values.
const fpAbs=v=>Math.abs(v);
const overlap=(a,b)=>a.x<b.x+b.w&&a.x+a.w>b.x&&a.y<b.y+b.h&&a.y+a.h>b.y;
const clone=v=>JSON.parse(JSON.stringify(v));

// -------------------------------------------------------- native constants
// QGameDefine..cctor 0x181780766: MAP_CHIP_SIZE_FP = 0x300000 = 48.
// createThornSet 0x18171f4a0/0x18171f4ca multiplies it by the column index and
// 0x18171f52c subtracts one of it for the Y of a safe-zone trap thorn.
const MAP_CHIP_SIZE=48, MAP_CHIP_SIZE_FP=48*F;
// ThornCeilingComponent..cctor 0x18171ff31: START_WAIT_TIME = 0x50000 = 5.
const START_WAIT_TIME_FP=5*F;
// 0x18171ff65/0x18171ff7b/0x18171ff91/0x18171ffa7: UI_BASE_SCALE = 0x70000 = 7,
// UI_POS_X = 0, UI_POS_Y_2 = 0x1b80000 = 440, UI_POS_Y = 0x1cc0000 = 460.
// ParseParameter 0x18171d491..0x18171d4fc picks UI_POS_Y_2 when m_HitPointMax
// is 1 and UI_POS_Y otherwise; both are presentation-only (UIThornCeilingFrame).
const UI_BASE_SCALE=7, UI_POS_X=0, UI_POS_Y_2=440, UI_POS_Y=460;
// ThornComponent..cctor 0x1817227b1: FADEOUT_SPEED = 0x40000 = 4, so the
// m_Timer = 1.0 fade started by phase 4 lasts a quarter second.
const FADEOUT_SPEED_FP=4*F;
// ThornComponent..cctor 0x181722aef..0x181722b57: DirectionVectorTable holds
// four FP unit vectors - (0,-1) up, (0,1) down, (-1,0) left, (1,0) right.
const DIRECTION_VECTORS=Object.freeze([Object.freeze({x:0,y:-F}),Object.freeze({x:0,y:F}),
 Object.freeze({x:-F,y:0}),Object.freeze({x:F,y:0})]);
// ThornComponent..cctor 0x1817227c5..0x1817228c6: CollisionTable[direction][2]
// of RectFP (member order Height,Width,X,Y; X/Y are the offset from the actor
// anchor). Identical to the table source-devices-runtime.js already carries.
const THORN_COLLISION=Object.freeze([
 Object.freeze([Object.freeze({x:-4,y:-18,w:8,h:8}),Object.freeze({x:-12,y:-8,w:24,h:6})]),
 Object.freeze([Object.freeze({x:-4,y:10,w:8,h:8}),Object.freeze({x:-12,y:2,w:24,h:6})]),
 Object.freeze([Object.freeze({x:-18,y:-4,w:8,h:8}),Object.freeze({x:-8,y:-12,w:6,h:24})]),
 Object.freeze([Object.freeze({x:10,y:-4,w:8,h:8}),Object.freeze({x:2,y:-12,w:6,h:24})])]);
// ThornComponent.calcMoveDistance 0x181721a28 adds 0xc80000 = 200 to the
// distance from the actor to the far map edge.
const MOVE_DISTANCE_MARGIN_FP=200*F;
// ThornComponent.updatePhase phase 0 (0x181721394) and ParseParameter reject a
// speed whose absolute FP raw is below 4, the engine-wide non-zero epsilon.
const SPEED_EPSILON_FP=4;
// ReusableThornComponent.trySubHitPoint 0x1816ecde7 sets PlayerComponent
// m_FlashTimer (il2cpp 112) to 0x5555 and m_IsFlashing (il2cpp 44) to 1.
const FLASH_TIME_FP=0x5555;
// QEventType ordinals (metadata enum, value__ excluded): Dead 19,
// QuakeDead 43, SetActive 49, SwitchOff 60, SwitchOn 61.
const EVENT_SWITCH_ON=61, EVENT_DEAD=19, EVENT_QUAKE_DEAD=43;
// QPlayerState: 0 None, 1 Default, 2 Faint, 3 Dead, 4 DeadEnd, 5 Clear.
const PLAYER_STATE_DEFAULT=1;
// PCG32 XSH-RR. Multiplier 0x5851f42d4c957f2d appears literally in the inline
// draw at createThornSet 0x18171f376 and in the shared range helper
// 0x1816620bc; the increment is the session field at rngSession+0xc0 and the
// state the field at rngSession+0xb8.
const PCG_MULT=6364136223846793005n;
const MASK64=(1n<<64n)-1n, MASK32=0xFFFFFFFFn;
// Photon Quantum's documented default PCG stream, used only because the live
// seed is session data that is NOT in the binary (see unresolved notes).
const DEFAULT_RNG_STATE=0x853c49e6748fea9bn, DEFAULT_RNG_INCREMENT=0xda3e39cb94b95bdbn;

const PHASE_NAMES=Object.freeze(['start','countdown','avoid','idle','clearing','cleared']);
const supportedTypes=['ThornCeiling','DummyRect'];

/* DummyRect: the ONLY types in the shipped binaries that mention it are
 * EditableDummyRect (metadata type 2215) and EditableDummyRectParam (2341),
 * both Assembly-CSharp Unity-editor authoring classes that the build stripped
 * down to a bare `.ctor` with zero fields, plus the QActorType.DummyRect enum
 * member (ordinal 115). There is no DummyRectComponent, no
 * DummyRectComponent_Prototype, no DummyRectView, no ParseParameter and no
 * Creator. ActorFactoryComponent.CreateActor 0x1816a31d0 falls through its
 * player special cases to the generic path at 0x1816a3524, looks the
 * QActorType up in the creator dictionary at 0x1816a35c7 and, when the lookup
 * returns a negative index (0x1816a35cc `test eax,eax ; js 0x1816a362b`),
 * returns without creating anything. A DummyRect actor therefore produces no
 * entity, no collider, no event and no visual. */
const DUMMY_RECT_EVIDENCE=Object.freeze({
 behaviour:'none',
 enumOrdinal:115,
 editorOnlyTypes:Object.freeze(['EditableDummyRect','EditableDummyRectParam']),
 factory:'ActorFactoryComponent.CreateActor 0x1816a31d0 -> generic path 0x1816a3524 -> unknown QActorType skipped at 0x1816a35cc',
 datas:'Unread by any shipped code. Every Editable*Param type in the build is field-stripped, so the authoring names of datas[0..5] are not recoverable.'});

// -------------------------------------------------------------- parameters
// Generic packed-table decoder 0x18096f720 (8 byte values) / 0x180970770
// (4 byte values): QActorCreateParam.AsString, then the byte loop at
// 0x18097085b takes the LOW byte of every UTF-16 unit and subtracts 0x21.
// 0x180970977 asserts the decoded length is exactly 7 * sizeof(T), one entry
// per player count 2..8, and the result is a QPlayerCountParam<T>.
function packedBytes(slot,label,size){
 if(!slot||slot.t===0)return null;
 if(slot.t!==2||typeof slot.s!=='string')throw new Error(label+' must be a packed player-count table');
 if(slot.s.length!==7*size)throw new Error(label+' table must hold exactly seven '+size+' byte values');
 const bytes=[];for(let i=0;i<slot.s.length;i++)bytes.push(((slot.s.charCodeAt(i)&255)-0x21)&255);
 return bytes;
}
function packedInts(slot,label){
 const bytes=packedBytes(slot,label,4);if(!bytes)return null;
 const out=[];
 for(let v=0;v<7;v++){let raw=0;for(let b=3;b>=0;b--)raw=raw*256+bytes[v*4+b];
  out.push(raw>=0x80000000?raw-0x100000000:raw);}
 return out;
}
function packedFp(slot,label){
 const bytes=packedBytes(slot,label,8);if(!bytes)return null;
 const out=[];
 for(let v=0;v<7;v++){let raw=0n;for(let b=7;b>=0;b--)raw=(raw<<8n)|BigInt(bytes[v*8+b]);
  if(raw>=1n<<63n)raw-=1n<<64n;
  const value=Number(raw);
  if(!Number.isSafeInteger(value))throw new Error(label+' packed value out of range');
  out.push(value);}
 return out;
}
// QPlayerCountParamUtility.Find 0x181786950: index playerCount-2 then walk DOWN
// to lower player counts while the entry is zero; 0 when nothing is set.
function findForCount(table,count){
 if(!table)return 0;
 for(let i=Math.min(count,8)-2;i>=0;i--)if(table[i])return table[i];
 return 0;
}
// The ParseParameter jump tables at 0x18171d55c/578/594/5b0/5cc/5e8/604 index
// playerCount-2 directly with no walk-down, so an absent entry reads as zero
// and is then pushed back up by the clamp that follows it.
function atCount(table,count){
 if(!table)return 0;
 const i=count-2;
 return i>=0&&i<7?table[i]:0;
}

function numeric(slot,label){
 if(!slot||slot.t===0)return 0;
 if(slot.t!==1||!Number.isFinite(slot.f))throw new Error('Unsupported numeric slot '+label);
 return slot.f;
}
function text(slot,label){
 if(!slot||slot.t===0)return '';
 if(slot.t!==2||typeof slot.s!=='string')throw new Error('Unsupported string slot '+label);
 return slot.s;
}
// ActorFactoryComponent.Update 0x1816a30ee: the actor level playerCount filter.
const allowed=(v,c)=>!v||(v<0?c<=-v:v<10?c>=v:c>=Math.trunc(v/10)&&c<=v%10);

function compile(actors,count){
 if(!Number.isInteger(count)||count<2||count>8)throw new Error('ThornCeiling player count must be 2..8');
 if(!Array.isArray(actors))throw new Error('ThornCeiling compile needs the source actor list');
 const ceilings=[],dummyRects=[],warnings=[];
 actors.forEach((raw,index)=>{
  const props=raw.properties||raw,type=props.typeName;
  if(!supportedTypes.includes(type))return;
  if(!allowed(props.playerCount||0,count))return;
  if(props.createThreshold)throw new Error('Deferred '+type+' creation requires native timing');
  const pos=raw.position||{x:raw.x??raw.posX,y:raw.y??raw.posY};
  if(!Number.isFinite(pos.x)||!Number.isFinite(pos.y))throw new Error('Invalid '+type+' position');
  const datas=raw.datas||raw.parameters||[];
  const base={id:raw.id||type.toLowerCase()+':'+index,name:props.name||'',type,x:pos.x,y:pos.y};
  if(type==='DummyRect'){
   dummyRects.push({...base,behaviour:'none',
    datas:datas.map(d=>d&&d.t===1?d.f:d&&d.t===2?d.s:null)});
   return;
  }
  // ParseParameter 0x18171ce90. datas[0..13] are the only slots read; every
  // later slot is ignored by the original, so it is reported, not guessed at.
  for(let i=14;i<datas.length;i++)if(datas[i]&&datas[i].t!==0)
   warnings.push((props.name||'ThornCeiling')+': slot '+i+' is unread by the original ParseParameter');
  // 0x18171d047..0x18171d06c -> m_CeilingWidth = max(floor(datas[0]), 1), byte.
  const ceilingWidth=Math.max(Math.floor(numeric(datas[0],'ThornCeiling datas[0]')),1);
  if(ceilingWidth>127)throw new Error('ThornCeiling width exceeds the native byte field');
  if(ceilingWidth<2)warnings.push(base.id+': the native safe-zone trap neighbour test at 0x18171f318 reads column 1, which does not exist at width 1');
  // 0x18171d092..0x18171d0a4 -> m_AvoidTime = max(datas[1] FP raw, 0).
  const avoidTimeFp=Math.max(Math.round(numeric(datas[1],'ThornCeiling datas[1]')*F),0);
  if(avoidTimeFp<=0)throw new Error('ThornCeiling m_AvoidTime must be positive; the progress ramp divides by it at 0x18171edca');
  // 0x18171d0cc..0x18171d0de -> m_ThornSpeed = max(datas[2] FP raw, 1.0).
  const thornSpeedFp=Math.max(Math.round(numeric(datas[2],'ThornCeiling datas[2]')*F),F);
  // 0x18171d106..0x18171d118 -> m_ThornWaitTime = max(datas[3] FP raw, 0).
  const thornWaitTimeFp=Math.max(Math.round(numeric(datas[3],'ThornCeiling datas[3]')*F),0);
  // 0x18171d140..0x18171d169 -> m_MaxDistanceFromPrevSafeZone = max(floor(datas[10]), 1).
  const maxDistanceFromPrevSafeZone=Math.max(Math.floor(numeric(datas[10],'ThornCeiling datas[10]')),1);
  // Packed player-count tables. 0x18171cf5d/cf77/cfc3/cfdc/cff5/d00e decode the
  // four byte ones (slots 4,5,6,12,11,13) and 0x18171cf90/cfa9 the eight byte
  // FP ones (slots 7,8).
  const firstSafeZoneCountTable=packedInts(datas[4],'ThornCeiling datas[4]');
  const finalSafeZoneCountTable=packedInts(datas[5],'ThornCeiling datas[5]');
  const firstSafeZoneTrapRateTable=packedInts(datas[6],'ThornCeiling datas[6]');
  const firstSafeZoneTrapWaitTable=packedFp(datas[7],'ThornCeiling datas[7]');
  const finalSafeZoneTrapWaitTable=packedFp(datas[8],'ThornCeiling datas[8]');
  const safeZoneTrapMaxCountTable=packedInts(datas[11],'ThornCeiling datas[11]');
  const finalSafeZoneTrapRateTable=packedInts(datas[12],'ThornCeiling datas[12]');
  const hitPointTable=packedInts(datas[13],'ThornCeiling datas[13]');
  // 0x18171d1b6..0x18171d1c9 and 0x18171d20f..0x18171d222: the count tables are
  // pushed through FP and clamped to a minimum of 1.
  const firstSafeZoneCount=Math.max(atCount(firstSafeZoneCountTable,count),1);
  const finalSafeZoneCount=Math.max(atCount(finalSafeZoneCountTable,count),1);
  // 0x18171d260..0x18171d276 and 0x18171d2b0..0x18171d2c6: the rate tables are
  // clamped to 0..100 (`cmp ecx,0x64`), so they are whole percent values.
  const clampRate=v=>v<0?0:v>100?100:v;
  const firstSafeZoneTrapRate=clampRate(atCount(firstSafeZoneTrapRateTable,count));
  const finalSafeZoneTrapRate=clampRate(atCount(finalSafeZoneTrapRateTable,count));
  // 0x18171d304..0x18171d317: m_SafeZoneTrapMaxCount = max(table, 0).
  const safeZoneTrapMaxCount=Math.max(atCount(safeZoneTrapMaxCountTable,count),0);
  // 0x18171d358..0x18171d36e and 0x18171d3b8..0x18171d3c5: both trap wait times
  // are clamped to a minimum of 0x3333 (0.2 native seconds).
  const clampWait=v=>v<0x3333?0x3333:v;
  const firstSafeZoneTrapWaitTimeFp=clampWait(atCount(firstSafeZoneTrapWaitTable,count));
  const finalSafeZoneTrapWaitTimeFp=clampWait(atCount(finalSafeZoneTrapWaitTable,count));
  // 0x18171d3eb: m_HitPoint = QPlayerCountParamUtility.Find(count, datas[13]),
  // and 0x18171d3f5 substitutes 3 when the result is not positive.
  // 0x18171d3fb: m_HitPointMax = m_HitPoint.
  let hitPointMax=findForCount(hitPointTable,count);
  if(!(hitPointMax>0))hitPointMax=3;
  // 0x18171d476: m_TargetName = QStringUtf8_32(datas[9]).
  const targetName=text(datas[9],'ThornCeiling datas[9]');
  if(!targetName)warnings.push(base.id+': no m_TargetName, so notifyTarget 0x18171fac2 will not open anything');
  ceilings.push({...base,
   ceilingWidth,maxDistanceFromPrevSafeZone,safeZoneTrapMaxCount,
   firstSafeZoneCount,finalSafeZoneCount,firstSafeZoneTrapRate,finalSafeZoneTrapRate,
   hitPointMax,targetName,
   avoidTimeFp,thornSpeedFp,thornWaitTimeFp,
   firstSafeZoneTrapWaitTimeFp,finalSafeZoneTrapWaitTimeFp,
   avoidTime:avoidTimeFp/F,thornSpeed:thornSpeedFp/F,thornWaitTime:thornWaitTimeFp/F,
   firstSafeZoneTrapWaitTime:firstSafeZoneTrapWaitTimeFp/F,
   finalSafeZoneTrapWaitTime:finalSafeZoneTrapWaitTimeFp/F,
   // ParseParameter 0x18171d542 and 0x18171d4f7: presentation only.
   ui:{scale:UI_BASE_SCALE,x:UI_POS_X,y:hitPointMax===1?UI_POS_Y_2:UI_POS_Y}});
 });
 return {schemaVersion:1,count,ceilings,dummyRects,warnings,
  // ThornCeilingComponent.OnStart 0x18171e7a4 clears StageComponent.m_Flags
  // bit 8, and StageComponent.IsEnableRetryByPlayerDead 0x181709c60 reads that
  // bit inverted, so a stage holding a ThornCeiling retries on a player death.
  stageFlags:ceilings.length?{enableRetryByPlayerDead:true}:{},
  completePhysicsFidelity:false};
}

// ------------------------------------------------------------------- random
function pcg32(rng){
 const old=rng.state;
 rng.state=(old*PCG_MULT+(rng.inc|1n))&MASK64;
 const xorshifted=Number(((old>>45n)^(old>>27n))&MASK32)>>>0;
 const rot=Number(old>>59n);
 return ((xorshifted>>>rot)|(xorshifted<<((32-rot)&31)))>>>0;
}
// Shared range helper 0x181662090, and the copy inlined into createThornSet at
// 0x18171f390..0x18171f3ec for the fixed 0..100 case. Both reject draws below
// 2^32 % range before taking the remainder, so the result is unbiased, and
// both return lo + x % (hi - lo) - i.e. the upper bound is EXCLUSIVE.
function rngRange(rng,a,b){
 if(a===b)return a;
 const hi=Math.max(a,b),lo=Math.min(a,b),range=hi-lo;
 const threshold=4294967296%range;
 let x;do{x=pcg32(rng);}while(x<threshold);
 return lo+(x%range);
}

// ------------------------------------------------------------------- create
// InitPost 0x18171d620 creates m_CeilingWidth pooled ReusableThorn entities
// (0x18171d9ce) with QActorCreateParam datas[0] = 1.0 (direction 1, down),
// datas[1] = m_ThornSpeed and datas[2] = 0, then immediately sends each one
// QEventType.SetActive(false) (event 49 at 0x18171daf3), which is what leaves
// ActorComponent.m_Flags bit 2 set on an idle pool entry. The loop at
// 0x18171e060..0x18171e496 then fills the four tables: LottelyTable[i] = i,
// PrevSafeZoneTable[i] = 1, IgnoreTable[i] = 0 and SafeZoneTrapTable[i] = 0.
function create(compiled,options){
 if(!compiled||compiled.schemaVersion!==1||!Array.isArray(compiled.ceilings))
  throw new Error('Compiled ThornCeiling set required');
 const {rngState=DEFAULT_RNG_STATE,rngIncrement=DEFAULT_RNG_INCREMENT}=options||{};
 return {schemaVersion:1,count:compiled.count,ticks:0,
  rng:{state:BigInt(rngState)&MASK64,inc:BigInt(rngIncrement)&MASK64},
  flash:{},
  dummyRects:clone(compiled.dummyRects),
  stageFlags:clone(compiled.stageFlags||{}),
  ceilings:compiled.ceilings.map(c=>({...clone(c),
   phase:0,timerFp:0,preTimerFp:0,seTimerFp:0,
   hitPoint:c.hitPointMax,
   lottely:Array.from({length:c.ceilingWidth},(_,i)=>i),
   prevSafeZone:Array.from({length:c.ceilingWidth},()=>1),
   ignore:Array.from({length:c.ceilingWidth},()=>0),
   safeZoneTrap:Array.from({length:c.ceilingWidth},()=>0),
   thorns:Array.from({length:c.ceilingWidth},(_,i)=>({id:c.id+':thorn'+i,
    active:false,phase:0,direction:1,moveDirection:1,
    xFp:0,yFp:0,veloFp:{x:0,y:0},speedFp:c.thornSpeedFp,waitTimeFp:0,
    timerFp:0,distanceFp:0,moveDistanceFp:0,alphaFp:F,collisionActive:false,trap:false})),
   lastSet:null}))};
}

// --------------------------------------------------------------- row builder
// createThornSet 0x18171eb50. Everything here is the straight-line translation
// of that function; the quoted addresses mark each decision.
function anyThornActive(c){
 // isAnyThornActive 0x18171f8f0 walks the first m_CeilingWidth pool entries and
 // reports true as soon as one has ActorComponent.m_Flags bit 2 clear
 // (0x18171fa2f `test byte[rdi+0xc],4 ; jbe` -> bit clear means alive).
 return c.thorns.some(t=>t.active);
}
// 0x18171edb1..0x18171ee10: the difficulty ramp. Phase 0 is flat zero; after
// that the elapsed share of m_AvoidTime is quantised to tenths and divided by
// nine, and the final (m_ThornWaitTime + 1) seconds are pinned to full.
function progressFp(c){
 if(c.phase===0)return 0;
 const q=Math.trunc((c.timerFp*F)/c.avoidTimeFp);     // 0x18171edca idiv
 const r=F-q;                                          // 0x18171edcf
 const e=Math.floor((5*r*131072)/4294967296);          // 0x18171edd2 lea/shl/sar
 let raw=Math.trunc(e*F/9);                            // 0x18171ede1 magic /18 >>15
 if(c.thornWaitTimeFp+F>c.timerFp)raw=F;               // 0x18171ee03 cmovg
 return raw<0?0:raw>F?F:raw;                           // 0x18171ee2e/0x18171ee38 clamps
}
// 0x18171ee14..0x18171ee64 and 0x18171ee5a..0x18171eea7: lerp in FP, then take
// the integer with `cmp dx,0x8000` - a round half up, not a truncation.
function lerpRound(first,final,t){
 const a=final*F,b=first*F;
 const v=shr16((a-b)*t)+b;
 let out=shr16(v);
 if(((v-out*F)|0)>=0x8000)out++;
 return out;
}
// 0x18171eeb2..0x18171eec5: the same lerp for the FP trap wait time, unrounded.
function lerpFp(firstFp,finalFp,t){return shr16((finalFp-firstFp)*t)+firstFp;}

// calcMoveDistance 0x181721910: distance from the actor to the far map edge in
// the travel direction, plus 200. `word[map+0x1002]`/`[map+0x1004]` are the map
// height/width in chips and `h*3 << 20` is h * 48 * 65536, i.e. the pixel size
// the caller already supplies as map.height / map.width.
function calcMoveDistanceFp(thorn,widthFp,heightFp){
 let d;
 switch(thorn.direction){
  case 0:d=thorn.yFp;break;
  case 1:d=heightFp-thorn.yFp;break;
  case 2:d=thorn.xFp;break;
  default:d=widthFp-thorn.xFp;break;
 }
 return fpAbs(d)+MOVE_DISTANCE_MARGIN_FP;
}
// createThorn 0x18171f610: take the first pool entry whose ActorComponent
// m_Flags bit 2 is set (0x18171f794), ReusableThornComponent.Resume it at the
// requested position (0x18171f808 -> ThornComponent.Reset 0x181720e60 clears
// the phase, timer, distance and velocity and restores m_Alpha = 1), then write
// ThornComponent.m_Speed = m_ThornSpeed (0x18171f84a) and
// ThornComponent.m_WaitTime = the row's wait (0x18171f846).
function createThorn(c,xFp,yFp,waitFp,trap){
 const thorn=c.thorns.find(t=>!t.active);
 if(!thorn)return null;
 thorn.active=true;thorn.phase=0;thorn.direction=1;thorn.moveDirection=1;
 thorn.xFp=xFp;thorn.yFp=yFp;thorn.veloFp={x:0,y:0};
 thorn.speedFp=c.thornSpeedFp;thorn.waitTimeFp=waitFp;
 thorn.timerFp=0;thorn.distanceFp=0;thorn.moveDistanceFp=0;
 thorn.alphaFp=F;thorn.collisionActive=true;thorn.trap=!!trap;
 return thorn;
}
function createThornSet(state,c){
 if(anyThornActive(c))return null;                      // 0x18171ec53/0x18171ec5a
 const t=progressFp(c);
 const safeZoneCount=lerpRound(c.firstSafeZoneCount,c.finalSafeZoneCount,t);
 const trapRate=lerpRound(c.firstSafeZoneTrapRate,c.finalSafeZoneTrapRate,t);
 const trapWaitFp=lerpFp(c.firstSafeZoneTrapWaitTimeFp,c.finalSafeZoneTrapWaitTimeFp,t);
 // 0x18171eed0..0x18171ef0f: SafeZoneTrapTable is cleared for the whole width.
 for(let i=0;i<c.ceilingWidth;i++)c.safeZoneTrap[i]=0;
 // 0x18171ef11..0x18171efe6: a column is ignored when every column that was a
 // safe zone in the previous row is farther away than
 // m_MaxDistanceFromPrevSafeZone. The minimum starts at m_CeilingWidth.
 for(let column=0;column<c.ceilingWidth;column++){
  let min=c.ceilingWidth;
  for(let k=0;k<c.ceilingWidth;k++)if(c.prevSafeZone[k]){
   const d=Math.abs(k-column);if(d<min)min=d;
  }
  c.ignore[column]=min>c.maxDistanceFromPrevSafeZone?1:0;
 }
 // 0x18171f004..0x18171f11d: Fisher-Yates over LottelyTable, top down. Note the
 // helper's exclusive upper bound, so the partner index is drawn from [0, i-1]
 // and never equals i - that is the original's behaviour, bias included.
 for(let i=c.lottely.length-1;i>0;i--){
  const j=rngRange(state.rng,0,i);
  const swap=c.lottely[j];c.lottely[j]=c.lottely[i];c.lottely[i]=swap;
 }
 // 0x18171f123..0x18171f155: the row's base wait is START_WAIT_TIME while the
 // ceiling is still in phase 0 and m_ThornWaitTime afterwards.
 const rowWaitFp=c.phase===0?START_WAIT_TIME_FP:c.thornWaitTimeFp;
 let skipped=0,trapCount=0;
 const row=[];
 for(let i=0;i<c.ceilingWidth;i++){
  const column=c.lottely[i];                            // 0x18171f19e
  // 0x18171f1ab..0x18171f1bf: the quota is spent in lottery order, and
  // 0x18171f1ef..0x18171f1fa gives an ignored column's slot back to a later one.
  let isSafe=safeZoneCount>i-skipped;
  if(isSafe&&c.ignore[column]){isSafe=false;skipped++;}
  c.prevSafeZone[column]=isSafe?1:0;                    // 0x18171f236
  let trap=false,waitFp=rowWaitFp,yFp=Math.round(c.y*F);
  if(isSafe){
   // 0x18171f246: the trap budget is checked before anything else.
   if(trapCount>=c.safeZoneTrapMaxCount)continue;
   // 0x18171f258..0x18171f353: never two adjacent traps. Column 0 looks only at
   // column 1, the last column only at its left neighbour, and everything in
   // between looks left first and then right.
   let neighbour;
   if(column===0)neighbour=c.safeZoneTrap[1]||0;
   else if(column===c.ceilingWidth-1)neighbour=c.safeZoneTrap[column-1]||0;
   else neighbour=c.safeZoneTrap[column-1]?1:(c.safeZoneTrap[column+1]?1:0);
   if(neighbour)continue;
   // 0x18171f3ef..0x18171f3fb: `trapRate > rand(0..99)`, strictly greater.
   if(!(trapRate>rngRange(state.rng,0,100)))continue;
   c.safeZoneTrap[column]=1;trapCount++;trap=true;      // 0x18171f436/0x18171f43b
  }
  // 0x18171f455..0x18171f4f3: pos = actorPos + (1,0) * MAP_CHIP_SIZE * column.
  const xFp=Math.round(c.x*F)+MAP_CHIP_SIZE_FP*column;
  // 0x18171f509..0x18171f52f: a trap starts one chip higher and waits longer.
  if(trap){yFp-=MAP_CHIP_SIZE_FP;waitFp=rowWaitFp+trapWaitFp;}
  const thorn=createThorn(c,xFp,yFp,waitFp,trap);
  if(thorn)row.push({column,trap,x:xFp/F,y:yFp/F,wait:waitFp/F});
 }
 // 0x18171f5f1: m_SeTimer = the row's base wait, used only for the impact SE.
 c.seTimerFp=rowWaitFp;
 const set={progress:t/F,safeZoneCount,trapRate,trapWait:trapWaitFp/F,
  safeColumns:c.prevSafeZone.map((v,i)=>v?i:-1).filter(i=>i>=0),
  trapColumns:c.safeZoneTrap.map((v,i)=>v?i:-1).filter(i=>i>=0),
  thorns:row};
 c.lastSet=set;
 return set;
}

// ------------------------------------------------------------ thorn physics
// ThornComponent.updatePhase 0x1817212a0, dispatched through the jump table at
// 0x181721704 -> phase 0 0x18172132e, 1 0x1817213a7, 2 0x181721561,
// 3 (inert) 0x181721537, 4 0x1817214db, 5 0x1817215ec. Phases 0->1->2 and
// 4->5 all run inside one tick because each falls back into the dispatcher.
function updateThorn(thorn,dtFp,widthFp,heightFp){
 for(let guard=0;guard<8;guard++){
  if(thorn.phase===0){
   if(thorn.waitTimeFp<=0)return;                       // 0x18172132e
   thorn.timerFp+=dtFp;                                 // 0x18172135b
   if(thorn.timerFp<thorn.waitTimeFp)return;            // 0x181721363
   if(fpAbs(thorn.speedFp)<SPEED_EPSILON_FP)return;     // 0x181721394
   thorn.phase=1;continue;                              // 0x18172139e
  }
  if(thorn.phase===1){
   const dir=DIRECTION_VECTORS[thorn.moveDirection]||DIRECTION_VECTORS[1];
   thorn.veloFp={x:fpMul(dir.x,thorn.speedFp),y:fpMul(dir.y,thorn.speedFp)}; // 0x1817214c1
   thorn.moveDistanceFp=calcMoveDistanceFp(thorn,widthFp,heightFp);          // 0x1817214cd
   thorn.distanceFp=0;thorn.phase=2;continue;           // 0x1817214d1/0x1817214d5
  }
  if(thorn.phase===2){
   // 0x181721587/0x18172159d: the position advances by m_Velo * m_Speed per
   // tick with no DeltaTime factor, and m_Velo is already the unit direction
   // times m_Speed - so the per tick step is m_Speed SQUARED pixels, while
   // 0x1817215cd accumulates only m_Speed into m_Distance. Reproduced as-is.
   thorn.xFp+=fpMul(thorn.veloFp.x,thorn.speedFp);
   thorn.yFp+=fpMul(thorn.veloFp.y,thorn.speedFp);
   thorn.distanceFp+=thorn.speedFp;
   if(thorn.distanceFp>=thorn.moveDistanceFp)thorn.phase=4; // 0x1817215e3
   return;
  }
  if(thorn.phase===3)return;
  if(thorn.phase===4){
   thorn.collisionActive=false;                         // 0x18172151a SetCollisionActive(false)
   thorn.phase=5;thorn.timerFp=F;continue;              // 0x18172151f/0x181721522
  }
  if(thorn.phase===5){
   thorn.timerFp-=fpMul(dtFp,FADEOUT_SPEED_FP);         // 0x181721639
   if(thorn.timerFp>0){thorn.alphaFp=thorn.timerFp;return;} // 0x1817216ee m_Alpha = m_Timer
   // 0x181721697..0x1817216e9: the pooled variant deactivates the actor, zeroes
   // its position and returns to phase 0 instead of ending the entity.
   thorn.timerFp=0;thorn.alphaFp=0;thorn.phase=0;
   thorn.active=false;thorn.collisionActive=false;
   thorn.xFp=0;thorn.yFp=0;thorn.veloFp={x:0,y:0};
   return;
  }
  return;
 }
}
// ThornComponent.requestDisappear 0x1817221d0 moves phases 1..3 to phase 4,
// which is where the collision is dropped and the fade begins.
function requestDisappear(thorn){if(thorn.phase>=1&&thorn.phase<=3)thorn.phase=4;}

// --------------------------------------------------------------- public view
function thornRects(thorn){
 const table=THORN_COLLISION[thorn.direction]||THORN_COLLISION[1];
 const x=thorn.xFp/F,y=thorn.yFp/F;
 return table.map((r,i)=>({id:thorn.id+':'+i,sourceId:thorn.id,x:x+r.x,y:y+r.y,w:r.w,h:r.h}));
}
// A pooled thorn is lethal from Resume until phase 4 drops its collider, so a
// thorn parked under the ceiling during its wait still costs a hit point.
function hazards(state){
 const out=[];
 for(const c of state.ceilings)for(const thorn of c.thorns){
  if(!thorn.active||!thorn.collisionActive||thorn.phase>=4)continue;
  for(const r of thornRects(thorn))out.push({...r,ceilingId:c.id,type:'ThornCeilingThorn',
   alpha:thorn.alphaFp/F,trap:thorn.trap,phase:thorn.phase});
 }
 return out;
}
// ThornCeiling places no solid of its own; the ceiling tiles are ordinary map
// chips and the thorns are hazards, not colliders the player can stand on.
function solids(){return [];}

// --------------------------------------------------------------- simulation
const playerAlive=p=>!p.exit&&!p.dead&&
 (p.state===undefined||p.state===null?!p.faint:p.state===PLAYER_STATE_DEFAULT);
// PlayerComponent.IsDead 0x1816bfff0 is m_Flags bit 9.
const playerDead=p=>!!p.dead;

// checkGameOver 0x18171fc10: if any player is already dead the ceiling just
// empties its hit point bar and stops; otherwise, once the hit points are gone
// every player that is currently flashing is sent QEventType.Dead.
function checkGameOver(state,c,players,dead,events){
 if(players.some(playerDead)){
  if(c.hitPoint>0)c.hitPoint=0;                          // 0x18171fd88
  return;
 }
 if(c.hitPoint!==0)return;                               // 0x18171fcd1
 for(const p of players){
  if(!(state.flash[p.id]>0))continue;                    // 0x18171fd21 GetFlashing
  dead.add(p.id);
  events.push({event:EVENT_DEAD,playerId:p.id,source:c.id,reason:'thornCeilingGameOver'});
 }
}
// ReusableThornComponent.trySubHitPoint 0x1816ecbd0.
function trySubHitPoint(state,c,thorn,player,dead,events){
 // 0x1816eccd1: a thorn that is already disappearing does nothing at all - it
 // is the only path that skips the RequestDisappear at 0x1816ece97.
 if(thorn.phase>=4)return false;
 // 0x1816eccf0 requires ActorComponent.m_ActorType == 27 (QActorType.Player)
 // and 0x1816ecd2b requires PlayerComponent.m_PlayerState == 1 (Default). A
 // player killed earlier in the same tick is treated as having left that state;
 // whether the native QuakeDead handler flips m_PlayerState inside the frame or
 // only queues m_RequestedPlayerState was not established, so this guard is
 // what keeps one row from reporting the same death several times over.
 if(playerAlive(player)&&!dead.has(player.id)){
  if(c.phase<4)c.hitPoint=Math.max(0,c.hitPoint-1);      // 0x1816ecd91..0x1816ecdbd
  if(c.hitPoint>0){
   state.flash[player.id]=FLASH_TIME_FP;                 // 0x1816ecdde/0x1816ecde7
   // The original emits no event here, only SE 11 and the flash. This record is
   // port-local so a consumer can drive the same sound and blink.
   events.push({event:null,native:false,playerId:player.id,source:c.id,
    hitPoint:c.hitPoint,reason:'thornCeilingHit'});
  }else{
   dead.add(player.id);                                  // 0x1816ece42 QuakeDead
   events.push({event:EVENT_QUAKE_DEAD,playerId:player.id,source:c.id,
    hitPoint:c.hitPoint,reason:'thornCeilingQuakeDead'});
  }
 }
 // 0x1816ece97/0x1816ecea5: every other path ends in RequestDisappear and the
 // disappear SE, so any contact at all consumes the thorn.
 return true;
}
// ThornCeilingComponent.OnUpdate 0x18171e7c0.
function updateCeiling(state,c,players,dead,events,dtFp){
 c.preTimerFp=c.timerFp;                                 // 0x18171e807
 if(c.phase<=2)checkGameOver(state,c,players,dead,events); // 0x18171e7ff/0x18171e82e
 for(let guard=0;guard<4;guard++){
  if(c.phase===0){
   createThornSet(state,c);                              // 0x18171eaa1
   c.phase=1;c.timerFp=START_WAIT_TIME_FP;break;         // 0x18171eab8/0x18171eabc
  }
  if(c.phase===1){
   c.timerFp-=dtFp;                                      // 0x18171e9ee
   if(c.timerFp>0)break;                                 // 0x18171ea64
   c.timerFp=c.avoidTimeFp;c.phase=2;break;              // 0x18171ea77/0x18171ea7b
  }
  if(c.phase===2){
   if(c.timerFp>0){                                      // 0x18171e8ce
    c.timerFp-=dtFp;                                     // 0x18171e93f
    createThornSet(state,c);                             // 0x18171e9c1
    break;
   }
   if(anyThornActive(c))break;                           // 0x18171e8f0/0x18171e8f5
   c.timerFp=0;c.phase=4;break;                          // 0x18171e913/0x18171e917
  }
  if(c.phase===3)break;
  if(c.phase===4){
   c.timerFp-=dtFp;                                      // 0x18171e889
   if(c.timerFp>0)break;                                 // 0x18171e893
   // notifyTarget 0x18171fa60 sends QEventType.SwitchOn to m_TargetName.
   if(c.targetName)events.push({event:EVENT_SWITCH_ON,target:c.targetName,source:c.id,value:0});
   c.phase=5;break;                                      // 0x18171e8be
  }
  break;
 }
 // 0x18171eac0..0x18171eb26: m_SeTimer only schedules the impact sound effect.
 if(c.seTimerFp>0){c.seTimerFp-=dtFp;if(c.seTimerFp<0)c.seTimerFp=0;}
}

function toFp(dt){
 if(!Number.isFinite(dt)||dt<0)throw new Error('Invalid ThornCeiling delta');
 return Math.round(dt*F);
}
// ThornCeiling has nothing to contribute before the player solver; it adds no
// solid and moves nobody. beforeStep exists to satisfy the shared interface.
function beforeStep(state,{dt=1/60}={}){toFp(dt);return {solids:[]};}

function afterStep(state,{dt=1/60,players=[],platforms=[],width=4096,height=2048}={}){
 const dtFp=toFp(dt);
 const widthFp=Math.round(width*F),heightFp=Math.round(height*F);
 const live=players.filter(p=>!p.exit&&!p.dead);
 const dead=new Set(),events=[];
 // PlayerComponent.checkFlashing 0x1816bf940 ages m_FlashTimer and clears
 // m_IsFlashing once it reaches zero.
 for(const id of Object.keys(state.flash)){
  state.flash[id]-=dtFp;
  if(state.flash[id]<=0)delete state.flash[id];
 }
 for(const c of state.ceilings){
  updateCeiling(state,c,players,dead,events,dtFp);
  for(const thorn of c.thorns){
   if(!thorn.active)continue;
   const beforeX=thorn.xFp,beforeY=thorn.yFp;
   updateThorn(thorn,dtFp,widthFp,heightFp);
   if(!thorn.active||thorn.phase>=4||!thorn.collisionActive)continue;
   // The native resolves these contacts in the collision system, which this
   // port approximates with a swept box over the tick, exactly as the sibling
   // Thorn implementation does.
   const dx=(thorn.xFp-beforeX)/F,dy=(thorn.yFp-beforeY)/F;
   const table=THORN_COLLISION[thorn.direction]||THORN_COLLISION[1];
   let hitPlayer=false,hitTerrain=false;
   for(const r of table){
    const swept={x:Math.min(beforeX,thorn.xFp)/F+r.x,y:Math.min(beforeY,thorn.yFp)/F+r.y,
     w:r.w+Math.abs(dx),h:r.h+Math.abs(dy)};
    if(!hitPlayer)for(const p of live)if(overlap(swept,p)){
     if(trySubHitPoint(state,c,thorn,p,dead,events)){hitPlayer=true;break;}
    }
    // ReusableThornComponent.OnContacted 0x1816ec968: a ceiling thorn that
    // touches the map (contact kind 0) goes straight to RequestDisappear, and
    // 0x1816ec6d1 skips ThornComponent.OnPushedBack entirely, so it is never
    // repositioned by the terrain it lands on.
    if(!hitTerrain)for(const o of platforms)if(overlap(swept,o)){hitTerrain=true;break;}
   }
   if(hitPlayer||hitTerrain)requestDisappear(thorn);
  }
 }
 state.ticks++;
 return {events,deadPlayerIds:[...dead],hazards:hazards(state),solids:[]};
}

// ------------------------------------------------------------------ reports
const status=state=>state.ceilings.map(c=>({id:c.id,
 phase:c.phase,phaseName:PHASE_NAMES[c.phase]||String(c.phase),
 timer:c.timerFp/F,hitPoint:c.hitPoint,hitPointMax:c.hitPointMax,
 cleared:c.phase>=5,gameFinished:c.phase>=4,
 activeThorns:c.thorns.filter(t=>t.active).length,lastSet:c.lastSet}));

return {compile,create,solids,hazards,beforeStep,afterStep,status,
 thornRects,progressFp,lerpRound,lerpFp,createThornSet,updateThorn,
 rngRange,pcg32,supportedTypes,
 nativeConstants:Object.freeze({mapChipSize:MAP_CHIP_SIZE,startWaitTime:START_WAIT_TIME_FP/F,
  fadeoutSpeed:FADEOUT_SPEED_FP/F,flashTime:FLASH_TIME_FP/F,
  moveDistanceMargin:MOVE_DISTANCE_MARGIN_FP/F,speedEpsilon:SPEED_EPSILON_FP/F,
  trapWaitMinimum:0x3333/F,hitPointFallback:3,
  thornCollision:THORN_COLLISION,directionVectors:DIRECTION_VECTORS,
  ui:Object.freeze({baseScale:UI_BASE_SCALE,posX:UI_POS_X,posY:UI_POS_Y,posY2:UI_POS_Y_2}),
  events:Object.freeze({switchOn:EVENT_SWITCH_ON,dead:EVENT_DEAD,quakeDead:EVENT_QUAKE_DEAD}),
  rng:Object.freeze({multiplier:'0x5851f42d4c957f2d',defaultState:'0x853c49e6748fea9b',
   defaultIncrement:'0xda3e39cb94b95bdb'})}),
 dummyRect:DUMMY_RECT_EVIDENCE,
 integration:Object.freeze({
  order:'Call beforeStep next to the other device beforeStep calls (it is a no-op), and afterStep after the player solver. Feed afterStep platforms:s.map.platforms, width:s.map.width and height:s.map.height.',
  solids:'None. Never add this module to the solid list.',
  hazards:'afterStep().hazards are Y-down lethal boxes for display; the module already resolves the lethal contacts itself and returns deadPlayerIds.',
  events:'afterStep().events carries the QEventType.SwitchOn (61) notification for m_TargetName when the avoid phase is survived, so it must be merged into the relay/gate event stream exactly like the CollisionSwitch events are.',
  random:'The native column lottery and trap rolls come from the Quantum session RNG. Pass rngState/rngIncrement to create() to make a run reproducible.',
  stage:'compile().stageFlags.enableRetryByPlayerDead is true whenever a ThornCeiling exists; the stage runtime owns how it acts on that.'}),
 completePhysicsFidelity:false};
});
