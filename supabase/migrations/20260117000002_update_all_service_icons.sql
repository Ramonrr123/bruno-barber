-- ============================================
-- ATUALIZAR TODOS OS ÍCONES DOS SERVIÇOS
-- Trocar emojis informais por opções mais profissionais
-- Manter: Social (✂️) e Degradê (💈)
-- ============================================

-- IMPORTANTE: Esta migration atualiza TODOS os serviços exceto Social e Degradê
-- Execute no Supabase SQL Editor

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

-- 6. Atualizar por emoji específico - qualquer serviço que não seja Social ou Degradê
-- Trocar emojis informais específicos
UPDATE public.services
SET icon = CASE
    WHEN name ILIKE '%platinado%' THEN '✨'
    WHEN name ILIKE '%luzes%' THEN '💇'
    WHEN name ILIKE '%sobrancelha%' THEN '🪒'
    WHEN name ILIKE '%barba%' THEN '🪒'
    WHEN name ILIKE '%combo%' OR name ILIKE '%sapo%' THEN '💇'
    ELSE '💇'
END
WHERE icon IN ('🐸', '❄️', '👀', '✨')  -- Emojis informais
  AND name NOT ILIKE '%social%'
  AND name NOT ILIKE '%degradê%'
  AND name NOT ILIKE '%degrade%';

-- Verificar os ícones atualizados
SELECT 
    name, 
    icon, 
    description,
    duration,
    price
FROM public.services
ORDER BY name;
