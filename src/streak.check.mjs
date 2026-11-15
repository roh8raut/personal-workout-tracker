import assert from "node:assert/strict";
import { createRequire } from "node:module";
const S = createRequire(import.meta.url)("./streak.js");
let id = 0;
const set = (date, reps) => ({ id: String(++id), exerciseId: "pushup", reps, date });
const days = (dates, reps = 10) => dates.map((d) => set(d, reps));

// Level boundaries: a ratio exactly on a boundary goes to the lower level
assert.equal(S.level(25, 100), 1); assert.equal(S.level(26, 100), 2);
assert.equal(S.level(50, 100), 2); assert.equal(S.level(75, 100), 3);
assert.equal(S.level(76, 100), 4); assert.equal(S.level(100, 100), 4);
assert.equal(S.level(0, 100), 0); assert.equal(S.level(5, 0), 0); // empty history: no shading, no divide

// Two met weeks (Jan 26, Feb 2), current week Mon to Wed: streak 2 on Friday
const prev = days(["2026-01-26", "2026-01-27", "2026-01-28", "2026-01-29", "2026-01-30", "2026-02-02", "2026-02-03", "2026-02-04", "2026-02-05", "2026-02-06"]);
const wk = days(["2026-02-09", "2026-02-10", "2026-02-11"]);
assert.equal(S.streak([...prev, ...wk], 5, "2026-02-13"), 2);
// Fri and Sat logged: current week reaches 5 active days, streak 3
assert.equal(S.streak([...prev, ...wk, ...days(["2026-02-13", "2026-02-14"])], 5, "2026-02-14"), 3);
// Failed week: ends the run. Week of Feb 9 completes with 4 active days, checked on Monday Feb 16
assert.equal(S.streak([...prev, ...wk, ...days(["2026-02-13"])], 5, "2026-02-16"), 0);
// New install: partial first week is never a failure, streak 0 with nothing met
assert.equal(S.streak(days(["2026-02-11"]), 5, "2026-02-11"), 0);
assert.equal(S.streak([], 5, "2026-02-11"), 0);
// Unmet first week is skipped, later met weeks still count
assert.equal(S.streak([...days(["2026-01-19", "2026-01-20"]), ...prev], 5, "2026-02-09"), 2);

// CUJ 8: today Sun 2026-02-15, goal 5, best day 80 (Tue Jan 20)
const cuj8 = [set("2026-01-20", 80), set("2026-02-09", 20), set("2026-02-10", 10), set("2026-02-11", 40), set("2026-02-12", 60), set("2026-02-14", 30)];
assert.equal(S.streak(cuj8, 5, "2026-02-15"), 1);
let feb = S.monthCells(cuj8, 5, 2026, 2, "2026-02-15");
const cell = (m, d) => m.cells.find((c) => c.date === d);
assert.deepEqual([20, 10, 40, 60, 30].map((_, i) => cell(feb, ["2026-02-09", "2026-02-10", "2026-02-11", "2026-02-12", "2026-02-14"][i]).level), [1, 1, 2, 3, 2]);
assert.ok(cell(feb, "2026-02-14").flame && !cell(feb, "2026-02-13").flame && !cell(feb, "2026-02-15").flame);
assert.ok(cell(feb, "2026-02-16").future && feb.cells.length % 7 === 0);
// Editing the 80 down to 8 makes Thu 60 the best day and re-shades the month
const fixed = cuj8.map((s) => (s.reps === 80 ? { ...s, reps: 8 } : s));
feb = S.monthCells(fixed, 5, 2026, 2, "2026-02-15");
assert.deepEqual(["2026-02-09", "2026-02-10", "2026-02-11", "2026-02-12", "2026-02-14"].map((d) => cell(feb, d).level), [2, 1, 3, 4, 2]);
assert.equal(S.streak(fixed, 5, "2026-02-15"), 1);
// Jan 20 week is the first week and was not met: no flame
assert.ok(!cell(S.monthCells(cuj8, 5, 2026, 1, "2026-02-15"), "2026-01-20").flame);
console.log("streak checks pass");
