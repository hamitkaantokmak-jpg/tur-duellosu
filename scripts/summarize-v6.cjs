const fs=require('node:fs'),path=require('node:path');
const core=require('../src/replay-core.js'),topo=require('../src/track-topography.js'),real=require('../src/real-topography.js');
const dir='docs/performance/v6',profiles=require('../assets/topography/profiles.json'),data={};
for(const [id,p]of Object.entries(profiles)){
 const raw=require(`../assets/topography/sources/${id}-raw.json`),{track,profile}=real.reference(p,core,topo),original=core.circuit(p.coordinates,p.length),s=topo.create({length:p.length,centerline:u=>track.sample(u),profile});
 let maxGrade=0,maxHorizontalShift=0;
 for(let d=0;d<p.length;d+=2){maxGrade=Math.max(maxGrade,Math.abs(s.sampleAtDistance(d).gradient));const a=track.sample(d/p.length),b=original.sample(d/p.length);maxHorizontalShift=Math.max(maxHorizontalShift,Math.hypot(a.x-b.x,a.z-b.z));}
 data[id]={sourceRows:raw.rows.length,sourceSpacingMeters:p.length/raw.rows.length,sourceGridMeters:p.profile.metadata.resolutionMeters,rawRangeMeters:[Math.min(...raw.rows.map(p=>p.elevation)),Math.max(...raw.rows.map(p=>p.elevation))],derivedRelativeRangeMeters:[Math.min(...p.profile.samples.map(p=>p.elevation)),Math.max(...p.profile.samples.map(p=>p.elevation))],maxGrade,maxHorizontalShift,filterMaxResidualMeters:p.profile.metadata.maxFilterResidualMeters,category:p.profile.metadata.category,banking:'unmeasured; modeled zero',license:p.profile.metadata.license,rawSha256:p.profile.metadata.rawSha256};
}
fs.mkdirSync(dir,{recursive:true});fs.writeFileSync(path.join(dir,'data-quality.json'),JSON.stringify(data,null,2)+'\n');
const files=process.argv.slice(2).length?process.argv.slice(2):[path.join(dir,'final-matrix.json')];
const selected=new Map(),runs=[];
for(const file of files){if(!fs.existsSync(file))continue;const m=JSON.parse(fs.readFileSync(file,'utf8'));runs.push({file,conditions:m.conditions,rows:m.rows.length});for(const r of m.rows)selected.set([r.track,r.viewport.width,r.quality,r.camera,r.version].join('/'),{...r,file});}
const comparisons=[];
for(const r of selected.values())if(r.version==='v6'){
 const b=selected.get([r.track,r.viewport.width,r.quality,r.camera,'v5'].join('/'));if(!b)continue;
 comparisons.push({track:r.track,resolution:`${r.viewport.width}x${r.viewport.height}`,quality:r.quality,camera:r.camera,baselineFps:b.timing.meanFps,candidateFps:r.timing.meanFps,lossPercent:100*(1-r.timing.meanFps/b.timing.meanFps),baselineP95Ms:b.timing.p95Ms,candidateP95Ms:r.timing.p95Ms,drawCalls:[b.fixed.drawCalls,r.fixed.drawCalls],triangles:[b.fixed.triangles,r.fixed.triangles],geometryBytes:[b.fixed.sceneGeometryBytes,r.fixed.sceneGeometryBytes],textureBytesEstimate:[b.fixed.sceneTextureBytesEstimate,r.fixed.sceneTextureBytesEstimate],sources:[b.file,r.file]});
}
const result={runs,comparisons,complete:comparisons.length===24,maxLossPercent:comparisons.length?Math.max(...comparisons.map(p=>p.lossPercent)):null};
result.withinTenPercent=result.complete&&result.maxLossPercent<=10;
fs.writeFileSync(path.join(dir,'summary.json'),JSON.stringify(result,null,2)+'\n');
const table=['| Pist | Çözünürlük | Kalite | Kamera | V5 FPS | V6 FPS | Kayıp % | p95 V5 → V6 (ms) |','|---|---|---|---|---:|---:|---:|---:|',...comparisons.map(r=>`| ${r.track} | ${r.resolution} | ${r.quality} | ${r.camera} | ${r.baselineFps.toFixed(1)} | ${r.candidateFps.toFixed(1)} | ${r.lossPercent.toFixed(2)} | ${r.baselineP95Ms.toFixed(2)} → ${r.candidateP95Ms.toFixed(2)} |`)];
fs.writeFileSync(path.join(dir,'PERFORMANS.md'),table.join('\n')+'\n');
console.log(JSON.stringify({data,performance:{rows:comparisons.length,complete:result.complete,maxLossPercent:result.maxLossPercent,withinTenPercent:result.withinTenPercent}},null,2));
