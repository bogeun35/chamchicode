/* FrontSwitch (206), SwitchRect (63), SwitchIceRect (217) and IceRect (216),
 * 15-4 / 2-3, reconstructed from the saved Ghidra project; no game executed.
 * Component offsets = quantum-field-offsets.json - 0x10.
 *
 * FrontSwitch:
 *  .cctor 0x18184b7d0: COLLISION_RECT (H,W,X,Y) = (20,20,-10,-10).
 *  ParseParameter 0x18184acc0: slot0 target, slot1 sub-target, slot2 int != 0
 *   -> m_Flags 0x20 (released while untouched), slots 3/4 QPlayerCountParam<FP>
 *   position offsets (walk-down until either is non-zero) added to the create
 *   position. Creator: Stage+4 bit 0x40 -> flag 1. InitCollision: sensor
 *   (pushBack 0), layer 5. OnStart: SwitchObserver.AddSwitch.
 *  OnCollided 0x18184b780: an other collider with pushBackTarget bit 2 on layer
 *   1..3 or 8, while flag 4 is clear -> flag 4 (flag 0x10 with 2 first drops 2).
 *  OnUpdate 0x18184b300: touched and off -> changeSwitchState(1) (SE 9,
 *   event 61 to target and sub-target), flag 2; untouched and on ->
 *   changeSwitchState(0) (event 60), flag 2 off; then flag 0x20 clears 4;
 *   flag 8 becomes 0x10. OnRecvEvent 0x2f clears 4.
 *
 * SwitchRect / SwitchIceRect (same component code, collision word 0x602 /
 *  0x604; the low byte's bit 4 is what PlayerComponent.checkIceFloor reads):
 *  ParseParameter 0x1817189c0: slot0 width (negative: x += w, w = -w), slot1
 *   height, slot2 switch type byte, slot3 delay (> 0); rect (H,W,X,Y) =
 *   (h, w, 0, -h). InitCollision: pushBack 2, priority/layer word, fixed|static.
 *   Visible (and collidable) at start for types 1 and 3.
 *  OnUpdate 0x181718d10: type 0 appearProc (count 0: visible -> after the
 *   delay disappear; count > 0: delay reloaded, invisible -> appear); 1 the
 *   mirror (count 0: invisible -> after the delay appear; count > 0: delay
 *   reloaded, visible -> disappear); 2 count > 0 and invisible -> appear;
 *   3 count > 0 and visible -> disappear. appear 0x181719290 is refused while
 *   any pushBack-3 body overlaps (IsCollidedByPushBackTarget).
 *  OnRecvEvent 0x181719490: 61 count++, 60 count-- (not below 0).
 *
 * IceRect: Creator 0x181864500 / ParseParameter 0x1818647d0: slots 0..5 width,
 *  height, width/height per extra player, x/y per extra player ((count - 2)
 *  times), slots 6/7 QPlayerCountParam<FP> position offsets; rect (h, w, 0, -h);
 *  pushBack 2, collision word 0x606, fixed|static. A plain solid that is ice.
 */
(function(root,factory){const api=factory();if(typeof module==='object'&&module.exports)module.exports=api;root.SourceFrontSwitchDevices=api;})(typeof globalThis!=='undefined'?globalThis:this,function(){
'use strict';
const F=65536;
const clone=v=>JSON.parse(JSON.stringify(v));
const allowed=(v,c)=>!v||v<0&&c<=-v||v>0&&v<10&&c>=v||v>=10&&c>=Math.trunc(v/10)&&c<=v%10;
const fp=v=>Math.trunc(Math.fround(Math.fround(v)*F));
const mul=(a,b)=>Number(BigInt.asIntN(64,BigInt(a)*BigInt(b))>>16n);
function slotRaw(a,i){const d=(a.datas||[])[i];return d&&d.t===1?fp(d.f):0;}
function slotStr(a,i){const d=(a.datas||[])[i];return d&&d.t===2?d.s||'':'';}
function fpTable(a,i){const d=(a.datas||[])[i];if(!d||d.t!==2||typeof d.s!=='string'||d.s.length!==56)return Array(7).fill(0);
 const t=[];for(let e=0;e<7;e++){let v=0n;for(let k=7;k>=0;k--)v=(v<<8n)|BigInt(((d.s.charCodeAt(e*8+k)&0xff)-0x21)&0xff);t.push(Number(BigInt.asIntN(64,v)));}return t;}
// paired walk-down: the first population (from count-2 down) where either entry is non-zero
function pairFind(tx,ty,count){if(count<2)return [0,0];for(let i=Math.min(count-2,6);i>=0;i--)if(tx[i]!==0||ty[i]!==0)return [tx[i],ty[i]];return [0,0];}
const SENSOR={heightRaw:20*F,widthRaw:20*F,xRaw:-10*F,yRaw:-10*F};
function compile(actors,count,options={}){
 if(!Number.isInteger(count)||count<2||count>8)throw Error('FrontSwitch count 2..8 required');
 const switches=[],rects=[],ices=[];const stageFlags=options.stageFlags||0;
 actors.forEach((raw,i)=>{const a=raw.properties||raw;if(!['FrontSwitch','SwitchRect','SwitchIceRect','IceRect'].includes(a.typeName)||!allowed(a.playerCount,count))return;
  if((raw.createThreshold??a.createThreshold??0)!==0)throw Error(a.typeName+' delayed creation ordering unresolved');
  const id=raw.id||'source:a'+i;let xRaw=fp(a.posX??raw.x),yRaw=fp(a.posY??raw.y);
  if(a.typeName==='FrontSwitch'){const [ox,oy]=pairFind(fpTable(a,3),fpTable(a,4),count);xRaw+=ox;yRaw+=oy;
   switches.push({id,name:a.name||'',type:'FrontSwitch',xRaw,yRaw,target:slotStr(a,0),subTarget:slotStr(a,1),flags:((slotRaw(a,2)>>16)!==0?0x20:0)|((stageFlags&0x40)?1:0),isOn:0});return;}
  if(a.typeName==='IceRect'){const e=count-2,t=e*F;let w=slotRaw(a,0)+mul(slotRaw(a,2),t),h=slotRaw(a,1)+mul(slotRaw(a,3),t);xRaw+=mul(slotRaw(a,4),t);yRaw+=mul(slotRaw(a,5),t);
   const [ox,oy]=pairFind(fpTable(a,6),fpTable(a,7),count);xRaw+=ox;yRaw+=oy;if(w<0){xRaw+=w;w=-w;}
   ices.push({id,name:a.name||'',type:'IceRect',xRaw,yRaw,rect:{heightRaw:h,widthRaw:w,xRaw:0,yRaw:-h},ice:true});return;}
  let w=slotRaw(a,0);const h=slotRaw(a,1),type=((slotRaw(a,2)>>>0)>>>16)&0xff,delay=slotRaw(a,3);if(w<0){xRaw+=w;w=-w;}
  if(type>3)throw Error(a.typeName+' switch type outside 0..3');
  rects.push({id,name:a.name||'',type:a.typeName,xRaw,yRaw,rect:{heightRaw:h,widthRaw:w,xRaw:0,yRaw:-h},switchType:type,count:0,delayRaw:delay>0?delay:0,timerRaw:0,
   visible:type===1||type===3,ice:a.typeName==='SwitchIceRect'});
 });
 return {schemaVersion:1,count,switches,rects,ices,completePhysicsFidelity:false};
}
const create=clone;
function sensorRect(sw){return {x:(sw.xRaw+SENSOR.xRaw)/F,y:(sw.yRaw+SENSOR.yRaw)/F,w:SENSOR.widthRaw/F,h:SENSOR.heightRaw/F};}
function rectOf(r){return {x:(r.xRaw+r.rect.xRaw)/F,y:(r.yRaw+r.rect.yRaw)/F,w:r.rect.widthRaw/F,h:r.rect.heightRaw/F};}
// OnCollided: a solid (pushBackTarget bit 2) body on layer 1..3 or 8 touched it.
function touch(sw){if(sw.flags&4)return;if((sw.flags&0x10)&&(sw.flags&2))sw.flags&=~2;sw.flags|=4;}
// OnUpdate. Returns the events it sends.
function switchUpdate(sw){
 const events=[],send=on=>{for(const name of [sw.target,sw.subTarget])if(name)events.push({eventType:on?61:60,targetName:name,senderId:sw.id,on});sw.isOn=on?1:0;};
 const on=sw.flags&2;
 if(!(sw.flags&4)){if(on){send(false);sw.flags&=~2;}}
 else if(!on){send(true);sw.flags|=2;}
 if(sw.flags&0x20)sw.flags&=~4;
 const f=sw.flags;sw.flags&=~0x10;if(f&8)sw.flags=(f&0xffe3)|0x10;
 return events;
}
function receiveEvent(target,type){
 if(target.type==='FrontSwitch'){if(type===47){target.flags&=~4;return true;}return false;}
 if(type===61){target.count=(target.count+1)<<24>>24;return true;}
 if(type===60){if(target.count>0)target.count--;return true;}
 return false;
}
/* One SwitchRect/SwitchIceRect update. blocked(rect) -> a pushBack-3 body overlaps. */
function rectUpdate(r,dtRaw,blocked){
 const appear=()=>{if(!blocked(rectOf(r)))r.visible=true;},disappear=()=>{r.visible=false;};
 switch(r.switchType){
 case 0:if(r.count<1){if(r.visible){r.timerRaw-=dtRaw;if(r.timerRaw<=0)disappear();}}
  else{r.timerRaw=r.delayRaw;if(!r.visible)appear();}break;
 case 1:if(r.count<1){if(!r.visible){r.timerRaw-=dtRaw;if(r.timerRaw<=0)appear();}}
  else{r.timerRaw=r.delayRaw;if(r.visible)disappear();}break;
 case 2:if(r.count>0&&!r.visible)appear();break;
 case 3:if(r.count>0&&r.visible)disappear();break;
 }
}
function solids(state){return [...state.ices.map(r=>({id:r.id,type:'IceRect',...rectOf(r),ice:true})),...state.rects.filter(r=>r.visible).map(r=>({id:r.id,type:r.type,...rectOf(r),ice:r.ice}))];}
function displays(state){return {switches:state.switches.map(s=>({id:s.id,...sensorRect(s),on:!!s.isOn})),rects:state.rects.map(r=>({id:r.id,...rectOf(r),visible:r.visible,ice:r.ice})),ices:state.ices.map(r=>({id:r.id,...rectOf(r)}))};}
return {compile,create,touch,switchUpdate,receiveEvent,rectUpdate,solids,displays,sensorRect,rectOf,supportedTypes:['FrontSwitch','SwitchRect','SwitchIceRect','IceRect'],nativeConstants:{SENSOR},completePhysicsFidelity:false};
});
