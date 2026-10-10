/* Source-derived WarpInitPos / WarpAllInitPos. These two actor types share
 * WarpComponent with the ordinary Warp, but their destination is each warped
 * actor's own native m_InitPos plus the authored offset - never the Warp
 * destination slots, which type 43/44 actors leave empty. Coordinates Y-down,
 * velocities native pixels per tick. */
(function(root,factory){
 const common=typeof module==='object'&&module.exports;
 const api=factory(common?require('./actor-runtime.js'):root.SourceActorRuntime);
 if(common)module.exports=api;root.SourceWarpInitDevices=api;
})(typeof globalThis!=='undefined'?globalThis:this,function(Actor){
'use strict';
const overlap=(a,b)=>a.x<b.x+b.w&&a.x+a.w>b.x&&a.y<b.y+b.h&&a.y+a.h>b.y;
const clone=v=>JSON.parse(JSON.stringify(v));
const finite=v=>!!v&&Number.isFinite(v.x)&&Number.isFinite(v.y);
// Native FP is Q16.16. warpProc 0x18169e4cc/0x18169e4ea and IsWarp 0x1816a2560
// treat |m_WarpPos| below 4 RAW units as "nothing pending", i.e. 4/65536 world
// units, so a destination that lands exactly on the origin never warps.
const PENDING_EPSILON=4/65536;
// Player collision box is 32x46 at actor anchor +(-16,-47); see actor-runtime
// rects. warpProc calls SetPosForce with the anchor, not with the box corner.
const PLAYER_ANCHOR=Object.freeze({x:-16,y:-47,w:32,h:46});
// WarpComponent.ParseParameter 0x18173450c..0x181734567 maps the source actor
// type id onto warpType / targetAll / initPos:
//   41 -> warpType0            42 -> warpType1 targetAll
//   44 -> warpType2 initPos    43 -> warpType3 targetAll+initPos
// initPos = (warpType==2||warpType==3), targetAll = (warpType==1||warpType==3).
const VARIANTS=Object.freeze({
 WarpInitPos:Object.freeze({actorType:44,warpType:2,targetAll:false}),
 WarpAllInitPos:Object.freeze({actorType:43,warpType:3,targetAll:true})});
const supportedTypes=Object.freeze(Object.keys(VARIANTS));
const props=a=>a.properties||a;
const position=a=>a.position||{x:a.x??a.posX,y:a.y??a.posY};
function datas(a){return a.datas||a.parameters||[];}
// ParseParameter 0x1817343d3 compares each slot's type tag with 1 and
// 0x1817343e3 substitutes literal zero for every other tag, so an absent or
// string slot is a legitimate zero rather than an error.
function slot(a,index){
 const p=datas(a)[index];
 if(!p||p.t!==1)return 0;
 if(!Number.isFinite(p.f))throw new Error('Invalid '+props(a).typeName+' numeric slot '+index);
 return p.f;
}
function compile(actors,count){
 if(!Number.isInteger(count)||count<2||count>8)throw new Error('WarpInitPos player count must be 2..8');
 if(!Array.isArray(actors))throw new Error('Source actor list required');
 const warps=[],boxes=[],warnings=[];
 for(const [i,a] of actors.entries()){
  const p=props(a),type=p.typeName,pos=position(a);
  if(type==='PushBox'){
   // PushBoxComponent.InitCollision 0x1816db651 writes type/layer 0x0202, so a
   // PushBox is a layer2 collider and WarpComponent.OnCollided 0x181734a08
   // accepts it exactly like a layer1 player. Box rect geometry follows
   // PushBoxComponent.ParseParameter 0x1816db310 (slots 1/2 are width/height,
   // anchor is bottom-centre) and matches source-devices-runtime.
   const w=slot(a,1),h=slot(a,2);
   if(w<=0||h<=0||!finite(pos))continue;
   boxes.push({name:p.name||'',sourceIndex:i,w,h,initX:pos.x-w/2,initY:pos.y-h});
   continue;
  }
  const variant=VARIANTS[type];if(!variant)continue;
  if(p.createThreshold>0)throw new Error('Deferred '+type+' actor unsupported');
  if(!finite(pos))throw new Error('Invalid '+type+' actor position');
  const w=slot(a,0),h=slot(a,1);
  if(w<=0||h<=0)throw new Error('Unsupported '+type+' dimensions');
  // ParseParameter 0x1817344c5 stores {slot1,slot0} as the collision rect
  // height/width and 0x181734504 zeroes its local x/y, so the actor position
  // is the volume's top-left corner. InitCollision 0x18173461a then sets
  // Collision.m_Layer to 14, which is a sensor: the volume is never solid.
  const destination={x:slot(a,2),y:slot(a,3)},offset={x:slot(a,4),y:slot(a,5)};
  if(destination.x||destination.y)
   warnings.push((p.name||type)+': destination slots 2/3 are ignored by the init-pos path (OnCollided 0x1817349a8 reads only the offset pair)');
  warps.push({id:a.id||'warpinit:'+i,name:p.name||'',type,sourceIndex:i,
   actorType:variant.actorType,warpType:variant.warpType,targetAll:variant.targetAll,
   x:pos.x,y:pos.y,w,h,layer:14,offset,unusedDestination:destination,
   // OnCollided 0x1817349b5/0x1817349ec always sets QEventParam+0x7c, which
   // OnRecvEvent 0x18169e9d9..0x18169e9e8 turns into flag bit20
   // (IsDisableCorrectWarpPos 0x18169d060). warpProc 0x18169e545 therefore
   // skips the camera-left clamp for every init-pos warp.
   disableCorrectWarpPos:true,
   // The shared signed-byte counter at WarpComponent+0 is only read and
   // advanced by the ordinary layer1 path (0x1817347b1..0x181734831); the
   // init-pos branch never touches it, so there is no per-player ordinal.
   usesOrdinalCounter:false,triggers:0,contacting:false});
 }
 // m_InitPos is written once by ActorSceneComponent.AddActor 0x1816a73ee ->
 // SetInitPos 0x18169d2cf, which stores the creation position into both
 // m_InitPos (+0x80) and m_Pos (+0xb0). For players that is the source actor
 // anchor of the spawn this population selected. Only resolve it for stages
 // that actually own an init-pos warp, so other stages stay a cheap no-op.
 let initPositions=[];
 if(warps.length){
  initPositions=Actor.playerSpawns(actors,count).map(s=>({x:s.position.x,y:s.position.y,name:s.name??''}));
  if(initPositions.length!==count)throw new Error('Source stage has no spawn for every player');
  if(initPositions.some(q=>!finite(q)))throw new Error('Invalid source player spawn anchor');
  const names=boxes.map(b=>b.name);
  if(new Set(names).size!==names.length)throw new Error('Duplicate PushBox name; warp targets cannot be resolved');
 }
 return {schemaVersion:1,count,warps,boxes:warps.length?boxes:[],initPositions,warnings,
  acceptedContactLayers:Object.freeze([1,2,8]),completePhysicsFidelity:false};
}
function create(compiled){
 if(!compiled||compiled.schemaVersion!==1)throw new Error('Compiled WarpInitPos data required');
 return clone(compiled);
}
// Collision.m_Layer 14 (InitCollision 0x18173461a) is a notification sensor and
// the component has no pushback handler, so warp volumes add no solids.
function solids(){return [];}
function beforeStep(state,{dt=1/60}={}){
 if(!Number.isFinite(dt)||dt<0)throw new Error('Invalid warp delta');
 return {solids:[]};
}
function pendingAnchor(anchor){return Math.abs(anchor.x)>=PENDING_EPSILON||Math.abs(anchor.y)>=PENDING_EPSILON;}
function playerInitPos(p){
 if(!finite(p.initPos))throw new Error('Player '+p.id+' has no native m_InitPos; the stage runtime must copy compiled initPositions onto each player');
 return p.initPos;
}
function applyToPlayer(p,anchor,players){
 // warpProc 0x18169e617 ClearCollisionContactInfo, 0x18169e630 SetPosForce,
 // 0x18169e63f..0x18169e654 assigns m_Velo from the already-zeroed m_WarpVelo
 // and clears the pending warp. OnRecvEvent additionally called ResetVeloAll
 // 0x18169e9fe, which zeroes m_Velo/+0xf0, m_Accel/+0x60 and m_JumpVelo/+0x90,
 // so no forced horizontal velocity survives a warp.
 p.x=anchor.x+PLAYER_ANCHOR.x;p.y=anchor.y+PLAYER_ANCHOR.y;
 p.vx=0;p.vy=0;p.forcedVx=0;p.jumpFrame=0;
 p.grounded=false;p.ground=false;p.supportId=null;
 for(const q of players)if(q!==p&&q.supportId===p.id){q.supportId=null;q.grounded=false;q.ground=false;}
}
function applyToBox(box,record,offset){
 if(box.w!==record.w||box.h!==record.h)
  throw new Error('PushBox '+record.name+' geometry changed; compiled init rect no longer applies');
 // The box rect keeps a fixed offset from its anchor, so adding the warp
 // offset to the spawn rect is identical to warping the anchor.
 box.x=record.initX+offset.x;box.y=record.initY+offset.y;
 // PushBoxComponent.OnRecvEvent 0x1816dbd32 zeroes its own vector field and
 // 0x1816dbd3a clears the push flag before delegating to
 // ActorComponent.OnRecvEvent 0x1816dbd6f.
 box.vx=0;box.vy=0;box.grounded=false;box.pushCount=0;
}
function afterStep(state,{players=[],boxes=null,dt=1/60}={}){
 if(!Number.isFinite(dt)||dt<0)throw new Error('Invalid warp delta');
 const alive=players.filter(p=>!p.exit&&!p.dead),cargo=Array.isArray(boxes)?boxes:[];
 const warped=[];
 for(const w of state.warps){
  const hitPlayers=alive.filter(p=>overlap(p,w));
  const hitBoxes=cargo.filter(b=>overlap(b,w));
  w.contacting=!!(hitPlayers.length||hitBoxes.length);
  if(!w.contacting)continue;
  w.triggers++;
  // OnCollided 0x181734a54..0x181734a61 notifies event 64 with the CONTACTED
  // collision's EntityRef, so warpType2 moves only the actor that touched the
  // volume. warpType3 uses the untargeted Frame.NotifyEvent 0x1817349fe
  // instead, which broadcasts event 64 to every actor.
  const targetPlayers=w.targetAll?alive:hitPlayers;
  const targetBoxes=w.targetAll?cargo:hitBoxes;
  for(const p of targetPlayers){
   // OnRecvEvent event64 0x18169e963..0x18169e9b0: m_WarpPos = m_InitPos
   // (+0x80) + QEventParam.Position (+0x30), and OnCollided put the offset
   // pair (slots 4/5) into that Position field at 0x1817349a8/0x181734a4b.
   const init=playerInitPos(p),anchor={x:init.x+w.offset.x,y:init.y+w.offset.y};
   if(!pendingAnchor(anchor))continue;
   applyToPlayer(p,anchor,players);
   warped.push({warpId:w.id,kind:'player',id:p.id,anchor:{...anchor},x:p.x,y:p.y});
  }
  for(const box of targetBoxes){
   const record=state.boxes.find(b=>b.name===box.name);
   if(!record)throw new Error('Unknown PushBox '+(box.name||box.id)+' presented to the warp volume');
   const anchor={x:record.initX+record.w/2+w.offset.x,y:record.initY+record.h+w.offset.y};
   if(!pendingAnchor(anchor))continue;
   applyToBox(box,record,w.offset);
   warped.push({warpId:w.id,kind:'box',id:box.id??record.name,anchor,x:box.x,y:box.y});
  }
 }
 return {warped,events:[]};
}
return {compile,create,solids,beforeStep,afterStep,supportedTypes,
 variants:VARIANTS,pendingEpsilon:PENDING_EPSILON,playerAnchor:PLAYER_ANCHOR,
 integration:Object.freeze({
  initPos:'Every warped actor needs its native m_InitPos. Copy compiled initPositions[i] onto players[i] as player.initPos before the first step.',
  ordering:'ActorComponent.CheckOutMap 0x1816a1d07..0x1816a1d51 returns false while a warp is pending, and warpProc runs before it inside OnPost1 (0x18169e2af vs 0x18169e339), so a warp must be resolved before the out-of-bounds death check.',
  failLine:'The native fall line is StageComponent.FailFallY = mapHeightInTiles*48 + (stage failDownY or 2400): prepare3 0x18170ac06 with QGameDefine..cctor 0x181780766/0x181780791. Every warp volume in the game sits between the floor and that line.',
  boxes:'Pass the live PushBox solids as ctx.boxes to reproduce the layer2 contact; omit them to warp players only.'}),
 completePhysicsFidelity:false};
});
