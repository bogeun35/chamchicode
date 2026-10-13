/* TouchEnergy -> TouchEnergyComponent, creator ordinal 221, site 0x181776b22,
   Creator 0x18172f180. Static analysis only; no original code executed.
   This is a shared contact DAMAGE budget, not a charge meter.
   Initialize 0x18172f2e0..0x18172f336: scale=1, damage=1, interval=1.5,
   energy/max/target=10 (QFP statics 0x181780cc0).
   ParseParameter 0x18172f491/4aa/4c3: FP tables slots 3/4/5 select backwards
   from count-2, first nonzero; positive values override max/damage/interval.
   Slot 6 int table (0x180970770, seven little-endian int32s) controls bit0,
   visibility (0x18172f170) and smoothing (0x1817301d9).
   UI slots 0/1 add offsets 0/396; slot 2 scales by 9 above raw epsilon 4:
   .cctor stores at 0x18173042f/445/45b, Parse 0x18172f508..575.
   Contact pairs i<j across 8 players (0x18172f983, 0x18172fb88/97),
   timers at i*8+j initially zero, reset to zero on separation (0x18172fb83).
   First touch damages immediately; timer -= DeltaTime, <=0 damages and resets
   to interval (0x18172fa5b..faf1). Target clamped to zero (0x18172fac2).
   AABB four inequalities accept overlap or gaps <= QFP._0_01 raw 655
   (0x181730470..4e9; QFP .cctor 0x181780cc0 +0x18).
   Display energy moves at max*5 per second (0x181730242, QFP +0x140),
   clamp to target; hidden meters snap (0x1817301ed).
   At energy<=0 sends event 43 QuakeDead to actor type 27 Player once,
   then flag bit1 disables OnPost (0x1817302e7/2fe/30f, 0x18172f8b9).
   Sound 11 only while target>0 (0x1817300ce/110); shake raw 6553
   (0x18172fb4f reads QFP._0_10). FP is signed 16.16, truncating dt.
   Host must supply native world collision bounds and player state, without
   guessed sprite dimensions. Hit mark location is delegated to the host.
*/
(function(root,factory){const api=factory();if(typeof module==='object'&&module.exports)module.exports=api;root.SourceTouchEnergyDevices=api;})(typeof globalThis!=='undefined'?globalThis:this,function(){
'use strict';
const ONE=65536,MAX_PLAYERS=8,TOLERANCE_RAW=655;
const mul=(a,b)=>Number((BigInt(a)*BigInt(b))>>16n);
const allowed=(v,c)=>!v||v<0&&c<=-v||v>0&&v<10&&c>=v||v>=10&&c>=Math.trunc(v/10)&&c<=v%10;
function table(slot,width){
 if(!slot||slot.t!==2||typeof slot.s!=='string')throw Error('TouchEnergy missing player-count table');
 let s=slot.s;const length=7*width;
 if(s.length===length+2&&s[0]==='"'&&s.at(-1)==='"')s=s.slice(1,-1);
 if(s.length!==length)throw Error('TouchEnergy malformed player-count table');
 const out=[];
 for(let i=0;i<7;i++){
  let n=0n;for(let j=width-1;j>=0;j--)n=(n<<8n)|BigInt((s.charCodeAt(i*width+j)-33)&255);
  n=BigInt.asIntN(width*8,n);const value=Number(n);
  if(!Number.isSafeInteger(value))throw Error('TouchEnergy table exceeds safe integer range');
  out.push(value);
 }
 return out;
}
function find(values,count){for(let i=count-2;i>=0;i--)if(values[i]!==0)return values[i];return 0;}
function authoredRaw(slot){
 if(!slot||slot.t!==1)return 0;
 const raw=slot.f*ONE;
 if(!Number.isSafeInteger(raw))throw Error('TouchEnergy unverified authored float-to-FP conversion: '+slot.f);
 return raw;
}
function compile(actors,count,options){
 if(!Number.isInteger(count)||count<2||count>8)throw Error('TouchEnergy requires 2..8 players');
 const devices=[];
 actors.forEach((raw,i)=>{
  const a=raw.properties||raw;if(a.typeName!=='TouchEnergy'||!allowed(a.playerCount,count))return;
  const d=raw.datas||raw.parameters||[];
  const energyTable=table(d[3],8),damageTable=table(d[4],8),intervalTable=table(d[5],8),visibleTable=table(d[6],4);
  const initial=find(energyTable,count),damage=find(damageTable,count),interval=find(intervalTable,count);
  const maxRaw=initial>0?initial:10*ONE;
  const scale=authoredRaw(d[2]);
  devices.push({id:raw.id||'source:a'+i,name:a.name||'',type:'TouchEnergy',
   x:raw.position?.x??raw.x??raw.posX,y:raw.position?.y??raw.y??raw.posY,
   energyTable,damageTable,intervalTable,visibleTable,
   maxRaw,energyRaw:maxRaw,targetRaw:maxRaw,damageRaw:damage>0?damage:ONE,
   intervalRaw:interval>0?interval:98304,visible:find(visibleTable,count)!==0,
   uiPos:{x:authoredRaw(d[0])/ONE,y:396+authoredRaw(d[1])/ONE},
   uiScaleRaw:Math.abs(scale)>=4?mul(scale,9*ONE):ONE,
   exhausted:false,contactTimersRaw:new Array(64).fill(0)});
 });
 return {schemaVersion:1,count,devices,completePhysicsFidelity:false};
}
const create=c=>JSON.parse(JSON.stringify(c));
const solids=()=>[];
const beforeStep=()=>({events:[],solids:[]});
function validRect(r){return r&&['left','right','top','bottom'].every(k=>Number.isSafeInteger(r[k]))&&r.left<=r.right&&r.top<=r.bottom;}
function closeContact(a,b){
 return a.left<=b.right+TOLERANCE_RAW&&b.left<=a.right+TOLERANCE_RAW&&a.top<=b.bottom+TOLERANCE_RAW&&b.top<=a.bottom+TOLERANCE_RAW;
}
// ctx.players: index is native player index 0..7; nativeState==1 is required.
// collisionRectRaw: {left,right,top,bottom}, WORLD bounds in 16.16 integers;
// null means native GetCollision returned null. Missing data is an error.
function afterStep(state,{dt=1/60,players=[]}={}){
 if(!Number.isFinite(dt)||dt<0||!Number.isSafeInteger(Math.trunc(dt*ONE)))throw Error('Invalid TouchEnergy delta');
 const delta=Math.trunc(dt*ONE),events=[],hitMarks=[],sounds=[],cameraShakes=[];
 if(state.devices.every(d=>d.exhausted))return {events,hitMarks,sounds,cameraShakes,solids:[]};
 const indexed=new Map();
 for(const p of players){
  if(!Number.isInteger(p.index)||p.index<0||p.index>=MAX_PLAYERS||indexed.has(p.index))throw Error('TouchEnergy requires unique native player indices 0..7');
  if(!Number.isInteger(p.nativeState))throw Error('TouchEnergy requires explicit nativeState');
  if(p.nativeState===1&&p.collisionRectRaw!==null&&!validRect(p.collisionRectRaw))throw Error('TouchEnergy requires native collisionRectRaw for active players');
  indexed.set(p.index,p);
 }
 for(const d of state.devices){
  if(d.exhausted)continue;
  for(let i=0;i<MAX_PLAYERS;i++)for(let j=i+1;j<MAX_PLAYERS;j++){
   const a=indexed.get(i),b=indexed.get(j),slot=i*MAX_PLAYERS+j;
   if(!a||!b||a.nativeState!==1||b.nativeState!==1||!a.collisionRectRaw||!b.collisionRectRaw||!closeContact(a.collisionRectRaw,b.collisionRectRaw)){
    d.contactTimersRaw[slot]=0;continue;
   }
   d.contactTimersRaw[slot]-=delta;
   if(d.contactTimersRaw[slot]>0)continue;
   d.targetRaw=Math.max(0,d.targetRaw-d.damageRaw);d.contactTimersRaw[slot]=d.intervalRaw;
   hitMarks.push({deviceId:d.id,playerIndices:[i,j]});
   if(d.targetRaw>0)sounds.push({deviceId:d.id,seId:11});
   cameraShakes.push({deviceId:d.id,strengthRaw:6553});
  }
  if(d.energyRaw===d.targetRaw)continue;
  if(!d.visible)d.energyRaw=d.targetRaw;
  else{
   const step=mul(delta,mul(d.maxRaw,5*ONE));
   d.energyRaw=d.targetRaw<d.energyRaw?Math.max(d.targetRaw,d.energyRaw-step):Math.min(d.targetRaw,d.energyRaw+step);
  }
  if(d.energyRaw<=0){events.push({broadcastActorType:27,eventType:43,senderId:d.id});d.exhausted=true;}
 }
 return {events,hitMarks,sounds,cameraShakes,solids:[]};
}
function displays(state){return state.devices.map(d=>({id:d.id,visible:d.visible,energy:d.energyRaw/ONE,max:d.maxRaw/ONE,target:d.targetRaw/ONE,exhausted:d.exhausted,uiPos:d.uiPos,uiScale:d.uiScaleRaw/ONE}));}
return {compile,create,solids,beforeStep,afterStep,displays,supportedTypes:['TouchEnergy'],table,find,closeContact,
 nativeConstants:{fpOne:ONE,maxPlayers:MAX_PLAYERS,toleranceRaw:TOLERANCE_RAW},
 integration:{order:'afterStep once per native Post, after player movement',players:'Explicit native player index/state and collisionRectRaw world bounds; null collision is allowed',events:'Route event 43 QuakeDead to every actor type 27 Player; do not substitute ordinary Dead',visuals:'Place hitMarks through CollisionUtility.CalcCollidedCenterPosition; render sounds, cameraShakes and visible HUD'},completePhysicsFidelity:false};
});
