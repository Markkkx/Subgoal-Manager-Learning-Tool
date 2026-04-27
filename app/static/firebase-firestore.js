import {
  getApp,
  getApps,
  initializeApp,
} from "https://www.gstatic.com/firebasejs/12.1.0/firebase-app.js";
import {
  addDoc,
  collection,
  doc,
  getDocs,
  getDoc,
  getFirestore,
  serverTimestamp,
  setDoc,
} from "https://www.gstatic.com/firebasejs/12.1.0/firebase-firestore.js";


import { firebaseConfig, hasFirebaseConfig } from "./firebase-config.js";

let firestoreDb = null;

if (hasFirebaseConfig()) {
  const app = getApps().length ? getApp() : initializeApp(firebaseConfig);
  firestoreDb = getFirestore(app);
}

function requireDb() {
  if (!firestoreDb) {
    throw new Error("Firestore is not configured.");
  }

  return firestoreDb;
}

export async function getUserOnboarding(uid) {
  const db = requireDb();
  const userRef = doc(db, "users", uid);
  const userSnap = await getDoc(userRef);
  const subgoalRef = doc(db, "users", uid, "week0", "subgoals");
  const subgoalSnap = await getDoc(subgoalRef);

  return {
    profile: userSnap.exists() ? userSnap.data() : {},
    subgoals: subgoalSnap.exists() ? subgoalSnap.data() : {},
  };
}

export async function saveUserOnboarding(uid, payload) {
  const db = requireDb();
  const userRef = doc(db, "users", uid);

  await setDoc(
    userRef,
    {
      ...payload,
      updatedAt: serverTimestamp(),
    },
    { merge: true }
  );
}

export async function saveWeek0Subgoals(uid, subgoals) {
  const db = requireDb();
  const subgoalRef = doc(db, "users", uid, "week0", "subgoals");

  await setDoc(
    subgoalRef,
    {
      goal1: subgoals[0],
      goal2: subgoals[1],
      goal3: subgoals[2],
      updatedAt: serverTimestamp(),
    },
    { merge: true }
  );
}

export async function getUserWeekProgress(uid) {
  const db = requireDb();
  const weeksRef = collection(db, "users", uid, "weeks");
  const weekSnapshot = await getDocs(weeksRef);
  const weeks = {};

  weekSnapshot.forEach((weekDoc) => {
    weeks[weekDoc.id] = weekDoc.data();
  });

  return weeks;
}

export async function saveUserStudyProfile(uid, payload) {
  const db = requireDb();
  const userRef = doc(db, "users", uid);

  await setDoc(
    userRef,
    {
      ...payload,
      updatedAt: serverTimestamp(),
    },
    { merge: true }
  );
}

export async function saveUserWeek(uid, weekId, payload) {
  const db = requireDb();
  const weekRef = doc(db, "users", uid, "weeks", weekId);

  await setDoc(
    weekRef,
    {
      ...payload,
      updatedAt: serverTimestamp(),
    },
    { merge: true }
  );
}

export async function getPostTestQuestions() {
  const db = requireDb();
  const snap = await getDocs(collection(db, "post_test_questions"));
  const questions = [];
  snap.forEach((d) => questions.push({ id: d.id, ...d.data() }));
  questions.sort((a, b) => (a.order ?? 0) - (b.order ?? 0));
  return questions;
}

export async function savePostTest(uid, answers) {
  const db = requireDb();
  const ref = doc(db, "users", uid, "assessments", "post_test");
  await setDoc(ref, { answers, submittedAt: serverTimestamp() }, { merge: true });
}

// Save structured session assessment answers to a sub-document for clean data separation.
// weekId: e.g. "week1". answers: {questionId: answerValue, ...}
export async function saveStructuredSession(uid, weekId, answers) {
  const db = requireDb();
  const ref = doc(db, "users", uid, "weeks", weekId, "structuredAssessment", "answers");
  await setDoc(ref, { answers, submittedAt: serverTimestamp() }, { merge: true });
}

export async function saveQuickEvaluation(uid, payload) {
  const db = requireDb();
  const ref = collection(db, "users", uid, "quickEvaluations");

  await addDoc(ref, {
    ...payload,
    userId: uid,
    savedAt: serverTimestamp(),
  });
}
