/* Source-derived gate and switch observer, with explicit browser contact solver. */
(function(root,factory){const api=factory();if(typeof module==='object'&&module.exports)module.exports=api;root.SourceGateDevices=api;})(typeof globalThis!=='undefined'?globalThis:this,function(){
'use strict';
const overlap=(a,b)=>a.x<b.x+b.w&&a.x+a.w>b.x&&a.y<b.y+b.h&&a.y+a.h>b.y;
const clone=v=>JSON.parse(JSON.stringify(v));
const allowed=(v,c)=>!v||v<0&&c<=-v||v>0&&v<10&&c>=v||v>=10&&c>=Math.trunc(v/10)&&c<=v%10;
const normalize=(a,i)=>{const p=a.properties||a,pos=a.position||{x:a.x??a.posX,y:a.y??a.posY};return {...p,id:a.id||'source:a'+i,x:pos.x,y:pos.y,datas:a.datas||a.parameters||[]};};
function compile(actors,count){
 const rows=actors.map(normalize).filter(a=>allowed(a.playerCount,count)),gates=[],observers=[],keys=[],warnings=[];
 for(const a of rows){const n=i=>a.datas[i]?.t===1?a.datas[i].f:0,str=i=>a.datas[i]?.t===2?a.datas[i].s||'':'';
  if(a.typeName==='Gate'){
   const segments=Math.floor(n(0)),unit=Math.floor(n(3))||32,dx=n(1),dy=n(2);
   if(segments<1||unit<1||(!dx&&!dy)||(dx&&dy))throw Error('Only axis-aligned source Gate parameters verified');
   const horizontal=!!dx,sign=Math.sign(horizontal?dx:dy),length=segments*unit;
   const init={x:a.x+(horizontal&&sign<0?-(segments-1)*unit:0),y:a.y+(!horizontal&&sign<0?-(segments-1)*unit:0),w:horizontal?length:unit,h:horizontal?unit:length};
   const target={x:a.x,y:a.y,w:unit,h:unit};
   gates.push({id:a.id,name:a.name,type:'Gate',...init,init,target,phase:0,blocked:false});
  }else if(a.typeName==='SwitchObserver'){
   const nameFilter=str(1),switchNames=rows.filter(r=>r.typeName==='Switch'&&(!nameFilter||(r.name||'').startsWith(nameFilter))).map(r=>r.name);
   observers.push({id:a.id,name:a.name,type:'SwitchObserver',target:str(0),nameFilter,switchNames,pushedCount:0,total:switchNames.length,allOn:false,display:{x:n(2),y:n(3)+416,scale:Math.abs(n(4))<4/65536?10:n(4)*10},playCompleteSound:n(5)===1});
  }else if(a.typeName==='Key')keys.push({name:a.name||'',active:!(n(2)>0),taken:false});
 }
 return {schemaVersion:1,count,gates,observers,keys,warnings,completePhysicsFidelity:false};
}
function create(compiled){return clone(compiled);}
function solids(state){return state.gates;}
function signal(state,event){
 const type=event.eventType??event.event??(event.on===true?61:event.on===false?60:null),name=event.targetName??event.target;
 if(type!==60&&type!==61)return false;let found=false;
 for(const g of state.gates)if(g.name===name||g.id===event.targetId){
  if(type===61&&(g.phase===0||g.phase===2))g.phase=1;
  if(type===60&&(g.phase===1||g.phase===3))g.phase=2;
  found=true;
 }
 for(const k of state.keys)if(k.name===name&&!k.taken){k.active=type===61;found=true;}
 return found;
}
function moveTowards(value,target,amount){return value<target?Math.min(value+amount,target):Math.max(value-amount,target);}
function beforeStep(state,{dt=1/60,nativeTickRate=60,players=[],platforms=[]}={}){
 if(!Number.isFinite(dt)||dt<0)throw Error('Invalid gate delta');
 for(const g of state.gates){g.blocked=false;if(g.phase!==1&&g.phase!==2)continue;
  const target=g.phase===1?g.target:g.init,amount=(g.phase===1?2:1)*dt*nativeTickRate;
  const next={x:moveTowards(g.x,target.x,amount),y:moveTowards(g.y,target.y,amount),w:moveTowards(g.w,target.w,amount),h:moveTowards(g.h,target.h,amount)};
  // Native OnPushedBack sets rollback flag; OnUpdate restores previous size/pos.
  // Browser collision ordering is simplified: reject newly overlapping expansion.
  const obstruction=[...players.filter(p=>!p.exit&&!p.dead),...platforms].some(p=>overlap(next,p)&&!overlap(g,p));
  if(obstruction){g.blocked=true;continue;}
  const oldY=g.y;Object.assign(g,next);
  for(const p of players)if(p.supportId===g.id)p.y+=g.y-oldY;
  if(['x','y','w','h'].every(k=>g[k]===target[k]))g.phase=g.phase===1?3:0;
 }
 return {solids:state.gates};
}
function afterStep(state,{relayState={relays:[]},events=[],keyTaken=false}={}){
 for(const k of state.keys)if(keyTaken)k.taken=true;
 for(const e of events)signal(state,e);
 const outgoing=[];
 for(const observer of state.observers){
  const relays=relayState.relays.filter(r=>observer.switchNames.includes(r.name));
  observer.pushedCount=relays.filter(r=>r.pressed).length;
  const all=observer.total>0&&observer.pushedCount>=observer.total;
  if(all!==observer.allOn){observer.allOn=all;const e={targetName:observer.target,eventType:all?61:60,on:all,senderId:observer.id};outgoing.push(e);signal(state,e);}
 }
 return {events:outgoing,keyActive:state.keys.every(k=>k.active||k.taken)};
}
return {compile,create,solids,signal,beforeStep,afterStep,supportedTypes:['Gate','SwitchObserver'],completePhysicsFidelity:false};
});

