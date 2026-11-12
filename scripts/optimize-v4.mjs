import fs from "node:fs/promises";
import { createHash } from "node:crypto";
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
const carsOnly = process.argv.includes("--cars-only");
const previous = carsOnly ? JSON.parse(await fs.readFile("assets/v4/manifest.json", "utf8")) : null;
const levels = [];
for (const name of (carsOnly ? ["car-high", "car-medium", "car-low"] : ["car-high", "car-medium", "car-low", "venue", "tree"])) {
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
      authoring: carsOnly ? "Blender 4.3.2; vehicle: art/blender/build_v7.py, vehicle-v7.blend; venue/tree unchanged" : "Blender 4.3.2; art/blender/build_v4.py and .blend sources",
      units: "metres",
      forward: "+Z",
      compression: "EXT_meshopt_compression",
      levels: carsOnly ? [...levels, ...previous.levels.filter(l => !l.name.startsWith("car-"))] : levels,
    },
    null,
    2,
  ) + "\n",
);
console.log(levels);
if (carsOnly) {
  const sources = JSON.parse(await fs.readFile("assets/v4/sources.json", "utf8"));
  for (const level of levels) {
    const file = `assets/v4/${level.name}.glb`, entry = sources.find(s => s.file === file);
    if (!entry) throw new Error("Missing vehicle provenance: " + file);
    const bytes = await fs.readFile(file);
    Object.assign(entry, {source: "art/blender/build_v7.py", sha256: createHash("sha256").update(bytes).digest("hex"), bytes: bytes.length,
      notes: "V7 original unbranded open-wheel design. No verified team replica; retained 3.32 m wheelbase and 0.36 m radius. Editable source: art/blender/vehicle-v7.blend. No new external geometry or textures."});
  }
  await fs.writeFile("assets/v4/sources.json", JSON.stringify(sources, null, 2) + "\n");
}
