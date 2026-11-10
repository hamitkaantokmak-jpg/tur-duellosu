// Sequential, equal-condition diagnostic. SwiftShader measurements are not physical GPU results.
const {chromium}=require('@playwright/test');
const fs=require('node:fs');
(async()=>{
 const browser=await chromium.launch({executablePath:process.env.CHROMIUM_PATH||'/usr/bin/chromium',args:['--no-sandbox','--use-angle=swiftshader','--enable-unsafe-swiftshader',...(process.env.CHROMIUM_PROXY_SPKI?['--ignore-certificate-errors-spki-list='+process.env.CHROMIUM_PROXY_SPKI]:[])]});
 try{
 const results={conditions:{viewport:[1280,720],dpr:1,quality:'performance',adaptive:false,camera:'a',rate:1,requestedObservationMs:30000,physicalGPU:false},runtime:[]};
 for(const [label,url] of [['before',process.argv[2]],['after',process.argv[3]]]){
 const page=await browser.newPage({viewport:{width:1280,height:720},deviceScaleFactor:1});
 const errors=[];page.on('pageerror',e=>errors.push(e.message));
 await page.goto(url+'/#y=2024&e=Mexico%20City%20Grand%20Prix&k=Q&a=HAM&b=RUS&g=1');
 await page.waitForFunction(()=>typeof ghost3d!=='undefined'&&ghost3d.ready&&VisualAssets.state==='ready'&&ghost3d.v4Stats,null,{timeout:120000});
 await page.locator('#ghostRenderQuality').selectOption('performance');await page.locator('#ghostAdaptive').uncheck();await page.locator('[data-camera="a"]').click();
 await page.evaluate(()=>{stopPlay();st.play.e=10;drawAll();});await page.waitForTimeout(3000);
 await page.evaluate(()=>{GhostMetrics.samples=[];st.play.rate=1;startPlay();});
 const start=Date.now();await page.waitForTimeout(30000);
 const observation=await page.evaluate(()=>{stopPlay();const gl=ghost3d.renderer.getContext(),ext=gl.getExtension('WEBGL_debug_renderer_info');return {...GhostMetrics.summary(),fps:ghost3d.measuredFps,frameMs:ghost3d.measuredMs,cpuMs:GhostMetrics.cpuMs,gpuMs:GhostMetrics.gpuMs,time:st.play.e,renderer:ext?gl.getParameter(ext.UNMASKED_RENDERER_WEBGL):gl.getParameter(gl.RENDERER)};});
 const wallMs=Date.now()-start;
 const fixed=await page.evaluate(()=>{st.play.e=30;drawAll();return {calls:ghost3d.renderer.info.render.calls,memory:{...ghost3d.renderer.info.memory},buffer:[ghost3d.canvas.width,ghost3d.canvas.height],ratio:ghost3d.renderer.getPixelRatio()};});
 results.runtime.push({label,wallMs,observation,fixed,errors});
 if(label==='after')results.camera=await page.evaluate(()=>{
  stopPlay();const G=ghost3d,T=G.T,S=ghostBuild(),ray=new T.Raycaster(),N=400,total=Math.max(st.A.total,st.B.total),samples={old:[],optimized:[]};let mismatch=0,maxCameraError=0;
  const stats=a=>{a.sort((a,b)=>a-b);return {n:a.length,totalMs:a.reduce((a,b)=>a+b,0),p50Ms:a[Math.floor(a.length*.5)],p95Ms:a[Math.floor(a.length*.95)],maxMs:a[a.length-1]};};
  const setup=i=>{const p=ghostReplayPoses(S,i/N*total)[0],camera=[p.x-p.fx*14,3.3,p.z-p.fz*14],target=[p.x,.65,p.z];G.camera.position.set(...camera);for(const tile of G.tiles||[]){const c=tile.geometry.boundingSphere.center;tile.visible=Math.hypot(c.x-p.x,c.z-p.z)<GHOST_QUALITY.performance.far+180;}MexicoV3.update(G);MexicoV4.update(G);G.world.updateMatrixWorld(true);const objects=(G.environment.visible?G.tiles||[]:[]).filter(o=>o.visible&&o.material.name!=='Vegetation');G.world.children.forEach(o=>{if(o.userData.cameraObstacle)objects.push(o);});objects.push(...(G.v4Obstacles||[]).filter(o=>o.visible));const origin=new T.Vector3(...target),dir=new T.Vector3(...camera).sub(origin);ray.near=1.5;ray.far=dir.length();ray.set(origin,dir.normalize());return {objects,camera,origin,dir};};
  const output=(hit,s)=>hit?s.origin.clone().addScaledVector(s.dir,Math.max(.6,hit.distance-.7)).toArray():s.camera;
  CameraCollision.clear();let s=setup(0),t=performance.now();CameraCollision.closest(T,ray,s.objects);const coldMs=performance.now()-t;
  for(let i=0;i<N;i++){s=setup(i);ray.intersectObjects(s.objects,false);CameraCollision.closest(T,ray,s.objects);}
  for(let r=0;r<3;r++)for(let i=0;i<N;i++){
   s=setup(i);const h={};for(const key of (i+r)%2?['optimized','old']:['old','optimized']){t=performance.now();h[key]=key==='old'?ray.intersectObjects(s.objects,false)[0]:CameraCollision.closest(T,ray,s.objects);samples[key].push(performance.now()-t);}
   const a=output(h.old,s),b=output(h.optimized,s),error=Math.hypot(...a.map((v,j)=>v-b[j]));maxCameraError=Math.max(maxCameraError,error);if(error>1e-6)mismatch++;
  }
  return {note:'Same real scene, 400 rays over full lap, 3 repeats; alternating order; 400 warmup rays; region visibility refreshed outside timed calls. Camera CPU only, excludes rendering and setup.',coldOptimizedFirstRayMs:coldMs,old:stats(samples.old),optimized:stats(samples.optimized),mismatch,maxCameraError};
 });
 await page.close();
 }
 if(results.camera.mismatch||results.runtime.some(r=>r.errors.length))throw Error(JSON.stringify(results));
 const output=process.argv[4]||'test-results/perf-comparison.json';fs.mkdirSync(require('node:path').dirname(output),{recursive:true});fs.writeFileSync(output,JSON.stringify(results,null,2));console.log(JSON.stringify(results,null,2));
 }finally{await browser.close();}
})().catch(e=>{console.error(e);process.exitCode=1;});
