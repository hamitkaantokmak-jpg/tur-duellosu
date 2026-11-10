/* Whole-circuit visual scene. Footprints/trees: OSM ODbL; render line: Bacinger MIT.
   Widths, facades, heights without tags, barriers and temporary race furniture are representative. */
const MexicoV3 = {
  path: null,
  reference() {
    if (this.path) return this.path;
    const pts = MEXICO_RENDER_PATH.points,
      keys = pts.map((_, i) => i / (pts.length - 1));
    this.path = {
      length: 4304,
      points: pts,
      keys,
      x: pts.map((p) => p[0]),
      z: pts.map((p) => p[1]),
      sample(u) {
        u = ((u % 1) + 1) % 1;
        return {
          x: ReplayCore.at(keys, this.x, u),
          z: ReplayCore.at(keys, this.z, u),
        };
      },
    };
    return this.path;
  },
  frame(u) {
    const path = this.reference(),
      p = path.sample(u),
      a = path.sample(u - 0.0014),
      b = path.sample(u + 0.0014),
      d = Math.hypot(b.x - a.x, b.z - a.z) || 1;
    return {
      ...p,
      fx: (b.x - a.x) / d,
      fz: (b.z - a.z) / d,
      rx: (b.z - a.z) / d,
      rz: -(b.x - a.x) / d,
      u: ((u % 1) + 1) % 1,
    };
  },
  geo(c) {
    const lon = MEXICO_TRACK.coordinates[0][0],
      lat = MEXICO_TRACK.coordinates[0][1],
      cos = Math.cos((lat * Math.PI) / 180),
      model = st.H.track,
      scale =
        model.points[1].x /
        ((MEXICO_TRACK.coordinates[1][0] - lon) * 111320 * cos);
    return {
      x: (c[0] - lon) * 111320 * cos * scale,
      z: -(c[1] - lat) * 111320 * scale,
    };
  },
  nearest(p) {
    const pts = this.reference().points;
    let best = { d: Infinity };
    for (let i = 0; i < pts.length - 1; i += 3) {
      const a = pts[i],
        b = pts[Math.min(i + 3, pts.length - 1)],
        dx = b[0] - a[0],
        dz = b[1] - a[1],
        t = Math.max(
          0,
          Math.min(
            1,
            ((p.x - a[0]) * dx + (p.z - a[1]) * dz) / (dx * dx + dz * dz || 1),
          ),
        ),
        x = a[0] + t * dx,
        z = a[1] + t * dz,
        d = (p.x - x) ** 2 + (p.z - z) ** 2;
      if (d < best.d) {
        const l = Math.hypot(dx, dz) || 1;
        best = {
          d,
          x,
          z,
          rx: dz / l,
          rz: -dx / l,
          fx: dx / l,
          fz: dz / l,
          u: (i + t * 3) / (pts.length - 1),
        };
      }
    }
    best.distance = Math.sqrt(best.d);
    return best;
  },
  contains(p, poly) {
    let inside = false;
    for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
      const a = poly[i],
        b = poly[j];
      if (
        a.z > p.z !== b.z > p.z &&
        p.x < ((b.x - a.x) * (p.z - a.z)) / (b.z - a.z) + a.x
      )
        inside = !inside;
    }
    return inside;
  },
  build(T, G, S) {
    const env = new T.Group();
    env.name = "MexicoV3_GeographicVenue";
    G.world.add(env);
    G.environment = env;
    G.detailEnvironment = new T.Group();
    env.add(G.detailEnvironment);
    G.v3Instances = [];
    G.v3Obstacles = [];
    G.v3Stats = {
      buildings: 0,
      stands: 0,
      trees: 0,
      seats: 0,
      pitWays: 0,
      trackSegments: 2152,
    };
    let seed = 583;
    const random = () => {
      seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0;
      return seed / 4294967296;
    };
    const mat = (color, roughness = 0.8, metalness = 0) =>
      new T.MeshStandardMaterial({ color, roughness, metalness });
    const m = {
      road: mat("#777e83", 0.94),
      concrete: mat("#b4b5ad"),
      darkConcrete: mat("#858e8b"),
      white: mat("#e2e2d5"),
      red: mat("#b93834"),
      green: mat("#21614d"),
      wall: mat("#1d5744"),
      grass: mat("#8a9360"),
      steel: mat("#657473", 0.45, 0.65),
      roof: mat("#c1c8c7", 0.42, 0.4),
      glass: mat("#6f8a95", 0.23, 0.6),
      black: mat("#202c31"),
      rubber: mat("#252a29"),
      trunk: mat("#706450"),
      leaves: mat("#63704a"),
    };
    m.leaves.name = "Vegetation";
    for (const key of ["road", "wall", "white", "red", "green", "darkConcrete"])
      m[key].side = T.DoubleSide;
    G.roadMaterial = m.road;
    const mesh = (g, material, parent = env, cast = false) => {
      const o = new T.Mesh(g, material);
      o.castShadow = cast;
      o.receiveShadow = true;
      parent.add(o);
      return o;
    };
    const box = (
      parent,
      x,
      y,
      z,
      w,
      h,
      d,
      material = m.concrete,
      cast = true,
    ) => {
      const o = mesh(new T.BoxGeometry(w, h, d), material, parent, cast);
      o.position.set(x, y, z);
      return o;
    };
    function pole(parent, a, b, r = 0.05, material = m.steel) {
      const va = new T.Vector3(...a),
        vb = new T.Vector3(...b),
        d = vb.clone().sub(va),
        o = mesh(
          new T.CylinderGeometry(r, r, d.length(), 6),
          material,
          parent,
          true,
        );
      o.position.copy(va.add(vb).multiplyScalar(0.5));
      o.quaternion.setFromUnitVectors(new T.Vector3(0, 1, 0), d.normalize());
    }
    const wallUV = [];
    const batches = new Map();
    function quad(material, a, b, c, d) {
      if (!batches.has(material)) batches.set(material, []);
      batches.get(material).push(...a, ...b, ...c, ...a, ...c, ...d);
    }
    const edge = (f, offset, y) => [
      f.x + f.rx * offset,
      y,
      f.z + f.rz * offset,
    ];
    function ribbon(points, width, material, y = 0.02) {
      const vertices = [],
        uv = [];
      let length = 0;
      for (let i = 0; i < points.length - 1; i++) {
        const a = points[i],
          b = points[i + 1],
          pa = points[Math.max(0, i - 1)],
          pb = points[Math.min(points.length - 1, i + 2)],
          la = Math.hypot(b.x - pa.x, b.z - pa.z) || 1,
          lb = Math.hypot(pb.x - a.x, pb.z - a.z) || 1,
          fa = { ...a, rx: (b.z - pa.z) / la, rz: -(b.x - pa.x) / la },
          fb = { ...b, rx: (pb.z - a.z) / lb, rz: -(pb.x - a.x) / lb },
          len = Math.hypot(b.x - a.x, b.z - a.z);
        vertices.push(
          ...edge(fa, -width / 2, y),
          ...edge(fb, -width / 2, y),
          ...edge(fa, width / 2, y),
          ...edge(fa, width / 2, y),
          ...edge(fb, -width / 2, y),
          ...edge(fb, width / 2, y),
        );
        uv.push(
          0,
          length / 3,
          0,
          (length + len) / 3,
          width / 3,
          length / 3,
          width / 3,
          length / 3,
          0,
          (length + len) / 3,
          width / 3,
          (length + len) / 3,
        );
        length += len;
      }
      const g = new T.BufferGeometry();
      g.setAttribute("position", new T.Float32BufferAttribute(vertices, 3));
      g.setAttribute("uv", new T.Float32BufferAttribute(uv, 2));
      g.computeVertexNormals();
      return mesh(g, material, G.world);
    }
    // A continuous 2m render mesh across the complete lap, with explicit representative dimensions.
    const frames = Array.from({ length: 2153 }, (_, i) => this.frame(i / 2152)),
      roadVerts = [],
      roadUV = [];
    let dist = 0;
    const width = (f) => S.topographyProfile?.samples.some(p=>p.width!==undefined) ? G.surface.sampleAtDistance(f.u*G.surface.length).width/2 : (f.u < 0.25 || f.u > 0.96 ? 7.8 : 7.0);
    frames.forEach((f, i) => {
      let sum = 0;
      for (let d = -8; d <= 8; d++) {
        const a = frames[(i + d + 2152) % 2152],
          b = frames[(i + d + 1 + 2152) % 2152];
        sum += Math.min(1, Math.abs(a.fx * b.fz - a.fz * b.fx) * 45);
      }
      f.bend = sum / 17;
      f.runoff = Math.min(1.8 + f.bend * 12, 16 - width(f) - 0.4);
      f.wall = 16;
    });
    for (let i = 0; i < frames.length - 1; i++) {
      const a = frames[i],
        b = frames[i + 1],
        w = width(a),
        wn = width(b),
        len = Math.hypot(a.x - b.x, a.z - b.z),
        turn = a.fx * b.fz - a.fz * b.fx,
        bend = a.bend;
      roadVerts.push(
        ...edge(a, -w, 0.02),
        ...edge(b, -wn, 0.02),
        ...edge(a, w, 0.02),
        ...edge(a, w, 0.02),
        ...edge(b, -wn, 0.02),
        ...edge(b, wn, 0.02),
      );
      roadUV.push(
        0,
        dist / 3,
        0,
        (dist + len) / 3,
        (w * 2) / 3,
        dist / 3,
        (w * 2) / 3,
        dist / 3,
        0,
        (dist + len) / 3,
        (wn * 2) / 3,
        (dist + len) / 3,
      );
      dist += len;
      for (const side of [-1, 1]) {
        quad(
          m.white,
          edge(a, side * (w - 0.08), 0.039),
          edge(b, side * (wn - 0.08), 0.039),
          edge(b, side * (wn + 0.05), 0.039),
          edge(a, side * (w + 0.05), 0.039),
        );
        const runoff = a.runoff,
          runoffB = b.runoff;
        quad(
          bend > 0.2 ? m.green : m.darkConcrete,
          edge(a, side * (w + 0.12), 0.009),
          edge(b, side * (wn + 0.12), 0.009),
          edge(b, side * (wn + runoffB), 0.009),
          edge(a, side * (w + runoff), 0.009),
        );
        if (bend > 0.22) {
          const colour = Math.floor(dist / 1.5) % 2 ? m.red : m.white;
          quad(
            colour,
            edge(a, side * (w + 0.06), 0.047),
            edge(b, side * (wn + 0.06), 0.047),
            edge(b, side * (wn + 1.05), 0.057),
            edge(a, side * (w + 1.05), 0.057),
          );
        }
      }
    }
    // Build-time polygon buffering removes offset hairpin loops before extrusion.
    const boundaries = MEXICO_BOUNDARIES.map((b) => ({
      side: b.side,
      points: b.points.map(([x, z]) => ({ x, z })),
    }));
    G.v3Stats.boundaryPoints = boundaries.map((b) => b.points.length);
    for (const { side, points } of boundaries) {
      let length = 0;
      for (let i = 0; i < points.length - 1; i++) {
        const a = points[i],
          b = points[i + 1],
          len = Math.hypot(b.x - a.x, b.z - a.z),
          at = (p, y) => [p.x, y, p.z];
        quad(m.wall, at(a, 0.02), at(b, 0.02), at(b, 1), at(a, 1));
        const u0 = (side * length) / 20,
          u1 = (side * (length + len)) / 20;
        wallUV.push(u0, 0, u1, 0, u1, 1, u0, 0, u1, 1, u0, 1);
        length += len;
        const rx = ((b.z - a.z) / (len || 1)) * 0.16,
          rz = (-(b.x - a.x) / (len || 1)) * 0.16;
        quad(
          m.white,
          at(a, 1.02),
          at(b, 1.02),
          [b.x + rx, 1.02, b.z + rz],
          [a.x + rx, 1.02, a.z + rz],
        );
      }
    }
    const road = new T.BufferGeometry();
    road.setAttribute("position", new T.Float32BufferAttribute(roadVerts, 3));
    road.setAttribute("uv", new T.Float32BufferAttribute(roadUV, 2));
    road.computeVertexNormals();
    mesh(road, m.road, G.world).name="TopographyRoad";
    for (const [material, vertices] of batches) {
      const g = new T.BufferGeometry();
      g.setAttribute("position", new T.Float32BufferAttribute(vertices, 3));
      g.computeVertexNormals();
      const o = mesh(g, material, G.world, material === m.wall);
      if(material===m.white||material===m.red)o.name="TopographyKerbsAndMarkings";
      if (material === m.wall) {
        g.setAttribute("uv", new T.Float32BufferAttribute(wallUV, 2));
        o.userData.cameraObstacle = true;
        G.v3Obstacles.push(o);
      }
    }
    const barrierCanvas = document.createElement("canvas");
    barrierCanvas.width = 1024;
    barrierCanvas.height = 128;
    const bg = barrierCanvas.getContext("2d");
    bg.fillStyle = "#1b5c47";
    bg.fillRect(0, 0, 1024, 128);
    bg.fillStyle = "#e9ebdc";
    bg.font = "700 70px sans-serif";
    bg.textAlign = "center";
    bg.textBaseline = "middle";
    bg.fillText("MÉXICO  ·  TUR DÜELLOSU", 512, 61);
    bg.fillStyle = "#163d32";
    bg.fillRect(0, 110, 1024, 18);
    const barrierTexture = new T.CanvasTexture(barrierCanvas);
    barrierTexture.colorSpace = T.SRGBColorSpace;
    barrierTexture.wrapS = T.RepeatWrapping;
    m.wall.map = barrierTexture;
    m.wall.color.set("#ffffff");
    m.wall.needsUpdate = true;
    const grassCanvas = document.createElement("canvas");
    grassCanvas.width = grassCanvas.height = 256;
    const ctx = grassCanvas.getContext("2d"),
      image = ctx.createImageData(256, 256);
    for (let y = 0; y < 256; y++)
      for (let x = 0; x < 256; x++) {
        const n = random() * 7,
          k = (y * 256 + x) * 4;
        image.data[k] = 120 + n;
        image.data[k + 1] = 130 + n;
        image.data[k + 2] = 84 + n * 0.6;
        image.data[k + 3] = 255;
      }
    ctx.putImageData(image, 0, 0);
    const grassTex = new T.CanvasTexture(grassCanvas);
    grassTex.colorSpace = T.SRGBColorSpace;
    grassTex.wrapS = grassTex.wrapT = T.RepeatWrapping;
    grassTex.repeat.set(160, 160);
    m.grass.map = grassTex;
    m.grass.color.set("#a5ae8f");
    const ground = mesh(new T.PlaneGeometry(8000, 8000), m.grass, G.world);
    ground.name="TopographyGround";
    ground.rotation.x = -Math.PI / 2;
    ground.position.set((S.minX + S.maxX) / 2, -0.45, (S.minZ + S.maxZ) / 2);
    // Polygon helpers keep OSM footprints in geographic space; unknown heights remain explicitly illustrative.
    function polygon(
      poly,
      material,
      height = 0,
      topOnly = false,
      heights = null,
    ) {
      const shape = new T.Shape(poly.map((p) => new T.Vector2(p.x, -p.z))),
        g = topOnly
          ? new T.ShapeGeometry(shape)
          : new T.ExtrudeGeometry(shape, {
              depth: height,
              bevelEnabled: false,
              steps: 1,
            });
      g.rotateX(-Math.PI / 2);
      if (topOnly && heights) {
        const pos = g.attributes.position;
        for (let i = 0; i < pos.count; i++)
          pos.setY(i, heights(pos.getX(i), pos.getZ(i)));
        g.computeVertexNormals();
      }
      const cx = poly.reduce((s, p) => s + p.x, 0) / poly.length,
        cz = poly.reduce((s, p) => s + p.z, 0) / poly.length;
      g.translate(-cx, 0, -cz);
      const o = mesh(g, material);
      o.position.set(cx, 0, cz);
      return o;
    }
    const seatData = [],
      crowdData = [],
      treeData = [],
      fenceData = [];
    const source = MEXICO_VENUE.features.map((f) => ({
      ...f,
      poly: f.coordinates.map((c) => this.geo(c)),
    }));
    const facades = ["#abae9e", "#b6b3a2", "#939c98"].map((c) => mat(c)),
      paddock = mat("#b5b8ad"),
      seatingMaterial = mat("#a27d71");
    const buildings = [];
    for (const f of source) {
      const poly = f.poly,
        center = {
          x: poly.reduce((s, p) => s + p.x, 0) / poly.length,
          z: poly.reduce((s, p) => s + p.z, 0) / poly.length,
        },
        near = this.nearest(center);
      if (near.distance > 410) continue;
      if (f.kind === "pit") {
        ribbon(poly, 7.6, typeof MexicoV4!=="undefined"?m.road:m.darkConcrete, typeof MexicoV4!=="undefined"?.015:.027);
        G.v3Stats.pitWays++;
        continue;
      }
      if (f.kind === "stadium") continue;
      if (f.kind === "pitch") {
        if (near.distance < 24) continue;
        const o = polygon(poly, mat("#728c68"));
        o.position.y = -0.2;
        continue;
      }
      if (f.kind === "grandstand") {
        // Seating rises away from the closest track edge; architecture heights are not inferred measurements.
        const nx = (center.x - near.x) / (near.distance || 1),
          nz = (center.z - near.z) / (near.distance || 1),
          dots = poly.map((p) => (p.x - center.x) * nx + (p.z - center.z) * nz),
          lo = Math.min(...dots),
          hi = Math.max(...dots),
          rise = Math.min(13, Math.max(7, (hi - lo) * 0.45)),
          yAt = (x, z) =>
            1 +
            Math.max(
              0,
              Math.min(
                1,
                ((x - center.x) * nx + (z - center.z) * nz - lo) /
                  (hi - lo || 1),
              ),
            ) *
              rise;
        const shell = polygon(poly, m.concrete, 1);
        shell.userData.cameraObstacle = true;
        const seating = polygon(poly, seatingMaterial, 0, true, yAt);
        G.v3Stats.stands++;
        const minX = Math.min(...poly.map((p) => p.x)),
          maxX = Math.max(...poly.map((p) => p.x)),
          minZ = Math.min(...poly.map((p) => p.z)),
          maxZ = Math.max(...poly.map((p) => p.z));
        let count = 0;
        for (let x = minX; x < maxX; x += 1.15)
          for (let z = minZ; z < maxZ; z += 1.25) {
            if (!this.contains({ x, z }, poly)) continue;
            const y = yAt(x, z) + 0.14,
              colour =
                ((Math.floor((x + z) * 0.12) % 7) + 7) % 7 < 2
                  ? "#bdc4b6"
                  : random() > 0.5
                    ? "#7c3e36"
                    : "#35624d";
            seatData.push({ x, y, z, yaw: Math.atan2(nx, nz), colour });
            if (random() > 0.28)
              crowdData.push({
                x,
                y: y + 0.42,
                z,
                yaw: 0,
                colour: ["#dad9c5", "#3c5963", "#a94d43", "#455348"][
                  Math.floor(random() * 4)
                ],
              });
            if (++count > 6500) break;
          }
        if (![377679562, 1315400018].includes(f.id)) {
          const roof = polygon(
            poly,
            m.roof,
            0,
            true,
            (x, z) =>
              rise + 3.0 + ((x - center.x) * nx + (z - center.z) * nz) * 0.035,
          );
          roof.castShadow = true;
          for (let i = 0; i < poly.length - 1; i += 2) {
            const p = poly[i];
            pole(env, [p.x, 0, p.z], [p.x, rise + 3, p.z], 0.14);
          }
        }
        for (let i = 0; i < poly.length - 1; i++) {
          const a = poly[i],
            b = poly[i + 1];
          pole(env, [a.x, rise + 1, a.z], [b.x, rise + 1, b.z], 0.04);
        }
        continue;
      }
      if (f.kind !== "building") continue;
      if (
        this.reference().points.some(
          (p, i) => i % 5 === 0 && this.contains({ x: p[0], z: p[1] }, poly),
        )
      ) {
        G.v3Stats.omittedRaceCorridor =
          (G.v3Stats.omittedRaceCorridor || 0) + 1;
        continue;
      }
      G.v3Stats.buildings++;
      const h =
          Number.parseFloat(f.height) ||
          Number.parseFloat(f.levels) * 3.1 ||
          5 + (f.id % 7) * 1.1,
        body = polygon(
          poly,
          f.name === "Paddock" ? paddock : facades[f.id % 3],
          h,
        );
      body.castShadow = near.distance < 140;
      body.userData.cameraObstacle = true;
      buildings.push(poly);
      G.v3Obstacles.push(body);
      const roof = polygon(poly, m.roof, 0, true, () => h + 0.1);
      roof.castShadow = near.distance < 140;
      for (let i = 0; i < poly.length - 1; i++) {
        const a = poly[i],
          b = poly[i + 1],
          dx = b.x - a.x,
          dz = b.z - a.z,
          len = Math.hypot(dx, dz);
        if (len < 5) continue;
        const tx = dx / len,
          tz = dz / len,
          mid = { x: (a.x + b.x) / 2, z: (a.z + b.z) / 2 },
          front = this.nearest(mid),
          normal = { x: front.x - mid.x, z: front.z - mid.z },
          sign = Math.sign(-tz * normal.x + tx * normal.z) || 1;
        for (let d = 2; d < len - 1; d += 3.4)
          for (let level = 2.6; level < h - 0.7; level += 3.1) {
            const x = a.x + tx * d - tz * 0.04 * sign,
              z = a.z + tz * d + tx * 0.04 * sign,
              o = box(env, x, level, z, 2.1, 1.25, 0.055, m.glass, false);
            o.rotation.y = Math.atan2(tx, tz) + Math.PI / 2;
          }
        if (f.name === "Paddock" && front.distance < 85) {
          for (let d = 3; d < len - 2; d += 7.2) {
            const x = a.x + tx * d - tz * 0.09 * sign,
              z = a.z + tz * d + tx * 0.09 * sign,
              o = box(env, x, 1.7, z, 6.1, 3.3, 0.07, m.black, false);
            o.rotation.y = Math.atan2(tx, tz) + Math.PI / 2;
            const header = box(
              env,
              x,
              3.65,
              z,
              6.1,
              0.22,
              0.09,
              m.green,
              false,
            );
            header.rotation.y = o.rotation.y;
          }
        }
      }
    }
    // Source tree locations are used; crowns, heights and species are illustrative.
    for (const tree of MEXICO_VENUE.trees) {
      const p = this.geo(tree.coordinate),
        near = this.nearest(p);
      if (
        near.distance < 21 ||
        near.distance > 320 ||
        buildings.some((poly) => this.contains(p, poly))
      )
        continue;
      treeData.push({
        ...p,
        y: 0,
        scale: 0.8 + random() * 0.65,
        yaw: random() * 6.28,
      });
    }
    G.v3Stats.trees = treeData.length;
    // Temporary race-week seating fills each complex, without claiming surveyed positions.
    for (const c of st.H.corners) {
      if (![1, 3, 4, 6, 8, 10, 12].includes(Number(c.n))) continue;
      const u =
          (((S.registration.phase + S.registration.dir * c.r) % 1) + 1) % 1,
        f = this.frame(u),
        side = Number(c.n) % 2 ? -1 : 1,
        x = f.x + f.rx * side * 42,
        z = f.z + f.rz * side * 42;
      if (
        source.some(
          (s) =>
            ["grandstand", "building"].includes(s.kind) &&
            this.contains({ x, z }, s.poly),
        )
      )
        continue;
      const yaw = Math.atan2(-f.rz, f.rx),
        corners = [
          [-7, -21],
          [-7, 21],
          [10, -21],
          [10, 21],
          [0, 0],
        ].map(([a, b]) => ({
          x: x + Math.cos(yaw) * a + Math.sin(yaw) * b,
          z: z - Math.sin(yaw) * a + Math.cos(yaw) * b,
        }));
      if (corners.some((p) => this.nearest(p).distance < 23)) continue;
      const group = new T.Group();
      group.position.set(x, 0, z);
      group.rotation.y = Math.atan2(-f.rz, f.rx);
      env.add(group);
      for (let row = 0; row < 7; row++) {
        const offset = side * row * 0.8;
        box(
          group,
          offset,
          1 + row * 0.65,
          0,
          1.0,
          0.45,
          38,
          [m.green, m.white, m.red][Math.floor(row / 3)],
          false,
        );
        for (let col = 0; col < 30; col++) {
          const local = new T.Vector3(offset, 1.5 + row * 0.65, -18 + col * 1.2)
            .applyAxisAngle(new T.Vector3(0, 1, 0), group.rotation.y)
            .add(group.position);
          crowdData.push({
            x: local.x,
            y: local.y,
            z: local.z,
            colour: random() > 0.5 ? "#c8caba" : "#365763",
            yaw: 0,
          });
        }
      }
      box(group, side * 3.5, 7.4, 0, 12, 0.14, 40, m.roof);
      for (const end of [-17, 17])
        box(group, side * 6, 3.5, end, 0.18, 7, 0.18, m.steel);
    }
    const fenceVerts = [];
    for (const { points } of boundaries) {
      let gap = 0;
      for (let i = 0; i < points.length - 1; i++) {
        const a = points[i],
          b = points[i + 1],
          len = Math.hypot(b.x - a.x, b.z - a.z),
          at = (p, y) => [p.x, y, p.z];
        gap += len;
        if (gap > 7) {
          fenceData.push({ x: a.x, y: 1.7, z: a.z, yaw: 0 });
          gap = 0;
        }
        for (const y of [1.4, 2.1, 2.8, 3.4])
          fenceVerts.push(...at(a, y), ...at(b, y));
        if (i % 2 === 0) fenceVerts.push(...at(a, 1), ...at(b, 3.4));
      }
    }
    const fenceG = new T.BufferGeometry();
    fenceG.setAttribute(
      "position",
      new T.Float32BufferAttribute(fenceVerts, 3),
    );
    env.add(
      new T.LineSegments(
        fenceG,
        new T.LineBasicMaterial({
          color: "#657775",
          transparent: true,
          opacity: 0.42,
        }),
      ),
    );
    function instances(
      name,
      data,
      geometry,
      material,
      scale = [1, 1, 1],
      detail = false,
    ) {
      const byCell = new Map();
      for (const p of data) {
        const key = Math.floor(p.x / 160) + ":" + Math.floor(p.z / 160);
        if (!byCell.has(key)) byCell.set(key, []);
        byCell.get(key).push(p);
      }
      for (const list of byCell.values()) {
        for (let i = list.length - 1; i > 0; i--) {
          const j = Math.floor(random() * (i + 1));
          [list[i], list[j]] = [list[j], list[i]];
        }
        const o = new T.InstancedMesh(geometry, material, list.length),
          dummy = new T.Object3D();
        list.forEach((p, i) => {
          dummy.position.set(p.x, p.y, p.z);
          dummy.rotation.set(0, p.yaw || 0, 0);
          dummy.scale.set(...scale);
          dummy.scale.multiplyScalar(p.scale || 1);
          dummy.updateMatrix();
          o.setMatrixAt(i, dummy.matrix);
          if (p.colour) o.setColorAt(i, new T.Color(p.colour));
        });
        o.name = name;
        o.userData.detail = detail;
        o.userData.fullCount = list.length;
        o.receiveShadow = true;
        o.castShadow = name === "Trees";
        o.computeBoundingSphere();
        env.add(o);
        G.v3Instances.push(o);
      }
    }
    instances(
      "Seats",
      seatData,
      new T.BoxGeometry(0.64, 0.22, 0.58),
      m.white,
      [1, 1, 1],
      true,
    );
    instances(
      "Crowd",
      crowdData,
      new T.CapsuleGeometry(0.17, 0.35, 1, 4),
      m.white,
      [1, 1, 1],
      true,
    );
    G.v3Stats.seats = seatData.length;
    instances(
      "Fence posts",
      fenceData,
      new T.CylinderGeometry(0.035, 0.055, 3.4, 5),
      m.steel,
    );
    const treeGeom = new T.SphereGeometry(2.9, 16, 12),
      pos = treeGeom.attributes.position;
    for (let i = 0; i < pos.count; i++) {
      const k = 0.88 + random() * 0.25;
      pos.setXYZ(i, pos.getX(i) * k, pos.getY(i) * k, pos.getZ(i) * k);
    }
    treeGeom.computeVertexNormals();
    instances(
      "Trees",
      treeData.map((p) => ({ ...p, y: 5.5 * p.scale })),
      treeGeom,
      m.leaves,
      [1, 1.3, 1],
    );
    instances(
      "Trunks",
      treeData.map((p) => ({ ...p, y: 2 * p.scale })),
      new T.CylinderGeometry(0.22, 0.38, 4, 6),
      m.trunk,
    );
    // Original signage, gantry and grid across the start/finish straight, not copied sponsor marks.
    const signCache = new Map();
    function sign(text, u, side = 1, wide = 10) {
      const f = MexicoV3.frame(u),
        off =
          frames[Math.min(2151, Math.floor((((u % 1) + 1) % 1) * 2152))].wall +
          0.08,
        p = { x: f.x + f.rx * side * off, z: f.z + f.rz * side * off };
      let tex = signCache.get(text);
      if (!tex) {
        const c = document.createElement("canvas");
        c.width = 1024;
        c.height = 160;
        const g = c.getContext("2d");
        g.fillStyle = "#154638";
        g.fillRect(0, 0, 1024, 160);
        g.fillStyle = "#eef0da";
        g.font = "bold 70px sans-serif";
        g.textAlign = "center";
        g.textBaseline = "middle";
        g.fillText(text, 512, 82);
        tex = new T.CanvasTexture(c);
        tex.colorSpace = T.SRGBColorSpace;
        signCache.set(text, tex);
      }
      const o = mesh(
        new T.PlaneGeometry(wide, 1.3),
        new T.MeshStandardMaterial({
          map: tex,
          side: T.DoubleSide,
          roughness: 0.8,
        }),
      );
      o.position.set(p.x, 1.65, p.z);
      o.rotation.y = Math.atan2(-f.rx * side, -f.rz * side);
    }
    for (let i = 0; i < 48; i++)
      sign(
        ["MÉXICO", "TUR DÜELLOSU", "GHOST LAP"][i % 3],
        i / 48,
        i % 2 ? 1 : -1,
        12,
      );
    for (const c of st.H.corners) {
      for (const d of [150, 100, 50]) {
        if (+c.n % 3 !== 1) continue;
        const u =
          (((S.registration.phase + S.registration.dir * (c.r - d / 4304)) %
            1) +
            1) %
          1;
        sign(String(d), u, -1, 1.2);
      }
    }
    const start = this.frame(S.registration.phase),
      group = new T.Group();
    group.position.set(start.x, 0, start.z);
    group.rotation.y = Math.atan2(-start.rz, start.rx);
    env.add(group);
    for (const side of [-1, 1])
      box(group, side * 11, 3.3, 0, 0.35, 6.6, 0.5, m.steel);
    box(group, 0, 6.5, 0, 22, 1.5, 0.55, m.green);
    for (let i = -4; i <= 4; i++)
      box(
        group,
        i * 0.35,
        5.8,
        0.3,
        0.16,
        0.16,
        0.12,
        i < 0 ? m.red : m.black,
        false,
      );
    for (let row = 0; row < 26; row++) {
      const f = this.frame(
        S.registration.phase - (S.registration.dir * row * 8) / 4304,
      );
      for (const side of [-1, 1]) {
        const base = [f.x + f.rx * side * 3.2, 0.05, f.z + f.rz * side * 3.2];
        const o = box(
          env,
          base[0],
          base[1],
          base[2],
          1.9,
          0.012,
          0.08,
          m.white,
          false,
        );
        o.rotation.y = Math.atan2(-f.rz, f.rx);
      }
    }
    // Batched rubbering on the whole racing surface; decorative, not measured wheel traces.
    const rubberVerts = [];
    for (let i = 0; i < frames.length - 1; i++) {
      const a = frames[i],
        b = frames[i + 1],
        bend = Math.abs(a.fx * b.fz - a.fz * b.fx);
      if (bend < 0.006) continue;
      for (const side of [-1, 1]) {
        const off = side * 0.8;
        rubberVerts.push(
          ...edge(a, off, 0.028),
          ...edge(b, off, 0.028),
          ...edge(b, off + 0.18, 0.028),
          ...edge(a, off, 0.028),
          ...edge(b, off + 0.18, 0.028),
          ...edge(a, off + 0.18, 0.028),
        );
      }
    }
    const rg = new T.BufferGeometry();
    rg.setAttribute("position", new T.Float32BufferAttribute(rubberVerts, 3));
    rg.computeVertexNormals();
    mesh(
      rg,
      new T.MeshBasicMaterial({
        color: "#101518",
        transparent: true,
        opacity: 0.19,
        depthWrite: false,
        polygonOffset: true,
        polygonOffsetFactor: -1,
      }),
      G.world,
    );
    G.mergeStats = ghostMergeMeshes(env, T, 160);
    G.tiles = [];
    env.traverse((o) => {
      if (o.userData.environmentTile) G.tiles.push(o);
    });
    G.detailStats = {
      before: seatData.length + crowdData.length,
      after: G.v3Instances.length,
    };
    // Obstacles are taken from surviving merged geometry, never removed source meshes.
    G.v3Obstacles = G.tiles.filter((o) => o.material !== m.leaves);
    G.v3Materials = m;
    return env;
  },
  update(G) {
    const quality = $("ghostRenderQuality").value,
      overview = ghost.camera === "overview";
    for (const o of G.v3Instances || []) {
      const distance = o.boundingSphere
        ? o.boundingSphere.center.distanceTo(G.camera.position)
        : 0;
      o.visible =
        !o.userData.detail || (quality !== "performance" && distance < 260);
      if (o.userData.detail)
        o.count = Math.max(
          1,
          Math.floor(
            o.userData.fullCount *
              (quality === "ultra" || o.name === "Seats" ? 1 : 0.6),
          ),
        );
      if (overview && o.userData.detail) o.visible = false;
    }
  },
};
