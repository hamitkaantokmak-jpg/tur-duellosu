const { test, expect } = require("@playwright/test");
const url = "/#y=2024&e=Mexico%20City%20Grand%20Prix&k=Q&a=HAM&b=RUS&lab=duel";
async function ready(page) {
  await page.goto(url);
  await page.waitForFunction(
    () =>
      typeof InsightLab !== "undefined" && InsightLab.pair && InsightLab.report,
    null,
    { timeout: 90000 },
  );
  await expect(page.locator("#insightStudio")).toBeVisible();
}
async function tab(page, id) {
  await page.locator(`#studioTab-${id}`).click();
}
test("real telemetry powers the studio, exact region sums, theories, filtering and chart navigation", async ({
  page,
}, info) => {
  const errors = [];
  page.on("pageerror", (e) => errors.push(e.message));
  await ready(page);
  const data = await page.evaluate(() => ({
    gain: InsightLab.report.gain,
    sum: InsightLab.report.bins.reduce((a, b) => a + b.gain, 0),
    corners: InsightLab.report.windows.length,
    top: InsightLab.report.top.length,
    webgl: ghost3d.ready,
  }));
  expect(data.gain).toBeCloseTo(-0.295, 2);
  expect(data.sum).toBeCloseTo(data.gain, 7);
  expect(data.corners).toBeGreaterThan(15);
  expect(data.top).toBe(3);
  expect(data.webgl).toBe(false);
  await expect(page.locator("#studioBody")).toContainText("Farkın haritası");
  await page.locator("#studioQuestion input").fill("HAM nerede hızlıydı?");
  await page.locator("#studioQuestion button").click();
  await expect(page.locator("#studioAnswer")).toContainText("HAM");
  await tab(page, "lab");
  await expect(page.locator("#studioBody")).toContainText(
    "Gerçek sektörlerden varsayımsal ideal tur",
  );
  await page.locator("#studioFilters [name=compound]").check();
  await page.locator("#studioFilters button").click();
  expect(await page.evaluate(() => InsightLab.filters.compound)).toBe(true);
  await page.selectOption("#studioTheory", "minimum");
  await expect(page.locator("#studioBody")).toContainText(
    "Minimum hızı yüksek olan",
  );
  const exact = await page.evaluate(async () => {
    document.getElementById("filterPhase").checked = true;
    const a = st.A.meta,
      b = st.H.bestLap.find(
        (l) => l && l.d !== a.d && !l.x && !comparisonMatches(a, l),
      );
    if (!b) throw Error("No real pair rejected by the phase filter");
    await InsightLab.usePair(a.i, b.i);
    return {
      blocked: !comparisonMatches(a, b),
      wanted: b.i,
      actual: st.B.meta.i,
      kept: document.getElementById("filterPhase").checked,
    };
  });
  expect(exact.blocked).toBe(true);
  expect(exact.actual).toBe(exact.wanted);
  expect(exact.kept).toBe(true);
  await tab(page, "archive");
  await expect(page.locator("#studioBody")).toContainText("Takım arkadaşı");
  await expect(page.locator("#studioBody")).toContainText("Nerede benziyorlar");
  await page.locator("#studioRankMetric").selectOption("brake");
  expect(await page.evaluate(() => InsightLab.rankMetric)).toBe("brake");
  await tab(page, "duel");
  await page.locator("[data-studio=focus]").first().click();
  await expect(page.locator("#insightStudio")).toBeHidden();
  await expect(page.locator("#chartcard")).toBeVisible();
  expect(await page.evaluate(() => st.zoom[1] - st.zoom[0])).toBeLessThan(1);
  await page.locator("#studioToggle").click();
  await tab(page, "overview");
  await page.screenshot({
    path: info.outputPath("studio-overview.png"),
    fullPage: true,
  });
  await page.setViewportSize({ width: 390, height: 844 });
  await expect(page.locator("#insightStudio")).toBeVisible();
  expect(
    await page.evaluate(() => document.documentElement.scrollWidth),
  ).toBeLessThanOrEqual(391);
  expect(errors).toEqual([]);
});
test("notes preserve spaces, safe imports, downloadable context and round-trip shared URLs", async ({
  page,
}, info) => {
  const errors = [];
  page.on("pageerror", (e) => errors.push(e.message));
  await ready(page);
  await tab(page, "notes");
  await page.locator("#studioNote [name=title]").fill("T1 giriş analizi");
  await page
    .locator("#studioNote [name=note]")
    .pressSequentially("Fren ve gaz birlikte okunur.");
  await expect(page.locator("#studioNote [name=note]")).toHaveValue(
    "Fren ve gaz birlikte okunur.",
  );
  await page.locator("#studioNote [name=start]").fill("5");
  await page.locator("#studioNote [name=end]").fill("12");
  await page
    .locator("#studioNote button[type=submit], #studioNote button:not([type])")
    .first()
    .click();
  await expect(page.locator("#studioStatus")).toContainText("kaydedildi");
  const download = page.waitForEvent("download");
  await page.locator("[data-studio=download]").click();
  expect((await download).suggestedFilename()).toBe(
    "tur-duellosu-inceleme.json",
  );
  await page.evaluate(() => {
    Object.defineProperty(navigator, "clipboard", {
      configurable: true,
      value: { writeText: async (text) => (window.testStudyLink = text) },
    });
  });
  await page.locator("[data-studio=share]").click();
  const link = await page.evaluate(() => window.testStudyLink);
  expect(link).toContain("study=");
  await page.goto(link);
  await page.waitForFunction(
    () =>
      typeof InsightLab !== "undefined" &&
      InsightLab.incomingApplied &&
      InsightLab.pair,
    null,
    { timeout: 90000 },
  );
  await expect(page.locator("#studioNote [name=note]")).toHaveValue(
    "Fren ve gaz birlikte okunur.",
  );
  expect(await page.evaluate(() => InsightLab.range)).toEqual([0.05, 0.12]);
  const study = await page.evaluate(() => ({
    ...InsightLab.study(),
    title: '<img src=x onerror="window.pwned=1">',
    note: "<script>window.pwned=1</script>",
  }));
  await page.locator("#studioImport").setInputFiles({
    name: "study.json",
    mimeType: "application/json",
    buffer: Buffer.from(JSON.stringify(study)),
  });
  await expect(page.locator("#studioNote [name=title]")).toHaveValue(
    study.title,
  );
  expect(await page.evaluate(() => window.pwned)).toBeUndefined();
  await page.locator("#studioImport").setInputFiles({
    name: "bad.json",
    mimeType: "application/json",
    buffer: Buffer.from("{}"),
  });
  await expect(page.locator("#studioStatus")).toContainText("geçersiz");
  expect(errors).toEqual([]);
});
test("real race metadata powers tempo, pit coverage, position leadups, phases and weekend dossier", async ({
  page,
}) => {
  const errors = [];
  page.on("pageerror", (e) => errors.push(e.message));
  await ready(page);
  await tab(page, "race");
  await page.locator("[data-studio=race]").click();
  await page.waitForFunction(() => !!InsightLab.currentRace, null, {
    timeout: 90000,
  });
  await expect(page.locator("#studioBody")).toContainText(
    "Yakın takip göstergesi",
  );
  await expect(page.locator("#studioBody")).toContainText(
    "Stratejinin dönüm noktaları",
  );
  await expect(page.locator("#studioBody")).toContainText(
    "En tutarlı temiz tur dizileri",
  );
  await page.locator("#studioExcludeNear").check();
  expect(await page.evaluate(() => InsightLab.excludeNear)).toBe(true);
  const result = await page.evaluate(() => ({
    drivers: InsightLab.currentRace.report.drivers.length,
    max: InsightLab.currentRace.report.maxLap,
    events: InsightLab.currentRace.report.events.length,
    source: st.H.kind,
  }));
  expect(result.drivers).toBeGreaterThan(15);
  expect(result.max).toBeGreaterThan(60);
  expect(result.events).toBeGreaterThan(15);
  expect(result.source).toBe("Q");
  await page.locator("#studioPit [name=loss]").fill("20");
  await page.locator("#studioPit button").click();
  await expect(page.locator("#studioBody")).toContainText("Kapsam");
  await tab(page, "overview");
  await page.locator("[data-studio=weekend]").click();
  await page.waitForFunction(() => InsightLab.remote.weekend?.ok, null, {
    timeout: 90000,
  });
  expect(
    await page.evaluate(
      () =>
        !!InsightLab.remote.weekend.result.qual &&
        !!InsightLab.remote.weekend.result.race,
    ),
  ).toBe(true);
  expect(errors).toEqual([]);
});
test("multi-lap signatures, third driver and another year load actual archive telemetry", async ({
  page,
}) => {
  test.setTimeout(240000);
  const errors = [];
  page.on("pageerror", (e) => errors.push(e.message));
  await ready(page);
  await tab(page, "drivers");
  await page.locator("[data-studio=multi]").click();
  await page.waitForFunction(() => !!InsightLab.remote.multi, null, {
    timeout: 120000,
  });
  const multi = await page.evaluate(() => InsightLab.remote.multi);
  expect(multi.ok).toBe(true);
  expect(multi.result.every((x) => x.loaded > 0 && x.loaded <= 5)).toBe(true);
  await page.locator("#studioThird button").click();
  await page.waitForFunction(() => !!InsightLab.remote.third, null, {
    timeout: 90000,
  });
  expect(await page.evaluate(() => InsightLab.remote.third.ok)).toBe(true);
  await page.locator("#studioYear [name=year]").selectOption("2023");
  await page.locator("#studioYear button").click();
  await page.waitForFunction(() => !!InsightLab.remote.year, null, {
    timeout: 90000,
  });
  expect(await page.evaluate(() => InsightLab.remote.year.ok)).toBe(true);
  await expect(page.locator("#studioBody")).toContainText(
    "normalize tur ilerlemesinde",
  );
  expect(errors).toEqual([]);
});
test("missing secondary archive files produce recoverable state rather than invented results", async ({
  page,
}) => {
  await page.route("**/Mexico%20City%20Grand%20Prix/Race/**", (r) => r.abort());
  await ready(page);
  await tab(page, "race");
  await page.locator("[data-studio=race]").click();
  await page.waitForFunction(() => !!InsightLab.remote.race);
  expect(await page.evaluate(() => InsightLab.remote.race.ok)).toBe(false);
  await expect(page.locator("[role=alert]")).toBeVisible();
  expect(await page.evaluate(() => st.H.kind)).toBe("Q");
});

test("initial archive failure can be retried inside the studio without hidden old results", async ({
  page,
}) => {
  const pattern = "**/Mexico%20City%20Grand%20Prix/Qualifying/drivers.json";
  await page.route(pattern, (r) => r.abort());
  await page.goto(url);
  await expect(page.locator("#studioBody [role=alert]")).toContainText(
    "Oturum yüklenemedi",
  );
  await page.unroute(pattern);
  await page.locator("[data-studio=retry-session]").click();
  await page.waitForFunction(
    () => InsightLab.pair && InsightLab.report && !InsightLab.sessionError,
    null,
    { timeout: 90000 },
  );
  await expect(page.locator("#studioBody")).toContainText("Farkın haritası");
});
test("late secondary data cannot replace a newly selected session", async ({
  page,
}) => {
  await ready(page);
  let release;
  const gate = new Promise((r) => (release = r));
  await page.route(
    "**/Mexico%20City%20Grand%20Prix/Race/drivers.json",
    async (r) => {
      await gate;
      await r.continue();
    },
  );
  await tab(page, "race");
  await page.locator("[data-studio=race]").click();
  await page.waitForFunction(() => InsightLab.pending.race);
  await page.locator("#event").selectOption("Monaco Grand Prix");
  await page.waitForFunction(
    () =>
      st.H?.event === "Monaco Grand Prix" &&
      InsightLab.pair &&
      !InsightLab.loading,
    null,
    { timeout: 90000 },
  );
  release();
  await page.waitForTimeout(600);
  expect(await page.evaluate(() => !!InsightLab.remote.race)).toBe(false);
  await expect(page.locator("#studioMeta")).toContainText("Monako");
});
