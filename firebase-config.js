import { initializeApp } from "https://www.gstatic.com/firebasejs/9.6.1/firebase-app.js";
import { getAuth } from "https://www.gstatic.com/firebasejs/9.6.1/firebase-auth.js";
import { getFirestore } from "https://www.gstatic.com/firebasejs/9.6.1/firebase-firestore.js";
import { getStorage } from "https://www.gstatic.com/firebasejs/9.6.1/firebase-storage.js";

const firebaseConfig = {
    apiKey: "AIzaSyB3Amz--OKkVM6HJetizkeZY7EKIoCO8Og",
    authDomain: "estibabot.firebaseapp.com",
    projectId: "estibabot",
    storageBucket: "estibabot.firebasestorage.app",
    messagingSenderId: "276939633694",
    appId: "1:276939633694:web:468f0f9469a50524a82a0f"
};

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);
const storage = getStorage(app);

export { auth, db, storage };