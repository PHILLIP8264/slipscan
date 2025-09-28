import ReactNativeAsyncStorage from "@react-native-async-storage/async-storage";
import { initializeApp } from "firebase/app";
import { getReactNativePersistence, initializeAuth } from "firebase/auth";
// TODO: Add SDKs for Firebase products that you want to use
// https://firebase.google.com/docs/web/setup#available-libraries

// Your web app's Firebase configuration
// For Firebase JS SDK v7.20.0 and later, measurementId is optional
const firebaseConfig = {
  apiKey: "AIzaSyCUnP7_oJfcMXWJV2P1rugrI527zj6Y_4Q",
  authDomain: "slipscan-3bb98.firebaseapp.com",
  projectId: "slipscan-3bb98",
  storageBucket: "slipscan-3bb98.firebasestorage.app",
  messagingSenderId: "182619865153",
  appId: "1:182619865153:web:523815f63cb43d8d73c6c0",
  measurementId: "G-GR2FQ99MZR",
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);

// Initialize Auth with AsyncStorage persistence
export const auth = initializeAuth(app, {
  persistence: getReactNativePersistence(ReactNativeAsyncStorage),
});
