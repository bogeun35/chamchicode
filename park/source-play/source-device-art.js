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
// a player slot (actor order) shows that player's own colour (shufflePlayer moves people between slots)
function slotColor(s,i){const p=s&&s.players&&s.players[i];return FRIEND_COLORS[((p&&p.colorIndex!==undefined)?p.colorIndex:i)%8];}
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
 const k=(s.map.stageScaleRaw||F)/F;// stage scale: every piece drawn k times
 for(const p of s.pitcherState.pitchers){const x=p.positionRaw.xRaw/F,y=p.positionRaw.yRaw/F;
  rr(c,x-27*k,y-40*k,54*k,40*k,8*k);fillStroke(c,'#b9a8e6',INK,2);c.beginPath();c.arc(x,y-20*k,10*k,0,Math.PI*2);fillStroke(c,'#5b4a86',INK,1.5);}
 for(const b of (s.keyBoxState&&s.keyBoxState.boxes)||[]){const a=s.boxActors&&s.boxActors[b.id];if(!a)continue;
  // the box's own colliders: index 0 is the body, index 1 the slot the ball enters
  for(const col of b.colliders||[]){const r=col.rectRaw,box={x:(a.positionRaw.xRaw+r.xRaw*k)/F,y:(a.positionRaw.yRaw+r.yRaw*k)/F,w:r.widthRaw*k/F,h:r.heightRaw*k/F};
   if(col.index===0){rr(c,box.x,box.y,box.w,box.h,6);fillStroke(c,'#e8b273',INK,2);c.strokeStyle='#b57d43';c.lineWidth=2;c.strokeRect(box.x+5,box.y+5,box.w-10,box.h-10);}
   else{rr(c,box.x,box.y,box.w,box.h,3);fillStroke(c,'#6b4a2e',null);}}}
 for(const a of Object.values(s.ballActors||{})){if(a.visible===false)continue;
  c.save();c.globalAlpha=a.collisionActive===false?.45:1;c.beginPath();c.arc(a.positionRaw.xRaw/F,a.positionRaw.yRaw/F,12*k,0,Math.PI*2);fillStroke(c,'#ffe27a',INK,2);
  c.fillStyle='rgba(255,255,255,.7)';c.beginPath();c.arc(a.positionRaw.xRaw/F-4*k,a.positionRaw.yRaw/F-4*k,3.5*k,0,Math.PI*2);c.fill();c.restore();}
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
function moveWalls(c,s){
 const M=root.SourceMoveWallDevices;if(!M||!s.speedSwitchState||!(s.speedSwitchState.walls||[]).length)return;
 for(const w of M.displays(s.speedSwitchState).walls){rr(c,w.x,w.y,w.w,w.h,5);fillStroke(c,w.state===2?'#ffb38a':'#c7b8e8',INK,2);
  c.strokeStyle='rgba(70,58,98,.35)';c.lineWidth=2;for(let y=w.y+20;y<w.y+w.h-10;y+=26){c.beginPath();c.moveTo(w.x+4,y);c.lineTo(w.x+w.w-4,y);c.stroke();}}
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
function searchLights(c,s){
 const L=root.SourceSearchLightDevices;if(!L||!s.searchLightState||!s.searchLightState.lights.length)return;
 for(const l of L.displays(s.searchLightState).lights){const x=l.xRaw/F,y=l.yRaw/F,crit=l.criteriaRaw/F;
  // the cone insidePoint tests: radius range*criteria, half angle angle*criteria/2,
  // direction = worldDirection with Y flipped into screen space
  const r=l.rangeRaw/F*crit,half=l.angleRaw/F*crit/2*Math.PI/180,dir=Math.atan2(-l.worldDirectionRaw.yRaw,l.worldDirectionRaw.xRaw);
  const a=Math.max(0,Math.min(1,l.brightnessRaw/F));
  if(a>0){c.save();const g=c.createRadialGradient(x,y,4,x,y,r);g.addColorStop(0,'rgba(255,240,150,'+(.55*a)+')');g.addColorStop(1,'rgba(255,240,150,'+(.12*a)+')');
   c.fillStyle=g;c.beginPath();c.moveTo(x,y);c.arc(x,y,r,dir-half,dir+half);c.closePath();c.fill();c.restore();}
  c.save();c.translate(x,y);c.rotate(dir-Math.PI/2);rr(c,-10,-8,20,14,5);fillStroke(c,a>0?'#ffe27a':'#b8b2c8',INK,1.5);c.restore();
 }
}
function gears(c,s){
 const G=root.SourceLinePathGearDevices;if(!G||!s.gearState||!s.gearState.gears.length)return;
 for(const g of G.displays(s.gearState)){const a=s.gearActors&&s.gearActors[g.id];if(!a)continue;
  const ix=g.initialPositionRaw.xRaw/F,iy=g.initialPositionRaw.yRaw/F;
  // guide line (slot 6) along the authored relative path
  if(g.enableLine&&g.paths.length){c.save();c.strokeStyle='rgba(70,58,98,.45)';c.lineWidth=4;c.setLineDash([10,8]);c.beginPath();c.moveTo(ix-2,iy-48);
   for(const q of g.paths)c.lineTo(ix+q.xRaw/F-2,iy+q.yRaw/F-48);c.stroke();c.restore();}
  // Gear.COLLISION_CIRCLE: radius 45 at (-2,-48) from the actor
  const cx=a.xRaw/F-2,cy=a.yRaw/F-48,R=45;c.save();c.translate(cx,cy);c.rotate(-g.angleRaw/F*Math.PI/180);
  c.beginPath();const n=14;for(let i=0;i<n*2;i++){const ang=i*Math.PI/n,d=i%2?R-7:R+3;c.lineTo(Math.cos(ang)*d,Math.sin(ang)*d);}c.closePath();
  fillStroke(c,g.standby?'#c9c6d6':'#d9dde6',INK,2);c.beginPath();c.arc(0,0,R*.55,0,Math.PI*2);fillStroke(c,'#aab3c4',INK,1.5);
  c.beginPath();c.arc(0,0,8,0,Math.PI*2);fillStroke(c,'#6d6a86',null);c.restore();
 }
}
function upDownLifts(c,s){
 const U=root.SourceUpDownLiftDevices;if(!U||!s.upDownLiftState||!s.upDownLiftState.lifts.length)return;
 for(const b of U.solids(s.upDownLiftState))plank(c,b,'#f7b7d2','#ffe3ef');
}
function warpGuns(c,s){
 const W=root.SourcePlayerWarpGunDevices;if(!W||!s.warpGunState||!s.warpGunState.guns.length)return;
 const v=W.displays(s.warpGunState);
 for(const g of v.guns){if(!g.playerId)continue;const p=s.players.find(q=>q.id===g.playerId);if(!p||p.exit||p.asBlock)continue;
  // the gun sits at the player's anchor + direction*(20,-10); its colour turns
  // into the captured friend's while it holds one (SetTarget)
  const x=g.xRaw/F,y=g.yRaw/F,left=!!p.facingLeft;c.save();c.translate(x,y);if(left)c.scale(-1,1);
  rr(c,-8,-5,18,9,3);fillStroke(c,FRIEND_COLORS[(g.colorIndex||0)%8],INK,1.5);rr(c,-6,2,6,7,2);fillStroke(c,'#8a84a6',INK,1);c.restore();
  if(g.targetId){label(c,'●',x,y-14,FRIEND_COLORS[(g.colorIndex||0)%8],12);}}
 for(const b of v.bullets){c.save();c.globalAlpha=b.disappearing?.4:1;c.beginPath();c.arc(b.xRaw/F,b.yRaw/F,6,0,Math.PI*2);fillStroke(c,FRIEND_COLORS[(b.colorIndex||0)%8],INK,1.5);c.restore();}
}
function breakables(c,s){
 const B=root.SourceBreakableRectDevices;if(!B||!s.breakableState||!s.breakableState.blocks.length)return;
 for(const r of B.displays(s.breakableState)){rr(c,r.x,r.y,r.w,r.h,4);fillStroke(c,'#d9b48a',INK,2);
  // brick courses with cracks, so it reads as breakable rather than ground
  c.save();c.beginPath();c.rect(r.x,r.y,r.w,r.h);c.clip();c.strokeStyle='rgba(70,58,98,.35)';c.lineWidth=1.5;
  for(let y=r.y+r.h/2;y<r.y+r.h;y+=r.h/2){c.beginPath();c.moveTo(r.x,y);c.lineTo(r.x+r.w,y);c.stroke();}
  for(let row=0;row<2;row++)for(let x=r.x+(row?24:0);x<r.x+r.w;x+=48){c.beginPath();c.moveTo(x,r.y+row*r.h/2);c.lineTo(x,r.y+(row+1)*r.h/2);c.stroke();}
  c.strokeStyle='rgba(70,58,98,.55)';for(let x=r.x+30;x<r.x+r.w;x+=96){c.beginPath();c.moveTo(x,r.y+4);c.lineTo(x+6,r.y+12);c.lineTo(x+2,r.y+20);c.stroke();}
  c.restore();}
}
function magnets(c,s,time){
 const M=root.SourcePlayerMagnetDevices;if(!M||!s.magnetState||!s.magnetState.magnets.length)return;
 for(const m of M.displays(s.magnetState)){if(m.xRaw===null)continue;const owner=s.players[m.ownerIndex];if(!owner||owner.exit||owner.asBlock)continue;
  const x=m.xRaw/F,y=m.yRaw/F,col=slotColor(s,m.ownerIndex);
  // the pull field while X is held: the magnet's own collision rect
  if(m.input&&m.rect){c.save();c.globalAlpha=.18+.06*Math.sin(time*10);c.fillStyle=col;rr(c,m.rect.x,m.rect.y,m.rect.w,m.rect.h,10);c.fill();c.restore();}
  // horseshoe magnet in front of the owner
  c.save();c.translate(x,y);if(m.facingLeft)c.scale(-1,1);c.lineCap='round';
  c.strokeStyle=INK;c.lineWidth=9;c.beginPath();c.arc(0,0,7,Math.PI/2,Math.PI*3/2,true);c.stroke();
  c.strokeStyle='#ff7a90';c.lineWidth=6;c.beginPath();c.arc(0,0,7,Math.PI/2,Math.PI*3/2,true);c.stroke();
  c.fillStyle='#e9edf4';c.fillRect(0,-10,5,5);c.fillRect(0,5,5,5);c.restore();
  if(m.targetId){const t=s.players.find(q=>q.id===m.targetId);if(t){c.save();c.strokeStyle=col;c.lineWidth=2;c.setLineDash([4,4]);c.beginPath();c.moveTo(x,y);c.lineTo(t.x+t.w/2,t.y+t.h/2);c.stroke();c.restore();}}
 }
}
function colorBoxes(c,s){
 if(!s.colorBoxState||!s.colorBoxState.boxes.length||!s.colorBoxActors)return;
 for(const b of s.colorBoxState.boxes){const a=s.colorBoxActors[b.id];if(!a||a.hidden)continue;
  const r={x:(a.xRaw+b.rect.xRaw)/F,y:(a.yRaw+b.rect.yRaw)/F,w:b.rect.widthRaw/F,h:b.rect.heightRaw/F},col=FRIEND_COLORS[(b.colorIndex||0)%8];
  // only its own player can push it, so the colour is the whole rule
  rr(c,r.x,r.y,r.w,r.h,6);fillStroke(c,col,INK,2);c.strokeStyle='rgba(255,255,255,.5)';c.lineWidth=2;rr(c,r.x+5,r.y+5,r.w-10,r.h-10,4);c.stroke();
  label(c,String((b.playerIndex||0)+1),r.x+r.w/2,r.y+r.h/2,'#fffdf6',14);}
}
function deadSwitches(c,s){
 for(const b of s.map.switches||[]){if(b.type!=='DeadSwitch')continue;
  rr(c,b.x-2,b.y-2,b.w+4,b.h+4,3);fillStroke(c,'#ff7a90',INK,1.5);
  const cx=b.x+b.w/2,cy=b.y-12;c.beginPath();c.arc(cx,cy,8,0,Math.PI*2);fillStroke(c,'#fffdf6',INK,1.5);
  c.fillStyle=INK;c.fillRect(cx-4,cy-2,3,3);c.fillRect(cx+1,cy-2,3,3);c.fillRect(cx-3,cy+3,6,2);}
}
function rollGears(c,s){
 const G=root.SourceGearDevices;if(!G||!s.rollGearState||!s.rollGearState.gears.length||!s.rollGearActors)return;
 for(const g of s.rollGearState.gears){const a=s.rollGearActors[g.id];if(!a)continue;
  // Gear collision circle: radius 45 at (-2,-48) from the actor
  const cx=a.xRaw/F-2,cy=a.yRaw/F-48,R=45;c.save();c.translate(cx,cy);c.rotate(-g.angleRaw/F*Math.PI/180);
  c.beginPath();const n=10;for(let i=0;i<n*4;i++){const ang=i*Math.PI*2/(n*4),tooth=(i%4)<2;const d=tooth?R+1:R-8;c.lineTo(Math.cos(ang)*d,Math.sin(ang)*d);}c.closePath();
  fillStroke(c,g.standby?'#cfc9e0':'#f0c27a',INK,2);c.beginPath();c.arc(0,0,R*.5,0,Math.PI*2);fillStroke(c,'#fff1c9',INK,1.5);
  c.beginPath();c.arc(0,0,7,0,Math.PI*2);fillStroke(c,INK,null);c.restore();}
}
function ghosts(c,s,time){
 if(!s.ghostState||!s.ghostState.ghosts.length||!s.ghostActors)return;
 for(const g of s.ghostState.ghosts){const a=s.ghostActors[g.id];if(!a)continue;
  // collider (-20,-55,40,54); alpha fades out on defeat; sprite 0 chasing,
  // 1..3 partly looked at, 4 stopped (covering its face)
  const x=a.positionRaw.xRaw/F,y=a.positionRaw.yRaw/F-28,alpha=Math.max(0,Math.min(1,(g.alphaRaw??F)/F));if(alpha<=0)continue;
  c.save();c.globalAlpha*=alpha*.92;c.translate(x,y);if(a.facingLeft)c.scale(-1,1);
  c.beginPath();c.moveTo(-20,22);c.lineTo(-20,-6);c.arc(0,-6,20,Math.PI,0);c.lineTo(20,22);for(let i=0;i<4;i++){c.lineTo(20-i*10-5,16);c.lineTo(20-(i+1)*10,22);}c.closePath();
  fillStroke(c,'#f5f3ff',INK,2);
  if((g.spriteIndex??0)>=4){c.fillStyle='#ffb3c6';rr(c,-14,-10,12,8,4);c.fill();rr(c,2,-10,12,8,4);c.fill();}
  else{eyes(c,0,-6,14,8,5);c.fillStyle=INK;c.beginPath();c.ellipse(0,6,5,3,0,0,Math.PI*2);c.fill();}
  c.restore();}
}
function topViewFloor(c,s){
 // top view: the walkable chips get a floor, fall chips (attribute 16, chip 69) a pit
 const g=s.map&&s.map.tvChips;if(!g)return;const T=48,ATTR16=new Set([69]);
 for(let y=0;y<g.height;y++)for(let x=0;x<g.width;x++){const chip=g.chips[y*g.width+x];
  if(ATTR16.has(chip)){c.fillStyle='#2b2440';c.fillRect(x*T,y*T,T,T);c.fillStyle='rgba(0,0,0,.25)';c.fillRect(x*T,y*T,T,8);}
  else if(chip<=1){c.fillStyle='#eddfc0';c.fillRect(x*T,y*T,T,T);}}
}
function blackoutLabels(c,s){
 const bc=s.blackoutState&&s.blackoutState.controllers&&s.blackoutState.controllers[0];
 if(!bc||!bc.visibleUI)return;const p=s.players[bc.playerIndex];if(!p||p.exit)return;
 label(c,'X: 불 켜기',p.x+p.w/2,p.y-34,'#ffe082',12);
}
// 9-1 BatEnemy / FallingCage. The light cone is the one the bat searches with:
// radius range*criteria, half angle angle*criteria/2, along the look vector.
function batLights(c,s){
 const B=root.SourceBatEnemyDevices;if(!B||!s.batState||!s.batState.bats.length)return;
 for(const b of B.displays(s.batState).bats){const l=b.light;if(!l.on)continue;
  const dir=Math.atan2(l.dy,l.dx),half=l.halfAngle*Math.PI/180,a=.35+.65*Math.max(0,Math.min(1,l.brightness));
  c.save();const g=c.createRadialGradient(l.x,l.y,4,l.x,l.y,l.range);g.addColorStop(0,'rgba(255,236,140,'+(.6*a)+')');g.addColorStop(1,'rgba(255,236,140,'+(.1*a)+')');
  c.fillStyle=g;c.beginPath();c.moveTo(l.x,l.y);c.arc(l.x,l.y,l.range,dir-half,dir+half);c.closePath();c.fill();c.restore();}
}
function bats(c,s,time){
 const B=root.SourceBatEnemyDevices;if(!B||!s.batState||!s.batState.bats.length)return;
 for(const b of B.displays(s.batState).bats){
  // collider (-14,-40,28,40); the body floats higher while ShadowOffset01 is up
  const lift=b.captured?0:6+8*b.shadowOffset,cx=b.x,cy=b.y-20-lift,flap=b.captured?0:Math.sin(time*14+cx)*5;
  c.save();c.fillStyle='rgba(40,30,60,.22)';c.beginPath();c.ellipse(cx,b.y-3,12,4,0,0,Math.PI*2);c.fill();
  c.fillStyle='#8f7bd6';c.strokeStyle=INK;c.lineWidth=2;
  for(const k of [-1,1]){c.beginPath();c.moveTo(cx+k*8,cy-2);c.quadraticCurveTo(cx+k*20,cy-12-flap,cx+k*24,cy+2+flap*.3);c.quadraticCurveTo(cx+k*17,cy+1,cx+k*14,cy+6);c.quadraticCurveTo(cx+k*11,cy+2,cx+k*8,cy+6);c.closePath();c.fill();c.stroke();}
  c.beginPath();c.ellipse(cx,cy,11,10,0,0,Math.PI*2);fillStroke(c,'#a693e6',INK,2);
  c.beginPath();c.moveTo(cx-7,cy-7);c.lineTo(cx-4,cy-14);c.lineTo(cx-1,cy-8);c.moveTo(cx+7,cy-7);c.lineTo(cx+4,cy-14);c.lineTo(cx+1,cy-8);fillStroke(c,'#a693e6',INK,1.5);
  if(b.phase===1&&!b.captured){c.fillStyle='#ff5a6e';c.beginPath();c.arc(cx-4,cy-1,2.2,0,Math.PI*2);c.arc(cx+4,cy-1,2.2,0,Math.PI*2);c.fill();label(c,'!',cx,cy-26,'#ff5a6e',16);}
  else if(b.captured){c.strokeStyle=INK;c.lineWidth=1.6;c.beginPath();c.moveTo(cx-6,cy-1);c.lineTo(cx-2,cy+1);c.moveTo(cx+6,cy-1);c.lineTo(cx+2,cy+1);c.stroke();}
  else eyes(c,cx,cy-1,8,5,3);
  c.restore();}
}
function fallingCages(c,s){
 const B=root.SourceBatEnemyDevices;if(!B||!s.batState||!s.batState.cages.length)return;
 for(const k of B.displays(s.batState).cages){
  // collider (-34,-64,68,64) on the ground; CageY is the drop offset (-400 hidden)
  c.save();c.globalAlpha=.35*k.shadowAlpha;c.fillStyle='#1d1630';c.beginPath();c.ellipse(k.x,k.y-6,34,9,0,0,Math.PI*2);c.fill();c.restore();
  if(k.offsetY<=-399&&!k.captured)continue;
  const x=k.x-34,y=k.y-64+k.offsetY;c.save();
  rr(c,x,y,68,10,4);fillStroke(c,'#9aa3b8',INK,2);
  c.strokeStyle='#6b7388';c.lineWidth=4;for(let i=0;i<6;i++){const bx=x+7+i*10.8;c.beginPath();c.moveTo(bx,y+10);c.lineTo(bx,y+62);c.stroke();}
  c.strokeStyle=INK;c.lineWidth=2;c.strokeRect(x+2,y+10,64,52);rr(c,x,y+58,68,6,3);fillStroke(c,'#9aa3b8',INK,2);
  c.restore();}
}
// 9-3 Cardboard: drawn while displayed, at the owner (Pos = owner + OffsetY);
// the covering rect 0 is (-60,-132,120,128) from that position.
function cardboards(c,s){
 const B=root.SourceBatEnemyDevices;if(!B||!s.batState||!s.batState.cardboards)return;
 for(const k of B.cardboardDisplays(s.batState.cardboards)){if(!k.display)continue;
  const pop=k.phase===1?Math.min(1,1-k.timer+.4):k.phase===3?Math.max(.4,k.timer):1;
  const w=104*pop,h=78*pop,x=k.x-w/2,y=k.y-48-h+6;c.save();
  c.fillStyle='rgba(40,30,60,.22)';c.beginPath();c.ellipse(k.x,k.y-46,w*.5,10,0,0,Math.PI*2);c.fill();
  rr(c,x,y,w,h,8);fillStroke(c,'#d9a66b',INK,2.2);
  c.fillStyle='#c48f55';rr(c,x+4,y+4,w-8,h*.28,5);c.fill();
  c.strokeStyle='#a8743f';c.lineWidth=2;c.beginPath();c.moveTo(k.x,y+4);c.lineTo(k.x,y+h*.32);c.stroke();
  if(pop>.8){eyes(c,k.x,y+h*.62,18,6,4);c.fillStyle='#ffb3c6';c.beginPath();c.ellipse(k.x-17,y+h*.72,5,3,0,0,Math.PI*2);c.ellipse(k.x+17,y+h*.72,5,3,0,0,Math.PI*2);c.fill();}
  c.restore();}
}
// 9-2 CapturingConstraint ring and CapturingTargets. The rope joins each
// player's Pos + CONSTRAINT_OFFSET to the next one's, closing the ring.
function capturingRope(c,s){
 const C=root.SourceCapturingDevices;if(!C||!s.capturingState||!s.capturingState.constraints.length)return;
 const d=C.displays(s.capturingState),k=d.constraint,pts=s.players.map(p=>({x:p.x+16+k.offset.x,y:p.y+47+k.offset.y}));
 if(pts.length<2)return;c.save();c.lineCap='round';c.lineJoin='round';
 c.strokeStyle=k.capturable?(k.any?'#ff6f9f':'#f2a7c3'):'#b9b3c9';c.lineWidth=k.any?5:4;c.setLineDash(k.capturable?[]:[8,6]);
 c.beginPath();pts.forEach((q,i)=>{if(i===0)c.moveTo(q.x,q.y);else c.lineTo(q.x,q.y);});if(pts.length>2)c.closePath();c.stroke();c.restore();
}
function capturingTargets(c,s,time){
 const C=root.SourceCapturingDevices;if(!C||!s.capturingState||!s.capturingState.targets.length)return;
 for(const t of C.displays(s.capturingState).targets){if(t.gone)continue;
  // collider (-12,-12,24,24) centred on Pos
  const bob=t.moving?Math.sin(time*16+t.x)*1.5:0,x=t.x,y=t.y+bob;c.save();
  c.fillStyle='rgba(40,30,60,.2)';c.beginPath();c.ellipse(t.x,t.y+11,11,4,0,0,Math.PI*2);c.fill();
  c.beginPath();c.ellipse(x,y,13,12,0,0,Math.PI*2);fillStroke(c,t.capturing?'#ffd1e0':'#bfe8d4',INK,2);
  c.fillStyle=t.capturing?'#ffd1e0':'#bfe8d4';c.beginPath();c.ellipse(x-7,y-11,4,5,-.4,0,Math.PI*2);c.ellipse(x+7,y-11,4,5,.4,0,Math.PI*2);c.fill();c.stroke();
  if(t.capturing){c.strokeStyle=INK;c.lineWidth=1.6;c.beginPath();c.moveTo(x-6,y-2);c.lineTo(x-2,y);c.moveTo(x+6,y-2);c.lineTo(x+2,y);c.stroke();}
  else eyes(c,x,y-1,9,4,3);
  if(t.meter>0){c.strokeStyle='#ff6f9f';c.lineWidth=3;c.beginPath();c.arc(x,y,18,-Math.PI/2,-Math.PI/2+Math.PI*2*t.meter);c.stroke();}
  c.restore();}
}
function capturingCounter(c,s,view){
 const C=root.SourceCapturingDevices;if(!C||!s.capturingState||!s.capturingState.constraints.length)return;
 const k=C.displays(s.capturingState).constraint;if(k.hideUi)return;
 c.save();rr(c,view.width/2-58,12,116,30,15);fillStroke(c,'rgba(255,253,246,.92)',INK,2);label(c,(k.done?'다 잡았어요! ':'잡은 수 ')+k.captured+' / '+k.total,view.width/2,27,INK,14);c.restore();
}
// 2-1 / 7-1 StepEnemy: collider (-24,-27,48,26); stomping it bounces you,
// touching it from the side is a miss.
function stepEnemies(c,s,time){
 const E=root.SourceStepEnemyDevices;if(!E||!s.stepEnemyState||!s.stepEnemyState.enemies.length)return;
 for(const e of E.displays(s.stepEnemyState)){const cx=e.x+e.w/2,step=Math.sin(time*10+e.x*.2);c.save();
  c.fillStyle=INK;rr(c,cx-17,e.y+e.h-6+(step>0?-1:0),10,6,3);c.fill();rr(c,cx+7,e.y+e.h-6+(step>0?0:-1),10,6,3);c.fill();
  c.beginPath();c.moveTo(e.x+2,e.y+e.h-4);c.quadraticCurveTo(e.x+2,e.y-4,cx,e.y-4);c.quadraticCurveTo(e.x+e.w-2,e.y-4,e.x+e.w-2,e.y+e.h-4);c.closePath();fillStroke(c,'#ffb07a',INK,2);
  c.fillStyle='#ffd7b8';rr(c,e.x+8,e.y+2,e.w-16,6,3);c.fill();
  eyes(c,cx+(e.left?-5:5),e.y+e.h*.5,12,6,4);c.restore();}
}
// 7-1 ArrowSign (direction 3 right / 2 left) and the half-input marks: a
// player who currently holds an input right gets a small badge.
function arrowSigns(c,s){
 const H=root.SourceHalfInputDevices;if(!H||!s.halfInputState||!s.halfInputState.signs.length)return;
 for(const g of s.halfInputState.signs){const right=g.direction===3;c.save();
  c.fillStyle='#8b6a4a';rr(c,g.x-3,g.y-40,6,40,2);c.fill();
  c.translate(g.x,g.y-52);if(!right)c.scale(-1,1);
  c.beginPath();c.moveTo(-22,-10);c.lineTo(6,-10);c.lineTo(6,-18);c.lineTo(24,0);c.lineTo(6,18);c.lineTo(6,10);c.lineTo(-22,10);c.closePath();fillStroke(c,'#ffe7a8',INK,2);c.restore();}
}
function halfInputMarks(c,s){
 const H=root.SourceHalfInputDevices;if(!H||!s.halfInputState||!s.halfInputState.enabled)return;
 s.players.forEach((p,i)=>{if(p.exit||!s.halfInputState.flags[i])return;c.save();
  c.beginPath();c.arc(p.x+p.w/2,p.y-18,7,0,Math.PI*2);fillStroke(c,'#ffd84d',INK,1.6);
  c.fillStyle=INK;c.beginPath();c.moveTo(p.x+p.w/2-3,p.y-21);c.lineTo(p.x+p.w/2+4,p.y-18);c.lineTo(p.x+p.w/2-3,p.y-15);c.closePath();c.fill();c.restore();});
}
// 15-4 / 2-3: FrontSwitch orbs (20x20 sensor), SwitchRect / SwitchIceRect /
// IceRect blocks. Hidden switch rects are not displayed (SetVisible false).
function frontSwitchArt(c,s,time){
 const S=root.SourceFrontSwitchDevices;if(!S||!s.frontSwitchState)return;const d=S.displays(s.frontSwitchState);
 const iceBlock=(r,alpha=1)=>{c.save();c.globalAlpha*=alpha;rr(c,r.x,r.y,r.w,r.h,4);fillStroke(c,'#bfe9ff',INK,2);
  c.strokeStyle='rgba(255,255,255,.9)';c.lineWidth=3;for(let x=r.x+10;x<r.x+r.w-8;x+=34){c.beginPath();c.moveTo(x,r.y+r.h-6);c.lineTo(x+12,r.y+6);c.stroke();}c.restore();};
 for(const r of d.ices)iceBlock(r);
 for(const r of d.rects){if(!r.visible)continue;if(r.ice)iceBlock(r);else{rr(c,r.x,r.y,r.w,r.h,4);fillStroke(c,'#c8a2e8',INK,2);c.fillStyle='rgba(255,255,255,.35)';rr(c,r.x+4,r.y+4,r.w-8,6,3);c.fill();}}
 for(const w of d.switches){const cx=w.x+w.w/2,cy=w.y+w.h/2;c.save();
  if(w.on){c.fillStyle='rgba(255,226,120,.35)';c.beginPath();c.arc(cx,cy,16+Math.sin(time*6)*2,0,Math.PI*2);c.fill();}
  c.beginPath();c.arc(cx,cy,10,0,Math.PI*2);fillStroke(c,w.on?'#ffd84d':'#9fb3d9',INK,2);
  c.fillStyle='rgba(255,255,255,.7)';c.beginPath();c.arc(cx-3,cy-3,3,0,Math.PI*2);c.fill();c.restore();}
}
// 12-1 GoKart: body (-34,-16,248,16) under the seats; Sticks are markers only.
function goKarts(c,s,time){
 const K=root.SourceGoKartRuntime;if(!K||!s.goKartState)return;const d=K.displays(s.goKartState);
 for(const st of d.sticks){c.save();c.fillStyle='#b98a5c';rr(c,st.x-4,st.y-60,8,60,3);fillStroke(c,'#b98a5c',INK,1.5);c.fillStyle='#ff8fb1';c.beginPath();c.moveTo(st.x+4,st.y-58);c.lineTo(st.x+30,st.y-50);c.lineTo(st.x+4,st.y-42);c.closePath();c.fill();c.restore();}
 for(const k of d.karts){if(k.dead&&!k.riding)continue;const b=k.rects[0];c.save();
  const wheel=(x)=>{c.beginPath();c.arc(x,b.y+b.h+2,11,0,Math.PI*2);fillStroke(c,'#3a3550',INK,2);c.fillStyle='#8f88a8';c.beginPath();c.arc(x,b.y+b.h+2,4,0,Math.PI*2);c.fill();};
  rr(c,b.x,b.y-6,b.w,b.h+8,8);fillStroke(c,'#ff9f6e',INK,2.2);c.fillStyle='rgba(255,255,255,.35)';rr(c,b.x+8,b.y-3,b.w-16,4,2);c.fill();
  wheel(b.x+22);wheel(b.x+b.w-22);c.restore();}
}
// 13-3 Rally: every mallet on its rail (circle 25 * malletScale) in its player's
// colour, the ball (circle 12, fading while it disappears) and the rally count
// at the controller.
function rallyArt(c,s){
 const Y=root.SourceRallyRuntime;if(!Y||!s.rallyState||!s.rallyState.controllers.length)return;const d=Y.displays(s.rallyState);
 for(const m of d.mallets){c.save();c.strokeStyle='rgba(60,50,90,.22)';c.lineWidth=8;c.lineCap='round';c.beginPath();
  c.moveTo(m.initX-m.dirX*m.halfLength,m.initY-m.dirY*m.halfLength);c.lineTo(m.initX+m.dirX*m.halfLength,m.initY+m.dirY*m.halfLength);c.stroke();c.restore();}
 for(const m of d.mallets){c.save();c.beginPath();c.arc(m.x,m.y,m.radius,0,Math.PI*2);fillStroke(c,slotColor(s,m.actorIndex),INK,2.4);
  c.fillStyle='rgba(255,255,255,.45)';c.beginPath();c.arc(m.x-m.radius*.3,m.y-m.radius*.3,m.radius*.32,0,Math.PI*2);c.fill();c.restore();}
 for(const b of d.balls){c.save();c.globalAlpha=b.fade;c.beginPath();c.arc(b.x,b.y,b.radius,0,Math.PI*2);fillStroke(c,'#fff4c2',INK,2);c.restore();}
 if(d.counter)label(c,d.counter.count+' / '+d.counter.max,d.counter.x,d.counter.y,d.counter.cleared?'#ffd84d':'#fffdf6',30);
}
// 13-4 Fake: every body is drawn as a friend in one plain look; a revealed body
// turns into its player's colours over the fade (fakeLevel 1 -> 0). The cage is
// FakeCage's frame (.cctor 0x18183c8c0: top/bottom 78x6, sides 10x72) with bars,
// each cursor a ring in its player's colour on the selected cage.
const FAKE_LOOK={body:'#ece8f4',dark:'#6f6a86',light:'#ffffff',acc:null};
function fakeArt(c,s,time){
 const K=root.SourceFakeRuntime,P=root.ParkArt;if(!K||!s.fakeState||!s.fakeState.timer)return;const d=K.displays(s.fakeState);
 for(const f of d.fakes){if(!f.visible||!P||!P.drawFriend)continue;
  let pal=FAKE_LOOK;if(f.revealed&&f.playerIndex>=0){const F=P.FRIENDS[f.playerIndex%8],k=1-f.fakeLevel;pal={body:P.mix(FAKE_LOOK.body,F.body,k),dark:P.mix(FAKE_LOOK.dark,F.dark,k),light:P.mix(FAKE_LOOK.light,F.light,k),acc:k>.5?F.acc:null};}
  P.drawFriend(c,{id:f.id,x:f.rect.x,y:f.rect.y,w:f.rect.w,h:f.rect.h,vx:f.anim===2||f.anim===3?(f.facingLeft?-3:3):0,vy:f.anim===4?-1:0,grounded:f.anim!==4},f.playerIndex>=0?f.playerIndex:0,{time,palette:pal});}
 for(const g of d.cages){c.save();c.globalAlpha*=g.fade;
  c.strokeStyle='rgba(70,60,95,.85)';c.lineWidth=3;for(let x=g.x-27;x<=g.x+27;x+=13.5){c.beginPath();c.moveTo(x,g.y-34);c.lineTo(x,g.y+34);c.stroke();}
  for(const [h,w,x,y] of [[6,78,-39,-40],[6,78,-39,34],[72,10,-40,-36],[72,10,30,-36]]){rr(c,g.x+x,g.y+y,w,h,2);fillStroke(c,'#8d84ad',INK,1.5);}
  c.restore();}
 for(const u of d.cursors){const col=FRIEND_COLORS[u.colorIndex%8],a=u.count>1?u.order/u.count*Math.PI*2+time*2:0,ox=u.count>1?Math.cos(a)*10:0,oy=u.count>1?Math.sin(a)*10:0;
  c.save();c.lineWidth=5;c.strokeStyle=col;c.beginPath();c.arc(u.x+ox,u.y+oy,44,0,Math.PI*2);c.stroke();
  c.lineWidth=1.5;c.strokeStyle=INK;c.stroke();
  if(u.answer){label(c,u.answer===1?'○':'×',u.x,u.y-54,u.answer===1?'#7be08f':'#ff7a7a',26);}
  c.restore();}
}
function fakeOverlay(c,s,view){
 const K=root.SourceFakeRuntime;if(!K||!s.fakeState||!s.fakeState.timer)return;const d=K.displays(s.fakeState);
 if(d.timer&&d.timer.phase<=4)label(c,String(d.timer.seconds),view.width/2,64,'#fffdf6',56);
 if(d.notice){const k=Math.min(1,d.notice.t),x=view.width*(1.2-1.4*k);label(c,'WHO ARE YOU?',Math.max(view.width/2,x),view.height/2,'#ffd84d',64);}
}
// 8-1 / 8-3 Apple: hanging apples sway (rect 24x24), bombs alternate with them, a
// shot apple spins as it falls; the blast is a growing ring (to 250 px). The
// crosshair is a ring (circle 16) in its player's colour; each BasketPlayer carries
// a basket (44x26) on its head.
function appleArt(c,s,time){
 const A=root.SourceAppleRuntime;if(!A||!s.appleState||!s.appleState.controller)return;const d=A.displays(s.appleState),k=(s.appleState.scaleRaw||F)/F;// stage scale
 for(const a of d.apples){c.save();c.translate(a.x,a.y);c.rotate(a.angle*Math.PI/180);c.scale(k,k);
  if(a.bomb){c.beginPath();c.arc(0,1,11,0,Math.PI*2);fillStroke(c,'#3b3550',INK,2);c.strokeStyle='#c8a26a';c.lineWidth=2;c.beginPath();c.moveTo(4,-8);c.quadraticCurveTo(8,-14,12,-12);c.stroke();
   c.fillStyle=(Math.floor(time*8)%2)?'#ffd84d':'#ff7a3d';c.beginPath();c.arc(12,-12,2.5,0,Math.PI*2);c.fill();}
  else{c.beginPath();c.arc(0,1,11,0,Math.PI*2);fillStroke(c,'#ff6b6b',INK,2);c.fillStyle='rgba(255,255,255,.5)';c.beginPath();c.arc(-4,-3,3,0,Math.PI*2);c.fill();
   c.fillStyle='#6dbf5b';c.beginPath();c.ellipse(4,-10,5,2.5,-.5,0,Math.PI*2);c.fill();}
  c.restore();}
 for(const b of d.blasts){c.save();c.globalAlpha=Math.max(0,1-b.r/250);c.strokeStyle='#ffb04d';c.lineWidth=6;c.beginPath();c.arc(b.x,b.y,Math.max(1,b.r),0,Math.PI*2);c.stroke();c.restore();}
 for(const bk of d.baskets){c.save();c.translate(bk.x,bk.y);c.scale(k,k);rr(c,-22,-30,44,26,6);fillStroke(c,'#c98d52',INK,2);c.strokeStyle='rgba(90,55,30,.6)';c.lineWidth=1.5;
  for(let x=-14;x<=14;x+=7){c.beginPath();c.moveTo(x,-28);c.lineTo(x,-6);c.stroke();}if(bk.count)label(c,String(bk.count),0,-40,'#fffdf6',14);c.restore();}
 for(const t of d.targets){const col=slotColor(s,t.playerIndex);c.save();c.globalAlpha=t.cooling?.55:1;c.translate(t.x,t.y);c.scale(k,k);c.lineWidth=4;c.strokeStyle=col;c.beginPath();c.arc(0,0,16,0,Math.PI*2);c.stroke();
  c.lineWidth=2;c.strokeStyle=INK;c.beginPath();c.moveTo(-24,0);c.lineTo(-8,0);c.moveTo(8,0);c.lineTo(24,0);c.moveTo(0,-24);c.lineTo(0,-8);c.moveTo(0,8);c.lineTo(0,24);c.stroke();c.restore();}
}
function appleOverlay(c,s,view){const A=root.SourceAppleRuntime;if(!A||!s.appleState||!s.appleState.controller)return;const d=A.displays(s.appleState);
 if(d.counter)label(c,'🍎 '+d.counter.caught+' / '+d.counter.needed,view.width/2,40,'#fffdf6',30);}
// 3-4 Arrangement: the picture on the left half is the shown DummyPlayers (player
// rect 32x46, in their player's colours, facing slot 1) and DummyColorBoxes; the
// curtain (startFade, 1/15 s) covers the left half while the friends arrange, and
// each result is a circle or a cross over its dummy.
function arrangeArt(c,s,time){
 const A=root.SourceArrangementRuntime,P=root.ParkArt;if(!A||!s.arrangeState||!s.arrangeState.arrangement)return;const d=A.displays(s.arrangeState);
 for(const g of d.goals){c.save();c.globalAlpha=.55;rr(c,g.x-24,g.y-72,48,72,6);fillStroke(c,'#fffdf6',INK,2);c.restore();}
 for(const b of d.boxes){const col=FRIEND_COLORS[b.colorIndex%8];rr(c,b.x,b.y,b.w,b.h,6);fillStroke(c,col,INK,2);c.strokeStyle='rgba(255,255,255,.5)';c.lineWidth=2;rr(c,b.x+5,b.y+5,b.w-10,b.h-10,4);c.stroke();}
 if(P&&P.drawFriend)for(const u of d.dummies)P.drawFriend(c,{id:'dummy:'+u.id,x:u.x-16,y:u.y-47,w:32,h:46,vx:u.facingLeft?-.8:.8,vy:0,grounded:true,lookingRight:!u.facingLeft},u.colorIndex,{time});
 if(d.curtain&&d.curtain.value>0){const w=d.curtain.right-d.curtain.left,h=s.map.height;c.save();c.globalAlpha=d.curtain.value;
  c.fillStyle='#463c5f';c.fillRect(0,0,d.curtain.right-24,h);c.strokeStyle='rgba(255,255,255,.12)';c.lineWidth=10;
  for(let x=24;x<d.curtain.right-24;x+=48){c.beginPath();c.moveTo(x,0);c.lineTo(x,h);c.stroke();}
  label(c,'?',(d.curtain.right-24)/2,h/2,'#fffdf6',Math.min(160,w/4));c.restore();}
 for(const r of d.results){const u=d.dummies.find(q=>q.id===r.id),b=d.boxes.find(q=>q.id===r.id),x=u?u.x:b.x+b.w/2,y=u?u.y-70:b.y-18;
  label(c,r.ok?'○':'×',x,y,r.ok?'#7be08f':'#ff7a7a',34);}
}
function arrangeOverlay(c,s,view){const A=root.SourceArrangementRuntime;if(!A||!s.arrangeState||!s.arrangeState.arrangement)return;const d=A.displays(s.arrangeState);
 if(d.timer)label(c,(d.timer.phase===1?'잘 보세요 ':'똑같이 서세요 ')+d.timer.seconds,view.width/2,48,d.timer.seconds<=10?'#ffd84d':'#fffdf6',36);
 if(d.notice){const k=Math.min(1,d.notice.t),x=view.width*(1.2-1.4*k);label(c,d.notice.type,Math.max(view.width/2,x),view.height/2,'#ffd84d',72);}}
// 14-4 Giant: the body covers collision 0 (222x328) and floats; its hand is the
// circle collision (r 48) that flies at a player; each PlayerPunch is a glove in its
// player's colour while the punch plays; the life text sits 16 px under the body top.
function giantArt(c,s,time){
 const G=root.SourceGiantRuntime;if(!G||!s.giantState||!s.giantState.giants.length&&!s.giantState.punches.length)return;const d=G.displays(s.giantState);
 for(const g of d.giants){const b=g.rects[0],dir=g.lookLeft?-1:1;c.save();
  if(g.dead)c.globalAlpha*=Math.max(.2,(Math.floor(time*12)%2)?.45:.85);else if(g.anim===2&&Math.floor(time*20)%2)c.globalAlpha*=.7;
  rr(c,b.x,b.y,b.w,b.h,48);fillStroke(c,'#9a8fc4',INK,3);
  rr(c,b.x+18,b.y+b.h*.55,b.w-36,b.h*.4,36);fillStroke(c,'#b7aedb',null);
  const ex=b.x+b.w/2+dir*30,ey=b.y+90;for(const k of [-1,1]){c.beginPath();c.ellipse(ex+k*26,ey,7,11,0,0,Math.PI*2);fillStroke(c,INK,null);}
  c.fillStyle='rgba(255,140,170,.45)';for(const k of [-1,1]){c.beginPath();c.ellipse(ex+k*44,ey+22,10,6,0,0,Math.PI*2);c.fill();}
  c.strokeStyle=INK;c.lineWidth=3;c.beginPath();if(g.dead){c.moveTo(ex-8,ey+30);c.lineTo(ex+8,ey+30);}else c.arc(ex,ey+26,8,.15*Math.PI,.85*Math.PI);c.stroke();
  c.restore();}
 for(const h of d.hands){const q=h.circle;c.save();c.translate(q.x,q.y);c.rotate((h.lookLeft?Math.PI:0)+h.rotation*Math.PI/180);
  c.beginPath();c.arc(0,0,q.r-4,0,Math.PI*2);fillStroke(c,h.attacking?'#8a7fb8':'#9a8fc4',INK,3);
  c.strokeStyle='rgba(42,33,64,.55)';c.lineWidth=2.5;for(const y of [-18,-6,6,18]){c.beginPath();c.moveTo(20,y);c.lineTo(36,y);c.stroke();}
  c.restore();}
 for(const p of d.punches){if(!p.attacking)continue;const r=p.rect,col=slotColor(s,p.actorIndex);c.save();
  c.beginPath();c.arc(r.x+r.w/2,r.y+r.h/2,p.hit?14:11,0,Math.PI*2);fillStroke(c,col,INK,2);c.restore();}
}
function giantOverlayWorld(c,s){const G=root.SourceGiantRuntime;if(!G||!s.giantState||!s.giantState.giants.length)return;
 for(const g of G.displays(s.giantState).giants)if(g.life)label(c,g.life.text,g.life.x,g.life.y,'#fffdf6',30);}
// 14-2 Moles: each nest is a hole facing its direction; a mole fills its collision rect
// (scaled with the actor), the life text sits 32 px above it.
function moleArt(c,s,time){
 const M=root.SourceMoleRuntime;if(!M||!s.moleState||!s.moleState.moles.length)return;const d=M.displays(s.moleState);
 const rot=[0,Math.PI,-Math.PI/2,Math.PI/2];
 for(const n of d.nests){c.save();c.translate(n.x,n.y);c.rotate(rot[n.dir]||0);c.beginPath();c.ellipse(0,0,30,9,0,0,Math.PI*2);fillStroke(c,'#5b4636',INK,2);
  c.beginPath();c.ellipse(0,1,22,5,0,0,Math.PI*2);fillStroke(c,'#2b2030',null);c.restore();}
 for(const m of d.moles){const r=m.rect;c.save();rr(c,r.x,r.y,r.w,r.h,Math.min(r.w,r.h)/2.2);
  fillStroke(c,m.anim===4?'#b9a493':(m.anim===2||m.anim===3)&&Math.floor(time*20)%2?'#e0c4ad':'#b98a68',INK,2);
  const cx=r.x+r.w/2,cy=r.y+r.h/2,k=Math.min(r.w,r.h)/36;
  if(m.anim===4){c.strokeStyle=INK;c.lineWidth=2*k;for(const sx of [-1,1]){c.beginPath();c.moveTo(cx+sx*7*k-3*k,cy-5*k);c.lineTo(cx+sx*7*k+3*k,cy+k);c.moveTo(cx+sx*7*k+3*k,cy-5*k);c.lineTo(cx+sx*7*k-3*k,cy+k);c.stroke();}}
  else for(const sx of [-1,1]){c.beginPath();c.ellipse(cx+sx*7*k,cy-2*k,2*k,3*k,0,0,Math.PI*2);fillStroke(c,INK,null);}
  c.beginPath();c.ellipse(cx,cy+5*k,5*k,3.5*k,0,0,Math.PI*2);fillStroke(c,'#ff9db0',INK,1.5*k);
  c.restore();}
}
function moleOverlayWorld(c,s){const M=root.SourceMoleRuntime;if(!M||!s.moleState||!s.moleState.moles.length)return;
 for(const m of M.displays(s.moleState).moles)if(m.life)label(c,m.life.text,m.life.x,m.life.y,'#fffdf6',22);}
// 8-2 / 8-4 Cannons: each player carries a cannon (44x24 box) whose barrel points
// -90 - angle; a power bar while charging and the loaded ball count above it. Baskets
// stand on a pole of height * 16; cannon balls are circles 8 in the shooter's colour.
function throwArt(c,s,time){
 const T=root.SourceThrowBallRuntime;if(!T||!s.throwState||!s.throwState.controller)return;const d=T.displays(s.throwState);
 for(const b of d.baskets){c.save();c.strokeStyle='#8a7a6a';c.lineWidth=5;c.beginPath();c.moveTo(b.x,b.y);c.lineTo(b.x,b.body.y+b.body.h);c.stroke();
  const r=b.body;c.beginPath();c.moveTo(r.x,r.y);c.lineTo(r.x+r.w*0.12,r.y+r.h);c.lineTo(r.x+r.w*0.88,r.y+r.h);c.lineTo(r.x+r.w,r.y);c.closePath();fillStroke(c,'#e9b46f',INK,2.5);
  c.strokeStyle='rgba(120,70,30,.45)';c.lineWidth=1.5;for(let k=1;k<4;k++){const x=r.x+r.w*k/4;c.beginPath();c.moveTo(x,r.y+2);c.lineTo(x-(k-2)*3,r.y+r.h-2);c.stroke();}
  rr(c,b.mouth.x-6,b.mouth.y-3,b.mouth.w+12,6,3);fillStroke(c,'#c98d52',INK,2);
  label(c,b.score+' / '+b.target,b.x,r.y-18,b.score>=b.target?'#ffd84d':'#fffdf6',18);c.restore();}
 for(const q of d.cannons){const col=slotColor(s,q.playerIndex);c.save();c.translate(q.x,q.y);
  c.save();c.rotate(-q.angle*Math.PI/180);rr(c,-7,-30,14,24,4);fillStroke(c,'#5a5470',INK,2);c.restore();
  rr(c,-16,-12,32,14,6);fillStroke(c,col,INK,2);
  if(q.balls)label(c,'●'+q.balls,0,-40,'#fffdf6',13);
  if(q.charging){rr(c,-20,8,40,6,3);fillStroke(c,'rgba(0,0,0,.35)',null);rr(c,-20,8,40*q.power,6,3);fillStroke(c,'#ffd84d',null);}
  c.restore();}
 for(const b of d.shots){c.save();c.globalAlpha=b.fading?.45:1;c.beginPath();c.arc(b.x,b.y,b.r,0,Math.PI*2);fillStroke(c,FRIEND_COLORS[b.colorIndex%8],INK,2);c.restore();}
 for(const b of d.drops){c.save();c.globalAlpha=b.fading?.45:1;c.beginPath();c.arc(b.x,b.y,b.r,0,Math.PI*2);
  if(b.bomb){fillStroke(c,'#3b3550',INK,2);c.fillStyle=(Math.floor(time*8)%2)?'#ffd84d':'#ff7a3d';c.beginPath();c.arc(b.x+5,b.y-8,2.2,0,Math.PI*2);c.fill();}
  else fillStroke(c,'#fff4c2',INK,2);c.restore();}
 for(const b of d.blasts){c.save();c.globalAlpha=Math.max(0,1-b.t);c.strokeStyle='#ffb04d';c.lineWidth=5;c.beginPath();c.arc(b.x,b.y,8+40*b.t,0,Math.PI*2);c.stroke();c.restore();}
}
// 6-3 PlaneObstacle: walls (DamageRect pieces glow, Rect pieces are plain stone) and the
// colour blocks each player has to shoot open (chip 0x1e + colour, a number when
// isShowBreakColorNumber is set).
function planeObstacleArt(c,s){const O=root.SourcePlaneObstacleRuntime;if(!O||!s.planeObstacleState||!s.planeObstacleState.obstacles.length)return;const d=O.displays(s.planeObstacleState);
 for(const w of d.walls){c.save();rr(c,w.x,w.y,w.w,w.h,6);fillStroke(c,w.type==='DamageRect'?'#f07a8a':'#8f86a8',INK,2.5);
  if(w.type==='DamageRect'){c.strokeStyle='rgba(255,255,255,.35)';c.lineWidth=6;for(let x=w.x-w.h;x<w.x+w.w;x+=28){c.beginPath();c.moveTo(Math.max(w.x,x),Math.max(w.y,w.y+(w.x-x)));c.lineTo(Math.min(w.x+w.w,x+w.h),Math.min(w.y+w.h,w.y+w.h+(w.x+w.w-x-w.h)));c.stroke();}}
  c.restore();}
 for(const b of d.chips){const x=b.gx*48,y=b.gy*48,col=FRIEND_COLORS[b.colorIndex%8];rr(c,x+2,y+2,44,44,7);fillStroke(c,col,INK,2);
  c.strokeStyle='rgba(255,255,255,.55)';c.lineWidth=2;rr(c,x+8,y+8,32,32,5);c.stroke();label(c,String(b.colorIndex+1),x+24,y+24,'#fffdf6',18);}
}
// Shooting rounds: player gun bullets (circle 7) in the shooter's colour.
function planeArt(c,s,time){const P=root.SourcePlaneRuntime;if(!P||!s.planeState||!s.planeState.guns.length)return;
 for(const b of P.displays(s.planeState).bullets){c.save();c.globalAlpha=b.fading?.4:1;c.beginPath();c.ellipse(b.x,b.y,b.r+3,b.r-2,0,0,Math.PI*2);fillStroke(c,FRIEND_COLORS[(b.colorIndex||0)%8],INK,1.5);c.restore();}}
// 6-1 / 6-2 ShootingEnemy (48x48, facing left), its blast (0.5 s), the enemy bullets
// (10x10) and the BreakColor blocks MapBlockReplacer / MapBreakBlockRect painted.
function shootingArt(c,s,time){const S=root.SourceShootingRuntime;const st=s.shootingState;if(!S||!st||!(st.spawners.length||st.replacer||st.breakRects.length||st.pool))return;const d=S.displays(st);
 for(const b of d.chips){const x=b.gx*48,y=b.gy*48,col=FRIEND_COLORS[b.colorIndex%8];rr(c,x+2,y+2,44,44,7);fillStroke(c,col,INK,2);
  c.strokeStyle='rgba(255,255,255,.55)';c.lineWidth=2;rr(c,x+8,y+8,32,32,5);c.stroke();label(c,String(b.colorIndex+1),x+24,y+24,'#fffdf6',18);}
 for(const e of d.enemies){c.save();c.translate(e.x,e.y);
  if(e.blast){c.globalAlpha=Math.max(0,1-e.t);c.strokeStyle='#ffb04d';c.lineWidth=6;c.beginPath();c.arc(0,0,10+30*e.t,0,Math.PI*2);c.stroke();
   c.fillStyle='#ffe07a';for(let k=0;k<6;k++){const a=k*Math.PI/3+e.t*2;c.beginPath();c.arc(Math.cos(a)*(8+26*e.t),Math.sin(a)*(8+26*e.t),4*(1-e.t)+1,0,Math.PI*2);c.fill();}c.restore();continue;}
  const body=e.blink&&Math.floor(time*30)%2?'#fffdf6':'#8a7bb8';
  c.beginPath();c.moveTo(6,-4);c.lineTo(22,-16);c.lineTo(20,-2);c.closePath();fillStroke(c,'#6c5f99',INK,2);
  c.beginPath();c.moveTo(6,4);c.lineTo(22,16);c.lineTo(20,2);c.closePath();fillStroke(c,'#6c5f99',INK,2);
  c.beginPath();c.ellipse(0,0,20,15,0,0,Math.PI*2);fillStroke(c,body,INK,2.5);
  for(const sy of [-1,1]){c.beginPath();c.ellipse(-8,sy*4-1,2.2,3,0,0,Math.PI*2);fillStroke(c,INK,null);}
  c.strokeStyle=INK;c.lineWidth=2;c.beginPath();c.moveTo(-13,-9);c.lineTo(-5,-6);c.stroke();
  c.restore();}
 for(const b of d.bullets){c.save();c.globalAlpha=b.fading?.4:1;c.beginPath();c.arc(b.x,b.y,b.r,0,Math.PI*2);
  fillStroke(c,b.color?`rgb(${b.color[0]},${b.color[1]},${b.color[2]})`:'#e2557a',INK,b.color?Math.max(1,b.r/5):1.5);
  c.fillStyle='rgba(255,255,255,.7)';c.beginPath();c.arc(b.x-b.r*.3,b.y-b.r*.3,Math.max(1,b.r*.3),0,Math.PI*2);c.fill();c.restore();}
}
// 11-1 / 11-3: the four DanmakuThunder beams, the Locator's core, the shared HP (hearts)
// and the seconds left (DanmakuObserverView is not analysed: placed at the top centre).
function danmakuArt(c,s,time){const D=root.SourceDanmakuRuntime;if(!D||!s.danmakuState||!s.danmakuState.observer)return;const d=D.displays(s.danmakuState);
 for(const b of s.danmakuBeams||[]){c.save();c.globalAlpha=.85;c.fillStyle='#fff6a8';c.fillRect(b.x-1,b.y-1,b.w+2,b.h+2);
  c.strokeStyle='#ffd84d';c.lineWidth=2;c.beginPath();const horiz=b.w>b.h,len=horiz?b.w:b.h;
  for(let k=0;k<=len;k+=12){const j=((k/12+Math.floor(time*20))%2?5:-5);if(horiz){const x=b.x+k;k?c.lineTo(x,b.y+2+j):c.moveTo(x,b.y+2+j);}else{const y=b.y+k;k?c.lineTo(b.x+2+j,y):c.moveTo(b.x+2+j,y);}}c.stroke();c.restore();}
 const L=d.locators[0];if(L&&d.state<4){c.save();c.translate(L.x,L.y);c.rotate(time*1.5);for(let k=0;k<6;k++){c.rotate(Math.PI/3);rr(c,-4,-26,8,14,4);fillStroke(c,'#ffb3c7',INK,1.5);}
  c.beginPath();c.arc(0,0,14,0,Math.PI*2);fillStroke(c,'#fff0f5',INK,2.5);c.restore();}
 const cx=(s.map.width||0)/2,top=150;
 for(let k=0;k<d.hpMax;k++){const x=cx-(d.hpMax-1)*20+k*40,full=k<d.hp;c.save();c.translate(x,top);c.beginPath();c.moveTo(0,8);c.bezierCurveTo(-18,-4,-10,-18,0,-8);c.bezierCurveTo(10,-18,18,-4,0,8);
  fillStroke(c,full?'#ff7a98':'rgba(255,255,255,.25)',INK,2);c.restore();}
 if(d.state<4)label(c,d.warmUp?'준비 '+d.seconds:String(d.seconds),cx,top+36,'#fffdf6',d.warmUp?22:26);
}
// 6-4 / 15-3 bosses: the hull is the body rects, closed hatches are armour plates, open cores
// glow; missiles (192 x 48, tip at x - 192), PlayerGuard bars, ShootingSuperApples and a barrier
// bubble on a plane with more than 2 lives. The HP bar (UI prefab) sits over each boss.
function bossArt(c,s,time){const Bo=root.SourceBossRuntime;const st=s.bossState;if(!Bo||!st||!(st.bosses.length||st.guards.length||st.apples.length))return;const d=Bo.displays(st);
 for(const a of d.apples){c.save();c.translate(a.x,a.y);c.globalAlpha=a.eaten?.4:1;const k=a.r/24;c.scale(k,k);
  c.beginPath();c.arc(0,2,20,0,Math.PI*2);fillStroke(c,'#ff6b6b',INK,2.5);c.fillStyle='rgba(255,255,255,.55)';c.beginPath();c.arc(-7,-5,5,0,Math.PI*2);c.fill();
  c.fillStyle='#6dbf5b';c.beginPath();c.ellipse(7,-18,7,3.5,-.5,0,Math.PI*2);c.fill();c.strokeStyle='#ffd84d';c.lineWidth=2;
  for(let i=0;i<4;i++){const an=time*2+i*Math.PI/2;c.beginPath();c.moveTo(Math.cos(an)*26,Math.sin(an)*26);c.lineTo(Math.cos(an)*31,Math.sin(an)*31);c.stroke();}c.restore();}
 for(const b of d.bosses){const sh=b.parts,flash=b.blink&&Math.floor(time*30)%2;c.save();c.translate(b.x,b.y);
  const hull=b.kind==='boss'?'#8a7bb8':'#6f9bd1',plate=b.kind==='boss'?'#5d5189':'#4a6f9e';
  for(const r of sh.body){rr(c,r.x/F,r.y/F,r.w/F,r.h/F,8);fillStroke(c,flash?'#fffdf6':hull,INK,2.5);}
  sh.cores.forEach((r,k)=>{if(!b.cores[k])return;const cx=(r.x+r.w/2)/F,cy=(r.y+r.h/2)/F;c.beginPath();c.arc(cx,cy,r.w/F/2,0,Math.PI*2);fillStroke(c,Math.floor(time*6)%2?'#ff9db0':'#ff6f91',INK,2.5);
   c.fillStyle='rgba(255,255,255,.7)';c.beginPath();c.arc(cx-8,cy-8,6,0,Math.PI*2);c.fill();});
  sh.hatches.forEach((r,k)=>{if(!b.hatches[k])return;rr(c,r.x/F,r.y/F,r.w/F,r.h/F,6);fillStroke(c,flash?'#fffdf6':plate,INK,2.5);
   c.strokeStyle='rgba(255,255,255,.25)';c.lineWidth=2;for(let x=r.x/F+12;x<(r.x+r.w)/F-6;x+=18){c.beginPath();c.moveTo(x,r.y/F+5);c.lineTo(x,(r.y+r.h)/F-5);c.stroke();}});
  // bean eyes on the bridge
  const ex=b.kind==='boss'?-60:60;for(const sy of [-1,1]){c.beginPath();c.ellipse(ex+sy*10,-82,3,4.5,0,0,Math.PI*2);fillStroke(c,INK,null);}
  if(b.dying){c.globalAlpha=.6;c.fillStyle='#ffb04d';for(let i=0;i<5;i++){const an=time*9+i*1.3;c.beginPath();c.arc(Math.cos(an)*90,Math.sin(an*1.3)*140,10+6*Math.sin(time*20+i),0,Math.PI*2);c.fill();}c.globalAlpha=1;}
  // HP bar over the boss
  const w=180,y0=-300;rr(c,-w/2,y0,w,14,7);fillStroke(c,'rgba(40,30,60,.55)',INK,2);rr(c,-w/2+2,y0+2,(w-4)*Math.max(0,b.hp)/b.hpMax,10,5);fillStroke(c,'#ff7a98',null);
  c.restore();}
 for(const m of d.missiles){c.save();c.translate(m.x,m.y);
  if(m.exploding){c.globalAlpha=Math.max(0,1-m.t);c.strokeStyle='#ffb04d';c.lineWidth=6;c.beginPath();c.arc(-96,0,16+50*m.t,0,Math.PI*2);c.stroke();c.restore();continue;}
  c.beginPath();c.moveTo(-192,0);c.quadraticCurveTo(-170,-18,-140,-16);c.lineTo(-12,-16);c.lineTo(-12,16);c.lineTo(-140,16);c.quadraticCurveTo(-170,18,-192,0);c.closePath();fillStroke(c,'#e9e3f5',INK,2.5);
  c.beginPath();c.moveTo(-40,-16);c.lineTo(-8,-26);c.lineTo(-4,-16);c.closePath();fillStroke(c,'#ff7a98',INK,2);c.beginPath();c.moveTo(-40,16);c.lineTo(-8,26);c.lineTo(-4,16);c.closePath();fillStroke(c,'#ff7a98',INK,2);
  c.fillStyle=Math.floor(time*20)%2?'#ffd84d':'#ffb04d';c.beginPath();c.ellipse(4,0,10,7,0,0,Math.PI*2);c.fill();c.restore();}
 const players=s.players.map((p,i)=>({index:i,xRaw:Math.round((p.x+p.w/2)*F),yRaw:Math.round((p.y+p.h+1)*F),visible:!p.exit,lookingRight:!p.facingLeft}));
 for(const [i,r] of Object.entries(Bo.guardRects(st,players))){c.save();rr(c,r.x/F-2,r.y/F,r.w/F+4,r.h/F,4);fillStroke(c,'#9fd7ff',INK,2);c.strokeStyle='rgba(255,255,255,.7)';c.lineWidth=2;c.beginPath();c.moveTo(r.x/F+r.w/F/2,r.y/F+8);c.lineTo(r.x/F+r.w/F/2,r.y/F+r.h/F-8);c.stroke();c.restore();}
 for(const p of s.players){const L=p.plane&&p.plane.life;if(!L||!L.barrier||L.life<=2||p.exit)continue;c.save();c.globalAlpha=.35+.15*Math.sin(time*6);c.beginPath();c.arc(p.x+p.w/2,p.y+p.h/2,38,0,Math.PI*2);fillStroke(c,'#bfefff','#5fb8e8',3);c.restore();}
}
// 13-2 graphs (UI prefabs; sizes are named approximations): a bar graph has three bars
// [left, right, jump] of levelMax cells (cell = 288 / max(6, levelMax)); a circle graph
// is a clockwise pie [jump, right, left] from the top. The number of rounds left sits
// at UIPlayersPos, the hint (left, right, jump goal) at UINumbersPos.
const GRAPH_COLORS=['#7fb2ff','#ffb067','#86d98f'];
function graphIcon(c,k,x,y,s){c.save();c.translate(x,y);c.scale(s,s);c.strokeStyle=INK;c.fillStyle=GRAPH_COLORS[k];c.lineWidth=2.5;c.beginPath();
 if(k===0){c.moveTo(9,-8);c.lineTo(-9,0);c.lineTo(9,8);c.closePath();}else if(k===1){c.moveTo(-9,-8);c.lineTo(9,0);c.lineTo(-9,8);c.closePath();}else{c.moveTo(-9,7);c.lineTo(0,-9);c.lineTo(9,7);c.closePath();}
 c.fill();c.stroke();c.restore();}
function graphArt(c,s){const G=root.SourceGraphRuntime;if(!G||!s.graphState||!s.graphState.gc)return;const d=G.displays(s.graphState);
 for(const g of d.graphs){c.save();c.translate(g.x,g.y);c.scale(g.scale,g.scale);
  if(g.kind==='bar'){const max=Math.max(6,g.levelMax),cell=288/max,bw=44,gap=18,x0=-(3*bw+2*gap)/2;
   rr(c,x0-16,-300,3*bw+2*gap+32,336,14);fillStroke(c,g.target?'rgba(255,253,246,.9)':'rgba(255,253,246,.75)',INK,2.5);
   for(let k=0;k<3;k++){const bx=x0+k*(bw+gap);
    for(let i=0;i<g.levelMax;i++){const y=-12-(i+1)*cell;rr(c,bx,y+2,bw,cell-4,5);fillStroke(c,i<g.levels[k]?GRAPH_COLORS[k]:'rgba(60,50,80,.08)',i<g.levels[k]?INK:'rgba(60,50,80,.18)',1.5);}
    graphIcon(c,k,bx+bw/2,16,1);}
   if(g.target){label(c,'★',0,-318,'#ffd84d',24);}}
  else{const r=118;c.beginPath();c.arc(0,0,r+8,0,Math.PI*2);fillStroke(c,'rgba(255,253,246,.9)',INK,2.5);
   let a=-Math.PI/2;const order=[2,1,0];// pie slices [jump, right, left]
   for(let k=0;k<3;k++){const p=g.percents[k];if(p<=0)continue;c.beginPath();c.moveTo(0,0);c.arc(0,0,r,a,a+p*Math.PI*2);c.closePath();fillStroke(c,GRAPH_COLORS[order[k]],INK,2);
    const m=a+p*Math.PI;if(p>0.06)graphIcon(c,order[k],Math.cos(m)*r*0.6,Math.sin(m)*r*0.6,1.1);a+=p*Math.PI*2;}
   if(g.percents.every(p=>p<=0)){c.beginPath();c.arc(0,0,r,0,Math.PI*2);fillStroke(c,'rgba(60,50,80,.08)',null);}
   if(g.target)label(c,'★',0,-r-26,'#ffd84d',24);}
  c.restore();}
 if(d.remaining>0&&d.remainingAt)label(c,String(d.remaining),d.remainingAt.x,d.remainingAt.y+40,'#fffdf6',44*d.uiScale);
 if(d.hint){const h=d.hint;for(let k=0;k<3;k++){graphIcon(c,k,h.at.x-60+k*60,h.at.y+24,1);label(c,String(h.values[k]),h.at.x-60+k*60,h.at.y+56,'#fffdf6',24);}}
}
// World pass, drawn after the terrain and before the friends.
function draw(c,s,opts={}){if(!s)return;const time=opts.time??(performance.now()/1000);
 c.save();
 try{topViewFloor(c,s);frontSwitchArt(c,s,time);arrowSigns(c,s);capturingRope(c,s);capturingTargets(c,s,time);ghosts(c,s,time);moveWalls(c,s);rollGears(c,s);breakables(c,s);colorBoxes(c,s);deadSwitches(c,s);magnets(c,s,time);searchLights(c,s);batLights(c,s);gears(c,s);upDownLifts(c,s);warpGuns(c,s);linePaths(c,s,time);lifts(c,s);poles(c,s);winds(c,s,time);speedSwitches(c,s);countUps(c,s);landmines(c,s);balls(c,s);dossuns(c,s);enemies(c,s,time);stepEnemies(c,s,time);goKarts(c,s,time);rallyArt(c,s);fakeArt(c,s,time);appleArt(c,s,time);arrangeArt(c,s,time);giantArt(c,s,time);moleArt(c,s,time);throwArt(c,s,time);planeObstacleArt(c,s);shootingArt(c,s,time);bossArt(c,s,time);danmakuArt(c,s,time);graphArt(c,s);planeArt(c,s,time);}
 finally{c.restore();}
}
// World pass after the friends (labels that must sit on top of them).
function drawAbove(c,s){if(!s)return;const time=performance.now()/1000;c.save();try{giantOverlayWorld(c,s);moleOverlayWorld(c,s);cardboards(c,s);bats(c,s,time);fallingCages(c,s);halfInputMarks(c,s);blackoutLabels(c,s);}finally{c.restore();}}
// Screen pass: the blackout darkness covers the whole view.
function overlay(c,s,view){
 if(s){capturingCounter(c,s,view);fakeOverlay(c,s,view);appleOverlay(c,s,view);arrangeOverlay(c,s,view);}
 const B=root.SourceBlackoutDevices;if(!B||!s||!s.blackoutState||!s.blackoutState.blackouts.length)return;
 for(const b of B.displays(s.blackoutState).blackouts){const a=Math.max(0,Math.min(1,b.alpha*(b.darknessRaw/F)));
  if(a>0){c.fillStyle='rgba(0,0,0,'+a+')';c.fillRect(0,0,view.width,view.height);}}
}

root.SourceDeviceArt={draw,drawAbove,overlay};
})(typeof window!=='undefined'?window:globalThis);
