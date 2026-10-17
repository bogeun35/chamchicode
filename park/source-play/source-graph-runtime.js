/* GraphController (188), CircleGraphController (184), BarGraphController (186), BarGraph
 * (187), CircleGraph (185): 13-2, the playable reconstruction from the saved Ghidra
 * project; the full reading with every address is notes/graph-spec.md. No game executed.
 * FP 16.16.
 *  GraphController ParseParameter 0x181860360: per-count tables d0 ClearMax (default 10),
 *   d1 CircleGraphMax (< 1 -> ClearMax / 2), d2 FailureMax (default 3); d18..d21 the UI
 *   number / player positions, d22 the UI scale. OnStart 0x181860660: finds both
 *   controllers (the bar one sets m_Mode 1, so the first round is a bar), every player to
 *   state 12 (Graph), the hint when GameOverCount >= FailureMax. updatePhase 0x1818609f0:
 *   0 startGraph (Activate the mode's controller, Inactivate the other) -> 1 wait for
 *   GraphClear (32) -> SE 24, 0.6 s (QFP[0x98]) -> ClearCount + 1, decideNextGraph
 *   0x181860dc0 (inline Next(0, 100), 50:50 while circle rounds < CircleGraphMax) or, at
 *   ClearMax, Activate every Key (type 17), players back to state 1, stop.
 *  Both controllers (Bar 0x1816b6e90 / Circle 0x1817ef710): phase 0 on Activate shows the
 *   graphs, decideGoal(first) and resets the jump infos; 1 checkMatch then controll; 2 on
 *   the next Activate decideGoal, calcSpeeds (x3 bar QFP[0x128], x2 circle QFP[0x118]); 3
 *   move the shown target to the goal, then back to 1. controll: per player index, Left
 *   down -> L, else Right down -> R; the jump button machine (.cctor 0x1817f2560: release
 *   0.5 s, persistence 0.15 s) counts J. Bar: Values [L, R, J] must equal the goal exactly;
 *   decideGoal 0x1816b70f0 a = Next(0, n + 1), b = n - a, c = Next(0, n + 1). Circle:
 *   Values [J, R, L], Percents = v * 2^26 / total; checkMatch 0x1817f1080 (+-4 raw, or
 *   +-2012160 raw at 7..8 players unless a goal is a quarter); decideGoal 0x1817efa20
 *   with checkExclusionPatten 0x1817f0180 (6..8 players).
 *  Player state 12, OnUpdate_Graph 0x1816c7b30: no walking; Left / Right only turn; with
 *   Jump held the player hovers about refY = posY - 48 (press: velY = -3; below refY and
 *   velY > -1.5: velY -= 0.25, else velY < 1.5: velY += 0.25), without it the normal
 *   gravity, on the ground velY = 0.
 * Named approximations:
 *  - one module PCG stream stands for the frame RNG;
 *  - the graph views (UI prefabs) are drawn at the authored positions, the cell / pie
 *    sizes are not in the DLL.
 */
(function(root,factory){const api=factory();if(typeof module==='object'&&module.exports)module.exports=api;root.SourceGraphRuntime=api;})(typeof globalThis!=='undefined'?globalThis:this,function(){
'use strict';
const F=65536,B=BigInt,i64=v=>BigInt.asIntN(64,v);
const num=v=>{const n=Number(v);if(!Number.isSafeInteger(n))throw Error('Graph raw outside safe range');return n;};
const mul=(a,b)=>num(i64(B(a)*B(b))>>16n),div=(a,b)=>num(i64(B(a)<<16n)/B(b));
const clone=v=>JSON.parse(JSON.stringify(v));
const allowed=(v,c)=>!v||v<0&&c<=-v||v>0&&v<10&&c>=v||v>=10&&c>=Math.trunc(v/10)&&c<=v%10;
const fp=v=>Math.trunc(Math.fround(Math.fround(v)*F));
const MAX_VALUE=0x4000000,RELEASE=32768,PERSIST=9830,WIN_WAIT=39321,BAR_SPEED=3*F,CIRCLE_SPEED=2*F,LOOSE=2012160,STRICT=4,QUARTERS=[16384,32768,49152];
const HOVER={press:-3*F,limit:98304,acc:16384,height:48*F};
const EXCLUDE={6:[[1,2,2]],7:[[1,2,2],[1,3,3],[4,1,1],[5,1,1]],8:[[1,2,2],[1,3,3],[3,2,2],[4,1,1],[5,1,1]]};
const PCG=6364136223846793005n,M64=(1n<<64n)-1n;
function pcg32(rng){const old=B(rng.state);rng.state=((old*PCG+(B(rng.inc)|1n))&M64).toString();const x=Number(((old>>45n)^(old>>27n))&0xffffffffn),rot=Number(old>>59n);return ((x>>>rot)|(x<<((32-rot)&31)))>>>0;}
function nextInt(rng,min,max){if(min===max)return min;let lo=max,hi=min;if(min<max){lo=min;hi=max;}const u=(hi-lo)>>>0,threshold=(2**32-u)%u;let x;do x=pcg32(rng);while(x<threshold);return lo+x%u;}
function table(a,i,width){const d=(a.datas||[])[i];if(!d||d.t!==2||typeof d.s!=='string'||d.s.length!==7*width)return Array(7).fill(0);
 const t=[];for(let e=0;e<7;e++){let v=0n;for(let k=width-1;k>=0;k--)v=(v<<8n)|B(((d.s.charCodeAt(e*width+k)&0xff)-0x21)&0xff);t.push(num(BigInt.asIntN(width*8,v)));}return t;}
function findCount(t,count){for(let i=Math.min(count-2,6);i>=0;i--)if(t[i]!==0)return t[i];return 0;}
function slotFP(a,i){const d=(a.datas||[])[i];return d&&d.t===1?fp(d.f):0;}
function slotStr(a,i){const d=(a.datas||[])[i];return d&&d.t===2?d.s||'':'';}
function controller(kind,id,a){return {kind,id,targetName:slotStr(a,0),controlName:slotStr(a,1),phase:0,flags:1,values:[0,0,0],goal:[0,0,0],goalRaw:[0,0,0],nowRaw:[0,0,0],speedRaw:[0,0,0],targetRaw:[0,0,0],
 jump:Array.from({length:8},()=>({state:0,timerRaw:0})),shown:kind==='bar'};}
function compile(actors,count){
 if(!Number.isInteger(count)||count<2||count>8)throw Error('Graph count 2..8 required');
 let gc=null,bar=null,circle=null;const graphs=[];
 actors.forEach((raw,i)=>{const a=raw.properties||raw;if(!allowed(a.playerCount,count))return;const id=raw.id||'source:a'+i;
  if(a.typeName==='GraphController'){
   let clearMax=10,failureMax=3;const c0=findCount(table(a,0,4),count),c1=findCount(table(a,1,4),count),c2=findCount(table(a,2,4),count);
   if(c0>0)clearMax=c0;const circleMax=c1>=1?c1:clearMax>>1;if(c2>0)failureMax=c2;
   const scale=slotFP(a,22)>0?slotFP(a,22):F;
   gc={id,clearMax,circleMax,failureMax,clearCount:0,circleCount:0,mode:0,phase:0,flags:0,timerRaw:0,hint:false,
    numbers:{x:slotFP(a,18)/F,y:slotFP(a,19)/F},playersUI:{x:slotFP(a,20)/F,y:slotFP(a,21)/F},uiScale:scale/F};}
  else if(a.typeName==='BarGraphController')bar=controller('bar',id,a);
  else if(a.typeName==='CircleGraphController')circle=controller('circle',id,a);
  else if(a.typeName==='BarGraph'||a.typeName==='CircleGraph')graphs.push({id,name:a.name||'',kind:a.typeName==='BarGraph'?'bar':'circle',x:a.posX,y:a.posY,
   scale:slotFP(a,0)!==0?slotFP(a,0)/F:1,levels:[0,0,0],percentsRaw:[0,0,0],active:a.typeName==='BarGraph'});});
 if(!gc&&(bar||circle))throw Error('Graph controllers without a GraphController are not reconstructed');
 return {schemaVersion:1,count,gc,bar,circle,graphs,started:false,completePhysicsFidelity:false};
}
const create=clone;
const graphOf=(st,name)=>st.graphs.find(g=>g.name===name);
function setGraphActive(st,c,on){for(const n of [c.targetName,c.controlName]){const g=graphOf(st,n);if(g)g.active=on;}c.shown=on;}
function showTarget(st,c){const g=graphOf(st,c.targetName);if(!g)return;if(c.kind==='bar')g.levels=c.targetRaw.map(v=>v>>16);else g.percentsRaw=c.targetRaw.slice();}
function showControl(st,c){const g=graphOf(st,c.controlName);if(!g)return;if(c.kind==='bar')g.levels=c.nowRaw.map(v=>v>>16);else g.percentsRaw=c.nowRaw.slice();}
function resetJump(c){for(const j of c.jump){j.state=0;j.timerRaw=0;}}
// GraphController OnRecvEvent 33: the goal bytes for the hint, always [left, right, jump]
function notifyValues(st,c){st.gc.hintValues=c.kind==='bar'?c.goal.slice():[c.goal[2],c.goal[1],c.goal[0]];}
function decideBar(st,c,first,rng,n){const G=c.goal;let a,b,cc;
 for(;;){a=nextInt(rng,0,n+1);b=Math.max(n-a,0);cc=nextInt(rng,0,n+1);if((a!==G[0]||b!==G[1])&&cc!==G[2])break;}
 c.goal=[a,b,cc];c.goalRaw=c.goal.map(v=>v<<16);notifyValues(st,c);if(first){c.targetRaw=c.goalRaw.slice();c.nowRaw=[0,0,0];}}
function excluded(n,v){for(const p of EXCLUDE[n]||[])for(let k=0;k<3;k++)if(v[0]===p[k%3]&&v[1]===p[(k+1)%3]&&v[2]===p[(k+2)%3])return true;return false;}
const percents=(v,tot)=>v.map(x=>Math.floor(x*MAX_VALUE/tot));
function decideCircle(st,c,first,rng,n){const G=c.goal,maxSum=n>=5?n:3*n;let a=0,b=0,cc=0;
 for(let k=0;k<32;k++){a=nextInt(rng,0,n);b=a===0?nextInt(rng,1,n):nextInt(rng,0,n-a+1);const cl=Math.min(maxSum-a-b,n);
  if(cl>0){const [lo,ex]=a===0?[1,b]:b===0?[1,a]:[0,0];let guard=0;do{cc=nextInt(rng,lo,cl+1);if(++guard>1e6)throw Error('CircleGraph decideGoal: no jump count left');}while(ex!==0&&cc===ex);}
  if((a!==G[2]||b!==G[1])&&cc!==G[0]&&!excluded(n,[a,b,cc]))break;}
 if(a===0&&b===0&&cc===0){a=1;b=1;cc=1;}
 c.goal=[cc,b,a];c.goalRaw=percents(c.goal,a+b+cc);notifyValues(st,c);if(first){c.targetRaw=c.goalRaw.slice();c.nowRaw=[0,0,0];}}
function checkMatch(c,n){
 if(c.kind==='bar')return c.values.every((v,i)=>v===c.goal[i]);
 const strict=n<7||c.goalRaw.some(g=>QUARTERS.includes(div(g,MAX_VALUE)));
 const tol=strict?STRICT:LOOSE;return c.nowRaw.every((p,i)=>Math.abs(p-c.goalRaw[i])<=tol);}
// controll 0x1816b7970 / 0x1817f1918: Left first, then Right; the jump machine per index
function controll(st,c,host){let L=0,R=0,J=0;
 host.players.forEach((p,idx)=>{const inp=p.input;if(!inp)return;if(inp.left)L++;else if(inp.right)R++;
  const s=c.jump[idx],held=!!inp.jump;
  if(s.state===0){if(held){s.timerRaw=0;s.state=1;J++;}}
  else if(s.state===1){if(held){s.timerRaw+=host.dtRaw;J++;}else if(s.timerRaw<RELEASE){s.timerRaw=PERSIST;s.state=2;J++;}else s.state=0;}
  else if(s.state===2){if(held){s.timerRaw=0;s.state=1;J++;}else{s.timerRaw-=host.dtRaw;if(s.timerRaw>0)J++;else s.state=0;}}});
 if(c.kind==='bar'){c.values=[L,R,J];c.nowRaw=[L,R,J].map(v=>v<<16);}
 else{c.values=[J,R,L];const tot=J+R+L;c.nowRaw=tot<1?[0,0,0]:percents([J,R,L],tot);}
 showControl(st,c);}
function ctrlRecv(st,c,type){if(!c)return;
 if(type===1){if(c.phase===0)c.flags=(c.flags&~1)|2;else if(c.phase===2)c.flags|=2;}
 else if(type===35){c.phase=0;c.flags=(c.flags&~2)|1;setGraphActive(st,c,false);}
 else if(type===19)c.flags|=1;}
function ctrlPost(st,c,host,out){if(!c||c.flags&1)return;const n=host.playerCount,decide=c.kind==='bar'?decideBar:decideCircle;
 if(c.phase===0){if(!(c.flags&2))return;setGraphActive(st,c,true);decide(st,c,true,host.rng,n);showTarget(st,c);showControl(st,c);resetJump(c);c.phase=1;return;}
 if(c.phase===1){if(checkMatch(c,n)){st.gc.flags|=2;c.flags&=~2;c.phase=2;out.events.push({type:'clear',graph:c.kind});return;}controll(st,c,host);return;}
 if(c.phase===2){if(!(c.flags&2))return;decide(st,c,false,host.rng,n);const k=c.kind==='bar'?BAR_SPEED:CIRCLE_SPEED;c.speedRaw=c.goalRaw.map((g,i)=>mul(g-c.targetRaw[i],k));c.phase=3;}
 if(c.phase===3){let done=true;
  c.targetRaw=c.targetRaw.map((t,i)=>{const sp=c.speedRaw[i],g=c.goalRaw[i];let v=t+mul(host.dtRaw,sp);if(sp<0)v=g<v?v:g;else if(sp>0)v=v<g?v:g;if(v!==g)done=false;return v;});
  showTarget(st,c);if(done){resetJump(c);c.phase=1;}}}
/* OnStart at the first update. host: {gameOverCount}. Returns {playerState: 12}. */
function start(st,host={}){if(st.started)return null;st.started=true;const gc=st.gc;if(!gc)return null;
 if(st.bar)gc.mode=1;if((host.gameOverCount||0)>=gc.failureMax)gc.hint=true;return {playerState:12};}
function decideNext(st,rng){const gc=st.gc;
 if(gc.mode===0){if(st.bar){if(!(gc.circleCount<gc.circleMax&&nextInt(rng,0,100)>=50))gc.mode=1;}}
 else if(gc.mode===1){if(st.circle&&gc.circleCount<gc.circleMax&&nextInt(rng,0,100)<50)gc.mode=0;}
 if(gc.mode===0)gc.circleCount++;}
/* One frame of OnPost in updater order (GraphController, CircleGraphController,
 * BarGraphController). host: {dtRaw, rng, playerCount, players:[{input:{left,right,jump}}]}.
 * Returns {events:[{type:'clear'|'win'|'keys'|'default'}], sounds}. */
function step(st,host){const out={events:[],sounds:[]},gc=st.gc;if(!gc)return out;
 if(!(gc.flags&1)){
  if(gc.phase===0){if(gc.mode===0){ctrlRecv(st,st.circle,1);ctrlRecv(st,st.bar,35);}else{ctrlRecv(st,st.bar,1);ctrlRecv(st,st.circle,35);}gc.flags&=~2;gc.phase=1;}
  else if(gc.phase===1){if(gc.flags&2){out.sounds.push({se:24});gc.timerRaw=WIN_WAIT;gc.phase=2;out.events.push({type:'win'});}}
  else if(gc.phase===2){gc.timerRaw-=host.dtRaw;if(gc.timerRaw<=0){gc.clearCount++;if(gc.clearCount>=gc.clearMax)gc.phase=3;else{decideNext(st,host.rng);gc.phase=0;}}}
  else if(gc.phase===3){out.events.push({type:'keys'},{type:'default'});gc.flags|=1;gc.phase=4;}}
 ctrlPost(st,st.circle,host,out);ctrlPost(st,st.bar,host,out);
 return out;}
// Dead (19) to every actor: the controller and both graph controllers stop
function dead(st){if(st.gc)st.gc.flags|=1;ctrlRecv(st,st.bar,19);ctrlRecv(st,st.circle,19);}
/* OnUpdate_Graph velocity, FP per frame. p: {posYRaw, vyRaw, refYRaw, grounded, held, pressed}.
 * Returns the new vyRaw (gravity is the host's when null). */
function hoverVelocity(p){
 if(p.held){let v=p.vyRaw;if(p.pressed)v=HOVER.press;
  if(p.posYRaw>p.refYRaw){if(v>-HOVER.limit)v-=HOVER.acc;}else if(v<HOVER.limit)v+=HOVER.acc;return v;}
 return p.grounded?0:null;}
function displays(st){const gc=st.gc;return {
 graphs:st.graphs.filter(g=>g.active).map(g=>({kind:g.kind,x:g.x,y:g.y,scale:g.scale,levels:g.levels.slice(),levelMax:st.count,percents:g.percentsRaw.map(v=>v/MAX_VALUE),target:[st.bar&&st.bar.targetName,st.circle&&st.circle.targetName].includes(g.name)})),
 remaining:gc?Math.max(0,gc.clearMax-gc.clearCount):0,remainingAt:gc?gc.playersUI:null,uiScale:gc?gc.uiScale:1,
 hint:gc&&gc.hint&&gc.hintValues?{values:gc.hintValues.slice(),at:gc.numbers}:null};}
return {compile,create,start,step,dead,hoverVelocity,displays,decideBar,decideCircle,checkMatch,excluded,table,findCount,pcg32,nextInt,
 supportedTypes:['GraphController','BarGraphController','CircleGraphController','BarGraph','CircleGraph'],
 nativeConstants:{MAX_VALUE,RELEASE,PERSIST,WIN_WAIT,BAR_SPEED,CIRCLE_SPEED,LOOSE,STRICT,HOVER,EXCLUDE},completePhysicsFidelity:false};
});
