const fs=require('node:fs'),path=require('node:path'),zlib=require('node:zlib'),crypto=require('node:crypto');
const dir='docs/performance/v9-nvidia',sha=b=>crypto.createHash('sha256').update(b).digest('hex'),manifest=[];
for(const name of ['matrix.json','rechecks.json','main-attempt-01.json']){
 const file=path.join(dir,name),bytes=fs.existsSync(file)?fs.readFileSync(file):zlib.gunzipSync(fs.readFileSync(file+'.gz')),data=JSON.parse(bytes);
 if(name!=='main-attempt-01.json'&&(!data.completedAt||data.blockers.length))throw Error('Cannot package incomplete run '+name);
 const zipped=zlib.gzipSync(bytes,{level:9});if(!zlib.gunzipSync(zipped).equals(bytes))throw Error('Archive verification failed');
 fs.writeFileSync(file+'.gz',zipped);manifest.push({original:name,archive:name+'.gz',bytes:bytes.length,gzipBytes:zipped.length,sha256:sha(bytes),gzipSha256:sha(zipped),rows:data.rows.length,blockers:data.blockers});
}
fs.writeFileSync(path.join(dir,'raw-manifest.json'),JSON.stringify(manifest,null,2)+'\n');console.log(JSON.stringify(manifest.map(({blockers,...r})=>r)));
// Originals remain on disk; final Git staging may use only verified gzip copies.
