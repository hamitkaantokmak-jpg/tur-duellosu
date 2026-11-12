const {test,expect}=require('@playwright/test'),fs=require('node:fs');
test('V8 120-second replay retains motion/road caches, heap and pause/rate continuity',async({page},info)=>{
 test.setTimeout(240000);const errors=[];page.on('pageerror',e=>errors.push(e.message));
 await page.goto('/#y=2024&e=United%20States%20Grand%20Prix&k=Q&a=HAM&b=RUS&g=1');
 await page.waitForFunction(()=>typeof ghost3d!=='undefined'&&ghost3d.ready&&VisualAssets.state==='ready'&&ghost3d.cars.every(c=>c.userData.asset),null,{timeout:120000});
 await page.locator('#ghostRenderQuality').selectOption('performance');await page.locator('#ghostAdaptive').uncheck();
 await page.evaluate(()=>{stopPlay();ghost.camera='overview';drawAll();ghost.camera='a';st.play.e=0;drawAll();const S=ghostBuild();window.motionResources={scene:S,tables:S.vehicleMotion.tables,road:ghost3d.vehicleRoad,fit:ghost3d.cars[0].userData.tyreFit};});
 const cdp=await page.context().newCDPSession(page);await cdp.send('Performance.enable');
 const heap=async()=>{await cdp.send('HeapProfiler.collectGarbage');const m=await cdp.send('Performance.getMetrics');return m.metrics.find(m=>m.name==='JSHeapUsedSize').value;};
 const heapBefore=await heap(),before=await page.evaluate(()=>({memory:{...ghost3d.renderer.info.memory},roadBytes:ghost3d.vehicleRoad.positionBytes}));
 await page.evaluate(()=>{setPlaybackRate(.25);startPlay();});
 const segments=[];
 for(const [rate,camera]of [[.5,'cockpit'],[.25,'a'],[.5,'cockpit'],[.25,'a']]){
  await page.waitForTimeout(30000);
  segments.push(await page.evaluate(({rate,camera})=>{setPlaybackRate(rate);ghost.camera=camera;ghost.cameraState=null;drawAll();return{time:st.play.e,on:st.play.on,rate:st.play.rate};},{rate,camera}));
 }
 const after=await page.evaluate(()=>{stopPlay();const time=st.play.e,m={...ghostVehicleMotion(ghostBuild(),0,time)},S=ghostBuild(),r=motionResources;drawAll();return{time,motion:m,memory:{...ghost3d.renderer.info.memory},sameScene:r.scene===S,sameTables:r.tables===S.vehicleMotion.tables,sameRoad:r.road===ghost3d.vehicleRoad,sameFit:r.fit===ghost3d.cars[0].userData.tyreFit,misses:ghost3d.vehicleRoad.misses};});
 await page.waitForTimeout(150);
 const paused=await page.evaluate(()=>({time:st.play.e,motion:{...ghostVehicleMotion(ghostBuild(),0,st.play.e)}}));
 const heapAfter=await heap();
 fs.writeFileSync(info.outputPath('v8-cache-soak.json'),JSON.stringify({before,after,paused,heapBefore,heapAfter,segments,errors},null,2));
 expect(after.time).toBeGreaterThan(44);expect(after.time).toBeLessThan(55);expect(segments.every(s=>s.on)).toBe(true);
 expect(after.sameScene&&after.sameTables&&after.sameRoad&&after.sameFit).toBe(true);expect(after.misses).toBe(0);
 expect(after.memory).toEqual(before.memory);expect(heapAfter-heapBefore).toBeLessThan(8*1024*1024);
 expect(paused).toEqual({time:after.time,motion:after.motion});expect(errors).toEqual([]);
});
