# personal-workout-tracker

A personal push-up tracker, built as a PWA for iPhone. No account, no backend, no cost.

> Status: design phase. The app is not built yet.

## What it does (v1)

- Log sets of push-ups per day. Home shows today's total against yesterday's number to beat.
- Weekly streak: a week counts when you hit your goal (default 5 active days, adjustable). No rest passes.
- Month view: Monday-first calendar, each day shaded against your best day, flames on goal weeks. Tap a day to edit, delete or backfill.
- Beta: data stays in the browser's `localStorage` only. Export and import a JSON backup from Settings, since clearing Safari data or losing the install would erase it.

Deferred: meals, calories, AI, voice notes, walk/run tracking.

## Plan

- Hosting: Cloudflare Pages (free), installed from Safari via Add to Home Screen.
- Spec: [`.dev/docs/design_draft.md`](.dev/docs/design_draft.md)
- Theme: playful "Hum", with red accents and buttons that press like keys.

## Run the prototype

```sh
cd src
python3 -m http.server 8080
```

Open http://localhost:8080/. Data is in memory only and resets on reload.

Check the streak logic:

```sh
node src/streak.check.mjs
```

## Known risks (to test on a real iPhone)

- Whether storage carries over between Safari and the installed app.
- Whether file download works from the installed app.
- Whether storage persists and isn't evicted.

## Next

1. Record Hum, red usage and key-press behavior in the spec.
2. Break the spec into build tasks and build the app.
3. Test the three iPhone behaviors above.
