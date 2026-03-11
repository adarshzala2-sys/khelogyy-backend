// src/config/firebaseAdmin.js
import admin from "firebase-admin";

if (!process.env.FIREBASE_SERVICE_ACCOUNT) {
  throw new Error("Missing FIREBASE_SERVICE_ACCOUNT");
}

if (!process.env.FIREBASE_DB_URL) {
  throw new Error("Missing FIREBASE_DB_URL");
}

const serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT);

if (!admin.apps.length) {
  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),
    databaseURL: process.env.FIREBASE_DB_URL,
  });
  console.log("✅ Firebase Admin initialized successfully");
}

export const db = admin.database();
export const serverTimestamp = () => admin.database.ServerValue.TIMESTAMP;
