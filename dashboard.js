import { initializeApp } from "https://www.gstatic.com/firebasejs/11.6.0/firebase-app.js";
import { getAuth, signOut, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/11.6.0/firebase-auth.js";
import { getFirestore, doc, getDoc } from "https://www.gstatic.com/firebasejs/11.6.0/firebase-firestore.js";

const firebaseConfig = {
  apiKey: "AIzaSyCBqopRPyEYBvUAfV2ZnWbH2wvitpVPk2M",
  authDomain: "irg-app-6ad50.firebaseapp.com",
  projectId: "irg-app-6ad50",
  storageBucket: "irg-app-6ad50.firebasestorage.app",
  messagingSenderId: "709449150242",
  appId: "1:709449150242:web:8eccd2a8e8e0ac8065bf7b",
  measurementId: "G-YEQ2DC0R7Q"
};

const APPS_SCRIPT_URL = "PASTE_YOUR_APPS_SCRIPT_WEB_APP_URL_HERE";
const SESSION_EXPIRY_KEY = "svgp_session_expires_at";
const BACK_AFTER_LOGOUT_KEY = "svgp_back_after_logout";

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

let studentProfile = null;
let attendanceList = [];
let holidaysList = [];
let announcementsList = [];
let notesList = [];
let calDate = new Date();

function formatMMSS(ms) {
  const totalSec = Math.max(0, Math.ceil(ms / 1000));
  const m = String(Math.floor(totalSec / 60)).padStart(2, "0");
  const s = String(totalSec % 60).padStart(2, "0");
  return `${m}:${s}`;
}

async function logoutNow() {
  sessionStorage.setItem(BACK_AFTER_LOGOUT_KEY, "1");
  localStorage.removeItem(SESSION_EXPIRY_KEY);
  await signOut(auth);
  window.location.href = "index.html";
}

document.getElementById("logout-btn-desktop").addEventListener("click", logoutNow);
document.getElementById("logout-btn-top").addEventListener("click", logoutNow);

setInterval(async () => {
  const exp = Number(localStorage.getItem(SESSION_EXPIRY_KEY));
  if (!exp) return;
  const rem = exp - Date.now();
  const timerEl = document.getElementById("session-timer");
  if (timerEl) timerEl.textContent = formatMMSS(rem);

  if (rem <= 0) {
    await logoutNow();
  }
}, 1000);

const pageTitles = {
  overview: "Student Overview",
  calendar: "Attendance Calendar",
  notes: "Notes & Study Materials",
  announcements: "Latest Announcements"
};

function openSection(sectionName) {
  document.querySelectorAll(".panel-view").forEach((sec) => {
    sec.classList.toggle("is-active", sec.id === `sec-${sectionName}`);
  });
  document.getElementById("page-heading").textContent = pageTitles[sectionName] || "Dashboard";

  document.querySelectorAll(".side-link, .m-nav-btn[data-section]").forEach((btn) => {
    btn.classList.toggle("is-active", btn.dataset.section === sectionName);
  });
}

document.querySelectorAll(".side-link, .m-nav-btn[data-section]").forEach((btn) => {
  btn.addEventListener("click", () => openSection(btn.dataset.section));
});

document.querySelectorAll("[data-jump]").forEach((btn) => {
  btn.addEventListener("click", () => openSection(btn.dataset.jump));
});

function makeYMD(y, m, d) {
  return `${y}-${String(m + 1).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
}

function renderCalendar() {
  const year = calDate.getFullYear();
  const month = calDate.getMonth();
  document.getElementById("cal-month-label").textContent = calDate.toLocaleDateString("en-US", {
    month: "long",
    year: "numeric"
  });

  const attByDate = {};
  attendanceList.forEach((row) => {
    if (!attByDate[row.date]) attByDate[row.date] = [];
    attByDate[row.date].push(row);
  });

  const holByDate = {};
  holidaysList.forEach((h) => {
    holByDate[h.date] = h;
  });

  const firstDay = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const html = [];

  for (let i = 0; i < firstDay; i++) {
    html.push(`<div class="cal-cell is-empty"></div>`);
  }

  for (let d = 1; d <= daysInMonth; d++) {
    const key = makeYMD(year, month, d);
    const recs = attByDate[key] || [];
    const hol = holByDate[key];

    let cls = "cal-cell";
    let tag = "";

    if (hol || recs.some((r) => r.status === "Holiday")) {
      cls += " st-holiday";
      tag = `<span class="c-tag">Holiday</span>`;
    } else if (recs.length > 0) {
      const hasAbsent = recs.some((r) => r.status === "Absent");
      cls += hasAbsent ? " st-absent" : " st-present";
      tag = `<span class="c-tag">${hasAbsent ? "Absent" : "Present"}</span>`;
    }

    html.push(`
      <button type="button" class="${cls}" data-date="${key}">
        <span class="c-num">${d}</span>
        ${tag}
      </button>
    `);
  }

  const grid = document.getElementById("calendar-grid");
  grid.innerHTML = html.join("");

  grid.querySelectorAll("button[data-date]").forEach((btn) => {
    btn.addEventListener("click", () => {
      grid.querySelectorAll(".cal-cell").forEach((c) => c.classList.remove("is-picked"));
      btn.classList.add("is-picked");

      const dKey = btn.dataset.date;
      const recs = attByDate[dKey] || [];
      const hol = holByDate[dKey];
      const box = document.getElementById("date-detail-box");

      if (hol) {
        box.innerHTML = `<strong>${dKey} • Holiday (${hol.occasion}):</strong> ${hol.note}`;
      } else if (recs.length > 0) {
        box.innerHTML =
          `<strong>${dKey} Attendance Details:</strong><br>` +
          recs.map((r) => `• <strong>${r.status}</strong> — ${r.subject} (Marked by: ${r.markedBy})`).join("<br>");
      } else {
        box.innerHTML = `<strong>${dKey}:</strong> No attendance or holiday entry recorded for this date.`;
      }
    });
  });
}

document.getElementById("prev-month").addEventListener("click", () => {
  calDate = new Date(calDate.getFullYear(), calDate.getMonth() - 1, 1);
  renderCalendar();
});

document.getElementById("next-month").addEventListener("click", () => {
  calDate = new Date(calDate.getFullYear(), calDate.getMonth() + 1, 1);
  renderCalendar();
});

function renderNotesGrid() {
  const search = document.getElementById("note-search").value.trim().toLowerCase();
  const subject = document.getElementById("note-subject-filter").value;

  const filtered = notesList.filter((n) => {
    const okSub = subject === "ALL" || n.subject === subject;
    const okQ = !search || `${n.title} ${n.subject} ${n.faculty}`.toLowerCase().includes(search);
    return okSub && okQ;
  });

  const grid = document.getElementById("notes-grid");
  if (!filtered.length) {
    grid.innerHTML = `<p style="color:#64748b;font-size:13px;">No study materials found.</p>`;
    return;
  }

  grid.innerHTML = filtered
    .map(
      (n) => `
      <article class="note-card">
        <div>
          <span class="subj-badge">${n.subject}</span>
          <h4>${n.title}</h4>
          <p class="note-sub">By ${n.faculty} • ${n.updatedAt}</p>
        </div>
        <div class="note-btns">
          <a href="${n.previewUrl}" target="_blank" rel="noopener" class="n-btn n-view">View PDF</a>
          <a href="${n.downloadUrl}" target="_blank" rel="noopener" class="n-btn n-dl">Download ↓</a>
        </div>
      </article>
    `
    )
    .join("");
}

document.getElementById("note-search").addEventListener("input", renderNotesGrid);
document.getElementById("note-subject-filter").addEventListener("change", renderNotesGrid);

function renderDashboard() {
  const working = attendanceList.filter((r) => r.status !== "Holiday");
  const present = working.filter((r) => r.status === "Present").length;
  const absent = working.filter((r) => r.status === "Absent").length;
  const pct = working.length ? Math.round((present / working.length) * 100) : 0;
  const totalHolidays = holidaysList.length + attendanceList.filter((r) => r.status === "Holiday").length;

  document.getElementById("kpi-pct").textContent = `${pct}%`;
  document.getElementById("kpi-ratio").textContent = `${present} / ${working.length} working days`;
  document.getElementById("kpi-present").textContent = String(present);
  document.getElementById("kpi-absent").textContent = String(absent);
  document.getElementById("kpi-holidays").textContent = String(totalHolidays);
  document.getElementById("kpi-notes-count").textContent = `${notesList.length} PDF materials`;

  document.getElementById("overview-recent").innerHTML = attendanceList.slice(0, 4).length
    ? attendanceList
        .slice(0, 4)
        .map(
          (r) => `
          <div class="list-item">
            <span><strong>${r.date}</strong> • ${r.subject}</span>
            <strong style="color:${r.status === "Present" ? "#15803d" : r.status === "Holiday" ? "#475569" : "#b91c1c"}">${r.status}</strong>
          </div>`
        )
        .join("")
    : `<p style="color:#64748b;font-size:13px;">No attendance entries yet.</p>`;

  document.getElementById("overview-ann").innerHTML = announcementsList.slice(0, 3).length
    ? announcementsList
        .slice(0, 3)
        .map(
          (a) => `
          <div class="list-item">
            <span><strong>${a.title}</strong></span>
            <small style="color:#64748b">${a.date}</small>
          </div>`
        )
        .join("")
    : `<p style="color:#64748b;font-size:13px;">No announcements yet.</p>`;

  document.getElementById("announcements-full").innerHTML = announcementsList.length
    ? announcementsList
        .map(
          (a) => `
          <div class="ann-card">
            <h4>${a.title}</h4>
            <p>${a.message}</p>
            <small>Posted by ${a.faculty} • ${a.date}</small>
          </div>`
        )
        .join("")
    : `<p style="color:#64748b;font-size:13px;">No announcements right now.</p>`;

  const uniqueSubjects = [...new Set(notesList.map((n) => n.subject))];
  document.getElementById("note-subject-filter").innerHTML =
    `<option value="ALL">All Subjects</option>` +
    uniqueSubjects.map((s) => `<option value="${s}">${s}</option>`).join("");

  renderNotesGrid();
  renderCalendar();
}

const aiPanel = document.getElementById("ai-panel");
const aiChatBox = document.getElementById("ai-chat-box");
const aiInput = document.getElementById("ai-input");

function toggleAIPanel(forceState) {
  const open = typeof forceState === "boolean" ? forceState : !aiPanel.classList.contains("is-open");
  aiPanel.classList.toggle("is-open", open);
}

document.getElementById("ai-fab").addEventListener("click", () => toggleAIPanel());
document.getElementById("mobile-ai-btn").addEventListener("click", () => toggleAIPanel(true));
document.getElementById("ai-close").addEventListener("click", () => toggleAIPanel(false));

function buildAIReply(promptText) {
  const q = promptText.toLowerCase();
  const working = attendanceList.filter((r) => r.status !== "Holiday");
  const present = working.filter((r) => r.status === "Present").length;
  const absent = working.filter((r) => r.status === "Absent").length;
  const pct = working.length ? Math.round((present / working.length) * 100) : 0;
  const holCount = holidaysList.length + attendanceList.filter((r) => r.status === "Holiday").length;

  if (q.includes("attendance")) {
    return `📊 <strong>Attendance:</strong> <strong>${pct}%</strong> (${present} Present, ${absent} Absent out of ${working.length} working days).`;
  }
  if (q.includes("note") || q.includes("material") || q.includes("pdf")) {
    if (!notesList.length) return "📚 No notes uploaded yet.";
    return `📚 <strong>Available Notes (${notesList.length}):</strong><br>` +
      notesList.slice(0, 5).map((n) => `• <strong>${n.subject}:</strong> ${n.title}`).join("<br>");
  }
  if (q.includes("holiday")) {
    const sample = holidaysList.slice(0, 3).map((h) => `${h.date} (${h.occasion})`).join(", ");
    return `🗓️ <strong>Total Holidays:</strong> <strong>${holCount}</strong> day(s).${sample ? `<br>Listed: ${sample}` : ""}`;
  }
  if (q.includes("progress") || q.includes("academic")) {
    const remark = pct >= 85 ? "Excellent Standing" : pct >= 75 ? "Good Standing" : "Needs Attention";
    return `🎓 <strong>Academic Progress (${studentProfile.fullName}):</strong><br>• Attendance: <strong>${pct}%</strong> (${remark})<br>• Study Materials: <strong>${notesList.length} PDFs</strong>`;
  }
  return `Ask me about <strong>"My attendance"</strong>, <strong>"My notes"</strong>, <strong>"How many holidays?"</strong>, or <strong>"My academic progress"</strong>.`;
}

function askAI(text) {
  const trimmed = text.trim();
  if (!trimmed) return;
  aiChatBox.innerHTML += `<div class="bubble user">${trimmed}</div>`;
  aiChatBox.innerHTML += `<div class="bubble bot">${buildAIReply(trimmed)}</div>`;
  aiChatBox.scrollTop = aiChatBox.scrollHeight;
}

document.querySelectorAll(".ai-chip").forEach((chip) => {
  chip.addEventListener("click", () => askAI(chip.dataset.q));
});

document.getElementById("ai-form").addEventListener("submit", (e) => {
  e.preventDefault();
  askAI(aiInput.value);
  aiInput.value = "";
});

async function syncPortalData() {
  if (!studentProfile) return;

  if (!APPS_SCRIPT_URL || APPS_SCRIPT_URL.startsWith("PASTE_")) {
    const ym = `${calDate.getFullYear()}-${String(calDate.getMonth() + 1).padStart(2, "0")}`;
    attendanceList = [
      { date: `${ym}-02`, subject: "Web Programming", status: "Present", markedBy: "Faculty" },
      { date: `${ym}-03`, subject: "Python Lab", status: "Present", markedBy: "Faculty" },
      { date: `${ym}-04`, subject: "DBMS Basics", status: "Absent", markedBy: "Faculty" }
    ];
    holidaysList = [{ date: `${ym}-05`, occasion: "Holiday", note: "Scheduled Camp Holiday" }];
    announcementsList = [
      { date: `${ym}-02`, title: "SVGP Summer Camp 2026 Notice", message: "Classes run smoothly Monday to Saturday.", faculty: "SVGP Coordinator" }
    ];
    notesList = [];
    renderDashboard();
    return;
  }

  const syncBtn = document.getElementById("sync-btn");
  syncBtn.disabled = true;
  syncBtn.textContent = "Syncing...";

  try {
    const params = new URLSearchParams({
      username: studentProfile.username || "",
      email: studentProfile.email || ""
    });
    const resp = await fetch(`${APPS_SCRIPT_URL}?${params.toString()}`);
    const payload = await resp.json();

    if (payload.ok) {
      attendanceList = payload.attendance || [];
      holidaysList = payload.holidays || [];
      announcementsList = payload.announcements || [];
      notesList = payload.notes || [];
      renderDashboard();
    }
  } catch (err) {
    console.error("Failed to sync data:", err);
  } finally {
    syncBtn.disabled = false;
    syncBtn.textContent = "↻ Sync Data";
  }
}

document.getElementById("sync-btn").addEventListener("click", syncPortalData);

onAuthStateChanged(auth, async (user) => {
  if (!user) {
    window.location.href = "index.html";
    return;
  }

  const fallbackName = user.displayName || "Student";
  studentProfile = {
    fullName: fallbackName,
    username: "",
    email: user.email || "",
    profileImage: `https://api.dicebear.com/9.x/initials/svg?seed=${encodeURIComponent(fallbackName)}`
  };

  try {
    const snap = await getDoc(doc(db, "users", user.uid));
    if (snap.exists()) studentProfile = { ...studentProfile, ...snap.data() };
  } catch (_) {}

  document.getElementById("stu-name").textContent = studentProfile.fullName;
  document.getElementById("stu-id").textContent = `ID: ${studentProfile.username || studentProfile.email}`;
  document.getElementById("stu-avatar").src = studentProfile.profileImage;

  await syncPortalData();
});
