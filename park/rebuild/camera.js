(function(root){
'use strict';
// Screen framing only: no changes to original route or physics.
function update(previous,players,map,viewport={width:1200,height:675},dt=1/60){
 const active=players.filter(p=>!p.exit),list=active.length?active:players;
 if(!list.length)return {x:0,y:0,zoom:1};
 const W=viewport.width,H=viewport.height,pad=54,top=68,bottom=58;
 const left=Math.min(...list.map(p=>p.x-10)),right=Math.max(...list.map(p=>p.x+p.w));
 const high=Math.min(...list.map(p=>p.y-18)),low=Math.max(...list.map(p=>p.y+p.h));
 const targetZoom=Math.min(1,(W-2*pad)/Math.max(1,right-left),(H-top-bottom)/Math.max(1,low-high));
 const previousZoom=previous?.zoom||1;
 // Zoom out immediately to protect distant players. Ease only when returning closer.
 const zoom=targetZoom<previousZoom?targetZoom:previousZoom+(targetZoom-previousZoom)*(1-Math.exp(-5*Math.max(0,dt)));
 const targetX=Math.max(0,Math.min(Math.max(0,map.width-W/zoom),(left+right)/2-W/(2*zoom)));
 const targetY=low-(H-bottom)/zoom;
 const blend=1-Math.exp(-9*Math.max(0,dt));
 let x=previous?previous.x+(targetX-previous.x)*blend:targetX;
 let y=previous?previous.y+(targetY-previous.y)*blend:targetY;
 // Smoothing must never hide a player, including the last remaining teammate.
 x=Math.max(right-(W-pad)/zoom,Math.min(left-pad/zoom,x));
 y=Math.max(low-(H-bottom)/zoom,Math.min(high-top/zoom,y));
 return {x,y,zoom};
}
function point(camera,x,y){return {x:(x-camera.x)*camera.zoom,y:(y-camera.y)*camera.zoom};}
const api={update,point};if(typeof module!=='undefined'&&module.exports)module.exports=api;root.ParkCamera=api;
})(typeof window!=='undefined'?window:globalThis);
