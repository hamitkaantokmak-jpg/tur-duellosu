/* Application adapter. Analyses run on selection changes, never on replay frames. */
const InsightLab = (() => {
  const C = InsightCore,
    E = (s) =>
      String(s ?? "").replace(
        /[&<>"']/g,
        (x) =>
          ({
            "&": "&amp;",
            "<": "&lt;",
            ">": "&gt;",
            '"': "&quot;",
            "'": "&#39;",
          })[x],
      );
  const N = (v, d = 1) =>
    C.finite(v)
      ? v.toLocaleString("tr-TR", {
          minimumFractionDigits: d,
          maximumFractionDigits: d,
        })
      : "Veri yok";
  const S = (v, d = 3) =>
    C.finite(v) ? `${v < 0 ? "−" : "+"}${N(Math.abs(v), d)} s` : "Veri yok";
  const color = (x) => (/^#[0-9a-f]{6}$/i.test(x || "") ? x : "#bce77e");
  const button = (text, action, attrs = "", primary = false) =>
    `<button type="button" data-studio="${action}" ${attrs} class="${primary ? "primary" : ""}">${E(text)}</button>`;
  const empty = (text) => `<div class="studio-empty">${E(text)}</div>`;
  const card = (title, body, kicker = "") =>
    `<article class="studio-card">${kicker ? `<span class="studio-order">${E(kicker)}</span>` : ""}<h3>${E(title)}</h3>${body}</article>`;
  const disclosure = (text) => `<p class="studio-disclosure">${E(text)}</p>`;
  const table = (head, rows) =>
    rows.length
      ? `<div class="studio-table"><table><thead><tr>${head.map((x) => `<th scope="col">${E(x)}</th>`).join("")}</tr></thead><tbody>${rows.map((row) => `<tr>${row.map((x) => `<td>${x}</td>`).join("")}</tr>`).join("")}</tbody></table></div>`
      : empty(
          "Bu koşullara uyan ölçüm yok. Filtreleri veya seçili turları değiştir.",
        );
  const tabs = [
    ["overview", "Keşfet"],
    ["duel", "Düello hikâyesi"],
    ["drivers", "Sürüş izi"],
    ["race", "Yarış dosyası"],
    ["lab", "Laboratuvar"],
    ["archive", "Arşiv"],
    ["notes", "Not defteri"],
    ["guide", "Veri rehberi"],
  ];
  const hp = new URLSearchParams(location.hash.slice(1)),
    initialStudy = hp.get("study");
  const encode = (x) => {
    const bytes = new TextEncoder().encode(JSON.stringify(C.validateStudy(x)));
    let raw = "";
    bytes.forEach((v) => (raw += String.fromCharCode(v)));
    return btoa(raw).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
  };
  const decode = (s) => {
    if (typeof s !== "string" || s.length > 14000 || !/^[\w-]+$/.test(s))
      throw Error("İnceleme bağlantısı geçersiz");
    return C.validateStudy(
      JSON.parse(
        new TextDecoder().decode(
          Uint8Array.from(atob(s.replace(/-/g, "+").replace(/_/g, "/")), (c) =>
            c.charCodeAt(0),
          ),
        ),
      ),
    );
  };
  const app = {
    active: false,
    tab: tabs.some((t) => t[0] === hp.get("lab")) ? hp.get("lab") : "overview",
    filters: {
      clean: true,
      compound: false,
      age: false,
      phase: false,
      time: false,
      minutes: 15,
    },
    remote: {},
    pending: {},
    generation: 0,
    range: [0, 1],
    metadata: new WeakMap(),
    raceCache: new WeakMap(),
    draft: { title: "", note: "", channel: "v" },
    question: "",
    status: "",
    incoming: null,
    meta(l, H = st.H) {
      let cache = this.metadata.get(H);
      if (!cache) {
        const raw = new Map(H.allRows.map((r) => [`${r.drv}:${+r.lap}`, r]));
        cache = new Map(
          H.laps.map((x) => {
            const r = raw.get(`${H.drivers[x.d].c}:${x.n}`) || {};
            return [
              x.i,
              {
                ...x,
                age: okNum(r.life),
                started: parseTs(r.lSD),
                session: `${H.year}|${H.event}|${H.kind}`,
              },
            ];
          }),
        );
        this.metadata.set(H, cache);
      }
      return cache.get(l.i);
    },
    getRace(H) {
      let r = this.raceCache.get(H);
      if (r) return r;
      const base = buildRace(H),
        rows = new Map(H.allRows.map((x) => [`${x.drv}:${+x.lap}`, x]));
      r = {
        ...base,
        per: base.per.map((ls, d) =>
          ls.map((l) => ({
            ...l,
            trap: okNum(rows.get(`${H.drivers[d].c}:${l.n}`)?.vst),
          })),
        ),
      };
      this.raceCache.set(H, r);
      return r;
    },
    get pair() {
      return !!(
        st.H &&
        st.A &&
        st.B &&
        st.H.laps.includes(st.A.meta) &&
        st.H.laps.includes(st.B.meta)
      );
    },
    get context() {
      const H = st.H;
      return this.pair
        ? {
            year: String(H.year),
            event: H.event,
            kind: H.kind,
            a: H.drivers[st.A.meta.d].c,
            b: H.drivers[st.B.meta.d].c,
            la: st.A.meta.n,
            lb: st.B.meta.n,
          }
        : null;
    },
    code(d, H = st.H) {
      return H?.drivers[d]?.c || "—";
    },
    source(H = st.H, l = null) {
      return `<p class="studio-source">Kaynak: <a target="_blank" rel="noopener" href="${E(RAW(H.year, l ? l.path : `${H.event}/${H.session}/session_laptimes.json`))}">TracingInsights · ${E(H.year)} ${E(evName(H.event))} · ${E(SES_TR[H.kind])}${l ? ` · ${E(this.code(l.d, H))} ${l.n}. tur` : ""}</a></p>`;
    },
    row(title, value, detail = "") {
      return `<div class="studio-row"><span><strong>${E(title)}</strong>${detail ? `<small>${E(detail)}</small>` : ""}</span><span class="studio-value">${value}</span></div>`;
    },
    focusButton(w) {
      return button(
        "Grafikte aç",
        "focus",
        `data-start="${w.start}" data-end="${w.end}"`,
      );
    },
    open(tab = this.tab) {
      this.active = true;
      this.tab = tabs.some((x) => x[0] === tab) ? tab : "overview";
      stopPlay();
      if (ghost.active) ghostToggle(false);
      document.body.classList.add("insight-on");
      $("studioToggle").setAttribute("aria-pressed", "true");
      $("insightStudio").hidden = false;
      this.refresh();
      writeHash();
      $("insightStudio").scrollIntoView({ block: "start" });
    },
    close() {
      this.active = false;
      document.body.classList.remove("insight-on");
      $("studioToggle").setAttribute("aria-pressed", "false");
      $("insightStudio").hidden = true;
      applyMode();
      drawAll();
      writeHash();
    },
    hash(q) {
      if (this.active) {
        q.lab = this.tab;
        if (this.incoming && this.matches(this.incoming.context))
          q.study = encode(this.incoming);
      }
    },
    matches(c) {
      const here = this.context;
      return (
        here && Object.keys(here).every((k) => String(here[k]) === String(c[k]))
      );
    },
    refresh() {
      const key = st.H
        ? `${st.H.year}|${st.H.event}|${st.H.kind}|${st.a?.l}|${st.b?.l}`
        : "";
      if (this.key !== key) {
        this.key = key;
        this.remote = {};
        this.currentRace = null;
        this.pending = {};
        this.generation++;
      }
      this.report = this.pair
        ? C.duel(st.A, st.B, { length: st.H.L, corners: st.H.corners })
        : null;
      if (
        this.incoming &&
        this.matches(this.incoming.context) &&
        !this.incomingApplied
      ) {
        this.draft = { ...this.incoming };
        this.range = this.incoming.range.slice();
        this.incomingApplied = true;
        this.skipCapture = true;
      }
      if (this.active) this.render();
    },
    render() {
      if (!this.active) return;
      if (!this.skipCapture) this.captureDraft();
      this.skipCapture = false;
      $("studioTabs").innerHTML = tabs
        .map(
          ([id, label]) =>
            `<button type="button" role="tab" id="studioTab-${id}" aria-selected="${this.tab === id}" tabindex="${this.tab === id ? 0 : -1}" aria-controls="studioBody" data-studio="tab" data-tab="${id}">${E(label)}</button>`,
        )
        .join("");
      document
        .querySelectorAll("#modes [data-mode]")
        .forEach((b) => b.setAttribute("aria-pressed", "false"));
      $("studioBody").setAttribute("aria-labelledby", `studioTab-${this.tab}`);
      $("studioMeta").innerHTML = st.H
        ? `<span>${E(st.H.year)} · ${E(evName(st.H.event))}</span><span>${E(SES_TR[st.H.kind])}</span><span>${st.H.nL} seçilebilir tur</span>${this.pair ? `<span>${E(this.code(st.A.meta.d))} ${st.A.meta.n} ↔ ${E(this.code(st.B.meta.d))} ${st.B.meta.n}</span>` : ""}`
        : "<span>Arşiv yükleniyor</span>";
      if (this.pair) {
        if (st.A.meta.x || st.B.meta.x)
          $("studioMeta").insertAdjacentHTML(
            "beforeend",
            "<span>Silinmiş tur kaydı seçili</span>",
          );
        if (
          !C.compatible(
            this.meta(st.A.meta),
            this.meta(st.B.meta),
            this.filters,
          )
        )
          $("studioMeta").insertAdjacentHTML(
            "beforeend",
            "<span>Seçili çift mevcut liste filtrelerinin dışında</span>",
          );
        if (
          [st.A, st.B].some((L) =>
            Object.values(L.quality || {}).some((q) => q.filled),
          )
        )
          $("studioMeta").insertAdjacentHTML(
            "beforeend",
            "<span>Kaynakta doldurulan örnekler var</span>",
          );
      }
      $("studioStatus").textContent = this.status;
      const body = this.sessionError
        ? `<div class="studio-empty studio-error" role="alert">Oturum yüklenemedi: ${E(this.sessionError)}. Önceki oturumdan yeni sonuç gösterilmiyor.</div>${button("Yeniden dene", "retry-session")}`
        : st.H && !this.loading
          ? this.views[this.tab].call(this)
          : empty(
              "Oturum verisi yükleniyor. Bağlantını kontrol et; veri geldiğinde bu bölüm yenilenecek.",
            );
      $("studioBody").innerHTML = body;
    },
    pairRequired() {
      return (
        empty(
          "Bu bölüm iki turun telemetrisini kullanır. Seçili turları hazırla veya üst menüden başka bir oturum seç.",
        ) + button("Seçili turları hazırla", "prepare")
      );
    },
    filterForm() {
      return `<form id="studioFilters" class="studio-form">${[
        ["compound", "Aynı lastik"],
        ["age", "Lastik yaşı ±2 tur"],
        ["phase", "Aynı Q bölümü"],
        ["time", "Yakın seans zamanı"],
        ["clean", "Silinmiş / özel bayraklı turları çıkar"],
      ]
        .map(
          ([k, label]) =>
            `<label class="check"><input type="checkbox" name="${k}" ${this.filters[k] ? "checked" : ""}>${E(label)}</label>`,
        )
        .join(
          "",
        )}<label>Zaman aralığı (dakika)<input type="number" name="minutes" min="1" max="120" value="${this.filters.minutes}"></label><button class="primary">Filtreleri uygula</button></form><p class="studio-micro">Eşleştirme seçili A turuna göredir. Eksik lastik yaşı, Q bölümü veya başlangıç zamanı ilgili filtreyi geçmez. Yakıt, hava ve araç ayarı eşitliği doğrulanmış değildir.</p>`;
    },
    allMeta(H = st.H) {
      return H.laps.map((l) => this.meta(l, H));
    },
    catalog() {
      return C.catalog(this.allMeta(), st.H.drivers, this.filters);
    },
    pairs(list) {
      return list.length
        ? `<div class="studio-list">${list.map((p) => this.row(`${this.code(p.a.d)} ${p.a.n}. tur / ${this.code(p.b.d)} ${p.b.n}. tur`, `${S(p.gap)} ${button("Düelloyu aç", "pair", `data-a="${p.a.i}" data-b="${p.b.i}"`)}`, `${p.a.c} / ${p.b.c} · ${p.team ? "Takım arkadaşları" : "Farklı takımlar"}`)).join("")}</div>`
        : empty("Bu koşullarda örnek bulunamadı.");
    },
    gainMap() {
      if (!this.report || !st.H.px?.length) return "";
      const H = st.H,
        xs = Array.from(H.px),
        ys = Array.from(H.py),
        xmin = Math.min(...xs),
        ymin = Math.min(...ys),
        scale = Math.min(
          740 / (Math.max(...xs) - xmin || 1),
          280 / (Math.max(...ys) - ymin || 1),
        ),
        max = Math.max(
          0.001,
          ...this.report.bins.map((x) => Math.abs(x.gain || 0)),
        );
      return `<svg class="studio-chart" viewBox="0 0 800 330" role="img" aria-label="Mini sektör zaman kazançlarının pist haritası"><title>Renk pilotu, yoğunluk yerel zaman kazancının büyüklüğünü gösterir.</title>${this.report.bins
        .map((w) => {
          const a = Math.floor(w.start * (H.P - 1)),
            b = Math.ceil(w.end * (H.P - 1)),
            points = xs
              .slice(a, b + 1)
              .map(
                (x, j) =>
                  `${(30 + (x - xmin) * scale).toFixed(2)},${(20 + (ys[a + j] - ymin) * scale).toFixed(2)}`,
              )
              .join(" ");
          return `<polyline points="${points}" fill="none" stroke="${color(w.gain >= 0 ? COL.a : COL.b)}" stroke-opacity="${0.25 + (0.75 * Math.abs(w.gain || 0)) / max}" stroke-width="7"><title>${E(w.label)} · ${w.gain >= 0 ? "A" : "B"} ≈ ${N(Math.abs(w.gain), 3)} s</title></polyline>`;
        })
        .join(
          "",
        )}</svg><div class="studio-legend"><span><i style="background:${color(COL.a)}"></i>A · ${E(this.code(st.A.meta.d))}</span><span><i style="background:${color(COL.b)}"></i>B · ${E(this.code(st.B.meta.d))}</span><span>Koyu renk → daha büyük yerel kazanç</span></div>`;
    },
    trace(
      series = this.pair ? [st.A, st.B] : [],
      range = this.range,
      channel = this.draft.channel || "v",
      labels = null,
    ) {
      const values = series.map((L) =>
          Array.from({ length: 121 }, (_, i) =>
            C.at(L[channel], range[0] + ((range[1] - range[0]) * i) / 120),
          ),
        ),
        valid = values.flat().filter(C.finite);
      if (!valid.length)
        return empty("Seçilen kanal için güvenilir örnek bulunmuyor.");
      const lo = Math.min(...valid),
        hi = Math.max(...valid),
        colors = [color(COL.a), color(COL.b), "#bce77e"];
      return `<svg class="studio-chart" viewBox="0 0 800 240" role="img" aria-label="${E(channel)} kanalının seçili bölge karşılaştırması"><title>${E(channel)} · tur ilerlemesi %${N(range[0] * 100)}–${N(range[1] * 100)}</title><line x1="44" y1="200" x2="780" y2="200" stroke="currentColor" opacity=".15"/><text x="4" y="30">${N(hi)}</text><text x="4" y="195">${N(lo)}</text>${values.map((a, j) => `<path d="${a.map((v, i) => (C.finite(v) ? `${i && C.finite(a[i - 1]) ? "L" : "M"}${44 + (i * 736) / 120},${195 - ((v - lo) / (hi - lo || 1)) * 170}` : "")).join(" ")}" fill="none" stroke="${colors[j]}" stroke-width="2"/>`).join("")}<text x="44" y="225">%${N(range[0] * 100)}</text><text x="690" y="225">%${N(range[1] * 100)}</text></svg><div class="studio-legend">${series.map((L, i) => `<span><i style="background:${colors[i]}"></i>${E(labels?.[i] || this.code(L.meta.d))}</span>`).join("")}</div>`;
    },
    async run(key, fn) {
      if (this.pending[key]) return;
      const generation = this.generation,
        H = st.H;
      this.pending[key] = true;
      delete this.remote[key];
      this.render();
      try {
        const result = await fn(H);
        if (this.generation === generation && st.H === H)
          this.remote[key] = { ok: true, result };
      } catch (e) {
        if (this.generation === generation)
          this.remote[key] = { ok: false, error: String(e.message || e) };
      } finally {
        if (this.generation === generation) {
          delete this.pending[key];
          this.render();
        }
      }
    },
    result(key, render) {
      const r = this.remote[key];
      return this.pending[key]
        ? empty("Gerçek arşiv verisi yükleniyor…")
        : r
          ? r.ok
            ? render(r.result)
            : `<p class="studio-error" role="alert">${E(r.error)} Yeniden deneyebilir veya başka bir kayıt seçebilirsin.</p>`
          : "";
    },
    async series(H, l) {
      const raw = await loadTel(H, l.i);
      let axis = raw.rel;
      if (H.track && H.trackTransform) {
        const reg = ReplayCore.register(raw, H.track),
          info = ReplayCore.stations(raw, H.track, reg);
        if (info.valid) axis = info.rel;
      }
      return C.rawSeries(raw, this.meta(l, H), 540, axis);
    },
    async usePair(a, b) {
      const H = st.H,
        A = H?.laps[Number(a)],
        B = H?.laps[Number(b)];
      if (!A || !B) throw Error("Tur kaydı artık bu oturumda değil");
      stopPlay();
      st.a = { d: A.d, l: A.i };
      st.b = { d: B.d, l: B.i };
      fillDriverSelect($("drvA"), H, A.d);
      fillDriverSelect($("drvB"), H, B.d);
      fillLapSelect($("lapA"), H, A.d, A.i);
      fillLapSelect($("lapB"), H, B.d, B.i);
      await compare({ studioSelection: true });
      if (st.A?.meta !== A || st.B?.meta !== B)
        throw Error("Seçilen tur çifti yüklenemedi; yeniden dene");
      this.refresh();
    },
    focus(start, end) {
      this.range = [Number(start), Number(end)];
      if (!this.pair) return;
      this.close();
      if (st.mode === "race") setMode("duel");
      st.zoom = this.range.slice();
      st.zoomKey = "custom";
      st.hoverK = Math.round(((start + end) / 2) * (st.H.P - 1));
      mapLayer = null;
      chartLayer = null;
      syncZoomButtons();
      drawAll();
      $("chartcard").scrollIntoView({ block: "start" });
    },
    captureDraft() {
      const f = $("studioNote");
      if (f) {
        this.draft = {
          title: f.elements.title.value,
          note: f.elements.note.value,
          channel: f.elements.channel.value,
        };
        const a = Number(f.elements.start.value) / 100,
          b = Number(f.elements.end.value) / 100;
        if (a >= 0 && b <= 1 && a < b) this.range = [a, b];
      }
    },
    getNotes() {
      try {
        const v = JSON.parse(localStorage.getItem("td.studies.v1") || "[]");
        return Array.isArray(v)
          ? v.slice(0, 50).flatMap((x) => {
              try {
                return [C.validateStudy(x)];
              } catch {
                return [];
              }
            })
          : [];
      } catch {
        return [];
      }
    },
    saveNotes(notes) {
      try {
        localStorage.setItem(
          "td.studies.v1",
          JSON.stringify(notes.slice(0, 50)),
        );
        return true;
      } catch {
        return false;
      }
    },
    study() {
      this.captureDraft();
      if (!this.draft.title.trim()) throw Error("İncelemene bir başlık yaz");
      return C.validateStudy({
        version: 1,
        ...this.draft,
        range: this.range,
        context: this.context,
      });
    },
    download(v) {
      const url = URL.createObjectURL(
          new Blob([JSON.stringify(C.validateStudy(v), null, 2)], {
            type: "application/json",
          }),
        ),
        a = document.createElement("a");
      a.href = url;
      a.download = "tur-duellosu-inceleme.json";
      a.click();
      setTimeout(() => URL.revokeObjectURL(url), 1000);
    },
    async loadStudy(v) {
      v = C.validateStudy(v);
      this.incoming = v;
      this.incomingApplied = false;
      this.filters = {
        ...this.filters,
        compound: false,
        age: false,
        phase: false,
        time: false,
        clean: false,
      };
      if (this.matches(v.context)) {
        this.draft = { ...v };
        this.range = v.range;
        this.skipCapture = true;
        this.open("notes");
        return;
      }
      if (
        !SEASONS[v.context.year] ||
        !eventsOf(v.context.year).some(
          (e) =>
            e.e === v.context.event &&
            e.s.some((s) => KIND_OF[s] === v.context.kind),
        )
      )
        throw Error(
          "Bu incelemenin oturumu mevcut arşiv kataloğunda bulunamadı",
        );
      const q = new URLSearchParams({
        y: v.context.year,
        e: v.context.event,
        k: v.context.kind,
        a: v.context.a,
        b: v.context.b,
        la: v.context.la,
        lb: v.context.lb,
        lab: "notes",
        study: encode(v),
      });
      location.assign(`${location.pathname}#${q}`);
      location.reload();
    },
    answer(text) {
      if (!this.report) return "Önce iki turun telemetrisini hazırla.";
      const q = text.toLocaleLowerCase("tr-TR"),
        r = this.report;
      if (/ideal|sektör/.test(q)) {
        const ideal = C.ideal(st.H.byDrv[st.A.meta.d]);
        return ideal
          ? `${this.code(st.A.meta.d)} için gözlenen en iyi sektörlerin toplamı ${N(ideal.time, 3)} s; gerçek en iyi tur ${N(ideal.best, 3)} s. Bu birleşim sürülmüş bir tur değildir.`
          : "Tam sektör kaydı bulunamadı.";
      }
      if (/fren|gaz|minimum|vites/.test(q)) {
        const w = r.windows[this.corner || 0];
        return w
          ? `${w.label}: A minimum ${N(w.a.minimum?.speed)} km/sa, B ${N(w.b.minimum?.speed)} km/sa. Minimum hızdaki vites A ${N(w.a.gear, 0)}, B ${N(w.b.gear, 0)}. Giriş bölümünde A−B kazancı ${S(w.entry)}, çıkışta ${S(w.exit)}. Tek başına neden-sonuç göstermez.`
          : "Viraj referansı yok.";
      }
      if (/hızlı|hizli|fark|kazan|nerede/.test(q)) {
        const b = st.H.drivers[st.B.meta.d],
          mentionsB = [b.c, b.f, b.l]
            .filter((x) => x?.length > 2)
            .some((x) => q.includes(x.toLocaleLowerCase("tr-TR"))),
          best = r.bins
            .filter((x) => (mentionsB ? x.gain < 0 : x.gain > 0))
            .sort((x, y) => Math.abs(y.gain) - Math.abs(x.gain))
            .slice(0, 3);
        return best.length
          ? `${mentionsB ? b.c : this.code(st.A.meta.d)} en çok ${best.map((w) => `${w.label} bölümünde ≈ ${N(Math.abs(w.gain), 3)} s`).join("; ")} kazandı. Ortak pist ilerlemesine göre yaklaşık bölge hesabı.`
          : "Bu seçili turda aranan pilotun kazandığı bir bölüm bulunamadı.";
      }
      return "Şu hesaplara yanıt verebilirim: “A nerede hızlıydı?”, pilot koduyla bölge kazancı, “Fren ve gaz farkı ne?”, “İdeal sektör toplamı ne?”. Yarış ve pit soruları için Yarış dosyası bölümünü aç.";
    },
    views: {},
  };
  app.views.overview = function () {
    const cat = this.catalog();
    return `<div class="studio-grid">${card("Turun kırılma noktaları", this.report ? this.report.top.map((w, i) => this.row(`${i + 1}. ${w.label}`, `${w.gain >= 0 ? "A" : "B"} ≈ ${N(Math.abs(w.gain), 3)} s`, "En büyük mutlak mini sektör farkı")).join("") + button("Hikâyeyi incele", "tab", 'data-tab="duel"', true) : this.pairRequired(), "01 / DÜELLO")}${card("Aynı süre, farklı yollar", this.pairs(cat.close.slice(0, 2)) + button("Tuhaf turları keşfet", "tab", 'data-tab="archive"'), "02 / KEŞİF")}${card("Bir hafta sonunun veri dosyası", "<p>En yakın sıralama düellosu, göreli yarış temposu, stint tutarlılığı ve strateji zaman çizelgesi.</p>" + button("Hafta sonunu yükle", "weekend", this.pending.weekend ? "disabled" : "", true), "03 / HAFTA SONU")}</div>${this.result(
      "weekend",
      (x) =>
        card(
          "Hafta sonunun özeti",
          `<div class="studio-grid two"><div><h4>Sıralama: en yakın en iyi turlar</h4>${x.qual ? this.pairsFor(x.qual) : empty(x.qualError || "Sıralama verisi yok.")}</div><div><h4>Yarış: göreli temiz tempo</h4>${
            x.race
              ? table(
                  ["Pilot", "Temiz tur", "Saha medyanına göre"],
                  x.race.report.drivers
                    .filter((d) => C.finite(d.adjusted))
                    .sort((a, b) => a.adjusted - b.adjusted)
                    .slice(0, 5)
                    .map((d) => [
                      E(this.code(d.d, x.race.H)),
                      String(d.count),
                      S(d.adjusted),
                    ]),
                )
              : empty(x.raceError || "Yarış verisi yok.")
          }</div></div><p>Tempo sıralaması resmî sonuç değildir; trafik/yakıt etkisini tek başına ayırmaz.</p>${x.race ? `<h4>En tutarlı uzun dizi</h4>${x.race.report.stable[0] ? `<p>${E(this.code(x.race.report.stable[0].d, x.race.H))} · ${x.race.report.stable[0].from}–${x.race.report.stable[0].to}. turlar · medyan mutlak sapma ${N(x.race.report.stable[0].mad, 3)} s. Yakıt/trafik düzeltmesi yok.</p>` : empty("En az 5 kesintisiz temiz tur dizisi bulunamadı.")}${this.weekHighlights(x.race)}${this.source(x.race.H)}` : ""}`,
        ),
    )}${card("Veriyi nasıl okuyacağız?", `<div class="studio-grid"><div><h4>Gözlenen</h4><p>Ölçülen hız, pedal, vites, süre ve kaynak tur.</p></div><div><h4>Yorumlanan</h4><p>Birlikte değişen giriş/çıkış farkları; nedensellik iddiası olmadan.</p></div><div><h4>Bilinmeyen</h4><p>Yakıt yükü, araç ayarı, sıcaklık ve doğrulanmamış pist üstü olaylar.</p></div></div>`)}${this.filterForm()}`;
  };
  app.pairsFor = function (x) {
    const H = x.H,
      p = x.pair;
    return p
      ? `<p>${E(this.code(p.a.d, H))} / ${E(this.code(p.b.d, H))}</p><strong class="studio-number">${N(Math.abs(p.gap), 3)} <small>s</small></strong><a data-session-link href="${E(this.sessionLink(H, p.a, p.b))}">Kaynak düelloyu aç →</a>${this.source(H)}`
      : empty("Uygun iki pilot bulunamadı.");
  };
  app.sessionLink = function (H, a, b) {
    return (
      "#" +
      new URLSearchParams({
        y: H.year,
        e: H.event,
        k: H.kind,
        a: this.code(a.d, H),
        b: this.code(b.d, H),
        la: a.n,
        lb: b.n,
        lab: "duel",
      })
    );
  };
  app.views.duel = function () {
    if (!this.report) return this.pairRequired();
    const r = this.report,
      w = r.windows[this.corner || 0] || r.windows[0];
    return `<div class="studio-grid">${r.top.map((x, i) => card(x.label, `<strong class="studio-number">${x.gain >= 0 ? E(this.code(st.A.meta.d)) : E(this.code(st.B.meta.d))}<small> ≈ ${N(Math.abs(x.gain), 3)} s</small></strong><p>Bu mini sektördeki yerel süre farkı. Toplam tur farkından ayrı değerlendirilir.</p>${this.focusButton(x)}`, `0${i + 1} / KIRILMA NOKTASI`)).join("")}</div>${card("Farkın haritası", this.gainMap() + disclosure("Sabit mesafe bölümleri, B.t − A.t farkındaki değişimle renklendirilir. Pozitif kazanç A lehine; pist ilerlemesi hizalaması yaklaşık olduğundan metre ve zaman farkları nedensellik kanıtı değildir."))}${card(
      "Frenlemede kazanıp çıkışta geri vermek",
      `<div class="studio-form"><label>Viraj bölgesi<select id="studioCorner">${r.windows.map((x, i) => `<option value="${i}" ${this.corner === i ? "selected" : ""}>${E(x.label)}</option>`).join("")}</select></label></div>${
        w
          ? `${table(
              ["Bölüm", "A lehine süre farkı"],
              [
                ["Giriş → viraj referansı", S(w.entry)],
                ["Viraj referansı → bölge sonu", S(w.exit)],
                ["Bölgenin tamamı", S(w.gain)],
              ],
            )}${this.cornerTable([w])}${this.trace([st.A, st.B], [w.start, w.end], "v")}${this.focusButton(w)}`
          : empty(
              "Viraj referansı bulunmuyor. Mini sektörleri kullanabilirsin.",
            )
      }<p>Giriş ve çıkış sınırı viraj referansıdır; girişteki zaman farkının yalnız fren pedalından kaynaklandığı söylenemez.</p>`,
    )}${card("Veriye sor", `<form id="studioQuestion" class="studio-form"><label class="wide">Sorun<input name="question" maxlength="180" value="${E(this.question)}" placeholder="HAM nerede hızlıydı?"></label><button class="primary">Veriden yanıtla</button></form><div class="studio-actions">${["A nerede hızlıydı?", "Fren ve gaz farkı ne?", "İdeal sektör toplamı ne?"].map((q) => button(q, "question", `data-question="${E(q)}"`)).join("")}</div>${this.question ? `<p role="status" id="studioAnswer">${E(this.answer(this.question))}</p>` : ""}<p>Yanıtlar seçili iki turdaki hesaplanan ölçümlerle sınırlıdır.</p>${this.source(st.H, st.A.meta)}${this.source(st.H, st.B.meta)}`)}`;
  };
  app.cornerTable = function (windows, third = null) {
    return table(
      [
        "Bölge",
        "Pilot",
        "Minimum hız",
        "Min. vites",
        "Fren başlangıcı",
        "Tam gaz noktası",
        "Bölge sonu hız",
      ],
      windows.flatMap((w) =>
        [
          ["A", w.a],
          ["B", w.b],
          ...(third?.[w.id] ? [["C", third[w.id]]] : []),
        ].map(([side, m]) => [
          E(w.label),
          E(
            side === "A"
              ? this.code(st.A.meta.d)
              : side === "B"
                ? this.code(st.B.meta.d)
                : this.thirdCode,
          ),
          N(m.minimum?.speed) + " km/sa",
          N(m.gear, 0),
          m.brake === null
            ? "Veri yok"
            : `≈ ${N(m.brake * this.report.length, 0)} m`,
          m.full === null
            ? "Bölgede yok / veri yok"
            : `≈ ${N(m.full * this.report.length, 0)} m`,
          N(m.exit) + " km/sa",
        ]),
      ),
    );
  };
  app.signatureView = function (sig) {
    return table(
      ["Ölçüm", "A", "B"],
      [
        [
          "Fren başlangıcı → hız minimumu (medyan)",
          N(sig.a.brake, 0) + " m",
          N(sig.b.brake, 0) + " m",
        ],
        [
          "Hız minimumu → tam gaz (medyan)",
          N(sig.a.full, 0) + " m",
          N(sig.b.full, 0) + " m",
        ],
        [
          "Çıkışta kısmi gaz örnekleri",
          N(sig.a.partial === null ? null : sig.a.partial * 100) + "%",
          N(sig.b.partial === null ? null : sig.b.partial * 100) + "%",
        ],
        [
          "Viraj minimum hızları (medyan)",
          N(sig.a.minimum) + " km/sa",
          N(sig.b.minimum) + " km/sa",
        ],
      ],
    );
  };
  app.views.drivers = function () {
    if (!this.report) return this.pairRequired();
    const years = seasonList().filter(
      (y) =>
        String(y) !== String(st.H.year) &&
        eventsOf(y).some((e) => e.e === st.H.event),
    );
    return `${card("Pilot imzası: fren, gaz, minimum hız", this.signatureView(this.report.signatures) + disclosure("Bu ilk profil yalnız seçili iki turu kullanır. Kalıcı bir pilot özelliği değildir. Aşağıdaki çoklu tur kontrolü örnek sayısını artırır; araç/koşul etkisini ortadan kaldırmaz."))}<div class="studio-grid two">${card(
      "Bir turdan fazlası",
      `<p>Her pilot için seçili koşullara uyan en hızlı en fazla 5 turu yükler. Fren ve gaz noktalarının turlar arasındaki dağılımını karşılaştırır.</p>${button("Çoklu tur profilini yükle", "multi", this.pending.multi ? "disabled" : "", true)}${this.result(
        "multi",
        (x) =>
          table(
            [
              "Pilot",
              "Yüklenen / uygun",
              "Medyan fren aralığı",
              "Medyan tam gaz aralığı",
            ],
            x.map((v) => [
              E(this.code(v.d)),
              `${v.loaded} / ${v.eligible}`,
              N(v.brake, 0) +
                " m" +
                (v.brakeRange
                  ? ` (${N(v.brakeRange[0], 0)}–${N(v.brakeRange[1], 0)})`
                  : ""),
              N(v.full, 0) +
                " m" +
                (v.fullRange
                  ? ` (${N(v.fullRange[0], 0)}–${N(v.fullRange[1], 0)})`
                  : ""),
            ]),
          ) +
          "<p>Yüklenemeyen turlar başarı sayılmaz. Örneklem pilot başına en hızlı 5 uygun turla sınırlı.</p>",
      )}`,
    )}${card(
      "Üçüncü pilot referansı",
      `<form id="studioThird" class="studio-form"><label>Pilot<select name="driver">${st.H.order
        .filter((d) => d !== st.A.meta.d && d !== st.B.meta.d)
        .map(
          (d) =>
            `<option value="${d}" ${d === this.thirdDriver ? "selected" : ""}>${E(this.code(d))}</option>`,
        )
        .join(
          "",
        )}</select></label><button ${this.pending.third ? "disabled" : ""}>Referans turu yükle</button></form>${this.result(
        "third",
        (x) => {
          this.thirdCode = this.code(x.meta.d);
          const rep = C.duel(st.A, x, {
              length: st.H.L,
              corners: st.H.corners,
            }),
            near = { a: 0, b: 0, tie: 0 };
          for (const w of rep.windows) {
            const original = this.report.windows[w.id],
              c = w.b.minimum?.speed,
              a = original.a.minimum?.speed,
              b = original.b.minimum?.speed;
            if (![a, b, c].every(C.finite)) {
              near.tie++;
              continue;
            }
            const difference = Math.abs(c - a) - Math.abs(c - b);
            if (Math.abs(difference) < 1) near.tie++;
            else near[difference < 0 ? "a" : "b"]++;
          }
          return `<p>C: ${E(this.thirdCode)} ${x.meta.n}. tur. Bu yalnız seçilen üç turun karşılaştırmasıdır; yaygın pilot eğilimi sayılmaz.</p>${this.trace([st.A, st.B, x], [0, 1], "v", [this.code(st.A.meta.d), this.code(st.B.meta.d), this.thirdCode])}<p>C’nin minimum hızı A’ya daha yakın: ${near.a} bölge; B’ye daha yakın: ${near.b}; ayırt edilemeyen / eksik: ${near.tie}. Yalnız seçilen üç tur.</p><details><summary>Tüm virajların üç pilot karşılaştırması</summary>${this.cornerTable(this.report.windows, Object.fromEntries(rep.windows.map((w) => [w.id, w.b])))}</details>`;
        },
      )}`,
    )}</div>${card("Bir pilot, iki yıl", `<form id="studioYear" class="studio-form"><label>Karşılaştırma yılı<select name="year">${years.map((y) => `<option ${String(y) === String(this.compareYear) ? "selected" : ""}>${E(y)}</option>`).join("")}</select></label><button ${!years.length || this.pending.year ? "disabled" : ""}>A pilotunun arşiv turunu yükle</button></form>${this.result("year", (x) => `<p>${E(this.code(st.A.meta.d))}: ${E(st.H.year)} ${N(st.A.total, 3)} s / ${E(x.H.year)} ${N(x.series.total, 3)} s.</p>${this.trace([st.A, x.series], [0, 1], "v", [`${this.code(st.A.meta.d)} ${st.H.year}`, `${this.code(x.series.meta.d, x.H)} ${x.H.year}`])}${disclosure("Farklı araçlar, hava, asfalt, lastik ve olası pist düzeni değişiklikleri kontrol edilmedi. Eğriler normalize tur ilerlemesinde gösterilir; eş metre / eş fiziksel nokta iddiası yoktur.")}${this.source(x.H, x.lap)}`)}`)}${card("Vites ve viraj kütüphanesi", this.cornerTable(this.report.windows) + disclosure("Fren ve tam gaz noktaları tur başlangıcından yaklaşık mesafedir. Eksik veya doldurulmuş pedal/vites kanallarından olay noktası çıkarılmaz."))}`;
  };
  app.views.lab = function () {
    if (!this.report) return this.pairRequired();
    const type = this.theoryType || "brake",
      claim = {
        brake: "Daha geç fren yapan daha hızlıdır",
        minimum: "Minimum hızı yüksek olan daha hızlıdır",
        throttle: "Çıkışta daha erken tam gaz daha hızlıdır",
      }[type],
      t = C.theory(this.report, type),
      pool = this.allMeta().filter((l) =>
        C.compatible(this.meta(st.A.meta), l, this.filters),
      ),
      ideal = C.ideal(pool.filter((l) => l.d === st.A.meta.d));
    return `${card(
      "Benzer koşullar laboratuvarı",
      this.filterForm() +
        `<p>Seçili A’ya uygun ${pool.length} tur. Bilinmeyen koşullar eşit kabul edilmez.</p>` +
        table(
          ["Pilot", "Tur", "Lastik", "Yaş", "Kaynak"],
          pool
            .slice(0, 25)
            .map((l) => [
              E(this.code(l.d)),
              String(l.n),
              E(l.c),
              N(l.age, 0),
              button(
                "B turu yap",
                "pair",
                `data-a="${st.A.meta.i}" data-b="${l.i}"`,
              ),
            ]),
        ),
    )}${card(
      "Bir iddiayı veriye karşı sınayalım",
      `<form class="studio-form"><label>İddia<select id="studioTheory">${Object.entries(
        {
          brake: "Daha geç fren → hızlı bölüm",
          minimum: "Yüksek minimum hız → hızlı bölüm",
          throttle: "Erken tam gaz → hızlı bölüm",
        },
      )
        .map(
          ([k, v]) =>
            `<option value="${k}" ${k === type ? "selected" : ""}>${E(v)}</option>`,
        )
        .join(
          "",
        )}</select></label></form><h4>${E(claim)}</h4><div class="studio-grid">${this.row("Destekleyen bölge", String(t.support))}${this.row("Ters örnek", String(t.contradict))}${this.row("Eşit / veri yetersiz", String(t.unknown))}</div>${table(
        ["Bölge", "Gözlem", "A lehine bölüm kazancı"],
        t.rows.map((x) => [
          E(x.label),
          x.support === null
            ? "Karar yok"
            : x.support
              ? "İddiayla aynı yönde"
              : "İddiaya ters",
          S(x.gain),
        ]),
      )}${disclosure("Yalnız seçili iki tur ve aynı referans bölgeleri karşılaştırılır. Farklı virajların bir araya gelmesi, örnekleme ve koşullar sonucu etkiler; sayımlar istatistiksel veya nedensel kanıt değildir.")}`,
    )}${card(
      "Gerçek sektörlerden varsayımsal ideal tur",
      ideal
        ? `<strong class="studio-number">${N(ideal.time, 3)} <small>s</small></strong><p>Uygun ${ideal.count} turdaki en iyi sektörler. Gerçek en iyi: ${N(ideal.best, 3)} s; gözlenen sektör toplamı farkı: ${N(ideal.potential, 3)} s.</p>${table(
            ["Sektör", "Süre", "Kaynak tur"],
            ideal.sectors.map((x, i) => [
              `S${i + 1}`,
              N(x.time, 3) + " s",
              button(
                `${x.lap}. turu aç`,
                "pair",
                `data-a="${x.id}" data-b="${st.B.meta.i}"`,
              ),
            ]),
          )}${disclosure("Bu toplam sürülmüş bir tur değildir. Sektörlerin aynı turda birleşebileceği veya bu kadar zaman kazanılabileceği garanti edilmez.")}`
        : empty("Aynı pilot için tam, tutarlı üç sektör kaydı yok."),
    )}`;
  };
  app.cornerRankView = function () {
    if (!this.report) return this.pairRequired();
    const metric = this.rankMetric || "minimum",
      r = C.cornerRanking(this.report, metric),
      unit = { minimum: "km/sa", brake: "m", full: "m", gear: "vites" }[metric];
    const rows = (xs) =>
      table(
        ["Bölge", "Mutlak fark", "İncele"],
        xs.map((w) => [
          E(w.label),
          `${N(Math.abs(w.difference), metric === "gear" ? 0 : 1)} ${unit}`,
          this.focusButton(w),
        ]),
      );
    return card(
      "Nerede benziyorlar, nerede ayrışıyorlar?",
      `<div class="studio-form"><label>Sıralama ölçümü<select id="studioRankMetric">${Object.entries(
        {
          minimum: "Minimum hız",
          brake: "Fren başlangıç noktası",
          full: "Tam gaz noktası",
          gear: "Minimum hızdaki vites",
        },
      )
        .map(
          ([k, label]) =>
            `<option value="${k}" ${k === metric ? "selected" : ""}>${E(label)}</option>`,
        )
        .join(
          "",
        )}</select></label></div><div class="studio-grid two"><div><h4>Bu ölçümde en yakın bölgeler</h4>${rows(r.closest)}</div><div><h4>Bu ölçümde en farklı bölgeler</h4>${rows(r.different)}</div></div><p>${r.count} ölçülebilir bölge. Sıralama yalnız seçilen ölçüme göredir; aynı sürüş stili veya aynı tempo anlamına gelmez. Noktalar yaklaşık ortak pist ilerlemesindedir.</p>`,
    );
  };
  app.weekHighlights = function (x) {
    const phases = x.report.drivers
      .filter((d) => C.finite(d.phase[0].pace) && C.finite(d.phase[2].pace))
      .map((d) => ({ ...d, change: d.phase[2].pace - d.phase[0].pace }))
      .sort((a, b) => Math.abs(b.change) - Math.abs(a.change))
      .slice(0, 5);
    const events = [
      ...x.report.events.filter((e) => e.type !== "PIT").slice(0, 3),
      ...x.report.events
        .filter((e) => e.type === "PIT" && C.finite(e.loss))
        .sort((a, b) => Math.abs(b.loss) - Math.abs(a.loss))
        .slice(0, 3),
    ];
    return `<h4>En belirgin göreli tempo değişimleri</h4>${table(
      ["Pilot", "İlk faz", "Son faz", "Son − ilk"],
      phases.map((d) => [
        E(this.code(d.d, x.H)),
        S(d.phase[0].pace),
        S(d.phase[2].pace),
        S(d.change),
      ]),
    )}<p>Aynı tur saha medyanına göre temiz tur fazları. Son − ilk pozitifse göreli tempo kötüleşti; yakıt ve koşul etkisi tamamen ayrılmadı.</p><h4>Öne çıkan pit / bayrak kayıtları</h4>${table(
      ["Tur", "Olay", "Tahmini net pit kaybı"],
      events.map((e) => [
        String(e.lap),
        e.type === "PIT" ? `${E(this.code(e.d, x.H))} PIT` : E(e.type),
        C.finite(e.loss) ? N(e.loss, 1) + " s" : "Uygulanmaz",
      ]),
    )}`;
  };
  app.views.archive = function () {
    const cat = this.catalog();
    return `${card("Hazır düellolar", `<p>Bu oturumda pilot başına en hızlı 3 geçerli turdan ${cat.sample} kayıt tarandı. Üstteki sezon ve yarış seçimiyle arşivi değiştirebilirsin.</p>${this.filterForm()}`)}<div class="studio-grid two">${card("Takım arkadaşı düellosu", this.pairs(cat.teammates))}${card("Yakın süre, farklı hikâye", this.pairs(cat.close))}${card("İlk sektör avantajını geri verenler", this.pairs(cat.reversals))}${card("Düşük hız tuzağı, daha hızlı tur", this.pairs(cat.traps))}</div>${this.cornerRankView()}${card("Viraj kütüphanesi", this.report ? `<p>Seçili düellonun ölçümleri. Bir virajı açarak hız, vites ve pedal noktalarını incele; farklı yıl/tur karşılaştırması Sürüş izi bölümündedir.</p>${this.report.windows.map((w) => `<details><summary>${E(w.label)} · ${w.gain >= 0 ? "A" : "B"} ≈ ${N(Math.abs(w.gain), 3)} s</summary>${this.cornerTable([w])}${this.focusButton(w)}</details>`).join("")}` : this.pairRequired())}`;
  };
  app.views.race = function () {
    const H = this.remote.race?.ok
      ? this.remote.race.result.H
      : ["R", "S"].includes(st.H.kind)
        ? st.H
        : null;
    if (!H)
      return card(
        "Yarışın veri dosyası",
        `<p>Şu anda ${E(SES_TR[st.H.kind])} oturumu açık. Aynı hafta sonunun yarış kayıtlarını getir; mevcut düelloyu değiştirmez.</p>${button("Yarış kayıtlarını getir", "race", this.pending.race ? "disabled" : "", true)}${this.result("race", () => "")}`,
      );
    const R = this.getRace(H),
      report = C.race(R.per, R.bands, R.stops, {
        excludeNear: !!this.excludeNear,
      }),
      code = this.pair ? this.code(st.A.meta.d) : null,
      di =
        this.raceDriver ??
        Math.max(
          0,
          H.drivers.findIndex((d) => d.c === code),
        ),
      selected = report.drivers[di],
      laps = R.per[di] || [],
      chosen =
        this.pitLap && laps.some((l) => l.n === this.pitLap)
          ? this.pitLap
          : Math.min(20, laps.at(-1)?.n || 1),
      loss = C.finite(this.pitLoss)
        ? this.pitLoss
        : C.median(
            R.stops
              .filter((s) => !s.flag && C.finite(s.loss))
              .map((s) => s.loss),
          ),
      window = C.pitWindow(R.per, di, chosen, loss),
      pace = report.drivers
        .filter((d) => C.finite(d.adjusted))
        .sort((a, b) => a.adjusted - b.adjusted),
      moves = report.moves.filter((x) => x.d === di).slice(0, 12);
    this.currentRace = { H, R, report, di };
    return `${card(
      "Sonucun sakladığı tempo",
      `<div class="studio-form"><label>İncelenen pilot<select id="studioRaceDriver">${H.order.map((d) => `<option value="${d}" ${d === di ? "selected" : ""}>${E(this.code(d, H))}</option>`).join("")}</select></label><label class="check"><input id="studioExcludeNear" type="checkbox" ${this.excludeNear ? "checked" : ""}>Tur sonu yakınlığı ≤3 s olanları tempo hesabından çıkar</label></div>${table(
        ["Pilot", "Temiz tur", "Ham medyan", "Aynı tur saha medyanına göre"],
        pace.map((d) => [
          E(this.code(d.d, H)),
          String(d.count),
          N(d.pace, 3) + " s",
          S(d.adjusted),
        ]),
      )}${disclosure("Pit, ilk tur, silinmiş/üretilmiş ve SC/VSC/kırmızı bayraklı kayıtlar dışarıda. Saha medyanı ortak tempo değişimini azaltır; yakıt, lastik ve trafik etkilerini tamamen ayırmaz. Resmî sonuç sıralaması değildir.")}${this.source(H)}`,
    )}<div class="studio-grid two">${card(
      "Yakın takip göstergesi",
      `<strong class="studio-number">${selected.near.length} / ${selected.crossings} <small>tur sonu</small></strong><p>${E(this.code(di, H))} çizgiyi geçtiğinde başka bir aracın önceki geçişine en fazla 3 saniye vardı.</p>${table(
        ["Tur", "Öndeki geçiş", "Çizgide zaman aralığı"],
        selected.near
          .slice(0, 12)
          .map((x) => [
            String(x.lap),
            E(this.code(x.other, H)),
            N(x.gap, 2) + " s",
          ]),
      )}${disclosure("Yalnız zaman damgalı tur sonu yakınlığıdır. Tur boyunca takipte kalma, açık pist veya gerçek fiziksel mesafe ölçümü değildir; tur bindirmeleri dahil olabilir.")}`,
    )}${card("Pit penceresi senaryosu", `<form id="studioPit" class="studio-form"><label>Tur<select name="lap">${laps.map((l) => `<option value="${l.n}" ${l.n === chosen ? "selected" : ""}>${l.n}</option>`).join("")}</select></label><label>Varsayılan net kayıp (s)<input name="loss" type="number" min="0" max="120" step="0.1" value="${C.finite(loss) ? loss.toFixed(1) : 20}"></label><button>Senaryoyu hesapla</button></form>${window ? `<strong class="studio-number">${window.position === null ? `P${window.positionMin}–P${window.positionMax}` : `P${window.position}`} <small>yaklaşık${window.position === null ? " aralık" : ""}</small></strong><p>Önünde: ${E(window.ahead ? this.code(window.ahead.d, H) : "kayıt yok")} · Arkanda: ${E(window.behind ? this.code(window.behind.d, H) : "kayıt yok")}. Kapsam ${window.coverage}/${window.total} rakip.</p>` : empty("Zaman damgası veya net kayıp varsayımı eksik. Bir değer girerek senaryoyu hesapla.")}<p>İlk değer mevcut yeşil bayrak pit kayıtlarının saha medyanına göre tahmin edilen net kaybının medyanıdır (${R.stops.filter((s) => !s.flag && C.finite(s.loss)).length} kayıt). Veri yoksa 20 s yalnız düzenlenebilir varsayımdır; otomatik sonuç üretilmez.</p>${disclosure("Araçların tur içi ilerlemesi zaman içinde doğrusal varsayılır. Gerçek pit çıkış konumu, yakıt veya gelecekteki olaylar modellenmez; kapsama eksikse sıra güvenilir değildir.")}`)}</div>${card(
      "Pozisyon değişimi nasıl hazırlandı?",
      moves.length
        ? moves
            .map(
              (m) =>
                `<details><summary>${m.lap}. tur · ${E(this.code(di, H))}, ${E(this.code(m.other, H))} yakınında ${m.places} sıra yükseldi</summary>${table(
                  [
                    "Tur",
                    "Tur sonu farkı",
                    "S1 kazancı",
                    "S2 kazancı",
                    "S3 kazancı",
                    "Hız tuzağı seçili / rakip",
                  ],
                  m.leadup.map((x) => [
                    String(x.lap),
                    S(x.gap),
                    ...x.sectors.map((v) => S(v)),
                    `${N(x.trapA)} / ${N(x.trapB)} km/sa`,
                  ]),
                )}<p>Sektör kazancı rakip süresinden seçili pilot süresinin çıkarılmasıdır. Hız tuzağı kaydı yoksa sayı üretilmez. Pit/özel bayrak filtreleri uygulansa da bu bir pist üstü geçiş doğrulaması değildir. Diğer pilotun pite girmesi, ceza veya yarıştan çıkması etkili olabilir.</p></details>`,
            )
            .join("")
        : empty("Bu pilot için uygun ardışık pozisyon değişimi kaydı yok."),
    )}${card(
      "Yarışın başında, ortasında, sonunda",
      table(
        ["Pilot", "İlk üçte bir", "Orta üçte bir", "Son üçte bir"],
        report.drivers
          .filter((d) => d.count)
          .map((d) => [
            E(this.code(d.d, H)),
            ...d.phase.map(
              (p) => `${S(p.pace)} <small>(${p.count} tur)</small>`,
            ),
          ]),
      ) +
        "<p>Değerler aynı turdaki saha medyanına göre. Bir fazda en az 3 temiz tur gerekir; eksik faz sıfır kabul edilmez.</p>",
    )}${card(
      "En tutarlı temiz tur dizileri",
      table(
        [
          "Pilot",
          "Turlar",
          "Lastik",
          "Tur sayısı",
          "Medyan süre",
          "Medyan mutlak sapma",
        ],
        report.stable
          .slice(0, 12)
          .map((s) => [
            E(this.code(s.d, H)),
            `${s.from}–${s.to}`,
            E(s.c || "?"),
            String(s.count),
            N(s.median, 3) + " s",
            N(s.mad, 3) + " s",
          ]),
      ) +
        "<p>En az 5 kesintisiz, aynı bileşikte temiz tur. Düşük sapma daha az dağılım gösterir; yakıt, trafik ve lastik aşınması düzeltilmedi.</p>",
    )}${card("Stratejinin dönüm noktaları", `<div class="studio-timeline studio-scroll">${report.events.map((e) => this.row(`${e.type === "PIT" ? this.code(e.d, H) + " · PIT" : e.type}${e.to && e.type !== "PIT" ? ` ${e.lap}–${e.to}` : ""}`, e.type === "PIT" ? `${E(e.from)} → ${E(e.to)}` : "Bayrak kaydı", `${e.lap}. tur${C.finite(e.loss) ? ` · tahmini net kayıp ${N(e.loss, 1)} s` : ""}`)).join("") || empty("Pit veya bayrak olayı kaydı yok.")}</div>`)}<p>Başka bir yarış için üst menüdeki yarış haftasını değiştir.</p>`;
  };
  app.views.notes = function () {
    if (!this.pair) return this.pairRequired();
    const notes = this.getNotes();
    return `${card(
      "Kendi incelemeni kaydet",
      `<form id="studioNote" class="studio-form"><label class="wide">Başlık<input name="title" maxlength="120" required value="${E(this.draft.title)}" placeholder="T1 girişinde kazanılan zaman"></label><label>Başlangıç (%)<input name="start" type="number" min="0" max="99.99" step="0.01" required value="${(this.range[0] * 100).toFixed(2)}"></label><label>Bitiş (%)<input name="end" type="number" min="0.01" max="100" step="0.01" required value="${(this.range[1] * 100).toFixed(2)}"></label><label>Kanal<select name="channel">${Object.entries(
        { v: "Hız", thr: "Gaz", brk: "Fren", gear: "Vites", rpm: "RPM" },
      )
        .map(
          ([k, v]) =>
            `<option value="${k}" ${k === this.draft.channel ? "selected" : ""}>${v}</option>`,
        )
        .join(
          "",
        )}</select></label><label class="wide">Yorumun<textarea name="note" maxlength="1500" placeholder="Gözlem ve olası açıklamayı ayrı yaz.">${E(this.draft.note)}</textarea></label><button class="primary">Bu tarayıcıya kaydet</button>${button("Önizlemeyi güncelle", "preview")}</form>${this.trace()}<div class="studio-actions">${button("Bağlantıyı kopyala", "share")}${button("İncelemeyi indir", "download")}<label class="studio-file">Dosyadan aç<input id="studioImport" type="file" accept="application/json,.json" hidden></label></div><p>Sezon, seans, pilotlar, tur numaraları, bölge, kanal ve not bağlantıya dahildir. Yerel kayıt yalnız bu tarayıcıdadır. Localhost bağlantısı başka bilgisayardan açılmaz; JSON dosyasını aktarabilir veya yayımlanmış sitenin adresini kullanabilirsin.</p>`,
    )}${card("Kaydettiğin incelemeler", notes.length ? notes.map((n, i) => `<div class="studio-row"><span><strong>${E(n.title)}</strong><small>${E(n.context.year)} ${E(n.context.event)} · ${E(n.context.a)} / ${E(n.context.b)}</small></span><span>${button("Aç", "saved", `data-index="${i}"`)} ${button("İndir", "saved-download", `data-index="${i}"`)} ${button("Sil", "delete", `data-index="${i}"`)}</span></div>`).join("") : empty("Henüz kaydedilmiş inceleme yok."))}`;
  };
  app.views.guide = function () {
    return `<div class="studio-grid two">${card("Süre farkı ile yerel kazanç aynı değil", "<p>Delta B.t − A.t’dir. Pozitif delta A’nın aynı ilerlemeye önce ulaştığını gösterir. Bir bölgenin kazancı, bölge sonu ve başı deltalarının farkıdır. A turu daha yavaş olsa da tek bir bölgede zaman kazanabilir.</p>")}${card("Geç fren = hızlı tur mu?", "<p>Fren noktası, minimum hız ve çıkış birlikte okunur. Daha geç frenlemek girişte kazandırıp çıkışta kaybettirebilir. Telemetri korelasyonu araç ayarını veya pilotun niyetini kanıtlamaz.</p>")}${card("İdeal tur nasıl okunur?", "<p>Aynı pilotun aynı seanstaki gerçek sektörlerinden oluşan toplamdır. Filtreler uygulanır, eksik veya toplamıyla tutarsız sektörler çıkarılır. Gerçekleştirilmiş veya garantili tur değildir.</p>")}${card("Hangi bilgi eksik?", "<p>Yakıt yükü, lastik sıcaklığı, araç ayarı ve DRS bu veri modelinde yok. Bunlara dayanan kesin açıklama üretilmez. Doldurulmuş pedal/vites kanalları olay noktası için kullanılmaz.</p>")}${card("Yarış modelleri ne kadar kesin?", "<p>Yakınlık yalnız tur sonu geçiş zamanından hesaplanır. Pit penceresi doğrusal tur içi ilerleme ve girilen net kayıp varsayımına dayanır. Pozisyon değişimi pist üstü geçiş doğrulaması değildir.</p>")}${card("Kaynak ve yeniden inceleme", st.H ? this.source() + `<p>Telemetri grafikleri örnekler arasında enterpolasyon kullanır. Meksika’da coğrafi hizalama yaklaşık; diğer karşılaştırmalarda normalize mesafe kullanılır. Arşivde bir turun bulunması resmî doğruluk onayı anlamına gelmez.</p>${button("Not defterini aç", "tab", 'data-tab="notes"')}` : "")}</div>`;
  };
  app.runAction = async function (action, el) {
    if (action === "tab") {
      this.tab = el.dataset.tab;
      this.render();
      writeHash();
      return;
    }
    if (action === "close") {
      this.close();
      return;
    }
    if (action === "focus") {
      this.focus(+el.dataset.start, +el.dataset.end);
      return;
    }
    if (action === "pair") {
      await this.usePair(el.dataset.a, el.dataset.b);
      this.tab = "duel";
      this.render();
      writeHash();
      return;
    }
    if (action === "retry-session") {
      await openSession();
      return;
    }
    if (action === "prepare") {
      await compare();
      this.refresh();
      return;
    }
    if (action === "question") {
      this.question = el.dataset.question;
      this.render();
      return;
    }
    if (action === "preview") {
      this.captureDraft();
      this.render();
      return;
    }
    if (action === "multi")
      return this.run("multi", async (H) => {
        const refs = [st.A.meta, st.B.meta],
          out = [];
        for (const ref of refs) {
          const eligible = H.byDrv[ref.d]
              .filter((l) =>
                C.compatible(this.meta(ref, H), this.meta(l, H), this.filters),
              )
              .sort((a, b) => a.t - b.t),
            samples = [],
            range = (values) => {
              const v = values.filter(C.finite);
              return v.length ? [Math.min(...v), Math.max(...v)] : null;
            };
          for (const l of eligible.slice(0, 5)) {
            try {
              const x = await this.series(H, l),
                r = C.duel(x, x, { length: H.L, corners: H.corners });
              samples.push(r.signatures.a);
            } catch {
              /* Failed samples are counted below, never invented. */
            }
          }
          out.push({
            d: ref.d,
            loaded: samples.length,
            eligible: eligible.length,
            brake: C.median(samples.map((x) => x.brake)),
            full: C.median(samples.map((x) => x.full)),
            brakeRange: range(samples.map((x) => x.brake)),
            fullRange: range(samples.map((x) => x.full)),
          });
        }
        return out;
      });
    if (action === "race") {
      this.raceDriver = null;
      this.pitLap = null;
      this.pitLoss = null;
      return this.run("race", async (H) => ({
        H: await loadSession(H.year, H.event, "Race"),
      }));
    }
    if (action === "weekend")
      return this.run("weekend", async (H) => {
        const result = {};
        await Promise.allSettled(
          [
            ["qual", "Qualifying"],
            ["race", "Race"],
          ].map(async ([key, kind]) => {
            try {
              const x = await loadSession(H.year, H.event, kind);
              if (key === "qual") {
                const cat = C.catalog(
                  x.bestLap.filter(Boolean).map((l) => this.meta(l, x)),
                  x.drivers,
                  { clean: true },
                );
                result.qual = { H: x, pair: cat.close[0] };
              } else {
                const r = this.getRace(x);
                result.race = { H: x, report: C.race(r.per, r.bands, r.stops) };
              }
            } catch (e) {
              result[key + "Error"] = e.message;
            }
          }),
        );
        return result;
      });
    if (action === "share") {
      const study = this.study(),
        q = new URLSearchParams({
          ...study.context,
          y: study.context.year,
          e: study.context.event,
          k: study.context.kind,
          lab: "notes",
          study: encode(study),
        });
      q.delete("year");
      q.delete("event");
      q.delete("kind");
      const url = `${location.origin}${location.pathname}#${q}`;
      try {
        await navigator.clipboard.writeText(url);
        this.status = "İnceleme bağlantısı kopyalandı.";
      } catch {
        this.status =
          "Otomatik kopyalama kullanılamadı. Aşağıdaki bağlantıyı seçip kopyala.";
        this.shareFallback = url;
      }
      this.render();
      if (this.shareFallback) {
        const input = document.createElement("textarea");
        input.value = this.shareFallback;
        input.setAttribute("aria-label", "İnceleme bağlantısı");
        input.readOnly = true;
        $("studioBody").prepend(input);
        input.select();
      }
      return;
    }
    if (action === "download") {
      this.download(this.study());
      return;
    }
    if (action === "saved" || action === "saved-download") {
      const study = this.getNotes()[Number(el.dataset.index)];
      if (study) {
        if (action === "saved") await this.loadStudy(study);
        else this.download(study);
      }
      return;
    }
    if (action === "delete") {
      const notes = this.getNotes();
      notes.splice(Number(el.dataset.index), 1);
      if (!this.saveNotes(notes)) throw Error("Tarayıcı kaydı güncellenemedi");
      this.render();
      return;
    }
  };
  app.handleSubmit = async function (form) {
    if (form.id === "studioFilters") {
      const fd = new FormData(form);
      this.filters = {
        clean: fd.has("clean"),
        compound: fd.has("compound"),
        age: fd.has("age"),
        phase: fd.has("phase"),
        time: fd.has("time"),
        minutes: Math.max(1, Math.min(120, Number(fd.get("minutes")) || 15)),
      };
      this.generation++;
      this.pending = {};
      this.remote = {};
      this.refresh();
      return;
    }
    if (form.id === "studioQuestion") {
      this.question = form.elements.question.value;
      this.render();
      return;
    }
    if (form.id === "studioThird") {
      const di = Number(form.elements.driver.value),
        A = st.A;
      this.thirdDriver = di;
      return this.run("third", async (H) => {
        const l = H.byDrv[di]
          ?.filter((l) =>
            C.compatible(this.meta(A.meta, H), this.meta(l, H), this.filters),
          )
          .sort((a, b) => a.t - b.t)[0];
        if (!l) throw Error("Bu pilot için filtrelere uygun tur yok");
        return this.series(H, l);
      });
    }
    if (form.id === "studioYear") {
      const year = form.elements.year.value,
        code = this.code(st.A.meta.d);
      this.compareYear = year;
      return this.run("year", async (H) => {
        const other = await loadSession(year, H.event, H.session),
          di = other.drivers.findIndex((x) => x.c === code),
          lap = other.bestLap[di];
        if (!lap || lap.x)
          throw Error("Bu pilot için o yıl uygun tur bulunamadı");
        return { H: other, lap, series: await this.series(other, lap) };
      });
    }
    if (form.id === "studioPit") {
      this.pitLap = Number(form.elements.lap.value);
      this.pitLoss = Number(form.elements.loss.value);
      this.render();
      return;
    }
    if (form.id === "studioNote") {
      const note = this.study();
      if (!note.title.trim()) throw Error("İncelemene bir başlık yaz");
      const notes = this.getNotes();
      if (!this.saveNotes([note, ...notes]))
        throw Error(
          "Tarayıcı depolaması kullanılamadı; incelemeyi dosya olarak indirebilirsin",
        );
      this.incoming = note;
      this.incomingApplied = true;
      this.status = "İnceleme bu tarayıcıya kaydedildi.";
      this.render();
      writeHash();
    }
  };
  const reportError = (e) => {
    app.status = e.message || String(e);
    app.render();
  };
  $("studioToggle").addEventListener("click", () =>
    app.active ? app.close() : app.open(),
  );
  $("insightStudio").addEventListener("click", (e) => {
    const link = e.target.closest("[data-session-link]");
    if (link) {
      e.preventDefault();
      location.assign(link.href);
      location.reload();
      return;
    }
    const el = e.target.closest("[data-studio]");
    if (el) {
      e.preventDefault();
      Promise.resolve(app.runAction(el.dataset.studio, el)).catch(reportError);
    }
  });
  $("insightStudio").addEventListener("submit", (e) => {
    e.preventDefault();
    Promise.resolve(app.handleSubmit(e.target)).catch(reportError);
  });
  $("insightStudio").addEventListener("change", async (e) => {
    try {
      if (e.target.id === "studioCorner") {
        app.corner = Number(e.target.value);
        app.render();
      }
      if (e.target.id === "studioRankMetric") {
        app.rankMetric = e.target.value;
        app.render();
      }
      if (e.target.id === "studioTheory") {
        app.theoryType = e.target.value;
        app.render();
      }
      if (e.target.id === "studioExcludeNear") {
        app.excludeNear = e.target.checked;
        app.render();
      }
      if (e.target.id === "studioRaceDriver") {
        app.raceDriver = Number(e.target.value);
        app.pitLap = null;
        app.render();
      }
      if (e.target.id === "studioImport") {
        const file = e.target.files[0];
        if (!file) return;
        if (file.size > 24000) throw Error("İnceleme dosyası çok büyük");
        await app.loadStudy(JSON.parse(await file.text()));
      }
    } catch (err) {
      reportError(err);
    }
  });
  $("studioTabs").addEventListener("keydown", (e) => {
    if (!["ArrowLeft", "ArrowRight", "Home", "End"].includes(e.key)) return;
    const i = tabs.findIndex((t) => t[0] === app.tab),
      j =
        e.key === "Home"
          ? 0
          : e.key === "End"
            ? tabs.length - 1
            : (i + (e.key === "ArrowRight" ? 1 : -1) + tabs.length) %
              tabs.length;
    e.preventDefault();
    app.tab = tabs[j][0];
    app.render();
    $(`studioTab-${app.tab}`).focus();
    writeHash();
  });
  $("modes").addEventListener("click", (e) => {
    if (app.active && e.target.closest("[data-mode],#ghostToggle")) app.close();
  });
  document.addEventListener("td:session-loading", () => {
    app.loading = true;
    app.sessionError = null;
    app.currentRace = null;
    app.generation++;
    app.pending = {};
    app.remote = {};
    if (app.active) app.render();
  });
  document.addEventListener("td:session-error", () => {
    app.loading = false;
    app.sessionError = st.sessionError;
    app.generation++;
    app.pending = {};
    app.remote = {};
    app.currentRace = null;
    if (app.active) app.render();
  });
  document.addEventListener("td:session-ready", () => {
    app.loading = false;
    app.raceDriver = null;
    app.pitLap = null;
    app.pitLoss = null;
    app.refresh();
  });
  document.addEventListener("td:comparison-ready", () => {
    app.corner = 0;
    app.refresh();
  });
  app.loading = !!st.sessionLoading;
  app.sessionError = st.sessionError || null;
  window.InsightStudio = app;
  if (initialStudy)
    try {
      app.incoming = decode(initialStudy);
      app.filters.clean = false;
    } catch (e) {
      app.status = e.message;
    }
  if (hp.has("lab")) app.open(app.tab);
  return app;
})();
