// Read-only pixel analysis. Original screenshots are never edited.
const fs=require('node:fs'),{PNG}=require('../../node_modules/playwright-core/lib/utilsBundle.js');
const data=JSON.parse(fs.readFileSync('docs/visual/v9-nvidia/captures.json','utf8'));
const rows=data.pairs.map((p,i)=>{
 const a=PNG.sync.read(fs.readFileSync(data.records.before[i].file)),b=PNG.sync.read(fs.readFileSync(data.records.after[i].file));
 if(a.width!==b.width||a.height!==b.height)throw Error('Image dimensions differ');
 let changedPixels=0,changedChannels=0,max=0,sum=0,worldChanged=0,x0=a.width,y0=a.height,x1=-1,y1=-1;
 for(let y=0;y<a.height;y++)for(let x=0;x<a.width;x++){
  const j=(y*a.width+x)*4;let different=false;
  for(let k=0;k<4;k++){const d=Math.abs(a.data[j+k]-b.data[j+k]);if(d){changedChannels++;different=true;}max=Math.max(max,d);sum+=d*d;}
  if(different){changedPixels++;if(y>=250)worldChanged++;x0=Math.min(x0,x);y0=Math.min(y0,y);x1=Math.max(x1,x);y1=Math.max(y1,y);}
 }
 return {name:p.name,width:a.width,height:a.height,changedPixels,changedChannels,changedPercent:changedPixels/(a.width*a.height)*100,maxChannelDifference:max,rmse:Math.sqrt(sum/a.data.length),differenceBounds:changedPixels?[x0,y0,x1,y1]:null,changedPixelsBelowTopHud250:worldChanged};
});
fs.writeFileSync('docs/visual/v9-nvidia/pixel-comparison.json',JSON.stringify({method:'Full PNG RGBA pixel comparison. The additional y>=250 count is an explicitly defined world/vehicle region, not a replacement for the full image metric. No image masking or editing.',rows},null,2)+'\n');
console.log(JSON.stringify({pairs:rows.length,maxChangedPercent:Math.max(...rows.map(r=>r.changedPercent)),maxRmse:Math.max(...rows.map(r=>r.rmse)),worldRegionExact:rows.every(r=>r.changedPixelsBelowTopHud250===0)}));
