/* Interpreted PP2 motion devices. Coordinates Y-down; velocities native pixels/tick. */
(function(root,factory){const api=factory();if(typeof module==='object'&&module.exports)module.exports=api;root.SourceMotionDevices=api;})(typeof globalThis!=='undefined'?globalThis:this,function(){
 'use strict';
 const F=65536, DEG=0x477/F, HALF_PI=0x1921f/F, ANGLE_STEP=0x51e/F;
 const fixed=x=>Math.floor(x*F)/F;
 const clone=x=>JSON.parse(JSON.stringify(x));
 function n(a,i){const p=a.datas?.[i];if(!p||p.t===0)return 0;if(p.t!==1||!Number.isFinite(p.f))throw new Error('Unsupported '+a.typeName+' numeric slot '+i);return fixed(p.f);}
 function zeroOffset(a,i){const p=a.datas?.[i];if(!p||p.t===0)return 0;
  // Native generic FP-seven decoder 0x18096f80c subtracts 0x21 from every byte.
  // All 56 zero bytes are exactly seven zero FP64 values. Other encodings are gated.
  if(p.t===2&&p.s==='!'.repeat(56))return 0;
  throw new Error('Rect population offset encoding requires further verification: '+a.name+' slot '+i);
 }
 function compile(actors,count){
  if(!Number.isInteger(count)||count<2||count>8)throw new Error('Count must be 2..8');
  const out={count,rects:[],dashBoards:[],walls:[],originalFidelityVerified:false};
  for(const a of actors){
   if(!['Rect','DashBoard','FallingWall'].includes(a.typeName))continue;
   if(a.createThreshold>0)throw new Error('Deferred motion actor unsupported');
   const base={id:'motion:'+a.typeName+':'+a.name,type:a.typeName,x:a.x??a.posX,y:a.y??a.posY};
   if(!Number.isFinite(base.x)||!Number.isFinite(base.y))throw new Error('Invalid actor position');
   if(a.typeName==='Rect'){
    let w=n(a,0)+n(a,2)*(count-2),h=n(a,1)+n(a,3)*(count-2);
    let x=base.x+n(a,4)*(count-2)+zeroOffset(a,6),y=base.y+n(a,5)*(count-2)+zeroOffset(a,7)-h;
    if(w<0){x+=w;w=-w;}if(h<0)throw new Error('Negative Rect height unverified');
    out.rects.push({...base,x,y,w,h,solid:true});
   }else if(a.typeName==='DashBoard'){
    // .cctor 0x1818175c2: native RectFP is height,width,x,y = 8,64,-32,-8.
    out.dashBoards.push({...base,x:base.x-32,y:base.y-8,w:64,h:8,vx:n(a,0),vy:n(a,1)});
   }else{
    const blockSize=Math.trunc(n(a,0)),blockCount=Math.trunc(n(a,1));
    const hitsRequired=Math.trunc(n(a,count)),resilienceTime=n(a,count+7);
    const fallAngle=fixed(n(a,17)*DEG),bounciness=n(a,16);
    if(blockSize<=0||blockSize>127||blockCount<=0||blockCount>127||hitsRequired<=0||hitsRequired>127||fallAngle<=0||resilienceTime<=0||bounciness<0)throw new Error('Invalid FallingWall parameters');
    out.walls.push({...base,blockSize,blockCount,hitsRequired,resilienceTime,fallAngle,bounciness});
   }
  }
  return out;
 }
 function create(compiled){return {count:compiled.count,rects:clone(compiled.rects),dashBoards:clone(compiled.dashBoards),walls:compiled.walls.map(w=>({...clone(w),hits:0,timer:w.resilienceTime,angle:0,targetAngle:0,angularVelocity:0,falling:false,fallen:false})),ticks:0};}
 function findWall(s,id){const w=s.walls.find(w=>w.id===id);if(!w)throw new Error('Unknown wall '+id);return w;}
 function hitWall(s,id,reflectedVx){
  const w=findWall(s,id);
  if(w.fallen||w.timer<0x3333/F||w.hits>=w.hitsRequired)return false;
  w.hits++;w.timer=0;
  // HitWall consumes already-reflected velocity, not incoming player velocity.
  w.targetAngle=fixed(w.targetAngle+fixed(w.fallAngle/w.hitsRequired)*(reflectedVx>0?-1:1));
  return true;
 }
 function contactWall(s,id,{vx,vy=0,face='left',playerCenterX,blockCenterX}={}){
  const w=findWall(s,id);if(w.fallen)return {hit:false,impulse:null};
  if(!Number.isFinite(vx)||!Number.isFinite(vy))throw new Error('Contact needs native pre-contact velocity');
  if(face==='top')return {hit:false,impulse:{vx:(playerCenterX<(blockCenterX??w.x)?-3:3),vy:0},forceJump:true};
  // checkCollision 0x1818478d2 compares signed PREVIOUS X velocity with +6.
  if(vx<6)return {hit:false,impulse:null};
  const reflected={vx:-vx,vy};
  if(w.bounciness>0){reflected.vx=fixed(reflected.vx*w.bounciness);reflected.vy=fixed(reflected.vy*w.bounciness);}
  return {hit:hitWall(s,id,reflected.vx),impulse:w.bounciness>0?reflected:null,forceJump:w.bounciness>0};
 }
 function triggerDash(board){return {vx:board.vx,vy:board.vy,forceJump:true,clearHorizontalOnLanding:true};}
 function step(s,dt=1/60,{gravity=42598/F}={}){
  if(!Number.isFinite(dt)||dt<0||dt>.1)throw new Error('Invalid fixed-step delta');
  for(const w of s.walls){
   if(w.fallen)continue;
   w.timer=fixed(w.timer+dt);
   if(w.hits<w.hitsRequired){
    if(w.timer>=w.resilienceTime&&w.hits>0){w.hits=0;w.targetAngle=0;}
    w.angularVelocity=2*Math.trunc((w.targetAngle-w.angle)/w.fallAngle*F)/F;
   }else if(w.falling){
    const sin=fixed(Math.sin(w.angle));w.angularVelocity=fixed(w.angularVelocity+fixed(fixed(gravity*fixed(sin*sin))*.5));
   }else{
    const ratio=Math.trunc((w.targetAngle-w.angle)/w.fallAngle*F)/F;
    w.angularVelocity=ratio*2;if(ratio<0xccb/F)w.falling=true;
   }
   // Original uses constant 0x51e, independent of timer delta, per native tick.
   w.angle=fixed(w.angle+fixed(w.angularVelocity*ANGLE_STEP));
   if(Math.abs(w.angle)>=HALF_PI)w.fallen=true;
  }
  s.ticks++;return s;
 }
 function solids(s){
  const result=s.rects.map(r=>({...r}));
  for(const w of s.walls){
   const angle=Math.max(-HALF_PI,Math.min(HALF_PI,w.angle));
   // Native uses axis-aligned square collision blocks along rotated center line.
   // First block center stays (anchorX,anchorY-size/2), not rotated about anchor.
   for(let index=0;index<w.blockCount;index++)result.push({id:w.id+':block:'+index,type:'FallingWallBlock',wallId:w.id,index,
    x:w.x+fixed(Math.sin(angle))*w.blockSize*index-w.blockSize/2,
    y:w.y-w.blockSize/2-fixed(Math.cos(angle))*w.blockSize*index-w.blockSize/2,
    w:w.blockSize,h:w.blockSize,solid:true,fallen:w.fallen});
  }
  return result;
 }
 return {compile,create,step,solids,triggerDash,hitWall,contactWall,
  nativeConstants:Object.freeze({degreesToRadians:DEG,halfPi:HALF_PI,angleStep:ANGLE_STEP,hitCooldown:0x3333/F,minimumIncomingX:6}),
  integration:{velocityUnits:'native pixels per tick; multiply by runtime tick rate',dash:'Fresh contact only. Preserve forced X in air, clear on landing. Y is an initial impulse.',wall:'Resolve all returned square solids, call contactWall before zeroing pre-contact velocity. Carry/push contacted actors by each block displacement.',fidelity:'Native trigonometric lookup and contact iteration ordering are not bit-exact; do not claim original fidelity.'}};
});
