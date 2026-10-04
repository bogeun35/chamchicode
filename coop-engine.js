(function(root){
'use strict';
const W=1200,H=675,PW=32,PH=38;
const LEVEL_COUNT=20;
const rect=(x,y,w,h)=>({x,y,w,h});
const overlap=(a,b)=>a.x<b.x+b.w&&a.x+a.w>b.x&&a.y<b.y+b.h&&a.y+a.h>b.y;
function level(n,count){
 const floor=rect(0,600,1200,75), base={name:['첫 만남','어깨를 빌려줘','함께 눌러','화물 배송','타이밍','계단 작전','모두의 길','다시 합류','위아래 합동작전','세 번의 용기','두 칸 배송','열쇠를 찾아서','인간 사다리','옥상 모임','엇갈린 신호','봉우리 회의','발판을 배달해','안전지대','하늘길 행진','참치 대작전'][n%LEVEL_COUNT],platforms:[floor],switches:[],crates:[],hazards:[],key:rect(990,540,22,22),exit:rect(1100,522,58,78),spawn:{x:70,y:550},gate:null};
 const pads=(number,x,y,width=20,spacing=56)=>Array.from({length:number},(_,i)=>({...rect(x+i*spacing,y,width,8),accept:'player'}));
 switch(n%LEVEL_COUNT){
 case 0:base.platforms.push(rect(420,520,130,18));base.key=rect(455,480,22,22);break;
 case 1:base.platforms.push(rect(510,440,220,22));base.key=rect(590,400,22,22);base.crates=[rect(370,550,50,50)];break;
 case 2:base.switches=Array.from({length:count},(_,i)=>rect(220+i*560/Math.max(1,count-1),592,48,8));base.gate=rect(860,390,25,210);break;
 case 3:base.switches=[{...rect(590,592,65,8),accept:'crate'}];base.crates=[rect(350,550,50,50)];base.gate=rect(850,380,25,220);base.platforms.push(rect(410,520,110,20));break;
 case 4:base.hazards=[rect(390,582,90,18),rect(690,582,90,18)];base.platforms.push(rect(535,520,85,18));break;
 case 5:base.platforms.push(rect(310,520,100,20),rect(470,440,100,20),rect(640,360,190,20));base.key=rect(710,315,22,22);break;
 case 6:base.switches=[rect(200,592,70,8),rect(780,492,70,8)];base.platforms.push(rect(700,500,220,20));base.crates=[rect(380,550,50,50)];base.gate=rect(980,370,25,230);base.key=rect(900,455,22,22);break;
 case 7:base.hazards=[rect(360,582,90,18),rect(710,582,90,18)];base.platforms.push(rect(500,520,80,20),rect(610,440,90,20));base.key=rect(625,393,22,22);base.switches=[rect(900,592,65,8)];base.crates=[rect(820,550,50,50)];base.gate=rect(1050,380,20,220);break;
 // One floor keeper and a rooftop team must signal together.
 case 8:base.platforms.push(rect(340,520,120,20),rect(500,440,510,20));base.switches=[{...rect(220,592,45,8),accept:'player'},...pads(count-1,560,432)];base.key=rect(940,396,22,22);base.gate=rect(1050,330,22,270);break;
 // Every player must cross three separated danger zones, then regroup.
 case 9:base.hazards=[rect(365,582,75,18),rect(585,582,75,18),rect(805,582,75,18)];base.switches=pads(count,210,592,42,100);base.switches=base.switches.map((p,i)=>({...rect([220,470,690,910,270,520,740,960][i],592,18,8),accept:'player'}));base.gate=rect(1040,380,22,220);break;
 // Cargo bays accept boxes only; players must get over the first delivery.
 case 10:base.crates=[rect(350,550,50,50),rect(720,550,50,50)];base.switches=[{...rect(530,592,65,8),accept:'crate'},{...rect(890,592,65,8),accept:'crate'}];base.gate=rect(1040,380,22,220);break;
 // The key route heads left while the remaining team sets up on the right.
 case 11:base.platforms.push(rect(440,520,120,20),rect(280,440,120,20),rect(120,360,120,20));base.key=rect(155,315,22,22);base.switches=pads(count,590,592);base.gate=rect(1040,330,22,270);break;
 // A teammate extends a movable box into a two-person ladder.
 case 12:base.crates=[rect(370,550,50,50)];base.platforms.push(rect(510,440,240,20),rect(810,510,170,20));base.key=rect(590,395,22,22);base.switches=pads(count,590,592);base.gate=rect(1050,350,22,250);break;
 // Everybody climbs; nobody can wait at the exit for the key runner.
 case 13:base.platforms.push(rect(320,520,120,20),rect(480,440,550,20));base.switches=pads(count,540,432);base.key=rect(970,394,22,22);base.gate=rect(1050,330,22,270);break;
 // Independent left and right decks need simultaneous teams.
 case 14:base.platforms.push(rect(340,520,240,20),rect(720,520,280,20));base.switches=[...pads(Math.ceil(count/2),365,512),...pads(Math.floor(count/2),745,512)];base.key=rect(930,472,22,22);base.gate=rect(1050,380,22,220);break;
 // Up to two players per summit: the signal travels across four elevations.
 case 15:base.platforms.push(rect(320,520,120,20),rect(480,440,120,20),rect(640,360,140,20),rect(820,440,160,20));base.switches=Array.from({length:count},(_,i)=>{const p=base.platforms[1+i%4];return {...rect(p.x+10+Math.floor(i/4)*50,p.y-8,18,8),accept:'player'}});base.key=rect(700,315,22,22);base.gate=rect(1050,310,22,290);break;
 // The box is first a stair, then a shipment; upper teammates keep their posts.
 case 16:base.crates=[rect(380,550,50,50)];base.platforms.push(rect(500,480,470,20));base.switches=[{...rect(985,592,55,8),accept:'crate'},...pads(count-1,540,472)];base.key=rect(920,434,22,22);base.gate=rect(1060,350,22,250);break;
 // Each half occupies a safe island on opposite sides of a hazard.
 case 17:base.hazards=[rect(620,582,90,18)];base.switches=[...pads(Math.ceil(count/2),355,592),...pads(Math.floor(count/2),760,592)];base.key=rect(980,540,22,22);base.gate=rect(1050,380,22,220);break;
 // The exit itself is elevated: every teammate has to finish the whole climb.
 case 18:base.platforms.push(rect(320,520,120,20),rect(480,440,120,20),rect(640,360,560,20));base.switches=pads(count,660,352);base.key=rect(1040,313,22,22);base.exit=rect(1120,282,58,78);base.gate=rect(1090,170,20,190);break;
 // Finale: split-height quorum plus a cargo holder, then everybody regroups.
 case 19:base.platforms.push(rect(320,520,120,20),rect(480,440,480,20));base.crates=[rect(980,550,50,50)];base.switches=[...pads(count-1,520,432),{...rect(1030,592,55,8),accept:'crate'}];base.key=rect(905,394,22,22);base.gate=rect(1090,320,20,280);break;
 }return base;
}
function create(ids,n=0){const map=level(n,ids.length);return {level:n,map,players:ids.map((id,i)=>({id,x:map.spawn.x+i*33,y:map.spawn.y,w:PW,h:PH,vx:0,vy:0,ground:false,coyote:0,jump:false,key:false,exit:false})),keyTaken:false,gateOpen:false,status:'play',ticks:0,deaths:0};}
function move(a,dx,dy,solids){a.x+=dx;for(const b of solids)if(overlap(a,b)){a.x=dx>0?b.x-a.w:b.x+b.w;a.vx=0;}a.y+=dy;a.ground=false;for(const b of solids)if(overlap(a,b)){if(dy>=0){a.y=b.y-a.h;a.ground=true;}else a.y=b.y+b.h;a.vy=0;}a.x=Math.max(0,Math.min(W-a.w,a.x));}
function step(s,inputs,dt=1/60){if(s.status!=='play')return;dt=Math.min(dt,1/30);s.ticks++;
 const m=s.map;
 s.switchActive=m.switches.map(sw=>(sw.accept!=='crate'&&s.players.some(p=>overlap({...p,y:p.y+3},sw)))||(sw.accept!=='player'&&m.crates.some(c=>overlap({...c,y:c.y+3},sw))));
 s.gateOpen=s.gateOpen||s.switchActive.every(Boolean);
 const solids=m.platforms.concat(s.gateOpen||!m.gate?[]:[m.gate]);
 for(const c of m.crates){c.vy=(c.vy||0)+1500*dt;move(c,0,c.vy*dt,solids);}
 for(const p of s.players){const input=inputs[p.id]||{},previousGround=p.ground;p.coyote=previousGround?.10:Math.max(0,p.coyote-dt);p.vx=((input.right?1:0)-(input.left?1:0))*230;
 const edge=input.jumpSeq!==undefined?input.jumpSeq>(p.jumpSeq||0):input.jump&&!p.jump;if(input.jumpSeq!==undefined)p.jumpSeq=input.jumpSeq;if(edge&&p.coyote>0){p.vy=-530;p.coyote=0;}p.jump=!!input.jump;p.vy=Math.min(950,p.vy+1500*dt);
 for(const c of m.crates){const test={...p,x:p.x+p.vx*dt};if(overlap(test,c)){const before=c.x;move(c,p.vx*dt,0,solids);if(c.x===before)p.vx=0;}}
 const others=s.players.filter(o=>o!==p&&!o.exit&&o.y>=p.y+PH-8&&p.vy>=0);move(p,p.vx*dt,0,solids.concat(m.crates));move(p,0,p.vy*dt,solids.concat(m.crates,others));
 if(!s.keyTaken&&overlap(p,m.key)){s.keyTaken=true;p.key=true;}
 p.exit=s.keyTaken&&s.gateOpen&&overlap(p,m.exit);
 if(p.y>H+50||m.hazards.some(h=>overlap(p,h))){s.status='dead';s.failure={playerId:p.id,reason:p.y>H+50?'fall':'hazard'};s.deaths++;return;}
 }if(s.players.every(p=>p.exit))s.status='clear';
}
const api={create,step,level,overlap,W,H,LEVEL_COUNT};if(typeof module!=='undefined')module.exports=api;root.CoopEngine=api;
})(typeof window!=='undefined'?window:globalThis);
