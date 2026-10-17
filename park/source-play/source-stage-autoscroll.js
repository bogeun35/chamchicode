/* Stage auto-scroll producer, read-only GameAssembly static reconstruction.
 * QStageFileConverter0x180553d29..67 converts authored float32 through
 * convertFP0x180554310; integral authored inputs are exact here. Other inputs
 * require caller-provided nativeParamRaws, never float-multiply approximations.
 * prepare3 0x18170ad22..65: countOffset=count-2; delay=authored delay;
 * speed=baseSpeed+countOffset*speedOffset; end=countOffset*endOffset.
 * Stage component is zero-filled184 bytes by0x180787c61..6c before fresh add.
 * scrollPosition raw+0x60/68 remains(0,0); initScroll0x18170b310 centers
 * Camera only, not Stage.scrollPosition. Existing components require position.
 * updateAutoScroll0x18170b810: type2 only; subtract dt while delay>QFP._0;
 * if delay crosses zero move that call; X += CalcAutoScrollSpeed, Y unchanged.
 * CalcAutoScrollSpeed0x18170d680: bit8 bypasses dead-bit9 Player stop;
 * min(map.widthTiles*48*65536 + endOffset - (scrollX+viewWidth), speed).
 * 48 FP is inlined as width*3<<20 at0x18170d820..824, independent chipSize.
 * Unlimit0x18170d853..60 substitutes limit=viewWidth+(scrollX+viewWidth).
 * No dt multiplication, lower clamp, position clip, or terminal state flag.
 * Stage.onUpdate0x18170b460/48c/5a5 gates producer: suspendbit14 or bit0/1
 * skips. Gate is captured before Actor.Update. Producer after Collision/range
 * at0x18170b531; Actor.Post0x18170b561 then Camera.funcAuto0x18170b61b.
 */
(function(root,factory){const api=factory();if(typeof module==='object'&&module.exports)module.exports=api;root.SourceStageAutoScroll=api;})(globalThis,function(){
'use strict';
const F=65536,clone=x=>JSON.parse(JSON.stringify(x));
function exact(v,label){if(!Number.isSafeInteger(v))throw Error('StageAutoScroll exact safe native raw required: '+label);return v;}
function i64(v){return exact(Number(BigInt.asIntN(64,v)),'signed64 result');}
const add=(a,b)=>i64(BigInt(exact(a,'add'))+BigInt(exact(b,'add'))),sub=(a,b)=>i64(BigInt(exact(a,'sub'))-BigInt(exact(b,'sub'))),times=(a,n)=>i64(BigInt(exact(a,'times'))*BigInt(exact(n,'integer multiplier')));
function point(p){if(!p)throw Error('StageAutoScroll native scrollPosition required');exact(p.xRaw,'scrollX');exact(p.yRaw,'scrollY');return p;}
function authored(stage,key,raws){if(!Number.isFinite(stage[key]))throw Error('StageAutoScroll authored '+key+' required');if(raws&&Object.hasOwn(raws,key))return exact(raws[key],key);const n=Math.fround(stage[key]);if(!Number.isInteger(n))throw Error('StageAutoScroll nativeParamRaws.'+key+' required for nonintegral convertFP chain');return times(n,F);}
function compile(actors,count,options={}){if(!Array.isArray(actors))throw Error('StageAutoScroll actor list required (no Actor type owned)');if(!Number.isInteger(count)||count<2||count>8)throw Error('StageAutoScroll actual player index count2..8 required');const stage=options.stage;if(!stage||![0,1,2].includes(stage.scrollType))throw Error('StageAutoScroll selected native stage variant required');const m=stage.mapInitParam;if(!m||!Number.isInteger(m.width)||m.width<=0||m.width>65535)throw Error('StageAutoScroll actual Map ushort tile width required');if(![0,1].includes(stage.unlimitScroll))throw Error('StageAutoScroll explicit IsUnlimitScroll required');const r=options.nativeParamRaws,offset=count-2;return {schemaVersion:1,scrollType:stage.scrollType,mapWidthTiles:m.width,isUnlimitScroll:stage.unlimitScroll!==0,delayTimerRaw:authored(stage,'autoScrollDelayTime',r),autoScrollSpeedRaw:add(authored(stage,'autoScrollSpeed',r),times(authored(stage,'autoScrollSpeedOffset',r),offset)),endOffsetRaw:times(authored(stage,'autoScrollEndOffset',r),offset)};}
function create(compiled,options={}){const s=clone(compiled);if(options.freshStageComponent===true)s.scrollPositionRaw={xRaw:0,yRaw:0};else s.scrollPositionRaw=clone(point(options.initialScrollPositionRaw));return s;}
function phaseEligible(stageFlags){if(!Number.isInteger(stageFlags)||stageFlags<0||stageFlags>0xffffffff)throw Error('StageAutoScroll native Stage flags required');return !(stageFlags&0x4003);}
function calculateStepRaw(s,ctx={}){if(s.scrollType!==2||exact(s.delayTimerRaw,'delay')>0)return 0;if(!Number.isInteger(ctx.stageFlags)||ctx.stageFlags<0||ctx.stageFlags>0xffffffff)throw Error('StageAutoScroll native Stage flags required');if(!(ctx.stageFlags&256)){if(!Array.isArray(ctx.players))throw Error('StageAutoScroll actual nullable Player snapshots required');for(const p of ctx.players){if(p===null)continue;if(!Number.isInteger(p.flags)||p.flags<0||p.flags>0xffffffff)throw Error('StageAutoScroll native Player flags required');if(p.flags&512)return 0;}}
 const width=exact(ctx.cameraAreaRaw?.width,'preceding camera Stage area width');if(width<0)throw Error('StageAutoScroll native nonnegative camera width required');const x=point(s.scrollPositionRaw).xRaw,right=add(x,width);let limit=add(times(s.mapWidthTiles,48*F),exact(s.endOffsetRaw,'endOffset'));if(typeof s.isUnlimitScroll!=='boolean')throw Error('StageAutoScroll resolved IsUnlimitScroll required');if(s.isUnlimitScroll)limit=add(width,right);return Math.min(sub(limit,right),exact(s.autoScrollSpeedRaw,'speed'));
}
function updateAutoScroll(s,ctx={}){if(s.scrollType!==2)return {deltaXRaw:0,scrollPositionRaw:clone(point(s.scrollPositionRaw))};if(exact(s.delayTimerRaw,'delay')>0)s.delayTimerRaw=sub(s.delayTimerRaw,exact(ctx.dtRaw,'Frame.DeltaTime'));const deltaXRaw=calculateStepRaw(s,ctx);s.scrollPositionRaw.xRaw=add(point(s.scrollPositionRaw).xRaw,deltaXRaw);return {deltaXRaw,scrollPositionRaw:clone(s.scrollPositionRaw)};}
function beforeStep(s,ctx={}){if(ctx.phase!=='afterCollisionBeforePost')throw Error('StageAutoScroll requires afterCollisionBeforePost phase');if(typeof ctx.phaseEligibleAtEntry!=='boolean')throw Error('StageAutoScroll captured native Stage entry gate required');if(!ctx.phaseEligibleAtEntry)return {deltaXRaw:0,scrollPositionRaw:clone(point(s.scrollPositionRaw))};return updateAutoScroll(s,ctx);}
function setAutoScrollSpeed(s,value){s.autoScrollSpeedRaw=exact(value,'SetAutoScrollSpeed');} // 0x18169d180 direct store, no dt conversion.
function setScrollPosition(s,value){s.scrollPositionRaw=clone(point(value));} // 0x181709ed0/0x180610ea0.
function changeScrollType(s,type){if(![0,1,2].includes(type))throw Error('StageAutoScroll supported native scrollType0/1/2 required');s.scrollType=type;return {kind:'cameraRequest',function:type};} // 0x18170d5fa..673; no timer/position reset.
function solids(){return [];}function displays(){return [];}function afterStep(){return {events:[],sounds:[],solids:[]};}
return {compile,create,phaseEligible,calculateStepRaw,updateAutoScroll,beforeStep,afterStep,solids,displays,setAutoScrollSpeed,setScrollPosition,changeScrollType,supportedTypes:[],completePhysicsFidelity:false};
});
