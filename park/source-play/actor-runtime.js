// Source, native and engine coordinates all use Y-down; no height-Y reflection.
(function (root) {
  'use strict';
  const rects = Object.freeze({
    Player: Object.freeze({x:-16,y:-47,width:32,height:46}),
    Key: Object.freeze({x:-16,y:-28,width:32,height:56}),
    Goal: Object.freeze({x:-24,y:-32,width:48,height:32})
  });
  function actorPopulationAllowed(value,count) {
    return value===0 || (value<0 ? count<=-value : value<10 ? count>=value : count>=Math.trunc(value/10) && count<=value%10);
  }
  function sourceProps(actor) { return actor.properties || actor; }
  function sourcePosition(actor) { return actor.position || {x:Number(actor.posX),y:Number(actor.posY)}; }
  function numericSlot(actor,index) {
    const slot=(actor.parameters||actor.datas||[])[index];
    return slot && slot.t===1 ? Number(slot.f)||0 : 0;
  }
  function stringSlot(actor,index) {
    const slot=(actor.parameters||actor.datas||[])[index];
    return slot && slot.t===2 ? (slot.s||'') : '';
  }
  const FP_ONE=65536;
  // ParseParameter is not a pure reader: it rewrites the spawn position of the
  // create context in place, and the authored posX/posY is only the starting
  // value. The whole chain is static:
  //   ActorFactoryComponent.CreateActor 0x1816a3351..0x1816a3373 copies the
  //     authored posX/posY into createContext+0x28 / +0x30 (and +0x10 holds the
  //     actorCreateParam whose datas[] live at +0x48),
  //   the registered creator runs at 0x1816a3628 - for Key that is
  //     KeyComponent.Creator 0x18186b470, which calls
  //     KeyComponent.ParseParameter at 0x18186b558 with that same context,
  //   and only afterwards does CreateActor read the position back at
  //     0x1816a3658 and hand it to ActorSceneComponent.AddActor 0x1816a3687.
  // KeyComponent.ParseParameter 0x18186b780 therefore relocates the key:
  //   datas[0] FP  -> pos.x += (playerCount - 2) * datas[0]
  //                   (0x18186bab1 imul, 0x18186bab5 add, no sar)
  //   datas[1] FP  -> pos.y += (playerCount * PLAYER_COUNT_SCALE * datas[1]) >> 16
  //                   (0x18186baea imul, 0x18186baef imul, 0x18186baf3 sar 0x10,
  //                    0x18186bb01 store)
  //   datas[6]/[7] -> per-population X / Y offset tables, read at 0x18186b988
  //                   and 0x18186b9a4 and applied by the loop at
  //                   0x18186bb40..0x18186bbe0
  // playerCount is Frame.GetPlayerIndexCount 0x181749340, the same source the
  // already-verified population filter uses (ActorFactoryComponent.Update
  // 0x1816a2fe9 / population-rules.cjs).
  //
  // PLAYER_COUNT_SCALE is KeyComponent statics+0x10. quantum-field-offsets.json
  // names the KeyComponent statics RESOURCE_PATH 0, EXCLUDE_TIME 8,
  // PLAYER_COUNT_SCALE 16, COLLISION_RECT 24, which exactly fills the 0x38 that
  // KeyComponent..cctor 0x18186d310 writes. That cctor copies +0x10 from
  // QFP statics+0xc0 (0x18186d487 load, 0x18186d48e store); quantum metadata
  // names QFP's 81 FP statics by value and +0xc0 is QFP._0_80 (cross-checked
  // against the same cctor's immediates: +0x70 _0_25 = 0x4000 at 0x181780fde,
  // +0x90 _0_50 = 0x8000, +0xb8 _0_75 = 0xc000 at 0x1817810ff).
  // QFP..cctor 0x181781124 fills _0_80 with FP.FromString_UNSAFE 0x18163fcb0,
  // which runs Double.Parse -> cvtsd2ss (float32 0.800000011920928955) ->
  // FP.FromFloat_UNSAFE 0x18163fc40: mulss by 65536.0f (0x182e87660) then
  // cvttss2si, i.e. truncation. 0.8f * 65536 is exactly 52428.80078125, so the
  // raw value is 52428 (0xcccc) = 0.79998779296875 - not 0.8.
  const KEY_PLAYER_COUNT_SCALE_RAW=52428;
  function slotFpRaw(value) {
    // Numeric slots reach the component already converted to Q16.16 and
    // ParseParameter uses the raw qword as-is. Every Key slot 0/1 in the
    // shipped World data is a whole number, so this conversion is exact;
    // refuse anything else instead of inventing a rounding rule.
    const raw=value*FP_ONE;
    if(!Number.isInteger(raw)) throw new Error('Unverified fractional Key position slot '+value);
    return raw;
  }
  const POPULATION_TABLE_ENTRIES=7;
  // The encoded tables go through the shared create-param string reader at
  // 0x18096f720: QActorCreateParam.AsString 0x18096f79a returns the slot
  // string and the loop at 0x18096f7e5..0x18096f824 emits one byte per UTF-16
  // character with `movzx ecx, byte ptr [r9]` + `sub cl, 0x21` + `add r9, 2`,
  // i.e. byte = (charCode & 0xff) - 0x21. The 56-byte payload holds seven
  // little-endian signed 64-bit Q16.16 values, one per population 2..8.
  // Cross-check on shipped data: st_w_14_02's Key decodes to
  // [0,-24,-48,-72,-96,-120,-144] on both axes, st_w_14_04's Y table to
  // [0,-46,-46,-46,-92,-138,-138] (46 is the player collision height), and the
  // all-'!' tables every other Key carries decode to seven exact zeros.
  function decodePopulationOffsetTable(text) {
    if(typeof text!=='string'||text.length!==POPULATION_TABLE_ENTRIES*8)
      throw new Error('Unverified population offset table of length '+(typeof text==='string'?text.length:typeof text));
    const bytes=[...text].map(c=>(c.codePointAt(0)-0x21)&0xff);
    if(bytes.length!==POPULATION_TABLE_ENTRIES*8) throw new Error('Population offset table is not 56 code points');
    const values=[];
    for(let i=0;i<POPULATION_TABLE_ENTRIES;i++) {
      let v=0n;
      for(let k=7;k>=0;k--)v=(v<<8n)|BigInt(bytes[i*8+k]);
      if(v>=1n<<63n)v-=1n<<64n;
      const raw=Number(v);
      if(!Number.isSafeInteger(raw)) throw new Error('Population offset table entry outside exact range');
      values.push(raw);
    }
    return values;
  }
  // Native post-ParseParameter spawn offset, in source pixels. Only
  // KeyComponent's offsets are recovered; 50 other ParseParameter bodies also
  // read Frame.GetPlayerIndexCount and write the context position, so this is
  // deliberately Key-only rather than a guess applied to every type.
  function keySpawnOffset(actor,count) {
    if(sourceProps(actor).typeName!=='Key') return {x:0,y:0};
    if(!Number.isInteger(count)||count<2||count>8) throw new Error('Key spawn offset needs a population count of 2..8');
    let x=(count-2)*slotFpRaw(numericSlot(actor,0));
    let y=Math.floor(count*KEY_PLAYER_COUNT_SCALE_RAW*slotFpRaw(numericSlot(actor,1))/FP_ONE);
    const tableX=decodePopulationOffsetTable(stringSlot(actor,6));
    const tableY=decodePopulationOffsetTable(stringSlot(actor,7));
    // 0x18186bb40..0x18186bba7 walks the index down from playerCount-2 and
    // stops at the first entry where either axis is non-zero, taking both
    // components from that one index (slot 6 -> X added at 0x18186bbce,
    // slot 7 -> Y added at 0x18186bbc9). 0x18186bbb0 supplies the zeroed
    // accumulator when the walk runs past index 0.
    for(let i=count-2;i>=0;i--) {
      if(tableX[i]===0&&tableY[i]===0) continue;
      x+=tableX[i];y+=tableY[i];break;
    }
    return {x:x/FP_ONE,y:y/FP_ONE};
  }
  // Native spawn anchor after ParseParameter. Without a population count the
  // authored anchor is returned unchanged, which is what every pre-existing
  // caller relies on.
  function spawnPosition(actor,count=null) {
    const anchor=sourcePosition(actor);
    if(count===null||sourceProps(actor).typeName!=='Key') return {x:anchor.x,y:anchor.y};
    const shift=keySpawnOffset(actor,count);
    return {x:anchor.x+shift.x,y:anchor.y+shift.y};
  }
  function nativeCollisionRect(actor,scale=1,count=null) {
    const p=sourceProps(actor), base=rects[p.typeName];
    if(!base) return null;
    const pos=spawnPosition(actor,count), offset=p.typeName==='Goal'?numericSlot(actor,0):0;
    return {x:pos.x+base.x*scale,y:pos.y+(base.y-offset)*scale,width:base.width*scale,height:(base.height+offset)*scale};
  }
  function collisionRect(actor,scale=1,count=null) {
    return nativeCollisionRect(actor,scale,count);
  }
  function engineCollisionRect(actor,worldHeight,scale=1,count=null) {
    // Keep the former signature for callers; worldHeight does not alter coordinates.
    return nativeCollisionRect(actor,scale,count);
  }
  function playerSpawns(actors,count,limitPlayer=true) {
    return actors.filter(a=>sourceProps(a).typeName==='Player' && actorPopulationAllowed(sourceProps(a).playerCount||0,count))
      .filter((a,ordinal)=>!limitPlayer || ordinal<count)
      .map((a,ordinal)=>({sourceActor:a,ordinal,name:sourceProps(a).name,position:sourcePosition(a),collision:collisionRect(a)}));
  }
  // Entry condition receives collision result from the caller's solver.
  function canEnterGoal({open,overlapping,upPressed,cleared=false,playerState=1,requestedState=0}) {
    return !!(open && overlapping && upPressed && !cleared && requestedState===0 && [1,6,7,9,10].includes(playerState));
  }
  const api={rects,collisionRect,nativeCollisionRect,engineCollisionRect,playerSpawns,actorPopulationAllowed,canEnterGoal,
    spawnPosition,keySpawnOffset,decodePopulationOffsetTable,KEY_PLAYER_COUNT_SCALE_RAW,
    coordinateSystems:Object.freeze({rects:'native local Y-down',nativeCollisionRect:'native Y-down at the post-ParseParameter spawn anchor when a population count is supplied, otherwise the authored anchor',collisionRect:'source Y-down top-left bounds',engineCollisionRect:'engine Y-down top-left bounds; no height reflection',playerSpawns:'source Y-down anchors and collision bounds',spawnPosition:'source Y-down anchor after KeyComponent.ParseParameter position offsets'}),
    verifiedMotionConstants:Object.freeze({walkSpeed:3,jumpBase:-334234/65536,gravityIncrement:42598/65536,terminalGravityVelocity:19.5}),
    completePhysicsFidelity:false};
  if(typeof module!=='undefined' && module.exports)module.exports=api;
  root.SourceActorRuntime=api;
})(typeof globalThis!=='undefined'?globalThis:this);
