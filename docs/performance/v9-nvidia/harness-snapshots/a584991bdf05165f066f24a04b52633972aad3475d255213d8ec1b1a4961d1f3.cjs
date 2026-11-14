// Shared by the browser collector and Node tests. Distinct RAF stamps count once.
(function(root){
 function countFrameWindow(start,end,stamps,completions){
  if(!Number.isFinite(start)||!Number.isFinite(end)||end<=start||stamps.length!==completions.length)throw Error('Invalid frame window');
  const grouped=[];
  for(let i=0;i<stamps.length;i++){
   const s=stamps[i],t=completions[i];
   if(!Number.isFinite(s)||!Number.isFinite(t)||t<start||t>end||(i&&(s<stamps[i-1]||t<completions[i-1])))throw Error('Nonmonotonic frame samples');
   if(i&&s===stamps[i-1])grouped[grouped.length-1]=t;else grouped.push(t);
  }
  const intervals=grouped.map((t,i)=>t-(i?grouped[i-1]:start));
  return {counterVersion:'unique-raf-v2',frames:grouped.length,ticks:stamps.length,renderInvocations:completions.length,uniqueRaf:grouped.length,duplicateRafCallbacks:stamps.length-grouped.length,observedMs:end-start,fps:grouped.length*1000/(end-start),intervals,tailMs:end-(grouped.at(-1)??start)};
 }
 if(typeof module!=='undefined')module.exports=countFrameWindow;else root.countFrameWindow=countFrameWindow;
})(globalThis);
