Isolation: Kiro sub-agent with its own conversation context. Shares workspace, steering, and default resources. Not a clean-room environment.

# Critic Report (Stage 7)

**Target:** `.dev/docs/design_draft.md` (full file, FeatureRange 1..End)
**Reviewers:** `egm-design`, `egm-structural`, `egm-style` (dispatched separately, merged and deduplicated by the Elephant per `agents/synthesizer.md`)
**Standard:** `feature-spec-standard.md` (design, structural); style has no standard.
**Result:** 0 Blockers, 14 Majors, 6 Nit groups. Lines after about 152 are approximate.

## Blockers

None.

## Majors

### M1. Alternatives Rule only partly met
*   **Lenses:** design, structural. **Scope:** Alternatives Considered table, Streak Rules, Monthly View Rules.
*   Rejected options are missing for the highest-impact choices: relative-to-best-day shading (absolute thresholds, capped or percentile baseline), calendar Mon-Sun weeks vs a rolling 7-day window, single-key storage, cache-first vs stale-while-revalidate, local vs UTC weeks. The Hosting row calls the options "equivalent" and gives no rejection reason. Build vs reuse an existing free tracker or an iOS Shortcut is not addressed.

### M2. No security or scalability section
*   **Lenses:** design, structural. **Scope:** Risks & Mitigations, Export and import.
*   The standard requires security implications. The app imports untrusted JSON and pasted text and renders user data. Missing: render with `textContent`, key whitelist and `__proto__` rejection, file size and set-count cap, HTTPS and CSP on the host, clipboard-fallback privacy, a stated scale ceiling for "derived on every read".

### M3. Changing `weeklyGoal` or backfilling an earlier set rewrites history
*   **Lenses:** design (also comprehension 1, 7). **Scope:** G5, Streak Rules, Storage.
*   Everything derives from the single current goal. Raising 5 to 6 can turn past met weeks into failed ones, drop the streak to 0 and remove flames. Adding or importing an earlier set moves the "first week", so a skipped partial week can become a failure, and a gap of empty weeks can become a run of failures. R4 covers only date edits.

### M4. Stale "today" while the PWA stays resident
*   **Lenses:** design (also comprehension 8). **Scope:** Date handling, G3.
*   iOS suspends standalone PWAs for days. Nothing says the UI recomputes today and yesterday on `visibilitychange` or `pageshow`, or before a save. A set could be saved against the wrong date.

### M5. Service worker update path is weak on iOS
*   **Lenses:** design (also comprehension 11). **Scope:** Service worker, R2, CUJ 4.
*   "Takes over on the next full app launch" may be days on iOS. `sw.js` needs `Cache-Control: no-cache` or the HTTP cache delays update detection; Cloudflare Pages defaults are not checked. No in-app update prompt. CUJ 4's "no network request" ignores the browser's own sw.js update check.

### M6. Data-loss safeguards and import validation gaps
*   **Lenses:** design (also comprehension 5, 12). **Scope:** Import, R1, R5, G10, Assumptions.
*   `localStorage` is the only copy and import replaces everything with no safety net (no pre-import stash or auto-export). G10 shows a date only, not staleness. Validation gaps: duplicate ids, date format, `exerciseId` allow-list, `lastExportAt` type, file size, and "date not in the future" judged against the importing device's clock. Load of a newer `schemaVersion` is unspecified.

### M7. Backfill requirements are inconsistent
*   **Lenses:** design (also comprehension 6). **Scope:** G13, Monthly View Tap, CUJ 7, R4.
*   G13 says "past date" but the architecture accepts today. Tap says add-on-past-day follows "G13 rules", but G13 covers editing an existing set only. R4 cites a confirm step that G13 and CUJ 7 do not have.

### M8. Unverified iOS assumptions gate core goals with no exit criteria
*   **Lenses:** design. **Scope:** Open Questions, R5 to R7, G6, G7, G9.
*   G9 (one-tap export), G7 and offline claims depend on tests with no pass or fail criteria and no stated decision if a test fails. The R6 first-run message is not a goal or CUJ.

### M9. "The Problem" is one sentence and mislabeled
*   **Lenses:** style, structural, design. **Scope:** lines 24-27.
*   Standard calls it "Problem Statement". "A streak that tolerates a missed day" is vague (it tolerates 2 days at goal 5, none at goal 7) and does not say why existing apps fail.

### M10. Leftover revision text and dense architecture paragraph
*   **Lenses:** style, structural, design. **Scope:** Proposed Architecture, ~lines 205-207.
*   "The file layout does not change. `streak.js` gains one pure function..." is revision-history language with no referent. The paragraph is a run-on covering signature, return shape and rules.

### M11. Assumptions and Open Questions structure
*   **Lenses:** structural, style, design. **Scope:** lines 92-107.
*   Assumptions is an H3 under Open Questions but holds settled decisions, and line 94 points back to it (circular). "Q11" has no Q1-Q10. The item is a validation task pointing to R5-R7, not a question.

### M12. "Completed-week count is 0" is undefined jargon
*   **Lenses:** style (also comprehension 16). **Scope:** line 79.
*   Conflicts with the streak definition (line 64). Use "streak" throughout.

### M13. CUJ 3 carries a non-requirement and a conclusion inside "Given"
*   **Lenses:** style, design. **Scope:** CUJ 3, lines 126 and 130.
*   "Goal can no longer be met; not shown as a special state" is unverifiable as a spec. The Sunday-with-3-days cliff (streak 2 until midnight, then 0, no warning) is a product choice not recorded in Non-Goals. The "Given" states a conclusion ("so it adds nothing").

### M14. CUJ 8 is not deterministic
*   **Lenses:** design (also comprehension 10). **Scope:** CUJ 8, ~lines 158-170.
*   Totals for the other three active days are missing, "3 weeks ago, in last month" holds only for some dates, and step (c) is conditional ("If Wed's 40 is now the highest").

## Nits

*   **Structure and format:** section order (Alternatives at 177 before Architecture at 189; standard lists Architecture first); R1 to R9 use different templates; label colon inside bold for metadata and Goals but outside for CUJs; file-layout code fence has no language tag; Accessibility H3 covers the month view only and has no goal; Overview Approach restates Goals and risks drifting; G14 is a long paragraph unlike G1-G13.
*   **Wording:** "small", "trivial", "a few hundred lines", "a few taps" (redundant with G1), "so the target is visible on open", "equivalent here", "extra setup; not worth it", "this is intended", "Export is the safety net", "far below the quota; the check is defensive", "where the screen width allows", "border or numeral" (pick one).
*   **Leftover or stray text:** G4 "replaces the generic contribution grid"; "Gemini" in Non-Goals (line 47); "*Drafted with EGM*" footer.
*   **Unsourced figures:** "about 7 days" and "reported to be exempt" (R5), "5 MB" limit, "a few thousand short records per year". Give per-set bytes arithmetic (about 110 bytes x about 5,000 sets = about 0.55 MB; the R1 corrupt-key copy doubles it).
*   **G8 gap:** derived functions take no `exerciseId`, so a second exercise would mix into push-up totals.
*   **Terminology:** "monthly view" vs "month view"; "set list" vs "day sheet" vs "day's sets".

## Not verified

No reviewer tested iPhone or browser behavior. Safari-tab vs installed-app storage, eviction rules and download behavior are the draft's claims.
