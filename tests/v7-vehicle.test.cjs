const {test}=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),crypto=require('node:crypto');
async function io(){const {NodeIO}=await import('@gltf-transform/core'),{ALL_EXTENSIONS}=await import('@gltf-transform/extensions'),{MeshoptDecoder}=await import('meshoptimizer');await MeshoptDecoder.ready;return new NodeIO().registerExtensions(ALL_EXTENSIONS).registerDependencies({'meshopt.decoder':MeshoptDecoder});}
function bounds(node){const lo=[Infinity,Infinity,Infinity],hi=[-Infinity,-Infinity,-Infinity];node.traverse(n=>{if(!n.getMesh())return;const m=n.getWorldMatrix();for(const p of n.getMesh().listPrimitives()){const a=p.getAttribute('POSITION');for(let i=0;i<a.getCount();i++){const v=a.getElement(i,[]);for(let k=0;k<3;k++){const x=m[k]*v[0]+m[k+4]*v[1]+m[k+8]*v[2]+m[k+12];lo[k]=Math.min(lo[k],x);hi[k]=Math.max(hi[k],x);}}}});return {lo,hi};}
test('V7 three LODs stay inside the actual V6.1 triangle, primitive and download budgets',async()=>{
 const reader=await io();let previous=Infinity;
 for(const [level,triBudget,byteBudget]of [['high',59498,492552],['medium',40586,359992],['low',14606,151832]]){
  const file=`assets/v4/car-${level}.glb`,d=await reader.read(file);let triangles=0,primitives=0;
  for(const mesh of d.getRoot().listMeshes())for(const p of mesh.listPrimitives()){triangles+=(p.getIndices()?.getCount()||p.getAttribute('POSITION').getCount())/3;primitives++;const m=p.getMaterial();assert.ok(Number.isFinite(m.getRoughnessFactor()));assert.ok(p.getAttribute('NORMAL'));assert.ok(p.getAttribute('TEXCOORD_0'));}
  assert.ok(triangles<=triBudget&&triangles<previous,`${level}: ${triangles}`);assert.ok(primitives<=22);assert.ok(fs.statSync(file).size<=byteBudget);previous=triangles;
 }
});
test('V7 axle locations, tyre support, front/rear widths and steering hierarchy survive all exports',async()=>{
 const reader=await io();
 for(const level of ['high','medium','low']){
  const d=await reader.read(`assets/v4/car-${level}.glb`),wheels=d.getRoot().listNodes().filter(n=>n.getName().startsWith('Wheel_')&&!n.getMesh());assert.equal(wheels.length,4);
  for(const wheel of wheels){const front=wheel.getName().startsWith('Wheel_F'),side=wheel.getName().includes('-1')?-1:1,m=wheel.getWorldMatrix(),b=bounds(wheel);assert.ok(Math.abs(m[12]-side*.805)<.0001);assert.ok(Math.abs(m[13]-.36)<.0001);assert.ok(Math.abs(m[14]-(front?1.55:-1.77))<.0001);assert.ok(Math.abs(b.lo[1])<.001);assert.ok(Math.abs(b.hi[1]-.72)<.001);assert.ok(Math.abs((b.hi[0]-b.lo[0])-(front?.38:.42))<.004,'width including centre nut');assert.ok(wheel.getParentNode().getName().startsWith(front?'Steer_F':'Axle_R'));}
 }
});
test('V7 vehicle sources retain explicit provenance and match every shipped car digest',()=>{
 const meta=JSON.parse(fs.readFileSync('assets/v4/vehicle-v7-authoring.json')),sources=JSON.parse(fs.readFileSync('assets/v4/sources.json'));assert.equal(meta.original,true);assert.equal(meta.teamReplica,false);assert.equal(meta.tyreRadius_m,.36);assert.match(meta.suspension,/no suspension physics/);
 for(const level of ['high','medium','low']){const file=`assets/v4/car-${level}.glb`,entry=sources.find(x=>x.file===file);assert.equal(entry.source,'art/blender/build_v7.py');assert.equal(entry.sha256,crypto.createHash('sha256').update(fs.readFileSync(file)).digest('hex'));}
 const blend=fs.readFileSync('art/blender/vehicle-v7.blend');assert.ok(blend.subarray(0,7).toString()==='BLENDER'||blend.readUInt32LE(0)===0xfd2fb528,'Blender raw or Zstandard-compressed source');
});
