'use strict';
(()=>{
const $=id=>document.getElementById(id),canvas=$('game'),ctx=canvas.getContext('2d'),params=new URLSearchParams(location.search),M=ParkMiniGames;
const id=M.supports(params.get('id'))?params.get('id'):M.list()[0].id,count=Math.max(2,Math.min(8,Math.floor(Number(params.get('count')))||2));
const colors=['#6de2c3','#ffbf85','#a3a0ef','#f58ca9','#78c9f4','#f5df77','#dba7e8','#9bd080'],keyCodes=['KeyA','KeyS','KeyD','KeyF','KeyG','KeyH','KeyJ','KeyK'],keyNames=['A','S','D','F','G','H','J','K'];
const names={precision:'0 직전에 멈추기',reaction:'초록 신호에 함께 누르기',graph:'양쪽 인원수 맞추기',memory:'보았던 자리로 돌아가기',whack:'올라오는 순간 톡!',blocks:'빈칸을 채워 줄 완성',bricks:'공을 지켜 벽돌 깨기',rally:'공을 놓치지 않기',basketball:'각도를 맞춰 슛',dodge:'공을 피해 살아남기',height:'시간 안에 더 높이'};
const instructions={precision:'숫자가 0이 되기 직전에 각자의 동작 키를 한 번 누르세요. 협동에서는 모두의 남은 시간 합이 목표보다 작아야 해요.',reaction:'초록 불이 켜지면 각자의 동작 키를 누르세요. 먼저 누르면 실패해요.',graph:'숫자 키로 사람을 고른 뒤 ← 또는 →로 편을 선택하세요. 화면의 목표 인원수를 맞추면 다음 모양이 나와요.',memory:'처음 3초 동안 각자의 자리를 기억하세요. ← →로 자리를 옮기고 동작 키로 준비하세요.',whack:'자기 색 위치에 대상이 올라오면 동작 키를 누르세요. 빨간 가시는 피하세요.',blocks:'각자의 구역에서 ← →로 블록을 옮기고 동작 키로 회전하세요. ↓로 내려놓으세요. 모두 힘을 합쳐 가로줄을 채우세요.',bricks:'← →로 받침대를 움직여 공을 튕기세요. 모든 벽돌을 깨면 성공이에요.',rally:'← →로 받침대를 움직여 공을 계속 받아내세요. 함께 12번 이어가세요.',basketball:'← →로 각도를 바꾸고 동작 키로 공을 던지세요. 공이 위에서 골대를 통과해야 득점이에요. 폭탄이 있는 단계에서는 공으로 폭탄을 맞히지 마세요.',dodge:'← →로 이동하고 동작 키로 점프해 공을 피하세요.',height:'← →와 동작 키 점프로 더 높은 발판을 노리세요. 시간이 끝날 때 가장 높은 사람이 이겨요.'};
let s=M.create(id,count),selected=0,keys=new Set(),paused=false,last=performance.now(),shown=false;
$('title').textContent=M.descriptor(id).title;$('subtitle').textContent=names[s.family];$('population').textContent=count+'인 · 로컬 데모';$('help-copy').textContent=instructions[s.family];$('mode-hint').textContent=s.family==='blocks'?'↓ 내려놓기':s.family==='basketball'?'← → 각도':'각자 동작 '+keyNames.slice(0,count).join(' ');
function box(x,y,w,h,color,r=12){ctx.fillStyle=color;ctx.beginPath();ctx.roundRect(x,y,w,h,r);ctx.fill();}
function text(t,x,y,size=20,color='#eff9f2',align='center'){ctx.fillStyle=color;ctx.font=`700 ${size}px system-ui`;ctx.textAlign=align;ctx.fillText(String(t),x,y);}
function line(x,y,x2,y2,color='#557482',width=2){ctx.strokeStyle=color;ctx.lineWidth=width;ctx.beginPath();ctx.moveTo(x,y);ctx.lineTo(x2,y2);ctx.stroke();}
function circle(x,y,r,color){ctx.fillStyle=color;ctx.beginPath();ctx.arc(x,y,r,0,Math.PI*2);ctx.fill();}
function fish(x,y,i,scale=1){ctx.save();ctx.translate(x,y);ctx.scale(scale,scale);box(0,0,32,36,colors[i],9);ctx.fillStyle=colors[i];ctx.beginPath();ctx.moveTo(3,10);ctx.lineTo(-9,4);ctx.lineTo(-9,29);ctx.lineTo(3,24);ctx.fill();circle(23,12,2.5,'#132b35');if(i===selected){ctx.strokeStyle='#fff';ctx.lineWidth=2;ctx.strokeRect(-5,-5,42,46);}ctx.restore();}
function playerLabel(i,x,y){text((i+1)+' · '+keyNames[i],x,y,15,colors[i]);}
function draw(){
 ctx.clearRect(0,0,1200,675);const bg=ctx.createLinearGradient(0,0,0,675);bg.addColorStop(0,'#102432');bg.addColorStop(1,'#193d45');ctx.fillStyle=bg;ctx.fillRect(0,0,1200,675);for(let x=0;x<1200;x+=60)line(x,0,x,675,'#ffffff03');
 const f=s.family;$('progress').textContent=f==='height'||f==='dodge'?`${Math.max(0,Math.ceil(s.limit-s.time))===Infinity?'∞':Math.max(0,Math.ceil(s.limit-s.time))} 초`:s.goal?`${s.score} / ${s.endless?'∞':s.goal}`:['reaction','memory','graph'].includes(f)?`${s.score} / ${s.endless?'∞':5}`:'';
 if(['precision','reaction','graph','whack'].includes(f)){
  const w=Math.min(155,1060/count),start=(1200-w*count)/2;
  if(f==='precision'){text(s.battle?'0에 가장 가까운 사람':`남은 시간 합 ≤ ${s.target.toFixed(2)}`,600,145,32,'#a6dccb');}
  if(f==='reaction'){const ready=s.roundTime>=s.signalAt&&!s.delay;circle(600,210,92,ready?'#65deb4':'#ba785a');text(s.delay?'좋아요!':ready?'지금!':'기다려요',600,224,36,'#102b32');}
  if(f==='graph'){
   text('← '+s.targetLeft+'명',350,150,30);text(s.targetRight+'명 →',850,150,30);const left=s.players.filter(p=>p.choice===-1).length,right=s.players.filter(p=>p.choice===1).length;box(200,190,300,30,'#284552');box(700,190,300,30,'#284552');box(200,190,300*left/s.count,30,'#6ddabc');box(700,190,300*right/s.count,30,'#ffbf85');text(left,350,266,32);text(right,850,266,32);
  }
  for(let i=0;i<count;i++){const x=start+i*w,p=s.players[i];box(x+5,380,w-10,156,i===selected?'#294c58':'#1c3543');playerLabel(i,x+w/2,590);fish(x+w/2-16,489,i);
   if(f==='precision')text(Math.max(0,p.stopped??s.limit-s.time).toFixed(2),x+w/2,445,Math.min(32,w*.25),p.stopped!==null?colors[i]:'#eff9f2');
   if(f==='reaction')text(s.responses[i]===null?'…':s.responses[i]<0?'빨라요':Math.round(s.responses[i]*1000)+'ms',x+w/2,446,Math.min(22,w*.22),colors[i]);
   if(f==='graph')text(p.choice===-1?'←':p.choice===1?'→':'?',x+w/2,451,40,colors[i]);
   if(f==='whack'&&i===s.target&&s.time<s.activeUntil&&!s.hit){circle(x+w/2,320,Math.min(45,w*.38),s.bad?'#ef778c':colors[i]);text(s.bad?'×':'●',x+w/2,333,32,'#143442');}
  }
 }
 if(f==='memory'){
  text(s.roundTime<3?'기억하세요':'자리를 찾아요',600,72,30);const rowH=500/count;
  for(let i=0;i<count;i++){const y=100+i*rowH;playerLabel(i,92,y+25);for(let j=0;j<5;j++)box(220+j*155,y,125,rowH-9,'#223e4b',9);const choice=s.roundTime<3?s.pattern[i]:s.players[i].choice;fish(260+choice*155,y+5,i,Math.min(1,rowH/45));if(s.players[i].ready)text('✓',1080,y+28,28,colors[i]);}
 }
 if(f==='blocks'){
  const cell=Math.min(42,1050/s.cols),sx=(1200-cell*s.cols)/2,sy=82;text('↓',600,50,26,'#a7d4c9');
  for(let y=0;y<12;y++)for(let x=0;x<s.cols;x++)box(sx+x*cell+1,sy+y*cell+1,cell-2,cell-2,s.grid[y][x]?colors[s.grid[y][x]-1]:'#203b47',4);
  for(let i=0;i<count;i++){const p=s.pieces[i];if(p){for(const [x,y]of p.rot?[[p.x,p.y],[p.x+1,p.y]]:[[p.x,p.y],[p.x,p.y+1]])box(sx+x*cell+2,sy+y*cell+2,cell-4,cell-4,colors[i],5);}playerLabel(i,sx+(i*3+1.5)*cell,sy+12*cell+30);if(i===selected){ctx.strokeStyle='#fff';ctx.lineWidth=2;ctx.strokeRect(sx+i*3*cell,sy,cell*3,cell*12);}}
 }
 if(f==='bricks'||f==='rally'){
  if(f==='rally')text(s.score,600,300,120,'#a2dec52e');for(const r of s.bricks)if(r.on)box(r.x,r.y,r.w,r.h,colors[Math.floor(r.y/46)%count],8);
  for(let i=0;i<count;i++){box(s.players[i].x,570,s.paddleWidth,14,colors[i],7);playerLabel(i,s.players[i].x+s.paddleWidth/2,621);if(i===selected)box(s.players[i].x,592,s.paddleWidth,3,'#fff',0);}circle(s.ball.x,s.ball.y,11,'#fff6d2');
 }
 if(f==='basketball'){
  line(s.hoop.x-50,s.hoop.y,s.hoop.x+50,s.hoop.y,'#ffc98b',7);line(s.hoop.x+50,s.hoop.y-80,s.hoop.x+50,s.hoop.y+15,'#9dc9d0',6);for(let k=-40;k<=40;k+=20)line(s.hoop.x+k,s.hoop.y,s.hoop.x+k*.6,s.hoop.y+55,'#c7e5df',1);
  for(let i=0;i<count;i++){fish(s.players[i].x,544,i);playerLabel(i,s.players[i].x+16,621);}const p=s.players[selected];for(let t=0;t<.55;t+=.045)circle(p.x+Math.cos(p.angle)*1050*t,535-Math.sin(p.angle)*1050*t+425*t*t,3,colors[selected]);for(const b of s.objects){circle(b.x,b.y,b.bomb?15:11,b.bomb?'#ee758d':colors[b.owner]);if(b.bomb)text('×',b.x,b.y+5,16,'#142832');}line(30,580,1170,580,'#4f737d',3);
 }
 if(f==='dodge'||f==='height'){
  const top=f==='height'?Math.min(0,...s.players.map(p=>p.y-80)):0,scale=580/(580-top);ctx.save();ctx.translate(0,50);ctx.scale(1,scale);ctx.translate(0,-top);for(const r of s.platforms||[])box(r.x,r.y,r.w,r.h,'#5d8e93',5);box(0,580,1200,50,'#315862',0);for(let i=0;i<count;i++)if(s.players[i].alive){fish(s.players[i].x,s.players[i].y,i);playerLabel(i,s.players[i].x+16,s.players[i].y-14);}for(const b of s.objects)circle(b.x,b.y,b.r,'#f28f95');ctx.restore();
 }
 if(['whack','bricks','rally','basketball','memory'].includes(f))text('●'.repeat(Math.max(0,s.lives)),1150,43,20,'#f2a6ae','right');
 if(s.status!=='play'&&!shown){shown=true;showMenu(true);}
}
function showMenu(terminal=false){paused=true;keys.clear();$('result').textContent=terminal?(s.status==='clear'?'함께 해냈어요!':'다시 한번!'):'잠깐 쉬어가기';$('result-detail').textContent=terminal?(s.battle&&s.winners?.length?'승리 '+s.winners.map(i=>(i+1)+'번').join(' · '):s.reason||`${s.score}점`):'';$('continue').hidden=terminal;$('next').hidden=s.status!=='clear';if(!$('pause-menu').open)$('pause-menu').showModal();(terminal?(s.status==='clear'?$('next'):$('retry')):$('continue')).focus();}
function resume(){$('continue').textContent='계속하기';paused=false;$('pause-menu').close();last=performance.now();canvas.focus();}
function restart(){s=M.create(id,count);shown=false;resume();}
function next(){const all=typeof ParkDemoStages!=='undefined'?ParkDemoStages.list():M.list(),group=all.filter(d=>d.playable&&d.id.split('/').slice(0,2).join('/')===id.split('/').slice(0,2).join('/')),index=group.findIndex(e=>e.id===id),n=group[index+1];if(!n){location.assign('../campaign/#stages');return;}location.assign(M.supports(n.id)?`mini.html?id=${encodeURIComponent(n.id)}&count=${count}&from=menu`:`index.html?id=${encodeURIComponent(n.id)}&count=${count}&from=menu`);}
$('pause').onclick=()=>showMenu();$('continue').onclick=resume;$('retry').onclick=restart;$('next').onclick=next;$('menu').onclick=()=>location.assign('../campaign/#stages');$('fullscreen').onclick=async()=>{try{if(document.fullscreenElement)await document.exitFullscreen();else await document.documentElement.requestFullscreen();}catch{}};
$('help').onclick=()=>{paused=true;keys.clear();$('help-menu').showModal();$('help-close').focus();};$('help-close').onclick=()=>{ $('help-menu').close();if(!$('pause-menu').open){paused=false;last=performance.now();canvas.focus();}};
for(const d of [$('pause-menu'),$('help-menu')])d.addEventListener('cancel',e=>{e.preventDefault();if(d===$('help-menu'))$('help-close').click();else if(s.status==='play')resume();});
addEventListener('keydown',e=>{
 if(e.altKey||e.ctrlKey||e.metaKey)return;
 if($('help-menu').open){if(e.key==='Backspace'){e.preventDefault();$('help-close').click();}return;}
 if($('pause-menu').open){if(e.key==='ArrowDown'||e.key==='ArrowUp'){e.preventDefault();const b=[...$('pause-menu').querySelectorAll('button')].filter(x=>!x.hidden),i=b.indexOf(document.activeElement);b[(i+(e.key==='ArrowDown'?1:-1)+b.length)%b.length].focus();}if(e.key==='Backspace'&&s.status==='play'){e.preventDefault();resume();}return;}
 if(e.key==='Escape'||e.key==='Backspace'){e.preventDefault();showMenu();return;}if(e.code==='KeyR'){e.preventDefault();restart();return;}if(/^Digit[1-8]$/.test(e.code)){selected=Math.min(count-1,Number(e.code.slice(-1))-1);e.preventDefault();return;}
 if(['ArrowLeft','ArrowRight','ArrowUp','ArrowDown','Space',...keyCodes].includes(e.code)){e.preventDefault();keys.add(e.code);}
});addEventListener('keyup',e=>keys.delete(e.code));addEventListener('blur',()=>{keys.clear();if(s.status==='play'&&!paused)showMenu();});document.addEventListener('visibilitychange',()=>{if(document.hidden&&s.status==='play'&&!paused)showMenu();});
function frame(now){const dt=Math.min(.04,(now-last)/1000);last=now;if(!paused){const inputs=s.players.map((_,i)=>({left:i===selected&&keys.has('ArrowLeft'),right:i===selected&&keys.has('ArrowRight'),down:i===selected&&keys.has('ArrowDown'),action:keys.has(keyCodes[i])||i===selected&&(keys.has('Space')||keys.has('ArrowUp'))}));M.step(s,inputs,dt);}draw();requestAnimationFrame(frame);}showMenu();$('result').textContent='준비됐나요?';$('continue').textContent='시작하기';requestAnimationFrame(frame);
})();
