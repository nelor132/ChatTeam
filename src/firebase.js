import { initializeApp } from "firebase/app";
import { getDatabase } from "firebase/database";
import { getStorage } from "firebase/storage";
import { getAnalytics } from "firebase/analytics";

const firebaseConfig = {
  apiKey: "AIzaSyBBGra56i6Bf99ueh0QqMKxu0K4WV8u1M4",
  authDomain: "websocketchat-eeede.firebaseapp.com",
  databaseURL: "https://websocketchat-eeede-default-rtdb.firebaseio.com", 
  projectId: "websocketchat-eeede",
  storageBucket: "websocketchat-eeede.appspot.com", // исправлено
  messagingSenderId: "1003362902789",
  appId: "1:1003362902789:web:3b556326b5e3a5b3f18d6c",
  measurementId: "G-YCBTZKXRPJ"
};

const app = initializeApp(firebaseConfig);
const db = getDatabase(app);
const storage = getStorage(app);
const analytics = getAnalytics(app);

export { db, storage, analytics };

