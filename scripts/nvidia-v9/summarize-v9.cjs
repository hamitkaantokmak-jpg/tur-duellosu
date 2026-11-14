const fs=require('node:fs'),crypto=require('node:crypto'),path=require('node:path');
const dir='docs/performance/v9-nvidia',file=process.argv.slice(2).find(a=>!a.startsWith('--'))||path.join(dir,'matrix.json'),read=f=>fs.existsSync(f)?fs.readFileSync(f):require('node:zlib').gunzipSync(fs.readFileSync(f+'.gz')),main=JSON.parse(read(file));
const versions=Object.keys(main.commits),median=a=>{a=a.slice().sort((a,b)=>a-b);return a.length?(a[Math.floor((a.length-1)/2)]+a[Math.ceil((a.length-1)/2)])/2:null;};
function stats(a){const mean=a.length?a.reduce((s,v)=>s+v,0)/a.length:null,sd=a.length>1?Math.sqrt(a.reduce((s,v)=>s+(v-mean)**2,0)/(a.length-1)):null;return{count:a.length,median:median(a),min:a.length?Math.min(...a):null,max:a.length?Math.max(...a):null,cvPercent:sd!==null&&mean?sd/mean*100:null};}
function validate(row,source){const problems=[];
 if(!/NVIDIA/i.test(row.fixed.renderer)||/swiftshader|software|llvmpipe/i.test(row.fixed.renderer))problems.push('renderer');
 if(row.fixed.buffer[0]!==row.width||row.fixed.buffer[1]!==row.height||row.fixed.ratio!==1||row.fixed.dpr!==1)problems.push('buffer/DPR');
 if(row.after.buffer[0]!==row.width||row.after.buffer[1]!==row.height||row.after.ratio!==1||row.fixed.shadowMap.some(v=>v!==row.fixed.profile.shadow))problems.push('after-buffer/shadow quality');
 if(row.errors.length||row.timing.frames<120||row.timing.frames!==row.timing.uniqueRaf||(row.timing.counterVersion==='unique-raf-v2'?row.timing.ticks!==row.timing.frames+row.timing.duplicateRafCallbacks||row.timing.renderInvocations!==row.timing.ticks:row.timing.frames!==row.timing.ticks))problems.push('errors/RAF');
 if(row.fixed.telemetrySha256!==row.after.telemetrySha256)problems.push('telemetry changed');
 if(row.windowPower.acLineStatus!==1||row.windowPower.powerSaving!==0||row.windowPower.scheme!==source.powerBefore.scheme)problems.push('power');
 for(const [k,v]of Object.entries(source.roots[row.version].nativeQualityProfiles[row.quality]))if(k!=='ratio'&&JSON.stringify(row.fixed.profile[k])!==JSON.stringify(v))problems.push('quality '+k);
 for(const control of [row.processControl,row.processControlAfter])if(control.processes.some(p=>p.error||!p.readAfter||p.affinityAfter!==control.selectedAffinity||(p.afterControl&5)!==5||(p.afterState&5)!==0))problems.push('process control');
 if(row.gpuSamples.some(g=>g.uuid!==source.gpuBefore.uuid||g.driver!==source.gpuBefore.driver||g.hardwareSlowdown==='Active'||g.softwareThermalSlowdown==='Active'))problems.push('GPU identity/thermal');
 return problems;
}
function comparisons(sources){
 const errors=[],all=[];sources.forEach((s,index)=>{for(const r of s.rows){const problems=validate(r,s);if(problems.length)errors.push({key:r.key,version:r.version,repeat:r.repeat,source:index,problems});all.push({...r,group:index+':'+r.repeat});}});
 const comparisons=main.plan.scenarios.map(c=>{
  const selected=all.filter(r=>r.key===c.key),by=Object.fromEntries(versions.map(v=>{const rows=selected.filter(r=>r.version===v);return[v,{fps:stats(rows.map(r=>r.timing.fps)),p95Ms:stats(rows.map(r=>r.timing.frameMs.p95)),drawCalls:median(rows.map(r=>r.timing.drawCalls.mean)),triangles:median(rows.map(r=>r.timing.triangles.mean)),cpuTickMeanMs:median(rows.map(r=>r.timing.tickCpuMs.mean)),gpuQueryP50Ms:median(rows.map(r=>r.timing.gpuCompletedQueryMs.p50).filter(Number.isFinite)),gpuUtilMeanPercent:median(rows.map(r=>r.gpuSamples.reduce((n,g)=>n+g.gpuUtilPercent,0)/r.gpuSamples.length)),cpuMachinePercent:median(rows.map(r=>r.cpu.allBrowserProcessesMachinePercent)),graphicsMHz:stats(rows.flatMap(r=>r.gpuSamples.map(g=>g.graphicsMHz))),temperatureC:stats(rows.flatMap(r=>r.gpuSamples.map(g=>g.temperatureC))),watts:stats(rows.flatMap(r=>r.gpuSamples.map(g=>g.watts))),globalVramMiB:stats(rows.flatMap(r=>r.gpuSamples.map(g=>g.globalMemoryMiB))),geometryBytes:median(rows.map(r=>r.fixed.sceneGeometryBytes)),textureBytesEstimate:median(rows.map(r=>r.fixed.sceneTextureBytesEstimate)),heapGrowthMedian:median(rows.map(r=>r.cpu.jsHeapAfter-r.cpu.jsHeapBefore))}];}));
  const lossVsV5=Object.fromEntries(versions.map(v=>[v,by.v5.fps.median&&by[v].fps.median?100*(1-by[v].fps.median/by.v5.fps.median):null]));
  const pairedLossVsV5=Object.fromEntries(versions.map(v=>[v,stats(selected.filter(r=>r.version===v).flatMap(r=>{const b=selected.find(b=>b.version==='v5'&&b.group===r.group);return b?[100*(1-r.timing.fps/b.timing.fps)]:[];}))]));
  const adjacentLoss=Object.fromEntries(versions.slice(1).map((v,i)=>[v,by[versions[i]].fps.median&&by[v].fps.median?100*(1-by[v].fps.median/by[versions[i]].fps.median):null]));
  return {key:c.key,by,lossVsV5,pairedLossVsV5,adjacentLoss,telemetryHashes:[...new Set(selected.map(r=>r.fixed.telemetrySha256))]};
 });return {errors,comparisons};
}
const initial=comparisons([main]),needsRecheck=initial.comparisons.filter(c=>versions.some(v=>c.by[v].fps.cvPercent>15||(c.lossVsV5[v]>=8&&c.lossVsV5[v]<=12)||(c.pairedLossVsV5[v].min<10&&c.pairedLossVsV5[v].max>10))).map(c=>c.key);
if(process.argv.includes('--plan-rechecks')){
 if(!main.completedAt||main.rows.length!==main.plan.scenarios.length*versions.length*3)throw Error('Main matrix incomplete');
 const escape=s=>s.replace(/[.*+?^${}()|[\]\\]/g,'\\$&'),plan={createdAt:new Date().toISOString(),mainSha256:crypto.createHash('sha256').update(read(file)).digest('hex'),keys:needsRecheck,filter:needsRecheck.length?'^('+needsRecheck.map(escape).join('|')+')$':null,repeatsPerVersion:3,method:'All original windows plus all three predeclared rotated/reverse-order repeats for all versions of every selected condition. No discarded windows.'};fs.writeFileSync(path.join(dir,'recheck-plan.json'),JSON.stringify(plan,null,2)+'\n');console.log(JSON.stringify(plan));process.exit(0);
}
const extraFile=path.join(dir,'rechecks.json'),sources=[main];if(fs.existsSync(extraFile)||fs.existsSync(extraFile+'.gz'))sources.push(JSON.parse(read(extraFile)));
const {errors,comparisons:rows}=comparisons(sources),complete=!!main.completedAt&&main.rows.length===24*versions.length*3&&rows.every(c=>versions.every(v=>c.by[v].fps.count>=3));
const repeatsComplete=needsRecheck.every(key=>{const c=rows.find(c=>c.key===key);return versions.every(v=>c.by[v].fps.count===6);});
const candidate=versions.includes('v9')?'v9':'v8',numericalCandidateGate=complete&&rows.every(c=>c.lossVsV5[candidate]!==null&&c.lossVsV5[candidate]<=10),stable=rows.every(c=>versions.every(v=>c.by[v].fps.cvPercent<=15));
const historical=rows.filter(c=>/^spa\/2560\/ultra\//.test(c.key)).map(c=>({key:c.key,v6LossPercent:c.lossVsV5.v6,v61LossPercent:c.lossVsV5.v61,v8LossPercent:c.lossVsV5.v8,v9LossPercent:c.lossVsV5.v9,v61NumericalGate:c.lossVsV5.v61!==null&&c.lossVsV5.v61<=10}));
const summary={method:'Medians of window means; all predeclared repeats retained. Ranges/CV/paired spreads are descriptive, not confidence intervals.',files:sources.map((_,i)=>i?extraFile:file),rows:sources.reduce((n,s)=>n+s.rows.length,0),complete,needsRecheck,repeatsComplete,errors,stable,numericalCandidateGate,historical,comparisons:rows,performanceAcceptance:false,acceptanceScope:'Numeric gate only; final hardware control, functional, visual, provenance and uncertainty review required.'};
fs.writeFileSync(path.join(dir,'summary.json'),JSON.stringify(summary,null,2)+'\n');
let md='# V9 karşılaştırmalı fiziksel GPU ölçümleri\n\n'+summary.method+'\n\n| Koşul | V5 FPS | V6 FPS | V6.1 FPS | V7 FPS | V8 FPS | V9 FPS | V9/V5 kayıp % | V5→V9 p95 ms |\n|---|---:|---:|---:|---:|---:|---:|---:|---:|\n';
const fmt=(n,d=1)=>Number.isFinite(n)?n.toFixed(d):'eksik';for(const c of rows)md+='| '+c.key+' | '+versions.map(v=>fmt(c.by[v].fps.median)).join(' | ')+' | '+fmt(c.lossVsV5[candidate],2)+' | '+fmt(c.by.v5.p95Ms.median,2)+'→'+fmt(c.by[candidate].p95Ms.median,2)+' |\n';
md+='\nTamlık: '+complete+'; ek tekrar tamlığı: '+repeatsComplete+'; sayısal aday %10 eşiği: '+numericalCandidateGate+'; CV≤%15: '+stable+'; hatalı pencere: '+errors.length+'. Nihai performans kabulü bu betik tarafından verilmez.\n';fs.writeFileSync(path.join(dir,'KARSILASTIRMA.md'),md);
console.log(JSON.stringify({rows:summary.rows,complete,needsRecheck,repeatsComplete,stable,numericalCandidateGate,errors:errors.length,historical}));
