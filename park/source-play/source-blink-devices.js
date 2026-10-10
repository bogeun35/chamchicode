/* Native-derived PP2 BlinkBlock. Durations are native seconds, geometry Y-down.
 * Every constant below is quoted from GameAssembly.dll (imageBase 0x180000000).
 * Quantum struct offsets are the il2cpp field offsets minus the 16 byte header:
 *   BlinkBlockComponent m_Type +0, m_FuncType +1, m_IsAppearAtStart +4,
 *   m_IsVisibleTiming +8, m_ShowEffect +0xc, m_EntityRef +0x10,
 *   m_AppearTime +0x18, m_DisappearTime +0x20, m_Timer +0x28.
 * BlinkBlockComponent has no OnRecvEvent, so a BlinkBlock cannot be switched,
 * keyed or retargeted; it only ever runs its own timer. */
(function(root,factory){const api=factory();if(typeof module==='object'&&module.exports)module.exports=api;root.SourceBlinkDevices=api;})(typeof globalThis!=='undefined'?globalThis:this,function(){
'use strict';
const F=65536;
const overlap=(a,b)=>a.x<b.x+b.w&&a.x+a.w>b.x&&a.y<b.y+b.h&&a.y+a.h>b.y;
const clone=v=>JSON.parse(JSON.stringify(v));
const allowed=(v,c)=>!v||v<0&&c<=-v||v>0&&v<10&&c>=v||v>=10&&c>=Math.trunc(v/10)&&c<=v%10;
// .cctor 0x1817d1fa1..0x1817d203b: INTERVAL_TIME = FP 0x10000 (1 second),
// COLLISION_RECT = (Height 30, Width 30, X 1, Y 1) and
// COLLISION_RECT_BIG = (Height 46, Width 46, X 1, Y 1).
// RectFP member order is Height,Width,X,Y (il2cpp offsets 16/24/32/40) and X/Y
// are the top-left offset from the actor anchor, exactly as the DashBoard and
// Thorn tables in the sibling modules already use it. With a 48 px source tile
// that places the Large box dead centre in its cell (anchor+1 .. anchor+47 of a
// 48 cell) and the Small box dead centre of a 32 px cell.
const INTERVAL_TIME=1;
// The native timer is exact 16.16 fixed point integer arithmetic, so its `<= 0`
// test never suffers representation error. Frame.get_DeltaTime 0x18173a090 only
// forwards a runtime session field ([frame+0xc8] + 0x80), so the FP raw of the
// native delta is NOT in the binary and the exact tick count of a cycle could
// not be verified. This port runs on the caller's seconds delta and uses this
// tolerance so that an authored duration still expires on its exact tick
// instead of one tick late through accumulated float residue.
const TIMER_EPSILON=1e-9;
const BLOCK_RECTS=Object.freeze([Object.freeze({x:1,y:1,w:30,h:30}),Object.freeze({x:1,y:1,w:46,h:46})]);
const BLOCK_TYPE_NAMES=Object.freeze(['Small','Large']);
const FUNC_TYPE_NAMES=Object.freeze(['default','keep']);
const supportedTypes=['BlinkBlock'];

function numeric(actor,datas,index){
 const slot=datas[index];
 if(!slot||slot.t===0)return 0;
 if(slot.t!==1||!Number.isFinite(slot.f))throw new Error('Unsupported BlinkBlock numeric slot '+index+' on '+(actor.name||'unnamed'));
 return slot.f;
}
// ParseParameter 0x1817d147a/0x1817d14f9/0x1817d1523/0x1817d158e read a slot as
// `sar raw,0x10`, i.e. the arithmetic floor of the fixed point value.
function integer(actor,datas,index){return Math.floor(numeric(actor,datas,index));}

// Generic packed-seven slot decoder 0x18096f720: QActorCreateParam.AsString,
// then the byte loop at 0x18096f80c takes the LOW byte of every UTF-16 unit and
// subtracts 0x21, producing 56 bytes = seven little-endian FP raw longs, one per
// player count 2..8. Same encoding the Rect population offsets use.
function packedTable(actor,datas,index){
 const slot=datas[index];
 if(!slot||slot.t===0)return null;
 if(slot.t!==2||typeof slot.s!=='string')throw new Error('BlinkBlock slot '+index+' must be the packed player-count table');
 if(slot.s.length!==56)throw new Error('BlinkBlock slot '+index+' table must hold exactly seven packed values');
 const bytes=[];
 for(let i=0;i<56;i++)bytes.push(((slot.s.charCodeAt(i)&255)-0x21)&255);
 const table=[];
 for(let value=0;value<7;value++){
  let raw=0n;
  for(let b=7;b>=0;b--)raw=(raw<<8n)|BigInt(bytes[value*8+b]);
  if(raw>=1n<<63n)raw-=1n<<64n;
  const seconds=Number(raw)/F;
  if(!Number.isFinite(seconds))throw new Error('BlinkBlock slot '+index+' packed value out of range');
  table.push(seconds);
 }
 return table;
}
// ParseParameter 0x1817d1616..0x1817d1674 and 0x1817d16cc..0x1817d172e: index
// playerCount-2, then walk DOWN to lower player counts while the entry is zero.
// A zero result is skipped by the `!= FP._0` guard at 0x1817d16a2/0x1817d1754.
function packedValue(table,count){
 if(!table)return 0;
 for(let i=Math.min(count,8)-2;i>=0;i--)if(table[i])return table[i];
 return 0;
}

function compile(actors,count){
 if(!Number.isInteger(count)||count<2||count>8)throw new Error('BlinkBlock player count must be 2..8');
 if(!Array.isArray(actors))throw new Error('BlinkBlock compile needs the source actor list');
 const blocks=[],warnings=[];
 actors.forEach((raw,index)=>{
  const props=raw.properties||raw;
  if(props.typeName!=='BlinkBlock')return;
  if(!allowed(props.playerCount||0,count))return;
  if(props.createThreshold)throw new Error('Deferred BlinkBlock creation requires native timing');
  const pos=raw.position||{x:raw.x??raw.posX,y:raw.y??raw.posY};
  if(!Number.isFinite(pos.x)||!Number.isFinite(pos.y))throw new Error('Invalid BlinkBlock position');
  const datas=raw.datas||raw.parameters||[];
  // ParseParameter only ever reads datas[0..7]; higher slots are ignored by the
  // original, so they are reported instead of being guessed at.
  for(let i=8;i<datas.length;i++)if(datas[i]&&datas[i].t!==0)warnings.push((props.name||'BlinkBlock')+': slot '+i+' is unread by the original ParseParameter');
  // 0x1817d1597 `mov byte ptr [r12], bpl` -> m_Type, BlinkBlockType Small/Large.
  const blockType=integer(raw,datas,0);
  if(blockType!==0&&blockType!==1)throw new Error('Unknown BlinkBlockType '+blockType);
  // Creator 0x1817d12ef and Initialize 0x1817d13a0 preload BOTH durations with
  // INTERVAL_TIME, and ParseParameter 0x1817d15a0/0x1817d15aa only overwrites a
  // non-zero slot. A zero or absent slot therefore means one native second.
  let appearTime=numeric(raw,datas,1)||INTERVAL_TIME;
  let disappearTime=numeric(raw,datas,2)||INTERVAL_TIME;
  appearTime+=packedValue(packedTable(raw,datas,5),count);
  disappearTime+=packedValue(packedTable(raw,datas,6),count);
  if(!(appearTime>=0)||!(disappearTime>=0))throw new Error('Negative BlinkBlock duration');
  // 0x1817d15b5 `setne` -> m_IsAppearAtStart; 0x1817d15c1 -> m_FuncType = 1.
  const appearAtStart=integer(raw,datas,3)!==0;
  const funcType=integer(raw,datas,4)!==0?1:0;
  // 0x1817d175e..0x1817d17bc -> m_ShowEffect: slot7 <= 0 off, 1 always on,
  // otherwise on when playerCount >= slot7 + 1.
  const effectGate=integer(raw,datas,7);
  const showEffect=effectGate<=0?false:effectGate===1?true:count>=effectGate+1;
  const rect=BLOCK_RECTS[blockType];
  blocks.push({id:raw.id||'blink:'+index,name:props.name||'',type:'BlinkBlock',
   blockType,blockTypeName:BLOCK_TYPE_NAMES[blockType],
   anchor:{x:pos.x,y:pos.y},x:pos.x+rect.x,y:pos.y+rect.y,w:rect.w,h:rect.h,
   appearTime,disappearTime,appearAtStart,funcType,funcTypeName:FUNC_TYPE_NAMES[funcType],showEffect});
 });
 return {schemaVersion:1,count,blocks,warnings,completePhysicsFidelity:false};
}

// InitPost 0x1817d19e6..0x1817d19fa: the initial visibility, m_IsVisibleTiming
// and m_Timer all come from m_IsAppearAtStart; the timer starts at the duration
// of the state the block starts in.
function create(compiled){
 if(!compiled||compiled.schemaVersion!==1||!Array.isArray(compiled.blocks))throw new Error('Compiled BlinkBlock set required');
 return {count:compiled.count,ticks:0,blocks:compiled.blocks.map(b=>({...clone(b),
  visible:b.appearAtStart,visibleTiming:b.appearAtStart,
  timer:b.appearAtStart?b.appearTime:b.disappearTime,blocked:false}))};
}

function solids(state){
 return state.blocks.filter(b=>b.visible).map(b=>({id:b.id,name:b.name,type:'BlinkBlock',
  blockType:b.blockType,x:b.x,y:b.y,w:b.w,h:b.h,solid:true}));
}

// IsCollidedByPushBackTarget(scene,frame,collision,3) at 0x1817d1be9 (default)
// and 0x1817d1e65 (keep). The `3` is masked against the collision's own
// m_PushBackTarget, which InitCollision 0x1817d18e8 sets to 2 through
// Collision.initialize 0x181690b08. Bit 0 (MapComponent.IsContacted, the tile
// map) is therefore never consulted: only other ACTIVE colliders - players,
// boxes, other visible blocks - can stop a block from reappearing. Terrain
// cannot. Hiding is never blocked.
function obstructed(state,block,players,obstacles){
 const box={x:block.x,y:block.y,w:block.w,h:block.h};
 for(const p of players)if(!p.exit&&!p.dead&&overlap(box,p))return true;
 for(const other of state.blocks)if(other!==block&&other.visible&&overlap(box,other))return true;
 for(const o of obstacles)if(o&&o.id!==block.id&&overlap(box,o))return true;
 return false;
}

function beforeStep(state,{dt=1/60,players=[],obstacles=[]}={}){
 if(!Number.isFinite(dt)||dt<0)throw new Error('Invalid BlinkBlock delta');
 for(const b of state.blocks){
  b.blocked=false;
  // func_default 0x1817d1b31 / func_keep 0x1817d1d20: m_Timer -= Frame.DeltaTime
  // on every component update, and the state changes once it is <= 0.
  b.timer-=dt;
  if(b.funcType===1){
   // func_keep 0x1817d1cc0: m_IsVisibleTiming is the schedule and it flips on
   // its own cadence, so a blocked appearance loses that slot of the cycle
   // instead of delaying every later blink.
   if(b.timer<=TIMER_EPSILON){
    b.visibleTiming=!b.visibleTiming;
    b.timer=b.visibleTiming?b.appearTime:b.disappearTime;
   }
   if(b.visibleTiming){
    if(!b.visible){
     if(obstructed(state,b,players,obstacles))b.blocked=true;
     else b.visible=true;
    }
   }else b.visible=false;
  }else{
   // func_default 0x1817d1ad0: the live visibility flag IS the state, and each
   // duration starts when the state actually changes. A blocked appearance
   // leaves m_Timer at or below zero so it retries on every later update and
   // then gets a full m_AppearTime once the space is free.
   if(b.timer>TIMER_EPSILON)continue;
   if(b.visible){b.visible=false;b.timer=b.disappearTime;}
   else if(obstructed(state,b,players,obstacles))b.blocked=true;
   else{b.visible=true;b.timer=b.appearTime;}
  }
 }
 state.ticks++;
 return {solids:solids(state)};
}

// BlinkBlockComponent has no event handler and never kills or moves anybody, so
// afterStep only exists to satisfy the shared device interface.
function afterStep(state){return {events:[],deadPlayerIds:[],solids:solids(state)};}

// BlinkBlockView.OnUpdate 0x1805be9a9..0x1805bea9d: skipped unless m_ShowEffect
// and m_AppearTime > 0, then the shader float at +0x80 is
// clamp(1 - m_Timer / m_AppearTime, 0, 1). OnInitialize 0x1805be6ae/0x1805be75c
// also sets a sprite scale of 0.16 for Small and 0.24 for Large.
function effectFill(block){
 if(!block.showEffect||!(block.appearTime>0))return null;
 return Math.max(0,Math.min(1,1-block.timer/block.appearTime));
}

return {compile,create,solids,beforeStep,afterStep,effectFill,supportedTypes,
 nativeConstants:Object.freeze({intervalTime:INTERVAL_TIME,collisionRect:BLOCK_RECTS[0],collisionRectBig:BLOCK_RECTS[1],
  spriteScale:Object.freeze([0.16,0.24]),pushBackTarget:2,collisionLayer:4,collisionType:2}),
 integration:Object.freeze({
  order:'Call beforeStep before the player solver, next to Gates.beforeStep, and feed solids(state) into the solid list.',
  obstacles:'Pass actor colliders only (players are passed separately). The source tile map must NOT be passed: m_PushBackTarget 2 excludes it.',
  timing:'Durations are the authored stage decimals in seconds. The float->FP quantisation of those decimals and the exact FP raw of Frame.DeltaTime were not verified, so a cycle may be off by one native tick.',
  events:'None. BlinkBlockComponent has no OnRecvEvent.'}),
 completePhysicsFidelity:false};
});
