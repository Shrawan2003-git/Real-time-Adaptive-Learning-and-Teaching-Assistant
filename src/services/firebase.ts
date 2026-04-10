import { initializeApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";
import { getAuth } from "firebase/auth";

const firebaseConfig = {
    apiKey: "AIzaSyCz9o8Oy-hAf0coVzR93_dQwEmsTi0xurQ",
    authDomain: "vta-real-time-adaption.firebaseapp.com",
    projectId: "vta-real-time-adaption",
    storageBucket: "vta-real-time-adaption.firebasestorage.app",
    messagingSenderId: "783156146958",
    appId: "1:783156146958:web:a7aefb68a3e447bb4f9d5f",
    measurementId: "G-22BFVRJR4D"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);

// Initialize Cloud Firestore and get a reference to the service
export const db = getFirestore(app);
export const auth = getAuth(app);
