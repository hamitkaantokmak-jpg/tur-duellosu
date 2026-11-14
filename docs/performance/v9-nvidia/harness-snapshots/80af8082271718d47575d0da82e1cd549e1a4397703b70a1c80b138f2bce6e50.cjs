// Fixed-resolution, sequential, physical NVIDIA comparison. Never emits acceptance by itself.
const fs=require('node:fs'),path=require('node:path'),os=require('node:os'),crypto=require('node:crypto');
const {spawn,execFile,execFileSync}=require('node:child_process'),{promisify}=require('node:util'),{chromium}=require('@playwright/test');
const run=promisify(execFile),pilot=process.argv.includes('--pilot'),profile=process.argv.includes('--profile'),domDiagnostic=process.argv.includes('--dom-diagnostic'),planOnly=process.argv.includes('--plan'),recheck=process.argv.includes('--recheck');
const commits={v5:'a237ca529b31bd769df90165c62f73cdef54a672',v6:'f295c01a8984715334363077fb66ccaad522e246',v61:'e5ffd2224bb3ee2dceed9ee2470bc6f6da33fc74',v7:'0d5deecee432230bb1d84c77cc2bd92553358922',v8:'ad35d61f5b26ed1d5ff6d82a3ee43b91478cee94',v9:'12b85328235b095d2362a44e058cc28ec023d302'};
const versions=domDiagnostic?['v8']:(process.env.V9_VERSIONS?process.env.V9_VERSIONS.split(','):Object.keys(commits)),tracks=[['spa','Belgian Grand Prix'],['cota','United States Grand Prix'],['mexico','Mexico City Grand Prix']];
if(!versions.length||versions.some(v=>!commits[v])||new Set(versions).size!==versions.length)throw Error('Invalid version set');
const warmup=6,seconds=8,repeats=domDiagnostic?4:pilot||profile?1:3,out=process.env.V9_OUT||`docs/performance/v9-nvidia/${planOnly?'plan':domDiagnostic?'dom-diagnostic':profile?'profile':pilot?'pilot':recheck?'rechecks':'matrix'}.json`;
const filter=process.env.V9_FILTER?new RegExp(process.env.V9_FILTER):null;
const scenarios=[];for(const [track,event]of tracks)for(const width of [2560,1920])for(const quality of ['ultra','performance'])for(const camera of ['a','cockpit']){const key=[track,width,quality,camera].join('/');if((!(pilot||profile||domDiagnostic)||(track==='spa'&&width===2560&&quality==='ultra'))&&(!domDiagnostic||camera==='cockpit')&&(!filter||filter.test(key)))scenarios.push({track,event,width,height:width===2560?1440:1080,quality,camera,key});}
const rotate=n=>[...versions.slice(n),...versions.slice(0,n)];
const orders=domDiagnostic?Array.from({length:4},()=>versions):recheck?[rotate(1).reverse(),rotate(1),rotate(3).reverse()]:[versions,versions.slice().reverse(),rotate(2)];
const result={schema:1,phase:domDiagnostic?'excluded-dom-diagnostic':profile?'excluded-profile':pilot?'excluded-pilot':'main',startedAt:new Date().toISOString(),commits,plan:{warmup,seconds,repeats,orders,scenarios,lossThresholdPercent:10,dpr:1,renderRatio:1,adaptive:false,AO:false,rate:1,measurementReplayInterval:[10,18],historicalSpa1440Ultra:pilot||profile||domDiagnostic?null:{warmup:20,seconds:12,replayInterval:[10,22]},domDiagnostic:domDiagnostic?['original','same-text-write-guard','original','same-text-write-guard']:null,processControl:'Only disposable CDP-owned Chrome processes: execution-speed and timer-resolution throttling OFF, affinity to OS-reported highest EfficiencyClass cores. No global plan or GPU clock change.',note:'Only pixel ratio is normalized upward to a real 1920x1080/2560x1440 buffer; native geometry, LOD, shadows, lights and materials remain untouched. V5 COTA/Spa are flat normalized XY, later versions derived terrain: end-user workload comparison, not identical meshes. Pilot/profile/diagnostic excluded, no windows discarded.'},scriptsSha256:Object.fromEntries(['scripts/nvidia-v9/audit-v9.cjs','scripts/nvidia-v9/frame-window.cjs','scripts/nvidia-v9/control-chrome-v9.ps1','scripts/nvidia-v9/read-power-v9.ps1'].map(f=>[f,crypto.createHash('sha256').update(fs.readFileSync(f)).digest('hex')])),roots:{},rows:[],blockers:[],performanceAcceptance:false};
const save=()=>{fs.mkdirSync(path.dirname(out),{recursive:true});fs.writeFileSync(out+'.tmp',JSON.stringify(result,null,2)+'\n');fs.renameSync(out+'.tmp',out);};
if(recheck){result.phase='predeclared-recheck';result.plan.recheck=true;}
if(planOnly)result.phase=recheck?'recheck-plan-only':'plan-only';
const sleep=ms=>new Promise(r=>setTimeout(r,ms));
async function gpu(){const {stdout}=await run('nvidia-smi',['--query-gpu=uuid,name,driver_version,pstate,clocks.gr,clocks.mem,power.draw,temperature.gpu,utilization.gpu,utilization.memory,memory.used,memory.total,clocks_event_reasons.sw_power_cap,clocks_event_reasons.sw_thermal_slowdown,clocks_event_reasons.hw_slowdown','--format=csv,noheader,nounits'],{windowsHide:true,timeout:10000});const lines=stdout.trim().split(/\r?\n/);if(lines.length!==1)throw Error('Require one physical GPU');const a=lines[0].split(',').map(v=>v.trim());return{at:Date.now(),uuid:a[0],name:a[1],driver:a[2],pstate:a[3],graphicsMHz:+a[4],memoryMHz:+a[5],watts:+a[6],temperatureC:+a[7],gpuUtilPercent:+a[8],memoryUtilPercent:+a[9],globalMemoryMiB:+a[10],totalMemoryMiB:+a[11],softwarePowerCap:a[12],softwareThermalSlowdown:a[13],hardwareSlowdown:a[14]};}
async function power(){const {stdout}=await run('powershell.exe',['-NoProfile','-Command',fs.readFileSync('scripts/nvidia-v9/read-power-v9.ps1','utf8')],{windowsHide:true,timeout:15000});return JSON.parse(stdout);}
async function control(system,apply){const info=await system.send('SystemInfo.getProcessInfo'),ids=info.processInfo.filter(p=>/^(browser|renderer|gpu)$/i.test(p.type)).map(p=>p.id);if(!ids.length||!ids.every(Number.isInteger))throw Error('No owned Chrome PIDs');const code='$v9OwnedIds=@('+ids.join(',')+');$v9Apply=$'+(apply?'true':'false')+'\n'+fs.readFileSync('scripts/nvidia-v9/control-chrome-v9.ps1','utf8');const {stdout}=await run('powershell.exe',['-NoProfile','-Command',code],{windowsHide:true,timeout:20000});const data=JSON.parse(stdout);for(const p of data.processes)p.type=info.processInfo.find(i=>i.id===p.id)?.type;return data;}
async function fixed(p){return p.evaluate(async()=>{
 const G=ghost3d,gl=G.renderer.getContext(),ext=gl.getExtension('WEBGL_debug_renderer_info'),arrays=new Set(),textures=new Set();G.world.traverse(o=>{if(o.geometry){for(const a of Object.values(o.geometry.attributes))arrays.add(a.isInterleavedBufferAttribute?a.data.array:a.array);if(o.geometry.index)arrays.add(o.geometry.index.array);}if(o.instanceMatrix)arrays.add(o.instanceMatrix.array);if(o.instanceColor)arrays.add(o.instanceColor.array);for(const m of o.material?(Array.isArray(o.material)?o.material:[o.material]):[])for(const t of Object.values(m))if(t?.isTexture)textures.add(t);});
 for(const t of [G.scene.background,G.scene.environment,G.sun.shadow.map?.texture])if(t?.isTexture)textures.add(t);
 let textureBytes=0;for(const t of textures){if(t.isCompressedTexture){textureBytes+=(t.mipmaps||[]).reduce((n,m)=>n+(m.data?.byteLength||0),0);continue;}for(const im of Array.isArray(t.image)?t.image:[t.image])if(im){const c=t.format===G.T.RedFormat?1:t.format===G.T.RGFormat?2:4,b=t.type===G.T.FloatType?4:t.type===G.T.HalfFloatType?2:1;textureBytes+=im.data?.byteLength||(im.width||0)*(im.height||0)*c*b*(t.generateMipmaps?4/3:1);}}
 const raw=JSON.stringify([st.A,st.B].map(L=>({total:L.total,channels:Object.fromEntries(['t','rel','v','thr','brk','gear','rpm','x','y','elevation'].map(k=>[k,L.source[k]?Array.from(L.source[k]):null]))}))),telemetrySha256=Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256',new TextEncoder().encode(raw)))).map(v=>v.toString(16).padStart(2,'0')).join('');
 return {telemetrySha256,renderer:ext?gl.getParameter(ext.UNMASKED_RENDERER_WEBGL):gl.getParameter(gl.RENDERER),buffer:[G.canvas.width,G.canvas.height],dpr:devicePixelRatio,ratio:G.renderer.getPixelRatio(),quality:G.quality,profile:{...GHOST_QUALITY[G.quality]},shadowMap:G.sun.shadow.mapSize.toArray(),drawCalls:G.renderer.info.render.calls,triangles:G.renderer.info.render.triangles,resident:{...G.renderer.info.memory},sceneGeometryBytes:[...arrays].reduce((n,a)=>n+a.byteLength,0),sceneTextureBytesEstimate:Math.round(textureBytes),cpuRoadPositionBytes:G.vehicleRoad?.positionBytes||0,sourceCategory:G.surface.metadata.category,totals:[st.A.total,st.B.total],heap:performance.memory?.usedJSHeapSize??null};
 });}
let previous=null;
if(process.argv.includes('--resume')){
 previous=JSON.parse(fs.readFileSync(out,'utf8'));
 if(previous.completedAt){console.log('Already completed; no additional measurement performed.');process.exit(0);}
 if(previous.blockers.length||JSON.stringify(previous.plan)!==JSON.stringify(result.plan)||JSON.stringify(previous.commits)!==JSON.stringify(commits)||JSON.stringify(previous.scriptsSha256)!==JSON.stringify(result.scriptsSha256))throw Error('Checkpoint has blockers or different immutable inputs; refusing to mix measurements');
 const alive=id=>{try{process.kill(id,0);return true;}catch(e){if(e.code==='ESRCH')return false;throw e;}};
 if(previous.processId&&alive(previous.processId))throw Error('Prior benchmark process is still alive');
 if(previous.initialProcessControl?.processes.some(p=>p.type==='browser'&&alive(p.id)))throw Error('Prior owned benchmark Chrome is still alive; avoid concurrent GPU workloads');
 result.rows=previous.rows;result.roots=previous.roots;result.startedAt=previous.startedAt;result.sessions=previous.sessions||[];result.recovery=previous.recovery;
}
(async()=>{
 if(planOnly){save();return;}let browser,system;const servers=[],pages={};
 try{
  result.powerBefore=await power();if(result.powerBefore.acLineStatus!==1||result.powerBefore.powerSaving!==0)throw Error('AC and no battery saver required');result.gpuBefore=await gpu();result.logicalCpuCount=os.cpus().length;result.cpuModel=os.cpus()[0].model;
  if(previous&&(previous.gpuBefore.uuid!==result.gpuBefore.uuid||previous.gpuBefore.driver!==result.gpuBefore.driver||previous.powerBefore.scheme!==result.powerBefore.scheme))throw Error('Resume hardware/power identity changed');
  result.processId=process.pid;result.sessions??=[];result.sessions.push({startedAt:new Date().toISOString(),processId:process.pid,rowsAtStart:result.rows.length,gpuBefore:result.gpuBefore,powerBefore:result.powerBefore});
  result.harnessSnapshots={};for(const [file,sha]of Object.entries(result.scriptsSha256)){const target=path.join(path.dirname(out),'harness-snapshots',sha+path.extname(file));fs.mkdirSync(path.dirname(target),{recursive:true});fs.copyFileSync(file,target);result.harnessSnapshots[file]=target;}
  const args=['--no-sandbox','--disable-frame-rate-limit','--disable-gpu-vsync','--disable-background-timer-throttling','--disable-renderer-backgrounding','--disable-backgrounding-occluded-windows'];result.launchArgs=args;
  browser=await chromium.launch({executablePath:process.env.CHROMIUM_PATH,args});result.browser=browser.version();if(previous&&previous.browser!==result.browser)throw Error('Resume Chromium version changed');system=await browser.newBrowserCDPSession();result.systemGpu=await system.send('SystemInfo.getInfo');result.initialProcessControl=await control(system,true);
  for(const [i,version]of versions.entries()){
   const root=path.resolve('work/v9-versions',version),port=4390+i;
   const files=['index.html','src/ghost-webgl.js','src/ghost-topography.js','src/track-topography.js','src/barrier-batching.js','src/ghost-vehicle-motion.js','src/vehicle-motion.js','assets/topography/profiles.json','assets/v4/car-low.glb','assets/v4/car-medium.glb','assets/v4/car-high.glb','assets/v4/sources.json'];
   const hashes=Object.fromEntries(files.map(f=>{const present=fs.existsSync(path.join(root,f));let tracked=false;try{execFileSync('git',['cat-file','-e',commits[version]+':'+f],{stdio:'ignore'});tracked=true;}catch{}if(present!==tracked)throw Error('Archive file presence mismatch '+version+'/'+f);if(!present)return[f,null];const actual=crypto.createHash('sha256').update(fs.readFileSync(path.join(root,f))).digest('hex'),expected=crypto.createHash('sha256').update(execFileSync('git',['show',commits[version]+':'+f],{maxBuffer:64*1024*1024})).digest('hex');if(actual!==expected)throw Error('Archive file hash mismatch '+version+'/'+f);return[f,actual];}));
   if(previous&&JSON.stringify(previous.roots[version].runtimeSha256)!==JSON.stringify(hashes))throw Error('Resume archive hash changed');
   result.roots[version]={...result.roots[version],url:'http://127.0.0.1:'+port,runtimeSha256:hashes,canonicalGitFilesVerified:true};
   const server=spawn(process.execPath,[path.resolve('scripts/serve.cjs'),String(port),root],{stdio:'ignore',windowsHide:true});servers.push(server);
   for(let k=0;k<100;k++){try{if((await fetch(result.roots[version].url)).ok)break;}catch{}await sleep(100);}
  }save();
  let lastTrack='';
  for(const c of scenarios){
   if(Array.from({length:repeats},(_,r)=>versions.every(v=>result.rows.some(row=>row.key===c.key&&row.version===v&&row.repeat===r))).every(Boolean))continue;
   if(c.track!==lastTrack){
    for(const p of Object.values(pages))await p.close();
    for(const version of versions){
     const p=await browser.newPage({viewport:{width:c.width,height:c.height},deviceScaleFactor:1});pages[version]=p;p.errors=[];p.on('pageerror',e=>p.errors.push(e.message));
     await p.addInitScript(()=>localStorage.setItem('td.disc',JSON.stringify({at:Date.now(),data:{}})));
     await p.goto(result.roots[version].url+'/#y=2024&e='+encodeURIComponent(c.event)+'&k=Q&a=HAM&b=RUS&g=1');
     await p.waitForFunction(()=>typeof ghost3d!=='undefined'&&ghost3d.ready&&VisualAssets.state==='ready'&&ghost3d.cars.every(c=>c.userData.asset),null,{timeout:120000});
     result.roots[version].nativeQualityProfiles=await p.evaluate(()=>Object.fromEntries(Object.entries(GHOST_QUALITY).map(([k,v])=>[k,{...v}])));
     await p.addScriptTag({path:path.resolve('scripts/nvidia-v9/frame-window.cjs')});
     await p.addStyleTag({content:'.ghost-stage{position:fixed!important;inset:0!important;width:100vw!important;height:100vh!important;z-index:9999!important}.ghost-stage #ghostCanvas,.ghost-stage #ghostWebGL{width:100%!important;height:100%!important;max-height:none!important;min-height:0!important}'});
     await p.evaluate(()=>{stopPlay();$('ghostAdaptive').checked=false;$('ghostAO').checked=false;$('ghostElevation').checked=false;for(const q of Object.values(GHOST_QUALITY))q.ratio=1;});
     const identity=await fixed(p);(result.roots[version].telemetryByTrack??={})[c.track]=identity.telemetrySha256;
     const trackHashes=Object.values(result.roots).map(r=>r.telemetryByTrack?.[c.track]).filter(Boolean);if(new Set(trackHashes).size!==1)throw Error('Cross-version raw telemetry mismatch: '+c.track);
     p.cdp=await p.context().newCDPSession(p);await p.cdp.send('Performance.enable');
    }lastTrack=c.track;
   }
   for(let repeat=0;repeat<repeats;repeat++)for(const version of orders[repeat]){
    if(result.rows.some(row=>row.key===c.key&&row.version===version&&row.repeat===repeat))continue;
    const historical=!pilot&&!profile&&!domDiagnostic&&c.track==='spa'&&c.width===2560&&c.quality==='ultra',windowWarmup=historical?20:warmup,windowSeconds=historical?12:seconds;
    const p=pages[version];await p.bringToFront();await p.setViewportSize({width:c.width,height:c.height});
    const processControl=await control(system,true);if(processControl.processes.some(p=>p.error||!p.set||p.affinityAfter!==processControl.selectedAffinity||(p.afterControl&5)!==5||(p.afterState&5)!==0))throw Error('Owned benchmark Chrome power/core control failed: '+JSON.stringify(processControl));
    const windowPower=await power();if(windowPower.acLineStatus!==1||windowPower.powerSaving!==0||windowPower.scheme!==result.powerBefore.scheme)throw Error('Window power state changed');
    if(domDiagnostic)await p.evaluate(guard=>{const node=$('ghostScenery');delete node.textContent;if(guard){const d=Object.getOwnPropertyDescriptor(Node.prototype,'textContent');Object.defineProperty(node,'textContent',{configurable:true,get(){return d.get.call(this);},set(v){if(d.get.call(this)!==v)d.set.call(this,v);}});}},repeat%2===1);
    await p.evaluate(c=>{stopPlay();$('ghostRenderQuality').value=c.quality;ghost.camera=c.camera;ghost.cameraState=null;GhostDirector.transition=null;st.play.e=10;drawAll();},c);
    if(c.quality==='ultra')await p.waitForFunction(()=>!!VisualAssets.templates.high&&!VisualAssets.highPending,null,{timeout:60000});
    await p.evaluate(()=>{drawAll();startPlay();});await p.waitForTimeout(windowWarmup*1000);await p.evaluate(()=>{stopPlay();st.play.e=10;ghost.cameraState=null;drawAll();});
    await p.cdp.send('HeapProfiler.collectGarbage');const f=await fixed(p);
    if(!/NVIDIA/i.test(f.renderer)||/SwiftShader|llvmpipe|software/i.test(f.renderer)||f.buffer[0]!==c.width||f.buffer[1]!==c.height||f.ratio!==1)throw Error('Invalid physical renderer or resolution');
    const processBefore=await system.send('SystemInfo.getProcessInfo'),pageBefore=await p.cdp.send('Performance.getMetrics'),gpuSamples=[await gpu()];
    if(profile){await p.cdp.send('Profiler.enable');await p.cdp.send('Profiler.setSamplingInterval',{interval:1000});await p.cdp.send('Profiler.start');}
    await p.evaluate(profile=>{
     window.v9={times:[],ticks:[],tickCpu:[],renderCpu:[],gpu:[],draws:[],triangles:[],offTickRenders:0,inTick:false,originalTick:tick,originalRender:GhostDirector.render,originalPoll:GhostMetrics.poll};
     tick=function(now){const a=performance.now();v9.ticks.push(now);v9.inTick=true;try{return v9.originalTick(now);}finally{v9.inTick=false;v9.tickCpu.push(performance.now()-a);}};
     GhostDirector.render=function(){const a=performance.now(),r=v9.originalRender.call(this);if(v9.inTick){v9.renderCpu.push(performance.now()-a);v9.times.push(performance.now());v9.draws.push(ghost3d.renderer.info.render.calls);v9.triangles.push(ghost3d.renderer.info.render.triangles);}else v9.offTickRenders++;return r;};
     GhostMetrics.poll=function(){const n=this.pending.length;v9.originalPoll.call(this);if(this.pending.length<n&&Number.isFinite(this.gpuMs))v9.gpu.push(this.gpuMs);};
     v9.functions={};v9.patches=[];
     if(profile){const wrap=(parent,key,label)=>{if(typeof parent?.[key]!=='function')return;const original=parent[key],s=v9.functions[label]={calls:0,totalMs:0,maxMs:0};v9.patches.push([parent,key,original]);parent[key]=function(){const t=performance.now();try{return original.apply(this,arguments);}finally{const dt=performance.now()-t;s.calls++;s.totalMs+=dt;s.maxMs=Math.max(s.maxMs,dt);}};};
      for(const key of ['ghostSurfacePose','ghostVehicleMotion','ghostFitVisualTyres','ghostApplyVehicleMotion'])wrap(window,key,key);wrap(CameraCollision,'closest','CameraCollision.closest');wrap(ghost3d.vehicleRoad,'height','renderedAsphalt.height');}
     v9.start=performance.now();startPlay();
    },profile);
    const wallStart=Date.now();
    for(let k=1;k<windowSeconds;k++){await sleep(Math.max(0,wallStart+k*1000-Date.now()));gpuSamples.push(await gpu());}
    await sleep(Math.max(0,wallStart+windowSeconds*1000-Date.now()));
    const timing=await p.evaluate(()=>{const end=performance.now();stopPlay();tick=v9.originalTick;GhostDirector.render=v9.originalRender;GhostMetrics.poll=v9.originalPoll;
     const stat=a=>{a=a.slice().sort((a,b)=>a-b);const q=p=>a.length?a[Math.min(a.length-1,Math.floor(a.length*p))]:null;return{count:a.length,mean:a.length?a.reduce((n,v)=>n+v,0)/a.length:null,p50:q(.5),p95:q(.95),max:q(1)};};
     for(const [parent,key,original]of v9.patches)parent[key]=original;
     const counted=countFrameWindow(v9.start,end,v9.ticks,v9.times),{intervals,...frameCount}=counted;return {...frameCount,offTickRenders:v9.offTickRenders,frameMs:stat(intervals),tickCpuMs:stat(v9.tickCpu),renderSubmissionMs:stat(v9.renderCpu),gpuCompletedQueryMs:stat(v9.gpu),drawCalls:stat(v9.draws),triangles:stat(v9.triangles),functions:v9.functions,time:st.play.e};});
    if(profile){const cpuProfile=await p.cdp.send('Profiler.stop'),file=path.join(path.dirname(out),'cpu-profiles',version+'-'+c.camera+'.cpuprofile.json.gz');fs.mkdirSync(path.dirname(file),{recursive:true});fs.writeFileSync(file,require('node:zlib').gzipSync(JSON.stringify(cpuProfile.profile)));timing.cpuProfileFile=file;}
    const processAfter=await system.send('SystemInfo.getProcessInfo'),pageAfter=await p.cdp.send('Performance.getMetrics');
    const prev=new Map(processBefore.processInfo.map(p=>[p.id,p.cpuTime]));const cpuSeconds=processAfter.processInfo.reduce((n,p)=>n+Math.max(0,p.cpuTime-(prev.get(p.id)??p.cpuTime)),0),metric=(m,k)=>m.metrics.find(v=>v.name===k)?.value??0;
    const cpu={allBrowserProcessesOneCorePercent:cpuSeconds/(timing.observedMs/1000)*100,allBrowserProcessesMachinePercent:cpuSeconds/(timing.observedMs/1000)*100/result.logicalCpuCount,pageTaskPercent:(metric(pageAfter,'TaskDuration')-metric(pageBefore,'TaskDuration'))/(timing.observedMs/1000)*100,jsHeapBefore:metric(pageBefore,'JSHeapUsedSize'),jsHeapAfter:metric(pageAfter,'JSHeapUsedSize')};
    const processControlAfter=await control(system,false);
    const row={...c,version,repeat,session:result.sessions.length-1,warmupSeconds:windowWarmup,measurementSeconds:windowSeconds,windowPower,wallMs:Date.now()-wallStart,fixed:f,timing,cpu,gpuSamples,processControl,processControlAfter,after:await fixed(p),errors:p.errors.slice()};result.rows.push(row);save();console.log(JSON.stringify({done:result.rows.length,total:scenarios.length*repeats*versions.length,key:c.key,version,repeat,fps:timing.fps,p95:timing.frameMs.p95,gpu:gpuSamples.at(-1)}));
    if(p.errors.length||timing.frames<120||timing.frames!==timing.uniqueRaf||Math.abs(timing.time-(10+windowSeconds))>.25||gpuSamples.some(g=>g.uuid!==result.gpuBefore.uuid||g.driver!==result.gpuBefore.driver)||processControlAfter.processes.some(p=>p.error||p.affinityAfter!==processControlAfter.selectedAffinity||(p.afterControl&5)!==5||(p.afterState&5)!==0))throw Error('Invalid window');
   }
  }
  result.completedAt=new Date().toISOString();result.powerAfter=await power();if(result.powerAfter.acLineStatus!==1||result.powerAfter.powerSaving!==0||result.powerAfter.scheme!==result.powerBefore.scheme)throw Error('Power state changed');
 }catch(e){result.blockers.push(e.stack||e.message);process.exitCode=1;console.error(e);}
 finally{result.gpuAfter=await gpu().catch(e=>({error:e.message}));save();await browser?.close();for(const server of servers)server.kill();}
})().catch(e=>{result.blockers.push(e.stack||e.message);save();console.error(e);process.exitCode=1;});
