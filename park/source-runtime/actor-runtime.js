// Source, native and engine coordinates all use Y-down; no height-Y reflection.
(function (root) {
  'use strict';
  const rects = Object.freeze({
    Player: Object.freeze({x:-16,y:-47,width:32,height:46}),
    Key: Object.freeze({x:-16,y:-28,width:32,height:56}),
    Goal: Object.freeze({x:-24,y:-32,width:48,height:32})
  });
  function actorPopulationAllowed(value,count) {
    return value===0 || (value<0 ? count<=-value : value<10 ? count>=value : count>=Math.trunc(value/10) && count<=value%10);
  }
  function sourceProps(actor) { return actor.properties || actor; }
  function sourcePosition(actor) { return actor.position || {x:Number(actor.posX),y:Number(actor.posY)}; }
  function numericSlot(actor,index) {
    const slot=(actor.parameters||actor.datas||[])[index];
    return slot && slot.t===1 ? Number(slot.f)||0 : 0;
  }
  function nativeCollisionRect(actor,scale=1) {
    const p=sourceProps(actor), base=rects[p.typeName];
    if(!base) return null;
    const pos=sourcePosition(actor), offset=p.typeName==='Goal'?numericSlot(actor,0):0;
    return {x:pos.x+base.x*scale,y:pos.y+(base.y-offset)*scale,width:base.width*scale,height:(base.height+offset)*scale};
  }
  function collisionRect(actor,scale=1) {
    return nativeCollisionRect(actor,scale);
  }
  function engineCollisionRect(actor,worldHeight,scale=1) {
    // Keep the former signature for callers; worldHeight does not alter coordinates.
    return nativeCollisionRect(actor,scale);
  }
  function playerSpawns(actors,count,limitPlayer=true) {
    return actors.filter(a=>sourceProps(a).typeName==='Player' && actorPopulationAllowed(sourceProps(a).playerCount||0,count))
      .filter((a,ordinal)=>!limitPlayer || ordinal<count)
      .map((a,ordinal)=>({sourceActor:a,ordinal,name:sourceProps(a).name,position:sourcePosition(a),collision:collisionRect(a)}));
  }
  // Entry condition receives collision result from the caller's solver.
  function canEnterGoal({open,overlapping,upPressed,cleared=false,playerState=1,requestedState=0}) {
    return !!(open && overlapping && upPressed && !cleared && requestedState===0 && [1,6,7,9,10].includes(playerState));
  }
  const api={rects,collisionRect,nativeCollisionRect,engineCollisionRect,playerSpawns,actorPopulationAllowed,canEnterGoal,
    coordinateSystems:Object.freeze({rects:'native local Y-down',nativeCollisionRect:'native Y-down at supplied anchor; no spawn side effects',collisionRect:'source Y-down top-left bounds',engineCollisionRect:'engine Y-down top-left bounds; no height reflection',playerSpawns:'source Y-down anchors and collision bounds'}),
    verifiedMotionConstants:Object.freeze({walkSpeed:3,jumpBase:-334234/65536,gravityIncrement:42598/65536,terminalGravityVelocity:19.5}),
    completePhysicsFidelity:false};
  if(typeof module!=='undefined' && module.exports)module.exports=api;
  root.SourceActorRuntime=api;
})(typeof globalThis!=='undefined'?globalThis:this);
