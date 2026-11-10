const {test,expect}=require('@playwright/test');
test.use({viewport:{width:800,height:700},deviceScaleFactor:2});
test('Ultra on a high-DPI display uses the reduced real drawing buffer and preserves Blender assets',async({page},info)=>{
 const errors=[];page.on('pageerror',e=>errors.push(e.message));
 await page.goto('/#y=2024&e=Mexico%20City%20Grand%20Prix&k=Q&a=HAM&b=RUS&g=1');
 await page.waitForFunction(()=>typeof ghost3d!=='undefined'&&ghost3d.ready&&VisualAssets.state==='ready'&&ghost3d.v4Stats,null,{timeout:90000});
 await page.locator('#ghostAdaptive').uncheck();await page.locator('#ghostRenderQuality').selectOption('ultra');
 await page.waitForFunction(()=>!!VisualAssets.templates.high&&!VisualAssets.highPending,null,{timeout:90000});
 const result=await page.evaluate(()=>{drawAll();return {dpr:devicePixelRatio,ratio:ghost3d.renderer.getPixelRatio(),css:[ghost3d.width,ghost3d.height],buffer:[ghost3d.canvas.width,ghost3d.canvas.height],assets:ghost3d.cars.every(c=>c.userData.asset),ready:ghost3d.ready};});
 expect(result.dpr).toBe(2);expect(result.ratio).toBe(1.5);expect(result.buffer).toEqual(result.css.map(n=>Math.floor(n*1.5)));expect(result.assets).toBe(true);expect(result.ready).toBe(true);expect(errors).toEqual([]);
 require('node:fs').writeFileSync(info.outputPath('high-dpi.json'),JSON.stringify({...result,errors},null,2));
});
