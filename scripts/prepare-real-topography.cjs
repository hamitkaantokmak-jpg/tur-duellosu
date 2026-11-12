// Deterministic offline processing. Original service responses remain separate.
const fs=require('node:fs'),crypto=require('node:crypto');
const dir='assets/topography',hash=s=>crypto.createHash('sha256').update(s).digest('hex');
const configs={
 cota:{owner:'USGS',license:'US Government public domain; centerline MIT',source:'https://elevation.nationalmap.gov/arcgis/rest/services/3DEPElevation/ImageServer/116248',horizontalCRS:'Query EPSG:4326; service EPSG:3857',verticalDatum:'NAVD88',resolutionMeters:1,uncertainty:'Project QL2 specification: NVA RMSE <=0.10 m, not a local asphalt accuracy guarantee. Approximate centerline and 2017 acquisition add unquantified error.',label:'TÜRETİLMİŞ · USGS 2017 arazi modeli · 1 m grid · banking ölçülmedi'},
 spa:{owner:'Service public de Wallonie (SPW)',license:'CC-BY-4.0; centerline MIT',source:'https://geoportail.wallonie.be/catalogue/a004e570-99d6-4fe5-b83d-49b774409278.html',horizontalCRS:'Source EPSG:3812; query EPSG:4326 (server conversion)',verticalDatum:'DNG / EPSG:5710',resolutionMeters:.5,uncertainty:'Published regional absolute vertical accuracy ~0.12 m; approximate centerline, bridge exclusion and 2021-2022 acquisition add unquantified asphalt error.',label:'TÜRETİLMİŞ · © SPW 2021–2022 · CC BY 4.0 · arazi modeli · banking ölçülmedi'}
};
function prepare(id){
 const text=fs.readFileSync(`${dir}/sources/${id}-raw.json`,'utf8'),raw=JSON.parse(text),c=configs[id],n=raw.rows.length;
 const centerline=fs.readFileSync(`${dir}/sources/${id}.geojson`,'utf8');
 if(hash(centerline)!==raw.centerlineSha256)throw Error('Centerline digest mismatch');
 if(n<100||raw.rows.some((p,i)=>!Number.isFinite(p.elevation)||p.elevation<0||i&&p.distance<=raw.rows[i-1].distance))throw Error('Invalid source rows');
 // One symmetric circular [1,2,1]/4 filter; no invented control points, amplitude
 // scaling or clipping. Preserve raw heights and the exact filter residuals.
 const smooth=raw.rows.map((p,i)=>(raw.rows[(i+n-1)%n].elevation+2*p.elevation+raw.rows[(i+1)%n].elevation)/4),origin=smooth[0];
 const samples=smooth.map((v,i)=>({distance:raw.rows[i].distance,elevation:v-origin,banking:0,kind:'filtered-dem',sourceIndex:i}));
 samples.push({...samples[0],distance:raw.length,kind:'periodic-closure'});
 const result={id,length:raw.length,productionEnabled:true,coordinates:raw.coordinates,profile:{metadata:{category:'derived',...c,verticalUnit:'m',bankingStatus:'unmeasured',surface:'bare-earth DEM, not surveyed asphalt',retrievedAt:raw.retrievedAt,sourceSpacingMeters:raw.length/n,centerlineSha256:raw.centerlineSha256,rawSha256:hash(text),originElevationMeters:origin,processing:'One circular [1,2,1]/4 pass, subtract filtered station-zero height, periodic monotone cubic at runtime',horizontalProcessing:'Symmetric station offsets [-6,-3,0,3,6] m, weights [1,2,3,2,1]/9; preserve station parameter',maxFilterResidualMeters:Math.max(...smooth.map((v,i)=>Math.abs(v-raw.rows[i].elevation)))},samples}};
 require('../src/real-topography.js').reference(result,require('../src/replay-core.js'),require('../src/track-topography.js'));
 return result;
}
const profiles={};for(const id of Object.keys(configs))if(fs.existsSync(`${dir}/sources/${id}-raw.json`))profiles[id]=prepare(id);
fs.writeFileSync(`${dir}/profiles.json`,JSON.stringify(profiles,null,2)+'\n');
fs.writeFileSync(`${dir}/profiles.js`,'/* Derived terrain. Source metadata and raw samples: assets/topography/sources. */\nglobalThis.REAL_TRACK_DATA='+JSON.stringify(profiles)+';\n');
for(const [id,d]of Object.entries(profiles))console.log(id,d.profile.samples.length,'residual',d.profile.metadata.maxFilterResidualMeters);
