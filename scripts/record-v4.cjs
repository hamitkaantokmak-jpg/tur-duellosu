const { chromium } = require("@playwright/test");
const fs = require("node:fs");
const path = require("node:path");
const { execFileSync } = require("node:child_process");
const base = process.argv[2] || "http://127.0.0.1:4173",
  out = process.argv[3] || "docs/visual/v4";
fs.mkdirSync(out, { recursive: true });
(async () => {
  const browser = await chromium.launch({
    executablePath: "/usr/bin/chromium",
    args: [
      "--no-sandbox",
      "--use-angle=swiftshader",
      "--enable-unsafe-swiftshader",
      ...(process.env.CHROMIUM_PROXY_SPKI
        ? [
            "--ignore-certificate-errors-spki-list=" +
              process.env.CHROMIUM_PROXY_SPKI,
          ]
        : []),
    ],
  });
  const context = await browser.newContext({
    viewport: { width: 1280, height: 900 },
    recordVideo: {
      dir: "test-results/v4-video-raw",
      size: { width: 1280, height: 900 },
    },
  });
  const page = await context.newPage();
  const errors = [];
  page.on("pageerror", (e) => errors.push(e.message));
  await page.goto(
    base + "/#y=2024&e=Mexico%20City%20Grand%20Prix&k=Q&a=HAM&b=RUS&g=1",
  );
  await page.waitForFunction(
    () =>
      typeof ghost3d !== "undefined" &&
      ghost3d.ready &&
      VisualAssets.state === "ready" &&
      ghost3d.v4Stats,
    null,
    { timeout: 120000 },
  );
  await page.locator("#ghostRenderQuality").selectOption("balanced");
  await page.evaluate(() => {
    stopPlay();
    ghost.camera = "a";
    GhostDirector.transition = null;
    st.play.e = 10;
    st.play.rate = 1;
    drawAll();
  });
  await page.locator(".ghost-stage").scrollIntoViewIfNeeded();
  await page.waitForTimeout(1500);
  const samples = [];
  const begin = Date.now();
  await page.evaluate(() => {
    GhostMetrics.samples = [];
  });
  for (const mode of ["a", "cinematic", "tv", "compare"]) {
    await page.evaluate((mode) => {stopPlay();st.play.e=10;ghost.cameraState=null;GhostDirector.transition=null;GhostDirector.switch(mode);startPlay();}, mode);
    await page.waitForTimeout(5000);
    const sample = await page.evaluate(() => ({
      time: st.play.e,
      playing:st.play.on,chapterStart:10,
      mode: ghost.camera,
      ready: ghost3d.ready,
      render: [ghost3d.canvas.width, ghost3d.canvas.height],
      camera: ghost3d.camera.position.toArray(),
      target: ghost.cameraState.target,
      fps: ghost3d.measuredFps,
      gpu: GhostMetrics.gpuMs,
      summary: GhostMetrics.summary(),
      memory: ghost3d.renderer.info.memory,
      visibleLabels: ghost3d.labels.map((l) => !l.hidden),
    }));
    if(!sample.playing||sample.time<=10)throw new Error("Playback chapter did not advance while playing: "+mode);
    sample.wallSeconds = (Date.now() - begin) / 1000;
    samples.push(sample);
    await page
      .locator(".ghost-stage")
      .screenshot({
        path: path.join(out, "playback-" + mode + ".jpg"),
        type: "jpeg",
        quality: 85,
      });
  }
  const duration = (Date.now() - begin) / 1000;
  await page.evaluate(() => stopPlay());
  const video = page.video();
  await context.close();
  const raw = await video.path();
  await browser.close();
  // Trim only the loading section; video frame timing and all stalls remain unchanged.
  execFileSync(
    "ffmpeg",
    [
      "-y",
      "-sseof",
      String(-duration - 0.5),
      "-i",
      raw,
      "-t",
      String(duration),
      "-an",
      "-deadline","realtime","-cpu-used","6","-row-mt","1","-threads","2",
      "-c:v",
      "libvpx-vp9",
      "-crf",
      "36",
      "-b:v",
      "0",
      path.join(out, "playback.webm"),
    ],
    { stdio: "ignore" },
  );
  fs.writeFileSync(
    path.join(out, "playback.json"),
    JSON.stringify(
      {
        date: new Date().toISOString(),
        duration,
        profile: "balanced",
        adaptive: true,
        renderer: "SwiftShader",
        note: "Four actual wall-clock playback chapters, each restarted at telemetry t=10s with a different camera. Timeline resets are intentional test setup, not continuous lap footage. Video timing preserves software-renderer stalls. Not a smooth/physical-GPU performance claim. Loading was trimmed approximately; a short paused tail may remain. No timing interpolation or speedup.",
        errors,
        samples,
      },
      null,
      2,
    ),
  );
  if (errors.length) throw Error(errors.join("; "));
  console.log(
    "PLAYBACK_RECORDED",
    duration,
    samples.map((s) => [s.mode, s.time, s.render]),
  );
})();
