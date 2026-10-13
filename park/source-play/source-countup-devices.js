/* Source-derived PP2 CountUpTimer + CoopCountUpTimer, recovered statically from
   GameAssembly.dll (image base 0x180000000). No native code was executed and no
   original asset is embedded.

   WHAT THE PAIR IS
   st_w_10_01's whole round. One CoopCountUpTimer runs a reaction test: it waits,
   shows "Ready", waits a random 1.25..5.36s, shows "Go", and from that instant
   every player's own CountUpTimer counts up until that player stands on their
   Switch. The SUM of all the stop times has to land inside a judge window. Win
   and the stage's key - which is authored inactive - is switched on. Lose and
   everything resets and you try again; nobody dies.

   WHICH COMPONENT RUNS WHICH ACTOR TYPE
   creator-delegates-resolved.local.json: ordinal 165 CoopCountUpTimer ->
   CoopCountUpTimerComponent.Creator 0x181807a50, ordinal 166 CountUpTimer ->
   CountUpTimerComponent.Creator 0x18180c820. Two separate components; unlike
   SwitchTimer/DeadTimer they share nothing.

   CountUpTimerComponent FIELDS (quantum-field-offsets.json, il2cpp minus 16)
     +0x00 m_Index (byte)   +0x02 m_Flags (word)   +0x08 m_EntityRef
     +0x10 m_LimitTime      +0x18 m_Time           +0x20 m_UIScale
     +0x28 m_UIPos          +0x38 m_ParentName (QStringUtf8_32)
   statics RESOURCE_PATH@0, LIMIT_TIME@8, BATTLE_LIMIT_TIME@0x10.

   CountUpTimerComponent.ParseParameter 0x18180c9d0
     datas[0] -> m_Index, sar 0x10 at 0x18180ca60, stored 0x18180caf3.
     datas[1] -> m_ParentName via QStringUtf8_32..ctor 0x18180cb08, stored
       0x18180cb17/0x18180cb1c.
     datas[2] -> m_UIScale, but only when it is greater than QFP._0
       (0x18180cb63): m_UIScale = datas[2] * <otherStatics+8> >> 16
       (0x18180cb8e, store 0x18180cb97). Cosmetic; see `unresolved` in the report.
     The create position lands in m_UIPos at 0x18180cb38. Cosmetic.

   CountUpTimerComponent.Initialize 0x18180c930
     m_UIScale   = <otherStatics+8>             (0x18180c995)
     m_LimitTime = CountUpTimer.LIMIT_TIME      (0x18180c9c3)
   ..cctor 0x18180cf70 fills those statics from QFP: LIMIT_TIME = QFP[0x170] =
   QFP._10 = 10 (0x18180d09c) and BATTLE_LIMIT_TIME = QFP[0x128] = QFP._3 = 3
   (0x18180d0c3).

   CountUpTimerComponent.OnStart 0x18180cbc0
     GetEventParam(2) 0x18180cc2c, param+0x20 = m_Index (0x18180cc3d), then
     Frame.NotifyEvent 0x181749fa0 - the name-targeted overload - to
     m_ParentName. That is how a timer registers itself with its parent.
     It then looks the parent up (ActorSceneComponent.FindActor 0x1816a7b80)
     and ONLY if the parent's ActorComponent.m_ActorType (+6) equals 0xcf = 207
     = CountUpJudge (creator ordinal 207) does it set m_Flags bit4 and reload
     m_LimitTime = BATTLE_LIMIT_TIME = 3 (0x18180cd0c..0x18180cd4d). A coop
     parent is type 165, so bit4 stays clear and the limit stays 10.

   m_Flags, read back by the component's own accessors (shared bodies, so the
   symbol index names another owner - the code is what matters):
     bit0 counting   bit1 IsStopped (test +2,2)   bit2 IsFailed (test +2,4)
     bit3 IsHatena (test +2,8)   bit4 parent is a CountUpJudge
   CountUpTimerComponent.OnUpdate 0x18180cd70
     Only runs while bit0 is set (0x18180cd76). m_Time += DeltaTime
     (0x18180cd9d). On reaching m_LimitTime: clamp, set bit1, clear bit0
     (0x18180cdab..0x18180cdc2) and, only with bit4, set bit2 - so a coop timer
     that is never pressed stops at 10s WITHOUT being marked failed; its 1000
     centiseconds simply blow the judge window.
   CountUpTimerComponent.OnRecvEvent 0x18180cdf0
     event  1 (0x18180cf46) start: ignored while bit2; else set bit0, clear bit1
     event 61 (0x18180cf0a) the Switch: if counting, clear bit0 and (only with
       bit4) set bit3; if NOT counting, set bit2 - that is the false start.
       Either way set bit1.
     event 47 (0x18180ceba) reset: m_Time = QFP._0, clear bits 0..3
     event 42 (0x18180ce92) clear bit3 only (the versus-mode reveal)

   CoopCountUpTimerComponent FIELDS
     +0x00 m_ColorType +0x01 m_Phase +0x02 m_Flags +0x04 m_JudgeTimeMax (int)
     +0x08 m_JudgeTimeMin (int) +0x0c m_SumTime (int) +0x10 _m_TimerInfos_
     (8 x 8 bytes) +0x50 m_EntityRef +0x58 m_ReadySecMax +0x60 m_ReadySecMin
     +0x68 m_Timer +0x70 m_UIScale +0x78 m_UIPos
   The three int fields are CENTISECONDS, not FP.

   CoopCountUpTimerComponent.ParseParameter 0x181807c20
     datas[1] is a QPlayerCountParam decoded by 0x18096f720 (0x181807d05) into
     seven FP values; the loop at 0x181807e26..0x181807e79 starts at
     Frame.GetPlayerIndexCount-2 (0x181807dee) and walks DOWN to the first
     non-zero entry.
     m_JudgeTimeMin = (int)((QFP._0_005 + datas[0]) * 100)  0x181807eb3/0x181807ebe
     m_JudgeTimeMax = (int)((QFP._0_005 + table)    * 100)  0x181807ed7/0x181807ee2
       Both are one FP multiply by 0x640000 (=100) followed by sar 0x20, i.e.
       an FP->int floor. QFP+0x10 = QFP._0_005 is a half-centisecond nudge so
       the floor behaves like a round.
     datas[2]/datas[3] -> m_UIPos, each added to a static pair (0x181807f30).
     datas[4] -> m_UIScale when |datas[4]| >= 4/65536 (0x181807f3c, store
       0x181807f71). Cosmetic.
     datas[5] -> m_ReadySecMin when > QFP._0 (0x181807f98, store 0x181807f9d)
     datas[6] -> m_ReadySecMax when > QFP._0 (0x181807fc4, store 0x181807fc9)
   CoopCountUpTimerComponent.OnRecvEvent 0x181808960
     event 2 only (0x1818089b7): addTimer(param+0x20, param+0x18), i.e.
     _m_TimerInfos_[index] = sender. addTimer 0x181808a30 drops an index that
     is negative or >= 8 (0x181808a7b, 0x181808abd) without complaining.
   CoopCountUpTimerComponent.sumTime 0x1818086e0
     Walks all 8 slots (0x1818087a6 cmp 0x40). For each resolved timer:
       m_SumTime += (int)(timer.m_Time * 100)  0x181808849/0x181808855
       allStopped &= timer bit1                0x181808858..0x181808866
       anyFailed  |= timer bit2                0x181808877/0x18180887d
     then m_SumTime (0x181808888), m_Flags bit0 = allStopped (0x181808895/
     0x18180889c) and bit1 = anyFailed (0x1818088af/0x1818088b5).
   CoopCountUpTimerComponent.isCleared 0x181808940
     !anyFailed && m_JudgeTimeMin < m_SumTime && m_SumTime < m_JudgeTimeMax.
   CoopCountUpTimerComponent.OnPost 0x181808030 calls updatePhase 0x1818080f0
     every tick unless StageComponent +4 bit1 is set (0x1818080a6).
   updatePhase: sumTime first (0x181808166), then an 8 entry jump table read
   from 0x1818086c0 on m_Phase (0x18180816b, bail when > 7):
     0 0x181808197 m_ColorType = 0; m_Timer = QFP[0x90] = QFP._0_50 = 0.5; ++
     1 0x1818081e6 anyFailed -> phase 5 (0x18180855b). Else count m_Timer down;
         at zero raise the Ready notice (word 0x301 at 0x181808282) and
         Frame.PlaySe 0x18174a3b0 with SeId 0x17, then
         m_Timer = RNGSession.Next(m_ReadySecMin, m_ReadySecMax)
         (0x1818082f5/0x1818082fa) and ++
     2 0x181808303 anyFailed -> release the notice then phase 5. Else count
         down; at zero release the Ready notice (0x18180837c), raise the Go
         notice (word 0x401 at 0x1818083d9), GetEventParam(1) and
         Frame.NotifyEvent 0x181749b80 - the BY ACTOR TYPE overload - with type
         0xa6 = 166 = CountUpTimer (0x18180843c/0x181808444). That single call
         starts every timer. m_Timer = QFP[0xf0] = QFP._1 = 1 and ++
     3 0x18180847b anyFailed -> notice release then phase 5. If allStopped skip
         the wait (0x181808487); otherwise count down and return while > 0.
         Then release the Go notice (0x181808503) and ++
     4 0x181808564 return unless allStopped (0x181808568). Then the isCleared
         test inline (0x181808583..0x18180859c): fail -> phase 5 (++),
         success -> phase 7 (0x1818085a2)
     5 0x1818085ab m_ColorType = 2; m_Timer = QFP[0x110] = QFP._1_50 = 1.5; ++
     6 0x1818085e0 count down; at zero GetEventParam(0x2f = 47) and
         Frame.NotifyEvent 0x181749790 - the whole-scene broadcast - then
         m_Phase = 0 (0x18180866b). The round retries forever.
     7 0x181808674 m_ColorType = 1; GetEventParam(1) and NotifyEvent by actor
         type 0x11 = 17 = Key (0x1818086a9/0x1818086ad), then ++ to 8, which
         the jump table's bail treats as "done".
   KeyComponent.OnRecvEvent 0x18186cf90 answers event 1 exactly like event 61
   (0x18186cff4/0x18186cffd both jump to 0x18186d0e2) and calls
   KeyComponent.setActive 0x18186d170 with true, unless its own m_Flags bit2 is
   set. st_w_10_01's Key authors datas[2] = 1 = m_Inactive, so winning the
   minigame is what makes the key touchable. */
(function(root,factory){const api=factory();if(typeof module==='object'&&module.exports)module.exports=api;root.SourceCountUpDevices=api;})(typeof globalThis!=='undefined'?globalThis:this,function(){
'use strict';

const ACTOR_TYPE={COOP_COUNT_UP_TIMER:165,COUNT_UP_TIMER:166,KEY:17,COUNT_UP_JUDGE:207};
const EVENT={START:1,REGISTER:2,CLEAR_HATENA:42,RESET:47,SWITCH_ON:61};
// QFP statics, named by value in the Quantum metadata (quantum-field-offsets.json).
const LIMIT_TIME=10,BATTLE_LIMIT_TIME=3;               // QFP[0x170] / QFP[0x128]
const PHASE0_WAIT=0.5,GO_NOTICE_HOLD=1,FAIL_HOLD=1.5;  // QFP[0x90]/[0xf0]/[0x110]
const READY_SE_ID=0x17;
const NOTICE={READY:{type:1,anim:3,word:0x301},GO:{type:1,anim:4,word:0x401}};
const FP_ONE=65536,FP_EPSILON=4,CENTI=100;
// QFP._0_005 as an FP raw. FP.FromString_UNSAFE 0x18163fcb0 parses to double,
// narrows to float32 and then FP.FromFloat_UNSAFE 0x18163fc40 multiplies by
// 65536.0f and TRUNCATES with cvttss2si - the derivation already used for
// KeyComponent.PLAYER_COUNT_SCALE (key-reach-report.json). 0.005f is
// 0.004999999888..., so 0.005f * 65536 = 327.67999... and the raw is 327.
const ROUND_BIAS_RAW=327;
const MASK64=(1n<<64n)-1n;
// PCG32 XSH-RR, the same generator the thorn ceiling uses. The multiplier
// appears literally at 0x181662031 (FP variant) and 0x1816620bc (int variant).
const PCG_MULT=6364136223846793005n;
// Photon Quantum's documented default stream. The live seed is session data and
// is NOT in the binary, so a run matches the original only in distribution.
const DEFAULT_RNG_STATE=0x853c49e6748fea9bn,DEFAULT_RNG_INCREMENT=0xda3e39cb94b95bdbn;

// ActorFactoryComponent.Update 0x1816a2fe9 population filter, as in the other modules.
const allowed=(v,c)=>!v||v<0&&c<=-v||v>0&&v<10&&c>=v||v>=10&&c>=Math.trunc(v/10)&&c<=v%10;

// The stage asset stores t==1 slots as floats and the loader turns them into FP.
// Which way a non-representable decimal rounds is not in the binary, so where it
// could change an answer this throws instead of picking one.
function fpRawCandidates(value){
 const scaled=value*FP_ONE,low=Math.floor(scaled);
 return Number.isInteger(scaled)?[scaled]:[low,low+1];
}
// (QFP._0_005 + raw) * 0x640000 >> 32, which is one FP multiply by 100 followed
// by an FP->int floor.
const centiseconds=raw=>Math.floor((raw+ROUND_BIAS_RAW)*CENTI/FP_ONE);
function judgeThreshold(value,what){
 const seen=[...new Set(fpRawCandidates(value).map(centiseconds))];
 if(seen.length!==1)throw Error('Ambiguous float to FP rounding for '+what+' '+value);
 return seen[0];
}

// QPlayerCountParam: QPlayerCountParamUtility deserialiser 0x18096f720, byte
// loop 0x18096f80c, byte = (charCode & 0xff) - 0x21, 56 bytes = seven
// little-endian signed 8 byte FP raws, one per player count 2..8.
function playerCountTable(slot){
 if(!slot||slot.t!==2||typeof slot.s!=='string')throw Error('CoopCountUpTimer judge table is missing');
 const text=slot.s.length===58&&slot.s[0]==='"'&&slot.s[57]==='"'?slot.s.slice(1,57):slot.s;
 if(text.length!==56)throw Error('CoopCountUpTimer judge table must be 56 units');
 const bytes=[...text].map(c=>(c.codePointAt(0)-0x21)&0xff);
 const out=[];
 for(let i=0;i<7;i++){
  let v=0n;for(let b=7;b>=0;b--)v=(v<<8n)|BigInt(bytes[i*8+b]);
  out.push(v>=(1n<<63n)?v-(1n<<64n):v);
 }
 return out.map(Number);
}
// 0x181807e26..0x181807e79: start at count-2 and walk down to the first non-zero.
function findByPlayerCount(table,count){
 for(let i=Math.min(count,8)-2;i>=0;i--)if(table[i])return table[i];
 return 0;
}

function pcg32(rng){
 const old=rng.state;
 rng.state=(old*PCG_MULT+(rng.inc|1n))&MASK64;
 const xorshifted=Number(((old>>45n)^(old>>27n))&0xffffffffn);
 const rot=Number((old>>59n)&31n);
 return ((xorshifted>>>rot)|(xorshifted<<((32-rot)&31)))>>>0;
}
// RNGSession.Next(FP,FP) 0x181662020: the top 16 bits of the 32 bit output are
// an FP fraction in [0,1), scaled by (max-min) and added to min.
function rngNextSeconds(rng,minSeconds,maxSeconds){
 let lo=Math.round(minSeconds*FP_ONE),hi=Math.round(maxSeconds*FP_ONE);
 if(lo>hi){const t=lo;lo=hi;hi=t;}
 const fraction=pcg32(rng)>>>16;
 return (lo+Math.floor(fraction*(hi-lo)/FP_ONE))/FP_ONE;
}

function compile(actors,count,options){
 const {rngState=DEFAULT_RNG_STATE,rngIncrement=DEFAULT_RNG_INCREMENT}=options||{};
 const timers=[],coops=[],warnings=[];
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
  if(a.typeName==='CountUpTimer'){
   const parentName=s(1);
   if(!parentName)throw Error('CountUpTimer without a parent name');
   timers.push({...common,index:Math.trunc(n(0)),parentName,uiScaleParam:n(2),
    time:0,limitTime:LIMIT_TIME,counting:false,stopped:false,failed:false,
    hatena:false,judgeParent:false});
  }else if(a.typeName==='CoopCountUpTimer'){
   const table=playerCountTable(data[1]);
   const resolved=findByPlayerCount(table,count);
   if(!resolved)throw Error('CoopCountUpTimer judge table has no entry at or below this player count');
   const judgeTimeMin=judgeThreshold(n(0),'m_JudgeTimeMin');
   const judgeTimeMax=judgeThreshold(resolved/FP_ONE,'m_JudgeTimeMax');
   if(judgeTimeMin>=judgeTimeMax)throw Error('CoopCountUpTimer judge window is empty');
   // 0x181807f98 / 0x181807fc4 both demand a value above QFP._0 before storing,
   // so an unauthored ready window would mean waiting zero seconds. No shipped
   // CoopCountUpTimer does that, and guessing a default is not allowed here.
   if(!(n(5)>0)||!(n(6)>0))throw Error('CoopCountUpTimer ready window is not authored');
   coops.push({...common,judgeTimeMin,judgeTimeMax,judgeTable:table,
    readySecMin:n(5),readySecMax:n(6),uiScaleParam:n(4),uiPosParam:{x:n(2),y:n(3)},
    phase:0,colorType:0,timer:0,sumTime:0,allStopped:false,anyFailed:false,
    timerIds:new Array(8).fill(null)});
  }
 });
 // CountUpTimerComponent.OnStart 0x18180cc69 registers each timer with the
 // parent it names; CoopCountUpTimerComponent.addTimer 0x181808a30 keeps it at
 // _m_TimerInfos_[m_Index] and silently drops any other index.
 for(const t of timers){
  const parent=coops.find(c=>c.name===t.parentName);
  if(!parent)throw Error('CountUpTimer parent "'+t.parentName+'" is not a CoopCountUpTimer in this stage');
  if(t.index<0||t.index>=8){
   warnings.push('CountUpTimer index '+t.index+' is outside _m_TimerInfos_ and was dropped, as addTimer does');
   continue;
  }
  if(parent.timerIds[t.index])throw Error('Two CountUpTimers claim slot '+t.index);
  parent.timerIds[t.index]=t.id;
 }
 return {schemaVersion:1,count,timers,coops,warnings,
  rng:{state:(BigInt(rngState)&MASK64).toString(),inc:(BigInt(rngIncrement)&MASK64).toString()},
  completePhysicsFidelity:false};
}

const create=c=>JSON.parse(JSON.stringify(c));
function solids(){return [];}

function signal(state,e){
 const name=e.targetName!==undefined?e.targetName:e.target;
 const type=e.eventType!==undefined?e.eventType:(e.event!==undefined?e.event:(e.on?EVENT.SWITCH_ON:60));
 const byType=e.broadcastActorType,broadcast=e.broadcast===true;
 let found=false;
 for(const t of state.timers){
  if(!(broadcast||byType===ACTOR_TYPE.COUNT_UP_TIMER||t.name===name||t.id===e.targetId))continue;
  if(type===EVENT.START){
   if(t.failed)continue;
   t.counting=true;t.stopped=false;found=true;
  }else if(type===EVENT.SWITCH_ON){
   if(t.counting){t.counting=false;if(t.judgeParent)t.hatena=true;}
   else t.failed=true;
   t.stopped=true;found=true;
  }else if(type===EVENT.RESET){
   t.time=0;t.counting=false;t.stopped=false;t.failed=false;t.hatena=false;found=true;
  }else if(type===EVENT.CLEAR_HATENA){t.hatena=false;found=true;}
 }
 for(const c of state.coops){
  if(!(broadcast||byType===ACTOR_TYPE.COOP_COUNT_UP_TIMER||c.name===name||c.id===e.targetId))continue;
  // Only event 2 is handled, and compile() has already done that registration.
  if(type===EVENT.REGISTER)found=true;
 }
 return found;
}

// CoopCountUpTimerComponent.sumTime 0x1818086e0.
function sumTime(state,coop){
 let sum=0,allStopped=true,anyFailed=false;
 for(const id of coop.timerIds){
  if(!id)continue;
  const t=state.timers.find(q=>q.id===id);
  if(!t)continue;
  sum+=Math.floor(t.time*CENTI);
  if(!t.stopped)allStopped=false;
  if(t.failed)anyFailed=true;
 }
 coop.sumTime=sum;coop.allStopped=allStopped;coop.anyFailed=anyFailed;
}
// isCleared 0x181808940.
const isCleared=c=>!c.anyFailed&&c.judgeTimeMin<c.sumTime&&c.sumTime<c.judgeTimeMax;

function beforeStep(state,{dt=1/60,events=[]}={}){
 if(!Number.isFinite(dt)||dt<0)throw Error('Invalid device delta');
 for(const e of events)signal(state,e);
 const outgoing=[],sounds=[],notices=[];
 // CountUpTimerComponent.OnUpdate 0x18180cd70 runs in the Update phase and the
 // coop machine in OnPost 0x181808030, so the timers advance first.
 for(const t of state.timers){
  if(!t.counting)continue;
  t.time+=dt;
  if(t.time<t.limitTime)continue;
  t.time=t.limitTime;t.stopped=true;t.counting=false;
  if(t.judgeParent)t.failed=true;
 }
 const rng={state:BigInt(state.rng.state),inc:BigInt(state.rng.inc)};
 for(const c of state.coops){
  sumTime(state,c);
  switch(c.phase){
   case 0:c.colorType=0;c.timer=PHASE0_WAIT;c.phase++;break;
   case 1:
    if(c.anyFailed){c.phase=5;break;}
    c.timer-=dt;if(c.timer>0)break;
    notices.push({coopId:c.id,...NOTICE.READY,typeName:'Ready'});
    sounds.push({coopId:c.id,seId:READY_SE_ID});
    c.timer=rngNextSeconds(rng,c.readySecMin,c.readySecMax);
    c.phase++;break;
   case 2:
    if(c.anyFailed){notices.push({coopId:c.id,release:true});c.phase=5;break;}
    c.timer-=dt;if(c.timer>0)break;
    notices.push({coopId:c.id,release:true});
    notices.push({coopId:c.id,...NOTICE.GO,typeName:'Go'});
    // NotifyEvent by actor type 166 reaches only CountUpTimers, so it stays
    // inside this module instead of going out to the stage.
    signal(state,{broadcastActorType:ACTOR_TYPE.COUNT_UP_TIMER,eventType:EVENT.START});
    c.timer=GO_NOTICE_HOLD;c.phase++;break;
   case 3:
    if(c.anyFailed){notices.push({coopId:c.id,release:true});c.phase=5;break;}
    if(!c.allStopped){c.timer-=dt;if(c.timer>0)break;}
    notices.push({coopId:c.id,release:true});
    c.phase++;break;
   case 4:
    if(!c.allStopped)break;
    c.phase=isCleared(c)?7:5;break;
   case 5:c.colorType=2;c.timer=FAIL_HOLD;c.phase++;break;
   case 6:{
    c.timer-=dt;if(c.timer>0)break;
    const e={broadcast:true,eventType:EVENT.RESET,senderId:c.id};
    outgoing.push(e);signal(state,e);
    c.phase=0;break;
   }
   case 7:{
    c.colorType=1;
    outgoing.push({broadcastActorType:ACTOR_TYPE.KEY,eventType:EVENT.START,senderId:c.id});
    c.phase++;break;
   }
   default:break; // phase 8: the jump table bails above 7, so nothing happens.
  }
 }
 state.rng={state:rng.state.toString(),inc:rng.inc.toString()};
 return {events:outgoing,sounds,notices,solids:[]};
}

function afterStep(state,{events=[]}={}){
 for(const e of events)signal(state,e);
 return {events:[],solids:[]};
}

// What the renderer needs, in the shape the other modules use.
function displays(state){
 return state.coops.map(c=>({id:c.id,x:c.x,y:c.y,phase:c.phase,colorType:c.colorType,
  timer:c.timer,sumTime:c.sumTime,judgeTimeMin:c.judgeTimeMin,judgeTimeMax:c.judgeTimeMax,
  cleared:c.phase>=7,failedRound:c.phase===5||c.phase===6,
  uiScaleParam:c.uiScaleParam,uiPosParam:c.uiPosParam,
  timers:c.timerIds.map((id,index)=>{
   const t=id&&state.timers.find(q=>q.id===id);
   return t?{index,id:t.id,x:t.x,y:t.y,time:t.time,centiseconds:Math.floor(t.time*CENTI),
    counting:t.counting,stopped:t.stopped,failed:t.failed,hatena:t.hatena}:null;
  }).filter(Boolean)}));
}

const supportedTypes=['CountUpTimer','CoopCountUpTimer'];

return {compile,create,solids,signal,beforeStep,afterStep,displays,supportedTypes,
 sumTime,isCleared,playerCountTable,findByPlayerCount,pcg32,rngNextSeconds,centiseconds,
 nativeConstants:Object.freeze({limitTime:LIMIT_TIME,battleLimitTime:BATTLE_LIMIT_TIME,
  phase0Wait:PHASE0_WAIT,goNoticeHold:GO_NOTICE_HOLD,failHold:FAIL_HOLD,
  readySeId:READY_SE_ID,notice:NOTICE,roundBiasRaw:ROUND_BIAS_RAW,fpEpsilon:FP_EPSILON,
  actorType:ACTOR_TYPE,event:EVENT,
  rng:Object.freeze({multiplier:'0x5851f42d4c957f2d',defaultState:'0x853c49e6748fea9b',
   defaultIncrement:'0xda3e39cb94b95bdb',fpVariant:'0x181662020'})}),
 integration:Object.freeze({
  order:'Call beforeStep once per tick. It ticks the CountUpTimers first and then runs the coop phase machine, which is the native Update-then-Post order.',
  solids:'Always empty. Neither component has an InitCollision.',
  events:'Incoming: 61 from a player Switch to the named CountUpTimer, the only input this device takes. Outgoing: event 1 to actor type 17 (Key) when the round is won, and a whole-scene event 47 reset when it is lost.',
  key:'The win is only visible if the stage runtime honours KeyComponent m_Inactive (Key datas[2] > 0) and activates the key on event 1. Without that the key is free from the start and the minigame is decorative.',
  random:'The Ready delay comes from the Quantum session RNG, whose live seed is not in the binary. Pass rngState/rngIncrement to compile() to make a run reproducible; the host must ship the state so peers agree.'}),
 completePhysicsFidelity:false};
});
