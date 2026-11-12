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
  // Exact projected triangle height on the rendered asphalt, spatially bounded.
  // Built once per world. Queries allocate no arrays and do not raycast the track.
  function roadSurface(positions,indices,cell=8){
    const grid=new Map(),count=indices?indices.length:positions.length/3;let cells=0;
    const vertex=i=>(indices?indices[i]:i)*3;
    for(let i=0;i<count;i+=3){
      const a=vertex(i),b=vertex(i+1),c=vertex(i+2);
      const x0=Math.floor(Math.min(positions[a],positions[b],positions[c])/cell),x1=Math.floor(Math.max(positions[a],positions[b],positions[c])/cell);
      const z0=Math.floor(Math.min(positions[a+2],positions[b+2],positions[c+2])/cell),z1=Math.floor(Math.max(positions[a+2],positions[b+2],positions[c+2])/cell);
      for(let x=x0;x<=x1;x++)for(let z=z0;z<=z1;z++){
        let row=grid.get(x);if(!row)grid.set(x,row=new Map());
        let list=row.get(z);if(!list){row.set(z,list=[]);cells++;}list.push(i);
      }
    }
    function height(x,z,hintY){
      const list=grid.get(Math.floor(x/cell))?.get(Math.floor(z/cell));let result=NaN,best=Infinity;
      if(!list)return result;
      for(let k=0;k<list.length;k++){
        const i=list[k],a=vertex(i),b=vertex(i+1),c=vertex(i+2);
        const ax=positions[a],az=positions[a+2],bx=positions[b]-ax,bz=positions[b+2]-az,cx=positions[c]-ax,cz=positions[c+2]-az;
        const det=bx*cz-bz*cx;if(Math.abs(det)<1e-12)continue;
        const dx=x-ax,dz=z-az,u=(dx*cz-dz*cx)/det,v=(bx*dz-bz*dx)/det;
        if(u< -1e-7||v< -1e-7||u+v>1+1e-7)continue;
        const y=positions[a+1]+u*(positions[b+1]-positions[a+1])+v*(positions[c+1]-positions[a+1]),error=Math.abs(y-hintY);
        if(error<best){best=error;result=y;}
      }
      return result;
    }
    return {height,cells,positionBytes:positions.byteLength};
  }
  const api={STEP,LIMITS,build,sample,roadSurface};root.VehicleMotion=api;
  if(typeof module!=='undefined')module.exports=api;
})(typeof globalThis!=='undefined'?globalThis:this);
