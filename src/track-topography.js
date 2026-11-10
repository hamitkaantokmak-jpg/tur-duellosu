/* Y-up surface geometry. Station distance is an independent parameter, never a
   replacement for telemetry distance/time. No measured profiles ship in V5. */
(function(root) {
  'use strict';
  const wrap=(v,l)=>((v%l)+l)%l;
  const unit=v=>{const n=Math.hypot(v.x,v.y,v.z);if(!Number.isFinite(n)||n<1e-10)throw Error('Degenerate track frame');return {x:v.x/n,y:v.y/n,z:v.z/n};};
  const cross=(a,b)=>({x:a.y*b.z-a.z*b.y,y:a.z*b.x-a.x*b.z,z:a.x*b.y-a.y*b.x});
  const dot=(a,b)=>a.x*b.x+a.y*b.y+a.z*b.z;
  const categories=['verified','derived','illustrative','unavailable'];
  // Periodic monotone cubic interpolation: extrema stay bounded and the value
  // AND first derivative agree at the start/finish seam.
  function channel(samples,key,length,fallback) {
    const rows=samples.slice(0,-1),n=rows.length;
    if(!n)return ()=>({value:fallback,derivative:0});
    const values=rows.map(p=>p[key]??fallback),slopes=rows.map((p,i)=>{
      const prev=(i+n-1)%n,next=(i+1)%n;
      const h0=i?p.distance-rows[prev].distance:p.distance+length-rows[prev].distance;
      const h1=next?rows[next].distance-p.distance:rows[next].distance+length-p.distance;
      const a=(values[i]-values[prev])/h0,b=(values[next]-values[i])/h1;
      return a*b<=0?0:3*(h0+h1)/((2*h1+h0)/a+(h1+2*h0)/b);
    });
    return d=>{
      d=wrap(d,length);let lo=0,hi=n;
      while(hi-lo>1){const m=(lo+hi)>>1;if(rows[m].distance<=d)lo=m;else hi=m;}
      const j=(lo+1)%n,a=rows[lo].distance,b=j?rows[j].distance:length,h=b-a,t=(d-a)/h;
      const v0=values[lo],v1=values[j],m0=slopes[lo]*h,m1=slopes[j]*h;
      return {value:(2*t**3-3*t*t+1)*v0+(t**3-2*t*t+t)*m0+(-2*t**3+3*t*t)*v1+(t**3-t*t)*m1,
        derivative:((6*t*t-6*t)*v0+(3*t*t-4*t+1)*m0+(-6*t*t+6*t)*v1+(3*t*t-2*t)*m1)/h};
    };
  }
  function create({length,centerline,profile=null,width=14,resolution=2}) {
    if(!Number.isFinite(length)||length<=0||typeof centerline!=='function'||!Number.isFinite(width)||width<=0||!Number.isFinite(resolution)||resolution<=0)throw Error('Invalid track definition');
    const metadata={...(profile?.metadata||{category:'unavailable',source:null,license:null,label:'Yükseklik verisi yok · düz referans'})};
    if(!categories.includes(metadata.category))throw Error('Unknown elevation accuracy');
    if(profile&&(!metadata.source||!metadata.license))throw Error('Profile requires provenance and license');
    const samples=(profile?.samples||[]).map(p=>({...p}));
    if(profile){
      if(samples.length<3||samples[0].distance!==0||Math.abs(samples.at(-1).distance-length)>1e-6)throw Error('Profile must cover a closed station loop');
      samples.forEach((p,i)=>{for(const k of ['distance','elevation','banking','width'])if(p[k]!==undefined&&!Number.isFinite(p[k]))throw Error('Nonfinite '+k);
        if(!Number.isFinite(p.elevation)||i&&p.distance<=samples[i-1].distance||Math.abs(p.banking||0)>.35||p.width!==undefined&&p.width<=0)throw Error('Invalid profile sample');});
      for(const k of ['elevation','banking','width'])if(Math.abs((samples[0][k]??(k==='width'?width:0))-(samples.at(-1)[k]??(k==='width'?width:0)))>1e-6)throw Error('Discontinuous profile seam');
    }
    const elevation=channel(samples,'elevation',length,0),bank=channel(samples,'banking',length,0),widthAt=channel(samples,'width',length,width);
    const count=Math.max(32,Math.ceil(length/resolution)),step=length/count,points=Array.from({length:count},(_,i)=>{
      const p=centerline(i/count);if(!Number.isFinite(p.x)||!Number.isFinite(p.z))throw Error('Nonfinite centerline');return {x:p.x,z:p.z};
    });
    // Segment grid is built once. Nearest projection never scans the full track
    // per animation frame; vehicle queries use a station hint at crossings.
    const cell=32,grid=new Map();
    for(let i=0;i<count;i++){
      const a=points[i],b=points[(i+1)%count];
      for(let x=Math.floor(Math.min(a.x,b.x)/cell);x<=Math.floor(Math.max(a.x,b.x)/cell);x++)for(let z=Math.floor(Math.min(a.z,b.z)/cell);z<=Math.floor(Math.max(a.z,b.z)/cell);z++){
        const key=x+':'+z;if(!grid.has(key))grid.set(key,[]);grid.get(key).push(i);
      }
    }
    function center(d){const k=wrap(d,length)/step,i=Math.floor(k),t=k-i,a=points[i],b=points[(i+1)%count];return {x:a.x+(b.x-a.x)*t,z:a.z+(b.z-a.z)*t};}
    function horizontal(d){const a=center(d-3),b=center(d+3),n=Math.hypot(b.x-a.x,b.z-a.z);if(n<1e-6)throw Error('Degenerate centerline');return {fx:(b.x-a.x)/n,fz:(b.z-a.z)/n,metric:n/6};}
    function sampleAtDistance(d,offset=0){
      if(!Number.isFinite(d)||!Number.isFinite(offset))throw Error('Nonfinite surface query');
      const p=center(d),h=horizontal(d),e=elevation(d),b=bank(d),tan=Math.tan(b.value),rx=h.fz,rz=-h.fx;
      // dy/d(horizontal station), including bank transition at this lateral offset.
      const before=horizontal(d-1),after=horizontal(d+1);
      const turn=(after.fx-before.fx)*rx+(after.fz-before.fz)*rz;
      const curvature=turn/(2*h.metric),jacobian=1-offset*curvature;
      if(Math.abs(offset)<=widthAt(d).value/2&&jacobian<=.02)throw Error('Track width folds the inner surface');
      const safeJacobian=Math.abs(jacobian)<.02?(jacobian<0?-.02:.02):jacobian;
      const gradient=(e.derivative+offset*b.derivative/(Math.cos(b.value)**2))/(h.metric*safeJacobian);
      const normal=unit({x:-h.fx*gradient-rx*tan,y:1,z:-h.fz*gradient-rz*tan});
      const right=unit({x:rx,y:tan,z:rz}),tangent=unit(cross(right,normal));
      return {distance:wrap(d,length),position:{x:p.x+rx*offset,y:e.value+offset*tan,z:p.z+rz*offset},elevation:e.value,gradient,banking:b.value,width:widthAt(d).value,surfaceNormal:normal,tangent,right};
    }
    function project(x,z,hint){
      if(!Number.isFinite(x)||!Number.isFinite(z))throw Error('Nonfinite projection');
      let candidates,searchBoundary=Infinity;
      if(Number.isFinite(hint)){
        const origin=center(hint),reach=Math.min(Math.floor(count/3),Math.max(12,Math.ceil((40+Math.hypot(x-origin.x,z-origin.z)*2)/step))),k=Math.floor(wrap(hint,length)/step);candidates=[];
        for(let j=-reach;j<=reach;j++)candidates.push((k+j+count)%count);
      }else{
        const cx=Math.floor(x/cell),cz=Math.floor(z/cell),found=new Set();
        for(let ring=0;ring<=4;ring++){
          for(let dx=-ring;dx<=ring;dx++)for(let dz=-ring;dz<=ring;dz++)if(ring===0||Math.abs(dx)===ring||Math.abs(dz)===ring)for(const i of grid.get((cx+dx)+':'+(cz+dz))||[])found.add(i);
          // Search a halo as well: the first occupied cell need not contain the nearest segment.
          if(ring>=2&&found.size){searchBoundary=Math.min(x-(cx-ring)*cell,(cx+ring+1)*cell-x,z-(cz-ring)*cell,(cz+ring+1)*cell-z);break;}
        }
        candidates=found.size?[...found]:points.map((_,i)=>i);
      }
      let best=null;
      for(const i of candidates){const a=points[i],b=points[(i+1)%count],dx=b.x-a.x,dz=b.z-a.z,den=dx*dx+dz*dz;if(den<1e-12)continue;
        const t=Math.max(0,Math.min(1,((x-a.x)*dx+(z-a.z)*dz)/den)),px=a.x+t*dx,pz=a.z+t*dz,error=(x-px)**2+(z-pz)**2;
        if(!best||error<best.error){const n=Math.sqrt(den);best={distance:(i+t)*step,offset:((x-px)*dz-(z-pz)*dx)/n,error};}}
      // If a closer segment could lie outside the visited cells, prove the
      // nearest result with the remaining segments. Vehicle hints stay local.
      if(best&&best.error>=searchBoundary*searchBoundary){
        const seen=new Set(candidates);
        for(let i=0;i<count;i++)if(!seen.has(i)){
          const a=points[i],b=points[(i+1)%count],dx=b.x-a.x,dz=b.z-a.z,den=dx*dx+dz*dz;if(den<1e-12)continue;
          const t=Math.max(0,Math.min(1,((x-a.x)*dx+(z-a.z)*dz)/den)),px=a.x+t*dx,pz=a.z+t*dz,error=(x-px)**2+(z-pz)**2;
          if(error<best.error)best={distance:(i+t)*step,offset:((x-px)*dz-(z-pz)*dx)/Math.sqrt(den),error};
        }
      }
      if(!best)throw Error('No nondegenerate track segment');best.distance=wrap(best.distance,length);return best;
    }
    const flat=!samples.length||samples.every(p=>p.elevation===0&&!(p.banking||0));
    return {length,metadata,flat,points,step,sampleAtDistance,project,heightAt(x,z,hint){if(!Number.isFinite(x)||!Number.isFinite(z))throw Error('Nonfinite height query');if(flat)return 0;const p=project(x,z,hint);const w=widthAt(p.distance).value/2+24;return elevation(p.distance).value+Math.max(-w,Math.min(w,p.offset))*Math.tan(bank(p.distance).value);}};
  }
  const orientationScratch=new WeakMap();
  function orientation(T,normal,fx,fz,target=new T.Quaternion()){
    if(!Number.isFinite(fx)||!Number.isFinite(fz)||Math.hypot(fx,fz)<1e-10)throw Error('Invalid vehicle heading');
    const n=unit(normal);
    let scratch=orientationScratch.get(T);
    if(!scratch){scratch={up:new T.Vector3(),forward:new T.Vector3(),right:new T.Vector3(),matrix:new T.Matrix4()};orientationScratch.set(T,scratch);}
    const {up,forward,right,matrix}=scratch;up.set(n.x,n.y,n.z);forward.set(fx,0,fz);
    forward.addScaledVector(up,-forward.dot(up));
    if(forward.lengthSq()<1e-12)throw Error('Heading is parallel to surface normal');
    forward.normalize();
    right.crossVectors(up,forward).normalize();
    up.crossVectors(forward,right).normalize();
    const previous={x:target.x,y:target.y,z:target.z,w:target.w};
    target.setFromRotationMatrix(matrix.makeBasis(right,up,forward));
    if(target.x*previous.x+target.y*previous.y+target.z*previous.z+target.w*previous.w<0)target.set(-target.x,-target.y,-target.z,-target.w);
    return target;
  }
  root.TrackTopography={create,orientation,unit,cross,dot};
  if(typeof module!=='undefined')module.exports=root.TrackTopography;
})(typeof globalThis!=='undefined'?globalThis:this);
