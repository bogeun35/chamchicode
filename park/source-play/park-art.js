/* 참치파크 그림 (콩눈 파스텔).
 * Drawing only. Nothing in this file writes to the simulation state: it reads
 * the same fields the old flat renderer read and keeps its own animation memory
 * (facing, landing squash, sparkles) in module-local maps. Every shape that
 * stands for a collider is drawn on the collider's exact edges: platform tops,
 * player feet, spike tips, beam widths and button faces are where the runtime
 * tests them. Static layers (terrain, parallax) are painted once and cached. */
(function(root){
'use strict';
const VW=1200,VH=675,T=48;
const FONT="'Jua','Malgun Gothic','Apple SD Gothic Neo',system-ui,sans-serif";
const INK='#2a2118',CHEEK='#ffb3c1';

// ------------------------------------------------------------------ colour
function hex(c){const n=parseInt(c.slice(1),16);return [n>>16&255,n>>8&255,n&255];}
function toHex(a){return '#'+a.map(v=>Math.max(0,Math.min(255,Math.round(v))).toString(16).padStart(2,'0')).join('');}
function mix(a,b,k){const A=hex(a),B=hex(b);return toHex(A.map((v,i)=>v+(B[i]-v)*k));}
function rgba(c,a){const [r,g,b]=hex(c);return `rgba(${r},${g},${b},${a})`;}
function hash(a,b){let h=Math.imul(a|0,374761393)+Math.imul(b|0,668265263)|0;h=Math.imul(h^(h>>>13),1274126177);return ((h^(h>>>16))>>>0)/4294967296;}

// Same hue order as before (1 orange ... 8 violet) so nobody's colour changes.
// Colour is never the only cue: every friend also has its own head piece and
// carries its number on a badge.
const FRIENDS=[
 {body:'#ffad66',dark:'#b25a18',light:'#ffe4c9',acc:'sprout'},
 {body:'#6fdccf',dark:'#1f8076',light:'#d8f8f3',acc:'bow'},
 {body:'#a99cff',dark:'#5546b8',light:'#ebe6ff',acc:'crown'},
 {body:'#ff8fb4',dark:'#b8406c',light:'#ffe4ed',acc:'flower'},
 {body:'#b2e070',dark:'#568f22',light:'#eff9dc',acc:'beanie'},
 {body:'#78b6ff',dark:'#2963b8',light:'#deecff',acc:'antenna'},
 {body:'#f6d46a',dark:'#9c7a12',light:'#fdf5d4',acc:'ears'},
 {body:'#df9cff',dark:'#8a40b8',light:'#f8e8ff',acc:'fin'}];

// ------------------------------------------------------------------ themes
// One look per world. Terrain colours are chosen to stay clearly apart from the
// sky, and every device keeps its own fixed colours on top of any theme.
const THEMES={
 1:{key:'meadow',sky:['#a5dbff','#d3efff','#fff4de'],far:'#c4e6d2',mid:'#a3d6ae',
  soil:'#e6bb8b',soil2:'#d8a674',edge:'#8f5a33',cap:'#9edb82',capHi:'#cdf3aa',capEdge:'#4f9246',under:'#c0895a',speck:'#f2d2a8',pit:'#5a3d2b'},
 4:{key:'canyon',sky:['#7a69c6','#d796b8','#ffd5a8'],far:'#bd88ad',mid:'#9c6b98',
  soil:'#d6987a',soil2:'#c58466',edge:'#5f3132',cap:'#f2c493',capHi:'#ffe3bd',capEdge:'#9b5b46',under:'#a9614f',speck:'#e8b597',pit:'#3d2238'},
 5:{key:'beach',sky:['#7ccdf0','#c0eef8','#fff4da'],far:'#7cc6df',mid:'#bfe6d6',
  soil:'#f1d29a',soil2:'#e4bf82',edge:'#9b733c',cap:'#fff0c6',capHi:'#fffbea',capEdge:'#c99b55',under:'#cda46a',speck:'#fbe5bb',pit:'#2c5d73'},
 10:{key:'night',sky:['#141a3f','#2b2764','#573e86'],far:'#262862',mid:'#302d6c',
  soil:'#8486d6',soil2:'#7476c6',edge:'#25235e',cap:'#b2b3f4',capHi:'#dddeff',capEdge:'#5455aa',under:'#5f61b0',speck:'#c3c4ff',pit:'#0c0d26'},
 11:{key:'cave',sky:['#162038','#21304e','#2e4262'],far:'#26375a',mid:'#2f4468',
  soil:'#6f90b8',soil2:'#6384ac',edge:'#1f3a62',cap:'#dcefff',capHi:'#ffffff',capEdge:'#8fb3da',under:'#4e6e97',speck:'#a3c1e2',pit:'#0b1220'}};
function worldOf(id){const m=/^st_w_(\d+)_/.exec(id||'');return m?Number(m[1]):1;}
function themeOf(map){return THEMES[worldOf(map&&map.id)]||THEMES[1];}

// ------------------------------------------------------------------ helpers
function canvasOf(w,h){
 if(root.document&&root.document.createElement){const c=root.document.createElement('canvas');c.width=w;c.height=h;return c;}
 if(typeof OffscreenCanvas!=='undefined')return new OffscreenCanvas(w,h);
 return null;
}
function rr(c,x,y,w,h,r){
 let [a,b,d,e]=Array.isArray(r)?r:[r,r,r,r];const m=Math.min(w,h)/2;
 a=Math.min(a,m);b=Math.min(b,m);d=Math.min(d,m);e=Math.min(e,m);
 c.beginPath();c.moveTo(x+a,y);c.lineTo(x+w-b,y);if(b)c.arcTo(x+w,y,x+w,y+b,b);else c.lineTo(x+w,y);
 c.lineTo(x+w,y+h-d);if(d)c.arcTo(x+w,y+h,x+w-d,y+h,d);else c.lineTo(x+w,y+h);
 c.lineTo(x+e,y+h);if(e)c.arcTo(x,y+h,x,y+h-e,e);else c.lineTo(x,y+h);
 c.lineTo(x,y+a);if(a)c.arcTo(x,y,x+a,y,a);else c.lineTo(x,y);c.closePath();
}
function ellipse(c,x,y,rx,ry,rot=0){c.beginPath();c.ellipse(x,y,Math.max(.1,rx),Math.max(.1,ry),rot,0,Math.PI*2);}
function fillStroke(c,fill,stroke,width){if(fill){c.fillStyle=fill;c.fill();}if(stroke){c.strokeStyle=stroke;c.lineWidth=width||1.5;c.stroke();}}
const intersects=(r,v,m=0)=>r.x<v.x1+m&&r.x+r.w>v.x0-m&&r.y<v.y1+m&&r.y+r.h>v.y0-m;

// ------------------------------------------------------------------ terrain
// Platforms in every connected stage are whole 48px tiles, so the ground is
// auto-tiled: an outline only where a side faces air, rounded outer corners,
// a cap on faces that look up, a soft shade on faces that look down. The outer
// edge of the outline IS the collider edge.
function texture(c,theme,x,y,cx,cy){
 const r=(k)=>hash(cx*7+k,cy*13-k);
 c.save();
 if(theme.key==='canyon'){
  c.strokeStyle=rgba(theme.edge,.18);c.lineWidth=2;c.beginPath();
  const row=cy%2?24:0;c.moveTo(x,y+24);c.lineTo(x+T,y+24);c.moveTo(x+(row+12)%T,y);c.lineTo(x+(row+12)%T,y+24);c.moveTo(x+(row+36)%T,y+24);c.lineTo(x+(row+36)%T,y+T);c.stroke();
 }
 for(let k=0;k<3;k++){
  const px=x+7+r(k)*34,py=y+9+r(k+5)*30,s=2+r(k+9)*2.6;if(r(k+20)<.25)continue;
  if(theme.key==='night'&&k===0){c.fillStyle=rgba(theme.speck,.75);star(c,px,py,s*.9,s*.4,4);c.fill();continue;}
  if(theme.key==='cave'&&k===0){c.fillStyle=rgba('#ffffff',.45);c.beginPath();c.moveTo(px,py-s*1.6);c.lineTo(px+s*.7,py);c.lineTo(px,py+s*1.2);c.lineTo(px-s*.7,py);c.closePath();c.fill();continue;}
  c.fillStyle=k===1?rgba(theme.soil2,.9):rgba(theme.speck,.8);ellipse(c,px,py,s*1.2,s*.8,r(k+30)*3);c.fill();
 }
 if(theme.key==='beach'&&r(40)<.35){const px=x+12+r(41)*24,py=y+16+r(42)*20;c.strokeStyle=rgba(theme.edge,.35);c.lineWidth=1.2;c.beginPath();c.arc(px,py,3.2,Math.PI,0);c.stroke();}
 c.restore();
}
function buildTerrain(map,theme,scale){
 const cols=Math.ceil(map.width/T),rows=Math.ceil(map.height/T),grid=new Uint8Array(cols*rows);
 for(const p of map.platforms||[]){
  const x0=Math.round(p.x/T),y0=Math.round(p.y/T),x1=Math.round((p.x+p.w)/T),y1=Math.round((p.y+p.h)/T);
  for(let y=Math.max(0,y0);y<Math.min(rows,y1);y++)for(let x=Math.max(0,x0);x<Math.min(cols,x1);x++)grid[y*cols+x]=1;
 }
 // Outside the map counts as solid so the border walls do not grow an outline
 // against nothing.
 const solid=(x,y)=>x<0||y<0||x>=cols||y>=rows?1:grid[y*cols+x];
 const canvas=canvasOf(Math.max(1,Math.ceil(map.width*scale)),Math.max(1,Math.ceil(map.height*scale)));if(!canvas)return null;
 const c=canvas.getContext('2d');c.scale(scale,scale);
 const B=3,R=10,cells=[];
 for(let cy=0;cy<rows;cy++)for(let cx=0;cx<cols;cx++)if(grid[cy*cols+cx]){
  const top=!solid(cx,cy-1),bot=!solid(cx,cy+1),lef=!solid(cx-1,cy),rig=!solid(cx+1,cy);
  cells.push({cx,cy,x:cx*T,y:cy*T,top,bot,lef,rig,outer:[top&&lef?R:0,top&&rig?R:0,bot&&rig?R:0,bot&&lef?R:0]});
 }
 const inner=k=>{const o=1;return {x:k.x+(k.lef?B:-o),y:k.y+(k.top?B:-o),w:T-(k.lef?B:-o)-(k.rig?B:-o),h:T-(k.top?B:-o)-(k.bot?B:-o),
  r:k.outer.map(v=>v?v-B:0)};};
 // Pass 1: outline colour on the exact tile, pass 2: body fill that overlaps
 // its solid neighbours by a pixel so no seam shows when the cache is scaled.
 c.fillStyle=theme.edge;for(const k of cells){rr(c,k.x,k.y,T,T,k.outer);c.fill();}
 c.fillStyle=theme.soil;for(const k of cells){const i=inner(k);rr(c,i.x,i.y,i.w,i.h,i.r);c.fill();}
 for(const k of cells){
  const i=inner(k);c.save();rr(c,i.x,i.y,i.w,i.h,i.r);c.clip();
  texture(c,theme,k.x,k.y,k.cx,k.cy);
  c.restore();
 }
 // Side and underside shades are drawn unclipped and opaque, overlapping the
 // solid neighbour by a pixel, so the scaled cache shows no seam between tiles.
 const RI=R-B;
 for(const k of cells){
  const y0=k.top?k.y+B+RI:k.y-1,y1=k.bot?k.y+T-B-RI:k.y+T+1,x0=k.lef?k.x+B:k.x-1,x1=k.rig?k.x+T-B:k.x+T+1;
  if(k.lef){c.fillStyle=mix(theme.soil,'#ffffff',.12);c.fillRect(k.x+B,y0,4,y1-y0);}
  if(k.rig){c.fillStyle=mix(theme.soil,theme.under,.35);c.fillRect(k.x+T-B-5,y0,5,y1-y0);}
  if(k.bot){c.fillStyle=mix(theme.soil,theme.under,.35);c.fillRect(x0,k.y+T-B-12,x1-x0,5);
   c.fillStyle=mix(theme.soil,theme.under,.75);rr(c,x0,k.y+T-B-7,x1-x0,7,[0,0,k.rig&&k.bot?RI:0,k.lef&&k.bot?RI:0]);c.fill();}
 }
 // Caps hang a scalloped fringe a few pixels into the tile. They never rise
 // above the tile top, which is where feet land.
 const fringe=(x0,x1,base,amp)=>{c.lineTo(x1,base+amp*Math.abs(Math.sin(x1*Math.PI/16)));for(let x=x1;x>=x0;x-=2)c.lineTo(x,base+amp*Math.abs(Math.sin(x*Math.PI/16)));};
 for(const k of cells){if(!k.top)continue;
  c.save();rr(c,k.x,k.y,T,T,k.outer);c.clip();
  c.fillStyle=theme.capEdge;c.beginPath();c.moveTo(k.x-1,k.y-1);c.lineTo(k.x+T+1,k.y-1);fringe(k.x-1,k.x+T+1,k.y+B+10,3);c.closePath();c.fill();
  const i=inner(k);rr(c,i.x,i.y,i.w,i.h,i.r);c.clip();
  c.fillStyle=theme.cap;c.beginPath();c.moveTo(k.x-1,k.y);c.lineTo(k.x+T+1,k.y);fringe(k.x-1,k.x+T+1,k.y+B+7,3);c.closePath();c.fill();
  c.fillStyle=theme.capHi;c.fillRect(k.x-1,k.y+B,T+2,2.5);
  c.restore();
 }
 return canvas;
}

// ------------------------------------------------------------------ backdrop
function star(c,x,y,R,r,n=5){c.beginPath();for(let i=0;i<n*2;i++){const a=-Math.PI/2+i*Math.PI/n,d=i%2?r:R;c.lineTo(x+Math.cos(a)*d,y+Math.sin(a)*d);}c.closePath();}
function cloud(c,x,y,s,color){c.fillStyle=color;c.beginPath();for(const [dx,dy,r] of [[0,0,14],[18,-9,18],[40,-3,15],[56,3,10]]){c.moveTo(x+(dx+r)*s,y+dy*s);c.arc(x+dx*s,y+dy*s,r*s,0,Math.PI*2);}c.rect(x,y,56*s,13*s);c.fill('nonzero');}
// Silhouette that repeats every VW pixels (integer cycles only).
function hills(c,color,base,parts){c.fillStyle=color;c.beginPath();c.moveTo(0,VH);for(let x=0;x<=VW;x+=6){let y=base;for(const [k,a,ph] of parts)y-=a*Math.sin(x/VW*Math.PI*2*k+ph);c.lineTo(x,y);}c.lineTo(VW,VH);c.closePath();c.fill();}
function wrapAt(x,fn){fn(x);if(x<120)fn(x+VW);if(x>VW-120)fn(x-VW);}
function buildLayers(theme,s){
 const far=canvasOf(Math.round(VW*s),Math.round(VH*s)),mid=canvasOf(Math.round(VW*s),Math.round(VH*s));if(!far||!mid)return null;
 const f=far.getContext('2d'),m=mid.getContext('2d');f.scale(s,s);m.scale(s,s);
 const rnd=i=>hash(i,theme.key.length*31);
 if(theme.key==='meadow'){
  for(let i=0;i<6;i++)wrapAt(rnd(i)*VW,x=>cloud(f,x,70+rnd(i+9)*150,.8+rnd(i+3)*.8,'rgba(255,255,255,.85)'));
  hills(f,theme.far,470,[[2,34,0],[5,14,1]]);
  hills(m,theme.mid,560,[[3,38,1.3],[7,10,0]]);
  m.fillStyle=rgba('#5e9e5a',.55);for(let i=0;i<9;i++){const x=rnd(i+40)*VW;wrapAt(x,x=>{m.fillRect(x-2,520,4,30);ellipse(m,x,515,12,15);m.fill();});}
 }else if(theme.key==='canyon'){
  f.fillStyle=rgba('#fff3c4',.65);f.beginPath();f.arc(900,250,46,0,Math.PI*2);f.fill();
  f.fillStyle=theme.far;for(let i=0;i<5;i++){const x=rnd(i)*VW,w=110+rnd(i+5)*140,h=150+rnd(i+7)*120;wrapAt(x,x=>{rr(f,x,VH-h-120,w,h+200,[14,14,0,0]);f.fill();});}
  f.fillRect(0,VH-140,VW,140);
  m.fillStyle=theme.mid;for(let i=0;i<7;i++){const x=rnd(i+20)*VW,w=46+rnd(i+25)*60,h=90+rnd(i+27)*150;wrapAt(x,x=>{rr(m,x,VH-h-60,w,h+80,[18,18,0,0]);m.fill();});}
  m.fillRect(0,VH-70,VW,70);
 }else if(theme.key==='beach'){
  for(let i=0;i<5;i++)wrapAt(rnd(i)*VW,x=>cloud(f,x,60+rnd(i+9)*120,.7+rnd(i+3)*.7,'rgba(255,255,255,.9)'));
  f.fillStyle=theme.far;f.fillRect(0,430,VW,VH-430);
  f.fillStyle=rgba('#ffffff',.55);for(let i=0;i<26;i++){const x=rnd(i+50)*VW,y=445+rnd(i+70)*200;f.fillRect(x,y,10+rnd(i+90)*22,2);}
  f.fillStyle=rgba('#5aa9c2',.7);ellipse(f,260,432,110,22);f.fill();
  hills(m,theme.mid,610,[[2,10,0],[5,6,2]]);
 }else if(theme.key==='night'){
  for(let i=0;i<90;i++){const x=rnd(i)*VW,y=rnd(i+300)*VH*.75,r=rnd(i+600)*1.4+.4;f.fillStyle=`rgba(255,255,240,${.35+rnd(i+900)*.6})`;f.fillRect(x,y,r,r);}
  f.fillStyle='#fff6d8';f.beginPath();f.arc(880,120,34,0,Math.PI*2);f.fill();f.fillStyle=theme.sky[1];f.beginPath();f.arc(866,110,30,0,Math.PI*2);f.fill();
  hills(f,theme.far,500,[[2,40,.5],[6,12,0]]);
  hills(m,theme.mid,590,[[3,30,2],[8,8,0]]);
 }else{
  f.fillStyle=theme.far;for(let i=0;i<12;i++){const x=rnd(i)*VW,w=60+rnd(i+20)*90,h=40+rnd(i+40)*80;wrapAt(x,x=>{ellipse(f,x,0,w/2,h);f.fill();});}
  hills(f,theme.far,560,[[3,40,1],[7,14,0]]);
  for(let i=0;i<16;i++){const x=rnd(i+60)*VW,y=380+rnd(i+80)*220,r=3+rnd(i+90)*5;wrapAt(x,x=>{const g=m.createRadialGradient(x,y,0,x,y,r*3);g.addColorStop(0,'rgba(160,235,250,.5)');g.addColorStop(1,'rgba(160,235,250,0)');m.fillStyle=g;m.fillRect(x-r*3,y-r*3,r*6,r*6);});}
  hills(m,theme.mid,640,[[4,18,0],[9,6,1]]);
 }
 return {far,mid};
}

// ------------------------------------------------------------------ module memory
const memo={terrainKey:'',terrain:null,terrainScale:1,layerKey:'',layers:null,sky:null,skyCtx:null,skyKey:'',
 facing:new Map(),air:new Map(),land:new Map(),preview:new Map(),fx:[],lastKey:null,lastExit:new Map(),stateRef:null,failedOnce:false};

// The view is always VH logical pixels tall; its width follows the shape the
// page gives the canvas, so a wide or tall screen is filled without stretching.
// The backing store follows the device pixels (capped) for a crisp picture.
function viewport(canvas){
 if(!canvas)return {width:VW,height:VH,scale:1};
 const cw=canvas.clientWidth,ch=canvas.clientHeight;
 if(!cw||!ch){const s=canvas.height/VH||1;return {width:canvas.width/s,height:VH,scale:s};}
 const width=Math.max(240,Math.min(4200,VH*cw/ch)),dpr=root.devicePixelRatio||1;
 let s=Math.max(1,Math.min(2,ch*dpr/VH));s=Math.round(s*4)/4;
 while(s>1&&width*s*VH*s>8.4e6)s-=.25;
 const bw=Math.round(width*s),bh=Math.round(VH*s);
 if(canvas.width!==bw||canvas.height!==bh){canvas.width=bw;canvas.height=bh;}
 return {width:bw/s,height:VH,scale:s};
}

function prepareTerrain(map,theme,camScale){
 const maxZoom=map.view&&map.view.displayHeight>0?VH/map.view.displayHeight:1;
 let s=Math.min(2.5,maxZoom*camScale);const budget=7e6;if(map.width*map.height*s*s>budget)s=Math.sqrt(budget/(map.width*map.height));
 s=Math.max(.5,Math.round(s*8)/8);
 const key=[map.id,map.count,map.width,map.height,(map.platforms||[]).length,s].join('|');
 if(memo.terrainKey!==key){memo.terrain=buildTerrain(map,theme,s);memo.terrainKey=key;memo.terrainScale=s;memo.preview.clear();}
 return memo.terrain;
}

// ------------------------------------------------------------------ sky
function drawSky(c,theme,camera,map,time,sw){
 if(memo.skyCtx!==c||memo.skyKey!==theme.key){const g=c.createLinearGradient(0,0,0,VH);g.addColorStop(0,theme.sky[0]);g.addColorStop(.55,theme.sky[1]);g.addColorStop(1,theme.sky[2]);memo.sky=g;memo.skyCtx=c;memo.skyKey=theme.key;}
 c.fillStyle=memo.sky;c.fillRect(0,0,sw,VH);
 const L=memo.layers;if(!L)return;
 const below=Math.max(0,(map.height||VH)-(camera.y+VH/camera.zoom));
 for(const [img,k,drift] of [[L.far,.12,theme.key==='meadow'||theme.key==='beach'?6:0],[L.mid,.3,0]]){
  const y=Math.min(VH*.55,below*camera.zoom*k*.6);
  let x=-((camera.x*camera.zoom*k+time*drift)%VW);if(x>0)x-=VW;
  for(;x<sw;x+=VW)c.drawImage(img,x,y,VW,VH);
 }
}

// ------------------------------------------------------------------ devices
function drawSpike(c,x,y,direction,alpha=1,moving=false){
 if(alpha<=0)return;
 c.save();c.globalAlpha*=alpha;c.translate(x,y);c.rotate([0,Math.PI,-Math.PI/2,Math.PI/2][direction]||0);
 if(moving){c.strokeStyle='rgba(255,120,140,.45)';c.lineWidth=2;c.beginPath();for(const dx of [-7,0,7]){c.moveTo(dx,0);c.lineTo(dx,9);}c.stroke();}
 // Base plate = the 24x6 collider band, spike = the 8x8 tip collider and up.
 rr(c,-12,-8,24,6,2);fillStroke(c,'#5b4b6e','#2f2340',1.3);
 c.beginPath();c.moveTo(-9.5,-7);c.lineTo(0,-19);c.lineTo(9.5,-7);c.closePath();fillStroke(c,'#ff6b81','#6d1f3a',1.5);
 c.beginPath();c.moveTo(-7.4,-7.6);c.lineTo(0,-17);c.lineTo(-1.6,-7.6);c.closePath();c.fillStyle='rgba(255,220,226,.85)';c.fill();
 c.restore();
}
function drawButton(c,b,pressed,time){
 // Drawn in an "up" frame and rotated to the switch direction. The sensor box is
 // exactly the cap's travel space; the base plate sits on the wall/floor face.
 const horizontal=b.direction===2||b.direction===3,len=horizontal?b.h:b.w,depth=horizontal?b.w:b.h;
 const cx=b.x+b.w/2,cy=b.y+b.h/2,angle=[0,Math.PI,-Math.PI/2,Math.PI/2][b.direction]||0;
 c.save();c.translate(cx,cy);c.rotate(angle);
 // local y of the mounting face (floor or wall surface); the cap's outer face
 // is the sensor's outer edge when up and sinks almost flush when pressed.
 const face=depth/2,plate=2.5,h=pressed?2:depth-plate;
 rr(c,-len/2-5,face-plate,len+10,plate,1.2);fillStroke(c,'#6c6a86','#33314a',1);
 if(pressed){c.fillStyle='rgba(126,232,140,.35)';ellipse(c,0,face-2,len*.9,6);c.fill();}
 rr(c,-len/2+.7,face-plate-h,len-1.4,h,[3.5,3.5,.5,.5]);fillStroke(c,pressed?'#7ee08a':'#ffcf4a',pressed?'#2f8a3f':'#a86c00',1.3);
 if(!pressed){c.fillStyle='rgba(255,255,255,.65)';c.fillRect(-len/2+3,face-plate-h+1.5,len-6,1.4);}
 c.restore();
}
function drawSpring(c,b,time){
 const lit=b.phase===2||b.phase===3,squeeze=b.phase===2?1.5+1.5*Math.sin(time*40):b.phase===3?-3:0;
 const x=b.x,y=b.y,w=b.w,h=b.h,top=y+squeeze;
 rr(c,x+1,y+h-9,w-2,9,3);fillStroke(c,'#6e5c86','#3a2c52',1.4);
 if(b.parent){c.fillStyle=lit?'#fff07a':'#4a3d60';c.beginPath();c.arc(x+w/2,y+h-4.5,2.6,0,Math.PI*2);c.fill();}
 c.strokeStyle='#a55c8f';c.lineWidth=3;c.lineJoin='round';c.beginPath();
 const coilTop=top+8,coilBot=y+h-9,n=4;for(let i=0;i<=n;i++){const yy=coilTop+(coilBot-coilTop)*i/n,xx=i%2?x+w-7:x+7;i?c.lineTo(xx,yy):c.moveTo(xx,yy);}c.stroke();
 if(lit){c.fillStyle='rgba(255,140,220,.3)';ellipse(c,x+w/2,top+3,w*.8,9);c.fill();}
 rr(c,x,top,w,8,[4,4,2,2]);fillStroke(c,lit?'#ff9ee0':'#ff7eb6','#a8336f',1.5);
 c.fillStyle='rgba(255,255,255,.7)';c.fillRect(x+4,top+1.8,w-8,1.8);
}
function drawKey(c,k,active,time,observers){
 const bob=Math.sin(time*2.6)*2.5,cx=k.x+k.w/2,cy=k.y+k.h/2+bob;
 c.save();
 if(active){const g=c.createRadialGradient(cx,cy,2,cx,cy,30);g.addColorStop(0,'rgba(255,240,150,.55)');g.addColorStop(1,'rgba(255,240,150,0)');c.fillStyle=g;c.fillRect(cx-30,cy-30,60,60);}
 const gold=active?'#ffd45c':'#b7b3c6',edge=active?'#a26f12':'#6d6884';
 c.lineCap='round';c.lineJoin='round';
 c.strokeStyle=edge;c.lineWidth=7;c.beginPath();c.moveTo(cx,cy-8);c.lineTo(cx,cy+18);c.moveTo(cx,cy+11);c.lineTo(cx+8,cy+11);c.moveTo(cx,cy+17);c.lineTo(cx+6,cy+17);c.stroke();
 c.strokeStyle=gold;c.lineWidth=4;c.stroke();
 c.beginPath();c.arc(cx,cy-12,8.5,0,Math.PI*2);fillStroke(c,gold,edge,2);
 c.fillStyle=active?'#fff6cf':'#e2e0ea';c.beginPath();c.arc(cx,cy-12,3.4,0,Math.PI*2);c.fill();
 if(active){c.fillStyle='#ffffff';star(c,cx+9,cy-21,3.6+Math.sin(time*5)*1.2,1.3,4);c.fill();}
 else{rr(c,cx+4,cy-4,10,9,2);fillStroke(c,'#8a86a0','#4d4964',1.2);c.strokeStyle='#4d4964';c.lineWidth=1.6;c.beginPath();c.arc(cx+9,cy-4,3,Math.PI,0);c.stroke();}
 let row=0;
 for(const o of observers||[]){if(!(o.total>0))continue;const y=k.y-10-row*11;
  for(let i=0;i<o.total;i++){const x=cx+(i-(o.total-1)/2)*11,on=i<o.pushedCount;c.beginPath();c.arc(x,y,4,0,Math.PI*2);fillStroke(c,on?'#7ee08a':'#ffffff',on?'#2f8a3f':'#6d6884',1.4);}
  row++;}
 c.restore();
}
function drawDoor(c,d,open,time,inside,count){
 const x=d.x,bot=d.y+d.h,W=d.w,H=Math.max(d.h,58),top=bot-H;
 c.save();
 rr(c,x-5,top-5,W+10,H+5,[(W+10)/2,(W+10)/2,0,0]);fillStroke(c,'#8a7aa8','#463a62',2);
 rr(c,x,top,W,H,[W/2,W/2,0,0]);
 if(open){const g=c.createLinearGradient(0,top,0,bot);g.addColorStop(0,'#fff6c8');g.addColorStop(1,'#ffc96b');c.fillStyle=g;c.fill();
  c.fillStyle='rgba(255,246,200,.35)';ellipse(c,x+W/2,bot-4,W*.9,8);c.fill();
  c.fillStyle='#b9824f';c.beginPath();c.moveTo(x,top+W/2);c.lineTo(x+8,top+W/2+5);c.lineTo(x+8,bot-2);c.lineTo(x,bot);c.closePath();c.fill();
  c.fillStyle='#7a4d2a';c.font=`bold 18px ${FONT}`;c.textAlign='center';c.textBaseline='middle';c.fillText('↑',x+W/2+2,top+H*.48+Math.sin(time*4)*2);
 }else{c.fillStyle='#b9824f';c.fill();c.strokeStyle='#7a4d2a';c.lineWidth=1.4;c.beginPath();for(const dx of [W/3,2*W/3]){c.moveTo(x+dx,top+6);c.lineTo(x+dx,bot);}c.stroke();
  rr(c,x+W/2-7,top+H*.45,14,12,3);fillStroke(c,'#ffd45c','#a26f12',1.5);c.strokeStyle='#a26f12';c.lineWidth=2;c.beginPath();c.arc(x+W/2,top+H*.45,4.5,Math.PI,0);c.stroke();
  c.fillStyle='#a26f12';c.fillRect(x+W/2-1,top+H*.45+4,2,4);}
 c.restore();
 // how many friends are already through: a small tally plate over the arch
 if(count>0){const pw=count*8+8,py=top-16;rr(c,x+W/2-pw/2,py-6,pw,12,6);fillStroke(c,'rgba(70,58,98,.75)',null);
  for(let i=0;i<count;i++){const px=x+W/2+(i-(count-1)/2)*8;c.beginPath();c.arc(px,py,2.8,0,Math.PI*2);
   const f=inside[i];fillStroke(c,f?f.body:'rgba(255,255,255,.3)',f?'#ffffff':null,1);}}
}
function drawGate(c,g){
 const open=g.phase===1||g.phase===3,vertical=g.h>=g.w;
 rr(c,g.x,g.y,g.w,g.h,4);fillStroke(c,open?'#8fd9c2':'#a59fd0','#3f3a6a',2);
 c.save();rr(c,g.x+3,g.y+3,g.w-6,g.h-6,2);c.clip();c.strokeStyle=open?'rgba(40,110,90,.45)':'rgba(63,58,106,.45)';c.lineWidth=2;c.beginPath();
 if(vertical)for(let y=g.y+10;y<g.y+g.h;y+=12){c.moveTo(g.x,y);c.lineTo(g.x+g.w,y);}else for(let x=g.x+10;x<g.x+g.w;x+=12){c.moveTo(x,g.y);c.lineTo(x,g.y+g.h);}
 c.stroke();c.restore();
 c.fillStyle=open?'#5ee0a0':'#ff8a9a';c.beginPath();c.arc(g.x+g.w/2,vertical?g.y+8:g.y+g.h/2,3.2,0,Math.PI*2);c.fill();
}
function drawBridge(c,b){
 const horizontal=b.target?b.target.w>=b.target.h:b.w>=b.h,unit=horizontal?(b.init?b.init.w:b.h):(b.init?b.init.h:b.w);
 rr(c,b.x,b.y,b.w,b.h,3);fillStroke(c,'#e0a868','#7e4f25',2);
 c.save();rr(c,b.x,b.y,b.w,b.h,3);c.clip();c.strokeStyle='rgba(126,79,37,.55)';c.lineWidth=1.6;c.beginPath();
 if(horizontal)for(let x=b.x+unit;x<b.x+b.w-1;x+=unit){c.moveTo(x,b.y);c.lineTo(x,b.y+b.h);}else for(let y=b.y+unit;y<b.y+b.h-1;y+=unit){c.moveTo(b.x,y);c.lineTo(b.x+b.w,y);}
 c.stroke();c.fillStyle='rgba(255,255,255,.35)';c.fillRect(b.x+2,b.y+2,b.w-4,2.5);c.restore();
}
function beamPath(c,b,time,view,amp){
 const horizontal=b.w>=b.h,len=horizontal?b.w:b.h;if(len<=0)return false;
 const seed=Math.floor(time*24),step=10;
 let a0=0,a1=len;
 if(horizontal){a0=Math.max(0,view.x0-b.x-20);a1=Math.min(len,view.x1-b.x+20);}else{a0=Math.max(0,view.y0-b.y-20);a1=Math.min(len,view.y1-b.y+20);}
 if(a1<=a0)return false;
 const mid=horizontal?b.y+b.h/2:b.x+b.w/2;c.beginPath();
 let first=true;for(let s=Math.floor(a0/step)*step;s<=a1+step;s+=step){const t=Math.min(s,len),off=t<=0||t>=len?0:(hash(Math.floor(s/step),seed)*2-1)*amp;
  const px=horizontal?b.x+t:mid+off,py=horizontal?mid+off:b.y+t;first?c.moveTo(px,py):c.lineTo(px,py);first=false;if(t>=len)break;}
 return true;
}
// The solid hot core is exactly the beam collider (4px); the dark rim, faint
// glow and the crackle stay within a few pixels so the danger reads where it is.
function drawBeam(c,b,time,view,alpha=1,lethal=true){
 if(!(b.w>0&&b.h>0)||alpha<=0)return;
 c.save();c.globalAlpha*=alpha;
 const horizontal=b.w>=b.h,band=(d,color)=>{c.fillStyle=color;horizontal?c.fillRect(b.x,b.y-d,b.w,b.h+2*d):c.fillRect(b.x-d,b.y,b.w+2*d,b.h);};
 if(!lethal){band(0,'rgba(255,210,63,.45)');c.restore();return;}
 band(5,'rgba(255,226,92,.16)');band(1.6,'rgba(88,30,110,.6)');band(0,'#ffd23f');
 c.fillStyle='#fffbe0';horizontal?c.fillRect(b.x,b.y+b.h/2-.8,b.w,1.6):c.fillRect(b.x+b.w/2-.8,b.y,1.6,b.h);
 if(beamPath(c,b,time,view,2.5)){c.lineCap='round';c.lineJoin='round';c.strokeStyle='rgba(255,255,255,.9)';c.lineWidth=1.3;c.stroke();}
 c.restore();
}
function drawEmitter(c,x,y,direction,on,warn){
 c.save();c.translate(x,y);c.rotate([-Math.PI/2,Math.PI/2,Math.PI,0][direction]||0);
 rr(c,4,-5,9,10,2);fillStroke(c,'#3d2c55','#1f1630',1.2);
 c.beginPath();c.arc(0,0,10,0,Math.PI*2);fillStroke(c,warn?'#ff6b81':'#5a3f7d','#1f1630',2);
 c.rotate(-([-Math.PI/2,Math.PI/2,Math.PI,0][direction]||0));
 c.fillStyle=on?'#ffe14d':warn?'#ffffff':'#9a86b8';c.beginPath();c.moveTo(1.5,-6.5);c.lineTo(-4,1);c.lineTo(-.5,1);c.lineTo(-1.5,6.5);c.lineTo(4,-1);c.lineTo(.5,-1);c.closePath();c.fill();
 c.restore();
}
function drawBlinkBlock(c,b,time){
 const fill=SourceBlinkFill(b);
 if(b.visible){
  const ending=b.timer<.35&&b.timer>0;c.save();if(ending)c.globalAlpha*=.55+.45*Math.abs(Math.sin(time*30));
  rr(c,b.x,b.y,b.w,b.h,5);fillStroke(c,'#8fd8ff','#22628f',2);
  c.fillStyle='rgba(255,255,255,.6)';rr(c,b.x+4,b.y+4,b.w-8,4,2);c.fill();
  c.fillStyle='rgba(34,98,143,.25)';c.fillRect(b.x+3,b.y+b.h-7,b.w-6,4);
  c.restore();
 }else{
  const soon=b.timer<.35||b.blocked;c.save();c.setLineDash([4,4]);rr(c,b.x+1,b.y+1,b.w-2,b.h-2,5);
  c.fillStyle=soon?'rgba(143,216,255,.25)':'rgba(143,216,255,.08)';c.fill();c.strokeStyle=b.blocked?'rgba(255,107,129,.85)':soon?'rgba(143,216,255,.9)':'rgba(143,216,255,.45)';c.lineWidth=1.6;c.stroke();c.restore();
 }
 if(fill!==null){c.fillStyle='rgba(255,255,255,.7)';c.fillRect(b.x+3,b.y+b.h-4,(b.w-6)*fill,2);}
}
function SourceBlinkFill(b){const m=root.SourceBlinkDevices;try{return m&&m.effectFill?m.effectFill(b):null;}catch(e){return null;}}
function drawCrate(c,d){
 rr(c,d.x,d.y,d.w,d.h,4);fillStroke(c,'#dca46a','#7a4a24',2);
 c.save();c.strokeStyle='#9a6334';c.lineWidth=Math.max(3,Math.min(6,d.w/12));rr(c,d.x+5,d.y+5,d.w-10,d.h-10,2);c.stroke();
 c.lineWidth=Math.max(2.5,Math.min(5,d.w/14));c.beginPath();c.moveTo(d.x+7,d.y+d.h-7);c.lineTo(d.x+d.w-7,d.y+7);c.stroke();
 c.fillStyle='rgba(255,255,255,.28)';c.fillRect(d.x+3,d.y+3,d.w-6,2.5);
 const n=d.requiredPushers||1,size=Math.max(12,Math.min(26,d.h*.42));
 c.font=`bold ${size}px ${FONT}`;c.textAlign='center';c.textBaseline='middle';c.lineWidth=3.5;c.strokeStyle='#fff3df';c.strokeText(String(n),d.x+d.w/2,d.y+d.h/2+1);c.fillStyle='#6a3d1c';c.fillText(String(n),d.x+d.w/2,d.y+d.h/2+1);
 for(let i=0;i<n;i++){const x=d.x+d.w/2+(i-(n-1)/2)*9,y=d.y-8;c.beginPath();c.arc(x,y,3.4,0,Math.PI*2);fillStroke(c,i<d.pushCount?'#7ee08a':'rgba(255,255,255,.75)',i<d.pushCount?'#2f8a3f':'#7a4a24',1.3);}
 c.restore();
}
function drawDash(c,b,time){
 rr(c,b.x,b.y,b.w,b.h,3);fillStroke(c,'#2fb8aa','#145f58',1.6);
 const dir=(b.vx||0)<0?-1:1;c.save();rr(c,b.x+1,b.y+1,b.w-2,b.h-2,2);c.clip();c.strokeStyle='#eafffb';c.lineWidth=2.4;c.lineCap='round';c.lineJoin='round';
 const shift=(time*40)%18;c.beginPath();for(let i=-1;i<5;i++){const x=dir>0?b.x+i*18+shift:b.x+b.w-i*18-shift;c.moveTo(x,b.y+1.5);c.lineTo(x+dir*5,b.y+b.h/2);c.lineTo(x,b.y+b.h-1.5);}c.stroke();c.restore();
}
// Rect actors are static solids that are not on the tile grid; they get the
// same ground look as the auto-tiled terrain, edge to edge on the collider.
function drawRectSolid(c,r,theme){
 const rad=Math.min(8,r.w/3,r.h/3);
 rr(c,r.x,r.y,r.w,r.h,rad);c.fillStyle=theme.edge;c.fill();
 c.save();rr(c,r.x+2.5,r.y+2.5,r.w-5,r.h-5,Math.max(0,rad-2.5));c.clip();
 c.fillStyle=theme.soil;c.fillRect(r.x,r.y,r.w,r.h);
 for(let cy=Math.floor(r.y/T);cy*T<r.y+r.h;cy++)for(let cx=Math.floor(r.x/T);cx*T<r.x+r.w;cx++)texture(c,theme,cx*T,cy*T,cx+101,cy+57);
 c.fillStyle=rgba(theme.under,.7);c.fillRect(r.x,r.y+r.h-8,r.w,6);
 const capH=Math.min(9,r.h/3);c.fillStyle=theme.capEdge;c.beginPath();c.moveTo(r.x,r.y);c.lineTo(r.x+r.w,r.y);
 for(let x=r.x+r.w;x>=r.x;x-=2)c.lineTo(x,r.y+capH+2+2*Math.abs(Math.sin(x*Math.PI/16)));c.closePath();c.fill();
 c.fillStyle=theme.cap;c.beginPath();c.moveTo(r.x,r.y);c.lineTo(r.x+r.w,r.y);
 for(let x=r.x+r.w;x>=r.x;x-=2)c.lineTo(x,r.y+capH+2*Math.abs(Math.sin(x*Math.PI/16)));c.closePath();c.fill();
 c.fillStyle=theme.capHi;c.fillRect(r.x,r.y+2.5,r.w,2);
 c.restore();
}
function drawWallBlock(c,b,wall){
 rr(c,b.x,b.y,b.w,b.h,4);fillStroke(c,'#c9b8a4','#5c4b3c',2);
 c.fillStyle='rgba(255,255,255,.35)';c.fillRect(b.x+3,b.y+3,b.w-6,2.5);
 const cracks=wall&&wall.hitsRequired?Math.round(3*(wall.hits||0)/wall.hitsRequired):0;
 if(cracks){c.strokeStyle='#5c4b3c';c.lineWidth=1.4;c.beginPath();for(let i=0;i<cracks;i++){const ox=b.x+b.w*(.3+.2*i),oy=b.y+b.h*.2;c.moveTo(ox,oy);c.lineTo(ox+5,oy+b.h*.25);c.lineTo(ox-2,oy+b.h*.45);}c.stroke();}
}

// ------------------------------------------------------------------ friends
// the runtime keeps lookingRight from input (Player Update 0x1816c3060); others go by velocity
function facingOf(p){const prev=memo.facing.get(p.id)||1;const f=typeof p.facingLeft==='boolean'?(p.facingLeft?-1:1):typeof p.lookingRight==='boolean'?(p.lookingRight?1:-1):p.vx>.5?1:p.vx<-.5?-1:prev;memo.facing.set(p.id,f);return f;}
function accessory(c,kind,pal,behind){
 const dk=pal.dark;
 if(behind){
  if(kind==='ears'){for(const s of [-1,1]){c.beginPath();c.moveTo(s*12,-33);c.lineTo(s*12.5,-48);c.lineTo(s*2.5,-39);c.closePath();fillStroke(c,pal.body,dk,1.6);c.beginPath();c.moveTo(s*10.5,-37);c.lineTo(s*11,-45);c.lineTo(s*5,-40);c.closePath();c.fillStyle=CHEEK;c.fill();}}
  if(kind==='fin'){c.beginPath();c.moveTo(-8,-38);c.quadraticCurveTo(-2,-50,5,-54);c.quadraticCurveTo(5,-45,9,-37);c.closePath();fillStroke(c,mix(pal.body,dk,.35),dk,1.6);}
  if(kind==='sprout'){c.strokeStyle='#3e8a3e';c.lineWidth=1.8;c.beginPath();c.moveTo(0,-40);c.quadraticCurveTo(-.5,-45,1,-48);c.stroke();}
  if(kind==='antenna'){c.strokeStyle=dk;c.lineWidth=1.6;c.beginPath();c.moveTo(1,-40);c.quadraticCurveTo(0,-46,3,-51);c.stroke();}
  return;
 }
 if(kind==='sprout'){ellipse(c,-3.5,-49,4.2,2.2,-.5);fillStroke(c,'#86d16f','#3e8a3e',1.2);ellipse(c,5.5,-50,4.2,2.2,.5);fillStroke(c,'#86d16f','#3e8a3e',1.2);}
 else if(kind==='bow'){c.beginPath();c.moveTo(5,-40);c.quadraticCurveTo(-3,-49,-3,-40);c.quadraticCurveTo(-3,-32,5,-40);c.moveTo(5,-40);c.quadraticCurveTo(13,-49,13,-40);c.quadraticCurveTo(13,-32,5,-40);fillStroke(c,'#ff6f9f','#a8325c',1.3);c.beginPath();c.arc(5,-40,2.2,0,Math.PI*2);fillStroke(c,'#ff9dbf','#a8325c',1.1);}
 else if(kind==='crown'){c.beginPath();c.moveTo(-8,-38);c.lineTo(-9,-48);c.lineTo(-4,-43.5);c.lineTo(0,-50);c.lineTo(4,-43.5);c.lineTo(9,-48);c.lineTo(8,-38);c.closePath();fillStroke(c,'#ffd34d','#a87a12',1.4);c.fillStyle='#ff6b81';c.beginPath();c.arc(0,-41.5,1.8,0,Math.PI*2);c.fill();}
 else if(kind==='flower'){c.save();c.translate(7,-42);for(let i=0;i<5;i++){const a=i*Math.PI*2/5;c.beginPath();c.arc(Math.cos(a)*3.3,Math.sin(a)*3.3,2.7,0,Math.PI*2);fillStroke(c,'#ffffff','#c27596',1);}c.beginPath();c.arc(0,0,2.2,0,Math.PI*2);c.fillStyle='#ffd34d';c.fill();c.restore();}
 else if(kind==='beanie'){c.beginPath();c.moveTo(-14.6,-33);c.quadraticCurveTo(-14.6,-46,0,-46);c.quadraticCurveTo(14.6,-46,14.6,-33);c.closePath();fillStroke(c,'#ff8a6b','#a8452f',1.5);rr(c,-15.2,-36,30.4,4,2);fillStroke(c,'#fff1df','#a8452f',1.1);c.beginPath();c.arc(0,-47,3.6,0,Math.PI*2);fillStroke(c,'#fff1df','#a8452f',1.1);}
 else if(kind==='antenna'){star(c,3,-52,4.8,2.1);fillStroke(c,'#ffe066','#a88512',1.2);}
}
function drawFriend(c,p,i,o){
 const pal=o.palette||FRIENDS[((p.colorIndex??i))%8],t=o.time,f=facingOf(p),grounded=!!p.grounded;
 const wasAir=memo.air.get(p.id);memo.air.set(p.id,!grounded);if(wasAir&&grounded)memo.land.set(p.id,t);
 let sx=1,sy=1;const landAge=t-(memo.land.get(p.id)??-9);
 if(!grounded){if((p.vy||0)<0){sy=1.07;sx=.95;}else{sy=1.02;sx=.98;}}
 else if(landAge<.12){const k=1-landAge/.12;sy=1-.09*k;sx=1+.07*k;}
 const walking=grounded&&Math.abs(p.vx||0)>1,step=walking?Math.sin(t*16+i):0;
 const dead=o.deadId===p.id,flash=o.flash&&o.flash[p.id]>0||!!(p.tv&&p.tv.isFlashing);
 c.save();if(flash&&Math.floor(t*14)%2)c.globalAlpha*=.35;
 // changeControlablePlayer 0x181872cc0 greys out everyone who cannot move
 if(p.grayscale){c.filter='grayscale(1)';c.globalAlpha*=.75;}
 c.translate(p.x+p.w/2,p.y+p.h);
 // stage scale (8-1, 8-3, 10-x 1.5, 9-4 3): the body is 32s x 46s, the friend drawn s times
 {const ps=p.w/32;if(ps!==1)c.scale(ps,ps);}
// a plane player (OnInitialize_Plane: animation 8, 9 when damaged) rides a little plane; the
 // friend sits in its cockpit, the draw offset is OnUpdate_BattlePlane's hit shake
 if(p.plane){const o=p.plane.life&&p.plane.life.offset;if(o)c.translate(o.xRaw/65536,o.yRaw/65536);
  const dir=f,hurt=p.plane.life&&p.plane.life.anim===9;c.save();c.scale(dir,1);
  c.beginPath();c.ellipse(0,-14,22,9,0,0,Math.PI*2);fillStroke(c,hurt&&Math.floor(t*10)%2?mix(pal.body,'#ffffff',.5):pal.body,pal.dark,2);
  c.beginPath();c.moveTo(-6,-14);c.lineTo(-14,-2);c.lineTo(4,-2);c.closePath();fillStroke(c,mix(pal.body,pal.dark,.25),pal.dark,1.5);
  c.beginPath();c.moveTo(-18,-16);c.lineTo(-24,-26);c.lineTo(-14,-18);c.closePath();fillStroke(c,mix(pal.body,pal.dark,.25),pal.dark,1.5);
  c.beginPath();c.arc(22,-14,3,0,Math.PI*2);fillStroke(c,'#e8e3ff',pal.dark,1.2);c.restore();
  c.translate(0,-18);c.scale(.62,.62);c.translate(0,0);}
 // top-view fall (fallStep 0x1816caba0) shrinks the player to nothing
 if(p.tvScale!==undefined&&p.tvScale<1){if(p.tvScale<=0){c.restore();return;}c.scale(p.tvScale,p.tvScale);}
 if(grounded){c.fillStyle='rgba(30,20,40,.2)';ellipse(c,0,0,14,3);c.fill();}
 c.scale(sx*f,sy);
 // tail (behind the body, a fork that barely leaves the box)
 c.save();c.translate(-13,-21);c.rotate(walking?Math.sin(t*14+i)*.18:0);c.beginPath();c.moveTo(1,-1);c.lineTo(-6,-8);c.quadraticCurveTo(-4,-1,-6,6);c.closePath();fillStroke(c,mix(pal.body,pal.dark,.3),pal.dark,1.5);c.restore();
 accessory(c,pal.acc,pal,true);
 // feet: their soles are the collider bottom
 c.fillStyle=pal.dark;ellipse(c,-6.5,-2.4-(step>0?step*1.6:0),5,2.4);c.fill();ellipse(c,6.5,-2.4-(step<0?-step*1.6:0),5,2.4);c.fill();
 rr(c,-15,-41,30,39,[14,14,11,11]);fillStroke(c,pal.body,pal.dark,2);
 ellipse(c,3,-13,9.5,8);c.fillStyle=pal.light;c.fill();
 c.fillStyle='rgba(255,255,255,.45)';ellipse(c,-7,-33,3.6,2.2,-.6);c.fill();
 c.save();c.translate(-1,-17);c.rotate(walking?Math.sin(t*16+i+1)*.45:.15);ellipse(c,-1,3,3,5);fillStroke(c,mix(pal.body,pal.dark,.22),pal.dark,1.3);c.restore();
 // face (콩눈): bean eyes with a highlight, cheeks, a tiny mouth
 const blink=(t+i*1.37)%4.3<.12;
 if(dead){c.strokeStyle=INK;c.lineWidth=1.7;c.beginPath();for(const ex of [1,10]){c.moveTo(ex-2.4,-29.4);c.lineTo(ex+2.4,-24.6);c.moveTo(ex+2.4,-29.4);c.lineTo(ex-2.4,-24.6);}c.stroke();}
 else if(blink){c.strokeStyle=INK;c.lineWidth=1.8;c.beginPath();c.moveTo(-1.4,-27);c.lineTo(3.4,-27);c.moveTo(7.6,-27);c.lineTo(12.4,-27);c.stroke();}
 else{c.fillStyle=INK;ellipse(c,1,-27,2.4,3.4);c.fill();ellipse(c,10,-27,2.4,3.4);c.fill();c.fillStyle='#ffffff';c.beginPath();c.arc(.2,-28.4,.95,0,Math.PI*2);c.arc(9.2,-28.4,.95,0,Math.PI*2);c.fill();}
 c.fillStyle=rgba(CHEEK,.85);c.beginPath();c.arc(-3.2,-21.5,2.7,0,Math.PI*2);c.arc(12.6,-21.5,2.4,0,Math.PI*2);c.fill();
 c.strokeStyle=INK;c.lineWidth=1.4;c.lineCap='round';c.beginPath();if(dead)c.arc(5.5,-19.5,2,Math.PI*1.1,Math.PI*1.9);else c.arc(5.5,-23.2,2,Math.PI*.15,Math.PI*.85);c.stroke();
 accessory(c,pal.acc,pal,false);
 c.restore();
}
function drawBadge(c,p,i,o){
 const pal=FRIENDS[((p.colorIndex??i))%8],k=Math.max(1,Math.min(1.8,.85/o.zoom)),cx=p.x+p.w/2,cy=p.y-12;
 c.save();c.translate(cx,cy);c.scale(k,k);
 rr(c,-8,-7,16,13,6.5);fillStroke(c,pal.dark,'#ffffff',1.5);
 c.fillStyle='#ffffff';c.font=`bold 10.5px ${FONT}`;c.textAlign='center';c.textBaseline='middle';c.fillText(String(i+1),0,0);
 if(o.selected===i){const b=Math.sin(o.time*5)*1.5;c.beginPath();c.moveTo(-6.5,-19+b);c.lineTo(6.5,-19+b);c.lineTo(0,-10.5+b);c.closePath();fillStroke(c,'#ffffff',INK,1.6);}
 c.restore();
}

// ------------------------------------------------------------------ sparkles
function sparkle(x,y,colors,n,time){for(let j=0;j<n;j++){const a=hash(j,Math.floor(time*1000))*Math.PI*2,s=40+hash(j+7,3)*70;memo.fx.push({x,y,vx:Math.cos(a)*s,vy:Math.sin(a)*s-50,born:time,life:.7,color:colors[j%colors.length]});}}
function drawFx(c,time){
 const keep=[];for(const p of memo.fx){const age=time-p.born;if(age<0||age>p.life)continue;keep.push(p);
  const x=p.x+p.vx*age,y=p.y+p.vy*age+120*age*age,a=1-age/p.life;c.globalAlpha=a;c.fillStyle=p.color;star(c,x,y,4*a+1.5,1.4,4);c.fill();}
 c.globalAlpha=1;memo.fx=keep;
}

// ------------------------------------------------------------------ hud
function drawHud(c,state,time,sw){
 const timers=state.switchTimerState&&root.SourceSwitchTimerDevices?root.SourceSwitchTimerDevices.displays(state.switchTimerState):[];
 let y=12;
 c.save();c.textAlign='center';c.textBaseline='middle';
 for(const t of timers){
  const text=`${t.minutes}:${String(t.seconds).padStart(2,'0')}`,warn=t.warning,pulse=warn?1+.06*Math.max(0,Math.sin(time*10)):1;
  c.save();c.translate(sw/2,y+22);c.scale(pulse,pulse);
  rr(c,-70,-21,140,42,21);fillStroke(c,warn?'#ff6b81':'rgba(255,253,246,.94)',warn?'#8f2240':'#463a62',2.5);
  c.beginPath();c.arc(-40,0,12,0,Math.PI*2);fillStroke(c,warn?'#ffffff':'#ffe9a8',warn?'#8f2240':'#463a62',2);
  c.strokeStyle=warn?'#8f2240':'#463a62';c.lineWidth=2;c.lineCap='round';c.beginPath();c.moveTo(-40,0);c.lineTo(-40,-7);c.moveTo(-40,0);c.lineTo(-35,3);c.stroke();
  c.font=`bold 30px ${FONT}`;c.fillStyle=warn?'#ffffff':INK;c.fillText(text,12,1.5);
  c.restore();y+=50;
 }
 const ceil=state.thornCeilingState;
 for(const cl of (ceil&&ceil.ceilings)||[]){
  const max=cl.hitPointMax||0,hp=Math.max(0,cl.hitPoint||0);if(!max)continue;
  const w=max*30+24;c.save();c.translate(sw/2,y+20);
  rr(c,-w/2,-18,w,36,18);fillStroke(c,'rgba(255,253,246,.94)','#463a62',2.5);
  for(let i=0;i<max;i++){const x=-((max-1)*30)/2+i*30,on=i<hp;heart(c,x,1,9);fillStroke(c,on?'#ff6b81':'#ddd6e8',on?'#8f2240':'#8a83a0',1.8);}
  c.restore();y+=46;
 }
 c.restore();
}
function heart(c,x,y,s){c.beginPath();c.moveTo(x,y+s*.9);c.bezierCurveTo(x-s*1.4,y-s*.1,x-s*.7,y-s*1.2,x,y-s*.45);c.bezierCurveTo(x+s*.7,y-s*1.2,x+s*1.4,y-s*.1,x,y+s*.9);c.closePath();}

// ------------------------------------------------------------------ frame

function drawRegisteredDevices(c,s){
 c.save();
 for(const coin of s.coinsState?.coins||[])if(!coin.collected){const r=root.SourceCoinDevices.nativeConstants.rect;c.fillStyle='#ffd65c';c.beginPath();c.ellipse(coin.x,coin.y,r.w/2,r.h/2,0,0,Math.PI*2);c.fill();}
 for(const cp of s.checkpointsState?.checkpoints||[]){const r=root.SourceCheckpointDevices.nativeConstants.rect;c.strokeStyle=cp.checked?'#79e5a2':'#b8c7df';c.strokeRect(cp.x+r.x,cp.y+r.y,r.w,r.h);}
 for(const label of s.textsState?.texts||[]){if(label.exitRequested||label.textId||!label.text)continue;c.fillStyle=label.color?'#ffffff':'#222222';c.textAlign='left';if(label.fontSize>0)c.font=label.fontSize+'px system-ui';c.fillText(label.text,label.x,label.y);}
 c.restore();
}
function drawRegisteredHud(c,s){
 c.save();
 for(const e of s.touchEnergiesState?.devices||[]){if(!e.visible)continue;c.fillStyle='#ffffff';c.textAlign='left';c.fillText((e.energyRaw/65536).toFixed(1)+' / '+(e.maxRaw/65536).toFixed(1),e.uiPos.x,e.uiPos.y);}
 c.restore();
}

function render(ctx,state,camera,opts={}){
 const canvas=opts.canvas||ctx.canvas,vp=opts.viewport||viewport(canvas),scale=vp.scale,sw=vp.width;
 const time=opts.time??(performance.now()/1000),map=state.map,theme=themeOf(map);
 ctx.setTransform(scale,0,0,scale,0,0);ctx.imageSmoothingEnabled=true;
 if(memo.layerKey!==theme.key+'|'+scale){memo.layers=buildLayers(theme,scale);memo.layerKey=theme.key+'|'+scale;}
 if(memo.stateRef!==state){memo.stateRef=state;memo.lastKey=!!state.goalOpen;memo.lastExit=new Map(state.players.map(p=>[p.id,p.exit]));memo.fx=[];memo.land.clear();memo.air.clear();}
 drawSky(ctx,theme,camera,map,time,sw);
 const z=camera.zoom,view={x0:camera.x,y0:camera.y,x1:camera.x+sw/z,y1:camera.y+VH/z};
 const terrain=prepareTerrain(map,theme,scale);
 ctx.save();ctx.scale(z,z);ctx.translate(-camera.x,-camera.y);
 // A darkening band at the bottom of the map reads as "drop" through any pit.
 const pit=ctx.createLinearGradient(0,map.height-140,0,map.height+40);pit.addColorStop(0,rgba(theme.pit,0));pit.addColorStop(1,rgba(theme.pit,.7));
 ctx.fillStyle=pit;ctx.fillRect(Math.max(view.x0,-200),map.height-140,view.x1-Math.max(view.x0,-200)+10,Math.max(0,view.y1-map.height+140));
 if(terrain){
  const s=memo.terrainScale,sx=Math.max(0,view.x0),sy=Math.max(0,view.y0),ex=Math.min(map.width,view.x1),ey=Math.min(map.height,view.y1);
  if(ex>sx&&ey>sy)ctx.drawImage(terrain,sx*s,sy*s,(ex-sx)*s,(ey-sy)*s,sx,sy,ex-sx,ey-sy);
 }else{ctx.fillStyle=theme.soil;for(const p of map.platforms)ctx.fillRect(p.x,p.y,p.w,p.h);}

 const motion=state.motionState&&root.SourceMotionDevices?root.SourceMotionDevices.solids(state.motionState):[];
 const walls=new Map(((state.motionState&&state.motionState.walls)||[]).map(w=>[w.id,w]));
 for(const b of motion){if(!intersects(b,view,10))continue;if(b.wallId)drawWallBlock(ctx,b,walls.get(b.wallId));else drawRectSolid(ctx,b,theme);}
 for(const b of (state.motionState&&state.motionState.dashBoards)||[])if(intersects(b,view,10))drawDash(ctx,b,time);

 // door + key first so friends walk in front of them
 const players=state.players||[];
 const inside=players.map((p,i)=>p.exit?FRIENDS[(p.colorIndex??i)%8]:null).filter(Boolean);
 if(map.exit)drawDoor(ctx,map.exit,!!state.goalOpen,time,inside,players.length);
 if(map.key&&!map.key.hidden&&intersects(map.key,view,40))drawKey(ctx,map.key,state.keyActive!==false,time,state.gateState&&state.gateState.observers);
 for(const g of (state.gateState&&state.gateState.gates)||[])if(intersects(g,view,10))drawGate(ctx,g);
 const bridges=(state.bridgeState&&state.bridgeState.bridges)||[];
 for(const b of bridges)if(intersects(b,view,10))drawBridge(ctx,b);
 for(const b of (state.blinkState&&state.blinkState.blocks)||[])if(intersects(b,view,10))drawBlinkBlock(ctx,b,time);
 for(const b of map.springs||[]){if(b.visible===false||!intersects(b,view,20))continue;drawSpring(ctx,b,time);}
 for(const b of map.switches||[]){if(!intersects(b,view,40))continue;drawButton(ctx,b,!!b.pressed,time);
  if(b.remaining>0){const relay=(state.relayState&&state.relayState.relays||[]).find(r=>r.id===b.id),total=relay&&relay.delay||b.remaining,x=b.x+b.w/2,y=b.y-24;
   ctx.beginPath();ctx.arc(x,y,15,0,Math.PI*2);fillStroke(ctx,'rgba(255,253,246,.92)','#463a62',2);
   ctx.strokeStyle='#ffb020';ctx.lineWidth=4;ctx.lineCap='round';ctx.beginPath();ctx.arc(x,y,10.5,-Math.PI/2,-Math.PI/2+Math.PI*2*Math.max(0,Math.min(1,b.remaining/total)));ctx.stroke();
   ctx.fillStyle=INK;ctx.font=`bold 13px ${FONT}`;ctx.textAlign='center';ctx.textBaseline='middle';ctx.fillText(String(Math.ceil(b.remaining)),x,y+.5);}
 }
 for(const d of (state.deviceState&&state.deviceState.devices)||[])if(d.type==='PushBox'&&intersects(d,view,30))drawCrate(ctx,d);

 // hazards on top of the ground so a spike or beam is never hidden by scenery
 for(const d of (state.deviceState&&state.deviceState.devices)||[])if(d.type==='Thorn'&&d.active&&intersects({x:d.x-20,y:d.y-20,w:40,h:40},view,10))drawSpike(ctx,d.x,d.y,d.direction,d.alpha??1,d.phase==='move');
 const ceil=state.thornCeilingState;
 for(const cl of (ceil&&ceil.ceilings)||[])for(const th of cl.thorns||[]){if(!th.active)continue;const x=th.xFp/65536,y=th.yFp/65536;if(x<view.x0-30||x>view.x1+30||y<view.y0-30||y>view.y1+30)continue;drawSpike(ctx,x,y,th.direction??1,(th.alphaFp??65536)/65536,th.phase===2);}
 const Bridges=root.SourceBridgeDevices,BlinkT=root.SourceBlinkThunderDevices;
 const thunders=(state.bridgeState&&state.bridgeState.thunders)||[];
 if(thunders.length&&Bridges){const beams=Bridges.hazards(state.bridgeState,{platforms:map.platforms,width:map.width,height:map.height});
  thunders.forEach((t,j)=>{const b=beams[j];if(b&&t.phase<6)drawBeam(ctx,b,time,view,b.alpha??1,b.lethal!==false);
   if(t.bodyEnabled){const r={x:t.x-16,y:t.y-16,w:32,h:32};rr(ctx,r.x,r.y,32,32,5);fillStroke(ctx,'#5a3f7d','#1f1630',2);}
   if(t.phase<6)drawEmitter(ctx,t.x,t.y,t.direction,t.lethal!==false,false);});}
 const bthunders=(state.blinkThunderState&&state.blinkThunderState.thunders)||[];
 if(bthunders.length&&BlinkT){
  for(const t of bthunders){
   let len=t.length;if(!(len>0)){if(!memo.preview.has(t.id))memo.preview.set(t.id,BlinkT.beamLength(t,{platforms:map.platforms,width:map.width,height:map.height}));len=memo.preview.get(t.id);}
   const horizontal=t.direction>=2,negative=t.direction===0||t.direction===2,W=BlinkT.LASER_WIDTH||4;
   const b={x:horizontal?(negative?t.x-len:t.x):t.x-W/2,y:horizontal?t.y-W/2:(negative?t.y-len:t.y),w:horizontal?len:W,h:horizontal?W:len};
   const warn=!t.visible&&t.timer<.6;
   if(t.visible)drawBeam(ctx,b,time,view,1,true);
   else if(warn){ctx.save();ctx.setLineDash([5,7]);ctx.globalAlpha=.35+.5*Math.abs(Math.sin(time*18));ctx.strokeStyle='#ff6b81';ctx.lineWidth=2;ctx.beginPath();
    if(horizontal){ctx.moveTo(b.x,b.y+b.h/2);ctx.lineTo(b.x+b.w,b.y+b.h/2);}else{ctx.moveTo(b.x+b.w/2,b.y);ctx.lineTo(b.x+b.w/2,b.y+b.h);}ctx.stroke();ctx.restore();}
   if(t.shootBlock){rr(ctx,t.x-16,t.y-16,32,32,5);fillStroke(ctx,'#5a3f7d','#1f1630',2);}
   drawEmitter(ctx,t.x,t.y,t.direction,t.visible,warn&&Math.floor(time*12)%2===0);
  }
 }

 drawRegisteredDevices(ctx,state);
 // devices registered after this file (lifts, poles, enemies, balls, Dossun, ...)
 if(root.SourceDeviceArt)root.SourceDeviceArt.draw(ctx,state,{time});
 // friends: the controlled one last so it is never hidden
 const deadId=state.status==='dead'&&state.failure?state.failure.playerId:null;
 const o={time,selected:opts.selected,zoom:z,deadId,flash:ceil&&ceil.flash};
 const order=players.map((p,i)=>i).filter(i=>!players[i].exit&&!players[i].asBlock&&!players[i].hiddenByCardboard&&!players[i].fakeProxy).sort((a,b)=>(a===opts.selected)-(b===opts.selected));
 for(const i of order){const p=players[i];if(p.x>view.x1+60||p.x+p.w<view.x0-60)continue;drawFriend(ctx,p,i,o);}
 for(const i of order){const p=players[i];drawBadge(ctx,p,i,o);}
 if(root.SourceDeviceArt)root.SourceDeviceArt.drawAbove(ctx,state);

 // sparkles when the key is taken or a friend walks through the door
 if(state.goalOpen&&memo.lastKey===false&&map.exit)sparkle(map.exit.x+map.exit.w/2,map.exit.y,['#ffe066','#ffffff','#ffb020'],14,time);
 memo.lastKey=!!state.goalOpen;
 players.forEach((p,i)=>{if(p.exit&&memo.lastExit.get(p.id)===false&&map.exit)sparkle(map.exit.x+map.exit.w/2,map.exit.y,[FRIENDS[(p.colorIndex??i)%8].body,'#ffffff'],10,time);memo.lastExit.set(p.id,!!p.exit);});
 drawFx(ctx,time);
 if(opts.debugBoxes)drawDebug(ctx,state,map);
 ctx.restore();
 if(root.SourceDeviceArt)root.SourceDeviceArt.overlay(ctx,state,{width:sw,height:VH});
 drawHud(ctx,state,time,sw);
 drawRegisteredHud(ctx,state);
}
// Review aid only (?boxes): collider outlines over the art.
function drawDebug(c,state,map){
 c.save();c.lineWidth=1;c.strokeStyle='rgba(255,0,60,.9)';
 const R=root.SourceStageRuntime;let list=[];try{list=R&&R.solids?R.solids(state):[];}catch(e){}
 for(const b of list)c.strokeRect(b.x,b.y,b.w,b.h);
 c.strokeStyle='rgba(0,200,255,.95)';for(const p of state.players)if(!p.exit)c.strokeRect(p.x,p.y,p.w,p.h);
 c.strokeStyle='rgba(255,220,0,.95)';for(const b of map.switches||[])c.strokeRect(b.x,b.y,b.w,b.h);
 const D=root.SourceDevicesRuntime;if(D)for(const h of D.hazards(state.deviceState))c.strokeRect(h.x,h.y,h.w,h.h);
 const TC=root.SourceThornCeilingDevices;if(TC&&state.thornCeilingState)for(const h of TC.hazards(state.thornCeilingState))c.strokeRect(h.x,h.y,h.w,h.h);
 const BR=root.SourceBridgeDevices,BT=root.SourceBlinkThunderDevices;
 if(BR&&state.bridgeState)for(const h of BR.hazards(state.bridgeState,{platforms:map.platforms,width:map.width,height:map.height}))if(h.lethal!==false)c.strokeRect(h.x,h.y,h.w,h.h);
 if(BT&&state.blinkThunderState)for(const h of BT.hazards(state.blinkThunderState))c.strokeRect(h.x,h.y,h.w,h.h);
 c.strokeStyle='rgba(0,255,120,.95)';if(map.key)c.strokeRect(map.key.x,map.key.y,map.key.w,map.key.h);if(map.exit)c.strokeRect(map.exit.x,map.exit.y,map.exit.w,map.exit.h);
 c.restore();
}
function blank(ctx,canvas){const vp=viewport(canvas||ctx.canvas),s=vp.scale;ctx.setTransform(s,0,0,s,0,0);const g=ctx.createLinearGradient(0,0,0,VH);g.addColorStop(0,'#16244a');g.addColorStop(1,'#3a2f63');ctx.fillStyle=g;ctx.fillRect(0,0,vp.width,VH);}

root.ParkArt={render,drawRegisteredDevices,drawRegisteredHud,blank,viewport,drawFriend,mix,FRIENDS,THEMES,worldOf,VW,VH};
})(typeof window!=='undefined'?window:globalThis);
