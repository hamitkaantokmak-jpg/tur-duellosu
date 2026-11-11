// Keep the original window and every predeclared balanced-order repeat. No
// outlier deletion or favourable-window selection; medians describe windows,
// not a confidence interval or a claim about every GPU.
const fs=require('node:fs'),path=require('node:path'),dir='docs/performance/v6';
const files=process.argv.slice(2).length?process.argv.slice(2):[path.join(dir,'final-matrix.json'),path.join(dir,'rechecks.json')];
const groups=new Map(),median=a=>{a=a.slice().sort((x,y)=>x-y);const i=Math.floor(a.length/2);return a.length%2?a[i]:(a[i-1]+a[i])/2;};
for(const file of files){if(!fs.existsSync(file))continue;const m=JSON.parse(fs.readFileSync(file,'utf8'));for(const r of m.rows){const key=[r.track,r.viewport.width,r.quality,r.camera].join('/');if(!groups.has(key))groups.set(key,{key,v5:[],v6:[]});groups.get(key)[r.version].push({...r,source:file});}}
const comparisons=[];
for(const g of groups.values()){
 if(!g.v5.length||!g.v6.length)continue;
 const stats=a=>({windows:a.length,fpsMedian:median(a.map(r=>r.timing.meanFps)),fpsRange:[Math.min(...a.map(r=>r.timing.meanFps)),Math.max(...a.map(r=>r.timing.meanFps))],p95MedianMs:median(a.map(r=>r.timing.p95Ms))});
 const v5=stats(g.v5),v6=stats(g.v6);
 comparisons.push({key:g.key,v5,v6,initialLossPercent:100*(1-g.v6[0].timing.meanFps/g.v5[0].timing.meanFps),windowMedianLossPercent:100*(1-v6.fpsMedian/v5.fpsMedian),sources:[...new Set([...g.v5,...g.v6].map(r=>r.source))]});
}
const planFile=path.join(dir,'recheck-plan.json'),plan=fs.existsSync(planFile)?JSON.parse(fs.readFileSync(planFile,'utf8')):null;
const plannedRepeatsComplete=!!plan&&plan.selected.every(({key})=>{const r=comparisons.find(r=>r.key===key);return r&&r.v5.windows>=1+plan.repeatsPerVersion&&r.v6.windows>=1+plan.repeatsPerVersion;});
const result={method:'Initial window plus every balanced-order repeat; median of independent window means. No discarded windows. Other cases retain their single original window. Not a confidence interval.',files,comparisons,plannedRepeatsComplete,complete:comparisons.length===24&&plannedRepeatsComplete,maxWindowMedianLossPercent:comparisons.length?Math.max(...comparisons.map(r=>r.windowMedianLossPercent)):null};
result.withinTenPercentOnWindowMedians=result.complete&&result.maxWindowMedianLossPercent<=10;
fs.writeFileSync(path.join(dir,'repeat-summary.json'),JSON.stringify(result,null,2)+'\n');
const table=['# Dengeli sıralı tekrarlar','',result.method,'','| Koşul | Pencere V5/V6 | İlk kayıp % | V5 medyan FPS (aralık) | V6 medyan FPS (aralık) | Medyan kayıp % | p95 medyan V5→V6 ms |','|---|---:|---:|---:|---:|---:|---:|',...comparisons.filter(r=>r.v5.windows>1||r.v6.windows>1).map(r=>`| ${r.key} | ${r.v5.windows}/${r.v6.windows} | ${r.initialLossPercent.toFixed(2)} | ${r.v5.fpsMedian.toFixed(1)} (${r.v5.fpsRange.map(v=>v.toFixed(1)).join('–')}) | ${r.v6.fpsMedian.toFixed(1)} (${r.v6.fpsRange.map(v=>v.toFixed(1)).join('–')}) | ${r.windowMedianLossPercent.toFixed(2)} | ${r.v5.p95MedianMs.toFixed(2)}→${r.v6.p95MedianMs.toFixed(2)} |`)];
fs.writeFileSync(path.join(dir,'TEKRARLAR.md'),table.join('\n')+'\n');
console.log(JSON.stringify({complete:result.complete,maxLoss:result.maxWindowMedianLossPercent,withinTenPercent:result.withinTenPercentOnWindowMedians,repeated:comparisons.filter(r=>r.v5.windows>1||r.v6.windows>1)},null,2));
