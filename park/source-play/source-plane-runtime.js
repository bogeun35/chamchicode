/* PlanePlayer / BattlePlanePlayer movement and life, PlayerGun and its reusable
 * bullets: the shooting rounds (6-x, 15-3), from the saved Ghidra project
 * ('PlayerComponent$$*Plane*', 'PlayerGunComponent$$', 'ResuablePlayerGunBulletComponent$$').
 * No game executed. FP 16.16.
 *  OnInitialize_Plane 0x1816c81c0: speed = PlayerComponent .cctor +0x180 (1.5) * Stage
 *   scale * QPlayerDefine walk (3); animation 8; flag 0x1000. OnInitialize_BattlePlane
 *   0x1816c1cf0: + life GetHitPointMax_BattlePlane 0x1816c25d0 (2; 3 / 5 with the
 *   +0x14 bits a PlayerGuard sets).
 *  OnUpdate_Plane 0x1816c8400: button 7 -> look right, x +1; else button 6 -> look left
 *   (flag 0x2000), x -1 unless the left face is touching; 4 / 5 -> y -1 / +1; the eight
 *   directions are the FP radians 0, 0xc8eb, 0x191d6, 0x25ac1, 0x323ac, 0x3ec97, 0x4b582,
 *   0x57e6d; vx = CalcScreenEndWalkVeloX 0x1816a1ad0 (cos * speed: |v| <= 3 raw -> 0,
 *   none past the camera view's edges), vy = sin * speed; vx += the auto scroll step;
 *   ScrollType 2: a step that would end behind the view's left edge is carried to it
 *   (moveContactActor face 3) and x - vx more than 32 px behind is event 43.
 *   movePlayerVerticalOnPlane 0x1816c9070 / movePlayerHorizontalOnPlane 0x1816c9220 push
 *   what they touch (MoveContactActor).
 *  OnUpdate_BattlePlane 0x1816c1d80 (phase +0): 0 below full life -> recover after
 *   .cctor +0x148 (3 s) to full; life 0 -> 3; 1 (hit) -> timer 3 s, SE 11, shake
 *   .cctor +0x150 (0.5 s) -> 2: draw offset (Next(0,14) - 7) * (t / 0.5)^2 each axis
 *   (PCG32 below 4 rejected) -> 0; 3 -> event 43, 4. Life <= 1 shows animation 9.
 *   Event 21 (PlayerComponent.OnRecvEvent 0x1816c1250..): alive, not flag 0x100, phase
 *   0, life > 0 -> life - 1, phase life > 0 ? 1 : 3 (AddDamage_BattlePlane 0x1816c2470).
 *  PlayerGun Creator 0x1816cd5e0 / ParseParameter 0x1816cd810: slot 0 player list index
 *   (existing players only), slot 1 interval (+0x30, > 0), slot 2 bullet speed clamped
 *   to [5, 25] (.cctor 0x1816cec70 +0x38 / '25'), slot 3 = 1 hold to fire, slot 4 1 /
 *   2 = normal players / planes only; muzzle (28, -10) or, on a plane (types 0x1a /
 *   0x6b), (30, -12). InitPost 0x1816cdb50: three reusable bullets.
 *   OnUpdate 0x1816ce150: interval count down, then a shot press (or hold) -> createBullet
 *   0x1816ce5b0: the first inactive bullet, at the player + muzzle + (14, -8) * scale
 *   (mirrored when looking left / upside down), refused when that 10x10 box (PlayerWarp
 *   GunBullet .cctor (-5, -5, 10, 10)) meets a push-back body; Resume 0x1816e95d0: velocity
 *   = normalize(+-1, 0) * speed; SE 0x14.
 *  Bullet: circle 7 (.cctor 0x1816e97e0), push back 3, layer 5. OnUpdate 0x1816e8890:
 *   outside the camera view +- 10 -> Disappear. OnContacted 0x1816e8c70: the map -> SE 3
 *   and a chip with attribute 8 whose value - 0x1e is the shooter's colour is cleared
 *   (MapComponent.ModifyMapChip(.., 1)); an actor -> event 21 to it (layer 1 or 8); either
 *   way inactive 0x1816e92a0 (stop, collision off, animation 2, 0.2 s) -> Disappear.
 * Named approximations:
 *  - plane push chains are the runtime's player-against-player blocking;
 *  - the spawn check looks at actor bodies only (UNCONFIRMED whether map chips count).
 */
(function(root,factory){const c=typeof module==='object'&&module.exports;const api=factory(c?require('./source-fplut-math.js'):root.SourceFPLutMath,c?require('./source-distanceconstraint-math.js'):root.SourceDistanceConstraintMath);if(c)module.exports=api;root.SourcePlaneRuntime=api;})(typeof globalThis!=='undefined'?globalThis:this,function(Lut,N){
'use strict';
const F=65536,B=BigInt,i64=v=>BigInt.asIntN(64,v);
const num=v=>{const n=Number(v);if(!Number.isSafeInteger(n))throw Error('Plane raw outside safe range');return n;};
const mul=(a,b)=>num(i64(B(a)*B(b))>>16n);
const clone=v=>JSON.parse(JSON.stringify(v));
const allowed=(v,c)=>!v||v<0&&c<=-v||v>0&&v<10&&c>=v||v>=10&&c>=Math.trunc(v/10)&&c<=v%10;
const fp=v=>Math.trunc(Math.fround(Math.fround(v)*F));
const PLANE={speedFactorRaw:98304,walkRaw:3*F,recoverRaw:3*F,shakeRaw:32768,lifeMax:2,behindRaw:32*F};
// (dx, dy) -> FP radians, OnUpdate_Plane 0x1816c8672..86c2
const DIRS={'1,0':0,'1,1':0xc8eb,'0,1':0x191d6,'-1,1':0x25ac1,'-1,0':0x323ac,'-1,-1':0x3ec97,'0,-1':0x4b582,'1,-1':0x57e6d};
const GUN={muzzle:{xRaw:28*F,yRaw:-10*F},planeMuzzle:{xRaw:30*F,yRaw:-12*F},extra:{xRaw:14*F,yRaw:-8*F},minSpeedRaw:5*F,maxSpeedRaw:25*F,
 checkRect:{x:-5*F,y:-5*F,w:10*F,h:10*F}};
const BULLET={radiusRaw:7*F,waitRaw:13107,offScreenRaw:10*F,pool:3};
const DEFAULT_RNG={state:'9600629759793949339',inc:'15726070495360670683'};
const PCG=6364136223846793005n,M64=(1n<<64n)-1n;
function pcg32(rng){const old=B(rng.state);rng.state=((old*PCG+(B(rng.inc)|1n))&M64).toString();const x=Number(((old>>45n)^(old>>27n))&0xffffffffn),rot=Number(old>>59n);return ((x>>>rot)|(x<<((32-rot)&31)))>>>0;}
function nextInt(rng,min,max){if(min===max)return min;let lo=max,hi=min;if(min<max){lo=min;hi=max;}const u=(hi-lo)>>>0,threshold=(2**32-u)%u;let x;do x=pcg32(rng);while(x<threshold);return lo+x%u;}
function slotFP(a,i){const d=(a.datas||[])[i];return d&&d.t===1?fp(d.f):0;}
const slotInt=(a,i)=>slotFP(a,i)>>16;
const sin=r=>Lut.sincosRaw(r)[0],cos=r=>Lut.sincosRaw(r)[1];
function planeSpeedRaw(stageScaleRaw){return mul(mul(PLANE.speedFactorRaw,stageScaleRaw||F),PLANE.walkRaw);}
// CalcScreenEndWalkVeloX 0x1816a1ad0
function screenEndWalkVeloX(posXRaw,vRaw,view){if(Math.abs(vRaw)<=3)return 0;const next=posXRaw+vRaw;
 if(vRaw<0)return view.x<=next?vRaw:0;return next<=view.x+view.w?vRaw:0;}
/* OnUpdate_Plane. a: {input:{left,right,up,down}, posXRaw, speedRaw, viewRaw:{x,w},
 * scrollRaw (this update's auto scroll step), scrollType2, leftContact}. */
function planeVelocity(a){const inp=a.input||{};let dx=0,look=null;
 if(inp.right){look='right';dx=1;}else if(inp.left){look='left';if(!a.leftContact)dx=-1;}
 const dy=inp.up?-1:inp.down?1:0;let vx=0,vy=0;
 if(dx||dy){const r=DIRS[dx+','+dy];vy=mul(sin(r),a.speedRaw);vx=screenEndWalkVeloX(a.posXRaw,mul(a.speedRaw,cos(r)),a.viewRaw);}
 vx+=a.scrollRaw||0;let carried=0,dead=false;
 if(a.scrollType2){const left=a.viewRaw.x;if(vx+a.posXRaw-(a.scrollRaw||0)<left){const add=left-(vx+a.posXRaw)+(a.scrollRaw||0);vx+=add;carried=left-a.posXRaw;}
  if(a.posXRaw-vx+PLANE.behindRaw<left)dead=true;}
 return {vxRaw:vx,vyRaw:vy,look,carriedRaw:carried,dead};}
// BattlePlane life (OnInitialize_BattlePlane / OnUpdate_BattlePlane / AddDamage)
function createLife(){return {life:PLANE.lifeMax,max:PLANE.lifeMax,shown:PLANE.lifeMax,phase:0,recoverRaw:0,shakeRaw:0,offset:{xRaw:0,yRaw:0},anim:8,deadSent:false,barrier:false,easy:false};}
// GetHitPointMax_BattlePlane 0x1816c25d0: 2, or 3 / 5 once a ShootingSuperApple equipped the barrier
const lifeMax=L=>L.max||PLANE.lifeMax;
// PlayerComponent.EquipBarrier_BattlePlane 0x1816c24a0: Flags2 |= 0x20 (easy |0x200), HP = easy ? 5 : 3
function equipBarrier(L,easy){L.barrier=true;L.easy=!!easy;L.max=easy?5:3;L.life=L.max;L.shown=L.max;return L;}
// IsBarrierDeployed_BattlePlane: Flags2 & 0x20, HP > 2, not dead
function barrierDeployed(L){return !!(L&&L.barrier&&L.life>2&&L.phase<3);}
function lifeUpdate(L,dt,rng){const out={dead:false,sounds:[]};
 if(L.life!==L.shown){L.anim=(L.life<0||L.life===1)?9:8;}L.shown=L.life;
 if(L.phase===0){if(L.life<1){L.phase=3;}else if(L.life<lifeMax(L)){L.recoverRaw-=dt;if(L.recoverRaw<1){L.life=lifeMax(L);L.recoverRaw=PLANE.recoverRaw;}}}
 else if(L.phase===1){L.recoverRaw=PLANE.recoverRaw;out.sounds.push({se:0xb});L.phase=2;L.shakeRaw=PLANE.shakeRaw;}
 else if(L.phase===2){L.shakeRaw-=dt;let k=Number((B(L.shakeRaw)<<16n)/B(PLANE.shakeRaw));k=mul(k,k);if(k<0)k=0;else if(k>F)k=F;
  const draw=()=>{let x;do x=pcg32(rng);while(x<4);return x;};const ux=draw(),uy=draw();
  L.offset={xRaw:mul((ux%14-7)*F,k),yRaw:mul((uy%14-7)*F,k)};if(L.shakeRaw<1){L.offset={xRaw:0,yRaw:0};L.phase=0;}}
 else if(L.phase===3){L.phase=4;out.dead=true;}
 return out;}
// PlayerComponent.OnRecvEvent event 21 on a battle plane
function lifeDamage(L,{invincible=false}={}){if(invincible||L.phase!==0||L.life<1)return false;L.life-=1;L.phase=L.life>0?1:3;return true;}
function compileGuns(actors,count){const guns=[];
 actors.forEach((raw,i)=>{const a=raw.properties||raw;if(a.typeName!=='PlayerGun'||!allowed(a.playerCount,count))return;const idx=slotInt(a,0);if(idx<0||idx>=count)return;
  let speed=slotFP(a,2)>0?Math.min(Math.max(slotFP(a,2),GUN.minSpeedRaw),GUN.maxSpeedRaw):GUN.minSpeedRaw;
  guns.push({id:raw.id||'source:a'+i,playerIndex:idx,intervalRaw:slotFP(a,1)>0?slotFP(a,1):0,speedRaw:speed,hold:slotInt(a,3)===1,restrict:slotInt(a,4),coolRaw:0,
   bullets:Array.from({length:BULLET.pool},(_,k)=>({id:(raw.id||'source:a'+i)+':b'+k,active:false,waiting:false,timerRaw:0,xRaw:0,yRaw:0,veloRaw:{xRaw:0,yRaw:0},anim:0}))});});
 return guns;}
/* One frame of the guns and bullets. host: {dtRaw, viewRaw:{x,w}, players:[{index,
 * xRaw, yRaw, lookLeft, plane, state3 (dead), shotHeld, alive, colorIndex, bodyRaw}],
 * blocked(boxRaw) -> spawn refused, sweep(boxRaw, dxRaw, dyRaw) -> {dxRaw, dyRaw, hit:null |
 * {kind:'map', chip} | {kind:'actor', target}}, breakChip(chip, colorIndex)}. */
function gunStep(st,host){const dt=host.dtRaw,out={damage:[],sounds:[]};st.prevShot=st.prevShot||{};
 for(const p of host.players){const held=!!p.shotHeld;p.shotPressed=held&&!st.prevShot[p.index];st.prevShot[p.index]=held;}
 for(const g of st.guns){const p=host.players.find(q=>q.index===g.playerIndex);if(!p)continue;g.hidden=!!p.state3;
  if(g.restrict===1&&p.plane||g.restrict===2&&!p.plane)continue;
  if(g.coolRaw>0){g.coolRaw-=dt;if(g.coolRaw>0)continue;}
  if(!p.alive||!(g.hold?p.shotHeld:p.shotPressed))continue;
  g.coolRaw=g.intervalRaw;// OnUpdate resets the interval after createBullet whatever it did
  const b=g.bullets.find(q=>!q.active&&!q.waiting);if(!b)continue;
  const m=p.plane?GUN.planeMuzzle:GUN.muzzle,sx=p.scaleRaw||F,ox=m.xRaw+mul(sx,GUN.extra.xRaw),oy=m.yRaw+mul(sx,GUN.extra.yRaw),
   x=p.xRaw+(p.lookLeft?-ox:ox),y=p.yRaw+(p.upsideDown?-oy:oy),box={x:x+mul(sx,GUN.checkRect.x),y:y+mul(sx,GUN.checkRect.y),w:mul(sx,GUN.checkRect.w),h:mul(sx,GUN.checkRect.h)};
  if(host.blocked(box,p.index))continue;
  const d=N.normalizeRaw({xRaw:p.lookLeft?-F:F,yRaw:0});
  Object.assign(b,{active:true,waiting:false,xRaw:x,yRaw:y,veloRaw:{xRaw:mul(d.xRaw,g.speedRaw),yRaw:mul(d.yRaw,g.speedRaw)},anim:1,colorIndex:p.colorIndex,owner:p.index});
  out.sounds.push({se:0x14});}
 for(const g of st.guns)for(const b of g.bullets){
  if(b.waiting){b.timerRaw-=dt;if(b.timerRaw<1){b.waiting=false;b.active=false;}continue;}
  if(!b.active)continue;
  const r=BULLET.radiusRaw,m=host.sweep({x:b.xRaw-r,y:b.yRaw-r,w:2*r,h:2*r},b.veloRaw.xRaw,b.veloRaw.yRaw,b.owner);
  b.xRaw+=m.dxRaw;b.yRaw+=m.dyRaw;
  if(m.hit){if(m.hit.kind==='map'){out.sounds.push({se:3});if(m.hit.chip)host.breakChip(m.hit.chip,b.colorIndex);}
   else if(m.hit.kind==='actor')out.damage.push({target:m.hit.target,from:b.owner,vxRaw:b.veloRaw.xRaw});
   b.active=false;b.waiting=true;b.timerRaw=BULLET.waitRaw;b.veloRaw={xRaw:0,yRaw:0};b.anim=2;continue;}
  if(!(host.viewRaw.x-BULLET.offScreenRaw<=b.xRaw&&b.xRaw<host.viewRaw.x+host.viewRaw.w+BULLET.offScreenRaw))b.active=false;}
 return out;}
function displays(st){return {bullets:st.guns.flatMap(g=>g.bullets.filter(b=>b.active||b.waiting).map(b=>({id:b.id,x:b.xRaw/F,y:b.yRaw/F,r:BULLET.radiusRaw/F,colorIndex:b.colorIndex,fading:b.waiting}))),
 guns:st.guns.map(g=>({playerIndex:g.playerIndex,hidden:!!g.hidden}))};}
return {planeSpeedRaw,screenEndWalkVeloX,planeVelocity,createLife,lifeUpdate,lifeDamage,equipBarrier,barrierDeployed,compileGuns,gunStep,displays,pcg32,nextInt,supportedTypes:['PlayerGun','PlanePlayer','BattlePlanePlayer'],
 nativeConstants:{PLANE,DIRS,GUN,BULLET},completePhysicsFidelity:false};
});
