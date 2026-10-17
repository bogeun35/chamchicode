/* DanmakuObserver (200), DanmakuEmitter (201), DanmakuModifier (202), DanmakuLocator (203),
 * DanmakuThunder (223): 11-1 / 11-3, the playable reconstruction from the saved Ghidra
 * project; the full reading with every address is notes/danmaku-spec.md. No game
 * executed. FP 16.16. The bullets live in the OptimizedBulletObserver pool of
 * source-shooting-runtime.js (createDanmakuBullet).
 *  Observer ParseParameter 0x181813e50: slot 0 the shared HP per player count, phases
 *   k = 0..3 (slot 1 + 5k time, 2 + 5k .. 5 + 5k emitter names), slot 31 the actor told
 *   on clear. OnUpdate 0x181815110: checkGameOver 0x181815770 (a dead player -> 6; HP 0
 *   -> event 19 to every player, 6), updatePhase 0x1818151b0 (0 warm up 5 s, 1 enable the
 *   phase's emitters, 2 ParameterUpdate(progress) then the timer, 3 disable all, next
 *   phase, 4 after 3 s event 61 to the target, 5 cleared).
 *  Emitter ParseParameter 0x18180f380 (the DanmakuParameter), OnStart 0x18180f7b0 copies
 *   it into its Modifier (current and origin); OnUpdate 0x18180f8c0 -> Modifier ->
 *   Locator.OnDanmakuUpdate. SetEnable 0x18180fe00 / Modifier.SetEnable 0x181813520 Reset
 *   the Locator either way.
 *  Modifier ParameterUpdate 0x181813040: mode 1 PhaseProgress / 2 the cos wave, the
 *   multipliers per player count (56-char FP tables).
 *  Locator OnDanmakuUpdate 0x181810a20 / DanmakuUpdateImpl 0x181810d10: Time += dt, fire
 *   every FireRate (the timer back to 0), D = DiffusionAngle in rad, BulletCount bullets
 *   i * D / n - D / 2 + BaseRotation (0x181811200: 1 Swing, 2 Rotation) or CreateRandom
 *   0x181811140 offsets; createBullet 0x181811380 (k = 1/60: px per frame, degrees per
 *   frame, the hit square ((10 * Size) * 0x5555) >> 32 px). OnUpdate 0x1818107e0: Observer
 *   state 4 / 5 removes every bullet.
 *  Bullet hits (OptimizedBullet.addDamageProcess 0x18188c620): HP - 1 while state < 4.
 *  Thunder OnCollided 0x181816b20: a player touching the beam loses 1 HP, then 0.5 s of
 *   cooldown for that player (no state check).
 * Named approximations:
 *  - RemoveAllBullet clears the pool at once;
 *  - the beam meets the TopViewPlayer body (collision 0); its length is the runtime's
 *    Thunder beam (source-bridge-devices.js hazards).
 */
(function(root,factory){const c=typeof module==='object'&&module.exports;const api=factory(c?require('./source-fplut-math.js'):root.SourceFPLutMath);if(c)module.exports=api;root.SourceDanmakuRuntime=api;})(typeof globalThis!=='undefined'?globalThis:this,function(Lut){
'use strict';
const F=65536,B=BigInt,i64=v=>BigInt.asIntN(64,v);
const num=v=>{const n=Number(v);if(!Number.isSafeInteger(n))throw Error('Danmaku raw outside safe range');return n;};
const mul=(a,b)=>num(i64(B(a)*B(b))>>16n),div=(a,b)=>num(i64(B(a)<<16n)/B(b));
const clone=v=>JSON.parse(JSON.stringify(v));
const allowed=(v,c)=>!v||v<0&&c<=-v||v>0&&v<10&&c>=v||v>=10&&c>=Math.trunc(v/10)&&c<=v%10;
const fp=v=>Math.trunc(Math.fround(Math.fround(v)*F));
const WARM_UP=327680,INDICATE_KEY=196608,UI_BASE_SCALE=10,UI_POSX=0,UI_POSY=416;
const R_P=[2093263232,3994528512,2936903936,1792582144],DEG=0x477,PI=0x3243f,FULL=360*F,FRAME=1092,SIZE_UNIT=10*F,SIZE_MARGIN=0x5555;
const THUNDER_COOLDOWN=0x8000,BULLET_FLASH=0x5555,THUNDER_FLASH=0x8000;
function table(a,i,width){const d=(a.datas||[])[i];if(!d||d.t!==2||typeof d.s!=='string'||d.s.length!==7*width)return Array(7).fill(0);
 const t=[];for(let e=0;e<7;e++){let v=0n;for(let k=width-1;k>=0;k--)v=(v<<8n)|B(((d.s.charCodeAt(e*width+k)&0xff)-0x21)&0xff);t.push(num(BigInt.asIntN(width*8,v)));}return t;}
function findCount(t,count){for(let i=Math.min(count-2,6);i>=0;i--)if(t[i]!==0)return t[i];return 0;}
function slotFP(a,i){const d=(a.datas||[])[i];return d&&d.t===1?fp(d.f):0;}
const slotInt=(a,i)=>slotFP(a,i)>>16;
function slotStr(a,i){const d=(a.datas||[])[i];return d&&d.t===2?d.s||'':'';}
const sincos=r=>Lut.sincosRaw(r);
// FPVector2.Rotate 0x18163cac0
function rotate(v,theta){const [s,c]=sincos(theta);return {xRaw:mul(v.xRaw,c)-mul(v.yRaw,s),yRaw:mul(v.xRaw,s)+mul(v.yRaw,c)};}
function compile(actors,count){
 if(!Number.isInteger(count)||count<2||count>8)throw Error('Danmaku count 2..8 required');
 let observer=null;const emitters=[],modifiers=[],locators=[],thunders=[];
 actors.forEach((raw,i)=>{const a=raw.properties||raw;if(!allowed(a.playerCount,count))return;const id=raw.id||'source:a'+i,name=a.name||'';
  if(a.typeName==='DanmakuObserver'){const hp=findCount(table(a,0,4),count);const phases=[];
   for(let k=0;k<4;k++)phases.push({timeRaw:slotFP(a,1+5*k),targets:[2,3,4,5].map(j=>slotStr(a,j+5*k)).filter(Boolean)});
   observer={id,phase:0,state:0,hp,hpMax:hp,timerRaw:0,phases,targetName:slotStr(a,31),ui:{x:UI_POSX+slotFP(a,28)/F,y:UI_POSY+slotFP(a,29)/F,scale:slotFP(a,30)*UI_BASE_SCALE/F}};return;}
  if(a.typeName==='DanmakuEmitter'){const mode=slotInt(a,13);if(mode===3)throw Error('DanmakuEmitter RotateMode 3 (player aim) is not reconstructed');
   emitters.push({id,name,enable:false,targetName:slotStr(a,15),param:{b:slotInt(a,5)&255,g:slotInt(a,4)&255,r:slotInt(a,3)&255,count:BigInt.asIntN(8,B(slotInt(a,9)&255)),rotateMode:mode,random:slotInt(a,12)===1,
    angleRaw:slotFP(a,10),angVelRaw:slotFP(a,1),diffusionRaw:slotFP(a,11),fireRateRaw:slotFP(a,6),fireStopRaw:slotFP(a,8),fireTimeRaw:slotFP(a,7),rotateValueRaw:slotFP(a,14),sizeRaw:slotFP(a,2),velocityRaw:slotFP(a,0)}});
   emitters[emitters.length-1].param.count=Number(emitters[emitters.length-1].param.count);return;}
  if(a.typeName==='DanmakuModifier'){const m=k=>findCount(table(a,k,8),count);
   modifiers.push({id,name,mode:slotInt(a,0),enable:false,locatorName:slotStr(a,6),mul:{velocity:m(1),angVel:m(2),fireRate:m(3),count:m(4),fireTime:m(5)},param:null,origin:null});return;}
  if(a.typeName==='DanmakuLocator'){locators.push({id,name,x:fp(a.posX),y:fp(a.posY),enable:false,time:0,rw:{enable:0,fireRateTimer:0,fireTimer:0},target:-1,prev:-1});return;}
  if(a.typeName==='DanmakuThunder'){let dir=slotInt(a,0);if(dir>3)dir=0;thunders.push({id,name,x:a.posX,y:a.posY,direction:dir,through:slotFP(a,1)>0,timers:Array(8).fill(0)});}
 });
 if(!observer&&(emitters.length||locators.length))throw Error('Danmaku emitters without an observer are not reconstructed');
 return {schemaVersion:1,count,observer,emitters,modifiers,locators,thunders,started:false,completePhysicsFidelity:false};
}
const create=clone;
const byName=(list,n)=>list.find(q=>q.name===n);
function emitterTarget(st,e){const m=byName(st.modifiers,e.targetName);if(m)return {kind:1,modifier:m,locator:byName(st.locators,m.locatorName)||null};const l=byName(st.locators,e.targetName);return l?{kind:2,locator:l}:null;}
function reset(l){l.time=0;l.rw={enable:0,fireRateTimer:0,fireTimer:0};l.target=-1;}
function setEnable(st,e,v){e.enable=v;const t=emitterTarget(st,e);if(!t)return;if(t.kind===1){t.modifier.enable=v;if(t.locator)reset(t.locator);}else reset(t.locator);}
// OnStart: Observer targets, Emitters copy their parameter into the Modifier, Locators on
function start(st){if(st.started)return;st.started=true;
 for(const e of st.emitters){const t=emitterTarget(st,e);if(t&&t.kind===1){t.modifier.param=clone(e.param);t.modifier.origin=clone(e.param);}}
 for(const l of st.locators)l.enable=true;}
function progress(o){if(o.state>=1&&o.state<=3&&o.phase<4){const t=o.phases[o.phase].timeRaw;if(t<1)return F;return Math.max(0,Math.min(F,div(o.timerRaw,t)));}return 0;}
// Modifier.ParameterUpdate 0x181813040 (dead = 0: Size and FireStopTime stay)
function parameterUpdate(m,prog){if(!m.param||!m.origin)return;const o=m.origin,c=m.param,M=m.mul;
 let p=F;if(m.mode===1)p=prog;else if(m.mode===2){const [,cs]=sincos(mul(prog,PI)*6);p=0x8000-num(i64(B(cs)<<15n)>>16n);}
 const ceil=u=>(u>>16)+((u&0xffff)?1:0);
 if(p<=0){c.velocityRaw=o.velocityRaw;c.angVelRaw=o.angVelRaw;c.fireRateRaw=o.fireRateRaw;c.count=o.count;c.fireTimeRaw=o.fireTimeRaw;}
 else if(p<F){const lerp=(x,to)=>mul(to-x,p)+x;
  c.velocityRaw=lerp(o.velocityRaw,mul(o.velocityRaw,M.velocity));c.angVelRaw=lerp(o.angVelRaw,mul(o.angVelRaw,M.angVel));c.fireTimeRaw=lerp(o.fireTimeRaw,mul(o.fireTimeRaw,M.fireTime));
  c.fireRateRaw=lerp(o.fireRateRaw,div(o.fireRateRaw,M.fireRate));const n=o.count;c.count=ceil(mul(n*M.count-n*F,p)+n*F);}
 else{c.velocityRaw=mul(M.velocity,o.velocityRaw);c.angVelRaw=mul(M.angVel,o.angVelRaw);c.fireRateRaw=div(o.fireRateRaw,M.fireRate);c.count=ceil(o.count*M.count);c.fireTimeRaw=mul(o.fireTimeRaw,M.fireTime);}}
// CreateRandom 0x181811140 (deterministic)
function createRandom(x){const t=num((i64(B(R_P[2])*B(x))>>16n)+(i64(B(R_P[1])*B(x))>>16n)+(i64(B(R_P[0])*B(x))>>16n));const [s]=sincos(t);
 const r=num((i64(B(s)*B(R_P[3]))>>16n)%65536n);return Math.abs(r);}
function baseRotation(P,l){if(P.rotateMode===1){const [s]=sincos(mul(mul(l.time,PI),0x3333));return mul(mul(P.rotateValueRaw,DEG),num(i64(B(s+F)*0x8000n)>>16n));}
 if(P.rotateMode===2)return mul(mul(P.rotateValueRaw,l.time),PI);return 0;}
// DanmakuUpdateImpl 0x181810d10; emit -> createBullet 0x181811380
function fire(l,P,dt,emit){const rw=l.rw;
 if(P.fireStopRaw>0)rw.fireTimer+=dt;
 if(rw.enable===0){if(rw.fireTimer<P.fireStopRaw)return false;rw.enable=1;rw.fireRateTimer=0;rw.fireTimer=0;return false;}
 rw.fireRateTimer+=dt;let fired=false;
 if(rw.fireRateTimer>=P.fireRateRaw){const A=mul(P.angleRaw,DEG),[s0,c0]=sincos(A),dir0={xRaw:c0,yRaw:s0},D=mul(P.diffusionRaw,DEG),base=baseRotation(P,l);
  const out=d=>emit({xRaw:mul(d.xRaw,P.velocityRaw),yRaw:mul(d.yRaw,P.velocityRaw)});
  if(D===0)out(rotate(dir0,base));
  else{let step=D;if(P.count>1){const n=P.diffusionRaw<FULL?P.count-1:P.count;step=Math.trunc(D/n);}const half=num(i64(B(D)<<15n)>>16n);
   for(let i=0;i<P.count;i++){const off=P.random?mul(createRandom((i<<16)+l.time),D):i*step;out(rotate(dir0,off-half+base));}fired=P.count>=1;}
  rw.fireRateTimer=0;}
 if(P.fireStopRaw>=1&&rw.fireTimer>=P.fireTimeRaw){rw.enable=0;rw.fireTimer=0;}
 return fired;}
function bulletParam(P,l,vel){return {color:[P.r,P.g,P.b],sizePx:num((i64(B(mul(SIZE_UNIT,P.sizeRaw))*B(SIZE_MARGIN)))>>32n),angVelRaw:mul(FRAME,P.angVelRaw),
 xRaw:l.x,yRaw:l.y,veloRaw:{xRaw:mul(vel.xRaw,FRAME),yRaw:mul(vel.yRaw,FRAME)}};}
/* One frame: Thunder timers (#26), Observer (#156), Emitters (#158) -> Locators, Locator
 * OnUpdate (#160). host: {dtRaw, playerDead(): bool, createBullet(param): bool,
 * removeAllBullets()}. Returns {killAll, notify:[{targetName, eventType}], sounds}. */
function step(st,host){const out={killAll:false,notify:[],sounds:[]},o=st.observer,dt=host.dtRaw;if(!o)return out;
 for(const t of st.thunders)t.timers=t.timers.map(v=>v>0?v-dt:v);
 // checkGameOver
 if(o.state!==6){if(host.playerDead())o.state=6;else if(o.hp===0){out.killAll=true;o.state=6;}}
 // updatePhase: one case a frame
 const targets=k=>o.phases[k].targets.map(n=>byName(st.emitters,n)).filter(Boolean);
 if(o.state===0){o.timerRaw+=dt;if(o.timerRaw>=WARM_UP){o.state=1;o.timerRaw=0;}}
 else if(o.state===1){if(o.phases[o.phase].timeRaw<1)o.state=3;else{for(const e of targets(o.phase))setEnable(st,e,true);o.state=2;}}
 else if(o.state===2){const prog=progress(o);for(const e of targets(o.phase)){const t=emitterTarget(st,e);if(e.enable&&t&&t.kind===1)parameterUpdate(t.modifier,prog);}
  o.timerRaw+=dt;if(o.phases[o.phase].timeRaw<=o.timerRaw)o.state=3;}
 else if(o.state===3){for(let k=0;k<4;k++)for(const e of targets(k))setEnable(st,e,false);o.phase++;o.state=o.phase>3?4:1;o.timerRaw=0;}
 else if(o.state===4){o.timerRaw+=dt;if(o.timerRaw>=INDICATE_KEY){out.notify.push({targetName:o.targetName,eventType:61});out.sounds.push({se:0x18});o.state=5;}}
 // Emitter.OnUpdate -> Locator.OnDanmakuUpdate
 for(const e of st.emitters){if(!e.enable)continue;const t=emitterTarget(st,e);if(!t||!t.locator)continue;const l=t.locator,P=t.kind===1?t.modifier.param:e.param;
  l.time+=dt;if(fire(l,P,dt,vel=>host.createBullet(bulletParam(P,l,vel))))out.sounds.push({se:0x14});}
 for(const l of st.locators)if(l.enable&&(o.state===4||o.state===5)){host.removeAllBullets();l.enable=false;}
 return out;}
// OptimizedBullet.addDamageProcess (DanmakuStage): HP - 1 while the Observer is below 4
function bulletHit(st){const o=st.observer;if(!o||o.state>=4)return false;o.hp=Math.max(0,o.hp-1);return true;}
// DanmakuThunder.OnCollided: touching players lose 1 each, then 0.5 s for that player
function thunderContacts(st,touching){const o=st.observer,hits=[];if(!o)return hits;
 for(const {thunder,player} of touching){const t=st.thunders.find(q=>q.id===thunder);if(!t||t.timers[player]>0)continue;o.hp=Math.max(0,o.hp-1);t.timers[player]=THUNDER_COOLDOWN;hits.push(player);}
 return hits;}
function remainingRaw(o){if(!o||o.state>3||o.phase>3)return 0;let r=o.phases[o.phase].timeRaw-o.timerRaw;for(let j=o.phase+1;j<4;j++)r+=o.phases[j].timeRaw;return r;}
function displays(st){const o=st.observer;if(!o)return null;const rem=o.state===0?Math.max(0,WARM_UP-o.timerRaw):remainingRaw(o);
 return {hp:o.hp,hpMax:o.hpMax,state:o.state,warmUp:o.state===0,seconds:Math.max(0,Math.ceil(rem/F)),ui:o.ui,locators:st.locators.map(l=>({x:l.x/F,y:l.y/F}))};}
return {compile,create,start,step,bulletHit,thunderContacts,displays,parameterUpdate,createRandom,baseRotation,fire,bulletParam,rotate,progress,remainingRaw,table,findCount,
 supportedTypes:['DanmakuObserver','DanmakuEmitter','DanmakuModifier','DanmakuLocator','DanmakuThunder'],
 nativeConstants:{WARM_UP,INDICATE_KEY,R_P,DEG,PI,FRAME,THUNDER_COOLDOWN,BULLET_FLASH,THUNDER_FLASH},completePhysicsFidelity:false};
});
