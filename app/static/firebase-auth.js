import {
  getApp,
  getApps,
  initializeApp,
} from "https://www.gstatic.com/firebasejs/12.1.0/firebase-app.js";
import {
  createUserWithEmailAndPassword,
  getAuth,
  onAuthStateChanged,
  signInWithEmailAndPassword,
  signOut,
} from "https://www.gstatic.com/firebasejs/12.1.0/firebase-auth.js";

import { firebaseConfig, hasFirebaseConfig } from "./firebase-config.js";

let authInstance = null;

if (hasFirebaseConfig()) {
  const app = getApps().length ? getApp() : initializeApp(firebaseConfig);
  authInstance = getAuth(app);
}

export function isFirebaseReady() {
  return Boolean(authInstance);
}

export function onAuthReady(callback) {
  if (!authInstance) {
    callback(null);
    return () => {};
  }

  return onAuthStateChanged(authInstance, callback);
}

export async function signUpWithEmail(email, password) {
  if (!authInstance) {
    throw new Error("Firebase is not configured.");
  }

  return createUserWithEmailAndPassword(authInstance, email, password);
}

export async function loginWithEmail(email, password) {
  if (!authInstance) {
    throw new Error("Firebase is not configured.");
  }

  return signInWithEmailAndPassword(authInstance, email, password);
}

export async function logoutUser() {
  if (!authInstance) {
    return;
  }

  await signOut(authInstance);
}
