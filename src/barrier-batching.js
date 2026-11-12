/* Static render batching only. Terrain samples, triangles and materials stay intact.
   Collision keeps the original 128m ranges; its proxies never enter the scene. */
(function(root){
  'use strict';
  function group(entries,barrierMaterial,enabled){
    const result=[],cells=new Map();
    for(const entry of entries){
      if(!enabled||entry.mat!==barrierMaterial||!entry.cell){result.push({mat:entry.mat,parts:[entry]});continue;}
      const key=Math.floor(entry.cell[0]/4)+','+Math.floor(entry.cell[1]/4);
      let batch=cells.get(key);
      if(!batch){batch={mat:entry.mat,parts:[],collision:true};cells.set(key,batch);result.push(batch);}
      batch.parts.push(entry);
    }
    return result;
  }
  function geometry(T,batch){
    const positions=new Float32Array(batch.parts.reduce((n,p)=>n+p.points.length,0)),ranges=[];
    let offset=0;
    for(const part of batch.parts){
      positions.set(part.points,offset);ranges.push({start:offset/3,count:part.points.length/3});offset+=part.points.length;
    }
    const result=new T.BufferGeometry();result.setAttribute('position',new T.BufferAttribute(positions,3));
    return {geometry:result,ranges};
  }
  function attach(T,mesh,ranges){
    const geometry=mesh.geometry,original=mesh.raycast,vertexCount=ranges.reduce((n,r)=>n+r.count,0);
    const localRay=new T.Ray(),inverse=new T.Matrix4(),world=new T.Matrix4(),point=new T.Vector3();
    const chunks=[];let position=null,version=-1,attributes=null,disposed=false,worldValid=false;
    function refresh(){
      for(const chunk of chunks)chunk.mesh.geometry.dispose();chunks.length=0;
      position=geometry.attributes.position;version=position.version;attributes=geometry.attributes;
      geometry.computeBoundingBox();geometry.computeBoundingSphere();
      for(const range of ranges){
        const box=new T.Box3();
        for(let i=range.start;i<range.start+range.count;i++)box.expandByPoint(point.fromBufferAttribute(position,i));
        const proxyGeometry=new T.BufferGeometry();proxyGeometry.attributes=attributes;
        proxyGeometry.boundingBox=box;proxyGeometry.boundingSphere=box.getBoundingSphere(new T.Sphere());
        proxyGeometry.setDrawRange(range.start,range.count);
        const proxy=new T.Mesh(proxyGeometry,mesh.material);proxy.matrixAutoUpdate=false;
        chunks.push({mesh:proxy,start:range.start,count:range.count,box});
      }
    }
    refresh();
    function raycast(raycaster,hits){
      // Changes outside this static batching contract retain native correctness.
      if(disposed||this.geometry!==geometry||geometry.index||geometry.attributes.position.count!==vertexCount||Array.isArray(this.material)||
          geometry.morphAttributes.position?.length||geometry.drawRange.start%3!==0){
        return original.call(this,raycaster,hits);
      }
      if(position!==geometry.attributes.position||version!==position.version||attributes!==geometry.attributes)refresh();
      if(!worldValid||!world.equals(this.matrixWorld)){world.copy(this.matrixWorld);inverse.copy(world).invert();worldValid=true;}
      localRay.copy(raycaster.ray).applyMatrix4(inverse);
      if(!localRay.intersectsBox(geometry.boundingBox))return;
      const begin=geometry.drawRange.start,end=begin+geometry.drawRange.count;
      for(const chunk of chunks){
        if(!localRay.intersectsBox(chunk.box))continue;
        const start=Math.max(begin,chunk.start),stop=Math.min(end,chunk.start+chunk.count);if(stop<=start)continue;
        const proxy=chunk.mesh;proxy.geometry.attributes=geometry.attributes;proxy.geometry.setDrawRange(start,stop-start);
        proxy.material=this.material;proxy.matrixWorld.copy(this.matrixWorld);
        const first=hits.length;proxy.raycast(raycaster,hits);
        for(let i=first;i<hits.length;i++)hits[i].object=this;
      }
    }
    function dispose(){
      if(disposed)return;disposed=true;
      for(const chunk of chunks)chunk.mesh.geometry.dispose();chunks.length=0;
      if(mesh.raycast===raycast)mesh.raycast=original;
      geometry.removeEventListener('dispose',dispose);
    }
    mesh.raycast=raycast;geometry.addEventListener('dispose',dispose);
    return {chunks,dispose};
  }
  root.BarrierBatching={group,geometry,attach};
  if(typeof module!=='undefined')module.exports=root.BarrierBatching;
})(typeof globalThis!=='undefined'?globalThis:this);
