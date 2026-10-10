/* Interpreted original world01-01. No native code, source assets or file IO. */
(function(root,factory){
 const common=typeof module==='object'&&module.exports;
 const api=factory(common?require('./terrain-runtime.js'):root.SourceTerrainRuntime,
  common?require('./actor-runtime.js'):root.SourceActorRuntime,
  common?require('./spring-switch-runtime.js'):root.SourceSpringSwitch,
  common?require('./source-devices-runtime.js'):root.SourceDevicesRuntime,
  common?require('./source-motion-devices.js'):root.SourceMotionDevices,
  common?require('./source-gate-devices.js'):root.SourceGateDevices,
  common?require('./source-bridge-devices.js'):root.SourceBridgeDevices);
 if(common)module.exports=api;root.SourceStageRuntime=api;
})(typeof globalThis!=='undefined'?globalThis:this,function(Terrain,Actor,Relay,Devices,Motion,Gates,Bridges){
 'use strict';
 const clone=x=>JSON.parse(JSON.stringify(x));
 const overlap=(a,b)=>a.x<b.x+b.w&&a.x+a.w>b.x&&a.y<b.y+b.h&&a.y+a.h>b.y;
 const horizontal=(a,b)=>a.x<b.x+b.w&&a.x+a.w>b.x;
 const box=r=>({x:r.x,y:r.y,w:r.width,h:r.height});
 const NATIVE=Object.freeze({walk:3,jump:-334234/65536,gravity:42598/65536,terminal:19.5,holdFactor:13107/65536,holdFrames:14});
 function compile({source,geometry,count,stageId='st_w_01_01',nativeTickRate=60}={}){
  if(!['st_w_01_01','st_w_01_02','st_w_01_03','st_w_01_04','st_w_04_01'].includes(stageId))throw new Error('Source stage runtime does not support this stage yet');
  if(!Number.isFinite(nativeTickRate)||nativeTickRate<1||nativeTickRate>240)throw new Error('Invalid calibration tick rate');
  const t=Terrain.createTerrain({source,geometry,count,stageId});
  const relays=Relay.create(t.actors,count);
  const devices=Devices.compile(t.actors,count);
  const motion=Motion.compile(t.actors,count);
  const gates=Gates.compile(t.actors,count);
  const bridges=Bridges.compile(t.actors,count);
  const springs=relays.relays.filter(r=>r.type==='JumpStand').map(r=>({...r,x:r.x-16,y:r.y-(r.parent?38:34),w:32,h:r.parent?38:34}));
  const switches=relays.relays.filter(r=>r.type==='Switch'||r.type==='DelaySwitch').map(r=>({...r,x:r.x-9,y:r.y-9,w:18,h:9}));
  const goal=t.actors.find(a=>a.typeName==='Goal'),key=t.actors.find(a=>a.typeName==='Key');
  if(!goal)throw new Error('Original stage Goal is missing');
  // WarpComponent.ParseParameter 0x181734390 + OnCollided 0x181734a00:
  // slots width,height,destX,destY,ordinalOffsetX,ordinalOffsetY. Event63
  // ActorComponent handler/warpProc resets velocity and collision contacts.
  const warps=t.actors.filter(a=>a.typeName==='Warp').map((a,i)=>{
   const n=j=>a.datas[j]?.t===1?a.datas[j].f:0;
   if(n(0)<=0||n(1)<=0)throw new Error('Unsupported Warp dimensions');
   return {id:'warp:'+i,type:'Warp',x:a.x,y:a.y,w:n(0),h:n(1),
    destination:{x:n(2),y:n(3)},ordinalOffset:{x:n(4),y:n(5)},counter:0};
  });
  const supported=new Set(['Player','Key','Goal','Warp','MapRect','TopViewMapRect','JumpStand','JumpStandMediator','Switch','DelaySwitch','Rect','DashBoard','FallingWall',...Devices.supportedTypes,...Gates.supportedTypes,...Bridges.supportedTypes]);
  const unsupported=[...new Set(t.actors.filter(a=>!supported.has(a.typeName)).map(a=>a.typeName))];
  const missingMechanics=['Native tick frequency (60 Hz explicit prototype calibration)',
   'Native collision pushback and update ordering equivalence',
   'Key attach, transfer and goal-opening state machine (overlap pickup used)'];
  for(const type of unsupported)missingMechanics.push(type+' handler ('+t.actors.filter(a=>a.typeName===type).length+' source actor)');
  missingMechanics.push(...devices.warnings);
  if(unsupported.length||devices.warnings.length)throw Error('Unsupported source devices: '+[...unsupported,...devices.warnings].join(', '));
  if(t.cells.some(c=>(c.flags&~1)!==0))missingMechanics.push('Dynamic tile attributes');
  const map={id:stageId,count,width:t.width,height:t.height,tileSize:t.tileSize,variant:t.variant,
   platforms:t.platforms.map((p,i)=>({...p,id:'terrain:'+i})),springs,switches,warps,
   spawns:Actor.playerSpawns(t.actors,count).map(p=>({x:p.collision.x,y:p.collision.y-0.5})),
   key:key?{...box(Actor.collisionRect(key)),id:'key'}:null,
   exit:{...box(Actor.collisionRect(goal)),id:'goal'},killY:t.height,
   devices:[],coins:[],hazards:[],timers:[],movingPlatforms:[],crates:[],requiredCoins:0,
   physics:{playerWidth:32,playerHeight:46,nativeTickRate,status:'calibration_pending'},
   unsupportedActors:t.actors.filter(a=>!supported.has(a.typeName)).map(a=>({type:a.typeName,x:a.x,y:a.y})),
   coordinateSystem:'Y-down'};
  return {schemaVersion:1,count,map,relays,devices,motion,gates,bridges,status:{state:'calibration_pending',missingMechanics,
   unsupportedActorTypes:unsupported,sourceStage:stageId,sourceY:'down',completePhysicsFidelity:false}};
 }
 function create(compiled,options={}){
  if(!compiled||compiled.schemaVersion!==1)throw new Error('Compiled source stage required');
  const map=clone(compiled.map),count=compiled.count,ids=options.ids||Array.from({length:count},(_,i)=>'p'+(i+1));
  if(ids.length!==count||new Set(ids).size!==count||ids.some(id=>typeof id!=='string'||!id))throw new Error('Unique IDs must match player count');
  return {map,players:ids.map((id,i)=>({id,...map.spawns[i],w:32,h:46,vx:0,vy:0,grounded:false,ground:false,
   supportId:null,jump:false,jumpFrame:0,exit:false,visible:true,playerState:1})),
   relayState:clone(compiled.relays),deviceState:Devices.create(compiled.devices||{schemaVersion:1,count,devices:[],warnings:[]}),motionState:Motion.create(compiled.motion||{count,rects:[],dashBoards:[],walls:[]}),gateState:Gates.create(compiled.gates||{count,gates:[],observers:[],keys:[]}),bridgeState:Bridges.create(compiled.bridges||{count,bridges:[],thunders:[],keyTargets:[],keyTaken:false}),keyActive:!compiled.gates||compiled.gates.keys.every(k=>k.active),sourceStatus:clone(compiled.status),physics:clone(map.physics),
   status:'play',elapsed:0,ticks:0,accumulator:0,keyTaken:!map.key,coinsTaken:0,deaths:0,failure:null,
   lastRelayEvents:[],lastImpulses:[],lastContacts:{switchContacts:[],springContacts:[]}};
 }
 function active(s){return s.players.filter(p=>!p.exit);}
 // Switch.InitCollision 0x18171484c creates type0/attribute5 sensors, not type2 solids.
 function baseSolids(s){return [...s.map.platforms,...s.map.springs.filter(b=>s.relayState.relays.find(r=>r.id===b.id)?.visible),...Motion.solids(s.motionState),...Gates.solids(s.gateState),...Bridges.solids(s.bridgeState)];}
 function solids(s){return [...baseSolids(s),...Devices.solids(s.deviceState)];}
 function ridersOf(p,players){
  const ids=new Set([p.id]);let added=true;
  while(added){added=false;for(const q of players)if(q.grounded&&ids.has(q.supportId)&&!ids.has(q.id)){ids.add(q.id);added=true;}}
  return players.filter(q=>q!==p&&ids.has(q.id));
 }
 function moveX(p,dx,obstacles,width){
  let target=Math.max(0,Math.min(width-p.w,p.x+dx));
  for(const b of obstacles){
   if(p.y>=b.y+b.h||p.y+p.h<=b.y)continue;
   if(dx>0&&p.x+p.w<=b.x+0.001&&target+p.w>b.x)target=Math.min(target,b.x-p.w);
   if(dx<0&&p.x>=b.x+b.w-0.001&&target<b.x+b.w)target=Math.max(target,b.x+b.w);
  }
  const moved=target-p.x;p.x=target;return moved;
 }
 function moveY(p,dy,obstacles){
  const before=p.y;let target=before+dy,support=null;
  p.grounded=false;p.ground=false;p.supportId=null;
  for(const b of obstacles){
   if(!horizontal(p,b))continue;
   if(dy>=0&&before+p.h<=b.y+0.001&&target+p.h>=b.y){
    if(b.y-p.h<=target){
     // Equal-height teammates must not change the carrier when actor array
     // order changes. Prefer the widest contact, then a stable actor ID.
     const contact=Math.min(p.x+p.w,b.x+b.w)-Math.max(p.x,b.x);
     const previous=support?Math.min(p.x+p.w,support.x+support.w)-Math.max(p.x,support.x):-1;
     if(b.y-p.h<target-1e-9||!support||contact>previous+1e-9||Math.abs(contact-previous)<=1e-9&&String(b.id)<String(support.id)){
      target=b.y-p.h;support=b;
     }
    }
   }else if(dy<0&&before>=b.y+b.h-0.001&&target<b.y+b.h){target=Math.max(target,b.y+b.h);p.vy=0;p.jumpFrame=0;}
  }
  p.y=target;
  if(support){p.grounded=true;p.ground=true;p.supportId=support.id;p.vy=0;}
 }
 function tick(s,inputs,h){
  const hz=s.physics.nativeTickRate,players=active(s);
  Bridges.beforeStep(s.bridgeState,{players,platforms:s.map.platforms,keyTaken:s.keyTaken,dt:h,nativeTickRate:hz});
  Gates.beforeStep(s.gateState,{players,platforms:s.map.platforms,dt:h,nativeTickRate:hz});
  const oldMotion=Motion.solids(s.motionState);Motion.step(s.motionState,h);
  const movingSolids=Motion.solids(s.motionState);
  for(const p of players){
   const carrier=movingSolids.find(b=>b.id===p.supportId),old=oldMotion.find(b=>b.id===p.supportId);
   if(carrier&&old){p.x+=carrier.x-old.x;p.y+=carrier.y-old.y;}
   for(const b of movingSolids){const previous=oldMotion.find(old=>old.id===b.id);if(!previous||!overlap(p,b)||previous.x===b.x&&previous.y===b.y)continue;
    if(b.x>previous.x)p.x=b.x+b.w;else if(b.x<previous.x)p.x=b.x-p.w;else if(b.y<previous.y)p.y=b.y-p.h;else p.y=b.y+b.h;
   }
  }
  Devices.beforeStep(s.deviceState,{players,inputs,platforms:baseSolids(s),dt:h,nativeTickRate:hz,width:s.map.width});
  const terrain=solids(s);
  for(const p of [...players].sort((a,b)=>b.y-a.y||a.id.localeCompare(b.id))){
   const input=inputs[p.id]||{},held=!!input.jump,edge=held&&!p.jump,riders=ridersOf(p,players);
   p.jumpBlocked=!!(edge&&p.grounded&&riders.length);
   const started=edge&&p.grounded&&!riders.length;
   if(started){p.vy=NATIVE.jump*hz;p.jumpFrame=1;p.grounded=false;p.supportId=null;}
   // Native dec(frame)<=12 accepts frames1..13; frame0 cannot restart an
   // airborne jump after release. The initial jump is its own update.
   if(!started&&held&&p.jumpFrame>0&&p.jumpFrame<NATIVE.holdFrames){
    p.vy+=NATIVE.jump*NATIVE.holdFactor*(1-p.jumpFrame/NATIVE.holdFrames)*hz;p.jumpFrame++;
   }else if(!started)p.jumpFrame=0;
   if(p.grounded)p.forcedVx=0;
   p.jump=held;p.vx=p.forcedVx||((input.right?1:0)-(input.left?1:0))*NATIVE.walk*hz;
   // Keep a grounded stack together, limited by every rider's available space.
   const obstacles=terrain.concat(players.filter(q=>q!==p&&!riders.includes(q)));let dx=p.vx*h;
   for(const q of [p,...riders]){const trial={...q},allowed=moveX(trial,dx,obstacles.filter(b=>b.id!==q.id),s.map.width);if(Math.abs(allowed)<Math.abs(dx))dx=allowed;}
   p.x+=dx;for(const q of riders)q.x+=dx;
   const wall=terrain.find(b=>b.wallId&&horizontal({x:p.x-0.01,y:p.y,w:p.w+0.02,h:p.h},b)&&p.y<b.y+b.h&&p.y+p.h>b.y&&Math.abs(dx-p.vx*h)>.001);
   if(wall){const contact=Motion.contactWall(s.motionState,wall.wallId,{vx:p.vx/hz,vy:p.vy/hz,face:p.vx>0?'left':'right'});if(contact.impulse){p.vx=contact.impulse.vx*hz;p.forcedVx=p.vx;p.vy=contact.impulse.vy*hz;p.grounded=false;p.supportId=null;p.jumpFrame=0;}}
   p.vy=Math.min(NATIVE.terminal*hz,p.vy+NATIVE.gravity*hz);
   moveY(p,p.vy*h,terrain.concat(players.filter(q=>q!==p)));
   const top=terrain.find(b=>b.wallId&&b.id===p.supportId);
   if(top){const contact=Motion.contactWall(s.motionState,top.wallId,{vx:p.vx/hz,vy:p.vy/hz,face:'top',playerCenterX:p.x+p.w/2,blockCenterX:top.x+top.w/2});if(contact.impulse){p.forcedVx=contact.impulse.vx*hz;p.vx=p.forcedVx;p.vy=contact.impulse.vy*hz;p.grounded=false;p.supportId=null;}}
   const board=s.motionState.dashBoards.find(b=>overlap(p,b));
   if(board&&p.lastDashBoardId!==board.id){const impulse=Motion.triggerDash(board);p.forcedVx=impulse.vx*hz;p.vx=p.forcedVx;p.vy=impulse.vy*hz;p.grounded=false;p.supportId=null;p.jumpFrame=0;}
   p.lastDashBoardId=board?.id||null;
  }
  const facts={switchContacts:[],springContacts:[]};
  for(const p of players){
   const upContactCount=players.filter(q=>q!==p&&q.grounded&&q.supportId===p.id).length;
   for(const spring of s.map.springs)if(p.grounded&&horizontal(p,spring)&&Math.abs(p.y+p.h-spring.y)<0.01){
    facts.springContacts.push({relayId:spring.id,actorId:p.id,layer:1,upContactCount,velocityX:p.vx/hz});
   }
   for(const button of s.map.switches)if(p.grounded&&horizontal(p,button)&&p.y<button.y&&p.y+p.h>=button.y&&p.y+p.h<=button.y+button.h+0.01){
    facts.switchContacts.push({relayId:button.id,actorId:p.id,layer:1,attributeFlags:2});
   }
  }
  const relay=Relay.step(s.relayState,h,facts);
  const gateResult=Gates.afterStep(s.gateState,{relayState:s.relayState,events:relay.events,keyTaken:s.keyTaken});s.keyActive=gateResult.keyActive;
  s.lastContacts=facts;s.lastRelayEvents=relay.events;s.lastImpulses=relay.impulses;
  for(const impulse of relay.impulses){
   const p=players.find(q=>q.id===impulse.actorId);if(!p)continue;
   p.vx=impulse.velocity.x*hz;p.vy=impulse.velocity.y*hz;p.grounded=false;p.ground=false;p.supportId=null;p.jumpFrame=0;
  }
  for(const button of s.map.switches){const r=s.relayState.relays.find(r=>r.id===button.id);button.pressed=r.pressed;button.remaining=r.remaining||0;}
  for(const spring of s.map.springs){const r=s.relayState.relays.find(r=>r.id===spring.id);spring.phase=r.phase;spring.visible=r.visible;}
  const deviceResult=Devices.afterStep(s.deviceState,{players,platforms:baseSolids(s),dt:h,nativeTickRate:hz,width:s.map.width,height:s.map.height});
  const bridgeResult=Bridges.afterStep(s.bridgeState,{players,platforms:s.map.platforms,width:s.map.width,height:s.map.height,events:[...relay.events,...deviceResult.events]});
  s.map.hazards=bridgeResult.hazards;
  if(bridgeResult.deadPlayerIds.length){s.status='dead';s.deaths++;s.failure={playerId:bridgeResult.deadPlayerIds[0],reason:'전기에 닿았어요'};return;}
  if(deviceResult.deadPlayerIds.length){s.status='dead';s.deaths++;s.failure={playerId:deviceResult.deadPlayerIds[0],reason:'가시에 닿았어요'};return;}
  for(const p of players){
   // Out of bounds is resolved before any device. The round is lost for
   // everyone, so a warp below the floor must not rescue a single player
   // while the rest keep playing.
   if(p.y>s.map.killY){s.status='dead';s.failure={playerId:p.id,reason:'fall'};s.deaths++;return;}
   for(const warp of s.map.warps||[])if(overlap(p,warp)){
    const ordinal=warp.counter;
    p.x=warp.destination.x+warp.ordinalOffset.x*ordinal-16;
    p.y=warp.destination.y+warp.ordinalOffset.y*ordinal-47;
    p.vx=0;p.vy=0;p.grounded=false;p.ground=false;p.supportId=null;p.jumpFrame=0;
    warp.counter=(ordinal+1)%s.players.length;
    for(const q of players)if(q.supportId===p.id){q.supportId=null;q.grounded=false;q.ground=false;}
    break;
   }
   if(!s.keyTaken&&s.keyActive&&s.map.key&&overlap(p,s.map.key)){s.keyTaken=true;s.map.key.taken=true;}
   if(Actor.canEnterGoal({open:s.keyTaken,overlapping:overlap(p,s.map.exit),upPressed:!!inputs[p.id]?.up,cleared:p.exit,playerState:p.playerState})){
    p.exit=true;p.visible=false;p.playerState=5;p.vx=0;p.vy=0;p.grounded=false;p.ground=false;p.supportId=null;
    for(const q of players)if(q.supportId===p.id){q.supportId=null;q.grounded=false;q.ground=false;}
   }
  }
  if(s.players.every(p=>p.exit))s.status='clear';
 }
 function step(s,inputs={},dt=1/60){
  if(!Number.isFinite(dt)||dt<0||dt>10)throw new Error('dt must be 0..10 seconds');
  if(s.status!=='play')return s;
  const h=1/s.physics.nativeTickRate;s.accumulator+=dt;
  while(s.accumulator+1e-10>=h&&s.status==='play'){tick(s,inputs,h);s.accumulator-=h;s.elapsed+=h;s.ticks++;}
  return s;
 }
 return {compile,create,step,solids,overlap,NATIVE};
});
