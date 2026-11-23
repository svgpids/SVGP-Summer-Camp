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

// Paste your deployed Google Apps Script Web App URL here
const APPS_SCRIPT_URL = "PASTE_YOUR_APPS_SCRIPT_WEB_APP_URL_HERE";
const SESSION_EXPIRY_KEY = "svgp_session_expires_at";
const BACK_AFTER_LOGOUT_KEY = "svgp_back_after_logout";

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

let student = null;
let allRecords = [];

const filterDateEl = document.getElementById("filter-date");
const filterStatusEl = document.getElementById("filter-status");
const clearFiltersBtn = document.getElementById("clear-filters-btn");
const containerEl = document.getElementById("datewise-container");

function updateStats() {
  const working = allRecords.filter((r) => r.status !== "Holiday");
  const present = working.filter((r) => r.status === "Present").length;
  const absent = working.filter((r) => r.status === "Absent").length;
  const pct = working.length ? Math.round((present / working.length) * 100) : 0;
  const uniqueDates = new Set(allRecords.map((r) => r.date).filter(Boolean));

  document.getElementById("dw-pct").textContent = `${pct}%`;
  document.getElementById("dw-ratio").textContent = `${present} / ${working.length} sessions`;
  document.getElementById("dw-dates-count").textContent = String(uniqueDates.size);
  document.getElementById("dw-present").textContent = String(present);
  document.getElementById("dw-absent").textContent = String(absent);
}

function renderDateWise() {
  const pickedDate = filterDateEl.value;
  const pickedStatus = filterStatusEl.value;

  const filtered = allRecords.filter((r) => {
    const okDate = !pickedDate || r.date === pickedDate;
    const okStatus = pickedStatus === "ALL" || r.status === pickedStatus;
    return okDate && okStatus;
  });

  if (!filtered.length) {
    containerEl.innerHTML = `<p class="empty-text">No student attendance records found for the selected filter.</p>`;
    return;
  }

  // Group records date-wise
  const grouped = new Map();
  for (const rec of filtered) {
    const dKey = rec.date || "Unknown Date";
    if (!grouped.has(dKey)) grouped.set(dKey, []);
    grouped.get(dKey).push(rec);
  }

  const sortedDates = [...grouped.keys()].sort((a, b) => b.localeCompare(a));

  containerEl.innerHTML = sortedDates
    .map((dateStr) => {
      const items = grouped.get(dateStr);
      const pCount = items.filter((i) => i.status === "Present").length;
      const aCount = items.filter((i) => i.status === "Absent").length;

      const rowsHtml = items
        .map(
          (i) => `
          <div class="session-row">
            <div class="session-sub">
              <strong>${i.subject}</strong>
              <small>Student: ${student.fullName} • Marked by: ${i.markedBy}</small>
            </div>
            <span class="${i.status === "Present" ? "pill-p" : "pill-a"}">${i.status}</span>
          </div>`
        )
        .join("");

      return `
        <article class="date-block">
          <div class="date-block-head">
            <span class="date-title">📅 ${dateStr}</span>
            <div class="date-summary-pills">
              <span class="pill-p">Present: ${pCount}</span>
              <span class="pill-a">Absent: ${aCount}</span>
            </div>
          </div>
          <div class="session-rows">${rowsHtml}</div>
        </article>
      `;
    })
    .join("");
}

async function loadDateWiseAttendance() {
  if (!student) return;

  if (!APPS_SCRIPT_URL || APPS_SCRIPT_URL.startsWith("PASTE_")) {
    allRecords = [
      { date: "2026-11-21", subject: "Web Programming", status: "Present", markedBy: "Faculty" },
      { date: "2026-11-21", subject: "Python Lab", status: "Present", markedBy: "Faculty" },
      { date: "2026-11-22", subject: "DBMS Basics", status: "Absent", markedBy: "Faculty" }
    ];
    updateStats();
    renderDateWise();
    return;
  }

  const syncBtn = document.getElementById("dw-sync-btn");
  syncBtn.disabled = true;
  syncBtn.textContent = "Syncing...";

  try {
    const qs = new URLSearchParams({
      username: student.username || "",
      email: student.email || ""
    });
    const res = await fetch(`${APPS_SCRIPT_URL}?${qs.toString()}`);
    const data = await res.json();

    if (data.ok) {
      allRecords = Array.isArray(data.attendance) ? data.attendance : [];
      updateStats();
      renderDateWise();
    }
  } catch (err) {
    containerEl.innerHTML = `<p class="empty-text">Error loading attendance: ${err.message}</p>`;
  } finally {
    syncBtn.disabled = false;
    syncBtn.textContent = "↻ Sync";
  }
}

filterDateEl.addEventListener("change", renderDateWise);
filterStatusEl.addEventListener("change", renderDateWise);
clearFiltersBtn.addEventListener("click", () => {
  filterDateEl.value = "";
  filterStatusEl.value = "ALL";
  renderDateWise();
});

document.getElementById("dw-sync-btn").addEventListener("click", loadDateWiseAttendance);

document.getElementById("dw-logout-btn").addEventListener("click", async () => {
  sessionStorage.setItem(BACK_AFTER_LOGOUT_KEY, "1");
  localStorage.removeItem(SESSION_EXPIRY_KEY);
  await signOut(auth);
  window.location.href = "index.html";
});

onAuthStateChanged(auth, async (user) => {
  if (!user) {
    window.location.href = "index.html";
    return;
  }

  const fallbackName = user.displayName || "Student";
  student = {
    fullName: fallbackName,
    username: "",
    email: user.email || "",
    profileImage: `https://api.dicebear.com/9.x/initials/svg?seed=${encodeURIComponent(fallbackName)}`
  };

  try {
    const snap = await getDoc(doc(db, "users", user.uid));
    if (snap.exists()) student = { ...student, ...snap.data() };
  } catch (_) {}

  document.getElementById("dw-name").textContent = student.fullName;
  document.getElementById("dw-id").textContent = `ID: ${student.username || student.email}`;
  document.getElementById("dw-avatar").src = student.profileImage;

  await loadDateWiseAttendance();
});