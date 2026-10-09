'use strict';
const assert=require('node:assert/strict'),M=require('./mini-games.js');let checks=0;
function test(n,f){f();checks++;console.log('PASS '+n);}
function run(s,control,frames=6000){for(let n=0;n<frames&&s.status==='play';n++)M.step(s,control(s,n));return s;}
const all=(s,v)=>s.players.map(()=>({...v}));
function finite(o,path='state'){if(typeof o==='number')assert(Number.isFinite(o)||o===Infinity,path);else if(o&&typeof o==='object')for(const[k,v]of Object.entries(o))finite(v,path+'.'+k);}
test('every mini descriptor starts at2..8 and survives finite simulation',()=>{let n=0;for(const d of M.list())for(let c=2;c<=8;c++){const s=M.create(d.id,c);run(s,(s,f)=>all(s,{left:f%120<30,right:f%120>80,action:f%30===0,down:f%90===0}),300);finite(s);n++;}console.log('  '+n+' stage/population cases');});
test('precision input-only success2..8',()=>{for(let c=2;c<=8;c++){const s=M.create('pico1/world/04-03',c);run(s,s=>all(s,{action:s.time>=4.85}),400);assert.equal(s.status,'clear');}});
test('reaction input-only five rounds2..8',()=>{for(let c=2;c<=8;c++){const s=M.create('pico2/world/10-01',c);run(s,s=>all(s,{action:s.delay<=0&&s.roundTime>=s.signalAt}),2500);assert.equal(s.status,'clear');}});
test('graph input-only five shapes2..8',()=>{for(let c=2;c<=8;c++){const s=M.create('pico2/world/13-02',c);run(s,s=>s.players.map((p,i)=>({left:i<s.targetLeft,right:i>=s.targetLeft})),500);assert.equal(s.status,'clear');}});
test('memory input-only correct choices2..8',()=>{for(let c=2;c<=8;c++){const s=M.create('pico2/world/03-04',c);run(s,(s,n)=>s.players.map((p,i)=>s.roundTime<=3?{}:{right:n%2===0&&p.choice<s.pattern[i],action:p.choice===s.pattern[i]&&!p.ready}),1800);assert.equal(s.status,'clear');}});
test('blocks input-only shared line clears2..8',()=>{for(let c=2;c<=8;c++){const s=M.create('pico1/world/08-01',c);run(s,s=>all(s,{down:true}),100);assert.equal(s.status,'clear');}});
test('blocks preserve incorrect placements between piece batches',()=>{const s=M.create('pico1/world/08-01',2);M.step(s,[{left:true,action:true},{}]);M.step(s,[{down:true},{down:true}]);const occupied=s.grid.flat().filter(Boolean).length;assert(occupied>8);assert(s.grid.slice(0,10).some(row=>row.some(Boolean)));});
test('whack missed good targets consume lives',()=>{const s=M.create('pico2/world/14-04',2);run(s,()=>[],1000);assert.equal(s.status,'dead');assert.equal(s.lives,0);});
test('whack input-only targets success2..8',()=>{for(let c=2;c<=8;c++){const s=M.create('pico2/world/14-02',c);run(s,s=>s.players.map((p,i)=>({action:i===s.target&&!s.bad&&!s.hit&&s.time<s.activeUntil})),10000);assert.equal(s.status,'clear');}});
test('basketball input-only aiming and scoring',()=>{const s=M.create('pico2/world/08-02',2);run(s,(s,n)=>[{left:s.players[0].angle<1.1,action:s.players[0].angle>=1.1&&n%30===0},{}],1200);assert.equal(s.status,'clear');});
function paddle(s,n){return s.players.map(p=>{const target=s.ball.x-s.paddleWidth/2+(s.family==='bricks'?Math.sin(n/91)*28:0);return{left:p.x>target+3,right:p.x<target-3};});}
test('rally input-only twelve returns',()=>{const s=M.create('pico2/world/13-03',2);run(s,paddle,12000);assert.equal(s.status,'clear');});
test('bricks input-only all bricks cleared',()=>{const s=M.create('pico1/world/08-02',2);run(s,paddle,30000);assert.equal(s.status,'clear');});
test('held action cannot score repeated precision hits',()=>{const s=M.create('pico1/battle/04',2);M.step(s,[{action:true},{}]);const score=s.players[0].score;M.step(s,[{action:true},{}],1);assert.equal(s.players[0].score,score);});
test('invalid time rejected and zero dt is inert',()=>{const s=M.create('pico2/world/14-04',2);assert.throws(()=>M.step(s,[],NaN));assert.throws(()=>M.step(s,[],2));const before=JSON.stringify(s);M.step(s,[{action:true}],0);assert.equal(JSON.stringify(s),before);});
console.log(checks+' mini-game checks passed');
