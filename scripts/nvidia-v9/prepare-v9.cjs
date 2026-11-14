// No shell pipe: Windows PowerShell text pipes may change archive bytes.
const fs=require('node:fs'),path=require('node:path'),{execFileSync}=require('node:child_process');
const plan=JSON.parse(fs.readFileSync('docs/performance/v9-nvidia/plan.json'));
const base=path.resolve('work/v9-versions');fs.mkdirSync(base,{recursive:true});
for(const [version,sha]of Object.entries(plan.commits)){
 if(!/^v(?:5|6|61|7|8|9)$/.test(version)||! /^[0-9a-f]{40}$/.test(sha))throw Error('Invalid frozen source identity');
 const target=path.join(base,version),archive=path.join(base,version+'.canonical.tar');
 if(fs.existsSync(target)&&fs.readdirSync(target).length)throw Error('Refusing to overwrite existing archive: '+target);
 fs.mkdirSync(target,{recursive:true});
 execFileSync('git',['-c','core.autocrlf=false','archive','--format=tar','--output='+archive,sha],{stdio:'inherit',windowsHide:true});
 execFileSync('tar',['-xf',archive,'-C',target],{stdio:'inherit',windowsHide:true});fs.unlinkSync(archive);console.log(version+' '+sha);
}
