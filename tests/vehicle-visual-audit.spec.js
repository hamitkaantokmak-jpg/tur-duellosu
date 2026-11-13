const {test,expect}=require('@playwright/test'),fs=require('node:fs'),{inspectNearPlane}=require('./helpers/camera-near-plane.cjs');
test('halo-free GLBs retain cockpit framing, unclipped near view, all LODs and V8 motion on three tracks',async({page},info)=>{
 test.setTimeout(360000);const errors=[];page.on('pageerror',e=>errors.push(e.message));const records=[];
 for(const event of ['Mexico City Grand Prix','United States Grand Prix','Belgian Grand Prix']){
  await page.goto('about:blank');await page.goto('/#y=2024&e='+encodeURIComponent(event)+'&k=Q&a=HAM&b=RUS&g=1');await page.waitForFunction(()=>typeof ghost3d!=='undefined'&&ghost3d.ready&&VisualAssets.state==='ready'&&ghost3d.cars.every(c=>c.userData.asset),null,{timeout:120000});await page.locator('#ghostRenderQuality').selectOption('ultra');await page.waitForFunction(()=>VisualAssets.templates.high&&!VisualAssets.highPending,null,{timeout:60000});await page.locator('#ghostAdaptive').uncheck();await page.addScriptTag({content:'window.inspectNearPlane='+inspectNearPlane.toString()+';'});
  const rows=await page.evaluate(()=>{
   stopPlay();const S=ghostBuild(),G=ghost3d,T=G.T,fingerprint=()=>JSON.stringify([st.A,st.B].map(L=>({total:L.total,source:L.source,channels:['t','v','thr','brk','gear','rpm'].map(k=>Array.from(L[k]))}))),before=fingerprint(),rows=[];
   for(const time of [10,50]){
    st.play.e=time;ghost.camera='cockpit';ghost.cameraState=null;GhostDirector.transition=null;drawAll();const poses=ghostReplayPoses(S,time),planned=ghostCameraPose(S,poses,G.camera.aspect),native=ghostPlanCameraPose(S,poses,G.camera.aspect),car=G.cars[0];
    const cut=inspectNearPlane(T,car,G.camera);rows.push({event:st.H.event,time,near:G.camera.near,planHeight:native.camera[1],cameraError:Math.hypot(...G.camera.position.toArray().map((v,i)=>v-planned.camera[i])),cut,motionReady:!!S.vehicleMotion&&!!G.vehicleRoad&&!!car.userData.tyreFit});
    for(const level of ['high','medium','low']){for(const [name,obj]of Object.entries(car.userData.levels))obj.visible=name===level;const r=inspectNearPlane(T,car,G.camera);rows.push({event:st.H.event,time,level,cut:r});}
    ghost.camera='a';ghost.cameraState=null;drawAll();rows.push({mode:'follow',near:G.camera.near,headsVisible:G.cars.every(c=>Object.values(c.userData.levels).every(l=>{let okay=true;l.traverse(o=>{if(o.isMesh&&['Helmet','Visor'].includes(o.material?.name)&&!o.visible)okay=false;});return okay;}))});
   }
   if(before!==fingerprint())throw Error('Telemetry mutated');return rows;
  });
  for(const row of rows){if(row.cut)expect(row.cut.cuts,JSON.stringify(row)).toBe(0);if(row.cameraError!==undefined){expect(row.cameraError).toBeLessThan(1e-9);expect(row.planHeight).toBe(.98);expect(row.near).toBe(.5);expect(row.motionReady).toBe(true);}if(row.mode){expect(row.near).toBe(.5);expect(row.headsVisible).toBe(true);}}
  records.push(...rows);
 }
 expect(errors).toEqual([]);fs.writeFileSync(info.outputPath('vehicle-visual-audit.json'),JSON.stringify({records,errors},null,2));
});
test('halo-free procedural fallback keeps cockpit, visible driver and replay working',async({page},info)=>{
 test.setTimeout(180000);const errors=[];page.on('pageerror',e=>errors.push(e.message));await page.route('**/*.glb',r=>r.abort());await page.goto('/#y=2024&e=Mexico%20City%20Grand%20Prix&k=Q&a=HAM&b=RUS&g=1');await page.waitForFunction(()=>typeof ghost3d!=='undefined'&&ghost3d.ready&&VisualAssets.state==='fallback',null,{timeout:120000});await page.addScriptTag({content:'window.inspectNearPlane='+inspectNearPlane.toString()+';'});
 const result=await page.evaluate(()=>{stopPlay();st.play.e=20;ghost.camera='cockpit';ghost.cameraState=null;GhostDirector.transition=null;drawAll();const G=ghost3d,T=G.T,car=G.cars[0],inverse=new T.Matrix4().copy(car.matrixWorld).invert(),v=new T.Vector3();let haloVertices=0;car.updateWorldMatrix(true,true);car.traverse(o=>{if(!o.isMesh||o.material?.color?.getHexString()!=='182027')return;const a=o.geometry.attributes.position;for(let i=0;i<a.count;i++){v.fromBufferAttribute(a,i).applyMatrix4(o.matrixWorld).applyMatrix4(inverse);if(Math.abs(v.x)>.25&&v.y>.96&&v.z>-.5&&v.z<.5)haloVertices++;}});return{haloVertices,cut:inspectNearPlane(T,car,G.camera),time:st.play.e,near:G.camera.near,cars:G.cars.length,asset:!!car.userData.asset,motion:!!car.userData.motionBodies};});
 fs.writeFileSync(info.outputPath('vehicle-visual-fallback.json'),JSON.stringify({result,errors},null,2));expect(result.haloVertices).toBe(0);expect(result.cut.cuts,JSON.stringify(result)).toBe(0);expect(result.cars).toBe(2);expect(result.asset).toBe(false);expect(result.motion).toBe(true);expect(result.time).toBe(20);expect(result.near).toBe(.5);expect(errors).toEqual([]);
});
