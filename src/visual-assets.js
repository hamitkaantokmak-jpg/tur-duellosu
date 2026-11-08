/* Asset ownership is centralized: templates/textures survive lap changes, disposed on page exit. */
const VisualAssets = {
  state: "idle",
  errors: [],
  templates: {},
  textures: {},
  async prepare(T, renderer) {
    if (this.promise) return this.promise;
    this.state = "loading";
    this.promise = (async () => {
      const [
        { GLTFLoader },
        { MeshoptDecoder },
        { HDRLoader },
        { KTX2Loader },
        { Sky },
      ] = await Promise.all([
        import("three/addons/loaders/GLTFLoader.js"),
        import("three/addons/libs/meshopt_decoder.module.js"),
        import("three/addons/loaders/HDRLoader.js"),
        import("three/addons/loaders/KTX2Loader.js"),
        import("three/addons/objects/Sky.js"),
      ]);
      const ktx = new KTX2Loader()
        .setTranscoderPath(
          "https://cdn.jsdelivr.net/npm/three@0.180.0/examples/jsm/libs/basis/",
        )
        .detectSupport(renderer);
      this.ktx = ktx;
      const loader = new GLTFLoader()
        .setMeshoptDecoder(MeshoptDecoder)
        .setKTX2Loader(ktx);
      this.loader = loader;
      this.Sky = Sky;
      const carbonCanvas=document.createElement('canvas');carbonCanvas.width=carbonCanvas.height=64;const cg=carbonCanvas.getContext('2d');for(let y=0;y<64;y++)for(let x=0;x<64;x++){const phase=(Math.floor(x/4)+Math.floor(y/4))%2,k=(phase?54:28)+(phase?x%4:y%4)*3;cg.fillStyle='rgb('+k+','+(k+2)+','+(k+3)+')';cg.fillRect(x,y,1,1);}const weave=new T.CanvasTexture(carbonCanvas);weave.wrapS=weave.wrapT=T.RepeatWrapping;weave.repeat.set(24,24);weave.colorSpace=T.SRGBColorSpace;weave.userData.sharedAsset=true;this.textures.carbon=weave;
      const textureLoader = new T.TextureLoader();
      const maps = [
        ["color", "asphalt-color"],
        ["normal", "asphalt-normal"],
        ["roughness", "asphalt-roughness"],
      ];
      await Promise.allSettled([
        ...["low", "medium"].map(async (level) => {
          try {
            const gltf = await loader.loadAsync(
              "assets/cars/open-wheel-" + level + ".glb",
            );
            this.templates[level] = gltf.scene;
          } catch (e) {
            this.errors.push(level + ": " + e.message);
          }
        }),
        ...maps.map(async ([key, name]) => {
          try {
            let texture;
            try {
              texture = await ktx.loadAsync(
                "assets/materials/" + name + ".ktx2",
              );
              texture.userData.format = "KTX2";
            } catch {
              texture = await textureLoader.loadAsync(
                "assets/materials/" + name + ".jpg",
              );
              texture.userData.format = "JPEG";
            }
            texture.wrapS = texture.wrapT = T.RepeatWrapping;
            texture.repeat.set(1, 1);
            if (key === "color") texture.colorSpace = T.SRGBColorSpace;
            texture.anisotropy = Math.min(
              8,
              renderer.capabilities.getMaxAnisotropy(),
            );
            this.textures[key] = texture;
          } catch (e) {
            this.errors.push(key + ": " + e.message);
          }
        }),
        (async () => {
          try {
            const hdr = await new HDRLoader().loadAsync(
              "assets/environment/spruit-sunrise.hdr",
            );
            const pmrem = new T.PMREMGenerator(renderer);
            this.environment = pmrem.fromEquirectangular(hdr);
            hdr.dispose();
            pmrem.dispose();
          } catch (e) {
            this.errors.push("HDRI: " + e.message);
          }
        })(),
      ]);
      this.state =
        this.templates.medium && this.templates.low ? "ready" : "fallback";
      return this;
    })().catch((e) => {
      this.errors.push(e.message);
      this.state = "fallback";
      return this;
    });
    return this.promise;
  },
  async high() {
    if (this.templates.high || this.highPending || !this.loader) return;
    this.highPending = true;
    try {
      this.templates.high = (
        await this.loader.loadAsync("assets/cars/open-wheel-high.glb")
      ).scene;
    } catch (e) {
      this.errors.push("high: " + e.message);
    } finally {
      this.highPending = false;
      ghost3d.assetVersion = (ghost3d.assetVersion || 0) + 1;
      if (ghost.active) drawAll();
    }
  },
  instantiate(T, color) {
    if (!this.templates.medium || !this.templates.low) return null;
    const root = new T.Group(),
      levels = {},
      wheels = [],
      steers = [];
    for (const name of ["high", "medium", "low"]) {
      const template = this.templates[name] || this.templates.medium,
        clone = template.clone(true);
      clone.name = "LOD_" + name;
      const materials = new Map();
      clone.traverse((o) => {
        if (o.isMesh) {
          o.userData.sharedAsset = true;
          o.castShadow = true;
          o.receiveShadow = true;
          if (!materials.has(o.material)) {
            const m = o.material.clone();
            if (m.name === "Paint") m.color.set("#879295").lerp(new T.Color(color),.06);
            if (m.name === "Accent") m.color.set(color);
            if(m.name === "TyreStripe")m.color.set("#ce4245");
            if(m.name === "Carbon"&&this.textures.carbon)m.map=this.textures.carbon;
            materials.set(o.material, m);
          }
          o.material = materials.get(o.material);
        }
        if (o.name.startsWith("Wheel_")) wheels.push(o);
        if (o.name.startsWith("Steer_F")) steers.push(o);
      });
      root.add(clone);
      levels[name] = clone;
    }
    root.userData = { wheels, steers, levels, asset: true };
    return root;
  },
  dispose() {
    const geometries = new Set(),
      materials = new Set();
    for (const template of Object.values(this.templates))
      template.traverse((o) => {
        if (o.geometry) geometries.add(o.geometry);
        if (o.material) materials.add(o.material);
      });
    geometries.forEach((g) => g.dispose());
    materials.forEach((m) => m.dispose());
    Object.values(this.textures).forEach((t) => t.dispose());
    this.environment?.dispose();
    this.ktx?.dispose();
    this.templates = {};
  },
};
