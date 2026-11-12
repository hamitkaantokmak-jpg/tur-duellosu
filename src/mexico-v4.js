/* Blender venue prefabs augment the preserved OSM scene; all extra race furniture is representative. */
const MexicoV4 = {
  apply(G, S) {
    if (
      ["idle", "loading"].includes(VisualAssets.state) ||
      !G.ready ||
      !S.track ||
      !S.profile.mexico ||
      !VisualAssets.venue ||
      G.v4World === G.world
    )
      return;
    const T = G.T,
      world = G.world,
      venue = VisualAssets.venue;
    G.v4World = world;
    const group = new T.Group();
    group.name = "BlenderVenueV4";
    G.environment.add(group);
    G.v4Batches = [];
    G.v4Stats = { prefabs: {}, treeHigh: 0, treeLow: 0 };
    venue.updateMatrixWorld(true);
    const cache = new Map(),
      materials = new Map();
    function material(source) {
      if (materials.has(source)) return materials.get(source);
      const m = source.clone();
      m.name=m.name.replace(/\.\d+$/, "");
      if (m.name.includes("tree_small_02")) {
        m.transparent = false;
        m.opacity = 1;
        m.alphaTest = 0.45;
        m.roughness = 1;
        m.side = T.DoubleSide;
        if (m.normalMap) m.normalScale.set(0.4, 0.4);
      }
      if (m.name === "Kit_Concrete") {
        m.map = VisualAssets.textures["concrete-color"] || null;
        m.normalMap = VisualAssets.textures["concrete-normal"] || null;
        m.normalScale.set(0.14, 0.14);
        m.roughnessMap = VisualAssets.textures["concrete-roughness"] || null;
      }
      for (const value of Object.values(m))
        if (value?.isTexture) value.userData.sharedAsset = true;
      materials.set(source, m);
      return m;
    }
    function parts(name) {
      if (cache.has(name)) return cache.get(name);
      if (name === "KIT_PhotoTreeLow" && VisualAssets.treeAtlas) {
        const g = new T.BufferGeometry(),
          v = [],
          uv = [];
        for (let side = 0; side < 2; side++) {
          const a = side === 0 ? [-4.25, 0, 0] : [0, 0, -4.25],
            b = side === 0 ? [4.25, 0, 0] : [0, 0, 4.25],
            c = side === 0 ? [4.25, 8.5, 0] : [0, 8.5, 4.25],
            d = side === 0 ? [-4.25, 8.5, 0] : [0, 8.5, -4.25];
          // Orthographic bake has .75m transparent space below the 7m tree.
          for (const p of [a, b, c, a, c, d]) v.push(p[0], p[1] - 0.75, p[2]);
          const u = side / 3;
          uv.push(u, 0, u + 1 / 3, 0, u + 1 / 3, 1, u, 0, u + 1 / 3, 1, u, 1);
        }
        for (const p of [
          [-4.25, 4.6, -4.25],
          [4.25, 4.6, -4.25],
          [4.25, 4.6, 4.25],
          [-4.25, 4.6, -4.25],
          [4.25, 4.6, 4.25],
          [-4.25, 4.6, 4.25],
        ])
          v.push(...p);
        uv.push(2 / 3, 0, 1, 0, 1, 1, 2 / 3, 0, 1, 1, 2 / 3, 1);
        g.setAttribute("position", new T.Float32BufferAttribute(v, 3));
        g.setAttribute("uv", new T.Float32BufferAttribute(uv, 2));
        g.computeVertexNormals();
        g.computeBoundingSphere();
        const out = [
          {
            geometry: g,
            material: new T.MeshBasicMaterial({
              map: VisualAssets.treeAtlas,
              alphaTest: 0.45,
              side: T.DoubleSide,
              toneMapped: false,
            }),
          },
        ];
        cache.set(name, out);
        return out;
      }
      const node =
        venue.getObjectByName(name) || VisualAssets.tree?.getObjectByName(name);
      if (!node) return [];
      const inverse = new T.Matrix4().copy(node.matrixWorld).invert(),
        out = [];
      node.traverse((o) => {
        if (!o.isMesh) return;
        const g = new T.BufferGeometry();
        for (const key of ["position", "normal", "uv"]) {
          const a = o.geometry.attributes[key];
          if (!a) continue;
          const values = new Float32Array(a.count * a.itemSize);
          for (let i = 0; i < a.count; i++) {
            values[i * a.itemSize] = a.getX(i);
            values[i * a.itemSize + 1] = a.getY(i);
            if (a.itemSize > 2) values[i * a.itemSize + 2] = a.getZ(i);
          }
          g.setAttribute(key, new T.BufferAttribute(values, a.itemSize));
        }
        if (o.geometry.index) g.setIndex(o.geometry.index.clone());
        g.applyMatrix4(
          new T.Matrix4().multiplyMatrices(inverse, o.matrixWorld),
        );
        g.computeBoundingSphere();
        out.push({ geometry: g, material: material(o.material) });
      });
      if (name.startsWith("KIT_Tree")) {
        // One vertex-coloured batch per tree LOD replaces five material passes.
        const attributes = { position: [], normal: [], color: [] };
        for (const p of out) {
          const g = p.geometry.index ? p.geometry.toNonIndexed() : p.geometry;
          for (let i = 0; i < g.attributes.position.count; i++) {
            attributes.position.push(
              g.attributes.position.getX(i),
              g.attributes.position.getY(i),
              g.attributes.position.getZ(i),
            );
            attributes.normal.push(
              g.attributes.normal.getX(i),
              g.attributes.normal.getY(i),
              g.attributes.normal.getZ(i),
            );
            attributes.color.push(
              p.material.color.r,
              p.material.color.g,
              p.material.color.b,
            );
          }
          if (g !== p.geometry) g.dispose();
          p.geometry.dispose();
        }
        const g = new T.BufferGeometry();
        for (const [key, data] of Object.entries(attributes))
          g.setAttribute(key, new T.Float32BufferAttribute(data, 3));
        g.computeBoundingSphere();
        out.splice(0, out.length, {
          geometry: g,
          material: new T.MeshStandardMaterial({
            vertexColors: true,
            roughness: 0.95,
          }),
        });
      }
      cache.set(name, out);
      return out;
    }
    function instances(name, placements, lod = null) {
      if (!placements.length) return;
      const data = parts(name);
      if (!data.length) return;
      G.v4Stats.prefabs[name] =
        (G.v4Stats.prefabs[name] || 0) + placements.length;
      const cells = new Map();
      for (const p of placements) {
        const key = Math.floor(p.x / 160) + ":" + Math.floor(p.z / 160);
        if (!cells.has(key)) cells.set(key, []);
        cells.get(key).push(p);
      }
      for (const list of cells.values())
        for (const part of data) {
          const o = new T.InstancedMesh(
              part.geometry,
              part.material,
              list.length,
            ),
            dummy = new T.Object3D();
          list.forEach((p, i) => {
            dummy.position.set(p.x, (p.y || 0)+(G.surface?.heightAt(p.x,p.z)||0), p.z);
            dummy.rotation.set(0, p.yaw || 0, 0);
            if(G.surface&&!G.surface.flat&&/KIT_(Barrier|Fence)/.test(name)){
              const q=G.surface.project(p.x,p.z),f=G.surface.sampleAtDistance(q.distance,q.offset);
              TrackTopography.orientation(T,f.surfaceNormal,Math.sin(p.yaw||0),Math.cos(p.yaw||0),dummy.quaternion);
            }
            dummy.scale.set(
              ...(p.scaleXYZ || [p.scale || 1, p.scale || 1, p.scale || 1]),
            );
            dummy.updateMatrix();
            o.setMatrixAt(i, dummy.matrix);
          });
          o.name = name;
          o.castShadow = !/KIT_(Tree|PhotoTree)/.test(name);
          o.receiveShadow = true;
          o.computeBoundingSphere();
          o.userData.lod = lod;
          if (lod === "near") {
            o.userData.placements = list;
            o.userData.fullMatrices = o.instanceMatrix.array.slice();
          }
          o.userData.fullCount = list.length;
          group.add(o);
          G.v4Batches.push(o);
        }
    }
    const trees = [],
      oldGeometry = new Set(),
      oldMaterials = new Set(),
      matrix = new T.Matrix4(),
      p = new T.Vector3(),
      q = new T.Quaternion(),
      scale = new T.Vector3();
    for (const o of G.v3Instances || []) {
      if (!["Trees", "Trunks"].includes(o.name)) continue;
      if (o.name === "Trees")
        for (let i = 0; i < o.count; i++) {
          o.getMatrixAt(i, matrix);
          matrix.decompose(p, q, scale);
          trees.push({
            x: p.x,
            y: 0,
            z: p.z,
            yaw: new T.Euler().setFromQuaternion(q).y,
            scale: scale.x,
          });
        }
      o.removeFromParent();
      oldGeometry.add(o.geometry);
      oldMaterials.add(o.material);
    }
    G.v3Instances = (G.v3Instances || []).filter(
      (o) => !["Trees", "Trunks"].includes(o.name),
    );
    oldGeometry.forEach((g) => g.dispose());
    oldMaterials.forEach((m) => m.dispose());
    const photo = !!(VisualAssets.tree && VisualAssets.treeAtlas);
    instances(photo ? "KIT_PhotoTree" : "KIT_Tree", trees, "near");
    instances(photo ? "KIT_PhotoTreeLow" : "KIT_TreeLow", trees, "far");
    // The map still defines the building envelope; detailed artist-made facade modules sit on the pit-facing side.
    const bays = [],
      stands = [],
      lights = [],
      barriers = [],
      towers = [],
      bridges = [];
    const source = MEXICO_VENUE.features.map((f) => ({
      ...f,
      poly: f.coordinates.map((c) => MexicoV3.geo(c)),
    }));
    for (const f of source.filter((f) => f.name === "Paddock"))
      for (let i = 0; i < f.poly.length - 1; i++) {
        const a = f.poly[i],
          b = f.poly[i + 1],
          dx = b.x - a.x,
          dz = b.z - a.z,
          len = Math.hypot(dx, dz);
        if (len < 30) continue;
        const center = { x: (a.x + b.x) / 2, z: (a.z + b.z) / 2 },
          near = MexicoV3.nearest(center);
        if (near.distance > 80) continue;
        let nx = -dz / len,
          nz = dx / len;
        if (nx * (near.x - center.x) + nz * (near.z - center.z) < 0) {
          nx = -nx;
          nz = -nz;
        }
        for (let d = 3.4; d < len - 3.3; d += 6.4)
          bays.push({
            x: a.x + (dx * d) / len + nx * 0.22,
            z: a.z + (dz * d) / len + nz * 0.22,
            yaw: Math.atan2(nx, nz),
          });
      }
    for (const c of st.H.corners) {
      const u =
          (((S.registration.phase + S.registration.dir * c.r) % 1) + 1) % 1,
        f = MexicoV3.frame(u);
      // Detail modules cover every major complex, with a clear-track check on the complete footprint.
      if ([1, 4, 7, 10, 12, 16].includes(+c.n)) {
        const side = +c.n % 2 ? 1 : -1,
          x = f.x + f.rx * side * 48,
          z = f.z + f.rz * side * 48,
          yaw = Math.atan2(-f.rx * side, -f.rz * side);
        const corners = [
          [-7, -4],
          [-7, 7],
          [7, -4],
          [7, 7],
        ].map(([a, b]) => ({
          x: x + Math.cos(yaw) * a + Math.sin(yaw) * b,
          z: z - Math.sin(yaw) * a + Math.cos(yaw) * b,
        }));
        if (
          corners.every((p) => MexicoV3.nearest(p).distance > 28) &&
          !source.some(
            (s) =>
              ["building", "grandstand"].includes(s.kind) &&
              MexicoV3.contains({ x, z }, s.poly),
          )
        )
          stands.push({ x, z, yaw });
      }
      for (const side of [-1, 1]) {
        const x = f.x + f.rx * side * 24,
          z = f.z + f.rz * side * 24;
        if (
          !source.some(
            (s) => s.kind === "building" && MexicoV3.contains({ x, z }, s.poly),
          )
        )
          lights.push({ x, z });
      }
    }
    // Place complete 4m Blender barriers along the already validated simple offset curves.
    for (const boundary of MEXICO_BOUNDARIES) {
      let carry = 2;
      for (let i = 0; i < boundary.points.length - 1; i++) {
        const a = boundary.points[i],
          b = boundary.points[i + 1],
          dx = b[0] - a[0],
          dz = b[1] - a[1],
          length = Math.hypot(dx, dz);
        if (!length) continue;
        while (carry < length) {
          barriers.push({
            x: a[0] + (dx * carry) / length,
            z: a[1] + (dz * carry) / length,
            yaw: Math.atan2(-dz, dx),
          });
          carry += 4;
        }
        carry -= length;
      }
    }
    if (G.v3Materials?.wall) G.v3Materials.wall.visible = false;
    const start = MexicoV3.frame(S.registration.phase);
    const tower = {
      x: start.x + start.rx * 43,
      z: start.z + start.rz * 43,
      yaw: Math.atan2(start.fx, start.fz),
    };
    if (
      !source.some(
        (s) => s.kind === "building" && MexicoV3.contains(tower, s.poly),
      )
    )
      towers.push(tower);
    const bridge = MexicoV3.frame(
      S.registration.phase + S.registration.dir * 0.02,
    );
    bridges.push({
      x: bridge.x,
      z: bridge.z,
      yaw: Math.atan2(bridge.fx, bridge.fz),
    });
    // Fit authored stair/railing modules into the two mapped Foro Sol seating footprints.
    const aisles = [],
      cuts = [];
    for (const f of source.filter((f) =>
      [377679562, 1315400018].includes(f.id),
    )) {
      const center = {
          x: f.poly.reduce((a, p) => a + p.x, 0) / f.poly.length,
          z: f.poly.reduce((a, p) => a + p.z, 0) / f.poly.length,
        },
        near = MexicoV3.nearest(center),
        nx = (center.x - near.x) / near.distance,
        nz = (center.z - near.z) / near.distance,
        tx = -nz,
        tz = nx;
      const ns = f.poly.map(
          (p) => (p.x - center.x) * nx + (p.z - center.z) * nz,
        ),
        ts = f.poly.map((p) => (p.x - center.x) * tx + (p.z - center.z) * tz),
        lo = Math.min(...ns),
        hi = Math.max(...ns),
        rise = Math.min(13, Math.max(7, (hi - lo) * 0.45));
      for (let t = Math.min(...ts) + 12; t < Math.max(...ts) - 10; t += 24) {
        const samples = [];
        for (let n = lo + 0.5; n < hi - 0.5; n += 0.5) {
          const p = {
            x: center.x + tx * t + nx * n,
            z: center.z + tz * t + nz * n,
          };
          if (
            MexicoV3.contains(p, f.poly) &&
            [-1, 1].every((s) =>
              MexicoV3.contains({ x: p.x + tx * s, z: p.z + tz * s }, f.poly),
            )
          )
            samples.push(n);
        }
        if (samples.length < 22) continue;
        const front = samples[0] + 0.5,
          back = samples.at(-1) - 0.5,
          depth = back - front;
        if (depth < 10) continue;
        const x = center.x + tx * t + nx * front,
          z = center.z + tz * t + nz * front;
        aisles.push({
          x,
          z,
          y: 1 + ((front - lo) / (hi - lo)) * rise,
          yaw: Math.atan2(nx, nz),
          scaleXYZ: [1, ((depth / (hi - lo)) * rise) / 10, depth / 20],
        });
        cuts.push({ x, z, nx, nz, tx, tz, depth });
      }
    }
    if (aisles.length) {
      let seats = 0;
      for (const o of G.v3Instances || []) {
        if (!["Seats", "Crowd"].includes(o.name)) continue;
        let keep = 0;
        const colour = new T.Color();
        for (let i = 0; i < o.userData.fullCount; i++) {
          o.getMatrixAt(i, matrix);
          p.setFromMatrixPosition(matrix);
          if (
            cuts.some((c) => {
              const dx = p.x - c.x,
                dz = p.z - c.z,
                n = dx * c.nx + dz * c.nz;
              return (
                n > -0.5 &&
                n < c.depth + 1 &&
                Math.abs(dx * c.tx + dz * c.tz) < 1.1
              );
            })
          )
            continue;
          if (keep !== i) {
            o.setMatrixAt(keep, matrix);
            if (o.instanceColor) {
              o.getColorAt(i, colour);
              o.setColorAt(keep, colour);
            }
          }
          keep++;
        }
        o.count = o.userData.fullCount = keep;
        o.instanceMatrix.needsUpdate = true;
        if (o.instanceColor) o.instanceColor.needsUpdate = true;
        if (o.name === "Seats") seats += keep;
      }
      G.v3Stats.seats = seats;
      instances("KIT_StadiumAisle", aisles);
    }
    const skyline = [];
    for (let i = 0; i < 36; i++) {
      const z = S.minZ + ((S.maxZ - S.minZ) * i) / 35;
      for (const side of [-1, 1])
        skyline.push({
          x:
            side < 0
              ? S.minX - 250 - (i % 4) * 18
              : S.maxX + 250 + (i % 5) * 14,
          z,
          scale: 0.65 + (i % 7) * 0.14,
          yaw: ((i % 4) * Math.PI) / 2,
        });
    }
    instances("KIT_CityBlock", skyline, "skyline");
    instances("KIT_PitBay", bays);
    instances("KIT_Grandstand", stands);
    instances("KIT_LightPole", lights);
    instances("KIT_Barrier", barriers);
    instances("KIT_ControlTower", towers);
    instances("KIT_Bridge", bridges);
    // A muted soil surface gives surrounding ground a measured visual scale without claiming a site photograph.
    if (VisualAssets.textures["turf-color"]) {
      const tex = VisualAssets.textures["turf-color"];
      tex.repeat.set(1100, 1100);
      world.traverse((o) => {
        if (
          o.geometry?.type === "PlaneGeometry" &&
          (o.geometry.parameters.width === 8000||o.name==='TopographyGround')
        ) {
          const oldMap = o.material.map;
          if (oldMap && !oldMap.userData.sharedAsset) oldMap.dispose();
          o.material.map = tex;
          o.material.color.set("#d2d5bc");
          o.material.roughness = 0.96;
          o.material.needsUpdate = true;
        }
      });
    }
    // Keep resource ownership explicit; cache geometries referenced by instances are released by world disposal.
    G.v4Obstacles = [];
    for (const o of G.v4Batches)
      if (!/KIT_(Tree|PhotoTree)/.test(o.name)) G.v4Obstacles.push(o);
    G.v4Stats.treeHigh = trees.length;
    G.v4Stats.treeLow = trees.length;
  },
  update(G) {
    const profile = $("ghostRenderQuality").value,
      overview = ghost.camera === "overview";
    const selection = new Map();
    G.v4Stats && (G.v4Stats.activeNearTrees = 0);
    for (const o of G.v4Batches || []) {
      const d = o.boundingSphere.center.distanceTo(G.camera.position),
        r = o.boundingSphere.radius;
      const near = d - r < 70 && profile !== "performance" && !overview;
      if (o.userData.lod === "near") {
        const list = o.userData.placements;
        let selected = selection.get(list);
        if (!selected) {
          const limit = profile === "ultra" ? 75 : 45;
          selected =
            profile === "performance" || overview
              ? []
              : list
                  .map((p, i) => ({ p, i }))
                  .filter(
                    ({ p }) =>
                      (p.x - G.camera.position.x) ** 2 +
                        (p.z - G.camera.position.z) ** 2 +
                        (G.camera.position.y - 4) ** 2 <
                      limit * limit,
                  )
                  .map(({ i }) => i);
          selection.set(list, selected);
          G.v4Stats.activeNearTrees += selected.length;
        }
        const key = selected.join(",");
        if (o.userData.selection !== key) {
          selected.forEach((index, i) =>
            o.instanceMatrix.array.set(
              o.userData.fullMatrices.subarray(index * 16, index * 16 + 16),
              i * 16,
            ),
          );
          o.count = selected.length;
          o.instanceMatrix.needsUpdate = true;
          o.userData.selection = key;
        }
      }
      o.visible =
        o.userData.lod === "near"
          ? o.count > 0
          : o.userData.lod === "far"
            ? overview || d - r < 700
            : o.userData.lod === "skyline"
              ? !overview && d - r < 1500
              : overview ||
                d - r <
                  (profile === "performance"
                    ? 320
                    : profile === "ultra"
                      ? 1000
                      : 600);
      o.castShadow =
        profile !== "performance" &&
        d - r < 140 &&
        (!/KIT_(Tree|PhotoTree)/.test(o.name) || o.userData.lod === "near");
    }
  },
};
