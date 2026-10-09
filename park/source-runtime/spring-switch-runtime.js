(function(root){
'use strict';
// Static first-stage relay reconstruction. Native code is never loaded.
// Input actors may be raw actorCreateParamList or imported source-world actors.
// Contact generation and source-to-web velocity conversion belong to the caller.
const TYPES=new Set(['JumpStand','JumpStandMediator','Switch','DelaySwitch']);
const WINDUP=Math.trunc(0.2*65536)/65536;
const RECOVERY=Math.trunc((1/12)*65536)/65536;
const number=(a,i)=>a.datas[i]?.t===1?a.datas[i].f:0;
const string=(a,i)=>a.datas[i]?.t===2?(a.datas[i].s||''):'';
const nativeInteger=n=>Math.floor(n);
function normalize(a,index){
 if(a.properties)return {id:a.id,sourceIndex:a.sourceIndex,...a.properties,posX:a.position.x,posY:a.position.y,datas:a.parameters};
 return {id:a.id||'source:a'+index,sourceIndex:index,...a};
}
function populationAllowed(v,n){return v===0||v<0&&n<=-v||v>0&&v<10&&n>=v||v>=10&&n>=Math.trunc(v/10)&&n<=v%10;}
function zeroOffsets(a,x,y){
 // Exact first-stage encoded tables are 56 exclamation marks. Other grammar
 // remains undecoded; refusing it avoids fabricating population placement.
 for(const i of [x,y])if(string(a,i)!=='!'.repeat(56))throw new Error('Undecoded population offset table at '+a.id+':'+i);
}
function create(actors,count){
 if(!Number.isInteger(count)||count<2||count>8)throw new Error('Player count must be 2 through 8');
 const selected=actors.map(normalize).filter(a=>populationAllowed(a.playerCount||0,count));
 const relays=selected.filter(a=>TYPES.has(a.typeName)).map(a=>{
  const d=i=>number(a,i),s=i=>string(a,i);
  const r={id:a.id,name:a.name||'',type:a.typeName,sourceIndex:a.sourceIndex,x:a.posX,y:a.posY};
  if(a.typeName==='JumpStand'){
   if(d(4)!==0)throw new Error('Runtime scope supports original world01-01 switchType 0 only');
   Object.assign(r,{velocity:{x:d(0),y:d(1)},affectAll:(nativeInteger(d(2))>>>0)>0,parent:s(3),keepVelocityX:nativeInteger(d(8))!==0,phase:0,timer:0,visible:true});
  }else if(a.typeName==='Switch'){
   zeroOffsets(a,6,7);
   if(d(5)!==0)throw new Error('Runtime scope supports first-stage upward switches only');
   Object.assign(r,{target:s(0),subtarget:s(3),repeat:(nativeInteger(d(1))>>>0)>0,switchId:nativeInteger(d(2)),timerAddSeconds:d(4),pressed:false,latched:false});
  }else if(a.typeName==='DelaySwitch'){
   zeroOffsets(a,3,4);
   if(d(2)!==0)throw new Error('Runtime scope supports first-stage upward delay switches only');
   Object.assign(r,{target:s(1),subtarget:'',repeat:false,switchId:0,timerAddSeconds:0,delay:d(0)+d(5)*(count-2),remaining:0,pressed:false,latched:false,forceOff:false});
  }
  return r;
 });
 const named=new Set(relays.filter(r=>r.name).map(r=>r.name));
 for(const r of relays)if(r.parent&&!named.has(r.parent)||r.target&&!named.has(r.target))throw new Error('Missing source relay target '+(r.parent||r.target));
 return {count,sourceActorCount:selected.length,relays};
}
/** step(state, dt, facts) mutates the private relay state and returns events.
 * facts.switchContacts: [{relayId, actorId, layer, attributeFlags}]. These are
 * collisions with the directional switch trigger, not rectangle overlaps.
 * A normal switch accepts attributeFlags bit1 and layers 1,2,3,8.
 * facts.springContacts: [{relayId, actorId, layer, upContactCount, velocityX}].
 * Supply the spring's UP-face contacts (normal 0,-1), including collision IDs
 * only once. The contacted collision must itself have no UP-face contacts.
 * This deliberately preserves the native top-contact exclusion for stacks.
 * facts.externalEvents: [{targetId, senderType, senderName, on}] is optional.
 * Output impulses carry original source velocity, not web units; apply them
 * using the native Jump event semantics recovered by the integration caller.
 */
function step(state,dt,facts={}){
 if(!Number.isFinite(dt)||dt<0)throw new Error('Finite nonnegative simulation dt required');
 const events=[],impulses=[];
 const byId=new Map(state.relays.map(r=>[r.id,r]));
 const deliver=(r,on,sender)=>{
  events.push({targetId:r.id,senderId:sender.id,on,eventType:on?61:60});
  if(r.type==='JumpStandMediator'&&on){
   for(const spring of state.relays.filter(x=>x.type==='JumpStand'))deliver(spring,true,r);
  }else if(r.type==='JumpStand'&&on&&sender.type==='JumpStandMediator'&&sender.name===r.parent&&r.visible&&r.phase===0)r.phase=1;
 };
 const notify=(r,on)=>{for(const name of [r.target,r.subtarget])if(name)for(const t of state.relays.filter(x=>x.name===name))deliver(t,on,r);};
 for(const e of facts.externalEvents||[]){const t=byId.get(e.targetId);if(!t)throw new Error('Unknown relay '+e.targetId);deliver(t,e.on,{id:e.senderId,type:e.senderType,name:e.senderName});}
 // Delay countdown precedes the common switch update in the native handler.
 for(const r of state.relays.filter(x=>x.type==='Switch'||x.type==='DelaySwitch')){
  if(r.type==='DelaySwitch'&&r.remaining>0){r.remaining-=dt;if(r.remaining<=0){r.remaining=0;notify(r,true);r.forceOff=true;}}
  const contact=(facts.switchContacts||[]).some(c=>c.relayId===r.id&&(c.attributeFlags&2)!==0&&[1,2,3,8].includes(c.layer));
  if(contact&&!r.latched){r.latched=true;r.pressed=true;if(r.type==='DelaySwitch')r.remaining=r.delay;else notify(r,true);}
  if(!contact&&r.pressed){r.pressed=false;if(r.type==='Switch')notify(r,false);}
  if(r.repeat)r.latched=false;
  if(r.forceOff){r.latched=false;r.forceOff=false;}
 }
 // Native updatePhase does one state transition per update, with no dt carry.
 for(const r of state.relays.filter(x=>x.type==='JumpStand')){
  let fire=false;
  if(!r.parent)fire=r.visible;
  else if(r.phase===1){r.phase=2;r.timer=WINDUP;}
  else if(r.phase===2){r.timer-=dt;if(r.timer<=0){fire=true;r.phase=3;r.timer=RECOVERY;}}
  else if(r.phase===3){r.timer-=dt;if(r.timer<=0)r.phase=0;}
  if(fire)for(const c of facts.springContacts||[]){
   if(c.relayId!==r.id||c.upContactCount>0)continue;
   if(!Number.isInteger(c.upContactCount)||c.upContactCount<0)throw new Error('Verified contacted-collision UP count required');
   impulses.push({relayId:r.id,actorId:c.actorId,eventType:36,velocity:{x:r.keepVelocityX?c.velocityX:(!r.affectAll&&c.layer===1?0:r.velocity.x),y:r.velocity.y},keepVelocityX:r.keepVelocityX});
  }
 }
 return {events,impulses};
}
const api={create,step,WINDUP,RECOVERY};
if(typeof module!=='undefined'&&module.exports)module.exports=api;
root.SourceSpringSwitch=api;
})(typeof globalThis!=='undefined'?globalThis:this);
