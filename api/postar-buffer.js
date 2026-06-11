// Vercel Serverless Function — cria post no Buffer (Instagram)
// Recebe { imageUrl, caption, when } e cria o update no Buffer.
// A chave fica na variável de ambiente BUFFER_ACCESS_TOKEN (NUNCA no código).
//
// when: "now" publica imediatamente | ISO date agenda para a data/hora
//
// Observação: o Buffer usa a API REST clássica (api.bufferapp.com/1).
// Endpoints usados:
//   GET  /1/profiles.json                 -> lista canais conectados
//   POST /1/updates/create.json           -> cria o post

const BUFFER_TOKEN = process.env.BUFFER_ACCESS_TOKEN || "";
const BUFFER_BASE = "https://api.bufferapp.com/1";

export default async function handler(req, res) {
  if (req.method !== "POST") {
    res.setHeader("Allow", "POST");
    return res.status(405).json({ error: "Método não permitido." });
  }
  if (!BUFFER_TOKEN) {
    return res.status(500).json({ error: "Chave do Buffer não configurada no servidor (BUFFER_ACCESS_TOKEN)." });
  }

  // corpo
  let body = req.body;
  if (typeof body === "string") { try { body = JSON.parse(body); } catch { body = {}; } }
  const { imageUrl, caption, when } = body || {};

  if (!imageUrl) return res.status(400).json({ error: "Falta a imagem (imageUrl)." });
  if (!caption || !caption.trim()) return res.status(400).json({ error: "Falta a legenda." });

  try {
    // 1) achar o canal do Instagram
    const profRes = await fetch(`${BUFFER_BASE}/profiles.json?access_token=${encodeURIComponent(BUFFER_TOKEN)}`);
    const profiles = await profRes.json();
    if (!Array.isArray(profiles)) {
      return res.status(502).json({ error: "Não foi possível listar os canais do Buffer.", detail: profiles });
    }
    const insta = profiles.find(p => (p.service || "").toLowerCase() === "instagram") || profiles[0];
    if (!insta) return res.status(404).json({ error: "Nenhum canal do Instagram encontrado no Buffer." });

    // 2) montar o corpo do update
    const params = new URLSearchParams();
    params.append("access_token", BUFFER_TOKEN);
    params.append("profile_ids[]", insta.id);
    params.append("text", caption);
    params.append("media[photo]", imageUrl);
    params.append("media[thumbnail]", imageUrl);

    if (when && when !== "now") {
      // agendar: Buffer aceita scheduled_at em ISO/epoch
      const ts = Math.floor(new Date(when).getTime() / 1000);
      if (ts && !isNaN(ts)) params.append("scheduled_at", String(ts));
    } else {
      params.append("now", "true");
    }

    const postRes = await fetch(`${BUFFER_BASE}/updates/create.json`, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: params.toString(),
    });
    const result = await postRes.json();

    if (!postRes.ok || result.success === false) {
      return res.status(502).json({ error: result.message || "Buffer recusou o post.", detail: result });
    }

    return res.status(200).json({
      ok: true,
      scheduled: !(when === "now" || !when),
      channel: insta.formatted_username || insta.service_username || "Instagram",
      buffer: result,
    });
  } catch (e) {
    return res.status(500).json({ error: "Falha ao chamar o Buffer: " + (e.message || "erro desconhecido") });
  }
}
