const {test,expect}=require('@playwright/test'),fs=require('node:fs');
test('V7 wheels and steering retain distance animation, static geometry and automatic three-level LOD',async({page},info)=>{
 test.setTimeout(240000);const errors=[],consoleErrors=[];page.on('pageerror',e=>errors.push(e.message));page.on('console',m=>{if(m.type()==='error')consoleErrors.push(m.text());});
 await page.goto('/#y=2024&e=Mexico%20City%20Grand%20Prix&k=Q&a=HAM&b=RUS&g=1');
 await page.waitForFunction(()=>typeof ghost3d!=='undefined'&&ghost3d.ready&&VisualAssets.state==='ready'&&ghost3d.cars.every(c=>c.userData.asset),null,{timeout:120000});
 await page.locator('#ghostRenderQuality').selectOption('ultra');await page.waitForFunction(()=>!!VisualAssets.templates.high&&!VisualAssets.highPending,null,{timeout:60000});await page.locator('#ghostAdaptive').uncheck();
 const animation=await page.evaluate(()=>{
  stopPlay();ghost.camera='a';ghost.cameraState=null;GhostDirector.transition=null;st.play.e=5;drawAll();const G=ghost3d;
  const geometries=new Map(),meshRotations=new Map();for(const car of G.cars)car.traverse(o=>{if(o.geometry)geometries.set(o.geometry,o.geometry.attributes.position.version);if(o.isMesh)meshRotations.set(o,o.quaternion.clone());});
  const fingerprint=()=>JSON.stringify([st.A,st.B].map(L=>[L.total,...['t','v','thr','brk','gear','rpm'].map(k=>Array.from(L[k])),Array.from(L.source.t),Array.from(L.source.rel)])),before=fingerprint();
  const samples=[];
  for(const t of [5,5.013,50]){
   st.play.e=t;drawAll();samples.push(G.cars.map((car,i)=>({time:t,expected:-ReplayCore.distanceAt((i?st.B:st.A).source,t,(i?st.B:st.A).total)/.36,wheels:car.userData.wheels.map(w=>({angle:w.rotation.x,mesh:!!w.isMesh,parent:w.parent.name,unitQuaternion:Math.abs(w.quaternion.length()-1)})),steers:car.userData.steers.map(s=>s.rotation.y)})));
  }
  return {samples,staticGeometry:[...geometries].every(([g,v])=>g.attributes.position.version===v),meshLocalRotationUnchanged:[...meshRotations].every(([m,q])=>m.quaternion.equals(q)),telemetryUnchanged:before===fingerprint(),materials:G.cars.map(c=>Object.values(c.userData.levels).map(l=>{const m={};l.traverse(o=>{if(o.material)m[o.material.name]={roughness:o.material.roughness,metalness:o.material.metalness,clearcoat:o.material.clearcoat||0,carbonMap:o.material.map===VisualAssets.textures.carbon};});return m;}))};
 });
 expect(animation.staticGeometry).toBe(true);expect(animation.meshLocalRotationUnchanged).toBe(true);expect(animation.telemetryUnchanged).toBe(true);
 for(const sample of animation.samples)for(const car of sample){expect(car.wheels).toHaveLength(12);expect(car.steers).toHaveLength(6);for(const wheel of car.wheels){expect(wheel.mesh).toBe(false);expect(Math.abs(wheel.angle-car.expected)).toBeLessThan(1e-9);expect(wheel.unitQuaternion).toBeLessThan(1e-10);}for(const angle of car.steers)expect(Math.abs(angle)).toBeLessThanOrEqual(.300001);}
 expect(animation.samples[0][0].wheels[0].angle).not.toBe(animation.samples[1][0].wheels[0].angle);expect(animation.samples.flatMap(s=>s.flatMap(c=>c.steers)).some(a=>Math.abs(a)>.01)).toBe(true);
 for(const car of animation.materials)for(const m of car){expect(m.Paint.roughness).toBeCloseTo(.28);expect(m.Paint.clearcoat).toBeGreaterThan(0);expect(m.Carbon.carbonMap).toBe(true);expect(m.Tyre.metalness).toBe(0);expect(m.Tyre.roughness).toBeGreaterThan(.8);}
 const lod=[];
 for(const distance of [12,50,110])lod.push(await page.evaluate(distance=>{
  const S=ghostBuild(),p=ghostReplayPoses(S,st.play.e)[0],support=ghostSurfacePose(S,p,0,st.play.e);ghost.camera='free';ghost.cameraState=null;GhostDirector.transition=null;ghostOrbit.target=[p.x,support.y+.5,p.z];ghostOrbit.distance=distance;ghostOrbit.pitch=.35;ghostOrbit.yaw=Math.atan2(p.fx,p.fz)+.75;drawAll();const car=ghost3d.cars[0];return {requested:distance,actual:car.position.distanceTo(ghost3d.camera.position),visible:Object.entries(car.userData.levels).filter(([,o])=>o.visible).map(([k])=>k)};
 },distance));
 expect(lod.map(r=>r.visible)).toEqual([['high'],['medium'],['low']]);expect(errors).toEqual([]);expect(consoleErrors).toEqual([]);
 fs.writeFileSync(info.outputPath('v7-vehicle.json'),JSON.stringify({animation,lod,errors,consoleErrors},null,2));
});
