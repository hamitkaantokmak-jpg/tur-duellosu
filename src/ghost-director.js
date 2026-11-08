const GhostDirector = {
  transition: null,
  raf: 0,
  lastMode: null,
  switch(mode) {
    const previous = ghost.cameraState;
    ghost.camera = mode;
    this.transition = previous
      ? {
          camera: previous.camera.slice(),
          target: previous.target.slice(),
          start: performance.now(),
        }
      : null;
    this.lastMode = mode;
    cancelAnimationFrame(this.raf);
    drawAll();
  },
  blend(camera, target) {
    const t = this.transition;
    if (!t) return { camera, target };
    const u = Math.min(1, (performance.now() - t.start) / 550),
      ease = u * u * (3 - 2 * u);
    const result = {
      camera: camera.map((v, i) => t.camera[i] + (v - t.camera[i]) * ease),
      target: target.map((v, i) => t.target[i] + (v - t.target[i]) * ease),
    };
    if (u >= 1) this.transition = null;
    else if (!st.play.on) {
      cancelAnimationFrame(this.raf);
      this.raf = requestAnimationFrame(() => {
        if (ghost.active) drawAll();
      });
    }
    return result;
  },
  effects: null,
  effectsPending: false,
  async prepareEffects() {
    if (this.effects || this.effectsPending || !ghost3d.ready) return;
    this.effectsPending = true;
    try {
      const [{ EffectComposer }, { RenderPass }, { SSAOPass }, { OutputPass }] =
        await Promise.all([
          import("three/addons/postprocessing/EffectComposer.js"),
          import("three/addons/postprocessing/RenderPass.js"),
          import("three/addons/postprocessing/SSAOPass.js"),
          import("three/addons/postprocessing/OutputPass.js"),
        ]);
      const G = ghost3d,
        composer = new EffectComposer(G.renderer),
        render = new RenderPass(G.scene, G.camera),
        ao = new SSAOPass(G.scene, G.camera, G.width, G.height),
        output = new OutputPass();
      ao.kernelRadius = 4;
      ao.minDistance = 0.003;
      ao.maxDistance = 0.12;
      composer.addPass(render);
      composer.addPass(ao);
      composer.addPass(output);
      this.effects = { composer, ao, render, output };
      if (ghost.active) drawAll();
    } catch (e) {
      console.warn("AO kullanılamadı", e);
      $("ghostAO").checked = false;
    } finally {
      this.effectsPending = false;
    }
  },
  render() {
    const G = ghost3d,
      active = $("ghostAO").checked && G.quality === "ultra";
    if (active && !this.effects) this.prepareEffects();
    if (active && this.effects) {
      const ratio = G.renderer.getPixelRatio();
      if (
        this.effects.ratio !== ratio ||
        this.effects.width !== G.width ||
        this.effects.height !== G.height
      ) {
        this.effects.composer.setPixelRatio(ratio);
        this.effects.composer.setSize(G.width, G.height);
        Object.assign(this.effects, {
          ratio,
          width: G.width,
          height: G.height,
        });
      }
      this.effects.composer.render();
    } else G.renderer.render(G.scene, G.camera);
  },
  dispose() {
    cancelAnimationFrame(this.raf);
    if (this.effects) {
      this.effects.composer.dispose();
      for (const p of [
        this.effects.ao,
        this.effects.render,
        this.effects.output,
      ])
        p.dispose?.();
      this.effects = null;
    }
  },
};
// Disjoint queries report GPU execution, not requestAnimationFrame scheduling or CPU time.
const GhostMetrics = {
  samples: [],
  gpuMs: null,
  pending: [],
  query: null,
  ext: null,
  gl: null,
  cpuMs: 0,
  init(renderer) {
    this.gl = renderer.getContext();
    this.ext = this.gl.getExtension("EXT_disjoint_timer_query_webgl2");
  },
  begin() {
    if (!this.ext || this.query || this.pending.length > 3) return;
    const gl = this.gl;
    this.query = gl.createQuery();
    gl.beginQuery(this.ext.TIME_ELAPSED_EXT, this.query);
  },
  end() {
    if (!this.query) return;
    this.gl.endQuery(this.ext.TIME_ELAPSED_EXT);
    this.pending.push(this.query);
    this.query = null;
  },
  poll() {
    if (!this.ext) return;
    const gl = this.gl;
    const disjoint = gl.getParameter(this.ext.GPU_DISJOINT_EXT);
    for (let i = this.pending.length - 1; i >= 0; i--) {
      const q = this.pending[i];
      if (gl.getQueryParameter(q, gl.QUERY_RESULT_AVAILABLE)) {
        if (!disjoint)
          this.gpuMs = gl.getQueryParameter(q, gl.QUERY_RESULT) / 1e6;
        gl.deleteQuery(q);
        this.pending.splice(i, 1);
      }
    }
    if (disjoint) this.gpuMs = null;
  },
  record(ms) {
    this.samples.push(ms);
    if (this.samples.length > 600) this.samples.shift();
  },
  summary() {
    const a = this.samples.slice().sort((a, b) => a - b);
    return {
      frames: a.length,
      p50: a.length ? a[Math.floor(a.length * 0.5)] : null,
      p95: a.length ? a[Math.floor(a.length * 0.95)] : null,
    };
  },
  export() {
    const G = ghost3d,
      gl = G.renderer.getContext(),
      debug = gl.getExtension("WEBGL_debug_renderer_info");
    const report = {
      timestamp: new Date().toISOString(),
      event: st.H.event,
      drivers: [st.A, st.B].map((L) => st.H.drivers[L.meta.d].c),
      profile: G.quality,
      adaptive: $("ghostAdaptive").checked,
      cssResolution: [G.width, G.height],
      renderResolution: [G.canvas.width, G.canvas.height],
      devicePixelRatio,
      renderer: debug
        ? gl.getParameter(debug.UNMASKED_RENDERER_WEBGL)
        : gl.getParameter(gl.RENDERER),
      fps: G.measuredFps,
      cpuRenderMs: this.cpuMs,
      gpuMs: this.gpuMs,
      ...this.summary(),
      drawCalls: G.renderer.info.render.calls,
      triangles: G.renderer.info.render.triangles,
      resources: { ...G.renderer.info.memory },
      assets: VisualAssets.state,
      registration: st.A.source.stationInfo,
    };
    report.registration = report.registration
      ? {
          valid: report.registration.valid,
          rmse: report.registration.rmse,
          maxOffset: report.registration.maxOffset,
        }
      : null;
    const blob = new Blob([JSON.stringify(report, null, 2)], {
        type: "application/json",
      }),
      url = URL.createObjectURL(blob),
      a = document.createElement("a");
    a.href = url;
    a.download = "tur-duellosu-performans.json";
    a.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
    return report;
  },
  dispose() {
    if (this.query) {
      this.gl.endQuery(this.ext.TIME_ELAPSED_EXT);
      this.gl.deleteQuery(this.query);
    }
    for (const q of this.pending) this.gl.deleteQuery(q);
    this.pending = [];
    this.query = null;
  },
};
