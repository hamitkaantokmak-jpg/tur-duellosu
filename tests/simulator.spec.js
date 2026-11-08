const {test,expect}=require('@playwright/test');
const url='/#y=2024&e=Mexico%20City%20Grand%20Prix&k=Q&a=HAM&b=RUS&g=1';
test('real Mexico telemetry, playback, cameras, profiles, analysis and resource stability',async({page})=>{
  const errors=[];page.on('pageerror',e=>errors.push(e.message));
  await page.goto(url);
  await page.waitForFunction(()=>typeof ghost3d!=='undefined'&&ghost3d.ready&&ghost3d.source===st.A&&!!st.A,null,{timeout:60000});
  await expect(page.locator('#ghostDriver0')).toContainText('HAM');await expect(page.locator('#ghostDriver1')).toContainText('RUS');
  expect(await page.evaluate(()=>({event:st.H.event,samples:st.A.t.length,a:st.A.total,b:st.B.total}))).toMatchObject({event:'Mexico City Grand Prix'});
  await page.locator('#ghostScrub').fill('5000');
  expect(await page.evaluate(()=>ghostBuild().native.every(L=>Math.abs(ghostCurveAt(L.progress,0).v)<1e-9&&Math.abs(ghostCurveAt(L.progress,1000).v-1)<1e-9))).toBe(true);
  const sync=await page.evaluate(()=>{const S=ghostBuild(),p=ghostReplayPoses(S,st.play.e);return {e:st.play.e,delta:lerp(st.delta,positions().ka),p:p.map(x=>[x.x,x.z]),totals:[st.A.total,st.B.total],progress:S.native.map(L=>ghostCurveAt(L.progress,st.play.e).v)};});
  expect(sync.e).toBeCloseTo(Math.max(...sync.totals)/2,6);expect(sync.progress[0]).not.toEqual(sync.progress[1]);expect(sync.p[0]).not.toEqual(sync.p[1]);
  for(const camera of ['a','b','overview','free','tv']){await page.locator(`[data-camera="${camera}"]`).click();expect(await page.evaluate(()=>ghost.camera)).toBe(camera);expect(await page.evaluate(()=>ghost3d.ready)).toBe(true);}
  await page.locator('[data-camera="free"]').click();const before=await page.evaluate(()=>ghost3d.camera.position.toArray());await page.locator('#ghostWebGL').scrollIntoViewIfNeeded();const r=await page.locator('#ghostWebGL').boundingBox();await page.mouse.move(r.x+r.width*.6,r.y+r.height*.6);await page.mouse.down();await page.mouse.move(r.x+r.width*.7,r.y+r.height*.65);await page.mouse.up();expect(await page.evaluate(()=>ghost3d.camera.position.toArray())).not.toEqual(before);
  await page.locator('.ghost-stage').screenshot({path:'/workspace/work/mexico-preview.png'});
  const elapsed=await page.evaluate(()=>st.play.e);
  for(const quality of ['performance','ultra','balanced']){await page.locator('#ghostRenderQuality').selectOption(quality);expect(await page.evaluate(()=>ghost3d.quality)).toBe(quality);expect(await page.evaluate(()=>st.play.e)).toBe(elapsed);}
  await page.locator('#ghostTransparent').uncheck();expect(await page.evaluate(()=>ghost3d.cars[1].children.filter(o=>o.isMesh).every(o=>!o.material.transparent))).toBe(true);
  await page.locator('#ghostStatsToggle').check();await expect(page.locator('#ghostStats')).toContainText('Draw calls');
  // Rate uses the existing playback clock; sample deterministic tick intervals instead of wall-clock GPU speed.
  for(const rate of [.25,.5,1,2,4]){await page.locator('#ghostRate').selectOption(String(rate));const moved=await page.evaluate(()=>{stopPlay();st.play.e=10;st.play.on=true;st.play.last=1000;tick(1050);stopPlay();return st.play.e-10;});expect(moved).toBeCloseTo(.05*rate,6);}
  const resource=await page.evaluate(()=>{const a=[];for(let i=0;i<4;i++){ghost3dBuild(ghostBuild());drawAll();a.push({...ghost3d.renderer.info.memory});}return a;});expect(resource[3]).toEqual(resource[1]);
  await page.locator('#ghostRestart').click();expect(await page.evaluate(()=>st.play.e)).toBe(0);
  await page.locator('#ghostPlay').click();await expect(page.locator('#ghostPlay')).toContainText('Duraklat');await page.waitForTimeout(1500);await page.locator('#ghostPlay').click();expect(await page.evaluate(()=>st.play.e)).toBeGreaterThan(0);
  console.log('RUNTIME',await page.evaluate(()=>({fps:ghost3d.measuredFps,ms:ghost3d.measuredMs,calls:ghost3d.renderer.info.render.calls,memory:ghost3d.renderer.info.memory,gpu:ghost3d.renderer.getContext().getParameter(ghost3d.renderer.getContext().RENDERER),totals:[st.A.total,st.B.total]})));
  await page.locator('#ghostClose').click();await expect(page.locator('#chartcard')).toBeVisible();await expect(page.locator('#mapcard')).toBeVisible();
  await page.locator('#drvA').selectOption(await page.locator('#drvA option').evaluateAll(options=>options.find(o=>o.textContent.includes('VER')).value));
  await page.waitForFunction(()=>st.A&&st.H.drivers[st.A.meta.d].c==='VER');
  const lap=await page.locator('#lapA option').evaluateAll(options=>options.find(o=>!o.selected)?.value);if(lap){await page.locator('#lapA').selectOption(lap);await page.waitForFunction(l=>st.A&&String(st.A.meta.i)===l,lap);}
  await page.locator('#ghostToggle').click();await page.setViewportSize({width:390,height:844});await page.waitForTimeout(200);expect(await page.evaluate(()=>document.documentElement.scrollWidth)).toBeLessThanOrEqual(391);
  expect(errors).toEqual([]);
});
test('WebGL failure keeps the standard replay available',async({page})=>{
  await page.route('**/three.module.js',route=>route.abort());await page.goto(url);
  await page.waitForFunction(()=>typeof ghost3d!=='undefined'&&ghost3d.failed);
  await expect(page.locator('#ghostEngine')).toContainText('WebGL kullanılamıyor');await expect(page.locator('#ghostCanvas')).toBeVisible();
  await page.locator('#ghostScrub').fill('6500');expect(await page.evaluate(()=>st.play.e)).toBeGreaterThan(0);
});
test('30-second software-renderer replay soak and resource budget',async({page})=>{
  await page.setViewportSize({width:1280,height:720});await page.goto(url);
  await page.waitForFunction(()=>typeof ghost3d!=='undefined'&&ghost3d.ready&&ghost3d.source===st.A&&!!st.A);
  await page.locator('#ghostRenderQuality').selectOption('performance');await page.locator('[data-camera="a"]').click();
  await page.locator('#ghostRate').selectOption('4');await page.locator('#ghostPlay').click();
  for(let i=0;i<3;i++){await page.waitForTimeout(10000);await page.evaluate(()=>{if(!st.play.on)startPlay();});}
  const result=await page.evaluate(()=>{stopPlay();const gl=ghost3d.renderer.getContext(),debug=gl.getExtension('WEBGL_debug_renderer_info');return {fps:ghost3d.measuredFps,ms:ghost3d.measuredMs,ready:ghost3d.ready,geometries:ghost3d.renderer.info.memory.geometries,textures:ghost3d.renderer.info.memory.textures,calls:ghost3d.renderer.info.render.calls,renderer:debug?gl.getParameter(debug.UNMASKED_RENDERER_WEBGL):gl.getParameter(gl.RENDERER),resolution:[ghost3d.canvas.width,ghost3d.canvas.height]};});
  console.log('SOAK_30_SECONDS',JSON.stringify(result));expect(result.ready).toBe(true);expect(result.geometries).toBeLessThan(200);expect(result.textures).toBeLessThan(100);
  await page.locator('#ghostScrub').fill('2800');await page.locator('.ghost-stage').screenshot({path:'/workspace/work/mexico-preview.png'});
});
