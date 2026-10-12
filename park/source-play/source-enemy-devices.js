/* Native-derived PP2 Bowwow2Enemy.
 *
 * Read-only static recovery from GameAssembly.dll; no native code was executed
 * and no original asset is embedded. Every constant below carries the address it
 * was read from. Unresolved points are listed in enemy-device-report.json and in
 * `unresolved` at the bottom of this file.
 *
 * Component: Bowwow2EnemyComponent (quantum-method-index.json)
 *   Creator          0x1817d46b0   ParseParameter 0x1817d48e0
 *   Initialize       0x1817d4870   InitCollision  0x1817d49b0
 *   InitPost         0x1817d4a90   OnUpdate       0x1817d4ae0
 *   checkPlayerMove  0x1817d4b60   updateState    0x1817d4dd0
 *   updateOffset     0x1817d5170   setState       0x1817d5300
 *   OnCollided       0x1817d5380   .cctor         0x1817d5470
 *   OnStart / OnPost 0x180476130 (`ret 0`, both empty)
 *   There is NO OnRecvEvent, OnExit, OnContacted or OnPushedBack, so no switch,
 *   key, gate or timer can target a Bowwow2Enemy and terrain never moves it.
 *
 * Fields, struct offsets = il2cpp offset - 16 (quantum-field-offsets.json):
 *   m_State +0 (Bowwow2Enemy_State: Idle 0, Attack 1, AttackAfter 2)
 *   m_SensorPlayerMax +1 (byte, read back signed: `movsx eax,byte[r13+1]`)
 *   m_TargetIndex +2 (sbyte, -1 = none)
 *   m_EntityRef +8 · m_AttackSpeed +0x10 (FP) · m_Sec +0x18 (FP)
 *   m_SensorDistance +0x20 (FP) · m_AttackVelo +0x28 (FPVector2)
 *
 * Statics, Bowwow2EnemyComponent class pointer 0x18316e9c8:
 *   RESOURCE_PATH +0 · SENSOR_DISTANCE_DEFAULT +8 · COLLISION_RECT +0x10
 *   SENSOR_MOVE +0x30
 *
 * The idle bob reads BowwowEnemyComponent's statics (class pointer 0x18316e9b8,
 * resolved from BowwowEnemyComponent..cctor 0x1817d65f0 and
 * BowwowEnemyComponent.updateOffset 0x1817d62e0, which reference the same
 * pointer): AMPTITUDE_SPEED +0x48 and AMPTITUDE +0x50. Bowwow2 reuses Bowwow1's
 * two constants and has none of its own.
 *
 * Kill path, end to end:
 *   OnCollided 0x1817d53d4 ignores every collision whose Collision.m_Layer
 *   (+1) is not 1. The player body is layer 1 (PlayerComponent.CreateEntity
 *   0x1816bdf87 `mov byte[rax+1],1`); this enemy's own collider is layer 8
 *   (InitCollision 0x1817d4a79).
 *   0x1817d53f9 ActorComponent.GetEventParam(self, 0x2b) - QEventType.QuakeDead
 *   = 43. GetEventParam 0x18169dc39 takes a QEventParamManager.Get() param,
 *   which is zeroed, so QEventParam.CauseDead (+0x6c) is Contact(0).
 *   0x1817d5410 Frame.NotifyEvent(frame, other.m_EntityRef (+0x18), param).
 *   PlayerComponent.OnRecvEvent 0x1816c1080: OnRecvEvent_Default 0x1816c6600
 *   handles only 0x24/0x1b/0x30/0x10/0x39/0x14, so 43 falls through to the
 *   dispatch at 0x1816c1199 -> 0x1816c14a2:
 *     m_Life (+0xd) <= 0                    -> 0x1816c144a `xor eax,eax` return
 *     CauseDead != Fall && IsImmortal()      -> return  (0x1816c14c3 test +0x20,0x100)
 *     ActorManagerComponent.m_ShareHitPoint (+0x98) missing / inactive /
 *     ShareHitPointComponent.DealDamage false -> 0x1816c16a0 KILL
 *   KILL 0x1816c16a0: m_Life = 0, Frame.ForcePlaySe(11), Frame.RequestShake,
 *   m_RequestedPlayerState = QPlayerState.Dead(3) at 0x1816c16dd.
 *   Only st_l_04_04 places a ShareHitPoint actor; no World stage does, so in
 *   st_w_07_02 a touch always kills a living, mortal player. The same event is
 *   what ThornComponent.KillPlayer 0x18172241e/0x18172249c sends, which is the
 *   cross-check that 43 is lethal.
 *
 * The enemy never blocks and never pushes: InitCollision passes 0 for
 * m_PushBackTarget (0x1817d4a57, stored by Collision.initialize 0x181690b08),
 * where a player passes 3. solids() is therefore always empty.
 */
(function(root,factory){const api=factory();if(typeof module==='object'&&module.exports)module.exports=api;root.SourceEnemyDevices=api;})(typeof globalThis!=='undefined'?globalThis:this,function(){
'use strict';

// ------------------------------------------------------------- fixed point
const F=65536;
const fp=v=>Math.round(v*F);
// `imul`+`sar 0x10`: an arithmetic shift, i.e. floor, not truncation.
const mulFp=(a,b)=>Math.floor(a*b/F);
// `shl 0x10`+`cqo`+`idiv`: truncation toward zero.
const divFp=(a,b)=>Math.trunc(a*F/b);

// --------------------------------------------------------- native constants
// Bowwow2EnemyComponent..cctor 0x1817d5470:
//   0x1817d558d  statics+8    = 0x27100000  SENSOR_DISTANCE_DEFAULT = 10000
//   0x1817d55a3  statics+0x10 = (0x4e0000, 0x3c0000)        COLLISION_RECT size
//   0x1817d55a7  statics+0x20 = (-0x1e0000, -0x270000)      COLLISION_RECT offset
//   0x1817d55b9  statics+0x30 = 0x20000     SENSOR_MOVE = 2
const SENSOR_DISTANCE_DEFAULT_FP=0x27100000;
const SENSOR_MOVE_FP=0x20000;
// The 32 byte rect is {FPVector2 Size; FPVector2 Offset} and the offset is the
// Y-down top-left corner relative to the actor anchor. Established from
// PlayerComponent..cctor 0x1816cbced..0x1816cbd22, which assembles
// COLLISION_RECT from COLLISION_W(32) COLLISION_H(46) COLLISION_X(-16)
// COLLISION_Y(-47) in exactly that memory order; those four are themselves
// PLAYER_W-SPACE_W, PLAYER_H-SPACE_H, -W/2 and -(H+SPACE_H/2), and -47 is the
// player anchor offset this runtime already uses.
const COLLISION_RECT=Object.freeze({w:78,h:60,x:-30,y:-39});
// BowwowEnemyComponent..cctor 0x1817d6795 statics+0x48 = 0x20000 (2) and
// 0x1817d67ab statics+0x50 = 0x80000 (8).
const AMPTITUDE_SPEED_FP=0x20000;
const AMPTITUDE_FP=0x80000;
// FPMath.Sin 0x1816465d0 reduces the angle modulo this raw constant
// (0x18164664b `imul rax, rdx, 0x6487e`); 0x6487e = 411774 = 2*pi.
const TWO_PI_FP=0x6487e;
// Bowwow2Enemy_State (quantum-field-offsets.json typeIndex 4334).
const STATE=Object.freeze({IDLE:0,ATTACK:1,ATTACK_AFTER:2});
const STATE_NAMES=Object.freeze(['Idle','Attack','AttackAfter']);
// setState 0x1817d533a..0x1817d5360 maps Idle->animation 1 and Attack->3 and
// leaves AttackAfter alone; updateState 0x1817d5142 writes animation 3 directly
// on the Idle->Attack edge. No call site for setState was found in the dumped
// Bowwow2/Bowwow code, so animation 1 is never requested by this component.
const ANIM_ATTACK=3;
// QEventType ordinals from the metadata enum, as recorded in
// thorn-ceiling-device-report.json: QuakeDead 43.
const EVENT_QUAKE_DEAD=0x2b;
// Collision.m_Layer values: 1 player body, 8 this enemy.
const LAYER_PLAYER=1;
const LAYER_ENEMY=8;
// PlayerComponent statics (PlayerComponent..cctor 0x1816cba37..0x1816cbb10):
// PLAYER_W 44, PLAYER_H 48, SPACE_W 12, SPACE_H 2, COLLISION_W 32,
// COLLISION_H 46, COLLISION_X -16, COLLISION_Y -47.
const PLAYER=Object.freeze({h:48,collisionX:-16,collisionY:-47,collisionW:32,collisionH:46});

// ------------------------------------------------------------ FP math ports
// FPMath.Sin 0x1816465d0: sign is stripped and re-applied around the lookup
// (`sar r8,0x3f` / `add rax,r8` / `xor rax,r8`), so the function is odd; that
// asymmetry is what rules out Cos. The angle is reduced modulo 2*pi and the raw
// angle indexes a table of int32 entries, giving 1/65536 rad resolution. This
// port recomputes the entry instead of reading the table.
function sinFp(angleFp){
 const sign=angleFp<0?-1:1;
 const reduced=Math.abs(angleFp)%TWO_PI_FP;
 return sign*Math.round(Math.sin(reduced/F)*F);
}

// The normalize helper 0x1816463a0 returns a packed (shift, mantissa) pair the
// caller turns into a reciprocal square root. Reproduced exactly, including the
// even bit-length chain and the two truncating divisions; only the table's
// rounding mode is assumed (see `unresolved`).
const TWO_POW_44=0x100000000000n;
const sqrtTable=i=>Math.round(Math.sqrt(i)*16384);
function sqrtHelper(x){
 if(x<=0x10000n)return {shift:0,mantissa:sqrtTable(Number(x))};
 let c=0n,d=x>>32n;
 if(d!==0n)c=32n;else d=x;                        // 0x1816463f9 sbb/and 0x20
 if(d>=0x10000n){d>>=16n;c+=16n;}                 // 0x18164640e
 const a=d>=0x100n?c+8n:c;                        // 0x18164641f cmovb
 const cc=d>=0x100n?d>>8n:d;                      // 0x181646430 cmovb
 const dd=cc>=0x10n?a+4n:a;                       // 0x18164643b cmovb
 const aa=cc>=0x10n?cc>>4n:cc;                    // 0x181646449 cmovb
 const n=aa>=4n?dd+2n:dd;                         // 0x181646454 cmovb
 const sh=Number(n-14n);                          // 0x181646457 sub ecx,0xe
 return {shift:sh>>1,mantissa:sqrtTable(Number(x>>BigInt(sh&0x3f)))};
}
// FPVector2 normalize as updateState 0x1817d4ff4..0x1817d5048 performs it:
// the squared length uses the RAW products with no shift, and a zero length
// short-circuits to the zero vector at 0x1817d504a.
function normalizeFp(dxFp,dyFp){
 const dx=BigInt(dxFp),dy=BigInt(dyFp),sq=dx*dx+dy*dy;
 if(sq===0n)return {x:0,y:0};
 const {shift,mantissa}=sqrtHelper(sq);
 if(!(mantissa>0))throw new Error('Bowwow2 normalize table produced a non-positive mantissa');
 const k=TWO_POW_44/BigInt(mantissa);              // 0x181646027 idiv, truncating
 const cl=BigInt((shift+14)&0x3f);                 // 0x181646015 add ecx,0xe / and 0x3f
 return {x:Number((dx*k)>>cl),y:Number((dy*k)>>cl)};
}

// ------------------------------------------------------------------ helpers
const overlap=(a,b)=>a.x<b.x+b.w&&a.x+a.w>b.x&&a.y<b.y+b.h&&a.y+a.h>b.y;
// Same population gate the sibling modules use for QActorCreateParam.playerCount.
const allowed=(v,c)=>!v||v<0&&c<=-v||v>0&&v<10&&c>=v||v>=10&&c>=Math.trunc(v/10)&&c<=v%10;
const clone=x=>JSON.parse(JSON.stringify(x));
// PlayerComponent.GetCenterPos 0x1816bfd20: the result is the actor anchor with
// PLAYER_H/2 subtracted on Y (0x1816bfddd multiplies scale by PLAYER_H, masks
// the fractional bits and halves it; 0x1816bfe00 negates it unless
// m_Flags bit 23 is set). With scale 1 that is anchor.y - 24, which is exactly
// the middle of the 46 tall collision box, so the port uses the box centre.
const playerAnchorX=p=>p.x-PLAYER.collisionX;
const playerAnchorY=p=>p.y-PLAYER.collisionY;
const playerCenterX=p=>playerAnchorX(p);
const playerCenterY=p=>playerAnchorY(p)-PLAYER.h/2;
// PlayerComponent.m_PlayerState == 1 (QPlayerState.Default) is the gate
// updateState 0x1817d4ee4 applies to its target, and the same gate the thorn
// module uses. m_Life <= 0 and IsImmortal are the two gates in the QuakeDead
// handler at 0x1816c14a2/0x1816c14c3.
const playerDefaultState=p=>!p.exit&&!p.dead&&
 (p.playerState===undefined||p.playerState===null
  ?(p.state===undefined||p.state===null?!p.faint:p.state===1)
  :p.playerState===1);
const playerKillable=p=>(p.life===undefined?1:p.life)>0&&!p.immortal;

// ------------------------------------------------------------------ compile
function compile(actors,count){
 if(!Number.isInteger(count)||count<2||count>8)throw new Error('Bowwow2Enemy player count must be 2..8');
 if(!Array.isArray(actors))throw new Error('Bowwow2Enemy compile needs the source actor list');
 const enemies=[],warnings=[];
 actors.forEach((raw,i)=>{
  const props=raw.properties||raw;
  if(props.typeName!=='Bowwow2Enemy')return;
  if(!allowed(props.playerCount,count))return;
  const pos=raw.position||{x:raw.x??raw.posX,y:raw.y??raw.posY};
  if(!Number.isFinite(pos.x)||!Number.isFinite(pos.y))throw new Error('Bowwow2Enemy needs a finite source anchor');
  const datas=raw.datas||raw.parameters||[];
  // ParseParameter 0x1817d48e0 reads exactly three slots and nothing else:
  //   slot0 0x1817d4914..0x1817d492a raw FP -> m_AttackSpeed      (0x1817d496e)
  //   slot1 0x1817d4934..0x1817d494b raw FP -> m_SensorDistance   (0x1817d4986)
  //   slot2 0x1817d4951..0x1817d496b `sar 0x10` -> m_SensorPlayerMax (0x1817d498f)
  // Anything above slot2 is unread, so an authored value there would be lost.
  for(let s=3;s<datas.length;s++){
   const d=datas[s];
   if(d&&(d.t===1&&d.f!==0||d.t===2&&d.s))
    warnings.push((props.name||'Bowwow2Enemy')+': slot '+s+' is unread by the original ParseParameter');
  }
  const slotFp=s=>datas[s]&&datas[s].t===1?fp(datas[s].f):0;
  // Creator 0x1817d47e0 writes SENSOR_DISTANCE_DEFAULT and 0x1817d47e7 writes
  // `mov word [rsi+1], 0xff02`, i.e. m_SensorPlayerMax 2 and m_TargetIndex -1,
  // BEFORE ParseParameter runs. Initialize 0x1817d48c4/0x1817d48c8 sets the
  // same three defaults.
  const attackSpeedFp=slotFp(0);
  // `mov rdx,rax; sar rdx,0x3f; lea rcx,[rdx+rax]; xor rcx,rdx; cmp rcx,4; jl`
  // - the slot is only stored when its absolute raw value reaches 4/65536.
  const sensorRawFp=slotFp(1);
  const sensorDistanceFp=Math.abs(sensorRawFp)>=4?sensorRawFp:SENSOR_DISTANCE_DEFAULT_FP;
  // `sar r8,0x10` then `mov byte[r9+1], r8b`, read back with `movsx`.
  const sensorPlayerRaw=Math.floor(slotFp(2)/F);
  const sensorPlayerByte=((sensorPlayerRaw&0xff)<<24)>>24;
  const sensorPlayerMax=sensorPlayerRaw===0?2:sensorPlayerByte;
  if(sensorPlayerRaw!==0&&sensorPlayerByte!==sensorPlayerRaw)
   throw new Error('Bowwow2Enemy datas[2] does not survive the native byte field: '+sensorPlayerRaw);
  if(attackSpeedFp<=0)
   throw new Error('Bowwow2Enemy m_AttackSpeed must be positive; a non-positive authored speed was never shipped and the chase direction would be inverted or frozen');
  if(sensorDistanceFp<=0)
   throw new Error('Bowwow2Enemy m_SensorDistance must be positive; the sensor compares an absolute distance against it at 0x1817d4cc1');
  if(sensorPlayerMax<=0)
   throw new Error('Bowwow2Enemy m_SensorPlayerMax must be positive; 0x1817d4d8b compares a signed count against it and a non-positive value was never shipped');
  enemies.push({
   id:raw.id||'source:a'+i,name:props.name||'',type:'Bowwow2Enemy',
   sourceX:pos.x,sourceY:pos.y,
   attackSpeedFp,sensorDistanceFp,sensorPlayerMax,
   rect:{...COLLISION_RECT},layer:LAYER_ENEMY,pushBackTarget:0});
 });
 return {schemaVersion:1,count,enemies,warnings,completePhysicsFidelity:false};
}

// ------------------------------------------------------------------- create
function create(compiled){
 if(!compiled||compiled.schemaVersion!==1||!Array.isArray(compiled.enemies))
  throw new Error('Compiled Bowwow2Enemy set required');
 return {count:compiled.count,ticks:0,
  // Stable actor roster. Frame.GetPlayerByActorIndex 0x181749610 indexes the
  // ActorScene player list (ActorSceneComponent.GetPlayerByActorIndex
  // 0x1816a8200 reads the list at +0x30), which is created once per stage. The
  // runtime hands this module a filtered live list, so the roster is rebuilt
  // append-only from the ids it sees and m_TargetIndex stays an index into it.
  roster:[],
  // MoveHistoryManageComponent, driven by PlayerMoveObserverComponent.OnPost
  // 0x1816d38b0 (its OnUpdate 0x180476130 is empty), records
  // actor.m_Pos - actor.m_PrePos once per tick (Update 0x1818851e3..0x18188521e).
  // GetAverage(..., 1) 0x1818852a0 returns that single newest entry, so the
  // sensor reads the displacement of the PREVIOUS tick.
  moveHistory:{},lastPos:{},
  // PlayerComponent.m_JumpCount (+0xb): OnUpdate_Default 0x1816c3b01 increments
  // it when a jump starts and 0x1816c3e5d zeroes it on landing, so "> 0" means
  // airborne after a jump. Reconstructed here from the runtime's own jump edge.
  jumpCount:{},grounded:{},jumpFrame:{},
  enemies:compiled.enemies.map(e=>({...clone(e),
   state:STATE.IDLE,                 // zero-initialised component
   targetIndex:-1,                   // Creator 0x1817d47e7 `mov word [rsi+1],0xff02`
   xFp:fp(e.sourceX),yFp:fp(e.sourceY),
   secFp:0,veloXFp:0,veloYFp:0,
   requestAnimationId:null,bobOffsetFp:0,
   collisionActive:true,lethal:true}))};
}

// --------------------------------------------------------------- collisions
// Collision.GetGlobalRect adds the actor position to the local rect, so the
// live box is anchor + COLLISION_RECT.offset with COLLISION_RECT.size.
const enemyBox=e=>({x:e.xFp/F+e.rect.x,y:e.yFp/F+e.rect.y,w:e.rect.w,h:e.rect.h});
function hazards(state){
 return state.enemies.map(e=>({...enemyBox(e),id:e.id+':body',sourceId:e.id,
  type:'Bowwow2Enemy',lethal:e.lethal!==false&&e.collisionActive!==false,
  layer:e.layer,state:e.state,stateName:STATE_NAMES[e.state]||String(e.state)}));
}
// m_PushBackTarget is 0 (InitCollision 0x1817d4a57) - never a solid.
function solids(){return [];}

// ------------------------------------------------------------- simulation
// checkPlayerMove 0x1817d4b60.
function checkPlayerMove(state,e,roster){
 // 0x1817d4bc7 `cmp byte[r13+2],0; jge` - once a target is latched the whole
 // sensor is skipped for good.
 if(e.targetIndex>=0)return;
 let qualifying=0;                            // r15d
 let bestFp=SENSOR_DISTANCE_DEFAULT_FP;       // edi = 0x27100000
 let bestIndex=-1;                            // r12d
 const anchorXFp=e.xFp;
 for(let i=0;i<roster.length;i++){
  const p=roster[i];
  if(!p)continue;                             // GetPlayerByActorIndex returned null
  // 0x1817d4c7e `cmp byte[rsi+0xb],0; jg` - a player that has jumped and not
  // landed is latched immediately, with no distance and no count gate, and the
  // loop ends there.
  if((state.jumpCount[p.id]||0)>0){e.targetIndex=i;return;}
  const dFp=playerAnchorX(p)*F-anchorXFp;
  const absFp=Math.abs(dFp);
  // 0x1817d4cc1 `cmp rbx,[r13+0x20]; jge` - strictly inside m_SensorDistance.
  if(absFp>=e.sensorDistanceFp)continue;
  const h=state.moveHistory[p.id];
  if(!h)continue;                             // no MoveHistoryManageComponent yet
  // 0x1817d4d18..0x1817d4d62: FPMath.Sqrt((dx*dx>>16)+(dy*dy>>16)) >= SENSOR_MOVE.
  // Compared as squares here, which is the same decision for every value that
  // is not within one raw unit of the threshold.
  const sqFp=Math.floor(h.xFp*h.xFp/F)+Math.floor(h.yFp*h.yFp/F);
  if(sqFp<Math.floor(SENSOR_MOVE_FP*SENSOR_MOVE_FP/F))continue;
  qualifying++;
  // 0x1817d4d69 `cmp rbx,rdi; cmovge` - strictly nearer wins, ties keep the
  // lower actor index.
  if(absFp<bestFp){bestFp=absFp;bestIndex=i;}
 }
 // 0x1817d4d86 `movsx eax,byte[r13+1]; cmp r15d,eax; jl`
 if(qualifying>=e.sensorPlayerMax)e.targetIndex=bestIndex;
}

// updateOffset 0x1817d5170, the idle bob. m_Sec accumulates Frame.DeltaTime and
// the actor's Y takes the DIFFERENCE between the new and the old
// AMPTITUDE*Sin(AMPTITUDE_SPEED*m_Sec), so the bob is applied incrementally and
// survives into the chase.
function updateOffset(e,dtFp){
 const angleOld=mulFp(e.secFp,AMPTITUDE_SPEED_FP);
 const offsetOld=mulFp(sinFp(angleOld),AMPTITUDE_FP);
 e.secFp+=dtFp;                                        // 0x1817d523d/0x1817d5241
 let angleNew=mulFp(e.secFp,AMPTITUDE_SPEED_FP);
 const offsetNew=mulFp(sinFp(angleNew),AMPTITUDE_FP);
 // 0x1817d527e `cmp rsi,0x6487e` - the phase wraps once the angle passes 2*pi,
 // and m_Sec is divided back out of the reduced angle.
 if(angleNew>=TWO_PI_FP){
  angleNew-=TWO_PI_FP;
  e.secFp=divFp(angleNew,AMPTITUDE_SPEED_FP);
 }
 e.yFp+=offsetNew-offsetOld;                           // 0x1817d52d3 add [r14+0xb8]
 e.bobOffsetFp=offsetNew;
}

// updateState 0x1817d4dd0.
function updateState(state,e,roster,dtFp){
 if(e.state===STATE.IDLE){
  updateOffset(e,dtFp);                                // 0x1817d50e9
  // 0x1817d50ee `cmp byte[rbx+2],0; jl` - stay idle until the sensor latched.
  if(e.targetIndex<0)return;
  e.state=STATE.ATTACK;                                // 0x1817d512a
  e.requestAnimationId=ANIM_ATTACK;                    // 0x1817d5142
  return;                                              // no movement on this tick
 }
 if(e.state===STATE.ATTACK){
  const p=e.targetIndex>=0?roster[e.targetIndex]:null;
  // 0x1817d4e9f `js` (no target) and 0x1817d4ec6 `je` (GetPlayerByActorIndex
  // returned null) both fall straight through to the position update without
  // touching the state or the velocity.
  if(p){
   if(!playerDefaultState(p)){
    // 0x1817d4ee4 `cmp byte[r14+3],1; jne` -> 0x1817d4f25 `mov byte[rbx],2`
    e.state=STATE.ATTACK_AFTER;
   }else{
    const dxFp=Math.round(playerCenterX(p)*F)-e.xFp;
    const dyFp=Math.round(playerCenterY(p)*F)-e.yFp;
    const dir=normalizeFp(dxFp,dyFp);
    e.veloXFp=mulFp(dir.x,e.attackSpeedFp);            // 0x1817d505a/0x1817d505f
    e.veloYFp=mulFp(dir.y,e.attackSpeedFp);            // 0x1817d506b/0x1817d5070
    // 0x1817d5080 LookLeft/LookRight. ActorComponent.LookLeft 0x18169de75 only
    // writes IsFlipH when EnableChangeLookDir (m_Flags bit 14) is set, and this
    // enemy's Creator 0x1817d4843 sets only bit 9 (EnableFlipH), so both calls
    // are inert. Recorded for the renderer, never used by the simulation.
    e.lookLeft=e.veloXFp>0;
   }
  }
  e.xFp+=e.veloXFp;e.yFp+=e.veloYFp;                   // 0x1817d4f4e..0x1817d4f72
  return;
 }
 if(e.state===STATE.ATTACK_AFTER){
  // 0x1817d4e4c: keep flying with the last velocity, never re-aim again.
  e.xFp+=e.veloXFp;e.yFp+=e.veloYFp;
 }
}

function toFp(dt){
 if(!Number.isFinite(dt)||dt<0)throw new Error('Invalid Bowwow2Enemy delta');
 return Math.round(dt*F);
}

// The enemy adds no solid and carries nobody, so nothing has to happen before
// the player solver. beforeStep exists to satisfy the shared device interface.
function beforeStep(state,{dt=1/60}={}){toFp(dt);return {solids:[]};}

function afterStep(state,{dt=1/60,players=[]}={}){
 const dtFp=toFp(dt);
 // Roster upkeep. Frame.GetPlayerByActorIndex walks a list built once at stage
 // start, so an id that disappears from the live list keeps its slot and is
 // reported as a non-Default-state player, which is the branch the native takes
 // for a player that left QPlayerState.Default.
 const byId=new Map();
 for(const p of players){
  if(!state.roster.includes(p.id))state.roster.push(p.id);
  byId.set(p.id,p);
 }
 const roster=state.roster.map(id=>byId.get(id)||null);
 // PlayerComponent.m_JumpCount, as of this tick: the player actors run their
 // OnUpdate before this enemy's (it is created after them in the stage actor
 // list), so the enemy sees the current tick's value.
 for(const p of players){
  const wasGrounded=state.grounded[p.id];
  const frame=p.jumpFrame||0;
  if(frame===1&&(state.jumpFrame[p.id]||0)!==1)state.jumpCount[p.id]=(state.jumpCount[p.id]||0)+1;
  if(p.grounded)state.jumpCount[p.id]=0;
  state.grounded[p.id]=!!p.grounded;state.jumpFrame[p.id]=frame;
  void wasGrounded;
 }
 const events=[],dead=new Set();
 for(const e of state.enemies){
  checkPlayerMove(state,e,roster);                     // OnUpdate 0x1817d4b3a
  updateState(state,e,roster,dtFp);                    // OnUpdate 0x1817d4b5a
 }
 // Collision phase. The native resolves contacts after every actor's OnUpdate
 // and before OnPost, which is where this sits. A chase step is m_AttackSpeed
 // pixels (10 in st_w_07_02), far smaller than both the 32x46 player box and
 // the 78x60 enemy box, so a discrete post-move overlap sees exactly what the
 // native collision phase would and no sweep is needed.
 for(const e of state.enemies){
  if(e.collisionActive===false)continue;
  const box=enemyBox(e);
  for(const p of players){
   if(!overlap(box,p))continue;
   // OnCollided 0x1817d53d4: only Collision.m_Layer 1 is answered at all.
   if((p.layer===undefined?LAYER_PLAYER:p.layer)!==LAYER_PLAYER)continue;
   const killable=playerDefaultState(p)&&playerKillable(p)&&!dead.has(p.id);
   events.push({event:EVENT_QUAKE_DEAD,playerId:p.id,source:e.id,
    reason:'bowwow2EnemyQuakeDead',lethal:killable});
   if(killable)dead.add(p.id);
   // 0x1817d5415 `cmp byte[rdi],1` then 0x1817d5450 `mov byte[rdi],2`: the hit
   // ends the homing even when the player survives it.
   if(e.state===STATE.ATTACK)e.state=STATE.ATTACK_AFTER;
  }
 }
 // PlayerMoveObserverComponent.OnPost 0x1816d38b0 -> MoveHistoryManageComponent
 // .Update 0x1818850f0 runs last, so what it stores is read on the NEXT tick.
 for(const p of players){
  const last=state.lastPos[p.id];
  const x=playerAnchorX(p),y=playerAnchorY(p);
  if(last)state.moveHistory[p.id]={xFp:Math.round((x-last.x)*F),yFp:Math.round((y-last.y)*F)};
  state.lastPos[p.id]={x,y};
 }
 state.ticks++;
 return {events,deadPlayerIds:[...dead],hazards:hazards(state),solids:[]};
}

// ------------------------------------------------------------------ reports
const status=state=>state.enemies.map(e=>({id:e.id,name:e.name,
 state:e.state,stateName:STATE_NAMES[e.state]||String(e.state),
 targetIndex:e.targetIndex,
 targetId:e.targetIndex>=0?state.roster[e.targetIndex]||null:null,
 x:e.xFp/F,y:e.yFp/F,sec:e.secFp/F,
 veloX:e.veloXFp/F,veloY:e.veloYFp/F,
 bobOffset:e.bobOffsetFp/F,
 attackSpeed:e.attackSpeedFp/F,sensorDistance:e.sensorDistanceFp/F,
 sensorPlayerMax:e.sensorPlayerMax,
 requestAnimationId:e.requestAnimationId,
 box:enemyBox(e)}));

return {compile,create,solids,hazards,beforeStep,afterStep,status,
 sinFp,normalizeFp,sqrtHelper,mulFp,divFp,
 supportedTypes:['Bowwow2Enemy'],
 nativeConstants:Object.freeze({
  sensorDistanceDefault:SENSOR_DISTANCE_DEFAULT_FP/F,
  sensorMove:SENSOR_MOVE_FP/F,
  amptitudeSpeed:AMPTITUDE_SPEED_FP/F,
  amptitude:AMPTITUDE_FP/F,
  twoPi:TWO_PI_FP/F,
  collisionRect:COLLISION_RECT,
  defaults:Object.freeze({sensorPlayerMax:2,targetIndex:-1,state:STATE.IDLE}),
  states:STATE,stateNames:STATE_NAMES,
  attackAnimationId:ANIM_ATTACK,
  layers:Object.freeze({player:LAYER_PLAYER,enemy:LAYER_ENEMY}),
  events:Object.freeze({quakeDead:EVENT_QUAKE_DEAD}),
  player:PLAYER}),
 integration:Object.freeze({
  order:'beforeStep next to the other device beforeStep calls (no-op); afterStep after the player solver, next to the other lethal modules.',
  solids:'None. Never add this module to the solid list - m_PushBackTarget is 0.',
  hazards:'afterStep().hazards are Y-down boxes for display; the module resolves the lethal contact itself and returns deadPlayerIds.',
  events:'afterStep().events carries the QEventType.QuakeDead (43) notifications. Nothing else in the stage answers 43, so they are informational; the death is already in deadPlayerIds.',
  signal:'None. Bowwow2EnemyComponent declares no OnRecvEvent, so no switch, key, gate or timer can target it.',
  network:'enemies[].state/targetIndex/xFp/yFp/secFp/veloXFp/veloYFp plus roster/moveHistory/lastPos/jumpCount/grounded/jumpFrame are the whole simulation state and must all travel in online.js DEVICE_STATES.',
  renderer:'status() reports the box, the state name and requestAnimationId so play.js can draw the dog and its idle bob.'}),
 unresolved:Object.freeze([
  'The sin/sqrt lookup tables themselves could not be read (they are runtime-built arrays reached through a static pointer). This port recomputes the entries as round(sin(a)*65536) and round(sqrt(x)*16384); the rounding mode of the shipped tables is unverified. The worst case is one raw unit in the normalized direction, i.e. under 0.0002 px per tick of chase movement.',
  'Frame.DeltaTime is a runtime session field (Frame.get_DeltaTime 0x18173a090 only forwards it), so the exact FP raw of a native 60 Hz tick is not in the binary. dt is rounded to raw here, as in the sibling modules.',
  'PlayerComponent.m_JumpCount is reconstructed from the runtime jump edge (p.jumpFrame going to 1 while airborne, cleared when p.grounded). The native counter would also be non-zero for any other code path that calls the jump routine; none was surveyed.',
  'Whether an exited (goal) player stays in the ActorScene player list that Frame.GetPlayerByActorIndex walks was not established. The roster here keeps the slot and reports a non-Default state, which takes the native 0x1817d4ee4 branch rather than the null branch.',
  'ActorComponent.m_Flags bit 9 is EnableFlipH (IsEnableFlipH 0x18169ce80 tests 0x200) and is set by both Creator 0x1817d4843 and InitPost 0x1817d4ad2. Presentation only. No flag that removes the actor off-map is set (EnableDeadOutMap is bit 18, IsEnableDeadOutMap 0x18169d000), so this port keeps the enemy alive forever once it flies out of the map; whether some other system retires it was not established.',
  'setState 0x1817d5300 (Idle -> animation 1, Attack -> 3) has no call site in the dumped Bowwow2/Bowwow code, so the idle animation id is whatever ActorFactory leaves and is reported as null.',
  'QActorType of this enemy was not read; OnCollided gates on Collision.m_Layer only, so it does not affect the simulation.',
  'BowwowEnemy (the sibling, BowwowEnemyComponent 0x1817d55d0..0x1817d65f0) is a DIFFERENT component with five states (Sleep, SleepWarning, Wake, Attack, AttackAfter), its own WARNING_DISTANCE_FIRST 300 / WARNING_DISTANCE 400 / WAKEUP_PLAYER_VELO 1.5 statics and an m_TargetMoveMax field. It shares only the collision rect and the two AMPTITUDE constants. It is deliberately NOT implemented: the extracted world has zero BowwowEnemy actors.']),
 completePhysicsFidelity:false};
});
