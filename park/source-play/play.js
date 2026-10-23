(async function(){
'use strict';
const $=id=>document.getElementById(id),canvas=$('game'),ctx=canvas.getContext('2d');
const colors=['#ffb36b','#74e4db','#afa4ff','#ff93b8','#b5e47b','#7abaff','#f4d475','#e2a2ff'];
const catalogue=await fetch('catalogue.json',{cache:'no-store'}).then(r=>{if(!r.ok)throw Error('catalogue');return r.json();}).catch(()=>({stages:[{id:'st_w_01_01',title:'2편 1–1'}]}));
for(const item of catalogue.stages){if([...$('stage').options].some(o=>o.value===item.id))continue;const option=document.createElement('option');option.value=item.id;option.textContent=item.title;$('stage').append(option);}
const stageTitle=()=>catalogue.stages.find(s=>s.id===$('stage').value)?.title||'원본 라운드';
const stageOf=id=>catalogue.stages.find(s=>s.id===id);
const parseId=id=>{const m=/^st_w_(\d+)_(\d+)$/.exec(id||'');return m?{world:Number(m[1]),no:Number(m[2])}:{world:0,no:0};};
// ---- round picker (cards) ----------------------------------------------------
// A thumbnail is the 2-player map in tile units: the world's sky, every platform
// as a flat block, the friends' start spots, the key and the door.
function drawThumb(cv,stage){const th=stage&&stage.thumb;const c=cv.getContext('2d');const W=cv.width,H=cv.height;c.clearRect(0,0,W,H);
 const theme=window.ParkArt&&ParkArt.THEMES[ParkArt.worldOf(stage&&stage.id)]||(window.ParkArt?ParkArt.THEMES[1]:null);
 const g=c.createLinearGradient(0,0,0,H);if(theme){g.addColorStop(0,theme.sky[0]);g.addColorStop(.6,theme.sky[1]);g.addColorStop(1,theme.sky[2]);}else{g.addColorStop(0,'#a5dbff');g.addColorStop(1,'#fff4de');}
 c.fillStyle=g;c.fillRect(0,0,W,H);if(!th)return;
 const pad=4,s=Math.min((W-pad*2)/th.w,(H-pad*2)/th.h),ox=(W-th.w*s)/2,oy=(H-th.h*s)/2;
 const soil=theme?theme.soil:'#e6bb8b',cap=theme?theme.cap:'#9edb82';
 for(const [x,y,w,h,f] of th.rects){c.fillStyle=f&2?'#6fc3c9':f&4?'#c48c55':soil;c.fillRect(ox+x*s,oy+y*s,Math.max(1,w*s),Math.max(1,h*s));
  if(!(f&6)&&h*s>=2){c.fillStyle=cap;c.fillRect(ox+x*s,oy+y*s,Math.max(1,w*s),Math.max(1,Math.min(2,s*.35)));}}
 if(th.exit){const [x,y,w,h]=th.exit;c.fillStyle='#44bc91';c.fillRect(ox+x*s-1,oy+y*s-1,Math.max(3,w*s+2),Math.max(3,h*s+2));}
 if(th.key){const [x,y]=th.key;c.fillStyle='#ffdb72';c.beginPath();c.arc(ox+x*s,oy+y*s,Math.max(2,s*.45),0,Math.PI*2);c.fill();}
 th.spawns.forEach(([x,y],i)=>{c.fillStyle=colors[i%8];c.beginPath();c.arc(ox+x*s,oy+y*s-s*.3,Math.max(2.2,s*.55),0,Math.PI*2);c.fill();c.strokeStyle='#2a2240';c.lineWidth=1;c.stroke();});}
const cards=new Map();
function buildPicker(){const grid=$('picker-grid');grid.replaceChildren();const worlds=new Map();
 for(const s of catalogue.stages){const {world}=parseId(s.id);if(!worlds.has(world))worlds.set(world,[]);worlds.get(world).push(s);}
 for(const [world,list] of [...worlds.entries()].sort((a,b)=>a[0]-b[0])){const sec=document.createElement('section');sec.className='world';const h=document.createElement('h3');h.textContent=`2편 · 월드 ${world}`;sec.append(h);
  const box=document.createElement('div');box.className='cards';
  for(const s of list.sort((a,b)=>parseId(a.id).no-parseId(b.id).no)){const {world:w,no}=parseId(s.id);const b=document.createElement('button');b.className='card';b.type='button';b.dataset.id=s.id;b.setAttribute('aria-pressed','false');
   const cv=document.createElement('canvas');cv.width=320;cv.height=180;drawThumb(cv,s);const t=document.createElement('div');t.className='card-title';const bb=document.createElement('b');bb.textContent=`${w}–${no}`;const tg=document.createElement('span');tg.className='tags';tg.textContent=(s.kinds||[]).join(' · ');t.append(bb,tg);b.append(cv,t);
   b.onclick=()=>{if($('stage').disabled)return;if($('stage').value!==s.id){$('stage').value=s.id;$('stage').dispatchEvent(new Event('change'));}closePicker();};
   cards.set(s.id,b);box.append(b);}
  sec.append(box);grid.append(sec);}}
function syncPicker(){const id=$('stage').value,s=stageOf(id),{world,no}=parseId(id),locked=$('stage').disabled;
 $('chip-world').textContent='2편 · 월드 '+world;$('chip-title').textContent=`${world}–${no}`;$('chip-tags').textContent=(s&&s.kinds||[]).join(' · ');drawThumb($('chip-thumb'),s);
 $('stage-pick').setAttribute('aria-disabled',String(locked));$('stage-pick').title=locked?'온라인에서는 방장이 대기실에서 고릅니다':'라운드 고르기';
 for(const [k,b] of cards){b.setAttribute('aria-pressed',String(k===id));b.disabled=locked;}
 const cv=$('cover-thumb');if(s){cv.hidden=false;drawThumb(cv,s);}else cv.hidden=true;}
function syncCount(){const seg=$('count-seg'),v=$('count').value,locked=$('count').disabled;seg.setAttribute('aria-disabled',String(locked));for(const b of seg.querySelectorAll('button')){b.setAttribute('aria-pressed',String(b.dataset.count===v));b.disabled=locked;}}
function openPicker(){if($('picker').hidden===false)return;if(state&&!paused&&state.status==='play')overlay('잠깐 쉬어가기','','계속 · Enter');$('picker').hidden=false;$('stage-pick').setAttribute('aria-expanded','true');const cur=cards.get($('stage').value);if(cur){cur.scrollIntoView({block:'center'});cur.focus();}}
function closePicker(){if($('picker').hidden)return;$('picker').hidden=true;$('stage-pick').setAttribute('aria-expanded','false');$('stage-pick').focus();}
for(let n=2;n<=8;n++){const b=document.createElement('button');b.type='button';b.dataset.count=String(n);b.textContent=String(n);b.setAttribute('aria-pressed','false');b.onclick=()=>{if($('count').disabled)return;if($('count').value!==String(n)){$('count').value=String(n);$('count').dispatchEvent(new Event('change'));}syncCount();};$('count-seg').append(b);}
buildPicker();
let compiled,state,paused=true,selected=0,camera,last=performance.now(),loadVersion=0,replay=null,replayLoading=false,replaySpeed=1;
const keys=new Set();
const onlineControl=new SourceParkOnlineController({
 getState:()=>state,isPaused:()=>paused,input:()=>({left:keys.has('ArrowLeft')||keys.has('KeyA'),right:keys.has('ArrowRight')||keys.has('KeyD'),jump:keys.has('ArrowUp')||keys.has('KeyW')||keys.has('Space'),up:keys.has('ArrowUp')||keys.has('KeyW'),down:keys.has('ArrowDown')||keys.has('KeyS'),shot:keys.has('KeyX')||keys.has('ShiftLeft')||keys.has('ShiftRight')}),
 clearKeys:()=>keys.clear(),resume:()=>start(),pause:()=>overlay('온라인 협동','방을 만들거나 코드로 참가하세요.'),togglePause:()=>{paused?start():overlay('잠깐 쉬어가기','','계속 · Enter');},
 replaceState:(s,i,remotePaused=false)=>{state=s;selected=Math.max(0,i);camera=null;paused=remotePaused;keys.clear();last=performance.now();$('start').disabled=false;canvas.focus();},
 showOnlineLobby:()=>{state=null;paused=true;keys.clear();$('cover').hidden=true;music.pause();$('progress').textContent='대기실';},
 showOnlineGame:(remotePaused,host,status)=>{if(!host)paused=remotePaused;if(status==='play'){$('start').disabled=!host;$('cover').hidden=!paused;if(paused){$('headline').textContent='잠깐 쉬어가기';$('detail').textContent='방장이 일시정지를 제어합니다.';}syncMusic();}},
 endOnline:(status,host)=>{status==='dead'?overlay('다시 한번','모두 함께 처음부터 다시 시작합니다.','바로 시작 · Enter'):overlay('모두 함께 해냈어요',host?'대기실에서 다시 준비할 수 있습니다.':'방장을 기다리고 있습니다.','대기실 · Enter');$('start').disabled=!host&&status!=='dead';},
 onlineMode:active=>{$('count').disabled=active;$('stage').disabled=active;$('replay').disabled=active;$('retry').disabled=active&&!onlineControl.net?.host;$('limitations').textContent='전체 이관 및 원본 동작 검수 중';syncPicker();syncCount();},stageChanged:()=>{syncPicker();syncCount();},local:()=>load()
});window.SourceParkOnline=onlineControl;
const testMuted=new URLSearchParams(location.search).has('mute');
const music=new Audio('audio/park-together.wav');music.loop=true;music.volume=.35;music.preload='none';
let musicEnabled=!testMuted&&localStorage.getItem('park-source-music')!=='off';
function musicLabel(){const enabled=musicEnabled&&!testMuted&&!replay;$('music').textContent=enabled?'♫':'♫̸';$('music').setAttribute('aria-pressed',String(enabled));$('music').title=replay?'검수 재생은 무음입니다':`배경음악 ${enabled?'켜짐':'꺼짐'} · M`;}
function syncMusic(){musicLabel();if(!musicEnabled||testMuted||paused||replay){music.pause();return;}music.play().catch(()=>{});}
function toggleMusic(){musicEnabled=!musicEnabled;localStorage.setItem('park-source-music',musicEnabled?'on':'off');syncMusic();}
function overlay(title,detail,button='시작 · Enter'){$('cover').hidden=false;$('headline').textContent=title;$('detail').textContent=detail;$('start').textContent=button;paused=true;keys.clear();syncMusic();
 const row=$('cover-friends');row.replaceChildren();const n=state?state.players.length:0;for(let i=0;i<n;i++){const f=document.createElement('span');f.style.background=colors[(state.players[i].colorIndex??i)%8];row.append(f);}}
function start(){if(!state)return;paused=false;keys.clear();$('cover').hidden=true;last=performance.now();canvas.focus();syncMusic();}
function reset(){if(!compiled)return;replay=null;replaySpeed=1;$('replay-speed').hidden=true;$('replay-speed').textContent='×1';state=SourceStageRuntime.restart(compiled,state,{shuffleSeed:(Math.random()*4294967296)|0});selected=0;camera=null;overlay('함께 출발',`${state.players.length}명 · 1–8로 조작할 캐릭터 선택`);}
function toggleReplaySpeed(){if(!replay)return;replaySpeed=replaySpeed===1?4:1;$('replay-speed').textContent='×'+replaySpeed;}
async function runReplay(){if(replayLoading)return;replayLoading=true;$('replay').disabled=true;
 if(onlineControl.active){replayLoading=false;return;}
 try{const res=await fetch('whole-route-input-replay.json',{cache:'no-store'});if(!res.ok)throw Error('재생 기록을 준비하고 있습니다.');const data=await res.json();
  if(data.schemaVersion!==1||data.count!==8||!Array.isArray(data.commands)||!data.commands.length||data.commands.some(c=>!Number.isInteger(c.frames)||c.frames<1||c.frames>36000))throw Error('입력 기록 형식을 확인해주세요.');
  $('stage').value='st_w_01_01';$('count').value=String(data.count);await load();if(!compiled||compiled.count!==data.count)throw Error('8인 지형을 불러오지 못했습니다.');
  replay={data,index:0,remaining:data.commands[0].frames,accumulator:0};$('replay-speed').hidden=false;start();
 }catch(e){overlay('입력 재생 준비 중',e.message);}finally{replayLoading=false;$('replay').disabled=false;}
}
async function load(){const token=++loadVersion;compiled=null;state=null;syncPicker();syncCount();overlay('불러오는 중','원본 지형과 장치를 준비합니다.');$('start').disabled=true;
 try{const res=await fetch(`data/${encodeURIComponent($('stage').value)}/${$('count').value}.json`,{cache:'no-store'});if(!res.ok)throw Error('연결 데이터 준비 중');const data=await res.json();if(token!==loadVersion)return;compiled=data;$('limitations').textContent='전체 이관 및 원본 동작 검수 중';$('start').disabled=false;reset();}
 catch(e){if(token===loadVersion)overlay('연결 준비 중',e.message);}
}
function box(r,color,radius=3){ctx.fillStyle=color;ctx.beginPath();ctx.roundRect(r.x,r.y,r.w,r.h,radius);ctx.fill();}
// park-art.js draws the round; it only reads state. If it ever throws, the
// plain renderer below takes over so the loop never stops on a drawing error.
const debugBoxes=new URLSearchParams(location.search).has('boxes');let artFailed=false;
function render(){
 if(!state){if(window.ParkArt)ParkArt.blank(ctx,canvas);else{ctx.clearRect(0,0,1200,675);ctx.fillStyle='#0c1c2b';ctx.fillRect(0,0,1200,675);}return;}
 // The view keeps a fixed logical height and takes the screen's shape, so the
 // camera gets the real width instead of a stretched 1200x675 picture.
 const view=window.ParkArt?ParkArt.viewport(canvas):{width:1200,height:675,scale:canvas.height/675};
 camera=state.autoScrollState&&ParkCamera.fromAutoScroll?ParkCamera.fromAutoScroll(state.autoScrollState,{width:view.width,height:view.height}):ParkCamera.update(camera,state.players,state.map,{width:view.width,height:view.height},1/60);
 if(window.ParkArt&&!artFailed){try{ParkArt.render(ctx,state,camera,{canvas,viewport:view,selected,time:performance.now()/1000,debugBoxes});}catch(e){artFailed=true;console.error('ParkArt',e);renderFlat();}}
 else renderFlat();
 $('progress').textContent=`${state.goalOpen?'🔑 ✓':state.keyTaken?'🔑 …':'🔑'}　${state.players.filter(p=>p.exit).length} / ${state.players.length}`;
}
function renderFlat(){const k=canvas.height/675,w=canvas.width/k;ctx.setTransform(k,0,0,k,0,0);ctx.clearRect(0,0,w,675);ctx.fillStyle='#0c1c2b';ctx.fillRect(0,0,w,675);
 ctx.save();ctx.scale(camera.zoom,camera.zoom);ctx.translate(-camera.x,-camera.y);
 if(window.ParkArt)ParkArt.drawRegisteredDevices(ctx,state);
 for(const p of state.map.platforms)box(p,p.flags&2?'#438798':p.flags&4?'#b17a49':'#39566a',0);
 for(const b of SourceMotionDevices.solids(state.motionState)){box(b,b.wallId?'#aa7c64':'#39566a',b.wallId?3:0);if(b.wallId){ctx.strokeStyle='#513c35';ctx.lineWidth=2;ctx.strokeRect(b.x+2,b.y+2,b.w-4,b.h-4);}}
 for(const b of state.motionState.dashBoards){box(b,'#31cec1',3);ctx.strokeStyle='#efffff';ctx.lineWidth=3;ctx.beginPath();for(let i=0;i<3;i++){const x=b.x+12+i*18;ctx.moveTo(x,b.y+2);ctx.lineTo(x+6,b.y+b.h/2);ctx.lineTo(x,b.y+b.h-2);}ctx.stroke();}
 // every device park-art.js does not know is drawn by source-device-art.js
 if(window.SourceDeviceArt)SourceDeviceArt.draw(ctx,state);
 for(const b of state.gateState.gates){box(b,b.phase===1||b.phase===3?'#438c83':'#756184',3);ctx.strokeStyle='#ac92bd';ctx.lineWidth=2;for(let y=b.y+8;y<b.y+b.h;y+=12){ctx.beginPath();ctx.moveTo(b.x+3,y);ctx.lineTo(b.x+b.w-3,y);ctx.stroke();}}
 for(const d of state.deviceState?.devices||[]){
  if(d.type==='PushBox'){box(d,'#c48c55',4);ctx.strokeStyle='#785136';ctx.lineWidth=4;ctx.strokeRect(d.x+4,d.y+4,d.w-8,d.h-8);ctx.beginPath();ctx.moveTo(d.x+5,d.y+5);ctx.lineTo(d.x+d.w-5,d.y+d.h-5);ctx.moveTo(d.x+d.w-5,d.y+5);ctx.lineTo(d.x+5,d.y+d.h-5);ctx.stroke();for(let i=0;i<d.requiredPushers;i++){ctx.fillStyle=i<d.pushCount?'#89ffd1':'#775039';ctx.beginPath();ctx.arc(d.x+d.w/2+(i-(d.requiredPushers-1)/2)*6,d.y-7,2,0,Math.PI*2);ctx.fill();}}
  else if(d.type==='Thorn'&&d.active){ctx.save();ctx.globalAlpha=d.alpha;ctx.translate(d.x,d.y);ctx.rotate([0,Math.PI,-Math.PI/2,Math.PI/2][d.direction]);ctx.fillStyle=d.phase==='move'?'#ff7f89':'#e9bec9';ctx.beginPath();ctx.moveTo(-12,-2);ctx.lineTo(0,-18);ctx.lineTo(12,-2);ctx.closePath();ctx.fill();ctx.fillStyle='#a15c79';ctx.fillRect(-12,-8,24,6);ctx.restore();}
 }
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
 const door=state.map.exit;if(door){box(door,state.goalOpen?'#44bc91':'#5c6475',7);ctx.fillStyle='#091925';ctx.fillRect(door.x+7,door.y+7,door.w-14,Math.max(4,door.h-7));}
 if(state.map.key&&!state.map.key.hidden){const k=state.map.key;ctx.strokeStyle=state.keyActive?'#ffdb72':'#586270';ctx.lineWidth=4;ctx.beginPath();ctx.arc(k.x+k.w/2,k.y+12,8,0,Math.PI*2);ctx.moveTo(k.x+k.w/2,k.y+20);ctx.lineTo(k.x+k.w/2,k.y+k.h-3);ctx.lineTo(k.x+k.w-3,k.y+k.h-3);ctx.stroke();for(const o of state.gateState.observers)for(let i=0;i<o.total;i++){ctx.fillStyle=i<o.pushedCount?'#7ef0bc':'#586270';ctx.beginPath();ctx.arc(k.x+k.w/2+(i-(o.total-1)/2)*10,k.y-12,3,0,Math.PI*2);ctx.fill();}}
 const blackoutView=state.blackoutState&&state.blackoutState.blackouts.length?SourceBlackoutDevices.displays(state.blackoutState):null;
 state.players.forEach((p,i)=>{if(p.exit||p.asBlock||p.hiddenByCardboard||p.fakeProxy)return;
  // changeControlablePlayer 0x181872cc0 greys out everyone who cannot move, so
  // the one-at-a-time rule has to be visible or the round is unreadable.
  box(p,p.grayscale?'#6b7280':colors[i%8],8);ctx.fillStyle='#0b2735';ctx.fillRect(p.x+p.w-11,p.y+12,4,6);ctx.fillRect(p.x+7,p.y+12,4,6);ctx.fillStyle=p.grayscale?'#6b7280':colors[i%8];ctx.beginPath();ctx.moveTo(p.x,p.y+12);ctx.lineTo(p.x-8,p.y+5);ctx.lineTo(p.x-8,p.y+25);ctx.fill();if(selected===i){ctx.strokeStyle='#fff';ctx.lineWidth=2;ctx.strokeRect(p.x-4,p.y-4,p.w+8,p.h+8);}ctx.fillStyle='#fff';ctx.font='bold 13px system-ui';ctx.textAlign='center';ctx.fillText(String(i+1),p.x+p.w/2,p.y-9);const bc=state.blackoutState&&state.blackoutState.controllers&&state.blackoutState.controllers[0];if(bc&&bc.visibleUI&&bc.playerIndex===i){ctx.fillStyle='#ffe082';ctx.font='bold 12px system-ui';ctx.fillText('X: 불 켜기',p.x+p.w/2,p.y-24);}});ctx.restore();if(blackoutView){for(const b of blackoutView.blackouts){const a=Math.max(0,Math.min(1,b.alpha*(b.darknessRaw/65536)));if(a>0){ctx.fillStyle='rgba(0,0,0,'+a+')';ctx.fillRect(0,0,view.width,view.height);}}}
 // A DeadTimer ends the round for everyone when it reaches zero, so the
 // countdown has to be on screen. TimerView.updateTimer renders floor(m_Sec) as
 // m:ss and TimerComponent.WARNING_SECOND is 10, which turns the readout red.
 const timers=state.switchTimerState&&window.SourceSwitchTimerDevices
  ?window.SourceSwitchTimerDevices.displays(state.switchTimerState):[];
 if(timers.length){
  ctx.save();ctx.textAlign='center';ctx.textBaseline='top';
  timers.forEach((t,i)=>{
   const text=`${t.minutes}:${String(t.seconds).padStart(2,'0')}`;
   const y=14+i*44;
   ctx.font='bold 38px system-ui';
   ctx.lineWidth=6;ctx.strokeStyle='#081421bf';ctx.strokeText(text,600,y);
   ctx.fillStyle=t.warning?'#ff8d9c':'#f3f9ff';ctx.fillText(text,600,y);
  });
  ctx.restore();
 }
}
// The host's simulation must not stop when its tab is hidden (rAF pauses there),
// or every peer freezes: a worker timer keeps it running whenever rAF is late.
let onlineLast=performance.now(),rafAt=performance.now();
function pumpOnline(now){const dt=Math.max(0,Math.min(.05,(now-onlineLast)/1000));onlineLast=now;onlineControl.frame(dt,now);}
try{const w=new Worker(URL.createObjectURL(new Blob(['setInterval(function(){postMessage(0)},16)'],{type:'text/javascript'})));w.onmessage=()=>{const now=performance.now();if(onlineControl.active&&onlineControl.net?.host&&now-rafAt>100)pumpOnline(now);};window.__parkTicker=w;}catch(e){}
function frame(now){const dt=Math.max(0,Math.min(.05,(now-last)/1000));last=now;rafAt=performance.now();
 if(onlineControl.active)pumpOnline(now);
 else if(state&&!paused&&state.status==='play'){
  if(replay){replay.accumulator+=dt*replaySpeed;const h=1/state.physics.nativeTickRate;
   while(replay&&replay.accumulator+1e-10>=h&&state.status==='play'){
    const command=replay.data.commands[replay.index];SourceStageRuntime.step(state,command.inputs||{},h);replay.accumulator-=h;replay.remaining--;
    if(replay.remaining===0){replay.index++;if(replay.index>=replay.data.commands.length){replay=null;$('replay-speed').hidden=true;overlay('입력 재생 종료','출발부터 실제 입력으로 진행한 기록입니다. 전체 클리어와 게임성은 검수 중입니다.','직접 조작 · Enter');}else replay.remaining=replay.data.commands[replay.index].frames;}
   }
  }else{
  const p=state.players[selected],input={left:keys.has('ArrowLeft')||keys.has('KeyA'),right:keys.has('ArrowRight')||keys.has('KeyD'),jump:keys.has('ArrowUp')||keys.has('KeyW')||keys.has('Space'),up:keys.has('ArrowUp')||keys.has('KeyW'),down:keys.has('ArrowDown')||keys.has('KeyS'),shot:keys.has('KeyX')||keys.has('ShiftLeft')||keys.has('ShiftRight')};
  if(p&&!p.exit)SourceStageRuntime.step(state,{[p.id]:input},dt);
  else SourceStageRuntime.step(state,{},dt);
  }
  if(state.status==='clear')overlay('함께 해냈어요',stageTitle()+' 클리어','다시 · Enter');
  else if(state.status==='dead')overlay('다시 한번',state.failure?.reason||'처음부터 다시 확인해요','다시 · Enter');
 }render();requestAnimationFrame(frame);
}
// Test hook: drive one frame without rAF (a hidden window pauses rAF).
window.__parkFrameOnce=now=>{const dt=Math.max(0,Math.min(.05,(now-last)/1000));last=now;rafAt=now;if(onlineControl.active)pumpOnline(now);render();};
document.addEventListener('keydown',e=>{if(['SELECT','INPUT','TEXTAREA'].includes(e.target.tagName)||(e.code==='Enter'||e.code==='Space')&&e.target.tagName==='BUTTON')return;
 if(e.code==='Escape'){closePicker();return;}
 if(['ArrowLeft','ArrowRight','ArrowUp','Space','Backspace'].includes(e.code))e.preventDefault();
 if(e.code==='Enter'&&paused){if(onlineControl.active){onlineControl.cover();return;}if(state&&state.status!=='play')reset();start();return;}
 if(e.code.startsWith('Digit')&&state&&!onlineControl.active){const i=Number(e.code.slice(5))-1;if(i>=0&&i<state.players.length)selected=i;return;}
 if(e.code==='KeyR'&&!e.repeat){onlineControl.active?onlineControl.restartRound():reset();return;}if(e.code==='KeyV'&&!e.repeat){toggleReplaySpeed();return;}if(e.code==='KeyT'&&!e.repeat){runReplay();return;}if(e.code==='KeyM'&&!e.repeat){toggleMusic();return;}if(e.code==='KeyF'&&!e.repeat){$('fullscreen').click();return;}if(e.code==='KeyH'&&!e.repeat){$('help-button').click();return;}
 if(e.code==='Backspace'&&!e.repeat){if(onlineControl.active)onlineControl.pause();else paused?start():overlay('잠깐 쉬어가기','','계속 · Enter');return;}keys.add(e.code);
});document.addEventListener('keyup',e=>keys.delete(e.code));addEventListener('blur',()=>{keys.clear();if(!onlineControl.active&&state&&state.status==='play'&&!paused)overlay('잠깐 쉬어가기','','계속 · Enter');});
 $('start').onclick=()=>{if(onlineControl.active){onlineControl.cover();return;}if(state&&state.status!=='play')reset();start();};$('retry').onclick=()=>onlineControl.active?onlineControl.restartRound():reset();$('count').onchange=load;$('stage').onchange=()=>onlineControl.active?onlineControl.selectStage($('stage').value):load();$('music').onclick=toggleMusic;$('replay').onclick=runReplay;$('replay-speed').onclick=toggleReplaySpeed;
 $('help-button').onclick=()=>{$('help').hidden=!$('help').hidden;};$('stage-pick').onclick=()=>{if($('stage').disabled)return;$('picker').hidden?openPicker():closePicker();};$('picker-close').onclick=closePicker;$('fullscreen').onclick=async()=>{try{document.fullscreenElement?await document.exitFullscreen():await document.documentElement.requestFullscreen();}catch{}};
 await load();requestAnimationFrame(frame);const roomCode=new URLSearchParams(location.search).get('room');if(roomCode){$('room-code').value=roomCode;$('online-panel').hidden=false;onlineControl.enter(false);}
})();
