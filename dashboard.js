import { initializeApp } from "https://www.gstatic.com/firebasejs/11.6.0/firebase-app.js";
import { getAuth, signOut, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/11.6.0/firebase-auth.js";
import {
  getFirestore,
  collection,
  query,
  where,
  getDocs,
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

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

let attendanceRows = [];
let notesRows = [];

document.getElementById("logout-btn").addEventListener("click", async () => {
  await signOut(auth);
  window.location.href = "index.html";
});

function renderAttendance() {
  const filterVal = document.getElementById("status-filter").value;
  const tbody = document.getElementById("att-tbody");

  const presentTotal = attendanceRows.filter((r) => r.status === "Present").length;
  const absentTotal = attendanceRows.filter((r) => r.status === "Absent").length;
  const total = presentTotal + absentTotal;
  const pct = total ? Math.round((presentTotal / total) * 100) : 0;

  document.getElementById("stat-pct").textContent = `${pct}%`;
  document.getElementById("stat-ratio").textContent = `${presentTotal} / ${total} days present`;
  document.getElementById("stat-present").textContent = String(presentTotal);
  document.getElementById("stat-absent").textContent = String(absentTotal);

  const visible = attendanceRows.filter((r) => filterVal === "ALL" || r.status === filterVal);
  if (!visible.length) {
    tbody.innerHTML = `<tr><td colspan="3" class="empty">No attendance records found.</td></tr>`;
    return;
  }

  tbody.innerHTML = visible
    .map(
      (r) => `
      <tr>
        <td><strong>${r.date || "-"}</strong></td>
        <td>${r.subject || "General"}</td>
        <td><span class="${r.status === "Present" ? "badge-p" : "badge-a"}">${r.status}</span></td>
      </tr>`
    )
    .join("");
}

function renderNotes() {
  const q = document.getElementById("note-search").value.trim().toLowerCase();
  const container = document.getElementById("notes-list");
  document.getElementById("stat-notes").textContent = String(notesRows.length);

  const visible = notesRows.filter(
    (n) => !q || `${n.title} ${n.subject} ${n.description}`.toLowerCase().includes(q)
  );

  if (!visible.length) {
    container.innerHTML = `<p class="empty">No class notes available.</p>`;
    return;
  }

  container.innerHTML = visible
    .map(
      (n) => `
      <div class="note-item">
        <div>
          <span class="subj-pill">${n.subject || "Notes"}</span>
          <h4>${n.title || "Untitled Note"}</h4>
          <small>${n.description || n.updatedAt || ""}</small>
        </div>
        ${
          n.previewUrl || n.downloadUrl
            ? `<a href="${n.previewUrl || n.downloadUrl}" target="_blank" rel="noopener" class="note-link">Open PDF ↗</a>`
            : ""
        }
      </div>`
    )
    .join("");
}

async function loadStudentData(profile) {
  attendanceRows = [];
  notesRows = [];

  try {
    const uname = String(profile.username || "").toLowerCase();
    if (uname) {
      const attSnap = await getDocs(query(collection(db, "attendance"), where("username", "==", uname)));
      attSnap.forEach((d) => attendanceRows.push(d.data()));
      attendanceRows.sort((a, b) => String(b.date || "").localeCompare(String(a.date || "")));
    }

    const notesSnap = await getDocs(collection(db, "classNotes"));
    notesSnap.forEach((d) => notesRows.push(d.data()));
  } catch (err) {
    console.error("Error loading student data:", err);
  }

  renderAttendance();
  renderNotes();
}

document.getElementById("status-filter").addEventListener("change", renderAttendance);
document.getElementById("note-search").addEventListener("input", renderNotes);

onAuthStateChanged(auth, async (user) => {
  if (!user) {
    window.location.href = "index.html";
    return;
  }

  let profile = {
    fullName: user.displayName || "Student",
    username: "",
    subject: "DCA",
    profileImage: `https://api.dicebear.com/9.x/initials/svg?seed=${encodeURIComponent(user.displayName || "SVGP")}`
  };

  try {
    const snap = await getDoc(doc(db, "users", user.uid));
    if (snap.exists()) profile = { ...profile, ...snap.data() };
  } catch (_) {}

  document.getElementById("stu-name").textContent = profile.fullName;
  document.getElementById("stu-meta").textContent =
    `User ID: ${profile.username || user.email} • Subject: ${profile.subject || "Camp"}`;
  document.getElementById("stu-avatar").src = profile.profileImage;

  document.getElementById("refresh-btn").addEventListener("click", () => loadStudentData(profile));
  await loadStudentData(profile);
});