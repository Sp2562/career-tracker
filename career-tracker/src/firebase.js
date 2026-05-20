import { initializeApp } from "firebase/app";

import {
getAuth,
GoogleAuthProvider,
signInWithPopup,
signOut,
onAuthStateChanged
} from "firebase/auth";

import {
getFirestore,
doc,
setDoc,
getDoc
} from "firebase/firestore";

const firebaseConfig = {
apiKey: "YOUR_API_KEY",
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

export const signInWithGoogle = () =>
signInWithPopup(auth, provider);

export const logOut = () =>
signOut(auth);

export const onAuth = (callback) =>
onAuthStateChanged(auth, callback);

export async function saveData(uid, data) {
try {
await setDoc(
doc(db, "users", uid),
{
payload: JSON.stringify(data),
updatedAt: Date.now()
}
);
} catch (err) {
console.error("SAVE ERROR:", err);
}
}

export async function loadData(uid) {
try {
const snap = await getDoc(
doc(db, "users", uid)
);

if (snap.exists()) {
  const raw = snap.data();

  if (raw.payload) {
    return JSON.parse(raw.payload);
  }
}

return null;

} catch (err) {
console.error("LOAD ERROR:", err);
return null;
}
}
