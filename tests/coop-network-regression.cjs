// In-memory Firebase adapter: run against the actual network class, without a server.
const fs=require('fs'),vm=require('vm'),assert=require('assert');
let data={},listeners=new Map(),disconnects=[];
const clone=v=>v===undefined?null:JSON.parse(JSON.stringify(v));
function get(path){let v=data;for(const k of path.split('/').filter(Boolean))v=v?.[k];return v??null}
function put(path,value){const keys=path.split('/').filter(Boolean);let v=data;for(const k of keys.slice(0,-1))v=v[k]??={};if(value===null)delete v[keys.at(-1)];else v[keys.at(-1)]=clone(value);notify()}
function snap(path){const value=clone(get(path));return {exists:()=>value!==null,val:()=>value}}
function notify(){for(const [path,handlers]of listeners)for(const cb of handlers)queueMicrotask(()=>cb(snap(path)))}
class Ref{constructor(path){this.path=path}child(k){return new Ref(this.path+'/'+k)}async once(){this.primed=true;return snap(this.path)}async set(v){put(this.path,v)}async remove(){put(this.path,null)}async update(values){for(const [k,v]of Object.entries(values))put(this.path+'/'+k,v)}async transaction(fn){if(!this.primed&&get(this.path)!==null&&fn(null)===undefined)return {committed:false,snapshot:snap(this.path)};this.primed=true;const v=fn(clone(get(this.path)));if(v===undefined)return {committed:false,snapshot:snap(this.path)};put(this.path,v);return {committed:true,snapshot:snap(this.path)}}on(event,fn){if(!listeners.has(this.path))listeners.set(this.path,new Set());listeners.get(this.path).add(fn);queueMicrotask(()=>fn(snap(this.path)))}off(event,fn){if(fn)listeners.get(this.path)?.delete(fn);else listeners.delete(this.path)}onDisconnect(){return {remove:async()=>{disconnects.push(this.path)},cancel:async()=>{disconnects=disconnects.filter(x=>x!==this.path)}}}}
const firebase={apps:[{}],database:()=>({ref:path=>new Ref(path)}),initializeApp(){}};
const sandbox={window:{firebase},firebase,Date,Math,console,setTimeout,clearTimeout};
vm.runInNewContext(fs.readFileSync(require('path').join(__dirname,'../coop-network.js'),'utf8'),sandbox);
const Network=sandbox.window.CoopNetwork,flush=()=>new Promise(r=>setImmediate(r));
const errors=[];function client(){return new Network(()=>{},e=>errors.push(e))}
(async()=>{
 const host=client(),peer=client();await host.enter('TEST',true);await peer.enter('TEST');await flush();
 assert.equal(Object.keys(get('games/coop_TEST/players')).length,2);
 await host.start({status:'play',players:[{id:host.id},{id:peer.id}]});await flush();
 assert.equal(get('games/coop_TEST/status'),'game');
 peer.input({left:false,right:true,jump:true});await flush();assert.equal(get('games/coop_TEST/inputs/'+peer.id).right,true);
 const jump=get('games/coop_TEST/inputs/'+peer.id).jumpSeq;
 peer.input({left:false,right:false,jump:false});await flush();
 assert.equal(get('games/coop_TEST/inputs/'+peer.id).jumpSeq,jump,'released input retains jump edge counter');
 peer.input({left:false,right:false,jump:true});await flush();
 assert.equal(get('games/coop_TEST/inputs/'+peer.id).jumpSeq,jump+1);
 assert(disconnects.includes('games/coop_TEST/players/'+peer.id));
 assert(disconnects.includes('games/coop_TEST/inputs/'+peer.id));
 console.log('PASS quick-jump edge retention and player/input disconnect registration');
 host.publish({status:'clear',players:[]});await flush();assert.equal(get('games/coop_TEST/state/status'),'clear');
 await peer.leave();await flush();assert(!get('games/coop_TEST/players/'+peer.id));assert(!get('games/coop_TEST/inputs/'+peer.id));
 assert(get('games/coop_TEST'),'room survives while host remains');await host.leave();await flush();assert.equal(get('games/coop_TEST'),null,'last departure deletes only empty room');console.log('PASS two-client room creation, join, start, input, publish, leave and empty-room cleanup');
 const players={};for(let i=0;i<7;i++)players['seed'+i]={name:'seed',joined:1};put('games/coop_FULL',{host:'seed0',status:'lobby',players});
 const joins=await Promise.allSettled([client().enter('FULL'),client().enter('FULL')]);await flush();
 assert.equal(Object.keys(get('games/coop_FULL/players')).length,8,'concurrent joins must preserve 8-player cap');
 assert.equal(joins.filter(x=>x.status==='fulfilled').length,1);
 console.log('PASS concurrent membership cap');
 const unavailable={window:{},Math,Date};vm.runInNewContext(fs.readFileSync(require('path').join(__dirname,'../coop-network.js'),'utf8'),unavailable);
 await assert.rejects(new unavailable.window.CoopNetwork(()=>{},()=>{}).enter('NO'),/온라인/);
 console.log('PASS missing Firebase SDK gives controlled error');
})().catch(e=>{console.error(e);process.exitCode=1});


