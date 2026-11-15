// Prototype wiring. In-memory only, reloading resets it.
// URL states: ?state=empty | first | backup | update (comma separated).
(function () {
  const S = window.Streak;
  const t0 = new Date(), p2 = (n) => String(n).padStart(2, "0");
  const TODAY = t0.getFullYear() + "-" + p2(t0.getMonth() + 1) + "-" + p2(t0.getDate());
  const modes = (new URLSearchParams(location.search).get("state") || "").split(",");
  const $ = (id) => document.getElementById(id);
  let nextId = 1;
  const mk = (date, reps) => ({ id: "s" + nextId++, exerciseId: "pushup", reps, date });

  const state = { goal: 5, sets: [], lastExport: null, backup: null, y: +TODAY.slice(0, 4), m: +TODAY.slice(5, 7) };
  if (modes.includes("backup")) state.backup = { goal: 5, sets: [], lastExport: null };

  const fmt = (date, opts) => new Date(S.toN(date) * 86400000).toLocaleDateString("en-GB", Object.assign({ timeZone: "UTC" }, opts));
  const longDate = (d) => fmt(d, { weekday: "long", day: "numeric", month: "long" });
  const shortDate = (d) => fmt(d, { weekday: "short", day: "numeric", month: "short" });
  const yesterday = S.toS(S.toN(TODAY) - 1);
  const plural = (n, w) => n + " " + w + (n === 1 ? "" : "s");

  function streakHtml(n) {
    return `<svg width="20" height="20" aria-hidden="true"><use href="#flame"/></svg><span class="num">${plural(n, "week")}</span>`;
  }

  function setsList(ul, date, emptyMsg) {
    const list = state.sets.filter((s) => s.date === date);
    ul.innerHTML = list.length
      ? list.map((s, i) => `<li><button type="button" data-id="${s.id}" aria-label="Set ${i + 1}, ${s.reps} reps, edit"><span class="sets__n">Set ${i + 1}</span><span class="sets__reps num">${s.reps}</span><span class="sets__edit">Edit</span></button></li>`).join("")
      : `<li class="sets__empty">${emptyMsg}</li>`;
  }

  function renderHome() {
    const t = S.totals(state.sets), tt = t[TODAY] || 0, yt = t[yesterday] || 0;
    $("home-title").textContent = longDate(TODAY);
    $("streak-home").innerHTML = streakHtml(S.streak(state.sets, state.goal, TODAY));
    $("streak-home").setAttribute("aria-label", "Streak: " + plural(S.streak(state.sets, state.goal, TODAY), "week"));
    $("today-total").textContent = tt;
    $("today-best").textContent = tt ? "Best set " + S.bestSet(state.sets, TODAY) : "Best set -";
    const y = $("yday-total");
    y.className = "figure figure--s num" + (yt ? "" : " figure--nodata");
    y.textContent = yt ? yt : "No data";
    $("yday-best").textContent = yt ? "Best set " + S.bestSet(state.sets, yesterday) : "";
    $("gap").textContent = !yt ? (tt ? "Nothing from yesterday to compare." : "No sets yet. Add your first set below.")
      : tt < yt ? (yt - tt) + " to match yesterday." : tt === yt ? "Level with yesterday." : (tt - yt) + " past yesterday.";
    const bar = $("bar");
    bar.style.setProperty("--p", yt ? Math.min(tt / yt, 1) : 0);
    bar.classList.toggle("is-past", yt > 0 && tt > yt);
    $("entry-home").dataset.date = TODAY;
    setsList($("sets-home"), TODAY, "No sets yet today. Enter your first set above.");
  }

  function renderMonth() {
    const dates = Object.keys(S.totals(state.sets)).sort();
    const cur = TODAY.slice(0, 7), earliest = dates.length ? dates[0].slice(0, 7) : cur;
    const key = state.y + "-" + String(state.m).padStart(2, "0");
    $("prev").disabled = key <= earliest;
    $("next").disabled = key >= cur;
    $("month-title").textContent = new Date(Date.UTC(state.y, state.m - 1, 1)).toLocaleDateString("en-GB", { month: "long", year: "numeric", timeZone: "UTC" });
    const n = S.streak(state.sets, state.goal, TODAY);
    $("streak-month").innerHTML = streakHtml(n) + `<span>in a row</span>`;
    const grid = S.monthCells(state.sets, state.goal, state.y, state.m, TODAY);
    $("month-grid").innerHTML = grid.cells.map((c) => {
      if (!c.date) return `<span class="day day--blank" aria-hidden="true"></span>`;
      const label = shortDate(c.date) + ", " + (c.future ? "not available yet" : c.total ? c.total + " reps, level " + c.level + " of 4" + (c.flame ? ", week goal met" : "") : "no sets");
      return `<button class="day${c.today ? " day--today" : ""}" type="button" data-date="${c.date}" data-level="${c.level}" aria-label="${label}"${c.future ? " disabled" : ""}>`
        + `<span class="day__n num">${c.day}</span>`
        + (c.flame ? `<svg class="day__flame" width="12" height="12" aria-hidden="true"><use href="#flame"/></svg>` : "")
        + (c.total ? `<span class="day__reps num">${c.total}</span>` : "") + `</button>`;
    }).join("");
    $("legend-note").textContent = grid.best ? "Shaded against your best day, " + grid.best + " reps." : "Shading starts after your first set.";
  }

  function renderSettings() {
    $("goal-value").textContent = state.goal;
    $("goal-dec").disabled = state.goal <= 1;
    $("goal-inc").disabled = state.goal >= 7;
    $("export-note").textContent = "Last export: " + (state.lastExport ? new Date(state.lastExport).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" }) : "Never");
    $("row-restore").hidden = !state.backup;
  }

  let openDate = null;
  function renderDay() {
    if (!openDate) return;
    $("day-title").textContent = longDate(openDate);
    $("day-note").textContent = openDate < TODAY ? "Adding a set here fills in a past day." : "";
    $("entry-day").dataset.date = openDate;
    setsList($("sets-day"), openDate, "No sets this day. Add one below.");
  }

  function render() { renderHome(); renderMonth(); renderSettings(); renderDay(); }

  // add a set; the date is read at submit time (a real build recomputes today here too)
  function addSet(form, err) {
    const input = form.elements.reps, raw = input.value.trim();
    if (!/^[0-9]+$/.test(raw) || +raw < 1 || +raw > 9999) { err.textContent = "Enter a whole number from 1 to 9999."; input.focus(); return; }
    err.textContent = "";
    state.sets.push(mk(form.dataset.date, +raw));
    input.value = "";
    render();
    input.focus();
  }
  $("entry-home").addEventListener("submit", (e) => { e.preventDefault(); addSet(e.target, $("err-home")); });
  $("entry-day").addEventListener("submit", (e) => { e.preventDefault(); addSet(e.target, $("err-day")); });

  // edit and delete
  let editing = null;
  function openEdit(id) {
    editing = state.sets.find((s) => s.id === id);
    if (!editing) return;
    $("reps-edit").value = editing.reps;
    $("err-edit").textContent = "";
    $("edit-sheet").showModal();
    $("reps-edit").select();
  }
  document.addEventListener("click", (e) => {
    const row = e.target.closest(".sets button[data-id]");
    if (row) openEdit(row.dataset.id);
    const close = e.target.closest("[data-close]");
    if (close) close.closest("dialog").close();
    const day = e.target.closest(".day[data-date]");
    if (day && !day.disabled) { openDate = day.dataset.date; renderDay(); $("err-day").textContent = ""; $("day-sheet").showModal(); }
  });
  $("day-sheet").addEventListener("close", () => { openDate = null; });
  $("edit-form").addEventListener("submit", (e) => {
    e.preventDefault();
    const raw = $("reps-edit").value.trim();
    if (!/^[0-9]+$/.test(raw) || +raw < 1 || +raw > 9999) { $("err-edit").textContent = "Enter a whole number from 1 to 9999."; return; }
    editing.reps = +raw;
    $("edit-sheet").close();
    render();
  });

  // confirm dialog
  let onOk = null;
  function ask(title, body, okLabel, fn) {
    $("confirm-title").textContent = title;
    $("confirm-body").textContent = body;
    $("confirm-ok").textContent = okLabel;
    onOk = fn;
    $("confirm-sheet").showModal();
  }
  $("confirm-ok").addEventListener("click", () => { $("confirm-sheet").close(); if (onOk) onOk(); });
  $("edit-delete").addEventListener("click", () => {
    const target = editing;
    ask("Delete this set?", "This removes the set and updates the totals.", "Delete", () => {
      state.sets = state.sets.filter((s) => s !== target);
      $("edit-sheet").close();
      render();
    });
  });

  // month navigation
  $("prev").addEventListener("click", () => { state.m--; if (state.m < 1) { state.m = 12; state.y--; } renderMonth(); });
  $("next").addEventListener("click", () => { state.m++; if (state.m > 12) { state.m = 1; state.y++; } renderMonth(); });

  // weekly goal, with the old and new streak shown before it applies
  function changeGoal(g) {
    const from = S.streak(state.sets, state.goal, TODAY), to = S.streak(state.sets, g, TODAY);
    ask("Change the weekly goal to " + plural(g, "day") + "?", "Your streak goes from " + plural(from, "week") + " to " + plural(to, "week") + ". The goal applies to every week, past and present.", "Change goal", () => { state.goal = g; render(); });
  }
  $("goal-dec").addEventListener("click", () => { if (state.goal > 1) changeGoal(state.goal - 1); });
  $("goal-inc").addEventListener("click", () => { if (state.goal < 7) changeGoal(state.goal + 1); });

  // export: a real file download
  $("export").addEventListener("click", () => {
    state.lastExport = Date.now();
    const data = { schemaVersion: 1, settings: { weeklyGoal: state.goal, lastExportAt: state.lastExport }, sets: state.sets };
    const a = document.createElement("a");
    a.href = URL.createObjectURL(new Blob([JSON.stringify(data, null, 2)], { type: "application/json" }));
    a.download = "pushup-tracker-" + new Date().toISOString().slice(0, 10) + ".json";
    a.click();
    URL.revokeObjectURL(a.href);
    renderSettings();
  });

  // import: validate everything, then confirm, then replace (the old data is kept for one undo)
  function validate(text) {
    if (text.length > 2000000) return "The file is larger than 2 MB.";
    let d;
    try { d = JSON.parse(text); } catch (x) { return "The file is not valid JSON."; }
    if (!d || d.schemaVersion !== 1 || !Array.isArray(d.sets) || !d.settings) return "The file is not a push-up export from this app.";
    if (d.sets.length > 20000) return "The file has more than 20,000 sets.";
    const g = d.settings.weeklyGoal;
    if (!Number.isInteger(g) || g < 1 || g > 7) return "The weekly goal in the file is out of range.";
    const ids = new Set();
    for (const s of d.sets) {
      if (typeof s.id !== "string" || ids.has(s.id)) return "A set id is missing or repeated.";
      ids.add(s.id);
      if (s.exerciseId !== "pushup") return "A set has an unknown exercise.";
      if (!Number.isInteger(s.reps) || s.reps < 1 || s.reps > 9999) return "A set has reps outside 1 to 9999.";
      if (typeof s.date !== "string" || !/^[0-9]{4}-[0-9]{2}-[0-9]{2}$/.test(s.date) || S.toS(S.toN(s.date)) !== s.date || s.date > TODAY) return "A set has an invalid or future date.";
    }
    return d;
  }
  $("import-file").addEventListener("change", (e) => {
    const f = e.target.files[0];
    $("err-import").textContent = "";
    if (!f) return;
    f.text().then((text) => {
      const d = validate(text);
      if (typeof d === "string") { $("err-import").textContent = d + " Nothing was changed."; return; }
      ask("Replace all current data with this file?", "Your current data is kept once, so you can restore it from Settings.", "Replace", () => {
        state.backup = { goal: state.goal, sets: state.sets, lastExport: state.lastExport };
        state.goal = d.settings.weeklyGoal; state.sets = d.sets; render();
      });
    });
    e.target.value = "";
  });
  $("restore").addEventListener("click", () => ask("Restore previous data?", "This swaps your current data for the data from before the last import.", "Restore", () => {
    const b = state.backup; state.backup = { goal: state.goal, sets: state.sets, lastExport: state.lastExport };
    state.goal = b.goal; state.sets = b.sets; state.lastExport = b.lastExport; render();
  }));

  // tabs, from the URL hash
  function route() {
    const v = ["home", "month", "settings"].includes(location.hash.slice(1)) ? location.hash.slice(1) : "home";
    ["home", "month", "settings"].forEach((n) => { $("view-" + n).hidden = n !== v; });
    document.querySelectorAll(".tabs a").forEach((a) => { if (a.dataset.tab === v) a.setAttribute("aria-current", "page"); else a.removeAttribute("aria-current"); });
    scrollTo(0, 0);
  }
  addEventListener("hashchange", route);

  $("first-run").hidden = !modes.includes("first");
  $("update").hidden = !modes.includes("update");
  $("reload").addEventListener("click", () => { $("update").hidden = true; });
  render();
  route();
})();
