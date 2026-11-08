const {test}=require('node:test');const assert=require('node:assert/strict');const fs=require('node:fs');const vm=require('node:vm');
const context={};vm.createContext(context);for(const name of ['render-path','boundaries'])vm.runInContext(fs.readFileSync(`assets/tracks/v3/${name}.js`,'utf8'),context);
test('whole-lap display mesh and buffered race boundaries are closed, finite and simple',()=>{
 const path=context.MEXICO_RENDER_PATH;assert.equal(path.points.length,2153);assert.equal(path.elevation.measured,false);
 const cross=(a,b,c)=>(b[0]-a[0])*(c[1]-a[1])-(b[1]-a[1])*(c[0]-a[0]);
 for(const points of [path.points,...context.MEXICO_BOUNDARIES.map(b=>b.points)]){
  assert.ok(points.every(p=>p.every(Number.isFinite)));assert.ok(Math.hypot(points[0][0]-points.at(-1)[0],points[0][1]-points.at(-1)[1])<.01);
  for(let i=0;i<points.length-1;i++)for(let j=i+2;j<points.length-1;j++){
   if(i===0&&j===points.length-2)continue;
   const a=points[i],b=points[i+1],c=points[j],d=points[j+1];
   assert.ok(!(cross(a,b,c)*cross(a,b,d)<-1e-9&&cross(c,d,a)*cross(c,d,b)<-1e-9),`crossing segments ${i},${j}`);
  }
 }
});
