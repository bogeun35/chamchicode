/* Native-derived PP2 SwitchTimer. Durations are native seconds, Y-down.
 *
 * The SwitchTimer actor (QActorCreateParam.type 37 = 0x25) has NO component of
 * its own: the shared Quantum TimerComponent handles it, and ParseParameter
 * branches on the authored actor type to decide what the time-up does.
 *   TimerComponent.ParseParameter 0x18172d730 at 0x18172dd1b..0x18172dd47:
 *     type 0x0a (DeadTimer)   -> word[c+0] = 0x102
 *     type 0x1f (unused)      -> word[c+0] = 0x101
 *     type 0x25 (SwitchTimer) -> word[c+0] = 0x103
 *   The low byte is m_TimeUpType, the high byte m_Type, so a SwitchTimer is
 *   always TimerTimeUpType.Switch (3) + TimerType.TimeDown (1).
 *   (quantum-field-offsets.json: TimerTimeUpType None/Retry/Dead/Switch = 0..3,
 *   TimerType TimeUp/TimeDown = 0..1.)
 *
 * Quantum struct offsets are the il2cpp field offsets minus the 16 byte header:
 *   TimerComponent m_TimeUpType +0, m_Type +1, m_Flags +2 (ushort),
 *   m_EntityRef +8, m_Scale +0x10, m_Sec +0x18, m_Pos +0x20 (FPVector2),
 *   m_TargetName +0x30 (QStringUtf8_32).
 * m_Flags bits, all read as plain constants in code (the bitfield type is the
 * shared 16 bit QFlags instantiation, so the native bit NAMES are not in the
 * metadata - these are named from behaviour):
 *   bit0 hidden    - TimerComponent.IsVisible 0x1816b9070 returns !bit0 and
 *                    TimerView.OnInitialize 0x1805d189c skips building the whole
 *                    timer UI when it is set. Authored by datas[13].
 *   bit1 muteTick  - OnUpdate 0x18172dfde skips the per-second Se. datas[14].
 *   bit2 stopped   - OnUpdate 0x18172df48 skips the countdown. Set/cleared by
 *                    OnRecvEvent 0x18172e35e / 0x18172e327.
 *   bit3 firedTimeUp - set after onTimeUp at 0x18172e03a, cleared by
 *                    ParseParameter 0x18172dd08 and SetSec 0x18172e3c9.
 *
 * TimerComponent has no InitCollision and no OnCollided, so a SwitchTimer is a
 * pure logic/UI actor: it never collides, carries, kills or blocks anybody.
 * solids() is therefore always empty.
 */
(function(root,factory){const api=factory();if(typeof module==='object'&&module.exports)module.exports=api;root.SourceSwitchTimerDevices=api;})(typeof globalThis!=='undefined'?globalThis:this,function(){
'use strict';
const F=65536;
const clone=v=>JSON.parse(JSON.stringify(v));
const allowed=(v,c)=>!v||v<0&&c<=-v||v>0&&v<10&&c>=v||v>=10&&c>=Math.trunc(v/10)&&c<=v%10;

// TimerComponent..cctor 0x18172e3e0 writes the four statics directly:
//   0x18172e4cf statics+0x08 = 0x000a0000 -> UI_BASE_SCALE   = 10
//   0x18172e4e5 statics+0x10 = 0x00000000 -> UI_POSX         = 0
//   0x18172e4fb statics+0x18 = 0x01a00000 -> UI_POSY         = 416
//   0x18172e511 statics+0x20 = 0x000a0000 -> WARNING_SECOND  = 10
// (static field offsets from quantum-field-offsets.json: RESOURCE_PATH 0,
//  UI_BASE_SCALE 8, UI_POSX 16, UI_POSY 24, WARNING_SECOND 32.)
// UI_POSY 416 is the same anchor source-gate-devices.js already uses for the
// SwitchObserver readout, which is an independent cross-check of the units.
const UI_BASE_SCALE=10;
const UI_POSX=0;
const UI_POSY=416;
const WARNING_SECOND=10;

// OnUpdate 0x18172e008 `cmp rcx, 4` on abs(m_Sec raw): the time-up test is
// |m_Sec| < 4/65536, the same FP non-zero epsilon the Thunder and BlinkBlock
// ports already quote. TimeDown clamps m_Sec to exactly 0 at 0x18172df79, so in
// practice this fires on the first update that reaches zero.
const FP_EPSILON=4/F;
// OnUpdate 0x18172dfc5/0x18172dfcc `add rbx,-0x28f` then `sar ..,0x10`: the
// whole-second boundary that drives the tick Se is biased by 0x28f = 655 raw
// units (~0.009994 s) before the floor, on both the old and the new value.
const SE_SECOND_BIAS=655/F;
// OnUpdate 0x18172dfec `mov dl, 0x13` -> Frame.PlaySe 0x18174a3b0.
const TICK_SE_ID=0x13;

// Event ids, matching source-gate-devices.js / source-bridge-devices.js:
// 61 = switch on, 60 = switch off. OnRecvEvent 0x18172e2d0..0x18172e2dd
// dispatches 0x3d, 0x3c and 0x2f and forwards everything else to
// ActorComponent.OnRecvEvent 0x18169e840.
const EVENT_ON=61;
const EVENT_OFF=60;
const EVENT_UNHANDLED_LOG=0x2f;

const TIME_UP_TYPE=Object.freeze({NONE:0,RETRY:1,DEAD:2,SWITCH:3});
const TIMER_TYPE=Object.freeze({TIME_UP:0,TIME_DOWN:1});
// QActorCreateParam.type, read at ParseParameter 0x18172da97 and 0x18172dd1b.
const ACTOR_TYPE_SWITCH_TIMER=37;
const supportedTypes=['SwitchTimer'];

function slot(datas,index){return datas&&datas[index]?datas[index]:null;}
// ParseParameter reads a numeric slot as `cmp [slot+0x10],1` then
// `mov ..,[slot+0x18]`: a slot that is not a float contributes raw 0, never an
// error (0x18172d868, 0x18172d895, ...). Strings in a numeric slot are reported
// as warnings instead of being reinterpreted.
function numeric(datas,index){
 const s=slot(datas,index);
 if(!s||s.t===0)return 0;
 if(s.t!==1)return 0;
 if(!Number.isFinite(s.f))throw new Error('SwitchTimer slot '+index+' is not a finite float');
 return s.f;
}
// The flag slots are read as `sar raw,0x10`, the arithmetic floor of the fixed
// point value, and only then tested against zero (0x18172d9b5, 0x18172d9e9,
// 0x18172de41, 0x18172de58). A slot of 0.5 therefore does NOT set its flag.
function integer(datas,index){return Math.floor(numeric(datas,index));}
function text(datas,index){
 const s=slot(datas,index);
 if(!s||s.t===0)return '';
 if(s.t!==2||typeof s.s!=='string')return '';
 return s.s;
}
// OnRecvEvent 0x18172e374..0x18172e385: `test ax,ax` on the low 16 raw bits,
// then `and rax,~0xffff; add rax,0x10000` - a two's complement ceil to the next
// whole second, which is also correct for negative values.
function ceilSecond(seconds){
 const raw=Math.round(seconds*F);
 return (raw%F===0?raw:(Math.floor(raw/F)+1)*F)/F;
}

function compile(actors,count){
 if(!Number.isInteger(count)||count<2||count>8)throw new Error('SwitchTimer player count must be 2..8');
 if(!Array.isArray(actors))throw new Error('SwitchTimer compile needs the source actor list');
 const timers=[],warnings=[];
 actors.forEach((raw,index)=>{
  const props=raw.properties||raw;
  if(props.typeName!=='SwitchTimer')return;
  if(!allowed(props.playerCount||0,count))return;
  if(props.createThreshold)throw new Error('Deferred SwitchTimer creation requires native timing');
  if(props.type!==undefined&&props.type!==ACTOR_TYPE_SWITCH_TIMER)throw new Error('SwitchTimer must be QActorCreateParam.type 37, got '+props.type);
  const datas=raw.datas||raw.parameters||[];
  const pos=raw.position||{x:raw.x??raw.posX,y:raw.y??raw.posY};
  if(!Number.isFinite(pos.x)||!Number.isFinite(pos.y))throw new Error('Invalid SwitchTimer position');
  const name=props.name||'';

  // ParseParameter 0x18172da42..0x18172da4e: when datas[1] != FP._0 the base
  // becomes `playerCount * datas[1] + datas[0]` (an FP * int product, so raw
  // arithmetic). Otherwise datas[0] stands alone.
  const base=numeric(datas,0),perPlayer=numeric(datas,1);
  let sec=perPlayer!==0?base+count*perPlayer:base;

  // ParseParameter 0x18172da58..0x18172dc5b: index = 6 + clamp(count-2, 0, 7)
  // (`lea esi,[rax-2]`, `cmovs` to 0, `cmp esi,7`), and a non-zero float there
  // REPLACES the value computed above (`test rax,rax; cmovne rbx,rax`).
  // With a native maximum of 8 players the reachable window is datas[6..12];
  // datas[13] would only be selected at 9 players, where it would collide with
  // its own use as the hide flag below. No shipped stage populates any of
  // datas[6..12], so this path is carried but unexercised by the source data.
  const tableIndex=6+Math.min(Math.max(count-2,0),7);
  const override=numeric(datas,tableIndex);
  if(override!==0)sec=override;
  if(!Number.isFinite(sec))throw new Error('SwitchTimer duration is not finite');

  const targetName=text(datas,5);
  if(!targetName)warnings.push((name||'SwitchTimer')+': datas[5] holds no target name, so the native Frame.NotifyEvent 0x181749fa0 would find no actor');

  // ParseParameter 0x18172ddb5..0x18172dde9: m_Scale is only written when
  // datas[4] > FP._0, and then it is datas[4] * UI_BASE_SCALE.
  const scaleSlot=numeric(datas,4);
  const uiScale=scaleSlot>0?scaleSlot*UI_BASE_SCALE:0;
  // ParseParameter 0x18172dd6d..0x18172dd8a: m_Pos = (UI_POSX + datas[2],
  // UI_POSY + datas[3]).
  const uiPos={x:UI_POSX+numeric(datas,2),y:UI_POSY+numeric(datas,3)};

  // ParseParameter only reaches datas[15..18] inside the
  // `cmp dword[createParam+0x30], 0xa` guard at 0x18172da97, i.e. for DeadTimer
  // only. For a SwitchTimer every slot above 14 is unread by the original.
  for(let i=15;i<datas.length;i++)if(datas[i]&&datas[i].t!==0)warnings.push((name||'SwitchTimer')+': slot '+i+' is unread by the original ParseParameter for actor type 37');

  timers.push({id:raw.id||'switchtimer:'+index,name,type:'SwitchTimer',
   anchor:{x:pos.x,y:pos.y},
   timeUpType:TIME_UP_TYPE.SWITCH,timeUpTypeName:'Switch',
   timerType:TIMER_TYPE.TIME_DOWN,timerTypeName:'TimeDown',
   sec,targetName,
   hidden:integer(datas,13)!==0,muteTick:integer(datas,14)!==0,
   uiScale,uiPos});
 });
 return {schemaVersion:1,count,timers,warnings,completePhysicsFidelity:false};
}

// Initialize 0x180476130, InitPost 0x180476130 and OnStart 0x180476130 are all
// `ret 0`, so the parsed m_Sec is the live value from the first update on and
// m_Flags bit2/bit3 start clear (ParseParameter 0x18172dd08 clears bit3).
function create(compiled){
 if(!compiled||compiled.schemaVersion!==1||!Array.isArray(compiled.timers))throw new Error('Compiled SwitchTimer set required');
 return {count:compiled.count,ticks:0,timers:compiled.timers.map(t=>({...clone(t),
  initialSec:t.sec,stopped:false,firedTimeUp:false,
  tickSound:false,timeUp:false,beat:false}))};
}

// No collider: TimerComponent has no InitCollision/OnCollided at all.
function solids(){return [];}

// Incoming events, TimerComponent.OnRecvEvent 0x18172e250.
// The 61 payload is the event param field at +0x60, which only
// SwitchComponent.NotifyTarget 0x181714e06 fills, from the value
// SwitchComponent.SetTimerAddSecond 0x18169cdf0 stores. Our event objects carry
// it as `timerAddSecond`; absent means 0, which is what
// QEventParamManager.Get 0x181780c29 zeroes it to.
function signal(state,event){
 if(!event)return false;
 const name=event.targetName??event.target;
 const type=event.eventType??event.event??(event.on===true?EVENT_ON:event.on===false?EVENT_OFF:null);
 let found=false;
 for(const t of state.timers){
  // FindActor 0x1816a7c47 rejects an empty name outright, so '' never matches.
  const byName=typeof name==='string'&&name!==''&&t.name===name;
  const byId=event.targetId!==undefined&&t.id===event.targetId;
  if(!byName&&!byId)continue;
  found=true;
  // 0x18172e327: event 60 clears bit2 unconditionally - even after time-up.
  if(type===EVENT_OFF){t.stopped=false;continue;}
  // 0x18172e307: event 47 is consumed by a log call and changes nothing.
  if(type===EVENT_UNHANDLED_LOG)continue;
  if(type!==EVENT_ON)continue;
  // 0x18172e34f: bit3 makes a fired timer ignore event 61 for good.
  if(t.firedTimeUp)continue;
  const add=event.timerAddSecond??event.addSecond??0;
  if(add===0){t.stopped=true;continue;}
  t.sec=ceilSecond(t.sec+add);
  // 0x18172e3b1 FrameEvents.Timer_BeatAnimation: presentation only.
  t.beat=true;
 }
 return found;
}

// OnUpdate 0x18172dec0. The outgoing time-up event is produced here so the port
// delivers it in the same tick the timer expires; see `integration.order`.
function beforeStep(state,{dt=1/60}={}){
 if(!Number.isFinite(dt)||dt<0)throw new Error('Invalid SwitchTimer delta');
 const events=[],sounds=[];
 for(const t of state.timers){
  t.tickSound=false;t.timeUp=false;t.beat=false;
  const previous=t.sec;
  // 0x18172deff/0x18172df40: m_Type selects the direction. A TimeUp timer only
  // accumulates and returns, never reaching the time-up test (0x18172df3b).
  if(t.timerType===TIMER_TYPE.TIME_UP){
   if(!t.stopped)t.sec=previous+dt;
   continue;
  }
  // 0x18172df48: bit2 skips the decrement but NOT the two blocks below.
  if(!t.stopped){
   t.sec=previous-dt;
   if(t.sec<0)t.sec=0; // 0x18172df79 `mov qword[rsi+0x18], 0`
  }
  // 0x18172df81 `movzx eax,byte[rsi]; sub al,2; cmp al,1; ja` - the per-second
  // Se only exists for m_TimeUpType Dead(2) and Switch(3).
  if((t.timeUpType===TIME_UP_TYPE.DEAD||t.timeUpType===TIME_UP_TYPE.SWITCH)
   &&t.sec<WARNING_SECOND
   &&Math.floor(previous-SE_SECOND_BIAS)!==Math.floor(t.sec-SE_SECOND_BIAS)
   &&!t.muteTick){
   t.tickSound=true;
   // `boundary` is the biased whole second the native `sar` lands on, so the
   // beeps of a ten second warning carry 8,7,..,-1 rather than 9,8,..,0: the
   // 0x28f bias moves every boundary ~0.01 s past the round number and the
   // `< WARNING_SECOND` gate swallows the first crossing.
   sounds.push({timerId:t.id,seId:TICK_SE_ID,remaining:t.sec,boundary:Math.floor(t.sec-SE_SECOND_BIAS)});
  }
  // 0x18172dff6..0x18172e047: abs(m_Sec) < FP_EPSILON and bit3 still clear.
  if(Math.abs(t.sec)<FP_EPSILON&&!t.firedTimeUp){
   t.firedTimeUp=true;t.timeUp=true;
   // onTimeUp 0x18172e0cb: TimerTimeUpType.Switch sends event 61 to the single
   // actor whose name equals m_TargetName. Frame.NotifyEvent 0x181749fa0 ->
   // ActorSceneComponent.FindActor 0x1816a7b80 is an exact-name dictionary
   // lookup that returns null for an empty name, so no event is produced then.
   if(t.timeUpType!==TIME_UP_TYPE.SWITCH)throw new Error('Only TimerTimeUpType.Switch time-up is ported');
   // Both key spellings are filled in: source-gate-devices.js and
   // source-bridge-devices.js read targetName/eventType while
   // source-devices-runtime.js reads target/event, and the native lookup is one
   // and the same exact-name dictionary hit for all of them.
   if(t.targetName)events.push({targetName:t.targetName,target:t.targetName,
    eventType:EVENT_ON,event:EVENT_ON,on:true,senderId:t.id,timerAddSecond:0});
  }
 }
 state.ticks++;
 return {events,sounds,solids:[]};
}

// A SwitchTimer never kills, moves or blocks anybody; afterStep exists to drain
// incoming events on the same beat the port dispatches relay and device events.
function afterStep(state,{events=[]}={}){
 for(const e of events)signal(state,e);
 return {events:[],deadPlayerIds:[],hazards:[],solids:[]};
}

// TimerView.OnInitialize 0x1805d189c builds the readout only while bit0 is
// clear; TimerView.updateTimer 0x1805d1c04..0x1805d1c39 renders floor(m_Sec) as
// minutes and seconds.
function displays(state){
 return state.timers.filter(t=>!t.hidden).map(t=>{
  const whole=Math.max(0,Math.floor(t.sec));
  return {id:t.id,name:t.name,x:t.uiPos.x,y:t.uiPos.y,scale:t.uiScale,
   minutes:Math.floor(whole/60),seconds:whole%60,sec:t.sec,
   warning:t.sec<WARNING_SECOND};
 });
}

return {compile,create,solids,signal,beforeStep,afterStep,displays,supportedTypes,
 nativeConstants:Object.freeze({uiBaseScale:UI_BASE_SCALE,uiPosX:UI_POSX,uiPosY:UI_POSY,
  warningSecond:WARNING_SECOND,tickSeId:TICK_SE_ID,fpEpsilon:FP_EPSILON,seSecondBias:SE_SECOND_BIAS,
  eventOn:EVENT_ON,eventOff:EVENT_OFF,actorType:ACTOR_TYPE_SWITCH_TIMER,
  timeUpType:TIME_UP_TYPE,timerType:TIMER_TYPE}),
 integration:Object.freeze({
  order:'Call beforeStep before Bridges.beforeStep and merge its `events` into the event list Bridges/Gates receive, so a bridge starts extending on the tick the timer reaches zero. The native Quantum system order between TimerComponent.OnUpdate and BridgeComponent.OnUpdate was not recovered, so the extension may begin one native tick early or late.',
  solids:'Always empty. TimerComponent has no collision at all.',
  events:'Outgoing: event 61 (switch on) to the single actor named by datas[5], payload timerAddSecond 0. Incoming: 61 with payload 0 stops the timer, 61 with a payload adds that many seconds rounded up to a whole second, 60 resumes it, 47 is swallowed by a log.',
  timing:'Durations are the authored stage decimals in seconds. Frame.get_DeltaTime 0x18173a090 only forwards a runtime session field, so the FP raw of a native delta is not in the binary and a countdown may expire one native tick early or late.'}),
 completePhysicsFidelity:false};
});
