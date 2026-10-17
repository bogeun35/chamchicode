/* RallyController (192), RallyMallet (189) and RallyBall (191), 13-3, the playable
 * reconstruction from the saved Ghidra project ('RallyControllerComponent$$',
 * 'RallyMalletComponent$$', 'RallyBallComponent$$'); source-rally-devices.js keeps
 * the earlier parameter analysis. No game executed. Offsets below are component
 * fields; Actor fields = quantum-field-offsets.json - 0x10 (BaseScale +0x50,
 * Weight +0x58, CollisionVelo +0x70, InitPos +0x80, Pos +0xb0, Velo +0xf0).
 *  Controller Initialize 0x1816dfc20: max 10 / speed-up every 2 (+2 = 0x20a),
 *   ballScale QFP._1, ballSpeed _6, ballSpeedInc _0_10, ballSpeedMax _16,
 *   malletScale _1, malletSpeed _10, malletSpeedInc _0_10, malletSpeedMax _20.
 *  ParseParameter 0x1816dfe40: slot 0 max (int), 1/2 ball start (always stored),
 *   3 ballSpeed, 4 ballSpeedInc, 5 malletSpeedInc, 6 speed-up count (int),
 *   7 malletSpeed, 8 ballSpeedMax, 9 malletSpeedMax, 10 ballScale, 11 malletScale;
 *   every other slot overrides only when positive.
 *  OnStart 0x1816e0340: every player requests state 8 (Target; OnInitialize_Target
 *   0x1816c9c40 sets animation 5 and the state has no update: they stand still).
 *  OnPost 0x1816e0370 (not after the clear, flag bit0) -> updatePhase 0x1816e03f0:
 *   0 timer QFP._0_50; 1 count down, createBall, 2; 2 no ball -> timer QFP._0_25, 1;
 *   3 clearProc 0x1816e0960 (event 1 to Keys 17, 35 to the ball and the mallets,
 *   ChangeAllPlayerState(1), flag bit0), 4.
 *  createBall 0x1816e05c0: mallet = list[RNGSession.Next(0, count) 0x181662090];
 *   angle from the start position to its InitPos with FPMath.Atan 0x1816407f0
 *   (+-pi left of the start, +-pi/2 straight up/down) * 0x394bb8 (deg/rad), plus
 *   RNGSession.Next(-20, 20) 0x181662020; RallyBall.Creator 0x1816dda50.
 *  OnRecvEvent 0x1816e0a60: 9 ballHit 0x1816e0b60 (phase < 3 and count < max:
 *   ++count; == max -> phase 3, else every speed-up count event 57 with
 *   ballSpeedInc to the balls 191 and with malletSpeedInc to the mallets 189);
 *   7 ballDisappeared 0x1816e0cb0 (ball 0; below max: count 0, event 58 to mallets).
 *  Mallet Initialize 0x1816e4df0: speed QFP._10, max _20, rail length 256.
 *   ParseParameter 0x1816e4e80: slot 0 player actor index (GetPlayerByActorIndex
 *   0x181749610: the scene's player list -> input index +0xe, colour +7), slot 1
 *   rail angle wrapped once by QFP._360, slot 2 length (positive only).
 *   InitCollision 0x1816e50b0: circle 25 (.cctor 0x1816e6180), pushBack 2, layer 3.
 *   InitPost 0x1816e5190: weight 100, rail limit (length / QFP._2)^2, direction
 *   EulerZ(angle) 0x181644e70 applied to (1,0,0) by 0x181645b90.
 *   OnStart 0x1816e5310: registController -> AddMallet + setParameter 0x1816e57c0
 *   (malletScale > 0: actor scale and collision scale = scale * BaseScale;
 *   malletSpeed, malletSpeedMax). Collision.GetGlobalCircle 0x181690900: radius *
 *   max(scale x, scale y).
 *   OnUpdate 0x1816e5950 (not stopped, flag bit0) -> move 0x1816e59d0: GetMoveVector
 *   0x181887860 with QGameDefine's stick threshold (+0x30 = FromString '0.078125',
 *   .cctor 0x181780720); rails at 0/180 deg take x, at 90/270 take y, any other angle
 *   takes the dominant input axis (ties go to y), signed per quadrant
 *   (0x1816e5bc7..5ed1); step = input * direction * min(speed + inc, max) *
 *   BaseScale; a step ending outside the rail limit is refused whole (0x1816e5fe5).
 *   OnRecvEvent 0x1816e6020: 35 stop, 57 inc += Speed, 58 inc = 0.
 *  Ball Creator 0x1816dda50: draw scale = ballScale; parent, angle, speed, max.
 *   InitCollision 0x1816ddc90: circle 12 (.cctor 0x1816df1d0), pushBack 3, layer 6;
 *   AddActor 0x1816a71d0 -> SetBaseScale scales it by the actor scale (ballScale), so the
 *   circle is 12 * ballScale (13-3: 18).
 *   OnUpdate 0x1816dde00: 0 timer QFP._0_50; 1 count down -> initMove 0x1816de0d0
 *   (Velo = EulerZ(angle) * (1,0,0)); 2 move 0x1816de220 (Velo = normalize(Velo) *
 *   min(speed + inc, max) * BaseScale); 3 animation 2, timer DISAPPEAR_TIME 0.5;
 *   4 count down -> Actor flag 0x2000 (OnExit 0x1816ddd70 sends 7 to the parent).
 *   disappear 0x1816de440 (phase < 3): Velo 0, collision off, phase 3.
 *   OnCollided 0x1816de560: Thunder (38) -> disappear. OnRecvEvent 0x1816de360:
 *   35 disappear, 57 inc += Speed. OnContactAdded 0x1816de630: a mallet other than
 *   the last one -> event 9 to the parent.
 *   OnContacted 0x1816de740, contact normal pointing from the ball to the contact:
 *   a mallet -> one-dimensional collision along the normal with both CollisionVelos
 *   (a weight >= 100 makes the lighter side 0; skipped when separating), normalised
 *   (-normal at |v|^2 <= QFP[0x270] = 4 raw) times (speed + inc) * BaseScale;
 *   the map -> mirror; when the mirrored direction is within QFP._30 degrees of
 *   the face normal, angle * QFP._1_5 (0 -> 1) is rotated from that face's base
 *   angle (0/90/180/270, sign from the mirrored vector) keeping the length.
 */
(function(root,factory){const c=typeof module==='object'&&module.exports;const api=factory(c?require('./source-fplut-math.js'):root.SourceFPLutMath,c?require('./source-distanceconstraint-math.js'):root.SourceDistanceConstraintMath);if(c)module.exports=api;root.SourceRallyRuntime=api;})(typeof globalThis!=='undefined'?globalThis:this,function(Lut,N){
'use strict';
const F=65536,DEG_RAD=0x477,RAD_DEG=0x394bb8,PI=0x3243f,HALF_PI=0x1921f;
const BALL_RADIUS=0xc0000,MALLET_RADIUS=0x190000,MALLET_WEIGHT=0x640000,HEAVY=0x640000,BALL_WEIGHT=F;
const WAIT_START=32768,WAIT_RETRY=16384,DISAPPEAR_TIME=0x8000,RANDOM_ANGLE=20*F,SNAP_ANGLE=30*F,SNAP_SCALE=98304,STOP_SQ=4,STICK=5120,RAIL_DEFAULT=256*F;
const EV={START:1,DISAPPEARED:7,HIT:9,STOP:35,ADD:57,RESET:58},TYPE={KEY:17,MALLET:189,BALL:191,CONTROLLER:192,THUNDER:38};
const DEFAULT_RNG={state:'9600629759793949339',inc:'15726070495360670683'};
const B=v=>BigInt(v),i64=v=>BigInt.asIntN(64,v),num=v=>{const n=Number(v);if(!Number.isSafeInteger(n))throw Error('Rally raw outside safe range');return n;};
const mul=(a,b)=>num(i64(B(a)*B(b))>>16n),sq=v=>mul(v,v);
const clone=v=>JSON.parse(JSON.stringify(v));
const allowed=(v,c)=>!v||v<0&&c<=-v||v>0&&v<10&&c>=v||v>=10&&c>=Math.trunc(v/10)&&c<=v%10;
const fp=v=>Math.trunc(Math.fround(Math.fround(v)*F));
function slot(a,i){const d=(a.datas||[])[i];return d&&d.t===1?fp(d.f):0;}
// ---- frame RNG (RNGSession, PCG32; the session seed is not stage data) ------------
const PCG=6364136223846793005n,M64=(1n<<64n)-1n;
function pcg32(rng){const old=B(rng.state);rng.state=((old*PCG+(B(rng.inc)|1n))&M64).toString();const x=Number(((old>>45n)^(old>>27n))&0xffffffffn),rot=Number(old>>59n);return ((x>>>rot)|(x<<((32-rot)&31)))>>>0;}
function nextInt(rng,min,max){if(min===max)return min;let lo=max,hi=min;if(min<max){lo=min;hi=max;}const u=(hi-lo)>>>0,threshold=(2**32-u)%u;let x;do x=pcg32(rng);while(x<threshold);return lo+x%u;}
function nextFP(rng,min,max){let lo=min,hi=max;if(max<min){lo=max;hi=min;}return num(i64(B(pcg32(rng)>>>16)*B(hi-lo))>>16n)+lo;}
// ---- native math ----------------------------------------------------------------
// EulerZ (half angle through FPMath.SinCos) applied to (1,0,0):
// x = 1 - z*2z, y = w*2z (the SearchLight / CapturingTarget construction).
function rotX(degRaw){const rad=mul(degRaw,DEG_RAD),[z,w]=Lut.sincosRaw(Math.floor(rad/2));return {xRaw:F-mul(z,z*2),yRaw:mul(w,z*2)};}
// createBall's angle (0x1816e06fe..0x1816e07d2), radians.
function aimAngle(dx,dy){
 if(dx<1){if(dx<0){const a=Lut.atanRaw(num(i64(B(dy)<<16n)/B(dx)));return dy<0?a-PI:a+PI;}return dy<1?(dy!==0?-HALF_PI:0):HALF_PI;}
 return Lut.atanRaw(num(i64(B(dy)<<16n)/B(dx)));
}
// FPMath.Acos 0x181640760: outside -1..1 the native returns FP.MinValue, and
// MinValue * 0x394bb8 wraps to 0 in 64 bits.
function acosDegrees(x){if(x<-F||x>F)return 0;return num(i64(B(Lut.acosRaw(x))*B(RAD_DEG))>>16n);}
const normalize=v=>N.normalizeRaw(v);
// ---- compile ----------------------------------------------------------------------
function compile(actors,count){
 if(!Number.isInteger(count)||count<2||count>8)throw Error('Rally count 2..8 required');
 const controllers=[],mallets=[];
 actors.forEach((raw,i)=>{const a=raw.properties||raw;if(!allowed(a.playerCount,count))return;
  const id=raw.id||'source:a'+i,xRaw=fp(a.posX??raw.x),yRaw=fp(a.posY??raw.y),name=a.name||'';
  if((raw.createThreshold??a.createThreshold??0)!==0&&(a.typeName==='RallyController'||a.typeName==='RallyMallet'))throw Error('Rally delayed creation ordering unresolved');
  if(a.typeName==='RallyController'){
   const c={id,name,type:'RallyController',xRaw,yRaw,phase:0,rallyCount:0,rallyMax:10,speedUpCount:2,
    ballScaleRaw:F,ballSpeedRaw:6*F,ballSpeedIncRaw:6553,ballSpeedMaxRaw:16*F,malletScaleRaw:F,malletSpeedRaw:10*F,malletSpeedIncRaw:6553,malletSpeedMaxRaw:20*F,
    timerRaw:0,startXRaw:slot(a,1),startYRaw:slot(a,2),ballId:null,flags:0,malletIds:[]};
   const n=slot(a,0)>>16,k=slot(a,6)>>16;if(n>0)c.rallyMax=n&255;if(k>0)c.speedUpCount=k&255;
   const pos=(j,key)=>{const v=slot(a,j);if(v>0)c[key]=v;};
   pos(3,'ballSpeedRaw');pos(4,'ballSpeedIncRaw');pos(5,'malletSpeedIncRaw');pos(7,'malletSpeedRaw');pos(8,'ballSpeedMaxRaw');pos(9,'malletSpeedMaxRaw');pos(10,'ballScaleRaw');pos(11,'malletScaleRaw');
   if(c.rallyMax>127||c.speedUpCount>127)throw Error('Rally signed byte parameter outside shipped range');
   controllers.push(c);return;}
  if(a.typeName!=='RallyMallet')return;
  let angle=slot(a,1);if(angle<0)angle+=360*F;else if(angle>=360*F)angle-=360*F;
  const len=slot(a,2)>0?slot(a,2):RAIL_DEFAULT,half=num(i64(B(len)<<16n)/B(2*F));
  mallets.push({id,name,type:'RallyMallet',actorIndex:slot(a,0)>>16,initXRaw:xRaw,initYRaw:yRaw,xRaw,yRaw,preXRaw:xRaw,preYRaw:yRaw,collisionVeloRaw:{xRaw:0,yRaw:0},
   angleRaw:angle,lengthRaw:len,railLimitRaw:mul(half,half),dirRaw:rotX(angle),speedRaw:10*F,speedIncRaw:0,speedMaxRaw:20*F,scaleRaw:F,collisionScaleRaw:F,
   weightRaw:MALLET_WEIGHT,baseScaleRaw:F,flags:0});
 });
 if(controllers.length>1)throw Error('Rally: one controller per stage');
 return {schemaVersion:1,count,controllers,mallets,balls:[],serial:0,started:false,rng:{...DEFAULT_RNG},completePhysicsFidelity:false};
}
const create=clone;
// ---- controller -----------------------------------------------------------------------
function controllerOf(st){return st.controllers[0]||null;}
// Frame.NotifyEvent by actor type / to an entity, delivered at once.
function malletEvent(m,type,value){if(type===EV.STOP)m.flags|=1;else if(type===EV.ADD)m.speedIncRaw+=value;else if(type===EV.RESET)m.speedIncRaw=0;}
function ballEvent(b,type,value){if(type===EV.STOP)disappear(b);else if(type===EV.ADD)b.speedIncRaw+=value;}
function ballHit(st,c){
 if(c.phase>=3||c.rallyCount>=c.rallyMax)return;
 c.rallyCount++;if(c.rallyCount>=c.rallyMax){c.phase=3;return;}
 if(c.rallyCount%c.speedUpCount===0){for(const b of st.balls)ballEvent(b,EV.ADD,c.ballSpeedIncRaw);for(const m of st.mallets)malletEvent(m,EV.ADD,c.malletSpeedIncRaw);}
}
function ballDisappeared(st,c){c.ballId=null;if(c.rallyCount<c.rallyMax){c.rallyCount=0;for(const m of st.mallets)malletEvent(m,EV.RESET,0);}}
function createBall(st,c){
 const list=c.malletIds.map(id=>st.mallets.find(m=>m.id===id)).filter(Boolean);
 const index=nextInt(st.rng,0,list.length);if(!(index<list.length))return;
 const m=list[index],rad=aimAngle(m.initXRaw-c.startXRaw,m.initYRaw-c.startYRaw);
 const offset=nextFP(st.rng,-RANDOM_ANGLE,RANDOM_ANGLE),angle=num(i64(B(rad)*B(RAD_DEG))>>16n)+offset;
 const id=c.id+':ball'+(++st.serial);
 st.balls.push({id,type:'RallyBall',parentId:c.id,xRaw:c.startXRaw,yRaw:c.startYRaw,preXRaw:c.startXRaw,preYRaw:c.startYRaw,veloRaw:{xRaw:0,yRaw:0},collisionVeloRaw:{xRaw:0,yRaw:0},
  angleRaw:angle,speedRaw:c.ballSpeedRaw,speedIncRaw:0,speedMaxRaw:c.ballSpeedMaxRaw,scaleRaw:c.ballScaleRaw,baseScaleRaw:F,weightRaw:BALL_WEIGHT,
  phase:0,timerRaw:0,lastMalletId:null,contactIds:[],collisionActive:true,flags:0,animation:0});
 c.ballId=id;
}
function controllerPost(st,c,dtRaw){
 if(c.flags&1)return {};
 if(c.phase===0){c.timerRaw=WAIT_START;c.phase=1;return {};}
 if(c.phase===1){c.timerRaw-=dtRaw;if(c.timerRaw<=0){createBall(st,c);c.phase=2;}return {};}
 if(c.phase===2){if(c.ballId===null){c.timerRaw=WAIT_RETRY;c.phase=1;}return {};}
 if(c.phase===3){const ball=st.balls.find(b=>b.id===c.ballId);if(ball)ballEvent(ball,EV.STOP,0);for(const m of st.mallets)malletEvent(m,EV.STOP,0);
  c.flags|=1;c.phase=4;return {keyEvents:[{eventType:EV.START,broadcastActorType:TYPE.KEY,senderId:c.id}],playerState:1};}
 return {};
}
// ---- mallet -----------------------------------------------------------------------
function malletRadius(m){return mul(m.collisionScaleRaw,MALLET_RADIUS);}
// RallyBall Creator 0x1816dda50 sets the actor scale to ballScale before
// ActorSceneComponent.AddActor 0x1816a71d0 -> SetBaseScale 0x1816a08c0 -> setAllCollisionScale
// (actor scale * stage scale), and GetGlobalCircle takes radius * max(scale x, scale y).
function ballRadius(b){return mul(mul(b.scaleRaw,b.baseScaleRaw),BALL_RADIUS);}
function start(st){
 if(st.started)return {};st.started=true;const c=controllerOf(st);
 if(c)for(const m of st.mallets){c.malletIds.push(m.id);
  if(c.malletScaleRaw>0){m.scaleRaw=c.malletScaleRaw;m.collisionScaleRaw=mul(c.malletScaleRaw,m.baseScaleRaw);}
  if(c.malletSpeedRaw>0)m.speedRaw=c.malletSpeedRaw;if(c.malletSpeedMaxRaw>0)m.speedMaxRaw=c.malletSpeedMaxRaw;}
 return c?{playerState:8}:{};
}
// The rail picks one input axis (move 0x1816e5a40..0x1816e5f1a).
function railInput(angle,v){
 const x=v.xRaw,y=v.yRaw,ax=Math.abs(x),ay=Math.abs(y);
 if(angle===0||angle===180*F)return {xRaw:x,yRaw:0};
 if(angle===90*F||angle===270*F)return {xRaw:0,yRaw:y};
 let s;
 if(angle>0&&angle<90*F)s=ax>ay?x:y;
 else if(angle>90*F&&angle<180*F)s=ax>ay?-x:y;
 else if(angle>180*F&&angle<270*F)s=ax>ay?-x:-y;
 else s=ax>ay?x:-y;
 return {xRaw:s,yRaw:s};
}
function malletMove(m,v){
 if(m.flags&1)return;
 const s=railInput(m.angleRaw,v),speed=mul(Math.min(m.speedRaw+m.speedIncRaw,m.speedMaxRaw),m.baseScaleRaw);
 const nx=m.xRaw+mul(mul(s.xRaw,m.dirRaw.xRaw),speed),ny=m.yRaw+mul(mul(s.yRaw,m.dirRaw.yRaw),speed);
 if(sq(nx-m.initXRaw)+sq(ny-m.initYRaw)<=m.railLimitRaw){m.xRaw=nx;m.yRaw=ny;}
}
// ---- ball -------------------------------------------------------------------------
function disappear(b){if(b.phase<3){b.veloRaw={xRaw:0,yRaw:0};b.collisionActive=false;b.phase=3;}}
function ballUpdate(b,dtRaw){
 if(b.phase===0){b.timerRaw=WAIT_START;b.phase=1;return;}
 if(b.phase===1){b.timerRaw-=dtRaw;if(b.timerRaw>0)return;b.veloRaw=rotX(b.angleRaw);b.phase=2;return;}
 if(b.phase===2){const speed=mul(Math.min(b.speedRaw+b.speedIncRaw,b.speedMaxRaw),b.baseScaleRaw),u=normalize(b.veloRaw);b.veloRaw={xRaw:mul(u.xRaw,speed),yRaw:mul(u.yRaw,speed)};return;}
 if(b.phase===3){b.animation=2;b.timerRaw=DISAPPEAR_TIME;b.phase=4;return;}
 if(b.phase===4){b.timerRaw-=dtRaw;if(b.timerRaw>0)return;b.flags|=0x2000;b.phase=5;}
}
const currentSpeed=b=>mul(b.speedRaw+b.speedIncRaw,b.baseScaleRaw);
// OnContacted with a mallet (0x1816de7c0..0x1816de9a5).
function contactMallet(b,m,n){
 const bv=b.collisionVeloRaw,mv=m.collisionVeloRaw;
 const v1=mul(n.yRaw,bv.yRaw)+mul(n.xRaw,bv.xRaw),v2=mul(n.yRaw,mv.yRaw)+mul(n.xRaw,mv.xRaw);
 if((i64(B(v2)*B(v1))&~0xffffn)<1n){if(v1<0)return false;}else if(v1<v2)return false;
 let m1=b.weightRaw,m2=m.weightRaw;if(m1<HEAVY){if(m2>=HEAVY)m1=0;}else if(m2<HEAVY)m2=0;
 const top=i64((i64(B(v1)*B(m1-m2))>>16n)+(i64(B(2*m2)*B(v2))>>16n)),nv=num(i64(top<<16n)/B(m2+m1));
 let x=mul(n.xRaw,nv)+(bv.xRaw-mul(n.xRaw,v1)),y=(bv.yRaw-mul(n.yRaw,v1))+mul(nv,n.yRaw);
 if(sq(y)+sq(x)<=STOP_SQ){x=-n.xRaw;y=-n.yRaw;}
 const u=normalize({xRaw:x,yRaw:y}),speed=currentSpeed(b);b.veloRaw={xRaw:mul(speed,u.xRaw),yRaw:mul(speed,u.yRaw)};return true;
}
// OnContacted with the map (0x1816de9b0..0x1816dec80).
function contactMap(b,n){
 const v=b.veloRaw,d=mul(n.yRaw,v.yRaw)+mul(n.xRaw,v.xRaw),px=mul(n.xRaw,d),py=mul(d,n.yRaw);
 let rx=(v.xRaw-px)-px,ry=(v.yRaw-py)-py;
 const len=N.sqrtRaw(B(sq(ry)+sq(rx)));
 if(len>0){
  const dot=num(i64(B(-n.xRaw)*B(rx))>>16n)+num(i64(B(-n.yRaw)*B(ry))>>16n);
  let angle=acosDegrees(num(i64(B(dot)<<16n)/B(len)));
  if(angle<SNAP_ANGLE){
   if(angle===0)angle=F;
   let base=0,negate=false;
   if(n.xRaw<0)negate=ry<0;
   else if(n.yRaw<0){base=90*F;negate=rx>0;}
   else if(n.xRaw>0){base=180*F;negate=ry>0;}
   else if(n.yRaw>0){base=270*F;negate=rx<0;}
   if(negate)angle=-angle;
   const dir=rotX(mul(angle,SNAP_SCALE)+base);rx=mul(dir.xRaw,len);ry=mul(dir.yRaw,len);
  }
 }
 if(sq(ry)+sq(rx)<=STOP_SQ){const speed=currentSpeed(b);rx=mul(speed,-n.xRaw);ry=mul(speed,-n.yRaw);}
 b.veloRaw={xRaw:rx,yRaw:ry};
}
// ---- collision (named approximation of the shared CollisionScene) ------------------
//  - contact = the ball circle penetrating a mallet circle or a terrain rectangle;
//    the ball (pushBack 3) is moved out along the normal, the mallet (pushBack 2,
//    weight 100) is not; one map contact per distinct face normal (the terrain
//    rectangles are merged first so a wall of tiles is one face);
//  - mallets first, then the map; OnContactAdded before OnContacted;
//  - OnCollided = the ball circle overlapping a Thunder beam rectangle.
function mergeRects(list){
 let r=list.map(p=>({x:p.x,y:p.y,w:p.w,h:p.h}));let changed=true;
 while(changed){changed=false;
  for(let i=0;i<r.length&&!changed;i++)for(let j=0;j<r.length&&!changed;j++){if(i===j)continue;const a=r[i],c=r[j];
   if(a.x===c.x&&a.w===c.w&&a.y+a.h===c.y){a.h+=c.h;r.splice(j,1);changed=true;}
   else if(a.y===c.y&&a.h===c.h&&a.x+a.w===c.x){a.w+=c.w;r.splice(j,1);changed=true;}}}
 return r;
}
function circleRect(cx,cy,r,rect){
 const x0=rect.x*F,y0=rect.y*F,x1=(rect.x+rect.w)*F,y1=(rect.y+rect.h)*F;
 const qx=Math.max(x0,Math.min(cx,x1)),qy=Math.max(y0,Math.min(cy,y1)),dx=qx-cx,dy=qy-cy,d2=B(dx)*B(dx)+B(dy)*B(dy);
 if(d2>=B(r)*B(r))return null;
 if(dx===0&&dy===0){const pen=[[cx-x0,-F,0],[x1-cx,F,0],[cy-y0,0,-F],[y1-cy,0,F]].sort((a,c)=>a[0]-c[0])[0];return {normal:{xRaw:-pen[1],yRaw:-pen[2]},depthRaw:r+pen[0]};}
 const normal=dx===0?{xRaw:0,yRaw:Math.sign(dy)*F}:dy===0?{xRaw:Math.sign(dx)*F,yRaw:0}:normalize({xRaw:dx,yRaw:dy});
 return {normal,depthRaw:r-N.sqrtRaw(B(sq(dx)+sq(dy)))};
}
function overlapsRect(cx,cy,r,rect){return !!circleRect(cx,cy,r,rect);}
/* One update. host: {dtRaw, inputVector(actorIndex) -> {xRaw,yRaw} (GetMoveVector with
 * threshold stickThresholdRaw), terrain [{x,y,w,h}] px, beams [{x,y,w,h}] px}.
 * Returns {keyEvents, playerState (8 at the start, 1 at the clear), hits}. */
function step(st,host){
 const out={keyEvents:[],playerState:null,hits:0},dt=host.dtRaw;
 const s=start(st);if(s.playerState)out.playerState=s.playerState;
 const c=controllerOf(st);
 // OnUpdate1: PrePos
 for(const a of [...st.mallets,...st.balls]){a.preXRaw=a.xRaw;a.preYRaw=a.yRaw;}
 // OnUpdate: mallets (updater 100), then balls (127)
 for(const m of st.mallets)if(!(m.flags&1))malletMove(m,host.inputVector(m.actorIndex));
 for(const b of st.balls)if(!(b.flags&0x2000))ballUpdate(b,dt);
 // OnUpdate2: Pos += Velo
 for(const b of st.balls){b.xRaw+=b.veloRaw.xRaw;b.yRaw+=b.veloRaw.yRaw;}
 // collision
 const terrain=st.mergedTerrain||(st.mergedTerrain=mergeRects(host.terrain||[]));
 for(const b of st.balls){
  if(!b.collisionActive||(b.flags&0x2000)){b.contactIds=[];continue;}
  const now=[];
  for(const m of st.mallets){const R=ballRadius(b)+malletRadius(m),dx=m.xRaw-b.xRaw,dy=m.yRaw-b.yRaw;
   if(B(dx)*B(dx)+B(dy)*B(dy)>=B(R)*B(R))continue;
   const n=(dx===0&&dy===0)?{xRaw:0,yRaw:F}:normalize({xRaw:dx,yRaw:dy}),depth=R-N.sqrtRaw(B(sq(dx)+sq(dy)));
   b.xRaw-=mul(n.xRaw,depth);b.yRaw-=mul(n.yRaw,depth);now.push(m.id);
   if(!b.contactIds.includes(m.id)&&m.id!==b.lastMalletId){b.lastMalletId=m.id;out.hits++;if(c&&b.parentId===c.id)ballHit(st,c);}
   contactMallet(b,m,n);}
  b.contactIds=now;
  const faces=[];
  for(const rect of terrain){const h=circleRect(b.xRaw,b.yRaw,ballRadius(b),rect);if(!h)continue;
   const f=faces.find(q=>q.normal.xRaw===h.normal.xRaw&&q.normal.yRaw===h.normal.yRaw);if(f){if(h.depthRaw>f.depthRaw)f.depthRaw=h.depthRaw;}else faces.push(h);}
  for(const f of faces){b.xRaw-=mul(f.normal.xRaw,f.depthRaw);b.yRaw-=mul(f.normal.yRaw,f.depthRaw);contactMap(b,f.normal);}
  if((host.beams||[]).some(r=>overlapsRect(b.xRaw,b.yRaw,ballRadius(b),r)))disappear(b);
 }
 // OnPost: controller (updater 167)
 if(c){const r=controllerPost(st,c,dt);if(r.keyEvents)out.keyEvents.push(...r.keyEvents);if(r.playerState)out.playerState=r.playerState;}
 // OnPost2: CollisionVelo = Pos - PrePos
 for(const a of [...st.mallets,...st.balls])a.collisionVeloRaw={xRaw:a.xRaw-a.preXRaw,yRaw:a.yRaw-a.preYRaw};
 // Actor flag 0x2000: removed at the end of the update, OnExit -> event 7 (named
 // approximation of the removal point).
 for(const b of st.balls.filter(q=>q.flags&0x2000)){st.balls.splice(st.balls.indexOf(b),1);if(c&&b.parentId===c.id)ballDisappeared(st,c);}
 return out;
}
function displays(st){const c=controllerOf(st);return {
 mallets:st.mallets.map(m=>({id:m.id,actorIndex:m.actorIndex,x:m.xRaw/F,y:m.yRaw/F,radius:malletRadius(m)/F,initX:m.initXRaw/F,initY:m.initYRaw/F,dirX:m.dirRaw.xRaw/F,dirY:m.dirRaw.yRaw/F,halfLength:m.lengthRaw/F/2,stopped:!!(m.flags&1)})),
 balls:st.balls.map(b=>({id:b.id,x:b.xRaw/F,y:b.yRaw/F,radius:ballRadius(b)/F,drawScale:b.scaleRaw/F,phase:b.phase,fade:b.phase>=4?Math.max(0,b.timerRaw/DISAPPEAR_TIME):1})),
 counter:c?{x:c.xRaw/F,y:c.yRaw/F,count:c.rallyCount,max:c.rallyMax,cleared:!!(c.flags&1)}:null};}
return {compile,create,start,step,displays,ballHit,ballDisappeared,controllerPost,createBall,malletMove,railInput,ballUpdate,contactMallet,contactMap,disappear,rotX,aimAngle,acosDegrees,mergeRects,circleRect,pcg32,nextInt,nextFP,
 supportedTypes:['RallyController','RallyMallet'],
 nativeConstants:{BALL_RADIUS,MALLET_RADIUS,MALLET_WEIGHT,WAIT_START,WAIT_RETRY,DISAPPEAR_TIME,RANDOM_ANGLE,SNAP_ANGLE,SNAP_SCALE,STOP_SQ,STICK,RAIL_DEFAULT,EV,TYPE},completePhysicsFidelity:false};
});
