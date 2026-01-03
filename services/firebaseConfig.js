// firebaseConfig.js
import { initializeApp } from 'firebase/app';
import { getFirestore } from 'firebase/firestore';
import { initializeAuth, getReactNativePersistence } from 'firebase/auth';
import ReactNativeAsyncStorage from '@react-native-async-storage/async-storage';

// Your web app's Firebase configuration
const firebaseConfig = {
    apiKey: "AIzaSyBSGnby3jqnORmz257ecLwvBTR4df2b5-M",
    authDomain: "quickbites-ea42b.firebaseapp.com",
    projectId: "quickbites-ea42b",
    storageBucket: "quickbites-ea42b.firebasestorage.app",
    messagingSenderId: "860255131401",
    appId: "1:860255131401:web:ee2b5d469e5fc5ecd725d8"
  };

// Initialize Firebase
const app = initializeApp(firebaseConfig);

// Initialize Auth with AsyncStorage persistence
const auth = initializeAuth(app, {
  persistence: getReactNativePersistence(ReactNativeAsyncStorage)
});

// Export Firestore and Auth instances for use in your app
const db = getFirestore(app);

export { app, db, auth };
