// Full unchanged test matrix; a fresh worker/browser for each independent case.
// Reuses the real base viewport, storage, timeout, launch flags and assertions.
const path=require('node:path'),root=path.resolve(__dirname,'../../..');
const base=require(path.join(root,'playwright.config.js'));
const cases=require('./isolated-test-plan.json');
const escape=s=>s.replace(/[.*+?^${}()|[\]\\]/g,'\\$&');
module.exports={...base,testDir:path.join(root,'tests'),outputDir:path.join(root,'test-results'),workers:1,
 webServer:{...base.webServer,cwd:root},
 projects:cases.map((c,i)=>({name:'isolated-'+String(i+1).padStart(2,'0'),testMatch:'**/'+c.file,grep:new RegExp(escape(c.title)+'$')}))};
