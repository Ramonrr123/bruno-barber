-- ============================================
-- CORRIGIR VISIBILIDADE PÚBLICA DOS SERVIÇOS
-- Execute este SQL no Supabase SQL Editor
-- ============================================

-- 1. Remover TODAS as políticas de SELECT existentes para evitar conflitos
DROP POLICY IF EXISTS "Services are viewable by everyone" ON public.services;
DROP POLICY IF EXISTS "Public services select" ON public.services;
DROP POLICY IF EXISTS "Services select public" ON public.services;

-- 2. Criar política de SELECT pública que permite ver TODOS os serviços
--    independente de user_id (para usuários anônimos e autenticados)
CREATE POLICY "Services are viewable by everyone"
ON public.services
FOR SELECT
TO public, anon, authenticated
USING (true);

-- 3. Garantir que RLS está habilitado
ALTER TABLE public.services ENABLE ROW LEVEL SECURITY;

-- 4. Verificar serviços existentes e seus user_id
SELECT 
  id, 
  name, 
  price, 
  duration, 
  user_id, 
  created_at,
  CASE 
    WHEN user_id IS NULL THEN 'Sem user_id (público)'
    ELSE 'Com user_id: ' || user_id::text
  END as status
FROM public.services 
ORDER BY created_at DESC;

-- 5. Se os serviços tiverem user_id mas você quer que sejam públicos,
--    você pode remover o user_id deles (opcional):
-- UPDATE public.services SET user_id = NULL WHERE user_id IS NOT NULL;

-- 6. Se não houver serviços, você pode inserir alguns de exemplo:
-- INSERT INTO public.services (name, title, duration, price, description, icon, user_id)
-- VALUES 
--   ('Corte Social', 'Corte Social', 30, 45.00, 'Corte clássico e elegante para o dia a dia', 'scissors', NULL),
--   ('Corte Degradê', 'Corte Degradê', 40, 55.00, 'Degradê moderno com acabamento perfeito', 'scissors', NULL),
--   ('Combo Sapo', 'Combo Sapo', 70, 85.00, 'Cabelo + Barba completa - O pacote premium', 'scissors', NULL)
-- ON CONFLICT DO NOTHING;
