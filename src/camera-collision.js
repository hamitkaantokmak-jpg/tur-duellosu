/* Narrow camera rays against cached per-instance bounds before testing triangles.
   Render meshes/materials remain shared; these CPU proxies never join the scene. */
const CameraCollision = {
  cache: new WeakMap(),
  clear() { this.cache = new WeakMap(); },
  closest(T, raycaster, objects) {
    let closest = null;
    const hits = [], point = new T.Vector3();
    for (const object of objects) {
      if (!object.layers.test(raycaster.layers)) continue;
      if (!object.isInstancedMesh) {
        hits.length = 0;
        object.raycast?.(raycaster, hits);
        for (const hit of hits)
          if (!closest || hit.distance < closest.distance) closest = hit;
        continue;
      }
      object.updateWorldMatrix(true, false);
      let entry = this.cache.get(object);
      if (!entry || entry.geometry !== object.geometry || entry.count !== object.count ||
          entry.version !== object.instanceMatrix.version || !entry.world.equals(object.matrixWorld)) {
        if (!object.geometry.boundingBox) object.geometry.computeBoundingBox();
        const geometry = object.geometry, matrix = new T.Matrix4();
        entry = {geometry, count:object.count, version:object.instanceMatrix.version,
          world:object.matrixWorld.clone(), instances:[], proxy:new T.Mesh(geometry, object.material)};
        for (let i = 0; i < object.count; i++) {
          object.getMatrixAt(i, matrix);
          const world = new T.Matrix4().multiplyMatrices(object.matrixWorld, matrix);
          entry.instances.push({world, box:geometry.boundingBox.clone().applyMatrix4(world)});
        }
        this.cache.set(object, entry);
      }
      entry.proxy.material = object.material;
      for (let i = 0; i < entry.instances.length; i++) {
        const instance = entry.instances[i];
        if (!instance.box.containsPoint(raycaster.ray.origin)) {
          if (!raycaster.ray.intersectBox(instance.box, point)) continue;
          if (point.distanceTo(raycaster.ray.origin) > raycaster.far) continue;
        }
        entry.proxy.matrixWorld.copy(instance.world);
        hits.length = 0;
        entry.proxy.raycast(raycaster, hits);
        for (const hit of hits) {
          if (!closest || hit.distance < closest.distance)
            closest = {...hit, object, instanceId:i};
        }
      }
    }
    return closest;
  },
};
if (typeof module !== 'undefined') module.exports = CameraCollision;
