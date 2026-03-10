// FILE: src/utils/idempotency.js
import { db } from "../config/firebaseAdmin.js";

/**
 * Prevent double crediting same payment
 */
export async function acquireOnceLock(paymentId) {
  if (!paymentId) return { ok: false };

  const ref = db.ref(`processedPayments/${paymentId}`);
  const snap = await ref.get();

  if (snap.exists()) {
    return { ok: false };
  }

  await ref.set({
    processedAt: Date.now(),
  });

  return { ok: true };
}