/* GoKart (actor 173) and Stick (224), 12-1, the playable reconstruction from the
 * saved Ghidra project ('GoKartComponent$$', 'PlayerComponent$$*GoKart*',
 * 'StickComponent$$'); source-gokart-devices.js keeps the earlier analysis
 * helpers. No game executed. Component offsets = quantum-field-offsets.json - 0x10.
 *  .cctor 0x18185f130: JUMP_VELO QFP._20, MAX_SPEED QFP._4; rects (H,W,X,Y)
 *   BODY (16,248,-34,-16), HEAD (40,40,-20,-56), HEAD2 (40,40,-20,-114);
 *   PLAYER_RIDE_POSITIONS (168,-10),(112,-10),(56,-10),(0,-10),(0,-68),(56,-68),
 *   (112,-68),(168,-68).
 *  Creator 0x18185c330: create position y - 0.5. ParseParameter 0x18185c6e0:
 *   QPlayerCountParam<FP> slot0 jump velocity, slot1 max speed (non-zero only).
 *  InitCollision 0x18185c970: body pushBack 3 layer 5; m_CenterX = W/2 + X;
 *   head pushBack 3 layer 1 widened to n = min(count,4) seats (W + (n-1)*56,
 *   X + (4-n)*56); above 4 players a second head row (W + (count-5)*56).
 *  OnStart: prepareDrivers (every player to state 11, collision off), drivers =
 *   min(count,4) consecutive from m_DriverIndex, ridePlayers.
 *  OnUpdate 0x18185d6b0: floating = body not contacted on face 1;
 *   updatePlayerInfos 0x18185dab0 (each driver's Jump press edge counts once per
 *   air time: InputTime resets on the ground); vx = calcSpeed 0x18185dfc0 (not
 *   auto scroll: += MAX*dt up to MAX, after event 61 value 0 -= MAX*dt to 0 and
 *   then getOff); vy = 0 on the ground, else calcGravity 0x18185ea10 (+0xa666,
 *   cap 0x138000, times base scale); presses this update and no head contact
 *   (isContactedHead 0x18185eb30) -> vy = min(vy, -calcJumpVelo) where
 *   calcJumpVelo 0x18185ebf0 = (1 - (1 - inputs/drivers)^2) * jump * scale.
 *  OnPost 0x18185edc0: ChassisRad += 4 pi dt, ChassisY = |Sin|, riders SetPosForce
 *   to pos + ride position + (0, ChassisY).
 *  OnRecvEvent 0x18185ee30: 26/43 -> every player gets it (notifyAllPlayerDead,
 *   dead flag 4); 61 with value 0 -> stop flag 2, otherwise changeNextDriverIndex
 *   0x18185ef80 (above four players the window moves back by four).
 *  OnContactAdded 0x18185f020: an upward contact (normal y < 0) zeroes a rising Velo.y.
 *  getOff 0x18185e370: riders back to state 1, kart collision off, a key held by
 *   the kart goes to the nearest rider.
 *  Stick: no prototype collider and no update/collision handler - a marker.
 */
(function(root,factory){const c=typeof module==='object'&&module.exports;const api=factory(c?require('./source-updownlift-math.js'):root.SourceUpDownLiftMath);if(c)module.exports=api;root.SourceGoKartRuntime=api;})(typeof globalThis!=='undefined'?globalThis:this,function(SinMath){
'use strict';
const F=65536,JUMP_VELO=20*F,MAX_SPEED=4*F,GRAVITY=0xa666,TERMINAL=0x138000,PI=205887;
const BODY={heightRaw:16*F,widthRaw:248*F,xRaw:-34*F,yRaw:-16*F},HEAD={heightRaw:40*F,widthRaw:40*F,xRaw:-20*F,yRaw:-56*F},HEAD2={heightRaw:40*F,widthRaw:40*F,xRaw:-20*F,yRaw:-114*F};
const RIDE=[[168,-10],[112,-10],[56,-10],[0,-10],[0,-68],[56,-68],[112,-68],[168,-68]];
const clone=v=>JSON.parse(JSON.stringify(v));
const allowed=(v,c)=>!v||v<0&&c<=-v||v>0&&v<10&&c>=v||v>=10&&c>=Math.trunc(v/10)&&c<=v%10;
const fp=v=>Math.trunc(Math.fround(Math.fround(v)*F));
const mul=(a,b)=>Number(BigInt.asIntN(64,BigInt(a)*BigInt(b))>>16n);
function fpTable(a,i){const d=(a.datas||[])[i];if(!d||d.t!==2||typeof d.s!=='string'||d.s.length!==56)return Array(7).fill(0);
 const t=[];for(let e=0;e<7;e++){let v=0n;for(let k=7;k>=0;k--)v=(v<<8n)|BigInt(((d.s.charCodeAt(e*8+k)&0xff)-0x21)&0xff);t.push(Number(BigInt.asIntN(64,v)));}return t;}
function findCount(t,count){if(count<2)return 0;for(let i=Math.min(count-2,6);i>=0;i--)if(t[i]!==0)return t[i];return 0;}
function compile(actors,count){
 if(!Number.isInteger(count)||count<2||count>8)throw Error('GoKart count 2..8 required');
 const karts=[],sticks=[];
 actors.forEach((raw,i)=>{const a=raw.properties||raw;if(!allowed(a.playerCount,count))return;
  if(a.typeName==='Stick'){sticks.push({id:raw.id||'source:a'+i,x:a.posX??raw.x,y:a.posY??raw.y});return;}
  if(a.typeName!=='GoKart')return;
  if((raw.createThreshold??a.createThreshold??0)!==0)throw Error('GoKart delayed creation ordering unresolved');
  const jump=findCount(fpTable(a,0),count),speed=findCount(fpTable(a,1),count),n=Math.min(count,4);
  const head={...HEAD,widthRaw:HEAD.widthRaw+(n-1)*56*F,xRaw:HEAD.xRaw+(4-n)*56*F},head2=count>4?{...HEAD2,widthRaw:HEAD2.widthRaw+(count-5)*56*F}:null;
  karts.push({id:raw.id||'source:a'+i,name:a.name||'',type:'GoKart',xRaw:fp(a.posX??raw.x),yRaw:fp(a.posY??raw.y)-0x8000,veloRaw:{xRaw:0,yRaw:0},
   playerCount:count,driverCount:n,driverIndex:0,inputCount:0,flags:0,centerXRaw:Number((BigInt(BODY.widthRaw)<<16n)/BigInt(2*F))+BODY.xRaw,chassisRadRaw:0,chassisYRaw:0,
   jumpVeloRaw:jump!==0?jump:JUMP_VELO,maxSpeedRaw:speed!==0?speed:MAX_SPEED,baseScaleRaw:F,rects:[BODY,head,...(head2?[head2]:[])],
   infos:Array.from({length:count},(_,k)=>({playerIndex:k,isDriver:0,nowInput:0,oldInput:0,eyeBlinkRaw:0,inputTimeRaw:0})),grounded:false,headContact:false,collisionActive:true,started:false});
 });
 if(karts.length>1)throw Error('GoKart: one kart per stage');
 return {schemaVersion:1,count,karts,sticks,completePhysicsFidelity:false};
}
const create=clone;
function setDrivers(k){for(const f of k.infos)f.isDriver=0;let j=k.driverIndex;for(let c=0;c<k.driverCount;c++){k.infos[j].isDriver=1;j=j+1<k.playerCount?j+1:0;}}
function start(k){k.flags|=1;k.driverCount=Math.min(k.playerCount,4);setDrivers(k);k.started=true;}
function changeNextDriverIndex(k){if(k.playerCount>4){const v=k.driverIndex-4+k.playerCount;k.driverIndex=v<k.playerCount?v:v-k.playerCount;}setDrivers(k);}
// inputs[i] = Jump held for player index i; playTimeRaw = Stage.m_PlayTime.
function updatePlayerInfos(k,inputs,playTimeRaw,floating,dtRaw){
 let count=0;
 if(k.flags&1)for(const f of k.infos){if(!f.isDriver)continue;f.oldInput=f.nowInput;f.nowInput=inputs[f.playerIndex]?1:0;
  if(!floating)f.inputTimeRaw=0;
  if(f.inputTimeRaw===0&&f.nowInput&&!f.oldInput){f.inputTimeRaw=playTimeRaw;count++;f.eyeBlinkRaw=32768;}}
 k.inputCount=count;
 for(const f of k.infos)if(f.eyeBlinkRaw>0)f.eyeBlinkRaw-=dtRaw;
}
function calcSpeed(k,vx,floating,dtRaw){
 if(!(k.flags&2)){vx=mul(k.maxSpeedRaw,dtRaw)+vx;return vx<=k.maxSpeedRaw?vx:k.maxSpeedRaw;}
 vx-=mul(dtRaw,k.maxSpeedRaw);if(vx<0)vx=0;if(vx!==0||floating)return vx;
 return null;// getOff
}
function jumpVelo(k){const x=F-Number((BigInt(k.inputCount)<<32n)/(BigInt(k.driverCount)<<16n));return mul(mul(F-mul(x,x),k.jumpVeloRaw),k.baseScaleRaw);}
/* OnUpdate. host: {inputs, playTimeRaw, dtRaw}. Returns {getOff:bool, jumped:bool}. */
function update(k,host){
 if(k.flags&4){k.veloRaw={xRaw:0,yRaw:0};return {getOff:false};}
 const floating=!k.grounded,dt=host.dtRaw;
 updatePlayerInfos(k,host.inputs,host.playTimeRaw,floating,dt);
 let vx=0,vy=k.veloRaw.yRaw,off=false;
 if(k.flags&1){const s=calcSpeed(k,k.veloRaw.xRaw,floating,dt);if(s===null){off=true;vx=0;}else vx=s;}
 if(!floating)vy=0;else{let n=vy+GRAVITY;if(n>=TERMINAL)n=TERMINAL;vy=vy+mul(n-vy,k.baseScaleRaw);}
 let jumped=false;
 if((k.flags&1)&&k.inputCount>0&&!k.headContact){const j=-jumpVelo(k);if(j<vy)vy=j;jumped=true;}
 k.veloRaw={xRaw:vx,yRaw:vy};
 if(off)getOff(k);
 return {getOff:off,jumped};
}
function getOff(k){k.flags&=~1;k.collisionActive=false;k.veloRaw={xRaw:0,yRaw:0};}
function post(k,dtRaw){
 k.chassisRadRaw+=mul(mul(4*F,PI),dtRaw);
 const s=SinMath.sinRaw(k.chassisRadRaw);k.chassisYRaw=Math.abs(s);
}
function ridePosition(k,index){const [x,y]=RIDE[index];return {xRaw:k.xRaw+x*F,yRaw:k.yRaw+y*F+k.chassisYRaw};}
function receiveEvent(k,e){
 const type=e.eventType??e.event;
 if(type===26||type===43){k.flags=(k.flags&~1)|4;return {allDead:type};}
 if(type===61){if(!e.value)k.flags|=2;else changeNextDriverIndex(k);return {};}
 return null;
}
function rectsAt(k){return k.rects.map((r,i)=>({index:i,layer:i===0?5:1,x:(k.xRaw+r.xRaw)/F,y:(k.yRaw+r.yRaw)/F,w:r.widthRaw/F,h:r.heightRaw/F}));}
function displays(state){return {karts:state.karts.map(k=>({id:k.id,x:k.xRaw/F,y:k.yRaw/F,riding:!!(k.flags&1),dead:!!(k.flags&4),chassisY:k.chassisYRaw/F,rects:rectsAt(k),drivers:k.infos.map(f=>!!f.isDriver)})),sticks:state.sticks};}
return {compile,create,start,update,post,getOff,ridePosition,receiveEvent,changeNextDriverIndex,jumpVelo,rectsAt,displays,supportedTypes:['GoKart','Stick'],
 nativeConstants:{JUMP_VELO,MAX_SPEED,GRAVITY,TERMINAL,BODY,HEAD,HEAD2,RIDE},completePhysicsFidelity:false};
});
