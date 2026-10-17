/* Mole (151), MoleNest (150), MoleGroup (164): 14-2, the playable reconstruction from
 * the saved Ghidra project ('MoleComponent$$', 'MoleNestComponent$$',
 * 'MoleGroupComponent$$'). The punches are source-giant-runtime.js's PlayerPunch; this
 * module plugs into its frame (OnUpdate -> overlaps -> OnPost). No game executed.
 *  Mole Creator 0x18187fe30 / ParseParameter 0x181880090: slot 0 scale (+0x38, default
 *   1; the actor scale before AddActor, so collisions take it too), slot 1 life (int,
 *   default 1), slot 2 show the life text, slot 4 stay time (per-count table, default 3),
 *   slot 5 rise speed (+0x48, default 1), slot 6 (+0x28, default 1, no gameplay use).
 *   Rect per nest direction (.cctor 0x1818817c0, H W X Y): up (38 36 -18 -38), down
 *   (38 36 -18 0), left (36 38 -38 -18), right (36 38 0 -18); layer 8, no push back.
 *   OnStart: SetVisible(false) (setVisible 0x18169ee20 shares the collision lock).
 *   OnUpdate 0x181880630: 1 startAppear 0x1818809c0 (init pos = the nest, progress 0,
 *   rect by direction, visible, life refilled, dead flag cleared); 2 rise (progress +=
 *   dt * speed to 1; sink request -> 4); 3 stay (timer to the stay time; request -> 4);
 *   4 sink (progress -= dt * speed to 0 -> finishAppear(escaped)); 5 collision off,
 *   animation 4, timer QFP._0_333; 6 count down -> finishAppear(killed).
 *   calcPos 0x181880d70: Pos = init + d * 2 + d * (1 - progress) * 40, d = (cos, sin) of
 *   [90, 270, 0, 180][direction] * actor scale.
 *   OnRecvEvent 0x181880f00: 20 (not dead) through DamageManage -> life - 1; < 1 -> phase
 *   5 (dead); 35 -> sink request. OnCollided 0x1818815f0: a layer-1 body gets event 25
 *   with (d.x * 8, d.y * 4 - 8), d = normalize(its position - the mole's): a faint.
 *  MoleGroup Creator 0x181882070: up to 8 (mole, nest) name pairs in slots 0..15, slot
 *   16 = 0 -> one at a time in order (orderProc 0x181882ac0), otherwise each pair on its
 *   own clock (onceProc 0x181882f60 / updateMoleInfoPhase 0x181883120); slot 17 != 0 ->
 *   no reset; slots 18.. wait per pair (<= 0 -> QFP._0_50, .cctor 0x181883e00).
 *   OnStart 0x1818825e0: a pair counts when both names resolve (Mole / MoleNest).
 *   appearProc 0x1818832b0: a mole at rest and a free nest -> RequestAppear 0x1818817a0;
 *   otherwise retry after QFP._0_25. A mole that sinks unhit resets every pair of its
 *   group (resetMoleInfos 0x181883470) unless slot 17. checkAnnihilation 0x1818835e0:
 *   no pair left -> done; every group done (checkAnnihilationAllGroup 0x181883810) ->
 *   event 35 to all and event 1 to the Keys (type 17).
 * Named approximations:
 *  - the faint request takes event 25's velocity as the 8-3 bomb's does;
 *  - Frame.Random is not used here.
 */
(function(root,factory){const c=typeof module==='object'&&module.exports;const api=factory(c?require('./source-fplut-math.js'):root.SourceFPLutMath,c?require('./source-distanceconstraint-math.js'):root.SourceDistanceConstraintMath,c?require('./source-giant-runtime.js'):root.SourceGiantRuntime);if(c)module.exports=api;root.SourceMoleRuntime=api;})(typeof globalThis!=='undefined'?globalThis:this,function(Lut,N,G){
'use strict';
const F=65536,B=BigInt,i64=v=>BigInt.asIntN(64,v);
const num=v=>{const n=Number(v);if(!Number.isSafeInteger(n))throw Error('Mole raw outside safe range');return n;};
const mul=(a,b)=>num(i64(B(a)*B(b))>>16n);
const clone=v=>JSON.parse(JSON.stringify(v));
const allowed=(v,c)=>!v||v<0&&c<=-v||v>0&&v<10&&c>=v||v>=10&&c>=Math.trunc(v/10)&&c<=v%10;
const fp=v=>Math.trunc(Math.fround(Math.fround(v)*F));
const DEG_RAD=0x477;
const MOLE={rects:[{h:38*F,w:36*F,x:-18*F,y:-38*F},{h:38*F,w:36*F,x:-18*F,y:0},{h:36*F,w:38*F,x:-38*F,y:-18*F},{h:36*F,w:38*F,x:0,y:-18*F}],
 anglesRaw:[90*F,270*F,0,180*F],depthRaw:40*F,baseRaw:2*F,lifeTextRaw:32*F,dyingRaw:21845};// QFP 0x80 = 0.333
const GROUP={defaultWaitRaw:32768,retryRaw:16384};// QFP 0x90 = 0.5, 0x70 = 0.25
const EV={DAMAGE:20,SINK:35,FAINT:25,KEY:1};
function slotFP(a,i){const d=(a.datas||[])[i];return d&&d.t===1?fp(d.f):0;}
const slotInt=(a,i)=>slotFP(a,i)>>16;
function slotStr(a,i){const d=(a.datas||[])[i];return d&&d.t===2?d.s||'':'';}
function compile(actors,count){
 if(!Number.isInteger(count)||count<2||count>8)throw Error('Mole count 2..8 required');
 const moles=[],nests=[],groups=[];
 actors.forEach((raw,i)=>{const a=raw.properties||raw;if(!allowed(a.playerCount,count))return;const id=raw.id||'source:a'+i,xRaw=fp(a.posX??raw.x),yRaw=fp(a.posY??raw.y);
  if(a.typeName==='Mole'){const m={id,name:a.name||'',xRaw,yRaw,scaleRaw:F,life:1,flags:0,stayRaw:3*F,riseRaw:F,slot6Raw:F};
   if(slotFP(a,0)!==0)m.scaleRaw=slotFP(a,0);const l=slotInt(a,1);if(l!==0)m.life=l;if(slotInt(a,2)!==0)m.flags|=1;
   const stay=G.findCount(G.table(a,4,8),count);if(stay!==0)m.stayRaw=stay;if(slotFP(a,5)!==0)m.riseRaw=slotFP(a,5);if(slotFP(a,6)!==0)m.slot6Raw=slotFP(a,6);
   moles.push(m);return;}
  if(a.typeName==='MoleNest'){nests.push({id,name:a.name||'',xRaw,yRaw,dir:slotInt(a,0)&255});return;}
  if(a.typeName==='MoleGroup'){const g={id,name:a.name||'',flags:0,entries:[]};
   if(slotInt(a,16)===0)g.flags|=1;if(slotInt(a,17)!==0)g.flags|=2;
   for(let k=0;k<8;k++){const t=slotFP(a,18+k);g.entries.push({mole:slotStr(a,2*k),nest:slotStr(a,2*k+1),timeRaw:t>0?t:GROUP.defaultWaitRaw});}
   groups.push(g);}
 });
 return {schemaVersion:1,count,moles,nests,groups,completePhysicsFidelity:false};
}
function create(compiled,host={}){const st=clone(compiled),stage=host.stageScaleRaw||F;st.started=false;st.timeRaw=0;st.damage={};
 for(const m of st.moles){m.phase=0;m.dir=0;m.progressRaw=0;m.timerRaw=0;m.group=null;m.initXRaw=m.xRaw;m.initYRaw=m.yRaw;m.lifeNow=m.life;m.state=0;
  m.visible=true;m.collisionOn=true;m.anim=1;m.lifeVisible=false;m.rect={...MOLE.rects[0]};m.colScaleRaw=mul(m.scaleRaw,stage);}
 for(const n of st.nests)n.mole=null;
 for(const g of st.groups){g.count=0;g.orderIndex=0;g.orderPhase=0;g.timerRaw=0;g.done=false;
  for(const e of g.entries){e.phase=0;e.killed=0;e.valid=false;e.appearing=0;e.moleId=null;e.nestId=null;e.timerRaw=0;}}
 return st;}
// Mole OnStart: hidden (the collision goes with it); MoleGroup OnStart.
function start(st){if(st.started)return;st.started=true;
 for(const m of st.moles){m.visible=false;m.collisionOn=false;}
 for(const g of st.groups){let first=0;
  for(const e of g.entries){const m=st.moles.find(q=>q.name===e.mole),n=st.nests.find(q=>q.name===e.nest);if(m)e.moleId=m.id;if(n)e.nestId=n.id;
   if(m&&n){e.timerRaw=e.timeRaw;e.valid=true;if(first===0)first=e.timerRaw;}}
  g.timerRaw=first;}}
function calcPos(m){const rad=mul(MOLE.anglesRaw[m.dir],DEG_RAD),[s,c]=Lut.sincosRaw(rad),dx=mul(c,m.scaleRaw),dy=mul(s,m.scaleRaw);
 m.xRaw=mul(MOLE.baseRaw,dx)+m.initXRaw+mul(mul(dx,F-m.progressRaw),MOLE.depthRaw);
 m.yRaw=mul(dy,MOLE.baseRaw)+m.initYRaw+mul(mul(dy,F-m.progressRaw),MOLE.depthRaw);}
function finishAppear(st,m,killed){m.visible=false;m.collisionOn=false;
 if(m.group){const g=st.groups.find(q=>q.id===m.group);if(g)notifyDisappeared(st,g,m.id,killed);m.group=null;}}
function moleUpdate(st,m,dt){
 switch(m.phase){
  case 1:{// startAppear
   m.progressRaw=0;calcPos(m);m.rect={...MOLE.rects[m.dir]};m.visible=true;m.collisionOn=true;m.anim=1;m.lifeNow=m.life;m.timerRaw=0;m.flags&=~0x10;m.phase=2;return;}
  case 2:if(!(m.flags&8)){m.progressRaw+=mul(dt,m.riseRaw);if(0xffff<m.progressRaw){m.phase=3;m.progressRaw=F;}}else m.phase=4;calcPos(m);return;
  case 3:if(!(m.flags&8)){m.timerRaw+=dt;if(m.stayRaw<=m.timerRaw){m.timerRaw=0;m.phase=4;}}else m.phase=4;return;
  case 4:m.progressRaw-=mul(dt,m.riseRaw);if(m.progressRaw<1){m.progressRaw=0;finishAppear(st,m,0);m.phase=0;}calcPos(m);return;
  case 5:m.collisionOn=false;m.anim=4;m.timerRaw=MOLE.dyingRaw;m.phase=6;return;
  case 6:m.timerRaw-=dt;if(m.timerRaw<1){finishAppear(st,m,1);m.phase=0;}return;
 }}
function moleRect(m){const r=m.rect,sc=m.colScaleRaw;return {x:m.xRaw+mul(sc,r.x),y:m.yRaw+mul(sc,r.y),w:mul(sc,r.w),h:mul(sc,r.h)};}
function moleEvent(st,m,e,out){
 if(e.eventType===EV.SINK){m.flags|=8;return;}
 if(e.eventType!==EV.DAMAGE||(m.flags&0x10))return;
 if(!G.damageCheck(st,m.id,e.sender,EV.DAMAGE))return;
 out.shakes.push({amountRaw:3276});out.sounds.push({se:0xb});m.lifeNow-=1;
 if(m.lifeNow<1){m.lifeVisible=false;m.phase=5;m.flags|=0x10;return;}
 m.anim=(e.powerRaw>=0?1:0)+2;if(m.flags&1)m.lifeVisible=true;}
// MoleGroup.appearProc / NotifyMoleDisappeared / resetMoleInfos
function appear(st,g,e){const m=st.moles.find(q=>q.id===e.moleId),n=st.nests.find(q=>q.id===e.nestId);
 if(!m||m.group||m.phase!==0||!n||n.mole)return false;
 n.mole=m.id;m.group=g.id;m.initXRaw=n.xRaw;m.initYRaw=n.yRaw;m.dir=n.dir;m.phase=1;e.killed=0;e.appearing=1;return true;}
function notifyDisappeared(st,g,moleId,killed){const e=g.entries.find(q=>q.moleId===moleId);if(!e)return;
 const n=st.nests.find(q=>q.id===e.nestId);if(n)n.mole=null;e.killed=killed;e.appearing=0;}
function reset(g){if(g.flags&2)return;for(const e of g.entries)if(e.valid)e.killed=0;}
function orderProc(st,g,dt){
 if(g.orderPhase===0){g.timerRaw-=dt;if(g.timerRaw>0)return;if(g.orderIndex>7)g.orderIndex=0;
  const e=g.entries[g.orderIndex];if(!e.valid||e.killed!==0){g.orderIndex++;return;}
  if(appear(st,g,e))g.orderPhase=1;else g.timerRaw=GROUP.retryRaw;return;}
 if(g.orderPhase===1){const e=g.entries[g.orderIndex];if(e.appearing!==0)return;
  if(e.killed===0){reset(g);g.orderIndex=0;}else g.orderIndex++;
  if(g.orderIndex>7)g.orderIndex=0;g.timerRaw=g.entries[g.orderIndex].timeRaw;g.orderPhase=0;}}
function onceProc(st,g,dt){for(const e of g.entries){if(!e.valid||e.killed!==0)continue;
 if(e.phase===0){e.timerRaw-=dt;if(e.timerRaw<=0){if(appear(st,g,e))e.phase=1;else e.timerRaw=GROUP.retryRaw;}}
 else if(e.phase===1&&e.appearing===0){if(e.killed===0)reset(g);e.timerRaw=e.timeRaw;e.phase=0;}}}
/* Hooks into SourceGiantRuntime.step: update after its OnUpdate, targets/overlaps in its
 * overlap phase, post after its OnPost. */
function update(st,dt){start(st);st.timeRaw+=dt;for(const m of st.moles)moleUpdate(st,m,dt);}
function targets(st,out){return st.moles.filter(m=>m.visible&&m.collisionOn).map(m=>({id:m.id,rect:moleRect(m),hit:e=>moleEvent(st,m,e,out)}));}
function overlaps(st,players,out){
 for(const m of st.moles){if(!m.visible||!m.collisionOn)continue;const r=moleRect(m);
  for(const p of players){const pr={x:p.xRaw-16*F,y:p.yRaw-47*F,w:32*F,h:46*F};if(!(r.x<pr.x+pr.w&&pr.x<r.x+r.w&&r.y<pr.y+pr.h&&pr.y<r.y+r.h))continue;
   const dx=p.xRaw-m.xRaw,dy=p.yRaw-m.yRaw,d=dx===0&&dy===0?{xRaw:0,yRaw:0}:N.normalizeRaw({xRaw:dx,yRaw:dy});
   out.faints.push({index:p.index,vxRaw:num(i64(B(d.xRaw)<<19n)>>16n),vyRaw:num(i64(B(d.yRaw)<<18n)>>16n)-0x80000});}}}
function post(st,dt,out){
 for(const g of st.groups){if(g.done)continue;if(g.flags&1)orderProc(st,g,dt);else onceProc(st,g,dt);
  g.count=g.entries.filter(e=>e.valid&&e.killed===0).length;
  if(g.count<1){g.done=true;
   if(st.groups.every(q=>q.done)){for(const m of st.moles)moleEvent(st,m,{eventType:EV.SINK},out);out.keyEvents.push({eventType:EV.KEY,broadcastActorType:17,senderId:g.id});}}}}
function displays(st){return {
 moles:st.moles.filter(m=>m.visible).map(m=>{const r=moleRect(m);return {id:m.id,x:m.xRaw/F,y:m.yRaw/F,dir:m.dir,scale:m.scaleRaw/F,anim:m.anim,phase:m.phase,progress:m.progressRaw/F,
  rect:{x:r.x/F,y:r.y/F,w:r.w/F,h:r.h/F},life:m.lifeVisible?{text:m.lifeNow+'/'+m.life,x:(r.x+(r.w>>1))/F,y:(r.y-MOLE.lifeTextRaw)/F}:null};}),
 nests:st.nests.map(n=>({id:n.id,x:n.xRaw/F,y:n.yRaw/F,dir:n.dir,busy:!!n.mole})),
 groups:st.groups.map(g=>({id:g.id,done:g.done,left:g.entries.filter(e=>e.valid&&e.killed===0).length,total:g.entries.filter(e=>e.valid).length}))};}
return {compile,create,start,update,targets,overlaps,post,displays,calcPos,moleRect,
 supportedTypes:['Mole','MoleNest','MoleGroup'],nativeConstants:{MOLE,GROUP},completePhysicsFidelity:false};
});
