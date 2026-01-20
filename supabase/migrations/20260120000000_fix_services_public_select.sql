-- ============================================
-- Garantir que serviços sejam visíveis publicamente
-- ============================================

-- Remover TODAS as políticas de SELECT existentes para evitar conflitos
DROP POLICY IF EXISTS "Services are viewable by everyone" ON public.services;
DROP POLICY IF EXISTS "Public services select" ON public.services;
DROP POLICY IF EXISTS "Services select public" ON public.services;

-- Criar política de SELECT pública (todos podem ver serviços, independente de user_id)
-- Esta política permite que usuários anônimos e autenticados vejam TODOS os serviços
CREATE POLICY "Services are viewable by everyone"
ON public.services
FOR SELECT
TO public, anon, authenticated
USING (true);

-- Garantir que RLS está habilitado
ALTER TABLE public.services ENABLE ROW LEVEL SECURITY;
