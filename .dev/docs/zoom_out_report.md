Isolation: Kiro sub-agent with its own conversation context. Shares workspace, steering, and default resources. Not a clean-room environment.

# Stage 5: Initial Zoom Out Report

**Target:** `.dev/docs/design_draft.md` (full file)
**Reviewer:** `egm-zoom-out` (separate sub-agent)
**Standard:** `zoom-out-standard.md`
**Scope note:** The workspace has no source files, `README.md`, or `context.md`. Codebase reuse and project alignment could not be checked. The reviewer cited sections, not line numbers.

## Verdict

No Blockers. Objective is clear. Derive-on-read, one `localStorage` key, and no framework or build step fit the standard.

## 🔴 Blocker

None.

## 🟡 Major

### 1. Speculative export fallback chain
* **Scope:** Alternatives (Export mechanism), Architecture (Export and import), R7, G9, CUJ 5, CUJ 6
* **Finding:** Three export paths (Blob anchor, Web Share, clipboard) plus a pasted-text import path, all for iOS behavior the doc calls "unverified".
* **Recommendation:** Ship Blob download, test on a real iPhone (Q11), add a fallback only if it fails. Removes a UI surface, a code path, and part of import validation.

### 2. Altitude drop into code-level detail
* **Scope:** Monthly View Rules (Level), Architecture (`monthGrid`), Date handling
* **Finding:** The doc gives the integer formula `total * 4 <= best * k`, the full `monthGrid(...)` signature, the per-cell field list, and UTC date arithmetic.
* **Recommendation:** Keep behavioral rules (boundaries belong to the lower level, no divide-by-zero on empty history). Move formula and signature to code and tests.

### 3. Backfill overlaps the day-tap flow
* **Scope:** G13, G14, CUJ 7, CUJ 8, R4
* **Finding:** Adding a set to a past day via the day sheet already covers "forgot to log yesterday". G13 also adds moving an existing set's date, with its own validation, confirm step (R4), and CUJ.
* **Recommendation:** Cut date-edit, or state why moving a set between dates is needed.

## 🟢 Nit

4. **Architecture reads as a patch note.** "The file layout does not change. `streak.js` gains one pure function…" refers to a prior state never described. Fold `monthGrid` into the `streak.js` description.
5. **`exerciseId` vs Non-Goal.** G8 stores a field for exercises v1 will not build. Justify it as deliberate or drop it. CUJ 9 should not use it as an install-flow check.
6. **Corruption handling heavier than needed (R1).** The `pushup-tracker:corrupt` key and raw-value export flow are more than try/catch, start empty, and show a message.
7. **Manual cache-version bump.** A forgotten bump is the R2 failure. Note it as a known sharp edge, or derive the version from a file hash if a deploy step appears.
8. **Weak "why" in The Problem.** Two sentences, no gap analysis of existing free trackers. G4 mentions a "generic contribution grid" never introduced.
9. **Ambiguous or leftover wording.**
   * "Swipe optional" (G14, Monthly View Rules): decide yes or no.
   * Open Questions has only "Q11"; renumber to Q1.
   * CUJ 8 says "3 weeks ago, in last month", which is not always true. Say "last month".
10. **Streak rule special cases.** First-week skip and current-week +1 are two branches. Confirm the R8 assert-check covers each.

## Pipeline note

No `## Detailed Implementation Plan` (or synonym) header exists. `FeatureRange = 1..End`, `DetailedRange = N/A`. Stage 9 (Implementation Readiness) has no target range and will be skipped. Stages 6, 7, 8 remain.
