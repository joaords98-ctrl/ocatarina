// Vercel Serverless Function — sitemap.xml dinâmico
// Lista a home + todas as notícias publicadas, sempre atualizado a partir do Supabase.
// Acessível em /sitemap.xml

const SUPABASE_URL = process.env.VITE_SUPABASE_URL || "https://dzysyujkefksduusnkpb.supabase.co";
const SUPABASE_KEY = process.env.VITE_SUPABASE_KEY || "sb_publishable_foVjR4L0DXOt7c2k5-8JWw_dgZpTWu8";

export default async function handler(req, res) {
  const host = req.headers.host || "www.ocatarina.com.br";
  const proto = (req.headers["x-forwarded-proto"] || "https").split(",")[0];
  const origin = `${proto}://${host}`;

  let noticias = [];
  try {
    const r = await fetch(
      `${SUPABASE_URL}/rest/v1/noticias?status=eq.published&select=id,updated_at,publish_at&order=publish_at.desc&limit=1000`,
      { headers: { apikey: SUPABASE_KEY, Authorization: `Bearer ${SUPABASE_KEY}` } }
    );
    const data = await r.json();
    if (Array.isArray(data)) noticias = data;
  } catch (e) { noticias = []; }

  const esc = (s = "") => String(s).replace(/&/g, "&amp;");
  const iso = (d) => { try { return new Date(d).toISOString(); } catch { return new Date().toISOString(); } };

  const urls = [
    `  <url>\n    <loc>${origin}/</loc>\n    <changefreq>hourly</changefreq>\n    <priority>1.0</priority>\n  </url>`,
    `  <url>\n    <loc>${origin}/quem-somos</loc>\n    <changefreq>monthly</changefreq>\n    <priority>0.5</priority>\n  </url>`,
    `  <url>\n    <loc>${origin}/principios</loc>\n    <changefreq>monthly</changefreq>\n    <priority>0.5</priority>\n  </url>`,
    `  <url>\n    <loc>${origin}/contato</loc>\n    <changefreq>monthly</changefreq>\n    <priority>0.5</priority>\n  </url>`,
    ...noticias.map(n =>
      `  <url>\n    <loc>${esc(origin + "/n/" + n.id)}</loc>\n    <lastmod>${iso(n.updated_at || n.publish_at)}</lastmod>\n    <changefreq>daily</changefreq>\n    <priority>0.8</priority>\n  </url>`
    ),
  ];

  const xml = `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urls.join("\n")}\n</urlset>`;

  res.setHeader("Content-Type", "application/xml; charset=utf-8");
  res.setHeader("Cache-Control", "public, max-age=600, s-maxage=1200");
  return res.status(200).send(xml);
}
