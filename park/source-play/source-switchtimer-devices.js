/* Native-derived PP2 TimerComponent: the SwitchTimer and DeadTimer actors.
 * Durations are native seconds, Y-down.
 *
 * Neither actor has a component of its own: the shared Quantum TimerComponent
 * handles both, and ParseParameter branches on the authored actor type to decide
 * what the time-up does.
 *   TimerComponent.ParseParameter 0x18172d730 at 0x18172dd1b..0x18172dd47:
 *     type 0x0a (DeadTimer)   -> word[c+0] = 0x102
 *     type 0x1f (no shipped stage) -> word[c+0] = 0x101
 *     type 0x25 (SwitchTimer) -> word[c+0] = 0x103
 *   The low byte is m_TimeUpType, the high byte m_Type, so a SwitchTimer is
 *   always TimerTimeUpType.Switch (3) + TimerType.TimeDown (1) and a DeadTimer
 *   is always TimerTimeUpType.Dead (2) + TimerType.TimeDown (1).
 *   (quantum-field-offsets.json: TimerTimeUpType None/Retry/Dead/Switch = 0..3,
 *   TimerType TimeUp/TimeDown = 0..1; the enum VALUES are the metadata default
 *   bytes 00/01/02/03 and 00/01.)
 *
 * onTimeUp 0x18172e070 dispatches on m_TimeUpType at 0x18172e0ba..0x18172e0ce:
 *   Retry(1)  0x18172e203: StageComponent.m_Flags bit10 (RequestRetry
 *             0x181709cf0 is the same `bts [stage+4],0xa`). Unreachable from any
 *             shipped actor type, so this module throws instead of guessing.
 *   Dead(2)   0x18172e132: see the DeadTimer block below.
 *   Switch(3) 0x18172e0d0: Frame.NotifyEvent(m_TargetName, event 61).
 *
 * DeadTimer time-up, onTimeUp 0x18172e132..0x18172e1f2, in native order:
 *   1. GetEventParam(QEventType.Dead = 19 = 0x13) then Frame.NotifyEvent
 *      0x181749790 - the overload that takes ONLY the param
 *      (metadata token 0x6001495, `int NotifyEvent(QEventParam param)`), which
 *      walks the whole ActorScene actor list at 0x181749a10..0x181749af2 and
 *      calls NotifyEvents.Invoke_OnRecvEvent on EVERY actor. m_TargetName is not
 *      consulted at all: a DeadTimer time-up is a stage-wide broadcast.
 *   2. FrameEvents.PlaySe 0x18174bd50 at 0x18172e1a4 with EntityRef 0,
 *      SeId 2 = QSeId.Blip, Position (0,0), Volume 1 (raw 0x10000),
 *      Pitch 1 (raw 0x10000), IsDisableCheckBlankTime false.
 *   3. Frame.GetStage then `btr [stage+4],9` at 0x18172e1cf - StageComponent
 *      m_Flags bit9, which SetEnableOpenWindow 0x181709ca0 owns, i.e.
 *      StageComponent.SetEnableOpenWindow(false).
 *   4. Frame.GetStageNotice then StageNoticeComponent.Start 0x18170e850 at
 *      0x18172e1ee with (QUIStageNotice_Type.TimeUp = 1,
 *      QUIStageNotice_Anim.Move = 2, isWait = false).
 * Who actually dies is decided by the receivers, not by the timer. Nine other
 * component types answer event 19; the one that matters is
 * PlayerComponent.OnRecvEvent 0x1816c1187 -> 0x1816c174e:
 *   if (m_Life <= 0) return;                      // 0x1816c174e `jle`
 *   if (param.CauseDead != Fall && IsImmortal())  // 0x1816c1758 cmp [param+0x6c],1
 *       return;                                   // 0x1816c1773 test [p+0x20],0x100
 *   m_Life = 0;                                   // 0x1816c1789
 *   m_RequestedPlayerState = QPlayerState.Dead(3);// 0x1816c17a2 mov byte[p+4],3
 * QEventParamManager.Get zeroes the param, so CauseDead is Contact(0) and the
 * immortal test DOES apply: an immortal player survives a DeadTimer.
 * (QEventParam is a class, so its il2cpp offsets are literal: EventType +0x10,
 * InUse +0x14, Id +0x28, Time +0x60, CauseDead +0x6c. PlayerComponent struct
 * offsets are il2cpp-16: m_PlayerState +3, m_RequestedPlayerState +4,
 * m_Life +0xd, m_Flags +0x20; IsImmortal 0x1816bcd20 is `test [+0x20],0x100`.)
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
 * TimerComponent has no InitCollision and no OnCollided, so a timer is a pure
 * logic/UI actor: it never collides, carries, blocks or touches anybody. A
 * DeadTimer kills by broadcasting an event, never by contact. solids() is
 * therefore always empty for both types.
 *
 * DeadTimer-only parse block, ParseParameter 0x18172da97..0x18172dcea. The
 * guard is `cmp dword[createParam+0x30], 0xa; jne 0x18172dcef`, so a SwitchTimer
 * never enters it. Inside, `cmp dword[datas+0x18], 0xf; jbe <throw>` means a
 * DeadTimer whose datas array holds fewer than 16 entries raises
 * IndexOutOfRange in the original; every shipped actor carries 32.
 *   datas[15] is a mode selector read as floor(raw) and compared `cmp eax,1`
 *   (0x18172dadb): only the exact value 1 enables the block, and a non-float
 *   slot or any other value skips it. The selector also supplies the first table
 *   index: `lea r8d,[rax+0xf]` = 15 + 1 = 16 (0x18172daeb).
 *   datas[16], datas[18], datas[17] are then read, in that order, as
 *   QPlayerCountParam<int> by the generic DeserializeInt 0x180970770 and each
 *   resolved for the live population by QPlayerCountParamUtility.Find
 *   0x181786950 (metadata token 0x6001816, `int Find(int, QPlayerCountParam<T>)`).
 *   The arithmetic at 0x18172dbee..0x18172dc13 is:
 *     A = Find(datas[16]); if (A <= 0) no bonus
 *     n = Frame.GetGameOverCount() - the dword at `[frame+0xc8]+0xf0`, which
 *         Frame.GetGameOverCount 0x1817475d0 reads with the identical two
 *         loads: _globals.CheckPointInfo.GameOverCount (Frame._globals is at
 *         il2cpp 200 = +0xc8, CheckPointInfo at _globals il2cpp 0x100 = +0xf0,
 *         and GameOverCount is its first member).
 *     if (A > n) no bonus
 *     B = Find(datas[18]); C = Find(datas[17])
 *     if (C <= 0 || B <= 0) -> a three-value log call at 0x18172dc60, no bonus
 *     m_Sec += min((n - A + 1) * C, B)     // FP raws, `imul` then `cmp/cmovl`
 *   The bonus is added AFTER the datas[6..12] override, so an override does not
 *   erase it. Every shipped DeadTimer authors A=5, C=2, B=10: nothing until the
 *   party has failed the stage five times, then +2 s per further failure, capped
 *   at +10 s. StageComponent.CountGameOver 0x18170dd60 is what increments the
 *   counter, and its `test [stage+4],0x8000` guard (m_Flags bit15,
 *   IsCountedGameOver 0x181709cc0) makes it at most one per attempt.
 *
 * QPlayerCountParam<T> string encoding, recovered from DeserializeInt
 * 0x180970770: the slot is read with QActorCreateParam.AsString 0x181780090,
 * every UTF-16 unit contributes one byte as `(low byte) - 0x21`
 * (0x18097085b `sub cl,0x21`), and the resulting array must be exactly
 * 7 * GetByteDataLength bytes (0x180970977 `imul ecx,eax,7`) or the whole param
 * comes back zeroed. The seven values are m_p2..m_p8, one per population 2..8,
 * read little-endian - 4 bytes for an int, 8 for an FP raw. Cross-checked
 * against unrelated shipped data: AppleController datas[8] in st_w_08_03
 * decodes to 12,14,20,22,25,27,30 and the FP tables decode to round values such
 * as 2.0 and 1.2, which only works little-endian.
 * Find 0x181786980..0x1817869d3 returns 0 below two players, otherwise walks
 * DOWN from the requested count to 2 and returns the first non-zero entry, or 0.
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
// QSeId is a byte enum whose metadata defaults are 0..28 in declaration order,
// so 0x13 = 19 = QSeId.Select and 2 = QSeId.Blip.
const TICK_SE_ID=0x13;
const DEAD_SE_ID=2;
// onTimeUp 0x18172e187/0x18172e195 push raw 0x10000 for both.
const DEAD_SE_VOLUME=1;
const DEAD_SE_PITCH=1;

// QEventType member values are the metadata default blob read as zig-zag
// compressed ints: Dead 19, Return 47, SwitchOff 60, SwitchOn 61. The three ids
// OnRecvEvent 0x18172e2d0..0x18172e2dd dispatches are exactly 0x3d/0x3c/0x2f,
// which is an independent confirmation of that decode.
const EVENT_ON=61;             // QEventType.SwitchOn
const EVENT_OFF=60;            // QEventType.SwitchOff
const EVENT_UNHANDLED_LOG=0x2f;// QEventType.Return - consumed by a log call
const EVENT_DEAD=19;           // QEventType.Dead - the DeadTimer broadcast

// QCauseDead: Contact 0, Fall 1. GetEventParam hands onTimeUp a zeroed param,
// so a DeadTimer broadcast always carries Contact.
const CAUSE_DEAD=Object.freeze({CONTACT:0,FALL:1});
// QUIStageNotice_Type / _Anim byte enums, metadata defaults in order.
const NOTICE_TYPE=Object.freeze({CLEAR:0,TIME_UP:1,FINISH:2,READY:3,GO:4,WHO_ARE_YOU:5});
const NOTICE_ANIM=Object.freeze({IDLE:0,STOP:1,MOVE:2,PASS:3});

const TIME_UP_TYPE=Object.freeze({NONE:0,RETRY:1,DEAD:2,SWITCH:3});
const TIMER_TYPE=Object.freeze({TIME_UP:0,TIME_DOWN:1});
// QActorCreateParam.type, read at ParseParameter 0x18172da97 and 0x18172dd1b.
const ACTOR_TYPE_SWITCH_TIMER=37;
const ACTOR_TYPE_DEAD_TIMER=10;
const ACTOR_TYPES=Object.freeze({SwitchTimer:ACTOR_TYPE_SWITCH_TIMER,DeadTimer:ACTOR_TYPE_DEAD_TIMER});
const supportedTypes=['SwitchTimer','DeadTimer'];
// ParseParameter 0x18172daaf: a DeadTimer needs at least 16 datas entries or the
// original throws before it can read datas[15].
const DEAD_TIMER_MIN_SLOTS=16;
// 0x18172dadb `cmp eax,1` - the only mode selector the shipped build implements.
const DEAD_TIMER_BONUS_MODE=1;
// QPlayerCountParam: seven entries for populations 2..8, one byte per character.
const PLAYER_COUNT_PARAM_ENTRIES=7;
const PLAYER_COUNT_PARAM_INT_BYTES=4;
const PARAM_CHAR_BIAS=0x21;

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

// QPlayerCountParam<int>.DeserializeInt 0x180970770. The slot is fetched with
// QActorCreateParam.AsString 0x181780090, which yields String.Empty for a
// non-string slot and null above index 31; both make the length test fail, and
// 0x180970d16 / 0x180970ce9 then hand back an all-zero param. The byte loop at
// 0x180970857..0x180970868 keeps only the low byte of each UTF-16 unit and
// subtracts 0x21, so the arithmetic wraps mod 256 exactly as `sub cl,0x21` does.
function playerCountIntTable(datas,index){
 const zeros=new Array(PLAYER_COUNT_PARAM_ENTRIES).fill(0);
 const s=slot(datas,index);
 if(!s||s.t!==2||typeof s.s!=='string')return zeros;
 const width=PLAYER_COUNT_PARAM_INT_BYTES;
 if(s.s.length!==PLAYER_COUNT_PARAM_ENTRIES*width)return zeros;
 const table=[];
 for(let entry=0;entry<PLAYER_COUNT_PARAM_ENTRIES;entry++){
  let value=0;
  for(let byte=width-1;byte>=0;byte--){
   const code=s.s.charCodeAt(entry*width+byte);
   value=value*256+(((code&0xff)-PARAM_CHAR_BIAS)&0xff);
  }
  table.push(value|0); // the native read is a signed dword
 }
 return table;
}
// QPlayerCountParamUtility.Find 0x181786950: below two players the answer is 0,
// otherwise walk down from the requested population to 2 and take the first
// non-zero entry. A count above 8 starts at m_p8 because `cmp edx,6; ja` sends
// it straight to the decrement.
function findByPlayerCount(table,count){
 if(count<2)return 0;
 for(let index=Math.min(count-2,PLAYER_COUNT_PARAM_ENTRIES-1);index>=0;index--)if(table[index]!==0)return table[index];
 return 0;
}

// `gameOverCount` is Frame.GetGameOverCount 0x1817475d0 at the moment the actor
// is created: it only feeds the DeadTimer mercy bonus and defaults to a fresh
// run (0), which is what every shipped DeadTimer sees on a first attempt.
function compile(actors,count,{gameOverCount=0}={}){
 if(!Number.isInteger(count)||count<2||count>8)throw new Error('SwitchTimer player count must be 2..8');
 if(!Array.isArray(actors))throw new Error('SwitchTimer compile needs the source actor list');
 if(!Number.isInteger(gameOverCount)||gameOverCount<0)throw new Error('gameOverCount must be a non-negative integer');
 const timers=[],warnings=[];
 actors.forEach((raw,index)=>{
  const props=raw.properties||raw;
  const typeName=props.typeName;
  if(typeName!=='SwitchTimer'&&typeName!=='DeadTimer')return;
  const isDead=typeName==='DeadTimer';
  if(!allowed(props.playerCount||0,count))return;
  if(props.createThreshold)throw new Error('Deferred '+typeName+' creation requires native timing');
  if(props.type!==undefined&&props.type!==ACTOR_TYPES[typeName])throw new Error(typeName+' must be QActorCreateParam.type '+ACTOR_TYPES[typeName]+', got '+props.type);
  const datas=raw.datas||raw.parameters||[];
  const pos=raw.position||{x:raw.x??raw.posX,y:raw.y??raw.posY};
  if(!Number.isFinite(pos.x)||!Number.isFinite(pos.y))throw new Error('Invalid '+typeName+' position');
  const name=props.name||'';
  // 0x18172daaf `cmp dword[datas+0x18],0xf; jbe <IndexOutOfRange>`.
  if(isDead&&datas.length<DEAD_TIMER_MIN_SLOTS)throw new Error('DeadTimer needs at least '+DEAD_TIMER_MIN_SLOTS+' datas entries; the original throws IndexOutOfRange at ParseParameter 0x18172daaf');

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

  // ParseParameter 0x18172da97..0x18172dc13, DeadTimer only. See the header.
  let bonus=null;
  if(isDead&&integer(datas,15)===DEAD_TIMER_BONUS_MODE){
   const fromCount=findByPlayerCount(playerCountIntTable(datas,16),count);
   if(fromCount>0&&fromCount<=gameOverCount){
    const maxBonus=findByPlayerCount(playerCountIntTable(datas,18),count);
    const perGameOver=findByPlayerCount(playerCountIntTable(datas,17),count);
    if(perGameOver>0&&maxBonus>0){
     const steps=gameOverCount-fromCount+1;
     const added=Math.min(steps*perGameOver,maxBonus);
     sec+=added;
     bonus={mode:DEAD_TIMER_BONUS_MODE,fromGameOverCount:fromCount,perGameOver,maxBonus,gameOverCount,added};
    }else{
     // 0x18172dc60 logs the three values and adds nothing.
     warnings.push((name||'DeadTimer')+': datas[17]/datas[18] resolve to '+perGameOver+'/'+maxBonus+' at '+count+' players, which the original only logs (onTimeUp bonus skipped)');
    }
   }
  }
  if(!Number.isFinite(sec))throw new Error(typeName+' duration is not finite');

  // m_TargetName is written for every actor type (0x18172de29), but only the
  // Switch time-up reads it. A DeadTimer broadcasts, so an empty name is normal
  // and every shipped DeadTimer leaves datas[5] empty.
  const targetName=text(datas,5);
  if(!isDead&&!targetName)warnings.push((name||'SwitchTimer')+': datas[5] holds no target name, so the native Frame.NotifyEvent 0x181749fa0 would find no actor');

  // ParseParameter 0x18172ddb5..0x18172dde9: m_Scale is only written when
  // datas[4] > FP._0, and then it is datas[4] * UI_BASE_SCALE.
  const scaleSlot=numeric(datas,4);
  const uiScale=scaleSlot>0?scaleSlot*UI_BASE_SCALE:0;
  // ParseParameter 0x18172dd6d..0x18172dd8a: m_Pos = (UI_POSX + datas[2],
  // UI_POSY + datas[3]).
  const uiPos={x:UI_POSX+numeric(datas,2),y:UI_POSY+numeric(datas,3)};

  // ParseParameter only reaches datas[15..18] inside the
  // `cmp dword[createParam+0x30], 0xa` guard at 0x18172da97, i.e. for DeadTimer
  // only. For a SwitchTimer every slot above 14 is unread by the original, and
  // for a DeadTimer everything above 18 is.
  const firstUnread=isDead?19:15;
  for(let i=firstUnread;i<datas.length;i++)if(datas[i]&&datas[i].t!==0)warnings.push((name||typeName)+': slot '+i+' is unread by the original ParseParameter for actor type '+ACTOR_TYPES[typeName]);

  timers.push({id:raw.id||(isDead?'deadtimer:':'switchtimer:')+index,name,type:typeName,
   actorType:ACTOR_TYPES[typeName],
   anchor:{x:pos.x,y:pos.y},
   timeUpType:isDead?TIME_UP_TYPE.DEAD:TIME_UP_TYPE.SWITCH,timeUpTypeName:isDead?'Dead':'Switch',
   timerType:TIMER_TYPE.TIME_DOWN,timerTypeName:'TimeDown',
   sec,targetName,bonus,
   hidden:integer(datas,13)!==0,muteTick:integer(datas,14)!==0,
   uiScale,uiPos});
 });
 return {schemaVersion:1,count,gameOverCount,timers,warnings,completePhysicsFidelity:false};
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

// PlayerComponent.OnRecvEvent 0x1816c174e: the only two gates on the broadcast
// are a living m_Life and, because the broadcast param carries CauseDead
// Contact, IsImmortal. A port player object that states neither is treated as a
// living, mortal player, which is what the runtime's own player records are.
function killedByDeadTimer(player){
 if(!player||player.id===undefined)return false;
 const life=player.life===undefined?1:player.life;
 if(!(life>0))return false;
 return !player.immortal;
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
function beforeStep(state,{dt=1/60,players=[]}={}){
 if(!Number.isFinite(dt)||dt<0)throw new Error('Invalid SwitchTimer delta');
 if(!Array.isArray(players))throw new Error('SwitchTimer beforeStep players must be an array');
 const events=[],sounds=[],deadPlayerIds=[],notices=[],stageFlags=[];
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
   // onTimeUp 0x18172e070 dispatches on m_TimeUpType at 0x18172e0ba.
   if(t.timeUpType===TIME_UP_TYPE.SWITCH){
    // 0x18172e0d0: event 61 to the single actor whose name equals m_TargetName.
    // Frame.NotifyEvent 0x181749fa0 -> ActorSceneComponent.FindActor 0x1816a7b80
    // is an exact-name dictionary lookup that returns null for an empty name, so
    // no event is produced then.
    // Both key spellings are filled in: source-gate-devices.js and
    // source-bridge-devices.js read targetName/eventType while
    // source-devices-runtime.js reads target/event, and the native lookup is one
    // and the same exact-name dictionary hit for all of them.
    if(t.targetName)events.push({targetName:t.targetName,target:t.targetName,
     eventType:EVENT_ON,event:EVENT_ON,on:true,senderId:t.id,timerAddSecond:0});
   }else if(t.timeUpType===TIME_UP_TYPE.DEAD){
    // 0x18172e132..0x18172e168: event 19 through the no-target NotifyEvent
    // overload 0x181749790, which hands it to EVERY actor in the scene. No
    // targetName/target key is set, because the original has no target here; a
    // relay that dispatches by name must ignore this event, and a relay that
    // broadcasts must honour `broadcast`.
    events.push({broadcast:true,eventType:EVENT_DEAD,event:EVENT_DEAD,
     senderId:t.id,causeDead:CAUSE_DEAD.CONTACT,timerAddSecond:0});
    // 0x18172e1a4 FrameEvents.PlaySe(EntityRef 0, QSeId.Blip, (0,0), 1, 1,false)
    sounds.push({timerId:t.id,seId:DEAD_SE_ID,position:{x:0,y:0},
     volume:DEAD_SE_VOLUME,pitch:DEAD_SE_PITCH,isDisableCheckBlankTime:false});
    // 0x18172e1cf StageComponent.SetEnableOpenWindow(false) - m_Flags bit9.
    stageFlags.push({timerId:t.id,enableOpenWindow:false});
    // 0x18172e1ee StageNoticeComponent.Start(TimeUp, Move, isWait false)
    notices.push({timerId:t.id,type:NOTICE_TYPE.TIME_UP,typeName:'TimeUp',
     anim:NOTICE_ANIM.MOVE,animName:'Move',isWait:false});
    // PlayerComponent.OnRecvEvent 0x1816c174e applies the broadcast. The timer
    // itself decides nothing about who dies; this is the receivers' result.
    for(const p of players)if(killedByDeadTimer(p))deadPlayerIds.push(p.id);
   }else{
    throw new Error('TimerTimeUpType '+t.timeUpType+' time-up is not ported (only Dead and Switch are reachable from a shipped actor type)');
   }
  }
 }
 state.ticks++;
 return {events,sounds,solids:[],deadPlayerIds,notices,stageFlags};
}

// A timer never moves or blocks anybody and a DeadTimer kills only through the
// broadcast beforeStep already produced, so afterStep exists to drain incoming
// events on the same beat the port dispatches relay and device events. Nothing
// here can reach zero: event 61 only ever ADDS seconds and event 60 only clears
// the stop bit, so a time-up is always a beforeStep result.
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
 playerCountIntTable,findByPlayerCount,
 nativeConstants:Object.freeze({uiBaseScale:UI_BASE_SCALE,uiPosX:UI_POSX,uiPosY:UI_POSY,
  warningSecond:WARNING_SECOND,tickSeId:TICK_SE_ID,fpEpsilon:FP_EPSILON,seSecondBias:SE_SECOND_BIAS,
  eventOn:EVENT_ON,eventOff:EVENT_OFF,eventDead:EVENT_DEAD,eventReturn:EVENT_UNHANDLED_LOG,
  deadSeId:DEAD_SE_ID,causeDead:CAUSE_DEAD,noticeType:NOTICE_TYPE,noticeAnim:NOTICE_ANIM,
  actorType:ACTOR_TYPE_SWITCH_TIMER,actorTypes:ACTOR_TYPES,
  deadTimerBonusMode:DEAD_TIMER_BONUS_MODE,deadTimerMinSlots:DEAD_TIMER_MIN_SLOTS,
  timeUpType:TIME_UP_TYPE,timerType:TIMER_TYPE}),
 integration:Object.freeze({
  order:'Call beforeStep before Bridges.beforeStep and merge its `events` into the event list Bridges/Gates receive, so a bridge starts extending on the tick the timer reaches zero. The native Quantum system order between TimerComponent.OnUpdate and BridgeComponent.OnUpdate was not recovered, so the extension may begin one native tick early or late.',
  solids:'Always empty. TimerComponent has no collision at all.',
  events:'Outgoing: event 61 (switch on) to the single actor named by datas[5], payload timerAddSecond 0. Incoming: 61 with payload 0 stops the timer, 61 with a payload adds that many seconds rounded up to a whole second, 60 resumes it, 47 is swallowed by a log.',
  timing:'Durations are the authored stage decimals in seconds. Frame.get_DeltaTime 0x18173a090 only forwards a runtime session field, so the FP raw of a native delta is not in the binary and a countdown may expire one native tick early or late.'}),
 completePhysicsFidelity:false};
});
