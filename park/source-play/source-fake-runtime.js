/* FakePlayer (176), FakeCage (177), FakeTimer (178), FakeCursor (179), 13-4, the
 * playable reconstruction from the saved Ghidra project ('FakePlayerComponent$$',
 * 'FakeCageComponent$$', 'FakeTimerComponent$$', 'FakeCursorComponent$$',
 * 'StageNoticeComponent$$'); source-fake-devices.js keeps the earlier analysis.
 * No game executed. Component offsets are component fields; FP 16.16.
 * The participants have no Player actor here: each one's body is a FakePlayer.
 *  FakePlayer.Creator 0x18183df60: player index -1, fakeLevel QFP._1, collision =
 *   PlayerComponent's body rect (H 46, W 32, X -16, Y -47: .cctor 0x1816cb910,
 *   +0x28 = 44-12, +0x30 = 48-2, +0x38 = -W/2, +0x40 = -H-1), pushBack 3, layer 6;
 *   a FakeCage at (x, y - PlayerComponent+0x10 / 2) = (x, y - 24).
 *  OnStart 0x18183e380: AddFakePlayer 0x181844060 to the FakeTimer (info: index,
 *   player 0xff, cage, fake, cage position).
 *  OnUpdate 0x18183e4b0: aiProc 0x18183e540 (AI only), manualProc 0x18183f0a0 (the
 *   goal sequence of a manual body), actionProc 0x18183f420:
 *   - input (IsOnInput 0x18183fdf0 / IsPressInput 0x18183ffb0, off while stopped
 *     (flag 1) or flag 0x10): AI = its own direction / jump flags 4 (hold) 2 (press),
 *     an imitating AI or a participant = that player's buttons, flag 0x20 = every
 *     player's buttons OR'ed (Frame.GetGamePlayerInputButton 0x18174a7e0: 6 left,
 *     7 right, 8 jump, 4 up, 5 down, 0 decide);
 *   - x = +-QPlayerDefine walk (QFP._3, .cctor 0x18177e270) or 0, animation 2/3 (pushing
 *     a side), else back to 1 (SetAnim 0x181840150 guards);
 *   - on the floor y = 0 (jump animation -> 1), in the air calcGravity 0x1818405d0
 *     (+0xa666 up to 0x138000, times BaseScale);
 *   - jump (isEnableJump 0x181840700): a press starts it (animation 4, SE 12; under a
 *     ceiling only the animation) with GetJumpVelo 0x1818407c0 = -0x5199a * BaseScale
 *     and x = 0 that update (0x18183fbd1); held for count 1..13 adds
 *     velo * (1 - count/14) * 0x3333;
 *   - in a cage the step is clamped to the cage inside (0x18183fbe7..fccd), out of it
 *     the collision scene pushes back; Pos += step.
 *  aiProc: trends from the FakeTimer (+0x70 jump, +0x78 left, +0x80 right); active =
 *   left or right >= MOVE_TREND QFP[0x58] 0.125 or jump > JUMP_TREND QFP._0_10.
 *   0 idle: when active, RNG.Next(0,100) < 33 -> 2 (imitate), else timer Next(1,2) s,
 *   1; 1 moveProc 0x18183ea50 + jumpProc 0x18183ecf0 until the timer ends and both
 *   rest; 2 startImitate 0x18183efb0 (a random participant), timer Next(3,4) s, 3;
 *   3 imitate while active and the timer runs, then index -1, 0.
 *   moveProc: direction lottery Next(0,100) against min(trend+0.25,1)*50 for left,
 *   then right; hold Next(0.05,0.2) s. jumpProc: on the floor Next(0,100) < 50 sets
 *   press+hold; hold Next(0.1,0.75) s.
 *  OnRecvEvent 0x181840ad0: 35 stop (flag 1); 1 resume, with value != 0 a manual body
 *   is revealed (fade state 1, collision layer 1). OnPost/fadeProc 0x181840a00:
 *   fakeLevel 1 -> 0 over 1 s, state 2. OnCollided 0x181840bd0: the open Goal (layer
 *   12) and an up press -> manual 1: hidden (collision off), IsClear flag 8, 1 s; 3 up
 *   again with nothing in the way -> visible, flag 0x10 for QFP._0_25 s, 0.
 *  FakeCage Initialize 0x18183c360: inside 62 x 68 around its position; collision
 *   76 x 76 at -38, pushBack 2, layer 6, fixed (flag 4). Event 35: collision off,
 *   fade 1 -> 0 at QFP._2 per second, removed (OnPost 0x18183c4d0).
 *  FakeTimer ParseParameter 0x181841d80: seconds per count (default QFP._10), extra
 *   all-player bodies per count (QPlayerCountParamUtility.Find). OnStart 0x1818423f0:
 *   assignPlayer 0x1818424c0 (each participant takes list[Next(0,len)], stable
 *   removal: player index, colour, manual; then the extra bodies colour 8, flag 0x20,
 *   manual), event 35 to every FakePlayer.
 *   OnUpdate 0x181842c90: 0 timer QFP._0_15; 1 count down, notice WHO_ARE_YOU/Move
 *   (StageNotice +0x10 wait QFP._0_50); 2 notice finished -> event 1 to every
 *   FakePlayer; 3 seconds count down (tick SE 0x13 per second under 4); 4 QFP._0_20,
 *   then event 35 to every FakePlayer and the whistle; 5 QFP._1_50, then the press
 *   text and a FakeCursor per participant (showCursor 0x181843610); 6 every
 *   participant revealed (checkCorrectAll 0x181843780); 7 every participant inside
 *   the goal (checkStageClear 0x181843920) -> Stage flag 0x800 (clear), SE 15.
 *   OnPost 0x181843ac0: storeHistory 0x181843b40 (4 samples of left/right/jump held,
 *   trend = count / (players * 4)), updateAngle (period 1024).
 *  FakeCursor Creator 0x18183cd80 at the participant's order cage; selectCage
 *   0x18183d4a0: up/down/left/right presses move to GetCageInfo 0x181844410 (the
 *   nearest cage that way within +-QFP._32 across), decide checks CheckPlayer
 *   0x181844c90; the answer waits QFP._0_75 s, then ReceiveResult 0x181844dd0: right
 *   -> event 35 to its cage, event 1 value 1 to its body, cursor removed; wrong ->
 *   Stage flag 0x400 (retry).
 *  StageNotice 0x18170e590: Start -> Show, then Release once its wait has run out and
 *   the view reported the animation finished (pollingCommands 0x18170e5d0).
 * Named approximations:
 *  - the notice view: StageNoticeAnimatorController state Move is 2.5 s at speed 1
 *    (sharedassets4.assets); the view's finished command is taken at 2.5 s of
 *    simulated time after the Show, with no input latency;
 *  - out of a cage: the collision scene pushback is a sweep of the body against the
 *    terrain, the fixed cages and the other free bodies; contact = half a pixel;
 *  - OnStart in updater order (FakePlayer before FakeTimer);
 *  - the session RNG seed is the Quantum default stream.
 */
(function(root,factory){const api=factory();if(typeof module==='object'&&module.exports)module.exports=api;root.SourceFakeRuntime=api;})(typeof globalThis!=='undefined'?globalThis:this,function(){
'use strict';
const F=65536,WALK=3*F,GRAVITY=0xa666,TERMINAL=0x138000,JUMP=-0x5199a,HOLD=0x3333,HOLD_DIV=0xe0000;
const BODY={x:-16*F,y:-47*F,w:32*F,h:46*F},CAGE_IN={w:62*F,h:68*F},CAGE_BOX=38*F,CAGE_DY=24*F;
const MOVE_TREND=8192,JUMP_TREND=6553,TREND_ADD=16384,CHANCE=50*F,HUNDRED=100*F,IMITATE_PERCENT=33;
const T={START:9830,PRESS_WAIT:13107,CURSOR_WAIT:98304,SECONDS:10*F,TICK_UNDER:4*F,TICK_EPS:0x28f,ANSWER:49152,GOAL_IN:F,GOAL_OUT:16384,FADE:F,CAGE_FADE_SPEED:2*F,
 NOTICE_WAIT:32768,NOTICE_VIEW:163840,AI_MIN:F,AI_MAX:2*F,IMITATE_MIN:3*F,IMITATE_MAX:4*F,MOVE_MIN:3275,MOVE_MAX:13107,JUMP_MIN:6553,JUMP_MAX:49152,CAGE_BAND:32*F,ANGLE_PERIOD:1024*F};
const EV={RESUME:1,STOP:35};
const DEFAULT_RNG={state:'9600629759793949339',inc:'15726070495360670683'};
const B=v=>BigInt(v),i64=v=>BigInt.asIntN(64,v),num=v=>{const n=Number(v);if(!Number.isSafeInteger(n))throw Error('Fake raw outside safe range');return n;};
const mul=(a,b)=>num(i64(B(a)*B(b))>>16n);
const clone=v=>JSON.parse(JSON.stringify(v));
const allowed=(v,c)=>!v||v<0&&c<=-v||v>0&&v<10&&c>=v||v>=10&&c>=Math.trunc(v/10)&&c<=v%10;
const fp=v=>Math.trunc(Math.fround(Math.fround(v)*F));
// QPlayerCountParam tables: one char per byte minus 0x21, little-endian, walk-down lookup.
function table(a,i,width){const d=(a.datas||[])[i];if(!d||d.t!==2||typeof d.s!=='string'||d.s.length!==7*width)return Array(7).fill(0);
 const t=[];for(let e=0;e<7;e++){let v=0n;for(let k=width-1;k>=0;k--)v=(v<<8n)|B(((d.s.charCodeAt(e*width+k)&0xff)-0x21)&0xff);t.push(num(BigInt.asIntN(width*8,v)));}return t;}
function findCount(t,count){for(let i=Math.min(count-2,6);i>=0;i--)if(t[i]!==0)return t[i];return 0;}
// ---- frame RNG (PCG32) ---------------------------------------------------------------
const PCG=6364136223846793005n,M64=(1n<<64n)-1n;
function pcg32(rng){const old=B(rng.state);rng.state=((old*PCG+(B(rng.inc)|1n))&M64).toString();const x=Number(((old>>45n)^(old>>27n))&0xffffffffn),rot=Number(old>>59n);return ((x>>>rot)|(x<<((32-rot)&31)))>>>0;}
function nextInt(rng,min,max){if(min===max)return min;let lo=max,hi=min;if(min<max){lo=min;hi=max;}const u=(hi-lo)>>>0,threshold=(2**32-u)%u;let x;do x=pcg32(rng);while(x<threshold);return lo+x%u;}
function nextFP(rng,min,max){let lo=min,hi=max;if(max<min){lo=max;hi=min;}return num(i64(B(pcg32(rng)>>>16)*B(hi-lo))>>16n)+lo;}
// ---- compile ----------------------------------------------------------------------------
function compile(actors,count){
 if(!Number.isInteger(count)||count<2||count>8)throw Error('Fake count 2..8 required');
 const fakes=[],cages=[];let timer=null;
 actors.forEach((raw,i)=>{const a=raw.properties||raw;if(!allowed(a.playerCount,count))return;
  const id=raw.id||'source:a'+i,xRaw=fp(a.posX??raw.x),yRaw=fp(a.posY??raw.y);
  if((a.typeName==='FakePlayer'||a.typeName==='FakeTimer')&&(raw.createThreshold??a.createThreshold??0)!==0)throw Error('Fake delayed creation ordering unresolved');
  if(a.typeName==='FakePlayer'){
   if((a.datas||[]).some(d=>d.t===1&&d.f!==0||d.t===2&&d.s))throw Error('FakePlayer authored parameters unresolved');
   const cage={id:id+':cage',fakeId:id,xRaw,yRaw:yRaw-CAGE_DY,x0Raw:xRaw-CAGE_IN.w/2,y0Raw:yRaw-CAGE_DY-CAGE_IN.h/2,wRaw:CAGE_IN.w,hRaw:CAGE_IN.h,phase:0,fadeRaw:F,collisionActive:true,removed:false};
   cages.push(cage);
   fakes.push({id,name:a.name||'',xRaw,yRaw,vxRaw:0,vyRaw:0,facingLeft:false,anim:0,cageId:cage.id,
    playerIndex:-1,colorIndex:0,mode:0,fadeState:0,fakeLevelRaw:F,aiPhase:0,jumpPhase:0,movePhase:0,dir:0,goalPhase:0,flags:0,jumpCount:0,
    aiTimerRaw:0,moveTimerRaw:0,jumpTimerRaw:0,goalTimerRaw:0,layer:6,visible:true,baseScaleRaw:F});
   return;}
  if(a.typeName!=='FakeTimer')return;
  if(timer)throw Error('Fake: one FakeTimer per stage');
  const seconds=findCount(table(a,0,8),count),extra=findCount(table(a,4,4),count),scale=fp((a.datas[3]&&a.datas[3].t===1)?a.datas[3].f:0);
  timer={id,name:a.name||'',phase:0,flags:0,secondRaw:seconds>0?seconds:T.SECONDS,timerRaw:0,allInputCount:((extra&255)^128)-128,angleRaw:0,
   uiXRaw:fp(a.datas[1]?.f||0),uiYRaw:416*F+fp(a.datas[2]?.f||0),uiScaleRaw:Math.abs(scale)>3?mul(scale,10*F):10*F,
   historyIndex:0,history:Array.from({length:4},()=>Array(8).fill(0)),trend:{jumpRaw:0,leftRaw:0,rightRaw:0},infos:[],manualIds:[],pressShown:false,whistle:0};
 });
 if(fakes.length&&!timer)throw Error('FakePlayer without FakeTimer');
 return {schemaVersion:1,count,fakes,cages,timer,cursors:[],notice:{phase:0,type:0,anim:0,waitRaw:0,flags:0,viewRaw:0},started:false,
  rng:{...DEFAULT_RNG},prevButtons:Array.from({length:8},()=>({})),stageFlags:0,sounds:[],completePhysicsFidelity:false};
}
const create=clone;
// ---- input ------------------------------------------------------------------------------
// host.buttons[i] = {left,right,jump,up,down,decide} held for participant i.
// The update's participants and buttons (not part of the shipped state).
let ctx={participants:[],colorOf:i=>i,buttons:[]};
const BUTTON={6:'left',7:'right',8:'jump',4:'up',5:'down',0:'decide'};
function held(st,i,b){const k=BUTTON[b],now=ctx.buttons&&ctx.buttons[i];return !!(now&&now[k]);}
function pressed(st,i,b){const k=BUTTON[b];return held(st,i,b)&&!(st.prevButtons[i]&&st.prevButtons[i][k]);}
function enabled(f){return !(f.flags&0x10);}
function isOnInput(st,f,b){
 if(f.flags&1||!enabled(f))return false;
 if(f.playerIndex<0){
  if(!(f.flags&0x20)){if(b===6)return f.dir<0;if(b===7)return f.dir>0;if(b===8)return !!(f.flags&4);return false;}
  for(let i=0;i<8;i++)if(held(st,i,b))return true;return false;}
 return held(st,f.playerIndex,b);
}
function isPressInput(st,f,b){
 if(f.flags&1||!enabled(f))return false;
 if(f.playerIndex<0){
  if(!(f.flags&0x20))return b===8&&!!(f.flags&2);
  for(let i=0;i<8;i++)if(pressed(st,i,b))return true;return false;}
 return pressed(st,f.playerIndex,b);
}
// ---- body geometry ----------------------------------------------------------------------
const cageOf=(st,f)=>{const c=st.cages.find(q=>q.id===f.cageId);return c&&!c.removed?c:null;};
function rectOf(f,dx=0,dy=0){return {x:f.xRaw+BODY.x+dx,y:f.yRaw+BODY.y+dy,w:BODY.w,h:BODY.h};}
const px=r=>({x:r.x/F,y:r.y/F,w:r.w/F,h:r.h/F});
// In a cage (IsContacted 0x181840820 / isFloating 0x181840210 with a cage): touching
// a side of the inside within one pixel. Out of it: half a pixel against solids.
function freeSolids(st,host,self){const out=[];for(const r of host.terrain||[])out.push(r);
 for(const c of st.cages)if(!c.removed&&c.collisionActive)out.push({x:(c.xRaw-CAGE_BOX)/F,y:(c.yRaw-CAGE_BOX)/F,w:2*CAGE_BOX/F,h:2*CAGE_BOX/F});
 for(const f of st.fakes)if(f!==self&&f.layer===1&&f.visible&&!cageOf(st,f))out.push(px(rectOf(f)));return out;}
function touching(r,solids,dir){const e=0.5;return solids.some(o=>{const hx=r.x<o.x+o.w-1e-6&&r.x+r.w>o.x+1e-6,hy=r.y<o.y+o.h-1e-6&&r.y+r.h>o.y+1e-6;
 if(dir===0)return hx&&Math.abs(o.y+o.h-r.y)<e;if(dir===1)return hx&&Math.abs(r.y+r.h-o.y)<e;if(dir===2)return hy&&Math.abs(o.x+o.w-r.x)<e;return hy&&Math.abs(r.x+r.w-o.x)<e;});}
function contacted(st,host,f,dir){const c=cageOf(st,f),r=rectOf(f);
 if(c){if(dir===0)return r.y-c.y0Raw-F<0;if(dir===1)return r.y+r.h-(c.y0Raw+c.hRaw)+F>0;if(dir===2)return r.x-c.x0Raw-F<0;return r.x+r.w-(c.x0Raw+c.wRaw)+F>0;}
 return touching(px(r),freeSolids(st,host,f),dir);}
function floating(st,host,f){const c=cageOf(st,f);if(c){const r=rectOf(f);return Math.max(0,r.y+r.h-(c.y0Raw+c.hRaw)+F)<1;}return !contacted(st,host,f,1);}
// SetAnim 0x181840150
function setAnim(f,a,force=false){if(f.anim===a&&!force)return;if(f.anim!==0&&!force){if(a===2&&((f.anim-1)&~2)!==0)return;if(a===3&&f.anim!==1&&f.anim!==2)return;}f.anim=a;}
// ---- FakePlayer -------------------------------------------------------------------------
function active(tr,f){if(f.flags&1)return false;return tr.leftRaw>=MOVE_TREND||tr.rightRaw>=MOVE_TREND||tr.jumpRaw>JUMP_TREND;}
function moveProc(st,f,tr,dt){
 const moving=tr.leftRaw>=MOVE_TREND||tr.rightRaw>=MOVE_TREND;
 if(f.movePhase===0){f.dir=0;if(!moving)return false;
  const l=mul(Math.min(tr.leftRaw+TREND_ADD,F),CHANCE),r=mul(Math.min(tr.rightRaw+TREND_ADD,F),CHANCE),x=nextFP(st.rng,0,HUNDRED);
  if(x<l)f.dir=-1;else if(x<r+l)f.dir=1;
  f.moveTimerRaw=nextFP(st.rng,T.MOVE_MIN,T.MOVE_MAX);f.movePhase=1;return true;}
 if(f.movePhase===1){if(moving){f.moveTimerRaw-=dt;if(f.moveTimerRaw>0)return true;}f.movePhase=0;}
 return true;
}
function jumpProc(st,host,f,tr,dt){
 if(f.jumpPhase!==0){if(f.jumpPhase===1){f.flags&=~2;if(tr.jumpRaw>=JUMP_TREND){f.jumpTimerRaw-=dt;if(f.jumpTimerRaw>0)return true;}f.jumpPhase=0;}return true;}
 f.flags&=~6;if(tr.jumpRaw<JUMP_TREND)return false;
 if(contacted(st,host,f,1)&&nextFP(st.rng,0,HUNDRED)<CHANCE)f.flags|=6;
 f.jumpTimerRaw=nextFP(st.rng,T.JUMP_MIN,T.JUMP_MAX);f.jumpPhase=1;return true;
}
function aiProc(st,host,f,dt){
 if(f.mode!==0)return;
 const t=st.timer,tr=f.flags&1?{jumpRaw:0,leftRaw:0,rightRaw:0}:t.trend,act=tr.leftRaw>=MOVE_TREND||tr.rightRaw>=MOVE_TREND||tr.jumpRaw>JUMP_TREND;
 if(f.aiPhase===0){if(!act)return;if(nextInt(st.rng,0,100)<IMITATE_PERCENT){f.aiPhase=2;return;}f.aiTimerRaw=nextFP(st.rng,T.AI_MIN,T.AI_MAX);f.aiPhase=1;return;}
 if(f.aiPhase===1){const m=moveProc(st,f,tr,dt),j=jumpProc(st,host,f,tr,dt);if(!m&&!j)f.aiTimerRaw=0;f.aiTimerRaw-=dt;if(f.aiTimerRaw>0)return;if(m||j)return;f.aiPhase=0;return;}
 if(f.aiPhase===2){f.playerIndex=ctx.participants[nextInt(st.rng,0,ctx.participants.length)];f.aiTimerRaw=nextFP(st.rng,T.IMITATE_MIN,T.IMITATE_MAX);f.aiPhase=3;return;}
 if(f.aiPhase===3){if(act){f.aiTimerRaw-=dt;if(f.aiTimerRaw>0)return;}f.playerIndex=-1;f.aiPhase=0;}
}
function manualProc(st,host,f,dt){
 if(f.mode!==1||f.goalPhase===0)return;
 if(f.goalPhase===1){f.vxRaw=0;f.visible=false;f.flags|=8;f.goalTimerRaw=T.GOAL_IN;f.goalPhase=2;return;}
 if(f.goalPhase===2){f.goalTimerRaw-=dt;if(f.goalTimerRaw>0)return;f.goalPhase=3;return;}
 if(f.goalPhase===3){if(!isPressInput(st,f,4))return;
  // CollisionScene.IsCollidedByPushBackTarget: nothing solid may overlap the body
  const r=px(rectOf(f));if(freeSolids(st,host,f).some(o=>r.x<o.x+o.w&&r.x+r.w>o.x&&r.y<o.y+o.h&&r.y+r.h>o.y))return;
  f.visible=true;f.flags=(f.flags&~8)|0x10;f.goalTimerRaw=T.GOAL_OUT;f.goalPhase=4;return;}
 if(f.goalPhase===4){f.goalTimerRaw-=dt;if(f.goalTimerRaw>0)return;f.goalPhase=0;f.flags&=~0x10;}
}
function actionProc(st,host,f){
 if(f.flags&8)return;
 const c=cageOf(st,f);let vy=f.vyRaw,vx=0,pushing=false;
 if(isOnInput(st,f,6)){f.facingLeft=true;pushing=contacted(st,host,f,2);vx=-WALK;setAnim(f,pushing?3:2);}
 else if(isOnInput(st,f,7)){f.facingLeft=false;pushing=contacted(st,host,f,3);vx=WALK;setAnim(f,pushing?3:2);}
 else if(f.anim===2||f.anim===3)f.anim=1;
 if(!floating(st,host,f)){if(f.anim===4)f.anim=1;vy=0;}
 else{let n=vy+GRAVITY;if(n>=TERMINAL)n=TERMINAL;vy+=mul(n-vy,f.baseScaleRaw);}
 if(vy>=0)f.jumpCount=0;
 const canJump=(f.jumpCount>=1&&f.jumpCount<=13)||contacted(st,host,f,1);
 if(canJump){
  if(!isPressInput(st,f,8)){
   if(f.jumpCount>=1&&f.jumpCount<=13&&isOnInput(st,f,8)){const k=f.jumpCount,v=mul(JUMP,f.baseScaleRaw);f.jumpCount++;
    const factor=num(i64(B(F-num(i64(B(k)<<32n)/B(HOLD_DIV)))*B(HOLD))>>16n);vy+=mul(v,factor);}
   else f.jumpCount=0;}
  else{if(f.anim!==4)f.anim=4;st.sounds.push({se:12,id:f.id});
   if(!contacted(st,host,f,0)){let v=mul(JUMP,f.baseScaleRaw);f.jumpCount=1;if(vy<v){f.jumpCount=14;v=vy;}vx=0;vy=v;}}
 }
 if(c){const r=rectOf(f,vx,vy);
  const l=Math.min(0,r.x-c.x0Raw),rt=Math.max(0,r.x+r.w-(c.x0Raw+c.wRaw)),t=Math.min(0,r.y-c.y0Raw),bt=Math.max(0,r.y+r.h-(c.y0Raw+c.hRaw));
  vx-=rt+l;vy+=-bt-t;f.xRaw+=vx;f.yRaw+=vy;}
 else{// collision scene pushback (named approximation): x then y against the solids
  const solids=freeSolids(st,host,f);let dx=vx/F,dy=vy/F;const r=px(rectOf(f));
  for(const o of solids)if(r.y<o.y+o.h-1e-6&&r.y+r.h>o.y+1e-6){if(dx>0&&r.x+r.w<=o.x+1e-6)dx=Math.min(dx,o.x-(r.x+r.w));if(dx<0&&r.x>=o.x+o.w-1e-6)dx=Math.max(dx,o.x+o.w-r.x);}
  const nx=r.x+dx;
  for(const o of solids)if(nx<o.x+o.w-1e-6&&nx+r.w>o.x+1e-6){if(dy>0&&r.y+r.h<=o.y+1e-6){dy=Math.min(dy,o.y-(r.y+r.h));}if(dy<0&&r.y>=o.y+o.h-1e-6)dy=Math.max(dy,o.y+o.h-r.y);}
  const mx=Math.round(dx*F),my=Math.round(dy*F);if(my!==vy&&vy<0)vy=0;if(my!==vy&&vy>0)vy=my;f.xRaw+=mx;f.yRaw+=my;vx=mx;}
 f.vxRaw=vx;f.vyRaw=vy;
}
function fakeEvent(st,f,type,value){if(type===EV.STOP){f.flags|=1;return;}
 if(type===EV.RESUME){f.flags&=~1;if(value&&f.mode===1){f.fadeState=1;f.layer=1;}}}
function fadeProc(f,dt){if(f.fadeState===1){f.fakeLevelRaw-=dt;if(f.fakeLevelRaw<=0){f.fakeLevelRaw=0;f.fadeState=2;}}}
// ---- FakeTimer --------------------------------------------------------------------------
function start(st){
 if(st.started)return;st.started=true;const t=st.timer;if(!t)return;
 // FakePlayer.OnStart -> AddFakePlayer, registration order
 st.fakes.forEach((f,i)=>{const c=st.cages.find(q=>q.id===f.cageId);t.infos.push({index:i,playerIndex:-1,cursorIds:[],cageId:c.id,fakeId:f.id,xRaw:c.xRaw,yRaw:c.yRaw});});
 // FakeTimer.OnStart -> assignPlayer, then event 35 to every FakePlayer
 const list=t.infos.map(q=>q.fakeId);
 for(const p of ctx.participants){const r=nextInt(st.rng,0,list.length);if(!(r<list.length))throw Error('Fake assignment: not enough bodies');const id=list.splice(r,1)[0],f=st.fakes.find(q=>q.id===id);
  Object.assign(f,{playerIndex:p,colorIndex:ctx.colorOf(p),mode:1,goalPhase:0,aiPhase:0});t.manualIds.push(id);t.infos.find(q=>q.fakeId===id).playerIndex=p;}
 for(let i=0;i<t.allInputCount;i++){if(list.length<1)break;const r=nextInt(st.rng,0,list.length),id=list.splice(r,1)[0],f=st.fakes.find(q=>q.id===id);f.colorIndex=8;f.flags|=0x20;f.mode=1;}
 for(const f of st.fakes)fakeEvent(st,f,EV.STOP,0);
 t.flags|=1;
}
function timerUpdate(st,dt){
 const t=st.timer,out={};
 switch(t.phase){
  case 0:t.timerRaw=T.START;t.phase++;break;
  case 1:t.timerRaw-=dt;if(t.timerRaw>0)return out;
   if(st.notice.phase===0)Object.assign(st.notice,{anim:2,type:5,waitRaw:T.NOTICE_WAIT,flags:0,phase:1,viewRaw:0});t.phase++;break;
  case 2:if(!(st.notice.flags&4))return out;for(const f of st.fakes)fakeEvent(st,f,EV.RESUME,0);t.flags&=~1;t.phase++;break;
  case 3:{const old=t.secondRaw;t.secondRaw-=dt;if(t.secondRaw<0)t.secondRaw=0;
   if(t.secondRaw>0){if(t.secondRaw<T.TICK_UNDER&&((old-T.TICK_EPS)>>16)!==((t.secondRaw-T.TICK_EPS)>>16))st.sounds.push({se:0x13});return out;}
   t.timerRaw=T.PRESS_WAIT;t.phase++;break;}
  case 4:t.timerRaw-=dt;if(t.timerRaw>0)return out;for(const f of st.fakes)fakeEvent(st,f,EV.STOP,0);st.sounds.push({se:0x17});t.whistle++;t.timerRaw=T.CURSOR_WAIT;t.phase++;break;
  case 5:t.timerRaw-=dt;if(t.timerRaw>0)return out;t.flags|=1;t.pressShown=true;
   ctx.participants.forEach((p,i)=>{const info=t.infos[i];const cur={id:t.id+':cursor'+p,playerIndex:p,cageIndex:i,phase:0,result:0,answer:0,timerRaw:0,colorIndex:ctx.colorOf(p),xRaw:info?info.xRaw:0,yRaw:info?info.yRaw:0,removed:false};
    st.cursors.push(cur);if(info)info.cursorIds.push(cur.id);});t.phase++;break;
  case 6:if(!t.manualIds.every(id=>{const f=st.fakes.find(q=>q.id===id);return f&&f.fadeState>=1;}))return out;t.pressShown=false;t.phase++;break;
  case 7:if(!t.manualIds.every(id=>{const f=st.fakes.find(q=>q.id===id);return f&&(f.flags&8);}))return out;st.stageFlags|=0x800;st.sounds.push({se:15});t.phase++;out.clear=true;break;
 }
 return out;
}
function storeHistory(st){const t=st.timer,n=ctx.participants.length,row=t.history[t.historyIndex];
 ctx.participants.forEach((p,i)=>{let b=held(st,p,6)?1:0;if(held(st,p,7))b|=2;if(held(st,p,8))b|=4;row[i]=b;});
 t.historyIndex=t.historyIndex+1>3?0:t.historyIndex+1;
 let l=0,r=0,j=0;for(const q of t.history)for(let i=0;i<n;i++){if(q[i]&1)l+=F;if(q[i]&2)r+=F;if(q[i]&4)j+=F;}
 const d=B(n*4)<<16n;t.trend={leftRaw:num((B(l)<<16n)/d),rightRaw:num((B(r)<<16n)/d),jumpRaw:num((B(j)<<16n)/d)};
}
// ---- FakeCursor -------------------------------------------------------------------------
// GetCageInfo 0x181844410: the nearest cage in that direction within +-32 across.
function cageInDirection(t,from,dir){const c=t.infos[from];if(!c)return null;const xa=c.xRaw-T.CAGE_BAND,xb=c.xRaw+T.CAGE_BAND,ya=c.yRaw-T.CAGE_BAND,yb=c.yRaw+T.CAGE_BAND;let best=null;
 t.infos.forEach((q,i)=>{const x=q.xRaw,y=q.yRaw;
  if(dir===0){if(y<ya&&xa<=x&&x<=xb&&(!best||best.yRaw<=y))best=q;}
  else if(dir===1){if(y>yb&&xa<=x&&x<=xb&&(!best||y<=best.yRaw))best=q;}
  else if(dir===2){if(x<xa&&ya<=y&&y<=yb&&!(best&&x<best.xRaw))best=q;}
  else if(x>xb&&ya<=y&&y<=yb&&!(best&&best.xRaw<x))best=q;});
 return best;}
function checkPlayer(t,index,player){const q=t.infos[index];if(!q||!q.fakeId)return 0;return q.playerIndex===player?1:-1;}
function cursorUpdate(st,cur,dt){
 const t=st.timer,p=cur.playerIndex;
 if(cur.phase===0){
  let dir=-1;if(pressed(st,p,4))dir=0;if(pressed(st,p,5))dir=1;if(pressed(st,p,6))dir=2;if(pressed(st,p,7))dir=3;
  let r=0;
  if(dir<0){if(!pressed(st,p,0))return {};r=checkPlayer(t,cur.cageIndex,p);}
  else{const q=cageInDirection(t,cur.cageIndex,dir);if(q){const old=t.infos[cur.cageIndex];if(old)old.cursorIds=old.cursorIds.filter(id=>id!==cur.id);cur.cageIndex=q.index;cur.xRaw=q.xRaw;cur.yRaw=q.yRaw;q.cursorIds.push(cur.id);}return {};}
  if(r===0)return {};
  cur.answer=r<0?2:1;st.sounds.push({se:r<0?2:0x18});cur.result=r;cur.timerRaw=T.ANSWER;cur.phase=1;return {};}
 if(cur.phase===1){cur.timerRaw-=dt;if(cur.timerRaw>0)return {};const res=receiveResult(st,cur.cageIndex,cur.result>0);if(cur.result>0){cur.removed=true;const q=t.infos[cur.cageIndex];if(q)q.cursorIds=q.cursorIds.filter(id=>id!==cur.id);}cur.phase=2;return res;}
 return {};
}
function receiveResult(st,index,right){
 if(!right){st.stageFlags|=0x400;return {retry:true};}
 const q=st.timer.infos[index];if(!q||!q.fakeId)return {};
 const c=st.cages.find(x=>x.id===q.cageId);if(c&&c.phase===0){c.collisionActive=false;c.phase=1;}
 const f=st.fakes.find(x=>x.id===q.fakeId);if(f)fakeEvent(st,f,EV.RESUME,1);
 q.fakeId=null;return {revealed:f?f.id:null};
}
// ---- StageNotice (end of the update) ------------------------------------------------------
function noticeUpdate(st,dt){const n=st.notice;if(n.phase===0)return;
 if(n.phase>=2){n.viewRaw+=dt;if(n.viewRaw>=T.NOTICE_VIEW)n.flags|=2;}// view's finished command (named approximation)
 if(n.phase===1){n.phase=2;return;}
 if(n.phase===2){n.waitRaw-=dt;if(n.waitRaw<=0&&(n.flags&2)&&!(n.flags&1)){n.flags|=4;n.phase=0;}}}
/* One update. host: {dtRaw, participants [player index], colorOf(index), buttons[index]
 * {left,right,jump,up,down,decide} held, terrain [{x,y,w,h}] px, goal {x,y,w,h} px,
 * goalOpen bool}. Returns {clear, retry, revealed:[ids]}. */
function step(st,host){
 const dt=host.dtRaw,out={clear:false,retry:false,revealed:[]};st.sounds=[];
 ctx={participants:host.participants||[],colorOf:host.colorOf||(i=>i),buttons:host.buttons||[]};
 if(!st.timer){st.prevButtons=clone(host.buttons||[]);return out;}
 start(st);
 // OnUpdate: FakePlayer (98), FakeCursor (99), FakeCage (125, none), FakeTimer (126)
 for(const f of st.fakes){aiProc(st,host,f,dt);manualProc(st,host,f,dt);actionProc(st,host,f);}
 for(const cur of st.cursors){if(cur.removed)continue;const r=cursorUpdate(st,cur,dt);if(r.retry)out.retry=true;if(r.revealed)out.revealed.push(r.revealed);}
 const tr=timerUpdate(st,dt);if(tr.clear)out.clear=true;
 // collision: FakePlayer.OnCollided with the open Goal (layer 12) for a visible layer-1 body
 if(host.goal)for(const f of st.fakes){if(f.layer!==1||!f.visible||f.mode!==1||f.goalPhase!==0||!host.goalOpen)continue;const r=px(rectOf(f)),g=host.goal;
  if(r.x<g.x+g.w&&r.x+r.w>g.x&&r.y<g.y+g.h&&r.y+r.h>g.y&&isPressInput(st,f,4))f.goalPhase=1;}
 // OnPost: FakePlayer fade, FakeCage fade and removal, FakeTimer history and angle
 for(const f of st.fakes)fadeProc(f,dt);
 for(const c of st.cages)if(c.phase===1&&!c.removed){c.fadeRaw-=mul(dt,T.CAGE_FADE_SPEED);if(c.fadeRaw<=0){c.fadeRaw=0;c.removed=true;c.phase=2;}}
 storeHistory(st);st.timer.angleRaw+=mul(dt,T.ANGLE_PERIOD);if(st.timer.angleRaw>=T.ANGLE_PERIOD)st.timer.angleRaw-=T.ANGLE_PERIOD;
 noticeUpdate(st,dt);
 st.prevButtons=clone(host.buttons||[]);
 return out;
}
function bodyFor(st,player){return st.fakes.find(f=>f.mode===1&&f.playerIndex===player&&!(f.flags&0x20))||null;}
function displays(st){const t=st.timer;return {
 fakes:st.fakes.map(f=>({id:f.id,x:f.xRaw/F,y:f.yRaw/F,rect:px(rectOf(f)),facingLeft:f.facingLeft,anim:f.anim,visible:f.visible,revealed:f.fadeState>0,fakeLevel:f.fakeLevelRaw/F,colorIndex:f.colorIndex,playerIndex:f.mode===1&&!(f.flags&0x20)?f.playerIndex:-1})),
 cages:st.cages.filter(c=>!c.removed).map(c=>({id:c.id,x:c.xRaw/F,y:c.yRaw/F,half:CAGE_BOX/F,fade:c.fadeRaw/F,open:c.phase>0})),
 cursors:st.cursors.filter(c=>!c.removed).map(c=>{const q=t&&t.infos[c.cageIndex];const order=q?q.cursorIds.indexOf(c.id):0,n=q?q.cursorIds.length:1;return {id:c.id,x:c.xRaw/F,y:c.yRaw/F,colorIndex:c.colorIndex,answer:c.answer,order,count:n};}),
 timer:t?{seconds:Math.ceil(t.secondRaw/F),phase:t.phase,x:t.uiXRaw/F,y:t.uiYRaw/F,press:t.pressShown}:null,
 notice:st.notice.phase?{type:'WHO_ARE_YOU',t:st.notice.viewRaw/T.NOTICE_VIEW}:null};}
return {compile,create,step,start,displays,bodyFor,aiProc,actionProc,manualProc,moveProc,jumpProc,timerUpdate,storeHistory,cursorUpdate,cageInDirection,checkPlayer,receiveResult,noticeUpdate,fakeEvent,setAnim,isOnInput,isPressInput,pcg32,nextInt,nextFP,table,findCount,
 supportedTypes:['FakePlayer','FakeTimer'],nativeConstants:{BODY,CAGE_IN,CAGE_BOX,CAGE_DY,WALK,GRAVITY,TERMINAL,JUMP,MOVE_TREND,JUMP_TREND,T},completePhysicsFidelity:false};
});
