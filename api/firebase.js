// ════════════════════════════════════════════════════════════
//  firebase.js — Configuração e inicialização do Firebase
//  Substitua os valores abaixo com os do seu projeto em:
//  https://console.firebase.google.com → Configurações → Seus apps
// ════════════════════════════════════════════════════════════

import { initializeApp } from 'https://www.gstatic.com/firebasejs/11.0.1/firebase-app.js';
import {
  getAuth,
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  sendPasswordResetEmail,
  updateProfile,
  GoogleAuthProvider,
  GithubAuthProvider,
  signInWithPopup
} from 'https://www.gstatic.com/firebasejs/11.0.1/firebase-auth.js';
import {
  getFirestore,
  doc,
  setDoc,
  serverTimestamp
} from 'https://www.gstatic.com/firebasejs/11.0.1/firebase-firestore.js';

// ── Suas credenciais do Firebase ──
const firebaseConfig = {
  apiKey:            "SUA_API_KEY",
  authDomain:        "seu-projeto.firebaseapp.com",
  projectId:         "seu-projeto",
  storageBucket:     "seu-projeto.appspot.com",
  messagingSenderId: "SEU_SENDER_ID",
  appId:             "SEU_APP_ID"
};

// ── Inicialização ──
const app  = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db   = getFirestore(app);

// ── Expõe para o app.js via window._fb ──
window._fb = {
  auth,
  db,
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  sendPasswordResetEmail,
  updateProfile,
  GoogleAuthProvider,
  GithubAuthProvider,
  signInWithPopup,
  doc,
  setDoc,
  serverTimestamp
};

// ── Listener de estado de autenticação ──
auth.onAuthStateChanged(user => {
  if (user) {
    window.showToast?.('success', `✅ Bem-vindo, ${user.displayName || user.email}!`);
    // Redirecionar para o dashboard após login bem-sucedido:
    // setTimeout(() => { window.location.href = '/dashboard'; }, 1500);
  }
});