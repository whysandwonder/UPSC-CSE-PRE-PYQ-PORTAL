(function () {
  "use strict";

  var SUBJECTS = window.PYQ_SUBJECTS;
  var PAPERS = window.PYQ_PAPERS;
  var NOTES = window.PYQ_NOTES || {};
  var BOOKS = window.PYQ_BOOKS || {};
  var LETTERS = ["A", "B", "C", "D"];
  var STORE_KEY = "pyq-attempts-v1";
  var app = document.getElementById("app");

  var QUESTIONS = window.PYQ_QUESTIONS.slice().sort(function (a, b) {
    return b.year - a.year || a.no - b.no;
  });
  var byId = {};
  QUESTIONS.forEach(function (q) { byId[q.id] = q; });

  // ---------- attempts (browser storage; page still works if it is blocked) ----------
  var attempts = {};
  try { attempts = JSON.parse(localStorage.getItem(STORE_KEY)) || {}; } catch (e) { attempts = {}; }
  function save() {
    try { localStorage.setItem(STORE_KEY, JSON.stringify(attempts)); } catch (e) { /* ignore */ }
  }
  function load(key, fallback) {
    try { var v = JSON.parse(localStorage.getItem(key)); return v == null ? fallback : v; } catch (e) { return fallback; }
  }
  function store(key, value) {
    try { localStorage.setItem(key, JSON.stringify(value)); } catch (e) { /* ignore */ }
  }

  // Bookmarks: question ids in the order they were marked
  var BOOKMARK_KEY = "pyq-bookmarks-v1";
  var bookmarks = load(BOOKMARK_KEY, []);
  if (!Array.isArray(bookmarks)) bookmarks = [];
  bookmarks = bookmarks.filter(function (id) { return byId[id]; });
  function isMarked(id) { return bookmarks.indexOf(id) >= 0; }
  function toggleMark(id) {
    var i = bookmarks.indexOf(id);
    if (i >= 0) bookmarks.splice(i, 1); else bookmarks.push(id);
    store(BOOKMARK_KEY, bookmarks);
  }
  function markBtn(q) {
    var on = isMarked(q.id);
    return '<button class="mark-btn' + (on ? " on" : "") + '" type="button" data-mark="' + esc(q.id) + '" aria-pressed="' + on + '" title="Bookmark for revision (key B)">' +
      (on ? "★ Bookmarked" : "☆ Bookmark") + '</button>';
  }

  // Practice activity for the heatmap: questions answered per local day
  var LAST_KEY = "pyq-last";          // last question opened, for "Continue where you left off"
  var BACKUP_KEY = "pyq-last-backup"; // time of the last backup download
  var ACTIVITY_KEY = "pyq-activity-v1";
  var activity = load(ACTIVITY_KEY, {});
  if (typeof activity !== "object" || Array.isArray(activity)) activity = {};
  function pad2(n) { return (n < 10 ? "0" : "") + n; }
  function dayKey(d) { return d.getFullYear() + "-" + pad2(d.getMonth() + 1) + "-" + pad2(d.getDate()); }
  function logActivity(n) {
    if (!n) return;
    var k = dayKey(new Date());
    activity[k] = (activity[k] || 0) + n;
    store(ACTIVITY_KEY, activity);
  }

  // ---------- helpers ----------
  function el(html) {
    var t = document.createElement("template");
    t.innerHTML = html.trim();
    return t.content;
  }
  function esc(s) {
    return String(s).replace(/[&<>"]/g, function (c) {
      return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c];
    });
  }
  function subjectName(id) {
    for (var i = 0; i < SUBJECTS.length; i++) if (SUBJECTS[i].id === id) return SUBJECTS[i].name;
    return id;
  }
  function tally(list) {
    var c = 0, w = 0, d = 0;
    list.forEach(function (q) {
      var a = attempts[q.id];
      if (a == null) return;
      if (q.dropped) d++;
      else if (a === q.ans) c++; else w++;
    });
    return { correct: c, wrong: w, dropped: d, left: list.length - c - w - d, marks: 2 * c - (2 / 3) * w };
  }
  function fmtMarks(m) { return (Math.round(m * 100) / 100).toFixed(2); }
  function qs(n) { return n + (n === 1 ? " Q" : " Qs"); }
  // Highlights the current section in both the top bar and the phone's bottom bar
  function setTab(name) {
    document.querySelectorAll("[data-tab]").forEach(function (a) {
      var on = a.getAttribute("data-tab") === name;
      a.classList.toggle("active", on);
      if (on) a.setAttribute("aria-current", "page"); else a.removeAttribute("aria-current");
    });
  }
  function icon(name) {
    return '<svg class="ico" viewBox="0 0 24 24" aria-hidden="true">' + ICONS[name] + '</svg>';
  }
  var ICONS = {
    subject: '<rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/><rect x="14" y="14" width="7" height="7" rx="1"/><rect x="3" y="14" width="7" height="7" rx="1"/>',
    paper: '<path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><path d="M14 2v6h6M16 13H8M16 17H8M10 9H8"/>',
    test: '<path d="M16 3h5v5M4 20L21 3M21 16v5h-5M15 15l6 6M4 4l5 5"/>',
    bookmark: '<path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z"/>',
    play: '<circle cx="12" cy="12" r="10"/><path d="M10 8l6 4-6 4z"/>',
    data: '<ellipse cx="12" cy="5" rx="9" ry="3"/><path d="M21 12c0 1.66-4 3-9 3s-9-1.34-9-3"/><path d="M3 5v14c0 1.66 4 3 9 3s9-1.34 9-3V5"/>',
    download: '<path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4M7 10l5 5 5-5M12 15V3"/>',
    upload: '<path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4M17 8l-5-5-5 5M12 3v12"/>',
    trash: '<path d="M3 6h18M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6M10 11v6M14 11v6M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2"/>'
  };

  // Short message at the bottom of the screen (bookmarks, backups)
  var toastTimer = null;
  function toast(msg) {
    var t = document.getElementById("toast");
    if (!t) {
      t = document.createElement("div");
      t.id = "toast";
      t.className = "toast";
      t.setAttribute("role", "status");
      t.setAttribute("aria-live", "polite");
      document.body.appendChild(t);
    }
    t.textContent = msg;
    t.classList.add("show");
    clearTimeout(toastTimer);
    toastTimer = setTimeout(function () { t.classList.remove("show"); }, 2200);
  }
  function go(hash, replace) {
    if (replace) location.replace(hash); else location.hash = hash;
  }

  // ---------- views ----------
  function viewHome() {
    setTab("practice");
    var t = tally(QUESTIONS);
    var done = t.correct + t.wrong + t.dropped;
    var acc = done ? Math.round((t.correct / done) * 100) + "%" : "–";
    var last = load(LAST_KEY, null);
    var cont = last && typeof last.hash === "string" && /^#\/(subject|paper|unit)\/[\w@-]+\/\d+$/.test(last.hash) ?
      '<a class="continue" href="' + esc(last.hash) + '" id="continue">' + icon("play") +
      '<span><small>Continue where you left off</small><b>' + esc(last.label || "Last question") + '</b></span><span class="arrow">→</span></a>' : "";
    var lastBackup = load(BACKUP_KEY, 0);
    var remind = (done || bookmarks.length) && (!lastBackup || Date.now() - lastBackup > 7 * 864e5) ?
      '<div class="banner" id="backup-banner">' + icon("data") + '<span>Your progress is saved only in this browser. ' +
      (lastBackup ? "Your last backup is over a week old." : "You have no backup yet.") + '</span>' +
      '<a class="btn" href="#/data">Back up now</a></div>' : "";
    app.innerHTML =
      '<h1>Practice PYQs</h1>' +
      '<p class="sub">Every UPSC Prelims GS question from 2000 to 2026, checked against the answer key, with a full analysis after you answer.</p>' +
      remind + cont +
      '<div class="mode-grid">' +
      '<a class="mode" href="#/subjects" id="mode-subject">' + icon("subject") + '<strong>Subject-wise</strong><span>All questions of one subject, across years</span></a>' +
      '<a class="mode" href="#/papers" id="mode-paper">' + icon("paper") + '<strong>Paper-wise</strong><span>A full year\'s paper, in exam order</span></a>' +
      '<a class="mode" href="#/test" id="mode-test">' + icon("test") + '<strong>Random test</strong><span>Choose how many questions; a fresh mix from the whole syllabus every time</span></a>' +
      '<a class="mode" href="#/bookmarks" id="mode-bookmarks">' + icon("bookmark") + '<strong>Bookmarks</strong><span>' + qs(bookmarks.length) + ' saved for revision, with answers and analysis</span></a>' +
      '</div>' +
      '<div class="stats">' +
      '<div class="stat"><b>' + QUESTIONS.length + '</b><small>questions available</small></div>' +
      '<div class="stat"><b>' + done + '</b><small>attempted</small></div>' +
      '<div class="stat"><b>' + acc + '</b><small>accuracy</small></div>' +
      '</div>' + heatmap();
    var hs = document.getElementById("heat-scroll");
    hs.scrollLeft = hs.scrollWidth; // show the most recent weeks first on narrow screens
  }

  // Practice heatmap: one square per day for the last 53 weeks, darker = more questions answered
  function heatmap() {
    var today = new Date(); today.setHours(0, 0, 0, 0);
    var start = new Date(today); start.setDate(start.getDate() - 52 * 7 - today.getDay());
    var cells = "", months = "", total = 0, active = 0, best = 0, col = 0, lastMonth = -1, lastCol = -9, lastLen = 0;
    var MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
    for (var d = new Date(start); d <= today; d.setDate(d.getDate() + 1)) {
      if (d.getDay() === 0) {
        col++;
        if (d.getMonth() !== lastMonth) {
          // a label that would crowd the previous one replaces it (the partial first month)
          if (col - lastCol < 3) months = months.slice(0, lastLen);
          lastLen = months.length;
          months += '<span style="grid-column:' + col + '">' + MONTHS[d.getMonth()] + '</span>';
          lastMonth = d.getMonth(); lastCol = col;
        }
      }
      var n = activity[dayKey(d)] || 0;
      total += n; if (n) active++; if (n > best) best = n;
      var lvl = n === 0 ? 0 : n < 5 ? 1 : n < 15 ? 2 : n < 30 ? 3 : 4;
      cells += '<i class="h' + lvl + '" title="' + qs(n) + ' · ' +
        d.toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" }) + '"></i>';
    }
    // streak: consecutive days with practice, ending today (or yesterday if today is still empty)
    var streak = 0, s = new Date(today);
    if (!activity[dayKey(s)]) s.setDate(s.getDate() - 1);
    while (activity[dayKey(s)]) { streak++; s.setDate(s.getDate() - 1); }
    return '<section class="heat-box" id="heatmap"><div class="heat-head"><h2>Practice heatmap</h2>' +
      '<span class="meta">' + qs(total) + ' in the last year · ' + active + (active === 1 ? " active day" : " active days") + ' · streak ' + streak +
      (streak === 1 ? " day" : " days") + ' · best day ' + best + '</span></div>' +
      '<div class="heat-scroll" id="heat-scroll"><div class="heat-months" style="grid-template-columns:repeat(' + col + ',12px)">' + months + '</div>' +
      '<div class="heat-grid">' + cells + '</div></div>' +
      '<div class="heat-legend">Less <i class="h0"></i><i class="h1"></i><i class="h2"></i><i class="h3"></i><i class="h4"></i> More</div></section>';
  }

  function viewSubjects() {
    setTab("practice");
    var rows = SUBJECTS.map(function (s) {
      var list = QUESTIONS.filter(function (q) { return q.subject === s.id; });
      if (!list.length) {
        return '<div class="row disabled"><span>' + esc(s.name) + '</span><span class="meta">no questions yet</span></div>';
      }
      var t = tally(list);
      var pct = Math.round(((t.correct + t.wrong + t.dropped) / list.length) * 100);
      return '<a class="row" href="#/subject/' + s.id + '"><span>' + esc(s.name) +
        '<div class="bar"><i style="width:' + pct + '%"></i></div></span>' +
        '<span class="meta">' + qs(list.length) + ' · ' + (t.correct + t.wrong + t.dropped) + ' done · ' + t.correct + ' correct</span></a>';
    }).join("");
    app.innerHTML = '<a class="btn back" href="#/">← Back</a><h1>Subject-wise</h1>' +
      '<p class="sub">Questions from every added paper, newest first.</p><div class="list">' + rows + '</div>';
  }

  function viewPapers() {
    setTab("practice");
    var rows = PAPERS.map(function (p) {
      var list = QUESTIONS.filter(function (q) { return q.year === p.year; });
      if (!list.length) {
        return '<div class="row disabled"><span>' + p.year + ' · GS Paper I</span><span class="meta">not added yet</span></div>';
      }
      var t = tally(list);
      var pct = Math.round(((t.correct + t.wrong + t.dropped) / list.length) * 100);
      return '<a class="row" href="#/paper/' + p.year + '"><span>' + p.year + ' · GS Paper I' +
        '<div class="bar"><i style="width:' + pct + '%"></i></div></span>' +
        '<span class="meta">' + qs(list.length) + ' · ' + (t.correct + t.wrong + t.dropped) + ' done · ' + fmtMarks(t.marks) + ' marks</span></a>';
    }).join("");
    app.innerHTML = '<a class="btn back" href="#/">← Back</a><h1>Paper-wise</h1>' +
      '<p class="sub">Attempt a full paper in the original question order. Papers from 2000–2010 include General Studies questions only (aptitude, and map or figure items that cannot be reproduced, are left out), so their question numbers skip.</p><div class="list">' + rows + '</div>';
  }

  function viewQuiz(kind, key, idx) {
    setTab("practice");
    var list, title, base, backHref;
    if (kind === "subject") {
      list = QUESTIONS.filter(function (q) { return q.subject === key; });
      title = subjectName(key);
      backHref = "#/subjects";
    } else if (kind === "unit") {
      // key is a unit id, or "unitId@year" for questions from that year on (recent-trends table)
      var uid = key.split("@")[0], from = Number(key.split("@")[1]) || 0, u = UNITS[uid];
      list = u ? QUESTIONS.filter(function (q) { return UNIT_OF[q.id] === uid && q.year >= from; }) : [];
      title = u ? subjectName(u.subject) + " · " + u.title + (from ? " (" + from + "–" + MAX_YEAR + ")" : "") : "Subtopic";
      backHref = "#/analysis/" + (from ? "recent" : "all");
    } else {
      list = QUESTIONS.filter(function (q) { return q.year === Number(key); });
      title = key + " · GS Paper I";
      backHref = "#/papers";
    }
    base = "#/" + kind + "/" + key + "/";
    if (!list.length) {
      app.innerHTML = '<a class="btn back" href="' + backHref + '">← Back</a><p class="empty">No questions here yet.</p>';
      return;
    }
    if (isNaN(idx) || idx < 0 || idx >= list.length) { go(base + 0, true); return; }

    var q = list[idx];
    var picked = attempts[q.id];
    store(LAST_KEY, { hash: base + idx, label: title + " · Q" + (kind === "paper" ? q.no : idx + 1) });
    var answered = picked != null;
    var t = tally(list);

    var palette = list.map(function (x, i) {
      var a = attempts[x.id];
      var cls = a == null ? "" : (x.dropped ? "drop" : (a === x.ans ? "ok" : "bad"));
      if (i === idx) cls += " cur";
      var label = kind === "paper" ? x.no : i + 1;
      return '<button class="' + cls + '" data-go="' + i + '" title="' + x.year + ' Q' + x.no + '">' + label + '</button>';
    }).join("");

    var opts = q.opts.map(function (o, i) {
      var cls = "";
      if (answered) {
        if (q.dropped) cls = i === picked ? "picked" : "";
        else if (i === q.ans) cls = "correct";
        else if (i === picked) cls = "wrong";
      }
      return '<button class="opt ' + cls + '" data-opt="' + i + '"' + (answered ? " disabled" : "") +
        '><span class="letter">' + LETTERS[i].toLowerCase() + ')</span><span>' + o + '</span></button>';
    }).join("");

    var feedback = "";
    if (answered && q.dropped) {
      feedback =
        '<div class="verdict drop" id="verdict">Dropped by UPSC: this question was not scored.' +
        '<small>You marked (' + LETTERS[picked].toLowerCase() + '). No marks either way · ' +
        '<a href="#" id="clear-one">Clear my answer</a></small></div>' +
        '<div class="analysis" id="analysis">' + q.analysis + '</div>';
    } else if (answered) {
      var ok = picked === q.ans;
      // 2026 answers come from UPSC's provisional key, cross-checked; q.provKey records where they differ
      // 2010 and older: no UPSC-published key; answers follow a circulated key, checked, and q.provKey marks overrides
      var oldKey = q.year <= 2010;
      var label = q.provKey ? "Verified answer" : (q.year === 2026 ? "Answer (provisional key, verified)" : (oldKey ? "Answer (circulated key, checked)" : "Official answer"));
      feedback =
        '<div class="verdict ' + (ok ? "ok" : "bad") + '" id="verdict">' +
        (ok ? "Correct! " : "Wrong. ") + label + ": (" + LETTERS[q.ans].toLowerCase() + ")" +
        '<small>You marked (' + LETTERS[picked].toLowerCase() + '). ' + (ok ? "+2 marks" : "−0.67 marks") +
        (q.provKey ? ' · ' + (oldKey ? 'The circulated key says (' : 'UPSC provisional key says (') + q.provKey.toLowerCase() + '), which we believe is wrong (see analysis)' : "") + ' · ' +
        '<a href="#" id="clear-one">Clear my answer</a></small></div>' +
        '<div class="analysis" id="analysis">' + q.analysis + '</div>';
    }

    var tags = '<span class="tag">' + q.year + ' · Q' + q.no + '</span>' +
      '<span class="tag">' + esc(subjectName(q.subject)) + '</span>' +
      (q.topic ? '<span class="tag">' + esc(q.topic) + '</span>' : "") +
      (q.subject === "ca" ? '<span class="tag ca">Current affairs ' + esc(q.caYear || q.year) + '</span>' : "");

    app.innerHTML =
      '<div class="quiz-head"><div><a class="btn back" href="' + backHref + '">← Back</a> <strong>' + esc(title) + '</strong></div>' +
      '<div class="score" id="score">Correct <b>' + t.correct + '</b> · Wrong <b>' + t.wrong + '</b> · Left <b>' + t.left +
      '</b> · Marks <b>' + fmtMarks(t.marks) + '</b> / ' + list.length * 2 + '</div></div>' +
      '<details class="palette-box" id="palette-box"' + (paletteOpen() ? " open" : "") + '><summary>Question map · ' +
      (t.correct + t.wrong + t.dropped) + ' of ' + list.length + ' answered</summary>' +
      '<div class="palette" id="palette">' + palette + '</div></details>' +
      '<div class="card"><div class="qmeta">' + tags + markBtn(q) + '</div>' +
      '<div class="qtext" id="qtext"><b>' + (kind === "paper" ? q.no : idx + 1) + '.</b> ' + q.q + '</div>' +
      '<div class="opts" id="opts">' + opts + '</div>' + feedback + '</div>' +
      '<div class="nav-row">' +
      '<button class="btn" id="prev"' + (idx === 0 ? " disabled" : "") + '>← Previous</button>' +
      '<button class="btn danger" id="reset">Reset this set</button>' +
      '<button class="btn primary" id="next"' + (idx === list.length - 1 ? " disabled" : "") + '>Next →</button>' +
      '</div>' +
      '<p class="hint">Keys: A–D to answer, B to bookmark, ← / → to move between questions.</p>';

    bindMarks();
    document.getElementById("palette-box").addEventListener("toggle", function () {
      try { localStorage.setItem(PALETTE_KEY, this.open ? "1" : "0"); } catch (e) { /* ignore */ }
    });
    app.querySelectorAll("[data-opt]").forEach(function (b) {
      b.addEventListener("click", function () { answer(q, Number(b.dataset.opt)); });
    });
    app.querySelectorAll("[data-go]").forEach(function (b) {
      b.addEventListener("click", function () { go(base + b.dataset.go); });
    });
    document.getElementById("prev").addEventListener("click", function () { if (idx > 0) go(base + (idx - 1)); });
    document.getElementById("next").addEventListener("click", function () { if (idx < list.length - 1) go(base + (idx + 1)); });
    document.getElementById("reset").addEventListener("click", function () {
      if (!confirm("Clear all your answers in \"" + title + "\"?")) return;
      list.forEach(function (x) { delete attempts[x.id]; });
      save();
      go(base + 0);
      route();
    });
    var clear = document.getElementById("clear-one");
    if (clear) clear.addEventListener("click", function (e) {
      e.preventDefault();
      delete attempts[q.id];
      save();
      route();
    });

    quizKeys = function (e) {
      if (e.ctrlKey || e.metaKey || e.altKey) return;
      var k = e.key.toLowerCase();
      var i = "abcd".indexOf(k);
      if (i >= 0 && k.length === 1 && attempts[q.id] == null) { answer(q, i); return; }
      if (k === "b") { toggleMark(q.id); toast(isMarked(q.id) ? "Bookmarked for revision" : "Bookmark removed"); route(); return; }
      if (e.key === "ArrowLeft" && idx > 0) go(base + (idx - 1));
      if (e.key === "ArrowRight" && idx < list.length - 1) go(base + (idx + 1));
    };
  }

  function wrapTables(root) {
    root.querySelectorAll(".qtext table, .analysis table, .notes-body table").forEach(function (t) {
      if (t.parentNode.classList && t.parentNode.classList.contains("table-wrap")) return;
      var w = document.createElement("div");
      w.className = "table-wrap";
      t.parentNode.insertBefore(w, t);
      w.appendChild(t);
    });
  }

  // Question map: open by default on wide screens, folded on phones; the reader's choice is remembered
  var PALETTE_KEY = "pyq-palette-open";
  function paletteOpen() {
    var v = null;
    try { v = localStorage.getItem(PALETTE_KEY); } catch (e) { /* ignore */ }
    if (v === "1") return true;
    if (v === "0") return false;
    return !(window.matchMedia && window.matchMedia("(max-width: 700px)").matches);
  }

  function answer(q, i) {
    if (attempts[q.id] != null) return;
    attempts[q.id] = i;
    save();
    logActivity(1);
    route();
    var v = document.getElementById("verdict");
    if (v) v.scrollIntoView({ behavior: "smooth", block: "nearest" });
  }

  // Bookmark buttons update in place, except on the Bookmarks page, where the list itself changes
  function bindMarks() {
    app.querySelectorAll("[data-mark]").forEach(function (b) {
      b.addEventListener("click", function (e) {
        e.preventDefault();
        toggleMark(b.dataset.mark);
        if (/^#\/bookmarks/.test(location.hash)) { toast("Bookmark removed"); route(); return; }
        var on = isMarked(b.dataset.mark);
        toast(on ? "Bookmarked for revision" : "Bookmark removed");
        b.classList.toggle("on", on);
        b.setAttribute("aria-pressed", String(on));
        b.textContent = on ? "★ Bookmarked" : "☆ Bookmark";
      });
    });
  }

  // A question with its answer shown: the correct option, then the analysis.
  // picked is the test answer (null if skipped); undefined on the Bookmarks page, which never shows one.
  function revealHtml(q, picked) {
    var inTest = picked !== undefined;
    var opts = q.opts.map(function (o, i) {
      var cls = "";
      if (!q.dropped && i === q.ans) cls = "correct";
      else if (inTest && i === picked) cls = q.dropped ? "picked" : "wrong";
      return '<div class="opt static ' + cls + '"><span class="letter">' + LETTERS[i].toLowerCase() + ')</span><span>' + o + '</span></div>';
    }).join("");
    var ansText = q.dropped ? "" : "(" + LETTERS[q.ans].toLowerCase() + ")";
    var verdict;
    if (q.dropped) verdict = '<div class="verdict drop">Dropped by UPSC: this question was not scored.</div>';
    else if (!inTest) verdict = '<div class="verdict ok">Answer: ' + ansText + '</div>';
    else if (picked == null) verdict = '<div class="verdict drop">Not attempted. Answer: ' + ansText + '</div>';
    else if (picked === q.ans) verdict = '<div class="verdict ok">Correct. Answer: ' + ansText + '</div>';
    else verdict = '<div class="verdict bad">Wrong. Answer: ' + ansText + '<small>You marked (' + LETTERS[picked].toLowerCase() + ').</small></div>';
    return '<div class="opts">' + opts + '</div>' + verdict + '<div class="analysis">' + q.analysis + '</div>';
  }
  function qTags(q) {
    return '<span class="tag">' + q.year + ' · Q' + q.no + '</span><span class="tag">' + esc(subjectName(q.subject)) + '</span>' +
      (q.topic ? '<span class="tag">' + esc(q.topic) + '</span>' : "");
  }

  // ---------- bookmarks: revise saved questions with the answer and analysis ----------
  function viewBookmarks(idx) {
    setTab("bookmarks");
    var list = bookmarks.map(function (id) { return byId[id]; });
    if (!list.length) {
      app.innerHTML = '<a class="btn back" href="#/">← Back</a><h1>Bookmarks</h1>' +
        '<p class="empty">No bookmarks yet. Tap ☆ Bookmark on any question (or press B) to save it here for revision.</p>';
      return;
    }
    if (isNaN(idx) || idx < 0) { go("#/bookmarks/0", true); return; }
    if (idx >= list.length) { go("#/bookmarks/" + (list.length - 1), true); return; }
    var q = list[idx], base = "#/bookmarks/";
    var palette = list.map(function (x, i) {
      return '<button class="' + (i === idx ? "cur" : "") + '" data-go="' + i + '" title="' + x.year + ' Q' + x.no + '">' + (i + 1) + '</button>';
    }).join("");
    app.innerHTML =
      '<div class="quiz-head"><div><a class="btn back" href="#/">← Back</a> <strong>Bookmarks</strong></div>' +
      '<div class="score">' + (idx + 1) + ' of ' + list.length + '</div></div>' +
      '<p class="sub">Your saved questions with the correct answer and the full analysis, for revision.</p>' +
      '<details class="palette-box" id="palette-box"' + (paletteOpen() ? " open" : "") + '><summary>All bookmarks · ' + list.length + '</summary>' +
      '<div class="palette" id="palette">' + palette + '</div></details>' +
      '<div class="card"><div class="qmeta">' + qTags(q) + markBtn(q) + '</div>' +
      '<div class="qtext"><b>' + (idx + 1) + '.</b> ' + q.q + '</div>' + revealHtml(q) + '</div>' +
      '<div class="nav-row">' +
      '<button class="btn" id="prev"' + (idx === 0 ? " disabled" : "") + '>← Previous</button>' +
      '<button class="btn primary" id="next"' + (idx === list.length - 1 ? " disabled" : "") + '>Next →</button></div>' +
      '<p class="hint">Keys: B to remove this bookmark, ← / → to move between bookmarks.</p>';
    bindMarks();
    bindPalette(base);
    document.getElementById("prev").addEventListener("click", function () { if (idx > 0) go(base + (idx - 1)); });
    document.getElementById("next").addEventListener("click", function () { if (idx < list.length - 1) go(base + (idx + 1)); });
    quizKeys = function (e) {
      if (e.ctrlKey || e.metaKey || e.altKey) return;
      if (e.key.toLowerCase() === "b") { toggleMark(q.id); toast("Bookmark removed"); route(); return; }
      if (e.key === "ArrowLeft" && idx > 0) go(base + (idx - 1));
      if (e.key === "ArrowRight" && idx < list.length - 1) go(base + (idx + 1));
    };
  }
  function bindPalette(base) {
    document.getElementById("palette-box").addEventListener("toggle", function () {
      try { localStorage.setItem(PALETTE_KEY, this.open ? "1" : "0"); } catch (e) { /* ignore */ }
    });
    app.querySelectorAll("[data-go]").forEach(function (b) {
      b.addEventListener("click", function () { go(base + b.dataset.go); });
    });
  }

  // ---------- random test (kept in memory only; nothing is saved but the "already served" list) ----------
  var TEST_SEEN_KEY = "pyq-test-seen-v1";
  var test = null; // { list: [questions], picks: [option or undefined], done: bool }
  function randInt(n) {
    if (window.crypto && window.crypto.getRandomValues) {
      var a = new Uint32Array(1);
      window.crypto.getRandomValues(a);
      return a[0] % n;
    }
    return Math.floor(Math.random() * n);
  }
  function shuffle(a) {
    for (var i = a.length - 1; i > 0; i--) {
      var j = randInt(i + 1), t = a[i];
      a[i] = a[j]; a[j] = t;
    }
    return a;
  }
  // Every subject except current affairs; dropped questions have no answer to score
  function testPools() {
    return SUBJECTS.filter(function (s) { return s.id !== "ca"; }).map(function (s) {
      return { id: s.id, qs: QUESTIONS.filter(function (q) { return q.subject === s.id && !q.dropped; }) };
    }).filter(function (p) { return p.qs.length; });
  }
  function testPoolSize() {
    return testPools().reduce(function (n, p) { return n + p.qs.length; }, 0);
  }
  // Split n across subjects in proportion to their share of past questions (largest remainder),
  // then draw from questions not yet served in earlier tests; a subject starts a new cycle once all are used.
  function buildTest(n) {
    var pools = testPools(), total = testPoolSize();
    n = Math.max(1, Math.min(n, total));
    var alloc = pools.map(function (p) {
      var exact = n * p.qs.length / total;
      return { p: p, k: Math.floor(exact), r: exact - Math.floor(exact) + randInt(1000) / 1e7 };
    });
    var left = n - alloc.reduce(function (s, x) { return s + x.k; }, 0);
    alloc.slice().sort(function (a, b) { return b.r - a.r; }).slice(0, left).forEach(function (x) { x.k++; });
    var seen = load(TEST_SEEN_KEY, {});
    if (typeof seen !== "object" || Array.isArray(seen)) seen = {};
    var picked = [];
    alloc.forEach(function (x) {
      if (!x.k) return;
      var was = {};
      (seen[x.p.id] || []).forEach(function (id) { was[id] = 1; });
      var take = shuffle(x.p.qs.filter(function (q) { return !was[q.id]; })).slice(0, x.k);
      if (take.length < x.k) {
        var have = {};
        take.forEach(function (q) { have[q.id] = 1; });
        var refill = shuffle(x.p.qs.filter(function (q) { return !have[q.id]; })).slice(0, x.k - take.length);
        seen[x.p.id] = refill.map(function (q) { return q.id; });
        take = take.concat(refill);
      } else {
        seen[x.p.id] = (seen[x.p.id] || []).concat(take.map(function (q) { return q.id; }));
      }
      picked = picked.concat(take);
    });
    store(TEST_SEEN_KEY, seen);
    return { list: shuffle(picked), picks: [], done: false };
  }

  function viewTest(step, arg) {
    setTab("test");
    if (step === "q") return viewTestQuestion(parseInt(arg, 10));
    if (step === "result") return viewTestResult();
    var total = testPoolSize();
    var running = test && !test.done;
    function firstOpen() {
      for (var i = 0; i < test.list.length; i++) if (test.picks[i] == null) return i;
      return 0;
    }
    app.innerHTML = '<a class="btn back" href="#/">← Back</a><h1>Random test</h1>' +
      '<p class="sub">Questions are drawn at random from every subject, in proportion to how often UPSC has asked it (2000–2026). ' +
      'Current affairs and dropped questions are left out. Each test prefers questions you have not had in earlier tests, so the mix keeps changing. ' +
      'Nothing is saved: you get your score at the end.</p>' +
      (running ? '<div class="card resume"><span>A test is in progress: ' + test.picks.filter(function (p) { return p != null; }).length +
        ' of ' + test.list.length + ' answered.</span><a class="btn primary" href="#/test/q/' + Math.max(0, firstOpen()) + '" id="test-resume">Resume test</a></div>' : "") +
      '<div class="card test-setup"><label for="test-n"><b>How many questions?</b></label>' +
      '<div class="test-row"><input id="test-n" type="number" min="1" max="' + total + '" value="50" inputmode="numeric">' +
      '<button class="btn primary" id="test-start" type="button">Start test</button></div>' +
      '<div class="chips">' + [10, 25, 50, 100].map(function (n) {
        return '<button class="btn" type="button" data-n="' + n + '">' + n + '</button>';
      }).join("") + '</div>' +
      '<p class="hint">Choose 1 to ' + total + '. +2 for each correct answer and −0.67 for each wrong one, as in the exam.</p>' +
      '<p class="err" id="test-err" role="alert"></p></div>';
    var input = document.getElementById("test-n");
    app.querySelectorAll("[data-n]").forEach(function (b) {
      b.addEventListener("click", function () { input.value = b.dataset.n; input.focus(); });
    });
    function start() {
      var n = Number(input.value);
      if (!input.value || !isFinite(n) || n < 1 || n > total || Math.floor(n) !== n) {
        document.getElementById("test-err").textContent = "Enter a whole number from 1 to " + total + ".";
        return;
      }
      if (test && !test.done && !confirm("Start a new test? The one in progress will be discarded.")) return;
      test = buildTest(n);
      go("#/test/q/0");
    }
    document.getElementById("test-start").addEventListener("click", start);
    input.addEventListener("keydown", function (e) { if (e.key === "Enter") start(); });
  }

  function viewTestQuestion(idx) {
    if (!test) { go("#/test", true); return; }
    if (test.done) { go("#/test/result", true); return; }
    var list = test.list, base = "#/test/q/";
    if (isNaN(idx) || idx < 0 || idx >= list.length) { go(base + 0, true); return; }
    var q = list[idx], pick = test.picks[idx];
    var answered = test.picks.filter(function (p) { return p != null; }).length;
    var palette = list.map(function (x, i) {
      return '<button class="' + (test.picks[i] != null ? "ans" : "") + (i === idx ? " cur" : "") + '" data-go="' + i + '">' + (i + 1) + '</button>';
    }).join("");
    var opts = q.opts.map(function (o, i) {
      return '<button class="opt' + (pick === i ? " chosen" : "") + '" data-opt="' + i + '" aria-pressed="' + (pick === i) + '">' +
        '<span class="letter">' + LETTERS[i].toLowerCase() + ')</span><span>' + o + '</span></button>';
    }).join("");
    app.innerHTML =
      '<div class="quiz-head"><div><a class="btn back" href="#/test">← Back</a> <strong>Random test</strong></div>' +
      '<div class="score" id="score">Answered <b>' + answered + '</b> of ' + list.length + '</div></div>' +
      '<details class="palette-box" id="palette-box"' + (paletteOpen() ? " open" : "") + '><summary>Question map · ' +
      answered + ' of ' + list.length + ' answered</summary><div class="palette" id="palette">' + palette + '</div></details>' +
      '<div class="card"><div class="qmeta">' + qTags(q) + markBtn(q) + '</div>' +
      '<div class="qtext" id="qtext"><b>' + (idx + 1) + '.</b> ' + q.q + '</div>' +
      '<div class="opts" id="opts">' + opts + '</div></div>' +
      '<div class="nav-row">' +
      '<button class="btn" id="prev"' + (idx === 0 ? " disabled" : "") + '>← Previous</button>' +
      '<button class="btn danger" id="submit">Submit test</button>' +
      '<button class="btn primary" id="next"' + (idx === list.length - 1 ? " disabled" : "") + '>Next →</button></div>' +
      '<p class="hint">Keys: A–D to choose (the same key again clears it), B to bookmark, ← / → to move. Answers are shown after you submit.</p>';
    bindMarks();
    bindPalette(base);
    function choose(i) {
      test.picks[idx] = test.picks[idx] === i ? undefined : i;
      route();
    }
    app.querySelectorAll("[data-opt]").forEach(function (b) {
      b.addEventListener("click", function () { choose(Number(b.dataset.opt)); });
    });
    document.getElementById("prev").addEventListener("click", function () { if (idx > 0) go(base + (idx - 1)); });
    document.getElementById("next").addEventListener("click", function () { if (idx < list.length - 1) go(base + (idx + 1)); });
    document.getElementById("submit").addEventListener("click", function () {
      var left = list.length - answered;
      if (!confirm(left ? "Submit the test? " + qs(left) + " unanswered." : "Submit the test?")) return;
      test.done = true;
      logActivity(answered);
      go("#/test/result");
    });
    quizKeys = function (e) {
      if (e.ctrlKey || e.metaKey || e.altKey) return;
      var k = e.key.toLowerCase();
      var i = "abcd".indexOf(k);
      if (i >= 0 && k.length === 1) { choose(i); return; }
      if (k === "b") { toggleMark(q.id); toast(isMarked(q.id) ? "Bookmarked for revision" : "Bookmark removed"); route(); return; }
      if (e.key === "ArrowLeft" && idx > 0) go(base + (idx - 1));
      if (e.key === "ArrowRight" && idx < list.length - 1) go(base + (idx + 1));
    };
  }

  function viewTestResult() {
    if (!test) { go("#/test", true); return; }
    if (!test.done) { go("#/test/q/0", true); return; }
    var list = test.list, c = 0, w = 0, bySub = {};
    list.forEach(function (q, i) {
      var p = test.picks[i], s = bySub[q.subject] || (bySub[q.subject] = { n: 0, c: 0, w: 0 });
      s.n++;
      if (p == null) return;
      if (p === q.ans) { c++; s.c++; } else { w++; s.w++; }
    });
    var u = list.length - c - w, marks = 2 * c - (2 / 3) * w;
    var rows = SUBJECTS.filter(function (s) { return bySub[s.id]; }).map(function (s) {
      var b = bySub[s.id];
      return '<tr><td>' + esc(s.name) + '</td><td>' + b.n + '</td><td>' + b.c + '</td><td>' + b.w + '</td><td>' + (b.n - b.c - b.w) + '</td></tr>';
    }).join("");
    var review = list.map(function (q, i) {
      var p = test.picks[i];
      var st = p == null ? "skip" : (p === q.ans ? "ok" : "bad");
      return '<details class="review"><summary><span class="rv ' + st + '">' + (st === "ok" ? "✓" : st === "bad" ? "✗" : "–") + '</span> ' +
        (i + 1) + '. ' + esc(subjectName(q.subject)) + ' · ' + q.year + ' Q' + q.no + '</summary>' +
        '<div class="qmeta">' + qTags(q) + markBtn(q) + '</div><div class="qtext">' + q.q + '</div>' + revealHtml(q, p == null ? null : p) + '</details>';
    }).join("");
    app.innerHTML = '<a class="btn back" href="#/">← Back</a><h1>Test result</h1>' +
      '<div class="card result"><div class="result-marks" id="result-marks"><b>' + fmtMarks(marks) + '</b> / ' + list.length * 2 + ' marks</div>' +
      '<div class="stats">' +
      '<div class="stat"><b>' + c + '</b><small>correct</small></div>' +
      '<div class="stat"><b>' + w + '</b><small>wrong</small></div>' +
      '<div class="stat"><b>' + u + '</b><small>not attempted</small></div>' +
      '<div class="stat"><b>' + (c + w ? Math.round(c / (c + w) * 100) + "%" : "–") + '</b><small>accuracy</small></div></div>' +
      '<div class="table-wrap"><table class="sub-table"><tr><th>Subject</th><th>Qs</th><th>Correct</th><th>Wrong</th><th>Left</th></tr>' + rows + '</table></div>' +
      '<div class="nav-row"><a class="btn" href="#/">Practice home</a><a class="btn primary" href="#/test" id="new-test">New test</a></div></div>' +
      '<h2>Review</h2><p class="sub">Open any question to see the answer and analysis. This result is not saved.</p>' +
      '<div class="review-list">' + review + '</div>';
    bindMarks();
  }

  // ---------- PYQ analysis: broad subtopics (book units) ranked by how often UPSC asks them ----------
  var UNIT_OF = window.PYQ_UNIT_OF || {};
  var UNITS = {};            // unit id -> { subject, title, topics: [titles], firstTopic }
  SUBJECTS.forEach(function (s) {
    if (!BOOKS[s.id]) return;
    BOOKS[s.id].units.forEach(function (u) {
      UNITS[u.id] = { id: u.id, subject: s.id, title: u.title, topics: u.topics.map(function (t) { return t.title; }), firstTopic: u.topics[0] && u.topics[0].id };
    });
  });
  var MIN_YEAR = 2000, MAX_YEAR = 2026, RECENT_FROM = 2018, SPLIT_YEAR = 2013;
  var anFilter = { subject: "", query: "" };
  var anCache = null;
  // Per unit: questions per year; per year: questions in that paper (all subjects)
  function analysisData() {
    if (anCache) return anCache;
    var perYear = {}, perUnit = {};
    QUESTIONS.forEach(function (q) {
      perYear[q.year] = (perYear[q.year] || 0) + 1;
      var u = UNIT_OF[q.id];
      if (!u || !UNITS[u]) return;
      var x = perUnit[u] || (perUnit[u] = { total: 0, byYear: {} });
      x.total++;
      x.byYear[q.year] = (x.byYear[q.year] || 0) + 1;
    });
    var years = Object.keys(perYear).map(Number).sort();
    // average share of a paper over a span of years: fair across 150-question (2000–2010) and 100-question papers
    function share(byYear, a, b) {
      var sum = 0, n = 0;
      years.forEach(function (y) { if (y >= a && y <= b) { sum += (byYear[y] || 0) / perYear[y]; n++; } });
      return n ? sum / n * 100 : 0;
    }
    var rows = Object.keys(UNITS).map(function (id) {
      var x = perUnit[id] || { total: 0, byYear: {} };
      var early = share(x.byYear, MIN_YEAR, SPLIT_YEAR - 1), late = share(x.byYear, SPLIT_YEAR, MAX_YEAR);
      var trend = late >= early ? "up" : "down";
      var recentYears = years.filter(function (y) { return y >= RECENT_FROM && x.byYear[y]; });
      return {
        unit: UNITS[id], total: x.total, byYear: x.byYear, trend: trend,
        recent: recentYears.reduce(function (n, y) { return n + x.byYear[y]; }, 0), recentYears: recentYears
      };
    });
    anCache = { rows: rows, perYear: perYear, years: years };
    return anCache;
  }
  function hl(text, q) {
    var t = esc(text);
    if (!q) return t;
    var i = text.toLowerCase().indexOf(q);
    if (i < 0) return t;
    return esc(text.slice(0, i)) + "<mark>" + esc(text.slice(i, i + q.length)) + "</mark>" + esc(text.slice(i + q.length));
  }
  var TREND = { up: ["↑", "Rising"], down: ["↓", "Falling"] };

  function viewAnalysis(tab) {
    setTab("analysis");
    if (["all", "recent"].indexOf(tab) < 0) { go("#/analysis/all", true); return; }
    var d = analysisData();
    var tabs = [["all", "All years · " + MIN_YEAR + "–" + MAX_YEAR], ["recent", "Recent trends · " + RECENT_FROM + "–" + MAX_YEAR]];
    var intro = {
      all: "Every broad subtopic UPSC has asked, " + MIN_YEAR + "–" + MAX_YEAR + ", most-asked first within each subject. " +
        "<b>Trend</b> shows whether a subtopic is asked more (rising) or less (falling) in " + SPLIT_YEAR + "–" + MAX_YEAR + " than in " + MIN_YEAR + "–" + (SPLIT_YEAR - 1) +
        ", allowing for the longer 150-question papers of 2000–2010. Tap a subtopic to practise its questions.",
      recent: "The same subtopics counted over the last " + (MAX_YEAR - RECENT_FROM + 1) + " papers (" + RECENT_FROM + "–" + MAX_YEAR + "), with the years each was asked " +
        "(the number in brackets is how many questions that year). Tap a subtopic to practise just these recent questions."
    }[tab];
    app.innerHTML = '<h1>PYQ analysis</h1><p class="sub">' + qs(QUESTIONS.length) + ' from ' + d.years.length + ' papers (' + MIN_YEAR + '–' + MAX_YEAR +
      ', GS only), grouped into ' + Object.keys(UNITS).length + ' broad subtopics.</p>' +
      '<div class="an-tabs" role="tablist">' + tabs.map(function (t) {
        return '<a role="tab" href="#/analysis/' + t[0] + '" class="' + (t[0] === tab ? "active" : "") + '" aria-selected="' + (t[0] === tab) + '">' + t[1] + '</a>';
      }).join("") + '</div>' +
      '<p class="an-intro">' + intro + '</p>' +
      '<div class="an-controls"><label class="visually-hidden" for="an-subject">Subject</label>' +
        '<select id="an-subject"><option value="">All subjects</option>' + SUBJECTS.map(function (s) {
          return '<option value="' + s.id + '"' + (anFilter.subject === s.id ? " selected" : "") + '>' + esc(s.name) + '</option>';
        }).join("") + '</select>' +
        '<label class="visually-hidden" for="an-search">Search subtopics</label>' +
        '<input id="an-search" type="search" placeholder="Search a subtopic, e.g. soil, rights, Buddhism" autocomplete="off" value="' + esc(anFilter.query) + '">' +
        '</div><div id="an-out"></div>';
    var out = document.getElementById("an-out");
    function draw() { out.innerHTML = unitTable(d, tab); }
    draw();
    document.getElementById("an-subject").addEventListener("change", function () { anFilter.subject = this.value; draw(); });
    // filters while typing, no Enter needed
    document.getElementById("an-search").addEventListener("input", function () { anFilter.query = this.value; draw(); });
  }

  function unitTable(d, tab) {
    var recent = tab === "recent", q = anFilter.query.trim().toLowerCase();
    var groups = SUBJECTS.filter(function (s) { return !anFilter.subject || s.id === anFilter.subject; }).map(function (s) {
      var rows = d.rows.filter(function (r) { return r.unit.subject === s.id; }).map(function (r) {
        if (!q) return { r: r };
        if (r.unit.title.toLowerCase().indexOf(q) >= 0 || s.name.toLowerCase().indexOf(q) >= 0) return { r: r };
        var hit = r.unit.topics.filter(function (t) { return t.toLowerCase().indexOf(q) >= 0; });
        return hit.length ? { r: r, via: hit } : null;
      }).filter(Boolean);
      rows.sort(function (a, b) {
        return recent ? (b.r.recent - a.r.recent || b.r.total - a.r.total) : (b.r.total - a.r.total);
      });
      return { s: s, rows: rows };
    }).filter(function (g) { return g.rows.length; });
    if (!groups.length) return '<p class="empty">No subtopic matches “' + esc(anFilter.query) + '”.</p>';
    var count = groups.reduce(function (n, g) { return n + g.rows.length; }, 0);
    var head = recent ?
      '<tr><th>Subject</th><th>Subtopic</th><th class="num">Questions</th><th>Years asked</th></tr>' :
      '<tr><th>Subject</th><th>Subtopic</th><th class="num">Questions</th><th>Trend</th></tr>';
    var body = groups.map(function (g) {
      var subTotal = g.rows.reduce(function (n, x) { return n + (recent ? x.r.recent : x.r.total); }, 0);
      var cols = 4;
      // on phones the Subject column is hidden and this header row stands in for it
      return '<tr class="an-group"><td colspan="' + cols + '"><b>' + hl(g.s.name, q) + '</b> · ' + qs(subTotal) + '</td></tr>' + g.rows.map(function (x, i) {
        var r = x.r, u = r.unit;
        var practise = "#/unit/" + u.id + (recent ? "@" + RECENT_FROM : "") + "/0";
        var n = recent ? r.recent : r.total;
        var name = (n ? '<a class="an-unit" href="' + practise + '" title="Practise these ' + qs(n) + '">' + hl(u.title, q) + '</a>' : '<span class="an-unit none">' + hl(u.title, q) + '</span>') +
          (x.via ? '<small class="an-via">includes ' + x.via.map(function (t) { return hl(t, q); }).join("; ") + '</small>' : "") +
          (u.firstTopic ? ' <a class="an-notes" href="#/notes/' + u.subject + '/' + u.firstTopic + '">notes</a>' : "");
        var subj = i === 0 ? '<td class="an-subj" rowspan="' + g.rows.length + '"><b>' + hl(g.s.name, q) + '</b><small>' + qs(subTotal) + '</small></td>' : "";
        if (recent) {
          var yrs = r.recentYears.map(function (y) { return y + (r.byYear[y] > 1 ? " (" + r.byYear[y] + ")" : ""); }).join(", ");
          return '<tr>' + subj + '<td>' + name + '</td><td class="num"><b>' + n + '</b></td><td class="an-years">' + (yrs || '<span class="muted">not asked</span>') + '</td></tr>';
        }
        var t = TREND[r.trend];
        return '<tr>' + subj + '<td>' + name + '</td><td class="num"><b>' + n + '</b></td>' +
          '<td><span class="trend ' + r.trend + '">' + t[0] + ' ' + t[1] + '</span></td></tr>';
      }).join("");
    }).join("");
    return '<p class="an-count">' + count + (count === 1 ? " subtopic" : " subtopics") + '</p>' +
      '<div class="table-wrap"><table class="an-table' + (recent ? " recent" : "") + '">' + head + body + '</table></div>';
  }

  // ---------- topic-wise books ----------
  function bookTopics(id) {
    var out = [];
    BOOKS[id].units.forEach(function (u, ui) {
      u.topics.forEach(function (t, ti) {
        out.push({ unit: u, topic: t, num: (ui + 1) + "." + (ti + 1), unitNo: ui + 1 });
      });
    });
    return out;
  }
  function bookWritten(id) { return bookTopics(id).filter(function (x) { return x.topic.html; }); }
  function bookComplete(id) { return bookWritten(id).length === bookTopics(id).length; }
  // Whole book for the PDF: contents, then every written unit and topic in reading order
  function bookHtml(id) {
    var toc = '<div class="toc"><b>Contents</b>' + BOOKS[id].units.map(function (u, ui) {
      if (!u.topics.some(function (t) { return t.html; })) return "";
      return '<div class="toc-unit">' + (ui + 1) + '. ' + esc(u.title) + '</div>' + u.topics.map(function (t, ti) {
        return t.html ? '<a href="#bk-' + t.id + '">' + (ui + 1) + '.' + (ti + 1) + ' ' + esc(t.title) + '</a>' : "";
      }).join("");
    }).join("") + '</div>';
    var body = BOOKS[id].units.map(function (u, ui) {
      if (!u.topics.some(function (t) { return t.html; })) return "";
      return '<h2 class="book-unit">' + (ui + 1) + '. ' + esc(u.title) + '</h2>' + u.topics.map(function (t, ti) {
        return t.html ? '<h3 class="book-topic" id="bk-' + t.id + '">' + (ui + 1) + '.' + (ti + 1) + ' ' + esc(t.title) + '</h3>' +
          '<div class="book-text">' + t.html + '</div>' : "";
      }).join("");
    }).join("");
    var rest = (!bookComplete(id) && NOTES[id]) ?
      '<h2 class="book-unit">Earlier short notes (until every topic above is written)</h2>' + oldNotesHtml(id, true) : "";
    return '<h1>' + esc(subjectName(id)) + '</h1>' + toc + body + rest;
  }

  // One subject's notes for the PDF: the topic-wise book if there is one, otherwise the short notes
  function notesHtml(id) {
    if (BOOKS[id]) return bookHtml(id);
    return oldNotesHtml(id, false);
  }

  // Short notes: title, contents and every section ("How to prepare" always last)
  function oldNotesHtml(id, bare) {
    var secs = NOTES[id].sections.filter(function (s) { return s.title !== "How to prepare"; })
      .concat(NOTES[id].sections.filter(function (s) { return s.title === "How to prepare"; }));
    var toc = '<div class="toc"><b>Contents</b>' + secs.map(function (s, i) {
      return '<a href="#sec-' + id + '-' + i + '">' + (i + 1) + '. ' + esc(s.title) + '</a>';
    }).join("") + '</div>';
    var body = secs.map(function (s, i) {
      return '<h2 id="sec-' + id + '-' + i + '">' + (i + 1) + '. ' + esc(s.title) + '</h2>' + s.html;
    }).join("");
    return (bare ? "" : '<h1>' + esc(subjectName(id)) + '</h1>') + toc + body;
  }

  // PDF download: renders the chosen subjects into a print-only sheet and opens the browser's
  // print dialog, where "Save as PDF" gives a text-searchable file named after the subject.
  function printNotes(ids) {
    var years = QUESTIONS.map(function (q) { return q.year; });
    var span = Math.min.apply(null, years) + "–" + Math.max.apply(null, years);
    var single = ids.length === 1;
    var name = single ? subjectName(ids[0]) : "All subjects";
    var sheet = document.createElement("div");
    sheet.id = "print-sheet";
    sheet.className = "print-sheet";
    sheet.innerHTML = '<div class="print-cover"><h1>UPSC Prelims PYQ Notes</h1><p>' + esc(name) +
      '</p><small>Built from every GS question asked in ' + span + '. Generated ' +
      new Date().toLocaleDateString("en-IN", { day: "numeric", month: "long", year: "numeric" }) + '.</small></div>' +
      ids.map(function (id) {
        return '<section class="notes-body print-subject">' + notesHtml(id).replace(/ id="(sec|bk)-/g, ' id="p-$1-')
          .replace(/href="#(sec|bk)-/g, 'href="#p-$1-') + '</section>';
      }).join("");
    wrapTables(sheet);
    clearPrint();
    document.body.appendChild(sheet);
    document.title = "UPSC PYQ Notes - " + name;
    document.body.classList.add("printing-notes");
    window.print();
  }
  // The sheet is invisible on screen, so it can safely wait until printing ends or the user moves on
  // (some mobile browsers return from print() before the PDF is made).
  var BASE_TITLE = document.title;
  function clearPrint() {
    var old = document.getElementById("print-sheet");
    if (old) old.parentNode.removeChild(old);
    document.body.classList.remove("printing-notes");
    document.title = BASE_TITLE;
  }
  window.addEventListener("afterprint", clearPrint);

  var TREE_KEY = "pyq-tree-open";
  function treeOpen() {
    var v = null;
    try { v = localStorage.getItem(TREE_KEY); } catch (e) { /* ignore */ }
    if (v === "1") return true;
    if (v === "0") return false;
    return !(window.matchMedia && window.matchMedia("(max-width: 700px)").matches);
  }
  // Side tree of units and topics for the open subject
  function bookTree(id, topicId) {
    return '<details class="tree-box" id="tree-box"' + (treeOpen() ? " open" : "") + '><summary>Topics</summary>' +
      BOOKS[id].units.map(function (u, ui) {
        var here = u.topics.some(function (t) { return t.id === topicId; });
        return '<div class="tree-unit' + (here ? " here" : "") + '"><b>' + (ui + 1) + '. ' + esc(u.title) + '</b>' +
          u.topics.map(function (t, ti) {
            var label = (ui + 1) + '.' + (ti + 1) + ' ' + esc(t.title);
            if (!t.html) return '<span class="tree-topic todo">' + label + '</span>';
            return '<a class="tree-topic' + (t.id === topicId ? " active" : "") + '" href="#/notes/' + id + '/' + t.id + '">' + label + '</a>';
          }).join("") + '</div>';
      }).join("") + '</details>';
  }
  // Book overview (no topic), one topic, or the earlier short notes ("old"); null = redirected
  function bookPage(id, topicId) {
    var all = bookTopics(id), done = bookWritten(id);
    if (!topicId) {
      var units = BOOKS[id].units.map(function (u, ui) {
        return '<div class="ov-unit"><h3>' + (ui + 1) + '. ' + esc(u.title) + '</h3>' + u.topics.map(function (t, ti) {
          var label = (ui + 1) + '.' + (ti + 1) + ' ' + esc(t.title);
          return t.html ? '<a href="#/notes/' + id + '/' + t.id + '">' + label + '</a>' : '<span class="todo">' + label + ' · being written</span>';
        }).join("") + '</div>';
      }).join("");
      return '<h1>' + esc(subjectName(id)) + '</h1>' +
        '<p class="sub">Read in order: each unit builds on the ones before it. Every fact behind every past UPSC question is covered inside these topics, along with the background you need.</p>' +
        (done.length ? '<p><a class="btn primary" href="#/notes/' + id + '/' + done[0].topic.id + '">Start reading → ' + done[0].num + ' ' + esc(done[0].topic.title) + '</a></p>' : "") +
        (done.length < all.length ? '<p class="progress-note">' + done.length + ' of ' + all.length + ' topics written so far.' +
          (NOTES[id] ? ' Until the rest are ready, the <a href="#/notes/' + id + '/old">earlier short notes</a> stay available.' : "") + '</p>' : "") +
        '<div class="ov">' + units + '</div>';
    }
    if (topicId === "old" && NOTES[id]) {
      return '<p class="crumb"><a href="#/notes/' + id + '">' + esc(subjectName(id)) + '</a> › Earlier short notes</p>' + oldNotesHtml(id, false);
    }
    var k = -1;
    for (var i = 0; i < done.length; i++) if (done[i].topic.id === topicId) k = i;
    if (k < 0) { go("#/notes/" + id, true); return null; }
    var x = done[k], prev = done[k - 1], next = done[k + 1];
    var n = 0, inToc = [];
    var html = x.topic.html.replace(/<h3>([\s\S]*?)<\/h3>/g, function (m, title) {
      inToc.push('<a href="#in-' + n + '">' + title + '</a>');
      return '<h3 id="in-' + (n++) + '">' + title + '</h3>';
    });
    var navRow = '<div class="nav-row topic-nav">' +
      (prev ? '<a class="btn" href="#/notes/' + id + '/' + prev.topic.id + '">← ' + prev.num + ' ' + esc(prev.topic.title) + '</a>' : '<span></span>') +
      (next ? '<a class="btn primary" href="#/notes/' + id + '/' + next.topic.id + '">' + next.num + ' ' + esc(next.topic.title) + ' →</a>' : '<span></span>') +
      '</div>';
    return '<p class="crumb"><a href="#/notes/' + id + '">' + esc(subjectName(id)) + '</a> › ' + x.unitNo + '. ' + esc(x.unit.title) + '</p>' +
      '<h1>' + x.num + ' ' + esc(x.topic.title) + '</h1>' +
      (inToc.length > 2 ? '<div class="toc"><b>In this topic</b>' + inToc.join("") + '</div>' : "") +
      '<div class="book-text">' + html + '</div>' + navRow;
  }

  function viewNotes(id, topicId) {
    setTab("notes");
    var available = SUBJECTS.filter(function (s) { return NOTES[s.id] || BOOKS[s.id]; });
    if (!available.length) {
      app.innerHTML = '<h1>PYQ Notes</h1><p class="empty">Notes will appear here as papers are analysed.</p>';
      return;
    }
    if (!id || !(NOTES[id] || BOOKS[id])) { go("#/notes/" + available[0].id, true); return; }
    var main;
    if (BOOKS[id]) {
      main = bookPage(id, topicId);
      if (main === null) return;
    } else {
      main = oldNotesHtml(id, false);
    }
    var side = SUBJECTS.map(function (s) {
      if (!NOTES[s.id] && !BOOKS[s.id]) return "";
      return '<a href="#/notes/' + s.id + '" class="' + (s.id === id ? "active" : "") + '">' + esc(s.name) + '</a>' +
        (s.id === id && BOOKS[id] ? bookTree(id, topicId) : "");
    }).join("");
    app.innerHTML = '<h1>PYQ Notes</h1><p class="sub">Every topic UPSC has asked, combined into one reference per subject.</p>' +
      '<div class="pdf-bar" id="pdf-bar">' +
      '<button class="btn primary" id="pdf-one" type="button">⬇ Download ' + esc(subjectName(id)) + ' notes (PDF)</button>' +
      '<button class="btn" id="pdf-all" type="button">⬇ All subjects (PDF)</button></div>' +
      '<div class="notes-layout"><nav class="notes-side" id="notes-side">' + side +
      '</nav><article class="notes-body" id="notes-body">' + main + '</article></div>';
    document.getElementById("pdf-one").addEventListener("click", function () { printNotes([id]); });
    document.getElementById("pdf-all").addEventListener("click", function () {
      printNotes(available.map(function (s) { return s.id; }));
    });
    var tb = document.getElementById("tree-box");
    if (tb) tb.addEventListener("toggle", function () {
      try { localStorage.setItem(TREE_KEY, this.open ? "1" : "0"); } catch (e) { /* ignore */ }
    });
    // in-page links (#sec-..., #in-...) must not fight the hash router
    app.querySelectorAll('.notes-body a[href^="#sec-"], .notes-body a[href^="#in-"]').forEach(function (a) {
      a.addEventListener("click", function (e) {
        e.preventDefault();
        var target = document.getElementById(a.getAttribute("href").slice(1));
        if (target) target.scrollIntoView({ behavior: "smooth" });
      });
    });
  }

  // ---------- my data: everything lives in this browser's storage; a backup file protects it ----------
  function ownKeys() {
    var out = [];
    try {
      for (var i = 0; i < localStorage.length; i++) {
        var k = localStorage.key(i);
        if (k && k.indexOf("pyq-") === 0) out.push(k);
      }
    } catch (e) { /* storage blocked */ }
    return out;
  }
  function downloadBackup() {
    var data = {};
    ownKeys().forEach(function (k) { if (k !== BACKUP_KEY) data[k] = localStorage.getItem(k); });
    var payload = { app: "upsc-pyq-portal", version: 1, created: new Date().toISOString(), data: data };
    var blob = new Blob([JSON.stringify(payload)], { type: "application/json" });
    var url = URL.createObjectURL(blob);
    var a = document.createElement("a");
    a.href = url;
    a.download = "upsc-pyq-backup-" + dayKey(new Date()) + ".json";
    document.body.appendChild(a);
    a.click();
    a.parentNode.removeChild(a);
    setTimeout(function () { URL.revokeObjectURL(url); }, 4000);
    store(BACKUP_KEY, Date.now());
    toast("Backup downloaded. Keep the file somewhere safe.");
    route();
  }
  // Replaces this browser's progress with a backup file, then reloads so every view starts from it
  function restoreBackup(file) {
    var reader = new FileReader();
    reader.onload = function () {
      var p = null;
      try { p = JSON.parse(reader.result); } catch (e) { /* not JSON */ }
      if (!p || p.app !== "upsc-pyq-portal" || !p.data || typeof p.data !== "object") {
        toast("That file is not a backup from this portal.");
        return;
      }
      var keys = Object.keys(p.data).filter(function (k) { return k.indexOf("pyq-") === 0 && typeof p.data[k] === "string"; });
      var when = p.created && !isNaN(new Date(p.created)) ?
        new Date(p.created).toLocaleString("en-IN", { day: "numeric", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" }) : "an unknown date";
      if (!confirm("Restore the backup from " + when + "? It replaces the progress now in this browser.")) return;
      try {
        ownKeys().forEach(function (k) { localStorage.removeItem(k); });
        keys.forEach(function (k) { localStorage.setItem(k, p.data[k]); });
        localStorage.setItem(BACKUP_KEY, JSON.stringify(Date.now()));
        sessionStorage.setItem("pyq-flash", "Backup restored.");
      } catch (e) {
        toast("This browser is blocking storage, so the backup could not be restored.");
        return;
      }
      location.replace("#/data");
      location.reload();
    };
    reader.onerror = function () { toast("Could not read that file."); };
    reader.readAsText(file);
  }
  function viewData() {
    setTab("data");
    var t = tally(QUESTIONS);
    var done = t.correct + t.wrong + t.dropped;
    var days = Object.keys(activity).filter(function (k) { return activity[k] > 0; }).length;
    var lastBackup = load(BACKUP_KEY, 0);
    app.innerHTML = '<a class="btn back" href="#/">← Back</a><h1>My data</h1>' +
      '<p class="sub">Your answers, bookmarks, heatmap and settings are saved in this browser on this device. Nothing is sent anywhere. ' +
      'If browser data is cleared, or you switch phone or browser, they are lost, so download a backup now and then and restore it when needed.</p>' +
      '<div class="stats">' +
      '<div class="stat"><b>' + done + '</b><small>questions answered</small></div>' +
      '<div class="stat"><b>' + bookmarks.length + '</b><small>bookmarks</small></div>' +
      '<div class="stat"><b>' + days + '</b><small>practice days</small></div>' +
      '<div class="stat"><b>' + (lastBackup ? new Date(lastBackup).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" }) : "Never") +
      '</b><small>last backup</small></div></div>' +
      '<div class="data-grid">' +
      '<div class="card data-card">' + icon("download") + '<h2>Back up</h2><p>Download one small file with all your progress. Keep it in Drive, email or your phone.</p>' +
      '<button class="btn primary" id="backup-btn" type="button">Download backup</button></div>' +
      '<div class="card data-card">' + icon("upload") + '<h2>Restore</h2><p>Load a backup file. It replaces the progress now saved in this browser.</p>' +
      '<label class="btn" for="restore-file" id="restore-label" tabindex="0" role="button">Choose backup file</label>' +
      '<input type="file" id="restore-file" accept=".json,application/json" class="visually-hidden"></div>' +
      '<div class="card data-card danger-zone">' + icon("trash") + '<h2>Start fresh</h2><p>Delete all progress from this browser. Back up first if you might want it later.</p>' +
      '<button class="btn danger" id="wipe-btn" type="button">Clear all my data</button></div>' +
      installCard() + '</div><p class="hint" id="persist-note"></p>';
    document.getElementById("backup-btn").addEventListener("click", downloadBackup);
    var ib = document.getElementById("install-card-btn");
    if (ib) ib.addEventListener("click", installApp);
    var input = document.getElementById("restore-file");
    input.addEventListener("change", function () {
      if (input.files && input.files[0]) restoreBackup(input.files[0]);
      input.value = "";
    });
    document.getElementById("restore-label").addEventListener("keydown", function (e) {
      if (e.key === "Enter" || e.key === " ") { e.preventDefault(); input.click(); }
    });
    document.getElementById("wipe-btn").addEventListener("click", function () {
      if (!confirm("Delete all your answers, bookmarks and heatmap from this browser? This cannot be undone without a backup file.")) return;
      ownKeys().forEach(function (k) { try { localStorage.removeItem(k); } catch (e) { /* ignore */ } });
      try { sessionStorage.setItem("pyq-flash", "All data cleared."); } catch (e) { /* ignore */ }
      location.replace("#/");
      location.reload();
    });
    if (navigator.storage && navigator.storage.persisted) {
      navigator.storage.persisted().then(function (on) {
        var n = document.getElementById("persist-note");
        if (n) n.textContent = on ? "This browser has agreed to keep the portal's data even when space runs low."
          : "The browser may clear this data when space runs low, which is another reason to keep a backup.";
      }).catch(function () { /* ignore */ });
    }
  }
  // ---------- install as an app (active only in the published build, which adds manifest.webmanifest and sw.js) ----------
  var installPrompt = null;
  var canInstallPage = !!document.querySelector('link[rel="manifest"]');
  function isStandalone() {
    return (window.matchMedia && window.matchMedia("(display-mode: standalone)").matches) || navigator.standalone === true;
  }
  var isIOS = /iphone|ipad|ipod/i.test(navigator.userAgent) || (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1);
  function updateInstallBtn() {
    var b = document.getElementById("install-btn");
    if (b) b.hidden = !installPrompt;
  }
  function installApp() {
    if (!installPrompt) return;
    var p = installPrompt;
    p.prompt();
    Promise.resolve(p.userChoice).catch(function () { /* ignore */ }).then(function () {
      installPrompt = null;
      updateInstallBtn();
      if (/^#\/data/.test(location.hash)) route();
    });
  }
  function installCard() {
    if (!canInstallPage) return "";
    var body;
    if (isStandalone()) body = '<p>You are using the installed app. It opens from your home screen or app list and works without internet.</p>';
    else if (installPrompt) body = '<p>Add the portal to your home screen or desktop. It opens like an app and works without internet.</p>' +
      '<button class="btn primary" id="install-card-btn" type="button">Install app</button>';
    else if (isIOS) body = '<p>On iPhone or iPad, open this page in <b>Safari</b>, tap the <b>Share</b> button, then <b>Add to Home Screen</b>.</p>';
    else body = '<p>Use your browser menu: <b>Install app</b> (Chrome or Edge on a computer) or <b>Add to Home screen</b> (Chrome on Android).</p>';
    return '<div class="card data-card install-card">' + icon("download") + '<h2>Install as an app</h2>' + body + '</div>';
  }
  if (canInstallPage) {
    if ("serviceWorker" in navigator && /^https?:$/.test(location.protocol)) {
      navigator.serviceWorker.register("sw.js").catch(function () { /* offline copy unavailable; the site still works */ });
    }
    window.addEventListener("beforeinstallprompt", function (e) {
      e.preventDefault();
      installPrompt = e;
      updateInstallBtn();
      if (/^#\/data/.test(location.hash)) route();
    });
    window.addEventListener("appinstalled", function () {
      installPrompt = null;
      updateInstallBtn();
      toast("Installed. Open it from your home screen or app list.");
    });
  }
  (function () {
    var b = document.getElementById("install-btn");
    if (b) b.addEventListener("click", installApp);
  })();

  // Ask the browser to keep our storage when space runs low (granted silently where supported)
  try {
    if (navigator.storage && navigator.storage.persist) {
      navigator.storage.persisted().then(function (on) { if (!on) return navigator.storage.persist(); }).catch(function () { /* ignore */ });
    }
  } catch (e) { /* ignore */ }

  // ---------- night mode (remembered per browser; follows the OS until toggled) ----------
  var THEME_KEY = "pyq-theme";
  var themeBtn = document.getElementById("theme-btn");
  function isDark() {
    var t = document.documentElement.getAttribute("data-theme");
    if (t) return t === "dark";
    return window.matchMedia && window.matchMedia("(prefers-color-scheme: dark)").matches;
  }
  function applyTheme(t) {
    if (t) document.documentElement.setAttribute("data-theme", t);
    themeBtn.textContent = isDark() ? "☀️" : "🌙";
    themeBtn.title = isDark() ? "Day mode" : "Night mode";
  }
  var savedTheme = null;
  try { savedTheme = localStorage.getItem(THEME_KEY); } catch (e) { /* ignore */ }
  applyTheme(savedTheme);
  themeBtn.addEventListener("click", function () {
    var next = isDark() ? "light" : "dark";
    applyTheme(next);
    try { localStorage.setItem(THEME_KEY, next); } catch (e) { /* ignore */ }
  });

  // ---------- router ----------
  var quizKeys = null;
  document.addEventListener("keydown", function (e) {
    if (quizKeys) quizKeys(e);
  });

  function route() {
    quizKeys = null;
    clearPrint();
    var parts = location.hash.replace(/^#\/?/, "").split("/").map(decodeURIComponent);
    var scrollTop = true;
    switch (parts[0]) {
      case "": viewHome(); break;
      case "subjects": viewSubjects(); break;
      case "papers": viewPapers(); break;
      case "analysis": viewAnalysis(parts[1]); break;
      case "subject":
      case "unit":
      case "paper": viewQuiz(parts[0], parts[1], parts[2] === undefined ? 0 : parseInt(parts[2], 10)); scrollTop = false; break;
      case "notes": viewNotes(parts[1], parts[2]); break;
      case "test": viewTest(parts[1], parts[2]); scrollTop = parts[1] !== "q"; break;
      case "data": viewData(); break;
      case "bookmarks": viewBookmarks(parts[1] === undefined ? 0 : parseInt(parts[1], 10)); scrollTop = false; break;
      default: go("#/", true);
    }
    wrapTables(app);
    if (scrollTop) window.scrollTo(0, 0);
  }

  var lastQuizKey = "";
  window.addEventListener("hashchange", function () {
    var parts = location.hash.split("/");
    var key = parts.slice(0, 4).join("/");
    route();
    // jump to top when moving to a different question, not when re-rendering the same one
    if (key !== lastQuizKey) window.scrollTo(0, 0);
    lastQuizKey = key;
  });
  route();
  // message carried over a reload (restore, clear)
  try {
    var flash = sessionStorage.getItem("pyq-flash");
    if (flash) { sessionStorage.removeItem("pyq-flash"); toast(flash); }
  } catch (e) { /* ignore */ }
})();
