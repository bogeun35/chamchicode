/* Source-derived PP2 Blackout (ordinal 97) / BlackoutController (127).
 * Static GameAssembly.dll analysis only; original code was never executed.
 * ParseParameter 0x1817ceb20: slots 0/1 -> positive bright/dark FP timers;
 * slot 2 -> darkness, minimum raw 0x3333 (0x1817ced09); slot 3 -> option
 * byte (0x1817ced1a); slot 4 -> positive fade time (0x1817ced48);
 * slots 5/6 -> background bit1 / drop-curtain bit2 (0x1817ced51/6e).
 * InitPost 0x1817cee35: both timers zero -> alpha=darkness, phase4;
 * bright zero -> interpolator end/start/result=darkness, phase2; dark zero
 * -> those values zero. OnStart 0x1817cf0cd finds controller type127 and
 * forces phase0. Curtain overrides fade to .8 and darkness to .6
 * (0x1817cf15c/18a). No collision initialization in either Creator
 * (0x1817ce950/0x1817d0170); no direct damage/death emission.
 * Default fade raw = QFP.OneFrame * QFP._4 >>16 =1092*4=4368
 * (.cctor 0x1817cfe47..68); curtain time QFP._0_80=52428 (0x1817cfe88).
 * Both .cctors were also checked with resolve-string-literals.local.py:
 * there are no FP.FromString calls in these two constructors.
 * QFP .cctor 0x181780cc0 supplies .6=39321 and .005=327 (statics+0x98/10).
 * updatePhase 0x1817cf220: phase0 advance bright fade, then suspend + bright
 * timer; phase1 wait timer or controller bit5, start dark fade and resume;
 * phase2 advance dark fade then dark timer; phase3 wait timer or !bit5,
 * start bright fade and suspend, then phase0. Phase4 does nothing.
 * Fade advances ONLY in phases0/2 via isFade 0x1817cfa30; startFade
 * 0x1817cf950 stores a linear FPInterpolator (type0). Run 0x18183bdc0
 * uses separately shifted start/end products (0x18183bfb3..c4).
 * suspendStage/resumeStage 0x1817cf849/8e9 act ONLY if option==1:
 * broadcast event53 with pause true/false at param+0x76. ActorComponent
 * OnRecvEvent 0x18169eaa8 delegates to setPause 0x18169f020 (bits4/6).
 * These broadcasts pause actor simulation/animation, not just visibility;
 * Blackout/Controller explicitly ignore event53 (0x1817cfb39/0x1817d0d0e).
 * Event15 sets Blackout bit6 permanently (0x1817cfb7e); CheckAlivePlayer
 * 0x1817cfc80 actually returns false if ANY player has dead bit9, not only
 * when all die. Stage requested-any also releases blackout cycling.
 * Controller ParseParameter 0x1817d036c/386 reads slots0/1 using
 * QPlayerCountParamUtility 0x18096f720: 56 UTF16 units, subtract0x21 from
 * low byte, seven signed LE int64 FP raws; count-2 downward nonzero search
 * (0x1817d03f0/470). Nonpositive resolutions retain QFP._4 default
 * (Initialize 0x1817d02d0/2e9; stores 0x1817d0506/532).
 * OnStart 0x1817d05ea binds first type97, RNG.Next(0,gamePlayerInfo.Count)
 * 0x1817d06f9 chooses once: PlayerRef-1 and ColorIndex (0x1817d0716/71f).
 * Controller phases0/1/2/3 = BlackoutWait/TextWait/KeyWait/End.
 * phase0 counts inactive, sets bit5, timer=active+QFP._0_005
 * (0x1817d0b24..6e). phase1 counts down then reveals UI (0x1817d0a3c).
 * phase2 accepts selected player's Shot only: Input.Shot struct+0x78
 * (quantum-field-offsets.json: offset136-16); counters +0x7c==+0x80>0
 * (0x1817d08e2..f3 / waitKey 0x1817d0bc0). Clears UI and bit5, sets
 * timer=inactive+.005 (0x1817d0914..9c8); never reselects player.
 * Death/request -> phase3, clears UI but leaves bit5 (0x1817d0b7d).
 * PCG multiplier at 0x1816620bc; algorithm and default stream copied from
 * source-landmine-devices.js. The session seed and player list are external.
 * Actor population rule: ActorFactoryComponent.Update 0x1816a30ee..3147.
 * FP scale65536 and float truncation: FP.FromFloat_UNSAFE 0x18163fc40;
 * integer parameter extraction is arithmetic sar16, hence Math.floor below.
 * Rendering: BlackoutView 0x18058b959/9ee reads alpha; controller view
 * 0x18058a2e2/33f reads UI bit/player/color. Curtain command ids1..4 and
 * down flag only on3: playDropCurtain 0x1817cf7ca..fa. No Unity assets copied.
 */
(function(root,factory){const api=factory();if(typeof module==='object'&&module.exports)module.exports=api;root.SourceBlackoutDevices=api;})(typeof globalThis!=='undefined'?globalThis:this,function(){
'use strict';
const FP=65536,MIN_DARK=0x3333,DEFAULT_FADE=4368,CURTAIN_FADE=52428,CURTAIN_DARK=39321,DEFAULT_CONTROL_TIME=262144,BIAS=327;
const EVENT={PAUSE:53,STAGE_END:15};
const MASK64=(1n<<64n)-1n,PCG_MULT=6364136223846793005n;
const DEFAULT_STATE=0x853c49e6748fea9bn,DEFAULT_INC=0xda3e39cb94b95bdbn;
const clone=x=>JSON.parse(JSON.stringify(x));
const allowed=(v,c)=>!v||v<0&&c<=-v||v>0&&v<10&&c>=v||v>=10&&c>=Math.trunc(v/10)&&c<=v%10;
const tickRaw=dt=>Math.trunc(dt*FP);
function pcg32(rng){const old=rng.state;rng.state=(old*PCG_MULT+(rng.inc|1n))&MASK64;const x=Number(((old>>45n)^(old>>27n))&0xffffffffn),rot=Number((old>>59n)&31n);return ((x>>>rot)|(x<<((32-rot)&31)))>>>0;}
function rngRange(rng,min,max){if(min>max)[min,max]=[max,min];const span=max-min;if(span<=0)return min;const threshold=(0x100000000%span)>>>0;let x;do{x=pcg32(rng);}while(x<threshold);return min+x%span;}
function playerCountTable(slot){
 if(!slot||slot.t!==2||typeof slot.s!=='string')throw Error('BlackoutController QPlayerCountParam string is missing');
 let text=slot.s;if(text.length===58&&text[0]==='"'&&text[57]==='"')text=text.slice(1,-1);
 if(text.length!==56)throw Error('BlackoutController QPlayerCountParam must have 56 UTF16 units');
 const out=[];for(let i=0;i<7;i++){let v=0n;for(let b=7;b>=0;b--)v=(v<<8n)|BigInt((text.charCodeAt(i*8+b)-0x21)&255);v=BigInt.asIntN(64,v);const n=Number(v);if(!Number.isSafeInteger(n))throw Error('BlackoutController FP table exceeds safe integer range');out.push(n);}return out;
}
function findByPlayerCount(table,count){for(let i=count-2;i>=0;i--)if(table[i])return table[i];return 0;}
function compile(actors,count,options={}){
 if(!Number.isInteger(count)||count<2||count>8)throw Error('Blackout supports player counts 2..8');
 const blackouts=[],controllers=[];
 for(let i=0;i<actors.length;i++){
  const raw=actors[i],a=raw.properties||raw,type=a.typeName;
  if(!supportedTypes.includes(type)||!allowed(a.playerCount,count))continue;
  const data=raw.datas||raw.parameters||a.datas||[],pos=raw.position||{x:raw.x??raw.posX,y:raw.y??raw.posY};
  const common={id:raw.id||'source:a'+i,name:a.name||'',type,x:pos.x??0,y:pos.y??0};
  const n=j=>{const value=data[j]?.t===1?data[j].f:0;if(!Number.isFinite(value))throw Error('Blackout numeric slot '+j+' is invalid');return tickRaw(value);};
  if(type==='Blackout'){
   const brightRaw=Math.max(0,n(0)),darkRaw=Math.max(0,n(1)),curtain=Math.floor(n(6)/FP)!==0;
   const darknessRaw=curtain?CURTAIN_DARK:Math.max(MIN_DARK,n(2));
   const phase=brightRaw===0&&darkRaw===0?4:brightRaw===0?2:0;
   const initial=phase===4||brightRaw===0?darknessRaw:0;
   blackouts.push({...common,brightRaw,darkRaw,darknessRaw,option:Math.floor(n(3)/FP)&255,
    fadeRaw:curtain?CURTAIN_FADE:n(4)>0?n(4):DEFAULT_FADE,changeBackground:Math.floor(n(5)/FP)!==0,
    curtain,curtainDown:false,phase,alphaRaw:phase===4?initial:0,timerRaw:0,
    controller:false,inBlackout:false,suspended:false,fade:{startRaw:initial,endRaw:initial,currentRaw:initial,timeRaw:0,totalRaw:0,active:phase!==4}});
  }else{
   const activeTable=playerCountTable(data[0]),inactiveTable=playerCountTable(data[1]);
   const active=findByPlayerCount(activeTable,count),inactive=findByPlayerCount(inactiveTable,count);
   controllers.push({...common,activeTable,inactiveTable,activeRaw:active>0?active:DEFAULT_CONTROL_TIME,
    inactiveRaw:inactive>0?inactive:DEFAULT_CONTROL_TIME,phase:0,visibleUI:false,playerIndex:null,colorIndex:null,blackoutId:null,timerRaw:0});
  }
 }
 // Singletons in every shipped world stage; refuse unverified multiple ordering.
 if(blackouts.length>1||controllers.length>1)throw Error('Blackout multiple-component update order is unresolved');
 if(controllers.length&&!blackouts.length)throw Error('BlackoutController requires a Blackout in this module');
 const rng={state:BigInt(options.rngState??DEFAULT_STATE)&MASK64,inc:BigInt(options.rngIncrement??DEFAULT_INC)&MASK64};
 const infos=options.playerInfo||Array.from({length:count},(_,i)=>({playerIndex:i,colorIndex:null}));
 const pendingEvents=[];
 for(const c of controllers){
  if(!infos.length||infos.some(p=>!Number.isInteger(p.playerIndex)||p.playerIndex<0||p.playerIndex>=8))throw Error('BlackoutController needs valid game player info');
  const chosen=infos[rngRange(rng,0,infos.length)];c.playerIndex=chosen.playerIndex;c.colorIndex=chosen.colorIndex??null;
  c.blackoutId=blackouts[0].id;c.timerRaw=c.inactiveRaw;blackouts[0].controller=true;blackouts[0].phase=0;
 }
 for(const b of blackouts)if(b.phase===0&&b.option===1)pendingEvents.push(pauseEvent(b,true));
 return {schemaVersion:1,count,blackouts,controllers,pendingEvents,actorsPaused:pendingEvents.length>0,
  rng:{state:rng.state.toString(),inc:rng.inc.toString()},completePhysicsFidelity:false};
}
function pauseEvent(b,pause){return {broadcast:true,eventType:EVENT.PAUSE,pause,senderId:b.id};}
const create=clone;
function solids(){return [];}
function signal(state,event){
 const type=event.eventType??event.event;
 for(const b of state.blackouts)if((event.broadcast||event.broadcastActorType===97||event.targetName===b.name||event.targetId===b.id)&&type===EVENT.STAGE_END)b.suspended=true;
 // Event53 is deliberately ignored by both components.
}
function startFade(b,dark){b.fade={startRaw:b.fade.currentRaw,endRaw:dark?b.darknessRaw:0,currentRaw:b.fade.currentRaw,timeRaw:0,totalRaw:b.fadeRaw,active:true};}
function advanceFade(b,dtRaw){
 const f=b.fade;if(f.active){f.timeRaw+=dtRaw;if(f.timeRaw>=f.totalRaw){f.timeRaw=f.totalRaw;f.active=false;}}
 if(f.totalRaw<=0||f.timeRaw>=f.totalRaw)f.currentRaw=f.endRaw;
 else{const t=BigInt(f.timeRaw)*65536n/BigInt(f.totalRaw);f.currentRaw=Number(((65536n-t)*BigInt(f.startRaw)>>16n)+(t*BigInt(f.endRaw)>>16n));}
 b.alphaRaw=f.currentRaw;return f.active;
}
function beforeStep(state,ctx={}){
 const dt=ctx.dt??1/60;if(!Number.isFinite(dt)||dt<0)throw Error('Invalid blackout delta');const d=tickRaw(dt);
 for(const e of ctx.events||[])signal(state,e);
 const events=state.pendingEvents.splice(0),curtainCommands=[];
 const alive=!(ctx.players||[]).some(p=>p.dead||p.isDead),requested=!!ctx.stageRequestedAny;
 function pause(b,value){if(b.option===1){state.actorsPaused=value;events.push(pauseEvent(b,value));}}
 function curtain(b,id){if(b.curtain){b.curtainDown=id===3;curtainCommands.push({id:b.id,animationId:id});}}
 // Native entity order: Blackout is authored before Controller in both shipped stages.
 for(const b of state.blackouts)switch(b.phase){
  case 0:
   if(advanceFade(b,d))break;curtain(b,1);
   if(b.suspended||!alive||requested){b.phase=4;break;}
   pause(b,true);b.timerRaw=b.brightRaw;b.phase=1;break;
  case 1:
   if(!b.suspended&&alive&&!requested){if(b.controller){if(!b.inBlackout)break;}else{if(b.darkRaw===0)break;b.timerRaw-=d;if(b.timerRaw>0)break;}}
   startFade(b,true);curtain(b,2);pause(b,false);b.phase=2;break;
  case 2:
   if(b.suspended){b.phase=4;break;}if(advanceFade(b,d))break;curtain(b,3);b.timerRaw=b.darkRaw;b.phase=3;break;
  case 3:
   if(!b.suspended&&alive&&!requested){if(b.controller){if(b.inBlackout)break;}else{if(b.brightRaw===0)break;b.timerRaw-=d;if(b.timerRaw>0)break;}}
   startFade(b,false);curtain(b,4);if(!b.suspended&&alive&&!requested)pause(b,true);b.phase=0;break;
  default:break;
 }
 for(const c of state.controllers){
  if(c.phase===3)continue;if(!alive||requested){c.visibleUI=false;c.phase=3;continue;}
  const b=state.blackouts.find(b=>b.id===c.blackoutId);if(!b)continue;
  if(c.phase===0){c.timerRaw-=d;if(c.timerRaw<=0){b.inBlackout=true;c.timerRaw=c.activeRaw+BIAS;c.phase=1;}}
  else if(c.phase===1){c.timerRaw-=d;if(c.timerRaw<=0){c.visibleUI=true;c.phase=2;}}
  else if(c.phase===2){
   // Host supplies the native Shot WasPressed predicate, or its two raw counters.
   const input=ctx.gamePlayerInputs?.[c.playerIndex],shot=input?.shot;
   if(input?.shotPressed===true||shot&&shot.counter7c>0&&shot.counter7c===shot.counter80){c.visibleUI=false;b.inBlackout=false;c.timerRaw=c.inactiveRaw+BIAS;c.phase=0;}
  }
 }
 return {events,curtainCommands,actorsPaused:state.actorsPaused,solids:[],deadPlayerIds:[]};
}
function afterStep(state,ctx={}){for(const e of ctx.events||[])signal(state,e);return {events:[],solids:[],deadPlayerIds:[]};}
function displays(state){return {blackouts:state.blackouts.map(b=>({id:b.id,phase:b.phase,alphaRaw:b.alphaRaw,alpha:b.alphaRaw/FP,darknessRaw:b.darknessRaw,curtain:b.curtain,curtainDown:b.curtainDown,changeBackground:b.changeBackground,inBlackout:b.inBlackout,suspended:b.suspended})),controllers:state.controllers.map(c=>({id:c.id,phase:c.phase,visibleUI:c.visibleUI,playerIndex:c.playerIndex,colorIndex:c.colorIndex,timerRaw:c.timerRaw})),actorsPaused:state.actorsPaused};}
const supportedTypes=['Blackout','BlackoutController'];
return {compile,create,solids,beforeStep,afterStep,displays,signal,supportedTypes,playerCountTable,findByPlayerCount,pcg32,rngRange,tickRaw,
 nativeConstants:{minimumDarknessRaw:MIN_DARK,defaultFadeRaw:DEFAULT_FADE,curtainFadeRaw:CURTAIN_FADE,curtainDarknessRaw:CURTAIN_DARK,defaultControllerTimeRaw:DEFAULT_CONTROL_TIME,controllerBiasRaw:BIAS,event:EVENT},
 integration:{order:'Run Blackout then Controller once per tick, even while actors are paused. Forward OnStart pendingEvents before actor motion on the first tick.',pause:'Broadcast event53 pauses ordinary actor simulation and animation; solids remain present. Blackout and BlackoutController must keep ticking. Do not equate this to StageComponent.Suspend.',input:'Supply gamePlayerInputs indexed by native zero-based PlayerRef-1: shotPressed or shot:{counter7c,counter80}. Suppress a player input if its Stage input-mask bit is set (Frame.GetGamePlayerInput 0x18174a69c).',players:'Supply every player with dead/isDead; any death makes CheckAlivePlayer false. Supply stageRequestedAny for native clear/restart requests.',random:'Pass session rngState/rngIncrement and ordered playerInfo [{playerIndex,colorIndex}]. Default stream is reproducible, not an original-session seed. Missing colors stay null for the renderer to resolve.',render:'Use displays alpha, curtainDown and UI player/color. Curtain animation commands are native ids, not copied animation assets.'},completePhysicsFidelity:false};
});
