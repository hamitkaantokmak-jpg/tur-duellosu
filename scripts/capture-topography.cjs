// Screenshots from the actual app, not generated illustrations. JPEG keeps PR
// evidence small; the Playwright suite also retains full PNG originals.
const {chromium}=require('@playwright/test'),fs=require('node:fs'),path=require('node:path');
const fixture=require('../tests/fixtures/synthetic-topography.cjs');
(async()=>{
 const base=process.argv[2]||'http://127.0.0.1:4173',out=process.argv[3]||'docs/performance/v5/synthetic';
 fs.mkdirSync(out,{recursive:true});
 const browser=await chromium.launch({executablePath:process.env.CHROMIUM_PATH||undefined});
 try{
  const page=await browser.newPage({viewport:{width:1440,height:1000},deviceScaleFactor:1}),errors=[];
  page.on('pageerror',e=>errors.push(e.message));
  await page.addInitScript(p=>{window.TOPOGRAPHY_TEST_PROFILE=p;localStorage.setItem('td.disc',JSON.stringify({at:Date.now(),data:{}}));},fixture);
  await page.goto(base+'/?topographyTest=synthetic#y=2024&e=Mexico%20City%20Grand%20Prix&k=Q&a=HAM&b=RUS&g=1');
  await page.waitForFunction(()=>typeof ghost3d!=='undefined'&&ghost3d.ready&&ghost3d.v4Stats&&VisualAssets.state==='ready'&&ghost3d.cars[0].userData.asset,null,{timeout:120000});
  await page.locator('#ghostRenderQuality').selectOption('performance');await page.locator('#ghostAdaptive').uncheck();
  const manifest=[];
  for(const [name,station,mode] of [['01-flat-to-climb',100,'cinematic'],['02-uphill',320,'cinematic'],['03-crest',550,'cinematic'],['04-descent',720,'cinematic'],['05-banked-corner',1154,'cinematic'],['06-kerbs',1154,'free'],['07-follow-uphill',320,'a']]){
   const data=await page.evaluate(({station,mode})=>{
    stopPlay();const S=ghostBuild();let best=0,error=Infinity;
    for(let t=0;t<st.A.total;t+=.025){const p=ghostReplayPoses(S,t)[0],s=ghostSurfacePose(S,p,0,t),d=Math.abs(s.station-station);if(d<error){error=d;best=t;}}
    st.play.e=best;ghost.camera=mode;GhostDirector.transition=null;ghost.cameraState=null;
    if(mode==='free'){const p=ghostReplayPoses(S,best)[0],s=ghostSurfacePose(S,p,0,best);ghostOrbit.target=[p.x,s.y+.5,p.z];ghostOrbit.distance=22;ghostOrbit.yaw=Math.atan2(-p.fx,-p.fz)+.9;ghostOrbit.pitch=.24;}
    drawAll();return {time:best,stationError:error,category:ghost3d.surface.metadata.category};
   },{station,mode});
   await page.locator('.ghost-stage').screenshot({path:path.join(out,name+'.jpg'),type:'jpeg',quality:88});manifest.push({name,station,mode,...data});
  }
  if(errors.length)throw Error(JSON.stringify(errors));
  fs.writeFileSync(path.join(out,'manifest.json'),JSON.stringify({notice:fixture.metadata.label,source:'Actual application screenshots; synthetic geometry, original HAM/RUS telemetry',manifest,errors},null,2));
 }finally{await browser.close();}
})().catch(e=>{console.error(e);process.exitCode=1;});
