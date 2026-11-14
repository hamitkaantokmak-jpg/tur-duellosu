// Real application captures, matching V8 and the frozen V9 candidate. No image editing.
const {chromium}=require('@playwright/test'),fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto'),{spawn}=require('node:child_process');
const out='docs/visual/v9-nvidia',records={},servers=[];
const frames=[
 {name:'spa-eau-rouge',event:'Belgian Grand Prix',station:915},
 {name:'spa-raidillon',event:'Belgian Grand Prix',station:1075},
 {name:'spa-crest',event:'Belgian Grand Prix',station:1154},
 {name:'spa-cockpit',event:'Belgian Grand Prix',station:1075,mode:'cockpit'},
 {name:'cota-t1-approach',event:'United States Grand Prix',station:180},
 {name:'cota-t1-crest',event:'United States Grand Prix',station:350},
 {name:'cota-t1-descent',event:'United States Grand Prix',station:520},
 {name:'cota-cockpit',event:'United States Grand Prix',station:180,mode:'cockpit'},
 {name:'mexico-braking',event:'Mexico City Grand Prix',time:13.375},
 {name:'mexico-corner',event:'Mexico City Grand Prix',time:74.875},
 ...['low','medium','high'].map(lod=>({name:'mexico-lod-'+lod,event:'Mexico City Grand Prix',time:50,lod}))
];
const wait=ms=>new Promise(r=>setTimeout(r,ms));
(async()=>{let browser;try{
 fs.mkdirSync(out,{recursive:true});
 browser=await chromium.launch({executablePath:process.env.CHROMIUM_PATH,args:['--no-sandbox']});
 for(const [i,version]of ['before','after'].entries()){
  const port=4398+i,root=path.resolve('work/v9-versions',version==='before'?'v8':'v9');servers.push(spawn(process.execPath,[path.resolve('scripts/serve.cjs'),String(port),root],{windowsHide:true,stdio:'ignore'}));
  for(let n=0;n<100;n++){try{if((await fetch('http://127.0.0.1:'+port)).ok)break;}catch{}await wait(100);}
  const p=await browser.newPage({viewport:{width:1440,height:1000},deviceScaleFactor:1}),errors=[];p.on('pageerror',e=>errors.push(e.message));
  fs.mkdirSync(path.join(out,version),{recursive:true});records[version]=[];let event='';
  for(const frame of frames){
   if(event!==frame.event){await p.goto('about:blank');await p.goto('http://127.0.0.1:'+port+'/#y=2024&e='+encodeURIComponent(frame.event)+'&k=Q&a=HAM&b=RUS&g=1');await p.waitForFunction(()=>typeof ghost3d!=='undefined'&&ghost3d.ready&&VisualAssets.state==='ready'&&ghost3d.cars.every(c=>c.userData.asset),null,{timeout:120000});await p.locator('#ghostRenderQuality').selectOption('ultra');await p.waitForFunction(()=>!!VisualAssets.templates.high&&!VisualAssets.highPending,null,{timeout:60000});await p.locator('#ghostAdaptive').uncheck();await p.locator('#ghostTransparent').uncheck();event=frame.event;}
   const record=await p.evaluate(async f=>{
    stopPlay();const S=ghostBuild(),G=ghost3d,T=G.T,surface=ghostTopography(S);let time=f.time;
    if(f.station!==undefined){let best=Infinity;for(let t=0;t<st.A.total;t+=.025){const p=ghostReplayPoses(S,t)[0],d=ghostSurfacePose(S,p,0,t).station,e=Math.min(Math.abs(d-f.station),surface.length-Math.abs(d-f.station));if(e<best){best=e;time=t;}}}
    st.play.e=time;ghost.camera=f.mode||'free';ghost.cameraState=null;GhostDirector.transition=null;
    const p=ghostReplayPoses(S,time)[0],support=ghostSurfacePose(S,p,0,time),q=TrackTopography.orientation(T,support.normal,p.fx,p.fz);
    if(!f.mode){const v=new T.Vector3(0,.48,0).applyQuaternion(q);ghostOrbit.target=[p.x+v.x,support.y+v.y,p.z+v.z];ghostOrbit.yaw=Math.atan2(p.fx,p.fz)+.8;ghostOrbit.pitch=.21;ghostOrbit.distance=7.2;}
    drawAll();if(f.lod){for(const car of G.cars)for(const [name,o]of Object.entries(car.userData.levels))o.visible=name===f.lod;G.renderer.info.reset();GhostDirector.render();}
    G.world.updateMatrixWorld(true);const road=G.world.getObjectByName('TopographyRoad'),ray=new T.Raycaster(),contacts=[];
    for(const car of G.cars)for(const fit of car.userData.tyreFit.groups){const c=fit.contact,v=new T.Vector3(c.x,c.y+fit.lift,c.z).applyMatrix4(car.matrixWorld);ray.set(new T.Vector3(v.x,v.y+100,v.z),new T.Vector3(0,-1,0));const hit=ray.intersectObject(road,false)[0];contacts.push(hit?v.y-hit.point.y:null);}
    const gl=G.renderer.getContext(),ext=gl.getExtension('WEBGL_debug_renderer_info'),digest=async a=>Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256',a))).map(v=>v.toString(16).padStart(2,'0')).join('');
    return {frame:f,time,pose:p,support,camera:G.camera.position.toArray(),sun:G.sun.position.toArray(),exposure:G.renderer.toneMappingExposure,motion:{...ghostVehicleMotion(S,0,time)},contacts,roadPositionSha256:await digest(road.geometry.attributes.position.array),activeLod:Object.entries(G.cars[0].userData.levels).filter(([,o])=>o.visible).map(([k])=>k),forcedLod:f.lod||null,quality:G.quality,buffer:[G.canvas.width,G.canvas.height],calls:G.renderer.info.render.calls,triangles:G.renderer.info.render.triangles,renderer:ext?gl.getParameter(ext.UNMASKED_RENDERER_WEBGL):gl.getParameter(gl.RENDERER),scenery:$('ghostScenery').textContent,totals:[st.A.total,st.B.total]};
   },frame);
   if(!/NVIDIA/.test(record.renderer)||record.contacts.some(v=>v===null||v<-.025||v>.025))throw Error('GPU/contact visual capture failure '+frame.name);
   const file=path.join(out,version,frame.name+'.png');await p.locator('.ghost-stage').screenshot({path:file});record.file=file;record.pngSha256=crypto.createHash('sha256').update(fs.readFileSync(file)).digest('hex');records[version].push(record);
  }
  if(errors.length)throw Error(JSON.stringify(errors));await p.close();
 }
 const pairs=records.before.map((a,i)=>{const b=records.after[i],keys=['time','pose','camera','sun','exposure','motion','roadPositionSha256','activeLod','quality','buffer','calls','triangles','scenery'];return{name:a.frame.name,same:Object.fromEntries(keys.map(k=>[k,JSON.stringify(a[k])===JSON.stringify(b[k])])),pngByteIdentical:a.pngSha256===b.pngSha256};});
 if(pairs.some(p=>Object.values(p.same).some(v=>!v)))throw Error('Mismatched capture conditions');
 fs.writeFileSync(path.join(out,'captures.json'),JSON.stringify({browser:browser.version(),beforeCommit:'ad35d61f5b26ed1d5ff6d82a3ee43b91478cee94',afterCommit:'12b85328235b095d2362a44e058cc28ec023d302',viewport:[1440,1000],records,pairs},null,2)+'\n');console.log(JSON.stringify({pairs:pairs.length,pngByteIdentical:pairs.filter(p=>p.pngByteIdentical).length}));
 }finally{await browser?.close();for(const s of servers)s.kill();}
})().catch(e=>{console.error(e);process.exitCode=1;});
