/* PP2 WindComponent, static analysis only; no original code/assets executed.
 * Creator ordinal 77 -> 0x181738820. Struct offsets: direction +0, flags +2,
 * range +0x10, strongScale +0x18, power +0x20 (quantum-field-offsets.json).
 * Initialize 0x181738a2a: range raw 0x5000000 = 1280; 0x181738a58:
 * QFP._2 (static +0x118) = strongScale 2.
 * ParseParameter 0x181738ac5: n=count-2. Slots 0/1 offset position by n;
 * slot count is power (0x181738b8e), slot 9 integer !=0 makes direction 2
 * and negates power (0x181738c24..3a); otherwise direction 3. Slots 10/11
 * override strongScale/range only when >0 (0x181738c61..92).
 * RectFP order Height,Width,X,Y: .cctor 0x1817392c2..339 gives body
 * [74,48,-31,-75], wind [16,0,0,-60]. InitCollision 0x181738dd1 replaces
 * wind Width with range, negative for direction 2 (0x181738de6).
 * Body: solid category 2/user tag 5 (0x181738d72/97); wind: sensor category
 * 0/user tag 4 (0x181738e1b/50). FP is 16.16; FromFloat_UNSAFE
 * 0x18163fc40 multiplies float32 by 65536 then truncates.
 * Events 60/61 clear/set strong bit0 (0x181738f4e..fd9), not enable/disable.
 * OnCollided 0x181739026..099 multiplies strong power with signed >>16,
 * then OVERWRITES ActorComponent.m_Wind, not sums it. Player default update
 * 0x1816c3dcc..e00 adds m_Wind to its movement velocity and clears it.
 * Top-view is flags bit1, set from Stage +4 bit6 at 0x181738ec8.
 */
(function(root,factory){const api=factory();if(typeof module==='object'&&module.exports)module.exports=api;root.SourceWindDevices=api;})(typeof globalThis!=='undefined'?globalThis:this,function(){
'use strict';
const FP=65536,DEFAULT_RANGE=1280,DEFAULT_STRONG_SCALE=2;
const allowed=(v,c)=>!v||v<0&&c<=-v||v>0&&v<10&&c>=v||v>=10&&c>=Math.trunc(v/10)&&c<=v%10;
const fpRaw=v=>Math.trunc(Math.fround(v)*FP);
function compile(actors,count,options={}){
 if(!Number.isInteger(count)||count<2||count>8)throw Error('Wind requires player count 2..8');
 const winds=[];
 for(const [i,raw] of actors.entries()){
  const a=raw.properties||raw;if(a.typeName!=='Wind'||!allowed(a.playerCount,count))continue;
  if(options.topView||options.isTopViewSort||(options.stageFlags&0x40))throw Error('Wind top-view path is not established');
  const d=raw.datas||raw.parameters||[],n=j=>d[j]?.t===1?d[j].f:0;
  for(const j of [0,1,count,9,10,11])if(!Number.isFinite(n(j)))throw Error('Wind non-finite parameter '+j);
  const p=raw.position||{x:raw.x??raw.posX,y:raw.y??raw.posY};
  if(!Number.isFinite(p.x)||!Number.isFinite(p.y))throw Error('Wind requires an authored position');
  const left=Math.floor(fpRaw(n(9))/FP)!==0;
  winds.push({id:raw.id||'source:a'+i,name:a.name||'',type:'Wind',
   x:(fpRaw(p.x)+(count-2)*fpRaw(n(0)))/FP,y:(fpRaw(p.y)+(count-2)*fpRaw(n(1)))/FP,
   direction:left?2:3,powerRaw:(left?-1:1)*fpRaw(n(count)),
   rangeRaw:n(11)>0?fpRaw(n(11)):DEFAULT_RANGE*FP,
   strongScaleRaw:n(10)>0?fpRaw(n(10)):DEFAULT_STRONG_SCALE*FP,strong:false});
 }
 return {schemaVersion:1,count,winds,pendingForces:[],completePhysicsFidelity:false};
}
const create=c=>JSON.parse(JSON.stringify(c));
const solids=s=>s.winds.map(w=>({id:w.id,x:w.x-31,y:w.y-75,w:48,h:74}));
function volumes(s){return s.winds.map(w=>({id:w.id,windId:w.id,x:w.direction===2?w.x-w.rangeRaw/FP:w.x,y:w.y-60,w:w.rangeRaw/FP,h:16,category:0,userTag:4}));}
function signal(s,e){let found=false;const type=e.eventType??e.event;
 for(const w of s.winds)if(e.broadcast===true||e.broadcastActorType===77||e.targetId===w.id||((e.targetName??e.target)!==undefined&&(e.targetName??e.target)===w.name)){
  if(type===60||type===61){w.strong=type===61;found=true;}
 }return found;
}
function beforeStep(s,{events=[]}={}){
 for(const e of events)signal(s,e);
 const forces=s.pendingForces;s.pendingForces=[];
 return {forces,events:[],solids:solids(s)};
}
// Authoritative collision contacts, in native dispatch order; duplicate actors
// keep the last wind assignment. No guessed player collision box or masks.
function afterStep(s,{events=[],windContacts=[]}={}){
 for(const e of events)signal(s,e);
 const forces=new Map();
 for(const c of windContacts){const w=s.winds.find(w=>w.id===c.windId);if(!w)throw Error('Unknown Wind contact '+c.windId);
  if(c.actorId===undefined)throw Error('Wind contact requires actorId');
  const xRaw=w.strong?Number((BigInt(w.powerRaw)*BigInt(w.strongScaleRaw))>>16n):w.powerRaw;
  forces.set(c.actorId,{actorId:c.actorId,windId:w.id,xRaw,yRaw:0,x:xRaw/FP,y:0,mode:'movementVelocityOffset'});
 }
 s.pendingForces=[...forces.values()];return {events:[],solids:solids(s)};
}
const displays=s=>s.winds.map(w=>({...w}));
return {compile,create,solids,volumes,signal,beforeStep,afterStep,displays,supportedTypes:['Wind'],fpRaw,
 integration:{order:'beforeStep emits prior collision wind once; afterStep accepts windContacts [{windId,actorId}] in collision dispatch order.',
  force:'Apply forces as one-tick movement velocity offsets, in native pixels/tick. Do not multiply by dt, accumulate into persistent velocity, or sum overlapping winds. Default Player update adds and clears m_Wind at 0x1816c3dcc..e00.',
  collision:'Register solids as category 2/userTag 5 and volumes as category 0/userTag 4. Send only actual native-equivalent Wind contacts; use runtime collision filtering, including movable non-player actors.',
  topView:'Pass topView/isTopViewSort or native stageFlags to compile; top-view throws.',
  events:'Route named 60/61 switch events; generic ActorComponent events remain the host responsibility.'},completePhysicsFidelity:false};
});
