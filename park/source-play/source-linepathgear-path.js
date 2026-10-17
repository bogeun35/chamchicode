/* LinePathGear-owned QLinePath numeric core and SetPosForce/rotate plans.
 * Reads no installed files at runtime; reuses the verified complete native
 * FPSqrt table via SourceDistanceConstraintMath (65537 entries, hash in metadata).
 * QLinePath.Initialize0x1816dd138..178 sums native sqrt of pixel FP segment
 * differences; paths start at origin, pathLoop=false from Creator0x181876cac.
 * Initialize0x1816dd219..2b8 transforms (totalLength,0,0) with Camera.ViewMatrix
 * raw+0x130; Matrix multiply0x181644610 uses homogeneous reciprocal and FP
 * products. Camera.Initialize0x1817df592/5bc writes +/-trunc(65536/chipSize),
 * zero translations and w=1. Native sqrt gives totalLengthWS; do not substitute
 * exact division by chipSize or sum world-converted segment lengths.
 * GetPathPosition0x1816dd34c..36b clamps fraction then multiplies TOTAL pixel
 * length; segment comparison >= at0x1816dd548/54b; local idiv and FP lerp
 *0x1816dd5ac..604. Cached exact lengths reproduce these immutable segments.
 * Actor.SetPosForce0x18169d592/59a writes actor pos AND prePos; collision refs
 * valid at0x18169d692/695 and nonnull at0x18169d6c3/6c6: every resolved collision
 * pos/prePos at0x18169d6ea/6ee, clear flags bit6 at0x18169d6f2..6fa.
 * Expected position, velocity, scale and contact caches are not touched.
 * rotate0x1818777a9..7bc uses actual actor displacement and native FPSqrt,
 * threshold4 at0x1818777d1; radius45 raw2949120 from Gear.cctor0x181853723;
 * twoPi raw411774,radToDeg raw3754936 at0x18187781c/838/843. Direction=-1
 * iff previousX<currentX; vertical-only takes+1. Stores angle0x18187784e,
 * prePos0x18187785c, even during standby. FP products use signed low64/sar16.
 */
(function(root,factory){const api=factory(typeof module==='object'&&module.exports?require('./source-distanceconstraint-math.js'):root.SourceDistanceConstraintMath);if(typeof module==='object'&&module.exports)module.exports=api;root.SourceLinePathGearPath=api;})(typeof globalThis!=='undefined'?globalThis:this,function(NativeMath){
'use strict';
const F=65536,MAX=0x7fffffffffffffffn;
function raw(x,what='value'){if(!Number.isSafeInteger(x))throw Error('LinePathGear exact safe raw required: '+what);return BigInt(x);}
function number(x){const n=Number(x);if(!Number.isSafeInteger(n))throw Error('LinePathGear result outside safe raw range');return n===0?0:n;}
const i64=x=>BigInt.asIntN(64,x);
const addRaw=(a,b)=>number(i64(raw(a)+raw(b)));
const subRaw=(a,b)=>number(i64(raw(a)-raw(b)));
const mulRaw=(a,b)=>number(i64(raw(a)*raw(b))>>16n);
function divRaw(a,b){const den=raw(b);if(den===0n)throw Error('LinePathGear native FP divide by zero');return number(i64(raw(a)<<16n)/den);}
function math(){if(!NativeMath||NativeMath.entryCount!==65537||typeof NativeMath.lengthRaw!=='function')throw Error('LinePathGear requires complete SourceDistanceConstraintMath');return NativeMath;}
function sqrtRaw(x){const q=typeof x==='bigint'?x:raw(x);if(q<0n||q>MAX)throw Error('LinePathGear sqrt outside native nonnegative int64 range');return math().sqrtRaw(q);}
function lengthRaw(v){raw(v.xRaw);raw(v.yRaw);return math().lengthRaw(v);}
function compilePath(points,chipSize){
 if(!Number.isSafeInteger(chipSize)||chipSize<=0)throw Error('LinePathGear requires authored positive integer chipSize');
 const paths=points.map(p=>({xRaw:number(raw(p.xRaw)),yRaw:number(raw(p.yRaw))}));
 let from={xRaw:0,yRaw:0},totalLengthRaw=0;
 const segmentLengthsRaw=paths.map(to=>{const length=lengthRaw({xRaw:subRaw(to.xRaw,from.xRaw),yRaw:subRaw(to.yRaw,from.yRaw)});from=to;totalLengthRaw=addRaw(totalLengthRaw,length);return length;});
 const viewScaleXRaw=number((1n<<32n)/(raw(chipSize)<<16n));
 const transformedTotalRaw={xRaw:mulRaw(totalLengthRaw,viewScaleXRaw),yRaw:0};
 return {paths,chipSize,viewScaleXRaw,viewScaleYRaw:-viewScaleXRaw||0,segmentLengthsRaw,totalLengthRaw,totalLengthWSRaw:lengthRaw(transformedTotalRaw),pathLoop:false};
}
function pathPosition(path,progressRaw){
 raw(progressRaw);const fraction=Math.max(0,Math.min(F,progressRaw));
 const target=mulRaw(fraction,path.totalLengthRaw);let sum=0,from={xRaw:0,yRaw:0};
 for(let i=0;i<path.paths.length;i++){
  const to=path.paths[i],length=path.segmentLengthsRaw[i],end=addRaw(sum,length);
  if(end>=target){const t=Math.max(0,Math.min(F,divRaw(subRaw(target,sum),length)));return {xRaw:addRaw(from.xRaw,mulRaw(subRaw(to.xRaw,from.xRaw),t)),yRaw:addRaw(from.yRaw,mulRaw(subRaw(to.yRaw,from.yRaw),t))};}
  if(i===path.paths.length-1)return {...to};sum=end;from=to;
 }
 return {xRaw:0,yRaw:0};
}
function forcePositionPlan(actor,position){
 if(typeof actor.actorId!=='string'||!Array.isArray(actor.collisionSlots))throw Error('LinePathGear SetPosForce requires actorId and resolved collisionSlots');
 const xRaw=number(raw(position.xRaw)),yRaw=number(raw(position.yRaw)),collisionPatches=[];
 for(const slot of actor.collisionSlots){
  if(typeof slot.valid!=='boolean')throw Error('LinePathGear collision ref requires native valid flag');
  if(!slot.valid)continue;
  if(slot.collision===null)continue;
  const c=slot.collision;
  if(!c||!Number.isSafeInteger(c.id)||!Number.isInteger(c.flags)||c.flags<0||c.flags>65535)throw Error('LinePathGear SetPosForce requires resolved collision id/uint16 flags');
  collisionPatches.push({collisionId:c.id,xRaw,yRaw,preXRaw:xRaw,preYRaw:yRaw,flags:c.flags&~64});
 }
 return {actorId:actor.actorId,actorPatch:{xRaw,yRaw,preXRaw:xRaw,preYRaw:yRaw},collisionPatches};
}
function rotatePost(g,position){
 const xRaw=number(raw(position.xRaw)),yRaw=number(raw(position.yRaw));
 const distance=lengthRaw({xRaw:subRaw(xRaw,g.preXRaw),yRaw:subRaw(yRaw,g.preYRaw)});
 let angleRaw=g.angleRaw;
 if(Math.abs(distance)>=4){const direction=g.preXRaw<xRaw?-F:F;const ratio=divRaw(distance,mulRaw(2949120,411774));angleRaw=addRaw(angleRaw,mulRaw(mulRaw(mulRaw(ratio,direction),411774),3754936));}
 g.angleRaw=angleRaw;g.preXRaw=xRaw;g.preYRaw=yRaw;return angleRaw;
}
return {compilePath,pathPosition,forcePositionPlan,rotatePost,sqrtRaw,lengthRaw,mulRaw,divRaw,addRaw,subRaw,mathMetadata:{dependency:'source-distanceconstraint-math.js',entryCount:65537,tableHash:'de5265f651730f20b54cc24bdcd3047e61320be44a5ae54796d290a189f4bca5'}};
});
