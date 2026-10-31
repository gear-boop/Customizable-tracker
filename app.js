"use strict";

const $app = document.getElementById("app");
const $modal = document.getElementById("modal-root");

const AREAS = [
  { id: "fitness", label: "Fitness & movement", emoji: "💪" },
  { id: "health", label: "Health & nutrition", emoji: "🥗" },
  { id: "learning", label: "Learning & reading", emoji: "📚" },
  { id: "mindfulness", label: "Mindfulness & calm", emoji: "🧘" },
  { id: "sleep", label: "Sleep & rest", emoji: "😴" },
  { id: "productivity", label: "Productivity & focus", emoji: "📋" },
  { id: "creativity", label: "Creativity", emoji: "🎨" },
  { id: "social", label: "Social & relationships", emoji: "💬" },
  { id: "finance", label: "Money habits", emoji: "💰" },
  { id: "screentime", label: "Screen-time control", emoji: "📵" },
];
const SUGGESTIONS = {
  fitness: "Move your body for 20 minutes",
  health: "Drink 8 glasses of water",
  learning: "Read 10 pages",
  mindfulness: "Meditate for 5 minutes",
  sleep: "No screens 30 min before bed",
  productivity: "Plan tomorrow's top 3 tasks",
  creativity: "Create something for 15 minutes",
  social: "Reach out to one friend or family member",
  finance: "Log every expense",
  screentime: "No phone for the first hour awake",
};
const AREA_EMOJI = Object.fromEntries(AREAS.map((a) => [a.id, a.emoji]));
const AREA_LABEL = Object.fromEntries(AREAS.map((a) => [a.id, a.label]));
function esc(s) {
  return String(s).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
}
async function api(path, opts = {}) {
  const res = await fetch(path, {
    headers: { "content-type": "application/json" },
    ...opts,
    body: opts.body ? JSON.stringify(opts.body) : undefined,
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error || `Request failed (${res.status})`);
  return data;
}
function localDate() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}
const DAY_LETTERS = ["M", "T", "W", "T", "F", "S", "S"];
let currentDate = localDate();
function watchDateRollover() {
  const check = () => {
    const now = localDate();
    if (now === currentDate) return;
    currentDate = now;
    if (document.getElementById("habit-list")) reload();
  };
  setInterval(check, 30000);
  document.addEventListener("visibilitychange", () => { if (!document.hidden) check(); });
}
function toast(msg) {
  let el = document.getElementById("toast");
  if (!el) {
    el = document.createElement("div");
    el.id = "toast";
    el.setAttribute("role", "status");
    el.setAttribute("aria-live", "polite");
    document.body.appendChild(el);
  }
  el.textContent = msg;
  el.classList.add("show");
  clearTimeout(toast._t);
  toast._t = setTimeout(() => el.classList.remove("show"), 3200);
}
(async function boot() {
  try {
    const state = await api(`/api/state?date=${localDate()}`);
    if (!state.preferences) renderOnboarding();
    else {
      renderDashboard(state);
      watchDateRollover();
    }
  } catch (e) {
    $app.innerHTML = `<div class="wrap"><div class="card"><h2>Could not load your data</h2><p class="sub">${esc(e.message)}</p></div></div>`;
  }
})();
function renderOnboarding() {
  const answers = {
    name: "",
    focusAreas: [],
    why: "",
    trackingStyle: "binary",
    checkinTime: "evening",
    streakMode: "forgiving",
    startHabits: 3,
    habits: new Set(),
    counts: {},
  };

  const steps = [
    { label: "First", title: "Hey! Quick question —", render: stepName, validate: (a, err) => {
      if (!a.name.trim()) return "Please tell me your name so I can greet you properly.";
    } },
    { label: "Focus", title: "Which areas of your life matter right now?", subtitle: "Pick as many as you like.", render: stepAreas, validate: (a) => a.focusAreas.length ? null : "Pick at least one area." },
    { label: "Why", title: "Why do you want to track these habits?", subtitle: "This stays on your dashboard to keep you going.", render: stepWhy, validate: (a) => a.why.trim() ? null : "A sentence or two is enough — but I need something." },
    { label: "Style", title: "How do you prefer to check things off?", render: stepStyle, validate: () => null },
    { label: "Timing", title: "When do you want to do your daily check-in?", render: stepTiming, validate: () => null },
    { label: "Streaks", title: "How strict should your streaks be?", render: stepStreak, validate: () => null },
    { label: "Habits", title: "Which habits should we start with?", subtitle: "Suggestions based on what you told me — edit freely.", render: stepHabits, validate: (a) => a.habits.size ? null : "Pick at least one habit." },
    { label: "Review", title: "Ready to save your preferences?", render: stepReview, validate: () => null },
  ];

  let i = 0;
  let error = "";

  function go(n) { i = Math.max(0, Math.min(steps.length - 1, n)); error = ""; draw(); }

  function draw() {
    const s = steps[i];
    const pct = Math.round(((i + 1) / steps.length) * 100);
    $app.innerHTML = `
      <div class="wrap">
        <div class="ob-header">
          <h1>🎀 Your Habit Tracker</h1>
          <p class="sub">Answer the questions below — nothing is saved until your final confirmation. Progress: step ${i + 1} of ${steps.length}.</p>
          <div class="progress"><i style="width:${pct}%"></i></div>
        </div>
        <div class="card">
          <div class="step-label">Question ${i + 1} · ${esc(s.label)}</div>
          <h2>${esc(s.title)}</h2>
          ${s.subtitle ? `<p class="sub">${esc(s.subtitle)}</p>` : ""}
          <div id="step-body">${s.render(answers, draw)}</div>
          <div class="err" id="err">${esc(error)}</div>
          <div class="ob-nav">
            <button class="btn ghost" id="back" ${i === 0 ? "disabled" : ""}>← Back</button>
            <button class="btn ${i === steps.length - 1 ? "primary" : "primary"}" id="next">
              ${i === steps.length - 1 ? "✓ Save my preferences" : "Next →"}
            </button>
          </div>
        </div>
      </div>`;

    document.getElementById("back").onclick = () => go(i - 1);
    document.getElementById("next").onclick = async () => {
      const err = s.validate(answers);
      if (err) { error = err; draw(); return; }
      if (i === steps.length - 1) return save();
      go(i + 1);
    };
  }

  async function save() {
    const btn = document.getElementById("next");
    btn.disabled = true;
    btn.textContent = "Saving…";
    if (window.__obCleanup) { window.__obCleanup(); window.__obCleanup = null; }
    try {
      await api("/api/onboarding", {
        method: "POST",
        body: {
          name: answers.name.trim(),
          focusAreas: answers.focusAreas,
          why: answers.why.trim(),
          trackingStyle: answers.trackingStyle,
          checkinTime: answers.checkinTime,
          streakMode: answers.streakMode,
          startHabits: answers.startHabits,
          habits: [...answers.habits].map((name) => ({
            name,
            area: answers.counts[name]?.area ?? "",
            icon: answers.counts[name]?.emoji ?? "✅",
            style: answers.trackingStyle === "count" ? "count" : "binary",
            unit: answers.counts[name]?.unit ?? "times",
            target: answers.trackingStyle === "count" ? Number(answers.counts[name]?.target) || 5 : 1,
          })),
        },
      });
      const state = await api(`/api/state?date=${localDate()}`);
      renderDashboard(state);
    } catch (e) {
      error = e.message;
      btn.disabled = false;
      btn.textContent = "✓ Save my preferences";
      document.getElementById("err").textContent = error;
    }
  }

  draw();
  function stepName(a) {
    setTimeout(() => document.getElementById("q-name")?.focus());
    return `<input type="text" id="q-name" placeholder="Your name" value="${esc(a.name)}" />`;
  }

  function stepAreas(a) {
    return `<div class="choices grid2">${AREAS.map((ar) => `
      <div class="choice ${a.focusAreas.includes(ar.id) ? "selected" : ""}" data-area="${ar.id}">
        <span class="emoji">${ar.emoji}</span><span>${esc(ar.label)}</span>
      </div>`).join("")}</div>`;
  }

  function stepWhy(a) {
    setTimeout(() => document.getElementById("q-why")?.focus());
    return `<textarea id="q-why" placeholder="e.g. I want to feel more energetic and stop doom-scrolling at night…">${esc(a.why)}</textarea>`;
  }

  function stepStyle(a) {
    return `<div class="choices">
      <div class="choice ${a.trackingStyle === "binary" ? "selected" : ""}" data-style="binary">
        <span class="emoji">✅</span><div>Simple yes / no checks<small>Did I do it today? Done.</small></div>
      </div>
      <div class="choice ${a.trackingStyle === "count" ? "selected" : ""}" data-style="count">
        <span class="emoji">🔢</span><div>Count toward a daily target<small>e.g. 8 glasses of water, 10 pages of a book</small></div>
      </div>
    </div>`;
  }

  function stepTiming(a) {
    const opts = [
      { id: "morning", label: "Morning", emoji: "🌅", desc: "Set the tone early" },
      { id: "midday", label: "Midday", emoji: "☀️", desc: "Reset at lunch" },
      { id: "evening", label: "Evening", emoji: "🌙", desc: "Reflect on the day" },
      { id: "flexible", label: "Flexible", emoji: "✨", desc: "Whenever it suits me" },
    ];
    return `<div class="choices grid2">${opts.map((o) => `
      <div class="choice ${a.checkinTime === o.id ? "selected" : ""}" data-time="${o.id}">
        <span class="emoji">${o.emoji}</span><div>${o.label}<small>${o.desc}</small></div>
      </div>`).join("")}</div>`;
  }

  function stepStreak(a) {
    const opts = [
      { id: "forgiving", label: "Forgiving", emoji: "🌱", desc: "Missing a day doesn't wipe everything — streaks pause instead of resetting" },
      { id: "classic", label: "Classic", emoji: "🏹", desc: "A missed day resets the streak to zero. High pressure, high reward." },
    ];
    return `<div class="choices">${opts.map((o) => `
      <div class="choice ${a.streakMode === o.id ? "selected" : ""}" data-streak="${o.id}">
        <span class="emoji">${o.emoji}</span><div>${o.label}<small>${o.desc}</small></div>
      </div>`).join("")}</div>`;
  }

  function stepHabits(a) {
    const sugg = [];
    for (const area of a.focusAreas) {
      const name = SUGGESTIONS[area];
      if (name && !sugg.some(([, n]) => n === name)) sugg.push([area, name]);
    }
    a.counts["Create a custom habit"] = { area: "custom", emoji: "✨", unit: "times", target: 5 };
    const customAllowed = a.startHabits;
    let body = `<div class="habit-pick">`;
    for (const [area, name] of sugg) {
      const checked = a.habits.has(name);
      a.counts[name] = { area, emoji: AREA_EMOJI[area] ?? "✨", unit: "times", target: 5 };
      body += `<label class="habit-row ${checked ? "checked" : ""}" data-name="${esc(name)}">
        <input type="checkbox" ${checked ? "checked" : ""} aria-label="${esc(name)}"/>
        <span class="emoji">${AREA_EMOJI[area]}</span>
        <span class="grow">${esc(name)}<br/><span class="tag">suggested · ${esc(AREA_LABEL[area] ?? area)}</span></span>
      </label>`;
    }
    body += `</div>`;
    body += `
      <div class="add-row">
        <input type="text" id="q-custom" placeholder="Add your own habit…" />
        <button class="btn" id="q-add">Add</button>
      </div>
      <p class="sub" style="margin-top:14px">Recommended: start with <b>${customAllowed <= 2 ? "1–2" : "3–5"}</b> habits. You can add or remove habits any time later.</p>`;
    return body;
  }

  function stepReview(a) {
    const styleTxt = a.trackingStyle === "binary" ? "Simple yes/no daily checks" : "Count toward daily targets";
    const timeTxt = { morning: "Morning 🌅", midday: "Midday ☀️", evening: "Evening 🌙", flexible: "Flexible ✨" }[a.checkinTime];
    const streakTxt = a.streakMode === "forgiving" ? "Forgiving — missed days don't reset everything 🌱" : "Classic strict streaks 🏹";
    return `<ul class="review-list">
      <li><span class="k">Your name</span><span>${esc(a.name)}</span></li>
      <li><span class="k">Focus areas</span><span>${esc(a.focusAreas.map((f) => AREA_LABEL[f] ?? f).join(", "))}</span></li>
      <li><span class="k">Why</span><span>${esc(a.why)}</span></li>
      <li><span class="k">Tracking style</span><span>${esc(styleTxt)}</span></li>
      <li><span class="k">Daily check-in</span><span>${esc(timeTxt)}</span></li>
      <li><span class="k">Streak mode</span><span>${esc(streakTxt)}</span></li>
      <li><span class="k">Starting habits</span><span>${esc([...a.habits].join(", ") || "—")}</span></li>
    </ul>
    <p class="sub" style="margin-top:16px">Click “Save my preferences” to lock these in. Nothing has been saved yet.</p>`;
  }

  document.addEventListener("click", onDocClick);
  document.addEventListener("input", onDocInput);
  function onDocClick(e) {
    const choice = e.target.closest(".choice");
    if (choice) {
      const area = choice.dataset.area, style = choice.dataset.style, time = choice.dataset.time, streak = choice.dataset.streak;
      if (area) { const idx = answers.focusAreas.indexOf(area); idx >= 0 ? answers.focusAreas.splice(idx, 1) : answers.focusAreas.push(area); }
      else if (style) answers.trackingStyle = style;
      else if (time) answers.checkinTime = time;
      else if (streak) answers.streakMode = streak;
      draw();
      return;
    }
    const cb = e.target.closest("label.habit-row input[type=checkbox]");
    if (cb) {
      const name = cb.closest("label.habit-row").dataset.name;
      cb.checked ? answers.habits.add(name) : answers.habits.delete(name);
      cb.closest("label.habit-row").classList.toggle("checked", cb.checked);
      return;
    }
    if (e.target.id === "q-add") {
      addCustom();
    }
  }
  function onDocInput(e) {
    if (e.target.id === "q-name") answers.name = e.target.value;
    if (e.target.id === "q-why") answers.why = e.target.value;
  }
  let warned = false;
  function cleanup() {
    document.removeEventListener("click", onDocClick);
    document.removeEventListener("input", onDocInput);
  }

  async function addCustom() {
    const inp = document.getElementById("q-custom");
    const name = inp.value.trim();
    if (!name) return;
    if (answers.habits.size >= 12 && !warned) {
      warned = true;
      document.getElementById("err").textContent = "Twelve habits is plenty to start — save these first!";
      return;
    } else warned = false;
    answers.counts[name] = { area: "custom", emoji: "✨", unit: "times", target: 5 };
    answers.habits.add(name);
    inp.value = "";
    draw();
  }
  window.__obCleanup = cleanup;
}

let doneTodayCount = 0;
let prefsOpen = false;

function renderDashboard(state) {
  const prefs = state.preferences;
  const today = state.today;
  document.title = `${prefs.name ? prefs.name + "'s" : "My"} Habit Tracker 🎀`;
  const dateNice = new Date(today + "T00:00:00").toLocaleDateString(undefined, { weekday: "long", month: "long", day: "numeric" });
  const doneCount = state.habits.filter((h) => h.doneToday).length;
  const total = state.habits.length;
  const pct = total ? Math.round((doneCount / total) * 100) : 0;
  doneTodayCount = doneCount;
  const allTime = state.stats?.totalCheckins ?? 0;
  $app.innerHTML = `
  <div class="wrap">
    <div class="topbar">
      <h1>${prefs.name ? esc(prefs.name) + "'s" : "My"} Habit Tracker 🎀</h1>
      <div class="stats">
        <div class="stat"><b id="stat-done">${doneCount}/${total}</b>done today</div>
        <div class="stat"><b>${Math.max(...state.habits.map((h) => h.streak), 0)}</b>best active streak</div>
        <div class="stat"><b>${state.habits.reduce((s, h) => s + h.streak, 0)}</b>total 🎀</div>
        <div class="stat"><b>${allTime}</b>all-time ✓</div>
      </div>
    </div>
    <p class="today-date">${esc(dateNice)} · Time to ${esc({ morning: "set the tone ☀️", midday: "reset ☀️", evening: "reflect on the day 🌙", flexible: "check in ✨" }[prefs.checkinTime] ?? "check in ✨")}</p>

    <div class="dashboard">
      <aside class="side-col left">
        <div class="card news-card side-card">
          <div class="news-head">
            <h3>World 🌍 <span class="news-age sub" id="news-age-l"></span></h3>
            <button class="btn ghost news-refresh" id="news-refresh" title="Refresh headlines">↻</button>
          </div>
          <div class="news-list" id="news-left"><div class="empty">Loading headlines…</div></div>
          <p class="sub" style="margin-top:10px;font-size:12px">A quick, finite read — no doomscroll needed.</p>
        </div>
      </aside>

      <aside class="side-col right">
        <div class="card news-card side-card">
          <div class="news-head">
            <h3>Tech 💻 <span class="news-age sub" id="news-age-r"></span></h3>
          </div>
          <div class="news-list" id="news-right"><div class="empty">Loading headlines…</div></div>
          <p class="sub" style="margin-top:10px;font-size:12px">Headlines open the original article.</p>
        </div>
      </aside>
    </div>

    <div class="main-col">
      ${prefs.why ? `<div class="card" style="border-left:3px solid var(--accent)"><em style="color:var(--muted)">“${esc(prefs.why)}”</em></div>` : ""}
      <div id="habit-list">${state.habits.map((h) => habitCard(h, prefs)).join("") || '<div class="empty">No habits yet — add one below.</div>'}</div>
      <div class="card overall">
        <b>Today's progress</b> <span class="sub" id="overall-count" style="display:inline">${doneCount} of ${total} habits</span>
        <div class="bar" role="progressbar" aria-label="Today's progress" aria-valuemin="0" aria-valuemax="100" aria-valuenow="${pct}"><i id="overall-bar" style="width:${pct}%"></i></div>
      </div>
    </div>

    <div class="card" id="quote-card"></div>

    <div class="card">
      <h3>Last 5 weeks 👀</h3>
      <p class="sub">Darker = more habits done that day.</p>
      <div class="heat" id="heat-map">${heatMap(state.month, prefs)}</div>
    </div>

    <div class="card" id="celebrate-card" style="display:none"></div>

    <div class="actions-row">
      <button class="btn primary" id="add-habit">＋ Add a habit</button>
      <button class="btn ghost" id="show-prefs">My preferences</button>
    </div>

    <div class="card" id="prefs-card" style="display:${prefsOpen ? "block" : "none"};margin-top:18px">
      <h3>Your saved preferences ✅</h3>
      <div class="prefs-grid">
        <div><div class="k">Name</div>${esc(prefs.name)}</div>
        <div><div class="k">Focus areas</div>${esc((prefs.focusAreas || []).map((f) => AREA_LABEL[f] ?? f).join(", "))}</div>
        <div><div class="k">Tracking style</div>${prefs.trackingStyle === "binary" ? "Yes/no daily checks" : "Daily counts"}</div>
        <div><div class="k">Check-in</div>${esc(prefs.checkinTime)}</div>
        <div><div class="k">Streak mode</div>${esc(prefs.streakMode)}</div>
        <div><div class="k">Started</div>${esc(prefs.startHabits)} habits</div>
      </div>
      ${prefs.why ? `<div class="prefs-grid" style="margin-top:10px"><div><div class="k">Why</div>${esc(prefs.why)}</div></div>` : ""}
    </div>
  </div>`;

  const prefsBtn = document.getElementById("show-prefs");
  prefsBtn.setAttribute("aria-controls", "prefs-card");
  prefsBtn.setAttribute("aria-expanded", String(prefsOpen));
  prefsBtn.onclick = () => {
    const c = document.getElementById("prefs-card");
    prefsOpen = !prefsOpen;
    c.style.display = prefsOpen ? "block" : "none";
    prefsBtn.setAttribute("aria-expanded", String(prefsOpen));
  };
  document.getElementById("add-habit").onclick = () => addHabitModal();

  renderQuoteCard(prefs);
  initNews();
  checkCelebration(state);

  for (const h of state.habits) bindHabitCard(h, prefs, today);
}
const QUOTES = [
  ["We are what we repeatedly do. Excellence, then, is not an act but a habit.", "Aristotle"],
  ["You do not rise to the level of your goals. You fall to the level of your systems.", "James Clear"],
  ["Small steps, every day. That is how mountains get moved.", "Anonymous"],
  ["Discipline is choosing between what you want now and what you want most.", "Abraham Lincoln (attrib.)"],
  ["Motivation gets you started. Habit keeps you going.", "Jim Ryun"],
  ["A year from now, you'll wish you had started today.", "Karen Lamb"],
  ["Don't break the chain.", "Jerry Seinfeld"],
  ["Success is the sum of small efforts, repeated daily.", "Robert Collier"],
  ["The chains of habit are too light to be felt until they are too heavy to be broken.", "Warren Buffett"],
  ["First we make our habits, then our habits make us.", "John Dryden"],
];

function renderQuoteCard(prefs) {
  const now = new Date();
  const doy = Math.floor((now - new Date(now.getFullYear(), 0, 0)) / 86400000);
  const [text, author] = QUOTES[doy % QUOTES.length];
  document.getElementById("quote-card").innerHTML =
    `<em style="color:var(--text)">“${esc(text)}”</em> <span class="sub">— ${esc(author)} · quote ${doy % QUOTES.length + 1}/${QUOTES.length}, a new one each day</span>`;
}
let newsData = null;

async function initNews(force = false) {
  if (!force && newsData) return renderNewsLists();
  if (!initNews._bound) {
    document.addEventListener("click", (e) => {
      if (e.target.id === "news-refresh") {
        document.getElementById("news-left")?.replaceChildren();
        document.getElementById("news-right")?.replaceChildren();
        newsData = null;
        initNews(true);
      }
    });
    initNews._bound = true;
  }
  try {
    newsData = await api("/api/news");
  } catch {
    for (const id of ["news-left", "news-right"]) {
      const el = document.getElementById(id);
      if (el) el.innerHTML = '<div class="empty">Headlines unavailable — try ↻ later.</div>';
    }
    return;
  }
  renderNewsLists();
}

function renderNewsLists() {
  const paint = (el, list) => {
    if (!el) return;
    el.innerHTML = list.length
      ? list.map((n) => `
          <a class="news-item" href="${esc(n.url)}" target="_blank" rel="noopener noreferrer">
            ${n.extra ? `<span class="source">${esc(n.extra)}</span>` : ""}
            <span class="headline">${esc(n.title)}</span>
          </a>`).join("")
      : '<div class="empty">No headlines available right now.</div>';
  };
  paint(document.getElementById("news-left"), newsData?.world || []);
  paint(document.getElementById("news-right"), newsData?.tech || []);
  if (newsData?.fetchedAt) {
    const mins = Math.max(0, Math.round((Date.now() - Date.parse(newsData.fetchedAt)) / 60000));
    const age = mins <= 1 ? "· just updated" : `· updated ${mins} min ago`;
    for (const id of ["news-age-l", "news-age-r"]) {
      const el = document.getElementById(id);
      if (el) el.textContent = age;
    }
  }
}

function heatMap(month) {
  if (!month || !month.length) return '<div class="empty">No history yet.</div>';
  const total = month[0].total;
  const firstDow = new Date(month[0].date + "T00:00:00").getDay();
  const blanks = Array.from({ length: (firstDow + 6) % 7 }, () => '<div class="heat-cell blank"></div>').join("");
  const head = DAY_LETTERS.map((l) => `<div class="heat-dow">${l}</div>`).join("");
  return `<div class="heat-grid">${head}${blanks}${month.map((d) => {
    const ratio = total ? d.done / total : 0;
    const level = d.done === 0 ? 0 : ratio === 1 ? 4 : ratio >= 0.66 ? 3 : ratio >= 0.33 ? 2 : 1;
    return `<div class="heat-cell l${level}" title="${esc(d.date)}: ${d.done}/${d.total} habits done"></div>`;
  }).join("")}</div>
  <div class="heat-legend sub">less <i class="heat-cell l0"></i><i class="heat-cell l1"></i><i class="heat-cell l2"></i><i class="heat-cell l3"></i><i class="heat-cell l4"></i> more</div>`;
}

function checkCelebration(state) {
  const doneCount = state.habits.filter((h) => h.doneToday).length;
  const total = state.habits.length;
  const card = document.getElementById("celebrate-card");
  const flag = `celebrated-${state.today}`;
  if (total > 0 && doneCount === total) {
    card.style.display = "block";
    card.innerHTML = `<h3>All done, ${esc(state.preferences.name)}! 🎉</h3><p class="sub">Every habit checked off today. See you this evening 🌙</p>`;
    if (!localStorage.getItem(flag)) {
      localStorage.setItem(flag, "1");
      fireConfetti();
    }
  } else {
    card.style.display = "none";
  }
}

function fireConfetti() {
  let cvs = document.getElementById("confetti-canvas");
  if (!cvs) {
    cvs = document.createElement("canvas");
    cvs.id = "confetti-canvas";
    document.body.appendChild(cvs);
  }
  cvs.style.display = "block";
  const ctx = cvs.getContext("2d");
  const resize = () => { cvs.width = innerWidth; cvs.height = innerHeight; };
  resize();
  window.addEventListener("resize", resize, { once: true });
  const colors = ["#f472b6", "#f9a8d4", "#c084fc", "#fbbf24", "#fb7185", "#e879f9"];
  const parts = Array.from({ length: 140 }, () => ({
    x: Math.random() * cvs.width,
    y: -20 - Math.random() * cvs.height * 0.5,
    w: 6 + Math.random() * 6,
    h: 8 + Math.random() * 8,
    vy: 2.5 + Math.random() * 3.5,
    vx: -1.5 + Math.random() * 3,
    rot: Math.random() * Math.PI,
    vr: -0.12 + Math.random() * 0.24,
    color: colors[(Math.random() * colors.length) | 0],
  }));
  const started = Date.now();
  (function frame() {
    ctx.clearRect(0, 0, cvs.width, cvs.height);
    for (const p of parts) {
      p.x += p.vx; p.y += p.vy; p.rot += p.vr;
      ctx.save();
      ctx.translate(p.x, p.y);
      ctx.rotate(p.rot);
      ctx.fillStyle = p.color;
      ctx.fillRect(-p.w / 2, -p.h / 2, p.w, p.h);
      ctx.restore();
    }
    if (Date.now() - started < 3000) requestAnimationFrame(frame);
    else { cvs.style.display = "none"; ctx.clearRect(0, 0, cvs.width, cvs.height); }
  })();
}

function habitCard(h) {
  const week = h.week
    .map((d, idx) => {
      const letters = ["S", "M", "T", "W", "T", "F", "S"];
      const dow = new Date(d.date + "T00:00:00").getDay();
      return `<div class="day ${d.done ? "done" : ""}" title="${esc(d.date)}">${letters[dow]}</div>`;
    })
    .join("");
  const counter =
    h.style === "count"
      ? `<div class="counter">
          <button data-act="dec" data-id="${h.id}" aria-label="One less ${esc(h.name)}">−</button>
          <div class="val">${h.week[6].value}<span class="goal"> / ${h.target} ${esc(h.unit)}</span></div>
          <button data-act="inc" data-id="${h.id}" aria-label="One more ${esc(h.name)}">＋</button>
        </div>`
      : "";
  return `
    <div class="habit-card" data-habit="${h.id}">
      ${(h.style === "binary")
        ? `<button class="check ${h.doneToday ? "done" : ""}" data-act="toggle" data-id="${h.id}" aria-pressed="${h.doneToday ? "true" : "false"}" aria-label="Mark ${esc(h.name)} as ${h.doneToday ? "not done" : "done"}" title="${h.doneToday ? "Undo" : "Mark done"}">✓</button>`
        : ""}
      <div class="habit-main">
        <div class="name">${esc(h.icon ?? "✅")} ${esc(h.name)}</div>
        <div class="meta">${h.area && AREA_LABEL[h.area] ? esc(AREA_LABEL[h.area]) + " · " : ""}${h.streak > 0 ? `🏹 ${h.streak}-day streak` : "no active streak"}</div>
      </div>
      <div class="week">${week}</div>
      ${counter}
      <div class="habit-actions">
        <button class="icon-btn" data-act="del" data-id="${h.id}" title="Delete habit" aria-label="Delete habit ${esc(h.name)}">🗑</button>
      </div>
    </div>`;
}

function bindHabitCard(h, prefs, today) {
  const card = document.querySelector(`[data-habit="${h.id}"]`);
  if (!card) return;
  const actions = card.querySelectorAll("[data-act]");
  actions.forEach((el) => {
    el.addEventListener("click", async (ev) => {
      ev.stopPropagation();
      const act = el.dataset.act;
      try {
        if (act === "toggle") {
          const nowDone = !el.classList.contains("done");
          el.classList.toggle("done", nowDone);
          el.setAttribute("aria-pressed", String(nowDone));
          el.setAttribute("aria-label", `Mark ${h.name} as ${nowDone ? "not done" : "done"}`);
          nudgeProgress(nowDone ? 1 : -1);
          try {
            await api("/api/checkin", { method: "POST", body: { habitId: h.id, date: today, value: nowDone ? 1 : 0 } });
          } catch (err) {
            el.classList.toggle("done", !nowDone);
            el.setAttribute("aria-pressed", String(!nowDone));
            nudgeProgress(nowDone ? -1 : 1);
            throw err;
          }
          reload();
        } else if (act === "inc") {
          await api("/api/checkin", { method: "POST", body: { habitId: h.id, date: today, value: h.week[6].value + 1 } });
        } else if (act === "dec") {
          await api("/api/checkin", { method: "POST", body: { habitId: h.id, date: today, value: Math.max(0, h.week[6].value - 1) } });
        } else if (act === "del") {
          openConfirm(`Delete “${h.name}”? This removes its history too.`, async () => {
            await api(`/api/habits/${h.id}`, { method: "DELETE" });
            reload();
          });
          return;
        }
        reload();
      } catch (e) { toast(e.message); }
    });
  });
}
function nudgeProgress(delta) {
  const total = document.querySelectorAll(".habit-card").length;
  if (!total) return;
  doneTodayCount = Math.min(total, Math.max(0, doneTodayCount + delta));
  const pct = Math.round((doneTodayCount / total) * 100);
  const stat = document.getElementById("stat-done");
  if (stat) stat.textContent = `${doneTodayCount}/${total}`;
  const count = document.getElementById("overall-count");
  if (count) count.textContent = `${doneTodayCount} of ${total} habits`;
  const bar = document.getElementById("overall-bar");
  if (bar) {
    bar.style.width = `${pct}%`;
    bar.parentElement?.setAttribute("aria-valuenow", String(pct));
  }
}

function reload() {
  api(`/api/state?date=${localDate()}`).then(renderDashboard).catch((e) => toast(e.message));
}
function openModal(html) {
  $modal.innerHTML = `<div class="modal-back"><div class="modal" role="dialog" aria-modal="true">${html}</div></div>`;
  $modal.querySelector(".modal-back").addEventListener("click", (e) => {
    if (e.target === e.currentTarget) closeModal();
  });
  const modal = $modal.querySelector(".modal");
  modal.querySelector("input, textarea, select, button")?.focus();
  return modal;
}

document.addEventListener("keydown", (e) => {
  if (e.key === "Escape" && $modal.innerHTML.trim()) closeModal();
});
function closeModal() { $modal.innerHTML = ""; }
function openConfirm(msg, onYes) {
  const m = openModal(`<h3>Delete habit</h3><p class="sub">${esc(msg)}</p>
    <div style="display:flex;gap:10px;justify-content:flex-end">
      <button class="btn ghost" id="c-no">Cancel</button>
      <button class="btn danger" id="c-yes">Delete</button>
    </div>`);
  m.querySelector("#c-no").onclick = closeModal;
  m.querySelector("#c-yes").onclick = () => { closeModal(); onYes(); };
}

function addHabitModal() {
  const m = openModal(`
    <h3>Add a habit</h3>
    <input type="text" id="h-name" placeholder="Habit name, e.g. Stretch for 5 minutes" />
    <p class="sub" style="margin:12px 0 6px">Area (optional tag)</p>
    <select id="h-area" style="width:100%;background:var(--panel-2);border:1px solid var(--border);color:var(--text);border-radius:12px;padding:12px 14px;font-size:15px">
      ${AREAS.map((a) => `<option value="${a.id}">${a.emoji} ${esc(a.label)}</option>`).join("")}
    </select>
    <p class="sub" style="margin:12px 0 6px">Type</p>
    <div class="choices" style="margin-bottom:10px">
      <div class="choice selected" data-hstyle="binary"><span class="emoji">✅</span><div>Yes / no</div></div>
      <div class="choice" data-hstyle="count"><span class="emoji">🔢</span><div>Count toward target</div></div>
    </div>
    <div id="h-count-fields" style="display:none">
      <p class="sub" style="margin:6px 0 6px">Daily target & unit</p>
      <div style="display:flex;gap:10px">
        <input type="text" id="h-target" style="width:90px;text-align:center" value="5" />
        <input type="text" id="h-unit" placeholder="unit (glasses, pages…)" />
      </div>
    </div>
    <div class="err" id="h-add-err" style="min-height:0;margin-top:10px"></div>
    <div style="display:flex;gap:10px;justify-content:flex-end;margin-top:10px">
      <button class="btn ghost" id="h-cancel">Cancel</button>
      <button class="btn primary" id="h-save">Add habit</button>
    </div>`);
  let style = "binary";
  m.querySelectorAll("[data-hstyle]").forEach((c) =>
    c.addEventListener("click", () => {
      style = c.dataset.hstyle;
      m.querySelectorAll("[data-hstyle]").forEach((x) => x.classList.toggle("selected", x === c));
      m.querySelector("#h-count-fields").style.display = style === "count" ? "block" : "none";
    })
  );
  m.querySelector("#h-cancel").onclick = closeModal;
  m.querySelector("#h-save").onclick = async () => {
    const name = m.querySelector("#h-name").value.trim();
    if (!name) { m.querySelector("#h-add-err").textContent = "Give the habit a name."; return; }
    try {
      await api("/api/habits", {
        method: "POST",
        body: {
          name,
          area: m.querySelector("#h-area").value,
          icon: AREA_EMOJI[m.querySelector("#h-area").value] ?? "✅",
          style,
          unit: m.querySelector("#h-unit").value.trim() || "times",
          target: Number(m.querySelector("#h-target").value) || 5,
        },
      });
      closeModal();
      reload();
    } catch (e) { m.querySelector("#h-add-err").textContent = e.message; }
  };
}
