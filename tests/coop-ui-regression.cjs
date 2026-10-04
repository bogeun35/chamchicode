const fs=require('fs'),vm=require('vm'),assert=require('assert');
const els={},handlers={},draw=new Proxy({}, {get:()=>()=>{},set:()=>true});let frame;
const document={activeElement:{tagName:'BODY'},fullscreenElement:null,hidden:false,addEventListener(){},createElement:tag=>element(tag),getElementById:id=>els[id]??=(element(id.includes('Stage')?'select':'button'))};
function element(tag){return {tagName:tag.toUpperCase(),value:'0',style:{},children:[],hidden:false,disabled:false,textContent:'',appendChild(x){this.children.push(x)},setAttribute(){},addEventListener(){},blur(){document.activeElement={tagName:'BODY'}},focus(){document.activeElement=this},getContext(){return draw},querySelectorAll(){return []}}}
const sounds=[],sent=[];const created=[],saved=new Map([['chamchi-park-progress-v1','4']]);let network,connections=0;
class Network{constructor(cb){connections++;network=this;this.cb=cb;this.id='host';this.host=true;this.room={status:'lobby',host:'host',players:{host:{name:'A'},peer:{name:'B'}},selectedLevel:0};this.ref={update:async value=>{Object.assign(this.room,value);this.cb(this.room)}};this.inputs={};}async enter(){this.code='ABCDE';this.cb(this.room)}start(s){this.started=s}publish(){}input(v){sent.push(v)}async leave(){}}
const Engine={LEVEL_COUNT:20,level:n=>({name:'Stage '+(n+1)}),create(ids,n){const s={level:n,status:'play',players:ids.map(id=>({id,x:0,y:0,w:32,h:38})),map:{...this.level(n),platforms:[],hazards:[],switches:[],crates:[],key:{x:0,y:0},exit:{x:0,y:0,w:50,h:70}},ticks:0};created.push(s);return s},step(){},overlap(){return false}};
const box={CoopEngine:Engine,CoopNetwork:Network,window:{CoopAudio:{setMuted(){},unlock:async()=>{},startMusic(){},stopMusic(){},play:n=>sounds.push(n)}},document,localStorage:{getItem:k=>saved.get(k),setItem:(k,v)=>saved.set(k,v)},URLSearchParams,location:{search:'quiet=1'},performance:{now:()=>0},requestAnimationFrame:fn=>frame=fn,addEventListener:(k,f)=>handlers[k]=f,console};
vm.runInNewContext(fs.readFileSync(require('path').join(__dirname,'../coop-ui.js'),'utf8'),box);
(async()=>{
 assert.equal(els.localStage.children.length,4);assert.equal(els.localStage.children.flatMap(g=>g.children).length,20);assert.equal(els.localStage.value,5);
 els.localStage.value='12';await els.local.onclick();assert.equal(created.at(-1).level,12);
 created.at(-1).status='clear';frame(17);assert.equal(saved.get('chamchi-park-progress-v1'),'12');assert.equal(els.continue.textContent,'다음 구역');
 await els.exit.onclick();assert.equal(els.localStage.value,13);
 els.localStage.value='19';await els.local.onclick();created.at(-1).status='clear';frame(34);assert.equal(els.continue.textContent,'끝내기');els.continue.onclick();await Promise.resolve();assert.equal(els.title.hidden,false);
 await els.create.onclick();assert.equal(els.roomStage.disabled,false);els.roomStage.value='15';els.roomStage.onchange();await Promise.resolve();assert.equal(network.room.selectedLevel,15);els.start.onclick();assert.equal(network.started.level,15);
 await els.exit.onclick();await els.create.onclick();network.host=false;network.room.host='peer';network.cb(network.room);assert.equal(els.roomStage.disabled,true);els.roomStage.value='8';els.roomStage.onchange();assert.equal(network.room.selectedLevel,0);
 let prevented=false;document.activeElement=els.roomStage;handlers.keydown({code:'ArrowUp',preventDefault(){prevented=true}});assert.equal(prevented,false);
 
 document.activeElement=document.getElementById('code');document.activeElement.tagName='INPUT';const stage=Engine.create(['host','peer'],3);network.room={...network.room,status:'game',state:stage};network.cb(network.room);
 handlers.keydown({code:'ArrowRight',preventDefault(){}});frame(51);assert.equal(sent.at(-1).right,true,'joined player must move even when room code had focus at game start');handlers.keyup({code:'ArrowRight'});
 const withKey=JSON.parse(JSON.stringify(stage));withKey.keyTaken=true;withKey.ticks=10;network.room.state=withKey;network.cb(network.room);frame(68);assert(sounds.includes('key'),'peer must receive key pickup feedback');const keySounds=sounds.filter(x=>x==='key').length;network.cb(network.room);assert.equal(sounds.filter(x=>x==='key').length,keySounds,'unchanged room updates do not repeat pickup feedback');
 const dead=JSON.parse(JSON.stringify(withKey));dead.status='dead';dead.failure={playerId:'peer',reason:'fall'};network.room.state=dead;network.cb(network.room);assert.equal(els.continue.disabled,true);assert.equal(els.result.textContent,'다시 함께!');assert(els.reason.textContent.includes('떨어졌어요'));
 const retry=Engine.create(['host','peer'],3);network.room.state=retry;network.cb(network.room);assert.equal(els.overlay.style.display,'none');
 handlers.keydown({code:'Escape',preventDefault(){}});handlers.keydown({code:'ArrowRight',preventDefault(){}});frame(400);assert.equal(sent.at(-1).right,false,'online menu must neutralize movement');
 
 const end=Engine.create(['host','peer'],19);end.status='clear';network.room.state=end;network.cb(network.room);assert.equal(saved.get('chamchi-park-progress-v1'),'19','peer campaign clear persists');assert.equal(els.continue.disabled,false,'open menu may still be dismissed');
 handlers.keydown({code:'Escape',preventDefault(){}});assert.equal(els.continue.disabled,true,'peer cannot advance host campaign');await els.exit.onclick();assert.equal(els.title.hidden,false);
 
 const connectionCount=connections,pending=els.create.onclick();assert.equal(els.create.disabled,true);assert.equal(els.message.textContent,'연결 중…');await els.create.onclick();assert.equal(connections,connectionCount+1,'double activation starts a single connection');await pending;assert.equal(els.create.disabled,false);assert.equal(els.message.textContent,'');
 console.log('PASS 20-stage UI and online regressions: chapters/options, saved continuation, local selection, final-stage exit, host selection, participant lock, native keyboard input');
})().catch(e=>{console.error(e);process.exitCode=1});

