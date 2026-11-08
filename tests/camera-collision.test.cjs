const {test}=require('node:test'),assert=require('node:assert/strict');
const collision=require('../src/camera-collision.js');
const compare=(T,ray,objects)=>{for(const o of objects)if(o.isInstancedMesh)o.computeBoundingSphere();const actual=collision.closest(T,ray,objects),expected=ray.intersectObjects(objects,false)[0];assert.equal(!!actual,!!expected);if(expected){assert.ok(Math.abs(actual.distance-expected.distance)<1e-5,`${actual.distance} != ${expected.distance}`);assert.equal(actual.object,expected.object);assert.equal(actual.instanceId,expected.instanceId);}};
test('camera collision matches Three.js for transformed instances, inside origins, finite rays and layers',async()=>{
 const T=await import('three'),group=new T.Group(),geometry=new T.BoxGeometry(2,4,3),material=new T.MeshBasicMaterial({side:T.DoubleSide}),mesh=new T.InstancedMesh(geometry,material,20),matrix=new T.Matrix4();group.position.set(3,1,-4);group.rotation.y=.3;group.scale.set(1.3,.8,2);group.add(mesh);
 for(let i=0;i<20;i++){matrix.compose(new T.Vector3(i*5,0,(i%3)*6),new T.Quaternion().setFromAxisAngle(new T.Vector3(0,1,0),i*.2),new T.Vector3(1,1+i*.01,1));mesh.setMatrixAt(i,matrix);}mesh.instanceMatrix.needsUpdate=true;group.updateMatrixWorld(true);
 const regular=new T.Mesh(new T.SphereGeometry(2),material);regular.position.set(-10,2,0);regular.updateMatrixWorld(true);
 for(let i=0;i<180;i++){const origin=new T.Vector3(i%9*4-10,1+i%5,(i%13)*3-10),target=new T.Vector3((i%20)*5,1,(i%3)*6).applyMatrix4(mesh.matrixWorld),ray=new T.Raycaster(origin,target.sub(origin).normalize(),i%4,i%2?12:200);compare(T,ray,[regular,mesh]);}
 mesh.layers.set(2);compare(T,new T.Raycaster(new T.Vector3(3,1,-4),new T.Vector3(1,0,0),0,50),[mesh]);
});
test('camera cache refreshes when a world, instance buffer, geometry or count changes',async()=>{
 const T=await import('three'),mesh=new T.InstancedMesh(new T.BoxGeometry(2,2,2),new T.MeshBasicMaterial({side:T.DoubleSide}),2),matrix=new T.Matrix4();mesh.setMatrixAt(0,matrix.makeTranslation(0,0,-5));mesh.setMatrixAt(1,matrix.makeTranslation(0,0,-10));mesh.instanceMatrix.needsUpdate=true;mesh.updateMatrixWorld(true);const ray=new T.Raycaster(new T.Vector3(),new T.Vector3(0,0,-1),0,100);
 compare(T,ray,[mesh]);mesh.setMatrixAt(0,matrix.makeTranslation(20,0,-5));mesh.instanceMatrix.needsUpdate=true;compare(T,ray,[mesh]);mesh.count=1;compare(T,ray,[mesh]);mesh.position.x=-20;mesh.updateMatrixWorld(true);compare(T,ray,[mesh]);mesh.geometry=new T.BoxGeometry(8,8,8);compare(T,ray,[mesh]);collision.clear();compare(T,ray,[mesh]);
});
test('off-ray camera instances skip triangle intersection while retaining a real close wall',async()=>{
 const T=await import('three'),mesh=new T.InstancedMesh(new T.BoxGeometry(2,2,2),new T.MeshBasicMaterial(),1000),matrix=new T.Matrix4();for(let i=0;i<1000;i++)mesh.setMatrixAt(i,matrix.makeTranslation(i*5,0,-10));mesh.instanceMatrix.needsUpdate=true;mesh.updateMatrixWorld(true);const ray=new T.Raycaster(new T.Vector3(),new T.Vector3(0,0,-1),0,20);compare(T,ray,[mesh]);const entry=collision.cache.get(mesh),original=entry.proxy.raycast;let trianglesTested=0;entry.proxy.raycast=function(...args){trianglesTested++;return original.apply(this,args);};compare(T,ray,[mesh]);assert.equal(trianglesTested,1);
});
