import { initializeApp } from "https://www.gstatic.com/firebasejs/11.6.0/firebase-app.js";
import {
  getAuth,
  createUserWithEmailAndPassword,
  updateProfile
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

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

const registerForm = document.getElementById("register-form");
const photoInput = document.getElementById("reg-photo");
const avatarPreview = document.getElementById("avatar-preview");
const fullNameEl = document.getElementById("reg-fullname");
const usernameEl = document.getElementById("reg-username");
const mobileEl = document.getElementById("reg-mobile");
const emailEl = document.getElementById("reg-email");
const passwordEl = document.getElementById("reg-password");
const confirmPasswordEl = document.getElementById("reg-confirm-password");
const termsEl = document.getElementById("reg-terms");
const submitBtn = document.getElementById("register-submit-btn");
const msgEl = document.getElementById("register-msg");

let uploadedPhotoDataUrl = "";

function setRegMsg(text, isError = true) {
  msgEl.textContent = text;
  msgEl.className = `status-text ${isError ? "error" : "success"}`;
}

photoInput.addEventListener("change", () => {
  setRegMsg("");
  const file = photoInput.files?.[0];
  if (!file) {
    uploadedPhotoDataUrl = "";
    avatarPreview.src = "https://api.dicebear.com/9.x/initials/svg?seed=SVGP";
    return;
  }

  if (!file.type.startsWith("image/")) {
    setRegMsg("Please select a valid image file (JPG, PNG, WEBP).");
    photoInput.value = "";
    return;
  }

  if (file.size > 1024 * 1024) {
    setRegMsg("Image size must be 1 MB or smaller.");
    photoInput.value = "";
    return;
  }

  const reader = new FileReader();
  reader.onload = () => {
    uploadedPhotoDataUrl = String(reader.result || "");
    avatarPreview.src = uploadedPhotoDataUrl;
  };
  reader.readAsDataURL(file);
});

document.querySelectorAll(".vis-btn").forEach((btn) => {
  btn.addEventListener("click", () => {
    const input = document.getElementById(btn.dataset.target);
    const show = input.type === "password";
    input.type = show ? "text" : "password";
    btn.textContent = show ? "🙈" : "👁";
  });
});

async function isDuplicateField(fieldName, value) {
  const q = query(collection(db, "users"), where(fieldName, "==", value));
  const snap = await getDocs(q);
  return !snap.empty;
}

registerForm.addEventListener("submit", async (e) => {
  e.preventDefault();
  setRegMsg("");

  const fullName = fullNameEl.value.trim();
  const username = usernameEl.value.trim().toLowerCase();
  const mobile = mobileEl.value.trim();
  const email = emailEl.value.trim().toLowerCase();
  const password = passwordEl.value;
  const confirmPassword = confirmPasswordEl.value;

  if (!fullName || !username || !mobile || !email || !password || !confirmPassword) {
    setRegMsg("Please fill out all fields.");
    return;
  }

  if (username.length < 3) {
    setRegMsg("User ID must be at least 3 characters.");
    return;
  }

  if (!/^\d{10,15}$/.test(mobile)) {
    setRegMsg("Please enter a valid mobile number (10–15 digits).");
    return;
  }

  if (password.length < 6) {
    setRegMsg("Password must be at least 6 characters.");
    return;
  }

  if (password !== confirmPassword) {
    setRegMsg("Password and Confirm Password do not match.");
    return;
  }

  if (!termsEl.checked) {
    setRegMsg("Please accept the SVGP Summer Camp Rules & Terms.");
    return;
  }

  submitBtn.disabled = true;
  submitBtn.textContent = "Creating...";

  try {
    const [usernameTaken, mobileTaken] = await Promise.all([
      isDuplicateField("username", username),
      isDuplicateField("mobile", mobile)
    ]);

    if (usernameTaken) {
      setRegMsg("This User ID is already taken. Choose another one.");
      return;
    }

    if (mobileTaken) {
      setRegMsg("This Mobile Number is already registered.");
      return;
    }

    const cred = await createUserWithEmailAndPassword(auth, email, password);
    await updateProfile(cred.user, { displayName: fullName });

    const finalAvatar =
      uploadedPhotoDataUrl ||
      `https://api.dicebear.com/9.x/initials/svg?seed=${encodeURIComponent(fullName)}`;

    await setDoc(doc(db, "users", cred.user.uid), {
      fullName,
      username,
      mobile,
      email,
      profileImage: finalAvatar,
      createdAt: new Date().toISOString()
    });

    setRegMsg("Account created successfully! Redirecting to Sign In...", false);
    setTimeout(() => {
      window.location.href = "index.html";
    }, 1100);
  } catch (err) {
    setRegMsg(err.message);
  } finally {
    submitBtn.disabled = false;
    submitBtn.textContent = "Create Account";
  }
});