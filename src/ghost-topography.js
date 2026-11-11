/* Rendering adapter only. Never writes lap channels, station registration or clocks. */
const TrackTopographyProfiles = Object.create(null);
const GHOST_TOPOGRAPHY_TEST_ENABLED=/^(localhost|127\.0\.0\.1|\[::1\])$/.test(location.hostname)&&new URLSearchParams(location.search).get('topographyTest')==='synthetic';
const GHOST_FLAT_SUPPORT=Object.freeze({y:0,normal:Object.freeze({x:0,y:1,z:0}),station:0});
function ghostTopography(S) {
  // A test profile must be explicitly injected, requested AND run on loopback.
  const test=GHOST_TOPOGRAPHY_TEST_ENABLED&&window.TOPOGRAPHY_TEST_PROFILE;
  let profile = test || S.realProfile || TrackTopographyProfiles[st.H.event] || null;
  // Preserve the former opt-in telemetry-height rendering outside Mexico, but
  // identify it as illustrative: telemetry Z units/datum were not surveyed.
  if (!profile && !S.track && S.elevation && $('ghostElevation').checked) {
    profile = S.telemetryTopography || (S.telemetryTopography = {
      metadata:{category:'illustrative',source:'Existing telemetry Z visual estimate; units/datum unverified',license:'Inherited telemetry archive terms',label:'Temsili telemetri yüksekliği · ölçülmüş pist değildir'},
      samples:Array.from(S.elevation,(e,i)=>({distance:i/(S.n-1)*st.H.L,elevation:e-S.elevation[0],banking:0}))
    });
  }
  if (S.topography && S.topographyProfile === profile) return S.topography;
  const length = S.track?.length || st.H.L;
  const edgePoints=S.edges.map(e=>e.p);
  const centerline = S.track ? u=>S.track.sample(u) : u=>ghostPoint(edgePoints,u*(S.n-1));
  S.topography = TrackTopography.create({length,centerline,profile});
  S.topographyProfile = profile;
  S.topography.maxElevation=Math.max(...S.topography.points.map((_,i)=>S.topography.sampleAtDistance(i*S.topography.step).elevation));
  return S.topography;
}
const GHOST_FALLBACK_CONTACTS=[-.88,.88].flatMap(x=>[-1.58,1.48].map(z=>({x,y:.02,z})));
function ghostSurfacePose(S,p,index,time) {
  const surface=ghostTopography(S);
  if(surface.flat)return GHOST_FLAT_SUPPORT;
  const tyres=ghost3d.cars?.[index]?.userData.contacts||GHOST_FALLBACK_CONTACTS;
  const cached=S.surfacePoses?.[index];
  if(cached&&cached.hasThree===!!ghost3d.T&&cached.surface===surface&&cached.tyres===tyres&&cached.time===time&&cached.x===p.x&&cached.z===p.z&&cached.fx===p.fx&&cached.fz===p.fz)return cached.result;
  const progress=ghostCurveAt(S.native[index].progress,time).v;
  const hint=(S.track?S.registration.phase+S.registration.dir*progress:progress)*surface.length;
  const at=surface.project(p.x,p.z,hint),s=surface.sampleAtDistance(at.distance,at.offset);
  // Four tyre contacts fit a support plane. Rigid cars cannot exactly match a
  // curved surface; the maximum residual lifts the chassis enough to avoid penetration.
  const right={x:p.fz,z:-p.fx};
  const contacts=tyres.map(c=>({...c,ground:surface.heightAt(p.x+right.x*c.x+p.fx*c.z,p.z+right.z*c.x+p.fz*c.z,at.distance)+.02}));
  const minX=Math.min(...contacts.map(c=>c.x)),maxX=Math.max(...contacts.map(c=>c.x)),minZ=Math.min(...contacts.map(c=>c.z)),maxZ=Math.max(...contacts.map(c=>c.z));
  const mean=(axis,value)=>{const row=contacts.filter(c=>Math.abs(c[axis]-value)<.03);return row.reduce((sum,c)=>sum+c.ground,0)/row.length;};
  const longitudinal=(mean('z',maxZ)-mean('z',minZ))/(maxZ-minZ),lateral=(mean('x',maxX)-mean('x',minX))/(maxX-minX);
  const normal=TrackTopography.unit({x:-p.fx*longitudinal-right.x*lateral,y:1,z:-p.fz*longitudinal-right.z*lateral});
  const T=ghost3d.T;
  const q=T?TrackTopography.orientation(T,normal,p.fx,p.fz):null;
  const y=T?Math.max(...tyres.map(c=>{const v=new T.Vector3(c.x,c.y,c.z).applyQuaternion(q);return surface.heightAt(p.x+v.x,p.z+v.z,at.distance)+.02-v.y;})):
    Math.max(...contacts.map(c=>c.ground-longitudinal*c.z-lateral*c.x-c.y));
  const result={y,normal,station:at.distance,banking:s.banking,gradient:s.gradient};
  (S.surfacePoses||(S.surfacePoses=[]))[index]={surface,tyres,hasThree:!!ghost3d.T,time,x:p.x,z:p.z,fx:p.fx,fz:p.fz,result};return result;
}
function ghostDrapeWorld(S,root) {
  const surface=ghostTopography(S);if(surface.flat)return;
  const T=ghost3d.T,cache=new Map(),vector=new T.Vector3(),inverse=new T.Matrix4();
  const height=(x,z)=>{const key=x.toFixed(4)+':'+z.toFixed(4);if(!cache.has(key))cache.set(key,surface.heightAt(x,z));return cache.get(key);};
  root.updateMatrixWorld(true);
  root.traverse(o=>{
    if(o.userData.topographyApplied)return;
    if(o.isInstancedMesh){
      o.userData.topographyApplied=true;
      const matrix=new T.Matrix4(),worldMatrix=new T.Matrix4(),position=new T.Vector3(),localInverse=new T.Matrix4().copy(o.matrixWorld).invert();
      for(let i=0;i<o.count;i++){
        o.getMatrixAt(i,matrix);worldMatrix.multiplyMatrices(o.matrixWorld,matrix);position.setFromMatrixPosition(worldMatrix);
        worldMatrix.elements[13]+=height(position.x,position.z);matrix.multiplyMatrices(localInverse,worldMatrix);o.setMatrixAt(i,matrix);
      }
      o.instanceMatrix.needsUpdate=true;o.computeBoundingSphere();
      if(o.userData.fullMatrices)o.userData.fullMatrices=o.instanceMatrix.array.slice();return;
    }
    if(!o.isMesh&&!o.isLine)return;
    o.userData.topographyApplied=true;
    // Used only by free-camera movement, not every following-camera ray.
    // Endpoint height clamping alone
    // cannot stop a lens from travelling through a crest between two low points.
    if(o.name==='TopographyRoad'||o.name==='TopographyGround')o.userData.cameraTerrain=true;
    // Existing environment meshes are owned by this world; imported shared
    // templates are never passed here. Geometry is deformed once at build time.
    if(o.name==='TopographyGround'){
      // A bounded terrain grid follows the same height field as the road and
      // existing scenery. Keep the original material; no extra draw call.
      const w=S.maxX-S.minX+400,h=S.maxZ-S.minZ+400;
      o.geometry.dispose();o.geometry=new T.PlaneGeometry(w,h,Math.ceil(w/16),Math.ceil(h/16));
    }
    const geometry=o.geometry,positions=geometry.attributes.position;
    inverse.copy(o.matrixWorld).invert();
    for(let i=0;i<positions.count;i++){
      vector.fromBufferAttribute(positions,i).applyMatrix4(o.matrixWorld);
      vector.y+=height(vector.x,vector.z);
      vector.applyMatrix4(inverse);positions.setXYZ(i,vector.x,vector.y,vector.z);
    }
    positions.needsUpdate=true;if(o.isMesh)geometry.computeVertexNormals();geometry.computeBoundingBox();geometry.computeBoundingSphere();
  });
  CameraCollision.clear();
}
function ghostTopographyCamera(S,poses,view) {
  const surface=ghostTopography(S);if(surface.flat)return view;
  const mode=ghost.camera,focus=mode==='b'?1:0;
  if(mode==='free')return view; // Free orbit already uses absolute world coordinates.
  const camera=view.camera.slice(),target=view.target.slice();
  if(mode==='overview'){
    const max=surface.maxElevation;
    camera[1]+=Math.max(0,max);target[1]=max/2;
  }else{
    const supports=poses.map((p,i)=>ghostSurfacePose(S,p,i,st.play.e));
    const mean=(supports[0].y+supports[1].y)/2;
    target[1]+=mode==='compare'||mode==='tv'?mean:surface.heightAt(target[0],target[2],supports[focus].station);
    const ground=surface.heightAt(camera[0],camera[2],mode==='tv'?undefined:supports[focus].station);
    camera[1]+=ground;camera[1]=Math.max(camera[1],ground+.65);
  }
  return {camera,target};
}
