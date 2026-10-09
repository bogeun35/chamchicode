(async function(){
'use strict';
const $=id=>document.getElementById(id),canvas=$('game'),ctx=canvas.getContext('2d');
const colors=['#ffb36b','#74e4db','#afa4ff','#ff93b8','#b5e47b','#7abaff','#f4d475','#e2a2ff'];
let compiled,state,paused=true,selected=0,camera,last=performance.now(),loadVersion=0,replay=null,replayLoading=false,replaySpeed=1;
const keys=new Set();
const onlineControl=new SourceParkOnlineController({
 getState:()=>state,isPaused:()=>paused,input:()=>({left:keys.has('ArrowLeft')||keys.has('KeyA'),right:keys.has('ArrowRight')||keys.has('KeyD'),jump:keys.has('ArrowUp')||keys.has('KeyW')||keys.has('Space'),up:keys.has('ArrowUp')||keys.has('KeyW')}),
 clearKeys:()=>keys.clear(),pause:()=>overlay('온라인 협동','방을 만들거나 코드로 참가하세요.'),togglePause:()=>{paused?start():overlay('잠깐 쉬어가기','','계속 · Enter');},
 replaceState:(s,i)=>{state=s;selected=Math.max(0,i);camera=null;paused=false;keys.clear();last=performance.now();$('start').disabled=false;canvas.focus();},
 showOnlineLobby:()=>{state=null;paused=true;keys.clear();$('cover').hidden=true;music.pause();$('progress').textContent='대기실';},
 showOnlineGame:(remotePaused,host,status)=>{if(!host)paused=remotePaused;if(status==='play'){$('start').disabled=!host;$('cover').hidden=!paused;if(paused){$('headline').textContent='잠깐 쉬어가기';$('detail').textContent='방장이 일시정지를 제어합니다.';}syncMusic();}},
 endOnline:(status,host)=>{overlay(status==='clear'?'모두 함께 해냈어요':'다시 함께',host?'대기실에서 다시 준비할 수 있습니다.':'방장을 기다리고 있습니다.','대기실 · Enter');$('start').disabled=!host;},
 onlineMode:active=>{$('count').disabled=active;$('replay').disabled=active;$('retry').disabled=active&&!onlineControl.net?.host;$('limitations').textContent=active?'온라인 협동 · 원본 첫 라운드 · 전체 이관 및 원본 물리 검수 중':'원본 지형·스프링·워프 연결 · 물리·열쇠 동작 일치 검수 중';},local:()=>load()
});window.SourceParkOnline=onlineControl;
const testMuted=new URLSearchParams(location.search).has('mute');
const music=new Audio('audio/park-together.wav');music.loop=true;music.volume=.35;music.preload='none';
let musicEnabled=!testMuted&&localStorage.getItem('park-source-music')!=='off';
function musicLabel(){const enabled=musicEnabled&&!testMuted&&!replay;$('music').textContent=enabled?'♫':'♫̸';$('music').setAttribute('aria-pressed',String(enabled));$('music').title=replay?'검수 재생은 무음입니다':`배경음악 ${enabled?'켜짐':'꺼짐'} · M`;}
function syncMusic(){musicLabel();if(!musicEnabled||testMuted||paused||replay){music.pause();return;}music.play().catch(()=>{});}
function toggleMusic(){musicEnabled=!musicEnabled;localStorage.setItem('park-source-music',musicEnabled?'on':'off');syncMusic();}
function overlay(title,detail,button='시작 · Enter'){$('cover').hidden=false;$('headline').textContent=title;$('detail').textContent=detail;$('start').textContent=button;paused=true;keys.clear();syncMusic();}
function start(){if(!state)return;paused=false;keys.clear();$('cover').hidden=true;last=performance.now();canvas.focus();syncMusic();}
function reset(){if(!compiled)return;replay=null;replaySpeed=1;$('replay-speed').hidden=true;$('replay-speed').textContent='×1';state=SourceStageRuntime.create(compiled);selected=0;camera=null;overlay('함께 출발',`${state.players.length}명 · 1–8로 조작할 캐릭터 선택`);}
function toggleReplaySpeed(){if(!replay)return;replaySpeed=replaySpeed===1?4:1;$('replay-speed').textContent='×'+replaySpeed;}
async function runReplay(){if(replayLoading)return;replayLoading=true;$('replay').disabled=true;
 if(onlineControl.active){replayLoading=false;return;}
 try{const res=await fetch('whole-route-input-replay.json',{cache:'no-store'});if(!res.ok)throw Error('재생 기록을 준비하고 있습니다.');const data=await res.json();
  if(data.schemaVersion!==1||data.count!==8||!Array.isArray(data.commands)||!data.commands.length||data.commands.some(c=>!Number.isInteger(c.frames)||c.frames<1||c.frames>36000))throw Error('입력 기록 형식을 확인해주세요.');
  $('count').value=String(data.count);await load();if(!compiled||compiled.count!==data.count)throw Error('8인 지형을 불러오지 못했습니다.');
  replay={data,index:0,remaining:data.commands[0].frames,accumulator:0};$('replay-speed').hidden=false;start();
 }catch(e){overlay('입력 재생 준비 중',e.message);}finally{replayLoading=false;$('replay').disabled=false;}
}
async function load(){const token=++loadVersion;compiled=null;state=null;overlay('불러오는 중','원본 지형과 장치를 준비합니다.');$('start').disabled=true;
 try{const res=await fetch(`data/${$('count').value}.json`,{cache:'no-store'});if(!res.ok)throw Error('연결 데이터 준비 중');const data=await res.json();if(token!==loadVersion)return;compiled=data;$('limitations').textContent='원본 지형·스프링·워프 연결 · 물리·열쇠 동작 일치 검수 중';$('start').disabled=false;reset();}
 catch(e){if(token===loadVersion)overlay('연결 준비 중',e.message);}
}
function box(r,color,radius=3){ctx.fillStyle=color;ctx.beginPath();ctx.roundRect(r.x,r.y,r.w,r.h,radius);ctx.fill();}
function render(){ctx.clearRect(0,0,1200,675);ctx.fillStyle='#0c1c2b';ctx.fillRect(0,0,1200,675);if(!state)return;
 camera=ParkCamera.update(camera,state.players,state.map,{width:1200,height:675},1/60);
 ctx.save();ctx.scale(camera.zoom,camera.zoom);ctx.translate(-camera.x,-camera.y);
 for(const p of state.map.platforms)box(p,p.flags&2?'#438798':p.flags&4?'#b17a49':'#39566a',0);
 for(const b of state.map.switches||[]){
  ctx.save();ctx.shadowColor='#ffd876';ctx.shadowBlur=b.pressed?20:0;box(b,b.pressed?'#fff4ba':'#ffcd65');ctx.restore();
  if(b.remaining>0){const relay=state.relayState.relays.find(r=>r.id===b.id),x=b.x+b.w/2,y=b.y-24;
   ctx.strokeStyle='#34566b';ctx.lineWidth=4;ctx.beginPath();ctx.arc(x,y,16,0,Math.PI*2);ctx.stroke();
   ctx.strokeStyle='#ffe482';ctx.beginPath();ctx.arc(x,y,16,-Math.PI/2,-Math.PI/2+Math.PI*2*b.remaining/relay.delay);ctx.stroke();
   ctx.fillStyle='#fff4ba';ctx.font='bold 16px system-ui';ctx.textAlign='center';ctx.fillText(String(Math.ceil(b.remaining)),x,y+5);
  }
 }
 for(const b of state.map.springs||[]){if(b.visible===false)continue;
  const lit=b.phase===2||b.phase===3,compression=b.phase===2?5+3*Math.sin(state.elapsed*45):b.phase===3?-5:0;
  ctx.save();ctx.shadowColor='#ff78d6';ctx.shadowBlur=lit?18:0;box({...b,y:b.y+compression,h:b.h-compression},lit?'#ff8fdf':'#b95c9b');ctx.restore();
  ctx.strokeStyle=lit?'#fff0fb':'#ffb7e8';ctx.lineWidth=2;ctx.beginPath();for(let i=0;i<5;i++){const x=b.x+(i%2?b.w-5:5),y=b.y+compression+5+i*(b.h-compression-10)/4;i?ctx.lineTo(x,y):ctx.moveTo(x,y);}ctx.stroke();
  if(b.phase===3){ctx.strokeStyle='#ffd6f2';ctx.beginPath();for(let i=0;i<3;i++){const x=b.x+4+i*12;ctx.moveTo(x,b.y-8);ctx.lineTo(x,b.y-28);}ctx.stroke();}
 }
 const door=state.map.exit;if(door){box(door,state.keyTaken?'#44bc91':'#5c6475',7);ctx.fillStyle='#091925';ctx.fillRect(door.x+7,door.y+7,door.w-14,Math.max(4,door.h-7));}
 if(state.map.key&&!state.keyTaken){const k=state.map.key;ctx.strokeStyle='#ffdb72';ctx.lineWidth=4;ctx.beginPath();ctx.arc(k.x+k.w/2,k.y+12,8,0,Math.PI*2);ctx.moveTo(k.x+k.w/2,k.y+20);ctx.lineTo(k.x+k.w/2,k.y+k.h-3);ctx.lineTo(k.x+k.w-3,k.y+k.h-3);ctx.stroke();}
 state.players.forEach((p,i)=>{if(p.exit)return;box(p,colors[i%8],8);ctx.fillStyle='#0b2735';ctx.fillRect(p.x+p.w-11,p.y+12,4,6);ctx.fillRect(p.x+7,p.y+12,4,6);ctx.fillStyle=colors[i%8];ctx.beginPath();ctx.moveTo(p.x,p.y+12);ctx.lineTo(p.x-8,p.y+5);ctx.lineTo(p.x-8,p.y+25);ctx.fill();if(selected===i){ctx.strokeStyle='#fff';ctx.lineWidth=2;ctx.strokeRect(p.x-4,p.y-4,p.w+8,p.h+8);}ctx.fillStyle='#fff';ctx.font='bold 13px system-ui';ctx.textAlign='center';ctx.fillText(String(i+1),p.x+p.w/2,p.y-9);});ctx.restore();
 $('progress').textContent=`${state.keyTaken?'🔑 ✓':'🔑'}　${state.players.filter(p=>p.exit).length} / ${state.players.length}`;
}
function frame(now){const dt=Math.max(0,Math.min(.05,(now-last)/1000));last=now;
 if(onlineControl.active)onlineControl.frame(dt,now);
 else if(state&&!paused&&state.status==='play'){
  if(replay){replay.accumulator+=dt*replaySpeed;const h=1/state.physics.nativeTickRate;
   while(replay&&replay.accumulator+1e-10>=h&&state.status==='play'){
    const command=replay.data.commands[replay.index];SourceStageRuntime.step(state,command.inputs||{},h);replay.accumulator-=h;replay.remaining--;
    if(replay.remaining===0){replay.index++;if(replay.index>=replay.data.commands.length){replay=null;$('replay-speed').hidden=true;overlay('입력 재생 종료','출발부터 실제 입력으로 진행한 기록입니다. 전체 클리어와 게임성은 검수 중입니다.','직접 조작 · Enter');}else replay.remaining=replay.data.commands[replay.index].frames;}
   }
  }else{
  const p=state.players[selected],input={left:keys.has('ArrowLeft')||keys.has('KeyA'),right:keys.has('ArrowRight')||keys.has('KeyD'),jump:keys.has('ArrowUp')||keys.has('KeyW')||keys.has('Space'),up:keys.has('ArrowUp')||keys.has('KeyW')};
  if(p&&!p.exit)SourceStageRuntime.step(state,{[p.id]:input},dt);
  else SourceStageRuntime.step(state,{},dt);
  }
  if(state.status==='clear')overlay('함께 해냈어요','원본 첫 라운드 연결 검수 완료','다시 · Enter');
  else if(state.status==='dead')overlay('다시 한번',state.failure?.reason||'처음부터 다시 확인해요','다시 · Enter');
 }render();requestAnimationFrame(frame);
}
document.addEventListener('keydown',e=>{if(['SELECT','INPUT','TEXTAREA'].includes(e.target.tagName)||e.code==='Enter'&&e.target.tagName==='BUTTON')return;
 if(['ArrowLeft','ArrowRight','ArrowUp','Space','Backspace'].includes(e.code))e.preventDefault();
 if(e.code==='Enter'&&paused){if(onlineControl.active){if(onlineControl.net?.host){state?.status==='play'?start():onlineControl.start();}return;}if(state&&state.status!=='play')reset();start();return;}
 if(e.code.startsWith('Digit')&&state&&!onlineControl.active){const i=Number(e.code.slice(5))-1;if(i>=0&&i<state.players.length)selected=i;return;}
 if(e.code==='KeyR'&&!e.repeat){onlineControl.active?onlineControl.start():reset();return;}if(e.code==='KeyV'&&!e.repeat){toggleReplaySpeed();return;}if(e.code==='KeyT'&&!e.repeat){runReplay();return;}if(e.code==='KeyM'&&!e.repeat){toggleMusic();return;}if(e.code==='KeyF'&&!e.repeat){$('fullscreen').click();return;}if(e.code==='KeyH'&&!e.repeat){$('help-button').click();return;}
 if(e.code==='Backspace'&&!e.repeat){if(onlineControl.active)onlineControl.pause();else paused?start():overlay('잠깐 쉬어가기','','계속 · Enter');return;}keys.add(e.code);
});document.addEventListener('keyup',e=>keys.delete(e.code));addEventListener('blur',()=>{keys.clear();if(!onlineControl.active&&state&&state.status==='play'&&!paused)overlay('잠깐 쉬어가기','','계속 · Enter');});
 $('start').onclick=()=>{if(onlineControl.active){state?.status==='play'?start():onlineControl.start();return;}if(state&&state.status!=='play')reset();start();};$('retry').onclick=()=>onlineControl.active?onlineControl.start():reset();$('count').onchange=load;$('music').onclick=toggleMusic;$('replay').onclick=runReplay;$('replay-speed').onclick=toggleReplaySpeed;
 $('help-button').onclick=()=>{$('help').hidden=!$('help').hidden;};$('fullscreen').onclick=async()=>{try{document.fullscreenElement?await document.exitFullscreen():await document.documentElement.requestFullscreen();}catch{}};
 await load();requestAnimationFrame(frame);const roomCode=new URLSearchParams(location.search).get('room');if(roomCode){$('room-code').value=roomCode;$('online-panel').hidden=false;onlineControl.enter(false);}
})();
