"use strict";

/* ---------------------------------------------------------------- storage */

const STORE_KEY = "healthlog.v1";

function loadStore() {
  try {
    const raw = localStorage.getItem(STORE_KEY);
    if (raw) return JSON.parse(raw);
  } catch (e) { /* corrupted store: start fresh rather than crash */ }
  return { entries: {} };
}

function saveStore() {
  localStorage.setItem(STORE_KEY, JSON.stringify(store));
}

const store = loadStore();

function entriesFor(key) {
  if (!store.entries[key]) store.entries[key] = [];
  return store.entries[key];
}

/* ---------------------------------------------------------------- metrics */

// range: [min, max] sanity limits for input validation.
// band: reference range drawn on charts (context only, no interpretation).
// daily: "sum" aggregates a day's entries, "last" keeps the day's latest —
//        charts for those show one point per day instead of per entry.
const METRICS = [
  { key: "weight",  name: "Weight",             unit: "kg",   step: "0.1", range: [20, 300] },
  { key: "bp",      name: "Blood Pressure",     unit: "mmHg", bp: true,
    band: { sys: [90, 120], dia: [60, 80] }, bandLabel: "Band: 90–120 / 60–80 mmHg" },
  { key: "glucose", name: "Blood Glucose",      unit: "mg/dL", step: "1", range: [20, 600],
    band: [70, 140], bandLabel: "Band: 70–140 mg/dL" },
  { key: "hr",      name: "Resting Heart Rate", unit: "bpm",  step: "1", range: [25, 250],
    band: [60, 100], bandLabel: "Band: 60–100 bpm" },
  { key: "sleep",   name: "Sleep",              unit: "h",    step: "0.1", range: [0, 24] },
  { key: "water",   name: "Water",              unit: "mL",   step: "50", range: [1, 5000],
    daily: "sum", chips: [250, 500] },
  { key: "steps",   name: "Steps",              unit: "",     step: "100", range: [0, 200000],
    daily: "last" },
  { key: "distance", name: "Distance",          unit: "km",   step: "0.1", range: [0, 300],
    daily: "last" },
  { key: "energy",  name: "Active Energy",      unit: "kcal", step: "1",   range: [0, 10000],
    daily: "last" },
  { key: "exercise", name: "Exercise",          unit: "min",  step: "1",   range: [0, 1440],
    daily: "last" },
  { key: "workout", name: "Workouts",           unit: "min",  step: "1",   range: [0, 1440] },
];

const byKey = Object.fromEntries(METRICS.map((m) => [m.key, m]));

/* ------------------------------------------------------------- formatting */

function fmtNum(v) {
  return Number.isInteger(v) ? String(v) : String(Math.round(v * 10) / 10);
}

function fmtValue(metric, e) {
  if (metric.bp) return `${e.sys}/${e.dia}`;
  if (e.type) return `${e.type} ${fmtNum(e.v)}`; // synced workout: "Running 32"
  return fmtNum(e.v);
}

function fmtWhen(iso) {
  const d = new Date(iso);
  return d.toLocaleDateString(undefined, { day: "numeric", month: "short" }) +
    " " + d.toLocaleTimeString(undefined, { hour: "2-digit", minute: "2-digit" });
}

function dayOf(iso) {
  return iso.slice(0, 10);
}

/* ------------------------------------------------------------ chart data */

// Points to chart: raw entries, or one point per day for daily metrics.
function chartSeries(metric, count) {
  const all = entriesFor(metric.key);
  if (!metric.daily) return all.slice(-count);

  const days = new Map();
  for (const e of all) {
    const day = dayOf(e.t);
    if (metric.daily === "sum") {
      const prev = days.get(day);
      days.set(day, { t: e.t, v: (prev ? prev.v : 0) + e.v });
    } else {
      days.set(day, { t: e.t, v: e.v }); // "last": later entries overwrite
    }
  }
  return [...days.values()].slice(-count);
}

function seriesValues(metric, series) {
  if (metric.bp) return series.flatMap((e) => [e.sys, e.dia]);
  return series.map((e) => e.v);
}

/* ------------------------------------------------------------- svg charts */

const SVG_NS = "http://www.w3.org/2000/svg";

function svgEl(tag, attrs) {
  const el = document.createElementNS(SVG_NS, tag);
  for (const [k, v] of Object.entries(attrs)) el.setAttribute(k, v);
  return el;
}

function scaleY(v, lo, hi, height, pad) {
  if (hi === lo) return height / 2;
  return pad + (height - 2 * pad) * (1 - (v - lo) / (hi - lo));
}

function polyline(points, colour, width) {
  return svgEl("polyline", {
    points: points.map(([x, y]) => `${x.toFixed(1)},${y.toFixed(1)}`).join(" "),
    fill: "none",
    stroke: colour,
    "stroke-width": width,
    "stroke-linecap": "round",
    "stroke-linejoin": "round",
  });
}

// Shared renderer for sparklines and the detail chart.
function renderChart(metric, series, width, height, detail) {
  const svg = svgEl("svg", { viewBox: `0 0 ${width} ${height}`, preserveAspectRatio: "none" });
  const pad = detail ? 16 : 5;

  if (series.length === 0) {
    if (detail) {
      const t = svgEl("text", { x: width / 2, y: height / 2, "text-anchor": "middle", class: "axis-label" });
      t.textContent = "No entries yet";
      svg.appendChild(t);
    }
    return svg;
  }

  // Y domain: data plus the reference band so the band is always visible.
  let values = seriesValues(metric, series);
  if (metric.band) {
    values = values.concat(metric.bp ? [...metric.band.sys, ...metric.band.dia] : metric.band);
  }
  const lo = Math.min(...values);
  const hi = Math.max(...values);

  const x = (i) =>
    series.length === 1 ? width / 2 : pad + ((width - 2 * pad) * i) / (series.length - 1);
  const y = (v) => scaleY(v, lo, hi, height, pad);

  // Reference band(s) behind the data.
  const bands = metric.band ? (metric.bp ? [metric.band.sys, metric.band.dia] : [metric.band]) : [];
  for (const [bLo, bHi] of bands) {
    svg.appendChild(svgEl("rect", {
      x: 0, width, y: y(bHi), height: Math.max(y(bLo) - y(bHi), 1),
      fill: "var(--band)",
    }));
  }

  const strokeW = detail ? 2.5 : 2;
  if (metric.bp) {
    svg.appendChild(polyline(series.map((e, i) => [x(i), y(e.sys)]), "var(--spark)", strokeW));
    svg.appendChild(polyline(series.map((e, i) => [x(i), y(e.dia)]), "#af52de", strokeW));
  } else {
    svg.appendChild(polyline(series.map((e, i) => [x(i), y(e.v)]), "var(--spark)", strokeW));
  }

  if (detail) {
    // Min/max labels so the chart is readable without axes.
    const top = svgEl("text", { x: 4, y: 12, class: "axis-label" });
    top.textContent = fmtNum(hi);
    const bottom = svgEl("text", { x: 4, y: height - 4, class: "axis-label" });
    bottom.textContent = fmtNum(lo);
    svg.appendChild(top);
    svg.appendChild(bottom);

    // Dots on each point.
    const dot = (cx, cy, fill) => svgEl("circle", { cx, cy, r: 3, fill });
    series.forEach((e, i) => {
      if (metric.bp) {
        svg.appendChild(dot(x(i), y(e.sys), "var(--spark)"));
        svg.appendChild(dot(x(i), y(e.dia), "#af52de"));
      } else {
        svg.appendChild(dot(x(i), y(e.v), "var(--spark)"));
      }
    });
  }

  return svg;
}

/* ------------------------------------------------------------- main cards */

const cardsEl = document.getElementById("cards");

function latestLabel(metric) {
  const series = chartSeries(metric, 1);
  if (series.length === 0) return "no entries";
  const e = series[series.length - 1];
  const today = dayOf(new Date().toISOString()) === dayOf(new Date(e.t).toISOString());
  const prefix = metric.daily === "sum" ? (today ? "today " : "last day ") : "";
  return `${prefix}<strong>${fmtValue(metric, e)}</strong> ${metric.unit}`;
}

function buildCard(metric) {
  const card = document.createElement("div");
  card.className = "card";
  card.id = `card-${metric.key}`;

  const top = document.createElement("div");
  top.className = "card-top";
  top.innerHTML = `<span class="card-name">${metric.name}` +
    (metric.unit ? ` <span class="card-latest">(${metric.unit})</span>` : "") +
    `</span><span class="card-latest" id="latest-${metric.key}"></span>`;
  card.appendChild(top);

  const body = document.createElement("div");
  body.className = "card-body";

  const sparkWrap = document.createElement("div");
  sparkWrap.className = "spark-wrap";
  sparkWrap.id = `spark-${metric.key}`;
  sparkWrap.addEventListener("click", () => openDetail(metric.key));
  body.appendChild(sparkWrap);

  const form = document.createElement("form");
  form.className = "entry-form";
  if (metric.bp) {
    form.innerHTML =
      `<input class="bp" type="number" inputmode="numeric" placeholder="120" aria-label="Systolic">` +
      `<span class="bp-sep">/</span>` +
      `<input class="bp" type="number" inputmode="numeric" placeholder="80" aria-label="Diastolic">`;
  } else {
    const mode = metric.step.includes(".") ? "decimal" : "numeric";
    form.innerHTML =
      `<input type="number" inputmode="${mode}" step="${metric.step}" placeholder="&ndash;" aria-label="${metric.name}">`;
  }
  const btn = document.createElement("button");
  btn.type = "submit";
  btn.className = "add-btn";
  btn.textContent = "+";
  btn.setAttribute("aria-label", `Add ${metric.name} entry`);
  form.appendChild(btn);
  form.addEventListener("submit", (ev) => {
    ev.preventDefault();
    submitEntry(metric, form);
  });
  body.appendChild(form);
  card.appendChild(body);

  if (metric.chips) {
    const chips = document.createElement("div");
    chips.className = "chips";
    for (const amount of metric.chips) {
      const chip = document.createElement("button");
      chip.type = "button";
      chip.className = "chip";
      chip.textContent = `+${amount} ${metric.unit}`;
      chip.addEventListener("click", () => {
        addEntry(metric, { v: amount });
        flash(card);
      });
      chips.appendChild(chip);
    }
    card.appendChild(chips);
  }

  cardsEl.appendChild(card);
}

function refreshCard(metric) {
  document.getElementById(`latest-${metric.key}`).innerHTML = latestLabel(metric);
  const wrap = document.getElementById(`spark-${metric.key}`);
  wrap.replaceChildren(renderChart(metric, chartSeries(metric, 14), 200, 44, false));
}

function flash(card) {
  card.classList.remove("saved-flash");
  void card.offsetWidth; // restart the animation
  card.classList.add("saved-flash");
}

function submitEntry(metric, form) {
  const inputs = form.querySelectorAll("input");
  if (metric.bp) {
    const sys = Number(inputs[0].value);
    const dia = Number(inputs[1].value);
    if (!inputs[0].value || !inputs[1].value || sys < 40 || sys > 300 || dia < 20 || dia > 200 || dia >= sys) return;
    addEntry(metric, { sys, dia });
  } else {
    const v = Number(inputs[0].value);
    if (inputs[0].value === "" || !Number.isFinite(v) || v < metric.range[0] || v > metric.range[1]) return;
    addEntry(metric, { v });
  }
  inputs.forEach((i) => (i.value = ""));
  inputs[0].blur();
  flash(form.closest(".card"));
}

function addEntry(metric, data) {
  entriesFor(metric.key).push({ t: new Date().toISOString(), ...data });
  saveStore();
  refreshCard(metric);
}

/* ------------------------------------------------------------ detail view */

const detailEl = document.getElementById("detail");
let detailKey = null;

function openDetail(key) {
  detailKey = key;
  const metric = byKey[key];
  document.getElementById("detail-title").textContent = metric.name;
  document.getElementById("detail-range-note").textContent = metric.bandLabel
    ? `${metric.bandLabel} — shown for context only.`
    : (metric.daily === "sum" ? "One point per day (daily total)." : "");
  renderDetail(metric);
  detailEl.classList.remove("hidden");
  detailEl.scrollTop = 0;
}

function renderDetail(metric) {
  const chartWrap = document.getElementById("detail-chart");
  chartWrap.replaceChildren(renderChart(metric, chartSeries(metric, 30), 360, 190, true));

  const list = document.getElementById("detail-list");
  list.replaceChildren();
  const all = entriesFor(metric.key);
  const recent = all.slice(-30).reverse();
  for (const e of recent) {
    const li = document.createElement("li");
    const label = document.createElement("span");
    label.innerHTML = `<strong>${fmtValue(metric, e)}</strong> ${metric.unit}` +
      (e.kcal ? ` &middot; ${fmtNum(e.kcal)} kcal` : "") +
      ` <span class="entry-when">${fmtWhen(e.t)}</span>`;
    const del = document.createElement("button");
    del.className = "entry-del";
    del.textContent = "Delete";
    del.addEventListener("click", () => {
      const idx = all.indexOf(e);
      if (idx >= 0) all.splice(idx, 1);
      saveStore();
      renderDetail(metric);
      refreshCard(metric);
    });
    li.appendChild(label);
    li.appendChild(del);
    list.appendChild(li);
  }
  if (recent.length === 0) {
    const li = document.createElement("li");
    li.textContent = "No entries yet.";
    list.appendChild(li);
  }
}

document.getElementById("detail-back").addEventListener("click", () => {
  detailEl.classList.add("hidden");
  detailKey = null;
});

/* ---------------------------------------------------------- export/import */

document.getElementById("export-btn").addEventListener("click", () => {
  const blob = new Blob([JSON.stringify(store, null, 2)], { type: "application/json" });
  const a = document.createElement("a");
  a.href = URL.createObjectURL(blob);
  a.download = `health-log-${dayOf(new Date().toISOString())}.json`;
  a.click();
  URL.revokeObjectURL(a.href);
});

document.getElementById("import-file").addEventListener("change", (ev) => {
  const file = ev.target.files[0];
  if (!file) return;
  file.text().then((text) => {
    try {
      const data = JSON.parse(text);
      if (!data || typeof data.entries !== "object") throw new Error("bad shape");
      store.entries = data.entries;
      saveStore();
      METRICS.forEach(refreshCard);
      if (detailKey) renderDetail(byKey[detailKey]);
    } catch (e) {
      alert("That file doesn't look like a Health Log export.");
    }
    ev.target.value = "";
  });
});

/* ------------------------------------------------------------ health sync */

// Imports the JSON that the "Health Sync" iOS Shortcut copies to the
// clipboard (build steps in the README). Synced entries are tagged src:"h"
// so re-importing the same day replaces them instead of duplicating them;
// manually typed entries are never touched.

const HEALTH_FIELDS = [
  { metric: "steps",    keys: ["steps"] },
  { metric: "distance", keys: ["distancekm", "distance"] },
  { metric: "energy",   keys: ["activeenergykcal", "activeenergy", "energy"] },
  { metric: "exercise", keys: ["exercisemin", "exercise"] },
  { metric: "hr",       keys: ["restinghr", "restingheartrate", "hr"] },
];

// Shortcuts often emits values as text with units ("8,234 count", "6.2 km").
function healthNum(v) {
  if (v === undefined || v === null || v === "") return null;
  const m = String(v).replace(/,/g, "").match(/-?\d+(\.\d+)?/);
  const n = m ? parseFloat(m[0]) : NaN;
  return Number.isFinite(n) ? n : null;
}

function localToday() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

function upsertSynced(metricKey, date, newEntries) {
  const kept = entriesFor(metricKey).filter((e) => !(e.src === "h" && dayOf(e.t) === date));
  kept.push(...newEntries);
  kept.sort((a, b) => (a.t < b.t ? -1 : a.t > b.t ? 1 : 0));
  store.entries[metricKey] = kept;
}

// Accepts [{type, min, kcal}] or the pipe format the Shortcut builds
// line by line: "Running|32|310".
function parseWorkouts(raw) {
  let list = raw;
  if (typeof raw === "string") {
    list = raw.split("\n").map((line) => {
      const [type, min, kcal] = line.split("|");
      return { type, min, kcal };
    });
  }
  if (!Array.isArray(list)) return [];
  const out = [];
  for (const w of list) {
    if (!w || typeof w !== "object") continue;
    const v = healthNum(w.min ?? w.minutes ?? w.duration);
    if (v === null || v <= 0 || v > 1440) continue;
    const entry = { v };
    const type = String(w.type ?? w.name ?? "").trim();
    if (type) entry.type = type;
    const kcal = healthNum(w.kcal ?? w.calories);
    if (kcal !== null && kcal >= 0) entry.kcal = kcal;
    out.push(entry);
  }
  return out;
}

function applyHealthDay(day) {
  const date = /^\d{4}-\d{2}-\d{2}$/.test(String(day.date)) ? day.date : localToday();
  const t = `${date}T12:00:00`;
  const lower = {};
  for (const [k, v] of Object.entries(day)) lower[k.toLowerCase().replace(/[\s_]/g, "")] = v;

  const applied = [];
  for (const f of HEALTH_FIELDS) {
    const key = f.keys.find((k) => lower[k] !== undefined);
    if (key === undefined) continue;
    const v = healthNum(lower[key]);
    const m = byKey[f.metric];
    if (v === null || v < m.range[0] || v > m.range[1]) continue;
    upsertSynced(f.metric, date, [{ t, v, src: "h" }]);
    applied.push(m.name);
  }

  const workouts = parseWorkouts(lower.workouts ?? lower.workoutstext);
  if (workouts.length) {
    upsertSynced("workout", date, workouts.map((w) => ({ t, src: "h", ...w })));
    applied.push(`${workouts.length} workout${workouts.length > 1 ? "s" : ""}`);
  }
  return { date, applied };
}

const syncEl = document.getElementById("sync");
const syncResult = document.getElementById("sync-result");

function importHealthText(text) {
  let days;
  try {
    const data = JSON.parse(text);
    days = Array.isArray(data) ? data : [data];
    if (days.length === 0 || typeof days[0] !== "object" || days[0] === null) throw new Error("bad shape");
  } catch (e) {
    syncResult.textContent = "That doesn't look like Health Sync data. Run the shortcut first, then paste what it copied.";
    return;
  }
  const lines = [];
  for (const day of days) {
    const { date, applied } = applyHealthDay(day);
    lines.push(`${date}: ${applied.length ? applied.join(", ") : "nothing recognised"}`);
  }
  saveStore();
  METRICS.forEach(refreshCard);
  if (detailKey) renderDetail(byKey[detailKey]);
  syncResult.textContent = "Imported — " + lines.join(" · ");
}

document.getElementById("sync-open").addEventListener("click", () => {
  syncResult.textContent = "";
  document.getElementById("sync-text").value = "";
  syncEl.classList.remove("hidden");
  syncEl.scrollTop = 0;
});

document.getElementById("sync-back").addEventListener("click", () => {
  syncEl.classList.add("hidden");
});

document.getElementById("sync-paste").addEventListener("click", () => {
  if (!navigator.clipboard || !navigator.clipboard.readText) {
    syncResult.textContent = "Clipboard access isn't available here — paste into the box below instead.";
    return;
  }
  navigator.clipboard.readText().then(importHealthText).catch(() => {
    syncResult.textContent = "Couldn't read the clipboard — paste into the box below instead.";
    document.getElementById("sync-text").focus();
  });
});

document.getElementById("sync-import").addEventListener("click", () => {
  const text = document.getElementById("sync-text").value.trim();
  if (text) importHealthText(text);
});

/* ----------------------------------------------------------------- boot */

document.getElementById("today-label").textContent = new Date().toLocaleDateString(undefined, {
  weekday: "long", day: "numeric", month: "long",
});

METRICS.forEach(buildCard);
METRICS.forEach(refreshCard);

if ("serviceWorker" in navigator) {
  navigator.serviceWorker.register("sw.js");
}
