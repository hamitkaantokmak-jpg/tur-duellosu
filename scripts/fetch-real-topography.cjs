// Explicit offline acquisition; never run by the application or the test suite.
const fs=require('node:fs'),crypto=require('node:crypto');
const {circuit}=require('../src/replay-core.js');
const dir='assets/topography/sources';
const digest=s=>crypto.createHash('sha256').update(s).digest('hex');
async function json(url,body){
 for(let attempt=0;attempt<3;attempt++)try{
  const r=await fetch(url,body?{method:'POST',body:new URLSearchParams(body),signal:AbortSignal.timeout(45000)}:{signal:AbortSignal.timeout(45000)});
  if(!r.ok)throw Error('HTTP '+r.status);const v=await r.json();if(v.error)throw Error(JSON.stringify(v.error));return v;
 }catch(e){if(attempt===2)throw e;}
}
function stations(id,step){
 const text=fs.readFileSync(`${dir}/${id}.geojson`,'utf8'),feature=JSON.parse(text).features[0];
 const coordinates=feature.geometry.coordinates,length=feature.properties.length,model=circuit(coordinates,length);
 const cos=Math.cos(coordinates[0][1]*Math.PI/180),raw=coordinates.map(([x,y])=>({x:(x-coordinates[0][0])*111320*cos,z:-(y-coordinates[0][1])*111320}));
 let arc=0;for(let i=1;i<raw.length;i++)arc+=Math.hypot(raw[i].x-raw[i-1].x,raw[i].z-raw[i-1].z);
 const scale=length/arc,n=Math.ceil(length/step);
 return {id,length,centerlineSha256:digest(text),coordinates,scale,rows:Array.from({length:n},(_,i)=>{const d=i*length/n,p=model.sample(i/n);return {distance:d,longitude:coordinates[0][0]+p.x/scale/(111320*cos),latitude:coordinates[0][1]-p.z/scale/111320};})};
}
async function cota(){
 const data=stations('cota',20),base='https://elevation.nationalmap.gov/arcgis/rest/services/3DEPElevation/ImageServer';
 const responses=[];
 for(let i=0;i<data.rows.length;i+=48){
  const batch=data.rows.slice(i,i+48),params={f:'json',geometryType:'esriGeometryMultipoint',geometry:JSON.stringify({points:batch.map(p=>[p.longitude,p.latitude]),spatialReference:{wkid:4326}}),returnFirstValueOnly:'true',interpolation:'RSP_BilinearInterpolation',mosaicRule:JSON.stringify({mosaicMethod:'esriMosaicLockRaster',lockRasterIds:[116248]})};
  const response=await json(base+'/getSamples',params);responses.push({params,response});
  if(response.samples?.length!==batch.length)throw Error('Missing USGS samples');
  response.samples.forEach((s,j)=>{if(s.locationId!==j||s.rasterId!==116248||s.resolution!==1||!Number.isFinite(Number(s.value)))throw Error('Unexpected USGS response');Object.assign(batch[j],{elevation:Number(s.value),rasterId:s.rasterId});});
  console.log('COTA',Math.min(i+48,data.rows.length),data.rows.length);
 }
 return {...data,retrievedAt:new Date().toISOString(),endpoint:base+'/getSamples',responses};
}
async function spa(){
 const data=stations('spa',40),endpoint='https://geoservices.wallonie.be/arcgis/rest/services/RELIEF/WALLONIE_MNT_2021_2022/MapServer/identify';
 let next=0;const responses=new Array(data.rows.length);
 await Promise.all(Array.from({length:4},async()=>{while(next<data.rows.length){const i=next++,p=data.rows[i],params={f:'json',geometry:`${p.longitude},${p.latitude}`,geometryType:'esriGeometryPoint',sr:'4326',layers:'all:0',tolerance:'0',mapExtent:`${p.longitude-.0001},${p.latitude-.0001},${p.longitude+.0001},${p.latitude+.0001}`,imageDisplay:'100,100,96',returnGeometry:'false'};
  const response=await json(endpoint+'?'+new URLSearchParams(params));responses[i]={params,response};
  const value=response.results?.[0]?.attributes?.['Stretch.Pixel Value'];if(value===undefined||!Number.isFinite(Number(value)))throw Error('Missing Spa elevation '+i);
  p.elevation=Number(value);if(i%25===0)console.log('SPA',i,data.rows.length);
 }}));
 return {...data,retrievedAt:new Date().toISOString(),endpoint,responses};
}
module.exports={stations};
if(require.main===module)(async()=>{fs.mkdirSync(dir,{recursive:true});for(const id of process.argv.slice(2).length?process.argv.slice(2):['cota','spa']){const data=await ({cota,spa}[id])();fs.writeFileSync(`${dir}/${id}-raw.json`,JSON.stringify(data,null,2)+'\n');console.log(id,'range',Math.min(...data.rows.map(p=>p.elevation)),Math.max(...data.rows.map(p=>p.elevation)));}})().catch(e=>{console.error(e);process.exitCode=1;});
