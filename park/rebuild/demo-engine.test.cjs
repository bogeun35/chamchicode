'use strict';
const assert=require('node:assert/strict'),E=require('./engine.js');
let checks=0;function test(name,fn){fn();checks++;console.log('PASS '+name);}
function map(extra={}){return {id:'demo-test',width:1200,height:675,platforms:[{id:'floor',x:0,y:600,w:1200,h:75}],spawns:[{x:50,y:562},{x:200,y:562}],key:null,exit:{id:'exit',x:1100,y:520,w:50,h:80},...extra};}
function create(extra){return E.create(['a','b'],{map:map(extra)});}
function tick(s,input={},frames=1){for(let i=0;i<frames;i++)E.step(s,input);}
test('custom map copied and missing arrays defaulted',()=>{const m=map();const s=E.create(['a','b'],{map:m});tick(s,{a:{right:true}},10);assert.equal(m.spawns[0].x,50);assert.equal(s.keyTaken,true);assert.throws(()=>create({spawns:[]}));});
test('coins gate exit and count once',()=>{const s=create({coins:[{id:'coin',x:80,y:565,w:20,h:20}]});tick(s,{a:{right:true}},15);assert.equal(s.coinsTaken,1);tick(s,{},10);assert.equal(s.coinsTaken,1);});
test('time limit fails without simulation NaN',()=>{const s=create({timeLimit:0.1});tick(s,{},20);assert.equal(s.failure.reason,'time');});
test('spring bounces on landing',()=>{const s=create({springs:[{id:'spring',x:40,y:600,w:70,h:8,power:700}]});tick(s,{},2);assert(s.players[0].vy<0);});
test('moving platform carries standing player',()=>{const s=create({platforms:[],movingPlatforms:[{id:'moving',x:0,y:600,w:500,h:30,axis:'x',distance:200,speed:100}]});tick(s,{},60);assert(s.players[0].x>140);assert(s.players[0].grounded);});
test('moving hazard updates and collides',()=>{const s=create({hazards:[{id:'hazard',x:300,y:560,w:30,h:40,axis:'x',distance:-300,speed:200}]});tick(s,{},120);assert.equal(s.failure.reason,'hazard');});
test('flight gains altitude without a grounded jump',()=>{const s=create({rules:{flight:true}});tick(s,{a:{jump:true}},30);assert(s.players[0].y<450);});
test('wind carries idle player',()=>{const s=create({rules:{wind:50}});tick(s,{},30);assert(s.players[0].x>70);});
test('red light fails moving and permits stillness',()=>{const s=create({rules:{trafficLight:{go:0.1,stop:1}}});tick(s,{},15);assert(s.trafficStop);assert.equal(s.status,'play');tick(s,{a:{right:true}});assert.equal(s.failure.reason,'traffic');});
test('shared stamina depletes and recovers',()=>{const s=create({rules:{stamina:{max:0.2,recovery:1}}});tick(s,{a:{left:true}},20);assert.equal(s.stamina,0);tick(s,{},20);assert(s.stamina>0.19);});
test('one-at-time rejects simultaneous movement',()=>{const s=create({rules:{oneAtTime:true}});tick(s,{a:{left:true},b:{right:true}});assert.equal(s.failure.reason,'one-at-time');});
test('ice preserves movement on release',()=>{const s=create({rules:{ice:true}});tick(s,{a:{left:true}},10);const v=s.players[0].vx;tick(s,{});assert(s.players[0].vx<0);assert(s.players[0].vx>v);});
test('crate pushes and does not pass solid walls',()=>{const s=create({spawns:[{x:50,y:562},{x:500,y:562}],crates:[{id:'crate',x:90,y:552,w:45,h:48}]});tick(s,{a:{right:true}},30);assert(s.map.crates[0].x>150);assert(s.players[0].x+s.players[0].w<=s.map.crates[0].x+0.1);});
test('contact-forbidden rejects touching players',()=>{const s=create({spawns:[{x:50,y:562},{x:84,y:562}],rules:{noContact:true}});tick(s,{a:{right:true}},5);assert.equal(s.failure.reason,'contact');});
test('rope restrains spread without resetting stage',()=>{const s=create({rules:{ropeLength:160}});tick(s,{a:{left:true},b:{right:true}},120);assert.equal(s.status,'play');assert(Math.hypot(s.players[0].x-s.players[1].x,s.players[0].y-s.players[1].y)<162);});
test('map physics tunes jump while preserving defaults',()=>{const s=create({physics:{jumpSpeed:700}});assert.equal(s.physics.jumpSpeed,700);assert.equal(s.physics.gravity,1500);});
test('timer bonus is awarded once while switch held',()=>{const s=create({timeLimit:10,switches:[{id:'bonus',x:40,y:600,w:80,h:6,signal:'bonus',timeBonus:8}]});tick(s,{},60);assert.equal(s.map.timeLimit,18);assert(s.map.switches[0].bonusUsed);});
test('signal spring stays off until teammate holds switch',()=>{const s=create({springs:[{id:'spring',x:40,y:600,w:80,h:8,power:700,signal:'boost'}],switches:[{id:'button',x:250,y:600,w:80,h:6,signal:'boost'}]});tick(s,{},10);assert.equal(s.players[0].vy,0);tick(s,{b:{right:true}},20);assert(s.players[0].y<550);});
console.log(checks+' demo mechanics checks passed');
