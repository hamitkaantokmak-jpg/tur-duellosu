const {test,expect}=require('@playwright/test'),fs=require('node:fs');
const fixture=require('./fixtures/synthetic-topography.cjs');
test('free camera sweep cannot cross an elevated road between safe endpoints',async({page},info)=>{
 await page.addInitScript(p=>{window.TOPOGRAPHY_TEST_PROFILE=p;},fixture);
 await page.goto('/?topographyTest=synthetic#y=2024&e=Mexico%20City%20Grand%20Prix&k=Q&a=HAM&b=RUS&g=1');
 await page.waitForFunction(()=>typeof ghost3d!=='undefined'&&ghost3d.ready&&ghost3d.v4Stats&&VisualAssets.state==='ready',null,{timeout:120000});
 const result=await page.evaluate(()=>{
  stopPlay();drawAll();const G=ghost3d,s=G.surface;
  const a=s.sampleAtDistance(129).position,b=s.sampleAtDistance(904).position;
  const from=[a.x,s.heightAt(a.x,a.z)+.7,a.z],to=[b.x,s.heightAt(b.x,b.z)+.7,b.z];
  // Isolate the road/terrain; a barrier collision must not make this test pass.
  G.environment.visible=false;for(const o of G.v4Obstacles||[])o.visible=false;
  const safe=ghostConstrainFree(to,from);
  return {requested:Math.hypot(...to.map((v,i)=>v-from[i])),moved:Math.hypot(...safe.map((v,i)=>v-from[i])),safe,terrain:s.heightAt(safe[0],safe[2]),roadCollider:G.world.getObjectByName('TopographyRoad').userData.cameraTerrain};
 });
 fs.writeFileSync(info.outputPath('terrain-collision.json'),JSON.stringify(result,null,2));
 expect(result.moved).toBeGreaterThan(0);expect(result.moved).toBeLessThan(result.requested*.75);expect(result.safe[1]).toBeGreaterThanOrEqual(result.terrain+.64);
});
