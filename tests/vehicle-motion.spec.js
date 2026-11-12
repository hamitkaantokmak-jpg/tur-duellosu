const {test,expect}=require('@playwright/test'),fs=require('node:fs');
for(const [id,event]of [['mexico','Mexico City Grand Prix'],['cota','United States Grand Prix'],['spa','Belgian Grand Prix']])test('V8 '+id+' body-only motion preserves root, tyre support, telemetry and cameras',async({page},info)=>{
 test.setTimeout(240000);const errors=[];page.on('pageerror',e=>errors.push(e.message));
 await page.goto('/#y=2024&e='+encodeURIComponent(event)+'&k=Q&a=HAM&b=RUS&g=1');
 await page.waitForFunction(()=>typeof ghost3d!=='undefined'&&ghost3d.ready&&VisualAssets.state==='ready'&&ghost3d.cars.every(c=>c.userData.asset),null,{timeout:120000});
 const result=await page.evaluate(()=>{
  stopPlay();const S=ghostBuild(),G=ghost3d,T=G.T,surface=ghostTopography(S);
  const fingerprint=()=>JSON.stringify([st.A,st.B].map(L=>({total:L.total,channels:['t','v','thr','brk','gear','rpm','x','y'].map(k=>Array.from(L[k])),source:L.source})));
  const original=fingerprint();let rootError=0,wheelError=0,cameraError=0,maxLift=0,pitchMin=1,pitchMax=-1,rollMax=0,contactMin=Infinity,contactMax=-Infinity,bodyClearance=Infinity;
  const road=G.world.getObjectByName('TopographyRoad'),ray=new T.Raycaster(),down=new T.Vector3(0,-1,0);
  const matrix=new T.Matrix4(),zero={pitch:0,roll:0,steer:0};
  for(let t=.5;t<Math.min(st.A.total,st.B.total);t+=.5){
   st.play.e=t;ghost.camera='a';GhostDirector.transition=null;ghost.cameraState=null;drawAll();
   const poses=ghostReplayPoses(S,t),view=ghostCameraPose(S,poses,16/9);
   G.cars.forEach((car,i)=>{
    const m={...ghostVehicleMotion(S,i,t)},p=poses[i],support=ghostSurfacePose(S,p,i,t);
    pitchMin=Math.min(pitchMin,m.pitch);pitchMax=Math.max(pitchMax,m.pitch);rollMax=Math.max(rollMax,Math.abs(m.roll));
    rootError=Math.max(rootError,Math.hypot(car.position.x-p.x,car.position.y-support.y,car.position.z-p.z));
    maxLift=Math.max(maxLift,...car.userData.tyreFit.fits.map(f=>Math.abs(f.lift)));car.updateWorldMatrix(true,true);
    const wheels=car.userData.wheels.map(w=>w.matrixWorld.clone());
    // Body motion must not move any wheel, even after steering/spin and on grades.
    ghostApplyVehicleMotion(car,T,{...zero,steer:m.steer});car.updateWorldMatrix(true,true);
    car.userData.wheels.forEach((w,j)=>{for(let k=0;k<16;k++)wheelError=Math.max(wheelError,Math.abs(w.matrixWorld.elements[k]-wheels[j].elements[k]));});
    ghostApplyVehicleMotion(car,T,m);car.updateWorldMatrix(true,true);
    for(const fit of car.userData.tyreFit.groups){const c=fit.contact,v=new T.Vector3(c.x,c.y+fit.lift,c.z).applyMatrix4(car.matrixWorld);if(road){ray.set(new T.Vector3(v.x,v.y+100,v.z),down);const hit=ray.intersectObject(road,false)[0];if(!hit)throw Error('No asphalt under tyre');contactMin=Math.min(contactMin,v.y-hit.point.y);contactMax=Math.max(contactMax,v.y-hit.point.y);}}
    // Check the actual floor vertices, not a fictitious suspension envelope.
    for(const body of car.userData.motionBodies)body.traverse(o=>{if(!o.isMesh)return;const a=o.geometry.attributes.position;for(let j=0;j<a.count;j++){if(a.getY(j)>.15)continue;const v=new T.Vector3().fromBufferAttribute(a,j).applyMatrix4(o.matrixWorld);bodyClearance=Math.min(bodyClearance,v.y-surface.heightAt(v.x,v.z,support.station));}});
   });
   const again=ghostCameraPose(S,poses,16/9);for(let k=0;k<3;k++)cameraError=Math.max(cameraError,Math.abs(view.camera[k]-again.camera[k]));
  }
  const expected={...ghostVehicleMotion(S,0,10.123)};
  for(const t of [40,0,10.123,10.123])ghostVehicleMotion(S,0,t);
  const seekStable=JSON.stringify(expected)===JSON.stringify(ghostVehicleMotion(S,0,10.123));
  const prior=S.vehicleMotion;$('ghostEstimatedLine').checked=!$('ghostEstimatedLine').checked;ghostVehicleMotion(S,0,10);const invalidated=prior!==S.vehicleMotion;
  return {rootError,wheelError,cameraError,maxLift,pitchMin,pitchMax,rollMax,contactMin,contactMax,bodyClearance,seekStable,invalidated,unchanged:original===fingerprint(),totals:[st.A.total,st.B.total],delta:st.B.total-st.A.total,tableBytes:S.vehicleMotion.tables.reduce((n,t)=>n+t.pitch.byteLength+t.roll.byteLength+t.steer.byteLength,0),renderer:G.renderer.getContext().getParameter(G.renderer.getContext().getExtension('WEBGL_debug_renderer_info').UNMASKED_RENDERER_WEBGL)};
 });
 fs.writeFileSync(info.outputPath(id+'-motion.json'),JSON.stringify({result,errors},null,2));
 expect(result.rootError).toBeLessThan(1e-10);expect(result.wheelError).toBeLessThan(1e-10);expect(result.cameraError).toBeLessThan(1e-10);
 expect(result.pitchMin).toBeLessThan(0);expect(result.pitchMax).toBeGreaterThan(0);expect(result.rollMax).toBeGreaterThan(.001);
 expect(result.pitchMax).toBeLessThanOrEqual(Math.PI/360);expect(result.pitchMin).toBeGreaterThanOrEqual(-Math.PI/360);expect(result.rollMax).toBeLessThanOrEqual(Math.PI/300);
 expect(result.bodyClearance).toBeGreaterThan(0);expect(result.seekStable&&result.invalidated&&result.unchanged).toBe(true);
 expect(result.contactMin).toBeGreaterThan(-.025);expect(result.contactMax).toBeLessThan(.025);expect(result.maxLift).toBeLessThanOrEqual(.06);
 if(id==='mexico'){expect(result.totals).toEqual([76.651,76.356]);expect(result.delta).toBeCloseTo(-.295,10);}
 expect(errors).toEqual([]);
});
