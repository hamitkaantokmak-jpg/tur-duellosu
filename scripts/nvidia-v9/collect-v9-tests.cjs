const fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto'),{execFileSync}=require('node:child_process');
const out='docs/performance/v9-nvidia',root='work/v9-regression-final',runtime='12b85328235b095d2362a44e058cc28ec023d302';
const unit=fs.readFileSync(process.env.V9_UNIT_LOG||'work/v9-unit.log','utf8'),browser=fs.readFileSync('work/v9-browser-final.log','utf8');
if(!/pass 74/.test(unit)||!/34 passed/.test(browser)||JSON.parse(fs.readFileSync(path.join(root,'.last-run.json'),'utf8')).status!=='passed')throw Error('Incomplete/failed regressions');
fs.mkdirSync(out,{recursive:true});fs.writeFileSync(path.join(out,'unit.txt'),unit);fs.writeFileSync(path.join(out,'browser.txt'),browser);
function files(d){return fs.readdirSync(d,{withFileTypes:true}).flatMap(e=>e.name==='attachments'?[]:e.isDirectory()?files(path.join(d,e.name)):[path.join(d,e.name)]);}
const names=new Set(['mexico-motion.json','cota-motion.json','spa-motion.json','cota-surface.json','spa-surface.json','cota-soak.json','cota-soak-memory.json','synthetic-soak.json','surface-checks.json','terrain-collision.json','v7-vehicle.json','v8-cache-soak.json']);
for(const f of files(root))if(names.has(path.basename(f)))fs.copyFileSync(f,path.join(out,path.basename(f)));
for(const [tag,name]of [['INTEGRATION_LAP ','integration-lap.json'],['STUDIO_SIMULATOR ','studio-simulator.json'],['SOAK_120_SECONDS ','mexico-soak.json']]){const line=browser.split(/\r?\n/).find(l=>l.startsWith(tag));if(line)fs.writeFileSync(path.join(out,name),JSON.stringify(JSON.parse(line.slice(tag.length)),null,2));}
const git=(...a)=>execFileSync('git',a,{encoding:'utf8'}).trim();
const published='12b85328235b095d2362a44e058cc28ec023d302',equivalenceDiff=git('diff','--name-only',published,'--','index.html','src','assets','art','tests/*.spec.js');
if(equivalenceDiff)throw Error('Published application/browser tests differ from the tested candidate: '+equivalenceDiff);
const protectedPaths=['assets','art','src/replay-core.js','src/track-topography.js','src/ghost-topography.js','src/vehicle-motion.js','src/ghost-vehicle-motion.js'];
const changed=git('diff','--name-only','ad35d61','--',...protectedPaths);if(changed)throw Error('Protected data/runtime changed: '+changed);
const hashFiles=['assets/topography/sources/cota-raw.json','assets/topography/sources/spa-raw.json','assets/topography/sources/cota.geojson','assets/topography/sources/spa.geojson','assets/topography/profiles.json','assets/v4/car-low.glb','assets/v4/car-medium.glb','assets/v4/car-high.glb','assets/v4/sources.json','assets/v4/vehicle-v7-authoring.json'];
const hashes=Object.fromEntries(hashFiles.map(f=>[f,{gitBlob:git('rev-parse',runtime+':'+f),sha256:crypto.createHash('sha256').update(execFileSync('git',['show',runtime+':'+f],{maxBuffer:64*1024*1024})).digest('hex')}]));
const unitFiles=[...fs.readdirSync('tests').filter(f=>f.endsWith('.test.cjs')).map(f=>'tests/'+f),'scripts/nvidia-v9/frame-window.cjs'];
const unitWorkingFiles=Object.fromEntries(unitFiles.map(f=>[f,{workingSha256:crypto.createHash('sha256').update(fs.readFileSync(f)).digest('hex'),canonicalGitBlob:git('hash-object','--path='+f,f)}]));
const record={unitWorkingFiles,unitSourceNote:'Unit tests include the recorded working files; local HEAD alone does not identify uncommitted audit harness changes.',runtimeLocal:runtime,runtimeTree:git('rev-parse',runtime+'^{tree}'),publishedRuntime:published,publishedRuntimeTree:git('rev-parse',published+'^{tree}'),unitAuditSourceLocal:git('rev-parse','HEAD'),applicationAndBrowserTestDiffFiles:[],base:'ad35d61f5b26ed1d5ff6d82a3ee43b91478cee94',unitPassed:74,browserPassed:34,skipped:0,retries:0,protectedPaths,changed:[],canonicalGitFileHashes:hashes};
fs.writeFileSync(path.join(out,'regression-acceptance.json'),JSON.stringify(record,null,2)+'\n');console.log(JSON.stringify({unit:74,browser:34,hashFiles:hashFiles.length,protectedChanged:0}));
