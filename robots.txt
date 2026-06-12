// Vercel Serverless Function — prévia de link (Open Graph) por notícia
// Acesse via: /n/ID-DA-NOTICIA
// Robôs de redes sociais recebem HTML com meta tags da notícia.
// Pessoas são redirecionadas para o site normal (/?n=ID), que abre a matéria.

const SUPABASE_URL = process.env.VITE_SUPABASE_URL || "https://dzysyujkefksduusnkpb.supabase.co";
const SUPABASE_KEY = process.env.VITE_SUPABASE_KEY || "sb_publishable_foVjR4L0DXOt7c2k5-8JWw_dgZpTWu8";

const SEAL_LABELS = {
  PLANTAO: "Plantão", POLITICA: "Política", ECONOMIA: "Economia", CIDADES: "Cidades",
  ESPORTES: "Esportes", CULTURA: "Cultura", SAUDE: "Saúde", EDUCACAO: "Educação",
  SEGURANCA: "Segurança", TURISMO: "Turismo", OPINIAO: "Opinião", VERIFICADO: "Verificado",
};

function escapeHtml(s = "") {
  return String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}

function isBot(ua = "") {
  return /facebookexternalhit|Facebot|Twitterbot|WhatsApp|LinkedInBot|Slackbot|TelegramBot|Discordbot|Pinterest|Googlebot|bingbot|redditbot|Embedly|vkShare|W3C_Validator|baiduspider|Applebot|SkypeUriPreview/i.test(ua);
}
function isSearchEngine(ua = "") {
  // buscadores: devem indexar o conteúdo, não ser redirecionados
  return /Googlebot|bingbot|Applebot|baiduspider|DuckDuckBot|YandexBot|Google-InspectionTool|Storebot-Google/i.test(ua);
}

export default async function handler(req, res) {
  const host = req.headers.host || "www.ocatarina.com.br";
  const proto = (req.headers["x-forwarded-proto"] || "https").split(",")[0];
  const origin = `${proto}://${host}`;

  // extrair id de /n/ID  (ou ?id=)
  const urlPath = (req.url || "").split("?")[0];
  let id = urlPath.replace(/^\/n\//, "").replace(/\/$/, "");
  if (!id || id === "/n") {
    const u = new URL(req.url, origin);
    id = u.searchParams.get("id") || "";
  }
  id = decodeURIComponent(id);

  const ua = req.headers["user-agent"] || "";
  const articleUrl = `${origin}/?n=${encodeURIComponent(id)}`;

  // pessoa (não-bot): manda direto pro site, que abre o modal da notícia
  if (!isBot(ua)) {
    res.writeHead(302, { Location: articleUrl });
    return res.end();
  }

  // bot: busca a notícia e devolve HTML com Open Graph
  let n = null;
  try {
    const r = await fetch(`${SUPABASE_URL}/rest/v1/noticias?id=eq.${encodeURIComponent(id)}&status=eq.published&select=*`, {
      headers: { apikey: SUPABASE_KEY, Authorization: `Bearer ${SUPABASE_KEY}` },
    });
    const data = await r.json();
    n = Array.isArray(data) ? data[0] : null;
  } catch (e) { n = null; }

  const siteName = "O Catarina";
  const fallbackDesc = "Informação de Catarina, para Catarina.";
  const title = n ? escapeHtml(n.title) : siteName;
  const seal = n && SEAL_LABELS[n.seal] ? SEAL_LABELS[n.seal] : "";
  const desc = n ? escapeHtml(n.summary || fallbackDesc) : fallbackDesc;
  const image = n && n.photo ? n.photo : `${origin}/og-default.png`;
  const fullTitle = n ? `${title}${seal ? " · " + seal : ""} — ${siteName}` : siteName;
  const author = n && n.author ? escapeHtml(n.author) : "Redação O Catarina";
  const published = n && n.publish_at ? new Date(n.publish_at).toISOString() : "";
  const modified = n && (n.updated_at || n.publish_at) ? new Date(n.updated_at || n.publish_at).toISOString() : "";
  const section = seal || "Notícias";
  const canonical = `${origin}/n/${encodeURIComponent(id)}`;

  // dados estruturados Schema.org (NewsArticle) — ajuda o Google a entender e destacar
  const jsonLd = n ? JSON.stringify({
    "@context": "https://schema.org",
    "@type": "NewsArticle",
    "headline": n.title,
    "description": n.summary || fallbackDesc,
    "image": [image],
    "datePublished": published,
    "dateModified": modified,
    "articleSection": section,
    "author": { "@type": "Organization", "name": author },
    "publisher": {
      "@type": "NewsMediaOrganization",
      "name": siteName,
      "logo": { "@type": "ImageObject", "url": `${origin}/og-default.png` }
    },
    "mainEntityOfPage": { "@type": "WebPage", "@id": canonical },
    "url": canonical,
    "inLanguage": "pt-BR"
  }) : null;

  const html = `<!DOCTYPE html>
<html lang="pt-BR">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>${fullTitle}</title>
<meta name="description" content="${desc}">
<link rel="canonical" href="${canonical}">
<meta name="robots" content="index, follow, max-image-preview:large">
<meta property="og:type" content="article">
<meta property="og:site_name" content="${siteName}">
<meta property="og:title" content="${fullTitle}">
<meta property="og:description" content="${desc}">
<meta property="og:image" content="${escapeHtml(image)}">
<meta property="og:url" content="${canonical}">
<meta property="og:locale" content="pt_BR">
${published ? `<meta property="article:published_time" content="${published}">` : ""}
${modified ? `<meta property="article:modified_time" content="${modified}">` : ""}
${seal ? `<meta property="article:section" content="${escapeHtml(seal)}">` : ""}
<meta name="twitter:card" content="summary_large_image">
<meta name="twitter:title" content="${fullTitle}">
<meta name="twitter:description" content="${desc}">
<meta name="twitter:image" content="${escapeHtml(image)}">
${jsonLd ? `<script type="application/ld+json">${jsonLd}</script>` : ""}
${isSearchEngine(ua) ? "" : `<meta http-equiv="refresh" content="0; url=${articleUrl}">`}
</head>
<body>
<article>
<h1>${title}</h1>
${n && n.summary ? `<p><strong>${desc}</strong></p>` : ""}
${n && n.body ? `<div>${escapeHtml(n.body).split("\n").filter(Boolean).map(p => `<p>${p}</p>`).join("")}</div>` : ""}
<p>${author}${n && n.city ? " · " + escapeHtml(n.city) : ""}</p>
<p><a href="${articleUrl}">Ler em ${siteName}</a></p>
</article>
</body>
</html>`;

  res.setHeader("Content-Type", "text/html; charset=utf-8");
  res.setHeader("Cache-Control", "public, max-age=300, s-maxage=600");
  return res.status(200).send(html);
}
