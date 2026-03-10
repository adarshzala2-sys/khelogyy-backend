import dotenv from "dotenv";
dotenv.config();

import express from "express";
import cors from "cors";
import paymentsRoute from "./src/routes/payments.js";

const app = express();

// 🔥 1. CORS
app.use(cors({
  origin: "*",
  methods: ["GET", "POST", "PUT", "DELETE"],
  allowedHeaders: ["Content-Type", "Authorization"],
}));

// 🔥 2. WEBHOOK RAW BODY (CRITICAL ORDER)
app.use('/api/payments/zapupi/webhook', express.raw({ type: '*/*' }));

// 🔥 3. JSON PARSER (OTHERS)
app.use(express.json({ limit: "2mb" }));
app.use(express.urlencoded({ extended: true }));

// 🔥 ROUTES
app.use("/api/payments", paymentsRoute);

app.get("/", (req, res) => res.send("🚀 Khelogy Backend OK ✅"));
app.get("/health", (req, res) => res.json({ status: "OK", time: new Date().toISOString() }));

const port = process.env.PORT || 5000;
app.listen(port, () => {
  console.log(`🚀 Server: http://localhost:${port}`);
  console.log(`🌐 Webhook: ${process.env.PUBLIC_BASE_URL}/api/payments/zapupi/webhook`);
});
