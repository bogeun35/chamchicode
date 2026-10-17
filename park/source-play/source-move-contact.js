/* Pure ActorComponent contact transport, statically recovered; no registration.
 * FP=65536; epsilon=4 raws @0x1816a1694/16b2. Face table
 * Up=0 Down=1 Left=2 Right=3 @0x18177e46c..4f6.
 * Defaults sync=true, recursive=true, other bools=false, index/mask=0
 * @0x18177e252..25d / GetMoveContactOption 0x18169dce6.
 * Contact selection is EXACT normal equality in cached contact records,
 * NOT a new overlap/sweep @0x181691a55..a88. Supply these records explicitly.
 * flags 0x10 blocks preflight if faceNormal dot direction >=0
 * @0x1816a196d,1a0a..1a30; transport skips flags 0x10 and 0x80
 * @0x1816a0f96..faa. Layer mask @0x1816a0fb0..fce.
 * Velocity subtraction, position add, sync, type callback, recursion:
 * @0x1816a1208..12d2,1324..1377,13fa..1517,151a..157d.
 * This helper never moves the root, and transport never invokes preflight.
 * Coordinates are top-left, +y down. x/y/w/h are pixel AABBs; calculations
 * use safe integer FP raws. contacts:[{id,normal:{x,y}}], mapNormals:[{x,y}]
 * must be supplied by the collision adapter even when empty. AABB-only
 * contact generation and arbitrary type callbacks are intentionally refused.
 */
(function(root,factory){const api=factory(typeof module==='object'&&module.exports?require('./source-distanceconstraint-math.js'):root.SourceDistanceConstraintMath);if(typeof module==='object'&&module.exports)module.exports=api;root.SourceMoveContact=api;})(typeof globalThis!=='undefined'?globalThis:this,function(FPMath){
'use strict';
const FP=65536,EPSILON=4;
const NORMALS=Object.freeze([{x:0,y:-1},{x:0,y:1},{x:-1,y:0},{x:1,y:0}].map(Object.freeze));
const DEFAULT_OPTION=Object.freeze({isEnableSyncCollisionPos:true,isEnableIgnoreTargetVelo:false,isEnableRecursive:true,isEnableAttached:false,recursiveFaceIsMov:false,calcScreenEnd:false,collisionIndex:0,targetCollisionLayerMask:0,face:0});
function raw(v){const r=v*FP;if(!Number.isSafeInteger(r))throw Error('Coordinate is not an exact safe FP raw');return r;}
function vector(v){return {x:v.xRaw===undefined?raw(v.x):v.xRaw,y:v.yRaw===undefined?raw(v.y):v.yRaw};}
// Shared recovered FPSqrt/normalize LUT, 0x1816463a0 / 0x18163df00.
// Even an axis of magnitude 200 can normalize to +65535, not +65536.
function axis(v){const n=FPMath.normalizeRaw({xRaw:v.x,yRaw:v.y});return {x:n.xRaw/FP,y:n.yRaw/FP};}
const mul=(a,b)=>Number(BigInt.asIntN(64,BigInt(a)*BigInt(b))>>16n);
function normal(face){if(typeof face==='object')return face;return NORMALS[face]||{x:0,y:0};}
const equal=(a,b)=>a.x===b.x&&a.y===b.y;
// Empty callback dictionary @0x18177cdf5; initCallbacks registers only
// PlayerMagnet (72) @0x18177c2ff..304 via 0x180726c40. Player ordinal 27
// has no entry. Actor flag 0x10 bypasses lookup @0x1816a13fa.
function hasNoMoveCallback(b){
 if((b.actorFlags||0)&0x10)return true;
 if(b.actorType===72)return false; // Never allow an assertion to bypass Magnet.
 return b.actorType===27||b.contactResponse==='none';
}
// Collision.AddContactInfo: dedup by collision ID, not (ID,normal)
// @0x18169103f..042. Only Up rejects a reciprocal Up link
// @0x181691070..204. Append State=0 @0x181691269..2bb.
// The caller supplies the resolved collision/face from the pushback pass.
function addContactInfo(world,ownerId,targetId,face){
 const out=JSON.parse(JSON.stringify(world)),s=setup(out,ownerId,{});
 if(!s.root)throw Error('Contact owner collision is required');
 const contacts=s.contacts(s.root),n=normal(face);
 if(typeof face!=='object'&&!NORMALS[face])throw Error('Resolved cardinal face or FP normal is required');
 raw(n.x);raw(n.y); // circle response supplies arbitrary FP normals, including zero.
 if(contacts.some(c=>c.id===targetId))return {world:out,added:false};
 const target=s.find(targetId);
 if(equal(n,NORMALS[0])&&target&&s.contacts(target).some(c=>c.id===ownerId&&equal(c.normal,n)))return {world:out,added:false};
 contacts.push({id:targetId,normal:{...n},state:0});
 return {world:out,added:true};
}
// A predicate ONLY for the rectangle probe in updateContactCollision.
// Caller must supply GetRect-derived world bounds, not Actor anchors.
// Normal/2 displacement @0x181693fe9..4009; IsCollided excludes same
// EntityRef and flag 1 @0x181691f1b..39, strict edges @0x181692236..268.
// This neither discovers contacts nor runs OnContactAdded/OnContacted.
function retainsRectContact(owner,target,contact){
 if(!target)return false;
 if(owner.entityId===undefined||target.entityId===undefined)throw Error('Native entity identity is required');
 if(owner.entityId===target.entityId||((owner.flags||0)|(target.flags||0))&1)return false;
 if(owner.collisionType!==0||target.collisionType!==0)throw Error('Only explicit rectangle collision probes are recovered');
 const n=contact.normal;
 const nx=raw(n.x),ny=raw(n.y);
 const a=owner.collisionRectRaw,b=target.collisionRectRaw;
 for(const r of [a,b])if(!r||!['x','y','width','height'].every(k=>Number.isSafeInteger(r[k]))||r.width<0||r.height<0)throw Error('Resolved world collisionRectRaw is required');
 const x=a.x+Number(BigInt(nx)>>1n),y=a.y+Number(BigInt(ny)>>1n);
 const values=[x,y,x+a.width,y+a.height,b.x+b.width,b.y+b.height];
 if(!values.every(Number.isSafeInteger))throw Error('Contact probe exceeds safe FP range');
 return x<b.x+b.width&&b.x<x+a.width&&y<b.y+b.height&&b.y<y+a.height;
}
function setup(world,mover,option){
 const o={...DEFAULT_OPTION,...option};
 if(o.collisionIndex!==0)throw Error('Multiple collision-index adapter is unresolved');
 const bodies=world.bodies;if(!Array.isArray(bodies))throw Error('world.bodies is required');
 const root=bodies.find(b=>b.id===(typeof mover==='object'?mover.id:mover));
 const contacts=b=>{if(!Array.isArray(b.contacts))throw Error('Native cached contacts required for '+b.id);return b.contacts;};
 return {o,bodies,root,contacts,find:id=>bodies.find(b=>b.id===id)};
}
function isEnableMoveContactActor(world,mover,direction,option){
 const d=vector(direction);if(Math.abs(d.x)<EPSILON&&Math.abs(d.y)<EPSILON)return false;
 const n=axis(d),s=setup(world,mover,option);if(!s.root||s.root.hasCollision===false)return false;
 const face=normal(s.o.face),active=new Set();
 function visit(b){
  if(active.has(b.id))throw Error('Cyclic native preflight contact graph is unresolved');active.add(b.id);
  for(const c of s.contacts(b).filter(c=>equal(c.normal,n))){
   const target=s.find(c.id);if(!target)continue;
   if((target.flags||0)&0x10){if(mul(raw(face.x),raw(n.x))+mul(raw(face.y),raw(n.y))>=0)return false;continue;}
   if(!Array.isArray(target.mapNormals))throw Error('Native cached map normals required for '+target.id);
   if(target.mapNormals.some(q=>equal(q,n)))return false;
   if(target.actor===false)continue;
   // Recursive preflight always uses collision index zero; options do not filter it.
   if(target.hasCollision===false)return false;
   if(!visit(target))return false;
  }
  active.delete(b.id);return true;
 }
 return visit(s.root);
}
function moveContactActor(world,mover,delta,option){
 const d=vector(delta),s=setup(world,mover,option),moved=[],synced=[],seen=new Set();
 const out=JSON.parse(JSON.stringify(world));const targetOut=id=>out.bodies.find(b=>b.id===id);
 if(!s.root||s.root.hasCollision===false)return {world:out,moved,synced};
 if(s.o.calcScreenEnd)throw Error('CalcScreenEndWalkVeloX adapter is unresolved');
 function transport(b,amount,face){
  for(const c of s.contacts(b).filter(c=>equal(c.normal,face))){
   const t=s.find(c.id);if(!t||((t.flags||0)&0x90)||t.actor===false)continue;
   const mask=s.o.targetCollisionLayerMask;if(mask&&!(mask&(1<<((t.layer||0)&31))))continue;
   if(seen.has(t.id))continue;seen.add(t.id); // native per-call entity list @0x1816a1182..11d5
   if(!hasNoMoveCallback(t))throw Error('Unresolved actor-type MoveByContact callback for '+t.id+' (0x1816a1517)');
   let a={...amount};
   if(s.o.isEnableIgnoreTargetVelo){
    const n=axis(amount),v=vector(t.velocity||{x:0,y:0}),dot=mul(raw(n.x),v.x)+mul(raw(n.y),v.y);
    if(dot<0)a={x:a.x-mul(raw(n.x),dot),y:a.y-mul(raw(n.y),dot)};
   }
   const q=targetOut(t.id);q.x=(raw(q.x)+a.x)/FP;q.y=(raw(q.y)+a.y)/FP;
   moved.push({id:t.id,xRaw:a.x,yRaw:a.y,x:a.x/FP,y:a.y/FP});
   if(s.o.isEnableSyncCollisionPos){q.collisionX=q.x;q.collisionY=q.y;synced.push(t.id);}
   if(s.o.isEnableRecursive)transport(t,amount,s.o.recursiveFaceIsMov?axis(amount):face);
  }
 }
 transport(s.root,d,normal(s.o.face));return {world:out,moved,synced};
}
return {isEnableMoveContactActor,moveContactActor,addContactInfo,retainsRectContact,NORMALS,DEFAULT_OPTION,completePhysicsFidelity:false};
});
