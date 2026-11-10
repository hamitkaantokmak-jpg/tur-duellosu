// CPU ray workload only: timing excludes GPU drawing; it is not an FPS benchmark.
const {chromium}=require('@playwright/test'),fs=require('node:fs');
let browser;
(async()=>{
 browser=await chromium.launch({executablePath:process.env.CHROMIUM_PATH||'/usr/bin/chromium',args:['--no-sandbox','--use-angle=swiftshader','--enable-unsafe-swiftshader',...(process.env.CHROMIUM_PROXY_SPKI?['--ignore-certificate-errors-spki-list='+process.env.CHROMIUM_PROXY_SPKI]:[])]});
 const page=await browser.newPage({viewport:{width:1280,height:720}});
 await page.goto((process.argv[2]||'http://127.0.0.1:4173')+'/#y=2024&e=Mexico%20City%20Grand%20Prix&k=Q&a=HAM&b=RUS&g=1');
 await page.waitForFunction(()=>typeof ghost3d!=='undefined'&&ghost3d.ready&&VisualAssets.state==='ready'&&ghost3d.v4Stats,null,{timeout:120000});
 const result=await page.evaluate(()=>{
  stopPlay();const samples=[],hits=[],S=ghostBuild();
  const one=i=>{const p=ghostReplayPoses(S,(i%400)/400*76)[0],camera=[p.x-p.fx*14,3.3,p.z-p.fz*14],target=[p.x,.65,p.z],t=performance.now(),out=ghostAvoidObstacles(camera,target);return {ms:performance.now()-t,out};};
  for(let i=0;i<12;i++)one(i);
  for(let i=0;i<400;i++){const r=one(i);samples.push(r.ms);hits.push(r.out);}
  samples.sort((a,b)=>a-b);
  return {note:'400 CPU camera rays, initial-view visibility held fixed, 12 warmup rays; no GPU draw during timed loop. Not a full-lap FPS measurement.',total:samples.reduce((a,b)=>a+b,0),p50:samples[200],p95:samples[380],max:samples[399],hits};
 });
 const output=process.argv[3]||'test-results/camera-cpu.json';fs.mkdirSync(require('node:path').dirname(output),{recursive:true});fs.writeFileSync(output,JSON.stringify(result,null,2));
 console.log(JSON.stringify({...result,hits:undefined},null,2));
})().catch(e=>{console.error(e);process.exitCode=1;}).finally(async()=>{await browser?.close();});
