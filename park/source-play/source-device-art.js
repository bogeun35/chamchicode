/* Pictures for the source devices that park-art.js does not know about.
 * park-art.js draws terrain, doors, keys, springs, switches, bridges, blinks and
 * the friends; every device registered after it (lifts, poles, enemies, balls,
 * winds, line paths, count-ups, landmines, Dossun, blackout) is drawn here, in
 * world coordinates, so the art renderer and the flat fallback show the same
 * thing. Pictures only: nothing here feeds back into the simulation, and every
 * shape comes from the module's own rect / solids / displays output. */
(function(root){
'use strict';
const F=65536,INK='#463a62';
const FRIEND_COLORS=['#ffb36b','#74e4db','#afa4ff','#ff93b8','#b5e47b','#7abaff','#f4d475','#e2a2ff'];
function rr(c,x,y,w,h,r){r=Math.max(0,Math.min(r,w/2,h/2));c.beginPath();c.roundRect?c.roundRect(x,y,w,h,r):c.rect(x,y,w,h);}
function fillStroke(c,fill,stroke,width=2){if(fill){c.fillStyle=fill;c.fill();}if(stroke){c.strokeStyle=stroke;c.lineWidth=width;c.stroke();}}
function label(c,text,x,y,color='#fffdf6',size=12){c.font=`bold ${size}px system-ui`;c.textAlign='center';c.textBaseline='middle';
 c.lineWidth=3;c.strokeStyle='rgba(40,30,60,.75)';c.strokeText(text,x,y);c.fillStyle=color;c.fillText(text,x,y);}
function eyes(c,cx,cy,gap,h=6,w=4){c.fillStyle=INK;rr(c,cx-gap/2-w/2,cy-h/2,w,h,w/2);c.fill();rr(c,cx+gap/2-w/2,cy-h/2,w,h,w/2);c.fill();}
function spikeBall(c,cx,cy,R,color){c.beginPath();const n=8;for(let i=0;i<n*2;i++){const a=i*Math.PI/n,d=i%2?R*.62:R;c.lineTo(cx+Math.cos(a)*d,cy+Math.sin(a)*d);}c.closePath();fillStroke(c,color,INK,1.5);}
const raw=r=>({x:r.xRaw/F,y:r.yRaw/F,w:r.widthRaw/F,h:r.heightRaw/F});
const fpBox=d=>({x:d.x/F,y:d.y/F,w:d.width/F,h:d.height/F});

function plank(c,b,fill,line){rr(c,b.x,b.y,b.w,b.h,Math.min(6,b.h/2));fillStroke(c,fill,INK,2);
 c.strokeStyle=line;c.lineWidth=2;c.beginPath();c.moveTo(b.x+5,b.y+4);c.lineTo(b.x+b.w-5,b.y+4);c.stroke();}

function lifts(c,s){
 for(const b of (s.liftState&&s.liftState.lifts)||[]){
  // WeightedLift only moves once riders reach moveContactCount
  // (CalcMoveContactCount 0x181738090), so the count is the whole mechanic.
  const ready=b.riders>=b.moveContactCount;
  plank(c,b,ready?'#9ad0f5':'#c9d3e6',ready?'#e6f5ff':'#eef2f9');
  label(c,b.riders+' / '+b.moveContactCount,b.x+b.w/2,b.y-11,ready?'#e6f5ff':'#fffdf6');
 }
}
function linePaths(c,s,time){
 const L=root.SourceLinepathDevices;if(!L||!s.linePathState)return;
 for(const b of L.solids(s.linePathState))plank(c,b,'#ffd27a','#fff1c9');
 for(const d of L.displays(s.linePathState).devices||[]){if(d.type!=='DamageRect'||!d.rectRaw)continue;
  const r={x:d.xRaw/F+d.rectRaw.x/F,y:d.yRaw/F+d.rectRaw.y/F,w:d.rectRaw.width/F,h:d.rectRaw.height/F};
  c.save();c.globalAlpha=d.collisionInactive?.35:1;rr(c,r.x,r.y,r.w,r.h,4);fillStroke(c,'#ff8fa3',INK,2);
  c.fillStyle='#ffd0d8';for(let y=r.y+10;y<r.y+r.h-6;y+=22){c.beginPath();c.moveTo(r.x+r.w/2,y);c.lineTo(r.x+r.w-6,y+9);c.lineTo(r.x+6,y+9);c.closePath();c.fill();}
  c.restore();}
}
function poles(c,s){
 const P=root.SourcePoleDevices;if(!P||!s.poleState||!s.poleState.poles.length)return;
 const v=P.displays(s.poleState);
 for(const p of v.poles){rr(c,p.x-3,p.y,6,p.height,3);fillStroke(c,'#e2bd85',INK,1.5);}
 // each thorn is two crossing rects; the picture is a spike ball over them
 for(const t of v.thorns){const rs=(t.collisionRects||[]).map(raw);if(!rs.length)continue;
  const x0=Math.min(...rs.map(r=>r.x)),y0=Math.min(...rs.map(r=>r.y)),x1=Math.max(...rs.map(r=>r.x+r.w)),y1=Math.max(...rs.map(r=>r.y+r.h));
  spikeBall(c,(x0+x1)/2,(y0+y1)/2,Math.max(x1-x0,y1-y0)/2+1,'#ff7a90');}
}
function enemies(c,s,time){
 const E=root.SourceEnemyDevices;if(!E||!s.enemyState||!(s.enemyState.enemies||[]).length)return;
 for(const h of E.hazards(s.enemyState)){
  // Bowwow: a round biter, the hazard rect is its whole body
  const cx=h.x+h.w/2,cy=h.y+h.h/2,rx=h.w/2,ry=h.h/2,attack=h.state&&h.state!==0;
  c.beginPath();c.ellipse(cx,cy,rx,ry,0,0,Math.PI*2);fillStroke(c,'#5b5577',INK,2);
  c.fillStyle='#fffdf6';c.beginPath();c.ellipse(cx-rx*.32,cy-ry*.25,rx*.16,ry*.2,0,0,Math.PI*2);c.ellipse(cx+rx*.32,cy-ry*.25,rx*.16,ry*.2,0,0,Math.PI*2);c.fill();
  eyes(c,cx,cy-ry*.22,rx*.64,7,5);
  c.fillStyle='#fffdf6';const mw=rx*1.1,my=cy+ry*.28;c.beginPath();c.moveTo(cx-mw/2,my);for(let i=0;i<=6;i++)c.lineTo(cx-mw/2+i*mw/6,my+(i%2?(attack?9:6):0));c.closePath();c.fill();
 }
}
function balls(c,s){
 if(!s.pitcherState||!(s.pitcherState.pitchers||[]).length)return;
 for(const p of s.pitcherState.pitchers){const x=p.positionRaw.xRaw/F,y=p.positionRaw.yRaw/F;
  rr(c,x-27,y-40,54,40,8);fillStroke(c,'#b9a8e6',INK,2);c.beginPath();c.arc(x,y-20,10,0,Math.PI*2);fillStroke(c,'#5b4a86',INK,1.5);}
 for(const b of (s.keyBoxState&&s.keyBoxState.boxes)||[]){const a=s.boxActors&&s.boxActors[b.id];if(!a)continue;
  // the box's own colliders: index 0 is the body, index 1 the slot the ball enters
  for(const col of b.colliders||[]){const r=col.rectRaw,box={x:(a.positionRaw.xRaw+r.xRaw)/F,y:(a.positionRaw.yRaw+r.yRaw)/F,w:r.widthRaw/F,h:r.heightRaw/F};
   if(col.index===0){rr(c,box.x,box.y,box.w,box.h,6);fillStroke(c,'#e8b273',INK,2);c.strokeStyle='#b57d43';c.lineWidth=2;c.strokeRect(box.x+5,box.y+5,box.w-10,box.h-10);}
   else{rr(c,box.x,box.y,box.w,box.h,3);fillStroke(c,'#6b4a2e',null);}}}
 for(const a of Object.values(s.ballActors||{})){if(a.visible===false)continue;
  c.save();c.globalAlpha=a.collisionActive===false?.45:1;c.beginPath();c.arc(a.positionRaw.xRaw/F,a.positionRaw.yRaw/F,12,0,Math.PI*2);fillStroke(c,'#ffe27a',INK,2);
  c.fillStyle='rgba(255,255,255,.7)';c.beginPath();c.arc(a.positionRaw.xRaw/F-4,a.positionRaw.yRaw/F-4,3.5,0,Math.PI*2);c.fill();c.restore();}
}
function winds(c,s,time){
 const W=root.SourceWindDevices;if(!W||!s.windState||!(s.windState.winds||[]).length)return;
 for(const b of W.solids(s.windState)){rr(c,b.x,b.y,b.w,b.h,8);fillStroke(c,'#c6ecf2',INK,2);
  c.save();c.translate(b.x+b.w/2,b.y+b.h/2);c.rotate(time*12);c.fillStyle='#7cc7d6';for(let i=0;i<3;i++){c.rotate(Math.PI*2/3);c.beginPath();c.ellipse(0,-9,4,9,0,0,Math.PI*2);c.fill();}c.restore();}
 // the volume ActorWind pushes inside (direction 2 extends left of the actor)
 for(const w of W.displays(s.windState)){const len=w.rangeRaw/F,x0=w.direction===2?w.x-len:w.x,y=w.y-60,sign=w.direction===2?-1:1;
  c.save();c.strokeStyle=w.strong?'rgba(70,160,200,.8)':'rgba(90,170,205,.55)';c.lineWidth=2.5;c.lineCap='round';
  for(let i=0;i<Math.ceil(len/90);i++){const ph=((time*(w.strong?260:150)+i*90)%len+len)%len,x=w.direction===2?w.x-ph:w.x+ph,yy=y+((i*37)%28)-6;
   c.beginPath();c.moveTo(x,yy);c.lineTo(x-sign*24,yy);c.stroke();}
  c.restore();void x0;}
}
function speedSwitches(c,s){
 const M=root.SourceMoveWallDevices;if(!M||!s.speedSwitchState)return;
 for(const sw of M.displays(s.speedSwitchState).switches||[]){const r={x:sw.x+sw.rect.x,y:sw.y+sw.rect.y,w:sw.rect.w,h:sw.rect.h};
  rr(c,r.x-4,r.y,r.w+8,r.h+2,3);fillStroke(c,sw.pressed?'#9ff0c8':'#7fd8a6',INK,1.5);
  label(c,'×'+sw.speedScale,r.x+r.w/2,r.y-12,'#e6fff2',11);}
}
function countUps(c,s){
 const C=root.SourceCountUpDevices;if(!C||!s.countUpState)return;
 for(const d of C.displays(s.countUpState)){
  for(const t of d.timers||[]){const text=t.hatena?'?':(t.centiseconds/100).toFixed(2);
   rr(c,t.x-30,t.y-58,60,24,8);fillStroke(c,t.failed?'#ffb0bd':t.stopped?'#bff0d5':t.counting?'#fff1b0':'#fffdf6',INK,2);
   c.font='bold 14px system-ui';c.textAlign='center';c.textBaseline='middle';c.fillStyle=INK;c.fillText(text,t.x,t.y-46);}
  const u={x:d.x+(d.uiPosParam?d.uiPosParam.x:0),y:Math.max(28,d.y+(d.uiPosParam?d.uiPosParam.y:0))};
  // isCleared: judgeTimeMin < sumTime < judgeTimeMax, in the timers' own seconds
  label(c,d.cleared?'성공!':d.failedRound?'다시!':'합계 '+d.sumTime.toFixed(2)+' · '+d.judgeTimeMin+'~'+d.judgeTimeMax+'초 사이',u.x,u.y,d.cleared?'#bff0d5':d.failedRound?'#ffb0bd':'#fffdf6',14);
 }
}
function landmines(c,s){
 const lm=s.landmines;if(!lm||!lm.observer)return;
 // A switch only shows whether it was a mine after RevealLandmine 0x1818708d0,
 // so an unpressed one must look exactly like every other one.
 for(const sw of lm.switches||[]){const b=(s.map.switches||[]).find(x=>x.id===sw.id);if(!b)continue;
  if(sw.revealedLandmine){spikeBall(c,b.x+b.w/2,b.y-8,10,'#ff7a90');}
  else if(sw.exploding){c.save();c.strokeStyle='#ffb020';c.lineWidth=3;rr(c,b.x-4,b.y-4,b.w+8,b.h+8,5);c.stroke();c.restore();}
  else if(sw.pressed){label(c,'✓',b.x+b.w/2,b.y-12,'#bff0d5',13);}}
 const o=lm.observer;label(c,o.pushedSwitchCount+' / '+o.clearSwitchCount,s.map.width/2,40,o.isGameOver?'#ffb0bd':o.isGameClear?'#bff0d5':'#fffdf6',16);
}
function dossuns(c,s){
 const D=root.SourceDossunDevices,P=root.SourcePlayerBlockDevices;if(!D||!s.dossunState||!s.dossunState.devices.length)return;
 for(const d of D.solids(s.dossunState)){
  // thorn strip: the 12px that collision 1 reaches under the body
  if(d.actorType===157&&d.collisionIndex===1){const r=fpBox(d),n=Math.max(1,Math.floor(r.w/22)),st=r.w/n;
   c.beginPath();for(let i=0;i<n;i++){const x=r.x+i*st;c.moveTo(x,r.y+r.h-12);c.lineTo(x+st/2,r.y+r.h);c.lineTo(x+st,r.y+r.h-12);}c.closePath();fillStroke(c,'#e9edf4',INK,1.5);}
 }
 for(const d of D.solids(s.dossunState)){
  if(d.actorType===157&&d.collisionIndex===0){const r=fpBox(d),dev=s.dossunState.devices.find(x=>x.id===d.actorId),angry=dev&&(dev.phase===1||dev.phase===2);
   rr(c,r.x,r.y,r.w,r.h,14);fillStroke(c,'#a9b6cc',INK,2.5);c.strokeStyle='#cdd6e5';c.lineWidth=3;rr(c,r.x+8,r.y+8,r.w-16,r.h-16,10);c.stroke();
   const cx=r.x+r.w/2,cy=r.y+r.h*.48;eyes(c,cx,cy,64,angry?8:14,10);
   if(angry){c.strokeStyle=INK;c.lineWidth=4;c.beginPath();c.moveTo(cx-46,cy-18);c.lineTo(cx-22,cy-10);c.moveTo(cx+46,cy-18);c.lineTo(cx+22,cy-10);c.stroke();}
   c.fillStyle=INK;rr(c,cx-12,cy+20,24,angry?8:4,2);c.fill();}
  else if(d.actorType===162){const b=s.dossunState.bullets.find(q=>q.id===d.actorId),r=fpBox(d);
   c.save();c.globalAlpha=b&&b.disappearing?.4:1;c.beginPath();c.arc(r.x+r.w/2,r.y+r.h/2,r.w/2+2,0,Math.PI*2);fillStroke(c,FRIEND_COLORS[((b&&b.colorIndex)||0)%8],INK,1.5);c.restore();}
 }
 // a PlayerBlock stands in for its hidden player, in that player's colour
 if(P)for(const d of P.solids(s.dossunState.playerBlocks)){const b=s.dossunState.playerBlocks.blocks.find(q=>q.id===d.id),r=fpBox(d),col=FRIEND_COLORS[((b&&b.colorIndex)||0)%8];
  rr(c,r.x,r.y,r.w,r.h,6);fillStroke(c,col,INK,2);c.strokeStyle='rgba(255,255,255,.55)';c.lineWidth=2;rr(c,r.x+4,r.y+4,r.w-8,r.h-8,4);c.stroke();
  eyes(c,r.x+r.w/2,r.y+r.h/2,12,6,4);label(c,String(((b&&b.playerIndex)||0)+1),r.x+r.w/2,r.y-10,'#fffdf6',12);}
}
function blackoutLabels(c,s){
 const bc=s.blackoutState&&s.blackoutState.controllers&&s.blackoutState.controllers[0];
 if(!bc||!bc.visibleUI)return;const p=s.players[bc.playerIndex];if(!p||p.exit)return;
 label(c,'X: 불 켜기',p.x+p.w/2,p.y-34,'#ffe082',12);
}
// World pass, drawn after the terrain and before the friends.
function draw(c,s,opts={}){if(!s)return;const time=opts.time??(performance.now()/1000);
 c.save();
 try{linePaths(c,s,time);lifts(c,s);poles(c,s);winds(c,s,time);speedSwitches(c,s);countUps(c,s);landmines(c,s);balls(c,s);dossuns(c,s);enemies(c,s,time);}
 finally{c.restore();}
}
// World pass after the friends (labels that must sit on top of them).
function drawAbove(c,s){if(!s)return;c.save();try{blackoutLabels(c,s);}finally{c.restore();}}
// Screen pass: the blackout darkness covers the whole view.
function overlay(c,s,view){
 const B=root.SourceBlackoutDevices;if(!B||!s||!s.blackoutState||!s.blackoutState.blackouts.length)return;
 for(const b of B.displays(s.blackoutState).blackouts){const a=Math.max(0,Math.min(1,b.alpha*(b.darknessRaw/F)));
  if(a>0){c.fillStyle='rgba(0,0,0,'+a+')';c.fillRect(0,0,view.width,view.height);}}
}
root.SourceDeviceArt={draw,drawAbove,overlay};
})(typeof window!=='undefined'?window:globalThis);
