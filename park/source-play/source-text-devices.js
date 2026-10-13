/* Native-derived PP2 Text actor. Geometry Y-down, durations native seconds.
 * Every constant and every slot meaning below is quoted from the shipped build:
 *   GameAssembly.dll (imageBase 0x180000000) and global-metadata.dat.
 *
 * CONCLUSION: a stage-authored Text actor has NO SIMULATION BEHAVIOUR.
 * It is a label. This module decodes and preserves the authored values and
 * contributes nothing to solids, hazards, events or deaths. Evidence:
 *
 *  - QActorType.Text is enum ordinal 79. ActorCreator.initCreator registers a
 *    creator for it at 0x181777070 (`xor r8d,r8d; lea ecx,[r8+0x4f];
 *    call ActorCreator.add_Creator 0x1817781f0`). The delegate is built at
 *    0x181777061 from the MethodInfo usage slot 0x1831667f8, whose at-rest
 *    value 0x6000f229 decodes as kIl2CppMetadataUsageMethodDef (value>>29==3)
 *    with encoded method index 61993 = 2*30996+1, and global metadata method
 *    30996 is TextComponent.Creator token 0x600123c = VA 0x18171b200. The same
 *    decode over all 188 add_Creator sites yields a *.Creator method with zero
 *    anomalies, and reproduces this project's already-ported mappings
 *    (BlinkBlock -> BlinkBlockComponent.Creator, SwitchTimer ->
 *    TimerComponent.Creator, Warp/WarpInitPos -> WarpComponent.Creator,
 *    ThornCeiling -> ThornCeilingComponent.Creator). So Text IS created.
 *  - TextComponent.Creator 0x18171b200 does exactly three things:
 *    Frame.CreateActorEntity 0x1817482c0, add the component (0x180207e00) and
 *    TextComponent.ParseParameter 0x18171b4e0. CreateActorEntity is 432 bytes
 *    and calls only entity helpers plus ActorComponent.Initialize - it creates
 *    no collider.
 *  - TextComponent declares (global-metadata.dat) exactly:
 *    GetHashCode, Serialize, SetEntityRef, GetEntityRef, GetCreateParam,
 *    SetLifeTime, Creator, Creator, Initialize, ParseParameter, SetParameter,
 *    InitPost, OnExit, OnStart, OnUpdate, OnPost, SetText, RequestExit, .cctor.
 *    There is NO InitCollision, NO OnCollided, NO OnContacted, NO OnPushedBack
 *    and NO OnRecvEvent. InitCollision is an opt-in hook - 112 of the 196
 *    components that have a Creator declare it and 84 do not; TextComponent is
 *    in the second group together with TimerComponent and BgmChangerComponent.
 *    So a Text has no collider and nothing can ever signal it.
 *  - Initialize, InitPost, OnStart and OnUpdate all resolve to the shared empty
 *    stub 0x180476130 (`ret`). The only non-empty per-frame hook is
 *    OnPost 0x18171bb80, and it returns immediately while m_LifeTime <= 0
 *    (0x18171bbbe `mov rbx,[rbp+0x28]`, 0x18171bbc5 `jle`).
 *  - ParseParameter never writes m_LifeTime (raw 0x28), m_Owner (raw 0x18),
 *    m_Width (raw 0x30) or m_AlignmentH (raw 0). A Quantum component is zeroed
 *    when added, so for every stage-authored Text those four are 0. m_LifeTime
 *    0 disables OnPost; m_Owner 0 disables OnExit (0x18171bb19 `cmp
 *    qword ptr [rbx+0x18],0; jbe`). They are only ever set by SetParameter
 *    0x18171b8f0 / SetLifeTime, which belong to the runtime spawn API
 *    (Creator overload 2 at 0x18171b300), not to the stage loader.
 *  - An image-wide scan for `call`/`jmp rel32` into TextComponent found that
 *    SetText 0x18171bc30, RequestExit 0x18171bc90 and Creator#2 0x18171b300
 *    are called only by BallReceiverComponent.LevelUp, RallyJudgeComponent,
 *    EndlessLandmineObserverComponent.levelUp, FakeTimerComponent,
 *    GiantEnemyComponent and MoleComponent - all runtime floating-text
 *    spawners, none of them reachable from a stage-authored Text. Creator#1
 *    0x18171b200 has no direct caller at all (it runs through the registered
 *    delegate, CreateActor 0x1816a3628 `call qword ptr [rax+0x18]`).
 *
 * Quantum struct offsets are the il2cpp field offsets minus the 16 byte header:
 *   TextComponent m_AlignmentH +0, m_Color +1, m_IsBack +4, m_IsBorder +8,
 *   m_IsFollow +0xc, m_EntityRef +0x10, m_Owner +0x18, m_FontSize +0x20,
 *   m_LifeTime +0x28, m_Width +0x30, m_Text +0x38 (QStringUtf8_64),
 *   m_TextId +0x78 (QStringUtf8_64).
 *   ActorComponent m_Velo +0xf0 (FPVector2), m_Flags +0xc.
 */
(function(root,factory){const api=factory();if(typeof module==='object'&&module.exports)module.exports=api;root.SourceTextDevices=api;})(typeof globalThis!=='undefined'?globalThis:this,function(){
'use strict';
const clone=v=>JSON.parse(JSON.stringify(v));
// ActorFactoryComponent.Update 0x1816a30ee: playerCount gate, same encoding the
// sibling modules already use.
const allowed=(v,c)=>!v||v<0&&c<=-v||v>0&&v<10&&c>=v||v>=10&&c>=Math.trunc(v/10)&&c<=v%10;
const supportedTypes=['Text'];
// ParseParameter reads datas[0..8] and nothing else. Bound checks, in order:
// 0x18171b571, 0x18171b5de, 0x18171b64b, 0x18171b676, 0x18171b6a3,
// 0x18171b6d0, 0x18171b6fd, 0x18171b726, 0x18171b74c.
const READ_SLOTS=9;
// TextView.OnInitialize 0x1805ca579: every FP the view consumes is scaled by
// the float at 0x182e86e14 = 1.52587890625e-05 = 1/65536, confirming that the
// authored decimal in the stage file is the value in native units.
const FP=65536;
// TextView.OnInitialize 0x1805ca292: m_IsBack picks the sorting order the view
// is pushed to - 0x4e20 = 20000 in front, 0xffffd8f0 = -10000 behind.
const SORTING_ORDER_FRONT=20000, SORTING_ORDER_BACK=-10000;
// TextView.OnInitialize 0x1805ca6be: m_IsBorder selects the outline width, the
// float at 0x182e86fa8 = 0.30000001192092896, otherwise 0.
const BORDER_OUTLINE_WIDTH=0.30000001192092896;
// QEventType ordinal 62 = TextExit, the only event TextComponent ever raises
// (OnExit 0x18171bb3f ActorComponent.GetEventParam(0x3e) ->
// Frame.NotifyEvent 0x18171bb56). Unreachable from stage data: m_Owner is 0.
const EVENT_TEXT_EXIT=62;
// OnPost 0x18171bc06 / RequestExit 0x18171bd1b both do `bts eax,0xd` on
// ActorComponent.m_Flags (raw 0xc), i.e. bit 13 - the actor's exit request.
const ACTOR_FLAG_EXIT_REQUEST=1<<13;

// ParseParameter slot 0/1: `cmp dword ptr [slot+0x10], 2` (0x18171b5ac /
// 0x18171b620) selects the string payload at slot+0x20; anything else falls
// back to a static empty QString. The decoded stage file marks a string slot
// t === 2.
function stringSlot(datas,index){
 const slot=datas[index];
 if(!slot||slot.t!==2||typeof slot.s!=='string')return '';
 return slot.s;
}
// ParseParameter slots 2..8: `cmp dword ptr [slot+0x10], 1` then
// `mov reg,[slot+0x18]`, else the slot contributes 0 (`mov reg, ebp` with
// ebp = 0). The raw is a 16.16 FP; the stage file carries the same number as a
// decimal.
function fpSlot(datas,index){
 const slot=datas[index];
 if(!slot||slot.t===0)return 0;
 if(slot.t!==1||!Number.isFinite(slot.f))throw new Error('Text slot '+index+' must be a numeric parameter');
 return slot.f;
}
// Slots 3, 4, 5 and 8 are read with a trailing `sar reg,0x10` (0x18171b69a,
// 0x18171b6c7, 0x18171b6f4, 0x18171b76e), the arithmetic floor of the FP.
function intSlot(datas,index){return Math.floor(fpSlot(datas,index));}

function compile(actors,count){
 if(!Number.isInteger(count)||count<2||count>8)throw new Error('Text player count must be 2..8');
 if(!Array.isArray(actors))throw new Error('Text compile needs the source actor list');
 const texts=[],warnings=[];
 actors.forEach((raw,index)=>{
  const props=raw.properties||raw;
  if(props.typeName!=='Text')return;
  if(!allowed(props.playerCount||0,count))return;
  const pos=raw.position||{x:raw.x??raw.posX,y:raw.y??raw.posY};
  if(!Number.isFinite(pos.x)||!Number.isFinite(pos.y))throw new Error('Invalid Text position');
  const datas=raw.datas||raw.parameters||[];
  for(let i=READ_SLOTS;i<datas.length;i++)if(datas[i]&&datas[i].t!==0)
   warnings.push((props.name||'Text')+': slot '+i+' is unread by the original ParseParameter');
  // 0x18171b799 -> QStringUtf8_64..ctor -> m_TextId (raw 0x78). The view
  // resolves it through GameTextManager.GetText 0x1804b6d00
  // (TextView.OnInitialize 0x1805ca3b2) and only falls back to m_Text
  // (raw 0x38, built at 0x18171b803) when the id is empty (0x1805ca3d7).
  const textId=stringSlot(datas,0);
  const text=stringSlot(datas,1);
  // 0x18171b81d `mov qword ptr [rcx+0x20], rsi` -> m_FontSize. The view applies
  // it only when it is > 0 (0x1805ca585 `jle`).
  const fontSize=fpSlot(datas,2);
  // 0x18171b861..0x18171b866: `test r13d,r13d; je; mov byte ptr [rcx+1], 1`.
  // A non-zero slot writes the literal 1 and nothing else - the authored
  // magnitude is discarded, and a zero slot leaves the zeroed component value.
  // The view branches on 0 / 1 / 2 (0x1805ca5a3, 0x1805ca619) so the field is a
  // wider enum, but ParseParameter can only ever produce 0 or 1.
  const colorSlot=intSlot(datas,3);
  const color=colorSlot!==0?1:0;
  // 0x18171b843 -> m_IsBorder (raw 8); 0x18171b84e -> m_IsBack (raw 4);
  // 0x18171b857 -> m_IsFollow (raw 0xc). All three are `setne`, so only the
  // zero / non-zero distinction survives.
  const isBorder=intSlot(datas,4)!==0;
  const isBack=intSlot(datas,5)!==0;
  const isFollow=intSlot(datas,8)!==0;
  // 0x18171b871/0x18171b876 stash slots 6 and 7 and 0x18171b8ce writes the
  // pair as one xmmword to ActorComponent.m_Velo (raw 0xf0) of the entity that
  // Creator just made. Cross-checked by SetParameter 0x18171bacc, which writes
  // the same 16 bytes to the same offset from its own param block.
  const velocity={x:fpSlot(datas,6),y:fpSlot(datas,7)};
  if(velocity.x||velocity.y)warnings.push((props.name||'Text')+': non-zero Text m_Velo ('+velocity.x+', '+velocity.y+
   ') - the generic move path for a collider-less actor was not verified, so the drift is not ported');
  // ActorFactoryComponent.Update 0x1816a30e4 defers an actor whose
  // createThreshold has not been reached. A Text contributes nothing to the
  // simulation, so a deferred one cannot change it either; the value is
  // preserved and reported rather than guessed at or rejected.
  const createThreshold=Number(props.createThreshold)||0;
  if(createThreshold)warnings.push((props.name||'Text')+': deferred Text creation (createThreshold '+createThreshold+') is recorded but has no simulation effect');
  texts.push({id:raw.id||'text:'+index,name:props.name||'',type:'Text',
   anchor:{x:pos.x,y:pos.y},x:pos.x,y:pos.y,
   textId,text,fontSize,color,isBorder,isBack,isFollow,velocity,createThreshold,
   // Never written by ParseParameter; a freshly added Quantum component is
   // zeroed, so these are the values every stage-authored Text carries.
   lifeTime:0,owner:null,width:0,alignmentH:0,
   sortingOrder:isBack?SORTING_ORDER_BACK:SORTING_ORDER_FRONT,
   outlineWidth:isBorder?BORDER_OUTLINE_WIDTH:0});
 });
 return {schemaVersion:1,count,texts,warnings,
  nativeBehaviour:'none',completePhysicsFidelity:false};
}

function create(compiled){
 if(!compiled||compiled.schemaVersion!==1||!Array.isArray(compiled.texts))throw new Error('Compiled Text set required');
 return {count:compiled.count,ticks:0,texts:compiled.texts.map(t=>({...clone(t),
  // OnPost 0x18171bbbe reads the live m_LifeTime, so the countdown needs its
  // own copy. exitRequested mirrors ActorComponent.m_Flags bit 13.
  timer:t.lifeTime,exitRequested:false,flags:0}))};
}

// TextComponent has no InitCollision, so a Text never contributes a collider.
function solids(){return [];}
// ... and no hazard either: it has no OnCollided / OnContacted.
function hazards(){return [];}

// Initialize, InitPost, OnStart and OnUpdate are all the empty stub
// 0x180476130. beforeStep exists only to keep the shared device interface.
function beforeStep(state){
 if(!state||!Array.isArray(state.texts))throw new Error('Text state required');
 return {solids:[]};
}

// OnPost 0x18171bb80, transcribed exactly:
//   rbx = m_LifeTime;  if (rbx <= 0) return;
//   rbx -= Frame.DeltaTime;  m_LifeTime = rbx;
//   if (rbx <= 0) ActorComponent.m_Flags |= 1 << 13;
// and OnExit 0x18171bae0: when the entity leaves and m_Owner > 0, notify
// QEventType.TextExit (62) to m_Owner.
// Both are unreachable from stage data - ParseParameter leaves m_LifeTime and
// m_Owner at 0 - so this loop never changes anything for a ported stage. It is
// kept because the native code is verified and the module should not silently
// diverge if a caller ever supplies a lifetime.
function afterStep(state,{dt=1/60}={}){
 if(!state||!Array.isArray(state.texts))throw new Error('Text state required');
 if(!Number.isFinite(dt)||dt<0)throw new Error('Invalid Text delta');
 const events=[];
 for(const t of state.texts){
  if(t.exitRequested)continue;
  if(!(t.timer>0))continue;
  t.timer-=dt;
  if(t.timer>0)continue;
  t.exitRequested=true;
  t.flags|=ACTOR_FLAG_EXIT_REQUEST;
  if(t.owner!==null&&t.owner!==0)events.push({event:EVENT_TEXT_EXIT,target:t.owner,source:t.id});
 }
 state.ticks++;
 return {events,deadPlayerIds:[],solids:[],hazards:[]};
}

// Everything a renderer needs, straight from the authored slots. No offsets,
// no boxes and no font metrics are invented: the anchor is the actor position
// the stage file carries, and ParseParameter adds nothing to it.
function labels(state){
 if(!state||!Array.isArray(state.texts))throw new Error('Text state required');
 return state.texts.filter(t=>!t.exitRequested).map(t=>({id:t.id,name:t.name,
  x:t.x,y:t.y,textId:t.textId,text:t.text,fontSize:t.fontSize,color:t.color,
  isBorder:t.isBorder,outlineWidth:t.outlineWidth,isBack:t.isBack,
  sortingOrder:t.sortingOrder,isFollow:t.isFollow,width:t.width,
  alignmentH:t.alignmentH}));
}

function status(state){
 if(!state||!Array.isArray(state.texts))throw new Error('Text state required');
 return {ticks:state.ticks,count:state.count,
  texts:state.texts.map(t=>({id:t.id,name:t.name,textId:t.textId,
   timer:t.timer,exitRequested:t.exitRequested,flags:t.flags}))};
}

return {compile,create,solids,hazards,beforeStep,afterStep,labels,status,supportedTypes,
 nativeConstants:Object.freeze({fpScale:FP,readSlots:READ_SLOTS,
  sortingOrderFront:SORTING_ORDER_FRONT,sortingOrderBack:SORTING_ORDER_BACK,
  borderOutlineWidth:BORDER_OUTLINE_WIDTH,eventTextExit:EVENT_TEXT_EXIT,
  actorFlagExitRequest:ACTOR_FLAG_EXIT_REQUEST,
  actorTypeOrdinal:79,creatorRegistrationSite:'0x181777070',
  parseParameter:'0x18171b4e0'}),
 integration:Object.freeze({
  order:'Nothing depends on it. compile() beside the other device compiles, afterStep() beside the other afterSteps; solids(state) and hazards(state) are always empty and must not be added to the solid or hazard lists (they return [] so adding them is harmless).',
  obstacles:'None. TextComponent declares no InitCollision, so a Text is not a collider and cannot block, carry or kill anybody.',
  events:'None in practice. TextComponent declares no OnRecvEvent, so no switch, key, gate or timer can target a Text. The only event it can raise is QEventType.TextExit (62) from OnExit, and that needs m_Owner, which ParseParameter never writes.',
  rendering:'labels(state) carries the authored textId, the literal text fallback, the font size, the colour index, the outline width, the sorting order and the follow flag. The display strings behind the textIds live in a GameTextManager asset, not in the binaries scanned here, so the key is preserved verbatim.',
  timing:'afterStep only runs the OnPost lifetime countdown, which is inert for every stage-authored Text (m_LifeTime 0).'}),
 completePhysicsFidelity:false};
});
