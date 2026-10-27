# Horários de Guias – MVP

Aplicação para gerar, rever, publicar e confirmar diariamente o horário mensal de guias turísticos (Porto).

Monorepo (npm workspaces):

- `packages/core` – regras e algoritmo de geração (funções puras, testadas com Vitest)
- `apps/api` – Fastify + Zod + Prisma/PostgreSQL (sessões em cookie httpOnly, argon2)
- `apps/web` – React + Vite (mobile-first, PT-PT)

## Correr localmente

```bash
npm install
npm run db:up                         # PostgreSQL via docker compose
cp apps/api/.env.example apps/api/.env
cd apps/api && npx prisma migrate deploy
npm run seed                          # dados demo: Porto (20 guias, 20 slots), Lisboa (8 guias, 8 slots), Braga, Coimbra e Guimarães (2-3 guias cada), Novembro 2026 com matriz confirmada
# ou só o admin + catálogos: npm run seed:admin
cd ../.. && npm run dev:api           # http://localhost:3000
npm run dev:web                       # http://localhost:5173 (proxy /api -> :3000)
```

Logins do seed: `admin@example.com` / `change-me-please` (alterar via `ADMIN_EMAIL`/`ADMIN_PASSWORD`); guias `ana@guias.example.com` … / `guia12345`.

Cidades: o admin escolhe a cidade no topo (Porto, Lisboa, Braga, Coimbra, Guimarães; novas em **Slots**). Cada cidade tem os seus tours, slots, guias, matriz, rascunho e publicação. Cada guia pertence a uma só cidade, escolhe-a no perfil (mudar de cidade apaga as qualificações) e só vê o horário publicado dessa cidade. Os tours de Lisboa no seed (`Tour 1`, `Tour 2`) são nomes provisórios.

Fluxo do admin: **Matriz** (confirmar necessidades) → **Grelha** (Gerar rascunho, editar células, Publicar) → **Dia** (confirmação diária, NT, notas, retirar guias).
Guias novos: **Guias** → Convidar → copiar link de ativação (7 dias) e enviar por WhatsApp.

## Recuperação de palavra-passe

- O guia usa "Esqueci-me da palavra-passe" no login: recebe um link por email (válido 1 hora, uso único) e escolhe a nova palavra-passe. Terminar a recuperação encerra as outras sessões.
- O admin também pode gerar um link em **Guias** → *Link de redefinição* e enviá-lo por WhatsApp.
- Localmente (`MAIL_TRANSPORT=console`, por defeito) o email não é enviado: o texto, com o link, aparece no terminal da API.
- Em produção: `MAIL_TRANSPORT=resend`, `RESEND_API_KEY` e `MAIL_FROM` (remetente de um domínio verificado no Resend). Plano gratuito: 3000 emails/mês, 100/dia.
- Pedidos de login, recuperação e ativação têm limite de tentativas por IP (`@fastify/rate-limit`, em memória; com várias instâncias do backend passa a ser por instância).
- Admin que perca a palavra-passe: no servidor, `ADMIN_EMAIL=... ADMIN_PASSWORD=nova ADMIN_RESET_PASSWORD=true npm run seed:admin -w @schedule/api`.

## Testes e verificação

```bash
npm test          # algoritmo e regras (packages/core)
npm run typecheck
```

## Algoritmo (packages/core/src/generate.ts)

Guloso dia a dia. Em cada passo escolhe a ocorrência com menos candidatos elegíveis e atribui o candidato com menor rácio (tours do mesmo tipo – Centro ou secundário – ÷ dias disponíveis; desempate pelo rácio total e id). Ignora ocorrências NT, preserva atribuições manuais (`locked`) e deixa slots incompletos em vez de falhar. Disponibilidade parcial (manhã/tarde) conta meio dia.

Limitações: sem backtracking nem lookahead entre dias (um guia pode ser "gasto" num dia em que outro slot do dia seguinte só ele cobre); não usa histórico de meses anteriores; resultado dependente da ordem diária. Melhoria prevista: pesquisa local (trocas entre guias) para reduzir a variância dos rácios.

## Deploy

**Backend (Render ou Railway)**
- Root: `apps/api`; build: `npm install && npx prisma generate`; start: `npx prisma migrate deploy && npm start`
- Base de dados PostgreSQL gerida; variáveis: `DATABASE_URL`, `WEB_ORIGIN` (URL do frontend), `PORT`, `COOKIE_SECURE=true`.
- Criar o admin uma vez: `npm run seed:admin` com `ADMIN_EMAIL` e `ADMIN_PASSWORD`.

**Frontend (Vercel)**
- Root: `apps/web`; build: `npm run build`; output: `dist`.
- Em `apps/web/vercel.json` substituir `SEU-BACKEND.onrender.com` pelo URL do backend. O rewrite `/api/*` mantém tudo no mesmo domínio, por isso os cookies funcionam sem `SameSite=None`.
- Como o workspace usa `@schedule/core`, definir na Vercel o root como a raiz do repositório com install `npm install` e build `npm run build -w @schedule/web` (output `apps/web/dist`) se o root `apps/web` não resolver o workspace.
