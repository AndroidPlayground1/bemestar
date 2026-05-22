# 📱 App Bem-Estar — Guia de Deploy

## Ficheiros do projeto
- `index.html` — estrutura da app
- `style.css` — design
- `app.js` — lógica e integração Supabase
- `README.md` — este ficheiro

---

## Passo 1 — Criar a base de dados no Supabase

1. Vai a https://supabase.com e cria uma conta (gratuita)
2. Clica "New project" — dá-lhe um nome (ex: "bemestar")
3. Escolhe uma password para a base de dados e guarda-a
4. Aguarda ~1 minuto enquanto o projeto fica pronto
5. No menu lateral, clica em **SQL Editor**
6. Cola este comando e clica **Run**:

```sql
CREATE TABLE registos (
  id      bigserial PRIMARY KEY,
  data    date UNIQUE NOT NULL,
  habitos jsonb,
  humor   int,
  energia int,
  sono    numeric,
  notas   text,
  criado_em timestamptz DEFAULT now()
);
```

7. No menu lateral, vai a **Project Settings → API**
8. Copia:
   - **Project URL** → vai para `SUPABASE_URL` no `app.js`
   - **anon public key** → vai para `SUPABASE_KEY` no `app.js`

---

## Passo 2 — Editar o app.js

Abre o ficheiro `app.js` e substitui as duas linhas no topo:

```js
const SUPABASE_URL  = 'https://xxxx.supabase.co';    // ← a tua URL
const SUPABASE_KEY  = 'eyJhbGci...';                  // ← a tua chave
```

---

## Passo 3 — Criar conta no GitHub e fazer upload

1. Vai a https://github.com e cria uma conta
2. Clica **New repository**, chama-lhe `bemestar`, torna-o **Public**
3. Clica **uploading an existing file**
4. Arrasta os 4 ficheiros (index.html, style.css, app.js, README.md)
5. Clica **Commit changes**

---

## Passo 4 — Deploy no Vercel

1. Vai a https://vercel.com e regista-te com a conta GitHub
2. Clica **Add New → Project**
3. Escolhe o repositório `bemestar`
4. Clica **Deploy** — fica online em ~30 segundos
5. O teu link fica algo como: `bemestar-xx.vercel.app`

---

## Passo 5 — Adicionar ao ecrã inicial do iPhone

1. Abre o link da app no **Safari** (não Chrome)
2. Clica no ícone de partilhar (quadrado com seta ↑)
3. Escolhe **"Adicionar ao ecrã principal"**
4. Confirma — aparece como app nativa no ecrã inicial ✅

---

## Notas
- Sem Supabase configurado, os dados ficam guardados localmente no browser
- Com Supabase, os dados ficam na cloud e acessíveis em qualquer dispositivo
- O plano gratuito do Supabase suporta anos de uso diário pessoal
