// Import the functions you need from the SDKs you need
import { initializeApp } from "firebase/app";
import { getAnalytics } from "firebase/analytics";
import { getFirestore } from "firebase/firestore";

// TODO: Add SDKs for Firebase products that you want to use
// https://firebase.google.com/docs/web/setup#available-libraries

// Your web app's Firebase configuration
// For Firebase JS SDK v7.20.0 and later, measurementId is optional
const firebaseConfig = {
  apiKey: "AIzaSyAOTVSraGVgX0L57_XcxKHIiYWqqZREnzE",
  authDomain: "motolink-e1863.firebaseapp.com",
  projectId: "motolink-e1863",
  storageBucket: "motolink-e1863.firebasestorage.app",
  messagingSenderId: "962177976997",
  appId: "1:962177976997:web:bf550bcfbe95c1c5985b4c",
  measurementId: "G-PZ899TYM33"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const analytics = getAnalytics(app);
export const db = getFirestore(app);
