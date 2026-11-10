const {test,expect}=require('@playwright/test');
const fs=require('node:fs');

test('studio and simulator reuse one renderer across repeated camera, pilot and lap changes',async({page},info)=>{
 test.setTimeout(360000);
 await page.setViewportSize({width:1000,height:800});
 await page.addInitScript(()=>{window.glRequests=0;const original=HTMLCanvasElement.prototype.getContext;HTMLCanvasElement.prototype.getContext=function(type,...args){if(/^webgl/.test(type))window.glRequests++;return original.call(this,type,...args);};});
 const errors=[],consoleErrors=[];page.on('pageerror',e=>errors.push(e.message));page.on('console',e=>{if(e.type()==='error')consoleErrors.push(e.text());});
 await page.goto('/#y=2024&e=Mexico%20City%20Grand%20Prix&k=Q&a=HAM&b=RUS&lab=overview');
 await page.waitForFunction(()=>typeof InsightLab!=='undefined'&&InsightLab.pair&&InsightLab.report,null,{timeout:90000});
 expect(await page.evaluate(()=>({gl:window.glRequests,ready:ghost3d.ready}))).toEqual({gl:0,ready:false});
 const cycles=[];
 for(let i=0;i<3;i++){
  await page.locator('#ghostToggle').click();
  await page.waitForFunction(()=>ghost3d.ready&&ghost3d.source===st.A&&VisualAssets.state==='ready'&&ghost3d.v4Stats,null,{timeout:90000});
  await page.locator('#ghostRenderQuality').selectOption('performance');
  const initial=await page.evaluate(()=>{window.integrationRenderer??=ghost3d.renderer;window.integrationContextRequests??=window.glRequests;window.integrationCache=CameraCollision.cache;return {same:window.integrationRenderer===ghost3d.renderer,requests:window.glRequests};});
  expect(initial.same).toBe(true);
  await page.locator('#ghostScrub').fill('2500');
  await page.locator('#ghostRate').selectOption('1');
  const before=await page.evaluate(()=>st.play.e);await page.locator('#ghostPlay').click();await page.waitForTimeout(350);
  await page.locator('#studioToggle').click();
  const paused=await page.evaluate(()=>({time:st.play.e,on:st.play.on,active:InsightLab.active}));expect(paused.time).toBeGreaterThanOrEqual(before);expect(paused.on).toBe(false);expect(paused.active).toBe(true);
  for(const tab of ['overview','duel','drivers','race','lab','archive','notes','guide']){await page.locator('#studioTab-'+tab).click();await expect(page.locator('#studioTab-'+tab)).toHaveAttribute('aria-selected','true');}
  expect(await page.evaluate(()=>st.play.e)).toBe(paused.time);
  expect(await page.evaluate(()=>window.glRequests===window.integrationContextRequests)).toBe(true);
  await page.locator('#ghostToggle').click();await page.waitForFunction(()=>ghost3d.ready&&ghost3d.source===st.A);
  expect(await page.evaluate(()=>CameraCollision.cache===window.integrationCache)).toBe(true);
  for(const camera of ['a','compare','free','tv']){await page.locator('[data-camera="'+camera+'"]').click();await page.waitForTimeout(600);expect(await page.evaluate(()=>ghost.camera)).toBe(camera);expect(await page.evaluate(()=>st.play.e)).toBe(paused.time);}
  await page.locator('#studioToggle').click();await page.locator('#studioTab-archive').click();
  const choice=await page.evaluate(()=>{const el=Array.from(document.querySelectorAll('#studioBody [data-studio="pair"]')).find(el=>st.H.laps[Number(el.dataset.a)].d!==st.A.meta.d);if(!el)throw Error('No real alternative pilot pair available');return {a:Number(el.dataset.a),b:Number(el.dataset.b),driver:st.H.laps[Number(el.dataset.a)].d};});
  await page.locator('[data-studio="pair"][data-a="'+choice.a+'"][data-b="'+choice.b+'"]').first().click();
  await page.waitForFunction(id=>st.A.meta.i===id,choice.a);
  expect(await page.evaluate(()=>st.A.meta.d)).toBe(choice.driver);
  await page.locator('[data-studio="close"]').click();
  const lap=await page.evaluate(()=>{const l=st.H.byDrv[st.A.meta.d].find(l=>l.i!==st.A.meta.i&&!l.x);if(!l)throw Error('No real alternate lap available');return l.i;});
  await page.locator('#lapA').selectOption(String(lap));await page.waitForFunction(id=>st.A.meta.i===id,lap);
  expect(await page.evaluate(()=>st.play.e)).toBe(0);
  await page.locator('#studioToggle').click();await expect(page.locator('#insightStudio')).toBeVisible();
  await page.locator('#ghostToggle').click();await page.waitForFunction(()=>ghost3d.ready&&ghost3d.source===st.A&&ghost3d.v4Stats);
  const state=await page.evaluate(()=>({sameRenderer:ghost3d.renderer===window.integrationRenderer,requests:window.glRequests,initialRequests:window.integrationContextRequests,cacheReplaced:CameraCollision.cache!==window.integrationCache,memory:{...ghost3d.renderer.info.memory},time:st.play.e,drivers:[st.H.drivers[st.A.meta.d].c,st.H.drivers[st.B.meta.d].c],laps:[st.A.meta.n,st.B.meta.n],assets:VisualAssets.errors.slice()}));
  expect(state.sameRenderer).toBe(true);expect(state.requests).toBe(state.initialRequests);expect(state.cacheReplaced).toBe(true);expect(state.memory.geometries).toBeLessThan(500);expect(state.memory.textures).toBeLessThan(100);expect(state.time).toBe(0);expect(state.assets).toEqual([]);cycles.push(state);
  await page.locator('#studioToggle').click();
 }
 expect(Math.max(...cycles.map(c=>c.memory.geometries))-Math.min(...cycles.map(c=>c.memory.geometries))).toBeLessThan(10);
 expect(Math.max(...cycles.map(c=>c.memory.textures))-Math.min(...cycles.map(c=>c.memory.textures))).toBeLessThan(5);
 expect(errors).toEqual([]);expect(consoleErrors).toEqual([]);
 fs.writeFileSync(info.outputPath('studio-simulator.json'),JSON.stringify({cycles,errors,consoleErrors},null,2));
 console.log('STUDIO_SIMULATOR',JSON.stringify({cycles,errors,consoleErrors}));
});
