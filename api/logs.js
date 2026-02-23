// api/logs.js
import { kv } from "@vercel/kv";

// Mỗi thiết bị/user có thể dùng 1 key.
// Tạm thời: dùng "default" để chạy ngay.
// Nếu sau này bạn làm login, bạn chỉ cần thay userId theo session/email.
const keyOf = (userId = "default") => `ieltsflow:logs:${userId}`;

export default async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET, POST, DELETE, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");

  if (req.method === "OPTIONS") return res.status(200).end();

  const userId = (req.query?.user || "default").toString();
  const kvKey = keyOf(userId);

  try {
    if (req.method === "GET") {
      const logs = (await kv.get(kvKey)) || [];
      return res.status(200).json({ ok: true, logs });
    }

    if (req.method === "POST") {
      const { logs } = req.body || {};
      if (!Array.isArray(logs)) {
        return res.status(400).json({ ok: false, error: "Body must include { logs: [] }" });
      }
      // Giới hạn tránh quá lớn (tuỳ bạn)
      const trimmed = logs.slice(0, 1000);
      await kv.set(kvKey, trimmed);
      return res.status(200).json({ ok: true, saved: trimmed.length });
    }

    if (req.method === "DELETE") {
      await kv.del(kvKey);
      return res.status(200).json({ ok: true });
    }

    return res.status(405).json({ ok: false, error: "Method not allowed" });
  } catch (err) {
    return res.status(500).json({ ok: false, error: "Server error", details: String(err) });
  }
}
