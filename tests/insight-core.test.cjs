const { test } = require("node:test"),
  assert = require("node:assert/strict"),
  C = require("../src/insight-core.js");
const series = (duration = 80) => ({
  t: Float64Array.from({ length: 101 }, (_, i) => (i / 100) * duration),
  v: Float64Array.from({ length: 101 }, (_, i) => 120 + Math.abs(i - 50) * 2),
  thr: Float64Array.from({ length: 101 }, (_, i) =>
    i < 50 ? 0 : i < 60 ? 50 : 100,
  ),
  brk: Float64Array.from({ length: 101 }, (_, i) =>
    i >= 35 && i <= 49 ? 1 : 0,
  ),
  gear: Float64Array.from({ length: 101 }, (_, i) => (i < 50 ? 4 : 5)),
  rpm: new Float64Array(101).fill(10000),
  quality: {},
  meta: { d: 0, t: duration * 1000 },
});
const lap = (n, t, s) => ({
  i: n,
  n,
  d: 0,
  t: t * 1000,
  s,
  c: "S",
  age: 2,
  started: 1000 + n * 100,
  q: "Q3",
  x: false,
  st: "1",
  session: "2024|Mexico|Q",
});
test("mini-sector and corner gains telescope to the measured whole-lap difference", () => {
  const a = series(80),
    b = series(81),
    r = C.duel(a, b, {
      length: 4000,
      corners: [
        { n: 1, r: 0.25 },
        { n: 2, r: 0.5 },
        { n: 3, r: 0.75 },
      ],
    });
  assert.ok(Math.abs(r.bins.reduce((s, w) => s + w.gain, 0) - 1) < 1e-10);
  assert.ok(Math.abs(r.windows.reduce((s, w) => s + w.gain, 0) - 1) < 1e-10);
  for (const w of r.windows)
    assert.ok(Math.abs(w.entry + w.exit - w.gain) < 1e-10);
  assert.equal(r.top.length, 3);
});
test("brake, minimum speed, gear and sustained full throttle are derived from real windows", () => {
  const r = C.duel(series(), series(), {
    length: 4000,
    corners: [{ n: 1, r: 0.5 }],
  });
  assert.equal(r.windows[0].a.brake, 0.35);
  assert.equal(r.windows[0].a.minimum.r, 0.5);
  assert.equal(r.windows[0].a.full, 0.6);
  assert.equal(r.windows[0].a.gear, 5);
});
test("missing or interpolated pedal channels do not become event points or zero statistics", () => {
  const a = series();
  a.quality = {
    brake: { missing: true },
    throttle: { filled: 2 },
    gear: { missing: true },
  };
  a.brk.fill(0);
  const m = C.duel(a, series(), { length: 4000, corners: [{ n: 1, r: 0.5 }] })
    .windows[0].a;
  assert.equal(m.brake, null);
  assert.equal(m.full, null);
  assert.equal(m.partial, null);
  assert.equal(m.gear, null);
  assert.equal(C.median([null, NaN, undefined]), null);
  const noTime = series();
  noTime.t.fill(NaN);
  assert.equal(C.duel(noTime, series()).gain, null);
});
test("matching rejects missing metadata and separates sessions, compound, age, phase and time", () => {
  const a = lap(1, 80, [25, 30, 25]),
    b = { ...a, age: null };
  assert.equal(C.compatible(a, b, { age: true }), false);
  assert.equal(C.compatible(a, { ...a, c: "U" }, { compound: true }), false);
  assert.equal(C.compatible(a, { ...a, q: null }, { phase: true }), false);
  assert.equal(C.compatible(a, { ...a, started: null }, { time: true }), false);
  assert.equal(C.compatible(a, { ...a, session: "2023|Mexico|Q" }), false);
  assert.equal(
    C.compatible(
      a,
      { ...a, age: 4, started: a.started + 800 },
      { age: true, time: true, minutes: 15 },
    ),
    true,
  );
  assert.equal(C.compatible({ ...a, x: true }, a, { clean: true }), false);
});
test("ideal sectors retain source laps and exclude deleted or incomplete sector sums", () => {
  const r = C.ideal([
    lap(1, 80, [25, 30, 25]),
    lap(2, 81, [24, 32, 25]),
    lap(3, 81, [26, 29, 26]),
    { ...lap(4, 70, [20, 25, 25]), x: true },
    lap(5, 80, [1, 2, 3]),
  ]);
  assert.equal(r.count, 3);
  assert.equal(r.time, 78);
  assert.equal(r.potential, 2);
  assert.deepEqual(
    r.sectors.map((s) => s.lap),
    [2, 3, 1],
  );
  assert.equal(C.ideal([lap(1, 80, [null, 30, 25])]), null);
});
test("unusual lap catalog finds lower speed trap combined with faster lap, never the inverse", () => {
  const drivers = [{ t: "T" }, { t: "T" }],
    a = { ...lap(1, 80, [25, 30, 25]), v: 310 },
    b = { ...lap(2, 81, [24, 31, 26]), d: 1, v: 320 };
  const r = C.catalog([a, b], drivers, { clean: true });
  assert.equal(r.traps.length, 1);
  assert.equal(r.reversals.length, 1);
  assert.equal(r.teammates.length, 1);
  assert.equal(C.catalog([{ ...a, v: null }, b], drivers).traps.length, 0);
});
const raceLap = (n, ts, t = 80, extra = {}) => ({
  n,
  ts,
  t,
  pin: null,
  pout: null,
  x: false,
  gen: false,
  st: "1",
  pos: 1,
  ...extra,
});
test("race pace excludes pit/flags and close-follow indicator uses finish timestamps only", () => {
  const a = Array.from({ length: 10 }, (_, i) => raceLap(i + 1, 1000 + i * 80)),
    b = a.map((l) => ({ ...l, ts: l.ts - 2, pos: 2 }));
  a[3].pin = 1;
  const r = C.race([a, b]);
  assert.equal(r.drivers[0].count, 8);
  assert.equal(r.drivers[0].near.length, 8);
  assert.equal(r.drivers[0].near[0].gap, 2);
  assert.equal(r.drivers[0].phase[0].count, 2);
  assert.equal(r.drivers[0].phase[0].pace, null);
});
test("pit scenario reports missing coverage rather than filling nonexistent drivers", () => {
  const a = [raceLap(1, 100), raceLap(2, 180)],
    b = [raceLap(1, 105), raceLap(2, 185)],
    c = [raceLap(1, null)];
  assert.equal(C.progressAt(c, 180), null);
  const p = C.pitWindow([a, b, c], 0, 1, 10);
  assert.equal(p.coverage, 1);
  assert.equal(p.total, 2);
  assert.equal(p.position, null);
  assert.equal(p.positionMin, 2);
  assert.equal(p.positionMax, 3);
  assert.equal(C.pitWindow([a, b], 0, 1, null), null);
  assert.equal(C.pitWindow([a, b], 0, 1, -1), null);
});
test("raw series does not invent unavailable channels or scale wildly mismatched lap times", () => {
  const p = {
    rel: [0, 0.5, 1],
    t: [0, 40, 80],
    v: [100, 120, 100],
    thr: [0, 50, 100],
    brk: [0, 1, 0],
    gear: [3, 4, 3],
    rpm: [9000, 10000, 9000],
    quality: { rpm: { missing: true } },
  };
  const a = C.rawSeries(p, { t: 81000 }, 5);
  assert.equal(a.total, 81);
  assert.ok([...a.rpm].every(Number.isNaN));
  assert.equal(C.rawSeries(p, { t: 100000 }, 5).total, 80);
});
test("study import enforces bounds and strips arbitrary untrusted fields", () => {
  const note = {
    version: 1,
    title: "<img onerror=alert(1)>",
    note: "Gözlem",
    range: [0.1, 0.2],
    channel: "v",
    context: {
      year: "2024",
      event: "Mexico City Grand Prix",
      kind: "Q",
      a: "HAM",
      b: "RUS",
      la: 7,
      lb: 9,
    },
    extra: "ignored",
  };
  assert.equal(C.validateStudy(note).extra, undefined);
  assert.throws(() => C.validateStudy({ ...note, range: [0.4, 0.2] }));
  assert.throws(() =>
    C.validateStudy({ ...note, context: { ...note.context, a: "<script>" } }),
  );
  assert.throws(() => C.validateStudy({ ...note, note: "a".repeat(1501) }));
});

test("near-finish exclusion changes pace samples without claiming full-lap traffic detection", () => {
  const a = Array.from({ length: 9 }, (_, i) => raceLap(i + 1, 1000 + i * 80)),
    b = a.map((l) => ({ ...l, ts: l.ts - 2 }));
  const r = C.race([a, b], [], [], { excludeNear: true });
  assert.equal(r.drivers[0].count, 0);
  assert.equal(r.drivers[0].pace, null);
  assert.equal(r.drivers[0].near.length, 8);
});
test("stable runs require five consecutive valid laps and position-change leadups retain actual sectors", () => {
  const a = Array.from({ length: 9 }, (_, i) =>
      raceLap(i + 1, 1000 + i * 80, 80, {
        pos: i < 6 ? 2 : 1,
        c: "M",
        s: [25, 30, 25],
        trap: 310,
      }),
    ),
    b = a.map((l) => ({
      ...l,
      ts: l.ts - 2,
      pos: l.n < 7 ? 1 : 2,
      s: [26, 29, 25],
      trap: 312,
    }));
  const r = C.race([a, b]);
  assert.equal(r.stable.length, 2);
  assert.equal(r.stable[0].count, 8);
  assert.equal(r.stable[0].mad, 0);
  const m = r.moves.find((x) => x.d === 0);
  assert.equal(m.lap, 7);
  assert.deepEqual(m.leadup[0].sectors, [1, -1, 0]);
  assert.equal(m.leadup[0].trapB, 312);
});

test("corner similarity rankings expose the selected metric and omit missing channels", () => {
  const a = series(),
    b = series();
  b.v[50] += 4;
  const r = C.duel(a, b, {
    length: 4000,
    corners: [
      { n: 1, r: 0.2 },
      { n: 2, r: 0.5 },
      { n: 3, r: 0.8 },
    ],
  });
  const ranking = C.cornerRanking(r, "minimum");
  assert.equal(ranking.count, 3);
  assert.ok(
    Math.abs(ranking.closest[0].difference) <=
      Math.abs(ranking.different[0].difference),
  );
  for (const w of r.windows) w.a.brake = null;
  assert.equal(C.cornerRanking(r, "brake").count, 0);
});

test("a brake block already active at the window boundary is not invented as a new onset", () => {
  const a = series();
  a.brk.fill(1);
  const r = C.duel(a, a, { length: 4000, corners: [{ n: 1, r: 0.5 }] });
  assert.equal(r.windows[0].a.brake, null);
});
