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
const provider = new GoogleAuthProvider();

export const signInWithGoogle = () => signInWithPopup(auth, provider);
export const logOut = () => signOut(auth);
export const onAuth = (cb) => onAuthStateChanged(auth, cb);

// Saves entire data as one JSON string â€” avoids all Firestore nested array problems
export async function saveData(uid, data) {
  await setDoc(doc(db, "trackerFinal", uid), {
    payload: JSON.stringify(data),
    ts: Date.now()
  });
}

// Loads data â€” tries new collection, then falls back to old ones
export async function loadData(uid) {
  // newest collection
  let snap = await getDoc(doc(db, "trackerFinal", uid));
  if (snap.exists() && snap.data().payload) {
    return JSON.parse(snap.data().payload);
  }

  // previous attempt (trackerv3)
  snap = await getDoc(doc(db, "trackerv3", uid));
  if (snap.exists() && snap.data().payload) {
    const d = JSON.parse(snap.data().payload);
    // migrate to new collection
    await setDoc(doc(db, "trackerFinal", uid), { payload: JSON.stringify(d), ts: Date.now() });
    return d;
  }

  // oldest collection (users) â€” had categories format
  snap = await getDoc(doc(db, "users", uid));
  if (snap.exists()) {
    const raw = snap.data();
    // could be payload string or direct object
    const d = raw.payload ? JSON.parse(raw.payload) : raw;
    if (d && d.categories) {
      await setDoc(doc(db, "trackerFinal", uid), { payload: JSON.stringify(d), ts: Date.now() });
      return d;
    }
  }

  return null; // first time user â€” app will use DEFAULT
}