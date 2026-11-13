const {test}=require('node:test'),assert=require('node:assert/strict'),{inspectNearPlane}=require('./helpers/camera-near-plane.cjs');
test('camera audit counts only near-plane crossings projected inside the viewport',async()=>{
 const T=await import('three'),camera=new T.PerspectiveCamera(60,1,.5,100),root=new T.Group();
 function triangle(points){const g=new T.BufferGeometry();g.setAttribute('position',new T.Float32BufferAttribute(points,3));const m=new T.Mesh(g,new T.MeshBasicMaterial({side:T.DoubleSide}));root.add(m);return m;}
 const crossing=triangle([-.1,0,-.2,.1,0,-.8,0,.1,-.8]);
 triangle([5,5,-.2,6,5,-.8,5,6,-.8]);triangle([-.1,0,-1,.1,0,-1,0,.1,-1]);
 assert.equal(inspectNearPlane(T,root,camera).cuts,1);crossing.visible=false;assert.equal(inspectNearPlane(T,root,camera).cuts,0);crossing.visible=true;camera.near=.08;camera.updateProjectionMatrix();assert.equal(inspectNearPlane(T,root,camera).cuts,0);
});
test('camera audit respects indexed geometry, world transforms, layers and hidden ancestors',async()=>{
 const T=await import('three'),camera=new T.PerspectiveCamera(60,1,.5,100),root=new T.Group(),parent=new T.Group();root.add(parent);const g=new T.BufferGeometry();g.setAttribute('position',new T.Float32BufferAttribute([-.1,0,-.2,.1,0,-.8,0,.1,-.8],3));g.setIndex([0,1,2]);const mesh=new T.Mesh(g,new T.MeshBasicMaterial());parent.add(mesh);
 assert.equal(inspectNearPlane(T,root,camera).cuts,1);parent.position.x=10;assert.equal(inspectNearPlane(T,root,camera).cuts,0);parent.position.x=0;mesh.layers.set(1);assert.equal(inspectNearPlane(T,root,camera).cuts,0);mesh.layers.set(0);parent.visible=false;assert.equal(inspectNearPlane(T,root,camera).cuts,0);
});
