// Import the functions you need from the SDKs you need
import { initializeApp } from "firebase/app";
import { getAnalytics } from "firebase/analytics";
// TODO: Add SDKs for Firebase products that you want to use
// https://firebase.google.com/docs/web/setup#available-libraries

// Your web app's Firebase configuration
// For Firebase JS SDK v7.20.0 and later, measurementId is optional
const firebaseConfig = {
  apiKey: "AIzaSyDbpHqszm8R4cp3lvOOjGPLDFQ4NjrJ9ds",
  authDomain: "unipool-9506a.firebaseapp.com",
  projectId: "unipool-9506a",
  storageBucket: "unipool-9506a.firebasestorage.app",
  messagingSenderId: "878118092669",
  appId: "1:878118092669:web:77ba817f006cd79cbc1614",
  measurementId: "G-E311EBH66H"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const analytics = getAnalytics(app);