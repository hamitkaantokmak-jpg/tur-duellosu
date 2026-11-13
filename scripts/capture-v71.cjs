// Actual application captures. No alternate model viewer or image synthesis.
const {chromium}=require('@playwright/test'),fs=require('node:fs'),path=require('node:path');
const {inspectNearPlane}=require('../tests/helpers/camera-near-plane.cjs');
const base=process.argv[2]||'http://127.0.0.1:4392',out=process.argv[3]||'docs/visual/v71/after';
(async()=>{
 fs.mkdirSync(out,{recursive:true});
 const browser=await chromium.launch({executablePath:process.env.CHROMIUM_PATH||'/usr/bin/chromium',args:['--no-sandbox',...(process.env.TEST_GPU==='hardware'?[]:['--use-angle=swiftshader','--enable-unsafe-swiftshader']),...(process.env.CHROMIUM_PROXY_SPKI?['--ignore-certificate-errors-spki-list='+process.env.CHROMIUM_PROXY_SPKI]:[])]});
 try{
 const page=await browser.newPage({viewport:{width:1440,height:1000},deviceScaleFactor:1}),errors=[];page.on('pageerror',e=>errors.push(e.message));
 const frames=[
  {name:'01-front-three-quarter',event:'Mexico City Grand Prix',time:50,yaw:.75,pitch:.25,distance:6.7},
  {name:'02-side-profile',event:'Mexico City Grand Prix',time:50,yaw:Math.PI/2,pitch:.12,distance:7.3},
  {name:'03-rear-three-quarter',event:'Mexico City Grand Prix',time:50,yaw:Math.PI-.75,pitch:.25,distance:6.7},
  {name:'04-tyre-suspension',event:'Mexico City Grand Prix',time:50,yaw:.85,pitch:.22,distance:2.4,target:[.60,.36,1.50]},
  {name:'05-cockpit',event:'Mexico City Grand Prix',time:50,mode:'cockpit'},
  {name:'06-cota-climb',event:'United States Grand Prix',station:180,yaw:Math.PI-.65,pitch:.22,distance:7.3},
  {name:'12-cota-cockpit',event:'United States Grand Prix',station:180,mode:'cockpit'},
  {name:'07-spa-raidillon',event:'Belgian Grand Prix',station:1075,yaw:Math.PI-.75,pitch:.25,distance:7.3},
  {name:'13-spa-cockpit',event:'Belgian Grand Prix',station:1075,mode:'cockpit'},
  {name:'08-lod-low',event:'Mexico City Grand Prix',time:50,yaw:.75,pitch:.25,distance:6.7,lod:'low'},
  {name:'09-lod-medium',event:'Mexico City Grand Prix',time:50,yaw:.75,pitch:.25,distance:6.7,lod:'medium'},
  {name:'10-lod-high',event:'Mexico City Grand Prix',time:50,yaw:.75,pitch:.25,distance:6.7,lod:'high'},
  {name:'11-follow',event:'Mexico City Grand Prix',time:50,mode:'a'}
 ];
 let lastEvent='';const records=[];
 for(const frame of frames){
  if(lastEvent!==frame.event){await page.goto('about:blank');await page.goto(base+'/#y=2024&e='+encodeURIComponent(frame.event)+'&k=Q&a=HAM&b=RUS&g=1');await page.waitForFunction(()=>typeof ghost3d!=='undefined'&&ghost3d.ready&&VisualAssets.state==='ready'&&ghost3d.cars.every(c=>c.userData.asset),null,{timeout:120000});await page.locator('#ghostRenderQuality').selectOption('ultra');await page.waitForFunction(()=>!!VisualAssets.templates.high&&!VisualAssets.highPending,null,{timeout:60000});await page.locator('#ghostAdaptive').uncheck();await page.locator('#ghostTransparent').uncheck();await page.addScriptTag({content:'window.inspectNearPlane='+inspectNearPlane.toString()+';'});lastEvent=frame.event;}
  const record=await page.evaluate(f=>{
   stopPlay();const S=ghostBuild(),G=ghost3d,T=G.T;
   if(st.H.event!==f.event)throw Error('Capture event mismatch: '+st.H.event+' / '+f.event);
   if(f.station!==undefined&&ghostTopography(S).metadata.category!=='derived')throw Error('Real terrain is required for hill captures');
   let time=f.time;if(f.station!==undefined){let best=Infinity;for(let t=0;t<st.A.total;t+=.025){const p=ghostReplayPoses(S,t)[0],d=ghostSurfacePose(S,p,0,t).station,e=Math.min(Math.abs(d-f.station),ghostTopography(S).length-Math.abs(d-f.station));if(e<best){best=e;time=t;}}}
   st.play.e=time;ghost.camera=f.mode||'free';ghost.cameraState=null;GhostDirector.transition=null;
   const p=ghostReplayPoses(S,time)[0],support=ghostSurfacePose(S,p,0,time),q=TrackTopography.orientation(T,support.normal,p.fx,p.fz);
   if(!f.mode){const local=new T.Vector3(...(f.target||[0,.48,0])).applyQuaternion(q);ghostOrbit.target=[p.x+local.x,support.y+local.y,p.z+local.z];ghostOrbit.yaw=Math.atan2(p.fx,p.fz)+f.yaw;ghostOrbit.pitch=f.pitch;ghostOrbit.distance=f.distance;}
   drawAll();if(f.lod){for(const car of G.cars)for(const [k,o]of Object.entries(car.userData.levels))o.visible=k===f.lod;G.renderer.info.reset();GhostDirector.render();}
   G.world.updateMatrixWorld(true);const road=G.world.getObjectByName('TopographyRoad'),ray=new T.Raycaster(),contacts=[];
   if(road)for(const group of (G.cars[0].userData.tyreFit?.groups||G.cars[0].userData.contacts.map(contact=>({contact,lift:0})))){const c=group.contact;const v=new T.Vector3(c.x,c.y+group.lift,c.z).applyMatrix4(G.cars[0].matrixWorld);ray.set(new T.Vector3(v.x,v.y+100,v.z),new T.Vector3(0,-1,0));const hit=ray.intersectObject(road,false)[0];contacts.push(hit?v.y-hit.point.y:null);}
   return {frame:f,event:st.H.event,time,near:G.camera.near,nearInspection:inspectNearPlane(T,G.cars[0],G.camera),motion:typeof ghostVehicleMotion==='function'?{...ghostVehicleMotion(S,0,time)}:null,roadMisses:G.vehicleRoad?.misses??null,totals:[st.A.total,st.B.total],quality:document.getElementById('ghostRenderQuality').value,dpr:devicePixelRatio,adaptive:document.getElementById('ghostAdaptive').checked,camera:G.camera.position.toArray(),target:ghostOrbit.target,projection:G.camera.projectionMatrix.toArray(),sun:G.sun.position.toArray(),exposure:G.renderer.toneMappingExposure,buffer:G.renderer.getDrawingBufferSize(new T.Vector2()).toArray(),activeLod:Object.entries(G.cars[0].userData.levels).filter(([,o])=>o.visible).map(([k])=>k),contacts,calls:G.renderer.info.render.calls,triangles:G.renderer.info.render.triangles,memory:{...G.renderer.info.memory},source:ghostTopography(S).metadata};
  },frame);
  await page.locator('.ghost-stage').screenshot({path:path.join(out,frame.name+'.jpg'),type:'jpeg',quality:88});records.push(record);console.log(frame.name,record.activeLod,record.calls,record.triangles);
 }
 if(errors.length)throw Error(JSON.stringify(errors));fs.writeFileSync(path.join(out,'captures.json'),JSON.stringify({browser:browser.version(),viewport:{width:1440,height:1000},renderer:await page.evaluate(()=>{const gl=ghost3d.renderer.getContext(),e=gl.getExtension('WEBGL_debug_renderer_info');return e?gl.getParameter(e.UNMASKED_RENDERER_WEBGL):gl.getParameter(gl.RENDERER);}),records,errors},null,2)+'\n');
 }finally{await browser.close();}
})().catch(e=>{console.error(e);process.exitCode=1;});
