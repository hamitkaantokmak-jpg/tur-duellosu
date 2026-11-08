const { chromium } = require("@playwright/test");
const fs = require("node:fs");
const path = require("node:path");
const args = Object.fromEntries(
  process.argv.slice(2).map((x) => {
    const i = x.indexOf("=");
    return [x.slice(0, i), x.slice(i + 1)];
  }),
);
const base = args.url || "http://127.0.0.1:4173",
  out = args.out || "test-results/v3-captures";
fs.mkdirSync(out, { recursive: true });
(async () => {
  const browser = await chromium.launch({
    executablePath: process.env.CHROMIUM_PATH || "/usr/bin/chromium",
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
  const page = await browser.newPage({
    viewport: { width: 2000, height: 1400 },
    deviceScaleFactor: 1,
  });
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
      ghost3d.cars[0].userData.asset,
    null,
    { timeout: 120000 },
  );
  await page.locator("#ghostRenderQuality").selectOption("ultra");
  await page.waitForFunction(() => !!VisualAssets.templates.high, null, {
    timeout: 120000,
  });
  await page.locator("#ghostAdaptive").uncheck();
  if (await page.locator("#ghostGuides").isChecked())
    await page.locator("#ghostGuides").uncheck();
  await page.evaluate(() => {
    const wrap = document.querySelector(".wrap");
    Object.assign(wrap.style, {
      maxWidth: "none",
      width: "1920px",
      padding: "0",
      margin: "0",
    });
    const stage = document.querySelector(".ghost-stage");
    stage.style.width = "1920px";
    $("ghostCanvas").style.height = "1080px";
    $("ghostCanvas").style.width = "1920px";
    ghost3d.canvas.style.width = "1920px";
    ghost3d.canvas.style.height = "1080px";
    drawAll();
  });
  // Force a true 1080p render for all three profiles; the shipping performance cap is .85.
  const measurements = [];
  for (const profile of ["performance", "balanced", "ultra"]) {
    await page.evaluate((p) => {
      stopPlay();
      GHOST_QUALITY[p].ratio = 1;
      ghost.camera = "a";
      GhostDirector.transition = null;
      ghost.cameraState = null;
      st.play.e = 30;
      $("ghostRenderQuality").value = p;
      drawAll();
      GhostMetrics.samples = [];
      ghost3d.fpsStamp = 0;
      startPlay();
    }, profile);
    const started = Date.now();
    await page.waitForTimeout(20000);
    const result = await page.evaluate(() => {
      stopPlay();
      const gl = ghost3d.renderer.getContext(),
        debug = gl.getExtension("WEBGL_debug_renderer_info");
      return {
        profile: ghost3d.quality,
        adaptive: $("ghostAdaptive").checked,
        render: [ghost3d.canvas.width, ghost3d.canvas.height],
        ...GhostMetrics.summary(),
        fps: ghost3d.measuredFps,
        cpuMs: GhostMetrics.cpuMs,
        gpuMs: GhostMetrics.gpuMs,
        calls: ghost3d.renderer.info.render.calls,
        triangles: ghost3d.renderer.info.render.triangles,
        memory: ghost3d.renderer.info.memory,
        renderer: debug
          ? gl.getParameter(debug.UNMASKED_RENDERER_WEBGL)
          : gl.getParameter(gl.RENDERER),
      };
    });
    result.wallSeconds = (Date.now() - started) / 1000;
    measurements.push(result);
    console.log(JSON.stringify(result));
  }
  fs.writeFileSync(
    path.join(out, "1080p-software.json"),
    JSON.stringify(
      {
        date: new Date().toISOString(),
        note: "20-second requested samples, forced DPR1/native1080p, adaptive off, real telemetry. Short software-only observation, not a physical GPU benchmark or a full lap per profile.",
        errors,
        measurements,
      },
      null,
      2,
    ),
  );
  await browser.close();
  if (errors.length) throw Error(errors.join("; "));
})();
