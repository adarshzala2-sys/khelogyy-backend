export async function createZapupiOrder({ userKey, amount, orderId, customerName, customerMobile }) {
  const form = new URLSearchParams();
  form.set("token_key", process.env.ZAPUPI_API_TOKEN);
  form.set("secret_key", process.env.ZAPUPI_SECRET_KEY);
  form.set("amount", String(amount));
  form.set("order_id", String(orderId));
  form.set("customer_ref", String(userKey).slice(-20));
  form.set("webhook_url", `${process.env.PUBLIC_BASE_URL}/api/payments/zapupi/webhook`);

  if (customerName) form.set("customer_name", String(customerName).slice(0, 50));
  if (customerMobile) form.set("customer_mobile", String(customerMobile));

  console.log("📤 ZapUPI Payload:", Object.fromEntries(form.entries()));

  const res = await fetch("https://api.zapupi.com/api/create-order", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: form.toString(),
  });

  const text = await res.text();
  let json;
  try {
    json = JSON.parse(text);
  } catch {
    throw new Error(`Invalid JSON from ZapUPI: ${text.slice(0, 200)}`);
  }

  console.log("📥 ZapUPI Response:", res.status, json);

  if (!res.ok || json.status === "error") {
    const err = new Error(`ZapUPI: ${json.message || 'Unknown error'}`);
    err.zapupi = json;
    throw err;
  }

  const paymentId = json.order_id || json.payment_id || orderId;
  const payLink = json.payment_url || json.pay_link || json.payLink || "";
  const qrCode = json.link_qrcode || json.payment_data || json.qr || "";

  if (!payLink) throw new Error("No payment_url from ZapUPI");

  return {
    paymentId,
    payLink,
    link_qrcode: qrCode,
    expiresAt: Date.now() + 300000,
    raw: json
  };
}

export function verifyWebhook(req) {
  return true; // Disable signature check for now
}
