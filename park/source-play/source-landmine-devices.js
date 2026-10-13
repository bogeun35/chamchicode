/* Source-derived PP2 LandmineSwitch + LandmineSwitchObserver, recovered
   statically from GameAssembly.dll (image base 0x180000000). No native code was
   executed and no original asset is embedded.

   WHAT THE PAIR IS
   st_w_13_01's whole round. Twelve switches lie on the floor; a lottery turns
   some of them into landmines and nobody can see which. One player at a time is
   allowed to move - everyone else is frozen and drawn grey - and that player
   steps on a switch. A safe switch lights up and control passes to the next
   player; a landmine beeps for a second and a half and then kills whoever
   stepped on it. Press enough safe switches and the round's key, which is
   authored inactive, switches on.

   WHICH COMPONENT RUNS WHICH ACTOR TYPE
   creator-delegates-resolved.local.json: ordinal for LandmineSwitch ->
   LandmineSwitchComponent.Creator 0x18186fc00, LandmineSwitchObserver ->
   LandmineSwitchObserverComponent.Creator 0x1818712c0. The Endless siblings
   (EndlessLandmineObserverComponent 0x18182c690 and friends) are a separate
   component and are not ported; no World stage uses them.

   A LANDMINE SWITCH IS ALSO AN ORDINARY SWITCH
   LandmineSwitchComponent has no InitCollision, and its Creator never calls one.
   Its contact comes from a SwitchComponent on the SAME entity:
   LandmineSwitchComponent.GetSwitch 0x18186fba0 resolves it through
   m_EntityRef (+0x18), and the Idle branch of OnUpdate reads that component's
   m_Flags bit2 (0x18187054b `test byte [r15+6], 4`) and m_ContactCollisionId
   (0x18187056b `mov edx, [r15+0xc]`) - both at the offsets
   quantum-field-offsets.json gives for SwitchComponent. So the box is
   SwitchComponent.COLLISION_RECT, the one spring-switch-runtime.js already
   derived, and m_Direction is never written by either ParseParameter, so the
   zero-initialised default (0) applies.

   LandmineSwitchComponent FIELDS (il2cpp minus 16)
     +0x00 m_Flags  +0x04 m_State  +0x08 m_IsEndless  +0x0c m_IsLandmine
     +0x10 m_IsRevealLandmine  +0x14 m_OnPlayerKilled  +0x18 m_EntityRef
     +0x20 m_PushedActor  +0x28 m_SeTimer  +0x30 m_Timer
   statics PUSHED_WAIT_TIME_SAFE@0, PUSHED_WAIT_TIME_FAIL@8, EXPLODE_TIME@0x10.
   LandmineSwitchState is Start, Idle, Judge, Explosion, End = 0..4.

   THE THREE TIMERS
   LandmineSwitchComponent..cctor 0x1818709c0 builds all three with
   FP.FromString_UNSAFE 0x18163fcb0 from metadata string literals, which earlier
   passes recorded as unreadable. They are readable - see
   resolve-string-literals.local.py, which decodes the slot token the way
   il2cpp_codegen_initialize_runtime_metadata 0x1802c5dc0 does and reproduces all
   22 QFP literals as a check:
     slot 0x1831c9b28 "0.4" -> PUSHED_WAIT_TIME_SAFE raw 26214  (0x181870a34)
     slot 0x1831c9e80 "0.5" -> PUSHED_WAIT_TIME_FAIL raw 32768  (0x181870a53)
     slot 0x18317f040 "1.5" -> EXPLODE_TIME          raw 98304  (0x181870a73)

   LandmineSwitchComponent.ParseParameter 0x18186fde0
     datas[0] and datas[1] are QPlayerCountParam tables (0x18186fe5d and
     0x18186fe77, the second with the int flavour) and datas[2] is read as an int
     (sar 0x10 at 0x18186feb2). Every LandmineSwitch in st_w_13_01 authors two
     all-zero tables and a zero int, so none of the three reaches a stored field
     in any shipped stage. compile() refuses a non-zero one rather than guess.

   LandmineSwitchComponent.OnUpdate 0x1818701a0 dispatches on m_State at
   0x1818702a2:
     Start (0)     0x1818706ab: m_Timer = 0 and on to Idle.
     Idle (1)      0x181870536: needs SwitchComponent m_Flags bit2 (contact),
       a live collision (Frame.GetCollisionById 0x181870575) whose owner is a
       player, and the observer neither over nor clear. Then, only when this
       switch is a mine, m_PushedActor = that player (0x181870670), the player's
       input is switched OFF (0x181870691 bts bit7 = SetEnableInput(false)),
       m_Timer = 0 and m_State = Judge (0x1818706a6).
     Judge (2)     0x1818703fe: m_Timer += DeltaTime; the wait is
       PUSHED_WAIT_TIME_FAIL for a mine and PUSHED_WAIT_TIME_SAFE otherwise
       (0x18187043b picks between statics+8 and statics+0). At the end a mine
       goes to Explosion with the presser's input switched back ON
       (0x1818704e3 btr bit7) and two view fields set (0x1818704d1 and
       0x1818704d8); anything else plays SeId 4 unless m_IsEndless and goes
       straight to End (0x181870526).
     Explosion (3) 0x1818702d3: m_Timer += DeltaTime. Below EXPLODE_TIME it
       beeps SeId 4 every QFP._0_05 (0x181870342 compares m_SeTimer against the
       inlined raw 0xccb = 3275). At EXPLODE_TIME: SeId 11, FrameEvents.Flash
       0x1818703ad, Frame.RequestShake 0x1818703b7, killPlayer 0x1818703e6,
       m_OnPlayerKilled = 1 and m_State = End.
     End (4)       m_OnPlayerKilled = 0 (0x1818702ca) and nothing else.
   killPlayer 0x181870820: GetEventParam(0x13 = 19 = QEventType.Dead) and
   Frame.NotifyEvent 0x18174a110, the by-entity overload, so it kills exactly
   the one player who stepped on it. Same event a DeadTimer broadcasts, so an
   immortal player would survive it (deadtimer-device-report.json whoDies).
   RevealLandmine 0x1818708d0 sets the view animation to 2 for a mine and 0
   otherwise and raises m_IsRevealLandmine; ResetLandmine 0x1818708c0 sets
   m_State = 0.

   LandmineSwitchObserverComponent FIELDS
     +0x00 m_ClearSwitchCount  +0x01 m_CurrentPushPlayerIndex
     +0x02 m_LandmineCount     +0x03 m_PushedSwitchCount
     +0x04 m_IsClearEventCalled +0x08 m_IsGameClear +0x0c m_IsGameOver
     +0x10 m_IsJudging +0x14 m_PushPlayerIndexListPtr +0x18 m_SwitchListPtr
     +0x20 m_EntityRef +0x28 m_ClearPercent +0x30 m_LandminePercent
     +0x38 m_Scale +0x40 m_Timer +0x48 m_Pos +0x58 m_TargetName
   statics UI_BASE_SCALE@0 = 0xa0000, UI_POSX@8 = 0, UI_POSY@0x10 = 0x1a00000,
   SWITCH_MAX@0x18 = 16 (..cctor 0x1818732bc..0x1818732fd).

   LandmineSwitchObserverComponent.ParseParameter 0x1818713e0
     datas[0] -> m_LandminePercent and datas[1] -> m_ClearPercent, each a PERCENT
       divided into FP by the same magic sequence (0x181871571 loads
       0xa3d70a3d70a3d70b, 0x18187159e and 0x1818715c2 shift by 22): the
       expression is (n << 32) / (100 * 65536), i.e. the FP raw is
       trunc(n * 65536 / 100). Stored at 0x1818715af and 0x1818715d0.
     datas[2] -> m_TargetName (QStringUtf8_32..ctor 0x1818715d7).
     datas[3]/datas[4] -> m_Pos, added to UI_POSX / UI_POSY (0x181871638).
     datas[5] -> m_Scale, scaled by UI_BASE_SCALE above the FP epsilon and the
       bare UI_BASE_SCALE below it (0x1818716bb / 0x181871672). Cosmetic.

   lottelyLandmine 0x181872370, called once from OnStart 0x181871ddc
     n = the switch count.
     mines = ceil(FP(n) * m_LandminePercent), clamped to n-1 and floored at 1
       (0x181872518..0x181872583).
     clearSwitchCount = ceil(FP(n) * m_ClearPercent), clamped to n - mines and
       floored at 1 (0x181872528..0x181872599).
     Then a descending Fisher-Yates over the switch list using the integer
       RNGSession.Next 0x181662090 with (0, i+1) (0x181872690, swap at
       0x1818726e0/0x181872708), and the first `mines` entries get
       SetIsLandmine(true) (the loop at 0x18187273e).
   OnStart also calls NotifySwitchOnOffEvent 0x181871dcb once before the lottery,
   which is what closes the target to begin with.

   LandmineSwitchObserverComponent.OnUpdate 0x181871e30
     It walks the switch list (0x181872101..0x181872172): a mine that is
     Exploding or Ended sets m_IsGameOver, and every non-mine switch in End is
     counted. Then:
       m_IsGameOver -> nothing more (0x1818721a2).
       m_IsGameClear -> the clear tail below (0x1818721ac).
       the count unchanged -> nothing (0x1818721b6).
       the count changed and still short of m_ClearSwitchCount ->
         m_CurrentPushPlayerIndex = (m_CurrentPushPlayerIndex + 1) % list.Count
         (0x18187221a) and changeControlablePlayer 0x181872280.
       the count reached m_ClearSwitchCount -> m_IsGameClear = 1 (0x181872298).
     The clear tail 0x1818722a1, once, guarded by m_IsClearEventCalled: count
     m_Timer up to QFP._1 (0x1818722c9 compares against 0x10000), then
     Frame.PlaySe SeId 0x18, NotifySwitchOnOffEvent with on = true
     (0x18187230a), m_IsClearEventCalled = 1 and unlockPlayerControl
     0x18187231f.

   changeControlablePlayer 0x181872cc0 walks every player actor and, for the one
   whose actor index matches, CLEARS PlayerComponent m_Flags bits 7 and 0x19;
   for everyone else it SETS them (0x181872df8 jne, 0x181872dfa/0x181872dfe
   versus 0x181872e04/0x181872e0b). Bit 7 is SetEnableInput - the setter
   0x1816bcff0 sets the bit when the argument is FALSE - and bit 0x19 is
   IsGrayscale (SetGrayscale 0x1816bd050). So the chosen player moves in colour
   and everyone else is frozen and grey.

   WHAT IS NOT HERE
   lottelyPushPlayerRoutine 0x181872890 exists but NOTHING in this component
   calls it: the full call lists of Creator, InitPost, OnStart, OnUpdate and
   OnExit contain no reference to it (only the Endless observer has a live copy
   at 0x18182f190). The push order is therefore the order OnStart fills
   m_PushPlayerIndexList in, which is the player index order. */
(function(root,factory){const api=factory();if(typeof module==='object'&&module.exports)module.exports=api;root.SourceLandmineDevices=api;})(typeof globalThis!=='undefined'?globalThis:this,function(){
'use strict';

const STATE={START:0,IDLE:1,JUDGE:2,EXPLOSION:3,END:4};
const EVENT={SWITCH_ON:61,SWITCH_OFF:60,DEAD:19};
const SE={SAFE:4,EXPLODE:11,CLEAR:0x18};
// LandmineSwitchComponent..cctor 0x1818709c0, read with resolve-string-literals.local.py.
const PUSHED_WAIT_TIME_SAFE_RAW=26214;   // "0.4"
const PUSHED_WAIT_TIME_FAIL_RAW=32768;   // "0.5"
const EXPLODE_TIME_RAW=98304;            // "1.5"
// The beep interval is the inlined QFP._0_05 raw compared at 0x181870342.
const SE_INTERVAL_RAW=0xccb;
// LandmineSwitchObserverComponent..cctor 0x1818732bc..0x1818732fd.
const UI_BASE_SCALE_RAW=0xa0000,UI_POSX_RAW=0,UI_POSY_RAW=0x1a00000,SWITCH_MAX=16;
const CLEAR_DELAY_RAW=0x10000;           // QFP._1, compared at 0x1818722c9
const FP_ONE=65536,FP_EPSILON=4;
const MASK64=(1n<<64n)-1n;
// PCG32 XSH-RR, the generator the thorn ceiling and the coop count-up timer also
// use. The multiplier is literal at 0x1816620bc in the integer Next.
const PCG_MULT=6364136223846793005n;
const DEFAULT_RNG_STATE=0x853c49e6748fea9bn,DEFAULT_RNG_INCREMENT=0xda3e39cb94b95bdbn;

const tickRaw=dt=>Math.trunc(dt*FP_ONE);
const allowed=(v,c)=>!v||v<0&&c<=-v||v>0&&v<10&&c>=v||v>=10&&c>=Math.trunc(v/10)&&c<=v%10;
const overlap=(a,b)=>a.x<b.x+b.w&&a.x+a.w>b.x&&a.y<b.y+b.h&&a.y+a.h>b.y;

function pcg32(rng){
 const old=rng.state;
 rng.state=(old*PCG_MULT+(rng.inc|1n))&MASK64;
 const xorshifted=Number(((old>>45n)^(old>>27n))&0xffffffffn);
 const rot=Number((old>>59n)&31n);
 return ((xorshifted>>>rot)|(xorshifted<<((32-rot)&31)))>>>0;
}
// RNGSession.Next(int,int) 0x181662090: rejection sampling over the half-open
// range, so the draw is uniform and never biased by a modulo.
function rngRange(rng,min,max){
 if(min>max){const t=min;min=max;max=t;}
 const span=max-min;
 if(span<=0)return min;
 const threshold=(0x100000000%span)>>>0;
 let x;do{x=pcg32(rng);}while(x<threshold);
 return min+(x%span);
}

// ParseParameter 0x181871571..0x1818715d0: (n << 32) / (100 * 65536), which is
// an FP raw of n percent with the division truncating toward zero.
const percentRaw=n=>Math.trunc(Math.trunc(n)*FP_ONE/100);
// The product's whole part plus one whenever any of the low 16 bits survive.
const ceilFp=raw=>(raw>>16)+((raw&0xffff)?1:0);

// QPlayerCountParam, the grammar decoded for SwitchTimer and BlinkBlock.
function tableIsZero(slot){
 if(!slot||slot.t!==2||typeof slot.s!=='string')return true;
 const text=slot.s.length===58&&slot.s[0]==='"'&&slot.s[57]==='"'?slot.s.slice(1,57):slot.s;
 if(text.length!==56)return false;
 return [...text].every(c=>((c.codePointAt(0)-0x21)&0xff)===0);
}

function compile(actors,count,options){
 const {rngState=DEFAULT_RNG_STATE,rngIncrement=DEFAULT_RNG_INCREMENT}=options||{};
 const switches=[],observers=[],warnings=[];
 actors.forEach((raw,i)=>{
  const a=raw.properties||raw,pos=raw.position||{x:raw.x??raw.posX,y:raw.y??raw.posY};
  const data=raw.datas||raw.parameters||[];
  const n=j=>data[j]&&data[j].t===1?data[j].f:0;
  const s=j=>{
   if(!data[j]||data[j].t!==2||typeof data[j].s!=='string')return '';
   const v=data[j].s;
   return v.length>=2&&v[0]==='"'&&v[v.length-1]==='"'?v.slice(1,-1):v;
  };
  if(!allowed(a.playerCount,count))return;
  const common={id:raw.id||'source:a'+i,name:a.name||'',type:a.typeName,x:pos.x,y:pos.y};
  if(a.typeName==='LandmineSwitch'){
   // The three authored slots never reach a stored field in any shipped stage,
   // so what they would do is unknown. A non-zero one is refused, not guessed.
   if(!tableIsZero(data[0])||!tableIsZero(data[1])||Math.trunc(n(2))!==0)
    throw Error('Unverified LandmineSwitch parameters on '+common.id);
   switches.push({...common,state:STATE.START,isLandmine:false,isRevealed:false,
    onPlayerKilled:false,pushedPlayerId:null,timerRaw:0,seTimerRaw:0,isEndless:false});
  }else if(a.typeName==='LandmineSwitchObserver'){
   const targetName=s(2);
   if(!targetName)throw Error('LandmineSwitchObserver without a target name');
   const landminePercentRaw=percentRaw(n(0)),clearPercentRaw=percentRaw(n(1));
   if(landminePercentRaw<=0||clearPercentRaw<=0)
    throw Error('LandmineSwitchObserver percentages must both be positive');
   observers.push({...common,targetName,landminePercentRaw,clearPercentRaw,
    landmineCount:0,clearSwitchCount:0,currentPushPlayerIndex:0,pushedSwitchCount:0,
    isClearEventCalled:false,isGameClear:false,isGameOver:false,timerRaw:0,
    switchIds:[],pushPlayerIds:[],
    uiPosParam:{x:n(3),y:n(4)},uiScaleParam:n(5)});
  }
 });
 if(observers.length>1)throw Error('More than one LandmineSwitchObserver in a stage is not ported');
 if(observers.length&&!switches.length)throw Error('LandmineSwitchObserver with no LandmineSwitch');
 if(switches.length&&!observers.length)throw Error('LandmineSwitch with no LandmineSwitchObserver');
 const rng={state:BigInt(rngState)&MASK64,inc:BigInt(rngIncrement)&MASK64};
 for(const observer of observers){
  if(switches.length>SWITCH_MAX)
   throw Error('More LandmineSwitches than SWITCH_MAX ('+SWITCH_MAX+')');
  observer.switchIds=switches.map(sw=>sw.id);
  // lottelyLandmine 0x181872518..0x181872599.
  const total=switches.length,totalFp=total*FP_ONE;
  let mines=ceilFp(Math.trunc(totalFp*observer.landminePercentRaw/FP_ONE));
  mines=Math.max(1,Math.min(mines,total-1));
  let clear=ceilFp(Math.trunc(totalFp*observer.clearPercentRaw/FP_ONE));
  clear=Math.max(1,Math.min(clear,total-mines));
  observer.landmineCount=mines;observer.clearSwitchCount=clear;
  // Descending Fisher-Yates over the switch ids, 0x181872670..0x181872738.
  const order=switches.map(sw=>sw.id);
  for(let i=order.length-1;i>0;i--){
   const j=rngRange(rng,0,i+1);
   const swap=order[i];order[i]=order[j];order[j]=swap;
  }
  for(const id of order.slice(0,mines))switches.find(sw=>sw.id===id).isLandmine=true;
 }
 return {schemaVersion:1,count,switches,observers,warnings,
  rng:{state:rng.state.toString(),inc:rng.inc.toString()},
  completePhysicsFidelity:false};
}

const create=c=>JSON.parse(JSON.stringify(c));
// Neither component has an InitCollision; the entity's SwitchComponent sensor
// never blocks anybody (spring-switch-runtime.js, Switch.InitCollision
// 0x181714790 leaves m_PushBackTarget 0).
function solids(){return [];}

const observerOf=state=>state.observers[0]||null;

// changeControlablePlayer 0x181872cc0. The list order is the player order, and
// the index wraps (0x18187221a).
function controlPlayer(state,players,index){
 const observer=observerOf(state);
 if(!observer)return;
 const ids=players.map(p=>p.id);
 observer.pushPlayerIds=ids;
 const chosen=ids[((index%ids.length)+ids.length)%ids.length];
 for(const p of players){
  p.inputLocked=p.id!==chosen;
  p.grayscale=p.id!==chosen;
 }
}
// unlockPlayerControl 0x181872e40, reached once on clear.
function unlockAll(players){
 for(const p of players){p.inputLocked=false;p.grayscale=false;}
}

function beforeStep(state,{dt=1/60,players=[],switchContacts=[]}={}){
 if(!Number.isFinite(dt)||dt<0)throw Error('Invalid landmine delta');
 const observer=observerOf(state);
 const events=[],sounds=[],deadPlayerIds=[];
 if(!observer)return {events,sounds,deadPlayerIds,solids:[]};
 // The native adds Frame.DeltaTime's FP raw, an integer, and compares against
 // integer raws. Converting dt the way FP.FromFloat_UNSAFE 0x18163fc40 does -
 // multiply by 65536 and truncate - keeps the whole machine in exact integers
 // and lands one frame of 60Hz on 1092, which is QFP.OneFrame's own raw
 // (resolve-string-literals.local.py). Accumulating the float instead drifted
 // the 0.5s judge by a whole frame.
 const dtRaw=tickRaw(dt);
 const live=players.filter(p=>!p.exit&&!p.dead);
 const contactFor=id=>{
  const hit=switchContacts.find(c=>c.relayId===id);
  return hit?live.find(p=>p.id===hit.actorId)||null:null;
 };
 for(const sw of state.switches){
  switch(sw.state){
   case STATE.START:
    sw.timerRaw=0;sw.state=STATE.IDLE;break;
   case STATE.IDLE:{
    if(observer.isGameOver||observer.isGameClear)break;
    const presser=contactFor(sw.id);
    if(!presser)break;
    // m_PushedActor is only recorded for a mine (0x181870666 guards the store).
    if(sw.isLandmine)sw.pushedPlayerId=presser.id;
    // The presser is frozen for the length of the judge, unless the round is
    // already clear (0x181870674).
    presser.inputLocked=true;
    sw.timerRaw=0;sw.state=STATE.JUDGE;break;
   }
   case STATE.JUDGE:{
    sw.timerRaw+=dtRaw;
    const wait=sw.isLandmine?PUSHED_WAIT_TIME_FAIL_RAW:PUSHED_WAIT_TIME_SAFE_RAW;
    if(sw.timerRaw<wait)break;
    if(sw.isLandmine&&sw.pushedPlayerId){
     const presser=live.find(p=>p.id===sw.pushedPlayerId);
     if(presser)presser.inputLocked=false;
     sw.timerRaw=0;sw.state=STATE.EXPLOSION;
    }else{
     if(!sw.isEndless)sounds.push({switchId:sw.id,seId:SE.SAFE});
     sw.timerRaw=0;sw.state=STATE.END;
    }
    break;
   }
   case STATE.EXPLOSION:{
    sw.timerRaw+=dtRaw;
    if(sw.timerRaw<EXPLODE_TIME_RAW){
     sw.seTimerRaw+=dtRaw;
     if(sw.seTimerRaw>=SE_INTERVAL_RAW){
      sounds.push({switchId:sw.id,seId:SE.SAFE});sw.seTimerRaw=0;
     }
     break;
    }
    sounds.push({switchId:sw.id,seId:SE.EXPLODE,flash:true,shake:true});
    if(sw.pushedPlayerId){
     events.push({targetId:sw.pushedPlayerId,eventType:EVENT.DEAD,senderId:sw.id});
     const victim=live.find(p=>p.id===sw.pushedPlayerId);
     if(victim&&!victim.immortal)deadPlayerIds.push(victim.id);
    }
    sw.isRevealed=true;sw.onPlayerKilled=true;sw.state=STATE.END;break;
   }
   case STATE.END:
    sw.onPlayerKilled=false;break;
   default:break;
  }
 }
 // OnUpdate 0x181872101..0x181872172: a mine that is exploding or finished ends
 // the round, and every finished safe switch counts.
 let pressed=0;
 for(const id of observer.switchIds){
  const sw=state.switches.find(q=>q.id===id);
  if(!sw)continue;
  if(sw.state===STATE.END){
   if(sw.isLandmine)observer.isGameOver=true;else pressed++;
  }else if(sw.isLandmine&&sw.state===STATE.EXPLOSION)observer.isGameOver=true;
 }
 if(observer.isGameOver)return {events,sounds,deadPlayerIds,solids:[]};
 if(observer.isGameClear){
  if(!observer.isClearEventCalled){
   observer.timerRaw+=dtRaw;
   if(observer.timerRaw>=CLEAR_DELAY_RAW){
    sounds.push({observerId:observer.id,seId:SE.CLEAR});
    events.push({targetName:observer.targetName,eventType:EVENT.SWITCH_ON,on:true,senderId:observer.id});
    observer.isClearEventCalled=true;
    unlockAll(live);
   }
  }
  return {events,sounds,deadPlayerIds,solids:[]};
 }
 if(pressed!==observer.pushedSwitchCount){
  observer.pushedSwitchCount=pressed;
  if(pressed>=observer.clearSwitchCount)observer.isGameClear=true;
  else{
   observer.currentPushPlayerIndex=live.length
    ? (observer.currentPushPlayerIndex+1)%live.length : 0;
   controlPlayer(state,live,observer.currentPushPlayerIndex);
  }
 }
 return {events,sounds,deadPlayerIds,solids:[]};
}

function afterStep(){return {events:[],deadPlayerIds:[]};}

// What the renderer needs. A switch only shows whether it is a mine once it has
// revealed itself (RevealLandmine 0x1818708d0), so `isLandmine` is deliberately
// not exposed before then - leaking it would give the answer away.
function displays(state){
 const observer=observerOf(state);
 return {
  observer:observer&&{id:observer.id,clearSwitchCount:observer.clearSwitchCount,
   landmineCount:observer.landmineCount,pushedSwitchCount:observer.pushedSwitchCount,
   currentPushPlayerId:observer.pushPlayerIds[observer.currentPushPlayerIndex]||null,
   isGameClear:observer.isGameClear,isGameOver:observer.isGameOver,
   uiPosParam:observer.uiPosParam,uiScaleParam:observer.uiScaleParam},
  switches:state.switches.map(sw=>({id:sw.id,x:sw.x,y:sw.y,state:sw.state,
   pressed:sw.state===STATE.END||sw.state===STATE.JUDGE,
   exploding:sw.state===STATE.EXPLOSION,
   revealedLandmine:sw.isRevealed?sw.isLandmine:null}))
 };
}

const supportedTypes=['LandmineSwitch','LandmineSwitchObserver'];

return {compile,create,solids,beforeStep,afterStep,displays,supportedTypes,
 controlPlayer,unlockAll,pcg32,rngRange,percentRaw,ceilFp,tickRaw,
 nativeConstants:Object.freeze({state:STATE,event:EVENT,se:SE,
  pushedWaitTimeSafeRaw:PUSHED_WAIT_TIME_SAFE_RAW,pushedWaitTimeFailRaw:PUSHED_WAIT_TIME_FAIL_RAW,
  explodeTimeRaw:EXPLODE_TIME_RAW,seIntervalRaw:SE_INTERVAL_RAW,clearDelayRaw:CLEAR_DELAY_RAW,
  switchMax:SWITCH_MAX,uiBaseScaleRaw:UI_BASE_SCALE_RAW,uiPosXRaw:UI_POSX_RAW,uiPosYRaw:UI_POSY_RAW,
  fpEpsilon:FP_EPSILON,
  rng:Object.freeze({multiplier:'0x5851f42d4c957f2d',intVariant:'0x181662090'})}),
 integration:Object.freeze({
  switches:'Each LandmineSwitch shares its entity with a SwitchComponent, so it has to be registered as a relay switch (spring-switch-runtime.js) and appear in map.switches. beforeStep() then takes the relay layer\'s switchContacts and never computes a box of its own.',
  input:'The device writes p.inputLocked and p.grayscale on the player objects. The runtime must skip a locked player\'s input, and the renderer must grey them out, or the one-at-a-time rule is invisible and unenforced.',
  solids:'Always empty. Neither component has an InitCollision and the switch sensor never pushes back.',
  events:'Outgoing: event 19 (Dead) at one player when a mine finishes its 1.5s, and event 61 to the observer\'s target one second after the round is cleared - which is what activates the authored-inactive key.',
  random:'Which switches are mines is drawn once in compile() from the Quantum session RNG, whose live seed is not in the binary. Pass rngState/rngIncrement to make a run reproducible; the compiled state carries the result, so online peers agree without re-drawing.'}),
 completePhysicsFidelity:false};
});
