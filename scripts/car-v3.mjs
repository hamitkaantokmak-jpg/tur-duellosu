import * as T from "three";
import { mergeGeometries } from "three/addons/utils/BufferGeometryUtils.js";
// Original generic ground-effect open wheeler. Approximate modern proportions, no team geometry/logos.
export function makeCar(detail) {
  const root = new T.Group();
  root.name = "TD_V3_OpenWheel";
  root.userData = {
    version: 3,
    units: "metres",
    dimensions: { length: 5.65, width: 2.01, wheelbase: 3.6, tyreRadius: 0.36 },
    origin: "Original project design, not an official car replica",
  };
  const paint = new T.MeshPhysicalMaterial({
      name: "Paint",
      color: "#bec4c9",
      metalness: 0.12,
      roughness: 0.25,
      clearcoat: 1,
      clearcoatRoughness: 0.16,
    }),
    accent = new T.MeshPhysicalMaterial({
      name: "Accent",
      color: "#49b6ad",
      metalness: 0.12,
      roughness: 0.27,
      clearcoat: 0.7,
    }),
    carbon = new T.MeshStandardMaterial({
      name: "Carbon",
      color: "#13191c",
      metalness: 0.12,
      roughness: 0.48,
    }),
    rubber = new T.MeshStandardMaterial({
      name: "Tyre",
      color: "#191b1c",
      roughness: 0.78,
    }),
    metal = new T.MeshStandardMaterial({
      name: "Metal",
      color: "#81898b",
      metalness: 0.95,
      roughness: 0.3,
    }),
    stripe = new T.MeshStandardMaterial({
      name: "TyreStripe",
      color: "#d73b42",
      roughness: 0.6,
    }),
    visor = new T.MeshPhysicalMaterial({
      name: "Visor",
      color: "#18232a",
      metalness: 0.85,
      roughness: 0.13,
      clearcoat: 1,
    }),
    helmet = new T.MeshPhysicalMaterial({
      name: "Helmet",
      color: "#e5e8dd",
      roughness: 0.3,
      clearcoat: 0.8,
    }),
    light = new T.MeshStandardMaterial({
      name: "RainLight",
      color: "#a12121",
      emissive: "#d41d13",
      emissiveIntensity: 0.65,
    });
  const add = (g, m, parent = root) => {
    const o = new T.Mesh(g, m);
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
  function tube(points, r, mat = carbon, parent = root) {
    return add(
      new T.TubeGeometry(
        new T.CatmullRomCurve3(points.map((p) => new T.Vector3(...p))),
        Math.max(8, detail * 12),
        r,
        Math.max(6, detail * 4),
        false,
      ),
      mat,
      parent,
    );
  }
  function rod(a, b, r = 0.012, m = carbon, parent = root) {
    const p = new T.Vector3(...a),
      q = new T.Vector3(...b),
      d = q.clone().sub(p),
      o = add(
        new T.CylinderGeometry(r, r, d.length(), Math.max(6, detail * 4)),
        m,
        parent,
      );
    o.position.copy(p.add(q).multiplyScalar(0.5));
    o.quaternion.setFromUnitVectors(new T.Vector3(0, 1, 0), d.normalize());
    return o;
  }
  function loft(sections, mat, xOffset = 0) {
    const radial = 12 + detail * 8,
      rings = 20 + detail * 8,
      points = [],
      uv = [],
      idx = [],
      curves = ["w", "h", "y"].map(
        (_, k) =>
          new T.CatmullRomCurve3(
            sections.map((s) => new T.Vector3(s[0], s[k + 1], 0)),
            false,
            "catmullrom",
            0.25,
          ),
      );
    for (let i = 0; i <= rings; i++) {
      const u = i / rings,
        z = sections[0][0] + (sections.at(-1)[0] - sections[0][0]) * u,
        values = curves.map((c) => c.getPoint(u).y),
        [w, h, y] = values;
      for (let j = 0; j <= radial; j++) {
        const a = (j / radial) * Math.PI * 2;
        points.push(
          xOffset + Math.cos(a) * Math.max(0.015, w),
          y + Math.sin(a) * Math.max(0.015, h),
          z,
        );
        uv.push(j / radial, u * 3);
      }
    }
    for (let i = 0; i < rings; i++)
      for (let j = 0; j < radial; j++) {
        const a = i * (radial + 1) + j,
          b = a + radial + 1;
        idx.push(a, a + 1, b, a + 1, b + 1, b);
      }
    for (const end of [0, rings]) {
      const center = points.length / 3,
        y = curves[2].getPoint(end / rings).y,
        z = end ? sections.at(-1)[0] : sections[0][0];
      points.push(xOffset, y, z);
      uv.push(0.5, 0.5);
      for (let j = 0; j < radial; j++) {
        const a = end * (radial + 1) + j;
        idx.push(...(end ? [center, a, a + 1] : [center, a + 1, a]));
      }
    }
    const g = new T.BufferGeometry();
    g.setAttribute("position", new T.Float32BufferAttribute(points, 3));
    g.setAttribute("uv", new T.Float32BufferAttribute(uv, 2));
    g.setIndex(idx);
    g.computeVertexNormals();
    return add(g, mat);
  }
  function foil(span, z, y, chord, camber = 0.045, mat = carbon, sweep = 0.12) {
    const nx = 12 + detail * 6,
      nz = 6 + detail * 3,
      v = [],
      uv = [],
      idx = [];
    for (let side = 0; side < 2; side++)
      for (let i = 0; i <= nx; i++)
        for (let j = 0; j <= nz; j++) {
          const a = (i / nx) * 2 - 1,
            u = j / nz;
          v.push(
            (a * span) / 2,
            y +
              Math.sin(u * Math.PI) * camber +
              (side ? 1 : -1) * Math.sin(Math.PI * u) * 0.007 +
              Math.pow(Math.abs(a), 6) * 0.035,
            z + (u - 0.5) * chord + sweep * (1 - a * a),
          );
          uv.push(i / nx, u);
        }
    const count = (nx + 1) * (nz + 1);
    for (let side = 0; side < 2; side++)
      for (let i = 0; i < nx; i++)
        for (let j = 0; j < nz; j++) {
          const a = side * count + i * (nz + 1) + j,
            b = a + nz + 1;
          idx.push(
            ...(side
              ? [a, b, a + 1, b, b + 1, a + 1]
              : [a, a + 1, b, b, a + 1, b + 1]),
          );
        }
    const g = new T.BufferGeometry();
    g.setAttribute("position", new T.Float32BufferAttribute(v, 3));
    g.setAttribute("uv", new T.Float32BufferAttribute(uv, 2));
    g.setIndex(idx);
    g.computeVertexNormals();
    return add(g, mat);
  }
  // Continuous sculpted monocoque, nose, engine cover and undercut sidepods.
  loft(
    [
      [-2.15, 0.07, 0.08, 0.36],
      [-1.8, 0.14, 0.16, 0.46],
      [-1.2, 0.24, 0.29, 0.67],
      [-0.7, 0.28, 0.33, 0.71],
      [-0.2, 0.31, 0.23, 0.62],
      [0.45, 0.3, 0.23, 0.54],
      [0.95, 0.18, 0.15, 0.43],
      [1.8, 0.105, 0.08, 0.31],
      [2.65, 0.055, 0.045, 0.255],
    ],
    paint,
  );
  for (const side of [-1, 1]) {
    loft(
      [
        [-1.85, 0.07, 0.05, 0.25],
        [-1.35, 0.14, 0.1, 0.31],
        [-0.75, 0.23, 0.19, 0.4],
        [0.0, 0.29, 0.22, 0.48],
        [0.48, 0.28, 0.15, 0.53],
        [0.7, 0.23, 0.085, 0.56],
      ],
      paint,
      side * 0.48,
    );
    const intake = add(
      new T.SphereGeometry(1, 16 + detail * 8, 8 + detail * 4),
      carbon,
    );
    intake.position.set(side * 0.48, 0.575, 0.71);
    intake.scale.set(0.225, 0.09, 0.025);
    tube(
      [
        [side * 0.22, 0.72, 0.2],
        [side * 0.47, 0.73, 0.17],
        [side * 0.68, 0.65, -0.6],
        [side * 0.57, 0.48, -1.4],
      ],
      0.012,
      accent,
    );
    foil(0.34, -0.9, 0.62, 0.7, 0.015, carbon, 0.03).position.x = side * 0.39;
    for (let k = 0; k < 6; k++) {
      const slat = box(
        side * 0.31,
        0.86 - k * 0.017,
        -0.72 - k * 0.105,
        0.12,
        0.008,
        0.065,
        carbon,
      );
      slat.rotation.z = side * 0.25;
    }
    tube(
      [
        [side * 0.3, 0.72, 0.42],
        [side * 0.4, 0.85, 0.47],
        [side * 0.54, 0.86, 0.42],
      ],
      0.014,
    );
    const mirror = add(new T.SphereGeometry(1, 16, 8), paint);
    mirror.position.set(side * 0.55, 0.86, 0.41);
    mirror.scale.set(0.11, 0.045, 0.07);
  }
  // Floor outline with shaped edges and venturi/diffuser strakes.
  const shape = new T.Shape();
  shape.moveTo(-0.71, 1.03);
  shape.lineTo(-0.84, 0.6);
  shape.lineTo(-0.86, -1.6);
  shape.lineTo(-0.65, -2.35);
  shape.lineTo(0.65, -2.35);
  shape.lineTo(0.86, -1.6);
  shape.lineTo(0.84, 0.6);
  shape.lineTo(0.71, 1.03);
  shape.closePath();
  const floor = new T.ExtrudeGeometry(shape, {
    depth: 0.025,
    bevelEnabled: true,
    bevelSize: 0.015,
    bevelThickness: 0.01,
    bevelSegments: 2,
    steps: 1,
  });
  floor.rotateX(Math.PI / 2);
  const fm = add(floor, carbon);
  fm.position.y = 0.11;
  for (const side of [-1, 1]) {
    tube(
      [
        [side * 0.8, 0.11, 0.6],
        [side * 0.85, 0.11, -0.4],
        [side * 0.75, 0.16, -1.8],
      ],
      0.018,
      carbon,
    );
    for (let i = 0; i < 3; i++)
      box(side * (0.58 + i * 0.1), 0.13, 0.63 - i * 0.11, 0.018, 0.16, 0.4);
  }
  for (let i = -3; i <= 3; i++) {
    const fin = box(i * 0.175, 0.17, -2.14, 0.014, 0.19, 0.55);
    fin.rotation.x = 0.12;
  }
  // Front wing: four swept cambered elements, rounded end plates and pylons.
  for (let i = 0; i < 4; i++)
    foil(
      1.96,
      2.58 - i * 0.105,
      0.16 + i * 0.046,
      0.33,
      0.035,
      i === 0 ? carbon : paint,
      0.15,
    );
  for (const side of [-1, 1]) {
    tube(
      [
        [side * 0.95, 0.17, 2.72],
        [side * 0.97, 0.28, 2.63],
        [side * 0.95, 0.37, 2.32],
        [side * 0.93, 0.34, 2.07],
      ],
      0.022,
      paint,
    );
    rod([side * 0.075, 0.25, 2.37], [side * 0.075, 0.13, 2.46], 0.016);
  }
  // Rear wing wraps upward at both ends; modest real-world span instead of the V2 wide box.
  for (let i = 0; i < 2; i++)
    foil(1.25, -2.35 + i * 0.13, 0.97 + i * 0.1, 0.35, 0.065, paint, -0.055);
  for (const side of [-1, 1]) {
    tube(
      [
        [side * 0.46, 0.81, -2.51],
        [side * 0.62, 0.95, -2.48],
        [side * 0.64, 1.08, -2.31],
        [side * 0.55, 1.1, -2.12],
      ],
      0.028,
      paint,
    );
    tube(
      [
        [side * 0.18, 0.35, -2.07],
        [side * 0.19, 0.67, -2.1],
        [side * 0.23, 0.94, -2.27],
      ],
      0.022,
    );
  }
  foil(0.97, -2.1, 0.38, 0.23, 0.035, carbon, -0.04);
  box(0, 0.22, -2.43, 0.07, 0.12, 0.05, light);
  // Cockpit opening, padded lip, helmet, visor, halo and roll-hoop air intake.
  const well = add(new T.SphereGeometry(1, 24, 12), carbon);
  well.position.set(0, 0.715, 0.1);
  well.scale.set(0.255, 0.04, 0.47);
  tube(
    [
      [-0.235, 0.74, -0.3],
      [-0.26, 0.75, 0.12],
      [-0.2, 0.71, 0.49],
      [0.2, 0.71, 0.49],
      [0.26, 0.75, 0.12],
      [0.235, 0.74, -0.3],
    ],
    0.025,
    carbon,
  );
  const head = add(
    new T.SphereGeometry(0.158, 20 + detail * 6, 12 + detail * 4),
    helmet,
  );
  head.position.set(0, 0.87, -0.08);
  const shield = add(
    new T.SphereGeometry(
      0.16,
      24,
      10,
      0,
      Math.PI * 2,
      Math.PI * 0.36,
      Math.PI * 0.19,
    ),
    visor,
  );
  shield.position.copy(head.position);
  tube(
    [
      [-0.29, 0.96, -0.37],
      [-0.3, 1.005, 0.12],
      [0, 1.015, 0.39],
      [0.3, 1.005, 0.12],
      [0.29, 0.96, -0.37],
    ],
    0.023,
  );
  rod([0, 0.69, 0.39], [0, 1.015, 0.39], 0.021);
  loft(
    [
      [-0.89, 0.045, 0.035, 1.0],
      [-0.76, 0.09, 0.09, 1.02],
      [-0.55, 0.085, 0.075, 1.06],
      [-0.46, 0.06, 0.05, 1.06],
    ],
    paint,
  );
  const air = add(new T.SphereGeometry(1, 16, 8), carbon);
  air.position.set(0, 1.07, -0.45);
  air.scale.set(0.063, 0.048, 0.012);
  // Exposed wishbones, track rods, rounded tyre shoulders, 18-inch covers and sidewall rings.
  for (const [label, x, z, width] of [
    ["FL", -0.835, 1.75, 0.305],
    ["FR", 0.835, 1.75, 0.305],
    ["RL", -0.8025, -1.85, 0.405],
    ["RR", 0.8025, -1.85, 0.405],
  ]) {
    const steer = new T.Group();
    steer.name = "Steer_" + label;
    steer.position.set(x, 0.36, z);
    root.add(steer);
    const wheel = new T.Group();
    wheel.name = "Wheel_" + label;
    steer.add(wheel);
    const w = width / 2;
    const profile = [
      new T.Vector2(0.233, -w),
      new T.Vector2(0.3, -w),
      new T.Vector2(0.338, -w * 0.95),
      new T.Vector2(0.356, -w * 0.72),
      new T.Vector2(0.36, -w * 0.35),
      new T.Vector2(0.36, w * 0.35),
      new T.Vector2(0.356, w * 0.72),
      new T.Vector2(0.338, w * 0.95),
      new T.Vector2(0.3, w),
      new T.Vector2(0.233, w),
    ];
    const tyre = new T.LatheGeometry(profile, 24 + detail * 20);
    tyre.rotateZ(Math.PI / 2);
    add(tyre, rubber, wheel);
    const rim = add(
      new T.CylinderGeometry(0.235, 0.235, width * 0.99, 24 + detail * 12),
      metal,
      wheel,
    );
    rim.rotation.z = Math.PI / 2;
    for (const side of [-1, 1]) {
      const cover = add(
        new T.CylinderGeometry(0.218, 0.218, 0.007, 24 + detail * 12),
        carbon,
        wheel,
      );
      cover.rotation.z = Math.PI / 2;
      cover.position.x = side * (w + 0.006);
      const bead = add(
        new T.TorusGeometry(0.237, 0.005, 6, 24 + detail * 16),
        metal,
        wheel,
      );
      bead.rotation.y = Math.PI / 2;
      bead.position.x = side * (w + 0.006);
      const band = add(
        new T.TorusGeometry(0.302, 0.004, 5, 32 + detail * 16),
        stripe,
        wheel,
      );
      band.rotation.y = Math.PI / 2;
      band.position.x = side * (w + 0.002);
      for (let j = 0; j < 12; j++) {
        const a = (j / 12) * Math.PI * 2;
        const vent = box(
          side * (w + 0.011),
          Math.sin(a) * 0.15,
          Math.cos(a) * 0.15,
          0.007,
          0.02,
          0.064,
          metal,
          wheel,
        );
        vent.rotation.x = -a;
      }
      const nut = add(
        new T.CylinderGeometry(0.03, 0.03, 0.016, 6),
        metal,
        wheel,
      );
      nut.rotation.z = Math.PI / 2;
      nut.position.x = side * (w + 0.02);
    }
    for (const dz of [-0.3, 0.3])
      for (const y of [0.19, 0.52])
        rod([Math.sign(x) * 0.23, y, z + dz], [x, 0.36, z], 0.013);
    rod([Math.sign(x) * 0.18, 0.65, z - 0.1], [x, 0.35, z], 0.015);
    rod(
      [Math.sign(x) * 0.19, 0.35, z + 0.14],
      [x, 0.35, z + 0.1],
      0.009,
      metal,
    );
  }
  // Shared material batches preserve wheel/steering nodes and their pivots.
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
        if (!g.attributes.uv) {
          const uv = [];
          for (let i = 0; i < g.attributes.position.count; i++)
            uv.push(
              g.attributes.position.getX(i),
              g.attributes.position.getZ(i),
            );
          g.setAttribute("uv", new T.Float32BufferAttribute(uv, 2));
        }
        if (!map.has(o.material)) map.set(o.material, []);
        map.get(o.material).push(g.index ? g.toNonIndexed() : g);
        o.removeFromParent();
        o.geometry.dispose();
      }
    for (const [m, geos] of map) {
      const g = mergeGeometries(geos);
      add(g, m, parent);
      geos.forEach((g) => g.dispose());
    }
  }
  root.traverse((o) => {
    if (o.name.startsWith("Wheel_")) batch(o);
  });
  batch(root);
  return root;
}
