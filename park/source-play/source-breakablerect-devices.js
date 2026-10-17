/* BreakableRectComponent, static reconstruction from the saved Ghidra project
 * (tools/ghidra/decompile.sh 'BreakableRectComponent$$'); no game executed.
 * ParseParameter 0x1817d6a80:
 *   slot0 / slot1 numeric raws (width / height base), slots 2..5 are
 *   QPlayerCountParam tables read through 0x18096f720. Each table is looked up
 *   from count-2 DOWNWARD to the first nonzero entry (the do/while at
 *   0x1817d6c49 / 0x1817d6cc4 / 0x1817d6d74), zero if none.
 *   rect (H,W,X,Y order, +0x18..+0x30) = (slot1+T3, slot0+T2, 0, -(slot1+T3)):
 *   anchored bottom-left. T4/T5 (searched as a pair) are ADDED to the actor's
 *   position (+0x28/+0x30 of the parameter, the creation position).
 * Creator 0x1817d6960 / InitCollision 0x1817d6eb0: CreateCollision(rect,2,1,0),
 *   bytes 0x602 and flags|0x14 - a map-like solid block.
 * OnContacted 0x1817d73b0: in phase 0, an other Actor whose type (short +6) is
 *   0x5d Thorn, 0x7a or 0x8f ThornShell starts the break (phase 1). Type 0x7a is
 *   not created by any `mov edx,0x7a; call Frame.GetFactoryParam` site and no
 *   shipped stage places it; it is kept in the list exactly as the native has it.
 * OnUpdate/updatePhase 0x1817d6ff0:
 *   1: SetEnableDisplay(false), createDebris (visual + SE 6), timer = QFP._0_10
 *      (raw 6553), phase 2.
 *   2: timer -= Frame.DeltaTime; when timer <= QFP._0 the actor flag 0x2000
 *      (exit) is set, phase 3. The collision stays until that exit.
 * OnRecvEvent 0x1817d7340: 0x31 setActive, 0x37 setVisible, 0x35 enableDisplay,
 *   0x33 animation, 0x3f/0x40 positions, 0x24/0x25/0x1b jump - common Actor
 *   events; none of them breaks the block, so they are left to the host.
 */
(function(root,factory){const api=factory();if(typeof module==='object'&&module.exports)module.exports=api;root.SourceBreakableRectDevices=api;})(typeof globalThis!=='undefined'?globalThis:this,function(){
'use strict';
const F=65536,ENTRIES=7,BREAK_TYPES=[0x5d,0x7a,0x8f],QFP_0_10=6553;
const allowed=(v,c)=>!v||v<0&&c<=-v||v>0&&v<10&&c>=v||v>=10&&c>=Math.trunc(v/10)&&c<=v%10;
// Stage floats go through QStageFileConverter.convertFP 0x180554310 (AGENTS.md).
const stageFp=v=>Math.trunc(Math.fround(Math.fround(v)*F));
function slot(a,i){const d=a.datas||[];return d[i];}
function numeric(a,i){const s=slot(a,i);if(!s)throw Error('BreakableRect missing slot '+i+' on '+a.name);return s.t===1?stageFp(s.f):0;}
function table(a,i){
 const s=slot(a,i);
 if(!s||s.t!==2||typeof s.s!=='string'||!s.s.length)return new Array(ENTRIES).fill(0);
 if(s.s.length!==ENTRIES*8)throw Error('BreakableRect population table length '+s.s.length+' at slot '+i);
 const bytes=[...s.s].map(c=>(c.codePointAt(0)-0x21)&0xff),out=[];
 for(let e=0;e<ENTRIES;e++){let v=0n;for(let k=7;k>=0;k--)v=(v<<8n)|BigInt(bytes[e*8+k]);if(v>=1n<<63n)v-=1n<<64n;out.push(Number(v));}
 if(out.some(v=>!Number.isSafeInteger(v)))throw Error('BreakableRect table entry outside safe range');
 return out;
}
// count-2 downward to the first nonzero entry
function lookDown(values,count){for(let i=count-2;i>=0;i--)if(values[i]!==0)return values[i];return 0;}
function lookDownPair(a,b,count){for(let i=count-2;i>=0;i--)if(a[i]!==0||b[i]!==0)return [a[i],b[i]];return [0,0];}
function compile(actors,count){
 if(!Number.isInteger(count)||count<2||count>8)throw Error('BreakableRect count 2..8 required');
 const blocks=[];
 actors.forEach((raw,i)=>{const a=raw.properties||raw;if(a.typeName!=='BreakableRect'||!allowed(a.playerCount,count))return;
  if((raw.createThreshold??a.createThreshold??0)!==0)throw Error('BreakableRect delayed creation ordering unresolved');
  const w=numeric(a,0)+lookDown(table(a,2),count),h=numeric(a,1)+lookDown(table(a,3),count);
  const [ox,oy]=lookDownPair(table(a,4),table(a,5),count);
  if(w<=0||h<=0)throw Error('BreakableRect nonpositive rect on '+a.name);
  blocks.push({id:raw.id||'source:a'+i,name:a.name||'',type:'BreakableRect',
   xRaw:stageFp(a.posX??raw.x)+ox,yRaw:stageFp(a.posY??raw.y)+oy,
   rectRaw:{heightRaw:h,widthRaw:w,xRaw:0,yRaw:-h},phase:0,timerRaw:0,display:true,exited:false,debris:null});});
 return {schemaVersion:1,count,blocks,completePhysicsFidelity:false};
}
const create=x=>JSON.parse(JSON.stringify(x));
function rectOf(b){return {x:(b.xRaw+b.rectRaw.xRaw)/F,y:(b.yRaw+b.rectRaw.yRaw)/F,w:b.rectRaw.widthRaw/F,h:b.rectRaw.heightRaw/F};}
// Solid until the exit flag; display goes first (phase 1).
function solids(state){return state.blocks.filter(b=>!b.exited).map(b=>({id:b.id,type:'BreakableRect',...rectOf(b)}));}
// OnContacted: other actor's type ordinal.
function contacted(state,blockId,otherActorType){
 const b=state.blocks.find(q=>q.id===blockId);if(!b||b.phase!==0)return false;
 if(!Number.isInteger(otherActorType))throw Error('BreakableRect contact needs the other actor type ordinal');
 if(!BREAK_TYPES.includes(otherActorType))return false;b.phase=1;return true;
}
function update(b,dtRaw){
 if(b.phase===1){b.display=false;const r=rectOf(b);b.debris={x:r.x+r.w/2,y:r.y+r.h/2,w:r.w,h:r.h,seId:6};b.timerRaw=QFP_0_10;b.phase=2;return;}
 if(b.phase===2){b.timerRaw-=dtRaw;if(b.timerRaw<=0){b.exited=true;b.phase=3;}}
}
function beforeStep(state,ctx={}){
 const dtRaw=ctx.dtRaw??1092;if(!Number.isSafeInteger(dtRaw)||dtRaw<0)throw Error('BreakableRect FP delta required');
 const broke=[];for(const b of state.blocks){const was=b.phase;update(b,dtRaw);if(was===1)broke.push(b.id);}
 return {events:[],broke,deadPlayerIds:[]};
}
function displays(state){return state.blocks.filter(b=>b.display&&!b.exited).map(b=>({id:b.id,...rectOf(b)}));}
return {compile,create,solids,contacted,beforeStep,displays,supportedTypes:['BreakableRect'],
 nativeConstants:{breakActorTypes:BREAK_TYPES,exitDelayRaw:QFP_0_10},completePhysicsFidelity:false,
 integration:{contact:'Call contacted(state,id,otherType) for every actor touching the block (Thorn 0x5d / 0x7a / ThornShell 0x8f break it). beforeStep once per update. Solid until exit.'}};
});
