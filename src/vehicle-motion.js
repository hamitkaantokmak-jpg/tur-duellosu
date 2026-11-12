/* Visual approximation only: no suspension solver or measured load transfer.
 * Fixed replay-time integration makes seeking/rate/FPS changes history independent. */
(function(root){
  const STEP=1/120, LIMITS=Object.freeze({pitch:Math.PI/360,roll:Math.PI/300,steer:.3,tau:.16});
  const clamp=(v,limit)=>Math.max(-limit,Math.min(limit,v));
  function build(duration,input){
    const count=Math.ceil(duration/STEP)+1, pitch=new Float64Array(count),roll=new Float64Array(count),steer=new Float64Array(count);
    const scratch={speed:0,acceleration:0,yawRate:0},alpha=-Math.expm1(-STEP/LIMITS.tau);
    for(let k=0;k<count;k++){
      input(Math.min(k*STEP,duration),scratch);
      const speed=Number.isFinite(scratch.speed)?Math.max(0,scratch.speed):0;
      const acceleration=Number.isFinite(scratch.acceleration)?scratch.acceleration:0;
      const yawRate=Number.isFinite(scratch.yawRate)?scratch.yawRate:0;
      // +X rotation lowers the +Z nose; +Z roll leans out of a right turn.
      const p=clamp(-acceleration*.00065,LIMITS.pitch),r=clamp(speed*yawRate*.00048,LIMITS.roll);
      const s=speed>2?clamp(Math.atan(3.32*yawRate/speed),LIMITS.steer):0;
      pitch[k]=k?pitch[k-1]+alpha*(p-pitch[k-1]):p;
      roll[k]=k?roll[k-1]+alpha*(r-roll[k-1]):r;
      steer[k]=k?steer[k-1]+alpha*(s-steer[k-1]):s;
    }
    return {duration,pitch,roll,steer};
  }
  function sample(table,time,out){
    const u=Math.max(0,Math.min(table.duration,Number.isFinite(time)?time:0))/STEP;
    const a=Math.min(Math.floor(u),table.pitch.length-1),b=Math.min(a+1,table.pitch.length-1),f=u-a;
    out.pitch=table.pitch[a]+(table.pitch[b]-table.pitch[a])*f;
    out.roll=table.roll[a]+(table.roll[b]-table.roll[a])*f;
    out.steer=table.steer[a]+(table.steer[b]-table.steer[a])*f;return out;
  }
  const api={STEP,LIMITS,build,sample};root.VehicleMotion=api;
  if(typeof module!=='undefined')module.exports=api;
})(typeof globalThis!=='undefined'?globalThis:this);
