"""Original seamless microaggregate road maps. Python 3 + NumPy + Pillow.
These are authored material maps, not photographs or measurements of Mexico.
"""
import numpy as np
from PIL import Image
from pathlib import Path
import hashlib,json
rng=np.random.default_rng(4004);n=1024
fine=rng.normal(0,1,(n,n))
def blur(a,passes):
 for _ in range(passes):a=(a+np.roll(a,1,0)+np.roll(a,-1,0)+np.roll(a,1,1)+np.roll(a,-1,1))/5
 return a
aggregate=blur(fine,2);macro=blur(rng.normal(0,1,(n,n)),80);macro=macro/(macro.std()or 1)
base=np.clip(aggregate*10+fine*2+macro*1.5,-22,22);rgb=np.stack([base+88,base+91,base+93],axis=-1)
grain=blur(fine,1);dx=np.roll(grain,1,1)-np.roll(grain,-1,1);dy=np.roll(grain,1,0)-np.roll(grain,-1,0);normal=np.stack([128+dx*11,128+dy*11,np.ones_like(dx)*250],axis=-1);rough=203+np.clip(grain*13,-25,25)
p=Path('assets/v4');
for name,array in [('road-color',rgb),('road-normal',normal),('road-roughness',rough)]:Image.fromarray(np.clip(array,0,255).astype(np.uint8)).save(p/(name+'.jpg'),quality=94)
print('Generated original V4 microaggregate PBR maps')

# CC0 brown-mud-leaves material supplies fine soil variation under an authored turf palette.
soil=np.asarray(Image.open(p/'soil-color.jpg').convert('RGB').resize((n,n)),dtype=float);luma=soil.mean(axis=2);variation=(luma-luma.mean())*.13
patch=np.clip(macro*.12+.5,0,1)[...,None];green=np.array([108,117,78]);dry=np.array([102,99,73]);turf=green*patch+dry*(1-patch)+variation[...,None]
Image.fromarray(np.clip(turf,0,255).astype(np.uint8)).save(p/'turf-color.jpg',quality=92)
