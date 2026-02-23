// api/ai-suggestion.js
// Vercel Serverless Function (Node runtime)
// ✅ Put OPENAI_API_KEY in Vercel ENV settings (Production + Preview + Development)
// ✅ Frontend calls POST /api/ai-suggestion
// ✅ No API key exposed to client

export default async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");

  if (req.method === "OPTIONS") return res.status(200).end();
  if (req.method !== "POST") return res.status(405).json({ ok: false, error: "Method not allowed" });

  try {
    const { logs = [], userGoal = "Improve IELTS overall", band = "5.0→6.0" } = req.body || {};

    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) return res.status(500).json({ ok: false, error: "Missing OPENAI_API_KEY on server" });

    const shortLogs = Array.isArray(logs) ? logs.slice(0, 30) : [];

    const prompt = `
You are an IELTS coach.
User goal: ${userGoal}
Current band target: ${band}

Study logs (latest first):
${shortLogs.map((x, i) => `${i + 1}. [${x.date}] ${x.skill} - ${x.time} minutes - ${x.content}`).join("\n")}

Task:
1) Suggest ONE best next study activity for today.
2) Output as JSON with keys: skill, title, instruction, estimated_minutes, reason, followup_checklist (array).
3) Keep instruction concise, actionable. Focus on IELTS tasks and vocabulary/collocations.
`;

    const r = await fetch("https://api.openai.com/v1/responses", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${apiKey}`
      },
      body: JSON.stringify({
        model: "gpt-4.1-mini",
        input: prompt,
        temperature: 0.7
      })
    });

    const data = await r.json();
    if (!r.ok) {
      return res.status(r.status).json({ ok: false, error: "OpenAI error", details: data });
    }

    const text =
      data.output_text ||
      (data.output?.[0]?.content?.[0]?.text) ||
      "";

    let parsed = null;
    try { parsed = JSON.parse(text); } catch {}

    return res.status(200).json({
      ok: true,
      raw: text,
      suggestion: parsed
    });

  } catch (err) {
    return res.status(500).json({ ok: false, error: "Server error", details: String(err) });
  }
}
