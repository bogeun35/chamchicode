(function(root){
'use strict';
const W=1200,H=675,PW=32,PH=38;
const rect=(x,y,w,h)=>({x,y,w,h});
const overlap=(a,b)=>a.x<b.x+b.w&&a.x+a.w>b.x&&a.y<b.y+b.h&&a.y+a.h>b.y;
function level(n,count){
 const floor=rect(0,600,1200,75), base={name:['첫 만남','어깨를 빌려줘','함께 눌러','화물 배송','타이밍','계단 작전','모두의 길','마지막 합류'][n%8],platforms:[floor],switches:[],crates:[],hazards:[],key:rect(990,540,22,22),exit:rect(1100,522,58,78),spawn:{x:70,y:550},gate:null};
 switch(n%8){
 case 0:base.platforms.push(rect(420,520,130,18));base.key=rect(455,480,22,22);break;
 case 1:base.platforms.push(rect(510,440,220,22));base.key=rect(590,400,22,22);base.crates=[rect(370,550,50,50)];break;
 case 2:base.switches=Array.from({length:count},(_,i)=>rect(220+i*560/Math.max(1,count-1),592,48,8));base.gate=rect(860,390,25,210);break;
 case 3:base.switches=[{...rect(590,592,65,8),accept:'crate'}];base.crates=[rect(350,550,50,50)];base.gate=rect(850,380,25,220);base.platforms.push(rect(410,520,110,20));break;
 case 4:base.hazards=[rect(390,582,90,18),rect(690,582,90,18)];base.platforms.push(rect(535,520,85,18));break;
 case 5:base.platforms.push(rect(310,520,100,20),rect(470,440,100,20),rect(640,360,190,20));base.key=rect(710,315,22,22);break;
 case 6:base.switches=[rect(200,592,70,8),rect(780,492,70,8)];base.platforms.push(rect(700,500,220,20));base.crates=[rect(380,550,50,50)];base.gate=rect(980,370,25,230);base.key=rect(900,455,22,22);break;
 case 7:base.hazards=[rect(360,582,90,18),rect(710,582,90,18)];base.platforms.push(rect(500,520,80,20),rect(610,440,90,20));base.key=rect(625,393,22,22);base.switches=[rect(900,592,65,8)];base.crates=[rect(820,550,50,50)];base.gate=rect(1050,380,20,220);break;
 }return base;
}
function create(ids,n=0){const map=level(n,ids.length);return {level:n,map,players:ids.map((id,i)=>({id,x:map.spawn.x+i*33,y:map.spawn.y,w:PW,h:PH,vx:0,vy:0,ground:false,coyote:0,jump:false,key:false,exit:false})),keyTaken:false,gateOpen:false,status:'play',ticks:0,deaths:0};}
function move(a,dx,dy,solids){a.x+=dx;for(const b of solids)if(overlap(a,b)){a.x=dx>0?b.x-a.w:b.x+b.w;a.vx=0;}a.y+=dy;a.ground=false;for(const b of solids)if(overlap(a,b)){if(dy>=0){a.y=b.y-a.h;a.ground=true;}else a.y=b.y+b.h;a.vy=0;}a.x=Math.max(0,Math.min(W-a.w,a.x));}
function step(s,inputs,dt=1/60){if(s.status!=='play')return;dt=Math.min(dt,1/30);s.ticks++;
 const m=s.map;
 s.switchActive=m.switches.map(sw=>(sw.accept!=='crate'&&s.players.some(p=>overlap({...p,y:p.y+3},sw)))||m.crates.some(c=>overlap({...c,y:c.y+3},sw)));
 s.gateOpen=s.gateOpen||s.switchActive.every(Boolean);
 const solids=m.platforms.concat(s.gateOpen||!m.gate?[]:[m.gate]);
 for(const c of m.crates){c.vy=(c.vy||0)+1500*dt;move(c,0,c.vy*dt,solids);}
 for(const p of s.players){const input=inputs[p.id]||{},previousGround=p.ground;p.coyote=previousGround?.10:Math.max(0,p.coyote-dt);p.vx=((input.right?1:0)-(input.left?1:0))*230;
 const edge=input.jumpSeq!==undefined?input.jumpSeq>(p.jumpSeq||0):input.jump&&!p.jump;if(input.jumpSeq!==undefined)p.jumpSeq=input.jumpSeq;if(edge&&p.coyote>0){p.vy=-530;p.coyote=0;}p.jump=!!input.jump;p.vy=Math.min(950,p.vy+1500*dt);
 for(const c of m.crates){const test={...p,x:p.x+p.vx*dt};if(overlap(test,c)){const before=c.x;move(c,p.vx*dt,0,solids);if(c.x===before)p.vx=0;}}
 const others=s.players.filter(o=>o!==p&&o.y>=p.y+PH-8&&p.vy>=0);move(p,p.vx*dt,0,solids.concat(m.crates));move(p,0,p.vy*dt,solids.concat(m.crates,others));
 if(!s.keyTaken&&overlap(p,m.key)){s.keyTaken=true;p.key=true;}
 p.exit=s.keyTaken&&s.gateOpen&&overlap(p,m.exit);
 if(p.y>H+50||m.hazards.some(h=>overlap(p,h))){s.status='dead';s.failure={playerId:p.id,reason:p.y>H+50?'fall':'hazard'};s.deaths++;return;}
 }if(s.players.every(p=>p.exit))s.status='clear';
}
const api={create,step,level,overlap,W,H};if(typeof module!=='undefined')module.exports=api;root.CoopEngine=api;
})(typeof window!=='undefined'?window:globalThis);
