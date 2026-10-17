/* TopViewPlayer(144) special factory0x1816a4ac0 creates Player(27), then
 * Cardboard.Creator0x1817ebcd0 returns before allocation when parsed slot8
 * sets Player flag18 (0x1817ebdb0/7). slot8 0 (9-3 player 1) keeps the flag clear and
 * the factory creates that player's Cardboard (source-batenemy-devices.js). Initial PlayerState9:0x1816bdd89, slot8 flag18
 * 0x1816bdcc0. Native actorScene limit bit2:0x181698f70/create0x1816a4000.
 * TopView init0x1816c9d20: actorbit22, playerbit17(first-only),bodyflag7;
 * body28x32(-16,-29) from cctor0x1816cbb22..59/init0x1816bde50;
 * second regular46x32(-16,-47),pushBack0,layer1,pivot(0,-65536)
 * at0x1816c9e02..73; body priority-1/flag5 at0x1816bdf83..98.
 * Fall check0x1816ca690 CHECK_W=7/CHECK_H=2 fromcctor0x1816cc078/0a2;
 * map tile48 from Map.cctor0x18187e590; samples all chip>1 then middle
 * IsFall attr16 at0x1816cab55. Attributes80 bytes metadata6006064,
 * field24217 SHA2567ba700ca...4301a08; Get0x18178184a rejects >=79.
 * Input0x181887860 stick threshold13107(.2)cctor0x1816cc051; cardinal
 * FP65536, diagonal Angle*1143(0x1818879c0) then native FPSinCos table.
 * Four LUT pairs at index51435/154305/257175/360045, body4908336,
 * SHA2565c165988...19b8a9. Cos0x1816d3190/Sin0x1816465d0.
 * Default0x1816ca0d0: flag19/cardboard gate; Y then X; block attrbit0,
 * horizontal contact bool changes animation; Wind consumed once.
 * Fall0x1816caba0: shake6553,sound8,anim6,sort-1900,wait39321(.6);
 * phase1 velocity normalized offset*length divided131072(2),flags2bit8;
 * phase2 wait+=dt*393216(6),scale-=dt*wait clamp0,requeststate4;
 * stagefailbit10 unlessbit8. Offsets24/64:0x1816cc0be/0d7.
 * Existing shared Player/Cardboard lifecycle, animation and callbacks are host
 * contracts. JS safe integer/cycle guards are representation restrictions.
 */
(function(root,factory){const api=factory(typeof require==='function'?require('./source-distanceconstraint-math.js'):root.SourceDistanceConstraintMath);if(typeof module==='object'&&module.exports)module.exports=api;root.SourceTopViewPlayerDevices=api;})(globalThis,function(N){
'use strict';
const F=65536,T=48*F,THRESHOLD=13107;
const ATTR=[0,0,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,13,13,13,13,13,13,13,13,13,1,1,1,1,1,1,1,1,1,1,1,1,1,3,3,3,3,3,3,3,3,3,3,3,3,3,3,3,3,5,16,0,0,0,0,0,0,0,0,5,0];
const DIAGONALS={'1,1':{xRaw:46367,yRaw:46314},'-1,1':{xRaw:-46262,yRaw:46419},'-1,-1':{xRaw:-46470,yRaw:-46210},'1,-1':{xRaw:46158,yRaw:-46522}};
const BODY={heightRaw:28*F,widthRaw:32*F,xRaw:-16*F,yRaw:-29*F},HEAD={heightRaw:46*F,widthRaw:32*F,xRaw:-16*F,yRaw:-47*F};
const clone=x=>JSON.parse(JSON.stringify(x));
function raw(n,label='FP'){if(!Number.isSafeInteger(n))throw Error('TopViewPlayer exact safe raw required: '+label);return n;}
const i64=n=>BigInt.asIntN(64,n),num=n=>raw(Number(n));
const add=(a,b)=>num(i64(BigInt(raw(a))+BigInt(raw(b))));
const mul=(a,b)=>num(i64(BigInt(raw(a))*BigInt(raw(b)))>>16n);
const div=(a,b)=>{if(!b)throw Error('TopViewPlayer FP division zero');return num(i64(BigInt(raw(a))<<16n)/BigInt(raw(b)));};
function stageRaw(x){if(!Number.isFinite(x))throw Error('TopViewPlayer authored FP invalid');return raw(Math.trunc(Math.fround(Math.fround(x)*F)));}
function attributes(chip){return chip>=0&&chip<79?ATTR[chip]:0;}
function cell(map,x,y){if(!Number.isInteger(map.width)||!Number.isInteger(map.height)||!Array.isArray(map.chips))throw Error('TopViewPlayer native map chips required');const index=map.width*y+x;if(x<0||y<0||x>=map.width||y>=map.height||index>=4096)return 0;if(!Number.isInteger(map.chips[index]))throw Error('TopViewPlayer missing native map chip');return map.chips[index]&255;}
const pointCell=r=>Number(BigInt.asIntN(32,BigInt(div(r,T))>>16n));
function checkFall(a,map){const sx=mul(raw(a.scaleXRaw),raw(a.baseScaleRaw)),sy=mul(raw(a.scaleYRaw),a.baseScaleRaw),w=mul(sx,7*F),h=mul(sy,2*F),x=raw(a.xRaw),y=raw(a.yRaw);for(const p of[[add(x,-w),y],[add(x,w),y],[add(x,-w),add(y,-h)],[add(x,w),add(y,-h)]])if(cell(map,pointCell(p[0]),pointCell(p[1]))<=1)return false;return !!(attributes(cell(map,pointCell(x),pointCell(add(y,-div(h,2*F)))))&16);}
function getFallOffset(a,map){const x=raw(a.xRaw),y=raw(a.yRaw),ix=Math.trunc(Number(BigInt.asIntN(32,BigInt(x)>>16n))/48),iy=Math.trunc(Number(BigInt.asIntN(32,BigInt(y)>>16n))/48);let targetX=ix,targetY=iy,center=true;const current=cell(map,ix,iy);
 if(!(attributes(current)&16)){for(const[dX,dY]of[[0,-1],[0,1],[-1,0],[1,0]])if(attributes(cell(map,ix+dX,iy+dY))&16){targetX=ix+dX;targetY=iy+dY;break;}}
 else if(attributes(cell(map,ix,iy+1))&16){targetY=iy+1;center=false;}
 return{xRaw:add((targetX*48+24)*F,-x),yRaw:add((targetY*48+(center?24:0))*F,-y)};
}
// GetMoveVector takes the stick threshold from its caller: TopViewPlayer 0.2,
// RallyMallet QGameDefine +0x30 = 0.078125 (raw 5120).
function inputVector(input,thresholdRaw=THRESHOLD){if(!N)throw Error('TopViewPlayer native sqrt dependency absent');if(!input)return{xRaw:0,yRaw:0};const stick={xRaw:raw(input.stickXRaw),yRaw:raw(input.stickYRaw)};if(N.lengthRaw(stick)>=thresholdRaw)return stick;
 function pressed(k){const pair=input.buttons?.[k];if(!Array.isArray(pair)||pair.length!==2||!pair.every(Number.isInteger))throw Error('TopViewPlayer native Button int32 pair required: '+k);return(pair[1]|0)>(pair[0]|0);}
 const x=pressed('left')?-1:pressed('right')?1:0,y=pressed('up')?-1:pressed('down')?1:0;if(x&&y)return{...DIAGONALS[x+','+y]};return{xRaw:x*F,yRaw:y*F};
}
function fn(ctx,k){if(typeof ctx[k]!=='function')throw Error('TopViewPlayer native bridge requires '+k);return ctx[k];}
function playerMoveVector(p,input,stage){if(!p.wakeUpCount||(p.flags&128)||!(stage.flags&8)||(stage.flags&2)||stage.mode!==0)return{xRaw:0,yRaw:0};return inputVector(input);}
function initializeTopView(p,a,body,stage){raw(p.flags,'player flags');raw(stage.flags,'stage flags');const player={...p,state:0,topViewFunc:0},actor={...a,flags:(raw(a.flags)|(1<<22))>>>0},bodyCollision={...body},outStage={...stage},actions=[];
 if(!(p.flags&(1<<17))){player.flags=(player.flags|(1<<17))>>>0;bodyCollision.flags=(raw(bodyCollision.flags)|128)&65535;actions.push({kind:'createCollision',index:1,rect:clone(HEAD),pushBackTarget:0,isEnableSyncPos:true,layer:1,scalePivot:{xRaw:0,yRaw:-F}});outStage.flags=(raw(outStage.flags)|96)>>>0;}return{player,actor,bodyCollision,stage:outStage,actions};}
function finalizeTopView(p,a){return{player:{...p,flags:(raw(p.flags)&~(1<<15))>>>0},actor:{...a,flags:(raw(a.flags)&~(1<<22))>>>0}};}
function defaultStep(p,a,ctx){raw(p.flags,'player flags');raw(p.cardboardCoveredFlags,'cardboard flags');raw(p.wakeUpCount,'wakeUpCount');raw(ctx.stage.flags,'stage flags');if(!Number.isInteger(ctx.stage.mode))throw Error('TopViewPlayer native stage mode required');const player={...p},actor={...a},actions=[];let vx=0,vy=0;if(!(player.flags&(1<<19))&&player.cardboardCoveredFlags===0){const v=playerMoveVector(player,ctx.input,ctx.stage);let horizontalContact=false;
  if(v.yRaw){const probe=fn(ctx,'contactProbe')(0,v.yRaw<0?0:1,{includeMap:true,collectAttributes:true});if(!(probe.attribute&1))vy=raw(fn(ctx,'calcScreenEndWalkVeloY')(mul(v.yRaw,raw(player.walkSpeedRaw)),actor));}
  if(v.xRaw){actions.push({kind:v.xRaw>0?'lookRight':'lookLeft'});const probe=fn(ctx,'contactProbe')(0,v.xRaw<0?2:3,{includeMap:true,collectAttributes:true});horizontalContact=!!probe.contacted;if(!(probe.attribute&1))vx=raw(fn(ctx,'calcScreenEndWalkVeloX')(mul(v.xRaw,raw(player.walkSpeedRaw)),actor));}
  if(v.xRaw||v.yRaw)actions.push({kind:'playerSetAnim',animationId:horizontalContact?3:2,stop:false});
  else if(player.wakeUpCount){if([2,3,5].includes(player.currentAnimationId))actions.push({kind:'playerSetAnim',animationId:1,stop:true});}
  else if(player.currentAnimationId!==5){player.currentAnimationId=5;actor.requestAnimationId=5;}
 }
 actor.vxRaw=add(vx,raw(actor.windXRaw));actor.vyRaw=add(vy,raw(actor.windYRaw));actor.windXRaw=0;actor.windYRaw=0;return{player,actor,stage:{...ctx.stage},actions};
}
function fallStep(p,a,ctx){const player={...p},actor={...a},stage={...ctx.stage},actions=[],dt=raw(ctx.dtRaw,'dt');
 if(player.state===0){actions.push({kind:'cameraShake',amountRaw:6553},{kind:'actorPlaySe',seId:8,startRaw:F,endRaw:2*F},{kind:'playerExclamationShow',xRaw:add(actor.xRaw,(actor.flags&1024?-1:1)*mul(mul(actor.scaleXRaw,actor.baseScaleRaw),24*F)),yRaw:add(actor.yRaw,-mul(mul(actor.scaleYRaw,actor.baseScaleRaw),64*F))});if(player.currentAnimationId!==6){player.currentAnimationId=6;actor.requestAnimationId=6;}actions.push({kind:'setCollisionActive',value:false,owner:player.id},{kind:'setSortingOrder',value:-1900});actor.vxRaw=0;actor.vyRaw=0;player.flags=(player.flags|512)>>>0;player.waitTimerRaw=39321;player.state=1;}
 else if(player.state===1){player.waitTimerRaw=add(player.waitTimerRaw,-dt);if(player.waitTimerRaw<=0){const offset=getFallOffset(actor,ctx.map),len=N.lengthRaw(offset),normal=N.normalizeRaw(offset);actor.vxRaw=div(mul(normal.xRaw,len),2*F);actor.vyRaw=div(mul(normal.yRaw,len),2*F);player.flags2|=256;player.waitTimerRaw=0;player.state=2;}}
 else if(player.state===2){player.waitTimerRaw=add(player.waitTimerRaw,mul(dt,6*F));const scale=Math.max(0,add(actor.scaleXRaw,-mul(dt,player.waitTimerRaw)));actor.scaleXRaw=scale;actor.scaleYRaw=scale;player.preEarScaleRaw=scale;player.baseColor={rRaw:scale,gRaw:scale,bRaw:scale,aRaw:scale};if(scale<=0){player.requestedPlayerState=4;actor.vxRaw=0;actor.vyRaw=0;if(!(stage.flags&256))stage.flags=(stage.flags|1024)>>>0;player.state=3;}}
 return{player,actor,stage,actions};
}
function updateTopView(p,a,ctx){if(p.topViewFunc===0&&checkFall(a,ctx.map))return{player:{...p,state:0,topViewFunc:1},actor:{...a},stage:{...ctx.stage},actions:[],fallDetected:true};let r=p.topViewFunc===0?defaultStep(p,a,ctx):p.topViewFunc===1?fallStep(p,a,ctx):{player:{...p},actor:{...a},stage:{...ctx.stage},actions:[]};if(r.player.isFlashing===0)r.player.flashTimerRaw=0;else{r.player.flashTimerRaw=add(r.player.flashTimerRaw,-raw(ctx.dtRaw));if(r.player.flashTimerRaw<=0){r.player.isFlashing=0;r.player.flashTimerRaw=0;}}r.player.flags=(r.player.flags&~(1<<15))>>>0;return r;}
function allowed(v,n){return v===0||(v<0?n<=-v:v<10?n>=v:n>=Math.trunc(v/10)&&n<=v%10);}
function compile(actors,count,options={}){if(!Number.isInteger(count)||count<2||count>8)throw Error('TopViewPlayer population2..8 required');const inputs=actors.filter(a=>{const p=a.properties||a;return p.typeName==='TopViewPlayer'&&allowed(p.playerCount,count);});if(!inputs.length)return{schemaVersion:1,count,players:[],completePhysicsFidelity:false};if(options.nativeActorBridge!==true)throw Error('TopViewPlayer requires nativeActorBridge: ordinary Player/Cardboard creation, input, contact and constraint transport');if(!Array.isArray(options.framePlayerIndexList)||options.framePlayerIndexList.length!==count||!Array.isArray(options.gamePlayerInfo)||!Number.isInteger(options.actorSceneFlags))throw Error('TopViewPlayer requires exact native player index list, gamePlayerInfo and actorSceneFlags');let ordinal=options.existingPlayerActorCount??0;if(!Number.isInteger(ordinal)||ordinal<0)throw Error('TopViewPlayer invalid current native actor count');const players=[];
 for(const input of inputs){if((options.actorSceneFlags&4)&&ordinal>=count)continue;if(ordinal>=count)throw Error('TopViewPlayer native factory index outside player list');const a=input.properties||input;const info=options.gamePlayerInfo.find(p=>p.playerRef===options.framePlayerIndexList[ordinal]+1);if(!info)throw Error('TopViewPlayer native FindGamePlayerInfo missing; factory returns null');if(a.datas?.length<17)throw Error('TopViewPlayer native17slots required');const read=i=>a.datas[i]?.t===1?stageRaw(a.datas[i].f):0;for(const i of[1,2,3,4,5,6,7,9,10,11,16])if(read(i)!==0)throw Error('TopViewPlayer nondefault general Player parse branch requires host parser, slot'+i);const disableCardboard=Math.floor(read(8)/F)!==0;players.push({id:input.id||'topview:'+ordinal,name:a.name||'',type:'TopViewPlayer',sourceActorType:144,nativeActorType:27,playerIndex:options.framePlayerIndexList[ordinal],playerActorIndex:ordinal,colorIndex:info.colorIndex,state:0,topViewFunc:0,requestedPlayerState:9,parsePlayerFlagsSet:disableCardboard?1<<18:0,initDir:(Math.floor(read(0)/F)&255),xRaw:stageRaw(a.posX),yRaw:stageRaw(a.posY),requiresCardboard:!disableCardboard,cardboardCreationReason:disableCardboard?'disable-equip-cardboard':'equip-enabled'});ordinal++;}return{schemaVersion:1,count,players,completePhysicsFidelity:false};}
const create=clone;
function collisionDescriptors(state){return state.players.map(p=>({actorId:p.id,collisionIndex:0,shape:'rect',rect:clone(BODY),layer:1,priority:-1,pushBackTarget:3,isEnableSyncPos:true,flags:32,scalePivot:{xRaw:0,yRaw:-F}}));}
function beforeStep(state,ctx={}){if(!state.players.length)return{updates:[]};const get=fn(ctx,'topViewSnapshot'),apply=fn(ctx,'applyTopViewUpdate'),updates=[];for(const p of state.players){const snap=get(p.id);if(!snap)throw Error('TopViewPlayer native snapshot missing '+p.id);const r=updateTopView(snap.player,snap.actor,{...ctx,...snap.context});if(apply(p.id,r)!==true)throw Error('TopViewPlayer host transaction uncommitted');updates.push(r);}return{updates};}
function afterStep(){}
function solids(){return [];}
function displays(state){return state.players.map(p=>({id:p.id,type:p.type,name:p.name,playerIndex:p.playerIndex,colorIndex:p.colorIndex}));}
return{compile,create,beforeStep,afterStep,solids,displays,supportedTypes:['TopViewPlayer'],initializeTopView,finalizeTopView,updateTopView,defaultStep,fallStep,checkFall,getFallOffset,inputVector,playerMoveVector,collisionDescriptors,attributes,stageRaw,nativeConstants:{stickThresholdRaw:THRESHOLD,bodyRect:BODY,headRect:HEAD,diagonals:DIAGONALS},completePhysicsFidelity:false};
});
