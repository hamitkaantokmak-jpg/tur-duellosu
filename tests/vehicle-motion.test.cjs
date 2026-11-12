const {test}=require('node:test'),assert=require('node:assert/strict'),M=require('../src/vehicle-motion.js');
const constant=(a,y=0,v=50)=>M.build(4,(t,o)=>Object.assign(o,{speed:v,acceleration:a,yawRate:y}));
test('visual pitch has correct brake/acceleration sign and bounded magnitude',()=>{
 assert.ok(M.sample(constant(-12),2,{}).pitch>0);assert.ok(M.sample(constant(8),2,{}).pitch<0);
 for(const a of [-1e6,1e6])assert.ok(Math.abs(M.sample(constant(a),2,{}).pitch)<=M.LIMITS.pitch);
});
test('turns lean outward; steering vanishes at rest, all limits finite',()=>{
 const r=M.sample(constant(0,.3),2,{}),l=M.sample(constant(0,-.3),2,{});
 assert.ok(r.roll>0&&r.steer>0&&l.roll<0&&l.steer<0);
 assert.ok(Math.abs(r.roll)<=M.LIMITS.roll&&Math.abs(r.steer)<=M.LIMITS.steer);
 assert.equal(M.sample(constant(0,20,0),2,{}).steer,0);
 assert.deepEqual(M.sample(constant(NaN,NaN,NaN),2,{}),{pitch:0,roll:0,steer:0});
});
test('abrupt input is filtered and output derivative is bounded',()=>{
 const table=M.build(3,(t,o)=>Object.assign(o,{speed:50,acceleration:t<1?20:-20,yawRate:t<1?-.8:.8}));
 for(let t=.001;t<3;t+=.007){const a=M.sample(table,t,{}),b=M.sample(table,t+.001,{});for(const k of ['pitch','roll','steer'])assert.ok(Math.abs(b[k]-a[k])<=2*M.LIMITS[k]/M.LIMITS.tau*.001+1e-10);}
});
test('replay-time integration is identical across FPS, rates, pause and backward seeks',()=>{
 const table=M.build(8,(t,o)=>Object.assign(o,{speed:40+10*Math.sin(t),acceleration:10*Math.cos(t),yawRate:.12*Math.sin(t*3)}));
 const expected=M.sample(table,4.25,{}),out={};
 for(const fps of [15,30,60,144])for(const rate of [.25,1,2,4]){
  for(let t=0;t<4.25;t+=rate/fps)M.sample(table,t,out);
  assert.deepEqual(M.sample(table,4.25,out),expected);
  M.sample(table,7,out);M.sample(table,0,out);assert.deepEqual(M.sample(table,4.25,out),expected);
 }
 assert.deepEqual(M.sample(table,100,{}),M.sample(table,8,{}));assert.deepEqual(M.sample(table,-1,{}),M.sample(table,0,{}));
});
