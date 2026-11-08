/* Pure replay and circuit registration functions, shared with Node regression tests. */
(function (root) {
  const clamp = (x, a, b) => Math.max(a, Math.min(b, x));
  function at(keys, values, x) {
    let lo = 0,
      hi = keys.length - 1;
    if (x <= keys[0]) return values[0];
    if (x >= keys[hi]) return values[hi];
    while (hi - lo > 1) {
      const m = (lo + hi) >> 1;
      if (keys[m] <= x) lo = m;
      else hi = m;
    }
    return (
      values[lo] +
      ((values[hi] - values[lo]) * (x - keys[lo])) / (keys[hi] - keys[lo] || 1)
    );
  }
  function advance(elapsed, last, now, rate, end) {
    return clamp(elapsed + (Math.max(0, now - last) / 1000) * rate, 0, end);
  }
  function changeRate(state, rate, now, end) {
    return {
      elapsed: advance(state.elapsed, state.last, now, state.rate, end),
      last: now,
      rate,
    };
  }
  function circuit(coordinates, declaredLength) {
    const lon = coordinates[0][0],
      lat = coordinates[0][1],
      cos = Math.cos((lat * Math.PI) / 180);
    const points = coordinates.map(([x, y]) => ({
      x: (x - lon) * 111320 * cos,
      z: -(y - lat) * 111320,
    }));
    if (Math.hypot(points.at(-1).x, points.at(-1).z) > 0.01)
      points.push({ ...points[0] });
    const arc = [0];
    for (let i = 1; i < points.length; i++)
      arc.push(
        arc.at(-1) +
          Math.hypot(
            points[i].x - points[i - 1].x,
            points[i].z - points[i - 1].z,
          ),
      );
    const scale = declaredLength / arc.at(-1);
    points.forEach((p) => {
      p.x *= scale;
      p.z *= scale;
    });
    const distances = arc.map((v) => v * scale),
      xs = points.map((p) => p.x),
      zs = points.map((p) => p.z);
    function sample(u) {
      const d = (((u % 1) + 1) % 1) * declaredLength;
      return { x: at(distances, xs, d), z: at(distances, zs, d) };
    }
    return { points, distances, length: declaredLength, sample };
  }
  function transform(f, x, y) {
    const z = y * f.flip;
    return { x: f.a * x - f.b * z + f.tx, z: f.b * x + f.a * z + f.tz };
  }
  function register(p, model) {
    const samples = Array.from({ length: 48 }, (_, i) => {
      const u = i / 48;
      return { x: at(p.rel, p.x, u), z: at(p.rel, p.y, u), u };
    });
    const mean = samples.reduce(
      (a, p) => ({ x: a.x + p.x / 48, z: a.z + p.z / 48 }),
      { x: 0, z: 0 },
    );
    let best = null;
    function fit(phase, dir, flip) {
      const targets = samples.map((p) => model.sample(phase + dir * p.u)),
        center = targets.reduce(
          (a, p) => ({ x: a.x + p.x / 48, z: a.z + p.z / 48 }),
          { x: 0, z: 0 },
        );
      let c = 0,
        s = 0,
        den = 0;
      samples.forEach((p, i) => {
        const x = p.x - mean.x,
          z = (p.z - mean.z) * flip,
          rx = targets[i].x - center.x,
          rz = targets[i].z - center.z;
        c += x * rx + z * rz;
        s += x * rz - z * rx;
        den += x * x + z * z;
      });
      const a = c / den,
        b = s / den,
        f = {
          a,
          b,
          flip,
          dir,
          phase,
          tx: center.x - a * mean.x + b * mean.z * flip,
          tz: center.z - b * mean.x - a * mean.z * flip,
        };
      f.rmse = Math.sqrt(
        samples.reduce((sum, p, i) => {
          const q = transform(f, p.x, p.z);
          return sum + (q.x - targets[i].x) ** 2 + (q.z - targets[i].z) ** 2;
        }, 0) / 48,
      );
      return f;
    }
    for (const dir of [1, -1])
      for (const flip of [1, -1])
        for (let i = 0; i < 512; i++) {
          const f = fit(i / 512, dir, flip);
          if (!best || f.rmse < best.rmse) best = f;
        }
    const initial = best;
    for (let i = -16; i <= 16; i++) {
      const f = fit(initial.phase + i / 8192, initial.dir, initial.flip);
      if (f.rmse < best.rmse) best = f;
    }
    return best;
  }
  function stations(p, model, f) {
    const values = [],
      errors = [];
    let start = null,
      last = 0,
      reversals = 0;
    p.rel.forEach((u, i) => {
      const q = transform(f, p.x[i], p.y[i]),
        expected = (f.phase + f.dir * u) * model.length;
      let best = null;
      for (let j = 0; j < model.points.length - 1; j++) {
        const a = model.points[j],
          b = model.points[j + 1],
          dx = b.x - a.x,
          dz = b.z - a.z,
          t = clamp(
            ((q.x - a.x) * dx + (q.z - a.z) * dz) / (dx * dx + dz * dz || 1),
            0,
            1,
          ),
          d =
            model.distances[j] +
            t * (model.distances[j + 1] - model.distances[j]);
        const unwrapped =
            d + Math.round((expected - d) / model.length) * model.length,
          e = (q.x - a.x - t * dx) ** 2 + (q.z - a.z - t * dz) ** 2,
          score = e + 0.002 * (unwrapped - expected) ** 2;
        if (!best || score < best.score) best = { score, d: unwrapped, e };
      }
      if (start === null) start = best.d;
      const v = f.dir * (best.d - start);
      if (v < last - 12) reversals++;
      last = Math.max(last, v);
      values.push(last);
      errors.push(Math.sqrt(best.e));
    });
    const span = values.at(-1),
      valid =
        f.rmse < 40 &&
        span > model.length * 0.94 &&
        span < model.length * 1.06 &&
        reversals / values.length < 0.03;
    return {
      rel: valid ? Float64Array.from(values, (v) => v / span) : p.rel,
      valid,
      rmse: f.rmse,
      maxOffset: Math.max(...errors),
      reversals,
      span,
    };
  }
  function distanceAt(p, time, total) {
    return at(p.t, p.rel, clamp(time / total, 0, 1) * p.t.at(-1)) * p.len;
  }
  const api = {
    at,
    advance,
    changeRate,
    circuit,
    register,
    stations,
    transform,
    distanceAt,
  };
  root.ReplayCore = api;
  if (typeof module !== "undefined") module.exports = api;
})(typeof globalThis !== "undefined" ? globalThis : this);
