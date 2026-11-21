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

// ==================== 5-SECOND ANIMATION + BACK LOCK ====================
const SPLASH_SHOWN_KEY = "svgp_5s_splash_shown";
const splashLoader = document.getElementById("splash-loader");
const waitBarFill = document.getElementById("wait-bar-fill");
const waitPercent = document.getElementById("wait-percent");

let progressTimer = null;
let splashDoneTimer = null;

function hideSplashAndLockBack() {
  clearInterval(progressTimer);
  clearTimeout(splashDoneTimer);
  sessionStorage.setItem(SPLASH_SHOWN_KEY, "1");
  if (!splashLoader) return;
  splashLoader.style.transition = "none";
  splashLoader.classList.add("is-hidden");
}

function runFiveSecondAnimation() {
  if (!splashLoader) return;

  if (sessionStorage.getItem(SPLASH_SHOWN_KEY) === "1") {
    hideSplashAndLockBack();
    return;
  }

  try {
    history.replaceState({ page: "login" }, "", window.location.href);
    history.pushState({ page: "login-locked" }, "", window.location.href);
  } catch (_) {}

  let pct = 0;
  progressTimer = setInterval(() => {
    pct = Math.min(100, pct + 2);
    if (waitBarFill) waitBarFill.style.width = `${pct}%`;
    if (waitPercent) waitPercent.textContent = `${pct}%`;
    if (pct >= 100) clearInterval(progressTimer);
  }, 100);

  splashDoneTimer = setTimeout(() => {
    hideSplashAndLockBack();
  }, 5000);
}

window.addEventListener("DOMContentLoaded", runFiveSecondAnimation);

window.addEventListener("pageshow", (event) => {
  if (event.persisted || sessionStorage.getItem(SPLASH_SHOWN_KEY) === "1") {
    hideSplashAndLockBack();
  }
});

// If user presses Back on Login, stay on Login and never go back to splash
window.addEventListener("popstate", () => {
  hideSplashAndLockBack();
  try {
    history.pushState({ page: "login-locked" }, "", window.location.href);
  } catch (_) {}
});

function getFriendlyAuthError(err) {
  const code = err?.code || "";
  switch (code) {
    case "auth/invalid-credential":
    case "auth/wrong-password":
    case "auth/user-not-found":
      return "Invalid User ID / Mobile No or Password.";
    case "auth/too-many-requests":
      return "Too many attempts. Please try again later.";
    case "auth/network-request-failed":
      return "Network error. Please check your internet connection.";
    default:
      return err?.message || "Something went wrong.";
  }
}

// ==================== ELEMENTS ====================
const loginCard = document.getElementById("login-card");
const welcomeCard = document.getElementById("welcome-card");

const loginForm = document.getElementById("login-form");
const identifierEl = document.getElementById("login-identifier");
const passwordEl = document.getElementById("login-password");
const loginBtn = document.getElementById("login-btn");
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
const detailName = document.getElementById("detail-name");
const detailUsername = document.getElementById("detail-username");
const detailMobile = document.getElementById("detail-mobile");
const detailEmail = document.getElementById("detail-email");
const logoutBtn = document.getElementById("logout-btn");

function setMsg(el, text, isError = true) {
  if (!text) {
    el.textContent = "";
    el.className = "status-text";
    return;
  }
  el.textContent = text;
  el.className = `status-text ${isError ? "error" : "success"}`;
}

document.querySelectorAll(".vis-btn").forEach((btn) => {
  btn.addEventListener("click", () => {
    const input = document.getElementById(btn.dataset.target);
    if (!input) return;
    const show = input.type === "password";
    input.type = show ? "text" : "password";
    btn.textContent = show ? "🙈" : "👁";
  });
});

async function findUserByIdentifier(rawIdentifier) {
  const val = rawIdentifier.trim();
  const lowerVal = val.toLowerCase();

  let q = query(collection(db, "users"), where("username", "==", lowerVal));
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

  loginBtn.disabled = true;
  loginBtn.textContent = "Logging in...";

  try {
    const userProfile = await findUserByIdentifier(identifier);
    if (!userProfile || !userProfile.email) {
      setMsg(loginMsgEl, "No account found with this User ID or Mobile No.");
      return;
    }

    await signInWithEmailAndPassword(auth, userProfile.email, password);
  } catch (err) {
    setMsg(loginMsgEl, getFriendlyAuthError(err));
  } finally {
    loginBtn.disabled = false;
    loginBtn.textContent = "Login";
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

// Forgot Password: Match Mobile No + Gmail ID -> Send Reset Link & Redirect to admin.html
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
  sendResetBtn.textContent = "Verifying...";

  try {
    const q = query(
      collection(db, "users"),
      where("email", "==", email),
      where("mobile", "==", mobile)
    );
    const snap = await getDocs(q);

    if (snap.empty) {
      setMsg(resetMsgEl, "Mobile number and Gmail ID do not match any registered account.");
      return;
    }

    const matchedDoc = snap.docs[0];
    const matchedData = matchedDoc.data();

    await sendPasswordResetEmail(auth, email);
    await updateDoc(doc(db, "users", matchedDoc.id), {
      lastResetLinkSentAt: new Date().toISOString()
    });

    sessionStorage.setItem(
      "svgp_admin_recovery",
      JSON.stringify({
        username: matchedData.username || "-",
        mobile: matchedData.mobile || mobile,
        email,
        resetSent: true
      })
    );

    setMsg(resetMsgEl, "Matched! Redirecting to Admin Page...", false);
    setTimeout(() => {
      window.location.href = "admin.html";
    }, 650);
  } catch (err) {
    setMsg(resetMsgEl, getFriendlyAuthError(err));
  } finally {
    sendResetBtn.disabled = false;
    sendResetBtn.textContent = "Verify & Go to Admin Page";
  }
});

logoutBtn.addEventListener("click", async () => {
  try {
    await signOut(auth);
  } catch (err) {
    setMsg(loginMsgEl, getFriendlyAuthError(err));
  }
});

onAuthStateChanged(auth, async (user) => {
  if (user) {
    let profile = {
      fullName: user.displayName || "Member",
      username: "-",
      mobile: "-",
      email: user.email,
      profileImage: "https://api.dicebear.com/9.x/initials/svg?seed=SVGP"
    };

    try {
      const snap = await getDoc(doc(db, "users", user.uid));
      if (snap.exists()) {
        profile = { ...profile, ...snap.data() };
      }
    } catch (_) {}

    welcomeAvatar.src = profile.profileImage;
    welcomeTitle.textContent = `Welcome, ${profile.fullName}!`;
    detailName.textContent = profile.fullName;
    detailUsername.textContent = profile.username;
    detailMobile.textContent = profile.mobile;
    detailEmail.textContent = profile.email;

    loginCard.style.display = "none";
    welcomeCard.style.display = "block";
  } else {
    welcomeCard.style.display = "none";
    loginCard.style.display = "block";
  }
});

onAuthStateChanged(auth, (user) => {
  if (user) {
    window.location.href = "dashboard.html";
  }
});