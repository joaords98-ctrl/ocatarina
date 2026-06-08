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

## Primeiro acesso da equipe

1. Abra o site → botão **Entrar (equipe)** → **Criar conta** (e-mail + senha) para cada redator (2 a 5 pessoas).
2. Se o Supabase exigir confirmação por e-mail, confirme antes de entrar — ou desative em
   **Supabase → Authentication → Providers → Email → "Confirm email"**.
3. Logado, use a aba **Redação** para publicar.

## Segurança

A chave `VITE_SUPABASE_KEY` é a chave **publishable** (pública) — pode ficar no front-end com tranquilidade.
Quem controla o acesso de escrita são as políticas RLS no banco: só usuários autenticados criam/editam/excluem;
o público anônimo só lê notícias já publicadas.

## Próximos passos sugeridos

- Conectar um domínio próprio na Vercel (ex.: ocatarina.com.br).
- Definir papéis (editor x redator) se quiser limitar quem publica.
- Upload de imagens direto no Supabase Storage (hoje a foto é por URL).
