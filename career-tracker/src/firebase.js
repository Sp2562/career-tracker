import { initializeApp } from "firebase/app";
import { getAuth, GoogleAuthProvider, signInWithPopup, signOut, onAuthStateChanged } from "firebase/auth";
import { getFirestore, doc, setDoc, getDoc } from "firebase/firestore";

const firebaseConfig = {
  apiKey: "AIzaSyA207pKFIA-d7S9HdN31-du2CGhbWt6NZQ",
  authDomain: "roadmap-automation-6e4ad.firebaseapp.com",
  projectId: "roadmap-automation-6e4ad",
  storageBucket: "roadmap-automation-6e4ad.firebasestorage.app",
  messagingSenderId: "1075036356196",
  appId: "1:1075036356196:web:c5b35497b0428f92d96971"
};

const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app);
export const googleProvider = new GoogleAuthProvider();

export const signInWithGoogle = () => signInWithPopup(auth, googleProvider);
export const logOut = () => signOut(auth);
export const onAuth = (cb) => onAuthStateChanged(auth, cb);

export async function saveData(uid, data) {
  await setDoc(doc(db, "users", uid), data);
}

export async function loadData(uid) {
  const snap = await getDoc(doc(db, "users", uid));
  return snap.exists() ? snap.data() : null;
}
