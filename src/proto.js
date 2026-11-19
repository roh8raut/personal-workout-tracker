// Prototype wiring. Data is saved in IndexedDB and survives reloads.
// URL states: ?state=first | backup | update (comma separated).
(function () {
  const S = window.Streak;
  const t0 = new Date(), p2 = (n) => String(n).padStart(2, "0");
  const TODAY = t0.getFullYear() + "-" + p2(t0.getMonth() + 1) + "-" + p2(t0.getDate());
  const modes = (new URLSearchParams(location.search).get("state") || "").split(",");
  const $ = (id) => document.getElementById(id);
  const plural = (n, w) => n + " " + w + (n === 1 ? "" : "s");
  let nextId = 1;
  const mk = (date, reps, ex) => ({ id: "s" + nextId++, exerciseId: ex, reps, date });

  const esc = (s) => String(s).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));

  // Exercises. Push-ups and Planks are built in; the rest are added in Settings and kept in state.custom.
  // kind "reps" is a counted set, kind "time" is seconds shown as m:ss. A set's `reps` field holds the wheel
  // value either way. step/max/start size the number wheel; show formats a value, say reads it aloud.
  const KINDS = {
    reps: { entry: "Reps in this set", step: 1, max: 300, start: 20, show: (n) => String(n), say: (n) => plural(n, "rep") },
    time: { entry: "Time in this set", step: 5, max: 600, start: 30,
      show: (s) => Math.floor(s / 60) + ":" + p2(s % 60),
      say: (s) => ((s >= 60 ? Math.floor(s / 60) + " min " : "") + (s % 60 ? (s % 60) + " sec" : "")).trim() },
  };
  const BUILTIN = [{ id: "pushup", name: "Push-ups", kind: "reps" }, { id: "plank", name: "Planks", kind: "time" }];
  const MAX_EXERCISES = 8, NAME_MAX = 24, NEW = "__new"; // NEW is the ghost card, never a real exercise (ids cannot contain "_")
  const spec = (d) => Object.assign({}, KINDS[d.kind], d);
  // a stored or imported exercise definition: a safe id, a short name, a known kind, and not a built-in id
  const validDef = (d) => !!d && typeof d.id === "string" && /^[a-z0-9-]{1,40}$/.test(d.id) && !BUILTIN.some((b) => b.id === d.id)
    && typeof d.name === "string" && d.name.trim().length > 0 && d.name.length <= NAME_MAX && !!KINDS[d.kind];
  const cleanDefs = (list) => list.map((d) => ({ id: d.id, name: d.name.trim(), kind: d.kind }));
  let EXERCISES = BUILTIN.map(spec), exById = Object.fromEntries(EXERCISES.map((e) => [e.id, e]));

  const state = { goal: 5, sets: [], custom: [], lastExport: null, backup: null, y: +TODAY.slice(0, 4), m: +TODAY.slice(5, 7), ex: BUILTIN[0].id };

  // persistence: one snapshot record in IndexedDB (db "pushup-tracker", store "kv", key "state")
  const LEGACY_KEY = "pushup-tracker:v1"; // old localStorage copy, migrated once
  const db = new Promise((res, rej) => {
    const r = indexedDB.open("pushup-tracker", 1);
    r.onupgradeneeded = () => r.result.createObjectStore("kv");
    r.onsuccess = () => res(r.result);
    r.onerror = () => rej(r.error);
  });
  const idb = (mode, fn) => db.then((d) => new Promise((res, rej) => {
    const t = d.transaction("kv", mode), q = fn(t.objectStore("kv"));
    t.oncomplete = () => res(q.result);
    t.onerror = t.onabort = () => rej(t.error);
  }));
  const snapshot = () => ({ goal: state.goal, sets: state.sets, custom: state.custom, lastExport: state.lastExport, backup: state.backup });
  function save() { return idb("readwrite", (s) => s.put(snapshot(), "state")).then(() => true, () => false); } // false: blocked or full, keep running in memory
  function load() {
    return idb("readonly", (s) => s.get("state")).catch(() => null).then((saved) => {
      if (!saved) { try { saved = JSON.parse(localStorage.getItem(LEGACY_KEY)); } catch (x) { saved = null; } }
      if (saved && Array.isArray(saved.sets)) {
        Object.assign(state, { goal: saved.goal, sets: saved.sets, lastExport: saved.lastExport, backup: saved.backup });
        state.custom = Array.isArray(saved.custom) ? cleanDefs(saved.custom.filter(validDef)).slice(0, MAX_EXERCISES - BUILTIN.length) : [];
        nextId = 1 + Math.max(0, ...state.sets.map((s) => parseInt(String(s.id).slice(1), 10) || 0));
      }
      if (modes.includes("backup")) state.backup = { goal: 5, sets: [], custom: [], lastExport: null };
    });
  }

  const fmt = (date, opts) => new Date(S.toN(date) * 86400000).toLocaleDateString("en-GB", Object.assign({ timeZone: "UTC" }, opts));
  const longDate = (d) => fmt(d, { weekday: "long", day: "numeric", month: "long" });
  const shortDate = (d) => fmt(d, { weekday: "short", day: "numeric", month: "short" });
  const yesterday = S.toS(S.toN(TODAY) - 1);

  function streakHtml(n) {
    return `<svg width="20" height="20" aria-hidden="true"><use href="#flame"/></svg><span class="num">${plural(n, "week")}</span>`;
  }

  function setsList(ul, date, emptyMsg, e) {
    const list = state.sets.filter((s) => s.date === date && s.exerciseId === e.id);
    ul.innerHTML = list.length
      ? list.map((s, i) => `<li><button type="button" data-id="${s.id}" aria-label="Set ${i + 1}, ${e.say(s.reps)}, edit"><span class="sets__n">Set ${i + 1}</span><span class="sets__reps num">${e.show(s.reps)}</span><span class="sets__edit">Edit</span></button></li>`).join("")
      : `<li class="sets__empty">${emptyMsg}</li>`;
  }

  // number wheel: a scroll-snap list of step, 2*step, ... up to max. Items tilt and fade away from the centre row.
  const ROW = 44, calm = matchMedia("(prefers-reduced-motion: reduce)").matches;
  function makeWheel(el, first, start) {
    let cfg = first, v = 0, max = 0, items = [];
    const idx = (n) => n / cfg.step - 1;
    const build = (m) => {
      max = m;
      el.innerHTML = Array.from({ length: Math.round(m / cfg.step) }, (_, i) => `<div class="wheel__i" aria-hidden="true">${cfg.show((i + 1) * cfg.step)}</div>`).join("");
      items = [...el.children];
      el.setAttribute("aria-valuemin", cfg.step);
      el.setAttribute("aria-valuemax", m);
    };
    const paint = () => {
      const pos = el.scrollTop / ROW;
      items.forEach((it, i) => {
        const d = Math.max(-3, Math.min(3, i - pos)), a = Math.abs(d);
        it.style.opacity = 1 - a * 0.28;
        it.style.transform = calm ? "" : `rotateX(${-d * 26}deg) scale(${1 - a * 0.1})`;
      });
    };
    const place = () => { if (el.clientHeight) { el.scrollTop = idx(v) * ROW; paint(); } };
    const label = () => { el.setAttribute("aria-valuenow", v); el.setAttribute("aria-valuetext", cfg.say(v)); };
    const set = (n, smooth) => {
      n = Math.max(cfg.step, Math.min(Math.round(n / cfg.step) * cfg.step, 9999));
      if (n > max) build(n);
      v = n;
      label();
      if (smooth && el.clientHeight && !calm) el.scrollTo({ top: idx(v) * ROW, behavior: "smooth" });
      else place();
    };
    // only scrolling the user started may change the value; snap events from a wheel
    // that was just shown (hidden tab, opening dialog) must not overwrite it
    let raf = 0, user = false, idle = 0;
    const touch = () => { user = true; clearTimeout(idle); idle = setTimeout(() => { user = false; }, 250); };
    ["pointerdown", "touchstart", "wheel"].forEach((t) => el.addEventListener(t, touch, { passive: true }));
    el.addEventListener("scroll", () => {
      if (!el.clientHeight) return;
      if (user) {
        touch(); // momentum scrolling keeps the window open
        v = Math.min((Math.round(el.scrollTop / ROW) + 1) * cfg.step, max);
        label();
      }
      cancelAnimationFrame(raf);
      raf = requestAnimationFrame(paint);
    }, { passive: true });
    el.addEventListener("click", (e) => { const i = items.indexOf(e.target.closest(".wheel__i")); if (i >= 0) set((i + 1) * cfg.step, true); });
    el.addEventListener("keydown", (e) => {
      const n = { ArrowUp: -1, ArrowDown: 1, PageUp: -10, PageDown: 10 }[e.key];
      if (n) { e.preventDefault(); set(v + n * cfg.step, true); }
      else if (e.key === "Enter") { e.preventDefault(); el.closest("form").requestSubmit(); }
    });
    // a wheel inside a hidden view or closed dialog has no height; restore the value when it appears
    new ResizeObserver(place).observe(el);
    build(Math.max(cfg.max, start));
    set(start);
    return {
      get: () => v,
      set,
      // switch the wheel to another exercise (units, step, labels) and a value
      config: (c, n) => { cfg = c; build(Math.max(c.max, n)); set(n); },
    };
  }

  // Home deck: one card per exercise
  const deck = $("deck"), dots = $("dots");
  const cardHtml = (e) => `<article class="card" data-ex="${e.id}" aria-labelledby="card-${e.id}">
    <div class="card__top">
    <header class="card__head"><h2 id="card-${e.id}">${esc(e.name)}</h2><p class="streak" data-f="streak"></p></header>
    <div class="pear">
      <div class="beat opens">
        <div class="beat__today"><p class="label">Today</p><p class="figure num" data-f="today">0</p><p class="label num" data-f="todayBest"></p></div>
        <div class="beat__yday"><p class="label">Yesterday</p><p class="figure figure--s num" data-f="yday"></p><p class="label num" data-f="ydayBest"></p></div>
      </div>
      <p class="standfirst" data-f="gap"></p>
      <div class="track" aria-hidden="true"><span data-f="bar"></span></div>
      <p class="label num pear__ever" data-f="allBest"></p>
      <p class="label num pear__ever" data-f="allDay"></p>
    </div>
    </div>
    <form class="entry" data-ex="${e.id}" data-date="">
      <span class="entry__label" id="lbl-${e.id}">${e.entry}</span>
      <div class="entry__row">
        <div class="wheelbox"><div class="wheel num" role="spinbutton" tabindex="0" aria-labelledby="lbl-${e.id}"></div></div>
        <button class="btn btn--primary" type="submit">Add set</button>
      </div>
    </form>
    <section class="card__sets" aria-label="Today's ${esc(e.name)} sets"><h3>Today&rsquo;s sets</h3><ul class="sets" data-f="sets"></ul></section>
  </article>`;
  let cards = {}, homeWheel = {};
  const dayWheel = makeWheel($("reps-day"), EXERCISES[0], EXERCISES[0].start);
  const editWheel = makeWheel($("reps-edit"), EXERCISES[0], EXERCISES[0].start);
  const recent = (e) => { const l = state.sets.filter((s) => s.exerciseId === e.id).pop(); return l ? l.reps : e.start; };
  // (re)build the cards, dots, wheels and the day sheet's exercise picker from EXERCISES
  function buildDeck() {
    const ids = [...EXERCISES.map((e) => e.id), ...(EXERCISES.length < MAX_EXERCISES ? [NEW] : [])]; // no ghost card once you are at the limit
    deck.innerHTML = EXERCISES.map(cardHtml).join("") + (ids.includes(NEW) ? ghostHtml() : "");
    dots.innerHTML = ids.map((id, i) => id === NEW
      ? `<button type="button" class="dot--new" data-i="${i}" data-id="${NEW}" aria-label="New exercise"></button>`
      : `<button type="button" data-i="${i}" data-id="${id}" aria-label="${esc(exById[id].name)}"></button>`).join("");
    $("day-ex").innerHTML = EXERCISES.map((e) => `<button type="button" data-ex="${e.id}">${esc(e.name)}</button>`).join("");
    cards = {}; homeWheel = {};
    EXERCISES.forEach((e) => {
      const el = deck.querySelector(`article[data-ex="${e.id}"]`), f = { form: el.querySelector("form") };
      el.querySelectorAll("[data-f]").forEach((n) => { f[n.dataset.f] = n; });
      cards[e.id] = f;
      homeWheel[e.id] = makeWheel(f.form.querySelector(".wheel"), e, recent(e)); // starts on the last set, a likely repeat
    });
    previewWheel = ids.includes(NEW) ? makeWheel($("new-preview"), KINDS[newKind], KINDS[newKind].start) : null;
    order = [state.ex, ...ids.filter((id) => id !== state.ex)]; // the front card stays in front, the ghost card goes last
    layout();
  }
  // apply state.custom: rebuild everything that lists exercises
  function defineExercises() {
    EXERCISES = [...BUILTIN, ...state.custom].map(spec);
    exById = Object.fromEntries(EXERCISES.map((e) => [e.id, e]));
    if (!exById[state.ex]) state.ex = EXERCISES[0].id;
    if (!exById[dayEx]) dayEx = EXERCISES[0].id;
    buildDeck();
  }

  const syncDots = () => dots.querySelectorAll("button").forEach((b) => b.setAttribute("aria-current", String(b.dataset.id === order[0])));

  // Card stack, shuffled like a deck. `order` lists exercise ids front to back; a card's depth is its index.
  // Swipe the top (yellow) part of the front card up or down: it slides out, tucks in behind the others,
  // and the next card comes forward. The cards behind stay stacked, their top edges showing above the
  // front card. Dots, the arrow keys and a tap on that strip of edges do the same.
  const PEEK = 14, SHRINK = 0.05, FAR = 70; // px of each card showing above, scale lost per level, drag distance that counts as a swipe
  let order = EXERCISES.map((e) => e.id), busy = false, drag = null;
  const cardEl = (id) => deck.querySelector(`article[data-ex="${id}"]`);
  // every card transform uses the same three functions in the same order, so the browser can blend any two smoothly
  const tf = (y, r, s) => `translateY(${y}px) rotate(${r}deg) scale(${s})`;
  const pose = (d) => tf(-d * PEEK, 0, 1 - d * SHRINK); // behind cards sit higher, so their top edge shows above the front card
  const rotate = (n) => [...order.slice(n), ...order.slice(0, n)];
  function layout(skip) {
    order.forEach((id, d) => {
      const el = cardEl(id);
      if (el === skip) return;
      el.classList.toggle("is-front", d === 0);
      el.inert = d > 0; // cards behind can't be focused or tapped
      el.style.transform = pose(d);
      el.style.opacity = d > 2 ? 0 : 1; // only two cards show behind the front one
      el.style.zIndex = order.length - d;
    });
  }
  // dir: -1 the front card leaves upward, 1 downward. next: the new order. y0, r0: where the card is right
  // now, so a swipe in progress carries on from the finger instead of jumping.
  const SHUFFLE_MS = 640;
  function shuffle(dir, next, y0 = 0, r0 = 0) {
    const out = cardEl(order[0]);
    order = next;
    if (order[0] !== NEW) state.ex = order[0]; // state.ex is always a real exercise (the day sheet and Month use it)
    syncDots();
    out.classList.remove("is-drag");
    deck.classList.remove("dragging");
    if (calm) { layout(); return; }
    busy = true;
    // The old front card makes one continuous move: it eases out to a stop past the swipe, then eases back and
    // settles behind the stack. It is at rest at the turn-around, so there is no sudden reversal. Only transform
    // and opacity move, and it is one animation instead of two timed steps.
    const depth = order.indexOf(out.dataset.ex), peakY = dir * Math.max(130, Math.abs(y0) + 40), top = order.length + 1;
    layout(out); // the other cards step forward on their own transitions
    out.style.transition = "none"; // a CSS transition would override the animation below
    out.inert = true;
    out.style.opacity = depth > 2 ? 0 : 1;
    out.style.transform = pose(depth); // the end state, set up front so nothing flashes when the animation ends
    out.style.zIndex = order.length - depth;
    const peak = tf(peakY, dir * -4, 1.03);
    const move = out.animate([
      { transform: tf(y0, r0, 1), zIndex: top, easing: "cubic-bezier(0.2, 0.9, 0.3, 1)" },
      { transform: peak, zIndex: top, offset: 0.4, easing: "linear" },
      { transform: peak, zIndex: out.style.zIndex, offset: 0.401, easing: "cubic-bezier(0.5, 0, 0.2, 1)" }, // goes behind at the turn-around
      { transform: pose(depth), zIndex: out.style.zIndex },
    ], { duration: SHUFFLE_MS });
    setTimeout(() => out.classList.remove("is-front"), SHUFFLE_MS * 0.4); // its contents fade once it is going behind
    const done = () => { out.style.transition = ""; out.classList.remove("is-front"); busy = false; };
    move.onfinish = done;
    move.oncancel = done;
  }
  const step = (dir) => { if (!busy && order.length > 1) shuffle(-dir, dir > 0 ? rotate(1) : rotate(order.length - 1)); };
  function goTo(id) { const i = order.indexOf(id); if (i > 0 && !busy) shuffle(-1, rotate(i)); }
  dots.addEventListener("click", (e) => { const b = e.target.closest("button[data-i]"); if (b) goTo(b.dataset.id); });
  deck.addEventListener("keydown", (e) => {
    if (e.target !== deck) return;
    const n = { ArrowDown: 1, ArrowRight: 1, ArrowUp: -1, ArrowLeft: -1 }[e.key];
    if (n) { e.preventDefault(); step(n); }
  });
  // a tap on the strip of card edges above the front card brings the next one forward
  deck.addEventListener("click", (e) => { if (e.target === deck) step(1); });

  // swiping: touch and mouse. Only the top part of the front card (title and yellow panel) takes the swipe,
  // so the wheel and the page below keep their normal scrolling.
  deck.addEventListener("pointerdown", (e) => {
    const top = e.target.closest(".card__top");
    if (busy || order.length < 2 || !top || e.button > 0 || top.closest(".card").dataset.ex !== order[0]) return;
    drag = { id: e.pointerId, x: e.clientX, y: e.clientY, dy: 0, v: 0, t: performance.now(), on: false, el: top.closest(".card") };
  });
  deck.addEventListener("pointermove", (e) => {
    if (!drag || e.pointerId !== drag.id) return;
    const dx = e.clientX - drag.x, dy = e.clientY - drag.y;
    if (!drag.on) {
      if (Math.abs(dy) < 8 || Math.abs(dy) < Math.abs(dx)) return;
      drag.on = true;
      drag.el.setPointerCapture(e.pointerId);
      drag.el.classList.add("is-drag");
      deck.classList.add("dragging");
    }
    const now = performance.now();
    drag.v = (dy - drag.dy) / Math.max(1, now - drag.t);
    drag.dy = dy; drag.t = now;
    drag.el.style.transform = tf(dy, dy * -0.012, 1);
    const p = Math.min(Math.abs(dy) / (FAR * 1.5), 1); // the cards behind rise toward the front as you drag
    order.forEach((id, d) => { if (d > 0) cardEl(id).style.transform = pose(Math.max(d - p, 0)); });
  });
  function endDrag() {
    if (!drag) return;
    const { on, dy, v, el } = drag;
    drag = null;
    if (!on) return;
    el.classList.remove("is-drag");
    deck.classList.remove("dragging");
    if (Math.abs(dy) > FAR || (Math.abs(v) > 0.5 && Math.abs(dy) > 25)) shuffle(dy < 0 ? -1 : 1, rotate(1), dy, dy * -0.012);
    else { // not far enough: it springs back, with a little overshoot
      el.style.transition = "transform 0.5s cubic-bezier(0.2, 1.3, 0.4, 1)";
      layout();
      setTimeout(() => { el.style.transition = ""; }, 520);
    }
  }
  deck.addEventListener("pointerup", endDrag);
  deck.addEventListener("pointercancel", endDrag);

  // Ghost card: a blank, dashed card at the back of the stack. Pull it forward to add an exercise right where
  // the cards live. Quick-pick chips carry a preset type, so most of the time nothing needs typing, and the
  // wheel below shows how a set will be logged for the chosen type.
  const SUGGEST = [["Squats", "reps"], ["Lunges", "reps"], ["Pull-ups", "reps"], ["Dips", "reps"], ["Wall sit", "time"], ["Dead hang", "time"], ["Sit-ups", "reps"], ["Burpees", "reps"], ["Side plank", "time"]];
  let newKind = "reps", previewWheel = null;
  const ghostHtml = () => `<article class="card card--new" data-ex="${NEW}" aria-labelledby="card-new">
    <div class="card__top">
      <header class="card__head"><h2 id="card-new"><svg width="22" height="22" viewBox="0 0 24 24" aria-hidden="true"><path d="M12 5v14M5 12h14" fill="none" stroke="currentColor" stroke-width="2.6" stroke-linecap="round"/></svg>New exercise</h2></header>
      <p class="ghost__lead">Pick one, or name your own.</p>
    </div>
    <form class="entry newform" id="new-form" novalidate>
      <div class="chips" id="new-chips" role="group" aria-label="Quick pick"></div>
      <label class="entry__label" for="new-name">Name</label>
      <input class="textfield" id="new-name" type="text" maxlength="${NAME_MAX}" autocomplete="off" autocapitalize="words" enterkeyhint="done" placeholder="For example, Squats" aria-describedby="err-new">
      <div class="seg" id="new-kind" role="group" aria-label="How it is counted">
        <button type="button" data-kind="reps" aria-pressed="true">Reps</button>
        <button type="button" data-kind="time" aria-pressed="false">Time</button>
      </div>
      <span class="entry__label" id="lbl-new">How you will log it</span>
      <div class="wheelbox"><div class="wheel num" id="new-preview" role="spinbutton" tabindex="0" aria-labelledby="lbl-new"></div></div>
      <p class="error" id="err-new" role="alert"></p>
      <button class="btn btn--primary" type="submit">Add exercise</button>
    </form>
  </article>`;
  function renderGhost() {
    if (!$("new-form")) return; // no ghost card at the exercise limit
    const have = new Set(EXERCISES.map((e) => e.name.toLowerCase())), typed = $("new-name").value.trim().toLowerCase();
    $("new-chips").innerHTML = SUGGEST.filter(([n]) => !have.has(n.toLowerCase())).slice(0, 6)
      .map(([n, k]) => `<button type="button" class="chip" data-name="${esc(n)}" data-kind="${k}" aria-pressed="${typed === n.toLowerCase()}">${esc(n)}${k === "time" ? " <small>timed</small>" : ""}</button>`).join("");
    $("new-kind").querySelectorAll("button").forEach((b) => b.setAttribute("aria-pressed", String(b.dataset.kind === newKind)));
  }
  function setKind(k) { newKind = k; previewWheel.config(KINDS[k], KINDS[k].start); renderGhost(); }
  deck.addEventListener("click", (e) => {
    const chip = e.target.closest(".chip"), kind = e.target.closest("#new-kind button");
    if (chip) { $("new-name").value = chip.dataset.name; $("err-new").textContent = ""; setKind(chip.dataset.kind); }
    else if (kind) setKind(kind.dataset.kind);
  });
  deck.addEventListener("input", (e) => { if (e.target.id === "new-name") renderGhost(); });
  // run a change inside a View Transition so the ghost card morphs into the card it became
  function morph(apply) {
    if (calm || !document.startViewTransition) { apply(); return; }
    cardEl(NEW).style.viewTransitionName = "excard";
    const t = document.startViewTransition(() => {
      apply();
      const to = deck.querySelector(".card.is-front");
      if (to) to.style.viewTransitionName = "excard";
    });
    t.finished.finally(() => deck.querySelectorAll(".card").forEach((c) => { c.style.viewTransitionName = ""; }));
  }
  function createExercise() {
    const name = $("new-name").value.trim().replace(/\s+/g, " "), err = $("err-new");
    if (!name) { err.textContent = "Pick one above or type a name."; $("new-name").focus(); return; }
    if (EXERCISES.some((x) => x.name.toLowerCase() === name.toLowerCase())) { err.textContent = "You already have an exercise with that name."; $("new-name").focus(); return; }
    if (EXERCISES.length >= MAX_EXERCISES) { err.textContent = "You can have up to " + MAX_EXERCISES + " exercises."; return; }
    const id = "c" + Date.now().toString(36) + Math.random().toString(36).slice(2, 5), kind = newKind;
    hideSnack(); // an Undo for an earlier removal ends here
    newKind = "reps";
    morph(() => {
      state.custom.push({ id, name, kind });
      state.ex = id; // Home opens on the new card
      defineExercises();
      render();
    });
  }

  // Remove with Undo: no confirm dialog, the change is applied and a snackbar offers to take it back for a few seconds.
  const snack = $("snack");
  let snackTimer = 0, undoSlot = null;
  function hideSnack() { clearTimeout(snackTimer); snack.classList.remove("on"); undoSlot = null; }
  function showSnack(text) {
    $("snack-text").textContent = text;
    snack.classList.add("on");
    clearTimeout(snackTimer);
    snackTimer = setTimeout(hideSnack, 9000);
  }
  snack.addEventListener("focusin", () => clearTimeout(snackTimer)); // keyboard and screen-reader users keep the Undo
  $("snack-undo").addEventListener("click", () => {
    const u = undoSlot;
    hideSnack();
    if (!u) return;
    state.custom.splice(Math.min(u.idx, state.custom.length), 0, u.def);
    state.sets.push(...u.sets);
    defineExercises();
    render();
  });
  function removeExercise(id) {
    const idx = state.custom.findIndex((c) => c.id === id);
    if (idx < 0) return;
    const def = state.custom[idx], sets = state.sets.filter((s) => s.exerciseId === id);
    state.custom.splice(idx, 1);
    state.sets = state.sets.filter((s) => s.exerciseId !== id);
    defineExercises();
    render();
    undoSlot = { def, idx, sets };
    showSnack(def.name + " removed" + (sets.length ? " with " + plural(sets.length, "set") : ""));
  }

  function renderHome() {
    $("home-title").textContent = longDate(TODAY);
    const n = S.streak(state.sets, state.goal, TODAY); // one streak for all exercises, shown on every card
    EXERCISES.forEach((e) => {
      const f = cards[e.id], t = S.totals(state.sets, e.id), tt = t[TODAY] || 0, yt = t[yesterday] || 0;
      f.streak.innerHTML = streakHtml(n);
      f.streak.setAttribute("aria-label", "Streak: " + plural(n, "week"));
      f.today.textContent = e.show(tt);
      f.todayBest.textContent = tt ? "Best set " + e.show(S.bestSet(state.sets, TODAY, e.id)) : "Best set -";
      f.yday.className = "figure figure--s num" + (yt ? "" : " figure--nodata");
      f.yday.textContent = yt ? e.show(yt) : "No data";
      f.ydayBest.textContent = yt ? "Best set " + e.show(S.bestSet(state.sets, yesterday, e.id)) : "";
      [f.today, f.yday].forEach((n) => n.style.setProperty("--chars", n.textContent.length));
      f.gap.textContent = !yt ? (tt ? "Nothing from yesterday to compare." : "No sets yet. Add your first set below.")
        : tt < yt ? e.show(yt - tt) + " to match yesterday." : tt === yt ? "Level with yesterday." : e.show(tt - yt) + " past yesterday.";
      f.bar.style.setProperty("--p", yt ? Math.min(tt / yt, 1) : 0);
      f.bar.classList.toggle("is-past", yt > 0 && tt > yt);
      const ever = S.bestEver(state.sets, e.id);
      f.allBest.textContent = ever ? "All-time best set " + e.show(ever) : "All-time best set -";
      const bestDay = S.bestDay(t); // t = this exercise's total for each day, so this is its biggest day
      f.allDay.textContent = bestDay ? "All-time best day " + e.show(bestDay) : "All-time best day -";
      f.form.dataset.date = TODAY;
      setsList(f.sets, TODAY, "No sets yet today. Enter your first set above.", e);
    });
    syncDots();
    renderGhost();
  }

  // month view: one calendar for every exercise. A day is active if any set was logged,
  // and its shade follows how many sets were done that day.
  function renderMonth() {
    const dates = Object.keys(S.counts(state.sets)).sort();
    const cur = TODAY.slice(0, 7), earliest = dates.length ? dates[0].slice(0, 7) : cur;
    const key = state.y + "-" + String(state.m).padStart(2, "0");
    $("prev").disabled = key <= earliest;
    $("next").disabled = key >= cur;
    $("month-title").textContent = new Date(Date.UTC(state.y, state.m - 1, 1)).toLocaleDateString("en-GB", { month: "long", year: "numeric", timeZone: "UTC" });
    const n = S.streak(state.sets, state.goal, TODAY);
    $("streak-month").innerHTML = streakHtml(n) + `<span>in a row</span>`;
    const grid = S.monthCells(state.sets, state.goal, state.y, state.m, TODAY);
    $("month-grid").innerHTML = grid.cells.map((c) => {
      if (!c.date) return `<span class="day day--blank" aria-hidden="true"></span>`;
      const label = shortDate(c.date) + ", " + (c.future ? "not available yet" : c.count ? plural(c.count, "set") + ", level " + c.level + " of 4" + (c.flame ? ", week goal met" : "") : "no sets");
      return `<button class="day${c.today ? " day--today" : ""}" type="button" data-date="${c.date}" data-level="${c.level}" aria-label="${label}"${c.future ? " disabled" : ""}>`
        + `<span class="day__n num">${c.day}</span>`
        + (c.flame ? `<svg class="day__flame" width="12" height="12" aria-hidden="true"><use href="#flame"/></svg>` : "")
        + (c.count ? `<span class="day__reps num">${c.count}</span>` : "") + `</button>`;
    }).join("");
    $("legend-note").textContent = grid.best ? "Shaded by sets done. Your busiest day: " + plural(grid.best, "set") + "." : "Shading starts after your first set.";
  }

  // Settings: the list of exercises. Adding happens on the ghost card on Home; removing is here, with Undo.
  function renderExercises() {
    $("ex-list").innerHTML = EXERCISES.map((e) => {
      const custom = state.custom.some((c) => c.id === e.id);
      return `<li class="row"><div class="row__text"><p class="row__title">${esc(e.name)}</p><p class="row__note">${e.kind === "time" ? "Timed" : "Counted in reps"}${custom ? "" : ", built in"}</p></div>`
        + (custom ? `<button class="btn btn--secondary" type="button" data-remove="${e.id}" aria-label="Remove ${esc(e.name)}">Remove</button>` : "") + "</li>";
    }).join("");
    $("ex-hint").textContent = EXERCISES.length >= MAX_EXERCISES
      ? "You have " + MAX_EXERCISES + " exercises, the most you can keep. Remove one to add another."
      : "Add a new one from the last card on Home. An exercise's type is fixed once it is created, so remove it and add it again to change it.";
  }
  $("ex-list").addEventListener("click", (e) => { const b = e.target.closest("button[data-remove]"); if (b) removeExercise(b.dataset.remove); });

  function renderSettings() {
    renderExercises();
    $("goal-value").textContent = state.goal;
    $("goal-dec").disabled = state.goal <= 1;
    $("goal-inc").disabled = state.goal >= 7;
    $("export-note").textContent = "Last export: " + (state.lastExport ? new Date(state.lastExport).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" }) : "Never");
    $("row-restore").hidden = !state.backup;
  }

  // day sheet: lists the day's sets for every exercise; the picker chooses which exercise a new set is for
  let openDate = null, dayEx = EXERCISES[0].id;
  $("day-ex").addEventListener("click", (e) => {
    const b = e.target.closest("button[data-ex]");
    if (!b) return;
    dayEx = b.dataset.ex;
    dayWheel.config(exById[dayEx], recent(exById[dayEx]));
    renderDay();
  });
  function renderDay() {
    if (!openDate) return;
    const ex = exById[dayEx], has = (e) => state.sets.some((s) => s.date === openDate && s.exerciseId === e.id);
    $("day-title").textContent = longDate(openDate);
    $("day-note").textContent = openDate < TODAY ? "Adding a set here fills in a past day." : "";
    $("day-ex").querySelectorAll("button").forEach((b) => b.setAttribute("aria-pressed", String(b.dataset.ex === ex.id)));
    $("lbl-day").textContent = ex.entry;
    $("entry-day").dataset.date = openDate;
    const box = $("sets-day");
    box.innerHTML = EXERCISES.some(has)
      ? EXERCISES.filter(has).map((e) => `<h3 class="sheet__ex">${esc(e.name)}</h3><ul class="sets" data-ex="${e.id}"></ul>`).join("")
      : `<ul class="sets"><li class="sets__empty">No sets this day. Add one below.</li></ul>`;
    box.querySelectorAll("ul[data-ex]").forEach((ul) => setsList(ul, openDate, "", exById[ul.dataset.ex]));
  }

  function render() { renderHome(); renderMonth(); renderSettings(); renderDay(); save(); }

  // Celebration: full-screen confetti and a banner when today's total passes yesterday's.
  const cheer = $("cheer"), cv = $("confetti");
  let cheerTimer = 0, confettiRaf = 0;
  function stopCheer() {
    clearTimeout(cheerTimer);
    cancelAnimationFrame(confettiRaf);
    cv.getContext("2d").clearRect(0, 0, cv.width, cv.height);
    cheer.classList.remove("on");
    try { cheer.hidePopover(); } catch (x) { /* not open, or popovers unsupported */ }
  }
  function confetti() {
    const dpr = devicePixelRatio || 1, W = innerWidth, H = innerHeight, g = cv.getContext("2d");
    cv.width = W * dpr; cv.height = H * dpr;
    g.scale(dpr, dpr);
    const colors = ["#f2ce1f", "#d92225", "#34a85a", "#72e19a", "#14161a", "#ffffff"], ps = [];
    const add = (x, y, a, s) => ps.push({ x, y, vx: Math.cos(a) * s, vy: Math.sin(a) * s, w: 6 + Math.random() * 7, h: 4 + Math.random() * 6, r: Math.random() * 6.28, vr: (Math.random() - 0.5) * 0.4, c: colors[(Math.random() * colors.length) | 0], dot: Math.random() < 0.25, t: Math.random() * 6 });
    // two cannons in the bottom corners, aimed up and inward
    for (let i = 0; i < 80; i++) {
      add(0, H, -0.7 - Math.random() * 0.7, 14 + Math.random() * 14);
      add(W, H, -Math.PI + 0.7 + Math.random() * 0.7, 14 + Math.random() * 14);
    }
    const t0 = performance.now();
    let last = t0;
    (function frame(now) {
      const dt = Math.min((now - last) / 16.67, 2.5), age = now - t0;
      last = now;
      if (age < 1400) for (let i = 0; i < 3; i++) add(Math.random() * W, -12, Math.PI / 2 + (Math.random() - 0.5) * 0.6, 2 + Math.random() * 3); // rain from the top
      g.clearRect(0, 0, W, H);
      let live = 0;
      for (const p of ps) {
        p.vy += 0.38 * dt;
        p.vx *= Math.pow(0.985, dt);
        p.vy *= Math.pow(0.992, dt);
        p.x += p.vx * dt; p.y += p.vy * dt; p.r += p.vr * dt; p.t += 0.2 * dt;
        if (p.y < H + 20) live++;
        g.save();
        g.translate(p.x, p.y);
        g.rotate(p.r);
        g.scale(1, Math.cos(p.t)); // flutter
        g.fillStyle = p.c;
        if (p.dot) { g.beginPath(); g.arc(0, 0, p.w / 2.5, 0, 6.29); g.fill(); } else g.fillRect(-p.w / 2, -p.h / 2, p.w, p.h);
        g.restore();
      }
      if (age < 1400 || live) confettiRaf = requestAnimationFrame(frame);
    })(t0);
  }
  function celebrate(ex, now, target) {
    stopCheer();
    const msg = ex.name + ": " + ex.show(now) + " beats yesterday's " + ex.show(target) + ".";
    $("cheer-sub").textContent = msg;
    $("cheer-live").textContent = "";
    setTimeout(() => { $("cheer-live").textContent = "Congratulations, champ! " + msg; }, 50); // a change after the last one, so it is announced
    cheer.classList.add("on");
    try { cheer.showPopover(); } catch (x) { /* falls back to plain z-order */ }
    if (!calm) confetti();
    cheerTimer = setTimeout(stopCheer, 4200);
  }
  // runs a change to today's sets and celebrates if it takes the total from at most yesterday's to above it
  function beatYesterday(exId, change) {
    const total = (d) => S.totals(state.sets, exId)[d] || 0, y = total(yesterday), before = total(TODAY);
    change();
    const after = total(TODAY);
    if (y > 0 && before <= y && after > y) celebrate(exById[exId], after, y);
  }

  // add a set; the date is read at submit time (a real build recomputes today here too)
  function addSet(form, wheel, ex) {
    beatYesterday(ex, () => state.sets.push(mk(form.dataset.date, wheel.get(), ex)));
    render();
  }
  deck.addEventListener("submit", (e) => {
    e.preventDefault();
    if (e.target.id === "new-form") createExercise();
    else addSet(e.target, homeWheel[e.target.dataset.ex], e.target.dataset.ex);
  });
  $("entry-day").addEventListener("submit", (e) => { e.preventDefault(); addSet(e.target, dayWheel, dayEx); });

  // edit and delete
  let editing = null;
  function openEdit(id) {
    editing = state.sets.find((s) => s.id === id);
    if (!editing) return;
    const ex = exById[editing.exerciseId];
    $("lbl-edit").textContent = ex.entry;
    editWheel.config(ex, editing.reps);
    $("edit-sheet").showModal();
    $("reps-edit").focus();
  }
  document.addEventListener("click", (e) => {
    const row = e.target.closest(".sets button[data-id]");
    if (row) openEdit(row.dataset.id);
    const close = e.target.closest("[data-close]");
    if (close) close.closest("dialog").close();
    const day = e.target.closest(".day[data-date]");
    if (day && !day.disabled) {
      openDate = day.dataset.date;
      dayEx = state.ex; // start on the exercise whose card is in front on Home
      dayWheel.config(exById[dayEx], recent(exById[dayEx]));
      renderDay();
      $("day-sheet").showModal();
    }
  });
  $("day-sheet").addEventListener("close", () => { openDate = null; });
  $("edit-form").addEventListener("submit", (e) => {
    e.preventDefault();
    beatYesterday(editing.exerciseId, () => { editing.reps = editWheel.get(); });
    $("edit-sheet").close();
    render();
  });

  // confirm dialog
  let onOk = null;
  function ask(title, body, okLabel, fn) {
    $("confirm-title").textContent = title;
    $("confirm-body").textContent = body;
    $("confirm-ok").textContent = okLabel;
    onOk = fn;
    $("confirm-sheet").showModal();
  }
  $("confirm-ok").addEventListener("click", () => { $("confirm-sheet").close(); if (onOk) onOk(); });
  $("edit-delete").addEventListener("click", () => {
    const target = editing;
    ask("Delete this set?", "This removes the set and updates the totals.", "Delete", () => {
      state.sets = state.sets.filter((s) => s !== target);
      $("edit-sheet").close();
      render();
    });
  });

  // month navigation
  $("prev").addEventListener("click", () => { state.m--; if (state.m < 1) { state.m = 12; state.y--; } renderMonth(); });
  $("next").addEventListener("click", () => { state.m++; if (state.m > 12) { state.m = 1; state.y++; } renderMonth(); });

  // weekly goal (one goal for every exercise), with the old and new streaks shown before it applies
  function changeGoal(g) {
    const from = S.streak(state.sets, state.goal, TODAY), to = S.streak(state.sets, g, TODAY);
    ask("Change the weekly goal to " + plural(g, "day") + "?", "Your streak goes from " + plural(from, "week") + " to " + plural(to, "week") + ". The goal applies to every week, past and present.", "Change goal", () => { state.goal = g; render(); });
  }
  $("goal-dec").addEventListener("click", () => { if (state.goal > 1) changeGoal(state.goal - 1); });
  $("goal-inc").addEventListener("click", () => { if (state.goal < 7) changeGoal(state.goal + 1); });

  // export: a real file download
  $("export").addEventListener("click", () => {
    state.lastExport = Date.now();
    const data = { schemaVersion: 1, settings: { weeklyGoal: state.goal, lastExportAt: state.lastExport, exercises: state.custom }, sets: state.sets };
    const a = document.createElement("a");
    a.href = URL.createObjectURL(new Blob([JSON.stringify(data, null, 2)], { type: "application/json" }));
    a.download = "workout-tracker-" + new Date().toISOString().slice(0, 10) + ".json";
    a.click();
    URL.revokeObjectURL(a.href);
    renderSettings();
    save();
  });

  // import: validate everything, then confirm, then replace (the old data is kept for one undo)
  function validate(text) {
    if (text.length > 2000000) return "The file is larger than 2 MB.";
    let d;
    try { d = JSON.parse(text); } catch (x) { return "The file is not valid JSON."; }
    if (!d || d.schemaVersion !== 1 || !Array.isArray(d.sets) || !d.settings) return "The file is not an export from this app.";
    if (d.sets.length > 20000) return "The file has more than 20,000 sets.";
    const g = d.settings.weeklyGoal;
    if (!Number.isInteger(g) || g < 1 || g > 7) return "The weekly goal in the file is out of range.";
    const defs = d.settings.exercises === undefined ? [] : d.settings.exercises; // files from before custom exercises have none
    if (!Array.isArray(defs) || defs.length > MAX_EXERCISES - BUILTIN.length || !defs.every(validDef) || new Set(defs.map((x) => x.id)).size !== defs.length) return "The exercises in the file are not valid.";
    d.settings.exercises = cleanDefs(defs);
    const known = new Set([...BUILTIN, ...d.settings.exercises].map((x) => x.id));
    const ids = new Set();
    for (const s of d.sets) {
      if (typeof s.id !== "string" || ids.has(s.id)) return "A set id is missing or repeated.";
      ids.add(s.id);
      if (!known.has(s.exerciseId)) return "A set has an unknown exercise.";
      if (!Number.isInteger(s.reps) || s.reps < 1 || s.reps > 9999) return "A set has a value outside 1 to 9999.";
      if (typeof s.date !== "string" || !/^[0-9]{4}-[0-9]{2}-[0-9]{2}$/.test(s.date) || S.toS(S.toN(s.date)) !== s.date || s.date > TODAY) return "A set has an invalid or future date.";
    }
    return d;
  }
  $("import-file").addEventListener("change", (e) => {
    const f = e.target.files[0];
    $("err-import").textContent = "";
    if (!f) return;
    f.text().then((text) => {
      const d = validate(text);
      if (typeof d === "string") { $("err-import").textContent = d + " Nothing was changed."; return; }
      ask("Replace all current data with this file?", "Your current data is kept once, so you can restore it from Settings.", "Replace", () => {
        hideSnack();
        state.backup = { goal: state.goal, sets: state.sets, custom: state.custom, lastExport: state.lastExport };
        state.goal = d.settings.weeklyGoal; state.sets = d.sets; state.custom = d.settings.exercises;
        defineExercises();
        render();
      });
    });
    e.target.value = "";
  });
  $("restore").addEventListener("click", () => ask("Restore previous data?", "This swaps your current data for the data from before the last import.", "Restore", () => {
    hideSnack();
    const b = state.backup; state.backup = { goal: state.goal, sets: state.sets, custom: state.custom, lastExport: state.lastExport };
    state.goal = b.goal; state.sets = b.sets; state.lastExport = b.lastExport; state.custom = b.custom || [];
    defineExercises();
    render();
  }));

  // tabs, from the URL hash
  function route() {
    const v = ["home", "month", "settings"].includes(location.hash.slice(1)) ? location.hash.slice(1) : "home";
    if (v === "home") layout(); // place the stack while Home is still hidden, so nothing animates
    ["home", "month", "settings"].forEach((n) => { $("view-" + n).hidden = n !== v; });
    document.querySelectorAll(".tabs a").forEach((a) => { if (a.dataset.tab === v) a.setAttribute("aria-current", "page"); else a.removeAttribute("aria-current"); });
    scrollTo(0, 0);
  }
  addEventListener("hashchange", route);

  $("first-run").hidden = !modes.includes("first");
  $("update").hidden = !modes.includes("update");
  $("reload").addEventListener("click", () => { $("update").hidden = true; });
  // first paint waits for the saved data, so an empty state can never overwrite it
  load().then(() => {
    defineExercises(); // builds the cards from the saved exercises, each wheel on its last set
    render();
    route();
    // drop the old localStorage copy only once the snapshot is safely in IndexedDB
    save().then((ok) => { if (ok) try { localStorage.removeItem(LEGACY_KEY); } catch (x) { /* ignore */ } });
  });
})();
