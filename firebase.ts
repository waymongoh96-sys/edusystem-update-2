
import { initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';

// Replace with your actual Firebase project configuration
const firebaseConfig = {
  apiKey: "AIzaSyBGj8TirBAkQL9NpHHBa1QDQesis-SOIus",
  authDomain: "edusystem-4df07.firebaseapp.com",
  projectId: "edusystem-4df07",
  storageBucket: "edusystem-4df07.firebasestorage.app",
  messagingSenderId: "748439452487",
  appId: "1:748439452487:web:afa13e290fc8f3f4f36a62",
  measurementId: "G-7089RPPBV5"
};

const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app);
