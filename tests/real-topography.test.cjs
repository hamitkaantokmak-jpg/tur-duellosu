const {test}=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),crypto=require('node:crypto');
const real=require('../src/real-topography.js'),core=require('../src/replay-core.js'),topo=require('../src/track-topography.js');
const profiles=require('../assets/topography/profiles.json');
const hash=s=>crypto.createHash('sha256').update(s).digest('hex');
for(const [id,data]of Object.entries(profiles)){
 test(id+': recorded raw data and centerline match provenance digests',()=>{
  const rawText=fs.readFileSync(`assets/topography/sources/${id}-raw.json`,'utf8'),line=fs.readFileSync(`assets/topography/sources/${id}.geojson`,'utf8');
  assert.equal(hash(rawText),data.profile.metadata.rawSha256);assert.equal(hash(line),data.profile.metadata.centerlineSha256);
  const raw=JSON.parse(rawText);assert.ok(raw.rows.length>=100);assert.equal(raw.rows.length+1,data.profile.samples.length);
  if(id==='cota')for(const response of raw.responses)for(const p of response.response.samples){assert.equal(p.rasterId,116248);assert.equal(p.resolution,1);assert.ok(Number.isFinite(Number(p.value)));}
 });
 test(id+': geographic query points map to the exact horizontal station convention',()=>{
  const raw=require(`../assets/topography/sources/${id}-raw.json`),track=core.circuit(data.coordinates,data.length),[lon,lat]=data.coordinates[0],cos=Math.cos(lat*Math.PI/180);
  for(const p of raw.rows){const q=track.sample(p.distance/data.length);assert.ok(Math.abs((p.longitude-lon)*111320*cos*raw.scale-q.x)<1e-6);assert.ok(Math.abs(-(p.latitude-lat)*111320*raw.scale-q.z)<1e-6);}
 });
 test(id+': derived filter is reproducible; interpolant, seam and grades stay bounded',()=>{
  const raw=require(`../assets/topography/sources/${id}-raw.json`),n=raw.rows.length,{track,profile}=real.reference(data,core,topo),s=topo.create({length:data.length,centerline:u=>track.sample(u),profile});
  const smooth=i=>(raw.rows[(i+n-1)%n].elevation+2*raw.rows[i].elevation+raw.rows[(i+1)%n].elevation)/4,origin=smooth(0);
  profile.samples.slice(0,-1).forEach((p,i)=>{assert.ok(Math.abs(p.elevation-(smooth(i)-origin))<1e-10);assert.equal(p.kind,'filtered-dem');assert.equal(p.sourceIndex,i);});
  const min=Math.min(...profile.samples.map(p=>p.elevation)),max=Math.max(...profile.samples.map(p=>p.elevation));
  for(let d=-1;d<data.length+1;d+=.71){const f=s.sampleAtDistance(d);assert.ok(f.elevation>=min-1e-8&&f.elevation<=max+1e-8);assert.ok(Math.abs(f.gradient)<.30);assert.equal(f.banking,0);}
  const a=s.sampleAtDistance(-1e-6),b=s.sampleAtDistance(1e-6);assert.ok(Math.abs(a.elevation-b.elevation)<1e-5);assert.ok(Math.abs(a.gradient-b.gradient)<1e-5);
  assert.equal(s.length,data.length);assert.deepEqual(s.sampleAtDistance(0),s.sampleAtDistance(data.length));
 });
}
test('real terrain rejects missing provenance, invented bank, invalid coordinates and grades',()=>{
 for(const mutate of [d=>delete d.profile.metadata.verticalDatum,d=>d.profile.metadata.verticalUnit='ft',d=>d.profile.metadata.rawSha256='',d=>d.coordinates[0][0]=NaN,d=>d.profile.samples[2].banking=.01,d=>d.profile.samples[2].elevation=1000]){
  const d=structuredClone(profiles.cota);mutate(d);assert.throws(()=>real.reference(d,core,topo));
 }
});
test('Mexico has no production elevation and unsupported event cannot adopt a different track',()=>{
 global.REAL_TRACK_DATA=profiles;
 assert.equal(real.forEvent('Mexico City Grand Prix',core,topo),null);assert.equal(real.forEvent('Miami Grand Prix',core,topo),null);
 assert.equal(real.forEvent('United States Grand Prix',core,topo).profile.metadata.category,'derived');
});
