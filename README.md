# O Catarina — Portal de Notícias

Portal de notícias de Santa Catarina com redação integrada. React + Vite + Supabase, pronto para deploy na Vercel.

- **Portal público:** manchete em destaque, últimas notícias, matéria completa.
- **Redação (login):** criar, editar, publicar, agendar e excluir notícias. Selos editoriais, foto, destaque.
- **Tempo real:** quando um redator publica, o portal dos outros atualiza sozinho.
- **Identidade O Catarina:** Verde Pinheiro, Verde Mar, Vermelho SC (só plantão), Lora nas manchetes.

O banco de dados (tabela `noticias` com segurança RLS) já está criado no Supabase.

---

## Como publicar na Vercel (caminho mais fácil)

### Opção A — Subir por GitHub (recomendado)

1. Crie um repositório no GitHub e suba estes arquivos (pode arrastar pela interface do GitHub ou usar git).
2. Em https://vercel.com → **Add New → Project** → importe o repositório.
3. A Vercel detecta **Vite** automaticamente. Em **Environment Variables**, adicione:
   - `VITE_SUPABASE_URL` = `https://dzysyujkefksduusnkpb.supabase.co`
   - `VITE_SUPABASE_KEY` = `sb_publishable_foVjR4L0DXOt7c2k5-8JWw_dgZpTWu8`
4. Clique em **Deploy**. Em ~1 minuto seu portal está no ar.

### Opção B — Pela linha de comando

```bash
npm install
npm install -g vercel
vercel            # segue o assistente
vercel --prod     # publica em produção
```
Configure as duas variáveis de ambiente quando solicitado (ou no painel do projeto).

---

## Rodar localmente

```bash
npm install
cp .env.example .env   # já vem com as credenciais corretas
npm run dev            # abre em http://localhost:5173
```

---

## Acesso da equipe (rota secreta + login)

O site público (`/`) não tem botão de login — o leitor nunca vê a redação.
A equipe acessa pela rota **`/redacao`**:

- **https://SEU-SITE/redacao** → tela de login.
- Primeiro acesso: **Criar conta** (e-mail + senha) para cada redator.
- Depois de entrar: editor, painel, gerador de arte.

> Para o `/redacao` funcionar ao recarregar a página, o `vercel.json` já redireciona todas as rotas para o app (SPA). Não precisa configurar nada.

## Recursos da redação

- **Upload de foto:** botão "Carregar foto" envia a imagem para o Supabase Storage (bucket `fotos`). Também aceita colar URL.
- **Destaque do site:** botão "★ Destacar no site" em qualquer notícia publicada define qual vira a manchete principal (só uma por vez).
- **Gerar arte (Feed/Story):** botão "🎨 Gerar arte" abre o estúdio que monta a imagem no layout da marca em **Feed 1080×1350** e **Story 1080×1920**, com ajuste de enquadramento, e baixa o PNG na hora.
  - Importante: o download exige que a foto seja **enviada por upload** (não URL externa), por causa de restrições de CORS do navegador no canvas.

## Mobile

Layout responsivo: colunas viram uma só no celular, manchete e fontes se ajustam, inputs com tamanho que evita zoom automático no iOS.

## Segurança

A chave `VITE_SUPABASE_KEY` é a chave **publishable** (pública) — pode ficar no front-end com tranquilidade.
Quem controla o acesso de escrita são as políticas RLS no banco: só usuários autenticados criam/editam/excluem;
o público anônimo só lê notícias já publicadas.

## Próximos passos sugeridos

- Conectar um domínio próprio na Vercel (ex.: ocatarina.com.br).
- Definir papéis (editor x redator) se quiser limitar quem publica.
- Upload de imagens direto no Supabase Storage (hoje a foto é por URL).
