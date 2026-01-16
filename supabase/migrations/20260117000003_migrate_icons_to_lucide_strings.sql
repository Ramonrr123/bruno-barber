-- ============================================
-- MIGRAR ÍCONES DE EMOJIS PARA STRINGS LUCIDE-REACT
-- Converte emojis para strings que mapeiam para ícones do lucide-react
-- ============================================

-- 1. Corte Social (✂️) -> 'scissors'
UPDATE public.services
SET icon = 'scissors'
WHERE icon = '✂️' OR name ILIKE '%corte social%';

-- 2. Corte Degradê (💈) -> 'scissors' (mesmo ícone, mas identificável)
UPDATE public.services
SET icon = 'scissors'
WHERE icon = '💈' OR name ILIKE '%degradê%' OR name ILIKE '%degrade%';

-- 3. Combo Sapo (🐸) ou similar -> 'user-round-check'
UPDATE public.services
SET icon = 'user-round-check'
WHERE icon IN ('🐸', '💇')
  AND (name ILIKE '%combo%' OR name ILIKE '%sapo%' OR name ILIKE '%pacote%');

-- 4. Platinado (❄️) -> 'snowflake'
UPDATE public.services
SET icon = 'snowflake'
WHERE icon = '❄️' OR name ILIKE '%platinado%';

-- 5. Luzes (✨) -> 'sparkles'
UPDATE public.services
SET icon = 'sparkles'
WHERE icon = '✨' OR name ILIKE '%luzes%';

-- 6. Sobrancelha (👀) -> 'eye'
UPDATE public.services
SET icon = 'eye'
WHERE icon = '👀' OR name ILIKE '%sobrancelha%';

-- 7. Barba -> 'user' (razor não existe no lucide-react padrão)
UPDATE public.services
SET icon = 'user'
WHERE name ILIKE '%barba%' AND icon NOT IN ('scissors', 'user-round-check');

-- Garantir que serviços sem ícone tenham um fallback
UPDATE public.services
SET icon = 'scissors'
WHERE icon IS NULL OR icon = '';

-- Verificar os ícones atualizados
SELECT 
    name, 
    icon, 
    description,
    duration,
    price
FROM public.services
ORDER BY name;
