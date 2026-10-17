/* ShootingEnemyBoss (109), ShootingEnemyBossEx (117), their missiles
 * (ResuableShootingEnemyMissile 141), ShootingEnemyBossExParamSetter (139), PlayerGuard (28)
 * and ShootingSuperApple (131): 6-4 / 15-3, the playable reconstruction from the saved
 * Ghidra project; the full reading with every address is notes/shooting-boss-spec.md.
 * No game executed. FP 16.16. The bullets and BossEx's homing enemies live in
 * source-shooting-runtime.js (the OptimizedBullet pool and the reusable ShootingEnemy).
 *  Base (ShootingEnemyBossBaseComponent): ParseParameter 0x1816f5240 (HP [count - 2],
 *   core HP %, attack speed / bullet speed clamps, special frequency, move speed / height,
 *   entry offset, cores per count, the name told on death, the scroll x that wakes it,
 *   the easy-mode game-over count); InitCollision 0x1816f58a0: cores (off), hatches,
 *   body, layer 8; OnStart 0x1816f6150 (pair = the other boss); OnUpdate 0x1816f64a0
 *   (wake at Stage scroll x >= slot 29, Behaviour, MovedInitPos.x += CalcAutoScrollSpeed
 *   0x18170d680, HP 0 -> 7, low HP in 3 -> 4, the hit shake's two RNG draws, Pos =
 *   MovedInitPos + MovePos); Behaviour 0x1816f7a20 (enter, fight, expose cores 0.5 s /
 *   6 s / store 0.5 s, die 5 s + 0.5 s -> event 61 by name unless the pair lives);
 *   MoveState 0x181700470 / Move 0x181700930 (2 px a frame, x 1.2 at low HP, up / down
 *   by the height, RNG (r & 1) picks); OnRecvEvent 0x1816f6ba0 (event 21: 1 in state 3,
 *   cores only and 2 in 4..6 unless easy mode); OnCollided 0x1816f9ac0 (any part kills
 *   a player: event 43).
 *  Boss AttackState 0x1816f37e0: usual scissor pairs from (-199, -+54) every 0.35 s for
 *   5 s, the special 9-missile volley every 2 s for 5 s (out of the screen), the dying
 *   attack (sin(2 t) * 0xdf3e pairs every 0.3 s + a missile from Next(0, 3) every 1 s),
 *   every freq-th choice special (ShootingEnemyBossParameter.Initialize 0x181702470).
 *  Missile: .cctor 0x1816ebf50 192 x 48 at (-192, -24), layer 5, +6 per s up to 12, gone
 *   left of the view by 180; OnCollided 0x1816eb6f0 / killPlayer 0x1816eb860.
 *  BossEx ExAttackState 0x1816fb120 (attack speed 0.1): homing bullets at a random gun
 *   player, the special homing enemies at a random guard player from outside the view
 *   (GetRandomOutsidePosition 0x1816fc320), the dying attack, and the sync with the pair.
 *  PlayerGuard .cctor 0x1816ccc80 / syncPlayerPos 0x1816cc920: VerticalLong 6 x 84 at the
 *   direction's offset, flipped with the facing when slot 3 is 1; it has no life.
 *  ShootingSuperApple Creator 0x1817080b0: only from GameOverCount >= slot 0; OnCollided
 *   0x181708570 equips the barrier (EquipBarrier_BattlePlane 0x1816c24a0).
 * Named approximations:
 *  - one module PCG stream (the planes') stands for the frame RNG;
 *  - the guard rect follows this frame's player position (OnPost may be a frame behind);
 *  - the apple's 48 x 48 rect takes its actor scale 1.5 (AddActor rule, UNCONFIRMED).
 */
(function(root,factory){const c=typeof module==='object'&&module.exports;const api=factory(c?require('./source-fplut-math.js'):root.SourceFPLutMath,c?require('./source-distanceconstraint-math.js'):root.SourceDistanceConstraintMath);if(c)module.exports=api;root.SourceBossRuntime=api;})(typeof globalThis!=='undefined'?globalThis:this,function(Lut,N){
'use strict';
const F=65536,B=BigInt,i64=v=>BigInt.asIntN(64,v);
const num=v=>{const n=Number(v);if(!Number.isSafeInteger(n))throw Error('Boss raw outside safe range');return n;};
const mul=(a,b)=>num(i64(B(a)*B(b))>>16n),div=(a,b)=>num(i64(B(a)<<16n)/B(b));
const clone=v=>JSON.parse(JSON.stringify(v));
const allowed=(v,c)=>!v||v<0&&c<=-v||v>0&&v<10&&c>=v||v>=10&&c>=Math.trunc(v/10)&&c<=v%10;
const fp=v=>Math.trunc(Math.fround(Math.fround(v)*F));
const PCG=6364136223846793005n,M64=(1n<<64n)-1n;
function pcg32(rng){const old=B(rng.state);rng.state=((old*PCG+(B(rng.inc)|1n))&M64).toString();const x=Number(((old>>45n)^(old>>27n))&0xffffffffn),rot=Number(old>>59n);return ((x>>>rot)|(x<<((32-rot)&31)))>>>0;}
function nextInt(rng,min,max){if(min===max)return min;let lo=max,hi=min;if(min<max){lo=min;hi=max;}const u=(hi-lo)>>>0,threshold=(2**32-u)%u;let x;do x=pcg32(rng);while(x<threshold);return lo+x%u;}
const pcgAbove=(rng,n)=>{let x;do x=pcg32(rng);while(x<n);return x;};
const sin=r=>Lut.sincosRaw(r)[0];
function rotate(v,th){const [s,c]=Lut.sincosRaw(th);return {xRaw:mul(v.xRaw,c)-mul(v.yRaw,s),yRaw:mul(v.xRaw,s)+mul(v.yRaw,c)};}
const len=(x,y)=>N.sqrtRaw(B(mul(x,x)+mul(y,y)));
const R=(h,w,x,y)=>({x:x*F,y:y*F,w:w*F,h:h*F});// .cctor order H, W, X, Y
const V=(x,y)=>({xRaw:x*F,yRaw:y*F});
// ShootingEnemyBossBaseComponent .cctor 0x1816f7550
const BASE={coreExposure:393216,coreEffect:32768,postUpDownStop:13107,postHome:32768,dyingMul:78643,blink:13107,dead:327680};
// ShootingEnemyBoss .cctor 0x1816fa440 / ShootingEnemyBossEx .cctor 0x1816fe320
const SHAPES={
 boss:{top:V(-199,-54),bot:V(-199,54),
  missiles:[[-70,-280],[-120,-216],[-139,-144],[-139,-72],[-150,0],[-139,72],[-139,144],[-120,216],[-70,280]].map(([x,y])=>V(x,y)),
  primary:[V(-60,0),V(-30,183),V(-30,-184)],
  cores:[R(70,69,-12,-35),R(69,69,-12,-242),R(70,69,-12,172)],hatches:[R(100,280,-170,-50),R(73,99,-30,-244),R(73,99,-30,171)],
  body:[R(62,240,-117,-105),R(66,55,-7,-169),R(61,130,62,-222),R(61,240,-117,43),R(66,55,-7,103),R(61,130,62,159)]},
 ex:{top:V(155,-192),bot:V(155,192),spawn:[V(110,-93),V(110,93)],
  cores:[R(70,69,-1,-35),R(69,69,-1,-209),R(70,69,-1,138)],hatches:[R(73,120,-8,-36),R(74,120,-8,-211),R(73,120,-8,137)],
  body:[R(99,231,-73,-137),R(49,200,-77,-259),R(210,139,-142,-210),R(100,231,-73,36),R(49,200,-77,209),R(210,139,-142,0)]}};
// ShootingEnemyBossParameter.Initialize 0x181702470 / ShootingEnemyBossExParameter.Initialize 0x181700070
const BOSS_PARAM={choose:F,usualVel:196608,usualRate:22937,usualTime:327680,usualStop:32768,specialRate:131072,specialTime:327680,specialStop:F,
 dyingGunVel:262144,dyingGunRate:19660,dyingMissileRate:F,dyingTime:327680,dyingStop:F};
const EX_PARAM={usualVel:163840,usualRate:32768,usualTime:131072,usualStop:131072,specialEnemyVel:131072,specialRate:26214,
 dyingGunVel:229376,dyingGunRate:32768,dyingEnemyVel:163840,dyingEnemyRate:F,dyingTime:131072,dyingStop:131072};
const EX_SPECIAL_TIME=0x40000,EX_OUTSIDE=70*F,EX_OUTSIDE_Y=140*F,EASY_EX_HP=43690;
// ResuableShootingEnemyMissile .cctor 0x1816ebf50
const MISSILE={rect:R(48,192,-192,-24),accel:393216,max:786432,disappear:13107,margin:180*F,pool:18};
// PlayerGuard .cctor 0x1816ccc80
const GUARD={rects:[R(60,6,-3,-30),R(84,6,-3,-42),R(6,48,-24,-3),R(6,64,-32,-3)],offsets:[V(0,-56),V(0,10),V(-28,-24),V(30,-24)],types:[2,2,0,0],upY:-7*F};
// ShootingSuperApple .cctor 0x181708840 (48 x 48 at -24), actor scale 1.5, RequestDisappear 0.75 s
const APPLE={rect:R(48,48,-24,-24),scale:98304,disappear:49152};
function slotRaw(a,i){const d=(a.datas||[])[i];return d&&d.t===1?fp(d.f):null;}
const slotInt=(a,i)=>{const v=slotRaw(a,i);return v===null?null:v>>16;};
function slotStr(a,i){const d=(a.datas||[])[i];return d&&d.t===2?d.s||'':'';}
function sm(){return {state:0,onStart:0,while:0,access:0,timerRaw:0};}
function setState(m,v){m.state=v;m.access=m.while;m.onStart=1;}
const begin=m=>{m.while=1;},end=m=>{m.while=0;if(m.access===0)m.onStart=0;m.access=0;};
// the common count-down: expired when Timer - dt <= 0 (Timer clamps at 0)
function countDown(m,dt){const v=m.timerRaw-dt;if(v<0){m.timerRaw=0;return true;}m.timerRaw=v;return v===0;}
function timerUpdate(m,dt){m.timerRaw=Math.max(0,m.timerRaw-dt);return m.timerRaw<1;}
function compileBoss(raw,i,count,kind){const a=raw.properties||raw,need=(k,v)=>{if(v===null)throw Error(a.typeName+' slot '+k+' must be a number');return v;};
 const hpRow=slotInt(a,count-2),cores=slotInt(a,16+count-2),atk=slotRaw(a,9),vel=need(10,slotRaw(a,10));
 const b={id:raw.id||'source:a'+i,name:a.name||'',kind,xRaw:fp(a.posX),yRaw:fp(a.posY),
  hpMax:Math.max(1,hpRow===null?0:hpRow),rate:Math.max(0,Math.min(100,need(8,slotInt(a,8)))),attackSpeedRaw:atk===null?0x1999:Math.max(0x1999,Math.min(0x40000,atk)),
  bulletVelRaw:Math.max(0x1999,Math.min(0x50000,vel)),freq:Math.max(0,need(11,slotInt(a,11))),moveSpeedRaw:Math.max(need(12,slotInt(a,12)),1)<<16,
  moveHeightRaw:Math.max(0,need(13,slotInt(a,13)))<<16,entry:{xRaw:need(14,slotInt(a,14))<<16,yRaw:need(15,slotInt(a,15))<<16},
  cores:Math.max(1,Math.min(3,cores===null?1:cores)),uiOverhead:slotInt(a,24)===1,ui:{x:(slotRaw(a,25)||0)/F,y:(slotRaw(a,26)||0)/F,scale:Math.max(F,slotRaw(a,27)||F)/F},
  targetName:slotStr(a,28),activeScrollXRaw:slotRaw(a,29)===null?0:slotRaw(a,29),easyCount:((slotRaw(a,30)||0)>>>0)>>>16};
 b.hp=b.hpMax;return b;}
function compile(actors,count,options={}){
 if(!Number.isInteger(count)||count<2||count>8)throw Error('Boss count 2..8 required');
 const bosses=[],guards=[],apples=[],setters=[];
 actors.forEach((raw,i)=>{const a=raw.properties||raw;if(!allowed(a.playerCount,count))return;const id=raw.id||'source:a'+i;
  if(a.typeName==='ShootingEnemyBoss')bosses.push(compileBoss(raw,i,count,'boss'));
  else if(a.typeName==='ShootingEnemyBossEx')bosses.push(compileBoss(raw,i,count,'ex'));
  else if(a.typeName==='ShootingEnemyBossParamSetter')throw Error('ShootingEnemyBossParamSetter is not reconstructed (not placed in 6-4 / 15-3)');
  else if(a.typeName==='ShootingEnemyBossExParamSetter'){const r=k=>{const v=slotRaw(a,k);return v===null?0x1999:Math.max(0x1999,Math.min(0x80000,v));},t=k=>{const v=slotRaw(a,k);return v===null?0:Math.max(0,Math.min(0x80000,v));};
   setters.push({id,timing:slotInt(a,0)||0,param:{usualVel:r(1),usualRate:r(2),usualTime:t(3),usualStop:t(4),specialEnemyVel:r(5),specialRate:r(6),dyingGunVel:r(7),dyingGunRate:r(8),
    dyingEnemyVel:r(9),dyingEnemyRate:r(10),dyingTime:t(11),dyingStop:t(12)},target:null,setted:false,pairAtStart:false});}
  else if(a.typeName==='PlayerGuard'){const idx=slotInt(a,0);if(idx===null||idx<0||idx>=count)return;// Creator 0x1816cc2d0: only for an existing player
   const dir=slotInt(a,1)||0,long=slotInt(a,2)===1;let type=GUARD.types[dir]??0;if(long)type=type===0?1:type===2?3:type;
   guards.push({id,playerIndex:idx,direction:dir,type,flip:slotInt(a,3)===1});}
  else if(a.typeName==='ShootingSuperApple')apples.push({id,xRaw:fp(a.posX),yRaw:fp(a.posY),validCount:slotInt(a,0)||0,easyCount:slotInt(a,1)||0,eaten:false,timerRaw:0,removed:false});
 });
 return {schemaVersion:1,count,bosses,guards,apples,setters,started:false,completePhysicsFidelity:false};
}
const create=clone;
const alive=b=>b&&!b.removed;
const pairOf=(st,b)=>b.pair?st.bosses.find(q=>q.id===b.pair):null;
const pairValid=(st,b)=>alive(pairOf(st,b));
function isLowHP(b){const f=Math.trunc((b.rate<<16)/100),u=f*b.hpMax;let n=Math.floor(u/F);if((u&0xffff)>=0x8000)n++;return b.hp<=n;}
const easyMode=(b,host)=>b.easyCount!==0&&(host.gameOverCount||0)>=b.easyCount;
// Creator + InitPost + OnStart, at the first update (host: {rng, gameOverCount, players, guns,
// addReusableEnemies(owner, n)}). The apples below GameOverCount never exist (Creator 0x1817080b0).
function start(st,host){if(st.started)return;st.started=true;
 for(const b of st.bosses){const shape=SHAPES[b.kind];
  b.parts={cores:shape.cores.map(()=>false),hatches:shape.hatches.map(()=>true)};b.lastHit=0;
  b.behaviour=sm();b.move=sm();b.attack={...sm(),count:0,gunRaw:0,gun2Raw:0,isTop:false,target:null};
  b.movePos={xRaw:0,yRaw:0};b.movedInit={xRaw:b.xRaw,yRaw:b.yRaw};b.pos={xRaw:b.xRaw,yRaw:b.yRaw};b.damageRaw=0;b.offset={xRaw:0,yRaw:0};b.anim=1;b.removed=false;
  if(b.kind==='boss'){b.param={...BOSS_PARAM};b.missiles=Array.from({length:MISSILE.pool},(_,k)=>({id:b.id+':m'+k,hidden:true,exploding:false,timerRaw:0,xRaw:0,yRaw:0,veloRaw:{xRaw:0,yRaw:0},speedRaw:b.bulletVelRaw,collision:false}));}
  else{b.param={...EX_PARAM};host.addReusableEnemies(b.id,8);if(easyMode(b,host))b.hp=Math.ceil(b.hpMax*EASY_EX_HP/F);}}
 for(const b of st.bosses){const other=st.bosses.find(q=>q!==b);b.pair=other?other.id:null;}
 for(const b of st.bosses)if(b.kind==='ex'){b.gunPlayers=[];b.guardPlayers=[];
  for(let i=0;i<host.players.length;i++){if(st.guards.some(g=>g.playerIndex===i))b.guardPlayers.push(i);else if(host.guns.some(g=>g.playerIndex===i))b.gunPlayers.push(i);}}
 for(const s of st.setters){const ex=st.bosses.filter(b=>b.kind==='ex').pop()||null;s.target=ex?ex.id:null;s.pairAtStart=!!(ex&&pairValid(st,ex));
  if(ex&&s.timing===0){ex.param={...s.param};s.setted=true;}}
 for(const a of st.apples)if((host.gameOverCount||0)<a.validCount)a.removed=true;
}
// MoveState.Move 0x181700930: frames, no dt; snap when within the (unscaled) speed
function moveTo(b,target){const dx=target.xRaw-b.movePos.xRaw,dy=target.yRaw-b.movePos.yRaw,l=len(dx,dy);
 if(l<=b.moveSpeedRaw){b.movePos={...target};return true;}
 const d=N.normalizeRaw({xRaw:dx,yRaw:dy}),step=Math.min(isLowHP(b)?mul(BASE.dyingMul,b.moveSpeedRaw):b.moveSpeedRaw,l);
 b.movePos={xRaw:b.movePos.xRaw+mul(d.xRaw,step),yRaw:b.movePos.yRaw+mul(d.yRaw,step)};return false;}
function moveUpdate(b,dt,rng){const m=b.move;begin(m);const e=b.entry;
 switch(m.state){
  case 1:if(moveTo(b,e))setState(m,2);break;
  case 3:if(moveTo(b,{xRaw:e.xRaw,yRaw:e.yRaw-b.moveHeightRaw}))setState(m,4);break;
  case 5:if(moveTo(b,{xRaw:e.xRaw,yRaw:e.yRaw+b.moveHeightRaw}))setState(m,6);break;
  case 4:case 6:if(m.onStart)m.timerRaw=isLowHP(b)?0:BASE.postUpDownStop;if(countDown(m,dt))setState(m,7);break;
  case 7:if(m.onStart)m.timerRaw=BASE.postUpDownStop;if(moveTo(b,e)&&countDown(m,dt))setState(m,(pcg32(rng)&1)*2+3);break;
  case 8:if(moveTo(b,{xRaw:0,yRaw:0}))setState(m,9);break;}
 end(m);}
// ExposeCore 0x1816f8160 / StoreCore 0x1816f88c0
function exposeCore(b){const n=b.cores;b.parts.hatches=n===1?[false,true,true]:n===2?[true,false,false]:[false,false,false];b.parts.cores=n===1?[true,false,false]:n===2?[false,true,true]:[true,true,true];b.anim=n+1;}
function storeCore(b){b.parts.hatches=[true,true,true];b.parts.cores=[false,false,false];b.anim=b.cores+4;}
function behaviourUpdate(st,b,dt,host,out){const m=b.behaviour;begin(m);
 switch(m.state){
  case 1:setState(m,2);break;
  case 2:if(m.onStart){m.timerRaw=BASE.postHome;setState(b.move,1);}if(b.move.state===2&&countDown(m,dt))setState(m,3);break;
  case 4:if(m.onStart){m.timerRaw=BASE.coreEffect;exposeCore(b);}if(countDown(m,dt))setState(m,5);break;
  case 5:if(m.onStart)m.timerRaw=BASE.coreExposure;if(!isLowHP(b)&&countDown(m,dt))setState(m,6);break;
  case 6:if(m.onStart){m.timerRaw=BASE.coreEffect;storeCore(b);}if(countDown(m,dt))setState(m,3);break;
  case 7:{if(m.onStart){m.timerRaw=BASE.dead;out.flash=true;}const r1=pcgAbove(host.rng,6)%10,r2=pcgAbove(host.rng,6)%10;
   let q=F-div(m.timerRaw,BASE.dead);q=Math.max(0,Math.min(F,mul(q,q)));b.offset={xRaw:mul((r1-5)*F,F-q),yRaw:mul((r2-5)*F,F-q)};
   if(countDown(m,dt))setState(m,8);break;}
  case 8:if(m.onStart)m.timerRaw=BASE.postHome;if(countDown(m,dt)){if(!pairValid(st,b)&&b.targetName)out.notify.push({targetName:b.targetName,eventType:61});b.removed=true;}break;}
 end(m);}
function baseUpdate(st,b,dt,host,out){const m=b.behaviour;
 if(m.state<1&&b.activeScrollXRaw>=0&&host.scrollXRaw>=b.activeScrollXRaw)setState(m,1);
 behaviourUpdate(st,b,dt,host,out);if(b.removed)return;
 b.movedInit.xRaw+=host.scrollStepRaw;
 if(b.hp<1&&m.state<7)setState(m,7);
 if(isLowHP(b)&&m.state===3)setState(m,4);
 if(b.damageRaw>0){b.damageRaw=Math.max(0,b.damageRaw-dt);const r1=pcgAbove(host.rng,4)%12,r2=pcg32(host.rng)&3;
  const k=F-div(b.damageRaw,BASE.blink);let q=k<0?0:Math.min(F,mul(k,k));b.offset={xRaw:mul((r1-6)*F,F-q),yRaw:mul((r2-2)*F,F-q)};}
 b.pos={xRaw:b.movedInit.xRaw+b.movePos.xRaw,yRaw:b.movedInit.yRaw+b.movePos.yRaw};b.lastHit=0;}
const add=(p,o)=>({xRaw:p.xRaw+o.xRaw,yRaw:p.yRaw+o.yRaw});
function fireBoss(b,host,dir,speedRaw,out,extra){const sh=SHAPES[b.kind];
 return host.createBullet(add(b.pos,sh.top),{xRaw:mul(dir.top.xRaw,speedRaw),yRaw:mul(dir.top.yRaw,speedRaw)},extra)|host.createBullet(add(b.pos,sh.bot),{xRaw:mul(dir.bot.xRaw,speedRaw),yRaw:mul(dir.bot.yRaw,speedRaw)},extra);}
// CreateMissile 0x1816fa180: the first hidden missile -> Resume (the velocity is the one given at creation)
function createMissile(b,pos,dir){const ms=b.missiles.find(q=>q.hidden);if(!ms)return false;const u=N.normalizeRaw(dir);
 Object.assign(ms,{hidden:false,exploding:false,collision:true,xRaw:pos.xRaw,yRaw:pos.yRaw,veloRaw:{xRaw:mul(u.xRaw,ms.speedRaw),yRaw:mul(u.yRaw,ms.speedRaw)},anim:1});return true;}
function attackBoss(st,b,dt,host,out){const A=b.attack,P=b.param,base=b.behaviour.state;begin(A);
 const vel=k=>mul(k,b.bulletVelRaw),rate=k=>div(k,b.attackSpeedRaw);
 switch(A.state){
  case 0:if(base>=3&&base<=7)setState(A,8);break;
  case 1:if(A.onStart){A.timerRaw=P.usualStop;setState(b.move,1);}if(b.move.state===2&&countDown(A,dt))setState(A,2);break;
  case 2:{if(A.onStart){A.timerRaw=P.usualTime;setState(b.move,3);A.gunRaw=0;A.gun2Raw=0;}
   A.gunRaw-=dt;if(A.gunRaw<1){const u=Math.max(0,Math.min(F,F-div(A.timerRaw,P.usualTime))),th=num((i64(B(mul(u,-120*F))*0x477n))>>16n),v=rotate({xRaw:0,yRaw:-F},th);
    fireBoss(b,host,{top:{xRaw:v.xRaw,yRaw:-v.yRaw},bot:v},vel(P.usualVel),out);A.gunRaw=rate(P.usualRate);out.sounds.push({se:0x14});}
   if(countDown(A,dt))setState(A,8);break;}
  case 3:if(A.onStart){A.timerRaw=P.specialStop;setState(b.move,8);}if(b.move.state===9&&countDown(A,dt))setState(A,4);break;
  case 4:if(A.onStart){A.timerRaw=P.specialTime;A.gunRaw=0;}
   A.gunRaw-=dt;if(A.gunRaw<1){A.gunRaw=rate(P.specialRate);for(const p of SHAPES.boss.missiles)createMissile(b,add(b.pos,p),{xRaw:-F,yRaw:0});out.sounds.push({se:0x14});}
   if(countDown(A,dt)){setState(A,8);if(b.behaviour.state===3)setState(b.behaviour,4);}break;
  case 6:if(A.onStart){A.timerRaw=P.dyingStop;setState(b.move,1);}if(b.move.state===2&&countDown(A,dt))setState(A,7);break;
  case 7:{if(A.onStart){A.timerRaw=P.dyingTime;setState(b.move,3);A.gunRaw=0;A.gun2Raw=0;}
   A.gunRaw-=dt;if(A.gunRaw<1){const th=mul(sin(A.timerRaw*2),0xdf3e),v=rotate({xRaw:-F,yRaw:0},th);
    fireBoss(b,host,{top:{xRaw:v.xRaw,yRaw:-v.yRaw},bot:v},vel(P.dyingGunVel),out);A.gunRaw=rate(P.dyingGunRate);out.sounds.push({se:0x14});}
   A.gun2Raw-=dt;if(A.gun2Raw<1){if(!easyMode(b,host)){const k=nextInt(host.rng,0,3);createMissile(b,add(b.pos,SHAPES.boss.primary[k]),{xRaw:-F,yRaw:0});out.sounds.push({se:0x14});}A.gun2Raw=rate(P.dyingMissileRate);}
   if(countDown(A,dt))setState(A,8);break;}
  case 8:{if(A.onStart){A.timerRaw=P.choose;setState(b.move,1);}
   if(b.move.state!==2)break;if(!isLowHP(b)&&base>=4&&base<=6)break;
   if(timerUpdate(A,dt)){const f=b.freq;setState(A,f<2||A.count%f===f-1?3:isLowHP(b)?6:1);A.count++;}break;}}
 end(A);}
function pickPlayer(list,host){if(!list.length)return null;return list[nextInt(host.rng,0,list.length)];}
// GetRandomOutsidePosition 0x1816fc320: 70 px outside the view's left or right, Next(0, (H/2 - 140) >> 16) off its middle
function outsidePosition(host){const v=host.viewRaw,r1=pcg32(host.rng),r2=pcg32(host.rng),k=nextInt(host.rng,0,(Math.trunc(v.h/2)-EX_OUTSIDE_Y)>>16);
 return {xRaw:v.x+Math.trunc(v.w/2)+((r1&1)?1:-1)*(Math.trunc(v.w/2)+EX_OUTSIDE),yRaw:v.y+Math.trunc(v.h/2)+((r2&1)?1:-1)*(k<<16)};}
function homingShot(b,host,speedRaw,out){const A=b.attack,target=pickPlayer(b.gunPlayers,host),sh=SHAPES.ex,muzzle=add(b.pos,A.isTop?sh.top:sh.bot);
 const p=target===null?null:host.players.find(q=>q.index===target);const dir=p?N.normalizeRaw({xRaw:p.xRaw-muzzle.xRaw,yRaw:p.yRaw-muzzle.yRaw}):{xRaw:F,yRaw:0};
 host.createBullet(muzzle,{xRaw:mul(dir.xRaw,speedRaw),yRaw:mul(dir.yRaw,speedRaw)},{target,sprite:1});A.isTop=!A.isTop;out.sounds.push({se:0x14});}
function attackEx(st,b,dt,host,out){const A=b.attack,P=b.param,base=b.behaviour.state;begin(A);
 const vel=k=>mul(k,b.bulletVelRaw),rate=k=>div(k,b.attackSpeedRaw);
 switch(A.state){
  case 0:if(base>=3&&base<=7)setState(A,1);break;
  case 1:{if(A.onStart){A.timerRaw=isLowHP(b)?P.dyingStop:P.usualStop;setState(b.move,1);}
   if(!isLowHP(b)&&base>=4&&base<=6||b.move.state!==2)break;
   if(countDown(A,dt)){let next=isLowHP(b)?6:2;if(!pairValid(st,b)&&pcgAbove(host.rng,4)%6===0)next=3;setState(A,next);}break;}
  case 2:if(A.onStart){A.timerRaw=P.usualTime;setState(b.move,3);A.gunRaw=0;A.gun2Raw=0;}
   A.gunRaw-=dt;if(A.gunRaw<1){homingShot(b,host,vel(P.usualVel),out);A.gunRaw=rate(P.usualRate);}
   if(countDown(A,dt))setState(A,1);break;
  case 3:if(A.onStart)setState(b.move,1);if(b.move.state===2)setState(A,4);break;
  case 4:if(A.onStart){A.timerRaw=EX_SPECIAL_TIME;setState(b.move,8);A.gunRaw=0;}
   if(b.move.state===9){A.gunRaw-=dt;if(A.gunRaw<1){const pos=outsidePosition(host),target=pickPlayer(b.guardPlayers,host);
     host.resumeHomingEnemy(b.id,pos,{xRaw:pos.xRaw>0?F:-F,yRaw:0},vel(P.specialEnemyVel),target);A.gunRaw=rate(P.specialRate);out.sounds.push({se:0x14});}
    if(!pairValid(st,b)&&countDown(A,dt)){setState(A,1);if(b.behaviour.state===3)setState(b.behaviour,4);setState(b.move,1);}}break;
  case 6:if(A.onStart){setState(b.move,3);A.timerRaw=P.dyingTime;A.gunRaw=0;A.gun2Raw=0;}
   A.gunRaw-=dt;if(A.gunRaw<1){homingShot(b,host,vel(P.dyingGunVel),out);A.gunRaw=rate(P.dyingGunRate);}
   A.gun2Raw-=dt;if(A.gun2Raw<1){const k=nextInt(host.rng,0,2),target=pickPlayer(b.guardPlayers,host);
    host.resumeHomingEnemy(b.id,add(b.pos,SHAPES.ex.spawn[k]),{xRaw:F,yRaw:0},vel(P.dyingEnemyVel),target);out.sounds.push({se:0x14});A.gun2Raw=rate(P.dyingEnemyRate);}
   if(timerUpdate(A,dt))setState(A,1);break;}
 end(A);
 // the pair sync, every frame while the pair lives
 const pr=pairOf(st,b);if(alive(pr)&&pr.kind==='boss'){const ps=pr.attack.state;
  if([1,2,6].includes(A.state)&&ps===3)setState(A,3);
  else if([3,4].includes(A.state)&&ps===8){if(b.behaviour.state===3)setState(b.behaviour,4);setState(b.move,1);setState(A,1);}}}
// missile OnUpdate 0x1816eb1a0 then Pos += Velo
function missileUpdate(ms,dt,host){
 if(ms.exploding){ms.timerRaw-=dt;if(ms.timerRaw<1){ms.exploding=false;ms.hidden=true;ms.collision=false;ms.veloRaw={xRaw:0,yRaw:0};ms.xRaw=0;ms.yRaw=0;}return;}
 if(ms.hidden)return;
 if(ms.xRaw<host.viewRaw.x-MISSILE.margin){ms.hidden=true;ms.collision=false;ms.veloRaw={xRaw:0,yRaw:0};ms.xRaw=0;ms.yRaw=0;return;}
 if(ms.veloRaw.xRaw||ms.veloRaw.yRaw){const s=Math.min(len(ms.veloRaw.xRaw,ms.veloRaw.yRaw)+mul(dt,MISSILE.accel),MISSILE.max),u=N.normalizeRaw(ms.veloRaw);ms.speedNow=s;ms.veloRaw={xRaw:mul(u.xRaw,s),yRaw:mul(u.yRaw,s)};}
 ms.xRaw+=ms.veloRaw.xRaw;ms.yRaw+=ms.veloRaw.yRaw;}
function missileInactive(ms,out){ms.veloRaw={xRaw:0,yRaw:0};ms.collision=false;ms.anim=2;ms.exploding=true;ms.timerRaw=MISSILE.disappear;}
const overlap=(a,b)=>a.x<b.x+b.w&&b.x<a.x+a.w&&a.y<b.y+b.h&&b.y<a.y+a.h;
const rectAt=(p,r)=>({x:p.xRaw+r.x,y:p.yRaw+r.y,w:r.w,h:r.h});
// PlayerGuard syncPlayerPos 0x1816cc920 (flip with the facing, the up offset -7, upside down negates y)
function guardRect(g,p){if(!p||!p.visible)return null;let dir=g.direction;if(g.flip&&g.type<2)dir=p.lookingRight?3:2;
 const o=GUARD.offsets[dir];let oy=o.yRaw+(dir===0?GUARD.upY:0);if(p.upsideDown)oy=-oy;const s=p.scaleRaw||F;
 return rectAt({xRaw:p.xRaw+mul(s,o.xRaw),yRaw:p.yRaw+mul(s,oy)},GUARD.rects[g.type]);}
function guardRects(st,players){const out={};for(const g of st.guards){const p=players.find(q=>q.index===g.playerIndex);const r=guardRect(g,p);if(r)out[g.playerIndex]=r;}return out;}
// enabled colliders of a live boss: cores (when exposed), hatches (when closed), body
function bossParts(st){const out=[];for(const b of st.bosses){if(!alive(b)||!b.parts)continue;const sh=SHAPES[b.kind];
 sh.cores.forEach((r,k)=>{if(b.parts.cores[k])out.push({boss:b.id,part:'core',index:k,rect:rectAt(b.pos,r)});});
 sh.hatches.forEach((r,k)=>{if(b.parts.hatches[k])out.push({boss:b.id,part:'hatch',index:k,rect:rectAt(b.pos,r)});});
 sh.body.forEach((r,k)=>out.push({boss:b.id,part:'body',index:k,rect:rectAt(b.pos,r)}));}return out;}
/* Event 21 from a player bullet on a boss part (OnRecvEvent 0x1816f6ba0). Returns sounds. */
function hitBoss(st,id,part,index,host){const b=st.bosses.find(q=>q.id===id);if(!alive(b))return [];const s=b.behaviour.state;if(s<3||s>=7)return [];
 const easy=easyMode(b,host);
 if(s>=4&&s<=6&&!easy){if(part!=='core')return [{se:1}];b.lastHit|=1<<index;}
 if(b.hp>0)b.hp--;if(b.hp>0&&s>=4&&s<=6)b.hp--;b.damageRaw=BASE.blink;return [{se:0xb,volumeRaw:49152}];}
/* One frame in updater order: apples (#21), missiles (#100), Boss (#103), BossEx (#106), the
 * ExParamSetter (#108), then the collision pass. host: {dtRaw, rng, scrollXRaw, scrollStepRaw,
 * viewRaw:{x,y,w,h}, gameOverCount, players:[{index, xRaw, yRaw, alive, dead, visible, lookingRight,
 * bodyRaw, life}], guns, mapBlocked(rectRaw), createBullet(pos, velo, extra), resumeHomingEnemy(owner,
 * pos, dir, speed, target), addReusableEnemies(owner, n), barrierDeployed(life)}. Returns {kill:[{player,
 * reason}], damage:[{player}], barrier:[{player, easy}], notify:[{targetName, eventType}], sounds}. */
function step(st,host){const dt=host.dtRaw,out={kill:[],damage:[],barrier:[],notify:[],sounds:[],flash:false};
 if(!st.started)start(st,host);
 for(const a of st.apples)if(!a.removed&&a.eaten){a.timerRaw-=dt;if(a.timerRaw<1)a.removed=true;}
 for(const b of st.bosses)if(b.missiles)for(const ms of b.missiles)missileUpdate(ms,dt,host);
 for(const kind of ['boss','ex'])for(const b of st.bosses){if(b.kind!==kind||!alive(b))continue;
  baseUpdate(st,b,dt,host,out);if(!alive(b))continue;
  if(b.behaviour.state<7){if(kind==='boss')attackBoss(st,b,dt,host,out);else attackEx(st,b,dt,host,out);}
  else if(kind==='ex'){}
  moveUpdate(b,dt,host.rng);}
 // ExParamSetter OnUpdate 0x1816ff840: copy when the pair present at the start has died (timing 1)
 for(const s of st.setters){const ex=s.target&&st.bosses.find(b=>b.id===s.target);if(ex&&!s.setted&&s.timing===1&&s.pairAtStart&&!pairValid(st,ex)){ex.param={...s.param};s.setted=true;}}
 // collision pass
 const guards=guardRects(st,host.players);
 for(const b of st.bosses)if(b.missiles)for(const ms of b.missiles){if(ms.hidden||ms.exploding||!ms.collision)continue;const r=rectAt(ms,MISSILE.rect);
  if(host.mapBlocked(r)){missileInactive(ms,out);continue;}
  const gi=Object.keys(guards).find(i=>overlap(r,guards[i]));if(gi!==undefined){out.sounds.push({se:3});missileInactive(ms,out);continue;}
  const p=host.players.find(q=>q.alive&&q.bodyRaw&&overlap(r,q.bodyRaw));if(!p)continue;
  // killPlayer 0x1816eb860
  if(p.life&&p.life.life===2&&p.life.phase>0){missileInactive(ms,out);continue;}
  if(!host.barrierDeployed(p.life)){if(p.dead)continue;out.kill.push({player:p.index,reason:'미사일에 맞았어요'});missileInactive(ms,out);}
  else{out.damage.push({player:p.index});missileInactive(ms,out);}}
 const parts=bossParts(st);
 for(const p of host.players){if(!p.alive||p.dead||!p.bodyRaw)continue;if(parts.some(q=>overlap(q.rect,p.bodyRaw)))out.kill.push({player:p.index,reason:'보스에게 부딪혔어요'});}
 for(const a of st.apples){if(a.removed||a.eaten)continue;const k=APPLE.scale,r=rectAt(a,{x:mul(APPLE.rect.x,k),y:mul(APPLE.rect.y,k),w:mul(APPLE.rect.w,k),h:mul(APPLE.rect.h,k)});
  const p=host.players.find(q=>q.alive&&q.plane&&q.bodyRaw&&overlap(r,q.bodyRaw)&&q.life&&!q.life.barrier);if(!p)continue;
  const easy=a.easyCount!==0&&a.easyCount<=(host.gameOverCount||0);out.barrier.push({player:p.index,easy});out.sounds.push({se:0xf});a.eaten=true;a.timerRaw=APPLE.disappear;}
 return out;}
function displays(st){return {
 bosses:st.bosses.filter(b=>alive(b)&&b.pos).map(b=>({id:b.id,kind:b.kind,x:(b.pos.xRaw+b.offset.xRaw)/F,y:(b.pos.yRaw+b.offset.yRaw)/F,hp:b.hp,hpMax:b.hpMax,state:b.behaviour.state,
  dying:b.behaviour.state>=7,blink:b.damageRaw>0,parts:SHAPES[b.kind],cores:b.parts.cores.slice(),hatches:b.parts.hatches.slice(),ui:b.ui,uiOverhead:b.uiOverhead})),
 missiles:st.bosses.flatMap(b=>(b.missiles||[]).filter(m=>!m.hidden).map(m=>({x:m.xRaw/F,y:m.yRaw/F,exploding:m.exploding,t:m.exploding?1-m.timerRaw/MISSILE.disappear:0}))),
 apples:st.apples.filter(a=>!a.removed).map(a=>({x:a.xRaw/F,y:a.yRaw/F,eaten:a.eaten,r:24*APPLE.scale/F}))};}
return {compile,create,start,step,hitBoss,bossParts,guardRects,guardRect,isLowHP,moveTo,displays,pcg32,nextInt,
 supportedTypes:['ShootingEnemyBoss','ShootingEnemyBossEx','ShootingEnemyBossExParamSetter','PlayerGuard','ShootingSuperApple'],
 nativeConstants:{BASE,SHAPES,BOSS_PARAM,EX_PARAM,MISSILE,GUARD,APPLE},completePhysicsFidelity:false};
});
