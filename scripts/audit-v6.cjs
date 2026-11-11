// Sequential physical-GPU comparison. Old V5 and V6 both have a cockpit camera.
const {chromium}=require('@playwright/test'),fs=require('node:fs'),path=require('node:path');
const out=process.argv[2]||'docs/performance/v6/matrix.json',seconds=Number(process.env.AUDIT_SECONDS||12),warmup=Number(process.env.AUDIT_WARMUP_SECONDS||20);
const filter=process.env.AUDIT_FILTER?new RegExp(process.env.AUDIT_FILTER):null;
const versions=(process.env.AUDIT_VERSION_ORDER||'v5,v6').split(','),rows=[];
const tracks=[['mexico','Mexico City Grand Prix'],['cota','United States Grand Prix'],['spa','Belgian Grand Prix']];
async function metrics(page){return page.evaluate(()=>{
 const G=ghost3d,gl=G.renderer.getContext(),ext=gl.getExtension('WEBGL_debug_renderer_info'),geometries=new Set(),textures=new Set(),arrays=new Set();
 G.world.traverse(o=>{if(o.geometry)geometries.add(o.geometry);for(const m of o.material?(Array.isArray(o.material)?o.material:[o.material]):[])for(const v of Object.values(m))if(v?.isTexture)textures.add(v);});
 for(const t of [G.scene.background,G.scene.environment,G.sun.shadow.map?.texture])if(t?.isTexture)textures.add(t);
 for(const g of geometries){for(const a of Object.values(g.attributes))arrays.add(a.isInterleavedBufferAttribute?a.data.array:a.array);if(g.index)arrays.add(g.index.array);}
 let textureBytes=0;for(const t of textures){if(t.isCompressedTexture){textureBytes+=(t.mipmaps||[]).reduce((n,m)=>n+(m.data?.byteLength||0),0);continue;}for(const im of Array.isArray(t.image)?t.image:[t.image])if(im){const c=t.format===G.T.RedFormat?1:t.format===G.T.RGFormat?2:4,b=t.type===G.T.FloatType?4:t.type===G.T.HalfFloatType?2:1;textureBytes+=im.data?.byteLength||(im.width||0)*(im.height||0)*c*b*(t.generateMipmaps?4/3:1);}}
 return {renderer:ext?gl.getParameter(ext.UNMASKED_RENDERER_WEBGL):gl.getParameter(gl.RENDERER),buffer:[G.canvas.width,G.canvas.height],drawCalls:G.renderer.info.render.calls,triangles:G.renderer.info.render.triangles,residentCounts:{...G.renderer.info.memory},sceneGeometryBytes:[...arrays].reduce((n,a)=>n+a.byteLength,0),sceneTextureBytesEstimate:Math.round(textureBytes),category:G.surface.metadata.category,totals:[st.A.total,st.B.total]};
 });}
(async()=>{
 fs.mkdirSync(path.dirname(out),{recursive:true});
 const conditions={seconds,warmup,versions,uncappedRequested:true,deviceScaleFactor:1,renderRatio:1,adaptive:false,AO:false,rate:1,note:'V5 COTA/Spa use their original normalized XY and flat elevation. V6 uses geographic XY and derived terrain: end-user workload comparison, not identical meshes. Byte fields estimate CPU scene buffer/texture storage, not measured VRAM. No camera shim.'};
 const save=()=>fs.writeFileSync(out,JSON.stringify({conditions,rows},null,2));
 const browser=await chromium.launch({executablePath:process.env.CHROMIUM_PATH,args:['--disable-frame-rate-limit','--disable-gpu-vsync']});
 conditions.browser=browser.version();conditions.node=process.version;
 try{
 for(const [id,event]of tracks)for(const viewport of [{width:1920,height:1080},{width:2560,height:1440}])for(const version of versions){
  if(filter&&!['performance','ultra'].some(q=>['a','cockpit'].some(c=>filter.test(`${id}/${viewport.width}/${q}/${c}`))))continue;
  const p=await browser.newPage({viewport,deviceScaleFactor:1}),errors=[];p.on('pageerror',e=>errors.push(e.message));
  await p.addInitScript(()=>localStorage.setItem('td.disc',JSON.stringify({at:Date.now(),data:{}})));
  await p.goto((version==='v5'?(process.env.AUDIT_BASELINE||'http://127.0.0.1:4302'):(process.env.AUDIT_CANDIDATE||'http://127.0.0.1:4301'))+'/#y=2024&e='+encodeURIComponent(event)+'&k=Q&a=HAM&b=RUS&g=1');
  await p.waitForFunction(()=>typeof ghost3d!=='undefined'&&ghost3d.ready&&VisualAssets.state==='ready'&&ghost3d.cars.every(c=>c.userData.asset),null,{timeout:120000});
  await p.addStyleTag({content:'.ghost-stage{position:fixed!important;inset:0!important;width:100vw!important;height:100vh!important;z-index:9999!important}.ghost-stage #ghostCanvas,.ghost-stage #ghostWebGL{width:100%!important;height:100%!important;max-height:none!important;min-height:0!important}'});
  await p.evaluate(()=>{stopPlay();$('ghostAdaptive').checked=false;$('ghostAO').checked=false;$('ghostElevation').checked=false;for(const q of Object.values(GHOST_QUALITY))q.ratio=1;});
  for(const quality of ['performance','ultra']){
   await p.evaluate(q=>{$('ghostRenderQuality').value=q;drawAll();},quality);
   if(quality==='ultra')await p.waitForFunction(()=>!!VisualAssets.templates.high&&!VisualAssets.highPending,null,{timeout:60000});
   for(const camera of ['a','cockpit']){
    if(filter&&!filter.test(`${id}/${viewport.width}/${quality}/${camera}`))continue;
    await p.evaluate(mode=>{stopPlay();st.play.e=10;ghost.camera=mode;ghost.cameraState=null;GhostDirector.transition=null;drawAll();st.play.rate=1;startPlay();},camera);
    await p.waitForTimeout(warmup*1000);
    await p.evaluate(()=>{stopPlay();st.play.e=10;ghost.cameraState=null;drawAll();});
    const fixed=await metrics(p);if(!/NVIDIA/.test(fixed.renderer))throw Error('Physical GPU not verified');if(fixed.buffer[0]!==viewport.width||fixed.buffer[1]!==viewport.height)throw Error('Wrong render size');
    await p.evaluate(()=>{window.auditIntervals=[];window.auditOriginal=GhostMetrics.record;GhostMetrics.record=function(ms){auditIntervals.push(ms);auditOriginal.call(this,ms);};startPlay();});
    const start=Date.now();await p.waitForTimeout(seconds*1000);
    const timing=await p.evaluate(()=>{stopPlay();GhostMetrics.record=auditOriginal;const a=auditIntervals.slice().sort((a,b)=>a-b),sum=a.reduce((x,y)=>x+y,0);return {frames:a.length,meanFps:a.length*1000/sum,p95Ms:a[Math.floor(a.length*.95)],p50Ms:a[Math.floor(a.length*.5)],time:st.play.e};});
    rows.push({track:id,version,quality,camera,viewport,fixed,timing,wallMs:Date.now()-start,errors:errors.slice()});save();console.log(JSON.stringify(rows.at(-1)));
    if(errors.length||!Number.isFinite(timing.meanFps))throw Error('Invalid measurement');
   }
  }
  await p.close();
 }
 }finally{save();await browser.close();}
})().catch(e=>{console.error(e);process.exitCode=1;});
