"""Original, unbranded open-wheel design. Not a replica of a verified team car.
Reuses V4's measured pivot contract, not external geometry or textures.
blender -b --threads 2 --python art/blender/build_v7.py
"""
import sys, math, json, hashlib
from pathlib import Path
import bpy
sys.path.insert(0,str(Path.cwd()/'art/blender'))
import build_v4 as v

original_loft=v.loft
LEVEL='high'

def shaped_loft(name,sections,mat,cx=0):
 if name=='UndercutSidepod':
  # Wide upper shoulder, deep undercut and a taper into the coke-bottle region.
  sections=[(.84,.19,.37,.58),(.70,.29,.29,.61),(.38,.32,.23,.60),(-.10,.30,.20,.55),(-.62,.235,.18,.43),(-1.12,.14,.17,.32),(-1.60,.065,.16,.24)]
  profile=[(-1,.60),(-.96,.87),(-.70,.99),(-.30,1),(.40,1),(.84,.97),(1,.82),(.98,.60),(.77,.22),(.40,.04),(0,0),(-.50,.12)]
  verts=[(cx+x*w,b+y*(t-b),z) for z,w,b,t in sections for x,y in profile];n=len(profile)
  faces=[(i*n+j,i*n+(j+1)%n,(i+1)*n+(j+1)%n,(i+1)*n+j) for i in range(len(sections)-1) for j in range(n)]
  # Mouth is open; the recessed carbon intake below supplies its dark interior.
  faces.append(tuple((len(sections)-1)*n+j for j in range(n)))
  obj=v.mesh(name,verts,faces,mat)
  if LEVEL!='low':
   m=obj.modifiers.new('Controlled shoulder radii','SUBSURF');m.levels=1;bpy.context.view_layer.objects.active=obj;bpy.ops.object.modifier_apply(modifier=m.name)
  return obj
 if name=='RaisedNose':sections=[(2.53,.075,.245,.30),(2.35,.10,.25,.32),(1.95,.135,.27,.36),(1.52,.19,.28,.43),(1.15,.27,.28,.55),(.94,.31,.28,.59)]
 if name=='EngineCover':sections=[(-.25,.22,.30,.70),(-.48,.215,.28,.88),(-.80,.18,.24,.85),(-1.20,.13,.18,.67),(-1.66,.075,.16,.39),(-2.10,.04,.16,.23)]
 # More deliberate sections, fewer redundant subdivision faces than V4 high.
 old=v.DETAIL;v.DETAIL=min(old,2)
 try:return original_loft(name,sections,mat,cx)
 finally:v.DETAIL=old

v.loft=shaped_loft

def remove_named(prefixes):
 for o in list(bpy.context.scene.objects):
  if any(o.name.startswith(p) for p in prefixes):bpy.data.objects.remove(o,do_unlink=True)

def tyre(wheel,front,side):
 z=1.55 if front else -1.77;cx=side*.805;half=.175 if front else .195
 center=(cx,.36,z);n={'high':64,'medium':40,'low':24}[LEVEL]
 # 720mm diameter, distinct front/rear slick widths; no invented tread or branding.
 profile=[(-1,.252),(-.99,.289),(-.92,.327),(-.78,.350),(-.48,.359),(0,.36),(.48,.359),(.78,.350),(.92,.327),(.99,.289),(1,.252)]
 verts=[];uv=[];faces=[]
 for k,(a,r) in enumerate(profile):
  for j in range(n):
   angle=j/n*2*math.pi;verts.append((cx+a*half,.36+math.cos(angle)*r,z+math.sin(angle)*r));uv.append((j/n,k/(len(profile)-1)))
 for k in range(len(profile)-1):
  for j in range(n):a=k*n+j;b=k*n+(j+1)%n;faces.append((a,a+n,b+n,b))
 v.parent(v.mesh('V7_SlickCarcass',verts,faces,v.rubber,uv=uv),wheel)
 for face in [-1,1]:
  x=cx+face*half
  for radius,thickness,mat,name in [(.302,.002,v.red,'CompoundBand'),(.247,.008,v.carbon,'RimBead')]:
   bpy.ops.mesh.primitive_torus_add(major_segments={'high':48,'medium':32,'low':20}[LEVEL],minor_segments=4 if LEVEL!='low' else 3,location=v.xyz((x,.36,z)),major_radius=radius,minor_radius=thickness,rotation=(0,math.pi/2,0))
   v.parent(v.finish(bpy.context.object,name,mat),wheel)
  v.parent(v.rod('WheelCover',(x-.006,.36,z),(x+.006,.36,z),.231,v.carbon,40 if LEVEL=='high' else 24),wheel)
  v.parent(v.rod('CaptiveCentreNut',(x-.014,.36,z),(x+.014,.36,z),.032,v.metal,6),wheel)
  count=8 if LEVEL=='high' else 5 if LEVEL=='medium' else 0
  for j in range(count):
   a=j/max(1,count)*math.tau
   v.parent(v.rod('WheelCoverVent',(x,.36+math.cos(a)*.17,z+math.sin(a)*.17),(x,.36+math.cos(a+.09)*.208,z+math.sin(a+.09)*.208),.005,v.metal,6),wheel)
  # Original embossed sidewall witness marks give rotation a readable cue.
  if LEVEL!='low':
   vs=[];fs=[]
   for j in range(12):
    a=j/12*math.tau
    for r,t in [(.315,-.005),(.328,-.005),(.328,.005),(.315,.005)]:vs.append((x+face*.0005,.36+math.cos(a+t)*r,z+math.sin(a+t)*r))
    fs.append(tuple(range(len(vs)-4,len(vs))))
   v.parent(v.mesh('SidewallWitnessMarks',vs,fs,v.rubber,False),wheel)
 # Closed wheel covers hide the rotor; omit that invisible internal geometry.

def car():
 root=v.make_car();root.name='TD_V7_OpenWheel'
 remove_named(['RadiatorInlet','SidepodAccent','FloorEdgeStrake','Wishbone','PushRod','DriverVisor'])
 # A visor follows the helmet shell rather than intersecting it as a black bead.
 segments={'high':24,'medium':16,'low':10}[LEVEL];verts=[]
 for latitude in [.10,.30,.50]:
  for j in range(segments+1):
   a=-1.60+3.20*j/segments;verts.append((.148*math.cos(latitude)*math.sin(a),.69+.183*math.sin(latitude),.18+.174*math.cos(latitude)*math.cos(a)))
 faces=[(k*(segments+1)+j,k*(segments+1)+j+1,(k+1)*(segments+1)+j+1,(k+1)*(segments+1)+j) for k in range(2) for j in range(segments)]
 v.mesh('WraparoundVisor',verts,faces,v.visor)
 # Keep all four axle/steering and wheel empties at their original transforms.
 for wheel in [o for o in root.children_recursive if o.type=='EMPTY' and o.name.startswith('Wheel_')]:
  for o in list(wheel.children):bpy.data.objects.remove(o,do_unlink=True)
  tyre(wheel,wheel.name.startswith('Wheel_F'),-1 if '-1' in wheel.name else 1)
 for side in [-1,1]:
  # A recessed mouth, upper highlight and visually separate intake floor.
  v.mesh('RecessedRadiatorMouth',[(side*(.55+x),y,.825) for x,y in [(-.145,.43),(-.16,.53),(-.10,.568),(.10,.568),(.16,.53),(.145,.43)]],[tuple(range(6))],v.carbon,False)
  v.tube('ShoulderAccent',[(side*.72,.59,.68),(side*.85,.57,.22),(side*.76,.46,-.48),(side*.57,.31,-1.12)],.010,v.accent)
  v.tube('FloorEdge',[(side*.94,.13,.50),(side*.98,.13,-.40),(side*.95,.15,-1.45),(side*.87,.22,-2.05)],.012,v.carbon)
  for j in range(5 if LEVEL=='high' else 3 if LEVEL=='medium' else 0):
   z=-.10-j*.10;x=side*(.66-j*.015);y=.535-j*.019
   v.mesh('CoolingSlot',[(x-side*.075,y,z),(x+side*.075,y,z-.04),(x+side*.073,y-.003,z-.065),(x-side*.075,y-.003,z-.025)],[(0,1,2,3)],v.carbon,False)
  for front,z in [(True,1.55),(False,-1.77)]:
   for h in [.205,.455]:
    for dz in [-.30,.30]:v.rod('AeroWishbone',(side*.25,h,z+dz),(side*.71,.36,z),.011,v.carbon,8 if LEVEL!='low' else 6)
   v.rod('PushRod',(side*.27,.57,z-.17),(side*.715,.31,z),.011,v.carbon,8 if LEVEL!='low' else 6)
   # Upright/linkage remain with the chassis; only the wheel spins. This is a
   # rigid visual linkage, not kinematic suspension travel or tyre deformation.
   v.rod('Upright',(side*.70,.25,z),(side*.70,.47,z),.022,v.carbon,8)
   if front:v.rod('SteeringLink',(side*.27,.32,z-.12),(side*.71,.34,z-.06),.009,v.carbon,6)
 v.rod('ExhaustShroud',(0,.40,-1.94),(0,.44,-2.24),.05,v.carbon,12 if LEVEL!='low' else 8)
 # Join the existing diffuser fences to a continuous ramp, avoiding loose fins.
 v.mesh('DiffuserRamp',[(-.76,.22,-1.60),(.76,.22,-1.60),(.76,.32,-2.35),(-.76,.32,-2.35)],[(0,1,2,3)],v.carbon,False)
 # Authoring additions join the root, keeping the static material batches intact.
 for o in list(bpy.context.scene.objects):
  if o!=root and o.parent is None:v.parent(o,root)
 return root

stats=[]
for level,detail in [('high',3),('medium',2),('low',1)]:
 LEVEL=level;v.DETAIL=detail;v.clear();v.setup_materials()
 # Bounded PBR; existing clearcoat extension already used in V4.
 for mat,rough,metal,color in [(v.paint,.28,.28,(.055,.095,.115)),(v.carbon,.43,.08,(.075,.080,.085)),(v.rubber,.88,0,(.023,.024,.025)),(v.metal,.32,.68,(.33,.35,.36))]:
  shader=mat.node_tree.nodes.get('Principled BSDF');shader.inputs['Roughness'].default_value=rough;shader.inputs['Metallic'].default_value=metal;shader.inputs['Base Color'].default_value=(*color,1)
 for mat in [v.paint,v.accent]:mat.node_tree.nodes.get('Principled BSDF').inputs['Coat Weight'].default_value=.38
 root=car();bpy.context.scene.unit_settings.system='METRIC'
 if level=='high':bpy.ops.wm.save_as_mainfile(filepath=str(v.ROOT/'art/blender/vehicle-v7.blend'),compress=True)
 v.batch(root);v.export(v.OUT/('car-'+level+'-raw.glb'),root)
 stats.append({'lod':level,'objects':len(root.children_recursive)})
metadata={'version':7,'blender':bpy.app.version_string,'source':'art/blender/build_v7.py','units':'metres','exportForward':'+Z','exportUp':'+Y','original':True,'teamReplica':False,'wheelbase_m':3.32,'tyreRadius_m':.36,'frontTyreWidth_m':.35,'rearTyreWidth_m':.39,'suspension':'rigid visual linkages; no suspension physics','car':stats}
(v.OUT/'vehicle-v7-authoring.json').write_text(json.dumps(metadata,indent=2)+'\n')
print('V7_VEHICLE_BUILD_COMPLETE')
