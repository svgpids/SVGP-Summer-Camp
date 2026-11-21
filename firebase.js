// Import Firebase SDKs via CDN
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-app.js";
import { 
    getAuth, 
    GoogleAuthProvider, 
    signInWithPopup, 
    createUserWithEmailAndPassword, 
    signInWithEmailAndPassword,
    sendEmailVerification,
    signOut,
    onAuthStateChanged 
} from "https://www.gstatic.com/firebasejs/10.8.0/firebase-auth.js";
import { 
    getFirestore, 
    doc, 
    setDoc, 
    getDoc 
} from "https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js";

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
export const auth = getAuth(app);
export const db = getFirestore(app);
export const googleProvider = new GoogleAuthProvider();

export { 
    createUserWithEmailAndPassword, 
    signInWithEmailAndPassword, 
    sendEmailVerification, 
    signInWithPopup, 
    signOut, 
    onAuthStateChanged, 
    doc, 
    setDoc, 
    getDoc 
};