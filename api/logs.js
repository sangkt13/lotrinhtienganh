// api/logs.js
import { put, del, head } from "@vercel/blob";

const pathnameOf = (userId = "default") => `ieltsflow/logs/${userId}.json`;

async function readJsonBody(req) {
  // Vercel có thể đã parse sẵn:
  if (req.body && typeof req.body === "object") return req.body;

  // Parse thủ công:
  const chunks = [];
  for await (const chunk of req) chunks.push(chunk);
  const raw = Buffer.concat(chunks).toString("utf8");

  if (!raw) return {};
  try {
    return JSON.parse(raw);
  } catch {
    throw new Error("Invalid JSON body");
  }
}

export default async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET, POST, DELETE, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");

  if (req.method === "OPTIONS") return res.status(200).end();

  const userId = (req.query?.user || "default").toString();
  const pathname = pathnameOf(userId);

  try {
    // GET
    if (req.method === "GET") {
      let info;
      try {
        info = await head(pathname);
      } catch {
        return res.status(200).json({ ok: true, logs: [], exists: false });
      }

      const r = await fetch(info.url);
      const text = await r.text();

      let logs = [];
      try {
        const data = JSON.parse(text);
        logs = Array.isArray(data) ? data : (Array.isArray(data.logs) ? data.logs : []);
      } catch {
        logs = [];
      }

      return res.status(200).json({ ok: true, logs, exists: true, url: info.url });
    }

    // POST
    if (req.method === "POST") {
      const body = await readJsonBody(req);
      const logs = body?.logs;

      if (!Array.isArray(logs)) {
        return res.status(400).json({ ok: false, error: "Body must include { logs: [] }" });
      }

      const trimmed = logs.slice(0, 2000);
      const json = JSON.stringify(trimmed);

      const blob = await put(pathname, json, {
        access: "public",
        contentType: "application/json",
        addRandomSuffix: false
      });

      return res.status(200).json({ ok: true, saved: trimmed.length, url: blob.url });
    }

    // DELETE
    if (req.method === "DELETE") {
      try { await del(pathname); } catch {}
      return res.status(200).json({ ok: true });
    }

    return res.status(405).json({ ok: false, error: "Method not allowed" });
  } catch (err) {
    // QUAN TRỌNG: luôn trả JSON
    return res.status(500).json({
      ok: false,
      error: "Server error",
      details: String(err?.message || err)
    });
  }
}
