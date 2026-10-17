/* HalfOperator (7-1) + the stage HalfInput it switches on, and ArrowSign, from
 * the saved Ghidra project ('HalfInputComponent$$', 'HalfOperatorComponent$$',
 * 'ArrowSignComponent$$'); no game executed.
 *  HalfOperator.Creator 0x1818626d0: Stage+1 (input mode) = 3, the half input.
 *   Initialize 0x181862820: m_InputPlayerMax = ((players - 1) >> 1) + 1.
 *   ParseParameter 0x1818629a0 / .cctor 0x181863490: UI pos (0 + slot0,
 *   416 + slot1), scale 10 * slot2 when |slot2| > 3 raw. OnPost 0x181862c40
 *   only rebuilds the UI list of the inputting players (colour, facing).
 *  HalfInputComponent.Update 0x181861cd0 (called by StageComponent.updateInput
 *   0x18170b789, before the actors): a player holding the right keeps it while
 *   isDownAnyButton 0x181862040 (Up/Down/Left/Right/Jump/Shot/Action1/Action2
 *   held), otherwise loses it; then, in player-info order, players without it
 *   that hold any button take it until CalcInputPlayerMax 0x181861ba0 is reached.
 *  isPossible 0x181862170 gates IsDown / WasPressed / WasReleased and
 *   PlayerComponent.IsPressInput (mode 3) for each player.
 *  ArrowSign.Creator 0x1816b0810: m_Direction = (slot0 int == 0) + 2 (3 right,
 *   2 left; 3 when slot0 is not a float), actor flags 0x200 and the facing bit.
 */
(function(root,factory){const api=factory();if(typeof module==='object'&&module.exports)module.exports=api;root.SourceHalfInputDevices=api;})(typeof globalThis!=='undefined'?globalThis:this,function(){
'use strict';
const clone=v=>JSON.parse(JSON.stringify(v));
const allowed=(v,c)=>!v||v<0&&c<=-v||v>0&&v<10&&c>=v||v>=10&&c>=Math.trunc(v/10)&&c<=v%10;
const BUTTONS=['up','down','left','right','jump','shot','action1','action2'];
function compile(actors,count){
 if(!Number.isInteger(count)||count<2||count>8)throw Error('HalfInput count 2..8 required');
 const ops=[],signs=[];
 actors.forEach((raw,i)=>{const a=raw.properties||raw;if(!allowed(a.playerCount,count))return;
  if(a.typeName==='HalfOperator'){if((raw.createThreshold??a.createThreshold??0)!==0)throw Error('HalfOperator delayed creation ordering unresolved');ops.push({id:raw.id||'source:a'+i,name:a.name||''});}
  else if(a.typeName==='ArrowSign'){const d=(a.datas||[])[0];const dir=d&&d.t===1?((Math.trunc(Math.fround(Math.fround(d.f)*65536))>>16)===0?3:2):3;
   signs.push({id:raw.id||'source:a'+i,x:a.posX??raw.x,y:a.posY??raw.y,direction:dir});}
 });
 if(ops.length>1)throw Error('HalfOperator: one stage input mode');
 return {schemaVersion:1,count,enabled:ops.length>0,inputPlayerMax:((count-1)>>1)+1,flags:Array(count).fill(0),signs,completePhysicsFidelity:false};
}
const create=clone;
const anyDown=input=>!!input&&BUTTONS.some(k=>!!input[k]);
// held: per player-info index, the raw input object. Returns the new flags.
function update(state,held){
 if(!state.enabled)return state.flags;
 const n=state.flags.length;let count=0;
 for(let i=0;i<n;i++)if(state.flags[i]){if(!anyDown(held[i]))state.flags[i]=0;else count++;}
 for(let j=0;j<n&&count<state.inputPlayerMax;j++)if(!state.flags[j]&&anyDown(held[j])){state.flags[j]=1;count++;}
 return state.flags;
}
function isPossible(state,index){return !state.enabled||!!state.flags[index];}
function displays(state){return {enabled:state.enabled,max:state.inputPlayerMax,flags:state.flags.slice(),signs:state.signs};}
return {compile,create,update,isPossible,displays,supportedTypes:['HalfOperator','ArrowSign'],completePhysicsFidelity:false};
});
