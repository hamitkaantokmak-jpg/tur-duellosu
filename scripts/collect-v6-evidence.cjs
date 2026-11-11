const fs=require('node:fs'),path=require('node:path'),{execFileSync}=require('node:child_process');
const root=process.argv[2]||'work/v6-post-opt-results',out='docs/performance/v6',visual=path.join(out,'visual');
fs.mkdirSync(visual,{recursive:true});
function files(dir){return fs.readdirSync(dir,{withFileTypes:true}).flatMap(e=>e.name==='attachments'?[]:e.isDirectory()?files(path.join(dir,e.name)):[path.join(dir,e.name)]);}
const images=[];
for(const file of files(root)){
 const name=path.basename(file);
 if(/^(cota|spa)-\d.*\.(jpg|json)$/.test(name)){
  fs.copyFileSync(file,path.join(visual,name));if(name.endsWith('.json'))images.push({name,...JSON.parse(fs.readFileSync(file,'utf8'))});
 }else if(['cota-surface.json','spa-surface.json','cota-soak.json','cota-soak-memory.json','synthetic-soak.json','surface-checks.json','terrain-collision.json'].includes(name))fs.copyFileSync(file,path.join(out,name));
}
const gaps=images.flatMap(i=>i.meshGaps||[]),manifest={source:'Actual application Ultra screenshots, original 2024 telemetry, derived DEM profiles (not surveyed asphalt)',frames:images,tyreMeshGapMeters:gaps.length?{count:gaps.length,min:Math.min(...gaps),max:Math.max(...gaps)}:null};
fs.writeFileSync(path.join(visual,'manifest.json'),JSON.stringify(manifest,null,2)+'\n');
const log=fs.readFileSync(path.join(out,'browser.txt'),'utf8');
for(const [tag,name]of [['INTEGRATION_LAP ','integration-lap.json'],['STUDIO_SIMULATOR ','studio-simulator.json'],['SOAK_120_SECONDS ','mexico-soak.json']]){const line=log.split(/\r?\n/).find(s=>s.startsWith(tag));if(line)fs.writeFileSync(path.join(out,name),JSON.stringify(JSON.parse(line.slice(tag.length)),null,2)+'\n');}
const git=(...args)=>execFileSync('git',args,{encoding:'utf8'}).trim();
fs.writeFileSync(path.join(out,'tested-source.json'),JSON.stringify({baseline:'a237ca529b31bd769df90165c62f73cdef54a672',candidateCommit:git('rev-parse','HEAD'),candidateTree:git('rev-parse','HEAD^{tree}'),collectedAt:new Date().toISOString(),lastRun:JSON.parse(fs.readFileSync(path.join(root,'.last-run.json'),'utf8'))},null,2)+'\n');
console.log(JSON.stringify({frames:images.length,gaps:manifest.tyreMeshGapMeters}));
