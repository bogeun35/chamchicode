/* PP2 SwitchTargetGroup, read-only static recovery; original game never run.
   Actor ordinal 205 -> Creator 0x181719a30 (delegate site 0x181776283).
   Fields: raw +0 m_Flags, +8 m_EntityRef, +0x10 target array.
   ParseParameter 0x181719cf0 reads AsString(index) at 0x181719db8;
   0x181719df8 advances by 0x20, 0x181719dfb stops at 0x280:
   exactly 20 QStringUtf8_32 names, with empty slots skipped, not a terminator.
   AsString 0x1817800e1 accepts only t=2; other tags yield empty string.
   QStringUtf8_32 ctor 0x18168e7c2 / 0x18168e82a caps UTF-8 at 30 bytes.
   OnRecvEvent 0x181719eda..0x181719ee1 accepts precisely 60 and 61.
   Other events delegate to ActorComponent.OnRecvEvent at 0x181719f04.
   notifyToTargets 0x18171a07b skips empty names, 0x18171a121 advances
   all 20 slots, without deduplication. GetEventParam 0x18171a0ec makes
   a new event using this group's ActorComponent; 0x18169dc43 stores type,
   0x18169dc4a stores that actor's entity as sender, rather than the input
   sender. Name-targeted Frame.NotifyEvent is called at 0x18171a11c.
   Initialize/InitPost = 0x180476130 (ret). Creator never initializes
   collision; this component has no OnUpdate/OnPost or view behaviour.
   Population predicate: ActorFactory.Update 0x1816a30ee..0x1816a3147.
   API schemaVersion/id prefix are port metadata, not native constants. */
(function(root,factory){const api=factory();if(typeof module==='object'&&module.exports)module.exports=api;root.SourceSwitchTargetGroupDevices=api;})(typeof globalThis!=='undefined'?globalThis:this,function(){
'use strict';
const TARGET_MAX=20,NAME_MAX_BYTES=30,ACTOR_TYPE=205,EVENT_OFF=60,EVENT_ON=61;
const supportedTypes=['SwitchTargetGroup'];
const allowed=(v,c)=>!v||v<0&&c<=-v||v>0&&v<10&&c>=v||v>=10&&c>=Math.trunc(v/10)&&c<=v%10;
function compile(actors,count,options){
 const groups=[];
 actors.forEach((raw,index)=>{
  const a=raw.properties||raw;
  if(a.typeName!=='SwitchTargetGroup'||!allowed(a.playerCount,count))return;
  if((a.createThreshold??raw.createThreshold??0)>0)
   throw Error('SwitchTargetGroup delayed creation requires ActorFactory lifecycle integration');
  if(a.name&&actors.filter(r=>(r.properties||r).name===a.name&&allowed((r.properties||r).playerCount,count)).length>1)
   throw Error('SwitchTargetGroup duplicate actor name requires verified ActorScene.FindActor selection order: '+a.name);
  const data=raw.datas||raw.parameters||a.datas||[],targets=[];
  for(let slot=0;slot<TARGET_MAX;slot++){
   const d=data[slot],name=d?.t===2?(d.s??''):'';
   if(typeof name!=='string')throw Error('SwitchTargetGroup slot '+slot+' is not a string');
   if(new TextEncoder().encode(name).length>NAME_MAX_BYTES)
    throw Error('SwitchTargetGroup slot '+slot+' exceeds QStringUtf8_32 capacity (30 UTF-8 bytes)');
   targets.push(name);
  }
  groups.push({id:raw.id||'source:a'+index,name:a.name||'',type:'SwitchTargetGroup',targets});
 });
 return {schemaVersion:1,count,groups,warnings:[],completePhysicsFidelity:false};
}
const create=c=>JSON.parse(JSON.stringify(c));
function solids(){return [];}
function displays(){return [];}
function addressed(group,event){
 if(event.broadcastActorType!==undefined)return event.broadcastActorType===ACTOR_TYPE;
 if(event.broadcast===true)return true;
 if(event.targetId!==undefined)return event.targetId===group.id;
 const name=event.targetName??event.target;
 return name!==undefined&&name===group.name;
}
// Immediate single delivery. The stage dispatcher must route the returned
// events before advancing simulation, including any nested groups.
function signal(state,event){
 const events=[],actorEvents=[];
 const type=event.eventType??event.event??(event.on===true?EVENT_ON:event.on===false?EVENT_OFF:null);
 for(const group of state.groups){
  if(!addressed(group,event))continue;
  if(type!==EVENT_ON&&type!==EVENT_OFF){
   actorEvents.push({...event,targetId:group.id});continue;
  }
  for(const targetName of group.targets)if(targetName)
   events.push({targetName,eventType:type,on:type===EVENT_ON,senderId:group.id});
 }
 return {events,actorEvents};
}
function beforeStep(state,{events:incoming=[]}={}){
 const events=[],actorEvents=[];
 for(const e of incoming){const result=signal(state,e);events.push(...result.events);actorEvents.push(...result.actorEvents);}
 return {events,actorEvents,solids:[],deadPlayerIds:[]};
}
function afterStep(state,ctx){return beforeStep(state,ctx);}
const integration={
 events:'Route input once via signal or one step hook. Deliver returned events immediately through the stage name dispatcher; do not feed the same input into both hooks. senderId is the group entity. Nested groups require the dispatcher to recurse in native order.',
 baseActor:'Non-60/61 inputs appear in actorEvents for the shared ActorComponent handler (0x181719f04); this module does not implement shared actor lifecycle.',
 targets:'Implement target devices separately. Missing targets must follow Frame.NotifyEvent name lookup rather than block compilation. Gear, BgmChanger and other target mechanics are outside this module.',
 lifecycle:'No timer, state latch, collision, display or startup output. Delayed ActorFactory creation is explicitly refused.'
};
return {compile,create,solids,beforeStep,afterStep,displays,signal,supportedTypes,integration,
 nativeConstants:{targetMax:TARGET_MAX,nameMaxBytes:NAME_MAX_BYTES,actorType:ACTOR_TYPE,eventOff:EVENT_OFF,eventOn:EVENT_ON},completePhysicsFidelity:false};
});

