const {test,expect}=require('@playwright/test'),fs=require('node:fs');
const fixture=require('./fixtures/synthetic-topography.cjs');
const url='/?topographyTest=synthetic#y=2024&e=Mexico%20City%20Grand%20Prix&k=Q&a=HAM&b=RUS&g=1';
test('synthetic surface: tyre support, real telemetry, mesh, cameras and seven application screenshots',async({page},info)=>{
 test.setTimeout(240000);const errors=[];page.on('pageerror',e=>errors.push(e.message));
 await page.addInitScript(p=>{window.TOPOGRAPHY_TEST_PROFILE=p;},fixture);
 await page.goto(url);
 await page.waitForFunction(()=>typeof ghost3d!=='undefined'&&ghost3d.ready&&ghost3d.v4Stats&&VisualAssets.state==='ready'&&ghost3d.cars[0].userData.asset,null,{timeout:120000});
 await page.locator('#ghostRenderQuality').selectOption('performance');await page.locator('#ghostAdaptive').uncheck();
 await expect(page.locator('#ghostScenery')).toContainText('SENTETİK TEST');
 const checks=await page.evaluate(()=>{
  stopPlay();const S=ghostBuild(),G=ghost3d,T=G.T,surface=G.surface,baseline=S.native.map(L=>Array.from(L.progress.y||[]));
  const records=[];let maxPenetration=0,maxGap=0,maxUpError=0;
  for(let t=0;t<=76;t+=.5){
   st.play.e=t;const poses=ghostReplayPoses(S,t);
   poses.forEach((p,i)=>{
    const support=ghostSurfacePose(S,p,i,t),q=TrackTopography.orientation(T,support.normal,p.fx,p.fz);
    const up=new T.Vector3(0,1,0).applyQuaternion(q);maxUpError=Math.max(maxUpError,up.distanceTo(new T.Vector3(support.normal.x,support.normal.y,support.normal.z)));
    for(const tyre of G.cars[i].userData.contacts||GHOST_FALLBACK_CONTACTS){
     const contact=new T.Vector3(tyre.x,tyre.y,tyre.z).applyQuaternion(q).add(new T.Vector3(p.x,support.y,p.z));
     const ground=surface.heightAt(contact.x,contact.z,support.station)+.02;
     maxPenetration=Math.max(maxPenetration,ground-contact.y);maxGap=Math.max(maxGap,contact.y-ground);
    }
   });
  }
  const road=G.world.getObjectByName('TopographyRoad'),pos=road.geometry.attributes.position;
  let degenerate=0,down=0;const a=new T.Vector3(),b=new T.Vector3(),c=new T.Vector3();
  for(let i=0;i<pos.count;i+=3){a.fromBufferAttribute(pos,i);b.fromBufferAttribute(pos,i+1);c.fromBufferAttribute(pos,i+2);const n=b.sub(a).cross(c.sub(a));if(n.length()<1e-7)degenerate++;if(n.y<=0)down++;}
  const kerb=G.world.getObjectByName('TopographyKerbsAndMarkings'),kp=kerb.geometry.attributes.position;let kerbBelow=0,kerbDetached=0;
  for(let i=0;i<kp.count;i++){const residual=kp.getY(i)-surface.heightAt(kp.getX(i),kp.getZ(i));if(residual<-.002)kerbBelow++;if(residual>1.03)kerbDetached++;}
  // Camera sampling is deterministic and continuous at the slope/crest, before
  // the existing time-based camera filter. TV cuts are intentionally excluded.
  const cameraSteps={},cameraContinuity={};
  for(const mode of ['a','b','cockpit','cinematic','compare']){
   ghost.camera=mode;let last=null,max=0,worst=null,epsilonMax=0;
   for(let t=1;t<20;t+=.025){st.play.e=t;const v=ghostCameraPose(S,ghostReplayPoses(S,t),1440/700);if(last){const jump=Math.abs(v.camera[1]-last.camera[1]);if(jump>max){max=jump;worst={time:t,from:last.camera,to:v.camera};}}last=v;}
   cameraSteps[mode]=max;records.push({mode,worst});
   for(let t=1;t<20;t+=.05){st.play.e=t;const a=ghostCameraPose(S,ghostReplayPoses(S,t),1440/700);st.play.e=t+1e-5;const b=ghostCameraPose(S,ghostReplayPoses(S,st.play.e),1440/700);epsilonMax=Math.max(epsilonMax,Math.abs(a.camera[1]-b.camera[1]));}
   cameraContinuity[mode]=epsilonMax;
  }
  return {maxPenetration,maxGap,maxUpError,triangles:pos.count/3,degenerate,down,kerbBelow,kerbDetached,cameraSteps,cameraContinuity,totals:[st.A.total,st.B.total],finish:S.native.map(L=>ghostCurveAt(L.progress,1000).v),category:surface.metadata.category,records};
 });
 fs.writeFileSync(info.outputPath('surface-checks.json'),JSON.stringify(checks,null,2));console.log('SURFACE_CHECKS',JSON.stringify(checks));
 expect(checks.totals).toEqual([76.651,76.356]);expect(checks.finish).toEqual([1,1]);
 expect(checks.maxUpError).toBeLessThan(1e-6);expect(checks.maxPenetration).toBeLessThan(.08);expect(checks.maxGap).toBeLessThan(.22);
 expect(checks.degenerate).toBe(0);expect(checks.down).toBe(0);expect(checks.kerbBelow).toBe(0);expect(checks.kerbDetached).toBe(0);
 for(const step of Object.values(checks.cameraContinuity))expect(step).toBeLessThan(.005);
 // Select frames by canonical surface station; keep real source positions and time mapping.
 for(const [name,station,mode] of [['01-flat-to-climb',100,'cinematic'],['02-uphill',320,'cinematic'],['03-crest',550,'cinematic'],['04-descent',720,'cinematic'],['05-banked-corner',1154,'cinematic'],['06-kerbs',1154,'free'],['07-follow-uphill',320,'a']]){
  await page.evaluate(({station,mode})=>{
   stopPlay();const S=ghostBuild(),surface=ghostTopography(S);let best=0,error=Infinity;
   for(let t=0;t<st.A.total;t+=.025){const p=ghostReplayPoses(S,t)[0],s=ghostSurfacePose(S,p,0,t),d=Math.abs(s.station-station);if(d<error){error=d;best=t;}}
   st.play.e=best;ghost.camera=mode;GhostDirector.transition=null;ghost.cameraState=null;
   if(mode==='free'){const p=ghostReplayPoses(S,best)[0],h=ghostSurfacePose(S,p,0,best);ghostOrbit.target=[p.x,h.y+.5,p.z];ghostOrbit.distance=22;ghostOrbit.yaw=Math.atan2(-p.fx,-p.fz)+.9;ghostOrbit.pitch=.24;}
   drawAll();
  },{station,mode});
  const out=info.outputPath(name+'.png');await page.locator('#ghostCanvas').locator('..').screenshot({path:out});await info.attach(name,{path:out,contentType:'image/png'});
 }
 expect(errors).toEqual([]);fs.writeFileSync(info.outputPath('surface-checks.json'),JSON.stringify({...checks,errors},null,2));
});

test('profile changes rebuild collision cache and 120-second playback keeps bounded GPU resources',async({page},info)=>{
 test.setTimeout(240000);await page.addInitScript(p=>{window.TOPOGRAPHY_TEST_PROFILE=p;},fixture);await page.goto(url);
 await page.waitForFunction(()=>typeof ghost3d!=='undefined'&&ghost3d.ready&&ghost3d.v4Stats&&VisualAssets.state==='ready',null,{timeout:120000});
 await page.locator('#ghostRenderQuality').selectOption('performance');await page.locator('#ghostAdaptive').uncheck();
 const before=await page.evaluate(()=>{
  stopPlay();st.play.e=10;drawAll();const old=CameraCollision.cache,world=ghost3d.world;
  window.topographyFingerprint=()=>JSON.stringify([st.A,st.B].map(L=>({total:L.total,channels:Object.fromEntries(['t','v','thr','brk','gear','rpm'].map(k=>[k,Array.from(L[k])])),sourceTime:Array.from(L.source.t),sourceDistance:Array.from(L.source.rel)})));
  window.topographyOriginal=window.topographyFingerprint();
  const f=MexicoV3.frame(.03),surface=ghost3d.surface;
  const a=[f.x+f.rx*12,surface.heightAt(f.x+f.rx*12,f.z+f.rz*12)+.65,f.z+f.rz*12];
  const b=[f.x+f.rx*22,surface.heightAt(f.x+f.rx*22,f.z+f.rz*22)+.65,f.z+f.rz*22];
  const safe=ghostConstrainFree(b,a),collisionDistance=Math.hypot(safe[0]-a[0],safe[2]-a[2]);
  window.TOPOGRAPHY_TEST_PROFILE=structuredClone(window.TOPOGRAPHY_TEST_PROFILE);drawAll();
  const rebuilt=world!==ghost3d.world&&old!==CameraCollision.cache;
  // Upload all circuit tiles once before measuring growth: Three.js uploads
  // visible geometries lazily. This is not a leak allowance.
  ghost.camera='overview';ghost.cameraState=null;drawAll();ghost.camera='a';ghost.cameraState=null;drawAll();
  st.play.e=0;st.play.rate=.25;startPlay();return {rebuilt,collisionDistance,memory:{...ghost3d.renderer.info.memory}};
 });
 await page.waitForTimeout(120000);
 const after=await page.evaluate(()=>{stopPlay();return {time:st.play.e,memory:{...ghost3d.renderer.info.memory},ready:ghost3d.ready,cache:!!CameraCollision.cache,telemetryUnchanged:window.topographyOriginal===window.topographyFingerprint()};});
 fs.writeFileSync(info.outputPath('synthetic-soak.json'),JSON.stringify({before,after},null,2));
 expect(before.rebuilt).toBe(true);expect(before.collisionDistance).toBeGreaterThan(0);expect(before.collisionDistance).toBeLessThan(6);expect(after.telemetryUnchanged).toBe(true);expect(after.ready).toBe(true);expect(after.time).toBeGreaterThan(29);expect(after.time).toBeLessThan(40);
 expect(after.memory.geometries-before.memory.geometries).toBeLessThan(12);expect(after.memory.textures-before.memory.textures).toBeLessThan(5);
 fs.writeFileSync(info.outputPath('synthetic-soak.json'),JSON.stringify({before,after},null,2));
});
