const {test}=require('node:test'),assert=require('node:assert/strict');
const B=require('../src/barrier-batching.js');
async function fixture(count=8){
 const T=await import('three'),mat=new T.MeshBasicMaterial({side:T.DoubleSide}),base=new T.BoxGeometry(2,3,2).toNonIndexed().attributes.position.array;
 const parts=Array.from({length:count},(_,i)=>({mat,cell:[i,0],points:Array.from(base,(v,j)=>v+(j%3===0?i*5:j%3===2?-10:0))}));
 const packed=B.geometry(T,{parts}),g=packed.geometry;g.computeVertexNormals();const mesh=new T.Mesh(g,mat);mesh.updateMatrixWorld(true);const control=B.attach(T,mesh,packed.ranges);return{T,mat,parts,mesh,control};
}
function compare(T,mesh,ray){
 const actual=[],expected=[];mesh.raycast(ray,actual);T.Mesh.prototype.raycast.call(mesh,ray,expected);
 const sorted=a=>a.sort((x,y)=>x.distance-y.distance||x.faceIndex-y.faceIndex);sorted(actual);sorted(expected);
 assert.equal(actual.length,expected.length);
 for(let i=0;i<actual.length;i++){
  assert.equal(actual[i].object,mesh);assert.equal(actual[i].faceIndex,expected[i].faceIndex);
  assert.ok(Math.abs(actual[i].distance-expected[i].distance)<1e-9);assert.ok(actual[i].point.distanceTo(expected[i].point)<1e-9);
  assert.ok(actual[i].normal.distanceTo(expected[i].normal)<1e-9);
 }
}
test('render grouping preserves every Float32 triangle and material, including negative cells',async()=>{
 const {T,mat}=await fixture(),other=new T.MeshBasicMaterial();
 const entries=[[-2,-1],[-1,-1],[0,0],[1,0],[3,3],[4,0]].map((cell,i)=>({mat,cell,points:[i,0,0,i,1,0,i,0,1]}));entries.push({mat:other,points:[0,0,0,1,0,0,0,0,1]});
 const groups=B.group(entries,mat,true);assert.equal(groups.filter(g=>g.collision).length,3);assert.equal(groups.at(-1).mat,other);
 const triangles=parts=>parts.flatMap(p=>{const a=Array.from(new Float32Array(p.points)),out=[];for(let i=0;i<a.length;i+=9)out.push(a.slice(i,i+9).join(','));return out;}).sort();
 const actual=groups.flatMap(g=>{const p=B.geometry(T,g);assert.equal(p.geometry.attributes.position.count,g.parts.reduce((n,p)=>n+p.points.length/3,0));return[{points:Array.from(p.geometry.attributes.position.array)}];});
 assert.deepEqual(triangles(actual),triangles(entries));assert.ok(groups.filter(g=>g.collision).every(g=>g.mat===mat));
});
test('128m proxy ranges exactly match native triangles through transforms, inside rays and near/far',async()=>{
 const {T,mesh,control}=await fixture();mesh.position.set(4,2,-3);mesh.rotation.set(.1,.4,.05);mesh.scale.set(-1.2,.8,1.7);mesh.updateMatrixWorld(true);
 for(let i=0;i<160;i++){
  const origin=new T.Vector3(i%8*5,(i%5-2)*.5,i%3?-2:-10).applyMatrix4(mesh.matrixWorld),target=new T.Vector3(i%8*5,0,-10).applyMatrix4(mesh.matrixWorld),direction=target.sub(origin);if(direction.lengthSq()<1e-9)direction.set(0,0,-1);
  compare(T,mesh,new T.Raycaster(origin,direction.normalize(),i%4,i%2?30:3));
 }
 mesh.geometry.setDrawRange(36,72);compare(T,mesh,new T.Raycaster(new T.Vector3(5,0,0).applyMatrix4(mesh.matrixWorld),new T.Vector3(0,0,-1).transformDirection(mesh.matrixWorld),0,100));
 assert.ok(control.chunks.every(c=>c.mesh.geometry.attributes===mesh.geometry.attributes));assert.equal(mesh.children.length,0);
 mesh.layers.set(3);assert.equal(new T.Raycaster(new T.Vector3(),new T.Vector3(0,0,-1)).intersectObject(mesh,false).length,0);
});
test('ray bounds refresh on position changes and geometry replacement uses the native fallback',async()=>{
 const {T,mesh}=await fixture(2),ray=new T.Raycaster(new T.Vector3(),new T.Vector3(0,0,-1),0,100);compare(T,mesh,ray);
 const p=mesh.geometry.attributes.position;for(let i=0;i<36;i++)p.setX(i,p.getX(i)+30);p.needsUpdate=true;compare(T,mesh,ray);
 mesh.geometry=new T.BoxGeometry(2,2,2);mesh.position.z=-5;mesh.updateMatrixWorld(true);compare(T,mesh,ray);
});
test('off-ray ranges skip triangle raycasts while a near barrier remains exact',async()=>{
 const {T,mesh,control}=await fixture(1000);let narrow=0;
 for(const c of control.chunks){const original=c.mesh.raycast;c.mesh.raycast=function(...args){narrow++;return original.apply(this,args);};}
 compare(T,mesh,new T.Raycaster(new T.Vector3(),new T.Vector3(0,0,-1),0,20));assert.equal(narrow,1);
});
test('flat/synthetic grouping stays unchanged and disposal releases CPU proxies once',async()=>{
 const {T,mat,parts,mesh,control}=await fixture();assert.equal(B.group(parts,mat,false).length,parts.length);assert.ok(B.group(parts,mat,false).every(g=>g.parts.length===1&&!g.collision));
 const position=mesh.geometry.attributes.position;assert.ok(control.chunks.every(c=>c.mesh.geometry.attributes.position===position));
 mesh.geometry.dispose();assert.equal(control.chunks.length,0);assert.equal(mesh.raycast,T.Mesh.prototype.raycast);control.dispose();assert.equal(control.chunks.length,0);
});
