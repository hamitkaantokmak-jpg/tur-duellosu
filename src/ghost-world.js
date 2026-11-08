function ghostResolution(w, h, profile) {
  const G = ghost3d,
    cap = Math.min(devicePixelRatio || 1, profile.ratio),
    ratio = $("ghostAdaptive").checked
      ? (G.pendingRatio ?? Math.min(G.adaptiveScale || cap, cap))
      : cap;
  if (Math.abs(G.renderer.getPixelRatio() - ratio) > 0.01) {
    G.renderer.setPixelRatio(ratio);
    G.renderer.setSize(w, h, false);
  }
  G.adaptiveScale = ratio;
  G.pendingRatio = null;
}
function ghostDisposeCar(root) {
  const geometries = new Set(),
    materials = new Set();
  root.traverse((o) => {
    if (o.geometry && !o.userData.sharedAsset) geometries.add(o.geometry);
    if (o.material) materials.add(o.material);
  });
  geometries.forEach((g) => g.dispose());
  materials.forEach((m) => m.dispose());
}
function ghostApplyAssets(S) {
  if(typeof MexicoV4!=="undefined")MexicoV4.apply(ghost3d,S);
  const G = ghost3d,
    T = G.T;
  if (VisualAssets.state === "idle" || VisualAssets.state === "loading") return;
  if (G.assetApplied !== G.assetVersion && VisualAssets.state === "ready") {
    const replacements = [COL.a, COL.b].map((c) =>
      VisualAssets.instantiate(T, c),
    );
    if (replacements.every(Boolean)) {
      G.cars.forEach((car) => {
        car.removeFromParent();
        ghostDisposeCar(car);
      });
      G.cars = replacements;
      G.cars.forEach((c) => G.world.add(c));
      G.transparent = null;
      G.assetApplied = G.assetVersion;
    }
  }
  if (
    VisualAssets.textures.color &&
    G.roadMaterial.map !== VisualAssets.textures.color
  ) {
    for (const texture of Object.values(VisualAssets.textures))
      texture.userData.sharedAsset = true;
    Object.assign(G.roadMaterial, {
      map: VisualAssets.textures.color,
      normalMap:
        $("ghostRenderQuality").value === "performance"
          ? null
          : VisualAssets.textures.normal || null,
      roughnessMap:
        $("ghostRenderQuality").value === "performance"
          ? null
          : VisualAssets.textures.roughness || null,
      bumpMap: null,
      roughness: 0.94,
    });
    G.roadMaterial.color.set("#c2c7cb");
    G.roadMaterial.normalScale.set(0.09, 0.09);
    G.roadMaterial.needsUpdate = true;
  }
  if (
    VisualAssets.environment &&
    G.scene.environment !== VisualAssets.environment.texture
  ) {
    G.scene.environment = VisualAssets.environment.texture;
    G.scene.environmentIntensity = 0.6;
    G.lightTarget?.dispose();
    G.lightTarget = null;
  }
  if(VisualAssets.background){G.scene.background=VisualAssets.background;G.scene.backgroundIntensity=.65;G.scene.backgroundBlurriness=.025;if(G.sky)G.sky.visible=false;}
  if (!VisualAssets.background && VisualAssets.Sky && !G.sky) {
    G.sky = new VisualAssets.Sky();
    G.sky.scale.setScalar(7000);
    G.sky.material.depthWrite = false;
    const u = G.sky.material.uniforms;
    u.turbidity.value = 3;
    u.rayleigh.value = 1.8;
    u.mieCoefficient.value = 0.004;
    u.mieDirectionalG.value = 0.8;
    u.sunPosition.value.set(-100, 65, -70);
    G.scene.add(G.sky);
  }
  if (G.sky)
    G.sky.position.set((S.minX + S.maxX) / 2, 0, (S.minZ + S.maxZ) / 2);
  if (!G.carShadows) {
    const c = document.createElement("canvas");
    c.width = 64;
    c.height = 128;
    const ctx = c.getContext("2d");
    ctx.scale(1, 2);
    const grad = ctx.createRadialGradient(32, 32, 3, 32, 32, 31);
    grad.addColorStop(0, "rgba(0,0,0,.48)");
    grad.addColorStop(0.45, "rgba(0,0,0,.24)");
    grad.addColorStop(1, "rgba(0,0,0,0)");
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, 64, 64);
    const texture = new T.CanvasTexture(c);
    G.carShadows = [0, 1].map((i) => {
      const m = new T.Mesh(
        new T.PlaneGeometry(2.6, 5.7),
        new T.MeshBasicMaterial({
          map: texture,
          transparent: true,
          depthWrite: false,
          opacity: i ? 0.3 : 0.8,
        }),
      );
      m.rotation.x = -Math.PI / 2;
      m.renderOrder = 1;
      G.world.add(m);
      return m;
    });
  }
}
function ghostLandmarks(S, environment, box, mesh, material, heightAt, T) {
  if (!S.profile.mexico) return;
  const concrete = material("#adafa6"),
    glass = material("#243b45", 0.22, 0.65),
    steel = material("#48575d", 0.5, 0.6),
    red = material("#923d38"),
    white = material("#d6d6c7"),
    green = material("#3b6d5d");
  function frame(k, offset) {
    const e = (S.canonicalEdges || S.edges)[k],
      g = new T.Group();
    g.position.set(e.p.x + e.rx * offset, heightAt(k), e.p.z + e.rz * offset);
    g.rotation.y = Math.atan2(-e.rz, e.rx);
    environment.add(g);
    return g;
  }
  const start = frame(2, -43);
  box(start, 0, 5, 0, 16, 10, 110, concrete);
  box(start, 0, 10.8, 0, 20, 0.35, 115, white);
  box(start, 8.1, 7.2, 0, 0.07, 3.1, 102, glass);
  box(start, 9.4, 4.4, 0, 4, 0.18, 112, steel);
  for (let z = -48; z <= 48; z += 8) {
    box(start, 8.1, 1.8, z, 0.07, 3.2, 6.2, steel);
    box(start, 8.2, 3.6, z, 0.1, 0.2, 6.4, red);
  }
  box(start, 0, 16, -40, 12, 12, 15, glass);
  box(start, 0, 22.2, -40, 15, 0.4, 18, white);
  // A stylized stadium bowl at the geographic stadium section, not surveyed architecture.
  const e = S.track ? S.track.sample(0.81) : S.edges[Math.round(S.n * 0.8)].p,
    center = { x: e.x + 55, z: e.z - 10 };
  for (let j = 0; j < 28; j++) {
    const angle = -0.1 + (j / 27) * Math.PI * 1.55;
    for (let row = 0; row < 8; row++) {
      const radius = 44 + row * 1.35,
        x = center.x + Math.cos(angle) * radius,
        z = center.z + Math.sin(angle) * radius;
      if (S.edges.some((a) => Math.hypot(a.p.x - x, a.p.z - z) < 21)) continue;
      const stand = new T.Group();
      stand.position.set(x, 0, z);
      stand.rotation.y = -angle;
      environment.add(stand);
      box(
        stand,
        0,
        1.6 + row * 0.8,
        0,
        1.6,
        0.65,
        5.2,
        [red, white, green][Math.floor(row / 3) % 3],
      );
      if (row === 7) box(stand, 0, 10.4, 0, 8, 0.15, 5.4, white);
    }
  }
  const marks = [],
    p = (e, o, y) => [e.p.x + e.rx * o, y + (e.height || 0), e.p.z + e.rz * o];
  for (
    let i = 1;
    i < Math.min(S.n - 1, Math.ceil((250 / st.H.L) * (S.n - 1)));
    i += 2
  ) {
    const a = S.edges[i],
      b = S.edges[i + 1];
    for (const sign of [-1, 1]) {
      const x = sign * 3;
      marks.push(
        ...p(a, x, 0.065),
        ...p(b, x, 0.065),
        ...p(b, x + 0.09, 0.065),
        ...p(a, x, 0.065),
        ...p(b, x + 0.09, 0.065),
        ...p(a, x + 0.09, 0.065),
      );
    }
  }
  if (marks.length) {
    const geo = new T.BufferGeometry();
    geo.setAttribute("position", new T.Float32BufferAttribute(marks, 3));
    geo.computeVertexNormals();
    mesh(geo, white, environment).castShadow = false;
  }
}
document.addEventListener("keydown", (e) => {
  if (
    !ghost.active ||
    ghost.camera !== "free" ||
    /INPUT|SELECT|TEXTAREA|BUTTON/.test(e.target.tagName) ||
    !ghostOrbit.target
  )
    return;
  const key = e.key.toLowerCase();
  if (!["w", "a", "s", "d", "r"].includes(key)) return;
  e.preventDefault();
  GhostDirector.transition = null;
  if (key === "r") {
    ghostOrbit.target = null;
    ghost.cameraState = null;
    ghostOrbit.distance = 65;
    ghostOrbit.pitch = 0.55;
  } else {
    const forward = key === "w" ? -1 : key === "s" ? 1 : 0,
      side = key === "a" ? -1 : key === "d" ? 1 : 0,
      step = ghostOrbit.distance * 0.035;
    ghostOrbit.target[0] +=
      (Math.cos(ghostOrbit.yaw) * side + Math.sin(ghostOrbit.yaw) * forward) *
      step;
    ghostOrbit.target[2] +=
      (Math.cos(ghostOrbit.yaw) * forward - Math.sin(ghostOrbit.yaw) * side) *
      step;
  }
  drawAll();
});

function ghostAvoidObstacles(camera, target) {
  const G = ghost3d;
  if (!G.ready || !G.world || G.source!==st.A) return camera;
  const T = G.T;
  if (!G.cameraRay) G.cameraRay = new T.Raycaster();
  if (!G.cameraOrigin) G.cameraOrigin = new T.Vector3();
  if (!G.cameraDirection) G.cameraDirection = new T.Vector3();
  const origin = G.cameraOrigin.set(...target),
    dir = G.cameraDirection.set(...camera).sub(origin),
    distance = dir.length();
  G.cameraRay.set(origin, dir.normalize());
  G.cameraRay.near = 1.5;
  G.cameraRay.far = distance;
  const objects = (G.environment.visible ? G.tiles || [] : []).filter(
    (o) => o.visible && o.material.name !== "Vegetation",
  );
  G.world.children.forEach((o) => {
    if (o.userData.cameraObstacle) objects.push(o);
  });
  objects.push(...(G.v4Obstacles||[]).filter(o=>o.visible));
  const hit = G.cameraRay.intersectObjects(objects, false)[0];
  if (!hit) return camera;
  // Keep the lens on the target side of a wall, including close obstructions.
  const d = Math.max(0.6, hit.distance - 0.7);
  return [origin.x + dir.x * d, origin.y + dir.y * d, origin.z + dir.z * d];
}

// Sweep the free camera lens along its actual movement, so pan/orbit/zoom cannot tunnel through visible walls.
// Its look target may be anywhere; collision is tested from the previous safe lens, not from that target.
function ghostConstrainFree(camera, previous) {
  const G=ghost3d;if(!G.ready||!G.world||G.source!==st.A||!previous)return camera;
  const T=G.T,from=new T.Vector3(...previous),to=new T.Vector3(...camera);to.y=Math.max(.65,to.y);
  const direction=to.clone().sub(from),distance=direction.length();if(distance<1e-5)return to.toArray();
  const objects=(G.environment.visible?G.tiles||[]:[]).filter(o=>o.visible&&o.material.name!=='Vegetation');
  G.world.children.forEach(o=>{if(o.userData.cameraObstacle)objects.push(o);});objects.push(...(G.v4Obstacles||[]).filter(o=>o.visible));
  const ray=G.movementRay||(G.movementRay=new T.Raycaster());ray.set(from,direction.normalize());ray.near=.02;ray.far=distance+.3;
  const hit=ray.intersectObjects(objects,false)[0];return hit?from.addScaledVector(direction,Math.max(0,Math.min(distance,hit.distance-.3))).toArray():to.toArray();
}
