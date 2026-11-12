// Diagnostic only: prototype render batches keep original 128m collision meshes.
const fs=require('node:fs'),path=require('node:path'),{spawn}=require('node:child_process');
const {chromium}=require('@playwright/test');
const root=path.resolve(process.argv[2]||'.'),out=process.argv[3]||'docs/performance/v6-1/prototype-raw.json',port=Number(process.env.PROFILE_PORT||4351);
(async()=>{
 const server=spawn(process.execPath,[path.join(root,'scripts/serve.cjs'),String(port),root],{stdio:'ignore'});let browser;
 try{
  for(let i=0;i<100;i++){try{if((await fetch('http://127.0.0.1:'+port)).ok)break;}catch{}await new Promise(r=>setTimeout(r,100));}
  browser=await chromium.launch({executablePath:process.env.CHROMIUM_PATH||(process.platform==='linux'?'/usr/bin/chromium':undefined),args:['--no-sandbox','--use-angle=swiftshader','--enable-unsafe-swiftshader','--disable-frame-rate-limit','--disable-gpu-vsync',...(process.env.CHROMIUM_PROXY_SPKI?['--ignore-certificate-errors-spki-list='+process.env.CHROMIUM_PROXY_SPKI]:[])]});
  const p=await browser.newPage({viewport:{width:2560,height:1440},deviceScaleFactor:1});
  const errors=[];p.on('pageerror',e=>errors.push(e.message));
  await p.addInitScript(()=>localStorage.setItem('td.disc',JSON.stringify({at:Date.now(),data:{}})));
  await p.goto('http://127.0.0.1:'+port+'/#y=2024&e=Belgian%20Grand%20Prix&k=Q&a=HAM&b=RUS&g=1');
  await p.waitForFunction(()=>typeof ghost3d!=='undefined'&&ghost3d.ready&&VisualAssets.state==='ready'&&ghost3d.cars.every(c=>c.userData.asset),null,{timeout:120000});
  await p.addStyleTag({content:'.ghost-stage{position:fixed!important;inset:0!important;width:100vw!important;height:100vh!important;z-index:9999!important}.ghost-stage #ghostCanvas,.ghost-stage #ghostWebGL{width:100%!important;height:100%!important;max-height:none!important;min-height:0!important}'});
  await p.evaluate(()=>{stopPlay();$('ghostAdaptive').checked=false;$('ghostAO').checked=false;for(const q of Object.values(GHOST_QUALITY))q.ratio=1;$('ghostRenderQuality').value='ultra';ghost.camera='cockpit';st.play.e=10;ghost.cameraState=null;GhostDirector.transition=null;drawAll();});
  await p.waitForFunction(()=>!!VisualAssets.templates.high&&!VisualAssets.highPending,null,{timeout:120000});
  const initial=await p.evaluate(()=>{drawAll();const G=ghost3d,gl=G.renderer.getContext(),d=gl.getExtension('WEBGL_debug_renderer_info');window.profileBarriers=G.world.children.filter(o=>o.userData.cameraObstacle&&o.isMesh);if(profileBarriers.some(o=>o.userData.barrierCollisionRanges))throw Error('Prototype requires the original unoptimized V6 checkout, not the optimized candidate');window.profileMerged=[];const road=G.world.getObjectByName('TopographyRoad');return {renderer:d?gl.getParameter(d.UNMASKED_RENDERER_WEBGL):gl.getParameter(gl.RENDERER),timer:!!GhostMetrics.ext,buffer:[G.canvas.width,G.canvas.height],barriers:profileBarriers.length,barrierVertices:profileBarriers.reduce((n,o)=>n+o.geometry.attributes.position.count,0),roadVertices:road.geometry.attributes.position.count,roadTriangles:road.geometry.attributes.position.count/3,calls:G.renderer.info.render.calls,triangles:G.renderer.info.render.triangles,memory:{...G.renderer.info.memory}};});
  const result={conditions:{classification:'software diagnostic, NOT physical NVIDIA acceptance',browser:browser.version(),viewport:[2560,1440],dpr:1,renderRatio:1,adaptive:false,quality:'ultra',camera:'cockpit',startTime:10,rate:1,requestedWindowMs:4000},initial,windows:[],errors};
  const save=()=>{fs.mkdirSync(path.dirname(out),{recursive:true});fs.writeFileSync(out,JSON.stringify(result,null,2));};save();
  const cdp=await p.context().newCDPSession(p);
  await cdp.send('Profiler.enable');await cdp.send('Profiler.setSamplingInterval',{interval:1000});
  for(const size of [128,256,512,512,256,128]){
   const build=await p.evaluate(size=>{
    stopPlay();const G=ghost3d,T=G.T;
    for(const m of profileMerged){G.world.remove(m);m.geometry.dispose();}profileMerged=[];for(const m of profileBarriers)m.visible=true;
    if(size!==128){
     const groups=new Map();
     for(const o of profileBarriers){o.geometry.computeBoundingBox();const c=o.geometry.boundingBox.getCenter(new T.Vector3()),key=Math.floor(c.x/size)+','+Math.floor(c.z/size);if(!groups.has(key))groups.set(key,[]);groups.get(key).push(o);o.visible=false;}
     for(const group of groups.values()){
      const n=group.reduce((n,o)=>n+o.geometry.attributes.position.count,0),positions=new Float32Array(n*3),normals=new Float32Array(n*3);let offset=0;
      for(const o of group){positions.set(o.geometry.attributes.position.array,offset);normals.set(o.geometry.attributes.normal.array,offset);offset+=o.geometry.attributes.position.array.length;}
      const g=new T.BufferGeometry();g.setAttribute('position',new T.BufferAttribute(positions,3));g.setAttribute('normal',new T.BufferAttribute(normals,3));g.computeBoundingBox();g.computeBoundingSphere();const m=new T.Mesh(g,group[0].material);m.castShadow=group[0].castShadow;m.receiveShadow=group[0].receiveShadow;G.world.add(m);profileMerged.push(m);
     }
    }
    st.play.e=10;ghost.cameraState=null;GhostDirector.transition=null;drawAll();
    return {size,renderBarrierMeshes:profileMerged.length||profileBarriers.length,calls:G.renderer.info.render.calls,triangles:G.renderer.info.render.triangles};
   },size);
   await p.waitForTimeout(1000);
   await p.evaluate(()=>{
    stopPlay();st.play.e=10;ghost.cameraState=null;drawAll();window.profileStats={};window.profileRestores=[];
    function wrap(obj,key,name){const original=obj[key];obj[key]=function(...args){const t=performance.now();try{return original.apply(this,args);}finally{const s=profileStats[name]||(profileStats[name]={calls:0,ms:0});s.calls++;s.ms+=performance.now()-t;}};profileRestores.push(()=>obj[key]=original);}
    wrap(window,'ghostSurfacePose','supportInclusive');wrap(TrackTopography,'orientation','orientationInclusive');wrap(CameraCollision,'closest','collisionInclusive');wrap(window,'ghost3dBuild','worldBuild');
    wrap(ghost3d.scene,'updateMatrixWorld','sceneMatrixUpdate');wrap(GhostDirector,'render','renderSubmissionInclusive');
    const surface=ghostTopography(ghostBuild());wrap(surface,'sampleAtDistance','surfaceSampleInclusive');wrap(surface,'project','projectionInclusive');wrap(surface,'heightAt','heightInclusive');
    window.profileIntervals=[];window.profileGpu=[];const original=GhostMetrics.record;GhostMetrics.record=function(ms){profileIntervals.push(ms);if(Number.isFinite(this.gpuMs))profileGpu.push(this.gpuMs);original.call(this,ms);};profileRestores.push(()=>GhostMetrics.record=original);
    window.profileRoad=ghost3d.world.getObjectByName('TopographyRoad');window.profileRoadVersion=profileRoad.geometry.attributes.position.version;window.profileHeapBefore=performance.memory?.usedJSHeapSize||null;
   });
   await cdp.send('Profiler.start');const heapBefore=await cdp.send('Runtime.getHeapUsage');
   const start=Date.now();await p.evaluate(()=>{st.play.rate=1;startPlay();});await p.waitForTimeout(4000);
   const timing=await p.evaluate(()=>{stopPlay();profileRestores.reverse().forEach(f=>f());const a=profileIntervals.slice().sort((a,b)=>a-b),gpu=profileGpu.slice().sort((a,b)=>a-b),sum=a.reduce((x,y)=>x+y,0);return {frames:a.length,meanFps:a.length*1000/sum,medianFps:1000/a[Math.floor(a.length*.5)],p95Ms:a[Math.floor(a.length*.95)],cpuInclusive:profileStats,softwareGpuQueryMedianMs:gpu.length?gpu[Math.floor(gpu.length*.5)]:null,roadPositionVersionUnchanged:profileRoadVersion===profileRoad.geometry.attributes.position.version,time:st.play.e,memory:{...ghost3d.renderer.info.memory}};});
   const wallMs=Date.now()-start,heapAfter=await cdp.send('Runtime.getHeapUsage'),{profile}=await cdp.send('Profiler.stop');
   const nodes=new Map(profile.nodes.map(n=>[n.id,n])),weights=new Map();for(let i=0;i<(profile.samples||[]).length;i++){const n=nodes.get(profile.samples[i]),key=(n?.callFrame.functionName||'(anonymous)')+' '+(n?.callFrame.url||'');weights.set(key,(weights.get(key)||0)+(profile.timeDeltas?.[i]||0));}
   const topCpuSamples=[...weights].sort((a,b)=>b[1]-a[1]).slice(0,25).map(([functionLocation,us])=>({functionLocation,ms:us/1000}));
   result.windows.push({build,timing,wallMs,heapBefore,heapAfter,topCpuSamples});save();console.log(JSON.stringify(result.windows.at(-1)));
  }
  if(errors.length)throw Error('Page errors: '+errors.join(';'));
 }finally{await browser?.close();server.kill();}
})().catch(e=>{console.error(e);process.exitCode=1;});
