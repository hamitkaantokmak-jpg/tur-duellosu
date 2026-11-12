// Comparable sequences from the real app; no synthetic rendering or image edits.
const {chromium}=require('@playwright/test'),fs=require('node:fs'),path=require('node:path');
const out='docs/visual/v8',urls={after:process.argv[2]||'http://127.0.0.1:4380',before:process.argv[3]||'http://127.0.0.1:4381'};
(async()=>{
 const browser=await chromium.launch({executablePath:process.env.CHROMIUM_PATH,args:['--no-sandbox']});
 const plan=[],results={};
 try{
 for(const version of ['after','before']){
  const page=await browser.newPage({viewport:{width:1440,height:1000},deviceScaleFactor:1}),errors=[];page.on('pageerror',e=>errors.push(e.message));
  const records=[];fs.mkdirSync(path.join(out,version),{recursive:true});
  for(const [id,event]of [['mexico','Mexico City Grand Prix'],['cota','United States Grand Prix'],['spa','Belgian Grand Prix']]){
   await page.goto('about:blank');await page.goto(urls[version]+'/#y=2024&e='+encodeURIComponent(event)+'&k=Q&a=HAM&b=RUS&g=1');
   await page.waitForFunction(()=>typeof ghost3d!=='undefined'&&ghost3d.ready&&VisualAssets.state==='ready'&&ghost3d.cars.every(c=>c.userData.asset),null,{timeout:120000});
   await page.locator('#ghostRenderQuality').selectOption('ultra');await page.waitForFunction(()=>!!VisualAssets.templates.high&&!VisualAssets.highPending,null,{timeout:60000});
   await page.locator('#ghostAdaptive').uncheck();await page.locator('#ghostTransparent').uncheck();
   if(version==='after'){
    const chosen=await page.evaluate(id=>{
     stopPlay();const S=ghostBuild(),list=[];
     if(id==='mexico')for(const [name,key,sign]of [['braking','pitch',1],['acceleration','pitch',-1],['corner','roll',1]]){
      let best=-Infinity,time=1;for(let t=1;t<st.A.total-1;t+=.025){const m=ghostVehicleMotion(S,0,t),v=key==='roll'?Math.abs(m[key]):m[key]*sign;if(v>best){best=v;time=t;}}
      list.push({id,name,time,mode:'free'});
     }
     else{let best=Infinity,time=0;const surface=ghostTopography(S),station=id==='cota'?180:1075;for(let t=0;t<st.A.total;t+=.025){const p=ghostReplayPoses(S,t)[0],d=ghostSurfacePose(S,p,0,t).station,e=Math.min(Math.abs(d-station),surface.length-Math.abs(d-station));if(e<best){best=e;time=t;}}list.push({id,name:'grade',time,mode:'free'},{id,name:'cockpit',time,mode:'cockpit'},{id,name:'follow',time,mode:'a'});}
     return list;
    },id);plan.push(...chosen);
   }
   for(const scene of plan.filter(p=>p.id===id))for(const [frame,offset]of [[0,-.25],[1,0],[2,.25]]){
    const record=await page.evaluate(({scene,offset})=>{
     stopPlay();const S=ghostBuild(),G=ghost3d,T=G.T,t=scene.time+offset;st.play.e=t;ghost.camera=scene.mode;ghost.cameraState=null;GhostDirector.transition=null;
     const p=ghostReplayPoses(S,t)[0],support=ghostSurfacePose(S,p,0,t),q=TrackTopography.orientation(T,support.normal,p.fx,p.fz);
     if(scene.mode==='free'){const v=new T.Vector3(0,.43,0).applyQuaternion(q);ghostOrbit.target=[p.x+v.x,support.y+v.y,p.z+v.z];ghostOrbit.yaw=Math.atan2(p.fx,p.fz)+Math.PI/2;ghostOrbit.pitch=.12;ghostOrbit.distance=6.2;}
     drawAll();const gl=G.renderer.getContext(),ext=gl.getExtension('WEBGL_debug_renderer_info');
     return {sun:G.sun.position.toArray(),exposure:G.renderer.toneMappingExposure,tyreLifts:G.cars[0].userData.tyreFit?.groups.map(f=>f.lift)||null,roadMisses:G.vehicleRoad?.misses??null,time:t,pose:p,support,camera:G.camera.position.toArray(),target:ghostOrbit.target,projection:G.camera.projectionMatrix.toArray(),motion:typeof ghostVehicleMotion==='function'?{...ghostVehicleMotion(S,0,t)}:null,quality:$('ghostRenderQuality').value,renderer:ext?gl.getParameter(ext.UNMASKED_RENDERER_WEBGL):gl.getParameter(gl.RENDERER),buffer:G.renderer.getDrawingBufferSize(new T.Vector2()).toArray(),calls:G.renderer.info.render.calls,triangles:G.renderer.info.render.triangles};
    },{scene,offset});
    const file=scene.id+'-'+scene.name+'-'+frame+'.jpg';await page.locator('.ghost-stage').screenshot({path:path.join(out,version,file),type:'jpeg',quality:85});records.push({file,scene,...record});
   }
  }
  if(errors.length)throw Error(JSON.stringify(errors));results[version]={browser:browser.version(),records,errors};await page.close();
 }
 for(let i=0;i<results.after.records.length;i++){
  const a=results.after.records[i],b=results.before.records[i];
  if(JSON.stringify(a.pose)!==JSON.stringify(b.pose)||JSON.stringify(a.camera)!==JSON.stringify(b.camera)||JSON.stringify(a.sun)!==JSON.stringify(b.sun)||a.exposure!==b.exposure)throw Error('Unmatched pose/camera '+a.file);
 }
 fs.writeFileSync(path.join(out,'sequences.json'),JSON.stringify({plan,results},null,2));
 console.log('Matched actual sequences:',results.after.records.length,'frames per version');
 }finally{await browser.close();}
})().catch(e=>{console.error(e);process.exitCode=1;});
