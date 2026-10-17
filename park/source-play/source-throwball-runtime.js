/* CannonPlayer (PlayerCannon 146 + PlayerCannonBall 147), ThrowBall (148),
 * ThrowBallBasket, ThrowBallController (155): 8-2 / 8-4, the playable reconstruction from
 * the saved Ghidra project ('PlayerCannonComponent$$', 'PlayerCannonBallComponent$$',
 * 'ThrowBallComponent$$', 'ThrowBallBasketComponent$$', 'ThrowBallControllerComponent$$').
 * source-throwball-devices.js keeps the earlier parameter checks. No game executed.
 *  createCannonPlayer 0x1816a49a0: createPlayer, then PlayerCannon.Creator 0x181895360
 *   with slot 14 (aim speed, +0x28) and slot 15 (power speed, +0x40); OnStart 0x1818957c0
 *   copies the first cannon's two speeds. Rect H24 W44 X-22 Y-24 (.cctor 0x181896340),
 *   layer 3, no push back; OnPost 0x181895f70 sits it at the player + (0, -36 - ear),
 *   visible with the player, collision on while the player is alive.
 *  OnUpdate 0x181895890 (player state 1): 0 aim (updateAngle 0x181895b80: phase +=
 *   dt * aim speed, angle = sin(phase) * 45); a shot press with a ball loaded -> 1
 *   power (updatePower 0x181895c50: phase += dt * power speed, power = |sin|, 360 ->
 *   back to 0); another press -> createBall 0x181895d30 (direction -90 - angle, speed
 *   4 + 16 * power, at + 40 along it and 4 up), timer 0.5 -> 2 -> 0. AddBall caps at 99.
 *  PlayerCannonBall Creator 0x1818942a0: circle 8 (.cctor 0x181894c20), push back 3,
 *   layer 5, RequestJump(velocity) (jumpProc: velocity = jump, then + Frame.Gravity).
 *   OnContactAdded 0x181894750: the map -> requestDisappear 0x1818949e0 (stop, collision
 *   off, 0.5 s); an actor other than a ThrowBall / basket -> CalcReflectVeloX/Y
 *   0x181894ac0/0x181894b70 (max(|v| * 0.5, 0.1 / 0.3), away from the contact).
 *  ThrowBall Creator 0x181727c30 (controller ballProc 0x181729700: at (x, -10), vy =
 *   controller speed, + dt * accel each update while moving): circle 8 (.cctor 0x1817287d0),
 *   push back 1 (map only), layer 5. The map -> requestDisappear 0x1817286c0 (0.5 s).
 *   OnCollided 0x181728300 with a PlayerCannon: a ball loads it (SE 9) and goes; a bomb
 *   sends event 25 to its player (normalize(cannon - bomb).x * 8, -2) and explodes
 *   (0x181728572: phase 1 -> shake 0.2, hidden -> phase 2 for 80 / 160 s).
 *  ThrowBallBasket ParseParameter 0x181726e00: slot 0 target per count (default 100),
 *   slot 1 pole height (default 5), slot 2 scale (default 1). InitCollision 0x181726fa0:
 *   (.cctor 0x1817276f0, H W X Y) body (36 42 -21 -49) and mouth (8 20 -10 -50), each
 *   times scale, Y - 16 * height, layer 5, push back 2. OnContactAdded 0x1817273b0: a
 *   cannon ball in the mouth goes (score + 1 below the target, mouth off at the target);
 *   on the body it is reflected away from the basket.
 *  ThrowBallController Creator 0x181728eb0: slot 0 speed (1), slot 1 accel (2), slot 2
 *   interval (0.5), slot 3 bomb percent (10). OnPost 0x181729460: basketProc 0x181729500
 *   (every basket at its target -> event 1 to the Keys, stop), ballProc (the first time
 *   createAreaInfo 0x181729b10: the camera view stage area less 32 px each side, with
 *   32 px cut round every basket x; then Next(0, areas), Next(lo, hi) for x, and when the
 *   percent is set PCG32 below 96 rejected, % 100 < percent -> bomb). Event 19 stops it.
 * Named approximations:
 *  - push back contacts are axis-of-least-overlap boxes (the circle's bounding box, as
 *    mixed circle/rect pairs use); a ball pushes itself out, the other side stays;
 *  - cannon balls do not meet each other;
 *  - the frame RNG is the Quantum default PCG stream, private to this module.
 */
(function(root,factory){const c=typeof module==='object'&&module.exports;const api=factory(c?require('./source-fplut-math.js'):root.SourceFPLutMath,c?require('./source-distanceconstraint-math.js'):root.SourceDistanceConstraintMath);if(c)module.exports=api;root.SourceThrowBallRuntime=api;})(typeof globalThis!=='undefined'?globalThis:this,function(Lut,N){
'use strict';
const F=65536,B=BigInt,i64=v=>BigInt.asIntN(64,v);
const num=v=>{const n=Number(v);if(!Number.isSafeInteger(n))throw Error('ThrowBall raw outside safe range');return n;};
const mul=(a,b)=>num(i64(B(a)*B(b))>>16n);
const clone=v=>JSON.parse(JSON.stringify(v));
const allowed=(v,c)=>!v||v<0&&c<=-v||v>0&&v<10&&c>=v||v>=10&&c>=Math.trunc(v/10)&&c<=v%10;
const fp=v=>Math.trunc(Math.fround(Math.fround(v)*F));
const DEG_RAD=0x477,GRAVITY=0xa666;
const CANNON={rect:{h:24*F,w:44*F,x:-22*F,y:-24*F},headRaw:-36*F,maxAngleRaw:45*F,powerEndRaw:360*F,powerScaleRaw:16*F,baseSpeedRaw:4*F,liftRaw:-4*F,muzzleRaw:40*F,coolRaw:0x8000,maxBalls:99};
const SHOT={radiusRaw:8*F,reflectRaw:32768,minXRaw:6553,minYRaw:19660,disappearRaw:0x8000};// QFP 0x90 / 0x50 / 0x78
const DROP={radiusRaw:8*F,disappearRaw:0x8000,shakeRaw:0x3333,blastRateRaw:160*F,blastEndRaw:80*F,startYRaw:-10*F};
const BASKET={rects:[{h:36*F,w:42*F,x:-21*F,y:-49*F},{h:8*F,w:20*F,x:-10*F,y:-50*F}],poleRaw:16*F};
const AREA_MARGIN=32*F,FAINT={xRaw:8*F,yRaw:-2*F};
const DEFAULT_RNG={state:'9600629759793949339',inc:'15726070495360670683'};
const PCG=6364136223846793005n,M64=(1n<<64n)-1n;
function pcg32(rng){const old=B(rng.state);rng.state=((old*PCG+(B(rng.inc)|1n))&M64).toString();const x=Number(((old>>45n)^(old>>27n))&0xffffffffn),rot=Number(old>>59n);return ((x>>>rot)|(x<<((32-rot)&31)))>>>0;}
function nextInt(rng,min,max){if(min===max)return min;let lo=max,hi=min;if(min<max){lo=min;hi=max;}const u=(hi-lo)>>>0,threshold=(2**32-u)%u;let x;do x=pcg32(rng);while(x<threshold);return lo+x%u;}
function nextFP(rng,min,max){let lo=min,hi=max;if(max<min){lo=max;hi=min;}return num(i64(B(pcg32(rng)>>>16)*B(hi-lo))>>16n)+lo;}
function table(a,i,width){const d=(a.datas||[])[i];if(!d||d.t!==2||typeof d.s!=='string'||d.s.length!==7*width)return Array(7).fill(0);
 const t=[];for(let e=0;e<7;e++){let v=0n;for(let k=width-1;k>=0;k--)v=(v<<8n)|B(((d.s.charCodeAt(e*width+k)&0xff)-0x21)&0xff);t.push(num(BigInt.asIntN(width*8,v)));}return t;}
function findCount(t,count){for(let i=Math.min(count-2,6);i>=0;i--)if(t[i]!==0)return t[i];return 0;}
function slotFP(a,i){const d=(a.datas||[])[i];return d&&d.t===1?fp(d.f):0;}
const sin=r=>Lut.sincosRaw(r)[0],cos=r=>Lut.sincosRaw(r)[1];
function compile(actors,count){
 if(!Number.isInteger(count)||count<2||count>8)throw Error('ThrowBall count 2..8 required');
 const cannons=[],baskets=[];let controller=null;
 actors.forEach((raw,i)=>{const a=raw.properties||raw;if(!allowed(a.playerCount,count))return;const id=raw.id||'source:a'+i,xRaw=fp(a.posX??raw.x),yRaw=fp(a.posY??raw.y);
  if(a.typeName==='CannonPlayer'){if(cannons.length<count)cannons.push({id:'cannon:'+cannons.length,playerIndex:cannons.length,aimSpeedRaw:slotFP(a,14),powerSpeedRaw:slotFP(a,15)});return;}
  if(a.typeName==='ThrowBallBasket'){const b={id,xRaw,yRaw,target:100,heightRaw:5*F,scaleRaw:F,score:0,mouthOn:true};
   const t=findCount(table(a,0,4),count);if(t!==0)b.target=t&0xffff;if(slotFP(a,1)>0)b.heightRaw=slotFP(a,1);if(slotFP(a,2)>0)b.scaleRaw=slotFP(a,2);baskets.push(b);return;}
  if(a.typeName==='ThrowBallController'){if(controller)throw Error('ThrowBallController: one per stage');
   controller={id,speedRaw:F,accelRaw:2*F,intervalRaw:0x8000,bomb:10,timerRaw:0,areas:null,stopped:false,cleared:false};
   const s0=slotFP(a,0),s1=slotFP(a,1),s2=slotFP(a,2),s3=slotFP(a,3)>>16;if(s0)controller.speedRaw=s0;if(s1)controller.accelRaw=s1;if(s2)controller.intervalRaw=s2;if(s3>=0)controller.bomb=s3&255;}
 });
 if(cannons.length){const m=cannons[0];for(const c of cannons){c.aimSpeedRaw=m.aimSpeedRaw;c.powerSpeedRaw=m.powerSpeedRaw;}}// OnStart copies the first cannon
 for(const c of cannons)Object.assign(c,{balls:0,phase:0,charging:false,aimPhaseRaw:0,angleRaw:0,powerPhaseRaw:0,powerRaw:0,coolRaw:0,xRaw:0,yRaw:0,visible:true,collisionOn:false});
 return {schemaVersion:1,count,cannons,baskets,controller,shots:[],drops:[],serial:0,rng:{...DEFAULT_RNG},completePhysicsFidelity:false};
}
const create=clone;
// Collision.GetRect with the collision scale 1 (these are built in the base rect)
function basketRect(b,k){const r=BASKET.rects[k],s=b.scaleRaw;return {x:b.xRaw+mul(s,r.x),y:b.yRaw+mul(s,r.y)-mul(BASKET.poleRaw,b.heightRaw),w:mul(s,r.w),h:mul(s,r.h)};}
function cannonRect(c){const r=CANNON.rect;return {x:c.xRaw+r.x,y:c.yRaw+r.y,w:r.w,h:r.h};}
function circleBox(o,r){return {x:o.xRaw-r,y:o.yRaw-r,w:r*2,h:r*2};}
const overlap=(a,b)=>a.x<b.x+b.w&&b.x<a.x+a.w&&a.y<b.y+b.h&&b.y<a.y+a.h;
// normal from the other toward the ball along the axis of least overlap
function contact(box,o){const l=box.x+box.w-o.x,r=o.x+o.w-box.x,u=box.y+box.h-o.y,d=o.y+o.h-box.y,m=Math.min(l,r,u,d);
 if(m===u)return {nx:0,ny:-1,dx:0,dy:-u};if(m===d)return {nx:0,ny:1,dx:0,dy:d};if(m===l)return {nx:-1,ny:0,dx:-l,dy:0};return {nx:1,ny:0,dx:r,dy:0};}
const reflectX=v=>Math.max(mul(Math.abs(v),SHOT.reflectRaw),SHOT.minXRaw),reflectY=v=>Math.max(mul(Math.abs(v),SHOT.reflectRaw),SHOT.minYRaw);
function cannonUpdate(st,c,dt,p,out){
 if(!p||!p.state1){c.charging=false;c.phase=0;return;}
 if(c.phase===0){if(c.balls>0&&p.shotPressed){c.charging=true;c.powerPhaseRaw=0;c.phase=1;return;}
  c.aimPhaseRaw+=mul(dt,c.aimSpeedRaw);c.angleRaw=mul(sin(mul(c.aimPhaseRaw,DEG_RAD)),CANNON.maxAngleRaw);return;}
 if(c.phase===1){if(p.shotPressed){c.balls--;fire(st,c,out);c.charging=false;c.coolRaw=CANNON.coolRaw;c.phase=2;return;}
  c.powerPhaseRaw+=mul(dt,c.powerSpeedRaw);c.powerRaw=Math.abs(sin(mul(c.powerPhaseRaw,DEG_RAD)));
  if(CANNON.powerEndRaw<=c.powerPhaseRaw){c.charging=false;c.phase=0;}return;}
 if(c.phase===2){c.coolRaw-=dt;if(c.coolRaw>0)return;c.phase=0;}}
function fire(st,c,out){const a=mul(-90*F-c.angleRaw,DEG_RAD),co=cos(a),si=sin(a),speed=mul(CANNON.powerScaleRaw,c.powerRaw)+CANNON.baseSpeedRaw;
 st.shots.push({id:'shot:'+(st.serial++),colorIndex:c.playerIndex,xRaw:c.xRaw+mul(CANNON.muzzleRaw,co),yRaw:c.yRaw+mul(CANNON.muzzleRaw,si)+CANNON.liftRaw,
  jumpRaw:{xRaw:mul(speed,co),yRaw:mul(speed,si)},veloRaw:{xRaw:0,yRaw:0},jumping:true,phase:0,timerRaw:0,collisionOn:true,anim:1,gone:false});out.sounds.push({se:0x14});}
function cannonPost(c,p){if(!p){c.visible=false;c.collisionOn=false;return;}c.visible=!p.hidden;if(!c.visible)return;
 c.xRaw=p.xRaw;c.yRaw=p.yRaw+(p.upsideDown?-1:1)*CANNON.headRaw;c.collisionOn=!!p.alive;}
function shotUpdate(st,b,dt,host,out){
 if(b.phase===1){b.timerRaw-=dt;if(b.timerRaw<1)b.gone=true;return;}
 // jumpProc: velocity = jump, then + Frame.Gravity; Pos += velocity
 if(b.jumping){if(Math.abs(b.jumpRaw.xRaw)>=4||Math.abs(b.jumpRaw.yRaw)>=4){b.veloRaw={...b.jumpRaw};b.jumpRaw={xRaw:0,yRaw:0};}b.veloRaw.yRaw+=host.gravityRaw||GRAVITY;}
 const box0=circleBox(b,SHOT.radiusRaw),m=host.sweep(box0,b.veloRaw.xRaw,b.veloRaw.yRaw);
 b.xRaw+=m.dxRaw;b.yRaw+=m.dyRaw;
 if(m.blocked){b.veloRaw={xRaw:0,yRaw:0};b.jumping=false;b.collisionOn=false;b.anim=2;b.phase=1;b.timerRaw=SHOT.disappearRaw;return;}
 let box=circleBox(b,SHOT.radiusRaw);
 for(const k of st.baskets){if(b.gone)break;
  if(k.mouthOn&&overlap(box,basketRect(k,1))){b.gone=true;if(k.score<k.target){k.score++;out.sounds.push({se:4});if(k.score>=k.target)k.mouthOn=false;}break;}
  const r=basketRect(k,0);if(!overlap(box,r))continue;const c=contact(box,r);
  if(c.ny<0)b.veloRaw.yRaw=-reflectY(b.veloRaw.yRaw);else if(c.ny>0)b.veloRaw.yRaw=reflectY(b.veloRaw.yRaw);
  if(c.nx<0)b.veloRaw.xRaw=-reflectX(b.veloRaw.xRaw);else if(c.nx>0)b.veloRaw.xRaw=reflectX(b.veloRaw.xRaw);
  b.xRaw+=c.dx;b.yRaw+=c.dy;box=circleBox(b,SHOT.radiusRaw);out.sounds.push({se:1});}
 if(b.gone)return;
 for(const p of host.players){if(!p.alive||!p.bodyRaw||!overlap(box,p.bodyRaw))continue;const c=contact(box,p.bodyRaw);
  // the ball's own OnContactAdded: away from the player
  if(c.ny<0)b.veloRaw.yRaw=-reflectY(b.veloRaw.yRaw);else if(c.ny>0)b.veloRaw.yRaw=reflectY(b.veloRaw.yRaw);
  if(c.nx<0)b.veloRaw.xRaw=-reflectX(b.veloRaw.xRaw);else if(c.nx>0)b.veloRaw.xRaw=reflectX(b.veloRaw.xRaw);
  b.xRaw+=c.dx;b.yRaw+=c.dy;box=circleBox(b,SHOT.radiusRaw);out.sounds.push({se:1});}
}
function dropUpdate(st,d,dt,host,out){
 if(d.phase===0){if(d.veloRaw.yRaw!==0)d.veloRaw.yRaw=mul(dt,d.accelRaw)+d.veloRaw.yRaw;
  if(d.disappearing){d.timerRaw-=dt;if(d.timerRaw<1)d.gone=true;return;}
  const m=host.sweep(circleBox(d,DROP.radiusRaw),d.veloRaw.xRaw,d.veloRaw.yRaw);d.xRaw+=m.dxRaw;d.yRaw+=m.dyRaw;
  if(m.blocked){d.veloRaw={xRaw:0,yRaw:0};d.collisionOn=false;d.anim=d.bomb?3:2;d.disappearing=true;d.timerRaw=DROP.disappearRaw;}return;}
 if(d.phase===1){out.shakes.push({amountRaw:DROP.shakeRaw});out.sounds.push({se:0xb});d.visible=false;d.collisionOn=false;d.veloRaw={xRaw:0,yRaw:0};d.phase=2;d.blastRaw=0;return;}
 if(d.phase===2){d.blastRaw+=mul(dt,DROP.blastRateRaw);if(DROP.blastEndRaw<=d.blastRaw)d.gone=true;}}
function dropCollide(st,d,out){if(d.phase!==0||!d.collisionOn||d.gone)return;const box=circleBox(d,DROP.radiusRaw);
 for(const c of st.cannons){if(!c.collisionOn||!overlap(box,cannonRect(c)))continue;
  if(!d.bomb){if(c.balls<CANNON.maxBalls)c.balls++;out.sounds.push({se:9});d.gone=true;return;}
  const dx=c.xRaw-d.xRaw,dy=c.yRaw-d.yRaw,u=dx===0&&dy===0?{xRaw:0,yRaw:0}:N.normalizeRaw({xRaw:dx,yRaw:dy});
  out.faints.push({index:c.playerIndex,vxRaw:mul(u.xRaw,FAINT.xRaw),vyRaw:FAINT.yRaw});d.phase=1;return;}}
function createAreas(st,view){const c=st.controller,left=view.x+AREA_MARGIN,right=view.x-AREA_MARGIN+view.w,xs=st.baskets.map(b=>b.xRaw).sort((a,b)=>a-b);
 const areas=[];let cur=left;for(const x of xs){if(cur<x-AREA_MARGIN)areas.push([cur,x-AREA_MARGIN]);cur=x+AREA_MARGIN;}
 if(cur<right)areas.push([cur,right]);if(!areas.length)areas.push([left,right]);c.areas=areas;}
function controllerPost(st,dt,view,out){const c=st.controller;if(!c||c.stopped)return;
 // basketProc
 if(st.baskets.every(b=>b.score>=b.target)){out.keyEvents.push({eventType:1,broadcastActorType:17,senderId:c.id});c.stopped=true;c.cleared=true;return;}
 // ballProc
 c.timerRaw-=dt;if(c.timerRaw>0)return;if(!c.areas)createAreas(st,view);
 const area=c.areas[nextInt(st.rng,0,c.areas.length)],x=nextFP(st.rng,area[0],area[1]);let bomb=false;
 if(c.bomb!==0)bomb=nextInt(st.rng,0,100)<c.bomb;
 st.drops.push({id:'drop:'+(st.serial++),bomb,xRaw:x,yRaw:DROP.startYRaw,veloRaw:{xRaw:0,yRaw:c.speedRaw},accelRaw:c.accelRaw,phase:0,collisionOn:true,visible:true,anim:bomb?1:0,gone:false,disappearing:false,timerRaw:0});
 c.timerRaw=c.intervalRaw;}
/* One frame. host: {dtRaw, gravityRaw, viewRaw:{x,y,w,h}, players:[{index, xRaw, yRaw,
 * state1, shotHeld, alive, hidden, bodyRaw:{x,y,w,h}}], sweep(boxRaw, dxRaw, dyRaw) ->
 * {dxRaw, dyRaw, blocked}}. Returns {faints, keyEvents, sounds, shakes}. */
function step(st,host){const dt=host.dtRaw,out={faints:[],keyEvents:[],sounds:[],shakes:[]};st.prevShot=st.prevShot||{};
 for(const p of host.players){const held=!!p.shotHeld;p.shotPressed=held&&!st.prevShot[p.index];st.prevShot[p.index]=held;}
 const player=i=>host.players.find(p=>p.index===i);
 // OnUpdate (actor order: cannons with their players, then balls)
 for(const c of st.cannons)cannonUpdate(st,c,dt,player(c.playerIndex),out);
 for(const d of st.drops)if(!d.gone)dropUpdate(st,d,dt,host,out);
 for(const b of st.shots)if(!b.gone)shotUpdate(st,b,dt,host,out);
 // overlaps
 for(const d of st.drops)dropCollide(st,d,out);
 // OnPost
 for(const c of st.cannons)cannonPost(c,player(c.playerIndex));
 controllerPost(st,dt,host.viewRaw,out);
 st.drops=st.drops.filter(d=>!d.gone);st.shots=st.shots.filter(b=>!b.gone);return out;}
function stop(st){if(st.controller)st.controller.stopped=true;}// event 19
function displays(st){return {
 cannons:st.cannons.filter(c=>c.visible).map(c=>({id:c.id,playerIndex:c.playerIndex,x:c.xRaw/F,y:c.yRaw/F,angle:c.angleRaw/F,power:c.powerRaw/F,charging:c.charging,balls:c.balls})),
 baskets:st.baskets.map(b=>{const body=basketRect(b,0),mouth=basketRect(b,1);return {id:b.id,x:b.xRaw/F,y:b.yRaw/F,score:b.score,target:b.target,
  body:{x:body.x/F,y:body.y/F,w:body.w/F,h:body.h/F},mouth:{x:mouth.x/F,y:mouth.y/F,w:mouth.w/F,h:mouth.h/F}};}),
 shots:st.shots.map(b=>({id:b.id,x:b.xRaw/F,y:b.yRaw/F,r:SHOT.radiusRaw/F,colorIndex:b.colorIndex,fading:b.phase===1})),
 drops:st.drops.filter(d=>d.visible).map(d=>({id:d.id,x:d.xRaw/F,y:d.yRaw/F,r:DROP.radiusRaw/F,bomb:d.bomb,fading:d.disappearing})),
 blasts:st.drops.filter(d=>d.phase===2).map(d=>({x:d.xRaw/F,y:d.yRaw/F,t:d.blastRaw/DROP.blastEndRaw}))};}
return {compile,create,step,stop,displays,basketRect,cannonRect,createAreas,pcg32,nextInt,nextFP,
 supportedTypes:['CannonPlayer','ThrowBallBasket','ThrowBallController'],nativeConstants:{CANNON,SHOT,DROP,BASKET,AREA_MARGIN},completePhysicsFidelity:false};
});
