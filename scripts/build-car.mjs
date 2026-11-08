import fs from "node:fs/promises";
import * as T from "three";
import { GLTFExporter } from "three/addons/exporters/GLTFExporter.js";
import { mergeGeometries } from "three/addons/utils/BufferGeometryUtils.js";
import { NodeIO } from "@gltf-transform/core";
import { ALL_EXTENSIONS } from "@gltf-transform/extensions";
import { dedup, weld, meshopt } from "@gltf-transform/functions";
import { MeshoptEncoder, MeshoptDecoder } from "meshoptimizer";
// FileReader is needed by the browser-oriented exporter even for texture-free GLBs.
globalThis.FileReader = class {
  readAsArrayBuffer(blob) {
    blob.arrayBuffer().then((v) => {
      this.result = v;
      this.onloadend?.();
    });
  }
  readAsDataURL(blob) {
    blob.arrayBuffer().then((v) => {
      this.result =
        "data:application/octet-stream;base64," +
        Buffer.from(v).toString("base64");
      this.onloadend?.();
    });
  }
};
function model(detail) {
  const root = new T.Group();
  root.name = "TurDuellosu_OpenWheel";
  root.userData = {
    author: "Tur Düellosu project",
    description:
      "Original generic open-wheel model; no official team geometry or branding. Units: metres. +Z forward.",
  };
  const paint = new T.MeshPhysicalMaterial({
      name: "Paint",
      color: "#bec5ca",
      metalness: 0.45,
      roughness: 0.25,
      clearcoat: 0.65,
      clearcoatRoughness: 0.2,
    }),
    accent = new T.MeshStandardMaterial({
      name: "Accent",
      color: "#ffffff",
      metalness: 0.4,
      roughness: 0.3,
    }),
    carbon = new T.MeshStandardMaterial({
      name: "Carbon",
      color: "#11171b",
      metalness: 0.25,
      roughness: 0.54,
    }),
    rubber = new T.MeshStandardMaterial({
      name: "Tyre",
      color: "#151718",
      roughness: 0.91,
    }),
    metal = new T.MeshStandardMaterial({
      name: "Metal",
      color: "#919da5",
      metalness: 0.9,
      roughness: 0.26,
    });
  const add = (g, m, parent = root, name = "") => {
    const o = new T.Mesh(g, m);
    o.name = name;
    o.castShadow = true;
    o.receiveShadow = true;
    parent.add(o);
    return o;
  };
  const box = (x, y, z, w, h, d, m = carbon, parent = root) => {
    const o = add(new T.BoxGeometry(w, h, d), m, parent);
    o.position.set(x, y, z);
    return o;
  };
  function loft(sections, mat, x = 0) {
    const vertices = [],
      indices = [],
      radial = detail * 8;
    for (const [z, w, h, y] of sections)
      for (let j = 0; j <= radial; j++) {
        const a = (j / radial) * Math.PI * 2;
        vertices.push(x + Math.cos(a) * w, y + Math.sin(a) * h, z);
      }
    for (let i = 0; i < sections.length - 1; i++)
      for (let j = 0; j < radial; j++) {
        const a = i * (radial + 1) + j,
          b = a + radial + 1;
        indices.push(a, a + 1, b, a + 1, b + 1, b);
      }
    const g = new T.BufferGeometry();
    g.setAttribute("position", new T.Float32BufferAttribute(vertices, 3));
    g.setIndex(indices);
    g.computeVertexNormals();
    return add(g, mat);
  }
  function rod(a, b, r = 0.018, m = carbon, parent = root) {
    const p = new T.Vector3(...a),
      q = new T.Vector3(...b),
      v = q.clone().sub(p),
      o = add(new T.CylinderGeometry(r, r, v.length(), detail * 4), m, parent);
    o.position.copy(p.add(q).multiplyScalar(0.5));
    o.quaternion.setFromUnitVectors(new T.Vector3(0, 1, 0), v.normalize());
  }
  function wing(span, z, y, chord, mat) {
    const verts = [],
      idx = [],
      steps = detail * 6;
    for (let side = 0; side < 2; side++)
      for (let j = 0; j <= steps; j++) {
        const u = j / steps;
        for (const x of [-span / 2, span / 2])
          verts.push(
            x,
            y + Math.sin(u * Math.PI) * 0.045 + (side ? 0.012 : 0),
            z + (u - 0.5) * chord,
          );
      }
    const row = (steps + 1) * 2;
    for (let j = 0; j < steps; j++)
      for (const base of [0, row]) {
        const a = base + j * 2;
        idx.push(a, a + 1, a + 2, a + 1, a + 3, a + 2);
      }
    const g = new T.BufferGeometry();
    g.setAttribute("position", new T.Float32BufferAttribute(verts, 3));
    g.setIndex(idx);
    g.computeVertexNormals();
    const m = mat.clone();
    m.side = T.DoubleSide;
    add(g, m);
  }
  loft(
    [
      [-2.17, 0.08, 0.05, 0.38],
      [-1.8, 0.19, 0.19, 0.52],
      [-1.1, 0.3, 0.39, 0.65],
      [-0.55, 0.37, 0.27, 0.62],
      [0.12, 0.32, 0.24, 0.5],
      [0.65, 0.2, 0.14, 0.4],
      [1.6, 0.11, 0.08, 0.32],
      [2.48, 0.085, 0.055, 0.29],
    ],
    paint,
  );
  for (const side of [-1, 1]) {
    loft(
      [
        [-1.8, 0.12, 0.1, 0.3],
        [-1.3, 0.22, 0.18, 0.37],
        [-0.7, 0.3, 0.23, 0.43],
        [0.15, 0.33, 0.23, 0.44],
        [0.55, 0.24, 0.17, 0.46],
      ],
      paint,
      side * 0.51,
    );
    const inlet = add(new T.SphereGeometry(1, detail * 8, detail * 4), carbon);
    inlet.position.set(side * 0.52, 0.52, 0.53);
    inlet.scale.set(0.23, 0.13, 0.04);
    box(side * 0.78, 0.16, -0.1, 0.2, 0.06, 2.8);
    box(side * 0.64, 0.17, -1.45, 0.06, 0.17, 0.6);
    box(side * 0.93, 0.31, 2.28, 0.035, 0.32, 0.65, paint);
    box(side * 0.85, 0.98, -2.25, 0.035, 0.65, 0.65, paint);
    box(side * 0.5, 0.88, 0.3, 0.2, 0.08, 0.27, paint);
    rod([side * 0.28, 0.7, 0.17], [side * 0.5, 0.87, 0.3], 0.02);
  }
  box(0, 0.12, -0.1, 1.76, 0.06, 4.55);
  for (let i = -3; i <= 3; i++) box(i * 0.21, 0.17, -2.12, 0.025, 0.18, 0.65);
  for (let i = 0; i < 4; i++)
    wing(
      1.98,
      2.45 - i * 0.13,
      0.21 + i * 0.047,
      0.36,
      i === 0 ? carbon : paint,
    );
  for (let i = 0; i < 2; i++)
    wing(1.72, -2.32 + i * 0.16, 1.21 + i * 0.1, 0.48, paint);
  rod([0, 0.32, -2.15], [0, 1.19, -2.25], 0.045);
  wing(1.4, -2.1, 0.44, 0.25, carbon);
  const cockpit = add(new T.SphereGeometry(1, detail * 8, detail * 4), carbon);
  cockpit.scale.set(0.26, 0.13, 0.48);
  cockpit.position.set(0, 0.75, -0.03);
  const helmet = add(
    new T.SphereGeometry(0.175, detail * 8, detail * 4),
    accent,
  );
  helmet.position.set(0, 0.91, -0.13);
  const visor = add(
    new T.SphereGeometry(
      0.177,
      detail * 8,
      detail * 4,
      0,
      Math.PI * 2,
      Math.PI * 0.36,
      Math.PI * 0.2,
    ),
    carbon,
  );
  visor.position.copy(helmet.position);
  const halo = [
    [-0.32, 0.96, -0.55],
    [-0.33, 1.035, 0.13],
    [0, 1.04, 0.4],
    [0.33, 1.035, 0.13],
    [0.32, 0.96, -0.55],
  ].map((p) => new T.Vector3(...p));
  add(
    new T.TubeGeometry(
      new T.CatmullRomCurve3(halo),
      detail * 12,
      0.026,
      detail * 4,
      false,
    ),
    carbon,
  );
  rod([0, 0.66, 0.39], [0, 1.04, 0.4], 0.025);
  const intake = add(new T.ConeGeometry(0.12, 0.42, detail * 6), paint);
  intake.rotation.x = Math.PI / 2;
  intake.position.set(0, 1.04, -0.65);
  for (const [label, x, z] of [
    ["FL", -0.94, 1.58],
    ["FR", 0.94, 1.58],
    ["RL", -0.94, -1.62],
    ["RR", 0.94, -1.62],
  ]) {
    const steer = new T.Group();
    steer.name = "Steer_" + label;
    steer.position.set(x, 0.36, z);
    root.add(steer);
    const wheel = new T.Group();
    wheel.name = "Wheel_" + label;
    steer.add(wheel);
    const tyre = add(
      new T.CylinderGeometry(0.36, 0.36, z < 0 ? 0.42 : 0.34, detail * 16, 1),
      rubber,
      wheel,
    );
    tyre.rotation.z = Math.PI / 2;
    const hub = add(
      new T.CylinderGeometry(0.22, 0.22, z < 0 ? 0.425 : 0.345, detail * 12),
      metal,
      wheel,
    );
    hub.rotation.z = Math.PI / 2;
    for (const sign of [-1, 1]) {
      const ring = add(
        new T.TorusGeometry(0.29, 0.008, 4, detail * 16),
        accent,
        wheel,
      );
      ring.rotation.y = Math.PI / 2;
      ring.position.x = sign * (z < 0 ? 0.215 : 0.175);
      for (let j = 0; j < detail * 4; j++) {
        const a = (j / (detail * 4)) * Math.PI * 2;
        const spoke = box(
          sign * (z < 0 ? 0.217 : 0.177),
          Math.sin(a) * 0.12,
          Math.cos(a) * 0.12,
          0.012,
          0.024,
          0.21,
          carbon,
          wheel,
        );
        spoke.rotation.x = -a;
      }
    }
    for (const dz of [-0.32, 0.32])
      for (const y of [0.24, 0.55])
        rod([Math.sign(x) * 0.27, y, z + dz], [x, 0.36, z], 0.018);
  }
  function batch(parent) {
    parent.updateMatrixWorld(true);
    const inverse = new T.Matrix4().copy(parent.matrixWorld).invert(),
      map = new Map();
    for (const o of [...parent.children])
      if (o.isMesh) {
        const g = o.geometry
          .clone()
          .applyMatrix4(
            new T.Matrix4().multiplyMatrices(inverse, o.matrixWorld),
          );
        g.deleteAttribute("uv");
        if (!map.has(o.material)) map.set(o.material, []);
        map.get(o.material).push(g);
        o.removeFromParent();
        o.geometry.dispose();
      }
    for (const [m, list] of map) {
      const g = mergeGeometries(
        list.map((g) => (g.index ? g.toNonIndexed() : g)),
      );
      add(g, m, parent);
      list.forEach((g) => g.dispose());
    }
  }
  root.traverse((o) => {
    if (o.name.startsWith("Wheel_")) batch(o);
  });
  batch(root);
  return root;
}
await MeshoptEncoder.ready;
await MeshoptDecoder.ready;
await fs.mkdir("assets/cars", { recursive: true });
const io = new NodeIO()
  .registerExtensions(ALL_EXTENSIONS)
  .registerDependencies({
    "meshopt.encoder": MeshoptEncoder,
    "meshopt.decoder": MeshoptDecoder,
  });
const stats = [];
for (const [name, detail] of [
  ["low", 1],
  ["medium", 2],
  ["high", 4],
]) {
  const root = model(detail);
  root.updateMatrixWorld(true);
  const raw = await new GLTFExporter().parseAsync(root, {
    binary: true,
    onlyVisible: true,
  });
  const doc = await io.readBinary(new Uint8Array(raw));
  await doc.transform(
    dedup(),
    weld(),
    meshopt({ encoder: MeshoptEncoder, level: "medium" }),
  );
  const bytes = await io.writeBinary(doc);
  await fs.writeFile("assets/cars/open-wheel-" + name + ".glb", bytes);
  let triangles = 0;
  root.traverse((o) => {
    if (o.geometry)
      triangles +=
        (o.geometry.index?.count || o.geometry.attributes.position.count) / 3;
  });
  stats.push({ lod: name, triangles, bytes: bytes.length });
}
await fs.writeFile(
  "assets/cars/manifest.json",
  JSON.stringify(
    {
      name: "Tur Düellosu Open Wheel",
      origin:
        "Original project model, generated by scripts/build-car.mjs; generic proportions, no team logos or official vehicle reproduction",
      units: "metres",
      forward: "+Z",
      compression: "EXT_meshopt_compression",
      levels: stats,
    },
    null,
    2,
  ) + "\n",
);
console.log(stats);
