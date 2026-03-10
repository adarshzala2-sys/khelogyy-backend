import express from "express";
import { db, serverTimestamp } from "../config/firebaseAdmin.js";
import { createZapupiOrder, verifyWebhook } from "../utils/tranzProvider.js";

const router = express.Router();

// 🔥 CREATE QR (1:1 COINS)
router.post("/zapupi/create-qr", async (req, res) => {
  try {
    const { userKey, amount, customerName, customerMobile } = req.body;
    const amt = Number(amount);

    if (!userKey) return res.status(400).json({ message: "userKey required" });
    if (!Number.isFinite(amt) || amt < 10) return res.status(400).json({ message: "minimum ₹10" });

    const userSnap = await db.ref(`users/${userKey}`).once('value');
    if (!userSnap.exists()) return res.status(400).json({ message: "User not found" });

    const orderId = `ORD${Date.now().toString().slice(-8)}${Math.floor(Math.random() * 1000).toString().padStart(3, '0')}`;
    
    // 🔥 FIXED: EXACT 1:1 - ₹10 = 10 coins
    await db.ref(`topups/${userKey}/${orderId}`).set({
      orderId, userKey, 
      amount: amt,           // ₹10
      coinsToAdd: amt,       // 10 coins (1:1)
      status: "PENDING",
      createdAt: serverTimestamp(), 
      provider: "ZAPUPI",
      customerName: customerName || null, 
      customerMobile: customerMobile || null
    });

    await db.ref(`topupsByOrder/${orderId}`).set({
      userKey, topupPath: `${userKey}/${orderId}`
    });

    const data = await createZapupiOrder({ userKey, amount: amt, orderId, customerName, customerMobile });

    await db.ref(`topups/${userKey}/${orderId}`).update({
      paymentId: data.paymentId, 
      payLink: data.payLink,
      link_qrcode: data.link_qrcode,
      expiresAt: data.expiresAt
    });

    res.json({
      orderId, paymentId: data.paymentId,
      payLink: data.payLink,
      link_qrcode: data.link_qrcode,
      amount: amt
    });
    
  } catch (e) {
    console.error("💥 CREATE QR ERROR:", e.message);
    res.status(500).json({ message: e.message });
  }
});

// 🔥 WEBHOOK
router.post("/zapupi/webhook", async (req, res) => {
  try {
    let webhookData;
    try {
      if (Buffer.isBuffer(req.body)) {
        webhookData = JSON.parse(req.body.toString('utf8'));
      } else {
        webhookData = req.body;
      }
    } catch (e) {
      return res.status(200).json({ ok: true });
    }

    const orderId = webhookData.order_id || webhookData.txn_id || webhookData.payment_id || webhookData.orderId;
    const status = webhookData.status;

    if (!orderId) return res.status(200).json({ ok: true });

    const indexSnap = await db.ref(`topupsByOrder/${orderId}`).once('value');
    if (indexSnap.exists()) {
      const indexData = indexSnap.val();
      await processPayment(indexData.userKey, orderId, status, webhookData);
    }

    res.status(200).json({ ok: true });
  } catch (error) {
    console.error("💥 WEBHOOK ERROR:", error.message);
    res.status(200).json({ ok: true });
  }
});

// 🔥 FIXED: EXACT 1:1 COINS (NO MULTIPLY!)
async function processPayment(userKey, orderId, status, webhookData) {
  try {
    console.log("🔄 Processing:", { userKey, orderId, status });
    
    const topupRef = db.ref(`topups/${userKey}/${orderId}`);
    const topupSnap = await topupRef.once('value');
    const topupData = topupSnap.val();

    if (!topupData || topupData.credited) return;

    // Update webhook data
    await topupRef.update({
      webhookStatus: status,
      webhookAmount: Number(webhookData?.amount || topupData.amount || 0),
      webhookAt: serverTimestamp()
    });

    const isSuccess = status === 'SUCCESS' || status?.toUpperCase() === 'SUCCESS';

    if (isSuccess) {
      // 🔥 EXACT 1:1 - NO 10x MULTIPLY!
      const coinsToAdd = topupData.coinsToAdd || topupData.amount; // ₹10 = 10 coins
      const rupeesPaid = topupData.amount; // ₹10

      console.log("💰 COINS DEBUG:", { 
        rupeesPaid,           // 10
        coinsToAdd,           // 10  
        storedAmount: topupData.amount,     // 10
        storedCoinsToAdd: topupData.coinsToAdd // 10
      });

      // 🔥 ATOMIC ADD - EXACT AMOUNT
      await db.ref(`users/${userKey}/coins`).transaction((current) => {
        const currentCoins = Number(current) || 0;
        const newCoins = currentCoins + coinsToAdd; // 50 + 10 = 60
        console.log(`📈 COINS: ${currentCoins} → ${newCoins} (+${coinsToAdd})`);
        return newCoins;
      });

      // 🔥 ONE TRANSACTION RECORD (Android reads this)
      await db.ref(`transactions/${userKey}`).push({
        type: "Topup ✅",
        details: `ZapUPI +₹${rupeesPaid}`,
        provider: "ZapUPI",
        orderId,
        amount: coinsToAdd,  // 10 coins
        timestamp: serverTimestamp()
      });

      // Mark success
      await topupRef.update({
        status: 'SUCCESS',
        credited: true,
        coinsAdded: coinsToAdd,  // 10
        rupeesPaid: rupeesPaid,  // 10
        creditedAt: serverTimestamp()
      });

      console.log(`🎉 ✅ +${coinsToAdd} coins (₹${rupeesPaid}) to ${userKey}`);
      
    } else {
      await topupRef.update({ status: 'FAILED', webhookStatus: status });
    }
  } catch (error) {
    console.error("💥 Process error:", error);
  }
}

// 🔥 STATUS CHECK
router.get("/topup-status", async (req, res) => {
  try {
    const { userKey, orderId } = req.query;
    
    if (!userKey || !orderId) {
      return res.status(400).json({ 
        message: "userKey & orderId required",
        status: "ERROR", credited: false, coinsAdded: 0 
      });
    }

    const topupSnap = await db.ref(`topups/${userKey}/${orderId}`).once('value');
    if (!topupSnap.exists()) {
      return res.json({ status: "NOT_FOUND", credited: false, coinsAdded: 0 });
    }

    const topup = topupSnap.val();
    res.json({
      status: topup.status || "PENDING",
      credited: topup.credited || false,
      coinsAdded: topup.coinsAdded || 0,  // Returns 10 for ₹10
      amount: topup.amount || 0,          // ₹10
      rupeesPaid: topup.rupeesPaid || topup.amount || 0
    });
  } catch (e) {
    res.status(500).json({ status: "ERROR", credited: false, coinsAdded: 0 });
  }
});

export default router;
