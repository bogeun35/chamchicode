/* SearchLight (actor106), static native reconstruction; no original game execution.
 * Creator0x1816f06f0, delegate site0x1817774c4. InitCollision/OnPost bare ret.
 * Fields unboxed: phase+0,flags+2,killPlayerOff+4,timersPtr+8,entity+0x10,
 * alpha+0x18,bright+0x20,dark+0x28,criteria+0x30,range+0x38,
 * mulBrightness+0x40,angle+0x48,timer+0x50,worldDirection+0x58.
 * Parse0x1816f0b40: bright slot0, dark slots1..7 direct count-2 selection;
 * rotation8, coneAngle9, integer range slots10..16, initialBright17==raw65536.
 * Helpers0x1802012e0/1410 read numeric slots, no descending fallback.
 * Bright/dark abs<4 keeps prototype; negative authored raw clamps0 @e48..e98.
 * Creator criteria=65536 @0x1816f07d9; Parse mulBrightness=65536 @0x1816f0f3a.
 * Prototype Materialize0x1817b9c87 COPIES killPlayerOff from asset+0x78.
 * Shipped prefab1276 has no serialized SearchLight component. Creator adds
 * default struct via0x1802010ff ->0x1806845a0 ->RuntimeType.CreateInstanceDefaultCtor
 *0x1814dc9b0 ->0x1814dd35e ->allocator0x180319f60 (zero data@fdd/fe8).
 * No instance .ctor in metadata;104 zero bytes copied@0x180684711..757.
 * Shipped killPlayerOff/bright/dark defaults0; Materialize is a different path.
 * .cctor fatal13107 @0x1816f254a; fade literal'0.0666666666666667' raw4369
 * @0x1816f256b (slot0x1831c3af8), resolved by resolve-string-literals.
 * InitPost starts immediate fade (duration0), result1 for phase0,0 for phase2
 * @0x1816f12aa..e1. startFade always clears8 exposure timers @0x1816f187b..cf.
 * updatePhase0x1816f14f0: 0 brightStart,1 bright(fade then exposure/countdown),
 * 2 darkStart,3 dark(fade then countdown). Separate starts cost one update.
 * bright0&dark0 does nothing @0x1816f1529..536. No direct pause test here.
 * Fade0x18183bf8c..bfd8 has separate >>16 start/end products, linear type0.
 * IsInside radius range*criteria, STRICT squaredDistance<radiusSquared @2174.
 * Threshold Sin((90-angle*criteria/2)*1143 >>16), STRICT dot>threshold @22d7.
 * Normalize uses actual FPSqrt via read-only DistanceConstraint math dependency.
 * FPSinCos body4908336: numeric sparse entries0,25718,77152,85725 below.
 * Quaternion EulerZ0x181644e70 halves rad(angle*1143>>16); rotate down vector
 *0x181645b90 gives directionWorld(-46314,-46368) for authored-45 degrees.
 * Camera.Initialize0x1817df646..683 gives WorldToStage diagonal(chip,-chip).
 * Rect IsInside0x1816f1f00 tests ANY of four corners; no cone-AABB solver.
 * IsPlayerInside0x1816f1da0 chooses collider1 for player state9, else0,
 * rejects missing collider or flags bit0 then adds collider global position.
 * Exposure0x1816f19c0: outside timer0; inside+=DeltaTime; >=fatal and state1
 * sends event26 to player entity @0x1816f1d2d..5a, not an unconditional kill.
 * SearchLight.OnStart registers entity with first Blackout.AddSearchLight
 * @0x1816f1465; this is rendering-list registration, no timer coupling here.
 */
(function(root,factory){const api=factory(typeof require==='function'?require('./source-distanceconstraint-math.js'):root.SourceDistanceConstraintMath);if(typeof module==='object'&&module.exports)module.exports=api;root.SourceSearchLightDevices=api;})(typeof globalThis!=='undefined'?globalThis:this,function(MathNative){
'use strict';
const FP=65536,FATAL=13107,FADE=4369,DEG_RAD=1143;
const SINCOS={0:[0,65536],25718:[25062,60554],77152:[60526,25131],85725:[63286,17021]};
const supportedTypes=['SearchLight'];
const clone=v=>JSON.parse(JSON.stringify(v));
function safe(v){if(!Number.isSafeInteger(v))throw Error('SearchLight FP raw must be a safe integer');return v;}
const i64=v=>BigInt.asIntN(64,v),num=v=>safe(Number(v));
const mul=(a,b)=>num(i64(BigInt(safe(a))*BigInt(safe(b)))>>16n);
function fp(v){if(!Number.isFinite(v))throw Error('Invalid SearchLight numeric slot');return safe(Math.trunc(Math.fround(Math.fround(v)*FP)));}
const allowed=(v,c)=>!v||v<0&&c<=-v||v>0&&v<10&&c>=v||v>=10&&c>=Math.trunc(v/10)&&c<=v%10; // ActorFactory.Update0x1816a2fe9.
function countValid(c){if(!Number.isInteger(c)||c<2||c>8)throw Error('SearchLight player count must be2..8');}
function sincos(r){safe(r);const v=SINCOS[Math.abs(r)%0x6487e];if(!v)throw Error('SearchLight unverified FPSinCos angle raw '+r);return [r<0?-v[0]:v[0],v[1]];}
function directionWorld(rotationRaw){const r=mul(rotationRaw,DEG_RAD),[z,w]=sincos(Math.floor(r/2));return {xRaw:mul(w,z*2),yRaw:mul(FP-mul(z,z*2),-FP)};}
function coneThreshold(light){const effective=mul(light.angleRaw,light.criteriaRaw),half=num(BigInt(effective)>>1n);return sincos(mul(90*FP-half,DEG_RAD))[0];}
function decodeActor(raw,count){
 countValid(count);const a=raw.properties||raw,data=raw.datas||raw.parameters||a.datas||[],n=i=>{if(!data[i])throw Error('SearchLight missing parameter slot '+i);return data[i].t===1?fp(data[i].f):0;};
 const bright=n(0),dark=n(count-1);
 const rotationRaw=n(8),angleRaw=n(9),rangeRaw=(Math.floor(n(count+8)/FP)|0)*FP;
 const out={brightRaw:Math.abs(bright)<4?0:Math.max(0,bright),darkRaw:Math.abs(dark)<4?0:Math.max(0,dark),rotationRaw,angleRaw,rangeRaw,criteriaRaw:FP,mulBrightnessRaw:FP,phase:n(17)===FP?0:2,worldDirectionRaw:directionWorld(rotationRaw)};
 coneThreshold(out);return out;
}
function compile(actors,count,options={}){
 countValid(count);const lights=[];
 for(let i=0;i<actors.length;i++){const raw=actors[i],a=raw.properties||raw;if(a.typeName!=='SearchLight'||!allowed(a.playerCount,count))continue;
 if((raw.createThreshold??a.createThreshold??0)!==0)throw Error('SearchLight delayed creation ordering unresolved');
 const params=decodeActor(raw,count),pos=raw.position||{x:raw.x??raw.posX,y:raw.y??raw.posY};
 if(!Number.isInteger(options.chipSize)||options.chipSize<=0)throw Error('SearchLight requires native camera map chipSize');
 const kill=options.prototypeKillPlayerOff??0;if(!Number.isInteger(kill)||kill< -2147483648||kill>2147483647)throw Error('SearchLight prototypeKillPlayerOff override must be int32');
 const id=raw.id||'source:a'+i,light={id,name:a.name||'',type:'SearchLight',xRaw:fp(pos.x),yRaw:fp(pos.y),chipSize:options.chipSize,...params,killPlayerOff:kill!==0,alphaRaw:params.phase===0?FP:0,timerRaw:0,playerTimersRaw:Array(8).fill(0),fade:{startRaw:params.phase===0?0:FP,endRaw:params.phase===0?FP:0,currentRaw:params.phase===0?FP:0,timeRaw:0,totalRaw:0,active:false}};
 lights.push(light);
 }
 return {schemaVersion:1,count,lights,completePhysicsFidelity:false};
}
const create=clone;
function solids(){return [];}
function brightnessRaw(l){if(l.darkRaw===0)return l.mulBrightnessRaw;if(l.brightRaw===0)return 0;return mul(Math.max(0,Math.min(FP,l.alphaRaw)),l.mulBrightnessRaw);}
function isLightsOn(l){return l.phase===1||brightnessRaw(l)>0;}
function startFade(l,bright,immediate=false){const start=bright?0:FP,end=bright?FP:0;l.fade={startRaw:start,endRaw:end,currentRaw:start,timeRaw:0,totalRaw:immediate?0:FADE,active:true};l.playerTimersRaw.fill(0);}
function advanceFade(l,dtRaw){const f=l.fade;if(f.active){f.timeRaw+=dtRaw;if(f.timeRaw>=f.totalRaw){f.timeRaw=f.totalRaw;f.active=false;}}
 if(f.totalRaw<=0||f.timeRaw>=f.totalRaw)f.currentRaw=f.endRaw;else{const t=num((BigInt(f.timeRaw)<<16n)/BigInt(f.totalRaw));f.currentRaw=mul(FP-t,f.startRaw)+mul(t,f.endRaw);}
 l.alphaRaw=f.currentRaw;return f.active;
}
function insidePoint(l,p){
 if(!MathNative)throw Error('SearchLight native normalization dependency missing');safe(p.xRaw);safe(p.yRaw);
 const dx=safe(p.xRaw-l.xRaw),dy=safe(p.yRaw-l.yRaw),radius=mul(l.rangeRaw,l.criteriaRaw),dist=mul(dx,dx)+mul(dy,dy);
 if(dist>=mul(radius,radius))return false;
 const dir=MathNative.normalizeRaw({xRaw:mul(l.worldDirectionRaw.xRaw,l.chipSize*FP),yRaw:mul(l.worldDirectionRaw.yRaw,-l.chipSize*FP)}),n=MathNative.normalizeRaw({xRaw:dx,yRaw:dy});
 return mul(dir.xRaw,n.xRaw)+mul(dir.yRaw,n.yRaw)>coneThreshold(l);
}
function insideRect(l,r){for(const k of ['xRaw','yRaw','widthRaw','heightRaw'])safe(r[k]);return [[r.xRaw,r.yRaw],[r.xRaw,r.yRaw+r.heightRaw],[r.xRaw+r.widthRaw,r.yRaw],[r.xRaw+r.widthRaw,r.yRaw+r.heightRaw]].some(([xRaw,yRaw])=>insidePoint(l,{xRaw,yRaw}));}
function insidePlayer(l,p){if(!p.hasCollision||p.collisionDisabled)return false;if(!p.collisionRectRaw)throw Error('SearchLight native global collision rect missing (state9 selects collider1)');return insideRect(l,p.collisionRectRaw);}
function checkPlayers(l,players,dtRaw){
 const events=[];for(const p of players){if(!Number.isInteger(p.index)||p.index<0||p.index>=8||!Number.isInteger(p.state)||typeof p.hasCollision!=='boolean'||typeof p.collisionDisabled!=='boolean')throw Error('SearchLight native player index/state/collision facts missing');
 if(!insidePlayer(l,p)){l.playerTimersRaw[p.index]=0;continue;}l.playerTimersRaw[p.index]+=dtRaw;
 if(l.playerTimersRaw[p.index]>=FATAL&&p.state===1){if(p.id===undefined)throw Error('SearchLight target player entity id missing');events.push({eventType:26,targetId:p.id,senderId:l.id});}
 }return events;
}
function updateLight(l,{dtRaw=1092,players=[]}={}){
 if(!Number.isSafeInteger(dtRaw)||dtRaw<0)throw Error('Invalid SearchLight FP delta');const events=[];
 if(l.brightRaw===0&&l.darkRaw===0)return events;
 switch(l.phase){
 case 0:l.timerRaw=l.brightRaw;l.phase=1;break;
 case 1:if(advanceFade(l,dtRaw))break;if(!l.killPlayerOff)events.push(...checkPlayers(l,players,dtRaw));if(l.darkRaw===0)break;l.timerRaw-=dtRaw;if(l.timerRaw>0)break;l.phase=2;startFade(l,false);break;
 case 2:l.timerRaw=l.darkRaw;l.phase=3;break;
 case 3:if(advanceFade(l,dtRaw))break;if(l.brightRaw===0)break;l.timerRaw-=dtRaw;if(l.timerRaw>0)break;l.phase=0;startFade(l,true);break;
 default:break;
 }return events;
}
function beforeStep(state,ctx={}){
 const dt=ctx.dt??1/60;if(!Number.isFinite(dt)||dt<0)throw Error('Invalid SearchLight delta');const dtRaw=ctx.dtRaw??Math.trunc(dt*FP),events=[],actorEvents=[];
 const incoming=ctx.events||[],paused=ctx.pausedLightIds;
 if(state.lights.some(l=>!l.killPlayerOff)&&!Array.isArray(ctx.searchLightPlayers))throw Error('SearchLight native searchLightPlayers collision facts missing');
 for(const e of incoming){if(e.eventType===53&&!Array.isArray(paused))throw Error('SearchLight event53 Actor pause dispatch unresolved: supply pausedLightIds from native common Actor handling');actorEvents.push(e);}
 for(const l of state.lights){if(Array.isArray(paused)&&paused.includes(l.id))continue;events.push(...updateLight(l,{dtRaw,players:ctx.searchLightPlayers||[]}));}
 return {events,actorEvents,solids:[],deadPlayerIds:[]};
}
function afterStep(state,ctx={}){return {events:[],actorEvents:ctx.events||[],deadPlayerIds:[]};}
function setLightEnable(l,on){l.brightRaw=on?FP:0;l.darkRaw=on?0:FP;} //0x1816f23d0 does not alter phase.
function setDecisionCriteria(l,raw){safe(raw);const old=l.criteriaRaw;l.criteriaRaw=raw;try{coneThreshold(l);}catch(e){l.criteriaRaw=old;throw e;}}
function setMulBrightness(l,raw){l.mulBrightnessRaw=safe(raw);} //0x180ad3100.
function displays(state){return {lights:state.lights.map(l=>({id:l.id,xRaw:l.xRaw,yRaw:l.yRaw,phase:l.phase,alphaRaw:l.alphaRaw,brightnessRaw:brightnessRaw(l),lightsOn:isLightsOn(l),rangeRaw:l.rangeRaw,angleRaw:l.angleRaw,criteriaRaw:l.criteriaRaw,worldDirectionRaw:{...l.worldDirectionRaw}}))};}
const integration=Object.freeze({
 prototype:'Active compile requires native camera chipSize. Shipped resource prefab has no serialized SearchLight component; generic default-value creation supplies killPlayerOff/bright/dark zero. Optional int32 prototypeKillPlayerOff overrides this for explicit alternate prototypes.',
 geometry:'Supply searchLightPlayers [{index,id,state,hasCollision,collisionDisabled,collisionRectRaw:{xRaw,yRaw,widthRaw,heightRaw}}] from native collider global rect, collider1 if state9. No guessed player AABB.',
 events:'Exposure emits targeted event26 only for state1. Dispatch through native Player event handler; no direct deadPlayerIds assumption. Nondevice events forward via actorEvents.',
 pause:'SearchLight component has no OnRecvEvent override or local pause test. Resolve common Actor event53 pause before calling Update; pausedLightIds suppresses phase/exposure. Blackout ignores53 and keeps ticking. Unresolved53 delivery is refused.',
 blackout:'OnStart registers each SearchLight entity in first Blackout.m_SearchLightList for BlackoutView.updateSearchLight. No SearchLight<->Blackout timer or brightness multiplier write found in those native simulation methods. Render both, and apply list hole/illumination separately.',
 dependencies:'Read-only source-distanceconstraint-math.js supplies full native normalize; existing DistanceConstraint and Blackout files unchanged. Browser load math before SearchLight module.',
 status:'Native shipped timer/cone/exposure core verified; shipped defaults verified; shared Actor pause/event26/render integration remain lead work.'});
return {compile,create,solids,beforeStep,afterStep,displays,supportedTypes,decodeActor,fp,sincos,directionWorld,coneThreshold,brightnessRaw,isLightsOn,startFade,advanceFade,insidePoint,insideRect,insidePlayer,checkPlayers,updateLight,setLightEnable,setDecisionCriteria,setMulBrightness,integration,nativeConstants:{fpOne:FP,fatalRaw:FATAL,fadeRaw:FADE,degToRadRaw:DEG_RAD,sincos:SINCOS},completePhysicsFidelity:false};
});
