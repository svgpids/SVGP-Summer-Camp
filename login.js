import { initializeApp } from "https://www.gstatic.com/firebasejs/11.6.0/firebase-app.js";
import {
  getAuth,
  signInWithEmailAndPassword,
  sendPasswordResetEmail,
  signOut,
  onAuthStateChanged
} from "https://www.gstatic.com/firebasejs/11.6.0/firebase-auth.js";
import {
  getFirestore,
  collection,
  query,
  where,
  getDocs,
  doc,
  getDoc,
  updateDoc
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

const SPLASH_KEY = "svgp_vibrant_splash_v1";

const splashLoader = document.getElementById("splash-loader");
const splashFill = document.getElementById("splash-fill");
const splashPct = document.getElementById("splash-pct");

const loginCard = document.getElementById("login-card");
const welcomeCard = document.getElementById("welcome-card");

const loginForm = document.getElementById("login-form");
const identifierEl = document.getElementById("login-identifier");
const passwordEl = document.getElementById("login-password");
const loginMsgEl = document.getElementById("login-msg");

const forgotPanel = document.getElementById("forgot-panel");
const openForgotBtn = document.getElementById("open-forgot-btn");
const backToLoginBtn = document.getElementById("back-to-login-btn");
const resetMobileEl = document.getElementById("reset-mobile");
const resetEmailEl = document.getElementById("reset-email");
const sendResetBtn = document.getElementById("send-reset-btn");
const resetMsgEl = document.getElementById("reset-msg");

const welcomeAvatar = document.getElementById("welcome-avatar");
const welcomeTitle = document.getElementById("welcome-title");
const detailUsername = document.getElementById("detail-username");
const detailMobile = document.getElementById("detail-mobile");
const detailEmail = document.getElementById("detail-email");
const logoutBtn = document.getElementById("logout-btn");

let splashInterval = null;
let splashGuard = null;
let autoDashTimer = null;

function hideSplash(instant = false) {
  clearInterval(splashInterval);
  clearTimeout(splashGuard);
  try { sessionStorage.setItem(SPLASH_KEY, "1"); } catch (_) {}

  if (splashFill) splashFill.style.width = "100%";
  if (splashPct) splashPct.textContent = "100%";
  if (!splashLoader) return;
  if (instant) splashLoader.style.transition = "none";
  splashLoader.classList.add("is-done");
}

function startSplash() {
  if (!splashLoader) return;
  let seen = false;
  try { seen = sessionStorage.getItem(SPLASH_KEY) === "1"; } catch (_) {}

  if (seen) {
    hideSplash(true);
    return;
  }

  let pct = 0;
  splashInterval = setInterval(() => {
    pct = Math.min(100, pct + 8);
    if (splashFill) splashFill.style.width = `${pct}%`;
    if (splashPct) splashPct.textContent = `${pct}%`;
    if (pct >= 100) hideSplash(false);
  }, 90);

  splashGuard = setTimeout(() => hideSplash(false), 2600);
}

window.addEventListener("DOMContentLoaded", startSplash);
window.addEventListener("pageshow", (e) => {
  if (e.persisted) hideSplash(true);
});

function setMsg(el, text, isError = true) {
  if (!el) return;
  el.textContent = text;
  el.className = `msg ${isError ? "error" : "success"}`;
}

document.querySelectorAll(".eye-toggle").forEach((btn) => {
  btn.addEventListener("click", () => {
    const input = document.getElementById(btn.dataset.target);
    if (!input) return;
    const show = input.type === "password";
    input.type = show ? "text" : "password";
    btn.textContent = show ? "🙈" : "👁";
  });
});

async function findUserByIdentifier(rawVal) {
  const val = rawVal.trim();
  const lower = val.toLowerCase();

  let q = query(collection(db, "users"), where("username", "==", lower));
  let snap = await getDocs(q);

  if (snap.empty) {
    q = query(collection(db, "users"), where("mobile", "==", val));
    snap = await getDocs(q);
  }

  if (snap.empty) return null;
  return { id: snap.docs[0].id, ...snap.docs[0].data() };
}

loginForm.addEventListener("submit", async (e) => {
  e.preventDefault();
  setMsg(loginMsgEl, "");

  const identifier = identifierEl.value.trim();
  const password = passwordEl.value;

  if (!identifier || !password) {
    setMsg(loginMsgEl, "Please enter User ID / Mobile No and Password.");
    return;
  }

  try {
    const profile = await findUserByIdentifier(identifier);
    if (!profile || !profile.email) {
      setMsg(loginMsgEl, "No account found with this User ID or Mobile No.");
      return;
    }
    await signInWithEmailAndPassword(auth, profile.email, password);
  } catch (err) {
    setMsg(loginMsgEl, err.message);
  }
});

openForgotBtn.addEventListener("click", () => {
  loginForm.style.display = "none";
  forgotPanel.style.display = "block";
  resetMobileEl.value = "";
  resetEmailEl.value = "";
  setMsg(resetMsgEl, "");
});

backToLoginBtn.addEventListener("click", () => {
  forgotPanel.style.display = "none";
  loginForm.style.display = "block";
  setMsg(loginMsgEl, "");
});

forgotPanel.addEventListener("submit", async (e) => {
  e.preventDefault();
  setMsg(resetMsgEl, "");

  const mobile = resetMobileEl.value.trim();
  const email = resetEmailEl.value.trim().toLowerCase();

  if (!mobile || !email) {
    setMsg(resetMsgEl, "Please enter both Mobile No and Gmail ID.");
    return;
  }

  sendResetBtn.disabled = true;
  sendResetBtn.textContent = "Checking...";

  try {
    const q = query(
      collection(db, "users"),
      where("email", "==", email),
      where("mobile", "==", mobile)
    );
    const snap = await getDocs(q);

    if (snap.empty) {
      setMsg(resetMsgEl, "Mobile number and Gmail ID do not match any account.");
      return;
    }

    await sendPasswordResetEmail(auth, email);
    await updateDoc(doc(db, "users", snap.docs[0].id), {
      lastResetLinkSentAt: new Date().toISOString()
    });

    setMsg(
      resetMsgEl,
      `Password reset link sent to ${email}. Check Inbox/Spam.`,
      false
    );
  } catch (err) {
    setMsg(resetMsgEl, err.message);
  } finally {
    sendResetBtn.disabled = false;
    sendResetBtn.textContent = "Verify & Send Reset Link";
  }
});

logoutBtn.addEventListener("click", async () => {
  clearTimeout(autoDashTimer);
  await signOut(auth);
});

// Auto-login & Welcome Card -> Dashboard
onAuthStateChanged(auth, async (user) => {
  clearTimeout(autoDashTimer);

  if (user) {
    const fallbackName = user.displayName || "Student";
    let profile = {
      fullName: fallbackName,
      username: "-",
      mobile: "-",
      email: user.email || "",
      profileImage: `https://api.dicebear.com/9.x/initials/svg?seed=${encodeURIComponent(fallbackName)}`
    };

    try {
      const snap = await getDoc(doc(db, "users", user.uid));
      if (snap.exists()) {
        profile = { ...profile, ...snap.data() };
      }
    } catch (_) {}

    welcomeAvatar.src = profile.profileImage;
    welcomeTitle.textContent = `Welcome, ${profile.fullName}!`;
    detailUsername.textContent = profile.username;
    detailMobile.textContent = profile.mobile;
    detailEmail.textContent = profile.email;

    loginCard.style.display = "none";
    welcomeCard.style.display = "block";
    hideSplash(false);

    // Automatically open Dashboard after showing Welcome card
    autoDashTimer = setTimeout(() => {
      window.location.href = "dashboard.html";
    }, 1800);
  } else {
    welcomeCard.style.display = "none";
    loginCard.style.display = "block";
  }
});