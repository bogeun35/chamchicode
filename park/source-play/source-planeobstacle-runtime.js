/* PlaneObstacle (25, NormalPlaneObstacleComponent): 6-3, the playable reconstruction from
 * the saved Ghidra project; the full reading is notes/plane-obstacle-spec.md. No game
 * executed. FP 16.16.
 *  ParseParameter 0x181887cf0: slot 0 kind (>= 6 -> road + BreakableLevel = kind - 4,
 *   0x181887eda), slot 1 m_Level, slot 2 Width (+0x40), slot 3 m_OffsetIndex, slot 4
 *   m_OffsetX, slot 5 Random (0 keeps Reset 0x181699c40's 100), slot 6 RectType (+0x19:
 *   0 -> DamageRect 9, else Rect 30, generateRect 0x18188afc0).
 *  OnStart -> generateObstacles 0x18188eb90: x += OffsetIndex * (players - 2) * OffsetX;
 *   GenerateRoad 0x18188ed70: y = posY + randomY 0x181890120 (Next(0, Random / 25) among
 *   lanes 2..6 away from the previous one, -Random/2 + 25 * lane), floored to the 48 chip
 *   grid (QGameDefine +0), gap = BreakableLevel * 48, top = y - gap / 2 (even level);
 *   walls {H W X Y} = {1000 + top, Width, X, -1000} and {1000, Width, X, top + gap}
 *   (ObstacleComponent RECT_HEIGHT = QFP+0x230). Colour blocks: GetValidColorIndexArray
 *   0x18187c6b0 (the colours of the players holding a gun, in player order), shuffled
 *   i = 1..n-1 with Next(0, i + 1); column (Width - 24 + X) / 48, rows from (top + 24) / 48,
 *   BreakableLevel cells of chip 0x1e + colours[(k >> 1) % n] (attribute 13: solid,
 *   breakable by that colour, QTileMapChipAttrData 0x181781820).
 *  ObstacleComponent.OnPost 0x18188a670: a piece whose right edge is left of the camera
 *   view goes (event 4 answer, DamageRect 0x18180ebf0 / Rect 0x1816e6e70); 6-3 moves none.
 *  A bullet on a chip of its shooter's colour clears it to chip 1 (OnContacted 0x1816e8c70).
 *  DamageRect pieces kill the player touching them (event 43, checkDamage 0x18180e330).
 * Named approximations:
 *  - the obstacles draw from this module's PCG stream in actor order at stage start;
 *  - a DamageRect piece is solid from the start (OnUpdate 0x18180e190 turns its
 *    collision on once nothing pushable is inside it, which holds at birth here).
 */
(function(root,factory){const api=factory();if(typeof module==='object'&&module.exports)module.exports=api;root.SourcePlaneObstacleRuntime=api;})(typeof globalThis!=='undefined'?globalThis:this,function(){
'use strict';
const F=65536,B=BigInt,i64=v=>BigInt.asIntN(64,v);
const num=v=>{const n=Number(v);if(!Number.isSafeInteger(n))throw Error('PlaneObstacle raw outside safe range');return n;};
const mul=(a,b)=>num(i64(B(a)*B(b))>>16n),div=(a,b)=>num(i64(B(a)<<16n)/B(b));
const clone=v=>JSON.parse(JSON.stringify(v));
const allowed=(v,c)=>!v||v<0&&c<=-v||v>0&&v<10&&c>=v||v>=10&&c>=Math.trunc(v/10)&&c<=v%10;
const fp=v=>Math.trunc(Math.fround(Math.fround(v)*F));
const CHIP=48*F,RECT_HEIGHT=1000*F,LANE=25*F,DEFAULT_RANDOM=100*F,CHIP_BASE=0x1e;
const PCG=6364136223846793005n,M64=(1n<<64n)-1n;
function pcg32(rng){const old=B(rng.state);rng.state=((old*PCG+(B(rng.inc)|1n))&M64).toString();const x=Number(((old>>45n)^(old>>27n))&0xffffffffn),rot=Number(old>>59n);return ((x>>>rot)|(x<<((32-rot)&31)))>>>0;}
function nextInt(rng,min,max){if(min===max)return min;let lo=max,hi=min;if(min<max){lo=min;hi=max;}const u=(hi-lo)>>>0,threshold=(2**32-u)%u;let x;do x=pcg32(rng);while(x<threshold);return lo+x%u;}
function slotFP(a,i){const d=(a.datas||[])[i];return d&&d.t===1?fp(d.f):0;}
const slotInt=(a,i)=>slotFP(a,i)>>16;
function compile(actors,count){
 if(!Number.isInteger(count)||count<2||count>8)throw Error('PlaneObstacle count 2..8 required');const obstacles=[];
 actors.forEach((raw,i)=>{const a=raw.properties||raw;if(a.typeName!=='PlaneObstacle'||!allowed(a.playerCount,count))return;
  const kind=slotInt(a,0);if(kind<6)throw Error('PlaneObstacle kind '+kind+': only the breakable road (kind >= 6) is reconstructed');
  if(slotInt(a,1)!==0)throw Error('PlaneObstacle m_Level != 0 is not reconstructed');
  obstacles.push({id:raw.id||'source:a'+i,xRaw:fp(a.posX),yRaw:fp(a.posY),breakable:kind-4,widthRaw:slotFP(a,2)||0,offsetIndex:slotInt(a,3),offsetXRaw:slotFP(a,4),
   randomRaw:slotFP(a,5)!==0?slotFP(a,5):DEFAULT_RANDOM,rectType:(slotFP(a,6)>>16)&255,prevRandom:-1});});
 return {schemaVersion:1,count,obstacles,walls:[],chips:{},started:false,completePhysicsFidelity:false};
}
const create=clone;
// randomY 0x181890120
function randomY(o,rng){const n=Math.trunc(div(o.randomRaw,LANE)/F);if(n<1)return 0;const list=[];
 for(let i=0;i<n;i++)if(o.prevRandom<0||((Math.abs(i-o.prevRandom)-2)>>>0)<=4)list.push(i);
 o.prevRandom=list[nextInt(rng,0,list.length)];return div(-o.randomRaw,2*F)+o.prevRandom*LANE;}
/* OnStart for every obstacle in actor order. host: {rng, playerCount, colors: the colour
 * indexes of the players holding a gun, in player order}. */
function start(st,host){if(st.started)return;st.started=true;
 for(const o of st.obstacles){
  o.xRaw+=o.offsetIndex*(host.playerCount-2)*o.offsetXRaw;
  let y=o.yRaw+randomY(o,host.rng);y=mul(div(y,CHIP)&~0xffff,CHIP);
  const gap=o.breakable*CHIP,top=o.breakable%2===0?y-div(gap,2*F):y-(o.breakable>>1)*CHIP;
  const type=o.rectType!==0?'Rect':'DamageRect';
  st.walls.push({id:o.id+':top',type,xRaw:o.xRaw,yRaw:-RECT_HEIGHT,wRaw:o.widthRaw,hRaw:RECT_HEIGHT+top});
  st.walls.push({id:o.id+':bottom',type,xRaw:o.xRaw,yRaw:top+gap,wRaw:o.widthRaw,hRaw:RECT_HEIGHT});
  const cols=host.colors.slice(),n=cols.length;if(!n)throw Error('PlaneObstacle: no player holds a gun (GetValidColorIndexArray is empty)');
  for(let i=1;i<n;i++){const j=nextInt(host.rng,0,i+1);const t=cols[i];cols[i]=cols[j];cols[j]=t;}
  const half=div(CHIP,2*F),col=Math.trunc(Math.trunc((o.widthRaw-half+o.xRaw)/F)/48),row0=Math.trunc(Math.trunc((top+half)/F)/48);
  for(let k=0;k<o.breakable;k++)st.chips[col+','+(row0+k)]=CHIP_BASE+(cols[(k>>1)%n]&255);
  o.top=top;}}
// ObstacleComponent.OnPost: a piece entirely left of the camera view goes
function post(st,viewRaw){st.walls=st.walls.filter(w=>viewRaw.x<=w.xRaw+w.wRaw);}
// OnContacted on the map: the shooter's colour clears the chip to 1 (passable)
function breakChip(st,chip,colorIndex){const key=chip.gx+','+chip.gy,v=st.chips[key];if(v===undefined)return false;
 if(v-CHIP_BASE!==colorIndex)return false;delete st.chips[key];return true;}
function solids(st){return [...st.walls.map(w=>({id:w.id,x:w.xRaw/F,y:w.yRaw/F,w:w.wRaw/F,h:w.hRaw/F,damage:w.type==='DamageRect'})),
 ...Object.entries(st.chips).map(([k,v])=>{const [gx,gy]=k.split(',').map(Number);return {id:'chip:'+k,x:gx*48,y:gy*48,w:48,h:48,chip:{gx,gy},colorIndex:v-CHIP_BASE};})];}
function displays(st){return {walls:st.walls.map(w=>({id:w.id,type:w.type,x:w.xRaw/F,y:w.yRaw/F,w:w.wRaw/F,h:w.hRaw/F})),
 chips:Object.entries(st.chips).map(([k,v])=>{const [gx,gy]=k.split(',').map(Number);return {gx,gy,colorIndex:v-CHIP_BASE};})};}
return {compile,create,start,post,breakChip,solids,displays,randomY,pcg32,nextInt,
 supportedTypes:['PlaneObstacle'],nativeConstants:{CHIP,RECT_HEIGHT,LANE,DEFAULT_RANDOM,CHIP_BASE},completePhysicsFidelity:false};
});
