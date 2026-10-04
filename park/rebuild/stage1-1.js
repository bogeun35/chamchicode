(function(root){
'use strict';
const box=(id,x,y,w,h)=>({id,x,y,w,h});
function createStage(playerCount=2){
 if(!Number.isInteger(playerCount)||playerCount<2||playerCount>8)throw new Error('Player count must be 2 through 8');
 return {
  id:'pico1/world/01-01',name:'1-1 동선 재구성',width:2440,height:720,
  reconstruction:{status:'reconstruction_pending',source:'https://www.youtube.com/watch?v=QI0BvgCULM0',
   observed:'Two-player route: flat start, narrow gap, two steps, large gap, lower-right bridge button, all-player lift, airborne key, elevated exit.',
   observedPlayerCount:2,geometry:'reconstruction_pending',physics:'calibration_pending',
   populationScaling:playerCount===2?'two-player route observed; numerical calibration pending':'unverified adaptation; not source-verified'},
  platforms:[box('start',0,600,400,120),box('after-small-gap',440,600,360,120),box('step-one',800,562,80,158),box('step-two',880,524,320,196),box('button-bank',1426,600,374,120),box('far-bank',1920,600,520,120),box('exit-ledge',1920,360,520,24)],
  switches:[{...box('bridge-button',1500,600,80,6),signal:'gap-bridge'}],
  devices:[{...box('gap-bridge',1200,600,226,10),kind:'bridge',signal:'gap-bridge',mode:'while',active:false},
   {...box('team-lift',1800,600,120,12),kind:'lift',fromY:600,toY:360,speed:70,requiredPlayers:playerCount,active:true}],
  timers:[],key:{...box('key',1848,307,24,24),taken:false},exit:box('exit',2230,282,58,78),
  spawns:Array.from({length:playerCount},(_,i)=>({x:65+i*40,y:562})),hazards:[],killY:770
 };
}
const api={createStage};if(typeof module!=='undefined'&&module.exports)module.exports=api;root.ParkStageOne=api;
})(typeof window!=='undefined'?window:globalThis);
