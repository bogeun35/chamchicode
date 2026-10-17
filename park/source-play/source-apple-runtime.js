/* Apple (136), AppleController (137), PlayerTarget (134) and PlayerBasket (135):
 * 8-1 / 8-3, the playable reconstruction from the saved Ghidra project
 * ('AppleComponent$$', 'AppleControllerComponent$$', 'PlayerTargetComponent$$',
 * 'PlayerBasketComponent$$'). No game executed. FP 16.16.
 *  TargetPlayer (132) / BasketPlayer (133): ActorFactory.createTargetPlayer 0x1816a47f0 /
 *   createBasketPlayer 0x1816a4910 = createPlayer + PlayerTarget / PlayerBasket.
 *   The TargetPlayer requests player state 8 (Target: no update) at 0x1816bdda4.
 *  PlayerTarget (the crosshair) Initialize 0x1816d6790: slot 12 shot interval (<= 0:
 *   QFP[0xb0] 0.7), slot 13 flag. InitCollision 0x1816d6900: circle 16 (.cctor
 *   0x1816d77f0), pushBack 0, layer 3. OnStart 0x1816d69e0: 500 px from the player's
 *   centre toward the view centre (0x1f40000). OnUpdate 0x1816d6c10: 0 control
 *   0x1816d6d80 (GetMoveVector with QGameDefine 0.078125 times 16 px, kept inside the
 *   view by 192 left/right, 72 top, 216 bottom) + shot 0x1816d7010 (interval, button 9
 *   press -> flag 8 for one update); 1 prepareMove (back to the player's centre when
 *   farther than 3 raw); 2 move over 1.5 s; 3 wakeUpPlayer (player state 1, hidden).
 *   OnCollided 0x1816d7700 (flag 8): an Apple (136) gets event 22 with the hit point.
 *   OnRecvEvent 0x1816d75e0: 47 -> 1; 19 hidden and disabled.
 *  PlayerBasket OnUpdate 0x1818908a0: on the player's head (0, -46 - ear length) times
 *   the scale; InitCollision 0x181890770: 44 x 26 at (-22, -30), pushBack 0, layer 3.
 *   CountUp 0x181890d00.
 *  AppleController Initialize 0x1816abaa0: 8 at once, 20 to catch, apple 3 s, bomb 3 s,
 *   sway 200 x / 100 y, 200 deg/s; ParseParameter 0x1816abc00: slots 1..7 (non-zero
 *   only), slot 8 catches per count (QPlayerCountParamUtility.Find). OnUpdate
 *   0x1816abf40: below the catch count and not stopped, when its timer (first 1 s)
 *   runs out and fewer than the limit are active, Activate list[Next(0, idle)] and
 *   wait RandomRange(0.5, 1.5) s. NotifyCatch 0x1816ac510: the last catch sends event 1
 *   to the Keys and 47 to the crosshairs. CheckDead 0x1816ac800: every hanging apple
 *   within the blast radius gets event 19. Event 19 stops it.
 *  Apple ParseParameter 0x1816a9730: slots 0..4 override apple time, bomb time, x and y
 *   sway, sway speed; slot 5 makes it alternate with a bomb. InitCollision 0x1816a9910:
 *   24 x 24 at -12, pushBack 0, layer 5. Activate 0x1816aada0: Frame.Random
 *   0x181747ad0 low bit picks the sway axis; alternating apples start as apple or
 *   bomb (Random bit) for 2 or 4 shows (PCG bit). OnUpdate 0x1816a9bd0 phases: 1/2 apple
 *   shown, 3/4 bomb shown, 5/6 hidden 2 s, 7 shot down (RequestJump (dir.x * 3, -20),
 *   spin 4), 9 knocked down by event 19 (spin 8), 11/12 blast growing 400 px/s to 250
 *   (CheckDead). updateSway 0x1816aa410: init + sin(angle) * amplitude on one axis.
 *   OnCollided 0x1816aa8f0: a falling apple in a basket -> caught (catchApple
 *   0x1816aa9d0); a falling bomb on a player (layer 1) -> event 25 (faint, velocity
 *   dir.x * QFP[0x160] 8, QFP[0x248] -2) and the blast (explodeBomb 0x1816aaba0).
 *   OnPost 0x1816aa700: CheckOutMap -> inactive.
 *  Falling: ActorComponent.RequestJump 0x1816a21b0 + jumpProc 0x18169e6c0 (Velo =
 *   jump, then Frame.Gravity = Stage scale * 0xa666 (prepare3 0x18170aad0) every update).
 */
(function(root,factory){const c=typeof module==='object'&&module.exports;const api=factory(c?require('./source-fplut-math.js'):root.SourceFPLutMath,c?require('./source-distanceconstraint-math.js'):root.SourceDistanceConstraintMath);if(c)module.exports=api;root.SourceAppleRuntime=api;})(typeof globalThis!=='undefined'?globalThis:this,function(Lut,N){
'use strict';
const F=65536,DEG_RAD=0x477,GRAVITY=0xa666;
const APPLE_RECT={x:-12*F,y:-12*F,w:24*F,h:24*F},BASKET_RECT={x:-22*F,y:-30*F,w:44*F,h:26*F},BASKET_Y=-46*F,CROSS_R=16*F,CROSS_SPEED=16*F;
const MARGIN={top:72*F,bottom:216*F,side:192*F},CROSS_START=500*F,MOVE_TIME_INV=43690,DEFAULT_INTERVAL=45875;
const BLAST_SPEED=400*F,BLAST_MAX=250*F,HIDE_TIME=2*F,KNOCK_X=8*F,KNOCK_Y=-2*F,SPAWN_FIRST=F,SPAWN_MIN=32768,SPAWN_MAX=98304;
const EV={KEY:1,HIT:22,DEAD:19,FAINT:25,RETURN:47};
const DEFAULT_RNG={state:'9600629759793949339',inc:'15726070495360670683'};
const B=v=>BigInt(v),i64=v=>BigInt.asIntN(64,v),num=v=>{const n=Number(v);if(!Number.isSafeInteger(n))throw Error('Apple raw outside safe range');return n;};
const mul=(a,b)=>num(i64(B(a)*B(b))>>16n);
const clone=v=>JSON.parse(JSON.stringify(v));
const allowed=(v,c)=>!v||v<0&&c<=-v||v>0&&v<10&&c>=v||v>=10&&c>=Math.trunc(v/10)&&c<=v%10;
const fp=v=>Math.trunc(Math.fround(Math.fround(v)*F));
function slot(a,i){const d=(a.datas||[])[i];return d&&d.t===1?fp(d.f):0;}
function table(a,i){const d=(a.datas||[])[i];if(!d||d.t!==2||typeof d.s!=='string'||d.s.length!==28)return Array(7).fill(0);const t=[];for(let e=0;e<7;e++){let v=0;for(let k=3;k>=0;k--)v=v*256+(((d.s.charCodeAt(e*4+k)&0xff)-0x21)&0xff);t.push(v|0);}return t;}
function findCount(t,count){for(let i=Math.min(count-2,6);i>=0;i--)if(t[i]!==0)return t[i];return 0;}
// ---- frame RNG --------------------------------------------------------------------------
const PCG=6364136223846793005n,M64=(1n<<64n)-1n;
function pcg32(rng){const old=B(rng.state);rng.state=((old*PCG+(B(rng.inc)|1n))&M64).toString();const x=Number(((old>>45n)^(old>>27n))&0xffffffffn),rot=Number(old>>59n);return ((x>>>rot)|(x<<((32-rot)&31)))>>>0;}
function nextInt(rng,min,max){if(min===max)return min;let lo=max,hi=min;if(min<max){lo=min;hi=max;}const u=(hi-lo)>>>0,threshold=(2**32-u)%u;let x;do x=pcg32(rng);while(x<threshold);return lo+x%u;}
function nextFP(rng,min,max){let lo=min,hi=max;if(max<min){lo=max;hi=min;}return num(i64(B(pcg32(rng)>>>16)*B(hi-lo))>>16n)+lo;}
// Frame.Random 0x181747ad0: PCG32 without 0, % 0xffffffff, - 2^31.
function frameRandom(rng){let x;do x=pcg32(rng);while(x<1);return ((x%0xffffffff)-0x80000000)|0;}
// ---- compile ----------------------------------------------------------------------------
function compile(actors,count,options={}){
 if(!Number.isInteger(count)||count<2||count>8)throw Error('Apple count 2..8 required');
 const apples=[],targets=[],baskets=[];let controller=null,playerOrdinal=0;
 actors.forEach((raw,i)=>{const a=raw.properties||raw;if(!allowed(a.playerCount,count))return;const id=raw.id||'source:a'+i,xRaw=fp(a.posX??raw.x),yRaw=fp(a.posY??raw.y);
  const t=a.typeName;
  if(['Player','TargetPlayer','BasketPlayer'].includes(t)){const k=playerOrdinal++;if(k>=count)return;// ActorScene limit bit 2
   if(t==='TargetPlayer'){const interval=slot(a,12);targets.push({id:id+':target',playerIndex:k,intervalRaw:interval>0?interval:DEFAULT_INTERVAL,flags:(slot(a,13)>>16)!==0?1:0,phase:0,timerRaw:0,moveRaw:0,xRaw:0,yRaw:0,startX:0,startY:0,endX:0,endY:0,visible:true,started:false});}
   if(t==='BasketPlayer')baskets.push({id:id+':basket',playerIndex:k,count:0,stack:0,xRaw:0,yRaw:0,visible:true});
   return;}
  if(t==='AppleController'){if(controller)throw Error('Apple: one controller per stage');
   const c={id,max:8,needed:20,caught:0,appleRaw:3*F,bombRaw:3*F,xAmpRaw:200*F,yAmpRaw:100*F,speedRaw:200*F,flags:0,timerRaw:SPAWN_FIRST};
   const s1=slot(a,1)>>16,need=findCount(table(a,8),count);if(need>0)c.needed=need;if(s1!==0)c.max=s1&255;
   const set=(j,k)=>{const v=slot(a,j);if(v!==0)c[k]=v;};set(2,'appleRaw');set(3,'bombRaw');set(4,'xAmpRaw');set(5,'yAmpRaw');set(6,'speedRaw');if((slot(a,7)>>16)!==0)c.flags|=1;
   controller=c;return;}
  if(t!=='Apple')return;
  const ap={id,initXRaw:xRaw,initYRaw:yRaw,xRaw,yRaw,veloRaw:{xRaw:0,yRaw:0},jumpRaw:{xRaw:0,yRaw:0},jumping:false,angleRaw:0,spinRaw:0,
   state:0,count:0,phase:0,flags:0,timerRaw:0,swayRaw:0,blastRaw:0,hitXRaw:0,hitYRaw:0,appleRaw:0,bombRaw:0,xAmpRaw:0,yAmpRaw:0,speedRaw:0,visible:false,anim:0};
  const own=[[0,'appleRaw',1],[1,'bombRaw',2],[2,'xAmpRaw',4],[3,'yAmpRaw',8],[4,'speedRaw',16]];
  for(const [j,k,f] of own){const v=slot(a,j);if(v!==0){ap[k]=v;ap.flags|=f;}}if((slot(a,5)>>16)!==0)ap.flags|=0x20;
  apples.push(ap);
 });
 if(apples.length&&!controller)throw Error('Apple without AppleController');
 return {schemaVersion:1,count,scaleRaw:options.scaleRaw||F,apples,controller,targets,baskets,shared:null,rng:{...DEFAULT_RNG},completePhysicsFidelity:false};
}
const create=clone;
// ---- apples -----------------------------------------------------------------------------------
function activate(st,ap,c,bombMode){
 if(!(ap.flags&1))ap.appleRaw=c.appleRaw;if(!(ap.flags&2))ap.bombRaw=c.bombRaw;if(!(ap.flags&4))ap.xAmpRaw=c.xAmpRaw;if(!(ap.flags&8))ap.yAmpRaw=c.yAmpRaw;if(!(ap.flags&16))ap.speedRaw=c.speedRaw;
 if(frameRandom(st.rng)&1)ap.flags&=~0x80;else ap.flags|=0x80;
 if(!bombMode&&!(ap.flags&0x20)){ap.count=0;ap.phase=1;ap.state=1;}
 else{ap.phase=(frameRandom(st.rng)&1)*2+1;ap.state=ap.phase===1?1:ap.phase===3?2:0;ap.count=((pcg32(st.rng)&1)+1)*2;ap.flags|=0x20;}
 ap.swayRaw=0;ap.flags|=0x40;ap.angleRaw=0;ap.xRaw=ap.initXRaw;ap.yRaw=ap.initYRaw;ap.veloRaw={xRaw:0,yRaw:0};ap.jumping=false;
}
function inactivate(ap){ap.visible=false;ap.phase=0;ap.flags&=~0x240;ap.state=0;}
function knock(ap,spin){const dx=ap.xRaw-ap.hitXRaw,dy=ap.yRaw-ap.hitYRaw,u=(dx===0&&dy===0)?{xRaw:0,yRaw:0}:N.normalizeRaw({xRaw:dx,yRaw:dy});
 ap.jumpRaw={xRaw:mul(u.xRaw,3*F),yRaw:-20*F};ap.jumping=true;ap.spinRaw=u.xRaw<0?-spin:spin;}
function appleUpdate(st,ap,dt,out){
 if(!(ap.flags&0x40))return;
 switch(ap.phase){
  case 1:ap.visible=true;ap.anim=1;ap.phase=2;ap.timerRaw=ap.appleRaw;break;
  case 2:ap.timerRaw-=dt;if(ap.timerRaw>0)break;if((ap.flags&0x20)&&--ap.count>0){ap.phase=3;ap.state=2;break;}ap.phase=5;ap.state=0;break;
  case 3:ap.visible=true;ap.anim=2;ap.phase=4;ap.timerRaw=ap.bombRaw;break;
  case 4:ap.timerRaw-=dt;if(ap.timerRaw>0)break;if(--ap.count>0){ap.phase=1;ap.state=1;break;}ap.phase=5;ap.state=0;break;
  case 5:ap.visible=false;ap.phase=6;ap.timerRaw=HIDE_TIME;break;
  case 6:ap.timerRaw-=dt;if(ap.timerRaw>0)break;inactivate(ap);break;
  case 7:out.shakes.push(4915);knock(ap,4*F);ap.phase=8;break;
  case 8:case 10:ap.angleRaw+=ap.spinRaw;break;
  case 9:ap.anim=ap.flags&0x20?3:1;knock(ap,8*F);ap.phase=10;break;
  case 11:out.shakes.push(13107);out.sounds.push({se:11});ap.visible=false;ap.veloRaw={xRaw:0,yRaw:0};ap.flags|=0x200;ap.blastRaw=0;ap.phase=12;break;
  case 12:ap.blastRaw+=mul(dt,BLAST_SPEED);checkDead(st,ap);if(ap.blastRaw>=BLAST_MAX)inactivate(ap);break;
 }
 // updateSway 0x1816aa410 (on the tree only)
 if(ap.state===1||ap.state===2){const s=Lut.sincosRaw(mul(ap.swayRaw,DEG_RAD))[0];
  if(!(ap.flags&0x80))ap.xRaw=ap.initXRaw+mul(s,ap.xAmpRaw);else ap.yRaw=ap.initYRaw+mul(s,ap.yAmpRaw);ap.swayRaw+=mul(dt,ap.speedRaw);}
}
function appleEvent(ap,type,pos){
 if(type===EV.HIT){if(ap.state===1||ap.state===2){ap.hitXRaw=pos.xRaw;ap.hitYRaw=pos.yRaw;ap.phase=7;ap.state=ap.state!==1?4:3;}return;}
 if(type===EV.DEAD){if(ap.state===1){ap.hitXRaw=pos.xRaw;ap.hitYRaw=pos.yRaw;ap.phase=9;ap.state=0;}else if(ap.state===2){ap.phase=11;ap.state=0;}}
}
// AppleController.CheckDead 0x1816ac800: the native distance is FPMath.Sqrt.
function checkDead(st,src){for(const ap of st.apples){if(ap===src||!(ap.flags&0x40)||(ap.state!==1&&ap.state!==2))continue;
 const dx=ap.xRaw-src.xRaw,dy=ap.yRaw-src.yRaw;if(N.sqrtRaw(B(mul(dy,dy)+mul(dx,dx)))<=src.blastRaw)appleEvent(ap,EV.DEAD,{xRaw:src.xRaw,yRaw:src.yRaw});}}
// every collider x the stage scale (AddActor -> SetBaseScale, pivot 0); a circle radius x the scale
const sc=(st,v)=>st.scaleRaw&&st.scaleRaw!==F?mul(v,st.scaleRaw):v;
const appleRect=(ap,st)=>({x:(ap.xRaw+sc(st,APPLE_RECT.x))/F,y:(ap.yRaw+sc(st,APPLE_RECT.y))/F,w:sc(st,APPLE_RECT.w)/F,h:sc(st,APPLE_RECT.h)/F});
// ---- controller ---------------------------------------------------------------------------------
function controllerUpdate(st,dt){const c=st.controller;if(!c||(c.flags&2)||c.caught>=c.needed)return;
 c.timerRaw-=dt;if(c.timerRaw>0)return;
 const idle=st.apples.filter(ap=>!(ap.flags&0x40));if(!idle.length)return;if(c.max<=st.apples.length-idle.length)return;
 const ap=idle[nextInt(st.rng,0,idle.length)];activate(st,ap,c,!!(c.flags&1));c.timerRaw=nextFP(st.rng,SPAWN_MIN,SPAWN_MAX);}
function notifyCatch(st,out){const c=st.controller;if(c.caught>=c.needed)return;c.caught++;if(c.caught<c.needed)return;
 out.keyEvents.push({eventType:EV.KEY,broadcastActorType:17,senderId:c.id});for(const t of st.targets)if(t.phase===0)t.phase=1;}
// ---- crosshair --------------------------------------------------------------------------------
function targetStart(st,t,host){const p=host.players[t.playerIndex];if(!p)return;const cx=p.xRaw,cy=p.yRaw-24*F,v=host.viewRaw;
 t.xRaw=cx+(cx<mul(v.w,F/2)+v.x?CROSS_START:-CROSS_START);t.yRaw=cy;t.started=true;}
function targetUpdate(st,t,host,dt,out){
 if(t.flags&4)return;const p=host.players[t.playerIndex];
 if(t.phase===0){
  // control 0x1816d6d80
  const v=host.moveVector(t.playerIndex),view=host.viewRaw;let x=t.xRaw+mul(v.xRaw,CROSS_SPEED),y=t.yRaw+mul(v.yRaw,CROSS_SPEED);
  const xa=view.x+MARGIN.side,xb=view.w-MARGIN.side+view.x,ya=MARGIN.top+view.y,yb=view.h-MARGIN.bottom+view.y;
  if(x<xa)x=xa;else if(x>xb)x=xb;if(y<ya)y=ya;else if(y>yb)y=yb;t.xRaw=x;t.yRaw=y;
  // shot 0x1816d7010
  if(t.flags&8)t.flags&=~8;
  t.timerRaw-=dt;if(t.timerRaw>0)t.flags|=2;else{t.flags&=~2;if(host.pressed(t.playerIndex,'shot')){t.flags|=8;t.timerRaw=t.intervalRaw;out.snipes.push({x:t.xRaw/F,y:t.yRaw/F,playerIndex:t.playerIndex});out.sounds.push({se:0x14});}}
  return;}
 if(t.phase===1){if(!p){t.phase=3;return;}t.endX=p.xRaw;t.endY=p.yRaw-24*F;t.startX=t.xRaw;t.startY=t.yRaw;const dx=t.endX-t.xRaw,dy=t.endY-t.yRaw;
  t.phase=Math.abs(N.sqrtRaw(B(mul(dy,dy)+mul(dx,dx))))>3?2:3;t.moveRaw=0;return;}
 if(t.phase===2){t.moveRaw+=mul(dt,MOVE_TIME_INV);const k=Math.max(0,Math.min(F,t.moveRaw));t.xRaw=t.startX+mul(t.endX-t.startX,k);t.yRaw=t.startY+mul(t.endY-t.startY,k);if(t.moveRaw>0xffff)t.phase=3;return;}
 if(t.phase===3){out.wake.push(t.playerIndex);t.visible=false;t.phase=4;}
}
/* One update (Apple 79 .. AppleController 160). host: {dtRaw, players: [{xRaw, yRaw,
 * layer1Rect {x,y,w,h} px, visible} per player index], viewRaw {x,y,w,h},
 * moveVector(i) -> {xRaw,yRaw}, pressed(i, key), mapBoundsRaw {left,right,up,fall}}.
 * Returns {keyEvents, faints:[{playerIndex, veloRaw}], wake:[playerIndex], snipes, sounds, shakes}. */
function step(st,host){
 const dt=host.dtRaw,out={keyEvents:[],faints:[],wake:[],snipes:[],sounds:[],shakes:[]};
 for(const t of st.targets)if(!t.started)targetStart(st,t,host);
 // OnUpdate: Apple (79), players (97), PlayerBasket (142), PlayerTarget (143), AppleController (160)
 for(const ap of st.apples)appleUpdate(st,ap,dt,out);
 for(const b of st.baskets){const p=host.players[b.playerIndex];if(!p)continue;b.xRaw=p.xRaw;b.yRaw=p.yRaw+sc(st,BASKET_Y);b.visible=p.visible!==false;}
 for(const t of st.targets)targetUpdate(st,t,host,dt,out);
 controllerUpdate(st,dt);
 // OnUpdate2: Pos += Velo
 for(const ap of st.apples){ap.xRaw+=ap.veloRaw.xRaw;ap.yRaw+=ap.veloRaw.yRaw;}
 // collision
 for(const t of st.targets){if(!(t.flags&8)||!t.visible)continue;
  for(const ap of st.apples){if(!ap.visible||!(ap.flags&0x40))continue;const r=appleRect(ap,st),cx=t.xRaw/F,cy=t.yRaw/F,qx=Math.max(r.x,Math.min(cx,r.x+r.w)),qy=Math.max(r.y,Math.min(cy,r.y+r.h));
   if((qx-cx)**2+(qy-cy)**2<(sc(st,CROSS_R)/F)**2)appleEvent(ap,EV.HIT,{xRaw:t.xRaw,yRaw:t.yRaw});}}
 for(const ap of st.apples){if(!ap.visible||!(ap.flags&0x40))continue;const r=appleRect(ap,st);
  const hit=o=>r.x<o.x+o.w&&r.x+r.w>o.x&&r.y<o.y+o.h&&r.y+r.h>o.y;
  if(ap.state===3){const b=st.baskets.find(q=>q.visible&&hit({x:(q.xRaw+sc(st,BASKET_RECT.x))/F,y:(q.yRaw+sc(st,BASKET_RECT.y))/F,w:sc(st,BASKET_RECT.w)/F,h:sc(st,BASKET_RECT.h)/F}));
   if(b){out.sounds.push({se:8});b.count++;b.stack+=nextInt(st.rng,1,4);notifyCatch(st,out);inactivate(ap);}}
  else if(ap.state===4){const i=host.players.findIndex(p=>p&&p.layer1Rect&&hit(p.layer1Rect));
   if(i>=0){const p=host.players[i],dx=p.xRaw-ap.xRaw,dy=(p.yRaw)-ap.yRaw,u=(dx===0&&dy===0)?{xRaw:0,yRaw:0}:N.normalizeRaw({xRaw:dx,yRaw:dy});
    out.faints.push({playerIndex:i,veloRaw:{xRaw:mul(u.xRaw,KNOCK_X),yRaw:KNOCK_Y},stars:true});ap.phase=11;ap.state=0;}}}
 // OnPost: Apple CheckOutMap; Post1 jumpProc (Velo = jump; airborne: + Frame.Gravity)
 const bd=host.mapBoundsRaw;
 for(const ap of st.apples){if(!(ap.flags&0x40))continue;
  if(ap.jumping){if(Math.abs(ap.jumpRaw.xRaw)>=4||Math.abs(ap.jumpRaw.yRaw)>=4){ap.veloRaw={...ap.jumpRaw};ap.jumpRaw={xRaw:0,yRaw:0};}ap.veloRaw.yRaw+=sc(st,GRAVITY);}// Frame.Gravity = stage scale x 0xa666
  if(bd&&(ap.yRaw>bd.fall||ap.yRaw<bd.up||ap.xRaw<bd.left||(bd.right>0&&ap.xRaw>bd.right)))inactivate(ap);}
 return out;
}
function deadBroadcast(st){const c=st.controller;if(c)c.flags|=2;for(const t of st.targets){t.visible=false;t.flags|=4;}for(const ap of st.apples)appleEvent(ap,EV.DEAD,{xRaw:ap.xRaw,yRaw:ap.yRaw});}
function displays(st){return {
 apples:st.apples.filter(ap=>ap.visible).map(ap=>({id:ap.id,x:ap.xRaw/F,y:ap.yRaw/F,bomb:ap.anim===2||ap.state===2||ap.state===4,angle:ap.angleRaw/F})),
 blasts:st.apples.filter(ap=>ap.flags&0x200).map(ap=>({x:ap.xRaw/F,y:ap.yRaw/F,r:ap.blastRaw/F})),
 targets:st.targets.filter(t=>t.visible).map(t=>({id:t.id,x:t.xRaw/F,y:t.yRaw/F,playerIndex:t.playerIndex,cooling:!!(t.flags&2)})),
 baskets:st.baskets.filter(b=>b.visible).map(b=>({id:b.id,x:b.xRaw/F,y:b.yRaw/F,count:b.count,playerIndex:b.playerIndex})),
 counter:st.controller?{caught:st.controller.caught,needed:st.controller.needed}:null};}
return {compile,create,step,deadBroadcast,displays,activate,appleUpdate,appleEvent,controllerUpdate,targetUpdate,frameRandom,pcg32,nextInt,nextFP,table,findCount,
 supportedTypes:['Apple','AppleController','TargetPlayer','BasketPlayer'],
 nativeConstants:{APPLE_RECT,BASKET_RECT,BASKET_Y,CROSS_R,CROSS_SPEED,MARGIN,CROSS_START,DEFAULT_INTERVAL,BLAST_SPEED,BLAST_MAX,KNOCK_X,KNOCK_Y,GRAVITY},completePhysicsFidelity:false};
});
