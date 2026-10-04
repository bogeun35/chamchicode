(function(root){
'use strict';
const D=typeof module!=='undefined'&&module.exports?require('./devices.js'):root.ParkDevices;
const Stage=typeof module!=='undefined'&&module.exports?require('./stage1-1.js'):root.ParkStageOne;
const DEFAULTS=Object.freeze({status:'calibration_pending',playerWidth:32,playerHeight:38,speed:230,jumpSpeed:530,gravity:1500,maxFallSpeed:950,maxSubstep:1/120,contactTolerance:0.5});
const overlap=(a,b)=>a.x<b.x+b.w&&a.x+a.w>b.x&&a.y<b.y+b.h&&a.y+a.h>b.y;
const horizontal=(a,b)=>a.x<b.x+b.w&&a.x+a.w>b.x;
function create(ids,options={}){
 if(!Array.isArray(ids)||new Set(ids).size!==ids.length||ids.some(id=>typeof id!=='string'||!id))throw new Error('Unique player IDs required');
 const map=Stage.createStage(ids.length),physics={...DEFAULTS,...options.physics,status:'calibration_pending'};
 for(const k of ['playerWidth','playerHeight','speed','jumpSpeed','gravity','maxFallSpeed','maxSubstep','contactTolerance'])if(!Number.isFinite(physics[k])||physics[k]<=0)throw new Error(`Invalid physics ${k}`);
 return {map,physics,players:ids.map((id,i)=>({id,kind:'player',...map.spawns[i],w:physics.playerWidth,h:physics.playerHeight,vx:0,vy:0,grounded:false,ground:false,supportId:null,jump:false,exit:false})),status:'play',keyTaken:false,ticks:0,elapsed:0,deaths:0,failure:null};
}
function solids(state){return [...state.map.platforms,...state.map.devices.filter(d=>d.kind==='lift'||(d.kind==='bridge'&&d.active)||(d.kind==='gate'&&!d.active))];}
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
 const config=s.physics, terrain=solids(s);
 // Lower bodies resolve first, preserving the standing-body contact model.
 const activePlayers=s.players.filter(p=>!p.exit);
 const ordered=[...activePlayers].sort((a,b)=>b.y-a.y||a.id.localeCompare(b.id));
 for(const p of ordered){
  const input=inputs[p.id]||{},edge=input.jumpSeq!==undefined?input.jumpSeq>(p.jumpSeq||0):!!input.jump&&!p.jump;
  if(input.jumpSeq!==undefined)p.jumpSeq=input.jumpSeq;
  const riders=ridersOf(p.id,s.players);
  p.jumpBlocked=!!(edge&&p.grounded&&riders.length);
  if(edge&&p.grounded&&!riders.length){p.vy=-config.jumpSpeed;p.grounded=false;p.supportId=null;}
  p.jump=!!input.jump;p.vx=((input.right?1:0)-(input.left?1:0))*config.speed;
  // A carrier and every grounded rider share the allowed horizontal offset.
  const external=[...terrain,...activePlayers.filter(other=>other!==p&&!riders.includes(other))];
  let dx=p.vx*dt;
  for(const moving of [p,...riders]){const trial={...moving};const permitted=moveX(trial,dx,external.filter(o=>o.id!==moving.id),s.map.width);if(Math.abs(permitted)<Math.abs(dx))dx=permitted;}
  p.x+=dx;for(const r of riders)r.x+=dx;
  p.vy=Math.min(config.maxFallSpeed,p.vy+config.gravity*dt);
  moveY(p,p.vy*dt,[...terrain,...activePlayers.filter(other=>other!==p)]);
 }
 const devices=D.stepDevices({bodies:activePlayers,buttons:s.map.switches,devices:s.map.devices,timers:s.map.timers,solids:s.map.platforms},dt,{}, {contactTolerance:config.contactTolerance});
 const updated=new Map(devices.bodies.map(p=>[p.id,p]));
 s.players=s.players.map(p=>updated.get(p.id)||p);s.map.devices=devices.devices;s.map.switches=devices.buttons;s.map.timers=devices.timers;s.signals=devices.signals;
 for(const p of s.players.filter(p=>!p.exit)){
  p.ground=p.grounded;
  if(p.y>s.map.killY||s.map.hazards.some(h=>overlap(p,h))){s.status='dead';s.failure={playerId:p.id,reason:p.y>s.map.killY?'fall':'hazard'};s.deaths++;return;}
  if(!s.keyTaken&&overlap(p,s.map.key)){s.keyTaken=true;s.map.key.taken=true;}
 }
 for(const p of s.players)if(!p.exit&&s.keyTaken&&overlap(p,s.map.exit)){p.exit=true;p.vx=0;p.vy=0;p.grounded=false;p.supportId=null;}
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
