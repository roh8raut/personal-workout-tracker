// Pure logic, no DOM or storage. Rules: .dev/docs/design_draft.md (Streak Rules, Monthly View Rules).
(function (root) {
  const DAY = 86400000;
  const toN = (s) => { const p = s.split("-").map(Number); return Date.UTC(p[0], p[1] - 1, p[2]) / DAY; };
  const toS = (n) => new Date(n * DAY).toISOString().slice(0, 10);
  const weekStart = (n) => n - ((new Date(n * DAY).getUTCDay() + 6) % 7); // Monday

  function totals(sets) {
    const t = {};
    for (const s of sets) if (s.exerciseId === "pushup") t[s.date] = (t[s.date] || 0) + s.reps;
    return t;
  }
  function bestSet(sets, date) {
    return Math.max(0, ...sets.filter((s) => s.exerciseId === "pushup" && s.date === date).map((s) => s.reps));
  }
  function bestDay(t) { return Math.max(0, ...Object.values(t)); }
  // ratio <= 25% -> 1, <= 50% -> 2, <= 75% -> 3, else 4; a boundary goes to the lower level
  function level(total, best) {
    if (!total || !best) return 0;
    for (let k = 1; k <= 3; k++) if (total * 4 <= best * k) return k;
    return 4;
  }
  function weekMet(t, ws, goal) {
    let active = 0;
    for (let i = 0; i < 7; i++) if (t[toS(ws + i)] > 0) active++;
    return active >= goal;
  }
  function streak(sets, goal, today) {
    const t = totals(sets);
    const dates = Object.keys(t);
    if (!dates.length) return 0;
    const cur = weekStart(toN(today));
    const first = weekStart(Math.min(...dates.map(toN)));
    let n = 0;
    for (let w = cur - 7; w >= first; w -= 7) {
      if (weekMet(t, w, goal)) n++;
      else if (w !== first) break; // an unmet first week is skipped, any other unmet week ends the run
    }
    return n + (weekMet(t, cur, goal) ? 1 : 0);
  }
  // month is 1 to 12. Monday-first cells; null date = blank padding cell.
  function monthCells(sets, goal, year, month, today) {
    const t = totals(sets), best = bestDay(t), todayN = toN(today);
    const first = Date.UTC(year, month - 1, 1) / DAY;
    const len = new Date(Date.UTC(year, month, 0)).getUTCDate();
    const cells = [];
    for (let i = 0; i < (new Date(first * DAY).getUTCDay() + 6) % 7; i++) cells.push({ date: null });
    for (let d = 0; d < len; d++) {
      const n = first + d, date = toS(n), total = t[date] || 0;
      cells.push({ date, day: d + 1, total, level: level(total, best), flame: total > 0 && weekMet(t, weekStart(n), goal), future: n > todayN, today: n === todayN });
    }
    while (cells.length % 7) cells.push({ date: null });
    return { cells, best };
  }
  const api = { toN, toS, totals, bestSet, bestDay, level, streak, monthCells };
  if (typeof module !== "undefined") module.exports = api; else root.Streak = api;
})(this);
