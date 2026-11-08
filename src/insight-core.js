/* Data-only analysis: positive interval gain means A was faster. No replay state is changed. */
const InsightCore = (() => {
  const finite = (x) => typeof x === "number" && Number.isFinite(x);
  const clamp = (x, a = 0, b = 1) => Math.max(a, Math.min(b, x));
  const median = (xs) => {
    const a = xs.filter(finite).sort((a, b) => a - b),
      n = a.length;
    return n ? (n % 2 ? a[n >> 1] : (a[n / 2 - 1] + a[n / 2]) / 2) : null;
  };
  const mean = (xs) => {
    const a = xs.filter(finite);
    return a.length ? a.reduce((x, y) => x + y, 0) / a.length : null;
  };
  function at(a, r) {
    if (!a?.length) return null;
    const k = clamp(r) * (a.length - 1),
      i = Math.floor(k),
      j = Math.min(a.length - 1, i + 1);
    if (!finite(a[i]) || !finite(a[j])) return null;
    return a[i] + (a[j] - a[i]) * (k - i);
  }
  function rawSeries(p, meta, count = 540, axis = p.rel) {
    if (!axis?.length || axis.length !== p.t.length)
      throw Error("Telemetri ekseni geçersiz");
    const out = { meta, quality: p.quality };
    let j = 0;
    const duration = p.t.at(-1),
      scale =
        finite(meta.t) &&
        duration > 0 &&
        Math.abs(meta.t / 1000 / duration - 1) < 0.03
          ? meta.t / 1000 / duration
          : 1;
    for (const key of ["t", "v", "thr", "brk", "gear", "rpm"])
      out[key] = new Float64Array(count).fill(NaN);
    const names = {
      thr: "throttle",
      brk: "brake",
      gear: "gear",
      rpm: "rpm",
      v: "speed",
      t: "time",
    };
    for (let i = 0; i < count; i++) {
      const r = i / (count - 1);
      while (j < axis.length - 2 && axis[j + 1] <= r) j++;
      const d = axis[j + 1] - axis[j],
        f = d > 0 ? clamp((r - axis[j]) / d) : 0;
      for (const key of Object.keys(names)) {
        if (p.quality?.[names[key]]?.missing) continue;
        const a = p[key];
        if (!a || !finite(a[j]) || !finite(a[j + 1])) continue;
        out[key][i] =
          key === "gear" || key === "brk"
            ? f < 0.5
              ? a[j]
              : a[j + 1]
            : a[j] + (a[j + 1] - a[j]) * f;
        if (key === "t") out[key][i] *= scale;
      }
    }
    out.total = out.t.at(-1);
    return out;
  }
  const delta = (a, b, r) => {
    const x = at(a.t, r),
      y = at(b.t, r);
    return finite(x) && finite(y) ? y - x : null;
  };
  function interval(a, b, start, end) {
    const da = delta(a, b, start),
      db = delta(a, b, end);
    return { start, end, gain: finite(da) && finite(db) ? db - da : null };
  }
  function cornerMetrics(series, start, anchor, end, length) {
    const n = series.v.length,
      lo = Math.max(
        Math.ceil(start * (n - 1)),
        Math.floor((anchor - 90 / length) * (n - 1)),
      ),
      hi = Math.min(
        Math.floor(end * (n - 1)),
        Math.ceil((anchor + 90 / length) * (n - 1)),
      );
    let k = null;
    for (let i = lo; i <= hi; i++)
      if (finite(series.v[i]) && (k === null || series.v[i] < series.v[k]))
        k = i;
    if (k === null)
      return {
        minimum: null,
        brake: null,
        full: null,
        gear: null,
        exit: null,
        partial: null,
      };
    const r = k / (n - 1),
      channel = (key) =>
        !series.quality?.[key]?.missing && !series.quality?.[key]?.filled;
    let brake = null,
      full = null;
    if (channel("brake")) {
      let i = k;
      while (i >= Math.ceil(start * (n - 1)) && series.brk[i] < 0.5) i--;
      if (i >= Math.ceil(start * (n - 1)) && finite(series.brk[i])) {
        while (i > Math.ceil(start * (n - 1)) && series.brk[i - 1] >= 0.5) i--;
        if (i > 0 && series.brk[i - 1] < 0.5) brake = i / (n - 1);
      }
    }
    if (channel("throttle"))
      for (let i = k; i < Math.floor(end * (n - 1)); i++)
        if (series.thr[i] >= 98 && series.thr[i + 1] >= 98) {
          full = i / (n - 1);
          break;
        }
    const gas = Array.from(channel("throttle") ? series.thr || [] : [])
      .slice(k, Math.floor(end * (n - 1)) + 1)
      .filter(finite);
    return {
      minimum: { speed: series.v[k], r },
      brake,
      full,
      gear:
        channel("gear") && finite(series.gear?.[k])
          ? Math.round(series.gear[k])
          : null,
      exit: at(series.v, end),
      partial: gas.length
        ? gas.filter((v) => v > 1 && v < 98).length / gas.length
        : null,
    };
  }
  function duel(a, b, { length, corners = [] } = {}) {
    length = finite(length) && length > 0 ? length : 4300;
    const bins = Array.from({ length: 24 }, (_, i) => ({
      ...interval(a, b, i / 24, (i + 1) / 24),
      id: i,
      label: `${Math.round((i * length) / 24)}–${Math.round(((i + 1) * length) / 24)} m`,
    }));
    const anchors = corners
      .filter((c) => finite(c.r) && c.r > 0 && c.r < 1)
      .slice()
      .sort((x, y) => x.r - y.r);
    const windows = anchors.map((c, i) => {
      const start = i ? (anchors[i - 1].r + c.r) / 2 : 0,
        end = i < anchors.length - 1 ? (c.r + anchors[i + 1].r) / 2 : 1;
      return {
        ...interval(a, b, start, end),
        id: i,
        label: `T${c.n}`,
        anchor: c.r,
        a: cornerMetrics(a, start, c.r, end, length),
        b: cornerMetrics(b, start, c.r, end, length),
        entry: interval(a, b, start, c.r).gain,
        exit: interval(a, b, c.r, end).gain,
      };
    });
    const top = bins
      .filter((x) => finite(x.gain))
      .slice()
      .sort((x, y) => Math.abs(y.gain) - Math.abs(x.gain))
      .slice(0, 3);
    const signature = (side) => {
      const data = windows.map((w) => w[side]);
      return {
        corners: data.length,
        brake: median(
          data
            .filter((x) => x.minimum && x.brake !== null)
            .map((x) => (x.minimum.r - x.brake) * length),
        ),
        full: median(
          data
            .filter((x) => x.minimum && x.full !== null)
            .map((x) => (x.full - x.minimum.r) * length),
        ),
        partial: mean(data.map((x) => x.partial)),
        minimum: median(data.map((x) => x.minimum?.speed)),
      };
    };
    return {
      bins,
      windows,
      top,
      gain: interval(a, b, 0, 1).gain,
      signatures: { a: signature("a"), b: signature("b") },
      length,
    };
  }
  function cornerRanking(report, metric = "minimum") {
    const value = (w) => {
      if (metric === "minimum")
        return finite(w.a.minimum?.speed) && finite(w.b.minimum?.speed)
          ? w.a.minimum.speed - w.b.minimum.speed
          : null;
      if (metric === "gear")
        return finite(w.a.gear) && finite(w.b.gear)
          ? w.a.gear - w.b.gear
          : null;
      const key = metric === "brake" ? "brake" : "full";
      return finite(w.a[key]) && finite(w.b[key])
        ? (w.a[key] - w.b[key]) * report.length
        : null;
    };
    const rows = report.windows
      .map((w) => ({ ...w, difference: value(w) }))
      .filter((w) => finite(w.difference))
      .sort(
        (a, b) =>
          Math.abs(a.difference) - Math.abs(b.difference) || a.id - b.id,
      );
    return {
      closest: rows.slice(0, 3),
      different: rows.slice(-3).reverse(),
      count: rows.length,
    };
  }
  function compatible(a, b, f = {}) {
    if (a.session && b.session && a.session !== b.session) return false;
    if (
      f.clean &&
      (a.x ||
        b.x ||
        !a.st ||
        !b.st ||
        /[24567]/.test(a.st) ||
        /[24567]/.test(b.st))
    )
      return false;
    if (f.compound && (!a.c || a.c === "U" || a.c !== b.c)) return false;
    if (
      f.age &&
      (!finite(a.age) ||
        !finite(b.age) ||
        Math.abs(a.age - b.age) > (f.ageTolerance ?? 2))
    )
      return false;
    if (f.phase && (!a.q || !b.q || a.q !== b.q)) return false;
    if (
      f.time &&
      (!finite(a.started) ||
        !finite(b.started) ||
        Math.abs(a.started - b.started) > (f.minutes ?? 15) * 60)
    )
      return false;
    return true;
  }
  function ideal(laps) {
    const pool = laps.filter(
      (l) =>
        !l.x &&
        finite(l.t) &&
        l.s?.length === 3 &&
        l.s.every((x) => finite(x) && x > 0) &&
        Math.abs(l.s.reduce((x, y) => x + y, 0) - l.t / 1000) < 0.25,
    );
    if (!pool.length) return null;
    const sectors = [0, 1, 2].map((i) =>
        pool.reduce((x, y) => (y.s[i] < x.s[i] ? y : x)),
      ),
      time = sectors.reduce((v, l, i) => v + l.s[i], 0),
      best = pool.reduce((x, y) => (y.t < x.t ? y : x));
    return {
      time,
      best: best.t / 1000,
      potential: Math.max(0, best.t / 1000 - time),
      sectors: sectors.map((l, i) => ({ time: l.s[i], lap: l.n, id: l.i })),
      count: pool.length,
    };
  }
  function catalog(laps, drivers, f = {}) {
    const pool = drivers.flatMap((_, d) =>
        laps
          .filter((l) => l.d === d && !l.x)
          .sort((a, b) => a.t - b.t)
          .slice(0, 3),
      ),
      pairs = [];
    for (let i = 0; i < pool.length; i++)
      for (let j = i + 1; j < pool.length; j++) {
        const a = pool[i],
          b = pool[j];
        if (a.d === b.d || !compatible(a, b, f)) continue;
        const gap = (b.t - a.t) / 1000,
          sector = a.s?.[0] && b.s?.[0] ? b.s[0] - a.s[0] : null;
        pairs.push({
          a,
          b,
          gap,
          team: !!drivers[a.d]?.t && drivers[a.d].t === drivers[b.d]?.t,
          reversal: finite(sector) && sector * gap < 0,
          trap:
            finite(a.v) &&
            finite(b.v) &&
            Math.abs(a.v - b.v) >= 5 &&
            gap * (b.v - a.v) > 0,
        });
      }
    return {
      close: pairs
        .slice()
        .sort((a, b) => Math.abs(a.gap) - Math.abs(b.gap))
        .slice(0, 6),
      teammates: pairs
        .filter((x) => x.team)
        .sort((a, b) => Math.abs(a.gap) - Math.abs(b.gap))
        .slice(0, 4),
      reversals: pairs
        .filter((x) => x.reversal)
        .sort((a, b) => Math.abs(a.gap) - Math.abs(b.gap))
        .slice(0, 4),
      traps: pairs
        .filter((x) => x.trap)
        .sort((a, b) => Math.abs(a.gap) - Math.abs(b.gap))
        .slice(0, 4),
      sample: pool.length,
    };
  }
  function theory(report, type) {
    const rows = report.windows.map((w) => {
      let difference = null;
      if (type === "brake" && w.a.brake !== null && w.b.brake !== null)
        difference = w.a.brake - w.b.brake;
      if (type === "minimum" && w.a.minimum && w.b.minimum)
        difference = w.a.minimum.speed - w.b.minimum.speed;
      if (type === "throttle" && w.a.full !== null && w.b.full !== null)
        difference = w.b.full - w.a.full;
      return {
        id: w.id,
        label: w.label,
        difference,
        gain: w.gain,
        support:
          finite(difference) &&
          Math.abs(difference) > 1e-6 &&
          Math.abs(w.gain) > 0.005
            ? difference * w.gain > 0
            : null,
      };
    });
    return {
      rows,
      support: rows.filter((x) => x.support === true).length,
      contradict: rows.filter((x) => x.support === false).length,
      unknown: rows.filter((x) => x.support === null).length,
    };
  }
  const cleanRace = (l) =>
    finite(l.t) &&
    l.t > 0 &&
    l.n > 1 &&
    !l.x &&
    !l.gen &&
    l.pin === null &&
    l.pout === null &&
    !!l.st &&
    !/[24567]/.test(l.st);
  const finish = (l) => (finite(l.ts) && finite(l.t) ? l.ts + l.t : null);
  function race(per, flags = [], stops = [], options = {}) {
    const maxLap = Math.max(0, ...per.flat().map((l) => l.n)),
      field = Array.from({ length: maxLap + 1 }, (_, n) =>
        median(
          per.flatMap((ls) =>
            ls.filter((l) => l.n === n && cleanRace(l)).map((l) => l.t),
          ),
        ),
      );
    const crossings = per
      .flatMap((ls, d) =>
        ls
          .map((l) => ({ d, n: l.n, time: finish(l) }))
          .filter((l) => finite(l.time)),
      )
      .sort((a, b) => a.time - b.time);
    const drivers = per.map((ls, d) => {
      const baseClean = ls.filter(cleanRace),
        near = baseClean
          .map((l) => {
            const t = finish(l);
            if (!finite(t)) return null;
            let previous = null;
            for (const c of crossings) {
              if (c.time >= t) break;
              if (c.d !== d) previous = c;
            }
            return previous
              ? { lap: l.n, gap: t - previous.time, other: previous.d }
              : null;
          })
          .filter(Boolean);
      const closeLaps = new Set(
          near.filter((x) => x.gap <= 3).map((x) => x.lap),
        ),
        clean = options.excludeNear
          ? baseClean.filter((l) => !closeLaps.has(l.n))
          : baseClean;
      const phase = [0, 1, 2].map((i) => {
        const a = clean.filter(
          (l) =>
            l.n > (maxLap * i) / 3 &&
            l.n <= (maxLap * (i + 1)) / 3 &&
            finite(field[l.n]),
        );
        return {
          count: a.length,
          pace: a.length >= 3 ? median(a.map((l) => l.t - field[l.n])) : null,
        };
      });
      const adjusted = clean
        .filter((l) => finite(field[l.n]))
        .map((l) => l.t - field[l.n]);
      return {
        d,
        count: clean.length,
        pace: clean.length >= 5 ? median(clean.map((l) => l.t)) : null,
        adjusted: adjusted.length >= 5 ? median(adjusted) : null,
        near: near.filter((x) => x.gap <= 3),
        crossings: near.length,
        phase,
      };
    });
    const moves = [];
    per.forEach((ls, d) =>
      ls.forEach((l, i) => {
        const prev = ls[i - 1];
        if (
          !prev ||
          l.n !== prev.n + 1 ||
          !finite(l.pos) ||
          !finite(prev.pos) ||
          l.pos >= prev.pos ||
          l.pin !== null ||
          l.pout !== null ||
          prev.pin !== null ||
          /[4567]/.test(l.st || "")
        )
          return;
        const other = per.findIndex(
          (xs, j) =>
            j !== d && xs.some((x) => x.n === prev.n && x.pos === prev.pos - 1),
        );
        if (other < 0) return;
        const leadup = [];
        for (let n = Math.max(1, l.n - 3); n <= l.n; n++) {
          const a = ls.find((x) => x.n === n),
            b = per[other].find((x) => x.n === n),
            ta = a && finish(a),
            tb = b && finish(b);
          if (finite(ta) && finite(tb))
            leadup.push({
              lap: n,
              gap: ta - tb,
              sectors: [0, 1, 2].map((k) =>
                finite(a.s?.[k]) && finite(b.s?.[k]) ? b.s[k] - a.s[k] : null,
              ),
              trapA: finite(a.trap) ? a.trap : null,
              trapB: finite(b.trap) ? b.trap : null,
            });
        }
        moves.push({ d, other, lap: l.n, places: prev.pos - l.pos, leadup });
      }),
    );
    const stable = [];
    per.forEach((ls, d) => {
      let run = [];
      const flush = () => {
        if (run.length >= 5) {
          const center = median(run.map((l) => l.t));
          stable.push({
            d,
            from: run[0].n,
            to: run.at(-1).n,
            c: run[0].c,
            count: run.length,
            median: center,
            mad: median(run.map((l) => Math.abs(l.t - center))),
          });
        }
        run = [];
      };
      for (const l of ls) {
        if (!cleanRace(l)) {
          flush();
          continue;
        }
        if (run.length && (l.n !== run.at(-1).n + 1 || l.c !== run.at(-1).c))
          flush();
        run.push(l);
      }
      flush();
    });
    stable.sort((a, b) => a.mad - b.mad);
    return {
      drivers,
      field,
      maxLap,
      moves,
      stable,
      events: [
        ...flags.map((x) => ({ lap: x.a, to: x.b, type: x.t })),
        ...stops.map((s) => ({
          lap: s.lap,
          type: "PIT",
          d: s.di,
          from: s.from,
          to: s.to,
          loss: s.loss,
        })),
      ].sort((a, b) => a.lap - b.lap),
    };
  }
  function progressAt(laps, time) {
    for (const l of laps) {
      if (
        finite(l.ts) &&
        finite(l.t) &&
        l.t > 0 &&
        time >= l.ts &&
        time <= l.ts + l.t
      )
        return l.n - 1 + (time - l.ts) / l.t;
    }
    return null;
  }
  function pitWindow(per, driver, lap, loss) {
    if (!finite(loss) || loss < 0 || loss > 120) return null;
    const l = per[driver]?.find((x) => x.n === lap),
      time = l && finish(l);
    if (!finite(time)) return null;
    const target = l.n,
      others = per
        .map((ls, d) => ({ d, progress: progressAt(ls, time + loss) }))
        .filter((x) => x.d !== driver && finite(x.progress)),
      ahead = others
        .filter((x) => x.progress > target)
        .sort((a, b) => a.progress - b.progress),
      behind = others
        .filter((x) => x.progress <= target)
        .sort((a, b) => b.progress - a.progress);
    return {
      position: others.length === per.length - 1 ? 1 + ahead.length : null,
      positionMin: 1 + ahead.length,
      positionMax: 1 + ahead.length + per.length - 1 - others.length,
      coverage: others.length,
      total: per.length - 1,
      ahead: ahead[0] || null,
      behind: behind[0] || null,
      time,
      loss,
    };
  }
  function validateStudy(v) {
    if (
      !v ||
      v.version !== 1 ||
      typeof v.title !== "string" ||
      !v.title.trim() ||
      v.title.length > 120 ||
      typeof v.note !== "string" ||
      v.note.length > 1500 ||
      !Array.isArray(v.range) ||
      v.range.length !== 2 ||
      !v.range.every(finite) ||
      v.range[0] < 0 ||
      v.range[1] > 1 ||
      v.range[0] >= v.range[1]
    )
      throw Error("İnceleme dosyası geçersiz");
    const c = v.context;
    if (
      !c ||
      !/^20\d{2}$/.test(String(c.year)) ||
      typeof c.event !== "string" ||
      c.event.length > 100 ||
      !["Q", "R", "S", "SQ", "FP1", "FP2", "FP3"].includes(c.kind) ||
      ![c.a, c.b].every(
        (x) => typeof x === "string" && /^[A-Z0-9]{2,4}$/.test(x),
      ) ||
      ![c.la, c.lb].every((x) => Number.isInteger(x) && x > 0 && x < 1000)
    )
      throw Error("İnceleme tur kaydı geçersiz");
    if (!["v", "thr", "brk", "gear", "rpm"].includes(v.channel))
      throw Error("Kanal geçersiz");
    return {
      version: 1,
      title: v.title,
      note: v.note,
      range: v.range.slice(),
      context: {
        year: String(c.year),
        event: c.event,
        kind: c.kind,
        a: c.a,
        b: c.b,
        la: c.la,
        lb: c.lb,
      },
      channel: v.channel,
    };
  }
  return {
    finite,
    median,
    mean,
    at,
    rawSeries,
    delta,
    interval,
    duel,
    cornerRanking,
    compatible,
    ideal,
    catalog,
    theory,
    cleanRace,
    race,
    pitWindow,
    progressAt,
    validateStudy,
  };
})();
if (typeof module !== "undefined") module.exports = InsightCore;
