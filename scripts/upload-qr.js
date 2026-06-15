#!/usr/bin/env node
/**
 * Upload QR codes to seller profile
 *
 * Usage:
 *   node scripts/upload-qr.js wechat path/to/wechat-qr.png
 *   node scripts/upload-qr.js alipay path/to/alipay-qr.png
 *
 * This converts an image to base64 and uploads it via the seller API.
 * Run this while the server is running: npm run server:dev
 */
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const [,, method, filePath] = process.argv;

if (!method || !filePath) {
  console.log("Usage: node scripts/upload-qr.js <wechat|alipay> <image-path>");
  console.log("Example: node scripts/upload-qr.js wechat C:/Users/018032/Desktop/wechat-qr.png");
  process.exit(1);
}

if (!["wechat", "alipay"].includes(method)) {
  console.error("Error: method must be 'wechat' or 'alipay'");
  process.exit(1);
}

const absPath = resolve(filePath);
let base64;

try {
  const buffer = readFileSync(absPath);
  const ext = absPath.split(".").pop()?.toLowerCase() ?? "png";
  const mime = ext === "jpg" || ext === "jpeg" ? "image/jpeg" : "image/png";
  base64 = `data:${mime};base64,${buffer.toString("base64")}`;
  console.log(`✅ Read ${(buffer.length / 1024).toFixed(1)}KB from ${absPath}`);
} catch (e) {
  console.error(`❌ Cannot read file: ${absPath}`);
  console.error(e.message);
  process.exit(1);
}

// Upload to server
const PORT = process.env.RFS_SERVER_PORT ?? "3001";
const url = `http://127.0.0.1:${PORT}/api/v1/seller/upload-qr`;

console.log(`📤 Uploading ${method} QR to ${url}...`);

try {
  const response = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      id: "@redskill",
      method,
      qrData: base64,
    }),
  });
  const data = await response.json();
  if (data.success) {
    console.log(`✅ ${method === "wechat" ? "微信" : "支付宝"}收款码已上传 (${(base64.length / 1024).toFixed(0)}KB)`);
  } else {
    console.error("❌ Upload failed:", data.message || JSON.stringify(data));
  }
} catch (e) {
  console.error("❌ Cannot connect to server. Start it first:");
  console.error("   npm run server:dev");
  process.exit(1);
}
