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

const loginCard = document.getElementById("login-card");
const welcomeCard = document.getElementById("welcome-card");

const loginForm = document.getElementById("login-form");
const identifierInput = document.getElementById("login-identifier");
const passwordInput = document.getElementById("login-password");
const loginBtn = document.getElementById("login-submit-btn");
const loginStatus = document.getElementById("login-status");

const forgotForm = document.getElementById("forgot-form");
const openForgotBtn = document.getElementById("open-forgot-btn");
const backToLoginBtn = document.getElementById("back-to-login-btn");
const resetMobileInput = document.getElementById("reset-mobile");
const resetEmailInput = document.getElementById("reset-email");
const sendResetBtn = document.getElementById("send-reset-btn");
const resetStatus = document.getElementById("reset-status");

const togglePwdBtn = document.getElementById("toggle-pwd-btn");
const eyeSvg = document.getElementById("eye-svg");

const welcomeAvatar = document.getElementById("welcome-avatar");
const welcomeTitle = document.getElementById("welcome-title");
const detailName = document.getElementById("detail-name");
const detailUsername = document.getElementById("detail-username");
const detailMobile = document.getElementById("detail-mobile");
const detailEmail = document.getElementById("detail-email");
const logoutBtn = document.getElementById("logout-btn");

let redirectTimer = null;

function setFeedback(el, text, isErr = true) {
  el.textContent = text;
  el.className = `feedback-msg ${isErr ? "error" : "success"}`;
}

togglePwdBtn.addEventListener("click", () => {
  const isPass = passwordInput.type === "password";
  passwordInput.type = isPass ? "text" : "password";
  eyeSvg.innerHTML = isPass
    ? `<path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/>`
    : `<path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"/><line x1="1" y1="1" x2="23" y2="23"/>`;
});

openForgotBtn.addEventListener("click", () => {
  loginForm.style.display = "none";
  forgotForm.style.display = "block";
  setFeedback(resetStatus, "");
});

backToLoginBtn.addEventListener("click", () => {
  forgotForm.style.display = "none";
  loginForm.style.display = "block";
  setFeedback(loginStatus, "");
});

async function resolveUserProfile(rawId) {
  const clean = rawId.trim();
  const lower = clean.toLowerCase();

  let snap = await getDocs(query(collection(db, "users"), where("username", "==", lower)));
  if (snap.empty) {
    snap = await getDocs(query(collection(db, "users"), where("mobile", "==", clean)));
  }
  if (snap.empty && clean.includes("@")) {
    snap = await getDocs(query(collection(db, "users"), where("email", "==", lower)));
  }

  if (!snap.empty) return snap.docs[0].data();
  if (clean.includes("@")) return { email: lower, fullName: lower.split("@")[0] };
  return null;
}

loginForm.addEventListener("submit", async (e) => {
  e.preventDefault();
  setFeedback(loginStatus, "");

  const idVal = identifierInput.value.trim();
  const passVal = passwordInput.value;

  if (!idVal || !passVal) {
    setFeedback(loginStatus, "Please enter User ID or Mobile Number and Password.");
    return;
  }

  loginBtn.disabled = true;
  loginBtn.querySelector("span").textContent = "Logging in...";

  try {
    const profile = await resolveUserProfile(idVal);
    if (!profile || !profile.email) {
      setFeedback(loginStatus, "No account found with this User ID or Mobile Number.");
      return;
    }
    await signInWithEmailAndPassword(auth, profile.email, passVal);
  } catch (err) {
    setFeedback(loginStatus, err.message);
  } finally {
    loginBtn.disabled = false;
    loginBtn.querySelector("span").textContent = "Login";
  }
});

forgotForm.addEventListener("submit", async (e) => {
  e.preventDefault();
  setFeedback(resetStatus, "");

  const mobile = resetMobileInput.value.trim();
  const email = resetEmailInput.value.trim().toLowerCase();

  if (!mobile || !email) {
    setFeedback(resetStatus, "Please enter both registered Mobile Number and Gmail ID.");
    return;
  }

  sendResetBtn.disabled = true;
  try {
    const snap = await getDocs(
      query(collection(db, "users"), where("email", "==", email), where("mobile", "==", mobile))
    );
    if (snap.empty) {
      setFeedback(resetStatus, "Mobile Number and Gmail ID do not match.");
      return;
    }

    await sendPasswordResetEmail(auth, email);
    setFeedback(resetStatus, `Password reset link sent to ${email}. Check Inbox or Spam.`, false);
  } catch (err) {
    setFeedback(resetStatus, err.message);
  } finally {
    sendResetBtn.disabled = false;
  }
});

logoutBtn.addEventListener("click", async () => {
  clearTimeout(redirectTimer);
  await signOut(auth);
});

onAuthStateChanged(auth, async (user) => {
  clearTimeout(redirectTimer);

  if (user) {
    let profile = {
      fullName: user.displayName || "Student",
      username: "-",
      mobile: "-",
      email: user.email || "-",
      profileImage: `https://api.dicebear.com/9.x/initials/svg?seed=${encodeURIComponent(user.displayName || "SVGP")}`
    };

    try {
      const snap = await getDoc(doc(db, "users", user.uid));
      if (snap.exists()) profile = { ...profile, ...snap.data() };
    } catch (_) {}

    welcomeAvatar.src = profile.profileImage;
    welcomeTitle.textContent = `Welcome, ${profile.fullName}!`;
    detailName.textContent = profile.fullName;
    detailUsername.textContent = profile.username;
    detailMobile.textContent = profile.mobile;
    detailEmail.textContent = profile.email;

    loginCard.style.display = "none";
    welcomeCard.style.display = "block";

    redirectTimer = setTimeout(() => {
      window.location.href = "dashboard.html";
    }, 1800);
  } else {
    welcomeCard.style.display = "none";
    loginCard.style.display = "block";
  }
});