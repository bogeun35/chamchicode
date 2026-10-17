/* ColorBoxComponent: static simulation extraction; no original executable run.
 * creator ordinal7 -> 0x181802c40. Parse0x181802e80: width/height slots0/1
 * minus MARGIN262144(cctor0x1818040ff); X=-trunc(width/2),Y=-height.
 * slots2/3 player-list ordinal/excluded ordinal (modulo0x1818031ce/1d9);
 * slot4 jump bool; slots5/6 hatXY; slot7 positive hatScale default65536
 * (Initialize0x181802e60 QFP._1+0xf0). Frame.GetPlayerColorIndex0x1817465c0
 * matches GamePlayerInfo.playerRef=playerIndex+1, fallback color0.
 * Actor bits15/16,weight6553600:0x18180325f/266,0x181803392.
 * collision attribute2,layer2 or5,pushBackTarget3,syncPos true:0x1818032f8..32d.
 * start y-=49152:0x18180340a. update0x181803430: push vx +/-65536;
 * recursivePush0x1818038d0 exact asymmetric thresholds>65/<65.
 * jump input8/sound12/count1..13:0x181803631,710,647..64f;
 * hold factor FP((1-count/14)*13107):0x18180367a..6af.
 * forceX abs>=4:0x181803777; gravity Frame.GetGravity0x18180381a.
 * events0x181803da0:16 caught,27 force,30 index,36/37 signed force,
 * 65 capture hide/pause,66 release warp+velocity/flag17; all else Actor delegate.
 * Safe-integer guards and recursion-cycle refusal are JS representation limits.
 */
(function(root,factory){const api=factory();if(typeof module==='object'&&module.exports)module.exports=api;root.SourceColorBoxDevices=api;})(globalThis,function(){
'use strict';
const FP=65536,MARGIN=262144,START_Y=49152;
const clone=x=>JSON.parse(JSON.stringify(x));
function exact(n,label){if(!Number.isSafeInteger(n))throw Error('ColorBox exact raw required: '+label);return n;}
function wrapped(n){return exact(Number(BigInt.asIntN(64,n)),'signed64 result');}
const add=(a,b)=>wrapped(BigInt(a)+BigInt(b));
const mul=(a,b)=>wrapped(BigInt.asIntN(64,BigInt(a)*BigInt(b))>>16n);
function stageRaw(n){if(!Number.isFinite(n))throw Error('ColorBox nonfinite authored FP');return exact(Math.trunc(Math.fround(Math.fround(n)*FP)),'authored');}
const byte=n=>(n<<24)>>24;
function allowed(v,n){return v===0||(v<0?n<=-v:v<10?n>=v:n>=Math.trunc(v/10)&&n<=v%10);}
function decodeActor(input,index,options={}){const a=input.properties||input;if(!a.datas||a.datas.length<8)throw Error('ColorBox needs eight native parameter slots');const slot=i=>a.datas[i].t===1?stageRaw(a.datas[i].f):0;
 const list=options.framePlayerIndexList;if(!Array.isArray(list)||!list.length||!list.every(Number.isInteger))throw Error('ColorBox requires native Frame.GetPlayerIndexList');if(!Array.isArray(options.gamePlayerInfo))throw Error('ColorBox requires native Frame.GetGamePlayerInfoList color mapping');
 let ordinal=Math.floor(slot(2)/FP)%list.length;const excluded=Math.floor(slot(3)/FP);if(excluded>=0&&ordinal===excluded%list.length)ordinal=(ordinal+1)%list.length;if(ordinal<0)throw Error('ColorBox negative player ordinal indexes native list');
 const playerIndex=byte(list[ordinal]),info=options.gamePlayerInfo.find(p=>p.playerRef===playerIndex+1),colorIndex=info?(info.colorIndex&255):0;
 const w=add(slot(0),-MARGIN),h=add(slot(1),-MARGIN),jump= Math.floor(slot(4)/FP)!==0;
 return{id:a.name||'colorbox:'+index,name:a.name||'',type:'ColorBox',actorType:7,stageX:a.posX,stageY:a.posY,playerIndex,colorIndex,enableJump:jump,jumpCount:0,flags:0,forceXRaw:0,forceYRaw:0,hatXRaw:slot(5),hatYRaw:slot(6),hatScaleRaw:slot(7)>0?slot(7):FP,rect:{heightRaw:h,widthRaw:w,xRaw:-wrapped(BigInt.asIntN(64,BigInt(w)<<16n)/131072n),yRaw:-h},actorFlags:(1<<15)|(1<<16),weightRaw:6553600};}
function compile(actors,count,options={}){if(!Number.isInteger(count)||count<2||count>8)throw Error('ColorBox player count must be 2..8');const inputs=actors.filter(a=>{const p=a.properties||a;return p.typeName==='ColorBox'&&allowed(p.playerCount,count);});if(inputs.length&&options.nativeActorBridge!==true)throw Error('ColorBox requires nativeActorBridge: native contact cache, actor motion, player inputs and gravity');if(inputs.length&&options.framePlayerIndexList?.length!==count)throw Error('ColorBox native player index list length must match population');return{schemaVersion:1,count,boxes:inputs.map((a,i)=>decodeActor(a,i,options)),completePhysicsFidelity:false};}
const create=clone;
function collisionDescriptors(state){return state.boxes.map(b=>({actorId:b.id,collisionIndex:0,shape:'rect',rect:clone(b.rect),attribute:2,layer:b.enableJump?5:2,pushBackTarget:3,isEnableSyncPos:true}));}
function initialPositionRaw(b){return{xRaw:stageRaw(b.stageX),yRaw:add(stageRaw(b.stageY),-START_Y)};}
function fn(ctx,k){if(typeof ctx[k]!=='function')throw Error('ColorBox requires native bridge '+k);return ctx[k];}
function pushedByPlayer(b,actor,face,ctx,path=new Set()){
 const c=fn(ctx,'getCollision')(actor);if(!c)return false;if(path.has(c.id))throw Error('ColorBox native recursive contact cycle cannot be flattened');const next=new Set(path);next.add(c.id);
 const ids=fn(ctx,'getContactCollisionList')(c,face);if(!Array.isArray(ids))throw Error('ColorBox requires ordered native contact IDs');
 for(const id of ids){const other=fn(ctx,'getCollisionById')(id);if(!other)continue;const a=fn(ctx,'getActor')(other.actorId);if(!a)continue;const v=face===0||face===1?exact(a.vyRaw,'contact vy'):exact(a.vxRaw,'contact vx');const direction=face===0||face===2?v>65:face===1||face===3?v<65:false;
  if(direction&&other.layer===1){const p=fn(ctx,'getPlayer')(other.actorId);if(p&&byte(p.playerIndex)===b.playerIndex)return true;}
  if(pushedByPlayer(b,a,face,ctx,next))return true;
 }return false;
}
function jumpEligible(b,c,ctx){if(!b.enableJump||!c)return false;const contact=fn(ctx,'isContacted');const top=contact(c,0,true);const ground=!top&&contact(c,1,true);return ground||(b.jumpCount>=1&&b.jumpCount<=13);}
function update(b,input,ctx={}){const a={...input};exact(a.vxRaw,'actor vx');exact(a.vyRaw,'actor vy');const effects=[];
 if(b.flags&2){a.vxRaw=0;a.vyRaw=0;b.forceXRaw=0;b.forceYRaw=0;b.flags&=~1;return{actor:a,effects};}
 const c=fn(ctx,'getCollision')(a);if(!c)return{actor:a,effects};a.vxRaw=0;
 if(!b.enableJump){if(pushedByPlayer(b,a,2,ctx))a.vxRaw=FP;else if(pushedByPlayer(b,a,3,ctx))a.vxRaw=-FP;}
 if(a.vyRaw>=0)b.jumpCount=0;
 if(jumpEligible(b,c,ctx)){
  const p=fn(ctx,'getPlayerByIndex')(b.playerIndex);
  if(!p)b.jumpCount=0;
  else if(fn(ctx,'isPressInput')(p,8)){a.vyRaw=exact(fn(ctx,'getJumpVelo')(p,a),'player jumpVelo');b.jumpCount=1;effects.push({kind:'actorPlaySe',actorId:b.id,seId:12});}
  else if(b.jumpCount>=1&&b.jumpCount<=13&&fn(ctx,'isOnInput')(p,8)){const ratio=Math.trunc(b.jumpCount*FP/14),factor=mul(FP-ratio,13107);a.vyRaw=add(a.vyRaw,mul(exact(fn(ctx,'getJumpVelo')(p,a),'player jumpVelo'),factor));b.jumpCount=(b.jumpCount+1)&255;}
  else b.jumpCount=0;
 }
 const contact=fn(ctx,'isContacted');if(!contact(c,0,true)&&Math.abs(b.forceXRaw)>=4)a.vxRaw=add(a.vxRaw,b.forceXRaw);
 if(contact(c,1,true)){if(!(b.jumpCount===1&&a.vyRaw<0))a.vyRaw=0;if(!(b.flags&1)){b.forceXRaw=0;b.forceYRaw=0;}}
 else a.vyRaw=add(a.vyRaw,exact(fn(ctx,'getGravityRaw')(),'frame gravity'));
 if(b.flags&1){a.vyRaw=add(a.vyRaw,b.forceYRaw);b.flags&=~1;}
 return{actor:a,effects};
}
function onEvent(b,input,e){const a={...input},actions=[];let returnValue=0,handled=true;const t=e.eventType;
 if(t===30)returnValue=b.playerIndex+1;
 else if(t===16){b.flags=e.isCatched?(b.flags|2):(b.flags&~2);a.vxRaw=0;a.vyRaw=0;returnValue=1;}
 else if(t===27||t===36||t===37){b.forceXRaw=exact(e.vxRaw,'event vx');b.forceYRaw=exact(e.vyRaw,'event vy');if(t!==27){b.forceXRaw=Math.abs(b.forceXRaw);if(exact(a.vxRaw,'force sign actor vx')<0)b.forceXRaw=wrapped(BigInt.asIntN(64,-BigInt(b.forceXRaw)<<16n)>>16n);}b.flags|=1;}
 else if(t===65){actions.push({kind:'setVisible',value:false,owner:b.id},{kind:'setPause',value:true,owner:b.id});}
 else if(t===66){actions.push({kind:'setPause',value:false,owner:b.id});a.warpXRaw=exact(e.xRaw,'warp x');a.warpYRaw=exact(e.yRaw,'warp y');a.vxRaw=exact(e.vxRaw,'release vx');a.vyRaw=exact(e.vyRaw,'release vy');a.actorFlags=exact(a.actorFlags,'release actor flags')|(1<<17);}
 else{handled=false;actions.push({kind:'actorOnRecvEvent',event:clone(e)});}
 return{actor:a,actions,returnValue,handled};
}
function beforeStep(state,ctx={}){if(!state.boxes.length)return{effects:[],eventResults:[],collisionDescriptors:[]};const snapshots=fn(ctx,'actorSnapshot'),publish=fn(ctx,'applyActorPatch'),effects=[],eventResults=[];for(const b of state.boxes){let a=snapshots(b.id);if(!a)throw Error('ColorBox missing native actor snapshot '+b.id);for(const e of ctx.events||[])if(e.targetId===b.id||(e.targetName&&e.targetName===b.name)){const r=onEvent(b,a,e);if(r.actions.length)throw Error('ColorBox event requires immediate native Actor dispatch: call onEvent through host before update');a=r.actor;eventResults.push({actorId:b.id,eventType:e.eventType,handled:r.handled,returnValue:r.returnValue});}const r=update(b,a,ctx);publish(b.id,r.actor);effects.push(...r.effects);}return{effects,eventResults,collisionDescriptors:collisionDescriptors(state)};}
function afterStep(){}
function solids(){return [];}// Native descriptors require shared scene resolution, not generic browser solids.
function displays(state){return state.boxes.map(b=>({id:b.id,type:b.type,stageX:b.stageX,stageY:b.stageY,playerIndex:b.playerIndex,colorIndex:b.colorIndex,hatXRaw:b.hatXRaw,hatYRaw:b.hatYRaw,hatScaleRaw:b.hatScaleRaw}));}
return{compile,create,solids,beforeStep,afterStep,displays,supportedTypes:['ColorBox'],decodeActor,collisionDescriptors,initialPositionRaw,pushedByPlayer,jumpEligible,update,onEvent,stageRaw,nativeConstants:{fpRaw:FP,marginRaw:MARGIN,startYOffsetRaw:START_Y},completePhysicsFidelity:false};
});
