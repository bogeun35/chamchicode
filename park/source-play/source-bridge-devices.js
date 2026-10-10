/* Native-derived PP2 Bridge and Thunder subset. AABB contact is a browser approximation. */
(function(root,factory){const api=factory();if(typeof module==='object'&&module.exports)module.exports=api;root.SourceBridgeDevices=api;})(typeof globalThis!=='undefined'?globalThis:this,function(){
'use strict';
// ThunderComponent..cctor 0x18172d260: SPEED = QFP._4 = 4, so the fade spans 0.25s.
const THUNDER_FADE_SPEED=4;
const overlap=(a,b)=>a.x<b.x+b.w&&a.x+a.w>b.x&&a.y<b.y+b.h&&a.y+a.h>b.y;
const allowed=(v,c)=>!v||v<0&&c<=-v||v>0&&v<10&&c>=v||v>=10&&c>=Math.trunc(v/10)&&c<=v%10;
const toward=(a,b,n)=>a<b?Math.min(b,a+n):Math.max(b,a-n);
function compile(actors,count){const bridges=[],thunders=[],keyTargets=[],warnings=[];
 actors.forEach((raw,i)=>{const a=raw.properties||raw,pos=raw.position||{x:raw.x??raw.posX,y:raw.y??raw.posY},data=raw.datas||raw.parameters||[],n=i=>data[i]?.t===1?data[i].f:0,s=i=>data[i]?.t===2?data[i].s||'':'';
 if(!allowed(a.playerCount,count))return;
 const common={id:raw.id||'source:a'+i,name:a.name||'',type:a.typeName,x:pos.x,y:pos.y};
 if(a.typeName==='Bridge'){
 const unit=Math.floor(n(3))||32,segments=Math.floor(n(0)),horizontal=!!n(1),sign=Math.sign(n(1)||n(2));
 if(segments<1||unit<1||!sign||(n(1)&&n(2))||n(4)!==0||n(5)!==0)throw Error('Unverified Bridge geometry/count scaling/push mode');
 const init={x:pos.x,y:pos.y,w:unit,h:unit},target={...init};
 target[horizontal?'w':'h']=unit*segments;if(sign<0)target[horizontal?'x':'y']-=(segments-1)*unit;
 bridges.push({...common,...init,init,target,phase:0,keyEnabled:n(6)>0,blocked:false});
 }else if(a.typeName==='Thunder'){
 // ThunderComponent.m_Flags bit0 (0x18172c812): the move round trip. No Thunder
 // in the shipped stages sets it, so it stays rejected rather than guessed.
 if(n(7)!==0)throw Error('Thunder move repetition not verified');
 // m_DisappearTime (0x18172c826) is only stored above the FP non-zero epsilon
 // of 4/65536, which OnUpdate 0x18172c9c2 also tests before ageing the timer.
 const disappearTime=Math.abs(n(8))>=4/65536?n(8):0;
 const vx=n(4),vy=n(5),distance=n(6),moving=(vx||vy)&&distance>0;
 thunders.push({...common,direction:Math.max(0,Math.min(3,Math.trunc(n(0)))),through:n(1)>0,bodyEnabled:n(2)>0,switchType:moving?Math.trunc(n(3)):0,vx:moving?vx:0,vy:moving?vy:0,distance:moving?distance:0,traveled:0,phase:moving&&!(Math.trunc(n(3))&1)?1:0,lastPhase:0,disappearTime,disappearTimer:0,lethal:true,alpha:1});
 }else if(a.typeName==='Key'&&s(3))keyTargets.push(s(3));
 });return {schemaVersion:1,count,bridges,thunders,keyTargets,keyTaken:false,warnings,completePhysicsFidelity:false};}
const create=c=>JSON.parse(JSON.stringify(c));
function signal(state,e){const name=e.targetName??e.target,type=e.eventType??e.event??(e.on?61:60);let found=false;
 for(const b of state.bridges)if(b.name===name||b.id===e.targetId){if(type===61&&(b.phase===0||b.phase===2))b.phase=1;if(type===60&&(b.phase===1||b.phase===3))b.phase=2;found=true;}
 for(const t of state.thunders)if((t.name===name||t.id===e.targetId)&&t.phase<4){if(type===61){if(!t.phase&&(t.switchType&1)){t.phase=t.lastPhase||1;t.lastPhase=0;}else if(t.phase>=1&&t.phase<=3&&(t.switchType&2)){t.lastPhase=t.phase;t.phase=0;}}found=true;}return found;}
function solids(state){return [...state.bridges,...state.thunders.filter(t=>t.bodyEnabled).map(t=>({id:t.id+':body',type:'ThunderBody',x:t.x-16,y:t.y-16,w:32,h:32}))];}
function beforeStep(state,{dt=1/60,nativeTickRate=60,players=[],platforms=[],keyTaken=false,events=[]}={}){
 if(!Number.isFinite(dt)||dt<0)throw Error('Invalid device delta');for(const e of events)signal(state,e);
 const outgoing=[];if(keyTaken&&!state.keyTaken){state.keyTaken=true;for(const targetName of state.keyTargets){const e={targetName,eventType:61};outgoing.push(e);signal(state,e);}for(const b of state.bridges)if(b.keyEnabled){signal(state,{targetName:b.name,eventType:61});b.keyEnabled=false;}}
 for(const b of state.bridges){b.blocked=false;if(b.phase!==1&&b.phase!==2)continue;const target=b.phase===1?b.target:b.init,amount=(b.phase===1?1:.5)*dt*nativeTickRate,next={};for(const k of ['x','y','w','h'])next[k]=toward(b[k],target[k],amount);
 if([...players.filter(p=>!p.exit&&!p.dead),...platforms].some(p=>overlap(next,p)&&!overlap(b,p))){b.blocked=true;continue;}
 const dy=next.y-b.y;Object.assign(b,next);for(const p of players)if(p.supportId===b.id)p.y+=dy;if(['x','y','w','h'].every(k=>b[k]===target[k]))b.phase=b.phase===1?3:0;}
 for(const t of state.thunders){t.previousX=t.x;t.previousY=t.y;
  // OnUpdate 0x18172c9c2 ages m_DisappearTimer while m_Phase < 4 and moves the
  // phase to 4 on reaching m_DisappearTime. Handler 0x18172cd0c then calls
  // SetCollisionActive(false) at once - the beam stops killing immediately -
  // sets m_Timer = WAIT_TIME (QFP._1 = 1) and advances to phase 5.
  if(t.disappearTime>0&&t.phase<4){t.disappearTimer+=dt;
   if(t.disappearTimer>=t.disappearTime){t.phase=5;t.lethal=false;t.alpha=1;}}
  // Handler 0x18172cf41: m_Timer -= DeltaTime * SPEED (QFP._4 = 4) and
  // m_Alpha = m_Timer, so the sprite fades over a quarter second, after which
  // ActorComponent.m_Flags bit 13 ends the actor.
  else if(t.phase===5){t.alpha-=dt*THUNDER_FADE_SPEED;
   if(t.alpha<=0){t.alpha=0;t.phase=6;}}
  if(t.phase>=4)continue;
  if(t.phase===1){t.traveled=0;t.phase=2;}if(t.phase!==2)continue;const speed=Math.hypot(t.vx,t.vy),step=Math.min(t.distance-t.traveled,speed*dt*nativeTickRate);if(speed){t.x+=t.vx/speed*step;t.y+=t.vy/speed*step;t.traveled+=step;}if(t.traveled>=t.distance-1e-9)t.phase=0;}
 return {events:outgoing,solids:solids(state)};
}
function hazards(state,{platforms=[],width=2400,height=2400}={}){
 return state.thunders.map(t=>{const horizontal=t.direction>=2,negative=t.direction===0||t.direction===2,origin=horizontal?t.x:t.y,cross=horizontal?t.y:t.x;let length=Math.max(0,Math.min(2400,negative?origin:(horizontal?width:height)-origin));
 if(!t.through)for(const p of [...platforms,...state.bridges]){const edge=horizontal?p.x:p.y,size=horizontal?p.w:p.h,perp=horizontal?p.y:p.x,psize=horizontal?p.h:p.w;if(cross+16<=perp||cross-16>=perp+psize)continue;const d=negative?origin-edge-size:edge-origin;if(d>=0)length=Math.min(length,d);else if(origin>edge&&origin<edge+size)length=0;}
 return {id:t.id+':beam',sourceId:t.id,type:'Thunder',direction:t.direction,lethal:t.lethal!==false,alpha:t.alpha??1,x:horizontal?(negative?t.x-length:t.x):t.x-2,y:horizontal?t.y-2:(negative?t.y-length:t.y),w:horizontal?length:4,h:horizontal?4:length};});
}
function afterStep(state,options={}){for(const e of options.events||[])signal(state,e);const beams=hazards(state,options),deadPlayerIds=(options.players||[]).filter(p=>!p.exit&&!p.dead&&beams.some(b=>b.lethal!==false&&b.w>0&&b.h>0&&overlap(p,b))).map(p=>p.id);return {events:[],deadPlayerIds,hazards:beams};}
return {compile,create,signal,solids,hazards,beforeStep,afterStep,supportedTypes:['Bridge','Thunder'],completePhysicsFidelity:false};
});
