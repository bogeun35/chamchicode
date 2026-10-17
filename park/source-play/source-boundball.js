/* BoundBall native core. Fields(unboxed): signed stallByte0,flags2,isDisappear4,
 * manyPeople8,pitcherRef10,entity18,activeDelay20,disappear28,activeVelo30.
 * Update order waitActivate3470 ->checkStall3580 ->friction36b0 ->fade3810.
 * cctor1817d4220: circle radius12 center0, friction62259(.95 FromString),
 * weight50,fade32768,reflect65536,min78643,smallPeopleReflectScale78643.
 * OnContacted1817d3b30 restores vertical energy from previous position/velocity
 * before map/actor reflection; exact FPSqrt181640c40 reused from established core.
 * inactive1817d4150: SetCollisionActive(false), requestAnimation2,fade32768.
 * receiver39@1817d3a9c X alignment,Velo(0,196608),inactive unless already fading.
 * OnExit1817d38d0/notify3930 clears linked pitcher's ball directly, no failure++.
 */
(function(root,factory){const api=factory(typeof require==='function'?require('./source-distanceconstraint-math.js'):root.SourceDistanceConstraintMath);if(typeof module==='object'&&module.exports)module.exports=api;root.SourceBoundBall=api;})(globalThis,function(math){'use strict';
const F=65536,clone=x=>JSON.parse(JSON.stringify(x)),i=v=>BigInt.asIntN(64,v);
function raw(v){if(!Number.isSafeInteger(v))throw Error('BoundBall exact safe raw required');return v;}
const n=v=>raw(Number(v)),add=(a,b)=>n(i(BigInt(raw(a))+BigInt(raw(b)))),sub=(a,b)=>add(a,-raw(b)),mul=(a,b)=>n(i(BigInt(raw(a))*BigInt(raw(b)))>>16n),div=(a,b)=>{if(!b)throw Error('BoundBall native divide by zero');return n(i(BigInt(raw(a))<<16n)/BigInt(raw(b)));},vec=v=>{raw(v?.xRaw);raw(v?.yRaw);return v;},scale=(v,s)=>({xRaw:mul(v.xRaw,s),yRaw:mul(v.yRaw,s)}),sum=(a,b)=>({xRaw:add(a.xRaw,b.xRaw),yRaw:add(a.yRaw,b.yRaw)}),neg=v=>({xRaw:-v.xRaw,yRaw:-v.yRaw}),dot=(a,b)=>add(mul(a.xRaw,b.xRaw),mul(a.yRaw,b.yRaw));
function actor(a){if(!a||a.entityId==null||!Number.isInteger(a.flags))throw Error('BoundBall actual Actor identity/flags required');vec(a.positionRaw);vec(a.velocityRaw);return a;}
function create({entityId,pitcherEntityId,activeVelocityRaw,activeDelayRaw,count}){if(entityId==null||pitcherEntityId==null||!Number.isInteger(count)||count<2||count>8)throw Error('BoundBall actual birth identities/count required');vec(activeVelocityRaw);raw(activeDelayRaw);return {entityId,pitcherEntityId,stall:0,flags:0,disappearing:false,manyPeople:count>=5,activeDelayRaw,disappearTimeRaw:0,activeVelocityRaw:clone(activeVelocityRaw)};}
function inactive(b,a){actor(a);a.collisionActive=false;a.requestAnimationId=2;b.disappearing=true;b.disappearTimeRaw=32768;}
function receive(b,a,e,host={}){actor(a);if(e.eventType!==39){if(typeof host.commonActorReceive!=='function')throw Error('BoundBall common Actor receiver required');return host.commonActorReceive(a,e);}raw(e.positionRaw?.xRaw);a.positionRaw.xRaw=e.positionRaw.xRaw;a.velocityRaw={xRaw:0,yRaw:196608};if(!b.disappearing)inactive(b,a);return 1;}
function update(b,a,ctx){actor(a);raw(ctx.dtRaw);if(ctx.dtRaw<0)throw Error('BoundBall nonnegative dt required');
 if(b.activeDelayRaw>0){b.activeDelayRaw=sub(b.activeDelayRaw,ctx.dtRaw);if(b.activeDelayRaw<=0){b.activeDelayRaw=0;a.velocityRaw=clone(b.activeVelocityRaw);if(!a.accelerationRaw)throw Error('BoundBall actual Actor acceleration vector required');vec(a.accelerationRaw);a.accelerationRaw.yRaw=raw(ctx.gravityRaw);a.visible=true;}}
 if(!b.disappearing&&b.stall!==0){if(Math.abs(a.velocityRaw.yRaw)<4){const threshold=b.manyPeople?0:2;if(threshold>b.stall)b.stall=((b.stall+1+128)&255)-128;else{a.velocityRaw={xRaw:0,yRaw:0};inactive(b,a);}}else b.stall=0;}
 if(!b.disappearing){if(typeof ctx.contactedDown!=='boolean')throw Error('BoundBall native collision0 IsContacted(Down1,includeMap=true) required');if(b.manyPeople)b.flags|=2;if(!ctx.contactedDown)b.flags&=~2;else if(!(b.flags&2))b.flags|=2;else a.velocityRaw.xRaw=mul(a.velocityRaw.xRaw,62259);}
 if(b.disappearing){b.disappearTimeRaw=sub(b.disappearTimeRaw,ctx.dtRaw);if(b.disappearTimeRaw<=0){a.flags=(a.flags|8192)>>>0;b.disappearing=false;}}return a;}
function contact(b,a,c,ctx){actor(a);vec(a.previousPositionRaw);vec(a.previousVelocityRaw);vec(c.normalRaw);raw(ctx.gravityRaw);if(!math)throw Error('BoundBall exact native FPSqrt core required');
 const energy=add(sub(mul(mul(a.previousVelocityRaw.yRaw,a.previousVelocityRaw.yRaw),32768),mul(a.previousPositionRaw.yRaw,ctx.gravityRaw)),mul(a.positionRaw.yRaw,ctx.gravityRaw));
 a.velocityRaw.yRaw=mul(a.velocityRaw.yRaw<0?-F:F,math.sqrtRaw(mul(energy,131072)));
 const normal=c.normalRaw;
 if(c.targetActor===null){let projection=scale(normal,dot(normal,a.velocityRaw));if(math.lengthRaw(projection)<78643)projection={xRaw:0,yRaw:0};a.velocityRaw=sum(sum(a.velocityRaw,neg(projection)),scale(neg(projection),F));if(!b.disappearing&&Math.abs(normal.yRaw-F)<4){a.velocityRaw={xRaw:0,yRaw:0};inactive(b,a);}return a;}
 const target=actor(c.targetActor);raw(a.weightRaw);raw(target.weightRaw);if(!Number.isInteger(c.targetLayer))throw Error('BoundBall target native collision layer required');const coef=b.manyPeople?F:78643,u=dot(normal,a.velocityRaw),v=dot(normal,target.velocityRaw),same=n(i(BigInt(u)*BigInt(v))&-65536n)>0;
 if((!same&&u<0)||(same&&(u>0?v>u:u<v)))return a;
 const tangent=sum(a.velocityRaw,neg(scale(normal,u))),out=div(add(mul(sub(a.weightRaw,mul(target.weightRaw,coef)),u),mul(mul(add(coef,F),target.weightRaw),v)),add(target.weightRaw,a.weightRaw)),speed=Math.abs(out)>=78643?out:0;
 a.velocityRaw=sum(tangent,scale(normal,speed));if(a.velocityRaw.yRaw< -393216){if(typeof ctx.playSe!=='function')throw Error('BoundBall native PlaySe(4) required');ctx.playSe(a.entityId,4);}if(!b.disappearing&&(c.targetLayer===1||c.targetLayer===5)&&Math.abs(a.velocityRaw.yRaw)<4)b.stall=((b.stall+1+128)&255)-128;return a;}
function onExit(b,host){if(typeof host.resolvePitcher!=='function')throw Error('BoundBall actual pitcher component lookup required');const p=host.resolvePitcher(b.pitcherEntityId);if(p)p.ballEntityId=null;}
return {create,update,receive,contact,inactive,onExit,actor,raw,vec,clone,add,sub,mul,div,scale,sum,dot,constants:{radiusRaw:786432,frictionRaw:62259,weightRaw:3276800,fadeRaw:32768,reflectRaw:65536,minRaw:78643,smallReflectScaleRaw:78643},completePhysicsFidelity:false};});
