// Verify shipped paths and bytes without deleting historical/rebuild inputs.
const fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto');
const root=path.resolve(__dirname,'..'),read=p=>fs.readFileSync(path.join(root,p));
const html=read('index.html').toString(),errors=[],staticPaths=[];
for(const m of html.matchAll(/(?:src|href)=["']([^"']+)["']/g)){
 const p=m[1].split(/[?#]/)[0];if(!p||/^(https?:|data:|#|mailto:)/.test(m[1]))continue;
 staticPaths.push(p);if(!fs.existsSync(path.join(root,p)))errors.push('Missing HTML dependency: '+p);
}
const sources=JSON.parse(read('assets/v4/sources.json'));let checked=0;
for(const item of sources){if(!item.file)continue;const p=path.join(root,item.file);if(!fs.existsSync(p)){errors.push('Missing V4 source: '+item.file);continue;}const b=fs.readFileSync(p);if(item.sha256){checked++;if(crypto.createHash('sha256').update(b).digest('hex')!==item.sha256)errors.push('SHA256 mismatch: '+item.file);}if(item.bytes&&b.length!==item.bytes)errors.push('Size mismatch: '+item.file);}
const groups={};
const classify=p=>p.startsWith('assets/cars/')||p.startsWith('assets/materials/')||p.startsWith('assets/environment/')?'historical V2/V3 assets retained for legacy build scripts and provenance':p.startsWith('art/blender/')?'editable Blender source and authoring scripts':/^assets\/v4\/tree-view-|^assets\/v4\/soil-color/.test(p)?'V4 rebuild input; not fetched by runtime':/^assets\/v4\/road-.*\.jpg$/.test(p)?'active V4 JPEG fallback':p.startsWith('assets/v4/')?'active V4 payload or provenance/manifest':p.startsWith('assets/tracks/')?'geographic track, OSM sources, runtime data or licenses':'other';
for(const dir of ['assets','art/blender']){const walk=d=>{for(const x of fs.readdirSync(path.join(root,d),{withFileTypes:true})){const p=d+'/'+x.name;if(x.isDirectory())walk(p);else if(!p.endsWith('.blend1')&&!p.endsWith('-raw.glb')){const g=classify(p);(groups[g]??=[]).push({path:p,bytes:fs.statSync(path.join(root,p)).size});}}};walk(dir);}
const result={staticPaths,v4SourceHashesChecked:checked,errors,groups,deletedFiles:[],decision:'Historical assets and procedural fallbacks are retained; no destructive cleanup. Runtime loads and missing-asset fallbacks are separately checked in Chromium.'};
console.log(JSON.stringify(result,null,2));if(errors.length)process.exitCode=1;
