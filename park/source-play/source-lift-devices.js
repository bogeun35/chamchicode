/* Source-derived WeightedLift family (WeightedLiftEx), recovered statically from
   GameAssembly.dll. No native code, source assets or file IO.

   WHICH COMPONENT RUNS WHICH ACTOR TYPE
   creator-delegates-resolved.local.json (ActorFactoryComponent creator table,
   call sites in the 0x1817762e8..0x181776446 block):
     ordinal 45 WeightedLift         -> NormalWeightedLiftComponent.Creator  0x181889900
     ordinal 46 WeightedLiftEx       -> ExtraWeightedLiftComponent.Creator   0x18183aef0
     ordinal 47 WeightedLiftSingle   -> ExtraWeightedLiftComponent.Creator   0x18183aef0  (SAME delegate)
     ordinal 66 DarknessWeightedLift -> VariableWeightedLiftComponent.Creator 0x181733070
     ordinal 40 UpDownLift / 65 RouletteLift / 73 Lift / 103 LinePathLift -> own components
   Normal/Extra/Variable are thin wrappers; the simulation lives in the shared
   WeightedLiftComponent. ExtraWeightedLiftComponent.Creator 0x18183aef0 runs
   exactly three calls on it:
     WeightedLiftComponent.Initialize   0x181737990  (at 0x18183afeb)
     ExtraWeightedLiftComponent.ParseParameter 0x18183b160 (at 0x18183b0fa)
     WeightedLiftComponent.InitCollision 0x181737a50 (at 0x18183b10b)
   and ExtraWeightedLiftComponent.OnUpdate 0x18183b8c0 is a pure tail call
   (0x18183b95d jmp) into WeightedLiftComponent.OnUpdate 0x181737be0.

   STRUCT LAYOUT - quantum-field-offsets.json WeightedLiftComponent; il2cpp
   offsets minus the 16 byte header give the raw struct offsets the
   disassembly uses (the same -16 rule actor-runtime.js states for
   SwitchComponent):
     +0x00 m_ContactCount  byte     +0x01 m_MoveContactCount byte
     +0x02 m_MoveMax       byte     +0x03 m_MoveMin          byte
     +0x04 m_MoveOffset    byte     +0x05 m_MovePercent      byte
     +0x06 m_Proc          byte     +0x08 m_Flags            ushort
     +0x10 m_EntityRef              +0x18 m_ProcTimer        FP
     +0x20 m_ReturnSpeed   FP       +0x28 m_Speed            FP
     +0x30 m_WaitTimer     FP       +0x38 m_Width            FP
     +0x40 m_MoveDirection FPVector2 (X +0x40, Y +0x48)
     +0x50 m_OffsetPos     FPVector2 (X +0x50, Y +0x58)
   Every store in Initialize/ParseParameter/OnUpdate/MoveLift below lands on one
   of these, which is what fixes the slot meanings.

   m_Flags BITS - named by their own accessors, which read byte[this+8]:
     bit0 IsEnableReturn           0x1817378d0  (test byte[rcx+8],1)
     bit1 IsEnableRideReversal     0x181737900  (test 2)
     bit2 IsEnableCountReversal    0x181737930  (test 4)
     bit3 IsDisableWaitContactLower 0x181737960 (test 8)

   STATICS - WeightedLiftComponent..cctor 0x181738470:
     +0x00 MOVE_SPEED_DEFAULT 0x10000  = 1      (0x1817384cc)
     +0x08 WIDTH              0        = 0      (0x1817384e1)
     +0x10 HEIGHT             0xffffffffffba0000 = -70 (0x1817384f7)
     +0x18 WAIT_TIME          0xf5c    = 3932 raw = 0.0599975585938 s (0x18173850d)
     +0x20 RESOURCE_PATH      QResourcePath.GetLiftPath 0x18173852d
     +0x28 COLLISION_RECT     {0x100000, 0xc00000, 0xffffffffffa00000, 0x400000}
                              (0x1817385b8..0x1817385f1) = Height 16, Width 192,
                              X -96, Y 64 in RectFP member order Height,Width,X,Y
                              (order already established by
                              source-thorn-ceiling-devices.js THORN_COLLISION and
                              switch-direction-report.json's direction table).
   WIDTH/HEIGHT are NOT the box size - Initialize 0x181737a0a writes
   {WIDTH, HEIGHT} into m_MoveDirection, so they are the default travel vector
   (0,-70) i.e. "rise 70 px". The box size comes from COLLISION_RECT + m_Width.

   DEFAULTS - WeightedLiftComponent.Initialize 0x181737990:
     0x1817379ba m_Width            = 0xc00000 = 192
     0x1817379f2 m_MovePercent      = 0x14 = 20
     0x1817379f6 m_MoveMax/m_MoveMin= word 0x208 -> [+2]=8, [+3]=2
     0x1817379fc m_MoveContactCount = 1
     0x181737a0a m_MoveDirection    = (WIDTH, HEIGHT) = (0,-70)
     0x181737a1f m_Speed            = MOVE_SPEED_DEFAULT = 1
     0x181737a36 m_ReturnSpeed      = MOVE_SPEED_DEFAULT = 1
     0x181737a3e m_Flags bit0 set   -> EnableReturn defaults TRUE
   m_ProcTimer, m_WaitTimer, m_OffsetPos, m_ContactCount and m_Proc are left at
   the Quantum zero-init.

   SLOT MAP - ExtraWeightedLiftComponent.ParseParameter 0x18183b160.
   datas[i] lives at datasArray+0x20+8*i, its type tag at slot+0x10 (1 = FP) and
   its value at slot+0x18; `sar 0x10` marks the slots that are truncated to an
   integer. Bounds checks at 0x18183b21c/0x18183b337/0x18183b36a/0x18183b39d/
   0x18183b3fb/0x18183b42e require datas.length >= 19.
     [0]      raw, 0x18183b24b  m_MoveDirection.Y base
     [1..7]   raw, 0x18183b279  per-population Y table, read at index
                                playerActorCount-1 (0x18183b267 dec eax) and
                                ADDED to [0] when |entry| >= FP.Epsilon
                                (0x18183b4cd cmovge)
     [8]      sar, 0x18183b299  m_MovePercent      if > 0 (0x18183b4fb)
     [9]      raw, 0x18183b2c2  m_Speed            (0x18183b699, unconditional)
     [10]     sar, 0x18183b2e5  m_MoveMin          if > 0 (0x18183b511)
     [11]     sar, 0x18183b30e  m_MoveOffset       if != 0 (0x18183b53d; `je`
                                not `jle`, so negative values are kept - this is
                                the slot st_w_10_04 sets to -1)
     [12]     raw, 0x18183b226  m_MoveDirection.X
     [13]     sar, 0x18183b341  EnableRideReversal if != 0 (0x18183b565 bts 1)
     [14]     sar, 0x18183b374  EnableCountReversal if != 0 (0x18183b592 bts 2)
     [15]     sar, 0x18183b3a7  m_MoveMax          if > 0 (0x18183b527)
     [16]     str, 0x18183b3d0  population table -> m_Width if > 0 (0x18183b81c)
     [17]     sar, 0x18183b405  DisableWaitContactLower if != 0 (0x18183b5bf bts 3)
     [18]     raw, 0x18183b438  m_ReturnSpeed base
     [19]     str, 0x18183b458  population table -> m_Speed if > 0 (0x18183b682)
     [20]     str, 0x18183b46f  population table -> m_ReturnSpeed if > 0
                                (0x18183b737), and if the result is still <= 0
                                m_ReturnSpeed falls back to m_Speed
                                (0x18183b759 cmovg + 0x18183b777)
   m_MoveDirection is only written when |datas[0]| >= 4 or |datas[12]| >= 4
   (0x18183b498 / 0x18183b4ac); otherwise Initialize's (0,-70) survives. The
   threshold 4 is QFP.Epsilon, which QFP..cctor 0x1817816b6 sets to the literal
   4 - the same engine-wide non-zero epsilon source-thorn-ceiling-devices.js
   already carries as SPEED_EPSILON_FP.
   All `> 0` comparisons above are against QFP.statics[0] = QFP._0 = 0; the class
   pointer behind them resolves to 0x1831d0a40, the same global
   WeightedLiftComponent.InitCollision divides by at statics+0x118 = QFP._2
   (quantum-field-offsets.json QFP: _1 at 0xf0, _2 at 0x118, _3 at 0x128,
   _4 at 0x138 - the three odd offsets already quoted in switchtimer/thorn
   reports match exactly).

   THE ONLY WeightedLiftEx vs WeightedLiftSingle BRANCH - 0x18183b825:
     cmp dword ptr [actorCreateParam + 0x30], 0x2f   ; 47 = WeightedLiftSingle
     jne  ...
     mov qword ptr [this + 0x38], 0x300000           ; m_Width = 48 = one map chip
   i.e. the two actor types run byte-identical code and differ only in that
   WeightedLiftSingle forces m_Width to 48 after the datas[16] table has been
   applied. Nothing else in the function reads the ordinal.

   POPULATION TABLES - the three string slots go through the shared reader
   0x18096f720 (QActorCreateParam.AsString 0x181780090 then the loop at
   0x18096f7e5..0x18096f824: byte = (charCode & 0xff) - 0x21), which is the
   decoder actor-runtime.js already documents for the Key: 56 bytes = seven
   little-endian signed Q16.16 values, one per population 2..8. Each of the
   lift's three tables gets its OWN independent walk down from index
   playerActorCount-2 to 0, taking the first non-zero entry
   (0x18183b5f4..0x18183b650 for datas[19], 0x18183b6b9..0x18183b70f for
   datas[20], 0x18183b794..0x18183b7ee for datas[16]). This differs from the
   Key, where one walk picks the index for both axes at once.
   A slot that is absent or not a string is NOT an error: 0x18096f7ba/0x18096f7c5
   send a null or zero-length string to 0x18096fcf7, which zeroes all 56 bytes
   of the result (0x18096fcfc/0x18096fd05 plus the shared tail 0x18096fce0/
   0x18096fceb). Shipped cross-check: the width tables decode to 192/200/202 and
   st_l_04_04's speed table to [0.79998779296875, 0, 0.8499908447265625,
   0.899993896484375, 0, 0, 0] - 0.8/0.85/0.9 with exactly the FP.FromString
   truncation key-reach-report.json traced for the Key's 0.8 -> 52428.

   COLLISION BOX - WeightedLiftComponent.InitCollision 0x181737a50 copies
   COLLISION_RECT (0x181737ae4/0x181737aef) and then overwrites two members:
     0x181737b29  X     = (-m_Width << 16) / QFP._2  = -m_Width/2
     0x181737b32  Width = m_Width
   leaving Height 16 and Y 64. So the box is
     anchor + (-m_Width/2, +64), m_Width x 16
   which for the default 192 reproduces the static rect (16,192,-96,64) exactly.
   0x181737b82 sets the collision kind byte to 0xd = CollisionLayer.Lift (the
   enum's 14th member, quantum-field-offsets.json CollisionLayer).

   RIDER COUNT - OnUpdate 0x181737cdb calls Collision.GetContactCount
   0x181695050 with face arg 0 and layer mask 6, and with EnableCountReversal
   also with face arg 1 (0x181737d27), adding the two (0x181737d35).
     * face: 0x1816950b4 feeds the arg to ContactFaceExtensions.GetNormal
       0x18177e310, whose normal_table (..cctor 0x18177e400, length 4) holds
       (0,-1), (0,1), (-1,0), (1,0) at indices 0..3 and whose bound is
       `face > 3` on the SIGN-EXTENDED byte - so ContactFace is
       Invalid = -1, Up = 0, Down = 1, Left = 2, Right = 3. Face 0 is UP: the
       lift counts what is standing ON it. (DisableWaitContactLower guarding a
       face-1 IsContacted at 0x181737db0 independently confirms 1 = Down.)
     * mask: the filter is `1 << (byte[collision+1] & 0x1f)` tested against the
       mask (0x181694eb0..0x181694ecb), and byte[collision+1] is exactly what
       InitCollision set to 13 = Lift. Mask 6 = (1<<1)|(1<<2) =
       CollisionLayer.Player | CollisionLayer.PlayerObject.
     * the count is RECURSIVE and de-duplicated: Collision.GetContactCount
       0x181694c70 returns the List it accumulates into (0x181694fbe mov rax,rsi)
       and the caller reads its _size at +0x18 (0x181737cf0). For each contact
       that matches the mask AND carries the same contact normal
       (0x181694ee9/0x181694f03) it does an IndexOf on the list (0x181694f43),
       adds the id if new (0x181694f59) and recurses (0x181694fa2). So a player
       standing on a player standing on the lift counts too, once each. That is
       the transitive closure of "grounded on", which is what ridersOf() in
       source-stage-runtime.js already computes for players.

   REQUIRED RIDER COUNT - WeightedLiftComponent.CalcMoveContactCount 0x181738090
   is NOT "count who is on board"; it recomputes the THRESHOLD, and OnUpdate
   calls it first thing every update (0x181737c76):
     percentFP = floor(m_MovePercent * 65536 / 100)      0x1817380e1 magic
                 (0xa3d70a3d70a3d70b + shl 0x20 + sar 0x16 + sign fixup;
                  verified numerically to equal the truncating FP divide)
     prodFP    = (percentFP * (playerActorCount << 16)) >> 16   0x18173810a
     needed    = prodFP >> 16, +1 if the low 16 bits are non-zero
                 (0x181738115 / 0x181738125 cmp dx,1 / 0x181738129 cmovae)
                 i.e. ceil()
     v = m_MoveOffset + needed                           0x181738134
     v = min(v, m_MoveMax)                               0x18173814b cmovg
     m_MoveContactCount = (v >= m_MoveMin) ? v : m_MoveMin  0x181738155 cmovge
   m_MovePercent/m_MoveMax/m_MoveMin/m_MoveOffset are all read with `movsx`, so
   they are SIGNED bytes. playerActorCount is Frame.GetPlayerActorCount
   0x1817494b0 -> ActorSceneComponent.GetPlayerActorCount 0x1816a8100, which
   returns the length of the player-actor list at scene+0x30 (see unresolved).

   UPDATE - WeightedLiftComponent.OnUpdate 0x181737be0, in order:
     1. CalcMoveContactCount                                    0x181737c76
     2. collision = ActorComponent.GetCollision(actor,frame,0,0) 0x181737c9c
        (null -> return)
     3. riders = contact count on Up (+ Down when EnableCountReversal)
     4. if (m_WaitTimer > 0) m_WaitTimer -= DeltaTime            0x181737d39
     5. if (!DisableWaitContactLower && !EnableRideReversal &&
            Collision.IsContacted(collision,frame,Down,true,0))
              m_WaitTimer = WAIT_TIME                            0x181737de3
     6. if (m_WaitTimer > 0) { m_ContactCount = riders; return } 0x181737deb
     7. m_ProcTimer -= DeltaTime                                 0x181737e17
     8. if (m_ProcTimer <= 0) {                                  0x181737e44
            m_Proc = (riders >= m_MoveContactCount) ? 1
                   : (EnableReturn ? 2 : 0)                      0x181737e76/e6d
            m_ContactCount = riders                              0x181737e7a
            m_ProcTimer = QFP.OneFrame * QFP._6                  0x181737eb6
        }
     9. target = |m_OffsetPos| componentwise                     0x181737eba
        if m_Proc == 1  target += (m_Speed, m_Speed)             0x181737f5b
        if m_Proc == 2  target -= (m_ReturnSpeed, m_ReturnSpeed) 0x181737f1f
        (both branches multiply by the literal FPVector2 at 0x182e87af0, which
         reads 00000100000000000000010000000000 = (1,1) - FPVector2.One; the X
         side is strength-reduced to shl/sar 0x10 by the compiler)
        target = clamp(target, 0, |m_MoveDirection|)             0x181737fad..fd2
        target = (sign(m_MoveDirection.X)*target.X,
                  sign(m_MoveDirection.Y)*target.Y)              0x181737fe6/0x18173800b
                 where sign(v) = v < 0 ? -1 : +1, built as
                 ((v >> 63) & -0x20000) + 0x10000
    10. MoveLift(this, frame, actor, target)                     0x181738053
   So m_Proc is re-decided only every 6 updates, but the lift MOVES every update.
   m_Proc: 0 = hold, 1 = extend along m_MoveDirection, 2 = return to the anchor.

   MOVE - WeightedLiftComponent.MoveLift 0x181738170:
     d = target - m_OffsetPos
     if (d.Y < 0)       IsEnableMoveContactActor(actor,frame,QFPVector2.Up,false)
                        must be true, else nothing moves           0x181738342
     else if (d.Y > 0)  IsEnableMoveContactActor(actor,frame,QFPVector2.Down,true)
                        must be true, else nothing moves           0x1817382e2
     else               if (|d.X| < QFP.Epsilon) nothing moves, and NO contact
                        gate is consulted at all                   0x181738278
     m_OffsetPos = target                                          0x18173835c
     actor position = actorBase(+0x80) + m_OffsetPos -> +0xb0       0x1817383b3
     if (|d.Y| >= QFP.Epsilon) {                                    0x1817383ba
         MoveContactActor(actor, frame, (0, d.Y), false)            0x1817383fc
         if (EnableRideReversal)
             MoveContactActor(actor, frame, (0, d.Y), true)         0x181738448
     }
   The vector handed to MoveContactActor has its X member written as a literal
   zero (0x1817383cb stores the zero register). This particular call carries
   vertically; the old inference that horizontal lifts carry nobody was wrong.
   Horizontal transport is separate CollisionScene inertia @0x1817fc3ea.
   The same vertical-only call occurs in: LinePathLiftComponent.MoveLift 0x18187a110, a lift that follows
   arbitrary 2-D paths, computes only the Y delta (0x18187a17d) and passes the
   same (0, deltaY) at 0x18187a221. motion-device-report.json already treats
   MoveContactActor as the carry mechanism (MoveWall 0x18184948e).
   QFPVector2.Up/Down are statics+0x00/+0x10 of the class at 0x1831d7100;
   quantum-field-offsets.json QFPVector2 lists Up 0x0, Down 0x10, Left 0x20,
   Right 0x30.

   WHAT THIS MODULE PORTS
   Only horizontal root travel; horizontal rider inertia is still missing.
   The vertical gate core is now in source-move-contact.js, but the native
   collision cache adapter remains incomplete. compile() refuses a lift whose m_MoveDirection has a
   non-zero Y, with a message that names the missing piece, rather than guessing
   at ActorComponent.IsEnableMoveContactActor 0x1816a15c0. Every one of the 20
   WeightedLiftEx actors in the shipped worlds is axis aligned (never both
   members at once); 14 of them are horizontal, 6 vertical. st_w_10_04's single
   lift is horizontal. See `unresolved`.
*/
(function(root,factory){const api=factory();if(typeof module==='object'&&module.exports)module.exports=api;root.SourceLiftDevices=api;})(typeof globalThis!=='undefined'?globalThis:this,function(){
'use strict';
const F=65536;
const clone=v=>JSON.parse(JSON.stringify(v));
// ActorFactoryComponent.Update 0x1816a2fe9 population filter, same expression
// the other device modules carry.
const allowed=(v,c)=>!v||v<0&&c<=-v||v>0&&v<10&&c>=v||v>=10&&c>=Math.trunc(v/10)&&c<=v%10;
const normalize=(a,i)=>{const p=a.properties||a,pos=a.position||{x:a.x??a.posX,y:a.y??a.posY};
 return {...p,id:a.id||'source:a'+i,x:Number(pos.x),y:Number(pos.y),datas:a.datas||a.parameters||[]};};

// WeightedLiftComponent..cctor 0x181738470 and Initialize 0x181737990.
const MOVE_SPEED_DEFAULT_FP=F, DEFAULT_MOVE_X_FP=0, DEFAULT_MOVE_Y_FP=-70*F;
const WAIT_TIME_FP=0xf5c;                 // 3932 raw = 0.0599975585938 s
const DEFAULT_WIDTH_FP=192*F, SINGLE_WIDTH_FP=48*F;
const DEFAULT_MOVE_PERCENT=20, DEFAULT_MOVE_MAX=8, DEFAULT_MOVE_MIN=2;
const DEFAULT_MOVE_OFFSET=0, DEFAULT_MOVE_CONTACT_COUNT=1;
// COLLISION_RECT members that InitCollision leaves alone.
const RECT_HEIGHT=16, RECT_Y=64;
// QFP.Epsilon, QFP..cctor 0x1817816b6 stores the literal 4.
const FP_EPSILON=4;
// m_ProcTimer reload is QFP.OneFrame * QFP._6 (0x181737ea3..0x181737eb6). The
// same timer is decremented by Frame.DeltaTime, and OneFrame is by construction
// one frame of it, so the re-decision period is exactly 6 updates whatever the
// raw values are. Frame.get_DeltaTime only forwards a runtime session field, so
// the FP raw of a native delta is not in the binary (the caveat
// switchtimer-device-report.json already records); counting updates avoids
// depending on it. QFP.OneFrame itself is FP.FromString_UNSAFE of a metadata
// string literal - see `unresolved`.
const PROC_INTERVAL_UPDATES=6;
const PROC_HOLD=0, PROC_EXTEND=1, PROC_RETURN=2;
const POPULATION_TABLE_ENTRIES=7;
const SUPPORTED=['WeightedLiftEx','WeightedLift','WeightedLiftSingle'];

function slot(a,i){return a.datas[i];}
function isNumeric(a,i){const s=slot(a,i);return !!s&&s.t===1;}
function numeric(a,i){const s=slot(a,i);return s&&s.t===1?Number(s.f)||0:0;}
// Same refusal actor-runtime.js slotFpRaw() uses: the stage file stores plain
// decimals, and which way FP.FromFloat_UNSAFE rounds them is not established
// here, so a slot that is not an exact multiple of 1/65536 is rejected instead
// of guessed. Every slot st_w_10_04 uses is a whole number.
function slotFp(a,i,label){
 const value=numeric(a,i),raw=value*F;
 if(!Number.isInteger(raw))throw Error('Unverified fractional WeightedLift slot '+i+' ('+label+') = '+value+' on '+a.id);
 if(!Number.isSafeInteger(raw))throw Error('WeightedLift slot '+i+' ('+label+') outside exact range on '+a.id);
 return raw;
}
// Stage parameters reach ParseParameter through QStageFileConverter.convertFP
// 0x180554310: the asset's float32 becomes a string and FP.FromString_UNSAFE
// parses it (float32, times 65536.0f, truncated - cvttss2si). Used by the
// WeightedLift path, whose authored -0.1 the older refusal above could not take.
function stageFp(a,i){const v=numeric(a,i);return Math.trunc(Math.fround(Math.fround(v)*F));}
const stageInt=(a,i)=>Math.floor(stageFp(a,i)/F);
// `sar 0x10` truncates toward negative infinity, which is what floor does.
function slotInt(a,i){return Math.floor(slotFp(a,i,'integer slot')/F);}
// Shared create-param string reader 0x18096f720; an absent or non-string slot
// comes back as 56 zero bytes (0x18096fcf7), so it is seven zeros, not an error.
function populationTable(a,i,label){
 const s=slot(a,i);
 if(!s||s.t!==2||typeof s.s!=='string'||s.s.length===0)return new Array(POPULATION_TABLE_ENTRIES).fill(0);
 const text=s.s;
 if(text.length!==POPULATION_TABLE_ENTRIES*8)
  throw Error('Unverified WeightedLift population table length '+text.length+' at slot '+i+' ('+label+') on '+a.id);
 const bytes=[...text].map(c=>(c.codePointAt(0)-0x21)&0xff);
 const values=[];
 for(let e=0;e<POPULATION_TABLE_ENTRIES;e++){
  let v=0n;
  for(let k=7;k>=0;k--)v=(v<<8n)|BigInt(bytes[e*8+k]);
  if(v>=1n<<63n)v-=1n<<64n;
  const raw=Number(v);
  if(!Number.isSafeInteger(raw))throw Error('WeightedLift population table entry outside exact range at slot '+i+' on '+a.id);
  values.push(raw);
 }
 return values;
}
// 0x18183b5f4..0x18183b650 etc: walk DOWN from playerCount-2 and take the first
// non-zero entry; zero everywhere means "no override".
function tableLookup(values,count){
 for(let i=count-2;i>=0;i--)if(values[i]!==0)return values[i];
 return 0;
}
const absFp=v=>v<0?-v:v;
// ((v >> 63) & -0x20000) + 0x10000 at 0x181737fe6: +1 for v >= 0, -1 for v < 0.
const signFp=v=>v<0?-1:1;

// NormalWeightedLiftComponent.ParseParameter 0x181889b40 - the WeightedLift slot
// map, which differs from WeightedLiftEx's in almost every index. Each byte field
// is stored under its own guard, the same pattern as Ex:
//   m_MovePercent <- [2] only if > 0 (0x181889eb5 jle, store 0x181889ec0)
//   m_MoveMin     <- [3] only if > 0 (0x181889ecb, 0x181889ed6)
//   m_MoveMax     <- [10] only if > 0 (0x181889edd, 0x181889ee8)
//   m_MoveOffset  <- [7] only if != 0 (0x181889ef3 je, 0x181889efe)
//   m_MoveDirection <- ([6], [0] + playerActorCount*[1]) (0x181889e7f..e8e,
//                    store 0x181889ea9), the per-player term only above epsilon
//   m_ReturnSpeed += [4] * max(0, count-2), only when |[4]| >= epsilon
//                    (0x181889f10, factor clamped at 0x181889f23, add 0x181889f39).
//                    Initialize 0x181737a36 seeded it with MOVE_SPEED_DEFAULT,
//                    the same static m_Speed gets at 0x181737a1f.
//   flags: [5] != 0 CLEARS EnableReturn (0x181889f5c btr 0) - the only slot in the
//          family that does; [8] RideReversal (bts 1), [9] CountReversal (bts 2),
//          [12] DisableWaitContactLower (bts 3)
//   m_Width <- population table [11] (store 0x18188a0b5)
// m_Speed is never written, so a WeightedLift always rises at MOVE_SPEED_DEFAULT.
function compileNormal(a,count){
 const baseY=stageFp(a,0),scaleY=stageFp(a,1),moveX=stageFp(a,6);
 let dirX=DEFAULT_MOVE_X_FP,dirY=DEFAULT_MOVE_Y_FP;
 if(absFp(baseY)>=FP_EPSILON||absFp(moveX)>=FP_EPSILON){
  dirX=moveX;dirY=baseY+(absFp(scaleY)>=FP_EPSILON?count*scaleY:0);
 }
 const percentSlot=stageInt(a,2),minSlot=stageInt(a,3),maxSlot=stageInt(a,10),offsetSlot=stageInt(a,7);
 const movePercent=percentSlot>0?percentSlot:DEFAULT_MOVE_PERCENT;
 const moveMin=minSlot>0?minSlot:DEFAULT_MOVE_MIN;
 const moveMax=maxSlot>0?maxSlot:DEFAULT_MOVE_MAX;
 const moveOffset=offsetSlot!==0?offsetSlot:DEFAULT_MOVE_OFFSET;
 const returnAdd=stageFp(a,4);
 const returnSpeedFp=MOVE_SPEED_DEFAULT_FP+(absFp(returnAdd)>=FP_EPSILON?Math.floor(returnAdd*Math.max(0,count-2)*F/F):0);
 const flags={enableReturn:stageInt(a,5)===0,enableRideReversal:stageInt(a,8)!==0,
  enableCountReversal:stageInt(a,9)!==0,disableWaitContactLower:stageInt(a,12)!==0};
 const widthOverride=tableLookup(populationTable(a,11,'m_Width'),count);
 const widthFp=widthOverride>0?widthOverride:DEFAULT_WIDTH_FP;
 if(widthFp<=0||!Number.isInteger(widthFp/F))throw Error('Unverified WeightedLift m_Width '+widthFp/F+' on '+a.id);
 if(dirX===0&&dirY===0)throw Error('WeightedLift with a zero travel vector on '+a.id);
 if(returnSpeedFp<0)throw Error('WeightedLift return speed below zero is not established on '+a.id);
 const width=widthFp/F;
 return {id:'lift:'+a.id,name:a.name||'',type:a.typeName,anchor:{x:a.x,y:a.y},
  w:width,h:RECT_HEIGHT,rectX:-width/2,rectY:RECT_Y,x:a.x-width/2,y:a.y+RECT_Y,
  moveDirXFp:dirX,moveDirYFp:dirY,speedFp:MOVE_SPEED_DEFAULT_FP,returnSpeedFp,
  movePercent,moveMin,moveMax,moveOffset,flags,
  offsetXFp:0,offsetYFp:0,proc:PROC_HOLD,procUpdates:0,waitTimer:0,
  contactCount:0,moveContactCount:DEFAULT_MOVE_CONTACT_COUNT,riders:0,moved:{x:0,y:0}};
}
function compile(actors,count){
 if(!Number.isInteger(count)||count<2||count>8)throw Error('WeightedLift compile needs a population of 2..8');
 const rows=(actors||[]).map(normalize).filter(a=>allowed(a.playerCount,count)),lifts=[],warnings=[];
 for(const a of rows){
  if(!SUPPORTED.includes(a.typeName))continue;
  if(a.typeName==='WeightedLift'){lifts.push(compileNormal(a,count));continue;}
  if(a.datas.length<19)throw Error('WeightedLiftEx needs 19 parameter slots (ParseParameter bounds check 0x18183b42e), got '+a.datas.length+' on '+a.id);
  // --- m_MoveDirection (0x18183b48a..0x18183b4e4) ---
  const baseY=slotFp(a,0,'moveDirection.Y base'),moveX=slotFp(a,12,'moveDirection.X');
  const popY=slotFp(a,count-1,'moveDirection.Y population entry');
  let dirX=DEFAULT_MOVE_X_FP,dirY=DEFAULT_MOVE_Y_FP;
  if(absFp(baseY)>=FP_EPSILON||absFp(moveX)>=FP_EPSILON){
   dirX=moveX;
   dirY=absFp(popY)>=FP_EPSILON?baseY+popY:baseY;
  }
  // --- byte parameters, each written only under its own guard ---
  const percentSlot=slotInt(a,8),minSlot=slotInt(a,10),maxSlot=slotInt(a,15),offsetSlot=slotInt(a,11);
  const movePercent=percentSlot>0?percentSlot:DEFAULT_MOVE_PERCENT;
  const moveMin=minSlot>0?minSlot:DEFAULT_MOVE_MIN;
  const moveMax=maxSlot>0?maxSlot:DEFAULT_MOVE_MAX;
  const moveOffset=offsetSlot!==0?offsetSlot:DEFAULT_MOVE_OFFSET;
  for(const [name,value] of [['m_MovePercent',movePercent],['m_MoveMin',moveMin],['m_MoveMax',moveMax],['m_MoveOffset',moveOffset]])
   if(value<-128||value>127)throw Error('WeightedLift '+name+' does not fit the signed byte the native reads with movsx: '+value+' on '+a.id);
  // --- flags (0x18183b541..0x18183b5c3) ---
  const flags={enableReturn:true,
   enableRideReversal:slotInt(a,13)!==0,
   enableCountReversal:slotInt(a,14)!==0,
   disableWaitContactLower:slotInt(a,17)!==0};
  // --- speeds (0x18183b653..0x18183b777) ---
  const speedTable=populationTable(a,19,'m_Speed'),returnTable=populationTable(a,20,'m_ReturnSpeed');
  const speedOverride=tableLookup(speedTable,count);
  const speedFp=speedOverride>0?speedOverride:slotFp(a,9,'m_Speed');
  const returnOverride=tableLookup(returnTable,count);
  const returnBase=returnOverride>0?returnOverride:slotFp(a,18,'m_ReturnSpeed');
  const returnSpeedFp=returnBase>0?returnBase:speedFp;
  // Initialize leaves MOVE_SPEED_DEFAULT in m_Speed but ParseParameter's store
  // at 0x18183b699 is unconditional, so a lift with datas[9] = 0 and an empty
  // table really would end up with m_Speed 0. No shipped actor does; refuse it
  // rather than silently freeze.
  if(speedFp<=0)throw Error('WeightedLiftEx with no positive m_Speed (datas[9] and the datas[19] table are both empty) on '+a.id);
  // --- m_Width (0x18183b7f1..0x18183b82b) ---
  const widthOverride=tableLookup(populationTable(a,16,'m_Width'),count);
  let widthFp=widthOverride>0?widthOverride:DEFAULT_WIDTH_FP;
  if(a.typeName==='WeightedLiftSingle')widthFp=SINGLE_WIDTH_FP;
  if(widthFp<=0||!Number.isInteger(widthFp/F))throw Error('Unverified WeightedLift m_Width '+widthFp/F+' on '+a.id);
  // --- the one path this module does not port ---
  if(dirX===0&&dirY===0)throw Error('WeightedLiftEx with a zero travel vector on '+a.id);
  const width=widthFp/F;
  lifts.push({id:'lift:'+a.id,name:a.name||'',type:a.typeName,
   anchor:{x:a.x,y:a.y},
   // InitCollision 0x181737b29/0x181737b32 over COLLISION_RECT.
   w:width,h:RECT_HEIGHT,rectX:-width/2,rectY:RECT_Y,
   x:a.x-width/2,y:a.y+RECT_Y,
   moveDirXFp:dirX,moveDirYFp:dirY,speedFp,returnSpeedFp,
   movePercent,moveMin,moveMax,moveOffset,flags,
   // Zero-initialised simulation state (Initialize writes none of these).
   offsetXFp:0,offsetYFp:0,proc:PROC_HOLD,procUpdates:0,waitTimer:0,
   contactCount:0,moveContactCount:DEFAULT_MOVE_CONTACT_COUNT,riders:0,moved:{x:0,y:0}});
 }
 return {schemaVersion:1,count,lifts,warnings,completePhysicsFidelity:false};
}
function create(compiled){
 if(!compiled||compiled.schemaVersion!==1)throw Error('Compiled source lift state required');
 return clone(compiled);
}
function solids(state){return state.lifts;}

// CalcMoveContactCount 0x181738090, in the native's truncating FP arithmetic.
function calcMoveContactCount(lift,playerCount){
 const percentFp=Math.floor(lift.movePercent*F/100);
 const prodFp=Math.floor(percentFp*(playerCount*F)/F);
 let needed=Math.floor(prodFp/F);
 if((prodFp%F)!==0)needed+=1;
 let v=lift.moveOffset+needed;
 if(v>lift.moveMax)v=lift.moveMax;
 if(v<lift.moveMin)v=lift.moveMin;
 return v;
}
// The de-duplicated recursive Up-face contact count (Collision.GetContactCount
// 0x181694c70) as the transitive closure of "grounded on", which is what the
// runtime's support chain expresses.
function ridersOf(lift,players){
 const ids=new Set();let added=true;
 while(added){added=false;
  for(const p of players){if(p.exit||!p.grounded||ids.has(p.id))continue;
   if(p.supportId===lift.id||ids.has(p.supportId)){ids.add(p.id);added=true;}}}
 return players.filter(p=>ids.has(p.id));
}
function riderCount(lift,players){
 const ids=new Set();
 let added=true;
 while(added){
  added=false;
  for(const p of players){
   if(p.exit||!p.grounded||ids.has(p.id))continue;
   if(p.supportId===lift.id||ids.has(p.supportId)){ids.add(p.id);added=true;}
  }
 }
 return ids.size;
}

function beforeStep(state,{dt=1/60,nativeTickRate=60,players=[],platforms=[]}={}){
 if(!Number.isFinite(dt)||dt<0)throw Error('Invalid lift delta');
 if(!Number.isFinite(nativeTickRate)||nativeTickRate<=0)throw Error('Invalid lift tick rate');
 const updates=dt*nativeTickRate;
 const live=players.filter(p=>!p.exit);
 for(const lift of state.lifts){
  // 1. the threshold is recomputed every update
  lift.moveContactCount=calcMoveContactCount(lift,state.count);
  // 3. riders. EnableCountReversal would add the Down face too; no shipped
  // WeightedLiftEx sets datas[14], so that second count has no real-data case
  // and is left out rather than approximated (see `unresolved`).
  const riders=riderCount(lift,live);
  lift.riders=riders;
  // 4..6. the lower-contact freeze. EnableRideReversal or
  // DisableWaitContactLower skips the arming entirely, which is why
  // st_w_10_04's lift (datas[13] = 1) never freezes.
  if(lift.waitTimer>0)lift.waitTimer=Math.max(0,lift.waitTimer-dt);
  // 5. Collision.IsContacted(Down, includeMap) 0x181737de3: anything touching the
  //    underside - a player's head or terrain - re-arms WAIT_TIME, which is what
  //    stops a lowering lift from crushing whoever is beneath it.
  if(!lift.flags.disableWaitContactLower&&!lift.flags.enableRideReversal){
   const under={x:lift.x,y:lift.y+lift.h,w:lift.w,h:0.5};
   const touching=b=>b.x<under.x+under.w&&b.x+b.w>under.x&&b.y>=under.y-0.01&&b.y<=under.y+under.h;
   if(live.some(p=>touching(p))||platforms.some(touching))lift.waitTimer=WAIT_TIME_FP/F;
  }
  if(lift.waitTimer>0){lift.contactCount=riders;lift.moved={x:0,y:0};continue;}
  // 7..8. the m_Proc decision, throttled to one update in six
  lift.procUpdates-=updates;
  if(lift.procUpdates<=0){
   lift.proc=riders>=lift.moveContactCount?PROC_EXTEND:(lift.flags.enableReturn?PROC_RETURN:PROC_HOLD);
   lift.contactCount=riders;
   lift.procUpdates=PROC_INTERVAL_UPDATES;
  }
  // 9. the clamped offset, then the sign of the travel vector
  let targetX=absFp(lift.offsetXFp);
  if(lift.proc===PROC_EXTEND)targetX+=lift.speedFp*updates;
  else if(lift.proc===PROC_RETURN)targetX-=lift.returnSpeedFp*updates;
  const limitX=absFp(lift.moveDirXFp);
  targetX=Math.min(targetX,limitX);
  targetX=Math.max(targetX,0);
  targetX*=signFp(lift.moveDirXFp);
  // 10. MoveLift. dY is zero here, so the only gate is |dX| >= QFP.Epsilon and
  // MoveContactActor is not reached here; separate horizontal inertia is unported.
  const dX=targetX-lift.offsetXFp;
  lift.moved={x:0,y:0};
  if(absFp(dX)>=FP_EPSILON){
   lift.offsetXFp=targetX;
   const before=lift.x;
   lift.x=lift.anchor.x+lift.rectX+lift.offsetXFp/F;
   lift.moved.x=lift.x-before;
  }
  // Vertical: the same clamped offset on Y, and MoveLift's MoveContactActor
  // (0, dY) carries the riders (0x1817383fc / 0x181738448). The native gate is
  // IsEnableMoveContactActor 0x1816a15c0, still only partly reversed; this
  // refuses a rise that would push a rider into terrain and allows the rest.
  if(lift.moveDirYFp!==0){
   let targetY=absFp(lift.offsetYFp);
   if(lift.proc===PROC_EXTEND)targetY+=lift.speedFp*updates;
   else if(lift.proc===PROC_RETURN)targetY-=lift.returnSpeedFp*updates;
   targetY=Math.max(0,Math.min(targetY,absFp(lift.moveDirYFp)))*signFp(lift.moveDirYFp);
   const dY=targetY-lift.offsetYFp;
   if(absFp(dY)>=FP_EPSILON){
    const step=dY/F,carried=ridersOf(lift,live);
    const blocked=step<0&&carried.some(p=>platforms.some(b=>b.x<p.x+p.w&&b.x+b.w>p.x&&b.y<p.y+step+p.h&&b.y+b.h>p.y+step));
    if(!blocked){
     lift.offsetYFp=targetY;
     const before=lift.y;
     lift.y=lift.anchor.y+lift.rectY+lift.offsetYFp/F;
     lift.moved.y=lift.y-before;
     for(const p of carried)p.y+=lift.moved.y;
    }
   }
  }
 }
 return {solids:state.lifts};
}
// WeightedLiftComponent declares no OnRecvEvent (the method list for the type
// runs Initialize/InitCollision/InitPost/SetSpeed/SetReturnSpeed/OnUpdate/
// CalcMoveContactCount/MoveLift/..cctor and the four flag pairs), so nothing
// can signal a weighted lift. LiftComponent.OnRecvEvent 0x181876310 and
// VariableWeightedLiftComponent.OnRecvEvent 0x181733880 exist, but those are
// different components.
function afterStep(state){return {events:[],deadPlayerIds:[]};}

const integration=Object.freeze({
 register:'solids() must join baseSolids() in source-stage-runtime.js so players, boxes and other devices all collide with the platform; beforeStep() must run in the same place Gates.beforeStep() does, i.e. before terrain=solids(s), because it reads the supportId the previous tick left on each player.',
 solids:'Yes - the lift is a solid platform on CollisionLayer.Lift (InitCollision 0x181737b82 writes 13).',
 lethal:'No. afterStep() never returns deadPlayerIds; the component has no damage path.',
 events:'None in either direction. No OnRecvEvent on WeightedLiftComponent, and OnUpdate sends nothing.',
 carry:'Correction 2026-10-13: MoveLift 0x1817383cb sends only deltaY, but horizontal transport exists separately in CollisionScene.postPushBack/updateInertia (0x1817fc1c2..1d9, 0x1817fc3ea). Its MoveMap/UpdatePushBack/camera correction path is not integrated. The current runtime has no horizontal carry; that is a port limitation, not established original behavior. See move-contact-report.json.',
 renderer:'play/play.js has no loop for liftState. Add one next to the gateState loop (play.js:60), e.g. for(const b of state.liftState.lifts)box(b,...), plus the rider/threshold readout (lift.riders of lift.moveContactCount) - without it the platform is invisible and the population requirement is unguessable.',
 online:'Add [\'lifts\',\'liftState\'] to DEVICE_STATES in play/online.js:11. Only the host simulates, so every field the next update reads has to travel: lifts[].offsetXFp, offsetYFp, proc, procUpdates, waitTimer, x, y, moved, and the display-only riders/contactCount/moveContactCount. offsetXFp plus x are both required because x is what solids() hands the collision pass. packState() is a plain JSON round trip, so no BigInt handling is needed.',
 package:'source-lift-devices.js must be added to the copy list in package-source-play.cjs, the app list in deploy-source-play.cjs and a <script> tag in play/index.html, or the deploy check reports a missing page reference.'});

const unresolved=Object.freeze([
 {id:'verticalTravel',severity:'blocks the 6 vertical WeightedLiftEx actors and all 3 WeightedLiftSingle actors',
  detail:'MoveLift 0x181738170 only moves at all if ActorComponent.IsEnableMoveContactActor 0x1816a15c0 returns true for QFPVector2.Up (rising) or QFPVector2.Down (falling). That function normalises the direction, fetches the collision and walks the contact list recursively; its axis-aligned core is now in source-move-contact.js, but the native contact cache adapter is missing. Porting the vertical carry without that adapter would push riders through ceilings, so compile() refuses a lift whose m_MoveDirection has a non-zero Y instead. The rest of the vertical path IS established: m_OffsetPos advances exactly as the horizontal one does, and the riders move by MoveContactActor(actor, frame, (0, dY), false) plus a second call with true when EnableRideReversal (0x1817383fc / 0x181738448).'},
 {id:'enableCountReversal',severity:'latent, affects no shipped WeightedLiftEx',
  detail:'datas[14] sets m_Flags bit2, and OnUpdate 0x181737d27 then adds the Down-face contact count to the Up-face one. No WeightedLiftEx or WeightedLiftSingle actor in either shipped world sets datas[14], so there is no real-data case to test and beforeStep() does not implement the second count. A stage that uses it must add it.'},
 {id:'oneFrameRaw',severity:'cosmetic for st_w_10_04',
  detail:'m_ProcTimer is reloaded with QFP.OneFrame * QFP._6 (0x181737ea3). QFP._6 is 0x60000 = 6 (QFP..cctor 0x181781328), but OneFrame comes from FP.FromString_UNSAFE of a metadata string literal (0x18178168e, stored to statics+0x268 at 0x1817816a1) and the literal pointer is filled at runtime, so its raw value was not read out of the file. The only decimal string in global-metadata.dat that could be it is "0.01660" (the sole 0.016x match), which would truncate to raw 1087, but that binding is NOT established. It does not matter here: the same timer is decremented by Frame.DeltaTime and OneFrame is one frame of it, so this module counts 6 updates instead, which is exact whenever DeltaTime == QFP.OneFrame.'},
 {id:'playerActorCount',severity:'no effect in this port',
  detail:'CalcMoveContactCount and ParseParameter both use Frame.GetPlayerActorCount 0x1817494b0, which returns the length of the player-actor list at actorScene+0x30 (ActorSceneComponent.GetPlayerActorCount 0x1816a8100) rather than the fixed index count GetPlayerIndexCount 0x181749340 returns. Whether that list shrinks when a player dies was not traced. It cannot matter in this port: source-stage-runtime.js ends the round on the first death (status=\'dead\'), so the live count never changes mid-round. This module uses the compiled population.'},
 {id:'fractionalSlots',severity:'blocks 4 lift actors outside st_w_10_04',
  detail:'Stage files store the parameters as plain decimals and FP.FromFloat_UNSAFE truncation is not established for them, so slotFp() refuses a slot that is not an exact multiple of 1/65536 - the same refusal actor-runtime.js slotFpRaw() makes. The affected shipped values are datas[9] = 1.1 (st_l_04_04), WeightedLift datas[4] = -0.1 (st_w_05_01, st_w_07_03) and LinePathLift datas[4] = 2.3335 (st_w_03_02). st_w_10_04 uses whole numbers only.'},
 {id:'contactFaceEnum',severity:'resolved, recorded because it is counter-intuitive',
  detail:'quantum-field-offsets.json lists ContactFace as Invalid, Up, Down, Left, Right, which reads as Invalid=0. It is not: ContactFaceExtensions.GetNormal 0x18177e310 sign-extends the byte, rejects anything above 3 and indexes a 4-entry table of (0,-1),(0,1),(-1,0),(1,0), so Invalid=-1 and Up=0. The lift therefore counts the UP face by default, not an invalid one.'},
 {id:'siblingSlotMaps',severity:'reference for the next task, not ported',
  detail:'NormalWeightedLiftComponent.ParseParameter 0x181889b40 drives the same WeightedLiftComponent through a DIFFERENT slot map: [0] raw moveDirection.Y base, [1] raw per-player SCALE (moveDirection.Y = datas[0] + playerActorCount*datas[1], 0x181889e7f-0x181889e8e - not the per-population table Extra uses), [2] m_MovePercent, [3] m_MoveMin, [4] raw added to m_ReturnSpeed as datas[4]*(playerActorCount-2) (0x181889f31-0x181889f39, clamped at zero), [5] CLEARS EnableReturn (0x181889f5c btr, the only slot in the family that does), [6] raw moveDirection.X, [7] m_MoveOffset, [8] EnableRideReversal, [9] EnableCountReversal, [10] m_MoveMax, [11] population table -> m_Width, [12] DisableWaitContactLower. It never writes m_Speed, so a WeightedLift always runs at MOVE_SPEED_DEFAULT = 1, and it has no 0x2f ordinal branch.'}]);

return {compile,create,solids,beforeStep,afterStep,calcMoveContactCount,
 supportedTypes:SUPPORTED.slice(),integration,unresolved,completePhysicsFidelity:false};
});
