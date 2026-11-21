import { initializeApp } from "https://www.gstatic.com/firebasejs/11.6.0/firebase-app.js";
import {
  getAuth,
  signOut,
  onAuthStateChanged
} from "https://www.gstatic.com/firebasejs/11.6.0/firebase-auth.js";
import {
  getFirestore,
  doc,
  getDoc
} from "https://www.gstatic.com/firebasejs/11.6.0/firebase-firestore.js";

const firebaseConfig = {
  apiKey: "AIzaSyCBqopRPyEYBvUAfV2ZnWbH2wvitpVPk2M",
  authDomain: "irg-app-6ad50.firebaseapp.com",
  projectId: "irg-app-6ad50",
  storageBucket: "irg-app-6ad50.firebasestorage.app",
  messagingSenderId: "709449150242",
  appId: "1:709449150242:web:8eccd2a8e8e0ac8065bf7b",
  measurementId: "G-YEQ2DC0R7Q"
};

// Replace with your deployed Google Apps Script Web App URL:
const APPS_SCRIPT_URL = "https://script.google.com/macros/s/AKfycby3m8TAMNrvthET_UqL2Kjo-g3Yu4sMqMr-GAkSJAnnaP4f6_spWmCxAWLZpX4mrUAQ/exec";

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

let studentProfile = null;
let attendanceList = [];
let pdfNotesList = [];
let viewDate = new Date();

// DOM elements
const stuAvatar = document.getElementById("stu-avatar");
const stuName = document.getElementById("stu-name");
const stuId = document.getElementById("stu-id");
const logoutBtn = document.getElementById("logout-btn");

const statPct = document.getElementById("stat-pct");
const statDays = document.getElementById("stat-days");
const statPresent = document.getElementById("stat-present");
const statAbsent = document.getElementById("stat-absent");
const statPdfs = document.getElementById("stat-pdfs");

const calMonthLabel = document.getElementById("cal-month-label");
const calendarGrid = document.getElementById("calendar-grid");
const dayDetailBox = document.getElementById("day-detail-box");
const prevMonthBtn = document.getElementById("prev-month-btn");
const nextMonthBtn = document.getElementById("next-month-btn");
const syncBtn = document.getElementById("sync-btn");

const pdfSearch = document.getElementById("pdf-search");
const pdfSubjectFilter = document.getElementById("pdf-subject-filter");
const pdfGrid = document.getElementById("pdf-grid");

// Tab switch
document.querySelectorAll(".tab-btn").forEach((btn) => {
  btn.addEventListener("click", () => {
    document.querySelectorAll(".tab-btn").forEach((b) => b.classList.remove("is-active"));
    document.querySelectorAll(".panel-card").forEach((p) => p.classList.remove("is-active"));
    btn.classList.add("is-active");
    document.getElementById(`tab-${btn.dataset.tab}`).classList.add("is-active");
  });
});

logoutBtn.addEventListener("click", async () => {
  await signOut(auth);
  window.location.href = "index.html";
});

function formatYMD(year, monthIndex, day) {
  const m = String(monthIndex + 1).padStart(2, "0");
  const d = String(day).padStart(2, "0");
  return `${year}-${m}-${d}`;
}

function updateStats() {
  const total = attendanceList.length;
  const presentCount = attendanceList.filter((r) => r.status === "Present").length;
  const absentCount = attendanceList.filter((r) => r.status === "Absent").length;
  const pct = total ? Math.round((presentCount / total) * 100) : 0;

  statPct.textContent = `${pct}%`;
  statDays.textContent = `${presentCount} / ${total} days`;
  statPresent.textContent = String(presentCount);
  statAbsent.textContent = String(absentCount);
  statPdfs.textContent = String(pdfNotesList.length);
}

function renderCalendar() {
  const year = viewDate.getFullYear();
  const month = viewDate.getMonth();

  calMonthLabel.textContent = viewDate.toLocaleDateString("en-US", {
    month: "long",
    year: "numeric"
  });

  const recordsByDate = {};
  for (const rec of attendanceList) {
    if (!rec.date) continue;
    if (!recordsByDate[rec.date]) recordsByDate[rec.date] = [];
    recordsByDate[rec.date].push(rec);
  }

  const firstDayIndex = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const cells = [];

  for (let i = 0; i < firstDayIndex; i++) {
    cells.push(`<div class="cal-cell is-muted" aria-hidden="true"></div>`);
  }

  for (let day = 1; day <= daysInMonth; day++) {
    const ymd = formatYMD(year, month, day);
    const dayRecs = recordsByDate[ymd] || [];

    let cellClass = "cal-cell";
    let badgeHtml = "";

    if (dayRecs.length > 0) {
      const hasAbsent = dayRecs.some((r) => r.status === "Absent");
      const statusLabel = hasAbsent ? "Absent" : "Present";
      cellClass += hasAbsent ? " is-absent" : " is-present";
      badgeHtml = `<span class="cal-status-pill ${hasAbsent ? "pill-absent" : "pill-present"}">${statusLabel}</span>`;
    }

    cells.push(`
      <button type="button" class="${cellClass}" data-date="${ymd}">
        <span class="cal-day-num">${day}</span>
        ${badgeHtml}
      </button>
    `);
  }

  calendarGrid.innerHTML = cells.join("");

  calendarGrid.querySelectorAll("button[data-date]").forEach((btn) => {
    btn.addEventListener("click", () => {
      const ymd = btn.dataset.date;
      const list = recordsByDate[ymd] || [];
      if (!list.length) {
        dayDetailBox.innerHTML = `<strong>${ymd}:</strong> No attendance entry found for this date.`;
        return;
      }
      dayDetailBox.innerHTML =
        `<strong>${ymd}:</strong> ` +
        list
          .map(
            (item) =>
              `<span style="font-weight:700;color:${
                item.status === "Present" ? "#1d4ed8" : "#b91c1c"
              }">${item.status}</span> (${item.subject} • Marked by ${item.markedBy})`
          )
          .join(" | ");
    });
  });
}

function populatePdfSubjects() {
  const subjects = [...new Set(pdfNotesList.map((n) => n.subject).filter(Boolean))];
  pdfSubjectFilter.innerHTML =
    `<option value="ALL">All Subjects</option>` +
    subjects.map((s) => `<option value="${s}">${s}</option>`).join("");
}

function renderPdfNotes() {
  const qText = pdfSearch.value.trim().toLowerCase();
  const subj = pdfSubjectFilter.value;

  const filtered = pdfNotesList.filter((n) => {
    const matchSubj = subj === "ALL" || n.subject === subj;
    const text = `${n.title} ${n.fileName} ${n.description} ${n.subject}`.toLowerCase();
    return matchSubj && (!qText || text.includes(qText));
  });

  if (!filtered.length) {
    pdfGrid.innerHTML = `<p class="empty-msg">No PDF notes found in Drive.</p>`;
    return;
  }

  pdfGrid.innerHTML = filtered
    .map(
      (pdf) => `
      <article class="pdf-card">
        <div>
          <span class="pdf-badge">PDF • ${pdf.subject}</span>
          <h3>${pdf.title}</h3>
          <p>${pdf.description}</p>
          <div class="pdf-meta">${pdf.fileName} • ${pdf.sizeKB} KB • ${pdf.updatedAt}</div>
        </div>
        <div class="pdf-actions">
          <a href="${pdf.previewUrl}" target="_blank" rel="noopener">Open PDF ↗</a>
          <a href="${pdf.downloadUrl}" target="_blank" rel="noopener">Download ↓</a>
        </div>
      </article>
    `
    )
    .join("");
}

async function syncAttendanceAndPdfs() {
  if (!studentProfile) return;

  if (!APPS_SCRIPT_URL || APPS_SCRIPT_URL.startsWith("PASTE_")) {
    calendarGrid.innerHTML = `<p class="empty-msg" style="grid-column:1/-1">Set APPS_SCRIPT_URL in dashboard.js first.</p>`;
    pdfGrid.innerHTML = `<p class="empty-msg">Set APPS_SCRIPT_URL in dashboard.js first.</p>`;
    return;
  }

  syncBtn.disabled = true;
  syncBtn.textContent = "Syncing...";

  try {
    const params = new URLSearchParams({
      username: studentProfile.username || "",
      email: studentProfile.email || ""
    });
    const res = await fetch(`${APPS_SCRIPT_URL}?${params.toString()}`);
    const data = await res.json();

    if (data.ok) {
      attendanceList = Array.isArray(data.attendance) ? data.attendance : [];
      pdfNotesList = Array.isArray(data.notes) ? data.notes : [];

      if (attendanceList.length > 0 && attendanceList[0].date) {
        const [y, m] = attendanceList[0].date.split("-").map(Number);
        if (y && m) viewDate = new Date(y, m - 1, 1);
      }

      updateStats();
      renderCalendar();
      populatePdfSubjects();
      renderPdfNotes();
    }
  } catch (err) {
    dayDetailBox.textContent = `Sync error: ${err.message}`;
  } finally {
    syncBtn.disabled = false;
    syncBtn.textContent = "↻ Sync";
  }
}

prevMonthBtn.addEventListener("click", () => {
  viewDate = new Date(viewDate.getFullYear(), viewDate.getMonth() - 1, 1);
  renderCalendar();
});

nextMonthBtn.addEventListener("click", () => {
  viewDate = new Date(viewDate.getFullYear(), viewDate.getMonth() + 1, 1);
  renderCalendar();
});

syncBtn.addEventListener("click", syncAttendanceAndPdfs);
pdfSearch.addEventListener("input", renderPdfNotes);
pdfSubjectFilter.addEventListener("change", renderPdfNotes);

onAuthStateChanged(auth, async (user) => {
  if (!user) {
    window.location.href = "index.html";
    return;
  }

  studentProfile = {
    fullName: user.displayName || "Student",
    username: "",
    email: user.email || "",
    profileImage: "https://api.dicebear.com/9.x/initials/svg?seed=SVGP"
  };

  try {
    const snap = await getDoc(doc(db, "users", user.uid));
    if (snap.exists()) {
      studentProfile = { ...studentProfile, ...snap.data() };
    }
  } catch (_) {}

  stuName.textContent = studentProfile.fullName;
  stuId.textContent = `ID: ${studentProfile.username || studentProfile.email}`;
  stuAvatar.src = studentProfile.profileImage;

  await syncAttendanceAndPdfs();
});