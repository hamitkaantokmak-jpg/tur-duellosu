const {test,expect}=require('@playwright/test');
const url='/#y=2024&e=Mexico%20City%20Grand%20Prix&k=Q&a=HAM&b=RUS&g=1';
// Isolate camera/asset, disposal/clock and pilot/mobile workflows; keep every assertion.
test('real Mexico telemetry, cameras, profiles and Blender assets',async({page},testInfo)=>{
  const errors=[];page.on('pageerror',e=>errors.push(e.message));
  await page.goto(url);
  await page.waitForFunction(()=>typeof ghost3d!=='undefined'&&ghost3d.ready&&ghost3d.source===st.A&&!!st.A&&VisualAssets.state==='ready'&&ghost3d.cars[0].userData.asset,null,{timeout:60000});
  expect(await page.evaluate(()=>({track:!!ghost.scene.track,stationA:st.A.source.stationInfo.valid,stationB:st.B.source.stationInfo.valid,texture:VisualAssets.textures.color.userData.format}))).toEqual({track:true,stationA:true,stationB:true,texture:'KTX2'});
  const venue=await page.evaluate(()=>({stats:ghost3d.v3Stats,closed:Math.hypot(MEXICO_RENDER_PATH.points[0][0]-MEXICO_RENDER_PATH.points.at(-1)[0],MEXICO_RENDER_PATH.points[0][1]-MEXICO_RENDER_PATH.points.at(-1)[1]),elevationDisabled:$('ghostElevation').disabled}));
  expect(venue.stats).toMatchObject({pitWays:2,trackSegments:2152});expect(venue.stats.buildings).toBeGreaterThan(100);expect(venue.stats.stands).toBeGreaterThan(20);expect(venue.closed).toBeLessThan(.01);expect(venue.elevationDisabled).toBe(true);
  // Both real lap positions must remain inside the proposed comparison camera's frustum throughout the lap.
  const framing=await page.evaluate(()=>{const old=ghost.camera;ghost.camera='compare';const S=ghostBuild(),T=ghost3d.T,cam=new T.PerspectiveCamera(48,16/9,.5,10000),samples=[];try{for(let t=0;t<=76;t+=4){const poses=ghostReplayPoses(S,t),view=ghostCameraPose(S,poses,16/9);cam.position.set(...view.camera);cam.lookAt(...view.target);cam.updateMatrixWorld();samples.push(poses.map(p=>{const v=new T.Vector3(p.x,.5,p.z).project(cam);return Math.max(Math.abs(v.x),Math.abs(v.y));}));}}finally{ghost.camera=old;}return samples.flat();});
  expect(Math.max(...framing)).toBeLessThan(.95);
  const blender=await page.evaluate(()=>({wheels:ghost3d.cars.map(c=>c.userData.wheels.length),steers:ghost3d.cars.map(c=>c.userData.steers.length),prefabs:ghost3d.v4Stats?.prefabs}));expect(blender.wheels).toEqual([12,12]);expect(blender.steers).toEqual([6,6]);expect(blender.prefabs).toMatchObject({KIT_PhotoTree:673,KIT_ControlTower:1,KIT_Bridge:1});expect(blender.prefabs.KIT_Barrier).toBeGreaterThan(2000);expect(blender.prefabs.KIT_StadiumAisle).toBeGreaterThan(5);
  const materials=await page.evaluate(()=>{let car=true;for(const c of ghost3d.cars)for(const level of Object.values(c.userData.levels)){let paint=false,carbon=false;level.traverse(o=>{if(o.material?.name==='Paint')paint=true;if(o.material?.name==='Carbon'&&o.material.map===VisualAssets.textures.carbon)carbon=true;});car&&=paint&&carbon;}return {car,concrete:ghost3d.v4Batches.some(o=>o.name==='KIT_Barrier'&&o.material.normalMap===VisualAssets.textures['concrete-normal']&&o.material.map===VisualAssets.textures['concrete-color'])};});expect(materials).toEqual({car:true,concrete:true});
  await expect(page.locator('#ghostDriver0')).toContainText('HAM');await expect(page.locator('#ghostDriver1')).toContainText('RUS');
  expect(await page.evaluate(()=>({event:st.H.event,samples:st.A.t.length,a:st.A.total,b:st.B.total}))).toMatchObject({event:'Mexico City Grand Prix'});
  await page.locator('#ghostScrub').fill('5000');
  expect(await page.evaluate(()=>ghostBuild().native.every(L=>Math.abs(ghostCurveAt(L.progress,0).v)<1e-9&&Math.abs(ghostCurveAt(L.progress,1000).v-1)<1e-9))).toBe(true);
  const sync=await page.evaluate(()=>{const S=ghostBuild(),p=ghostReplayPoses(S,st.play.e);return {e:st.play.e,delta:lerp(st.delta,positions().ka),p:p.map(x=>[x.x,x.z]),totals:[st.A.total,st.B.total],progress:S.native.map(L=>ghostCurveAt(L.progress,st.play.e).v)};});
  expect(sync.e).toBeCloseTo(Math.max(...sync.totals)/2,6);expect(sync.progress[0]).not.toEqual(sync.progress[1]);expect(sync.p[0]).not.toEqual(sync.p[1]);
  for(const camera of ['a','b','overview','free','tv','cinematic','compare']){await page.locator(`[data-camera="${camera}"]`).click();expect(await page.evaluate(()=>ghost.camera)).toBe(camera);await page.waitForTimeout(650);expect(await page.evaluate(()=>ghost3d.ready)).toBe(true);}
  await page.locator('[data-camera="free"]').click();await page.waitForTimeout(650);const before=await page.evaluate(()=>ghost3d.camera.position.toArray());await page.locator('#ghostWebGL').scrollIntoViewIfNeeded();const r=await page.locator('#ghostWebGL').boundingBox();await page.mouse.move(r.x+r.width*.6,r.y+r.height*.6);await page.mouse.down();await page.mouse.move(r.x+r.width*.7,r.y+r.height*.65);await page.mouse.up();expect(await page.evaluate(()=>ghost3d.camera.position.toArray())).not.toEqual(before);
  await page.locator('.ghost-stage').screenshot({path:testInfo.outputPath('mexico-preview.png')});
  const target=await page.evaluate(()=>ghostOrbit.target.slice());await page.locator('#ghostWebGL').focus();await page.keyboard.press('w');expect(await page.evaluate(()=>ghostOrbit.target)).not.toEqual(target);
  const elapsed=await page.evaluate(()=>st.play.e);
  for(const quality of ['performance','ultra','balanced']){await page.locator('#ghostRenderQuality').selectOption(quality);expect(await page.evaluate(()=>ghost3d.quality)).toBe(quality);expect(await page.evaluate(()=>st.play.e)).toBe(elapsed);}
  await page.waitForFunction(()=>!!VisualAssets.templates.high&&!VisualAssets.highPending);
  await page.evaluate(()=>drawAll());
  await page.locator('#ghostTransparent').uncheck();expect(await page.evaluate(()=>ghost3d.cars[1].children.filter(o=>o.isMesh).every(o=>!o.material.transparent))).toBe(true);
  await page.locator('#ghostStatsToggle').check();await expect(page.locator('#ghostStats')).toContainText('Draw calls');
  expect(errors).toEqual([]);
});
test('real Mexico clock, playback and repeated world disposal',async({page},testInfo)=>{
  const errors=[];page.on('pageerror',e=>errors.push(e.message));
  await page.goto(url);
  await page.waitForFunction(()=>typeof ghost3d!=='undefined'&&ghost3d.ready&&ghost3d.source===st.A&&!!st.A&&VisualAssets.state==='ready'&&ghost3d.cars[0].userData.asset,null,{timeout:60000});
  await page.locator('#ghostRenderQuality').selectOption('ultra');await page.waitForFunction(()=>!!VisualAssets.templates.high&&!VisualAssets.highPending);await page.locator('#ghostRenderQuality').selectOption('balanced');
  // Verify integrated clock across a one-second stall as well as short frames.
  const stall=await page.evaluate(()=>{stopPlay();st.play.e=10;st.play.rate=1;st.play.on=true;st.play.last=1000;tick(2000);stopPlay();return st.play.e;});expect(stall).toBe(11);
  const changed=await page.evaluate(()=>{stopPlay();st.play.on=true;st.play.e=0;st.play.last=0;st.play.rate=1;setPlaybackRate(4,500);st.play.e=ReplayCore.advance(st.play.e,st.play.last,1000,st.play.rate,st.A.total);stopPlay();return st.play.e;});expect(changed).toBe(2.5);
  // Rate uses the existing playback clock; sample deterministic tick intervals instead of wall-clock GPU speed.
  for(const rate of [.25,.5,1,2,4]){await page.locator('#ghostRate').selectOption(String(rate));const moved=await page.evaluate(()=>{stopPlay();st.play.e=10;st.play.on=true;st.play.last=1000;tick(1050);stopPlay();return st.play.e-10;});expect(moved).toBeCloseTo(.05*rate,6);}
  const resource=await page.evaluate(()=>{const a=[];for(let i=0;i<4;i++){ghost3dBuild(ghostBuild());drawAll();a.push({...ghost3d.renderer.info.memory});}return a;});expect(resource[3]).toEqual(resource[1]);
  await page.locator('#ghostRestart').click();expect(await page.evaluate(()=>st.play.e)).toBe(0);
  // Wait for actual progress. At4x a slow software-renderer click can land after the lap ends and restart it.
  await page.locator('#ghostRate').selectOption('1');
  await page.locator('#ghostPlay').click({timeout:30000});await expect(page.locator('#ghostPlay')).toContainText('Duraklat');
  await page.waitForFunction(()=>st.play.on&&st.play.e>0,null,{timeout:30000});
  await page.locator('#ghostPlay').click({timeout:30000});expect(await page.evaluate(()=>st.play.on)).toBe(false);expect(await page.evaluate(()=>st.play.e)).toBeGreaterThan(0);
  console.log('RUNTIME',await page.evaluate(()=>({fps:ghost3d.measuredFps,ms:ghost3d.measuredMs,calls:ghost3d.renderer.info.render.calls,memory:ghost3d.renderer.info.memory,gpu:ghost3d.renderer.getContext().getParameter(ghost3d.renderer.getContext().RENDERER),totals:[st.A.total,st.B.total]})));
  expect(errors).toEqual([]);
});
test('real Mexico pilot/lap changes, analysis, mobile and visibility',async({page},testInfo)=>{
  const errors=[];page.on('pageerror',e=>errors.push(e.message));
  await page.goto(url);
  await page.waitForFunction(()=>typeof ghost3d!=='undefined'&&ghost3d.ready&&ghost3d.source===st.A&&!!st.A&&VisualAssets.state==='ready'&&ghost3d.cars[0].userData.asset,null,{timeout:60000});
  const roadSignature=await page.evaluate(()=>JSON.stringify(ghostBuild().canonicalEdges.map(e=>e.p)));
  await page.locator('#ghostClose').click();await expect(page.locator('#chartcard')).toBeVisible();await expect(page.locator('#mapcard')).toBeVisible();
  await page.locator('#drvA').selectOption(await page.locator('#drvA option').evaluateAll(options=>options.find(o=>o.textContent.includes('VER')).value));
  await page.waitForFunction(()=>st.A&&st.H.drivers[st.A.meta.d].c==='VER');
  const lap=await page.locator('#lapA option').evaluateAll(options=>options.find(o=>!o.selected)?.value);if(lap){await page.locator('#lapA').selectOption(lap);await page.waitForFunction(l=>st.A&&String(st.A.meta.i)===l,lap);}
  await page.locator('#ghostToggle').click();expect(await page.evaluate(()=>JSON.stringify(ghostBuild().canonicalEdges.map(e=>e.p)))).toBe(roadSignature);await page.setViewportSize({width:390,height:844});await page.waitForTimeout(200);expect(await page.evaluate(()=>document.documentElement.scrollWidth)).toBeLessThanOrEqual(391);
  const visibility=await page.evaluate(()=>{st.play.on=true;const before=st.play.e;Object.defineProperty(document,'hidden',{configurable:true,get:()=>true});document.dispatchEvent(new Event('visibilitychange'));const result={on:st.play.on,same:st.play.e===before};delete document.hidden;return result;});expect(visibility).toEqual({on:false,same:true});
  expect(errors).toEqual([]);
});
test('WebGL failure keeps the standard replay available',async({page},testInfo)=>{
  await page.route('**/three.module.js',route=>route.abort());await page.goto(url);
  await page.waitForFunction(()=>typeof ghost3d!=='undefined'&&ghost3d.failed);
  await expect(page.locator('#ghostEngine')).toContainText('WebGL kullanılamıyor');await expect(page.locator('#ghostCanvas')).toBeVisible();
  await page.locator('#ghostScrub').fill('6500');expect(await page.evaluate(()=>st.play.e)).toBeGreaterThan(0);
});
test('120-second software-renderer replay soak and resource budget',async({page},testInfo)=>{
  test.setTimeout(240000);const errors=[],consoleErrors=[];page.on('pageerror',e=>errors.push(e.message));page.on('console',e=>{if(e.type()==='error')consoleErrors.push(e.text());});await page.setViewportSize({width:1280,height:720});await page.goto(url);
  await page.waitForFunction(()=>typeof ghost3d!=='undefined'&&ghost3d.ready&&ghost3d.source===st.A&&!!st.A&&VisualAssets.state==='ready'&&ghost3d.cars[0].userData.asset);
  await page.locator('#ghostRenderQuality').selectOption('performance');await page.locator('[data-camera="a"]').click();
  await page.locator('#ghostRate').selectOption('4');await page.locator('#ghostPlay').click();
  const started=Date.now(),snapshots=[];
  for(let i=0;i<12;i++){await page.waitForTimeout(10000);snapshots.push(await page.evaluate(()=>{const result={time:st.play.e,ready:ghost3d.ready,memory:{...ghost3d.renderer.info.memory}};if(!st.play.on)startPlay();return result;}));}
  const wallMs=Date.now()-started;expect(wallMs).toBeGreaterThanOrEqual(120000);for(const s of snapshots){expect(s.ready).toBe(true);expect(s.memory.geometries).toBeLessThan(500);expect(s.memory.textures).toBeLessThan(100);}expect(new Set(snapshots.map(s=>s.time)).size).toBeGreaterThan(1);expect(errors).toEqual([]);expect(consoleErrors).toEqual([]);
  const result=await page.evaluate(()=>{stopPlay();const gl=ghost3d.renderer.getContext(),debug=gl.getExtension('WEBGL_debug_renderer_info');return {fps:ghost3d.measuredFps,ms:ghost3d.measuredMs,ready:ghost3d.ready,geometries:ghost3d.renderer.info.memory.geometries,textures:ghost3d.renderer.info.memory.textures,calls:ghost3d.renderer.info.render.calls,renderer:debug?gl.getParameter(debug.UNMASKED_RENDERER_WEBGL):gl.getParameter(gl.RENDERER),resolution:[ghost3d.canvas.width,ghost3d.canvas.height],...GhostMetrics.summary(),cpu:GhostMetrics.cpuMs,gpu:GhostMetrics.gpuMs};});
  Object.assign(result,{wallMs,snapshots,errors,consoleErrors});console.log('SOAK_120_SECONDS',JSON.stringify(result));require('node:fs').writeFileSync(testInfo.outputPath('measurement.json'),JSON.stringify(result,null,2));expect(result.ready).toBe(true);expect(result.geometries).toBeLessThan(500);expect(result.textures).toBeLessThan(100);
  await page.locator('#ghostScrub').fill('2800');await page.locator('.ghost-stage').screenshot({path:testInfo.outputPath('mexico-preview.png')});
});

test('Ultra effects, diagnostics export and missing asset fallback',async({page},testInfo)=>{
  const errors=[];page.on('pageerror',e=>errors.push(e.message));await page.goto(url);
  await page.waitForFunction(()=>typeof ghost3d!=='undefined'&&ghost3d.ready&&VisualAssets.state==='ready'&&ghost3d.cars[0].userData.asset);
  await page.locator('#ghostRenderQuality').selectOption('ultra');await page.waitForFunction(()=>!!VisualAssets.templates.high);await page.locator('#ghostAO').check();await page.waitForFunction(()=>!!GhostDirector.effects||!document.getElementById('ghostAO').checked);await page.evaluate(()=>drawAll());expect(await page.evaluate(()=>ghost3d.ready)).toBe(true);
  await page.locator('#ghostStatsToggle').check();const download=page.waitForEvent('download');await page.locator('#ghostExport').click();expect((await download).suggestedFilename()).toBe('tur-duellosu-performans.json');expect(errors).toEqual([]);
});
test('asset load failure retains working procedural cars and JPEG materials',async({page},testInfo)=>{
  await page.route('**/*.glb',route=>route.abort());await page.route('**/*.ktx2',route=>route.abort());await page.goto(url);
  await page.waitForFunction(()=>typeof VisualAssets!=='undefined'&&VisualAssets.state==='fallback'&&ghost3d.ready);await page.locator('#ghostScrub').fill('5000');expect(await page.evaluate(()=>ghost3d.cars.length)).toBe(2);expect(await page.evaluate(()=>VisualAssets.textures.color.userData.format)).toBe('JPEG');expect(await page.evaluate(()=>st.play.e)).toBeGreaterThan(0);
});

test('alignment falls back for both laps when one projection is rejected',async({page},testInfo)=>{
 await page.goto(url);await page.waitForFunction(()=>typeof ghost3d!=='undefined'&&ghost3d.ready&&VisualAssets.state==='ready'&&st.A&&st.A.source.stationInfo);
 const result=await page.evaluate(async()=>{const source=st.B.source,valid=source.stationInfo.valid;try{source.stationInfo.valid=false;await compare();return {registered:!!st.H.trackTransform,a:!!st.A.source.station,b:!!st.B.source.station,v4Cleared:!ghost3d.v4Stats&&!ghost3d.v4Obstacles?.length};}finally{source.stationInfo.valid=valid;await compare();}});
 expect(result).toEqual({registered:false,a:false,b:false,v4Cleared:true});expect(await page.evaluate(()=>!!st.H.trackTransform)).toBe(true);
});

test('missing Blender venue assets retain cars and working telemetry',async({page})=>{await page.route('**/assets/v4/venue.glb',r=>r.abort());await page.route('**/assets/v4/tree.glb',r=>r.abort());await page.goto(url);await page.waitForFunction(()=>typeof ghost3d!=='undefined'&&ghost3d.ready&&VisualAssets.state==='ready'&&ghost3d.cars[0].userData.asset);await page.locator('#ghostScrub').fill('5000');expect(await page.evaluate(()=>st.play.e)).toBeGreaterThan(30);expect(await page.evaluate(()=>VisualAssets.errors.some(x=>x.startsWith('venue:')))).toBe(true);});

test('free camera movement stops before the actual circuit barrier',async({page})=>{await page.goto(url);await page.waitForFunction(()=>typeof ghost3d!=='undefined'&&ghost3d.ready&&VisualAssets.state==='ready'&&ghost3d.v4Stats);const move=await page.evaluate(()=>{const f=MexicoV3.frame(.03),a=[f.x+f.rx*12,.65,f.z+f.rz*12],b=[f.x+f.rx*22,.65,f.z+f.rz*22],safe=ghostConstrainFree(b,a);return {moved:Math.hypot(safe[0]-a[0],safe[2]-a[2]),height:safe[1]};});expect(move.moved).toBeGreaterThan(0);expect(move.moved).toBeLessThan(6);expect(move.height).toBeGreaterThanOrEqual(.65);});
