// Import the functions you need from the SDKs you need
import { initializeApp } from "firebase/app";
import { getAnalytics } from "firebase/analytics";
import { 
  getAuth, 
  GoogleAuthProvider, 
  signInWithPopup, 
  createUserWithEmailAndPassword, 
  signInWithEmailAndPassword 
} from "firebase/auth";
import { getFirestore, doc, setDoc, getDoc } from "firebase/firestore";

// Mee Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyCBqopRPyEYBvUAfV2ZnWbH2wvitpVPk2M",
  authDomain: "irg-app-6ad50.firebaseapp.com",
  projectId: "irg-app-6ad50",
  storageBucket: "irg-app-6ad50.firebasestorage.app",
  messagingSenderId: "709449150242",
  appId: "1:709449150242:web:8eccd2a8e8e0ac8065bf7b",
  measurementId: "G-YEQ2DC0R7Q"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const analytics = getAnalytics(app);

export const auth = getAuth(app);
export const db = getFirestore(app);
const googleProvider = new GoogleAuthProvider();

// 1. GOOGLE LOGIN
export async function handleGoogleLogin() {
  try {
    const result = await signInWithPopup(auth, googleProvider);
    const user = result.user;

    const userRef = doc(db, "users", user.uid);
    const userSnap = await getDoc(userRef);

    if (!userSnap.exists()) {
      await setDoc(userRef, {
        uid: user.uid,
        username: user.displayName || "Google User",
        email: user.email,
        mobile: "",
        createdAt: new Date()
      });
    }

    alert("Google Login Success! Welcome " + (user.displayName || "User"));
    return user;
  } catch (error) {
    alert("Google Login Error: " + error.message);
  }
}

// 2. REGISTER WITH MOBILE, USERNAME & PASSWORD
export async function registerWithMobile(mobile, username, password) {
  const syntheticEmail = `${mobile}@irgapp.com`;
  try {
    const userCredential = await createUserWithEmailAndPassword(auth, syntheticEmail, password);
    const user = userCredential.user;

    await setDoc(doc(db, "users", user.uid), {
      uid: user.uid,
      username: username,
      mobile: mobile,
      email: syntheticEmail,
      createdAt: new Date()
    });

    alert("Mobile Registration Success!");
    return user;
  } catch (error) {
    alert("Registration Error: " + error.message);
  }
}

// 3. LOGIN WITH MOBILE & PASSWORD
export async function loginWithMobile(mobile, password) {
  const syntheticEmail = `${mobile}@irgapp.com`;
  try {
    const userCredential = await signInWithEmailAndPassword(auth, syntheticEmail, password);
    alert("Mobile Login Success!");
    return userCredential.user;
  } catch (error) {
    alert("Login Error: " + error.message);
  }
}