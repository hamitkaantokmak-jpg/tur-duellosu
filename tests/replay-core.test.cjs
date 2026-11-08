const test = require("node:test"),
  assert = require("node:assert/strict"),
  fs = require("node:fs");
const C = require("../src/replay-core.js");
const feature = JSON.parse(
    fs.readFileSync("assets/tracks/mexico.geojson", "utf8"),
  ).features[0],
  model = C.circuit(feature.geometry.coordinates, feature.properties.length);
test("all rates keep wall-clock time across sparse, irregular and dropped frames", () => {
  for (const rate of [0.25, 0.5, 1, 2, 4])
    for (const frames of [
      [0, 16, 32, 48, 1000],
      [0, 1000],
      [0, 200, 450, 460, 1000],
    ]) {
      let e = 0;
      for (let i = 1; i < frames.length; i++)
        e = C.advance(e, frames[i - 1], frames[i], rate, 200);
      assert.ok(Math.abs(e - rate) < 1e-10);
    }
});
test("clock clamps end and negative timestamps without losing a positive stall", () => {
  assert.equal(C.advance(75, 0, 5000, 4, 76), 76);
  assert.equal(C.advance(5, 1000, 500, 1, 76), 5);
  assert.equal(C.advance(0, 0, 10000, 1, 76), 10);
});
test("fixed geographic circuit is closed and has declared station length", () => {
  assert.equal(model.length, 4304);
  assert.deepEqual(model.sample(0), model.sample(1));
  assert.deepEqual(model.sample(-0.25), model.sample(0.75));
});
// Synthetic geometry fixtures verify coordinate registration only; never used by the application as telemetry.
function fixture() {
  const p = { rel: [], x: [], y: [], t: [], len: 4320 };
  for (let i = 0; i <= 500; i++) {
    const u = i / 500,
      q = model.sample(0.071 + u);
    p.rel.push(u);
    p.x.push((q.x - 130) * 8);
    p.y.push(-(q.z + 70) * 8);
    p.t.push(u * 80);
  }
  return p;
}
test("registration recovers independent units, handedness and start station", () => {
  const p = fixture(),
    snapshot = JSON.stringify(p),
    fit = C.register(p, model),
    station = C.stations(p, model, fit);
  assert.ok(fit.rmse < 3, fit.rmse);
  assert.equal(station.valid, true);
  assert.equal(station.rel[0], 0);
  assert.equal(station.rel.at(-1), 1);
  for (let i = 1; i < station.rel.length; i++)
    assert.ok(station.rel[i] >= station.rel[i - 1]);
  assert.ok(Math.abs(station.rel[250] - 0.5) < 0.01);
  assert.equal(JSON.stringify(p), snapshot);
});
test("bad registration falls back explicitly instead of manufacturing a racing line", () => {
  const p = fixture();
  p.x = p.x.map((x, i) => x + Math.sin(i * 0.3) * 5000);
  const fit = C.register(p, model),
    station = C.stations(p, model, fit);
  assert.equal(station.valid, false);
  assert.equal(station.rel, p.rel);
});
test("wheel distance uses original telemetry distance rather than current speed times elapsed", () => {
  const p = { t: [0, 10, 20], rel: [0, 0.25, 1], len: 100 };
  assert.equal(C.distanceAt(p, 10, 20), 25);
  assert.equal(C.distanceAt(p, 100, 20), 100);
  assert.equal(C.distanceAt(p, -1, 20), 0);
});

test("changing speed accounts for the elapsed interval at the previous rate", () => {
  const next = C.changeRate({ elapsed: 0, last: 0, rate: 1 }, 4, 500, 200);
  assert.equal(next.elapsed, 0.5);
  assert.equal(C.advance(next.elapsed, next.last, 1000, next.rate, 200), 2.5);
});
