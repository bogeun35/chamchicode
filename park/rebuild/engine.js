(function(root){
'use strict';
const Hazards=typeof module!=='undefined'&&module.exports?require('./hazard-geometry.js'):root.ParkHazards;
const D=typeof module!=='undefined'&&module.exports?require('./devices.js'):root.ParkDevices;
const Stage=typeof module!=='undefined'&&module.exports?require('./stage1-1.js'):root.ParkStageOne;
const DEFAULTS=Object.freeze({status:'calibration_pending',playerWidth:32,playerHeight:38,speed:230,jumpSpeed:530,gravity:1500,maxFallSpeed:950,maxSubstep:1/120,contactTolerance:0.5});
const overlap=(a,b)=>a.x<b.x+b.w&&a.x+a.w>b.x&&a.y<b.y+b.h&&a.y+a.h>b.y;
const horizontal=(a,b)=>a.x<b.x+b.w&&a.x+a.w>b.x;
function prepareMap(source,count){
 const m=JSON.parse(JSON.stringify(source));
 if(count<2||count>8)throw new Error('Player count must be 2 through 8');
 for(const k of ['width','height'])if(!Number.isFinite(m[k])||m[k]<=0)throw new Error('Invalid map '+k);
 for(const k of ['platforms','devices','switches','timers','hazards','coins','springs','movingPlatforms','crates'])m[k]??=[];
 if(!Array.isArray(m.spawns)||m.spawns.length<count)throw new Error('Not enough spawns');
 for(const spawn of m.spawns)if(!Number.isFinite(spawn.x)||!Number.isFinite(spawn.y))throw new Error('Invalid spawn');
 for(const r of [...m.platforms,...m.devices,...m.switches,...m.hazards,...m.coins,...m.springs,...m.movingPlatforms,...m.crates,m.exit,...(m.key?[m.key]:[])])if(!r||['x','y','w','h'].some(k=>!Number.isFinite(r[k]))||r.w<=0||r.h<=0)throw new Error('Invalid map rectangle');
 m.killY??=m.height+100;m.requiredCoins??=m.coins.length;m.rules??={};
 if(!Number.isInteger(m.requiredCoins)||m.requiredCoins<0||m.requiredCoins>m.coins.length)throw new Error('Invalid coin objective');
 if(m.timeLimit!==undefined&&(!Number.isFinite(m.timeLimit)||m.timeLimit<=0))throw new Error('Invalid time limit');
 const r=m.rules;
 const ids=new Set();
 for(const item of [...m.platforms,...m.devices,...m.switches,...m.timers,...m.hazards,...m.coins,...m.springs,...m.movingPlatforms,...m.crates]){if(!item.id||ids.has(item.id))throw new Error('Missing/duplicate map ID');ids.add(item.id);}
 for(const b of [...m.hazards,...m.movingPlatforms])if(b.distance!==undefined&&(!Number.isFinite(b.distance)||!Number.isFinite(b.speed)||b.speed<0||!['x','y'].includes(b.axis)))throw new Error('Invalid motion');
 for(const spring of m.springs)if(spring.power!==undefined&&(!Number.isFinite(spring.power)||spring.power<=0))throw new Error('Invalid spring power');
 for(const k of ['wind','ropeLength','speedAfterKey'])if(r[k]!==undefined&&(!Number.isFinite(r[k])||(k!=='wind'&&r[k]<=0)))throw new Error('Invalid rule '+k);
 if(r.stamina&&r.stamina.recovery!==undefined&&(!Number.isFinite(r.stamina.recovery)||r.stamina.recovery<0))throw new Error('Invalid stamina recovery');
 if(r.trafficLight&&['go','stop'].some(k=>!Number.isFinite(r.trafficLight[k])||r.trafficLight[k]<=0))throw new Error('Invalid traffic cycle');
 if(r.stamina&&(!Number.isFinite(r.stamina.max)||r.stamina.max<=0))throw new Error('Invalid stamina');
 return m;
}
function fail(s,playerId,reason){s.status='dead';s.failure={playerId,reason};s.deaths++;}
function advanceMotion(s,dt){
 for(const b of [...(s.map.movingPlatforms||[]),...s.map.hazards]){
  if(!b.distance||!b.speed)continue;
  const axis=b.axis||'x';b.origin??=b[axis];b.travel=(b.travel||0)+b.speed*dt;
  const length=Math.abs(b.distance),phase=b.travel%(2*length),offset=(phase<=length?phase:2*length-phase)*Math.sign(b.distance);
  let delta=b.origin+offset-b[axis];const riders=ridersOf(b.id,s.players);
  for(const p of riders){const trial={...p};if(axis==='x')moveX(trial,delta,s.map.platforms,s.map.width);else moveY(trial,delta,s.map.platforms);const moved=trial[axis]-p[axis];if(Math.abs(moved)<Math.abs(delta))delta=moved;}
  b[axis]+=delta;for(const p of riders)p[axis]+=delta;
 }
}
function create(ids,options={}){
 if(!Array.isArray(ids)||new Set(ids).size!==ids.length||ids.some(id=>typeof id!=='string'||!id))throw new Error('Unique player IDs required');
 const map=options.map?prepareMap(options.map,ids.length):Stage.createStage(ids.length),physics={...DEFAULTS,...map.physics,...options.physics,status:'calibration_pending'};
 for(const k of ['playerWidth','playerHeight','speed','jumpSpeed','gravity','maxFallSpeed','maxSubstep','contactTolerance'])if(!Number.isFinite(physics[k])||physics[k]<=0)throw new Error(`Invalid physics ${k}`);
 return {map,physics,players:ids.map((id,i)=>({id,kind:'player',...map.spawns[i],w:physics.playerWidth,h:physics.playerHeight,vx:0,vy:0,grounded:false,ground:false,supportId:null,jump:false,exit:false})),status:'play',keyTaken:!map.key,coinsTaken:0,stamina:map.rules?.stamina?.max??0,trafficStop:false,ticks:0,elapsed:0,deaths:0,failure:null};
}
function solids(state){return [...state.map.platforms,...(state.map.movingPlatforms||[]),...(state.map.crates||[]),...state.map.devices.filter(d=>d.kind==='lift'||(d.kind==='bridge'&&d.active)||(d.kind==='gate'&&!d.active))];}
function moveX(body,dx,obstacles,width){
 let target=Math.max(0,Math.min(width-body.w,body.x+dx));
 for(const b of obstacles){
  if(body.y>=b.y+b.h||body.y+body.h<=b.y)continue;
  if(dx>0&&body.x+body.w<=b.x+0.001&&target+body.w>b.x)target=Math.min(target,b.x-body.w);
  if(dx<0&&body.x>=b.x+b.w-0.001&&target<b.x+b.w)target=Math.max(target,b.x+b.w);
 }
 const moved=target-body.x;body.x=target;return moved;
}
function moveY(body,dy,obstacles){
 const before=body.y;let target=before+dy,support=null;
 body.grounded=false;body.ground=false;body.supportId=null;
 for(const b of obstacles){
  if(!horizontal(body,b))continue;
  if(dy>=0&&before+body.h<=b.y+0.001&&target+body.h>=b.y){
   if(b.y-body.h<=target){target=b.y-body.h;support=b;}
  }else if(dy<0&&before>=b.y+b.h-0.001&&target<b.y+b.h){target=Math.max(target,b.y+b.h);body.vy=0;}
 }
 body.y=target;
 if(support){body.grounded=true;body.ground=true;body.supportId=support.id;body.vy=0;}
 body.airborne=!body.grounded;
}
function ridersOf(id,players){
 const ids=new Set([id]);let changed=true;
 while(changed){changed=false;for(const p of players)if(!p.exit&&p.grounded&&ids.has(p.supportId)&&!ids.has(p.id)){ids.add(p.id);changed=true;}}
 return players.filter(p=>p.id!==id&&ids.has(p.id));
}
function simulate(s,inputs,dt){
 const config=s.physics,rules=s.map.rules||{};
 advanceMotion(s,dt);
 const light=rules.trafficLight;s.trafficStop=!!(light&&s.elapsed%(light.go+light.stop)>=light.go);
 const moving=s.players.filter(p=>!p.exit&&(inputs[p.id]?.left||inputs[p.id]?.right||inputs[p.id]?.jump));
 if(rules.stamina)s.stamina=Math.max(0,Math.min(rules.stamina.max,s.stamina+(moving.length?-1:rules.stamina.recovery??1)*dt));
 if(s.trafficStop&&moving.length){fail(s,null,'traffic');return;}
 if(rules.oneAtTime&&moving.length>1){fail(s,null,'one-at-time');return;}
 if(s.map.timeLimit&&s.elapsed+dt>=s.map.timeLimit){fail(s,null,'time');return;}
 for(const crate of s.map.crates||[]){crate.kind='crate';crate.vy=Math.min(config.maxFallSpeed,(crate.vy||0)+config.gravity*dt);moveY(crate,crate.vy*dt,solids(s).filter(o=>o!==crate));}
 const terrain=solids(s);
 // Lower bodies resolve first, preserving the standing-body contact model.
 const activePlayers=s.players.filter(p=>!p.exit);
 const ordered=[...activePlayers].sort((a,b)=>b.y-a.y||a.id.localeCompare(b.id));
 for(const p of ordered){
  const input=inputs[p.id]||{},edge=input.jumpSeq!==undefined?input.jumpSeq>(p.jumpSeq||0):!!input.jump&&!p.jump;
  if(input.jumpSeq!==undefined)p.jumpSeq=input.jumpSeq;
  const riders=ridersOf(p.id,s.players);
  p.jumpBlocked=!!(edge&&p.grounded&&riders.length);
  if(edge&&p.grounded&&!riders.length){p.vy=-config.jumpSpeed;p.grounded=false;p.supportId=null;}
  p.jump=!!input.jump;
  const tired=rules.stamina&&s.stamina<=0,target=((input.right?1:0)-(input.left?1:0))*config.speed*(s.keyTaken?(rules.speedAfterKey||1):1);
  p.vx=tired?0:rules.ice?p.vx+(target-p.vx)*Math.min(1,dt*2):target;
  p.vx+= (rules.wind||0);
  if(rules.flight&&input.jump&&!tired)p.vy=Math.max(-config.jumpSpeed,p.vy-config.gravity*1.7*dt);
  for(const crate of s.map.crates||[])if(p.y<crate.y+crate.h&&p.y+p.h>crate.y&&((p.vx>0&&Math.abs(p.x+p.w-crate.x)<2)||(p.vx<0&&Math.abs(p.x-crate.x-crate.w)<2))){const dx=moveX(crate,p.vx*dt,terrain.filter(o=>o!==crate).concat(activePlayers.filter(o=>o!==p)),s.map.width);for(const r of ridersOf(crate.id,s.players))r.x+=dx;}
  // A carrier and every grounded rider share the allowed horizontal offset.
  const external=[...terrain,...activePlayers.filter(other=>other!==p&&!riders.includes(other))];
  let dx=p.vx*dt;
  for(const moving of [p,...riders]){const trial={...moving};const permitted=moveX(trial,dx,external.filter(o=>o.id!==moving.id),s.map.width);if(Math.abs(permitted)<Math.abs(dx))dx=permitted;}
  p.x+=dx;for(const r of riders)r.x+=dx;
  p.vy=Math.min(config.maxFallSpeed,p.vy+config.gravity*dt);
  moveY(p,p.vy*dt,[...terrain,...activePlayers.filter(other=>other!==p)]);
  for(const spring of s.map.springs||[])if((!spring.signal||s.signals?.[spring.signal])&&p.grounded&&horizontal(p,spring)&&Math.abs(p.y+p.h-spring.y)<=8){p.vy=-(spring.power||650);p.grounded=false;p.ground=false;p.supportId=null;}
 }
 // Exited players cannot return to help. Preserve the initial all-player
 // requirement, then let the remaining team recover this stage's lift.
 // This is a recovery rule for the reconstruction, not source calibration.
 if(s.map.id==='pico1/world/01-01')for(const d of s.map.devices){
  if(d.id==='team-lift'&&d.kind==='lift')d.requiredPlayers=Math.max(1,activePlayers.length);
 }
 const devices=D.stepDevices({bodies:[...activePlayers,...(s.map.crates||[])],buttons:s.map.switches,devices:s.map.devices,timers:s.map.timers,solids:[...s.map.platforms,...(s.map.movingPlatforms||[])]},dt,{}, {contactTolerance:config.contactTolerance});
 const updated=new Map(devices.bodies.map(p=>[p.id,p]));
 s.players=s.players.map(p=>updated.get(p.id)||p);s.map.devices=devices.devices;s.map.switches=devices.buttons;s.map.timers=devices.timers;s.signals=devices.signals;
 if(s.map.crates)s.map.crates=s.map.crates.map(p=>updated.get(p.id)||p);
 for(const button of s.map.switches)if(button.pressed&&button.timeBonus&&!button.bonusUsed&&s.map.timeLimit){s.map.timeLimit+=button.timeBonus;button.bonusUsed=true;}
 for(const p of s.players.filter(p=>!p.exit)){
  p.ground=p.grounded;
  if(p.y>s.map.killY||s.map.hazards.some(h=>Hazards.hit(p,h))){s.status='dead';s.failure={playerId:p.id,reason:p.y>s.map.killY?'fall':'hazard'};s.deaths++;return;}
  for(const coin of s.map.coins||[])if(!coin.taken&&overlap(p,coin)){coin.taken=true;s.coinsTaken++;}
  if(!s.keyTaken&&s.map.key&&overlap(p,s.map.key)){s.keyTaken=true;s.map.key.taken=true;}
 }
 if(rules.noContact)for(let i=0;i<s.players.length;i++)for(let j=i+1;j<s.players.length;j++){const a=s.players[i],b=s.players[j];if(!a.exit&&!b.exit&&overlap({...a,x:a.x-0.1,y:a.y-0.1,w:a.w+0.2,h:a.h+0.2},b)){fail(s,a.id,'contact');return;}}
 if(rules.ropeLength)for(let pass=0;pass<4;pass++)for(let i=1;i<s.players.length;i++){
  const a=s.players[i-1],b=s.players[i];if(a.exit||b.exit)continue;
  const dx=b.x-a.x,dy=b.y-a.y,d=Math.hypot(dx,dy);if(d<=rules.ropeLength)continue;
  const excess=(d-rules.ropeLength)/2;
  for(const [p,sign] of [[a,1],[b,-1]]){const obstacles=solids(s).concat(s.players.filter(other=>other!==p&&!other.exit));moveX(p,sign*dx/d*excess,obstacles,s.map.width);moveY(p,sign*dy/d*excess,obstacles);p.vx*=0.8;}
 }
 for(const p of s.players)if(!p.exit&&s.keyTaken&&s.coinsTaken>=(s.map.requiredCoins||0)&&overlap(p,s.map.exit)){p.exit=true;p.vx=0;p.vy=0;p.grounded=false;p.supportId=null;}
 if(s.players.every(p=>p.exit))s.status='clear';
}
function step(state,inputs={},dt=1/60){
 if(!Number.isFinite(dt)||dt<0||dt>10)throw new Error('dt must be between 0 and 10 simulation seconds');
 if(state.status!=='play')return state;
 let remaining=dt;
 while(remaining>1e-10&&state.status==='play'){
  const h=Math.min(remaining,state.physics.maxSubstep);simulate(state,inputs,h);state.ticks++;state.elapsed+=h;remaining-=h;
 }
 return state;
}
const api={create,step,overlap,DEFAULTS,solids};if(typeof module!=='undefined'&&module.exports)module.exports=api;root.ParkRebuild=api;
})(typeof window!=='undefined'?window:globalThis);
