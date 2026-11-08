"""Prepare CC0 Poly Haven Tree Small 02 (Rico Cilliers): CPU-baked impostors and decimated near LOD.
Input: downloaded 1k glTF with dependencies; see scripts/fetch-tree-v4.py. Blender 4.3.
"""
import bpy,sys,math,json
from pathlib import Path
from mathutils import Vector
root=Path.cwd();source=Path(sys.argv[sys.argv.index('--')+1]);out=root/'assets/v4'
bpy.ops.object.select_all(action='SELECT');bpy.ops.object.delete(use_global=False)
bpy.ops.import_scene.gltf(filepath=str(source));objects=[o for o in bpy.context.scene.objects if o.type=='MESH']
bpy.context.view_layer.update();points=[o.matrix_world@Vector(v)for o in objects for v in o.bound_box];lo=Vector([min(p[i]for p in points)for i in range(3)]);hi=Vector([max(p[i]for p in points)for i in range(3)]);factor=7/(hi.z-lo.z);center=Vector(((lo.x+hi.x)/2,(lo.y+hi.y)/2,lo.z))
for o in objects:o.location=(o.location-center)*factor;o.scale*=factor
bpy.context.view_layer.update()
scene=bpy.context.scene;scene.render.engine='CYCLES';scene.cycles.device='CPU';scene.cycles.samples=24;scene.cycles.use_denoising=False;scene.render.resolution_x=scene.render.resolution_y=512;scene.render.resolution_percentage=100;scene.render.film_transparent=True;scene.render.image_settings.file_format='PNG';scene.render.image_settings.color_mode='RGBA';scene.view_settings.view_transform='AgX';scene.world.use_nodes=True;scene.world.node_tree.nodes['Background'].inputs['Color'].default_value=(.75,.83,1,1);scene.world.node_tree.nodes['Background'].inputs['Strength'].default_value=.6
bpy.ops.object.light_add(type='SUN',location=(2,-4,8));sun=bpy.context.object;sun.rotation_euler=(.35,-.4,-.3);sun.data.energy=2;sun.data.angle=.2
bpy.ops.object.camera_add();camera=bpy.context.object;scene.camera=camera;camera.data.type='ORTHO';camera.data.ortho_scale=8.5;camera.data.lens=50
for i,p in enumerate([(0,-15,3.5),(15,0,3.5),(0,0,15)]):
 camera.location=p;camera.rotation_euler=(Vector((0,0,3.5))-camera.location).to_track_quat('-Z','Y').to_euler();scene.render.filepath=str(out/('tree-view-'+str(i)+'.png'));bpy.ops.render.render(write_still=True)
# Keep only a bounded triangle budget in the delivered authoring source.
for o in objects:
 bpy.context.view_layer.objects.active=o;bpy.ops.object.select_all(action='DESELECT');o.select_set(True);bpy.ops.object.transform_apply(location=False,rotation=False,scale=True);mod=o.modifiers.new('Near distance budget','DECIMATE');mod.ratio=.012;bpy.ops.object.modifier_apply(modifier=mod.name)
 o.name='CC0_TreeSmall02_Near'
 for m in o.data.materials:
  m.diffuse_color[3]=1
  if hasattr(m,'surface_render_method'):m.surface_render_method='DITHERED'
# Preserve photographic bark/foliage maps but downsample once for the shared near prefab.
for image in list(bpy.data.images):
 if image.size[0]>512:image.scale(512,512)
 if image.source=='FILE':image.pack()
for o in [sun,camera]:bpy.data.objects.remove(o,do_unlink=True)
parent=bpy.data.objects.new('KIT_PhotoTree',None);bpy.context.collection.objects.link(parent)
for o in objects:o.parent=parent
bpy.ops.wm.save_as_mainfile(filepath=str(root/'art/blender/tree-v4.blend'),compress=True)
bpy.ops.object.select_all(action='SELECT');bpy.ops.export_scene.gltf(filepath=str(out/'tree-raw.glb'),export_format='GLB',export_yup=True,export_apply=True,export_cameras=False,export_lights=False,export_image_format='AUTO')
print('V4_PHOTOTREE_PREPARED')
