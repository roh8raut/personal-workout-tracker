Isolation: Kiro sub-agent with its own conversation context. Shares workspace, steering, and default resources. Not a clean-room environment.

# Goldfish Review Report

**Target:** `.dev/docs/design_draft.md` (full file, Stages 6 and 7)
**Status:** resolved. Owner chose "Resolve findings with agent" with default decisions. Edits applied to the target; no further review stages run. Full detail is in `comprehension_report.md` (Stage 6) and `critic_report.md` (Stage 7).

## Resolution Summary

*   **PROPOSE FIX applied (all Blockers and Majors above):** UI Behavior and Install Checklist added; Alternatives rows added (shading, week type, single key, SW strategy, build vs reuse, backfill); R10 security/scale with byte arithmetic; G15 and CUJ 10 (resume); G16, CUJ 11, `_headers` and CUJ 4 reworded (service worker); import validation, backup key, `lastExportAt` and unknown `schemaVersion` defined; pass/fail rules and failure decisions on R5 to R7; month navigation bounds; precache list; Problem expanded; Assumptions its own H2; CUJ 3 and CUJ 8 rewritten.
*   **ESCALATE resolved by owner:** goal change and backfill rewrite history (confirm with old/new streak, no goal history); import backup and validation; resume recompute; SW prompt; security entry; Sunday cliff accepted; UI section.
*   **Stage 5 cuts applied:** Blob-only export (no Web Share, clipboard, paste import, raw-value export); code-level detail removed from the doc; saved-set date move dropped (backfill = add on past day); Q11 renumbered to Q1 as a validation task; no swipe; R1 simplified.
*   **Nits applied:** "month view" used consistently; "completed-week count" replaced by "streak"; "Gemini" and the "Drafted with EGM" footer removed.
*   **CONTEST:** 0. **DECLINE:** 0.

## Remaining

*   Q1 / R5 to R7: real-iPhone tests not yet run.
*   Visual design is deferred to the separate design phase.
*   Edits were not re-reviewed by Goldfish (by instruction).

## Prioritized Findings (Blockers -> Major -> Nits)

### Stage 6 Blockers (comprehension) - Severity: Blocker
*   **Reviewer Lens:** `egm-comprehension`
*   **Affected Scope:** G1-G3, G5, G7, Proposed Architecture
*   **Discrepancy Description**: (1) No settings UI and no statement that a goal change re-evaluates history. (2) Home screen, set entry, delete confirmation and "today's best set" with no sets are unspecified. (3) Only `monthGrid` is signed in `streak.js`; `month` base unstated. (4) iOS install requirements (manifest, meta tags, icons, SW scope) absent.
*   **Rationale & Recommendation**: A fresh implementer must guess. Add a short UI behavior section and an install checklist, or explicitly mark them as implementer discretion.

### Alternatives Rule partly met - Severity: Major
*   **Reviewer Lens:** `egm-design`, `egm-structural`
*   **Affected Scope:** Alternatives Considered
*   **Discrepancy Description**: No rejected options for shading, calendar vs rolling week, storage key, SW strategy, or build vs reuse.
*   **Rationale & Recommendation**: Add rows with concrete rejection reasons.

### No security or scalability coverage - Severity: Major
*   **Reviewer Lens:** `egm-design`, `egm-structural`
*   **Affected Scope:** Risks & Mitigations, Export and import
*   **Discrepancy Description**: Untrusted import, render safety, size caps, CSP and scale ceiling not addressed.
*   **Rationale & Recommendation**: Add one risk entry or state why not applicable.

### Goal change and first-week shift rewrite history - Severity: Major
*   **Reviewer Lens:** `egm-design`, `egm-comprehension`
*   **Affected Scope:** G5, Streak Rules, R4
*   **Discrepancy Description**: A single global goal re-evaluates all past weeks; backfill moves the first week.
*   **Rationale & Recommendation**: Declare it intended (with a confirm showing old and new streak) or store goal history.

### Stale "today" on resume - Severity: Major
*   **Reviewer Lens:** `egm-design`, `egm-comprehension`
*   **Affected Scope:** Date handling, G3
*   **Discrepancy Description**: No recompute on `visibilitychange`/`pageshow` or before save.
*   **Rationale & Recommendation**: Add a requirement and a CUJ.

### Service worker update path on iOS - Severity: Major
*   **Reviewer Lens:** `egm-design`, `egm-comprehension`
*   **Affected Scope:** Service worker, R2, CUJ 4
*   **Discrepancy Description**: Update may lag for days; `sw.js` cache headers unchecked; CUJ 4 "no network request" is inaccurate.
*   **Rationale & Recommendation**: Specify `sw.js` headers, optional update prompt, reword CUJ 4.

### Data-loss safeguards and import validation - Severity: Major
*   **Reviewer Lens:** `egm-design`, `egm-comprehension`
*   **Affected Scope:** Import, R1, R5, G10
*   **Discrepancy Description**: No pre-import safety net; validation gaps (duplicate ids, date format, `exerciseId`, size, device-clock future check); unknown `schemaVersion` on load; `lastExportAt` semantics.
*   **Rationale & Recommendation**: Stash pre-import data or auto-export; complete the validation list.

### Backfill requirements inconsistent - Severity: Major
*   **Reviewer Lens:** `egm-design`, `egm-comprehension`
*   **Affected Scope:** G13, Monthly View Tap, CUJ 7, R4
*   **Discrepancy Description**: G13 vs today allowed; add-on-past-day has no goal; R4 confirm step has no counterpart.
*   **Rationale & Recommendation**: Restate G13, define or remove the confirm step.

### iOS unverified assumptions lack exit criteria - Severity: Major
*   **Reviewer Lens:** `egm-design`
*   **Affected Scope:** Open Questions, R5-R7
*   **Discrepancy Description**: No pass/fail criteria or decision on failure.
*   **Rationale & Recommendation**: Add criteria and the fallback decision per test.

### Problem section, leftover text, Assumptions placement, jargon, CUJ 3 and CUJ 8 - Severity: Major
*   **Reviewer Lens:** `egm-style`, `egm-structural`, `egm-design`, `egm-comprehension`
*   **Affected Scope:** The Problem; Architecture ~205-207; lines 92-107; line 79; CUJ 3; CUJ 8
*   **Discrepancy Description**: See `critic_report.md` M9-M14.
*   **Rationale & Recommendation**: See `critic_report.md` M9-M14.

### Stage 6 Majors 5-12 not already listed - Severity: Major
*   **Reviewer Lens:** `egm-comprehension`
*   **Affected Scope:** Month navigation bounds (9); pasted-JSON import in no goal or CUJ (5); R1 raw-value export mechanism (5); deploy and precache list (11)
*   **Discrepancy Description**: Unspecified behavior.
*   **Rationale & Recommendation**: Specify or mark as implementer discretion.

### Nits - Severity: Nit
*   **Reviewer Lens:** all
*   **Affected Scope:** Whole file
*   **Discrepancy Description**: See `critic_report.md` Nits and `comprehension_report.md` items 13-18.
*   **Rationale & Recommendation**: Batch-fix.
