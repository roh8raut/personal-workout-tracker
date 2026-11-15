# Push-up Tracker PWA

*   **Author:** Rohit Raut
*   **Status:** Draft
*   **Date:** 2026-01-01

--------------------------------------------------------------------------------

## Overview

A personal push-up tracker that runs as an installable web app (PWA, progressive web app) on the owner's iPhone. The user logs sets of push-ups during the day. The app shows the day's total and best set, the previous day's numbers as a target, and a weekly streak with a month view shaded by each day's reps relative to the owner's best day. All data stays on the phone. The app is hosted for free on a static host and installed through Safari "Add to Home Screen". No native app, no App Store, no paid account.

### Approach

A small offline-capable web app built by the owner in plain HTML, CSS, and vanilla JavaScript (no framework, no build step, no dependencies), hosted on Cloudflare Pages:

*   Logging a set takes a few taps.
*   The home screen shows yesterday's total and best set next to today's running total, so the target is visible on open.
*   The streak counts consecutive weeks in which the weekly goal is met. The current week counts only once it has met the goal. A single missed day inside a week that still meets the goal does not affect it (see Streak Rules).
*   The month view shows one square per day, shaded relative to the owner's best day, with a flame on active days in weeks that met the goal.
*   Data lives in the browser's `localStorage` on the device. There is no server, account, or sync. A JSON export and import is the backup path.
*   Totals, the month view, the best day, and the streak are computed from the stored sets on every read. They are never stored.

## The Problem

The owner does push-ups on most days and wants to see how today compares with yesterday and whether the habit is holding. Daily-streak trackers reset to zero after one missed day, which punishes a normal week with a rest day. Many trackers also require an account, store data on a server, or charge a subscription. The owner wants a free tracker with no account, data kept on the phone, a streak that tolerates a missed day, and a view of the whole month at a glance. No such tracker has been selected; this design builds one (see Alternatives Considered).

## Goals

*   **G1:** Add a set (rep count) to today in at most three taps from opening the app.
*   **G2:** Edit the rep count of, or delete, any saved set.
*   **G3:** Show, on the home screen: today's running total, today's best set, yesterday's total, yesterday's best set.
*   **G4:** Show the current streak on the home screen and at the top of the month view (G14).
*   **G5:** Use a weekly streak with a configurable weekly goal (default 5 active days of 7). The current week counts only once it has met the goal. Rules in Streak Rules.
*   **G6:** Work fully offline after the first load, via a service worker that caches the app shell.
*   **G7:** Install on iPhone from Safari ("Add to Home Screen") and open full-screen. Install requirements in Install Checklist.
*   **G8:** Store each set with an exercise id, so more exercises can be added later without changing stored data. Derived values (totals, streak, month view) count only sets whose `exerciseId` is `pushup`.
*   **G9:** Export all sets and settings as one JSON file with one tap.
*   **G10:** Show the last export date.
*   **G11:** Cost nothing to run: static hosting on a free tier, no paid services.
*   **G12:** Import a JSON export to restore sets and settings, after a confirmation. An invalid file leaves existing data unchanged. Before an import replaces data, the current data is copied to a backup key so the import can be undone once.
*   **G13:** Backfill: add a set to a past day through the day sheet in the month view. Future days cannot be opened, so a set cannot be added to a future date. A saved set's date cannot be changed.
*   **G14:** Month view: a calendar for one month with Monday-to-Sunday columns and one square per day, navigated with previous and next month buttons. Each day is shaded by its total reps relative to the owner's best day. Active days in weeks that met the goal show a flame. The current streak shows at the top. Tapping a past or current day opens the day sheet for edit, delete, and add (reuses G2, G13). Rules in Monthly View Rules.
*   **G15:** Keep "today", "yesterday", and the streak correct after the app is left open or resumed: recompute them when the app becomes visible again and before every save.
*   **G16:** When a new app version is available, show an "update available, reload" prompt. The update applies only when the user taps it.

## Non-Goals

*   Meals, calories, AI features, voice input.
*   Walk or run tracking, GPS, Apple Health integration.
*   Custom exercises (data model allows them later; no UI in v1).
*   Accounts, server, cloud sync, multi-device sync, multi-user support.
*   Rest passes or any other streak forgiveness beyond the weekly goal.
*   Push notifications or reminders. (iOS web push needs the installed PWA and extra setup; not worth it for v1.)
*   App Store distribution or any native code.
*   Charts beyond the month view.
*   Logging sets for future dates.
*   Moving a saved set to a different date. To correct a wrong day, delete the set and add it on the right day.
*   Swipe gestures for month navigation.
*   Storing weekly-goal history. The goal applies to all weeks (see Streak Rules).
*   Exact visual design (colors, type, spacing, icon art). It belongs to the separate design phase. This document fixes behavior only.

## Streak Rules

*   **Active day:** a local calendar day whose total is at least 1 rep.
*   **Week:** Monday to Sunday in the device's local time, using each set's stored `YYYY-MM-DD` date.
*   **Weekly goal:** a number of active days, 1 to 7, default 5. The user changes it in settings.
*   **Week met:** active days in the week >= weekly goal.
*   **Completed week:** a week whose Sunday is before today. The current week is not completed.
*   **Streak:** the count of consecutive completed weeks, ending with the most recent completed week, that each met the goal; plus 1 if the current week has already met the goal. An unmet current week adds nothing and does not break the run.
*   **Reset:** a completed week that did not meet the goal ends the run. Weeks before it no longer count. A single missed day inside a week that still meets the goal has no effect.
*   **First week:** the week containing the earliest stored set is counted if met. If it was not met it is skipped, neither counted nor a reset (a partial first week is never a failure). A new install shows a streak of 0.
*   **Derived, not stored:** the streak is recomputed from stored sets on every read. Editing, deleting, importing, or backfilling a set therefore updates it automatically.
*   **Goal changes rewrite history (intended):** the weekly goal is one global value applied to every week, past and present. Changing it can change the streak. Because no goal history is stored, the settings screen shows a confirm with the current streak and the streak under the new goal before applying. Backfilling a set into a past week can likewise change past weeks and the first-week rule (see R4).
*   **Sunday cliff (accepted):** the streak holds its value through the current week until the week completes. If the week ends below the goal, the streak drops to 0 on Monday with no warning on Sunday. This is accepted for v1 (see Assumptions).

Worked example, goal = 5, weeks Monday to Sunday:

| Week | Active days | Result |
|------|-------------|--------|
| W1 | 6 (one missed day) | Met. Counts. |
| W2 | 5 | Met. Counts. |
| W3 (current, on Friday) | 3 so far | 3 < 5, not met yet. Adds nothing. |

Streak on that Friday = 2 completed weeks + 0 = 2. If the user logs on Friday and Saturday, W3 reaches 5 active days on Saturday, meets the goal, and the streak becomes 3.

Failed week: if W3 ends with 4 active days (4 < 5), W3 is a completed week that failed. The run ends and the streak is 0. The next week starts at streak 0 (Monday shows 0 with nothing logged) and counts +1 once it reaches 5 active days.

## Monthly View Rules

*   **Layout:** one calendar month, columns Monday to Sunday, one square per day. Leading and trailing squares outside the month are blank. The view opens on the current month. The streak number shows at the top.
*   **Navigation:** previous and next month buttons only. Previous is disabled at the month of the earliest stored set (or the current month when there are no sets). Next is disabled at the current month.
*   **Day total:** sum of reps for the day's sets.
*   **Best day:** the highest day total across all stored sets, all months. Derived on read, never stored. Edits, deletes, imports, and backfills therefore recompute it and re-shade every month.
*   **Level:** no sets that day = level 0 (empty). Otherwise ratio = day total / best day, and the level is 1 if ratio <= 25%, 2 if <= 50%, 3 if <= 75%, 4 if > 75%. A ratio exactly on a boundary goes to the lower level (exactly 25% is level 1; exactly 75% is level 3). The best day itself is level 4.
*   **No history:** with no stored sets there is no best day, nothing is shaded, and no ratio is computed (no division by zero).
*   **Flame:** shown on a day that has at least 1 rep (an active day) and whose week met the goal. This includes the current week once it has met the goal, and weeks that span two months (the week is judged on all its days, not only those in the displayed month). Inactive days in a met week show no flame.
*   **Future days:** render disabled and are not tappable.
*   **Tap:** tapping a past or current day opens the day sheet for that day with edit, delete, and add. Adding on a past day is backfill. Added sets use the tapped day's date.

## UI Behavior

Screens are Home, Month, and Settings, reached from a bottom tab bar. The exact visual design is owned by the separate design phase. This section fixes content and behavior.

**Home**

*   Today's total, today's best set, yesterday's total, yesterday's best set, and the current streak.
*   Today with no sets: total shows 0 and best set shows a dash. Yesterday with no sets shows "no data" for both numbers.
*   Today's set list. Tapping a set opens it to change its reps or delete it.
*   Set entry: one number input (numeric keypad) and an Add button. Valid input is an integer 1 to 9999. Invalid input shows an inline message and nothing is saved. After a successful add the input clears.
*   First run (no sets, no previous launch): a short message "Install to Home Screen first, then log" (see R6).

**Delete:** deleting a set asks "Delete this set?" with Delete and Cancel.

**Settings**

*   Weekly goal: integer 1 to 7. Changing it shows the confirm described in Streak Rules.
*   Export button (G9) and the last export date, or "Never" when there is none (G10).
*   Import: a file picker, then a confirm "Replace all current data with this file?" (G12).
*   Restore previous data: shown only when an import backup exists. It swaps the backup back in after a confirm.

**Day sheet** (opens from the month view): the day's date, its sets (tap to change reps or delete), and the same set entry as Home. For a past day, adding is backfill.

**Update prompt:** when a new version is waiting, a banner "Update available" with a Reload button shows on any screen.

## Assumptions

Settled by the owner:

*   Yesterday's numbers show "no data" when yesterday has no sets.
*   No export reminder in v1. Only the last export date is shown. `navigator.storage.persist()` is called at startup and its result is ignored if unsupported.
*   The first week is skipped if not met (neither counted nor a reset).
*   Reps are integers from 1 to 9999.
*   One `localStorage` key holds all data.
*   The Sunday cliff is accepted: no warning when the current week can no longer meet the goal.
*   Changing the weekly goal or backfilling a past week rewrites the streak. No goal history is kept.
*   The service worker cache version is bumped on every deploy.

## Open Questions

*   **Q1: Validate iOS behavior on a real iPhone.** Run the tests in R5, R6, and R7 and apply each test's pass/fail rule. Status: unverified, to run before relying on these behaviors. Settled decisions are in Goals, Streak Rules, Monthly View Rules, UI Behavior, Assumptions, and Proposed Architecture.

## Critical User Journeys (CUJs)

### CUJ 1: Log a set (covers G1, G3)

*   **Given**: The app is installed and open on the home screen. Today has two sets, 25 and 15 (total 40). Yesterday had a total of 55 and a best set of 25.
*   **When**: The user enters 20 and taps Add.
*   **Then**: Today's total shows 60 and today's best set shows 25. The set is saved to `localStorage` with exercise id `pushup`, the local date, and a timestamp. Yesterday's numbers (55 total, 25 best) stay visible beside today's total.

### CUJ 2: Correct a mistake (covers G2, G4)

*   **Given**: Today has a set saved as 200 by mistake (meant 20) and another set the user wants to remove.
*   **When**: The user opens today's set list, taps the 200 set, changes it to 20, and saves. Then the user deletes the other set and confirms.
*   **Then**: Today's total and best set recalculate immediately. The month view and streak reflect the new totals.

### CUJ 3: Weekly goal, a missed day, and a failed week (covers G5)

*   **Given**: The weekly goal is 5 active days. The two previous weeks were met. It is Friday. The user has 3 active days this week (Mon, Tue, Wed) and no set today. The streak shows 2.
*   **When (a)**: The user logs a set on Friday and on Saturday.
*   **Then (a)**: After Saturday's set the week has 5 active days, meets the goal, and the streak shows 3. A set on Sunday makes 6 active days and the streak stays 3.
*   **When (b)**: Instead the user logs on Friday only and misses Saturday and Sunday, ending the week with 4 active days.
*   **Then (b)**: The streak stays 2 through Sunday. On Monday the week is completed and failed (4 < 5), and the streak is 0.

### CUJ 4: Use the app offline (covers G6)

*   **Given**: The app has been opened once with a network connection and installed.
*   **When**: The user opens it in airplane mode and logs a set.
*   **Then**: The app shell loads from the service worker cache, the set is saved to `localStorage` and still shows after a reload, and the app makes no app-data requests. The browser may still check `sw.js` for updates when a network is available.

### CUJ 5: Back up data (covers G9, G10)

*   **Given**: The user has weeks of history.
*   **When**: The user taps Export.
*   **Then**: The app downloads one JSON file containing all sets and settings (Export and import in Proposed Architecture). The app records and shows the last export date.

### CUJ 6: Restore from a backup (covers G12)

*   **Given**: The user has an export file and opens the app on a new install, or with different data present.
*   **When (a)**: The user picks a valid export file and confirms the prompt "Replace all current data with this file?".
*   **Then (a)**: The current data is copied to the backup key. All sets and settings are replaced by the file's contents. Totals, month view, best day, and streak reflect them. "Restore previous data" in Settings brings the old data back.
*   **When (b)**: The user picks an invalid file (not JSON, wrong schema, unsupported `schemaVersion`, duplicate ids, a negative or non-integer rep count, or any other failed check in Export and import).
*   **Then (b)**: The app shows an error and existing data is unchanged.

### CUJ 7: Backfill a forgotten set (covers G13, G4, G5)

*   **Given**: Yesterday has no sets and today has one set of 20.
*   **When**: The user opens the month view, taps yesterday, enters 20 in the day sheet, and taps Add.
*   **Then**: Yesterday's total is 20 and today's total is still 20. The month view (shading, flames, best day) and the streak recompute from stored sets. Future days in the month view are disabled and cannot be opened.

### CUJ 8: Browse the month and fix a day (covers G14, G2, G13, G4)

*   **Given**: The goal is 5. Today is Sunday 2026-02-15. The only stored sets are these. Tue 2026-01-20: 80 reps (the best day). Current week (Mon 2026-02-09 to Sun 2026-02-15): Mon 20, Tue 10, Wed 40, Thu 60, Sat 30. Fri and Sun (today) have no sets. The current week has 5 active days and met the goal. The Jan 20 week is the first week and was not met, so it is skipped. The weeks between have no sets and failed, so the streak is 1.
*   **When (a)**: The user opens the month view.
*   **Then (a)**: February 2026 shows with streak 1 at the top. Levels against the best day of 80: Mon 20 (25%) is level 1, Tue 10 (12.5%) is level 1, Wed 40 (50%) is level 2, Thu 60 (75%) is level 3, Sat 30 (37.5%) is level 2. Mon, Tue, Wed, Thu, and Sat show a flame. Fri and Sun show no flame and are empty. Feb 16 to Feb 28 are disabled. The next month button is disabled.
*   **When (b)**: The user taps previous month.
*   **Then (b)**: January 2026 shows. Jan 20 (80) is level 4 with no flame (its week was not met).
*   **When (c)**: The user taps Jan 20, taps the 80 set, changes it to 8, and saves. Then the user taps next month.
*   **Then (c)**: The best day is now Thu Feb 12 with 60. February re-shades without a reload: Mon 20 (33%) is level 2, Tue 10 (17%) is level 1, Wed 40 (67%) is level 3, Thu 60 is level 4, Sat 30 (50%) is level 2. Flames and the streak (1) are unchanged. Jan 20 (8, 13%) is level 1.
*   **When (d)**: The user taps Mon 2026-02-16.
*   **Then (d)**: Nothing happens. The cell is disabled.

### CUJ 9: Install and open full-screen (covers G7, G8, G11)

*   **Given**: The user opens the hosted URL in Safari on iPhone.
*   **When**: The user taps Share, then "Add to Home Screen", then opens the new icon.
*   **Then**: The app opens full-screen with no Safari address bar and works offline (CUJ 4). Sets saved carry the exercise id `pushup` (G8). The host serves it on a free tier (G11).
*   **Note**: The Safari tab and the installed app may use separate storage (Risk R6). Install first, then log.

### CUJ 10: Resume the app on a new day (covers G15, G3)

*   **Given**: The app was left open on Monday evening with today's total 40. It is now Tuesday morning and the user brings the app to the foreground.
*   **When**: The app becomes visible again, and the user then adds a set of 20.
*   **Then**: On becoming visible the home screen recomputes: Monday's 40 shows as yesterday's total and today's total is 0. The new set is saved with Tuesday's date, because the date is recomputed before the save.

### CUJ 11: Install an app update (covers G16)

*   **Given**: The app is installed and a new version is deployed.
*   **When**: The user opens the app and a new version is found.
*   **Then**: A banner "Update available" with a Reload button shows. The current version keeps running until the user taps Reload. After Reload, the new version runs and stored data is unchanged.

## Alternatives Considered

| Decision | Chosen | Rejected | Reason |
|----------|--------|----------|--------|
| Stack | Plain HTML, CSS, vanilla JS, no build | React/Vue/Svelte with a build | Three screens and a few hundred lines. No toolchain to maintain; files deploy as written. Owner decision. |
| Hosting | Cloudflare Pages (free) | Netlify, Vercel | All three are free for static sites and equivalent here. Any can replace it, but a host change changes the origin (Risk R3). |
| Storage | `localStorage` | IndexedDB | Data is small (see R10 for the size estimate, well under the typical 5 MB limit), synchronous, and simple. IndexedDB is async and more code for no gain at this size. Revisit if data nears the quota. |
| Single storage key | One key holds all data | One key per set or per day | One key makes save and export atomic and avoids half-written state across keys. Cost: every save rewrites the whole object, which is fine at the R10 size. |
| Streak model | Weekly goal, weeks | Daily streak | A daily streak resets on one missed day, which the owner does not want. |
| Week definition | Calendar week, Monday to Sunday | Rolling 7-day window | A calendar week matches the month view columns and lets each week show one flame state. A rolling window changes every day and has no fixed rows to flag. |
| Shading baseline | Relative to the owner's best day | Fixed rep thresholds (for example 20, 40, 60) | Fixed thresholds need tuning and go stale as the owner improves. Relative shading adapts, at the cost that one outlier lightens every other day (R9). |
| Forgiveness | None beyond weekly goal | Rest passes | "5 of 7" already absorbs 2 missed days. Passes add state and rules for no extra tolerance. Owner decision. |
| Platform | PWA | Native iOS app | Native needs a paid developer account (or 7-day free-signing reinstall) and the App Store. Violates G11. |
| Build vs reuse | Build this app | Use an existing habit or workout tracker | The owner requires no account, data kept on the phone, a calendar-week goal streak that tolerates a missed day, and a best-day-shaded month view. Existing trackers were not surveyed in detail; this is an owner decision and the app is small. |
| Service worker strategy | Cache-first shell, update applied only when the user taps Reload | Network-first, or stale-while-revalidate with automatic activation | Network-first delays offline loads. Automatic activation mixes files from two versions in one session. Cost: users see an update prompt and run the old version until they tap it. |
| Export mechanism | Blob download via an anchor tag | Web Share API, clipboard copy, pasted-text import | Simplest path and no server. A fallback is added only if the iPhone test in R7 fails. |
| Backfill | Add a set to a past day in the day sheet | Edit a saved set's date | Adding needs no date picker or confirm step. A wrong-day set is fixed by delete and add. |

## Proposed Architecture

### File layout

```
/index.html
/app.js            UI, event handling, rendering
/store.js          load, save, validate, import, export
/streak.js         logic with no DOM or storage access
/style.css
/sw.js             service worker (served from the site root)
/_headers          Cloudflare Pages response headers
/manifest.webmanifest
/icons/            icon-180.png, icon-192.png, icon-512.png
```

`streak.js` takes the stored sets, settings, and today's date string, and returns derived values: daily totals, best set per day, yesterday's numbers, the best day, active days per week, week-met flags, levels, the streak, and the cells for one month. It filters sets by `exerciseId` `pushup` (G8). It follows Streak Rules and Monthly View Rules. Because it has no DOM or storage access, a small assert-based script can check it in Node or the browser console. `app.js` renders the results and handles taps, the month buttons, and the day sheet, which reuses the set edit, delete, and add code from Home.

### Install checklist

*   `manifest.webmanifest`: `name`, `short_name`, `start_url` `/`, `scope` `/`, `display` `standalone`, `background_color`, `theme_color`, and `icons` listing `icons/icon-192.png` (192x192) and `icons/icon-512.png` (512x512).
*   `index.html` head: `<link rel="manifest">`, `<link rel="apple-touch-icon" href="/icons/icon-180.png">` (180x180), `<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">`, `<meta name="theme-color">`, `<meta name="apple-mobile-web-app-capable" content="yes">`, `<meta name="apple-mobile-web-app-title">`, `<meta name="apple-mobile-web-app-status-bar-style">`.
*   Service worker registered from `/sw.js` with scope `/`.
*   `sw.js` is served with `Cache-Control: no-cache` (set in `/_headers`), so the browser always revalidates it.
*   Precache list: `/`, `/index.html`, `/app.js`, `/store.js`, `/streak.js`, `/style.css`, `/manifest.webmanifest`, and the three icon files.
*   Served over HTTPS (provided by the host).

### Accessibility (month view)

*   Each day cell is a `<button>` (disabled for future days) with a text label such as "Tue 14 Jan, 40 reps, level 2 of 4, week goal met". Level and flame are in the label, so color is never the only signal.
*   Levels also differ by more than hue (shade steps with a visible border or numeral), and the flame is an icon, not just a color.
*   Previous and next month buttons are labeled "Previous month" and "Next month", and the month title is announced when it changes.
*   Touch targets are at least 44 px where the screen width allows.

### Storage

One `localStorage` key, `pushup-tracker:v1`, holding a single JSON object. A second key, `pushup-tracker:v1:backup`, holds a copy of the previous data string made just before an import replaces it.

```json
{
  "schemaVersion": 1,
  "settings": { "weeklyGoal": 5, "lastExportAt": null },
  "sets": [
    { "id": "uuid", "exerciseId": "pushup", "reps": 20,
      "date": "2026-01-01", "createdAt": 1767225600000 }
  ]
}
```

*   `date` is the local calendar date string captured at save time from the then-current date (G15). It is the only field used to group days. `createdAt` is informational and never used to derive the date.
*   `reps` is an integer from 1 to 9999.
*   `weeklyGoal` is an integer from 1 to 7.
*   `lastExportAt` is `null` or a millisecond timestamp.
*   `schemaVersion` lets a later version migrate older data. On load, an unknown or newer `schemaVersion` shows a message ("This data was saved by a different version of the app"), and the app writes nothing until the user imports a valid file.
*   Stored: sets, settings, `lastExportAt`. Derived on read: daily totals, daily best, yesterday's numbers, month cells, active days, streak.

### Date handling

*   Today's date string is built from the device's local year, month, and day, not from `toISOString()` (which is UTC).
*   Weeks start on Monday. Date arithmetic on the stored `YYYY-MM-DD` strings must not shift across DST changes.
*   A set added just after midnight gets the new day's date. Travel across timezones keeps the stored date.
*   Today and yesterday are recomputed on `visibilitychange` (to visible) and `pageshow`, and again immediately before every save (G15).
*   Dates after today's local date are never accepted (day sheet blocks future days; import rejects them).

### Service worker

*   Cache name includes a version constant (`pushup-shell-v1`), bumped on every deploy.
*   On install, precache the files in the Install Checklist.
*   Fetch strategy: cache-first for the shell. The app makes no app-data requests.
*   On activate, delete caches with other names.
*   Update: the new worker installs in the background and waits. The app shows the "Update available" banner (G16). Tapping Reload sends a message that makes the waiting worker call `skipWaiting()`, and the page reloads when the new worker takes control. `skipWaiting()` is never called otherwise, so files from two versions never mix in one session.
*   `sw.js` is served with `Cache-Control: no-cache` (Install Checklist).

### Export and import

*   Export: serialize the stored object, create a `Blob`, click a temporary anchor with a `download` attribute. Set `lastExportAt` to the current time after the download is triggered.
*   Import: read the chosen file and run all checks below. If any check fails, show an error and write nothing.
    *   File size at most 2 MB. At most 20,000 sets.
    *   JSON parses. `schemaVersion` is 1. `sets` is an array. `settings.weeklyGoal` is an integer 1 to 7. `settings.lastExportAt` is `null` or a number.
    *   Each set: string `id`, unique across the file; `exerciseId` equals `pushup` (v1); integer `reps` 1 to 9999; `date` matches `YYYY-MM-DD`, is a real calendar date, and is not after today's local date.
*   After the checks pass and the user confirms: copy the current stored string to `pushup-tracker:v1:backup` (replacing any earlier backup; if this write fails, abort the import with a message), then write the imported data. The backup gives one level of undo through "Restore previous data".
*   `lastExportAt` after import: the device keeps its own current value. The file's `lastExportAt` is ignored, because the last export date means the last time this device produced a backup file.

## Risks & Mitigations

*   **R1: `localStorage` corruption or quota.**
    *   Risk: invalid JSON in the key, or a write throwing `QuotaExceededError`.
    *   Mitigation: wrap read and write in try/catch. On a read or parse failure, start with empty data and show a message. On a write failure, show an error and keep the in-memory state. The last export is the recovery path.
*   **R2: Stale app shell after a deploy.**
    *   Risk: the cache-first worker keeps serving old files, or iOS delays checking for a new `sw.js`.
    *   Mitigation: cache version bump per deploy, `sw.js` served with `no-cache`, and the "Update available" prompt (G16). Old caches are deleted on activate.
*   **R3: Host or origin change orphans data.**
    *   Risk: `localStorage` is per origin. Moving from Cloudflare Pages to another host, or changing the domain, leaves data on the old origin.
    *   Mitigation: export before any host or domain change and import on the new origin. Pick a stable URL up front; a custom domain, if ever used, should be set before real data accumulates.
*   **R4: Backfill and goal changes rewrite history.**
    *   Risk: adding a set to a past day, or changing the weekly goal, changes past totals and weeks and can create or break a streak. Backfill into the earliest week can also change the first-week rule.
    *   Mitigation: this is intended (state is derived, no goal history). A goal change shows a confirm with the old and new streak. Future days cannot be opened. Export is the safety net.
*   **R5: iOS storage eviction.** Unverified.
    *   Risk: Safari may clear site data for sites unused for about 7 days in a browser tab. Installed home-screen apps are reported to be exempt, and clearing website data or deleting the app still erases history. `navigator.storage.persist()` may be ignored on iOS.
    *   Mitigation: call `persist()` and treat its result as unknown. Export regularly. The last export date is always shown.
    *   Test on a real iPhone: install the app, log a set, leave it unopened for 8 days, then open it. Also record what `persist()` returns.
    *   Pass: the set is still present after 8 days. Fail: data is gone.
    *   If it fails: add an in-app export reminder (shown when the last export is more than 7 days old or never) and revisit the no-reminder assumption.
*   **R6: Safari tab and installed app may use separate storage.** Unverified.
    *   Risk: data logged in a Safari tab may not appear in the installed app, and the reverse.
    *   Mitigation: "install first, then log", shown in the first-run message. If a carry-over is needed, export from the tab and import in the installed app.
    *   Test on a real iPhone: log a set in Safari, install, open the icon, and check whether the set appears.
    *   Pass: the observed behavior matches the first-run message (data does not carry over, or it does and the message is removed). Fail: data logged in the installed app disappears between launches.
    *   If it fails: do not rely on the installed app for history. Reconsider hosting and storage before use.
*   **R7: File export from a standalone iOS PWA.** Unverified.
    *   Risk: an anchor `download` may not behave as it does in a browser tab.
    *   Mitigation: Blob download via anchor only (v1).
    *   Test on a real iPhone: tap Export in the installed app, save the file, then import it back in the installed app.
    *   Pass: a file is saved or shared and re-imports with the same sets and settings. Fail: no file is obtained, or the file does not re-import.
    *   If it fails: add the Web Share API with a file and repeat the test. If that fails too, add copy-JSON-to-clipboard with pasted-text import.
*   **R8: Streak miscomputed at date edges** (DST, midnight, week start).
    *   Mitigation: the logic module ships with one assert-based check covering a met week, a failed week, an unmet current week (adds 0), a current week that just met the goal (adds 1), a week crossing a month boundary, a DST change week, level boundaries (exactly 25%, 50%, 75%), and empty history.
*   **R9: A best-day outlier compresses shading.**
    *   Risk: one very high day (for example 200 instead of 20) makes every other day look light, because shading is relative to the best day.
    *   Status: accepted tradeoff (owner decision).
    *   Mitigation: edit or delete fixes typos. The best day is derived on read, so the month re-shades at once (CUJ 8).
*   **R10: Security and scale.**
    *   Risk: imported JSON is untrusted input and could inject markup or exhaust storage. A very large history could near the `localStorage` quota.
    *   Mitigation: render all user data as text only (no `innerHTML` with data). Validate and size-cap imports (Export and import). Serve over HTTPS from the host.
    *   Scale ceiling: one set is about 110 bytes of JSON. 5,000 sets is about 0.55 MB, well under the typical 5 MB quota. The 20,000-set import cap is about 2.2 MB.
