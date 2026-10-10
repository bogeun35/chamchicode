/* Shared source stage: host authority, sequenced peer inputs, interpolated views. */
(function(root){'use strict';
const $=id=>document.getElementById(id),copy=x=>JSON.parse(JSON.stringify(x));
// The original loses the round for everyone and restarts the same stage
// after a short beat; it never returns the party to the waiting room.
const RESTART_DELAY_MS=1100;
const memberIds=room=>Object.keys(room.players||{}).sort((a,b)=>(room.players[a].joined-room.players[b].joined)||a.localeCompare(b));
const pack=(s,runId,paused)=>({runId,stageId:s.map.id,count:s.players.length,ids:s.players.map(p=>p.id),status:s.status,paused,players:s.players,elapsed:s.elapsed,ticks:s.ticks,accumulator:s.accumulator,keyTaken:s.keyTaken,keyActive:s.keyActive,deaths:s.deaths,failure:s.failure,relays:s.relayState,devices:s.deviceState,motion:s.motionState,gates:s.gateState});
function apply(s,p,positions=true){
 for(const k of ['status','elapsed','ticks','accumulator','keyTaken','deaths','failure'])s[k]=p[k];
 if(p.devices)s.deviceState={...copy(p.devices),devices:copy(p.devices.devices||[]),warnings:copy(p.devices.warnings||[])};
 if(p.motion)s.motionState={...copy(p.motion),rects:copy(p.motion.rects||[]),dashBoards:copy(p.motion.dashBoards||[]),walls:copy(p.motion.walls||[])};
 if(p.gates)s.gateState={...copy(p.gates),gates:copy(p.gates.gates||[]),observers:copy(p.gates.observers||[]),keys:copy(p.gates.keys||[])};
 s.keyActive=p.keyActive!==false;
 s.relayState={...copy(p.relays),relays:copy(p.relays.relays||[])};if(s.map.key)s.map.key.taken=s.keyTaken;
 for(const b of s.map.switches){const r=s.relayState.relays.find(r=>r.id===b.id);b.pressed=r.pressed;b.remaining=r.remaining||0;}
 for(const b of s.map.springs){const r=s.relayState.relays.find(r=>r.id===b.id);b.phase=r.phase;b.visible=r.visible;}
 s.players=p.players.map(p=>({...p}));return s;
}
class SourceParkOnlineController{
 constructor(app){this.app=app;this.active=false;this.busy=false;this.runId='';this.compiled=new Map();this.sentAt=0;this.publishTime=0;this.lastText='';this.jumpSeen={};this.inputArrival={};this.target=null;this.panelOpen=false;this.deadAt=0;this.restarting=false;
  $('online').onclick=()=>{if(!this.active){app.pause();$('online-panel').hidden=!$('online-panel').hidden;}else{this.panelOpen=!this.panelOpen;$('online-panel').hidden=!this.panelOpen;app.clearKeys();}};
  $('room-create').onclick=()=>this.enter(true);$('room-join').onclick=()=>this.enter(false);$('room-ready').onclick=()=>this.ready();
  $('room-start').onclick=()=>this.start();$('room-leave').onclick=()=>this.leave();$('room-close').onclick=()=>{this.panelOpen=false;$('online-panel').hidden=true;};
  $('room-copy').onclick=()=>{if(this.net?.code){const u=new URL(location.href);u.searchParams.set('room',this.net.code);navigator.clipboard.writeText(u.href).then(()=>this.message('초대 링크 복사됨')).catch(()=>this.message('방 코드 '+this.net.code));}};
 }
 message(s){$('room-message').textContent=s;}
 async enter(create){if(this.busy)return;this.busy=true;this.message('연결 중…');this.app.pause();
  try{if(this.net)await this.net.leave();this.net=new SourceParkNetwork(r=>this.room(r).catch(e=>this.message(e.message)),e=>this.message(e),reason=>this.removed(reason));
   this.active=true;this.app.onlineMode(true);const code=create?Math.random().toString(36).slice(2,8).toUpperCase():$('room-code').value;
   await this.net.enter(code,create);const url=new URL(location.href);url.searchParams.set('room',this.net.code);history.replaceState(null,'',url);this.message('');
  }catch(e){this.active=false;this.app.onlineMode(false);this.message(e.message);}finally{this.busy=false;}
 }
 roster(r){const ids=memberIds(r),key=ids.map(id=>id+':'+r.players[id].ready+':'+this.net.connected(id)).join('|')+'|'+r.host+'|'+Object.keys(r.kicked||{}).join('|');
  if(key!==this.rosterKey){this.rosterKey=key;$('room-members').replaceChildren();ids.forEach((id,i)=>{const node=document.createElement('div');node.className='room-member';node.dataset.playerId=id;const label=document.createElement('span');label.textContent=`${i+1} ${id===this.net.id?'나':r.players[id].name}${id===r.host?' ♛':r.players[id].ready?' ✓':' …'}${this.net.connected(id)?'':' · 연결 끊김'}`;node.append(label);if(this.net.host&&id!==this.net.id){const kick=document.createElement('button');kick.textContent='강퇴';kick.dataset.kick=id;kick.onclick=()=>this.net.kick(id).catch(e=>this.message(e.message));node.append(kick);}$('room-members').append(node);});
   $('room-bans').replaceChildren();$('room-bans').hidden=!this.net.host;for(const [id,ban] of Object.entries(r.kicked||{})){const button=document.createElement('button');button.dataset.unblock=id;button.textContent=`${ban.name||'참가자'} 재입장 허용`;button.onclick=()=>this.net.unblock(id).catch(e=>this.message(e.message));$('room-bans').append(button);}}
  const offline=ids.filter(id=>!this.net.connected(id));$('connection-status').textContent=offline.length?`${offline.length}명 재접속 대기`:'';
  $('room-label').textContent=`${this.net.code} · ${ids.length}/8`;$('room-ready').hidden=this.net.host;$('room-ready').textContent=r.players[this.net.id]?.ready?'준비 취소':'준비';
  $('room-start').hidden=!this.net.host;$('room-start').disabled=this.net.connectedIds().length<2||ids.some(id=>this.net.connected(id)&&id!==r.host&&!r.players[id].ready);
  $('stage').value=r.stageId||'st_w_01_01';$('stage').disabled=!this.net.host||r.status!=='lobby'||!!r.restartPending;$('retry').disabled=!this.net.host;
  $('room-join-form').hidden=true;$('room-lobby').hidden=false;
 }
 async getCompiled(n,stageId='st_w_01_01'){const key=stageId+':'+n;if(!this.compiled.has(key))this.compiled.set(key,fetch(`data/${encodeURIComponent(stageId)}/${n}.json`).then(r=>{if(!r.ok)throw Error('라운드를 불러오지 못했습니다.');return r.json();}).catch(e=>{this.compiled.delete(key);throw e;}));return this.compiled.get(key);}
 async selectStage(stageId){try{await this.getCompiled(Math.max(2,Object.keys(this.net.room.players).length),stageId);await this.net.selectStage(stageId);this.message('');}catch(e){this.message(e.message);$('stage').value=this.net.room.stageId||'st_w_01_01';}}
 async ready(){const net=this.net;if(!net?.room)return;try{const revision=net.room.revision;await this.getCompiled(Math.max(2,memberIds(net.room).length),net.room.stageId||'st_w_01_01');if(this.net===net&&net.room.revision===revision)await net.ready(!net.room.players[net.id]?.ready);}catch(e){this.message(e.message);}}
 async prepareRestart(r){const net=this.net,key=String(r.revision)+':'+memberIds(r).join('|');
  if(this.preparing!==key){this.preparing=key;this.message('참가 인원이 바뀌어 현재 라운드를 다시 준비합니다.');await this.getCompiled(Math.max(2,memberIds(r).length),r.stageId||'st_w_01_01');if(this.net!==net||net.room?.revision!==r.revision||!net.room?.restartPending)return;await net.ready(true);}
  if(net===this.net&&net.host&&net.room?.restartPending&&net.connectedIds().length>=2&&net.connectedIds().every(id=>net.room.players[id]?.ready))await this.start();
 }
 async room(r){if(!this.active)return;this.roster(r);const ids=memberIds(r);
  for(const [id,input] of Object.entries(r.inputs||{})){if(this.inputArrival[id]?.seq!==input.seq)this.inputArrival[id]={seq:input.seq,at:Date.now()};}
  if(r.status==='lobby'){this.runId='';this.target=null;this.panelOpen=true;this.app.pause();$('online-panel').hidden=false;this.app.showOnlineLobby();if(r.restartPending)await this.prepareRestart(r);return;}
  const p=r.snapshot;if(!p||!p.ids||!p.relays)return;
  if(this.net.host&&p.ids.slice().sort().join('|')!==ids.slice().sort().join('|')){if(!this.returning){this.returning=true;await this.net.lobby();this.returning=false;this.message('인원이 바뀌었습니다. 다시 준비해주세요.');}return;}
  // The host is authoritative over its own run. After it publishes a restart,
  // the room still delivers the superseded snapshot once; adopting it would
  // replay the lost round before the new one takes hold.
  const superseded=this.net.host&&!!this.runId&&p.runId!==this.runId&&!this.net.justBecameHost;
  if(!superseded&&(this.runId!==p.runId||!this.app.getState()||this.app.getState().players[0]?.id!==p.ids[0])){
   const c=await this.getCompiled(p.count,p.stageId||'st_w_01_01');if(!this.active||this.net.room?.snapshot?.runId!==p.runId)return;
   this.runId=p.runId;this.endStatus='';this.panelOpen=false;const s=apply(SourceStageRuntime.create(c,{ids:p.ids}),p);this.app.replaceState(s,p.ids.indexOf(this.net.id),!!p.paused);this.jumpSeen=Object.fromEntries(Object.entries(r.inputs||{}).map(([id,v])=>[id,v.jumpSeq||0]));
  }else if(this.net.justBecameHost){this.target=null;this.app.replaceState(apply(this.app.getState(),p),p.ids.indexOf(this.net.id),!!p.paused);}
  else if(!this.net.host){this.target=copy(p);if(p.status!=='play')apply(this.app.getState(),p);}
  $('online-panel').hidden=!this.panelOpen;this.app.showOnlineGame(!!p.paused,this.net.host,p.status);
 }
 async restartRound(){
  if(!this.net?.host||this.busy||this.restarting)return;
  const room=this.net.room;if(!room)return;
  if(room.status==='lobby')return this.start();
  this.restarting=true;
  try{
   const ids=this.net.connectedIds().filter(id=>room.players&&room.players[id]);
   if(ids.length<2){await this.net.lobby();this.message('인원이 부족해 대기실로 돌아갔습니다.');return;}
   const c=await this.getCompiled(ids.length,room.stageId||'st_w_01_01');
   const s=SourceStageRuntime.create(c,{ids});
   this.runId=Date.now().toString(36)+'-'+Math.random().toString(36).slice(2,7);
   this.endStatus='';this.deadAt=0;this.panelOpen=false;$('online-panel').hidden=true;this.jumpSeen={};
   this.app.replaceState(s,ids.indexOf(this.net.id),false);
   // publish keeps the room in play; net.start would require the lobby again.
   await this.net.publish(pack(s,this.runId,false));
  }catch(e){this.message(e.message);}finally{this.restarting=false;}
 }
 async start(){if(!this.net?.host||this.busy)return;this.busy=true;
  try{if(this.net.room.status!=='lobby'){await this.net.lobby();this.message('모두 준비한 뒤 다시 시작해주세요.');return;}
   const ids=memberIds(this.net.room),c=await this.getCompiled(ids.length,this.net.room.stageId||'st_w_01_01'),s=SourceStageRuntime.create(c,{ids});const run=Date.now().toString(36)+'-'+Math.random().toString(36).slice(2,7);
   await this.net.start(pack(s,run,false));
  }catch(e){this.message(e.message);$('online-panel').hidden=false;}finally{this.busy=false;}
 }
 controls(){const s=this.app.getState();return !s||s.status!=='play'||this.app.isPaused()?{}:this.app.input();}
 frame(dt,now){if(!this.active||!this.net?.room)return;const s=this.app.getState();if(this.net.room.status==='lobby'||!s)return;
  const own=this.controls(),text=JSON.stringify(own);if(text!==this.lastText||now-this.sentAt>120){this.net.input(own);this.lastText=text;this.sentAt=now;}
  if(this.net.host){
   if(!this.app.isPaused()&&s.status==='play'){
    const inputs={};for(const p of s.players){let v=this.net.inputs[p.id]||{};if(!this.net.connected(p.id)||!this.inputArrival[p.id]||Date.now()-this.inputArrival[p.id].at>1000)v={};inputs[p.id]={...v};
     // Preserve a short press even when press/release arrive between ticks.
     if((v.jumpSeq||0)>(this.jumpSeen[p.id]||0)){inputs[p.id].jump=!p.jump;if(!p.jump)this.jumpSeen[p.id]=v.jumpSeq;}
    }
    inputs[this.net.id]=own;SourceStageRuntime.step(s,inputs,dt);
   }
   this.publishTime+=dt;
   // A restart replaces the state mid-frame, so publish what the app holds now:
   // re-sending the captured lost round would push the party back through the
   // defeat it has already left.
   if(this.publishTime>=1/12&&!this.restarting&&!this.deadAt){this.publishTime=0;const current=this.app.getState();if(current)this.net.publish(pack(current,this.runId,this.app.isPaused()));}
  }else if(this.target){const previous=s.players.map(p=>({...p}));apply(s,this.target);for(const p of s.players){const old=previous.find(q=>q.id===p.id);if(old&&!p.exit&&!old.exit&&Math.hypot(p.x-old.x,p.y-old.y)<180){p.x=old.x+(p.x-old.x)*Math.min(1,dt*20);p.y=old.y+(p.y-old.y)*Math.min(1,dt*20);}}}
  if(s.status!=='play'&&this.endStatus!==s.status){this.endStatus=s.status;this.app.endOnline(s.status,this.net.host);
   // Announce the lost round exactly once, then stay quiet until the restart:
   // a repeat publish can land after the restart and replay the defeat.
   if(s.status==='dead'&&this.net.host){this.deadAt=now;this.publishTime=0;this.net.publish(pack(s,this.runId,this.app.isPaused()));}
  }
  if(this.net.host&&this.deadAt){if(s.status!=='dead')this.deadAt=0;else if(now-this.deadAt>=RESTART_DELAY_MS){this.deadAt=0;this.restartRound();}}
 }
 pause(){if(!this.net?.host){this.message('방장이 일시정지를 제어합니다.');return;}this.app.togglePause();}
 async removed(reason){await this.leave();this.message(reason==='kicked'?'방장이 내보냈습니다.':reason==='replaced'?'다른 창에서 같은 자리로 접속했습니다.':'방에서 나왔습니다.');$('online-panel').hidden=false;}
 async leave(){this.active=false;if(this.net)await this.net.leave();this.net=null;this.runId='';this.target=null;this.rosterKey='';this.endStatus='';this.preparing='';const url=new URL(location.href);url.searchParams.delete('room');history.replaceState(null,'',url);$('room-join-form').hidden=false;$('room-lobby').hidden=true;$('online-panel').hidden=true;$('connection-status').textContent='';this.app.onlineMode(false);await this.app.local();}
}
root.SourceParkOnlineController=SourceParkOnlineController;
})(window);
