// Import the functions you need from the SDKs you need
import { initializeApp } from "firebase/app";
import { getAnalytics } from "firebase/analytics";
import { getStorage } from "firebase/storage";
// TODO: Add SDKs for Firebase products that you want to use
// https://firebase.google.com/docs/web/setup#available-libraries

// Your web app's Firebase configuration
// For Firebase JS SDK v7.20.0 and later, measurementId is optional
const firebaseConfig = {
  apiKey: "AIzaSyBDPoUz3UUcfgmZyKFULsdUzSY1kB_m5_Q",
  authDomain: "viarikaimages.firebaseapp.com",
  projectId: "viarikaimages",
  storageBucket: "viarikaimages.appspot.com",
  messagingSenderId: "397384243250",
  appId: "1:397384243250:web:9ddb220608e9e0eb33442b",
  measurementId: "G-DDGVPGCTFB"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const analytics = getAnalytics(app);
const storage = getStorage(app);

export { storage };