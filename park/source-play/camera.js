(function(root){
'use strict';
// Screen framing only: no changes to original route or physics.
//
// Window height. The source frames a fixed window rather than the whole map:
// mapInitParam displayTileHeight is 10 tiles on world01-01, i.e. 480px of a
// 960px map. A stage that does not declare it shows its whole height - the
// connected scroll stages are 10 or 11 tiles tall, the same window world01-01
// declares. A stage with scrollType 0 is framed whole: all three connected
// ones are authored at about 16:9 (960x528, 2016x1104, 1200x672) and 11-4
// declares exactly its full height. A map without a view record keeps 1:1.
function baseZoom(map,W,H){
 const view=map.view;if(!view)return 1;
 const windowHeight=view.displayHeight>0?view.displayHeight:map.height;
 if(!(windowHeight>0))return 1;
 const z=H/windowHeight;
 return view.scrollType===0&&map.width>0?Math.min(z,W/map.width):z;
}
function update(previous,players,map,viewport={width:1200,height:675},dt=1/60){
 const active=players.filter(p=>!p.exit),list=active.length?active:players;
 if(!list.length)return {x:0,y:0,zoom:1};
 // bottom is the screen margin kept under the lowest feet; ground shows below.
 const W=viewport.width,H=viewport.height,pad=54,top=68,bottom=28;
 const left=Math.min(...list.map(p=>p.x-10)),right=Math.max(...list.map(p=>p.x+p.w));
 const high=Math.min(...list.map(p=>p.y-18)),low=Math.max(...list.map(p=>p.y+p.h));
 const targetZoom=Math.min(baseZoom(map,W,H),(W-2*pad)/Math.max(1,right-left),(H-top-bottom)/Math.max(1,low-high));
 // The first frame of a round snaps; afterwards zoom out at once to protect
 // distant players and ease only when returning closer.
 const zoom=!previous?targetZoom:targetZoom<previous.zoom?targetZoom:previous.zoom+(targetZoom-previous.zoom)*(1-Math.exp(-5*Math.max(0,dt)));
 const spanX=W/zoom,spanY=H/zoom;
 // Horizontally a map narrower than the view sits in the middle.
 const targetX=map.width>0&&spanX>=map.width?(map.width-spanX)/2
  :Math.max(0,Math.min(Math.max(0,(map.width||0)-spanX),(left+right)/2-spanX/2));
 // Vertically the friends stand near the bottom with one tile of ground under them.
 const targetY=low+Math.max(48,bottom/zoom)-spanY;
 const blend=1-Math.exp(-9*Math.max(0,dt));
 let x=previous?previous.x+(targetX-previous.x)*blend:targetX;
 let y=previous?previous.y+(targetY-previous.y)*blend:targetY;
 // Keep the view inside the map so the empty drop under the floor is not shown.
 // A map shorter than the view is anchored on its floor: the spare height goes
 // above it (sky), never below it. The visibility clamp below still overrides
 // this for a player who is actually outside the map.
 if(map.height>0)y=spanY>=map.height?map.height-spanY:Math.max(0,Math.min(map.height-spanY,y));
 // Smoothing must never hide a player, including the last remaining teammate.
 x=Math.max(right-(W-pad)/zoom,Math.min(left-pad/zoom,x));
 y=Math.max(low-(H-bottom)/zoom,Math.min(high-top/zoom,y));
 return {x,y,zoom};
}
// Auto scroll (QScrollType 2): the original Camera.funcAuto view
// (source-camera-native.js stage area, raw FP) fills the screen height; a
// wider screen shows the same centre. Before the first update the camera has
// not run yet, so a copy is moved onto the start scroll position for display.
function fromAutoScroll(a,viewport={width:1200,height:675}){
 const F=65536;let area=a.cameraAreaRaw;
 if(!a.steps&&typeof SourceCameraNative!=='undefined')area=SourceCameraNative.updateAuto(JSON.parse(JSON.stringify(a.camera)),a.scroll.scrollPositionRaw).cameraAreaRaw;
 const w=area.width/F,h=area.height/F,zoom=viewport.height/h;
 return {x:area.x/F+(w-viewport.width/zoom)/2,y:area.y/F,zoom};
}
function point(camera,x,y){return {x:(x-camera.x)*camera.zoom,y:(y-camera.y)*camera.zoom};}
const api={update,point,baseZoom,fromAutoScroll};if(typeof module!=='undefined'&&module.exports)module.exports=api;root.ParkCamera=api;
})(typeof window!=='undefined'?window:globalThis);
