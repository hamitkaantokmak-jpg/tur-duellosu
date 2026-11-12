const fs=require('node:fs'),path=require('node:path'),{execFileSync}=require('node:child_process');
const out='docs/performance/v8',root='work/v8-final-acceptance',base='0d5deecee432230bb1d84c77cc2bd92553358922';
fs.mkdirSync(out,{recursive:true});
const git=(...a)=>execFileSync('git',a,{encoding:'utf8'}).trim();
const files=d=>fs.readdirSync(d,{withFileTypes:true}).flatMap(e=>e.name==='attachments'?[]:e.isDirectory()?files(path.join(d,e.name)):[path.join(d,e.name)]);
const unit=fs.readFileSync('work/v8-unit-final.log','utf8'),browser=fs.readFileSync('work/v8-final-acceptance.log','utf8'),soakLog=fs.readFileSync('work/v8-cache-soak.log','utf8');
if(!/pass 60/.test(unit)||!/33 passed/.test(browser)||!/1 passed/.test(soakLog))throw Error('Incomplete or failed final suite');
for(const [name,text]of [['unit.txt',unit],['browser.txt',browser],['cache-soak.txt',soakLog]])fs.writeFileSync(path.join(out,name),text);
const wanted=new Set(['mexico-motion.json','cota-motion.json','spa-motion.json','cota-surface.json','spa-surface.json','cota-soak.json','cota-soak-memory.json','synthetic-soak.json','surface-checks.json','terrain-collision.json','v7-vehicle.json']);
for(const f of files(root))if(wanted.has(path.basename(f)))fs.copyFileSync(f,path.join(out,path.basename(f)));
const soakFile=files('work/v8-cache-soak').find(f=>path.basename(f)==='v8-cache-soak.json');fs.copyFileSync(soakFile,path.join(out,'v8-cache-soak.json'));
for(const [tag,name]of [['INTEGRATION_LAP ','integration-lap.json'],['STUDIO_SIMULATOR ','studio-simulator.json'],['SOAK_120_SECONDS ','mexico-soak.json']]){
 const line=browser.split(/\r?\n/).find(l=>l.startsWith(tag));if(line)fs.writeFileSync(path.join(out,name),JSON.stringify(JSON.parse(line.slice(tag.length)),null,2));
}
const protectedPaths=['assets','art','src/replay-core.js','src/track-topography.js','src/ghost-topography.js'];
if(git('diff','--name-only',base,'--',...protectedPaths))throw Error('Protected sources changed');
const motion=Object.fromEntries(['mexico','cota','spa'].map(id=>[id,JSON.parse(fs.readFileSync(path.join(out,id+'-motion.json'),'utf8')).result]));
const soak=JSON.parse(fs.readFileSync(soakFile,'utf8')),visual=JSON.parse(fs.readFileSync('docs/visual/v8/sequences.json','utf8'));
if(visual.results.after.records.length!==27||visual.results.before.records.length!==27)throw Error('Incomplete visuals');
if(!Object.values(motion).every(m=>/NVIDIA/.test(m.renderer))||!['before','after'].every(v=>visual.results[v].records.every(r=>/NVIDIA/.test(r.renderer))))throw Error('Physical NVIDIA renderer not verified');
for(let i=0;i<27;i++)for(const key of ['pose','camera','sun','exposure'])if(JSON.stringify(visual.results.before.records[i][key])!==JSON.stringify(visual.results.after.records[i][key]))throw Error('Visual comparison mismatch: '+key);
const acceptance={base,runtimeLocal:'c6d0f8f',runtimePublished:'63fb72aa74cefad7cc607636045092b8e9ea7c73',runtimeTree:'2b0b8ee7d331ce1bc4cfe13346ac7fa7ef0d8529',tests:{unit:60,browserMainRun:33,browserAdditionalSoak:1,totalBrowser:34,skipped:0,retries:0},motion,soak,visual:{framesPerVersion:27,scenes:visual.plan.length,pairedPoseCameraSunExposureExact:true,browser:visual.results.after.browser,renderer:visual.results.after.records[0].renderer},protected:{paths:protectedPaths,changed:[]},performance:{physicalGpuFunctionalTests:true,controlledNvidiaPerformanceAcceptance:false,v61V7Debt:'open',historicalV6SpaUltra1440pLossPercent:{follow:11.65,cockpit:19.93},note:'Historical V6 values are not V8 benchmark results. No full fixed-power/clock NVIDIA comparison matrix was performed.'}};
fs.writeFileSync(path.join(out,'acceptance.json'),JSON.stringify(acceptance,null,2)+'\n');
console.log(JSON.stringify({tests:acceptance.tests,motion,heapGrowth:soak.heapAfter-soak.heapBefore},null,2));
