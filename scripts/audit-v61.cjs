// Physical NVIDIA acceptance is the default. --counters explicitly emits no FPS gate.
const fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto');
const {spawn,execFileSync}=require('node:child_process'),{chromium}=require('@playwright/test');
const counters=process.argv.includes('--counters'),planOnly=process.argv.includes('--plan');
const out=process.env.V61_OUT||'docs/performance/v6-1/nvidia-matrix.json',warmup=Number(process.env.V61_WARMUP||20),seconds=Number(process.env.V61_SECONDS||12);
const tracks=[['mexico','Mexico City Grand Prix'],['cota','United States Grand Prix'],['spa','Belgian Grand Prix']];
const versions=['v5','v6','v61'],orders=[['v5','v6','v61'],['v61','v6','v5'],['v6','v61','v5'],['v5','v61','v6'],['v61','v5','v6'],['v6','v5','v61']];
const roots={v5:process.env.V61_V5_ROOT,v6:process.env.V61_BEFORE_ROOT,v61:process.env.V61_AFTER_ROOT||process.cwd()};
const filter=process.env.V61_FILTER?new RegExp(process.env.V61_FILTER):null,conditions=[];
for(const [track,event]of tracks)for(const width of [1920,2560])for(const quality of ['performance','ultra'])for(const camera of ['a','cockpit']){const key=[track,width,quality,camera].join('/');if(!filter||filter.test(key))conditions.push({track,event,width,height:width===1920?1080:1440,quality,camera,key});}
const result={schema:1,mode:planOnly?'plan':counters?'non-acceptance-counters':'physical-nvidia',conditions:{warmupSeconds:warmup,measurementSeconds:seconds,dpr:1,renderRatio:1,adaptive:false,AO:false,rate:1,startTime:10,orders,scenarios:conditions},performanceAcceptance:false,rows:[],blockers:[]};
const save=()=>{fs.mkdirSync(path.dirname(out),{recursive:true});fs.writeFileSync(out,JSON.stringify(result,null,2)+'\n');};
function gpuState(){try{const csv=execFileSync('nvidia-smi',['--query-gpu=uuid,name,driver_version,pstate,clocks.gr,clocks.mem,power.draw,temperature.gpu,utilization.gpu','--format=csv,noheader,nounits'],{encoding:'utf8',timeout:5000,windowsHide:true,stdio:['ignore','pipe','pipe']}).trim();return{available:true,csv,uuids:csv.split(/\r?\n/).filter(Boolean).map(line=>line.split(',')[0].trim())};}catch(e){return{available:false,error:e.code||e.message};}}
const median=a=>{a=a.slice().sort((a,b)=>a-b);return a.length%2?a[(a.length-1)/2]:(a[a.length/2-1]+a[a.length/2])/2;};
async function fixed(page){return page.evaluate(async()=>{
 const G=ghost3d,gl=G.renderer.getContext(),ext=gl.getExtension('WEBGL_debug_renderer_info'),arrays=new Set(),geometries=new Set();
 G.world.traverse(o=>{if(o.geometry)geometries.add(o.geometry);});
 for(const g of geometries){for(const a of Object.values(g.attributes))arrays.add(a.isInterleavedBufferAttribute?a.data.array:a.array);if(g.index)arrays.add(g.index.array);}
 const road=G.world.getObjectByName('TopographyRoad'),barriers=G.world.children.filter(o=>o.isMesh&&o.userData.cameraObstacle&&!o.isInstancedMesh);
 const digest=async data=>Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256',data))).map(v=>v.toString(16).padStart(2,'0')).join('');
 const triangles=[];
 for(const m of barriers){const p=m.geometry.attributes.position,n=m.geometry.attributes.normal;for(let i=0;i<p.count;i+=3){const words=[];for(let j=i;j<i+3;j++)for(const a of [p,n])for(let k=0;k<3;k++){const f=new Float32Array([a.array[j*3+k]]);words.push(new Uint32Array(f.buffer)[0].toString(16).padStart(8,'0'));}triangles.push(words.join(''));}}
 triangles.sort();const textures=new Set();G.world.traverse(o=>{for(const m of o.material?(Array.isArray(o.material)?o.material:[o.material]):[])for(const t of Object.values(m))if(t?.isTexture)textures.add(t);});for(const t of [G.scene.background,G.scene.environment,G.sun.shadow.map?.texture])if(t?.isTexture)textures.add(t);
 let textureBytes=0;for(const t of textures){if(t.isCompressedTexture){textureBytes+=(t.mipmaps||[]).reduce((s,m)=>s+(m.data?.byteLength||0),0);continue;}for(const im of Array.isArray(t.image)?t.image:[t.image])if(im){const c=t.format===G.T.RedFormat?1:t.format===G.T.RGFormat?2:4,b=t.type===G.T.FloatType?4:t.type===G.T.HalfFloatType?2:1;textureBytes+=im.data?.byteLength||(im.width||0)*(im.height||0)*c*b*(t.generateMipmaps?4/3:1);}}
 return{renderer:ext?gl.getParameter(ext.UNMASKED_RENDERER_WEBGL):gl.getParameter(gl.RENDERER),buffer:[G.canvas.width,G.canvas.height],drawCalls:G.renderer.info.render.calls,triangles:G.renderer.info.render.triangles,residentCounts:{...G.renderer.info.memory},sceneGeometryBytes:[...arrays].reduce((s,a)=>s+a.byteLength,0),sceneTextureBytesEstimate:Math.round(textureBytes),barrierRenderMeshes:barriers.length,barrierQueryChunks:barriers.reduce((s,m)=>s+(m.userData.barrierCollisionRanges?.length||1),0),roadPositionSha256:road?await digest(road.geometry.attributes.position.array):null,barrierTriangleAndNormalSha256:await digest(new TextEncoder().encode(triangles.join('\n'))),category:G.surface.metadata.category,totals:[st.A.total,st.B.total]};
 });}
(async()=>{
 if(planOnly){result.blockers=['Plan only; no measurements performed'];save();return;}
 let browser;const servers=[];
 try{
  browser=await chromium.launch({executablePath:process.env.CHROMIUM_PATH||(process.platform==='linux'?'/usr/bin/chromium':undefined),args:['--no-sandbox','--disable-frame-rate-limit','--disable-gpu-vsync',...(counters?['--use-angle=swiftshader','--enable-unsafe-swiftshader']:[]),...(process.env.CHROMIUM_PROXY_SPKI?['--ignore-certificate-errors-spki-list='+process.env.CHROMIUM_PROXY_SPKI]:[])]});result.browser=browser.version();
  const probe=await browser.newPage();result.rendererProbe=await probe.evaluate(()=>{const gl=document.createElement('canvas').getContext('webgl2');if(!gl)return null;const e=gl.getExtension('WEBGL_debug_renderer_info');return e?gl.getParameter(e.UNMASKED_RENDERER_WEBGL):gl.getParameter(gl.RENDERER);});await probe.close();result.gpuBefore=gpuState();
  if(!counters&&(!/NVIDIA/i.test(result.rendererProbe||'')||/SwiftShader|llvmpipe|software/i.test(result.rendererProbe||'')||!result.gpuBefore.available||result.gpuBefore.uuids.length!==1)){result.blockers=['Same physical NVIDIA GPU/driver state not verified'];save();process.exitCode=2;return;}
  result.roots={};for(const [i,version]of versions.entries()){
   if(!roots[version])throw Error('Set V61_V5_ROOT, V61_BEFORE_ROOT and V61_AFTER_ROOT');const root=path.resolve(roots[version]),port=4380+i;
   result.roots[version]={commit:execFileSync('git',['rev-parse','HEAD'],{cwd:root,encoding:'utf8'}).trim(),runtimeSha256:Object.fromEntries(['index.html','src/ghost-webgl.js','src/ghost-topography.js','src/track-topography.js','src/barrier-batching.js','src/real-topography.js','assets/topography/profiles.js'].map(f=>[f,fs.existsSync(path.join(root,f))?crypto.createHash('sha256').update(fs.readFileSync(path.join(root,f))).digest('hex'):null])),url:'http://127.0.0.1:'+port};
   servers.push(spawn(process.execPath,[path.join(root,'scripts/serve.cjs'),String(port),root],{stdio:'ignore'}));
   for(let j=0;j<100;j++){try{if((await fetch(result.roots[version].url)).ok)break;}catch{}await new Promise(r=>setTimeout(r,100));}
  }save();
  async function open(version,c){const p=await browser.newPage({viewport:{width:960,height:640},deviceScaleFactor:1});p.auditErrors=[];p.on('pageerror',e=>p.auditErrors.push(e.message));await p.addInitScript(()=>localStorage.setItem('td.disc',JSON.stringify({at:Date.now(),data:{}})));
   await p.goto(result.roots[version].url+'/#y=2024&e='+encodeURIComponent(c.event)+'&k=Q&a=HAM&b=RUS&g=1');await p.evaluate(()=>{$('ghostRenderQuality').value='performance';$('ghostAdaptive').checked=false;if(st.A)drawAll();});
   await p.waitForFunction(()=>typeof ghost3d!=='undefined'&&ghost3d.ready&&VisualAssets.state==='ready'&&ghost3d.cars.every(c=>c.userData.asset),null,{timeout:120000});
   await p.addStyleTag({content:'.ghost-stage{position:fixed!important;inset:0!important;width:100vw!important;height:100vh!important;z-index:9999!important}.ghost-stage #ghostCanvas,.ghost-stage #ghostWebGL{width:100%!important;height:100%!important;max-height:none!important;min-height:0!important}'});
   await p.evaluate(()=>{stopPlay();$('ghostAdaptive').checked=false;$('ghostAO').checked=false;$('ghostElevation').checked=false;for(const q of Object.values(GHOST_QUALITY))q.ratio=1;});return p;}
  async function prepare(p,c){await p.setViewportSize({width:c.width,height:c.height});await p.evaluate(c=>{stopPlay();$('ghostRenderQuality').value=c.quality;ghost.camera=c.camera;st.play.e=10;ghost.cameraState=null;GhostDirector.transition=null;drawAll();},c);
   if(c.quality==='ultra')await p.waitForFunction(()=>!!VisualAssets.templates.high&&!VisualAssets.highPending,null,{timeout:60000});
   await p.waitForFunction(({width,height})=>ghost3d.canvas.width===width&&ghost3d.canvas.height===height,c,{timeout:30000});await p.evaluate(()=>drawAll());}
  if(counters){
   for(const version of versions)for(const [track,event]of tracks){const cs=conditions.filter(c=>c.track===track);if(!cs.length)continue;const p=await open(version,{track,event});
    try{for(const c of cs){await prepare(p,c);const data=await fixed(p);if(data.buffer[0]!==c.width||data.buffer[1]!==c.height)throw Error('Wrong buffer');result.rows.push({...c,version,fixed:data,timing:null,errors:p.auditErrors.slice()});save();console.log(JSON.stringify({version,condition:c.key,calls:data.drawCalls,triangles:data.triangles}));if(p.auditErrors.length)throw Error('Page errors');}}finally{await p.close();}
   }
   result.blockers=['Counters only; no NVIDIA FPS/p95 acceptance measurements'];
  }else{
   for(const c of conditions)for(let repeat=0;repeat<orders.length;repeat++)for(const version of orders[repeat]){
    const p=await open(version,c);try{await prepare(p,c);await p.evaluate(()=>{st.play.rate=1;startPlay();});await p.waitForTimeout(warmup*1000);await p.evaluate(()=>{stopPlay();st.play.e=10;ghost.cameraState=null;drawAll();});
     const data=await fixed(p),gpuStart=gpuState();if(!gpuStart.available||JSON.stringify(gpuStart.uuids)!==JSON.stringify(result.gpuBefore.uuids))throw Error('Physical GPU identity changed');
     await p.evaluate(()=>{window.v61Completions=[];window.v61Cpu=[];window.v61Gpu=[];window.v61Render=GhostDirector.render;GhostDirector.render=function(...args){const t=performance.now(),r=v61Render.apply(this,args);v61Cpu.push(performance.now()-t);v61Completions.push(performance.now());if(Number.isFinite(GhostMetrics.gpuMs))v61Gpu.push(GhostMetrics.gpuMs);return r;};window.v61Start=performance.now();st.play.rate=1;startPlay();});
     await p.waitForTimeout(seconds*1000);
     const timing=await p.evaluate(()=>{const end=performance.now();stopPlay();GhostDirector.render=v61Render;const sorted=a=>a.slice().sort((a,b)=>a-b),q=(a,k)=>a.length?a[Math.min(a.length-1,Math.floor(a.length*k))]:null,intervals=sorted(v61Completions.map((t,i)=>t-(i?v61Completions[i-1]:v61Start))),cpu=sorted(v61Cpu),gpu=sorted(v61Gpu),elapsed=end-v61Start;return{frames:v61Completions.length,observedMs:elapsed,meanFps:v61Completions.length*1000/elapsed,medianFps:intervals.length?1000/q(intervals,.5):null,p95Ms:q(intervals,.95),maxMs:q(intervals,1),cpuSubmissionMedianMs:q(cpu,.5),gpuDirectQueryMedianMs:q(gpu,.5),gpuQuerySamples:gpu.length,time:st.play.e};});
     const gpuEnd=gpuState();if(!gpuEnd.available||JSON.stringify(gpuEnd.uuids)!==JSON.stringify(result.gpuBefore.uuids))throw Error('Physical GPU identity changed');result.rows.push({...c,version,repeat,fixed:data,timing,gpuStart,gpuEnd,errors:p.auditErrors.slice()});save();console.log(JSON.stringify({version,condition:c.key,repeat,timing}));if(p.auditErrors.length||timing.frames<120)throw Error('Invalid/undersampled measurement');
    }finally{await p.close();}
   }
   const comparison=conditions.map(c=>{const by=Object.fromEntries(versions.map(v=>[v,result.rows.filter(r=>r.key===c.key&&r.version===v)]));const stats=Object.fromEntries(versions.map(v=>[v,{windowMedianMeanFps:median(by[v].map(r=>r.timing.meanFps)),windowMedianP95Ms:median(by[v].map(r=>r.timing.p95Ms)),windows:by[v].length}]));return{key:c.key,stats,lossVsV5Pct:100*(1-stats.v61.windowMedianMeanFps/stats.v5.windowMedianMeanFps),lossVsV6Pct:100*(1-stats.v61.windowMedianMeanFps/stats.v6.windowMedianMeanFps)};});result.comparison=comparison;result.numericalFpsGate=comparison.length===conditions.length&&comparison.every(c=>c.lossVsV5Pct<=10);result.performanceAcceptance=false;result.acceptanceScope='Numerical performance gate only; functional, source, visual and GPU clock comparability review still required.';
  }
 }catch(e){result.blockers.push(e.message);process.exitCode=1;console.error(e);}
 finally{result.gpuAfter=gpuState();save();await browser?.close();for(const s of servers)s.kill();}
})().catch(e=>{result.blockers.push(e.message);save();console.error(e);process.exitCode=1;});
