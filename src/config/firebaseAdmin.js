// FILE: src/config/firebaseAdmin.js
import dotenv from "dotenv";
dotenv.config();

import admin from "firebase-admin";

if (!process.env.FIREBASE_SERVICE_ACCOUNT) {
  throw new Error("Missing FIREBASE_SERVICE_ACCOUNT env variable");
}

if (!process.env.FIREBASE_DB_URL) {
  throw new Error("Missing FIREBASE_DB_URL env variable");
}

// 🔥 ENV JSON parse
let serviceAccount;
try {
  serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT);
} catch (err) {
  throw new Error("Invalid FIREBASE_SERVICE_ACCOUNT JSON");
}

// 🔥 INIT FIREBASE
if (!admin.apps.length) {
  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),
    databaseURL: process.env.FIREBASE_DB_URL,
  });
}

export const db = admin.database();
export const serverTimestamp = () => admin.database.ServerValue.TIMESTAMP;
