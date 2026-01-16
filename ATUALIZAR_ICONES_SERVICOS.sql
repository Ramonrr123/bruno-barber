-- ============================================
-- ATUALIZAR ÍCONES DOS SERVIÇOS
-- Execute este SQL diretamente no Supabase SQL Editor
-- ============================================

-- 1. Combo Sapo - trocar sapo (🐸) por ícone profissional
UPDATE public.services
SET icon = '💇'
WHERE (name ILIKE '%combo%' OR name ILIKE '%sapo%')
  AND icon != '✂️' AND icon != '💈';

-- 2. Platinado - trocar floco de neve (❄️) por ícone profissional
UPDATE public.services
SET icon = '✨'
WHERE name ILIKE '%platinado%'
  AND icon != '✂️' AND icon != '💈';

-- 3. Luzes - trocar estrela (✨) por ícone profissional de cabelo
UPDATE public.services
SET icon = '💇'
WHERE name ILIKE '%luzes%'
  AND icon != '✂️' AND icon != '💈';

-- 4. Sobrancelha - trocar olhos (👀) por ícone profissional
UPDATE public.services
SET icon = '🪒'
WHERE (name ILIKE '%sobrancelha%' OR name ILIKE '%sobrancelhas%')
  AND icon != '✂️' AND icon != '💈';

-- 5. Barba - garantir ícone profissional
UPDATE public.services
SET icon = '🪒'
WHERE name ILIKE '%barba%'
  AND icon != '✂️' AND icon != '💈';

-- Verificar os ícones atualizados
SELECT 
    name, 
    icon, 
    description,
    duration,
    price
FROM public.services
ORDER BY name;
