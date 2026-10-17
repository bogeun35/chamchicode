/* CameraComponent scroll core, read-only native extraction.
 * Initialize0x1817df530: tile dimensions, displayHeight fallback, reciprocal
 * view matrix(+1/chip,-1/chip), stage matrix(+chip,-chip), zero startY -> H-1.
 * calcCameraMoveArea0x1817dfa40 / CalcCameraViewArea0x1817dfc10:
 * height=ortho*2, width=1920/(1080/height), TWO signed FP divisions.
 * RequestNormal0x1817e0330: start=(startTileX+xMin,H-startTileY+yMax-1).
 * ToPlayerCenter0x1817dffd0 / ToMapCenter0x1817e0190 preserve startPosition.Y.
 * funcNormal0x1817e0400: range Top -= MAP_CHIP_SIZE_FP/2 (48, static
 * QGameDefine.cctor0x181780766); center+targetOffset, view transform, clip;
 * X/Y lerp factors clamp(4*dt,0,1)/clamp(3*dt,0,1), clip again.
 * CalcCameraViewStageArea0x1817dfd10 transforms both corners separately.
 * This camera consumes Stage.playerRange; it does not guess player selection
 * or frame ordering. Zoom branch0x1817e0524..64e uses aspect116508,
 * fit multiplier66, deadband24, gain1311, and lerp factor0.75*dt.
 * RequestAuto0x1817e0910 calculates start but does NOT assign position.
 * funcAuto0x1817e0980 centers on Stage.scrollPosition + half viewStage size,
 * then view-transforms/clips; no lerp or scrollPosition writeback.
 * CreateEntity0x1817df4f8 helper0x1807871f0 zero-fills432 bytes@0x1807872ac.
 * Unlimit/unreturn remain explicit refusals.
 */
(function(root,factory){const api=factory();if(typeof module==='object'&&module.exports)module.exports=api;root.SourceCameraNative=api;})(globalThis,function(){
'use strict';
const F=65536;
const clone=x=>JSON.parse(JSON.stringify(x));
function exact(v,label){if(!Number.isSafeInteger(v))throw Error('Camera exact safe raw required: '+label);return v;}
function raw(n){if(!Number.isFinite(n))throw Error('Camera finite authored value required');return exact(Math.trunc(Math.fround(Math.fround(n)*F)),'authored');}
function number(v){return exact(Number(BigInt.asIntN(64,v)),'signed64 result');}
const add=(a,b)=>number(BigInt(a)+BigInt(b));
const sub=(a,b)=>number(BigInt(a)-BigInt(b));
const mul=(a,b)=>number(BigInt.asIntN(64,BigInt(a)*BigInt(b))>>16n);
const div=(a,b)=>{if(!b)throw Error('Camera FP division by zero');return number(BigInt.asIntN(64,BigInt(a)<<16n)/BigInt(b));};
const half=n=>div(n,2*F);
const clamp=(n,lo,hi)=>n<lo?lo:n>hi?hi:n;
function point(p,label){if(!p)throw Error('Camera '+label+' required');exact(p.xRaw,label+'.x');exact(p.yRaw,label+'.y');return p;}
function range(r){if(!r)throw Error('Camera native Stage.playerRange required');for(const k of ['left','right','top','bottom'])exact(r[k],'range.'+k);return r;}
function calculatePlayerRange({stageFlags,players,actors,previousRange}){
 // Stage.calcPlayerRange0x18170d191/2c6: unless Stage bit8, any Player
 // bit9 retains the old range. Actor dictionary entries then contribute only
 // when Actor bit24 is set (0x18170d537), using m_Pos, not collision extents.
 if(!Number.isInteger(stageFlags)||!Array.isArray(players)||!Array.isArray(actors))throw Error('Camera native Stage/Player/Actor snapshot required');
 for(const p of players)if(p!==null&&!Number.isInteger(p.flags))throw Error('Camera native Player flags required');
 if(!(stageFlags&256)&&players.some(p=>p!==null&&(p.flags&512)))return clone(range(previousRange));
 let result=null;
 for(const a of actors){if(a===null)continue;if(!Number.isInteger(a.flags))throw Error('Camera native Actor flags required');if(!(a.flags&0x1000000))continue;const p=point(a.positionRaw,'Actor position');
  if(result===null)result={left:p.xRaw,right:p.xRaw,top:p.yRaw,bottom:p.yRaw};
  else {result.left=Math.min(result.left,p.xRaw);result.right=Math.max(result.right,p.xRaw);result.top=Math.min(result.top,p.yRaw);result.bottom=Math.max(result.bottom,p.yRaw);}
 }
 // Native leaves signed64 extrema for an empty target set; refuse instead of
 // replacing those unrepresentable JSON-safe raws with a plausible zero box.
 if(!result)throw Error('Camera empty target range uses native int64 extrema');return result;
}
function compile(stage){
 if(![0,1,2].includes(stage.scrollType))throw Error('Camera native scrollType0/1/2 required');
 for(const k of ['unlimitScroll','unreturnScroll'])if(stage[k]!==0)throw Error('Camera native '+k+' requires additional branch implementation');
 if(!Number.isInteger(stage.zoomOut))throw Error('Camera explicit zoomOut required');
 const m=stage.mapInitParam;if(!m)throw Error('Camera mapInitParam required');
 for(const k of ['width','height','chipSize','displayTileHeight'])if(!Number.isInteger(m[k]))throw Error('Camera integer '+k+' required');
 if(m.width<=0||m.height<=0||m.chipSize<=0||m.displayTileHeight<0)throw Error('Camera positive map dimensions required');
 if(!Number.isInteger(stage.cameraStartType))throw Error('Camera explicit cameraStartType required');
 return {schemaVersion:1,scrollType:stage.scrollType,cameraFlags:stage.zoomOut?4:0,mapTileWidthRaw:exact(m.width*F,'map width'),mapTileHeightRaw:exact(m.height*F,'map height'),chipRaw:exact(m.chipSize*F,'chip'),upTileHeightRaw:(m.displayTileHeight||m.height)*F,startTileRaw:{xRaw:raw(m.startTileX),yRaw:m.startTileY===0?(m.height-1)*F:raw(m.startTileY)},cameraStartType:stage.cameraStartType};
}
function dimensions(s){const height=mul(s.orthographicSizeRaw,2*F);return {height,width:div(1920*F,div(1080*F,height))};}
function moveArea(s){
 const d=dimensions(s),hx=half(d.width),hy=half(d.height);
 let xMin=hx,xMax=sub(s.mapTileWidthRaw,hx),yMax=-hy,yMin=sub(hy,s.mapTileHeightRaw);
 if(xMax<xMin)xMax=xMin=sub(xMin,half(Math.abs(sub(xMin,xMax))));
 if(yMax<yMin)yMin=yMax=add(yMax,half(Math.abs(sub(yMax,yMin))));
 s.viewTileHeightRaw=d.height;s.viewTileWidthRaw=d.width;s.moveAreaRaw={xMin,xMax,yMin,yMax};return s.moveAreaRaw;
}
function clip(s,p){const a=s.moveAreaRaw;return{xRaw:clamp(p.xRaw,a.xMin,a.xMax),yRaw:clamp(p.yRaw,a.yMin,a.yMax)};}
function stageToWorld(s,p){point(p,'stage point');return{xRaw:mul(p.xRaw,s.viewScaleRaw.xRaw),yRaw:mul(p.yRaw,s.viewScaleRaw.yRaw)};}
function worldToStage(s,p){point(p,'world point');return{xRaw:mul(p.xRaw,s.chipRaw),yRaw:mul(p.yRaw,-s.chipRaw)};}
function request(s,type){
 if(!(s.flags&8)){const a=moveArea(s);s.startPositionRaw={xRaw:add(s.startTileRaw.xRaw,a.xMin),yRaw:sub(add(sub(s.viewTileHeightRaw,s.startTileRaw.yRaw),a.yMax),F)};if(type!==2)s.positionRaw=clip(s,s.startPositionRaw);s.flags|=8;}
 s.function=type;
}
const requestNormal=s=>request(s,1),requestAuto=s=>request(s,2),requestStop=s=>request(s,0);
function toPlayerCenter(s,r){range(r);const center=stageToWorld(s,{xRaw:half(add(r.left,r.right)),yRaw:half(add(r.bottom,r.top))});s.positionRaw=clip(s,{xRaw:center.xRaw,yRaw:s.startPositionRaw.yRaw});}
function toMapCenter(s){const a=s.moveAreaRaw;s.positionRaw=clip(s,{xRaw:half(add(a.xMin,a.xMax)),yRaw:s.startPositionRaw.yRaw});}
function create(compiled,initialPlayerRange){
 const s={...clone(compiled),flags:compiled.cameraFlags,function:0,positionRaw:{xRaw:0,yRaw:0},orthographicSizeRaw:half(compiled.upTileHeightRaw),orthographicMinRaw:half(compiled.upTileHeightRaw),orthographicMaxRaw:half(compiled.mapTileHeightRaw),viewScaleRaw:{xRaw:div(F,compiled.chipRaw),yRaw:div(-F,compiled.chipRaw)},targetOffsetRaw:{xRaw:0,yRaw:0}};
 request(s,compiled.scrollType);
 // Stage.initScroll0x18170b34a..3cb only centers types0/1; no players skips0.
 if(s.cameraStartType===0&&initialPlayerRange!==null)toPlayerCenter(s,initialPlayerRange);
 else if(s.cameraStartType===1)toMapCenter(s);
 return s;
}
function viewAreaRaw(s){const d=dimensions(s);return {height:d.height,width:d.width,x:sub(s.positionRaw.xRaw,half(d.width)),y:add(s.positionRaw.yRaw,s.orthographicSizeRaw)};}
function stageAreaRaw(s){const r=viewAreaRaw(s),a=worldToStage(s,{xRaw:r.x,yRaw:r.y}),b=worldToStage(s,{xRaw:add(r.x,r.width),yRaw:sub(r.y,r.height)});return {height:sub(b.yRaw,a.yRaw),width:sub(b.xRaw,a.xRaw),x:a.xRaw,y:a.yRaw};}
function updateZoom(s,r,dtRaw){
 const original=s.orthographicSizeRaw,wide=mul(original,116508),dx=Math.abs(sub(r.left,r.right)),dy=Math.abs(sub(sub(r.top,24*F),r.bottom));
 const horizontal=sub(dx,number(BigInt(wide)*66n))>sub(dy,number(BigInt(original)*66n));
 const span=horizontal?dx:dy,fit=number(BigInt(horizontal?wide:original)*66n);
 let next=original;
 if(span<=sub(fit,24*F))next=Math.max(s.orthographicMinRaw,sub(original,mul(Math.abs(add(sub(span,fit),24*F)),1311)));
 else if(span>=add(fit,24*F))next=Math.min(s.orthographicMaxRaw,add(original,mul(Math.abs(sub(sub(span,fit),24*F)),1311)));
 if(next!==original)s.orthographicSizeRaw=add(original,mul(sub(next,original),clamp(mul(dtRaw,49152),0,F)));
}
function updateAuto(s,scrollPositionRaw){
 point(scrollPositionRaw,'native Stage.scrollPosition');const area=stageAreaRaw(s);
 s.positionRaw=clip(s,stageToWorld(s,{xRaw:add(scrollPositionRaw.xRaw,half(area.width)),yRaw:add(scrollPositionRaw.yRaw,half(area.height))}));
 return {cameraAreaRaw:stageAreaRaw(s),scrollPositionRaw:clone(scrollPositionRaw)};
}
function update(s,playerRange,dtRaw,scrollPositionRaw){
 if(s.function===0)return {cameraAreaRaw:stageAreaRaw(s)};
 if(s.function===2)return updateAuto(s,scrollPositionRaw);
 if(s.function!==1)throw Error('Camera update requires function0/1/2');
 if(s.flags&3)throw Error('Camera flags need additional branch implementation');
 range(playerRange);exact(dtRaw,'delta time');point(s.targetOffsetRaw,'targetOffset');if(s.flags&4)updateZoom(s,playerRange,dtRaw);moveArea(s);
 const center={xRaw:add(half(add(playerRange.left,playerRange.right)),s.targetOffsetRaw.xRaw),yRaw:add(half(add(playerRange.bottom,sub(playerRange.top,24*F))),s.targetOffsetRaw.yRaw)};
 const target=clip(s,stageToWorld(s,center)),p=s.positionRaw;
 s.positionRaw=clip(s,{xRaw:add(p.xRaw,mul(sub(target.xRaw,p.xRaw),clamp(mul(dtRaw,4*F),0,F))),yRaw:add(p.yRaw,mul(sub(target.yRaw,p.yRaw),clamp(mul(dtRaw,3*F),0,F)))});
 const cameraAreaRaw=stageAreaRaw(s);return {cameraAreaRaw,scrollPositionRaw:{xRaw:cameraAreaRaw.x,yRaw:cameraAreaRaw.y}};
}
return {compile,create,calculatePlayerRange,requestNormal,requestAuto,requestStop,toPlayerCenter,toMapCenter,stageToWorld,worldToStage,viewAreaRaw,stageAreaRaw,update,updateAuto};
});
