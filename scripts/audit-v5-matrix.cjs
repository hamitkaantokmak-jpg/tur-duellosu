// Same GPU, sequential cells, fixed 1:1 render pixels, actual wall-clock replay.
// Main has no synthetic surface/cockpit. Its cockpit-only view shim is disclosed
// in each row; no V5 surface or vehicle code is installed into the baseline.
const {chromium}=require('@playwright/test'),fs=require('node:fs'),path=require('node:path');
const fixture=require('../tests/fixtures/synthetic-topography.cjs');
const out=process.argv[2]||'docs/performance/v5-audit/matrix.json';
const seconds=Number(process.env.AUDIT_SECONDS||12),uncapped=process.env.AUDIT_UNCAPPED!=='0',filter=process.env.AUDIT_FILTER?new RegExp(process.env.AUDIT_FILTER):null;
const baseline=process.env.AUDIT_BASELINE||'http://127.0.0.1:4202',candidate=process.env.AUDIT_CANDIDATE||'http://127.0.0.1:4201';
async function metrics(page){return page.evaluate(()=>{
 const G=ghost3d,geometries=new Set(),textures=new Set(),arrays=new Set();
 G.world.traverse(o=>{if(o.geometry)geometries.add(o.geometry);for(const m of o.material?(Array.isArray(o.material)?o.material:[o.material]):[])for(const v of Object.values(m))if(v?.isTexture)textures.add(v);});
 for(const t of [G.scene.background,G.scene.environment,G.sun.shadow.map?.texture])if(t?.isTexture)textures.add(t);
 for(const g of geometries){for(const a of Object.values(g.attributes))arrays.add(a.isInterleavedBufferAttribute?a.data.array:a.array);if(g.index)arrays.add(g.index.array);}
 let textureBytes=0;
 for(const t of textures){
  if(t.isCompressedTexture){textureBytes+=(t.mipmaps||[]).reduce((n,m)=>n+(m.data?.byteLength||0),0);continue;}
  const images=Array.isArray(t.image)?t.image:[t.image];
  for(const im of images){if(!im)continue;const channels=t.format===G.T.RedFormat?1:t.format===G.T.RGFormat?2:4,bytes=t.type===G.T.FloatType?4:t.type===G.T.HalfFloatType?2:1;textureBytes+=im.data?.byteLength||(im.width||0)*(im.height||0)*channels*bytes*(t.generateMipmaps?4/3:1);}
 }
 const gl=G.renderer.getContext(),ext=gl.getExtension('WEBGL_debug_renderer_info');
 return {renderer:ext?gl.getParameter(ext.UNMASKED_RENDERER_WEBGL):gl.getParameter(gl.RENDERER),buffer:[G.canvas.width,G.canvas.height],drawCalls:G.renderer.info.render.calls,triangles:G.renderer.info.render.triangles,residentCounts:{...G.renderer.info.memory},sceneGeometryBytes:[...arrays].reduce((n,a)=>n+a.byteLength,0),sceneTextureBytesEstimate:Math.round(textureBytes),totals:[st.A.total,st.B.total]};
});}
(async()=>{
 const browser=await chromium.launch({executablePath:process.env.CHROMIUM_PATH||undefined,args:uncapped?['--disable-frame-rate-limit','--disable-gpu-vsync']:[]});
 const rows=[];fs.mkdirSync(path.dirname(out),{recursive:true});
 const save=()=>fs.writeFileSync(out,JSON.stringify({conditions:{seconds,uncappedRequested:uncapped,deviceScaleFactor:1,renderRatio:1,adaptive:false,AO:false,rate:1,viewports:[[1920,1080],[2560,1440]],note:'Byte fields estimate unique scene buffers/texture payloads, not measured VRAM. Main synthetic: unsupported. Main cockpit: view-only benchmark shim.'},rows},null,2));
 try{
  // One page per version/surface/resolution avoids repeated archive requests.
  for(const viewport of [{width:1920,height:1080},{width:2560,height:1440}])for(const surface of ['flat','synthetic'])for(const version of surface==='flat'?['main','v5']:['v5']){
   const page=await browser.newPage({viewport,deviceScaleFactor:1}),errors=[];
   page.on('pageerror',e=>errors.push(e.message));
   await page.addInitScript(({synthetic,fixture})=>{localStorage.setItem('td.disc',JSON.stringify({at:Date.now(),data:{}}));if(synthetic)window.TOPOGRAPHY_TEST_PROFILE=fixture;},{synthetic:surface==='synthetic',fixture});
   await page.goto((version==='main'?baseline:candidate)+(surface==='synthetic'?'/?topographyTest=synthetic':'/')+'#y=2024&e=Mexico%20City%20Grand%20Prix&k=Q&a=HAM&b=RUS&g=1');
   await page.waitForFunction(()=>typeof ghost3d!=='undefined'&&ghost3d.ready&&VisualAssets.state==='ready'&&ghost3d.v4Stats&&ghost3d.cars[0].userData.asset,null,{timeout:120000});
   await page.addStyleTag({content:'.ghost-stage{position:fixed!important;inset:0!important;width:100vw!important;height:100vh!important;z-index:9999!important}.ghost-stage #ghostCanvas,.ghost-stage #ghostWebGL{width:100%!important;height:100%!important;max-height:none!important;min-height:0!important}'});
   await page.evaluate(version=>{stopPlay();$('ghostAdaptive').checked=false;$('ghostAO').checked=false;for(const q of Object.values(GHOST_QUALITY))q.ratio=1;
    if(version==='main'){const original=ghostCameraPose;ghostCameraPose=function(S,poses,aspect){if(ghost.camera!=='cockpit')return original(S,poses,aspect);const A=poses[0];return{camera:[A.x+A.fx*.1,.98,A.z+A.fz*.1],target:[A.x+A.fx*9,.98,A.z+A.fz*9]};};}
   },version);
   for(const quality of ['performance','balanced','ultra']){
    await page.evaluate(q=>{$('ghostRenderQuality').value=q;drawAll();},quality);
    if(quality==='ultra')await page.waitForFunction(()=>!!VisualAssets.templates.high&&!VisualAssets.highPending,null,{timeout:60000});
    for(const camera of ['a','cockpit']){
     if(filter&&!filter.test(viewport.width+'x'+viewport.height+'/'+surface+'/'+quality+'/'+camera))continue;
     await page.evaluate(mode=>{stopPlay();st.play.e=10;ghost.camera=mode;ghost.cameraState=null;GhostDirector.transition=null;drawAll();},camera);
     for(let i=0;i<3;i++){await page.waitForTimeout(100);await page.evaluate(()=>drawAll());}
     const fixed=await metrics(page);
     if(!/NVIDIA/.test(fixed.renderer))throw Error('Physical NVIDIA GPU not verified: '+fixed.renderer);
     if(fixed.buffer[0]!==viewport.width||fixed.buffer[1]!==viewport.height)throw Error('Render buffer does not match requested resolution: '+JSON.stringify(fixed));
     await page.evaluate(()=>{window.auditIntervals=[];window.auditRecord=GhostMetrics.record;GhostMetrics.record=function(ms){window.auditIntervals.push(ms);window.auditRecord.call(this,ms);};st.play.rate=1;startPlay();});
     const start=Date.now();await page.waitForTimeout(seconds*1000);
     const timing=await page.evaluate(()=>{stopPlay();GhostMetrics.record=window.auditRecord;const a=window.auditIntervals.slice().sort((a,b)=>a-b),sum=a.reduce((x,y)=>x+y,0);return{frames:a.length,meanFps:a.length*1000/sum,p95Ms:a[Math.floor(a.length*.95)],p50Ms:a[Math.floor(a.length*.5)],time:st.play.e};});
     rows.push({version,surface,quality,camera,viewport,baselineCameraShim:version==='main'&&camera==='cockpit',fixed,timing,wallMs:Date.now()-start,errors:errors.slice()});save();console.log(JSON.stringify(rows.at(-1)));
     if(errors.length||!Number.isFinite(timing.meanFps))throw Error('Invalid benchmark row');
    }
   }
   await page.close();
  }
 }finally{save();await browser.close();}
})().catch(e=>{console.error(e);process.exitCode=1;});
