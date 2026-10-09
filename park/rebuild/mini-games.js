(function(root){
'use strict';
// Playable mechanic studies, not original layouts or calibrated original rules.
const catalogue={};
function register(family,title,ids){for(const id of ids.split(' '))catalogue[id]={id,family,title,route:'mini',playable:true,approximation:true};}
register('precision','찰나의 순간','pico1/world/04-03 pico1/battle/04');
register('blocks','빈칸을 함께','pico1/world/08-01 pico1/world/08-03 pico1/endless/02');
register('bricks','빛나는 벽돌','pico1/world/08-02 pico1/world/08-04 pico1/world/09-03');
register('reaction','지금이야!','pico2/world/10-01 pico2/battle/04 pico2/endless/02');
register('graph','우리의 모양','pico2/world/13-02 pico2/endless/03');
register('memory','기억의 자리','pico2/world/03-04');
register('rally','한 번 더!','pico2/world/13-03 pico2/battle/08 pico2/endless/07');
register('basketball','함께 슛','pico2/world/08-02 pico2/world/08-04');
register('whack','톡톡 릴레이','pico2/world/14-02 pico2/world/14-04');
register('dodge','끝까지 살아남기','pico1/battle/03 pico1/endless/01 pico2/world/11-01 pico2/battle/06 pico2/endless/04');
register('height','더 높이','pico1/battle/01 pico2/battle/01 pico2/battle/02');
const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
function rnd(s){s.seed=(Math.imul(s.seed,1664525)+1013904223)>>>0;return s.seed/4294967296;}
function create(id,count=2){
 if(!catalogue[id])throw Error('Unsupported mini-game');if(!Number.isInteger(count)||count<2||count>8)throw Error('2–8 players required');
 const s={...catalogue[id],count,status:'play',time:0,round:0,score:0,lives:3,seed:12345+count,held:Array(count).fill(false),battle:id.includes('/battle/'),endless:id.includes('/endless/'),players:Array.from({length:count},(_,i)=>({x:70+i*1060/count,y:540,vy:0,choice:0,ready:false,score:0,alive:true,angle:1.05,stopped:null})),objects:[],target:0,delay:0};
 if(s.family==='precision'){s.limit=5;s.target=count*.24;}
 if(s.family==='reaction'){s.signalAt=2.5;s.window=1.2;s.responses=Array(count).fill(null);s.roundTime=0;}
 if(['graph','memory'].includes(s.family)){setPattern(s);}
 if(s.family==='whack'){s.target=0;s.nextAt=.8;s.activeUntil=0;s.bad=false;s.goal=id.endsWith('14-04')?6:Math.max(16,count*4);}
 if(s.family==='blocks'){s.cols=count*3;s.rows=12;s.grid=Array.from({length:12},()=>Array(s.cols).fill(0));s.pieces=[];fillPuzzle(s);s.goal=id.endsWith('08-03')?6:4;}
 if(['bricks','rally'].includes(s.family)){s.ball={x:600,y:360,vx:150,vy:200};s.paddleWidth=Math.max(58,1050/count);s.goal=s.family==='rally'?12:18;s.bricks=Array.from({length:s.family==='bricks'?18:0},(_,i)=>({x:150+i%6*152,y:100+Math.floor(i/6)*46,w:140,h:30,on:true}));for(let i=0;i<count;i++)s.players[i].x=60+i*1080/count;s.ballDelay=0;}
 if(s.family==='basketball'){s.hoop={x:1000,y:260};s.goal=Math.max(4,count);s.bombs=id.endsWith('08-04');for(let i=0;i<count;i++)s.players[i].x=120+i*35;s.nextBomb=1.5;}
 if(s.family==='dodge'){s.limit=s.endless?Infinity:20;s.nextAt=1.5;}
 if(s.family==='height'){s.limit=25;s.platforms=Array.from({length:10},(_,i)=>({x:i%2?680:290,y:500-i*76,w:270,h:14}));}
 return s;
}
function setPattern(s){s.roundTime=0;s.players.forEach(p=>{p.ready=false;p.choice=0;});if(s.family==='graph'){s.targetLeft=1+s.round%(s.count-1);s.targetRight=s.count-s.targetLeft;}else s.pattern=s.players.map(()=>Math.floor(rnd(s)*5));}
function fillPuzzle(s){if(s.grid.every(row=>row.every(cell=>!cell)))for(let y=10;y<12;y++)for(let x=0;x<s.cols;x++)s.grid[y][x]=x%3===1?0:1+Math.floor(x/3);s.pieces=s.players.map((_,i)=>({x:i*3+1,y:0,rot:0,t:0}));}
function fail(s,reason){s.status='dead';s.reason=reason;}
function win(s){if(s.status!=='play')return;s.status='clear';s.winners=s.battle?s.players.map((p,i)=>({i,score:p.score})).filter(p=>p.score===Math.max(...s.players.map(q=>q.score))).map(p=>p.i):[];}
function tick(s,inputs=[],dt=1/60){
 if(!Number.isFinite(dt)||dt<0||dt>1)throw Error('Invalid dt');if(s.status!=='play')return s;
 // Edges are explicit per player; held keys cannot score repeatedly.
 const action=s.players.map((p,i)=>{const v=!!inputs[i]?.action,e=v&&!s.held[i];s.held[i]=v;return e;});s.time+=dt;
 const f=s.family;
 if(f==='precision'){
  for(let i=0;i<s.count;i++)if(action[i]&&s.players[i].stopped===null){const remaining=s.limit-s.time;s.players[i].stopped=remaining;s.players[i].score=remaining>0?Math.max(0,10000-Math.round(remaining*1000)):-1;}
  if(s.players.every(p=>p.stopped!==null)){if(s.battle)win(s);else if(s.players.every(p=>p.stopped>0)&&s.players.reduce((n,p)=>n+p.stopped,0)<=s.target)win(s);else fail(s,'조금 더 가까이!');}
  else if(s.time>=s.limit){if(s.battle){s.players.forEach(p=>{if(p.stopped===null)p.score=-1;});win(s);}else fail(s,'시간이 지났어요');}
 }
 if(f==='reaction'){
  s.roundTime+=dt;
  if(s.delay>0){s.delay-=dt;if(s.delay<=0){s.responses.fill(null);s.roundTime=0;s.signalAt=1.6+rnd(s)*2;s.window=Math.max(.4,1.2-s.round*.08);}return s;}
  for(let i=0;i<s.count;i++)if(action[i]&&s.responses[i]===null){if(s.roundTime<s.signalAt){if(!s.battle){fail(s,'아직이에요!');return s;}s.responses[i]=-1;}else if(s.roundTime<=s.signalAt+s.window){s.responses[i]=s.roundTime-s.signalAt;s.players[i].score+=Math.max(0,1000-Math.round(s.responses[i]*1000));}}
  if(s.responses.every(x=>x!==null)){s.round++;s.score++;if(s.round>=5&&!s.endless)win(s);else s.delay=.7;}
  else if(s.roundTime>s.signalAt+s.window){if(s.battle)win(s);else fail(s,'다 같이 반응해요');}
 }
 if(f==='graph'||f==='memory'){
  s.roundTime+=dt;for(let i=0;i<s.count;i++){const p=s.players[i],a=inputs[i]||{};if(f==='graph'){if(a.left)p.choice=-1;if(a.right)p.choice=1;}else if(s.roundTime>3){if(a.left&&!p.leftHeld)p.choice=clamp(p.choice-1,0,4);if(a.right&&!p.rightHeld)p.choice=clamp(p.choice+1,0,4);if(action[i])p.ready=!p.ready;}p.leftHeld=!!a.left;p.rightHeld=!!a.right;}
  let correct=f==='graph'?s.players.filter(p=>p.choice===-1).length===s.targetLeft&&s.players.filter(p=>p.choice===1).length===s.targetRight:s.roundTime>3&&s.players.every((p,i)=>p.ready&&p.choice===s.pattern[i]);
  s.hold=correct?(s.hold||0)+dt:0;
  if(f==='memory'&&s.players.every(p=>p.ready)&&!correct){s.players.forEach(p=>p.ready=false);s.lives--;if(s.lives===0)fail(s,'다시 기억해 볼까요');s.roundTime=0;}
  if(s.hold>.6){s.score++;s.round++;s.hold=0;if(s.round>=5&&!s.endless)win(s);else setPattern(s);}
 }
 if(f==='whack'){
  if(s.activeUntil>0&&s.time>=s.activeUntil&&!s.hit){s.hit=true;if(!s.bad){s.lives--;if(!s.lives){fail(s,'놓쳤어요');return s;}}}
  if(s.time>=s.nextAt){s.target=(s.target+1)%s.count;s.bad=s.id.endsWith('14-02')&&rnd(s)<.18;s.hit=false;s.activeUntil=s.time+(s.count>4?1.6:1.2);s.nextAt=s.activeUntil+.35;}
  for(let i=0;i<s.count;i++)if(action[i]&&i===s.target&&s.time<s.activeUntil&&!s.hit){s.hit=true;if(s.bad){s.lives--;if(!s.lives)fail(s,'가시는 피하세요');}else{s.score++;s.players[i].score++;if(s.score>=s.goal)win(s);}}
  if(s.time>s.activeUntil&&s.bad)s.hit=true;
 }
 if(f==='blocks'){
  const cells=p=>p.rot?[[p.x,p.y],[p.x+1,p.y]]:[[p.x,p.y],[p.x,p.y+1]];
  const valid=(p,i)=>cells(p).every(([x,y])=>x>=i*3&&x<(i+1)*3&&y>=0&&y<12&&!s.grid[y][x]);
  for(let i=0;i<s.count;i++){const p=s.pieces[i],a=inputs[i]||{};if(!p)continue;if(a.left&&!p.lh&&valid({...p,x:p.x-1},i))p.x--;if(a.right&&!p.rh&&valid({...p,x:p.x+1},i))p.x++;if(action[i]&&valid({...p,rot:1-p.rot},i))p.rot=1-p.rot;p.lh=!!a.left;p.rh=!!a.right;p.t+=dt;
   if(a.down||p.t>.55){p.t=0;if(a.down)while(valid({...p,y:p.y+1},i))p.y++;else if(valid({...p,y:p.y+1},i)){p.y++;continue;}if(!valid({...p,y:p.y+1},i)){if(!valid(p,i)){fail(s,'블록이 가득 찼어요');return s;}for(const [x,y]of cells(p))s.grid[y][x]=i+1;s.pieces[i]=null;}}
  }
  const full=s.grid.filter(row=>row.every(Boolean)).length;if(full){s.grid=s.grid.filter(row=>!row.every(Boolean));while(s.grid.length<12)s.grid.unshift(Array(s.cols).fill(0));s.score+=full;}
  if(s.pieces.every(p=>!p)){if(s.score>=s.goal&&!s.endless)win(s);else if(s.grid.slice(0,4).some(r=>r.some(Boolean)))fail(s,'블록이 가득 찼어요');else fillPuzzle(s);}
 }
 if(f==='bricks'||f==='rally'){
  for(let i=0;i<s.count;i++){const a=inputs[i]||{};s.players[i].x=clamp(s.players[i].x+((a.right?1:0)-(a.left?1:0))*420*dt,10,1190-s.paddleWidth);}
  const b=s.ball;if(s.ballDelay>0){s.ballDelay-=dt;return s;}const oldY=b.y;b.x+=b.vx*dt;b.y+=b.vy*dt;if(b.x<12||b.x>1188){b.x=clamp(b.x,12,1188);b.vx*=-1;}if(b.y<60){b.y=60;b.vy=Math.abs(b.vy);}
  for(const r of s.bricks)if(r.on&&b.x>r.x-10&&b.x<r.x+r.w+10&&b.y>r.y-10&&b.y<r.y+r.h+10){r.on=false;b.vy*=-1;s.score++;break;}
  if(b.vy>0&&oldY<=560&&b.y>=560){const i=s.players.findIndex(p=>b.x>=p.x-8&&b.x<=p.x+s.paddleWidth+8);if(i>=0){b.y=559;b.vy=-Math.min(480,Math.abs(b.vy)+12);b.vx=clamp((b.x-(s.players[i].x+s.paddleWidth/2))*5,-320,320);s.players[i].score++;if(f==='rally')s.score++;}}
  if(b.y>650){s.lives--;if(s.lives<=0){if(s.battle)win(s);else fail(s,'공을 놓쳤어요');}else{s.ball={x:600,y:340,vx:130,vy:210};s.ballDelay=.8;}}
  if(!s.endless&&s.score>=s.goal)win(s);
 }
 if(f==='basketball'){
  s.hoop.x=s.bombs?990+Math.sin(s.time*.7)*80:1000;
  for(let i=0;i<s.count;i++){const p=s.players[i],a=inputs[i]||{};p.angle=clamp(p.angle+((a.left?1:0)-(a.right?1:0))*dt,.35,1.4);p.cooldown=Math.max(0,(p.cooldown||0)-dt);if(action[i]&&!p.cooldown){s.objects.push({x:p.x,y:535,vx:Math.cos(p.angle)*1050,vy:-Math.sin(p.angle)*1050,owner:i,bomb:false});p.cooldown=.35;}}
  if(s.bombs&&s.time>s.nextBomb){s.nextBomb=s.time+2;s.objects.push({x:100+rnd(s)*850,y:40,vx:0,vy:50,bomb:true});}
  for(const b of s.objects){const old=b.y;b.x+=b.vx*dt;b.vy+=850*dt;b.y+=b.vy*dt;if(!b.bomb&&b.vy>0&&old<=s.hoop.y&&b.y>=s.hoop.y&&Math.abs(b.x-s.hoop.x)<48){b.done=true;s.score++;s.players[b.owner].score++;}if(b.bomb&&s.objects.some(q=>!q.bomb&&!q.done&&Math.hypot(q.x-b.x,q.y-b.y)<26)){b.done=true;s.lives--;if(s.lives<=0)fail(s,'폭탄을 피하세요');}}
  s.objects=s.objects.filter(b=>!b.done&&b.y<680&&b.x<1250);if(s.score>=s.goal)win(s);
 }
 if(f==='height'||f==='dodge'){
  for(let i=0;i<s.count;i++){const p=s.players[i],a=inputs[i]||{};if(!p.alive)continue;p.x=clamp(p.x+((a.right?1:0)-(a.left?1:0))*260*dt,20,1140);if(action[i]&&p.ground){p.vy=-540;p.ground=false;}const old=p.y;p.vy+=1200*dt;p.y+=p.vy*dt;p.ground=false;for(const r of [...(s.platforms||[]),{x:0,y:580,w:1200}])if(p.vy>=0&&old+36<=r.y+.1&&p.y+36>=r.y&&p.x+32>r.x&&p.x<r.x+r.w){p.y=r.y-36;p.vy=0;p.ground=true;}if(f==='height')p.score=Math.round(580-p.y);}
  if(f==='dodge'){
   if(s.time>s.nextAt){s.nextAt=s.time+Math.max(.6,1.6-s.time*.02);const direction=Math.floor(s.time)%2?1:-1;s.objects.push({x:direction===1?-20:1220,y:Math.floor(s.time)%3?550:485,vx:direction*(150+s.time*3),r:15});}
   for(const b of s.objects){b.x+=b.vx*dt;for(const p of s.players)if(p.alive&&b.x>p.x-15&&b.x<p.x+47&&b.y>p.y-15&&b.y<p.y+51){p.alive=false;p.score=Math.round(s.time*100);if(!s.battle){fail(s,'함께 다시 도전!');return s;}}}s.objects=s.objects.filter(b=>b.x>-60&&b.x<1260);s.score=Math.floor(s.time);
   if(s.battle&&s.players.filter(p=>p.alive).length<=1){s.players.filter(p=>p.alive).forEach(p=>p.score=Math.round(s.time*100)+1);win(s);}
  }
  if(s.time>=s.limit){if(f==='dodge')s.players.filter(p=>p.alive).forEach(p=>p.score=Math.round(s.time*100)+1);win(s);}
 }
 return s;
}
function step(s,inputs=[],dt=1/60){
 if(!Number.isFinite(dt)||dt<0||dt>1)throw Error('Invalid dt');
 let remaining=dt;while(remaining>1e-10&&s.status==='play'){const h=Math.min(remaining,1/120);tick(s,inputs,h);remaining-=h;}return s;
}
const api={list:()=>Object.values(catalogue),supports:id=>!!catalogue[id],descriptor:id=>catalogue[id]||null,create,step};if(typeof module!=='undefined'&&module.exports)module.exports=api;root.ParkMiniGames=api;
})(typeof window!=='undefined'?window:globalThis);
