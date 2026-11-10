const { test, expect } = require('@playwright/test');
const fs = require('node:fs');
const url = '/#y=2024&e=Mexico%20City%20Grand%20Prix&k=Q&a=HAM&b=RUS&g=1';

test('integrated main candidate uses V4 assets and all LODs through a complete real telemetry lap', async ({page}, info) => {
  test.setTimeout(240000);
  const errors=[], consoleErrors=[], failed=[], loaded=new Set();
  page.on('pageerror', e=>errors.push(e.message));
  page.on('console', e=>{if(e.type()==='error')consoleErrors.push(e.text());});
  page.on('response', r=>{const u=new URL(r.url());if(u.origin===new URL(info.project.use.baseURL).origin){if(r.status()>=400)failed.push([u.pathname,r.status()]);else loaded.add(u.pathname);}});
  page.on('requestfailed', r=>{if(r.url().startsWith(info.project.use.baseURL+'/'))failed.push([r.url(),r.failure()?.errorText]);});
  await page.goto(url);
  await page.waitForFunction(()=>typeof ghost3d!=='undefined'&&ghost3d.ready&&ghost3d.source===st.A&&VisualAssets.state==='ready'&&ghost3d.v4Stats&&ghost3d.cars.every(c=>c.userData.asset),null,{timeout:90000});
  const data=await page.evaluate(()=>({totals:[st.A.total,st.B.total],channels:[st.A,st.B].map(L=>Object.fromEntries(['v','thr','brk','gear','rpm'].map(k=>[k,{count:L[k].length,finite:Array.from(L[k]).every(Number.isFinite),varied:new Set(L[k]).size>1}]))),assetErrors:VisualAssets.errors.slice()}));
  expect(data.totals[0]).toBeCloseTo(76.651,3);expect(data.totals[1]).toBeCloseTo(76.356,3);
  for(const channels of data.channels)for(const c of Object.values(channels)){expect(c.count).toBeGreaterThan(100);expect(c.finite).toBe(true);expect(c.varied).toBe(true);}
  expect(data.assetErrors).toEqual([]);
  await page.locator('#ghostRenderQuality').selectOption('ultra');
  await page.waitForFunction(()=>!!VisualAssets.templates.high&&!VisualAssets.highPending,null,{timeout:90000});
  const lods=[];
  for(const [distance,wanted] of [[15,'high'],[55,'medium'],[150,'low']]){
    const visible=await page.evaluate(distance=>{stopPlay();st.play.e=10;ghost.camera='free';GhostDirector.transition=null;ghost.cameraState=null;const p=ghostReplayPoses(ghostBuild(),10)[0];ghostOrbit.target=[p.x,.65,p.z];ghostOrbit.distance=distance;ghostOrbit.yaw=1;ghostOrbit.pitch=.5;drawAll();return Object.entries(ghost3d.cars[0].userData.levels).filter(([,o])=>o.visible).map(([n])=>n);},distance);
    expect(visible).toEqual([wanted]);lods.push({distance,visible});
  }
  await page.locator('#ghostRenderQuality').selectOption('performance');
  await page.locator('[data-camera="compare"]').click();
  await page.locator('#ghostRate').selectOption('4');
  await page.locator('#ghostRestart').click();
  const started=Date.now();await page.locator('#ghostPlay').click();
  await page.waitForFunction(()=>!st.play.on&&st.play.e===Math.max(st.A.total,st.B.total),null,{timeout:120000});
  const finish=await page.evaluate(()=>({time:st.play.e,playing:st.play.on,progress:ghostBuild().native.map(L=>ghostCurveAt(L.progress,st.play.e).v),delta:lerp(st.delta,positions().ka),ready:ghost3d.ready,cars:ghost3d.cars.length,memory:{...ghost3d.renderer.info.memory},assetErrors:VisualAssets.errors.slice()}));
  expect(finish.time).toBeCloseTo(76.651,3);expect(finish.playing).toBe(false);expect(finish.progress).toEqual([1,1]);expect(finish.ready).toBe(true);expect(finish.cars).toBe(2);expect(finish.delta).toBeCloseTo(-.295,2);expect(finish.assetErrors).toEqual([]);
  await page.locator('#ghostClose').click();await expect(page.locator('#chartcard')).toBeVisible();await expect(page.locator('#mapcard')).toBeVisible();
  const chart=page.locator('#chartcard canvas').first();const chartBefore=await chart.evaluate(c=>c.toDataURL());
  await page.evaluate(()=>{st.play.e=20;drawAll();});
  expect(await chart.evaluate(c=>c.toDataURL())).not.toBe(chartBefore);
  for(const p of ['/assets/v4/car-low.glb','/assets/v4/car-medium.glb','/assets/v4/car-high.glb','/assets/v4/venue.glb','/assets/v4/tree.glb','/assets/v4/tree-atlas.png','/assets/v4/daylight.hdr','/assets/v4/road-color.ktx2','/assets/v4/road-normal.ktx2','/assets/v4/road-roughness.ktx2','/assets/v4/concrete-color.jpg','/assets/v4/concrete-normal.jpg','/assets/v4/concrete-roughness.jpg','/assets/v4/turf-color.jpg'])expect(loaded.has(p),p).toBe(true);
  expect(errors).toEqual([]);expect(failed).toEqual([]);expect(consoleErrors).toEqual([]);
  const result={data,lods,finish,wallSeconds:(Date.now()-started)/1000,loaded:[...loaded].sort(),errors,failed,consoleErrors};
  fs.writeFileSync(info.outputPath('integration-lap.json'),JSON.stringify(result,null,2));console.log('INTEGRATION_LAP',JSON.stringify(result));
});

test('real Mexico race analysis retains summary, charts, strategy, moves and driver tabs',async({page},info)=>{
  const errors=[];page.on('pageerror',e=>errors.push(e.message));
  await page.goto('/#y=2024&e=Mexico%20City%20Grand%20Prix&k=R&m=race');
  await page.waitForFunction(()=>typeof st!=='undefined'&&st.mode==='race'&&st.race&&st.H.kind==='R',null,{timeout:90000});
  await expect(page.locator('#raceview')).toBeVisible();await expect(page.locator('#raceTiles')).not.toBeEmpty();
  for(const tab of ['chart','strat','moves','drv','sum']){await page.locator(`#rtabs [data-tab="${tab}"]`).click();await expect(page.locator('#raceview')).toHaveAttribute('data-t',tab);}
  const result=await page.evaluate(()=>({event:st.H.event,kind:st.H.kind,drivers:st.race.per.filter(x=>x.length).length,lapCounts:st.race.per.filter(x=>x.length).map(x=>x.length),tiles:$('raceTiles').children.length}));
  expect(result.drivers).toBeGreaterThan(15);expect(Math.max(...result.lapCounts)).toBeGreaterThan(60);expect(result.tiles).toBeGreaterThan(0);expect(errors).toEqual([]);
  fs.writeFileSync(info.outputPath('race-analysis.json'),JSON.stringify({...result,errors},null,2));
});
