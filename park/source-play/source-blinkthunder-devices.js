/* Native-derived PP2 BlinkThunder (QActorType 220 / BlinkThunderComponent).
   Behaviour is transcribed from GameAssembly.dll:
     BlinkThunderComponent.ParseParameter 0x1817d2660  (datas[0..5] -> fields)
     BlinkThunderComponent.OnStart        0x1817d28a0  (initial visibility + timer)
     BlinkThunderComponent.OnUpdate       0x1817d2950  (pretend-pause gate)
     BlinkThunderComponent.blinkProc      0x1817d2a30  (timer -= dt, toggle)
     BlinkThunderComponent.OnCollided     0x1817d2b80  -> ThunderBaseComponent.OnCollided
     BlinkThunderComponent.OnRecvEvent    0x1817d2c40  -> ThunderBaseComponent.OnRecvEvent
     BlinkThunderComponent.Creator        0x1817d2340  (ParseParameter then ThunderBase.InitCollision)
     ThunderBaseComponent.InitCollision   0x18172aa50  (beam rect + 32x32 probe)
     ThunderBaseComponent.OnUpdate        0x18172ac00  (length only while visible)
     ThunderBaseComponent.getLengthToMap  0x18172acc0  (32x32 probe swept to the map)
     ThunderBaseComponent.modifyCollison  0x18172b380  (beam rect resized to m_Length)
     ThunderBaseComponent.OnCollided      0x18172b000  (player -> event 0x1a)
     ThunderBaseComponent.OnRecvEvent     0x18172af10  (event 0x35 pretend pause)
     ThunderBaseComponent..cctor          0x18172b4b0  (LASER_WIDTH/LASER_LEN/tables)
     ActorComponent.setVisible            0x18169ee20  (flag bit3 + SetCollisionActive)
     ActorComponent.IsVisible             0x18169f010  (bit3 set == hidden)
   Field names come from the il2cpp metadata (quantum-field-offsets.json,
   BlinkThunderComponent: m_Flags/m_IsAppearAtStart/m_EntityRef/m_AppearTime/
   m_DisappearTime/m_Timer). AABB contact is a browser approximation. */
(function(root,factory){const api=factory();if(typeof module==='object'&&module.exports)module.exports=api;root.SourceBlinkThunderDevices=api;})(typeof globalThis!=='undefined'?globalThis:this,function(){
'use strict';
const overlap=(a,b)=>a.x<b.x+b.w&&a.x+a.w>b.x&&a.y<b.y+b.h&&a.y+a.h>b.y;
// ActorFactoryComponent.Update 0x1816a30ee population rule (population-rules.cjs).
const allowed=(v,c)=>!v||v<0&&c<=-v||v>0&&v<10&&c>=v||v>=10&&c>=Math.trunc(v/10)&&c<=v%10;
// ThunderBaseComponent..cctor 0x18172b6ec LASER_WIDTH=0x40000 (4),
// 0x18172b702 LASER_LEN=0x9600000 (2400); TestCollisionRect 0x18172b925
// is {32,32,-16,-16}, a 32x32 probe centred on the emitter.
const LASER_WIDTH=4,LASER_LEN=2400,PROBE=32;
// Quantum FP is 16.16 fixed point. Stage payloads keep the authored float, the
// runtime converts it on load, so the timer is kept in raw FP units: both
// truncation and rounding give 3 -> 196608 and 0.9 -> 58982 for every source
// instance. QFP._0 (quantum-field-offsets.json QFP) is the blinkProc threshold.
const FP_ONE=65536,toRaw=v=>Math.round(v*FP_ONE);
const clone=v=>JSON.parse(JSON.stringify(v));
const PRETEND_PAUSE_EVENT=0x35; // ThunderBaseComponent.OnRecvEvent 0x18172af5a
function compile(actors,count){
 const thunders=[],warnings=[];
 (actors||[]).forEach((source,i)=>{
  const a=source.properties||source;
  if(a.typeName!=='BlinkThunder')return;
  if(!allowed(a.playerCount,count))return;
  if(a.createThreshold)throw Error('Deferred BlinkThunder spawn threshold not verified');
  const pos=source.position||{x:source.x??source.posX,y:source.y??source.posY};
  const data=source.datas||a.datas||source.parameters||[];
  const n=j=>data[j]&&data[j].t===1?data[j].f:0;
  if(!Number.isFinite(pos.x)||!Number.isFinite(pos.y))throw Error('Invalid BlinkThunder position');
  // 0x1817d26e6..0x1817d27f1: slot0 integer part, low byte, >3 collapses to 0.
  const raw0=n(0);
  if(!Number.isFinite(raw0)||raw0<0)throw Error('Negative BlinkThunder direction not verified');
  const byte=Math.trunc(raw0)&0xff,direction=byte>3?0:byte;
  // 0x1817d27f5 slot1>0 -> ThunderBase m_Flags bit0 (SetThrough 0x18172a9d0).
  // 0x1817d281c slot2>0 -> ThunderBase m_Flags bit1 (SetShootBlock 0x181728e90).
  const through=n(1)>0,shootBlock=n(2)>0;
  // 0x1817d2852 slot3 -> m_AppearTime, 0x1817d285b slot4 -> m_DisappearTime,
  // both raw FP, left at the zero-initialised default when the slot is 0.
  const appear=n(3),disappear=n(4);
  if(!(appear>0)||!(disappear>0))throw Error('BlinkThunder needs positive appear and disappear durations; zero keeps the zeroed native default and its per-frame toggling is not verified');
  // 0x1817d287e slot5 -> m_IsAppearAtStart (stored as the !=0 predicate).
  const appearAtStart=n(5)!==0;
  // OnStart 0x1817d28e4: SetVisible(m_IsAppearAtStart>0) and
  // 0x1817d2924..0x1817d2930 m_Timer = appearAtStart ? m_AppearTime : m_DisappearTime.
  thunders.push({id:source.id||'source:a'+i,name:a.name||'',type:'BlinkThunder',
   x:pos.x,y:pos.y,direction,through,shootBlock,
   appearTime:appear,disappearTime:disappear,appearAtStart,
   appearRaw:toRaw(appear),disappearRaw:toRaw(disappear),
   visible:appearAtStart,timerRaw:toRaw(appearAtStart?appear:disappear),
   timer:appearAtStart?appear:disappear,pretendPause:false,
   length:0,lengthCached:false,blinks:0});
  if(shootBlock)warnings.push('BlinkThunder '+(a.name||i)+' ShootBlock emitter body uses the browser AABB solver');
 });
 return {schemaVersion:1,count,thunders,warnings,completePhysicsFidelity:false};
}
const create=compiled=>clone(compiled);
// ThunderBaseComponent.OnRecvEvent 0x18172af9b: event 0x35 sets m_Flags bit3
// when the parameter byte is non-zero and clears it otherwise. No world stage
// sends this to a BlinkThunder, so the path is transcribed but unexercised.
function signal(state,event){
 const type=event.eventType??event.event;let found=false;
 if(type!==PRETEND_PAUSE_EVENT)return false;
 const name=event.targetName??event.target;
 const pause=!!(event.pause??event.on??event.value);
 for(const t of state.thunders)if(t.name===name||t.id===event.targetId){t.pretendPause=pause;found=true;}
 return found;
}
// InitCollision 0x18172aa50 creates collision 1 from TestCollisionRect only
// when the beam needs a blocker probe; the emitter body is solid only with
// ShootBlock, matching source-bridge-devices.js for the plain Thunder.
function solids(state){
 return state.thunders.filter(t=>t.shootBlock).map(t=>({id:t.id+':body',type:'BlinkThunderBody',x:t.x-PROBE/2,y:t.y-PROBE/2,w:PROBE,h:PROBE}));
}
// getLengthToMap 0x18172acc0: the 32x32 probe is swept LASER_LEN along
// VectorTable[direction] (0x18172b99c: up/down/left/right) and the result is
// the swept distance plus half the probe, i.e. the distance from the emitter
// centre to the first map face, with the 32 px wide band of the probe.
// Non-map blockers only shorten the beam when Through is clear (OnCollided
// 0x18172b0df -> calcLengthCollided 0x18172b1c0).
function beamLength(t,{platforms=[],blockers=[],width=LASER_LEN,height=LASER_LEN}={}){
 const horizontal=t.direction>=2,negative=t.direction===0||t.direction===2;
 const origin=horizontal?t.x:t.y,cross=horizontal?t.y:t.x;
 let length=Math.max(0,Math.min(LASER_LEN,negative?origin:(horizontal?width:height)-origin));
 for(const p of t.through?platforms:[...platforms,...blockers]){
  const edge=horizontal?p.x:p.y,size=horizontal?p.w:p.h;
  const perp=horizontal?p.y:p.x,psize=horizontal?p.h:p.w;
  if(cross+PROBE/2<=perp||cross-PROBE/2>=perp+psize)continue;
  const d=negative?origin-edge-size:edge-origin;
  if(d>=0)length=Math.min(length,d);
  else if(origin>edge&&origin<edge+size)length=0;
 }
 return length;
}
// modifyCollison 0x18172b380 writes m_Length into the beam rect: direction 0
// up, 1 down, 2 left, 3 right, thickness LASER_WIDTH centred on the emitter.
function beam(t){
 const horizontal=t.direction>=2,negative=t.direction===0||t.direction===2,len=t.length;
 return {id:t.id+':beam',sourceId:t.id,type:'BlinkThunder',direction:t.direction,visible:t.visible,
  x:horizontal?(negative?t.x-len:t.x):t.x-LASER_WIDTH/2,
  y:horizontal?t.y-LASER_WIDTH/2:(negative?t.y-len:t.y),
  w:horizontal?len:LASER_WIDTH,h:horizontal?LASER_WIDTH:len};
}
// ActorComponent.setVisible 0x18169ef39 also calls SetCollisionActive with the
// same flag, so a disappeared BlinkThunder has no live collider at all.
function hazards(state,options={}){return state.thunders.filter(t=>t.visible).map(beam);}
function beforeStep(state,options={}){
 const {dt=1/60,events=[]}=options;
 if(!Number.isFinite(dt)||dt<0)throw Error('Invalid blink thunder delta');
 const dtRaw=Math.trunc(dt*FP_ONE);
 if(dt>0&&dtRaw<1)throw Error('Blink thunder delta below FP(16.16) resolution');
 for(const e of events)signal(state,e);
 for(const t of state.thunders){
  // OnUpdate 0x1817d29d8: IsPretendPause (m_Flags bit3) skips blinkProc only.
  if(!t.pretendPause){
   // blinkProc 0x1817d2a7f..0x1817d2b26: m_Timer -= DeltaTime; while the
   // remainder is still above QFP._0 nothing happens, otherwise visibility is
   // flipped and the timer reloads from the new state's duration.
   t.timerRaw-=dtRaw;
   if(t.timerRaw<=0){
    t.visible=!t.visible;
    t.timerRaw=t.visible?t.appearRaw:t.disappearRaw;
    t.blinks++;
   }
   t.timer=t.timerRaw/FP_ONE;
  }
  // ThunderBaseComponent.OnUpdate 0x18172ac5f runs the length pass only while
  // the actor is visible, and getLengthToMap 0x18172ad1e caches it in m_Flags
  // bit2 (cleared only by a move or EnableGetLengthToMap 0x18172b490), so a
  // stationary emitter measures its beam once and keeps it.
  if(t.visible&&!t.lengthCached){t.length=beamLength(t,options);t.lengthCached=true;}
 }
 return {events:[],solids:solids(state)};
}
// ThunderBaseComponent.OnCollided 0x18172b0b4: an actor of type 0x1b receives
// event 0x1a (death). 0x18172b064 rejects collision slot 1, so only the beam
// kills, never the 32x32 probe.
function afterStep(state,options={}){
 for(const e of options.events||[])signal(state,e);
 const beams=hazards(state,options);
 const deadPlayerIds=(options.players||[]).filter(p=>!p.exit&&!p.dead&&beams.some(b=>b.w>0&&b.h>0&&overlap(p,b))).map(p=>p.id);
 return {events:[],deadPlayerIds,hazards:beams};
}
return {compile,create,signal,solids,hazards,beamLength,beforeStep,afterStep,
 supportedTypes:['BlinkThunder'],LASER_WIDTH,LASER_LEN,PROBE,FP_ONE,completePhysicsFidelity:false};
});
