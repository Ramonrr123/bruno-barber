-- ============================================
-- CORRIGIR SERVIÇOS EXISTENTES PARA SEREM PÚBLICOS
-- Execute este SQL no Supabase SQL Editor
-- ============================================

-- 1. Remover user_id de TODOS os serviços existentes para torná-los públicos
--    (Isso permite que usuários anônimos vejam os serviços)
UPDATE public.services 
SET user_id = NULL 
WHERE user_id IS NOT NULL;

-- 2. Verificar resultado
SELECT 
  id, 
  name, 
  price, 
  duration, 
  user_id, 
  created_at,
  CASE 
    WHEN user_id IS NULL THEN '✅ Público'
    ELSE '❌ Privado (user_id: ' || user_id::text || ')'
  END as status
FROM public.services 
ORDER BY created_at DESC;

-- 3. Garantir que a política de SELECT pública existe
DROP POLICY IF EXISTS "Services are viewable by everyone" ON public.services;

CREATE POLICY "Services are viewable by everyone"
ON public.services
FOR SELECT
TO public, anon, authenticated
USING (true);

-- 4. Verificar quantos serviços estão disponíveis
SELECT COUNT(*) as total_servicos_publicos
FROM public.services
WHERE user_id IS NULL;
