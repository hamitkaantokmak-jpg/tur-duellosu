// Direct Node child handles avoid shell-owned web-server teardown in restricted Windows jobs.
const fs=require('node:fs'),path=require('node:path'),{spawn}=require('node:child_process');
const list=process.argv.includes('--list'),port=Number(process.env.V9_TEST_PORT||4386),children=[];
const wait=ms=>new Promise(r=>setTimeout(r,ms));
function child(args,log,env=process.env){const fd=fs.openSync(log,'w'),p=spawn(process.execPath,args,{env,windowsHide:true,stdio:['ignore',fd,fd]});fs.closeSync(fd);children.push(p);p.done=new Promise((resolve,reject)=>{p.once('error',reject);p.once('exit',code=>resolve(code));});return p;}
(async()=>{let server;try{
 fs.mkdirSync('work',{recursive:true});
 if(!list){const unit=child(['--test',...fs.readdirSync('tests').filter(f=>f.endsWith('.test.cjs')).map(f=>'tests/'+f)],'work/v9-unit.log');if(await unit.done!==0)throw Error('Unit tests failed');}
 try{const response=await fetch('http://127.0.0.1:'+port);if(response)throw Error('V9 test port already in use');}catch(e){if(e.message==='V9 test port already in use')throw e;}
 server=child([path.resolve('scripts/serve.cjs'),String(port)],'work/v9-owned-test-server.log');
 let ready=false;for(let i=0;i<100;i++){try{if((await fetch('http://127.0.0.1:'+port)).ok){ready=true;break;}}catch{}await wait(100);}if(!ready)throw Error('Owned test server not ready');
 const args=['node_modules/@playwright/test/cli.js','test',...(list?['--list']:['--output=work/v9-regression-final'])],log=list?'work/v9-runner-list.log':'work/v9-browser-final.log';
 const cli=child(args,log,{...process.env,TEST_PORT:String(port),TEST_SERVER_EXTERNAL:'1'});if(await cli.done!==0)throw Error('Browser test runner failed');
 console.log(list?'Runner listing/lifecycle smoke only; no tests executed.':'Unit and full browser runners exited successfully.');
 }catch(e){console.error(e);process.exitCode=1;}
 finally{if(server){server.kill();let timer;const closed=await Promise.race([server.done.then(()=>true),new Promise(r=>{timer=setTimeout(()=>r(false),5000);})]);clearTimeout(timer);if(!closed){console.error('Owned server did not close');process.exitCode=1;}}}
})().catch(e=>{console.error(e);process.exitCode=1;for(const p of children)p.kill();});
