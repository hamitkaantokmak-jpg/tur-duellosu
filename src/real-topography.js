/* Offline-derived terrain, not an asphalt survey. No telemetry writes. */
(function(root){
 'use strict';
 function validate(data){
  const m=data?.profile?.metadata;
  if(!m||m.category!=='derived'||m.bankingStatus!=='unmeasured'||!m.source||!m.license||!m.horizontalCRS||!m.verticalDatum||m.verticalUnit!=='m'||!Number.isFinite(m.resolutionMeters)||m.resolutionMeters<=0||!m.centerlineSha256||!m.rawSha256)throw Error('Incomplete real terrain provenance');
  if(!Number.isFinite(data.length)||data.length<=0||data.coordinates.length<4||data.coordinates.some(p=>p.length!==2||!Number.isFinite(p[0])||!Number.isFinite(p[1])||Math.abs(p[0])>180||Math.abs(p[1])>90))throw Error('Invalid geographic reference');
  if(data.profile.samples.some(p=>p.banking!==0))throw Error('Unmeasured banking must stay zero');
  return data;
 }
 function reference(data,ReplayCore,TrackTopography){
  validate(data);const track=ReplayCore.circuit(data.coordinates,data.length);
  // Validate the full periodic interpolant once, not inside the render loop.
  const surface=TrackTopography.create({length:data.length,centerline:u=>track.sample(u),profile:data.profile});
  for(let d=0;d<data.length;d+=2)if(Math.abs(surface.sampleAtDistance(d).gradient)>.30)throw Error('Terrain grade exceeds acceptance bound');
  return {track,profile:data.profile};
 }
 const cache=new Map();
 function forEvent(event,ReplayCore,TrackTopography){
  const id=event==='United States Grand Prix'?'cota':event==='Belgian Grand Prix'?'spa':null;
  const data=id&&root.REAL_TRACK_DATA?.[id];if(!data||data.productionEnabled!==true)return null;
  if(!cache.has(id))cache.set(id,reference(data,ReplayCore,TrackTopography));return cache.get(id);
 }
 root.RealTopography={validate,reference,forEvent};
 if(typeof module!=='undefined')module.exports=root.RealTopography;
})(typeof globalThis!=='undefined'?globalThis:this);
