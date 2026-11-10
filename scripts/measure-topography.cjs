const {chromium}=require('@playwright/test'),fs=require('node:fs'),path=require('node:path');
(async()=>{
 const hardware=process.env.TOPOGRAPHY_GPU==='hardware',synthetic=process.env.TOPOGRAPHY_PROFILE==='synthetic';
 const browser=await chromium.launch({executablePath:process.env.CHROMIUM_PATH||undefined,args:hardware?[]:['--use-angle=swiftshader','--enable-unsafe-swiftshader']});
 try {
 const page=await browser.newPage({viewport:{width:1280,height:720},deviceScaleFactor:1}),errors=[];
 page.on('pageerror',e=>errors.push(e.message));
 await page.addInitScript(()=>localStorage.setItem('td.disc',JSON.stringify({at:Date.now(),data:{}})));
 if(synthetic)await page.addInitScript(p=>{window.TOPOGRAPHY_TEST_PROFILE=p;},require('../tests/fixtures/synthetic-topography.cjs'));
 await page.goto((process.argv[2]||'http://127.0.0.1:4173')+(synthetic?'/?topographyTest=synthetic#':'/#')+'y=2024&e=Mexico%20City%20Grand%20Prix&k=Q&a=HAM&b=RUS&g=1');
 await page.waitForFunction(()=>typeof ghost3d!=='undefined'&&ghost3d.ready&&VisualAssets.state==='ready'&&ghost3d.v4Stats,null,{timeout:120000});
 await page.locator('#ghostRenderQuality').selectOption('performance');await page.locator('#ghostAdaptive').uncheck();await page.locator('[data-camera="a"]').click();
 await page.evaluate(()=>{stopPlay();st.play.e=10;ghost.cameraState=null;GhostDirector.transition=null;drawAll();});
 for(let i=0;i<4;i++){await page.waitForTimeout(250);await page.evaluate(()=>drawAll());}
 const fixed=await page.evaluate(()=>{const G=ghost3d,gl=G.renderer.getContext(),ext=gl.getExtension('WEBGL_debug_renderer_info');return {renderer:ext?gl.getParameter(ext.UNMASKED_RENDERER_WEBGL):gl.getParameter(gl.RENDERER),calls:G.renderer.info.render.calls,triangles:G.renderer.info.render.triangles,memory:{...G.renderer.info.memory},resolution:[G.canvas.width,G.canvas.height],totals:[st.A.total,st.B.total]};});
 await page.evaluate(()=>{GhostMetrics.samples=[];window.benchmarkIntervals=[];window.originalMetricRecord=GhostMetrics.record;GhostMetrics.record=function(ms){window.benchmarkIntervals.push(ms);window.originalMetricRecord.call(this,ms);};st.play.rate=1;startPlay();});
 const start=Date.now();await page.waitForTimeout(30000);
 const runtime=await page.evaluate(()=>{stopPlay();GhostMetrics.record=window.originalMetricRecord;const intervals=window.benchmarkIntervals,totalMs=intervals.reduce((a,b)=>a+b,0);return {windowFrames:intervals.length,windowMeanFps:intervals.length*1000/totalMs,windowIntervalMs:totalMs,...GhostMetrics.summary(),fps:ghost3d.measuredFps,time:st.play.e,cpuMs:GhostMetrics.cpuMs,memory:{...ghost3d.renderer.info.memory}};});
 const result={source:process.argv[4],conditions:{viewport:[1280,720],dpr:1,quality:'performance',adaptive:false,camera:'a',rate:1,topography:synthetic?'synthetic':'production-flat',requestedHardware:hardware,physicalGPU:hardware&&!/SwiftShader|llvmpipe|Software|Basic Render/i.test(fixed.renderer)},fixed,runtime,wallMs:Date.now()-start,errors};
 const out=process.argv[3];fs.mkdirSync(path.dirname(out),{recursive:true});fs.writeFileSync(out,JSON.stringify(result,null,2));console.log(JSON.stringify(result));
 }finally{await browser.close();}
})().catch(e=>{console.error(e);process.exitCode=1;});
