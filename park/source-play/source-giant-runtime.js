/* GiantEnemy, GiantEnemyHand, PlayerPunch, SwitchTimerActor: 14-4, the playable
 * reconstruction from the saved Ghidra project ('GiantEnemyComponent$$',
 * 'GiantEnemyHandComponent$$', 'PlayerPunchComponent$$', 'SwitchTimerActorComponent$$',
 * 'DamageManageComponent$$'). No game executed. FP 16.16.
 *  Giant ParseParameter 0x181856d70 (QPlayerCountParam tables, walk-down Find
 *   0x181786950): slot 0 look left, slot 1 life (int), slot 2 first turn check (+0x50),
 *   slot 3 speed (+0x48), slot 4 attack interval (+0x20), slot 5 hand range (+0x38),
 *   slot 6 hand speed extra (+0x40), slot 7 hand can be punched, slot 8 hand aims in y,
 *   slots 9/10 scale (FP values only taken when > 0). Initialize 0x181856c80: life 10,
 *   +0x50 QFP._1_5, +0x48/+0x20/+0x40 QFP._1, +0x38 300, scale 1.
 *  Collisions (.cctor 0x181859360, H W X Y): (328 222 -110 -330), (290 254 -122 -310),
 *   (84 64 -160 -92), layer 8, no push back (InitCollision 0x1818574e0); looking left
 *   mirrors X to -(W + X) (flipCollision 0x1818578d0). The Creator sets the actor scale
 *   before ActorSceneComponent.AddActor 0x1816a71d0 -> SetBaseScale 0x1816a08c0 ->
 *   setAllCollisionScale: every collision is scaled by actor scale * stage scale
 *   (Collision.GetRect 0x181690610, pivot 0); the hand's circle box likewise. The key's
 *   layer-11 copy is made later (KeyComponent.OnStart) and keeps scale 1.
 *  OnUpdate 0x181857cc0 = updatePhase 0x181857d40 + floatProc 0x181857f80 (angle +=
 *   dt * 180 wrapped at 360, Pos = base + (0, sin(angle) * 8)). Phase 0 waits for
 *   event 61; 1 flip 0x181858120 (every 1.5 s: turn round when no player stands past
 *   the front edge of collision 0, attack timer reset), move 0x181858500 (base x +=
 *   dt * speed * 60), attack 0x1818585f0 (every interval, a hand at rest takes a
 *   random player in front of it: Next(0, n)); 2 move until the hand is back;
 *   3 animation 3, timer 1; 4 count down -> Actor flag 0x2000.
 *  OnRecvEvent 0x181858af0: 61 starts; 20 (not dead) through DamageManage -> life - 1,
 *   shake, SE 11; life < 1 -> event 23 to the hand, collisions off, phase 3; otherwise
 *   event 20 to the hand and the life text (showLife 0x181858e40, "life/max" 16 px
 *   above collision 0). OnCollided 0x1818592c0: a layer-1 body gets event 43.
 *  Hand (createHand 0x181857b20, Creator 0x181859d20): offset (-80, -88) * scale,
 *   draw scale (sx + sy) / 2, speed = giant speed, max = speed + extra, range = giant
 *   +0x38; circle 48 at (+-56, 0) (.cctor 0x18185ba40), layer 5, off until it attacks.
 *   OnUpdate 0x18185a4a0: 0 follow (x = body + offset, y eases 0.1), 1 aimTarget
 *   0x18185adb0 (unit vector to the target's collision-0 centre, its own y unless
 *   flag 2; angle = Atan2 * RAD_DEG, <= -90 -> +360) -> collision on, 2 rotate
 *   0x18185a9a0 (200 deg/s) + move 0x18185b080 (speed += FPDiv(max * 60, 4) * dt * 60
 *   up to max, step = speed * dt * 60 until range) -> off, timer 1/60 * 10;
 *   3 returnBody 0x18185b270 (eases 0.2), 4 on event 23: animation 3, timer 1;
 *   5 count down -> Actor flag 0x2000. OnCollided 0x18185b4c0: layer 1 -> event 43
 *   and the target cleared; layer 2 with flag 1 -> through DamageManage, event 30 to
 *   the punch, event 20 (+-1) to that player.
 *  DamageManage Check 0x18180d5c0: an entry per (sender, event), dropped once its
 *   age reaches (8 << 32) / 60.0 (.cctor 0x18180dc90); a live entry refuses.
 *  PlayerPunch Creator 0x1816d4300 (slot 0 = the scene player list index, created
 *   only for an existing player), ParseParameter 0x1816d45c0 (slot 1 charge time
 *   +0x38, slot 2/3 growth timer, slots 4/5 power step/max, slots 6/7 size step/max,
 *   slot 8 power), OnStart 0x1816d4b50 copies the index-0 punch's tuning when there
 *   is one. attackProc 0x1816d5190: charge += dt / chargeTime up to 1, then a fresh
 *   shot press (button 9) in player state 1 starts the punch (SE 0x10).
 *   updateAnimation 0x1816d5530 walks .cctor 0x1816d5a20's 7 frames (frame, time,
 *   hit): (2 '0.0166' hit) (4 '0.05' hit) (4 '0.05') (3 '0.0333') (2 '0.0333')
 *   (1 '0.0333') (0 '0.0666'); syncPlayerPos 0x1816d4d00: at the player + (14, -15)
 *   (mirrored), rect H32 W42 X [6,10,14,20,24][frame] Y -16, layer 2, on while hit.
 *   OnCollided 0x1816d58b0: layer 8 or 1 -> event 20 with +0x40 = +-power. A player
 *   (OnRecvEvent_Default 0x1816c6600) takes it through DamageManage as event 27
 *   (power * 8, -4) (PlayerComponent .cctor +0x160/+0x168): a forced jump.
 *  SwitchTimerActor Creator 0x18171a3d0 / OnPost 0x18171a890: per-count time (default
 *   QFP._10), at 0 event 61 to the slot 1 name, then gone unless slot 3.
 * Named approximations:
 *  - one frame = every OnUpdate, then the overlaps, then every OnPost; the punch
 *    rect therefore trails its player by one frame, as the native OnPost sync does;
 *  - the frame RNG is the Quantum default PCG stream (the session seed is not in
 *    the binary), private to this module.
 */
(function(root,factory){const c=typeof module==='object'&&module.exports;const api=factory(c?require('./source-fplut-math.js'):root.SourceFPLutMath,c?require('./source-distanceconstraint-math.js'):root.SourceDistanceConstraintMath);if(c)module.exports=api;root.SourceGiantRuntime=api;})(typeof globalThis!=='undefined'?globalThis:this,function(Lut,N){
'use strict';
const F=65536,B=BigInt,i64=v=>BigInt.asIntN(64,v);
const num=v=>{const n=Number(v);if(!Number.isSafeInteger(n))throw Error('Giant raw outside safe range');return n;};
const mul=(a,b)=>num(i64(B(a)*B(b))>>16n);
const div=(a,b)=>{if(!b)throw Error('Giant FP divide by zero');return num(i64(B(a)<<16n)/B(b));};
const clone=v=>JSON.parse(JSON.stringify(v));
const allowed=(v,c)=>!v||v<0&&c<=-v||v>0&&v<10&&c>=v||v>=10&&c>=Math.trunc(v/10)&&c<=v%10;
const fp=v=>Math.trunc(Math.fround(Math.fround(v)*F));
// QFP statics (.cctor 0x181780cc0)
const Q={_0_1:6553,_0_2:13107,_0_5:32768,_1:F,_1_5:98304,_4:4*F,_8:8*F,_10:10*F,_60:60*F,_180:180*F,_360:360*F,_m90:-90*F,_1_60:1092};
const DEG_RAD=0x477,RAD_DEG=0x394bb8,PI=0x3243f,HALF_PI=0x1921f;
const GIANT={rects:[{h:328*F,w:222*F,x:-110*F,y:-330*F},{h:290*F,w:254*F,x:-122*F,y:-310*F},{h:84*F,w:64*F,x:-160*F,y:-92*F}],
 handOffset:{xRaw:-80*F,yRaw:-88*F},floatSpeedRaw:Q._180,floatAmpRaw:Q._8,lifeTextYRaw:16*F};
const HAND={radiusRaw:48*F,centerRaw:{xRaw:56*F,yRaw:0},rotateRaw:200*F,trackRaw:Q._0_1,returnRaw:Q._0_2};
const PUNCH={offset:{xRaw:14*F,yRaw:-15*F},rect:{h:32*F,w:42*F,y:-16*F},frameX:[6*F,10*F,14*F,20*F,24*F],
 frames:[[2,1087,1],[4,3276,1],[4,3276,0],[3,2182,0],[2,2182,0],[1,2182,0],[0,4364,0]],knock:{xRaw:8*F,yRaw:-4*F},shakeRaw:3276};
const PLAYER_RECT={x:-16*F,y:-47*F,w:32*F,h:46*F};
const DAMAGE_WINDOW=num((8n<<32n)/B(60*F));// DamageManage frames 8 at 60.0
const EV={START:61,DAMAGE:20,DIE:23,DEAD:43};
const DEFAULT_RNG={state:'9600629759793949339',inc:'15726070495360670683'};
const PCG=6364136223846793005n,M64=(1n<<64n)-1n;
function pcg32(rng){const old=B(rng.state);rng.state=((old*PCG+(B(rng.inc)|1n))&M64).toString();const x=Number(((old>>45n)^(old>>27n))&0xffffffffn),rot=Number(old>>59n);return ((x>>>rot)|(x<<((32-rot)&31)))>>>0;}
function nextInt(rng,min,max){if(min===max)return min;let lo=max,hi=min;if(min<max){lo=min;hi=max;}const u=(hi-lo)>>>0,threshold=(2**32-u)%u;let x;do x=pcg32(rng);while(x<threshold);return lo+x%u;}
// QPlayerCountParam tables: one char per byte minus 0x21, little-endian, walk-down lookup.
function table(a,i,width){const d=(a.datas||[])[i];if(!d||d.t!==2||typeof d.s!=='string'||d.s.length!==7*width)return Array(7).fill(0);
 const t=[];for(let e=0;e<7;e++){let v=0n;for(let k=width-1;k>=0;k--)v=(v<<8n)|B(((d.s.charCodeAt(e*width+k)&0xff)-0x21)&0xff);t.push(num(BigInt.asIntN(width*8,v)));}return t;}
function findCount(t,count){for(let i=Math.min(count-2,6);i>=0;i--)if(t[i]!==0)return t[i];return 0;}
function slotFP(a,i){const d=(a.datas||[])[i];return d&&d.t===1?fp(d.f):0;}
function slotInt(a,i){return slotFP(a,i)>>16;}
function slotStr(a,i){const d=(a.datas||[])[i];return d&&d.t===2?d.s||'':'';}
// FPMath.Atan2 0x181640930 on FPMath.Atan's table (source-fplut-math atanRaw).
function atan2Raw(y,x){
 if(x<0){const t=num(i64(B(y)<<16n)/B(x));return y>=0?Lut.atanRaw(t)+PI:Lut.atanRaw(t)-PI;}
 if(x===0)return y>0?HALF_PI:y===0?0:-HALF_PI;
 return Lut.atanRaw(num(i64(B(y)<<16n)/B(x)));}
// EulerZ(angle) 0x181644e70 applied to (v, 0, 0) by 0x181645b90 (q.x = q.y = 0).
function rotateX(vRaw,degRaw){const [z,w]=Lut.sincosRaw(Math.floor(mul(degRaw,DEG_RAD)/2));return {xRaw:mul(F-mul(z,z*2),vRaw),yRaw:mul(mul(w,z*2),vRaw)};}
const sinRaw=r=>Lut.sincosRaw(r)[0];
function compile(actors,count){
 if(!Number.isInteger(count)||count<2||count>8)throw Error('Giant count 2..8 required');
 const giants=[],punches=[],timers=[];
 actors.forEach((raw,i)=>{const a=raw.properties||raw;if(!allowed(a.playerCount,count))return;const id=raw.id||'source:a'+i,xRaw=fp(a.posX??raw.x),yRaw=fp(a.posY??raw.y);
  if(a.typeName==='GiantEnemy'){
   const g={id,name:a.name||'',xRaw,yRaw,life:10,lifeMax:0,flags:0,turnRaw:Q._1_5,speedRaw:Q._1,attackRaw:Q._1,rangeRaw:300*F,extraRaw:Q._1,scaleXRaw:Q._1,scaleYRaw:Q._1};
   if(slotInt(a,0)!==0)g.flags|=4;
   const life=findCount(table(a,1,4),count);if(life>0){g.life=life;g.lifeMax=life;}
   for(const [slot,key] of [[2,'turnRaw'],[3,'speedRaw'],[4,'attackRaw'],[5,'rangeRaw'],[6,'extraRaw']]){const v=findCount(table(a,slot,8),count);if(v>0)g[key]=v;}
   if(slotInt(a,7)!==0)g.flags|=1;if(slotInt(a,8)!==0)g.flags|=2;
   if(slotFP(a,9)>0)g.scaleXRaw=slotFP(a,9);if(slotFP(a,10)>0)g.scaleYRaw=slotFP(a,10);
   giants.push(g);return;}
  if(a.typeName==='PlayerPunch'){const p={id,actorIndex:slotInt(a,0),chargeTimeRaw:0,growthRaw:0,growthEveryRaw:0,powerStepRaw:0,powerMaxRaw:0,sizeStepRaw:0,sizeMaxRaw:0,powerRaw:Q._1};
   for(const [slot,key] of [[1,'chargeTimeRaw'],[2,'growthRaw'],[3,'growthEveryRaw'],[4,'powerStepRaw'],[5,'powerMaxRaw'],[6,'sizeStepRaw'],[7,'sizeMaxRaw'],[8,'powerRaw']]){const v=slotFP(a,slot);if(v>0)p[key]=v;}
   punches.push(p);return;}
  if(a.typeName==='SwitchTimerActor'){const t={id,timerRaw:Q._10,target:slotStr(a,1),flags:0};const v=findCount(table(a,0,8),count);if(v>0)t.timerRaw=v;
   if(slotInt(a,2)!==0)t.flags|=1;if(slotInt(a,3)!==0)t.flags|=2;timers.push(t);}
 });
 return {schemaVersion:1,count,giants,punches,timers,rng:{...DEFAULT_RNG},completePhysicsFidelity:false};
}
function mirrored(r,left){return left?{...r,x:-(r.w+r.x)}:{...r};}
function create(compiled,host={}){
 const st=clone(compiled);const stage=host.stageScaleRaw||F;st.timeRaw=0;st.started=false;st.damage={};st.prevShot={};
 // PlayerPunch Creator: only for a player that exists; OnStart copies the index-0 punch's tuning
 const exists=i=>Number.isInteger(host.playerCount)?i>=0&&i<host.playerCount:true;
 st.punches=st.punches.filter(p=>exists(p.actorIndex));const master=st.punches.find(p=>p.actorIndex===0);
 for(const p of st.punches){if(master)for(const k of ['chargeTimeRaw','powerStepRaw','powerMaxRaw','sizeStepRaw','sizeMaxRaw','growthEveryRaw','growthRaw'])p[k]=master[k];
  p.growthTimerRaw=p.growthRaw;p.sizeRaw=Q._1;p.chargeRaw=Q._1;p.rateRaw=p.chargeTimeRaw>0?div(Q._1,p.chargeTimeRaw):0;
  p.attacking=false;p.hit=false;p.cooling=false;p.frameIndex=0;p.frame=0;p.frameTimerRaw=0;p.xRaw=0;p.yRaw=0;p.lookLeft=false;p.synced=false;}
 for(const g of st.giants){g.phase=0;g.floatRaw=0;g.attackTimerRaw=0;g.baseXRaw=g.xRaw;g.baseYRaw=g.yRaw;g.collisionsOn=true;g.gone=false;g.dead=false;g.anim=1;g.lifeVisible=false;g.colScale={xRaw:mul(g.scaleXRaw,stage),yRaw:mul(g.scaleYRaw,stage)};
  g.rects=GIANT.rects.map(r=>mirrored(r,!!(g.flags&4)));g.keyRect=null;
  const avg=mul(g.scaleXRaw+g.scaleYRaw,Q._0_5);
  g.hand={phase:0,dir:g.flags&4?2:3,offBaseXRaw:mul(g.scaleXRaw,GIANT.handOffset.xRaw),offBaseYRaw:mul(g.scaleYRaw,GIANT.handOffset.yRaw),offXRaw:0,offYRaw:0,scaleRaw:avg,
   speed0Raw:g.speedRaw,speedMaxRaw:g.speedRaw+g.extraRaw,rangeRaw:g.rangeRaw,speedRaw:0,distRaw:0,angleRaw:0,targetAngleRaw:0,dirRaw:{xRaw:0,yRaw:0},timerRaw:0,
   flags:(g.flags&1?1:0)|(g.flags&2?2:0),target:null,xRaw:0,yRaw:0,collisionOn:false,center:{xRaw:0,yRaw:0},gone:false,anim:1,started:false,colScaleRaw:mul(avg,stage)};}
 return st;
}
// Giant OnStart 0x181857a80: createHand, base = Pos. Hand OnStart 0x18185a330.
function start(st){if(st.started)return;st.started=true;
 for(const g of st.giants){g.baseXRaw=g.xRaw;g.baseYRaw=g.yRaw;const h=g.hand;handDirection(g,h);calcAngle(h,true);calcOffset(h);h.xRaw=g.xRaw+h.offXRaw;h.yRaw=g.yRaw+h.offYRaw;h.collisionOn=false;h.started=true;}}
function handDirection(g,h){h.dir=(g.flags&4)?2:3;h.center={xRaw:h.dir===2?-HAND.centerRaw.xRaw:HAND.centerRaw.xRaw,yRaw:HAND.centerRaw.yRaw};}
function calcAngle(h,both){h.targetAngleRaw=h.dir===2?Q._180:0;if(both)h.angleRaw=h.targetAngleRaw;}
function calcOffset(h){h.offXRaw=h.dir===2?-h.offBaseXRaw:h.offBaseXRaw;h.offYRaw=h.offBaseYRaw;}
function rotate(h,dt){
 if(h.angleRaw!==h.targetAngleRaw){const d=h.targetAngleRaw-h.angleRaw,next=mul(mul(dt,d<0?-F:F),HAND.rotateRaw)+h.angleRaw;
  h.angleRaw=(d<0?next<h.targetAngleRaw:next>h.targetAngleRaw)?h.targetAngleRaw:next;}
 h.rotationRaw=h.dir===2?h.angleRaw-Q._180:h.angleRaw;h.center=rotateX(HAND.centerRaw.xRaw,h.angleRaw);}
function rectWorld(xRaw,yRaw,r){return {x:xRaw+r.x,y:yRaw+r.y,w:r.w,h:r.h};}
// Collision.GetRect 0x181690610 with the collision scale (pivot 0)
function scaled(r,sc){return {x:mul(sc.xRaw,r.x),y:mul(sc.yRaw,r.y),w:mul(sc.xRaw,r.w),h:mul(sc.yRaw,r.h)};}
function giantRect(g,r){return rectWorld(g.xRaw,g.yRaw,scaled(r,g.colScale));}
const overlap=(a,b)=>a.x<b.x+b.w&&b.x<a.x+a.w&&a.y<b.y+b.h&&b.y<a.y+a.h;
function playerRect(p){return rectWorld(p.xRaw,p.yRaw,PLAYER_RECT);}
function handRect(h){const r=HAND.radiusRaw,sc={xRaw:h.colScaleRaw,yRaw:h.colScaleRaw};return rectWorld(h.xRaw,h.yRaw,scaled({x:h.center.xRaw-r,y:h.center.yRaw-r,w:r*2,h:r*2},sc));}
function punchRect(p){const r=PUNCH.rect,x=PUNCH.frameX[p.frame],w=r.w;return rectWorld(p.xRaw,p.yRaw,{h:r.h,w,x:p.lookLeft?-(w+x):x,y:r.y});}
// DamageManage.Check 0x18180d5c0
function damageCheck(st,owner,sender,eventType){const list=st.damage[owner]||(st.damage[owner]=[]);
 for(let i=list.length-1;i>=0;i--)if(DAMAGE_WINDOW<=st.timeRaw-list[i].timeRaw)list.splice(i,1);
 if(list.some(e=>e.sender===sender&&e.eventType===eventType))return false;list.push({eventType,sender,timeRaw:st.timeRaw});return true;}
function giantEvent(st,g,e,out){
 if(e===EV.START){if(g.phase===0)g.phase=1;return;}
 if(e.eventType!==EV.DAMAGE||g.dead)return;
 if(!damageCheck(st,g.id,e.sender,EV.DAMAGE))return;
 out.shakes.push({amountRaw:PUNCH.shakeRaw});out.sounds.push({se:0xb});g.life-=1;
 if(g.life<1){handEvent(g.hand,EV.DIE);g.lifeVisible=false;g.collisionsOn=false;g.phase=3;g.flags|=8;g.dead=true;return;}
 g.anim=2;handEvent(g.hand,EV.DAMAGE);g.lifeVisible=true;}
function handEvent(h,e){if(e===EV.DAMAGE){h.anim=2;return;}if(e===EV.DIE&&!(h.flags&4)){h.collisionOn=false;h.phase=4;h.flags|=4;}}
function giantUpdate(st,g,dt,players){
 const h=g.hand;
 if(g.phase===1){
  // flip 0x181858120
  g.turnRaw-=dt;if(g.turnRaw<=0){g.turnRaw=Q._1_5;const r=giantRect(g,g.rects[0]),left=r.x,edge=(g.flags&4)?left:left+r.w;
   const ahead=players.filter(p=>(g.flags&4)?p.xRaw<edge:edge<p.xRaw).length;
   if(!ahead){g.flags^=4;g.rects=GIANT.rects.map(q=>mirrored(q,!!(g.flags&4)));g.attackTimerRaw=0;}}
  giantMove(g,dt);
  // attack 0x1818585f0
  g.attackTimerRaw+=dt;if(g.attackRaw<=g.attackTimerRaw){g.attackTimerRaw=0;
   if(h.phase===0&&!h.gone){const front=players.filter(p=>(g.flags&4)?p.xRaw<h.xRaw:h.xRaw<p.xRaw);
    if(front.length){h.target=front[nextInt(st.rng,0,front.length)].index;h.phase=1;g.phase=2;}}}
 }else if(g.phase===2){giantMove(g,dt);if(h.phase===0)g.phase=1;}
 else if(g.phase===3){g.anim=3;g.phase=4;g.turnRaw=Q._1;}
 else if(g.phase===4){g.turnRaw-=dt;if(g.turnRaw<=0){g.gone=true;g.phase=5;}}
 // floatProc 0x181857f80
 g.floatRaw+=mul(dt,GIANT.floatSpeedRaw);if(Q._360<=g.floatRaw)g.floatRaw-=Q._360;
 g.xRaw=g.baseXRaw;g.yRaw=mul(sinRaw(mul(g.floatRaw,DEG_RAD)),GIANT.floatAmpRaw)+g.baseYRaw;
}
function giantMove(g,dt){const v=mul(mul(dt,g.speedRaw),Q._60);g.baseXRaw+=(g.flags&4)?-v:v;}
function handUpdate(st,g,dt,players){const h=g.hand;if(h.gone)return;
 switch(h.phase){
  case 0:handDirection(g,h);calcOffset(h);calcAngle(h,true);rotate(h,dt);
   h.xRaw=g.xRaw+h.offXRaw;h.yRaw=mul(g.yRaw+h.offYRaw-h.yRaw,HAND.trackRaw)+h.yRaw;return;
  case 1:{const p=players.find(q=>q.index===h.target);if(!p){h.phase=0;return;}
   // aimTarget: the target's collision-0 centre
   const tx=PLAYER_RECT.x+(PLAYER_RECT.w>>1)+p.xRaw,ty=h.flags&2?PLAYER_RECT.y+(PLAYER_RECT.h>>1)+p.yRaw:h.yRaw;
   const dx=tx-h.xRaw,dy=ty-h.yRaw;h.dirRaw=dx===0&&dy===0?{xRaw:0,yRaw:0}:N.normalizeRaw({xRaw:dx,yRaw:dy});
   let deg=mul(atan2Raw(dy,dx),RAD_DEG);if(deg<=Q._m90)deg+=Q._360;h.targetAngleRaw=deg;h.speedRaw=h.speed0Raw;h.distRaw=0;
   h.collisionOn=true;h.phase=2;return;}
  case 2:{if(h.target!==null){rotate(h,dt);if(!handMove(h,dt))return;}
   h.collisionOn=false;h.timerRaw=mul(Q._1_60,Q._10);h.phase=3;return;}
  case 3:calcAngle(h,false);rotate(h,dt);
   h.xRaw+=mul(HAND.returnRaw,g.xRaw+h.offXRaw-h.xRaw);h.yRaw+=mul(g.yRaw+h.offYRaw-h.yRaw,HAND.returnRaw);
   h.timerRaw-=dt;if(h.timerRaw>0)return;h.phase=0;return;
  case 4:h.anim=3;h.timerRaw=Q._1;h.phase=5;return;
  case 5:h.timerRaw-=dt;if(h.timerRaw>0)return;h.gone=true;h.phase=6;return;
 }
}
function handMove(h,dt){const inc=div(mul(h.speedMaxRaw,Q._60),Q._4);
 h.speedRaw=mul(mul(inc,dt),Q._60)+h.speedRaw;if(h.speedMaxRaw<=h.speedRaw)h.speedRaw=h.speedMaxRaw;
 const step=mul(mul(dt,h.speedRaw),Q._60);h.xRaw+=mul(h.dirRaw.xRaw,step);h.yRaw+=mul(h.dirRaw.yRaw,step);h.distRaw+=step;return h.rangeRaw<=h.distRaw;}
// PlayerPunch OnUpdate 0x1816d50d0 -> attackProc 0x1816d5190
function punchUpdate(st,p,dt,player){
 if(p.attacking)return;
 if(p.rateRaw>0&&p.chargeRaw<Q._1){p.cooling=true;p.chargeRaw+=mul(dt,p.rateRaw);if(Q._1<=p.chargeRaw)p.chargeRaw=Q._1;return;}
 p.cooling=false;if(!player||!player.state1||!player.shotPressed)return;
 p.frameIndex=0;p.attacking=true;p.frameTimerRaw=0;p.chargeRaw=0;st.out.sounds.push({se:0x10});}
// OnPost 0x1816d5470: updateAnimation, increaseProc, syncPlayerPos
function punchPost(st,p,dt,player){
 if(p.attacking){p.frameTimerRaw-=dt;if(p.frameTimerRaw<=0){
  if(p.frameIndex<PUNCH.frames.length){const [frame,time,hit]=PUNCH.frames[p.frameIndex++];p.frame=frame;p.frameTimerRaw=time;p.hit=!!hit;}
  else{p.attacking=false;}}}
 if(p.growthRaw>0){p.growthTimerRaw-=dt;if(p.growthTimerRaw<=0){p.growthTimerRaw=p.growthEveryRaw;
  if(p.powerRaw<p.powerMaxRaw)p.powerRaw=Math.min(p.powerRaw+p.powerStepRaw,p.powerMaxRaw);
  if(p.sizeRaw<p.sizeMaxRaw){p.sizeRaw+=p.sizeStepRaw;if(p.sizeMaxRaw<p.sizeRaw)p.sizeRaw=p.sizeMaxRaw;}}}
 if(!player)return;p.lookLeft=!!player.lookLeft;
 p.xRaw=player.xRaw+(p.lookLeft?-PUNCH.offset.xRaw:PUNCH.offset.xRaw);p.yRaw=player.yRaw+PUNCH.offset.yRaw;p.synced=true;}
function timerPost(st,t,dt,out){if(t.flags&4)return;t.timerRaw-=dt;if(t.timerRaw<0)t.timerRaw=0;if(t.timerRaw>0)return;t.flags|=4;
 const g=st.giants.find(q=>q.name===t.target);if(g)giantEvent(st,g,EV.START,out);else if(t.target)out.keyEvents.push({eventType:EV.START,targetName:t.target,senderId:t.id});
 if(!(t.flags&2))t.gone=true;}
/* One frame. host: {dtRaw, players:[{index, xRaw, yRaw (anchor), lookLeft, state1,
 * shotHeld, alive}], plugins:[{update(dt), targets(out) -> [{rect, hit(e)}] (layer-8
 * punch targets), overlaps(players, out), post(dt, out)}]}. Returns {deaths:[{index,
 * reason}], knocks:[{index, vxRaw, vyRaw}], faints, keyEvents, sounds, shakes}. */
function step(st,host){
 const dt=host.dtRaw,out={deaths:[],knocks:[],faints:[],keyEvents:[],sounds:[],shakes:[]};st.out=out;const plugins=host.plugins||[];
 const players=(host.players||[]).filter(p=>p.alive!==false);
 for(const p of players){const held=!!p.shotHeld;p.shotPressed=held&&!st.prevShot[p.index];st.prevShot[p.index]=held;}
 for(const p of host.players||[])if(p.alive===false)st.prevShot[p.index]=!!p.shotHeld;
 start(st);st.timeRaw+=dt;
 // OnUpdate (actor order: giants, punches, then the hands created at OnStart)
 for(const g of st.giants)if(!g.gone)giantUpdate(st,g,dt,players);
 for(const p of st.punches)punchUpdate(st,p,dt,players.find(q=>q.index===p.actorIndex));
 for(const g of st.giants)if(!g.gone||!g.hand.gone)handUpdate(st,g,dt,players);
 for(const x of plugins)x.update(dt);
 // overlaps
 const dead=new Set();
 for(const p of st.punches){if(!p.attacking||!p.hit||!p.synced)continue;const r=punchRect(p),power=p.lookLeft?-p.powerRaw:p.powerRaw;
  for(const g of st.giants){if(g.gone||!g.collisionsOn)continue;for(const gr of g.rects)if(overlap(r,giantRect(g,gr)))giantEvent(st,g,{eventType:EV.DAMAGE,sender:p.id,powerRaw:power},out);}
  for(const x of plugins)for(const t of x.targets(out))if(overlap(r,t.rect))t.hit({eventType:EV.DAMAGE,sender:p.id,powerRaw:power});
  for(const q of players)if(overlap(r,playerRect(q))&&damageCheck(st,'player:'+q.index,p.id,EV.DAMAGE)){
   out.knocks.push({index:q.index,vxRaw:mul(power,PUNCH.knock.xRaw),vyRaw:PUNCH.knock.yRaw});out.shakes.push({amountRaw:PUNCH.shakeRaw});out.sounds.push({se:0x11});}
  for(const g of st.giants){const h=g.hand;if(h.gone||!h.collisionOn||!(h.flags&1)||!overlap(r,handRect(h)))continue;
   if(!damageCheck(st,'hand:'+g.id,p.id,EV.DAMAGE))continue;h.anim=2;out.sounds.push({se:6});h.target=null;
   const q=players.find(z=>z.index===p.actorIndex);if(q&&damageCheck(st,'player:'+q.index,'hand:'+g.id,EV.DAMAGE))out.knocks.push({index:q.index,vxRaw:mul((g.flags&4)?-Q._1:Q._1,PUNCH.knock.xRaw),vyRaw:PUNCH.knock.yRaw});}
 }
 for(const g of st.giants){if(g.gone)continue;
  if(g.collisionsOn)for(const q of players)if(!dead.has(q.index)&&g.rects.some(gr=>overlap(giantRect(g,gr),playerRect(q)))){dead.add(q.index);out.deaths.push({index:q.index,reason:'giant'});}}
 for(const g of st.giants){const h=g.hand;if(h.gone||!h.collisionOn)continue;
  for(const q of players)if(overlap(handRect(h),playerRect(q))){h.target=null;if(!dead.has(q.index)){dead.add(q.index);out.deaths.push({index:q.index,reason:'hand'});}}}
 for(const x of plugins)x.overlaps(players,out);
 // OnPost
 for(const p of st.punches)punchPost(st,p,dt,players.find(q=>q.index===p.actorIndex));
 for(const t of st.timers)if(!t.gone)timerPost(st,t,dt,out);
 for(const x of plugins)x.post(dt,out);
 delete st.out;return out;
}
// KeyComponent.OnStart 0x18186bf10 attaches a key naming this actor: offset = key - actor
// (x mirrored when it looks left), plus a layer-11 copy of collision 0 as it is now.
function attachKey(st,name,keyRaw){const g=st.giants.find(q=>q.name===name);if(!g)return null;
 g.keyRect={...g.rects[0]};let ox=keyRaw.xRaw-g.xRaw;if(g.flags&4)ox=-ox;g.keyOffset={xRaw:ox,yRaw:keyRaw.yRaw-g.yRaw};return g.id;}
// KeyComponent.updatePhase 0x18186c340: a holder that is neither a player nor type 0x37.
function keyHolder(st,id){const g=st.giants.find(q=>q.id===id);if(!g||g.gone||!g.keyOffset)return null;
 return {xRaw:g.xRaw+((g.flags&4)?-g.keyOffset.xRaw:g.keyOffset.xRaw),yRaw:g.yRaw+g.keyOffset.yRaw};}
function keyBoxes(st){return st.giants.filter(g=>!g.gone&&g.collisionsOn&&g.keyRect).map(g=>({id:g.id,...rectPx(rectWorld(g.xRaw,g.yRaw,g.keyRect))}));}
const rectPx=r=>({x:r.x/F,y:r.y/F,w:r.w/F,h:r.h/F});
function displays(st){return {
 giants:st.giants.filter(g=>!g.gone).map(g=>({id:g.id,x:g.xRaw/F,y:g.yRaw/F,scaleX:g.scaleXRaw/F,scaleY:g.scaleYRaw/F,lookLeft:!!(g.flags&4),anim:g.anim,phase:g.phase,dead:g.dead,
  life:g.lifeVisible?(()=>{const r=giantRect(g,g.rects[0]);return {text:g.life+'/'+g.lifeMax,x:(r.x+div(r.w,2*F))/F,y:(r.y+GIANT.lifeTextYRaw)/F};})():null,rects:g.rects.map(r=>rectPx(giantRect(g,r)))})),
 hands:st.giants.filter(g=>!g.hand.gone&&g.hand.started).map(g=>{const h=g.hand;return {id:g.id+':hand',x:h.xRaw/F,y:h.yRaw/F,scale:h.scaleRaw/F,lookLeft:h.dir===2,rotation:(h.rotationRaw||0)/F,phase:h.phase,attacking:h.collisionOn,
  circle:{x:(h.xRaw+mul(h.colScaleRaw,h.center.xRaw))/F,y:(h.yRaw+mul(h.colScaleRaw,h.center.yRaw))/F,r:mul(h.colScaleRaw,HAND.radiusRaw)/F},anim:h.anim};}),
 punches:st.punches.filter(p=>p.synced).map(p=>({id:p.id,actorIndex:p.actorIndex,x:p.xRaw/F,y:p.yRaw/F,lookLeft:p.lookLeft,frame:p.frame,attacking:p.attacking,hit:p.hit,charge:p.chargeRaw/F,rect:rectPx(punchRect(p))})),
 timers:st.timers.filter(t=>!t.gone).map(t=>({id:t.id,seconds:t.timerRaw/F}))};}
return {compile,create,start,step,displays,attachKey,keyHolder,keyBoxes,damageCheck,atan2Raw,rotateX,nextInt,pcg32,table,findCount,
 supportedTypes:['GiantEnemy','PlayerPunch','SwitchTimerActor'],nativeConstants:{GIANT,HAND,PUNCH,DAMAGE_WINDOW},completePhysicsFidelity:false};
});
