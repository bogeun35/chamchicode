/* Shared source stage: host authority, sequenced peer inputs, interpolated views. */
(function(root){'use strict';
const $=id=>document.getElementById(id),copy=x=>JSON.parse(JSON.stringify(x));
const memberIds=room=>Object.keys(room.players||{}).sort((a,b)=>(room.players[a].joined-room.players[b].joined)||a.localeCompare(b));
const pack=(s,runId,paused)=>({runId,count:s.players.length,ids:s.players.map(p=>p.id),status:s.status,paused,players:s.players,elapsed:s.elapsed,ticks:s.ticks,accumulator:s.accumulator,keyTaken:s.keyTaken,deaths:s.deaths,failure:s.failure,relays:s.relayState});
function apply(s,p,positions=true){
 for(const k of ['status','elapsed','ticks','accumulator','keyTaken','deaths','failure'])s[k]=p[k];
 s.relayState=copy(p.relays);if(s.map.key)s.map.key.taken=s.keyTaken;
 for(const b of s.map.switches){const r=s.relayState.relays.find(r=>r.id===b.id);b.pressed=r.pressed;b.remaining=r.remaining||0;}
 for(const b of s.map.springs){const r=s.relayState.relays.find(r=>r.id===b.id);b.phase=r.phase;b.visible=r.visible;}
 s.players=p.players.map(p=>({...p}));return s;
}
class SourceParkOnlineController{
 constructor(app){this.app=app;this.active=false;this.busy=false;this.runId='';this.compiled=new Map();this.sentAt=0;this.publishTime=0;this.lastText='';this.jumpSeen={};this.inputArrival={};this.target=null;this.panelOpen=false;
  $('online').onclick=()=>{if(!this.active){app.pause();$('online-panel').hidden=!$('online-panel').hidden;}else{this.panelOpen=!this.panelOpen;$('online-panel').hidden=!this.panelOpen;app.clearKeys();}};
  $('room-create').onclick=()=>this.enter(true);$('room-join').onclick=()=>this.enter(false);$('room-ready').onclick=()=>this.net?.ready(!this.net.room.players[this.net.id]?.ready);
  $('room-start').onclick=()=>this.start();$('room-leave').onclick=()=>this.leave();$('room-close').onclick=()=>{this.panelOpen=false;$('online-panel').hidden=true;};
  $('room-copy').onclick=()=>{if(this.net?.code){const u=new URL(location.href);u.searchParams.set('room',this.net.code);navigator.clipboard.writeText(u.href).then(()=>this.message('초대 링크 복사됨')).catch(()=>this.message('방 코드 '+this.net.code));}};
 }
 message(s){$('room-message').textContent=s;}
 async enter(create){if(this.busy)return;this.busy=true;this.message('연결 중…');this.app.pause();
  try{if(this.net)await this.net.leave();this.net=new SourceParkNetwork(r=>this.room(r).catch(e=>this.message(e.message)),e=>this.message(e));
   this.active=true;this.app.onlineMode(true);const code=create?Math.random().toString(36).slice(2,8).toUpperCase():$('room-code').value;
   await this.net.enter(code,create);this.message('');
  }catch(e){this.active=false;this.app.onlineMode(false);this.message(e.message);}finally{this.busy=false;}
 }
 roster(r){const ids=memberIds(r),key=ids.map(id=>id+':'+r.players[id].ready).join('|')+'|'+r.host;
  if(key!==this.rosterKey){this.rosterKey=key;$('room-members').replaceChildren();ids.forEach((id,i)=>{const node=document.createElement('span');node.className='room-member';node.textContent=`${i+1} ${id===this.net.id?'나':r.players[id].name}${id===r.host?' ♛':r.players[id].ready?' ✓':' …'}`;$('room-members').append(node);});}
  $('room-label').textContent=`${this.net.code} · ${ids.length}/8`;$('room-ready').hidden=this.net.host;$('room-ready').textContent=r.players[this.net.id]?.ready?'준비 취소':'준비';
  $('room-start').hidden=!this.net.host;$('room-start').disabled=ids.length<2||ids.some(id=>id!==r.host&&!r.players[id].ready);
  $('room-join-form').hidden=true;$('room-lobby').hidden=false;
 }
 async getCompiled(n){if(!this.compiled.has(n))this.compiled.set(n,fetch(`data/${n}.json`).then(r=>{if(!r.ok)throw Error('라운드를 불러오지 못했습니다.');return r.json();}));return this.compiled.get(n);}
 async room(r){if(!this.active)return;this.roster(r);const ids=memberIds(r);
  for(const [id,input] of Object.entries(r.inputs||{})){if(this.inputArrival[id]?.seq!==input.seq)this.inputArrival[id]={seq:input.seq,at:Date.now()};}
  if(r.status==='lobby'){this.runId='';this.target=null;this.panelOpen=true;this.app.pause();$('online-panel').hidden=false;this.app.showOnlineLobby();return;}
  const p=r.snapshot;if(!p||!p.ids||!p.relays)return;
  if(this.net.host&&p.ids.slice().sort().join('|')!==ids.slice().sort().join('|')){if(!this.returning){this.returning=true;await this.net.lobby();this.returning=false;this.message('인원이 바뀌었습니다. 다시 준비해주세요.');}return;}
  if(this.runId!==p.runId||!this.app.getState()||this.app.getState().players[0]?.id!==p.ids[0]){
   const c=await this.getCompiled(p.count);if(!this.active||this.net.room?.snapshot?.runId!==p.runId)return;
   this.runId=p.runId;this.endStatus='';this.panelOpen=false;const s=apply(SourceStageRuntime.create(c,{ids:p.ids}),p);this.app.replaceState(s,p.ids.indexOf(this.net.id));this.jumpSeen=Object.fromEntries(Object.entries(r.inputs||{}).map(([id,v])=>[id,v.jumpSeq||0]));
  }else if(!this.net.host){this.target=copy(p);if(p.status!=='play')apply(this.app.getState(),p);}
  $('online-panel').hidden=!this.panelOpen;this.app.showOnlineGame(!!p.paused,this.net.host,p.status);
 }
 async start(){if(!this.net?.host||this.busy)return;this.busy=true;
  try{if(this.net.room.status!=='lobby'){await this.net.lobby();this.message('모두 준비한 뒤 다시 시작해주세요.');return;}
   const ids=memberIds(this.net.room),c=await this.getCompiled(ids.length),s=SourceStageRuntime.create(c,{ids});const run=Date.now().toString(36)+'-'+Math.random().toString(36).slice(2,7);
   await this.net.start(pack(s,run,false));
  }catch(e){this.message(e.message);$('online-panel').hidden=false;}finally{this.busy=false;}
 }
 controls(){const s=this.app.getState();return !s||s.status!=='play'||this.app.isPaused()?{}:this.app.input();}
 frame(dt,now){if(!this.active||!this.net?.room)return;const s=this.app.getState();if(this.net.room.status==='lobby'||!s)return;
  const own=this.controls(),text=JSON.stringify(own);if(text!==this.lastText||now-this.sentAt>120){this.net.input(own);this.lastText=text;this.sentAt=now;}
  if(this.net.host){
   if(!this.app.isPaused()&&s.status==='play'){
    const inputs={};for(const p of s.players){let v=this.net.inputs[p.id]||{};if(!this.inputArrival[p.id]||Date.now()-this.inputArrival[p.id].at>1000)v={};inputs[p.id]={...v};
     // Preserve a short press even when press/release arrive between ticks.
     if((v.jumpSeq||0)>(this.jumpSeen[p.id]||0)){inputs[p.id].jump=!p.jump;if(!p.jump)this.jumpSeen[p.id]=v.jumpSeq;}
    }
    inputs[this.net.id]=own;SourceStageRuntime.step(s,inputs,dt);
   }
   this.publishTime+=dt;if(this.publishTime>=1/12){this.publishTime=0;this.net.publish(pack(s,this.runId,this.app.isPaused()));}
  }else if(this.target){const previous=s.players.map(p=>({...p}));apply(s,this.target);for(const p of s.players){const old=previous.find(q=>q.id===p.id);if(old&&!p.exit&&!old.exit&&Math.hypot(p.x-old.x,p.y-old.y)<180){p.x=old.x+(p.x-old.x)*Math.min(1,dt*20);p.y=old.y+(p.y-old.y)*Math.min(1,dt*20);}}}
  if(s.status!=='play'&&this.endStatus!==s.status){this.endStatus=s.status;this.app.endOnline(s.status,this.net.host);}
 }
 pause(){if(!this.net?.host){this.message('방장이 일시정지를 제어합니다.');return;}this.app.togglePause();}
 async leave(){this.active=false;if(this.net)await this.net.leave();this.net=null;this.runId='';this.target=null;this.rosterKey='';this.endStatus='';$('room-join-form').hidden=false;$('room-lobby').hidden=true;$('online-panel').hidden=true;this.app.onlineMode(false);await this.app.local();}
}
root.SourceParkOnlineController=SourceParkOnlineController;
})(window);
