const fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto'),{execFileSync}=require('node:child_process');
const before=path.resolve(process.argv[2]||'work/v61-before-visual'),after=path.resolve(process.argv[3]||'test-results'),out='docs/performance/v6-1';
function files(dir){return fs.readdirSync(dir,{withFileTypes:true}).flatMap(e=>e.name==='attachments'?[]:e.isDirectory()?files(path.join(dir,e.name)):[path.join(dir,e.name)]);}
const pairs=new Map();
for(const [label,root]of [['before',before],['after',after]]){
 const target=path.join(out,'visual',label);fs.mkdirSync(target,{recursive:true});
 for(const file of files(root)){
  const name=path.basename(file);if(!/^(cota|spa)-\d.*\.(jpg|json)$/.test(name))continue;
  fs.copyFileSync(file,path.join(target,name));
  if(name.endsWith('.json')){const key=name.slice(0,-5);if(!pairs.has(key))pairs.set(key,{name:key});pairs.get(key)[label]=JSON.parse(fs.readFileSync(file,'utf8'));}
 }
}
function dimensions(file){const b=fs.readFileSync(file);let i=2;while(i<b.length){while(b[i]===255)i++;const marker=b[i++];if(marker===216||marker===217)continue;const n=b.readUInt16BE(i);if([192,193,194,195,197,198,199,201,202,203,205,206,207].includes(marker))return[b.readUInt16BE(i+5),b.readUInt16BE(i+3)];i+=n;}throw Error('Missing JPEG dimensions');}
let maxContactDelta=0;const manifest=[];
for(const pair of [...pairs.values()].sort((a,b)=>a.name.localeCompare(b.name))){
 if(!pair.before||!pair.after)throw Error('Missing screenshot pair '+pair.name);
 const dimsBefore=dimensions(path.join(out,'visual/before',pair.name+'.jpg')),dimsAfter=dimensions(path.join(out,'visual/after',pair.name+'.jpg'));if(JSON.stringify(dimsBefore)!==JSON.stringify(dimsAfter))throw Error('Different screenshot dimensions');pair.imageDimensions=dimsBefore;
 for(const key of ['time','station','mode'])if(pair.before[key]!==pair.after[key])throw Error('Different camera/time in pair '+pair.name);
 for(let i=0;i<pair.before.meshGaps.length;i++){const a=pair.before.meshGaps[i],b=pair.after.meshGaps[i];if(a===null||b===null)throw Error('Missing wheel ray');maxContactDelta=Math.max(maxContactDelta,Math.abs(a-b));if(b<=-.025||b>=.025)throw Error('Wheel contact outside existing25mm limit');}
 manifest.push({...pair,beforeImage:'before/'+pair.name+'.jpg',afterImage:'after/'+pair.name+'.jpg'});
}
if(manifest.length!==11)throw Error('Expected11 actual screenshot pairs');if(maxContactDelta>1e-7)throw Error('Wheel contact changed');
fs.writeFileSync(path.join(out,'visual/manifest.json'),JSON.stringify({frames:manifest,maxWheelContactDifferenceMeters:maxContactDelta,quality:'Ultra',sameViewport:true,note:'Actual Chromium application screenshots, derived DEM surfaces and original telemetry. Source-data uncertainty remains unchanged.'},null,2)+'\n');
const lines=['# V6 → V6.1: eş ayarlı gerçek uygulama görselleri','','Aynı Chromium, viewport, Ultra kalite, tur zamanı, istasyon ve kamera. Kaynak profilleri ve asfalt/tekerlek ölçümleri korunur. Bu galerinin FPS kabulü iddiası yoktur.','','| Bölge | V6 önce | V6.1 sonra |','|---|---|---|'];
for(const p of manifest)lines.push(`| ${p.name} · t=${p.before.time.toFixed(3)} · ${p.before.mode} | [![Önce](before/${p.name}.jpg)](before/${p.name}.jpg) | [![Sonra](after/${p.name}.jpg)](after/${p.name}.jpg) |`);
lines.push('','[Kamera, istasyon ve gerçek asfalt raycast ölçümleri](manifest.json).');fs.writeFileSync(path.join(out,'visual/README.md'),lines.join('\n')+'\n');
for(const file of files(after)){
 const name=path.basename(file);if(['cota-surface.json','spa-surface.json','cota-soak.json','cota-soak-memory.json','synthetic-soak.json','surface-checks.json','terrain-collision.json','v61-cota.json','v61-spa.json','measurement.json','integration-lap.json','studio-simulator.json','high-dpi.json'].includes(name))fs.copyFileSync(file,path.join(out,name));
}
const status=JSON.parse(fs.readFileSync(path.join(after,'.last-run.json'),'utf8'));if(status.status!=='passed'||status.failedTests.length)throw Error('Final browser suite did not pass');
const protectedHashes=JSON.parse(fs.readFileSync(path.join(out,'protected-sha256.json'),'utf8')),protectedNow={};
for(const [name,hash]of Object.entries(protectedHashes)){const now=crypto.createHash('sha256').update(fs.readFileSync(name)).digest('hex');if(now!==hash)throw Error('Protected data changed: '+name);protectedNow[name]=now;}
const git=(...args)=>execFileSync('git',args,{encoding:'utf8'}).trim();
fs.writeFileSync(path.join(out,'tested-source.json'),JSON.stringify({startCommit:'f295c01a8984715334363077fb66ccaad522e246',baselineMain:'a237ca529b31bd769df90165c62f73cdef54a672',testedCommit:git('rev-parse','HEAD'),testedTree:git('rev-parse','HEAD^{tree}'),sourceEntries:git('ls-tree','HEAD','--','index.html','src','assets','art','tests','scripts','package.json','package-lock.json','playwright.config.js').split('\n'),protectedSha256:protectedNow,lastRun:status,collectedAt:new Date().toISOString()},null,2)+'\n');
console.log(JSON.stringify({pairs:manifest.length,maxContactDelta,protectedFiles:Object.keys(protectedNow).length,status}));
