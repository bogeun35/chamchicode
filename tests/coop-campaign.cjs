const assert=require('node:assert/strict');
const E=require('../coop-engine.js');
const results=[]; assert.equal(E.LEVEL_COUNT,20);
assert.equal(new Set(Array.from({length:20},(_,n)=>E.level(n,8).name)).size,20,'distinct stage identities');
for(let count=2;count<=8;count++)for(let n=0;n<E.LEVEL_COUNT;n++){
 const state=E.create(Array.from({length:count},(_,i)=>String(i)),n), m=state.map;
 for(let i=0;i<120;i++)E.step(state,{});
 assert.equal(state.status,'play',`safe idle spawn: ${count} players, stage ${n+1}`);
 for(const r of [...m.platforms,...m.switches,...m.hazards,...m.crates,m.key,m.exit])assert(r.x>=0&&r.x+r.w<=E.W&&r.y>=0&&r.y+r.h<=E.H,`map bounds: ${n+1}`);
 if(n>=8){
  const human=m.switches.filter(sw=>sw.accept==='player');
  for(let i=0;i<human.length;i++)for(let j=i+1;j<human.length;j++)if(human[i].y===human[j].y){
   const [left,right]=[human[i],human[j]].sort((a,b)=>a.x-b.x);
   assert(right.x-left.x-left.w>=32,`one player cannot cover two switches: stage ${n+1}`);
  }
 }
}
// Separate unit check: a box cannot impersonate a teammate at new human-only stations.
{
 const state=E.create(['a','b'],8), sw=state.map.switches[0];
 state.map.crates.push({x:sw.x,y:550,w:50,h:50});
 for(let i=0;i<120;i++)E.step(state,{});
 assert.equal(state.switchActive[0],false);
}
for(let count=2;count<=8;count++)for(let level=0;level<E.LEVEL_COUNT;level++){
 const ids=Array.from({length:count},(_,i)=>String(i)); const s=E.create(ids,level);const activity=Object.fromEntries(ids.map(id=>[id,0]));
 const tick=(inputs={},n=1)=>{for(let i=0;i<n;i++){for(const [id,v]of Object.entries(inputs))if(v.left||v.right||v.jump)activity[id]++;E.step(s,inputs);}};
 const walk=(id,x)=>{const p=s.players.find(p=>p.id===id);for(let i=0;i<400&&Math.abs(p.x-x)>4&&!(x===1120&&p.exit)&&s.status==='play';i++)tick({[id]:{right:p.x<x,left:p.x>x}});assert(s.status==='clear'||(x===1120&&p.exit)||Math.abs(p.x-x)<=4,`walk ${id} to ${x}, got ${p.x}; ${s.status}`);};
 const climb=(id,plat)=>{const p=s.players.find(p=>p.id===id);const support=s.map.platforms.concat(s.map.crates,s.players.filter(q=>q!==p)).find(q=>Math.abs(q.y-p.y-p.h)<1&&p.x<q.x+q.w&&p.x+p.w>q.x);assert(support,'missing support');walk(id,Math.min(plat.x-p.w-5,support.x+support.w-6));tick({},2);tick({[id]:{jump:true}});let frames=0;while(p.y+p.h>plat.y&&frames++<30)tick({});while(p.x<plat.x+10&&frames++<60)tick({[id]:{right:true}});tick({},50);assert.equal(p.y+p.h,plat.y,`land ${id} platform ${plat.x}`);};
 const jumpKey=id=>{tick({[id]:{jump:true}});tick({},50);};
 const cross=(id,h)=>{walk(id,h.x-50);tick({},30);tick({[id]:{jump:true,right:true}});tick({[id]:{right:true}},42);assert.equal(s.status,'play',`hazard ${id}`);};

 const descend=id=>{walk(id,1010);tick({},60);};
 const climbLeft=(id,plat)=>{const p=s.players.find(p=>p.id===id);const support=s.map.platforms.concat(s.map.crates,s.players.filter(q=>q!==p)).find(q=>Math.abs(q.y-p.y-p.h)<1&&p.x<q.x+q.w&&p.x+p.w>q.x);assert(support,'left support');walk(id,Math.max(plat.x+plat.w+5,support.x-p.w+6));tick({},2);tick({[id]:{jump:true}});let frames=0;while(p.y+p.h>plat.y&&frames++<30)tick({});while(p.x>plat.x+plat.w-40&&frames++<60)tick({[id]:{left:true}});tick({},50);assert.equal(p.y+p.h,plat.y,'left landing');};
 const travel=(id,x)=>{const p=s.players.find(p=>p.id===id);for(const h of s.map.hazards)if(p.x<h.x&&x>h.x+h.w)cross(id,h);walk(id,x);};
 const openAndExit=()=>{tick({},60);assert(s.gateOpen,'all stations occupied');for(const id of ids){travel(id,990);jumpKey(id);travel(id,1120);tick({},60);}};
 try{
 tick({},30);
 if(level===0||level===5){for(const id of ids){for(const p of s.map.platforms.slice(1))climb(id,p);walk(id,level===0?455:710);jumpKey(id);walk(id,1120);tick({},60);}}
 if(level===1){climb('1',s.map.crates[0]);walk('1',390);climb('0',s.players[1]);climb('0',s.map.platforms[1]);walk('0',590);jumpKey('0');for(const id of ids)walk(id,1120);}
 if(level===2){for(let i=0;i<s.map.switches.length;i++)walk(ids[i],s.map.switches[i].x+10);tick({},3);assert(s.gateOpen);walk('0',990);jumpKey('0');for(const id of ids)walk(id,1120);}
 if(level===3){walk('0',600);assert(s.gateOpen);walk('0',990);jumpKey('0');for(const id of ids)walk(id,1120);}
 if(level===4){for(const id of ids){for(const h of s.map.hazards)cross(id,h);walk(id,990);jumpKey(id);walk(id,1120);}}
 if(level===6){walk('0',620);climb('0',s.map.crates[0]);climb('0',s.map.platforms[1]);walk('0',790);walk('1',215);tick({},3);assert(s.gateOpen);walk('0',905);tick({},3);assert(s.keyTaken);for(const id of ids)walk(id,1120);tick({},60);}
 if(level===7){cross('0',s.map.hazards[0]);const first=s.map.platforms[1];walk('0',first.x+first.w+5);tick({'0':{jump:true}});for(let i=0;i<60&&s.players[0].y+38>first.y&&s.status==='play';i++)tick({});for(let i=0;i<60&&s.players[0].x>first.x+50&&s.status==='play';i++)tick({'0':{left:true}});tick({},50);assert.equal(s.players[0].y+38,first.y);climb('0',s.map.platforms[2]);walk('0',625);tick({},3);assert(s.keyTaken);walk('0',660);tick({'0':{jump:true,right:true}});tick({'0':{right:true}},42);tick({},30);walk('0',920);tick({},30);assert(s.gateOpen);walk('0',1120);for(const id of ids.slice(1)){for(const h of s.map.hazards)cross(id,h);walk(id,1120);}}

 if(level===8){walk('0',230);for(const id of ids.slice(1)){climb(id,s.map.platforms[1]);climb(id,s.map.platforms[2]);walk(id,s.map.switches[Number(id)].x+5);}tick({},3);assert(s.gateOpen);walk('1',945);jumpKey('1');for(const id of ids)walk(id,1120);tick({},60);}
 if(level===9){for(const id of ids)travel(id,s.map.switches[Number(id)].x+5);openAndExit();}
 if(level===10){walk('0',545);climb('0',s.map.crates[0]);walk('0',900);tick({},60);assert(s.gateOpen);for(const id of ids){if(id!=='0'){climb(id,s.map.crates[0]);walk(id,895);tick({},60);}climb(id,s.map.crates[1]);walk(id,990);jumpKey(id);walk(id,1120);}tick({},60);}
 if(level===11){climb('0',s.map.platforms[1]);climbLeft('0',s.map.platforms[2]);climbLeft('0',s.map.platforms[3]);walk('0',155);jumpKey('0');descend('0');for(const id of ids)walk(id,s.map.switches[Number(id)].x+5);openAndExit();}
 if(level===12){climb('1',s.map.crates[0]);walk('1',390);climb('0',s.players[1]);climb('0',s.map.platforms[1]);walk('0',590);jumpKey('0');descend('0');for(const id of ids){if(Number(id)>1)climb(id,s.map.crates[0]);walk(id,s.map.switches[Number(id)].x+5);}openAndExit();}
 if(level===13){for(const id of ids){climb(id,s.map.platforms[1]);climb(id,s.map.platforms[2]);walk(id,s.map.switches[Number(id)].x+5);}tick({},60);assert(s.gateOpen);walk('0',970);jumpKey('0');for(const id of ids)walk(id,1120);tick({},60);}
 if(level===14){for(const id of ids){const slot=Number(id),p=s.map.platforms[slot<Math.ceil(count/2)?1:2];climb(id,p);walk(id,s.map.switches[slot].x+5);}tick({},60);assert(s.gateOpen);const id=ids[ids.length-1];walk(id,935);jumpKey(id);for(const id of ids)walk(id,1120);tick({},60);}
 if(level===15){for(const id of ids){const tier=Number(id)%4;for(let i=1;i<=Math.min(tier+1,3);i++)climb(id,s.map.platforms[i]);if(tier===3){walk(id,840);tick({},50);}walk(id,s.map.switches[Number(id)].x+5);}tick({},60);assert(s.gateOpen);const climber=ids[Math.min(2,count-1)];if(count===2)climb(climber,s.map.platforms[3]);walk(climber,700);jumpKey(climber);for(const id of ids)walk(id,1120);tick({},60);}
 if(level===16){walk('0',420);for(const id of ids.slice(1)){climb(id,s.map.crates[0]);climb(id,s.map.platforms[1]);walk(id,s.map.switches[Number(id)].x+5);}walk('0',980);tick({},60);assert(s.gateOpen);walk('1',925);jumpKey('1');for(const id of ids)walk(id,1120);tick({},60);}
 if(level===17){for(const id of ids)travel(id,s.map.switches[Number(id)].x+5);openAndExit();}
 if(level===19){for(const id of ids){for(const p of s.map.platforms.slice(1))climb(id,p);walk(id,s.map.switches[Number(id)].x+5);}tick({},60);assert(s.gateOpen);walk('0',1040);jumpKey('0');for(const id of ids)walk(id,1140);tick({},30);}
 if(level===18){for(const id of ids.slice(1)){climb(id,s.map.platforms[1]);climb(id,s.map.platforms[2]);walk(id,s.map.switches[Number(id)-1].x+5);}walk('0',1005);tick({},60);assert(s.gateOpen);walk('1',910);jumpKey('1');for(const id of ids)walk(id,1120);tick({},60);}
 assert.equal(s.status,'clear');assert(s.players.every(p=>p.exit));assert(Object.values(activity).every(n=>n>0));results.push({count,level:level+1,pass:true,ticks:s.ticks,activity});
 }catch(e){results.push({count,level:level+1,pass:false,error:e.message,positions:s.players.map(p=>({id:p.id,x:p.x,y:p.y})),activity});}
}
for(const r of results)console.log(JSON.stringify(r));
const failures=results.filter(r=>!r.pass);console.log(`${results.length-failures.length}/140 input-only population routes cleared. Route clearance does not establish fun or balanced contribution.`);if(failures.length)process.exitCode=1;


