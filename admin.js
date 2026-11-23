import { initializeApp } from "https://www.gstatic.com/firebasejs/11.6.0/firebase-app.js";
import {
  getAuth,
  createUserWithEmailAndPassword,
  updateProfile,
  signOut
} from "https://www.gstatic.com/firebasejs/11.6.0/firebase-auth.js";
import {
  getFirestore,
  collection,
  getDocs,
  doc,
  setDoc
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

const workerApp = initializeApp(firebaseConfig, "AdminWorkerApp");
const workerAuth = getAuth(workerApp);

let allStudents = [];

function setStatus(el, text, isErr = false) {
  el.textContent = text;
  el.className = `msg ${isErr ? "err" : "ok"}`;
}

document.getElementById("admin-logout-btn").addEventListener("click", async () => {
  await signOut(auth);
  window.location.href = "index.html";
});

function renderStudents() {
  const q = document.getElementById("stu-filter").value.trim().toLowerCase();
  const tbody = document.getElementById("stu-tbody");
  document.getElementById("stu-count").textContent = String(allStudents.length);

  const filtered = allStudents.filter(
    (s) => !q || `${s.username} ${s.fullName} ${s.mobile} ${s.email} ${s.subject}`.toLowerCase().includes(q)
  );

  if (!filtered.length) {
    tbody.innerHTML = `<tr><td colspan="5" class="empty">No students found.</td></tr>`;
    return;
  }

  tbody.innerHTML = filtered
    .map(
      (s) => `
      <tr>
        <td><strong>${s.username || "-"}</strong></td>
        <td>${s.fullName || "-"}</td>
        <td><span class="pill">${s.subject || "DCA"}</span></td>
        <td>${s.mobile || "-"}</td>
        <td>${s.email || "-"}</td>
      </tr>`
    )
    .join("");
}

async function loadStudentsList() {
  try {
    const snap = await getDocs(collection(db, "users"));
    allStudents = [];
    snap.forEach((d) => {
      const data = d.data();
      if (data.role !== "admin") {
        allStudents.push(data);
      }
    });
    renderStudents();
  } catch (err) {
    console.error(err);
  }
}

document.getElementById("reg-form").addEventListener("submit", async (e) => {
  e.preventDefault();
  const msgEl = document.getElementById("reg-msg");
  const btn = document.getElementById("reg-btn");
  setStatus(msgEl, "");

  const fullName = document.getElementById("reg-name").value.trim();
  const username = document.getElementById("reg-user").value.trim().toLowerCase();
  const mobile = document.getElementById("reg-mobile").value.trim();
  const email = document.getElementById("reg-email").value.trim().toLowerCase();
  const subject = document.getElementById("reg-subject").value;
  const password = document.getElementById("reg-pass").value;

  if (!fullName || !username || !mobile || !email || password.length < 6) {
    setStatus(msgEl, "Fill all required fields (password min 6 chars).", true);
    return;
  }

  btn.disabled = true;
  try {
    const cred = await createUserWithEmailAndPassword(workerAuth, email, password);
    await updateProfile(cred.user, { displayName: fullName });
    await setDoc(doc(db, "users", cred.user.uid), {
      fullName,
      username,
      mobile,
      email,
      subject,
      role: "student",
      profileImage: `https://api.dicebear.com/9.x/initials/svg?seed=${encodeURIComponent(fullName)}`,
      createdAt: new Date().toISOString()
    });
    await signOut(workerAuth);

    setStatus(msgEl, `Registered ${fullName} (${username})!`);
    e.target.reset();
    await loadStudentsList();
  } catch (err) {
    setStatus(msgEl, err.message, true);
  } finally {
    btn.disabled = false;
  }
});

document.getElementById("note-form").addEventListener("submit", async (e) => {
  e.preventDefault();
  const msgEl = document.getElementById("note-msg");
  const btn = document.getElementById("note-btn");
  setStatus(msgEl, "");

  const subject = document.getElementById("note-sub").value;
  const title = document.getElementById("note-title").value.trim();
  const description = document.getElementById("note-desc").value.trim();
  const previewUrl = document.getElementById("note-url").value.trim();

  if (!title) {
    setStatus(msgEl, "Please enter Note Title.", true);
    return;
  }

  btn.disabled = true;
  try {
    const noteId = `note_${Date.now()}`;
    await setDoc(doc(db, "classNotes", noteId), {
      id: noteId,
      subject,
      title,
      description,
      previewUrl,
      downloadUrl: previewUrl,
      updatedAt: new Date().toISOString().slice(0, 10)
    });
    setStatus(msgEl, `Note "${title}" published for students!`);
    e.target.reset();
  } catch (err) {
    setStatus(msgEl, err.message, true);
  } finally {
    btn.disabled = false;
  }
});

document.getElementById("stu-filter").addEventListener("input", renderStudents);
loadStudentsList();