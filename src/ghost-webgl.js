const ghost3d={ready:false,loading:false,failed:false,source:null};
function ghostMergeMeshes(root,T,cellSize=0){
  root.updateMatrixWorld(true);const inverse=new T.Matrix4().copy(root.matrixWorld).invert(),batches=new Map(),sources=[];
  root.traverse(o=>{if(!o.isMesh||o.isInstancedMesh||Array.isArray(o.material))return;for(let p=o.parent;p&&p!==root;p=p.parent)if(p.userData.spins)return;
    const center=new T.Vector3().setFromMatrixPosition(o.matrixWorld).applyMatrix4(inverse);const tile=cellSize?'|'+Math.floor(center.x/cellSize)+','+Math.floor(center.z/cellSize):'';const key=o.material.uuid+'|'+o.castShadow+'|'+o.receiveShadow+tile;if(!batches.has(key))batches.set(key,{material:o.material,cast:o.castShadow,receive:o.receiveShadow,items:[]});
    let geometry=o.geometry.index?o.geometry.toNonIndexed():o.geometry.clone();geometry.applyMatrix4(new T.Matrix4().multiplyMatrices(inverse,o.matrixWorld));batches.get(key).items.push(geometry);sources.push(o);
  });
  for(const batch of batches.values()){
    const geometry=new T.BufferGeometry();for(const attr of ['position','normal','uv']){if(!batch.items.every(g=>g.attributes[attr]))continue;const size=batch.items[0].attributes[attr].itemSize,length=batch.items.reduce((n,g)=>n+g.attributes[attr].array.length,0),values=new Float32Array(length);let offset=0;for(const g of batch.items){values.set(g.attributes[attr].array,offset);offset+=g.attributes[attr].array.length;}geometry.setAttribute(attr,new T.BufferAttribute(values,size));}
    const mesh=new T.Mesh(geometry,batch.material);mesh.castShadow=batch.cast;mesh.receiveShadow=batch.receive;mesh.userData.environmentTile=!!cellSize;geometry.computeBoundingSphere();root.add(mesh);batch.items.forEach(g=>g.dispose());
  }
  const geometries=new Set();sources.forEach(o=>{o.removeFromParent();geometries.add(o.geometry);});geometries.forEach(g=>g.dispose());return {before:sources.length,after:batches.size};
}
function ghost3dStart(){
  if(ghost3d.loading||ghost3d.failed)return;ghost3d.loading=true;
  const badge=$('ghostEngine');badge.textContent='3D hazırlanıyor…';
  import('https://cdn.jsdelivr.net/npm/three@0.180.0/build/three.module.js').then(T=>{
    const canvas=document.createElement('canvas');canvas.id='ghostWebGL';canvas.tabIndex=0;canvas.setAttribute('aria-label','Işık ve gölgeli 3D tur görünümü');
    const renderer=new T.WebGLRenderer({canvas,antialias:true,alpha:false,powerPreference:'high-performance'});
    renderer.setPixelRatio(Math.min(devicePixelRatio||1,1.25));renderer.shadowMap.enabled=true;renderer.shadowMap.autoUpdate=false;renderer.shadowMap.type=T.PCFSoftShadowMap;
    renderer.outputColorSpace=T.SRGBColorSpace;renderer.toneMapping=T.ACESFilmicToneMapping;renderer.toneMappingExposure=.95;
    const scene=new T.Scene();scene.background=new T.Color('#b9cdd9');scene.fog=new T.Fog('#b9cdd9',240,1050);
    scene.add(new T.HemisphereLight('#d9e8ee','#77765c',.55));
    const sun=new T.DirectionalLight('#fff2dd',2.8);sun.castShadow=true;sun.shadow.mapSize.set(1024,1024);sun.shadow.camera.left=-75;sun.shadow.camera.right=75;sun.shadow.camera.top=75;sun.shadow.camera.bottom=-75;sun.shadow.camera.near=1;sun.shadow.camera.far=260;sun.shadow.normalBias=.12;sun.shadow.bias=-.0005;scene.add(sun,sun.target);
    const lightCanvas=document.createElement('canvas');lightCanvas.width=512;lightCanvas.height=256;const lightCtx=lightCanvas.getContext('2d'),gradient=lightCtx.createLinearGradient(0,0,0,256);gradient.addColorStop(0,'#7399bb');gradient.addColorStop(.48,'#dce6e8');gradient.addColorStop(.53,'#a7a79b');gradient.addColorStop(1,'#60665f');lightCtx.fillStyle=gradient;lightCtx.fillRect(0,0,512,256);const glow=lightCtx.createRadialGradient(350,70,1,350,70,38);glow.addColorStop(0,'#ffffff');glow.addColorStop(.15,'#fff5dc');glow.addColorStop(1,'#ffffff00');lightCtx.fillStyle=glow;lightCtx.fillRect(300,20,100,100);const lightTexture=new T.CanvasTexture(lightCanvas);lightTexture.mapping=T.EquirectangularReflectionMapping;lightTexture.colorSpace=T.SRGBColorSpace;const pmrem=new T.PMREMGenerator(renderer),lightTarget=pmrem.fromEquirectangular(lightTexture);scene.environment=lightTarget.texture;scene.environmentIntensity=.65;lightTexture.dispose();pmrem.dispose();
    const camera=new T.PerspectiveCamera(48,1,.5,10000);
    $('ghostCanvas').parentElement.append(canvas);
    const mini=document.createElement('canvas');mini.id='ghostGLMini';mini.width=160;mini.height=100;$('ghostCanvas').parentElement.append(mini);
    const labels=[0,1].map(i=>{const label=document.createElement('span');label.className='ghost-gl-label';$('ghostCanvas').parentElement.append(label);return label;});ghost3d.labels=labels;ghost3d.mini=mini;
    Object.assign(ghost3d,{T,renderer,scene,camera,sun,canvas,lightTarget,ready:true,labelVector:new T.Vector3(),assetVersion:0});
    renderer.info.autoReset=false;GhostMetrics.init(renderer);
    VisualAssets.prepare(T,renderer).then(()=>{ghost3d.assetVersion++;if(ghost.active)drawAll();});
    canvas.addEventListener('webglcontextlost',e=>{e.preventDefault();ghost3dFallback(new Error('WebGL bağlamı kayboldu; sayfayı yenileyin.'));});
    badge.textContent='3D PROTOTİP · IŞIK / GÖLGE';drawAll();
  }).catch(error=>ghost3dFallback(error));
}
function ghost3dFallback(error){
  const G=ghost3d;G.mini&&(G.mini.hidden=true);G.labels?.forEach(l=>l.hidden=true);
  G.ready=false;G.failed=true;if(G.canvas)G.canvas.hidden=true;
  $('ghostCanvas').style.visibility='visible';
  $('ghostEngine').textContent='WebGL kullanılamıyor · standart görünüm';
  $('ghostEngine').title=error?.message||'WebGL başlatılamadı';
  console.warn('Tur Düellosu WebGL:',error);
  $('ghostStats').hidden=true;if(st.A)drawAll();
}
function ghostDisposeWorld(){
  const G=ghost3d;if(!G.world)return;
  G.scene.remove(G.world);const geometries=new Set(),materials=new Set(),textures=new Set();
  G.world.traverse(o=>{if(o.geometry&&!o.userData.sharedAsset)geometries.add(o.geometry);for(const m of o.material?(Array.isArray(o.material)?o.material:[o.material]):[]){materials.add(m);for(const v of Object.values(m))if(v?.isTexture&&!v.userData.sharedAsset)textures.add(v);}});
  geometries.forEach(g=>g.dispose());materials.forEach(m=>m.dispose());textures.forEach(t=>t.dispose());
  G.world=null;G.source=null;
}
function ghost3dBuild(S){
  const G=ghost3d,T=G.T;
  ghostDisposeWorld();
  const world=new T.Group();G.scene.add(world);G.world=world;G.source=st.A;G.transparent=null;G.assetApplied=-1;G.carShadows=null;G.v3Instances=null;G.v3Obstacles=null;G.v3Stats=null;G.v4World=null;G.v4Batches=null;G.v4Obstacles=null;G.v4Stats=null;
  const material=(color,roughness=.8,metalness=0)=>new T.MeshStandardMaterial({color,roughness,metalness,side:T.DoubleSide});
  const roadMat=material('#b3b4b5',.96),white=material('#e2e1d5'),red=material('#ba3436'),concrete=material('#b8b9b3'),steel=material('#71838b',.43,.6);
  G.roadMaterial=roadMat;const barrierMat=concrete.clone();
  const texCanvas=document.createElement('canvas');texCanvas.width=texCanvas.height=256;const tx=texCanvas.getContext('2d'),pixels=tx.createImageData(256,256);let seed=1729;
  for(let i=0;i<pixels.data.length;i+=4){seed=(Math.imul(seed,1664525)+1013904223)>>>0;const v=105+(seed>>>27);pixels.data[i]=pixels.data[i+1]=pixels.data[i+2]=v;pixels.data[i+3]=255;}tx.putImageData(pixels,0,0);
  const asphalt=new T.CanvasTexture(texCanvas);asphalt.wrapS=asphalt.wrapT=T.RepeatWrapping;asphalt.repeat.set(4,4);asphalt.colorSpace=T.SRGBColorSpace;asphalt.anisotropy=Math.min(8,G.renderer.capabilities.getMaxAnisotropy());roadMat.map=asphalt;roadMat.bumpMap=asphalt;roadMat.bumpScale=.012;G.proceduralAsphalt=asphalt;
  const mesh=(geometry,mat,parent=world)=>{const m=new T.Mesh(geometry,mat);m.castShadow=true;m.receiveShadow=true;parent.add(m);return m;};
  const heights=G.elevationOn?S.elevation:null;
  const heightAt=k=>heights?lerp(heights,Math.max(0,Math.min(S.n-1,k))):0;G.heightAt=heightAt;
  S.edges.forEach((e,i)=>e.height=heightAt(i));
  const roadEdges=S.canonicalEdges||S.edges;
  if(S.canonicalEdges)roadEdges.forEach((e,i)=>{const u=((i/(S.n-1)-S.registration.phase)*S.registration.dir%1+1)%1;e.height=heightAt(u*(S.n-1));});
  const point=(e,o,y)=>[e.p.x+e.rx*o,y+(e.height||0),e.p.z+e.rz*o];
  const box=(parent,x,y,z,w,h,d,mat)=>{const m=mesh(new T.BoxGeometry(w,h,d),mat,parent);m.position.set(x,y,z);return m;};
  if(S.track&&typeof MexicoV3!=='undefined'){MexicoV3.build(T,G,S);}else{
  const point=(e,o,y)=>[e.p.x+e.rx*o,y+(e.height||0),e.p.z+e.rz*o];
  const batches=new Map();function quad(mat,a,b,c,d){if(!batches.has(mat))batches.set(mat,[]);batches.get(mat).push(...a,...b,...c,...a,...c,...d);}
  let distance=0;const positions=[],uvs=[];
  for(let i=0;i<S.n-1;i++){
    const a=roadEdges[i],b=roadEdges[i+1],len=Math.hypot(a.p.x-b.p.x,a.p.z-b.p.z);
    const l=point(a,-7,.02),r=point(a,7,.02),nl=point(b,-7,.02),nr=point(b,7,.02);
    positions.push(...l,...nl,...r,...r,...nl,...nr);uvs.push(0,distance/15,0,(distance+len)/15,14/15,distance/15,14/15,distance/15,0,(distance+len)/15,14/15,(distance+len)/15);distance+=len;
    for(const sign of [-1,1]){
      quad(concrete,point(a,sign*7.2,-.02),point(b,sign*7.2,-.02),point(b,sign*(S.profile.barrier+6),-.02),point(a,sign*(S.profile.barrier+6),-.02));
      quad(white,point(a,sign*6.94,.04),point(b,sign*6.94,.04),point(b,sign*7.1,.04),point(a,sign*7.1,.04));
      const off=sign*S.profile.barrier;
      quad(barrierMat,point(a,off,0),point(b,off,0),point(b,off,1.05),point(a,off,1.05));
      quad(white,point(a,off,1.05),point(b,off,1.05),point(b,off+sign*.25,1.05),point(a,off+sign*.25,1.05));
      const bend=Math.abs(a.rx*b.rz-a.rz*b.rx);
      if(bend>.025){const pieces=Math.max(1,Math.ceil(len/1.5));for(let j=0;j<pieces;j++){const at=t=>({p:{x:a.p.x+(b.p.x-a.p.x)*t,z:a.p.z+(b.p.z-a.p.z)*t},rx:a.rx+(b.rx-a.rx)*t,rz:a.rz+(b.rz-a.rz)*t,height:a.height+(b.height-a.height)*t}),c=at(j/pieces),d=at((j+1)/pieces);quad((i+j)%2?red:white,point(c,sign*7.1,.045),point(d,sign*7.1,.045),point(d,sign*8,.045),point(c,sign*8,.045));}}
    }
  }
  const roadGeometry=new T.BufferGeometry();roadGeometry.setAttribute('position',new T.Float32BufferAttribute(positions,3));roadGeometry.setAttribute('uv',new T.Float32BufferAttribute(uvs,2));roadGeometry.computeVertexNormals();mesh(roadGeometry,roadMat).castShadow=false;
  for(const [mat,points] of batches){const geo=new T.BufferGeometry();geo.setAttribute('position',new T.Float32BufferAttribute(points,3));geo.computeVertexNormals();const m=mesh(geo,mat);m.castShadow=mat===barrierMat;m.userData.cameraObstacle=mat===barrierMat;}
  const terrainHeight=(x,z)=>{if(!heights)return -.3;let best=Infinity,second=Infinity,one=0,two=0;for(const e of S.edges){const d=(x-e.p.x)**2+(z-e.p.z)**2;if(d<best){second=best;two=one;best=d;one=e.height;}else if(d<second){second=d;two=e.height;}}const a=1/(best+4),b=1/(second+4);return (one*a+two*b)/(a+b)-.55;};
  const groundMat=material(S.profile.grass),ground=mesh(new T.PlaneGeometry(18000,18000),groundMat);ground.rotation.x=-Math.PI/2;ground.position.set((S.minX+S.maxX)/2,heights?-2:-.3,(S.minZ+S.maxZ)/2);ground.castShadow=false;
  if(heights){const width=S.maxX-S.minX+700,depth=S.maxZ-S.minZ+700,cx=(S.minX+S.maxX)/2,cz=(S.minZ+S.maxZ)/2,geo=new T.PlaneGeometry(width,depth,Math.min(128,Math.ceil(width/20)),Math.min(128,Math.ceil(depth/20)));geo.rotateX(-Math.PI/2);const points=geo.attributes.position;for(let i=0;i<points.count;i++){const x=points.getX(i)+cx,z=points.getZ(i)+cz;points.setXYZ(i,x,terrainHeight(x,z),z);}geo.computeVertexNormals();mesh(geo,groundMat).castShadow=false;}

  const box=(parent,x,y,z,w,h,d,mat)=>{const m=mesh(new T.BoxGeometry(w,h,d),mat,parent);m.position.set(x,y,z);return m;};
  const environment=new T.Group();world.add(environment);G.environment=environment;
  const trunkMat=material('#76654b'),leafMat=material('#46684b');leafMat.name='Vegetation';
  const windows=[],windowMatrix=new T.Matrix4();const glass=material('#526e7b',.25,.38),palettes=['#d1c3aa','#bbc3c5','#dbceb9','#acb3ba'].map(c=>material(c));
  for(const o of S.environment){const group=new T.Group();group.position.set(o.x,heights?terrainHeight(o.x,o.z):-.3,o.z);group.rotation.y=Math.atan2(-o.rz,o.rx);environment.add(group);
    if(o.kind==='building'){
      box(group,0,o.height/2,0,12,o.height,23,palettes[o.variant]);box(group,0,o.height+.15,0,12.5,.3,23.5,concrete);
      group.updateMatrixWorld();for(let level=2;level<o.height-1;level+=3)for(const sign of [-1,1])for(let z=-9;z<=9;z+=3){windowMatrix.makeTranslation(sign*6.025,level,z);windows.push(new T.Matrix4().multiplyMatrices(group.matrixWorld,windowMatrix));}
    }else{const trunk=mesh(new T.CylinderGeometry(.22,.35,4,5),trunkMat,group);trunk.position.y=2;for(let j=0;j<3;j++){const tree=mesh(new T.IcosahedronGeometry(2.3,1),leafMat,group);tree.position.set(Math.cos(j*2.1)*1.1,4.8+j*.55,Math.sin(j*2.1));tree.scale.set(1,.95+j*.1,.85);}}
  }
  if(windows.length){const panes=new T.InstancedMesh(new T.BoxGeometry(.04,1.4,1.5),glass,windows.length);windows.forEach((m,i)=>panes.setMatrixAt(i,m));panes.receiveShadow=true;environment.add(panes);}
  const fenceVertices=[];
  for(let i=0;i<S.n-1;i++)for(const sign of [-1,1]){const a=S.edges[i],b=S.edges[i+1],off=sign*(S.profile.barrier+.15);for(const y of [1.7,2.5,3.3])fenceVertices.push(...point(a,off,y),...point(b,off,y));if(i%2===0)fenceVertices.push(...point(a,off,1),...point(a,off,3.45));}
  const fenceGeo=new T.BufferGeometry();fenceGeo.setAttribute('position',new T.Float32BufferAttribute(fenceVertices,3));environment.add(new T.LineSegments(fenceGeo,new T.LineBasicMaterial({color:'#72838c',transparent:true,opacity:.55})));
  ghostCircuitDetails(S,environment,box,mesh,material,heightAt,T);
  ghostLandmarks(S,environment,box,mesh,material,heightAt,T);
  G.mergeStats=ghostMergeMeshes(environment,T,180);
  G.tiles=[];environment.traverse(o=>{if(o.userData.environmentTile)G.tiles.push(o);});
  G.detailStats=ghostMergeMeshes(G.detailEnvironment,T);
  }
  G.guideGroup=new T.Group();world.add(G.guideGroup);G.guideMarkers=[];
  for(const m of S.guides){
    const group=new T.Group();group.position.set(m.x,heightAt(m.k)+.09,m.z);G.guideGroup.add(group);
    const ring=mesh(new T.TorusGeometry(.65,.055,5,24),new T.MeshBasicMaterial({color:m.color}),group);ring.rotation.x=Math.PI/2;ring.castShadow=false;
    const canvas=document.createElement('canvas');canvas.width=256;canvas.height=64;const ctx=canvas.getContext('2d');ctx.fillStyle='#10202bdb';ctx.fillRect(0,0,256,64);ctx.fillStyle=m.color;ctx.textAlign='center';ctx.textBaseline='middle';ctx.font='bold 24px sans-serif';ctx.fillText('T'+m.n+' '+m.kind,128,32);
    const texture=new T.CanvasTexture(canvas);texture.colorSpace=T.SRGBColorSpace;const label=new T.Sprite(new T.SpriteMaterial({map:texture,transparent:true,depthTest:true}));label.position.y=1.65;label.scale.set(5.2,1.3,1);group.add(label);G.guideMarkers.push({group,label,marker:m});
  }
  G.traces=new T.Group();G.zones=new T.Group();world.add(G.traces,G.zones);
  [st.A,st.B].forEach((L,index)=>{
    const curve=new T.CatmullRomCurve3(S.paths[index].map((p,i)=>new T.Vector3(p.x,heightAt(i)+.095,p.z)));
    mesh(new T.TubeGeometry(curve,S.n,.075,3,false),new T.MeshBasicMaterial({color:index?COL.b:COL.a,transparent:true,opacity:.6}),G.traces).castShadow=false;
    const verts=[],side=index?1:-1;
    if(!L.quality.brake.missing)for(let i=0;i<S.n-1;i++)if(L.brk[i]>=.5){const a=S.edges[i],b=S.edges[i+1],p=point(a,side*.8,.07),q=point(b,side*.8,.07),r=point(b,side*4.8,.07),u=point(a,side*4.8,.07);verts.push(...p,...q,...r,...p,...r,...u);}
    if(verts.length){const geo=new T.BufferGeometry();geo.setAttribute('position',new T.Float32BufferAttribute(verts,3));geo.computeVertexNormals();mesh(geo,new T.MeshBasicMaterial({color:'#ff435f',transparent:true,opacity:.22,depthWrite:false,side:T.DoubleSide}),G.zones).castShadow=false;}
  });
  G.estimatedTrace=new T.Group();world.add(G.estimatedTrace);
  if(S.visual){const curve=new T.CatmullRomCurve3(S.visual.path.map((p,i)=>new T.Vector3(p.x,heightAt(i)+.11,p.z)));mesh(new T.TubeGeometry(curve,S.n,.085,3,false),new T.MeshBasicMaterial({color:'#ffd166',transparent:true,opacity:.62}),G.estimatedTrace).castShadow=false;}
  // A generic open-wheel model built for this demo; no third-party model or official livery.
  G.cars=[st.A,st.B].map((L,index)=>{
    const group=new T.Group();world.add(group);const color=[COL.a,COL.b][index],paint=material(color,.28,.33),carbon=material('#182027',.58,.15),rubber=material('#15191b',.94),rim=material('#89929b',.3,.75);
    
    box(group,0,.16,0,1.8,.14,4.7,carbon);
    const body=mesh(new T.SphereGeometry(1,24,12),paint,group);body.scale.set(.43,.47,1.65);body.position.set(0,.56,-.6);
    const nose=mesh(new T.CylinderGeometry(.12,.3,2.2,16),paint,group);nose.rotation.x=Math.PI/2;nose.position.set(0,.43,1.2);
    for(const sign of [-1,1]){const pod=mesh(new T.SphereGeometry(1,16,10),paint,group);pod.scale.set(.28,.28,1.05);pod.position.set(sign*.57,.48,-.25);box(group,sign*.91,.31,2.17,.05,.3,.64,paint);box(group,sign*.82,.87,-2.2,.05,.6,.52,paint);}
    for(const sign of [-1,1]){const inlet=mesh(new T.SphereGeometry(1,12,8),carbon,group);inlet.scale.set(.2,.12,.07);inlet.position.set(sign*.57,.64,.65);box(group,sign*.6,.7,-.35,.3,.045,1.1,paint);}
    const finGeometry=new T.BufferGeometry();finGeometry.setAttribute('position',new T.Float32BufferAttribute([0,.56,-1.9,0,1.12,-1.1,0,.64,-.3],3));finGeometry.computeVertexNormals();mesh(finGeometry,paint,group);
    box(group,0,.71,-.17,.5,.18,.85,carbon);const helmet=mesh(new T.SphereGeometry(.18,16,10),material('#e6e2ce',.35),group);helmet.position.set(0,.91,-.1);
    for(let j=0;j<3;j++)box(group,0,.22+j*.055,2.37-j*.13,1.95,.045,.18,j?paint:carbon);
    box(group,0,.96,-2.2,1.68,.1,.5,paint);box(group,0,.56,-2.15,.12,.7,.14,carbon);
    for(const side of [-1,1]){box(group,side*.55,.85,.25,.2,.09,.3,paint);box(group,side*.42,.76,.22,.04,.18,.04,carbon);}
    for(let fin=-2;fin<=2;fin++)box(group,fin*.22,.21,-2.3,.025,.22,.55,carbon);
    const haloPoints=[[-.34,.97,-.53],[-.35,1.02,.15],[0,1.04,.42],[.35,1.02,.15],[.34,.97,-.53]].map(p=>new T.Vector3(...p));mesh(new T.TubeGeometry(new T.CatmullRomCurve3(haloPoints),20,.035,6,false),carbon,group);
    const wheels=[];
    for(const x of [-.88,.88])for(const z of [-1.58,1.48]){const wheel=new T.Group();wheel.position.set(x,.39,z);wheel.userData.spins=true;group.add(wheel);const tyre=mesh(new T.CylinderGeometry(.37,.37,.36,24),rubber,wheel);tyre.rotation.z=Math.PI/2;const hub=mesh(new T.CylinderGeometry(.19,.19,.375,16),rim,wheel);hub.rotation.z=Math.PI/2;wheels.push(wheel);
      const side=Math.sign(x),ring=mesh(new T.TorusGeometry(.29,.014,5,32),material(COMP_HEX[L.meta.c]||'#566174',.8),wheel);ring.rotation.y=Math.PI/2;ring.position.x=side*.187;
      for(let spoke=0;spoke<5;spoke++){const a=spoke/5*Math.PI*2,bar=box(wheel,side*.192,Math.cos(a)*.095,Math.sin(a)*.095,.018,.024,.18,carbon);bar.rotation.x=-a;}
      for(const anchor of [-.24,.24]){const start=new T.Vector3(Math.sign(x)*.25,.3,z+anchor),end=new T.Vector3(x,.39,z),dir=end.clone().sub(start),arm=mesh(new T.CylinderGeometry(.025,.025,dir.length(),5),carbon,group);arm.position.copy(start.clone().add(end).multiplyScalar(.5));arm.quaternion.setFromUnitVectors(new T.Vector3(0,1,0),dir.normalize());}
    }
    group.traverse(o=>{if(o.material)o.material.userData.ghostSide=index;});group.userData.wheels=wheels;wheels.forEach(wheel=>ghostMergeMeshes(wheel,T));ghostMergeMeshes(group,T);return group;
  });
}
function ghost3dRender(S,poses,camera,target,w,h){
  const G=ghost3d;if(!G.ready)return false;
  try{
    const elevationOn=!!(!S.track&&S.elevation&&$('ghostElevation').checked);$('ghostElevation').disabled=!!S.track||!S.elevation;
    if(G.source!==st.A||G.elevationOn!==elevationOn){G.elevationOn=elevationOn;ghost3dBuild(S);}
    G.canvas.hidden=false;$('ghostCanvas').style.visibility='hidden';
    if(G.width!==w||G.height!==h){G.renderer.setSize(w,h,false);G.camera.aspect=w/h;G.camera.updateProjectionMatrix();G.width=w;G.height=h;}
    ghostApplyAssets(S);
    const heightA=G.heightAt(kAtTime(st.A,st.play.e)),heightB=G.heightAt(kAtTime(st.B,st.play.e)),focusHeight=ghost.camera==='b'?heightB:ghost.camera==='tv'?(heightA+heightB)/2:ghost.camera==='overview'?0:heightA;
    const nextNear=ghost.camera==='overview'?Math.max(.5,camera[1]/200):ghost.camera==='free'?Math.max(.5,camera[1]/300):.5;if(Math.abs(G.camera.near-nextNear)>.1){G.camera.near=nextNear;G.camera.updateProjectionMatrix();}
    G.camera.position.set(camera[0],camera[1]+focusHeight,camera[2]);G.camera.lookAt(target[0],target[1]+focusHeight,target[2]);
    G.guideGroup.visible=$('ghostGuides').checked;
    G.guideMarkers.forEach(({group,label,marker:m})=>{const near=Math.min(Math.hypot(m.x-poses[0].x,m.z-poses[0].z),Math.hypot(m.x-poses[1].x,m.z-poses[1].z));group.visible=ghost.camera==='overview'?m.kind==='APEKS':near<110;label.visible=ghost.camera!=='overview';});
    G.environment.visible=$('ghostEnvironment').checked;G.traces.visible=$('ghostTraces').checked&&!($('ghostEstimatedLine').checked&&S.visual);G.estimatedTrace.visible=$('ghostTraces').checked&&!!($('ghostEstimatedLine').checked&&S.visual);G.zones.visible=$('ghostZones').checked;
    poses.forEach((p,i)=>{const car=G.cars[i];const k=kAtTime(i?st.B:st.A,st.play.e),y=G.heightAt(k),slope=(G.heightAt(k+1)-G.heightAt(k-1))/(2*st.H.L/(S.n-1));car.position.set(p.x,y,p.z);car.rotation.order='YXZ';car.rotation.y=Math.atan2(p.fx,p.fz);car.rotation.x=-Math.atan(slope);car.userData.wheels.forEach(wheel=>wheel.rotation.x=-ReplayCore.distanceAt((i?st.B:st.A).source,st.play.e,(i?st.B:st.A).total)/.36);
      const distance=car.position.distanceTo(G.camera.position),quality=$('ghostRenderQuality').value,level=quality==='performance'?'low':quality==='ultra'&&distance<35?'high':distance<80?'medium':'low';if(car.userData.levels)for(const [name,obj]of Object.entries(car.userData.levels))obj.visible=name===level;
      const progress=ghostCurveAt(S.native[i].progress,st.play.e).v,step=8/(S.visual?.length||4304),before=S.visual?{x:ghostCurveAt(S.visual.x,Math.max(0,progress-step)).v,z:ghostCurveAt(S.visual.z,Math.max(0,progress-step)).v}:p,after=S.visual?{x:ghostCurveAt(S.visual.x,Math.min(1,progress+step)).v,z:ghostCurveAt(S.visual.z,Math.min(1,progress+step)).v}:p;const steer=Math.max(-.3,Math.min(.3,((after.x-p.x)*p.fz-(after.z-p.z)*p.fx)*.14));car.userData.steers?.forEach(o=>o.rotation.y=steer);if(G.carShadows?.[i]){G.carShadows[i].position.set(p.x,y+.025,p.z);G.carShadows[i].rotation.z=-car.rotation.y;}
    });
    const p=poses[0],now=performance.now(),quality=$('ghostRenderQuality').value,profile=GHOST_QUALITY[quality],detail=quality==='ultra';
    if(G.quality!==quality){G.quality=quality;G.adaptiveScale=profile.ratio;G.renderer.setPixelRatio(Math.min(devicePixelRatio||1,profile.ratio));G.renderer.setSize(w,h,false);const size=profile.shadow;if(G.sun.shadow.mapSize.x!==size){G.sun.shadow.map?.dispose();G.sun.shadow.map=null;G.sun.shadow.mapSize.set(size,size);}G.pendingRatio=null;G.roadMaterial.normalMap=quality==='performance'?null:(VisualAssets.textures.normal||null);G.roadMaterial.roughnessMap=quality==='performance'?null:(VisualAssets.textures.roughness||null);G.roadMaterial.needsUpdate=true;G.shadowStamp=0;G.fpsStamp=0;if(quality==='ultra')VisualAssets.high();}
    $('ghostAO').disabled=quality!=='ultra';
    for(const tile of G.tiles||[]){const center=tile.geometry.boundingSphere.center,limit=profile.far;tile.visible=ghost.camera==='overview'||Math.hypot(center.x-p.x,center.z-p.z)<limit+180;}
    G.detailEnvironment.visible=$('ghostEnvironment').checked&&quality!=='performance';if(S.track&&typeof MexicoV3!=='undefined')MexicoV3.update(G);if(S.track&&typeof MexicoV4!=='undefined')MexicoV4.update(G);
    const transparent=$('ghostTransparent').checked;
    if(G.transparent!==transparent){G.transparent=transparent;G.cars[1].traverse(o=>{if(o.material){o.material.transparent=transparent;o.material.opacity=transparent?.42:1;o.material.depthWrite=!transparent;o.material.forceSinglePass=transparent;o.material.needsUpdate=true;}if(o.isMesh)o.castShadow=!transparent;});}
    if(!st.play.on||now-(G.shadowStamp||0)>(detail?33:66)||Math.abs(st.play.e-(G.shadowTime||0))>.25){G.sun.position.set(p.x-100,65+heightA,p.z-70);G.sun.target.position.set(p.x,heightA,p.z);G.sun.target.updateMatrixWorld();G.sun.shadow.camera.updateProjectionMatrix();G.renderer.shadowMap.needsUpdate=true;G.shadowStamp=now;G.shadowTime=st.play.e;}
    G.sun.castShadow=profile.shadows&&ghost.camera!=='overview';
    G.scene.fog.near=ghost.camera==='overview'?5000:300;G.scene.fog.far=ghost.camera==='overview'?14000:1450;
    ghostResolution(w,h,profile);G.renderer.info.reset();GhostMetrics.poll();GhostMetrics.begin();const cpuStart=performance.now();GhostDirector.render();GhostMetrics.cpuMs=performance.now()-cpuStart;GhostMetrics.end();
    ghostPerformance(now);
    $('ghostEngine').title='Sabit çevre parçaları: '+G.mergeStats.before+' → '+G.mergeStats.after;
    $('ghostScenery').textContent=S.profile.name+' · '+(S.track?'coğrafi referans / ':'normalize telemetri / ')+(G.elevationOn?'tahmini eğim':'düz zemin')+' / temsili çevre';
    G.labels.forEach((label,i)=>{const v=G.labelVector.set(poses[i].x,G.heightAt(kAtTime(i?st.B:st.A,st.play.e))+1.7,poses[i].z).project(G.camera);label.hidden=Math.abs(v.x)>1||Math.abs(v.y)>1||v.z>1;label.style.left=(v.x*.5+.5)*w+'px';label.style.top=(-v.y*.5+.5)*h+'px';label.style.color=i?COL.b:COL.a;label.textContent=(i?'B · ':'A · ')+st.H.drivers[(i?st.B:st.A).meta.d].c;});
    if(!st.play.on||now-(G.miniStamp||0)>70){G.miniStamp=now;G.mini.hidden=false;const mg=G.mini.getContext('2d'),mw=160,mh=100,sc=Math.min(140/(S.maxX-S.minX||1),80/(S.maxZ-S.minZ||1)),map=p=>[80-(p.x-(S.minX+S.maxX)/2)*sc,50-(p.z-(S.minZ+S.maxZ)/2)*sc];mg.clearRect(0,0,mw,mh);mg.fillStyle='#101b26de';mg.fillRect(0,0,mw,mh);mg.strokeStyle='#a1b4bc';mg.lineWidth=2;mg.beginPath();S.edges.forEach((e,i)=>i?mg.lineTo(...map(e.p)):mg.moveTo(...map(e.p)));mg.stroke();poses.forEach((p,i)=>{mg.fillStyle=i?COL.b:COL.a;mg.beginPath();mg.arc(...map(p),3,0,Math.PI*2);mg.fill();});}
    return true;
  }catch(error){ghost3dFallback(error);return false;}
}

// Profiles change GPU cost without rebuilding telemetry, cars, or the circuit.
const GHOST_QUALITY={performance:{ratio:.85,shadow:512,shadows:false,far:320},balanced:{ratio:1.25,shadow:1024,shadows:true,far:600},ultra:{ratio:2,shadow:2048,shadows:true,far:1000}};
const ghostOrbit={yaw:0,pitch:.55,distance:65,target:null,drag:null};
function ghostCameraPose(S,poses,aspect){
  $('ghostCanvas').parentElement.classList.toggle('free-camera',ghost.camera==='free');
  const [A,B]=poses,zoom=Number($('ghostZoom').value)/100;
  if(ghost.camera==='cinematic'||ghost.camera==='compare'){const p=ghost.camera==='compare'?{x:(A.x+B.x)/2,z:(A.z+B.z)/2,fx:A.fx,fz:A.fz}:A,separation=Math.hypot(A.x-B.x,A.z-B.z),compare=ghost.camera==='compare',distance=(compare?16+separation*.9:6.4)/zoom,height=(compare?7+separation*.28:1.3)/zoom,side=compare?distance*.55:3.2;return {camera:[p.x-p.fx*distance+p.fz*side,height,p.z-p.fz*distance-p.fx*side],target:[p.x,.65,p.z]};}
  if(ghost.camera==='free'){
    if(!ghostOrbit.target){const state=ghost.cameraState;ghostOrbit.target=state?state.target.slice():[A.x,.6,A.z];if(state){const dx=state.camera[0]-state.target[0],dz=state.camera[2]-state.target[2],dy=state.camera[1]-state.target[1];ghostOrbit.distance=Math.max(5,Math.hypot(dx,dz,dy));ghostOrbit.yaw=Math.atan2(dx,dz);ghostOrbit.pitch=Math.asin(dy/ghostOrbit.distance);}}
    const r=ghostOrbit.distance/zoom,c=Math.cos(ghostOrbit.pitch),t=ghostOrbit.target;
    return {camera:[t[0]+Math.sin(ghostOrbit.yaw)*c*r,t[1]+Math.sin(ghostOrbit.pitch)*r,t[2]+Math.cos(ghostOrbit.yaw)*c*r],target:t.slice()};
  }
  ghostOrbit.target=null;
  if(ghost.camera==='overview'){
    const x=(S.minX+S.maxX)/2,z=(S.minZ+S.maxZ)/2;
    const height=Math.max(S.maxZ-S.minZ,(S.maxX-S.minX)/aspect)/(2*Math.tan(24*Math.PI/180))*1.25;
    return {camera:[x,height,z-1],target:[x,0,z]};
  }
  if(ghost.camera==='tv'){
    // Fixed trackside anchors, spaced by telemetry distance; look ahead to select the next camera.
    const progress=ghostCurveAt(S.native[0].progress,st.play.e).v;
    const slot=Math.floor(progress*st.H.L/240),k=Math.min(S.n-1,Math.round((slot*240+110)/st.H.L*(S.n-1))),e=S.edges[k];
    return {camera:[e.p.x+e.rx*31,11/zoom,e.p.z+e.rz*31],target:[(A.x+B.x)/2,.75,(A.z+B.z)/2]};
  }
  const p=ghost.camera==='b'?B:A,L=ghost.camera==='b'?st.B:st.A,speed=lerp(L.v,kAtTime(L,st.play.e)),dist=(8.5+speed*.008)/zoom;
  return {camera:[p.x-p.fx*dist,3.3/zoom,p.z-p.fz*dist],target:[p.x+p.fx*4.5,.65,p.z+p.fz*4.5]};
}
const ghostStage=$('ghostCanvas').parentElement;
ghostStage.addEventListener('pointerdown',e=>{if(ghost.camera!=='free'||e.target.closest('button'))return;GhostDirector.transition=null;ghost3d.canvas?.focus({preventScroll:true});ghostOrbit.drag={x:e.clientX,y:e.clientY,pan:e.shiftKey||e.button===2};ghostStage.setPointerCapture(e.pointerId);});
ghostStage.addEventListener('pointermove',e=>{if(!ghostOrbit.drag||ghost.camera!=='free')return;const dx=e.clientX-ghostOrbit.drag.x,dy=e.clientY-ghostOrbit.drag.y;if(ghostOrbit.drag.pan&&ghostOrbit.target){const scale=ghostOrbit.distance*.0015;ghostOrbit.target[0]-=(dx*Math.cos(ghostOrbit.yaw)+dy*Math.sin(ghostOrbit.yaw))*scale;ghostOrbit.target[2]+=(dx*Math.sin(ghostOrbit.yaw)-dy*Math.cos(ghostOrbit.yaw))*scale;}else{ghostOrbit.yaw-=dx*.006;ghostOrbit.pitch=Math.max(.07,Math.min(1.5,ghostOrbit.pitch+dy*.006));}ghostOrbit.drag={x:e.clientX,y:e.clientY,pan:ghostOrbit.drag.pan};drawAll();});
ghostStage.addEventListener('contextmenu',e=>{if(ghost.camera==='free')e.preventDefault();});
for(const type of ['pointerup','pointercancel','lostpointercapture'])ghostStage.addEventListener(type,()=>ghostOrbit.drag=null);
ghostStage.addEventListener('wheel',e=>{if(ghost.camera!=='free')return;e.preventDefault();ghostOrbit.distance=Math.max(5,Math.min(6000,ghostOrbit.distance*Math.exp(e.deltaY*.001)));drawAll();},{passive:false});
function ghostCircuitDetails(S,environment,box,mesh,material,heightAt,T){
  const G=ghost3d;G.detailEnvironment=new T.Group();environment.add(G.detailEnvironment);
  const seats=[material('#a34b42'),material('#e4e1cf'),material('#477969')],support=material('#899494',.6,.3),roof=material('#d9d9d0',.5,.2),dark=material('#17262c');
  const point=(e,offset,y)=>[e.p.x+e.rx*offset,y,e.p.z+e.rz*offset];
  // No geolocated architecture is claimed: keep stands clear of all telemetry segments.
  if(S.profile.mexico)for(let k=10;k<S.n-1;k+=48){
    const e=S.edges[k],offset=47,center=point(e,offset,0);
    if(S.edges.some(a=>Math.hypot(a.p.x-center[0],a.p.z-center[2])<29))continue;
    const stand=new T.Group();stand.position.set(center[0],heightAt(k),center[2]);stand.rotation.y=Math.atan2(-e.rz,e.rx);environment.add(stand);
    for(let row=0;row<7;row++)box(stand,row*.95,1+row*.65,0,1.15,.65,30,seats[row%3]);
    for(const z of [-13,0,13])box(stand,8,4,z,.35,8,.35,support);
    box(stand,3.5,8,0,12,.22,33,roof);
    // Repeated spectators are GPU instances, omitted by the performance profile.
    const crowd=new T.InstancedMesh(new T.BoxGeometry(.38,.7,.38),dark,84),matrix=new T.Matrix4();
    for(let i=0;i<84;i++){const row=Math.floor(i/12);matrix.makeTranslation(row*.95,1.7+row*.65,-13+(i%12)*2.3);crowd.setMatrixAt(i,matrix);}stand.updateMatrixWorld(true);crowd.applyMatrix4(stand.matrixWorld);G.detailEnvironment.add(crowd);
  }
  function sign(text,k,offset,width=3,height=1.5){
    const e=S.edges[Math.min(S.n-1,Math.max(0,k))],group=new T.Group();group.position.set(...point(e,offset,heightAt(k)));group.rotation.y=Math.atan2(e.rx,e.rz);environment.add(group);
    const canvas=document.createElement('canvas');canvas.width=512;canvas.height=128;const ctx=canvas.getContext('2d');ctx.fillStyle='#e5e8de';ctx.fillRect(0,0,512,128);ctx.fillStyle='#12302f';ctx.font='bold 62px sans-serif';ctx.textAlign='center';ctx.textBaseline='middle';ctx.fillText(text,256,64);
    const texture=new T.CanvasTexture(canvas);texture.colorSpace=T.SRGBColorSpace;
    const panel=mesh(new T.PlaneGeometry(width,height),new T.MeshStandardMaterial({map:texture,roughness:.85,side:T.DoubleSide}),group);panel.position.y=height/2+1;
    box(group,0,.8,0,.09,1.6,.09,support);
  }
  if(S.profile.mexico){
    sign('TUR DÜELLOSU',Math.round(S.n*.03),-25,14,2.2);
    sign('MÉXICO',Math.round(S.n*.58),25,12,2.2);
    for(const c of st.H.corners){if(+c.n%3!==1)continue;for(const d of [150,100,50]){const k=Math.round(c.r*(S.n-1)-d/st.H.L*(S.n-1));if(k>0)sign(String(d),k,-11,1.2,1.3);}}
    // Start stripe follows the inferred track normal, with no claim of survey accuracy.
    const start=S.edges[1],group=new T.Group();group.position.set(start.p.x,heightAt(1)+.065,start.p.z);group.rotation.y=Math.atan2(-start.rz,start.rx);environment.add(group);
    for(let x=0;x<14;x++)for(let z=0;z<2;z++)box(group,x-6.5,0,z*.5,.98,.015,.48,(x+z)%2?dark:roof);
  }
}
function ghostPerformance(now){
  const G=ghost3d,panel=$('ghostStats');panel.hidden=!$('ghostStatsToggle').checked;$('ghostExport').hidden=panel.hidden;
  if(!st.play.on){G.fpsStamp=0;G.lastFrame=0;}
  else{
    if(!G.fpsStamp){G.fpsStamp=now;G.frames=0;G.frameSum=0;G.intervals=0;G.frameMax=0;}
    if(G.lastFrame){const ms=now-G.lastFrame;GhostMetrics.record(ms);G.frameSum+=ms;G.intervals=(G.intervals||0)+1;G.frameMax=Math.max(G.frameMax,ms);}G.lastFrame=now;G.frames++;
    if(now-G.fpsStamp>=1000){G.measuredFps=G.frames*1000/(now-G.fpsStamp);G.measuredMs=G.frameSum/Math.max(1,G.intervals);G.maxMs=G.frameMax;
      // Adjust only rendering resolution. Hysteresis avoids oscillation at a threshold.
      const cap=Math.min(devicePixelRatio||1,GHOST_QUALITY[G.quality].ratio),current=Math.min(cap,G.adaptiveScale);
      const next=$('ghostAdaptive').checked?(G.measuredFps<42?Math.max(.6,current-.1):G.measuredFps>57?Math.min(cap,current+.05):current):cap;
      if(Math.abs(next-current)>.01)G.pendingRatio=next;
      G.fpsStamp=now;G.frames=0;G.frameSum=0;G.intervals=0;G.frameMax=0;
    }
  }
  if(!G.lastPanel||now-G.lastPanel>250||!st.play.on){G.lastPanel=now;
    const info=G.renderer.info;
    panel.textContent=(st.play.on?(G.measuredFps?.toFixed(1)||'…')+' FPS':'DURAKLATILDI')+' · '+(G.measuredMs?.toFixed(1)||'—')+' ms\nDraw calls '+info.render.calls+' · Üçgen '+info.render.triangles.toLocaleString('tr-TR')+'\nGeometri '+info.memory.geometries+' · Doku '+info.memory.textures+'\nRender '+G.canvas.width+' × '+G.canvas.height+' · '+G.quality+'\nCPU çizim '+GhostMetrics.cpuMs.toFixed(1)+' ms · GPU '+(GhostMetrics.gpuMs?.toFixed(1)||'desteklenmiyor')+' ms'+'\nVarlık '+(VisualAssets.state==='ready'?'GLB / Meshopt':'temsili yedek')+' · '+(st.A.source.stationInfo?.valid?'pist hizalı':'normalize mesafe');
    $('ghostEngine').textContent='WebGL · '+(st.play.on&&G.measuredFps?G.measuredFps.toFixed(0)+' FPS':G.quality);
  }
}
window.addEventListener('pagehide',e=>{if(e.persisted)return;GhostDirector.dispose();GhostMetrics.dispose();ghostDisposeWorld();VisualAssets.dispose();ghost3d.lightTarget?.dispose();ghost3d.sky?.geometry.dispose();ghost3d.sky?.material.dispose();ghost3d.renderer?.dispose();});
