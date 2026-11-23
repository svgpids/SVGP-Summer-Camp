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
  query,
  where,
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

// Paste your deployed Google Apps Script Web App URL here
const APPS_SCRIPT_URL = "https://script.google.com/macros/s/AKfycbwBV4x-Dr_mnjX2CAUK8a6nKYvJR3DF-F0YYz8EtkoL5NQCVAHEvnQ2I110XkRrEwty/exec";

const primaryApp = initializeApp(firebaseConfig);
const db = getFirestore(primaryApp);

// Secondary app so admin session is not interrupted when creating student accounts
const workerApp = initializeApp(firebaseConfig, "StudentRegWorker");
const workerAuth = getAuth(workerApp);

const regForm = document.getElementById("reg-form");
const regAutoDate = document.getElementById("reg-auto-date");
const regBtn = document.getElementById("reg-btn");
const regMsg = document.getElementById("reg-msg");

const attDatePicker = document.getElementById("att-date-picker");
const loadStudentsBtn = document.getElementById("load-students-btn");
const markAllPresentBtn = document.getElementById("mark-all-present-btn");
const saveAttBtn = document.getElementById("save-att-btn");
const attListBody = document.getElementById("att-list-body");
const attMsg = document.getElementById("att-msg");

let currentDateStudents = [];

// Get today's local date in YYYY-MM-DD format automatically
function getTodayYMD() {
  const now = new Date();
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, "0");
  const d = String(now.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

function setStatus(el, text, isErr = false) {
  el.textContent = text;
  el.className = `msg ${isErr ? "err" : "ok"}`;
}

// Initialize Automatic Registration Date & Date Picker on Page Load
const todayYMD = getTodayYMD();
regAutoDate.value = todayYMD;
attDatePicker.value = todayYMD;
document.getElementById("today-badge").textContent = `Today: ${todayYMD}`;

// ==================== 1. REGISTER STUDENT (FIREBASE + GOOGLE SHEET) ====================
regForm.addEventListener("submit", async (e) => {
  e.preventDefault();
  setStatus(regMsg, "");

  const fullName = document.getElementById("reg-fullname").value.trim();
  const username = document.getElementById("reg-username").value.trim();
  const mobile = document.getElementById("reg-mobile").value.trim();
  const email = document.getElementById("reg-email").value.trim().toLowerCase();
  const subject = document.getElementById("reg-subject").value;
  const password = document.getElementById("reg-password").value;
  const registeredDate = getTodayYMD(); // Automatic current date

  if (!fullName || !username || !mobile || !email || !password) {
    setStatus(regMsg, "Please fill all required details.", true);
    return;
  }

  regBtn.disabled = true;
  regBtn.textContent = "Saving to Firebase & Sheet...";

  try {
    // 1. Create Firebase Auth User
    const cred = await createUserWithEmailAndPassword(workerAuth, email, password);
    await updateProfile(cred.user, { displayName: fullName });

    // 2. Save Full Details + Automatic Date in Firestore ("users")
    await setDoc(doc(db, "users", cred.user.uid), {
      uid: cred.user.uid,
      username,
      fullName,
      mobile,
      email,
      subject,
      registeredDate,
      role: "student",
      totalSessions: 0,
      presentCount: 0,
      absentCount: 0,
      attendancePercent: 0,
      createdAt: new Date().toISOString()
    });

    await signOut(workerAuth);

    // 3. Automatically Add Student + Date into Google Sheet ("Students" & "Attendance" tabs)
    if (APPS_SCRIPT_URL && !APPS_SCRIPT_URL.startsWith("PASTE_")) {
      const res = await fetch(APPS_SCRIPT_URL, {
        method: "POST",
        headers: { "Content-Type": "text/plain;charset=utf-8" },
        body: JSON.stringify({
          action: "registerStudent",
          username,
          fullName,
          mobile,
          email,
          subject,
          registeredDate
        })
      });
      const result = await res.json();
      if (!result.ok) throw new Error(result.error || "Google Sheet sync failed");
    }

    setStatus(regMsg, `${fullName} registered on ${registeredDate} in Firebase & Google Sheet!`);
    regForm.reset();
    regAutoDate.value = getTodayYMD();

    // If selected attendance date matches registration date, refresh student list immediately
    if (attDatePicker.value === registeredDate) {
      await fetchStudentsByDate(registeredDate);
    }
  } catch (err) {
    setStatus(regMsg, err.message, true);
  } finally {
    regBtn.disabled = false;
    regBtn.textContent = "Register Student (Firebase + Google Sheet)";
  }
});

// ==================== 2. FETCH STUDENTS BY SELECTED DATE ====================
async function fetchStudentsByDate(selectedDate) {
  if (!selectedDate) return;
  setStatus(attMsg, "");
  attListBody.innerHTML = `<tr><td colspan="5" class="empty">Loading students registered on ${selectedDate}...</td></tr>`;

  try {
    // Fetch from Firebase Firestore matching registeredDate
    const q = query(collection(db, "users"), where("registeredDate", "==", selectedDate));
    const snap = await getDocs(q);

    const studentsMap = new Map();
    snap.forEach((d) => {
      const s = d.data();
      studentsMap.set((s.username || d.id).toLowerCase(), {
        uid: d.id,
        username: s.username || d.id,
        fullName: s.fullName || "",
        subject: s.subject || "DCA",
        registeredDate: s.registeredDate || selectedDate,
        status: "Present"
      });
    });

    // Also merge/sync existing status from Google Sheet if configured
    if (APPS_SCRIPT_URL && !APPS_SCRIPT_URL.startsWith("PASTE_")) {
      const res = await fetch(`${APPS_SCRIPT_URL}?action=studentsByDate&date=${encodeURIComponent(selectedDate)}`);
      const data = await res.json();
      if (data.ok && Array.isArray(data.students)) {
        data.students.forEach((st) => {
          const key = st.username.toLowerCase();
          if (studentsMap.has(key)) {
            studentsMap.get(key).status = st.status || "Present";
          } else {
            studentsMap.set(key, {
              uid: "",
              username: st.username,
              fullName: st.fullName,
              subject: st.subject,
              registeredDate: st.registeredDate,
              status: st.status || "Present"
            });
          }
        });
      }
    }

    currentDateStudents = Array.from(studentsMap.values());
    renderStudentAttendanceRows();
  } catch (err) {
    attListBody.innerHTML = `<tr><td colspan="5" class="empty">Error: ${err.message}</td></tr>`;
  }
}

function renderStudentAttendanceRows() {
  if (!currentDateStudents.length) {
    attListBody.innerHTML = `<tr><td colspan="5" class="empty">No students registered on ${attDatePicker.value}.</td></tr>`;
    return;
  }

  attListBody.innerHTML = currentDateStudents
    .map((s, idx) => {
      const isPresent = s.status === "Present";
      return `
        <tr>
          <td><strong>${s.username}</strong></td>
          <td>${s.fullName}</td>
          <td><span class="pill-subj">${s.subject}</span></td>
          <td>${s.registeredDate}</td>
          <td>
            <select class="att-select ${isPresent ? "present" : "absent"}" data-idx="${idx}">
              <option value="Present" ${isPresent ? "selected" : ""}>Present</option>
              <option value="Absent" ${!isPresent ? "selected" : ""}>Absent</option>
            </select>
          </td>
        </tr>
      `;
    })
    .join("");

  attListBody.querySelectorAll(".att-select").forEach((sel) => {
    sel.addEventListener("change", () => {
      const i = Number(sel.dataset.idx);
      currentDateStudents[i].status = sel.value;
      sel.className = `att-select ${sel.value === "Present" ? "present" : "absent"}`;
    });
  });
}

attDatePicker.addEventListener("change", () => fetchStudentsByDate(attDatePicker.value));
loadStudentsBtn.addEventListener("click", () => fetchStudentsByDate(attDatePicker.value));

markAllPresentBtn.addEventListener("click", () => {
  currentDateStudents.forEach((s) => (s.status = "Present"));
  renderStudentAttendanceRows();
});

// ==================== 3. SAVE ATTENDANCE TO SHEET & FIREBASE ====================
saveAttBtn.addEventListener("click", async () => {
  const selectedDate = attDatePicker.value;
  if (!selectedDate || !currentDateStudents.length) {
    setStatus(attMsg, "No students loaded for this date.", true);
    return;
  }

  saveAttBtn.disabled = true;
  saveAttBtn.textContent = "Updating Sheet & Firebase...";

  try {
    // 1. Update Google Sheet (Matrix + AttendanceLog + Auto %)
    if (APPS_SCRIPT_URL && !APPS_SCRIPT_URL.startsWith("PASTE_")) {
      const res = await fetch(APPS_SCRIPT_URL, {
        method: "POST",
        headers: { "Content-Type": "text/plain;charset=utf-8" },
        body: JSON.stringify({
          action: "markAttendance",
          date: selectedDate,
          records: currentDateStudents
        })
      });
      const result = await res.json();
      if (!result.ok) throw new Error(result.error || "Sheet update failed");
    }

    // 2. Save/Update Attendance Record & Student Summary in Firebase Firestore
    for (const s of currentDateStudents) {
      const attDocId = `${selectedDate}_${s.username}`;
      await setDoc(doc(db, "attendance", attDocId), {
        date: selectedDate,
        username: s.username,
        fullName: s.fullName,
        subject: s.subject,
        status: s.status,
        updatedAt: new Date().toISOString()
      });

      // Recalculate & update student's attendance counts in Firebase "users"
      const stuAttSnap = await getDocs(
        query(collection(db, "attendance"), where("username", "==", s.username))
      );
      let total = 0;
      let present = 0;
      stuAttSnap.forEach((d) => {
        const st = d.data().status;
        if (st === "Present" || st === "Absent") {
          total++;
          if (st === "Present") present++;
        }
      });
      const absent = total - present;
      const pct = total ? Number(((present / total) * 100).toFixed(1)) : 0;

      if (s.uid) {
        await setDoc(
          doc(db, "users", s.uid),
          {
            totalSessions: total,
            presentCount: present,
            absentCount: absent,
            attendancePercent: pct,
            lastAttendanceDate: selectedDate,
            lastAttendanceStatus: s.status
          },
          { merge: true }
        );
      }
    }

    setStatus(
      attMsg,
      `Updated attendance for ${currentDateStudents.length} student(s) on ${selectedDate} in Google Sheet & Firebase!`
    );
  } catch (err) {
    setStatus(attMsg, `Save failed: ${err.message}`, true);
  } finally {
    saveAttBtn.disabled = false;
    saveAttBtn.textContent = "Save Attendance to Sheet & Firebase";
  }
});

// Load today's registered students automatically on open
fetchStudentsByDate(todayYMD);