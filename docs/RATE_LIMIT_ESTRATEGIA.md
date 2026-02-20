# Rate Limit – Análise de Arquitetura e Estratégia

## Parte 1: Análise de Arquitetura

### Onde as requisições são processadas

| Fluxo | Tecnologia | Arquivo(s) |
|-------|------------|------------|
| **Criação de agendamento (público)** | Front-end → **Supabase Client** → `appointments.insert()` | `src/components/booking/ClientInfoForm.tsx` |
| **Criação de agendamento (admin)** | Front-end → **Supabase Client** → `appointments.insert()` | `src/pages/Admin.tsx` (encaixe manual) |
| **Login** | Front-end → **Supabase Auth** → `signInWithPassword()` | `src/pages/Login.tsx` |

- **Stack:** Vite + React. Não há Next.js API Routes, Server Actions nem backend Node/Express.
- **Conclusão:** As requisições de agendamento (público) e de login vão **direto do browser para o Supabase** (REST/PostgREST e Auth). Não existe camada intermediária própria para aplicar rate limit no “seu” backend.

### Abordagem técnica escolhida

- **Onde aplicar:** **Supabase Edge Functions** (Deno na borda do Supabase), como única camada que você controla entre o cliente e o banco/auth.
- **Por quê:**  
  - Não exige novo servidor (Node/Express) nem mudar de hospedagem.  
  - Edge Functions podem retornar **HTTP 429** e mensagens em português.  
  - Rodam na borda, com baixa latência.  
- **Armazenamento do rate limit:** Tabela **`rate_limit`** no próprio Supabase (chave + contador + janela), sem depender de Redis/Upstash. Simples de operar e suficiente para o volume esperado de uma barbearia.

### O que NÃO foi feito

- **Só trigger no banco:** Não permite devolver 429; o PostgREST retornaria 500 em caso de “limite excedido”.  
- **Rate limit só no front:** Fácil de contornar; precisa ser na borda/servidor.  
- **Upstash/Redis:** Possível, mas adiciona serviço externo; a tabela no Supabase atende ao caso.

---

## Parte 2: Regra de negócio (híbrida, CGNAT-safe)

- **Problema no Brasil:** Vários celulares atrás de CGNAT compartilham o mesmo IP. Bloquear **só por IP** traria bloqueio de clientes legítimos.
- **Estratégia:**  
  - **Identidade principal:** telefone (agendamento) ou email + IP (login).  
  - **IP como camada extra** apenas no login, para mitigar abuso por rede (ex.: um único IP tentando muitos logins).

### Regras implementadas

| Endpoint | Chave de limite | Limite | Janela |
|----------|------------------|--------|--------|
| **Agendamento** (Edge Function `create-appointment`) | `booking:{telefone}` (apenas telefone) | 3 agendamentos | 15 min |
| **Login** (Edge Function `login`) | `login:email:{email}` e `login:ip:{ip}` (ambos verificados) | 5 tentativas por email **e** 5 por IP | 15 min |

- **Agendamento:** Só telefone; evita bloqueio por CGNAT e limita abuso por número.  
- **Login:** Email e IP contam separadamente; quem estourar qualquer um dos dois recebe 429.

---

## Parte 3: Implementação (resumo)

- **Migration:** `supabase/migrations/20260206100000_create_rate_limit_table.sql` – tabela `rate_limit`.  
- **Edge Functions:**  
  - `supabase/functions/create-appointment/` – rate limit por telefone, depois insert em `appointments`.  
  - `supabase/functions/login/` – rate limit por email e IP, depois `signInWithPassword`, retorna sessão.  
- **Shared:** `supabase/functions/_shared/rateLimit.ts` – `checkAndIncrement()`.  
- **Front-end:**  
  - **ClientInfoForm:** passa a chamar `POST .../functions/v1/create-appointment` em vez de `appointments.insert()`; trata 429 com mensagem em português.  
  - **Login:** passa a chamar `POST .../functions/v1/login` e usa `setSession()` com a sessão retornada; trata 429.  
- **Admin (encaixe manual):** continua usando `appointments.insert()` direto; não passa pela Edge Function, então **não** sofre o rate limit de agendamento (evita atrapalhar o barbeiro ao criar vários agendamentos seguidos).

Respostas **429** usam mensagens em português, por exemplo:  
*"Muitas tentativas de agendamento. Por favor, aguarde 15 minutos para tentar novamente."*  
*"Muitas tentativas de login. Por favor, aguarde 15 minutos para tentar novamente."*

---

## Parte 4: Segurança em Produção (Risco Zero)

### 1. Tratamento de proxy (IP)

- A extração do IP usa o helper **`_shared/getClientIp.ts`**.
- Ordem de leitura: **`x-forwarded-for`** (primeiro valor da lista = cliente original), **`x-real-ip`**, **`cf-connecting-ip`** (Cloudflare), depois `"unknown"`.
- O header `X-Forwarded-For` pode vir com vários IPs separados por vírgula (cliente, proxy1, proxy2…); usamos apenas o primeiro, adequado para Vercel e outros proxies.

### 2. Fail open (falha tolerante)

- Toda a **contagem do rate limit** está dentro de um **`try/catch`** nas duas Edge Functions.
- Se o serviço de contagem (tabela `rate_limit`) falhar, der timeout ou qualquer exceção, o sistema **não bloqueia**: trata como permitido e **permite** o agendamento/login.
- O erro é registrado em log (ex.: `[RATE_LIMIT] Falha na verificação (fail open), permitindo...`).
- O cliente **nunca** recebe 500 por falha do rate limiter; no pior caso a requisição segue normalmente.

### 3. Modo shadow (apenas log)

- Variável de ambiente: **`RATE_LIMIT_SHADOW_MODE=true`** (string).
- Enquanto for `"true"`: o sistema **só registra** no console quem seria bloqueado (ex.: `console.warn('[RATE_LIMIT_SHADOW] Bloquearia agendamento: telefone=...')`), mas **não retorna 429** e a requisição segue.
- Para ativar o bloqueio de verdade, defina **`RATE_LIMIT_SHADOW_MODE=false`** ou remova a variável.
- Em produção, pode-se começar com `RATE_LIMIT_SHADOW_MODE=true`, validar os logs e depois mudar para `false`.
