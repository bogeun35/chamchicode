(function(){
'use strict';

// Standalone development model. No original assets, map coordinates, or physics constants.
// All dimensions, time units and speed units must match the caller's simulation.
// grounded/supportId are caller-supplied contact facts, checked against rectangles.
// stepDevices carries grounded lift riders; the caller must not carry them a second time.
const CALIBRATION = Object.freeze({ status: 'calibration_pending', contactTolerance: 0.5, verticalVelocityTolerance: 0.1 });
const clone = x => JSON.parse(JSON.stringify(x));
const finite = (n, label) => { if (!Number.isFinite(n)) throw new Error(`Invalid ${label}`); };
const horizontal = (a,b) => a.x < b.x+b.w && a.x+a.w > b.x;
const overlaps = (a,b) => horizontal(a,b) && a.y < b.y+b.h && a.y+a.h > b.y;
const isPlayer = body => body.kind === undefined || body.kind === 'player';
function rect(r) { for(const k of ['x','y','w','h'])finite(r[k],`${r.id || 'rectangle'}.${k}`);if(r.w<=0||r.h<=0)throw new Error('Rectangle dimensions must be positive'); }
function standing(body, support, config) {
  return body.grounded === true && body.airborne !== true && Math.abs(body.vy || 0) <= config.verticalVelocityTolerance &&
    horizontal(body,support) && Math.abs(body.y+body.h-support.y) <= config.contactTolerance;
}
function validate(state, dt, config) {
  finite(dt,'dt');if(dt<0)throw new Error('dt must be nonnegative');
  for(const k of ['contactTolerance','verticalVelocityTolerance']){finite(config[k],k);if(config[k]<0)throw new Error(`${k} must be nonnegative`);}
  const ids=new Set();
  for(const list of ['bodies','buttons','devices','timers'])for(const item of state[list]){
    if(!item.id||ids.has(item.id))throw new Error(`Missing/duplicate ID: ${item.id}`);ids.add(item.id);
    if(list!=='timers')rect(item);
    if(item.vy!==undefined)finite(item.vy,`${item.id}.vy`);
  }
  for(const s of state.solids)rect(s);
  for(const b of state.buttons)if(typeof b.signal!=='string'||!b.signal)throw new Error('Button signal required');
  for(const t of state.timers){
    if(typeof t.signal!=='string'||!t.signal)throw new Error('Timer signal required');
    finite(t.duration,'timer duration');finite(t.remaining ?? 0,'timer remaining');
    if(t.duration<=0||(t.remaining ?? 0)<0||(t.remaining ?? 0)>t.duration)throw new Error('Timer outside duration');
  }
  for(const d of state.devices){
    if(!['gate','bridge','lift'].includes(d.kind))throw new Error(`Unknown device kind: ${d.kind}`);
    if(d.kind==='lift'){
      for(const k of ['fromY','toY','speed','requiredPlayers'])finite(d[k],`lift ${k}`);
      if(d.toY>d.fromY||d.y<d.toY||d.y>d.fromY||d.speed<0||!Number.isInteger(d.requiredPlayers)||d.requiredPlayers<1)throw new Error('Invalid lift calibration');
    }else{
      if(typeof d.signal!=='string'||!d.signal)throw new Error('Device signal required');
      if(!['while','latch'].includes(d.mode || 'while'))throw new Error('Unknown signal mode');
    }
  }
}

// Returns bodies whose verified support chain terminates at this lift.
// A cyclic, stale, airborne, or geometrically separated chain does not count.
function occupantsFor(lift, bodies, config=CALIBRATION) {
  const byId=new Map(bodies.map(b=>[b.id,b]));
  const supported=(body,visited)=>{
    if(!isPlayer(body))return false;
    if(visited.has(body.id))return false;
    const nextVisited=new Set(visited);nextVisited.add(body.id);
    const support=body.supportId===lift.id?lift:byId.get(body.supportId);
    if(!support||!standing(body,support,config))return false;
    return support.id===lift.id || supported(support,nextVisited);
  };
  return bodies.filter(b=>supported(b,new Set())).map(b=>b.id);
}

// Conservative swept vertical collision: stop before terrain or another body,
// including at a ceiling; never squeeze riders through obstacles.
function safeDisplacement(movers, obstacles, wanted) {
  let allowed=wanted;
  for(const a of movers)for(const b of obstacles){
    if(!horizontal(a,b))continue;
    if(overlaps(a,b))return 0;
    if(wanted<0 && b.y+b.h<=a.y)allowed=Math.max(allowed,b.y+b.h-a.y);
    if(wanted>0 && b.y>=a.y+a.h)allowed=Math.min(allowed,b.y-(a.y+a.h));
  }
  return allowed;
}

/**
 * state: { bodies, buttons, devices, timers, solids }. Missing lists mean [].
 * body: {id,x,y,w,h,grounded,airborne?,vy?,supportId?}.
 * button: {id,x,y,w,h,signal}; y is its contact surface.
 * gate/bridge: {id,kind,x,y,w,h,signal,mode:'while'|'latch',active?,latched?}.
 *   gate active=open; bridge active=solid. A blocked gate remains open.
 * lift: {id,kind:'lift',x,y,w,h,fromY,toY,speed,requiredPlayers}.
 * timer: {id,signal,duration,remaining}. Expiry is independent per timer.
 * commands: {triggerTimerIds?,resetTimerIds?,resetDeviceIds?} explicit events.
 *   Reset wins a simultaneous trigger. A reset latch may rearm on a later step.
 * dt is elapsed simulation time, never a wall-clock read.
 * Returns a new state including signals and device rider/blocking diagnostics.
 */
function stepDevices(input, dt, commands={}, calibration={}) {
  const config={...CALIBRATION,...calibration};
  const state={...clone(input),bodies:clone(input.bodies||[]),buttons:clone(input.buttons||[]),devices:clone(input.devices||[]),timers:clone(input.timers||[]),solids:clone(input.solids||[])};
  validate(state,dt,config);
  const trigger=new Set(commands.triggerTimerIds||[]),timerReset=new Set(commands.resetTimerIds||[]),deviceReset=new Set(commands.resetDeviceIds||[]);
  for(const id of [...trigger,...timerReset])if(!state.timers.some(t=>t.id===id))throw new Error(`Unknown timer command: ${id}`);
  for(const id of deviceReset)if(!state.devices.some(d=>d.id===id&&d.kind!=='lift'))throw new Error(`Unknown latch reset: ${id}`);
  const signals=Object.create(null);
  const signal=(id,active)=>{signals[id]=!!signals[id]||active;};
  for(const b of state.buttons){b.occupantIds=state.bodies.filter(p=>isPlayer(p)&&standing(p,b,config)).map(p=>p.id);b.pressed=b.occupantIds.length>0;signal(b.signal,b.pressed);}
  for(const t of state.timers){
    t.remaining=timerReset.has(t.id)?0:Math.max(0,(trigger.has(t.id)?t.duration:(t.remaining||0))-dt);
    t.active=t.remaining>0;signal(t.signal,t.active);
  }
  for(const d of state.devices.filter(d=>d.kind!=='lift')){
    const requested=!!signals[d.signal];
    d.latched=d.mode==='latch' && !deviceReset.has(d.id) && (!!d.latched||requested);
    d.requestedActive=d.mode==='latch'?d.latched:requested;
    const solidDevices=state.devices.filter(other=>other.id!==d.id&&(other.kind==='lift'||(other.kind==='bridge'&&other.active)||(other.kind==='gate'&&other.active===false)));
    const occupied=[...state.bodies,...solidDevices].some(b=>overlaps(d,b));
    d.blocked=(d.kind==='gate'&&!d.requestedActive&&occupied)||(d.kind==='bridge'&&d.requestedActive&&occupied);
    d.active=d.kind==='gate'?(d.requestedActive||d.blocked):(d.requestedActive&&!d.blocked);
  }
  // Every lift counts riders from one contact snapshot. Collision reservations
  // use current positions in stable ID order, so two lifts cannot sweep into
  // one another in the same step. The solver waits rather than pushes.
  const contactBodies=clone(state.bodies);
  for(const d of state.devices.filter(d=>d.kind==='lift').sort((a,b)=>a.id.localeCompare(b.id))){
    d.occupantIds=occupantsFor(d,contactBodies,config);d.occupancy=d.occupantIds.length;
    d.qualified=d.occupancy>=d.requiredPlayers;d.targetY=d.qualified?d.toY:d.fromY;
    const wanted=Math.sign(d.targetY-d.y)*Math.min(Math.abs(d.targetY-d.y),d.speed*dt);
    const riders=state.bodies.filter(b=>d.occupantIds.includes(b.id));
    const obstacles=[...state.solids,...state.bodies.filter(b=>!d.occupantIds.includes(b.id)),...state.devices.filter(other=>other.id!==d.id&&(other.kind==='lift'||(other.kind==='gate'&&!other.active)||(other.kind==='bridge'&&other.active)))];
    const delta=safeDisplacement([d,...riders],obstacles,wanted);
    d.blocked=delta!==wanted;d.deltaY=delta;d.y+=delta;d.active=true;
    d.direction=delta<0?'up':delta>0?'down':'stopped';
    for(const b of riders)b.y+=delta;
  }
  return {...state,signals:{...signals},calibration:{...config,status:'calibration_pending'}};
}
const api={stepDevices,occupantsFor,CALIBRATION};
if(typeof module!=='undefined'&&module.exports)module.exports=api;
if(typeof window!=='undefined')window.ParkDevices=api;
})();
