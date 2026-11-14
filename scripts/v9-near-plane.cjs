// Diagnostic only: visible triangle/near-plane intersection inside the viewport.
function inspectNearPlane(T,root,camera){
 root.updateWorldMatrix(true,true);camera.updateMatrixWorld(true);
 const near=camera.near,projection=camera.projectionMatrix.elements,matrix=new T.Matrix4();
 const vertices=[new T.Vector3(),new T.Vector3(),new T.Vector3()],byMaterial={};let cuts=0,meshes=0;
 function crossesViewport(a,b){
  let lo=0,hi=1;
  for(let k=0;k<2;k++){
   const d=b[k]-a[k];
   if(Math.abs(d)<1e-12){if(a[k]<-1||a[k]>1)return false;continue;}
   const x=(-1-a[k])/d,y=(1-a[k])/d;lo=Math.max(lo,Math.min(x,y));hi=Math.min(hi,Math.max(x,y));if(lo>hi)return false;
  }
  return true;
 }
 root.traverse(o=>{
  if(!o.isMesh||!o.geometry?.attributes.position||!o.layers.test(camera.layers))return;
  for(let p=o;p;p=p.parent){if(!p.visible)return;if(p===root)break;}
  meshes++;const g=o.geometry,a=g.attributes.position,index=g.index,total=index?index.count:a.count;
  const begin=Math.max(0,g.drawRange.start),end=Math.min(total,begin+g.drawRange.count);
  matrix.multiplyMatrices(camera.matrixWorldInverse,o.matrixWorld);
  for(let i=begin;i+2<end;i+=3){
   for(let j=0;j<3;j++)vertices[j].fromBufferAttribute(a,index?index.getX(i+j):i+j).applyMatrix4(matrix);
   const depth=vertices.map(v=>-v.z);if(Math.min(...depth)>=near-1e-7||Math.max(...depth)<=near+1e-7)continue;
   const points=[];
   for(let j=0;j<3;j++){
    const k=(j+1)%3,d=depth[j]-near,e=depth[k]-near;
    if(d*e<0){const t=d/(d-e),x=vertices[j].x+(vertices[k].x-vertices[j].x)*t,y=vertices[j].y+(vertices[k].y-vertices[j].y)*t;points.push([x/near*projection[0],y/near*projection[5]]);}
   }
   if(points.length===2&&crossesViewport(points[0],points[1])){cuts++;const name=o.material?.name||'unnamed';byMaterial[name]=(byMaterial[name]||0)+1;}
  }
 });
 return {cuts,byMaterial,visibleMeshes:meshes};
}
module.exports={inspectNearPlane};
