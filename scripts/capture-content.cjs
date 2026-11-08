const {chromium}=require('@playwright/test'),fs=require('node:fs'),path=require('node:path');
let browser;
(async()=>{
 const base=process.argv[2]||'http://127.0.0.1:4173',out=process.argv[3]||'test-results/content-captures';fs.mkdirSync(out,{recursive:true});
 browser=await chromium.launch({executablePath:process.env.CHROMIUM_PATH||'/usr/bin/chromium',args:['--no-sandbox','--use-angle=swiftshader','--enable-unsafe-swiftshader',...(process.env.CHROMIUM_PROXY_SPKI?['--ignore-certificate-errors-spki-list='+process.env.CHROMIUM_PROXY_SPKI]:[])]});
 const page=await browser.newPage({viewport:{width:1440,height:1100},deviceScaleFactor:1});const errors=[],consoleErrors=[],shots=[];page.on('pageerror',e=>errors.push(e.message));page.on('console',e=>{if(e.type()==='error')consoleErrors.push(e.text());});
 await page.goto(base+'/#y=2024&e=Mexico%20City%20Grand%20Prix&k=Q&a=HAM&b=RUS&lab=overview');await page.waitForFunction(()=>typeof InsightLab!=='undefined'&&InsightLab.pair&&InsightLab.report,null,{timeout:120000});await page.evaluate(()=>document.fonts.ready);
 const capture=async(id,fullPage=false)=>{await page.evaluate(()=>window.scrollTo(0,0));await page.screenshot({path:path.join(out,id+'.jpg'),type:'jpeg',quality:87,fullPage});shots.push({id,viewport:page.viewportSize(),...(await page.evaluate(()=>({tab:InsightLab.tab,event:st.H.event,year:st.H.year,a:st.H.drivers[st.A.meta.d].c,b:st.H.drivers[st.B.meta.d].c,laps:[st.A.meta.n,st.B.meta.n],gain:InsightLab.report.gain,webgl:ghost3d.ready})))});};
 await capture('01-overview',true);
 await page.locator('#studioTab-duel').click();await capture('02-duel-story');
 await page.locator('#studioTab-drivers').click();await page.locator('[data-studio=multi]').click();await page.waitForFunction(()=>InsightLab.remote.multi?.ok,null,{timeout:120000});await capture('03-driving-profile');
 await page.locator('#studioTab-race').click();await page.locator('[data-studio=race]').click();await page.waitForFunction(()=>!!InsightLab.currentRace,null,{timeout:120000});await capture('04-race-dossier');
 await page.locator('#studioTab-notes').click();await page.locator('#studioNote [name=title]').fill('Meksika: giriş ve çıkış dengesi');await page.locator('#studioNote [name=note]').fill('Giriş ve çıkışı birlikte incele. Zaman farkı tek başına neden-sonuç kanıtı değildir.');await page.locator('#studioNote [name=start]').fill('10');await page.locator('#studioNote [name=end]').fill('20');await page.locator('[data-studio=preview]').click();await capture('05-study-notes');
 await page.setViewportSize({width:390,height:844});await page.locator('#studioTab-overview').click();await capture('06-mobile');
 fs.writeFileSync(path.join(out,'captures.json'),JSON.stringify({dpr:1,shots,errors,consoleErrors,note:'Real Chromium UI screenshots. Content mode never initialized the 3D renderer. Not an FPS benchmark.'},null,2));if(errors.length)throw Error(errors.join('; '));if(shots.some(s=>s.webgl))throw Error('Studio unexpectedly initialized WebGL');console.log('CONTENT_CAPTURES',shots.map(s=>s.id));
})().catch(e=>{console.error(e);process.exitCode=1;}).finally(async()=>{await browser?.close();});
