/* PP2 LinePathGearComponent, read-only static reconstruction. No game executed.
 * Creator ordinal153 at0x181776daf ->0x181876b50; separately owns QLinePath.
 * Initialize0x181876d6e takes Gear.SPEED raw65536 (0x1818536ca),
 * allocates10 path entries at0x181876da6. Zero-initialized flags/timer/return.
 * ParseParameter0x181876f6f slot0 sar16 ->dirX (+/-65536), store0x181877059;
 * slot1 absolute speed if abs>=4 (0x181877064..71); slot2 sar16 !=0 standby
 * (0x1818770e9..f1); slot3 QPlayerCountParam added DIRECTLY at count-2
 * (jump table0x18187709f..e5), never calls Find/fallback or clamps speed.
 * slot5>0 sets loop flag bit1, exactly2 sets absLoop (0x1818772b8..d5).
 * slot6==1 enables guide line (0x1818772d8..2ff).
 * UnpackVector2ArrayParam(start7,max10)0x18187713f..15d;
 * pair(0,0) terminates0x1817868e6..8f2; paths remain relative authored raws.
 * slot27 direct count-2 endpointYOffset (0x181877178..1d4), added to LAST
 * point's Y at0x18187723c..29e. Empty path sets flagbit0 and clearsbit2.
 * QPlayerCountParam low UTF16 byte minus0x21 at0x18096f80c..81d;
 * wrong/missing string returns zero table0x18096f933,0x18096fcb1..fd0a.
 * FP loader0x18055427c ->0x180554373 ->0x18163fd46 ->0x18163fc6d/7e:
 * float32 multiplication by65536 and signed truncate; integer slots sar16.
 * OnUpdate0x181877524 standby skip;0x181877588..596 timer+=dt*speed>>16;
 *0x18187759a..5c6 ratio=clamp((timer<<16)/QLinePath.totalLengthWS,0,65536),
 * zero for nonpositive totalLengthWS; return direction uses1-ratio0x1818775cb.
 * GetPathPosition0x1818775e9, initial position+offset0x181877631..640,
 * SetPosForce0x181877650. Endpoint0x181877655..682 resets timer to0,
 * toggles return; stays active iff loop && (absLoop || oldReturn==0).
 * Event61 toggles standby0x1818778b6/8f9..8ff; others shared Actor handler.
 * Circle from Gear.COLLISION_CIRCLE0x1818773cf/3da; Gear cctor0x1818536ba,
 *0x1818536f6/723/755/769: radius45,offsetX-2,offsetY-48 in16.16.
 * Circle shape1 Actor.CreateCollision0x18169f694; layer8 at0x18187742d (corrected byte+1 field).
 * Contact type1 plus existing otherActor plus collision layer1 emits43
 *0x181877941..9af; OnCollided independently requires layer1, found Player,
 * Player.m_PlayerState raw+3==1 (0x181877a64), emits43 at0x181877ab3.
 * R2: complete sqrt, path length/position, OnPost rotation and SetPosForce plans
 * in source-linepathgear-path.js. Event pool CauseDead0 resets at0x181780c31.
 * Guide width '0.075' raw4915 from cctor0x181877bca..bdd.
 * Guard/interface metadata and test input values are not native game constants.
 */
(function(root,factory){const api=factory(typeof module==='object'&&module.exports?require('./source-linepathgear-path.js'):root.SourceLinePathGearPath);if(typeof module==='object'&&module.exports)module.exports=api;root.SourceLinePathGearDevices=api;})(typeof globalThis!=='undefined'?globalThis:this,function(Path){
'use strict';
const F=65536,EPS=4,PATH_MAX=10,ACTOR_TYPE=153,EVENT_TOGGLE=61,EVENT_DAMAGE=43;
const C={speedRaw:F,guideLineWidthRaw:4915,circle:{radiusRaw:2949120,xRaw:-131072,yRaw:-3145728,shape:'circle',layer:8,pushBackTarget:0,isEnableSyncPos:true}};
const supportedTypes=['LinePathGear'];
const refusal='LinePathGear requires authored chipSize for numeric path compilation; runtime still requires native Actor.SetPosForce, circle collision response and phase ordering';
const clone=x=>JSON.parse(JSON.stringify(x));
function exact(n,label){if(!Number.isSafeInteger(n))throw Error('LinePathGear requires exact safe FP raw '+label);return n;}
function fpRaw(n){if(!Number.isFinite(n))throw Error('LinePathGear non-finite authored value');return exact(Math.trunc(Math.fround(Math.fround(n)*F)),'authored value')||0;}
const mul=(a,b)=>exact(Number(BigInt.asIntN(64,BigInt(exact(a,'multiply'))*BigInt(exact(b,'multiply')))>>16n),'multiply result');
const add=(a,b)=>exact(Number(BigInt.asIntN(64,BigInt(exact(a,'add'))+BigInt(exact(b,'add')))),'sum');
const allowed=(v,c)=>!v||v<0&&c<=-v||v>0&&v<10&&c>=v||v>=10&&c>=Math.trunc(v/10)&&c<=v%10;
function countTable(slot){
 const s=slot?.t===2?slot.s:null;
 if(typeof s!=='string'||s.length!==56)return Array(7).fill(0);
 return Array.from({length:7},(_,i)=>{let v=0n;for(let b=7;b>=0;b--)v=(v<<8n)|BigInt((s.charCodeAt(i*8+b)-0x21)&255);return exact(Number(BigInt.asIntN(64,v)),'count table');});
}
function decodeActor(raw,count,index=0){
 if(!Number.isInteger(count)||count<2||count>8)throw Error('LinePathGear player count must be2..8');
 const a=raw.properties||raw,data=raw.datas||raw.parameters||a.datas||[],pos=raw.position||{};
 const slot=i=>data[i]?.t===1?fpRaw(data[i].f):0,int=i=>Number(BigInt.asIntN(32,BigInt(Math.floor(slot(i)/F))));
 const speedTable=countTable(data[3]),endpointTable=countTable(data[27]),speedBase=Math.abs(slot(1));
 const paths=[];
 for(let i=7;i<7+PATH_MAX*2;i+=2){const xRaw=slot(i),yRaw=slot(i+1);if(xRaw===0&&yRaw===0)break;paths.push({xRaw,yRaw});}
 const endpointYOffsetRaw=paths.length?endpointTable[count-2]:0;
 if(paths.length)paths[paths.length-1].yRaw=add(paths[paths.length-1].yRaw,endpointYOffsetRaw);
 const mode=int(5);
 return {id:raw.id||'source:a'+index,name:a.name||'',type:'LinePathGear',actorType:ACTOR_TYPE,
  xRaw:fpRaw(pos.x??raw.posX??raw.x??a.posX),yRaw:fpRaw(pos.y??raw.posY??raw.y??a.posY),
  dirXRaw:int(0)>0?-F:F,dirYRaw:0,speedRaw:add(speedBase>=EPS?speedBase:C.speedRaw,speedTable[count-2]),
  baseSpeedRaw:speedBase>=EPS?speedBase:C.speedRaw,speedTable,endpointTable,endpointYOffsetRaw,paths,
  mode,loop:mode>0,absLoop:mode===2,enableLine:int(6)===1,standby:int(2)!==0,
  disabled:paths.length===0,timerRaw:0,returnDirection:0,angleRaw:0,preXRaw:0,preYRaw:0};
}
function inspectActors(actors,count){return actors.flatMap((raw,index)=>{const a=raw.properties||raw;return a.typeName==='LinePathGear'&&allowed(a.playerCount,count)?[decodeActor(raw,count,index)]:[];});}
function compile(actors,count,options={}){
 if(!Number.isInteger(count)||count<2||count>8)throw Error('LinePathGear player count must be2..8');
 const gears=inspectActors(actors,count);
 if(gears.length&&(options.chipSize===undefined||!Path))throw Error(refusal);
 for(const g of gears)g.path=Path.compilePath(g.paths,options.chipSize);
 return {schemaVersion:2,count,gears,completePhysicsFidelity:false};
}
const create=clone;
// Native traversal fraction/end transitions; compiled paths now establish real
// QLinePath totalLengthWS via the complete native FPSqrt table.
function advanceTraversal(g,dtRaw,totalLengthWSRaw){
 exact(dtRaw,'delta');exact(totalLengthWSRaw,'QLinePath.totalLengthWS');
 if(dtRaw<0)throw Error('LinePathGear negative delta');
 if(g.standby)return null;
 const timer=add(g.timerRaw,mul(dtRaw,g.speedRaw));
 let fraction=totalLengthWSRaw>0?Path.divRaw(timer,totalLengthWSRaw):0;
 fraction=Math.max(0,Math.min(F,fraction));
 const oldReturn=g.returnDirection,progressRaw=oldReturn>0?F-fraction:fraction;
 g.timerRaw=timer;
 if(fraction>=F){g.timerRaw=0;g.returnDirection=oldReturn===0?1:0;if(!(g.loop&&(g.absLoop||oldReturn===0)))g.standby=true;}
 return {progressRaw,reachedEnd:fraction>=F};
}
function receiveEvent(g,eventType){if(eventType===EVENT_TOGGLE){g.standby=!g.standby;return {handled:true};}return {handled:false,delegateToActor:true};}
function damageEvent(g,targetId){if(typeof targetId!=='string')throw Error('LinePathGear event43 requires exact entity targetId');return {senderId:g.id,targetId,eventType:EVENT_DAMAGE,causeDead:0};}
function contacted(g,{contactType,otherActorExists,otherLayer,otherId}){
 if(contactType!==1)return [];
 if(typeof otherActorExists!=='boolean')throw Error('LinePathGear requires native otherActorExists');
 if(!otherActorExists)return [];
 if(!Number.isInteger(otherLayer))throw Error('LinePathGear requires native collision layer');
 if(otherLayer!==1)return [];
 return [damageEvent(g,otherId)];
}
function collided(g,{otherLayer,playerExists,playerState,playerEntityId}){
 if(!Number.isInteger(otherLayer))throw Error('LinePathGear requires native collision layer');
 if(otherLayer!==1)return [];
 if(typeof playerExists!=='boolean')throw Error('LinePathGear requires native playerExists');
 if(!playerExists)return [];
 if(!Number.isInteger(playerState))throw Error('LinePathGear requires native player state');
 if(playerState!==1)return [];
 return [damageEvent(g,playerEntityId)];
}
function collisionDescriptor(g){return {actorId:g.id,...C.circle};}
function validate(s){if(!s||!Array.isArray(s.gears))throw Error('Invalid LinePathGear state');for(const g of s.gears)if(!g.path)throw Error('LinePathGear state missing compiled QLinePath');}
function updatePosition(g,dtRaw,initPositionRaw){
 const traversal=advanceTraversal(g,dtRaw,g.path.totalLengthWSRaw);
 if(!traversal)return null;
 const offsetRaw=Path.pathPosition(g.path,traversal.progressRaw);
 return {...traversal,offsetRaw,positionRaw:{xRaw:Path.addRaw(initPositionRaw.xRaw,offsetRaw.xRaw),yRaw:Path.addRaw(initPositionRaw.yRaw,offsetRaw.yRaw)}};
}
function solids(s){validate(s);return [];}
function beforeStep(s,ctx={}){
 validate(s);const plans=[],actorEvents=[];
 if(!s.gears.length)return {events:[],solids:[],deadPlayerIds:[],positionPlans:plans,actorEvents};
 exact(ctx.dtRaw,'native Frame.DeltaTime');
 if(!Array.isArray(ctx.actorSnapshots))throw Error('LinePathGear requires native actorSnapshots with initPos and collisionSlots');
 // Validate every transaction before committing any device state. No callback
 // or boolean option certifies that the caller applied these actual plans.
 const next=clone(s.gears);
 for(const g of next){
  for(const e of ctx.events||[])if(e.broadcast||e.broadcastActorType===ACTOR_TYPE||e.targetId===g.id||e.targetName===g.name){const type=e.eventType??e.event??(e.on===true?61:e.on===false?60:null);const r=receiveEvent(g,type);if(r.delegateToActor)actorEvents.push({...e,targetId:g.id});}
  if(g.standby)continue;
  const actor=ctx.actorSnapshots.find(a=>a.actorId===g.id);
  if(!actor)throw Error('LinePathGear missing native Actor snapshot for '+g.id);
  const result=updatePosition(g,ctx.dtRaw,{xRaw:exact(actor.initXRaw,'Actor.initPosX'),yRaw:exact(actor.initYRaw,'Actor.initPosY')});
  const plan=Path.forcePositionPlan(actor,result.positionRaw);plans.push({...plan,...result});
 }
 s.gears=next;
 return {events:[],solids:[],deadPlayerIds:[],positionPlans:plans,actorEvents};
}
function afterStep(s,ctx={}){
 validate(s);
 if(!s.gears.length)return {events:[],solids:[],deadPlayerIds:[]};
 if(!Array.isArray(ctx.actorSnapshots))throw Error('LinePathGear OnPost requires actual post-movement actorSnapshots');
 const next=clone(s.gears);
 for(const g of next){const actor=ctx.actorSnapshots.find(a=>a.actorId===g.id);if(!actor)throw Error('LinePathGear missing OnPost Actor snapshot for '+g.id);Path.rotatePost(g,actor);}
 s.gears=next;return {events:[],solids:[],deadPlayerIds:[]};
}
function displays(s){validate(s);return s.gears.map(g=>({id:g.id,name:g.name,type:g.type,angleRaw:g.angleRaw,standby:g.standby,enableLine:g.enableLine,guideLineWidthRaw:C.guideLineWidthRaw,paths:clone(g.paths),initialPositionRaw:{xRaw:g.xRaw,yRaw:g.yRaw}}));}
const integration={
 status:'Numeric path/end transitions/rotation and exact SetPosForce plans implemented. compile with real chipSize succeeds without bridge booleans; this is not registered playable runtime.',
 scripts:'Load source-distanceconstraint-math.js, source-linepathgear-path.js, then source-linepathgear-devices.js in the browser; CommonJS dependencies automatic. Existing dependency files remain read-only.',
 coordinates:'Actor.initPos/current/prePos are authored pixel FP, not reciprocal chip world units. QLinePath totalLengthWS uses Camera.ViewMatrix reciprocal scaling of total pixel length followed by native sqrt. Native path interpolation returns pixel offsets, added to actual Actor.initPos.',
 update:'Call beforeStep once at native LinePathGear.OnUpdate with exact dtRaw and actorSnapshots {actorId,initXRaw,initYRaw,collisionSlots:[{valid,collision:null|{id,flags}}]}. Apply every positionPlan before collision discovery: Actor pos/prePos both assigned; each valid resolved collision pos/prePos assigned and bit6 cleared. Velocity/expectedPos/scale/contact caches unchanged. No host callback certifies success.',
 collision:'LinePathGear CreateCollision uses layer8,pushBackTarget0,isEnableSyncPos=true. These differ from Gear pushBackTarget3. Ordered circle response is auxiliary1/shared lead scope. Call contacted/collided synchronously from real graph, using otherLayer (byte+1), not otherAttribute.',
 events:'61 toggles standby. Other inputs returned as actorEvents for shared Actor only. Damage43 carries causeDead0 from event pool reset0x181780c31; player/SharedHP receiver remains host responsibility.',
 post:'Call afterStep at native LinePathGear.OnPost with actual post-Actor xRaw/yRaw for every scheduled device, including standby. Full native sqrt is reused; angle depends on real Actor movement and cannot be computed solely from planned rail position.',
 phases:'Shared Actor pause/warp/acceleration, Map.Move/contact/inertia and delegate order are lead runtime obligations; this module does not schedule or fabricate them. No stage playable claim.'
};
return {compile,create,solids,beforeStep,afterStep,displays,supportedTypes,inspectActors,decodeActor,countTable,fpRaw,advanceTraversal,receiveEvent,contacted,collided,collisionDescriptor,updatePosition,Path,nativeConstants:C,integration,refusal,completePhysicsFidelity:false};
});


