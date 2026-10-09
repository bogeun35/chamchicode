(function(root){
'use strict';
const overlap=(a,b)=>a.x<b.x+b.w&&a.x+a.w>b.x&&a.y<b.y+b.h&&a.y+a.h>b.y;
function triangles(h,inset=0){const out=[],tile=h.tileWidth||16;for(let x=h.x;x<h.x+h.w;x+=tile){const w=Math.min(tile,h.x+h.w-x);if(w<=inset*2||h.h<=inset*2)continue;out.push([{x:x+inset,y:h.y+h.h-inset},{x:x+w/2,y:h.y+inset},{x:x+w-inset,y:h.y+h.h-inset}]);}return out;}
function intersects(rect,tri){
 const corners=[{x:rect.x,y:rect.y},{x:rect.x+rect.w,y:rect.y},{x:rect.x+rect.w,y:rect.y+rect.h},{x:rect.x,y:rect.y+rect.h}];
 const axes=[{x:1,y:0},{x:0,y:1}];for(let i=0;i<3;i++){const a=tri[i],b=tri[(i+1)%3];axes.push({x:a.y-b.y,y:b.x-a.x});}
 for(const axis of axes){const pa=corners.map(p=>p.x*axis.x+p.y*axis.y),pb=tri.map(p=>p.x*axis.x+p.y*axis.y);if(Math.max(...pa)<=Math.min(...pb)||Math.max(...pb)<=Math.min(...pa))return false;}return true;
}
function hit(player,h,defaultShape='rect'){
 if((h.shape||defaultShape)!=='spike')return overlap(player,h);
 const ix=Math.min(4,player.w/4),iy=Math.min(3,player.h/4),hurt={x:player.x+ix,y:player.y+iy,w:player.w-ix*2,h:player.h-iy*2};
 return overlap(hurt,h)&&triangles(h,2).some(t=>intersects(hurt,t));
}
const api={hit,triangles};if(typeof module!=='undefined'&&module.exports)module.exports=api;root.ParkHazards=api;
})(typeof window!=='undefined'?window:globalThis);
