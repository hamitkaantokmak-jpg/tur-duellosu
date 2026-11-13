// Git object audit: no checkout mutation, no renderer/FPS inferred from asset size.
const fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto'),{execFileSync}=require('node:child_process'),versions=require('./v9-versions.json');
const git=(...a)=>execFileSync('git',a,{maxBuffer:64*1024*1024}),text=(...a)=>git(...a).toString().trim(),sha=b=>crypto.createHash('sha256').update(b).digest('hex');
const result={observedAt:new Date().toISOString(),classification:'Static source and asset inventory, not a GPU performance comparison',versions:{},protectedFiles:{},v71RuntimeChanges:[]};
for(const [name,commit]of Object.entries(versions)){
 const row={commit,tree:text('rev-parse',commit+'^{tree}'),subject:text('log','-1','--format=%s',commit),parents:text('show','-s','--format=%P',commit).split(' '),cars:[]};
 for(const level of ['high','medium','low']){const file='assets/v4/car-'+level+'.glb',bytes=git('show',commit+':'+file);if(bytes.readUInt32LE(0)!==0x46546c67)throw Error('Invalid GLB');const j=JSON.parse(bytes.subarray(20,20+bytes.readUInt32LE(12)).toString()),accessorBytes=(j.accessors||[]).reduce((n,a)=>n+a.count*({SCALAR:1,VEC2:2,VEC3:3,VEC4:4,MAT4:16}[a.type]||0)*({5120:1,5121:1,5122:2,5123:2,5125:4,5126:4}[a.componentType]||0),0),primitives=j.meshes.flatMap(m=>m.primitives);row.cars.push({level,file,bytes:bytes.length,sha256:sha(bytes),triangles:primitives.reduce((n,p)=>n+(j.accessors[p.indices??p.attributes.POSITION].count/3),0),accessorBytes,meshPrimitives:primitives.length,materials:j.materials?.length||0,nodes:j.nodes?.length||0});}
 result.versions[name]=row;
}
for(const file of text('ls-tree','-r','--name-only',versions.v8,'--','index.html','src','assets').split('\n')){const bytes=git('show',versions.v8+':'+file);if(!fs.readFileSync(file).equals(bytes))throw Error('V9 changed runtime/data: '+file);result.protectedFiles[file]=sha(bytes);}
result.v71RuntimeChanges=text('diff','--name-only',versions.v8,versions.v71,'--','index.html','src','assets','art').split('\n');
result.v71NotImported=true;result.existingTestFiles=text('ls-tree','-r','--name-only',versions.v8,'--','tests').split('\n').length;
for(const file of text('ls-tree','-r','--name-only',versions.v8,'--','tests').split('\n'))if(!fs.readFileSync(file).equals(git('show',versions.v8+':'+file)))throw Error('Existing test changed '+file);
const out=process.argv[2]||'docs/performance/v9/inventory.json';fs.mkdirSync(path.dirname(out),{recursive:true});fs.writeFileSync(out,JSON.stringify(result,null,2)+'\n');console.log(JSON.stringify({versions:Object.keys(result.versions),runtimeFilesUnchanged:Object.keys(result.protectedFiles).length,existingTestsUnchanged:result.existingTestFiles,v71NotImported:true}));
