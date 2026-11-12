const {test,expect}=require('@playwright/test'),fs=require('node:fs');
for(const [id,event] of [['cota','United States Grand Prix'],['spa','Belgian Grand Prix']])test(id+' render batches preserve native collision, static surfaces and disposal across quality changes',async({page},info)=>{
 test.setTimeout(240000);await page.setViewportSize({width:960,height:640});
 const errors=[],consoleErrors=[];page.on('pageerror',e=>errors.push(e.message));page.on('console',e=>{if(e.type()==='error')consoleErrors.push(e.text());});
 await page.goto('/#y=2024&e='+encodeURIComponent(event)+'&k=Q&a=HAM&b=RUS&g=1');
 await page.waitForFunction(()=>typeof ghost3d!=='undefined'&&ghost3d.ready&&VisualAssets.state==='ready'&&ghost3d.cars.every(c=>c.userData.asset),null,{timeout:120000});
 await page.locator('#ghostRenderQuality').selectOption('performance');
 const collision=await page.evaluate(()=>{
  stopPlay();const G=ghost3d,T=G.T,S=ghostBuild(),surface=G.surface,batches=G.world.children.filter(o=>o.name==='TopographyBarrierBatch');G.world.updateMatrixWorld(true);
  let maxError=0,hits=0,misses=0;
  for(let i=0;i<48;i++)for(const sign of [-1,1]){
   const s=surface.sampleAtDistance(surface.length*i/48),from=new T.Vector3(s.position.x,s.position.y+.65,s.position.z),off=sign*(S.profile.barrier+4),x=s.position.x+s.right.x*off,z=s.position.z+s.right.z*off,to=new T.Vector3(x,surface.heightAt(x,z,s.distance)+.65,z),ray=new T.Raycaster(from,to.sub(from).normalize(),.02,Math.abs(off)+1),expected=[];
   for(const m of batches)T.Mesh.prototype.raycast.call(m,ray,expected);expected.sort((a,b)=>a.distance-b.distance);
   const actual=CameraCollision.closest(T,ray,batches);if(!!actual!==!!expected[0])misses++;
   if(actual&&expected[0]){hits++;maxError=Math.max(maxError,Math.abs(actual.distance-expected[0].distance),actual.point.distanceTo(expected[0].point));}
  }
  window.v61Road=G.world.getObjectByName('TopographyRoad').geometry;window.v61Positions=v61Road.attributes.position.array.slice();window.v61RoadVersion=v61Road.attributes.position.version;
  window.v61Fingerprint=()=>JSON.stringify([st.A,st.B].map(L=>({total:L.total,...Object.fromEntries(['t','v','thr','brk','gear','rpm'].map(k=>[k,Array.from(L[k])])),sourceTime:Array.from(L.source.t),sourceDistance:Array.from(L.source.rel)})));
  window.v61Original=v61Fingerprint();return {batches:batches.length,sourceChunks:batches.reduce((n,m)=>n+m.userData.barrierCollisionRanges.length,0),hits,misses,maxError};
 });
 expect(collision.batches).toBeGreaterThan(0);expect(collision.batches).toBeLessThan(collision.sourceChunks);expect(collision.hits).toBeGreaterThan(50);expect(collision.misses).toBe(0);expect(collision.maxError).toBeLessThan(1e-6);
 await page.locator('#ghostRenderQuality').selectOption('ultra');await page.waitForFunction(()=>!!VisualAssets.templates.high&&!VisualAssets.highPending,null,{timeout:60000});
 for(const quality of ['performance','ultra'])for(const camera of ['a','cockpit']){
  await page.evaluate(({quality,camera})=>{$('ghostRenderQuality').value=quality;ghost.camera=camera;ghost.cameraState=null;GhostDirector.transition=null;st.play.e=10;drawAll();},{quality,camera});
 }
 const surfaceStable=await page.evaluate(()=>({sameGeometry:v61Road===ghost3d.world.getObjectByName('TopographyRoad').geometry,sameVersion:v61RoadVersion===v61Road.attributes.position.version,samePositions:v61Positions.every((v,i)=>v===v61Road.attributes.position.array[i]),telemetry:v61Original===v61Fingerprint()}));
 expect(surfaceStable).toEqual({sameGeometry:true,sameVersion:true,samePositions:true,telemetry:true});
 const disposal=await page.evaluate(()=>{
  const original=BarrierBatching.attach,controllers=[],rebuilds=[],renderer=ghost3d.renderer;BarrierBatching.attach=function(...args){const c=original.apply(this,args);controllers.push(c);return c;};
  try{
   $('ghostRenderQuality').value='performance';ghost.camera='overview';drawAll();ghost.camera='a';drawAll();
   for(let i=0;i<3;i++){const cache=CameraCollision.cache,first=controllers.length;ghost3dBuild(ghostBuild());drawAll();rebuilds.push({memory:{...ghost3d.renderer.info.memory},sameRenderer:renderer===ghost3d.renderer,cacheCleared:cache!==CameraCollision.cache,first,last:controllers.length});}
   const cut=rebuilds[1].last;return {rebuilds,disposedRanges:controllers.slice(0,cut).every(c=>c.chunks.length===0),liveRanges:controllers.slice(cut).reduce((n,c)=>n+c.chunks.length,0),sharedBuffers:controllers.slice(cut).every(c=>c.chunks.every(p=>p.mesh.geometry.attributes.position.array===c.chunks[0].mesh.geometry.attributes.position.array))};
  }finally{BarrierBatching.attach=original;}
 });
 expect(disposal.rebuilds.every(r=>r.sameRenderer&&r.cacheCleared)).toBe(true);expect(disposal.rebuilds[2].memory).toEqual(disposal.rebuilds[1].memory);expect(disposal.disposedRanges).toBe(true);expect(disposal.liveRanges).toBe(collision.sourceChunks);expect(disposal.sharedBuffers).toBe(true);
 expect(errors).toEqual([]);expect(consoleErrors).toEqual([]);
 const result={collision,surfaceStable,disposal,errors,consoleErrors};fs.writeFileSync(info.outputPath('v61-'+id+'.json'),JSON.stringify(result,null,2));console.log('V61_BATCHING',id,JSON.stringify(result));
});
