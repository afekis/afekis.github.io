// AFEKS — AI server (Cloudflare Worker)
// Gemini kaliti shu serverda yashirin turadi (Settings → Variables → GEMINI_API_KEY).
// Sayt (afekis.github.io/tryon) rasmlarni shu yerga yuboradi, server esa Gemini'dan javob olib qaytaradi.

const ALLOWED_ORIGINS = ["https://afekis.github.io"];
const MODELS = ["gemini-3.1-flash-image", "gemini-3.1-flash-image-preview", "gemini-2.5-flash-image"];
const MAX_BODY = 6 * 1024 * 1024; // 6 MB

export default {
  async fetch(request, env) {
    const origin = request.headers.get("Origin") || "";
    const allowed = ALLOWED_ORIGINS.includes(origin);
    const cors = {
      "Access-Control-Allow-Origin": allowed ? origin : ALLOWED_ORIGINS[0],
      "Access-Control-Allow-Methods": "POST, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type",
      "Vary": "Origin"
    };
    const json = (obj, status = 200) => new Response(JSON.stringify(obj), { status, headers: { ...cors, "Content-Type": "application/json" } });

    if (request.method === "OPTIONS") return new Response(null, { status: 204, headers: cors });
    if (request.method === "GET") return json({ ok: true, service: "afeks-ai" });
    if (request.method !== "POST") return json({ error: "Faqat POST" }, 405);
    if (!allowed) return json({ error: "Bu sayt uchun ruxsat yo'q" }, 403);
    if (!env.GEMINI_API_KEY) return json({ error: "Serverda GEMINI_API_KEY sozlanmagan" }, 500);
    if (Number(request.headers.get("Content-Length") || 0) > MAX_BODY) return json({ error: "Rasm juda katta" }, 413);

    let body;
    try { body = await request.json(); } catch { return json({ error: "Noto'g'ri so'rov" }, 400); }
    const { prompt, person, ref } = body || {};
    if (typeof prompt !== "string" || typeof person !== "string" || typeof ref !== "string" || prompt.length > 2000)
      return json({ error: "Noto'g'ri so'rov" }, 400);

    for (const model of MODELS) {
      const r = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`, {
        method: "POST",
        headers: { "Content-Type": "application/json", "x-goog-api-key": env.GEMINI_API_KEY },
        body: JSON.stringify({
          contents: [{ parts: [
            { text: prompt },
            { inline_data: { mime_type: "image/jpeg", data: person } },
            { inline_data: { mime_type: "image/jpeg", data: ref } }
          ] }],
          generationConfig: { responseModalities: ["IMAGE", "TEXT"] }
        })
      });
      if (r.status === 404) continue;
      const j = await r.json().catch(() => ({}));
      if (!r.ok) {
        const msg = (j.error && j.error.message) || r.statusText;
        return json({ error: r.status === 429 ? "Limit tugadi, birozdan keyin urinib ko'ring." : msg }, r.status);
      }
      const part = (j.candidates?.[0]?.content?.parts || []).find(p => p.inlineData || p.inline_data);
      if (!part) return json({ error: "AI rasm qaytarmadi. Boshqa rasm bilan urinib ko'ring." }, 502);
      const d = part.inlineData || part.inline_data;
      return json({ mime: d.mimeType || d.mime_type || "image/png", data: d.data });
    }
    return json({ error: "Gemini rasm modeli topilmadi" }, 502);
  }
};
