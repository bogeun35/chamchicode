/* Source-derived PP2 DistanceConstraint; read-only static analysis, no game run.
 * Native math/tension/force core complete; active compile requires explicit host facts contract.
 * Actor ordinal 11 -> Creator 0x181819e10 (delegate site 0x18177666c).
 * Unboxed fields: flags +0, forceMoves +4 (8 int32), entity +0x28,
 * distance +0x30, gravityTension +0x38 (quantum-field-offsets.json minus 16).
 * ParseParameter 0x181819fd0: i=2*playerActorCount-4 @0x18181a000.
 * distance=datas[i] if abs(raw)>=4 else datas[0] @0x18181a05b..093;
 * gravity=datas[i+1] if abs(raw)>=4 else datas[1] @0x18181a0da..113.
 * No descending nonzero search, and no paired fallback. Non-float slot = zero.
 * Creator initially copies gravity default @0x181819f3b, but ParseParameter
 * ALWAYS overwrites it, including with zero @0x18181a102/118.
 * .cctor: K=13107 @0x18181c68d; gravityDefault=32768 @0x18181c6a3;
 * resultYMax=1320550 @0x18181c739; minX=6553 @0x18181c74f;
 * frictionScale=65536 @0x18181c765; frictionMoveBegin=0 @0x18181c77b;
 * frictionMoveScale="1.2" raw78643 @0x18181c7a7, resolved literal 0x1831c9e70.
 * FP_ONE=65536: shift16 @0x18181c127/12c; epsilon4 @0x18181a05b.
 * Event24 marks forceMoves[index]=1, indices0..7 @0x18181c34c..445;
 * clearEnableForceMoves resets all eight @0x18181c202..267.
 * Floor slide scale when forced and floating-chain length>=0:
 * min(65536, ((65536/(length+1))*78643 >>16)+0) @0x18181c0e6..146.
 * Native integer division truncates; signed multiplication uses arithmetic >>16.
 * R2: full numeric FPSqrt resource hash/entries in source-distanceconstraint-math.js.
 * Length0x181640c40 and packed normalize0x1816463a0 restored with int64 shifts.
 * calcPrev/Next0x18181a9e0/adf0, pairF0x18181baa0, aggregateF0x18181b4c0
 * restored. State5 skip @0x18181b56f, whole-frame flag0x200 @0x18181a21a;
 * native zero vector, contact redirect threshold65 @0x18181be1d/bf14;
 * player flag0 clear @0x18181b91c, grounded weak-up cancel @0x18181b9a2;
 * X forced brake @0x18181b7e4..89e, signed Y clamp @0x18181b9c1..ba05.
 * Core emits pure delta/flags transactions. Host still supplies exact contacts
 * and moveContactActor mode2; no guessed collision response is included.
 */
(function(root,factory){const api=factory(typeof require==='function'?require('./source-distanceconstraint-math.js'):root.SourceDistanceConstraintMath);if(typeof module==='object'&&module.exports)module.exports=api;root.SourceDistanceConstraintDevices=api;})(typeof globalThis!=='undefined'?globalThis:this,function(NativeMath){
'use strict';
const FP_ONE=65536,EPSILON=4,MAX_PLAYERS=8,FORCE_EVENT=24;
const supportedTypes=['DistanceConstraint'];
const nativeConstants=Object.freeze({kRaw:13107,gravityDefaultRaw:32768,resultYMaxRaw:1320550,minXRaw:6553,frictionScaleRaw:65536,frictionMoveBeginRaw:0,frictionMoveScaleRaw:78643,epsilonRaw:EPSILON,forceEvent:FORCE_EVENT});
const refusal='DistanceConstraint native contact transport unresolved: compile requires nativeConstraintFacts:true and runtime constraintPlayers/applyConstraintUpdate contract (ActorComponent.moveContactActor 0x1816a0d40); see distanceconstraint-device-report.json';
function validateCount(c){if(!Number.isInteger(c)||c<2||c>MAX_PLAYERS)throw Error('DistanceConstraint player count must be 2..8');}
function safeRaw(v){if(!Number.isSafeInteger(v))throw Error('DistanceConstraint FP raw must be a safe integer');return v;}
// Established converter: Double.Parse -> float32 -> FP.FromFloat_UNSAFE.
// 0x180554373 -> 0x18163fcb0 -> 0x18163fc40 (cvttss2si).
function fpRaw(v){if(!Number.isFinite(v))throw Error('Invalid DistanceConstraint float slot');return safeRaw(Math.trunc(Math.fround(Math.fround(v)*FP_ONE)));}
function parameters(actor,count){
 validateCount(count);const data=actor.datas||actor.parameters||[];
 const read=i=>{if(!data[i])throw Error('DistanceConstraint missing parameter slot '+i);return data[i].t===1?fpRaw(data[i].f):0;};
 const i=(count-2)*2,selectedDistance=read(i),selectedGravity=read(i+1);
 const distanceSlot=Math.abs(selectedDistance)>=EPSILON?i:0;
 const gravitySlot=Math.abs(selectedGravity)>=EPSILON?i+1:1;
 return {distanceRaw:distanceSlot===i?selectedDistance:read(0),gravityTensionRaw:gravitySlot===i+1?selectedGravity:read(1),distanceSlot,gravitySlot};
}
const allowed=(v,c)=>!v||v<0&&c<=-v||v>0&&v<10&&c>=v||v>=10&&c>=Math.trunc(v/10)&&c<=v%10; // ActorFactory.Update 0x1816a2fe9.
function inspectActors(actors,count){
 validateCount(count);return actors.flatMap((a,i)=>{const p=a.properties||a;
 if(!supportedTypes.includes(p.typeName)||!allowed(p.playerCount,count))return [];
 return [{id:a.id||'source:a'+i,name:p.name||'',type:'DistanceConstraint',...parameters(a,count)}];});
}
function floorSlideScaleRaw(length,enabled){
 if(!Number.isInteger(length)||length< -1||length>=MAX_PLAYERS)throw Error('Invalid DistanceConstraint floating-chain length');
 if(!enabled||length<0)return nativeConstants.frictionScaleRaw;
 const reciprocal=BigInt(FP_ONE)/BigInt(length+1);
 return Math.min(FP_ONE,Number((reciprocal*BigInt(nativeConstants.frictionMoveScaleRaw))>>16n)+nativeConstants.frictionMoveBeginRaw);
}
// Diagnostic helpers for the recovered event state; not a bypass to compile().
function forceMoves(){return Array(MAX_PLAYERS).fill(0);}
function checkForceMoves(m){if(!Array.isArray(m)||m.length!==MAX_PLAYERS||m.some(v=>v!==0&&v!==1))throw Error('Invalid DistanceConstraint force-move flags');}
function markForceMove(m,event){
 checkForceMoves(m);if(event.eventType!==FORCE_EVENT)return false;
 const i=event.playerIndex;if(!Number.isInteger(i)||i<0||i>=MAX_PLAYERS)return false;
 m[i]=1;return true;
}
function clearForceMoves(m){checkForceMoves(m);m.fill(0);}
// Native signed low64 imul + sar16, not float arithmetic.
const int64=v=>BigInt.asIntN(64,v);
const exact=v=>safeRaw(Number(v));
const mul=(a,b)=>exact(int64(BigInt(safeRaw(a))*BigInt(safeRaw(b)))>>16n);
const add=(a,b)=>exact(int64(BigInt(safeRaw(a))+BigInt(safeRaw(b))));
const neg=a=>exact(int64(-BigInt(safeRaw(a))));
const vec=()=>({xRaw:0,yRaw:0});
const sum=(a,b)=>({xRaw:add(a.xRaw,b.xRaw),yRaw:add(a.yRaw,b.yRaw)});
const dot=(a,b)=>add(mul(a.xRaw,b.xRaw),mul(a.yRaw,b.yRaw));
const scale=(v,n)=>({xRaw:mul(v.xRaw,n),yRaw:mul(v.yRaw,n)});
const sign=a=>a<0?-FP_ONE:FP_ONE; // zero is positive @0x18181bde9..be16.
function validatePlayer(p){
 if(!p)throw Error('DistanceConstraint player snapshot missing');
 for(const k of ['xRaw','yRaw','vxRaw','vyRaw'])safeRaw(p[k]);
 if(!Number.isInteger(p.state)||p.state<0||p.state>255||!Number.isInteger(p.flags)||p.flags<0||p.flags>0xffffffff)throw Error('DistanceConstraint requires native player state byte and flags uint32');
 if(typeof p.floating!=='boolean'||typeof p.hasCollision!=='boolean'||typeof p.hasActor!=='boolean')throw Error('DistanceConstraint native floating/actor/collision facts missing');
 if(!Number.isInteger(p.contactCount0)||p.contactCount0<0||p.contactCount0>0x7ffffffe||typeof p.contacted1!=='boolean'||!Array.isArray(p.mapFaces)||p.mapFaces.length!==4||p.mapFaces.some(v=>typeof v!=='boolean'))throw Error('DistanceConstraint directional contact facts missing');
}
function validatePlayers(players){
 if(!Array.isArray(players)||players.length<2||players.length>8)throw Error('DistanceConstraint requires native actor-index snapshots for 2..8 players');
 players.forEach((p,i)=>{if(!p||p.index!==i)throw Error('DistanceConstraint snapshots must be dense native actor-index order');validatePlayer(p);});
}
function separation(self,peer){if(!NativeMath)throw Error('DistanceConstraint native math dependency missing');if(!self.hasActor||!peer.hasActor)throw Error('DistanceConstraint reached unresolved native null actor dereference in calcTension/calcF');return {xRaw:add(peer.xRaw,neg(self.xRaw)),yRaw:add(peer.yRaw,neg(self.yRaw))};}
// calcTension 0x18181b210: distance threshold, normalized direction, peer contact mass.
function calcTension(c,self,peer){
 if(!self||!peer)return vec();validatePlayer(self);validatePlayer(peer);const delta=separation(self,peer),length=NativeMath.lengthRaw(delta);
 if(Math.abs(length)<4||length<=c.distanceRaw)return vec();
 let n=NativeMath.normalizeRaw(delta);if(peer.hasCollision&&peer.contactCount0>0)n=scale(n,(peer.contactCount0+1)*FP_ONE);return n;
}
// calcPrevTension 0x18181a9e0 / calcNextTension 0x18181adf0.
function chainTension(c,players,index,next){
 validatePlayers(players);const self=players[index];let tension=vec(),floatingCount=0,counting=true;
 if(self.floating&&self.hasCollision)tension.yRaw=mul((self.contactCount0+1)*FP_ONE,c.gravityTensionRaw);
 const begin=next?index:index-1,end=next?players.length-2:0;
 // Native next loop STRICTLY i<count-2 @0x18181af4c and 0x18181b1d5.
 // It excludes the final pair. Do not symmetrize this asymmetry.
 for(let i=begin;next?i<end:i>=end;next?i++:i--){
  const a=players[next?i:i+1],b=players[next?i+1:i];
  if(!b.floating){floatingCount=0;counting=false;}else if(counting)floatingCount++;
  const t=calcTension(c,a,b);if(Math.abs(t.xRaw)>=4||Math.abs(t.yRaw)>=4)tension=sum(tension,t);
 }
 return {tension,floatingCount};
}
function calcPrevTension(c,players,index){return chainTension(c,players,index,false);}
function calcNextTension(c,players,index){return chainTension(c,players,index,true);}
// Pair calcF 0x18181baa0. Inputs are native tension snapshots, not updated positions.
function calcPairF(c,self,peer,tensionA,tensionB,floatingCount,forced){
 let force=vec(),redirectedUp=null;if(self)validatePlayer(self);if(peer)validatePlayer(peer);if(!self||!peer||self.state===5)return {force,redirectedUp};
 const delta=separation(self,peer),length=NativeMath.lengthRaw(delta);if(Math.abs(length)<4||length<=c.distanceRaw)return {force,redirectedUp};
 const n=NativeMath.normalizeRaw(delta);let share=FP_ONE;
 if(peer.state!==5){const a=add(FP_ONE,Math.max(0,dot({xRaw:neg(n.xRaw),yRaw:neg(n.yRaw)},tensionA))),b=add(FP_ONE,Math.max(0,dot(n,tensionB)));share=FP_ONE-exact((BigInt(a)<<16n)/BigInt(add(a,b)));}
 const magnitude=mul(mul(add(length,neg(c.distanceRaw)),share),nativeConstants.kRaw);force=scale(n,magnitude);
 // Collision.IsContactedMapOrRect sides0..3 @0x18181be2d..c027.
 if(self.hasCollision&&(force.xRaw>65&&self.mapFaces[3]||force.xRaw< -65&&self.mapFaces[2])){
  const sy=sign(force.yRaw);force.yRaw=add(force.yRaw,mul(Math.abs(mul(force.xRaw,nativeConstants.frictionScaleRaw)),sy));force.xRaw=0;redirectedUp=sy<0;
 }
 if(self.hasCollision&&force.yRaw< -65&&self.mapFaces[0]){force.xRaw=add(force.xRaw,mul(mul(Math.abs(force.yRaw),sign(magnitude===0?0:mul(n.xRaw,magnitude))),nativeConstants.frictionScaleRaw));force.yRaw=0;}
 else if(self.hasCollision&&force.yRaw>65&&self.mapFaces[1]){const sx=sign(magnitude===0?0:mul(n.xRaw,magnitude));const slide=floorSlideScaleRaw(floatingCount,forced);force.xRaw=add(force.xRaw,mul(mul(Math.abs(force.yRaw),sx),slide));force.yRaw=0;}
 return {force,redirectedUp};
}
// Aggregate calcF 0x18181b4c0, including forced X braking, player flag0 and Y clamp.
function calcF(c,players,infos,index){
 validatePlayers(players);const self=players[index];if(self.state===5)return {force:vec(),flags:self.flags,redirectedUp:false};
 let force=vec(),redirectedUp=false;
 if(index>0){const p=calcPairF(c,self,players[index-1],infos[index-1].prev.tension,infos[index].next.tension,infos[index].prev.floatingCount,c.forceMoves[index]>0);force=sum(force,p.force);if(p.redirectedUp!==null)redirectedUp=p.redirectedUp;}
 if(index+1<players.length){const p=calcPairF(c,self,players[index+1],infos[index].prev.tension,infos[index+1].next.tension,infos[index].next.floatingCount,c.forceMoves[index]>0);force=sum(force,p.force);if(p.redirectedUp!==null)redirectedUp=p.redirectedUp;}
 let flags=self.flags;
 if(self.hasActor){
  // imul low64, test mask -65536 then jge @0x18181b81c..823.
  if(c.forceMoves[index]>0&&int64(BigInt(self.vxRaw)*BigInt(force.xRaw))<0n&&Math.abs(self.vxRaw)<nativeConstants.minXRaw+Math.abs(force.xRaw))force.xRaw=mul(nativeConstants.minXRaw-Math.abs(self.vxRaw),sign(self.vxRaw));
  let zeroY=false;
  if(force.yRaw< -nativeConstants.minXRaw){
   if(self.hasCollision&&!self.contacted1)flags=(flags&~1)>>>0;
   if(redirectedUp&&self.vyRaw<force.yRaw)zeroY=true;
  }
  if(!zeroY&&force.yRaw< -65&&self.hasCollision&&self.contacted1&&force.yRaw+42598>0)zeroY=true; // QFP._0_65 @0x18181b9a2.
  if(zeroY)force.yRaw=0;
 }
 force.yRaw=mul(sign(force.yRaw),Math.min(Math.abs(force.yRaw),nativeConstants.resultYMaxRaw));
 return {force,flags,redirectedUp};
}
function createConstraintFacts(params){safeRaw(params.distanceRaw);safeRaw(params.gravityTensionRaw);return {...params,forceMoves:forceMoves()};}
// Pure full Update transaction. Event flags stay set if any player bit9 skips update.
function updateConstraint(c,players){
 validatePlayers(players);checkForceMoves(c.forceMoves);safeRaw(c.distanceRaw);safeRaw(c.gravityTensionRaw);
 if(players.some(p=>(p.flags&0x200)!==0))return {skipped:true,constraint:JSON.parse(JSON.stringify(c)),infos:[],players:JSON.parse(JSON.stringify(players)),moves:[]};
 const infos=players.map((p,i)=>p.state===5?{prev:{tension:vec(),floatingCount:0},next:{tension:vec(),floatingCount:0}}:{prev:calcPrevTension(c,players,i),next:calcNextTension(c,players,i)});
 const results=players.map((_,i)=>calcF(c,players,infos,i));
 const updated=players.map((p,i)=>p.state===5?{...p}:{...p,flags:results[i].flags});
 const moves=[];
 for(let i=0;i<players.length;i++){const p=players[i],f=results[i].force;if(p.state===5||!p.hasActor)continue;updated[i]={...updated[i],xRaw:add(p.xRaw,f.xRaw),yRaw:add(p.yRaw,f.yRaw),vxRaw:add(p.vxRaw,f.xRaw),vyRaw:add(p.vyRaw,f.yRaw)};
  moves.push({playerIndex:i,deltaRaw:{...f},directionRaw:NativeMath.normalizeRaw(f),moveContactMode:2});
 }
 return {skipped:false,constraint:{...c,forceMoves:forceMoves()},infos,results,players:updated,moves};
}
function compile(actors,count,options={}){const constraints=inspectActors(actors,count);if(constraints.length&&options.nativeConstraintFacts!==true)throw Error(refusal);return {schemaVersion:2,count,constraints:constraints.map(createConstraintFacts),completePhysicsFidelity:false};}
function validateState(s){if(!s||!Array.isArray(s.constraints))throw Error(refusal);for(const c of s.constraints){safeRaw(c.distanceRaw);safeRaw(c.gravityTensionRaw);checkForceMoves(c.forceMoves);}}
const create=c=>{validateState(c);return JSON.parse(JSON.stringify(c));};
function solids(s){validateState(s);return [];}
function beforeStep(s,ctx={}){
 validateState(s);if(!s.constraints.length)return {events:[],solids:[]};
 if(!Array.isArray(ctx.constraintPlayers)||typeof ctx.applyConstraintUpdate!=='function')throw Error('DistanceConstraint requires native constraintPlayers and applyConstraintUpdate contact-transport transaction');
 if(s.constraints.length!==1)throw Error('Multiple DistanceConstraint update order is unverified');
 if(ctx.constraintPlayers.length!==s.count)throw Error('DistanceConstraint native player count differs from compiled population');
 const current=createConstraintFacts(s.constraints[0]);current.forceMoves=s.constraints[0].forceMoves.slice();
 for(const e of ctx.events||[])if(e.broadcast===true||e.targetName===current.name||e.targetId===current.id||e.broadcastActorType===11)markForceMove(current.forceMoves,e);
 const update=updateConstraint(current,ctx.constraintPlayers);
 // Host applies the proposed position/velocity/flags and every mode2 transport in
 // native order, then returns true. Only a successful transaction clears flags.
 if(ctx.applyConstraintUpdate(update)!==true)throw Error('DistanceConstraint contact transport transaction was not committed');
 s.constraints[0]=update.constraint;return {events:[],solids:[],constraintUpdate:update};
}
function afterStep(s,ctx){validateState(s);return {events:[],deadPlayerIds:[]};}
function displays(s){validateState(s);return [];}
const integration=Object.freeze({status:'native core verified; playable registration requires exact host facts and mode2 transport',
 order:'Native OnUpdate snapshots all tensions, computes all forces, then applies all forces and clears event24 flags (0x18181a248, 0x18181a360/38b, 0x18181a4e6, 0x18181a5da..723). Do not update one player in place before computing the next tension.',
 contacts:'Requires PlayerComponent.IsFloating 0x1816bee20, Collision.GetContactCount 0x181695050, directional Collision.IsContactedMapOrRect 0x181692e20, actor positions/velocity and actor-index order. calcPrevTension walks preceding links; calcNextTension walks later links.',
 movement:'For each move in actor-index order add delta to CURRENT Actor position+0xb0 and velocity+0xf0, apply result.flags, then call mode2 moveContactActor 0x1816a0d40 with deltaRaw and directionRaw. Previous transport may change later actors, so update.players absolute values are pretransport previews and must not be assigned wholesale. clear forceMoves only after all transports. Host transaction returns true on commit.',
 events:'Event24 payload+0x20 is player actor index. Marks one of eight int flags; clear after force application. Other events delegate to ActorComponent.OnRecvEvent 0x18169e840.',
 dependencies:'st_w_09_04 still needs TopViewPlayer; st_w_02_01 needs StepEnemy and WarpAll; st_w_02_03 needs its remaining actors. No other device implementation is included.'});
return {compile,create,solids,beforeStep,afterStep,displays,supportedTypes,parameters,inspectActors,fpRaw,calcTension,calcPrevTension,calcNextTension,calcPairF,calcF,updateConstraint,createConstraintFacts,NativeMath,floorSlideScaleRaw,forceMoves,markForceMove,clearForceMoves,nativeConstants,integration,refusal,completePhysicsFidelity:false};
});
