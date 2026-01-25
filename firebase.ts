
import { initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';

// Replace with your actual Firebase project configuration
const firebaseConfig = {
  apiKey: "AIzaSyAn38XpRN9Zwrn8hT6dNzfD-iiVOlMQxSA",
  authDomain: "edusystem-2.firebaseapp.com",
  projectId: "edusystem-2",
  storageBucket: "edusystem-2.firebasestorage.app",
  messagingSenderId: "545484348767",
  appId: "1:545484348767:web:13fd9ebb8141fa3a42eaea",
  measurementId: "G-G1KCFCWG9L"
};

const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app);
