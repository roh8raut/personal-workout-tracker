import assert from "node:assert/strict";
import { createRequire } from "node:module";
const S = createRequire(import.meta.url)("./streak.js");
let id = 0;
const set = (date, reps = 10, exerciseId = "pushup") => ({ id: String(++id), exerciseId, reps, date });
const days = (dates, reps = 10) => dates.map((d) => set(d, reps));
const times = (n, date, exerciseId) => Array.from({ length: n }, () => set(date, 10, exerciseId));

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

// Calendar shading is by sets per day. Today Sun 2026-02-15, goal 5, best day = 4 sets (Tue Jan 20)
const cuj8 = [...times(4, "2026-01-20"), ...times(1, "2026-02-09"), ...times(1, "2026-02-10"), ...times(2, "2026-02-11"), ...times(3, "2026-02-12"), ...times(2, "2026-02-14")];
assert.equal(S.streak(cuj8, 5, "2026-02-15"), 1);
let feb = S.monthCells(cuj8, 5, 2026, 2, "2026-02-15");
const cell = (m, d) => m.cells.find((c) => c.date === d);
const wkDays = ["2026-02-09", "2026-02-10", "2026-02-11", "2026-02-12", "2026-02-14"];
assert.deepEqual(wkDays.map((d) => cell(feb, d).level), [1, 1, 2, 3, 2]);
assert.deepEqual(wkDays.map((d) => cell(feb, d).count), [1, 1, 2, 3, 2]);
assert.ok(cell(feb, "2026-02-14").flame && !cell(feb, "2026-02-13").flame && !cell(feb, "2026-02-15").flame);
assert.ok(cell(feb, "2026-02-16").future && feb.cells.length % 7 === 0);
// Deleting 3 of the 4 sets on Jan 20 makes Thu (3 sets) the best day and re-shades the month
const fewer = [...times(1, "2026-01-20"), ...cuj8.filter((s) => s.date !== "2026-01-20")];
feb = S.monthCells(fewer, 5, 2026, 2, "2026-02-15");
assert.deepEqual(wkDays.map((d) => cell(feb, d).level), [2, 2, 3, 4, 3]);
assert.equal(S.streak(fewer, 5, "2026-02-15"), 1);
// Jan 20 week is the first week and was not met: no flame
assert.ok(!cell(S.monthCells(cuj8, 5, 2026, 1, "2026-02-15"), "2026-01-20").flame);

// Exercises merge: any exercise makes a day active, and every set adds to the day's shade
const mixed = [...prev, ...days(["2026-02-09", "2026-02-10", "2026-02-11"]), set("2026-02-12", 90, "plank"), set("2026-02-13", 60, "plank")];
assert.equal(S.streak(mixed, 5, "2026-02-13"), 3); // 3 push-up days + 2 plank days = 5 active days
assert.equal(S.streak(mixed.filter((s) => s.exerciseId === "pushup"), 5, "2026-02-13"), 2); // without the planks the week is short
const both = [set("2026-02-12", 20), set("2026-02-12", 20), set("2026-02-12", 90, "plank")];
assert.equal(S.counts(both)["2026-02-12"], 3);
assert.equal(S.monthCells(both, 5, 2026, 2, "2026-02-15").best, 3);
// Home cards stay per exercise: totals and best set ignore the other exercise
assert.deepEqual(S.totals(mixed, "plank"), { "2026-02-12": 90, "2026-02-13": 60 });
assert.equal(S.bestSet(mixed, "2026-02-12", "plank"), 90);
assert.equal(S.bestSet(mixed, "2026-02-12"), 0);
console.log("streak checks pass");
