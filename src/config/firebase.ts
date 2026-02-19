import { initializeApp } from 'firebase/app';
import { getFirestore } from 'firebase/firestore';
import { getAuth } from 'firebase/auth';

const firebaseConfig = {
  apiKey: "AIzaSyATtYVlwAXzUhUxear8_nLIA1hKoVWqMxw",
  authDomain: "pharmagenai-3dc26.firebaseapp.com",
  projectId: "pharmagenai-3dc26",
  storageBucket: "pharmagenai-3dc26.firebasestorage.app",
  messagingSenderId: "965976095532",
  appId: "1:965976095532:web:fea5be0bb9fd44e42d0a89",
  measurementId: "G-EFVRS9LRKT"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);

// Initialize services
export const db = getFirestore(app);
export const auth = getAuth(app);

export default app;
