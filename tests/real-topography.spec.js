const {test,expect}=require('@playwright/test'),fs=require('node:fs');
const cases=[['cota','United States Grand Prix'],['spa','Belgian Grand Prix']];
for(const [id,event]of cases)test(id+' real terrain keeps telemetry, tyre contact and cameras stable',async({page},info)=>{
 test.setTimeout(240000);const errors=[];page.on('pageerror',e=>errors.push(e.message));
 await page.goto('/#y=2024&e='+encodeURIComponent(event)+'&k=Q&a=HAM&b=RUS&g=1');
 await page.waitForFunction(()=>typeof ghost3d!=='undefined'&&ghost3d.ready&&VisualAssets.state==='ready'&&ghost3d.cars.every(c=>c.userData.asset),null,{timeout:120000});
 const result=await page.evaluate(()=>{
  stopPlay();const S=ghostBuild(),surface=ghostTopography(S),T=ghost3d.T;
  const fingerprint=()=>JSON.stringify([st.A,st.B].map(L=>({total:L.total,t:Array.from(L.t),v:Array.from(L.v),thr:Array.from(L.thr),brk:Array.from(L.brk),gear:Array.from(L.gear),rpm:Array.from(L.rpm),sourceTime:Array.from(L.source.t),sourceDistance:Array.from(L.source.rel)})));
  const before=fingerprint();let penetration=0,gap=0,upError=0,cameraEpsilon=0;
  for(let t=0;t<Math.min(st.A.total,st.B.total);t+=.125){
   st.play.e=t;const poses=ghostReplayPoses(S,t);
   poses.forEach((p,i)=>{const support=ghostSurfacePose(S,p,i,t),q=TrackTopography.orientation(T,support.normal,p.fx,p.fz);
    upError=Math.max(upError,new T.Vector3(0,1,0).applyQuaternion(q).distanceTo(new T.Vector3(support.normal.x,support.normal.y,support.normal.z)));
    for(const tyre of ghost3d.cars[i].userData.contacts){const v=new T.Vector3(tyre.x,tyre.y,tyre.z).applyQuaternion(q).add(new T.Vector3(p.x,support.y,p.z)),h=surface.heightAt(v.x,v.z,support.station)+.02;penetration=Math.max(penetration,h-v.y);gap=Math.max(gap,v.y-h);}
   });
   for(const camera of ['a','b','compare','cockpit','cinematic']){ghost.camera=camera;const a=ghostCameraPose(S,poses,16/9);st.play.e=t+1e-5;const b=ghostCameraPose(S,ghostReplayPoses(S,t+1e-5),16/9);st.play.e=t;cameraEpsilon=Math.max(cameraEpsilon,Math.abs(a.camera[1]-b.camera[1]));}
  }
  const f=surface.sampleAtDistance(100),point=offset=>{const x=f.position.x+f.right.x*offset,z=f.position.z+f.right.z*offset;return[x,surface.heightAt(x,z)+.65,z];};
  const from=point(S.profile.barrier-2),to=point(S.profile.barrier+4),safe=ghostConstrainFree(to,from),collisionSweep={requested:Math.hypot(...to.map((v,i)=>v-from[i])),moved:Math.hypot(...safe.map((v,i)=>v-from[i])),clearance:safe[1]-surface.heightAt(safe[0],safe[2])};
  return {metadata:surface.metadata,fit:S.realRegistration,profile:!!S.realProfile,flat:surface.flat,length:surface.length,penetration,gap,upError,cameraEpsilon,collisionSweep,telemetryUnchanged:before===fingerprint(),totals:[st.A.total,st.B.total],finish:S.native.map(L=>ghostCurveAt(L.progress,1000).v),mexicoVenue:!!ghost3d.v4Stats,telemetryZ:[st.A,st.B].map(L=>({present:!!L.source.elevation,range:L.source.elevation?[Math.min(...L.source.elevation),Math.max(...L.source.elevation)]:null,classification:'unverified telemetry Z; not used as the terrain source'}))};
 });
 fs.writeFileSync(info.outputPath(id+'-surface.json'),JSON.stringify(result,null,2));console.log('REAL_SURFACE',id,JSON.stringify(result));
 expect(result.profile).toBe(true);expect(result.metadata.category).toBe('derived');expect(result.metadata.bankingStatus).toBe('unmeasured');expect(result.flat).toBe(false);expect(result.fit.rmse).toBeLessThan(25);expect(result.mexicoVenue).toBe(false);
 expect(result.penetration).toBeLessThan(.08);expect(result.gap).toBeLessThan(.22);expect(result.upError).toBeLessThan(1e-6);expect(result.cameraEpsilon).toBeLessThan(.005);expect(result.telemetryUnchanged).toBe(true);expect(result.finish).toEqual([1,1]);
 expect(result.collisionSweep.moved).toBeGreaterThan(0);expect(result.collisionSweep.moved).toBeLessThan(result.collisionSweep.requested*.8);expect(result.collisionSweep.clearance).toBeGreaterThanOrEqual(.649999);
 await expect(page.locator('#ghostScenery')).toContainText('TÜRETİLMİŞ');
 await page.locator('#ghostRenderQuality').selectOption('ultra');await page.locator('#ghostAdaptive').uncheck();
 await page.waitForFunction(()=>!!VisualAssets.templates.high&&!VisualAssets.highPending,null,{timeout:60000});
 const stations=id==='cota'?[['01-start',-1,'a'],['02-t1-approach',180,'cinematic'],['03-t1-crest',350,'cinematic'],['04-t1-descent',520,'cinematic'],['05-follow',180,'a'],['06-cockpit',180,'cockpit']]:[['01-eau-rouge',915,'a'],['02-raidillon',1075,'cinematic'],['03-crest',1154,'cinematic'],['04-cockpit',1075,'cockpit'],['05-contact-regression',1000,'a']];
 for(const [name,station,mode]of stations){
  const record=await page.evaluate(({station,mode})=>{const S=ghostBuild(),s=ghostTopography(S);if(station<0)station=S.registration.phase*s.length;let best=0,error=Infinity;
   for(let t=0;t<st.A.total;t+=.025){const p=ghostReplayPoses(S,t)[0],d=ghostSurfacePose(S,p,0,t).station,e=Math.min(Math.abs(d-station),s.length-Math.abs(d-station));if(e<error){best=t;error=e;}}
   st.play.e=best;ghost.camera=mode;GhostDirector.transition=null;ghost.cameraState=null;drawAll();
   const G=ghost3d,T=G.T,road=G.world.getObjectByName('TopographyRoad'),ray=new T.Raycaster(),meshGaps=[],fieldGaps=[];G.world.updateMatrixWorld(true);
   for(const car of G.cars)for(const c of car.userData.contacts){const point=new T.Vector3(c.x,c.y,c.z).applyMatrix4(car.matrixWorld);ray.set(new T.Vector3(point.x,point.y+100,point.z),new T.Vector3(0,-1,0));const hit=ray.intersectObject(road,false)[0];meshGaps.push(hit?point.y-hit.point.y:null);fieldGaps.push(point.y-s.heightAt(point.x,point.z)-.02);}
   return {time:best,station,error,mode,label:s.metadata.label,meshGaps,fieldGaps};
  },{station,mode});
  const path=info.outputPath(id+'-'+name+'.jpg');await page.locator('#ghostCanvas').locator('..').screenshot({path,type:'jpeg',quality:70});await info.attach(id+'-'+name,{path,contentType:'image/jpeg'});fs.writeFileSync(info.outputPath(id+'-'+name+'.json'),JSON.stringify(record,null,2));
  expect(record.meshGaps.every(v=>v!==null&&v>-.025&&v<.025)).toBe(true);
 }
 expect(errors).toEqual([]);
});

test('COTA derived terrain survives 120 seconds, camera/quality changes and Studio round trips',async({page},info)=>{
 test.setTimeout(240000);const errors=[];page.on('pageerror',e=>errors.push(e.message));
 await page.goto('/#y=2024&e=United%20States%20Grand%20Prix&k=Q&a=HAM&b=RUS&g=1');
 await page.waitForFunction(()=>typeof ghost3d!=='undefined'&&ghost3d.ready&&VisualAssets.state==='ready'&&ghost3d.cars.every(c=>c.userData.asset),null,{timeout:120000});
 const before=await page.evaluate(()=>{stopPlay();window.realFingerprint=()=>JSON.stringify([st.A,st.B].map(L=>[L.total,...['t','v','thr','brk','gear','rpm'].map(k=>Array.from(L[k])),Array.from(L.source.t),Array.from(L.source.rel)]));window.realOriginal=realFingerprint();window.realRenderer=ghost3d.renderer;ghost.camera='overview';drawAll();ghost.camera='a';st.play.e=0;drawAll();st.play.rate=.25;startPlay();return{memory:{...ghost3d.renderer.info.memory},time:st.play.e};});
 await page.waitForTimeout(120000);
 const after=await page.evaluate(()=>{stopPlay();return{time:st.play.e,memory:{...ghost3d.renderer.info.memory},unchanged:realOriginal===realFingerprint()};});
 fs.writeFileSync(info.outputPath('cota-soak-memory.json'),JSON.stringify({before,after},null,2));
 expect(after.time).toBeGreaterThan(29);expect(after.time).toBeLessThan(40);expect(after.unchanged).toBe(true);expect(after.memory.geometries-before.memory.geometries).toBeLessThan(12);expect(after.memory.textures-before.memory.textures).toBeLessThan(5);
 const transitions=[];
 for(const quality of ['performance','balanced','ultra']){
  await page.locator('#ghostRenderQuality').selectOption(quality);
  for(const mode of ['a','tv','free','cockpit'])await page.evaluate(mode=>{ghost.camera=mode;ghost.cameraState=null;drawAll();},mode);
  await page.locator('#ghostClose').click();await page.locator('#studioToggle').click();await page.waitForFunction(()=>InsightLab.active&&InsightLab.report);
  await page.locator('#studioToggle').click();await page.locator('#ghostToggle').click();
  transitions.push(await page.evaluate(()=>({same:ghost3d.renderer===realRenderer,ready:ghost3d.ready,category:ghostTopography(ghostBuild()).metadata.category,unchanged:realOriginal===realFingerprint()})));
 }
 for(const r of transitions)expect(r).toEqual({same:true,ready:true,category:'derived',unchanged:true});
 fs.writeFileSync(info.outputPath('cota-soak.json'),JSON.stringify({before,after,transitions,errors},null,2));expect(errors).toEqual([]);
});
