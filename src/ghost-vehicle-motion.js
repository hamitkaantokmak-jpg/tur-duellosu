/* Rendering-only adapter. Cache belongs to the scene; never modifies telemetry. */
function ghostVehicleMotion(S,index,time){
  const estimated=!!($('ghostEstimatedLine').checked&&S.visual);
  let cache=S.vehicleMotion;
  if(!cache||cache.estimated!==estimated){
    const tables=[st.A,st.B].map((lap,i)=>{
      const total=lap.total,source=lap.source||lap;
      const speed=t=>ReplayCore.at(source.t,source.v,Math.max(0,Math.min(total,t))/total*source.t[source.t.length-1])/3.6;
      return VehicleMotion.build(total,(t,out)=>{
        const lo=Math.max(0,t-.12),hi=Math.min(total,t+.12),dt=hi-lo||1;
        const a=ghostReplayPoses(S,lo)[i],b=ghostReplayPoses(S,hi)[i];
        out.speed=speed(t);out.acceleration=(speed(hi)-speed(lo))/dt;
        out.yawRate=Math.atan2(b.fx*a.fz-b.fz*a.fx,a.fx*b.fx+a.fz*b.fz)/dt;
      });
    });
    cache=S.vehicleMotion={estimated,tables,outputs:[{pitch:0,roll:0,steer:0},{pitch:0,roll:0,steer:0}]};
  }
  return VehicleMotion.sample(cache.tables[index],time,cache.outputs[index]);
}
function ghostBindVehicleBody(car,T){
  if(car.userData.motionBodies)return;
  const bodies=[];
  // Meshopt batches chassis meshes, but preserves Wheel_/Steer_ animation pivots.
  // Move only non-wheel meshes; root support and every tyre transform stay intact.
  for(const level of Object.values(car.userData.levels||{fallback:car})){
    const meshes=[];
    level.traverse(o=>{
      if(!o.isMesh)return;
      for(let p=o;p&&p!==level;p=p.parent)if(/^Wheel_|^Steer_|^Axle_/.test(p.name)||p.userData.spins)return;
      meshes.push(o);
    });
    const body=new T.Group();body.name='VisualBodyMotion';body.position.y=.36;level.add(body);
    car.updateWorldMatrix(true,true);for(const mesh of meshes)body.attach(mesh);
    bodies.push(body);
  }
  car.userData.motionBodies=bodies;
}
function ghostApplyVehicleMotion(car,T,motion){
  ghostBindVehicleBody(car,T);
  for(const body of car.userData.motionBodies)body.rotation.set(motion.pitch,0,motion.roll,'XYZ');
  for(const steer of car.userData.steers||[])steer.rotation.y=motion.steer;
}
function ghostFitVisualTyres(car,T,S,support){
  const data=car.userData;
  const road=ghost3d.vehicleRoad?.root===ghost3d.world?ghost3d.vehicleRoad.road:ghost3d.world.getObjectByName('TopographyRoad');
  if(road&&ghost3d.vehicleRoad?.geometry!==road.geometry){
    road.updateWorldMatrix(true,false);
    const a=road.geometry.attributes.position,p=new Float64Array(a.count*3),v=new T.Vector3();
    for(let i=0;i<a.count;i++){v.fromBufferAttribute(a,i).applyMatrix4(road.matrixWorld);p[i*3]=v.x;p[i*3+1]=v.y;p[i*3+2]=v.z;}
    ghost3d.vehicleRoad={root:ghost3d.world,road,geometry:road.geometry,...VehicleMotion.roadSurface(p,road.geometry.index?.array),misses:0};
  }
  const roadHeight=road?ghost3d.vehicleRoad:null;
  if(!data.tyreFit){
    // Every LOD keeps its own axle/steering pivot. Store bind offsets once.
    car.updateWorldMatrix(true,true);
    const inverse=new T.Matrix4().copy(car.matrixWorld).invert(),point=new T.Vector3();
    const fits=data.wheels.map(w=>{
      const pivot=w.parent.name.startsWith('Steer_')||w.parent.name.startsWith('Axle_')?w.parent:w;
      point.setFromMatrixPosition(w.matrixWorld).applyMatrix4(inverse);
      const contacts=data.contacts||GHOST_FALLBACK_CONTACTS;
      let contact=contacts[0],best=Infinity;
      for(const c of contacts){const d=(c.x-point.x)**2+(c.z-point.z)**2;if(d<best){best=d;contact=c;}}
      return {pivot,restY:pivot.position.y,contact,lift:0};
    });
    const groups=[...new Set(fits.map(f=>f.contact))].map(contact=>({contact,lift:0}));
    for(const fit of fits)fit.group=groups.find(g=>g.contact===fit.contact);
    data.tyreFit={fits,groups,point:new T.Vector3(),up:new T.Vector3()};
  }
  const {fits,groups,point,up}=data.tyreFit,surface=ghostTopography(S);
  up.set(0,1,0).applyQuaternion(car.quaternion);
  for(const group of groups){
    const c=group.contact;point.set(c.x,c.y,c.z).applyQuaternion(car.quaternion).add(car.position);
    let lift=0;
    for(let k=0;k<2;k++){
      const x=point.x+up.x*lift,z=point.z+up.z*lift;
      const rendered=roadHeight?.height(x,z,point.y);
      if(roadHeight&&!Number.isFinite(rendered))roadHeight.misses++;
      const ground=Number.isFinite(rendered)?rendered+.002:surface.heightAt(x,z,support.station)+.02;
      lift=Math.max(-.06,Math.min(.06,(ground-point.y)/Math.max(.5,up.y)));
    }
    group.lift=lift;
  }
  for(const fit of fits){fit.lift=fit.group.lift;fit.pivot.position.y=fit.restY+fit.lift;}
}
