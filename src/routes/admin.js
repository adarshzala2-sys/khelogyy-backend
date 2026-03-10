import dotenv from "dotenv";
dotenv.config();

import admin from "firebase-admin";
import fs from "fs";
import path from "path";

const serviceAccountPath = process.env.FIREBASE_SERVICE_ACCOUNT;

console.log("🔍 Firebase service account path:", serviceAccountPath);

if (!serviceAccountPath) {
  throw new Error("❌ FIREBASE_SERVICE_ACCOUNT missing in .env");
}

const fullPath = path.isAbsolute(serviceAccountPath)
  ? serviceAccountPath
  : path.join(process.cwd(), serviceAccountPath);

console.log("🔍 Full service account path:", fullPath);

if (!fs.existsSync(fullPath)) {
  throw new Error(`❌ Service account file NOT FOUND: ${fullPath}`);
}

const serviceAccount = JSON.parse(fs.readFileSync(fullPath, "utf-8"));
console.log("✅ Firebase service account loaded");

if (!process.env.FIREBASE_DB_URL) {
  throw new Error("❌ FIREBASE_DB_URL missing in .env");
}

if (!admin.apps.length) {
  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),
    databaseURL: process.env.FIREBASE_DB_URL,
  });
  console.log("✅ Firebase Admin initialized");
}

export const db = admin.database();
export const serverTimestamp = admin.database.ServerValue.TIMESTAMP;
