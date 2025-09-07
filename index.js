import { auth } from './firebase-config.js';
import { signInWithEmailAndPassword } from "https://www.gstatic.com/firebasejs/9.6.1/firebase-auth.js";

document.getElementById('login-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    const email = document.getElementById('email').value;
    const password = document.getElementById('password').value;

    try {
        await signInWithEmailAndPassword(auth, email, password);
        // Inicio de sesión exitoso, redirigir a dashboard.html
        window.location.href = 'dashboard.html';
    } catch (error) {
        alert("Error al iniciar sesión: " + error.message);
    }
});