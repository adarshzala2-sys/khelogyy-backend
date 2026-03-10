import dotenv from "dotenv";
dotenv.config();

import express from "express";
import cors from "cors";
import paymentsRoute from "./src/routes/payments.js";

const app = express();

// 🔥 CORS
app.use(cors({
  origin: process.env.CORS_ORIGIN || "*",
  methods: ["GET", "POST", "PUT", "DELETE"],
  allowedHeaders: ["Content-Type", "Authorization"],
}));

// 🔥 WEBHOOK RAW BODY (ZapUPI)
app.use("/api/payments/zapupi/webhook", express.raw({
  type: "*/*"
}));

// 🔥 JSON PARSER
app.use(express.json({
  limit: "2mb",
  verify: (req, _res, buf) => {
    req.rawBody = buf?.toString("utf-8") || "";
  },
}));

app.use(express.urlencoded({ extended: true }));

// 🔥 ROUTES
app.use("/api/payments", paymentsRoute);

// 🔥 HEALTH CHECK
app.get("/", (_req, res) => {
  res.send("🚀 Khelogy Backend Running");
});

app.get("/health", (_req, res) => {
  res.json({
    status: "OK",
    time: new Date().toISOString(),
    webhookReady: true
  });
});

// 🔥 PORT
const PORT = process.env.PORT || 5000;

app.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
  console.log(`🌐 Webhook URL: ${process.env.PUBLIC_BASE_URL}/api/payments/zapupi/webhook`);
});
