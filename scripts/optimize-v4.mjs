import fs from "node:fs/promises";
import { NodeIO } from "@gltf-transform/core";
import { ALL_EXTENSIONS } from "@gltf-transform/extensions";
import { dedup, weld, meshopt } from "@gltf-transform/functions";
import { MeshoptEncoder, MeshoptDecoder } from "meshoptimizer";
await MeshoptEncoder.ready;
await MeshoptDecoder.ready;
const io = new NodeIO()
  .registerExtensions(ALL_EXTENSIONS)
  .registerDependencies({
    "meshopt.encoder": MeshoptEncoder,
    "meshopt.decoder": MeshoptDecoder,
  });
const levels = [];
for (const name of ["car-high", "car-medium", "car-low", "venue", "tree"]) {
  const source = "assets/v4/" + name + "-raw.glb",
    target = "assets/v4/" + name + ".glb";
  const exists = await fs.access(source).then(
    () => true,
    () => false,
  );
  if (!exists && name !== "tree")
    throw new Error("Missing Blender output: " + source);
  const doc = await io.read(exists ? source : target);
  if (exists)
    await doc.transform(
      dedup(),
      weld(),
      meshopt({
        encoder: MeshoptEncoder,
        level: "medium",
        quantizeNormal: 16,
        quantizePosition: 16,
      }),
    );
  let triangles = 0,
    primitives = 0;
  for (const mesh of doc.getRoot().listMeshes())
    for (const p of mesh.listPrimitives()) {
      triangles +=
        (p.getIndices()?.getCount() || p.getAttribute("POSITION").getCount()) /
        3;
      primitives++;
    }
  const bytes = exists ? await io.writeBinary(doc) : await fs.readFile(target);
  if (exists) await fs.writeFile(target, bytes);
  levels.push({ name, triangles, primitives, bytes: bytes.length });
}
await fs.writeFile(
  "assets/v4/manifest.json",
  JSON.stringify(
    {
      authoring: "Blender 4.3.2; art/blender/build_v4.py and .blend sources",
      units: "metres",
      forward: "+Z",
      compression: "EXT_meshopt_compression",
      levels,
    },
    null,
    2,
  ) + "\n",
);
console.log(levels);
