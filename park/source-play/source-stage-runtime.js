/* Interpreted original world01-01. No native code, source assets or file IO. */
(function(root,factory){
 const common=typeof module==='object'&&module.exports;
 const api=factory(common?require('./terrain-runtime.js'):root.SourceTerrainRuntime,
  common?require('./actor-runtime.js'):root.SourceActorRuntime,
  common?require('./spring-switch-runtime.js'):root.SourceSpringSwitch,
  common?require('./source-devices-runtime.js'):root.SourceDevicesRuntime,
  common?require('./source-motion-devices.js'):root.SourceMotionDevices,
  common?require('./source-gate-devices.js'):root.SourceGateDevices,
  common?require('./source-bridge-devices.js'):root.SourceBridgeDevices,
  common?require('./source-blink-devices.js'):root.SourceBlinkDevices,
  common?require('./source-blinkthunder-devices.js'):root.SourceBlinkThunderDevices,
  common?require('./source-warpinit-devices.js'):root.SourceWarpInitDevices,
  common?require('./source-switchtimer-devices.js'):root.SourceSwitchTimerDevices,
  common?require('./source-enemy-devices.js'):root.SourceEnemyDevices,
  common?require('./source-thorn-ceiling-devices.js'):root.SourceThornCeilingDevices,
  common?require('./source-countup-devices.js'):root.SourceCountUpDevices,
  common?require('./source-lift-devices.js'):root.SourceLiftDevices,
  common?require('./source-landmine-devices.js'):root.SourceLandmineDevices,
  common?require('./source-pole-devices.js'):root.SourcePoleDevices,
  common?require('./source-wind-devices.js'):root.SourceWindDevices,
  common?require('./source-movewall-devices.js'):root.SourceMoveWallDevices,
  common?require('./source-linepath-devices.js'):root.SourceLinepathDevices,
  common?require('./source-text-devices.js'):root.SourceTextDevices,
  common?require('./source-coin-devices.js'):root.SourceCoinDevices,
  common?require('./source-checkpoint-devices.js'):root.SourceCheckpointDevices,
  common?require('./source-touchenergy-devices.js'):root.SourceTouchEnergyDevices,
  common?require('./source-boundballpitcher-devices.js'):root.SourceBoundBallPitcherDevices,
  common?require('./source-boundball.js'):root.SourceBoundBall,
  common?require('./source-ballkeybox-devices.js'):root.SourceBallKeyBoxDevices,
  common?require('./source-blackout-devices.js'):root.SourceBlackoutDevices,
  common?require('./source-playerblock-devices.js'):root.SourcePlayerBlockDevices,
  common?require('./source-dossun-devices.js'):root.SourceDossunDevices,
  common?require('./source-searchlight-devices.js'):root.SourceSearchLightDevices,
  common?require('./source-linepathgear-devices.js'):root.SourceLinePathGearDevices,
  common?require('./source-updownlift-devices.js'):root.SourceUpDownLiftDevices,
  common?require('./source-playerwarpgun-devices.js'):root.SourcePlayerWarpGunDevices,
  common?require('./source-breakablerect-devices.js'):root.SourceBreakableRectDevices,
  common?require('./source-playermagnet-devices.js'):root.SourcePlayerMagnetDevices,
  common?require('./source-colorbox-devices.js'):root.SourceColorBoxDevices,
  common?require('./source-move-contact.js'):root.SourceMoveContact,
  common?require('./source-gear-devices.js'):root.SourceGearDevices,
  common?require('./source-switchtargetgroup-devices.js'):root.SourceSwitchTargetGroupDevices,
  common?require('./source-sinelift-devices.js'):root.SourceSineLiftDevices,
  common?require('./source-ghost-devices.js'):root.SourceGhostDevices,
  common?require('./source-topviewplayer-devices.js'):root.SourceTopViewPlayerDevices,
  common?require('./source-distanceconstraint-devices.js'):root.SourceDistanceConstraintDevices,
  common?require('./source-batenemy-devices.js'):root.SourceBatEnemyDevices,
  common?require('./source-capturing-devices.js'):root.SourceCapturingDevices,
  common?require('./source-stepenemy-devices.js'):root.SourceStepEnemyDevices,
  common?require('./source-halfinput-devices.js'):root.SourceHalfInputDevices,
  common?require('./source-stage-autoscroll.js'):root.SourceStageAutoScroll,
  common?require('./source-camera-native.js'):root.SourceCameraNative,
  common?require('./source-frontswitch-devices.js'):root.SourceFrontSwitchDevices,
  common?require('./source-gokart-runtime.js'):root.SourceGoKartRuntime,
  common?require('./source-rally-runtime.js'):root.SourceRallyRuntime,
  common?require('./source-fake-runtime.js'):root.SourceFakeRuntime,
  common?require('./source-apple-runtime.js'):root.SourceAppleRuntime,
  common?require('./source-arrangement-runtime.js'):root.SourceArrangementRuntime,
  common?require('./source-giant-runtime.js'):root.SourceGiantRuntime,
  common?require('./source-mole-runtime.js'):root.SourceMoleRuntime,
  common?require('./source-throwball-runtime.js'):root.SourceThrowBallRuntime,
  common?require('./source-plane-runtime.js'):root.SourcePlaneRuntime,
  common?require('./source-planeobstacle-runtime.js'):root.SourcePlaneObstacleRuntime,
  common?require('./source-shooting-runtime.js'):root.SourceShootingRuntime,
  common?require('./source-graph-runtime.js'):root.SourceGraphRuntime,
  common?require('./source-danmaku-runtime.js'):root.SourceDanmakuRuntime,
  common?require('./source-boss-runtime.js'):root.SourceBossRuntime);
 if(common)module.exports=api;root.SourceStageRuntime=api;
})(typeof globalThis!=='undefined'?globalThis:this,function(Terrain,Actor,Relay,Devices,Motion,Gates,Bridges,Blink,BlinkThunders,WarpInit,SwitchTimers,Enemies,ThornCeilings,CountUps,Lifts,Landmines,Poles,Winds,SpeedSwitches,LinePaths,Texts,Coins,Checkpoints,TouchEnergies,Pitchers,Balls,KeyBoxes,Blackouts,Players,Dossuns,SearchLights,LinePathGears,UpDownLifts,WarpGuns,BreakableRects,PlayerMagnets,ColorBoxes,MoveContact,Gears,TargetGroups,SineLifts,Ghosts,TopViews,Constraints,BatEnemies,Capturings,StepEnemies,HalfInputs,AutoScroll,CameraNative,FrontSwitches,GoKarts,Rallies,Fakes,Apples,Arranges,Giants,Moles,ThrowBalls,Planes,PlaneObstacles,Shootings,Graphs,Danmakus,Bosses){
 'use strict';
 const clone=x=>JSON.parse(JSON.stringify(x));
 const overlap=(a,b)=>a.x<b.x+b.w&&a.x+a.w>b.x&&a.y<b.y+b.h&&a.y+a.h>b.y;
 const horizontal=(a,b)=>a.x<b.x+b.w&&a.x+a.w>b.x;
 const box=r=>({x:r.x,y:r.y,w:r.width,h:r.height});
 const NATIVE=Object.freeze({walk:3,jump:-334234/65536,gravity:42598/65536,terminal:19.5,holdFactor:13107/65536,holdFrames:14});
 // PlayerComponent.parseParameter: slot 0 -> +9; Initialize 0x1816bd520 then LookLeft when it is set.
// The player anchor (Pos): body X = -16*s, W = 32*s, Y = -46*s - 1, H = 46*s (pivot (0,-1),
// source-player-collision-init.js), so Pos = (x + w/2, y + h + 1) for every stage scale s.
function AX(p){return p.x+p.w/2;}
function AY(p){return p.y+p.h+1;}
function setAnchor(p,x,y){p.x=x-p.w/2;p.y=y-p.h-1;}
// Every createPlayer actor (Player 27, PlanePlayer 26, BattlePlanePlayer 107, TargetPlayer 132,
// BasketPlayer 133, CannonPlayer) takes the next player in actor order (ActorScene
// m_PlayerIndexList, createPlayer 0x1816a3e40); 6-2 interleaves planes and walkers.
const PLAYER_TYPES=['Player','PlanePlayer','BattlePlanePlayer','TargetPlayer','BasketPlayer','CannonPlayer'];
// S = stage scale (AddActor 0x1816a71d0 -> SetBaseScale): the spawn keeps Pos = (posX, posY - 0.5).
function playerActorSpawns(actors,count,S=1){
 return actors.filter(a=>PLAYER_TYPES.includes(a.typeName)&&Actor.actorPopulationAllowed(a.playerCount||0,count)).slice(0,count).map(a=>({x:a.posX-16*S,y:a.posY-0.5-46*S-1,
  ...(a.typeName==='Player'?{}:{variant:a.typeName}),lookLeft:playerLooksLeft(a),
  // PlayerComponent.parseParameter: plane types (0x1a / 0x6b) may look left only when slot 7 is 1
  ...(a.typeName==='PlanePlayer'||a.typeName==='BattlePlanePlayer'?{plane:{battle:a.typeName==='BattlePlanePlayer',lookLeftAllowed:Math.trunc(Math.fround(((a.datas||[])[7]||{}).f||0))===1}}:{})}));}
function playerLooksLeft(a){const p=a&&(a.properties||a),d=p&&p.datas&&p.datas[0];return !!(d&&d.t===1&&Math.trunc(Math.fround(Math.fround(d.f)*65536))>>16);}
function compile({source,geometry,count,stageId='st_w_01_01',nativeTickRate=60}={}){
  if(!['st_w_01_01','st_w_01_02','st_w_01_03','st_w_01_04','st_w_04_01','st_w_04_03','st_w_04_04','st_w_05_02','st_w_10_02','st_w_11_04','st_w_07_02','st_w_10_01','st_w_10_04','st_w_13_01','st_w_11_02','st_w_12_03','st_w_03_02','st_w_10_03','st_w_05_01','st_w_02_02','st_w_07_03','st_w_14_03','st_w_03_01','st_w_15_01','st_w_05_04','st_w_14_01','st_w_03_03','st_w_12_02','st_w_15_02','st_w_12_04','st_w_02_04','st_w_04_02','st_w_07_04','st_w_09_04','st_w_09_01','st_w_09_03','st_w_09_02','st_w_02_01','st_w_07_01','st_w_15_04','st_w_02_03','st_w_12_01','st_w_05_03','st_w_13_03','st_w_13_04','st_w_08_01','st_w_08_03','st_w_03_04','st_w_14_04','st_w_14_02','st_w_08_02','st_w_08_04','st_w_06_03','st_w_06_01','st_w_06_02','st_w_13_02','st_w_11_01','st_w_11_03','st_w_06_04','st_w_15_03'].includes(stageId))throw new Error('Source stage runtime does not support this stage yet');
  if(!Number.isFinite(nativeTickRate)||nativeTickRate<1||nativeTickRate>240)throw new Error('Invalid calibration tick rate');
  const t=Terrain.createTerrain({source,geometry,count,stageId});
  // The original frames a fixed window, not the whole map: mapInitParam carries
  // displayTileHeight (10 tiles on world01-01, i.e. 480px of a 960px map) and the
  // stage carries its scroll mode. Record them so the camera can match the
  // source framing instead of inventing one.
  const sourceStage=(source&&source.stages||[]).find(entry=>entry.stageId===stageId);
  const sourceVariant=sourceStage&&sourceStage.json&&sourceStage.json.stageInitParamList[t.variant.index];
  const stageScaleRaw=sourceVariant&&Number.isFinite(sourceVariant.scale)?Math.trunc(Math.fround(Math.fround(sourceVariant.scale)*65536)):null;
  const SCALE_RAW=stageScaleRaw===null?65536:stageScaleRaw,SCALE=SCALE_RAW/65536;
  const mapInit=sourceVariant&&sourceVariant.mapInitParam||{};
  const view={displayTileHeight:Number(mapInit.displayTileHeight)||0,
   displayHeight:(Number(mapInit.displayTileHeight)||0)*t.tileSize,
   startTileX:Number(mapInit.startTileX)||0,startTileY:Number(mapInit.startTileY)||0,
   scrollType:sourceVariant?Number(sourceVariant.scrollType)||0:0,
   zoomOut:sourceVariant?Number(sourceVariant.zoomOut)||0:0,
   scrollingPorted:false};
  // Auto scroll (QScrollType 2): StageComponent.prepare3 fills the speed/delay/
  // end offset (source-stage-autoscroll.js), Camera.funcAuto follows
  // Stage.scrollPosition (source-camera-native.js). Stage floats go through
  // convertFP (trunc(float32 * 65536)).
  const cfp=v=>Math.trunc(Math.fround(Math.fround(Number(v)||0)*65536));
  const autoScroll=view.scrollType===2?{scroll:AutoScroll.compile(t.actors,count,{stage:sourceVariant,nativeParamRaws:{autoScrollDelayTime:cfp(sourceVariant.autoScrollDelayTime),autoScrollSpeed:cfp(sourceVariant.autoScrollSpeed),autoScrollSpeedOffset:cfp(sourceVariant.autoScrollSpeedOffset),autoScrollEndOffset:cfp(sourceVariant.autoScrollEndOffset)}}),
   camera:CameraNative.compile({...sourceVariant,mapInitParam:{...mapInit,width:Number(mapInit.width),height:Number(mapInit.height),chipSize:Number(mapInit.chipSize),displayTileHeight:Number(mapInit.displayTileHeight)||0,startTileX:Number(mapInit.startTileX)||0,startTileY:Number(mapInit.startTileY)||0}})}:null;
  if(autoScroll)view.scrollingPorted=true;
  const relays=Relay.create(t.actors,count);
  const devices=Devices.compile(t.actors,count,{scale:SCALE});
  const motion=Motion.compile(t.actors,count,{scale:SCALE});
  const gates=Gates.compile(t.actors,count);
  const bridges=Bridges.compile(t.actors,count);
  const blink=Blink.compile(t.actors,count);
  const blinkThunders=BlinkThunders.compile(t.actors,count);
  const warpInit=WarpInit.compile(t.actors,count);
  const switchTimers=SwitchTimers.compile(t.actors,count);
  const enemies=Enemies.compile(t.actors,count);
  const thornCeilings=ThornCeilings.compile(t.actors,count);
  const countUps=CountUps.compile(t.actors,count);
  const lifts=Lifts.compile(t.actors,count);
  const landmines=Landmines.compile(t.actors,count);
  const poles=Poles.compile(t.actors,count,{});
  const winds=Winds.compile(t.actors,count,{scale:SCALE});
  const speedSwitches=SpeedSwitches.compile(t.actors,count,{nativeContactFacts:true});
  const linePaths=LinePaths.compile(t.actors,count,{});
  const texts=Texts.compile(t.actors,count,{});
  const coins=Coins.compile(t.actors,count,{});
  const checkpoints=Checkpoints.compile(t.actors,count,{});
  const touchEnergies=TouchEnergies.compile(t.actors,count,{});
  const pitchers=Pitchers.compile(t.actors,count);
  const keyBoxes=KeyBoxes.compile(t.actors,count);
  const blackouts=Blackouts.compile(t.actors,count,{});
  // StageComponent's actor scale (Actor.Initialize 0x18169cd02) is the selected
  // variant's stageInitParam.scale, a stage float, so it goes through convertFP
  // 0x180554310 like every other one. Only the Dossun family reads it so far.
  const dossunActors=t.actors.filter(a=>['Dossun','PlayerBlockGun'].includes(a.typeName));
  if(dossunActors.length&&stageScaleRaw===null)throw new Error('Dossun stage without stageInitParam.scale: '+stageId);
  const searchLights=SearchLights.compile(t.actors,count,{chipSize:t.tileSize});
  const linePathGears=LinePathGears.compile(t.actors,count,{chipSize:t.tileSize});
  const upDownLifts=UpDownLifts.compile(t.actors,count);
  const warpGuns=WarpGuns.compile(t.actors,count);
  const breakableRects=BreakableRects.compile(t.actors,count);
  const playerMagnets=PlayerMagnets.compile(t.actors,count);
  const colorBoxes=ColorBoxes.compile(t.actors,count,{nativeActorBridge:true,framePlayerIndexList:Array.from({length:count},(_,i)=>i),gamePlayerInfo:Array.from({length:count},(_,i)=>({playerRef:i+1,colorIndex:i}))});
  const gears=Gears.compile(t.actors,count,{nativeActorBridge:true});
  const targetGroups=TargetGroups.compile(t.actors,count);
  const sineLifts=SineLifts.compile(t.actors,count);
  const ghosts=Ghosts.compile(t.actors,count,{checkpointInfo:{isActive:false}});
  const topViews=TopViews.compile(t.actors,count,{nativeActorBridge:true,framePlayerIndexList:Array.from({length:count},(_,i)=>i),gamePlayerInfo:Array.from({length:count},(_,i)=>({playerRef:i+1,colorIndex:i})),actorSceneFlags:sourceVariant&&sourceVariant.limitPlayer?4:0});
  const constraints=Constraints.compile(t.actors,count,{nativeConstraintFacts:true});
  const batEnemies=BatEnemies.compile(t.actors,count,{chipSize:t.tileSize});
  const capturing=Capturings.compile(t.actors,count);
  const stepEnemies=StepEnemies.compile(t.actors,count);
  const halfInput=HalfInputs.compile(t.actors,count);
  const frontSwitches=FrontSwitches.compile(t.actors,count,{stageFlags:0});
  const goKarts=GoKarts.compile(t.actors,count);
  const rally=Rallies.compile(t.actors,count);
  const fake=Fakes.compile(t.actors,count);
  const apple=Apples.compile(t.actors,count,{scaleRaw:SCALE_RAW});
  if(apple.controller)apple.camera=CameraNative.compile({...sourceVariant,mapInitParam:{...mapInit,width:Number(mapInit.width),height:Number(mapInit.height),chipSize:Number(mapInit.chipSize),displayTileHeight:Number(mapInit.displayTileHeight)||0,startTileX:Number(mapInit.startTileX)||0,startTileY:Number(mapInit.startTileY)||0}});
  const arrange=Arranges.compile(t.actors,count);
  const giant=Giants.compile(t.actors,count);
  const mole=Moles.compile(t.actors,count);
  const throwball=ThrowBalls.compile(t.actors,count);
  if(throwball.controller)throwball.camera=CameraNative.compile({...sourceVariant,mapInitParam:{...mapInit,width:Number(mapInit.width),height:Number(mapInit.height),chipSize:Number(mapInit.chipSize),displayTileHeight:Number(mapInit.displayTileHeight)||0,startTileX:Number(mapInit.startTileX)||0,startTileY:Number(mapInit.startTileY)||0}});
  const planes={guns:Planes.compileGuns(t.actors,count)};
  const planeObstacle=PlaneObstacles.compile(t.actors,count);
  const shooting=Shootings.compile(t.actors,count,{colorCells:t.cells.filter(c=>c.flags&8),widthInTiles:t.widthInTiles,heightInTiles:t.heightInTiles});
  const graph={...Graphs.compile(t.actors,count),rng:{state:'9600629759793949339',inc:'15726070495360670683'}};
  const danmaku=Danmakus.compile(t.actors,count);
  if(danmaku.observer)danmaku.camera=CameraNative.compile({...sourceVariant,mapInitParam:{...mapInit,width:Number(mapInit.width),height:Number(mapInit.height),chipSize:Number(mapInit.chipSize),displayTileHeight:Number(mapInit.displayTileHeight)||0,startTileX:Number(mapInit.startTileX)||0,startTileY:Number(mapInit.startTileY)||0}});
  const boss=Bosses.compile(t.actors,count);
  const dossuns=Dossuns.compile(t.actors,count,stageScaleRaw===null?{}:{actorScaleRaw:stageScaleRaw});
  const springs=relays.relays.filter(r=>r.type==='JumpStand').map(r=>({...r,x:r.x-16*SCALE,y:r.y-(r.parent?38:34)*SCALE,w:32*SCALE,h:(r.parent?38:34)*SCALE}));// x stage scale (pivot 0)
  // The sensor rectangle is the one SwitchComponent.GetCollisionByDirection
  // 0x1817145a0 picks for this switch's direction byte; spring-switch-runtime
  // decodes the table out of SwitchComponent..cctor 0x181715330 and carries it on
  // the relay. Direction 0 keeps the previous 18x9 box above the anchor.
  const switches=relays.relays.filter(r=>r.type==='Switch'||r.type==='DelaySwitch'||r.type==='LandmineSwitch'||r.type==='DeadSwitch')
   .map(r=>({...r,x:r.x+r.rect.x*SCALE,y:r.y+r.rect.y*SCALE,w:r.rect.w*SCALE,h:r.rect.h*SCALE}));// Switch.InitCollision 0x181714790 rect x stage scale
  const goal=t.actors.find(a=>a.typeName==='Goal'),key=t.actors.find(a=>a.typeName==='Key');
  if(!goal)throw new Error('Original stage Goal is missing');
  // WarpComponent.ParseParameter 0x181734390 + OnCollided 0x181734a00:
  // slots width,height,destX,destY,ordinalOffsetX,ordinalOffsetY. Event63
  // ActorComponent handler/warpProc resets velocity and collision contacts.
  const constraintMoves=t.actors.filter(a=>a.typeName==='CollisionConstraintMove'&&Actor.actorPopulationAllowed(a.playerCount||0,count)).map((a,i)=>{const n=j=>a.datas[j]?.t===1?a.datas[j].f:0;
   return {id:'ccm:'+i,x:a.x,y:a.y,w:n(0),h:n(1),target:a.datas[2]?.t===2?a.datas[2].s||'':''};});
  const warps=t.actors.filter(a=>a.typeName==='Warp'||a.typeName==='WarpAll').map((a,i)=>{
   const n=j=>a.datas[j]?.t===1?a.datas[j].f:0;
   if(n(0)<=0||n(1)<=0)throw new Error('Unsupported Warp dimensions');
   return {id:'warp:'+i,type:a.typeName,x:a.x,y:a.y,w:n(0),h:n(1),targetAll:a.typeName==='WarpAll',
    destination:{x:n(2),y:n(3)},ordinalOffset:{x:n(4),y:n(5)},counter:0};
  });
  // BgmChanger (0x1817ce090 OnUpdate / checkCondition 0x1817ce1e0) only calls FrameEvents.PlayBgm: no gameplay.
  const supported=new Set(['BgmChanger','Player','Key','Goal','Warp','WarpAll','CollisionConstraintMove','MapRect','TopViewMapRect','JumpStand','JumpStandMediator','Switch','DelaySwitch','DeadSwitch','Rect','DashBoard','FallingWall',...Devices.supportedTypes,...Gates.supportedTypes,...Bridges.supportedTypes,...Blink.supportedTypes,...BlinkThunders.supportedTypes,...WarpInit.supportedTypes,...SwitchTimers.supportedTypes,...Enemies.supportedTypes,...ThornCeilings.supportedTypes,...CountUps.supportedTypes,...Lifts.supportedTypes,...Landmines.supportedTypes,...Poles.supportedTypes,...Winds.supportedTypes,'SpeedSwitch','MoveWall',...LinePaths.supportedTypes,...Texts.supportedTypes,...Coins.supportedTypes,...Checkpoints.supportedTypes,...TouchEnergies.supportedTypes,'BoundBallPitcher',...KeyBoxes.supportedTypes,...Blackouts.supportedTypes,...Dossuns.supportedTypes,...SearchLights.supportedTypes,...LinePathGears.supportedTypes,...UpDownLifts.supportedTypes,...WarpGuns.supportedTypes,...BreakableRects.supportedTypes,...PlayerMagnets.supportedTypes,...ColorBoxes.supportedTypes,...Gears.supportedTypes,...TargetGroups.supportedTypes,...SineLifts.supportedTypes,...Ghosts.supportedTypes,...TopViews.supportedTypes,...Constraints.supportedTypes,...BatEnemies.supportedTypes,...Capturings.supportedTypes,...StepEnemies.supportedTypes,...HalfInputs.supportedTypes,...FrontSwitches.supportedTypes,...GoKarts.supportedTypes,...Rallies.supportedTypes,...Fakes.supportedTypes,...Apples.supportedTypes,...Arranges.supportedTypes,...Giants.supportedTypes,...Moles.supportedTypes,...ThrowBalls.supportedTypes,...Planes.supportedTypes,...PlaneObstacles.supportedTypes,...Shootings.supportedTypes,...Graphs.supportedTypes,...Danmakus.supportedTypes,...Bosses.supportedTypes]);
  const unsupported=[...new Set(t.actors.filter(a=>!supported.has(a.typeName)).map(a=>a.typeName))];
  const missingMechanics=['Native tick frequency (60 Hz explicit prototype calibration)',
   'Native collision pushback and update ordering equivalence',
   'Key attach, transfer and goal-opening state machine (overlap pickup used)'];
  for(const type of unsupported)missingMechanics.push(type+' handler ('+t.actors.filter(a=>a.typeName===type).length+' source actor)');
  missingMechanics.push(...devices.warnings,...(blink.warnings||[]),...(blinkThunders.warnings||[]),...(warpInit.warnings||[]),...(switchTimers.warnings||[]),...(enemies.warnings||[]),...(thornCeilings.warnings||[]),...(countUps.warnings||[]),...(lifts.warnings||[]),...(landmines.warnings||[]),...(poles.warnings||[]),...(winds.warnings||[]),...(speedSwitches.warnings||[]),...(linePaths.warnings||[]),...(texts.warnings||[]),...(coins.warnings||[]),...(checkpoints.warnings||[]),...(touchEnergies.warnings||[]),...(searchLights.warnings||[]),...(linePathGears.warnings||[]),...(upDownLifts.warnings||[]),...(warpGuns.warnings||[]),...(breakableRects.warnings||[]),...(playerMagnets.warnings||[]),...(colorBoxes.warnings||[]),...(gears.warnings||[]),...(targetGroups.warnings||[]),...(sineLifts.warnings||[]),...(ghosts.warnings||[]),...(topViews.warnings||[]),...(constraints.warnings||[]),...(batEnemies.warnings||[]),...(capturing.warnings||[]),...(stepEnemies.warnings||[]),...(halfInput.warnings||[]),...(frontSwitches.warnings||[]),...(goKarts.warnings||[]),...(rally.warnings||[]),...(fake.warnings||[]),...(apple.warnings||[]),...(arrange.warnings||[]),...(giant.warnings||[]),...(mole.warnings||[]),...(throwball.warnings||[]),...(planeObstacle.warnings||[]),...(shooting.warnings||[]),...(graph.warnings||[]),...(danmaku.warnings||[]),...(boss.warnings||[]));
  if(texts.texts.some(t=>t.textId))missingMechanics.push('Text localization asset unresolved; authored textId retained without invented display string');
  if(unsupported.length||devices.warnings.length)throw Error('Unsupported source devices: '+[...unsupported,...devices.warnings].join(', '));
  if(t.cells.some(c=>(c.flags&~1)!==0))missingMechanics.push('Dynamic tile attributes');
  const map={id:stageId,count,width:t.width,height:t.height,tileSize:t.tileSize,variant:t.variant,
   platforms:t.platforms.filter(p=>!(p.flags&8)).map((p,i)=>({...p,id:'terrain:'+i})),springs,switches,warps,constraintMoves,
   spawns:topViews.players.length?t.actors.filter(a=>a.typeName==='TopViewPlayer'&&Actor.actorPopulationAllowed(a.playerCount||0,count)).slice(0,count).map(a=>({x:a.posX-16*SCALE,y:a.posY-0.5-46*SCALE-1}))
    :playerActorSpawns(t.actors,count,SCALE),
   stageScaleRaw:SCALE_RAW,
   // stageInitParam.shufflePlayer: InitPlayerIndexList 0x1816a6310 shuffles the index list (create)
   shufflePlayer:!!(sourceVariant&&sourceVariant.shufflePlayer),
   // top view: TopViewPlayer.initialize 0x1816c9d20 and the stage's raw map chips (fall attribute 16)
   ice:(t.cells.some(c=>c.flags&2)||frontSwitches.ices.length||frontSwitches.rects.some(r=>r.ice))&&sourceVariant?{resistivityRaw:cfp(sourceVariant.iceResistivity),frictionRaw:cfp(sourceVariant.iceFriction),speedUpRaw:cfp(sourceVariant.iceSpeedUp),
    cells:t.cells.filter(c=>c.flags&2).map(c=>c.gridX+','+c.gridY)}:null,
   topView:topViews.players.length>0,
   tvParseFlags:topViews.players.map(p=>p.parsePlayerFlagsSet),
   tvChips:topViews.players.length?{width:t.widthInTiles,height:t.heightInTiles,chips:t.grid.flat(1)}:null,
   // KeyComponent.ParseParameter 0x18186b780 moves the key off its authored
   // anchor before ActorFactoryComponent.CreateActor 0x1816a3658 reads the
   // position back for ActorSceneComponent.AddActor 0x1816a3687, so the key box
   // has to be built at the population-dependent spawn anchor, not at posX/posY.
   // Without this, st_w_04_03's key stayed at (240,480) - its 32x56 box
   // (224,452) sat inside the floor tiles at gridY 9 and half of it below the
   // map, so no player could overlap it. See actor-runtime.js keySpawnOffset
   // and key-reach-report.json.
   key:key?{...box(Actor.collisionRect(key,SCALE,count)),id:'key'}:null,// Key/Goal colliders: pivot 0, x stage scale (AddActor)
   // Key slot 3: the name KeyComponent notifies with event 61 on first pickup
   keyTarget:key&&key.datas&&key.datas[3]&&key.datas[3].t===2&&key.datas[3].s?key.datas[3].s:null,
   keyHoldYRaw:key&&key.datas&&key.datas[4]&&key.datas[4].t===1?Math.trunc(Math.fround(Math.fround(key.datas[4].f)*65536)):0,
   keyGhostYRaw:key&&key.datas&&key.datas[5]&&key.datas[5].t===1?Math.trunc(Math.fround(Math.fround(key.datas[5].f)*65536)):0,
   keyAttach:key&&key.datas&&key.datas[8]&&key.datas[8].t===2?key.datas[8].s||'':'',
   exit:{...box(Actor.collisionRect(goal,SCALE)),id:'goal'},
   // StageComponent.prepare3 0x18170aad0 writes FailFallY = mapHeight*chipSize +
   // stageInitParam.failDownY. failDownY is 0.0 for every World stage, so the
   // QGameDefine..cctor 0x181780720 default applies: statics+0x10 = 0x9600000 =
   // 2400. killY is compared against the collision box top, and the native anchor
   // sits 47 below it (PlayerComponent.CreateEntity 0x1816bd4e8), hence -47.
   // A margin of 144 leaves 7 of the 16 authored Warp volumes unreachable; 2400
   // makes 15 of 16 reachable, which is what the shipped level data expects.
   failFallY:t.height+2400,killY:t.height+2400-47,
   devices:[],coins:[],hazards:[],timers:[],movingPlatforms:[],crates:[],requiredCoins:0,
   physics:{playerWidth:32,playerHeight:46,nativeTickRate,status:'calibration_pending'},
   unsupportedActors:t.actors.filter(a=>!supported.has(a.typeName)).map(a=>({type:a.typeName,x:a.x,y:a.y})),
   view,coordinateSystem:'Y-down'};
  // 13-4 has no Player actor: the participants start on the first bodies and take
  // the assigned FakePlayers at the timer's OnStart (fakeTick).
  if(!map.spawns.length&&fake.fakes.length)map.spawns=fake.fakes.slice(0,count).map(f=>({x:f.xRaw/65536-16,y:f.yRaw/65536-47}));
  return {schemaVersion:1,count,map,relays,devices,motion,gates,bridges,blink,blinkThunders,warpInit,switchTimers,enemies,thornCeilings,countUps,lifts,landmines,poles,winds,speedSwitches,linePaths,texts,coins,checkpoints,touchEnergies,pitchers,keyBoxes,blackouts,dossuns,boss,danmaku,graph,shooting,planeObstacle,planes,throwball,mole,giant,arrange,apple,fake,rally,goKarts,frontSwitches,autoScroll,halfInput,stepEnemies,capturing,batEnemies,constraints,topViews,ghosts,sineLifts,targetGroups,gears,colorBoxes,playerMagnets,breakableRects,warpGuns,upDownLifts,linePathGears,searchLights,status:{state:'calibration_pending',missingMechanics,
   unsupportedActorTypes:unsupported,sourceStage:stageId,sourceY:'down',completePhysicsFidelity:false}};
 }
 function create(compiled,options={}){
  if(!compiled||compiled.schemaVersion!==1)throw new Error('Compiled source stage required');
  const map=clone(compiled.map),count=compiled.count,ids=options.ids||Array.from({length:count},(_,i)=>'p'+(i+1));
  if(ids.length!==count||new Set(ids).size!==count||ids.some(id=>typeof id!=='string'||!id))throw new Error('Unique IDs must match player count');
  const initPositions=(compiled.warpInit&&compiled.warpInit.initPositions)||[];
  const SC=(map.stageScaleRaw||65536)/65536;
  const order=map.shufflePlayer&&Number.isInteger(options.shuffleSeed)?shuffledOrder(count,options.shuffleSeed):ids.map((_,i)=>i);
  const state={map,ids:ids.slice(),shuffleSeed:Number.isInteger(options.shuffleSeed)?options.shuffleSeed:null,players:ids.map((_,i)=>({id:ids[order[i]],colorIndex:order[i],...map.spawns[i],initPos:initPositions[i]||{x:map.spawns[i].x+16*SC,y:map.spawns[i].y+46*SC+1.5},onPole:!!(compiled.poles&&compiled.poles.poles&&compiled.poles.poles.length),lookingRight:!map.spawns[i].lookLeft,facingLeft:!!map.spawns[i].lookLeft,...(map.spawns[i].plane?{plane:{...map.spawns[i].plane,life:map.spawns[i].plane.battle?Planes.createLife():null}}:{}),w:32*SC,h:46*SC,...(SC!==1?{walkSpeed:3*SC}:{}),vx:0,vy:0,grounded:false,ground:false,
   supportId:null,jump:false,jumpFrame:0,exit:false,visible:true,playerState:1})),
   relayState:clone(compiled.relays),deviceState:Devices.create(compiled.devices||{schemaVersion:1,count,devices:[],warnings:[]}),motionState:Motion.create(compiled.motion||{count,rects:[],dashBoards:[],walls:[]}),gateState:Gates.create(compiled.gates||{count,gates:[],observers:[],keys:[]}),bridgeState:Bridges.create(compiled.bridges||{count,bridges:[],thunders:[],keyTargets:[],keyTaken:false}),blinkState:Blink.create(compiled.blink||Blink.compile([],count)),blinkThunderState:BlinkThunders.create(compiled.blinkThunders||BlinkThunders.compile([],count)),warpInitState:WarpInit.create(compiled.warpInit||WarpInit.compile([],count)),switchTimerState:SwitchTimers.create(compiled.switchTimers||SwitchTimers.compile([],count)),enemyState:Enemies.create(compiled.enemies||Enemies.compile([],count)),thornCeilingState:ThornCeilings.create(compiled.thornCeilings||ThornCeilings.compile([],count)),countUpState:CountUps.create(compiled.countUps||CountUps.compile([],count)),liftState:Lifts.create(compiled.lifts||Lifts.compile([],count)),landmineState:Landmines.create(compiled.landmines||Landmines.compile([],count)),poleState:Poles.create(compiled.poles||Poles.compile([],count,{})),windState:Winds.create(compiled.winds||Winds.compile([],count,{})),speedSwitchState:SpeedSwitches.create(compiled.speedSwitches||SpeedSwitches.compile([],count,{})),linePathState:LinePaths.create(compiled.linePaths||LinePaths.compile([],count,{})),textsState:Texts.create(compiled.texts||Texts.compile([],count,{})),coinsState:Coins.create(compiled.coins||Coins.compile([],count,{})),checkpointsState:Checkpoints.create(compiled.checkpoints||Checkpoints.compile([],count,{})),touchEnergiesState:TouchEnergies.create(compiled.touchEnergies||TouchEnergies.compile([],count,{})),pitcherState:Pitchers.create(compiled.pitchers||Pitchers.compile([],count)),keyBoxState:KeyBoxes.create(compiled.keyBoxes||KeyBoxes.compile([],count)),blackoutState:Blackouts.create(compiled.blackouts||Blackouts.compile([],count,{})),dossunState:Dossuns.create(compiled.dossuns||Dossuns.compile([],count,{})),bossState:Bosses.create(compiled.boss||Bosses.compile([],count)),danmakuState:Danmakus.create(compiled.danmaku||Danmakus.compile([],count)),graphState:Graphs.create(compiled.graph||Graphs.compile([],count)),shootingState:Shootings.create(compiled.shooting||Shootings.compile([],count)),planeObstacleState:PlaneObstacles.create(compiled.planeObstacle||PlaneObstacles.compile([],count)),planeState:{...clone(compiled.planes||{guns:[]}),rng:{state:'9600629759793949339',inc:'15726070495360670683'}},throwState:ThrowBalls.create(compiled.throwball||ThrowBalls.compile([],count)),moleState:Moles.create(compiled.mole||Moles.compile([],count),{stageScaleRaw:map.stageScaleRaw||65536}),giantState:Giants.create(compiled.giant||Giants.compile([],count),{playerCount:count,stageScaleRaw:map.stageScaleRaw||65536}),arrangeState:Arranges.create(compiled.arrange||Arranges.compile([],count)),appleState:Apples.create(compiled.apple||Apples.compile([],count)),fakeState:Fakes.create(compiled.fake||Fakes.compile([],count)),rallyState:Rallies.create(compiled.rally||Rallies.compile([],count)),goKartState:GoKarts.create(compiled.goKarts||GoKarts.compile([],count)),frontSwitchState:FrontSwitches.create(compiled.frontSwitches||FrontSwitches.compile([],count)),autoScrollState:compiled.autoScroll?(()=>{const sc=AutoScroll.create(compiled.autoScroll.scroll,{freshStageComponent:true}),cam=CameraNative.create(compiled.autoScroll.camera,null);return {scroll:sc,camera:cam,cameraAreaRaw:CameraNative.stageAreaRaw(cam),steps:0};})():null,halfInputState:HalfInputs.create(compiled.halfInput||HalfInputs.compile([],count)),stepEnemyState:StepEnemies.create(compiled.stepEnemies||StepEnemies.compile([],count)),capturingState:Capturings.create(compiled.capturing||Capturings.compile([],count)),batState:BatEnemies.create(compiled.batEnemies||BatEnemies.compile([],count)),constraintState:Constraints.create(compiled.constraints||Constraints.compile([],count,{nativeConstraintFacts:true})),topViewState:TopViews.create(compiled.topViews||TopViews.compile([],count,{})),ghostState:Ghosts.create(compiled.ghosts||Ghosts.compile([],count,{checkpointInfo:{isActive:false}})),sineLiftState:SineLifts.create(compiled.sineLifts||SineLifts.compile([],count)),targetGroupState:TargetGroups.create(compiled.targetGroups||TargetGroups.compile([],count)),rollGearState:Gears.create(compiled.gears||Gears.compile([],count,{})),colorBoxState:ColorBoxes.create(compiled.colorBoxes||ColorBoxes.compile([],count,{})),magnetState:PlayerMagnets.create(compiled.playerMagnets||PlayerMagnets.compile([],count)),breakableState:BreakableRects.create(compiled.breakableRects||BreakableRects.compile([],count)),warpGunState:WarpGuns.create(compiled.warpGuns||WarpGuns.compile([],count)),upDownLiftState:UpDownLifts.create(compiled.upDownLifts||UpDownLifts.compile([],count)),gearState:LinePathGears.create(compiled.linePathGears||LinePathGears.compile([],count,{})),searchLightState:SearchLights.create(compiled.searchLights||SearchLights.compile([],count,{})),ballActors:{},boxActors:{},ballMeta:{serial:0,gone:{},key:null},playTimeRaw:0,gameOverCount:options.gameOverCount||0,keyActive:!compiled.gates||compiled.gates.keys.every(k=>k.active),sourceStatus:clone(compiled.status),physics:clone(map.physics),
   status:'play',elapsed:0,ticks:0,accumulator:0,// A BallKeyBox creates the key later (createKeyAt), so its round starts locked.
   keyTaken:!map.key&&!((compiled.keyBoxes&&compiled.keyBoxes.boxes)||[]).length,
   // GoalComponent flag 1: opened only by the key's collision (layer 10) or event 61
   goalOpen:!map.key&&!((compiled.keyBoxes&&compiled.keyBoxes.boxes)||[]).length,keyState:null,coinsTaken:0,deaths:0,failure:null,
   lastRelayEvents:[],lastImpulses:[],lastContacts:{switchContacts:[],springContacts:[]}};
  if(options.checkpointInfo){
   state.checkpointsState=Checkpoints.create({...compiled.checkpoints,checkpointInfo:clone(options.checkpointInfo)});
   // Creator zeroes the local checked flag; global checkpoint info persists on retry.
   for(const c of state.checkpointsState.checkpoints)c.checked=false;
   if(state.checkpointsState.checkpointInfo.isActive){
    state.players.forEach((p,i)=>{const r=Checkpoints.respawn(state.checkpointsState,i,i);setAnchor(p,r.actorPosition.x,r.actorPosition.y);});
    state.playTimeRaw=state.checkpointsState.checkpointInfo.playTimeRaw;
    // Ghost.Creator: with an active checkpoint the ghost starts at the 9th respawn position
    const rp=state.checkpointsState.checkpointInfo.respawnPositions||[];if(rp.length>8&&state.ghostState)for(const g of state.ghostState.ghosts)g.positionRaw={...rp[8]};
    state.elapsed=state.playTimeRaw/65536;
   }
  }
   // ShootingSuperApple Creator 0x1817080b0: below its GameOverCount it is removed at creation
   if(state.bossState&&state.bossState.apples)for(const a of state.bossState.apples)if((state.gameOverCount||0)<a.validCount)a.removed=true;
   // ColorBox slot 2 is an index-list ordinal: its colour is that player's (Frame.GetPlayerColorIndex 0x1817465c0)
   if(state.colorBoxState&&state.colorBoxState.boxes)for(const b of state.colorBoxState.boxes){const q=state.players[b.playerIndex];if(q&&q.colorIndex!==undefined)b.colorIndex=q.colorIndex;}
  return state;
 }
 function restart(compiled,previous,options={}){
  const info=previous&&previous.map.id===compiled.map.id?previous.checkpointsState?.checkpointInfo:null;
  const same=previous&&previous.map.id===compiled.map.id;
  return create(compiled,{...options,gameOverCount:same?(previous.gameOverCount||0)+(previous.status==='dead'?1:0):0,checkpointInfo:info?.isActive?{...clone(info),gameOverCount:info.gameOverCount+(previous.status==='dead'?1:0)}:undefined});
 }
 function active(s){return s.players.filter(p=>!p.exit&&!p.asBlock&&!p.fakeProxy);}
 // Native switch contact rule, recovered from SwitchComponent.OnCollided
 // 0x181714f80: the handler is entered for ANY overlap with the direction's
 // sensor rectangle and then inspects only the collided Collision.m_PushBackTarget
 // (bit1, 0x18171502a) and Collision.m_Layer (1,2,3 or 8,
 // 0x181715034..0x181715042). Nothing in it reads a contact normal, a relative
 // velocity or a grounded flag, and the direction byte is used only to pick the
 // rectangle (GetCollisionByDirection 0x1817145a0) plus two direction-0-only side
 // effects: the flags bit5/bit6 jump impulse at 0x181715116 (never set on a
 // shipped Switch) and the cosmetic m_OffsetDrawPos.y = ACTOR_DRAW_OFFSET_Y (-3)
 // write at 0x181715244. Plain overlap is therefore the rule.
 function switchSensorOverlap(body,button){return overlap(body,button);}
 // Exception, deliberately kept: for direction 0 the player test stays the
 // narrower "landed on the sensor's top face" condition this runtime has used
 // since the first round was connected. Widening it would change all 101
 // direction-0 World switches, which is out of scope for this change; it is
 // listed as a known deviation in switch-direction-report.json.
 function playerPressesSwitch(p,button,s){
  if(s&&s.map.topView)return switchSensorOverlap(tvBody(p),button);
  if(button.direction!==0)return switchSensorOverlap(p,button);
  return p.grounded&&horizontal(p,button)&&p.y<button.y&&p.y+p.h>=button.y&&p.y+p.h<=button.y+button.h+0.01;
 }
 // Switch.InitCollision 0x181714790 creates a sensor, not a solid: CreateCollision
 // gets 0 for m_PushBackTarget (0x1817147fa) and m_CollisionType stays 0
 // (0x18169f586), then 0x18171486e sets m_Layer 5. Switches never block anybody.
 // PoleLadder (source-pole-devices.js). The native OnPost puts every player
 // that is not in state 3..5 into state 10 and snaps them to the pole, with no
 // contact test, so in practice the whole party rides the pole from the first
 // tick. A rider climbs with up/down at the walk speed instead of walking or
 // jumping (PlayerComponent.OnUpdate_PoleLadder 0x1816c95b0 via poleStep), is
 // snapped to the pole's x by the module's playerConstraints and clamped to its
 // span, and the pole itself moves (PoleLadder OnUpdate).
 //   anchor <-> top-left: players are 32x46 boxes whose native anchor sits at
 //   (+16, +47), the transform actor-runtime.js already uses.
 function poleMove(s,p,input,terrain){
  const F=65536,anchorX=p.x+16,anchorY=p.y+47;
  const dir=input.up?-1:input.down?1:0;
  // Collision.IsContactedMapOrRect: a rider does not climb into terrain.
  let nextY=anchorY+dir*NATIVE.walk;
  const box={x:anchorX-10,y:nextY-47,w:20,h:44};
  if(dir&&terrain.some(b=>overlap(box,b)))nextY=anchorY;
  // OnInitialize_PoleLadder 0x1816c9380 only reshapes collision 0 (pushBackTarget 3 stays):
  // riders push each other, so a climb stops at the next rider's pole rect.
  if(dir&&nextY!==anchorY){const others=s.players.filter(q=>q!==p&&!q.exit&&q.onPole).map(q=>({x:q.x+16-10,y:q.y+47-47,w:20,h:44}));
   for(const o of others)if(box.x<o.x+o.w&&o.x<box.x+box.w){
    if(dir>0&&anchorY-47+44<=o.y+0.001&&nextY-47+44>o.y)nextY=Math.min(nextY,o.y-44+47);
    if(dir<0&&anchorY-47>=o.y+o.h-0.001&&nextY-47<o.y+o.h)nextY=Math.max(nextY,o.y+o.h+47);}}
  p.lookingRight=true;p.vx=0;p.vy=0;p.grounded=false;p.supportId=null;p.jump=false;
  p.animation=dir<0?14:dir>0?15:13;
  const out=Poles.afterStep(s.poleState,{players:[{id:p.id,nativeState:10,lookingRight:true,anchorYRaw:Math.round(nextY*F)}]});
  const c=out.playerConstraints.find(q=>q.playerId===p.id);
  setAnchor(p,c.anchorXRaw/F,c.anchorYRaw/F);
 }
 // FloatingThorn collision: the native callback sends event 43 to a category 1
 // (player) or 8 actor it touches, and event 43 is the player death path that
 // still respects immortality (pole-device-report.json). A rider's box is the
 // native pole rect from poleEnter: 20 wide, 44 tall, at (-10,-47) from the anchor.
 function poleContacts(s,players){
  if(!s.poleState.thorns.length)return [];
  const F=65536,collisions=[],view=Poles.displays(s.poleState);
  for(const p of players){
   if(p.exit||p.dead)continue;
   const body=p.onPole?{x:p.x+16-10,y:p.y,w:20,h:44}:p;
   for(const t of view.thorns)for(const r of t.collisionRects)
    if(overlap(body,{x:r.xRaw/F,y:r.yRaw/F,w:r.widthRaw/F,h:r.heightRaw/F})){collisions.push({thornId:t.id,targetId:p.id,category:1});break;}
  }
  if(!collisions.length)return [];
  const riders=players.filter(p=>!p.exit&&!p.dead).map(p=>({id:p.id,nativeState:p.onPole?10:1,lookingRight:true,anchorYRaw:Math.round(AY(p)*F)}));
  const out=Poles.afterStep(s.poleState,{players:riders,collisions});
  return out.events.filter(e=>e.eventType===43).map(e=>players.find(q=>q.id===e.targetId)).filter(q=>q&&!q.immortal).map(q=>q.id);
 }
 // Host side of source-linepath-devices.js. The module asks; this answers with
 // the port's AABB world. Approximations are named here, not hidden.
 function linePathHost(s,players,h){
  const F=65536,live=players.filter(p=>!p.exit&&!p.dead);
  const rect=d=>({x:(d.xRaw+d.rectRaw.x)/F,y:(d.yRaw+d.rectRaw.y)/F,w:d.rectRaw.width/F,h:d.rectRaw.height/F});
  const device=id=>s.linePathState.devices.find(d=>d.id===id);
  // Existing support graph adapter: include each stacked player once.
  // Native getRideCount0x18187a341..361 passes face0, recursive=true(r9b1),
  // mask6. The old direct-only count mistook recursive=true for face1.
  const riders=id=>ridersOf({id},live);
  return {dt:h,
   isActorPaused:()=>false,
   // IsCollidedByPushBackTarget(mask 3) 0x18180e291: the rect arms itself the
   // first update nothing pushable overlaps it. Players are the pushable bodies
   // here; whether terrain also counts under mask 3 was not established.
   isCollidedByPushBackTarget:id=>live.some(p=>overlap(p,rect(device(id)))),
   setCollisionActive:()=>{},
   damageRectOwnContacts:id=>{const d=device(id);if(d.collisionInactive)return [];
    return live.filter(p=>overlap(p,rect(d))).map(p=>({collisionType:1,entityId:p.id}));},
   damageRectReversePlayers:()=>[],
   // Collision.GetContactCount Up/recursive/mask6 @0x18187a361.
   getRideCount:id=>riders(id).length,
   // IsEnableMoveContactActor is only partly reversed (codex brief 17). The
   // port refuses a move that would push a rider into terrain, and otherwise allows it.
   isEnableMoveContactActor:(id,vector)=>{const dy=Math.sign(vector.yRaw);if(dy>=0)return true;
    const solid=s.map.platforms;return !riders(id).some(p=>solid.some(b=>overlap({x:p.x,y:p.y-1,w:p.w,h:p.h},b)));},
   // MoveContactActor 0x1816a0b70 gets (0, deltaY) only: a line-path lift lifts
   // and lowers its riders (0x18187a1dd..221). Horizontal movement belongs
   // to CollisionScene inertia, which this legacy host has not integrated.
   moveLinePathLiftContactActors:(id,delta)=>{for(const p of riders(id))p.y+=delta.yRaw/F;}};
 }
 // ---- 10-3: BoundBallPitcher / BoundBall / BallKeyBox host ----------------
 // The three modules (Codex) hold the native decisions; this runtime supplies the
 // actor world they ask for. Everything is in FP raws, one update = one 60Hz frame
 // (1092 raw, QFP.OneFrame). Approximations are named where they happen.
 //  - gravity: the ball's activation writes "the actual Gravity" into Actor.AccelY;
 //    this runtime's only verified gravity is the player increment 42598, used here.
 //  - Player weight is QPlayerDefine.WEIGHT_MAX = QFP._100 (PlayerComponent.Initialize
 //    0x1816bd7bb stores it to ActorComponent.m_Weight +0x58; ..cctor 0x18177e2e1).
 //  - collision: the ball is the native radius-12 circle; terrain and the box body
 //    are static rectangles (contact with targetActor null), players are actors.
 const BALL_F=65536,BALL_GRAVITY_RAW=42598,PLAYER_WEIGHT_RAW=100*65536,BALL_RADIUS=12;
 function circleRectContact(cx,cy,r,b){
  const nx=Math.max(b.x,Math.min(cx,b.x+b.w)),ny=Math.max(b.y,Math.min(cy,b.y+b.h));
  const dx=nx-cx,dy=ny-cy,d=Math.hypot(dx,dy);
  if(d>=r)return null;
  if(d<1e-9){// centre inside: leave along the shallowest axis
   const pen=[[cx-b.x,-1,0],[b.x+b.w-cx,1,0],[cy-b.y,0,-1],[b.y+b.h-cy,0,1]].sort((a,c)=>a[0]-c[0])[0];
   return {nx:-pen[1],ny:-pen[2],depth:r+pen[0]};}
  return {nx:dx/d,ny:dy/d,depth:r-d};
 }
 function boxRects(s){
  const out=[];
  for(const b of (s.keyBoxState&&s.keyBoxState.boxes)||[]){const a=s.boxActors[b.id];if(!a||(a.flags&8192))continue;
   // GetRect: the collider rect x the actor's base scale (stage scale, AddActor), pivot 0
   const k=(a.baseScaleRaw||BALL_F)/BALL_F;
   for(const c of b.colliders){const r=c.rectRaw;out.push({boxId:b.id,index:c.index,x:(a.positionRaw.xRaw+r.xRaw*k)/BALL_F,y:(a.positionRaw.yRaw+r.yRaw*k)/BALL_F,w:r.widthRaw*k/BALL_F,h:r.heightRaw*k/BALL_F});}}
  return out;
 }
 // KeyComponent.Creator, called by BallKeyBox.onCollided: the key appears above
 // the box with the established Key rect around that anchor.
 function createKeyAt(s,positionRaw){
  const ax=positionRaw.xRaw/BALL_F,ay=positionRaw.yRaw/BALL_F,r=Actor.rects.Key,k=(s.map.stageScaleRaw||BALL_F)/BALL_F;
  s.map.key={x:ax+r.x*k,y:ay+r.y*k,w:r.width*k,h:r.height*k,id:'key',taken:false};s.keyTaken=false;s.keyState=null;s.ballMeta.key={...s.map.key};
 }
 function ballTick(s,players,hz){
  if(!s.pitcherState||!(s.pitcherState.pitchers||[]).length)return;
  const live=players.filter(p=>!p.exit&&!p.dead),terrain=s.map.platforms;
  // stage scale (AddActor -> SetBaseScale): every actor's base scale, gravity mul(s, 42598)
  // (Gears.stageGravityRaw), the ball's circle 12 x s (GetGlobalCircle)
  const SR=s.map.stageScaleRaw||BALL_F,GRAV=Gears.stageGravityRaw(SR),RADIUS=BALL_RADIUS*SR/BALL_F;
  for(const b of s.keyBoxState.boxes||[])if(!s.boxActors[b.id]&&!s.ballMeta.gone[b.id])s.boxActors[b.id]={entityId:b.id,flags:0,positionRaw:{...b.positionRaw},velocityRaw:{xRaw:0,yRaw:0},baseScaleRaw:SR};
  const host={transaction:fn=>fn(),dtRaw:1092,gravityRaw:GRAV,playSe:()=>{},
   createActorEntity:()=>{const id='ball:'+(++s.ballMeta.serial);
    const a={entityId:id,flags:0,positionRaw:{xRaw:0,yRaw:0},velocityRaw:{xRaw:0,yRaw:0},accelerationRaw:{xRaw:0,yRaw:0},
     previousPositionRaw:{xRaw:0,yRaw:0},previousVelocityRaw:{xRaw:0,yRaw:0},weightRaw:BALL_F,baseScaleRaw:SR,visible:false,collisionActive:true};
    s.ballActors[id]=a;return {entityId:id,actor:a};},
   initBallCollision:()=>{},initBallPost:()=>{},
   addActor:(born,positionRaw)=>{born.actor.positionRaw={...positionRaw};born.actor.previousPositionRaw={...positionRaw};},
   moduleIdForPitcherEntity:e=>e};
  // 1. pitchers (birth / wait), then the balls' own update, in that order.
  const existing=Object.keys(s.ballActors);
  const pitcherActors={};
  for(const p of s.pitcherState.pitchers)pitcherActors[p.id]={entityId:p.id,flags:0,positionRaw:{...p.positionRaw},velocityRaw:{xRaw:0,yRaw:0},baseScaleRaw:SR,initPositionRaw:{...p.positionRaw}};
  const before=Pitchers.beforeStep(s.pitcherState,{...host,actors:pitcherActors,ballActors:s.ballActors,ballUpdateEntityIds:existing,
   contactedDownByEntity:Object.fromEntries(existing.map(id=>[id,!!s.ballActors[id].contactedDown]))});
  for(const c of before.actorChanges)if(s.ballActors[c.id])Object.assign(s.ballActors[c.id],c);
  // 2. Actor.Update2: velocity += acceleration, then position += velocity.
  for(const a of Object.values(s.ballActors)){if(a.flags&8192)continue;
   a.previousPositionRaw={...a.positionRaw};a.previousVelocityRaw={...a.velocityRaw};
   a.velocityRaw={xRaw:a.velocityRaw.xRaw+a.accelerationRaw.xRaw,yRaw:a.velocityRaw.yRaw+a.accelerationRaw.yRaw};
   a.positionRaw={xRaw:a.positionRaw.xRaw+a.velocityRaw.xRaw,yRaw:a.positionRaw.yRaw+a.velocityRaw.yRaw};}
  // 3. collision phase.
  const contacts=[],boxContacts=[],rects=boxRects(s);
  for(const a of Object.values(s.ballActors)){
   if((a.flags&8192)||a.collisionActive===false||a.visible===false){a.contactedDown=false;continue;}
   let cx=a.positionRaw.xRaw/BALL_F,cy=a.positionRaw.yRaw/BALL_F,down=false;
   for(const b of [...terrain,...rects.filter(r=>r.index===0)]){const c=circleRectContact(cx,cy,RADIUS,b);if(!c)continue;
    cx-=c.nx*c.depth;cy-=c.ny*c.depth;if(c.ny>0.7)down=true;
    contacts.push({ballEntityId:a.entityId,normalRaw:{xRaw:Math.round(c.nx*BALL_F),yRaw:Math.round(c.ny*BALL_F)},targetActor:null,targetLayer:0});}
   for(const p of live){const c=circleRectContact(cx,cy,RADIUS,p);if(!c)continue;
    cx-=c.nx*c.depth;cy-=c.ny*c.depth;if(c.ny>0.7)down=true;
    contacts.push({ballEntityId:a.entityId,normalRaw:{xRaw:Math.round(c.nx*BALL_F),yRaw:Math.round(c.ny*BALL_F)},
     targetActor:{entityId:p.id,flags:0,positionRaw:{xRaw:Math.round(AX(p)*BALL_F),yRaw:Math.round(AY(p)*BALL_F)},
      velocityRaw:{xRaw:Math.round(p.vx/hz*BALL_F),yRaw:Math.round(p.vy/hz*BALL_F)},weightRaw:PLAYER_WEIGHT_RAW},targetLayer:1});}
   a.positionRaw={xRaw:Math.round(cx*BALL_F),yRaw:Math.round(cy*BALL_F)};a.contactedDown=down;
   for(const r of rects.filter(r=>r.index===1))if(circleRectContact(cx,cy,RADIUS,r))boxContacts.push({boxId:r.boxId,ownCollisionIndex:1,targetActor:a});
  }
  if(contacts.length){const after=Pitchers.afterStep(s.pitcherState,{...host,contacts,ballActors:s.ballActors});
   for(const c of after.actorChanges)if(s.ballActors[c.id])Object.assign(s.ballActors[c.id],c);}
  // 4. the key box: its own gravity, then the ball in its slot.
  const boxCtx={actors:s.boxActors,dtRaw:1092,gravityRaw:GRAV,collision0ByBox:{}};
  for(const b of s.keyBoxState.boxes||[]){if(!s.boxActors[b.id])continue;
   const body=rects.find(r=>r.boxId===b.id&&r.index===0),onFloor=!!body&&terrain.some(t=>horizontal(body,t)&&Math.abs(body.y+body.h-t.y)<0.5);
   boxCtx.collision0ByBox[b.id]={contacts:[],mapNormals:onFloor?[{x:0,y:1}]:[]};}
  const live_boxes=(s.keyBoxState.boxes||[]).filter(b=>s.boxActors[b.id]);
  if(live_boxes.length)for(const c of KeyBoxes.beforeStep(s.keyBoxState,{...boxCtx,pausedBoxIds:(s.keyBoxState.boxes||[]).filter(b=>!s.boxActors[b.id]).map(b=>b.id)}).actorChanges){
   const a=s.boxActors[c.id];if(!a)continue;Object.assign(a,c);
   a.positionRaw={xRaw:a.positionRaw.xRaw+a.velocityRaw.xRaw,yRaw:a.positionRaw.yRaw+a.velocityRaw.yRaw};}
  if(boxContacts.length)KeyBoxes.afterStep(s.keyBoxState,{transaction:fn=>fn(),actors:s.boxActors,contacts:boxContacts,
   dispatchActorEvent:e=>{const b=s.pitcherState.balls.find(q=>q.entityId===e.targetId),a=s.ballActors[e.targetId];return b&&a?Balls.receive(b,a,e):0;},
   createKey:positionRaw=>createKeyAt(s,positionRaw)});
  // 5. exits: a finished fade (Actor flag bit13) or leaving the map ends the ball,
  //    and OnExit clears the pitcher's reference so it pitches again.
  const exited=Object.values(s.ballActors).filter(a=>(a.flags&8192)||a.positionRaw.yRaw/BALL_F>s.map.height+48).map(a=>a.entityId);
  if(exited.length){Pitchers.afterStep(s.pitcherState,{...host,exitedEntityIds:exited,ballActors:s.ballActors});for(const id of exited)delete s.ballActors[id];}
  for(const [id,a] of Object.entries(s.boxActors))if(a.flags&8192){delete s.boxActors[id];s.ballMeta.gone[id]=true;}
 }
 function keyBoxSolids(s){return s.boxActors?boxRects(s).filter(r=>r.index===0).map(r=>({id:'keybox:'+r.boxId,x:r.x,y:r.y,w:r.w,h:r.h})):[];}
 // ---- DistanceConstraint host (9-4, 2-1, 2-3) -----------------------------------
 // source-distanceconstraint-devices.js computes every tension and force; this
 // supplies the per-player contact facts and applies the moves in actor-index
 // order. Updater order puts it before Player (27 < 116). Named approximations:
 //  - contacts are bodies / solids touching within half a pixel (body collider in top view);
 //  - the mode-2 moveContactActor transport is a move with collision; bodies
 //    standing on the moved player are not dragged along by it.
 function constraintTick(s,hz){
  const st=s.constraintState;if(!st||!st.constraints.length)return;
  const F=65536,solidsNow=baseSolids(s);
  const bodyOf=p=>s.map.topView?tvBody(p):{id:p.id,x:p.x,y:p.y,w:p.w,h:p.h};
  const facts=s.players.map((p,i)=>{const b=bodyOf(p),others=[...solidsNow,...s.players.filter(q=>q!==p&&!q.exit).map(bodyOf)];
   const faces=SIDE_TOUCH.map(f=>others.some(o=>f(b,o)));
   return {index:i,xRaw:Math.round(AX(p)*F),yRaw:Math.round(AY(p)*F),vxRaw:Math.round((p.vx||0)/hz*F),vyRaw:Math.round((p.vy||0)/hz*F),
    state:p.exit?5:1,flags:(p.asBlock||p.catchLevel)?0x200:0,floating:!faces[1],hasCollision:!p.exit,hasActor:!p.exit,
    contactCount0:s.players.filter(q=>q!==p&&!q.exit&&SIDE_TOUCH[0](b,bodyOf(q))).length,contacted1:faces[1],mapFaces:faces};});
  const pending=s.pendingConstraintEvents||[];s.pendingConstraintEvents=[];
  Constraints.beforeStep(st,{events:pending,constraintPlayers:facts,applyConstraintUpdate:u=>{
   for(const m of u.moves){const p=s.players[m.playerIndex];if(!p||p.exit)continue;const dx=m.deltaRaw.xRaw/F,dy=m.deltaRaw.yRaw/F;
    const obstacles=[...solidsNow,...s.players.filter(q=>q!==p&&!q.exit).map(bodyOf)];
    if(s.map.topView){const b=tvBody(p);let nx=b.x+dx;for(const o of obstacles)if(b.y<o.y+o.h-0.001&&b.y+b.h>o.y+0.001){if(dx>0&&b.x+b.w<=o.x+0.001)nx=Math.min(nx,o.x-b.w);if(dx<0&&b.x>=o.x+o.w-0.001)nx=Math.max(nx,o.x+o.w);}
     let ny=b.y+dy;for(const o of obstacles)if(nx<o.x+o.w-0.001&&nx+b.w>o.x+0.001){if(dy>0&&b.y+b.h<=o.y+0.001)ny=Math.min(ny,o.y-b.h);if(dy<0&&b.y>=o.y+o.h-0.001)ny=Math.max(ny,o.y+o.h);}
     p.x+=nx-b.x;p.y+=ny-b.y;}
    else{moveX(p,dx,obstacles,s.map.width);moveY(p,dy,obstacles);}
    p.vx=(p.vx||0)+dx*hz;p.vy=(p.vy||0)+dy*hz;}
   return true;}});
 }
 // ---- Top view players (9-x, 11-x) ------------------------------------------
 // source-topviewplayer-devices.js updateTopView (defaultStep 0x1816ca0d0 /
 // fallStep 0x1816caba0 / checkFall 0x1816ca690) replaces the side-view walk:
 // no gravity or jump, 8-way input, body collider 28x32 at (-16,-29) for
 // pushback (the 46x32 head collider has pushBackTarget 0). Named approximations:
 //  - contactProbe = a solid touches the body on that face within half a pixel;
 //  - CalcScreenEndWalkVelo passes the velocity through (no screen-end clamp);
 //  - pushback = move x then y, stopping at terrain, solids and other bodies.
 const TV_BODY={x:-16,y:-29,w:32,h:28};
 // pivot (0,-1) like the regular body (source-player-collision-init.js): x stage scale S = w / 32
 function tvBody(p){const S=p.w/32;if(S===1)return {id:p.id,x:p.x+16+TV_BODY.x,y:p.y+47+TV_BODY.y,w:TV_BODY.w,h:TV_BODY.h};
  return {id:p.id,x:AX(p)+TV_BODY.x*S,y:AY(p)+(TV_BODY.y+1)*S-1,w:TV_BODY.w*S,h:TV_BODY.h*S};}
 function topViewMove(s,p,input,hz){
  const F=65536;if(!p.tv){const pf=s.map.tvParseFlags&&s.map.tvParseFlags[s.players.indexOf(p)];p.tv={state:0,topViewFunc:0,flags:(pf===undefined?262144:pf)|(1<<17),cardboardCoveredFlags:0,wakeUpCount:1,currentAnimationId:0,isFlashing:0,flashTimerRaw:0,waitTimerRaw:0,flags2:0,scaleRaw:F};}
  const tv=p.tv,body=tvBody(p);
  const obstacles=[...baseSolids(s),...s.players.filter(q=>q!==p&&!q.exit&&!q.asBlock&&!q.hiddenByCardboard&&!(q.tv&&q.tv.topViewFunc===1)).map(tvBody)];
  const btn=k=>[0,input[k]?1:0];
  const actor={xRaw:Math.round(AX(p)*F),yRaw:Math.round(AY(p)*F),scaleXRaw:tv.scaleRaw,scaleYRaw:tv.scaleRaw,baseScaleRaw:s.map.stageScaleRaw||F,flags:p.facingLeft?1024:0,
   windXRaw:Math.round((p.windDx||0)*F),windYRaw:0,vxRaw:0,vyRaw:0,requestAnimationId:null};
  const r=TopViews.updateTopView({...tv,id:p.id,walkSpeedRaw:Math.round((p.walkSpeed||NATIVE.walk)*F)},actor,{
   input:p.inputLocked?null:{stickXRaw:0,stickYRaw:0,buttons:{left:btn('left'),right:btn('right'),up:btn('up'),down:btn('down')}},
   stage:{flags:8,mode:0},map:s.map.tvChips,dtRaw:Math.trunc(F/hz),
   contactProbe:(index,face)=>{const hit=obstacles.some(o=>SIDE_TOUCH[face](body,o));return {contacted:hit,attribute:hit?1:0};},
   calcScreenEndWalkVeloX:v=>v,calcScreenEndWalkVeloY:v=>v});
  Object.assign(tv,{state:r.player.state,topViewFunc:r.player.topViewFunc,flags:r.player.flags,currentAnimationId:r.player.currentAnimationId,
   isFlashing:r.player.isFlashing,flashTimerRaw:r.player.flashTimerRaw,waitTimerRaw:r.player.waitTimerRaw,flags2:r.player.flags2||0,scaleRaw:r.actor.scaleXRaw});
  p.windDx=0;
  for(const a of r.actions){if(a.kind==='lookLeft')p.facingLeft=true;else if(a.kind==='lookRight')p.facingLeft=false;}
  p.tvScale=tv.scaleRaw/F;
  const dx=r.actor.vxRaw/F,dy=r.actor.vyRaw/F;p.vx=dx*hz;p.vy=dy*hz;
  if(tv.topViewFunc===1){p.x+=dx;p.y+=dy;}// falling: collision is off (setCollisionActive false)
  else{
   let nx=body.x+dx;for(const o of obstacles)if(body.y<o.y+o.h-0.001&&body.y+body.h>o.y+0.001){if(dx>0&&body.x+body.w<=o.x+0.001)nx=Math.min(nx,o.x-body.w);if(dx<0&&body.x>=o.x+o.w-0.001)nx=Math.max(nx,o.x+o.w);}
   let ny=body.y+dy;for(const o of obstacles)if(nx<o.x+o.w-0.001&&nx+body.w>o.x+0.001){if(dy>0&&body.y+body.h<=o.y+0.001)ny=Math.min(ny,o.y-body.h);if(dy<0&&body.y>=o.y+o.h-0.001)ny=Math.max(ny,o.y+o.h);}
   p.x+=nx-body.x;p.y+=ny-body.y;}
  p.grounded=false;p.supportId=null;
  return r.player.requestedPlayerState===4;
 }
 // ---- 7-4: Ghost host --------------------------------------------------------
 // source-ghost-devices.js runs the native Ghost; this supplies its facts:
 // player slots (index i, one live generation), facing (actor flag 0x400),
 // ActorManager.m_Key (loose: no attach target) and the key holder's layer.
 // The ghost has no pushback (both colliders pushBackTarget 0), so its velocity
 // is applied straight (OnUpdate2). Collider 0 (layer 8) touching a player sends
 // event 43; collider 1 (layer 11) is the one the key collides with.
 const GHOST_RECT={x:-20,y:-55,w:40,h:54};
 function ghostTick(s,hz){
  const st=s.ghostState;if(!st||!st.ghosts.length)return [];
  const F=65536;
  if(!s.ghostActors){s.ghostActors={};for(const g of st.ghosts)s.ghostActors[g.id]={positionRaw:{...g.positionRaw},flags:0,keyCollider1Flags:0};}
  const k=s.keyState,holder=k&&k.holderId;
  const keyFacts=g=>({collision1Flags:s.ghostActors[g.id].keyCollider1Flags,attachTargetCollisionLayer:holder?(st.ghosts.some(x=>x.id===holder)?11:1):null});
  const slots=s.players.map((p,i)=>({entityRef:{index:i,generation:1,actorId:p.id},state:p.exit?5:1,flags:p.exit?512:0,
   actor:{id:p.id,xRaw:Math.round(AX(p)*F),yRaw:Math.round(AY(p)*F),flags:p.facingLeft?1024:0}}));
  const entities=s.players.map(()=>({generation:1,components:['PlayerComponent','ActorComponent']}));
  const managerKey=!s.map.key||(k&&k.used)?null:{attachTarget:holder||null,actor:k?{xRaw:k.xRaw,yRaw:k.yRaw}:{xRaw:Math.round((s.map.key.x+16)*F),yRaw:Math.round((s.map.key.y+28)*F)}};
  const actors=Object.fromEntries(st.ghosts.map(g=>[g.id,{positionRaw:{...s.ghostActors[g.id].positionRaw},flags:s.ghostActors[g.id].flags}]));
  const dead=[];
  // one call for every ghost (the module writes its result back into st); the
  // key facts are the first ghost's collider (7-4 has a single ghost)
  const r=Ghosts.beforeStep(st,{actors,playerSlots:slots,entities,managerKey,keyTargetFacts:keyFacts(st.ghosts[0]),stage:{flags:0}});
  for(const e of r.effects)if(e.kind==='SetCollisionFlag'&&e.index===1&&e.bit===0&&s.ghostActors[e.actorId])s.ghostActors[e.actorId].keyCollider1Flags|=1;
  for(const c of r.actorChanges){const a=s.ghostActors[c.id];a.positionRaw={xRaw:c.positionRaw.xRaw+c.velocityRaw.xRaw,yRaw:c.positionRaw.yRaw+c.velocityRaw.yRaw};a.flags=c.actorFlags;a.facingLeft=c.velocityRaw.xRaw<0?true:c.velocityRaw.xRaw>0?false:a.facingLeft;}
  for(const g of st.ghosts){
   const a=s.ghostActors[g.id],box={x:a.positionRaw.xRaw/F+GHOST_RECT.x,y:a.positionRaw.yRaw/F+GHOST_RECT.y,w:GHOST_RECT.w,h:GHOST_RECT.h};
   const contacts=s.players.filter(p=>!p.exit&&!p.asBlock&&overlap(p,box)).map(p=>({ghostId:g.id,layer:1,entityId:p.id}));
   for(const e of Ghosts.afterStep(st,{contacts}).events)if(e.eventType===43){const p=s.players.find(q=>q.id===e.targetId);if(p&&!p.immortal)dead.push(p.id);}
  }
  return dead;
 }
 function ghostKeyBoxes(s){
  if(!s.ghostState||!s.ghostActors)return [];const F=65536;
  return s.ghostState.ghosts.filter(g=>!(s.ghostActors[g.id].keyCollider1Flags&1)).map(g=>{const a=s.ghostActors[g.id];return {id:g.id,x:a.positionRaw.xRaw/F+GHOST_RECT.x,y:a.positionRaw.yRaw/F+GHOST_RECT.y,w:GHOST_RECT.w,h:GHOST_RECT.h};});
 }
 // ---- 9-1: BatEnemy + FallingCage host ----------------------------------------
 // source-batenemy-devices.js runs the native components; this supplies facts.
 // Update order (ActorUpdater registration): FallingCage 113 before Player 116,
 // BatEnemy 165 and SearchLight 190 after; contacts come in the collision pass.
 // A top-view player (state 9) is seen by the light and touched by the bat
 // through its collider 1, the regular 46x32 rect at (-16,-47) from Pos.
 function batPlayers(s){
  const F=65536;
  return s.players.map((p,i)=>{const px=Math.round(AX(p)*F),py=Math.round(AY(p)*F),live=!p.exit&&!p.asBlock&&!p.hiddenByCardboard;
   // PlayerComponent.IsEquipOrCoverCardboard 0x1816cb8b0: covered byte != 0 or flag 0x80000
   const cardboard=!!p.tv&&(p.tv.cardboardCoveredFlags!==0||!!(p.tv.flags&0x80000));
   return {index:i,id:p.id,flags:(p.tv?p.tv.flags:0)|(p.exit?0x200:0),alive:!p.exit,cardboard,xRaw:px,yRaw:py,spotted:false,
    collisionRaw:live?{xRaw:px-16*F,yRaw:py-47*F,widthRaw:32*F,heightRaw:46*F}:null};});
 }
 function cageTick(s,hz){
  const st=s.batState;if(!st||!st.cages.length)return;
  for(const c of st.cages){const r=BatEnemies.cageUpdate(c,Math.trunc(65536/hz));if(r.landed)s.cageShake=(s.cageShake||0)+1;}
 }
 // Cardboard (9-3): the top-view factory gives one to every player whose
 // slot8 left Player flag 0x40000 clear; it updates after the bats (updater
 // 180 vs 165) so a bat's 0x8000 mark of this update blocks equipping, and its
 // OnPost follows the owner after everyone moved.
 function cardboardTick(s,inputs,hz){
  const st=s.batState,F=65536;if(!st||!s.map.topView)return;
  if(!st.cardboards)st.cardboards=s.players.map((p,i)=>({p,i})).filter(({i})=>s.map.tvParseFlags&&!(s.map.tvParseFlags[i]&0x40000))
   .map(({p,i})=>BatEnemies.cardboardCreate({id:p.id,index:i,xRaw:Math.round(AX(p)*F),yRaw:Math.round(AY(p)*F)}));
  for(const cb of st.cardboards){
   const owner=s.players.find(q=>q.id===cb.playerId);
   let shotPressed=false;if(owner){const held=!!(inputs[owner.id]&&inputs[owner.id].shot)&&!owner.inputLocked;shotPressed=held&&!owner.cbShotHeld;owner.cbShotHeld=held;}
   const facts=owner&&owner.tv?{flags:owner.tv.flags|(owner.exit?0x200:0),alive:!owner.exit,shotPressed,vxRaw:Math.round((owner.vx||0)/hz*F),vyRaw:Math.round((owner.vy||0)/hz*F)}:null;
   const flags=BatEnemies.cardboardUpdate(cb,facts,Math.trunc(F/hz));
   if(owner&&owner.tv)owner.tv.flags=(flags&~0x200)>>>0;
   const others=s.players.filter(q=>q.id!==cb.playerId).map(q=>({id:q.id,state9:!q.exit&&!!q.tv,bodyRaw:{xRaw:Math.round(q.x*F),yRaw:Math.round((q.y+18)*F),widthRaw:32*F,heightRaw:28*F}}));
   for(const c of BatEnemies.cardboardCover(cb,others)){const q=s.players.find(x=>x.id===c.id);if(!q||!q.tv)continue;
    q.tv.cardboardCoveredFlags=c.inside?(q.tv.cardboardCoveredFlags|(1<<cb.playerIndex)):(q.tv.cardboardCoveredFlags&~(1<<cb.playerIndex));}
  }
  for(const p of s.players)p.hiddenByCardboard=!!p.tv&&(p.tv.cardboardCoveredFlags!==0||!!(p.tv.flags&0x80000));
 }
 function cardboardPost(s){
  const st=s.batState,F=65536;if(!st||!st.cardboards)return;
  for(const cb of st.cardboards){const o=s.players.find(q=>q.id===cb.playerId);BatEnemies.cardboardPost(cb,o?{xRaw:Math.round(AX(o)*F),yRaw:Math.round(AY(o)*F)}:null);}
 }
 function batTick(s,hz,inputs){
  const st=s.batState;if(!st||!st.bats.length&&!st.cages.length&&!s.map.topView)return [];
  const dt=Math.trunc(65536/hz),facts=batPlayers(s);
  for(const b of st.bats){BatEnemies.update(b,{dtRaw:dt,chipSize:st.chipSize,players:facts});BatEnemies.post(b);}
  // a bat marks the players it sees or chases with Player flag 0x8000; the
  // player's own top-view update clears it again (updateTopView)
  for(const f of facts){const p=s.players.find(q=>q.id===f.id);if(!p)continue;p.batSpotted=f.spotted;if(f.spotted&&p.tv)p.tv.flags=(p.tv.flags|0x8000)>>>0;}
  cardboardTick(s,inputs||{},hz);
  // setVisibleByCardboard 0x1816cb750 -> ActorComponent.setVisible 0x18169ee20 ends
  // in SetCollisionActive: a hidden player has no collision in this pass
  for(const f of facts){const p=s.players.find(q=>q.id===f.id);if(p&&p.hiddenByCardboard)f.collisionRaw=null;}
  for(const b of st.bats)BatEnemies.lightUpdate(b,dt);
  const r=BatEnemies.collide(st,facts);
  for(const e of r.keyEvents)Gates.signal(s.gateState,e);
  cardboardPost(s);
  return r.kills.filter(id=>{const p=s.players.find(q=>q.id===id);return p&&!p.immortal;});
 }
 // ---- 9-2: CapturingTarget + CapturingConstraint host --------------------------
 // source-capturing-devices.js runs the native components (updaters 110/111,
 // before DeadTimer 114 and Player 116). Named approximations of shared engine
 // parts the components call: MapComponent.Move (checkTerrain) and the map
 // pushback after OnUpdate2 are an axis-separated sweep (X then Y) of the
 // collider against the solids; the ring force the constraint adds to Pos is
 // swept the same way against the walls instead of the collision pass pushing
 // the player back out.
 function sweepRect(r,dx,dy,solids){
  let nx=r.x+dx;for(const o of solids)if(r.y<o.y+o.h-0.001&&r.y+r.h>o.y+0.001){if(dx>0&&r.x+r.w<=o.x+0.001)nx=Math.min(nx,o.x-r.w);if(dx<0&&r.x>=o.x+o.w-0.001)nx=Math.max(nx,o.x+o.w);}
  let ny=r.y+dy;for(const o of solids)if(nx<o.x+o.w-0.001&&nx+r.w>o.x+0.001){if(dy>0&&r.y+r.h<=o.y+0.001)ny=Math.min(ny,o.y-r.h);if(dy<0&&r.y>=o.y+o.h-0.001)ny=Math.max(ny,o.y+o.h);}
  return {dx:nx-r.x,dy:ny-r.y};
 }
 function capturingTick(s,hz){
  const st=s.capturingState;if(!st||!st.constraints.length)return;
  const F=65536,dt=Math.trunc(F/hz),walls=baseSolids(s);
  const rectOf=t=>{const r=Capturings.targetRect(t);return {x:r.xRaw/F,y:r.yRaw/F,w:r.widthRaw/F,h:r.heightRaw/F};};
  for(const t of st.targets){
   Capturings.targetUpdate(t,{dtRaw:dt,rng:st.rng,terrainBlocked:(tg,d)=>{const m=sweepRect(rectOf(tg),d.xRaw/F,d.yRaw/F,walls);return Math.round(m.dx*F)!==d.xRaw||Math.round(m.dy*F)!==d.yRaw;}});
   if(t.veloRaw.xRaw||t.veloRaw.yRaw){const m=sweepRect(rectOf(t),t.veloRaw.xRaw/F,t.veloRaw.yRaw/F,walls);t.xRaw+=Math.round(m.dx*F);t.yRaw+=Math.round(m.dy*F);}
  }
  const c=st.constraints[0];
  const facts=()=>s.players.map(p=>({state:p.exit?5:9,xRaw:Math.round(AX(p)*F),yRaw:Math.round(AY(p)*F)}));
  const forces=Capturings.constraintForces(c,facts());
  s.players.forEach((p,i)=>{const f=forces[i];if(!f||(!f.xRaw&&!f.yRaw))return;
   const body=tvBody(p),m=sweepRect(body,f.xRaw/F,f.yRaw/F,walls);p.x+=m.dx;p.y+=m.dy;});
  const r=Capturings.constraintCheck(c,facts(),st.targets);
  for(const e of r.events){Gates.signal(s.gateState,e);notifyByName(s,e.targetName,e.eventType);}
 }
 // ---- 2-1: StepEnemy host ------------------------------------------------------
 // source-stepenemy-devices.js decides velocity, direction and the contact
 // replies; named approximations: its map pushback is an axis-separated sweep
 // of the collider against the terrain, it is a solid for the players (pushBack
 // 3 on both sides) and the contact pass treats bodies touching within half a
 // pixel as contacts (normal from the enemy towards the player).
 function stepEnemyTick(s){
  const st=s.stepEnemyState;if(!st||!st.enemies.length)return;
  const F=65536,grav=Number(BigInt.asIntN(64,BigInt(s.map.stageScaleRaw||F)*42598n)>>16n),walls=s.map.platforms;
  for(const e of st.enemies){if(e.gone)continue;
   StepEnemies.update(e,{gravityRaw:grav});
   const r=StepEnemies.rect(e),m=sweepRect(r,e.veloRaw.xRaw/F,e.veloRaw.yRaw/F,walls);
   if(Math.abs(m.dx-e.veloRaw.xRaw/F)>1e-6)StepEnemies.contactMap(e,{xRaw:e.veloRaw.xRaw>0?F:-F,yRaw:0});
   const down=e.veloRaw.yRaw>0&&Math.abs(m.dy-e.veloRaw.yRaw/F)>1e-6;
   e.xRaw+=Math.round(m.dx*F);e.yRaw+=Math.round(m.dy*F);
   if(down)e.veloRaw.yRaw=0;
   const nr=StepEnemies.rect(e);e.grounded=walls.some(o=>nr.x<o.x+o.w&&nr.x+nr.w>o.x&&Math.abs(nr.y+nr.h-o.y)<0.5);
   if(nr.y>s.map.killY)e.gone=true;}
 }
 function stepEnemySolids(s){const st=s.stepEnemyState;return st?StepEnemies.displays(st).map(d=>({id:d.id,type:'StepEnemy',x:d.x,y:d.y,w:d.w,h:d.h})):[];}
 function stepEnemyContacts(s,hz){
  const st=s.stepEnemyState;if(!st||!st.enemies.length)return [];const dead=[];
  for(const e of st.enemies){if(e.gone)continue;const r=StepEnemies.rect(e);
   for(const p of s.players){if(p.exit||p.asBlock)continue;
    const hov=p.x<r.x+r.w&&p.x+p.w>r.x,vov=p.y<r.y+r.h&&p.y+p.h>r.y;
    let n=null;
    if(hov&&Math.abs(p.y+p.h-r.y)<0.5)n={xRaw:0,yRaw:-65536};
    else if(hov&&Math.abs(r.y+r.h-p.y)<0.5)n={xRaw:0,yRaw:65536};
    else if(vov&&(Math.abs(p.x+p.w-r.x)<0.5||Math.abs(r.x+r.w-p.x)<0.5||hov))n={xRaw:p.x+p.w/2<r.x+r.w/2?-65536:65536,yRaw:0};
    if(!n)continue;
    const ev=StepEnemies.contactActor(e,n,{layer:1,veloXRaw:Math.round((p.vx||0)/hz*65536)});
    if(ev&&ev.eventType===36){p.vy=ev.jumpRaw.yRaw/65536*hz;p.grounded=false;p.ground=false;p.supportId=null;p.jumpFrame=0;}
    else if(ev&&ev.eventType===43&&!p.immortal)dead.push(p.id);}}
  return dead;
 }
 // ---- Auto scroll (QScrollType 2) ---------------------------------------------
 // PlayerComponent.checkAutoScroll 0x1816c4f70, called from OnUpdate_Default for
 // a scroll-type-2 stage with the walk velocity: a player whose next x would
 // fall behind the camera's left edge by more than this update's scroll step is
 // carried to (left + step); one whose x minus that velocity is more than 32 px
 // (plus 100 when the stage speed is QFP._5 or more, else 0) behind the left
 // edge gets event 43. The carried player's MoveContactActor(left - x, face 3)
 // moves the players touching its right face (and theirs) along first; named
 // approximation: that transport is a chain of walk moves stopped by terrain.
 function autoScrollSpeedRaw(s){const a=s.autoScrollState;return AutoScroll.calculateStepRaw(a.scroll,{stageFlags:0,players:s.players.map(()=>({flags:0})),cameraAreaRaw:a.cameraAreaRaw});}
 function autoScrollPush(s,p,hz){
  const a=s.autoScrollState,F=65536;if(!a)return false;
  let velo=Math.round((p.vx||0)/hz*F);const pos=Math.round(AX(p)*F),left=a.cameraAreaRaw.x,step=autoScrollSpeedRaw(s);
  const next=pos+velo;if(next-step<left){velo+=(left-next)+step;if(left>pos)autoScrollCarry(s,p,(left-pos)/F,new Set([p.id]));}
  const margin=a.scroll.autoScrollSpeedRaw<5*F?0:100*F;
  p.vx=velo/F*hz;
  return (pos-velo)+32*F<left-margin;
 }
 function autoScrollCarry(s,p,d,seen){
  const terrain=solids(s);
  for(const q of s.players){if(q.exit||q.asBlock||seen.has(q.id))continue;
   if(Math.abs(q.x-(p.x+p.w))<0.5&&q.y<p.y+p.h&&q.y+q.h>p.y){seen.add(q.id);autoScrollCarry(s,q,d,seen);
    moveX(q,d,terrain.concat(s.players.filter(o=>o!==q&&!o.exit&&!seen.has(o.id))),s.map.width);}}
 }
 // Stage.onUpdate: the producer runs after the collision pass, then Actor.Post,
 // then Camera.funcAuto.
 function autoScrollStep(s,hz){
  const a=s.autoScrollState;if(!a)return;
  AutoScroll.updateAutoScroll(a.scroll,{dtRaw:Math.trunc(65536/hz),stageFlags:0,players:s.players.map(()=>({flags:0})),cameraAreaRaw:a.cameraAreaRaw});
  a.cameraAreaRaw=CameraNative.updateAuto(a.camera,a.scroll.scrollPositionRaw).cameraAreaRaw;a.steps++;
 }
 // ---- Ice (2-2, 15-4) and FrontSwitch / SwitchRect host -----------------------
 // PlayerComponent.checkIceFloor 0x1816c4a50, before the walk velocity: a body
 // under the feet (the down-face contact) whose collision low byte has bit 4
 // (IceRect 0x606, SwitchIceRect 0x604) sets actor flag 0x800000, any other
 // clears it; standing on the map samples the chip 12 px under the feet
 // (QGameDefine[0] >> 2) for attribute bit 2; touching nothing keeps the flag.
 // OnUpdate_Default then walks on ice as v = v*IceResistivity (+ input*walk*
 // IceFriction, clamped to walk*IceSpeedUp) instead of v = input*walk.
 function checkIceFloor(s,p){
  if(!s.map.ice||!p.grounded||!p.supportId)return;
  const sup=baseSolids(s).find(b=>b.id===p.supportId);if(!sup)return;
  if(String(sup.id).startsWith('terrain:')){const gx=Math.floor(AX(p)/48),gy=Math.floor((p.y+47+12)/48);p.onIce=s.map.ice.cells.includes(gx+','+gy);}
  else p.onIce=!!sup.ice;
 }
 function iceWalk(s,p,dir,hz){
  const F=65536,ice=s.map.ice,walk=Math.round((p.walkSpeed||NATIVE.walk)*F),m=(a,b)=>Number(BigInt.asIntN(64,BigInt(a)*BigInt(b))>>16n);
  let v=m(Math.round((p.vx||0)/hz*F),ice.resistivityRaw);
  if(dir){const cap=m(walk,ice.speedUpRaw);v=Math.max(-cap,Math.min(cap,v+m(dir*walk,ice.frictionRaw)));}
  return v/F*hz;
 }
 function frontSwitchUpdate(s){
  const st=s.frontSwitchState;if(!st||!st.switches.length)return;
  for(const sw of st.switches)for(const e of FrontSwitches.switchUpdate(sw))notifyByName(s,e.targetName,e.eventType);
 }
 function frontSwitchTouches(s){
  const st=s.frontSwitchState;if(!st||!st.switches.length)return;
  // solid (pushBackTarget bit 2) bodies on layer 1 (players), 2 (boxes), 8 (enemies)
  const bodies=[...s.players.filter(p=>!p.exit&&!p.asBlock&&!p.hiddenByCardboard),...Devices.solids(s.deviceState),...stepEnemySolids(s)];
  for(const sw of st.switches){const r=FrontSwitches.sensorRect(sw);if(bodies.some(b=>overlap(b,r)))FrontSwitches.touch(sw);}
 }
 function switchRectUpdate(s,hz){
  const st=s.frontSwitchState;if(!st||!st.rects.length)return;
  const bodies=[...s.players.filter(p=>!p.exit&&!p.asBlock),...Devices.solids(s.deviceState)];
  for(const r of st.rects)FrontSwitches.rectUpdate(r,Math.trunc(65536/hz),rr=>bodies.some(b=>overlap(b,rr)));
 }
 // ---- 12-1: GoKart host ---------------------------------------------------------
 // source-gokart-runtime.js runs GoKartComponent (updater 115, just before the
 // players). Riders are in player state 11 with their collision off, so the
 // kart's colliders stand in for them: the heads (layer 1) touch switches,
 // thorns, thunder and the key; anything that kills them reaches the kart
 // (event 43) and every player. Named approximation: the kart's map pushback is
 // the axis-separated sweep of every kart rect against the terrain.
 function goKartPseudo(s){const st=s.goKartState;if(!st||!st.karts.length)return [];const k=st.karts[0];if(!(k.flags&1))return [];
  return GoKarts.rectsAt(k).filter(r=>r.layer===1).map(r=>({id:k.id+':head'+r.index,kartId:k.id,x:r.x,y:r.y,w:r.w,h:r.h,grounded:k.grounded,vx:k.veloRaw.xRaw/65536*60,vy:0}));}
 function goKartTick(s,inputs,hz){
  const st=s.goKartState;if(!st||!st.karts.length)return;const k=st.karts[0],F=65536,dt=Math.trunc(F/hz);
  if(!k.started){GoKarts.start(k);s.players.forEach(p=>{p.riding=k.id;});}
  const r=GoKarts.update(k,{inputs:s.players.map(p=>!!(inputs[p.id]&&inputs[p.id].jump)&&!p.inputLocked),playTimeRaw:s.playTimeRaw,dtRaw:dt});
  if(r.getOff)goKartGetOff(s,k);
  // OnUpdate2 + map pushback
  if(k.collisionActive||true){const walls=s.map.platforms,rs=GoKarts.rectsAt(k);let dx=k.veloRaw.xRaw/F,dy=k.veloRaw.yRaw/F;
   for(const q of rs){const m=sweepRect(q,dx,0,walls);if(Math.abs(m.dx)<Math.abs(dx))dx=m.dx;}
   for(const q of rs){const m=sweepRect({...q,x:q.x+dx},0,dy,walls);if(Math.abs(m.dy)<Math.abs(dy))dy=m.dy;}
   if(Math.abs(dy-k.veloRaw.yRaw/F)>1e-6&&k.veloRaw.yRaw<0)k.veloRaw.yRaw=0;// OnContactAdded: upward contact
   k.xRaw+=Math.round(dx*F);k.yRaw+=Math.round(dy*F);
   const nr=GoKarts.rectsAt(k),body=nr[0];
   k.grounded=walls.some(o=>body.x<o.x+o.w&&body.x+body.w>o.x&&Math.abs(body.y+body.h-o.y)<0.5);
   if(k.grounded&&k.veloRaw.yRaw>0)k.veloRaw.yRaw=0;
   k.headContact=nr.slice(1).some(h=>walls.some(o=>h.x<o.x+o.w&&h.x+h.w>o.x&&Math.abs(o.y+o.h-h.y)<0.5));}
  // OnPost: riders to their seats
  GoKarts.post(k,dt);
  if(k.flags&1)s.players.forEach((p,i)=>{if(p.riding!==k.id)return;const q=GoKarts.ridePosition(k,i);setAnchor(p,q.xRaw/F,q.yRaw/F);p.vx=k.veloRaw.xRaw/F*hz;p.vy=0;p.grounded=false;p.supportId=null;
   p.kartDriver=!!k.infos[i].isDriver;p.grayscale=k.playerCount>4&&!p.kartDriver;});
 }
 function goKartGetOff(s,k){
  const F=65536;
  for(const p of s.players)if(p.riding===k.id){p.riding=null;p.kartDriver=false;p.grayscale=false;p.vx=0;p.vy=0;}
  // a key the kart holds goes to the nearest rider
  const key=s.keyState;if(key&&key.holderId===k.id){let best=null,bd=Infinity;for(const p of s.players){const dx=AX(p)*F-key.xRaw,dy=AY(p)*F-key.yRaw,d=Number((BigInt(dx)*BigInt(dx))>>16n)+Number((BigInt(dy)*BigInt(dy))>>16n);if(best===null||d<bd){bd=d;best=p;}}if(best)key.holderId=best.id;}
 }
 function goKartEvents(s,events){const st=s.goKartState;if(!st||!st.karts.length)return null;const k=st.karts[0];let dead=null;
  for(const e of events||[]){const target=e.target??e.targetName;if(target!==k.name)continue;const r=GoKarts.receiveEvent(k,e);if(r&&r.allDead)dead=r.allDead;}
  return dead;}
 function goKartKilled(s,ids){const st=s.goKartState;if(!st||!st.karts.length)return false;const k=st.karts[0];if(!ids.some(id=>String(id).startsWith(k.id+':head')))return false;GoKarts.receiveEvent(k,{eventType:43});return true;}
 // ---- 13-3: Rally host -------------------------------------------------------------
 // source-rally-runtime.js runs RallyMallet (updater 100), RallyBall (127) and the
 // RallyController's OnPost. While the rally runs the players stand in state 8
 // (Target: no update of their own); each player's input drives the mallet whose
 // slot 0 names that player's actor index (GetPlayerByActorIndex). The ball meets
 // the terrain and the Thunder (38) beam colliders.
 function rallyTick(s,inputs,hz){
  const st=s.rallyState;if(!st||!st.controllers.length)return;
  // ChangeAllPlayerState(1) comes from the controller's OnPost: the players take
  // state 1 in their next update.
  if(s.rallyRelease){s.rallyRelease=false;for(const p of s.players)p.rallyTarget=false;}
  const F=65536,dt=Math.trunc(F/hz);
  const beams=Bridges.hazards(s.bridgeState,{platforms:s.map.platforms,width:s.map.width,height:s.map.height}).filter(b=>b.lethal!==false&&b.w>0&&b.h>0);
  const r=Rallies.step(st,{dtRaw:dt,terrain:s.map.platforms,beams,inputVector:i=>{const p=s.players[i];if(!p||p.inputLocked||p.exit)return {xRaw:0,yRaw:0};const input=inputs[p.id]||{},btn=k=>[0,input[k]?1:0];
   return TopViews.inputVector({stickXRaw:0,stickYRaw:0,buttons:{left:btn('left'),right:btn('right'),up:btn('up'),down:btn('down')}},Rallies.nativeConstants.STICK);}});
  if(r.playerState===8)for(const p of s.players){p.rallyTarget=true;p.vx=0;p.vy=0;}
  if(r.playerState===1)s.rallyRelease=true;
  for(const e of r.keyEvents)Gates.signal(s.gateState,e);
 }
 // ---- 13-4: Fake host ---------------------------------------------------------------
 // source-fake-runtime.js runs FakePlayer (updater 98), FakeCursor (99), FakeCage (125)
 // and FakeTimer (126). There is no Player actor: each participant is a proxy that
 // follows the FakePlayer the timer assigned to it (camera, key holder) and never
 // moves itself (left out of active()). Only a revealed, visible body (collision layer
 // 1) touches the key; the body enters and leaves the goal itself. The decide button
 // (Frame button 0) is the jump key: a direction press is checked first (selectCage).
 function fakeTick(s,inputs,hz){
  const st=s.fakeState;if(!st||!st.timer)return false;
  const F=65536,dt=Math.trunc(F/hz);
  const buttons=s.players.map(p=>{const i=inputs[p.id]||{};return p.inputLocked?{}:{left:!!i.left,right:!!i.right,jump:!!i.jump,up:!!i.up,down:!!i.down,decide:!!i.jump};});
  const r=Fakes.step(st,{dtRaw:dt,participants:s.players.map((_,i)=>i),colorOf:i=>i,buttons,terrain:s.map.platforms,goal:s.map.exit,goalOpen:!!s.goalOpen});
  s.players.forEach((p,i)=>{const b=Fakes.bodyFor(st,i);p.fakeProxy=true;p.vx=0;p.vy=0;p.grounded=true;if(!b)return;
   setAnchor(p,b.xRaw/F,b.yRaw/F);p.facingLeft=b.facingLeft;p.fakeCaged=!(b.layer===1&&b.visible);});
  if(r.retry){s.status='dead';s.deaths++;s.failure={playerId:s.players[0].id,reason:'다른 몸을 골랐어요'};return true;}
  if(r.clear)s.status='clear';
  return r.clear;
 }
 // ---- 8-1 / 8-3: Apple host ----------------------------------------------------------
 // source-apple-runtime.js runs Apple (updater 79), PlayerBasket (142), PlayerTarget (143)
 // and AppleController (160). A TargetPlayer is in state 8 (Target) until its crosshair
 // has flown back (wakeUpPlayer). The crosshair keeps inside the native camera's view
 // (CameraComponent funcNormal, source-camera-native.js, following the players). A
 // falling bomb that hits a player sends event 25: Player.requsetFaintState 0x1816c71b0.
 function appleTick(s,inputs,hz){
  const st=s.appleState;if(!st||!st.controller)return;
  const F=65536,dt=Math.trunc(F/hz);
  if(s.appleRelease&&s.appleRelease.length){for(const i of s.appleRelease)if(s.players[i])s.players[i].rallyTarget=false;s.appleRelease=[];}
  if(!s.appleStarted){s.appleStarted=true;st.targets.forEach(t=>{const p=s.players[t.playerIndex];if(p){p.rallyTarget=true;p.vx=0;p.vy=0;}});}
  const range=()=>{const live=s.players.filter(p=>!p.exit);const xs=live.map(p=>Math.round(AX(p)*F)),ys=live.map(p=>Math.round(AY(p)*F));return xs.length?{left:Math.min(...xs),right:Math.max(...xs),top:Math.min(...ys),bottom:Math.max(...ys)}:null;};
  if(!s.appleCamera&&st.camera)s.appleCamera=CameraNative.create(st.camera,range());
  if(s.appleCamera){const r=range();if(r)CameraNative.update(s.appleCamera,r,dt);}
  const area=s.appleCamera?CameraNative.stageAreaRaw(s.appleCamera):{x:0,y:0,width:s.map.width*F,height:s.map.height*F};
  const prev=s.appleShot||(s.appleShot=[]);
  const players=s.players.map(p=>({xRaw:Math.round(AX(p)*F),yRaw:Math.round(AY(p)*F),visible:!p.exit,layer1Rect:(p.exit||p.dead||p.asBlock)?null:{x:p.x,y:p.y,w:p.w,h:p.h}}));
  const r=Apples.step(st,{dtRaw:dt,players,viewRaw:{x:area.x,y:area.y,w:area.width,h:area.height},
   moveVector:i=>{const p=s.players[i];if(!p||p.inputLocked)return {xRaw:0,yRaw:0};const input=inputs[p.id]||{},btn=k=>[0,input[k]?1:0];
    return TopViews.inputVector({stickXRaw:0,stickYRaw:0,buttons:{left:btn('left'),right:btn('right'),up:btn('up'),down:btn('down')}},Rallies.nativeConstants.STICK);},
   pressed:(i,k)=>{const p=s.players[i];return !!(p&&!p.inputLocked&&inputs[p.id]&&inputs[p.id][k]&&!prev[i]);},
   mapBoundsRaw:{left:-480*F,right:(s.map.width+480)*F,up:-2400*F,fall:(s.map.height+2400)*F}});
  s.players.forEach((p,i)=>{prev[i]=!!(inputs[p.id]&&inputs[p.id].shot);});
  for(const e of r.keyEvents)Gates.signal(s.gateState,e);
  if(r.wake.length)s.appleRelease=r.wake.slice();
  // Player.OnRecvEvent 25 -> requsetFaintState: state 2 at the next update with that
  // velocity and QFP[0x120] 2.5 s (PlayerComponent .cctor 0x1816cbfeb).
  for(const f of r.faints){const p=s.players[f.playerIndex];if(!p||p.exit)continue;p.faintRequest={vxRaw:f.veloRaw.xRaw,vyRaw:f.veloRaw.yRaw};}
 }
 // PlayerComponent.OnUpdate_Faint 0x1816c74d0: no input; on the floor no falling and
 // x * PlayerComponent+0x178 (QFP[0xd8] 0.9), in the air the player's gravity; a wall
 // in the way stops x; the timer ends it (state 1).
 function faintMove(s,p,hz,obstacles){
  const F=65536,f=p.faint;let vx=f.vxRaw,vy=f.vyRaw;
  const body={x:p.x,y:p.y,w:p.w,h:p.h},floor=obstacles.some(o=>horizontal(body,o)&&Math.abs(body.y+body.h-o.y)<0.5);
  if(floor){if(vy>0)vy=0;vx=Number((BigInt(vx)*58982n)>>16n);}
  else{let n=vy+42598;if(n>=0x138000)n=0x138000;vy=vy+(n-vy);}
  if(vx<0&&obstacles.some(o=>body.y<o.y+o.h&&body.y+body.h>o.y&&Math.abs(o.x+o.w-body.x)<0.5))vx=0;
  if(vx>0&&obstacles.some(o=>body.y<o.y+o.h&&body.y+body.h>o.y&&Math.abs(body.x+body.w-o.x)<0.5))vx=0;
  moveX(p,vx/F,obstacles,s.map.width);moveY(p,vy/F,obstacles);f.vxRaw=vx;f.vyRaw=vy;p.vx=vx/F*hz;p.vy=vy/F*hz;
  f.timerRaw-=Math.trunc(F/hz);if(f.timerRaw<1)p.faint=null;
 }
 // ---- 3-4: Arrangement host -------------------------------------------------------------
 // source-arrangement-runtime.js runs the Arrangement's OnPost. While it has the stage
 // suspended (event 53 to every actor) nothing else updates. The map's movable
 // columns come from the terrain; the shown dummies and dummy boxes are solid
 // (pushBack 3, layer 5).
 function arrangeTick(s,inputs,hz){
  const st=s.arrangeState;if(!st||!st.arrangement)return false;
  const F=65536,dt=Math.trunc(F/hz),cols=Math.round(s.map.width/48),rows=Math.round(s.map.height/48);
  const solid=(c,r)=>s.map.platforms.some(b=>b.x<=c*48+24&&c*48+24<b.x+b.w&&b.y<=r*48+24&&r*48+24<b.y+b.h);
  const boxes=(s.colorBoxState&&s.colorBoxState.boxes||[]).map(b=>{const a=s.colorBoxActors&&s.colorBoxActors[b.id];const p0=a||ColorBoxes.initialPositionRaw(b);return {id:b.id,playerIndex:b.playerIndex,xRaw:p0.xRaw,yRaw:p0.yRaw};});
  const r=Arranges.step(st,{dtRaw:dt,cols,rows,movable:(c,rw)=>!solid(c,rw),
   players:s.players.map((p,i)=>({index:i,colorIndex:p.colorIndex??i,xRaw:Math.round(AX(p)*F),yRaw:Math.round(AY(p)*F),lookingRight:p.lookingRight!==false})),colorBoxes:boxes});
  for(const e of r.keyEvents)Gates.signal(s.gateState,e);
  if(r.retry){s.status='dead';s.deaths++;s.failure={playerId:s.players[0].id,reason:'배치가 달라요'};return true;}
  return r.paused;
 }
 // ---- 6-4 / 15-3 bosses: ShootingEnemyBoss / BossEx / missiles / PlayerGuard / SuperApple ---
 // source-boss-runtime.js holds the native state machines. The bosses update before the
 // player bullets (their hits are the collision pass, read on the next update), their pool
 // bullets join the OptimizedBullet pool shootingTick moves this frame, BossEx's homing
 // enemies are the pool's reusable ShootingEnemies. Event 43 (a boss part, a missile)
 // kills; event 21 takes one battle-plane life.
 function bossNotify(s,name,eventType){
  Gates.signal(s.gateState,{eventType,targetName:name});
  if(s.targetGroupState&&s.targetGroupState.groups.some(g=>g.name===name)){const r=TargetGroups.signal(s.targetGroupState,{targetName:name,eventType});
   for(const e of r.events||[]){const n=e.targetName??e.target,ty=e.eventType??e.event;Gates.signal(s.gateState,{eventType:ty,targetName:n});notifyByName(s,n,ty);}}
  else notifyByName(s,name,eventType);
 }
 function bossPlayers(s){const F=65536;return s.players.map((p,i)=>({index:i,xRaw:Math.round(AX(p)*F),yRaw:Math.round(AY(p)*F),alive:!p.exit&&!p.dead,dead:!!p.dead,visible:!p.exit,
  lookingRight:!p.facingLeft,plane:!!p.plane,life:p.plane&&p.plane.life,bodyRaw:p.exit?null:{x:Math.round(p.x*F),y:Math.round(p.y*F),w:Math.round(p.w*F),h:Math.round(p.h*F)}}));}
 function bossTick(s,hz){
  const st=s.bossState;if(!st||!(st.bosses.length||st.guards.length||st.apples.length))return null;
  const F=65536,dt=Math.trunc(F/hz),sh=s.shootingState,rng=s.planeState.rng,a=s.autoScrollState;
  const view=a?{x:a.cameraAreaRaw.x,y:a.cameraAreaRaw.y,w:a.cameraAreaRaw.width,h:a.cameraAreaRaw.height}:{x:0,y:0,w:s.map.width*F,h:s.map.height*F};
  const terrain=[...s.map.platforms,...Shootings.chipSolids(sh)].map(b=>({x:Math.round(b.x*F),y:Math.round(b.y*F),w:Math.round(b.w*F),h:Math.round(b.h*F)}));
  const r=Bosses.step(st,{dtRaw:dt,rng,scrollXRaw:a?a.scroll.scrollPositionRaw.xRaw:0,scrollStepRaw:a?autoScrollSpeedRaw(s):0,viewRaw:view,gameOverCount:s.gameOverCount||0,
   players:bossPlayers(s),guns:s.planeState.guns||[],mapBlocked:box=>terrain.some(t=>box.x<t.x+t.w&&t.x<box.x+box.w&&box.y<t.y+t.h&&t.y<box.y+box.h),
   createBullet:(pos,velo,extra)=>Shootings.createEnemyBullet(sh,pos,velo,rng,extra),resumeHomingEnemy:(o,pos,dir,sp,tg)=>Shootings.resumeHomingEnemy(sh,o,pos,dir,sp,tg,rng),
   addReusableEnemies:(o,n)=>Shootings.addReusableEnemies(sh,o,n,rng),barrierDeployed:L=>Planes.barrierDeployed(L)});
  for(const d of r.damage){const q=s.players[d.player];if(q&&q.plane&&q.plane.life)Planes.lifeDamage(q.plane.life);}
  for(const b of r.barrier){const q=s.players[b.player];if(q&&q.plane&&q.plane.life)Planes.equipBarrier(q.plane.life,b.easy);}
  for(const n of r.notify)bossNotify(s,n.targetName,n.eventType);
  const k=r.kill.find(k=>s.players[k.player]&&!s.players[k.player].immortal);
  return k?{playerId:s.players[k.player].id,reason:k.reason}:null;
 }
 // ---- 11-1 / 11-3 danmaku: DanmakuObserver / Emitter / Modifier / Locator / Thunder ---
 // source-danmaku-runtime.js holds the native phases and the Locator's firing; the bullets
 // are the OptimizedBulletObserver pool's (shootingTick moves them after this). The
 // off-screen test reads the native camera view (CalcCameraViewStageArea), fed with the
 // players like 8-1. HP 0 sends event 19 to every player at the Observer's next update.
 function danmakuFlash(p,raw){if(!p)return;if(p.tv){p.tv.isFlashing=1;p.tv.flashTimerRaw=raw;}else{p.danmakuFlashRaw=raw;}}
 function danmakuTick(s,hz){
  const st=s.danmakuState;if(!st||!st.observer)return null;const F=65536,dt=Math.trunc(F/hz);
  if(!st.started)Danmakus.start(st);
  const range=()=>{const live=s.players.filter(p=>!p.exit);const xs=live.map(p=>Math.round(AX(p)*F)),ys=live.map(p=>Math.round(AY(p)*F));return xs.length?{left:Math.min(...xs),right:Math.max(...xs),top:Math.min(...ys),bottom:Math.max(...ys)}:null;};
  if(!s.danmakuCamera&&st.camera)s.danmakuCamera=CameraNative.create(st.camera,range());
  if(s.danmakuCamera){const r=range();if(r)CameraNative.update(s.danmakuCamera,r,dt);}
  const area=s.danmakuCamera?CameraNative.stageAreaRaw(s.danmakuCamera):null;s.danmakuView=area?{x:area.x,w:area.width}:null;
  const r=Danmakus.step(st,{dtRaw:dt,playerDead:()=>s.players.some(p=>p.dead),
   createBullet:param=>Shootings.createDanmakuBullet(s.shootingState,param,s.planeState.rng),removeAllBullets:()=>Shootings.removeAllBullets(s.shootingState)});
  for(const n of r.notify)Gates.signal(s.gateState,{eventType:n.eventType,targetName:n.targetName});
  return r.killAll?{playerId:s.players[0].id,reason:'체력이 다 떨어졌어요'}:null;
 }
 // Collision.Update: DanmakuThunder.OnCollided against the TopViewPlayer body
 function danmakuThunderTick(s){
  const st=s.danmakuState;if(!st||!st.thunders.length)return;
  const beams=Bridges.hazards({thunders:st.thunders.map(t=>({...t,lethal:false,alpha:1})),bridges:[]},{platforms:s.map.platforms,width:s.map.width,height:s.map.height});s.danmakuBeams=beams;
  const touching=[];beams.forEach((b,k)=>s.players.forEach((p,i)=>{if(p.exit||p.dead)return;const body=s.map.topView?tvBody(p):p;if(overlap(body,b))touching.push({thunder:st.thunders[k].id,player:i});}));
  for(const i of Danmakus.thunderContacts(st,touching))danmakuFlash(s.players[i],Danmakus.nativeConstants.THUNDER_FLASH);
 }
 // ---- 13-2 graphs: GraphController / CircleGraphController / BarGraphController -----
 // source-graph-runtime.js holds the native rounds. OnPost after the players in updater
 // order; OnStart turns every player to state 12, phase 3 Activates every Key (event 1
 // to type 17) and turns them back to state 1. The controllers read the raw buttons.
 // OnStart runs before the first update of every actor.
 function graphStart(s){const st=s.graphState;if(!st||!st.gc||st.started)return;
  const r=Graphs.start(st,{gameOverCount:s.gameOverCount||0});if(r&&r.playerState===12)for(const p of s.players)p.graphMode=true;}
 function graphTick(s,inputs,hz){
  const st=s.graphState;if(!st||!st.gc)return;const F=65536;
  const r=Graphs.step(st,{dtRaw:Math.trunc(F/hz),rng:st.rng,playerCount:s.players.length,players:s.players.map(p=>({input:inputs[p.id]||{}}))});
  for(const e of r.events){
   if(e.type==='keys')Gates.signal(s.gateState,{eventType:1,broadcastActorType:17});
   if(e.type==='default')for(const p of s.players){p.graphMode=false;p.graphRefYRaw=0;p.graphVyRaw=null;}}
 }
 // Player state 12, OnUpdate_Graph 0x1816c7b30: no walk; Left first, then Right turn; the
 // hover about refY = posY - 48 while Jump is held, else calcGravity, 0 on the ground.
 // Named approximation: landing (the pushback) zeroes the velocity like a walk landing.
 function graphMove(s,p,input,hz,terrain,players){
  const F=65536;if(input.left){p.facingLeft=true;p.lookingRight=false;}else if(input.right){p.facingLeft=false;p.lookingRight=true;}
  const posY=Math.round(AY(p)*F);if(!p.graphRefYRaw)p.graphRefYRaw=posY-48*F;
  const held=!!input.jump,pressed=held&&!p.jump;p.jump=held;
  let vy=p.graphVyRaw??Math.round((p.vy||0)/hz*F);
  const v=Graphs.hoverVelocity({posYRaw:posY,vyRaw:vy,refYRaw:p.graphRefYRaw,grounded:!!p.grounded,held,pressed});
  vy=v===null?vy+Math.min(42598,1277952-vy):v;
  p.vx=0;moveY(p,vy/F,terrain.concat(players.filter(q=>q!==p)));
  if(p.grounded&&vy>0)vy=0;p.graphVyRaw=vy;p.vy=vy/F*hz;
 }
 // ---- Shooting rounds: PlanePlayer / BattlePlanePlayer and PlayerGun -------------
 // source-plane-runtime.js holds OnUpdate_Plane / OnUpdate_BattlePlane and the gun and
 // bullet rules; the plane moves with the walk sweeps against terrain and players.
 function planeMove(s,p,input,hz,terrain,players){
  const F=65536,dt=Math.trunc(F/hz),a=s.autoScrollState,view=a?{x:a.cameraAreaRaw.x,w:a.cameraAreaRaw.width}:{x:0,w:s.map.width*F};
  const others=terrain.concat(players.filter(q=>q!==p&&!q.exit));
  const leftContact=others.some(o=>Math.abs(o.x+o.w-p.x)<0.5&&o.y<p.y+p.h&&o.y+o.h>p.y);
  const r=Planes.planeVelocity({input,posXRaw:Math.round(AX(p)*F),speedRaw:Planes.planeSpeedRaw(s.map.stageScaleRaw||F),viewRaw:view,scrollRaw:a?autoScrollSpeedRaw(s):0,scrollType2:!!a,leftContact});
  if(r.look==='right'){p.facingLeft=false;p.lookingRight=true;}else if(r.look==='left'&&p.plane.lookLeftAllowed){p.facingLeft=true;p.lookingRight=false;}
  if(r.dead&&!p.immortal)return '화면 밖으로 밀려났어요';
  if(r.carriedRaw>0)autoScrollCarry(s,p,r.carriedRaw/F,new Set([p.id]));
  // 6-2 riders: movePlayerVerticalOnPlane 0x1816c9070 (|Velo.x| or |Velo.y| >= 4 raw)
  // MoveContactActor's the top face by (0, Velo.y) before the body moves; the x step
  // reaches them through updateInertia (moveForInertia, a layer-1 collision). Named
  // approximation: riders rise before the plane and sink after it, each stopped by
  // terrain like a walk.
  const group=ridersOf(p,players).filter(q=>!q.plane),apart=q=>terrain.concat(players.filter(o=>o!==q&&o!==p&&!o.exit&&!group.includes(o)));
  const lift=(Math.abs(r.vxRaw)>=4||Math.abs(r.vyRaw)>=4)&&group.length?r.vyRaw/F:0;
  const shift=(q,dy)=>{const g=q.grounded,id=q.supportId;moveY(q,dy,apart(q));q.grounded=g;q.ground=g;q.supportId=id;};
  if(lift<0)for(const q of group.slice().sort((a,b)=>a.y-b.y))shift(q,lift);
  const x0=p.x,y0=p.y;
  p.x+=moveX({...p},r.vxRaw/F,others,s.map.width);moveY(p,r.vyRaw/F,others);
  if(lift>0)for(const q of group.slice().sort((a,b)=>b.y-a.y))shift(q,p.y-y0);
  if(p.x!==x0)for(const q of group)moveX(q,p.x-x0,apart(q),s.map.width);
  p.vx=r.vxRaw/F*hz;p.vy=r.vyRaw/F*hz;p.grounded=false;
  if(p.plane.life){const lr=Planes.lifeUpdate(p.plane.life,dt,s.planeState.rng);if(lr.dead&&!p.immortal)return '비행기가 격추됐어요';}
  return null;
 }
 function planeGunTick(s,inputs,hz){
  const st=s.planeState;if(!st||!st.guns.length)return;const F=65536,a=s.autoScrollState,view=a?{x:a.cameraAreaRaw.x,w:a.cameraAreaRaw.width}:{x:0,w:s.map.width*F};
  const live=s.players.map((p,i)=>({p,i})).filter(o=>!o.p.exit);
  const terrain=solids(s),toRaw=b=>({x:Math.round(b.x*F),y:Math.round(b.y*F),w:Math.round(b.w*F),h:Math.round(b.h*F)}),hit=(u,v)=>u.x<v.x+v.w&&v.x<u.x+u.w&&u.y<v.y+v.h&&v.y<u.y+u.h;
  const r=Planes.gunStep(st,{dtRaw:Math.trunc(F/hz),viewRaw:view,
   players:s.players.map((p,i)=>({index:i,xRaw:Math.round(AX(p)*F),yRaw:Math.round(AY(p)*F),lookLeft:!!p.facingLeft,plane:!!p.plane,state3:!!p.dead,shotHeld:!!(inputs[p.id]&&inputs[p.id].shot),alive:!p.exit&&!p.dead,colorIndex:p.colorIndex??i})),
   blocked:(box,owner)=>live.some(o=>o.i!==owner&&hit(box,toRaw(o.p)))||(s.planeWalls||[]).some(w=>hit(box,toRaw(w))),
   sweep:(box,dx,dy,owner)=>{
    // the earliest body along the step: actors (players, walls) answer event 21, the map is terrain
    const guardR=s.bossState?Bosses.guardRects(s.bossState,bossPlayers(s)):{};
    const targets=[...Object.entries(guardR).map(([i,r])=>({kind:'actor',target:{guard:+i},r})),...(s.bossState?Bosses.bossParts(s.bossState).map(q=>({kind:'actor',target:{boss:q.boss,part:q.part,index:q.index},r:q.rect})):[]),
     ...live.filter(o=>o.i!==owner).map(o=>({kind:'actor',target:{player:o.i},r:toRaw(o.p)})),...Shootings.targets(s.shootingState).map(e=>({kind:'actor',target:{enemy:e.id},r:toRaw(e)})),...(s.planeWalls||[]).map(w=>({kind:'actor',target:{wall:w.id},r:toRaw(w)})),
     ...terrain.filter(b=>!(s.planeWalls||[]).some(w=>w.id===b.id)).map(b=>({kind:'map',chip:b.chip||null,r:toRaw(b)}))];
    let best=null,bt=1;const steps=Math.max(1,Math.ceil(Math.max(Math.abs(dx),Math.abs(dy))/(2*F)));
    for(let k=1;k<=steps&&!best;k++){const t=k/steps,b2={...box,x:box.x+Math.round(dx*t),y:box.y+Math.round(dy*t)};
     for(const o of targets)if(hit(b2,o.r)){best=o;bt=(k-1)/steps;break;}}
    if(!best)return {dxRaw:dx,dyRaw:dy,hit:null};
    return {dxRaw:Math.round(dx*bt),dyRaw:Math.round(dy*bt),hit:best.kind==='map'?{kind:'map',chip:best.chip}:{kind:'actor',target:best.target}};},
   breakChip:(chip,color)=>{if(!(s.planeBreak&&s.planeBreak(chip,color)))Shootings.breakChip(s.shootingState,chip,color);}});
  for(const d of r.damage){if(d.target.enemy){Shootings.enemyHit(s.shootingState,d.target.enemy,null);continue;}
   if(d.target.boss){Bosses.hitBoss(s.bossState,d.target.boss,d.target.part,d.target.index,{gameOverCount:s.gameOverCount||0});continue;}
   if(d.target.player===undefined)continue;const q=s.players[d.target.player];
   // tryAddDamage 0x1816e9050: a guard holder takes no friendly bullet from the front (or a still one)
   if(s.bossState&&s.bossState.guards.some(g=>g.playerIndex===d.target.player)&&(d.vxRaw===0||(d.vxRaw>=0)!==!q.facingLeft))continue;
   if(q&&q.plane&&q.plane.life)Planes.lifeDamage(q.plane.life);}
 }
 // 6-3 PlaneObstacle: generated at the first update (OnStart, actor order), pieces leave
 // behind the camera, DamageRect pieces kill on contact (event 43).
 function planeObstacleTick(s){
  const st=s.planeObstacleState;if(!st||!st.obstacles.length)return null;const F=65536;
  if(!st.started){const guns=s.planeState?s.planeState.guns:[];
   PlaneObstacles.start(st,{rng:s.planeState.rng,playerCount:s.players.length,colors:s.players.map((p,i)=>({c:p.colorIndex??i,i})).filter(o=>guns.some(g=>g.playerIndex===o.i)).map(o=>o.c)});}
  const a=s.autoScrollState;if(a)PlaneObstacles.post(st,{x:a.cameraAreaRaw.x,w:a.cameraAreaRaw.width});
  s.planeWalls=PlaneObstacles.solids(st).filter(b=>!b.chip);s.planeBreak=(chip,color)=>PlaneObstacles.breakChip(st,chip,color);
  for(const w of s.planeWalls){if(!w.damage)continue;
   for(const p of s.players){if(p.exit||p.dead||p.immortal)continue;
    const touch=p.x<=w.x+w.w+0.5&&w.x<=p.x+p.w+0.5&&p.y<=w.y+w.h+0.5&&w.y<=p.y+p.h+0.5;
    if(touch)return {playerId:p.id,reason:'벽에 부딪혔어요'};}}
  return null;
 }
 // 6-1 / 6-2 enemies, their OptimizedBullets and the colour blocks (source-shooting-runtime.js)
 function shootingTick(s,hz){
  const st=s.shootingState;if(!st||!(st.spawners.length||st.pool||st.replacer||st.breakRects.length))return;const F=65536;
  const guns=s.planeState?s.planeState.guns:[];
  if(!st.started)Shootings.start(st,{rng:s.planeState.rng,colors:s.players.map((p,i)=>({c:p.colorIndex??i,i})).filter(o=>guns.some(g=>g.playerIndex===o.i)).map(o=>o.c),validColors:s.players.map((p,i)=>p.colorIndex??i)});
  const a=s.autoScrollState,view=a?{x:a.cameraAreaRaw.x,w:a.cameraAreaRaw.width}:s.danmakuView||{x:0,w:s.map.width*F};
  const terrain=[...s.map.platforms,...Shootings.chipSolids(st)].map(b=>({x:Math.round(b.x*F),y:Math.round(b.y*F),w:Math.round(b.w*F),h:Math.round(b.h*F)}));
  const r=Shootings.step(st,{dtRaw:Math.trunc(F/hz),viewRaw:view,rng:s.planeState.rng,
   players:(()=>{const gr=s.bossState?Bosses.guardRects(s.bossState,bossPlayers(s)):{};return s.players.map((p,i)=>{const b=s.map.topView?tvBody(p):p;return {index:i,xRaw:Math.round(AX(p)*F),yRaw:Math.round(AY(p)*F),alive:!p.exit&&!p.dead,dead:!!p.dead,guardRaw:gr[i]||null,bodyRaw:p.exit?null:{x:Math.round(b.x*F),y:Math.round(b.y*F),w:Math.round(b.w*F),h:Math.round(b.h*F)}};});})(),
   // MapComponent.IsContacted: every chip of the box's range, both ends included
   mapBlocked:box=>terrain.some(t=>box.x<=t.x+t.w&&t.x<=box.x+box.w&&box.y<=t.y+t.h&&t.y<=box.y+box.h)});
  // event 21 on a player: only a life-carrying (battle plane) player loses one (PlayerComponent.OnRecvEvent)
  for(const d of r.damage){const q=s.players[d.player];if(d.danmaku){if(Danmakus.bulletHit(s.danmakuState))danmakuFlash(q,Danmakus.nativeConstants.BULLET_FLASH);continue;}if(q&&q.plane&&q.plane.life)Planes.lifeDamage(q.plane.life);}
 }
 // ---- 8-2 / 8-4: CannonPlayer / ThrowBall / ThrowBallBasket / ThrowBallController -
 // source-throwball-runtime.js holds the native decisions. Balls meet the map through
 // the walk sweep (a blocked step is the map contact), the camera view feeds
 // createAreaInfo exactly as the 8-1 crosshair margins are fed.
 function throwTick(s,inputs,hz){
  const st=s.throwState;if(!st||!st.controller)return;const F=65536,dt=Math.trunc(F/hz);
  const range=()=>{const live=s.players.filter(p=>!p.exit);const xs=live.map(p=>Math.round(AX(p)*F)),ys=live.map(p=>Math.round(AY(p)*F));return xs.length?{left:Math.min(...xs),right:Math.max(...xs),top:Math.min(...ys),bottom:Math.max(...ys)}:null;};
  if(!s.throwCamera&&st.camera)s.throwCamera=CameraNative.create(st.camera,range());
  if(s.throwCamera){const r=range();if(r)CameraNative.update(s.throwCamera,r,dt);}
  const area=s.throwCamera?CameraNative.stageAreaRaw(s.throwCamera):{x:0,y:0,width:s.map.width*F,height:s.map.height*F};
  const walls=s.map.platforms;
  const r=ThrowBalls.step(st,{dtRaw:dt,gravityRaw:Number(BigInt.asIntN(64,BigInt(s.map.stageScaleRaw||F)*42598n)>>16n),viewRaw:{x:area.x,y:area.y,w:area.width,h:area.height},
   players:s.players.map((p,i)=>({index:i,xRaw:Math.round(AX(p)*F),yRaw:Math.round(AY(p)*F),state1:!p.exit&&!p.dead&&!p.faint&&!p.riding&&!p.asBlock,shotHeld:!!(inputs[p.id]&&inputs[p.id].shot),
    alive:!p.exit&&!p.dead,hidden:!!p.exit,bodyRaw:p.exit?null:{x:Math.round(p.x*F),y:Math.round(p.y*F),w:Math.round(p.w*F),h:Math.round(p.h*F)}})),
   sweep:(b,dx,dy)=>{const m=sweepRect({x:b.x/F,y:b.y/F,w:b.w/F,h:b.h/F},dx/F,dy/F,walls),mx=Math.round(m.dx*F),my=Math.round(m.dy*F);return {dxRaw:mx,dyRaw:my,blocked:Math.abs(mx-dx)>1||Math.abs(my-dy)>1};}});
  for(const f of r.faints){const p=s.players[f.index];if(p&&!p.exit)p.faintRequest={vxRaw:f.vxRaw,vyRaw:f.vyRaw};}
  for(const e of r.keyEvents)Gates.signal(s.gateState,e);
 }
 // ---- 14-4: GiantEnemy / hand / PlayerPunch / SwitchTimerActor host --------------
 // source-giant-runtime.js holds the native decisions; the giant has no push back, so
 // it only reports deaths (event 43), punch knocks (event 27: a forced jump that keeps
 // its x speed until landing, PlayerDefault forceJumpX) and timer events.
 function giantTick(s,inputs,hz){
  const st=s.giantState;if(!st||!(st.giants.length||st.punches.length||st.timers.length))return null;const F=65536,ms=s.moleState;
  const plugins=ms&&ms.moles.length?[{update:dt=>Moles.update(ms,dt),targets:out=>Moles.targets(ms,out),overlaps:(pl,out)=>Moles.overlaps(ms,pl,out),post:(dt,out)=>Moles.post(ms,dt,out)}]:[];
  const r=Giants.step(st,{dtRaw:Math.trunc(F/hz),plugins,players:s.players.map((p,i)=>({index:i,xRaw:Math.round(AX(p)*F),yRaw:Math.round(AY(p)*F),lookLeft:!!p.facingLeft,
   state1:!p.exit&&!p.dead&&!p.faint&&!p.riding&&!p.asBlock,shotHeld:!!(inputs[p.id]&&inputs[p.id].shot),alive:!p.exit&&!p.dead}))});
  for(const k of r.knocks){const p=s.players[k.index];if(!p)continue;p.forcedVx=k.vxRaw/F*hz;p.vx=p.forcedVx;p.vy=k.vyRaw/F*hz;p.grounded=false;p.ground=false;p.supportId=null;p.jumpFrame=0;}
  for(const f of r.faints){const p=s.players[f.index];if(p&&!p.exit)p.faintRequest={vxRaw:f.vxRaw,vyRaw:f.vyRaw};}
  for(const e of r.keyEvents){if(e.broadcastActorType!==undefined)Gates.signal(s.gateState,e);else notifyByName(s,e.targetName,e.eventType);}
  return r.deaths.length?{playerId:s.players[r.deaths[0].index].id,reason:r.deaths[0].reason==='hand'?'거인 손에 맞았어요':'거인에게 닿았어요'}:null;
 }
 // ---- Key carry (every round with a key) ------------------------------------
 // KeyComponent, from the saved Ghidra project: OnCollided 0x18186cc20,
 // updatePhase 0x18186c340, OnUpdate 0x18186c2c0, .cctor 0x18186d310.
 //  - the first player (layer 1) it touches becomes its holder (pickup SE, event
 //    61 to slot 3's name); another player touching it takes it over, and the
 //    previous holder is excluded for QFP._0_25 (refreshed while it keeps touching);
 //  - it moves 0x1999/0x10000 of the way to its target each update and snaps
 //    when (d.x^2 + d.y^2) >> 16 < 0x1999: for a player holder the target is the
 //    holder's Pos + rect X (+ W when facing left), + rect Y + slot-4 offset;
 //  - touching the Goal (layer 12) opens it (Goal.OnCollided layer 10) and uses
 //    the key: hidden next update, event 40 to the holder.
 const KEY_RECT={x:-16,y:-28,w:32,h:56},KEY_EXCLUDE=Math.trunc(0.25*65536);
 // Key.InitCollision 0x18186bdb0 (pivot 0) after AddActor: x stage scale
 function keyRectOf(s){const S=(s.map.stageScaleRaw||65536)/65536;return S===1?KEY_RECT:{x:KEY_RECT.x*S,y:KEY_RECT.y*S,w:KEY_RECT.w*S,h:KEY_RECT.h*S};}
 function keyInit(s){
  if(!s.map.key)return null;const k=s.map.key;
  const st={holderId:null,excludeId:null,excludeRaw:0,phase:0,used:false,justAttached:false,
   xRaw:Math.round((k.x-keyRectOf(s).x)*65536),yRaw:Math.round((k.y-keyRectOf(s).y)*65536),
   initXRaw:Math.round((k.x-keyRectOf(s).x)*65536),initYRaw:Math.round((k.y-keyRectOf(s).y)*65536),holdYRaw:s.map.keyHoldYRaw||0};
  // KeyComponent.OnStart 0x18186bf10: slot 8 names the holder it starts on (flag 2: not this update)
  if(s.map.keyAttach&&s.giantState){const id=Giants.attachKey(s.giantState,s.map.keyAttach,{xRaw:st.xRaw,yRaw:st.yRaw});if(id){st.holderId=id;st.justAttached=true;}}
  return st;
 }
 function keyTick(s,inputs,hz){
  if(!s.map.key)return;if(!s.keyState)s.keyState=keyInit(s);const k=s.keyState;if(!k||k.used&&k.phase>=3)return;const F=65536;
  // OnUpdate: the exclusion timer runs down
  if(k.excludeRaw>0){k.excludeRaw-=Math.trunc(F/hz);if(k.excludeRaw<=0){k.excludeRaw=0;k.excludeId=null;}}
  // updatePhase
  const holder=k.holderId&&s.players.find(p=>p.id===k.holderId&&!p.exit);const ghostHolder=k.holderId&&s.ghostActors&&s.ghostActors[k.holderId];
  let target=null;
  // the holder's collider-1 GetRect corner (+ width when looking left), source-key-lifecycle.js
  if(holder){target={xRaw:Math.round((holder.x+(holder.facingLeft?holder.w:0))*F),yRaw:Math.round(holder.y*F)+k.holdYRaw};}
  else if(k.holderId&&s.ghostActors&&s.ghostActors[k.holderId]){const g=s.ghostActors[k.holderId];
   target={xRaw:g.positionRaw.xRaw+(GHOST_RECT.x+(g.facingLeft?GHOST_RECT.w:0))*F,yRaw:g.positionRaw.yRaw+GHOST_RECT.y*F+(s.map.keyGhostYRaw||0)};}
  const giant=k.holderId&&s.giantState&&Giants.keyHolder(s.giantState,k.holderId);if(giant)target=giant;
  const kart=k.holderId&&s.goKartState&&s.goKartState.karts.find(q=>q.id===k.holderId);
  if(kart)target={xRaw:kart.xRaw+GoKarts.nativeConstants.BODY.xRaw,yRaw:kart.yRaw+GoKarts.nativeConstants.BODY.yRaw+k.holdYRaw};
  if(k.phase===2){k.phase=3;s.map.key.hidden=true;return;}
  if(k.phase===1&&!holder&&!ghostHolder&&!kart&&!giant)target={xRaw:k.initXRaw,yRaw:k.initYRaw};
  if(target){const dx=target.xRaw-k.xRaw,dy=target.yRaw-k.yRaw;
   if(Number((BigInt(dy)*BigInt(dy))>>16n)+Number((BigInt(dx)*BigInt(dx))>>16n)<0x1999){k.xRaw=target.xRaw;k.yRaw=target.yRaw;if(k.phase===1)k.phase=0;}
   else{k.xRaw+=Number((BigInt(dx)*0x1999n)>>16n);k.yRaw+=Number((BigInt(dy)*0x1999n)>>16n);}}
  k.justAttached=false;
  const KR=keyRectOf(s);s.map.key.x=k.xRaw/F+KR.x;s.map.key.y=k.yRaw/F+KR.y;
 }
 function keyCollide(s){
  const k=s.keyState;if(!k||k.used||!s.keyActive||!s.map.key)return;
  for(const p of s.players){if(p.exit||p.asBlock||p.dead||p.fakeCaged||!overlap(p,s.map.key))continue;
   if(p.id===k.holderId)continue;
   if(p.id===k.excludeId){k.excludeRaw=KEY_EXCLUDE;continue;}
   if(k.justAttached)continue;
   if(!k.holderId){s.keyTaken=true;s.map.key.taken=true;if(s.map.keyTarget)notifyByName(s,s.map.keyTarget,61);}
   else{if(!s.keyTaken&&s.giantState&&s.giantState.giants.some(g=>g.id===k.holderId)){s.keyTaken=true;s.map.key.taken=true;}k.excludeId=k.holderId;k.excludeRaw=KEY_EXCLUDE;}
   if(s.ghostActors&&s.ghostActors[k.holderId])k.takenFromGhost=true;
   k.holderId=p.id;k.justAttached=true;}
  for(const g of goKartPseudo(s)){if(g.kartId===k.holderId||!overlap(g,s.map.key))continue;
   if(k.justAttached)continue;
   if(!k.holderId){s.keyTaken=true;s.map.key.taken=true;if(s.map.keyTarget)notifyByName(s,s.map.keyTarget,61);}
   else{k.excludeId=k.holderId;k.excludeRaw=KEY_EXCLUDE;}
   k.holderId=g.kartId;k.justAttached=true;break;}
  if(s.giantState)for(const g of Giants.keyBoxes(s.giantState)){if(g.id===k.holderId||!overlap(g,s.map.key))continue;
   if(g.id===k.excludeId){k.excludeRaw=KEY_EXCLUDE;continue;}
   if(k.justAttached)continue;
   if(k.holderId){k.excludeId=k.holderId;k.excludeRaw=KEY_EXCLUDE;}
   k.holderId=g.id;k.justAttached=true;}
  for(const g of ghostKeyBoxes(s)){if(g.id===k.holderId||!overlap(g,s.map.key))continue;
   if(g.id===k.excludeId){k.excludeRaw=KEY_EXCLUDE;continue;}
   // a ghost cannot take back a key a player took from it (flag 0x10)
   if(k.justAttached||k.takenFromGhost)continue;
   if(!k.holderId){s.keyTaken=true;s.map.key.taken=true;if(s.map.keyTarget)notifyByName(s,s.map.keyTarget,61);}
   else{k.excludeId=k.holderId;k.excludeRaw=KEY_EXCLUDE;}
   k.holderId=g.id;k.justAttached=true;}
  // the key against the Goal: Goal opens, key is used
  if(s.map.exit&&overlap(s.map.key,s.map.exit)){if(!s.goalOpen)s.goalOpen=true;k.used=true;k.phase=2;}
 }
 // ---- 7-4: Lift (sine) host ----------------------------------------------
 // source-sinelift-devices.js holds LiftComponent; preflight and vertical carry
 // go through the shared contact transport over the four-face contact world
 // (the MoveWall host's named approximation). Horizontal steps reach riders
 // through inertiaCarry like every other moving solid.
 function sineLiftTick(s,hz){
  const st=s.sineLiftState;if(!st||!st.lifts.length)return;
  for(const l of st.lifts){
   const box=SineLifts.solids({lifts:[l]})[0],world=sideContactWorld(s,[{...box,actorType:73}],hz);
   SineLifts.update(l,{dtRaw:Math.trunc(65536/hz),
    isEnableMoveContactActor:(lift,dir)=>MoveContact.isEnableMoveContactActor(world,lift.id,dir,{face:0}),
    moveContactActor:(lift,delta,face)=>{const r=MoveContact.moveContactActor(world,lift.id,delta,{face});
     for(const m of r.moved){const p=s.players.find(q=>q.id===m.id);if(p){p.x+=m.xRaw/65536;p.y+=m.yRaw/65536;continue;}const cb=s.colorBoxActors&&s.colorBoxActors[m.id];if(cb){cb.xRaw+=m.xRaw;cb.yRaw+=m.yRaw;}}return r;}});
  }
 }
 // ---- 4-2: Gear (rolling) host ---------------------------------------------
 // source-gear-devices.js: update (velocity), contact (flip / bounce / event 43),
 // integrateActorMotion (OnUpdate2), actorJumpPost (Post1: pending jump,
 // gravity), rotate. This keeps the gear actors and finds their contacts with
 // the native circle (radius 45 at -2,-48). Named approximations:
 //  - collision: the circle is pushed out of terrain / solids along the
 //    centre-to-nearest-point normal (as the ball host), contacts are reported
 //    with that normal; face1 (standing) = a contact whose normal is straight down;
 //  - players are killed through event 43 (immortality survives), other solid
 //    actors (PushBox) only give the flip contact.
 const RG_R=45,RG_DX=-2,RG_DY=-48;
 function rollGearTick(s,hz){
  const st=s.rollGearState;if(!st||!st.gears.length)return [];
  const F=65536;
  if(!s.rollGearActors){s.rollGearActors={};for(const g of st.gears){const p0=Gears.initialPositionRaw(g);s.rollGearActors[g.id]={actorId:g.id,xRaw:p0.xRaw,yRaw:p0.yRaw,vxRaw:0,vyRaw:0,accelXRaw:0,accelYRaw:0,enableJump:true,pendingJumpXRaw:0,pendingJumpYRaw:0,face1:false};
   g.preXRaw=p0.xRaw;g.preYRaw=p0.yRaw;}}
  const snaps=()=>st.gears.map(g=>({...s.rollGearActors[g.id],collisionExists:true,face1Contact:s.rollGearActors[g.id].face1}));
  // Gear.OnUpdate
  const before=Gears.beforeStep(st,{actorSnapshots:snaps()});
  for(const v of before.actorVelocities){const a=s.rollGearActors[v.actorId];a.vxRaw=v.vxRaw;a.vyRaw=v.vyRaw;}
  // Actor.OnUpdate2
  for(const g of st.gears){const a=s.rollGearActors[g.id];Object.assign(a,Gears.integrateActorMotion(a));}
  // collision phase
  const contacts=[],dead=[],solidsNow=baseSolids(s),live=s.players.filter(p=>!p.exit&&!p.asBlock);
  for(const g of st.gears){const a=s.rollGearActors[g.id];let cx=a.xRaw/F+RG_DX,cy=a.yRaw/F+RG_DY,down=false;
   for(const b of solidsNow){const c=circleRectContact(cx,cy,RG_R,b);if(!c)continue;cx-=c.nx*c.depth;cy-=c.ny*c.depth;if(c.ny>0.99)down=true;
    const box=Devices.solids(s.deviceState).find(d=>d.id===b.id);
    contacts.push(box?{actorId:g.id,contactType:1,otherActorExists:true,otherLayer:2,otherId:b.id,otherVxRaw:Math.round((box.vx||0)*F),normalXRaw:Math.round(c.nx*F),normalYRaw:Math.round(c.ny*F)}
     :{actorId:g.id,contactType:0,normalXRaw:Math.round(c.nx*F),normalYRaw:Math.round(c.ny*F)});}
   for(const p of live){const c=circleRectContact(cx,cy,RG_R,p);if(!c)continue;
    contacts.push({actorId:g.id,contactType:1,otherActorExists:true,otherLayer:1,otherId:p.id,otherVxRaw:Math.round((p.vx||0)/hz*F),normalXRaw:Math.round(c.nx*F),normalYRaw:Math.round(c.ny*F)});}
   for(const h of st.gears){if(h===g)continue;const b=s.rollGearActors[h.id],ox=b.xRaw/F+RG_DX,oy=b.yRaw/F+RG_DY,dx=ox-cx,dy=oy-cy,d=Math.hypot(dx,dy);
    if(d<2*RG_R&&d>0)contacts.push({actorId:g.id,contactType:1,otherActorExists:true,otherLayer:8,otherId:h.id,otherVxRaw:b.vxRaw,normalXRaw:Math.round(dx/d*F),normalYRaw:Math.round(dy/d*F)});}
   // resting exactly on a top face (within half a pixel) is the face-1 contact too
   if(!down)down=solidsNow.some(b=>cx>=b.x&&cx<=b.x+b.w&&Math.abs(cy+RG_R-b.y)<0.5);
   a.xRaw=Math.round((cx-RG_DX)*F);a.yRaw=Math.round((cy-RG_DY)*F);a.face1=down;}
  const out=Gears.afterStep(st,{actorSnapshots:snaps(),contacts});
  for(const e of out.events)if(e.eventType===43){const p=s.players.find(q=>q.id===e.targetId);if(p&&!p.immortal)dead.push(p.id);}
  for(const j of out.jumps){const a=s.rollGearActors[j.actorId];Object.assign(a,Gears.requestGearJump(a,j));}
  // Actor.Post1
  for(const g of st.gears){const a=s.rollGearActors[g.id];Object.assign(a,Gears.actorJumpPost(a,{warpTaken:false,collisionExists:true,face1Contact:a.face1,gravityRaw:Gears.stageGravityRaw(s.map.stageScaleRaw||F)}));}
  return dead;
 }
 // Event 61 / 60 to a named actor, delivered at once (Frame.NotifyEvent by name):
 // SwitchTargetGroup re-sends to its targets, Gear toggles standby.
 function notifyByName(s,name,eventType,depth=0){
  if(!name||depth>8)return;
  if(s.targetGroupState&&s.targetGroupState.groups.some(g=>g.name===name)){
   const r=TargetGroups.signal(s.targetGroupState,{targetName:name,eventType});for(const e of r.events||[])notifyByName(s,e.targetName??e.target,e.eventType??e.event,depth+1);}
  if(s.rollGearState&&s.rollGearState.gears.some(g=>g.name===name))Gears.signal(s.rollGearState,{targetName:name,eventType});
  if(s.batState)for(const c of s.batState.cages)if(c.name===name)BatEnemies.cageReceiveEvent(c,eventType);
  if(s.frontSwitchState)for(const r of [...s.frontSwitchState.rects,...s.frontSwitchState.switches])if(r.name===name)FrontSwitches.receiveEvent(r,eventType);
  for(const r of s.relayState.relays)if(r.type==='JumpStand'&&r.name===name)Relay.jumpStandSignal(r,eventType);
 }
 function rollGearSolids(s){return [];}
 // ---- MoveWall host (12-4, 2-4) -------------------------------------------
 // source-movewall-devices.js runs the native wall states (idle, wait, outward
 // 2 px per update, return 1.5); its preflight and push go through the shared
 // native contact transport (source-move-contact.js) over a contact world
 // built from bodies touching this update (within half a pixel) - the same
 // named approximation as the UpDownLift host, on all four faces:
 //  - b touching a's face F is in a's contacts with F's normal;
 //  - a player's mapNormals are the faces where terrain touches it.
 // Players and ColorBoxes are transported: ActorComponent's MoveByContact
 // callback dictionary registers only PlayerMagnet (ordinal 72, initCallbacks
 // 0x18177c2ff), so neither has a callback and both just take the delta.
 const SIDE_NORMALS=[{x:0,y:-1},{x:0,y:1},{x:-1,y:0},{x:1,y:0}];
 const SIDE_TOUCH=[(a,b)=>Math.abs(b.y+b.h-a.y)<0.5&&b.x<a.x+a.w&&b.x+b.w>a.x,(a,b)=>Math.abs(a.y+a.h-b.y)<0.5&&b.x<a.x+a.w&&b.x+b.w>a.x,
  (a,b)=>Math.abs(b.x+b.w-a.x)<0.5&&b.y<a.y+a.h&&b.y+b.h>a.y,(a,b)=>Math.abs(a.x+a.w-b.x)<0.5&&b.y<a.y+a.h&&b.y+b.h>a.y];
 function sideContactWorld(s,roots,hz){
  const F=65536,snap=v=>Math.round(v*F)/F,live=s.players.filter(p=>!p.exit&&!p.asBlock),terrain=s.map.platforms;
  const cboxes=colorBoxSolids(s).map(b=>({...b,actorType:7,contactResponse:'none',vx:(s.colorBoxActors[b.id].vxRaw||0)/F,vy:(s.colorBoxActors[b.id].vyRaw||0)/F}));
  const boxes=[...roots,...live.map(p=>({id:p.id,x:p.x,y:p.y,w:p.w,h:p.h,actorType:27,vx:(p.vx||0)/hz,vy:(p.vy||0)/hz})),...cboxes];
  const movable=b=>b.actorType===27||b.actorType===7;
  return {bodies:boxes.map(a=>({id:a.id,entityId:a.id,actorType:a.actorType,contactResponse:a.contactResponse,x:snap(a.x),y:snap(a.y),hasCollision:true,flags:0,actor:true,
   velocity:{x:snap(a.vx||0),y:snap(a.vy||0)},
   mapNormals:movable(a)?SIDE_NORMALS.filter((n,f)=>terrain.some(t=>SIDE_TOUCH[f](a,t))):[],
   contacts:boxes.flatMap(b=>b===a||!movable(b)?[]:SIDE_NORMALS.map((n,f)=>SIDE_TOUCH[f](a,b)?{id:b.id,normal:n}:null).filter(Boolean))}))};
 }
 // After a wall step, a body it now overlaps (it was not touching, so not in
 // the contact world) is pushed out along the wall's motion - the collision
 // phase's pushback (named approximation, same as the magnet host's).
 function moveWallPushOut(s,before){
  const F=65536;
  for(const w of SpeedSwitches.solids(s.speedSwitchState)){const b0=before.find(x=>x.id===w.id);if(!b0||b0.x===w.x)continue;const dir=Math.sign(w.x-b0.x);
   for(const p of s.players)if(!p.exit&&!p.asBlock&&overlap(p,w))p.x=dir>0?w.x+w.w:w.x-p.w;
   for(const cb of colorBoxSolids(s))if(overlap(cb,w)){const a=s.colorBoxActors[cb.id],nx=dir>0?w.x+w.w:w.x-cb.w;a.xRaw+=Math.round((nx-cb.x)*F);}}
 }
 function moveWallCallbacks(s,hz){
  const st=s.speedSwitchState,worlds={};
  const worldFor=id=>{if(!worlds[id]){const w=SpeedSwitches.solids(st).find(x=>x.id===id);worlds[id]=sideContactWorld(s,[{...w,actorType:23}],hz);}return worlds[id];};
  return {
   isEnableMoveContactActor:req=>MoveContact.isEnableMoveContactActor(worldFor(req.wallId),req.wallId,req.delta,{face:req.face||0}),
   moveContactActor:req=>{const r=MoveContact.moveContactActor(worldFor(req.wallId),req.wallId,req.delta,{face:req.face,isEnableIgnoreTargetVelo:true,isEnableRecursive:true});
    for(const m of r.moved){const p=s.players.find(q=>q.id===m.id);if(p){p.x+=m.xRaw/65536;p.y+=m.yRaw/65536;continue;}
     const cb=s.colorBoxActors&&s.colorBoxActors[m.id];if(cb){cb.xRaw+=m.xRaw;cb.yRaw+=m.yRaw;}}return r;}};
 }
 // ---- ColorBox host (12-2, 15-2, 2-4) --------------------------------------
 // source-colorbox-devices.js decides the box's velocity (only its own player's
 // push moves it, 1 px per update; jump / gravity / forces); this keeps the
 // box actors and answers its contact questions. Named approximations:
 //  - contacts are bodies touching a face within half a pixel this update,
 //    ordered terrain-free: players by index, then boxes by creation;
 //  - Frame.GetGravity = the player increment 42598, jump velocity = the
 //    player's NATIVE.jump; the collision phase is a move-then-stop against
 //    solids and live players (a box rests on players, as in PICO PARK);
 //  - a rider on a box is not carried sideways (horizontal carry is still an
 //    open question for every pushed solid in this runtime).
 function colorBoxBodies(s){
  const F=65536,out=[];
  s.players.forEach((p,i)=>{if(!p.exit&&!p.asBlock)out.push({id:p.id,kind:'player',index:i,x:p.x,y:p.y,w:p.w,h:p.h,layer:1});});
  for(const b of s.colorBoxState.boxes){const a=s.colorBoxActors[b.id];if(!a||a.hidden)continue;
   out.push({id:b.id,kind:'box',x:(a.xRaw+b.rect.xRaw)/F,y:(a.yRaw+b.rect.yRaw)/F,w:b.rect.widthRaw/F,h:b.rect.heightRaw/F,layer:b.enableJump?5:2});}
  return out;
 }
 const CB_TOUCH=[(a,b)=>Math.abs(b.y+b.h-a.y)<0.5&&b.x<a.x+a.w&&b.x+b.w>a.x,(a,b)=>Math.abs(a.y+a.h-b.y)<0.5&&b.x<a.x+a.w&&b.x+b.w>a.x,
  (a,b)=>Math.abs(b.x+b.w-a.x)<0.5&&b.y<a.y+a.h&&b.y+b.h>a.y,(a,b)=>Math.abs(a.x+a.w-b.x)<0.5&&b.y<a.y+a.h&&b.y+b.h>a.y];
 function colorBoxTick(s,inputs,hz){
  const st=s.colorBoxState;if(!st||!st.boxes.length)return;
  const F=65536;
  if(!s.colorBoxActors){s.colorBoxActors={};for(const b of st.boxes){const p0=ColorBoxes.initialPositionRaw(b);s.colorBoxActors[b.id]={xRaw:p0.xRaw,yRaw:p0.yRaw,vxRaw:0,vyRaw:0,actorFlags:b.actorFlags};}}
  s.cbJumpPrev=s.cbJumpPrev||{};
  const jumpEdge={};for(const p of s.players){const held=!!(inputs[p.id]&&inputs[p.id].jump);jumpEdge[p.id]=held&&!s.cbJumpPrev[p.id];s.cbJumpPrev[p.id]=held;}
  const terrain=baseSolids(s).filter(b=>!st.boxes.some(x=>x.id===b.id));
  for(const b of st.boxes){const a=s.colorBoxActors[b.id];if(a.hidden)continue;
   const bodies=colorBoxBodies(s),me=bodies.find(q=>q.id===b.id),others=bodies.filter(q=>q.id!==b.id);
   const ctx={
    getCollision:actor=>({id:actor&&actor.id!==undefined?actor.id:b.id}),
    getContactCollisionList:(c,face)=>{const src=c.id===b.id?me:bodies.find(q=>q.id===c.id);return src?others.filter(o=>o.id!==src.id&&CB_TOUCH[face](src,o)).map(o=>o.id):[];},
    getCollisionById:id=>{const o=bodies.find(q=>q.id===id);return o?{id,actorId:id,layer:o.layer}:null;},
    getActor:id=>{const p=s.players.find(q=>q.id===id);if(p)return {id,vxRaw:Math.round((p.vx||0)/hz*F),vyRaw:Math.round((p.vy||0)/hz*F)};const x=s.colorBoxActors[id];return x?{id,vxRaw:x.vxRaw,vyRaw:x.vyRaw}:null;},
    getPlayer:id=>{const i=s.players.findIndex(q=>q.id===id);return i>=0?{playerIndex:i}:null;},
    isContacted:(c,face)=>{const src=c.id===b.id?me:bodies.find(q=>q.id===c.id);return !!src&&(terrain.some(o=>CB_TOUCH[face](src,o))||others.some(o=>o.id!==src.id&&CB_TOUCH[face](src,o)));},
    getPlayerByIndex:i=>{const p=s.players[i];return p&&!p.exit?p:null;},
    isPressInput:(p,n)=>n===8&&!!jumpEdge[p.id],
    isOnInput:(p,n)=>n===8&&!!(inputs[p.id]&&inputs[p.id].jump),
    getJumpVelo:()=>Math.round(NATIVE.jump*F),
    getGravityRaw:()=>Math.round(NATIVE.gravity*F)};
   const r=ColorBoxes.update(b,{vxRaw:a.vxRaw,vyRaw:a.vyRaw,actorFlags:a.actorFlags},ctx);
   a.vxRaw=r.actor.vxRaw;a.vyRaw=r.actor.vyRaw;
   // OnUpdate2 then the collision phase: move x, then y, stopping on solids
   const obstacles=[...terrain,...others];
   const box={x:me.x,y:me.y,w:me.w,h:me.h};let dx=a.vxRaw/F,dy=a.vyRaw/F;
   // bodies only touching above / below (a stacked box) do not block sideways
   let nx=box.x+dx;for(const o of obstacles)if(box.y<o.y+o.h-0.01&&box.y+box.h>o.y+0.01){if(dx>0&&box.x+box.w<=o.x+0.001)nx=Math.min(nx,o.x-box.w);if(dx<0&&box.x>=o.x+o.w-0.001)nx=Math.max(nx,o.x+o.w);}
   let ny=box.y+dy;for(const o of obstacles)if(nx<o.x+o.w&&nx+box.w>o.x){if(dy>=0&&box.y+box.h<=o.y+0.001&&ny+box.h>=o.y){ny=Math.min(ny,o.y-box.h);}if(dy<0&&box.y>=o.y+o.h-0.001&&ny<o.y+o.h)ny=Math.max(ny,o.y+o.h);}
   a.xRaw=Math.round((nx-b.rect.xRaw/F)*F);a.yRaw=Math.round((ny-b.rect.yRaw/F)*F);
   if(ny!==box.y+dy&&dy>0)a.vyRaw=0;
  }
 }
 function colorBoxSolids(s){
  if(!s.colorBoxState||!s.colorBoxState.boxes.length||!s.colorBoxActors)return [];const F=65536;
  return s.colorBoxState.boxes.filter(b=>!s.colorBoxActors[b.id].hidden).map(b=>{const a=s.colorBoxActors[b.id];return {id:b.id,x:(a.xRaw+b.rect.xRaw)/F,y:(a.yRaw+b.rect.yRaw)/F,w:b.rect.widthRaw/F,h:b.rect.heightRaw/F};});
 }
 // ---- 3-3 / 5-3: PlayerMagnet host ----------------------------------------
 // source-playermagnet-devices.js holds the native magnet decisions; this hands
 // it the players as actors and applies event 16. Named approximations:
 //  - contacted(face): the player's rect touches a solid within half a pixel;
 //  - after the magnet moves a caught player, an overlap with a solid is pushed
 //    out along the move, standing in for the collision phase's pushback;
 //  - the collision phase (candidates) runs right after the magnets update.
 const MAG_RECT={heightRaw:46*65536,widthRaw:32*65536,xRaw:-16*65536,yRaw:-47*65536};
 function magnetWorld(s,inputs,hz){
  const F=65536,solidsNow=baseSolids(s);
  const touch=(p,face)=>solidsNow.some(b=>face==='left'?Math.abs(b.x+b.w-p.x)<0.5&&b.y<p.y+p.h&&b.y+b.h>p.y:face==='right'?Math.abs(p.x+p.w-b.x)<0.5&&b.y<p.y+p.h&&b.y+b.h>p.y:Math.abs(b.y+b.h-p.y)<0.5&&b.x<p.x+p.w&&b.x+b.w>p.x);
  return {
   actors:()=>s.players.map((p,i)=>({id:p.id,index:i,isPlayer:true,catchable:true,xRaw:Math.round(AX(p)*F),yRaw:Math.round(AY(p)*F),rect:MAG_RECT,
    facingLeft:!!p.facingLeft,vxRaw:Math.round((p.vx||0)/hz*F),vyRaw:Math.round((p.vy||0)/hz*F),canInput:!p.inputLocked,
    inputHeld:!!(inputs[p.id]&&inputs[p.id].shot),exited:!!p.exit||!!p.dead||!!p.asBlock})),
   // Player.OnRecvEvent_Default event 16: SetCatched + velocity 0; refused only
   // when already caught twice and asked to catch.
   catchEvent:(id,catching)=>{const p=s.players.find(q=>q.id===id);if(!p)return 0;
    if(catching&&(p.catchLevel||0)>=2)return 0;
    p.catchLevel=catching?Math.min(2,(p.catchLevel||0)+1):0;p.vx=0;p.vy=0;if(catching){p.grounded=false;p.supportId=null;}return 1;},
   contacted:(id,face)=>{const p=s.players.find(q=>q.id===id);return !!p&&touch(p,face);},
   moveTarget:(id,dx,dy)=>{const p=s.players.find(q=>q.id===id);if(!p)return;
    p.x+=dx/F;for(const b of solidsNow)if(overlap(p,b))p.x=dx>0?b.x-p.w:b.x+b.w;
    p.y+=dy/F;for(const b of solidsNow)if(overlap(p,b))p.y=dy>0?b.y-p.h:b.y+b.h;}
  };
 }
 function magnetTick(s,inputs,hz){
  if(!s.magnetState||!s.magnetState.magnets.length)return;
  const w=magnetWorld(s,inputs,hz);PlayerMagnets.update(s.magnetState,w);PlayerMagnets.collide(s.magnetState,w);
 }
 function magnetPost(s,hz){if(s.magnetState&&s.magnetState.magnets.length)PlayerMagnets.post(s.magnetState,magnetWorld(s,{},hz));}
 // ---- 5-4: PlayerWarpGun host ---------------------------------------------
 // source-playerwarpgun-devices.js: the first bullet that hits another player
 // captures them (event 65: hidden and paused), the next bullet that hits
 // anything puts them back beside that point (event 66). Named approximations:
 //  - bullet motion: straight by its velocity; on terrain it stops flush with the
 //    wall, as Map.Move's pushback leaves it, and reports OnContacted with the
 //    travel direction as normal (what OnCollided substitutes for its normal);
 //  - the shooter's own body never reports a contact (same reading as 14-3);
 //  - IsCollidedByPushBackTarget(mask 3) at a release candidate = the target's
 //    rect overlaps a solid or another live player;
 //  - the bullet's camera area is the live players' span widened by half a view.
 const WG_RECT={xRaw:-16*65536,yRaw:-47*65536,widthRaw:32*65536,heightRaw:46*65536};
 function warpGunTick(s,inputs,hz){
  const st=s.warpGunState;if(!st||!st.guns.length)return;
  const F=65536,live=s.players.filter(p=>!p.exit&&!p.asBlock),solidsNow=baseSolids(s);
  s.warpShotPrev=s.warpShotPrev||{};
  const facts=s.players.map((p,i)=>{const held=!!(inputs[p.id]&&inputs[p.id].shot),edge=held&&!s.warpShotPrev[p.id];s.warpShotPrev[p.id]=held;
   return {id:p.id,actorIndex:i,playerIndex:i,colorIndex:p.colorIndex??i,actorFlags:p.facingLeft?0x400:0,xRaw:Math.round(AX(p)*F),yRaw:Math.round(AY(p)*F),
    scaleRaw:F,directionRaw:{xRaw:F,yRaw:F},gunScaleRaw:F,sortingOrder:0,pressInput9:edge&&!p.exit&&!p.asBlock};});
  const colorByPlayerIndex=[0,1,2,3,4,5,6,7];
  const dispatchActorEvent=e=>{const p=s.players.find(q=>q.id===e.targetId);if(!p)return 0;
   if(e.eventType===30)return s.players.indexOf(p)+1; // Player.OnRecvEvent 0x1e: m_PlayerIndex + 1
   if(e.eventType===65){p.asBlock=true;p.vx=0;p.vy=0;p.grounded=false;p.supportId=null;}
   else if(e.eventType===66){p.asBlock=false;setAnchor(p,e.positionRaw.xRaw/F,e.positionRaw.yRaw/F);p.vx=0;p.vy=0;}
   return 0;};
  const xs=live.map(p=>p.x),lo=(xs.length?Math.min(...xs):0)-480,hi=(xs.length?Math.max(...xs):0)+512;
  const before=WarpGuns.beforeStep(st,{players:facts,dtRaw:1092,cameraViewRaw:{xRaw:Math.round(lo*F),widthRaw:Math.round((hi-lo)*F)},colorByPlayerIndex});
  const moved=[],contacts=[];
  for(const req of before.actorMotionRequests){const b=st.bullets.find(q=>q.id===req.id);if(!b)continue;
   let x=b.xRaw+req.velocityRaw.xRaw,y=b.yRaw+req.velocityRaw.yRaw;
   if(!req.collisionDisabled){const box={x:x/F-5,y:y/F-5,w:10,h:10},dir=Math.sign(req.velocityRaw.xRaw)||1;
    const wall=solidsNow.filter(t=>overlap(box,t)).sort((a,c)=>dir>0?a.x-c.x:(c.x+c.w)-(a.x+a.w))[0];
    const owner=s.players[b.playerIndex],hit=live.filter(p=>p!==owner&&overlap(box,p)).sort((a,c)=>dir*(a.x-c.x))[0];
    const g=st.guns.find(q=>q.id===b.gunId),target=g&&g.targetId?s.players.find(q=>q.id===g.targetId):null;
    const queries=(normal)=>target?WarpGuns.releaseCandidates({...b,xRaw:x,yRaw:y},WG_RECT,normal).map(pos=>{const r={x:pos.xRaw/F-16,y:pos.yRaw/F-47,w:32,h:46};
     return {targetId:target.id,mask:3,positionRaw:pos,blocked:solidsNow.some(t=>overlap(r,t))||live.some(q=>q!==target&&overlap(r,q))};}):[];
    if(wall){x=Math.round((dir>0?wall.x-5:wall.x+wall.w+5)*F);const normal={xRaw:dir*F,yRaw:0};
     contacts.push({bulletId:b.id,kind:'OnContacted',normalRaw:normal,targetActor:null,targetRectRaw:WG_RECT,velocityXRaw:req.velocityRaw.xRaw,releaseQueries:queries(normal)});}
    else if(hit)contacts.push({bulletId:b.id,kind:'OnCollided',targetActor:{id:hit.id,actorType:27,playerIndex:s.players.indexOf(hit)},targetRectRaw:WG_RECT,velocityXRaw:req.velocityRaw.xRaw,releaseQueries:queries({xRaw:dir*F,yRaw:0})});}
   moved.push({id:b.id,xRaw:x,yRaw:y});}
  WarpGuns.afterStep(st,{players:facts,bulletActorStates:moved,contacts,exitedBulletIds:before.deleteActorIds,dispatchActorEvent,colorByPlayerIndex});
 }
 // ---- 5-4: UpDownLift host ------------------------------------------------
 // source-updownlift-devices.js runs the native sine timer, the pushback
 // preflight and the rider transport over a cached contact world. The runtime
 // has no native contact cache, so the world is built from bodies that touch
 // (within 0.5px) this tick - the named approximation:
 //  - a body resting on another is in the lower one's contacts with normal Up,
 //    and the lower one is in its contacts with normal Down;
 //  - mapNormals: Up when terrain touches the head, Down when it touches the feet.
 // Transport moves riders only; the lift's own position is base + offset.
 const UDL_UP={x:0,y:-1},UDL_DOWN={x:0,y:1};
 function upDownLiftTick(s){
  const st=s.upDownLiftState;if(!st||!st.lifts.length)return;
  const F=65536,snap=v=>Math.round(v*F)/F,live=s.players.filter(p=>!p.exit&&!p.asBlock),terrain=s.map.platforms;
  const boxes=[...UpDownLifts.solids(st).map(b=>({...b,actorType:40})),...live.map(p=>({id:p.id,x:p.x,y:p.y,w:p.w,h:p.h,actorType:27}))];
  const across=(a,b)=>a.x<b.x+b.w&&a.x+a.w>b.x,on=(a,b)=>across(a,b)&&Math.abs(a.y+a.h-b.y)<0.5;
  const bodies=boxes.map(a=>({id:a.id,entityId:a.id,actorType:a.actorType,x:snap(a.x),y:snap(a.y),hasCollision:true,flags:0,actor:true,
   mapNormals:a.actorType===27?[...(terrain.some(t=>on(a,t))?[UDL_DOWN]:[]),...(terrain.some(t=>on(t,a))?[UDL_UP]:[])]:[],
   contacts:[...boxes.filter(b=>b!==a&&b.actorType===27&&on(b,a)).map(b=>({id:b.id,normal:UDL_UP})),...boxes.filter(b=>b!==a&&b.actorType===27&&on(a,b)).map(b=>({id:b.id,normal:UDL_DOWN}))]}));
  const r=UpDownLifts.beforeStep(st,{dtRaw:1092,contactWorld:{bodies}});
  for(const m of r.moves)for(const mv of m.moved||[]){const p=s.players.find(q=>q.id===mv.id);if(p){p.x+=mv.xRaw/F;p.y+=mv.yRaw/F;}}
 }
 // ---- 15-1: LinePathGear host ---------------------------------------------
 // source-linepathgear-devices.js plans the rail position (OnUpdate) and the
 // spin (OnPost); this keeps each gear's Actor position and answers collisions.
 //  - collision: Gear.COLLISION_CIRCLE (radius 45, offset -2,-48 from the actor)
 //    against the live players' rects; OnCollided turns layer-1 player contact
 //    into event 43, the death path that immortality survives.
 //  - CollisionSwitch's event 61 is delivered the moment it is sent (receiveEvent),
 //    like the native synchronous SendEvent.
 const GEAR_R=45,GEAR_DX=-2,GEAR_DY=-48;
 function gearTick(s,hz){
  const st=s.gearState;if(!st||!st.gears.length)return [];
  const F=65536;
  if(!s.gearActors){s.gearActors={};for(const g of st.gears)s.gearActors[g.id]={initXRaw:g.xRaw,initYRaw:g.yRaw,xRaw:g.xRaw,yRaw:g.yRaw};}
  const r=LinePathGears.beforeStep(st,{dtRaw:Math.trunc(F/hz),actorSnapshots:st.gears.map((g,i)=>({actorId:g.id,initXRaw:s.gearActors[g.id].initXRaw,initYRaw:s.gearActors[g.id].initYRaw,collisionSlots:[{valid:true,collision:{id:i+1,flags:0}}]}))});
  for(const plan of r.positionPlans){const a=s.gearActors[plan.actorId];if(a){a.xRaw=plan.actorPatch.xRaw;a.yRaw=plan.actorPatch.yRaw;}}
  const dead=[],live=s.players.filter(p=>!p.exit&&!p.asBlock);
  for(const g of st.gears){const a=s.gearActors[g.id],cx=a.xRaw/F+GEAR_DX,cy=a.yRaw/F+GEAR_DY;
   for(const p of live)if(circleRectContact(cx,cy,GEAR_R,p))
    for(const e of LinePathGears.collided(g,{otherLayer:1,playerExists:true,playerState:1,playerEntityId:p.id}))if(e.eventType===43&&!p.immortal)dead.push(p.id);}
  LinePathGears.afterStep(st,{actorSnapshots:st.gears.map(g=>({actorId:g.id,xRaw:s.gearActors[g.id].xRaw,yRaw:s.gearActors[g.id].yRaw}))});
  return dead;
 }
 function gearEvents(s,events){
  for(const e of events||[])for(const g of (s.gearState&&s.gearState.gears)||[])if(e.target===g.name)LinePathGears.receiveEvent(g,e.event);
 }
 // ---- 14-3: Dossun / PlayerBlockGun / PlayerBlock host ---------------------
 // source-dossun-devices.js (+ source-playerblock-devices.js) make the native
 // decisions; this answers what they ask, in FP raws. Named approximations:
 //  - cameraAreaRaw: the native kills a bullet that leaves the CAMERA's stage
 //    area. The host simulates for everyone, so the area here is the span of the
 //    live players widened by half a 960px view on each side.
 //  - moveDeviceActor: a straight move by the actor's velocity; the Dossun stops
 //    on the first terrain or player below it, a bullet ends on terrain.
 //  - a PlayerBlock does not fall: the module never gives it an acceleration and
 //    nothing in it reads gravity.
 const DS_F=65536,PLAYER_RECT_RAW={height:46*65536,width:32*65536,x:-16*65536,y:-47*65536};
 const rawBox=r=>({x:r.x/DS_F,y:r.y/DS_F,w:r.width/DS_F,h:r.height/DS_F});
 function dossunSnapshots(s,hz){
  // players are actors too: Actor.Initialize gives them the same stage scale
  const stageScale=(s.dossunState.devices[0]&&s.dossunState.devices[0].actorScaleRaw)||DS_F;
  return s.players.map((p,i)=>({id:p.id,actorIndex:i,playerIndex:i,colorIndex:p.colorIndex??i,playerState:p.dead?3:1,sortingOrder:0,
   xRaw:Math.round(AX(p)*DS_F),yRaw:Math.round(AY(p)*DS_F),
   vxRaw:Math.round((p.vx||0)/hz*DS_F),vyRaw:Math.round((p.vy||0)/hz*DS_F),
   flipH:!!p.facingLeft,flipV:false,scaleXRaw:DS_F,scaleYRaw:DS_F,actorScaleRaw:stageScale,rectRaw:{...PLAYER_RECT_RAW}}));
 }
 function applyDossunEvents(s,events,hz){
  const dead=[];
  for(const e of events||[]){const p=s.players.find(q=>q.id===e.targetId);if(!p)continue;
   if(e.eventType===19){if(!p.immortal&&!p.asBlock)dead.push(p.id);}
   // event 65: the hit player is paused and hidden while its PlayerBlock stands in
   else if(e.eventType===65){p.asBlock=true;p.vx=0;p.vy=0;p.grounded=false;p.supportId=null;}
   // event 66: Shot again returns the player at the block's position and velocity
   else if(e.eventType===66){p.asBlock=false;
    if(e.restorePosition){setAnchor(p,e.xRaw/DS_F,e.yRaw/DS_F);p.vx=e.vxRaw/DS_F*hz;p.vy=e.vyRaw/DS_F*hz;}}
  }
  return dead;
 }
 function dossunTick(s,inputs,hz){
  const st=s.dossunState;if(!st||!st.devices.length)return [];
  const live=s.players.filter(p=>!p.exit&&!p.asBlock&&!p.dead),terrain=s.map.platforms;
  const xs=live.map(p=>p.x),lo=(xs.length?Math.min(...xs):0)-480,hi=(xs.length?Math.max(...xs):0)+512;
  const snaps=dossunSnapshots(s,hz);
  const input9=Object.fromEntries(s.players.map(p=>[p.id,!!(inputs[p.id]&&inputs[p.id].shot)]));
  const before=Dossuns.beforeStep(st,{dt:1/hz,players:snaps,input9,
   cameraAreaRaw:{x:Math.round(lo*DS_F),width:Math.round((hi-lo)*DS_F)},
   // Map.Move of the Dossun body straight down: how far until terrain.
   mapMoveDossunSensor:req=>{const b=rawBox(Players.rectAt(req.actor,req.rectRaw));let best=req.dyRaw/DS_F;
    for(const t of terrain)if(t.x<b.x+b.w&&t.x+t.w>b.x&&t.y>=b.y+b.h-0.001)best=Math.min(best,t.y-(b.y+b.h));
    return {moveYRaw:Math.round(Math.max(0,best)*DS_F)};}});
  const dead=applyDossunEvents(s,before.events,hz);
  const contacts=[];
  Dossuns.moveActors(st,(actor)=>{
   if(actor.type==='Dossun'){
    if(!actor.vyRaw)return;
    actor.yRaw+=actor.vyRaw;
    const now=dossunBody(st,actor);if(!now)return;
    // A standing PlayerBlock is collision kind 3, the same kind as terrain and
    // the Dossun body, so the Dossun comes to rest on it (contact on layer 2,
    // which contactDossun does not turn into a death).
    const blockRects=Players.solids(st.playerBlocks).map(b=>({id:b.id,...rawBox(b)}));
    const hit=t=>t.x<now.x+now.w&&t.x+t.w>now.x&&t.y<now.y+now.h&&t.y+t.h>now.y;
    const ground=terrain.filter(hit),onBlocks=blockRects.filter(hit);
    if(onBlocks.length&&!ground.length){const top=Math.min(...onBlocks.map(b=>b.y));actor.yRaw-=Math.round((now.y+now.h-top)*DS_F);
     for(const b of onBlocks)contacts.push({actorId:actor.id,callback:'OnContacted',otherId:b.id,otherLayer:2,contactYRaw:DS_F});}
    const under=live.filter(p=>p.x<now.x+now.w&&p.x+p.w>now.x&&p.y<now.y+now.h&&p.y+p.h>now.y);
    if(ground.length){const top=Math.min(...ground.map(t=>t.y));actor.yRaw-=Math.round((now.y+now.h-top)*DS_F);
     contacts.push({actorId:actor.id,callback:'OnContacted',otherId:null,otherLayer:0,contactYRaw:DS_F});}
    for(const p of under)contacts.push({actorId:actor.id,callback:'OnContacted',otherId:p.id,otherLayer:1,contactYRaw:DS_F});
   }else if(actor.type==='PlayerBlockGunBullet'){
    actor.xRaw+=actor.vxRaw;actor.yRaw+=actor.vyRaw;
    const b=rawBox(Players.rectAt(actor));
    if(terrain.some(t=>t.x<b.x+b.w&&t.x+t.w>b.x&&t.y<b.y+b.h&&t.y+t.h>b.y))contacts.push({actorId:actor.id,callback:'OnContacted',otherId:null,otherLayer:0});
   }
  });
  // collision phase: thorns (index 1) and the sensor (index 2) of the Dossun,
  // bullets against players; a bullet ignores its own shooter in the module.
  for(const d of Dossuns.solids(st)){const box=rawBox(d);
   if(d.actorType===157&&(d.collisionIndex===1||d.collisionIndex===2)){
    for(const p of live)if(overlap(p,box))contacts.push({actorId:d.actorId,callback:'OnCollided',collisionIndex:d.collisionIndex,otherLayer:1,otherId:p.id,otherActorType:27});
    if(d.collisionIndex===2)for(const b of Players.solids(st.playerBlocks))if(overlap(rawBox(b),box))contacts.push({actorId:d.actorId,callback:'OnCollided',collisionIndex:2,otherLayer:2,otherId:b.id,otherActorType:163});
   }else if(d.actorType===162){
    // A bullet is born inside its shooter (muzzle +10px from the anchor), and
    // collideBullet requests the disappear before it checks the owner - so the
    // native collision must never report the shooter, or the gun could not work.
    const bullet=st.bullets.find(b=>b.id===d.actorId),owner=bullet?s.players[bullet.playerIndex]:null;
    for(const p of live)if(p!==owner&&overlap(p,box))contacts.push({actorId:d.actorId,callback:'OnCollided',otherLayer:1,otherId:p.id,otherActorType:27});
   }
  }
  const after=Dossuns.afterStep(st,{players:dossunSnapshots(s,hz),contacts});
  dead.push(...applyDossunEvents(s,after.events,hz));
  return dead;
 }
 function dossunBody(st,actor){
  const body=Dossuns.solids(st).find(x=>x.actorId===actor.id&&x.collisionIndex===0);
  return body?rawBox(body):null;
 }
 // The Dossun body (collision kind 3) and standing PlayerBlocks are solids.
 function dossunSolids(s){
  if(!s.dossunState||!s.dossunState.devices.length)return [];
  try{return Dossuns.solids(s.dossunState).filter(d=>(d.actorType===157&&d.collisionIndex===0)||d.actorType===163).map(d=>({id:d.id,...rawBox(d)}));}
  catch(e){return [];}
 }
 function baseSolids(s){return [...s.map.platforms,...s.map.springs.filter(b=>s.relayState.relays.find(r=>r.id===b.id)?.visible),...Motion.solids(s.motionState),...Gates.solids(s.gateState),...Bridges.solids(s.bridgeState),...Blink.solids(s.blinkState),...BlinkThunders.solids(s.blinkThunderState),...Lifts.solids(s.liftState),...Winds.solids(s.windState),...LinePaths.solids(s.linePathState),...keyBoxSolids(s),...dossunSolids(s),...UpDownLifts.solids(s.upDownLiftState),...BreakableRects.solids(s.breakableState),...colorBoxSolids(s),...SpeedSwitches.solids(s.speedSwitchState),...SineLifts.solids(s.sineLiftState),...BatEnemies.solids(s.batState),...stepEnemySolids(s),...FrontSwitches.solids(s.frontSwitchState),...Arranges.solids(s.arrangeState),...PlaneObstacles.solids(s.planeObstacleState),...Shootings.chipSolids(s.shootingState)];}
 function solids(s){return [...baseSolids(s),...Devices.solids(s.deviceState)];}
 // InitPlayerIndexList 0x1816a6310: ascending i = 1..n-1, swap i with Next(0, i + 1) @0x1816a64e2..655d
 // on the frame RNGSession; createPlayer gives the k-th player actor list[k] (its GamePlayerInfo
 // and colour). The session state is the game's own, so the seed is fresh each attempt: RNGSession
 // ctor 0x1816621c0 (two SplitMix64 steps, source-player-index-list.js) seeds the PCG32.
 function shuffledOrder(n,seed){const M=(1n<<64n)-1n,G=0x9e3779b97f4a7c15n;
  const mix=x=>{let z=x&M;z=((z^(z>>30n))*0xbf58476d1ce4e5b9n)&M;z=((z^(z>>27n))*0x94d049bb133111ebn)&M;return (z^(z>>31n))&M;};
  const x=(BigInt.asIntN(32,BigInt(seed))+G)&M,rng={state:mix(x),inc:mix((x+G)&M)};
  const pcg=()=>{const old=rng.state;rng.state=(old*6364136223846793005n+(rng.inc|1n))&M;const v=Number(((old>>45n)^(old>>27n))&0xffffffffn),rot=Number(old>>59n);return ((v>>>rot)|(v<<((32-rot)&31)))>>>0;};
  const next=(lo,hi)=>{const u=(hi-lo)>>>0,th=(2**32-u)%u;let v;do v=pcg();while(v<th);return lo+v%u;};
  const list=Array.from({length:n},(_,i)=>i);for(let i=1;i<n;i++){const j=next(0,i+1);const tmp=list[i];list[i]=list[j];list[j]=tmp;}return list;}
 function scaledJump(s){const SR=s.map.stageScaleRaw||65536;return SR===65536?NATIVE.jump:Number(BigInt.asIntN(64,BigInt(SR)*-334234n)>>16n)/65536;}
 function scaledGravity(s,vy,hz){const SR=s.map.stageScaleRaw||65536;if(SR===65536)return Math.min(NATIVE.terminal*hz,vy+NATIVE.gravity*hz);
  const F=65536,v=vy/hz*F;return (v+Math.min(42598,1277952-v)*SR/F)/F*hz;}
 function ridersOf(p,players){
  const ids=new Set([p.id]);let added=true;
  while(added){added=false;for(const q of players)if(q.grounded&&ids.has(q.supportId)&&!ids.has(q.id)){ids.add(q.id);added=true;}}
  return players.filter(q=>q!==p&&ids.has(q.id));
 }
 function moveX(p,dx,obstacles,width){
  let target=Math.max(0,Math.min(width-p.w,p.x+dx));
  for(const b of obstacles){
   if(p.y>=b.y+b.h||p.y+p.h<=b.y)continue;
   if(dx>0&&p.x+p.w<=b.x+0.001&&target+p.w>b.x)target=Math.min(target,b.x-p.w);
   if(dx<0&&p.x>=b.x+b.w-0.001&&target<b.x+b.w)target=Math.max(target,b.x+b.w);
  }
  const moved=target-p.x;p.x=target;return moved;
 }
 function moveY(p,dy,obstacles){
  const before=p.y;let target=before+dy,support=null;
  p.grounded=false;p.ground=false;p.supportId=null;
  for(const b of obstacles){
   if(!horizontal(p,b))continue;
   if(dy>=0&&before+p.h<=b.y+0.001&&target+p.h>=b.y){
    if(b.y-p.h<=target){
     // Equal-height teammates must not change the carrier when actor array
     // order changes. Prefer the widest contact, then a stable actor ID.
     const contact=Math.min(p.x+p.w,b.x+b.w)-Math.max(p.x,b.x);
     const previous=support?Math.min(p.x+p.w,support.x+support.w)-Math.max(p.x,support.x):-1;
     if(b.y-p.h<target-1e-9||!support||contact>previous+1e-9||Math.abs(contact-previous)<=1e-9&&String(b.id)<String(support.id)){
      target=b.y-p.h;support=b;
     }
    }
   }else if(dy<0&&before>=b.y+b.h-0.001&&target<b.y+b.h){target=Math.max(target,b.y+b.h);p.vy=0;p.jumpFrame=0;}
  }
  p.y=target;
  if(support){p.grounded=true;p.ground=true;p.supportId=support.id;p.vy=0;}
 }
 // Horizontal carry: CollisionScene.postPushBack -> updateInertia 0x1817fc480 ->
 // moveForInertia 0x1817fd100 moves what stands on a layer 1/2/13 collision by
 // that collision's currentX - preX (vertical travel is each device's own
 // MoveContactActor). Named approximation of the contact-face list: a player
 // standing on a solid (grounded, supportId) is carried by the solid's x step
 // this tick, together with everyone standing on that player; the move stops at
 // terrain like a walk. Players carrying players already happens in the walk.
 function inertiaCarry(s,before){
  const players=active(s),now=baseSolids(s),terrainIds=new Set(s.map.platforms.map(b=>b.id));
  for(const b of now){if(terrainIds.has(b.id))continue;const x0=before.get(b.id);if(x0===undefined)continue;const dx=b.x-x0;if(Math.abs(dx)<1/65536*4)continue;
   const riders=players.filter(p=>p.grounded&&p.supportId===b.id);if(!riders.length)continue;
   const others=now.filter(o=>o.id!==b.id);
   for(const r of riders){const group=[r,...ridersOf(r,players)];for(const q of group)moveX(q,dx,others.filter(o=>o.id!==q.id&&!group.some(g=>g.id===o.id)),s.map.width);}}
 }
 function tick(s,inputs,h){
  const hz=s.physics.nativeTickRate,players=active(s);
  graphStart(s);
  // 7-1 half input: StageComponent.updateInput 0x18170b789 runs HalfInput.Update
  // before every actor; a player without the right reads no buttons at all.
  if(s.halfInputState&&s.halfInputState.enabled){
   HalfInputs.update(s.halfInputState,s.players.map(p=>inputs[p.id]||{}));
   const masked={};s.players.forEach((p,i)=>{masked[p.id]=HalfInputs.isPossible(s.halfInputState,i)?(inputs[p.id]||{}):{};});inputs=masked;}
  const solidXBefore=new Map(baseSolids(s).map(b=>[b.id,b.x]));
  s.playTimeRaw+=Math.trunc(h*65536);
  const coinUpdate=Coins.beforeStep(s.coinsState);
  // TimerComponent.onTimeUp 0x18172e0cb sends event 61 to the single actor named
  // in slot5. Route it to every device signal handler in the same tick.
  // The DeadTimer kills by broadcasting QEventType.Dead 19 to every actor
  // (TimerComponent.onTimeUp 0x18172e132..0x18172e168) and the receiving
  // PlayerComponent.OnRecvEvent 0x1816c174e is what actually dies, so the module
  // needs the player list and reports the casualties. Only a DeadTimer can fill
  // deadPlayerIds; a SwitchTimer time-up never does.
  const timerResult=SwitchTimers.beforeStep(s.switchTimerState,{dt:h,players});
  Bridges.beforeStep(s.bridgeState,{players,platforms:s.map.platforms,keyTaken:s.keyTaken,dt:h,nativeTickRate:hz,events:timerResult.events});
  for(const e of timerResult.events){Gates.signal(s.gateState,e);Devices.signal(s.deviceState,e);BlinkThunders.signal(s.blinkThunderState,e);}
  if(timerResult.deadPlayerIds.length){s.status='dead';s.deaths++;s.failure={playerId:timerResult.deadPlayerIds[0],reason:'시간이 다 됐어요'};return;}
  Gates.beforeStep(s.gateState,{players,platforms:s.map.platforms,dt:h,nativeTickRate:hz});
  // Blackout pauses lifts too (setPause on every ordinary actor); the previous
  // tick's pause flag is used because the lift runs before the blackout update.
  if(!s.blackoutState.actorsPaused)Lifts.beforeStep(s.liftState,{players,platforms:s.map.platforms,dt:h,nativeTickRate:hz});
  upDownLiftTick(s);
  sineLiftTick(s,hz);
  constraintTick(s,hz);
  keyTick(s,inputs,hz);
  const linePathResult=LinePaths.beforeStep(s.linePathState,linePathHost(s,players,h));
  Blink.beforeStep(s.blinkState,{players,dt:h});
  // Bowwow2EnemyComponent has no solid body (m_PushBackTarget 0) and declares no
  // OnRecvEvent, so it never joins the solid list and nothing can signal it.
  Enemies.beforeStep(s.enemyState,{dt:h});
  ThornCeilings.beforeStep(s.thornCeilingState,{dt:h});
  BlinkThunders.beforeStep(s.blinkThunderState,{dt:h,platforms:s.map.platforms,width:s.map.width,height:s.map.height});
  const oldMotion=Motion.solids(s.motionState);Motion.step(s.motionState,h);
  const movingSolids=Motion.solids(s.motionState);
  for(const p of players){
   const carrier=movingSolids.find(b=>b.id===p.supportId),old=oldMotion.find(b=>b.id===p.supportId);
   if(carrier&&old){p.x+=carrier.x-old.x;p.y+=carrier.y-old.y;}
   for(const b of movingSolids){const previous=oldMotion.find(old=>old.id===b.id);if(!previous||!overlap(p,b)||previous.x===b.x&&previous.y===b.y)continue;
    if(b.x>previous.x)p.x=b.x+b.w;else if(b.x<previous.x)p.x=b.x-p.w;else if(b.y<previous.y)p.y=b.y-p.h;else p.y=b.y+b.h;
   }
  }
  Devices.beforeStep(s.deviceState,{players,inputs,platforms:baseSolids(s),dt:h,nativeTickRate:hz,width:s.map.width});
  const terrain=solids(s);
  // A box resting on someone's head has to travel with them: st_w_01_02 is
  // carried-box-as-a-shield and the thorns only stop at the box's own rect.
  // The engine moves contact actors generically (ActorComponent
  // MoveContactActor 0x1816a0980, MoveByContactActor 0x1816a10e0,
  // IsEnableMoveContactActor 0x1816a15c0, GetMoveContactOption 0x18169dc90);
  // that whole system is not decoded, so this reproduces only the one case
  // the connected rounds need, with the same one-frame lag the other carries
  // in this runtime already have.
  const carriedBefore=new Map(players.map(p=>[p.id,{x:p.x,y:p.y}]));
  Poles.beforeStep(s.poleState,{dt:h});
  // Blackout (source-blackout-devices.js): it and its controller keep ticking even
  // while they pause everyone else. The controller's chosen player turns the
  // lights back on with Shot - an edge, the native WasPressed (0x1817d08e2..f3).
  if(s.blackoutState.blackouts.length){
   const shots=s.players.map(p=>{const held=!!(inputs[p.id]&&inputs[p.id].shot),pressed=held&&!p.shotHeld;p.shotHeld=held;return {shotPressed:pressed};});
   Blackouts.beforeStep(s.blackoutState,{dt:h,players:s.players.map(p=>({id:p.id,dead:!!p.dead})),gamePlayerInputs:shots});
  }
  // Event 53 with pause true (Blackout option 1) stops ordinary actor simulation:
  // ActorComponent.OnRecvEvent 0x18169eaa8 -> setPause 0x18169f020. A paused player
  // keeps its velocity and simply does not update until the lights go out.
  const paused=!!s.blackoutState.actorsPaused;
  // Wind: a one-tick movement offset in native px/tick, never accumulated into
  // velocity (default Player update adds and clears m_Wind, 0x1816c3dcc..e00).
  for(const f of Winds.beforeStep(s.windState,{}).forces){const p=players.find(q=>q.id===f.actorId);if(p)p.windDx=f.x;}
  // SpeedSwitch: event 57 to every Player (actor type 27). The receiver replaces
  // the walk speed, never compounds it; at scale 1 the formula gives exactly the
  // 3 px/tick this runtime has always used, which is the cross-check.
  const wallsBefore=SpeedSwitches.solids(s.speedSwitchState);const speedResult=SpeedSwitches.beforeStep(s.speedSwitchState,{dt:h,...moveWallCallbacks(s,hz)});moveWallPushOut(s,wallsBefore);
  for(const e of speedResult.events||[])if(e.eventType===57&&e.broadcastActorType===27)
   for(const p of players){const next=SpeedSwitches.applyPlayerSpeedEvent({stageBaseScaleRaw:s.map.stageScaleRaw||65536,iceSpeedUpRaw:s.map.iceSpeedUpRaw||65536},e);p.walkSpeed=next.walkSpeedRaw/65536;}
  {const why=planeObstacleTick(s);if(why){s.status='dead';s.deaths++;s.failure=why;return;}}
  capturingTick(s,hz);
  goKartTick(s,inputs,hz);
  rallyTick(s,inputs,hz);
  if(fakeTick(s,inputs,hz))return;if(s.status==='dead')return;
  appleTick(s,inputs,hz);
  if(arrangeTick(s,inputs,hz))return;
  frontSwitchUpdate(s);
  stepEnemyTick(s);
  cageTick(s,hz);
  for(const p of [...players].sort((a,b)=>b.y-a.y||a.id.localeCompare(b.id))){
   if(paused)continue;
   if(p.riding)continue;
   if(p.rallyTarget&&!p.faintRequest){p.vx=0;p.vy=0;continue;}
   // state 2 replaces whatever state it had (a TargetPlayer comes back as state 1)
   if(p.faintRequest){p.faint={vxRaw:p.faintRequest.vxRaw,vyRaw:p.faintRequest.vyRaw,timerRaw:163840};p.faintRequest=null;p.rallyTarget=false;}
   if(p.faint){faintMove(s,p,hz,[...terrain,...players.filter(q=>q!==p).map(q=>({id:q.id,x:q.x,y:q.y,w:q.w,h:q.h}))]);continue;}
   if(p.catchLevel){p.vx=0;p.vy=0;continue;}
   if(p.graphMode){graphMove(s,p,p.inputLocked?{}:(inputs[p.id]||{}),hz,terrain,players);continue;}
   if(p.plane){const why=planeMove(s,p,p.inputLocked?{}:(inputs[p.id]||{}),hz,terrain,players);if(why){s.status='dead';s.deaths++;s.failure={playerId:p.id,reason:why};return;}continue;}
   if(s.map.topView){if(topViewMove(s,p,inputs[p.id]||{},hz)){s.status='dead';s.deaths++;s.failure={playerId:p.id,reason:'구멍에 빠졌어요'};return;}continue;}
   // Player state1 Update 0x1816c3060: button 6 (left) first, then 7 -> LookLeft/LookRight
   {const inp=inputs[p.id]||{};if(inp.left){p.facingLeft=true;p.lookingRight=false;}else if(inp.right){p.facingLeft=false;p.lookingRight=true;}}
   if(p.onPole){poleMove(s,p,p.inputLocked?{}:(inputs[p.id]||{}),terrain);continue;}
   const input=p.inputLocked?{}:(inputs[p.id]||{}),held=!!input.jump,edge=held&&!p.jump,riders=ridersOf(p,players);
   p.jumpBlocked=!!(edge&&p.grounded&&riders.length);
   const started=edge&&p.grounded&&!riders.length;
   // stage scale s (source-player-default.js): jumpVelocity = mul(s, -334234), gravity delta
   // mul(min(42598, 1277952 - vy), s); s = 1 keeps the plain constants.
   const JUMP=scaledJump(s);
   if(started){p.vy=JUMP*hz;p.jumpFrame=1;p.grounded=false;p.supportId=null;}
   // Native dec(frame)<=12 accepts frames1..13; frame0 cannot restart an
   // airborne jump after release. The initial jump is its own update.
   if(!started&&held&&p.jumpFrame>0&&p.jumpFrame<NATIVE.holdFrames){
    p.vy+=JUMP*NATIVE.holdFactor*(1-p.jumpFrame/NATIVE.holdFrames)*hz;p.jumpFrame++;
   }else if(!started)p.jumpFrame=0;
   if(p.grounded)p.forcedVx=0;
   p.jump=held;checkIceFloor(s,p);{const dir=(input.right?1:0)-(input.left?1:0);p.vx=p.forcedVx||(s.map.ice&&p.onIce?iceWalk(s,p,dir,hz):dir*(p.walkSpeed||NATIVE.walk)*hz);}
   if(s.autoScrollState&&autoScrollPush(s,p,hz)&&!p.immortal){s.status='dead';s.deaths++;s.failure={playerId:p.id,reason:'화면 밖으로 밀려났어요'};return;}
   // Keep a grounded stack together, limited by every rider's available space.
   const obstacles=terrain.concat(players.filter(q=>q!==p&&!riders.includes(q)));let dx=p.vx*h+(p.windDx||0);p.windDx=0;
   for(const q of [p,...riders]){const trial={...q},allowed=moveX(trial,dx,obstacles.filter(b=>b.id!==q.id),s.map.width);if(Math.abs(allowed)<Math.abs(dx))dx=allowed;}
   p.x+=dx;for(const q of riders)q.x+=dx;
   const wall=terrain.find(b=>b.wallId&&horizontal({x:p.x-0.01,y:p.y,w:p.w+0.02,h:p.h},b)&&p.y<b.y+b.h&&p.y+p.h>b.y&&Math.abs(dx-p.vx*h)>.001);
   if(wall){const contact=Motion.contactWall(s.motionState,wall.wallId,{vx:p.vx/hz,vy:p.vy/hz,face:p.vx>0?'left':'right'});if(contact.impulse){p.vx=contact.impulse.vx*hz;p.forcedVx=p.vx;p.vy=contact.impulse.vy*hz;p.grounded=false;p.supportId=null;p.jumpFrame=0;}}
   p.vy=scaledGravity(s,p.vy,hz);
   moveY(p,p.vy*h,terrain.concat(players.filter(q=>q!==p)));
   const top=terrain.find(b=>b.wallId&&b.id===p.supportId);
   if(top){const contact=Motion.contactWall(s.motionState,top.wallId,{vx:p.vx/hz,vy:p.vy/hz,face:'top',playerCenterX:p.x+p.w/2,blockCenterX:top.x+top.w/2});if(contact.impulse){p.forcedVx=contact.impulse.vx*hz;p.vx=p.forcedVx;p.vy=contact.impulse.vy*hz;p.grounded=false;p.supportId=null;}}
   const board=s.motionState.dashBoards.find(b=>overlap(p,b));
   if(board&&p.lastDashBoardId!==board.id){const impulse=Motion.triggerDash(board);p.forcedVx=impulse.vx*hz;p.vx=p.forcedVx;p.vy=impulse.vy*hz;p.grounded=false;p.supportId=null;p.jumpFrame=0;}
   p.lastDashBoardId=board?.id||null;
  }
  for(const box of Devices.solids(s.deviceState)){
   const base=box.supportId&&carriedBefore.get(box.supportId);if(!base)continue;
   const carrier=players.find(q=>q.id===box.supportId);if(!carrier)continue;
   box.x=Math.max(0,Math.min(s.map.width-box.w,box.x+carrier.x-base.x));
   box.y+=carrier.y-base.y;
  }
  colorBoxTick(s,inputs,hz);
  magnetTick(s,inputs,hz);
  ballTick(s,players,hz);
  const dossunDeaths=dossunTick(s,inputs,hz);
  if(dossunDeaths.length){s.status='dead';s.deaths++;s.failure={playerId:dossunDeaths[0],reason:'쿵쿵 블록에 당했어요'};return;}
  warpGunTick(s,inputs,hz);
  const ghostDeaths=ghostTick(s,hz);
  switchRectUpdate(s,hz);
  frontSwitchTouches(s);
  for(const z of s.map.constraintMoves||[])s.players.forEach((p,i)=>{if(!p.exit&&!p.asBlock&&overlap(p,z)){(s.pendingConstraintEvents||(s.pendingConstraintEvents=[])).push({eventType:24,targetName:z.target,playerIndex:i});}});
  graphTick(s,inputs,hz);
  const giantDeath=giantTick(s,inputs,hz);
  throwTick(s,inputs,hz);
  {const why=bossTick(s,hz);if(why){s.status='dead';s.deaths++;s.failure=why;return;}}
  planeGunTick(s,inputs,hz);
  {const why=danmakuTick(s,hz);if(why){s.status='dead';s.deaths++;s.failure=why;return;}}
  shootingTick(s,hz);
  danmakuThunderTick(s);
  {const why=planeObstacleTick(s);if(why){s.status='dead';s.deaths++;s.failure=why;return;}}
  if(giantDeath){s.status='dead';s.deaths++;s.failure=giantDeath;return;}
  const stepDeaths=stepEnemyContacts(s,hz);
  if(stepDeaths.length){s.status='dead';s.deaths++;s.failure={playerId:stepDeaths[0],reason:'적에게 닿았어요'};return;}
  const batDeaths=batTick(s,hz,inputs);
  if(batDeaths.length){s.status='dead';s.deaths++;s.failure={playerId:batDeaths[0],reason:'박쥐에게 잡혔어요'};return;}
  if(ghostDeaths.length){s.status='dead';s.deaths++;s.failure={playerId:ghostDeaths[0],reason:'유령에게 잡혔어요'};return;}
  const rollDeaths=rollGearTick(s,hz);
  if(rollDeaths.length){s.status='dead';s.deaths++;s.failure={playerId:rollDeaths[0],reason:'톱니바퀴에 닿았어요'};return;}
  const gearDeaths=gearTick(s,hz);
  if(gearDeaths.length){s.status='dead';s.deaths++;s.failure={playerId:gearDeaths[0],reason:'톱니에 닿았어요'};return;}
  // SearchLight (3-1): FATAL seconds inside a lit cone send event 26, which
  // PlayerComponent.OnRecvEvent 0x1816c1080 takes down event 19's death path
  // (immortality and invincibility still refuse it).
  if(s.searchLightState.lights.length){
   const F=65536,lit=SearchLights.beforeStep(s.searchLightState,{dt:1/hz,dtRaw:Math.trunc(F/hz),
    searchLightPlayers:s.players.map((p,i)=>({index:i,id:p.id,state:1,hasCollision:!p.exit&&!p.asBlock,collisionDisabled:false,
     collisionRectRaw:{xRaw:Math.round(p.x*F),yRaw:Math.round(p.y*F),widthRaw:Math.round(p.w*F),heightRaw:Math.round(p.h*F)}}))});
   const caught=lit.events.filter(e=>e.eventType===26).map(e=>s.players.find(p=>p.id===e.targetId)).filter(p=>p&&!p.immortal&&!p.exit);
   if(caught.length){s.status='dead';s.deaths++;s.failure={playerId:caught[0].id,reason:'서치라이트에 들켰어요'};return;}
  }
  const facts={switchContacts:[],springContacts:[]};
  for(const p of players){
   const upContactCount=players.filter(q=>q!==p&&q.grounded&&q.supportId===p.id).length;
   for(const spring of s.map.springs)if(p.grounded&&horizontal(p,spring)&&Math.abs(p.y+p.h-spring.y)<0.01){
    facts.springContacts.push({relayId:spring.id,actorId:p.id,layer:1,upContactCount,velocityX:p.vx/hz});
   }
   // Player collision is m_Layer 1 / m_PushBackTarget 3: PlayerComponent
   // InitCollision passes 3 to ActorComponent.CreateCollision at 0x1816bdf4b
   // (stored to m_PushBackTarget by Collision.initialize 0x181690b08) and writes
   // `mov byte [rax+1],1` at 0x1816bdf87.
   for(const button of s.map.switches)if(!p.hiddenByCardboard&&playerPressesSwitch(p,button,s)){
    facts.switchContacts.push({relayId:button.id,actorId:p.id,layer:1,attributeFlags:3});
   }
  }
  // PushBox collision is m_Layer 2 / m_PushBackTarget 3 (argument 3 at
  // 0x1816db625, `mov word [rax],0x202` at 0x1816db651) - inside the accepted set, so a
  // box resting against a button holds it down in the original too. None of the
  // nine already-connected rounds contains a PushBox and a Switch at once, so
  // this cannot move them.
  for(const box of Devices.solids(s.deviceState))for(const button of s.map.switches){
   if(switchSensorOverlap(box,button))facts.switchContacts.push({relayId:button.id,actorId:box.id,layer:2,attributeFlags:3});
  }
  // ColorBox collision: attribute 2, layer 2 (5 when it can jump) - in the set.
  for(const box of colorBoxSolids(s))for(const button of s.map.switches){
   const cb=s.colorBoxState.boxes.find(b=>b.id===box.id);
   if(switchSensorOverlap(box,button))facts.switchContacts.push({relayId:button.id,actorId:box.id,layer:cb&&cb.enableJump?5:2,attributeFlags:2});
  }
  const speedContacts=[];
  for(const sw of SpeedSwitches.displays(s.speedSwitchState).switches){const box={x:sw.x+sw.rect.x,y:sw.y+sw.rect.y,w:sw.rect.w,h:sw.rect.h,direction:0};
   for(const p of players)if(!p.exit&&!p.dead&&playerPressesSwitch(p,box))speedContacts.push({switchId:sw.id,actorId:p.id,layer:1,attributeFlags:3});}
  // MoveWall trigger: layer-1 bodies inside the widened sensor rect
  const wallContacts=[];for(const w of SpeedSwitches.displays(s.speedSwitchState).walls)for(const p of players)if(!p.exit&&!p.dead&&overlap(p,w.trigger))wallContacts.push({wallId:w.id,layer:1});
  SpeedSwitches.afterStep(s.speedSwitchState,{switchContacts:speedContacts,wallContacts});
  const windContacts=[];
  for(const v of Winds.volumes(s.windState))for(const p of players)if(!p.exit&&!p.dead&&overlap(p,v))windContacts.push({windId:v.windId,actorId:p.id});
  const relay=Relay.step(s.relayState,h,facts);
  // DeadSwitch: event 26 / 19 take the player death path (immortality refuses it);
  // a box that presses it ignores event 26.
  for(const e of relay.events.filter(e=>e.deadSwitch)){
   const victims=e.eventType===19?s.players.filter(p=>!p.exit&&!p.immortal):s.players.filter(p=>p.id===e.targetId&&!p.exit&&!p.immortal);
   if(victims.length){if(e.flash)s.flash=1;s.status='dead';s.deaths++;s.failure={playerId:victims[0].id,reason:'데드 스위치를 밟았어요'};return;}
  }
  // LinePathLift.OnRecvEvent receives a DelaySwitch's event 61 the moment it is
  // sent (SendEvent is synchronous), not on the lift's next update.
  for(const e of relay.events){const type=e.eventType??e.event;if((type===61||type===60)&&e.targetName&&s.frontSwitchState)for(const r of s.frontSwitchState.rects)if(r.name===e.targetName)FrontSwitches.receiveEvent(r,type);}
  for(const e of relay.events){const type=e.eventType??e.event;if(type===61||type===60)for(const c of s.batState.cages)if(e.targetName===c.name||e.targetId===c.id)BatEnemies.cageReceiveEvent(c,type);}
  for(const e of relay.events)if((e.eventType??e.event)===61)for(const l of s.sineLiftState.lifts)if(e.targetName===l.name||e.targetId===l.id)SineLifts.receiveEvent(l,61);
  if(s.linePathState.devices.some(d=>d.externalStart)){const host=linePathHost(s,players,h);
   for(const e of relay.events)if((e.eventType??e.event)===61)for(const d of s.linePathState.devices)
    if(d.type==='LinePathLift'&&(e.targetName===d.name||e.targetId===d.id))LinePaths.receiveEvent(d,61,host.getRideCount(d.id));}
  Winds.afterStep(s.windState,{events:relay.events,windContacts});
  // The coop count-up machine takes only its own players' switch events and
  // answers with an event 1 to every Key, so it runs before the gate layer
  // recomputes whether the key can be touched. Its other outgoing event is the
  // lost-round broadcast 47, which no other module in scope reacts to.
  const countUpResult=CountUps.beforeStep(s.countUpState,{dt:h,events:relay.events});
  const landmineResult=Landmines.beforeStep(s.landmineState,{dt:h,players,switchContacts:facts.switchContacts});
  s.landmines=Landmines.displays(s.landmineState);
  const gateResult=Gates.afterStep(s.gateState,{relayState:s.relayState,events:[...relay.events,...countUpResult.events,...landmineResult.events,...coinUpdate.events],keyTaken:s.keyTaken});s.keyActive=gateResult.keyActive;
  if(s.frontSwitchState)for(const e of gateResult.events||[])for(const r of s.frontSwitchState.rects)if(r.name===e.targetName)FrontSwitches.receiveEvent(r,e.eventType);
  s.countUps=CountUps.displays(s.countUpState);
  s.lastContacts=facts;s.lastRelayEvents=relay.events;s.lastImpulses=relay.impulses;
  for(const impulse of relay.impulses){
   const p=players.find(q=>q.id===impulse.actorId);if(!p)continue;
   p.vx=impulse.velocity.x*hz;p.vy=impulse.velocity.y*hz;p.grounded=false;p.ground=false;p.supportId=null;p.jumpFrame=0;
  }
  for(const button of s.map.switches){const r=s.relayState.relays.find(r=>r.id===button.id);button.pressed=r.pressed;button.remaining=r.remaining||0;}
  for(const spring of s.map.springs){const r=s.relayState.relays.find(r=>r.id===spring.id);spring.phase=r.phase;spring.visible=r.visible;}
  Texts.afterStep(s.textsState,{dt:h});
  Coins.afterStep(s.coinsState,{players});
  Checkpoints.afterStep(s.checkpointsState,{players,playTimeRaw:s.playTimeRaw});
  // Existing port AABBs adapted to FP world bounds; native collision ordering remains unverified.
  const energyResult=TouchEnergies.afterStep(s.touchEnergiesState,{dt:h,players:s.players.map((p,index)=>({index,nativeState:p.playerState,
   collisionRectRaw:p.exit?null:{left:Math.trunc(p.x*65536),right:Math.trunc((p.x+p.w)*65536),top:Math.trunc(p.y*65536),bottom:Math.trunc((p.y+p.h)*65536)}}))});
  if(energyResult.events.some(e=>e.eventType===43)){
   const victim=players.find(p=>!p.immortal);if(victim){s.status='dead';s.deaths++;s.failure={playerId:victim.id,reason:'접촉 에너지가 다 됐어요'};return;}
  }
  const movingThorns=s.breakableState.blocks.length?s.deviceState.devices.filter(d=>d.type==='Thorn'&&d.active&&d.phase==='move').map(d=>d.id):[];
  const kartBodies=goKartPseudo(s),contactPlayers=kartBodies.length?[...players.filter(p=>!p.riding),...kartBodies]:players;
  const deviceResult=Devices.afterStep(s.deviceState,{players:contactPlayers,platforms:baseSolids(s),dt:h,nativeTickRate:hz,width:s.map.width,height:s.map.height});
  if(goKartEvents(s,deviceResult.events)||goKartKilled(s,deviceResult.deadPlayerIds)){s.status='dead';s.deaths++;s.failure={playerId:s.players[0].id,reason:'고카트가 가시에 닿았어요'};return;}
  // BreakableRect.OnContacted 0x1817d73b0: a Thorn (type 0x5d) stopped against
  // the block this tick touches it - the sweep leaves it flush, so touching
  // means within half a pixel of the block's rect.
  for(const id of movingThorns){const d=s.deviceState.devices.find(q=>q.id===id);if(!d)continue;
   for(const b of BreakableRects.solids(s.breakableState))
    if(Devices.thornRects[d.direction].some(([ox,oy,w,hh])=>overlap({x:d.x+ox-0.5,y:d.y+oy-0.5,w:w+1,h:hh+1},b)))BreakableRects.contacted(s.breakableState,b.id,0x5d);}
  BreakableRects.beforeStep(s.breakableState,{dtRaw:1092});
  SwitchTimers.afterStep(s.switchTimerState,{events:[...relay.events,...deviceResult.events]});
  gearEvents(s,deviceResult.events);
  const bridgeResult=Bridges.afterStep(s.bridgeState,{players:contactPlayers,platforms:s.map.platforms,width:s.map.width,height:s.map.height,events:[...relay.events,...deviceResult.events]});
  if(goKartKilled(s,bridgeResult.deadPlayerIds||[])){s.status='dead';s.deaths++;s.failure={playerId:s.players[0].id,reason:'고카트가 전기에 닿았어요'};return;}
  const blinkThunderResult=BlinkThunders.afterStep(s.blinkThunderState,{players,platforms:s.map.platforms,width:s.map.width,height:s.map.height});
  const enemyResult=Enemies.afterStep(s.enemyState,{players,dt:h});
  const thornCeilingResult=ThornCeilings.afterStep(s.thornCeilingState,{players,platforms:baseSolids(s),dt:h,nativeTickRate:hz,width:s.map.width,height:s.map.height});
  for(const e of thornCeilingResult.events)if(e.event===61){Gates.signal(s.gateState,e);Devices.signal(s.deviceState,e);BlinkThunders.signal(s.blinkThunderState,e);Bridges.signal(s.bridgeState,e);}
  s.map.hazards=[...bridgeResult.hazards,...blinkThunderResult.hazards,...enemyResult.hazards,...thornCeilingResult.hazards];
  // DamageRect event 43: the player death path, which immortality survives
  // (playerEvent43Outcome, Player.OnRecvEvent 0x1816c14a2..16e1).
  const damageDeaths=(linePathResult.events||[]).filter(e=>e.eventType===43)
   .map(e=>players.find(p=>p.id===e.targetId)).filter(p=>p&&LinePaths.playerEvent43Outcome({life:1,immortal:!!p.immortal})==='dead').map(p=>p.id);
  if(damageDeaths.length){s.status='dead';s.deaths++;s.failure={playerId:damageDeaths[0],reason:'위험 구역에 닿았어요'};return;}
  const poleDeaths=poleContacts(s,players);
  if(poleDeaths.length){s.status='dead';s.deaths++;s.failure={playerId:poleDeaths[0],reason:'가시에 찔렸어요'};return;}
  if(landmineResult.deadPlayerIds.length){s.status='dead';s.deaths++;s.failure={playerId:landmineResult.deadPlayerIds[0],reason:'지뢰를 밟았어요'};return;}
  if(enemyResult.deadPlayerIds.length){s.status='dead';s.deaths++;s.failure={playerId:enemyResult.deadPlayerIds[0],reason:'적에게 당했어요'};return;}
  if(thornCeilingResult.deadPlayerIds.length){s.status='dead';s.deaths++;s.failure={playerId:thornCeilingResult.deadPlayerIds[0],reason:'가시에 닿았어요'};return;}
  if(blinkThunderResult.deadPlayerIds.length){s.status='dead';s.deaths++;s.failure={playerId:blinkThunderResult.deadPlayerIds[0],reason:'전기에 닿았어요'};return;}
  autoScrollStep(s,hz);
  // Native OnPost1 0x18169e260 applies a pending warp before CheckOutMap, so
  // every warp resolves ahead of the out-of-map test below.
  WarpInit.afterStep(s.warpInitState,{players,boxes:Devices.solids(s.deviceState),dt:h,nativeTickRate:hz});
  if(bridgeResult.deadPlayerIds.length){s.status='dead';s.deaths++;s.failure={playerId:bridgeResult.deadPlayerIds[0],reason:'전기에 닿았어요'};return;}
  if(deviceResult.deadPlayerIds.length){s.status='dead';s.deaths++;s.failure={playerId:deviceResult.deadPlayerIds[0],reason:'가시에 닿았어요'};return;}
  for(const p of players){
   for(const warp of s.map.warps||[])if(overlap(p,warp)){
    // WarpAll (OnCollided 0x181734864..96e): every player by actor index gets
    // event 63; the destination accumulates offset*i per step, so player i
    // lands at destination + offset*(0+1+..+i). A destination x below 4 raw
    // takes the toucher's x (0x18173475a).
    if(warp.targetAll){let ax=Math.abs(warp.destination.x)*65536<4?p.x+16:warp.destination.x,ay=warp.destination.y;
     s.players.forEach((q,i)=>{ax+=warp.ordinalOffset.x*i;ay+=warp.ordinalOffset.y*i;if(q.exit)return;
      setAnchor(q,ax,ay);q.vx=0;q.vy=0;q.grounded=false;q.ground=false;q.supportId=null;q.jumpFrame=0;});
     for(const q of players)if(q.supportId){q.supportId=null;q.grounded=false;q.ground=false;}
     break;}
    const ordinal=warp.counter;
    p.x=warp.destination.x+warp.ordinalOffset.x*ordinal-16;
    p.y=warp.destination.y+warp.ordinalOffset.y*ordinal-47;
    p.vx=0;p.vy=0;p.grounded=false;p.ground=false;p.supportId=null;p.jumpFrame=0;
    warp.counter=(ordinal+1)%s.players.length;
    for(const q of players)if(q.supportId===p.id){q.supportId=null;q.grounded=false;q.ground=false;}
    break;
   }
   // ActorComponent.OnPost1 0x18169e260 applies warpProc 0x18169e460 and only
   // then runs CheckOutMap 0x1816a1cb0, which additionally early-outs while a
   // warp is pending. A warped player is therefore never out of the map.
   if(p.y>s.map.killY){s.status='dead';s.failure={playerId:p.id,reason:'fall'};s.deaths++;return;}
   if(Actor.canEnterGoal({open:s.goalOpen,overlapping:overlap(p,s.map.exit),upPressed:!p.inputLocked&&!!inputs[p.id]?.up,cleared:p.exit,playerState:p.playerState})){
    p.exit=true;p.visible=false;p.playerState=5;p.vx=0;p.vy=0;p.grounded=false;p.ground=false;p.supportId=null;
    for(const q of players)if(q.supportId===p.id){q.supportId=null;q.grounded=false;q.ground=false;}
   }
  }
  keyCollide(s);
  inertiaCarry(s,solidXBefore);
  magnetPost(s,hz);
  if(s.players.every(p=>p.exit))s.status='clear';
 }
 function step(s,inputs={},dt=1/60){
  if(!Number.isFinite(dt)||dt<0||dt>10)throw new Error('dt must be 0..10 seconds');
  if(s.status!=='play')return s;
  const h=1/s.physics.nativeTickRate;s.accumulator+=dt;
  while(s.accumulator+1e-10>=h&&s.status==='play'){tick(s,inputs,h);s.accumulator-=h;s.elapsed+=h;s.ticks++;}
  return s;
 }
 return {compile,create,restart,step,solids,overlap,NATIVE};
});
