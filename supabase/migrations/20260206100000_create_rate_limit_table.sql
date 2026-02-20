-- ============================================
-- Tabela para Rate Limit (limitação de taxa)
-- ============================================
-- Usada pelas Edge Functions para evitar spam, DDoS e força bruta.
-- Chave composta por tipo (booking/login) + identificador (telefone, email ou IP).

CREATE TABLE IF NOT EXISTS public.rate_limit (
  key TEXT NOT NULL PRIMARY KEY,
  count INT NOT NULL DEFAULT 0,
  window_start TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Apenas o backend (Edge Functions com service_role) deve ler/escrever
ALTER TABLE public.rate_limit ENABLE ROW LEVEL SECURITY;

-- Policy: nenhum acesso anônimo; Edge Functions usam service_role e bypassam RLS quando necessário
-- Para chamadas via service_role, RLS não se aplica. Para anon, bloqueamos.
CREATE POLICY "rate_limit no anon access"
ON public.rate_limit
FOR ALL
USING (false)
WITH CHECK (false);

COMMENT ON TABLE public.rate_limit IS 'Contadores de rate limit por chave (ex: booking:telefone, login:email:x, login:ip:y). Não modificar manualmente.';
