import React, { useState, useEffect, useRef, useCallback } from "react";
import { createClient } from "@supabase/supabase-js";

/* ============================================================
   O CATARINA — Portal + Redação (Supabase)
   Login da equipe · banco compartilhado · publicação ao vivo
   ============================================================ */

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL || "https://dzysyujkefksduusnkpb.supabase.co";
const SUPABASE_KEY = import.meta.env.VITE_SUPABASE_KEY || "sb_publishable_foVjR4L0DXOt7c2k5-8JWw_dgZpTWu8";

const PINHEIRO = "#0E3B2E", PINHEIRO_DEEP = "#0a2c22", MAR = "#1D9E75",
  MAR_BRIGHT = "#5fd6ac", VERMELHO = "#C0392B", AREIA = "#F7F6F1", TINTA = "#1A1A18";
const SERIF = "'Lora', Georgia, serif";
const SANS = "'Libre Franklin', Helvetica, Arial, sans-serif";

const SEALS = {
  PLANTAO: { label: "Plantão", bg: VERMELHO, fg: "#fff" },
  POLITICA: { label: "Política", bg: MAR, fg: "#fff" },
  ECONOMIA: { label: "Economia", bg: "rgba(29,158,117,.14)", fg: PINHEIRO, border: "rgba(29,158,117,.45)" },
  CIDADES: { label: "Cidades", bg: "rgba(14,59,46,.1)", fg: PINHEIRO, border: "rgba(14,59,46,.3)" },
  ESPORTES: { label: "Esportes", bg: "rgba(29,158,117,.14)", fg: PINHEIRO, border: "rgba(29,158,117,.45)" },
  CULTURA: { label: "Cultura", bg: "rgba(29,158,117,.14)", fg: PINHEIRO, border: "rgba(29,158,117,.45)" },
  SAUDE: { label: "Saúde", bg: "rgba(29,158,117,.14)", fg: PINHEIRO, border: "rgba(29,158,117,.45)" },
  EDUCACAO: { label: "Educação", bg: "rgba(29,158,117,.14)", fg: PINHEIRO, border: "rgba(29,158,117,.45)" },
  SEGURANCA: { label: "Segurança", bg: "rgba(14,59,46,.1)", fg: PINHEIRO, border: "rgba(14,59,46,.3)" },
  TURISMO: { label: "Turismo", bg: "rgba(29,158,117,.14)", fg: PINHEIRO, border: "rgba(29,158,117,.45)" },
  OPINIAO: { label: "Opinião", bg: "rgba(14,59,46,.1)", fg: PINHEIRO, border: "rgba(14,59,46,.3)" },
  VERIFICADO: { label: "Verificado", bg: PINHEIRO, fg: MAR_BRIGHT, check: true },
};

function Symbol({ size = 48, ring = MAR_BRIGHT, w1 = MAR, w2 = "#7d9b8f" }) {
  return (
    <svg width={size} height={size} viewBox="0 0 100 100" style={{ display: "block", flex: "none" }}>
      <circle cx="50" cy="50" r="46" fill="none" stroke={ring} strokeWidth="2.2" />
      <circle cx="50" cy="32" r="6.4" fill={VERMELHO} />
      <path d="M30 58 Q40 49 50 56 T72 50" fill="none" stroke={w1} strokeWidth="6.5" strokeLinecap="round" />
      <path d="M30 67 Q40 60 50 65 T70 61" fill="none" stroke={w2} strokeWidth="6.5" strokeLinecap="round" />
    </svg>
  );
}
function Seal({ type, style }) {
  const s = SEALS[type] || SEALS.POLITICA;
  return (
    <span style={{ display: "inline-flex", alignItems: "center", gap: 6, fontFamily: SANS, fontSize: 11, fontWeight: 700, letterSpacing: ".13em", textTransform: "uppercase", padding: "5px 11px", borderRadius: 4, background: s.bg, color: s.fg, border: s.border ? `1px solid ${s.border}` : "none", ...style }}>
      {s.check ? "✓ " : ""}{s.label}
    </span>
  );
}
// renderiza **negrito** dentro de um parágrafo
function renderBold(text) {
  const parts = (text || "").split(/(\*\*[^*]+\*\*)/g);
  return parts.map((p, i) => {
    if (p.startsWith("**") && p.endsWith("**")) {
      return <strong key={i} style={{ fontWeight: 700 }}>{p.slice(2, -2)}</strong>;
    }
    return <React.Fragment key={i}>{p}</React.Fragment>;
  });
}
function timeAgo(ts) {
  const diff = Date.now() - new Date(ts).getTime();
  if (diff < 0) return "agendada";
  const m = Math.floor(diff / 6e4);
  if (m < 1) return "agora"; if (m < 60) return `há ${m} min`;
  const h = Math.floor(m / 60); if (h < 24) return `há ${h}h`;
  return `há ${Math.floor(h / 24)}d`;
}

// camelCase <-> snake_case do banco
const fromRow = r => ({ id: r.id, title: r.title, summary: r.summary, body: r.body, seal: r.seal, city: r.city, author: r.author, photo: r.photo, featured: r.featured, status: r.status, publishAt: r.publish_at, createdAt: r.created_at });
const toRow = a => ({ title: a.title, summary: a.summary, body: a.body, seal: a.seal, city: a.city, author: a.author, photo: a.photo, featured: a.featured, status: a.status, publish_at: a.publishAt });

const emptyForm = { id: null, title: "", summary: "", body: "", seal: "POLITICA", city: "", author: "Redação O Catarina", photo: "", featured: false, scheduleOn: false, publishAt: "" };

function todayStr() {
  try {
    const d = new Date().toLocaleDateString("pt-BR", { weekday: "long", day: "numeric", month: "long", year: "numeric" });
    return d.charAt(0).toUpperCase() + d.slice(1) + " · Santa Catarina";
  } catch { return "Santa Catarina"; }
}

// Menu fixo de categorias + ticker de plantão
const MENU_CATS = ["POLITICA", "ECONOMIA", "CIDADES", "ESPORTES", "CULTURA"];
function CategoryNavAndTicker({ articles, catFilter, setCatFilter, setOpenArticle }) {
  const now = Date.now();
  const plantoes = articles.filter(a => a.seal === "PLANTAO" && a.status === "published" && new Date(a.publishAt).getTime() <= now);
  return (
    <>
      <div style={{ background: PINHEIRO, borderBottom: "1px solid rgba(95,214,172,.14)", position: "sticky", top: 0, zIndex: 39 }}>
        <div className="oc-pad oc-menu-scroll" style={{ maxWidth: 1180, margin: "0 auto", padding: "0 24px", display: "flex", gap: 2, overflowX: "auto" }}>
          <button onClick={() => setCatFilter(null)} className="oc-menu-item" style={menuStyle(!catFilter)}>Início</button>
          {MENU_CATS.map(c => (
            <button key={c} onClick={() => setCatFilter(c)} className="oc-menu-item" style={menuStyle(catFilter === c)}>{SEALS[c].label}</button>
          ))}
        </div>
      </div>
      {plantoes.length > 0 && (
        <div style={{ background: VERMELHO, color: "#fff", display: "flex", alignItems: "stretch", overflow: "hidden" }}>
          <div style={{ background: "rgba(0,0,0,.18)", fontWeight: 700, fontSize: 12, letterSpacing: ".14em", textTransform: "uppercase", padding: "11px 18px", display: "flex", alignItems: "center", gap: 8, flex: "none" }}>
            <span style={{ width: 7, height: 7, borderRadius: "50%", background: "#fff" }} /> Plantão
          </div>
          <div style={{ overflow: "hidden", flex: 1, display: "flex", alignItems: "center", position: "relative" }}>
            <div className="oc-ticker" style={{ display: "flex", gap: 40, whiteSpace: "nowrap", fontSize: 13.5, fontWeight: 500, paddingLeft: 24 }}>
              {[...plantoes, ...plantoes].map((p, i) => (
                <span key={i} onClick={() => setOpenArticle(p)} style={{ cursor: "pointer", display: "inline-flex", alignItems: "center", gap: 40 }}>
                  <span style={{ fontSize: 8, opacity: .6 }}>◆</span> {p.title}
                </span>
              ))}
            </div>
          </div>
        </div>
      )}
    </>
  );
}
function menuStyle(active) {
  return { background: "none", border: "none", cursor: "pointer", fontFamily: SANS, fontWeight: 600, fontSize: 13, letterSpacing: ".05em", textTransform: "uppercase", color: active ? "#fff" : "rgba(247,246,241,.72)", padding: "15px 16px", borderBottom: active ? `3px solid ${MAR}` : "3px solid transparent", whiteSpace: "nowrap" };
}

export default function App() {
  const [sb, setSb] = useState(null);
  const [netError, setNetError] = useState(false);
  const [session, setSession] = useState(null);
  const [articles, setArticles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [view, setView] = useState("redacao");
  const [openArticle, setOpenArticle] = useState(null);
  const [toast, setToast] = useState("");
  const [catFilter, setCatFilter] = useState(null);

  // Rota secreta da redação: só /redacao (qualquer caixa) revela o painel da equipe
  const isRedacaoRoute = typeof window !== "undefined" && /^\/redacao\/?$/i.test(window.location.pathname);
  const path = typeof window !== "undefined" ? window.location.pathname.replace(/\/$/, "").toLowerCase() : "";
  const staticPage = { "/quem-somos": "quem", "/principios": "principios", "/contato": "contato" }[path] || null;

  const flash = (m) => { setToast(m); setTimeout(() => setToast(""), 2800); };

  // inicializar cliente Supabase
  useEffect(() => {
    try {
      const client = createClient(SUPABASE_URL, SUPABASE_KEY);
      setSb(client);
      client.auth.getSession().then(({ data }) => setSession(data.session));
      const { data: sub } = client.auth.onAuthStateChange((_e, s) => setSession(s));
      return () => sub?.subscription?.unsubscribe?.();
    } catch {
      setNetError(true);
      setLoading(false);
    }
  }, []);

  const loadArticles = useCallback(async () => {
    if (!sb) return;
    setLoading(true);
    // logado: vê tudo; visitante: só publicadas (RLS já filtra, mas ordenamos aqui)
    let q = sb.from("noticias").select("*").order("publish_at", { ascending: false });
    const { data, error } = await q;
    if (error) { setNetError(true); setLoading(false); return; }
    setArticles((data || []).map(fromRow));
    setLoading(false);
  }, [sb]);

  useEffect(() => { if (sb) loadArticles(); }, [sb, session, loadArticles]);

  // abrir notícia direto pela URL ?n=ID (link compartilhado)
  useEffect(() => {
    if (!articles.length) return;
    const params = new URLSearchParams(window.location.search);
    const nid = params.get("n");
    if (nid) {
      const found = articles.find(x => String(x.id) === nid);
      if (found) setOpenArticle(found);
    }
  }, [articles]);

  // realtime: atualiza quando alguém da equipe publica
  useEffect(() => {
    if (!sb) return;
    const ch = sb.channel("noticias-rt")
      .on("postgres_changes", { event: "*", schema: "public", table: "noticias" }, () => loadArticles())
      .subscribe();
    return () => { sb.removeChannel(ch); };
  }, [sb, loadArticles]);

  async function saveArticle(form, status) {
    if (!form.title.trim()) { flash("⚠ A manchete é obrigatória."); return false; }
    let publishAt = new Date().toISOString();
    if (form.scheduleOn && form.publishAt) publishAt = new Date(form.publishAt).toISOString();
    const isScheduled = form.scheduleOn && new Date(publishAt).getTime() > Date.now();
    const finalStatus = status === "draft" ? "draft" : isScheduled ? "scheduled" : "published";
    const payload = toRow({ ...form, status: finalStatus, publishAt, city: form.city.trim() || "Santa Catarina", author: form.author.trim() || "Redação O Catarina" });

    // só um destaque por vez
    if (form.featured) await sb.from("noticias").update({ featured: false }).neq("id", form.id || "00000000-0000-0000-0000-000000000000");

    let res;
    if (form.id) res = await sb.from("noticias").update(payload).eq("id", form.id);
    else res = await sb.from("noticias").insert(payload);
    if (res.error) { flash("Erro ao salvar: " + res.error.message); return false; }
    flash(finalStatus === "draft" ? "💾 Rascunho salvo." : finalStatus === "scheduled" ? "🕒 Notícia agendada." : "✓ Publicado no portal!");
    await loadArticles();
    if (finalStatus === "published") setView("portal");
    return true;
  }
  async function delArticle(id) {
    if (!sb) return;
    const { error } = await sb.from("noticias").delete().eq("id", id);
    if (error) return flash("Erro ao excluir: " + error.message);
    flash("Notícia removida."); loadArticles();
  }
  async function publishNow(id) {
    const { error } = await sb.from("noticias").update({ status: "published", publish_at: new Date().toISOString() }).eq("id", id);
    if (error) return flash("Erro: " + error.message);
    flash("✓ Publicado no portal!"); loadArticles();
  }
  async function logout() { await sb.auth.signOut(); setView("portal"); flash("Sessão encerrada."); }

  const isTeam = !!session;
  // visão pública x equipe
  const now = Date.now();
  const visible = isTeam ? articles : articles.filter(a => a.status === "published" && new Date(a.publishAt).getTime() <= now);
  const liveAll = visible.filter(a => a.status === "published" && new Date(a.publishAt).getTime() <= now).sort((a, b) => new Date(b.publishAt) - new Date(a.publishAt));
  const live = catFilter ? liveAll.filter(a => a.seal === catFilter) : liveAll;
  const hero = live.find(a => a.featured) || live[0];
  const rest = live.filter(a => hero && a.id !== hero.id);

  if (netError) return <NetError />;

  return (
    <div style={{ fontFamily: SANS, color: TINTA, minHeight: "100vh", background: AREIA }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Lora:ital,wght@0,400;0,500;0,600;0,700;1,400&family=Libre+Franklin:wght@300;400;500;600;700&display=swap');
        *{box-sizing:border-box}
        .oc-input{font-family:${SANS};font-size:14px;width:100%;padding:11px 13px;border:1px solid rgba(14,59,46,.2);border-radius:9px;background:#fff;color:${TINTA};outline:none;transition:.2s}
        .oc-input:focus{border-color:${MAR};box-shadow:0 0 0 3px rgba(29,158,117,.12)}
        .oc-label{font-size:11px;font-weight:700;letter-spacing:.1em;text-transform:uppercase;color:${PINHEIRO};margin-bottom:6px;display:block}
        .oc-tab{cursor:pointer;border:none;background:none;font-family:${SANS};font-weight:600;font-size:13px;padding:9px 15px;border-radius:8px;color:rgba(247,246,241,.7);transition:.2s}
        .oc-tab.active{background:rgba(95,214,172,.16);color:#fff}
        .oc-btn{cursor:pointer;font-family:${SANS};font-weight:600;font-size:13.5px;border:none;border-radius:999px;padding:12px 22px;transition:.2s}
        .oc-card{transition:.25s}.oc-card:hover{transform:translateY(-3px);box-shadow:0 20px 38px -22px rgba(14,59,46,.4)}
        .chip{cursor:pointer;font-size:12px;font-weight:600;padding:7px 13px;border-radius:999px;border:1px solid rgba(14,59,46,.18);background:#fff;color:rgba(26,26,24,.7)}
        .chip.active{background:${PINHEIRO};color:#fff;border-color:${PINHEIRO}}
        .seal-pick{cursor:pointer;border:1.5px solid rgba(14,59,46,.18);background:#fff;border-radius:8px;padding:8px;display:flex;align-items:center;justify-content:center;transition:.18s}
        .seal-pick.sel{border-color:${MAR};box-shadow:0 0 0 3px rgba(29,158,117,.12)}
        .grid-2{display:grid;gap:30px;align-items:start}
        .portal-lede{grid-template-columns:minmax(0,1.9fr) minmax(0,1fr)}
        .redacao-grid{grid-template-columns:minmax(0,1.05fr) minmax(0,1fr)}
        @media(max-width:860px){
          .portal-lede,.redacao-grid{grid-template-columns:1fr !important}
          .oc-hero-title{font-size:30px !important}
          .oc-wordmark{font-size:19px !important}
          .oc-tagline{display:none}
        }
        @media(max-width:600px){
          .oc-pad{padding-left:16px !important;padding-right:16px !important}
          .oc-hero-pad{padding:22px 18px !important}
          .oc-hero-title{font-size:25px !important}
          .seal-grid{grid-template-columns:repeat(2,1fr) !important}
          .oc-grid-cards{grid-template-columns:1fr !important}
        }
        input,textarea,select{font-size:16px} /* evita zoom no iOS */
        @media(max-width:600px){.oc-input{font-size:16px}}
        @keyframes oc-scroll{from{transform:translateX(0)}to{transform:translateX(-50%)}}
        .oc-ticker{animation:oc-scroll 32s linear infinite}
        .oc-ticker:hover{animation-play-state:paused}
        .oc-menu-scroll{-webkit-overflow-scrolling:touch;scrollbar-width:none}
        .oc-menu-scroll::-webkit-scrollbar{display:none}
        @media(max-width:600px){
          .oc-date{display:none}
          .oc-menu-item{padding:13px 13px !important;font-size:12px !important}
          .oc-share-grid{flex-wrap:wrap}
          .oc-footer-grid{grid-template-columns:1fr 1fr !important;gap:28px !important}
          .oc-footer-bottom{flex-direction:column;text-align:center}
        }
        @media(max-width:760px){
          .oc-footer-grid{grid-template-columns:1fr 1fr}
        }
      `}</style>

      {/* FAIXA SUPERIOR: data + ao vivo (portal público) */}
      {!isRedacaoRoute && (
        <div style={{ background: "#06201880", color: "rgba(247,246,241,.7)", fontSize: 11, letterSpacing: ".08em", borderBottom: "1px solid rgba(95,214,172,.1)" }}>
          <div className="oc-pad" style={{ maxWidth: 1180, margin: "0 auto", padding: "8px 24px", display: "flex", justifyContent: "space-between", alignItems: "center", gap: 12, flexWrap: "wrap" }}>
            <span style={{ textTransform: "uppercase" }}>{todayStr()}</span>
            <span style={{ color: "rgba(247,246,241,.5)", letterSpacing: ".14em" }}>@ocatarinajornal</span>
          </div>
        </div>
      )}

      {/* TOPO */}
      <div style={{ background: PINHEIRO_DEEP, color: AREIA, padding: "14px 0", borderBottom: "1px solid rgba(95,214,172,.14)", position: "sticky", top: 0, zIndex: 40 }}>
        <div className="oc-pad" style={{ maxWidth: 1180, margin: "0 auto", padding: "0 24px", display: "flex", alignItems: "center", justifyContent: "space-between", gap: 16, flexWrap: "wrap" }}>
          <div onClick={() => setView("portal")} style={{ display: "flex", alignItems: "center", gap: 12, cursor: "pointer" }}>
            <Symbol size={40} />
            <div>
              <div className="oc-wordmark" style={{ fontFamily: SERIF, fontSize: 22, fontWeight: 500, lineHeight: 1 }}>O Catarina</div>
              <div className="oc-tagline" style={{ fontSize: 9.5, letterSpacing: ".18em", textTransform: "uppercase", color: MAR_BRIGHT, marginTop: 3 }}>Informação de Catarina, para Catarina</div>
            </div>
          </div>
          <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
            {isRedacaoRoute && isTeam && (
              <>
                <div style={{ display: "flex", gap: 6, background: "rgba(0,0,0,.2)", padding: 5, borderRadius: 11 }}>
                  <button className={"oc-tab" + (view === "portal" ? " active" : "")} onClick={() => setView("portal")}>◉ Portal</button>
                  <button className={"oc-tab" + (view === "redacao" ? " active" : "")} onClick={() => setView("redacao")}>✎ Redação</button>
                </div>
                <button className="oc-btn" style={{ background: "rgba(95,214,172,.14)", color: MAR_BRIGHT, padding: "9px 16px" }} onClick={logout}>Sair</button>
              </>
            )}
          </div>
        </div>
      </div>

      {/* MENU DE CATEGORIAS + TICKER PLANTÃO (portal público) */}
      {!isRedacaoRoute && (
        <CategoryNavAndTicker articles={articles} catFilter={catFilter} setCatFilter={setCatFilter} setOpenArticle={setOpenArticle} />
      )}

      {toast && <div style={{ position: "fixed", bottom: 26, left: "50%", transform: "translateX(-50%)", zIndex: 90, background: PINHEIRO, color: "#fff", fontSize: 14, fontWeight: 500, padding: "13px 24px", borderRadius: 999, boxShadow: "0 16px 40px -10px rgba(14,59,46,.6)" }}>{toast}</div>}

      {loading ? (
        <div style={{ padding: 60, textAlign: "center", color: "rgba(26,26,24,.4)" }}>Carregando…</div>
      ) : staticPage ? (
        <StaticPage page={staticPage} />
      ) : isRedacaoRoute && !isTeam ? (
        <LoginScreen sb={sb} onDone={() => { setView("redacao"); flash("Bem-vindo à redação."); }} />
      ) : isRedacaoRoute && isTeam && view === "redacao" ? (
        <Redacao {...{ articles, saveArticle, delArticle, publishNow, session, sb, flash }} />
      ) : (
        <Portal {...{ hero, rest, setOpenArticle }} />
      )}

      {openArticle && <ArticleModal a={openArticle} onClose={() => setOpenArticle(null)} />}

      {!isRedacaoRoute ? <SiteFooter setCatFilter={setCatFilter} /> : (
        <div style={{ background: PINHEIRO_DEEP, color: "rgba(247,246,241,.5)", textAlign: "center", fontSize: 11.5, letterSpacing: ".08em", padding: 20, marginTop: 40 }}>
          © 2026 O Catarina · Santa Catarina · @ocatarinajornal
        </div>
      )}
    </div>
  );
}

/* ---------- PÁGINAS INSTITUCIONAIS ---------- */
function StaticPage({ page }) {
  const H = ({ children }) => <h2 style={{ fontFamily: SERIF, fontSize: 22, color: PINHEIRO, margin: "28px 0 12px", fontWeight: 600 }}>{children}</h2>;
  const P = ({ children }) => <p style={{ fontSize: 16, lineHeight: 1.75, color: "rgba(26,26,24,.82)", marginBottom: 14 }}>{children}</p>;

  let title, subtitle, body;
  if (page === "quem") {
    title = "Quem somos";
    subtitle = "Informação de Catarina, para Catarina.";
    body = (
      <>
        <P>O Catarina é um veículo digital de notícias dedicado a Santa Catarina. Cobrimos política, economia e os fatos do estado, com um olhar para o que move a cultura e o dia a dia catarinense. Nossa promessa é simples e inegociável: aqui, a informação é apurada, verificada e entregue com clareza.</P>
        <H>Nosso propósito</H>
        <P>Informar Santa Catarina com apuração séria e linguagem próxima, sem ruído nem boato. Acreditamos que jornalismo de qualidade não precisa ser distante: explicamos o que aconteceu como quem conta para um amigo — só que com o rigor de uma redação.</P>
        <H>Para quem fazemos</H>
        <P>Para o catarinense adulto, que trabalha, vota, empreende e quer entender o que de fato importa no estado — sem sensacionalismo e sem perder tempo com o que não é verdade.</P>
        <H>Como trabalhamos</H>
        <P>Somos uma redação enxuta e independente. Publicamos apenas o que checamos, identificamos nossas fontes sempre que possível e corrigimos com transparência quando erramos. Informamos — não militamos.</P>
        <P style={{ marginTop: 24, fontStyle: "italic", color: "rgba(26,26,24,.6)" }}>Este texto é um rascunho inicial. Ajuste com a história e os nomes reais da equipe do O Catarina.</P>
      </>
    );
  } else if (page === "principios") {
    title = "Princípios editoriais";
    subtitle = "Os compromissos que guiam o que publicamos.";
    body = (
      <>
        <P>A credibilidade é o nosso maior patrimônio. Estes princípios orientam cada notícia publicada pelo O Catarina.</P>
        <H>1. Apuração antes da pressa</H>
        <P>Preferimos checar a ser os primeiros a errar. Nenhuma informação vai ao ar sem verificação. Quando um fato ainda está em desenvolvimento, deixamos isso claro para o leitor.</P>
        <H>2. Clareza e contexto</H>
        <P>Explicamos a notícia em linguagem que qualquer pessoa entende, com o contexto necessário para compreender o que está em jogo — sem jargão desnecessário e sem enrolação.</P>
        <H>3. Verificação de boatos</H>
        <P>Quando algo circula como rumor, nós checamos e marcamos com o selo VERIFICADO — confirmando ou desmentindo com base em dados e fontes. É o nosso compromisso contra a desinformação.</P>
        <H>4. Separação entre fato e opinião</H>
        <P>Notícia é fato apurado. Quando publicamos análise ou opinião, isso é sinalizado de forma explícita. Informamos, não militamos.</P>
        <H>5. Correções transparentes</H>
        <P>Quando erramos, corrigimos de forma aberta e visível. Errar faz parte; esconder o erro, não.</P>
        <P style={{ marginTop: 24, fontStyle: "italic", color: "rgba(26,26,24,.6)" }}>Rascunho inicial baseado na linha editorial do O Catarina. Revise e ajuste conforme suas diretrizes.</P>
      </>
    );
  } else {
    title = "Contato";
    subtitle = "Fale com a redação do O Catarina.";
    body = (
      <>
        <P>Tem uma pauta, uma denúncia, uma correção a sugerir ou quer falar com a nossa equipe? Estamos à disposição.</P>
        <H>Redação</H>
        <P>E-mail: <a href="mailto:contato@ocatarina.com.br" style={{ color: MAR, fontWeight: 600 }}>contato@ocatarina.com.br</a></P>
        <H>Redes sociais</H>
        <P>Instagram: <a href="https://instagram.com/ocatarinajornal" target="_blank" rel="noopener noreferrer" style={{ color: MAR, fontWeight: 600 }}>@ocatarinajornal</a></P>
        <H>Sugestões e correções</H>
        <P>Encontrou um erro em alguma matéria? Escreva para o nosso e-mail com o link da notícia — levamos correções a sério.</P>
        <P style={{ marginTop: 24, fontStyle: "italic", color: "rgba(26,26,24,.6)" }}>Atualize com os contatos reais (e-mail, telefone, WhatsApp, endereço) do O Catarina.</P>
      </>
    );
  }

  return (
    <div className="oc-pad" style={{ maxWidth: 760, margin: "0 auto", padding: "40px 24px 20px" }}>
      <a href="/" style={{ fontSize: 13, fontWeight: 600, color: MAR, textDecoration: "none" }}>← Voltar ao portal</a>
      <h1 style={{ fontFamily: SERIF, fontSize: "clamp(28px,4vw,40px)", color: PINHEIRO, margin: "18px 0 6px", lineHeight: 1.12, fontWeight: 600 }}>{title}</h1>
      <div style={{ fontSize: 15, color: MAR, fontWeight: 500, marginBottom: 8 }}>{subtitle}</div>
      <div style={{ height: 3, width: 64, background: MAR, borderRadius: 2, margin: "16px 0 24px" }} />
      {body}
    </div>
  );
}

/* ---------- FOOTER DO SITE ---------- */
function SiteFooter({ setCatFilter }) {
  const toTop = () => window.scrollTo({ top: 0, behavior: "smooth" });
  const pick = (c) => { setCatFilter(c); toTop(); };
  const colTitle = { fontSize: 11, fontWeight: 700, letterSpacing: ".16em", textTransform: "uppercase", color: MAR_BRIGHT, marginBottom: 16 };
  const link = { display: "block", fontSize: 13.5, padding: "6px 0", color: "rgba(247,246,241,.7)", fontWeight: 300, cursor: "pointer", background: "none", border: "none", textAlign: "left", fontFamily: SANS, textDecoration: "none" };
  return (
    <footer style={{ background: PINHEIRO_DEEP, color: "rgba(247,246,241,.7)", marginTop: 60, padding: "54px 0 30px" }}>
      <div className="oc-pad" style={{ maxWidth: 1180, margin: "0 auto", padding: "0 24px" }}>
        <div className="oc-footer-grid" style={{ display: "grid", gridTemplateColumns: "2fr 1fr 1fr 1fr", gap: 36 }}>
          <div>
            <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
              <Symbol size={38} ring={MAR_BRIGHT} w1={MAR} w2="#7d9b8f" />
              <span style={{ fontFamily: SERIF, fontSize: 26, color: AREIA }}>O Catarina</span>
            </div>
            <p style={{ marginTop: 14, fontSize: 13, maxWidth: 300, fontWeight: 300, lineHeight: 1.6 }}>
              Veículo digital de notícias de Santa Catarina. Apuração séria, linguagem próxima — política, economia e os fatos do estado.
            </p>
            <div style={{ marginTop: 16, fontSize: 11, letterSpacing: ".16em", textTransform: "uppercase", color: VERMELHO }}>Informação de Catarina, para Catarina</div>
          </div>
          <div>
            <div style={colTitle}>Editorias</div>
            {["PLANTAO", "POLITICA", "ECONOMIA", "CIDADES", "ESPORTES"].map(c => (
              <button key={c} style={link} onClick={() => pick(c)}>{SEALS[c].label}</button>
            ))}
          </div>
          <div>
            <div style={colTitle}>O Catarina</div>
            <a style={link} href="/quem-somos">Quem somos</a>
            <button style={link} onClick={() => pick("VERIFICADO")}>Verificado</button>
            <a style={link} href="/principios">Princípios editoriais</a>
            <a style={link} href="/contato">Contato</a>
          </div>
          <div>
            <div style={colTitle}>Siga</div>
            <a style={link} href="https://instagram.com/ocatarinajornal" target="_blank" rel="noopener noreferrer">@ocatarinajornal</a>
            <a style={link} href="https://instagram.com/ocatarinajornal" target="_blank" rel="noopener noreferrer">Instagram</a>
            <a style={link} href="#" >WhatsApp</a>
          </div>
        </div>
        <div className="oc-footer-bottom" style={{ marginTop: 42, paddingTop: 24, borderTop: "1px solid rgba(95,214,172,.12)", display: "flex", justifyContent: "space-between", flexWrap: "wrap", gap: 10, fontSize: 11.5, letterSpacing: ".06em", color: "rgba(247,246,241,.45)" }}>
          <span>© 2026 O Catarina · Santa Catarina, Brasil</span>
          <span>Termos · Privacidade · Política de correções</span>
        </div>
      </div>
    </footer>
  );
}

/* ---------- LOGIN (tela cheia, rota /redacao) ---------- */
function LoginScreen({ sb, onDone }) {
  const [mode, setMode] = useState("login");
  const [email, setEmail] = useState(""); const [pass, setPass] = useState("");
  const [msg, setMsg] = useState(""); const [busy, setBusy] = useState(false);
  async function submit() {
    if (!email || !pass) return setMsg("Preencha e-mail e senha.");
    setBusy(true); setMsg("");
    const fn = mode === "login" ? sb.auth.signInWithPassword({ email, password: pass }) : sb.auth.signUp({ email, password: pass });
    const { error } = await fn;
    setBusy(false);
    if (error) return setMsg(error.message);
    if (mode === "signup") return setMsg("Conta criada. Se exigir confirmação, verifique o e-mail e depois entre.");
    onDone();
  }
  return (
    <div style={{ minHeight: "70vh", display: "grid", placeItems: "center", padding: "40px 20px" }}>
      <div style={{ background: "#fff", width: "100%", maxWidth: 400, borderRadius: 16, padding: "32px 28px", boxShadow: "0 30px 70px -34px rgba(14,59,46,.5)", border: "1px solid rgba(14,59,46,.08)" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 11, marginBottom: 6 }}>
          <Symbol size={40} ring={MAR} w1={MAR} w2="#7d9b8f" />
          <div style={{ fontFamily: SERIF, fontSize: 21, color: PINHEIRO }}>Redação O Catarina</div>
        </div>
        <div style={{ fontSize: 13, color: "rgba(26,26,24,.55)", marginBottom: 20 }}>Acesso restrito à equipe.</div>
        <label className="oc-label">E-mail</label>
        <input className="oc-input" type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="voce@ocatarina.com.br" />
        <div style={{ height: 12 }} />
        <label className="oc-label">Senha</label>
        <input className="oc-input" type="password" value={pass} onChange={e => setPass(e.target.value)} onKeyDown={e => e.key === "Enter" && submit()} placeholder="••••••••" />
        {msg && <div style={{ marginTop: 12, fontSize: 13, color: msg.includes("criada") ? PINHEIRO : VERMELHO }}>{msg}</div>}
        <button className="oc-btn" style={{ background: MAR, color: "#fff", width: "100%", marginTop: 18, opacity: busy ? .6 : 1 }} onClick={submit} disabled={busy}>
          {busy ? "…" : mode === "login" ? "Entrar" : "Criar conta"}
        </button>
        <div style={{ marginTop: 14, textAlign: "center", fontSize: 13, color: "rgba(26,26,24,.6)" }}>
          {mode === "login" ? "Primeiro acesso da equipe? " : "Já tem conta? "}
          <button onClick={() => { setMode(mode === "login" ? "signup" : "login"); setMsg(""); }} style={{ background: "none", border: "none", color: MAR, fontWeight: 600, cursor: "pointer", fontSize: 13 }}>
            {mode === "login" ? "Criar conta" : "Entrar"}
          </button>
        </div>
      </div>
    </div>
  );
}

/* ---------- REDAÇÃO ---------- */
const DRAFT_KEY = "ocatarina:rascunho-automatico";
function Redacao({ articles, saveArticle, delArticle, publishNow, sb, flash }) {
  const [form, setForm] = useState(emptyForm);
  const [filter, setFilter] = useState("all");
  const [uploading, setUploading] = useState(false);
  const [artFor, setArtFor] = useState(null); // notícia p/ gerar arte
  const [restored, setRestored] = useState(false);
  const titleRef = useRef(null);
  const up = (k, v) => setForm(f => ({ ...f, [k]: v }));

  // Recuperar rascunho automático do navegador ao abrir
  useEffect(() => {
    try {
      const saved = localStorage.getItem(DRAFT_KEY);
      if (saved) {
        const d = JSON.parse(saved);
        // só restaura se for um rascunho novo (sem id) e com algum conteúdo
        if (d && !d.id && (d.title || d.summary || d.body || d.photo)) {
          setForm(d);
          setRestored(true);
          setTimeout(() => setRestored(false), 5000);
        }
      }
    } catch {}
  }, []);

  // Salvar automaticamente no navegador a cada alteração (apenas rascunho novo, sem id)
  useEffect(() => {
    try {
      const hasContent = form.title || form.summary || form.body || form.photo;
      if (!form.id && hasContent) {
        localStorage.setItem(DRAFT_KEY, JSON.stringify(form));
      }
    } catch {}
  }, [form]);

  function clearAutosave() {
    try { localStorage.removeItem(DRAFT_KEY); } catch {}
  }

  function editArticle(a) {
    setForm({ id: a.id, title: a.title, summary: a.summary || "", body: a.body || "", seal: a.seal, city: a.city, author: a.author, photo: a.photo || "", featured: a.featured, scheduleOn: a.status === "scheduled", publishAt: a.status === "scheduled" ? new Date(a.publishAt).toISOString().slice(0, 16) : "" });
    window.scrollTo({ top: 0, behavior: "smooth" });
  }
  async function makeFeatured(id) {
    if (!sb) return;
    await sb.from("noticias").update({ featured: false }).neq("id", id);
    const { error } = await sb.from("noticias").update({ featured: true, status: "published", publish_at: new Date().toISOString() }).eq("id", id);
    if (error) return flash("Erro: " + error.message);
    flash("★ Definida como destaque do site.");
  }

  async function save(status) { const ok = await saveArticle(form, status); if (ok) { clearAutosave(); setForm(emptyForm); } }

  // redimensiona e comprime para JPEG ~1600px antes de enviar (resolve fotos pesadas e prévia de link)
  function optimizeImage(file, maxDim = 1600, quality = 0.82) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => {
        const img = new Image();
        img.onload = () => {
          let { width, height } = img;
          if (width > maxDim || height > maxDim) {
            if (width >= height) { height = Math.round(height * maxDim / width); width = maxDim; }
            else { width = Math.round(width * maxDim / height); height = maxDim; }
          }
          const canvas = document.createElement("canvas");
          canvas.width = width; canvas.height = height;
          const ctx = canvas.getContext("2d");
          ctx.fillStyle = "#fff"; ctx.fillRect(0, 0, width, height); // fundo p/ PNG transparente
          ctx.drawImage(img, 0, 0, width, height);
          canvas.toBlob(
            (blob) => blob ? resolve(blob) : reject(new Error("falha ao processar")),
            "image/jpeg", quality
          );
        };
        img.onerror = () => reject(new Error("imagem inválida"));
        img.src = reader.result;
      };
      reader.onerror = () => reject(new Error("falha ao ler arquivo"));
      reader.readAsDataURL(file);
    });
  }

  async function uploadPhoto(file) {
    if (!file || !sb) return;
    if (file.size > 25 * 1024 * 1024) return flash("⚠ Imagem muito grande (acima de 25MB).");
    setUploading(true);
    let blob;
    try {
      blob = await optimizeImage(file);
    } catch (e) {
      setUploading(false);
      return flash("Não foi possível processar a imagem. Tente outra.");
    }
    const path = `noticias/${Date.now()}-${Math.random().toString(36).slice(2, 8)}.jpg`;
    const { error } = await sb.storage.from("fotos").upload(path, blob, { cacheControl: "3600", upsert: false, contentType: "image/jpeg" });
    setUploading(false);
    if (error) return flash("Erro no upload: " + error.message);
    const { data } = sb.storage.from("fotos").getPublicUrl(path);
    up("photo", data.publicUrl);
    flash("📷 Foto carregada e otimizada.");
  }

  const counts = { all: articles.length, published: articles.filter(a => a.status === "published").length, scheduled: articles.filter(a => a.status === "scheduled").length, draft: articles.filter(a => a.status === "draft").length };
  const listed = articles.filter(a => filter === "all" ? true : a.status === filter).sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

  return (
    <div className="grid-2 redacao-grid oc-pad" style={{ maxWidth: 1180, margin: "0 auto", padding: "28px 24px" }}>
      <div style={{ background: "#fff", borderRadius: 16, padding: "26px 26px 22px", border: "1px solid rgba(14,59,46,.08)", boxShadow: "0 18px 50px -34px rgba(14,59,46,.5)" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 20 }}>
          <span style={{ width: 4, height: 22, background: MAR, borderRadius: 2 }} />
          <h2 style={{ fontFamily: SERIF, fontSize: 21, color: PINHEIRO, margin: 0 }}>{form.id ? "Editar notícia" : "Nova notícia"}</h2>
          {!form.id && (form.title || form.body || form.summary || form.photo) && (
            <button onClick={() => { clearAutosave(); setForm(emptyForm); }} style={{ marginLeft: "auto", background: "none", border: "none", color: "rgba(26,26,24,.45)", fontSize: 12, fontWeight: 600, cursor: "pointer" }}>Limpar</button>
          )}
        </div>
        {restored && (
          <div style={{ marginBottom: 16, padding: "10px 14px", borderRadius: 9, background: "rgba(29,158,117,.1)", color: PINHEIRO, fontSize: 12.5, lineHeight: 1.4 }}>
            ✓ Recuperamos o que você estava escrevendo antes de sair.
          </div>
        )}
        <label className="oc-label">Manchete *</label>
        <input ref={titleRef} className="oc-input" style={{ fontFamily: SERIF, fontSize: 16 }} value={form.title} onChange={e => up("title", e.target.value)} placeholder="Assembleia aprova novo marco do saneamento…" />
        <div style={{ height: 14 }} />
        <label className="oc-label">Linha de apoio (resumo)</label>
        <textarea className="oc-input" rows={2} value={form.summary} onChange={e => up("summary", e.target.value)} placeholder="Resumo factual em uma ou duas linhas." style={{ resize: "vertical" }} />
        <div style={{ height: 14 }} />
        <label className="oc-label">Corpo da matéria</label>
        <textarea className="oc-input" rows={6} value={form.body} onChange={e => up("body", e.target.value)} placeholder="Texto completo. Pule uma linha para separar parágrafos." style={{ resize: "vertical" }} />
        <div style={{ fontSize: 11, color: "rgba(26,26,24,.5)", marginTop: 5 }}>Dica: coloque <b>**asteriscos duplos**</b> em volta de um trecho para deixá-lo em negrito.</div>
        <div style={{ height: 16 }} />
        <label className="oc-label">Editoria / Selo</label>
        <div className="seal-grid" style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: 8 }}>
          {Object.keys(SEALS).map(k => <div key={k} className={"seal-pick" + (form.seal === k ? " sel" : "")} onClick={() => up("seal", k)}><Seal type={k} /></div>)}
        </div>
        {form.seal === "PLANTAO" && <div style={{ marginTop: 8, fontSize: 12, color: VERMELHO }}>⚠ Vermelho é só para última hora. Use com parcimônia.</div>}
        <div style={{ height: 16 }} />
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
          <div><label className="oc-label">Cidade</label><input className="oc-input" value={form.city} onChange={e => up("city", e.target.value)} placeholder="Florianópolis" /></div>
          <div><label className="oc-label">Autoria</label><input className="oc-input" value={form.author} onChange={e => up("author", e.target.value)} placeholder="Redação O Catarina" /></div>
        </div>
        <div style={{ height: 14 }} />
        <label className="oc-label">Foto da notícia</label>
        <div style={{ display: "flex", gap: 10, flexWrap: "wrap", alignItems: "center" }}>
          <label className="oc-btn" style={{ background: PINHEIRO, color: "#fff", display: "inline-flex", alignItems: "center", gap: 8, cursor: uploading ? "wait" : "pointer", opacity: uploading ? .6 : 1 }}>
            {uploading ? "Enviando…" : "📷 Carregar foto"}
            <input type="file" accept="image/*" style={{ display: "none" }} disabled={uploading}
              onChange={e => { const f = e.target.files?.[0]; if (f) uploadPhoto(f); e.target.value = ""; }} />
          </label>
          {form.photo && <button className="oc-btn" style={{ background: "rgba(192,57,43,.1)", color: VERMELHO, padding: "10px 16px" }} onClick={() => up("photo", "")}>Remover</button>}
        </div>
        <input className="oc-input" style={{ marginTop: 10 }} value={form.photo} onChange={e => up("photo", e.target.value)} placeholder="…ou cole uma URL (vazio = fundo da marca)" />
        {form.photo && <div style={{ marginTop: 10, borderRadius: 9, overflow: "hidden", aspectRatio: "16/7", background: PINHEIRO }}><img src={form.photo} alt="" referrerPolicy="no-referrer" onError={e => (e.target.style.display = "none")} style={{ width: "100%", height: "100%", objectFit: "cover" }} /></div>}
        <div style={{ height: 18 }} />
        <div style={{ display: "flex", alignItems: "center", gap: 18, flexWrap: "wrap" }}>
          <label style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 13.5, cursor: "pointer", color: PINHEIRO, fontWeight: 500 }}><input type="checkbox" checked={form.featured} onChange={e => up("featured", e.target.checked)} style={{ width: 17, height: 17, accentColor: MAR }} />Manchete principal</label>
          <label style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 13.5, cursor: "pointer", color: PINHEIRO, fontWeight: 500 }}><input type="checkbox" checked={form.scheduleOn} onChange={e => up("scheduleOn", e.target.checked)} style={{ width: 17, height: 17, accentColor: MAR }} />Agendar</label>
          {form.scheduleOn && <input className="oc-input" type="datetime-local" style={{ width: "auto" }} value={form.publishAt} onChange={e => up("publishAt", e.target.value)} />}
        </div>
        <div style={{ height: 22 }} />
        <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
          <button className="oc-btn" style={{ background: MAR, color: "#fff" }} onClick={() => save("publish")}>{form.scheduleOn && form.publishAt ? "🕒 Agendar" : "✓ Publicar agora"}</button>
          <button className="oc-btn" style={{ background: "rgba(14,59,46,.08)", color: PINHEIRO }} onClick={() => save("draft")}>💾 Rascunho</button>
          {form.id && <button className="oc-btn" style={{ background: "none", color: "rgba(26,26,24,.5)" }} onClick={() => { clearAutosave(); setForm(emptyForm); }}>Cancelar</button>}
        </div>
      </div>

      <div>
        <div style={{ display: "flex", gap: 8, marginBottom: 16, flexWrap: "wrap" }}>
          {[["all", "Todas"], ["published", "Publicadas"], ["scheduled", "Agendadas"], ["draft", "Rascunhos"]].map(([k, l]) => <button key={k} className={"chip" + (filter === k ? " active" : "")} onClick={() => setFilter(k)}>{l} <span style={{ opacity: .6 }}>{counts[k]}</span></button>)}
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          {listed.length === 0 && <div style={{ textAlign: "center", color: "rgba(26,26,24,.4)", fontSize: 14, padding: "40px 0" }}>Nenhuma notícia aqui ainda.</div>}
          {listed.map(a => (
            <div key={a.id} className="oc-card" style={{ background: "#fff", borderRadius: 12, border: "1px solid rgba(14,59,46,.08)", padding: 12, display: "flex", gap: 13 }}>
              <div style={{ width: 84, height: 64, borderRadius: 8, flex: "none", overflow: "hidden", background: `radial-gradient(130% 120% at 40% 20%,#1d6048,${PINHEIRO})` }}>{a.photo && <img src={a.photo} alt="" referrerPolicy="no-referrer" onError={e => (e.target.style.display = "none")} style={{ width: "100%", height: "100%", objectFit: "cover" }} />}</div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ display: "flex", gap: 7, alignItems: "center", marginBottom: 5, flexWrap: "wrap" }}>
                  <Seal type={a.seal} style={{ fontSize: 9.5, padding: "3px 8px" }} />
                  {a.featured && a.status === "published" && <span style={{ fontSize: 9.5, fontWeight: 700, letterSpacing: ".1em", color: MAR, textTransform: "uppercase" }}>★ Destaque</span>}
                  <StatusPill status={a.status} publishAt={a.publishAt} />
                </div>
                <div style={{ fontFamily: SERIF, fontSize: 15, color: PINHEIRO, lineHeight: 1.25, fontWeight: 600 }}>{a.title}</div>
                <div style={{ fontSize: 10.5, letterSpacing: ".08em", textTransform: "uppercase", color: "rgba(26,26,24,.45)", marginTop: 5 }}>{a.city}</div>
                <div style={{ display: "flex", gap: 14, marginTop: 9, flexWrap: "wrap" }}>
                  <button onClick={() => editArticle(a)} style={btnLink(MAR)}>Editar</button>
                  {a.status !== "published" && <button onClick={() => publishNow(a.id)} style={btnLink(PINHEIRO)}>Publicar agora</button>}
                  {a.status === "published" && !a.featured && <button onClick={() => makeFeatured(a.id)} style={btnLink("#b5862f")}>★ Destacar no site</button>}
                  <button onClick={() => setArtFor(a)} style={btnLink(PINHEIRO)}>🎨 Gerar arte</button>
                  <button onClick={() => delArticle(a.id)} style={btnLink(VERMELHO)}>Excluir</button>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
      {artFor && <ArtStudio a={artFor} onClose={() => setArtFor(null)} />}
    </div>
  );
}
function btnLink(c) { return { background: "none", border: "none", cursor: "pointer", fontFamily: SANS, fontSize: 12, fontWeight: 600, color: c, padding: 0 }; }
function StatusPill({ status, publishAt }) {
  const map = { published: { t: "● No ar", c: MAR }, scheduled: { t: "🕒 " + new Date(publishAt).toLocaleString("pt-BR", { day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" }), c: "#b5862f" }, draft: { t: "Rascunho", c: "rgba(26,26,24,.45)" } };
  const s = map[status] || map.draft;
  return <span style={{ fontSize: 10, fontWeight: 700, color: s.c }}>{s.t}</span>;
}

/* ---------- PORTAL ---------- */
function Portal({ hero, rest, setOpenArticle }) {
  if (!hero) return (
    <div style={{ maxWidth: 1180, margin: "0 auto", padding: "80px 24px", textAlign: "center", color: "rgba(26,26,24,.45)" }}>
      <Symbol size={60} ring={MAR} w1={MAR} w2="#7d9b8f" />
      <p style={{ marginTop: 18, fontSize: 16 }}>Nenhuma notícia publicada ainda.</p>
    </div>
  );
  return (
    <div className="oc-pad" style={{ maxWidth: 1180, margin: "0 auto", padding: "28px 24px 10px" }}>
      <div className="grid-2 portal-lede">
        <article onClick={() => setOpenArticle(hero)} className="oc-card" style={{ cursor: "pointer", position: "relative", borderRadius: 14, overflow: "hidden", background: PINHEIRO, boxShadow: "0 30px 60px -30px rgba(14,59,46,.55)" }}>
          <div style={{ aspectRatio: "16/10", position: "relative", background: `radial-gradient(120% 90% at 70% 10%,#1d6048,${PINHEIRO} 45%,${PINHEIRO_DEEP})` }}>
            {hero.photo && <img src={hero.photo} alt="" referrerPolicy="no-referrer" onError={e => (e.target.style.display = "none")} style={{ position: "absolute", inset: 0, width: "100%", height: "100%", objectFit: "cover" }} />}
            <div style={{ position: "absolute", inset: 0, background: "linear-gradient(180deg,rgba(14,59,46,.15) 25%,rgba(10,44,34,.55) 60%,rgba(10,44,34,.96) 100%)" }} />
            <div className="oc-hero-pad" style={{ position: "absolute", left: 0, right: 0, bottom: 0, padding: "30px 32px", color: "#fff" }}>
              <Seal type={hero.seal} style={{ marginBottom: 14 }} />
              <h1 className="oc-hero-title" style={{ fontFamily: SERIF, fontWeight: 600, fontSize: "clamp(24px,3vw,40px)", lineHeight: 1.1, margin: 0, letterSpacing: "-.01em" }}>{hero.title}</h1>
              {hero.summary && <p style={{ marginTop: 12, fontSize: 15.5, color: "rgba(247,246,241,.88)", fontWeight: 300, maxWidth: 620 }}>{hero.summary}</p>}
              <div style={{ marginTop: 16, fontSize: 11, letterSpacing: ".13em", textTransform: "uppercase", color: MAR_BRIGHT }}>{hero.city} · {timeAgo(hero.publishAt)} · {hero.author}</div>
            </div>
          </div>
        </article>
        <aside style={{ display: "flex", flexDirection: "column", gap: 18 }}>
          {rest.slice(0, 4).map(a => (
            <div key={a.id} onClick={() => setOpenArticle(a)} style={{ cursor: "pointer", paddingBottom: 18, borderBottom: "1px solid rgba(14,59,46,.12)" }}>
              <Seal type={a.seal} style={{ marginBottom: 8 }} />
              <h3 style={{ fontFamily: SERIF, fontWeight: 600, fontSize: 18, lineHeight: 1.22, color: PINHEIRO, margin: 0 }}>{a.title}</h3>
              <div style={{ marginTop: 7, fontSize: 10.5, letterSpacing: ".1em", textTransform: "uppercase", color: "rgba(26,26,24,.5)" }}>{a.city} · {timeAgo(a.publishAt)}</div>
            </div>
          ))}
          {rest.length === 0 && <div style={{ fontSize: 13, color: "rgba(26,26,24,.4)" }}>Publique mais notícias para preencher esta coluna.</div>}
        </aside>
      </div>
      {rest.length > 4 && (
        <>
          <div style={{ display: "flex", alignItems: "center", gap: 14, margin: "44px 0 22px" }}>
            <h2 style={{ fontFamily: SERIF, fontWeight: 600, fontSize: 22, color: PINHEIRO, margin: 0 }}>Últimas</h2>
            <span style={{ height: 3, flex: 1, background: MAR, borderRadius: 2 }} />
          </div>
          <div className="oc-grid-cards" style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill,minmax(260px,1fr))", gap: 24 }}>
            {rest.slice(4).map(a => (
              <article key={a.id} onClick={() => setOpenArticle(a)} className="oc-card" style={{ cursor: "pointer", background: "#fff", borderRadius: 12, overflow: "hidden", border: "1px solid rgba(14,59,46,.08)" }}>
                <div style={{ aspectRatio: "3/2", position: "relative", background: `radial-gradient(130% 120% at 40% 20%,#1d6048,${PINHEIRO})` }}>
                  {a.photo && <img src={a.photo} alt="" referrerPolicy="no-referrer" onError={e => (e.target.style.display = "none")} style={{ position: "absolute", inset: 0, width: "100%", height: "100%", objectFit: "cover" }} />}
                  <div style={{ position: "absolute", inset: 0, background: "linear-gradient(180deg,rgba(14,59,46,.12),rgba(10,44,34,.7))" }} />
                  <div style={{ position: "absolute", top: 12, left: 12 }}><Seal type={a.seal} /></div>
                </div>
                <div style={{ padding: "16px 16px 20px" }}>
                  <h3 style={{ fontFamily: SERIF, fontWeight: 600, fontSize: 17, lineHeight: 1.24, color: PINHEIRO, margin: 0 }}>{a.title}</h3>
                  {a.summary && <p style={{ marginTop: 7, fontSize: 13, color: "rgba(26,26,24,.66)", fontWeight: 300 }}>{a.summary}</p>}
                  <div style={{ marginTop: 12, fontSize: 10, letterSpacing: ".1em", textTransform: "uppercase", color: "rgba(26,26,24,.45)" }}>{a.city} · {timeAgo(a.publishAt)}</div>
                </div>
              </article>
            ))}
          </div>
        </>
      )}
    </div>
  );
}

/* ---------- MODAL ARTIGO ---------- */
function ArticleModal({ a, onClose }) {
  return (
    <div onClick={onClose} style={{ position: "fixed", inset: 0, background: "rgba(10,44,34,.55)", backdropFilter: "blur(3px)", zIndex: 80, display: "flex", alignItems: "flex-start", justifyContent: "center", padding: "40px 20px", overflowY: "auto" }}>
      <div onClick={e => e.stopPropagation()} style={{ background: AREIA, maxWidth: 720, width: "100%", borderRadius: 16, overflow: "hidden", boxShadow: "0 40px 80px -20px rgba(0,0,0,.5)" }}>
        <div style={{ aspectRatio: "16/8", position: "relative", background: `radial-gradient(120% 90% at 70% 10%,#1d6048,${PINHEIRO})` }}>
          {a.photo && <img src={a.photo} alt="" referrerPolicy="no-referrer" onError={e => (e.target.style.display = "none")} style={{ position: "absolute", inset: 0, width: "100%", height: "100%", objectFit: "cover" }} />}
          <div style={{ position: "absolute", inset: 0, background: "linear-gradient(180deg,rgba(14,59,46,.1),rgba(10,44,34,.55))" }} />
          <button onClick={onClose} style={{ position: "absolute", top: 14, right: 14, width: 34, height: 34, borderRadius: "50%", border: "none", background: "rgba(0,0,0,.4)", color: "#fff", fontSize: 18, cursor: "pointer" }}>×</button>
          <div style={{ position: "absolute", left: 24, bottom: 18 }}><Seal type={a.seal} /></div>
        </div>
        <div style={{ padding: "26px 32px 36px" }}>
          <h1 style={{ fontFamily: SERIF, fontWeight: 600, fontSize: 30, lineHeight: 1.14, color: PINHEIRO, margin: 0, letterSpacing: "-.01em" }}>{a.title}</h1>
          <div style={{ marginTop: 12, fontSize: 11, letterSpacing: ".12em", textTransform: "uppercase", color: MAR, fontWeight: 600 }}>{a.city} · {timeAgo(a.publishAt)} · {a.author}</div>
          {a.summary && <p style={{ marginTop: 18, fontFamily: SERIF, fontStyle: "italic", fontSize: 18, lineHeight: 1.5, color: "rgba(26,26,24,.78)" }}>{a.summary}</p>}
          <div style={{ height: 1, background: "rgba(14,59,46,.12)", margin: "20px 0" }} />
          {(a.body || "").split("\n").filter(Boolean).map((p, i) => <p key={i} style={{ fontSize: 15.5, lineHeight: 1.7, color: "rgba(26,26,24,.85)", marginBottom: 14 }}>{renderBold(p)}</p>)}
          {!a.body && <p style={{ fontSize: 14, color: "rgba(26,26,24,.45)" }}>Sem corpo de texto.</p>}
          <ShareBar a={a} />
          <div style={{ marginTop: 22, paddingTop: 18, borderTop: "1px solid rgba(14,59,46,.12)", display: "flex", alignItems: "center", gap: 10, color: "rgba(26,26,24,.5)", fontSize: 12 }}>
            <Symbol size={26} ring={MAR} w1={MAR} w2="#7d9b8f" /> O Catarina · @ocatarinajornal
          </div>
        </div>
      </div>
    </div>
  );
}

/* ---------- BARRA DE COMPARTILHAMENTO ---------- */
function ShareBar({ a }) {
  const url = typeof window !== "undefined" ? `${window.location.origin}/n/${a.id}` : "";
  const text = a.title;
  const enc = encodeURIComponent;
  const links = {
    whatsapp: `https://wa.me/?text=${enc(text + " — " + url)}`,
    x: `https://twitter.com/intent/tweet?text=${enc(text)}&url=${enc(url)}`,
    facebook: `https://www.facebook.com/sharer/sharer.php?u=${enc(url)}`,
  };
  const [copied, setCopied] = useState(false);
  function copy() {
    try { navigator.clipboard.writeText(url); setCopied(true); setTimeout(() => setCopied(false), 1800); } catch {}
  }
  const btn = { display: "inline-flex", alignItems: "center", gap: 7, padding: "9px 16px", borderRadius: 999, border: "none", cursor: "pointer", fontFamily: SANS, fontSize: 13, fontWeight: 600, color: "#fff" };
  return (
    <div style={{ marginTop: 24, paddingTop: 18, borderTop: "1px solid rgba(14,59,46,.12)" }}>
      <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: ".1em", textTransform: "uppercase", color: "rgba(26,26,24,.5)", marginBottom: 12 }}>Compartilhar</div>
      <div className="oc-share-grid" style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
        <a href={links.whatsapp} target="_blank" rel="noopener noreferrer" style={{ ...btn, background: "#25D366" }}>WhatsApp</a>
        <a href={links.x} target="_blank" rel="noopener noreferrer" style={{ ...btn, background: "#000" }}>X</a>
        <a href={links.facebook} target="_blank" rel="noopener noreferrer" style={{ ...btn, background: "#1877F2" }}>Facebook</a>
        <button onClick={copy} style={{ ...btn, background: copied ? MAR : "rgba(14,59,46,.1)", color: copied ? "#fff" : PINHEIRO }}>{copied ? "✓ Link copiado" : "Copiar link"}</button>
      </div>
    </div>
  );
}

/* ---------- ESTÚDIO DE ARTE (Feed / Story) ---------- */
function ArtStudio({ a, onClose }) {
  const canvasRef = useRef(null);
  const [format, setFormat] = useState("feed"); // feed 4:5 | story 9:16
  const [focusY, setFocusY] = useState(0.4);
  const [focusX, setFocusX] = useState(0.5);
  const [zoom, setZoom] = useState(1);
  const [rendering, setRendering] = useState(true);
  const [preview, setPreview] = useState("");
  const [tainted, setTainted] = useState(false);

  const DIMS = { feed: [1080, 1350], story: [1080, 1920] };

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setRendering(true);
      try {
        // garantir fontes carregadas
        if (document.fonts) {
          await Promise.all([
            document.fonts.load("600 80px Lora"),
            document.fonts.load("700 30px 'Libre Franklin'"),
            document.fonts.ready,
          ]);
        }
        const [W, H] = DIMS[format];
        const cvs = canvasRef.current;
        if (!cvs) return;
        cvs.width = W; cvs.height = H;
        const ctx = cvs.getContext("2d");

        // fundo Verde Pinheiro
        ctx.fillStyle = PINHEIRO; ctx.fillRect(0, 0, W, H);

        const photoH = Math.round(H * (format === "feed" ? 0.76 : 0.80));

        // desenhar foto (cover) ou fundo da marca
        await new Promise((resolve) => {
          if (!a.photo) { drawNoPhoto(); return resolve(); }
          const img = new Image();
          img.crossOrigin = "anonymous";
          let done = false;
          const finish = (ok) => { if (done) return; done = true; ok ? drawCover(img) : drawNoPhoto(); resolve(); };
          img.onload = () => finish(true);
          img.onerror = () => finish(false);
          img.src = a.photo;
          // se já estiver em cache, onload pode não disparar — desenha na hora
          if (img.complete && img.naturalWidth > 0) finish(true);
        });

        function drawCover(img) {
          const tw = W, th = photoH;
          const base = Math.max(tw / img.width, th / img.height);
          const r = base * zoom;
          const dw = img.width * r, dh = img.height * r;
          const dx = (tw - dw) * focusX;
          const dy = (th - dh) * focusY;
          ctx.save(); ctx.beginPath(); ctx.rect(0, 0, tw, th); ctx.clip();
          ctx.drawImage(img, dx, dy, dw, dh);
          ctx.restore();
        }
        function drawNoPhoto() {
          const g = ctx.createRadialGradient(W * 0.7, photoH * 0.2, 0, W * 0.5, photoH * 0.5, W);
          g.addColorStop(0, "#1d6048"); g.addColorStop(1, PINHEIRO);
          ctx.fillStyle = g; ctx.fillRect(0, 0, W, photoH);
        }

        // gradiente smoothstep da foto -> Pinheiro
        const gradStart = Math.round(photoH * 0.45);
        const grad = ctx.createLinearGradient(0, gradStart, 0, photoH + 4);
        for (let i = 0; i <= 10; i++) {
          const t = i / 10;
          const e = t * t * (3 - 2 * t); // smoothstep
          grad.addColorStop(t, `rgba(14,59,46,${e})`);
        }
        ctx.fillStyle = grad; ctx.fillRect(0, gradStart, W, photoH - gradStart + 4);
        // vinheta superior p/ legibilidade do header
        const top = ctx.createLinearGradient(0, 0, 0, 220);
        top.addColorStop(0, "rgba(10,44,34,.55)"); top.addColorStop(1, "rgba(10,44,34,0)");
        ctx.fillStyle = top; ctx.fillRect(0, 0, W, 220);
        // preencher área inferior
        ctx.fillStyle = PINHEIRO; ctx.fillRect(0, photoH, W, H - photoH);

        const M = 80; // margem lateral

        // HEADER: símbolo + wordmark
        drawSymbol(ctx, M + 34, 96, 34);
        ctx.fillStyle = AREIA; ctx.font = "500 46px Lora"; ctx.textBaseline = "middle";
        ctx.fillText("O Catarina", M + 84, 98);
        // selo da editoria (direita)
        drawSeal(ctx, a.seal, W - M, 98);

        // MANCHETE (Lora) acima do rodapé
        const footY = H - (format === "feed" ? 150 : 200);
        ctx.fillStyle = "#fff"; ctx.font = "600 70px Lora"; ctx.textBaseline = "alphabetic";
        const maxW = W - M * 2;
        const lines = wrap(ctx, a.title, maxW);
        const lh = 84;
        let ty = footY - 70 - lines.length * lh;
        // resumo
        const sumLines = a.summary ? wrap2(ctx, a.summary, maxW, "300 34px 'Libre Franklin'") : [];
        ty -= sumLines.length * 44;
        const titleStartY = ty;
        ctx.fillStyle = "#fff"; ctx.font = "600 70px Lora";
        lines.forEach((ln, i) => ctx.fillText(ln, M, titleStartY + i * lh));
        // resumo abaixo
        if (sumLines.length) {
          ctx.fillStyle = "rgba(247,246,241,.86)"; ctx.font = "300 34px 'Libre Franklin'";
          const sy = titleStartY + lines.length * lh + 20;
          sumLines.forEach((ln, i) => ctx.fillText(ln, M, sy + i * 44));
        }

        // linha verde + RODAPÉ
        ctx.fillStyle = MAR; ctx.fillRect(M, footY - 6, 70, 5);
        ctx.fillStyle = MAR_BRIGHT; ctx.font = "700 26px 'Libre Franklin'";
        ctx.fillText(`${(a.city || "").toUpperCase()}`, M, footY + 40);
        ctx.fillStyle = "rgba(247,246,241,.6)"; ctx.font = "500 26px 'Libre Franklin'";
        const handle = "@ocatarinajornal";
        const hw = ctx.measureText(handle).width;
        ctx.fillText(handle, W - M - hw, footY + 40);

        if (!cancelled) {
          try {
            setPreview(cvs.toDataURL("image/png"));
            setTainted(false);
          } catch (e) {
            setTainted(true);
            setPreview("");
          }
        }
      } finally {
        if (!cancelled) setRendering(false);
      }
    })();
    return () => { cancelled = true; };
  }, [format, focusY, focusX, zoom, a]);

  function wrap(ctx, text, maxW) {
    ctx.font = "600 70px Lora";
    return lineWrap(ctx, text, maxW);
  }
  function wrap2(ctx, text, maxW, font) { ctx.font = font; return lineWrap(ctx, text, maxW); }
  function lineWrap(ctx, text, maxW) {
    const words = (text || "").split(" "); const out = []; let cur = "";
    for (const w of words) {
      const test = cur ? cur + " " + w : w;
      if (ctx.measureText(test).width > maxW && cur) { out.push(cur); cur = w; }
      else cur = test;
    }
    if (cur) out.push(cur);
    return out;
  }

  function download() {
    if (!preview) return;
    try {
      const link = document.createElement("a");
      const slug = (a.title || "post").toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-z0-9]+/g, "-").slice(0, 40);
      link.download = `ocatarina-${format}-${slug}.png`;
      link.href = preview;
      link.click();
    } catch (e) {
      alert("Não foi possível baixar. Se a foto veio de uma URL externa, carregue-a pelo botão 'Carregar foto' (upload) e gere a arte de novo.");
    }
  }

  return (
    <div onClick={onClose} style={{ position: "fixed", inset: 0, background: "rgba(10,44,34,.6)", backdropFilter: "blur(3px)", zIndex: 85, display: "flex", alignItems: "flex-start", justifyContent: "center", padding: "30px 16px", overflowY: "auto" }}>
      <div onClick={e => e.stopPropagation()} style={{ background: AREIA, maxWidth: 520, width: "100%", borderRadius: 16, padding: 22, boxShadow: "0 40px 80px -20px rgba(0,0,0,.5)" }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 16 }}>
          <h3 style={{ fontFamily: SERIF, fontSize: 20, color: PINHEIRO, margin: 0 }}>Arte para redes</h3>
          <button onClick={onClose} style={{ width: 32, height: 32, borderRadius: "50%", border: "none", background: "rgba(14,59,46,.1)", color: PINHEIRO, fontSize: 18, cursor: "pointer" }}>×</button>
        </div>
        <div style={{ display: "flex", gap: 8, marginBottom: 14 }}>
          <button className={"chip" + (format === "feed" ? " active" : "")} onClick={() => setFormat("feed")}>Feed 4:5</button>
          <button className={"chip" + (format === "story" ? " active" : "")} onClick={() => setFormat("story")}>Story 9:16</button>
        </div>
        <div style={{ borderRadius: 12, overflow: "hidden", background: PINHEIRO, position: "relative", minHeight: 200 }}>
          {rendering && <div style={{ position: "absolute", inset: 0, display: "grid", placeItems: "center", color: MAR_BRIGHT, fontSize: 14, zIndex: 2 }}>Gerando arte…</div>}
          {preview && <img src={preview} alt="prévia" style={{ width: "100%", display: "block" }} />}
          <canvas ref={canvasRef} style={{ width: "100%", display: !preview && tainted ? "block" : "none" }} />
        </div>
        {tainted && (
          <div style={{ marginTop: 10, fontSize: 12.5, color: VERMELHO, lineHeight: 1.5 }}>
            ⚠ A prévia aparece, mas o download está bloqueado porque a foto veio de uma URL externa. Para baixar, use o botão <b>Carregar foto</b> (upload) na notícia — fotos enviadas por você funcionam sem restrição.
          </div>
        )}
        <div style={{ marginTop: 14, display: "flex", flexDirection: "column", gap: 12 }}>
          <div>
            <label className="oc-label">Posição vertical</label>
            <input type="range" min="0" max="1" step="0.02" value={focusY} onChange={e => setFocusY(parseFloat(e.target.value))} style={{ width: "100%", accentColor: MAR }} />
          </div>
          <div>
            <label className="oc-label">Posição horizontal</label>
            <input type="range" min="0" max="1" step="0.02" value={focusX} onChange={e => setFocusX(parseFloat(e.target.value))} style={{ width: "100%", accentColor: MAR }} />
          </div>
          <div>
            <label className="oc-label">Zoom ({zoom.toFixed(1)}×)</label>
            <input type="range" min="1" max="3" step="0.1" value={zoom} onChange={e => setZoom(parseFloat(e.target.value))} style={{ width: "100%", accentColor: MAR }} />
          </div>
          <button onClick={() => { setFocusX(0.5); setFocusY(0.4); setZoom(1); }} style={{ alignSelf: "flex-start", background: "none", border: "none", color: MAR, fontSize: 12, fontWeight: 600, cursor: "pointer" }}>↺ Redefinir enquadramento</button>
        </div>
        <button className="oc-btn" style={{ background: MAR, color: "#fff", width: "100%", marginTop: 16, opacity: (preview && !tainted) ? 1 : .5 }} onClick={download} disabled={!preview || tainted}>
          ⬇ Baixar PNG ({format === "feed" ? "1080×1350" : "1080×1920"})
        </button>
      </div>
    </div>
  );
}
// símbolo desenhado no canvas
function drawSymbol(ctx, cx, cy, r) {
  ctx.save();
  ctx.strokeStyle = MAR_BRIGHT; ctx.lineWidth = r * 0.05;
  ctx.beginPath(); ctx.arc(cx, cy, r, 0, Math.PI * 2); ctx.stroke();
  ctx.fillStyle = VERMELHO;
  ctx.beginPath(); ctx.arc(cx, cy - r * 0.36, r * 0.14, 0, Math.PI * 2); ctx.fill();
  ctx.lineCap = "round"; ctx.lineWidth = r * 0.14;
  ctx.strokeStyle = MAR;
  ctx.beginPath(); ctx.moveTo(cx - r * 0.4, cy + r * 0.16);
  ctx.quadraticCurveTo(cx - r * 0.1, cy - r * 0.02, cx + r * 0.1, cy + r * 0.12);
  ctx.quadraticCurveTo(cx + r * 0.3, cy + r * 0.24, cx + r * 0.44, cy);
  ctx.stroke();
  ctx.strokeStyle = "#7d9b8f";
  ctx.beginPath(); ctx.moveTo(cx - r * 0.4, cy + r * 0.34);
  ctx.quadraticCurveTo(cx - r * 0.1, cy + r * 0.18, cx + r * 0.1, cy + r * 0.3);
  ctx.quadraticCurveTo(cx + r * 0.28, cy + r * 0.4, cx + r * 0.4, cy + r * 0.22);
  ctx.stroke();
  ctx.restore();
}
// selo no canvas (alinhado à direita em x)
function drawSeal(ctx, type, xRight, cy) {
  const s = SEALS[type] || SEALS.POLITICA;
  const label = (s.check ? "✓ " : "") + s.label.toUpperCase();
  ctx.font = "700 28px 'Libre Franklin'";
  const padX = 22, h = 50;
  const tw = ctx.measureText(label).width;
  const w = tw + padX * 2;
  const x = xRight - w, y = cy - h / 2;
  ctx.fillStyle = s.bg.startsWith("rgba") ? "rgba(29,158,117,.16)" : s.bg;
  roundRect(ctx, x, y, w, h, 8); ctx.fill();
  if (s.border) { ctx.strokeStyle = "rgba(29,158,117,.5)"; ctx.lineWidth = 2; roundRect(ctx, x, y, w, h, 8); ctx.stroke(); }
  ctx.fillStyle = (type === "ECONOMIA" || type === "CIDADES" || type === "ESPORTES") ? AREIA : s.fg;
  ctx.textBaseline = "middle"; ctx.fillText(label, x + padX, cy + 1);
  ctx.textBaseline = "alphabetic";
}
function roundRect(ctx, x, y, w, h, r) {
  ctx.beginPath();
  ctx.moveTo(x + r, y); ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r); ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r); ctx.closePath();
}

/* ---------- ERRO DE REDE ---------- */
function NetError() {
  return (
    <div style={{ fontFamily: SANS, minHeight: "100vh", background: AREIA, display: "grid", placeItems: "center", padding: 30 }}>
      <div style={{ maxWidth: 480, textAlign: "center" }}>
        <Symbol size={64} ring={MAR} w1={MAR} w2="#7d9b8f" />
        <h2 style={{ fontFamily: SERIF, color: PINHEIRO, marginTop: 18 }}>Sem conexão com o Supabase</h2>
        <p style={{ color: "rgba(26,26,24,.65)", fontSize: 14.5, lineHeight: 1.6 }}>
          Não foi possível conectar ao banco de dados. Verifique se as variáveis <b>VITE_SUPABASE_URL</b> e <b>VITE_SUPABASE_KEY</b> estão configuradas na Vercel, e se o projeto Supabase está ativo.
        </p>
      </div>
    </div>
  );
}
