/* Arrangement (98), DummyPlayer (99), DummyColorBox (100), DummyGoal: 3-4, the playable
 * reconstruction from the saved Ghidra project ('ArrangementComponent$$',
 * 'DummyPlayerComponent$$', 'DummyColorBoxComponent$$', 'DummyGoalComponent$$').
 * No game executed. FP 16.16.
 *  ParseParameter 0x1816ad620: slot 0 variant count (Next(0, n) when non-zero), slot 1
 *   look time (+0x20), slot 2 arrange time (+0x18), slots 3/4 UI offset, slot 5 UI
 *   scale * 10, slot 6 target name.
 *  OnStart 0x1816ada40: lotteryDummyPlayer 0x1816adcf0 (the scene's DummyPlayers
 *   shuffled from the back with Next(0, i), the first player-count of them shown in
 *   player i's colour, the rest removed), lotteryDummyColorBox 0x1816ae400 (the
 *   DummyColorBoxes shuffled the same way, dummy i takes ColorBox i's player (event 30
 *   = player index + 1) when that player exists), parseMap 0x1816aeb40 (first movable
 *   column from the left and from the middle, times 48), then event 53 pause to every
 *   actor (suspendStage 0x1816aed00).
 *  OnPost 0x1816aee20 -> updatePhase 0x1816aeee0: 0 timer = look time; 1 count down
 *   (SE 0x13 each second below 10 s) -> whistle, notice GO/Pass, curtain closes
 *   (startFade 1, QFP 1/15 s), timer = arrange time; 2 curtain done -> resume; 3 count
 *   down -> pause, notice FINISH/Pass; 4 notice done -> curtain opens; 5 curtain done
 *   -> compare 0x1816af770; 6/7 one result each 1.5 s (showMatchResult 0x1816b01a0,
 *   SE 0x18 / 2); 8 all right -> SE 0x19 and 3.5 s (.cctor +0x40), otherwise Stage
 *   flag 0x400 (retry); 9 resume, event 61 to the target (notifyTarget 0x1816b04c0).
 *  compare: every shown dummy needs a Player (for DummyPlayer) / ColorBox (for
 *   DummyColorBox) answering the same event 30, facing the same way, with
 *   |(pos - right start) - (dummy - left start)| <= 40 (.cctor 0x1816b0590 +0x38).
 *  DummyPlayer Creator 0x18181f010: slot 0 player, slot 1 direction (non-zero: left,
 *   SetDirection 0x18181f3f0); body = the player rect (.cctor 0x18181f830: 46, 32,
 *   -16, -47), pushBack 3, layer 5. Event 50: removed, or shown in a player's colour.
 *  DummyColorBox ParseParameter 0x18181de30: (slot 0 - 4) x (slot 1 - 4) bottom-anchored
 *   (.cctor 0x18181e240 +8 = 4), slot 2 player; pushBack 3, layer 5.
 * Named approximations:
 *  - the notices: StageNoticeAnimatorController state Pass is 3.0 s at speed 1
 *    (sharedassets4.assets); the view's finished command is taken at 3.0 s;
 *  - "every actor" pauses = the whole stage except this component (the runtime skips
 *    its update while paused).
 */
(function(root,factory){const c=typeof module==='object'&&module.exports;const api=factory(c?require('./source-distanceconstraint-math.js'):root.SourceDistanceConstraintMath);if(c)module.exports=api;root.SourceArrangementRuntime=api;})(typeof globalThis!=='undefined'?globalThis:this,function(N){
'use strict';
const F=65536,TOLERANCE=40*F,FADE_TIME=4369,FINAL_WAIT=229376,RESULT_WAIT=98304,TICK_UNDER=0xa0000,NOTICE_PASS=196608,CHIP=48*F;
const DUMMY_RECT={x:-16*F,y:-47*F,w:32*F,h:46*F};
const DEFAULT_RNG={state:'9600629759793949339',inc:'15726070495360670683'};
const B=v=>BigInt(v),i64=v=>BigInt.asIntN(64,v),num=v=>{const n=Number(v);if(!Number.isSafeInteger(n))throw Error('Arrangement raw outside safe range');return n;};
const mul=(a,b)=>num(i64(B(a)*B(b))>>16n);
const clone=v=>JSON.parse(JSON.stringify(v));
const allowed=(v,c)=>!v||v<0&&c<=-v||v>0&&v<10&&c>=v||v>=10&&c>=Math.trunc(v/10)&&c<=v%10;
const fp=v=>Math.trunc(Math.fround(Math.fround(v)*F));
function slot(a,i){const d=(a.datas||[])[i];return d&&d.t===1?fp(d.f):0;}
const PCG=6364136223846793005n,M64=(1n<<64n)-1n;
function pcg32(rng){const old=B(rng.state);rng.state=((old*PCG+(B(rng.inc)|1n))&M64).toString();const x=Number(((old>>45n)^(old>>27n))&0xffffffffn),rot=Number(old>>59n);return ((x>>>rot)|(x<<((32-rot)&31)))>>>0;}
function nextInt(rng,min,max){if(min===max)return min;let lo=max,hi=min;if(min<max){lo=min;hi=max;}const u=(hi-lo)>>>0,threshold=(2**32-u)%u;let x;do x=pcg32(rng);while(x<threshold);return lo+x%u;}
// lotteryDummyPlayer/ColorBox: for i = n-1 .. 1, j = Next(0, i), swap.
function shuffle(rng,list){for(let i=list.length-1;i>=1;i--){const j=nextInt(rng,0,i);const t=list[i];list[i]=list[j];list[j]=t;}return list;}
function compile(actors,count){
 if(!Number.isInteger(count)||count<2||count>8)throw Error('Arrangement count 2..8 required');
 let arrangement=null;const dummies=[],boxes=[],goals=[],colorBoxIds=[];
 const rng={...DEFAULT_RNG};
 actors.forEach((raw,i)=>{const a=raw.properties||raw;if(!allowed(a.playerCount,count))return;const id=raw.id||'source:a'+i,xRaw=fp(a.posX??raw.x),yRaw=fp(a.posY??raw.y);
  if(a.typeName==='Arrangement'){if(arrangement)throw Error('Arrangement: one per stage');const n=slot(a,0)>>16,look=slot(a,1),arrange=slot(a,2),scale=slot(a,5),t=(a.datas||[])[6];
   arrangement={id,variant:n!==0?nextInt(rng,0,n):0,lookRaw:Math.abs(look)>3?look:0,arrangeRaw:Math.abs(arrange)>3?arrange:0,uiX:slot(a,3),uiY:416*F+slot(a,4),uiScaleRaw:Math.abs(scale)>3?mul(scale,10*F):10*F,
    target:t&&t.t===2?t.s||'':'',phase:0,timerRaw:0,prevTimerRaw:0,flags:0,resultIndex:0,results:[],shown:[],leftRaw:0,rightRaw:0,paused:false,fade:{active:false,elapsedRaw:0,fromRaw:0,toRaw:0,valueRaw:0},
    notice:{phase:0,type:0,viewRaw:0,flags:0},started:false};return;}
  if(a.typeName==='DummyPlayer'){dummies.push({id,xRaw,yRaw,playerIndex:slot(a,0)>>16,dir:slot(a,1)>>16,colorIndex:0,removed:false,shown:false});return;}
  if(a.typeName==='DummyColorBox'){const w=slot(a,0)-4*F,h=slot(a,1)-4*F;boxes.push({id,xRaw,yRaw,rect:{x:-num(i64(B(w)<<16n)/131072n),y:-h,w,h},playerIndex:slot(a,2)>>16,colorIndex:0,removed:false,shown:false});return;}
  if(a.typeName==='DummyGoal'){goals.push({id,xRaw,yRaw});return;}
  if(a.typeName==='ColorBox')colorBoxIds.push(a.name||id);
 });
 if((dummies.length||boxes.length)&&!arrangement)throw Error('Dummies without an Arrangement');
 return {schemaVersion:1,count,arrangement,dummies,boxes,goals,colorBoxIds,rng,completePhysicsFidelity:false};
}
const create=clone;
/* OnStart. host: {players:[{index, colorIndex}], colorBoxes:[{id, playerIndex}] (scene
 * order), movable(col,row) -> bool, cols, rows}. */
function start(st,host){
 const a=st.arrangement;if(!a||a.started)return;a.started=true;
 const order=shuffle(st.rng,st.dummies.slice());
 order.forEach((d,i)=>{if(i<host.players.length){d.playerIndex=host.players[i].index;d.colorIndex=host.players[i].colorIndex;d.shown=true;a.shown.push({kind:'player',id:d.id});}else d.removed=true;});
 const boxOrder=shuffle(st.rng,st.boxes.slice());
 boxOrder.forEach((d,i)=>{const real=host.colorBoxes[i];const p=real&&host.players.find(q=>q.index===real.playerIndex);
  if(p){d.playerIndex=p.index;d.colorIndex=p.colorIndex;d.shown=true;a.shown.push({kind:'box',id:d.id});}else d.removed=true;});
 // parseMap: the first movable column from the left edge and from the middle
 let left=-1;for(let x=0;x<host.cols&&left<0;x++)for(let y=0;y<host.rows;y++)if(host.movable(x,y)){left=x;break;}
 let right=-1;for(let x=host.cols>>1;x<host.cols&&right<0;x++)for(let y=0;y<host.rows;y++)if(host.movable(x,y)){right=x;break;}
 a.leftRaw=mul(Math.max(left,0)*F,CHIP);a.rightRaw=mul(Math.max(right,0)*F,CHIP);
 a.paused=true;
}
function startFade(a,on){a.fade={active:true,elapsedRaw:0,fromRaw:on?0:F,toRaw:on?F:0,valueRaw:on?0:F};}
// isFade 0x1816af6d0, type 0 (linear)
function isFade(a,dt){const f=a.fade;if(f.active){f.elapsedRaw+=dt;if(f.elapsedRaw>=FADE_TIME){f.elapsedRaw=FADE_TIME;f.active=false;}}
 const k=Number((B(f.elapsedRaw)<<16n)/B(FADE_TIME));f.valueRaw=k<F?mul(F-k,f.fromRaw)+mul(k,f.toRaw):f.toRaw;return f.active;}
function noticeStart(a,type){if(a.notice.phase!==0)return;a.notice={phase:1,type,viewRaw:0,flags:0};}
function noticeUpdate(a,dt){const n=a.notice;if(n.phase===0)return;if(n.phase>=2){n.viewRaw+=dt;if(n.viewRaw>=NOTICE_PASS)n.flags|=2;}if(n.phase===1){n.phase=2;return;}if(n.phase===2&&(n.flags&2)){n.flags|=4;n.phase=0;}}
function compare(st,host){
 const a=st.arrangement;a.results=[];let matched=0;
 for(const s of a.shown){
  const d=s.kind==='player'?st.dummies.find(q=>q.id===s.id):st.boxes.find(q=>q.id===s.id);
  const dx=d.xRaw-a.leftRaw,dy=d.yRaw,wantId=d.playerIndex+1,wantRight=s.kind==='box'?true:d.dir===0;
  const candidates=s.kind==='player'?host.players.map(p=>({id:p.index+1,xRaw:p.xRaw,yRaw:p.yRaw,right:p.lookingRight!==false})):host.colorBoxes.map(b=>({id:b.playerIndex+1,xRaw:b.xRaw,yRaw:b.yRaw,right:true}));
  let ok=false;
  for(const c of candidates){if(c.id!==wantId||c.right!==wantRight)continue;const ex=c.xRaw-a.rightRaw-dx,ey=c.yRaw-dy;
   if(N.sqrtRaw(B(mul(ex,ex)+mul(ey,ey)))<=TOLERANCE){ok=true;break;}}
  if(ok)matched++;a.results.push(ok);}
 if(matched===a.shown.length)a.flags|=1;a.resultIndex=0;
}
/* One update (OnPost). host as start() plus {dtRaw}; players carry xRaw/yRaw/lookingRight,
 * colorBoxes carry xRaw/yRaw. Returns {paused, keyEvents, retry, sounds}. */
function step(st,host){
 const a=st.arrangement,out={paused:false,keyEvents:[],retry:false,sounds:[]};if(!a)return out;
 start(st,host);const dt=host.dtRaw;
 a.prevTimerRaw=a.timerRaw;
 const tick=()=>{if(a.timerRaw-1>=0&&a.timerRaw-1<0x9ffff&&(a.prevTimerRaw>>16)!==(a.timerRaw>>16))out.sounds.push({se:0x13});};
 switch(a.phase){
  case 0:a.timerRaw=a.lookRaw;a.phase=1;break;
  case 1:a.timerRaw-=dt;tick();if(a.timerRaw>0)break;out.sounds.push({se:0x17});noticeStart(a,4);startFade(a,true);a.timerRaw=a.arrangeRaw;a.phase=2;break;
  case 2:if(isFade(a,dt))break;a.paused=false;a.phase=3;break;
  case 3:a.timerRaw-=dt;tick();if(a.timerRaw>0)break;a.paused=true;out.sounds.push({se:0x17});noticeStart(a,2);a.phase=4;break;
  case 4:if(!(a.notice.flags&4))break;startFade(a,false);a.phase=5;break;
  case 5:if(isFade(a,dt))break;compare(st,host);a.phase=6;break;
  case 6:a.timerRaw=RESULT_WAIT;a.phase=7;break;
  case 7:a.timerRaw-=dt;if(a.timerRaw>0)break;if(a.resultIndex<a.results.length){out.sounds.push({se:a.results[a.resultIndex]?0x18:2});a.resultIndex++;}
   if(a.resultIndex>=a.results.length){a.timerRaw=RESULT_WAIT;a.phase=8;}else a.phase=6;break;
  case 8:a.timerRaw-=dt;if(a.timerRaw>0)break;if(!(a.flags&1)){out.retry=true;break;}out.sounds.push({se:0x19});a.timerRaw=FINAL_WAIT;a.phase=9;break;
  case 9:a.timerRaw-=dt;if(a.timerRaw>0)break;a.paused=false;if(a.target)out.keyEvents.push({eventType:61,targetName:a.target,senderId:a.id});out.sounds.push({se:0x18});a.phase=10;break;
 }
 noticeUpdate(a,dt);
 out.paused=a.paused;return out;
}
function solids(st){return [...st.dummies.filter(d=>d.shown&&!d.removed).map(d=>({id:d.id,x:(d.xRaw+DUMMY_RECT.x)/F,y:(d.yRaw+DUMMY_RECT.y)/F,w:DUMMY_RECT.w/F,h:DUMMY_RECT.h/F})),
 ...st.boxes.filter(b=>b.shown&&!b.removed).map(b=>({id:b.id,x:(b.xRaw+b.rect.x)/F,y:(b.yRaw+b.rect.y)/F,w:b.rect.w/F,h:b.rect.h/F}))];}
function displays(st){const a=st.arrangement;return {
 dummies:st.dummies.filter(d=>d.shown&&!d.removed).map(d=>({id:d.id,x:d.xRaw/F,y:d.yRaw/F,colorIndex:d.colorIndex,playerIndex:d.playerIndex,facingLeft:d.dir!==0})),
 boxes:st.boxes.filter(b=>b.shown&&!b.removed).map(b=>({id:b.id,x:(b.xRaw+b.rect.x)/F,y:(b.yRaw+b.rect.y)/F,w:b.rect.w/F,h:b.rect.h/F,colorIndex:b.colorIndex})),
 goals:st.goals.map(g=>({x:g.xRaw/F,y:g.yRaw/F})),
 curtain:a?{left:a.leftRaw/F,right:a.rightRaw/F,value:a.fade.valueRaw/F,phase:a.phase}:null,
 timer:a&&(a.phase===1||a.phase===3)?{seconds:Math.ceil(a.timerRaw/F),phase:a.phase}:null,
 results:a&&a.phase>=6?a.results.slice(0,a.resultIndex).map((ok,i)=>({ok,id:a.shown[i].id})):[],
 notice:a&&a.notice.phase?{type:a.notice.type===4?'GO':'FINISH',t:a.notice.viewRaw/NOTICE_PASS}:null};}
return {compile,create,start,step,solids,displays,shuffle,compare,isFade,pcg32,nextInt,
 supportedTypes:['Arrangement','DummyPlayer','DummyColorBox','DummyGoal'],nativeConstants:{TOLERANCE,FADE_TIME,FINAL_WAIT,RESULT_WAIT,NOTICE_PASS,DUMMY_RECT},completePhysicsFidelity:false};
});
