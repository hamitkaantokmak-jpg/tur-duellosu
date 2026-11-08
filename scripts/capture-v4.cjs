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
  out = args.out || "test-results/v4-captures";
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
  if (await page.evaluate(() => typeof MexicoV4 !== "undefined"))
    await page.waitForFunction(
      () =>
        VisualAssets.tree &&
        VisualAssets.treeAtlas &&
        ghost3d.v4Stats?.prefabs.KIT_PhotoTree > 0,
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
  const shots = [
    {
      id: "01-start-finish",
      title: "Start / finish ve pit yolu",
      time: 1.1,
      view: "chase",
    },
    {
      id: "02-turns-1-3",
      title: "1–3 viraj kompleksi",
      corner: 2,
      distance: 135,
      yaw: 2.5,
      pitch: 0.65,
    },
    {
      id: "03-turns-4-6",
      title: "4–6 viraj kompleksi",
      corner: 5,
      distance: 125,
      yaw: 1.1,
      pitch: 0.65,
    },
    {
      id: "04-turns-7-11",
      title: "7–11 hızlı bölüm",
      corner: 9,
      distance: 150,
      yaw: 2.1,
      pitch: 0.7,
    },
    {
      id: "05-stadium",
      title: "T12 yaklaşımı ve T13–16 stadyum",
      corner: 14,
      distance: 185,
      yaw: 0.9,
      pitch: 0.8,
    },
    {
      id: "06-car-closeup",
      title: "Araç yakın çekimi",
      time: 56,
      distance: 5.4,
      yaw: 1.8,
      pitch: 0.22,
      offset: 0.45,
    },
    {
      id: "07-ghost-comparison",
      title: "İki araç karşılaştırması",
      time: 54,
      distance: 38,
      yaw: 2.8,
      pitch: 0.5,
      pair: true,
    },
    {
      id: "08-overview",
      title: "Tam pist genel görünümü",
      view: "overview",
      time: 30,
    },
  ];
  const metadata = [];
  for (const shot of shots.filter((s) => !args.only || args.only.split(",").includes(s.id))) {
    const info = await page.evaluate((s) => {
      stopPlay();
      GhostDirector.transition = null;
      ghost.cameraState = null;
      ghostOrbit.target = null;
      const c = st.H.corners.find((c) => Number(c.n) === s.corner),
        time = s.time ?? lerp(st.A.t, c.r * (st.A.t.length - 1));
      st.play.e = time;
      const poses = ghostReplayPoses(ghostBuild(), time),
        pose = poses[0],
        focus = s.pair
          ? {
              x: (poses[0].x + poses[1].x) / 2,
              z: (poses[0].z + poses[1].z) / 2,
            }
          : pose;
      if (s.view === "chase") ghost.camera = "a";
      else if (s.view === "overview") ghost.camera = "overview";
      else {
        ghost.camera = "free";
        ghostOrbit.target = [focus.x, s.offset || 0, focus.z];
        ghostOrbit.distance = s.distance;
        ghostOrbit.yaw = s.yaw;
        ghostOrbit.pitch = s.pitch;
      }
      drawAll();
      return {
        time,
        pose,
        delta: lerp(st.delta, positions().ka),
        render: [ghost3d.canvas.width, ghost3d.canvas.height],
        camera: ghost3d.camera.position.toArray(),
        target: ghost.cameraState.target,
        stats: ghost3d.v3Stats || null,
        v4: ghost3d.v4Stats || null,
        assetErrors: VisualAssets.errors,
      };
    }, shot);
    await page.locator(".ghost-stage").screenshot({
      path: path.join(out, shot.id + ".jpg"),
      type: "jpeg",
      quality: 90,
      timeout: 120000,
    });
    metadata.push({ ...shot, ...info });
    console.log(shot.id, JSON.stringify(info));
  }
  const previous =
    args.only && fs.existsSync(path.join(out, "captures.json"))
      ? JSON.parse(fs.readFileSync(path.join(out, "captures.json")))
      : null;
  if (previous)
    metadata.splice(
      0,
      metadata.length,
      ...previous.shots.map((s) => metadata.find((m) => m.id === s.id) || s),
    );
  fs.writeFileSync(
    path.join(out, "captures.json"),
    JSON.stringify(
      {
        date: new Date().toISOString(),
        renderer: "SwiftShader",
        profile: "ultra",
        adaptive: false,
        ao: false,
        errors,
        shots: metadata,
      },
      null,
      2,
    ),
  );
  await browser.close();
  if (errors.length) throw Error(errors.join("; "));
})();
