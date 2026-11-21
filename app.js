import { initializeApp } from "https://www.gstatic.com/firebasejs/11.6.0/firebase-app.js";
import {
  getAuth,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  updateProfile,
  signOut,
  onAuthStateChanged
} from "https://www.gstatic.com/firebasejs/11.6.0/firebase-auth.js";

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

// DOM Elements
const authWrapper = document.getElementById("auth-wrapper");
const dashboard = document.getElementById("dashboard");

const nameInput = document.getElementById("fullname");
const emailInput = document.getElementById("email");
const passwordInput = document.getElementById("password");
const termsCheck = document.getElementById("terms-check");

const signupBtn = document.getElementById("signup-btn");
const loginBtn = document.getElementById("login-btn");
const logoutBtn = document.getElementById("logout-btn");
const togglePassBtn = document.getElementById("toggle-pass");
const termsLink = document.getElementById("terms-link");

const authMsg = document.getElementById("auth-msg");
const userNameEl = document.getElementById("user-name");
const userInfoEl = document.getElementById("user-info");

// Mobile View Switcher
const tabForm = document.getElementById("mobile-tab-form");
const tabWelcome = document.getElementById("mobile-tab-welcome");
const welcomePanel = document.getElementById("welcome-panel");
const formPanel = document.getElementById("form-panel");

function syncMobileView() {
  if (window.innerWidth > 768) {
    welcomePanel.classList.remove("mobile-hidden");
    formPanel.classList.remove("mobile-hidden");
  } else if (tabWelcome.classList.contains("active")) {
    welcomePanel.classList.remove("mobile-hidden");
    formPanel.classList.add("mobile-hidden");
  } else {
    welcomePanel.classList.add("mobile-hidden");
    formPanel.classList.remove("mobile-hidden");
  }
}

tabForm.addEventListener("click", () => {
  tabForm.classList.add("active");
  tabWelcome.classList.remove("active");
  syncMobileView();
});

tabWelcome.addEventListener("click", () => {
  tabWelcome.classList.add("active");
  tabForm.classList.remove("active");
  syncMobileView();
});

window.addEventListener("resize", syncMobileView);
syncMobileView();

// Helper for Status Messages
function showMsg(text, isError = true) {
  authMsg.textContent = text;
  authMsg.className = `msg ${isError ? "error" : "success"}`;
}

// Show / Hide Password
togglePassBtn.addEventListener("click", () => {
  const isPassword = passwordInput.type === "password";
  passwordInput.type = isPassword ? "text" : "password";
  togglePassBtn.textContent = isPassword ? "🙈" : "👁";
});

// Terms Info Click
termsLink.addEventListener("click", (e) => {
  e.preventDefault();
  showMsg("Standard IRG App Terms & Conditions apply.", false);
});

// Sign Up Handler
signupBtn.addEventListener("click", async () => {
  showMsg("");

  if (!termsCheck.checked) {
    showMsg("Please accept Terms & Conditions to sign up.");
    return;
  }

  const fullName = nameInput.value.trim();
  const email = emailInput.value.trim();
  const password = passwordInput.value;

  try {
    const cred = await createUserWithEmailAndPassword(auth, email, password);
    if (fullName) {
      await updateProfile(cred.user, { displayName: fullName });
    }
    showMsg("Account created successfully!", false);
  } catch (err) {
    showMsg(err.message);
  }
});

// Sign In / Login Handler
loginBtn.addEventListener("click", async () => {
  showMsg("");

  const email = emailInput.value.trim();
  const password = passwordInput.value;

  try {
    await signInWithEmailAndPassword(auth, email, password);
  } catch (err) {
    showMsg(err.message);
  }
});

// Logout Handler
logoutBtn.addEventListener("click", async () => {
  await signOut(auth);
});

// Auth State Observer
onAuthStateChanged(auth, (user) => {
  if (user) {
    authWrapper.style.display = "none";
    dashboard.style.display = "block";
    userNameEl.textContent = user.displayName ? `Hi, ${user.displayName}` : "Hi, Member";
    userInfoEl.textContent = `Logged in as: ${user.email}`;
  } else {
    dashboard.style.display = "none";
    authWrapper.style.display = "grid";
    nameInput.value = "";
    emailInput.value = "";
    passwordInput.value = "";
    syncMobileView();
  }
});