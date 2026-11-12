// Real-telemetry CPU workload, with GPU work drained BEFORE timing. Not an FPS test.
const fs=require('node:fs'),path=require('node:path'),{spawn,execFileSync}=require('node:child_process'),{chromium}=require('@playwright/test');
const order=['v5','v6','v61','v61','v6','v5'];
const roots={v5:process.env.V61_V5_ROOT,v6:process.env.V61_BEFORE_ROOT,v61:process.env.V61_AFTER_ROOT||process.cwd()},out=process.env.V61_CPU_OUT||'docs/performance/v6-1/cpu-rays.json';
(async()=>{const rows=[],servers=[],provenance={};let browser;const save=()=>{fs.mkdirSync(path.dirname(out),{recursive:true});fs.writeFileSync(out,JSON.stringify({classification:'CPU-only real-scene work; cloud CPU and SwiftShader setup, not NVIDIA acceptance',samples:1200,warmup:400,versions:['v5','v6','v61'],order,provenance,rows},null,2)+'\n');};
 try{
  browser=await chromium.launch({executablePath:process.env.CHROMIUM_PATH||(process.platform==='linux'?'/usr/bin/chromium':undefined),args:['--no-sandbox','--use-angle=swiftshader','--enable-unsafe-swiftshader',...(process.env.CHROMIUM_PROXY_SPKI?['--ignore-certificate-errors-spki-list='+process.env.CHROMIUM_PROXY_SPKI]:[])]});
  for(const [j,version]of order.entries()){
   if(!roots[version])throw Error('Set V61_V5_ROOT and V61_BEFORE_ROOT');const root=path.resolve(roots[version]),port=4390+j;provenance[version]={commit:execFileSync('git',['rev-parse','HEAD'],{cwd:root,encoding:'utf8'}).trim(),runtimeSha256:Object.fromEntries(['index.html','src/ghost-topography.js','src/ghost-webgl.js','src/barrier-batching.js'].map(file=>[file,fs.existsSync(path.join(root,file))?require('node:crypto').createHash('sha256').update(fs.readFileSync(path.join(root,file))).digest('hex'):null]))};servers.push(spawn(process.execPath,[path.join(root,'scripts/serve.cjs'),String(port),root],{stdio:'ignore'}));
   for(let i=0;i<100;i++){try{if((await fetch('http://127.0.0.1:'+port)).ok)break;}catch{}await new Promise(r=>setTimeout(r,100));}
   for(const [track,event]of [['cota','United States Grand Prix'],['spa','Belgian Grand Prix']]){
    const p=await browser.newPage({viewport:{width:800,height:600}});await p.addInitScript(()=>localStorage.setItem('td.disc',JSON.stringify({at:Date.now(),data:{}})));
    await p.goto('http://127.0.0.1:'+port+'/#y=2024&e='+encodeURIComponent(event)+'&k=Q&a=HAM&b=RUS&g=1');await p.evaluate(()=>{$('ghostRenderQuality').value='performance';$('ghostAdaptive').checked=false;if(st.A)drawAll();});
    await p.waitForFunction(()=>typeof ghost3d!=='undefined'&&ghost3d.ready&&VisualAssets.state==='ready'&&ghost3d.cars.every(c=>c.userData.asset),null,{timeout:120000});
    await p.evaluate(()=>{stopPlay();$('ghostRenderQuality').value='performance';ghost.camera='a';st.play.e=10;drawAll();ghost3d.world.updateMatrixWorld(true);ghost3d.renderer.getContext().finish();});
    const data=await p.evaluate(()=>{
     const S=ghostBuild(),G=ghost3d,T=G.T,total=Math.max(st.A.total,st.B.total),N=400,support=[],orientation=[],matrices=[],collision=[],outputs=[],quaternions=[new T.Quaternion(),new T.Quaternion()];
     const one=(i,record)=>{const time=(i%N)/N*total,poses=ghostReplayPoses(S,time);st.play.e=time;
      let t=performance.now();const a=ghostSurfacePose(S,poses[0],0,time),b=ghostSurfacePose(S,poses[1],1,time);ghostSurfacePose(S,poses[0],0,time);ghostSurfacePose(S,poses[1],1,time);const supportMs=performance.now()-t;
      t=performance.now();TrackTopography.orientation(T,a.normal,poses[0].fx,poses[0].fz,quaternions[0]);TrackTopography.orientation(T,b.normal,poses[1].fx,poses[1].fz,quaternions[1]);const orientationMs=performance.now()-t;
      for(let j=0;j<2;j++){G.cars[j].quaternion.copy(quaternions[j]);G.cars[j].position.set(poses[j].x,j?b.y:a.y,poses[j].z);}t=performance.now();G.scene.updateMatrixWorld(true);const matrixMs=performance.now()-t;
      const p=poses[0],camera=[p.x-p.fx*14,a.y+3.3,p.z-p.fz*14],target=[p.x,a.y+.65,p.z];t=performance.now();const hit=ghostAvoidObstacles(camera,target),collisionMs=performance.now()-t;
      if(record){support.push(supportMs);orientation.push(orientationMs);matrices.push(matrixMs);collision.push(collisionMs);outputs.push({camera:hit,support:[a.y,a.normal.x,a.normal.y,a.normal.z,b.y,b.normal.x,b.normal.y,b.normal.z]});}
     };
     for(let i=0;i<N;i++)one(i,false);for(let i=0;i<N*3;i++)one(i,true);
     const stats=a=>{a.sort((a,b)=>a-b);return{n:a.length,totalMs:a.reduce((a,b)=>a+b,0),p50Ms:a[Math.floor(a.length*.5)],p95Ms:a[Math.floor(a.length*.95)],maxMs:a.at(-1)};};
     return{telemetry:JSON.stringify([st.A,st.B].map(L=>({total:L.total,...Object.fromEntries(['t','v','thr','brk','gear','rpm'].map(k=>[k,Array.from(L[k])])),sourceTime:Array.from(L.source.t),sourceDistance:Array.from(L.source.rel)}))),supportFourCallsPerFrame:stats(support),orientationTwoCallsPerFrame:stats(orientation),sceneMatrixUpdate:stats(matrices),collision:stats(collision),outputs,barrierMeshes:G.world.children.filter(o=>o.userData.cameraObstacle).length,category:G.surface.metadata.category};
    });data.telemetrySha256=require('node:crypto').createHash('sha256').update(data.telemetry).digest('hex');delete data.telemetry;rows.push({version,run:j,track,...data});save();console.log(JSON.stringify({version,track,support:data.supportFourCallsPerFrame,orientation:data.orientationTwoCallsPerFrame,collision:data.collision}));await p.close();
   }
  }
  for(const track of ['cota','spa']){const all=rows.filter(r=>r.track===track);if(new Set(all.map(r=>r.telemetrySha256)).size!==1)throw Error('Telemetry input differs across versions');for(const a of all.filter(r=>r.version==='v6')){let max=0;const candidates=all.filter(r=>r.version==='v61');for(const b of candidates)for(let i=0;i<a.outputs.length;i++)for(const k of ['camera','support'])for(let j=0;j<a.outputs[i][k].length;j++)max=Math.max(max,Math.abs(a.outputs[i][k][j]-b.outputs[i][k][j]));a.exactComparisonWithV61={samples:a.outputs.length,candidateWindows:candidates.length,maxCoordinateDifference:max};if(max>1e-7)throw Error('V6/V6.1 camera/support mismatch: '+max);}}save();
 }finally{await browser?.close();for(const s of servers)s.kill();}
})().catch(e=>{console.error(e);process.exitCode=1;});
