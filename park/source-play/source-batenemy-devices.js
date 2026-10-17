/* BatEnemy (actor 156) and FallingCage (actor 182), reconstructed from the saved
 * Ghidra project (tools/ghidra/decompile.sh 'BatEnemyComponent$$' /
 * 'FallingCageComponent$$') and capstone listings; no game executed.
 *
 * BatEnemy, component offsets = quantum-field-offsets.json - 0x10:
 *  .cctor 0x1816bb860: COLLISION_RECT (H,W,X,Y) = (40,28,-14,-40);
 *   DETECT_TIME = QFP._0_20 (13107); SEARCH_LIGHT_SMOOTH = FP "10"
 *   (literal slot 0x18319e180, 655360); SEARCH_LEVEL = QFP._0_90 ("0.9", 58982).
 *  ParseParameter 0x1816b9370: slot0 low dword >>16 -> m_Direction byte;
 *   slot1 m_Speed, slot2 m_SearchRange, slot3 m_SearchAngle, slot4 m_AttackSpeed,
 *   slot5 m_ShadowHeightOffset; AttackSpeed <= 0 -> Speed * QFP._2;
 *   slot11 (raw >> 16) == 1 -> m_PathLoop; slots 12.. path (UnpackVector2ArrayParam
 *   start 12, max 10); m_ShadowOffset01 = 1.0.
 *  InitCollision 0x1816b9930: CreateCollision(rect, pushBack 0, sync 1), layer 8.
 *  InitPost 0x1816b9a10: creates a SearchLight (ordinal 0x6a) through
 *   SearchLight.Initialize 0x1816f09f0(rotation 0, angle = SearchAngle,
 *   range = SearchRange): criteria 1.0, bright 1.0, dark 0, KillPlayerOff 1;
 *   then criteria = SEARCH_LEVEL. Look/target-look = (0,1),(0,-1),(-1,0),(1,0)
 *   for direction 0..3 (the first update re-targets them, see below).
 *  OnUpdate 0x1816b9df0: facing from m_CollisionVelo (> 3 raw on an axis):
 *   |y| < |x| -> x<0: 2, x>0: 3; else y<0: 0, y>0: 1. Then updateSpotLight and
 *   (tail jump) updatePhase.
 *  updateSpotLight 0x1816ba100: target look = normalize(CollisionVelo), or
 *   QDirectionVector[direction] (.cctor 0x181786550: (0,-1),(0,1),(-1,0),(1,0))
 *   when both components are < 4 raw; dot(target, look) < -0xc000 snaps (light
 *   MulBrightness 0) else look = normalize(look + (target-look)*clamp(dt*10,0,1))
 *   (MulBrightness 1); light direction = (look.x, -look.y); light position =
 *   (pos.x + look.x*H/2, pos.y - H/2 + look.y*H/2) with H/2 = 20 (SetPosForce).
 *  updatePhase 0x1816ba610: path patrol (only when the QLinePath has points),
 *   searchingPlayer, then phase 0 patrol / 1 found (alert QFP._0_30, then chase:
 *   Velo = normalize(target - pos) * AttackSpeed, per update - OnUpdate2 adds
 *   Velo without dt) / 2 hidden-target wait QFP._2 / 3 return at
 *   dt * Speed * QGameDefine[0] (48, .cctor 0x181780766); ShadowOffset01 -= dt
 *   while chasing a live target, += dt in phases 0 and 3, clamped 0..1.
 *  searchingPlayer 0x1816bb100: per player index: skipped (timer 0) when player
 *   flag 0x80000 or not SearchLight.IsPlayerInside; inside -> flag 0x8000,
 *   timer += dt, timer >= DETECT_TIME -> target (if none), timer = DETECT_TIME,
 *   return found. Two or more inside without a detection reset the timer of
 *   every player without flag 0x40000 (Player.DisableEquipCardboard).
 *  OnCollided 0x1816bb630: other collider layer 1 and holder index 1
 *   (Collision byte +4, written by ActorComponent.setupCollision 0x18169f93a)
 *   -> event 43 to that actor.
 *  Capture 0x1816bb6d0: Pos = given, actor flag 0x400000, SetPause, collision
 *   off, m_Flags |= 3; light bright 0, dark 1.0.
 *  PlayerComponent.IsAlive 0x1816bff90: !(flags & 0x200) && state != 5.
 *
 * FallingCage:
 *  Initialize 0x180c68db0: NeedSwitchCount 1. ParseParameter 0x1818464a0:
 *   QPlayerCountParam<int> slot0 (DeserializeInt 0x180970770) found for the
 *   player count (Find 0x181786950) replaces it when > 0.
 *  .cctor 0x181846fb0: START_OFFSET_Y -400, RETURN_ACCEL 500, COLLISION_RECT
 *   (64,68,-34,-64), COLLISION_RECT2 (12,64,-32,-26).
 *  InitCollision 0x181846550: CreateCollision(rect, pushBack 0, sync 1), layer 14.
 *  OnStart 0x181846630: collision off, CageY = START_OFFSET_Y.
 *  OnUpdate/updatePhase 0x181846770: 0 waits for flag 2 -> flag 1, CageY -400,
 *   speed 1000 (0x3e80000) / 1 CageY += dt*speed, >= 0: CageY 0, collision on,
 *   SE 11, shake QFP._0_15, timer = OneFrame*QFP._4 (4368) / 2 timer -= dt,
 *   <= 0: collision off unless captured / 3 waits while captured (flag 4) or
 *   switched (flag 2), then speed 0 / 4 speed += dt*500, CageY -= dt*speed,
 *   <= -400: phase 0, flag 1 off. Shadow alpha = (|CageY+400|/400)^8 * 0.5 + 0.5.
 *  OnRecvEvent 0x181846c60: 61 counts up (flag 2 at NeedSwitchCount), 60 counts
 *   down (flag 2 off below it); others go to the common actor handler.
 *  OnCollided 0x181846d50: not captured, other layer 8, actor type 0x9c, bat not
 *   captured -> Bat.Capture(cage pos - (0, QFP._4)), event 1 to every actor of
 *   type 0x11 (Key), own collision pushBackTarget 2 and COLLISION_RECT2, flag 4.
 */
(function(root,factory){const c=typeof module==='object'&&module.exports;const api=factory(c?require('./source-distanceconstraint-math.js'):root.SourceDistanceConstraintMath,c?require('./source-updownlift-math.js'):root.SourceUpDownLiftMath,c?require('./source-linepathgear-path.js'):root.SourceLinePathGearPath);if(c)module.exports=api;root.SourceBatEnemyDevices=api;})(typeof globalThis!=='undefined'?globalThis:this,function(N,SinMath,LinePath){
'use strict';
const F=65536;
const BAT_RECT={heightRaw:40*F,widthRaw:28*F,xRaw:-14*F,yRaw:-40*F};
const DETECT=13107,SMOOTH=655360,LEVEL=58982,ALERT=19660,HIDE=2*F,GAME_DEFINE0=48*F,DOT_SNAP=-0xc000;
const DIR_VECTOR=[{xRaw:0,yRaw:-F},{xRaw:0,yRaw:F},{xRaw:-F,yRaw:0},{xRaw:F,yRaw:0}];
const INIT_LOOK=[{xRaw:0,yRaw:F},{xRaw:0,yRaw:-F},{xRaw:-F,yRaw:0},{xRaw:F,yRaw:0}];
const CAGE_RECT={heightRaw:64*F,widthRaw:68*F,xRaw:-34*F,yRaw:-64*F},CAGE_RECT2={heightRaw:12*F,widthRaw:64*F,xRaw:-32*F,yRaw:-26*F};
const START_Y=-400*F,RETURN_ACCEL=500*F,FALL_SPEED=0x3e80000,LAND_TIME=4368,QFP_4=4*F,QFP_0_50=32768,DEG_RAD=1143;
const clone=v=>JSON.parse(JSON.stringify(v));
const allowed=(v,c)=>!v||v<0&&c<=-v||v>0&&v<10&&c>=v||v>=10&&c>=Math.trunc(v/10)&&c<=v%10;
const raw=v=>{if(!Number.isSafeInteger(v))throw Error('BatEnemy native safe raw required');return v;};
const mul=(a,b)=>raw(Number(BigInt.asIntN(64,BigInt(raw(a))*BigInt(raw(b)))>>16n));
const fp=v=>Math.trunc(Math.fround(Math.fround(v)*F));
const abs=Math.abs;
function slotRaw(a,i){const d=(a.datas||[])[i];return d&&d.t===1?fp(d.f):0;}
// QPlayerCountParam<int>: seven little-endian dwords, one char per byte minus 0x21
// (DeserializeInt 0x180970770); a wrong length gives an all-zero table.
function countTable(a,i){const d=(a.datas||[])[i];if(!d||d.t!==2||typeof d.s!=='string'||d.s.length!==28)return Array(7).fill(0);
 const t=[];for(let e=0;e<7;e++){let v=0;for(let b=3;b>=0;b--)v=v*256+(((d.s.charCodeAt(e*4+b)&0xff)-0x21)&0xff);t.push(v|0);}return t;}
function findCount(t,count){if(count<2)return 0;for(let i=Math.min(count-2,6);i>=0;i--)if(t[i]!==0)return t[i];return 0;}
function compile(actors,count,options={}){
 if(!Number.isInteger(count)||count<2||count>8)throw Error('BatEnemy count 2..8 required');
 const bats=[],cages=[];
 actors.forEach((rawActor,i)=>{const a=rawActor.properties||rawActor;if(!['BatEnemy','FallingCage'].includes(a.typeName)||!allowed(a.playerCount,count))return;
  if((rawActor.createThreshold??a.createThreshold??0)!==0)throw Error(a.typeName+' delayed creation ordering unresolved');
  const id=rawActor.id||'source:a'+i,xRaw=fp(a.posX??rawActor.x),yRaw=fp(a.posY??rawActor.y);
  if(a.typeName==='FallingCage'){
   const need=findCount(countTable(a,0),count);
   cages.push({id,name:a.name||'',type:'FallingCage',xRaw,yRaw,needSwitchCount:need>0?need&0xff:1,switchCount:0,phase:0,flags:0,
    cageYRaw:START_Y,speedRaw:0,timerRaw:0,shadowAlphaRaw:0,collisionActive:false,pushBackTarget:0,rect:{...CAGE_RECT},landed:0});
   return;
  }
  // Path points: UnpackVector2ArrayParam 0x181786800 reads (x, y) float slot
  // pairs from 12, at most 10, and stops at the first (0, 0). Creator 0x1816b9090
  // then builds the entity's QLinePath from them (Initialize 0x1816dcf60): the
  // path starts at the origin, m_TotalLength sums native-sqrt segment lengths,
  // m_TotalLengthWS is the length through the camera view matrix
  // (source-linepathgear-path.js has the same verified numeric core).
  const points=[];for(let k=12;k+1<32&&points.length<10;k+=2){const x=slotRaw(a,k),y=slotRaw(a,k+1);if(x===0&&y===0)break;points.push({xRaw:x,yRaw:y});}
  const pathLoop=(slotRaw(a,11)>>16)===1;
  if(points.length&&pathLoop)throw Error('BatEnemy looped QLinePath (closing segment) not verified');
  const path=points.length?LinePath.compilePath(points,options.chipSize):null;
  const s0=(a.datas||[])[0],dirRaw=s0&&s0.t===1?fp(s0.f):0,direction=((dirRaw>>>0)>>>16)&0xff;
  if(direction>3)throw Error('BatEnemy direction byte outside the QDirectionVector table');
  const speed=slotRaw(a,1),range=slotRaw(a,2),angle=slotRaw(a,3);let attack=slotRaw(a,4);if(attack<=0)attack=mul(speed,2*F);
  const look=INIT_LOOK[direction];
  bats.push({id,name:a.name||'',type:'BatEnemy',initXRaw:xRaw,initYRaw:yRaw,xRaw,yRaw,preXRaw:xRaw,preYRaw:yRaw,veloRaw:{xRaw:0,yRaw:0},collisionVeloRaw:{xRaw:0,yRaw:0},
   direction,phase:0,flags:0,isReturn:0,pathLoop,path,speedRaw:speed,searchRangeRaw:range,searchAngleRaw:angle,attackSpeedRaw:attack,
   shadowHeightRaw:slotRaw(a,5),shadowOffsetRaw:F,idleTimerRaw:0,patrolTimerRaw:0,timerRaw:0,targetId:null,playerTimersRaw:Array(8).fill(0),
   lookRaw:{...look},targetLookRaw:{...look},patrolRaw:{xRaw:0,yRaw:0},drawOffsetRaw:{xRaw:0,yRaw:0},animation:0,paused:false,collisionActive:true,
   light:{xRaw,yRaw,worldDirectionRaw:{xRaw:0,yRaw:-F},rangeRaw:range,angleRaw:angle,criteriaRaw:LEVEL,brightRaw:F,darkRaw:0,mulBrightnessRaw:F,phase:0,timerRaw:0,alphaRaw:0}});
 });
 if(bats.length&&!(options.chipSize>0))throw Error('BatEnemy SearchLight needs the native camera chip size');
 return {schemaVersion:1,count,chipSize:options.chipSize||0,bats,cages,completePhysicsFidelity:false};
}
const create=clone;
// SearchLight.IsInside: radius range*criteria (strict), cone threshold
// Sin((90 - angle*criteria/2) deg) through the full FP sine table, strict dot.
function lightInsidePoint(l,chip,p){
 const dx=p.xRaw-l.xRaw,dy=p.yRaw-l.yRaw,radius=mul(l.rangeRaw,l.criteriaRaw);
 if(mul(dx,dx)+mul(dy,dy)>=mul(radius,radius))return false;
 const dir=N.normalizeRaw({xRaw:mul(l.worldDirectionRaw.xRaw,chip*F),yRaw:mul(l.worldDirectionRaw.yRaw,-chip*F)}),n=N.normalizeRaw({xRaw:dx,yRaw:dy});
 const half=Number(BigInt(mul(l.angleRaw,l.criteriaRaw))>>1n),threshold=SinMath.sinRaw(mul(90*F-half,DEG_RAD));
 return mul(dir.xRaw,n.xRaw)+mul(dir.yRaw,n.yRaw)>threshold;
}
function lightInsideRect(l,chip,r){return [[r.xRaw,r.yRaw],[r.xRaw,r.yRaw+r.heightRaw],[r.xRaw+r.widthRaw,r.yRaw],[r.xRaw+r.widthRaw,r.yRaw+r.heightRaw]].some(([xRaw,yRaw])=>lightInsidePoint(l,chip,{xRaw,yRaw}));}
function updateSpotLight(b,dtRaw){
 let t=N.normalizeRaw(b.collisionVeloRaw);
 if(abs(t.xRaw)<4&&abs(t.yRaw)<4)t={...DIR_VECTOR[b.direction]};
 b.targetLookRaw=t;const l=b.lookRaw;
 if(mul(t.yRaw,l.yRaw)+mul(t.xRaw,l.xRaw)<DOT_SNAP){b.lookRaw={...t};b.light.mulBrightnessRaw=0;}
 else{const k=Math.max(0,Math.min(F,mul(dtRaw,SMOOTH)));b.lookRaw=N.normalizeRaw({xRaw:l.xRaw+mul(t.xRaw-l.xRaw,k),yRaw:l.yRaw+mul(t.yRaw-l.yRaw,k)});b.light.mulBrightnessRaw=F;}
 b.light.worldDirectionRaw={xRaw:b.lookRaw.xRaw,yRaw:-b.lookRaw.yRaw};
 const half=Number((BigInt(BAT_RECT.heightRaw)<<16n)>>17n);
 b.light.xRaw=b.xRaw+mul(b.lookRaw.xRaw,half);b.light.yRaw=b.yRaw-half+mul(b.lookRaw.yRaw,half);
}
// players: [{index, id, flags, alive, cardboard, xRaw, yRaw, collisionRaw}] in actor-index order.
function searchingPlayer(b,players,dtRaw,chip){
 let inside=0;
 for(const p of players){
  if((p.flags&0x80000)||!p.collisionRaw||!lightInsideRect(b.light,chip,p.collisionRaw)){b.playerTimersRaw[p.index]=0;continue;}
  inside++;p.spotted=true;b.playerTimersRaw[p.index]+=dtRaw;
  if(b.playerTimersRaw[p.index]<DETECT)continue;
  if(b.targetId===null)b.targetId=p.id;b.playerTimersRaw[p.index]=DETECT;return true;
 }
 if(inside>=2)for(const p of players)if(!(p.flags&0x40000))b.playerTimersRaw[p.index]=0;
 return false;
}
/* One BatEnemy update (OnUpdate + updatePhase; the caller then runs post()).
 * ctx: {dtRaw, chipSize, players}. Returns {spotted:[ids], shake:bool}. */
function update(b,ctx){
 if(b.paused)return {spotted:[]};
 const dt=ctx.dtRaw??1092,players=ctx.players||[],cv=b.collisionVeloRaw;
 b.preXRaw=b.xRaw;b.preYRaw=b.yRaw;
 if(abs(cv.xRaw)>3||abs(cv.yRaw)>3){const n=N.normalizeRaw(cv);
  if(abs(n.yRaw)<abs(n.xRaw)){if(n.xRaw<0)b.direction=2;else if(n.xRaw>0)b.direction=3;}
  else{if(n.yRaw<0)b.direction=0;else if(n.yRaw>0)b.direction=1;}}
 b.animation=b.direction+1;
 updateSpotLight(b,dt);
 // updatePhase 0x1816ba719..ba808: the patrol advances in every phase. Idle
 // (1.0 s at an end) counts down first; ratio = PatrolTimer / max(TotalLengthWS,
 // 0x28f) clamped 0..1; a one-way path flips m_IsReturn at the end and plays
 // backwards while it is set.
 if(b.path&&b.path.totalLengthRaw>0){
  if(b.idleTimerRaw>0)b.idleTimerRaw-=dt;
  else{b.patrolTimerRaw+=mul(dt,b.speedRaw);const denom=Math.max(b.path.totalLengthWSRaw,0x28f);
   let ratio=Number((BigInt(b.patrolTimerRaw)<<16n)/BigInt(denom));if(ratio<0)ratio=0;else if(ratio>F)ratio=F;
   if(!b.pathLoop){const back=b.isReturn;if(ratio===F){b.patrolTimerRaw=0;b.idleTimerRaw=F;b.isReturn=back===0?1:0;}if(back!==0)ratio=F-ratio;}
   else if(ratio===F)b.patrolTimerRaw=0;
   b.patrolRaw=LinePath.pathPosition(b.path,ratio);}
 }
 const found=searchingPlayer(b,players,dt,ctx.chipSize);
 const spotted=players.filter(p=>p.spotted).map(p=>p.id);
 const targetOf=()=>b.targetId===null?null:players.find(p=>p.id===b.targetId)||null;
 b.shake=false;
 switch(b.phase){
 case 0:
  if(found){b.phase=1;b.timerRaw=ALERT;}
  if(b.idleTimerRaw<=0&&(b.patrolRaw.xRaw!==0||b.patrolRaw.yRaw!==0)){b.xRaw=b.initXRaw+b.patrolRaw.xRaw;b.yRaw=b.initYRaw+b.patrolRaw.yRaw;}
  break;
 case 1:
  if(b.timerRaw<=0){const target=targetOf();
   // 0x1816babaf / 0x1816bad4f..ada7: no target, or a target under cardboard
   // (phase 2, target cleared, Velo 0, timer QFP._2), returns before the shadow.
   if(!target)return {spotted};
   if(target.cardboard){b.phase=2;b.targetId=null;b.veloRaw={xRaw:0,yRaw:0};b.timerRaw=HIDE;return {spotted};}
   if(!target.alive)b.veloRaw={xRaw:0,yRaw:0};
   else{const n=N.normalizeRaw({xRaw:target.xRaw-b.xRaw,yRaw:target.yRaw-b.yRaw});b.veloRaw={xRaw:mul(n.xRaw,b.attackSpeedRaw),yRaw:mul(n.yRaw,b.attackSpeedRaw)};target.spotted=true;}
  }else{b.shake=true;b.timerRaw-=dt;}
  break;
 case 2:{
  let toShadow=false;
  if(b.timerRaw>0){b.timerRaw-=dt;if(b.timerRaw<=0){b.phase=3;toShadow=true;}}
  if(!toShadow){const target=targetOf();if((target&&!target.cardboard)||found){b.phase=1;b.timerRaw=ALERT;}}
  break;}
 default:{
  const step=mul(mul(dt,b.speedRaw),GAME_DEFINE0),dx=b.initXRaw+b.patrolRaw.xRaw-b.xRaw,dy=b.initYRaw+b.patrolRaw.yRaw-b.yRaw,n=N.normalizeRaw({xRaw:dx,yRaw:dy});
  b.xRaw+=mul(n.xRaw,step);b.yRaw+=mul(n.yRaw,step);
  if(N.lengthRaw({xRaw:dx,yRaw:dy})<=step){b.phase=0;b.timerRaw=0;b.xRaw=b.initXRaw+b.patrolRaw.xRaw;b.yRaw=b.initYRaw+b.patrolRaw.yRaw;}
  else if(found){b.phase=1;b.timerRaw=ALERT;}}
 }
 // 0x1816baa20..aa5b, on the phase AFTER the switch: 1 lowers the shadow while
 // a live target is chased, 0 and 3 raise it, 2 leaves it; clamp 0..1.
 if(b.phase===1){const target=targetOf();if(b.timerRaw<=0&&target&&target.alive)b.shadowOffsetRaw-=dt;}
 else if(b.phase===0||b.phase===3)b.shadowOffsetRaw+=dt;
 b.shadowOffsetRaw=Math.max(0,Math.min(F,b.shadowOffsetRaw));
 return {spotted};
}
// ActorComponent OnUpdate2 / OnPost2: Pos += Velo, CollisionVelo = Pos - PrePos
// (no pushback: pushBackTarget 0).
function post(b){if(b.paused)return;b.xRaw+=b.veloRaw.xRaw;b.yRaw+=b.veloRaw.yRaw;b.collisionVeloRaw={xRaw:b.xRaw-b.preXRaw,yRaw:b.yRaw-b.preYRaw};}
// SearchLight (bright 1.0 / dark 0 until captured) keeps its own phase/fade: only
// what decides visibility is kept here - the dark switch after a capture.
function lightUpdate(b,dtRaw){const l=b.light;if(l.brightRaw===0&&l.darkRaw===0)return;
 if(l.phase===0){l.timerRaw=l.brightRaw;l.phase=1;l.alphaRaw=F;return;}
 if(l.phase===1){if(l.darkRaw===0)return;l.timerRaw-=dtRaw;if(l.timerRaw>0)return;l.phase=2;return;}
 if(l.phase===2){l.timerRaw=l.darkRaw;l.phase=3;l.alphaRaw=0;}}
function cageUpdate(c,dtRaw){
 const out={landed:false};
 switch(c.phase){
 case 0:if(!(c.flags&2))break;c.flags|=1;c.cageYRaw=START_Y;c.speedRaw=FALL_SPEED;c.phase++;break;
 case 1:c.cageYRaw+=mul(dtRaw,c.speedRaw);if(c.cageYRaw<0)break;c.cageYRaw=0;c.collisionActive=true;c.timerRaw=LAND_TIME;out.landed=true;c.landed++;c.phase++;break;
 case 2:c.timerRaw-=dtRaw;if(c.timerRaw>0)break;if(!(c.flags&4))c.collisionActive=false;c.phase++;break;
 case 3:if((c.flags&4)||(c.flags&2))break;c.speedRaw=0;c.phase++;break;
 case 4:c.speedRaw+=mul(dtRaw,RETURN_ACCEL);c.cageYRaw-=mul(dtRaw,c.speedRaw);if(c.cageYRaw<=START_Y){c.cageYRaw=START_Y;c.phase=0;c.flags&=~1;}break;
 }
 const d=abs(c.cageYRaw-START_Y),r=Number((BigInt(d)<<16n)/BigInt(abs(START_Y)));let p=r;for(let i=0;i<7;i++)p=mul(p,r);
 c.shadowAlphaRaw=mul(p,QFP_0_50)+QFP_0_50;
 return out;
}
function cageReceiveEvent(c,type){
 if(type===61){if(c.switchCount<c.needSwitchCount){c.switchCount++;if(c.needSwitchCount<=c.switchCount)c.flags|=2;}return true;}
 if(type===60){if(c.switchCount>0){c.switchCount--;if(c.switchCount<c.needSwitchCount)c.flags&=~2;}return true;}
 return false;
}
const rectAt=(xRaw,yRaw,r)=>({xRaw:xRaw+r.xRaw,yRaw:yRaw+r.yRaw,widthRaw:r.widthRaw,heightRaw:r.heightRaw});
const hit=(a,b)=>a.xRaw<b.xRaw+b.widthRaw&&a.xRaw+a.widthRaw>b.xRaw&&a.yRaw<b.yRaw+b.heightRaw&&a.yRaw+a.heightRaw>b.yRaw;
function batRect(b){return rectAt(b.xRaw,b.yRaw,BAT_RECT);}
function cageRect(c){return rectAt(c.xRaw,c.yRaw,c.rect);}
/* The collision pass: every contact found against the pre-callback state, then
 * the callbacks. players: [{id, collisionRaw (holder index 1)}].
 * Returns {kills:[playerIds], captures:[{cageId,batId}], keyEvents:[...]}. */
function collide(state,players){
 const kills=[],captures=[],keyEvents=[];
 const batContacts=[];for(const b of state.bats)if(b.collisionActive)for(const p of players)if(p.collisionRaw&&hit(batRect(b),p.collisionRaw))batContacts.push({batId:b.id,playerId:p.id});
 const cageContacts=[];for(const c of state.cages)if(c.collisionActive&&!(c.flags&4))for(const b of state.bats)if(b.collisionActive&&hit(cageRect(c),batRect(b)))cageContacts.push({cageId:c.id,batId:b.id});
 for(const k of batContacts)if(!kills.includes(k.playerId))kills.push(k.playerId);
 for(const k of cageContacts){const c=state.cages.find(x=>x.id===k.cageId),b=state.bats.find(x=>x.id===k.batId);
  if(c.flags&4||b.flags&2)continue;
  capture(b,{xRaw:c.xRaw,yRaw:c.yRaw-QFP_4});
  keyEvents.push({eventType:1,broadcastActorType:17,senderId:c.id});
  c.pushBackTarget=2;c.rect={...CAGE_RECT2};c.flags|=4;captures.push(k);}
 return {kills,captures,keyEvents};
}
function capture(b,pos){b.xRaw=pos.xRaw;b.yRaw=pos.yRaw;b.preXRaw=pos.xRaw;b.preYRaw=pos.yRaw;b.paused=true;b.collisionActive=false;b.flags|=3;b.veloRaw={xRaw:0,yRaw:0};b.light.brightRaw=0;b.light.darkRaw=F;}
// A captured cage (pushBackTarget 2, COLLISION_RECT2) is a solid for layers 1/2/8.
function solids(state){return state.cages.filter(c=>c.collisionActive&&c.pushBackTarget&2).map(c=>{const r=cageRect(c);return {id:c.id,type:'FallingCage',x:r.xRaw/F,y:r.yRaw/F,w:r.widthRaw/F,h:r.heightRaw/F};});}
function displays(state){return {bats:state.bats.map(b=>({id:b.id,x:b.xRaw/F,y:b.yRaw/F,direction:b.direction,phase:b.phase,captured:!!(b.flags&2),shadowOffset:b.shadowOffsetRaw/F,shadowHeight:b.shadowHeightRaw/F,
  light:{x:b.light.xRaw/F,y:b.light.yRaw/F,dx:b.lookRaw.xRaw/F,dy:b.lookRaw.yRaw/F,range:mul(b.light.rangeRaw,b.light.criteriaRaw)/F,halfAngle:mul(b.light.angleRaw,b.light.criteriaRaw)/F/2,on:b.light.phase<2&&b.light.brightRaw>0,brightness:b.light.mulBrightnessRaw/F}})),
 cages:state.cages.map(c=>({id:c.id,x:c.xRaw/F,y:c.yRaw/F,offsetY:c.cageYRaw/F,shadowAlpha:c.shadowAlphaRaw/F,phase:c.phase,captured:!!(c.flags&4),need:c.needSwitchCount,count:c.switchCount}))};}
/* Cardboard (actor 154), created by the TopViewPlayer factory for a player
 * whose slot8 is 0 (no Player flag 0x40000), CardboardComponent from the saved
 * Ghidra project:
 *  Creator 0x1817ebcd0: ColorIndex 8, m_Player = the player. InitCollision
 *   0x1817ebf60: COLLISION_RECTS (.cctor 0x1817ed5e0) (128,120,-60,-132) and
 *   (72,146,-73,-72), pushBack 0, layer 2. InitPost 0x1817ec1a0: m_Flags |= 5
 *   (1 personal, 4 follow), collision and display off, PlayerIndex = the
 *   player's m_PlayerIndex.
 *  OnUpdate 0x1817ec300: 0 equips on checkStartEquip 0x1817ed470 (alive, not
 *   equipped, not flagged 0x8000 by a bat this update, Shot (button 9) pressed
 *   this frame - IsPressInput 0x1816be4c0 is down == current) / 1 after
 *   ANIM_TIME (QFP._0_25) checkRemove 0x1817ec8e0 (dead, 0x8000 or Shot pressed)
 *   or checkMove (animation only) / 2 remove 0x1817ecb70 (player 0x80000 off,
 *   collision off, OffsetY = BACK_OFFSET_Y = -QFP._0_10, timer ANIM_TIME) /
 *   3 timer, remove2 0x1817ecde0 (display off) -> 0. Every update then covers
 *   each other top-view (state 9) player whose collider 0 lies strictly inside
 *   rect 0 (or, failing that, rect 1) while collider 0 is active:
 *   PlayerComponent.CoverCardboard 0x1816cb6c0 sets/clears bit PlayerIndex of
 *   the covered byte. equipCardboard 0x1817ec600: display on, OffsetY =
 *   FRONT_OFFSET_Y 48, timer ANIM_TIME, collision on, player flag 0x80000.
 *  OnPost 0x1817ed3b0: following -> Pos = player Pos + (0, OffsetY).
 *  An equipped or covered top-view player does not walk (Default 0x1816ca190).
 */
const CB_RECTS=[{heightRaw:128*F,widthRaw:120*F,xRaw:-60*F,yRaw:-132*F},{heightRaw:72*F,widthRaw:146*F,xRaw:-73*F,yRaw:-72*F}];
const CB_ANIM=16384,CB_FRONT=48*F,CB_BACK=-6553,PLAYER_EQUIP=0x80000,PLAYER_SPOTTED=0x8000;
function cardboardCreate(player){return {id:'cardboard:'+player.id,playerId:player.id,playerIndex:player.index,colorIndex:8,phase:0,flags:5,offsetYRaw:0,timerRaw:0,
 collisionActive:false,display:false,animation:0,xRaw:player.xRaw,yRaw:player.yRaw};}
// owner: {flags, alive, shotPressed, vxRaw, vyRaw}. Returns the owner's new flags.
function cardboardUpdate(cb,owner,dtRaw){
 let flags=owner?owner.flags:0;const usable=o=>o&&o.alive;
 const equip=()=>{cb.display=true;cb.offsetYRaw=CB_FRONT;cb.animation=2;cb.timerRaw=CB_ANIM;cb.collisionActive=true;flags|=PLAYER_EQUIP;cb.flags|=0x10;};
 switch(cb.phase){
 case 0:if((cb.flags&1)&&usable(owner)&&!(flags&PLAYER_EQUIP)&&!(flags&PLAYER_SPOTTED)&&owner.shotPressed){equip();cb.phase=1;}break;
 case 1:{cb.timerRaw-=dtRaw;if(cb.timerRaw>0)break;
  const keep=usable(owner)&&!(flags&PLAYER_SPOTTED)&&!owner.shotPressed;
  if(keep){if(cb.flags&0x10){const still=abs(owner.vxRaw)<4&&abs(owner.vyRaw)<4;if(still&&(cb.flags&8)){cb.animation=4;cb.flags&=~8;}else if(!still&&!(cb.flags&8)){cb.animation=3;cb.flags|=8;}}break;}
  cb.phase=2;break;}
 case 2:flags&=~PLAYER_EQUIP;cb.collisionActive=false;
  if(!(cb.flags&1)){cb.colorIndex=8;cb.flags&=~4;cb.yRaw-=6553;}else cb.offsetYRaw=CB_BACK;
  if(cb.flags&0x10){cb.animation=5;cb.timerRaw=CB_ANIM;}cb.phase=3;break;
 case 3:cb.timerRaw-=dtRaw;if(cb.timerRaw<=0){cb.flags&=~0x10;if(cb.flags&1)cb.display=false;else{cb.playerId=null;cb.collisionActive=true;}cb.phase=0;}break;
 }
 return flags;
}
// others: [{id, state9, bodyRaw}] (owner excluded). Returns [{id, inside}].
function cardboardCover(cb,others){
 const r0=rectAt(cb.xRaw,cb.yRaw,CB_RECTS[0]),r1=rectAt(cb.xRaw,cb.yRaw,CB_RECTS[1]);
 const within=(r,b)=>r.xRaw<b.xRaw&&r.yRaw<b.yRaw&&b.widthRaw+b.xRaw<r.widthRaw+r.xRaw&&b.heightRaw+b.yRaw<r.heightRaw+r.yRaw;
 return others.filter(o=>o.state9&&o.bodyRaw).map(o=>({id:o.id,inside:cb.collisionActive&&(within(r0,o.bodyRaw)||within(r1,o.bodyRaw))}));
}
function cardboardPost(cb,ownerPos){if((cb.flags&4)&&cb.playerId&&ownerPos){cb.xRaw=ownerPos.xRaw;cb.yRaw=ownerPos.yRaw+cb.offsetYRaw;}}
function cardboardDisplays(list){return (list||[]).map(cb=>({id:cb.id,playerId:cb.playerId,x:cb.xRaw/F,y:cb.yRaw/F,display:cb.display,phase:cb.phase,animation:cb.animation,timer:cb.timerRaw/CB_ANIM}));}
return {compile,create,update,post,lightUpdate,cardboardCreate,cardboardUpdate,cardboardCover,cardboardPost,cardboardDisplays,cageUpdate,cageReceiveEvent,collide,capture,solids,displays,batRect,cageRect,lightInsidePoint,lightInsideRect,countTable,findCount,
 supportedTypes:['BatEnemy','FallingCage'],nativeConstants:{CB_RECTS,CB_ANIM,CB_FRONT,CB_BACK,BAT_RECT,CAGE_RECT,CAGE_RECT2,DETECT,SMOOTH,LEVEL,ALERT,HIDE,START_Y,RETURN_ACCEL,FALL_SPEED,LAND_TIME,DIR_VECTOR},completePhysicsFidelity:false};
});
