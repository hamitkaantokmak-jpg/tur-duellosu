const {test}=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs');
test('user-requested halo removal leaves its ring/pillar volumes empty in every GLB LOD without increasing budgets',async()=>{
 const {NodeIO}=await import('@gltf-transform/core'),{ALL_EXTENSIONS}=await import('@gltf-transform/extensions'),{MeshoptDecoder}=await import('meshoptimizer');await MeshoptDecoder.ready;const io=new NodeIO().registerExtensions(ALL_EXTENSIONS).registerDependencies({'meshopt.decoder':MeshoptDecoder});
 for(const [level,budget,byteBudget]of [['high',32264,276916],['medium',27264,255352],['low',12524,132232]]){
  const file=`assets/v4/car-${level}.glb`,d=await io.read(file);let ring=0,pillar=0,triangles=0,primitives=0;
  for(const mesh of d.getRoot().listMeshes())for(const p of mesh.listPrimitives()){triangles+=(p.getIndices()?.getCount()||p.getAttribute('POSITION').getCount())/3;primitives++;}
  for(const node of d.getRoot().listNodes())for(const p of node.getMesh()?.listPrimitives()||[]){const a=p.getAttribute('POSITION'),m=node.getWorldMatrix();for(let i=0;i<a.getCount();i++){const v=a.getElement(i,[]),x=m[0]*v[0]+m[4]*v[1]+m[8]*v[2]+m[12],y=m[1]*v[0]+m[5]*v[1]+m[9]*v[2]+m[13],z=m[2]*v[0]+m[6]*v[1]+m[10]*v[2]+m[14];if(Math.abs(x)>.18&&Math.abs(x)<.38&&y>.88&&z>.05&&z<.72)ring++;if(Math.abs(x)<.06&&y>.65&&z>.58&&z<.8)pillar++;}}
  assert.equal(ring,0,level+' halo ring');assert.equal(pillar,0,level+' halo pillar');assert.ok(triangles<budget);assert.ok(primitives<=22);assert.ok(fs.statSync(file).size<=byteBudget);
 }
 assert.equal(JSON.parse(fs.readFileSync('assets/v4/vehicle-v7-authoring.json')).halo,false);
});
