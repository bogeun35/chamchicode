(async function(){
'use strict';
const $=id=>document.getElementById(id),canvas=$('game'),ctx=canvas.getContext('2d');
const colors=['#ffb36b','#74e4db','#afa4ff','#ff93b8','#b5e47b','#7abaff','#f4d475','#e2a2ff'];
let compiled,state,paused=true,selected=0,camera,last=performance.now(),loadVersion=0;
const keys=new Set();
function overlay(title,detail,button='시작 · Enter'){$('cover').hidden=false;$('headline').textContent=title;$('detail').textContent=detail;$('start').textContent=button;paused=true;keys.clear();}
function start(){if(!state)return;paused=false;keys.clear();$('cover').hidden=true;last=performance.now();canvas.focus();}
function reset(){if(!compiled)return;state=SourceStageRuntime.create(compiled);selected=0;camera=null;overlay('함께 출발',`${state.players.length}명 · 1–8로 조작할 캐릭터 선택`);}
async function load(){const token=++loadVersion;compiled=null;state=null;overlay('불러오는 중','원본 지형과 장치를 준비합니다.');$('start').disabled=true;
 try{const res=await fetch(`data/${$('count').value}.json`,{cache:'no-store'});if(!res.ok)throw Error('연결 데이터 준비 중');const data=await res.json();if(token!==loadVersion)return;compiled=data;$('limitations').textContent='원본 지형·스프링·워프 연결 · 물리·열쇠 동작 일치 검수 중';$('start').disabled=false;reset();}
 catch(e){if(token===loadVersion)overlay('연결 준비 중',e.message);}
}
function box(r,color,radius=3){ctx.fillStyle=color;ctx.beginPath();ctx.roundRect(r.x,r.y,r.w,r.h,radius);ctx.fill();}
function render(){ctx.clearRect(0,0,1200,675);ctx.fillStyle='#0c1c2b';ctx.fillRect(0,0,1200,675);if(!state)return;
 camera=ParkCamera.update(camera,state.players,state.map,{width:1200,height:675},1/60);
 ctx.save();ctx.scale(camera.zoom,camera.zoom);ctx.translate(-camera.x,-camera.y);
 for(const p of state.map.platforms)box(p,p.flags&2?'#438798':p.flags&4?'#b17a49':'#39566a',0);
 for(const b of state.map.switches||[])box(b,'#ffcd65');
 for(const b of state.map.springs||[]){box(b,'#e762bd');ctx.strokeStyle='#ffb7e8';ctx.lineWidth=2;ctx.beginPath();for(let i=0;i<5;i++){const x=b.x+(i%2?b.w-5:5),y=b.y+5+i*(b.h-10)/4;i?ctx.lineTo(x,y):ctx.moveTo(x,y);}ctx.stroke();}
 const door=state.map.exit;if(door){box(door,state.keyTaken?'#44bc91':'#5c6475',7);ctx.fillStyle='#091925';ctx.fillRect(door.x+7,door.y+7,door.w-14,Math.max(4,door.h-7));}
 if(state.map.key&&!state.keyTaken){const k=state.map.key;ctx.strokeStyle='#ffdb72';ctx.lineWidth=4;ctx.beginPath();ctx.arc(k.x+k.w/2,k.y+12,8,0,Math.PI*2);ctx.moveTo(k.x+k.w/2,k.y+20);ctx.lineTo(k.x+k.w/2,k.y+k.h-3);ctx.lineTo(k.x+k.w-3,k.y+k.h-3);ctx.stroke();}
 state.players.forEach((p,i)=>{if(p.exit)return;box(p,colors[i%8],8);ctx.fillStyle='#0b2735';ctx.fillRect(p.x+p.w-11,p.y+12,4,6);ctx.fillRect(p.x+7,p.y+12,4,6);ctx.fillStyle=colors[i%8];ctx.beginPath();ctx.moveTo(p.x,p.y+12);ctx.lineTo(p.x-8,p.y+5);ctx.lineTo(p.x-8,p.y+25);ctx.fill();if(selected===i){ctx.strokeStyle='#fff';ctx.lineWidth=2;ctx.strokeRect(p.x-4,p.y-4,p.w+8,p.h+8);}ctx.fillStyle='#fff';ctx.font='bold 13px system-ui';ctx.textAlign='center';ctx.fillText(String(i+1),p.x+p.w/2,p.y-9);});ctx.restore();
 $('progress').textContent=`${state.keyTaken?'🔑 ✓':'🔑'}　${state.players.filter(p=>p.exit).length} / ${state.players.length}`;
}
function frame(now){const dt=Math.min(.05,(now-last)/1000);last=now;
 if(state&&!paused&&state.status==='play'){
  const p=state.players[selected],input={left:keys.has('ArrowLeft')||keys.has('KeyA'),right:keys.has('ArrowRight')||keys.has('KeyD'),jump:keys.has('ArrowUp')||keys.has('KeyW')||keys.has('Space'),up:keys.has('ArrowUp')||keys.has('KeyW')};
  if(p&&!p.exit)SourceStageRuntime.step(state,{[p.id]:input},dt);
  else SourceStageRuntime.step(state,{},dt);
  if(state.status==='clear')overlay('함께 해냈어요','원본 첫 라운드 연결 검수 완료','다시 · Enter');
  else if(state.status==='dead')overlay('다시 한번',state.failure?.reason||'처음부터 다시 확인해요','다시 · Enter');
 }render();requestAnimationFrame(frame);
}
document.addEventListener('keydown',e=>{if(e.target.tagName==='SELECT')return;
 if(['ArrowLeft','ArrowRight','ArrowUp','Space','Backspace'].includes(e.code))e.preventDefault();
 if(e.code==='Enter'&&paused){if(state&&state.status!=='play')reset();start();return;}
 if(e.code.startsWith('Digit')&&state){const i=Number(e.code.slice(5))-1;if(i>=0&&i<state.players.length)selected=i;return;}
 if(e.code==='KeyR'&&!e.repeat){reset();return;}if(e.code==='KeyF'&&!e.repeat){$('fullscreen').click();return;}if(e.code==='KeyH'&&!e.repeat){$('help-button').click();return;}
 if(e.code==='Backspace'&&!e.repeat){paused?start():overlay('잠깐 쉬어가기','','계속 · Enter');return;}keys.add(e.code);
});document.addEventListener('keyup',e=>keys.delete(e.code));addEventListener('blur',()=>{keys.clear();if(state&&state.status==='play'&&!paused)overlay('잠깐 쉬어가기','','계속 · Enter');});
 $('start').onclick=()=>{if(state&&state.status!=='play')reset();start();};$('retry').onclick=reset;$('count').onchange=load;
 $('help-button').onclick=()=>{$('help').hidden=!$('help').hidden;};$('fullscreen').onclick=async()=>{try{document.fullscreenElement?await document.exitFullscreen():await document.documentElement.requestFullscreen();}catch{}};
 await load();requestAnimationFrame(frame);
})();
