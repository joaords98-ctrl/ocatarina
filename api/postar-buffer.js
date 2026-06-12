// Vercel Serverless Function — cria post no Buffer (Instagram) via API GraphQL nova
// API: https://api.buffer.com  (Bearer token = BUFFER_ACCESS_TOKEN)
// Suporta imagem por URL pública (a arte salva no Supabase).
//
// Fluxo: organizations -> channels(orgId) -> createPost(channelId, text, assets[image])
//
// body: { imageUrl, caption, when }
//   when: "now" => addToQueue (próximo horário) | ISO date => customScheduled

const BUFFER_TOKEN = process.env.BUFFER_ACCESS_TOKEN || "";
const BUFFER_API = "https://api.buffer.com";

async function gql(query, token) {
  const r = await fetch(BUFFER_API, {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
    body: JSON.stringify({ query }),
  });
  const j = await r.json();
  return { ok: r.ok, json: j };
}

export default async function handler(req, res) {
  if (req.method !== "POST") {
    res.setHeader("Allow", "POST");
    return res.status(405).json({ error: "Método não permitido." });
  }
  if (!BUFFER_TOKEN) {
    return res.status(500).json({ error: "Chave do Buffer não configurada no servidor (BUFFER_ACCESS_TOKEN)." });
  }

  let body = req.body;
  if (typeof body === "string") { try { body = JSON.parse(body); } catch { body = {}; } }
  const { imageUrl, caption, when, igType } = body || {};

  if (!imageUrl) return res.status(400).json({ error: "Falta a imagem (imageUrl)." });
  if (!caption || !caption.trim()) return res.status(400).json({ error: "Falta a legenda." });

  // tipo de post do Instagram: post (feed) | story | reel
  const TYPE = ["post", "story", "reel"].includes(igType) ? igType : "post";
  const shareToFeed = "true"; // post e reel aparecem no feed; obrigatório no schema

  // escapa aspas/quebras para inserir no corpo GraphQL
  const esc = (s) => String(s).replace(/\\/g, "\\\\").replace(/"/g, '\\"').replace(/\n/g, "\\n");

  try {
    // 1) organizações (aninhadas em account)
    const orgQ = `query { account { organizations { id name } } }`;
    const orgR = await gql(orgQ, BUFFER_TOKEN);
    const orgs = orgR.json?.data?.account?.organizations;
    if (!Array.isArray(orgs) || !orgs.length) {
      return res.status(502).json({ error: "Não foi possível obter sua organização no Buffer.", detail: orgR.json });
    }
    const orgId = orgs[0].id;

    // 2) canais da organização
    const chQ = `query { channels(input: { organizationId: "${orgId}" }) { id service displayName name } }`;
    const chR = await gql(chQ, BUFFER_TOKEN);
    const channels = chR.json?.data?.channels;
    if (!Array.isArray(channels) || !channels.length) {
      return res.status(502).json({ error: "Nenhum canal encontrado no Buffer.", detail: chR.json });
    }
    const insta = channels.find(c => (c.service || "").toLowerCase() === "instagram") || channels[0];
    if (!insta) return res.status(404).json({ error: "Canal do Instagram não encontrado no Buffer." });

    // 3) montar createPost
    let scheduling, dueLine = "";
    if (when && when !== "now") {
      const iso = new Date(when).toISOString();
      scheduling = "customScheduled";
      dueLine = `dueAt: "${iso}"`;
    } else {
      // "publicar agora": agenda para +1 min (a API não tem modo imediato; assim sai quase na hora)
      const soon = new Date(Date.now() + 60 * 1000).toISOString();
      scheduling = "customScheduled";
      dueLine = `dueAt: "${soon}"`;
    }

    const mutation = `
mutation {
  createPost(input: {
    text: "${esc(caption)}"
    channelId: "${insta.id}"
    schedulingType: automatic
    mode: ${scheduling}
    ${dueLine}
    assets: [ { image: { url: "${esc(imageUrl)}" } } ]
    metadata: { instagram: { type: ${TYPE}, shouldShareToFeed: ${shareToFeed} } }
  }) {
    ... on PostActionSuccess { post { id dueAt } }
    ... on MutationError { message }
  }
}`.trim();

    const postR = await gql(mutation, BUFFER_TOKEN);
    const payload = postR.json?.data?.createPost;

    // erro GraphQL (sintaxe/permissão)
    if (postR.json?.errors?.length) {
      return res.status(502).json({ error: "GraphQL: " + (postR.json.errors[0]?.message || "erro"), detail: postR.json.errors });
    }
    // erro de mutação (limite, validação)
    if (payload && payload.message && !payload.post) {
      return res.status(502).json({ error: payload.message, tipo: TYPE, debug: JSON.stringify(postR.json).slice(0, 500) });
    }
    if (!payload || !payload.post) {
      return res.status(502).json({ error: "O Buffer não confirmou a criação do post.", debug: JSON.stringify(postR.json).slice(0, 500) });
    }

    return res.status(200).json({
      ok: true,
      scheduled: scheduling === "customScheduled",
      channel: insta.displayName || insta.name || "Instagram",
      postId: payload.post.id,
    });
  } catch (e) {
    return res.status(500).json({ error: "Falha ao chamar o Buffer: " + (e.message || "erro desconhecido") });
  }
}
