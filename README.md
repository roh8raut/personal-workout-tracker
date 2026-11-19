# personal-workout-tracker

A personal workout tracker for push-ups and planks, built as a PWA for iPhone. No account, no backend, no cost.

> Status: design phase. The app is not built yet.

## What it does (v1)

- Log sets of push-ups (reps) and planks (time) with a scroll wheel. Home is a stack of cards, one per exercise: swipe the top card away to reach the next. Each card shows today's total against yesterday's number to beat. Add your own exercises (up to 8 in total) from the dashed "New exercise" card at the back of the stack: pick a quick suggestion or type a name, and choose whether it is counted in reps or timed. Remove them in Settings, with Undo.
- One weekly streak across all exercises: a day is active if you logged any set, and a week counts when you hit your goal (default 5 active days, adjustable). No rest passes.
- Month view: one merged Monday-first calendar. Each day is shaded by how many sets you did that day, across exercises, with flames on goal weeks. Tap a day to see its sets, edit, delete or backfill.
- Beta: data stays in the browser's IndexedDB only. Export and import a JSON backup from Settings, since clearing Safari data or losing the install would erase it.

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

Open http://localhost:8080/. Data is saved in the browser's IndexedDB (database `pushup-tracker`), so it survives reloads.

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
