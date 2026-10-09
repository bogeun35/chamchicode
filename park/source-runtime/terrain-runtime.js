/* Original PP2 static terrain importer. Inputs are supplied by the caller; no file/network access. */
(function (root, factory) {
  const api = factory(typeof module === 'object' && module.exports
    ? require('./population-rules.cjs') : root.SourcePopulationRules);
  if (typeof module === 'object' && module.exports) module.exports = api;
  root.SourceTerrainRuntime = api;
})(typeof globalThis !== 'undefined' ? globalThis : this, function (population) {
  'use strict';
  const TILE = 48;
  // MapRect .cctor 0x18187f850, metadata field reference at 0x18187f8bf:
  // exact 2 x 16 byte initializer; GetMapChipType indexes [mode][shape].
  const MAP_RECT_CHIPS = Object.freeze([
    Object.freeze([2,3,4,5,6,7,8,9,10,11,20,21,22,23,24,25]),
    Object.freeze([52,53,54,55,56,57,58,59,60,61,62,63,64,65,66,67])
  ]);
  function fail(message) { throw new Error('Source terrain: ' + message); }
  function integer(value, label) {
    if (!Number.isSafeInteger(value)) fail(label + ' must be an integer');
    return value;
  }
  function parameter(actor, index) {
    const p = actor.datas && actor.datas[index];
    if (!p || p.t !== 1 || !Number.isFinite(p.f)) fail('unsupported MapRect parameter ' + index);
    // Native FP -> signed integer arithmetic shift (floor also handles negatives).
    return integer(Math.floor(p.f), 'MapRect parameter ' + index);
  }
  function applyMapRect(grid, actor) {
    const x = parameter(actor, 0), y = parameter(actor, 1);
    const width = parameter(actor, 2), height = parameter(actor, 3), mode = parameter(actor, 4);
    const chips = MAP_RECT_CHIPS[mode];
    if (!chips) fail('unsupported MapRect mode ' + mode);
    if (width < 0 || height < 0 || width * height > 4096) fail('unsupported MapRect size');
    const mapHeight = grid.length, mapWidth = grid[0].length;
    const inside = (cx, cy) => cx >= 0 && cy >= 0 && cx < mapWidth && cy < mapHeight;
    // Native GetMapChipType returns the raw byte (not the collision attribute),
    // and returns 0 outside the map. SetMapChip ignores outside coordinates.
    const get = (cx, cy) => inside(cx, cy) ? grid[cy][cx] : 0;
    const set = (cx, cy, id) => { if (inside(cx, cy)) grid[cy][cx] = id; };
    function modify(cx, cy, recurse) {
      const up = !!get(cx,cy+1), down = !!get(cx,cy-1);
      const right = !!get(cx+1,cy), left = !!get(cx-1,cy);
      let shape;
      // Direct translation of modify 0x18187f390..0x18187f78c.
      if (!up && !down && !right && !left) shape = 0;
      else if (up && down) {
        if (right) shape = left ? 9 : 7;
        else if (left) shape = 8;
        else {
          if (recurse) { modify(cx,cy-1,false); modify(cx,cy+1,false); }
          shape = 11;
        }
      } else if (left && right) {
        if (down) shape = 4;
        else if (up) shape = 1;
        else {
          if (recurse) { modify(cx-1,cy,false); modify(cx+1,cy,false); }
          shape = 14;
        }
      } else if (up) shape = right ? 2 : left ? 3 : 10;
      else if (down) shape = right ? 5 : left ? 6 : 12;
      else if (left) shape = 15;
      else if (right) shape = 14;
      else return;
      set(cx,cy,chips[shape]);
    }
    // Native fills the whole rectangle first, then shapes it in x-major order.
    for (let i=0;i<width;i++) for (let j=0;j<height;j++) set(x+i,y-j,chips[9]);
    for (let i=0;i<width;i++) for (let j=0;j<height;j++) modify(x+i,y-j,true);
    return { x,y,width,height,mode };
  }
  function applyTopViewMapRect(grid, actor) {
    const x=parameter(actor,0), y=parameter(actor,1), width=parameter(actor,2), height=parameter(actor,3), mode=parameter(actor,4);
    if(width<0 || height<0 || width*height>4096) fail('unsupported TopViewMapRect size');
    // OnStart 0x18172e920 -> modifyMap 0x18172e930. Same map and bounds;
    // mode byte zero selects 0x45 (69), any nonzero byte selects 1.
    const tileId=(mode&255)===0?69:1;
    for(let i=0;i<width;i++)for(let j=0;j<height;j++){
      const cx=x+i,cy=y-j;
      if(cx>=0&&cy>=0&&cx<grid[0].length&&cy<grid.length)grid[cy][cx]=tileId;
    }
    return {x,y,width,height,mode,tileId,type:'TopViewMapRect'};
  }
  function createTerrain(options) {
    if (!population) fail('population-rules.cjs must be loaded first');
    const {stageId,count,online=false,source,geometry} = options || {};
    integer(count, 'player count');
    if (count < 2 || count > 8) fail('player count must be 2..8');
    if (typeof online !== 'boolean') fail('online must be boolean');
    const stage = source && source.stages && source.stages.find(s => s.stageId === stageId);
    const geoStage = geometry && geometry.stages && geometry.stages.find(s => s.stageId === stageId);
    if (!stage || !geoStage) fail('missing original stage ' + stageId);
    const list = stage.json && stage.json.stageInitParamList;
    if (!Array.isArray(list)) fail('missing stage variants');
    const selected = population.selectVariant(list,count,online);
    if (!selected) fail('missing eligible stage variant');
    // Array identity preserves variants even if createIndex values repeat.
    const variantIndex = list.indexOf(selected), variant = geoStage.variants[variantIndex];
    if (!variant || variant.createIndex !== selected.createIndex ||
        variant.needPlayerCount !== selected.needPlayerCount ||
        variant.isOnlineOnly !== selected.isOnlineOnly) fail('geometry variant mismatch');
    const widthInTiles = integer(variant.width,'map width'), heightInTiles = integer(variant.height,'map height');
    if (widthInTiles <= 0 || heightInTiles <= 0 || widthInTiles*heightInTiles > 4096) fail('unsupported map dimensions');
    if (variant.worldTileSize !== TILE || variant.chipSize !== TILE || variant.tileOriginX !== 0 || variant.tileOriginY !== 0) fail('unsupported source coordinate semantics');
    if (!Array.isArray(variant.grid) || variant.grid.length !== heightInTiles || variant.grid.some(r=>!Array.isArray(r)||r.length!==widthInTiles)) fail('invalid tile grid');
    const attrs = new Map((geometry.tileAttributes || []).map(a => [a.id,a]));
    const grid = variant.grid.map(r => r.slice());
    const actors = population.actorsForCount(selected,count);
    const overlays = [];
    for (const actor of actors) {
      if (actor.typeName === 'MapRect' || actor.typeName === 'TopViewMapRect') {
        if (actor.createThreshold !== 0) fail('deferred MapRect requires native timing');
        overlays.push(actor.typeName === 'MapRect' ? applyMapRect(grid,actor) : applyTopViewMapRect(grid,actor));
      }
    }
    const width = widthInTiles*TILE, height = heightInTiles*TILE;
    const cells = [], platforms = [];
    // Y-down collision rectangles are disjoint horizontal runs with equal flags.
    // Keeping flags separate retains ice/break/fall semantics for the consumer.
    for (let gy=0;gy<heightInTiles;gy++) {
      let run;
      for (let gx=0;gx<widthInTiles;gx++) {
        const tileId = integer(grid[gy][gx],'tile id'), attr = attrs.get(tileId);
        if (!attr || !Number.isInteger(attr.flags) || attr.solid !== !!(attr.flags&1)) fail('unknown tile attributes ' + tileId);
        if (!attr.solid) { if(run) platforms.push(run); run=undefined; continue; }
        const cell = {gridX:gx,gridY:gy,tileId,flags:attr.flags,x:gx*TILE,y:height-(gy+1)*TILE,w:TILE,h:TILE};
        cells.push(cell);
        if (run && run.flags===attr.flags) run.w += TILE;
        else { if(run) platforms.push(run); run={x:cell.x,y:cell.y,w:TILE,h:TILE,flags:attr.flags}; }
      }
      if(run) platforms.push(run);
    }
    return {
      stageId,count,online,width,height,widthInTiles,heightInTiles,tileSize:TILE,
      variant:{index:variantIndex,createIndex:variant.createIndex,needPlayerCount:variant.needPlayerCount,isOnlineOnly:variant.isOnlineOnly},
      grid,cells,platforms,overlays,
      // x/y are converted source reference points, without invented actor anchors.
      actors:actors.map(a=>{
        if (!Number.isFinite(a.posX) || !Number.isFinite(a.posY)) fail('invalid actor coordinates');
        return {...a,sourceX:a.posX,sourceY:a.posY,x:a.posX,y:height-a.posY};
      }),
      semantics:{sourceY:'up',runtimeY:'down',actorAnchors:'unresolved',dynamicTileBehavior:'consumer-required'}
    };
  }
  return {createTerrain,applyMapRect,applyTopViewMapRect,MAP_RECT_CHIPS};
});
