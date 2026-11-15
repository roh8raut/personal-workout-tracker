Isolation: Kiro sub-agent with its own conversation context. Shares workspace, steering, and default resources. Not a clean-room environment.

# Comprehension Report (Stage 6)

**Target:** `.dev/docs/design_draft.md` (full file)
**Reviewer lens:** `egm-comprehension`
**Standard:** `re-implementation-standard.md`
**Verdict:** FAIL on the Zero-Assumption Rule. The streak and month-view rules are precise and consistent. The UI, iOS install setup and `streak.js` contract are not specified enough to build from the document alone.

Line numbers are exact up to about line 165. After that, sections are named and lines are approximate.

## Blockers

1. **Settings screen and goal change (line 61, G5).** No settings UI is described. The doc does not say that changing the weekly goal re-evaluates all past weeks, flames and streak. The goal is one global value with no per-week history.
2. **Home screen and set-entry UI unspecified (G1, G2, G3, CUJ 1, CUJ 2).** Input control, layout, set ordering and invalid-entry handling are missing. G1's "three taps" is not mapped to taps. Delete confirmation is not stated. "Today's best set" with no sets today is undefined, while yesterday's "no data" is defined (line 103).
3. **`streak.js` contract incomplete (Proposed Architecture, ~lines 215-222).** Only `monthGrid` is signed. Totals, streak, best-day and yesterday functions are unnamed. `month` is not stated as 0- or 1-based. Return field names for best day and streak are unnamed.
4. **iOS PWA install requirements missing (G7, CUJ 9, File layout).** Manifest fields, Safari meta and link tags, icon filenames and sizes, and service-worker registration path and scope are absent.

## Majors

5. **Export, import and `lastExportAt` (G9, G10, G12, CUJ 5, CUJ 6, Export and import).** `lastExportAt` inside the exported file is stale, and import's effect on the local value is not stated. Export filename is unspecified. Import validation terms ("settings in range", "valid date") are undefined. Duplicate ids and an `exerciseId` allow-list are not addressed. CUJ 6(b) names "negative or non-integer rep count" but the architecture also rejects 0 and over 9999. Pasted-JSON import is in no Goal or CUJ. The R1 "offer export of raw value" mechanism is undefined, and repeated corruption would overwrite the corrupt key.
6. **R4 "confirm step" has no counterpart in G13 or CUJ 7.** The date-picker UI and any lower bound on past dates are unspecified.
7. **First-week rule (lines 67, 105).** The backward walk is not precisely defined. Empty weeks after the first week count as failed only by implication. Backfilling an earlier set moves the "first week" and can change the streak.
8. **Day rollover unspecified.** The doc does not say whether today, yesterday and the streak refresh when the app stays open or resumes past midnight (Date handling).
9. **Month navigation bounds unspecified (lines 83-90).** Next-month and previous-month limits, and taps on blank padding cells.
10. **CUJ 8 (lines 161-170) is not deterministic.** The other three active days' totals are missing. "3 weeks ago, in last month" is not guaranteed. Step (c) is conditional ("If Wed's 40 is now the highest").
11. **Service worker and deploy.** No mechanism for the cache-version bump. Cloudflare Pages deploy procedure not described. Precache list is "files listed above" with no icon filenames. Fetch fallback for non-shell or navigation requests undefined.
12. **Stored data with unknown or newer `schemaVersion`.** Only import rejects unknown versions. Load behavior is not specified.

## Nits

13. Accessibility wording is vague: "border or numeral" leaves the choice open, no palette, locale-dependent label date format, no mechanism for the month-title announcement, hedged "44 px where the screen width allows".
14. Undefined or unlinked terms: app shell, precache, Web Share API, Blob, QuotaExceededError, DST, Cloudflare Pages, "Gemini" (line 47). "CUJ" is expanded only in a heading.
15. G4 refers to G14 before it is defined. Q11 is the only open question with no Q1-Q10. "Assumptions" is an H3 under "Open Questions".
16. Line 79: "completed-week count is 0" is undefined jargon; "streak resets to 0" matches the rule at line 64.
17. "The Problem" is one sentence and repeats the Overview and Approach.
18. The id `"uuid"` is a placeholder. Generation method and import validation of the format are not stated.

## Checked and consistent

- Streak rule (line 64) matches the worked example and CUJ 3.
- Integer comparison at line 86 matches the 25%, 50% and 75% boundaries.
- Flame rules (line 89) match CUJ 8.
- The `createdAt` sample is a valid epoch for 2026-01-01.
