import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";

const firebaseConfig = {
  apiKey: "AIzaSyAWPuvyXA1tJTnn-Qe14zHZzFxyFhXgrHk",
  authDomain: "workout-dashboard-12eb8.firebaseapp.com",
  projectId: "workout-dashboard-12eb8",
  storageBucket: "workout-dashboard-12eb8.firebasestorage.app",
  messagingSenderId: "231583055981",
  appId: "1:231583055981:web:58e7f6d7b1fca333957f64"
};

const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app);