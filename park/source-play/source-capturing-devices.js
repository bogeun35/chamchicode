/* CapturingTarget (actor 181) and CapturingConstraint (actor 180), 9-2,
 * reconstructed from the saved Ghidra project ('CapturingTargetComponent$$',
 * 'CapturingConstraintComponent$$') and capstone listings; no game executed.
 * Component offsets = quantum-field-offsets.json - 0x10.
 *
 * CapturingTarget:
 *  .cctor 0x1817eb750: COLLISION_RECT (24,24,-12,-12), WALL_SENCOR_DISTANCE "50",
 *   CIRCLE "360". Creator 0x1817ea9d0 / InitCollision: pushBack 1 (map only), layer 5.
 *  ParseParameter 0x1817eaaf0: slot0 Speed (per update, OnUpdate2 adds Velo),
 *   1 RestTime, 2 RestTimeRandom, 3 MoveDistance, 4 MoveDistanceRandom.
 *  OnStart 0x1817ead00: AddTarget on the ActorManager's constraint, CaptureTime
 *   copied from it.
 *  OnUpdate 0x1817eae10 (not disappeared, not captured): CapturingTimer -= 2 dt
 *   (floor 0) or += dt while capturing (cap CaptureTime); meter = timer/time;
 *   timer >= time -> captured, SetInactive 0x1817eb630 (Velo 0, collision off,
 *   anim 2, disappear); then updatePhase.
 *  updatePhase 0x1817eaf90: 0 CurrentRestTime = RestTime*(1+rand(-r,r)) (r > 0,
 *   floor 0; RestTime <= 0 keeps it), timer 0 -> 1 / 1 timer += dt; past the rest
 *   -> lotteryMoveDirection (RandomFP * 360 deg, EulerZ, rotate (0,1)),
 *   lotteryMoveDistance (as the rest time), counter 0 -> 2 / 2 checkTerrain
 *   0x1817eb4a0 (MapComponent.Move of collider 0 by dir*50 changed -> reverse),
 *   Velo = dir*Speed, counter += |Velo|; past the distance -> Velo 0,
 *   lotteryRestTime, timer 0 -> 1.
 *  Frame RNG (frame+0xc8, state +0xb8, inc +0xc0, PCG32 XSH-RR): RandomFP
 *   0x181747bc0 = pcg32 >> 16; range 0x181662020 = min + ((pcg32>>16)*(max-min)>>16).
 *
 * CapturingConstraint:
 *  .cctor 0x1817e3ba0: CONSTRAINT_OFFSET ("5","-14"), SPRING 3, FRICTION 2,
 *   TWO_PLAYER_PPD_LENGTH "40", PLAYER_PPD_LENGTH "1", UI_BASE_SCALE "9",
 *   UI_POSX "0", UI_POSY "420".
 *  ParseParameter 0x1817e14e0: QPlayerCountParam<FP> slot0 -> m_Distance,
 *   slot1 -> m_CaptureTime (8-byte entries, walk-down lookup); slot2 target name;
 *   slot3/4 UI pos, slot5 UI scale, slot6 == 1 hide-UI flag.
 *  OnUpdate 0x1817e1a40: updateConstraintForce, then (not all captured)
 *   udpateCapturingCheck; on the update everything is captured: event 61 to the
 *   target name (notifyTarget 0x1817e3ad0).
 *  updateConstraintForce 0x1817e1b90 / calcTension 0x1817e1f40: every player in a
 *   ring with its previous and next player index; per neighbour
 *   (calcPosAndForce 0x1817e3f30) n = normalize(d), len = sqrt, spring =
 *   n*max(0, len/Distance*SPRING - FRICTION), stretch = n*max(0, len-Distance);
 *   force = (springA+springB)/2 + (stretchA+stretchB)/2, all computed first and
 *   then added to Pos. A player in state 5 gets no force.
 *  udpateCapturingCheck 0x1817e2240: positions cached; checkCapturable
 *   0x1817e26f0 (4+ players: no two ring segments cross, isCrossing 0x1817e2900);
 *   each uncaptured target: SetIsCapturing(capturable && isCapturingTarget).
 *  isCapturingTarget 0x1817e2b00: 2 players calcCapturingLine (projection inside
 *   the segment and PPD < 40), 3 calcCapturingTriangle (min signed PPD >= 1;
 *   PPD outside a segment is INT64_MAX and the signed products wrap), else
 *   calcCapturingPolygon (sum of signed FPAcos angles, |sum| > 1 rad); positions
 *   are the cached player positions + CONSTRAINT_OFFSET.
 */
(function(root,factory){const c=typeof module==='object'&&module.exports;const api=factory(c?require('./source-distanceconstraint-math.js'):root.SourceDistanceConstraintMath,c?require('./source-fplut-math.js'):root.SourceFPLutMath);if(c)module.exports=api;root.SourceCapturingDevices=api;})(typeof globalThis!=='undefined'?globalThis:this,function(N,Lut){
'use strict';
const F=65536,DEG_RAD=1143;
const TARGET_RECT={heightRaw:24*F,widthRaw:24*F,xRaw:-12*F,yRaw:-12*F},WALL_SENSOR=50*F,CIRCLE=360*F;
const OFFSET={xRaw:5*F,yRaw:-14*F},SPRING=3*F,FRICTION=2*F,TWO_PPD=40*F,PPD=F,PI_RAW=0x32440;
const UI={baseScaleRaw:9*F,xRaw:0,yRaw:420*F};
const I64_MAX=0x7fffffffffffffffn;
const clone=v=>JSON.parse(JSON.stringify(v));
const allowed=(v,c)=>!v||v<0&&c<=-v||v>0&&v<10&&c>=v||v>=10&&c>=Math.trunc(v/10)&&c<=v%10;
const fp=v=>Math.trunc(Math.fround(Math.fround(v)*F));
const B=v=>BigInt(v),i64=v=>BigInt.asIntN(64,v),num=v=>{const n=Number(v);if(!Number.isSafeInteger(n))throw Error('Capturing raw outside safe range');return n;};
const mul=(a,b)=>num(i64(B(a)*B(b))>>16n);
const sq=v=>mul(v,v);
const sqrt=v=>N.sqrtRaw(B(v));
const sign=(a,b)=>{const d=a-b;return d<0?-F:(a===b||d<0)?0:F;};
function slotRaw(a,i){const d=(a.datas||[])[i];return d&&d.t===1?fp(d.f):0;}
// QPlayerCountParam<FP>: seven little-endian 8-byte entries (one char per byte
// minus 0x21, DeserializeFP), walk-down lookup from the population.
function fpTable(a,i){const d=(a.datas||[])[i];if(!d||d.t!==2||typeof d.s!=='string'||d.s.length!==56)return Array(7).fill(0);
 const t=[];for(let e=0;e<7;e++){let v=0n;for(let k=7;k>=0;k--)v=(v<<8n)|B(((d.s.charCodeAt(e*8+k)&0xff)-0x21)&0xff);t.push(num(BigInt.asIntN(64,v)));}return t;}
function findCount(t,count){if(count<2)return 0;for(let i=Math.min(count-2,6);i>=0;i--)if(t[i]!==0)return t[i];return 0;}
function compile(actors,count){
 if(!Number.isInteger(count)||count<2||count>8)throw Error('Capturing count 2..8 required');
 const targets=[],constraints=[];
 actors.forEach((raw,i)=>{const a=raw.properties||raw;if(!['CapturingTarget','CapturingConstraint'].includes(a.typeName)||!allowed(a.playerCount,count))return;
  if((raw.createThreshold??a.createThreshold??0)!==0)throw Error(a.typeName+' delayed creation ordering unresolved');
  const id=raw.id||'source:a'+i,xRaw=fp(a.posX??raw.x),yRaw=fp(a.posY??raw.y);
  if(a.typeName==='CapturingTarget')targets.push({id,name:a.name||'',type:'CapturingTarget',xRaw,yRaw,veloRaw:{xRaw:0,yRaw:0},phase:0,isCapturing:0,isCaptured:0,isDisappear:0,
   captureTimeRaw:0,meterRaw:0,capturingTimerRaw:0,currentMoveDistanceRaw:0,currentRestTimeRaw:0,moveDistanceRaw:slotRaw(a,3),moveDistanceCounterRaw:0,moveDistanceRandomRaw:slotRaw(a,4),
   restTimeRaw:slotRaw(a,1),restTimeRandomRaw:slotRaw(a,2),speedRaw:slotRaw(a,0),timerRaw:0,moveDirectionRaw:{xRaw:0,yRaw:0},collisionActive:true});
  else{const d=(a.datas||[])[2];constraints.push({id,name:a.name||'',type:'CapturingConstraint',distanceRaw:findCount(fpTable(a,0),count),captureTimeRaw:findCount(fpTable(a,1),count),
   targetName:d&&d.t===2?d.s||'':'',uiXRaw:UI.xRaw+slotRaw(a,3),uiYRaw:UI.yRaw+slotRaw(a,4),uiScaleRaw:Math.abs(slotRaw(a,5))>3?mul(slotRaw(a,5),UI.baseScaleRaw):0,hideUi:(slotRaw(a,6)>>16)===1,
   capturedCount:0,targetCount:0,anyCapturing:0,isCapturable:0,isCaptured:0,targetIds:[],forcesRaw:[]});}
 });
 if(constraints.length>1)throw Error('CapturingConstraint: ActorManager holds a single constraint');
 if(targets.length&&!constraints.length)throw Error('CapturingTarget needs the constraint (OnStart AddTarget)');
 // OnStart (registration order): AddTarget + CaptureTime
 for(const t of targets){constraints[0].targetIds.push(t.id);t.captureTimeRaw=constraints[0].captureTimeRaw;}
 // Frame RNG: the live seed is session data that is not in the binary, so the
 // stream starts where source-thorn-ceiling-devices.js starts it (Quantum's
 // documented default PCG32 state/increment), kept as decimal strings.
 return {schemaVersion:1,count,targets,constraints,rng:{state:'9600629759793949339',inc:'15726070495360670683'},completePhysicsFidelity:false};
}
const create=clone;
// ---- frame RNG --------------------------------------------------------------
const PCG_MULT=6364136223846793005n,MASK64=(1n<<64n)-1n;
function pcg32(rng){const old=B(rng.state);rng.state=((old*PCG_MULT+(B(rng.inc)|1n))&MASK64).toString();const x=Number(((old>>45n)^(old>>27n))&0xffffffffn),rot=Number((old>>59n)&31n);return ((x>>>rot)|(x<<((32-rot)&31)))>>>0;}
function randomFP(rng){return pcg32(rng)>>>16;}
function randomRange(rng,min,max){if(min>max){const t=min;min=max;max=t;}const x=pcg32(rng)>>>16;return num(i64(B(x)*B(max-min))>>16n)+min;}
// ---- target ------------------------------------------------------------------
function lotteryAround(rng,base,random){if(!(base>0))return null;if(!(random>0))return base;const v=mul(randomRange(rng,-random,random)+F,base);return v<0?0:v;}
// Quaternion.EulerZ 0x181644e70 (half angle) and rotate 0x181645b90 of (0,1,0):
// x = -(w*2z), y = 1 - z*2z (the same construction SearchLight's light uses).
function moveDirection(rng){const deg=mul(randomFP(rng),CIRCLE),rad=mul(deg,DEG_RAD),[z,w]=Lut.sincosRaw(rad>>1);return {xRaw:-mul(w,z*2),yRaw:F-mul(z,z*2)};}
/* host: {dtRaw, rng, terrainBlocked(target, deltaRaw) -> bool}. */
function targetUpdate(t,host){
 if(t.isDisappear||t.isCaptured)return;
 const dt=host.dtRaw;let timer=t.capturingTimerRaw;
 if(!t.isCapturing){timer-=num((B(dt)<<17n)>>16n);if(timer<1)timer=0;}
 else{timer+=dt;if(t.captureTimeRaw<=timer)timer=t.captureTimeRaw;}
 t.capturingTimerRaw=timer;
 let meter=0;if(t.captureTimeRaw>=1){meter=Number((B(timer)<<16n)/B(t.captureTimeRaw));if(meter<0)meter=0;else if(meter>F)meter=F;}t.meterRaw=meter;
 if(t.captureTimeRaw<=timer){t.isCaptured=1;t.isCapturing=0;setInactive(t);}
 targetPhase(t,host);
}
function setInactive(t){if(t.isDisappear)return;t.veloRaw={xRaw:0,yRaw:0};t.collisionActive=false;t.animation=2;t.isDisappear=1;}
function targetPhase(t,host){
 const dt=host.dtRaw;
 if(t.phase===0){if(t.restTimeRaw>0){t.currentRestTimeRaw=t.restTimeRandomRaw>0?Math.max(0,mul(randomRange(host.rng,-t.restTimeRandomRaw,t.restTimeRandomRaw)+F,t.restTimeRaw)):t.restTimeRaw;}t.timerRaw=0;t.phase=1;return;}
 if(t.phase===1){t.timerRaw+=dt;if(t.currentRestTimeRaw>=t.timerRaw)return;
  t.moveDirectionRaw=moveDirection(host.rng);const d=lotteryAround(host.rng,t.moveDistanceRaw,t.moveDistanceRandomRaw);if(d!==null)t.currentMoveDistanceRaw=d;
  t.phase=2;t.moveDistanceCounterRaw=0;return;}
 if(t.phase!==2)return;
 const dir=t.moveDirectionRaw,probe={xRaw:num(i64(B(dir.xRaw)*B(WALL_SENSOR))>>16n),yRaw:num(i64(B(dir.yRaw)*B(WALL_SENSOR))>>16n)};
 if(host.terrainBlocked(t,probe))t.moveDirectionRaw={xRaw:-dir.xRaw,yRaw:-dir.yRaw};
 const vx=mul(t.moveDirectionRaw.xRaw,t.speedRaw),vy=mul(t.moveDirectionRaw.yRaw,t.speedRaw);
 t.veloRaw={xRaw:vx,yRaw:vy};
 t.moveDistanceCounterRaw+=sqrt(mul(vx,vx)+mul(vy,vy));
 if(t.currentMoveDistanceRaw>=t.moveDistanceCounterRaw)return;
 t.veloRaw={xRaw:0,yRaw:0};
 const r=lotteryAround(host.rng,t.restTimeRaw,t.restTimeRandomRaw);if(r!==null)t.currentRestTimeRaw=r;
 t.timerRaw=0;t.phase=1;
}
// ---- constraint ----------------------------------------------------------------
function posAndForce(neighbour,self,distance){
 const dx=neighbour.xRaw-self.xRaw,dy=neighbour.yRaw-self.yRaw,n=N.normalizeRaw({xRaw:dx,yRaw:dy}),len=sqrt(sq(dx)+sq(dy));
 let k=mul(Number((B(len)<<16n)/B(distance)),SPRING)-FRICTION;if(k<0)k=0;
 const stretch=Math.max(0,len-distance);
 return {spring:{xRaw:mul(n.xRaw,k),yRaw:mul(n.yRaw,k)},stretch:{xRaw:mul(n.xRaw,stretch),yRaw:mul(n.yRaw,stretch)}};
}
const half=v=>num(i64(B(v)*0x8000n)>>16n);
/* players: [{state, xRaw, yRaw}] in actor-index order. Returns the forces. */
function constraintForces(c,players){
 const n=players.length;return players.map((p,i)=>{if(!p||p.state===5)return {xRaw:0,yRaw:0};
  const prev=players[i<1?n-1:(i-1)%n],next=players[(i+1)%n];if(!prev||!next)return {xRaw:0,yRaw:0};
  const a=posAndForce(prev,p,c.distanceRaw),b=posAndForce(next,p,c.distanceRaw);
  return {xRaw:half(b.spring.xRaw+a.spring.xRaw)+half(b.stretch.xRaw+a.stretch.xRaw),yRaw:half(a.spring.yRaw+b.spring.yRaw)+half(a.stretch.yRaw+b.stretch.yRaw)};});
}
function isCrossing(p1,p2,p3,p4){
 const d1x=p2.xRaw-p1.xRaw,d1y=p2.yRaw-p1.yRaw,d2x=p4.xRaw-p3.xRaw,d2y=p4.yRaw-p3.yRaw;
 if(mul(d2y,d1x)===mul(d2x,d1y))return false;
 const s1=sign(mul(p3.yRaw-p1.yRaw,d1x),mul(p3.xRaw-p1.xRaw,d1y)),s2=sign(mul(p4.yRaw-p1.yRaw,d1x),mul(p4.xRaw-p1.xRaw,d1y));
 const s3=sign(mul(d2x,p1.yRaw-p3.yRaw),mul(d2y,p1.xRaw-p3.xRaw)),s4=sign(mul(d2x,p2.yRaw-p3.yRaw),mul(d2y,p2.xRaw-p3.xRaw));
 return mul(s2,s1)<0&&s4*s3<0;
}
function capturable(c,pos){const n=pos.length;if(n===2||n===3)return true;
 for(let i=0;i<n;i++){const a=pos[i],b=pos[(i+1)%n];for(let j=0;j<n;j++){if(j===i)continue;if(isCrossing(a,b,pos[j],pos[(j+1)%n]))return false;}}return true;}
// projection parameter with the low 16 bits of each product cleared before the sum
function projT(a,d,p){const l=sq(d.yRaw)+sq(d.xRaw);if(l===0)return null;
 const m=~0xffffn,s=(i64(B(d.yRaw)*B(p.yRaw-a.yRaw))&m)+(i64(B(d.xRaw)*B(p.xRaw-a.xRaw))&m);return num(i64(s)/B(l));}
function ppdLength(a,b,p){
 const l2=sq(b.yRaw-a.yRaw)+sq(b.xRaw-a.xRaw);
 if(l2===0)return B(sqrt(sq(p.yRaw-a.yRaw)+sq(p.xRaw-a.xRaw)));
 const d={xRaw:b.xRaw-a.xRaw,yRaw:b.yRaw-a.yRaw},t=projT(a,d,p);let px=a.xRaw,py=a.yRaw;if(t!==null){px=a.xRaw+mul(d.xRaw,t);py=a.yRaw+mul(d.yRaw,t);}
 const L=sqrt(l2);
 if(L<sqrt(sq(py-a.yRaw)+sq(a.xRaw-px))||L<sqrt(sq(b.yRaw-py)+sq(b.xRaw-px)))return I64_MAX;
 return B(sqrt(sq(py-p.yRaw)+sq(px-p.xRaw)));
}
const wrapMul=(a,b)=>i64(i64(a*B(b))>>16n);// FP product of a possibly-huge distance, wrapping like the native imul
function inLine(pos,p){const a=pos[0],b=pos[1],d={xRaw:b.xRaw-a.xRaw,yRaw:b.yRaw-a.yRaw};let qx=b.xRaw,qy=b.yRaw;
 if(sq(d.yRaw)+sq(d.xRaw)!==0){const t=projT(a,d,p);qx=a.xRaw+mul(d.xRaw,t);qy=a.yRaw+mul(d.yRaw,t);}
 const l=sq(b.yRaw-a.yRaw)+sq(d.xRaw);
 if(!(sq(qy-a.yRaw)+sq(qx-a.xRaw)<=l&&sq(qy-b.yRaw)+sq(qx-b.xRaw)<=l))return false;
 return ppdLength(a,b,p)<B(TWO_PPD);}
function inTriangle(pos,p){const [a,b,c]=pos;
 const s0=sign(mul(b.yRaw-a.yRaw,a.xRaw-c.xRaw),mul(b.xRaw-a.xRaw,a.yRaw-c.yRaw));
 const s1=sign(mul(p.yRaw-a.yRaw,b.xRaw-a.xRaw),mul(p.xRaw-a.xRaw,b.yRaw-a.yRaw));
 const d1=wrapMul(wrapMul(ppdLength(a,b,p),s1),s0);
 const s2=sign(mul(p.yRaw-b.yRaw,c.xRaw-b.xRaw),mul(p.xRaw-b.xRaw,c.yRaw-b.yRaw));
 const d2=wrapMul(wrapMul(ppdLength(b,c,p),s2),s0);
 const s3=sign(mul(p.yRaw-c.yRaw,a.xRaw-c.xRaw),mul(p.xRaw-c.xRaw,a.yRaw-c.yRaw));
 const d3=wrapMul(wrapMul(ppdLength(c,a,p),s3),s0);
 let m=d1;if(d2<m)m=d2;if(d3<m)m=d3;return B(PPD)<=m;}
function inPolygon(pos,p){let sum=0;const n=pos.length;
 for(let i=0;i<n;i++){const ux=pos[i].xRaw-p.xRaw,uy=pos[i].yRaw-p.yRaw,vx=pos[(i+1)%n].xRaw-p.xRaw,vy=pos[(i+1)%n].yRaw-p.yRaw;
  const nu=N.normalizeRaw({xRaw:ux,yRaw:uy}),nv=N.normalizeRaw({xRaw:vx,yRaw:vy}),idx=mul(nu.xRaw,nv.xRaw)+mul(nu.yRaw,nv.yRaw)+F;
  if(idx<0||idx>0x20000)continue;let ang=Lut.acosRaw(idx-F);if(ang>=PI_RAW)continue;
  if(mul(vy,ux)-mul(vx,uy)<0)ang=-ang;sum+=ang;}
 return Math.abs(sum)>F;}
function isCapturingTarget(pos,p){return pos.length===2?inLine(pos,p):pos.length===3?inTriangle(pos,p):inPolygon(pos,p);}
/* players: [{xRaw,yRaw}] (cached Pos, actor-index order); targets by id.
 * Returns {captured:boolean (just now), events:[...]} */
function constraintCheck(c,players,targets){
 if(c.isCaptured)return {justCaptured:false,events:[]};
 const before=c.capturedCount,pos=players.map(p=>({xRaw:p.xRaw+OFFSET.xRaw,yRaw:p.yRaw+OFFSET.yRaw})),raw=players.map(p=>({xRaw:p.xRaw,yRaw:p.yRaw}));
 c.isCapturable=capturable(c,raw)?1:0;c.anyCapturing=0;
 const list=c.targetIds.map(id=>targets.find(t=>t.id===id)).filter(Boolean);
 c.targetCount=list.length;c.capturedCount=list.length;
 for(const t of list){if(t.isCaptured)continue;
  if(!c.isCapturable)t.isCapturing=0;else{const inside=isCapturingTarget(pos,{xRaw:t.xRaw,yRaw:t.yRaw});t.isCapturing=inside?1:0;if(inside)c.anyCapturing=1;}
  if(!t.isCaptured)c.capturedCount--;}
 c.isCaptured=c.targetCount===c.capturedCount?1:0;
 const events=[];
 if(c.isCaptured&&c.targetName)events.push({eventType:61,targetName:c.targetName,senderId:c.id});
 return {justCaptured:!!c.isCaptured,newlyCaptured:c.capturedCount!==before,events};
}
function targetRect(t){return {xRaw:t.xRaw+TARGET_RECT.xRaw,yRaw:t.yRaw+TARGET_RECT.yRaw,widthRaw:TARGET_RECT.widthRaw,heightRaw:TARGET_RECT.heightRaw};}
function displays(state){const c=state.constraints[0]||null;return {targets:state.targets.map(t=>({id:t.id,x:t.xRaw/F,y:t.yRaw/F,meter:t.meterRaw/F,capturing:!!t.isCapturing,captured:!!t.isCaptured,gone:!!t.isDisappear,dx:t.moveDirectionRaw.xRaw/F,dy:t.moveDirectionRaw.yRaw/F,moving:t.phase===2})),
 constraint:c&&{captured:c.capturedCount,total:c.targetCount,capturable:!!c.isCapturable,any:!!c.anyCapturing,done:!!c.isCaptured,distance:c.distanceRaw/F,offset:{x:OFFSET.xRaw/F,y:OFFSET.yRaw/F},hideUi:c.hideUi}};}
return {compile,create,targetUpdate,constraintForces,constraintCheck,targetRect,displays,isCrossing,capturable,isCapturingTarget,ppdLength,pcg32,randomFP,randomRange,moveDirection,fpTable,findCount,
 supportedTypes:['CapturingTarget','CapturingConstraint'],nativeConstants:{TARGET_RECT,WALL_SENSOR,CIRCLE,OFFSET,SPRING,FRICTION,TWO_PPD,PPD,UI},completePhysicsFidelity:false};
});
