const {test}=require('node:test'),assert=require('node:assert/strict');
const api=require('../src/track-topography.js');
const fixture=require('./fixtures/synthetic-topography.cjs');
const line=u=>({x:200*Math.cos(u*2*Math.PI),z:200*Math.sin(u*2*Math.PI)});
const surface=profile=>api.create({length:4304,centerline:line,profile});
const near=(a,b,t=1e-6)=>assert.ok(Math.abs(a-b)<t,`${a} != ${b}`);
test('flat surface preserves horizontal positions, yaw and zero root height',async()=>{
 const s=surface(),T=await import('three');assert.equal(s.flat,true);
 for(let d=0;d<4304;d+=13){const f=s.sampleAtDistance(d);near(f.position.y,0);near(f.gradient,0);near(f.surfaceNormal.y,1);
 const q=api.orientation(T,f.surfaceNormal,.6,.8),v=new T.Vector3(0,0,1).applyQuaternion(q);near(v.x,.6);near(v.y,0);near(v.z,.8);}
});
test('ascending and descending normals give correct quaternion pitch and bank roll',async()=>{
 const s=surface(fixture),T=await import('three');
 assert.ok(s.sampleAtDistance(300).gradient>0);assert.ok(s.sampleAtDistance(750).gradient<0);
 for(const d of [300,750,800,2200]){
  const f=s.sampleAtDistance(d),h=Math.hypot(f.tangent.x,f.tangent.z),q=api.orientation(T,f.surfaceNormal,f.tangent.x/h,f.tangent.z/h);
  const forward=new T.Vector3(0,0,1).applyQuaternion(q),up=new T.Vector3(0,1,0).applyQuaternion(q);
  near(up.distanceTo(new T.Vector3(...Object.values(f.surfaceNormal))),0);
  if(Math.abs(f.gradient)>1e-8)assert.equal(Math.sign(forward.y),Math.sign(f.gradient));else near(forward.y,0);near(api.dot(f.tangent,f.surfaceNormal),0);near(api.dot(f.right,f.surfaceNormal),0);
  const crossfall=(s.sampleAtDistance(d,2).position.y-s.sampleAtDistance(d,-2).position.y)/4;near(crossfall,Math.tan(f.banking));
 }
});
test('closed loop has continuous elevation, derivative, banking, normals and quaternion hemispheres',async()=>{
 const s=surface(fixture),T=await import('three');
 for(const d of [0,80,340,560,950,2200,4304]){
  const a=s.sampleAtDistance(d-1e-5),b=s.sampleAtDistance(d+1e-5);
  near(a.position.y,b.position.y,1e-4);near(a.gradient,b.gradient,1e-3);near(a.banking,b.banking,1e-5);
  const qa=api.orientation(T,a.surfaceNormal,a.tangent.x,a.tangent.z),qb=api.orientation(T,b.surfaceNormal,b.tangent.x,b.tangent.z);assert.ok(Math.abs(qa.dot(qb))>.9999);
 }
 assert.deepEqual(s.sampleAtDistance(0),s.sampleAtDistance(4304));
});
test('sampled elevations remain finite, bounded and stable over negative and multi-lap queries',()=>{
 const s=surface(fixture);
 for(let d=-9000;d<9000;d+=1.37){const f=s.sampleAtDistance(d,3);for(const k of ['gradient','banking','width'])assert.ok(Number.isFinite(f[k]));assert.ok(f.elevation>=-1e-7&&f.elevation<=40.000001);near(Math.hypot(...Object.values(f.surfaceNormal)),1);}
 for(const d of [NaN,Infinity,-Infinity])assert.throws(()=>s.sampleAtDistance(d));
});
test('provenance, finite samples, monotone distances and seam are validated',()=>{
 for(const mutate of [p=>p.metadata.license=null,p=>p.samples[3].elevation=NaN,p=>p.samples[3].distance=0,p=>p.samples.at(-1).elevation=4,p=>p.samples[2].banking=1]){
  const p=structuredClone(fixture);mutate(p);assert.throws(()=>surface(p));
 }
});
test('independent station length does not rescale XY or reinterpret telemetry metres',()=>{
 const a=api.create({length:1000,centerline:line}),b=api.create({length:2000,centerline:line,resolution:4});
 for(let u=0;u<1;u+=.03){near(a.sampleAtDistance(u*1000).position.x,b.sampleAtDistance(u*2000).position.x);near(a.sampleAtDistance(u*1000).position.z,b.sampleAtDistance(u*2000).position.z);}
});
test('surface ribbons and kerb offsets have finite nonzero upward triangles',()=>{
 const s=surface(fixture),dot=(a,b)=>a.x*b.x+a.y*b.y+a.z*b.z;
 let triangles=0;
 for(let d=0;d<4304;d+=2)for(const [left,right] of [[-7,7],[7.06,8.05],[-8.05,-7.06]]){
  const a=s.sampleAtDistance(d,left),b=s.sampleAtDistance(d+2,left),c=s.sampleAtDistance(d,right);
  const ab={x:b.position.x-a.position.x,y:b.position.y-a.position.y,z:b.position.z-a.position.z},ac={x:c.position.x-a.position.x,y:c.position.y-a.position.y,z:c.position.z-a.position.z};
  const normal=api.cross(ab,ac);assert.ok(Math.hypot(...Object.values(normal))>1e-5);assert.ok(dot(normal,a.surfaceNormal)>0);triangles++;
  near(a.position.y,a.elevation+left*Math.tan(a.banking));
 }
 assert.equal(triangles,6456);
});
test('station-hinted projection stays on the requested branch at crossings',()=>{
 const s=api.create({length:1000,centerline:u=>({x:100*Math.sin(u*2*Math.PI),z:100*Math.sin(u*4*Math.PI)})});
 assert.ok(s.project(0,0,0).distance<5);assert.ok(Math.abs(s.project(0,0,500).distance-500)<5);
});

test('normal and heading validation reject nonfinite and degenerate orientations',async()=>{
 const T=await import('three');
 for(const v of [{x:NaN,y:1,z:0},{x:Infinity,y:1,z:0},{x:0,y:0,z:0}])assert.throws(()=>api.unit(v));
 assert.throws(()=>api.orientation(T,{x:0,y:0,z:1},0,1));
 for(const [x,z]of [[0,0],[NaN,1],[1,Infinity]])assert.throws(()=>api.orientation(T,{x:0,y:1,z:0},x,z));
});
test('banking limit, negative elevation and nonzero periodic seam remain finite',()=>{
 const profile={metadata:{...fixture.metadata},samples:[{distance:0,elevation:-20,banking:.35},{distance:100,elevation:25,banking:-.35},{distance:300,elevation:0,banking:.35},{distance:4304,elevation:-20,banking:.35}]};
 const s=surface(profile);
 for(let d=-50;d<4400;d+=.77){const f=s.sampleAtDistance(d,3);assert.ok(Math.abs(f.banking)<=.35000001);assert.ok(f.elevation>=-20.00001&&f.elevation<=25.00001);assert.ok(Object.values(f.surfaceNormal).every(Number.isFinite));}
 const a=s.sampleAtDistance(-1e-6),b=s.sampleAtDistance(1e-6);near(a.position.y,b.position.y,1e-5);near(a.gradient,b.gradient,1e-5);
 profile.samples[1].banking=-.350001;assert.throws(()=>surface(profile));
});
test('scalar height query agrees with the full surface without evaluating a normal',()=>{
 const s=surface(fixture);assert.throws(()=>surface().heightAt(NaN,0));assert.throws(()=>s.heightAt(0,Infinity));
 for(let d=0;d<4304;d+=17){const p=s.sampleAtDistance(d,2).position,q=s.project(p.x,p.z,d);near(s.heightAt(p.x,p.z,d),s.sampleAtDistance(q.distance,q.offset).position.y);}
});
test('profile input is snapshotted so later caller mutation cannot corrupt a cached surface',()=>{
 const p=structuredClone(fixture),s=surface(p),before=s.sampleAtDistance(300);
 p.samples[2].distance=0;p.samples[2].elevation=1e6;p.metadata.category='verified';
 assert.deepEqual(s.sampleAtDistance(300),before);assert.equal(s.metadata.category,'illustrative');
});
test('spatial grid proves the nearest segment even beyond its first occupied ring',()=>{
 const p=[[90,90],[200,200],[110,-10],[200,-200],[90,90]];
 const s=api.create({length:400,centerline:u=>{const k=u*4,i=Math.min(3,Math.floor(k)),f=k-i;return{x:p[i][0]+(p[i+1][0]-p[i][0])*f,z:p[i][1]+(p[i+1][1]-p[i][1])*f};}});
 let brute=Infinity;
 for(let i=0;i<s.points.length;i++){const a=s.points[i],b=s.points[(i+1)%s.points.length],dx=b.x-a.x,dz=b.z-a.z,t=Math.max(0,Math.min(1,-(a.x*dx+a.z*dz)/(dx*dx+dz*dz)));brute=Math.min(brute,(a.x+t*dx)**2+(a.z+t*dz)**2);}
 near(s.project(0,0).error,brute);
});
