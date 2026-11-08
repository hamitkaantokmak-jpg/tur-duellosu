"""Original Tur Duellosu V4 art. Blender 4.3; metres, +Z forward in exported glTF.
Run from repository root: blender -b --python art/blender/build_v4.py
No team/sponsor geometry. Authoring modifiers are applied for deterministic glTF export.
"""
import bpy, math, random, json
from pathlib import Path
from mathutils import Vector
ROOT=Path.cwd();OUT=ROOT/'assets/v4';OUT.mkdir(parents=True,exist_ok=True)
random.seed(441)
DETAIL=2

def xyz(p):return (p[0],-p[2],p[1])
def clear():
 bpy.ops.object.select_all(action='SELECT');bpy.ops.object.delete(use_global=False)
 for data in list(bpy.data.meshes):
  if data.users==0:bpy.data.meshes.remove(data)
def material(name,color,rough=.6,metal=0):
 m=bpy.data.materials.new(name);m.diffuse_color=(*color,1);m.use_nodes=True;p=m.node_tree.nodes.get('Principled BSDF');p.inputs['Base Color'].default_value=(*color,1);p.inputs['Roughness'].default_value=rough;p.inputs['Metallic'].default_value=metal
 if name in ['Paint','Accent']:p.inputs['Coat Weight'].default_value=.55;p.inputs['Coat Roughness'].default_value=.24
 return m
def setup_materials():
 global paint,accent,carbon,rubber,metal,brake,helmet,visor,red,concrete,steel,glass,leaf,bark,roof,seat
 paint=material('Paint',(.028,.065,.079),.42,.32);accent=material('Accent',(.06,.65,.48),.3,.25);carbon=material('Carbon',(.016,.020,.023),.56,.05);rubber=material('Tyre',(.018,.019,.020),.94);metal=material('Metal',(.32,.35,.36),.36,.8);brake=material('BrakeDisc',(.15,.15,.14),.68,.4);helmet=material('Helmet',(.74,.78,.76),.32);visor=material('Visor',(.025,.04,.05),.16,.65);red=material('TyreStripe',(.65,.045,.035),.8)
 concrete=material('Kit_Concrete',(.47,.48,.46),.9);steel=material('Kit_Steel',(.25,.29,.31),.43,.72);glass=material('Kit_Glass',(.095,.15,.18),.24,.45);leaf=material('Kit_Foliage',(.12,.21,.07),.92);bark=material('Kit_Bark',(.20,.15,.10),.95);roof=material('Kit_Paint',(.65,.69,.7),.45,.25);seat=material('Kit_Seat',(.13,.25,.23),.72)
def finish(o,name,m,smooth=True):
 o.name=name;o.data.materials.append(m)
 if smooth and hasattr(o.data,'polygons'):
  for p in o.data.polygons:p.use_smooth=True
 return o
def mesh(name,verts,faces,m,smooth=True,uv=None):
 data=bpy.data.meshes.new(name);data.from_pydata([xyz(p)for p in verts],[],faces);data.update();o=bpy.data.objects.new(name,data);bpy.context.collection.objects.link(o);finish(o,name,m,smooth)
 layer=data.uv_layers.new(name='UVMap')
 for p in data.polygons:
  for li in p.loop_indices:
   vi=data.loops[li].vertex_index;v=verts[vi];layer.data[li].uv=uv[vi]if uv else(v[0]*2,v[2]*2+v[1])
 return o
def cube(name,p,size,m,bevel=.015):
 bpy.ops.mesh.primitive_cube_add(size=1,location=xyz(p));o=bpy.context.object;o.scale=(size[0],size[2],size[1]);bpy.ops.object.transform_apply(location=False,rotation=False,scale=True);finish(o,name,m,False)
 if bevel:
  mod=o.modifiers.new('Manufactured edge radii','BEVEL');mod.width=bevel;mod.segments=2 if DETAIL>1 else 1;bpy.ops.object.modifier_apply(modifier=mod.name)
  mod=o.modifiers.new('Weighted corner normals','WEIGHTED_NORMAL');bpy.ops.object.modifier_apply(modifier=mod.name)
 return o
def ball(name,p,scale,m):
 bpy.ops.mesh.primitive_uv_sphere_add(segments=24 if DETAIL>1 else 12,ring_count=12 if DETAIL>1 else 6,location=xyz(p));o=bpy.context.object;o.scale=(scale[0],scale[2],scale[1]);bpy.ops.object.transform_apply(location=False,rotation=False,scale=True);return finish(o,name,m)
def rod(name,a,b,r,m,vertices=None):
 va,vb=Vector(xyz(a)),Vector(xyz(b));d=vb-va;bpy.ops.mesh.primitive_cylinder_add(vertices=vertices or (12 if DETAIL>1 else 6),radius=r,depth=d.length,location=(va+vb)/2);o=bpy.context.object;o.rotation_quaternion=Vector((0,0,1)).rotation_difference(d.normalized());o.rotation_mode='QUATERNION';o.rotation_quaternion=Vector((0,0,1)).rotation_difference(d.normalized());return finish(o,name,m)
def tube(name,points,r,m):
 curve=bpy.data.curves.new(name,'CURVE');curve.dimensions='3D';curve.resolution_u=12;curve.bevel_depth=r;curve.bevel_resolution=2 if DETAIL>1 else 1;s=curve.splines.new('BEZIER');s.bezier_points.add(len(points)-1)
 for b,p in zip(s.bezier_points,points):b.co=xyz(p);b.handle_left_type=b.handle_right_type='AUTO'
 o=bpy.data.objects.new(name,curve);bpy.context.collection.objects.link(o);o.data.materials.append(m);bpy.context.view_layer.objects.active=o;o.select_set(True);bpy.ops.object.convert(target='MESH');o.select_set(False);return o
def empty(name,p=(0,0,0)):
 o=bpy.data.objects.new(name,None);bpy.context.collection.objects.link(o);o.location=xyz(p);return o
def parent(o,p):
 bpy.context.view_layer.update();matrix=o.matrix_world.copy();o.parent=p;o.matrix_world=matrix
 return o
def loft(name,sections,m,cx=0):
 # sections = longitudinal z, half width, bottom height, top height. Controlled cross-section.
 verts=[];uv=[];faces=[];n=24 if DETAIL>1 else 12
 for i,(z,w,b,t)in enumerate(sections):
  for j in range(n):
   a=j/n*2*math.pi;verts.append((cx+math.cos(a)*w,(b+t)/2+math.sin(a)*(t-b)/2,z));uv.append((j/n,i/(len(sections)-1)))
 for i in range(len(sections)-1):
  for j in range(n):a=i*n+j;b=i*n+(j+1)%n;faces.append((a,b,b+n,a+n))
 faces.extend([tuple(reversed(range(n))),tuple((len(sections)-1)*n+j for j in range(n))]);o=mesh(name,verts,faces,m,uv=uv)
 if DETAIL>=2:
  mod=o.modifiers.new('Surface refinement','SUBSURF');mod.levels=1 if DETAIL==2 else 2;bpy.context.view_layer.objects.active=o;bpy.ops.object.modifier_apply(modifier=mod.name)
 return o
def wing(name,z,y,span,chord,sweep,camber,m):
 n=20 if DETAIL>1 else 10;verts=[];faces=[]
 for i in range(n+1):
  x=(i/n-.5)*span;tip=(abs(x)/(span/2))**3
  for j in range(9):
   q=j/8;verts.append((x,y+math.sin(q*math.pi)*camber+tip*.07,z+(q-.5)*chord+sweep*tip))
 for i in range(n):
  for j in range(8):a=i*9+j;faces.append((a,a+1,a+10,a+9))
 o=mesh(name,verts,faces,m);mod=o.modifiers.new('Real element thickness','SOLIDIFY');mod.thickness=.012;bpy.context.view_layer.objects.active=o;bpy.ops.object.modifier_apply(modifier=mod.name);return o

def make_car():
 root=empty('TD_V4_OpenWheel')
 # Flat carbon floor with defined venturi edges; narrower body than the V3 capsule.
 outline=[(-.96,.1,-2.18),(-.98,.1,-1.15),(-.93,.1,.6),(-.72,.1,1.04),(-.33,.1,1.25),(.33,.1,1.25),(.72,.1,1.04),(.93,.1,.6),(.98,.1,-1.15),(.96,.1,-2.18)]
 floor=mesh('VenturiFloor',outline,[tuple(range(10))],carbon,False);mod=floor.modifiers.new('Floor thickness','SOLIDIFY');mod.thickness=.035;bpy.context.view_layer.objects.active=floor;bpy.ops.object.modifier_apply(modifier=mod.name)
 loft('RaisedNose',[(2.53,.065,.25,.32),(2.35,.095,.25,.34),(1.9,.14,.28,.40),(1.38,.22,.31,.49),(.94,.31,.28,.59)],paint)
 # Split monocoque leaves the cockpit open rather than covering it with an ellipse.
 for side in [-1,1]:
  loft('CockpitSill',[(.94,.09,.28,.59),(.6,.095,.27,.63),(.15,.09,.25,.61),(-.35,.10,.24,.62)],paint,cx=side*.285)
  loft('UndercutSidepod',[(.9,.11,.32,.52),(.73,.29,.27,.59),(.38,.32,.22,.59),(-.35,.27,.19,.49),(-1.0,.17,.18,.36),(-1.58,.09,.18,.28)],paint,cx=side*.55)
  intake=ball('RadiatorInlet',(side*.55,.47,.82),(.25,.11,.035),carbon)
  tube('SidepodAccent',[(side*.77,.53,.64),(side*.82,.49,.1),(side*.70,.37,-.6),(side*.53,.29,-1.25)],.014,accent)
  for z in [-.65,-.9,-1.15]:rod('FloorEdgeStrake',(side*.87,.12,z),(side*.91,.25,z-.18),.018,carbon)
 loft('EngineCover',[(-.25,.23,.3,.72),(-.55,.23,.28,.91),(-.95,.18,.23,.87),(-1.45,.12,.18,.61),(-1.9,.07,.16,.32),(-2.13,.04,.16,.23)],paint)
 fin=mesh('SharkFin',[(0,.5,-.6),(0,1.02,-.78),(0,.73,-1.5),(0,.35,-1.95)],[(0,1,2,3)],carbon,False);mod=fin.modifiers.new('Fin thickness','SOLIDIFY');mod.thickness=.018;bpy.context.view_layer.objects.active=fin;bpy.ops.object.modifier_apply(modifier=mod.name)
 ball('CockpitWell',(0,.43,.18),(.28,.12,.48),carbon);ball('DriverHelmet',(0,.69,.18),(.145,.18,.17),helmet);ball('DriverVisor',(0,.73,.32),(.13,.065,.025),visor)
 tube('HaloRing',[(-.30,.65,-.28),(-.32,.91,-.13),(-.25,.94,.41),(0,.91,.61),(.25,.94,.41),(.32,.91,-.13),(.30,.65,-.28)],.032,carbon);rod('HaloPillar',(0,.59,.78),(0,.91,.6),.028,carbon)
 loft('RollHoopIntake',[(-.34,.10,.77,1.04),(-.46,.15,.75,1.06),(-.65,.13,.72,.96)],paint);ball('AirboxOpening',(0,.91,-.33),(.073,.085,.025),carbon)
 for side in [-1,1]:rod('MirrorStem',(side*.27,.58,.6),(side*.54,.63,.57),.014,carbon);ball('MirrorHousing',(side*.57,.65,.57),(.09,.045,.055),paint)
 for j in range(4):wing('FrontWingElement',2.38-j*.115,.155+j*.045,1.94-j*.07,.23,.15,.035,carbon if j!=3 else accent)
 for side in [-1,1]:cube('FrontEndplate',(side*.96,.24,2.28),(.025,.22,.57),carbon,.025);rod('NosePylon',(side*.085,.31,2.28),(side*.085,.17,2.38),.022,carbon)
 for j in range(2):wing('RearWingElement',-2.15+j*.15,.91+j*.13,1.12,.34,.04,.075,carbon)
 for side in [-1,1]:
  plate=mesh('SweptRearEndplate',[(side*.57,.76,-2.32),(side*.59,.94,-2.43),(side*.59,1.08,-2.4),(side*.57,1.16,-2.3),(side*.55,1.13,-1.98),(side*.55,.97,-1.9),(side*.55,.82,-2.0)],[tuple(range(7))],carbon,False);mod=plate.modifiers.new('Endplate thickness','SOLIDIFY');mod.thickness=.018;bpy.context.view_layer.objects.active=plate;bpy.ops.object.modifier_apply(modifier=mod.name)
  rod('SwanNeckSupport',(side*.19,.32,-1.72),(side*.19,.89,-2.02),.023,carbon)
 wing('BeamWing',-2.05,.4,1.05,.20,.02,.035,carbon)
 for x in [-.72,-.48,-.24,0,.24,.48,.72]:
  mesh('DiffuserStrake',[(x,.1,-1.55),(x,.13,-2.35),(x,.32,-2.35),(x,.22,-1.6)],[(0,1,2,3)],carbon,False)
 cube('RainLight',(0,.27,-2.37),(.09,.1,.035),red,.01)
 # Rounded lathed carcass, sidewall beads and grooved wheel covers, with articulated pivots.
 for front,z in [(True,1.55),(False,-1.77)]:
  for side in [-1,1]:
   center=(side*.805,.36,z);steer=empty(('Steer_F'if front else 'Axle_R')+str(side),center);parent(steer,root);wheel=empty('Wheel_'+('F'if front else 'R')+str(side),center);parent(wheel,steer)
   profile=[(-.195,.255),(-.19,.315),(-.15,.35),(-.08,.36),(.08,.36),(.15,.35),(.19,.315),(.195,.255)]
   n=64 if DETAIL==3 else 40 if DETAIL==2 else 24;vs=[];uv=[];fs=[]
   for k,(ax,r)in enumerate(profile):
    for j in range(n):a=j/n*2*math.pi;vs.append((center[0]+ax,center[1]+math.cos(a)*r,z+math.sin(a)*r));uv.append((j/n,k/(len(profile)-1)))
   for k in range(len(profile)-1):
    for j in range(n):a=k*n+j;b=k*n+(j+1)%n;fs.append((a,a+n,b+n,b))
   parent(mesh('TyreCarcass',vs,fs,rubber,uv=uv),wheel)
   for ax in [-.19,.19]:
    x=center[0]+ax
    # Concentric manufactured sidewall lettering bands, subtle rubber ribs, and compound stripe.
    for radius,thick,m in [(.288,.005,rubber),(.305,.0025,red),(.247,.012,carbon)]:
     bpy.ops.mesh.primitive_torus_add(major_segments=64 if DETAIL>1 else 32,minor_segments=6 if DETAIL>1 else 4,location=xyz((x,center[1],z)),major_radius=radius,minor_radius=thick,rotation=(0,math.pi/2,0));parent(finish(bpy.context.object,'SidewallRing',m),wheel)
    parent(rod('CarbonWheelCover',(x-.008,center[1],z),(x+.008,center[1],z),.235,carbon,40 if DETAIL>1 else 24),wheel)
    parent(rod('WheelCentreNut',(x-.019,center[1],z),(x+.019,center[1],z),.039,metal,6),wheel)
    if DETAIL>1:
     for j in range(12):
      a=j/12*2*math.pi;parent(rod('RimVent',(x,center[1]+math.cos(a)*.17,z+math.sin(a)*.17),(x,center[1]+math.cos(a+.07)*.215,z+math.sin(a+.07)*.215),.008,metal,6),wheel)
   parent(rod('BrakeRotor',(center[0]-.1,center[1],z),(center[0]+.1,center[1],z),.18,brake,32),wheel)
   for h in [.18,.43]:
    for dz in [-.28,.28]:rod('Wishbone',(side*.24,h,z+dz),(side*.73,.36,z),.015,carbon)
   rod('PushRod',(side*.3,.57,z-.12),(side*.74,.32,z),.014,metal)
 for o in list(bpy.context.scene.objects):
  if o!=root and o.parent is None:parent(o,root)
 return root

def batch(root):
 # Consolidate static meshes by material inside each pivot, preserving all animation empties.
 for p in [root]+[o for o in root.children_recursive if o.type=='EMPTY']:
  groups={}
  for o in list(p.children):
   if o.type=='MESH':groups.setdefault(o.data.materials[0].name,[]).append(o)
  for name,items in groups.items():
   bpy.ops.object.select_all(action='DESELECT')
   for o in items:o.select_set(True)
   bpy.context.view_layer.objects.active=items[0]
   if len(items)>1:bpy.ops.object.join()
   items[0].name=p.name+'_'+name

def export(path,root=None):
 bpy.ops.object.select_all(action='DESELECT')
 objects=[root]+list(root.children_recursive)if root else list(bpy.context.scene.objects)
 for o in objects:o.select_set(True)
 bpy.ops.export_scene.gltf(filepath=str(path),export_format='GLB',use_selection=True,export_yup=True,export_apply=True,export_materials='EXPORT',export_cameras=False,export_lights=False,export_extras=True)

def kit_asset(name,fn):
 before=set(bpy.context.scene.objects);root=empty(name);fn()
 for o in set(bpy.context.scene.objects)-before:
  if o!=root and o.parent is None:parent(o,root)
 batch(root);return root

def tree():
 # Layered, non-spherical canopy with branch structure and leaf-cluster colour variation.
 rod('TaperedTrunk',(0,0,0),(.12,5.1,.08),.21,bark,9)
 rng=random.Random(163)
 materials=[material('Kit_Leaf'+str(i),(.10+i*.012,.19+i*.016,.055+i*.008),.95)for i in range(4)]
 for i in range(18):
  a=i*2.4;h=2.8+(i%6)*.5;r=1.2+(i%3)*.45;x=math.cos(a)*r;z=math.sin(a)*r;rod('Branch',(.06,h-.7,0),(x,h+.2,z),.045,bark,6)
  for j in range(2 if DETAIL>1 else 1):
   p=(x+rng.uniform(-.5,.5),h+.4+j*.65,z+rng.uniform(-.5,.5));bpy.ops.mesh.primitive_ico_sphere_add(subdivisions=2,location=xyz(p));o=bpy.context.object;o.scale=(.88+rng.random()*.35,.8+rng.random()*.4,.65+rng.random()*.4);bpy.ops.object.transform_apply(location=False,rotation=False,scale=True);finish(o,'LeafCluster',materials[(i+j)%4])

def make_kit():
 roots=[]
 roots.append(kit_asset('KIT_Tree',tree))
 def bay():
  cube('GarageShutter',(0,1.65,0),(5.8,3.3,.10),steel,.01)
  for y in [i*.16 for i in range(21)]:cube('ShutterSlat',(0,y,.06),(5.65,.025,.035),metal,0)
  for x in [-3,3]:cube('ConcreteColumn',(x,2.1,0),(.3,4.2,.5),concrete,.04)
  cube('Overhang',(0,4.2,.45),(6.3,.2,1.5),roof,.04);cube('GarageHeader',(0,3.65,.12),(5.8,.45,.14),seat,.02)
  for x in [-1.8,0,1.8]:cube('UpperGlazing',(x,4.95,-.02),(1.65,1.05,.1),glass,.015)
 roots.append(kit_asset('KIT_PitBay',bay))
 def barrier():
  cube('JerseyBase',(0,.17,0),(4,.34,.65),concrete,.045);cube('JerseyBody',(0,.65,0),(4,.65,.36),concrete,.035)
  for x in [-1.7,1.7]:cube('Joint',(x,.65,.19),(.045,.5,.025),steel,.005)
 roots.append(kit_asset('KIT_Barrier',barrier))
 def tower():
  cube('TowerStem',(0,5,0),(3,10,4),concrete,.12);cube('OperationsCabin',(0,10,0),(6,2,6),steel,.12)
  for x in [-3.03,3.03]:cube('Glazing',(x,10.2,0),(.05,1.4,5.6),glass,.01)
  for z in [-3.03,3.03]:cube('Glazing',(0,10.2,z),(5.6,1.4,.05),glass,.01)
  cube('Roof',(0,11.3,0),(7,.22,7),roof,.09);rod('Antenna',(0,11.4,0),(0,16,0),.045,steel)
 roots.append(kit_asset('KIT_ControlTower',tower))
 def bridge():
  cube('BridgeDeck',(0,5,0),(24,.3,3),steel,.06)
  for x in [-11,11]:cube('Support',(x,2.5,0),(.55,5,1.8),concrete,.09)
  for z in [-1.45,1.45]:
   for y in [5.4,6.6]:rod('TrussChord',(-12,y,z),(12,y,z),.075,roof)
   for x in range(-12,12,3):rod('TrussDiagonal',(x,5.4,z),(x+3,6.6,z),.045,roof)
 roots.append(kit_asset('KIT_Bridge',bridge))
 def light():
  rod('LightPole',(0,0,0),(0,12,0),.09,steel);rod('Crossbar',(-1,12,0),(1,12,0),.055,steel)
  for x in [-.8,0,.8]:cube('Floodlight',(x,12,.14),(.4,.3,.18),roof,.04)
 roots.append(kit_asset('KIT_LightPole',light))
 def stand():
  for row in range(6):
   y=.6+row*.58;z=row*.9;cube('Step',(0,y-.15,z),(12,.25,.95),concrete,.01)
   for col in range(15):
    x=(col-7)*.73;cube('SeatPan',(x,y+.15,z),(.5,.12,.45),seat,.04);cube('SeatBack',(x,y+.43,z+.23),(.5,.5,.1),seat,.04)
   for x in [-5.5,5.5]:rod('SteelRiser',(x,0,z),(x,y,z),.06,steel)
  cube('Canopy',(0,4.9,2.5),(13,.16,7.5),roof,.04)
  for x in [-5.5,5.5]:rod('CanopyColumn',(x,0,5),(x,5,5),.085,steel)
 roots.append(kit_asset('KIT_Grandstand',stand))
 def stadium_aisle():
  # A reusable full-depth staircase, railing and support module; fitted to mapped stand footprints at runtime.
  for i in range(40):cube('StadiumStep',(0,.125+i*.25,.25+i*.5),(1.8,.25,.52),concrete,.008)
  for side in [-1,1]:
   rod('ContinuousHandrail',(side*.85,1.0,0),(side*.85,11.0,20),.035,steel)
   for z in range(0,21,2):rod('RailingUpright',(side*.85,z*.5,z),(side*.85,z*.5+1,z),.022,steel)
   for z in range(4,21,4):rod('StairSupport',(side*.65,0,z),(side*.65,z*.5,z),.065,steel)
  cube('RearLanding',(0,9.9,20.6),(2.4,.2,1.4),roof,.025)
 roots.append(kit_asset('KIT_StadiumAisle',stadium_aisle))
 def city():
  cube('UrbanEnvelope',(0,12,0),(10,24,10),concrete,.12)
  for level in range(1,11):
   for side in [-1,1]:
    cube('GlazedBand',(0,level*2.1,side*5.02),(9.6,1.15,.05),glass,.01)
    cube('GlazedBand',(side*5.02,level*2.1,0),(.05,1.15,9.6),glass,.01)
  cube('RoofCoping',(0,24.2,0),(10.5,.35,10.5),roof,.05)
 roots.append(kit_asset('KIT_CityBlock',city))
 # Far tree LOD keeps the silhouette while reducing branch/crown geometry.
 low=empty('KIT_TreeLow')
 for source in roots[0].children:
  o=source.copy();o.data=source.data.copy();bpy.context.collection.objects.link(o);o.parent=low;o.matrix_parent_inverse=source.matrix_parent_inverse.copy()
  bpy.context.view_layer.objects.active=o;mod=o.modifiers.new('Distance LOD','DECIMATE');mod.ratio=.20;bpy.ops.object.modifier_apply(modifier=mod.name)
 roots.append(low)
 # Artist source: assets are arranged side-by-side in the .blend, exported at local origin.
 for i,o in enumerate(roots):o.location.x=i*30
 bpy.ops.wm.save_as_mainfile(filepath=str(ROOT/'art/blender/venue-v4.blend'),compress=True)
 for o in roots:o.location=(0,0,0)
 export(OUT/'venue-raw.glb')
 return roots

stats=[]
for name,detail in [('high',3),('medium',2),('low',1)]:
 DETAIL=detail;clear();setup_materials();root=make_car();batch(root)
 if name=='high':bpy.ops.wm.save_as_mainfile(filepath=str(ROOT/'art/blender/vehicle-v4.blend'),compress=True)
 export(OUT/('car-'+name+'-raw.glb'),root);stats.append({'lod':name,'objects':len(root.children_recursive)})
DETAIL=2;clear();setup_materials();make_kit()
(OUT/'authoring.json').write_text(json.dumps({'blender':bpy.app.version_string,'units':'metres','exportForward':'+Z','exportUp':'+Y','original':True,'teamGeometry':False,'carWidth_m':2.0,'wheelbase_m':3.32,'tyreRadius_m':.36,'export':{'format':'GLB','applyModifiers':True,'yUp':True,'selection':True,'materials':'EXPORT'},'car':stats},indent=2)+'\n')
print('V4_BLENDER_BUILD_COMPLETE')
