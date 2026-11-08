const { test } = require("node:test");
const assert = require("node:assert/strict");
test("Blender GLBs retain four wheel pivots, two steering pivots, authored UVs and bounded LOD budgets", async () => {
  const { NodeIO } = await import("@gltf-transform/core"),
    { ALL_EXTENSIONS } = await import("@gltf-transform/extensions"),
    { MeshoptDecoder } = await import("meshoptimizer");
  await MeshoptDecoder.ready;
  const io = new NodeIO()
    .registerExtensions(ALL_EXTENSIONS)
    .registerDependencies({ "meshopt.decoder": MeshoptDecoder });
  for (const [level, budget] of [
    ["low", 18000],
    ["medium", 50000],
    ["high", 70000],
  ]) {
    const d = await io.read(`assets/v4/car-${level}.glb`),
      nodes = d.getRoot().listNodes();
    assert.equal(
      nodes.filter((n) => n.getName().startsWith("Wheel_") && !n.getMesh())
        .length,
      4,
    );
    assert.equal(
      nodes.filter((n) => n.getName().startsWith("Steer_F") && !n.getMesh())
        .length,
      2,
    );
    const low = [Infinity, Infinity, Infinity],
      high = [-Infinity, -Infinity, -Infinity];
    for (const n of nodes) {
      const m = n.getMesh();
      if (!m) continue;
      const matrix = n.getWorldMatrix();
      for (const p of m.listPrimitives()) {
        const a = p.getAttribute("POSITION");
        for (let k = 0; k < a.getCount(); k++) {
          const v = a.getElement(k, []);
          for (let axis = 0; axis < 3; axis++) {
            const x =
              matrix[axis] * v[0] +
              matrix[4 + axis] * v[1] +
              matrix[8 + axis] * v[2] +
              matrix[12 + axis];
            low[axis] = Math.min(low[axis], x);
            high[axis] = Math.max(high[axis], x);
          }
        }
      }
    }
    assert.ok(Math.abs(low[1]) < 0.015, `ground contact ${low}`);
    assert.ok(high[0] - low[0] < 2.05);
    assert.ok(high[2] - low[2] > 4.8 && high[2] - low[2] < 5.4);
    let triangles = 0;
    for (const mesh of d.getRoot().listMeshes())
      for (const p of mesh.listPrimitives()) {
        assert.ok(p.getAttribute("TEXCOORD_0"));
        triangles +=
          (p.getIndices()?.getCount() ||
            p.getAttribute("POSITION").getCount()) / 3;
      }
    assert.ok(triangles < budget, `${level}: ${triangles}`);
  }
  const venue = await io.read("assets/v4/venue.glb");
  for (const name of [
    "KIT_PitBay",
    "KIT_Barrier",
    "KIT_Grandstand",
    "KIT_ControlTower",
    "KIT_Bridge",
    "KIT_CityBlock",
    "KIT_StadiumAisle",
  ])
    assert.ok(
      venue
        .getRoot()
        .listNodes()
        .some((n) => n.getName() === name),
      name,
    );
});
