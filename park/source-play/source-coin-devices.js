/* Source-derived Coin / CoinObserver, static analysis only.
   Creator mapping: ordinal 4 -> CoinComponent.Creator 0x1817f2770;
   ordinal 5 -> CoinObserverComponent.Creator 0x1817f30b0.
   RectFP field order (quantum-field-offsets.json) is Height,Width,X,Y.
   .cctor stores height raw 0x260000=38 at 0x1817f2e92,
   width raw 0x160000=22 at 0x1817f2e82, x raw -0xb0000=-11 at
   0x1817f2ea0, y raw -0x130000=-19 at 0x1817f2ea9.
   InitCollision 0x1817f2a4a creates a trigger (true); 0x1817f2a69
   writes layer byte 4. No movement/update code: overrides are bare ret.
   OnStart 0x1817f2b2b adds the entity to the actor manager's observer.
   Observer Creator 0x1817f3283 stores its entity as that global observer.
   Initialize 0x1817f3316 allocates a list with initial capacity 0x80=128;
   capacity is not a success threshold. AddCoin 0x1817f35df appends;
   RemoveCoin 0x1817f369f removes the entity, not a player-index counter.
   OnCollided plays SeId 5 (0x1817f2bb3), removes the coin (0x1817f2c3b),
   and sets ActorComponent flags bit13 (0x1817f2c62), requesting deletion.
   Observer OnUpdate tests m_IsNotified (0x1817f348b), list Count > 0
   (0x1817f34da), and once empty sends event 1 (0x1817f34fa) to actor
   type 17=Key (0x1817f350c), then marks notified (0x1817f3515).
   There is no timer, RNG, authored threshold, or direct party multiplier.
   Population selection is ActorFactoryComponent.Update 0x1816a30ee..3147.
   Native collision contacts should be supplied as coinContacts; the players
   rectangle fallback uses the port's existing strict AABB convention and is
   not a claim that Quantum's complete collision pipeline is reproduced. */
(function(root,factory){const api=factory();if(typeof module==='object'&&module.exports)module.exports=api;root.SourceCoinDevices=api;})(typeof globalThis!=='undefined'?globalThis:this,function(){
'use strict';
const RECT=Object.freeze({x:-11,y:-19,w:22,h:38});
const KEY_TYPE=17,ACTIVATE=1,COIN_SE=5;
const supportedTypes=['Coin','CoinObserver'];
const allowed=(v,c)=>!v||v<0&&c<=-v||v>0&&v<10&&c>=v||v>=10&&c>=Math.trunc(v/10)&&c<=v%10;
const clone=x=>JSON.parse(JSON.stringify(x));
const overlap=(a,b)=>a.x<b.x+b.w&&a.x+a.w>b.x&&a.y<b.y+b.h&&a.y+a.h>b.y;
function compile(actors,count,options){
 if(!Number.isInteger(count)||count<2||count>8)throw Error('Coin player count must be 2..8');
 const coins=[],observers=[];
 actors.forEach((raw,i)=>{
  const a=raw.properties||raw;
  if(!supportedTypes.includes(a.typeName)||!allowed(a.playerCount,count))return;
  if((raw.createThreshold??a.createThreshold??0)!==0)throw Error('Deferred Coin/CoinObserver creation is not ported');
  const p=raw.position||{x:raw.x??raw.posX,y:raw.y??raw.posY};
  if(!Number.isFinite(p.x)||!Number.isFinite(p.y))throw Error('Coin actor position must be finite');
  const common={id:raw.id||'source:a'+i,type:a.typeName,name:a.name||'',x:p.x,y:p.y};
  if(a.typeName==='Coin')coins.push({...common,collected:false});
  else observers.push({...common,coinIds:[],isNotified:false});
 });
 if(observers.length>1)throw Error('Multiple CoinObservers: global manager replacement/lifecycle is not ported');
 if(new Set([...coins,...observers].map(x=>x.id)).size!==coins.length+observers.length)throw Error('Duplicate Coin actor IDs');
 if(observers.length)observers[0].coinIds=coins.map(c=>c.id);
 return {schemaVersion:1,count,coins,observers,warnings:[],completePhysicsFidelity:false};
}
const create=clone;
function solids(){return [];}
function beforeStep(state){
 const events=[];
 for(const o of state.observers){
  if(o.isNotified||o.coinIds.length>0)continue;
  events.push({broadcastActorType:KEY_TYPE,eventType:ACTIVATE,senderId:o.id});
  o.isNotified=true;
 }
 return {events,solids:[]};
}
function afterStep(state,ctx={}){
 const sounds=[],removedActorIds=[],collectedCoinIds=[];
 const players=ctx.players||[];
 // If supplied, these are already dispatched native-equivalent contacts.
 const contacts=ctx.coinContacts;
 for(const c of state.coins){
  if(c.collected)continue;
  const box={x:c.x+RECT.x,y:c.y+RECT.y,w:RECT.w,h:RECT.h};
  const hit=contacts!==undefined?contacts.some(q=>(typeof q==='string'?q:q.coinId)===c.id):
   players.some(p=>!p.dead&&!p.exit&&overlap(p,box));
  if(!hit)continue;
  c.collected=true;
  for(const o of state.observers){const i=o.coinIds.indexOf(c.id);if(i>=0)o.coinIds.splice(i,1);}
  sounds.push({coinId:c.id,seId:COIN_SE});
  removedActorIds.push(c.id);collectedCoinIds.push(c.id);
 }
 // Observer update occurs next tick, rather than in this collision callback.
 return {events:[],sounds,removedActorIds,collectedCoinIds,solids:[]};
}
function displays(state){return {coins:state.coins.filter(c=>!c.collected).map(c=>({id:c.id,x:c.x,y:c.y,type:c.type})),observers:state.observers.map(o=>({id:o.id,remaining:o.coinIds.length,isNotified:o.isNotified}))};}
return {compile,create,solids,beforeStep,afterStep,displays,supportedTypes,
 nativeConstants:Object.freeze({rect:RECT,keyActorType:KEY_TYPE,activateEvent:ACTIVATE,coinSeId:COIN_SE}),
 integration:Object.freeze({order:'beforeStep: observer Update; afterStep: collision collection; completion emits on the next beforeStep.',contacts:'Optional coinContacts array of coin IDs or {coinId}; authoritative dispatched contacts. Otherwise supply live player AABBs in players.',events:'Route broadcastActorType 17/eventType 1 to authored-inactive Keys. Remove/hide collected actor IDs and render displays().coins.',solids:'Empty; Coin is a trigger and CoinObserver has no collider.'}),completePhysicsFidelity:false};
});
